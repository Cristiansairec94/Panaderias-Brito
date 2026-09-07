export interface Product {
  id: string;
  code?: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  icon?: string;
  stock: number;
  description?: string;
  tag?: string;
  unit?: "pieza" | "kg" | "g" | string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TransferAccount {
  id: string;
  name: string;
  bank: string;
  clabe: string;
  accountNumber?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  transferAccount?: string;
  cashier: string;
  cashGiven?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  customerType?: "general" | "frecuente" | "mayoreo" | "evento";
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

export interface CustomerPurchase {
  id: string;
  date: string;
  total: number;
  items: { name: string; quantity: number; unitPrice?: number; subtotal?: number }[];
  branchName?: string;
  cashier?: string;
  paymentMethod?: string;
  transferAccount?: string;
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
  favoriteProduct?: string; // Pan o producto que más compra (Moda de compra)
  purchaseCounts?: Record<string, number>; // Conteo de compras acumuladas por producto
  purchaseHistory?: CustomerPurchase[]; // Historial detallado de compras
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

export interface ShiftCutRecord {
  id: string;
  date: string;
  timestamp: number;
  shiftRange: string;
  outgoingCashier: string;
  incomingCashier: string;
  responsible?: string; // Responsable directo del turno
  branchName?: string;
  previousShift: string;
  nextShift: string;
  initialFund: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
  totalSalesAll: number;
  totalExpenses: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  nextFund: number;
  notes: string;
  expensesList?: CashExpense[];
  stockPieces?: number;
  stockValue?: number;
}

export interface CashExpense {
  id: string;
  amount: number;
  category: "limpieza" | "retiro_personal" | "insumos_menores" | "proveedor" | "otro";
  description: string;
  cashier: string;
  date: string;
}

export type CashIncomeCategory =
  | "abono_pedido"
  | "abono_cliente"
  | "fondo_cambio"
  | "venta_costales"
  | "ingreso_extraordinario"
  | "otro";

export interface CashIncome {
  id: string;
  amount: number;
  category: CashIncomeCategory;
  categoryLabel: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  concept: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  cashier: string;
  branchId?: string;
  branchName?: string;
  date: string;
  timestamp?: string;
  referenceNumber?: string;
}

export type UserRole = "admin" | "auxiliar_admin" | "cajero" | "panadero" | "supervisor" | (string & {});

export interface RolePermissions {
  canAccessDashboard: boolean;
  canAccessPos: boolean;
  canAccessCaja: boolean;
  canAccessInventario: boolean;
  canAccessPedidos: boolean;
  canAccessClientes: boolean;
  canAccessFinanzas: boolean;
  canAccessReportes: boolean;
  canAccessConfiguracion: boolean;
  canAccessProductos: boolean;
  canViewProfitMargins: boolean;
  canEditPrices: boolean;
  canManageUsers: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password?: string;
  role: UserRole;
  roleLabel: string;
  jobTitle?: string;
  avatar: string;
  photoUrl?: string;
  phone?: string;
  assignedBranchId?: string;
  assignedBranchName?: string;
  permissions?: Partial<RolePermissions>;
  status?: "activo" | "inactivo";
  createdAt?: string;
}

export interface BranchShift {
  id: string;
  name: string; // e.g. "Turno Matutino (06:00 - 14:00)"
  cashier: string;
  openedAt: string;
  initialFund: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
  ticketCount: number;
  status: "abierto" | "cerrado";
}

export interface Branch {
  id: string;
  name: string;
  shortName: string;
  code: string;
  address: string;
  phone: string;
  manager: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  status: "abierta" | "cerrada" | "mantenimiento";
  currentShift: BranchShift;
  dailyGoal: number;
  todaySales: number;
  todayTickets: number;
  cashInDrawer: number;
  color: string; // e.g. "orange", "rose", "emerald", "blue", "purple"
}

export interface BranchCashMovement {
  id: string;
  branchId: string;
  branchName: string;
  type: "entrada" | "salida";
  category: "gasto_gas" | "compra_insumos" | "pago_proveedor" | "retiro_seguridad" | "abono_cliente" | "otro";
  categoryLabel: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  timestamp: string;
}

export interface BreadDeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  previousStock: number;
  newStock: number;
}

export interface BreadDeliveryRecord {
  id: string;
  source: string; // e.g. "Camioneta 1", "Taller Central", etc.
  driver?: string;
  cashier: string;
  date: string;
  timestamp: string;
  items: BreadDeliveryItem[];
  totalPieces: number;
  totalEstimatedValue: number;
  notes?: string;
}

export interface ExpenseRecord {
  id: string; // GST-000101
  date: string; // YYYY-MM-DD
  displayDate?: string;
  category: string;
  categoryLabel: string;
  branchId: string;
  branchName: string;
  description: string;
  amount: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  accountOrigin: string; // "Caja Mostrador", "BBVA Don Toño", "Caja Chica", etc.
  cashier: string;
  status: "activo" | "anulado";
  cancelReason?: string;
  notes?: string;
  supplier?: string;
  timestamp: string;
}
