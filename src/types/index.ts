export interface Product {
  id: string;
  name: string;
  price: number;
  category: "pan_dulce" | "pan_blanco" | "pasteleria" | "bebidas" | "temporada";
  image?: string;
  icon?: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  cashier: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: "kg" | "litros" | "piezas" | "bultos";
  currentStock: number;
  minStock: number;
  costPerUnit: number;
}

export interface CustomOrder {
  id: string;
  customerName: string;
  phone: string;
  description: string;
  deliveryDate: string;
  status: "pendiente" | "en_horno" | "listo" | "entregado";
  total: number;
  deposit: number;
}
