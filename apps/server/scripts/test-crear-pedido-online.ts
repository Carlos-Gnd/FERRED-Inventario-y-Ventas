import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type PrismaLike = {
  $disconnect: () => Promise<void>;
};

type ServiceErrorShape = {
  statusCode: number;
  message: string;
  detalles?: unknown;
};

let prismaClient: PrismaLike | null = null;

function isServiceErrorShape(error: unknown): error is ServiceErrorShape {
  return (
    typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && 'message' in error
  );
}

const sucursalId = Number(process.env.TEST_SUCURSAL_ID ?? 1);
const zonaEnvioId = Number(process.env.TEST_ZONA_ENVIO_ID ?? 1);
const productoId = Number(process.env.TEST_PRODUCTO_ID ?? 1);
const cantidad = Number(process.env.TEST_CANTIDAD ?? 1);

async function main(): Promise<void> {
  const service = await import('../src/adapters/http/services/pedidos-online.service');
  const prismaModule = await import('../src/adapters/db/prisma/prisma.client');
  prismaClient = prismaModule.prisma;

  const tipoEntrega = (
    process.env.TEST_TIPO_ENTREGA === service.TipoEntregaPedidoOnline.ENVIO
      ? service.TipoEntregaPedidoOnline.ENVIO
      : service.TipoEntregaPedidoOnline.RETIRO
  );

  const pedido = await service.crearPedidoOnline({
    clienteNombre: process.env.TEST_CLIENTE_NOMBRE ?? 'Cliente Prueba',
    clienteTel: process.env.TEST_CLIENTE_TEL ?? '77770000',
    tipoEntrega,
    sucursalId: tipoEntrega === service.TipoEntregaPedidoOnline.RETIRO ? sucursalId : undefined,
    zonaEnvioId: tipoEntrega === service.TipoEntregaPedidoOnline.ENVIO ? zonaEnvioId : undefined,
    direccionEnvio: tipoEntrega === service.TipoEntregaPedidoOnline.ENVIO
      ? (process.env.TEST_DIRECCION_ENVIO ?? 'Colonia prueba, casa 123')
      : undefined,
    items: [
      {
        productoId,
        cantidad,
      },
    ],
  });

  console.log(JSON.stringify({
    ok: true,
    pedido,
    esperado: {
      estadoRecibido: pedido.estado === 'RECIBIDO',
      retiroCostoCero: tipoEntrega === service.TipoEntregaPedidoOnline.RETIRO ? pedido.costoEnvio === 0 : undefined,
      totalCalculado: Number((pedido.subtotal + pedido.costoEnvio).toFixed(2)) === pedido.total,
    },
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    if (isServiceErrorShape(error)) {
      console.error(JSON.stringify({
        ok: false,
        statusCode: error.statusCode,
        error: error.message,
        detalle: error.detalles,
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaClient?.$disconnect();
  });
