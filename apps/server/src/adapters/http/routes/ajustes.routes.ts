/**
 * T-20.2 — GET /api/ajustes   retorna configuracion completa (solo ADMIN)
 *           PATCH /api/ajustes actualiza uno o varios campos atomicamente;
 *                               si cambian NIT o NRC guarda backup en bitacora
 *           CRUD /api/ajustes/zonas administra ZonaEnvio (solo ADMIN)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }         from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

export const ajustesRoutes = Router();
export const ajustesPublicRoutes = Router();

ajustesPublicRoutes.get('/pago', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await prisma.configuracionNegocio.findMany({
      where: { clave: { in: ['banco', 'cuenta_bancaria', 'titular_cuenta'] } },
      select: { clave: true, valor: true },
    });

    const mapa: Record<string, string> = {};
    for (const c of configs) mapa[c.clave] = c.valor;

    return res.json({
      banco:           mapa.banco ?? '',
      cuentaBancaria: mapa.cuenta_bancaria ?? '',
      titularCuenta:  mapa.titular_cuenta ?? '',
    });
  } catch (err) {
    return next(err);
  }
});

ajustesRoutes.use(roleMiddleware('ADMIN'));

// ── Claves permitidas en configuracion_negocio ────────────────
const CLAVES_FISCALES = ['NIT', 'NRC'] as const;
const CLAVES_PERMITIDAS = [
  ...CLAVES_FISCALES,
  'banco',
  'cuenta_bancaria',
  'titular_cuenta',
  'correo_remitente',
] as const;

type ClaveFiscal = (typeof CLAVES_FISCALES)[number];
type ClavePermitida = (typeof CLAVES_PERMITIDAS)[number];

// ── GET /api/ajustes ──────────────────────────────────────────
ajustesRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [configs, zonas] = await Promise.all([
      prisma.configuracionNegocio.findMany({
        where: { clave: { in: [...CLAVES_PERMITIDAS] } },
      }),
      prisma.zonaEnvio.findMany({ orderBy: { nombre: 'asc' } }),
    ]);

    const mapa: Record<string, string> = {};
    for (const c of configs) mapa[c.clave] = c.valor;

    return res.json({
      NIT:              mapa['NIT']              ?? '',
      NRC:              mapa['NRC']              ?? '',
      banco:            mapa['banco']            ?? '',
      cuenta_bancaria:  mapa['cuenta_bancaria']  ?? '',
      titular_cuenta:   mapa['titular_cuenta']   ?? '',
      correo_remitente: mapa['correo_remitente'] ?? '',
      zonasEnvio: zonas.map(z => ({
        id:                 z.id,
        nombre:             z.nombre,
        descripcion:        z.descripcion,
        costoEnvio:         z.costoEnvio,
        activo:             z.activo,
        sucursalPreferente: z.sucursalPreferente,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/ajustes ────────────────────────────────────────
const PatchAjustesSchema = z.object({
  NIT:              z.string().max(20).optional(),
  NRC:              z.string().max(20).optional(),
  banco:            z.string().max(100).optional(),
  cuenta_bancaria:  z.string().max(50).optional(),
  titular_cuenta:   z.string().max(100).optional(),
  correo_remitente: z.string().email().optional(),
}).strict();

ajustesRoutes.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = PatchAjustesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const campos = parsed.data as Partial<Record<ClavePermitida, string>>;
  const claves = Object.keys(campos) as ClavePermitida[];
  if (claves.length === 0) return res.json({ ok: true });

  try {
    await prisma.$transaction(async (tx) => {
      // Backup de campos fiscales que van a cambiar
      const fiscalesACambiar = (claves.filter(k =>
        (CLAVES_FISCALES as readonly string[]).includes(k)
      ) as ClaveFiscal[]);

      if (fiscalesACambiar.length > 0) {
        const actuales = await tx.configuracionNegocio.findMany({
          where: { clave: { in: fiscalesACambiar } },
        });

        for (const actual of actuales) {
          const nuevoValor = campos[actual.clave as ClavePermitida];
          if (nuevoValor === undefined || nuevoValor === actual.valor) continue;

          const backupClave = `${actual.clave}_backup`;
          const existing = await tx.configuracionNegocio.findUnique({
            where: { clave: backupClave },
          });

          let historial: Array<{ valor: string; fecha: string; usuarioId: number | null }> = [];
          if (existing) {
            try { historial = JSON.parse(existing.valor); } catch { historial = []; }
          }

          historial.push({
            valor:     actual.valor,
            fecha:     new Date().toISOString(),
            usuarioId: req.usuario?.id ?? null,
          });

          // Conservar máximo 20 entradas de historial
          if (historial.length > 20) historial = historial.slice(-20);

          await tx.configuracionNegocio.upsert({
            where:  { clave: backupClave },
            update: { valor: JSON.stringify(historial), tipo: 'JSON' },
            create: { clave: backupClave, valor: JSON.stringify(historial), tipo: 'JSON' },
          });
        }
      }

      // Actualizar todos los campos en paralelo dentro de la transacción
      await Promise.all(
        claves.map(clave =>
          tx.configuracionNegocio.upsert({
            where:  { clave },
            update: { valor: campos[clave]! },
            create: { clave, valor: campos[clave]!, tipo: 'TEXT' },
          })
        )
      );
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// ── ZONAS DE ENVÍO ────────────────────────────────────────────

const ZonaSchema = z.object({
  nombre:             z.string().min(1).max(100),
  descripcion:        z.string().max(255).optional().nullable(),
  costoEnvio:         z.number().min(0).default(0),
  activo:             z.boolean().default(true),
  sucursalPreferente: z.number().int().positive().optional().nullable(),
});

ajustesRoutes.get('/zonas', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const zonas = await prisma.zonaEnvio.findMany({ orderBy: { nombre: 'asc' } });
    return res.json(zonas);
  } catch (err) {
    return next(err);
  }
});

ajustesRoutes.post('/zonas', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = ZonaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });

  try {
    const zona = await prisma.zonaEnvio.create({ data: parsed.data });
    return res.status(201).json(zona);
  } catch (err) {
    return next(err);
  }
});

ajustesRoutes.put('/zonas/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  const parsed = ZonaSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });

  try {
    const zona = await prisma.zonaEnvio.update({ where: { id }, data: parsed.data });
    return res.json(zona);
  } catch (err) {
    return next(err);
  }
});

ajustesRoutes.delete('/zonas/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID inválido' });

  try {
    await prisma.zonaEnvio.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
