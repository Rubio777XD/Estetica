-- AlterEnum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

DO $$
BEGIN
    CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'EMPLOYEE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

DO $$
BEGIN
    CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "assignedEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Assignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Assignment_token_key" ON "Assignment"("token");
CREATE INDEX IF NOT EXISTS "Assignment_bookingId_idx" ON "Assignment"("bookingId");
CREATE INDEX IF NOT EXISTS "Assignment_status_idx" ON "Assignment"("status");
CREATE INDEX IF NOT EXISTS "Assignment_expiresAt_idx" ON "Assignment"("expiresAt");
CREATE INDEX IF NOT EXISTS "Booking_assignedEmail_idx" ON "Booking"("assignedEmail");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
