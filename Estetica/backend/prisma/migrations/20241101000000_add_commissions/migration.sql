ALTER TABLE "Booking" ADD COLUMN "amountOverride" DOUBLE PRECISION;

CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "assigneeEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Commission"
  ADD CONSTRAINT "Commission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Commission_bookingId_idx" ON "Commission"("bookingId");
CREATE INDEX "Commission_assigneeEmail_idx" ON "Commission"("assigneeEmail");
