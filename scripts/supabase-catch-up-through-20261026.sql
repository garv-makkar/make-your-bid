-- Run this entire file once in the Supabase SQL Editor against the production
-- database used by Vercel, before pushing the matching code, with no deployment
-- running at the same time. It is safe to run again. Keep the checked-in Prisma
-- migrations: future Vercel builds still need them for other databases.
--
-- This repairs missing schema objects through 20261026000000_sports_entries,
-- then reconciles Prisma's migration ledger. A mismatch or incompatible
-- existing schema aborts the transaction instead of marking it complete.

BEGIN;
SET LOCAL search_path TO public, pg_catalog;
SELECT pg_advisory_xact_lock(529612084);

-- Base schema from 20261002000000_init.
CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "mode" TEXT NOT NULL DEFAULT 'LOCAL',
  "startingBudgetCents" INTEGER NOT NULL DEFAULT 10000,
  "version" INTEGER NOT NULL DEFAULT 0,
  "timerEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Entry" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "basePriceCents" INTEGER NOT NULL DEFAULT 100,
  "imageUrl" TEXT,
  "position" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "soldPriceCents" INTEGER,
  "winner" TEXT,
  "winnerId" TEXT,
  CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Participant" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "budgetCents" INTEGER NOT NULL DEFAULT 10000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Bid" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "bidderId" TEXT NOT NULL,
  "bidderName" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Upload" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- Additions from the later five migrations. Defaults backfill existing rows.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "roundMode" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "orderMode" TEXT NOT NULL DEFAULT 'ORDERED';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "roundDurationSeconds" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "saleMode" TEXT;
ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "Bid" ADD COLUMN IF NOT EXISTS "chargedCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "Event"
SET "joinCode" = upper(substr(md5("id"), 1, 12))
WHERE "mode" = 'ONLINE' AND "joinCode" IS NULL;

-- Restore keys and indexes if an earlier migration stopped midway.
DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Event"'::regclass AND contype = 'p') THEN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Entry"'::regclass AND contype = 'p') THEN
    ALTER TABLE "Entry" ADD CONSTRAINT "Entry_pkey" PRIMARY KEY ("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Participant"'::regclass AND contype = 'p') THEN
    ALTER TABLE "Participant" ADD CONSTRAINT "Participant_pkey" PRIMARY KEY ("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Bid"'::regclass AND contype = 'p') THEN
    ALTER TABLE "Bid" ADD CONSTRAINT "Bid_pkey" PRIMARY KEY ("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Upload"'::regclass AND contype = 'p') THEN
    ALTER TABLE "Upload" ADD CONSTRAINT "Upload_pkey" PRIMARY KEY ("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Entry"'::regclass AND conname = 'Entry_eventId_fkey') THEN
    ALTER TABLE "Entry" ADD CONSTRAINT "Entry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Participant"'::regclass AND conname = 'Participant_eventId_fkey') THEN
    ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Bid"'::regclass AND conname = 'Bid_eventId_fkey') THEN
    ALTER TABLE "Bid" ADD CONSTRAINT "Bid_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public."Bid"'::regclass AND conname = 'Bid_entryId_fkey') THEN
    ALTER TABLE "Bid" ADD CONSTRAINT "Bid_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS "Event_ownerId_createdAt_idx" ON "Event"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Entry_eventId_position_idx" ON "Entry"("eventId", "position");
CREATE INDEX IF NOT EXISTS "Participant_eventId_status_idx" ON "Participant"("eventId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Participant_eventId_userId_key" ON "Participant"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "Bid_entryId_amountCents_idx" ON "Bid"("entryId", "amountCents");
CREATE INDEX IF NOT EXISTS "Bid_eventId_createdAt_idx" ON "Bid"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "Upload_ownerId_idx" ON "Upload"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Event_joinCode_key" ON "Event"("joinCode");

-- Refuse to mark the history complete if a pre-existing table is incomplete.
DO $schema_check$
DECLARE missing_column TEXT;
BEGIN
  SELECT expected.table_name || '.' || expected.column_name INTO missing_column
  FROM (VALUES
    ('Event','id'), ('Event','ownerId'), ('Event','name'), ('Event','category'),
    ('Event','status'), ('Event','mode'), ('Event','startingBudgetCents'),
    ('Event','version'), ('Event','timerEndsAt'), ('Event','createdAt'),
    ('Event','updatedAt'), ('Event','roundMode'), ('Event','orderMode'),
    ('Event','roundDurationSeconds'), ('Event','joinCode'),
    ('Entry','id'), ('Entry','eventId'), ('Entry','name'),
    ('Entry','basePriceCents'), ('Entry','imageUrl'), ('Entry','position'),
    ('Entry','status'), ('Entry','soldPriceCents'), ('Entry','winner'),
    ('Entry','winnerId'), ('Entry','saleMode'), ('Entry','description'),
    ('Entry','role'), ('Entry','specialty'),
    ('Participant','id'), ('Participant','eventId'), ('Participant','userId'),
    ('Participant','name'), ('Participant','status'),
    ('Participant','budgetCents'), ('Participant','createdAt'),
    ('Bid','id'), ('Bid','eventId'), ('Bid','entryId'), ('Bid','bidderId'),
    ('Bid','bidderName'), ('Bid','amountCents'), ('Bid','chargedCents'),
    ('Bid','createdAt'),
    ('Upload','id'), ('Upload','ownerId'), ('Upload','data'), ('Upload','createdAt')
  ) AS expected(table_name, column_name)
  LEFT JOIN information_schema.columns actual
    ON actual.table_schema = 'public'
   AND actual.table_name = expected.table_name
   AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL
     OR actual.data_type <> CASE
       WHEN expected.column_name IN (
         'startingBudgetCents', 'version', 'roundDurationSeconds',
         'basePriceCents', 'position', 'soldPriceCents', 'budgetCents',
         'amountCents', 'chargedCents'
       ) THEN 'integer'
       WHEN expected.column_name IN ('timerEndsAt', 'createdAt', 'updatedAt')
         THEN 'timestamp without time zone'
       WHEN expected.table_name = 'Upload' AND expected.column_name = 'data'
         THEN 'bytea'
       ELSE 'text'
     END
     OR actual.is_nullable <> CASE
       WHEN (expected.table_name, expected.column_name) IN (
         ('Event','timerEndsAt'), ('Event','joinCode'),
         ('Entry','imageUrl'), ('Entry','soldPriceCents'),
         ('Entry','winner'), ('Entry','winnerId'), ('Entry','saleMode'),
         ('Entry','description'), ('Entry','role'), ('Entry','specialty')
       ) THEN 'YES'
       ELSE 'NO'
     END
  LIMIT 1;
  IF missing_column IS NOT NULL THEN
    RAISE EXCEPTION 'Schema remains incomplete or incompatible at %', missing_column;
  END IF;
END
$schema_check$;

-- Match Prisma 6's ledger format. The hashes are SHA-256 of the exact
-- migration.sql files in this repository. Do not edit those files afterward.
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

CREATE TEMP TABLE catchup_expected_migrations (
  migration_name VARCHAR(255) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL
) ON COMMIT DROP;

INSERT INTO catchup_expected_migrations (migration_name, checksum) VALUES
  ('20261002000000_init', 'd9c0ae801cedc591a6f476245c2ec204e1d8d2c612bdb1e259143998f81bfa87'),
  ('20261002010000_rounds', 'a944e38bb647314e176cadddc58ea237878a78ebca194a8a17494cdc4f61eb59'),
  ('20261002020000_order_mode', 'd371cb8e881894d191cc51271389bef762baf171d85327371a1d7e09bacb298f'),
  ('20261003000000_round_modes', 'b748c8188827a20416df56c72b4cb4d89f72fc47fae34b5e90217bc7dca39bda'),
  ('20261004000000_join_codes', '4ffd47868e165cd0e499de6b891c535bf1187125cb80d061edeccc1140d2cb14'),
  ('20261026000000_sports_entries', '53287e8da1d2a2c15eea36b64c486ba5fdc6e1f21a5598fa9d022506a17522d7');

DO $ledger_check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations" m
    JOIN catchup_expected_migrations e ON e.migration_name = m.migration_name
    WHERE m.finished_at IS NOT NULL AND m.rolled_back_at IS NULL
      AND m.checksum <> e.checksum
  ) THEN
    RAISE EXCEPTION 'An applied Prisma migration has a different checksum. Stop and inspect migration history.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "_prisma_migrations" m
    LEFT JOIN catchup_expected_migrations e ON e.migration_name = m.migration_name
    WHERE m.finished_at IS NULL AND m.rolled_back_at IS NULL
      AND e.migration_name IS NULL
  ) THEN
    RAISE EXCEPTION 'An unknown failed Prisma migration exists. Resolve it before running this catch-up.';
  END IF;
END
$ledger_check$;

-- Prisma's resolve --applied rolls back a failed attempt and adds a fresh
-- successful record. Do the equivalent only after the schema has been repaired.
UPDATE "_prisma_migrations" m
SET "rolled_back_at" = now()
FROM catchup_expected_migrations e
WHERE m.migration_name = e.migration_name
  AND m.finished_at IS NULL
  AND m.rolled_back_at IS NULL;

INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, e.checksum, now(), e.migration_name, now(), 0
FROM catchup_expected_migrations e
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" m
  WHERE m.migration_name = e.migration_name
    AND m.finished_at IS NOT NULL
    AND m.rolled_back_at IS NULL
);

COMMIT;

SELECT "migration_name", "finished_at"
FROM public."_prisma_migrations"
WHERE "migration_name" IN (
  '20261002000000_init', '20261002010000_rounds',
  '20261002020000_order_mode', '20261003000000_round_modes',
  '20261004000000_join_codes', '20261026000000_sports_entries'
)
  AND "finished_at" IS NOT NULL
  AND "rolled_back_at" IS NULL
ORDER BY "migration_name";
