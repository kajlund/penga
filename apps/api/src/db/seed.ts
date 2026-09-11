import { db, queryClient, accounts } from './index.js';
import { eq, and } from 'drizzle-orm';
import type { AccountType } from '@penga/shared';

interface SeedAccountNode {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  children?: Omit<SeedAccountNode, 'type'>[];
}

const accountTreeSeedData: SeedAccountNode[] = [
  // ==========================================
  // 1. ASSETS
  // ==========================================
  {
    name: 'OP Debit (Checking)',
    type: 'ASSET',
    icon: '🏦',
    color: '#0d9488', // Teal
  },
  {
    name: 'OP Debit Siblings (Savings)',
    type: 'ASSET',
    icon: '💰',
    color: '#059669', // Emerald
  },
  {
    name: 'S-Bank Debit',
    type: 'ASSET',
    icon: '🏦',
    color: '#10b981', // Green
  },
  {
    name: 'Wallet (Cash)',
    type: 'ASSET',
    icon: '💵',
    color: '#14b8a6', // Light Teal
  },

  // ==========================================
  // 2. LIABILITIES
  // ==========================================
  {
    name: 'OP Visa Penga',
    type: 'LIABILITY',
    icon: '💳',
    color: '#d97706', // Amber
  },
  {
    name: 'S-Visa',
    type: 'LIABILITY',
    icon: '💳',
    color: '#ea580c', // Orange
  },
  {
    name: 'Mastercard',
    type: 'LIABILITY',
    icon: '💳',
    color: '#f59e0b', // Yellow Amber
  },
  {
    name: 'Toyota Finance (Car Mortgage Principal)',
    type: 'LIABILITY',
    icon: '🚗',
    color: '#dc2626', // Red
  },

  // ==========================================
  // 3. INCOME
  // ==========================================
  {
    name: 'Salary',
    type: 'INCOME',
    icon: '💼',
    color: '#2563eb', // Blue
  },
  {
    name: 'S-Bonus Card / Cashback',
    type: 'INCOME',
    icon: '🎁',
    color: '#4f46e5', // Indigo
  },
  {
    name: 'Dividends & Investments',
    type: 'INCOME',
    icon: '📈',
    color: '#059669', // Emerald
  },
  {
    name: 'Tax Returns (Income Tax Refund)',
    type: 'INCOME',
    icon: '📋',
    color: '#0891b2', // Cyan
  },

  // ==========================================
  // 4. EXPENSES (With Hierarchical Sub-Categories)
  // ==========================================
  {
    name: 'Housing & Living',
    type: 'EXPENSE',
    icon: '🏠',
    color: '#d97706',
    children: [
      { name: 'Rent', icon: '📄', color: '#d97706' },
      { name: 'Utilities (Electricity, heating, water, home insurance)', icon: '💡', color: '#f59e0b' },
      { name: 'Household Items & Hygiene (Detergents, paper goods...)', icon: '🧽', color: '#fbbf24' },
      { name: 'Inventory & Furnishings (Furniture, appliances, gear)', icon: '🛋️', color: '#b45309' },
    ],
  },
  {
    name: 'Food & Groceries',
    type: 'EXPENSE',
    icon: '🍏',
    color: '#16a34a',
    children: [
      { name: 'Basic Groceries (Essentials)', icon: '🛒', color: '#16a34a' },
      { name: 'Treats & Snacks (Candy, sodas, chips)', icon: '🍫', color: '#15803d' },
    ],
  },
  {
    name: 'Dining Out & Cafes',
    type: 'EXPENSE',
    icon: '🍽️',
    color: '#ea580c',
  },
  {
    name: 'Vehicle & Transport',
    type: 'EXPENSE',
    icon: '🚗',
    color: '#2563eb',
    children: [
      { name: 'Fuel', icon: '⛽', color: '#2563eb' },
      { name: 'Service & Repairs', icon: '🛠️', color: '#1d4ed8' },
      { name: 'Parking, Tolls & Tickets', icon: '🅿️', color: '#3b82f6' },
      { name: 'Alternative Transit (Electric scooters, taxis)', icon: '🛴', color: '#60a5fa' },
      { name: 'Car Insurance', icon: '📋', color: '#1e40af' },
    ],
  },
  {
    name: 'Lifestyle, Hobbies & Fitness',
    type: 'EXPENSE',
    icon: '🏃',
    color: '#0891b2',
    children: [
      { name: 'Gym Memberships & Classes', icon: '🏋️', color: '#0891b2' },
      { name: 'Workout Gear (Running shoes, jackets, shorts)', icon: '👟', color: '#06b6d4' },
      { name: 'Hobbies & General Recreation', icon: '🎨', color: '#22d3ee' },
    ],
  },
  {
    name: 'Clothing & Personal Care',
    type: 'EXPENSE',
    icon: '👕',
    color: '#7c3aed',
    children: [
      { name: 'Everyday Clothes & Accessories', icon: '👔', color: '#7c3aed' },
      { name: 'Personal Hygiene Products (Haircuts/care, Skincare, cosmetics)', icon: '🧴', color: '#8b5cf6' },
    ],
  },
  {
    name: 'Healthcare & Wellness',
    type: 'EXPENSE',
    icon: '💊',
    color: '#e11d48',
    children: [
      { name: 'Prescription Drugs', icon: '💊', color: '#e11d48' },
      { name: 'Supplements & Health Products', icon: '🌿', color: '#f43f5e' },
    ],
  },
  {
    name: 'Gifts & Donations',
    type: 'EXPENSE',
    icon: '🎁',
    color: '#c026d3',
    children: [
      { name: 'Personal Gifts', icon: '👤', color: '#d946ef' },
    ],
  },
  {
    name: 'Entertainment & Media',
    type: 'EXPENSE',
    icon: '🎟️',
    color: '#4f46e5',
    children: [
      { name: 'Streaming Services (Movies, TV)', icon: '🎬', color: '#4f46e5' },
      { name: 'Audiobooks & E-books', icon: '📚', color: '#6366f1' },
    ],
  },
  {
    name: 'Education & Professional Development',
    type: 'EXPENSE',
    icon: '🎓',
    color: '#0284c7',
    children: [
      { name: 'Books, Courses & Materials', icon: '📖', color: '#0284c7' },
    ],
  },
  {
    name: 'Financial Fees & Interest',
    type: 'EXPENSE',
    icon: '🏦',
    color: '#dc2626',
    children: [
      { name: 'Credit Card Interest & Overdraft Fees', icon: '💳', color: '#dc2626' },
      { name: 'Misc Banking Fees & Account Costs', icon: '📄', color: '#ef4444' },
    ],
  },
  {
    name: 'Taxes & Government',
    type: 'EXPENSE',
    icon: '🏛️',
    color: '#64748b',
    children: [
      { name: 'Property Tax', icon: '📋', color: '#64748b' },
    ],
  },
];

async function upsertAccount(
  name: string,
  type: AccountType,
  icon: string,
  color: string,
  parentId: string | null = null
): Promise<string> {
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.name, name))
    .limit(1);

  if (existing) {
    // Update metadata if needed
    await db
      .update(accounts)
      .set({
        type,
        icon,
        color,
        parentId: parentId ?? existing.parentId,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, existing.id));

    console.log(`  [Synced] ${icon} ${name} (${type})`);
    return existing.id;
  }

  const [inserted] = await db
    .insert(accounts)
    .values({
      name,
      type,
      icon,
      color,
      parentId,
    })
    .returning();

  console.log(`  [+ Created] ${icon} ${name} (${type})`);
  return inserted.id;
}

async function seed() {
  console.log('=== Seeding Real-World Penga Account Tree ===\n');

  let totalAccounts = 0;

  for (const rootNode of accountTreeSeedData) {
    const parentId = await upsertAccount(
      rootNode.name,
      rootNode.type,
      rootNode.icon,
      rootNode.color,
      null
    );
    totalAccounts++;

    if (rootNode.children && rootNode.children.length > 0) {
      for (const child of rootNode.children) {
        await upsertAccount(
          child.name,
          rootNode.type,
          child.icon,
          child.color,
          parentId
        );
        totalAccounts++;
      }
    }
  }

  console.log(`\n✓ Seeding finished successfully. Total ${totalAccounts} accounts processed.`);
  await queryClient.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  queryClient.end().finally(() => process.exit(1));
});
