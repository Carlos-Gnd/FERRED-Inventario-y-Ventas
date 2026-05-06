/**
 * stock-sync.service.ts
 * Sincronización de stockTotal del producto a partir de la suma de stocks por sucursal.
 * Extraído de inventario.routes.ts (DT-04) para eliminar dependencia circular
 * entre producto, proveedor, ventas → inventario.
 */
import { prisma } from '../../db/prisma/prisma.client';

export async function sincronizarStockTotal(productoId: number): Promise<void> {
  const resultado = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });
  const totalStock = resultado._sum.cantidad ?? 0;
  await prisma.producto.update({
    where: { id: productoId },
    data:  { stockActual: totalStock },
  });
}
