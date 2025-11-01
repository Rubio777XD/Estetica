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

const EMAIL_BACKGROUND = '#050505';
const EMAIL_CARD_BACKGROUND = '#111111';
const EMAIL_PANEL_BACKGROUND = '#181818';
const EMAIL_BORDER = 'rgba(234, 220, 199, 0.28)';
const EMAIL_TEXT_PRIMARY = '#F8F5F0';
const EMAIL_TEXT_MUTED = '#CBBFAF';
const EMAIL_TEXT_SUBTLE = '#9E9385';
const EMAIL_GOLD = '#EADCC7';
const EMAIL_GOLD_HOVER = '#F3E8D7';
const EMAIL_GOLD_ACTIVE = '#D9C6A8';

const LUXURY_EMAIL_STYLES = `
  :root {
    color-scheme: dark;
  }

  body {
    margin: 0;
    padding: 32px 20px;
    background: ${EMAIL_BACKGROUND};
    color: ${EMAIL_TEXT_PRIMARY};
    font-family: 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
  }

  .wrapper {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
  }

  .card {
    background: ${EMAIL_CARD_BACKGROUND};
    border-radius: 28px;
    border: 1px solid ${EMAIL_BORDER};
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45);
  }

  .header {
    padding: 38px 32px 32px 32px;
    background: linear-gradient(135deg, #050505 0%, #181818 100%);
    text-align: center;
    border-bottom: 1px solid rgba(234, 220, 199, 0.22);
  }

  .brand {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    font-size: 12px;
    color: ${EMAIL_TEXT_SUBTLE};
  }

  .title {
    margin: 18px 0 0 0;
    font-size: 28px;
    letter-spacing: 0.02em;
    color: ${EMAIL_GOLD};
    font-weight: 600;
  }

  .content {
    padding: 32px;
    background: ${EMAIL_CARD_BACKGROUND};
  }

  .paragraph {
    margin: 0 0 18px 0;
    font-size: 15px;
    color: ${EMAIL_TEXT_PRIMARY};
  }

  .paragraph.muted {
    color: ${EMAIL_TEXT_MUTED};
  }

  .info-card {
    margin-top: 24px;
    padding: 22px 24px;
    background: ${EMAIL_PANEL_BACKGROUND};
    border-radius: 20px;
    border: 1px solid rgba(234, 220, 199, 0.18);
  }

  .info-table {
    width: 100%;
    border-collapse: collapse;
  }

  .info-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: ${EMAIL_TEXT_SUBTLE};
    padding: 6px 0;
    vertical-align: top;
  }

  .info-value {
    font-size: 15px;
    font-weight: 600;
    color: ${EMAIL_TEXT_PRIMARY};
    padding: 6px 0;
    text-align: right;
  }

  .note {
    margin-top: 24px;
    padding: 18px 20px;
    background: rgba(234, 220, 199, 0.12);
    border-radius: 18px;
    border: 1px solid rgba(234, 220, 199, 0.22);
    color: ${EMAIL_TEXT_PRIMARY};
    font-size: 14px;
    line-height: 1.6;
  }

  .note strong {
    color: ${EMAIL_GOLD};
  }

  .cta {
    margin-top: 30px;
    text-align: center;
  }

  .button {
    display: inline-block;
    background: ${EMAIL_GOLD};
    color: #111111 !important;
    padding: 14px 36px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .button:hover {
    background: ${EMAIL_GOLD_HOVER} !important;
    color: #111111 !important;
  }

  .button:active {
    background: ${EMAIL_GOLD_ACTIVE} !important;
    color: #111111 !important;
  }

  .cta-desc {
    margin: 12px auto 0 auto;
    max-width: 420px;
    font-size: 13px;
    color: ${EMAIL_TEXT_MUTED};
  }

  .footer {
    padding: 24px 32px 32px 32px;
    text-align: center;
    background: ${EMAIL_CARD_BACKGROUND};
    border-top: 1px solid rgba(234, 220, 199, 0.22);
  }

  .footer p {
    margin: 4px 0;
    font-size: 12px;
    color: ${EMAIL_TEXT_SUBTLE};
  }

  @media (max-width: 600px) {
    body {
      padding: 24px 12px;
    }

    .content {
      padding: 28px 20px;
    }
  }
`;

interface LuxuryEmailTemplateOptions {
  title: string;
  greeting?: string;
  introLines?: string[];
  detailRows: { label: string; value: string }[];
  notes?: string | null;
  notesLabel?: string;
  action?: { href: string; label: string };
  actionDescription?: string;
  outroLines?: string[];
  structuredData?: Record<string, unknown>;
}

const buildLuxuryEmailHtml = (options: LuxuryEmailTemplateOptions) => {
  const {
    title,
    greeting,
    introLines = [],
    detailRows,
    notes,
    notesLabel = 'Notas adicionales',
    action,
    actionDescription,
    outroLines = [],
    structuredData,
  } = options;

  const detailRowsHtml = detailRows
    .map(
      (row) => `
        <tr>
          <td class="info-label">${escapeHtml(row.label)}</td>
          <td class="info-value">${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join('');

  const notesHtml = notes && notes.trim().length > 0
    ? `<div class="note"><strong>${escapeHtml(notesLabel)}:</strong><br />${escapeHtml(notes).replace(/\r?\n/g, '<br />')}</div>`
    : '';

  const greetingHtml = greeting ? `<p class="paragraph">${escapeHtml(greeting)}</p>` : '';
  const introHtml = introLines.map((line) => `<p class="paragraph">${escapeHtml(line)}</p>`).join('');
  const outroHtml = outroLines.map((line) => `<p class="paragraph muted">${escapeHtml(line)}</p>`).join('');

  const actionHtml = action
    ? `<div class="cta">
        <a class="button" href="${escapeHtml(action.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}</a>
        ${actionDescription ? `<p class="cta-desc">${escapeHtml(actionDescription)}</p>` : ''}
      </div>`
    : '';

  const structuredDataScript = structuredData
    ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
    : '';

  return `<!DOCTYPE html>
  <html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>${escapeHtml(title)}</title>
      <style>${LUXURY_EMAIL_STYLES}</style>
      ${structuredDataScript}
    </head>
    <body style="background:${EMAIL_BACKGROUND}; margin:0; padding:32px 20px;">
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <p class="brand">${escapeHtml(SALON_FULL_NAME)}</p>
            <h1 class="title">${escapeHtml(title)}</h1>
          </div>
          <div class="content">
            ${greetingHtml}
            ${introHtml}
            <div class="info-card">
              <table class="info-table" role="presentation" cellspacing="0" cellpadding="0">
                ${detailRowsHtml}
              </table>
            </div>
            ${notesHtml}
            ${actionHtml}
            ${outroHtml}
          </div>
          <div class="footer">
            <p>${escapeHtml(SALON_FULL_NAME)}</p>
            <p>${escapeHtml(SALON_ADDRESS)}</p>
            <p>Tel. ${escapeHtml(SALON_PHONE)}</p>
          </div>
        </div>
      </div>
    </body>
  </html>`;
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

  const html = buildLuxuryEmailHtml({
    title: 'Tu cita ha sido confirmada',
    greeting: `Hola ${clientName},`,
    introLines: [
      '¡Gracias por confiar en nosotras! Tu espacio está reservado y listo para consentirte.',
      'Estos son los detalles de tu visita a nuestro estudio premium:',
    ],
    detailRows: [
      { label: 'Servicio', value: serviceName },
      { label: 'Fecha y hora', value: `${dayText} · ${startHour} – ${endHour}` },
      { label: 'Profesional', value: assignedLabel },
      { label: 'Dirección', value: SALON_ADDRESS },
      { label: 'Contacto', value: `Tel. ${SALON_PHONE}` },
    ],
    notes,
    notesLabel: 'Notas adicionales',
    action: { href: googleCalendarUrl, label: 'Agregar al calendario' },
    actionDescription: 'Guarda esta cita en tu agenda y recibe recordatorios en el horario que prefieras.',
    outroLines: [`Si necesitas reprogramar o tienes alguna duda, contáctanos al ${SALON_PHONE} o responde a este correo.`],
    structuredData: schema,
  });

  const textLines = [
    `Hola ${clientName},`,
    '',
    'Tu cita fue confirmada en Studio de Belleza AR.',
    `Servicio: ${serviceName}.`,
    `Fecha: ${dayText}.`,
    `Horario: ${startHour} – ${endHour}.`,
    `Profesional: ${assignedLabel}.`,
    `Dirección: ${SALON_ADDRESS}.`,
    `Teléfono: ${SALON_PHONE}.`,
    '',
    `Agrega el evento a tu calendario: ${googleCalendarUrl}`,
  ];
  if (notes) {
    textLines.push('', `Notas adicionales: ${notes}`);
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
    `Este enlace vence el ${expiresText}.`,
    '',
    'Si no puedes tomarla, simplemente ignora este mensaje.'
  );

  const html = buildLuxuryEmailHtml({
    title: 'Invitación a tomar una cita',
    greeting: 'Hola,',
    introLines: [
      `Has sido invitada a tomar la cita de ${clientName} para el servicio ${serviceName}.`,
      'Confirma tu disponibilidad dando clic en el botón dorado.',
    ],
    detailRows: [
      { label: 'Servicio', value: serviceName },
      { label: 'Cliente', value: clientName },
      { label: 'Horario', value: windowText },
      { label: 'Dirección', value: SALON_ADDRESS },
      { label: 'Contacto', value: `Tel. ${SALON_PHONE}` },
    ],
    notes,
    notesLabel: 'Notas del cliente',
    action: { href: acceptUrl, label: 'Aceptar invitación' },
    actionDescription: `El enlace vence el ${expiresText}.`,
    outroLines: ['Si no puedes tomarla, simplemente ignora este mensaje y otra compañera podrá aceptarla.'],
  });

  await sendMail({
    to,
    subject: `Invitación para cita de ${clientName}`,
    text: textLines.join('\n'),
    html,
  });
};
