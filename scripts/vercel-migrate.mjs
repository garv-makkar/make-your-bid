import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping production database migrations outside a Vercel production build.');
} else {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('Production DATABASE_URL and DIRECT_URL must be set in Vercel before building.');
  }

  const require = createRequire(import.meta.url);
  console.log('Applying pending production database migrations...');
  execFileSync(process.execPath, [require.resolve('prisma'), 'migrate', 'deploy'], { stdio: 'inherit' });
}
