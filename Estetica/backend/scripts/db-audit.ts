import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Check = {
  name: string;
  run: () => Promise<void>;
};

const checks: Check[] = [];

const addCheck = (name: string, run: () => Promise<void>) => {
  checks.push({ name, run });
};

const requiredTables = ['Service', 'Booking', 'Payment', 'Commission', 'Assignment', 'User'] as const;

addCheck('Tablas esenciales presentes', async () => {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${Prisma.join(requiredTables)})
  `;

  const found = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !found.has(table));
  if (missing.length > 0) {
    throw new Error(`Faltan tablas: ${missing.join(', ')}`);
  }
});

addCheck('Service.description es nullable', async () => {
  const rows = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Service'
      AND column_name = 'description'
  `;

  if (!rows.length) {
    throw new Error('Columna no encontrada');
  }
  if (rows[0]?.is_nullable !== 'YES') {
    throw new Error('La columna description debe permitir NULL');
  }
});

addCheck('Booking.amountOverride es nullable', async () => {
  const rows = await prisma.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Booking'
      AND column_name = 'amountOverride'
  `;

  if (!rows.length) {
    throw new Error('Columna no encontrada');
  }
  if (rows[0]?.is_nullable !== 'YES') {
    throw new Error('La columna amountOverride debe permitir NULL');
  }
});

addCheck('User.role tiene default', async () => {
  const rows = await prisma.$queryRaw<Array<{ column_default: string | null }>>`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'role'
  `;

  const defaultValue = rows[0]?.column_default;
  if (!defaultValue) {
    throw new Error('User.role no tiene valor por defecto');
  }
  if (!/ADMIN|EMPLOYEE/.test(defaultValue)) {
    throw new Error(`Default inesperado para role: ${defaultValue}`);
  }
});

const tablesWithCreatedAt = ['User', 'Service', 'Booking', 'Payment', 'Commission', 'Assignment'] as const;

addCheck('createdAt con default now()', async () => {
  const rows = await prisma.$queryRaw<Array<{ table_name: string; column_default: string | null }>>`
    SELECT table_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'createdAt'
      AND table_name IN (${Prisma.join(tablesWithCreatedAt)})
  `;

  const defaults = new Map(rows.map((row) => [row.table_name, row.column_default]));
  const missingTables = tablesWithCreatedAt.filter((table) => !defaults.has(table));
  if (missingTables.length > 0) {
    throw new Error(`Falta createdAt en: ${missingTables.join(', ')}`);
  }

  const invalid = tablesWithCreatedAt.filter((table) => {
    const defaultValue = defaults.get(table);
    return !defaultValue || !/now\(\)|CURRENT_TIMESTAMP/i.test(defaultValue);
  });

  if (invalid.length > 0) {
    throw new Error(`createdAt sin default now(): ${invalid.join(', ')}`);
  }
});

const indexExpectations: Array<{ table: string; column: string }> = [
  { table: 'Assignment', column: '"bookingId"' },
  { table: 'Assignment', column: '"status"' },
  { table: 'Assignment', column: '"expiresAt"' },
  { table: 'Booking', column: '"assignedEmail"' },
  { table: 'Commission', column: '"bookingId"' },
  { table: 'Commission', column: '"assigneeEmail"' },
];

addCheck('Índices obligatorios presentes', async () => {
  const rows = await prisma.$queryRaw<Array<{ tablename: string; indexdef: string }>>`
    SELECT tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (${Prisma.join(indexExpectations.map((item) => item.table))})
  `;

  const grouped = rows.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.tablename] = acc[row.tablename] ?? [];
    acc[row.tablename]!.push(row.indexdef);
    return acc;
  }, {});

  const missing: string[] = [];

  for (const { table, column } of indexExpectations) {
    const defs = grouped[table] ?? [];
    const found = defs.some((def) => def.includes(column));
    if (!found) {
      missing.push(`${table}.${column.replace(/"/g, '')}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Índices faltantes: ${missing.join(', ')}`);
  }
});

const cascadeExpectations: Array<{ table: string; column: string; target: string }> = [
  { table: 'Payment', column: 'bookingId', target: 'Booking' },
  { table: 'Commission', column: 'bookingId', target: 'Booking' },
];

addCheck('FKs con ON DELETE CASCADE', async () => {
  const rows = await prisma.$queryRaw<
    Array<{ table_name: string; column_name: string; foreign_table_name: string; delete_rule: string }>
  >`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN (${Prisma.join(cascadeExpectations.map((item) => item.table))})
  `;

  const matches = cascadeExpectations.map((expectation) => {
    return rows.find(
      (row) =>
        row.table_name === expectation.table &&
        row.column_name === expectation.column &&
        row.foreign_table_name === expectation.target &&
        row.delete_rule === 'CASCADE'
    );
  });

  if (matches.some((match) => !match)) {
    const missing = cascadeExpectations
      .filter((_, index) => !matches[index])
      .map((item) => `${item.table}.${item.column} -> ${item.target}`);
    throw new Error(`Faltan cascadas: ${missing.join(', ')}`);
  }
});

addCheck('Cascada efectiva Payment/Commission al borrar Booking', async () => {
  const serviceName = `Audit Service ${Date.now()}`;
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const service = await prisma.service.create({
    data: {
      name: serviceName,
      price: 123,
      duration: 30,
    },
  });

  try {
    const booking = await prisma.booking.create({
      data: {
        clientName: 'Audit Client',
        serviceId: service.id,
        startTime: start,
        endTime: end,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 123,
        method: 'cash',
      },
    });

    const commission = await prisma.commission.create({
      data: {
        bookingId: booking.id,
        percentage: 10,
        amount: 12.3,
      },
    });

    await prisma.booking.delete({ where: { id: booking.id } });

    const paymentExists = await prisma.payment.findUnique({ where: { id: payment.id } });
    const commissionExists = await prisma.commission.findUnique({ where: { id: commission.id } });

    if (paymentExists || commissionExists) {
      throw new Error('Los registros asociados no fueron eliminados en cascada');
    }
  } finally {
    await prisma.service.delete({ where: { id: service.id } }).catch(() => undefined);
  }
});

const run = async () => {
  let hasFailures = false;

  for (const check of checks) {
    try {
      await check.run();
      console.log(`✓ ${check.name}`);
    } catch (error) {
      hasFailures = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${check.name} -> ${message}`);
    }
  }

  await prisma.$disconnect();

  if (hasFailures) {
    console.error('Auditoría de base de datos: FALLÓ');
    process.exit(1);
  } else {
    console.log('Auditoría de base de datos: OK');
  }
};

run().catch((error) => {
  console.error('Error inesperado en auditoría:', error);
  prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
