import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
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
import { reportsRoute } from './routes/reports.js';
import { budgetsRoute } from './routes/budgets.js';
import { tagsRoute } from './routes/tags.js';
import { templatesRoute } from './routes/templates.js';

export const app = new Hono();
export const webDistDir = path.resolve(repoRootDir, 'apps/web/dist');

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

// Mount reports & dashboard routes
app.route('/api/reports', reportsRoute);
app.route('/api/dashboard', reportsRoute);
app.route('/reports', reportsRoute);
app.route('/dashboard', reportsRoute);

// Mount budgets routes
app.route('/api/budgets', budgetsRoute);
app.route('/budgets', budgetsRoute);

// Mount tags routes
app.route('/api/tags', tagsRoute);
app.route('/tags', tagsRoute);

// Mount templates routes
app.route('/api/templates', templatesRoute);
app.route('/templates', templatesRoute);

// Serve built frontend assets and SPA fallback if dist directory exists
if (fs.existsSync(webDistDir)) {
  const indexHtmlPath = path.join(webDistDir, 'index.html');

  // Serve static assets from apps/web/dist
  app.use('/*', serveStatic({ root: webDistDir }));

  // Fallback to index.html for client-side navigation (SPA), preserving 404 for API/health
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/') || c.req.path === '/health' || c.req.path.startsWith('/health/')) {
      return c.json({ error: 'Not Found' }, 404);
    }
    return c.html(fs.readFileSync(indexHtmlPath, 'utf8'));
  });
}

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  console.log(`Penga API server starting on port ${port}...`);
  if (fs.existsSync(webDistDir)) {
    console.log(`Serving web frontend from ${webDistDir}`);
  } else {
    console.warn(`Frontend build directory not found at ${webDistDir}. Run "npm run build -w @penga/web" to build.`);
  }
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
