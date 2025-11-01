import { DateTime } from 'luxon';

import { config } from '../config';
import {
  BackendService,
  createBooking,
  ensureServicesLoaded,
  getCachedServices,
} from '../services/backend';
import { generateSlotsForDate } from '../services/slots';
import { sendTextMessage, sendTypingIndicator } from '../services/graph';
import { logger } from '../utils/logger';
import {
  combineDateAndTime,
  formatForUser,
  formatSlotLabel,
  isClosedDay,
  isDateInPast,
  nowInTijuana,
  parseDateInput,
  parseTimeInput,
} from '../utils/time';
import { matchesBookingKeyword } from './keywords';

export type IncomingMessage = {
  senderId: string;
  text?: string;
  timestamp: number;
};

type ConversationStep = 'service' | 'date' | 'time' | 'name' | 'notes';

type ConversationState = {
  step: ConversationStep;
  selectedService?: BackendService;
  selectedDate?: DateTime;
  selectedSlot?: DateTime;
  clientName?: string;
  notes?: string | null;
};

const conversations = new Map<string, ConversationState>();

const buildServiceListMessage = (services: BackendService[]) => {
  if (services.length === 0) {
    return 'Por ahora no tenemos servicios disponibles para reservar.';
  }

  const lines = services.map((service, index) => {
    const price = service.price.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    return `${index + 1}. ${service.name} — ${price} · ${service.duration} minutos`;
  });

  return [
    '¡Hola! Estas son las opciones disponibles:',
    ...lines,
    '',
    'Responde con el número o nombre del servicio que deseas reservar.',
  ].join('\n');
};

const findServiceFromInput = (input: string, services: BackendService[]) => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && Number.isInteger(numeric)) {
    const index = numeric - 1;
    if (index >= 0 && index < services.length) {
      return services[index];
    }
  }

  return services.find((service) => service.name.toLowerCase() === normalized);
};

const promptForDate = async (senderId: string) => {
  const today = nowInTijuana();
  await sendTextMessage(
    senderId,
    [
      'Perfecto. ¿Para qué día te gustaría agendar?',
      'Responde en formato AAAA-MM-DD (por ejemplo, ' + today.toFormat('yyyy-MM-dd') + ').',
    ].join('\n')
  );
};

const promptForTime = async (senderId: string, date: DateTime) => {
  const slots = generateSlotsForDate(date);
  if (slots.length === 0) {
    await sendTextMessage(
      senderId,
      'No hay horarios disponibles para ese día. Por favor indícame otra fecha (formato AAAA-MM-DD).'
    );
    const state = conversations.get(senderId);
    if (state) {
      state.step = 'date';
      state.selectedDate = undefined;
    }
    return;
  }

  const lines = slots.map((slot, index) => `${index + 1}. ${formatSlotLabel(slot)}`);
  await sendTextMessage(
    senderId,
    [
      'Estos son los horarios disponibles:',
      ...lines,
      '',
      'Responde con el número o escribe la hora en formato HH:MM.',
    ].join('\n')
  );

  const state = conversations.get(senderId);
  if (state) {
    state.step = 'time';
  }
};

const promptForName = async (senderId: string) => {
  await sendTextMessage(senderId, '¿A nombre de quién registramos la cita?');
  const state = conversations.get(senderId);
  if (state) {
    state.step = 'name';
  }
};

const promptForNotes = async (senderId: string) => {
  await sendTextMessage(
    senderId,
    '¿Deseas agregar alguna nota o detalle? Escríbelo aquí o responde "no" para continuar sin notas.'
  );
  const state = conversations.get(senderId);
  if (state) {
    state.step = 'notes';
  }
};

const resetConversation = (senderId: string) => {
  conversations.delete(senderId);
};

const ensureConversation = async (senderId: string) => {
  const existing = conversations.get(senderId);
  if (existing) {
    existing.step = 'service';
    existing.selectedService = undefined;
    existing.selectedDate = undefined;
    existing.selectedSlot = undefined;
    existing.clientName = undefined;
    existing.notes = undefined;
    return existing;
  }
  const state: ConversationState = { step: 'service' };
  conversations.set(senderId, state);
  return state;
};

const handleServiceStep = async (message: IncomingMessage, state: ConversationState) => {
  const text = message.text?.trim();
  if (!text) {
    await sendTextMessage(message.senderId, 'Por favor indícame el servicio que deseas agendar.');
    return;
  }

  const services = getCachedServices();
  const selected = findServiceFromInput(text, services);
  if (!selected) {
    await sendTextMessage(
      message.senderId,
      'No reconocí ese servicio. Responde con el número o nombre exacto del servicio que aparece en la lista.'
    );
    return;
  }

  state.selectedService = selected;
  state.step = 'date';
  await sendTextMessage(
    message.senderId,
    `Excelente, reservaremos *${selected.name}* (${selected.duration} min). Vamos a elegir la fecha.`.replace(/\*/g, '')
  );
  await promptForDate(message.senderId);
};

const handleDateStep = async (message: IncomingMessage, state: ConversationState) => {
  const text = message.text?.trim();
  if (!text) {
    await promptForDate(message.senderId);
    return;
  }

  const parsedDate = parseDateInput(text);
  if (!parsedDate) {
    await sendTextMessage(
      message.senderId,
      'No pude entender la fecha. Por favor usa el formato AAAA-MM-DD (por ejemplo, 2024-12-05).'
    );
    return;
  }

  if (isClosedDay(parsedDate)) {
    await sendTextMessage(message.senderId, 'Lo sentimos, ese día estamos cerrados. Elige otra fecha.');
    return;
  }

  if (isDateInPast(parsedDate)) {
    await sendTextMessage(message.senderId, 'Esa fecha ya pasó. Indícame un día futuro.');
    return;
  }

  state.selectedDate = parsedDate;
  await promptForTime(message.senderId, parsedDate);
};

const resolveSlot = (input: string, date: DateTime) => {
  const slots = generateSlotsForDate(date);
  if (slots.length === 0) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric) && Number.isInteger(numeric)) {
    const index = numeric - 1;
    if (index >= 0 && index < slots.length) {
      return slots[index];
    }
  }

  const parsedTime = parseTimeInput(normalized);
  if (!parsedTime) {
    return null;
  }

  const slot = combineDateAndTime(date, parsedTime);
  return slots.find((candidate) => candidate.equals(slot)) ?? null;
};

const handleTimeStep = async (message: IncomingMessage, state: ConversationState) => {
  if (!state.selectedDate) {
    state.step = 'date';
    await promptForDate(message.senderId);
    return;
  }

  const text = message.text?.trim();
  if (!text) {
    await promptForTime(message.senderId, state.selectedDate);
    return;
  }

  const slot = resolveSlot(text, state.selectedDate);
  if (!slot) {
    await sendTextMessage(
      message.senderId,
      'No pude interpretar ese horario. Elige un número de la lista o escribe la hora en formato HH:MM (por ejemplo, 10:00).'
    );
    return;
  }

  state.selectedSlot = slot;
  await promptForName(message.senderId);
};

const handleNameStep = async (message: IncomingMessage, state: ConversationState) => {
  const text = message.text?.trim();
  if (!text) {
    await sendTextMessage(message.senderId, 'Necesito un nombre para la reserva.');
    return;
  }

  state.clientName = text;
  await promptForNotes(message.senderId);
};

const handleNotesStep = async (message: IncomingMessage, state: ConversationState) => {
  const text = message.text?.trim();
  if (!text || text.toLowerCase() === 'no' || text.toLowerCase() === 'ninguna') {
    state.notes = null;
  } else {
    state.notes = text;
  }

  if (!state.selectedService || !state.selectedSlot || !state.clientName) {
    logger.warn({ senderId: message.senderId }, 'Estado incompleto al confirmar reserva');
    await sendTextMessage(
      message.senderId,
      'Ocurrió un problema al procesar la reserva. Intentemos de nuevo. Escribe "cita" para comenzar.'
    );
    resetConversation(message.senderId);
    return;
  }

  try {
    await sendTypingIndicator(message.senderId, 'typing_on');
    const startTime = state.selectedSlot.setZone(config.schedule.timezone).toISO();
    if (!startTime) {
      throw new Error('No fue posible formatear la fecha seleccionada');
    }

    const booking = await createBooking({
      clientName: state.clientName,
      serviceId: state.selectedService.id,
      startTime,
      notes: state.notes ?? undefined,
    });

    const summaryLines = [
      '¡Listo! Tu cita ha quedado agendada:',
      `• Servicio: ${state.selectedService.name}`,
      `• Fecha y hora: ${formatForUser(state.selectedSlot)}`,
      `• Duración: ${state.selectedService.duration} minutos`,
    ];

    if (state.notes) {
      summaryLines.push(`• Notas: ${state.notes}`);
    }

    await sendTextMessage(message.senderId, summaryLines.join('\n'));
    if (!booking) {
      logger.warn({ senderId: message.senderId }, 'Reserva creada sin payload devuelto');
    } else {
      logger.info({ bookingId: booking.id, senderId: message.senderId }, 'Reserva creada desde Instagram');
    }
  } catch (error) {
    logger.error({ err: error, senderId: message.senderId }, 'Error al crear la reserva');
    await sendTextMessage(
      message.senderId,
      'No pudimos registrar la cita en este momento. Intenta más tarde o comunícate directamente con el salón.'
    );
  } finally {
    resetConversation(message.senderId);
  }
};

const stepHandlers: Record<ConversationStep, (message: IncomingMessage, state: ConversationState) => Promise<void>> = {
  service: handleServiceStep,
  date: handleDateStep,
  time: handleTimeStep,
  name: handleNameStep,
  notes: handleNotesStep,
};

export const handleBookingFlow = async (message: IncomingMessage) => {
  const state = conversations.get(message.senderId);

  if (!state) {
    if (matchesBookingKeyword(message.text)) {
      const conversation = await ensureConversation(message.senderId);
      await ensureServicesLoaded().catch((error) => {
        logger.error({ err: error }, 'No se pudieron cargar los servicios');
      });

      const services = getCachedServices();
      await sendTextMessage(message.senderId, buildServiceListMessage(services));
      conversation.step = 'service';
      return;
    }

    // Mensaje no relacionado; no respondemos para evitar spam.
    return;
  }

  const handler = stepHandlers[state.step];
  if (handler) {
    await handler(message, state);
  } else {
    resetConversation(message.senderId);
  }
};

export const resetConversationForUser = (senderId: string) => resetConversation(senderId);
