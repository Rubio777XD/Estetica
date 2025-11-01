import { DateTime } from 'luxon';

import { config } from '../config';
import { nowInTijuana } from '../utils/time';

export const generateSlotsForDate = (date: DateTime, reference: DateTime = nowInTijuana()): DateTime[] => {
  const { openingHour, closingHour, slotMinutes } = config.schedule;
  const start = date.set({ hour: openingHour, minute: 0, second: 0, millisecond: 0 });
  const endBoundary = date.set({ hour: closingHour, minute: 0, second: 0, millisecond: 0 });

  if (date.endOf('day') < reference.startOf('day')) {
    return [];
  }

  if (start >= endBoundary) {
    return [];
  }

  const slots: DateTime[] = [];
  let cursor = start;

  while (cursor < endBoundary) {
    if (!cursor.hasSame(reference, 'day') || cursor > reference) {
      slots.push(cursor);
    }
    cursor = cursor.plus({ minutes: slotMinutes });
  }

  return slots;
};
