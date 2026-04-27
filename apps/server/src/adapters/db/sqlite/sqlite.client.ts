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
      data.tipoUnidad ?? 'UNIDAD',
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

    // Usamos el formato de log más completo (el de Nelson) para la sincronización
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
      tipoUnidad: data.tipoUnidad ?? 'UNIDAD',
      precioCompra: data.precioCompra ?? 0,
      porcentajeGanancia: data.porcentajeGanancia ?? 0,
      precioVenta: data.precioVenta ?? 0,
      precioConIva: data.precioConIva ?? 0,
      tieneIva: Boolean(data.tieneIva ?? true),
      stockActual: data.stockActual ?? 0,
      stockMinimo: data.stockMinimo ?? 0,
      activo: true,
    });
  }

  export function obtenerProductosSqlite() {
    const db = getSqliteDb();

    const productos = db.prepare(`
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
        p.activo
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = ?
      ORDER BY p.nombre ASC
    `).all(1);

    return productos.map(productoLocalResponse);
  }

  export function obtenerCategoriasSqlite() {
    const db = getSqliteDb();

    const categorias = db.prepare(`
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
    `).all(1) as any[];

    return categorias.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      descripcion: row.descripcion ?? null,
      nProductos: Number(row.nProductos ?? 0),
    }));
  }

  export function obtenerStockSucursalSqlite(sucursalId: number) {
    const db = getSqliteDb();

    const stocks = db.prepare(`
      SELECT
        ss.id,
        ss.producto_id AS productoId,
        ss.sucursal_id AS sucursalId,
        ss.cantidad,
        ss.minimo,
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
    `).all(sucursalId) as any[];

    return stocks.map((row) => ({
      id: Number(row.id),
      productoId: Number(row.productoId),
      sucursalId: Number(row.sucursalId),
      cantidad: Number(row.cantidad ?? 0),
      minimo: Number(row.minimo ?? 0),
      actualizadoEn: row.actualizadoEn,
      producto: {
        id: Number(row.productoId),
        nombre: row.productoNombre,
        codigoBarras: row.codigoBarras ?? null,
        precioVenta: Number(row.precioVenta ?? 0),
        precioConIva: Number(row.precioConIva ?? 0),
        tieneIva: Boolean(row.tieneIva),
        tipoUnidad: row.tipoUnidad ?? 'UNIDAD',
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

    const rows = db.prepare(`
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
        COUNT(d.id) AS detallesCount
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
    `).all(sucursalId ?? null, sucursalId ?? null) as any[];

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
      _count: {
        detalles: Number(row.detallesCount ?? 0),
      },
    }));
  }

  export function obtenerRecepcionDetalleSqlite(id: number) {
    const db = getSqliteDb();

    const recepcion = db.prepare(`
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
    `).get(id) as any;

    if (!recepcion) return null;

    const detalles = db.prepare(`
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
    `).all(id) as any[];

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

  function readSchema() {
    const schemaPaths = [
      path.join(__dirname, 'sqlite.schema.sql'),
      path.resolve(process.cwd(), 'src/adapters/db/sqlite/sqlite.schema.sql'),
      path.join(__dirname, 'schema.sql'),
      path.resolve(process.cwd(), 'src/adapters/db/sqlite/schema.sql'),
    ];

    const schemaPath = schemaPaths.find((candidate) => fs.existsSync(candidate));
    if (schemaPath) return fs.readFileSync(schemaPath, 'utf8');

    return SQLITE_SCHEMA;
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
      tipoUnidad: row.tipoUnidad ?? 'UNIDAD',
      precioCompra: Number(row.precioCompra ?? 0),
      porcentajeGanancia: Number(row.porcentajeGanancia ?? 0),
      precioVenta: Number(row.precioVenta ?? 0),
      precioConIva: Number(row.precioConIva ?? 0),
      tieneIva: Boolean(row.tieneIva),
      stockActual: Number(row.stockActual ?? 0),
      stockMinimo: Number(row.stockMinimo ?? 0),
      activo: Boolean(row.activo),
    };
  }

  const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS sucursales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    rol TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER,
    nombre TEXT NOT NULL,
    codigo_barras TEXT UNIQUE,
    tipo_unidad TEXT NOT NULL DEFAULT 'UNIDAD',
    precio_compra REAL NOT NULL DEFAULT 0,
    porcentaje_ganancia REAL NOT NULL DEFAULT 0,
    precio_venta REAL NOT NULL DEFAULT 0,
    precio_con_iva REAL NOT NULL DEFAULT 0,
    tiene_iva INTEGER NOT NULL DEFAULT 1,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_sucursal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
    cantidad INTEGER NOT NULL DEFAULT 0,
    minimo INTEGER NOT NULL DEFAULT 0,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(producto_id, sucursal_id)
  );

  CREATE TABLE IF NOT EXISTS facturas_dte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sucursal_id INTEGER,
    usuario_id INTEGER,
    codigo_generacion TEXT UNIQUE,
    numero_control TEXT UNIQUE,
    tipo_dte TEXT NOT NULL DEFAULT '01',
    cliente_nombre TEXT NOT NULL DEFAULT 'Consumidor Final',
    total_sin_iva REAL NOT NULL DEFAULT 0,
    iva REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    dte_json TEXT,
    estado TEXT NOT NULL DEFAULT 'SIMULADO',
    sincronizado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS detalles_venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER NOT NULL REFERENCES facturas_dte(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL,
    precio_unit REAL NOT NULL,
    subtotal REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nit TEXT UNIQUE,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recepciones_mercancia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
    sucursal_id INTEGER NOT NULL,
    usuario_id INTEGER,
    numero_factura TEXT,
    total REAL NOT NULL DEFAULT 0,
    observaciones TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS detalles_recepcion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recepcion_id INTEGER NOT NULL REFERENCES recepciones_mercancia(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad REAL NOT NULL,
    costo_unit REAL NOT NULL,
    subtotal REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla TEXT NOT NULL,
    operacion TEXT NOT NULL,
    payload TEXT NOT NULL,
    usuario_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    intentos INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    sinc_en TEXT
  );
  `;
