import { DEFAULT_TZ } from './timezone';

const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 587;

const SMTP_HOST = process.env.SMTP_HOST || DEFAULT_SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : DEFAULT_SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE =
  process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || 'no-reply@localhost';
const MAIL_TIME_ZONE = process.env.MAIL_TIME_ZONE || DEFAULT_TZ;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = (process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/$/, '');
const ORGANIZER_EMAIL = process.env.MAIL_ORGANIZER_EMAIL || 'mailestetica@gmail.com';

const SALON_NAME = 'Studio de Belleza AR';
const SALON_FULL_NAME = 'Studio de Belleza AR: Ibeth Rentería';
const SALON_ADDRESS = 'Av. Miguel Hidalgo 281, Zona Centro, Tecate, B.C., México';
const SALON_PHONE = '665 110 5558';

type NodemailerModule = {
  createTransport: (config: Record<string, unknown>) => {
    sendMail: (message: Record<string, unknown>) => Promise<unknown>;
  };
};

let nodemailerModule: NodemailerModule | null | false = null;
let transporter: { sendMail: (message: Record<string, unknown>) => Promise<unknown> } | null = null;

const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

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
      auth: {
        user: SMTP_USER!,
        pass: SMTP_PASS!,
      },
    });
  }

  return transporter;
};

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  icalEvent?: {
    filename: string;
    content: string;
    method?: 'PUBLISH' | 'REQUEST' | 'CANCEL';
  };
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
      attachments: message.icalEvent
        ? [
            {
              filename: message.icalEvent.filename,
              content: Buffer.from(message.icalEvent.content, 'utf-8').toString('base64'),
              content_type: 'text/calendar; method=' + (message.icalEvent.method ?? 'REQUEST'),
            },
          ]
        : undefined,
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
        icalEvent: message.icalEvent
          ? {
              filename: message.icalEvent.filename,
              method: message.icalEvent.method ?? 'REQUEST',
              content: message.icalEvent.content,
            }
          : undefined,
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

const icsDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const formatIcsDate = (date: Date) => {
  const parts = icsDateFormatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value] as const));
  const year = map.get('year');
  const month = map.get('month');
  const day = map.get('day');
  const hour = map.get('hour');
  const minute = map.get('minute');
  const second = map.get('second');
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildIcsContent = (options: {
  bookingId: string;
  clientName: string;
  serviceName: string;
  start: Date;
  end: Date;
  assignedName?: string | null;
  assignedEmail?: string | null;
  notes?: string | null;
}) => {
  const { bookingId, clientName, serviceName, start, end, assignedName, assignedEmail, notes } = options;
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('PRODID:-//Studio de Belleza AR//Confirmaciones//ES');
  lines.push('VERSION:2.0');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:REQUEST');
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:booking-${bookingId}@studio-ar`);
  lines.push(`DTSTAMP:${formatIcsDate(new Date())}`);
  lines.push(`DTSTART:${formatIcsDate(start)}`);
  lines.push(`DTEND:${formatIcsDate(end)}`);
  lines.push(`SUMMARY:Cita en ${SALON_NAME}`);
  lines.push(
    `DESCRIPTION:Servicio: ${serviceName}\\nCliente: ${clientName}\\nProfesional: ${
      assignedName ? `${assignedName}${assignedEmail ? ` (${assignedEmail})` : ''}` : assignedEmail ?? 'Por asignar'
    }${notes ? `\\nNotas: ${notes.replace(/\r?\n/g, ' ')}` : ''}`
  );
  lines.push(`LOCATION:${SALON_FULL_NAME} - ${SALON_ADDRESS}`);
  lines.push(`ORGANIZER;CN=${SALON_NAME}:MAILTO:${ORGANIZER_EMAIL}`);
  if (assignedEmail) {
    lines.push(`ATTENDEE;CN=${assignedName ?? assignedEmail};ROLE=REQ-PARTICIPANT:MAILTO:${assignedEmail}`);
  }
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const buildGoogleCalendarUrl = (options: {
  title: string;
  start: Date;
  end: Date;
  details: string;
}) => {
  const { title, start, end, details } = options;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatIcsDate(start)}/${formatIcsDate(end)}`,
    details,
    location: `${SALON_FULL_NAME} - ${SALON_ADDRESS}`,
    ctz: MAIL_TIME_ZONE,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

export interface BookingConfirmationEmailOptions {
  to: string;
  bookingId: string;
  clientName: string;
  serviceName: string;
  start: Date;
  end: Date;
  assignedName?: string | null;
  assignedEmail?: string | null;
  notes?: string | null;
}

export const sendBookingConfirmationEmail = async (options: BookingConfirmationEmailOptions) => {
  const { to, bookingId, clientName, serviceName, start, end, assignedName, assignedEmail, notes } = options;
  const dayText = dateFormatter.format(start);
  const startHour = timeFormatter.format(start);
  const endHour = timeFormatter.format(end);
  const assignedLabel = assignedName
    ? `${assignedName}${assignedEmail ? ` (${assignedEmail})` : ''}`
    : assignedEmail ?? 'Por asignar';

  const detailsText = `Servicio: ${serviceName}. Profesional asignada: ${assignedLabel}. Teléfono del estudio: ${SALON_PHONE}.`;
  const googleCalendarUrl = buildGoogleCalendarUrl({
    title: `Cita en ${SALON_NAME}`,
    start,
    end,
    details: `${detailsText} Dirección: ${SALON_ADDRESS}.`,
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Cita en Studio de Belleza AR',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    location: {
      '@type': 'Place',
      name: SALON_FULL_NAME,
      address: SALON_ADDRESS,
    },
    organizer: {
      '@type': 'Organization',
      name: SALON_NAME,
      email: ORGANIZER_EMAIL,
    },
  };

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Confirmación de cita</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
        .wrapper { max-width: 600px; margin: 0 auto; }
        .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12); }
        .header { background: linear-gradient(135deg, #111827 0%, #1f2937 100%); color: #ffffff; padding: 32px 28px; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
        .content { padding: 32px 28px; }
        .info-card { background: #f3f4f6; border-radius: 16px; padding: 20px; margin-top: 20px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .info-label { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
        .info-value { font-size: 16px; font-weight: 600; color: #111827; }
        .cta { display: inline-block; background: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; font-weight: 600; text-decoration: none; margin-top: 24px; }
        .footer { padding: 24px 28px 32px; color: #6b7280; font-size: 13px; text-align: center; }
      </style>
      <script type="application/ld+json">${JSON.stringify(schema)}</script>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <p style="margin: 0 0 8px 0; font-size: 15px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.7);">${SALON_FULL_NAME}</p>
            <h1>Tu cita ha sido confirmada</h1>
          </div>
          <div class="content">
            <p style="margin: 0 0 16px 0; font-size: 16px;">Hola ${escapeHtml(clientName)},</p>
            <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 15px; color: #374151;">
              ¡Gracias por confiar en nosotras! Te esperamos en nuestro estudio para tu servicio de belleza.
            </p>
            <div class="info-card">
              <div class="info-row">
                <span class="info-label">Servicio</span>
                <span class="info-value">${escapeHtml(serviceName)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Fecha y hora</span>
                <span class="info-value">${escapeHtml(dayText)} · ${escapeHtml(startHour)} – ${escapeHtml(endHour)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Profesional</span>
                <span class="info-value">${escapeHtml(assignedLabel)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Dirección</span>
                <span class="info-value">${escapeHtml(SALON_ADDRESS)}</span>
              </div>
              <div class="info-row" style="margin-bottom: 0;">
                <span class="info-label">Contacto</span>
                <span class="info-value">Tel. ${escapeHtml(SALON_PHONE)}</span>
              </div>
            </div>
            <a class="cta" href="${googleCalendarUrl}">Agregar al calendario</a>
            <p style="margin: 24px 0 0 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
              Si necesitas reprogramar o tienes alguna duda, contáctanos al <strong>${escapeHtml(SALON_PHONE)}</strong> o responde a este correo.
            </p>
            ${notes ? `<p style="margin: 18px 0 0 0; font-size: 14px; color: #6b7280;">Notas adicionales: ${escapeHtml(notes)}</p>` : ''}
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px 0;">${SALON_FULL_NAME}</p>
            <p style="margin: 0;">${SALON_ADDRESS}</p>
          </div>
        </div>
      </div>
    </body>
  </html>`;

  const textLines = [
    `Hola ${clientName},`,
    '',
    'Tu cita fue confirmada.',
    `Servicio: ${serviceName}.`,
    `Fecha: ${dayText}.`,
    `Horario: ${startHour} – ${endHour}.`,
    `Profesional: ${assignedLabel}.`,
    `Dirección: ${SALON_ADDRESS}.`,
    `Teléfono: ${SALON_PHONE}.`,
    '',
    'Agrega el evento a tu calendario: ' + googleCalendarUrl,
  ];
  if (notes) {
    textLines.push('', `Notas: ${notes}`);
  }

  const icalEventContent = buildIcsContent({
    bookingId,
    clientName,
    serviceName,
    start,
    end,
    assignedName,
    assignedEmail,
    notes,
  });

  await sendMail({
    to,
    subject: `Tu cita en ${SALON_NAME} - ${serviceName}`,
    text: textLines.join('\n'),
    html,
    icalEvent: {
      filename: 'cita-estudio-belleza.ics',
      content: icalEventContent,
      method: 'REQUEST',
    },
  });
};

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
