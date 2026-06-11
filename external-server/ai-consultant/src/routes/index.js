import { Router } from 'express';
import { healthRouter } from './health.js';
import { chatRouter } from './chat.js';
import { uploadsRouter } from './uploads.js';

const API_BASE = '/api/v1/ai-consultant';

export function createAiConsultantRouter() {
  const api = Router();

  api.use('/health', healthRouter);
  api.use('/chat', chatRouter);
  api.use('/uploads', uploadsRouter);

  return api;
}

export function mountRoutes(app, { basePath = API_BASE } = {}) {
  app.use(basePath, createAiConsultantRouter());
}
