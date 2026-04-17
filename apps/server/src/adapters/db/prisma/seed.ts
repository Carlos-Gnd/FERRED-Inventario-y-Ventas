import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// DATABASE_URL no se imprime para evitar filtrar credenciales en logs

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos FERRED...\n');

  const s1 = await prisma.sucursal.upsert({
    where: { id: 1 }, update: {},
    create: { nombre: 'Sucursal Central', direccion: 'Av. Principal #101', telefono: '2222-0001' },
  });
  const s2 = await prisma.sucursal.upsert({
    where: { id: 2 }, update: {},
    create: { nombre: 'Sucursal Norte', direccion: 'Calle Norte #205', telefono: '2222-0002' },
  });
  console.log('✓ Sucursales:', s1.nombre, '/', s2.nombre);

  for (const cat of [
    { nombre: 'Herramientas Eléctricas', descripcion: 'Taladros, esmeriles, sierras' },
    { nombre: 'Ferretería General',      descripcion: 'Tornillos, clavos, bisagras' },
    { nombre: 'Pinturas y Acabados',     descripcion: 'Vinilos, esmaltes, brochas' },
    { nombre: 'Plomería',                descripcion: 'Tubería PVC, cobre, grifería' },
    { nombre: 'Electricidad',            descripcion: 'Cables, breakers, tomacorrientes' },
    { nombre: 'Construcción',            descripcion: 'Cemento, arena, block' },
  ]) {
    await prisma.categoria.upsert({ where: { nombre: cat.nombre }, update: {}, create: cat });
  }
  console.log('✓ 6 categorías');

  const seedUsers = [
    {
      nombre: process.env.SEED_ADMIN_NAME  ?? 'Alex Johnson',
      email:  process.env.SEED_ADMIN_EMAIL ?? 'admin@ferred.com',
      pass:   process.env.SEED_ADMIN_PASS  ?? 'admin123',
      rol:    'ADMIN',
    },
    {
      nombre: process.env.SEED_CAJERO_NAME  ?? 'María Soto',
      email:  process.env.SEED_CAJERO_EMAIL ?? 'cajero@ferred.com',
      pass:   process.env.SEED_CAJERO_PASS  ?? 'cajero123',
      rol:    'CAJERO',
    },
    {
      nombre: process.env.SEED_BODEGA_NAME  ?? 'Roberto Peña',
      email:  process.env.SEED_BODEGA_EMAIL ?? 'bodega@ferred.com',
      pass:   process.env.SEED_BODEGA_PASS  ?? 'bodega123',
      rol:    'BODEGA',
    },
  ];

  for (const u of seedUsers) {
    await prisma.usuario.upsert({
      where: { email: u.email }, update: {},
      create: {
        nombre: u.nombre, email: u.email,
        contrasenaHash: await bcrypt.hash(u.pass, 12),
        rol: u.rol, sucursalId: s1.id,
      },
    });
  }
  console.log('✓ 3 usuarios\n');
  console.log('✅ Listo. Credenciales:');
  console.log('   admin@ferred.com  / admin123');
  console.log('   cajero@ferred.com / cajero123');
  console.log('   bodega@ferred.com / bodega123');
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());