import { v4 as uuidv4 } from 'uuid';
import {
  DEMO_APP_CONTEXT,
  REPEATED_MEASURE,
  analyseQueries,
  assignUser,
  createExperiment,
  deleteExperiment,
  deleteMetric,
  displayNameForMetric,
  getEnrollmentDetail,
  initUser,
  logMetrics,
  markDecisionPoint,
  saveMetrics,
  setExperimentState,
} from '../upgrade.js';
import { log } from '../log.js';

const COHORT_MIN = 10;
const COHORT_MAX = 1000;
const COHORT_DEFAULT = 200;
const PARTICIPANT_CONCURRENCY = 20;

// Throttle tool_progress events so we don't spam the SSE channel during the
// participant loop. ~1 event/sec is plenty for a "running 47/200…" indicator.
const PROGRESS_INTERVAL_MS = 800;

// JSON Schema exposed to Anthropic. Keep the description fields rich — the
// model relies on them to fill the values correctly.
export const RUN_SIMULATION_SCHEMA = {
  type: 'object',
  properties: {
    experiment: {
      type: 'object',
      description: 'The approved experiment design.',
      properties: {
        name: { type: 'string', description: 'Short human-readable experiment name.' },
        description: { type: 'string', description: 'One-paragraph experiment description.' },
        decisionPoint: {
          type: 'object',
          properties: {
            site: { type: 'string' },
            target: { type: 'string' },
          },
          required: ['site', 'target'],
        },
        conditions: {
          type: 'array',
          minItems: 2,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description:
                  'Condition code. Must not be "default" — UpGrade reserves that name.',
              },
              weight: {
                type: 'number',
                description: 'Assignment weight; sum across conditions must be 100.',
              },
            },
            required: ['code', 'weight'],
          },
        },
        metrics: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Metric identifier, e.g. completionRate.' },
              datatype: { type: 'string', enum: ['categorical', 'continuous'] },
              allowedValues: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 3,
                description:
                  'Required for categorical metrics; up to 3 string values. Omit for continuous.',
              },
              query: {
                type: 'object',
                description:
                  'How this metric is rolled up. For continuous: {operationType: "sum"|"min"|"max"|"count"|"avg"|"mode"|"median"|"stddev"}. For categorical: {operationType: "count"|"percentage", compareFn: "="|"<>", compareValue: <one of allowedValues>}.',
                properties: {
                  operationType: { type: 'string' },
                  compareFn: { type: 'string' },
                  compareValue: { type: 'string' },
                },
                required: ['operationType'],
              },
            },
            required: ['key', 'datatype', 'query'],
          },
        },
      },
      required: ['name', 'description', 'decisionPoint', 'conditions', 'metrics'],
    },
    cohortSize: {
      type: 'integer',
      minimum: COHORT_MIN,
      maximum: COHORT_MAX,
      description: `Number of synthetic participants. Default ${COHORT_DEFAULT}. Range ${COHORT_MIN}-${COHORT_MAX}.`,
    },
    syntheticSpecs: {
      type: 'object',
      description:
        "Per-metric per-condition synthetic value specs. Keyed by metric `key`, then by condition `code`. " +
        'For categorical metrics: an object mapping each allowedValue to a non-negative weight (will be normalized). ' +
        'For continuous metrics: {min: number, max: number}. ' +
        'You generate these implicitly based on a realistic prediction of how the intervention should behave. ' +
        'You do NOT need to surface these to the user unless they explicitly ask.',
      additionalProperties: true,
    },
  },
  required: ['experiment', 'cohortSize', 'syntheticSpecs'],
};

// ============================================================================
// Synthetic value sampling.
// ============================================================================

function sampleContinuous(spec) {
  const min = Number(spec?.min);
  const max = Number(spec?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return 0;
  return Number((min + Math.random() * (max - min)).toFixed(2));
}

function sampleCategorical(spec, allowedValues) {
  const entries = Object.entries(spec || {}).filter(([k, v]) => allowedValues.includes(k) && Number(v) >= 0);
  if (entries.length === 0) {
    return allowedValues[Math.floor(Math.random() * allowedValues.length)];
  }
  const total = entries.reduce((s, [, w]) => s + Number(w), 0);
  if (total <= 0) return entries[0][0];
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= Number(w);
    if (r <= 0) return k;
  }
  return entries.at(-1)[0];
}

function sampleAttributes({ metrics, syntheticSpecs, conditionCode }) {
  const attrs = {};
  for (const m of metrics) {
    const condSpec = syntheticSpecs?.[m.key]?.[conditionCode];
    if (m.datatype === 'continuous') {
      attrs[m.key] = sampleContinuous(condSpec);
    } else {
      attrs[m.key] = sampleCategorical(condSpec, m.allowedValues || []);
    }
  }
  return attrs;
}

// ============================================================================
// Concurrency: bounded fan-out over an iterable of work items.
// ============================================================================

async function runWithConcurrency({ count, concurrency, work }) {
  const results = new Array(count);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= count) return;
      try {
        results[i] = await work(i);
      } catch (err) {
        results[i] = { error: err };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
  return results;
}

// ============================================================================
// Build the /experiments payload from the AI-provided design.
// ============================================================================

function buildExperimentPayload({ runId, experiment }) {
  // Append the runId to every identifier UpGrade uses to route participants
  // and metric values (site, target, metric.key) so concurrent simulations
  // don't collide on the same decision point or metric namespace. The
  // `queries[].name` field is left unscoped — it's a human-readable label
  // we also use in the AI/user-facing result tables and report.
  const scopedKey = (k) => `${k}-${runId}`;
  const partitionId = uuidv4();
  const conditions = experiment.conditions.map((c, i) => ({
    id: uuidv4(),
    conditionCode: c.code,
    assignmentWeight: c.weight,
    description: null,
    order: i + 1,
    name: '',
  }));

  const queries = experiment.metrics.map((m) => {
    const query = { operationType: m.query.operationType };
    if (m.datatype === 'categorical') {
      query.compareFn = m.query.compareFn;
      query.compareValue = m.query.compareValue;
    }
    return {
      name: displayNameForMetric(m),
      query,
      metric: { key: scopedKey(m.key) },
      repeatedMeasure: REPEATED_MEASURE,
    };
  });

  const payload = {
    // Truncate experiment.name (AI-provided) to leave room for the runId
    // suffix without losing it to the overall length cap.
    name: `${experiment.name.slice(0, 245)}-${runId}`,
    description: experiment.description,
    context: [DEMO_APP_CONTEXT],
    type: 'Simple',
    assignmentUnit: 'individual',
    consistencyRule: 'individual',
    assignmentAlgorithm: 'random',
    tags: [],
    state: 'inactive',
    postExperimentRule: 'continue',
    partitions: [
      {
        id: partitionId,
        site: scopedKey(experiment.decisionPoint.site),
        target: scopedKey(experiment.decisionPoint.target),
        description: '',
        order: 1,
        excludeIfReached: false,
      },
    ],
    conditions,
    filterMode: 'includeAll',
    experimentSegmentInclusion: {
      segment: {
        individualForSegment: [],
        groupForSegment: [{ type: 'All', groupId: 'All' }],
        subSegments: [],
        type: 'private',
      },
    },
    experimentSegmentExclusion: {
      segment: {
        individualForSegment: [],
        groupForSegment: [],
        subSegments: [],
        type: 'private',
      },
    },
    queries,
  };
  return payload;
}

function buildMetricUnit(metrics, runId) {
  return metrics.map((m) => {
    const key = `${m.key}-${runId}`;
    if (m.datatype === 'categorical') {
      return {
        metric: key,
        datatype: 'categorical',
        allowedValues: m.allowedValues || [],
      };
    }
    return { metric: key, datatype: 'continuous' };
  });
}

// ============================================================================
// Run a single synthetic participant. Failures are caught upstream.
// ============================================================================

async function simulateParticipant({ runId, index, decisionPoint, metrics, syntheticSpecs, counters }) {
  const userId = `user-${runId}-${index}`;
  // The experiment is registered under runId-scoped site/target/metric keys
  // (see buildExperimentPayload). Use the same scoped values when talking to
  // UpGrade so the participant lands in this simulation's experiment instead
  // of leaking into another one sharing the same decision point.
  const scopedSite = `${decisionPoint.site}-${runId}`;
  const scopedTarget = `${decisionPoint.target}-${runId}`;

  try {
    await initUser(userId);
  } catch (err) {
    counters.initFailed += 1;
    log.warn('init failed', { user: userId, err: err?.message });
    return;
  }

  let assignedCondition = null;
  try {
    assignedCondition = await assignUser({
      userId,
      site: scopedSite,
      target: scopedTarget,
    });
  } catch (err) {
    counters.assignFailed += 1;
    log.warn('assign threw', { user: userId, err: err?.message });
  }

  const conditionCode = assignedCondition?.conditionCode ?? null;
  if (!conditionCode) counters.noCondition += 1;

  // mark is called unconditionally per the docs, even when assign failed or
  // returned no condition.
  try {
    await markDecisionPoint({
      userId,
      site: scopedSite,
      target: scopedTarget,
      conditionCode,
    });
  } catch (err) {
    counters.markFailed += 1;
    log.warn('mark failed', { user: userId, condition: conditionCode, err: err?.message });
  }

  // Only log metrics if we actually got a condition assignment — there's
  // nowhere to anchor the sampled values otherwise.
  let loggedAttrs = null;
  if (conditionCode) {
    // sampleAttributes uses the original metric keys (matching the spec
    // shape the AI built). Translate keys to the runId-scoped form before
    // sending to UpGrade so the values land under this simulation's
    // metric namespace.
    const sampledAttrs = sampleAttributes({ metrics, syntheticSpecs, conditionCode });
    const scopedAttrs = Object.fromEntries(
      Object.entries(sampledAttrs).map(([k, v]) => [`${k}-${runId}`, v]),
    );
    try {
      await logMetrics({ userId, attributes: scopedAttrs });
      loggedAttrs = sampledAttrs;
    } catch (err) {
      counters.logFailed += 1;
      log.warn('log failed', { user: userId, condition: conditionCode, err: err?.message });
    }
  }

  log.sim('participant', {
    user: userId,
    condition: conditionCode || 'NONE',
    metrics: loggedAttrs,
  });
}

// ============================================================================
// Format the structured result that gets fed back to the AI.
// ============================================================================

function formatEnrollment(enrollmentDetail, conditionIdToCode) {
  const out = {};
  for (const c of enrollmentDetail?.conditions || []) {
    const code = conditionIdToCode.get(c.id);
    if (code) out[code] = c.users || 0;
  }
  // include zero-enrollment conditions explicitly
  for (const code of conditionIdToCode.values()) {
    if (!(code in out)) out[code] = 0;
  }
  return out;
}

function formatQueryResults({ analyseData, metrics, queryIdToMetric, conditionIdToCode }) {
  return (analyseData || []).map((entry) => {
    const m = queryIdToMetric.get(entry.id);
    const byCondition = {};
    for (const eff of entry.mainEffect || []) {
      const code = conditionIdToCode.get(eff.conditionId);
      if (!code) continue;
      const val = Number(eff.result);
      byCondition[code] = Number.isFinite(val) ? Number(val.toFixed(2)) : null;
    }
    return {
      metric: m?.key,
      display: m ? displayNameForMetric(m) : null,
      byCondition,
    };
  });
}

function buildWarnings({ enrollment, queries, counters, cohortSize }) {
  const warnings = [];
  for (const [code, n] of Object.entries(enrollment)) {
    if (n === 0) warnings.push(`Condition "${code}" got 0 participants — consider a larger cohort.`);
  }
  const enrolledSum = Object.values(enrollment).reduce((a, b) => a + b, 0);
  if (enrolledSum < cohortSize) {
    warnings.push(
      `Only ${enrolledSum} of ${cohortSize} participants were enrolled (${counters.noCondition} got no condition from /v6/assign).`,
    );
  }
  if (counters.initFailed + counters.assignFailed + counters.markFailed + counters.logFailed > 0) {
    warnings.push(
      `Some participant calls failed (init=${counters.initFailed} assign=${counters.assignFailed} mark=${counters.markFailed} log=${counters.logFailed} of ${cohortSize}).`,
    );
  }
  for (const q of queries) {
    if (q.metric && Object.values(q.byCondition).every((v) => v === null || v === 0)) {
      warnings.push(`All values for metric "${q.metric}" came back zero or null.`);
    }
  }
  return warnings;
}

// ============================================================================
// The tool entry point.
// ============================================================================

export async function runSimulation({ input, emit }) {
  const { experiment } = input;
  const cohortSize = Math.max(COHORT_MIN, Math.min(COHORT_MAX, Number(input.cohortSize) || COHORT_DEFAULT));
  const syntheticSpecs = input.syntheticSpecs || {};
  const runId = uuidv4().slice(0, 8);

  // Validate forbidden condition names early.
  for (const c of experiment.conditions || []) {
    if ((c.code || '').toLowerCase() === 'default') {
      throw new Error('Condition code "default" is reserved by UpGrade — pick a different name.');
    }
  }

  log.sim('start', { runId, cohortSize, conditions: experiment.conditions.length, metrics: experiment.metrics.length });
  emit({ type: 'tool_progress', message: 'Saving temporary metrics…' });
  const metricUnit = buildMetricUnit(experiment.metrics, runId);
  try {
    await saveMetrics({ metricUnit });
  } catch (err) {
    throw new Error(`Failed to save metrics: ${err.message}`);
  }

  let experimentId = null;
  const counters = { initFailed: 0, assignFailed: 0, noCondition: 0, markFailed: 0, logFailed: 0 };
  const conditionIdToCode = new Map();
  const queryIdToMetric = new Map();

  try {
    emit({ type: 'tool_progress', message: 'Creating experiment…' });
    const payload = buildExperimentPayload({ runId, experiment });
    const created = await createExperiment(payload);
    experimentId = created.id;
    for (const c of created.conditions || []) conditionIdToCode.set(c.id, c.conditionCode);
    // Map server-assigned query ids back to our metric definitions by name
    // match. Iterate `experiment.metrics` (request order) rather than
    // `created.queries` (server response order) so the Map's insertion order
    // — and therefore the queryIds list we send to /query/analyse, and the
    // result-array order surfaced to the AI — always matches the order the
    // metrics were discussed in the conversation. A historical UpGrade bug
    // tied to queryIds ordering has since been fixed upstream; this keeps
    // our output deterministic and reads naturally as "for each metric we
    // requested, find its server-assigned id."
    for (const m of experiment.metrics) {
      const q = (created.queries || []).find((qq) => qq.name === displayNameForMetric(m));
      if (q) queryIdToMetric.set(q.id, m);
    }
    log.sim('experiment created', { experimentId, conditions: Array.from(conditionIdToCode.values()), queries: queryIdToMetric.size });

    emit({ type: 'tool_progress', message: 'Starting experiment…' });
    await setExperimentState({ experimentId, state: 'enrolling' });

    emit({ type: 'tool_progress', message: `Running 0/${cohortSize}…`, replaceKey: 'cohort_progress' });

    let completed = 0;
    let lastEmit = 0;
    await runWithConcurrency({
      count: cohortSize,
      concurrency: PARTICIPANT_CONCURRENCY,
      work: async (i) => {
        await simulateParticipant({
          runId,
          index: i,
          decisionPoint: experiment.decisionPoint,
          metrics: experiment.metrics,
          syntheticSpecs,
          counters,
        });
        completed += 1;
        const now = Date.now();
        if (now - lastEmit > PROGRESS_INTERVAL_MS || completed === cohortSize) {
          lastEmit = now;
          emit({
            type: 'tool_progress',
            message: `Running ${completed}/${cohortSize}…`,
            replaceKey: 'cohort_progress',
          });
        }
      },
    });

    log.sim('cohort done', { completed, ...counters });

    emit({ type: 'tool_progress', message: 'Fetching enrollment + metric results…' });
    const [enrollmentDetail, analyseData] = await Promise.all([
      getEnrollmentDetail({ experimentId }),
      analyseQueries({ queryIds: Array.from(queryIdToMetric.keys()) }),
    ]);

    const enrollment = formatEnrollment(enrollmentDetail, conditionIdToCode);
    const queries = formatQueryResults({
      analyseData,
      metrics: experiment.metrics,
      queryIdToMetric,
      conditionIdToCode,
    });
    const warnings = buildWarnings({ enrollment, queries, counters, cohortSize });

    log.sim('summary', { runId, cohortSize, enrollment, queries, counters, warnings: warnings.length });
    if (warnings.length) {
      for (const w of warnings) log.warn('sim warning', { runId, msg: w });
    }

    return {
      runId,
      experimentName: experiment.name,
      cohortSize,
      enrollment,
      queries,
      failures: counters,
      warnings,
    };
  } finally {
    // Best-effort cleanup — log + continue on failure.
    if (experimentId) {
      try {
        emit({ type: 'tool_progress', message: 'Cleaning up: deleting experiment…' });
        await deleteExperiment(experimentId);
      } catch (err) {
        console.warn(`[simulation] delete experiment failed: ${err.message}`);
      }
    }
    for (const m of experiment.metrics || []) {
      const scopedMetricKey = `${m.key}-${runId}`;
      try {
        await deleteMetric(scopedMetricKey);
      } catch (err) {
        console.warn(`[simulation] delete metric ${scopedMetricKey} failed: ${err.message}`);
      }
    }
  }
}
