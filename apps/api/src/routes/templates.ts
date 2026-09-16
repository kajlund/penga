import { Hono } from 'hono';
import { eq, asc, inArray } from 'drizzle-orm';
import { db, transactionTemplates, templateSplits, templateTags, accounts, tags } from '../db/index.js';
import type { CreateTransactionTemplateInput, UpdateTransactionTemplateInput, TemplateSplitInput } from '@penga/shared';

export const templatesRoute = new Hono();

/**
 * Helper to fetch full template with splits and tags
 */
async function fetchFullTemplates(templateIds?: string[]) {
  const query = db
    .select()
    .from(transactionTemplates)
    .orderBy(asc(transactionTemplates.name));

  const allTemplates = templateIds && templateIds.length > 0
    ? await query.where(inArray(transactionTemplates.id, templateIds))
    : await query;

  if (allTemplates.length === 0) return [];

  const foundIds = allTemplates.map((t) => t.id);

  // Fetch splits for these templates
  const allSplits = await db
    .select({
      id: templateSplits.id,
      templateId: templateSplits.templateId,
      accountId: templateSplits.accountId,
      amountCents: templateSplits.amountCents,
      sortOrder: templateSplits.sortOrder,
      accountName: accounts.name,
      accountType: accounts.type,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
    })
    .from(templateSplits)
    .innerJoin(accounts, eq(templateSplits.accountId, accounts.id))
    .where(inArray(templateSplits.templateId, foundIds))
    .orderBy(asc(templateSplits.sortOrder), asc(templateSplits.createdAt));

  // Fetch tags for these templates
  const allTags = await db
    .select({
      templateId: templateTags.templateId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(templateTags)
    .innerJoin(tags, eq(templateTags.tagId, tags.id))
    .where(inArray(templateTags.templateId, foundIds))
    .orderBy(asc(tags.name));

  const splitsByTemplateId = new Map<string, typeof allSplits>();
  for (const s of allSplits) {
    if (!splitsByTemplateId.has(s.templateId)) {
      splitsByTemplateId.set(s.templateId, []);
    }
    splitsByTemplateId.get(s.templateId)!.push(s);
  }

  const tagsByTemplateId = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
  for (const t of allTags) {
    if (!tagsByTemplateId.has(t.templateId)) {
      tagsByTemplateId.set(t.templateId, []);
    }
    tagsByTemplateId.get(t.templateId)!.push({
      id: t.id,
      name: t.name,
      color: t.color,
    });
  }

  return allTemplates.map((template) => ({
    ...template,
    splits: splitsByTemplateId.get(template.id) || [],
    tags: tagsByTemplateId.get(template.id) || [],
  }));
}

/**
 * GET /api/templates
 * Returns all transaction templates with their splits and tags.
 */
templatesRoute.get('/', async (c) => {
  try {
    const templates = await fetchFullTemplates();
    return c.json({ data: templates });
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch templates', details: err.message }, 500);
  }
});

/**
 * GET /api/templates/:id
 * Returns a single template with splits and tags.
 */
templatesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const templates = await fetchFullTemplates([id]);
    if (templates.length === 0) {
      return c.json({ error: 'Template not found' }, 404);
    }
    return c.json({ data: templates[0] });
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch template', details: err.message }, 500);
  }
});

/**
 * POST /api/templates
 * Creates a new template with splits and optional tags.
 */
templatesRoute.post('/', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const { name, payee, note, icon, color, splits: inputSplits, tagIds } = body as CreateTransactionTemplateInput;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return c.json({ error: 'Field "name" is required and must be a non-empty string' }, 400);
  }

  if (!Array.isArray(inputSplits) || inputSplits.length < 2) {
    return c.json({ error: 'A template must have at least 2 split lines' }, 400);
  }

  const referencedAccountIds = new Set<string>();
  for (let i = 0; i < inputSplits.length; i++) {
    const s = inputSplits[i];
    if (!s || typeof s !== 'object' || !s.accountId || typeof s.accountId !== 'string') {
      return c.json({ error: `Split at index ${i} is missing a valid "accountId"` }, 400);
    }
    if (s.amountCents !== undefined && !Number.isInteger(s.amountCents)) {
      return c.json({ error: `Split at index ${i} "amountCents" must be an integer if provided` }, 400);
    }
    referencedAccountIds.add(s.accountId);
  }

  // Validate that accounts exist
  const existingAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(inArray(accounts.id, Array.from(referencedAccountIds)));

  if (existingAccounts.length !== referencedAccountIds.size) {
    const foundIds = new Set(existingAccounts.map((a) => a.id));
    const missingIds = Array.from(referencedAccountIds).filter((id) => !foundIds.has(id));
    return c.json({ error: `The following accountId(s) do not exist: ${missingIds.join(', ')}` }, 400);
  }

  // Execute insertion in transaction
  const createdId = await db.transaction(async (tx) => {
    const [newTemplate] = await tx
      .insert(transactionTemplates)
      .values({
        name: name.trim(),
        payee: typeof payee === 'string' && payee.trim() ? payee.trim() : null,
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
        icon: typeof icon === 'string' && icon.trim() ? icon.trim() : null,
        color: typeof color === 'string' && color.trim() ? color.trim() : null,
      })
      .returning({ id: transactionTemplates.id });

    const splitsToInsert = inputSplits.map((s, idx) => ({
      templateId: newTemplate.id,
      accountId: s.accountId,
      amountCents: s.amountCents || 0,
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : idx,
    }));

    await tx.insert(templateSplits).values(splitsToInsert);

    if (Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        if (typeof tagId === 'string' && tagId.trim()) {
          await tx
            .insert(templateTags)
            .values({
              templateId: newTemplate.id,
              tagId: tagId.trim(),
            })
            .onConflictDoNothing();
        }
      }
    }

    return newTemplate.id;
  });

  const [fullTemplate] = await fetchFullTemplates([createdId]);
  return c.json({ data: fullTemplate }, 201);
});

/**
 * PATCH /api/templates/:id
 * Updates an existing template.
 */
templatesRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const [existing] = await db
    .select()
    .from(transactionTemplates)
    .where(eq(transactionTemplates.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Template not found' }, 404);
  }

  const { name, payee, note, icon, color, splits: inputSplits, tagIds } = body as UpdateTransactionTemplateInput;

  // Validate splits if provided
  if (inputSplits !== undefined) {
    if (!Array.isArray(inputSplits) || inputSplits.length < 2) {
      return c.json({ error: 'Template must contain at least 2 split lines' }, 400);
    }
    const referencedAccountIds = new Set<string>();
    for (let i = 0; i < inputSplits.length; i++) {
      const s = inputSplits[i];
      if (!s || typeof s !== 'object' || !s.accountId || typeof s.accountId !== 'string') {
        return c.json({ error: `Split at index ${i} is missing a valid "accountId"` }, 400);
      }
      if (s.amountCents !== undefined && !Number.isInteger(s.amountCents)) {
        return c.json({ error: `Split at index ${i} "amountCents" must be an integer if provided` }, 400);
      }
      referencedAccountIds.add(s.accountId);
    }

    const foundAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(inArray(accounts.id, Array.from(referencedAccountIds)));

    if (foundAccounts.length !== referencedAccountIds.size) {
      const foundIds = new Set(foundAccounts.map((a) => a.id));
      const missingIds = Array.from(referencedAccountIds).filter((id) => !foundIds.has(id));
      return c.json({ error: `The following accountId(s) do not exist: ${missingIds.join(', ')}` }, 400);
    }
  }

  await db.transaction(async (tx) => {
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new Error('Field "name" cannot be empty');
      }
      updateValues.name = name.trim();
    }
    if (payee !== undefined) {
      updateValues.payee = typeof payee === 'string' && payee.trim() ? payee.trim() : null;
    }
    if (note !== undefined) {
      updateValues.note = typeof note === 'string' && note.trim() ? note.trim() : null;
    }
    if (icon !== undefined) {
      updateValues.icon = typeof icon === 'string' && icon.trim() ? icon.trim() : null;
    }
    if (color !== undefined) {
      updateValues.color = typeof color === 'string' && color.trim() ? color.trim() : null;
    }

    await tx
      .update(transactionTemplates)
      .set(updateValues)
      .where(eq(transactionTemplates.id, id));

    if (inputSplits !== undefined) {
      await tx.delete(templateSplits).where(eq(templateSplits.templateId, id));

      const splitsToInsert = inputSplits.map((s: TemplateSplitInput, idx: number) => ({
        templateId: id,
        accountId: s.accountId,
        amountCents: s.amountCents || 0,
        sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : idx,
      }));

      await tx.insert(templateSplits).values(splitsToInsert);
    }

    if (tagIds !== undefined && Array.isArray(tagIds)) {
      await tx.delete(templateTags).where(eq(templateTags.templateId, id));
      for (const tagId of tagIds) {
        if (typeof tagId === 'string' && tagId.trim()) {
          await tx
            .insert(templateTags)
            .values({
              templateId: id,
              tagId: tagId.trim(),
            })
            .onConflictDoNothing();
        }
      }
    }
  });

  const [fullTemplate] = await fetchFullTemplates([id]);
  return c.json({ data: fullTemplate });
});

/**
 * DELETE /api/templates/:id
 * Deletes a template and its splits/tags via cascade.
 */
templatesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [existing] = await db
    .select({ id: transactionTemplates.id })
    .from(transactionTemplates)
    .where(eq(transactionTemplates.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Template not found' }, 404);
  }

  await db.delete(transactionTemplates).where(eq(transactionTemplates.id, id));
  return c.json({ success: true, message: 'Template deleted' });
});
