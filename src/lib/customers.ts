import { Customer, CustomerPurchase } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { formatDateTimeSafe } from "@/lib/utils";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export const STORAGE_CUSTOMERS_KEY = "brito_customers";

export const DEFAULT_GENERAL_CUSTOMER: Customer = {
  id: "cli-0",
  name: "Público en General",
  phone: "N/A",
  type: "general",
  creditLimit: 0,
  currentDebt: 0,
  totalPurchases: 0,
  notes: "Venta de mostrador al contado para público en general.",
  registeredAt: "2026-01-01",
};

export const INITIAL_CUSTOMERS: Customer[] = [];

/**
 * Normaliza nombres de clientes para comparaciones infalibles:
 * remueve espacios superfluos, convierte a minúsculas y elimina acentos/diacríticos.
 */
export function normalizeCustomerName(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Purgador explícito y exhaustivo de clientes duplicados en almacenamiento local.
 * Fusiona historial de compras, teléfonos, notas, productos favoritos y direcciones,
 * eliminando definitivamente las filas repetidas y guardando el catálogo limpio.
 */
export function purgeDuplicateCustomers(): { totalBefore: number; totalAfter: number; removedCount: number } {
  if (typeof window === "undefined") return { totalBefore: 0, totalAfter: 0, removedCount: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (!raw) return { totalBefore: 0, totalAfter: 0, removedCount: 0 };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return { totalBefore: 0, totalAfter: 0, removedCount: 0 };

    const totalBefore = parsed.length;
    const seenMap = new Map<string, Customer>();

    for (const c of parsed) {
      if (!c || c.id === "cli-0" || c.type === "general") continue;
      const norm = normalizeCustomerName(c.name);
      if (!norm) continue;

      if (!seenMap.has(norm)) {
        seenMap.set(norm, { ...c });
      } else {
        const existing = seenMap.get(norm)!;
        if (existing.id.startsWith("cli-") && !c.id.startsWith("cli-")) {
          existing.id = c.id;
        }
        if ((!existing.phone || existing.phone === "N/A" || existing.phone === "Sin teléfono") && c.phone && c.phone !== "N/A" && c.phone !== "Sin teléfono") {
          existing.phone = c.phone;
        }
        if (!existing.notes && c.notes) existing.notes = c.notes;
        if (!existing.address && c.address) existing.address = c.address;
        if (!existing.email && c.email) existing.email = c.email;
        if (!existing.favoriteProduct && c.favoriteProduct) existing.favoriteProduct = c.favoriteProduct;
        existing.totalPurchases = Math.max(existing.totalPurchases || 0, c.totalPurchases || 0);

        if (c.purchaseCounts && Object.keys(c.purchaseCounts).length > 0) {
          existing.purchaseCounts = { ...(existing.purchaseCounts || {}), ...c.purchaseCounts };
        }
        if (Array.isArray(c.purchaseHistory) && c.purchaseHistory.length > 0) {
          const histIds = new Set((existing.purchaseHistory || []).map((h: CustomerPurchase) => h.id));
          const toAdd = c.purchaseHistory.filter((h: CustomerPurchase) => !histIds.has(h.id));
          existing.purchaseHistory = [...(existing.purchaseHistory || []), ...toAdd];
        }
      }
    }

    const uniqueList = Array.from(seenMap.values());
    const totalAfter = uniqueList.length;
    const removedCount = totalBefore - totalAfter;

    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(uniqueList));
    window.dispatchEvent(new Event("brito_customers_updated"));

    return { totalBefore, totalAfter, removedCount };
  } catch (err) {
    console.error("Error al purgar clientes duplicados:", err);
    return { totalBefore: 0, totalAfter: 0, removedCount: 0 };
  }
}

const DELETED_CUSTOMERS_KEY = "brito_deleted_customer_ids";
const RETIRED_DEMO_CUSTOMER_IDS = ["cli-1", "cli-2", "cli-3", "cli-4"];
const RETIRED_DEMO_CUSTOMER_NAMES = new Set([
  "abarrotes 'la guadalupana' (don pepe)",
  "taqueria 'el pastorcito dorado'",
  "sra. maria gonzalez",
  "familia ramirez (vecinos)",
]);

export function getDeletedCustomerIds(): Set<string> {
  const set = new Set<string>(RETIRED_DEMO_CUSTOMER_IDS);
  if (typeof window === "undefined") return set;
  try {
    const raw = localStorage.getItem(DELETED_CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id: string) => set.add(id));
    }
  } catch {}
  return set;
}

export function markCustomerIdAsDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = getDeletedCustomerIds();
    ids.add(id);
    localStorage.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getStoredCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const deletedIds = getDeletedCustomerIds();
    // Depurar y eliminar cualquier cliente virtual de mostrador (cli-0 / general), clientes demo retirados y clientes eliminados
    const cleaned = parsed.filter(
      (c: Customer) =>
        c &&
        c.id !== "cli-0" &&
        c.type !== "general" &&
        !deletedIds.has(c.id) &&
        !RETIRED_DEMO_CUSTOMER_NAMES.has(normalizeCustomerName(c.name))
    );

    // Desduplicar clientes existentes por nombre normalizado (sin acentos, minúsculas, espacios colapsados)
    const seenNames = new Map<string, Customer>();
    const deduplicated: Customer[] = [];

    for (const c of cleaned) {
      const normalizedName = normalizeCustomerName(c.name);
      if (!normalizedName) continue;

      if (!seenNames.has(normalizedName)) {
        seenNames.set(normalizedName, c);
        deduplicated.push(c);
      } else {
        const existing = seenNames.get(normalizedName)!;
        // Si el duplicado tiene ID de Supabase y el existente tiene ID temporal cli-, preferir el de Supabase
        if (existing.id.startsWith("cli-") && !c.id.startsWith("cli-")) {
          existing.id = c.id;
        }
        // Fusionar datos complementarios en el registro principal
        if ((!existing.phone || existing.phone === "N/A" || existing.phone === "Sin teléfono") && c.phone && c.phone !== "N/A" && c.phone !== "Sin teléfono") {
          existing.phone = c.phone;
        }
        if (!existing.notes && c.notes) existing.notes = c.notes;
        if (!existing.address && c.address) existing.address = c.address;
        if (!existing.email && c.email) existing.email = c.email;
        if (!existing.favoriteProduct && c.favoriteProduct) existing.favoriteProduct = c.favoriteProduct;
        existing.totalPurchases = Math.max(existing.totalPurchases || 0, c.totalPurchases || 0);
        if (c.purchaseCounts && Object.keys(c.purchaseCounts).length > 0) {
          existing.purchaseCounts = { ...(existing.purchaseCounts || {}), ...c.purchaseCounts };
        }
        if (Array.isArray(c.purchaseHistory) && c.purchaseHistory.length > 0) {
          const histIds = new Set((existing.purchaseHistory || []).map((h: CustomerPurchase) => h.id));
          const toAdd = c.purchaseHistory.filter((h: CustomerPurchase) => !histIds.has(h.id));
          existing.purchaseHistory = [...(existing.purchaseHistory || []), ...toAdd];
        }
      }
    }

    if (deduplicated.length !== parsed.length) {
      localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return [];
  }
}

export function saveStoredCustomers(customers: Customer[]): void {
  if (typeof window === "undefined") return;
  try {
    // Desduplicar siempre antes de guardar con nombre normalizado
    const seen = new Set<string>();
    const unique: Customer[] = [];
    for (const c of customers) {
      const norm = normalizeCustomerName(c.name);
      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push(c);
      }
    }
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event("brito_customers_updated"));
  } catch (e) {
    console.error("Error saving customers to localStorage", e);
  }
}

export function addQuickCustomer(customerData: {
  name: string;
  phone?: string;
  type?: Customer["type"];
  creditLimit?: number;
  notes?: string;
  address?: string;
  email?: string;
  favoriteProduct?: string;
}): Customer {
  const current = getStoredCustomers();
  const cleanName = customerData.name.trim();
  const normalizedNew = normalizeCustomerName(cleanName);
  const cleanPhone = (customerData.phone || "").replace(/\D/g, "");

  // Verificar si ya existe un cliente con el mismo nombre o teléfono para NUNCA duplicar
  const existingIdx = current.findIndex((c) => {
    if (c.id === "cli-0") return false;
    const sameName = normalizeCustomerName(c.name) === normalizedNew;
    const cPhone = (c.phone || "").replace(/\D/g, "");
    const samePhone = cleanPhone.length >= 7 && cPhone.length >= 7 && cPhone === cleanPhone;
    return sameName || samePhone;
  });

  if (existingIdx !== -1) {
    const existing = current[existingIdx];
    const updatedCustomer: Customer = {
      ...existing,
      phone: (customerData.phone && customerData.phone !== "N/A" && customerData.phone !== "Sin teléfono") 
        ? customerData.phone.trim() 
        : existing.phone,
      address: customerData.address?.trim() || existing.address,
      notes: customerData.notes?.trim() || existing.notes,
      favoriteProduct: customerData.favoriteProduct?.trim() || existing.favoriteProduct,
    };
    current[existingIdx] = updatedCustomer;
    saveStoredCustomers(current);
    return updatedCustomer;
  }

  const newCustomer: Customer = {
    id: `cli-${Date.now()}`,
    name: cleanName,
    phone: customerData.phone?.trim() || "N/A",
    type: customerData.type || "frecuente",
    creditLimit: customerData.creditLimit || 0,
    currentDebt: 0,
    totalPurchases: 0,
    favoriteProduct: customerData.favoriteProduct?.trim() || undefined,
    purchaseCounts: {},
    purchaseHistory: [],
    notes: customerData.notes?.trim(),
    address: customerData.address?.trim(),
    email: customerData.email?.trim(),
    registeredAt: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const updated = [newCustomer, ...current];
  saveStoredCustomers(updated);
  return newCustomer;
}

export interface CustomerDuplicateGroup {
  name: string;
  phone: string;
  count: number;
  ids: string[];
  customers: Customer[];
}

/**
 * Identifica todos los clientes repetidos por nombre o teléfono en el catálogo
 */
export function identifyDuplicateCustomers(): CustomerDuplicateGroup[] {
  const customers = getStoredCustomers().filter((c) => c.id !== "cli-0" && c.type !== "general");
  const nameMap = new Map<string, Customer[]>();

  for (const c of customers) {
    const key = c.name ? c.name.trim().toLowerCase() : "";
    if (!key) continue;
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key)!.push(c);
  }

  const groups: CustomerDuplicateGroup[] = [];
  for (const [key, list] of nameMap.entries()) {
    if (list.length > 1) {
      groups.push({
        name: list[0].name.trim(),
        phone: list[0].phone || "N/A",
        count: list.length,
        ids: list.map((c) => c.id),
        customers: list,
      });
    }
  }

  return groups;
}

/**
 * Elimina por completo todos los contactos que estén repetidos en el catálogo
 */
export function purgeAllDuplicateCustomers(): { deletedCount: number; names: string[] } {
  const current = getStoredCustomers();
  const groups = identifyDuplicateCustomers();
  if (groups.length === 0) return { deletedCount: 0, names: [] };

  const idsToDelete = new Set<string>();
  const namesToDelete = new Set<string>();

  for (const g of groups) {
    namesToDelete.add(g.name.toLowerCase());
    g.ids.forEach((id) => idsToDelete.add(id));
  }

  const filtered = current.filter((c) => {
    if (idsToDelete.has(c.id)) return false;
    if (c.name && namesToDelete.has(c.name.trim().toLowerCase())) return false;
    return true;
  });

  const deletedCount = current.length - filtered.length;
  saveStoredCustomers(filtered);

  return {
    deletedCount,
    names: groups.map((g) => g.name),
  };
}

/**
 * Unifica los contactos repetidos dejando únicamente 1 registro limpio por cliente
 */
export function deduplicateKeepOneCustomers(): { unifiedCount: number; names: string[] } {
  const current = getStoredCustomers();
  const groups = identifyDuplicateCustomers();
  if (groups.length === 0) return { unifiedCount: 0, names: [] };

  const seen = new Set<string>();
  const unified: Customer[] = [];

  for (const c of current) {
    const key = c.name ? c.name.trim().toLowerCase() : "";
    if (!key) {
      unified.push(c);
      continue;
    }

    if (seen.has(key)) {
      const existing = unified.find((u) => u.name.trim().toLowerCase() === key);
      if (existing) {
        if ((!existing.phone || existing.phone === "N/A") && c.phone && c.phone !== "N/A") {
          existing.phone = c.phone;
        }
        if (!existing.notes && c.notes) {
          existing.notes = c.notes;
        }
        if (c.purchaseHistory && c.purchaseHistory.length > 0) {
          existing.purchaseHistory = [...(existing.purchaseHistory || []), ...c.purchaseHistory];
        }
      }
      continue;
    }

    seen.add(key);
    unified.push(c);
  }

  saveStoredCustomers(unified);
  return {
    unifiedCount: groups.length,
    names: groups.map((g) => g.name),
  };
}

/**
 * Registra los productos de una venta para un cliente y calcula automáticamente la MODA estadística
 * (el producto que compra con mayor frecuencia / más piezas)
 */
export function recordCustomerSale(
  customerId: string,
  items: { name: string; quantity: number; unitPrice?: number; subtotal?: number }[],
  saleAmount: number,
  branchName?: string,
  cashier?: string,
  paymentMethod?: string
): void {
  if (typeof window === "undefined" || !customerId || customerId === "cli-0") return;
  try {
    const customers = getStoredCustomers();
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx === -1) return;

    const customer = { ...customers[idx] };
    customer.totalPurchases = (customer.totalPurchases || 0) + saleAmount;

    // Actualizar conteos acumulados de compra por producto
    const counts: Record<string, number> = { ...(customer.purchaseCounts || {}) };
    for (const it of items) {
      if (it.name) {
        counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
      }
    }
    customer.purchaseCounts = counts;

    // Calcular la moda estadística (producto con mayor frecuencia acumulada)
    let maxCount = 0;
    let modeItem = customer.favoriteProduct || "";
    for (const [prodName, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        modeItem = prodName;
      }
    }

    if (modeItem) {
      customer.favoriteProduct = modeItem;
    }

    // Registrar en el historial de compras del cliente
    const newPurchase: CustomerPurchase = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: formatDateTimeSafe(new Date()),
      total: saleAmount,
      branchName: branchName || "Sucursal Matriz",
      cashier: cashier || "Don Toño Brito",
      paymentMethod: paymentMethod || "efectivo",
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal || (it.unitPrice ? it.unitPrice * it.quantity : undefined),
      })),
    };

    customer.purchaseHistory = [newPurchase, ...(customer.purchaseHistory || [])];

    customers[idx] = customer;
    saveStoredCustomers(customers);

    // Sincronizar actualización de compra acumulada en el servidor directo
    if (!customerId.startsWith("cli-")) {
      try {
        const supabase = createClient();
        supabase
          .from("customers")
          .update({ total_purchases: customer.totalPurchases })
          .eq("id", customerId)
          .then();
      } catch (err) {
        console.warn("Error updating customer total_purchases on server:", err);
      }
    }
  } catch (e) {
    console.error("Error recording customer purchase mode", e);
  }
}

/**
 * Revierte una compra del cliente cuando se cancela/anula un ticket en el POS.
 */
export function revertCustomerSale(
  customerId: string,
  items: { name: string; quantity: number }[],
  saleAmount: number
): void {
  if (typeof window === "undefined" || !customerId || customerId === "cli-0") return;
  try {
    const customers = getStoredCustomers();
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx === -1) return;

    const customer = { ...customers[idx] };
    customer.totalPurchases = Math.max(0, (customer.totalPurchases || 0) - saleAmount);

    const counts: Record<string, number> = { ...(customer.purchaseCounts || {}) };
    for (const it of items) {
      if (it.name && counts[it.name]) {
        counts[it.name] = Math.max(0, counts[it.name] - (it.quantity || 1));
      }
    }
    customer.purchaseCounts = counts;

    // Recalcular la moda estadística
    let maxCount = 0;
    let modeItem = "";
    for (const [prodName, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        modeItem = prodName;
      }
    }
    customer.favoriteProduct = modeItem || undefined;

    // Quitar del historial de compras del cliente
    if (Array.isArray(customer.purchaseHistory)) {
      customer.purchaseHistory = customer.purchaseHistory.filter(
        (p) => Math.abs(p.total - saleAmount) > 0.001
      );
    }

    customers[idx] = customer;
    saveStoredCustomers(customers);

    if (!customerId.startsWith("cli-")) {
      try {
        const supabase = createClient();
        supabase
          .from("customers")
          .update({ total_purchases: customer.totalPurchases })
          .eq("id", customerId)
          .then();
      } catch (err) {
        console.warn("Error updating customer total_purchases on server:", err);
      }
    }
  } catch (e) {
    console.error("Error reverting customer sale", e);
  }
}

/**
 * Consulta clientes en tiempo real desde la base de datos de Supabase.
 * Si la consulta es exitosa, fusiona y sincroniza con localStorage.
 */
export async function fetchCustomersFromDb(): Promise<{ customers: Customer[]; fromDb: boolean }> {
  const local = getStoredCustomers();
  if (typeof window === "undefined") {
    return { customers: local, fromDb: false };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const isCustInit = typeof window !== "undefined" && localStorage.getItem("brito_customers_initialized") === "true";
      if (data.length === 0 && isCustInit) {
        saveStoredCustomers([]);
        return { customers: [], fromDb: true };
      }

      if (data.length > 0) {
        const deletedIds = getDeletedCustomerIds();
        const seenNames = new Map<string, Customer>();
        const dbMapped: Customer[] = [];

        for (const row of data) {
          if (row.id === "cli-0" || row.type === "general" || deletedIds.has(row.id)) continue;
          const normName = (row.name || "").trim().toLowerCase();
          if (!normName) continue;

          const localMatch = local.find(
            (c) => c.id === row.id || c.name.trim().toLowerCase() === normName
          );

          if (!seenNames.has(normName)) {
            const item: Customer = {
              id: row.id,
              name: (row.name || "").trim(),
              phone: row.phone || localMatch?.phone || "N/A",
              email: row.email || localMatch?.email || undefined,
              address: row.address || localMatch?.address || undefined,
              type: (row.type as Customer["type"]) || localMatch?.type || "frecuente",
              creditLimit: Number(row.credit_limit || localMatch?.creditLimit || 0),
              currentDebt: Number(row.current_debt || localMatch?.currentDebt || 0),
              totalPurchases: Number(row.total_purchases || localMatch?.totalPurchases || 0),
              notes: row.notes || localMatch?.notes || undefined,
              registeredAt: row.created_at || localMatch?.registeredAt || new Date().toISOString(),
              createdAt: row.created_at ? new Date(row.created_at).getTime() : localMatch?.createdAt || Date.now(),
              favoriteProduct: localMatch?.favoriteProduct,
              purchaseCounts: localMatch?.purchaseCounts || {},
              purchaseHistory: localMatch?.purchaseHistory || [],
            };
            seenNames.set(normName, item);
            dbMapped.push(item);
          } else {
            // Si Supabase devuelve registros duplicados para el mismo nombre, consolidar datos
            const existing = seenNames.get(normName)!;
            if ((!existing.phone || existing.phone === "N/A" || existing.phone === "Sin teléfono") && row.phone && row.phone !== "N/A" && row.phone !== "Sin teléfono") {
              existing.phone = row.phone;
            }
            if (!existing.notes && row.notes) existing.notes = row.notes;
            if (!existing.address && row.address) existing.address = row.address;
            if (!existing.email && row.email) existing.email = row.email;
            existing.totalPurchases = Math.max(existing.totalPurchases || 0, Number(row.total_purchases || 0));
          }
        }

        // Conservar clientes locales que aún no se hayan sincronizado (excepto eliminados)
        const dbIds = new Set(dbMapped.map((c) => c.id));
        for (const loc of local) {
          if (deletedIds.has(loc.id)) continue;
          const normLocName = (loc.name || "").trim().toLowerCase();
          if (!dbIds.has(loc.id) && !seenNames.has(normLocName)) {
            seenNames.set(normLocName, loc);
            dbMapped.push(loc);
          }
        }

        saveStoredCustomers(dbMapped);
        return { customers: dbMapped, fromDb: true };
      }
    }
  } catch (err) {
    console.warn("Supabase fetchCustomers error, using local data:", err);
  }

  return { customers: local, fromDb: false };
}

/**
 * Inserta un nuevo cliente directamente en Supabase y lo almacena localmente.
 * Evita registrar dos veces el mismo cliente garantizando registro único.
 */
export async function createCustomerInDb(customerData: {
  name: string;
  phone?: string;
  type?: Customer["type"];
  creditLimit?: number;
  notes?: string;
  address?: string;
  email?: string;
  favoriteProduct?: string;
}): Promise<Customer> {
  const cleanName = customerData.name.trim();
  const normalizedNew = normalizeCustomerName(cleanName);
  const current = getStoredCustomers();

  // 1. Si ya existe un cliente con ese nombre en local, actualizarlo y reutilizarlo
  const existingLocal = current.find(
    (c) => normalizeCustomerName(c.name) === normalizedNew && c.id !== "cli-0"
  );

  if (existingLocal) {
    const updated = addQuickCustomer(customerData);
    updateCustomerInDb(updated.id, customerData).catch(() => {});
    return updated;
  }

  // 2. Registrar en local de inmediato (0ms) y transmitir por WebSocket al instante
  const localCustomer = addQuickCustomer(customerData);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("brito_customers_initialized", "true");
    } catch {}
    try {
      if (realtimeHub?.broadcastCustomer) {
        realtimeHub.broadcastCustomer("create", localCustomer);
      }
    } catch {}
  }

  // 3. Sincronizar en segundo plano con Supabase sin bloquear la interfaz
  void (async () => {
    try {
      const supabase = createClient();

      const { data: existingDb } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", cleanName)
        .limit(1);

      if (existingDb && existingDb.length > 0) {
        const dbRow = existingDb[0];
        const cur = getStoredCustomers();
        const idx = cur.findIndex(
          (c) => c.id === localCustomer.id || c.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (idx !== -1 && cur[idx].id !== dbRow.id) {
          cur[idx] = { ...cur[idx], id: dbRow.id };
          saveStoredCustomers(cur);
        }
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .insert({
          id: localCustomer.id,
          name: cleanName,
          phone: customerData.phone?.trim() || null,
          type: customerData.type || "frecuente",
          credit_limit: customerData.creditLimit || 0,
          current_debt: 0,
          total_purchases: 0,
          notes: customerData.notes?.trim() || null,
          address: customerData.address?.trim() || null,
          email: customerData.email?.trim() || null,
        })
        .select()
        .single();

      if (data && !error && data.id && data.id !== localCustomer.id) {
        const cur = getStoredCustomers();
        const idx = cur.findIndex(
          (c) => c.id === localCustomer.id || c.name.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (idx !== -1) {
          cur[idx] = { ...cur[idx], id: data.id };
          saveStoredCustomers(cur);
        }
      }
    } catch (err) {
      console.warn("Supabase insert customer failed, saved in local cache:", err);
    }
  })();

  return localCustomer;
}

/**
 * Actualiza los datos de un cliente localmente al instante (0ms) y sincroniza con Supabase en segundo plano.
 */
export async function updateCustomerInDb(
  id: string,
  updates: Partial<Customer>
): Promise<boolean> {
  const current = getStoredCustomers();
  const idx = current.findIndex((c) => c.id === id);
  let updatedCustomer: Customer | null = null;
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updates };
    updatedCustomer = current[idx];
    saveStoredCustomers(current);
  }

  if (typeof window !== "undefined") {
    try {
      if (realtimeHub?.broadcastCustomer) {
        realtimeHub.broadcastCustomer("update", updatedCustomer || { id, ...updates });
      }
    } catch {}
  }

  void (async () => {
    try {
      const supabase = createClient();
      const dbPayload: any = {};
      if (updates.name !== undefined) dbPayload.name = updates.name.trim();
      if (updates.phone !== undefined) dbPayload.phone = updates.phone.trim();
      if (updates.notes !== undefined) dbPayload.notes = updates.notes.trim();
      if (updates.type !== undefined) dbPayload.type = updates.type;
      if (updates.address !== undefined) dbPayload.address = updates.address.trim();
      if (updates.email !== undefined) dbPayload.email = updates.email.trim();
      if (updates.totalPurchases !== undefined) dbPayload.total_purchases = updates.totalPurchases;
      if (updates.creditLimit !== undefined) dbPayload.credit_limit = updates.creditLimit;
      if (updates.currentDebt !== undefined) dbPayload.current_debt = updates.currentDebt;

      if (!id.startsWith("cli-")) {
        await supabase.from("customers").update(dbPayload).eq("id", id);
      } else if (updatedCustomer?.name || updates.name) {
        const targetName = (updates.name || updatedCustomer?.name || "").trim();
        await supabase.from("customers").update(dbPayload).ilike("name", targetName);
      }
    } catch (err) {
      console.warn("Supabase update customer failed, updated local cache:", err);
    }
  })();

  return true;
}

/**
 * Elimina un cliente localmente al instante (0ms), transmite en tiempo real y borra en Supabase en paralelo.
 */
export async function deleteCustomerInDb(id: string, name?: string): Promise<boolean> {
  markCustomerIdAsDeleted(id);
  const current = getStoredCustomers();
  const target = current.find((c) => c.id === id);
  const targetName = name || target?.name || "";
  const cleanNorm = targetName ? normalizeCustomerName(targetName) : "";

  const filtered = current.filter((c) => {
    if (c.id === id) return false;
    if (cleanNorm && normalizeCustomerName(c.name) === cleanNorm) return false;
    return true;
  });
  saveStoredCustomers(filtered);

  if (typeof window !== "undefined") {
    try {
      if (realtimeHub?.broadcastCustomer) {
        realtimeHub.broadcastCustomer("delete", target || { id, name: targetName });
      }
    } catch {}
  }

  void (async () => {
    try {
      const supabase = createClient();
      const tasks: PromiseLike<any>[] = [];
      tasks.push(supabase.from("customers").delete().eq("id", id));
      if (targetName) {
        tasks.push(supabase.from("customers").delete().ilike("name", targetName.trim()));
      }
      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn("Supabase delete customer failed, removed from local cache:", err);
    }
  })();

  return true;
}

// Suscripción global para mantener el directorio de clientes sincronizado en tiempo real en cualquier módulo del ERP
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (realtimeHub?.onCustomer) {
      realtimeHub.onCustomer((payload) => {
        if (!payload || !payload.customer) return;
        const { action, customer } = payload;
        const current = getStoredCustomers();
        if (action === "delete") {
          if (customer.id) markCustomerIdAsDeleted(customer.id);
          const cleanDelNorm = customer.name ? normalizeCustomerName(customer.name) : "";
          const filtered = current.filter((c) => {
            if (c.id === customer.id) return false;
            if (cleanDelNorm && normalizeCustomerName(c.name) === cleanDelNorm) return false;
            return true;
          });
          if (filtered.length !== current.length) {
            saveStoredCustomers(filtered);
          }
        } else if (action === "update") {
          const exists = current.some((c) => c.id === customer.id);
          if (exists) {
            saveStoredCustomers(current.map((c) => (c.id === customer.id ? { ...c, ...customer } : c)));
          } else if (customer.id && customer.name) {
            saveStoredCustomers([...current, customer]);
          }
        } else if (action === "create") {
          const normName = customer.name ? normalizeCustomerName(customer.name) : "";
          if (!current.some((c) => c.id === customer.id || (normName && normalizeCustomerName(c.name) === normName))) {
            saveStoredCustomers([...current, customer]);
          }
        }
      });
    }
  }, 0);
}

