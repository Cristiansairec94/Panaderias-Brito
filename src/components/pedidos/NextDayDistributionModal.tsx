"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Truck,
  Printer,
  Copy,
  Check,
  Calendar,
  Clock,
  Store,
  ShoppingBag,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  FileText,
  Sparkles,
  AlertCircle,
  Package,
  Building2,
  Filter,
  Eye,
  Plus,
  Minus,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { CustomOrder, Branch, Product } from "@/types";
import { formatCurrency, formatDeliveryDateDisplay } from "@/lib/utils";
import { getStoredProducts, getStoredCategories, addCategory, ProductCategory } from "@/lib/products";

interface NextDayDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CustomOrder[];
  branches: Branch[];
  onViewOrderDetail?: (order: CustomOrder) => void;
  isAdmin?: boolean;
}

// Variedad de pan configurable para planificación y desglose
export interface BreadVariety {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  icon: string;
  defaultPrice?: number;
}

// Fila unificada de pan (pedidos de clientes + piezas añadidas manualmente)
export interface UnifiedBreadRow {
  key: string; // nombre normalizado
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  icon: string;
  price?: number;
  orderPieces: number;
  ordersCount: number;
  ordersDetails: {
    orderNumber: string;
    customerName: string;
    phone?: string;
    deliveryTime?: string;
    quantity: number;
    order: CustomOrder;
  }[];
  extraPieces: number;
  totalPieces: number;
}

// Interfaz para cada producto de pan extraído y sumado
export interface BreadSummaryItem {
  name: string;
  totalPieces: number;
  ordersCount: number;
  orderNumbers: string[];
  ordersDetails: {
    orderNumber: string;
    customerName: string;
    phone?: string;
    deliveryTime?: string;
    quantity: number;
    order: CustomOrder;
  }[];
}

// Resumen por sucursal
export interface BranchDistributionGroup {
  branchId: string;
  branchName: string;
  shortName: string;
  totalPieces: number;
  totalOrders: number;
  items: BreadSummaryItem[];
  orders: CustomOrder[];
}

// Catálogo base de panes tradicionales de Panadería Brito
export const DEFAULT_BAKERY_BREAD_VARIETIES: BreadVariety[] = [
  // Pan Blanco & Salado
  { id: "var_bolillo_tradicional", name: "Bolillo Tradicional", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 4.5 },
  { id: "var_bolillo_sal", name: "Bolillo de Sal / Rústico", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 5.0 },
  { id: "var_telera", name: "Telera", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 4.5 },
  { id: "var_baguette", name: "Baguette Tradicional", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 18.0 },
  { id: "var_mini_bolillo", name: "Mini Bolillo / Pambazo", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 3.5 },
  { id: "var_chapata", name: "Chapata Rústica", category: "pan_blanco", categoryLabel: "Pan Blanco & Sal", icon: "🥖", defaultPrice: 16.0 },

  // Pan Dulce Tradicional
  { id: "var_concha_vainilla", name: "Concha de Vainilla", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_concha_chocolate", name: "Concha de Chocolate", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_concha_fresa", name: "Concha de Fresa", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_cuerno_mantequilla", name: "Cuerno de Mantequilla", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 13.0 },
  { id: "var_cuerno_chocolate", name: "Cuerno de Chocolate", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 15.0 },
  { id: "var_dona_azucar", name: "Dona de Azúcar", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🍩", defaultPrice: 11.0 },
  { id: "var_dona_chocolate", name: "Dona de Chocolate", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🍩", defaultPrice: 13.0 },
  { id: "var_bisquet", name: "Bisquet Tradicional", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_mantecada_vainilla", name: "Mantecada de Vainilla", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🧁", defaultPrice: 11.0 },
  { id: "var_mantecada_nuez", name: "Mantecada de Nuez", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🧁", defaultPrice: 13.0 },
  { id: "var_polvoron_naranja", name: "Polvorón de Naranja / Canela", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🍪", defaultPrice: 10.0 },
  { id: "var_ojo_pancha", name: "Ojo de Buey / Pancha", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_rebanada_mantequilla", name: "Rebanada de Mantequilla", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🍞", defaultPrice: 11.0 },
  { id: "var_cocol_anis", name: "Cocol de Anís", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 11.0 },
  { id: "var_puerquito_piloncillo", name: "Puerquito de Piloncillo", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🐷", defaultPrice: 12.0 },
  { id: "var_novia", name: "Novia de Azúcar", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_piedra", name: "Piedra de Chocolate", category: "pan_dulce", categoryLabel: "Pan Dulce Tradicional", icon: "🪨", defaultPrice: 10.0 },

  // Hojaldres & Rellenos
  { id: "var_oreja_hojaldre", name: "Oreja de Hojaldre", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_banderilla", name: "Banderilla de Hojaldre", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥐", defaultPrice: 12.0 },
  { id: "var_empanada_pina", name: "Empanada de Piña", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥟", defaultPrice: 14.0 },
  { id: "var_empanada_crema", name: "Empanada de Crema Pastelera", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥟", defaultPrice: 14.0 },
  { id: "var_empanada_manzana", name: "Empanada de Manzana", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥟", defaultPrice: 14.0 },
  { id: "var_cuerno_relleno", name: "Cuerno Relleno de Crema", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥐", defaultPrice: 16.0 },
  { id: "var_volovan_jamon", name: "Volován Jamón y Queso", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥟", defaultPrice: 18.0 },
  { id: "var_barquillo_crema", name: "Barquillo de Crema", category: "hojaldre", categoryLabel: "Hojaldres & Rellenos", icon: "🥐", defaultPrice: 15.0 },

  // Pastelería & Repostería
  { id: "var_rol_canela", name: "Rol de Canela Glaseado", category: "pasteleria", categoryLabel: "Pastelería & Repostería", icon: "🍥", defaultPrice: 18.0 },
  { id: "var_trenza_nuez", name: "Trenza de Nuez y Canela", category: "pasteleria", categoryLabel: "Pastelería & Repostería", icon: "🥐", defaultPrice: 20.0 },
  { id: "var_pastel_individual", name: "Pastel Individual Tres Leches", category: "pasteleria", categoryLabel: "Pastelería & Repostería", icon: "🍰", defaultPrice: 45.0 },
  { id: "var_pay_queso", name: "Rebanada Pay de Queso", category: "pasteleria", categoryLabel: "Pastelería & Repostería", icon: "🥧", defaultPrice: 38.0 },
  { id: "var_tartaleta_fruta", name: "Tartaleta de Frutas", category: "pasteleria", categoryLabel: "Pastelería & Repostería", icon: "🧁", defaultPrice: 32.0 },
];

const mapProductCategoryToBreadCat = (catId?: string, availableCats: ProductCategory[] = []): string => {
  if (!catId) return "pan_dulce";
  const c = catId.toLowerCase().trim();
  const matched = availableCats.find(
    (cat) => cat.id.toLowerCase() === c || cat.label.toLowerCase() === c
  );
  if (matched) return matched.id;
  if (c.includes("blanco") || c.includes("bolillo") || c.includes("telera")) return "pan_blanco";
  if (c.includes("dulce") || c.includes("dona") || c.includes("concha")) return "pan_dulce";
  if (c.includes("hojaldre") || c.includes("empanada")) return "hojaldre";
  if (c.includes("pastel") || c.includes("pay") || c.includes("reposteria")) return "pasteleria";
  if (c.includes("temporada")) return "temporada";
  return catId;
};

const getCategoryLabel = (cat: string, availableCats: ProductCategory[] = []): string => {
  const match = availableCats.find((c) => c.id === cat || c.label.toLowerCase() === cat.toLowerCase());
  if (match) return match.label;
  switch (cat) {
    case "pan_blanco": return "Pan Blanco & Sal";
    case "pan_dulce": return "Pan Dulce Tradicional";
    case "hojaldre": return "Hojaldres & Rellenos";
    case "pasteleria": return "Pastelería & Repostería";
    case "temporada": return "Especiales de Temporada";
    default: return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
  }
};

const getCategoryIcon = (cat: string, availableCats: ProductCategory[] = []): string => {
  const match = availableCats.find((c) => c.id === cat || c.label.toLowerCase() === cat.toLowerCase());
  if (match && match.icon) return match.icon;
  switch (cat) {
    case "pan_blanco": return "🥖";
    case "pan_dulce": return "🥐";
    case "hojaldre": return "🥟";
    case "pasteleria": return "🍰";
    case "temporada": return "✨";
    default: return "🍞";
  }
};

// Helpers de fecha local
const getLocalDateISO = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateISO(d);
};

const getDayAfterTomorrowDateISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return getLocalDateISO(d);
};

const normalizeDateStr = (dateStr?: string): string => {
  if (!dateStr) return "";
  return dateStr.split("T")[0].split(" ")[0].trim();
};

// Formatear fecha en lenguaje natural mexicano
const formatLongDateSpanish = (dateISO: string): string => {
  if (!dateISO) return "";
  try {
    const [year, month, day] = dateISO.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const formatted = d.toLocaleDateString("es-MX", options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateISO;
  }
};

// Normalizar nombres de productos para agrupar variantes similares
const normalizeProductName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Extractor robusto de productos y piezas desde cualquier pedido
function extractItemsFromOrder(order: CustomOrder): { name: string; quantity: number }[] {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((it) => ({
      name: (it.name || "Pan").trim(),
      quantity: Number(it.quantity) || 1,
    }));
  }

  const desc = (order.description || "").trim();
  if (!desc) {
    return [{ name: "Pedido de Pan Encargado", quantity: 1 }];
  }

  const results: { name: string; quantity: number }[] = [];
  const rawParts = desc.split(/[,;\n+]+/).map((p) => p.trim()).filter(Boolean);

  for (const part of rawParts) {
    const matchLeading = part.match(/^(\d+)\s*(?:x|\*|-)?\s*(.+)$/i);
    if (matchLeading) {
      results.push({
        name: matchLeading[2].trim(),
        quantity: parseInt(matchLeading[1], 10) || 1,
      });
      continue;
    }

    const matchTrailing = part.match(/^(.+?)\s*[:\(]?\s*(\d+)\s*(?:pzas?|piezas?|pz|piez)?\)?$/i);
    if (matchTrailing) {
      results.push({
        name: matchTrailing[1].trim(),
        quantity: parseInt(matchTrailing[2], 10) || 1,
      });
      continue;
    }

    results.push({
      name: part,
      quantity: 1,
    });
  }

  return results.length > 0 ? results : [{ name: desc, quantity: 1 }];
}

export default function NextDayDistributionModal({
  isOpen,
  onClose,
  orders,
  branches,
  onViewOrderDetail,
  isAdmin = true,
}: NextDayDistributionModalProps) {
  if (!isOpen || isAdmin === false) return null;

  const tomorrowISO = useMemo(() => getTomorrowDateISO(), []);
  const todayISO = useMemo(() => getLocalDateISO(), []);
  const dayAfterTomorrowISO = useMemo(() => getDayAfterTomorrowDateISO(), []);

  // Filtros principales
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowISO);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"branch" | "consolidated" | "bread_options">("bread_options");
  const [searchProduct, setSearchProduct] = useState("");
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [expandedOrdersList, setExpandedOrdersList] = useState<Record<string, boolean>>({});

  // Estados de Desglose de Tipos de Pan y Piezas Añadidas
  const [extraBreadMap, setExtraBreadMap] = useState<Record<string, number>>({});
  const [customVarieties, setCustomVarieties] = useState<BreadVariety[]>([]);
    const [breadCategoryFilter, setBreadCategoryFilter] = useState<string>("all");
  const [isAddVarietyModalOpen, setIsAddVarietyModalOpen] = useState(false);
  const [newVarietyName, setNewVarietyName] = useState("");
  const [newVarietyCategory, setNewVarietyCategory] = useState<string>("pan_dulce");
  const [newVarietyInitialPieces, setNewVarietyInitialPieces] = useState<number>(20);

  // Categorías de pan dinámicas del sistema Brito (reactivas a nuevas categorías añadidas)
  const [storedCategories, setStoredCategories] = useState<ProductCategory[]>(() => {
    return typeof window !== "undefined" ? getStoredCategories() : [];
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🥖");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCategoriesUpdate = () => {
      setStoredCategories(getStoredCategories());
    };
    handleCategoriesUpdate();
    window.addEventListener("brito_categories_updated", handleCategoriesUpdate);
    window.addEventListener("storage", handleCategoriesUpdate);
    return () => {
      window.removeEventListener("brito_categories_updated", handleCategoriesUpdate);
      window.removeEventListener("storage", handleCategoriesUpdate);
    };
  }, []);

  // Cerrar desplegable al hacer clic fuera (si no está fijado para recorte)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isPinned) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen && !isPinned) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen, isPinned]);

  // Crear y guardar una nueva categoría de pan
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const created = addCategory({
      label: newCatLabel.trim(),
      icon: newCatIcon || "🥖",
    });
    setNewCatLabel("");
    setNewCatIcon("🥖");
    setIsCreateCategoryModalOpen(false);
    setBreadCategoryFilter(created.id);
  };

  const printableRef = useRef<HTMLDivElement>(null);

  // Cargar variedades personalizadas guardadas
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("brito_custom_bread_varieties");
      if (raw) setCustomVarieties(JSON.parse(raw));
    } catch {}
  }, []);

  // Cargar piezas añadidas para la fecha seleccionada
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`brito_planned_bread_${selectedDate}`);
      if (raw) {
        setExtraBreadMap(JSON.parse(raw));
      } else {
        setExtraBreadMap({});
      }
    } catch {
      setExtraBreadMap({});
    }
  }, [selectedDate]);

  // Guardar piezas añadidas para una variedad específica
  const handleSetExtraPieces = (key: string, qty: number) => {
    const safeQty = Math.max(0, Math.floor(qty || 0));
    setExtraBreadMap((prev) => {
      const next = { ...prev };
      if (safeQty <= 0) {
        delete next[key];
      } else {
        next[key] = safeQty;
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`brito_planned_bread_${selectedDate}`, JSON.stringify(next));
          window.dispatchEvent(new Event("brito_planned_bread_updated"));
        } catch {}
      }
      return next;
    });
  };

  // Botón rápido de suma/resta
  const handleQuickAddPieces = (key: string, delta: number) => {
    const current = extraBreadMap[key] || 0;
    handleSetExtraPieces(key, current + delta);
  };

  // Limpiar todas las piezas añadidas manualmente
  const handleClearAllExtra = () => {
    if (Object.keys(extraBreadMap).length === 0) return;
    if (
      window.confirm(
        `¿Deseas reiniciar a 0 las piezas añadidas manualmente para el ${formatLongDateSpanish(selectedDate)}?`
      )
    ) {
      setExtraBreadMap({});
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`brito_planned_bread_${selectedDate}`);
          window.dispatchEvent(new Event("brito_planned_bread_updated"));
        } catch {}
      }
    }
  };

  // Cargar lote estándar para el taller (Preset diario)
  const handleLoadStandardPreset = () => {
    const preset: Record<string, number> = {
      [normalizeProductName("Bolillo Tradicional")]: 120,
      [normalizeProductName("Telera")]: 60,
      [normalizeProductName("Concha de Vainilla")]: 40,
      [normalizeProductName("Concha de Chocolate")]: 40,
      [normalizeProductName("Cuerno de Mantequilla")]: 30,
      [normalizeProductName("Dona de Azúcar")]: 25,
      [normalizeProductName("Dona de Chocolate")]: 25,
      [normalizeProductName("Oreja de Hojaldre")]: 20,
      [normalizeProductName("Empanada de Piña")]: 20,
      [normalizeProductName("Mantecada de Vainilla")]: 20,
    };

    setExtraBreadMap((prev) => {
      const next = { ...prev };
      Object.entries(preset).forEach(([k, v]) => {
        next[k] = (next[k] || 0) + v;
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`brito_planned_bread_${selectedDate}`, JSON.stringify(next));
          window.dispatchEvent(new Event("brito_planned_bread_updated"));
        } catch {}
      }
      return next;
    });
  };

  // Añadir una nueva variedad personalizada
  const handleAddNewVariety = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newVarietyName.trim();
    if (!trimmed) return;

    const newId = `custom_bread_${Date.now()}`;
    const cat = newVarietyCategory;
    const newVar: BreadVariety = {
      id: newId,
      name: trimmed,
      category: cat,
      categoryLabel: getCategoryLabel(cat, storedCategories),
      icon: getCategoryIcon(cat),
    };

    const updatedVarieties = [...customVarieties, newVar];
    setCustomVarieties(updatedVarieties);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("brito_custom_bread_varieties", JSON.stringify(updatedVarieties));
      } catch {}
    }

    if (newVarietyInitialPieces > 0) {
      handleSetExtraPieces(normalizeProductName(trimmed), newVarietyInitialPieces);
    }

    setNewVarietyName("");
    setNewVarietyInitialPieces(20);
    setIsAddVarietyModalOpen(false);
  };

  // Determinar la etiqueta del día seleccionado
  const dateLabel = useMemo(() => {
    if (selectedDate === tomorrowISO) return "Mañana (Día Siguiente)";
    if (selectedDate === todayISO) return "Hoy (Mismo Día)";
    if (selectedDate === dayAfterTomorrowISO) return "Pasado Mañana";
    return "Fecha Personalizada";
  }, [selectedDate, tomorrowISO, todayISO, dayAfterTomorrowISO]);

  // Filtrar pedidos para la fecha seleccionada
  const targetOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "cancelado") return false;
      if (!includeDelivered && o.status === "entregado") return false;
      const orderDeliveryDate = normalizeDateStr(o.deliveryDate);
      return orderDeliveryDate === selectedDate;
    });
  }, [orders, selectedDate, includeDelivered]);

  // Agrupación y cálculo de distribución por sucursal
  const { branchGroups, globalConsolidated, totalGlobalPieces, totalGlobalOrders } = useMemo(() => {
    let globalPieces = 0;
    const globalItemsMap = new Map<string, BreadSummaryItem>();

    const branchMap = new Map<
      string,
      {
        branch: Branch;
        orders: CustomOrder[];
        itemsMap: Map<string, BreadSummaryItem>;
        totalPieces: number;
      }
    >();

    branches.forEach((b) => {
      branchMap.set(b.id, {
        branch: b,
        orders: [],
        itemsMap: new Map(),
        totalPieces: 0,
      });
    });

    const defaultBranch = branches[0] || {
      id: "branch-matriz",
      name: "Sucursal Matriz",
      code: "MAT",
      address: "Matriz Central",
      phone: "",
      manager: "",
      ticketFooterText: "",
      totalBakers: 0,
      activeStaffCount: 0,
      todaySales: 0,
      todayTickets: 0,
      todayDeskSales: 0,
      todayDeskTickets: 0,
      todayOrdersDeposit: 0,
      todayOrdersTotal: 0,
      todayOrdersCount: 0,
      cashInDrawer: 0,
      status: "abierto",
    };

    if (!branchMap.has(defaultBranch.id)) {
      branchMap.set(defaultBranch.id, {
        branch: defaultBranch,
        orders: [],
        itemsMap: new Map(),
        totalPieces: 0,
      });
    }

    targetOrders.forEach((order) => {
      let targetBId = order.branchId || order.operatingBranchId || defaultBranch.id;

      if (!branchMap.has(targetBId)) {
        const matchedByName = branches.find(
          (b) => b.name.toLowerCase() === (order.branchName || "").toLowerCase()
        );
        if (matchedByName) {
          targetBId = matchedByName.id;
        } else {
          targetBId = defaultBranch.id;
        }
      }

      const bData = branchMap.get(targetBId)!;
      bData.orders.push(order);

      const items = extractItemsFromOrder(order);
      items.forEach((it) => {
        const qty = it.quantity || 1;
        bData.totalPieces += qty;
        globalPieces += qty;

        const normalized = normalizeProductName(it.name);

        if (!bData.itemsMap.has(normalized)) {
          bData.itemsMap.set(normalized, {
            name: it.name,
            totalPieces: qty,
            ordersCount: 1,
            orderNumbers: [order.orderNumber || order.id],
            ordersDetails: [
              {
                orderNumber: order.orderNumber || order.id,
                customerName: order.customerName || "Cliente",
                phone: order.phone,
                deliveryTime: order.deliveryTime,
                quantity: qty,
                order,
              },
            ],
          });
        } else {
          const existing = bData.itemsMap.get(normalized)!;
          existing.totalPieces += qty;
          existing.ordersCount += 1;
          if (!existing.orderNumbers.includes(order.orderNumber || order.id)) {
            existing.orderNumbers.push(order.orderNumber || order.id);
          }
          existing.ordersDetails.push({
            orderNumber: order.orderNumber || order.id,
            customerName: order.customerName || "Cliente",
            phone: order.phone,
            deliveryTime: order.deliveryTime,
            quantity: qty,
            order,
          });
        }

        if (!globalItemsMap.has(normalized)) {
          globalItemsMap.set(normalized, {
            name: it.name,
            totalPieces: qty,
            ordersCount: 1,
            orderNumbers: [order.orderNumber || order.id],
            ordersDetails: [
              {
                orderNumber: order.orderNumber || order.id,
                customerName: order.customerName || "Cliente",
                phone: order.phone,
                deliveryTime: order.deliveryTime,
                quantity: qty,
                order,
              },
            ],
          });
        } else {
          const gExisting = globalItemsMap.get(normalized)!;
          gExisting.totalPieces += qty;
          gExisting.ordersCount += 1;
          if (!gExisting.orderNumbers.includes(order.orderNumber || order.id)) {
            gExisting.orderNumbers.push(order.orderNumber || order.id);
          }
          gExisting.ordersDetails.push({
            orderNumber: order.orderNumber || order.id,
            customerName: order.customerName || "Cliente",
            phone: order.phone,
            deliveryTime: order.deliveryTime,
            quantity: qty,
            order,
          });
        }
      });
    });

    const groups: BranchDistributionGroup[] = [];
    branchMap.forEach((data, bId) => {
      const itemsList = Array.from(data.itemsMap.values()).sort(
        (a, b) => b.totalPieces - a.totalPieces
      );

      groups.push({
        branchId: bId,
        branchName: data.branch.name,
        shortName: data.branch.shortName || data.branch.name.replace(/^Sucursal\s+/i, ""),
        totalPieces: data.totalPieces,
        totalOrders: data.orders.length,
        items: itemsList,
        orders: data.orders,
      });
    });

    groups.sort((a, b) => {
      if (a.totalPieces !== b.totalPieces) return b.totalPieces - a.totalPieces;
      return a.branchName.localeCompare(b.branchName);
    });

    const consolidatedList = Array.from(globalItemsMap.values()).sort(
      (a, b) => b.totalPieces - a.totalPieces
    );

    return {
      branchGroups: groups,
      globalConsolidated: consolidatedList,
      totalGlobalPieces: globalPieces,
      totalGlobalOrders: targetOrders.length,
    };
  }, [targetOrders, branches]);

  // Lista unificada completa de tipos de pan (Catálogo + Pedidos + Añadidos)
  const unifiedBreadList = useMemo(() => {
    const map = new Map<string, UnifiedBreadRow>();

    // 1. Variedades tradicionales base
    DEFAULT_BAKERY_BREAD_VARIETIES.forEach((v) => {
      const key = normalizeProductName(v.name);
      map.set(key, {
        key,
        id: v.id,
        name: v.name,
        category: v.category,
        categoryLabel: v.categoryLabel,
        icon: v.icon,
        price: v.defaultPrice,
        orderPieces: 0,
        ordersCount: 0,
        ordersDetails: [],
        extraPieces: 0,
        totalPieces: 0,
      });
    });

    // 2. Integrar productos dados de alta en el sistema Brito
    try {
      const catalogProds = getStoredProducts();
      catalogProds.forEach((p) => {
        if (!p || !p.name) return;
        const key = normalizeProductName(p.name);
        const cat = mapProductCategoryToBreadCat(p.category, storedCategories);
        if (!map.has(key)) {
          map.set(key, {
            key,
            id: p.id,
            name: p.name,
            category: cat,
            categoryLabel: getCategoryLabel(cat),
            icon: p.icon || getCategoryIcon(cat, storedCategories),
            price: p.price,
            orderPieces: 0,
            ordersCount: 0,
            ordersDetails: [],
            extraPieces: 0,
            totalPieces: 0,
          });
        } else {
          const existing = map.get(key)!;
          if (p.price && !existing.price) existing.price = p.price;
          if (p.icon && existing.icon === "🍞") existing.icon = p.icon;
        }
      });
    } catch {}

    // 3. Integrar variedades creadas manualmente por el usuario
    customVarieties.forEach((v) => {
      const key = normalizeProductName(v.name);
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: v.id,
          name: v.name,
          category: v.category,
          categoryLabel: v.categoryLabel || getCategoryLabel(v.category),
          icon: v.icon || getCategoryIcon(v.category),
          price: v.defaultPrice,
          orderPieces: 0,
          ordersCount: 0,
          ordersDetails: [],
          extraPieces: 0,
          totalPieces: 0,
        });
      }
    });

    // 4. Integrar pedidos de clientes para la fecha seleccionada
    globalConsolidated.forEach((gItem) => {
      const key = normalizeProductName(gItem.name);
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: `order_${key}`,
          name: gItem.name,
          category: "pan_dulce",
          categoryLabel: "Pan de Pedido",
          icon: "🥐",
          orderPieces: gItem.totalPieces,
          ordersCount: gItem.ordersCount,
          ordersDetails: gItem.ordersDetails,
          extraPieces: 0,
          totalPieces: gItem.totalPieces,
        });
      } else {
        const row = map.get(key)!;
        row.orderPieces = gItem.totalPieces;
        row.ordersCount = gItem.ordersCount;
        row.ordersDetails = gItem.ordersDetails;
      }
    });

    // 5. Asignar piezas extras/planeadas y calcular totalPieces
    map.forEach((row, key) => {
      const extra = Number(extraBreadMap[key]) || 0;
      row.extraPieces = extra;
      row.totalPieces = row.orderPieces + extra;
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.totalPieces > 0 && b.totalPieces === 0) return -1;
      if (a.totalPieces === 0 && b.totalPieces > 0) return 1;
      if (a.totalPieces !== b.totalPieces) return b.totalPieces - a.totalPieces;
      return a.name.localeCompare(b.name);
    });

        return list;
  }, [globalConsolidated, customVarieties, extraBreadMap, storedCategories]);

  // Todas las categorías de pan dinámicas (integrando existentes y todas las que se añadan)
  const allBreadCategories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; icon: string }>();

    // 1. Categorías del sistema Brito (brito_categories_v1)
    storedCategories.forEach((cat) => {
      map.set(cat.id, {
        id: cat.id,
        label: cat.label,
        icon: cat.icon || "🥖",
      });
    });

    // 2. Variedades base tradicionales por si acaso
    if (!map.has("pan_dulce")) map.set("pan_dulce", { id: "pan_dulce", label: "Pan Dulce Tradicional", icon: "🥐" });
    if (!map.has("pan_blanco")) map.set("pan_blanco", { id: "pan_blanco", label: "Bolillo & Telera", icon: "🥖" });
    if (!map.has("hojaldre")) map.set("hojaldre", { id: "hojaldre", label: "Hojaldres & Rellenos", icon: "🥟" });
    if (!map.has("pasteleria")) map.set("pasteleria", { id: "pasteleria", label: "Pastelería & Repostería", icon: "🍰" });
    if (!map.has("temporada")) map.set("temporada", { id: "temporada", label: "Especiales de Temporada", icon: "✨" });

    // 3. Cualquier categoría registrada en customVarieties
    customVarieties.forEach((v) => {
      if (v.category && !map.has(v.category)) {
        map.set(v.category, {
          id: v.category,
          label: v.categoryLabel || v.category,
          icon: v.icon || "🍞",
        });
      }
    });

    return Array.from(map.values());
  }, [storedCategories, customVarieties]);

  // Totales combinados
  const totalExtraPieces = useMemo(() => {
    return unifiedBreadList.reduce((sum, item) => sum + item.extraPieces, 0);
  }, [unifiedBreadList]);

  const totalCombinedPieces = useMemo(() => {
    return totalGlobalPieces + totalExtraPieces;
  }, [totalGlobalPieces, totalExtraPieces]);

  const activeVarietiesCount = useMemo(() => {
    return unifiedBreadList.filter((item) => item.totalPieces > 0).length;
  }, [unifiedBreadList]);

  // Cálculo de piezas desglosadas por categoría
  const categoryStats = useMemo(() => {
    const stats: Record<string, { totalPieces: number; orderPieces: number; extraPieces: number; count: number }> = {};
    allBreadCategories.forEach((cat) => {
      stats[cat.id] = { totalPieces: 0, orderPieces: 0, extraPieces: 0, count: 0 };
    });

    unifiedBreadList.forEach((row) => {
      const catId = row.category;
      if (!stats[catId]) {
        stats[catId] = { totalPieces: 0, orderPieces: 0, extraPieces: 0, count: 0 };
      }
      stats[catId].totalPieces += row.totalPieces;
      stats[catId].orderPieces += row.orderPieces;
      stats[catId].extraPieces += row.extraPieces;
      stats[catId].count += 1;
    });

    return stats;
  }, [allBreadCategories, unifiedBreadList]);

  // Información de la categoría seleccionada actualmente
  const selectedCatInfo = useMemo(() => {
    if (breadCategoryFilter === "all" || breadCategoryFilter === "active") return null;
    return allBreadCategories.find((c) => c.id === breadCategoryFilter) || null;
  }, [breadCategoryFilter, allBreadCategories]);

  // Piezas a mostrar en la tarjeta según filtro activo
  const displayedPieces = useMemo(() => {
    if (breadCategoryFilter === "all" || breadCategoryFilter === "active") return totalCombinedPieces;
    return categoryStats[breadCategoryFilter]?.totalPieces || 0;
  }, [breadCategoryFilter, totalCombinedPieces, categoryStats]);

  // Filtrado de la lista desglosada por búsqueda y categoría
  const filteredUnifiedBreadList = useMemo(() => {
    let list = unifiedBreadList;

    if (breadCategoryFilter === "active") {
      list = list.filter((item) => item.totalPieces > 0);
    } else if (breadCategoryFilter !== "all") {
      list = list.filter((item) => item.category === breadCategoryFilter);
    }

    if (searchProduct.trim()) {
      const q = normalizeProductName(searchProduct);
      list = list.filter((item) => normalizeProductName(item.name).includes(q));
    }

    return list;
  }, [unifiedBreadList, breadCategoryFilter, searchProduct]);

  // Lista consolidada activa para el taller (incluye pedidos + añadidos)
  const consolidatedActiveList = useMemo(() => {
    return unifiedBreadList.filter((item) => {
      if (item.totalPieces <= 0) return false;
      if (searchProduct.trim()) {
        const q = normalizeProductName(searchProduct);
        return normalizeProductName(item.name).includes(q);
      }
      return true;
    });
  }, [unifiedBreadList, searchProduct]);

  // Filtrado por buscador y sucursal seleccionada
  const filteredBranchGroups = useMemo(() => {
    return branchGroups
      .filter((g) => {
        if (selectedBranchId !== "all" && g.branchId !== selectedBranchId) {
          return false;
        }
        return true;
      })
      .map((g) => {
        if (!searchProduct.trim()) return g;
        const q = normalizeProductName(searchProduct);
        const filteredItems = g.items.filter((it) =>
          normalizeProductName(it.name).includes(q)
        );
        return {
          ...g,
          items: filteredItems,
        };
      });
  }, [branchGroups, selectedBranchId, searchProduct]);

  const activeBranchesCount = useMemo(() => {
    return branchGroups.filter((g) => g.totalPieces > 0).length;
  }, [branchGroups]);

  // Copiar resumen con desglose a WhatsApp
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`🚚 *RESUMEN DE REPARTO & HORNEADO - PANADERÍA BRITO*`);
    lines.push(`📅 *Fecha de Producción:* ${formatLongDateSpanish(selectedDate)} (${dateLabel})`);
    lines.push(`🥖 *TOTAL GENERAL A HORNEAR:* ${totalCombinedPieces} piezas de pan (${activeVarietiesCount} tipos)`);
    if (totalExtraPieces > 0) {
      lines.push(`   └ 📦 ${totalGlobalPieces} de pedidos de clientes (${totalGlobalOrders} encargos en ${activeBranchesCount} sucursales)`);
      lines.push(`   └ ➕ ${totalExtraPieces} añadidas para mostrador y producción general`);
    } else {
      lines.push(`   └ 📦 ${totalGlobalPieces} piezas de pedidos en ${activeBranchesCount} sucursales`);
    }
    lines.push(`─────────────────────────────`);

    const activeBranchGroups = branchGroups.filter((g) => g.totalPieces > 0);
    if (activeBranchGroups.length > 0) {
      lines.push(`🏬 *DESGLOSE DE PEDIDOS POR SUCURSAL:*`);
      activeBranchGroups.forEach((g) => {
        lines.push(``);
        lines.push(`*${g.branchName.toUpperCase()}* (${g.totalPieces} pzas en ${g.totalOrders} pedidos):`);
        g.items.forEach((it) => {
          lines.push(`  • *${it.totalPieces}x* ${it.name} (${it.ordersCount} encargo${it.ordersCount === 1 ? "" : "s"})`);
        });
      });
      lines.push(``);
      lines.push(`─────────────────────────────`);
    }

    lines.push(`🍞 *LISTA CONSOLIDADA PARA EL TALLER / HORNEADO:*`);
    const itemsWithPieces = unifiedBreadList.filter((b) => b.totalPieces > 0);
    if (itemsWithPieces.length === 0) {
      lines.push(`  (Sin piezas registradas aún para este día)`);
    } else {
      itemsWithPieces.forEach((b) => {
        let detail = `  ✓ *${b.totalPieces} pzas* - ${b.name}`;
        if (b.orderPieces > 0 && b.extraPieces > 0) {
          detail += ` (${b.orderPieces} pedidos + ${b.extraPieces} mostrador)`;
        } else if (b.extraPieces > 0) {
          detail += ` (mostrador/producción)`;
        } else {
          detail += ` (pedidos)`;
        }
        lines.push(detail);
      });
    }

    lines.push(``);
    lines.push(`Generado automáticamente por Sistema Panadería Brito.`);

    const textToCopy = lines.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-[#fbf9f5] border border-[#e8ded2] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden relative text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Principal con Identidad Brito */}
        <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-amber-800 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-xl shrink-0 shadow-xs">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Resumen de Reparto y Producción por Sucursal
                </h3>
                <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase shadow-2xs">
                  {dateLabel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100 font-medium leading-tight mt-0.5">
                Cálculo automático de piezas de pan para hornear, repartir y poner en mostrador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Control: Fechas, Vistas y Acciones */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#e8ded2] space-y-3 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* 1. Selector Rápido de Fecha */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mr-1">
                Fecha de Reparto:
              </span>

              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowISO)}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  selectedDate === tomorrowISO
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs scale-102 ring-2 ring-emerald-400/40"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                }`}
              >
                <span>🌅 Mañana</span>
                <span className="text-[10px] opacity-90 font-medium">
                  ({tomorrowISO.slice(5)})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                  selectedDate === todayISO
                    ? "bg-amber-600 text-white shadow-xs scale-102 ring-2 ring-amber-400/40"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                }`}
              >
                <span>⏰ Hoy</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(dayAfterTomorrowISO)}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                  selectedDate === dayAfterTomorrowISO
                    ? "bg-amber-600 text-white shadow-xs scale-102 ring-2 ring-amber-400/40"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                }`}
              >
                <span>Pasado Mañana</span>
              </button>

              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
                  title="Elegir otra fecha específica"
                />
              </div>
            </div>

            {/* 2. Botones de Acción (Imprimir y Copiar WhatsApp) */}
            <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Copiar texto resumen con formato listo para WhatsApp"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-black">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copiar (WhatsApp)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                title="Imprimir hoja de producción consolidada para panaderos"
              >
                <Printer className="w-3.5 h-3.5 text-stone-300" />
                <span>Imprimir Hoja</span>
              </button>
            </div>
          </div>

          {/* Segunda Fila: Modos de Vista, Filtro de Sucursal y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
            {/* Selector de Modos de Vista */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl shrink-0 flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setViewMode("branch")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "branch"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Por Sucursal</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("consolidated")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "consolidated"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Consolidado Horneado ({activeVarietiesCount})</span>
              </button>
            </div>

            {/* Filtros de Sucursal y Búsqueda */}
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === "branch" && (
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="text-xs font-bold text-stone-800 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs appearance-none"
                  >
                    <option value="all">🏬 Todas las Sucursales</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏬 {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              <div className="relative min-w-[160px] sm:min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar pan (ej. concha, bolillo)..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-stone-400 shadow-2xs"
                />
                {searchProduct && (
                  <button
                    type="button"
                    onClick={() => setSearchProduct("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas KPI Resumen del Día: Total con Desplegable Visible de Categorías */}
        <div className="p-3 sm:p-4 bg-[#f8f5ef] border-b border-[#e8ded2] grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
          {/* Card 1: TOTAL PIEZAS DE PAN CON SELECT DESPLEGABLE DIRECTO Y VISIBLE */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border-2 border-emerald-400/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center shrink-0 shadow-2xs">
                  {selectedCatInfo?.icon || "🥖"}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight tracking-wider">
                    Total Piezas de Pan
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-950 block tabular-nums leading-tight">
                      {displayedPieces}
                    </span>
                    <span className="text-xs font-bold text-stone-500">
                      pzas {breadCategoryFilter !== "all" && "(filtrado)"}
                    </span>
                  </div>
                </div>
              </div>

              {breadCategoryFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setBreadCategoryFilter("all")}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer transition-colors"
                  title="Mostrar todas las categorías"
                >
                  Ver Todas (✕)
                </button>
              )}
            </div>

            {/* LISTA DESPLEGABLE DIRECTA Y VISIBLE DE TODAS LAS CATEGORÍAS (HTML PURO, NO NATIVO DEL SO PARA QUE NO SE MINIMICE AL USAR RECORTES) */}
            <div className="space-y-1 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-800">
                <span className="flex items-center gap-1">
                  <span>📂 Lista de Categorías de Pan:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinned((p) => !p);
                      if (!isCategoryDropdownOpen) setIsCategoryDropdownOpen(true);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 shadow-2xs ${
                      isPinned
                        ? "bg-emerald-700 text-white ring-2 ring-emerald-400"
                        : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    }`}
                    title="Fijar menú abierto para recortar con tranquilidad"
                  >
                    <span>📌</span>
                    <span>{isPinned ? "Fijado para Recorte ✓" : "Fijar para Recorte"}</span>
                  </button>
                  <span className="text-emerald-600 font-bold lowercase text-[9px]">
                    {breadCategoryFilter === "all" ? "Todas seleccionadas" : "1 filtrada"}
                  </span>
                </div>
              </div>

              {/* Botón Personalizado HTML que NO se minimiza al recortar */}
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                className="w-full text-xs font-black text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-500 rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer shadow-xs transition-colors text-left"
                title="Toca para desplegar u ocultar todas las opciones de pan"
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className="text-base shrink-0">
                    {breadCategoryFilter === "all"
                      ? "🧺"
                      : breadCategoryFilter === "active"
                      ? "⭐"
                      : selectedCatInfo?.icon || "🥖"}
                  </span>
                  <span className="truncate">
                    {breadCategoryFilter === "all"
                      ? `Todas las Categorías de Pan (${totalCombinedPieces} pzas totales)`
                      : breadCategoryFilter === "active"
                      ? `Con Piezas Programadas (${activeVarietiesCount} variedades)`
                      : `${selectedCatInfo?.label || "Categoría"} (${categoryStats[breadCategoryFilter]?.totalPieces || 0} pzas)`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-emerald-800">
                  <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    {isCategoryDropdownOpen ? "Ocultar ▲" : "Ver opciones ▼"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Menú HTML de Opciones (Permanente en pantalla, no desaparece con la Herramienta de Recortes) */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-2.5 space-y-1.5 max-h-[360px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 text-[11px] font-bold text-stone-600">
                    <span className="flex items-center gap-1">
                      <span>🏷️ Opciones disponibles para ver y recortar:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsPinned((p) => !p)}
                        className={`text-[10px] px-2 py-0.5 rounded font-black cursor-pointer ${
                          isPinned
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        📌 {isPinned ? "Fijado" : "Fijar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(false)}
                        className="text-stone-400 hover:text-stone-800 text-xs px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-stone-100"
                      >
                        ✕ Cerrar
                      </button>
                    </div>
                  </div>

                  {/* Opción Todas */}
                  <button
                    type="button"
                    onClick={() => {
                      setBreadCategoryFilter("all");
                      if (!isPinned) setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      breadCategoryFilter === "all"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "hover:bg-emerald-50 text-stone-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">🧺</span>
                      <span className="truncate">Todas las Categorías de Pan</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                        breadCategoryFilter === "all"
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {totalCombinedPieces} pzas totales
                    </span>
                  </button>

                  {/* Opción Con piezas programadas */}
                  <button
                    type="button"
                    onClick={() => {
                      setBreadCategoryFilter("active");
                      if (!isPinned) setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      breadCategoryFilter === "active"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "hover:bg-emerald-50 text-stone-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">⭐</span>
                      <span className="truncate">Con Piezas Programadas</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                        breadCategoryFilter === "active"
                          ? "bg-white/20 text-white"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {activeVarietiesCount} variedades
                    </span>
                  </button>

                  {/* Separador de Categorías Registradas */}
                  <div className="pt-1.5 pb-0.5 px-2 text-[10px] font-black uppercase text-stone-400 tracking-wider">
                    Categorías de Pan Registradas ({allBreadCategories.length})
                  </div>

                  {allBreadCategories.map((cat) => {
                    const stats = categoryStats[cat.id];
                    const pzas = stats?.totalPieces || 0;
                    const count = stats?.count || 0;
                    const isSelected = breadCategoryFilter === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setBreadCategoryFilter(cat.id);
                          if (!isPinned) setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white font-black shadow-xs"
                            : "hover:bg-stone-100 text-stone-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{cat.icon}</span>
                          <span className="truncate">{cat.label}</span>
                          <span
                            className={`text-[10px] opacity-70 font-semibold ${
                              isSelected ? "text-emerald-100" : "text-stone-400"
                            }`}
                          >
                            ({count} tipos)
                          </span>
                        </div>
                        <span
                          className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : pzas > 0
                              ? "bg-emerald-100 text-emerald-950"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {pzas} pzas
                        </span>
                      </button>
                    );
                  })}

                  {/* Botón para añadir nueva categoría */}
                  <div className="pt-1.5 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateCategoryModalOpen(true);
                        if (!isPinned) setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer border border-dashed border-emerald-300"
                    >
                      <span className="text-base">➕</span>
                      <span>+ Añadir Nueva Categoría de Pan...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: TOTAL DE PEDIDOS (ÚNICAMENTE EL TOTAL, LIMPIO) */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border-2 border-amber-300/90 shadow-2xs hover:shadow-md transition-all flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 text-amber-900 font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-2xs">
              📦
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight tracking-wider">
                Total de Pedidos
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-stone-900 block tabular-nums leading-tight">
                  {totalGlobalOrders}
                </span>
                <span className="text-xs sm:text-sm font-bold text-stone-500">
                  {totalGlobalOrders === 1 ? "pedido" : "pedidos"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div ref={printableRef} className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 print:p-0">
          {/* Encabezado visible únicamente en Impresión */}
          <div className="hidden print:block mb-4 border-b pb-3 text-stone-900">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black">PANADERÍA BRITO — HOJA DE PRODUCCIÓN & REPARTO</h1>
                <p className="text-xs font-bold text-stone-700">
                  Fecha de Reparto: {formatLongDateSpanish(selectedDate)} ({dateLabel})
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black">TOTAL A HORNEAR: {totalCombinedPieces} PIEZAS</p>
                <p className="text-[10px] text-stone-500">
                  {totalGlobalPieces} pedidos + {totalExtraPieces} mostrador ({activeVarietiesCount} variedades)
                </p>
              </div>
            </div>
          </div>

          {viewMode === "consolidated" ? (
            /* ========================================================================= */
            /* MODO 1: CONSOLIDADO GENERAL PARA EL TALLER / HORNEADO                     */
            /* ========================================================================= */
            <div className="space-y-3">
              <div className="bg-amber-50/90 border border-amber-200/90 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-950">
                      Lista Maestra de Horneado y Producción
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Suma global de encargos de clientes para el {formatLongDateSpanish(selectedDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-white px-3 py-1 rounded-xl text-emerald-900 border border-emerald-300 shadow-2xs">
                    {totalCombinedPieces} piezas a hornear
                  </span>
                </div>
              </div>

              {consolidatedActiveList.length === 0 ? (
                <div className="py-10 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-2xl mx-auto">
                    🥖
                  </div>
                  <h4 className="text-base font-black text-stone-800">
                    No hay piezas de pan programadas para hornear
                  </h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    No se registraron encargos de clientes para esta fecha.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100 text-stone-600 border-b border-stone-200 text-[11px] font-black uppercase tracking-wider">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Tipo de Pan / Producto</th>
                          <th className="py-2.5 px-3 text-center">Total a Hornear</th>
                          <th className="py-2.5 px-3 text-center">De Encargos</th>
                          <th className="py-2.5 px-3 text-center">Mostrador / Reparto</th>
                          <th className="py-2.5 px-3">Detalle por Sucursal / Destino</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {consolidatedActiveList.map((item, idx) => {
                          const branchCounts: Record<string, number> = {};
                          item.ordersDetails.forEach((od) => {
                            const bName = od.order.branchName || "Matriz";
                            branchCounts[bName] = (branchCounts[bName] || 0) + od.quantity;
                          });

                          return (
                            <tr key={item.key} className="hover:bg-amber-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-stone-400 font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{item.icon}</span>
                                  <div>
                                    <span className="font-black text-stone-900 text-xs sm:text-[13px] block">
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] text-stone-400 font-semibold">
                                      {item.categoryLabel}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center justify-center font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                  {item.totalPieces} pzas
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-stone-600 font-mono">
                                {item.orderPieces > 0 ? (
                                  <span>
                                    {item.orderPieces} <span className="text-[10px] text-stone-400">({item.ordersCount})</span>
                                  </span>
                                ) : (
                                  <span className="text-stone-300">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-800 font-mono">
                                {item.extraPieces > 0 ? (
                                  <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    +{item.extraPieces}
                                  </span>
                                ) : (
                                  <span className="text-stone-300">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {Object.entries(branchCounts).map(([bName, qty], bIdx) => (
                                    <span
                                      key={bIdx}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-md"
                                    >
                                      <span className="text-amber-800 font-extrabold">{qty}x</span>
                                      <span>{bName.replace(/^Sucursal\s+/i, "")}</span>
                                    </span>
                                  ))}
                                  {item.extraPieces > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      <span className="text-emerald-900 font-black">+{item.extraPieces}</span>
                                      <span>Mostrador Libre</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* MODO 3: DESGLOSE POR SUCURSAL                                             */
            /* ========================================================================= */
            <div className="space-y-4">
              {totalGlobalPieces === 0 ? (
                <div className="py-12 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto">
                    🥖
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-stone-800">
                    No hay encargos de clientes programados para el {formatLongDateSpanish(selectedDate)}
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    No se registraron pedidos directos de clientes para repartir en las sucursales este día.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayISO)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      Ver pedidos de Hoy
                    </button>
                  </div>
                </div>
              ) : (
                filteredBranchGroups.map((group) => {
                  const hasPieces = group.totalPieces > 0;
                  const isOrdersExpanded = Boolean(expandedOrdersList[group.branchId]);

                  return (
                    <div
                      key={group.branchId}
                      className={`bg-white rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
                        hasPieces
                          ? "border-amber-300/90 shadow-sm"
                          : "border-stone-200 opacity-60"
                      }`}
                    >
                      {/* Encabezado de la Sucursal */}
                      <div className="p-3 sm:p-4 bg-gradient-to-r from-[#fdfbf7] via-amber-50/40 to-stone-50 border-b border-amber-200/70 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            🏬
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-black text-stone-900 tracking-tight">
                                {group.branchName}
                              </h4>
                              {hasPieces ? (
                                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.2 rounded-md">
                                  Entrega activa
                                </span>
                              ) : (
                                <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-0.2 rounded-md">
                                  Sin encargos para este día
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                              {hasPieces
                                ? `${group.totalPieces} piezas de pan a entregar repartidas en ${group.totalOrders} pedidos`
                                : "No se registraron encargos para esta tienda"}
                            </p>
                          </div>
                        </div>

                        {/* Total Destacado de Piezas para esta Sucursal */}
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">
                              Total Sucursal
                            </span>
                            <span className="text-lg sm:text-xl font-black text-amber-950 font-mono tabular-nums leading-tight">
                              {group.totalPieces} <span className="text-xs font-bold text-stone-500">pzas</span>
                            </span>
                          </div>

                          {group.orders.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrdersList((prev) => ({
                                  ...prev,
                                  [group.branchId]: !prev[group.branchId],
                                }))
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="Ver los pedidos individuales de esta sucursal"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-700" />
                              <span className="hidden sm:inline">
                                {isOrdersExpanded ? "Ocultar pedidos" : "Ver pedidos"}
                              </span>
                              <span className="font-mono text-[11px]">({group.totalOrders})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Panes de esta Sucursal */}
                      {hasPieces ? (
                        <div className="p-3 sm:p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {group.items.map((it, itIdx) => {
                              const percent =
                                group.totalPieces > 0
                                  ? Math.round((it.totalPieces / group.totalPieces) * 100)
                                  : 0;

                              return (
                                <div
                                  key={itIdx}
                                  className="bg-[#fcfaf7] border border-amber-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-400 transition-colors"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span
                                      className="text-xs sm:text-sm font-black text-stone-900 block truncate"
                                      title={it.name}
                                    >
                                      {it.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium mt-0.5">
                                      <span>
                                        {it.ordersCount} encargo{it.ordersCount === 1 ? "" : "s"}
                                      </span>
                                      <span>•</span>
                                      <span>{percent}% de la tienda</span>
                                    </div>

                                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                                      <div
                                        className="bg-amber-600 h-full rounded-full transition-all"
                                        style={{ width: `${Math.max(5, percent)}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 pl-2 border-l border-amber-200/60">
                                    <span className="text-base sm:text-lg font-black text-amber-950 font-mono block tabular-nums leading-none">
                                      {it.totalPieces}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-stone-400 block mt-0.5">
                                      piezas
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Lista Desplegable de Pedidos Individuales */}
                          {isOrdersExpanded && (
                            <div className="mt-3 pt-3 border-t border-stone-200 space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-xs font-bold text-stone-600 mb-1">
                                <span>Pedidos de clientes que componen estas piezas:</span>
                                <span className="text-[11px] text-stone-400">
                                  (Las cajeras entregan con estos números de pedido)
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.orders.map((order) => (
                                  <div
                                    key={order.id}
                                    onClick={() => onViewOrderDetail?.(order)}
                                    className="bg-white p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2"
                                    title="Toca para ver el detalle completo de este pedido"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded text-[10px]">
                                          {order.orderNumber || order.id}
                                        </span>
                                        <span className="font-black text-stone-900 truncate">
                                          {order.customerName}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-stone-500 truncate mt-0.5">
                                        {order.items && order.items.length > 0
                                          ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                                          : order.description}
                                      </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                      {order.deliveryTime && (
                                        <span className="text-[10px] font-bold text-stone-600 block">
                                          🕒 {order.deliveryTime}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold text-emerald-800">
                                        {formatCurrency(order.total)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 px-4 text-center text-xs text-stone-400 italic">
                          Sin pedidos de pan programados para esta tienda el {formatLongDateSpanish(selectedDate)}.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pie de Página con Botón de Cierre y Resumen Final */}
        <div className="p-3 sm:p-4 bg-stone-100 border-t border-[#e8ded2] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 flex-wrap">
            <span className="font-bold">Total a Hornear:</span>
            <span className="font-black text-emerald-950 font-mono text-base">
              {totalCombinedPieces} piezas
            </span>
            <span className="text-stone-300">•</span>
            <span>
              {totalGlobalPieces} pedidos ({totalGlobalOrders} encargos) + {totalExtraPieces} mostrador
            </span>
            <span className="text-stone-300">•</span>
            <span className="font-semibold text-stone-700">
              {activeVarietiesCount} tipos de pan activos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>

        {/* Modal Emergente para Añadir un Nuevo Tipo de Pan */}
        {isAddVarietyModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xl max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥖</span>
                  <h4 className="text-base font-black text-stone-900">
                    Añadir Nuevo Tipo de Pan
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddVarietyModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNewVariety} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nombre del Pan o Variedad:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Panqué de Nuez, Bollo Relleno..."
                    value={newVarietyName}
                    onChange={(e) => setNewVarietyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Categoría:
                  </label>
                  <select
                    value={newVarietyCategory}
                    onChange={(e) => setNewVarietyCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-800 bg-white"
                  >
                    {allBreadCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Piezas iniciales a programar para {formatLongDateSpanish(selectedDate)}:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newVarietyInitialPieces}
                      onChange={(e) => setNewVarietyInitialPieces(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-black text-stone-900 text-sm"
                    />
                    <span className="font-bold text-stone-400">piezas</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsAddVarietyModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-xs"
                  >
                    Guardar y Añadir a la Lista
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Emergente para Crear Nueva Categoría de Pan */}
        {isCreateCategoryModalOpen && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xl max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏷️</span>
                  <h4 className="text-base font-black text-stone-900">
                    Nueva Categoría de Pan
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Nombre de la Categoría:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pan Rústico, Baguettes, Galletas..."
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Icono / Emoji:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-16 text-center text-xl px-2 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-1 overflow-x-auto text-lg p-1 bg-stone-50 rounded-xl border border-stone-200">
                      {["🥖", "🥐", "🍞", "🥟", "🍰", "🧁", "🍪", "✨", "🌾"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCatIcon(emoji)}
                          className="hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsCreateCategoryModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-xs"
                  >
                    Guardar Categoría
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}