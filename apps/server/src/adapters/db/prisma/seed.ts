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

  for (const u of [
    { codigo: 'UND',    nombre: 'Producto por unidades', descripcion: 'Artículos individuales (martillos, alicates, brochas).' },
    { codigo: 'CAJA',   nombre: 'Cajas',                 descripcion: 'Productos empaquetados en cajas cerradas (cerámica, clavos por caja).' },
    { codigo: 'PAQ',    nombre: 'Paquetes',              descripcion: 'Empaques sellados de múltiples unidades menores.' },
    { codigo: 'BOLSA',  nombre: 'Bolsas',                descripcion: 'Productos empacados en bolsas plásticas o de papel.' },
    { codigo: 'JUEGO',  nombre: 'Juegos o conjuntos',    descripcion: 'Artículos que se venden juntos y funcionan en conjunto (juego de llaves).' },
    { codigo: 'KIT',    nombre: 'Kits',                  descripcion: 'Conjunto de piezas para ensamble o reparación específica.' },
    { codigo: 'PAR',    nombre: 'Pares',                 descripcion: 'Artículos de uso dual (guantes, botas de seguridad).' },
    { codigo: 'SACO',   nombre: 'Sacos',                 descripcion: 'Materiales pesados a granel (cemento, arena, cal).' },
    { codigo: 'TUBO',   nombre: 'Tubos',                 descripcion: 'Piezas cilíndricas estructurales o de fontanería (PVC, hierro).' },
    { codigo: 'ROLLO',  nombre: 'Rollos',                descripcion: 'Materiales continuos enrollados (cables, mangueras, alambre).' },
    { codigo: 'PLACA',  nombre: 'Placas',                descripcion: 'Láminas planas de construcción (tabla yeso, fibrocemento).' },
    { codigo: 'LATA',   nombre: 'Latas',                 descripcion: 'Envases metálicos o plásticos, usualmente para químicos o pinturas.' },
    { codigo: 'DOC',    nombre: 'Docenas',               descripcion: 'Agrupación de 12 unidades (bisagras, tiradores).' },
    { codigo: 'CIEN',   nombre: 'Cientos',               descripcion: 'Agrupación de 100 unidades, venta al por mayor (tornillos, arandelas).' },
    { codigo: 'MIL',    nombre: 'Millares',              descripcion: 'Agrupación de 1000 unidades (ladrillos, bloques).' },
    { codigo: 'M',      nombre: 'Metros',                descripcion: 'Medida de longitud estándar para cortes (cables sueltos, lazos).' },
    { codigo: 'M2',     nombre: 'Metros cuadrados',      descripcion: 'Medida de área para recubrimientos (pisos, láminas de techo).' },
    { codigo: 'PULG',   nombre: 'Pulgadas',              descripcion: 'Medida de longitud o diámetro (madera, tuberías).' },
    { codigo: 'PIE',    nombre: 'Pies',                  descripcion: 'Medida de longitud tradicional (tablas de madera).' },
    { codigo: 'YD',     nombre: 'Yardas',                descripcion: 'Medida de longitud para mallas o zarandas.' },
    { codigo: 'LB',     nombre: 'Libras',                descripcion: 'Medida de peso estándar (clavos a granel, alambre de amarre).' },
    { codigo: 'KG',     nombre: 'Kilogramos',            descripcion: 'Medida de peso métrica (aditivos, pegamentos en polvo).' },
    { codigo: 'GR',     nombre: 'Gramos',                descripcion: 'Medida de peso para cantidades pequeñas (químicos específicos).' },
    { codigo: 'GAL',    nombre: 'Galones',               descripcion: 'Medida de volumen estándar para líquidos (pinturas, solventes).' },
    { codigo: 'LT',     nombre: 'Litros',                descripcion: 'Medida de volumen métrica (impermeabilizantes, lubricantes).' },
    { codigo: 'BARRIL', nombre: 'Barriles',              descripcion: 'Medida de volumen de gran capacidad (selladores industriales, agua).' },
  ]) {
    await prisma.unidadMedida.upsert({ where: { codigo: u.codigo }, update: {}, create: u });
  }
  console.log('✓ 26 unidades de medida');

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
    const hash = await bcrypt.hash(u.pass, 12);
    await prisma.usuario.upsert({
      where: { email: u.email },
      // Forzar actualización del hash para que pnpm db:seed siempre restablezca credenciales
      update: { contrasenaHash: hash, activo: true },
      create: {
        nombre: u.nombre, email: u.email,
        contrasenaHash: hash,
        rol: u.rol, sucursalId: s1.id, activo: true,
      },
    });
  }
  console.log('✓ 3 usuarios\n');

  // T-20.1: Configuracion centralizada del negocio
  const configDefaults = [
    { clave: 'nombre_negocio',   valor: 'FERRED Inventario y Ventas', tipo: 'TEXT' },
    { clave: 'NIT',              valor: '00000000000000',              tipo: 'TEXT' },
    { clave: 'NRC',              valor: '0000000',                     tipo: 'TEXT' },
    { clave: 'banco',            valor: '',                            tipo: 'TEXT' },
    { clave: 'cuenta_bancaria',  valor: '',                            tipo: 'TEXT' },
    { clave: 'titular_cuenta',   valor: '',                            tipo: 'TEXT' },
    { clave: 'correo_remitente', valor: process.env.SMTP_USER ?? '',  tipo: 'TEXT' },
    { clave: 'zonas_envio_json', valor: '[]',                         tipo: 'JSON' },
  ];

  for (const cfg of configDefaults) {
    await prisma.configuracionNegocio.upsert({
      where:  { clave: cfg.clave },
      update: {},
      create: cfg,
    });
  }
  console.log('✓ Configuracion del negocio (8 registros)\n');

  // T-24.1: Tipos de gasto por defecto
  for (const tipo of [
    { nombre: 'Servicios',     descripcion: 'Pagos de agua, luz, internet, teléfono, etc.' },
    { nombre: 'Sueldos',       descripcion: 'Pago de salarios y planilla de empleados.' },
    { nombre: 'Transporte',    descripcion: 'Gastos de combustible, fletes y envíos.' },
    { nombre: 'Mantenimiento', descripcion: 'Reparaciones y mantenimiento de equipos e instalaciones.' },
    { nombre: 'Otros',         descripcion: 'Gastos varios no clasificados en otras categorías.' },
  ]) {
    await prisma.tipoGasto.upsert({ where: { nombre: tipo.nombre }, update: {}, create: tipo });
  }
  console.log('✓ 5 tipos de gasto\n');

  console.log('✅ Listo. Credenciales:');
  console.log('   admin@ferred.com  / admin123');
  console.log('   cajero@ferred.com / cajero123');
  console.log('   bodega@ferred.com / bodega123');
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());