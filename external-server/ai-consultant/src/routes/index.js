import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { healthRouter } from './health.js';
import { chatRouter } from './chat.js';
import { uploadsRouter } from './uploads.js';
import { createAppAuth, createAuthRouter } from '../lib/auth.js';

const API_BASE = '/api/v1/ai-consultant';
const APP_BASE = '/ai-consultant';

// Finalized camera-ready paper, served inline under the app base for the
// login-page "Paper" link. Lives at <repo>/paper/ alongside client/ and server/.
const PAPER_PDF_FILENAME = 'ai-experiment-consultant-pele-2026.pdf';
const PAPER_PDF_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'paper', PAPER_PDF_FILENAME);

export function createAiConsultantRouter() {
  const api = Router();

  api.use('/health', healthRouter);
  api.use('/chat', chatRouter);
  api.use('/uploads', uploadsRouter);

  return api;
}

export function mountRoutes(app, {
  auth = createAppAuth({ label: 'ai-consultant' }),
  appBase = APP_BASE,
  apiBase = API_BASE,
} = {}) {
  // Public, unauthenticated: the paper link sits on the pre-login page.
  // res.sendFile sets Content-Type from the extension and serves inline.
  app.get(`${appBase}/paper/${PAPER_PDF_FILENAME}`, (_req, res, next) => {
    res.sendFile(PAPER_PDF_PATH, (err) => {
      if (err) next(err);
    });
  });
  app.use(appBase, createAuthRouter({
    auth,
    basePath: appBase,
  }));
  app.use(apiBase, auth.apiGuard, createAiConsultantRouter());
}
