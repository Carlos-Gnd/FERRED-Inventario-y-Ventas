  import Database from 'better-sqlite3';
  import path from 'node:path';
  import fs from 'node:fs';
  import { env } from '../../../config/env';

  let _db: Database.Database | null = null;

  export function initSqlite(): Database.Database {
    if (_db) return _db;

    const dbPath = env.sqlite.path;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    const schema = readSchema();
    _db.exec(schema);
    ensureUpdatedAtColumns(_db);

    return _db;
  }

  export function getSqlite(): Database.Database {
    if (!_db) {
      throw new Error('SQLite no inicializado. Llamar initSqlite() en el bootstrap');
    }

    return _db;
  }

  export function closeSqlite() {
    _db?.close();
    _db = null;
  }

  export interface SyncQueueItem {
    id: number;
    tabla: string;
    operacion: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: string;
    intentos: number;
    status: string;
  }

  export function getSqliteDb() {
    try {
      return getSqlite();
    } catch {
      return initSqlite();
    }
  }

  export function guardarEnColaSync(
    tabla: string,
    operacion: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: object
  ) {
    logPendienteSqlite(tabla, operacion, payload);
  }

  // ── DT-09: SQL queries como constantes nombradas ─────────────────────────────

  const SQL_OBTENER_PRODUCTOS = `
    SELECT
      p.id,
      p.categoria_id AS categoriaId,
      c.nombre AS categoriaNombre,
      p.nombre,
      p.codigo_barras AS codigoBarras,
      p.tipo_unidad AS tipoUnidad,
      p.precio_compra AS precioCompra,
      p.porcentaje_ganancia AS porcentajeGanancia,
      p.precio_venta AS precioVenta,
      p.precio_con_iva AS precioConIva,
      p.tiene_iva AS tieneIva,
      p.stock_actual AS stockActual,
      p.stock_minimo AS stockMinimo,
      p.image_url AS imageUrl,
      p.activo
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.activo = ?
    ORDER BY p.nombre ASC
  `;

  const SQL_OBTENER_CATEGORIAS = `
    SELECT
      c.id,
      c.nombre,
      c.descripcion,
      COUNT(p.id) AS nProductos
    FROM categorias c
    LEFT JOIN productos p ON p.categoria_id = c.id
    WHERE c.activo = ?
    GROUP BY c.id, c.nombre, c.descripcion
    ORDER BY c.nombre ASC
  `;

  const SQL_OBTENER_STOCK_SUCURSAL = `
    SELECT
      ss.id,
      ss.producto_id AS productoId,
      ss.sucursal_id AS sucursalId,
      ss.cantidad,
      ss.minimo,
      ss.stock_reservado AS stockReservado,
      ss.actualizado_en AS actualizadoEn,
      p.nombre AS productoNombre,
      p.codigo_barras AS codigoBarras,
      p.precio_venta AS precioVenta,
      p.precio_con_iva AS precioConIva,
      p.tiene_iva AS tieneIva,
      p.tipo_unidad AS tipoUnidad,
      p.activo AS productoActivo,
      c.nombre AS categoriaNombre
    FROM stock_sucursal ss
    INNER JOIN productos p ON p.id = ss.producto_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE ss.sucursal_id = ?
    ORDER BY p.nombre ASC
  `;

  const SQL_OBTENER_RECEPCIONES = `
    SELECT
      r.id,
      r.total,
      r.numero_factura AS numeroFactura,
      r.observaciones,
      r.creado_en AS creadoEn,
      p.id AS proveedorId,
      p.nombre AS proveedorNombre,
      p.nit AS proveedorNit,
      p.telefono AS proveedorTelefono,
      p.email AS proveedorEmail,
      p.direccion AS proveedorDireccion,
      s.id AS sucursalId,
      s.nombre AS sucursalNombre,
      u.id AS usuarioId,
      u.nombre AS usuarioNombre,
      COUNT(d.id) AS detallesCount,
      COALESCE(SUM(d.cantidad), 0) AS cantidadItems
    FROM recepciones_mercancia r
    LEFT JOIN proveedores p ON p.id = r.proveedor_id
    LEFT JOIN sucursales s ON s.id = r.sucursal_id
    LEFT JOIN usuarios u ON u.id = r.usuario_id
    LEFT JOIN detalles_recepcion d ON d.recepcion_id = r.id
    WHERE (? IS NULL OR r.sucursal_id = ?)
    GROUP BY
      r.id, r.total, r.numero_factura, r.observaciones, r.creado_en,
      p.id, p.nombre, p.nit, p.telefono, p.email, p.direccion,
      s.id, s.nombre,
      u.id, u.nombre
    ORDER BY r.creado_en DESC
    LIMIT 100
  `;

  const SQL_OBTENER_RECEPCION_HEADER = `
    SELECT
      r.id,
      r.total,
      r.numero_factura AS numeroFactura,
      r.observaciones,
      r.creado_en AS creadoEn,
      r.sucursal_id AS sucursalId,
      p.id AS proveedorId,
      p.nombre AS proveedorNombre,
      p.nit AS proveedorNit,
      p.telefono AS proveedorTelefono,
      p.email AS proveedorEmail,
      p.direccion AS proveedorDireccion,
      s.id AS sucursalRefId,
      s.nombre AS sucursalNombre,
      u.id AS usuarioId,
      u.nombre AS usuarioNombre
    FROM recepciones_mercancia r
    LEFT JOIN proveedores p ON p.id = r.proveedor_id
    LEFT JOIN sucursales s ON s.id = r.sucursal_id
    LEFT JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.id = ?
  `;

  const SQL_OBTENER_DETALLES_RECEPCION = `
    SELECT
      d.id,
      d.cantidad,
      d.costo_unit AS costoUnit,
      d.subtotal,
      pr.id AS productoId,
      pr.nombre AS productoNombre,
      pr.tipo_unidad AS tipoUnidad,
      pr.codigo_barras AS codigoBarras
    FROM detalles_recepcion d
    LEFT JOIN productos pr ON pr.id = d.producto_id
    WHERE d.recepcion_id = ?
    ORDER BY d.id ASC
  `;

  // ─────────────────────────────────────────────────────────────────────────────

  export function crearProductoSqlite(data: any, sucursalId?: number) {
    const db = getSqliteDb();

    const result = db.prepare(`
      INSERT INTO productos (
        categoria_id, nombre, codigo_barras, tipo_unidad,
        precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
        tiene_iva, stock_actual, stock_minimo, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.categoriaId ?? null,
      data.nombre,
      data.codigoBarras ?? null,
      data.tipoUnidad ?? 'UND',
      data.precioCompra ?? 0,
      data.porcentajeGanancia ?? 0,
      data.precioVenta ?? 0,
      data.precioConIva ?? 0,
      (data.tieneIva ?? true) ? 1 : 0,
      data.stockActual ?? 0,
      data.stockMinimo ?? 0,
      1
    );

    const id = Number(result.lastInsertRowid);

    // Mantenemos la validación de sucursal para evitar errores de FK
    if (sucursalId && existeSucursalSqlite(db, sucursalId)) {
      db.prepare(`
        INSERT OR IGNORE INTO stock_sucursal
        (producto_id, sucursal_id, cantidad, minimo)
        VALUES (?, ?, ?, ?)
      `).run(id, sucursalId, data.stockActual ?? 0, data.stockMinimo ?? 0);
    }

    // Usamos el formato de log más completo para la sincronización
    logPendienteSqlite('producto', 'CREATE', {
      localId: id,
      sucursalId: sucursalId ?? null,
      ...data,
    });

    return productoLocalResponse({
      id,
      categoriaId: data.categoriaId ?? null,
      nombre: data.nombre,
      codigoBarras: data.codigoBarras ?? null,
      tipoUnidad: data.tipoUnidad ?? 'UND',
      precioCompra: data.precioCompra ?? 0,
      porcentajeGanancia: data.porcentajeGanancia ?? 0,
      precioVenta: data.precioVenta ?? 0,
      precioConIva: data.precioConIva ?? 0,
      tieneIva: Boolean(data.tieneIva ?? true),
      stockActual: data.stockActual ?? 0,
      stockMinimo: data.stockMinimo ?? 0,
      imageUrl: data.imageUrl ?? null,
      activo: true,
    });
  }

  export function obtenerProductosSqlite() {
    const db = getSqliteDb();

    const productos = db.prepare(SQL_OBTENER_PRODUCTOS).all(1);

    return productos.map(productoLocalResponse);
  }

  export function obtenerCategoriasSqlite() {
    const db = getSqliteDb();

    const categorias = db.prepare(SQL_OBTENER_CATEGORIAS).all(1) as any[];

    return categorias.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      descripcion: row.descripcion ?? null,
      nProductos: Number(row.nProductos ?? 0),
    }));
  }

  export function obtenerStockSucursalSqlite(sucursalId: number) {
    const db = getSqliteDb();

    const stocks = db.prepare(SQL_OBTENER_STOCK_SUCURSAL).all(sucursalId) as any[];

    return stocks.map((row) => ({
      id: Number(row.id),
      productoId: Number(row.productoId),
      sucursalId: Number(row.sucursalId),
      cantidad: Number(row.cantidad ?? 0),
      minimo: Number(row.minimo ?? 0),
      stockReservado: Number(row.stockReservado ?? 0),
      actualizadoEn: row.actualizadoEn,
      producto: {
        id: Number(row.productoId),
        nombre: row.productoNombre,
        codigoBarras: row.codigoBarras ?? null,
        precioVenta: Number(row.precioVenta ?? 0),
        precioConIva: Number(row.precioConIva ?? 0),
        tieneIva: Boolean(row.tieneIva),
        tipoUnidad: row.tipoUnidad ?? 'UND',
        activo: Boolean(row.productoActivo),
        categoria: row.categoriaNombre ? { nombre: row.categoriaNombre } : null,
      },
    }));
  }

  export function obtenerProductosPendientesSqlite() {
    const db = getSqliteDb();
    const pendientes = db.prepare(`
      SELECT payload
      FROM sync_log
      WHERE tabla = ?
        AND operacion = ?
        AND status = ?
      ORDER BY creado_en ASC, id ASC
    `).all('producto', 'CREATE', 'PENDIENTE') as Array<{ payload: string }>;

    const localIds = pendientes
      .map((row) => {
        try {
          const payload = JSON.parse(row.payload);
          return Number(payload.localId ?? payload.id);
        } catch {
          return NaN;
        }
      })
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!localIds.length) return [];

    const placeholders = localIds.map(() => '?').join(', ');
    const productos = db.prepare(`
      SELECT
        id,
        categoria_id AS categoriaId,
        nombre,
        codigo_barras AS codigoBarras,
        tipo_unidad AS tipoUnidad,
        precio_compra AS precioCompra,
        porcentaje_ganancia AS porcentajeGanancia,
        precio_venta AS precioVenta,
        precio_con_iva AS precioConIva,
        tiene_iva AS tieneIva,
        stock_actual AS stockActual,
        stock_minimo AS stockMinimo,
        image_url AS imageUrl,
        activo
      FROM productos
      WHERE activo = ?
        AND id IN (${placeholders})
      ORDER BY nombre ASC
    `).all(1, ...localIds);

    return productos.map((row: any) => ({
      ...productoLocalResponse(row),
      id: -Math.abs(Number(row.id)),
      localId: Number(row.id),
      pendienteSync: true,
    }));
  }

  export function eliminarProductoSqlite(id: number) {
    desactivarProductoSqlite(id);
    logPendienteSqlite('producto', 'DELETE', { id });
  }

  export function desactivarProductoSqlite(id: number) {
    const db = getSqliteDb();

    db.prepare(`
      UPDATE productos
      SET activo = ?
      WHERE id = ?
    `).run(0, id);
  }

  export function obtenerIdsProductosEliminacionPendienteSqlite() {
    const db = getSqliteDb();

    const pendientes = db.prepare(`
      SELECT payload
      FROM sync_log
      WHERE tabla = ?
        AND operacion = ?
        AND status = ?
      ORDER BY creado_en ASC, id ASC
    `).all('producto', 'DELETE', 'PENDIENTE') as Array<{ payload: string }>;

    return pendientes
      .map((row) => {
        try {
          const payload = JSON.parse(row.payload);
          return Number(payload.id);
        } catch {
          return NaN;
        }
      })
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  export function eliminarProductoPendienteSqlite(id: number) {
    const db = getSqliteDb();
    const localId = Math.abs(id);

    const pendiente = db.prepare(`
      SELECT id, payload
      FROM sync_log
      WHERE tabla = ?
        AND operacion = ?
        AND status = ?
      ORDER BY creado_en DESC, id DESC
    `).all('producto', 'CREATE', 'PENDIENTE')
      .find((row: any) => {
        try {
          const payload = JSON.parse(row.payload);
          return Number(payload.localId ?? payload.id) === localId;
        } catch {
          return false;
        }
      }) as { id: number; payload: string } | undefined;

    if (!pendiente) return false;

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE productos
        SET activo = ?
        WHERE id = ?
      `).run(0, localId);

      db.prepare(`
        UPDATE sync_log
        SET status = ?,
            error = NULL,
            sinc_en = datetime('now')
        WHERE id = ?
      `).run('SINCRONIZADO', pendiente.id);
    });

    tx();
    return true;
  }

  export function obtenerPendientesSqlite() {
    const db = getSqliteDb();

    return db.prepare(`
      SELECT
        id,
        tabla,
        operacion,
        payload,
        intentos,
        status
      FROM sync_log
      WHERE status = ?
      ORDER BY creado_en ASC, id ASC
    `).all('PENDIENTE') as SyncQueueItem[];
  }

  export function obtenerRecepcionesSqlite(sucursalId?: number) {
    const db = getSqliteDb();

    const rows = db.prepare(SQL_OBTENER_RECEPCIONES).all(sucursalId ?? null, sucursalId ?? null) as any[];

    return rows.map((row) => ({
      id: Number(row.id),
      total: Number(row.total ?? 0),
      numeroFactura: row.numeroFactura ?? null,
      observaciones: row.observaciones ?? null,
      creadoEn: row.creadoEn,
      proveedor: {
        nombre: row.proveedorNombre ?? 'Proveedor',
      },
      sucursal: {
        nombre: row.sucursalNombre ?? 'Sucursal',
      },
      usuario: row.usuarioId ? { nombre: row.usuarioNombre ?? 'Sin responsable' } : null,
      cantidadItems: Number(row.cantidadItems ?? 0),
      _count: {
        detalles: Number(row.detallesCount ?? 0),
      },
    }));
  }

  export function obtenerRecepcionDetalleSqlite(id: number) {
    const db = getSqliteDb();

    const recepcion = db.prepare(SQL_OBTENER_RECEPCION_HEADER).get(id) as any;

    if (!recepcion) return null;

    const detalles = db.prepare(SQL_OBTENER_DETALLES_RECEPCION).all(id) as any[];

    return {
      id: Number(recepcion.id),
      total: Number(recepcion.total ?? 0),
      numeroFactura: recepcion.numeroFactura ?? null,
      observaciones: recepcion.observaciones ?? null,
      creadoEn: recepcion.creadoEn,
      sucursalId: Number(recepcion.sucursalId),
      proveedor: {
        id: recepcion.proveedorId ? Number(recepcion.proveedorId) : null,
        nombre: recepcion.proveedorNombre ?? 'Proveedor',
        nit: recepcion.proveedorNit ?? null,
        telefono: recepcion.proveedorTelefono ?? null,
        email: recepcion.proveedorEmail ?? null,
        direccion: recepcion.proveedorDireccion ?? null,
      },
      sucursal: {
        nombre: recepcion.sucursalNombre ?? 'Sucursal',
      },
      usuario: recepcion.usuarioId ? { nombre: recepcion.usuarioNombre ?? 'Sin responsable' } : null,
      detalles: detalles.map((detalle) => ({
        id: Number(detalle.id),
        cantidad: Number(detalle.cantidad ?? 0),
        costoUnit: Number(detalle.costoUnit ?? 0),
        subtotal: Number(detalle.subtotal ?? 0),
        producto: {
          nombre: detalle.productoNombre ?? 'Producto',
          tipoUnidad: detalle.tipoUnidad ?? null,
          codigoBarras: detalle.codigoBarras ?? null,
        },
      })),
    };
  }

  export function marcarSincronizado(id: number) {
    const db = getSqliteDb();

    db.prepare(`
      UPDATE sync_log
      SET status = ?,
          error = NULL,
          sinc_en = datetime('now')
      WHERE id = ?
    `).run('SINCRONIZADO', id);
  }

  export function marcarErrorSync(id: number, status: 'PENDIENTE' | 'ERROR' = 'PENDIENTE') {
    const db = getSqliteDb();

    db.prepare(`
      UPDATE sync_log
      SET intentos = intentos + 1,
          status = ?
      WHERE id = ?
    `).run(status, id);
  }

  // DT-05: fuente única de verdad en sqlite.schema.sql; el build lo copia a dist/
  function readSchema() {
    const schemaPaths = [
      path.join(__dirname, 'sqlite.schema.sql'),
      path.resolve(process.cwd(), 'src/adapters/db/sqlite/sqlite.schema.sql'),
      path.join(__dirname, 'schema.sql'),
      path.resolve(process.cwd(), 'src/adapters/db/sqlite/schema.sql'),
    ];

    const schemaPath = schemaPaths.find((candidate) => fs.existsSync(candidate));
    if (schemaPath) return fs.readFileSync(schemaPath, 'utf8');

    throw new Error(
      `[SQLite] No se encontró sqlite.schema.sql. Rutas buscadas:\n${schemaPaths.join('\n')}`,
    );
  }

  function ensureUpdatedAtColumns(db: Database.Database) {
    ensureColumn(db, 'categorias',    'updated_at',     'TEXT');
    ensureColumn(db, 'productos',     'updated_at',     'TEXT');
    ensureColumn(db, 'stock_sucursal','updated_at',     'TEXT');
    ensureColumn(db, 'stock_sucursal','stock_reservado','INTEGER NOT NULL DEFAULT 0');
    ensureColumn(db, 'proveedores',   'updated_at',     'TEXT');       // DT-NUEVA-B
    ensureColumn(db, 'usuarios',      'last_synced_at', 'TEXT');       // T-07F.3
    ensureColumn(db, 'usuarios',      'updated_at',     'TEXT');       // DT-NUEVA-B
    ensureColumn(db, 'productos',     'image_url',      'TEXT');       // T-22.1

    db.prepare(`UPDATE categorias   SET updated_at = datetime('now')                  WHERE updated_at IS NULL`).run();
    db.prepare(`UPDATE productos    SET updated_at = COALESCE(creado_en, datetime('now')) WHERE updated_at IS NULL`).run();
    db.prepare(`UPDATE stock_sucursal SET updated_at = COALESCE(actualizado_en, datetime('now')) WHERE updated_at IS NULL`).run();
    db.prepare(`UPDATE proveedores  SET updated_at = COALESCE(creado_en, datetime('now')) WHERE updated_at IS NULL`).run();
    db.prepare(`UPDATE usuarios     SET updated_at = COALESCE(creado_en, datetime('now')) WHERE updated_at IS NULL`).run();

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS categorias_touch_updated_at
      AFTER UPDATE ON categorias
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE categorias SET updated_at = datetime('now') WHERE id = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS productos_touch_updated_at
      AFTER UPDATE ON productos
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE productos SET updated_at = datetime('now') WHERE id = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS stock_sucursal_touch_updated_at
      AFTER UPDATE ON stock_sucursal
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE stock_sucursal
        SET updated_at = datetime('now'),
            actualizado_en = datetime('now')
        WHERE id = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS proveedores_touch_updated_at
      AFTER UPDATE ON proveedores
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE proveedores SET updated_at = datetime('now') WHERE id = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS usuarios_touch_updated_at
      AFTER UPDATE ON usuarios
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE usuarios SET updated_at = datetime('now') WHERE id = OLD.id;
      END;
    `);
  }

  function ensureColumn(
    db: Database.Database,
    table: string,
    column: string,
    definition: string
  ) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (columns.some((item) => item.name === column)) return;

    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }

  function logPendienteSqlite(
    tabla: string,
    operacion: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: object,
    usuarioId?: number
  ) {
    const db = getSqliteDb();

    const result = db.prepare(`
      INSERT INTO sync_log (tabla, operacion, payload, usuario_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(tabla, operacion, JSON.stringify(payload), usuarioId ?? null, 'PENDIENTE');

    return Number(result.lastInsertRowid);
  }

  function existeSucursalSqlite(db: Database.Database, sucursalId: number) {
    const row = db.prepare(`
      SELECT id
      FROM sucursales
      WHERE id = ?
    `).get(sucursalId);

    return Boolean(row);
  }

  function productoLocalResponse(row: any) {
    return {
      id: Number(row.id),
      categoriaId: row.categoriaId ?? null,
      categoria: row.categoriaId
        ? { id: Number(row.categoriaId), nombre: row.categoriaNombre ?? 'Sin categoria' }
        : null,
      nombre: row.nombre,
      codigoBarras: row.codigoBarras ?? null,
      tipoUnidad: row.tipoUnidad ?? 'UND',
      precioCompra: Number(row.precioCompra ?? 0),
      porcentajeGanancia: Number(row.porcentajeGanancia ?? 0),
      precioVenta: Number(row.precioVenta ?? 0),
      precioConIva: Number(row.precioConIva ?? 0),
      tieneIva: Boolean(row.tieneIva),
      stockActual: Number(row.stockActual ?? 0),
      stockMinimo: Number(row.stockMinimo ?? 0),
      imageUrl: row.imageUrl ?? null,
      activo: Boolean(row.activo),
    };
  }

