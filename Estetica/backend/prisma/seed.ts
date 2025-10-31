import { PrismaClient, Role, BookingStatus, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

async function main() {
  const passwordHash = await bcrypt.hash('changeme123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@estetica.mx' },
    update: { passwordHash, role: Role.ADMIN, name: 'Administrador Demo' },
    create: { email: 'admin@estetica.mx', passwordHash, role: Role.ADMIN, name: 'Administrador Demo' },
  });

  const services = await prisma.$transaction(
    [
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
    ].map((service) =>
      prisma.service.upsert({
        where: { name: service.name },
        update: service,
        create: service,
      })
    )
  );

  await prisma.product.createMany({
    data: [
      { name: 'Removedor de esmalte', price: 45, stock: 3, lowStockThreshold: 5 },
      { name: 'Pads limpiadores', price: 30, stock: 4, lowStockThreshold: 6 },
      { name: 'Pegamento para pestañas', price: 90, stock: 2, lowStockThreshold: 4 },
      { name: 'Crema hidratante manos', price: 55, stock: 12, lowStockThreshold: 5 },
    ],
    skipDuplicates: true,
  });

  const [manicure, pedicure, lifting, extension] = services;

  const now = new Date();
  const today = new Date(now);
  today.setHours(10, 0, 0, 0);

  const bookingSeeds = [
    {
      id: 'booking-scheduled-1',
      clientName: 'María López',
      serviceId: manicure.id,
      startOffsetMinutes: -60,
      status: BookingStatus.scheduled,
      notes: 'Prefiere esmalte rojo',
    },
    {
      id: 'booking-confirmed-1',
      clientName: 'Ana García',
      serviceId: pedicure.id,
      startOffsetMinutes: 180,
      status: BookingStatus.confirmed,
      notes: 'Agregar masaje de pies',
    },
    {
      id: 'booking-done-1',
      clientName: 'Laura Méndez',
      serviceId: lifting.id,
      startOffsetMinutes: -1440,
      status: BookingStatus.done,
      notes: 'Cliente recurrente',
    },
    {
      id: 'booking-canceled-1',
      clientName: 'Sofía Pérez',
      serviceId: manicure.id,
      startOffsetMinutes: -2880,
      status: BookingStatus.canceled,
      notes: 'Canceló por enfermedad',
    },
    {
      id: 'booking-done-2',
      clientName: 'Fernanda Ruiz',
      serviceId: extension.id,
      startOffsetMinutes: -4320,
      status: BookingStatus.done,
      notes: 'Solicitó diseño natural',
    },
    {
      id: 'booking-confirmed-2',
      clientName: 'Claudia Díaz',
      serviceId: lifting.id,
      startOffsetMinutes: 720,
      status: BookingStatus.confirmed,
    },
    {
      id: 'booking-scheduled-2',
      clientName: 'Isabella Cano',
      serviceId: extension.id,
      startOffsetMinutes: 2160,
      status: BookingStatus.scheduled,
    },
  ];

  const bookings = [] as Awaited<ReturnType<typeof prisma.booking.upsert>>[];

  for (const seed of bookingSeeds) {
    const baseStart = addMinutes(today, seed.startOffsetMinutes);
    const service = services.find((s) => s.id === seed.serviceId)!;
    const booking = await prisma.booking.upsert({
      where: { id: seed.id },
      update: {
        clientName: seed.clientName,
        serviceId: seed.serviceId,
        startTime: baseStart,
        endTime: addMinutes(baseStart, service.duration),
        status: seed.status,
        notes: seed.notes,
      },
      create: {
        id: seed.id,
        clientName: seed.clientName,
        serviceId: seed.serviceId,
        startTime: baseStart,
        endTime: addMinutes(baseStart, service.duration),
        status: seed.status,
        notes: seed.notes,
      },
    });
    bookings.push(booking);
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
