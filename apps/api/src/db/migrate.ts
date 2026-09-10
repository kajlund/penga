import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(currentDir, '../../../..');
const rootEnvPath = path.join(repoRootDir, '.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(localEnvPath) && localEnvPath !== rootEnvPath) {
  dotenv.config({ path: localEnvPath, override: true });
}

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required for migrations.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL to run migrations...');
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  const migrationsFolder = path.resolve(currentDir, '../../drizzle');
  console.log(`Applying migrations from ${migrationsFolder}...`);

  await migrate(db, { migrationsFolder });

  console.log('Migrations applied successfully!');
  await migrationClient.end();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
