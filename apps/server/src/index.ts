import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// Construir DATABASE_URL desde BRANCH_ID
const branchId = process.env.BRANCH_ID || '1';
process.env.DATABASE_URL = `file:../../data/ferred_branch${branchId}.db`;

import { authRoutes }      from './adapters/http/routes/auth.routes';
import { usuarioRoutes }   from './adapters/http/routes/usuario.routes';
import { productRoutes }   from './adapters/http/routes/product.routes';
import { inventoryRoutes } from './adapters/http/routes/inventory.routes';
import { saleRoutes }      from './adapters/http/routes/sale.routes';
import { reportRoutes }    from './adapters/http/routes/report.routes';
import { syncRoutes }      from './adapters/http/routes/sync.routes';
import { errorHandler }    from './adapters/http/middleware/errorHandler';
import { jwtMiddleware }   from './adapters/http/middleware/jwtMiddleware';
import { SyncService }     from './adapters/sync/SyncService';

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Rutas públicas
app.use('/auth', authRoutes);

// Rutas protegidas
app.use(jwtMiddleware);
app.use('/usuarios',  usuarioRoutes);
app.use('/productos', productRoutes);
app.use('/products',  productRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/sales',     saleRoutes);
app.use('/reports',   reportRoutes);
app.use('/sync',      syncRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Sucursal activa: ${branchId}`);
});

// Arranca el servicio de sincronización en background
SyncService.start();
