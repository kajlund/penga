import { test, afterEach } from 'node:test';
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
  'HTMLDetailsElement',
  'Element',
  'Node',
  'Document',
  'DocumentFragment',
  'ShadowRoot',
  'CSSStyleSheet',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
]) {
  globalThis[key] = key === 'window' ? window : window[key];
}

const generated = new URL('./.compiled/', import.meta.url);
await fs.mkdir(generated, { recursive: true });

for (const file of ['calm-styles', 'penga-reconciliation']) {
  const source = await fs.readFile(
    new URL(`../src/components/${file}.ts`, import.meta.url),
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
  await fs.writeFile(new URL(`${file}.js`, generated), result.outputText);
}

await import('./.compiled/penga-reconciliation.js');

let component;
afterEach(() => {
  component?.remove();
});
test('selection survives display filters and completion reflects exact signed money', async () => {
  const entry = {
    id: 'entry',
    date: '2026-01-05',
    payee: 'Purchase',
    amountCents: -100,
    isCleared: false,
    reconciliationId: null,
    voidedAt: null,
  };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ data: [{ id: 'bank', name: 'Bank', type: 'ASSET' }] }),
    );
  component = document.createElement('penga-reconciliation');
  document.body.append(component);
  await new Promise((r) => setTimeout(r, 0));
  component.accountId = 'bank';
  component.snapshot = { entries: [entry], history: [], openings: [] };
  component.start = '2026-01-01';
  component.closing = '2026-01-31';
  component.balance = '-1.00';
  await component.updateComplete;
  const complete = () =>
    [...component.shadowRoot.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Complete reconciliation'),
    );
  assert.equal(complete().disabled, true);
  component.shadowRoot.querySelector('input[type=checkbox]').click();
  await component.updateComplete;
  assert.equal(complete().disabled, false);
  component.from = '2026-01-06';
  await component.updateComplete;
  assert.equal(component.selected.size, 1);
  assert.match(component.shadowRoot.textContent, /hidden by filters:\s+1/);
  assert.equal(complete().disabled, false);
  component.closing = '2026-01-04';
  await component.updateComplete;
  assert.equal(complete().disabled, true);
  assert.equal(component.selected.size, 1);
  component.closing = '2026-01-31';
  component.balance = '-0.99';
  await component.updateComplete;
  assert.equal(complete().disabled, true);
  component.balance = '-0.01';
  assert.equal(component.cents(), -1);
});
