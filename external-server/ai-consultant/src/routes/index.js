import { Router } from 'express';
import { healthRouter } from './health.js';
import { chatRouter } from './chat.js';
import { uploadsRouter } from './uploads.js';
import { createAppAuth, createAuthRouter } from '../lib/auth.js';

const API_BASE = '/api/v1/ai-consultant';
const APP_BASE = '/ai-consultant';

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
  app.use(appBase, createAuthRouter({
    auth,
    basePath: appBase,
  }));
  app.use(apiBase, auth.apiGuard, createAiConsultantRouter());
}
