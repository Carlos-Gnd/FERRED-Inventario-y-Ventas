import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { authRoutes }      from './adapters/http/routes/auth.routes';
import { productRoutes }   from './adapters/http/routes/product.routes';
import { inventoryRoutes } from './adapters/http/routes/inventory.routes';
import { saleRoutes }      from './adapters/http/routes/sale.routes';
import { reportRoutes }    from './adapters/http/routes/report.routes';
import { syncRoutes }      from './adapters/http/routes/sync.routes';
import { errorHandler }    from './adapters/http/middleware/errorHandler';
import { jwtMiddleware }   from './adapters/http/middleware/jwtMiddleware';
import { SyncService }     from './adapters/sync/SyncService';

const app = express();
app.use(express.json());

// Rutas públicas
app.use('/auth', authRoutes);

// Rutas protegidas
app.use(jwtMiddleware);
app.use('/products',  productRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/sales',     saleRoutes);
app.use('/reports',   reportRoutes);
app.use('/sync',      syncRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FERRED server running on :${PORT}`));

// Arranca el servicio de sincronización en background
SyncService.start();
