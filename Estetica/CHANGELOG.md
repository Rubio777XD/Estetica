# Registro de cambios

# 2025-11-05
- Ajustado el tablero principal: tarjetas de Citas próximas y Citas pendientes limitadas a tres ítems con placeholders para mantener altura uniforme, y bloque de métricas diarias con el mismo radio de borde.
- Eliminados los encabezados duplicados en las vistas internas de citas y pagos; los botones de cancelación ahora operan de inmediato sin diálogos de confirmación.
- Actualizado el espaciado de los botones en Pagos & Comisiones, los títulos `<title>` de landing y dashboard, y se reutilizó el footer corporativo en toda la landing.

## 2025-11-04
- Se añadió la página **Crear cita** en el Dashboard para agendar manualmente, con selección de servicios y horarios del salón.
- Se actualizó la sección de Pagos & Comisiones con filtro por correo de colaboradora, exportación CSV local y persistencia de filtros.
- Se estandarizó la generación de horarios fijos en la landing pública y en la creación interna de citas, mostrando todos los slots horarios vigentes en America/Tijuana.
- Se filtraron atributos inválidos en el fallback de imágenes de la landing para evitar advertencias de React al cargar la sección principal.
