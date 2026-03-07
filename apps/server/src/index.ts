import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// DATABASE_URL viene del .env — no sobreescribir
const branchId = process.env.BRANCH_ID || '1';

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

app.use('/api/auth', authRoutes);
app.get('/health', (_req, res) => res.json({ ok: true, branch: branchId }));

app.use(jwtMiddleware);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',  productoRoutes);
app.use('/api/inventario', inventarioRoutes);

app.use(errorMiddleware);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ Servidor FERRED corriendo en http://localhost:${PORT}`);
  console.log(`📦 Sucursal activa: ${branchId}`);
  console.log(`🗄️  DB: ${process.env.DATABASE_URL?.substring(0, 40)}...`);
});

SyncService.start();