import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Ensure environment variables are loaded
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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database connections will fail.');
}

// PostgreSQL connection for query execution
export const queryClient = postgres(connectionString || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export * from './schema.js';
