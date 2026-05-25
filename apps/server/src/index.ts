import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv   from 'dotenv';
import path     from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { AlertasService } from './adapters/alertas/alertas.service';
import { authRoutes }       from './adapters/http/routes/auth.routes';
import { ecommerceAuthRoutes } from './adapters/http/routes/ecommerce-auth.routes';
import { usuarioRoutes }    from './adapters/http/routes/usuario.routes';
import { categoriaRoutes }  from './adapters/http/routes/categoria.routes';
import { productoRoutes }   from './adapters/http/routes/producto.routes';
import { ofertaRoutes }     from './adapters/http/routes/oferta.routes';
import { inventarioRoutes } from './adapters/http/routes/inventario.routes';
import { ventasRoutes }     from './adapters/http/routes/ventas.routes';
import { dteRoutes }        from './adapters/http/routes/dte.routes';
import { proveedorRoutes }  from './adapters/http/routes/proveedor.routes';
import { cajaRoutes } from './adapters/http/routes/caja.routes';
import { gastosRoutes, tiposGastoRoutes } from './adapters/http/routes/gastos.routes';
import { pagosRoutes }      from './adapters/http/routes/pagos.routes';
import { pagosOnlineRoutes } from './adapters/http/routes/pagos-online.routes';
import {
  pedidosOnlinePublicRoutes,
  pedidosOnlineRoutes,
  productosPublicosRoutes,
  zonasEnvioPublicRoutes,
} from './adapters/http/routes/pedidos-online.routes';
import { errorMiddleware }  from './adapters/http/middleware/error.middleware';
import { jwtMiddleware }    from './adapters/http/middleware/jwt.middleware';
import { SyncService }      from './adapters/sync/sync.service';
import { SnapshotService }  from './adapters/sync/snapshot.service';
import { syncRoutes }           from './adapters/http/routes/sync.routes';
import { reportesRoutes }       from './adapters/http/routes/reportes.routes';
import { stripeWebhookRoutes }  from './adapters/http/routes/webhook.routes';
import { ajustesRoutes }        from './adapters/http/routes/ajustes.routes';
import { initSqlite }           from './adapters/db/sqlite/sqlite.client';
import { contarPendientes }     from './adapters/sync/sync.local';

try { initSqlite(); } catch (e) { console.warn('[sqlite] Modo offline no disponible:', (e as Error).message); }

const app = express();
const branchId = process.env.BRANCH_ID || '1';

app.use(helmet());

// T-19.3: El webhook de Stripe necesita el body SIN parsear para verificar la firma.
// Debe montarse ANTES de express.json() — de lo contrario la verificación de firma falla.
app.use('/api/pagos/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

const ALLOWED_ORIGINS = [
  'https://ferred.netlify.app',
  'https://tienda-ferred.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5176',
  'null', // Electron renderer en producción (file:// origin)
];

app.use(cors({
  origin: (origin, callback) => {
    const effectiveOrigin = origin ?? 'null';
    if (ALLOWED_ORIGINS.includes(effectiveOrigin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

const loginLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Demasiados intentos de inicio de sesión. Intentá de nuevo en 1 minuto.' },
});

const apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Demasiadas solicitudes. Intentá de nuevo en 1 minuto.' },
});

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/ecommerce/auth', loginLimiter, ecommerceAuthRoutes);
app.get('/health', (_req, res) => res.json({ ok: true }));
// T-18: servir imágenes subidas (uploads/productos/)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/zonas-envio', zonasEnvioPublicRoutes);
app.use('/api/productos', productosPublicosRoutes);
app.use('/api/pedidos-online', pedidosOnlinePublicRoutes);
app.use('/api/pedidos-online', apiLimiter, pagosOnlineRoutes);
app.use('/api/pagos', apiLimiter, pagosRoutes);

app.use(jwtMiddleware);
app.use(apiLimiter);
app.get('/sync/pendientes-local', (_req, res) => res.json(contarPendientes()));
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',  productoRoutes);
app.use('/api/ofertas',    ofertaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas',     ventasRoutes);
app.use('/api/caja',        cajaRoutes);
app.use('/api/gastos',      gastosRoutes);
app.use('/api/tipos-gasto', tiposGastoRoutes);
app.use('/api/dte',        dteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/sync',       syncRoutes);
app.use('/api/reportes',   reportesRoutes);
app.use('/api/ajustes',   ajustesRoutes);
app.use('/api/pedidos-online', pedidosOnlineRoutes);

app.use(errorMiddleware);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Servidor FERRED en http://localhost:${PORT} — sucursal ${branchId}`);
  }
});

SyncService.start();
AlertasService.start();
SnapshotService.start(Number(branchId));
