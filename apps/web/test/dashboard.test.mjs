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

const generated = new URL('./.compiled/', import.meta.url);
await fs.mkdir(generated, { recursive: true });

for (const file of ['icons', 'calm-styles', 'penga-dashboard']) {
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

await import('./.compiled/penga-dashboard.js');

let component;

const settle = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await component.updateComplete;
};

beforeEach(() => {
  component = document.createElement('penga-dashboard');
  document.body.append(component);
});

afterEach(() => {
  component?.remove();
});

test('recent transactions feed renders split icons and names without [object Object]', async () => {
  const tx = {
    id: 'tx-1',
    transactionDate: '2026-10-17',
    payee: 'Åsa',
    isCleared: true,
    sortOrder: 0,
    splits: [
      {
        id: 's1',
        transactionId: 'tx-1',
        accountId: 'acc-home',
        accountName: 'Home & Equipment',
        accountType: 'EXPENSE',
        accountIcon: 'house',
        amountCents: 7000,
      },
      {
        id: 's2',
        transactionId: 'tx-1',
        accountId: 'acc-cash',
        accountName: 'Kontanter',
        accountType: 'ASSET',
        accountIcon: 'banknote',
        amountCents: -7000,
      },
    ],
    tags: [],
  };

  component.summary = {
    totalAssetsCents: 100000,
    totalLiabilitiesCents: 0,
    netAvailableCents: 100000,
    totalIncomeCents: 50000,
    totalExpensesCents: 7000,
    savingsRatePercent: 86,
    accountBalances: [],
    liquidAccounts: [],
    recentTransactions: [tx],
    monthlyBudgetSpending: [],
    spendingByCategory: [],
  };

  await settle();

  const root = component.shadowRoot;
  assert.ok(root, 'ShadowRoot should exist');

  const summaryEl = root.querySelector('.tx-splits-summary');
  assert.ok(summaryEl, '.tx-splits-summary should exist in feed');

  // Verify that [object Object] is nowhere in textContent
  assert.equal(
    summaryEl.textContent.includes('[object Object]'),
    false,
    'Should not contain [object Object]',
  );

  // Verify account names exist
  assert.ok(summaryEl.textContent.includes('Home & Equipment'));
  assert.ok(summaryEl.textContent.includes('Kontanter'));
  assert.ok(summaryEl.textContent.includes('⇄'));

  // Verify split items and icons are rendered
  const splitItems = summaryEl.querySelectorAll('.tx-split-item');
  assert.equal(splitItems.length, 2, 'Should render 2 split items');

  const icons = summaryEl.querySelectorAll('svg');
  assert.equal(icons.length, 2, 'Should render 2 svg icons in split items');

  // Verify tooltip title is clean text
  assert.equal(
    summaryEl.getAttribute('title'),
    'Home & Equipment ⇄ Kontanter',
    'Tooltip title should be clean plain text without [object Object]',
  );
});
