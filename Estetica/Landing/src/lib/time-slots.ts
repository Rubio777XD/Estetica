export const SALON_TIME_ZONE = 'America/Tijuana';
export const OPENING_HOUR = 9;
export const CLOSING_HOUR = 21;
export const SLOT_MINUTES = 60;

const buildDateKeyFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const buildSlotLabelFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  const year = Number(map.get('year'));
  const month = Number(map.get('month'));
  const day = Number(map.get('day'));
  const hour = Number(map.get('hour'));
  const minute = Number(map.get('minute'));

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return 0;
  }

  const utcEquivalent = Date.UTC(year, month - 1, day, hour, minute);
  return (utcEquivalent - date.getTime()) / 60000;
};

const getLocalDateTimeInputValue = (timeZone: string, date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  const year = map.get('year');
  const month = map.get('month');
  const day = map.get('day');
  const hour = map.get('hour');
  const minute = map.get('minute');

  if (!year || !month || !day || !hour || !minute) {
    return '';
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const localDateTimeToIso = (timeZone: string, value: string) => {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if ([year, month, day, hour, minute].some((component) => Number.isNaN(component))) {
    return null;
  }

  const utcCandidate = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getTimeZoneOffset(new Date(utcCandidate), timeZone);
  const zoned = new Date(utcCandidate - offset * 60000);
  return zoned.toISOString();
};

export interface SalonSlot {
  label: string;
  value: string;
  start: Date;
  end: Date;
}

export const getSalonDateKey = (date: Date = new Date(), timeZone: string = SALON_TIME_ZONE) => {
  return buildDateKeyFormatter(timeZone).format(date);
};

interface BuildSalonSlotsOptions {
  date: Date;
  timeZone?: string;
  openHour?: number;
  closeHour?: number;
  stepMinutes?: number;
  hidePastOnToday?: boolean;
  now?: Date;
}

export const buildSalonSlots = ({
  date,
  timeZone = SALON_TIME_ZONE,
  openHour = OPENING_HOUR,
  closeHour = CLOSING_HOUR,
  stepMinutes = SLOT_MINUTES,
  hidePastOnToday = true,
  now = new Date(),
}: BuildSalonSlotsOptions): SalonSlot[] => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return [];
  }

  const startMinutes = openHour * 60;
  const endMinutes = closeHour * 60;

  if (startMinutes >= endMinutes || stepMinutes <= 0) {
    return [];
  }

  const dateKeyFormatter = buildDateKeyFormatter(timeZone);
  const slotLabelFormatter = buildSlotLabelFormatter(timeZone);
  const dateKey = dateKeyFormatter.format(date);

  let threshold: Date | null = null;
  if (hidePastOnToday) {
    const currentDateKey = dateKeyFormatter.format(now);
    if (currentDateKey === dateKey) {
      const nowInput = getLocalDateTimeInputValue(timeZone, now);
      const nowIso = nowInput ? localDateTimeToIso(timeZone, nowInput) : null;
      threshold = nowIso ? new Date(nowIso) : null;
    }
  }

  const slots: SalonSlot[] = [];

  for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const hourString = String(hour).padStart(2, '0');
    const minuteString = String(minute).padStart(2, '0');
    const localValue = `${dateKey}T${hourString}:${minuteString}`;
    const isoValue = localDateTimeToIso(timeZone, localValue);

    if (!isoValue) {
      continue;
    }

    const slotStartDate = new Date(isoValue);
    if (Number.isNaN(slotStartDate.getTime())) {
      continue;
    }

    if (threshold && slotStartDate.getTime() <= threshold.getTime()) {
      continue;
    }

    const slotEndDate = new Date(slotStartDate.getTime() + stepMinutes * 60000);

    slots.push({
      label: slotLabelFormatter.format(slotStartDate),
      value: isoValue,
      start: slotStartDate,
      end: slotEndDate,
    });
  }

  return slots;
};
