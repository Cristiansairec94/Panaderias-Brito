const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer variables desde .env.local
let url = 'https://yaxqevvvoluaqanspqqf.supabase.co';
let key = 'sb_publishable_3XTqXPSLsMF6xJ-x2VBCZg_mM9FvVgw';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim();
    });
  }
} catch (e) {}

const client = createClient(url, key);

const DEFAULT_PRODUCTS = [
  {
    id: "prod-1",
    code: "PAN-001",
    barcode: "7501000100019",
    name: "Concha de Vainilla",
    price: 12,
    category: "pan_dulce",
    icon: "🥖",
    stock: 50,
    description: "Esponjosa y suave con costra crujiente de azúcar y vainilla natural.",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-2",
    code: "PAN-002",
    barcode: "7501000100026",
    name: "Concha de Chocolate",
    price: 12,
    category: "pan_dulce",
    icon: "🍫",
    stock: 40,
    description: "Masa fina aromatizada con cacao selecto y cubierta crujiente chocolatosa.",
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-3",
    code: "PAN-003",
    barcode: "7501000100033",
    name: "Cuerno de Mantequilla",
    price: 15,
    category: "pan_dulce",
    icon: "🥐",
    stock: 30,
    description: "Hojaldre 100% mantequilla pura de vaca, dorado y crujiente por capas.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-4",
    code: "BLA-001",
    barcode: "7501000100040",
    name: "Bolillo Tradicional",
    price: 5,
    category: "pan_blanco",
    icon: "🍞",
    stock: 150,
    description: "Corteza dorada crujiente y migajón esponjoso, horneado en piso de piedra.",
    image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-5",
    code: "BLA-002",
    barcode: "7501000100057",
    name: "Telera para Torta",
    price: 6,
    category: "pan_blanco",
    icon: "🥪",
    stock: 100,
    description: "Pan suave y dorado en tres secciones, el clásico para tortas mexicanas.",
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-6",
    code: "PAN-004",
    barcode: "7501000100064",
    name: "Oreja Hojaldrada",
    price: 14,
    category: "pan_dulce",
    icon: "🥨",
    stock: 35,
    description: "Hojaldre finamente caramelizado al horno con mantequilla y azúcar.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-7",
    code: "PAN-005",
    barcode: "7501000100071",
    name: "Dona Glaseada",
    price: 13,
    category: "pan_dulce",
    icon: "🍩",
    stock: 30,
    description: "Masa esponjada frita a punto exacto con glaseado clásico brillante.",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-8",
    code: "PAS-001",
    barcode: "7501000100088",
    name: "Rebanada Pastel 3 Leches",
    price: 45,
    category: "pasteleria",
    icon: "🍰",
    stock: 20,
    description: "Bizcocho húmedo bañado en infusión de tres leches y fresa fresca.",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-9",
    code: "PAS-002",
    barcode: "7501000100095",
    name: "Pay de Queso con Zarzamora",
    price: 40,
    category: "pasteleria",
    icon: "🥧",
    stock: 15,
    description: "Base crujiente de galleta con suave crema de queso y zarzamora silvestre.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-10",
    code: "BEB-001",
    barcode: "7501000100101",
    name: "Café de Olla Caliente",
    price: 25,
    category: "bebidas",
    icon: "☕",
    stock: 60,
    description: "Café de grano selecto colado con canela criolla y toque de piloncillo.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
    has_iva: true,
    iva_rate: 16,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-11",
    code: "BEB-002",
    barcode: "7501000100118",
    name: "Chocolate Caliente con Leche",
    price: 30,
    category: "bebidas",
    icon: "🍫",
    stock: 40,
    description: "Tablelilla artesanal espumada en jarra con leche entera caliente.",
    image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80",
    has_iva: true,
    iva_rate: 16,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-12",
    code: "TEM-001",
    barcode: "7501000100125",
    name: "Empanada de Calabaza",
    price: 18,
    category: "temporada",
    icon: "🥟",
    stock: 25,
    description: "Horneada al punto con relleno artesanal de dulce de calabaza y canela.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: true,
    ieps_rate: 8,
    tax_included: true,
    unit: "pieza",
    is_active: true
  },
  {
    id: "prod-13",
    code: "AB-001",
    barcode: "7501000100132",
    name: "Leche Entera 1L",
    price: 28,
    category: "abarrotes",
    icon: "🥛",
    stock: 40,
    unit: "pieza",
    description: "Leche pasteurizada entera fresca de primera calidad.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    is_active: true
  },
  {
    id: "prod-14",
    code: "MP-001",
    barcode: "7501000100149",
    name: "Harina de Trigo San Antonio 1kg",
    price: 22,
    category: "materia_prima",
    icon: "🌾",
    stock: 80,
    unit: "kg",
    description: "Harina de trigo de alta fuerza ideal para panificación tradicional.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80",
    has_iva: false,
    iva_rate: 0,
    has_ieps: false,
    ieps_rate: 0,
    tax_included: true,
    is_active: true
  }
];

async function seed() {
  console.log('Sembrando catálogo de productos en Supabase...');
  for (const prod of DEFAULT_PRODUCTS) {
    const { error } = await client.from('products').upsert(prod, { onConflict: 'id' });
    if (error) {
      console.log(`❌ Error al sembrar ${prod.name}:`, error.message);
    } else {
      console.log(`✅ Producto registrado: ${prod.name} ($${prod.price} MXN)`);
    }
  }
  console.log('\n¡Catálogo de productos sembrado exitosamente en Supabase!');
}

seed();
