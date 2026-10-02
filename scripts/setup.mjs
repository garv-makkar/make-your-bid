import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  writeFileSync('.env', readFileSync('.env.example', 'utf8').replace('replace-with-a-random-secret', randomBytes(32).toString('hex')));
  console.log('Created .env with a unique session secret. Add your Google credentials when ready.');
}
