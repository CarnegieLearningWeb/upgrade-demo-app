import { v4 as uuidv4 } from 'uuid';
import { composeReport } from '../report.js';
import { log } from '../log.js';

// JSON Schema exposed to Anthropic. Reuses the structured `experiment` shape
// from run_simulation (so the AI can pass the same object) plus the dynamic
// AI-written prose sections.
export const GENERATE_REPORT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short title for the report, e.g. "Hint Button Experiment Plan".' },
    summary: {
      type: 'string',
      description:
        'One short paragraph that someone reading this report cold can use to understand what is being proposed.',
    },
    appDescription: { type: 'string', description: 'A paragraph describing the user\'s learning app.' },
    pageDescription: {
      type: 'string',
      description: "A paragraph describing the page / problem / interaction where the experiment will run.",
    },
    experimentIdea: {
      type: 'string',
      description: 'The core idea behind the proposed change. What is being added/changed/removed?',
    },
    hypothesis: {
      type: 'string',
      description: 'The testable hypothesis. Should be concrete, with a predicted direction.',
    },
    experiment: {
      type: 'object',
      description: 'The approved experiment design (same shape used by run_simulation).',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        appContext: {
          type: 'string',
          description:
            "Use the app context name the user has been speaking in chat (e.g. 'example-math-app'), NOT the server-side simulation override.",
        },
        decisionPoint: {
          type: 'object',
          properties: { site: { type: 'string' }, target: { type: 'string' } },
          required: ['site', 'target'],
        },
        conditions: {
          type: 'array',
          minItems: 2,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              weight: { type: 'number' },
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
              key: { type: 'string' },
              datatype: { type: 'string', enum: ['categorical', 'continuous'] },
              allowedValues: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              query: {
                type: 'object',
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
      required: ['name', 'description', 'appContext', 'decisionPoint', 'conditions', 'metrics'],
    },
    simulationResult: {
      type: 'object',
      description:
        'Optional. If run_simulation produced a result earlier in this conversation, pass the same structured result back so the report can include it.',
      properties: {
        cohortSize: { type: 'integer' },
        enrollment: { type: 'object', additionalProperties: { type: 'integer' } },
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              display: { type: 'string' },
              byCondition: { type: 'object', additionalProperties: { type: 'number' } },
            },
          },
        },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
    simulationInterpretation: {
      type: 'string',
      description:
        'Optional. A short paragraph interpreting the simulation result (which condition looked better, what to read into it). Only used if simulationResult is also provided.',
    },
    relatedResearch: {
      type: 'object',
      description:
        "Optional. Selected papers from the optional Related Research Grounding step. Pass only if you called `search_papers` earlier and presented up to 3 papers in chat — pass those same papers here with the same one-sentence relevance + design-implication summaries you used. Use only metadata you actually got back; do not invent findings or claim the papers validate the intervention. If the section is empty or omitted, the report skips it entirely (no placeholder).",
      properties: {
        papers: {
          type: 'array',
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Paper title as returned by search_papers.' },
              url: { type: 'string', description: 'Direct URL to the paper, if available.' },
              authorsYear: {
                type: 'string',
                description:
                  'Short citation snippet for display, e.g. "Smith et al., 2023". Compose from the returned authors[] and year fields. Optional but recommended.',
              },
              relevance: {
                type: 'string',
                description:
                  'One-sentence statement of why this paper is relevant to the proposed experiment. Tentative phrasing if the abstract is vague.',
              },
              designImplication: {
                type: 'string',
                description:
                  'One-sentence concrete suggestion for the experiment design (hypothesis, conditions, metrics, or cautions) that this paper supports.',
              },
            },
            required: ['title', 'relevance', 'designImplication'],
          },
        },
      },
    },
    include: {
      type: 'object',
      description:
        "Optional section toggles. Defaults are all true. Set a section to false if the user explicitly asked to exclude it. Recognized keys: relatedResearchGrounding, simulationResult, recommendedImplementationOrder, setupGuide, experimentCreationGuide, clientIntegrationGuide, assumptionsAndNotes.",
      additionalProperties: { type: 'boolean' },
    },
  },
  required: ['title', 'summary', 'appDescription', 'pageDescription', 'experimentIdea', 'hypothesis', 'experiment'],
};

export async function generateReport({ input, emit }) {
  const t0 = Date.now();
  const title = input.title || 'Experiment Plan';

  // Payload-size signals so we can attribute report-generation latency.
  // Composition itself is pure string manipulation and should be sub-50ms;
  // any wall-clock difference between sessions with/without related research
  // grounding is dominated by model-side tool-input construction time (the
  // AI streams `relatedResearch.papers[]` as JSON via Anthropic
  // input_json_delta events before the server ever sees this handler).
  const relatedPapers = input.relatedResearch?.papers;
  const relatedPaperCount = Array.isArray(relatedPapers) ? relatedPapers.length : 0;
  const relatedResearchBytes = relatedPaperCount
    ? JSON.stringify(input.relatedResearch).length
    : 0;
  const inputBytes = JSON.stringify(input).length;
  const excludedSections = Object.entries(input.include || {})
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  log.tool('generate_report start', {
    title,
    inputBytes,
    hasSimulation: !!input.simulationResult,
    hasRelatedResearch: relatedPaperCount > 0,
    relatedPaperCount,
    relatedResearchBytes,
    excludedSections,
  });

  const tComposeStart = Date.now();
  const markdown = composeReport(input);
  const composerMs = Date.now() - tComposeStart;

  const artifactId = `rpt_${uuidv4().slice(0, 8)}`;

  // Emit the artifact alongside the standard tool_progress channel — the chat
  // route forwards anything we emit. The client recognizes type: "artifact"
  // and opens the side panel directly from this payload; the AI does NOT
  // re-stream or rephrase the markdown after the tool returns (it just
  // sends one short acknowledgment line per the system prompt).
  emit({
    type: 'artifact',
    artifactId,
    kind: 'markdown',
    title,
    content: markdown,
  });

  const totalMs = Date.now() - t0;
  log.tool('generate_report done', {
    artifactId,
    composerMs,
    totalMs,
    markdownBytes: markdown.length,
  });

  return {
    artifactId,
    title,
    bytes: markdown.length,
  };
}
