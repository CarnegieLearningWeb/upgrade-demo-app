import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const DEMO_APP_ROOT = join(SRC_DIR, '..', '..', '..');

export const fromServerDir = (p) => (isAbsolute(p) ? p : join(DEMO_APP_ROOT, p));
