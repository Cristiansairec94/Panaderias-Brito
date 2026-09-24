import { CashIncome, CashIncomeCategory, Sale, SimulatedSale } from "@/types";
import { formatDateTimeSafe, formatCurrency } from "@/lib/utils";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export const STORAGE_INCOMES_KEY = "brito_cash_incomes";

export const INITIAL_INCOMES: CashIncome[] = [
  {
    id: "ING-849102",
    amount: 500,
    category: "abono_pedido",
    categoryLabel: "Abono a Pedido Especial",
    paymentMethod: "efectivo",
    concept: "Anticipo de pastel 3 leches XV años para Sra. María González (PED-101)",
    customerId: "cli-3",
    customerName: "Sra. María González",
    orderId: "PED-101",
    orderNumber: "PED-101",
    cashier: "Lupita Brito",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 08:45 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849103",
    amount: 850,
    category: "abono_cliente",
    categoryLabel: "Cobro a Mayorista / Tiendita",
    paymentMethod: "transferencia",
    referenceNumber: "SPEI-774921",
    concept: "Liquidación semanal de 150 bolillos y teleras",
    customerId: "cli-1",
    customerName: "Abarrotes La Guadalupana (Don Pepe)",
    cashier: "Don Toño Brito",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 10:15 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849104",
    amount: 300,
    category: "abono_pedido",
    categoryLabel: "Abono a Pedido Especial",
    paymentMethod: "efectivo",
    concept: "Anticipo pastel mil hojas de chocolate y café para cumpleaños",
    customerId: "cli-4",
    customerName: "Familia Brito",
    orderId: "PED-103",
    orderNumber: "PED-103",
    cashier: "Lupita Brito",
    branchName: "Sucursal Norte",
    date: "Hoy, 11:30 AM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849105",
    amount: 250,
    category: "venta_costales",
    categoryLabel: "Venta de Costales / Reciclaje",
    paymentMethod: "efectivo",
    concept: "Venta de 50 costales de harina vacíos a forrajera local",
    cashier: "Maestro Juan",
    branchName: "Sucursal Matriz Centro",
    date: "Hoy, 12:45 PM",
    timestamp: new Date().toISOString(),
  },
  {
    id: "ING-849106",
    amount: 1000,
    category: "fondo_cambio",
    categoryLabel: "Aportación de Cambio a Caja",
    paymentMethod: "efectivo",
    concept: "Inyección de morralla y billetes de $20 y $50 para cambio del turno vespertino",
    cashier: "Don Toño Brito",
    branchName: "Sucursal Mercado",
    date: "Hoy, 01:20 PM",
    timestamp: new Date().toISOString(),
  },
];

/**
 * Obtiene todos los ingresos guardados en el almacenamiento local.
 * NO APLICA NINGÚN LÍMITE ARTIFICIAL DE DINERO (acepta desde $1 hasta cualquier monto sin tope).
 */
export function getStoredIncomes(): CashIncome[] {
  if (typeof window === "undefined") return INITIAL_INCOMES;
  try {
    const raw = localStorage.getItem(STORAGE_INCOMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validador universal: solo requiere que el monto sea un número válido mayor a 0 (SIN LÍMITE SUPERIOR)
        const valid = parsed.filter(
          (i: any) => typeof i.amount === "number" && !isNaN(i.amount) && i.amount > 0
        );
        return valid;
      }
    }
  } catch (err) {
    console.error("[Incomes] Error leyendo brito_cash_incomes:", err);
  }
  return INITIAL_INCOMES;
}

/**
 * Guarda la lista de ingresos y despacha el evento reactivo brito_incomes_updated
 */
export function saveStoredIncomes(incomes: CashIncome[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INCOMES_KEY, JSON.stringify(incomes));
    window.dispatchEvent(new Event("brito_incomes_updated"));
  } catch (err) {
    console.error("[Incomes] Error guardando brito_cash_incomes:", err);
  }
}

/**
 * Registra un nuevo ingreso directo en brito_cash_incomes
 */
export function recordCashIncome(income: {
  amount: number;
  category: CashIncomeCategory;
  categoryLabel: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  concept: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  saleId?: string;
  cashier: string;
  branchId?: string;
  branchName?: string;
  referenceNumber?: string;
  id?: string;
  date?: string;
}): CashIncome {
  const current = getStoredIncomes();

  // Evitar duplicados por ID o saleId
  if (income.id && current.some((i) => i.id === income.id)) {
    return current.find((i) => i.id === income.id)!;
  }
  if (income.saleId && current.some((i) => i.saleId === income.saleId)) {
    return current.find((i) => i.saleId === income.saleId)!;
  }

  const now = new Date();
  const formattedDate = income.date || `Hoy, ${now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;

  const newIncome: CashIncome = {
    id: income.id || `ING-${Date.now().toString().slice(-6)}`,
    amount: income.amount,
    category: income.category,
    categoryLabel: income.categoryLabel,
    paymentMethod: income.paymentMethod,
    concept: income.concept,
    customerId: income.customerId,
    customerName: income.customerName,
    orderId: income.orderId,
    orderNumber: income.orderNumber,
    saleId: income.saleId,
    cashier: income.cashier || "Cajero",
    branchId: income.branchId,
    branchName: income.branchName || "Sucursal Matriz Centro",
    date: formattedDate,
    timestamp: now.toISOString(),
    referenceNumber: income.referenceNumber,
  };

  const updated = [newIncome, ...current];
  saveStoredIncomes(updated);

  // Sincronizar también con los ingresos del turno activo de la terminal POS si aplica
  try {
    const shiftIncomesRaw = localStorage.getItem("brito_pos_current_incomes");
    const shiftIncomes: CashIncome[] = shiftIncomesRaw ? JSON.parse(shiftIncomesRaw) : [];
    if (!shiftIncomes.some((si) => si.id === newIncome.id)) {
      localStorage.setItem("brito_pos_current_incomes", JSON.stringify([newIncome, ...shiftIncomes]));
    }
  } catch (e) {}

  return newIncome;
}

/**
 * Registra una venta del Punto de Venta (POS) como un ingreso formal en el Historial de Ingresos.
 * Captura desde 1 solo pan ($5-$12 MXN) hasta compras de mayoreo o especiales sin tope de dinero.
 */
export function recordPosSaleIncome(params: {
  saleId: string;
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  itemsSummary: string;
  cashier: string;
  branchId?: string;
  branchName?: string;
  customerId?: string;
  customerName?: string;
  referenceNumber?: string;
  date?: string;
}): CashIncome {
  const conceptText = params.itemsSummary 
    ? `Compra de mostrador: ${params.itemsSummary}`
    : `Venta de pan en mostrador (Ticket #${params.saleId})`;

  return recordCashIncome({
    id: `ING-${params.saleId.replace(/^(POS-|pos-)/, "")}`,
    saleId: params.saleId,
    amount: params.total,
    category: "venta_mostrador",
    categoryLabel: "Venta Mostrador (Panadería / POS)",
    paymentMethod: params.paymentMethod,
    concept: conceptText,
    customerId: params.customerId,
    customerName: params.customerName && params.customerName !== "Público General" ? params.customerName : "Público general",
    cashier: params.cashier || "Cajero Mostrador",
    branchId: params.branchId,
    branchName: params.branchName || "Sucursal Matriz Centro",
    referenceNumber: params.referenceNumber,
    date: params.date,
  });
}

/**
 * Sincroniza y recupera automáticamente todas las ventas existentes en brito_pos_current_sales
 * y brito_simulated_sales hacia brito_cash_incomes para que aparezcan en el Historial de Ingresos.
 */
export function syncMissingSalesToIncomes(): void {
  if (typeof window === "undefined") return;
  try {
    const currentIncomes = getStoredIncomes();
    const existingSaleIds = new Set(
      currentIncomes
        .filter((i) => i.saleId)
        .map((i) => i.saleId!)
    );

    let hasNew = false;
    const newIncomesToAdd: CashIncome[] = [];

    // 1. Revisar ventas de terminal POS local
    const rawPosSales = localStorage.getItem("brito_pos_current_sales");
    if (rawPosSales) {
      const posSales: Sale[] = JSON.parse(rawPosSales);
      if (Array.isArray(posSales)) {
        for (const s of posSales) {
          if (!existingSaleIds.has(s.id) && s.total > 0) {
            existingSaleIds.add(s.id);
            const itemsSummary = s.items?.map((item) => `${item.quantity}x ${item.product.name}`).join(", ") || "Venta de pan";
            newIncomesToAdd.push({
              id: `ING-${s.id.replace(/^(POS-|pos-)/, "")}`,
              saleId: s.id,
              amount: s.total,
              category: "venta_mostrador",
              categoryLabel: "Venta Mostrador (Panadería / POS)",
              paymentMethod: s.paymentMethod,
              concept: `Compra de mostrador: ${itemsSummary}`,
              customerId: s.customerId,
              customerName: s.customerName && s.customerName !== "Público General" ? s.customerName : "Público general",
              cashier: s.cashier || "Cajero",
              branchName: "Sucursal Matriz Centro",
              date: s.date || "Hoy",
              timestamp: new Date().toISOString(),
              referenceNumber: s.paymentReference,
            });
            hasNew = true;
          }
        }
      }
    }

    // 2. Revisar ventas de sucursales en tiempo real
    const rawSimSales = localStorage.getItem("brito_simulated_sales");
    if (rawSimSales) {
      const simSales: SimulatedSale[] = JSON.parse(rawSimSales);
      if (Array.isArray(simSales)) {
        for (const s of simSales) {
          if (!existingSaleIds.has(s.id) && s.total > 0) {
            existingSaleIds.add(s.id);
            newIncomesToAdd.push({
              id: `ING-${s.id.replace(/^(POS-|pos-)/, "")}`,
              saleId: s.id,
              amount: s.total,
              category: "venta_mostrador",
              categoryLabel: "Venta Mostrador (Panadería / POS)",
              paymentMethod: s.paymentMethod,
              concept: `Venta en ${s.branchName}: ${s.itemsSummary}`,
              customerName: "Público general",
              cashier: s.cashier || "Cajero",
              branchName: s.branchName,
              date: `Hoy, ${s.timestamp}`,
              timestamp: new Date().toISOString(),
            });
            hasNew = true;
          }
        }
      }
    }

    if (hasNew && newIncomesToAdd.length > 0) {
      const combined = [...newIncomesToAdd, ...currentIncomes];
      saveStoredIncomes(combined);
    }
  } catch (err) {
    console.error("[Incomes] Error sincronizando ventas a ingresos:", err);
  }
}

// ─── SINCRONIZACIÓN EN TIEMPO REAL MULTI-SUCURSAL (WebSocket) ───────────
if (typeof window !== "undefined") {
  // 1. Escuchar ventas en tiempo real de cualquier sucursal y registrarlas directamente como ingresos
  realtimeHub.onSale((sale) => {
    try {
      if (!sale || sale.total <= 0) return;
      recordPosSaleIncome({
        saleId: sale.id,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        itemsSummary: sale.itemsSummary,
        cashier: sale.cashier,
        branchId: sale.branchId,
        branchName: sale.branchName,
        date: `Hoy, ${sale.timestamp}`,
      });
    } catch (err) {
      console.error("[IncomesRealtime] Error registrando venta remota como ingreso:", err);
    }
  });

  // 2. Escuchar entradas de dinero a caja de cualquier sucursal
  realtimeHub.onCashMovement((mov) => {
    try {
      if (!mov || mov.type !== "entrada" || mov.amount <= 0) return;
      recordCashIncome({
        id: `ING-${mov.id.replace(/^bmov-/, "")}`,
        amount: mov.amount,
        category: (mov.category as CashIncomeCategory) || "ingreso_extraordinario",
        categoryLabel: mov.categoryLabel || "Entrada de Caja",
        paymentMethod: "efectivo",
        concept: `${mov.categoryLabel}: ${mov.reason}`,
        cashier: mov.authorizedBy || "Encargado de Caja",
        branchId: mov.branchId,
        branchName: mov.branchName,
        date: `Hoy, ${mov.timestamp}`,
      });
    } catch (err) {
      console.error("[IncomesRealtime] Error registrando movimiento de caja remoto como ingreso:", err);
    }
  });
}
