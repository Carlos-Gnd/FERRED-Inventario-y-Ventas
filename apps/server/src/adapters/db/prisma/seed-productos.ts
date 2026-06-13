/**
 * Seed de catálogo de productos reales de ferretería (El Salvador, precios en USD).
 *
 *   pnpm --filter server db:seed:productos
 *
 * Idempotente: hace upsert por `codigoBarras`, así se puede correr varias veces sin duplicar.
 * Autosuficiente: asegura categorías, unidades de medida y al menos una sucursal antes de
 * insertar productos y su stock por sucursal.
 *
 * Cada producto incluye `caracteristicas` (Json) con atributos según su tipo:
 * marca, color, tamaño/medida, voltaje, potencia, peso, material, diámetro, calibre, etc.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Categorías (mismas 6 del seed principal) ──────────────────────────────────
const CATEGORIAS = [
  { nombre: 'Herramientas Eléctricas', descripcion: 'Taladros, esmeriles, sierras' },
  { nombre: 'Ferretería General',      descripcion: 'Tornillos, clavos, bisagras' },
  { nombre: 'Pinturas y Acabados',     descripcion: 'Vinilos, esmaltes, brochas' },
  { nombre: 'Plomería',                descripcion: 'Tubería PVC, cobre, grifería' },
  { nombre: 'Electricidad',            descripcion: 'Cables, breakers, tomacorrientes' },
  { nombre: 'Construcción',            descripcion: 'Cemento, arena, block' },
] as const;

// ── Unidades de medida usadas (subconjunto del seed principal; FK de tipoUnidad) ──
const UNIDADES = [
  { codigo: 'UND',   nombre: 'Producto por unidades' },
  { codigo: 'CAJA',  nombre: 'Cajas' },
  { codigo: 'GAL',   nombre: 'Galones' },
  { codigo: 'LT',    nombre: 'Litros' },
  { codigo: 'SACO',  nombre: 'Sacos' },
  { codigo: 'TUBO',  nombre: 'Tubos' },
  { codigo: 'ROLLO', nombre: 'Rollos' },
  { codigo: 'M',     nombre: 'Metros' },
  { codigo: 'LB',    nombre: 'Libras' },
  { codigo: 'PAR',   nombre: 'Pares' },
  { codigo: 'JUEGO', nombre: 'Juegos o conjuntos' },
  { codigo: 'CIEN',  nombre: 'Cientos' },
] as const;

type CatNombre = (typeof CATEGORIAS)[number]['nombre'];

interface SeedProducto {
  nombre: string;
  cat:    CatNombre;
  uni:    string;
  compra: number;   // precio de compra USD
  margen: number;   // % de ganancia sobre el costo
  stock:  number;   // stock por sucursal
  min:    number;   // stock mínimo
  ecom?:  boolean;  // disponible en ecommerce
  caract?: Record<string, string>; // marca, color, voltaje, peso, etc.
}

const PRODUCTOS: SeedProducto[] = [
  // ── Herramientas Eléctricas ─────────────────────────────────────────────────
  { nombre: 'Taladro percutor 1/2" 600W',          cat: 'Herramientas Eléctricas', uni: 'UND', compra: 28,  margen: 35, stock: 25, min: 5, ecom: true,
    caract: { marca: 'Truper', voltaje: '120V', potencia: '600W', mandril: '1/2"', velocidad: '0-3000 rpm', peso: '1.8 kg', color: 'Azul' } },
  { nombre: 'Esmeril angular 4-1/2" 750W',          cat: 'Herramientas Eléctricas', uni: 'UND', compra: 32,  margen: 32, stock: 20, min: 5, ecom: true,
    caract: { marca: 'Bauker', voltaje: '120V', potencia: '750W', disco: '4-1/2"', velocidad: '11000 rpm', peso: '1.9 kg', color: 'Verde/Negro' } },
  { nombre: 'Sierra circular 7-1/4" 1400W',         cat: 'Herramientas Eléctricas', uni: 'UND', compra: 55,  margen: 30, stock: 12, min: 3, ecom: true,
    caract: { marca: 'Makita', voltaje: '120V', potencia: '1400W', disco: '7-1/4"', velocidad: '5000 rpm', peso: '3.9 kg', color: 'Azul' } },
  { nombre: 'Lijadora orbital 1/4 de hoja',         cat: 'Herramientas Eléctricas', uni: 'UND', compra: 24,  margen: 35, stock: 15, min: 4,
    caract: { marca: 'Truper', voltaje: '120V', potencia: '200W', hoja: '1/4', peso: '1.3 kg', color: 'Azul' } },
  { nombre: 'Caladora 500W velocidad variable',     cat: 'Herramientas Eléctricas', uni: 'UND', compra: 30,  margen: 33, stock: 14, min: 4,
    caract: { marca: 'Bauker', voltaje: '120V', potencia: '500W', velocidad: 'Variable', peso: '2.1 kg', color: 'Verde' } },
  { nombre: 'Atornillador inalámbrico 12V',         cat: 'Herramientas Eléctricas', uni: 'UND', compra: 38,  margen: 33, stock: 18, min: 4, ecom: true,
    caract: { marca: 'DeWalt', voltaje: '12V', bateria: 'Li-Ion', torque: '30 Nm', peso: '1.0 kg', color: 'Amarillo/Negro' } },
  { nombre: 'Rotomartillo SDS-Plus 800W',           cat: 'Herramientas Eléctricas', uni: 'UND', compra: 65,  margen: 28, stock: 10, min: 3, ecom: true,
    caract: { marca: 'Bosch', voltaje: '120V', potencia: '800W', impacto: '2.7 J', peso: '2.8 kg', color: 'Azul' } },
  { nombre: 'Compresor de aire 25L 2HP',            cat: 'Herramientas Eléctricas', uni: 'UND', compra: 120, margen: 25, stock: 6,  min: 2,
    caract: { marca: 'Truper', voltaje: '120V', potencia: '2HP', tanque: '25L', presion: '115 psi', peso: '24 kg', color: 'Rojo' } },

  // ── Ferretería General ──────────────────────────────────────────────────────
  { nombre: 'Tornillo para madera 1" (ciento)',     cat: 'Ferretería General', uni: 'CIEN', compra: 1.2, margen: 60, stock: 80, min: 15,
    caract: { material: 'Acero', acabado: 'Zincado', medida: '1" x #8', cabeza: 'Plana', color: 'Plata' } },
  { nombre: 'Clavo de acero 2-1/2"',                cat: 'Ferretería General', uni: 'LB',   compra: 0.8, margen: 55, stock: 150, min: 25,
    caract: { material: 'Acero', longitud: '2-1/2"', acabado: 'Pulido', color: 'Plata' } },
  { nombre: 'Bisagra de libro 3"',                  cat: 'Ferretería General', uni: 'PAR',  compra: 0.9, margen: 55, stock: 60, min: 12,
    caract: { material: 'Acero', tamaño: '3"', acabado: 'Niquelado', color: 'Plata' } },
  { nombre: 'Candado de bronce 40mm',               cat: 'Ferretería General', uni: 'UND',  compra: 3.5, margen: 45, stock: 40, min: 8, ecom: true,
    caract: { marca: 'Yale', material: 'Bronce', ancho: '40 mm', llaves: '3', color: 'Dorado' } },
  { nombre: 'Cerradura de pomo para puerta',        cat: 'Ferretería General', uni: 'UND',  compra: 8,   margen: 40, stock: 25, min: 5, ecom: true,
    caract: { marca: 'Phillips', material: 'Acero/Latón', acabado: 'Satinado', color: 'Níquel' } },
  { nombre: 'Tornillo punta broca 1"',              cat: 'Ferretería General', uni: 'CIEN', compra: 2,   margen: 50, stock: 70, min: 15,
    caract: { material: 'Acero', acabado: 'Zincado', medida: '1" x #8', color: 'Plata' } },
  { nombre: 'Cinta métrica 5m',                     cat: 'Ferretería General', uni: 'UND',  compra: 3,   margen: 50, stock: 45, min: 10, ecom: true,
    caract: { marca: 'Stanley', longitud: '5 m', anchoCinta: '19 mm', carcasa: 'ABS', color: 'Amarillo' } },
  { nombre: 'Juego de llaves combinadas 8 piezas',  cat: 'Ferretería General', uni: 'JUEGO',compra: 14,  margen: 35, stock: 20, min: 4, ecom: true,
    caract: { marca: 'Truper', material: 'Cromo vanadio', piezas: '8', medidas: '8-19 mm', color: 'Plata' } },
  { nombre: 'Martillo de uña 16oz',                 cat: 'Ferretería General', uni: 'UND',  compra: 5.5, margen: 45, stock: 35, min: 8, ecom: true,
    caract: { marca: 'Stanley', peso: '16 oz', mango: 'Fibra de vidrio', color: 'Amarillo/Negro' } },
  { nombre: 'Pegamento epóxico 2 componentes',      cat: 'Ferretería General', uni: 'UND',  compra: 2.5, margen: 50, stock: 50, min: 10,
    caract: { contenido: '2 x 12 ml', tipo: '2 componentes', secado: '5 min', color: 'Transparente' } },

  // ── Pinturas y Acabados ─────────────────────────────────────────────────────
  { nombre: 'Pintura vinílica blanca (galón)',      cat: 'Pinturas y Acabados', uni: 'GAL', compra: 12,  margen: 35, stock: 40, min: 8, ecom: true,
    caract: { marca: 'Sherwin Williams', color: 'Blanco', contenido: '1 gal', acabado: 'Mate', rendimiento: '30-40 m²', base: 'Agua' } },
  { nombre: 'Esmalte anticorrosivo negro (galón)',  cat: 'Pinturas y Acabados', uni: 'GAL', compra: 15,  margen: 35, stock: 30, min: 6, ecom: true,
    caract: { marca: 'Glidden', color: 'Negro', contenido: '1 gal', acabado: 'Brillante', base: 'Aceite' } },
  { nombre: 'Thinner estándar (galón)',             cat: 'Pinturas y Acabados', uni: 'GAL', compra: 7,   margen: 40, stock: 35, min: 8,
    caract: { contenido: '1 gal', tipo: 'Estándar', color: 'Transparente' } },
  { nombre: 'Brocha 3" cerda natural',              cat: 'Pinturas y Acabados', uni: 'UND', compra: 1.8, margen: 55, stock: 60, min: 12, ecom: true,
    caract: { tamaño: '3"', cerda: 'Natural', mango: 'Madera', color: 'Café' } },
  { nombre: 'Rodillo de felpa 9" con mango',        cat: 'Pinturas y Acabados', uni: 'UND', compra: 3,   margen: 50, stock: 45, min: 10, ecom: true,
    caract: { tamaño: '9"', material: 'Felpa', mango: 'Plástico', color: 'Blanco' } },
  { nombre: 'Sellador acrílico para pared (galón)', cat: 'Pinturas y Acabados', uni: 'GAL', compra: 10,  margen: 35, stock: 28, min: 6,
    caract: { color: 'Blanco', contenido: '1 gal', base: 'Agua', acabado: 'Mate' } },
  { nombre: 'Lija de agua #220',                    cat: 'Pinturas y Acabados', uni: 'UND', compra: 0.4, margen: 60, stock: 200, min: 30,
    caract: { grano: '220', dimensiones: '23 x 28 cm', color: 'Negro' } },
  { nombre: 'Spray esmalte negro mate 400ml',       cat: 'Pinturas y Acabados', uni: 'UND', compra: 3.2, margen: 45, stock: 55, min: 10, ecom: true,
    caract: { marca: 'Rust-Oleum', color: 'Negro', contenido: '400 ml', acabado: 'Mate' } },

  // ── Plomería ────────────────────────────────────────────────────────────────
  { nombre: 'Tubo PVC 1/2" x 6m',                   cat: 'Plomería', uni: 'TUBO', compra: 2.8, margen: 40, stock: 60, min: 12,
    caract: { marca: 'Amanco', material: 'PVC', diametro: '1/2"', longitud: '6 m', presion: '315 psi', color: 'Blanco' } },
  { nombre: 'Codo PVC 1/2" x 90°',                  cat: 'Plomería', uni: 'UND',  compra: 0.25,margen: 70, stock: 200, min: 40,
    caract: { material: 'PVC', diametro: '1/2"', angulo: '90°', color: 'Blanco' } },
  { nombre: 'Llave de chorro 1/2" bronce',          cat: 'Plomería', uni: 'UND',  compra: 4.5, margen: 45, stock: 40, min: 8, ecom: true,
    caract: { material: 'Bronce', diametro: '1/2"', color: 'Dorado' } },
  { nombre: 'Cinta teflón 1/2"',                    cat: 'Plomería', uni: 'UND',  compra: 0.3, margen: 70, stock: 150, min: 30,
    caract: { material: 'PTFE', ancho: '1/2"', longitud: '10 m', color: 'Blanco' } },
  { nombre: 'Tee PVC 3/4"',                         cat: 'Plomería', uni: 'UND',  compra: 0.4, margen: 65, stock: 120, min: 25,
    caract: { material: 'PVC', diametro: '3/4"', color: 'Blanco' } },
  { nombre: 'Pegamento PVC 1/4 de galón',           cat: 'Plomería', uni: 'LT',   compra: 5,   margen: 45, stock: 35, min: 8,
    caract: { marca: 'Tangit', contenido: '1/4 gal', color: 'Transparente' } },
  { nombre: 'Llave de paso 1/2"',                   cat: 'Plomería', uni: 'UND',  compra: 6,   margen: 40, stock: 30, min: 6,
    caract: { material: 'Bronce', diametro: '1/2"', color: 'Dorado' } },
  { nombre: 'Manguera de abasto flexible 1/2"',     cat: 'Plomería', uni: 'UND',  compra: 2.5, margen: 50, stock: 50, min: 10, ecom: true,
    caract: { longitud: '50 cm', material: 'Acero trenzado', conexion: '1/2"', color: 'Plata' } },
  { nombre: 'Sifón flexible para lavamanos',        cat: 'Plomería', uni: 'UND',  compra: 3,   margen: 50, stock: 40, min: 8,
    caract: { material: 'Polipropileno', diametro: '1-1/4"', color: 'Blanco' } },

  // ── Electricidad ─────────────────────────────────────────────────────────────
  { nombre: 'Cable THHN #12 (por metro)',           cat: 'Electricidad', uni: 'M',     compra: 0.45,margen: 40, stock: 500, min: 80,
    caract: { calibre: '12 AWG', material: 'Cobre', voltaje: '600V', color: 'Negro' } },
  { nombre: 'Breaker enchufable 20A',               cat: 'Electricidad', uni: 'UND',   compra: 4,   margen: 45, stock: 45, min: 10, ecom: true,
    caract: { marca: 'Square D', amperaje: '20A', voltaje: '120/240V', polos: '1', color: 'Negro' } },
  { nombre: 'Tomacorriente doble polarizado',       cat: 'Electricidad', uni: 'UND',   compra: 1.5, margen: 50, stock: 80, min: 15, ecom: true,
    caract: { voltaje: '125V', amperaje: '15A', color: 'Blanco' } },
  { nombre: 'Interruptor sencillo',                 cat: 'Electricidad', uni: 'UND',   compra: 1.2, margen: 55, stock: 90, min: 18,
    caract: { voltaje: '120V', amperaje: '15A', color: 'Blanco' } },
  { nombre: 'Foco LED 9W luz blanca',               cat: 'Electricidad', uni: 'UND',   compra: 1.8, margen: 55, stock: 120, min: 25, ecom: true,
    caract: { marca: 'Sylvania', potencia: '9W', voltaje: '120V', temperatura: '6500K', base: 'E27', color: 'Luz blanca' } },
  { nombre: 'Cinta aislante negra',                 cat: 'Electricidad', uni: 'UND',   compra: 0.8, margen: 60, stock: 150, min: 30,
    caract: { marca: '3M', ancho: '18 mm', longitud: '10 m', voltaje: '600V', color: 'Negro' } },
  { nombre: 'Caja rectangular EMT',                 cat: 'Electricidad', uni: 'UND',   compra: 0.6, margen: 60, stock: 100, min: 20,
    caract: { material: 'Acero', medida: '2 x 4"', color: 'Gris' } },
  { nombre: 'Rollo de cable TSJ 2x12 (100m)',       cat: 'Electricidad', uni: 'ROLLO', compra: 55,  margen: 30, stock: 10, min: 2,
    caract: { calibre: '12 AWG', conductores: '2', longitud: '100 m', voltaje: '600V', color: 'Negro' } },
  { nombre: 'Portalámpara de baquelita',            cat: 'Electricidad', uni: 'UND',   compra: 0.9, margen: 55, stock: 70, min: 15,
    caract: { material: 'Baquelita', base: 'E27', voltaje: '250V', color: 'Blanco' } },

  // ── Construcción ──────────────────────────────────────────────────────────────
  { nombre: 'Cemento gris 42.5kg',                  cat: 'Construcción', uni: 'SACO', compra: 7.5, margen: 20, stock: 100, min: 20,
    caract: { marca: 'CESSA', peso: '42.5 kg', tipo: 'Portland', color: 'Gris' } },
  { nombre: 'Arena fina (saco 25kg)',               cat: 'Construcción', uni: 'SACO', compra: 2,   margen: 40, stock: 120, min: 25,
    caract: { peso: '25 kg', tipo: 'Fina', color: 'Beige' } },
  { nombre: 'Block de concreto 15x20x40',           cat: 'Construcción', uni: 'UND',  compra: 0.55,margen: 45, stock: 400, min: 80,
    caract: { dimensiones: '15 x 20 x 40 cm', material: 'Concreto', color: 'Gris' } },
  { nombre: 'Varilla corrugada 3/8" x 6m',          cat: 'Construcción', uni: 'UND',  compra: 4.2, margen: 30, stock: 90, min: 18,
    caract: { diametro: '3/8"', longitud: '6 m', material: 'Acero', grado: '40' } },
  { nombre: 'Cal hidratada 25kg',                   cat: 'Construcción', uni: 'SACO', compra: 4,   margen: 35, stock: 60, min: 12,
    caract: { peso: '25 kg', tipo: 'Hidratada', color: 'Blanco' } },
  { nombre: 'Lámina galvanizada acanalada 12\'',    cat: 'Construcción', uni: 'UND',  compra: 14,  margen: 30, stock: 50, min: 10,
    caract: { longitud: '12 pies', material: 'Acero galvanizado', calibre: '26', color: 'Plata' } },
  { nombre: 'Alambre de amarre',                    cat: 'Construcción', uni: 'LB',   compra: 0.9, margen: 45, stock: 200, min: 40,
    caract: { material: 'Acero recocido', calibre: '16', color: 'Gris' } },
  { nombre: 'Pega cerámica 25kg',                   cat: 'Construcción', uni: 'SACO', compra: 6,   margen: 30, stock: 70, min: 14,
    caract: { marca: 'Bondex', peso: '25 kg', tipo: 'Adhesivo', color: 'Gris' } },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log('🌱 Sembrando catálogo de productos FERRED...\n');

  // 1) Categorías → mapa nombre→id
  const catId = new Map<string, number>();
  for (const c of CATEGORIAS) {
    const row = await prisma.categoria.upsert({ where: { nombre: c.nombre }, update: {}, create: c });
    catId.set(c.nombre, row.id);
  }
  console.log(`✓ ${CATEGORIAS.length} categorías`);

  // 2) Unidades de medida usadas (FK de Producto.tipoUnidad)
  for (const u of UNIDADES) {
    await prisma.unidadMedida.upsert({ where: { codigo: u.codigo }, update: {}, create: u });
  }
  console.log(`✓ ${UNIDADES.length} unidades de medida`);

  // 3) Asegurar al menos una sucursal y obtener todas
  await prisma.sucursal.upsert({
    where: { id: 1 }, update: {},
    create: { nombre: 'Sucursal Central', direccion: 'Av. Principal #101', telefono: '2222-0001' },
  });
  const sucursales = await prisma.sucursal.findMany({ select: { id: true } });
  console.log(`✓ ${sucursales.length} sucursal(es) para stock`);

  // 4) Productos + stock por sucursal
  let creados = 0;
  for (let i = 0; i < PRODUCTOS.length; i++) {
    const p = PRODUCTOS[i];
    const categoriaId = catId.get(p.cat)!;
    const codigoBarras = (7400000000001 + i).toString(); // 13 dígitos, único por índice
    const precioVenta  = round2(p.compra * (1 + p.margen / 100));
    const precioConIva = round2(precioVenta * 1.13);

    const data = {
      categoriaId,
      nombre:             p.nombre,
      tipoUnidad:         p.uni,
      precioCompra:       p.compra,
      porcentajeGanancia: p.margen,
      precioVenta,
      precioConIva,
      tieneIva:           true,
      stockActual:        p.stock,
      stockMinimo:        p.min,
      activo:             true,
      disponibleEcommerce: p.ecom ?? false,
      caracteristicas:    p.caract ?? undefined,
    };

    const producto = await prisma.producto.upsert({
      where:  { codigoBarras },
      update: data,
      create: { ...data, codigoBarras },
    });

    for (const s of sucursales) {
      await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId: producto.id, sucursalId: s.id } },
        update: { cantidad: p.stock, minimo: p.min },
        create: { productoId: producto.id, sucursalId: s.id, cantidad: p.stock, minimo: p.min },
      });
    }
    creados++;
  }

  console.log(`✓ ${creados} productos con stock en ${sucursales.length} sucursal(es)\n`);
  console.log('✅ Catálogo sembrado.');
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
