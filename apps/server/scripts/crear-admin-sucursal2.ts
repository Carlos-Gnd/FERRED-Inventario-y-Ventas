// Crea (o restablece) un usuario ADMIN de pruebas en la sucursal 2.
// Idempotente: upsert por email. Hashea igual que el seed (bcryptjs, 12 rounds).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const sucursal = await prisma.sucursal.findUnique({ where: { id: 2 } });
  if (!sucursal) throw new Error('La sucursal 2 no existe — creala antes o ajustá el sucursalId.');

  const hash = await bcrypt.hash('admin123', 12);
  const user = await prisma.usuario.upsert({
    where:  { email: 'admin2@ferred.com' },
    update: { contrasenaHash: hash, rol: 'ADMIN', sucursalId: 2, activo: true, nombre: 'Admin Sucursal 2' },
    create: { email: 'admin2@ferred.com', contrasenaHash: hash, rol: 'ADMIN', sucursalId: 2, activo: true, nombre: 'Admin Sucursal 2' },
  });

  console.log('Usuario ADMIN listo:', {
    id: user.id, email: user.email, rol: user.rol, sucursalId: user.sucursalId, sucursal: sucursal.nombre,
  });
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('Error:', e.message); await prisma.$disconnect(); process.exit(1); });
