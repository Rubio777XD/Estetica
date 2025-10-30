# Estética – Monorepo Landing, Dashboard y API

## 1. Resumen del proyecto
- **Landing (Vite React, puerto 3001):** sitio público con formulario MiniLoginModal para el personal.
- **Dashboard (Vite React, puerto 3003):** panel interno protegido por token JWT.
- **Backend (Express + Prisma, puerto 3000):** API REST con autenticación basada en `/api/login` y `/api/me`.

## 2. Requisitos
- Node.js 18 o superior.
- npm (se probó con npm 9).
- PostgreSQL con las migraciones de Prisma aplicadas.

## 3. Variables de entorno
- **Landing (`Landing/.env`):**
  ```env
  VITE_API_URL=http://localhost:3000
  ```
- **Dashboard (`Dashboard/.env`):**
  ```env
  VITE_API_URL=http://localhost:3000
  ```
- **Backend (`backend/.env`):**
  - `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/estetica`
  - `JWT_SECRET` con una cadena segura.

> **Importante:** si creas o modificas un archivo `.env`, reinicia el servidor de desarrollo de Vite para que los valores tomen efecto.

## 4. Levantar el entorno local
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Se expone en `http://localhost:3000`.

2. **Landing**
   ```bash
   cd Landing
   npm install
   npm run dev -- --port 3001
   ```
   Disponible en `http://localhost:3001`.

3. **Dashboard**
   ```bash
   cd Dashboard
   npm install
   npm run dev -- --port 3003
   ```
   Disponible en `http://localhost:3003`.

Los middleware de CORS permiten los orígenes `http://localhost:3001` y `http://localhost:3003`.

## 5. Flujo de autenticación
1. El personal abre el MiniLoginModal en la Landing.
2. Se envía `POST /api/login` con email y password.
3. El backend responde `{ token }`; el token se guarda en `localStorage` bajo la clave `salon_auth`.
4. Se valida la sesión con `GET /api/me`.
5. Si el token es válido, se redirige al Dashboard (`http://localhost:3003/`).
6. El Dashboard verifica el token al montar. Si la validación falla, limpia `salon_auth` y redirige a la Landing.

## 6. Endpoints relevantes
- **POST `/api/login`**
  - Body JSON: `{ "email": string, "password": string }`
  - Respuesta 200: `{ "token": string }`
  - Errores comunes: 400 (faltan campos), 401 (credenciales incorrectas).
- **GET `/api/me`**
  - Requiere header `Authorization: Bearer <token>`.
  - Respuesta 200: `{ "user": { id, email, name, role } }`.
  - Respuesta 401: token inválido o expirado; el frontend limpia `salon_auth`.

## 7. Pruebas rápidas
1. Inicia los tres servidores (backend, Landing, Dashboard).
2. En la Landing abre el MiniLoginModal y usa las credenciales seed `admin@estetica.mx / password123`.
3. Verifica en el navegador que `localStorage.getItem('salon_auth')` contenga un JWT.
4. Observa que, tras validar `/api/me`, el navegador redirige al Dashboard.
5. En el Dashboard confirma que la interfaz se muestra tras el estado “Cargando…”.
6. Borra manualmente `salon_auth` o espera un error 401; el guard redirige a la Landing.

## 8. Notas de diseño y restricciones
- No renombres ni elimines `id`, `className` o atributos `data-*` existentes.
- Mantén el estilo visual actual; los avisos de error/success del modal son discretos.
- Respeta la lógica de backend existente (`authJWT`, Prisma, rutas). Añade solo lo necesario.

## 9. Troubleshooting
- **CORS bloquea la solicitud:** confirma que el backend esté levantado y utiliza los puertos 3001/3003 permitidos.
- **Token no se guarda:** verifica credenciales y que `localStorage` esté disponible (modo incógnito restringido).
- **`.env` no aplica:** reinicia `npm run dev` en la app afectada.
- **Puertos ocupados:** detén procesos previos o cambia temporalmente el puerto en el comando `npm run dev`.
- **Error 401 en Dashboard:** borra `localStorage.salon_auth` y vuelve a iniciar sesión desde la Landing.
