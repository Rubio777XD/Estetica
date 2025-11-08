# Changelog

## 2024-11-09

- Asegurada la regeneración automática de Prisma Client en `npm install` y `npm run dev` para evitar clientes desfasados que provoquen errores `Unknown argument 'active'`/`'deletedAt'`.
- Normalizado el flujo de `Service` con filtros consistentes (`active` + `deletedAt`) y manejo tipado de errores de Prisma en todas las rutas.
- Documentado el borrado lógico y los snapshots de servicios en el README para garantizar históricos estables.
- Ajustadas las validaciones de precio y duración para aceptar valores mayores o iguales a cero conforme al modelo Prisma.

## 2024-11-07

- Refactorizado el runner `db:verify` para incluir `prisma migrate diff`, captura avanzada de errores y reporte de drift.
- Eliminado el bloque redundante que recreaba el enum `AssignmentStatus` en la migración `202410312300_assignment_flow`.
- Fortalecido el seed transaccional con helpers `dryRunSeed` y `applySeed`, y nuevo runner `db-reset-safe`.
- Documentado el flujo recomendado de CI/CD y los comandos de mantenimiento de base de datos.

## 2024-11-08

- Permitidas reservas simultáneas ilimitadas al crear citas públicas o privadas cuando `MAX_PARALLEL_BOOKINGS_PER_SLOT` no está definido.
- Añadido control opcional de capacidad por horario mediante la variable `MAX_PARALLEL_BOOKINGS_PER_SLOT`.
