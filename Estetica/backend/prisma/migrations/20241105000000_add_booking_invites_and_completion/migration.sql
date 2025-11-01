-- AlterTable
ALTER TABLE "Booking"
    ADD COLUMN IF NOT EXISTS "clientEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "invitedEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "confirmedEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "performedByName" TEXT,
    ADD COLUMN IF NOT EXISTS "completedBy" TEXT;

-- Ensure the default persists even if the column existed without one
ALTER TABLE "Booking" ALTER COLUMN "invitedEmails" SET DEFAULT ARRAY[]::TEXT[];

UPDATE "Booking"
SET "invitedEmails" = ARRAY[]::TEXT[]
WHERE "invitedEmails" IS NULL;
