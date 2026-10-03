ALTER TABLE "Event" ADD COLUMN "joinCode" TEXT;
UPDATE "Event" SET "joinCode" = upper(substr(md5("id"), 1, 12)) WHERE "mode" = 'ONLINE';
CREATE UNIQUE INDEX "Event_joinCode_key" ON "Event"("joinCode");
