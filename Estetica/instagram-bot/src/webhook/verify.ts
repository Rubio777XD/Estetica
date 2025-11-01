import { Request, Response } from 'express';

import { config } from '../config';

export const handleWebhookVerification = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.verifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.status(403).send('Forbidden');
};
