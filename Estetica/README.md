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
- Inicia un `EventSource` contra `/api/events` con `withCredentials:true` para revalidar caches (`invalidateQuery`) ante eventos `service:*`, `booking:*`, `booking:assignment:*`, `payment:*`, `payments:invalidate`, `product:*` y `stats:invalidate`.
- Secciones principales:
  - **Dashboard:** tarjetas de métricas (`/api/stats/overview`) y gráfica de ingresos (`/api/stats/revenue`).
  - **Servicios:** CRUD optimista con validaciones de duración/precio, campo opcional `description` (máx. 500 caracteres) y auto-refetch tras SSE.
  - **Citas próximas:** muestra programadas/confirmadas con confirmación rápida, registro de pago + cambio a realizado, edición local del monto y cancelación con modal.
  - **Citas terminadas:** historial filtrable por rango con montos pagados (suma de `payments`).
  - **Citas pendientes:** listado de citas sin `assignedEmail`, envío/cancelación de invitaciones, badge con vencimiento relativo y refresco en vivo cuando una invitación se acepta o expira.
  - **Pagos & Comisiones:** registro de pagos con selección rápida de citas confirmadas/realizadas y resumen de montos.
  - **Inventario:** tabla full-width, resaltado de stock bajo y CRUD optimista que sincroniza métricas.
  - **Usuarios:** disponible solo para `ADMIN`, permite invitar personal con rol y contraseña inicial.

### Backend (`backend/`, puerto 3000)
- API Express + Prisma. Middleware `authJWT` lee la cookie `salon_auth` (o `SESSION_COOKIE_NAME`) y valida JWT (`JWT_SECRET`).
- `index.ts` centraliza rutas REST, validaciones con Zod y control de errores consistente (`HttpError`).
- SSE mediante `events.ts`: `/api/events` (autenticado) y `/api/public/events` para consumo sin sesión.
- Seguridad básica: rate limiting por IP para login, normalización de notas/emails, expiración de invitaciones pendientes y limpieza periódica (intervalos en memoria).
- Bootstrap: al arrancar garantiza un usuario administrador (`BOOTSTRAP_ADMIN_*`), crea seeds (`prisma/seed.ts`) y expone `PUBLIC_API_URL` para enlaces públicos de invitación.

## Modelado de datos (Prisma)
### Enums
- `Role`: `ADMIN`, `EMPLOYEE`.
- `BookingStatus`: `scheduled`, `confirmed`, `done`, `canceled`.
- `PaymentMethod`: `cash`, `transfer`.
- `AssignmentStatus`: `pending`, `accepted`, `declined`, `expired`.

### Modelos clave
- **User:** credenciales, nombre opcional y rol. Índices por correo.
- **Service:** nombre único, precio, duración (5–480 min), `description?` (hasta 500 caracteres), highlights y relación `booking`.
- **Booking:** referencia a `Service`, ventana `startTime`/`endTime`, estado, notas y asignación manual (`assignedEmail`, `assignedAt`).
- **Payment:** pagos vinculados a `Booking`, método y timestamps.
- **Product:** inventario con umbral de stock bajo.
- **Assignment:** invitaciones por cita con `token` único, `expiresAt` y `status`.

### Relaciones (ERD textual)
- `User` (1) ── maneja sesión y no tiene relaciones directas con otras tablas de dominio.
- `Service` (1) ──< `Booking` (N).
- `Booking` (1) ──< `Payment` (N) y `Assignment` (N).
- `Assignment` pertenece a un `Booking`; al aceptar actualiza `Booking.assignedEmail/assignedAt`.

### Campos destacados
- `Booking.assignedEmail` / `assignedAt`: reflejan quién aceptó y cuándo.
- `Assignment.token` y `expiresAt`: tokens firmados enviados por correo, vencen tras `ASSIGNMENT_EXPIRATION_HOURS` (24 h por defecto).

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

## Pruebas manuales recomendadas
1. **Flujo E2E:** crea cita → verifica en Citas → envía invitación → acepta token → confirma que `assignedEmail` aparece y métricas se actualizan.
2. **Expiración forzada:** modifica `ASSIGNMENT_EXPIRATION_HOURS` a 1 y reinicia backend para comprobar badge "vence" y expiración automática.
3. **Inventario:** CRUD completo y verificación de ancho completo en la tabla.
4. **Pagos:** registra pago y valida actualización de totales + gráfica.
5. **Sesión:** fuerza un 401 (borrar cookie) y confirma redirección automática a la Landing.

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
