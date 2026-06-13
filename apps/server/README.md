# `@ferred/server` — Backend API de FERRED

API REST y motor de sincronización offline-first del sistema FERRED (punto de venta
y gestión de inventario multi-sucursal para ferretería). Construido con **Express +
TypeScript** sobre una arquitectura **hexagonal**, con **Prisma → Postgres (Supabase)**
en la nube y **better-sqlite3 → SQLite local** por sucursal para operar sin internet.

> Documentación de cierre — módulo *server*. Responsable: **Carlos Granados**.
> Para la visión del monorepo completo ver el `README.md` y los `CLAUDE.md` de la raíz.

---

## 1. Responsabilidad del módulo

El server es el **composition root** del backend. Concentra:

- Autenticación (JWT) y autorización por rol y por sucursal.
- CRUD de los agregados de dominio (productos, categorías, inventario, ventas,
  proveedores, recepciones, cajas, gastos, ofertas, usuarios).
- Emisión de **Documentos Tributarios Electrónicos (DTE)** al Ministerio de Hacienda SV.
- Tienda en línea (pedidos, clientes ecommerce, pagos con Stripe).
- El **motor de sincronización offline ↔ online**: cola de pendientes en SQLite,
  drenaje contra Postgres y snapshot inverso Postgres → SQLite.
- Jobs en segundo plano: alertas de stock bajo por correo.

---

## 2. Topología en runtime

```
Electron main.js ──fork()──►  Express (este módulo) ──Prisma──►  Postgres (Supabase)
       │                            │
       │                            └──better-sqlite3──►  SQLite local (ferred_branch{BRANCH_ID}.db)
       │
       └──BrowserWindow──►  Renderer (React/Vite) ──axios /api──►  Express
```

- **Dev**: los tres procesos corren por separado. El server debe estar levantado en
  `:3001` *antes* de abrir Electron (`wait-on` no lo arranca).
- **Electron empaquetado**: `main.js` hace `fork()` de `dist/index.js` con
  `SQLITE_PATH` apuntando a `userData/ferred_branch{BRANCH_ID}.db`.
- **Producción web** (Railway): solo Postgres; SQLite no se usa.

---

## 3. Estructura del código (`src/`)

```
src/
├── index.ts                       Composition root: middlewares, rutas, arranque de jobs.
├── config/
│   └── env.ts                     Única fuente de verdad de variables de entorno (lanza si faltan).
├── types/
│   ├── roles.ts                   UserRole = 'ADMIN' | 'CAJERO' | 'BODEGA' (importar siempre de aquí).
│   └── express.d.ts               Extiende Request con `req.usuario`.
└── adapters/                      (puertos/adaptadores — hexagonal)
    ├── http/
    │   ├── routes/                Un router por agregado (auth, productos, ventas, dte, …).
    │   ├── middleware/            jwt · role · sucursal.guard · error · cliente-auth.
    │   └── services/              jwt · pagos · pedidos-online · stock-sync.
    ├── db/
    │   ├── prisma/                Cliente Prisma (Postgres) + seed.
    │   └── sqlite/                Cliente better-sqlite3 + sqlite.schema.sql.
    ├── sync/                      Motor offline: sync.service · sync.local · sync-operation-handler
    │                              · sync-connectivity · offline-cache · snapshot.service.
    ├── dte/                       Emisión DTE a Hacienda (sandbox).
    ├── alertas/                   Job de stock bajo.
    ├── email/                     Nodemailer (modo simulado si faltan SMTP_*).
    └── payment/                   Stripe.
```

---

## 4. Puesta en marcha

Todos los comandos `pnpm` se ejecutan desde la **raíz del monorepo**
(`Ferred-proyect/`); existe un único `.env` compartido por server + electron.

```bash
pnpm install
pnpm db:generate          # genera el cliente Prisma
pnpm db:setup             # migraciones + seed contra Postgres
pnpm dev:server           # Express en :3001 (tsx watch)
```

Scripts propios de este paquete (ejecutar con `pnpm --filter server <script>`):

| Script             | Acción                                                        |
| ------------------ | ------------------------------------------------------------- |
| `dev`              | `tsx watch src/index.ts`                                      |
| `build`            | `tsc` + copia de `sqlite.schema.sql` a `dist/`                |
| `start`            | `node dist/index.js` (producción)                             |
| `prisma:migrate`   | nueva migración contra Postgres                               |
| `prisma:push`      | sincroniza schema sin migración formal                        |
| `prisma:studio`    | GUI sobre la BD apuntada por `DATABASE_URL`                   |
| `db:seed`          | siembra usuarios y datos base                                 |

Usuarios de prueba (seed): `admin@ferred.com / admin123`,
`cajero@ferred.com / cajero123`, `bodega@ferred.com / bodega123`.

> **No hay test runner configurado.** La verificación es manual por flujo (login,
> productos, ventas, recepción, sync offline↔online).

---

## 5. Variables de entorno

Centralizadas y validadas en `src/config/env.ts` (lanza al arrancar si falta una requerida).

**Requeridas:** `JWT_SECRET`, `CRYPTO_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, y un secreto ecommerce
(`JWT_ECOMMERCE_SECRET` o `ECOMMERCE_SECRET`).

**Opcionales:** `BRANCH_ID` (default `1`), `SQLITE_PATH`, `PORT` (default `3001`),
`NODE_ENV`, `CORS_ORIGINS`, `OFFLINE_AUTH_MAX_DAYS` (default `30`),
`DTE_*` (sandbox Hacienda), `SMTP_*` (sin ellas → correo en modo simulado),
`STRIPE_PUBLISHABLE_KEY`.

`BRANCH_ID` determina qué SQLite local se usa: `data/ferred_branch{BRANCH_ID}.db`.

---

## 6. Pipeline de la app (`index.ts`)

El orden de los middlewares es **deliberado** y no debe alterarse a la ligera:

1. `helmet()` — cabeceras de seguridad.
2. **Webhook de Stripe** con `express.raw()` montado **antes** de `express.json()`
   (la firma se verifica sobre el body crudo).
3. `cors()` con allowlist explícita (+ `CORS_ORIGINS` desde env).
4. `express.json({ limit: '100kb' })`.
5. Rate limiters: login `10/min`, API general `100/min`.
6. Rutas **públicas** (no requieren JWT): `/api/auth`, `/api/ecommerce/auth`,
   `/health`, `/uploads`, catálogo y pedidos públicos del ecommerce, pagos.
7. `jwtMiddleware` **global** — a partir de aquí todo exige `Authorization: Bearer`.
8. Rutas de dominio protegidas.
9. `errorMiddleware` (siempre al final).
10. `app.listen()` y arranque de jobs: `SyncService`, `AlertasService`, `SnapshotService`.

---

## 7. Patrón de escritura offline-first (CRÍTICO)

Toda mutación de dominio sigue este patrón doble para que la app funcione 100% sin
internet y reconcilie al volver:

1. **Escribir en SQLite local** (helpers `crear*Sqlite`, etc.).
2. **`logPendiente(tabla, operacion, payload, usuarioId)`** — escribe SIEMPRE en el
   `sync_log` de SQLite y, si `SyncService.isOnline()`, además crea el `SyncLog` en Postgres.
3. **Si online, escribir también vía Prisma** para que la nube quede al día de inmediato.

### Drenaje de pendientes (`sync.service.ts`)

`SyncService` corre un loop cada **30 s**: `checkConnectivity()` (`SELECT 1` contra
Postgres, con tolerancia de 3 fallos antes de declararse offline) y, si hay red,
`pushPendientes()` aplica cada operación con `aplicarOperacion(tabla, op, payload)`.

`aplicarOperacion` (`sync-operation-handler.ts`):
- Solo acepta tablas en `TABLAS_PERMITIDAS`.
- Filtra cada payload contra `CAMPOS_ESCALARES[tabla]` (allowlist por nombre **Prisma
  camelCase**, no snake_case).
- `producto` tiene un path especial (`crearProductoDesdePendiente`): hace `upsert`
  por `codigoBarras` y crea/actualiza `stockSucursal` en una sola operación.

### Snapshot inverso (`snapshot.service.ts`)

Sincroniza **Postgres → SQLite** cada 5 min: `bootstrapSnapshot` (carga completa) o
`refreshSnapshot` (delta incremental por `updatedAt`). Incluye los hashes de
contraseña para permitir **login offline** (validado contra `OFFLINE_AUTH_MAX_DAYS`).

### `OfflineCache`

Caché en memoria con TTL de 5 min; se invalida con `clear()` cuando se drenan pendientes.

---

## 8. Seguridad y multi-sucursal

- **JWT** lleva `{ id, rol, sucursalId, email }`; `jwtMiddleware` lo popula en `req.usuario`.
- **`roleMiddleware('ADMIN', …)`** restringe por rol dentro de cada ruta.
- **`sucursal.guard.ts`** — autorización cross-sucursal **fail-closed**: ADMIN bypassa;
  un no-ADMIN sin sucursal asignada → `403`. Dos formas:
  `assertSameSucursal(req, res, id)` (manual) o `sucursalGuard('sucursalId')` (middleware).
  Toda ruta que toca un recurso por sucursal debe usar una de las dos.
- **Errores**: `next(err)` al `errorMiddleware` central; nunca se devuelve el stack
  al cliente en producción.

---

## 9. Base de datos

- **Postgres (Supabase)** — fuente de verdad en la nube. Schema en
  `prisma/schema.prisma`; migraciones en `prisma/migrations/`. El cliente
  (`prisma.client.ts`) es singleton y desactiva *prepared statements* por pgBouncer.
- **SQLite local** — réplica por sucursal. Schema en `sqlite/sqlite.schema.sql`,
  ejecutado al boot (`initSqlite()`, WAL + FK on).

> ⚠️ **Las dos schemas se mantienen a mano.** Al agregar una columna o tabla hay que
> tocar `schema.prisma`, `sqlite.schema.sql` **y** la allowlist `CAMPOS_ESCALARES`
> en `sync-operation-handler.ts`. Un campo ausente de la allowlist **no falla**: el
> sync lo descarta silenciosamente. Probar el roundtrip offline→online al cambiar columnas.

---

## 10. Convenciones

- **Idioma**: todo en español — mensajes, comentarios e identificadores de dominio en
  camelCase español (`precioVenta`, `codigoBarras`, `sucursalId`).
- **Naming Prisma**: modelos `PascalCase`, tablas `@@map('snake_case_plural')`,
  campos camelCase con `@map('snake_case')`. SQLite usa snake_case directo.
- **Roles**: importar `UserRole` desde `types/roles.ts`; nunca hardcodear strings.
- **Comentarios `BUG-XXX` / `DT-XX`**: apuntan a hallazgos de auditoría en
  `../../Auditorias/`. No se quitan sin cerrar el hallazgo.

---

## 11. Trampas conocidas

- **Schemas duplicados** (ver §9) — el sync silencioso es la consecuencia más cara.
- **`.env` único** en la raíz del monorepo, no en `apps/server/`. `env.ts` busca
  primero `process.cwd()/.env` y luego `../../.env`.
- **better-sqlite3** es nativo: en Linux requiere `build-essential` y `python3`.
- **`pnpm dev:electron`** falla si el server o el renderer no están corriendo.
- **Webhook de Stripe**: debe ir antes de `express.json()` o la firma falla.
```
