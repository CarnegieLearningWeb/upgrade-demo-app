import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { displayNameForMetric } from './upgrade.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, 'report-templates');

function loadTemplate(name) {
  return readFileSync(join(TEMPLATE_DIR, `${name}.md`), 'utf8');
}

const TEMPLATES = {
  setupGuide: loadTemplate('setup-guide'),
  experimentCreationGuide: loadTemplate('experiment-creation-guide'),
  clientIntegrationGuide: loadTemplate('client-integration-guide'),
  recommendedImplementationOrder: loadTemplate('recommended-implementation-order'),
  assumptionsAndNotes: loadTemplate('assumptions-and-notes'),
};

// ============================================================================
// Substitution helpers — these render structured experiment fields into the
// chunks of markdown that the .md templates expect.
// ============================================================================

function substitute(template, ctx) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (Object.hasOwn(ctx, key)) return ctx[key];
    return `{{${key}}}`;
  });
}

function renderDecisionPoint(dp) {
  return `- **Site:** \`${dp.site}\`\n- **Target:** \`${dp.target}\``;
}

function renderConditionsBlock(conditions) {
  const rows = conditions.map((c) => `| \`${c.code}\` | ${c.weight}% |`).join('\n');
  return `| Condition code | Weight |\n|---|---|\n${rows}`;
}

function renderMetricsBlock(metrics) {
  const lines = metrics.map((m) => {
    const display = displayNameForMetric(m);
    if (m.datatype === 'categorical') {
      const vals = (m.allowedValues || []).map((v) => `\`${v}\``).join(', ');
      return `- **${display}** — categorical, allowed values: ${vals}`;
    }
    return `- **${display}** — continuous`;
  });
  return lines.join('\n');
}

// `conditionHandlers: { ... }` object-literal contents used by the JS and TS
// snippets in the client-integration guide. Each entry is indented to slot
// into the surrounding template; trailing comma is intentional.
function renderConditionHandlersBlock(conditions) {
  return conditions
    .map(
      (c) =>
        `    ${c.code}: () => {\n      // Apply the ${c.code} experience here.\n    },`,
    )
    .join('\n');
}

// `await logMetrics(upClient, { ... })` attribute lines, one per metric. The
// JS/TS snippets in the integration guide are identical at this layer.
function renderClientMetricAttrsBlock(metrics) {
  return metrics
    .map((m) => {
      const call = `${m.key}: ${m.key}FromYourApp(),`;
      if (m.datatype === 'categorical' && m.allowedValues?.length) {
        const vals = m.allowedValues.map((v) => `"${v}"`).join(' or ');
        return `  ${call} // ${vals}`;
      }
      return `  ${call}`;
    })
    .join('\n');
}

// Bullet list of condition codes for the experiment-creation guide.
function renderConditionCodesList(conditions) {
  return conditions.map((c) => `- \`${c.code}\``).join('\n');
}

// Multi-block format the creation guide uses under "Add the metrics". Each
// block lists the dropdown values the user will pick in the UpGrade UI.
// Display labels match the UpGrade frontend, not the operationType wire
// values, so the user sees the same words in the guide as on the screen.
const CREATION_GUIDE_OP_LABELS = {
  sum: 'Sum',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  avg: 'Mean',
  mode: 'Mode',
  median: 'Median',
  stddev: 'Standard Deviation',
  percentage: 'Percent',
};

const CREATION_GUIDE_COMPARE_LABELS = {
  '=': 'Equal',
  '<>': 'Not Equal',
};

function renderCreationGuideMetricsBlock(metrics) {
  return metrics
    .map((m) => {
      const lines = [
        `**Metric: \`${m.key}\`**`,
        ``,
        `- **Metric ID:** \`${m.key}\``,
        `- **Aggregate Statistic:** ${CREATION_GUIDE_OP_LABELS[m.query.operationType] || m.query.operationType}`,
      ];
      if (m.datatype === 'categorical' && m.query.compareFn) {
        const cmp = CREATION_GUIDE_COMPARE_LABELS[m.query.compareFn] || m.query.compareFn;
        lines.push(
          `- **Comparison:** ${cmp}`,
          `- **Value:** \`${m.query.compareValue}\``,
        );
      }
      lines.push(`- **Display Name:** \`${displayNameForMetric(m)}\``);
      return lines.join('\n');
    })
    .join('\n\n');
}

// CONTEXT_METADATA env-var value. Single-line JSON — env files don't accept
// pretty-printed JSON.
function renderContextMetadataEnv(experiment) {
  return JSON.stringify({
    [experiment.appContext]: {
      CONDITIONS: experiment.conditions.map((c) => c.code),
      GROUP_TYPES: [],
      EXP_POINTS: [experiment.decisionPoint.site],
      EXP_IDS: [experiment.decisionPoint.target],
    },
  });
}

// METRICS env-var value. Mirrors the /metric/save metricUnit shape (minus the
// runId scoping the simulation tool applies).
function renderMetricsEnv(experiment) {
  const metrics = experiment.metrics.map((m) => {
    if (m.datatype === 'categorical') {
      return {
        metric: m.key,
        datatype: 'categorical',
        allowedValues: m.allowedValues || [],
      };
    }
    return { metric: m.key, datatype: 'continuous' };
  });
  return JSON.stringify([{ metrics, contexts: [experiment.appContext] }]);
}

// ============================================================================
// Section composers.
// ============================================================================

function composeExperimentDesign(experiment) {
  const conditionsTable = renderConditionsBlock(experiment.conditions);
  const metricsList = renderMetricsBlock(experiment.metrics);
  return [
    `**Name:** ${experiment.name}`,
    ``,
    `**Description:** ${experiment.description}`,
    ``,
    `**App context:** \`${experiment.appContext}\``,
    ``,
    `**Decision point:**`,
    renderDecisionPoint(experiment.decisionPoint),
    ``,
    `**Conditions:**`,
    ``,
    conditionsTable,
    ``,
    `**Metrics:**`,
    ``,
    metricsList,
    ``,
    `**Participants:** Include All  ·  **Assignment:** Individual, between-subject`,
  ].join('\n');
}

function composeSimulationSummary(sim) {
  if (!sim) return null;
  const enrollmentRows = Object.entries(sim.enrollment || {})
    .map(([cond, n]) => `| \`${cond}\` | ${n} |`)
    .join('\n');

  const queryBlocks = (sim.queries || []).map((q) => {
    const rows = Object.entries(q.byCondition || {})
      .map(([cond, v]) => `| \`${cond}\` | ${v ?? '—'} |`)
      .join('\n');
    return `**${q.display ?? q.metric}**\n\n| Condition | Statistic value |\n|---|---|\n${rows}`;
  });

  const parts = [
    `> Synthetic / preflight only — these numbers demonstrate UpGrade's data flow and do not predict real learning outcomes.`,
    ``,
    `**Cohort size:** ${sim.cohortSize}`,
    ``,
    `**Enrollment**`,
    ``,
    `| Condition | Participants |\n|---|---|\n${enrollmentRows}`,
  ];

  if (queryBlocks.length) {
    parts.push('', '**Metric results**', '', queryBlocks.join('\n\n'));
  }
  if (sim.interpretation) {
    parts.push('', sim.interpretation);
  }
  if (sim.warnings?.length) {
    parts.push(
      '',
      '**Warnings**',
      '',
      sim.warnings.map((w) => `- ${w}`).join('\n'),
    );
  }
  return parts.join('\n');
}

// Compose the optional "Related Research Grounding" section. Returns null
// when no papers were passed so the section is omitted entirely (no
// placeholder). The AI is responsible for not inventing findings — the
// composer just lays out whatever it received.
function composeRelatedResearchGrounding(research) {
  const papers = (research?.papers || []).slice(0, 3);
  if (papers.length === 0) return null;

  const lead =
    'The papers below were selected as related background for this experiment idea. ' +
    'They do not verify that the proposed intervention will work, but they may help ' +
    'refine the hypothesis, condition design, and metrics.';

  const items = papers.map((p, i) => {
    const title = (p.title || '').trim() || '(untitled paper)';
    const headLink = p.url ? `[${title}](${p.url})` : title;
    const meta = p.authorsYear ? ` — ${p.authorsYear}` : '';
    const lines = [`${i + 1}. **${headLink}**${meta}`];
    if (p.relevance) lines.push(`   - Relevance: ${p.relevance}`);
    if (p.designImplication) lines.push(`   - Design implication: ${p.designImplication}`);
    return lines.join('\n');
  });

  return [lead, '', items.join('\n\n')].join('\n');
}

function composeSetupGuide(experiment) {
  return substitute(TEMPLATES.setupGuide, {
    app_context: experiment.appContext,
    context_metadata: renderContextMetadataEnv(experiment),
    metrics_env: renderMetricsEnv(experiment),
  });
}

function composeExperimentCreationGuide(experiment) {
  return substitute(TEMPLATES.experimentCreationGuide, {
    name: experiment.name,
    description: experiment.description,
    app_context: experiment.appContext,
    site: experiment.decisionPoint.site,
    target: experiment.decisionPoint.target,
    conditions_codes_list: renderConditionCodesList(experiment.conditions),
    creation_metrics_block: renderCreationGuideMetricsBlock(experiment.metrics),
  });
}

function composeClientIntegrationGuide(experiment) {
  return substitute(TEMPLATES.clientIntegrationGuide, {
    app_context: experiment.appContext,
    site: experiment.decisionPoint.site,
    target: experiment.decisionPoint.target,
    condition_handlers_block: renderConditionHandlersBlock(experiment.conditions),
    metric_attrs_block: renderClientMetricAttrsBlock(experiment.metrics),
  });
}

// ============================================================================
// Top-level composer.
// ============================================================================

const SECTION_NUMBER = (n) => `${n}. `;

export function composeReport(input) {
  const {
    title,
    summary,
    appDescription,
    pageDescription,
    experimentIdea,
    hypothesis,
    experiment: rawExperiment,
    simulationResult,
    simulationInterpretation,
    relatedResearch,
    include = {},
  } = input;

  // UpGrade rejects experiments whose app context contains uppercase letters.
  // The system prompt tells the AI to propose lowercase kebab-case, but
  // normalize here so the rendered design block, env vars, UI form values,
  // and client-integration snippets are safe regardless of what the AI sent.
  // (Simulation doesn't go through this path — it overrides to "add" on the
  // server side, so the raw AI value never reaches UpGrade there.)
  const experiment = {
    ...rawExperiment,
    appContext: String(rawExperiment.appContext || '').toLowerCase(),
  };

  // Each entry: { num: 'auto-assigned', heading: string, body: string|null }
  // Sections with null body are skipped entirely.
  const sections = [];

  const push = (heading, body) => {
    if (body == null || body === '' ) return;
    sections.push({ heading, body });
  };

  push('Summary', summary);
  push('Learning App Description', appDescription);
  push('Page / Problem Description', pageDescription);
  push('Experiment Idea', experimentIdea);
  push('Hypothesis', hypothesis);

  if (include.relatedResearchGrounding !== false) {
    push('Related Research Grounding', composeRelatedResearchGrounding(relatedResearch));
  }

  push('Proposed UpGrade Experiment Design', composeExperimentDesign(experiment));

  if (include.simulationResult !== false && simulationResult) {
    const sim = { ...simulationResult };
    if (simulationInterpretation) sim.interpretation = simulationInterpretation;
    push('Simulation Result Summary', composeSimulationSummary(sim));
  }

  if (include.recommendedImplementationOrder !== false) {
    push('Recommended Implementation Order', TEMPLATES.recommendedImplementationOrder);
  }

  if (include.setupGuide !== false) {
    push('UpGrade Setup Guide', composeSetupGuide(experiment));
  }
  if (include.experimentCreationGuide !== false) {
    push('UpGrade Experiment Creation Guide', composeExperimentCreationGuide(experiment));
  }
  if (include.clientIntegrationGuide !== false) {
    push('Client Integration Guide', composeClientIntegrationGuide(experiment));
  }

  if (include.assumptionsAndNotes !== false) {
    push('Assumptions and Notes', TEMPLATES.assumptionsAndNotes);
  }

  // Render.
  const out = [`# ${title}`, ''];
  sections.forEach(({ heading, body }, i) => {
    out.push(`## ${SECTION_NUMBER(i + 1)}${heading}`, '', body, '');
  });
  return out.join('\n').trim() + '\n';
}
