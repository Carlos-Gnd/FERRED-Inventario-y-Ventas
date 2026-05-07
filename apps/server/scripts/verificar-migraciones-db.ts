import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type MigrationRow = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

async function main(): Promise<void> {
  const { prisma } = await import('../src/adapters/db/prisma/prisma.client');

  const exists = await prisma.$queryRaw<Array<{ existe: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS existe
  `;

  if (!exists[0]?.existe) {
    console.log(JSON.stringify({
      prismaMigrationsTable: false,
      migrations: [],
    }, null, 2));
    await prisma.$disconnect();
    return;
  }

  const migrations = await prisma.$queryRaw<MigrationRow[]>`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name LIKE '%t16%'
       OR migration_name LIKE '%ecommerce%'
       OR migration_name LIKE '%pedido%'
    ORDER BY finished_at DESC NULLS LAST
  `;

  console.log(JSON.stringify({
    prismaMigrationsTable: true,
    migrations,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
