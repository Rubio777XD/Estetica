-- PostgreSQL DDL generated manually to mirror prisma/schema.prisma
-- Run inside a migration or via psql when preparing the production database.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'SECRETARY', 'WORKER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'UNASSIGNED', 'ASSIGNED', 'CONFIRMED', 'COMPLETED', 'CANCELED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "User_role_idx" ON "User" ("role");

CREATE TABLE "Service" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "basePrice" NUMERIC(10, 2) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Service_active_idx" ON "Service" ("active");

CREATE TABLE "Appointment" (
    "id" TEXT PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" VARCHAR(5) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedPrice" NUMERIC(10, 2),
    "serviceId" TEXT NOT NULL,
    "assignedWorkerEmail" TEXT,
    "assignedWorkerId" TEXT,
    "confirmToken" TEXT UNIQUE,
    "confirmTokenExpiresAt" TIMESTAMPTZ,
    "assignedAt" TIMESTAMPTZ,
    "confirmedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "canceledAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Appointment_scheduledDate_idx" ON "Appointment" ("scheduledDate");
CREATE INDEX "Appointment_status_idx" ON "Appointment" ("status");
CREATE INDEX "Appointment_assignedWorkerEmail_idx" ON "Appointment" ("assignedWorkerEmail");
CREATE INDEX "Appointment_assignedWorkerId_idx" ON "Appointment" ("assignedWorkerId");
CREATE INDEX "Appointment_serviceId_scheduledDate_idx" ON "Appointment" ("serviceId", "scheduledDate");

CREATE TABLE "Payment" (
    "id" TEXT PRIMARY KEY,
    "appointmentId" TEXT NOT NULL UNIQUE,
    "amount" NUMERIC(10, 2) NOT NULL,
    "tip" NUMERIC(10, 2),
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "workerCommissionPct" NUMERIC(5, 4) NOT NULL DEFAULT 0.4000,
    "workerCommissionAmount" NUMERIC(10, 2) NOT NULL,
    "businessGain" NUMERIC(10, 2) NOT NULL,
    "paidAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "notes" TEXT,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Payment_paidAt_idx" ON "Payment" ("paidAt");

CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT UNIQUE,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER,
    "category" TEXT,
    "buyPrice" NUMERIC(10, 2) NOT NULL,
    "sellPrice" NUMERIC(10, 2),
    "expiresAt" DATE,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Product_active_idx" ON "Product" ("active");
CREATE INDEX "Product_category_idx" ON "Product" ("category");

CREATE TABLE "ProductUsage" (
    "id" TEXT PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" NUMERIC(10, 2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ProductUsage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductUsage_appointmentId_productId_key" UNIQUE ("appointmentId", "productId")
);

CREATE TABLE "UserInvite" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "role" "Role" NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,
    "invitedById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UserInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "UserInvite_email_idx" ON "UserInvite" ("email");
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite" ("expiresAt");
CREATE INDEX "UserInvite_role_idx" ON "UserInvite" ("role");

-- Optional: create triggers to keep "updatedAt" synchronized when using raw SQL updates.
