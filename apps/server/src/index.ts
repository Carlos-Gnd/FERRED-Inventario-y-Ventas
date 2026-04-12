import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv   from 'dotenv';
import path     from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { authRoutes }       from './adapters/http/routes/auth.routes';
import { usuarioRoutes }    from './adapters/http/routes/usuario.routes';
import { categoriaRoutes }  from './adapters/http/routes/categoria.routes';
import { productoRoutes }   from './adapters/http/routes/producto.routes';
import { inventarioRoutes } from './adapters/http/routes/inventario.routes';
import { ventasRoutes }     from './adapters/http/routes/ventas.routes';
import { errorMiddleware }  from './adapters/http/middleware/error.middleware';
import { jwtMiddleware }    from './adapters/http/middleware/jwt.middleware';
import { SyncService }      from './adapters/sync/sync.service';

const app = express();
const branchId = process.env.BRANCH_ID || '1';

app.use(helmet());

const ALLOWED_ORIGINS = [
  'https://ferred.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

const loginLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Demasiados intentos de inicio de sesión. Intentá de nuevo en 1 minuto.' },
});

app.use('/api/auth', loginLimiter, authRoutes);
app.get('/health', (_req, res) => res.json({ ok: true, branch: branchId }));

app.use(jwtMiddleware);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',  productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas',     ventasRoutes);

app.use(errorMiddleware);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ Servidor FERRED en http://localhost:${PORT}`);
  console.log(`📦 Sucursal: ${branchId}`);
});

SyncService.start();