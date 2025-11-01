import { Prisma, PrismaClient, Role, BookingStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

type SeedClient = PrismaClient | Prisma.TransactionClient;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

export async function runSeed(prisma: SeedClient) {
  const passwordHash = await bcrypt.hash('changeme123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@estetica.mx' },
    update: { passwordHash, role: Role.ADMIN, name: 'Administrador Demo' },
    create: { email: 'admin@estetica.mx', passwordHash, role: Role.ADMIN, name: 'Administrador Demo' },
  });

  const serviceSeeds = [
    {
      name: 'Manicure express',
      price: 250,
      duration: 45,
      description: 'Limpieza profunda, limado de precisión y esmaltado de larga duración con acabado brillante.',
      imageUrl:
        'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1080',
      highlights: ['Limpieza profunda', 'Cutícula cuidada', 'Acabado en gel'],
    },
    {
      name: 'Pedicure spa',
      price: 420,
      duration: 60,
      description: 'Experiencia sensorial con exfoliación, hidratación intensa y masaje relajante.',
      imageUrl:
        'https://images.unsplash.com/photo-1600334129128-685c5582fd35?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1080',
      highlights: ['Baño herbal', 'Exfoliación mineral', 'Masaje relajante'],
    },
    {
      name: 'Lash lifting',
      price: 380,
      duration: 50,
      description: 'Realza la curvatura natural de tus pestañas con productos veganos y nutritivos.',
      imageUrl:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1080',
      highlights: ['Fórmula vegana', 'Efecto hasta 6 semanas', 'Incluye tintado'],
    },
    {
      name: 'Extensión clásica',
      price: 680,
      duration: 120,
      description: 'Aplicación pelo a pelo con fibras premium y diseño personalizado para tu mirada.',
      imageUrl:
        'https://images.unsplash.com/photo-1519411540020-496406190771?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1080',
      highlights: ['Fibras hipoalergénicas', 'Mapeo personalizado', 'Incluye kit de cuidado'],
    },
    {
      name: 'Diseño en gel',
      price: 320,
      duration: 75,
      description: 'Manicure artística con gel de alta resistencia y paleta de tendencias de temporada.',
      imageUrl:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1080',
      highlights: ['Alta definición', 'Pigmentos premium', 'Sellado ultrabrillante'],
    },
  ];

  const services: Array<{ id: string; duration: number; name: string }> = [];

  for (const seed of serviceSeeds) {
    const service = await prisma.service.upsert({
      where: { name: seed.name },
      update: seed,
      create: seed,
    });
    services.push({ id: service.id, duration: service.duration, name: service.name });
  }

  await prisma.product.createMany({
    data: [
      { name: 'Removedor de esmalte', price: 45, stock: 3, lowStockThreshold: 5 },
      { name: 'Pads limpiadores', price: 30, stock: 4, lowStockThreshold: 6 },
      { name: 'Pegamento para pestañas', price: 90, stock: 2, lowStockThreshold: 4 },
      { name: 'Crema hidratante manos', price: 55, stock: 12, lowStockThreshold: 5 },
    ],
    skipDuplicates: true,
  });

  const now = new Date();
  const today = new Date(now);
  today.setHours(10, 0, 0, 0);

  const bookingSeeds = [
    {
      id: 'booking-scheduled-1',
      clientName: 'María López',
      clientEmail: 'maria.lopez@example.com',
      serviceKey: 'Manicure express',
      startOffsetMinutes: -60,
      status: BookingStatus.scheduled,
      notes: 'Prefiere esmalte rojo',
      invitedEmails: ['turnos@estetica.mx', 'soporte@estetica.mx'],
    },
    {
      id: 'booking-confirmed-1',
      clientName: 'Ana García',
      clientEmail: 'ana.garcia@example.com',
      serviceKey: 'Pedicure spa',
      startOffsetMinutes: 180,
      status: BookingStatus.confirmed,
      notes: 'Agregar masaje de pies',
      invitedEmails: ['pedicure.team@estetica.mx'],
      confirmedEmail: 'ana.garcia@example.com',
    },
    {
      id: 'booking-done-1',
      clientName: 'Laura Méndez',
      clientEmail: 'laura.mendez@example.com',
      serviceKey: 'Lash lifting',
      startOffsetMinutes: -1440,
      status: BookingStatus.done,
      notes: 'Cliente recurrente',
      invitedEmails: ['lashes@estetica.mx'],
      confirmedEmail: 'laura.mendez@example.com',
      assignedEmail: 'daniela@estetica.mx',
      assignedAtOffsetMinutes: -720,
      performedByName: 'Daniela Stylist',
      completedBy: 'daniela@estetica.mx',
    },
    {
      id: 'booking-canceled-1',
      clientName: 'Sofía Pérez',
      clientEmail: 'sofia.perez@example.com',
      serviceKey: 'Manicure express',
      startOffsetMinutes: -2880,
      status: BookingStatus.canceled,
      notes: 'Canceló por enfermedad',
      invitedEmails: ['manicure.team@estetica.mx'],
    },
    {
      id: 'booking-done-2',
      clientName: 'Fernanda Ruiz',
      clientEmail: 'fernanda.ruiz@example.com',
      serviceKey: 'Extensión clásica',
      startOffsetMinutes: -4320,
      status: BookingStatus.done,
      notes: 'Solicitó diseño natural',
      invitedEmails: ['extension@estetica.mx', 'staff@estetica.mx'],
      confirmedEmail: 'fernanda.ruiz@example.com',
      assignedEmail: 'alejandra@estetica.mx',
      assignedAtOffsetMinutes: -1440,
      performedByName: 'Alejandra Rivera',
      completedBy: 'alejandra@estetica.mx',
      amountOverride: 710,
    },
    {
      id: 'booking-confirmed-2',
      clientName: 'Claudia Díaz',
      clientEmail: 'claudia.diaz@example.com',
      serviceKey: 'Lash lifting',
      startOffsetMinutes: 720,
      status: BookingStatus.confirmed,
      invitedEmails: ['coordinacion@estetica.mx'],
      confirmedEmail: 'claudia.diaz@example.com',
      amountOverride: 360,
    },
    {
      id: 'booking-scheduled-2',
      clientName: 'Isabella Cano',
      clientEmail: 'isabella.cano@example.com',
      serviceKey: 'Extensión clásica',
      startOffsetMinutes: 2160,
      status: BookingStatus.scheduled,
      invitedEmails: [],
    },
  ];

  const bookings: Array<{ id: string; status: BookingStatus }> = [];

  for (const seed of bookingSeeds) {
    const service = services.find((item) => item.name === seed.serviceKey);
    if (!service) {
      throw new Error(`Servicio ${seed.serviceKey} no encontrado durante el seed`);
    }

    const baseStart = addMinutes(today, seed.startOffsetMinutes);
    const assignedAt =
      typeof seed.assignedAtOffsetMinutes === 'number'
        ? addMinutes(baseStart, seed.assignedAtOffsetMinutes)
        : undefined;

    const bookingData = {
      clientName: seed.clientName,
      clientEmail: seed.clientEmail ?? null,
      serviceId: service.id,
      startTime: baseStart,
      endTime: addMinutes(baseStart, service.duration),
      status: seed.status,
      notes: seed.notes,
      invitedEmails: seed.invitedEmails ?? [],
      confirmedEmail: seed.confirmedEmail ?? null,
      assignedEmail: seed.assignedEmail ?? null,
      assignedAt: assignedAt ?? null,
      performedByName: seed.performedByName ?? null,
      completedBy: seed.completedBy ?? null,
      amountOverride: seed.amountOverride ?? null,
    };

    const booking = await prisma.booking.upsert({
      where: { id: seed.id },
      update: bookingData,
      create: {
        id: seed.id,
        ...bookingData,
      },
    });

    bookings.push({ id: booking.id, status: booking.status });
  }

  const doneBookings = bookings.filter((booking) => booking.status === BookingStatus.done);

  if (doneBookings.length >= 2) {
    await prisma.payment.upsert({
      where: { id: 'payment-1' },
      update: {
        bookingId: doneBookings[0]!.id,
        amount: 420,
        method: PaymentMethod.transfer,
      },
      create: {
        id: 'payment-1',
        bookingId: doneBookings[0]!.id,
        amount: 420,
        method: PaymentMethod.transfer,
      },
    });

    await prisma.payment.upsert({
      where: { id: 'payment-2' },
      update: {
        bookingId: doneBookings[1]!.id,
        amount: 680,
        method: PaymentMethod.cash,
      },
      create: {
        id: 'payment-2',
        bookingId: doneBookings[1]!.id,
        amount: 680,
        method: PaymentMethod.cash,
      },
    });
  }

  console.info('Seed completed with user:', admin.email);

  return { adminEmail: admin.email };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    await runSeed(prisma);
  } catch (error) {
    console.error('Seed failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
}
