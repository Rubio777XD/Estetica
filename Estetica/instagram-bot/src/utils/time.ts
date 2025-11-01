import { DateTime } from 'luxon';

import { config } from '../config';

const locale = 'es';

export const nowInTijuana = () => DateTime.now().setZone(config.schedule.timezone);

export const formatForUser = (dateTime: DateTime) =>
  dateTime.setZone(config.schedule.timezone).setLocale(locale).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);

export const formatDatePrompt = (dateTime: DateTime) => dateTime.setZone(config.schedule.timezone).toFormat('yyyy-MM-dd');

export const formatSlotLabel = (dateTime: DateTime) => dateTime.toFormat('HH:mm');

export const parseDateInput = (input: string): DateTime | null => {
  const sanitized = input.trim();
  if (!sanitized) {
    return null;
  }

  const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'd/M/yyyy'];

  for (const format of formats) {
    const parsed = DateTime.fromFormat(sanitized, format, { zone: config.schedule.timezone, locale });
    if (parsed.isValid) {
      return parsed.startOf('day');
    }
  }

  const isoParsed = DateTime.fromISO(sanitized, { zone: config.schedule.timezone });
  if (isoParsed.isValid) {
    return isoParsed.startOf('day');
  }

  return null;
};

export const parseTimeInput = (input: string): { hour: number; minute: number } | null => {
  const sanitized = input.trim().toLowerCase();
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.replace(/h|hrs|horas/, ':').replace(/\s+/g, '');
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute >= 60) {
    return null;
  }

  return { hour, minute };
};

export const combineDateAndTime = (date: DateTime, time: { hour: number; minute: number }) =>
  date.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });

const weekdayToZeroBased = (weekday: number) => weekday % 7;

export const isClosedDay = (date: DateTime) => config.schedule.closedDays.includes(weekdayToZeroBased(date.weekday));

export const isDateInPast = (date: DateTime) => date.endOf('day') < nowInTijuana();

export const isSlotInPast = (slot: DateTime, reference: DateTime = nowInTijuana()) => slot <= reference;

export const isWithin24Hours = (timestampMs: number) => {
  const delta = Date.now() - timestampMs;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return delta <= twentyFourHoursMs;
};
