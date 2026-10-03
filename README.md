# Make Your Bid

An auction website built with Next.js, React, Prisma, and Supabase Postgres. The landing page offers Google sign-in or a guest workspace stored in the current browser.

## Local setup

1. Install Node.js 22 or newer.
2. Create and configure the Supabase database as described below.
3. In this folder, run `npm install`.
4. Run `npm run db:deploy` once to create/update the Supabase tables.
5. Run `npm run dev` and open `http://localhost:3000`. The Prisma client is generated during installation; apply pending migrations with `npm run db:deploy` before starting the server. Use `localhost` for Google sign-in.

Signed-in events and their uploaded images are stored in Supabase Postgres. Guest events are stored separately in that browser's local storage. They can be lost if site data is cleared and are not automatically transferred into a Google account. Online rooms require Google sign-in.

## Supabase database setup

1. Create a Supabase project and save its database password in a password manager.
2. Open **SQL Editor** in Supabase and run the following once. Replace `CHOOSE_A_STRONG_PASSWORD` with a separate strong password for the app's database role (escape single quotes as `''` if the password contains one):

   ```sql
   create user "prisma" with password 'CHOOSE_A_STRONG_PASSWORD' bypassrls createdb;
   grant "prisma" to "postgres";
   grant usage, create on schema public to prisma;
   grant all on all tables in schema public to prisma;
   grant all on all routines in schema public to prisma;
   grant all on all sequences in schema public to prisma;
   alter default privileges for role postgres in schema public grant all on tables to prisma;
   alter default privileges for role postgres in schema public grant all on routines to prisma;
   alter default privileges for role postgres in schema public grant all on sequences to prisma;
   ```

3. Select **Connect** in Supabase and copy both Supavisor connection strings:
   - **Transaction mode** (port `6543`) is `DATABASE_URL`. It is used by the Vercel/serverless app. Append `?pgbouncer=true&connection_limit=2&sslmode=require` (or add these with `&` if the copied URL already has query parameters).
   - **Session mode** (port `5432`) is `DIRECT_URL`. It is used by Prisma migrations and Prisma Studio.
4. In both URLs, use `prisma` as the database user. With Supavisor that username is normally `prisma.PROJECT_REF`. Replace the password with the Prisma-role password from step 2. Percent-encode reserved URL characters in the password.
5. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, the Google credentials, and a random `NEXTAUTH_SECRET`. Do not commit `.env`.
6. Run `npm run db:deploy`, then `npm run db:status`. The status command should say the database schema is up to date.

The checked-in migrations target a new/empty Supabase database. Existing data from the old local SQLite file is not copied automatically.

## Google sign-in

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. In **Google Auth Platform**, fill in **Branding** and choose your audience. If the app is in testing mode, add your Google account under **Audience → Test users**.
3. Under **Clients**, create an OAuth client of type **Web application**.
4. Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. The redirect URI must match exactly.
5. Copy the client ID and client secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. Keep `NEXTAUTH_URL="http://localhost:3000"` and keep `NEXTAUTH_SECRET` as a long random value. Restart `npm run dev`.
6. Open `http://localhost:3000/signin` and select **Continue with Google**.

The Google client secret belongs only in `.env`, never in browser code.

## Deploying to Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket and import it into Vercel as a Next.js project.
2. In **Vercel → Project → Settings → Environment Variables**, add these to Production (and Preview only if previews should use the same database):
   - `DATABASE_URL`: Supabase transaction-pooler URL (port `6543`).
   - `DIRECT_URL`: Supabase session-pooler URL (port `5432`). It is required by Prisma's schema configuration even though the running app uses `DATABASE_URL`.
   - `NEXTAUTH_SECRET`: the same long random secret used locally, or a new production-only secret.
   - `NEXTAUTH_URL`: the final canonical URL, for example `https://make-your-bid.vercel.app` (no trailing slash).
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. Keep the Vercel build command at `npm run build`. Apply database migrations deliberately with `npm run db:deploy` before deploying a schema change; do not run development migrations against production.
4. Deploy, then check `/signin`, create an event, upload an image, and reload the event to verify database persistence.

## Publishing Google sign-in

After the Vercel production URL is final:

1. In **Google Cloud Console → Google Auth Platform → Clients**, open the web client.
2. Add `https://YOUR_DOMAIN` under **Authorized JavaScript origins**.
3. Add `https://YOUR_DOMAIN/api/auth/callback/google` under **Authorized redirect URIs**. It must match exactly.
4. Under **Branding**, set the production homepage, support email, authorized domain, and (if Google requests it) privacy-policy and terms links.
5. Under **Audience**, use **External**, verify the configuration, and select **Publish app** when ready.
6. Test sign-in in a private browser window with a Google account that was not a test user.

This app only asks Google for the standard OpenID Connect identity scopes (name, email, and profile), not Gmail/Drive or other sensitive API scopes. Google determines whether brand verification is required for the final consent-screen configuration.

## Using an event

- Create an event and choose **Local** or **Online**.
- In **Bidders**, set the default units and add local bidder names (one per line or comma-separated). The page shows the bidder count, each person's total units, and units left. You can adjust a person's budget while the auction is a draft or paused. For online events, bidders request access through the room link and then appear in this list.
- Add entries one at a time, paste multiple comma-separated lines, or choose a `.csv` file. Rows use `name,base price,image link`; price and image are optional. A blank price defaults to 1 unit. After previewing pasted rows or a CSV file, each row can also get its own uploaded image before you add all entries together.
- Start in the listed order or shuffle first. A skipped entry moves behind all other pending entries; it remains available until the host awards it or marks it permanently unsold. Skipping again sends it to the end again.
- The host can choose **Reverse round** before bids are placed on the current entry. The lowest final bid wins. Every participating bidder pays their own final bid when the host awards the entry. Ties go to the earliest bid. The next entry returns to normal bidding unless the host selects reverse again.
- In online mode, share the room link. Bidders sign in, request to join, and wait for host approval. They need available units to bid. A timer can close an online round; if nobody bid, the entry is skipped automatically.

## Notes

Signed-in users' uploaded images are compressed and stored in Postgres. Guest uploads are compressed and saved with guest events in browser storage, which has limited space. For a high-volume public app, move image binaries to object storage later so they do not consume database space.
