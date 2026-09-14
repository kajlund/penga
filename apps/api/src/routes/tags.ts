import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { db, tags } from '../db/index.js';

export const tagsRoute = new Hono();

const TAG_COLOR_PALETTE = [
  '#0d9488', // Teal
  '#059669', // Emerald
  '#2563eb', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d97706', // Amber
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#ec4899', // Pink
];

/**
 * Normalizes a tag name: removes leading '#' and trims whitespace.
 */
function normalizeTagName(raw: string): string {
  return raw.replace(/^#+/, '').trim().toLowerCase();
}

/**
 * GET /api/tags
 * Returns all tags ordered alphabetically by name.
 */
tagsRoute.get('/', async (c) => {
  const allTags = await db.select().from(tags).orderBy(asc(tags.name));
  return c.json({ data: allTags });
});

/**
 * POST /api/tags
 * Creates a new tag, or returns existing tag if the name already exists.
 */
tagsRoute.post('/', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const rawName = body?.name;
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return c.json({ error: 'Field "name" is required' }, 400);
  }

  const normalized = normalizeTagName(rawName);
  if (!normalized) {
    return c.json({ error: 'Invalid tag name' }, 400);
  }

  // Check if tag already exists (case-insensitive due to normalization)
  const [existing] = await db
    .select()
    .from(tags)
    .where(eq(tags.name, normalized))
    .limit(1);

  if (existing) {
    return c.json({ data: existing, existing: true }, 200);
  }

  // Pick color or select from palette based on string hash
  let color = body.color;
  if (!color || typeof color !== 'string') {
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash + normalized.charCodeAt(i)) % TAG_COLOR_PALETTE.length;
    }
    color = TAG_COLOR_PALETTE[hash];
  }

  const [newTag] = await db
    .insert(tags)
    .values({
      name: normalized,
      color,
    })
    .returning();

  return c.json({ data: newTag }, 201);
});

/**
 * DELETE /api/tags/:id
 * Deletes a tag by ID.
 */
tagsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [deleted] = await db.delete(tags).where(eq(tags.id, id)).returning();

  if (!deleted) {
    return c.json({ error: 'Tag not found' }, 404);
  }

  return c.json({ data: deleted });
});
