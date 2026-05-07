import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type DbCheck = {
  objeto: string;
  existe: boolean;
};

async function main(): Promise<void> {
  const { prisma } = await import('../src/adapters/db/prisma/prisma.client');

  const checks = await prisma.$queryRaw<DbCheck[]>`
    SELECT 'table:zonas_envio' AS objeto, EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'zonas_envio'
    ) AS existe
    UNION ALL
    SELECT 'table:pedidos_online' AS objeto, EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pedidos_online'
    ) AS existe
    UNION ALL
    SELECT 'table:pedidos_online_detalle' AS objeto, EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pedidos_online_detalle'
    ) AS existe
    UNION ALL
    SELECT 'column:stock_sucursal.stock_reservado' AS objeto, EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stock_sucursal'
        AND column_name = 'stock_reservado'
    ) AS existe
  `;

  console.log(JSON.stringify(checks, null, 2));
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
