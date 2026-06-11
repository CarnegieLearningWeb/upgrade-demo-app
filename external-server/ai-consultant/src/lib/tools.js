import { runSimulation, RUN_SIMULATION_SCHEMA } from './tools/run-simulation.js';
import { generateReport, GENERATE_REPORT_SCHEMA } from './tools/generate-report.js';
import { searchPapersTool, SEARCH_PAPERS_SCHEMA } from './tools/search-papers.js';

// A tool definition:
//   {
//     name: string,
//     description: string,
//     input_schema: <JSON Schema>,            // exposed to Anthropic
//     run: async ({ input, emit, signal }) => any  // server-side execution
//   }
//
// `emit(event)` lets the tool stream progress events to the client during
// execution; the chat route wraps it to add tool_use_id + tool name.
// `signal` is reserved for future cancellation support (not wired yet).
// `run` returns the structured tool result that gets fed back to the model
// in the next round.

const REGISTRY = {
  search_papers: {
    name: 'search_papers',
    description:
      'Search Semantic Scholar for related academic papers. Takes a structured ' +
      '`researchContext` ({subject, mechanism, setting, outcome}), 1–2 ' +
      '`specificQueries` derived from the hypothesis, and 2–3 stable ' +
      '`domainQueries` for the experiment mechanism. The researchContext is ' +
      'used as the ranking signal — its segments drive the token-overlap ' +
      'score that orders candidates. Every call runs a fresh Semantic Scholar ' +
      'search (no candidate caching). The tool **always runs both query lists** ' +
      'together in a single throttled batch — every Semantic Scholar call ' +
      '(initial, retry, across concurrent users) is serialized through a ' +
      'single reservation queue and spaced >=1.5s apart. 429 responses honor ' +
      '`Retry-After` when present, else wait an extra 2s before retry. The ' +
      'queue is scoped to Semantic Scholar fetches only — unrelated chat, ' +
      'simulation, and report requests run normally. De-duped candidates are ' +
      "**deterministically pre-ranked** by canonical-key token overlap, " +
      'abstract presence, recency, and citation count. Returns ' +
      '`{ candidates: [...] }` — each has title, authors, year, venue, ' +
      'abstract (truncated), url, doi, citationCount. ' +
      'Call this only when the user has explicitly opted into research grounding ' +
      'after the hypothesis is approved. After the tool returns, apply the 0–3 ' +
      'relevance rubric and select only papers scoring >= 2 (see system prompt). ' +
      'Use ONLY the returned metadata/abstracts when summarizing — never invent ' +
      'findings, effect sizes, or claims not present in the data.',
    input_schema: SEARCH_PAPERS_SCHEMA,
    run: searchPapersTool,
  },
  run_simulation: {
    name: 'run_simulation',
    description:
      'Run a synthetic preflight experiment against the demo UpGrade backend. ' +
      'Creates a temporary experiment, simulates the requested cohort of synthetic ' +
      'participants (no real users), retrieves enrollment + metric results, and cleans ' +
      'up after itself. Returns structured result data plus warnings; the assistant ' +
      "should then format these into a markdown summary for the user and emphasize that " +
      'the numbers are preflight/synthetic, not predictive of real outcomes. ' +
      'Use this tool when the user has approved an experiment design and wants to see ' +
      'how assignment, enrollment, and metric logging would behave in UpGrade.',
    input_schema: RUN_SIMULATION_SCHEMA,
    run: runSimulation,
  },
  generate_report: {
    name: 'generate_report',
    description:
      'Compose the final markdown experiment-plan report and open it in the side panel ' +
      'on the right. The server composes the report by combining your dynamic prose ' +
      '(app description, hypothesis, etc.) with deterministic templates for the setup / ' +
      'experiment-creation / client-integration / notes sections. You do NOT need to write ' +
      "the full report — pass the structured pieces and the templates fill in the rest. " +
      'After the tool returns, reply with one short sentence acknowledging the panel is ' +
      "ready (don't repeat the report content in chat). Call this tool only after the user " +
      'has approved the sections to include.',
    input_schema: GENERATE_REPORT_SCHEMA,
    run: generateReport,
  },
};

export function getToolDefinitionsForAnthropic() {
  return Object.values(REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}

export function getTool(name) {
  return REGISTRY[name] || null;
}
