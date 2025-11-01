# Changelog

## 2024-11-07

- Refactorizado el runner `db:verify` para incluir `prisma migrate diff`, captura avanzada de errores y reporte de drift.
- Eliminado el bloque redundante que recreaba el enum `AssignmentStatus` en la migración `202410312300_assignment_flow`.
- Fortalecido el seed transaccional con helpers `dryRunSeed` y `applySeed`, y nuevo runner `db-reset-safe`.
- Documentado el flujo recomendado de CI/CD y los comandos de mantenimiento de base de datos.

## 2024-11-08

- Permitidas reservas simultáneas ilimitadas al crear citas públicas o privadas cuando `MAX_PARALLEL_BOOKINGS_PER_SLOT` no está definido.
- Añadido control opcional de capacidad por horario mediante la variable `MAX_PARALLEL_BOOKINGS_PER_SLOT`.
