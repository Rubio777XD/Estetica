import { Prisma, PrismaClient, AppointmentStatus, PaymentMethod, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const toDecimal = (value: string) => new Prisma.Decimal(value);

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@estetica.mx', role: Role.ADMIN, name: 'Super Admin' },
    { email: 'secretaria@estetica.mx', role: Role.SECRETARY, name: 'Secretaria Demo' },
    { email: 'sofia.worker@estetica.mx', role: Role.WORKER, name: 'Sofía Lash Artist' }
  ];

  const userRecords = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { ...user, passwordHash },
        create: { ...user, passwordHash }
      })
    )
  );

  const services = [
    {
      name: 'Extensiones Clásicas',
      basePrice: toDecimal('750.00'),
      durationMin: 120,
      description: 'Aplicación de extensiones pelo a pelo para un look natural.'
    },
    {
      name: 'Volumen Ruso',
      basePrice: toDecimal('950.00'),
      durationMin: 150,
      description: 'Abanicos personalizados para un volumen dramático.'
    },
    {
      name: 'Manicura con Gel',
      basePrice: toDecimal('550.00'),
      durationMin: 90,
      description: 'Manicura completa con esmaltado en gel de larga duración.'
    }
  ];

  const serviceRecords = await Promise.all(
    services.map((service) =>
      prisma.service.upsert({
        where: { name: service.name },
        update: service,
        create: service
      })
    )
  );

  await prisma.product.createMany({
    data: [
      {
        name: 'Adhesivo Premium Black',
        sku: 'GLUE-PR-01',
        stock: 12,
        minStock: 4,
        category: 'Extensiones',
        buyPrice: toDecimal('320.00'),
        sellPrice: toDecimal('520.00'),
        location: 'Estante A1'
      },
      {
        name: 'Pads de Gel Hidratante',
        sku: 'PAD-GEL-02',
        stock: 40,
        minStock: 15,
        category: 'Consumibles',
        buyPrice: toDecimal('80.00'),
        sellPrice: toDecimal('140.00'),
        location: 'Estante B2'
      },
      {
        name: 'Limpiador de Pestañas',
        sku: 'CLEAN-FOAM-01',
        stock: 18,
        minStock: 6,
        category: 'Aftercare',
        buyPrice: toDecimal('210.00'),
        sellPrice: toDecimal('360.00'),
        location: 'Estante C1'
      },
      {
        name: 'Primer de Adhesión',
        sku: 'PRIMER-04',
        stock: 10,
        minStock: 3,
        category: 'Extensiones',
        buyPrice: toDecimal('150.00'),
        sellPrice: toDecimal('260.00'),
        location: 'Estante A2'
      },
      {
        name: 'Microbrushes Desechables',
        sku: 'MBRUSH-25',
        stock: 200,
        minStock: 80,
        category: 'Consumibles',
        buyPrice: toDecimal('60.00'),
        sellPrice: toDecimal('110.00'),
        location: 'Cajón 3'
      },
      {
        name: 'Máscaras Desechables',
        sku: 'MASK-50',
        stock: 120,
        minStock: 40,
        category: 'Seguridad',
        buyPrice: toDecimal('40.00'),
        sellPrice: toDecimal('75.00'),
        location: 'Cajón 1'
      }
    ],
    skipDuplicates: true
  });

  const worker = userRecords.find((user) => user.role === Role.WORKER);
  const classicService = serviceRecords.find((service) => service.name === 'Extensiones Clásicas');
  const volumeService = serviceRecords.find((service) => service.name === 'Volumen Ruso');

  if (!worker || !classicService || !volumeService) {
    throw new Error('Seed prerequisites missing.');
  }

  const today = new Date();
  const baseDate = new Date(today);
  baseDate.setHours(0, 0, 0, 0);
  const inThreeDays = new Date(baseDate);
  inThreeDays.setDate(baseDate.getDate() + 3);
  const nextWeek = new Date(baseDate);
  nextWeek.setDate(baseDate.getDate() + 7);

  await prisma.appointment.upsert({
    where: { id: 'appt-demo-pending' },
    update: {
      clientName: 'María López',
      clientEmail: 'maria@example.com',
      clientPhone: '+52 55 1111 2222',
      scheduledDate: inThreeDays,
      scheduledTime: '11:00',
      status: AppointmentStatus.PENDING,
      serviceId: classicService.id,
      estimatedPrice: toDecimal('750.00')
    },
    create: {
      id: 'appt-demo-pending',
      clientName: 'María López',
      clientEmail: 'maria@example.com',
      clientPhone: '+52 55 1111 2222',
      scheduledDate: inThreeDays,
      scheduledTime: '11:00',
      status: AppointmentStatus.PENDING,
      serviceId: classicService.id,
      estimatedPrice: toDecimal('750.00')
    }
  });

  const confirmed = await prisma.appointment.upsert({
    where: { id: 'appt-demo-confirmed' },
    update: {
      clientName: 'Daniela Pérez',
      clientEmail: 'daniela@example.com',
      clientPhone: '+52 55 2222 3333',
      scheduledDate: nextWeek,
      scheduledTime: '14:30',
      status: AppointmentStatus.CONFIRMED,
      serviceId: volumeService.id,
      estimatedPrice: toDecimal('950.00'),
      assignedWorkerId: worker.id,
      assignedWorkerEmail: worker.email,
      confirmedAt: new Date(),
      assignedAt: today,
      confirmToken: null
    },
    create: {
      id: 'appt-demo-confirmed',
      clientName: 'Daniela Pérez',
      clientEmail: 'daniela@example.com',
      clientPhone: '+52 55 2222 3333',
      scheduledDate: nextWeek,
      scheduledTime: '14:30',
      status: AppointmentStatus.CONFIRMED,
      serviceId: volumeService.id,
      estimatedPrice: toDecimal('950.00'),
      assignedWorkerId: worker.id,
      assignedWorkerEmail: worker.email,
      confirmedAt: new Date(),
      assignedAt: today,
      confirmToken: null
    }
  });

  await prisma.payment.upsert({
    where: { appointmentId: confirmed.id },
    update: {
      amount: toDecimal('1100.00'),
      tip: toDecimal('120.00'),
      method: PaymentMethod.TRANSFER,
      workerCommissionPct: toDecimal('0.4000'),
      workerCommissionAmount: toDecimal('440.00'),
      businessGain: toDecimal('660.00'),
      paidAt: today
    },
    create: {
      id: 'pay-demo-confirmed',
      appointmentId: confirmed.id,
      amount: toDecimal('1100.00'),
      tip: toDecimal('120.00'),
      method: PaymentMethod.TRANSFER,
      workerCommissionPct: toDecimal('0.4000'),
      workerCommissionAmount: toDecimal('440.00'),
      businessGain: toDecimal('660.00'),
      paidAt: today
    }
  });

  const adhesive = await prisma.product.findUnique({ where: { sku: 'GLUE-PR-01' } });
  const pads = await prisma.product.findUnique({ where: { sku: 'PAD-GEL-02' } });

  if (adhesive && pads) {
    await prisma.productUsage.upsert({
      where: { appointmentId_productId: { appointmentId: confirmed.id, productId: adhesive.id } },
      update: { quantity: toDecimal('0.50') },
      create: {
        appointmentId: confirmed.id,
        productId: adhesive.id,
        quantity: toDecimal('0.50')
      }
    });

    await prisma.productUsage.upsert({
      where: { appointmentId_productId: { appointmentId: confirmed.id, productId: pads.id } },
      update: { quantity: toDecimal('1') },
      create: {
        appointmentId: confirmed.id,
        productId: pads.id,
        quantity: toDecimal('1')
      }
    });
  }

  await prisma.userInvite.upsert({
    where: { token: 'invite-secretary-demo' },
    update: {
      email: 'future.secretaria@estetica.mx',
      role: Role.SECRETARY,
      expiresAt: nextWeek,
      invitedById: userRecords[0]?.id
    },
    create: {
      id: 'invite-secretary-demo',
      token: 'invite-secretary-demo',
      email: 'future.secretaria@estetica.mx',
      role: Role.SECRETARY,
      expiresAt: nextWeek,
      invitedById: userRecords[0]?.id
    }
  });
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
