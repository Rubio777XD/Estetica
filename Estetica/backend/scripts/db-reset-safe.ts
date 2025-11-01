import { spawn } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { applySeed, dryRunSeed } from '../prisma/seed';

const args = new Set(process.argv.slice(2));
const allowRemote = args.has('--allow-remote') || process.env.ALLOW_REMOTE_DB_RESET === '1';
const skipSeed = args.has('--skip-seed');

const prismaCli = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function assertDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está definido. Configura el entorno antes de ejecutar db:reset-safe.');
  }

  const parsedUrl = new URL(databaseUrl);
  const host = parsedUrl.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal');

  if (!isLocal && !allowRemote) {
    throw new Error(
      `La base de datos apunta a ${host}, que parece remota. Añade --allow-remote explícitamente o ALLOW_REMOTE_DB_RESET=1 si deseas forzar el reset.`
    );
  }

  return databaseUrl;
}

async function runPrismaReset(databaseUrl: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      prismaCli,
      ['prisma', 'migrate', 'reset', '--force', '--skip-seed'],
      {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
        shell: process.platform === 'win32',
      }
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`prisma migrate reset terminó con código ${code}`));
      }
    });

    child.on('error', (error) => reject(error));
  });
}

async function reseedDatabase() {
  if (skipSeed) {
    console.warn('⚠️ Seed omitido por bandera --skip-seed. La base quedó vacía.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await dryRunSeed(prisma);
    console.info('✅ Seed dry-run verificado tras el reset.');
    const result = await applySeed(prisma);
    console.info(`✅ Seed aplicado correctamente después del reset (${result.adminEmail}).`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    const databaseUrl = assertDatabaseUrl();
    await runPrismaReset(databaseUrl);
    await reseedDatabase();
    console.info('Reset seguro completado.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error durante db:reset-safe: ${message}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('❌ Error inesperado en db:reset-safe:', error);
  process.exit(1);
});
