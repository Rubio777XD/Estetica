# Changelog

## 2024-11-07

- Refactorizado el runner `db:verify` para incluir `prisma migrate diff`, captura avanzada de errores y reporte de drift.
- Eliminado el bloque redundante que recreaba el enum `AssignmentStatus` en la migración `202410312300_assignment_flow`.
- Fortalecido el seed transaccional con helpers `dryRunSeed` y `applySeed`, y nuevo runner `db-reset-safe`.
- Documentado el flujo recomendado de CI/CD y los comandos de mantenimiento de base de datos.
