process.env.NODE_ENV = 'test';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { app, webDistDir } from '../dist/index.js';
import { queryClient } from '../dist/db/index.js';

after(async () => {
  await queryClient.end();
});

test('static serving: serves index.html at root route', async () => {
  const res = await app.request('/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  const html = await res.text();
  assert.match(html, /<penga-app>/);
});

test('static serving: serves static assets with proper mime type', async () => {
  const assetsDir = path.join(webDistDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    return;
  }
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(f => f.endsWith('.js'));
  const cssFile = files.find(f => f.endsWith('.css'));

  if (jsFile) {
    const res = await app.request(`/assets/${jsFile}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /javascript/);
  }

  if (cssFile) {
    const res = await app.request(`/assets/${cssFile}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/css/);
  }
});

test('static serving: client-side SPA fallback serves index.html for non-API routes', async () => {
  const res = await app.request('/overview');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/);
  const html = await res.text();
  assert.match(html, /<penga-app>/);
});

test('static serving: API 404 returns JSON and does not fallback to index.html', async () => {
  const res = await app.request('/api/non-existent-endpoint');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const data = await res.json();
  assert.equal(data.error, 'Not Found');
});

test('static serving: /health endpoint returns JSON status', async () => {
  const res = await app.request('/health');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});
