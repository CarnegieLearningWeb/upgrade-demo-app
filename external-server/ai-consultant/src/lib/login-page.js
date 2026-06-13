import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(LIB_DIR, '..', 'views', 'login.html');
const template = readFileSync(TEMPLATE_PATH, 'utf8');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeScriptString(value) {
  return JSON.stringify(String(value)).slice(1, -1);
}

export function renderLoginPage({ googleClientId, appBase }) {
  return template
    .replaceAll('{{GOOGLE_CLIENT_ID}}', escapeHtml(googleClientId || ''))
    .replaceAll('{{APP_BASE}}', escapeScriptString(appBase));
}
