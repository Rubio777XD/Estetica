import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@estetica.mx';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? 'changeme123';
const SERVICE_NAME = process.env.SMOKE_SERVICE_NAME ?? 'Smoke Test Service';

const cookieJar = new Map<string, string>();

const getCookieHeader = () =>
  Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

const storeCookies = (response: Response) => {
  const headers = response.headers as unknown as { getSetCookie?: () => string[] };
  const setCookieValues = headers.getSetCookie?.() ?? [];
  const fallback = response.headers.get('set-cookie');
  if (fallback) {
    setCookieValues.push(fallback);
  }

  for (const rawCookie of setCookieValues) {
    if (!rawCookie) continue;
    const [pair] = rawCookie.split(';');
    const [name, value] = pair.split('=');
    if (!name) continue;
    if (value === undefined || value.length === 0) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
};

type RequestOptions = (RequestInit & { json?: unknown; expectJson?: boolean }) | undefined;

type RequestResult<T> = {
  status: number;
  ok: boolean;
  data: T | null;
  text?: string;
  headers: Headers;
};

const request = async <T = any>(path: string, options?: RequestOptions): Promise<RequestResult<T>> => {
  const { json, expectJson = true, ...init } = options ?? {};
  const headers = new Headers(init.headers ?? {});
  let body = init.body;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  if (cookieJar.size > 0) {
    headers.set('Cookie', getCookieHeader());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, body });
  storeCookies(response);

  if (expectJson) {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Respuesta no JSON (${contentType}) en ${path}`);
    }
    const data = (await response.json()) as T;
    return { status: response.status, ok: response.ok, data, headers: response.headers };
  }

  const text = await response.text();
  return { status: response.status, ok: response.ok, data: null, text, headers: response.headers };
};

type StepResult = {
  name: string;
  success: boolean;
  message?: string;
};

const results: StepResult[] = [];

const step = async (name: string, action: () => Promise<void>) => {
  try {
    await action();
    results.push({ name, success: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, success: false, message });
    console.error(`✗ ${name} -> ${message}`);
    throw error;
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  let failure = false;
  let createdServiceId: string | null = null;
  let serviceId: string | null = null;
  let bookingId: string | null = null;
  let bookingStartISO: string | null = null;
  let commissionRowBookingId: string | null = null;

  try {
    await step('Login administrador', async () => {
      const response = await request<{ success: boolean; data: { token: string } }>('/api/login', {
        method: 'POST',
        json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      if (!response.ok || !response.data?.success) {
        throw new Error('Inicio de sesión falló');
      }
    });

    await step('Obtener o crear servicio de prueba', async () => {
      const list = await request<any>('/api/services');
      if (!list.ok || !list.data) {
        throw new Error('No se pudieron leer los servicios');
      }
      const payload: any = list.data;
      const services: any[] = Array.isArray(payload.services)
        ? payload.services
        : Array.isArray(payload.data?.services)
        ? payload.data.services
        : [];
      const existing = services.find((service: any) => service.name === SERVICE_NAME);
      if (existing) {
        serviceId = existing.id;
        return;
      }

      const created = await request<any>('/api/services', {
        method: 'POST',
        json: {
          name: SERVICE_NAME,
          price: 500,
          duration: 60,
          description: 'Servicio generado por smoke test',
        },
      });
      if (!created.ok || !created.data) {
        throw new Error('No se pudo crear el servicio de prueba');
      }
      const createdPayload: any = created.data;
      const createdService = createdPayload.service ?? createdPayload.data?.service;
      if (!createdService) {
        throw new Error('Respuesta de creación de servicio incompleta');
      }
      serviceId = createdService.id;
      createdServiceId = serviceId;
    });

    await step('Crear cita de smoke test', async () => {
      if (!serviceId) {
        throw new Error('Servicio no disponible');
      }
      const start = new Date(Date.now() + 30 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const bookingResponse = await request<any>('/api/bookings', {
        method: 'POST',
        json: {
          clientName: 'Cliente Smoke',
          serviceId,
          startTime: start.toISOString(),
          notes: 'Generado automáticamente',
        },
      });
      if (!bookingResponse.ok || !bookingResponse.data) {
        throw new Error('No se pudo crear la cita');
      }
      const bookingPayload: any = bookingResponse.data;
      const createdBooking = bookingPayload.booking ?? bookingPayload.data?.booking;
      if (!createdBooking) {
        throw new Error('Respuesta de creación de cita incompleta');
      }
      bookingId = createdBooking.id;
      bookingStartISO = createdBooking.startTime ?? start.toISOString();

      const unassigned = await request<any>('/api/bookings/unassigned');
      if (!unassigned.ok || !unassigned.data) {
        throw new Error('No se pudo obtener el listado de pendientes');
      }
      const unassignedPayload: any = unassigned.data;
      const pending: any[] = Array.isArray(unassignedPayload.bookings)
        ? unassignedPayload.bookings
        : Array.isArray(unassignedPayload.data?.bookings)
        ? unassignedPayload.data.bookings
        : [];
      const exists = pending.some((booking: any) => booking.id === bookingId);
      if (!exists) {
        throw new Error('La cita no apareció en pendientes');
      }
    });

    await step('Asignar cita mediante invitación', async () => {
      if (!bookingId) {
        throw new Error('Cita no disponible');
      }
      const assignmentResponse = await request<any>('/api/assignments', {
        method: 'POST',
        json: {
          bookingId,
          email: 'colaboradora.smoke@example.com',
        },
      });
      if (!assignmentResponse.ok || !assignmentResponse.data) {
        throw new Error('No se pudo crear la invitación');
      }
      const assignmentPayload: any = assignmentResponse.data;
      const assignment = assignmentPayload.assignment ?? assignmentPayload.data?.assignment;
      if (!assignment) {
        throw new Error('Respuesta de invitación incompleta');
      }

      const record = await prisma.assignment.findUnique({ where: { id: assignment.id } });
      if (!record?.token) {
        throw new Error('No se pudo obtener el token de invitación');
      }

      const acceptResponse = await fetch(`${API_BASE_URL}/api/assignments/accept?token=${encodeURIComponent(record.token)}`);
      if (!acceptResponse.ok) {
        throw new Error(`No se pudo aceptar la invitación (status ${acceptResponse.status})`);
      }

      // Espera breve para que se refleje la asignación
      await delay(250);

      const upcoming = await request<any>('/api/bookings/upcoming');
      if (!upcoming.ok || !upcoming.data) {
        throw new Error('No se pudo obtener citas próximas');
      }
      const upcomingPayload: any = upcoming.data;
      const upcomingBookings: any[] = Array.isArray(upcomingPayload.bookings)
        ? upcomingPayload.bookings
        : Array.isArray(upcomingPayload.data?.bookings)
        ? upcomingPayload.data.bookings
        : [];
      const found = upcomingBookings.find((booking: any) => booking.id === bookingId);
      if (!found) {
        throw new Error('La cita asignada no aparece en próximas');
      }
    });

    await step('Editar precio de la cita', async () => {
      if (!bookingId) {
        throw new Error('Cita no disponible');
      }
      const response = await request<any>(`/api/bookings/${bookingId}/price`, {
        method: 'PATCH',
        json: { amount: 300 },
      });
      if (!response.ok || !response.data?.success) {
        throw new Error('No se pudo actualizar el precio');
      }
    });

    await step('Completar cita con pago y comisión', async () => {
      if (!bookingId) {
        throw new Error('Cita no disponible');
      }
      const response = await request<any>(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        json: {
          amount: 300,
          method: 'cash',
          commissionPercentage: 50,
        },
      });
      if (!response.ok || !response.data) {
        throw new Error('No se pudo completar la cita');
      }
      const completePayload: any = response.data;
      const commission = completePayload.commission ?? completePayload.data?.commission;
      const payment = completePayload.payment ?? completePayload.data?.payment;
      const booking = completePayload.booking ?? completePayload.data?.booking;
      if (!commission || !payment || !booking) {
        throw new Error('Respuesta incompleta al completar la cita');
      }
      if (Math.abs(commission.amount - 150) > 0.01) {
        throw new Error('Monto de comisión inesperado');
      }
      commissionRowBookingId = booking.id;
    });

    await step('Validar reporte de comisiones', async () => {
      if (!bookingStartISO || !commissionRowBookingId) {
        throw new Error('No hay información de la cita completada');
      }
      const dateOnly = bookingStartISO.slice(0, 10);
      const response = await request<any>(`/api/commissions?from=${dateOnly}&to=${dateOnly}`);
      if (!response.ok || !response.data) {
        throw new Error('No se pudo obtener el reporte de comisiones');
      }
      const reportPayload: any = response.data;
      const rows: any[] = Array.isArray(reportPayload.rows)
        ? reportPayload.rows
        : Array.isArray(reportPayload.data?.rows)
        ? reportPayload.data.rows
        : [];
      const row = rows.find((item: any) => item.bookingId === commissionRowBookingId);
      if (!row) {
        throw new Error('La comisión no apareció en el rango consultado');
      }
      if (Math.abs(row.amount - 300) > 0.01 || Math.abs(row.commissionAmount - 150) > 0.01) {
        throw new Error('Los montos del reporte no coinciden');
      }

      const csv = await request(`/api/commissions/export?from=${dateOnly}&to=${dateOnly}`, { expectJson: false });
      const content = csv.text ?? '';
      const lines = content.trim().split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error('CSV sin datos');
      }
    });
  } catch (error) {
    failure = true;
  } finally {
    try {
      if (bookingId) {
        await request(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      }
    } catch (cleanupError) {
      console.warn('No se pudo limpiar la cita de smoke test:', cleanupError);
    }

    try {
      if (createdServiceId) {
        await request(`/api/services/${createdServiceId}`, { method: 'DELETE' });
      }
    } catch (cleanupError) {
      console.warn('No se pudo limpiar el servicio de smoke test:', cleanupError);
    }

    try {
      await request('/api/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    await prisma.$disconnect();

    console.log('\nResumen smoke test:');
    for (const result of results) {
      if (result.success) {
        console.log(`  ✓ ${result.name}`);
      } else {
        console.log(`  ✗ ${result.name}${result.message ? ` -> ${result.message}` : ''}`);
      }
    }

    if (failure) {
      console.error('\nSmoke test: FALLÓ');
      process.exit(1);
    } else {
      console.log('\nSmoke test: OK');
    }
  }
};

main().catch(async (error) => {
  console.error('Error inesperado en smoke test:', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
