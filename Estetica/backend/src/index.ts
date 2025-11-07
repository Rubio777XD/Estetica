import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { AssignmentStatus, BookingStatus, PaymentMethod, Prisma, Role } from '@prisma/client';

import { prisma } from './db';
import { authJWT, AuthedRequest } from './authJWT';
import { clearSessionCookie, setSessionCookie } from './session';
import { broadcastEvent, registerSseClient } from './events';
import {
  addMinutes,
  DEFAULT_TZ,
  endOfMonth,
  endOfToday,
  getTimeZoneParts,
  parseDateOnly,
  startOfMonth,
  startOfToday,
} from './utils/timezone';
import { sendAssignmentEmail, sendBookingConfirmationEmail } from './utils/mailer';
import emailRoutes from './routes/email';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = ['http://localhost:3001', 'http://localhost:3003'];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use('/api', emailRoutes);

const SALON_SCHEDULE: Record<number, { open: number; close: number }> = {
  0: { open: 9, close: 21 },
  1: { open: 9, close: 20 },
  2: { open: 9, close: 20 },
  3: { open: 9, close: 20 },
  4: { open: 9, close: 21 },
  5: { open: 9, close: 21 },
  6: { open: 9, close: 21 },
};

class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type SuccessBody<T> = {
  success: true;
  message: string;
  data: T;
} & (T extends Record<string, unknown> ? T : Record<string, never>);

const buildSuccess = <T>(data: T, message = 'Operación exitosa'): SuccessBody<T> => {
  const base: SuccessBody<T> = {
    success: true,
    message,
    data,
    ...(typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {}),
  } as SuccessBody<T>;
  return base;
};

const sendSuccess = <T>(res: Response, data: T, message?: string, status = 200) =>
  res.status(status).json(buildSuccess(data, message));

const sendError = (res: Response, status: number, message: string, details?: unknown) =>
  res.status(status).json({ success: false, message, data: null, error: message, details: details ?? null });

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
const asyncHandler = (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res, next).catch(next);
};

const handlePrismaError = (error: unknown, context: string): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[prisma] known error', { context, code: error.code, meta: error.meta });

    if (error.code === 'P2025') {
      throw new HttpError(404, 'Registro no encontrado');
    }

    if (error.code === 'P2003') {
      throw new HttpError(409, 'No se puede completar la operación por referencias activas');
    }

    throw new HttpError(400, 'No se pudo procesar la operación solicitada');
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[prisma] validation error', { context, message: error.message });
    throw new HttpError(400, 'Parámetros inválidos para la operación solicitada');
  }

  console.error('[prisma] unexpected error', { context, error });
  throw error;
};

const normalizeNotes = (notes?: string | null) => {
  if (notes === null) return null;
  if (typeof notes === 'string') {
    const trimmed = notes.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return undefined;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.scheduled, BookingStatus.confirmed];

const ensureSlotHasCapacity = async (tx: Prisma.TransactionClient, start: Date, end: Date) => {
  if (isUnlimitedSlotCapacity) {
    return;
  }

  const count = await tx.booking.count({
    where: {
      startTime: { lt: end },
      endTime: { gt: start },
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
  });

  if (count >= MAX_PARALLEL_BOOKINGS_PER_SLOT) {
    console.warn('[booking] capacidad simultánea alcanzada, permitiendo traslape', {
      start: start.toISOString(),
      end: end.toISOString(),
      count,
      limit: MAX_PARALLEL_BOOKINGS_PER_SLOT,
    });
  }
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const ASSIGNMENT_EXPIRATION_HOURS = Number(process.env.ASSIGNMENT_EXPIRATION_HOURS || '24');
const ASSIGNMENT_EXPIRATION_MS = ASSIGNMENT_EXPIRATION_HOURS * 60 * 60 * 1000;

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

const parseMaxParallelBookings = () => {
  const raw = process.env.MAX_PARALLEL_BOOKINGS_PER_SLOT;
  if (!raw) {
    return Infinity;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Infinity;
  }

  return numeric;
};

const MAX_PARALLEL_BOOKINGS_PER_SLOT = parseMaxParallelBookings();
const isUnlimitedSlotCapacity = MAX_PARALLEL_BOOKINGS_PER_SLOT === Infinity;

const buildAssignmentAcceptUrl = (token: string) => {
  return `${PUBLIC_API_URL}/api/assignments/accept?token=${encodeURIComponent(token)}`;
};

const renderAssignmentMessage = (title: string, description: string) => `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; color: #111827; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); max-width: 480px; text-align: center; }
      h1 { font-size: 1.75rem; margin-bottom: 16px; }
      p { margin-bottom: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${description}</p>
    </div>
  </body>
</html>`;

const bookingDateFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: DEFAULT_TZ,
  dateStyle: 'medium',
  timeStyle: 'short',
});

type InviteEntry = { email: string; name?: string | null };

const parseInviteEntry = (value: string): InviteEntry => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.email === 'string') {
      return { email: normalizeEmail(parsed.email), name: parsed.name ?? null };
    }
  } catch (error) {
    // fallback to raw value
  }
  return { email: normalizeEmail(value), name: null };
};

const serializeInviteEntry = (entry: InviteEntry) =>
  JSON.stringify({ email: normalizeEmail(entry.email), name: entry.name ? entry.name.trim() : null });

const getInviteNameForEmail = (invited: string[] | null | undefined, email: string) => {
  const normalized = normalizeEmail(email);
  for (const entry of invited ?? []) {
    const parsed = parseInviteEntry(entry);
    if (parsed.email === normalized) {
      if (typeof parsed.name === 'string') {
        const trimmed = parsed.name.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
      break;
    }
  }
  return null;
};

const getBookingCollaboratorName = (
  booking: { invitedEmails?: string[] | null; performedByName?: string | null; assignedEmail?: string | null },
  email?: string | null
) => {
  if (email) {
    const normalized = normalizeEmail(email);
    if (booking.assignedEmail && normalizeEmail(booking.assignedEmail) === normalized) {
      const directName = booking.performedByName?.trim();
      if (directName && directName.length > 0) {
        return directName;
      }
    }
    const inviteName = getInviteNameForEmail(booking.invitedEmails, normalized);
    if (inviteName && inviteName.length > 0) {
      return inviteName;
    }
  }
  const fallbackName = booking.performedByName?.trim();
  return fallbackName && fallbackName.length > 0 ? fallbackName : null;
};

const EMAIL_MATCHER = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const extractEmailFromNotes = (notes?: string | null) => {
  if (!notes) return null;
  const match = notes.match(EMAIL_MATCHER);
  return match ? normalizeEmail(match[0]) : null;
};

const getAssigneeName = async (email?: string | null) => {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });
  return user?.name ?? null;
};

const assignmentPublicSelect = {
  id: true,
  bookingId: true,
  email: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssignmentSelect;

const expireStaleAssignments = async (bookingId?: string) => {
  const now = new Date();
  const where: Prisma.AssignmentWhereInput = {
    status: AssignmentStatus.pending,
    expiresAt: { lt: now },
  };

  if (bookingId) {
    where.bookingId = bookingId;
  }

  const expired = await prisma.assignment.findMany({
    where,
    select: { id: true, bookingId: true },
  });

  if (!expired.length) {
    return;
  }

  await prisma.assignment.updateMany({
    where: { id: { in: expired.map((item) => item.id) } },
    data: { status: AssignmentStatus.expired },
  });

  const affectedBookings = new Set(expired.map((item) => item.bookingId));
  for (const booking of affectedBookings) {
    broadcastEvent('booking:assignment:expired', { bookingId: booking }, 'auth');
  }
};

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;
type LoginAttempt = { count: number; expiresAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.expiresAt <= now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + LOGIN_WINDOW_MS });
    return next();
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return next(new HttpError(429, 'Demasiados intentos. Intenta nuevamente en un minuto.'));
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.expiresAt <= now) {
      loginAttempts.delete(key);
    }
  }
}, LOGIN_WINDOW_MS).unref();

const DEFAULT_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@local.dev';
const DEFAULT_ADMIN_NAME = process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador Autogenerado';
const DEFAULT_ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;

type BootstrapReport = {
  adminCreated?: { email: string; temporaryPassword?: string };
  adminEnsured?: { email: string };
};

const ensureCoreData = async (): Promise<BootstrapReport> => {
  console.info('[bootstrap] verificando datos esenciales', { expectedRoles: Object.values(Role) });

  const report: BootstrapReport = {};
  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!existingAdmin) {
    const temporaryPassword = DEFAULT_ADMIN_PASSWORD ?? randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const admin = await prisma.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: { role: Role.ADMIN, passwordHash, name: DEFAULT_ADMIN_NAME },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        name: DEFAULT_ADMIN_NAME,
        role: Role.ADMIN,
      },
    });

    report.adminCreated = {
      email: admin.email,
      temporaryPassword: DEFAULT_ADMIN_PASSWORD ? undefined : temporaryPassword,
    };
  } else {
    report.adminEnsured = { email: existingAdmin.email };
  }

  return report;
};

app.get('/api/health', (_req, res) => {
  return sendSuccess(
    res,
    { ok: true, service: 'estetica-api', env: process.env.NODE_ENV ?? 'development' },
    'API operativa'
  );
});

app.get(
  '/api/assignments/accept',
  asyncHandler(async (req, res) => {
    const tokenParam = req.query.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

    if (!token || typeof token !== 'string') {
      res.status(400).send(renderAssignmentMessage('Invitación inválida', 'El enlace proporcionado no es válido.'));
      return;
    }

    const assignment = await prisma.assignment.findUnique({
      where: { token },
      include: { booking: { include: { service: true } } },
    });

    if (!assignment) {
      res.status(404).send(renderAssignmentMessage('Invitación no encontrada', 'Esta invitación no existe o ya no está disponible.'));
      return;
    }

    if (assignment.status === AssignmentStatus.declined) {
      res
        .status(410)
        .send(renderAssignmentMessage('Invitación cancelada', 'La cita fue cancelada desde el panel y ya no puede aceptarse.'));
      return;
    }

    if (assignment.status === AssignmentStatus.accepted) {
      res
        .status(200)
        .send(
          renderAssignmentMessage(
            'Invitación ya aceptada',
            'Esta invitación ya fue confirmada anteriormente. ¡Gracias por tu respuesta!'
          )
        );
      return;
    }

    if (assignment.status === AssignmentStatus.expired) {
      res
        .status(410)
        .send(renderAssignmentMessage('Invitación expirada', 'El enlace expiró. Solicita una nueva invitación desde el salón.'));
      return;
    }

    if (assignment.expiresAt.getTime() <= Date.now()) {
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.expired },
      });
      broadcastEvent('booking:assignment:expired', { bookingId: assignment.bookingId }, 'auth');
      res
        .status(410)
        .send(renderAssignmentMessage('Invitación expirada', 'El enlace expiró. Solicita una nueva invitación desde el salón.'));
      return;
    }

    const inviteName = getInviteNameForEmail(assignment.booking.invitedEmails, assignment.email);
    const collaboratorName = inviteName ?? (await getAssigneeName(assignment.email));

    const { updatedAssignment, booking, expiredCount } = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.accepted },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: assignment.bookingId },
        data: {
          assignedEmail: assignment.email,
          assignedAt: new Date(),
          confirmedEmail: assignment.email,
          performedByName: collaboratorName ?? assignment.booking.performedByName ?? null,
        },
        include: { service: true },
      });

      const others = await tx.assignment.updateMany({
        where: {
          bookingId: assignment.bookingId,
          status: AssignmentStatus.pending,
          NOT: { id: assignment.id },
        },
        data: { status: AssignmentStatus.expired },
      });

      return { updatedAssignment: updated, booking: updatedBooking, expiredCount: others.count };
    });

    broadcastEvent('booking:assignment:accepted', { bookingId: booking.id, assignmentId: updatedAssignment.id }, 'auth');
    broadcastEvent('booking:updated', { id: booking.id }, 'auth');
    if (expiredCount > 0) {
      broadcastEvent('booking:assignment:expired', { bookingId: booking.id }, 'auth');
    }

    const summary = bookingDateFormatter.format(booking.startTime);
    res
      .status(200)
      .send(
        renderAssignmentMessage(
          '¡Invitación aceptada!',
          `Confirmaste la cita de ${booking.clientName} para ${booking.service?.name ?? 'servicio'} el ${summary}. ¡Gracias!`
        )
      );
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

app.post(
  '/api/login',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const payload = loginSchema.safeParse(req.body);
    if (!payload.success) {
      throw new HttpError(400, 'Credenciales inválidas', payload.error.flatten());
    }

    const { email, password } = payload.data;
    const clientIdentifier = req.ip || req.socket.remoteAddress || 'unknown';
    const hashedEmail = createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 12);
    console.info('[auth] login attempt', { emailHash: hashedEmail, ip: clientIdentifier });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn('[auth] login failed', { reason: 'not_found', emailHash: hashedEmail, ip: clientIdentifier });
      throw new HttpError(401, 'Credenciales inválidas');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn('[auth] login failed', { reason: 'bad_password', emailHash: hashedEmail, ip: clientIdentifier });
      throw new HttpError(401, 'Credenciales inválidas');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    setSessionCookie(res, token);
    loginAttempts.delete(clientIdentifier);
    console.info('[auth] login success', { emailHash: hashedEmail, ip: clientIdentifier });
    return sendSuccess(res, { token }, 'Inicio de sesión exitoso');
  })
);

app.get('/api/me', authJWT, (req: AuthedRequest, res) => {
  return sendSuccess(res, { user: req.user }, 'Sesión válida');
});

app.post('/api/logout', (_req, res) => {
  clearSessionCookie(res);
  return sendSuccess(res, { loggedOut: true }, 'Sesión finalizada');
});

app.get('/api/public/events', (req, res) => {
  registerSseClient(req, res, 'public');
});

app.get('/api/events', authJWT, (req: AuthedRequest, res) => {
  registerSseClient(req, res, 'auth');
});

const publicRouter = express.Router();

publicRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    try {
      const allServices = await prisma.service.findMany({ orderBy: { name: 'asc' } });
      const filtered = filterActiveServices(allServices);
      const services = filtered.map(({
        id,
        name,
        price,
        duration,
        description,
        imageUrl,
        highlights,
        updatedAt,
      }) => ({
        id,
        name,
        price,
        duration,
        description,
        imageUrl,
        highlights,
        updatedAt,
      }));

      return sendSuccess(res, { services }, 'Servicios públicos');
    } catch (error) {
      handlePrismaError(error, 'service:list:public');
    }
  })
);

publicRouter.get(
  '/bookings/availability',
  asyncHandler(async (req, res) => {
    const parsed = availabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Fecha inválida', parsed.error.flatten());
    }

    const { date } = parsed.data;

    let startOfDay: Date;
    try {
      startOfDay = parseDateOnly(date);
    } catch (error) {
      throw new HttpError(400, 'Fecha inválida');
    }

    const schedule = SALON_SCHEDULE[startOfDay.getUTCDay()];
    if (!schedule) {
      return sendSuccess(
        res,
        { date, timeZone: DEFAULT_TZ, slots: [], bookedWindows: [] },
        'Sin horario configurado'
      );
    }

    const endOfDay = parseDateOnly(date, { endOfDay: true });
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay, lt: endOfDay },
        status: { in: [BookingStatus.scheduled, BookingStatus.confirmed] },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    const slots: { start: string; end: string; available: boolean; conflicted: boolean }[] = [];
    for (let hour = schedule.open; hour < schedule.close; hour += 1) {
      const slotStart = new Date(startOfDay.getTime() + hour * 60 * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      const overlaps = bookings.some((booking) => slotStart < booking.endTime && slotEnd > booking.startTime);
      const isUpcoming = slotEnd > now;
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: isUpcoming,
        conflicted: overlaps,
      });
    }

    const bookedWindows = bookings.map((booking) => ({
      id: booking.id,
      start: booking.startTime.toISOString(),
      end: booking.endTime.toISOString(),
    }));

    return sendSuccess(
      res,
      {
        date,
        timeZone: DEFAULT_TZ,
        slots,
        bookedWindows,
      },
      'Disponibilidad generada'
    );
  })
);

app.use('/api/public', publicRouter);

const protectedRouter = express.Router();
protectedRouter.use(authJWT);

const requireRole = (role: Role) => (req: AuthedRequest, _res: Response, next: NextFunction) => {
  if (req.user?.role !== role) {
    throw new HttpError(403, 'Acceso restringido');
  }
  next();
};

// Services CRUD
const serviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().min(0),
  duration: z.coerce.number().int().min(0).max(480),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine(
      (value) =>
        value === null ||
        value === undefined ||
        value.length === 0 ||
        value.startsWith('/') ||
        /^https?:\/\//i.test(value),
      'URL inválida'
    ),
  highlights: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
});

const buildServiceData = (input: z.infer<typeof serviceSchema>) => {
  const data: {
    name: string;
    price: number;
    duration: number;
    description?: string | null;
    imageUrl?: string | null;
    highlights?: string[];
  } = {
    name: input.name,
    price: input.price,
    duration: input.duration,
  };

  if (input.description !== undefined) {
    const trimmed = input.description?.trim();
    data.description = trimmed && trimmed.length > 0 ? trimmed : null;
  }

  if (input.imageUrl !== undefined) {
    const trimmed = input.imageUrl?.trim();
    data.imageUrl = trimmed && trimmed.length > 0 ? trimmed : null;
  }

  if (input.highlights !== undefined) {
    data.highlights = input.highlights.map((item) => item.trim()).filter((item) => item.length > 0);
  }

  return data;
};

const serviceActiveSchema = z.object({
  active: z.boolean(),
});

type SoftDeleteAwareService = {
  active?: boolean | null;
  deletedAt?: Date | null;
};

const filterActiveServices = <T extends SoftDeleteAwareService>(services: T[]): T[] =>
  services.filter((service) => service.active !== false && (service.deletedAt === undefined || service.deletedAt === null));

const isDeletedAtValidationError = (error: unknown) =>
  error instanceof Prisma.PrismaClientValidationError && error.message.includes('Unknown argument `deletedAt`');

const softDeleteService = async (tx: Prisma.TransactionClient, id: string) => {
  try {
    return await tx.service.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  } catch (error) {
    if (isDeletedAtValidationError(error)) {
      return tx.service.update({
        where: { id },
        data: { active: false },
      });
    }
    throw error;
  }
};

protectedRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    try {
      const allServices = await prisma.service.findMany({ orderBy: { name: 'asc' } });
      const services = filterActiveServices(allServices);
      return sendSuccess(res, { services }, 'Servicios obtenidos');
    } catch (error) {
      handlePrismaError(error, 'service:list:protected');
    }
  })
);

protectedRouter.post(
  '/services',
  asyncHandler(async (req, res) => {
    const result = serviceSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    try {
      const service = await prisma.service.create({ data: buildServiceData(result.data) });
      broadcastEvent('service:created', { id: service.id }, 'all');
      broadcastEvent('stats:invalidate', { reason: 'service-change' }, 'auth');
      return sendSuccess(res, { service }, 'Servicio creado', 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Ya existe un servicio con ese nombre');
      }
      handlePrismaError(error, 'service:create');
    }
  })
);

protectedRouter.put(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const result = serviceSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Servicio no encontrado');
    }

    try {
      const service = await prisma.service.update({ where: { id: req.params.id }, data: buildServiceData(result.data) });
      broadcastEvent('service:updated', { id: service.id }, 'all');
      broadcastEvent('stats:invalidate', { reason: 'service-change' }, 'auth');
      return sendSuccess(res, { service }, 'Servicio actualizado');
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Ya existe un servicio con ese nombre');
      }
      handlePrismaError(error, 'service:update');
    }
  })
);

protectedRouter.patch(
  '/services/:id/active',
  asyncHandler(async (req, res) => {
    const parsed = serviceActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', parsed.error.flatten());
    }

    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.deletedAt) {
      throw new HttpError(404, 'Servicio no encontrado');
    }

    try {
      const service = await prisma.service.update({
        where: { id: req.params.id },
        data: { active: parsed.data.active },
      });

      broadcastEvent('service:updated', { id: service.id }, 'all');
      broadcastEvent('stats:invalidate', { reason: 'service-change' }, 'auth');

      const message = parsed.data.active ? 'Servicio activado' : 'Servicio desactivado';
      return sendSuccess(res, { service }, message);
    } catch (error) {
      handlePrismaError(error, 'service:toggle-active');
    }
  })
);

protectedRouter.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    try {
      const service = await prisma.$transaction(async (tx) => {
        const existing = await tx.service.findUnique({ where: { id: req.params.id } });
        if (!existing || existing.deletedAt) {
          throw new HttpError(404, 'Servicio no encontrado');
        }

        await tx.booking.updateMany({
          where: { serviceId: existing.id },
          data: {
            serviceNameSnapshot: existing.name,
            servicePriceSnapshot: existing.price,
          },
        });

        return softDeleteService(tx, req.params.id);
      });

      broadcastEvent('service:deleted', { id: req.params.id }, 'all');
      broadcastEvent('stats:invalidate', { reason: 'service-change' }, 'auth');
      return sendSuccess(res, { deleted: true, service }, 'Servicio eliminado');
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      handlePrismaError(error, 'service:delete');
    }
  })
);

// Bookings
const bookingCreateSchema = z.object({
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().email().optional().nullable(),
  serviceId: z.string().cuid(),
  startTime: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

const bookingUpdateSchema = bookingCreateSchema.extend({
  status: z.nativeEnum(BookingStatus, {
    invalid_type_error: 'Estado inválido',
  }).optional(),
});

const bookingPriceOverrideSchema = z.object({
  amount: z.union([z.coerce.number().positive(), z.literal(null)]),
});

const bookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    invalid_type_error: 'Estado inválido',
  }),
});

const assignmentCreateSchema = z.object({
  bookingId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
});

const directAssignmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const bookingQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const availabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingCompleteSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  method: z.nativeEnum(PaymentMethod),
  commissionPercentage: z.coerce.number().min(0).max(100),
  completedBy: z.string().trim().min(1).max(100),
});

const commissionCreateSchema = z.object({
  bookingId: z.string().cuid(),
  percentage: z.coerce.number().min(0).max(100),
  amount: z.coerce.number().min(0),
  assigneeEmail: z.string().email().optional().nullable(),
});

const commissionQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  collaborator: z.string().trim().min(1).max(120).optional(),
  collaboratorEmail: z.string().email().optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

protectedRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const parsed = bookingQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to, status, limit } = parsed.data;
    const where: Prisma.BookingWhereInput = {};

    await expireStaleAssignments();

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.startTime = {};
      if (from) {
        where.startTime.gte = parseDateOnly(from);
      }
      if (to) {
        where.startTime.lte = parseDateOnly(to, { endOfDay: true });
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { service: true, payments: true },
      take: limit ?? 100,
    });

    return sendSuccess(res, { bookings }, 'Citas recuperadas');
  })
);

protectedRouter.get(
  '/bookings/unassigned',
  asyncHandler(async (_req, res) => {
    await expireStaleAssignments();

    const bookings = await prisma.booking.findMany({
      where: {
        assignedEmail: null,
        performedByName: null,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      orderBy: { startTime: 'asc' },
      include: {
        service: true,
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: assignmentPublicSelect,
        },
      },
    });

    return sendSuccess(res, { bookings }, 'Citas sin asignar');
  })
);

protectedRouter.get(
  '/bookings/upcoming',
  asyncHandler(async (_req, res) => {
    await expireStaleAssignments();

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        OR: [{ assignedEmail: { not: null } }, { performedByName: { not: null } }],
      },
      orderBy: { startTime: 'asc' },
      include: { service: true, payments: true },
      take: 200,
    });

    return sendSuccess(res, { bookings }, 'Citas próximas');
  })
);

protectedRouter.post(
  '/bookings',
  asyncHandler(async (req, res) => {
    const result = bookingCreateSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const booking = await prisma.$transaction(async (tx) => {
      const { clientName, clientEmail, serviceId, startTime, notes } = result.data;
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        throw new HttpError(404, 'Servicio no encontrado');
      }

      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new HttpError(400, 'Fecha de inicio inválida');
      }

      const end = addMinutes(start, service.duration);
      const normalized = normalizeNotes(notes);
      const normalizedClientEmail = clientEmail ? normalizeEmail(clientEmail) : null;
      const data: Parameters<typeof tx.booking.create>[0]['data'] = {
        clientName,
        clientEmail: normalizedClientEmail,
        serviceId,
        startTime: start,
        endTime: end,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.price,
      };
      if (normalized !== undefined) {
        data.notes = normalized;
      }

      await ensureSlotHasCapacity(tx, start, end);

      return tx.booking.create({
        data,
        include: { service: true, payments: true },
      });
    });

    broadcastEvent('booking:created', { id: booking.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-change' }, 'auth');
    return sendSuccess(res, { booking }, 'Cita creada', 201);
  })
);

publicRouter.post(
  '/bookings',
  asyncHandler(async (req, res) => {
    const result = bookingCreateSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const booking = await prisma.$transaction(async (tx) => {
      const { clientName, clientEmail, serviceId, startTime, notes } = result.data;
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        throw new HttpError(404, 'Servicio no encontrado');
      }

      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new HttpError(400, 'Fecha de inicio inválida');
      }

      const end = addMinutes(start, service.duration);
      const normalized = normalizeNotes(notes);
      const normalizedClientEmail = clientEmail ? normalizeEmail(clientEmail) : null;
      const data: Parameters<typeof tx.booking.create>[0]['data'] = {
        clientName,
        clientEmail: normalizedClientEmail,
        serviceId,
        startTime: start,
        endTime: end,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.price,
      };
      if (normalized !== undefined) {
        data.notes = normalized;
      }

      await ensureSlotHasCapacity(tx, start, end);

      return tx.booking.create({
        data,
        include: { service: true, payments: true },
      });
    });

    broadcastEvent('booking:created', { id: booking.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-change' }, 'auth');
    return sendSuccess(res, { booking }, 'Cita creada', 201);
  })
);

protectedRouter.put(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    const result = bookingUpdateSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        throw new HttpError(404, 'Cita no encontrada');
      }

      const { clientName, clientEmail, serviceId, startTime, notes, status } = result.data;
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        throw new HttpError(404, 'Servicio no encontrado');
      }

      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new HttpError(400, 'Fecha de inicio inválida');
      }

      const normalized = normalizeNotes(notes);
      const normalizedClientEmail = clientEmail ? normalizeEmail(clientEmail) : null;
      const updateData: Parameters<typeof tx.booking.update>[0]['data'] = {
        clientName,
        clientEmail: normalizedClientEmail,
        serviceId,
        startTime: start,
        endTime: addMinutes(start, service.duration),
        status,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.price,
      };
      if (normalized !== undefined) {
        updateData.notes = normalized;
      }

      return tx.booking.update({
        where: { id: req.params.id },
        data: updateData,
        include: { service: true, payments: true },
      });
    });

    broadcastEvent('booking:updated', { id: booking.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-change' }, 'auth');
    return sendSuccess(res, { booking }, 'Cita actualizada');
  })
);

protectedRouter.patch(
  '/bookings/:id/price',
  asyncHandler(async (req, res) => {
    const parsed = bookingPriceOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Monto inválido', parsed.error.flatten());
    }

    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Cita no encontrada');
    }

    const amount = parsed.data.amount;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { amountOverride: amount ?? null },
      include: { service: true, payments: true },
    });

    broadcastEvent('booking:updated', { id: booking.id }, 'auth');
    return sendSuccess(res, { booking }, amount === null ? 'Precio restablecido' : 'Precio actualizado');
  })
);

protectedRouter.patch(
  '/bookings/:id/status',
  asyncHandler(async (req, res) => {
    const result = bookingStatusSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Estado inválido', result.error.flatten());
    }

    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Cita no encontrada');
    }

    const previousStatus = existing.status;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: result.data.status },
      include: { service: true, payments: true },
    });

    if (booking.status === BookingStatus.confirmed && previousStatus !== BookingStatus.confirmed) {
      const contactEmail = booking.clientEmail ?? extractEmailFromNotes(booking.notes);
      if (contactEmail) {
        try {
          const professionalEmail = booking.confirmedEmail ?? booking.assignedEmail ?? null;
          const professionalName = await getAssigneeName(professionalEmail);
          await sendBookingConfirmationEmail({
            to: contactEmail,
            bookingId: booking.id,
            clientName: booking.clientName,
            serviceName: booking.service.name,
            start: booking.startTime,
            end: booking.endTime,
            assignedName: professionalName,
            assignedEmail: professionalEmail,
            notes: booking.notes ?? null,
          });
        } catch (error) {
          console.error('[mailer] No fue posible enviar confirmación de cita', {
            bookingId: booking.id,
            error: error instanceof Error ? error.message : error,
          });
        }
      }
    }

    broadcastEvent('booking:status', { id: booking.id, status: booking.status }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-status' }, 'auth');
    return sendSuccess(res, { booking }, 'Estado actualizado');
  })
);

protectedRouter.post(
  '/bookings/:id/assign-direct',
  asyncHandler(async (req, res) => {
    const parsed = directAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Nombre inválido', parsed.error.flatten());
    }

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      throw new HttpError(404, 'Cita no encontrada');
    }

    if (booking.assignedEmail) {
      throw new HttpError(409, 'La cita ya está asignada');
    }

    if (booking.status === BookingStatus.canceled || booking.status === BookingStatus.done) {
      throw new HttpError(409, 'No es posible asignar esta cita en su estado actual');
    }

    const collaboratorName = parsed.data.name.trim();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.assignment.updateMany({
        where: { bookingId: booking.id, status: AssignmentStatus.pending },
        data: { status: AssignmentStatus.expired },
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          performedByName: collaboratorName,
          assignedAt: booking.assignedAt ?? new Date(),
        },
        include: { service: true, payments: true },
      });
    });

    broadcastEvent('booking:assignment:accepted', { bookingId: updated.id }, 'auth');
    broadcastEvent('booking:updated', { id: updated.id }, 'auth');

    return sendSuccess(res, { booking: updated }, 'Cita asignada manualmente');
  })
);

protectedRouter.delete(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    try {
      await prisma.booking.delete({ where: { id: req.params.id } });
    } catch (error) {
      throw new HttpError(404, 'Cita no encontrada');
    }
    broadcastEvent('booking:deleted', { id: req.params.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-change' }, 'auth');
    return sendSuccess(res, { deleted: true }, 'Cita eliminada');
  })
);

protectedRouter.post(
  '/bookings/:id/complete',
  asyncHandler(async (req, res) => {
    const parsed = bookingCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', parsed.error.flatten());
    }

    const { amount, method, commissionPercentage, completedBy } = parsed.data;
    const completedByName = completedBy.trim();

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: req.params.id },
        include: { service: true },
      });

      if (!booking) {
        throw new HttpError(404, 'Cita no encontrada');
      }

      if (booking.status === BookingStatus.canceled) {
        throw new HttpError(409, 'No se puede completar una cita cancelada');
      }

      if (booking.status === BookingStatus.done) {
        throw new HttpError(409, 'La cita ya fue completada');
      }

      const baseAmount = amount ?? booking.amountOverride ?? booking.service.price;
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        throw new HttpError(400, 'El monto final de la cita es inválido');
      }

      const finalAmount = roundCurrency(baseAmount);
      const commissionAmount = roundCurrency((finalAmount * commissionPercentage) / 100);

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: finalAmount,
          method,
        },
      });

      const commission = await tx.commission.create({
        data: {
          bookingId: booking.id,
          percentage: commissionPercentage,
          amount: commissionAmount,
          assigneeEmail: booking.assignedEmail ?? null,
        },
      });

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.done, completedBy: completedByName },
        include: { service: true, payments: true, commissions: true },
      });

      return { booking: updatedBooking, payment, commission };
    });

    broadcastEvent('payment:created', { id: result.payment.id }, 'auth');
    broadcastEvent('payments:invalidate', { id: result.payment.id }, 'auth');
    broadcastEvent('commission:created', { id: result.commission.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-completed' }, 'auth');
    broadcastEvent('booking:status', { id: result.booking.id, status: result.booking.status }, 'auth');

    return sendSuccess(res, result, 'Cita completada');
  })
);

protectedRouter.post(
  '/assignments',
  asyncHandler(async (req, res) => {
    const parsed = assignmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', parsed.error.flatten());
    }

    const { bookingId, email, name } = parsed.data;
    const normalizedEmail = normalizeEmail(email);
    const inviteeName = name?.trim() ? name.trim() : null;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      throw new HttpError(404, 'Cita no encontrada');
    }

    if (booking.assignedEmail) {
      throw new HttpError(409, 'La cita ya está asignada');
    }

    await expireStaleAssignments(bookingId);

    const inviteEntries = (booking.invitedEmails ?? []).map(parseInviteEntry);
    const existingInvitesByEmail = new Map<string, { index: number; entry: InviteEntry }>();
    inviteEntries.forEach((entry, index) => {
      existingInvitesByEmail.set(entry.email, { index, entry });
    });

    if (existingInvitesByEmail.has(normalizedEmail)) {
      const { index, entry: existingEntry } = existingInvitesByEmail.get(normalizedEmail)!;
      inviteEntries[index] = {
        email: normalizedEmail,
        name: inviteeName ?? existingEntry.name ?? null,
      };
    } else {
      if (inviteEntries.length >= 3) {
        throw new HttpError(409, 'Solo se pueden enviar hasta 3 invitaciones por cita');
      }
      inviteEntries.push({ email: normalizedEmail, name: inviteeName });
    }

    const updatedInvitedEmails = inviteEntries.map(serializeInviteEntry);

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ASSIGNMENT_EXPIRATION_MS);

    const { assignment } = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          bookingId,
          email: normalizedEmail,
          token,
          expiresAt,
        },
        select: assignmentPublicSelect,
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { invitedEmails: updatedInvitedEmails },
      });

      return { assignment: created };
    });

    booking.invitedEmails = updatedInvitedEmails;

    const acceptUrl = buildAssignmentAcceptUrl(token);

    try {
      await sendAssignmentEmail({
        to: normalizedEmail,
        clientName: booking.clientName,
        serviceName: booking.service.name,
        start: booking.startTime,
        end: booking.endTime,
        notes: booking.notes ?? null,
        acceptUrl,
        expiresAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error-desconocido';
      console.error('[assignments] no fue posible enviar la invitación', { bookingId, message });
      await prisma.assignment.delete({ where: { id: assignment.id } }).catch(() => undefined);
      throw new HttpError(500, 'No fue posible enviar el correo');
    }

    broadcastEvent('booking:assignment:sent', { bookingId, assignmentId: assignment.id }, 'auth');
    broadcastEvent('booking:updated', { id: booking.id }, 'auth');

    return sendSuccess(res, { assignment }, 'Invitación enviada', 201);
  })
);

protectedRouter.delete(
  '/assignments/:id',
  asyncHandler(async (req, res) => {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      select: { id: true, bookingId: true, status: true },
    });

    if (!assignment) {
      throw new HttpError(404, 'Invitación no encontrada');
    }

    if (assignment.status !== AssignmentStatus.pending) {
      throw new HttpError(409, 'La invitación ya no se puede cancelar');
    }

    const updated = await prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.declined },
      select: assignmentPublicSelect,
    });

    broadcastEvent('booking:assignment:cancelled', { bookingId: updated.bookingId, assignmentId: updated.id }, 'auth');

    return sendSuccess(res, { assignment: updated }, 'Invitación cancelada');
  })
);

// Payments
const paymentBodySchema = z.object({
  bookingId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
});

const paymentQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

protectedRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const parsed = paymentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to } = parsed.data;
    const where: Prisma.PaymentWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = parseDateOnly(from);
      }
      if (to) {
        where.createdAt.lte = parseDateOnly(to, { endOfDay: true });
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { booking: { include: { service: true } } },
      take: 200,
    });

    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return sendSuccess(res, { payments, totalAmount }, 'Pagos recuperados');
  })
);

protectedRouter.post(
  '/payments',
  asyncHandler(async (req, res) => {
    const result = paymentBodySchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const payment = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: result.data.bookingId } });
      if (!booking) {
        throw new HttpError(404, 'Cita no encontrada para pago');
      }

      return tx.payment.create({
        data: result.data,
        include: { booking: { include: { service: true } } },
      });
    });

    broadcastEvent('payment:created', { id: payment.id }, 'auth');
    broadcastEvent('payments:invalidate', { id: payment.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'payment-change' }, 'auth');
    return sendSuccess(res, { payment }, 'Pago registrado', 201);
  })
);

type CommissionRow = {
  bookingId: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  assignedEmail: string | null | undefined;
  assignedName: string | null;
  commissionAssigneeEmail: string | null;
  commissionAssigneeName: string | null;
  paymentMethod: PaymentMethod | null;
  paymentCreatedAt: Date | null;
  amount: number;
  commissionAmount: number;
  commissionPercentage: number;
};

const mapBookingsToCommissionRows = (
  bookings: Array<Prisma.BookingGetPayload<{ include: { service: true; payments: true; commissions: true } }>>
): CommissionRow[] => {
  return bookings.map((booking) => {
    const latestPayment = booking.payments.reduce<typeof booking.payments[number] | null>((latest, current) => {
      if (!latest) return current;
      return new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest;
    }, null);

    const latestCommission = booking.commissions.reduce<typeof booking.commissions[number] | null>((latest, current) => {
      if (!latest) return current;
      return new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest;
    }, null);

    const amount = latestPayment?.amount ?? booking.amountOverride ?? booking.service.price;
    const commissionAmount = latestCommission?.amount ?? 0;
    const percentage = latestCommission?.percentage ?? 0;
    const assignedName = getBookingCollaboratorName(booking, booking.assignedEmail ?? undefined);
    const commissionAssigneeName = latestCommission?.assigneeEmail
      ? getBookingCollaboratorName(booking, latestCommission.assigneeEmail)
      : null;

    return {
      bookingId: booking.id,
      clientName: booking.clientName,
      serviceName: booking.service.name,
      startTime: booking.startTime.toISOString(),
      assignedEmail: booking.assignedEmail,
      assignedName,
      commissionAssigneeEmail: latestCommission?.assigneeEmail ?? null,
      commissionAssigneeName,
      paymentMethod: latestPayment?.method ?? null,
      paymentCreatedAt: latestPayment?.createdAt ?? null,
      amount: roundCurrency(amount ?? 0),
      commissionAmount: roundCurrency(commissionAmount),
      commissionPercentage: percentage,
    } satisfies CommissionRow;
  });
};

const getCollaboratorDetailsFromRow = (row: CommissionRow) => {
  const nameCandidate = [row.assignedName, row.commissionAssigneeName].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const emailCandidate = [row.assignedEmail, row.commissionAssigneeEmail].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  return {
    name: nameCandidate?.trim() ?? null,
    email: emailCandidate?.trim() ?? null,
  };
};

const getCollaboratorDisplayFromRow = (row: CommissionRow) => {
  const details = getCollaboratorDetailsFromRow(row);
  if (details.name) {
    return details.name;
  }
  return details.email ?? '';
};

const filterRowsByCollaborator = (
  rows: CommissionRow[],
  collaborator?: string | null,
  collaboratorEmail?: string | null,
) => {
  const searchTerm = collaborator?.trim().toLowerCase() ?? collaboratorEmail?.trim().toLowerCase() ?? null;
  if (!searchTerm) {
    return rows;
  }

  return rows.filter((row) => {
    const values = [
      row.assignedName,
      row.assignedEmail ?? null,
      row.commissionAssigneeName,
      row.commissionAssigneeEmail,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase());
    return values.some((value) => value.includes(searchTerm));
  });
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: DEFAULT_TZ,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatCurrencyValue = (value: number) => currencyFormatter.format(value);

const formatDateTimeValue = (value: string | Date) =>
  dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);

protectedRouter.post(
  '/commissions',
  asyncHandler(async (req, res) => {
    const parsed = commissionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', parsed.error.flatten());
    }

    const { bookingId, percentage, amount, assigneeEmail } = parsed.data;
    const normalizedEmail = assigneeEmail ? normalizeEmail(assigneeEmail) : null;

    const commission = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        throw new HttpError(404, 'Cita no encontrada');
      }

      return tx.commission.create({
        data: {
          bookingId,
          percentage,
          amount: roundCurrency(amount),
          assigneeEmail: normalizedEmail,
        },
      });
    });

    broadcastEvent('commission:created', { id: commission.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'commission-change' }, 'auth');
    return sendSuccess(res, { commission }, 'Comisión registrada', 201);
  })
);

protectedRouter.get(
  '/commissions',
  asyncHandler(async (req, res) => {
    const parsed = commissionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to, collaborator, collaboratorEmail, q } = parsed.data;
    const collaboratorQuery = q ?? collaborator ?? null;
    const where: Prisma.BookingWhereInput = {
      status: BookingStatus.done,
    };

    if (from || to) {
      where.startTime = {};
      if (from) {
        where.startTime.gte = parseDateOnly(from);
      }
      if (to) {
        where.startTime.lte = parseDateOnly(to, { endOfDay: true });
      }
    }

    const searchOr: Prisma.BookingWhereInput[] = [];

    if (collaboratorEmail) {
      const normalizedCollaborator = normalizeEmail(collaboratorEmail);
      searchOr.push({ assignedEmail: normalizedCollaborator });
      searchOr.push({ commissions: { some: { assigneeEmail: normalizedCollaborator } } });
    }

    if (collaboratorQuery && EMAIL_MATCHER.test(collaboratorQuery)) {
      const normalizedCollaborator = normalizeEmail(collaboratorQuery);
      searchOr.push({ assignedEmail: normalizedCollaborator });
      searchOr.push({ commissions: { some: { assigneeEmail: normalizedCollaborator } } });
    }

    if (searchOr.length > 0) {
      where.OR = searchOr;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: { service: true, payments: true, commissions: true },
      take: 500,
    });

    const rows = mapBookingsToCommissionRows(bookings);
    const filteredRows = filterRowsByCollaborator(rows, collaboratorQuery, collaboratorEmail);

    const totalAmount = filteredRows.reduce((sum, item) => sum + item.amount, 0);
    const totalCommission = filteredRows.reduce((sum, item) => sum + item.commissionAmount, 0);

    const collaboratorSet = new Set<string>();
    filteredRows.forEach((row) => {
      [row.assignedName, row.assignedEmail, row.commissionAssigneeName, row.commissionAssigneeEmail]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .forEach((value) => collaboratorSet.add(value.trim()));
    });

    return sendSuccess(
      res,
      {
        rows: filteredRows,
        totalAmount: roundCurrency(totalAmount),
        totalCommission: roundCurrency(totalCommission),
        collaborators: Array.from(collaboratorSet).sort((a, b) => a.localeCompare(b)),
      },
      'Pagos y comisiones'
    );
  })
);

protectedRouter.get(
  '/commissions/export',
  asyncHandler(async (req, res) => {
    const parsed = commissionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to, collaboratorEmail, collaborator, q } = parsed.data;
    const collaboratorQuery = q ?? collaborator ?? null;
    const where: Prisma.BookingWhereInput = {
      status: BookingStatus.done,
    };

    if (from || to) {
      where.startTime = {};
      if (from) {
        where.startTime.gte = parseDateOnly(from);
      }
      if (to) {
        where.startTime.lte = parseDateOnly(to, { endOfDay: true });
      }
    }

    const searchOr: Prisma.BookingWhereInput[] = [];

    if (collaboratorEmail) {
      const normalizedCollaborator = normalizeEmail(collaboratorEmail);
      searchOr.push({ assignedEmail: normalizedCollaborator });
      searchOr.push({ commissions: { some: { assigneeEmail: normalizedCollaborator } } });
    }

    if (collaboratorQuery && EMAIL_MATCHER.test(collaboratorQuery)) {
      const normalizedCollaborator = normalizeEmail(collaboratorQuery);
      searchOr.push({ assignedEmail: normalizedCollaborator });
      searchOr.push({ commissions: { some: { assigneeEmail: normalizedCollaborator } } });
    }

    if (searchOr.length > 0) {
      where.OR = searchOr;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: { service: true, payments: true, commissions: true },
    });

    const rows = mapBookingsToCommissionRows(bookings);
    const filteredRows = filterRowsByCollaborator(rows, collaboratorQuery, collaboratorEmail);
    const headers = ['Fecha', 'Cliente', 'Servicio', 'Total de la cita', 'Comisión', 'Método', 'Colaboradora'];
    const csvLines = [headers.join(',')];

    const escape = (value: string | number | null | undefined) => {
      if (value === null || typeof value === 'undefined') return '';
      const stringValue = typeof value === 'number' ? value.toString() : value;
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    for (const row of filteredRows) {
      const methodLabel = row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : '—';
      const collaboratorDisplay = getCollaboratorDisplayFromRow(row);
      const values = [
        escape(formatDateTimeValue(row.startTime)),
        escape(row.clientName),
        escape(row.serviceName),
        escape(formatCurrencyValue(row.amount)),
        escape(formatCurrencyValue(row.commissionAmount)),
        escape(methodLabel),
        escape(collaboratorDisplay),
      ];
      csvLines.push(values.join(','));
    }

    const csvContent = '\ufeff' + csvLines.join('\n');
    const filename = `pagos_comisiones_${from ?? 'inicio'}_${to ?? 'hoy'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  })
);

// Inventory
const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
});

protectedRouter.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess(res, { products }, 'Inventario recuperado');
  })
);

protectedRouter.get(
  '/products/low-stock',
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany();
    const lowStock = products
      .filter((product) => product.stock <= product.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock);
    return sendSuccess(res, { products: lowStock }, 'Productos con poco stock');
  })
);

protectedRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const result = productSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const product = await prisma.product.create({ data: result.data });
    broadcastEvent('product:created', { id: product.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'inventory-change' }, 'auth');
    return sendSuccess(res, { product }, 'Producto creado', 201);
  })
);

protectedRouter.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const result = productSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new HttpError(404, 'Producto no encontrado');
    }

    const product = await prisma.product.update({ where: { id: req.params.id }, data: result.data });
    broadcastEvent('product:updated', { id: product.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'inventory-change' }, 'auth');
    return sendSuccess(res, { product }, 'Producto actualizado');
  })
);

protectedRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    try {
      await prisma.product.delete({ where: { id: req.params.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(404, 'Producto no encontrado');
      }
      throw error;
    }
    broadcastEvent('product:deleted', { id: req.params.id }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'inventory-change' }, 'auth');
    return sendSuccess(res, { deleted: true }, 'Producto eliminado');
  })
);

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.nativeEnum(Role),
});

protectedRouter.get(
  '/users',
  requireRole(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return sendSuccess(res, { users }, 'Usuarios recuperados');
  })
);

protectedRouter.post(
  '/users',
  requireRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Datos inválidos', parsed.error.flatten());
    }

    const { email, password, name, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return sendSuccess(res, { user }, 'Usuario creado', 201);
  })
);

// Stats
protectedRouter.get(
  '/stats/overview',
  asyncHandler(async (_req, res) => {
    const todayStart = startOfToday(DEFAULT_TZ);
    const todayEnd = endOfToday(DEFAULT_TZ);

    const todayGroup = await prisma.booking.groupBy({
      by: ['status'],
      where: { startTime: { gte: todayStart, lte: todayEnd } },
      _count: { status: true },
    });

    const todayCounts = {
      scheduled: 0,
      confirmed: 0,
      done: 0,
      canceled: 0,
    } as Record<string, number>;

    for (const row of todayGroup) {
      todayCounts[row.status] = row._count.status;
    }

    const monthStart = startOfMonth(new Date(), DEFAULT_TZ);
    const monthEnd = endOfMonth(new Date(), DEFAULT_TZ);

    const payments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    });

    const topServices = await prisma.booking.groupBy({
      by: ['serviceId'],
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    });

    const serviceIds = topServices.map((item) => item.serviceId);
    const serviceMap = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });
    const serviceNameById = new Map(serviceMap.map((service) => [service.id, service.name] as const));

    const lowStockProducts = await prisma.product.findMany();
    const lowStockCount = lowStockProducts.filter((product) => product.stock <= product.lowStockThreshold).length;

    return sendSuccess(res, {
      todayBookings: todayCounts,
      monthlyRevenue: payments._sum.amount ?? 0,
      topServices: topServices.map((item) => ({
        serviceId: item.serviceId,
        name: serviceNameById.get(item.serviceId) ?? 'Servicio',
        count: item._count.serviceId,
      })),
      lowStockProducts: lowStockCount,
    });
  })
);

const revenueQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

protectedRouter.get(
  '/stats/revenue',
  asyncHandler(async (req, res) => {
    const parsed = revenueQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to } = parsed.data;
    const start = from ? parseDateOnly(from) : startOfMonth(new Date(), DEFAULT_TZ);
    const end = to ? parseDateOnly(to, { endOfDay: true }) : endOfMonth(new Date(), DEFAULT_TZ);

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    });

    const totals = new Map<string, number>();
    for (const payment of payments) {
      const parts = getTimeZoneParts(payment.createdAt, DEFAULT_TZ);
      const key = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      totals.set(key, (totals.get(key) ?? 0) + payment.amount);
    }

    const series = Array.from(totals.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .map(([dateKey, amount]) => ({ date: parseDateOnly(dateKey).toISOString(), amount }));

    return sendSuccess(res, { series }, 'Serie de ingresos');
  })
);

app.use('/api', protectedRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return sendError(res, err.status, err.message, err.details);
  }

  if (err instanceof z.ZodError) {
    return sendError(res, 400, 'Validación inválida', err.flatten());
  }

  console.error('[api] unhandled error', err);
  return sendError(res, 500, 'Error inesperado');
});

const port = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    const report = await ensureCoreData();
    if (report.adminCreated) {
      console.info('[bootstrap] administrador creado', report.adminCreated);
    } else if (report.adminEnsured) {
      console.info('[bootstrap] administrador existente', report.adminEnsured);
    }

    app.listen(port, () => console.log(`✅ API server ready on port ${port}`));
  } catch (error) {
    console.error('[bootstrap] No fue posible inicializar el servidor', error);
    process.exit(1);
  }
};

void startServer();
