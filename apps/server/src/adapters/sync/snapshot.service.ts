/**
 * snapshot.service.ts — T-07E.1
 * Sincronización bidireccional Supabase → SQLite local.
 *
 * bootstrapSnapshot: snapshot completo de todas las tablas clave.
 * refreshSnapshot:   delta incremental usando updatedAt desde el último refresh.
 *
 * GAP-2: incluye proveedores, facturas y recepciones (últimos 30 días).
 * GAP-3: persiste lastRefresh en snapshot_meta (SQLite) para sobrevivir reinicios.
 * GAP-4: desactiva en SQLite los registros que Supabase ya marcó como inactivos.
 * T-07F.3: al escribir usuarios incluye last_synced_at para validar login offline.
 */
import { prisma } from '../db/prisma/prisma.client';
import { getSqliteDb } from '../db/sqlite/sqlite.client';
import { SyncService } from './sync.service';
import Database from 'better-sqlite3';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DIAS_HISTORIAL       = 30;

export interface SnapshotCounts {
  sucursal:     number;
  categorias:   number;
  productos:    number;
  stock:        number;
  usuarios:     number;
  proveedores:  number;
  facturas:     number;
  recepciones:  number;
}

// ── GAP-3: persistencia de lastRefresh en SQLite ──────────────────────────────

function getLastRefresh(db: Database.Database, sucursalId: number): Date | null {
  const row = db.prepare(
    `SELECT last_refresh FROM snapshot_meta WHERE sucursal_id = ?`
  ).get(sucursalId) as { last_refresh: string } | undefined;
  return row ? new Date(row.last_refresh) : null;
}

function setLastRefresh(db: Database.Database, sucursalId: number, date: Date) {
  db.prepare(
    `INSERT OR REPLACE INTO snapshot_meta (sucursal_id, last_refresh) VALUES (?, ?)`
  ).run(sucursalId, date.toISOString());
}

// ── Bootstrap completo ────────────────────────────────────────────────────────

export async function bootstrapSnapshot(sucursalId: number): Promise<SnapshotCounts> {
  const db  = getSqliteDb();
  const now = new Date();
  const desde = new Date(now.getTime() - DIAS_HISTORIAL * 24 * 60 * 60 * 1000);

  const [sucursal, categorias, productos, usuarios, proveedores, facturas, recepciones] =
    await Promise.all([
      prisma.sucursal.findUnique({ where: { id: sucursalId } }),
      prisma.categoria.findMany(),
      prisma.producto.findMany({
        include: { stocks: { where: { sucursalId } } },
      }),
      prisma.usuario.findMany({ where: { sucursalId } }),
      prisma.proveedor.findMany(),
      prisma.facturaDte.findMany({
        where: {
          sucursalId,
          creadoEn: { gte: desde },
        },
        include: { detalles: true },
      }),
      prisma.recepcionMercancia.findMany({
        where: {
          sucursalId,
          creadoEn: { gte: desde },
        },
        include: { detalles: true },
      }),
    ]);

  const upsertAll = db.transaction(() => {
    // ── Sucursal ─────────────────────────────────────────────────────────────
    if (sucursal) {
      db.prepare(`
        INSERT OR REPLACE INTO sucursales (id, nombre, direccion, telefono)
        VALUES (?, ?, ?, ?)
      `).run(sucursal.id, sucursal.nombre, sucursal.direccion ?? null, sucursal.telefono ?? null);
    }

    // ── Categorías + GAP-4 (desactivar eliminadas) ────────────────────────
    const stmtCat = db.prepare(`
      INSERT OR REPLACE INTO categorias (id, nombre, descripcion, activo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of categorias) {
      stmtCat.run(c.id, c.nombre, c.descripcion ?? null, c.activo ? 1 : 0, c.updatedAt.toISOString());
    }
    if (categorias.length > 0) {
      const ph  = categorias.map(() => '?').join(',');
      const ids = categorias.map(c => c.id);
      db.prepare(`UPDATE categorias SET activo = 0 WHERE id NOT IN (${ph}) AND activo = 1`)
        .run(...ids);
    }

    // ── Productos + stock + GAP-4 ─────────────────────────────────────────
    const stmtProd = db.prepare(`
      INSERT OR REPLACE INTO productos (
        id, categoria_id, nombre, codigo_barras, tipo_unidad,
        precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
        tiene_iva, stock_actual, stock_minimo, activo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtStock = db.prepare(`
      INSERT OR REPLACE INTO stock_sucursal
        (producto_id, sucursal_id, cantidad, minimo, stock_reservado, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of productos) {
      stmtProd.run(
        p.id, p.categoriaId ?? null, p.nombre, p.codigoBarras ?? null,
        p.tipoUnidad ?? 'UND', p.precioCompra ?? 0, p.porcentajeGanancia ?? 0,
        p.precioVenta ?? 0, p.precioConIva ?? 0, p.tieneIva ? 1 : 0,
        p.stockActual, p.stockMinimo, p.activo ? 1 : 0,
        p.updatedAt.toISOString(),
      );
      const stockRow = p.stocks[0];
      if (stockRow) {
        stmtStock.run(p.id, sucursalId, stockRow.cantidad, stockRow.minimo, stockRow.stockReservado, stockRow.updatedAt.toISOString());
      }
    }
    if (productos.length > 0) {
      const ph  = productos.map(() => '?').join(',');
      const ids = productos.map(p => p.id);
      db.prepare(`UPDATE productos SET activo = 0 WHERE id NOT IN (${ph}) AND activo = 1`)
        .run(...ids);
    }

    // ── Usuarios (con hash para login offline — T-07F) ────────────────────
    const stmtUser = db.prepare(`
      INSERT OR REPLACE INTO usuarios
        (id, sucursal_id, nombre, email, contrasena_hash, rol, activo, last_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of usuarios) {
      stmtUser.run(
        u.id, u.sucursalId ?? null, u.nombre, u.email,
        u.contrasenaHash, u.rol, u.activo ? 1 : 0,
        now.toISOString(),
        u.updatedAt.toISOString(),
      );
    }

    // ── GAP-2: Proveedores + GAP-4 ────────────────────────────────────────
    const stmtProv = db.prepare(`
      INSERT OR REPLACE INTO proveedores (id, nombre, nit, telefono, email, direccion, activo, creado_en, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of proveedores) {
      stmtProv.run(
        p.id, p.nombre, p.nit ?? null, p.telefono ?? null,
        p.email ?? null, p.direccion ?? null, p.activo ? 1 : 0,
        p.creadoEn.toISOString(),
        p.updatedAt.toISOString(),
      );
    }
    if (proveedores.length > 0) {
      const ph  = proveedores.map(() => '?').join(',');
      const ids = proveedores.map(p => p.id);
      db.prepare(`UPDATE proveedores SET activo = 0 WHERE id NOT IN (${ph}) AND activo = 1`)
        .run(...ids);
    }

    // ── GAP-2: Facturas + detalles (últimos 30 días) ──────────────────────
    const stmtFact = db.prepare(`
      INSERT OR REPLACE INTO facturas_dte (
        id, sucursal_id, usuario_id, codigo_generacion, numero_control,
        tipo_dte, cliente_nombre, total_sin_iva, iva, total,
        dte_json, estado, sincronizado, creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtDet = db.prepare(`
      INSERT OR IGNORE INTO detalles_venta
        (id, factura_id, producto_id, cantidad, precio_unit, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const f of facturas) {
      stmtFact.run(
        f.id, f.sucursalId ?? null, f.usuarioId ?? null,
        f.codigoGeneracion ?? null, f.numeroControl ?? null,
        f.tipoDte, f.clienteNombre,
        f.totalSinIva ?? 0, f.iva ?? 0, f.total ?? 0,
        f.dteJson ?? null, f.estado, f.sincronizado ? 1 : 0,
        f.creadoEn.toISOString(),
      );
      for (const d of f.detalles) {
        stmtDet.run(d.id, d.facturaId, d.productoId, d.cantidad, d.precioUnit, d.subtotal);
      }
    }

    // ── GAP-2: Recepciones + detalles (últimos 30 días) ───────────────────
    const stmtRec = db.prepare(`
      INSERT OR REPLACE INTO recepciones_mercancia
        (id, proveedor_id, sucursal_id, usuario_id, numero_factura, total, observaciones, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtDetRec = db.prepare(`
      INSERT OR IGNORE INTO detalles_recepcion
        (id, recepcion_id, producto_id, cantidad, costo_unit, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of recepciones) {
      stmtRec.run(
        r.id, r.proveedorId, r.sucursalId, r.usuarioId ?? null,
        r.numeroFactura ?? null, r.total, r.observaciones ?? null,
        r.creadoEn.toISOString(),
      );
      for (const d of r.detalles) {
        stmtDetRec.run(d.id, d.recepcionId, d.productoId, d.cantidad, d.costoUnit, d.subtotal);
      }
    }

    // GAP-3: persistir timestamp del refresh
    setLastRefresh(db, sucursalId, now);
  });

  upsertAll();

  return {
    sucursal:    sucursal ? 1 : 0,
    categorias:  categorias.length,
    productos:   productos.length,
    stock:       productos.filter(p => p.stocks.length > 0).length,
    usuarios:    usuarios.length,
    proveedores: proveedores.length,
    facturas:    facturas.length,
    recepciones: recepciones.length,
  };
}

// ── Refresh incremental (delta) ───────────────────────────────────────────────

export async function refreshSnapshot(sucursalId: number): Promise<SnapshotCounts> {
  const db    = getSqliteDb();
  const since = getLastRefresh(db, sucursalId);

  // Sin registro previo: hacer bootstrap completo
  if (!since) return bootstrapSnapshot(sucursalId);

  const now   = new Date();

  // DT-NUEVA-B resuelto: proveedores y usuarios ahora tienen updatedAt → delta real.
  const [categorias, productos, proveedores, facturas, recepciones, usuarios] =
    await Promise.all([
      prisma.categoria.findMany({ where: { updatedAt: { gte: since } } }),
      prisma.producto.findMany({
        where:   { updatedAt: { gte: since } },
        include: { stocks: { where: { sucursalId } } },
      }),
      prisma.proveedor.findMany({ where: { updatedAt: { gte: since } } }),
      prisma.facturaDte.findMany({
        where:   { sucursalId, creadoEn: { gte: since } },
        include: { detalles: true },
      }),
      prisma.recepcionMercancia.findMany({
        where:   { sucursalId, creadoEn: { gte: since } },
        include: { detalles: true },
      }),
      prisma.usuario.findMany({ where: { sucursalId, updatedAt: { gte: since } } }),
    ]);

  const hayDelta = categorias.length > 0 || productos.length > 0 || usuarios.length > 0
    || proveedores.length > 0 || facturas.length > 0 || recepciones.length > 0;

  if (!hayDelta) {
    setLastRefresh(db, sucursalId, now);
    return { sucursal: 0, categorias: 0, productos: 0, stock: 0, usuarios: 0, proveedores: 0, facturas: 0, recepciones: 0 };
  }

  const upsertDelta = db.transaction(() => {
    // ── Categorías + GAP-4 ────────────────────────────────────────────────
    const stmtCat = db.prepare(`
      INSERT OR REPLACE INTO categorias (id, nombre, descripcion, activo, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of categorias) {
      stmtCat.run(c.id, c.nombre, c.descripcion ?? null, c.activo ? 1 : 0, c.updatedAt.toISOString());
    }

    // ── Productos + stock + GAP-4 ─────────────────────────────────────────
    const stmtProd = db.prepare(`
      INSERT OR REPLACE INTO productos (
        id, categoria_id, nombre, codigo_barras, tipo_unidad,
        precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
        tiene_iva, stock_actual, stock_minimo, activo, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtStock = db.prepare(`
      INSERT OR REPLACE INTO stock_sucursal
        (producto_id, sucursal_id, cantidad, minimo, stock_reservado, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of productos) {
      stmtProd.run(
        p.id, p.categoriaId ?? null, p.nombre, p.codigoBarras ?? null,
        p.tipoUnidad ?? 'UND', p.precioCompra ?? 0, p.porcentajeGanancia ?? 0,
        p.precioVenta ?? 0, p.precioConIva ?? 0, p.tieneIva ? 1 : 0,
        p.stockActual, p.stockMinimo, p.activo ? 1 : 0,
        p.updatedAt.toISOString(),
      );
      const stockRow = p.stocks[0];
      if (stockRow) {
        stmtStock.run(p.id, sucursalId, stockRow.cantidad, stockRow.minimo, stockRow.stockReservado, stockRow.updatedAt.toISOString());
      }
    }

    // ── Usuarios: delta por updatedAt (DT-NUEVA-B resuelto) ───────────────
    const stmtUser = db.prepare(`
      INSERT OR REPLACE INTO usuarios
        (id, sucursal_id, nombre, email, contrasena_hash, rol, activo, last_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of usuarios) {
      stmtUser.run(
        u.id, u.sucursalId ?? null, u.nombre, u.email,
        u.contrasenaHash, u.rol, u.activo ? 1 : 0,
        now.toISOString(),
        u.updatedAt.toISOString(),
      );
    }

    // ── GAP-2: Proveedores nuevos y modificados (DT-NUEVA-B resuelto) ─────
    const stmtProv = db.prepare(`
      INSERT OR REPLACE INTO proveedores (id, nombre, nit, telefono, email, direccion, activo, creado_en, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of proveedores) {
      stmtProv.run(
        p.id, p.nombre, p.nit ?? null, p.telefono ?? null,
        p.email ?? null, p.direccion ?? null, p.activo ? 1 : 0,
        p.creadoEn.toISOString(),
        p.updatedAt.toISOString(),
      );
    }

    // ── GAP-2: Facturas nuevas + detalles ─────────────────────────────────
    const stmtFact = db.prepare(`
      INSERT OR REPLACE INTO facturas_dte (
        id, sucursal_id, usuario_id, codigo_generacion, numero_control,
        tipo_dte, cliente_nombre, total_sin_iva, iva, total,
        dte_json, estado, sincronizado, creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtDet = db.prepare(`
      INSERT OR IGNORE INTO detalles_venta
        (id, factura_id, producto_id, cantidad, precio_unit, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const f of facturas) {
      stmtFact.run(
        f.id, f.sucursalId ?? null, f.usuarioId ?? null,
        f.codigoGeneracion ?? null, f.numeroControl ?? null,
        f.tipoDte, f.clienteNombre,
        f.totalSinIva ?? 0, f.iva ?? 0, f.total ?? 0,
        f.dteJson ?? null, f.estado, f.sincronizado ? 1 : 0,
        f.creadoEn.toISOString(),
      );
      for (const d of f.detalles) {
        stmtDet.run(d.id, d.facturaId, d.productoId, d.cantidad, d.precioUnit, d.subtotal);
      }
    }

    // ── GAP-2: Recepciones nuevas + detalles ──────────────────────────────
    const stmtRec = db.prepare(`
      INSERT OR REPLACE INTO recepciones_mercancia
        (id, proveedor_id, sucursal_id, usuario_id, numero_factura, total, observaciones, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtDetRec = db.prepare(`
      INSERT OR IGNORE INTO detalles_recepcion
        (id, recepcion_id, producto_id, cantidad, costo_unit, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of recepciones) {
      stmtRec.run(
        r.id, r.proveedorId, r.sucursalId, r.usuarioId ?? null,
        r.numeroFactura ?? null, r.total, r.observaciones ?? null,
        r.creadoEn.toISOString(),
      );
      for (const d of r.detalles) {
        stmtDetRec.run(d.id, d.recepcionId, d.productoId, d.cantidad, d.costoUnit, d.subtotal);
      }
    }

    // GAP-3: actualizar timestamp
    setLastRefresh(db, sucursalId, now);
  });

  upsertDelta();

  return {
    sucursal:    0,
    categorias:  categorias.length,
    productos:   productos.length,
    stock:       productos.filter(p => p.stocks.length > 0).length,
    usuarios:    usuarios.length,
    proveedores: proveedores.length,
    facturas:    facturas.length,
    recepciones: recepciones.length,
  };
}

export function getLastSnapshotAt(sucursalId: number): Date | null {
  const db = getSqliteDb();
  return getLastRefresh(db, sucursalId);
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
