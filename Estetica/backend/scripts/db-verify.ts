import { spawn } from 'node:child_process';
import { promises as fsPromises, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';

import {
  AssignmentStatus,
  BookingStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const args = new Set(process.argv.slice(2));
const runDeep = args.has('--deep');
const skipShadow = args.has('--skip-shadow');

if (!skipShadow && process.env.PRISMA_MIGRATION_SKIP_SHADOW_DATABASE === '1') {
  console.error('❌ Detectado PRISMA_MIGRATION_SKIP_SHADOW_DATABASE=1. Usa --skip-shadow explícitamente si deseas omitir el shadow DB.');
  process.exit(1);
}

const projectRoot = resolve(__dirname, '..');
const prisma = new PrismaClient();

const checks: Array<{ name: string; run: () => Promise<void> }> = [];

const commandEnv = { ...process.env } as NodeJS.ProcessEnv;
if (skipShadow) {
  commandEnv.PRISMA_MIGRATION_SKIP_SHADOW_DATABASE = '1';
} else {
  delete commandEnv.PRISMA_MIGRATION_SKIP_SHADOW_DATABASE;
}

const prismaCli = process.platform === 'win32' ? 'npx.cmd' : 'npx';

async function runCommand(command: string, commandArgs: string[], options: { cwd?: string; hint?: string } = {}) {
  const { cwd = projectRoot, hint } = options;

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: commandEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        const baseError = new Error(`${command} ${commandArgs.join(' ')} terminó con código ${code}`);
        if (hint) {
          (baseError as Error & { hint?: string }).hint = hint;
        }
        rejectPromise(baseError);
      }
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });
  });
}

function formatError(error: unknown): string {
  if (error && typeof error === 'object' && 'hint' in error && typeof (error as any).hint === 'string') {
    return `${(error as Error).message}\n${(error as any).hint}`;
  }

  return error instanceof Error ? error.message : String(error);
}

async function getMigrationDirectories(): Promise<string[]> {
  const migrationsRoot = join(projectRoot, 'prisma', 'migrations');
  try {
    const entries = await fsPromises.readdir(migrationsRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    throw new Error(`No se pudo leer el directorio de migraciones: ${formatError(error)}`);
  }
}

async function analyzeMigrations() {
  const migrationsRoot = join(projectRoot, 'prisma', 'migrations');
  const directories = await getMigrationDirectories();
  const seenEnums = new Set<string>();
  const seenTables = new Set<string>();

  const bomFiles: string[] = [];
  const duplicateEnums: Array<{ type: string; file: string }> = [];
  const duplicateTables: Array<{ table: string; file: string }> = [];
  const unsafeRoleMigrations: string[] = [];

  for (const dir of directories) {
    const migrationFile = join(migrationsRoot, dir, 'migration.sql');
    let buffer: Buffer;
    try {
      buffer = readFileSync(migrationFile);
    } catch (error) {
      throw new Error(`No se pudo leer ${relative(projectRoot, migrationFile)}: ${formatError(error)}`);
    }

    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      bomFiles.push(relative(projectRoot, migrationFile));
    }

    const content = buffer.toString('utf8');
    const relativePath = relative(projectRoot, migrationFile);

    const enumMatches = content.matchAll(/CREATE\s+TYPE\s+"?([A-Za-z0-9_]+)"?\s+AS\s+ENUM/gi);
    for (const match of enumMatches) {
      const enumName = match[1];
      if (seenEnums.has(enumName)) {
        duplicateEnums.push({ type: enumName, file: relativePath });
      } else {
        seenEnums.add(enumName);
      }
    }

    const tableMatches = content.matchAll(/CREATE\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi);
    for (const match of tableMatches) {
      const tableName = match[1];
      if (seenTables.has(tableName)) {
        duplicateTables.push({ table: tableName, file: relativePath });
      } else {
        seenTables.add(tableName);
      }
    }

    const setDefaultMatch = content.match(/ALTER\s+TABLE\s+"User"\s+ALTER\s+COLUMN\s+"role"\s+SET\s+DEFAULT/gi);
    if (setDefaultMatch) {
      const dropDefaultRegex = /ALTER\s+TABLE\s+"User"\s+ALTER\s+COLUMN\s+"role"\s+DROP\s+DEFAULT/gi;
      const dropMatches = [...content.matchAll(dropDefaultRegex)];
      const setMatches = [...content.matchAll(/ALTER\s+TABLE\s+"User"\s+ALTER\s+COLUMN\s+"role"\s+SET\s+DEFAULT/gi)];

      const hasUnsafeSet = setMatches.some((setMatch) => {
        const setIndex = setMatch.index ?? -1;
        if (setIndex === -1) {
          return false;
        }
        const hasPreviousDrop = dropMatches.some((dropMatch) => {
          const dropIndex = dropMatch.index ?? -1;
          return dropIndex !== -1 && dropIndex < setIndex;
        });
        return !hasPreviousDrop;
      });

      if (hasUnsafeSet && /"Role"/i.test(content)) {
        unsafeRoleMigrations.push(relativePath);
      }
    }
  }

  return { bomFiles, duplicateEnums, duplicateTables, unsafeRoleMigrations };
}

async function ensureNoNewMigrationsDuringDev(commandArgs: string[]) {
  const migrationsRoot = join(projectRoot, 'prisma', 'migrations');
  const before = new Set(await getMigrationDirectories());
  try {
    await runCommand(prismaCli, ['prisma', ...commandArgs], {
      hint: skipShadow
        ? undefined
        : 'Revisa el shadow DB. Si falla por falta de permisos, ejecuta nuevamente con --skip-shadow o configura SHADOW_DATABASE_URL.',
    });
  } finally {
    const after = new Set(await getMigrationDirectories());
    const created: string[] = [];
    for (const dir of after) {
      if (!before.has(dir)) {
        created.push(dir);
      }
    }

    if (created.length > 0) {
      for (const dir of created) {
        await fsPromises.rm(join(migrationsRoot, dir), { recursive: true, force: true });
      }
      throw new Error(
        `Prisma generó migraciones durante la verificación (${created.join(', ')}). Genera y commitea la migración con "npx prisma migrate dev --name <cambio>" antes de correr db:verify.`
      );
    }
  }
}

checks.push({
  name: 'prisma validate',
  run: () => runCommand(prismaCli, ['prisma', 'validate']),
});

checks.push({
  name: 'prisma format --check',
  run: () =>
    runCommand(prismaCli, ['prisma', 'format', '--check'], {
      hint: 'Ejecuta "npx prisma format" y commitea los cambios generados.',
    }),
});

checks.push({
  name: 'prisma migrate status',
  run: () =>
    runCommand(prismaCli, ['prisma', 'migrate', 'status'], {
      hint: 'Asegúrate de haber aplicado todas las migraciones con "npx prisma migrate deploy" o "npx prisma migrate dev".',
    }),
});

checks.push({
  name: 'prisma migrate dev (shadow check)',
  run: () =>
    ensureNoNewMigrationsDuringDev(['migrate', 'dev', '--skip-generate', '--skip-seed', '--create-only', '--name', '__db_verify__']),
});

checks.push({
  name: 'Migraciones sin BOM ni duplicados',
  run: async () => {
    const analysis = await analyzeMigrations();
    const messages: string[] = [];

    if (analysis.bomFiles.length > 0) {
      messages.push(`Archivos con BOM: ${analysis.bomFiles.join(', ')}`);
    }

    if (analysis.duplicateEnums.length > 0) {
      const duplicates = analysis.duplicateEnums.map((item) => `${item.type} en ${item.file}`);
      messages.push(
        `Tipos ENUM duplicados detectados: ${duplicates.join(', ')}. Evita recrear enums existentes o usa el patrón Role_new -> rename.`
      );
    }

    if (analysis.duplicateTables.length > 0) {
      const duplicates = analysis.duplicateTables.map((item) => `${item.table} en ${item.file}`);
      messages.push(
        `Tablas recreadas detectadas: ${duplicates.join(', ')}. Elimina baselines redundantes que vuelvan a crear objetos ya existentes.`
      );
    }

    if (analysis.unsafeRoleMigrations.length > 0) {
      messages.push(
        `Se detectó un ALTER ENUM inseguro en: ${analysis.unsafeRoleMigrations.join(
          ', '
        )}. Usa el patrón seguro:\nALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;\nCREATE TYPE "Role_new" ...;\nALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");\nDROP TYPE "Role";\nALTER TYPE "Role_new" RENAME TO "Role";\nALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';`
      );
    }

    if (messages.length > 0) {
      throw new Error(messages.join('\n'));
    }
  },
});

checks.push({
  name: 'Esquema crítico presente',
  run: async () => {
    const requiredTables = [
      'User',
      'Service',
      'Booking',
      'Payment',
      'Commission',
      'Assignment',
      'Product',
    ] as const;

    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${Prisma.join(requiredTables)})
    `;

    const foundTables = new Set(tables.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !foundTables.has(table));
    if (missing.length > 0) {
      throw new Error(`Faltan tablas críticas: ${missing.join(', ')}`);
    }
  },
});

checks.push({
  name: 'Columnas y defaults esenciales',
  run: async () => {
    type ColumnRow = {
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: 'YES' | 'NO';
      column_default: string | null;
    };

    const columnExpectations: Array<{
      table: string;
      column: string;
      dataType?: string | string[];
      udtName?: string | string[];
      nullable?: boolean;
      defaultIncludes?: RegExp;
    }> = [
      { table: 'Booking', column: 'invitedEmails', dataType: 'ARRAY', udtName: '_text', nullable: false, defaultIncludes: /\{\}|ARRAY\[/ },
      { table: 'Booking', column: 'confirmedEmail', dataType: 'text', nullable: true },
      { table: 'Booking', column: 'performedByName', dataType: 'text', nullable: true },
      { table: 'Booking', column: 'completedBy', dataType: 'text', nullable: true },
      { table: 'Booking', column: 'assignedEmail', dataType: 'text', nullable: true },
      { table: 'Booking', column: 'assignedAt', dataType: 'timestamp without time zone', nullable: true },
      { table: 'Booking', column: 'amountOverride', dataType: 'double precision', nullable: true },
      { table: 'Booking', column: 'status', dataType: 'USER-DEFINED', udtName: 'BookingStatus', nullable: false, defaultIncludes: /'scheduled'/i },
      { table: 'User', column: 'role', dataType: 'USER-DEFINED', udtName: 'Role', nullable: false, defaultIncludes: /'EMPLOYEE'/i },
      { table: 'Assignment', column: 'status', dataType: 'USER-DEFINED', udtName: 'AssignmentStatus', nullable: false, defaultIncludes: /'pending'/i },
      { table: 'Assignment', column: 'token', dataType: 'text', nullable: false },
      { table: 'Payment', column: 'bookingId', dataType: 'text', nullable: false },
      { table: 'Commission', column: 'bookingId', dataType: 'text', nullable: false },
    ];

    const tables = Array.from(new Set(columnExpectations.map((item) => item.table)));

    const rows = await prisma.$queryRaw<ColumnRow[]>`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (${Prisma.join(tables)})
    `;

    const byTable = rows.reduce<Record<string, ColumnRow[]>>((acc, row) => {
      acc[row.table_name] = acc[row.table_name] ?? [];
      acc[row.table_name]!.push(row);
      return acc;
    }, {});

    const issues: string[] = [];

    for (const expectation of columnExpectations) {
      const tableRows = byTable[expectation.table] ?? [];
      const row = tableRows.find((item) => item.column_name === expectation.column);
      if (!row) {
        issues.push(`${expectation.table}.${expectation.column} no existe`);
        continue;
      }

      if (expectation.dataType) {
        const expectedTypes = Array.isArray(expectation.dataType) ? expectation.dataType : [expectation.dataType];
        if (!expectedTypes.includes(row.data_type)) {
          issues.push(
            `${expectation.table}.${expectation.column} tiene data_type=${row.data_type}, se esperaba ${expectedTypes.join(' o ')}`
          );
        }
      }

      if (expectation.udtName) {
        const expectedUdts = Array.isArray(expectation.udtName) ? expectation.udtName : [expectation.udtName];
        if (!expectedUdts.includes(row.udt_name)) {
          issues.push(
            `${expectation.table}.${expectation.column} tiene udt=${row.udt_name}, se esperaba ${expectedUdts.join(' o ')}`
          );
        }
      }

      if (typeof expectation.nullable === 'boolean') {
        const expectedNullable = expectation.nullable ? 'YES' : 'NO';
        if (row.is_nullable !== expectedNullable) {
          issues.push(
            `${expectation.table}.${expectation.column} es ${row.is_nullable === 'YES' ? '' : 'no '}nullable, se esperaba ${expectedNullable}`
          );
        }
      }

      if (expectation.defaultIncludes) {
        const defaultValue = row.column_default ?? '';
        if (!expectation.defaultIncludes.test(defaultValue)) {
          issues.push(
            `${expectation.table}.${expectation.column} tiene default inesperado (${defaultValue || 'NULL'}).`
          );
        }
      }
    }

    const createdAtTables = ['User', 'Service', 'Booking', 'Payment', 'Commission', 'Assignment', 'Product'] as const;
    const createdAtRows = await prisma.$queryRaw<ColumnRow[]>`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'createdAt'
        AND table_name IN (${Prisma.join(createdAtTables)})
    `;

    const createdAtMap = new Map(createdAtRows.map((row) => [row.table_name, row.column_default]));

    for (const table of createdAtTables) {
      const defaultValue = createdAtMap.get(table);
      if (!defaultValue || !/now\(\)|CURRENT_TIMESTAMP/i.test(defaultValue)) {
        issues.push(`${table}.createdAt debe tener default now()`);
      }
    }

    if (issues.length > 0) {
      throw new Error(issues.join('\n'));
    }
  },
});

checks.push({
  name: 'Índices críticos presentes',
  run: async () => {
    type IndexRow = { tablename: string; indexdef: string };
    type UniqueRow = { table_name: string; definition: string };

    const indexExpectations: Array<{ table: string; column: string; unique?: boolean }> = [
      { table: 'Assignment', column: '"bookingId"' },
      { table: 'Assignment', column: '"status"' },
      { table: 'Assignment', column: '"expiresAt"' },
      { table: 'Assignment', column: '"token"', unique: true },
      { table: 'Booking', column: '"assignedEmail"' },
      { table: 'Commission', column: '"bookingId"' },
      { table: 'Commission', column: '"assigneeEmail"' },
    ];

    if (runDeep) {
      indexExpectations.push(
        { table: 'Booking', column: '"startTime"' },
        { table: 'Booking', column: '"status"' },
        { table: 'Booking', column: '"serviceId"' },
        { table: 'Service', column: '"name"' },
        { table: 'Product', column: '"name"' },
        { table: 'Product', column: '"stock"' },
        { table: 'Payment', column: '"createdAt"' },
        { table: 'Payment', column: '"method"' }
      );
    }

    const tables = Array.from(new Set(indexExpectations.map((item) => item.table)));

    const indexRows = await prisma.$queryRaw<IndexRow[]>`
      SELECT tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (${Prisma.join(tables)})
    `;

    const byTable = indexRows.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.tablename] = acc[row.tablename] ?? [];
      acc[row.tablename]!.push(row.indexdef);
      return acc;
    }, {});

    const missing: string[] = [];

    for (const expectation of indexExpectations) {
      const defs = byTable[expectation.table] ?? [];
      const hasIndex = defs.some((definition) => definition.includes(expectation.column));
      if (!hasIndex && !expectation.unique) {
        missing.push(`${expectation.table}.${expectation.column.replace(/"/g, '')}`);
      }
    }

    const uniqueTables = Array.from(
      new Set(indexExpectations.filter((item) => item.unique).map((item) => item.table))
    );

    const uniqueRows = await prisma.$queryRaw<UniqueRow[]>`
      SELECT
        c.relname AS table_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = con.connamespace
      WHERE con.contype = 'u'
        AND n.nspname = 'public'
        AND c.relname IN (${Prisma.join(uniqueTables)})
    `;

    for (const expectation of indexExpectations.filter((item) => item.unique)) {
      const definition = uniqueRows.find((row) => row.table_name === expectation.table)?.definition ?? '';
      if (!definition.includes(expectation.column.replace(/"/g, ''))) {
        missing.push(`${expectation.table}.${expectation.column.replace(/"/g, '')} debe ser UNIQUE`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Faltan índices/constraints: ${missing.join(', ')}`);
    }
  },
});

checks.push({
  name: 'FKs con ON DELETE CASCADE',
  run: async () => {
    type FkRow = {
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      delete_rule: string;
    };

    const fkExpectations: Array<{ table: string; column: string; target: string }> = [
      { table: 'Assignment', column: 'bookingId', target: 'Booking' },
      { table: 'Payment', column: 'bookingId', target: 'Booking' },
      { table: 'Commission', column: 'bookingId', target: 'Booking' },
    ];

    const rows = await prisma.$queryRaw<FkRow[]>`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN (${Prisma.join(fkExpectations.map((item) => item.table))})
    `;

    const missing: string[] = [];

    for (const expectation of fkExpectations) {
      const match = rows.find(
        (row) =>
          row.table_name === expectation.table &&
          row.column_name === expectation.column &&
          row.foreign_table_name === expectation.target &&
          row.delete_rule === 'CASCADE'
      );
      if (!match) {
        missing.push(`${expectation.table}.${expectation.column} -> ${expectation.target}`);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Faltan cascadas: ${missing.join(', ')}`);
    }
  },
});

checks.push({
  name: 'Prueba de cascadas y arrays',
  run: async () => {
    const service = await prisma.service.create({
      data: {
        name: `db-verify-service-${Date.now()}`,
        price: 10,
        duration: 30,
      },
    });

    try {
      const booking = await prisma.booking.create({
        data: {
          clientName: 'DB Verify',
          serviceId: service.id,
          startTime: new Date(),
          endTime: new Date(Date.now() + 30 * 60 * 1000),
          status: BookingStatus.scheduled,
          invitedEmails: ['a@x.com', 'b@x.com'],
          assignedEmail: 'tester@example.com',
        },
      });

      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: 99,
          method: PaymentMethod.cash,
        },
      });

      const commission = await prisma.commission.create({
        data: {
          bookingId: booking.id,
          percentage: 10,
          amount: 9.9,
        },
      });

      const assignment = await prisma.assignment.create({
        data: {
          bookingId: booking.id,
          email: 'dummy@estetica.mx',
          status: AssignmentStatus.pending,
          token: `token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const loaded = await prisma.booking.findUnique({ where: { id: booking.id } });
      if (!loaded) {
        throw new Error('No se pudo recargar el booking recién creado.');
      }

      if (!Array.isArray(loaded.invitedEmails) || loaded.invitedEmails.length !== 2) {
        throw new Error('invitedEmails no se comporta como text[].');
      }

      await prisma.booking.delete({ where: { id: booking.id } });

      const paymentExists = await prisma.payment.findUnique({ where: { id: payment.id } });
      const commissionExists = await prisma.commission.findUnique({ where: { id: commission.id } });
      const assignmentExists = await prisma.assignment.findUnique({ where: { id: assignment.id } });

      if (paymentExists || commissionExists || assignmentExists) {
        throw new Error('Las entidades relacionadas no fueron eliminadas en cascada.');
      }
    } finally {
      await prisma.service.delete({ where: { id: service.id } }).catch(() => undefined);
    }
  },
});

async function run() {
  let hasFailures = false;

  for (const check of checks) {
    try {
      await check.run();
      console.log(`✅ ${check.name}`);
    } catch (error) {
      hasFailures = true;
      console.error(`❌ ${check.name}: ${formatError(error)}`);
    }
  }

  await prisma.$disconnect();

  if (hasFailures) {
    console.error('Verificación de base de datos: FALLÓ');
    process.exit(1);
  } else {
    console.log('Verificación de base de datos: OK');
  }
}

run().catch((error) => {
  console.error('❌ Error inesperado en db:verify:', formatError(error));
  prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
