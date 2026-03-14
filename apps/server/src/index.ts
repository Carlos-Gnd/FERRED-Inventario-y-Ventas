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
import { errorMiddleware }  from './adapters/http/middleware/error.middleware';
import { jwtMiddleware }    from './adapters/http/middleware/jwt.middleware';
import { SyncService }      from './adapters/sync/sync.service';

const app = express();
const branchId = process.env.BRANCH_ID || '1';

// Helmet configura headers de seguridad HTTP automáticamente
// Sin esto el browser queda expuesto a clickjacking, MIME sniffing, etc.
app.use(helmet());

// CORS restringido a dominios conocidos
const ALLOWED_ORIGINS = [
  'https://ferred.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origen (Electron, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido → ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// Rate limiting en login
const loginLimiter = rateLimit({
  windowMs:        60 * 1000, // ventana de 1 minuto
  max:             10,        // máximo 10 intentos por IP
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Demasiados intentos de inicio de sesión. Intentá de nuevo en 1 minuto.' },
});

// Rutas públicas
app.use('/api/auth', loginLimiter, authRoutes); // limiter solo sobre auth
app.get('/health', (_req, res) => res.json({ ok: true, branch: branchId }));

// Rutas protegidas con JWT
app.use(jwtMiddleware);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',  productoRoutes);
app.use('/api/inventario', inventarioRoutes);

app.use(errorMiddleware);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ Servidor FERRED en http://localhost:${PORT}`);
  console.log(`📦 Sucursal: ${branchId}`);
});

SyncService.start();