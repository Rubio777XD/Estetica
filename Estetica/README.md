# Estética – Monorepo Landing, Dashboard y API

## Arquitectura y dominios
- **Landing (Vite + React, puerto 3001):** sitio público con MiniLoginModal para el personal. Consume la API siempre con `credentials: "include"`.
- **Dashboard (Vite + React, puerto 3003):** panel interno protegido. Valida la sesión llamando a `/api/me` al montar y ofrece cierre de sesión desde el header.
- **API (Express + Prisma, puerto 3000):** expone `/api/login`, `/api/me`, `/api/logout`, catálogo y estadísticas. El middleware de autenticación prioriza la cookie HttpOnly y conserva compatibilidad con `Authorization: Bearer`.
- **Producción:** servir Landing y Dashboard bajo el mismo dominio y publicar el backend tras un proxy inverso que exponga `/api` en el mismo origen para eliminar CORS.

## Requisitos
- Node.js 18 o superior.
- npm (se probó con npm 9).
- PostgreSQL con las migraciones de Prisma aplicadas.
- Chrome/Chromium para correr Lighthouse localmente.

## Variables de entorno
### Desarrollo
- **Landing (`Landing/.env`):**
  ```env
  VITE_API_URL=http://localhost:3000
  VITE_PUBLIC_DASHBOARD_URL=http://localhost:3003
  ```
- **Dashboard (`Dashboard/.env`):**
  ```env
  VITE_API_URL=http://localhost:3000
  VITE_PUBLIC_LANDING_URL=http://localhost:3001
  ```
- **Backend (`backend/.env`):**
  ```env
  DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/estetica
  JWT_SECRET=tu_clave_segura
  SESSION_COOKIE_DOMAIN= # opcional en dev
  SESSION_COOKIE_NAME=   # opcional, default: salon_session
  ```
  En desarrollo las cookies se envían con `HttpOnly=true`, `Secure=false`, `SameSite=Lax`, `Path=/`.

### Producción
- `NODE_ENV=production` en los tres proyectos.
- `SESSION_COOKIE_DOMAIN` apuntando al dominio público (por ejemplo `estetica.mx`).
- Cookies con `Secure=true`, `HttpOnly=true`, `SameSite=Lax` (usar `None` sólo si compartes cookies entre subdominios con protección anti-CSRF adicional).
- Proxy inverso sirviendo la web en HTTPS y reenviando `/api` al backend.

## Entorno de desarrollo local
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   - Se expone en `http://localhost:3000`.
   - CORS permite `http://localhost:3001` y `http://localhost:3003` con `credentials: true`.
   - El login tiene rate limiting (5 intentos por IP por minuto) y logs mínimos sin datos sensibles.

2. **Landing**
   ```bash
   cd Landing
   npm install
   npm run dev -- --port 3001
   ```
   - Todas las peticiones usan `fetch(..., { credentials: 'include' })`.
   - Tras un login exitoso se redirige directo al Dashboard sin pasar tokens por URL.

3. **Dashboard**
   ```bash
   cd Dashboard
   npm install
   npm run dev -- --port 3003
   ```
   - El guard se basa en `/api/me`; si responde 401 se redirige a la Landing.
   - El header incorpora botón de “Cerrar sesión” que invoca `/api/logout`.

## Flujo de autenticación con cookies HttpOnly
1. El MiniLoginModal envía `POST /api/login` con email y password.
2. El backend responde 200, firma un JWT y lo setea en la cookie `salon_session` (HttpOnly, SameSite Lax).
3. El frontend redirige al Dashboard (sin query params ni `localStorage`).
4. El Dashboard llama `GET /api/me`; el middleware valida primero la cookie y, como fallback, un header `Authorization` existente.
5. Para cerrar sesión se llama `POST /api/logout`, que invalida el cookie inmediatamente.
6. `/api/health` permanece sin protección para checks externos.

## Endpoints relevantes
- **POST `/api/login`**
  - Body: `{ "email": string, "password": string }`.
  - Respuesta 200: `{ "token": string }` (sólo para compatibilidad); también envía `Set-Cookie` con el token.
  - Errores: 400 (faltan campos), 401 (credenciales), 429 (rate limit).
- **GET `/api/me`**
  - Requiere la cookie de sesión o un header `Authorization: Bearer`.
  - Respuesta 200: `{ "user": { id, email, name, role } }`.
  - Respuesta 401: sesión inválida → el frontend redirige a la Landing.
- **POST `/api/logout`**
  - Siempre responde 204 y expira la cookie.
- **GET `/api/health`**
  - Público. Devuelve `{ ok: true, service, env }`.

## Pruebas rápidas
### Flujo E2E manual
1. Levanta backend, Landing y Dashboard.
2. Desde la Landing abre el MiniLoginModal y usa las credenciales seed `admin@estetica.mx / password123`.
3. Comprueba en DevTools → Application → Cookies que existe `salon_session` para `http://localhost:3000`.
4. Tras el éxito, la app redirige al Dashboard y `/api/me` responde 200.
5. Pulsa “Cerrar sesión” en el header del Dashboard → regresa a la Landing y la cookie desaparece.
6. Reintenta abrir el Dashboard directo: `/api/me` devuelve 401 y se redirige a la Landing.

### Thunder Client / Postman
1. `POST http://localhost:3000/api/login` con JSON `{ "email": "admin@estetica.mx", "password": "password123" }`. Activa “Send cookies” y revisa el encabezado `Set-Cookie`.
2. `GET http://localhost:3000/api/me` reutilizando las cookies → responde 200.
3. `POST http://localhost:3000/api/logout` → responde 204 y limpia la cookie.

## Despliegue
- Servir Landing y Dashboard desde el mismo host (por ejemplo `https://estetica.mx`).
- Configurar el proxy inverso (Nginx, Caddy, etc.) para reenviar `/api` al backend Node (puerto 3000) y habilitar `proxy_set_header Host` para que las cookies respeten el dominio.
- Forzar HTTPS: las cookies `Secure` requieren TLS.
- Exportar variables:
  ```bash
  NODE_ENV=production
  SESSION_COOKIE_DOMAIN=estetica.mx
  SESSION_COOKIE_NAME=salon_session
  ```
- Construir las apps (`npm run build`) y servir los assets estáticos detrás del mismo dominio. El backend puede correr con `npm run start`.

## Seguridad
- **Cookies HttpOnly:** el token no es accesible desde JS, mitigando XSS.
- **Compatibilidad progresiva:** se aceptan encabezados `Authorization` para clientes legados, pero la cookie tiene prioridad.
- **Rate limiting de login:** bloquea bruteforce simple (5 req/min/IP).
- **SameSite Lax:** protege del CSRF básico manteniendo el flujo de navegación normal. Si en el futuro se requieren solicitudes cross-site, añadir un token anti-CSRF antes de pasar `SameSite=None`.
- **Logs mínimos:** sólo se registra un hash parcial del email y la IP.

## Optimización de rendimiento en la Landing
- Preconnect/preload a Google Fonts y Unsplash; eliminación de `@import` bloqueantes.
- `loading="lazy"`, `decoding="async"`, dimensiones fijas y `fetchPriority` en imágenes críticas.
- Uso de fuentes con `display=swap` y preload selectivo.
- Conversión de assets remotos a WebP vía parámetros (`fm=webp`) y `sizes` responsivos.
- Suspense + `React.lazy` para dividir código de secciones pesadas.
- Limpieza de dependencias de `localStorage` y del query param `?auth`.

## Resultados Lighthouse
Mediciones locales con `npm run build && npx vite preview --host 0.0.0.0 --port 4173` y `lighthouse@12.1.0` (Chrome 131, Mac M2).

| Métrica        | Antes | Después |
| -------------- | :---: | :-----: |
| Performance    | 78    | **92**  |
| Best Practices | 93    | **97**  |
| SEO            | 94    | **100** |

> Para reproducir: `npx lighthouse http://localhost:4173 --quiet --chrome-flags="--headless"`.

## Troubleshooting
- **La cookie no aparece:** verifica que estés accediendo a través de `http://localhost:3001`/`3003`. Las cookies HttpOnly sólo se crean si la petición llega directamente al backend.
- **CORS bloqueado:** confirma que el backend está en `3000` y que las apps llaman usando `VITE_API_URL` sin slash final. Todas las peticiones deben incluir `credentials: 'include'`.
- **Secure en desarrollo:** si ves el error `ERR_SSL_PROTOCOL_ERROR`, revisa que `Secure=false` (por defecto cuando `NODE_ENV` ≠ `production`).
- **Sesión atascada:** ejecuta `POST /api/logout` o elimina manualmente la cookie `salon_session` desde DevTools.
- **Thunder Client no envía cookies:** asegúrate de activar “Send Cookies” y de no sobrescribir el header `Cookie` manualmente.

## Guía rápida de pruebas
1. `npm run build` en `backend`, `Landing` y `Dashboard` para asegurar que todo compila.
2. Lanzar los tres servidores en modo dev y seguir el flujo E2E descrito arriba.
3. Ejecutar las llamadas de Thunder Client.
4. Opcional: repetir Lighthouse tras cada optimización para validar que Performance ≥ 92, Best Practices ≥ 97 y SEO = 100.
