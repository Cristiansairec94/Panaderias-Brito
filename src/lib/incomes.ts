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
 * Limpia y deduplica de forma estricta los ingresos para evitar registros repetidos:
 * 1. Si existe un "abono_pedido" (Anticipo o Liquidación de Pedido Especial) y además una "venta_mostrador"
 *    que menciona el mismo número de pedido (ej. PED-110) y el mismo monto, se elimina la venta_mostrador repetida.
 * 2. Si existen dos registros con la misma referencia de venta (saleId) o mismo ID, se conserva solo 1.
 * 3. Si existen dos registros de "venta_mostrador" con el mismo monto, mismo cajero, mismo concepto / productos
 *    y generados con pocos segundos/minutos de diferencia, se conserva solo 1.
 */
export function cleanDuplicateIncomes(incomes: CashIncome[]): CashIncome[] {
  if (!Array.isArray(incomes)) return [];

  const seenIds = new Set<string>();
  const seenSaleIds = new Set<string>();

  // 1. Identificar todos los pedidos especiales registrados legítimamente (abono_pedido)
  const legitimateOrderDeposits = new Map<string, number>(); // orderNumber -> amount
  for (const inc of incomes) {
    if (inc.category === "abono_pedido" && inc.orderNumber) {
      legitimateOrderDeposits.set(inc.orderNumber.toUpperCase(), inc.amount);
    }
    const match = inc.concept.match(/PED-\d+/i);
    if (inc.category === "abono_pedido" && match) {
      legitimateOrderDeposits.set(match[0].toUpperCase(), inc.amount);
    }
  }

  const cleaned: CashIncome[] = [];

  for (const inc of incomes) {
    // A) Evitar IDs duplicados exactos
    if (inc.id && seenIds.has(inc.id)) {
      continue;
    }

    // B) Evitar ventas POS con el mismo saleId
    if (inc.saleId) {
      const normalizedSaleId = inc.saleId.toLowerCase().replace(/^(pos-|ing-)/, "");
      if (seenSaleIds.has(normalizedSaleId)) {
        continue;
      }
      seenSaleIds.add(normalizedSaleId);
    }

    // C) Si es una "venta_mostrador" pero en realidad fue un anticipo/liquidación de pedido especial
    // (ejemplo: "Compra de mostrador: Anticipo Pedido PED-110") y ya existe el "abono_pedido" correspondiente:
    if (inc.category === "venta_mostrador") {
      const matchOrder = inc.concept.match(/PED-\d+/i);
      if (matchOrder) {
        const orderNum = matchOrder[0].toUpperCase();
        if (legitimateOrderDeposits.has(orderNum)) {
          // Es un duplicado generado por el POS/sucursal del pedido especial, descartar
          continue;
        }
      }
    }

    // D) Evitar duplicados por proximidad de tiempo (mismo monto, mismo cajero, mismo concepto dentro de 3 minutos)
    const isProximityDuplicate = cleaned.some((prev) => {
      const sameAmount = Math.abs(prev.amount - inc.amount) < 0.01;
      const sameCashier = prev.cashier === inc.cashier;
      const sameCategory = prev.category === inc.category;
      const sameConcept = prev.concept.trim().toLowerCase() === inc.concept.trim().toLowerCase();
      
      if (sameAmount && sameCashier && sameCategory && sameConcept) {
        const tPrev = new Date(prev.timestamp || 0).getTime();
        const tInc = new Date(inc.timestamp || 0).getTime();
        if (tPrev && tInc && Math.abs(tPrev - tInc) < 180000) {
          return true;
        }
        if (prev.date === inc.date) {
          return true;
        }
      }
      return false;
    });

    if (isProximityDuplicate) {
      continue;
    }

    if (inc.id) seenIds.add(inc.id);
    cleaned.push(inc);
  }

  return cleaned;
}

/**
 * Obtiene todos los ingresos guardados en el almacenamiento local con limpieza automática de duplicados.
 * NO APLICA NINGÚN LÍMITE ARTIFICIAL DE DINERO (acepta desde $1 hasta cualquier monto sin tope).
 */
export function getStoredIncomes(): CashIncome[] {
  if (typeof window === "undefined") return INITIAL_INCOMES;
  try {
    const raw = localStorage.getItem(STORAGE_INCOMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validador universal: número válido > 0 (sin tope superior)
        const valid = parsed.filter(
          (i: any) => typeof i.amount === "number" && !isNaN(i.amount) && i.amount > 0
        );
        const deduplicated = cleanDuplicateIncomes(valid);
        if (deduplicated.length !== parsed.length) {
          localStorage.setItem(STORAGE_INCOMES_KEY, JSON.stringify(deduplicated));
        }
        return deduplicated;
      }
    }
  } catch (err) {
    console.error("[Incomes] Error leyendo brito_cash_incomes:", err);
  }
  return INITIAL_INCOMES;
}

/**
 * Guarda la lista de ingresos de forma limpia y despacha el evento reactivo brito_incomes_updated
 */
export function saveStoredIncomes(incomes: CashIncome[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = cleanDuplicateIncomes(incomes);
    localStorage.setItem(STORAGE_INCOMES_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new Event("brito_incomes_updated"));
  } catch (err) {
    console.error("[Incomes] Error guardando brito_cash_incomes:", err);
  }
}

/**
 * Registra un nuevo ingreso directo en brito_cash_incomes asegurando que NUNCA se duplique
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

  // 1. Si es venta de mostrador pero el concepto dice que es Anticipo/Liquidación de un PED-XXX:
  // Rechazarla si ya existe un abono_pedido para ese pedido
  if (income.category === "venta_mostrador" && /PED-\d+/i.test(income.concept)) {
    const match = income.concept.match(/PED-\d+/i);
    if (match) {
      const orderNum = match[0].toUpperCase();
      const existingOrder = current.find(
        (i) =>
          (i.orderNumber?.toUpperCase() === orderNum || i.concept.toUpperCase().includes(orderNum)) &&
          Math.abs(i.amount - income.amount) < 0.01
      );
      if (existingOrder) {
        return existingOrder;
      }
    }
  }

  // 2. Si es abono de pedido, evitar registrar doble si ya existe para este orderNumber y monto
  if (income.orderNumber) {
    const existingOrder = current.find(
      (i) => i.orderNumber === income.orderNumber && Math.abs(i.amount - income.amount) < 0.01
    );
    if (existingOrder) {
      return existingOrder;
    }
  }

  // 3. Evitar duplicados por ID o saleId normalizado
  if (income.id && current.some((i) => i.id === income.id)) {
    return current.find((i) => i.id === income.id)!;
  }
  if (income.saleId) {
    const norm = income.saleId.toLowerCase().replace(/^(pos-|ing-)/, "");
    const existing = current.find(
      (i) => i.saleId && i.saleId.toLowerCase().replace(/^(pos-|ing-)/, "") === norm
    );
    if (existing) {
      return existing;
    }
  }

  // 4. Evitar duplicados por coincidencia exacta de concepto, monto y cajero creados en los últimos 30 segundos
  const now = new Date();
  const duplicateRecently = current.find((i) => {
    const sameAmount = Math.abs(i.amount - income.amount) < 0.01;
    const sameCashier = i.cashier === income.cashier;
    const sameConcept = i.concept.trim().toLowerCase() === income.concept.trim().toLowerCase();
    if (sameAmount && sameCashier && sameConcept) {
      const tPrev = new Date(i.timestamp || 0).getTime();
      if (tPrev && Math.abs(now.getTime() - tPrev) < 30000) {
        return true;
      }
    }
    return false;
  });

  if (duplicateRecently) {
    return duplicateRecently;
  }

  const formattedDate =
    income.date || `Hoy, ${now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;

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

  const updated = cleanDuplicateIncomes([newIncome, ...current]);
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
 * Captura desde 1 solo pan ($5-$12 MXN) hasta compras de mayoreo sin duplicación.
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
  // Si la venta es en realidad un anticipo o pedido especial, ignorarla porque orders.ts ya la registra como abono_pedido
  if (/Anticipo Pedido|Liquidaci[oó]n Pedido|PED-\d+/i.test(params.itemsSummary)) {
    const current = getStoredIncomes();
    const existing = current.find(
      (i) => i.concept.includes(params.itemsSummary) || (params.saleId && i.saleId === params.saleId)
    );
    if (existing) return existing;
  }

  const conceptText = params.itemsSummary
    ? `Compra de mostrador: ${params.itemsSummary}`
    : `Venta de pan en mostrador (Ticket #${params.saleId})`;

  const cleanSaleId = params.saleId.replace(/^(POS-|pos-)/i, "");

  return recordCashIncome({
    id: `ING-${cleanSaleId}`,
    saleId: params.saleId,
    amount: params.total,
    category: "venta_mostrador",
    categoryLabel: "Venta Mostrador (Panadería / POS)",
    paymentMethod: params.paymentMethod,
    concept: conceptText,
    customerId: params.customerId,
    customerName:
      params.customerName && params.customerName !== "Público General"
        ? params.customerName
        : "Público general",
    cashier: params.cashier || "Cajero Mostrador",
    branchId: params.branchId,
    branchName: params.branchName || "Sucursal Matriz Centro",
    referenceNumber: params.referenceNumber,
    date: params.date,
  });
}

/**
 * Sincroniza y recupera de forma estricta y sin duplicados las ventas de brito_pos_current_sales
 */
export function syncMissingSalesToIncomes(): void {
  if (typeof window === "undefined") return;
  try {
    const currentIncomes = getStoredIncomes();
    const existingSaleIds = new Set(
      currentIncomes
        .filter((i) => i.saleId)
        .map((i) => i.saleId!.toLowerCase().replace(/^(pos-|ing-)/i, ""))
    );

    let hasNew = false;
    const newIncomesToAdd: CashIncome[] = [];

    // Solo revisar ventas auténticas de la terminal POS local (brito_pos_current_sales)
    // NUNCA incluir brito_simulated_sales porque contiene copias de las mismas ventas
    const rawPosSales = localStorage.getItem("brito_pos_current_sales");
    if (rawPosSales) {
      const posSales: Sale[] = JSON.parse(rawPosSales);
      if (Array.isArray(posSales)) {
        for (const s of posSales) {
          const normId = s.id.toLowerCase().replace(/^(pos-|ing-)/i, "");
          if (!existingSaleIds.has(normId) && s.total > 0) {
            existingSaleIds.add(normId);
            const itemsSummary =
              s.items?.map((item) => `${item.quantity}x ${item.product.name}`).join(", ") || "Venta de pan";
            newIncomesToAdd.push({
              id: `ING-${normId}`,
              saleId: s.id,
              amount: s.total,
              category: "venta_mostrador",
              categoryLabel: "Venta Mostrador (Panadería / POS)",
              paymentMethod: s.paymentMethod,
              concept: `Compra de mostrador: ${itemsSummary}`,
              customerId: s.customerId,
              customerName:
                s.customerName && s.customerName !== "Público General"
                  ? s.customerName
                  : "Público general",
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

    if (hasNew && newIncomesToAdd.length > 0) {
      const combined = cleanDuplicateIncomes([...newIncomesToAdd, ...currentIncomes]);
      saveStoredIncomes(combined);
    }
  } catch (err) {
    console.error("[Incomes] Error sincronizando ventas a ingresos:", err);
  }
}

// ─── SINCRONIZACIÓN EN TIEMPO REAL MULTI-SUCURSAL (WebSocket) ───────────
if (typeof window !== "undefined") {
  // 1. Escuchar ventas remotas en tiempo real de otras sucursales
  realtimeHub.onSale((sale) => {
    try {
      if (!sale || sale.total <= 0) return;
      // Si la venta es un pedido especial (abono/liquidación), se ignora aquí porque se recibe por onOrder
      if (/Anticipo Pedido|Liquidaci[oó]n Pedido|PED-\d+/i.test(sale.itemsSummary)) {
        return;
      }
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
