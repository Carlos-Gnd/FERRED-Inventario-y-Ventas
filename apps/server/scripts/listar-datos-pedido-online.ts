import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main(): Promise<void> {
  const { prisma } = await import('../src/adapters/db/prisma/prisma.client');

  const [sucursales, productos, zonasEnvio] = await Promise.all([
    prisma.sucursal.findMany({
      select: { id: true, nombre: true },
      orderBy: { id: 'asc' },
    }),
    prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        precioConIva: true,
        precioVenta: true,
        stocks: {
          select: {
            sucursalId: true,
            cantidad: true,
            stockReservado: true,
          },
          orderBy: { sucursalId: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
      take: 20,
    }),
    prisma.zonaEnvio.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        costoEnvio: true,
        sucursalPreferente: true,
      },
      orderBy: { id: 'asc' },
    }),
  ]);

  console.log(JSON.stringify({
    sucursales,
    productos: productos.map((producto) => ({
      ...producto,
      stocks: producto.stocks.map((stock) => ({
        ...stock,
        disponible: stock.cantidad - stock.stockReservado,
      })),
    })),
    zonasEnvio,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
