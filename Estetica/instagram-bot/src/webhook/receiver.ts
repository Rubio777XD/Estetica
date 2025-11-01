import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';

import { handleBookingFlow } from '../flows/booking';
import { config } from '../config';
import { logger } from '../utils/logger';
import { isWithin24Hours } from '../utils/time';

const verifySignature = (signature: string | undefined, payload: Buffer) => {
  if (!signature) {
    logger.warn('X-Hub-Signature-256 ausente; rechazando solicitud');
    return false;
  }

  const expected = `sha256=${createHmac('sha256', config.meta.appSecret).update(payload).digest('hex')}`;
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    logger.error({ err: error }, 'Error al comparar firmas');
    return false;
  }
};

type InstagramMessagingEntry = {
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp?: number;
    message?: {
      mid: string;
      text?: string;
      is_echo?: boolean;
    };
  }>;
};

type InstagramWebhookPayload = {
  object?: string;
  entry?: InstagramMessagingEntry[];
};

export const handleWebhookEvent = async (req: Request, res: Response) => {
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  const signature = req.header('X-Hub-Signature-256') ?? req.header('x-hub-signature-256') ?? undefined;

  if (!verifySignature(signature, rawBody)) {
    logger.warn('Firma inválida en webhook de Instagram');
    res.status(403).send('Invalid signature');
    return;
  }

  let payload: InstagramWebhookPayload;
  try {
    const bodyString = rawBody.toString('utf8');
    payload = bodyString ? (JSON.parse(bodyString) as InstagramWebhookPayload) : {};
  } catch (error) {
    logger.error({ err: error }, 'No se pudo parsear el cuerpo del webhook');
    res.status(400).send('Invalid JSON');
    return;
  }

  if (payload.object !== 'instagram') {
    res.status(200).send('Ignored');
    return;
  }

  const entries = payload.entry ?? [];

  for (const entry of entries) {
    const messagingEvents = entry.messaging ?? [];
    for (const event of messagingEvents) {
      const senderId = event.sender?.id;
      if (!senderId) {
        continue;
      }

      if (event.message?.is_echo) {
        continue;
      }

      const timestamp = event.timestamp ?? Date.now();
      if (!isWithin24Hours(timestamp)) {
        logger.info({ senderId, timestamp }, 'Mensaje fuera de la ventana de 24 horas; no se responderá');
        continue;
      }

      const text = event.message?.text;

      try {
        await handleBookingFlow({ senderId, text, timestamp });
      } catch (error) {
        logger.error({ err: error, senderId }, 'Error al procesar mensaje entrante');
      }
    }
  }

  res.status(200).send('EVENT_RECEIVED');
};
