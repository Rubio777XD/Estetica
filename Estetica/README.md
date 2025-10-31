# Estética – Landing, Dashboard y API con sesión por cookie HttpOnly

## Arquitectura
- **Landing (`Landing/`, puerto 3001 en dev):** sitio público optimizado para performance. Redirige al Dashboard tras un login satisfactorio, detecta la cookie `salon_auth` para mostrar el botón **"Ir al Dashboard"** y respeta la query `?auth=dev` para redirigir automáticamente sin reloguear.
- **Dashboard (`Dashboard/`, puerto 3003 en dev):** panel interno con guard de sesión. Consume la API mediante el helper `apiFetch` (incluye cookies y maneja 401 redirigiendo a la Landing).
- **API (`backend/`, puerto 3000):** Express + Prisma sobre PostgreSQL. La cookie HttpOnly (`salon_auth` por defecto) es la fuente de verdad; si existe un header `Authorization` se acepta para compatibilidad pero se prioriza la cookie. Al arrancar valida que exista al menos un administrador (`BOOTSTRAP_ADMIN_EMAIL`) y crea uno con contraseña temporal si es necesario. En producción se sirve detrás de un proxy bajo el mismo dominio (`/api`).

## Variables de entorno
### Backend (`backend/.env`)
```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=clave_super_segura
SESSION_COOKIE_NAME=salon_auth
SESSION_COOKIE_DOMAIN= # opcional, establece el dominio en producción
BOOTSTRAP_ADMIN_EMAIL=admin@local.dev # opcional
BOOTSTRAP_ADMIN_NAME=Administrador Autogenerado # opcional
BOOTSTRAP_ADMIN_PASSWORD= # opcional (aleatoria si se omite)
```
- En desarrollo la cookie se emite con `Secure=false`, `SameSite=Lax` y `HttpOnly=true`. En producción el proxy debe estar en HTTPS para habilitar `Secure=true`.

### Dashboard (`Dashboard/.env`)
```env
VITE_API_URL=http://localhost:3000
VITE_PUBLIC_LANDING_URL=http://localhost:3001
```

### Landing (`Landing/.env`)
```env
VITE_API_URL=http://localhost:3000
VITE_PUBLIC_DASHBOARD_URL=http://localhost:3003
```

## Base de datos y Prisma
Modelos principales (ver `backend/prisma/schema.prisma`):
- **Service:** `id`, `name`, `price`, `duration`, `description?`, `imageUrl?`, `highlights[]`, `createdAt`, `updatedAt`.
- **Booking:** `id`, `clientName`, `serviceId`, `startTime`, `endTime`, `status` (`scheduled`, `confirmed`, `done`, `canceled`), `notes`, `createdAt`, `updatedAt`.
- **Payment:** `id`, `bookingId`, `amount`, `method` (`cash`, `transfer`), `createdAt`.
- **Product:** `id`, `name`, `price`, `stock`, `lowStockThreshold`, `createdAt`, `updatedAt`.
- **User:** credenciales para login administrativo (seed crea `admin@estetica.mx`). Roles permitidos: `ADMIN`, `EMPLOYEE`, `CLIENT`.

### Migraciones y seed
```bash
cd backend
npm install
npm run prisma:migrate      # aplica migraciones (usa DATABASE_URL)
npm run prisma:seed         # inserta datos demo (servicios, citas, pagos, productos)
```
- **Reset rápido:** `npx prisma migrate reset` (borra y recrea la BD, vuelve a ejecutar el seed).
- El seed crea: 5 servicios, 7 citas recientes repartidas por estado, 2 pagos y 4 productos (3 de ellos en stock bajo).

## Puesta en marcha en desarrollo
```bash
# Backend
cd backend
npm run dev

# Landing
cd ../Landing
npm install
npm run dev -- --port 3001

# Dashboard
cd ../Dashboard
npm install
npm run dev -- --port 3003
```
- El backend expone CORS sólo para `http://localhost:3001` y `http://localhost:3003` con `credentials: true`.
- Al iniciar el backend verás logs `[bootstrap] administrador creado` si se generó uno nuevo; la contraseña temporal se imprime una única vez.
- El Dashboard redirige a la Landing si cualquier petición devuelve 401 (`apiFetch` emite el evento `dashboard:unauthorized`).

## Endpoints principales
Todas las respuestas son JSON y requieren sesión (excepto `/api/health`, `/api/login` y `/api/logout`). Validaciones con Zod. Cada
respuesta exitosa sigue el sobre `{ success, message, data }` y replica las propiedades históricas (`services`, `bookings`, etc.)
para compatibilidad con los clientes existentes.

### Público
- `GET /api/public/services` → Catálogo abierto ordenado por nombre. Incluye descripción, duración (minutos), precio y
  `highlights[]` para renderizar la landing.
- `GET /api/public/events` → Stream SSE (Server-Sent Events) sin autenticación que emite `service:created|updated|deleted` para
  invalidar datos en el cliente público.

### Autenticación
- `POST /api/login` → Body `{ email, password }`. Devuelve `{ token }` (sólo informativo) y envía cookie HttpOnly. Rate limit: 5 intentos/IP/min.
- `GET /api/me` → `{ user: { id, email, name, role } }` o 401.
- `POST /api/logout` → 204 y limpia la cookie.
- `GET /api/health` → público.

### Servicios
| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/services` | Lista ordenada por nombre. |
| POST | `/api/services` | Crea servicio. Body: `{ name, price, duration }`. |
| PUT | `/api/services/:id` | Actualiza servicio. |
| DELETE | `/api/services/:id` | Elimina servicio (409 si hay citas asociadas). |

### Citas (Bookings)
- `GET /api/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD&status=scheduled|confirmed|done|canceled&limit=200`
  - Filtra por rango (en zona `America/Tijuana`) y estado. Devuelve `{ bookings: Booking[] }` con `service` y `payments` embebidos.
- `POST /api/bookings`
  ```json
  {
    "clientName": "María López",
    "serviceId": "svc_123",
    "startTime": "2025-03-15T17:00:00.000-08:00",
    "notes": "Prefiere esmalte rojo"
  }
  ```
  Calcula `endTime` usando la duración del servicio y crea con estado `scheduled`.
- `PUT /api/bookings/:id` → Actualiza cliente, servicio, fecha/hora y notas (recalcula `endTime`).
- `PATCH /api/bookings/:id/status` → Body `{ status }` con los valores del enum.
- `DELETE /api/bookings/:id` → Borra la cita.

### Pagos
- `GET /api/payments?from=&to=` → Devuelve `{ payments: [...], totalAmount }`. Cada pago incluye `booking.service` para mostrar contexto.
- `POST /api/payments` → Body `{ bookingId, amount, method }`. Permite múltiples pagos por cita.

### Inventario (Products)
| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/products` | Lista completa. |
| GET | `/api/products/low-stock` | Productos con `stock <= lowStockThreshold`. |
| POST | `/api/products` | Crea producto `{ name, price, stock, lowStockThreshold }`. |
| PUT | `/api/products/:id` | Actualiza cantidades/precio. |
| DELETE | `/api/products/:id` | Borra producto. |

### Tiempo real
- `GET /api/events` → SSE autenticado (`withCredentials`). Emite `service:*`, `booking:*`, `payment:created`,
  `payments:invalidate`, `product:*` y `stats:invalidate` para que el dashboard refresque automáticamente queries y métricas.

### Usuarios (sólo ADMIN)
| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/users` | Lista usuarios registrados con rol y fecha de creación. |
| POST | `/api/users` | Crea usuario `{ email, password, role, name? }`. Valida duplicados y asigna roles `ADMIN`, `EMPLOYEE` o `CLIENT`. |

### Métricas
- `GET /api/stats/overview` →
  ```json
  {
    "todayBookings": { "scheduled": 2, "confirmed": 1, "done": 3, "canceled": 1 },
    "monthlyRevenue": 1100,
    "topServices": [ { "serviceId": "...", "name": "Extensión clásica", "count": 4 } ],
    "lowStockProducts": 3
  }
  ```
- `GET /api/stats/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ series: [{ date: ISOString, amount }] }` para gráficas diarias.

## Dashboard: módulos y revalidación
- **Servicios:** CRUD en modales. Actualiza la UI de forma optimista y, gracias al SSE, fuerza la revalidación automática de `services`, métricas y agendas relacionadas.
- **Citas:** filtros rápidos (hoy, semana, todos) + cambio de estado, edición y borrado. Uso de actualizaciones optimistas y revalidación de todas las variantes (`bookings:time:status`, métricas y gráfica de ingresos).
- **Pagos:** permite filtrar por fecha, ver total y registrar pagos (afecta `/api/payments`, métricas y gráfica). Formulario validado.
- **Inventario:** tabla con resalte para stock bajo y filtro rápido. CRUD optimista + revalidación de métricas.
- **Dashboard inicial:** tarjetas con citas del día, ingresos del mes, stock bajo y servicios top, además de gráfica diaria.

Cualquier 401 en una petición provoca el evento `dashboard:unauthorized` → el guard redirige a la Landing y limpia sesión.

## Flujo E2E sugerido
1. Aplicar migraciones y seed.
2. Iniciar backend, Landing y Dashboard.
3. Login en Landing con `admin@estetica.mx / changeme123` (crea cookie HttpOnly).
4. En el Dashboard:
   - Crear/editar/eliminar un servicio y observar el refetch automático.
   - Agendar una cita, cambiarla de estado (confirmar/done/cancelar) y comprobar que la tarjeta de métricas se actualiza.
   - Registrar un pago y validar que el total del rango y la gráfica cambian al instante.
   - Ajustar inventario y verificar el contador de stock bajo.
5. Cerrar sesión desde el header → cookie eliminada y redirección a la Landing.

## Ejemplos cURL
```bash
# Login (guardará la cookie en cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estetica.mx","password":"changeme123"}'

# Crear servicio
token_cookie="cookies.txt"
curl -b "$token_cookie" -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Nuevo servicio","price":350,"duration":60}'

# Listar citas de la semana (zona America/Tijuana)
curl -b "$token_cookie" "http://localhost:3000/api/bookings?from=$(date +%Y-%m-%d)&to=$(date -d '+7 day' +%Y-%m-%d)"
```

## Optimización Landing
- Imágenes WebP/AVIF con `loading="lazy"`, `decoding="async"`, `width/height` definidos y `fetchpriority="high"` sólo para hero.
- Fuentes con `display=swap` y preloads mínimos.
- Code-splitting con `React.lazy` para secciones no críticas.
- Sin `console.log` en build.

## Troubleshooting
- **Cookies ausentes:** revisar dominio/origen. Todas las llamadas deben usar `credentials: 'include'`.
- **CORS bloqueado:** asegúrate de usar `VITE_API_URL` sin slash final y que el backend esté en 3000.
- **`Secure` en local:** no habilitar `SESSION_COOKIE_DOMAIN` ni `NODE_ENV=production` sin TLS.
- **Errores de validación (400):** el payload no cumple las reglas Zod (nombres ≤ 100 caracteres, precios > 0, duración 5–480, stock ≥ 0).
- **Conflictos de migraciones:** ejecutar `npx prisma migrate resolve --applied <id>` y repetir `npm run prisma:migrate`.

## Checklist de despliegue
- [ ] Landing y Dashboard servidos bajo HTTPS en el mismo dominio.
- [ ] Proxy inverso reenviando `/api` al backend y preservando encabezados (`Host`, `X-Forwarded-*`).
- [ ] Variables `NODE_ENV=production`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_DOMAIN` (si aplica) y `JWT_SECRET` configuradas.
- [ ] Cookie con `Secure=true`, `HttpOnly=true`, `SameSite=Lax`.
- [ ] Ejecutar `npm run build` en Landing/Dashboard y servir los assets estáticos (Vite build).
- [ ] Backend ejecutándose con `npm run start` (transpilado) y acceso a la base PostgreSQL migrada/sembrada.
- [ ] Verificar con cURL/Thunder Client: login, `/api/me`, `/api/services`.
