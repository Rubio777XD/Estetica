-- Enable soft delete indexes and booking snapshots for services
DROP INDEX IF EXISTS "Service_name_key";

ALTER TABLE "Booking"
  ALTER COLUMN "serviceId" DROP NOT NULL;

ALTER TABLE "Booking"
  ADD COLUMN "serviceDurationSnapshot" INTEGER NOT NULL DEFAULT 0;

-- Ensure snapshot data is populated before enforcing constraints
UPDATE "Booking" b
SET
  "serviceNameSnapshot" = s."name",
  "servicePriceSnapshot" = s."price",
  "serviceDurationSnapshot" = s."duration"
FROM "Service" s
WHERE b."serviceId" = s."id";

UPDATE "Booking"
SET
  "serviceNameSnapshot" = COALESCE(NULLIF("serviceNameSnapshot", ''), 'Servicio eliminado'),
  "servicePriceSnapshot" = COALESCE("servicePriceSnapshot", 0),
  "serviceDurationSnapshot" = COALESCE(NULLIF("serviceDurationSnapshot", 0), 0)
WHERE "serviceId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "Service" s WHERE s."id" = "Booking"."serviceId");

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_serviceId_fkey";

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_serviceId_fkey"
    FOREIGN KEY ("serviceId")
    REFERENCES "Service"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ALTER COLUMN "serviceDurationSnapshot" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "Service_active_idx" ON "Service"("active");
CREATE INDEX IF NOT EXISTS "Service_deletedAt_idx" ON "Service"("deletedAt");
