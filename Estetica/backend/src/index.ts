import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { BookingStatus, PaymentMethod, Prisma, Role } from '@prisma/client';

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

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = ['http://localhost:3001', 'http://localhost:3003'];
if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
}

app.use(express.json());

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

const normalizeNotes = (notes?: string | null) => {
  if (notes === null) return null;
  if (typeof notes === 'string') {
    const trimmed = notes.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return undefined;
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
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        description: true,
        imageUrl: true,
        highlights: true,
        updatedAt: true,
      },
    });

    return sendSuccess(res, { services }, 'Servicios públicos');
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
  price: z.coerce.number().positive(),
  duration: z.coerce.number().int().min(5).max(480),
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

protectedRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, { services }, 'Servicios obtenidos');
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
      throw error;
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
      throw error;
    }
  })
);

protectedRouter.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    try {
      await prisma.service.delete({ where: { id: req.params.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new HttpError(404, 'Servicio no encontrado');
        }
        if (error.code === 'P2003') {
          throw new HttpError(409, 'No se puede eliminar un servicio con citas asociadas');
        }
      }
      throw error;
    }
    broadcastEvent('service:deleted', { id: req.params.id }, 'all');
    broadcastEvent('stats:invalidate', { reason: 'service-change' }, 'auth');
    return sendSuccess(res, { deleted: true }, 'Servicio eliminado');
  })
);

// Bookings
const bookingCreateSchema = z.object({
  clientName: z.string().trim().min(1).max(120),
  serviceId: z.string().cuid(),
  startTime: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

const bookingUpdateSchema = bookingCreateSchema.extend({
  status: z.nativeEnum(BookingStatus, {
    invalid_type_error: 'Estado inválido',
  }).optional(),
});

const bookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    invalid_type_error: 'Estado inválido',
  }),
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

protectedRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const parsed = bookingQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Parámetros inválidos', parsed.error.flatten());
    }

    const { from, to, status, limit } = parsed.data;
    const where: Prisma.BookingWhereInput = {};

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

protectedRouter.post(
  '/bookings',
  asyncHandler(async (req, res) => {
    const result = bookingCreateSchema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, 'Datos inválidos', result.error.flatten());
    }

    const booking = await prisma.$transaction(async (tx) => {
      const { clientName, serviceId, startTime, notes } = result.data;
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
      const data: Parameters<typeof tx.booking.create>[0]['data'] = {
        clientName,
        serviceId,
        startTime: start,
        endTime: end,
      };
      if (normalized !== undefined) {
        data.notes = normalized;
      }

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

      const { clientName, serviceId, startTime, notes, status } = result.data;
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        throw new HttpError(404, 'Servicio no encontrado');
      }

      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new HttpError(400, 'Fecha de inicio inválida');
      }

      const normalized = normalizeNotes(notes);
      const updateData: Parameters<typeof tx.booking.update>[0]['data'] = {
        clientName,
        serviceId,
        startTime: start,
        endTime: addMinutes(start, service.duration),
        status,
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

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: result.data.status },
      include: { service: true, payments: true },
    });

    broadcastEvent('booking:status', { id: booking.id, status: booking.status }, 'auth');
    broadcastEvent('stats:invalidate', { reason: 'booking-status' }, 'auth');
    return sendSuccess(res, { booking }, 'Estado actualizado');
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
