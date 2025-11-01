import { Router } from 'express';

import { handleWebhookEvent } from './receiver';
import { handleWebhookVerification } from './verify';

const router = Router();

router.get('/', handleWebhookVerification);
router.post('/', handleWebhookEvent);

export const webhookRouter = router;

export default router;
