import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { inArray, eq } from 'drizzle-orm';
import { accountsRoute } from '../dist/routes/accounts.js';
import { transactionsRoute } from '../dist/routes/transactions.js';
import { reportsRoute } from '../dist/routes/reports.js';
import { db, queryClient, accounts, splits, transactions } from '../dist/db/index.js';

after(async () => queryClient.end());

const postAccount = payload => accountsRoute.request('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const postTx = payload => transactionsRoute.request('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const patchTx = (id, payload) => transactionsRoute.request(`/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const deleteTx = id => transactionsRoute.request(`/${id}`, {
  method: 'DELETE'
});

const voidTx = (id, payload = {}) => transactionsRoute.request(`/${id}/void`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const getReport = query => reportsRoute.request(query ? `/${query}` : '/');

test('transaction deletion and reversal/voiding lifecycle (database tests)', {
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
    const createBaseAccount = async (name, type) => {
      const res = await postAccount({ name: `${name} ${crypto.randomUUID()}`, type });
      assert.equal(res.status, 201);
      const { data } = await res.json();
      createdAccountIds.push(data.id);
      return data;
    };

    const bank = await createBaseAccount('Checking', 'ASSET');
    const cash = await createBaseAccount('Cash Wallet', 'ASSET');
    const dining = await createBaseAccount('Dining', 'EXPENSE');
    const groceries = await createBaseAccount('Groceries', 'EXPENSE');
    const salary = await createBaseAccount('Salary', 'INCOME');
    const settlement = await createBaseAccount('Girlfriend Shared', 'SETTLEMENT');

    await t.test('1. deleting an unclear expense removes its complete ledger effect', async () => {
      const res = await postTx({
        transactionDate: '2026-09-01',
        payee: 'Lunch Cafe',
        isCleared: false,
        splits: [
          { accountId: bank.id, amountCents: -2500 },
          { accountId: dining.id, amountCents: 2500 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      // Verify balance before deletion
      let rep = (await (await getReport('summary')).json()).data;
      assert.equal(rep.accountBalances.find(a => a.id === bank.id)?.balanceCents, -2500);
      assert.equal(rep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 2500);

      // Delete unclear transaction
      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 200);
      const delBody = await delRes.json();
      assert.equal(delBody.success, true);
      assert.equal(delBody.deletedId, tx.id);

      // Verify transaction and splits are completely removed
      const [found] = await db.select().from(transactions).where(eq(transactions.id, tx.id));
      assert.equal(found, undefined);
      const splitRows = await db.select().from(splits).where(eq(splits.transactionId, tx.id));
      assert.equal(splitRows.length, 0);

      // Verify account balances restored
      rep = (await (await getReport('summary')).json()).data;
      assert.equal(rep.accountBalances.find(a => a.id === bank.id)?.balanceCents, 0);
      assert.equal(rep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 0);
    });

    await t.test('2. deleting an unclear income removes its complete ledger effect', async () => {
      const res = await postTx({
        transactionDate: '2026-09-02',
        payee: 'Freelance Payer',
        isCleared: false,
        splits: [
          { accountId: salary.id, amountCents: -5000 },
          { accountId: bank.id, amountCents: 5000 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      // Delete
      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 200);

      const rep = (await (await getReport('summary')).json()).data;
      assert.equal(rep.accountBalances.find(a => a.id === bank.id)?.balanceCents, 0);
      assert.equal(rep.accountBalances.find(a => a.id === salary.id)?.balanceCents, 0);
    });

    await t.test('3. deleting an unclear transfer restores both account balances', async () => {
      const res = await postTx({
        transactionDate: '2026-09-03',
        payee: 'ATM Withdrawal',
        isCleared: false,
        splits: [
          { accountId: bank.id, amountCents: -6000 },
          { accountId: cash.id, amountCents: 6000 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 200);

      const rep = (await (await getReport('summary')).json()).data;
      assert.equal(rep.accountBalances.find(a => a.id === bank.id)?.balanceCents, 0);
      assert.equal(rep.accountBalances.find(a => a.id === cash.id)?.balanceCents, 0);
    });

    await t.test('4. deleting a split transaction removes all ledger lines atomically', async () => {
      const res = await postTx({
        transactionDate: '2026-09-04',
        payee: 'Department Store',
        isCleared: false,
        splits: [
          { accountId: bank.id, amountCents: -10000 },
          { accountId: dining.id, amountCents: 6000 },
          { accountId: groceries.id, amountCents: 4000 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 200);

      const splitCount = (await db.select().from(splits).where(eq(splits.transactionId, tx.id))).length;
      assert.equal(splitCount, 0);

      const rep = (await (await getReport('summary')).json()).data;
      assert.equal(rep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 0);
      assert.equal(rep.accountBalances.find(a => a.id === groceries.id)?.balanceCents, 0);
    });

    await t.test('5. deleting a transaction involving a Settlement account updates its signed balance correctly', async () => {
      const res = await postTx({
        transactionDate: '2026-09-05',
        payee: 'Concert Tickets',
        isCleared: false,
        splits: [
          { accountId: bank.id, amountCents: -8000 },
          { accountId: settlement.id, amountCents: 8000 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      let rep = (await (await getReport('summary')).json()).data;
      const settAccBefore = rep.accountBalances.find(a => a.id === settlement.id);
      assert.equal(settAccBefore.balanceCents, 8000);
      assert.equal(settAccBefore.settlementPresentation.direction, 'owed-to-user');

      // Delete
      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 200);

      rep = (await (await getReport('summary')).json()).data;
      const settAccAfter = rep.accountBalances.find(a => a.id === settlement.id);
      assert.equal(settAccAfter.balanceCents, 0);
      assert.equal(settAccAfter.settlementPresentation.direction, 'settled');
    });

    await t.test('6. cleared transactions cannot be physically deleted', async () => {
      const res = await postTx({
        transactionDate: '2026-09-06',
        payee: 'Cleared Purchase',
        isCleared: true,
        splits: [
          { accountId: bank.id, amountCents: -4000 },
          { accountId: groceries.id, amountCents: 4000 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: tx } = await res.json();
      createdTxIds.push(tx.id);

      const delRes = await deleteTx(tx.id);
      assert.equal(delRes.status, 409);
      const delBody = await delRes.json();
      assert.match(delBody.error, /Cleared transactions cannot be deleted/);

      // Verify transaction is intact
      const [found] = await db.select().from(transactions).where(eq(transactions.id, tx.id));
      assert.ok(found);
    });

    await t.test('7-10. voiding a cleared transaction creates equal and opposite reversal and zero net effect', async () => {
      // Create cleared transaction on 2026-09-10
      const res = await postTx({
        transactionDate: '2026-09-10',
        payee: 'Fancy Dinner',
        isCleared: true,
        splits: [
          { accountId: bank.id, amountCents: -7500 },
          { accountId: dining.id, amountCents: 7500 },
        ],
      });
      assert.equal(res.status, 201);
      const { data: original } = await res.json();
      createdTxIds.push(original.id);

      // Void the cleared transaction on 2026-09-15
      const voidRes = await voidTx(original.id, {
        date: '2026-09-15',
        reason: 'Paid twice by mistake',
      });
      assert.equal(voidRes.status, 201);
      const voidBody = await voidRes.json();
      assert.equal(voidBody.success, true);
      const { original: updatedOrig, reversal } = voidBody.data;
      createdTxIds.push(reversal.id);

      // 7. Verify links between original and reversal
      assert.ok(updatedOrig.voidedAt);
      assert.equal(updatedOrig.voidReason, 'Paid twice by mistake');
      assert.equal(updatedOrig.reversalTransactionId, reversal.id);
      assert.equal(reversal.reversesTransactionId, original.id);
      assert.equal(reversal.transactionDate, '2026-09-15');
      assert.equal(reversal.isCleared, true);

      // 8. The reversal contains equal and opposite ledger lines
      const revSplits = await db.select().from(splits).where(eq(splits.transactionId, reversal.id));
      assert.equal(revSplits.length, 2);
      const bankRevSplit = revSplits.find(s => s.accountId === bank.id);
      assert.equal(bankRevSplit.amountCents, 7500); // Opposite of -7500
      const diningRevSplit = revSplits.find(s => s.accountId === dining.id);
      assert.equal(diningRevSplit.amountCents, -7500); // Opposite of +7500

      // 9. Reversing again is rejected
      const secondVoidRes = await voidTx(original.id);
      assert.equal(secondVoidRes.status, 409);
      const secondVoidBody = await secondVoidRes.json();
      assert.match(secondVoidBody.error, /already voided/);

      // 10. Net accounting effect in current report is zero
      const rep = (await (await getReport('summary')).json()).data;
      // Note: Test 6 added groceries: 4000. Dining should be 0 net!
      assert.equal(rep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 0);
    });

    await t.test('11. voided originals and generated reversals cannot be edited or independently deleted', async () => {
      // Find voided original and reversal from previous test
      const [orig] = await db.select().from(transactions).where(eq(transactions.payee, 'Fancy Dinner'));
      assert.ok(orig?.voidedAt);
      const [reversal] = await db.select().from(transactions).where(eq(transactions.id, orig.reversalTransactionId));
      assert.ok(reversal?.reversesTransactionId);

      // Edit voided original
      const editOrigRes = await patchTx(orig.id, { note: 'Attempted edit' });
      assert.equal(editOrigRes.status, 409);
      assert.match((await editOrigRes.json()).error, /Cannot edit a voided transaction/);

      // Delete voided original
      const delOrigRes = await deleteTx(orig.id);
      assert.equal(delOrigRes.status, 409);
      assert.match((await delOrigRes.json()).error, /Cannot delete a voided transaction/);

      // Edit generated reversal
      const editRevRes = await patchTx(reversal.id, { note: 'Attempted reversal edit' });
      assert.equal(editRevRes.status, 409);
      assert.match((await editRevRes.json()).error, /Cannot edit an automatically generated reversal/);

      // Delete generated reversal
      const delRevRes = await deleteTx(reversal.id);
      assert.equal(delRevRes.status, 409);
      assert.match((await delRevRes.json()).error, /Cannot delete an automatically generated reversal/);

      // Void a generated reversal
      const voidRevRes = await voidTx(reversal.id);
      assert.equal(voidRevRes.status, 409);
      assert.match((await voidRevRes.json()).error, /Cannot void an automatically generated reversal/);

      // Cannot toggle cleared state on voided transaction
      const toggleRes = await patchTx(orig.id, { isCleared: false });
      assert.equal(toggleRes.status, 409);
    });

    await t.test('12. opening-balance transactions are protected against delete and void', async () => {
      const openAccRes = await postAccount({
        name: `Protected Acc ${crypto.randomUUID()}`,
        type: 'ASSET',
        initialBalanceCents: 10000,
      });
      assert.equal(openAccRes.status, 201);
      const { data: newAcc } = await openAccRes.json();
      createdAccountIds.push(newAcc.id);

      const [initSplit] = await db.select().from(splits).where(eq(splits.accountId, newAcc.id));
      assert.ok(initSplit);
      createdTxIds.push(initSplit.transactionId);

      // Attempt delete opening balance transaction
      const delRes = await deleteTx(initSplit.transactionId);
      assert.equal(delRes.status, 409);
      assert.match((await delRes.json()).error, /Opening balance transactions cannot be deleted directly/);

      // Attempt void opening balance transaction
      const voidRes = await voidTx(initSplit.transactionId);
      assert.equal(voidRes.status, 409);
      assert.match((await voidRes.json()).error, /Opening balance transactions cannot be voided directly/);
    });

    await t.test('13. historical reporting behaves correctly across original and reversal periods', async () => {
      // Historical report on 2026-09-12 (after original Fancy Dinner on 09-10, but before reversal on 09-15)
      const histRes = await getReport('summary?asOf=2026-09-12');
      assert.equal(histRes.status, 200);
      const histRep = (await histRes.json()).data;

      // On 2026-09-12, Dining expense was still active (+7500 cents)
      assert.equal(histRep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 7500);

      // Full report as of today includes both original and reversal, netting to 0
      const fullRes = await getReport('summary?asOf=2026-09-20');
      assert.equal(fullRes.status, 200);
      const fullRep = (await fullRes.json()).data;
      assert.equal(fullRep.accountBalances.find(a => a.id === dining.id)?.balanceCents, 0);
    });

    await t.test('14. delete and void failures roll back completely', async () => {
      // Create a cleared transaction
      const txRes = await postTx({
        transactionDate: '2026-09-21',
        payee: 'Rollback Test',
        isCleared: true,
        splits: [
          { accountId: bank.id, amountCents: -5000 },
          { accountId: dining.id, amountCents: 5000 },
        ],
      });
      assert.equal(txRes.status, 201);
      const { data: created } = await txRes.json();
      createdTxIds.push(created.id);

      // Attempt to delete cleared transaction -> must fail with 409
      const delFailRes = await deleteTx(created.id);
      assert.equal(delFailRes.status, 409);

      // Verify transaction and splits are still completely intact
      const [txStillExists] = await db.select().from(transactions).where(eq(transactions.id, created.id));
      assert.ok(txStillExists);
      const splitsStillExist = await db.select().from(splits).where(eq(splits.transactionId, created.id));
      assert.equal(splitsStillExist.length, 2);

      // Attempt to void with invalid date format -> must fail with 400
      const voidFailRes = await voidTx(created.id, { date: 'not-a-date' });
      assert.equal(voidFailRes.status, 400);

      // Verify transaction is not marked voided, and no reversal transaction was created
      const [txAfterVoidFail] = await db.select().from(transactions).where(eq(transactions.id, created.id));
      assert.equal(txAfterVoidFail.voidedAt, null);
      assert.equal(txAfterVoidFail.reversalTransactionId, null);

      const reversals = await db.select().from(transactions).where(eq(transactions.reversesTransactionId, created.id));
      assert.equal(reversals.length, 0);
    });

  } finally {
    await cleanup();
  }
});
