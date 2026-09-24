import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { accountsRoute } from '../dist/routes/accounts.js';
import { transactionsRoute } from '../dist/routes/transactions.js';
import { reportsRoute } from '../dist/routes/reports.js';
import { db, queryClient, accounts, splits, transactions } from '../dist/db/index.js';
import { getSettlementPresentation } from '@penga/shared';

after(async () => queryClient.end());

const postAccount = payload => accountsRoute.request('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const patchAccount = (id, payload) => accountsRoute.request(`/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const getAccount = id => accountsRoute.request(`/${id}`);

const postTx = payload => transactionsRoute.request('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const getReport = query => reportsRoute.request(query ? `/${query}` : '/');

test('settlement domain presentation helper', () => {
  assert.deepEqual(getSettlementPresentation(8000), {
    direction: 'owed-to-user',
    amountCents: 8000,
    label: 'Owed to you €80.00'
  });
  assert.deepEqual(getSettlementPresentation(-2000), {
    direction: 'owed-by-user',
    amountCents: 2000,
    label: 'You owe €20.00'
  });
  assert.deepEqual(getSettlementPresentation(0), {
    direction: 'settled',
    amountCents: 0,
    label: 'Settled'
  });
});

test('settlement account lifecycle, opening balance, transactions, and reports', {
  skip: process.env.PENGA_DATABASE_TESTS !== '1'
}, async t => {
  const createdAccountIds = [];
  const createdTxIds = [];

  const cleanup = async () => {
    if (createdAccountIds.length === 0) return;
    try {
      const relatedSplits = await db
        .select({ transactionId: splits.transactionId })
        .from(splits)
        .where(inArray(splits.accountId, createdAccountIds));

      const allTxIds = [...new Set([...createdTxIds, ...relatedSplits.map(s => s.transactionId)])];
      if (allTxIds.length > 0) {
        await db.delete(transactions).where(inArray(transactions.id, allTxIds));
      }
      await db.delete(accounts).where(inArray(accounts.id, createdAccountIds));
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  try {
    // 1. Create base accounts
    const createBase = async (name, type) => {
      const res = await postAccount({ name: `${name} ${crypto.randomUUID()}`, type });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdAccountIds.push(data.id);
      return data;
    };

    const bank = await createBase('Main Bank', 'ASSET');
    const cash = await createBase('Cash Wallet', 'ASSET');
    const dining = await createBase('Dining', 'EXPENSE');
    const groceries = await createBase('Groceries', 'EXPENSE');

    let girlfriend;

    await t.test('1. create and retrieve settlement account', async () => {
      const res = await postAccount({
        name: `Girlfriend — shared expenses ${crypto.randomUUID()}`,
        type: 'SETTLEMENT',
        description: 'Mutual tracking of shared spending'
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      assert.equal(data.type, 'SETTLEMENT');
      girlfriend = data;
      createdAccountIds.push(girlfriend.id);

      const fetchRes = await getAccount(girlfriend.id);
      assert.equal(fetchRes.status, 200);
      const fetched = await fetchRes.json();
      assert.equal(fetched.data.type, 'SETTLEMENT');
    });

    await t.test('2. opening balance creates equity splits and does not touch income or expense', async () => {
      const res = await postAccount({
        name: `Roommate ${crypto.randomUUID()}`,
        type: 'SETTLEMENT',
        initialBalanceCents: 5000 // Roommate owes user €50
      });
      assert.equal(res.status, 201);
      const { data: roommate } = await res.json();
      createdAccountIds.push(roommate.id);

      // Check splits created for this account
      const splitRows = await db.select().from(splits).where(inArray(splits.accountId, [roommate.id]));
      assert.equal(splitRows.length, 1);
      assert.equal(splitRows[0].amountCents, 5000);
      createdTxIds.push(splitRows[0].transactionId);

      // Find the transaction and the other split
      const otherSplits = await db.select().from(splits).where(inArray(splits.transactionId, [splitRows[0].transactionId]));
      assert.equal(otherSplits.length, 2);
      const equitySplit = otherSplits.find(s => s.accountId !== roommate.id);
      assert.equal(equitySplit.amountCents, -5000);

      // Verify equity split account is EQUITY type, NOT INCOME or EXPENSE
      const [eqAcc] = await db.select().from(accounts).where(inArray(accounts.id, [equitySplit.accountId]));
      assert.equal(eqAcc.type, 'EQUITY');
    });

    await t.test('3. user pays €80 entirely for the other person', async () => {
      // Bank decreases by €80 (-8000), Girlfriend balance increases by €80 (+8000)
      const res = await postTx({
        transactionDate: '2026-09-02',
        payee: 'Concert tickets',
        splits: [
          { accountId: bank.id, amountCents: -8000 },
          { accountId: girlfriend.id, amountCents: 8000 }
        ]
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdTxIds.push(data.id);
    });

    await t.test('4. prevent changing account type to/from SETTLEMENT when transactions exist', async () => {
      // Attempt to change type of girlfriend to ASSET
      const patchRes = await patchAccount(girlfriend.id, { type: 'ASSET' });
      assert.equal(patchRes.status, 400);
      const errBody = await patchRes.json();
      assert.match(errBody.error, /existing transactions/);
    });

    await t.test('5. €100 expense split into €60 personal expense and €40 Settlement', async () => {
      // Bank decreases by €100 (-10000), Dining increases by €60 (+6000), Girlfriend increases by €40 (+4000)
      const res = await postTx({
        transactionDate: '2026-09-03',
        payee: 'Fancy Dinner',
        splits: [
          { accountId: bank.id, amountCents: -10000 },
          { accountId: dining.id, amountCents: 6000 },
          { accountId: girlfriend.id, amountCents: 4000 }
        ]
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdTxIds.push(data.id);
    });

    await t.test('6. the other person pays a €30 expense for the user', async () => {
      // Girlfriend pays €30 for Groceries: Girlfriend -3000, Groceries +3000
      const res = await postTx({
        transactionDate: '2026-09-04',
        payee: 'Supermarket',
        splits: [
          { accountId: girlfriend.id, amountCents: -3000 },
          { accountId: groceries.id, amountCents: 3000 }
        ]
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdTxIds.push(data.id);
    });

    await t.test('7. settlement repayment: transfer from settlement to cash produces negative balance (you owe)', async () => {
      // Current girlfriend balance = 8000 + 4000 - 3000 = 9000 (€90 owed to user)
      // Girlfriend repays €110 in cash: Girlfriend -11000, Cash +11000
      // New girlfriend balance = 9000 - 11000 = -2000 (-€20, user owes counterparty)
      const res = await postTx({
        transactionDate: '2026-09-05',
        payee: 'Cash repayment',
        splits: [
          { accountId: girlfriend.id, amountCents: -11000 },
          { accountId: cash.id, amountCents: 11000 }
        ]
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdTxIds.push(data.id);
    });

    await t.test('8. report balance sheet, net worth, and presentation classification', async () => {
      const reportRes = await getReport('summary');
      assert.equal(reportRes.status, 200);
      const { data: rep } = await reportRes.json();

      // Find girlfriend in accountBalances
      const gfSummary = rep.accountBalances.find(a => a.id === girlfriend.id);
      assert.ok(gfSummary);
      assert.equal(gfSummary.type, 'SETTLEMENT');
      assert.equal(gfSummary.balanceCents, -2000);
      assert.deepEqual(gfSummary.settlementPresentation, {
        direction: 'owed-by-user',
        amountCents: 2000,
        label: 'You owe €20.00'
      });

      // Settlement account with -2000 should contribute to totalSettlementLiabilitiesCents
      assert.ok(rep.totalSettlementLiabilitiesCents >= 2000);

      // Verify repayments did not inflate income or expenses:
      // Dining should be exactly 6000 and Groceries 3000
      const diningBal = rep.accountBalances.find(a => a.id === dining.id)?.balanceCents;
      assert.equal(diningBal, 6000);
      const groceriesBal = rep.accountBalances.find(a => a.id === groceries.id)?.balanceCents;
      assert.equal(groceriesBal, 3000);
    });

    await t.test('9. historical balance sheet classifies based on report date', async () => {
      // On 2026-09-03, balance was +8000 + 4000 = +12000 (positive -> asset)
      const histRes = await getReport('summary?asOf=2026-09-03');
      assert.equal(histRes.status, 200);
      const { data: histRep } = await histRes.json();
      const gfHist = histRep.accountBalances.find(a => a.id === girlfriend.id);
      assert.equal(gfHist.balanceCents, 12000);
      assert.equal(gfHist.settlementPresentation.direction, 'owed-to-user');
      assert.ok(histRep.totalSettlementAssetsCents >= 12000);
    });

    await t.test('10. settlement transfer payment of liability from bank settles account', async () => {
      // User owes girlfriend €20 (-2000). User transfers €20 from bank to girlfriend:
      // Bank -2000, Girlfriend +2000 -> balance becomes 0
      const res = await postTx({
        transactionDate: '2026-09-06',
        payee: 'Settling up',
        splits: [
          { accountId: bank.id, amountCents: -2000 },
          { accountId: girlfriend.id, amountCents: 2000 }
        ]
      });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdTxIds.push(data.id);

      const reportRes = await getReport('summary');
      assert.equal(reportRes.status, 200);
      const { data: rep } = await reportRes.json();
      const gfSummary = rep.accountBalances.find(a => a.id === girlfriend.id);
      assert.equal(gfSummary.balanceCents, 0);
      assert.deepEqual(gfSummary.settlementPresentation, {
        direction: 'settled',
        amountCents: 0,
        label: 'Settled'
      });
    });

  } finally {
    await cleanup();
  }
});
