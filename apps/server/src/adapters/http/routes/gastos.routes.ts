import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

export const gastosRoutes = Router();
export const tiposGastoRoutes = Router();

gastosRoutes.use(roleMiddleware('ADMIN'));
tiposGastoRoutes.use(roleMiddleware('ADMIN'));

const GastoQuerySchema = z.object({
  sucursalId: z.coerce.number().int().positive().optional(),
  tipoGastoId: z.coerce.number().int().positive().optional(),
  fechaInicio: z.string().date('fechaInicio debe ser YYYY-MM-DD').optional(),
  fechaFin: z.string().date('fechaFin debe ser YYYY-MM-DD').optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

const GastoSchema = z.object({
  tipoGastoId: z.coerce.number().int().positive(),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  descripcion: z.string().max(255).optional().nullable(),
  fecha: z.coerce.date().optional(),
  sucursalId: z.coerce.number().int().positive(),
});

const TipoGastoSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  descripcion: z.string().max(255).optional().nullable(),
});

type GastoQuery = z.infer<typeof GastoQuerySchema>;

function parseFecha(valor: string | undefined, finDelDia = false): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  if (finDelDia) fecha.setUTCHours(23, 59, 59, 999);
  return fecha;
}

function buildGastosWhere(params: GastoQuery) {
  return {
    ...(params.sucursalId ? { sucursalId: params.sucursalId } : {}),
    ...(params.tipoGastoId ? { tipoGastoId: params.tipoGastoId } : {}),
    ...(params.fechaInicio || params.fechaFin
      ? {
          fecha: {
            ...(params.fechaInicio ? { gte: parseFecha(params.fechaInicio) } : {}),
            ...(params.fechaFin ? { lte: parseFecha(params.fechaFin, true) } : {}),
          },
        }
      : {}),
  };
}

function redondearMonto(valor: number) {
  return Number(valor.toFixed(2));
}

gastosRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = GastoQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Parametros invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const where = buildGastosWhere(parsed.data);
    const gastos = await prisma.gasto.findMany({
      where,
      include: {
        tipoGasto: { select: { id: true, nombre: true } },
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
      take: parsed.data.limit,
    });

    const totalMonto = redondearMonto(gastos.reduce((acc, gasto) => acc + gasto.monto, 0));
    const porTipo = new Map<number, { tipoGastoId: number; tipoGasto: string; total: number; cantidad: number }>();

    for (const gasto of gastos) {
      const actual = porTipo.get(gasto.tipoGastoId) ?? {
        tipoGastoId: gasto.tipoGastoId,
        tipoGasto: gasto.tipoGasto.nombre,
        total: 0,
        cantidad: 0,
      };
      actual.total += gasto.monto;
      actual.cantidad += 1;
      porTipo.set(gasto.tipoGastoId, actual);
    }

    return res.json({
      total: gastos.length,
      totalMonto,
      totalesPorTipo: Array.from(porTipo.values()).map((item) => ({
        ...item,
        total: redondearMonto(item.total),
      })),
      gastos,
    });
  } catch (error) {
    return next(error);
  }
});

gastosRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = GastoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de gasto invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const { tipoGastoId, sucursalId } = parsed.data;
    const [tipoGasto, sucursal] = await Promise.all([
      prisma.tipoGasto.findUnique({ where: { id: tipoGastoId }, select: { id: true } }),
      prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { id: true } }),
    ]);

    if (!tipoGasto) return res.status(404).json({ error: 'Tipo de gasto no encontrado' });
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });
    if (!req.usuario?.id) return res.status(401).json({ error: 'Usuario no autenticado' });

    const gasto = await prisma.gasto.create({
      data: {
        tipoGastoId,
        sucursalId,
        usuarioId: req.usuario.id,
        monto: parsed.data.monto,
        descripcion: parsed.data.descripcion ?? null,
        fecha: parsed.data.fecha ?? new Date(),
      },
      include: {
        tipoGasto: { select: { id: true, nombre: true } },
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return res.status(201).json({ mensaje: 'Gasto registrado', gasto });
  } catch (error) {
    return next(error);
  }
});

gastosRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const parsed = GastoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de gasto invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    if (parsed.data.tipoGastoId) {
      const tipoGasto = await prisma.tipoGasto.findUnique({
        where: { id: parsed.data.tipoGastoId },
        select: { id: true },
      });
      if (!tipoGasto) return res.status(404).json({ error: 'Tipo de gasto no encontrado' });
    }

    if (parsed.data.sucursalId) {
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: parsed.data.sucursalId },
        select: { id: true },
      });
      if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    const gasto = await prisma.gasto.update({
      where: { id },
      data: parsed.data,
      include: {
        tipoGasto: { select: { id: true, nombre: true } },
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return res.json({ mensaje: 'Gasto actualizado', gasto });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2025') return res.status(404).json({ error: 'Gasto no encontrado' });
    return next(error);
  }
});

gastosRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    await prisma.gasto.delete({ where: { id } });
    return res.json({ mensaje: 'Gasto eliminado' });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2025') return res.status(404).json({ error: 'Gasto no encontrado' });
    return next(error);
  }
});

tiposGastoRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await prisma.tipoGasto.findMany({ orderBy: { nombre: 'asc' } });
    return res.json(tipos);
  } catch (error) {
    return next(error);
  }
});

tiposGastoRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = TipoGastoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de tipo de gasto invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const tipo = await prisma.tipoGasto.create({ data: parsed.data });
    return res.status(201).json({ mensaje: 'Tipo de gasto creado', tipo });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un tipo de gasto con ese nombre' });
    return next(error);
  }
});

tiposGastoRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const parsed = TipoGastoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de tipo de gasto invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const tipo = await prisma.tipoGasto.update({ where: { id }, data: parsed.data });
    return res.json({ mensaje: 'Tipo de gasto actualizado', tipo });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2025') return res.status(404).json({ error: 'Tipo de gasto no encontrado' });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un tipo de gasto con ese nombre' });
    return next(error);
  }
});

tiposGastoRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

    const gastosAsociados = await prisma.gasto.count({ where: { tipoGastoId: id } });
    if (gastosAsociados > 0) {
      return res.status(409).json({ error: 'No se puede eliminar un tipo de gasto con gastos asociados' });
    }

    await prisma.tipoGasto.delete({ where: { id } });
    return res.json({ mensaje: 'Tipo de gasto eliminado' });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2025') return res.status(404).json({ error: 'Tipo de gasto no encontrado' });
    return next(error);
  }
});
