-- Migration: add_unidades_medida
-- Crea la tabla de unidades de medida y la conecta como FK en productos.

-- Eliminar el check constraint previo que limitaba tipo_unidad a 5 valores
ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "productos_tipo_unidad_check";

CREATE TABLE "unidades_medida" (
  "codigo"      TEXT NOT NULL,
  "nombre"      TEXT NOT NULL,
  "descripcion" TEXT,
  "activo"      BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("codigo")
);

INSERT INTO "unidades_medida" ("codigo", "nombre", "descripcion") VALUES
  ('UND',   'Producto por unidades',  'Artículos individuales (martillos, alicates, brochas).'),
  ('CAJA',  'Cajas',                  'Productos empaquetados en cajas cerradas (cerámica, clavos por caja).'),
  ('PAQ',   'Paquetes',               'Empaques sellados de múltiples unidades menores.'),
  ('BOLSA', 'Bolsas',                 'Productos empacados en bolsas plásticas o de papel.'),
  ('JUEGO', 'Juegos o conjuntos',     'Artículos que se venden juntos y funcionan en conjunto (juego de llaves).'),
  ('KIT',   'Kits',                   'Conjunto de piezas para ensamble o reparación específica.'),
  ('PAR',   'Pares',                  'Artículos de uso dual (guantes, botas de seguridad).'),
  ('SACO',  'Sacos',                  'Materiales pesados a granel (cemento, arena, cal).'),
  ('TUBO',  'Tubos',                  'Piezas cilíndricas estructurales o de fontanería (PVC, hierro).'),
  ('ROLLO', 'Rollos',                 'Materiales continuos enrollados (cables, mangueras, alambre).'),
  ('PLACA', 'Placas',                 'Láminas planas de construcción (tabla yeso, fibrocemento).'),
  ('LATA',  'Latas',                  'Envases metálicos o plásticos, usualmente para químicos o pinturas.'),
  ('DOC',   'Docenas',                'Agrupación de 12 unidades (bisagras, tiradores).'),
  ('CIEN',  'Cientos',                'Agrupación de 100 unidades, venta al por mayor (tornillos, arandelas).'),
  ('MIL',   'Millares',               'Agrupación de 1000 unidades (ladrillos, bloques).'),
  ('M',     'Metros',                 'Medida de longitud estándar para cortes (cables sueltos, lazos).'),
  ('M2',    'Metros cuadrados',       'Medida de área para recubrimientos (pisos, láminas de techo).'),
  ('PULG',  'Pulgadas',               'Medida de longitud o diámetro (madera, tuberías).'),
  ('PIE',   'Pies',                   'Medida de longitud tradicional (tablas de madera).'),
  ('YD',    'Yardas',                 'Medida de longitud para mallas o zarandas.'),
  ('LB',    'Libras',                 'Medida de peso estándar (clavos a granel, alambre de amarre).'),
  ('KG',    'Kilogramos',             'Medida de peso métrica (aditivos, pegamentos en polvo).'),
  ('GR',    'Gramos',                 'Medida de peso para cantidades pequeñas (químicos específicos).'),
  ('GAL',   'Galones',                'Medida de volumen estándar para líquidos (pinturas, solventes).'),
  ('LT',    'Litros',                 'Medida de volumen métrica (impermeabilizantes, lubricantes).'),
  ('BARRIL','Barriles',               'Medida de volumen de gran capacidad (selladores industriales, agua).');

-- Mapear el código legacy más común antes de agregar la FK
UPDATE "productos" SET "tipo_unidad" = 'UND'  WHERE "tipo_unidad" = 'UNIDAD';
UPDATE "productos" SET "tipo_unidad" = NULL
  WHERE "tipo_unidad" IS NOT NULL
  AND "tipo_unidad" NOT IN (
    SELECT codigo FROM unidades_medida
  );

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_tipo_unidad_fkey"
  FOREIGN KEY ("tipo_unidad")
  REFERENCES "unidades_medida"("codigo")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
