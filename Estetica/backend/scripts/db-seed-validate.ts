import { Prisma, PrismaClient } from '@prisma/client';
import process from 'node:process';

import { runSeed } from '../prisma/seed';

const args = new Set(process.argv.slice(2));
const applySeed = args.has('--apply');

const prisma = new PrismaClient();

const ROLLBACK_SENTINEL = new Error('ROLLBACK_REQUESTED');
ROLLBACK_SENTINEL.name = 'ROLLBACK_REQUESTED';

async function executeDryRun() {
  try {
    await prisma.$transaction(async (tx) => {
      await runSeed(tx as Prisma.TransactionClient);
      throw ROLLBACK_SENTINEL;
    });
    console.error('La transacción de validación del seed se comprometió inesperadamente.');
    process.exitCode = 1;
  } catch (error) {
    if (error instanceof Error && error.name === ROLLBACK_SENTINEL.name) {
      console.log('✅ Seed dry-run completado. La transacción fue revertida correctamente.');
    } else {
      throw error;
    }
  }
}

async function executeApply() {
  await runSeed(prisma);
  console.log('✅ Seed aplicado correctamente.');
}

async function main() {
  try {
    if (applySeed) {
      await executeApply();
    } else {
      await executeDryRun();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error durante la validación del seed: ${message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Error inesperado en la validación del seed:', error);
  prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
