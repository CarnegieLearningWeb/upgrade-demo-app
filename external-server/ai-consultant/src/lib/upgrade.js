import { GoogleAuth } from 'google-auth-library';
import { fromServerDir } from '../env.js';
import { log } from './log.js';

// ============================================================================
// Constants — see prompt-knowledge/upgrade-concepts.md "Metric naming convention"
// and docs/simulation-api.md.
// ============================================================================

// The UpGrade demo backend only has the "add" context configured. The AI
// uses whatever app-context name fits the user's app during the consulting
// flow; this override happens silently when we actually call UpGrade.
export const DEMO_APP_CONTEXT = 'add';

// `repeatedMeasure` is fixed for the MVP — never expose to the AI.
export const REPEATED_MEASURE = 'MOST RECENT';

// continuous metric: operationType → display name
const CONTINUOUS_OP_DISPLAY = {
  sum: 'Sum',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  avg: 'Mean',
  mode: 'Mode',
  median: 'Median',
  stddev: 'Standard Deviation',
};

// categorical metric: operationType → display name
const CATEGORICAL_OP_DISPLAY = {
  count: 'Count',
  percentage: 'Percent',
};

// categorical metric: compareFn → display token
const CATEGORICAL_COMPARE_DISPLAY = {
  '=': '=',
  '<>': '!=',
};

export function displayNameForMetric(metric) {
  const { key, datatype, query } = metric;
  if (datatype === 'continuous') {
    const op = CONTINUOUS_OP_DISPLAY[query.operationType] || query.operationType;
    return `${key} (${op})`;
  }
  if (datatype === 'categorical') {
    const op = CATEGORICAL_OP_DISPLAY[query.operationType] || query.operationType;
    const cmp = CATEGORICAL_COMPARE_DISPLAY[query.compareFn] || query.compareFn;
    return `${key} (${op} ${cmp} ${query.compareValue})`;
  }
  return key;
}

// ============================================================================
// Auth — Google service account → cached access token.
// ============================================================================

let auth = null;
let authClient = null;
let cachedToken = null;

function getAuth() {
  if (!auth) {
    auth = new GoogleAuth({
      keyFilename: fromServerDir(process.env.UPGRADE_SERVICE_ACCOUNT_KEY_PATH),
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  }
  return auth;
}

export async function getAccessToken() {
  if (!authClient) authClient = await getAuth().getClient();
  if (cachedToken && !authClient.isTokenExpiring()) return cachedToken;
  const { token } = await authClient.getAccessToken();
  cachedToken = token;
  return token;
}

// ============================================================================
// HTTP helpers.
// ============================================================================

class UpgradeError extends Error {
  constructor(message, { status, endpoint, body } = {}) {
    super(message);
    this.name = 'UpgradeError';
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
    this.expose = true;
  }
}

async function upgradeFetch(path, { method = 'POST', body, userId, auth: needsAuth = false } = {}) {
  const url = `${process.env.UPGRADE_API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (userId) headers['User-Id'] = userId;
  if (needsAuth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    log.warn(`${method} ${path} threw`, { user: userId, err: err.message });
    throw err;
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  const ms = Date.now() - started;
  if (!res.ok) {
    const msg = (payload && typeof payload === 'object' && payload.message) || res.statusText;
    log.warn(`${method} ${path} ${res.status}`, { user: userId, ms, msg });
    throw new UpgradeError(`UpGrade ${method} ${path} failed (${res.status}): ${msg}`, {
      status: res.status,
      endpoint: path,
      body: payload,
    });
  }

  log.upgrade(`${method} ${path} ${res.status}`, { user: userId, ms });
  return payload;
}

// ============================================================================
// Management endpoints (require auth).
// ============================================================================

export function saveMetrics({ metricUnit, context = [DEMO_APP_CONTEXT] }) {
  return upgradeFetch('/metric/save', {
    method: 'POST',
    body: { metricUnit, context },
    auth: true,
  });
}

export function deleteMetric(key) {
  return upgradeFetch(`/metric/${encodeURIComponent(key)}`, { method: 'DELETE', auth: true });
}

export function createExperiment(payload) {
  return upgradeFetch('/experiments', { method: 'POST', body: payload, auth: true });
}

export function setExperimentState({ experimentId, state }) {
  return upgradeFetch('/experiments/state', {
    method: 'POST',
    body: { experimentId, state },
    auth: true,
  });
}

export function getEnrollmentDetail({ experimentId }) {
  return upgradeFetch('/stats/enrollment/detail', {
    method: 'POST',
    body: { experimentId },
    auth: true,
  });
}

export function analyseQueries({ queryIds }) {
  return upgradeFetch('/query/analyse', { method: 'POST', body: { queryIds }, auth: true });
}

export function deleteExperiment(experimentId) {
  return upgradeFetch(`/experiments/${encodeURIComponent(experimentId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

// ============================================================================
// Client API endpoints (User-Id header only, no auth).
// ============================================================================

export function initUser(userId) {
  return upgradeFetch('/v6/init', { method: 'POST', userId });
}

export async function assignUser({ userId, site, target, context = DEMO_APP_CONTEXT }) {
  const data = await upgradeFetch('/v6/assign', { method: 'POST', userId, body: { context } });
  if (!Array.isArray(data)) {
    log.upgrade('assign no-array response', { user: userId });
    return null;
  }
  const match = data.find((d) => d.site === site && d.target === target);
  const assigned = match?.assignedCondition?.[0] ?? null;
  if (!assigned) {
    // This is the silent failure path that doesn't throw but leaves the
    // participant unenrolled — exactly the kind of thing the cohort counter
    // hides. Log it so it's visible.
    log.upgrade('assign returned no condition', {
      user: userId,
      site,
      target,
      siteFound: !!match,
      conditionsLen: match?.assignedCondition?.length ?? 0,
    });
  }
  return assigned;
}

export function markDecisionPoint({ userId, site, target, conditionCode }) {
  return upgradeFetch('/v6/mark', {
    method: 'POST',
    userId,
    body: {
      data: {
        site,
        target,
        assignedCondition: { conditionCode },
      },
    },
  });
}

export function logMetrics({ userId, attributes }) {
  return upgradeFetch('/v6/log', {
    method: 'POST',
    userId,
    body: {
      value: [
        {
          timestamp: new Date().toISOString(),
          metrics: { attributes },
        },
      ],
    },
  });
}
