import dotenv from 'dotenv';
import path from 'path';

// Cargar .env primero
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Construir DATABASE_URL con ruta ABSOLUTA basada en __dirname
// __dirname = .../apps/server/src  → subir 3 niveles llega a ferred/
const branchId = process.env.BRANCH_ID || '1';
const dbPath = path.resolve(__dirname, '..', '..', '..', 'data', `ferred_branch${branchId}.db`);
process.env.DATABASE_URL = `file:${dbPath}`;

console.log(`🗄️  DATABASE_URL: file:${dbPath}`);

import express from 'express';
import cors from 'cors';
import { authRoutes }       from './adapters/http/routes/auth.routes';
import { usuarioRoutes }    from './adapters/http/routes/usuario.routes';
import { categoriaRoutes }  from './adapters/http/routes/categoria.routes';
import { productoRoutes }   from './adapters/http/routes/producto.routes';
import { inventarioRoutes } from './adapters/http/routes/inventario.routes';
import { errorMiddleware }  from './adapters/http/middleware/error.middleware';
import { jwtMiddleware }    from './adapters/http/middleware/jwt.middleware';
import { SyncService }      from './adapters/sync/sync.service';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Rutas públicas
app.use('/api/auth', authRoutes);
app.get('/health', (_req, res) => res.json({ ok: true, branch: branchId }));

// Rutas protegidas (requieren JWT)
app.use(jwtMiddleware);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',  productoRoutes);
app.use('/api/inventario', inventarioRoutes);

// Manejo global de errores
app.use(errorMiddleware);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ Servidor FERRED corriendo en http://localhost:${PORT}`);
  console.log(`📦 Sucursal activa: ${branchId}`);
  console.log(`🗄️  BD: ferred_branch${branchId}.db`);
});

SyncService.start();