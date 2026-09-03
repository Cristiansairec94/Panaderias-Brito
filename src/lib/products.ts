import { Product } from "@/types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Concha de Vainilla",
    price: 12,
    category: "pan_dulce",
    icon: "🥖",
    stock: 50,
    tag: "Tradicional",
    description: "Esponjosa y suave con costra crujiente de azúcar y vainilla natural.",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-2",
    name: "Concha de Chocolate",
    price: 12,
    category: "pan_dulce",
    icon: "🍫",
    stock: 40,
    tag: "Favorito",
    description: "Masa fina aromatizada con cacao selecto y cubierta crujiente chocolatosa.",
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-3",
    name: "Cuerno de Mantequilla",
    price: 15,
    category: "pan_dulce",
    icon: "🥐",
    stock: 30,
    tag: "Artesanal",
    description: "Hojaldre 100% mantequilla pura de vaca, dorado y crujiente por capas.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-4",
    name: "Bolillo Tradicional",
    price: 5,
    category: "pan_blanco",
    icon: "🍞",
    stock: 150,
    tag: "Recién Salido",
    description: "Corteza dorada crujiente y migajón esponjoso, horneado en piso de piedra.",
    image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-5",
    name: "Telera para Torta",
    price: 6,
    category: "pan_blanco",
    icon: "🥪",
    stock: 100,
    tag: "De la Casa",
    description: "Pan suave y dorado en tres secciones, el clásico para tortas mexicanas.",
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-6",
    name: "Oreja Hojaldrada",
    price: 14,
    category: "pan_dulce",
    icon: "🥨",
    stock: 35,
    tag: "Crujiente",
    description: "Hojaldre finamente caramelizado al horno con mantequilla y azúcar.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-7",
    name: "Dona Glaseada",
    price: 13,
    category: "pan_dulce",
    icon: "🍩",
    stock: 30,
    tag: "Más Vendido",
    description: "Masa esponjada frita a punto exacto con glaseado clásico brillante.",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-8",
    name: "Rebanada Pastel 3 Leches",
    price: 45,
    category: "pasteleria",
    icon: "🍰",
    stock: 20,
    tag: "Gourmet",
    description: "Bizcocho húmedo bañado en infusión de tres leches y fresa fresca.",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-9",
    name: "Pay de Queso con Zarzamora",
    price: 40,
    category: "pasteleria",
    icon: "🥧",
    stock: 15,
    tag: "Especialidad",
    description: "Base crujiente de galleta con suave crema de queso y zarzamora silvestre.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-10",
    name: "Café de Olla Caliente",
    price: 25,
    category: "bebidas",
    icon: "☕",
    stock: 60,
    tag: "Calientito",
    description: "Café de grano selecto colado con canela criolla y toque de piloncillo.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-11",
    name: "Chocolate Caliente con Leche",
    price: 30,
    category: "bebidas",
    icon: "🍫",
    stock: 40,
    tag: "Tradición",
    description: "Tablelilla artesanal espumada en jarra con leche entera caliente.",
    image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-12",
    name: "Empanada de Calabaza",
    price: 18,
    category: "temporada",
    icon: "🥟",
    stock: 25,
    tag: "Rellena",
    description: "Horneada al punto con relleno artesanal de dulce de calabaza y canela.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-13",
    name: "Leche Entera 1L",
    price: 28,
    category: "abarrotes",
    icon: "🥛",
    stock: 40,
    unit: "pieza",
    tag: "Abarrote",
    description: "Leche pasteurizada entera fresca de primera calidad.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-14",
    name: "Harina de Trigo San Antonio 1kg",
    price: 22,
    category: "materia_prima",
    icon: "🌾",
    stock: 80,
    unit: "kg",
    tag: "Insumo",
    description: "Harina de trigo de alta fuerza ideal para panificación tradicional.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  }
];

export const PRODUCT_CATEGORIES = [
  { id: "all", label: "Todas las Categorías", priceTag: "", icon: "🧺" },
  { id: "pan_dulce", label: "Pan Dulce Tradicional", priceTag: "", icon: "🥖" },
  { id: "pan_blanco", label: "Bolillo & Telera", priceTag: "", icon: "🍞" },
  { id: "pasteleria", label: "Pastelería & Pays", priceTag: "", icon: "🍰" },
  { id: "bebidas", label: "Cafetería & Bebidas", priceTag: "", icon: "☕" },
  { id: "temporada", label: "Especiales de Temporada", priceTag: "", icon: "✨" },
  { id: "abarrotes", label: "Abarrotes", priceTag: "", icon: "🥫" },
  { id: "materia_prima", label: "Materia Prima", priceTag: "", icon: "🌾" },
];

const STORAGE_KEY = "brito_products_v5";

export function getStoredProducts(): Product[] {
  if (typeof window === "undefined") {
    return DEFAULT_PRODUCTS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.some(p => p.id === "prod-1")) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return parsed;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event("brito_products_updated"));
  } catch (err) {
    console.error("Error saving products:", err);
  }
}

export function updateProductStock(id: string, newStock: number): void {
  const current = getStoredProducts();
  const updated = current.map((p) => (p.id === id ? { ...p, stock: Math.max(0, newStock) } : p));
  saveStoredProducts(updated);
}

export function updateProductPrice(id: string, newPrice: number): void {
  const current = getStoredProducts();
  const updated = current.map((p) => (p.id === id ? { ...p, price: Math.max(0, newPrice) } : p));
  saveStoredProducts(updated);
}

export function addProduct(product: Omit<Product, "id">): Product {
  const current = getStoredProducts();
  const newProduct: Product = {
    ...product,
    id: `prod-${Date.now()}`,
  };
  saveStoredProducts([...current, newProduct]);
  return newProduct;
}

export function createProduct(product: Omit<Product, "id">): Product {
  return addProduct(product);
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const current = getStoredProducts();
  let updatedItem: Product | null = null;
  const updated = current.map((p) => {
    if (p.id === id) {
      updatedItem = { ...p, ...updates };
      return updatedItem;
    }
    return p;
  });
  saveStoredProducts(updated);
  return updatedItem;
}

export function deleteProduct(id: string): void {
  const current = getStoredProducts();
  saveStoredProducts(current.filter((p) => p.id !== id));
}

