// Debug logging is off unless DEBUG_LOGGING is set to a truthy value
// (true/1/yes/on) in .env. Warnings always print regardless.
function parseFlag(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return null;
}

// Read lazily so it doesn't depend on env being loaded at module-eval time.
let cached = null;
function isEnabled() {
  if (cached === null) cached = parseFlag(process.env.DEBUG_LOGGING) === true;
  return cached;
}

const COLORS = {
  tool: '\x1b[36m', // cyan
  upgrade: '\x1b[35m', // magenta
  sim: '\x1b[33m', // yellow
  chat: '\x1b[34m', // blue
  warn: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function fmt(category, msg, fields) {
  const color = COLORS[category] || '';
  const tag = `${color}[${category}]${RESET}`;
  if (!fields || Object.keys(fields).length === 0) return `${tag} ${msg}`;
  const fieldStr = Object.entries(fields)
    .map(([k, v]) => `${k}=${v == null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ');
  return `${tag} ${msg} ${fieldStr}`;
}

function make(category, level = 'log') {
  return (msg, fields) => {
    if (!isEnabled() && level === 'log') return;
    const out = fmt(category, msg, fields);
    if (level === 'warn') console.warn(out);
    else console.log(out);
  };
}

export const log = {
  get enabled() {
    return isEnabled();
  },
  tool: make('tool'),
  upgrade: make('upgrade'),
  sim: make('sim'),
  chat: make('chat'),
  // Warnings always print regardless of DEBUG_LOGGING — they signal real problems.
  warn: make('warn', 'warn'),
};
