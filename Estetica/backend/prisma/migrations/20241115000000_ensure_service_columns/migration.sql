-- Ensure service lifecycle columns exist in legacy databases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Service'
      AND column_name = 'active'
  ) THEN
    ALTER TABLE "Service" ADD COLUMN "active" BOOLEAN;
  END IF;
END $$;

UPDATE "Service"
SET "active" = true
WHERE "active" IS NULL;

ALTER TABLE "Service"
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "active" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Service'
      AND column_name = 'deletedAt'
  ) THEN
    ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Booking'
      AND column_name = 'serviceNameSnapshot'
  ) THEN
    ALTER TABLE "Booking" ADD COLUMN "serviceNameSnapshot" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Booking'
      AND column_name = 'servicePriceSnapshot'
  ) THEN
    ALTER TABLE "Booking" ADD COLUMN "servicePriceSnapshot" DOUBLE PRECISION;
  END IF;
END $$;

UPDATE "Booking" AS b
SET
  "serviceNameSnapshot" = s."name",
  "servicePriceSnapshot" = s."price"
FROM "Service" AS s
WHERE b."serviceId" = s."id"
  AND (b."serviceNameSnapshot" IS NULL OR b."servicePriceSnapshot" IS NULL);

UPDATE "Booking"
SET
  "serviceNameSnapshot" = COALESCE("serviceNameSnapshot", 'Servicio desconocido'),
  "servicePriceSnapshot" = COALESCE("servicePriceSnapshot", 0)
WHERE "serviceNameSnapshot" IS NULL OR "servicePriceSnapshot" IS NULL;

ALTER TABLE "Booking"
  ALTER COLUMN "serviceNameSnapshot" SET NOT NULL,
  ALTER COLUMN "servicePriceSnapshot" SET NOT NULL;
