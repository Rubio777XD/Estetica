const TIME_ZONE = 'America/Tijuana';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  dateStyle: 'medium',
});

const shortTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getTimeZoneOffset(date: Date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  const year = Number(map.get('year'));
  const month = Number(map.get('month'));
  const day = Number(map.get('day'));
  const hour = Number(map.get('hour'));
  const minute = Number(map.get('minute'));
  const second = Number(map.get('second'));
  const utcEquivalent = Date.UTC(year, month - 1, day, hour, minute, second);
  return (utcEquivalent - date.getTime()) / 60000;
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDateOnly(value: string) {
  return dateFormatter.format(new Date(value));
}

export function formatTime(value: string) {
  return shortTimeFormatter.format(new Date(value));
}

export function toDateKey(date: Date) {
  return dateKeyFormatter.format(date);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMinutes(date: Date, minutes: number) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

export function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeToIso(value: string) {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    return null;
  }
  const utcCandidate = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getTimeZoneOffset(new Date(utcCandidate));
  const utcDate = new Date(utcCandidate - offset * 60000);
  return utcDate.toISOString();
}

export const TIME_ZONE_ID = TIME_ZONE;
