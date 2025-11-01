# Estética Backend

Este backend está construido con Node.js, TypeScript, Express y Prisma. Usa una base de datos PostgreSQL en Neon, por lo que es indispensable contar con las credenciales remotas antes de ejecutar migraciones o seeds.

## Requisitos previos

- Node.js 18+
- npm 9+
- Acceso a la base de datos Neon configurada en el archivo `.env`

## Instalación

```bash
npm install
```

Copia el archivo `.env` de ejemplo (o solicita las credenciales) y asegúrate de completar las variables `DATABASE_URL`, `DIRECT_URL` y `SHADOW_DATABASE_URL`.

## Scripts principales

| Script | Descripción |
| ------ | ----------- |
| `npm run dev` | Levanta el servidor en modo desarrollo con recarga en caliente. |
| `npm run build` | Compila el proyecto a JavaScript en `dist/`. |
| `npm run start` | Ejecuta la versión compilada. |
| `npm run db:verify` | Runner de verificación integral. Ejecuta `prisma validate`, `prisma format --check`, `prisma migrate status`, `prisma migrate diff` (base de datos ↔ schema), revisa migraciones en busca de duplicados/BOM, valida índices y llaves foráneas, y realiza pruebas funcionales sobre la base. |
| `npm run db:audit` | Variante profunda del runner anterior (`--deep`). Añade diffs schema ↔ migraciones y comprobaciones adicionales de índices. Ideal para CI/CD. |
| `npm run db:reset-safe` | Resetea la base (usa `prisma migrate reset --force --skip-seed`) y vuelve a sembrar los datos de manera transaccional. Por seguridad sólo permite hosts locales, a menos que se use `--allow-remote` o `ALLOW_REMOTE_DB_RESET=1`. |
| `npm run db:seed:dry` | Ejecuta un dry-run transaccional del seed. Falla rápidamente si el schema no coincide con la base. |
| `npm run db:seed:apply` | Ejecuta el seed con dry-run previo y commit final (ver detalle más abajo). |

### Opciones adicionales de los runners

- `npm run db:verify -- --skip-shadow`: omite la base shadow al ejecutar Prisma.
- `npm run db:audit -- --skip-shadow`: combina verificación profunda con omisión de shadow (útil en entornos con permisos restringidos).
- `npm run db:reset-safe -- --skip-seed`: sólo resetea la base y no ejecuta el seed.
- `npm run db:reset-safe -- --allow-remote`: habilita el reset incluso si el host no es local (usa con precaución).

## Seeds transaccionales

El archivo [`prisma/seed.ts`](prisma/seed.ts) expone helpers que ejecutan el proceso en dos fases:

1. `dryRunSeed(prisma)`: ejecuta `runSeed` dentro de una transacción y fuerza un rollback. Esto detecta mismatches de schema sin modificar datos.
2. `applySeed(prisma)`: vuelve a ejecutar `runSeed` dentro de una transacción y confirma los cambios.

Los comandos `npm run db:seed:dry`, `npm run db:seed:apply` y `npm run db:reset-safe` reutilizan este flujo, garantizando seeds seguros y repetibles.

## Flujo recomendado de CI/CD (simulado)

1. **Instalación y generación**
   ```bash
   npm ci
   npx prisma generate
   ```
2. **Validación rápida (PRs y merges)**
   ```bash
   npm run db:verify
   ```
3. **Auditoría previa al deploy**
   ```bash
   npm run db:audit
   ```
4. **Deploy**
   - Si las verificaciones pasan, se procede a desplegar. Durante el deploy, el pipeline puede invocar `npm run db:reset-safe -- --allow-remote` únicamente si se desea reprovisionar completamente la base remota.

> **Nota:** El pipeline anterior es un flujo sugerido y no se ejecuta automáticamente. Sirve como guía para integrarlo en el CI/CD real.

## Troubleshooting

- Si `db:verify` falla por diferencias entre la base y el schema, revisa el mensaje emitido por `prisma migrate diff` y genera la migración correspondiente.
- Para revisar logs detallados de las migraciones, ejecuta manualmente `npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma`.
- Si trabajas con redes limitadas y no puedes usar shadow databases, añade `--skip-shadow` a `db:verify` o `db:audit`.

## Estructura de migraciones

Las migraciones se encuentran en `prisma/migrations`. El runner `db:verify` revisa automáticamente que no existan duplicados de enums o tablas, BOMs ni patrones inseguros de recreación de enums.
