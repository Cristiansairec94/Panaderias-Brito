import { CustomOrder, OrderItem, OrderPayment, CashIncome, Sale } from "@/types";
import { formatCurrency, formatDateTimeSafe, parseDateTimeSafe, getStoredShiftStartBoundary, resolveBranchId } from "@/lib/utils";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { createClient } from "@/lib/supabase/client";

export const STORAGE_ORDERS_KEY = "brito_custom_orders";

function formatNotificationHour(timestamp?: number): string {
  const ts = typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} hrs`;
}

export function orderToSupabasePayload(order: CustomOrder): any {
  // Destination/Pickup branch: where the customer picks up or receives the order
  const effPickupBranchId = resolveBranchId(order.branchId, undefined) || "branch-matriz";
  const effPickupBranchName = order.branchName || "Sucursal Matriz (Centro)";

  // Origin/Operating branch: where the cashier raised/created the order
  const effOperatingBranchId = resolveBranchId(order.operatingBranchId || order.branchId, order.cashier);
  const effOperatingBranchName = order.operatingBranchName || order.branchName || "Sucursal Matriz (Centro)";

  // Embed origin branch in notes metadata so it is NEVER lost when storing in Supabase
  let finalNotes = (order.notes || "").trim();
  if (effOperatingBranchId) {
    if (!finalNotes.includes("[Origen:")) {
      finalNotes = `[Origen: ${effOperatingBranchId}|${effOperatingBranchName}] ${finalNotes}`.trim();
    }
  }

  return {
    id: order.id || order.orderNumber,
    order_number: order.orderNumber || order.id,
    customer_id: order.customerId || null,
    customer_name: order.customerName || "Cliente Mostrador",
    phone: order.phone || "N/A",
    branch_id: effPickupBranchId,
    branch_name: effPickupBranchName,
    description: order.description || "Pedido de pastelería",
    items: Array.isArray(order.items) ? order.items : [],
    delivery_date: order.deliveryDate ? order.deliveryDate.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0],
    delivery_time: order.deliveryTime || "16:00",
    delivery_type: order.deliveryType || "sucursal",
    delivery_address: order.deliveryAddress || null,
    status: order.status || "pendiente",
    total: Number(order.total) || 0,
    deposit: Number(order.deposit) || 0,
    remaining_balance: Number(order.remainingBalance) || 0,
    payment_status: order.paymentStatus || "anticipo",
    payment_method: order.paymentMethod || "efectivo",
    payments: Array.isArray(order.payments) ? order.payments : [],
    dedication: order.dedication || null,
    notes: finalNotes || null,
    cashier: order.cashier || "Don Toño Brito",
    shift_name: order.shiftName || null,
  };
}

export async function persistOrderToSupabase(order: CustomOrder): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const supabase = createClient();
    const payload = orderToSupabasePayload(order);
    const { error } = await supabase.from("custom_orders").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[OrdersSupabase] Error al guardar pedido en Supabase:", error);
    } else {
      console.log("[OrdersSupabase] Pedido guardado exitosamente en Supabase:", payload.order_number);
    }
  } catch (err) {
    console.warn("[OrdersSupabase] Excepción guardando pedido en Supabase:", err);
  }
}

export async function persistOrderPaymentMovementToSupabase(params: {
  amount: number;
  orderNumber: string;
  orderId: string;
  customerName: string;
  cashier: string;
  branchId?: string;
  isLiquidation?: boolean;
}): Promise<void> {
  if (typeof window === "undefined" || params.amount <= 0) return;
  try {
    const supabase = createClient();
    const movId = `ING-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from("cash_movements").insert({
      id: movId,
      type: "entrada",
      category: "abono_pedido",
      category_label: params.isLiquidation ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
      amount: params.amount,
      reason: `${params.isLiquidation ? "Liquidación final" : "Anticipo"} pedido ${params.orderNumber} - ${params.customerName}`,
      authorized_by: params.cashier || "Cajero",
      branch_id: resolveBranchId(params.branchId, params.cashier),
    });
    if (error) {
      console.warn("[OrdersSupabase] Error registrando movimiento de dinero en Supabase:", error);
    }
  } catch (err) {
    console.warn("[OrdersSupabase] Excepción registrando movimiento en Supabase:", err);
  }
}

export const INITIAL_ORDERS: CustomOrder[] = [
  {
    id: "PED-101",
    orderNumber: "PED-101",
    customerId: "cli-3",
    customerName: "Sra. María González",
    phone: "55 1234 5678",
    branchId: "branch-matriz",
    branchName: "Sucursal Matriz (Centro)",
    operatingBranchId: "branch-matriz",
    operatingBranchName: "Sucursal Matriz (Centro)",
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
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    operatingBranchId: "branch-sanjuan",
    operatingBranchName: "Sucursal San Juan",
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
    dedication: "Evento Colegio San Juan",
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
    branchId: "branch-sanjuan",
    branchName: "Sucursal San Juan",
    operatingBranchId: "branch-flores",
    operatingBranchName: "Sucursal Las Flores (Plaza)",
    description: "Pastel Mil Hojas de Chocolate y Café con nuez garapiñada. Creado en Las Flores, se recoge en San Juan.",
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
    notes: "Elaborar con hojaldre recién horneado ese mismo mediodía. Recoger en San Juan.",
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
 * Normaliza pedidos existentes para asegurar que contengan todos los campos compatibles
 * tanto en camelCase como snake_case provenientes de Supabase o LocalStorage
 */
export function normalizeOrder(order: any): CustomOrder {
  if (!order) return null as any;

  const total = Number(order.total) || 0;
  const deposit = Number(order.deposit) || 0;
  const rawRemaining = order.remaining_balance !== undefined ? Number(order.remaining_balance) : (order.remainingBalance !== undefined ? Number(order.remainingBalance) : undefined);
  const remaining = rawRemaining !== undefined && !isNaN(rawRemaining) ? Math.max(0, rawRemaining) : Math.max(0, total - deposit);
  const status = order.status || "pendiente";

  const orderNumber = order.orderNumber || order.order_number || order.id || `PED-${Date.now().toString().slice(-3)}`;
  const id = order.id || order.order_id || orderNumber;

  const customerId = order.customerId || order.customer_id || undefined;
  const customerName = order.customerName || order.customer_name || "Cliente Mostrador";
  const phone = order.phone || "N/A";

  const rawNotes = order.notes || "";
  const originMatch = rawNotes.match(/\[Origen:\s*([^\|\]]+)(?:\|([^\]]+))?\]/);
  const originBranchId = originMatch ? originMatch[1].trim() : undefined;
  const originBranchName = originMatch && originMatch[2] ? originMatch[2].trim() : undefined;

  // Pickup Branch (branch_id en Supabase)
  const branchId = order.branchId || order.branch_id || "branch-matriz";
  const branchName = order.branchName || order.branch_name || "Sucursal Matriz (Centro)";

  // Operating Branch (Origen donde se levantó/cobró el pedido)
  const operatingBranchId = order.operatingBranchId || order.operating_branch_id || originBranchId || branchId;
  const operatingBranchName = order.operatingBranchName || order.operating_branch_name || originBranchName || branchName;

  const rawDate = order.deliveryDate || order.delivery_date;
  const deliveryDate = rawDate ? String(rawDate).split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0];

  const deliveryTime = order.deliveryTime || order.delivery_time || (rawDate && String(rawDate).includes(" ") ? String(rawDate).split(" ")[1] : "16:00");
  const deliveryType = order.deliveryType || order.delivery_type || "sucursal";
  const deliveryAddress = order.deliveryAddress || order.delivery_address || undefined;

  const paymentStatus = order.paymentStatus || order.payment_status || (remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo");
  const paymentMethod = order.paymentMethod || order.payment_method || "efectivo";

  const rawCreated = order.createdAt || order.created_at || new Date().toISOString();
  const createdAt = typeof rawCreated === "string" ? rawCreated : new Date(rawCreated).toISOString();
  const timestamp = order.timestamp ? Number(order.timestamp) : parseDateTimeSafe(createdAt) || Date.now();

  const cashier = order.cashier || "Don Toño Brito";
  const shiftName = order.shiftName || order.shift_name || undefined;

  let items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
  if (items.length === 0) {
    items = [
      {
        name: order.description || "Pedido Especial",
        quantity: 1,
        unitPrice: total,
        subtotal: total,
      },
    ];
  }

  let payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.length === 0 && deposit > 0) {
    payments = [
      {
        id: `PAY-${orderNumber}-0`,
        date: new Date(timestamp).toLocaleDateString("es-MX", { dateStyle: "short" }),
        amount: deposit,
        paymentMethod: paymentMethod,
        cashier: cashier,
        notes: "Anticipo inicial registrado",
      },
    ];
  }

  return {
    id,
    orderNumber,
    customerId,
    customerName,
    phone,
    branchId,
    branchName,
    operatingBranchId,
    operatingBranchName,
    description: order.description || (items.length > 0 ? items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ") : "Pedido de panadería"),
    items,
    deliveryDate,
    deliveryTime,
    deliveryType,
    deliveryAddress,
    status,
    total,
    deposit,
    remainingBalance: remaining,
    paymentStatus,
    paymentMethod,
    dedication: order.dedication || "",
    notes: rawNotes,
    createdAt,
    timestamp,
    shiftName,
    cashier,
    payments,
  };
}

export function getStoredOrders(): CustomOrder[] {
  if (typeof window === "undefined") {
    return INITIAL_ORDERS;
  }

  try {
    const isOrdersInit = localStorage.getItem("brito_orders_initialized") === "true";
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) {
      if (isOrdersInit) return [];
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (isOrdersInit) return [];
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
 * Sincroniza pedidos bidireccionalmente con Supabase y el servidor para que todos los perfiles
 * (administrador, cajeros como Silvia Puga, tablets) vean el 100% de los pedidos en tiempo real.
 */
export async function syncOrdersWithServer(): Promise<CustomOrder[]> {
  if (typeof window === "undefined") return INITIAL_ORDERS;

  try {
    const localOrders = getStoredOrders();
    let serverOrders: CustomOrder[] = [];

    // 1. Consultar directamente pedidos maestros en Supabase
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        serverOrders = data.map(normalizeOrder);
      }
    } catch (dbErr) {
      console.warn("[OrdersSync] Supabase no disponible temporalmente:", dbErr);
    }

    // 2. Si Supabase no devolvió pedidos, consultar /api/orders como fallback
    if (serverOrders.length === 0) {
      try {
        const res = await fetch("/api/orders", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.orders)) {
            serverOrders = json.orders.map(normalizeOrder);
          }
        }
      } catch (apiErr) {
        console.warn("[OrdersSync] API fallback no disponible:", apiErr);
      }
    }

    // 3. Reconciliación / Merge inteligente de pedidos locales y de servidor
    const ordersMap = new Map<string, CustomOrder>();

    // Primero los de servidor
    for (const ord of serverOrders) {
      const norm = normalizeOrder(ord);
      if (norm.id) ordersMap.set(norm.id, norm);
      if (norm.orderNumber) ordersMap.set(norm.orderNumber, norm);
    }

    // Reconciliar con locales
    let hasLocalChangesToPush = false;
    const pendingPushList: CustomOrder[] = [];

    for (const rawOrd of localOrders) {
      const ord = normalizeOrder(rawOrd);
      const existing = (ord.id && ordersMap.get(ord.id)) || (ord.orderNumber && ordersMap.get(ord.orderNumber));

      if (!existing) {
        // Pedido creado localmente que no está en el servidor aún
        if (ord.id) ordersMap.set(ord.id, ord);
        if (ord.orderNumber) ordersMap.set(ord.orderNumber, ord);
        hasLocalChangesToPush = true;
        pendingPushList.push(ord);
      } else {
        const localTs = ord.timestamp || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
        const serverTs = existing.timestamp || (existing.createdAt ? new Date(existing.createdAt).getTime() : 0);

        if (localTs > serverTs) {
          // El local es más reciente (por ejemplo se cobró o editó en el dispositivo)
          if (ord.id) ordersMap.set(ord.id, ord);
          if (ord.orderNumber) ordersMap.set(ord.orderNumber, ord);
          hasLocalChangesToPush = true;
          pendingPushList.push(ord);
        }
      }
    }

    // Deduplicar por id único
    const uniqueOrders = new Map<string, CustomOrder>();
    for (const ord of ordersMap.values()) {
      const uniqueKey = ord.id || ord.orderNumber;
      if (uniqueKey && !uniqueOrders.has(uniqueKey)) {
        uniqueOrders.set(uniqueKey, ord);
      }
    }

    const mergedList = Array.from(uniqueOrders.values()).sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    // Guardar en el almacenamiento local del dispositivo (celular o PC)
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(mergedList));
    window.dispatchEvent(new Event("brito_orders_updated"));

    // Subir pedidos locales faltantes o actualizados a Supabase y al endpoint de respaldo
    if (hasLocalChangesToPush && pendingPushList.length > 0) {
      try {
        const supabase = createClient();
        const payloads = pendingPushList.map(orderToSupabasePayload);
        supabase.from("custom_orders").upsert(payloads, { onConflict: "id" }).then(() => {});
      } catch {}

      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: pendingPushList }),
      }).catch((e) => console.warn("[OrdersSync] Error actualizando cambios al servidor:", e));
    }

    return mergedList;
  } catch (err) {
    console.error("[OrdersSync] Error sincronizando pedidos con servidor:", err);
    return getStoredOrders();
  }
}

// Sincronizar reactivamente pedidos especiales recibidos de otros dispositivos
if (typeof window !== "undefined" && realtimeHub?.onOrder) {
  realtimeHub.onOrder(({ action, order }) => {
    try {
      if (!order) return;
      const current = getStoredOrders();
      if (action === "create") {
        if (!current.some((o) => o.id === order.id || o.orderNumber === order.orderNumber)) {
          saveStoredOrders([order, ...current]);
        }
      } else if (action === "payment" || action === "status") {
        const idx = current.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
        if (idx !== -1) {
          current[idx] = order;
          saveStoredOrders(current);
        } else {
          saveStoredOrders([order, ...current]);
        }
      } else if (action === "delete") {
        const filtered = current.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber);
        saveStoredOrders(filtered);
      }
    } catch (err) {
      console.error("[OrdersRealtime] Error actualizando pedidos en memoria:", err);
    }
  });
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

    try {
      const shiftIncomesRaw = localStorage.getItem("brito_pos_current_incomes");
      const shiftIncomes: CashIncome[] = shiftIncomesRaw ? JSON.parse(shiftIncomesRaw) : [];
      const updatedShiftIncomes = [newIncome, ...shiftIncomes.filter((i) => i.id !== newIncome.id)];
      localStorage.setItem("brito_pos_current_incomes", JSON.stringify(updatedShiftIncomes));
    } catch (e) {}

    window.dispatchEvent(new Event("brito_incomes_updated"));
  } catch (err) {
    console.error("Error logging cash income for order:", err);
  }
}

/**
 * Registra un pedido especial (anticipo o liquidación) como una venta formal en el historial de ventas del POS
 */
export function recordOrderAsPosSale(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  totalOrderAmount?: number;
  customerName: string;
  customerId?: string;
  cashier: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  description?: string;
  items?: OrderItem[];
  isLiquidation?: boolean;
  branchId?: string;
  operatingBranchId?: string;
}) {
  if (typeof window === "undefined" || params.amount <= 0) return;
  try {
    const rawSales = localStorage.getItem("brito_pos_current_sales");
    const currentSales: Sale[] = rawSales ? JSON.parse(rawSales) : [];

    const saleId = params.isLiquidation 
      ? `LIQ-${params.orderNumber}` 
      : params.orderNumber || `PED-${params.orderId}`;

    // Evitar registros duplicados con el mismo ID de venta
    if (currentSales.some((s) => s.id === saleId)) return;

    const saleItems = (params.items && params.items.length > 0)
      ? params.items.map((i, idx) => ({
          product: {
            id: i.productId || `order-item-${idx}`,
            name: `🎂 [Pedido] ${i.name}`,
            price: Number(i.unitPrice) || Number(i.subtotal) || params.amount,
            category: "pasteles" as const,
            stock: 999,
          },
          quantity: Number(i.quantity) || 1,
        }))
      : [{
          product: {
            id: `order-item-${params.orderId}`,
            name: `🎂 [Pedido ${params.isLiquidation ? "Liquidación" : "Anticipo"}] ${params.description || params.orderNumber}`,
            price: params.amount,
            category: "pasteles" as const,
            stock: 999,
          },
          quantity: 1,
        }];

    const newSale: Sale = {
      id: saleId,
      date: formatDateTimeSafe(new Date()),
      items: saleItems,
      total: params.amount,
      paymentMethod: params.paymentMethod,
      cashier: params.cashier,
      customerName: params.customerName,
      customerId: params.customerId,
      customerType: "evento",
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      isCustomOrder: true,
      orderNumber: params.orderNumber,
    };

    (newSale as any).branchId = params.operatingBranchId || params.branchId;
    (newSale as any).operatingBranchId = params.operatingBranchId;

    const branchIdForShift = params.operatingBranchId || params.branchId;
    const shiftStart = getStoredShiftStartBoundary(branchIdForShift);
    const cleanCurrentSales = currentSales.filter((s) => {
      if (!s) return false;
      const t = parseDateTimeSafe(s.timestamp || s.createdAt || s.date);
      return shiftStart <= 0 || (t > 0 && t >= shiftStart);
    });

    const nextSales = [newSale, ...cleanCurrentSales];
    localStorage.setItem("brito_pos_current_sales", JSON.stringify(nextSales));

    try {
      const rawMaster = localStorage.getItem("brito_pos_master_sales");
      const prevMaster: Sale[] = rawMaster ? JSON.parse(rawMaster) : [];
      const nextMaster = [newSale, ...prevMaster.filter((s) => s.id !== newSale.id)].slice(0, 1000);
      localStorage.setItem("brito_pos_master_sales", JSON.stringify(nextMaster));
    } catch (e) {}

    window.dispatchEvent(new Event("brito_sales_updated"));
  } catch (err) {
    console.error("Error logging order as POS sale:", err);
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

function formatOrderDateTime(d: Date = new Date()): string {
  return formatDateTimeSafe(d);
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
  operatingBranchId?: string;
  operatingBranchName?: string;
  description: string;
  items: OrderItem[];
  deliveryDate: string;
  deliveryTime: string;
  deliveryType: "sucursal" | "domicilio";
  deliveryAddress?: string;
  total: number;
  deposit: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  transferAccount?: string;
  cardTerminal?: string;
  paymentReference?: string;
  dedication?: string;
  notes?: string;
  cashier: string;
  shiftName?: string;
}): CustomOrder {
  const current = getStoredOrders();
  const orderNumber = generateNextOrderNumber();
  const orderId = `ord-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const effOperatingBranchId = resolveBranchId(data.operatingBranchId || data.branchId, data.cashier);
  const effPickupBranchId = resolveBranchId(data.branchId, undefined);
  const deposit = Math.max(0, Math.min(data.total, Number(data.deposit) || 0));
  const remaining = Math.max(0, data.total - deposit);
  const paymentStatus: CustomOrder["paymentStatus"] =
    remaining === 0 ? "liquidado" : deposit > 0 ? "anticipo" : "sin_anticipo";

  const payments: OrderPayment[] = [];
  if (deposit > 0) {
    payments.push({
      id: `PAY-${orderNumber}-1`,
      date: formatOrderDateTime(),
      amount: deposit,
      paymentMethod: data.paymentMethod,
      cashier: data.cashier,
      transferAccount: data.transferAccount,
      cardTerminal: data.cardTerminal,
      paymentReference: data.paymentReference,
      notes: remaining === 0 ? "Pago total inmediato" : "Anticipo al levantar pedido",
    });

    // Registrar en ingresos de caja de la sucursal de quien opera el turno
    recordOrderCashIncome({
      amount: deposit,
      orderNumber,
      orderId,
      customerName: data.customerName,
      customerId: data.customerId,
      cashier: data.cashier,
      branchId: effOperatingBranchId,
      branchName: data.operatingBranchName || data.branchName,
      paymentMethod: data.paymentMethod,
      isLiquidation: remaining === 0,
    });

    // Registrar el anticipo del pedido como una venta en el historial de ventas del POS
    recordOrderAsPosSale({
      orderId,
      orderNumber,
      amount: deposit,
      totalOrderAmount: data.total,
      customerName: data.customerName,
      customerId: data.customerId,
      cashier: data.cashier,
      paymentMethod: data.paymentMethod,
      description: data.description,
      items: data.items,
      isLiquidation: remaining === 0,
      branchId: effPickupBranchId,
      operatingBranchId: effOperatingBranchId,
    });
  }

  const newOrder: CustomOrder = {
    id: orderId,
    orderNumber: orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    phone: data.phone.trim(),
    branchId: effPickupBranchId,
    branchName: data.branchName,
    operatingBranchId: effOperatingBranchId,
    operatingBranchName: data.operatingBranchName || data.branchName,
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
    transferAccount: data.transferAccount,
    cardTerminal: data.cardTerminal,
    paymentReference: data.paymentReference,
    dedication: data.dedication?.trim(),
    notes: data.notes?.trim(),
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    cashier: data.cashier,
    shiftName: data.shiftName || (typeof window !== "undefined" ? localStorage.getItem("brito_current_shift_name") || undefined : undefined),
    payments: payments,
  };

  saveStoredOrders([newOrder, ...current]);

  // Persistir pedido y anticipo directamente en Supabase para sincronización 100% en tiempo real
  persistOrderToSupabase(newOrder);

  if (deposit > 0) {
    persistOrderPaymentMovementToSupabase({
      amount: deposit,
      orderNumber,
      orderId,
      customerName: data.customerName,
      cashier: data.cashier,
      branchId: effOperatingBranchId,
      isLiquidation: remaining === 0,
    });

    if (typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
      realtimeHub.broadcastCashMovement({
        id: `ING-ord-${orderNumber}`,
        branchId: effOperatingBranchId,
        branchName: data.operatingBranchName || data.branchName || "Sucursal",
        type: "entrada",
        category: "abono_pedido" as any,
        categoryLabel: remaining === 0 ? "Liquidación de Pedido Especial" : "Anticipo de Pedido Especial",
        amount: deposit,
        reason: `${remaining === 0 ? "Liquidación final" : "Anticipo"} pedido ${orderNumber} - ${data.customerName}`,
        authorizedBy: data.cashier || "Cajero",
        cashier: data.cashier,
        timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }

  // Respaldar y sincronizar con el servidor para que los celulares lo reciban al 100%
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder }),
    }).catch(() => {});
  }

  // Transmitir pedido y notificación en tiempo real a los celulares y computadoras
  if (typeof window !== "undefined") {
    if (realtimeHub?.broadcastOrder) {
      realtimeHub.broadcastOrder("create", newOrder);
    }
    if (realtimeHub?.broadcastNotification) {
      const remaining = newOrder.remainingBalance || 0;
      const isCross = Boolean(
        newOrder.operatingBranchName &&
        newOrder.branchName &&
        newOrder.operatingBranchName.toLowerCase().trim() !== newOrder.branchName.toLowerCase().trim()
      );
      const branchSender = isCross
        ? `🎂 ${newOrder.operatingBranchName} ➔ ${newOrder.branchName}`
        : `🎂 Pedido Registrado (${newOrder.branchName || "Sucursal"})`;

      const notifPayload = {
        id: `notif-order-${newOrder.id}`,
        senderName: branchSender,
        senderAvatar: "🎂",
        badgeIcon: "pastel" as const,
        title: `Nuevo Pedido ${newOrder.orderNumber}: Total ${formatCurrency(newOrder.total)}`,
        highlightText: `${newOrder.customerName} • Anticipo: ${formatCurrency(newOrder.deposit)}${remaining > 0 ? ` (Resta: ${formatCurrency(remaining)})` : " (Liquidado)"}`,
        description: `${newOrder.description ? `${newOrder.description}. ` : ""}${isCross ? `[Levantado en: ${newOrder.operatingBranchName} • Entrega en: ${newOrder.branchName}] ` : `Recoge en: ${newOrder.branchName}. `}Entrega: ${newOrder.deliveryDate} a las ${newOrder.deliveryTime} hrs. Saldo restante: ${formatCurrency(remaining)}.`,
        timeAgo: formatNotificationHour(newOrder.timestamp),
        timestamp: newOrder.timestamp || Date.now(),
        group: "recientes" as const,
        read: false,
        category: "pedidos" as const,
        orderId: newOrder.id,
        branchId: newOrder.branchId,
        branchName: newOrder.branchName,
        operatingBranchId: newOrder.operatingBranchId,
        operatingBranchName: newOrder.operatingBranchName,
        actionLabel: remaining > 0 ? `Cobrar ${formatCurrency(remaining)}` : "Ver Detalle",
        actionLink: "/pedidos",
        secondaryActionLabel: remaining > 0 ? "Ver Detalle" : undefined,
        secondaryActionLink: remaining > 0 ? "/pedidos" : undefined,
      };

      realtimeHub.broadcastNotification(notifPayload);
    }
  }

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
    operatingBranchId?: string;
    operatingBranchName?: string;
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
    date: formatOrderDateTime(),
    amount: paymentAmount,
    paymentMethod: params.paymentMethod,
    cashier: params.cashier,
    notes: params.notes || (isFullLiquidation ? "Liquidación de saldo pendiente" : "Abono a cuenta"),
  };

  order.deposit = newDeposit;
  order.remainingBalance = newRemaining;
  order.paymentStatus = isFullLiquidation ? "liquidado" : "anticipo";
  order.payments = [...(order.payments || []), newPayment];
  order.timestamp = Date.now();

  // Solo marcar como entregado si se solicitó explícitamente la entrega inmediata
  if (params.markAsDelivered) {
    order.status = "entregado";
  }

  const effOperatingBranchId = resolveBranchId(params.operatingBranchId || order.operatingBranchId || order.branchId, params.cashier);

  // Registrar en ingresos de caja de quien opera el turno
  recordOrderCashIncome({
    amount: paymentAmount,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    customerId: order.customerId,
    cashier: params.cashier,
    branchId: effOperatingBranchId,
    branchName: params.operatingBranchName || order.operatingBranchName || order.branchName,
    paymentMethod: params.paymentMethod,
    isLiquidation: isFullLiquidation,
  });

  // Registrar el abono o liquidación como una venta en el historial de ventas del POS
  recordOrderAsPosSale({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: paymentAmount,
    totalOrderAmount: order.total,
    customerName: order.customerName,
    customerId: order.customerId,
    cashier: params.cashier,
    paymentMethod: params.paymentMethod,
    description: order.description,
    items: order.items,
    isLiquidation: isFullLiquidation,
    branchId: order.branchId,
    operatingBranchId: effOperatingBranchId,
  });

  current[idx] = order;
  saveStoredOrders(current);

  // Persistir actualización de saldo y pagos en Supabase
  persistOrderToSupabase(order);
  persistOrderPaymentMovementToSupabase({
    amount: paymentAmount,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerName: order.customerName,
    cashier: params.cashier,
    branchId: effOperatingBranchId,
    isLiquidation: isFullLiquidation,
  });

  if (typeof window !== "undefined" && realtimeHub?.broadcastCashMovement) {
    realtimeHub.broadcastCashMovement({
      id: `ING-pay-${order.orderNumber}-${order.payments?.length || 1}`,
      branchId: effOperatingBranchId,
      branchName: params.operatingBranchName || (order as any).operatingBranchName || (order as any).branchName || "Sucursal",
      type: "entrada",
      category: "abono_pedido" as any,
      categoryLabel: isFullLiquidation ? "Liquidación de Pedido Especial" : "Abono a Pedido Especial",
      amount: paymentAmount,
      reason: `${isFullLiquidation ? "Liquidación final" : "Abono"} pedido ${order.orderNumber} - ${order.customerName}`,
      authorizedBy: params.cashier || "Cajero",
      cashier: params.cashier,
      timestamp: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  // Sincronizar pago en servidor persistente para reflejo en celulares
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        updates: {
          deposit: order.deposit,
          remainingBalance: order.remainingBalance,
          paymentStatus: order.paymentStatus,
          payments: order.payments,
          status: order.status,
          timestamp: order.timestamp,
        },
      }),
    }).catch(() => {});
  }

  // Transmitir abono / liquidación en tiempo real
  if (typeof window !== "undefined" && realtimeHub?.broadcastOrder) {
    realtimeHub.broadcastOrder("payment", order);
    if (params.markAsDelivered) {
      realtimeHub.broadcastOrder("status", order);
    }
  }

  if (typeof window !== "undefined" && realtimeHub?.broadcastNotification) {
    const isPaid = order.remainingBalance === 0 || order.paymentStatus === "liquidado";
    const originName = order.operatingBranchName || "Sucursal";
    const destName = order.branchName || "Sucursal";
    const isCross = originName.toLowerCase().trim() !== destName.toLowerCase().trim();

    realtimeHub.broadcastNotification({
      id: `notif-order-pay-${order.id}-${paymentAmount}`,
      senderName: isPaid ? `🎂 Pedido Liquidado (${destName})` : `💰 Abono Recibido (${destName})`,
      senderAvatar: isPaid ? "🎂" : "💰",
      badgeIcon: "pastel",
      title: isPaid
        ? `Pedido Liquidado ${order.orderNumber}: $${paymentAmount.toFixed(2)}`
        : `Abono de Pedido ${order.orderNumber}: $${paymentAmount.toFixed(2)}`,
      highlightText: `${order.customerName} - ${isPaid ? "100% Pagado" : `Resta: $${(order.remainingBalance || 0).toFixed(2)}`}`,
      description: isCross
        ? `Se registró pago de $${paymentAmount.toFixed(2)} en ${destName}. Pedido originado en ${originName}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${(order.remainingBalance || 0).toFixed(2)}.`}`
        : `Se registró pago de $${paymentAmount.toFixed(2)}. Pedido: ${order.description}. ${isPaid ? "Listo para entrega final." : `Saldo restante: $${(order.remainingBalance || 0).toFixed(2)}.`}`,
      timeAgo: formatNotificationHour(Date.now()),
      timestamp: Date.now(),
      group: "recientes",
      read: false,
      category: "pedidos",
      orderId: order.id,
      branchId: order.branchId,
      branchName: order.branchName,
      operatingBranchId: order.operatingBranchId,
      operatingBranchName: order.operatingBranchName,
      actionLabel: (order.remainingBalance || 0) > 0 ? `Cobrar $${(order.remainingBalance || 0).toFixed(2)}` : "Ver Detalle",
      actionLink: "/pedidos",
    });
  }

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
    timestamp: Date.now(),
  };

  saveStoredOrders(current);

  // Persistir cambio de estado en Supabase
  persistOrderToSupabase(current[idx]);

  // Sincronizar cambio de estado en servidor para que el celular lo reciba de inmediato
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, updates: { status, timestamp: current[idx].timestamp } }),
    }).catch(() => {});
  }

  // Transmitir cambio de estado operativo
  if (typeof window !== "undefined" && realtimeHub?.broadcastOrder) {
    realtimeHub.broadcastOrder("status", current[idx]);
  }

  if (typeof window !== "undefined" && realtimeHub?.broadcastNotification) {
    const statusMap: Record<string, string> = {
      pendiente: "Pendiente ⏳",
      en_horno: "En Horno 🔥",
      listo: "Listo para Entrega 🎂",
      entregado: "Entregado al Cliente ✅",
      cancelado: "Cancelado ❌",
    };
    const isDelivered = status === "entregado";
    const ord = current[idx];
    const isCross = ord.operatingBranchName && ord.branchName && ord.operatingBranchName !== ord.branchName;

    realtimeHub.broadcastNotification({
      id: `notif-order-status-${ord.id}-${status}`,
      senderName: isDelivered ? `📦 ${ord.branchName}` : `👨‍🍳 ${ord.branchName}`,
      senderAvatar: isDelivered ? "📦" : "👨‍🍳",
      badgeIcon: "pastel",
      title: isDelivered ? `Pedido Entregado con Éxito: ${ord.orderNumber}` : "Estado de Pedido Actualizado",
      highlightText: isDelivered ? `${ord.customerName} • Entregado al Cliente` : `${ord.orderNumber}: Ahora está "${statusMap[status] || status}"`,
      description: isDelivered
        ? `El pedido ${ord.orderNumber} de "${ord.customerName}" fue entregado satisfactoriamente en ${ord.branchName}.${isCross ? ` (Originado en: ${ord.operatingBranchName}).` : ""}`
        : `Cliente: ${ord.customerName} • Entrega: ${ord.deliveryDate} ${ord.deliveryTime}${isCross ? ` • Origen: ${ord.operatingBranchName}` : ""}`,
      timeAgo: formatNotificationHour(Date.now()),
      timestamp: Date.now(),
      group: "recientes",
      read: false,
      category: "pedidos",
      orderId: ord.id,
      branchId: ord.branchId,
      branchName: ord.branchName,
      operatingBranchId: ord.operatingBranchId,
      operatingBranchName: ord.operatingBranchName,
      actionLabel: "Ver Detalle",
      actionLink: "/pedidos",
    });
  }

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

  // Persistir cambios en Supabase
  persistOrderToSupabase(updated);

  // Sincronizar actualización con servidor y transmitir a celulares
  if (typeof window !== "undefined") {
    fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, updates }),
    }).catch(() => {});
    if (realtimeHub?.broadcastOrder) {
      realtimeHub.broadcastOrder("status", updated);
    }
  }

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

    // Eliminar en Supabase
    if (typeof window !== "undefined") {
      try {
        const supabase = createClient();
        supabase.from("custom_orders").delete().or(`id.eq.${orderId},order_number.eq.${orderId}`).then(() => {});
      } catch {}
      fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      }).catch(() => {});
      if (realtimeHub?.broadcastOrder) {
        realtimeHub.broadcastOrder("delete", { id: orderId, orderNumber: orderId } as CustomOrder);
      }
    }

    return true;
  }
  return false;
}
