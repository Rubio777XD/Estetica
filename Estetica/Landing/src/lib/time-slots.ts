import { getLocalDateTimeInputValue, localDateTimeToIso } from './datetime';

export const SALON_TIME_ZONE = 'America/Tijuana';
export const OPENING_HOUR = 9;
export const CLOSING_HOUR = 21;
export const SLOT_MINUTES = 60;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SALON_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const slotLabelFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: SALON_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

export interface SalonSlot {
  start: string;
  label: string;
}

export function getSalonDateKey(date: Date = new Date()) {
  return dateKeyFormatter.format(date);
}

export function generateSalonSlots(
  dateKey: string,
  options: { hidePast?: boolean; now?: Date } = {}
): SalonSlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return [];
  }

  const { hidePast = true, now = new Date() } = options;
  const startMinutes = OPENING_HOUR * 60;
  const endMinutes = CLOSING_HOUR * 60;
  const slots: SalonSlot[] = [];

  let threshold: Date | null = null;
  if (hidePast) {
    const currentDateKey = getSalonDateKey(now);
    if (dateKey === currentDateKey) {
      const nowInput = getLocalDateTimeInputValue(now);
      const nowIso = nowInput ? localDateTimeToIso(nowInput) : null;
      threshold = nowIso ? new Date(nowIso) : null;
    }
  }

  for (let minutes = startMinutes; minutes < endMinutes; minutes += SLOT_MINUTES) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const hourString = String(hour).padStart(2, '0');
    const minuteString = String(minute).padStart(2, '0');
    const localValue = `${dateKey}T${hourString}:${minuteString}`;
    const iso = localDateTimeToIso(localValue);
    if (!iso) {
      continue;
    }
    const slotDate = new Date(iso);
    if (threshold && slotDate.getTime() <= threshold.getTime()) {
      continue;
    }
    slots.push({ start: iso, label: slotLabelFormatter.format(slotDate) });
  }

  return slots;
}
