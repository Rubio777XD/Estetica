-- PostgreSQL DDL aligned with prisma/schema.prisma
-- Ejecutar dentro de una migración inicial o mediante psql.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');
CREATE TYPE "BookingStatus" AS ENUM ('scheduled', 'confirmed', 'done', 'canceled');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'transfer');

CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "User_role_idx" ON "User" ("role");

CREATE TABLE "Service" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Service_name_idx" ON "Service" ("name");

CREATE TABLE "Booking" (
    "id" TEXT PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Booking_startTime_idx" ON "Booking" ("startTime");
CREATE INDEX "Booking_status_idx" ON "Booking" ("status");
CREATE INDEX "Booking_serviceId_idx" ON "Booking" ("serviceId");

CREATE TABLE "Payment" (
    "id" TEXT PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Payment_createdAt_idx" ON "Payment" ("createdAt");
CREATE INDEX "Payment_method_idx" ON "Payment" ("method");

CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Product_name_idx" ON "Product" ("name");
CREATE INDEX "Product_stock_idx" ON "Product" ("stock");
