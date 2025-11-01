import { PrismaClient } from '@prisma/client';
import process from 'node:process';

import { applySeed, dryRunSeed } from '../prisma/seed';

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');

const prisma = new PrismaClient();

async function executeDryRun() {
  await dryRunSeed(prisma);
  console.log('✅ Seed dry-run completado. La transacción fue revertida correctamente.');
}

async function executeApply() {
  const result = await applySeed(prisma);
  console.log(`✅ Seed aplicado correctamente (${result.adminEmail}).`);
}

async function main() {
  try {
    if (shouldApply) {
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
