# Estética Platform – Landing, Dashboard y API sincronizados

Solución integral para administrar agendas, servicios y colaboradoras de un salón de belleza con landing pública, panel interno y API segura.

Plataforma pensada para equipos de estética que necesitan captar clientes desde la landing, operar citas y pagos en tiempo real y coordinar colaboradoras vía invitaciones temporales.

## Tabla de contenidos
- [Arquitectura (alto nivel)](#arquitectura-alto-nivel)
- [Módulos del sistema](#modulos-del-sistema)
- [Modelado de datos (Prisma)](#modelado-de-datos-prisma)
- [Flujo de negocio clave: Citas pendientes y asignación por invitación](#flujo-de-negocio-clave-citas-pendientes-y-asignacion-por-invitacion)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y arranque (desarrollo)](#instalacion-y-arranque-desarrollo)
- [API (referencia rápida)](#api-referencia-rapida)
- [Ejemplos prácticos (Thunder Client / cURL)](#ejemplos-practicos-thunder-client--curl)
- [Estándares de UI del Dashboard](#estandares-de-ui-del-dashboard)
- [CORS, cookies y seguridad](#cors-cookies-y-seguridad)
- [Despliegue (producción)](#despliegue-produccion)
- [Troubleshooting](#troubleshooting)
- [Auditoría y Pruebas](#auditoria-y-pruebas)
- [Pruebas manuales recomendadas](#pruebas-manuales-recomendadas)
- [Contribución y scripts útiles](#contribucion-y-scripts-utiles)
- [Roadmap y estado](#roadmap-y-estado)
- [Licencia y contacto](#licencia-y-contacto)

## Arquitectura (alto nivel)
```
Landing (Vite React, 3001)
    │
    ▼
Dashboard (Vite React, 3003)
    │  REST + cookie HttpOnly `salon_auth`
    │  SSE `/api/events`
    ▼
Backend API (Express, 3000) ───────────────▶ Neon/PostgreSQL
```
- Comunicación principal vía REST autenticado. El backend emite la cookie HttpOnly `salon_auth` (nombre configurable) y acepta el mismo token por header `Authorization` como respaldo.
- CORS permite orígenes `http://localhost:3001` y `http://localhost:3003` en desarrollo; en producción se recomienda servir todo bajo el mismo dominio y proxy reverso.
- Streaming en tiempo real con Server-Sent Events autenticados (`/api/events`) para invalidar datos de servicios, citas, inventario, pagos y métricas.
- Roles soportados: `ADMIN` y `EMPLOYEE`, mapeados al enum `Role` del esquema Prisma.

## Módulos del sistema
### Landing (`Landing/`, puerto 3001)
- Landing React (Vite) que consume `/api/public/services` para renderizar catálogo con descripciones, precios y duración.
- Detecta la cookie de sesión al montar (`fetchMe`) y habilita el botón **Ir al Dashboard**; si la URL incluye `?auth=dev`, redirige automáticamente al panel tras validar la sesión.
- Formulario de agendado con pickers nativos (`date`/`time`), validación básica y envío a `/api/public/bookings` usando cookies HttpOnly. Tras crear la cita, se emite `booking:created` y el Dashboard refresca **Citas pendientes** vía SSE.
- Permite login rápido (`/api/login`) con `credentials:"include"`, cierre de sesión (`/api/logout`) y navegación suave entre secciones lazy-loaded.

### Dashboard (`Dashboard/`, puerto 3003)
- Panel administrativo con guardia de sesión (`ensureSession`) y `apiFetch` centralizado que agrega `credentials:"include"` y despacha el evento `dashboard:unauthorized` ante cualquier 401.
- Inicia un `EventSource` contra `/api/events` con `withCredentials:true` para revalidar caches (`invalidateQuery`) ante eventos `service:*`, `booking:*`, `booking:assignment:*`, `payment:*`, `payments:invalidate`, `commission:created`, `product:*` y `stats:invalidate`.
- Secciones principales:
  - **Dashboard:** tablero centrado con tarjetas de "Citas de hoy", "Servicios más solicitados" y resúmenes compactos de próximas y pendientes.
  - **Servicios:** CRUD optimista con validaciones de duración/precio, campo opcional `description` (máx. 500 caracteres) y auto-refetch tras SSE.
  - **Citas próximas:** listado asignado que permite confirmar, editar precio con persistencia, registrar cobro y comisión en un modal de cobro y cancelar con confirmación explícita.
  - **Citas pendientes:** tabla paginada con columnas Cliente/Servicio/Fecha/Notas/Acciones, modal de asignación por correo, edición completa (cliente, servicio, fecha/hora, notas) con pickers nativos y cancelación con modal.
  - **Citas terminadas:** historial filtrable por rango con montos pagados (suma de `payments`).
  - **Pagos & Comisiones:** reporte filtrable por rango, totales del periodo, totales de comisión y exportación CSV lista para Excel.
  - **Inventario:** tabla full-width, resaltado de stock bajo y CRUD optimista que sincroniza métricas.
  - **Usuarios:** disponible solo para `ADMIN`, permite invitar personal con rol y contraseña inicial.

### Backend (`backend/`, puerto 3000)
- API Express + Prisma. Middleware `authJWT` lee la cookie `salon_auth` (o `SESSION_COOKIE_NAME`) y valida JWT (`JWT_SECRET`).
- `index.ts` centraliza rutas REST, validaciones con Zod y control de errores consistente (`HttpError`).
- SSE mediante `events.ts`: `/api/events` (autenticado) y `/api/public/events` para consumo sin sesión.
- Seguridad básica: rate limiting por IP para login, normalización de notas/emails, expiración de invitaciones pendientes y limpieza periódica (intervalos en memoria).
- Bootstrap: al arrancar garantiza un usuario administrador (`BOOTSTRAP_ADMIN_*`), crea seeds (`prisma/seed.ts`) y expone `PUBLIC_API_URL` para enlaces públicos de invitación.
- Nuevos endpoints para cierre y comisiones: `POST /bookings/:id/complete` ejecuta la transacción pago + comisión + `status=done`, `POST /commissions` permite registrar ajustes manuales, `GET /commissions` lista el reporte y `GET /commissions/export` entrega un CSV listo para Excel. Todos disparan SSE `commission:created` o invalidaciones de pagos/estadísticas.

## Modelado de datos (Prisma)
### Enums
- `Role`: `ADMIN`, `EMPLOYEE`.
- `BookingStatus`: `scheduled`, `confirmed`, `done`, `canceled`.
- `PaymentMethod`: `cash`, `transfer`.
- `AssignmentStatus`: `pending`, `accepted`, `declined`, `expired`.

### Modelos clave
- **User:** credenciales, nombre opcional y rol. Índices por correo.
- **Service:** nombre único, precio, duración (5–480 min), `description?` (hasta 500 caracteres), highlights y relación `booking`.
- **Booking:** referencia a `Service`, ventana `startTime`/`endTime`, estado, notas, campo `amountOverride?` para personalizar el monto final y asignación manual (`assignedEmail`, `assignedAt`).
- **Payment:** pagos vinculados a `Booking`, método y timestamps.
- **Commission:** registro calculado por cita (`percentage`, `amount`, `assigneeEmail?`, `createdAt`) vinculado a `Booking`.
- **Product:** inventario con umbral de stock bajo.
- **Assignment:** invitaciones por cita con `token` único, `expiresAt` y `status`.

### Relaciones (ERD textual)
- `User` (1) ── maneja sesión y no tiene relaciones directas con otras tablas de dominio.
- `Service` (1) ──< `Booking` (N).
- `Booking` (1) ──< `Payment` (N), `Commission` (N) y `Assignment` (N).
- `Assignment` pertenece a un `Booking`; al aceptar actualiza `Booking.assignedEmail/assignedAt`.

### Campos destacados
- `Booking.assignedEmail` / `assignedAt`: reflejan quién aceptó y cuándo.
- `Booking.amountOverride`: monto personalizado que sobrescribe el precio del servicio al registrar el cobro.
- `Assignment.token` y `expiresAt`: tokens firmados enviados por correo, vencen tras `ASSIGNMENT_EXPIRATION_HOURS` (24 h por defecto).
- `Commission.percentage` / `amount`: porcentaje y monto de comisión registrados cuando la cita se marca como realizada.

## Flujo de negocio clave: Citas pendientes y asignación por invitación
1. Al crear una cita, permanece sin asignar (`assignedEmail = null`).
2. En la vista **Citas pendientes**, el usuario ingresa un correo y dispara `POST /api/assignments` → crea invitación (`status: pending`, expira en 24 h) y envía correo con enlace `/api/assignments/accept?token=...`.
3. La tarjeta muestra badge "vence en X" mientras la invitación sigue vigente. Se puede cancelar (`DELETE /api/assignments/:id`), quedando `declined`.
4. Si la colaboradora acepta el enlace:
   - `Assignment` pasa a `accepted`.
   - `Booking.assignedEmail` y `assignedAt` se completan.
   - Las demás invitaciones pendientes expiran.
   - El backend emite SSE `booking:assignment:accepted` y `booking:updated` → el Dashboard refresca **Citas**, **Citas pendientes** y métricas.
5. Si no responde en 24 h, un job interno expira las invitaciones y emite `booking:assignment:expired`, devolviendo la cita al listado "sin asignar".

### Flujo Pendientes → Próximas → Terminadas
1. Toda cita nueva entra en **Citas pendientes** (`assignedEmail = null`, `status` `scheduled`/`confirmed`).
2. Al asignarse (aceptación de invitación o asignación manual futura), el SSE `booking:assignment:accepted` actualiza el listado y la cita aparece en **Citas próximas**.
3. En **Citas próximas** se puede ajustar `amountOverride`, confirmar la cita o abrir el modal de cobro. Al confirmar el cobro se llama a `POST /bookings/:id/complete`, que crea el pago, registra la comisión y cambia el estado a `done` dentro de una misma transacción.
4. Las citas completadas salen de próximas y pasan a **Citas terminadas**, actualizando métricas y el reporte de Pagos & Comisiones.
5. Cancelar desde pendientes o próximas emite `booking:status` con `canceled`, removiendo la cita del flujo.

## Variables de entorno
### Backend (`backend/.env.example`)
```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST-POOLER/estetica_dev
DIRECT_URL=postgresql://USER:PASSWORD@HOST/estetica_dev
SHADOW_DATABASE_URL=postgresql://USER:PASSWORD@HOST/estetica_shadow
JWT_SECRET=super_clave_segura
SESSION_COOKIE_NAME=salon_auth
SESSION_COOKIE_DOMAIN=
PUBLIC_API_URL=http://localhost:3000
PUBLIC_LANDING_URL=http://localhost:3001
PUBLIC_DASHBOARD_URL=http://localhost:3003
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
MAIL_FROM="JR Studio <no-reply@example.com>"
MAIL_TIME_ZONE=America/Tijuana
RESEND_API_KEY=
RESEND_API_URL=https://api.resend.com
ASSIGNMENT_EXPIRATION_HOURS=24
```
Notas:
- Usa el endpoint **pooler** de Neon en `DATABASE_URL` para la API y el directo en `DIRECT_URL`/`SHADOW_DATABASE_URL`.
- La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` solo si `NODE_ENV=production`. Configura `SESSION_COOKIE_DOMAIN` únicamente bajo HTTPS real.
- Si no defines SMTP ni Resend, el mailer simula envíos y los registra en consola.

### Dashboard y Landing (Vite)
`Landing/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_PUBLIC_DASHBOARD_URL=http://localhost:3003
```
`Dashboard/.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_PUBLIC_LANDING_URL=http://localhost:3001
```
En producción, apunta estas URLs al dominio público (sin slash final). Habilita `Secure=true` en la cookie solo tras publicar bajo HTTPS.

## Instalación y arranque (desarrollo)
### Requisitos
- Node.js ≥ 18 (para `fetch` nativo y Vite).
- npm 9+ (o pnpm/yarn equivalentes).
- Cuenta en Neon con dos bases: `estetica_dev` y `estetica_shadow` (vacía).

### Paso a paso
```bash
# Backend
cd backend
npm install

# Generar baseline inicial (Neon)
# crea prisma/migrations/YYYYMMDDHHMMSS_baseline/migration.sql
npm run prisma:baseline
# o en PowerShell: npm run prisma:baseline:ps

# Marca la baseline como aplicada en la base actual
npx prisma migrate resolve --applied <timestamp_baseline>

# Ejecuta migraciones y genera cliente
npm run prisma:migrate

# (Opcional) seed demo
npm run prisma:seed

# Servidor API (http://localhost:3000)
npm run dev
```
En otra terminal:
```bash
# Landing (http://localhost:3001)
cd Landing
npm install
npm run dev -- --port 3001

# Dashboard (http://localhost:3003)
cd ../Dashboard
npm install
npm run dev -- --port 3003
```

### Tabla de puertos
| Servicio   | Ruta local                      | Descripción |
|------------|---------------------------------|-------------|
| Backend    | http://localhost:3000           | API Express/SSE |
| Landing    | http://localhost:3001           | Sitio público |
| Dashboard  | http://localhost:3003           | Panel interno |

> ⚠️ No ejecutes `prisma migrate reset` en producción: borra la base completa. Usa solo `prisma migrate deploy` en entornos con datos reales.

## API (referencia rápida)
### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Genera cookie HttpOnly y devuelve `{ token }` informativo.
| GET | `/api/me` | Devuelve usuario autenticado.
| POST | `/api/logout` | Elimina cookie.
| GET | `/api/health` | Ping de estado.

### Servicios
`GET /api/public/services` (sin sesión) lista servicios públicos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/services` | Lista completa (requiere sesión).
| POST | `/api/services` | Crea servicio (nombre ≤ 100, precio > 0, duración 5–480, `description?` ≤ 500).
| PUT | `/api/services/:id` | Actualiza con las mismas reglas.
| DELETE | `/api/services/:id` | Borra (protege contra servicios con citas).

#### Servicios con descripción

- El modelo `Service` expone `description?: string | null` (campo opcional). El esquema Prisma ya incluía la columna, por lo que no fue necesaria una nueva migración.
- Los endpoints `POST /api/services` y `PUT /api/services/:id` aceptan `description?` (hasta 500 caracteres); el backend normaliza cadenas vacías a `null`.
- El Dashboard permite capturar y editar la descripción (se muestra resumida con tooltip) y la landing pública la renderiza en el catálogo de servicios.

### Citas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/bookings?from=&to=&status=&limit=` | Filtra por fecha, estado y límite (default 100). Expira invitaciones vencidas antes de responder.
| GET | `/api/bookings/unassigned` | Citas sin `assignedEmail`, con últimas 5 invitaciones.
| POST | `/api/bookings` | Crea cita autenticada, recalculando `endTime` según duración del servicio.
| POST | `/api/public/bookings` | Crea cita desde la landing sin sesión (usa `clientName`, `serviceId`, `startTime`, `notes?`).
| PUT | `/api/bookings/:id` | Actualiza cita (incluye estado opcional).
| PATCH | `/api/bookings/:id/status` | Cambia estado puntual.
| DELETE | `/api/bookings/:id` | Elimina cita.

### Invitaciones y asignaciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/assignments` | Crea invitación con vencimiento (24 h por defecto).
| DELETE | `/api/assignments/:id` | Marca invitación como `declined`.
| GET | `/api/assignments/accept?token=` | Endpoint público para aceptación; actualiza cita y emite SSE.

### Pagos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/payments?from=&to=` | Lista pagos (máx. 200) y total del rango.
| POST | `/api/payments` | Registra pago (requiere cita existente).
| POST | `/api/bookings/:id/complete` | Registra pago, comisión y marca la cita como `done` en una sola transacción.
| POST | `/api/commissions` | Crea un registro de comisión manual asociado a una cita.
| GET | `/api/commissions?from=&to=` | Reporte paginado de pagos y comisiones filtrado por fecha.
| GET | `/api/commissions/export?from=&to=` | Descarga CSV listo para Excel con los mismos campos del reporte.

### Inventario
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Lista inventario.
| GET | `/api/products/low-stock` | Solo productos en o bajo umbral.
| POST | `/api/products` | Crea producto.
| PUT | `/api/products/:id` | Actualiza precio/stock/umbral.
| DELETE | `/api/products/:id` | Elimina producto.

### Métricas y usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/stats/overview` | Conteos del día, ingresos del mes, top servicios y stock bajo.
| GET | `/api/stats/revenue?from=&to=` | Serie diaria de ingresos.
| GET | `/api/users` | Solo ADMIN. Lista usuarios.
| POST | `/api/users` | Solo ADMIN. Alta de usuario con rol.

### Eventos en tiempo real
- `GET /api/events` (autenticado) y `GET /api/public/events` (sin sesión).
- Eventos emitidos: `service:created|updated|deleted`, `booking:created|updated|deleted|status`, `booking:assignment:sent|accepted|expired|cancelled`, `payment:created`, `payments:invalidate`, `product:created|updated|deleted`, `stats:invalidate`, `ping` (heartbeat).

## Ejemplos prácticos (Thunder Client / cURL)
Guarda cookies entre peticiones (Thunder Client → **Save Cookies** o usa `-c/-b` en cURL).

```bash
# Login y guardado de cookie
curl -i -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estetica.mx","password":"changeme123"}'

# Obtener sesión actual
curl -b cookies.txt http://localhost:3000/api/me

# Crear servicio
curl -b cookies.txt -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Peinado editorial","price":550,"duration":75}'

# Crear cita (usa ID real de servicio)
curl -b cookies.txt -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"María López","serviceId":"<serviceId>","startTime":"2025-03-15T17:00:00.000-08:00","notes":"Prefiere esmalte rojo"}'

# Listar citas sin asignar
curl -b cookies.txt http://localhost:3000/api/bookings/unassigned

# Enviar invitación de asignación
curl -b cookies.txt -X POST http://localhost:3000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"<bookingId>","email":"colaboradora@example.com"}'

# Aceptar invitación (desde navegador o curl)
curl "http://localhost:3000/api/assignments/accept?token=<token>"
```

## Estándares de UI del Dashboard
- Mantén tipografías y espaciados consistentes con los componentes ShadCN (botones, badges, cards).
- Tablas de inventario y listados deben ocupar todo el ancho disponible; alinear botones como "+ Nuevo producto" con la cabecera.
- Usa badges/chips para estados (`scheduled`, `confirmed`, etc.) con códigos de color existentes.
- Evita contenedores estrechos: prioriza diseños responsivos con `grid`/`flex`.

## CORS, cookies y seguridad
- Orígenes permitidos en desarrollo: `http://localhost:3001` y `http://localhost:3003` con `credentials:true`.
- La cookie `salon_auth` es `HttpOnly` y `SameSite=Lax`; en producción debe emitirse con `Secure=true` (requiere HTTPS).
- Los roles `ADMIN` y `EMPLOYEE` gobiernan acceso a rutas (usuarios solo ADMIN). Maneja JWTs exclusivamente desde el backend; no exponerlos en el frontend.

## Despliegue (producción)
1. Construye frontends con `npm run build` en `Landing/` y `Dashboard/`.
2. Despliega la API en un entorno Node (PORT=3000) detrás de un proxy que rote `/api` y preserve `X-Forwarded-*`.
3. Sirve los bundles de Vite como archivos estáticos (por ejemplo, desde el mismo proxy o CDN).
4. Configura HTTPS en el dominio y habilita `SESSION_COOKIE_DOMAIN`, `NODE_ENV=production` y `Secure=true` para la cookie.
5. Ajusta variables `PUBLIC_API_URL`, `PUBLIC_LANDING_URL`, `PUBLIC_DASHBOARD_URL` al dominio público.
6. Usa Neon para la base productiva (rama/branch correspondiente) y ejecuta `prisma migrate deploy` antes de liberar.
7. Checklist post deploy:
   - [ ] Login y `/api/me` responden 200.
   - [ ] SSE `/api/events` conecta desde el dashboard (revisa consola de red).
   - [ ] Landing muestra servicios públicos.
   - [ ] Invitación por correo llega o se loguea en consola (modo mock).

## Troubleshooting
- **Prisma P3006 / P1014:** revisa que `estetica_shadow` esté vacía y que `DIRECT_URL` apunte al endpoint directo antes de `prisma:migrate`.
- **Baseline vacía:** ejecuta `npm run prisma:baseline` y luego `npx prisma migrate resolve --applied <id>`.
- **PowerShell no interpreta `--to-url`:** usa `npm run prisma:baseline:ps`.
- **Cookie no se guarda:** verifica que las peticiones usen `credentials: 'include'`, que el dominio coincida y que no forces `Secure` en HTTP.
- **401 recurrente:** cuando `apiFetch` detecta 401, el Dashboard redirige a la Landing. Revisa expiración del token o diferencias de dominio.
- **SSE sin refresco:** asegúrate de que el dashboard abra `EventSource` con `withCredentials` y que no haya bloqueos de CORS.
- **Correos no llegan:** sin SMTP/Resend configurado se registran en consola. Proporciona credenciales válidas o usa Resend.
- **Puertos ocupados:** cambia puerto con `npm run dev -- --port XXXX` o libera procesos (`lsof -i :3000`).

## Auditoría y Pruebas

### Comandos rápidos

```bash
cd backend
npx prisma migrate status
npm run audit:db
npm run smoke:e2e
```

- `npx prisma migrate status`: confirma que todas las migraciones Prisma estén aplicadas en la base actual.
- `npm run audit:db`: ejecuta `scripts/db-audit.ts`, que valida la presencia de tablas críticas, nullable/ defaults esperados (`Service.description`, `Booking.amountOverride`, `User.role`), índices en `Assignment`, `Booking` y `Commission`, y reglas `ON DELETE CASCADE`. El script crea una cita temporal para comprobar cascadas reales; si falla, ajusta el esquema (`schema.prisma`) y genera una migración.
- `npm run smoke:e2e`: corre `scripts/e2e-smoke.ts`. Inicia sesión (usa `SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD` si los defines), crea o reutiliza un servicio, genera una cita pendiente, envía invitación y la acepta, aplica override de precio, completa la cita (pago + comisión), consulta el reporte y valida la exportación CSV. Errores aquí implican revisar endpoints/validaciones.

Cuando agregues campos nuevos, ejecuta `npx prisma migrate dev --name <fix>` para generar la migración; en producción aplica con `npm run prisma:migrate`.

## Pruebas manuales recomendadas
1. **Landing → Dashboard:** desde la Landing crea una cita nueva; debe verse en el Dashboard en **Citas pendientes** (SSE o refetch manual).
2. **Asignación y próximas:** envía invitación desde la tarjeta pendiente y acepta el enlace; la cita pasa a **Citas próximas** con `assignedEmail` visible.
3. **Cobro completo:** en próximas aplica override (p. ej. 300) y completa la cita con pago `cash` y comisión 50 %. La cita debe moverse a **Terminadas**, generar `Payment` y `Commission` y actualizar totales.
4. **Reporte Pagos & Comisiones:** abre la sección correspondiente, filtra por rango del día y confirma totales + fila de la cita; prueba el botón **Exportar CSV** y ábrelo en Excel.
5. **Landing pública:** valida que `/api/public/services` muestre descripciones y que la Landing refleje los cambios de servicios.

## Contribución y scripts útiles
- Backend:
  - `npm run dev` – servidor Express con recarga (`ts-node-dev`).
  - `npm run build` / `npm run start` – compilación TS y arranque en producción.
  - `npm run prisma:migrate` – `prisma migrate dev`.
  - `npm run prisma:reset` – resetea base (solo desarrollo).
  - `npm run prisma:seed` – ejecuta `prisma/seed.ts`.
  - `npm run prisma:baseline` / `npm run prisma:baseline:ps` – generan baseline desde esquema actual.
- Frontends (`Landing/`, `Dashboard/`): `npm run dev` y `npm run build`.
- Convenciones: usa commits descriptivos (`feat:`, `fix:`, `docs:`) y PRs con resumen de alcance + pasos de prueba manual.

## Roadmap y estado
No hay roadmap público en el repositorio. Abre un issue para proponer mejoras o nuevas funcionalidades.

## Licencia y contacto
Licencia no especificada. Para dudas o soporte abre un issue en GitHub o contacta al equipo interno responsable del salón.
