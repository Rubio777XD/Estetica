# Database Design Summary

## A. Prisma schema
- Fuente principal: [`schema.prisma`](./schema.prisma). Datasource configurado para PostgreSQL mediante `DATABASE_URL`.
- Modelos activos:
  - **User** → `id`, `email`, `passwordHash`, `name`, `role` (`ADMIN`, `EMPLOYEE`, `CLIENT`), `createdAt`, `updatedAt`.
  - **Service** → catálogo con `name`, `price`, `duration` (minutos) e índices por nombre.
  - **Booking** → agenda de citas (`clientName`, `serviceId`, `startTime`, `endTime`, `status`, `notes`) relacionada con `Service`.
  - **Payment** → pagos asociados a una cita (`bookingId`, `amount`, `method`) con índice por `createdAt` y `method`.
  - **Product** → inventario (`stock`, `lowStockThreshold`, `price`) para alertas de bajo inventario.
- Enums:
  - `Role`: `ADMIN`, `EMPLOYEE`, `CLIENT`.
  - `BookingStatus`: `scheduled`, `confirmed`, `done`, `canceled`.
  - `PaymentMethod`: `cash`, `transfer`.

## B. PostgreSQL DDL
- Espejo manual en [`postgres-ddl.sql`](./postgres-ddl.sql) y migración inicial [`20250101000000_business_modules`](./migrations/20250101000000_business_modules/migration.sql).
- La migración crea índices para filtros frecuentes: `User_role_idx`, `Service_name_idx`, `Booking_startTime_idx`, `Booking_status_idx`, `Payment_createdAt_idx`, `Product_stock_idx`.

## C. Seed y bootstrap
- [`seed.ts`](./seed.ts) crea servicios de ejemplo, productos y citas con pagos para métricas.
- El `seed` asegura `admin@estetica.mx` (`Role.ADMIN`).
- El servidor (`backend/src/index.ts`) ejecuta `ensureCoreData()` al arrancar; garantiza que exista al menos un administrador (`BOOTSTRAP_ADMIN_EMAIL`, contraseña aleatoria si no se define) y reporta el resultado en consola.

## D. Integridad y validaciones
- Todas las FK usan `ON DELETE RESTRICT` salvo `Payment.bookingId` (`CASCADE`).
- Los endpoints Express envuelven las respuestas en `{ success, message, data }` y validan entradas con Zod. Las operaciones críticas (crear usuario admin, servicios, etc.) propagan errores detallados si hay violaciones de unicidad (`P2002`) o FK.
- El backend registra y limita intentos de login, elimina sesiones inválidas y siempre responde en JSON uniforme.

## E. Mapeo Frontend ↔ Backend
- **Landing** consulta `/api/me`; si detecta sesión (`salon_auth`) muestra “Ir al Dashboard” y respeta `?auth=dev` para redirección automática.
- **Dashboard** consume `/api/services`, `/api/bookings`, `/api/payments`, `/api/products` y `/api/users` (sólo ADMIN) usando el helper `apiFetch` con `credentials: 'include'`.
- El nuevo módulo de usuarios permite a administradores crear cuentas (`ADMIN`, `EMPLOYEE`, `CLIENT`) directamente desde `/api/users` sin scripts manuales.
