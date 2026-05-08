export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  category: string;
  brand: string;
  description: string;
  specs?: string[];
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Taladro Inalámbrico Profesional 20V',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
    stock: 15,
    category: 'Herramientas Eléctricas',
    brand: 'DeWalt',
    description: 'Taladro inalámbrico de alto rendimiento con batería de litio 20V, ideal para trabajos profesionales.',
    specs: ['20V de potencia', 'Batería de litio incluida', 'Chuck de 13mm', 'Velocidad variable']
  },
  {
    id: '2',
    name: 'Martillo de Carpintero Premium',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500',
    stock: 28,
    category: 'Herramientas Manuales',
    brand: 'Stanley',
    description: 'Martillo de carpintero con mango ergonómico y cabeza de acero templado.',
    specs: ['Mango de fibra de vidrio', 'Peso 450g', 'Cabeza de acero templado']
  },
  {
    id: '3',
    name: 'Sierra Circular 7 1/4"',
    price: 189.99,
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500',
    stock: 8,
    category: 'Herramientas Eléctricas',
    brand: 'Makita',
    description: 'Sierra circular de alta precisión para cortes profesionales en madera.',
    specs: ['Hoja de 7 1/4 pulgadas', '1800W de potencia', 'Guía láser', 'Base de aluminio']
  },
  {
    id: '4',
    name: 'Juego de Destornilladores 12 Piezas',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500',
    stock: 42,
    category: 'Herramientas Manuales',
    brand: 'Stanley',
    description: 'Set completo de destornilladores profesionales con mangos ergonómicos.',
    specs: ['12 piezas', 'Puntas magnéticas', 'Mangos bi-material', 'Estuche incluido']
  },
  {
    id: '5',
    name: 'Pintura Látex Interior Premium 4L',
    price: 44.99,
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500',
    stock: 35,
    category: 'Pinturas',
    brand: 'Sherwin Williams',
    description: 'Pintura látex de alta cobertura para interiores, acabado mate.',
    specs: ['4 litros', 'Rendimiento 40m²', 'Secado rápido', 'Bajo olor']
  },
  {
    id: '6',
    name: 'Cable Eléctrico Calibre 12 AWG 100m',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=500',
    stock: 22,
    category: 'Electricidad',
    brand: 'Condumex',
    description: 'Cable de cobre para instalaciones eléctricas residenciales y comerciales.',
    specs: ['Calibre 12 AWG', '100 metros', 'Conductor de cobre', 'Certificado NOM']
  },
  {
    id: '7',
    name: 'Cemento Portland Gris 50kg',
    price: 12.99,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
    stock: 150,
    category: 'Construcción',
    brand: 'Cemex',
    description: 'Cemento de alta resistencia para todo tipo de construcciones.',
    specs: ['Saco de 50kg', 'Tipo CPO', 'Alta resistencia', 'Fraguado normal']
  },
  {
    id: '8',
    name: 'Llave Inglesa Ajustable 12"',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1613486033085-a302fc0ee8d4?w=500',
    stock: 18,
    category: 'Fontanería',
    brand: 'Truper',
    description: 'Llave ajustable de acero cromo vanadio para trabajos de fontanería.',
    specs: ['12 pulgadas', 'Acero cromo vanadio', 'Mandíbula cromada', 'Mango ergonómico']
  }
];

export const categories = [
  { id: 'herramientas-electricas', name: 'Herramientas Eléctricas', icon: 'Drill' },
  { id: 'herramientas-manuales', name: 'Herramientas Manuales', icon: 'Hammer' },
  { id: 'pinturas', name: 'Pinturas', icon: 'Paintbrush' },
  { id: 'electricidad', name: 'Electricidad', icon: 'Zap' },
  { id: 'construccion', name: 'Construcción', icon: 'HardHat' },
  { id: 'fontaneria', name: 'Fontanería', icon: 'Wrench' }
];
