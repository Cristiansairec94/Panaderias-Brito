import { CustomOrder, OrderItem, OrderPayment, CashIncome } from "@/types";

export const STORAGE_ORDERS_KEY = "brito_custom_orders";

export const INITIAL_ORDERS: CustomOrder[] = [
  {
    id: "PED-101",
    orderNumber: "PED-101",
    customerId: "cli-3",
    customerName: "Sra. María González",
    phone: "55 1234 5678",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Pastel 3 Leches relleno de durazno, 50 personas, temático de XV años (flores lilas)",
    items: [
      {
        productId: "prod-8",
        name: "Pastel 3 Leches Artesanal Grande (50 personas)",
        quantity: 1,
        unitPrice: 850,
        subtotal: 850,
        notes: "Relleno de duraznos en almíbar y cubierta en crema chantilly lila",
      },
      {
        productId: "prod-9",
        name: "Pay de Queso con Zarzamora",
        quantity: 1,
        unitPrice: 100,
        subtotal: 100,
        notes: "Para mesa de postres",
      },
    ],
    deliveryDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0], // Mañana
    deliveryTime: "16:00",
    deliveryType: "sucursal",
    status: "pendiente",
    total: 950,
    deposit: 500,
    remainingBalance: 450,
    paymentStatus: "anticipo",
    paymentMethod: "efectivo",
    dedication: "¡Mis XV Años Mariana!",
    notes: "Entregar en caja alta con base rígida y velas de chispa incluidas.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    cashier: "Lupita Brito",
    payments: [
      {
        id: "PAY-101-1",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: 500,
        paymentMethod: "efectivo",
        cashier: "Lupita Brito",
        notes: "Anticipo 50% al levantar pedido",
      },
    ],
  },
  {
    id: "PED-102",
    orderNumber: "PED-102",
    customerId: "cli-2",
    customerName: "Ing. Carlos Mendoza",
    phone: "55 8765 4321",
    branchId: "branch-benito",
    branchName: "Sucursal San Benito (Mercado)",
    description: "100 piezas de mini cuernitos rellenos de jamón y queso para evento escolar matutino",
    items: [
      {
        productId: "prod-3",
        name: "Mini Cuernitos Hojaldrados Jamón y Queso",
        quantity: 100,
        unitPrice: 12,
        subtotal: 1200,
        notes: "Horneados a primera hora para entregar tibios",
      },
    ],
    deliveryDate: new Date().toISOString().split("T")[0], // Hoy
    deliveryTime: "08:30",
    deliveryType: "sucursal",
    status: "listo",
    total: 1200,
    deposit: 1200,
    remainingBalance: 0,
    paymentStatus: "liquidado",
    paymentMethod: "transferencia",
    dedication: "Evento Colegio San Benito",
    notes: "Cliente pasa en camioneta blanca a recoger en rampa.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    cashier: "Don Toño Brito",
    payments: [
      {
        id: "PAY-102-1",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: 1200,
        paymentMethod: "transferencia",
        cashier: "Don Toño Brito",
        notes: "Liquidación total vía transferencia SPEI",
      },
    ],
  },
  {
    id: "PED-103",
    orderNumber: "PED-103",
    customerId: "cli-1",
    customerName: "Familia Brito (Don Toño)",
    phone: "55 9988 7766",
    branchId: "branch-flores",
    branchName: "Sucursal Las Flores (Plaza)",
    description: "Pastel Mil Hojas de Chocolate y Café con nuez garapiñada para cumpleaños familiar",
    items: [
      {
        productId: "prod-8",
        name: "Pastel Mil Hojas Gourmet Mediano (25 personas)",
        quantity: 1,
        unitPrice: 650,
        subtotal: 650,
        notes: "Crujiente hojaldre de mantequilla y crema pastelera de café de olla",
      },
    ],
    deliveryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split("T")[0], // En 2 días
    deliveryTime: "18:00",
    deliveryType: "sucursal",
    status: "pendiente",
    total: 650,
    deposit: 300,
    remainingBalance: 350,
    paymentStatus: "anticipo",
    paymentMethod: "efectivo",
    dedication: "¡Feliz Cumpleaños Don Toño!",
    notes: "Elaborar con hojaldre recién horneado ese mismo mediodía.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    cashier: "Elena Brito",
    payments: [
      {
        id: "PAY-103-1",
        date: new Date().toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: 300,
        paymentMethod: "efectivo",
        cashier: "Elena Brito",
        notes: "Anticipo recibido en caja",
      },
    ],
  },
  {
    id: "PED-104",
    orderNumber: "PED-104",
    customerId: "cli-4",
    customerName: "Sra. Carmen Salazar",
    phone: "55 4567 8901",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    description: "Charola de 50 piezas de pan dulce surtido para desayuno corporativo",
    items: [
      {
        productId: "prod-1",
        name: "Conchas de Vainilla",
        quantity: 20,
        unitPrice: 12,
        subtotal: 240,
      },
      {
        productId: "prod-7",
        name: "Donas Glaseadas",
        quantity: 15,
        unitPrice: 13,
        subtotal: 195,
      },
      {
        productId: "prod-6",
        name: "Orejas de Mantequilla",
        quantity: 15,
        unitPrice: 14,
        subtotal: 210,
      },
    ],
    deliveryDate: new Date().toISOString().split("T")[0], // Hoy
    deliveryTime: "07:30",
    deliveryType: "domicilio",
    deliveryAddress: "Av. Reforma #500, Piso 4, Corporativo Reforma",
    status: "entregado",
    total: 645,
    deposit: 645,
    remainingBalance: 0,
    paymentStatus: "liquidado",
    paymentMethod: "tarjeta",
    dedication: "Reunión Directiva Semanal",
    notes: "Llevar terminal para cobro o comprobante.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    cashier: "Lupita Brito",
    payments: [
      {
        id: "PAY-104-1",
        date: new Date(Date.now() - 1000 * 60 * 60 * 36).toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: 300,
        paymentMethod: "tarjeta",
        cashier: "Lupita Brito",
        notes: "Anticipo inicial",
      },
      {
        id: "PAY-104-2",
        date: new Date().toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: 345,
        paymentMethod: "tarjeta",
        cashier: "Lupita Brito",
        notes: "Liquidación en entrega",
      },
    ],
  },
];

/**
 * Normaliza pedidos existentes para asegurar que contengan todos los campos nuevos
 */
function normalizeOrder(order: any): CustomOrder {
  const total = Number(order.total) || 0;
  const deposit = Number(order.deposit) || 0;
  const remaining = Math.max(0, total - deposit);
  const status = order.status || "pendiente";
  const orderNumber = order.orderNumber || order.id || `PED-${Date.now().toString().slice(-3)}`;

  return {
    id: order.id || orderNumber,
    orderNumber: orderNumber,
    customerId: order.customerId,
    customerName: order.customerName || "Cliente Mostrador",
    phone: order.phone || "N/A",
    branchId: order.branchId || "branch-matriz",
    branchName: order.branchName || "Sucursal Matriz (Centro)",
    description: order.description || "Pedido de panadería",
    items: Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : [
          {
            name: order.description || "Pedido Especial",
            quantity: 1,
            unitPrice: total,
            subtotal: total,
          },
        ],
    deliveryDate: order.deliveryDate ? order.deliveryDate.split(" ")[0] : new Date().toISOString().split("T")[0],
    deliveryTime: order.deliveryTime || (order.deliveryDate?.includes(" ") ? order.deliveryDate.split(" ")[1] : "12:00"),
    deliveryType: order.deliveryType || "sucursal",
    deliveryAddress: order.deliveryAddress,
    status: status,
    total: total,
    deposit: deposit,
    remainingBalance: remaining,
    paymentStatus: remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo",
    paymentMethod: order.paymentMethod || "efectivo",
    dedication: order.dedication || "",
    notes: order.notes || "",
    createdAt: order.createdAt || new Date().toISOString(),
    cashier: order.cashier || "Don Toño Brito",
    payments: Array.isArray(order.payments) && order.payments.length > 0
      ? order.payments
      : deposit > 0
      ? [
          {
            id: `PAY-${orderNumber}-0`,
            date: new Date().toLocaleDateString("es-MX", { dateStyle: "short" }),
            amount: deposit,
            paymentMethod: order.paymentMethod || "efectivo",
            cashier: order.cashier || "Cajero",
            notes: "Anticipo inicial registrado",
          },
        ]
      : [],
  };
}

export function getStoredOrders(): CustomOrder[] {
  if (typeof window === "undefined") {
    return INITIAL_ORDERS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return parsed.map(normalizeOrder);
  } catch (err) {
    console.error("Error loading stored orders:", err);
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: CustomOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event("brito_orders_updated"));
  } catch (err) {
    console.error("Error saving stored orders:", err);
  }
}

/**
 * Registra un ingreso de dinero en brito_cash_incomes para que impacte en caja
 */
function recordOrderCashIncome(params: {
  amount: number;
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerId?: string;
  cashier: string;
  branchId?: string;
  branchName?: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  isLiquidation?: boolean;
}) {
  if (typeof window === "undefined" || params.amount <= 0) return;
  try {
    const currentIncomesRaw = localStorage.getItem("brito_cash_incomes");
    const currentIncomes: CashIncome[] = currentIncomesRaw ? JSON.parse(currentIncomesRaw) : [];

    const now = new Date();
    const formattedDate = `Hoy, ${now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;

    const newIncome: CashIncome = {
      id: `ING-${Date.now().toString().slice(-6)}`,
      amount: params.amount,
      category: "abono_pedido",
      categoryLabel: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
      paymentMethod: params.paymentMethod,
      concept: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
      customerId: params.customerId,
      customerName: params.customerName,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      cashier: params.cashier,
      branchId: params.branchId,
      branchName: params.branchName,
      date: formattedDate,
      timestamp: now.toISOString(),
    };

    const updated = [newIncome, ...currentIncomes];
    localStorage.setItem("brito_cash_incomes", JSON.stringify(updated));
    window.dispatchEvent(new Event("brito_incomes_updated"));
  } catch (err) {
    console.error("Error logging cash income for order:", err);
  }
}

/**
 * Genera el siguiente número de pedido único consecutivo (ej. PED-105)
 */
export function generateNextOrderNumber(): string {
  const current = getStoredOrders();
  let maxNum = 100;
  for (const order of current) {
    const match = order.orderNumber?.match(/PED-(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `PED-${maxNum + 1}`;
}

/**
 * Agrega un nuevo pedido al sistema y registra el anticipo en caja si aplica
 */
export function addCustomOrder(data: {
  customerName: string;
  phone: string;
  customerId?: string;
  branchId: string;
  branchName: string;
  description: string;
  items: OrderItem[];
  deliveryDate: string;
  deliveryTime: string;
  deliveryType: "sucursal" | "domicilio";
  deliveryAddress?: string;
  total: number;
  deposit: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  dedication?: string;
  notes?: string;
  cashier: string;
}): CustomOrder {
  const current = getStoredOrders();
  const orderNumber = generateNextOrderNumber();
  const orderId = orderNumber;
  const deposit = Math.max(0, Math.min(data.total, Number(data.deposit) || 0));
  const remaining = Math.max(0, data.total - deposit);
  const paymentStatus: CustomOrder["paymentStatus"] =
    remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo";

  const payments: OrderPayment[] = [];
  if (deposit > 0) {
    payments.push({
      id: `PAY-${orderNumber}-1`,
      date: new Date().toLocaleDateString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      amount: deposit,
      paymentMethod: data.paymentMethod,
      cashier: data.cashier,
      notes: remaining === 0 ? "Pago total inmediato" : "Anticipo al levantar pedido",
    });

    // Registrar en ingresos de caja
    recordOrderCashIncome({
      amount: deposit,
      orderNumber,
      orderId,
      customerName: data.customerName,
      customerId: data.customerId,
      cashier: data.cashier,
      branchId: data.branchId,
      branchName: data.branchName,
      paymentMethod: data.paymentMethod,
      isLiquidation: remaining === 0,
    });
  }

  const newOrder: CustomOrder = {
    id: orderId,
    orderNumber: orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    phone: data.phone.trim(),
    branchId: data.branchId,
    branchName: data.branchName,
    description: data.description.trim() || (data.items.length > 0 ? data.items.map(i => `${i.quantity}x ${i.name}`).join(", ") : "Encargo"),
    items: data.items,
    deliveryDate: data.deliveryDate,
    deliveryTime: data.deliveryTime,
    deliveryType: data.deliveryType,
    deliveryAddress: data.deliveryAddress?.trim(),
    status: "pendiente",
    total: data.total,
    deposit: deposit,
    remainingBalance: remaining,
    paymentStatus: paymentStatus,
    paymentMethod: data.paymentMethod,
    dedication: data.dedication?.trim(),
    notes: data.notes?.trim(),
    createdAt: new Date().toISOString(),
    cashier: data.cashier,
    payments: payments,
  };

  saveStoredOrders([newOrder, ...current]);
  return newOrder;
}

/**
 * Registra un abono o liquidación total a un pedido existente
 */
export function addOrderPayment(
  orderId: string,
  params: {
    amount: number;
    paymentMethod: "efectivo" | "tarjeta" | "transferencia";
    cashier: string;
    notes?: string;
    markAsDelivered?: boolean;
  }
): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  const order = { ...current[idx] };
  const paymentAmount = Math.max(0, Math.min(order.remainingBalance, Number(params.amount) || 0));

  if (paymentAmount <= 0) return order;

  const newDeposit = order.deposit + paymentAmount;
  const newRemaining = Math.max(0, order.total - newDeposit);
  const isFullLiquidation = newRemaining === 0;

  const newPayment: OrderPayment = {
    id: `PAY-${order.orderNumber}-${(order.payments?.length || 0) + 1}`,
    date: new Date().toLocaleDateString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    amount: paymentAmount,
    paymentMethod: params.paymentMethod,
    cashier: params.cashier,
    notes: params.notes || (isFullLiquidation ? "Liquidación de saldo pendiente" : "Abono a cuenta"),
  };

  order.deposit = newDeposit;
  order.remainingBalance = newRemaining;
  order.paymentStatus = isFullLiquidation ? "liquidado" : "anticipo";
  order.payments = [...(order.payments || []), newPayment];

  if (params.markAsDelivered || (isFullLiquidation && order.status === "listo")) {
    order.status = "entregado";
  }

  // Registrar en ingresos de caja
  recordOrderCashIncome({
    amount: paymentAmount,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    customerId: order.customerId,
    cashier: params.cashier,
    branchId: order.branchId,
    branchName: order.branchName,
    paymentMethod: params.paymentMethod,
    isLiquidation: isFullLiquidation,
  });

  current[idx] = order;
  saveStoredOrders(current);
  return order;
}

/**
 * Actualiza el estado operativo de un pedido (pendiente -> en_horno -> listo -> entregado -> cancelado)
 */
export function updateOrderStatus(orderId: string, status: CustomOrder["status"]): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  current[idx] = {
    ...current[idx],
    status,
  };

  saveStoredOrders(current);
  return current[idx];
}

/**
 * Actualiza datos de un pedido existente
 */
export function updateCustomOrder(orderId: string, updates: Partial<CustomOrder>): CustomOrder | null {
  const current = getStoredOrders();
  const idx = current.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) return null;

  const existing = current[idx];
  const updated: CustomOrder = {
    ...existing,
    ...updates,
  };

  // Recalcular saldos si se modificó total o deposit
  if (updates.total !== undefined || updates.deposit !== undefined) {
    const total = Number(updated.total) || 0;
    const deposit = Number(updated.deposit) || 0;
    updated.total = total;
    updated.deposit = deposit;
    updated.remainingBalance = Math.max(0, total - deposit);
    updated.paymentStatus = updated.remainingBalance === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo";
  }

  current[idx] = updated;
  saveStoredOrders(current);
  return updated;
}

/**
 * Elimina o cancela un pedido
 */
export function deleteCustomOrder(orderId: string): boolean {
  const current = getStoredOrders();
  const filtered = current.filter(o => o.id !== orderId && o.orderNumber !== orderId);
  if (filtered.length !== current.length) {
    saveStoredOrders(filtered);
    return true;
  }
  return false;
}
