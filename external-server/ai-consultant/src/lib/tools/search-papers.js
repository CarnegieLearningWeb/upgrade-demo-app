import { searchPapersSequential } from '../papers.js';
import { log } from '../log.js';

// JSON Schema exposed to Anthropic. The tool owns throttling, per-query
// retry, candidate de-duplication, deterministic pre-ranking, and caching.
// The AI is responsible for composing a stable canonical research key and
// the two query lists (specific + stable domain).
export const SEARCH_PAPERS_SCHEMA = {
  type: 'object',
  properties: {
    researchContext: {
      type: 'object',
      description:
        'Structured, stable summary of the research idea. The tool builds the ' +
        'ranking signal deterministically from these four fields, so the ' +
        'returned candidates rank in the same order for semantically ' +
        'equivalent inputs (different wording of the same idea). Use ' +
        '**canonical academic vocabulary**, not product wording. See the ' +
        'prompt for canonical vocabulary hints per mechanism.',
      properties: {
        subject: {
          type: 'string',
          description:
            'Subject / domain. e.g. "mathematics education", "reading apps", ' +
            '"second language learning". Lowercase, short noun phrase.',
        },
        mechanism: {
          type: 'string',
          description:
            'Intervention mechanism in canonical terms. Examples: ' +
            '"optional on-demand hints", "scaffolding", "help-seeking", ' +
            '"streak rewards / gamification", "progress feedback", ' +
            '"worked examples", "concrete vs abstract representations". ' +
            'Translate product wording (e.g. "hint button") to the canonical ' +
            'mechanism (e.g. "optional on-demand hints").',
        },
        setting: {
          type: 'string',
          description:
            'Learning setting. e.g. "online learning / intelligent tutoring", ' +
            '"mobile learning", "classroom / blended", "self-paced MOOC".',
        },
        outcome: {
          type: 'string',
          description:
            'Primary outcome the experiment cares about. e.g. ' +
            '"problem completion", "session frequency", "persistence", ' +
            '"time on task", "transfer / retention".',
        },
      },
      required: ['subject', 'mechanism', 'setting', 'outcome'],
    },
    specificQueries: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: { type: 'string', minLength: 3 },
      description:
        '1–2 academic queries derived from the hypothesis itself. ' +
        'Natural-language phrases (not Boolean), no quoted brand/app names. ' +
        'Keep short — more specific queries mean more variance across runs.',
    },
    domainQueries: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: { type: 'string', minLength: 3 },
      description:
        '2–3 stable, domain-oriented queries based on the experiment ' +
        'mechanism. The tool **always** runs these in addition to ' +
        '`specificQueries` (not just on empty results) so the candidate pool ' +
        'is robust regardless of how specific queries are phrased. Pick ' +
        'queries appropriate for the mechanism in play (see prompt for ' +
        'canonical examples per mechanism).',
    },
    resultsPerQuery: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
      description: 'Optional. Max candidates per query. Default 5.',
    },
  },
  required: ['researchContext', 'specificQueries', 'domainQueries'],
};

// Trimmed cap — the AI applies the relevance rubric within this set, so we
// don't need a long tail. ~12 is enough to find 3 good ones.
const MAX_CANDIDATES_RETURNED = 12;

function normalizeField(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Deterministic canonical key built from the four structured fields. The AI
// passes them; the tool concatenates here so segment count, order, and
// punctuation are fixed regardless of how the AI phrases each field. Used
// as the primary signal for candidate ranking, and surfaced in server logs
// so we can verify the AI is producing stable keys across runs.
function canonicalKeyFromContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const parts = [
    normalizeField(ctx.subject),
    normalizeField(ctx.mechanism),
    normalizeField(ctx.setting),
    normalizeField(ctx.outcome),
  ];
  if (parts.some((p) => p.length === 0)) return '';
  return parts.join(' | ');
}

function truncateForLog(s, n = 160) {
  if (!s) return s;
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function progressFor(count) {
  if (count === 0) return 'No related papers found.';
  const noun = count === 1 ? 'paper' : 'papers';
  return `Found ${count} related ${noun}.`;
}

// ============================================================================
// Deterministic ranking. Ranking is done server-side so repeated runs of the
// same canonical research key return candidates in the same top-N order.
// The AI then applies its own relevance rubric within this set; sorting up
// front constrains the variance.
// ============================================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'for', 'to', 'with',
  'as', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'these', 'those',
  'i', 'you', 'we', 'they', 'it', 'how', 'what', 'when', 'why', 'which',
]);

function extractRankingTokens(canonicalKey, specificQueries, domainQueries) {
  // The canonical key (built from researchContext fields) is the primary
  // signal — stable across runs. Queries supplement it. Both sources
  // contribute lowercase tokens >= 4 chars.
  const sources = [
    canonicalKey.replaceAll('|', ' '),
    ...(specificQueries || []),
    ...(domainQueries || []),
  ];
  const tokens = new Set();
  const text = sources.map((s) => String(s || '')).join(' ').toLowerCase();
  for (const raw of text.split(/\s+/)) {
    const clean = raw.replace(/[^a-z0-9-]/g, '');
    if (clean.length >= 4 && !STOPWORDS.has(clean)) tokens.add(clean);
  }
  return Array.from(tokens);
}

function scoreCandidate(p, rankingTokens) {
  let score = 0;
  // Abstract presence — papers without abstracts are weaker grounding.
  if (p.abstract) score += 2;
  // Recency.
  if (p.year >= 2018) score += 1;
  if (p.year >= 2020) score += 1;
  // Citation count (log-binned).
  const c = p.citationCount || 0;
  if (c >= 5) score += 1;
  if (c >= 50) score += 1;
  if (c >= 200) score += 1;
  // Token overlap with the canonical research key / query language.
  const haystack = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
  for (const tok of rankingTokens) {
    if (haystack.includes(tok)) score += 1;
  }
  return score;
}

function rankCandidates(candidates, rankingTokens) {
  return candidates
    .map((p) => ({ p, score: scoreCandidate(p, rankingTokens) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const cb = b.p.citationCount || 0;
      const ca = a.p.citationCount || 0;
      if (cb !== ca) return cb - ca;
      const yb = b.p.year || 0;
      const ya = a.p.year || 0;
      if (yb !== ya) return yb - ya;
      return (a.p.title || '').localeCompare(b.p.title || '');
    })
    .map((s) => s.p);
}

// ============================================================================
// Tool entry point.
// ============================================================================

export async function searchPapersTool({ input, emit, signal }) {
  const specificQueries = (input.specificQueries || []).filter(
    (q) => typeof q === 'string' && q.trim().length >= 3,
  );
  const domainQueries = (input.domainQueries || []).filter(
    (q) => typeof q === 'string' && q.trim().length >= 3,
  );
  const resultsPerQuery = Math.min(Math.max(Number(input.resultsPerQuery) || 5, 1), 10);
  // Canonical key derived deterministically from researchContext. Used only
  // as the ranking signal and as a stable log identifier — every call runs
  // a fresh Semantic Scholar search (no candidate caching).
  const canonicalKey = canonicalKeyFromContext(input.researchContext);

  // Always merge — the domain queries are not a fallback, they run every time.
  const allQueries = [...specificQueries, ...domainQueries];

  if (allQueries.length === 0) {
    return { candidates: [] };
  }

  emit({ type: 'tool_progress', message: 'Searching for related research papers…' });

  // Run all queries (specific + domain) in one throttled batch. No
  // conditional fallback — the domain queries are always part of the pool.
  const batch = await searchPapersSequential({
    queries: allQueries,
    resultsPerQuery,
    label: 'combined',
    signal,
  });

  // Deterministic pre-ranking using canonical-key tokens (with queries as
  // supplement). The AI is told to apply the relevance rubric and trust
  // server ordering to break ties — that keeps selection reasonably stable.
  const rankingTokens = extractRankingTokens(canonicalKey, specificQueries, domainQueries);
  const ranked = rankCandidates(batch.candidates, rankingTokens);
  const returned = ranked.slice(0, MAX_CANDIDATES_RETURNED);

  log.tool('search_papers result', {
    canonicalKey: truncateForLog(canonicalKey),
    specificQueries: specificQueries.length,
    domainQueries: domainQueries.length,
    succeeded: batch.succeeded,
    errors: batch.errors.length,
    errorCategories: batch.errors.map((e) => e.category),
    candidatesRaw: batch.candidates.length,
    candidatesReturned: returned.length,
  });

  emit({ type: 'tool_progress', message: progressFor(returned.length) });
  return { candidates: returned };
}
