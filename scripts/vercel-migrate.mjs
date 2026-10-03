import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping production database migrations outside a Vercel production build.');
} else {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('Production DATABASE_URL and DIRECT_URL must be set in Vercel before building.');
  }

  const require = createRequire(import.meta.url);
  const packagePath = require.resolve('prisma/package.json');
  const prismaPackage = JSON.parse(readFileSync(packagePath, 'utf8'));
  const prismaCli = resolve(dirname(packagePath), prismaPackage.bin.prisma);
  console.log('Applying pending production database migrations...');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'inherit' });
}
