import { Product, Sale } from "@/types";
import { formatDateTimeSafe } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";

export function calculateEan13CheckDigit(digits12: string): number {
  const d = digits12.replace(/\D/g, "").slice(0, 12);
  if (d.length < 12) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(d[i], 10);
    sum += i % 2 === 0 ? num : num * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export const DEFAULT_PRODUCTS: Product[] = [];

export interface ProductCategory {
  id: string;
  label: string;
  priceTag?: string;
  icon: string;
}

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: "pan_dulce", label: "Pan Dulce Tradicional", priceTag: "", icon: "🥖" },
  { id: "pan_blanco", label: "Bolillo & Telera", priceTag: "", icon: "🍞" },
  { id: "pasteleria", label: "Pastelería & Pays", priceTag: "", icon: "🍰" },
  { id: "bebidas", label: "Cafetería & Bebidas", priceTag: "", icon: "☕" },
  { id: "temporada", label: "Especiales de Temporada", priceTag: "", icon: "✨" },
  { id: "abarrotes", label: "Abarrotes", priceTag: "", icon: "🥫" },
  { id: "materia_prima", label: "Materia Prima", priceTag: "", icon: "🌾" },
];

export const PRODUCT_CATEGORIES = [
  { id: "all", label: "Todas las Categorías", priceTag: "", icon: "🧺" },
  ...DEFAULT_PRODUCT_CATEGORIES,
];

const CATEGORIES_STORAGE_KEY = "brito_categories_v1";

export function getStoredCategories(): ProductCategory[] {
  if (typeof window === "undefined") {
    return DEFAULT_PRODUCT_CATEGORIES;
  }
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCT_CATEGORIES));
      return DEFAULT_PRODUCT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCT_CATEGORIES));
      return DEFAULT_PRODUCT_CATEGORIES;
    }
    return parsed;
  } catch {
    return DEFAULT_PRODUCT_CATEGORIES;
  }
}

export function saveStoredCategories(categories: ProductCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event("brito_categories_updated"));
  } catch (err) {
    console.error("Error saving categories:", err);
  }
}

export function addCategory(data: { label: string; icon?: string; id?: string }): ProductCategory {
  const current = getStoredCategories();
  let cleanId = (data.id || data.label)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!cleanId) cleanId = `cat_${Date.now()}`;

  let candidate = cleanId;
  let counter = 1;
  while (current.some((c) => c.id === candidate) || candidate === "all") {
    candidate = `${cleanId}_${counter}`;
    counter++;
  }

  const newCat: ProductCategory = {
    id: candidate,
    label: data.label.trim(),
    icon: data.icon?.trim() || "🏷️",
    priceTag: "",
  };

  const updated = [...current, newCat];
  saveStoredCategories(updated);
  return newCat;
}

export function updateCategory(id: string, updates: { label?: string; icon?: string }): ProductCategory | null {
  const current = getStoredCategories();
  const index = current.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const updatedCat: ProductCategory = {
    ...current[index],
    label: updates.label !== undefined ? updates.label.trim() : current[index].label,
    icon: updates.icon !== undefined ? updates.icon.trim() || "🏷️" : current[index].icon,
  };

  current[index] = updatedCat;
  saveStoredCategories(current);
  return updatedCat;
}

export function deleteCategory(id: string, reassignToCatId?: string): boolean {
  const current = getStoredCategories();
  if (!current.some((c) => c.id === id)) return false;

  const filtered = current.filter((c) => c.id !== id);
  saveStoredCategories(filtered);

  // Reasignar productos de la categoría eliminada
  const targetCategory = reassignToCatId || (filtered[0]?.id ?? "pan_dulce");
  const prods = getStoredProducts();
  let modified = false;
  const updatedProds = prods.map((p) => {
    if (p.category === id) {
      modified = true;
      return { ...p, category: targetCategory };
    }
    return p;
  });
  if (modified) {
    saveStoredProducts(updatedProds);
  }

  return true;
}

const STORAGE_KEY = "brito_products_v6";

export function generateProductBarcode(): string {
  const current = getStoredProducts();
  let base = `75010001${String(current.length + 1).padStart(4, "0")}`;
  let candidate = `${base}${calculateEan13CheckDigit(base)}`;
  let attempt = 1;
  while (current.some((p) => p.barcode === candidate)) {
    base = `75010001${String(current.length + 1 + attempt).padStart(4, "0")}`;
    candidate = `${base}${calculateEan13CheckDigit(base)}`;
    attempt++;
  }
  return candidate;
}

export function findProductByBarcodeOrCode(query: string, productsList?: Product[]): Product | undefined {
  const rawList = productsList && productsList.length > 0 ? productsList : getStoredProducts();
  // Ensure we also consult stored products in case productsList in memory was stale or missing barcodes
  const storedList = getStoredProducts();
  const seenIds = new Set<string>();
  const list: Product[] = [];
  for (const item of [...rawList, ...storedList]) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      list.push(item);
    }
  }

  const clean = query.trim().toUpperCase();
  if (!clean) return undefined;

  // 1. Coincidencia exacta por código de barras
  const byBarcode = list.find((p) => p.barcode && p.barcode.trim().toUpperCase() === clean);
  if (byBarcode) return byBarcode;

  // 2. Coincidencia numérica flexible (EAN-13, UPC-A, 12 vs 13 dígitos)
  const queryDigits = query.replace(/\D/g, "");
  if (queryDigits.length >= 3) {
    // 2a. Comparación exacta de solo dígitos
    const byExactDigits = list.find((p) => {
      if (!p.barcode) return false;
      const pDigits = p.barcode.replace(/\D/g, "");
      return pDigits === queryDigits;
    });
    if (byExactDigits) return byExactDigits;

    // 2b. Query tiene 13 dígitos y producto tiene 12 dígitos (falta dígito verificador en producto)
    if (queryDigits.length === 13) {
      const query12 = queryDigits.slice(0, 12);
      const by12 = list.find((p) => {
        if (!p.barcode) return false;
        const pDigits = p.barcode.replace(/\D/g, "");
        return pDigits === query12;
      });
      if (by12) return by12;
    }

    // 2c. Query tiene 12 dígitos y producto tiene 13 dígitos (escáner sin dígito verificador o UPC)
    if (queryDigits.length === 12) {
      const by13 = list.find((p) => {
        if (!p.barcode) return false;
        const pDigits = p.barcode.replace(/\D/g, "");
        return pDigits.length === 13 && pDigits.slice(0, 12) === queryDigits;
      });
      if (by13) return by13;
    }

    // 2d. Compatibilidad con ceros a la izquierda (UPC-A vs EAN-13)
    const strippedQuery = queryDigits.replace(/^0+/, "");
    if (strippedQuery.length >= 4) {
      const byStripped = list.find((p) => {
        if (!p.barcode) return false;
        const pDigits = p.barcode.replace(/\D/g, "").replace(/^0+/, "");
        return pDigits === strippedQuery || 
               (pDigits.length > 4 && (pDigits.startsWith(strippedQuery) || strippedQuery.startsWith(pDigits)));
      });
      if (byStripped) return byStripped;
    }
  }

  // 3. Coincidencia exacta por código corto (ej. PAN-001, BLA-001)
  const byCode = list.find((p) => p.code && p.code.trim().toUpperCase() === clean);
  if (byCode) return byCode;

  // 4. Coincidencia exacta por ID de producto
  const byId = list.find((p) => p.id && p.id.trim().toUpperCase() === clean);
  if (byId) return byId;

  return undefined;
}

export function generateProductCode(category?: string): string {
  const current = getStoredProducts();
  const prefixMap: Record<string, string> = {
    pan_dulce: "PAN",
    pan_blanco: "BLA",
    pasteleria: "PAS",
    bebidas: "BEB",
    temporada: "TEM",
    abarrotes: "AB",
    materia_prima: "MP",
  };
  const customPrefix = category ? category.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() : "";
  const prefix = (category && prefixMap[category]) || (customPrefix.length >= 2 ? customPrefix : "PRD");
  const existingInCat = current.filter((p) => p.code?.startsWith(prefix) || p.category === category);
  const nextNum = existingInCat.length + 1;
  let codeCandidate = `${prefix}-${String(nextNum).padStart(3, "0")}`;
  let attempt = 1;
  while (current.some((p) => p.code?.toUpperCase() === codeCandidate.toUpperCase())) {
    codeCandidate = `${prefix}-${String(nextNum + attempt).padStart(3, "0")}`;
    attempt++;
  }
  return codeCandidate;
}

export function calculateProductTaxes(
  price: number,
  hasIva: boolean = false,
  ivaRate: number = 0,
  hasIeps: boolean = false,
  iepsRate: number = 0,
  taxIncluded: boolean = true
) {
  const safePrice = Math.max(0, price || 0);
  const safeIvaRate = hasIva ? Math.max(0, ivaRate || 0) : 0;
  const safeIepsRate = hasIeps ? Math.max(0, iepsRate || 0) : 0;

  if (taxIncluded) {
    const totalTaxPercent = (safeIvaRate + safeIepsRate) / 100;
    const basePrice = totalTaxPercent > 0 ? safePrice / (1 + totalTaxPercent) : safePrice;
    const ivaAmount = basePrice * (safeIvaRate / 100);
    const iepsAmount = basePrice * (safeIepsRate / 100);
    return {
      basePrice: Number(basePrice.toFixed(2)),
      ivaAmount: Number(ivaAmount.toFixed(2)),
      iepsAmount: Number(iepsAmount.toFixed(2)),
      totalPrice: Number(safePrice.toFixed(2)),
      totalTaxes: Number((ivaAmount + iepsAmount).toFixed(2)),
    };
  } else {
    const basePrice = safePrice;
    const ivaAmount = basePrice * (safeIvaRate / 100);
    const iepsAmount = basePrice * (safeIepsRate / 100);
    const totalPrice = basePrice + ivaAmount + iepsAmount;
    return {
      basePrice: Number(basePrice.toFixed(2)),
      ivaAmount: Number(ivaAmount.toFixed(2)),
      iepsAmount: Number(iepsAmount.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2)),
      totalTaxes: Number((ivaAmount + iepsAmount).toFixed(2)),
    };
  }
}

const DELETED_PRODUCTS_KEY = "brito_deleted_product_ids";
const RETIRED_DEMO_PRODUCT_IDS = [
  "prod-1",
  "prod-2",
  "prod-3",
  "prod-4",
  "prod-5",
  "prod-6",
  "prod-7",
  "prod-8",
  "prod-9",
  "prod-10",
  "prod-11",
  "prod-12",
  "prod-13",
  "prod-14",
];

export function getDeletedProductIds(): Set<string> {
  const set = new Set<string>(RETIRED_DEMO_PRODUCT_IDS);
  if (typeof window === "undefined") return set;
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id: string) => set.add(id));
    }
  } catch {}
  return set;
}

export function markProductIdAsDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const ids = getDeletedProductIds();
    ids.add(id);
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getStoredProducts(): Product[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const deletedIds = getDeletedProductIds();
    const activeProducts = parsed.filter((p: Product) => p && p.id && !deletedIds.has(p.id));
    if (activeProducts.length !== parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProducts));
      } catch {}
    }
    if (activeProducts.length === 0) return [];

    let needsResave = false;
    const normalized = activeProducts.map((p: Product, idx: number) => {
      const defaultMatch = DEFAULT_PRODUCTS.find(dp => dp.id === p.id);
      let barcode = p.barcode || defaultMatch?.barcode;

      if (barcode) {
        const digits = barcode.replace(/\D/g, "");
        // Si tiene 12 dígitos, migrar a 13 dígitos con su dígito verificador EAN-13
        if (digits.length === 12) {
          barcode = `${digits}${calculateEan13CheckDigit(digits)}`;
          needsResave = true;
        }
      } else {
        const base = `75010001${String(idx + 1).padStart(4, "0")}`;
        barcode = `${base}${calculateEan13CheckDigit(base)}`;
        needsResave = true;
      }

      const code = p.code || defaultMatch?.code || `PRD-${String(idx + 1).padStart(3, "0")}`;
      if (code !== p.code || barcode !== p.barcode) {
        needsResave = true;
      }

      return {
        ...p,
        code,
        barcode,
        hasIva: p.hasIva !== undefined ? p.hasIva : (defaultMatch?.hasIva ?? false),
        ivaRate: p.ivaRate !== undefined ? p.ivaRate : (defaultMatch?.ivaRate ?? (p.hasIva ? 16 : 0)),
        hasIeps: p.hasIeps !== undefined ? p.hasIeps : (defaultMatch?.hasIeps ?? false),
        iepsRate: p.iepsRate !== undefined ? p.iepsRate : (defaultMatch?.iepsRate ?? (p.hasIeps ? 8 : 0)),
        taxIncluded: p.taxIncluded !== undefined ? p.taxIncluded : true,
      };
    });

    if (needsResave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } catch (e) {}
    }

    return normalized;
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
  const safeStock = Math.max(0, newStock);
  const updated = current.map((p) => (p.id === id ? { ...p, stock: safeStock } : p));
  saveStoredProducts(updated);

  if (typeof window !== "undefined") {
    try {
      const supabase = createClient();
      supabase.from("products").update({ stock: safeStock }).eq("id", id).then();
    } catch {}
  }
}

export function updateProductPrice(id: string, newPrice: number): void {
  const current = getStoredProducts();
  const safePrice = Math.max(0, newPrice);
  const updated = current.map((p) => (p.id === id ? { ...p, price: safePrice } : p));
  saveStoredProducts(updated);

  if (typeof window !== "undefined") {
    try {
      const supabase = createClient();
      supabase.from("products").update({ price: safePrice }).eq("id", id).then();
    } catch {}
  }
}

export function addProduct(product: Omit<Product, "id">): Product {
  const current = getStoredProducts();
  const assignedCode = product.code?.trim() || generateProductCode(product.category);
  const assignedBarcode = product.barcode?.trim() || generateProductBarcode();
  const newProduct: Product = {
    ...product,
    code: assignedCode.toUpperCase(),
    barcode: assignedBarcode,
    id: `prod-${Date.now()}`,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("brito_catalog_initialized", "true");
    } catch {}
  }

  saveStoredProducts([...current, newProduct]);

  if (typeof window !== "undefined") {
    try {
      const supabase = createClient();
      supabase.from("products").upsert({
        id: newProduct.id,
        code: newProduct.code,
        barcode: newProduct.barcode,
        name: newProduct.name,
        price: Number(newProduct.price),
        cost: newProduct.cost !== undefined ? Number(newProduct.cost) : null,
        category: newProduct.category,
        image: newProduct.image || null,
        icon: newProduct.icon || "🥖",
        stock: Number(newProduct.stock) || 0,
        description: newProduct.description || null,
        unit: newProduct.unit || "pieza",
        has_iva: !!newProduct.hasIva,
        iva_rate: Number(newProduct.ivaRate) || 0,
        has_ieps: !!newProduct.hasIeps,
        ieps_rate: Number(newProduct.iepsRate) || 0,
        tax_included: newProduct.taxIncluded !== undefined ? newProduct.taxIncluded : true,
        is_active: true,
      }, { onConflict: "id" }).then();
    } catch {}

    try {
      if (realtimeHub?.broadcastProduct) {
        realtimeHub.broadcastProduct("create", newProduct);
      }
    } catch {}
  }

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

  if (typeof window !== "undefined" && updatedItem) {
    const itemToSync: Product = updatedItem;
    try {
      const supabase = createClient();
      const fullPayload: any = {
        id: itemToSync.id,
        name: itemToSync.name,
        price: Number(itemToSync.price) || 0,
        cost: itemToSync.cost !== undefined ? Number(itemToSync.cost) : null,
        category: itemToSync.category || "pan_dulce",
        code: itemToSync.code || `PRD-${itemToSync.id}`,
        barcode: itemToSync.barcode || null,
        stock: Number(itemToSync.stock) || 0,
        image: itemToSync.image || null,
        icon: itemToSync.icon || "🥖",
        description: itemToSync.description || null,
        unit: itemToSync.unit || "pieza",
        is_active: true,
        has_iva: !!itemToSync.hasIva,
        iva_rate: Number(itemToSync.ivaRate) || 0,
        has_ieps: !!itemToSync.hasIeps,
        ieps_rate: Number(itemToSync.iepsRate) || 0,
        tax_included: itemToSync.taxIncluded !== undefined ? itemToSync.taxIncluded : true,
      };

      supabase
        .from("products")
        .upsert(fullPayload, { onConflict: "id" })
        .then(({ error }: any) => {
          if (error) {
            supabase.from("products").update(fullPayload).eq("id", id).then();
          }
        });
    } catch {}

    try {
      if (realtimeHub?.broadcastProduct) {
        realtimeHub.broadcastProduct("update", itemToSync);
      }
    } catch {}
  }

  return updatedItem;
}

export function deleteProduct(id: string): void {
  const current = getStoredProducts();
  const deletedItem = current.find((p) => p.id === id);
  markProductIdAsDeleted(id);
  saveStoredProducts(current.filter((p) => p.id !== id));

  if (typeof window !== "undefined") {
    try {
      const supabase = createClient();
      supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id)
        .then(({ error }: any) => {
          if (error && deletedItem?.code) {
            supabase.from("products").update({ is_active: false }).eq("code", deletedItem.code).then();
          }
        });
    } catch {}

    try {
      if (realtimeHub?.broadcastProduct) {
        realtimeHub.broadcastProduct("delete", deletedItem || { id });
      }
    } catch {}
  }
}

export async function fetchProductsFromDb(): Promise<Product[]> {
  if (typeof window === "undefined") return getStoredProducts();
  const isOffline =
    !navigator.onLine ||
    localStorage.getItem("brito_simulate_offline") === "true";
  if (isOffline) return getStoredProducts();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (row && row.id && row.is_active === false) {
          markProductIdAsDeleted(row.id);
        }
      }

      const deletedIds = getDeletedProductIds();
      const stored = getStoredProducts();
      const activeRows = data.filter((p: any) => p && p.id && p.is_active !== false && !deletedIds.has(p.id));

      if (activeRows.length > 0 || localStorage.getItem("brito_catalog_initialized") === "true") {
        const mapped: Product[] = activeRows.map((p: any) => {
          const storedMatch = stored.find((s) => s.id === p.id);
          return {
            id: p.id,
            code: p.code || storedMatch?.code || `PRD-${p.id}`,
            barcode: p.barcode || storedMatch?.barcode,
            name: p.name,
            price: Number(p.price),
            cost: p.cost !== undefined && p.cost !== null ? Number(p.cost) : (storedMatch?.cost !== undefined ? Number(storedMatch.cost) : undefined),
            category: p.category || p.category_id || storedMatch?.category || "pan_dulce",
            icon: p.icon || storedMatch?.icon || "🥖",
            stock: typeof p.stock === "number" ? p.stock : (storedMatch?.stock ?? 0),
            description: p.description || storedMatch?.description,
            image: p.image || storedMatch?.image,
            unit: p.unit || storedMatch?.unit || "pieza",
            hasIva: !!p.has_iva,
            ivaRate: Number(p.iva_rate) || 0,
            hasIeps: !!p.has_ieps,
            iepsRate: Number(p.ieps_rate) || 0,
            taxIncluded: p.tax_included !== undefined ? p.tax_included : true,
          };
        });

        const mergedMap = new Map<string, Product>();
        for (const sp of stored) {
          if (sp?.id && !deletedIds.has(sp.id)) mergedMap.set(sp.id, sp);
        }
        for (const mp of mapped) {
          if (mp?.id) mergedMap.set(mp.id, mp);
        }
        const finalProducts = Array.from(mergedMap.values());
        saveStoredProducts(finalProducts);
        return finalProducts;
      }
    }
  } catch (e) {
    console.warn("fetchProductsFromDb fallback to local:", e);
  }
  return getStoredProducts();
}

// Suscripción global para mantener el catálogo sincronizado en tiempo real en cualquier módulo del ERP
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (realtimeHub?.onProduct) {
      realtimeHub.onProduct((payload) => {
        if (!payload || !payload.product) return;
        const { action, product } = payload;
        const current = getStoredProducts();
        if (action === "delete") {
          if (product.id) markProductIdAsDeleted(product.id);
          const filtered = current.filter((p) => p.id !== product.id);
          if (filtered.length !== current.length) {
            saveStoredProducts(filtered);
          }
        } else if (action === "update") {
          const exists = current.some((p) => p.id === product.id);
          if (exists) {
            saveStoredProducts(current.map((p) => (p.id === product.id ? { ...p, ...product } : p)));
          } else if (product.id) {
            saveStoredProducts([...current, product]);
          }
        } else if (action === "create") {
          if (!current.some((p) => p.id === product.id)) {
            saveStoredProducts([...current, product]);
          }
        }
      });
    }
  }, 0);
}


