import { mkdirSync, readdirSync, readFileSync, unlinkSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');

// Central allowlist. `kind` drives how chat.js turns the file into an Anthropic
// content block: `image` → base64 image block; `pdf` → base64 document block;
// `text` → file contents inlined as a text block. See:
// https://platform.claude.com/docs/en/build-with-claude/pdf-support
export const ALLOWED_UPLOADS = {
  'image/png': { ext: 'png', kind: 'image' },
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'application/pdf': { ext: 'pdf', kind: 'pdf' },
  'text/plain': { ext: 'txt', kind: 'text' },
  'text/csv': { ext: 'csv', kind: 'text' },
};

// Cap how much of a text file we inline into the prompt. Plenty of room for a
// CSV of a few thousand rows; anything bigger is unlikely to be useful as
// inline context for a consulting conversation.
export const TEXT_INLINE_MAX_BYTES = 200 * 1024;

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 8 * 1024 * 1024;

export function isMimeAllowed(mime) {
  return Object.hasOwn(ALLOWED_UPLOADS, mime);
}

// In-memory registry of upload metadata. Resets when the server restarts —
// the disk is also wiped on boot, so the two stay in sync.
//   id → { id, path, mimeType, size, filename, uploadedAt }
const registry = new Map();

export function initUploadsDir() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  // Wipe any leftover files from a previous run — the in-memory registry is
  // empty after a restart so they'd be unreferenceable anyway.
  for (const name of readdirSync(UPLOADS_DIR)) {
    try {
      unlinkSync(join(UPLOADS_DIR, name));
    } catch {
      /* best-effort */
    }
  }
}

export function newUploadId() {
  return 'up_' + randomBytes(12).toString('hex');
}

export function registerUpload({ id, mimeType, size, filename, path }) {
  const meta = {
    id,
    mimeType,
    size,
    filename,
    path,
    uploadedAt: new Date().toISOString(),
  };
  registry.set(id, meta);
  return meta;
}

export function getUpload(id) {
  return registry.get(id) || null;
}

// Used by the chat route to convert an attachment id into the bytes + metadata
// needed for an Anthropic content block.
export function readUploadBytes(id) {
  const meta = getUpload(id);
  if (!meta) return null;
  try {
    const stat = statSync(meta.path);
    if (stat.size !== meta.size) {
      console.warn(`[uploads] size mismatch for ${id}: registry=${meta.size} disk=${stat.size}`);
    }
  } catch (err) {
    console.warn(`[uploads] stat failed for ${id}:`, err.message);
    return null;
  }
  return { ...meta, bytes: readFileSync(meta.path) };
}

export function uploadPathFor(id, mimeType) {
  const spec = ALLOWED_UPLOADS[mimeType];
  const ext = spec ? `.${spec.ext}` : extname(mimeType) || '';
  return join(UPLOADS_DIR, `${id}${ext}`);
}
