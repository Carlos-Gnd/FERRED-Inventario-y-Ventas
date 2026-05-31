// Chequeo read-only de datos huérfanos antes de re-crear las foreign keys (saneamiento de drift).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// [etiqueta, tabla hija, columna FK, tabla padre, columna padre]
const checks: Array<[string, string, string, string, string]> = [
  ['usuarios.sucursal_id',                 'usuarios',               'sucursal_id',            'sucursales',         'id'],
  ['productos.categoria_id',               'productos',              'categoria_id',           'categorias',         'id'],
  ['productos.tipo_unidad',                'productos',              'tipo_unidad',            'unidades_medida',    'codigo'],
  ['stock_sucursal.producto_id',           'stock_sucursal',         'producto_id',            'productos',          'id'],
  ['stock_sucursal.sucursal_id',           'stock_sucursal',         'sucursal_id',            'sucursales',         'id'],
  ['facturas_dte.sucursal_id',             'facturas_dte',           'sucursal_id',            'sucursales',         'id'],
  ['facturas_dte.usuario_id',              'facturas_dte',           'usuario_id',             'usuarios',           'id'],
  ['detalles_venta.factura_id',            'detalles_venta',         'factura_id',             'facturas_dte',       'id'],
  ['detalles_venta.producto_id',           'detalles_venta',         'producto_id',            'productos',          'id'],
  ['sync_log.usuario_id',                  'sync_log',               'usuario_id',             'usuarios',           'id'],
  ['cortes_caja.sucursal_id',              'cortes_caja',            'sucursal_id',            'sucursales',         'id'],
  ['cortes_caja.cajero_id',                'cortes_caja',            'cajero_id',              'usuarios',           'id'],
  ['zonas_envio.sucursal_id_preferente',   'zonas_envio',            'sucursal_id_preferente', 'sucursales',         'id'],
  ['pedidos_online.sucursal_id',           'pedidos_online',         'sucursal_id',            'sucursales',         'id'],
  ['pedidos_online.zona_envio_id',         'pedidos_online',         'zona_envio_id',          'zonas_envio',        'id'],
  ['pedidos_online.cliente_id',            'pedidos_online',         'cliente_id',             'clientes_ecommerce', 'id'],
  ['pedidos_online_detalle.pedido_id',     'pedidos_online_detalle', 'pedido_id',              'pedidos_online',     'id'],
  ['pedidos_online_detalle.producto_id',   'pedidos_online_detalle', 'producto_id',            'productos',          'id'],
  ['pagos.pedido_id',                      'pagos',                  'pedido_id',              'pedidos_online',     'id'],
];

async function main() {
  let totalHuerfanos = 0;
  for (const [label, hija, col, padre, padreCol] of checks) {
    const sql = `SELECT count(*)::int AS n FROM "${hija}" c
                 WHERE c."${col}" IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM "${padre}" p WHERE p."${padreCol}" = c."${col}")`;
    const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
    const n = Number(rows[0]?.n ?? 0);
    totalHuerfanos += n;
    console.log(`${n > 0 ? '⚠️ ' : '✅'} ${label.padEnd(36)} huérfanos: ${n}`);
  }
  console.log(`\nTotal huérfanos: ${totalHuerfanos} → ${totalHuerfanos === 0 ? 'SEGURO re-crear las FKs' : 'hay que limpiar antes'}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
