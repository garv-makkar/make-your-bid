# Make Your Bid

A browser based auction app for running local auctions or live online bidding rooms. Hosts can prepare entries, set base prices, choose normal, reverse, sealed, or timed rounds, and review a bidder grouped summary.

## How it works

- **Local:** Run an auction in this browser without signing in. Events and uploaded images stay in browser storage. After an online visit, the local workspace works offline through the PWA.
- **Account:** Sign in with Google to keep events in Supabase Postgres. Account events require internet.
- **Online room:** Create an online event, add entries and base prices, then open the room. Share its link or 12 character code, approve bidders, and start the auction. The host may also join as a bidder. Bidders can preview entries and base prices before bidding starts.
- **Install on a phone:** Open **Settings → Install app**. Sign-in and online rooms still require internet.

The interface is built with Next.js 16, React 19, NextAuth, Prisma, and Supabase Postgres. Signed-in image uploads are compressed and stored in Postgres. Local images are stored with the local event in browser storage.

## Run locally

1. Install Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env` and fill in the Supabase and Google OAuth values.
3. For a new database, run `npm run db:deploy` once.
4. Run `npm run dev` and open `http://localhost:3000`.

Use `http://localhost:3000` as `NEXTAUTH_URL` locally. Add `http://localhost:3000/api/auth/callback/google` to the Google OAuth web client's redirect URIs if testing Google sign-in locally. Never commit `.env` or OAuth client secret files.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler URL used by the running app. |
| `DIRECT_URL` | Supabase session pooler URL used by Prisma migrations. |
| `NEXTAUTH_URL` | Exact site origin used for auth and request origin checks. |
| `NEXTAUTH_SECRET` | Stable secret for signed-in sessions. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client credentials. |

## Check the project

- `npm run typecheck` checks TypeScript.
- `npm test` runs the existing auction logic tests.
- `npm run build` makes a production build. Local builds skip the production migration hook.
- `npm run db:status` reads the configured database migration state.

## Production deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the existing Vercel and Supabase setup, environment variables, Google callback configuration, automatic migration behavior, and release checks. After setup, pushing to `main` triggers a Vercel production build that applies pending checked-in migrations. Routine releases do not require a manual local database command.

## Data notes

Local events belong to the current browser and are lost if its site data is cleared. They do not automatically move into an account. Online events, bids, and account images are stored in the configured Supabase database. Keep database credentials and Google secrets server side.
