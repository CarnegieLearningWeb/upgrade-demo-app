// Semantic Scholar client for the optional Related Research Grounding step.
//
// Calls are issued **sequentially** with a ~1.1 s gap between them. Semantic
// Scholar's free tier is ~1 RPS with an API key (and a smaller shared pool
// without one), so parallel issuance reliably hit 429s and produced
// inconsistent results across runs of the same hypothesis. Sequential calls
// trade a bit of latency for stable behavior.
//
// API key is optional. If SEMANTIC_SCHOLAR_API_KEY is set it's forwarded as
// `x-api-key`. `hasApiKey` is included in per-call logs so we can verify
// operationally without printing the key itself.

import { log } from './log.js';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = [
  'title',
  'authors.name',
  'year',
  'venue',
  'abstract',
  'url',
  'externalIds',
  'citationCount',
].join(',');

const DEFAULT_TIMEOUT_MS = 8000;
const ABSTRACT_MAX_CHARS = 600;

// Minimum gap between any two Semantic Scholar requests. Semantic Scholar's
// approved-key rate limit is **1 RPS cumulative across endpoints**, so this
// throttle is enforced at the fetch layer and covers every kind of call
// (initial, retry, concurrent searches from other users). 1500 ms gives
// headroom over the 1-second window for clock skew / network jitter.
const MIN_REQUEST_INTERVAL_MS = 1500;

// Extra delay when retrying after a 429 without a server-supplied
// Retry-After header. With Retry-After we use the server's value instead.
const RATE_LIMIT_EXTRA_BACKOFF_MS = 2000;

// One retry per query on transient failures (timeout, network, 5xx, 429).
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function categorizeError(err) {
  if (!err) return 'unknown';
  if (err.name === 'AbortError') return 'timeout';
  if (err.status === 429) return 'http_429';
  if (err.status === 408) return 'http_408';
  if (typeof err.status === 'number' && err.status >= 500) return 'http_5xx';
  if (typeof err.status === 'number' && err.status >= 400) return 'http_4xx';
  if (err instanceof TypeError) return 'network';
  return 'other';
}

function isRetryableError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (RETRYABLE_HTTP_STATUSES.has(err.status)) return true;
  if (err instanceof TypeError) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Module-level throttle for Semantic Scholar requests.
//
// Concurrency-safety note: in single-threaded JS the per-call sync prefix
// runs to completion, but `throttledFetch` has to `await sleep(...)` in the
// middle of its read/write window. Without a queue, two concurrent calls can
// both read `nextCallEligibleAt`, both sleep until the same instant, then
// both fetch in parallel — exactly the race we're trying to avoid. So slot
// reservation is serialized through a promise chain: each reservation waits
// for the previous one to finish before reading/writing the shared state.
// Once a slot is reserved the actual fetch runs concurrently with the next
// reservation, so we don't serialize the response-handling latency.
//
// This queue is scoped to Semantic Scholar requests only — chat, simulation,
// report generation, and unrelated tool calls do not touch it.
let nextCallEligibleAt = 0;
let reservationTail = Promise.resolve();

async function reserveSlot() {
  const myReservation = reservationTail.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, nextCallEligibleAt - now);
    if (wait > 0) await sleep(wait);
    nextCallEligibleAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
  });
  // Subsequent callers wait on us finishing. Swallow any rejection here to
  // keep the chain alive — the original caller still gets the rejection
  // through `await myReservation` below.
  reservationTail = myReservation.catch(() => {});
  await myReservation;
}

async function throttledFetch(url, options) {
  await reserveSlot();
  return fetch(url, options);
}

function truncate(s, n) {
  if (!s || s.length <= n) return s || null;
  return `${s.slice(0, n).trimEnd()}…`;
}

function normalizePaper(raw) {
  const doi = raw?.externalIds?.DOI || null;
  const url = raw?.url || (doi ? `https://doi.org/${doi}` : null);
  return {
    title: (raw?.title || '').trim() || '(untitled)',
    authors: (raw?.authors || []).slice(0, 8).map((a) => a?.name).filter(Boolean),
    year: Number.isFinite(raw?.year) ? raw.year : null,
    venue: raw?.venue || null,
    abstract: truncate(raw?.abstract, ABSTRACT_MAX_CHARS),
    url,
    doi,
    citationCount: Number.isFinite(raw?.citationCount) ? raw.citationCount : null,
  };
}

function dedupeKey(p) {
  if (p.doi) return `doi:${p.doi.toLowerCase()}`;
  return `title:${p.title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

function dedupePapers(papers) {
  const seen = new Map();
  for (const p of papers) {
    const key = dedupeKey(p);
    if (!seen.has(key)) seen.set(key, p);
  }
  return Array.from(seen.values());
}

async function searchOneQuery({ query, limit, timeoutMs }) {
  const url = new URL(`${BASE_URL}/paper/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('fields', FIELDS);

  const hasApiKey = !!process.env.SEMANTIC_SCHOLAR_API_KEY;
  const headers = { Accept: 'application/json' };
  if (hasApiKey) headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await throttledFetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const httpErr = new Error(`Semantic Scholar returned ${res.status}`);
      httpErr.status = res.status;
      if (res.status === 429) {
        // Honor server-supplied Retry-After when sane (seconds, < 1 min).
        const header = res.headers.get('Retry-After');
        const seconds = header ? Number.parseFloat(header) : Number.NaN;
        if (Number.isFinite(seconds) && seconds > 0 && seconds < 60) {
          httpErr.retryAfterMs = seconds * 1000;
        }
      }
      throw httpErr;
    }
    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    log.tool('semantic-scholar ok', {
      query,
      ms: Date.now() - started,
      results: items.length,
      hasApiKey,
    });
    return items.map(normalizePaper);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchOneQueryWithRetry(args) {
  try {
    return await searchOneQuery(args);
  } catch (err) {
    if (!isRetryableError(err)) throw err;
    // For 429s, wait an extra block on top of the throttle baseline. Prefer
    // the server's Retry-After header if it gave us one (within sane bounds
    // — parsed in `searchOneQuery`); fall back to RATE_LIMIT_EXTRA_BACKOFF_MS
    // otherwise. Other retryable categories (timeout, network, 5xx) rely on
    // the throttle baseline alone.
    let extra = 0;
    let usedRetryAfter = false;
    if (err.status === 429) {
      if (typeof err.retryAfterMs === 'number') {
        extra = err.retryAfterMs;
        usedRetryAfter = true;
      } else {
        extra = RATE_LIMIT_EXTRA_BACKOFF_MS;
      }
    }
    log.warn('semantic-scholar retrying', {
      query: args.query,
      category: categorizeError(err),
      status: err.status,
      extraBackoffMs: extra,
      usedRetryAfter,
    });
    if (extra > 0) await sleep(extra);
    return searchOneQuery(args);
  }
}

/**
 * Run a batch of queries sequentially with throttling, dedupe results across
 * queries, and return distinguishable success / failure counts.
 *
 * Returns `{ candidates, errors, succeeded }` where `errors` is an array of
 * categorized `{ query, category, status, message }` entries — callers can
 * tell "all queries returned 0 papers" (a real empty result) from "all
 * queries failed with 429" (an API problem).
 *
 * Never throws — individual query failures become entries in `errors`.
 *
 * `label` is for logs only ('initial' / 'fallback' / etc.).
 */
export async function searchPapersSequential({
  queries,
  resultsPerQuery = 5,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  label = 'initial',
  signal,
}) {
  const cleanQueries = (queries || [])
    .map((q) => (typeof q === 'string' ? q.trim() : ''))
    .filter((q) => q.length >= 3);

  const hasApiKey = !!process.env.SEMANTIC_SCHOLAR_API_KEY;

  if (cleanQueries.length === 0) {
    return { candidates: [], errors: [], succeeded: 0 };
  }

  const limit = Math.min(Math.max(Number(resultsPerQuery) || 5, 1), 10);

  const all = [];
  const errors = [];
  let succeeded = 0;

  for (const query of cleanQueries) {
    // Bail out of remaining queries if the user stopped the turn. Most of the
    // wall-clock here is the >=1.5s spacing between calls, so skipping the rest
    // of the batch is the meaningful win.
    if (signal?.aborted) break;
    // No manual sleep — `throttledFetch` enforces the per-call spacing
    // for every Semantic Scholar request (including retries and fallback
    // queries), so the loop just dispatches.
    try {
      const papers = await searchOneQueryWithRetry({ query, limit, timeoutMs });
      all.push(...papers);
      succeeded += 1;
      log.tool('semantic-scholar query', {
        label,
        query,
        kept: papers.length,
        status: 'ok',
      });
    } catch (err) {
      const category = categorizeError(err);
      errors.push({
        query,
        category,
        status: err.status,
        message: err.message,
      });
      log.warn('semantic-scholar query failed', {
        label,
        query,
        category,
        status: err.status,
        message: err.message,
        hasApiKey,
      });
    }
  }

  const deduped = dedupePapers(all);
  log.tool('semantic-scholar batch', {
    label,
    submitted: cleanQueries.length,
    succeeded,
    failed: errors.length,
    errorCategories: errors.map((e) => e.category),
    raw: all.length,
    deduped: deduped.length,
    hasApiKey,
  });

  return { candidates: deduped, errors, succeeded };
}
