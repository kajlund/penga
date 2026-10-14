import { Hono } from 'hono';
import { and, eq, desc, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  splits,
  transactions,
  reconciliations,
  reconciliationEntries,
} from '../db/index.js';
import { lockLedgerHistory } from '../domain/ledger-history.js';
import {
  validOpeningDate,
  isOpeningBalance,
} from '../domain/opening-balances.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function reconciliationState(tx: Tx, accountId: string) {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account || !['ASSET', 'LIABILITY', 'SETTLEMENT'].includes(account.type))
    throw new Error('Choose an asset, liability or settlement account.');
  const history = await tx
    .select()
    .from(reconciliations)
    .where(eq(reconciliations.accountId, accountId))
    .orderBy(
      desc(reconciliations.closingDate),
      desc(reconciliations.completedAt),
    );
  const entries = await tx
    .select({
      id: splits.id,
      transactionId: transactions.id,
      amountCents: splits.amountCents,
      date: transactions.transactionDate,
      payee: transactions.payee,
      note: transactions.note,
      isCleared: transactions.isCleared,
      voidedAt: transactions.voidedAt,
      reconciliationId: reconciliationEntries.reconciliationId,
    })
    .from(splits)
    .innerJoin(transactions, eq(splits.transactionId, transactions.id))
    .leftJoin(
      reconciliationEntries,
      eq(reconciliationEntries.splitId, splits.id),
    )
    .where(eq(splits.accountId, accountId));
  const latest = history.find((r) => !r.undoneAt);
  const openings = entries.filter((e) => !e.voidedAt && isOpeningBalance(e));
  return { account, history, entries, latest, openings };
}
export const reconciliationsRoute = new Hono();
reconciliationsRoute.onError((error, c) =>
  c.json({ error: error.message }, 409),
);
reconciliationsRoute.get('/:accountId', async (c) => {
  return c.json({
    data: await db.transaction(async (tx) => {
      await lockLedgerHistory(tx);
      return reconciliationState(tx, c.req.param('accountId'));
    }),
  });
});
reconciliationsRoute.post('/:accountId', async (c) => {
  const body = await c.req.json();
  if (
    !validOpeningDate(body.startDate) ||
    !validOpeningDate(body.closingDate) ||
    body.startDate > body.closingDate ||
    !Number.isSafeInteger(body.closingBalanceCents) ||
    !Array.isArray(body.entryIds) ||
    body.entryIds.some((id: unknown) => typeof id !== 'string') ||
    new Set(body.entryIds).size !== body.entryIds.length
  )
    return c.json(
      {
        error:
          'Provide valid statement dates, an exact balance and unique entry IDs.',
      },
      400,
    );
  const data = await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const state = await reconciliationState(tx, c.req.param('accountId'));
    if (state.latest && body.startDate <= state.latest.closingDate)
      throw new Error(
        'Statement periods must follow the latest completed statement.',
      );
    const openings = state.latest
      ? []
      : state.openings.filter((e) => e.date <= body.closingDate);
    if (openings.some((e) => e.date > body.startDate))
      throw new Error(
        'The opening balance must be dated on or before the statement start.',
      );
    const starting =
      state.latest?.closingBalanceCents ??
      openings.reduce((sum, e) => sum + e.amountCents, 0);
    const selected = state.entries.filter((e) => body.entryIds.includes(e.id));
    if (
      selected.length !== body.entryIds.length ||
      selected.some(
        (e) =>
          e.voidedAt ||
          e.reconciliationId ||
          e.date > body.closingDate ||
          isOpeningBalance(e),
      )
    )
      throw new Error(
        'Selected entries changed or are no longer eligible. Refresh and review the selection.',
      );
    const closing =
      starting + selected.reduce((sum, e) => sum + e.amountCents, 0);
    if (!Number.isSafeInteger(closing) || closing !== body.closingBalanceCents)
      throw new Error(
        'The difference must be exactly zero to complete reconciliation.',
      );
    const [record] = await tx
      .insert(reconciliations)
      .values({
        accountId: state.account.id,
        startDate: body.startDate,
        closingDate: body.closingDate,
        startingBalanceCents: starting,
        closingBalanceCents: closing,
      })
      .returning();
    const members = [...selected, ...openings];
    if (members.length) {
      await tx
        .insert(reconciliationEntries)
        .values(
          members.map((e) => ({ splitId: e.id, reconciliationId: record.id })),
        );
      for (const e of members)
        await tx
          .update(transactions)
          .set({ isCleared: true })
          .where(eq(transactions.id, e.transactionId));
    }
    return record;
  });
  return c.json({ data }, 201);
});
reconciliationsRoute.post('/:accountId/:id/undo', async (c) => {
  const body = await c.req.json();
  if (body.confirmation !== 'UNDO')
    return c.json({ error: 'Confirm undo first.' }, 400);
  await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const state = await reconciliationState(tx, c.req.param('accountId'));
    if (!state.latest || state.latest.id !== c.req.param('id'))
      throw new Error(
        'Only the latest completed reconciliation can be undone.',
      );
    await tx
      .delete(reconciliationEntries)
      .where(eq(reconciliationEntries.reconciliationId, state.latest.id));
    await tx
      .update(reconciliations)
      .set({ undoneAt: new Date() })
      .where(
        and(eq(reconciliations.id, state.latest.id), sql`undone_at is null`),
      );
  });
  return c.json({ success: true });
});
