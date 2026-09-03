import { Product } from "@/types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-dulce-10",
    name: "Dulce",
    price: 10,
    category: "dulce_10",
    icon: "🥐",
    stock: 150,
    tag: "Pan Dulce $10",
    description: "Conchas chicas, donas, orejas, polvorones, banderillas, moños y pan dulce tradicional.",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-bolillo-3",
    name: "Bolillo",
    price: 3,
    category: "bolillo_3",
    icon: "🍞",
    stock: 300,
    tag: "Bolillo $3",
    description: "Bolillo tradicional crujiente de horno caliente con migajón esponjoso.",
    image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-telera-350",
    name: "Telera",
    price: 3.50,
    category: "telera_350",
    icon: "🥪",
    stock: 200,
    tag: "Telera $3.50",
    description: "Telera suave y dorada en tres secciones, clásica para tortas mexicanas.",
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-dulce-12",
    name: "Dulce",
    price: 12,
    category: "dulce_12",
    icon: "🍫",
    stock: 120,
    tag: "Pan Dulce $12",
    description: "Conchas grandes especiales, cuernitos de mantequilla, rehiletes, trenzas y chocolatines.",
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-rollos-15",
    name: "Rollos",
    price: 15,
    category: "rollos_15",
    icon: "🥨",
    stock: 75,
    tag: "Rollos $15",
    description: "Rollos de canela glaseados, rollos de crema pastelera, mermelada de fresa y nuez.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-strudel-18",
    name: "Strudel",
    price: 18,
    category: "strudel_18",
    icon: "🥧",
    stock: 50,
    tag: "Strudel $18",
    description: "Strudel fino hojaldrado relleno de manzana horneada con canela, nuez o piña.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-pambazo-4",
    name: "Pambazo",
    price: 4,
    category: "pambazo_4",
    icon: "🥖",
    stock: 180,
    tag: "Pambazo $4",
    description: "Pan de pambazo suave tradicional para enchilar y rellenar de papa y chorizo.",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-pastes-20",
    name: "Pastes",
    price: 20,
    category: "pastes_20",
    icon: "🥟",
    stock: 60,
    tag: "Pastes $20",
    description: "Paste tradicional horneado de papa con carne molida, frijol con queso o tinga.",
    image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-pizza-20",
    name: "Rebanada de pizza",
    price: 20,
    category: "pizza_20",
    icon: "🍕",
    stock: 45,
    tag: "Pizza $20",
    description: "Rebanada de pizza panadera crujiente con salsa de tomate, queso y pepperoni.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-pay-25",
    name: "Rebanada de pay",
    price: 25,
    category: "pay_25",
    icon: "🍰",
    stock: 40,
    tag: "Pay $25",
    description: "Rebanada de pay de queso con zarzamora, limón, piña o nuez sobre costra de galleta.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80"
  },
  {
    id: "prod-cuerno-65",
    name: "Cuerno grande",
    price: 65,
    category: "cuerno_65",
    icon: "🥐",
    stock: 25,
    tag: "Cuerno Grande $65",
    description: "Cuerno gigante hojaldrado 100% mantequilla pura de vaca (tamaño familiar).",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80"
  }
];

export const PRODUCT_CATEGORIES = [
  { id: "all", label: "Todo el Pan", priceTag: "", icon: "🧺" },
  { id: "bolillo_3", label: "Bolillo $3", priceTag: "$3", icon: "🍞" },
  { id: "telera_350", label: "Telera $3.50", priceTag: "$3.50", icon: "🥪" },
  { id: "pambazo_4", label: "Pambazo $4", priceTag: "$4", icon: "🥖" },
  { id: "dulce_10", label: "Dulce $10", priceTag: "$10", icon: "🥐" },
  { id: "dulce_12", label: "Dulce $12", priceTag: "$12", icon: "🍫" },
  { id: "rollos_15", label: "Rollos $15", priceTag: "$15", icon: "🥨" },
  { id: "strudel_18", label: "Strudel $18", priceTag: "$18", icon: "🥧" },
  { id: "pastes_20", label: "Pastes $20", priceTag: "$20", icon: "🥟" },
  { id: "pizza_20", label: "Rebanada Pizza $20", priceTag: "$20", icon: "🍕" },
  { id: "pay_25", label: "Rebanada Pay $25", priceTag: "$25", icon: "🍰" },
  { id: "cuerno_65", label: "Cuerno Grande $65", priceTag: "$65", icon: "🥐" },
];

const STORAGE_KEY = "brito_products_v2";

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
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.some(p => p.id === "prod-dulce-10")) {
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

