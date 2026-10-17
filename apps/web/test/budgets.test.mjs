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

const generated = new URL('./.compiled/budget-suite/', import.meta.url);
await fs.mkdir(generated, { recursive: true });

for (const file of ['icons', 'calm-styles', 'penga-budgets']) {
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

await import('./.compiled/budget-suite/penga-budgets.js');

const { monthlyBudgetReport } = await import('@penga/shared');
let component, requests;
const account = (id, parentId = null) => ({
  id,
  parentId,
  name: id,
  type: 'EXPENSE',
  icon: null,
  color: null,
});
const report = () =>
  monthlyBudgetReport(
    [account('Group'), account('Food', 'Group'), account('Travel', 'Group')],
    [
      {
        id: 'budget',
        accountId: 'Food',
        targetAmountCents: 1000,
        notes: 'Saved note',
      },
    ],
    [
      { accountId: 'Food', amountCents: 1200, transactionDate: '2026-10-01' },
      { accountId: 'Travel', amountCents: 400, transactionDate: '2026-10-01' },
    ],
    2026,
    10,
    '2026-10-14',
    null,
  );
const settle = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await component.updateComplete;
};
const button = (text) =>
  [...component.shadowRoot.querySelectorAll('button')].find(
    (b) => b.textContent.trim() === text,
  );
afterEach(() => component?.remove());
test('hierarchy displays EUR, partial coverage and bounded usage; collapse keeps totals', async () => {
  requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ data: report() }));
  };
  component = document.createElement('penga-budgets');
  document.body.append(component);
  await settle();
  assert.match(component.shadowRoot.textContent, /Partial coverage/);
  assert.match(component.shadowRoot.textContent, /120% used/);
  assert.match(component.shadowRoot.textContent, /Over by/);
  assert.match(component.shadowRoot.textContent, /Not enough history/);
  assert.match(component.shadowRoot.textContent, /EUR/);
  assert.ok(
    component.shadowRoot.textContent.includes(String.fromCharCode(0x20ac)),
  );
  assert.equal(
    component.shadowRoot.textContent.includes(String.fromCharCode(36)),
    false,
  );
  const fills = component.shadowRoot.querySelectorAll('.fill');
  assert.ok([...fills].every((e) => parseFloat(e.style.width) <= 100));
  const before = component.shadowRoot.querySelector('.summary').textContent;
  component.shadowRoot
    .querySelector('button[aria-label="Collapse Group"]')
    .click();
  await settle();
  assert.equal(component.shadowRoot.querySelectorAll('tbody tr').length, 1);
  assert.equal(
    component.shadowRoot.querySelector('.summary').textContent,
    before,
  );
  component.shadowRoot
    .querySelector('button[aria-label="Expand Group"]')
    .click();
  await settle();
  assert.equal(component.shadowRoot.querySelectorAll('tbody tr').length, 3);
});
test('target removal preserves note; recurring scope explicit; negative target rejected inline', async () => {
  requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(
      JSON.stringify(options ? { success: true } : { data: report() }),
    );
  };
  component = document.createElement('penga-budgets');
  document.body.append(component);
  await settle();
  component.shadowRoot
    .querySelector('button[aria-label="Edit Food target and note"]')
    .click();
  await settle();
  assert.match(
    component.shadowRoot.querySelector('.dialog').textContent,
    /every month/,
  );
  assert.equal(
    component.shadowRoot.querySelector('.dialog textarea').value,
    'Saved note',
  );
  component.modalTarget = '-1';
  await component.handleSaveBudget(new Event('submit'));
  await settle();
  assert.match(
    component.shadowRoot.querySelector('.dialog').textContent,
    /non-negative/,
  );
  assert.equal(requests.filter((r) => r.options).length, 0);
  button('Remove target, keep note').click();
  await settle();
  const saved = JSON.parse(requests.find((r) => r.options).options.body);
  assert.equal(saved.targetAmountCents, null);
  assert.equal(saved.notes, 'Saved note');
  assert.equal(saved.periodYear, null);
  assert.equal(saved.periodMonth, null);
});
test('no target versus zero is visible and month navigation retains calendar boundaries', async () => {
  requests = [];
  const data = report();
  data.items[0].children[0].targetCents = 0;
  data.items[0].children[0].usagePercent = null;
  globalThis.fetch = async (url) => {
    requests.push({ url });
    return new Response(JSON.stringify({ data }));
  };
  component = document.createElement('penga-budgets');
  document.body.append(component);
  await settle();
  assert.match(component.shadowRoot.textContent, /Above zero target/);
  assert.match(component.shadowRoot.textContent, /No budget/);
  assert.match(component.shadowRoot.textContent, /Unavailable/);
  component.currentYear = 2026;
  component.currentMonth = 1;
  component.navigate(-1);
  await settle();
  assert.match(requests.at(-1).url, /year=2025&month=12/);
  button('Current month').click();
  await settle();
  const now = new Date();
  assert.match(
    requests.at(-1).url,
    new RegExp('year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1)),
  );
});
