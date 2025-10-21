# Database Design Proposal

## A. Prisma schema
- Source of truth: [`schema.prisma`](./schema.prisma). The datasource is configured for SQLite in development to simplify onboarding.
- Models cover: `User`, `Service`, `Appointment`, `Payment`, `Product`, `ProductUsage`, and `UserInvite`, plus enums for roles, appointment status, and payment methods.

## B. PostgreSQL DDL
- Equivalent hand-crafted DDL ready for a managed Postgres (e.g., Neon) lives in [`postgres-ddl.sql`](./postgres-ddl.sql).
- Apply with `psql -f postgres-ddl.sql` or copy/paste into an initial migration before running Prisma migrations in production.

## C. Mini-ERD (ASCII)
```
[User] <------ invites ------ [UserInvite]
  ^  \
  |   \ assigns                token (unique)
  |    \
  |     > assignedWorkerId
  |      \
[Appointment] ---- belongsTo ---- [Service]
     |  \
     |   \ has payment (1:1)
     |    \
     |     [Payment]
     |
     +-- uses --> [ProductUsage] -- belongsTo --> [Product]
```

## D. Seed data (`prisma/seed.ts`)
- Inserts one admin, one secretary, and one worker (hashed password `password123`).
- Creates three flagship services (Extensiones clásicas, Volumen ruso, Manicura con gel) with durations and base prices aligned with the booking form options.
- Populates representative inventory items (adhesivo premium, pads de gel, limpiador, primer, microbrushes, máscaras desechables).
- Adds two placeholder appointments to demonstrate pending vs. assigned/confirmed flows, including sample product usage and payment record for reporting smoke tests.
- Seeds remain idempotent via `upsert`/`createMany` with `skipDuplicates`.

Run with `npm run prisma:seed` (configured to execute `prisma db seed`).

## E. Index inventory & justification
| Index | Purpose |
| --- | --- |
| `User_role_idx` | Fast filtering by role inside the dashboard user management view. |
| `Service_active_idx` | Keep catalog queries responsive while hiding inactive services. |
| `Appointment_scheduledDate_idx` | Powers “Hoy” and range filters (7/14/30 días). |
| `Appointment_status_idx` | Drives status columns (Pendientes, Próximas, Hoy). |
| `Appointment_assignedWorkerEmail_idx` | Lookups when assigning/reassigning citas por correo. |
| `Appointment_assignedWorkerId_idx` | Worker dashboards once authenticated. |
| `Appointment_serviceId_scheduledDate_idx` | Combined filter for reporting (servicio + día). |
| `Payment_paidAt_idx` | Speeds up revenue & comisión summaries by date. |
| `Product_active_idx` | Filter out descontinuados en inventario. |
| `Product_category_idx` | Helps category/group filters and minimum stock reports. |
| `ProductUsage_appointmentId_productId_key` | Guarantees a product is tracked once per cita (editable quantity). |
| `UserInvite_email_idx` | Prevents duplicate invitations and eases lookups. |
| `UserInvite_expiresAt_idx` | Cron job to expire invitations quickly. |
| `UserInvite_role_idx` | Reporting by rol invitado. |

## F. Frontend mapping (campo → componente)
- **Landing / BookingSection / BookingForm.tsx** → `Appointment.clientName`, `clientEmail`, `clientPhone`, `serviceId`, `scheduledDate`, `scheduledTime`, `estimatedPrice`.
- **Landing / LuxuryHeader login modal** → `User.email`, `User.passwordHash` (validated by auth layer, not stored here), `User.role`.
- **Dashboard / Citas** → Lists `Appointment.status`, `scheduledDate`, `scheduledTime`, `service.name`, `assignedWorkerEmail`, `assignedWorkerId`, `confirmToken` (for resend), `estimatedPrice`, `Payment.amount`, `ProductUsage` summary.
- **Dashboard / Pagos & Comisiones** → `Payment.amount`, `tip`, `workerCommissionPct`, `workerCommissionAmount`, `businessGain`, `paidAt`, with relations to `Appointment.clientName` and `assignedWorker`.
- **Dashboard / Inventario** → `Product` fields (`stock`, `minStock`, `category`, `buyPrice`, `sellPrice`, `expiresAt`, `location`, `active`) and `ProductUsage` for history.
- **Dashboard / Usuarios** → `User` (list), `UserInvite` (pending invitations, expiration), `role`.

## G. Migration notes (SQLite dev → Neon/Postgres prod)
1. **Local dev**: `DATABASE_URL="file:./dev.db"` (default). Run `npx prisma migrate dev` to create the SQLite file.
2. **Prepare Postgres**: Provision a Neon database. Copy the connection string into `.env` as `DATABASE_URL`.
3. **Switch provider**: Update `datasource db` in `schema.prisma` to `provider = "postgresql"` (commit the change or maintain a separate production branch). Regenerate the client (`npm run prisma:generate`).
4. **Deploy migrations**:
   - Option A: Use Prisma migration history (`prisma migrate deploy`).
   - Option B: Apply [`postgres-ddl.sql`](./postgres-ddl.sql) once, then run `prisma db push` to align metadata (if migrations were not generated previously).
5. **Re-seed**: Run `npm run prisma:seed` against Postgres to populate baseline data.
6. **CI/CD reminder**: Ensure build pipeline sets `DATABASE_URL` and runs `prisma generate` before building the backend.

