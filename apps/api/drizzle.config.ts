import { defineConfig } from 'drizzle-kit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(currentDir, '../..');
const rootEnvPath = path.join(repoRootDir, '.env');
const localEnvPath = path.resolve(currentDir, '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(localEnvPath) && localEnvPath !== rootEnvPath) {
  dotenv.config({ path: localEnvPath, override: true });
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
