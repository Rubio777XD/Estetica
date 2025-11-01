const KEYWORDS = ['cita', 'reservar', 'agendar', 'precio', 'horario', 'horarios'];

export const matchesBookingKeyword = (text?: string) => {
  if (!text) {
    return false;
  }
  const normalized = text.toLowerCase();
  return KEYWORDS.some((keyword) => normalized.includes(keyword));
};
