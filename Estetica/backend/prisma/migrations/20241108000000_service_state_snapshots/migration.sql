-- Add service state flags and booking service snapshots
ALTER TABLE "Service"
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deletedAt" TIMESTAMPTZ;

ALTER TABLE "Booking"
  ADD COLUMN "serviceNameSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "servicePriceSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Booking" b
SET
  "serviceNameSnapshot" = s."name",
  "servicePriceSnapshot" = s."price"
FROM "Service" s
WHERE b."serviceId" = s."id";

ALTER TABLE "Booking"
  ALTER COLUMN "serviceNameSnapshot" DROP DEFAULT,
  ALTER COLUMN "servicePriceSnapshot" DROP DEFAULT;
