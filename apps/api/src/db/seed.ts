import { db, queryClient, accounts } from './index.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding core asset accounts...');

  const assetSeedData = [
    {
      name: 'Main Checking Account',
      type: 'ASSET' as const,
      icon: '🏦',
      color: '#0d9488',
    },
    {
      name: 'High-Yield Savings',
      type: 'ASSET' as const,
      icon: '🛡️',
      color: '#059669',
    },
    {
      name: 'Physical Cash Wallet',
      type: 'ASSET' as const,
      icon: '💵',
      color: '#10b981',
    },
  ];

  for (const acc of assetSeedData) {
    const existing = await db
      .select()
      .from(accounts)
      .where(eq(accounts.name, acc.name))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db.insert(accounts).values(acc).returning();
      console.log(`Created asset account: ${inserted.name} (${inserted.id})`);
    } else {
      console.log(`Account already exists: ${acc.name}`);
    }
  }

  // Also create a nested sub-account under Main Checking to demonstrate parent_id hierarchy
  const [mainChecking] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.name, 'Main Checking Account'))
    .limit(1);

  if (mainChecking) {
    const dailySpendingName = 'Daily Debit Sub-Account';
    const existingSub = await db
      .select()
      .from(accounts)
      .where(eq(accounts.name, dailySpendingName))
      .limit(1);

    if (existingSub.length === 0) {
      const [subAccount] = await db
        .insert(accounts)
        .values({
          name: dailySpendingName,
          type: 'ASSET',
          parentId: mainChecking.id,
          icon: '💳',
          color: '#14b8a6',
        })
        .returning();
      console.log(
        `Created hierarchical sub-account: ${subAccount.name} under ${mainChecking.name} (${subAccount.id})`
      );
    }
  }

  console.log('Database seeding finished successfully.');
  await queryClient.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  queryClient.end().finally(() => process.exit(1));
});
