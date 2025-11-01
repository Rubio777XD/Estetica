# Instagram Bot Oficial

Este bot implementa el flujo oficial de Instagram (Instagram Graph API + Messenger API for Instagram) para permitir que los clientes agenden citas vía DM. Consume únicamente los endpoints públicos del backend existente y no se conecta de forma directa a la base de datos.

## Requisitos previos

- Node.js 18+
- npm 9+
- Una cuenta de Instagram Business conectada a una Página de Facebook
- Una aplicación en [Meta for Developers](https://developers.facebook.com/) con los productos **Instagram Graph API** y **Messenger API for Instagram** habilitados

## Configuración en Meta for Developers

1. Crea o selecciona tu aplicación en Meta for Developers.
2. Agrega los productos **Instagram Graph API** y **Messenger API for Instagram** desde la sección **Products**.
3. En **Messenger > Instagram Settings**:
   - Conecta la Página de Facebook vinculada a tu cuenta de Instagram Business.
   - Genera un token de acceso de larga duración (Long-Lived Token) y anótalo para `META_LONG_LIVED_TOKEN`.
   - Obtén el `IG_USER_ID` (ID de la cuenta de Instagram) y el `META_PAGE_ID` (ID de la página).
4. En **App Dashboard > Settings > Basic**, copia `META_APP_ID` y `META_APP_SECRET`.
5. En **Messenger > Settings > Webhooks**:
   - Añade un nuevo webhook para **Instagram**.
   - Usa `WEBHOOK_PUBLIC_URL/webhook` como URL de callback.
   - Establece `META_VERIFY_TOKEN` con el mismo valor que colocarás en tu `.env`.
   - Suscribe los eventos `messages`, `messaging_postbacks` y `message_reactions` (opcional).

## Variables de entorno

Copia el archivo `.env.example` y rellena los valores correspondientes:

```bash
cd instagram-bot
cp .env.example .env
```

Variables principales:

- `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`: credenciales de la app.
- `META_LONG_LIVED_TOKEN`: token usado para enviar mensajes.
- `META_PAGE_ID` y `IG_USER_ID`: identificadores de la página y la cuenta de Instagram.
- `WEBHOOK_PUBLIC_URL`: URL pública expuesta (por ejemplo, vía ngrok).
- `BACKEND_URL`: URL base del backend que expone `/api/public/services` y `/api/public/bookings`.
- `TIMEZONE`, `OPENING_HOUR`, `CLOSING_HOUR`, `SLOT_MINUTES`, `CLOSED_DAYS`: configuración de horarios del salón.
- `SERVICE_REFRESH_INTERVAL_MINUTES`: intervalo para refrescar el catálogo de servicios (por defecto 10 minutos).
- `PORT`: puerto local del bot.

## Ejecución en local con ngrok

1. Instala dependencias:
   ```bash
   cd instagram-bot
   npm install
   ```
2. Copia y configura el `.env` tal como se describe arriba.
3. Ejecuta el bot en modo desarrollo:
   ```bash
   npm run dev
   ```
4. En otra terminal, levanta un túnel con ngrok hacia el puerto configurado (por defecto 3005):
   ```bash
   ngrok http 3005
   ```
5. Actualiza `WEBHOOK_PUBLIC_URL` con la URL que te proporciona ngrok (por ejemplo `https://abcdef.ngrok.io`).
6. En el panel de Meta, actualiza la configuración del webhook para apuntar a `WEBHOOK_PUBLIC_URL/webhook`.

## Flujo de prueba rápida

1. Envía el mensaje `"cita"` desde una cuenta de prueba a la cuenta de Instagram Business conectada.
2. El bot listará los servicios consultando `GET /api/public/services` del backend.
3. Elige un servicio, indica día y hora (slots fijos entre la hora de apertura y cierre).
4. Proporciona tu nombre y notas opcionales.
5. El bot enviará un `POST /api/public/bookings` con los datos recopilados y confirmará la reserva por DM.

## Scripts disponibles

| Script | Descripción |
| ------ | ----------- |
| `npm run dev` | Inicia el bot con recarga automática usando `ts-node-dev`. |
| `npm run build` | Compila los archivos TypeScript a JavaScript en `dist/`. |
| `npm run start` | Ejecuta la versión compilada. |

## Limitaciones y notas

- El estado de la conversación se almacena en memoria; reiniciar el proceso pierde el contexto.
- El bot solo responde dentro de la ventana de 24 horas desde el último mensaje del usuario, respetando las políticas de mensajería de Instagram.
- Los servicios se sincronizan automáticamente al iniciar el bot y cada `SERVICE_REFRESH_INTERVAL_MINUTES`.

## Cambios

Consulta [`CHANGELOG.md`](CHANGELOG.md) para un historial de modificaciones.
