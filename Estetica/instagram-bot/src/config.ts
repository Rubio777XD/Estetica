import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z
  .object({
    META_APP_ID: z.string().min(1),
    META_APP_SECRET: z.string().min(1),
    META_VERIFY_TOKEN: z.string().min(1),
    META_LONG_LIVED_TOKEN: z.string().min(1),
    META_PAGE_ID: z.string().min(1),
    IG_USER_ID: z.string().min(1),
    WEBHOOK_PUBLIC_URL: z.string().url().optional(),
    BACKEND_URL: z.string().url(),
    TIMEZONE: z.string().min(1),
    OPENING_HOUR: z.coerce.number().int().min(0).max(23),
    CLOSING_HOUR: z.coerce.number().int().min(1).max(24),
    SLOT_MINUTES: z.coerce.number().int().min(15).max(240),
    CLOSED_DAYS: z.string().optional().default(''),
    PORT: z.coerce.number().int().positive().default(3005),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SERVICE_REFRESH_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(10),
  })
  .refine((data) => data.OPENING_HOUR < data.CLOSING_HOUR, {
    message: 'OPENING_HOUR debe ser menor que CLOSING_HOUR',
    path: ['OPENING_HOUR'],
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten());
  process.exit(1);
}

const dayMap: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const closedDays = parsed.data.CLOSED_DAYS
  ? parsed.data.CLOSED_DAYS.split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0)
      .map((part) => dayMap[part])
      .filter((value): value is number => value !== undefined)
  : [];

export const config = {
  meta: {
    appId: parsed.data.META_APP_ID,
    appSecret: parsed.data.META_APP_SECRET,
    verifyToken: parsed.data.META_VERIFY_TOKEN,
    longLivedToken: parsed.data.META_LONG_LIVED_TOKEN,
    pageId: parsed.data.META_PAGE_ID,
    instagramUserId: parsed.data.IG_USER_ID,
  },
  urls: {
    webhookPublicUrl: parsed.data.WEBHOOK_PUBLIC_URL,
    backend: parsed.data.BACKEND_URL.replace(/\/$/, ''),
  },
  schedule: {
    timezone: parsed.data.TIMEZONE,
    openingHour: parsed.data.OPENING_HOUR,
    closingHour: parsed.data.CLOSING_HOUR,
    slotMinutes: parsed.data.SLOT_MINUTES,
    closedDays,
  },
  server: {
    port: parsed.data.PORT,
    env: parsed.data.NODE_ENV,
  },
  services: {
    refreshIntervalMs: parsed.data.SERVICE_REFRESH_INTERVAL_MINUTES * 60 * 1000,
  },
} as const;
