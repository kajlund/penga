import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

// Load .env from repository root if it exists, and allow local apps/api/.env overrides
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(currentDir, '../../..');
const rootEnvPath = path.join(repoRootDir, '.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(localEnvPath) && localEnvPath !== rootEnvPath) {
  dotenv.config({ path: localEnvPath, override: true });
}

import { queryClient } from './db/index.js';
import { accountsRoute } from './routes/accounts.js';
import { transactionsRoute } from './routes/transactions.js';

export const app = new Hono();

const healthHandler = async (c: any) => {
  let dbStatus = 'disconnected';
  try {
    await queryClient`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${(err as Error).message}`;
  }

  return c.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount accounts routes
app.route('/api/accounts', accountsRoute);
app.route('/accounts', accountsRoute);

// Mount transactions routes
app.route('/api/transactions', transactionsRoute);
app.route('/transactions', transactionsRoute);

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  console.log(`Penga API server starting on port ${port}...`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
