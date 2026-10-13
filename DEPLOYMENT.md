# Deploying Make Your Bid

This project is already set up for Vercel and Supabase Postgres. Vercel production builds apply pending Prisma migrations automatically; routine deployments do not require a local `db:deploy` command.

## Production configuration

1. In Vercel, connect this repository and set the **Production Branch** to `main`. Use the Next.js framework preset and the repository root as the Root Directory. `vercel.json` sets the build command to `npm run build`.
2. Set these Vercel environment variables for **Production**:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase transaction pooler URL, port `6543`. Include `pgbouncer=true`, a small `connection_limit` (currently `2`), and `sslmode=require`. |
   | `DIRECT_URL` | Supabase session pooler URL, port `5432`, for Prisma migrations. |
   | `NEXTAUTH_URL` | The final HTTPS site origin, with no trailing slash. |
   | `NEXTAUTH_SECRET` | A long, random secret. Keep it stable across deployments. |
   | `GOOGLE_CLIENT_ID` | Google OAuth web client ID. |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth web client secret. |

   Use the same Supabase database for both URLs. If the Supabase integration provides differently named variables, map their values to the names above. Keep production database credentials scoped to Production; a Preview deployment should use its own database if it needs database access.

3. In Google Cloud, add the production origin as an authorized JavaScript origin and `https://YOUR_DOMAIN/api/auth/callback/google` as an authorized redirect URI. Use the exact domain in `NEXTAUTH_URL`. If the OAuth app is still in testing mode, add intended users as test users or publish the app.
4. Push to `main`. The `prebuild` script runs `prisma migrate deploy` only when Vercel reports `VERCEL=1` and `VERCEL_ENV=production`. The build stops if migration fails. `prisma generate` and `next build` run after migrations.

## Every later deployment

Commit code and any new `prisma/migrations` directory, then push to `main`. Vercel runs the pending migrations during its production build. Do not run a local migration command for each release.

Schema changes run before the new application version becomes live. Prefer additive migrations that remain compatible with the currently deployed version. Rolling back code does not roll back the database; correct a schema issue with a new forward migration.

## Verify a deployment

1. Check the Vercel build log for `Applying pending production database migrations...`, then a successful Next.js build.
2. Open the site and test Google sign-in, account event creation, an online room link or code, and one image upload. Confirm that an account event remains after reload.
3. On a phone, open **Settings → Install app**. After one online visit, local auctions should remain available offline. Account data, sign-in, and online rooms require internet.

The local `npm run db:status` command is read-only and can be used when diagnosing migration state. `npm run db:deploy` is available for one-time setup or recovery, but normal production deployments rely on Vercel.

## Troubleshooting

- **Migration fails:** Check that `DIRECT_URL` reaches Supabase port `5432`, uses the correct database role/password, and has schema permissions. The failed build will not publish the new version.
- **App cannot connect to the database:** Check `DATABASE_URL` (transaction pooler, port `6543`) and its query parameters.
- **Google sign-in fails:** Check the exact HTTPS origin, callback URL, `NEXTAUTH_URL`, and Google client credentials. Check whether the Google OAuth app is restricted to test users.
- **Room changes do not appear:** Confirm that the deployment uses the same Supabase database for runtime requests and migrations. Refresh the room after reconnecting.
- **Local auctions are unavailable offline:** Visit `/local` while online once, wait for the page to load, then retry offline. Service workers require HTTPS outside localhost.

Never commit `.env` or OAuth client secret JSON files. Both are ignored by Git in this repository.
