import express from 'express';

import { config } from './config';
import { ensureServicesLoaded, scheduleServiceRefresh } from './services/backend';
import webhookRouter from './webhook/router';
import { logger } from './utils/logger';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'instagram-bot', env: config.server.env });
});

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', webhookRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not Found' });
});

const start = async () => {
  try {
    await ensureServicesLoaded();
  } catch (error) {
    logger.error({ err: error }, 'No se pudieron cargar los servicios al iniciar. Reintentando en segundo plano');
  }

  scheduleServiceRefresh();

  app.listen(config.server.port, () => {
    logger.info(`Instagram bot escuchando en el puerto ${config.server.port}`);
  });
};

start().catch((error) => {
  logger.error({ err: error }, 'Error crítico al iniciar el servidor');
  process.exit(1);
});
