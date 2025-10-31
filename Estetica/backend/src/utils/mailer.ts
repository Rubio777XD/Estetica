import { DEFAULT_TZ } from './timezone';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || 'no-reply@localhost';
const MAIL_TIME_ZONE = process.env.MAIL_TIME_ZONE || DEFAULT_TZ;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = (process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/$/, '');

type NodemailerModule = {
  createTransport: (config: Record<string, unknown>) => {
    sendMail: (message: Record<string, unknown>) => Promise<unknown>;
  };
};

let nodemailerModule: NodemailerModule | null | false = null;
let transporter: { sendMail: (message: Record<string, unknown>) => Promise<unknown> } | null = null;

const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_PORT);

const loadNodemailer = (): NodemailerModule | null => {
  if (nodemailerModule !== null) {
    return nodemailerModule === false ? null : nodemailerModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nodemailerModule = require('nodemailer') as NodemailerModule;
  } catch (error) {
    nodemailerModule = false;
    console.warn('[mailer] nodemailer no está instalado. Ejecuta `npm install nodemailer` para habilitar SMTP.');
  }
  return nodemailerModule === false ? null : nodemailerModule;
};

const ensureTransporter = () => {
  if (!isSmtpConfigured) {
    throw new Error('Mailer configuration is incomplete');
  }

  if (!transporter) {
    const module = loadNodemailer();
    if (!module) {
      throw new Error('nodemailer module not available');
    }
    transporter = module.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth:
        SMTP_USER && SMTP_PASS
          ? {
              user: SMTP_USER,
              pass: SMTP_PASS,
            }
          : undefined,
    });
  }

  return transporter;
};

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sendViaResend = async (message: MailMessage) => {
  const response = await fetch(`${RESEND_API_URL}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Resend request failed (${response.status}): ${details}`);
  }

  return response.json().catch(() => undefined);
};

export const sendMail = async (message: MailMessage) => {
  if (RESEND_API_KEY) {
    try {
      await sendViaResend(message);
      return { provider: 'resend' as const };
    } catch (error) {
      console.error('[mailer] Error enviando con Resend', error);
      throw error instanceof Error ? error : new Error('No fue posible enviar el correo');
    }
  }

  if (isSmtpConfigured) {
    try {
      const mailTransporter = ensureTransporter();
      return await mailTransporter.sendMail({
        from: MAIL_FROM,
        ...message,
      });
    } catch (error) {
      console.error('[mailer] Error enviando vía SMTP', error);
      throw error instanceof Error ? error : new Error('No fue posible enviar el correo');
    }
  }

  console.warn('[mailer] Configuración de correo ausente. Mensaje no enviado, solo registrado.');
  console.info('[mailer] Mensaje simulado', {
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
  return { mocked: true as const };
};

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: MAIL_TIME_ZONE,
  dateStyle: 'full',
  timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: MAIL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

export interface AssignmentEmailOptions {
  to: string;
  clientName: string;
  serviceName: string;
  start: Date;
  end: Date;
  notes?: string | null;
  acceptUrl: string;
  expiresAt: Date;
}

export const sendAssignmentEmail = async (options: AssignmentEmailOptions) => {
  const { to, clientName, serviceName, start, end, notes, acceptUrl, expiresAt } = options;

  const windowText = `${dateFormatter.format(start)} — ${timeFormatter.format(end)}`;
  const expiresText = dateFormatter.format(expiresAt);

  const textLines = [
    `¡Hola!`,
    '',
    `Has sido invitada a tomar la cita de ${clientName} para el servicio ${serviceName}.`,
    `Horario: ${windowText}.`,
  ];

  if (notes) {
    textLines.push(`Notas del cliente: ${notes}`);
  }

  textLines.push(
    '',
    `Acepta la cita aquí: ${acceptUrl}`,
    'Este enlace vence en 24 horas.',
    `Fecha límite: ${expiresText}.`,
    '',
    'Si no puedes tomarla, simplemente ignora este mensaje.'
  );

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="font-size: 20px; font-weight: 600;">¡Hola!</h2>
      <p style="margin: 12px 0;">Has sido invitada a tomar la cita de <strong>${clientName}</strong> para el servicio <strong>${serviceName}</strong>.</p>
      <p style="margin: 12px 0;"><strong>Horario:</strong> ${windowText}</p>
      ${
        notes
          ? `<p style="margin: 12px 0; background-color: #F9FAFB; padding: 12px; border-radius: 8px;"><strong>Notas del cliente:</strong><br />${notes}</p>`
          : ''
      }
      <p style="margin: 12px 0;">Para aceptar la cita haz clic en el siguiente botón:</p>
      <p style="margin: 20px 0;">
        <a href="${acceptUrl}" style="display: inline-block; background-color: #000000; color: #FFFFFF; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Aceptar invitación</a>
      </p>
      <p style="margin: 12px 0;">Este enlace vence en 24 horas (hasta ${expiresText}).</p>
      <p style="margin: 12px 0; font-size: 12px; color: #6B7280;">Si no puedes tomarla, simplemente ignora este mensaje.</p>
    </div>
  `;

  await sendMail({
    to,
    subject: `Invitación para cita de ${clientName}`,
    text: textLines.join('\n'),
    html,
  });
};
