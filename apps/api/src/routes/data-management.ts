import { Hono } from 'hono';
import { clearLedgerHistory, ledgerHistorySummary, StaleLedgerError } from '../domain/ledger-history.js';

export const dataManagementRoute = new Hono();

dataManagementRoute.get('/transactions/summary', async c => {
  c.header('Cache-Control', 'no-store');
  try {
    return c.json({ data: await ledgerHistorySummary() });
  } catch (error) {
    console.error('Could not summarize ledger history', error);
    return c.json({ error: 'Could not load transaction history. Please try again.' }, 500);
  }
});

dataManagementRoute.post('/transactions/clear', async c => {
  // JSON-only mutation prevents cross-site form submissions in this single-user app.
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('Content-Type') || '')) {
    return c.json({ error: 'Content-Type must be application/json' }, 415);
  }
  let body: any;
  try { body = await c.req.json(); }
  catch { return c.json({ error: 'Invalid JSON request body' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['confirmation', 'revision'].includes(key))) {
    return c.json({ error: 'Only confirmation and revision are accepted; the reset always applies to the current ledger.' }, 400);
  }
  try {
    const data = await clearLedgerHistory(body.confirmation, body.revision);
    return c.json({ success: true, data });
  } catch (error) {
    if (error instanceof TypeError) return c.json({ error: error.message }, 400);
    if (error instanceof StaleLedgerError) return c.json({ error: error.message, stale: true }, 409);
    console.error('Could not clear ledger history', error);
    return c.json({ error: 'Could not clear transactions. No changes were committed. Please try again.' }, 500);
  }
});
