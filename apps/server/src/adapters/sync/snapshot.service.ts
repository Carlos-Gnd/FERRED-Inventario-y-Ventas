/**
 * snapshot.service.ts — T-07E.1
 * Lee desde Prisma (nube) y escribe en SQLite local para operación offline.
 *
 * bootstrapSnapshot: snapshot completo de todas las tablas clave.
 * refreshSnapshot:   delta incremental usando updatedAt desde el último refresh.
 *
 * T-07F.3: al escribir usuarios incluye last_synced_at para validar login offline.
 */
import { prisma } from '../db/prisma/prisma.client';
import { getSqliteDb } from '../db/sqlite/sqlite.client';
import { SyncService } from './sync.service';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const lastRefresh = new Map<number, Date>();

export interface SnapshotCounts {
  sucursal:     number;
  categorias:   number;
  productos:    number;
  stock:        number;
  usuarios:     number;
}

export async function bootstrapSnapshot(sucursalId: number): Promise<SnapshotCounts> {
  const db  = getSqliteDb();
  const now = new Date();

  const [sucursal, categorias, productos, usuarios] = await Promise.all([
    prisma.sucursal.findUnique({ where: { id: sucursalId } }),
    prisma.categoria.findMany({ where: { activo: true } }),
    prisma.producto.findMany({
      where:   { activo: true },
      include: { stocks: { where: { sucursalId } } },
    }),
    prisma.usuario.findMany({ where: { sucursalId, activo: true } }),
  ]);

  const upsertAll = db.transaction(() => {
    // ── Sucursal ───────────────────────────────────────────────────────────
    if (sucursal) {
      db.prepare(`
        INSERT OR REPLACE INTO sucursales (id, nombre, direccion, telefono)
        VALUES (?, ?, ?, ?)
      `).run(sucursal.id, sucursal.nombre, sucursal.direccion ?? null, sucursal.telefono ?? null);
    }

    // ── Categorías ─────────────────────────────────────────────────────────
    const stmtCat = db.prepare(`
      INSERT OR REPLACE INTO categorias (id, nombre, descripcion, activo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of categorias) {
      stmtCat.run(c.id, c.nombre, c.descripcion ?? null, c.activo ? 1 : 0, c.updatedAt.toISOString());
    }

    // ── Productos + stock_sucursal ─────────────────────────────────────────
    const stmtProd = db.prepare(`
      INSERT OR REPLACE INTO productos (
        id, categoria_id, nombre, codigo_barras, tipo_unidad,
        precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
        tiene_iva, stock_actual, stock_minimo, activo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtStock = db.prepare(`
      INSERT OR REPLACE INTO stock_sucursal
        (producto_id, sucursal_id, cantidad, minimo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const p of productos) {
      stmtProd.run(
        p.id, p.categoriaId ?? null, p.nombre, p.codigoBarras ?? null,
        p.tipoUnidad ?? 'UNIDAD', p.precioCompra ?? 0, p.porcentajeGanancia ?? 0,
        p.precioVenta ?? 0, p.precioConIva ?? 0, p.tieneIva ? 1 : 0,
        p.stockActual, p.stockMinimo, p.activo ? 1 : 0,
        p.updatedAt.toISOString(),
      );
      const stockRow = p.stocks[0];
      if (stockRow) {
        stmtStock.run(
          p.id, sucursalId,
          stockRow.cantidad, stockRow.minimo,
          stockRow.updatedAt.toISOString(),
        );
      }
    }

    // ── Usuarios (con hash para login offline — T-07F) ─────────────────────
    const stmtUser = db.prepare(`
      INSERT OR REPLACE INTO usuarios
        (id, sucursal_id, nombre, email, contrasena_hash, rol, activo, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of usuarios) {
      stmtUser.run(
        u.id, u.sucursalId ?? null, u.nombre, u.email,
        u.contrasenaHash, u.rol, u.activo ? 1 : 0,
        now.toISOString(),
      );
    }
  });

  upsertAll();
  lastRefresh.set(sucursalId, now);

  return {
    sucursal:   sucursal ? 1 : 0,
    categorias: categorias.length,
    productos:  productos.length,
    stock:      productos.filter((p: any) => p.stocks.length > 0).length,
    usuarios:   usuarios.length,
  };
}

export async function refreshSnapshot(sucursalId: number): Promise<SnapshotCounts> {
  const since = lastRefresh.get(sucursalId);
  if (!since) return bootstrapSnapshot(sucursalId);

  const db  = getSqliteDb();
  const now = new Date();

  const [categorias, productos, usuarios] = await Promise.all([
    prisma.categoria.findMany({ where: { activo: true, updatedAt: { gte: since } } }),
    prisma.producto.findMany({
      where:   { activo: true, updatedAt: { gte: since } },
      include: { stocks: { where: { sucursalId } } },
    }),
    prisma.usuario.findMany({ where: { sucursalId, activo: true, creadoEn: { gte: since } } }),
  ]);

  if (categorias.length === 0 && productos.length === 0 && usuarios.length === 0) {
    lastRefresh.set(sucursalId, now);
    return { sucursal: 0, categorias: 0, productos: 0, stock: 0, usuarios: 0 };
  }

  const upsertDelta = db.transaction(() => {
    const stmtCat = db.prepare(`
      INSERT OR REPLACE INTO categorias (id, nombre, descripcion, activo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of categorias) {
      stmtCat.run(c.id, c.nombre, c.descripcion ?? null, c.activo ? 1 : 0, c.updatedAt.toISOString());
    }

    const stmtProd = db.prepare(`
      INSERT OR REPLACE INTO productos (
        id, categoria_id, nombre, codigo_barras, tipo_unidad,
        precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
        tiene_iva, stock_actual, stock_minimo, activo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtStock = db.prepare(`
      INSERT OR REPLACE INTO stock_sucursal
        (producto_id, sucursal_id, cantidad, minimo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const p of productos) {
      stmtProd.run(
        p.id, p.categoriaId ?? null, p.nombre, p.codigoBarras ?? null,
        p.tipoUnidad ?? 'UNIDAD', p.precioCompra ?? 0, p.porcentajeGanancia ?? 0,
        p.precioVenta ?? 0, p.precioConIva ?? 0, p.tieneIva ? 1 : 0,
        p.stockActual, p.stockMinimo, p.activo ? 1 : 0,
        p.updatedAt.toISOString(),
      );
      const stockRow = p.stocks[0];
      if (stockRow) {
        stmtStock.run(
          p.id, sucursalId,
          stockRow.cantidad, stockRow.minimo,
          stockRow.updatedAt.toISOString(),
        );
      }
    }

    const stmtUser = db.prepare(`
      INSERT OR REPLACE INTO usuarios
        (id, sucursal_id, nombre, email, contrasena_hash, rol, activo, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of usuarios) {
      stmtUser.run(
        u.id, u.sucursalId ?? null, u.nombre, u.email,
        u.contrasenaHash, u.rol, u.activo ? 1 : 0,
        now.toISOString(),
      );
    }
  });

  upsertDelta();
  lastRefresh.set(sucursalId, now);

  return {
    sucursal:   0,
    categorias: categorias.length,
    productos:  productos.length,
    stock:      productos.filter((p: any) => p.stocks.length > 0).length,
    usuarios:   usuarios.length,
  };
}

export function getLastSnapshotAt(sucursalId: number): Date | null {
  return lastRefresh.get(sucursalId) ?? null;
}

export const SnapshotService = {
  start(sucursalId: number) {
    if (SyncService.isOnline()) {
      bootstrapSnapshot(sucursalId).catch(err =>
        console.error('[Snapshot] Bootstrap inicial falló:', err.message),
      );
    }

    setInterval(() => {
      if (!SyncService.isOnline()) return;
      refreshSnapshot(sucursalId).catch(err =>
        console.error('[Snapshot] Refresh incremental falló:', err.message),
      );
    }, REFRESH_INTERVAL_MS);
  },
};
