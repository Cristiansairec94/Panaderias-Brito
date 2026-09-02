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
  category?: "harinas" | "lacteos" | "grasas" | "azucares" | "esencias" | "empaques";
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: "entrada_compra" | "merma_horno" | "merma_mostrador" | "ajuste";
  quantity: number;
  unit: string;
  cost?: number;
  reason: string;
  responsible: string;
  timestamp: string;
}

export interface CustomOrder {
  id: string;
  orderNumber?: string;
  customerName: string;
  phone: string;
  description: string;
  deliveryDate: string;
  status: "pendiente" | "en_horno" | "listo" | "entregado";
  total: number;
  deposit: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: "general" | "frecuente" | "mayoreo" | "evento";
  creditLimit: number;
  currentDebt: number;
  totalPurchases: number;
  notes?: string;
  registeredAt: string;
}

export interface CashShift {
  id: string;
  shiftName: string; // e.g. "Turno Mañana (6:00 AM - 2:00 PM)"
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: "abierta" | "cerrada";
  notes?: string;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: "entrada" | "salida";
  category: "gasto_gas" | "compra_insumos" | "pago_proveedor" | "retiro_dueno" | "abono_cliente" | "otro";
  categoryLabel: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  timestamp: string;
}
