import axios from 'axios';

import { config } from '../config';
import { logger } from '../utils/logger';

const GRAPH_VERSION = 'v19.0';
const graphClient = axios.create({
  baseURL: `https://graph.facebook.com/${GRAPH_VERSION}/`,
  timeout: 10_000,
});

const authParams = {
  access_token: config.meta.longLivedToken,
};

export const sendTypingIndicator = async (recipientId: string, action: 'typing_on' | 'typing_off' = 'typing_on') => {
  try {
    await graphClient.post(
      `${config.meta.instagramUserId}/messages`,
      {
        recipient: { id: recipientId },
        sender_action: action,
      },
      { params: authParams }
    );
  } catch (error) {
    logger.error({ err: error, recipientId }, 'No se pudo enviar indicador de escritura');
  }
};

export const sendTextMessage = async (recipientId: string, text: string) => {
  try {
    await graphClient.post(
      `${config.meta.instagramUserId}/messages`,
      {
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text },
      },
      { params: authParams }
    );
  } catch (error) {
    logger.error({ err: error, recipientId }, 'No se pudo enviar mensaje de texto');
    throw error;
  }
};
