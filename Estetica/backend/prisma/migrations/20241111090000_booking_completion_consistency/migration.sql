-- Ensure payment status enum exists
DO $$
BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Add status column with default if it does not exist yet
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'paid';

-- Normalize existing payment statuses
UPDATE "Payment" SET "status" = 'paid' WHERE "status" IS NULL;

-- Collapse duplicate payments per booking, keeping the newest record
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "bookingId" ORDER BY "createdAt" DESC, "id" DESC) AS rn
  FROM "Payment"
)
DELETE FROM "Payment"
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- Ensure the one-to-one relationship between booking and payment
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_bookingId_key" ON "Payment" ("bookingId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment" ("status");

-- Collapse duplicate commissions per booking, keeping the newest record
WITH ranked_commission AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "bookingId" ORDER BY "createdAt" DESC, "id" DESC) AS rn
  FROM "Commission"
)
DELETE FROM "Commission"
WHERE "id" IN (SELECT "id" FROM ranked_commission WHERE rn > 1);

-- Ensure the one-to-one relationship between booking and commission
CREATE UNIQUE INDEX IF NOT EXISTS "Commission_bookingId_key" ON "Commission" ("bookingId");
