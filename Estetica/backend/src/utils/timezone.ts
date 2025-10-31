const DEFAULT_TIME_ZONE = 'America/Tijuana';

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
};

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const dtf = getFormatter(timeZone);
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

function buildZonedDate(parts: DateParts, timeZone = DEFAULT_TIME_ZONE): Date {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  } = parts;
  const utcCandidate = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const offset = getTimeZoneOffset(new Date(utcCandidate), timeZone);
  return new Date(utcCandidate - offset * 60_000);
}

export function getTimeZoneParts(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const dtf = getFormatter(timeZone);
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour')),
    minute: Number(map.get('minute')),
    second: Number(map.get('second')),
  };
}

export function parseDateOnly(value: string, options?: { endOfDay?: boolean; timeZone?: string }) {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error('Invalid date');
  }
  const timeZone = options?.timeZone ?? DEFAULT_TIME_ZONE;
  if (options?.endOfDay) {
    return buildZonedDate({ year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 }, timeZone);
  }
  return buildZonedDate({ year, month, day }, timeZone);
}

export function startOfToday(timeZone = DEFAULT_TIME_ZONE) {
  const now = new Date();
  const { year, month, day } = getTimeZoneParts(now, timeZone);
  return buildZonedDate({ year, month, day }, timeZone);
}

export function endOfToday(timeZone = DEFAULT_TIME_ZONE) {
  const now = new Date();
  const { year, month, day } = getTimeZoneParts(now, timeZone);
  return buildZonedDate({ year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 }, timeZone);
}

export function startOfMonth(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const { year, month } = getTimeZoneParts(date, timeZone);
  return buildZonedDate({ year, month, day: 1 }, timeZone);
}

export function endOfMonth(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const { year, month } = getTimeZoneParts(date, timeZone);
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const startOfNext = buildZonedDate({ year: nextMonth.year, month: nextMonth.month, day: 1 }, timeZone);
  return new Date(startOfNext.getTime() - 1);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export const DEFAULT_TZ = DEFAULT_TIME_ZONE;
