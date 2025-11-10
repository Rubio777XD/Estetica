# Registro de cambios

# 2025-11-11
- Consolidado el flujo de finalización de citas para generar/actualizar pagos y comisiones únicos, y normalizar los endpoints de reportes.
- Añadido estado al modelo de pagos y migración que depura duplicados para mantener integridad referencial.
- Ajustado el dashboard para consumir las nuevas relaciones `payment`/`commission` y reflejar los montos al terminar una cita.

# 2025-11-10
- Alineado el catálogo público y los reportes de servicios para respetar los filtros `active:true` y `deletedAt:null`, evitando
  referencias a servicios eliminados en la API protegida de métricas.
- Documentado en el README el procedimiento para regenerar Prisma Client cuando aparece el error `Unknown argument active/deletedAt`.
- Anotada en el esquema Prisma la intención de los campos `active` y `deletedAt` para mantener el soft delete estandarizado.

# 2025-11-08
- Normalizado el modelo de servicios en Prisma con `deletedAt`, índices (`active`, `deletedAt`) y snapshots de duración para las citas; agregada migración con backfill.
- Implementado soft delete consistente (filtro por defecto `active:true`, `deletedAt:null`), endpoint `PATCH /services/:id/active` y hard delete opcional (`force=true`) que nulifica `serviceId` tras copiar snapshots.
- Actualizado Dashboard (tipos y vistas) para soportar `serviceId` nulo y mostrar duración desde snapshots, además de documentación/seed/scripts alineados al nuevo flujo.

# 2025-11-07
- Reducidos los modales de "Crear cita" y "Asignar sin confirmación" para ajustarse a los nuevos anchos responsivos y mantener el scroll interno.
- Actualizada la vista de Pagos y comisión para mostrar el nombre de la colaboradora (con respaldo en correo), mejorar el filtrado por nombre o correo y actualizar la exportación CSV acorde a los filtros aplicados.

# 2025-11-06
- Ajustado el bloque "Servicios más solicitados" del dashboard para mostrar máximo tres elementos sin scroll, conservando la altura con placeholders y alineando el estilo con "Citas próximas".
- Rediseñada la vista de creación de citas eliminando el card interno, expandiendo el formulario a dos columnas en desktop y manteniendo un flujo de una sola columna en móviles.
- Corrigida la exportación CSV de Pagos y comisiones para respetar filtros activos y mapear correctamente la información de colaboradoras y montos.

# 2025-11-05
- Ajustado el tablero principal: tarjetas de Citas próximas y Citas pendientes limitadas a tres ítems con placeholders para mantener altura uniforme, y bloque de métricas diarias con el mismo radio de borde.
- Eliminados los encabezados duplicados en las vistas internas de citas y pagos; los botones de cancelación ahora operan de inmediato sin diálogos de confirmación.
- Actualizado el espaciado de los botones en Pagos & Comisiones, los títulos `<title>` de landing y dashboard, y se reutilizó el footer corporativo en toda la landing.

## 2025-11-04
- Se añadió la página **Crear cita** en el Dashboard para agendar manualmente, con selección de servicios y horarios del salón.
- Se actualizó la sección de Pagos & Comisiones con filtro por correo de colaboradora, exportación CSV local y persistencia de filtros.
- Se estandarizó la generación de horarios fijos en la landing pública y en la creación interna de citas, mostrando todos los slots horarios vigentes en America/Tijuana.
- Se filtraron atributos inválidos en el fallback de imágenes de la landing para evitar advertencias de React al cargar la sección principal.
