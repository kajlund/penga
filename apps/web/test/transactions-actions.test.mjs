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

for (const file of ['penga-transactions']) {
  const source = await fs.readFile(new URL(`../src/components/${file}.ts`, import.meta.url), 'utf8');
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

await import('./.compiled/penga-transactions.js');

let component, requests;

const settle = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await component.updateComplete;
};

const txUnclear = {
  id: 'tx-unclear',
  transactionDate: '2026-09-25',
  payee: 'Coffee Shop',
  note: 'Morning latte',
  isCleared: false,
  sortOrder: 0,
  splits: [
    { id: 's1', transactionId: 'tx-unclear', accountId: 'bank', accountName: 'Checking', amountCents: -550 },
    { id: 's2', transactionId: 'tx-unclear', accountId: 'dining', accountName: 'Dining', amountCents: 550 },
  ],
  tags: [],
};

const txCleared = {
  id: 'tx-cleared',
  transactionDate: '2026-09-20',
  payee: 'Groceries',
  note: 'Weekly essentials',
  isCleared: true,
  sortOrder: 0,
  splits: [
    { id: 's3', transactionId: 'tx-cleared', accountId: 'bank', accountName: 'Checking', amountCents: -4250 },
    { id: 's4', transactionId: 'tx-cleared', accountId: 'groceries', accountName: 'Groceries', amountCents: 4250 },
  ],
  tags: [],
};

const txOpeningBalance = {
  id: 'tx-open',
  transactionDate: '2026-01-01',
  payee: 'Opening Balance',
  note: 'Starting balance for Checking',
  isCleared: true,
  sortOrder: 0,
  splits: [
    { id: 's5', transactionId: 'tx-open', accountId: 'equity', accountName: 'Opening Balances', accountType: 'EQUITY', amountCents: -100000 },
    { id: 's6', transactionId: 'tx-open', accountId: 'bank', accountName: 'Checking', accountType: 'ASSET', amountCents: 100000 },
  ],
  tags: [],
};

const txVoided = {
  id: 'tx-voided',
  transactionDate: '2026-09-10',
  payee: 'Hardware Store',
  isCleared: true,
  sortOrder: 0,
  voidedAt: '2026-09-15T12:00:00Z',
  voidReason: 'Returned items',
  reversalTransactionId: 'tx-rev',
  splits: [
    { id: 's7', transactionId: 'tx-voided', accountId: 'bank', accountName: 'Checking', amountCents: -8900 },
    { id: 's8', transactionId: 'tx-voided', accountId: 'home', accountName: 'Home', amountCents: 8900 },
  ],
  tags: [],
};

const txReversal = {
  id: 'tx-rev',
  transactionDate: '2026-09-15',
  payee: 'Reversal of: Hardware Store',
  isCleared: true,
  sortOrder: 0,
  reversesTransactionId: 'tx-voided',
  splits: [
    { id: 's9', transactionId: 'tx-rev', accountId: 'bank', accountName: 'Checking', amountCents: 8900 },
    { id: 's10', transactionId: 'tx-rev', accountId: 'home', accountName: 'Home', amountCents: -8900 },
  ],
  tags: [],
};

beforeEach(async () => {
  requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({
      url,
      method: options?.method || 'GET',
      body: options?.body ? JSON.parse(options.body) : undefined,
    });
    if (url.startsWith('/api/transactions')) {
      return {
        ok: true,
        json: async () => ({
          data: [txUnclear, txCleared, txOpeningBalance, txVoided, txReversal],
        }),
      };
    }
    return { ok: true, json: async () => ({ data: [] }) };
  };

  component = document.createElement('penga-transactions');
  document.body.append(component);
  await component.fetchTransactions();
  await settle();
});

afterEach(() => {
  component.remove();
});

test('renders status badges for voided and reversal transactions', async () => {
  const root = component.shadowRoot;
  const badges = [...root.querySelectorAll('.tx-status-badge')].map((b) => b.textContent.trim());
  assert.ok(badges.some((b) => b.includes('Voided')));
  assert.ok(badges.some((b) => b.includes('Reversal')));

  // Counterpart navigation links
  const links = [...root.querySelectorAll('.tx-void-meta-row .btn-link')];
  assert.ok(links.some((l) => l.textContent.includes('View reversal')));
  assert.ok(links.some((l) => l.textContent.includes('View original')));
});

test('unclear transaction row shows Delete action in dropdown', async () => {
  const root = component.shadowRoot;
  component.openMenuTxId = 'tx-unclear';
  await settle();

  const menu = root.querySelector('.actions-menu');
  assert.ok(menu, 'Menu should be open');
  const deleteBtn = [...menu.querySelectorAll('.actions-menu-item.danger')].find((b) =>
    b.textContent.includes('Delete Transaction')
  );
  assert.ok(deleteBtn, 'Delete button should be present for unclear transaction');
});

test('cleared transaction row shows Reverse/Void action in dropdown', async () => {
  const root = component.shadowRoot;
  component.openMenuTxId = 'tx-cleared';
  await settle();

  const menu = root.querySelector('.actions-menu');
  assert.ok(menu, 'Menu should be open');
  const voidBtn = [...menu.querySelectorAll('.actions-menu-item.warning')].find((b) =>
    b.textContent.includes('Reverse / Void')
  );
  assert.ok(voidBtn, 'Reverse button should be present for cleared transaction');
  const deleteBtn = [...menu.querySelectorAll('.actions-menu-item.danger')].find((b) =>
    b.textContent.includes('Delete Transaction')
  );
  assert.equal(deleteBtn, undefined, 'Delete button should NOT be present for cleared transaction');
});

test('opening balance transaction shows locked disabled action with explanation', async () => {
  const root = component.shadowRoot;
  component.openMenuTxId = 'tx-open';
  await settle();

  const menu = root.querySelector('.actions-menu');
  assert.ok(menu, 'Menu should be open');
  const disabledItem = [...menu.querySelectorAll('.actions-menu-item[disabled]')].find((b) =>
    b.textContent.includes('Protected Opening Balance')
  );
  assert.ok(disabledItem, 'Disabled item should be present');
  assert.match(disabledItem.getAttribute('title') || '', /Opening balance transactions are protected/);
});

test('delete dialog opens with transaction details and issues DELETE request upon confirm', async () => {
  const root = component.shadowRoot;
  component.openDeleteModal(txUnclear);
  await settle();

  const modal = root.querySelector('.modal-backdrop');
  assert.ok(modal, 'Modal backdrop should exist');
  assert.ok(modal.textContent.includes('Delete transaction?'));
  assert.ok(modal.textContent.includes('Coffee Shop'));

  // Confirm delete
  const confirmBtn = [...modal.querySelectorAll('button.btn-danger')].find((b) =>
    b.textContent.includes('Delete transaction')
  );
  assert.ok(confirmBtn);
  confirmBtn.click();
  await settle();

  const delReq = requests.find((r) => r.method === 'DELETE');
  assert.ok(delReq, 'DELETE request was issued');
  assert.equal(delReq.url, '/api/transactions/tx-unclear');

  // Verify modal is closed and backdrop removed
  assert.equal(component.deleteModalTx, null, 'deleteModalTx should be reset to null');
  assert.equal(root.querySelector('.modal-backdrop'), null, 'Modal backdrop should be removed from DOM');
});

test('void dialog opens and issues POST void request with reason and date upon confirm', async () => {
  const root = component.shadowRoot;
  component.openVoidModal(txCleared);
  await settle();

  const modal = root.querySelector('.modal-backdrop');
  assert.ok(modal, 'Modal backdrop should exist');
  assert.ok(modal.textContent.includes('Reverse cleared transaction?'));

  const reasonInput = modal.querySelector('#void-reason');
  assert.ok(reasonInput);
  reasonInput.value = 'Entered twice by mistake';
  reasonInput.dispatchEvent(new Event('input', { bubbles: true }));

  const dateInput = modal.querySelector('#reversal-date');
  assert.ok(dateInput);
  dateInput.value = '2026-09-25';
  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();

  const confirmBtn = [...modal.querySelectorAll('button.btn-warning-action')].find((b) =>
    b.textContent.includes('Reverse transaction')
  );
  assert.ok(confirmBtn);
  confirmBtn.click();
  await settle();

  const voidReq = requests.find((r) => r.method === 'POST' && r.url.endsWith('/void'));
  assert.ok(voidReq, 'POST /void request was issued');
  assert.equal(voidReq.url, '/api/transactions/tx-cleared/void');
  assert.equal(voidReq.body.reason, 'Entered twice by mistake');
  assert.equal(voidReq.body.date, '2026-09-25');

  // Verify modal is closed and backdrop removed
  assert.equal(component.voidModalTx, null, 'voidModalTx should be reset to null');
  assert.equal(root.querySelector('.modal-backdrop'), null, 'Modal backdrop should be removed from DOM');
});
