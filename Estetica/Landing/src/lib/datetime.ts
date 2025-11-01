const TIME_ZONE = 'America/Tijuana';

const getFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, ...options });

export const dateTimeFormatter = getFormatter({ dateStyle: 'full', timeStyle: 'short' });

function getTimeZoneOffset(date: Date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  const year = Number(map.get('year'));
  const month = Number(map.get('month'));
  const day = Number(map.get('day'));
  const hour = Number(map.get('hour'));
  const minute = Number(map.get('minute'));
  const utcEquivalent = Date.UTC(year, month - 1, day, hour, minute);
  return (utcEquivalent - date.getTime()) / 60000;
}

export const getLocalDateTimeInputValue = (date: Date = new Date()) => {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
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

export const localDateTimeToIso = (value: string) => {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    return null;
  }
  const utcCandidate = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getTimeZoneOffset(new Date(utcCandidate));
  const zoned = new Date(utcCandidate - offset * 60000);
  return zoned.toISOString();
};

export const isoToLocalInputValue = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return getLocalDateTimeInputValue(date);
};

export const formatLocalDateTime = (value: string) => {
  const iso = localDateTimeToIso(value);
  if (!iso) return '';
  return dateTimeFormatter.format(new Date(iso));
};
