// apps/server/src/types/express.d.ts
import { UserRole } from './roles';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        rol: UserRole;
        sucursalId: number;
        email: string;
      };
    }
  }
}