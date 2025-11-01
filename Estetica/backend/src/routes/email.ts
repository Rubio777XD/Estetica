import { Router } from 'express';

import { authJWT, AuthedRequest } from '../authJWT';
import { DEFAULT_TZ } from '../utils/timezone';
import { sendMail } from '../utils/mailer';

const router = Router();

const testEmailDateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: DEFAULT_TZ,
  dateStyle: 'full',
  timeStyle: 'medium',
});

router.get('/test-email', authJWT, async (_req: AuthedRequest, res) => {
  const to = process.env.SMTP_USER || process.env.MAIL_FROM || '';

  if (!to) {
    res
      .status(500)
      .type('text/plain; charset=utf-8')
      .send('No hay un destinatario configurado para la prueba de correo');
    return;
  }

  const subject = 'Correo de prueba - Estética Dashboard';
  const formattedDate = testEmailDateFormatter.format(new Date());
  const previewText = `Este es un correo de prueba enviado desde el dashboard el ${formattedDate}.`;

  try {
    await sendMail({
      to,
      subject,
      text: `${previewText}\n\nSi no solicitaste esta prueba, puedes ignorar este mensaje.`,
      html: `
        <p>Hola,</p>
        <p>${previewText}</p>
        <p>Si no solicitaste esta prueba, puedes ignorar este mensaje.</p>
      `.trim(),
    });

    res.status(200).type('text/plain; charset=utf-8').send('✅ Correo enviado correctamente.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error-desconocido';
    console.error('[email:test] No fue posible enviar el correo de prueba', message);
    res.status(500).type('text/plain; charset=utf-8').send('No fue posible enviar el correo');
  }
});

export default router;
