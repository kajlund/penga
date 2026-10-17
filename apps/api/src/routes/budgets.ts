import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  budgets,
  budgetSettings,
  accounts,
  splits,
  transactions,
} from '../db/index.js';
import { monthlyBudgetReport } from '@penga/shared';
import { lockLedgerHistory } from '../domain/ledger-history.js';
import { validOpeningDate } from '../domain/opening-balances.js';

export const budgetsRoute = new Hono();
budgetsRoute.onError((error, c) => {
  console.error('Budget operation failed', error);
  return c.json(
    { error: 'Could not load or save the budget. Please try again.' },
    500,
  );
});

/** Browser sends its local calendar date; direct API requests default to Helsinki. */
budgetsRoute.get('/', async (c) => {
  const today =
    c.req.query('today') ??
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Helsinki',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const year = Number(c.req.query('year') ?? today.slice(0, 4));
  const month = Number(c.req.query('month') ?? today.slice(5, 7));
  if (
    !validOpeningDate(today) ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    return c.json({ error: 'Choose a valid calendar month and date.' }, 400);
  const data = await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const accountRows = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.type, 'EXPENSE'));
    const budgetRows = await tx.select().from(budgets);
    const [settings] = await tx
      .select()
      .from(budgetSettings)
      .where(eq(budgetSettings.id, 1));
    const entries = await tx
      .select({
        accountId: splits.accountId,
        amountCents: splits.amountCents,
        transactionDate: transactions.transactionDate,
        voidedAt: transactions.voidedAt,
        payee: transactions.payee,
        note: transactions.note,
      })
      .from(splits)
      .innerJoin(transactions, eq(transactions.id, splits.transactionId))
      .innerJoin(accounts, eq(accounts.id, splits.accountId))
      .where(eq(accounts.type, 'EXPENSE'));
    return monthlyBudgetReport(
      accountRows,
      budgetRows,
      entries,
      year,
      month,
      today,
      settings?.trackingStartDate ?? null,
    );
  });
  return c.json({ data });
});

/** Explicit coverage assertion, not an inference from the first recorded expense. */
budgetsRoute.post('/coverage', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }
  if (
    !body ||
    (body.trackingStartDate !== null &&
      !validOpeningDate(body.trackingStartDate))
  )
    return c.json(
      { error: 'Choose a tracking start date, or clear coverage.' },
      400,
    );
  await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    await tx
      .insert(budgetSettings)
      .values({ id: 1, trackingStartDate: body.trackingStartDate })
      .onConflictDoUpdate({
        target: budgetSettings.id,
        set: { trackingStartDate: body.trackingStartDate },
      });
  });
  return c.json({ success: true });
});

/** Nullable targets preserve notes when returning an account to No budget. */
budgetsRoute.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }
  if (
    !body ||
    typeof body.accountId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(body.accountId)
  )
    return c.json({ error: 'Choose an expense account.' }, 400);
  const {
    accountId,
    targetAmountCents,
    periodYear = null,
    periodMonth = null,
    notes,
  } = body;
  if (
    targetAmountCents !== undefined &&
    targetAmountCents !== null &&
    (!Number.isInteger(targetAmountCents) ||
      targetAmountCents < 0 ||
      targetAmountCents > 2147483647)
  )
    return c.json(
      {
        error:
          'Target must be a non-negative integer amount of cents, or null for No budget.',
      },
      400,
    );
  if (
    (periodYear !== null || periodMonth !== null) &&
    (!Number.isInteger(periodYear) ||
      periodYear < 1900 ||
      periodYear > 9999 ||
      !Number.isInteger(periodMonth) ||
      periodMonth < 1 ||
      periodMonth > 12)
  )
    return c.json(
      {
        error:
          'Provide both a valid year and month for an existing period target.',
      },
      400,
    );
  if (notes !== undefined && notes !== null && typeof notes !== 'string')
    return c.json({ error: 'Notes must be text.' }, 400);
  return db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const [account] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) return c.json({ error: 'Account not found' }, 404);
    if (account.type !== 'EXPENSE')
      return c.json(
        { error: 'Only expense accounts can have budget targets.' },
        400,
      );
    const [child] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(eq(accounts.parentId, accountId), eq(accounts.type, 'EXPENSE')),
      )
      .limit(1);
    if (child && targetAmountCents != null)
      return c.json(
        {
          error:
            'Group targets are calculated from descendants. The existing group target is preserved but excluded; edit notes or remove the legacy target.',
        },
        409,
      );
    const period =
      periodYear === null
        ? and(isNull(budgets.periodYear), isNull(budgets.periodMonth))
        : and(
            eq(budgets.periodYear, periodYear),
            eq(budgets.periodMonth, periodMonth),
          );
    const [existing] = await tx
      .select()
      .from(budgets)
      .where(and(eq(budgets.accountId, accountId), period));
    const values = {
      targetAmountCents:
        targetAmountCents === undefined
          ? (existing?.targetAmountCents ?? null)
          : targetAmountCents,
      notes:
        notes === undefined
          ? (existing?.notes ?? null)
          : typeof notes === 'string'
            ? notes.trim()
            : null,
      updatedAt: new Date(),
    };
    const [data] = existing
      ? await tx
          .update(budgets)
          .set(values)
          .where(eq(budgets.id, existing.id))
          .returning()
      : await tx
          .insert(budgets)
          .values({ ...values, accountId, periodYear, periodMonth })
          .returning();
    return c.json({ success: true, data });
  });
});

/** Explicit legacy deletion endpoint retained for API compatibility. UI removal keeps notes. */
budgetsRoute.delete('/:id', async (c) => {
  return db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const [existing] = await tx
      .delete(budgets)
      .where(eq(budgets.id, c.req.param('id')))
      .returning();
    return existing
      ? c.json({ success: true, deletedId: existing.id })
      : c.json({ error: 'Budget not found' }, 404);
  });
});
