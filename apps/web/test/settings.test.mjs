import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import ts from 'typescript';
import fs from 'node:fs/promises';

const window = new Window({ url: 'http://localhost' });
for (const key of [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'Element',
  'Node',
  'Document',
  'DocumentFragment',
  'ShadowRoot',
  'CSSStyleSheet',
  'Event',
  'CustomEvent',
]) {
  globalThis[key] = key === 'window' ? window : window[key];
}
// happy-dom does not implement the browser's native modal focus behavior.
window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const generated = new URL('./.compiled/', import.meta.url);
await fs.mkdir(generated, { recursive: true });
for (const file of ['icons', 'calm-styles']) {
  const source = await fs.readFile(
    new URL('../src/components/' + file + '.ts', import.meta.url),
    'utf8',
  );
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });
  await fs.writeFile(new URL(file + '.js', generated), result.outputText);
}
const source = await fs.readFile(
  new URL('../src/components/penga-settings.ts', import.meta.url),
  'utf8',
);
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    experimentalDecorators: true,
    useDefineForClassFields: false,
  },
});
await fs.writeFile(new URL('penga-settings.js', generated), result.outputText);
await import('./.compiled/penga-settings.js');
let component, requests, count, failure, pending, originalFetch;
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await component.updateComplete;
};
const root = () => component.shadowRoot;
const open = async () => {
  root().querySelector('#open-clear').click();
  await settle();
};
const typePhrase = async (phrase = 'DELETE ALL TRANSACTIONS') => {
  const input = root().querySelector('input');
  input.value = phrase;
  input.dispatchEvent(new window.Event('input'));
  await settle();
};
beforeEach(async () => {
  count = 8;
  failure = 0;
  pending = null;
  requests = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, ...options });
    if (options.method === 'POST') {
      if (pending) await pending;
      return new Response(
        JSON.stringify(
          failure
            ? {
                error:
                  'Transaction history changed. Refresh the summary and confirm again.',
                stale: failure === 409,
              }
            : { success: true, data: { transactions: count } },
        ),
        { status: failure || 200 },
      );
    }
    return new Response(
      JSON.stringify({
        data: {
          transactions: count,
          splits: count * 2,
          transactionTags: 0,
          revision: 'a'.repeat(64),
        },
      }),
    );
  };
  component = document.createElement('penga-settings');
  document.body.append(component);
  await settle();
});
afterEach(() => {
  component.remove();
  globalThis.fetch = originalFetch;
});

test('loads global count, requires exact phrase and supports cancellation', async () => {
  await open();
  assert.equal(requests[0].url, '/api/data-management/transactions/summary');
  assert.match(
    root().querySelector('dialog').textContent.replace(/\s+/g, ' '),
    /8 transactions across all dates and accounts/,
  );
  assert.ok(root().querySelector('dialog button.danger').disabled);
  await typePhrase('delete all transactions');
  assert.ok(root().querySelector('dialog button.danger').disabled);
  await typePhrase();
  assert.equal(root().querySelector('dialog button.danger').disabled, false);
  root().querySelector('dialog button').click();
  assert.equal(root().querySelector('dialog').open, false);
  assert.equal(requests.filter((r) => r.method === 'POST').length, 0);
});

test('processing blocks duplicate requests and Escape; success emits refresh event', async () => {
  let release;
  pending = new Promise((resolve) => {
    release = resolve;
  });
  let refreshes = 0;
  component.addEventListener('ledger-cleared', () => refreshes++);
  await open();
  await typePhrase();
  root().querySelector('dialog button.danger').click();
  await settle();
  assert.match(root().textContent.replace(/\s+/g, ' '), /Clearing/);
  assert.ok(
    [...root().querySelectorAll('dialog button')].every(
      (button) => button.disabled,
    ),
  );
  root()
    .querySelector('dialog')
    .dispatchEvent(new window.Event('cancel', { cancelable: true }));
  assert.equal(root().querySelector('dialog').open, true);
  root().querySelector('dialog button.danger').click();
  assert.equal(requests.filter((r) => r.method === 'POST').length, 1);
  release();
  await settle();
  assert.equal(refreshes, 1);
  assert.equal(root().querySelector('dialog').open, false);
  assert.match(
    root()
      .querySelector('section [role=status]')
      .textContent.replace(/\s+/g, ' '),
    /Cleared 8 transactions/,
  );
  assert.deepEqual(JSON.parse(requests.find((r) => r.method === 'POST').body), {
    confirmation: 'DELETE ALL TRANSACTIONS',
    revision: 'a'.repeat(64),
  });
});

test('stale confirmation requires refreshed summary and retyping', async () => {
  failure = 409;
  await open();
  await typePhrase();
  root().querySelector('dialog button.danger').click();
  await settle();
  assert.equal(root().querySelector('dialog').open, true);
  assert.match(
    root().querySelector('[role=alert]').textContent.replace(/\s+/g, ' '),
    /changed/,
  );
  assert.equal(root().querySelector('input').value, '');
  assert.ok(root().querySelector('dialog button.danger').disabled);
  [...root().querySelectorAll('button')]
    .find(
      (button) => button.textContent.replace(/\s+/g, ' ') === 'Refresh summary',
    )
    .click();
  await settle();
  assert.equal(requests.filter((r) => !r.method).length, 2);
  assert.ok(root().querySelector('dialog button.danger').disabled);
});

test('server error retains dialog and permits retry', async () => {
  failure = 500;
  await open();
  await typePhrase();
  root().querySelector('dialog button.danger').click();
  await settle();
  assert.equal(root().querySelector('dialog').open, true);
  assert.ok(root().querySelector('[role=alert]'));
  assert.equal(root().querySelector('dialog button.danger').disabled, false);
});

test('empty history provides safe empty state', async () => {
  count = 0;
  await open();
  assert.match(
    root().querySelector('dialog').textContent.replace(/\s+/g, ' '),
    /no transactions or transaction-owned records/,
  );
  assert.equal(root().querySelector('input'), null);
  assert.ok(root().querySelector('dialog button.danger').disabled);
});
