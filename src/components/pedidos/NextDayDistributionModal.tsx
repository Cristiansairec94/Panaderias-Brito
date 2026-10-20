"use client";

import React, { useState, useMemo, useRef } from "react";
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
  Eye
} from "lucide-react";
import { CustomOrder, Branch } from "@/types";
import { formatCurrency, formatDeliveryDateDisplay } from "@/lib/utils";

interface NextDayDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: CustomOrder[];
  branches: Branch[];
  onViewOrderDetail?: (order: CustomOrder) => void;
  isAdmin?: boolean;
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
  // 1. Si el pedido tiene items estructurados en array
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((it) => ({
      name: (it.name || "Pan").trim(),
      quantity: Number(it.quantity) || 1,
    }));
  }

  // 2. Si no tiene items en array, analizar el campo description
  const desc = (order.description || "").trim();
  if (!desc) {
    return [{ name: "Pedido de Pan Encargado", quantity: 1 }];
  }

  const results: { name: string; quantity: number }[] = [];
  const rawParts = desc.split(/[,;\n+]+/).map((p) => p.trim()).filter(Boolean);

  for (const part of rawParts) {
    // Caso "10x Bolillo" o "10 x Concha" o "10* Cuerno"
    const matchLeading = part.match(/^(\d+)\s*(?:x|\*|-)?\s*(.+)$/i);
    if (matchLeading) {
      results.push({
        name: matchLeading[2].trim(),
        quantity: parseInt(matchLeading[1], 10) || 1,
      });
      continue;
    }

    // Caso "Bolillo: 10 pzas" o "Concha (5 piezas)" o "Dona 6pz"
    const matchTrailing = part.match(/^(.+?)\s*[:\(]?\s*(\d+)\s*(?:pzas?|piezas?|pz|piez)?\)?$/i);
    if (matchTrailing) {
      results.push({
        name: matchTrailing[1].trim(),
        quantity: parseInt(matchTrailing[2], 10) || 1,
      });
      continue;
    }

    // Caso sin número explícito
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

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowISO);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"branch" | "consolidated">("branch");
  const [searchProduct, setSearchProduct] = useState("");
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [expandedOrdersList, setExpandedOrdersList] = useState<Record<string, boolean>>({});

  const printableRef = useRef<HTMLDivElement>(null);

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
      // Excluir cancelados
      if (o.status === "cancelado") return false;
      // Excluir entregados a menos que se solicite
      if (!includeDelivered && o.status === "entregado") return false;

      const orderDeliveryDate = normalizeDateStr(o.deliveryDate);
      return orderDeliveryDate === selectedDate;
    });
  }, [orders, selectedDate, includeDelivered]);

  // Agrupación y cálculo de distribución por sucursal
  const { branchGroups, globalConsolidated, totalGlobalPieces, totalGlobalOrders } = useMemo(() => {
    let globalPieces = 0;
    const globalItemsMap = new Map<string, BreadSummaryItem>();

    // Inicializar mapa de sucursales conocidas
    const branchMap = new Map<string, {
      branch: Branch;
      orders: CustomOrder[];
      itemsMap: Map<string, BreadSummaryItem>;
      totalPieces: number;
    }>();

    branches.forEach((b) => {
      branchMap.set(b.id, {
        branch: b,
        orders: [],
        itemsMap: new Map(),
        totalPieces: 0,
      });
    });

    // Sucursal por defecto si no coincide
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

    // Clasificar cada pedido a su sucursal de entrega
    targetOrders.forEach((order) => {
      // La sucursal de entrega donde el pan se debe repartir
      let targetBId = order.branchId || order.operatingBranchId || defaultBranch.id;

      if (!branchMap.has(targetBId)) {
        // Intentar buscar por nombre
        const matchedByName = branches.find((b) =>
          b.name.toLowerCase() === (order.branchName || "").toLowerCase()
        );
        if (matchedByName) {
          targetBId = matchedByName.id;
        } else {
          targetBId = defaultBranch.id;
        }
      }

      const bData = branchMap.get(targetBId)!;
      bData.orders.push(order);

      // Extraer los panes de este pedido
      const items = extractItemsFromOrder(order);
      items.forEach((it) => {
        const qty = it.quantity || 1;
        bData.totalPieces += qty;
        globalPieces += qty;

        const normalized = normalizeProductName(it.name);

        // Sumar a la sucursal
        if (!bData.itemsMap.has(normalized)) {
          bData.itemsMap.set(normalized, {
            name: it.name,
            totalPieces: qty,
            ordersCount: 1,
            orderNumbers: [order.orderNumber || order.id],
            ordersDetails: [{
              orderNumber: order.orderNumber || order.id,
              customerName: order.customerName || "Cliente",
              phone: order.phone,
              deliveryTime: order.deliveryTime,
              quantity: qty,
              order,
            }],
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

        // Sumar al consolidado global
        if (!globalItemsMap.has(normalized)) {
          globalItemsMap.set(normalized, {
            name: it.name,
            totalPieces: qty,
            ordersCount: 1,
            orderNumbers: [order.orderNumber || order.id],
            ordersDetails: [{
              orderNumber: order.orderNumber || order.id,
              customerName: order.customerName || "Cliente",
              phone: order.phone,
              deliveryTime: order.deliveryTime,
              quantity: qty,
              order,
            }],
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

    // Formatear array de grupos por sucursal
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

    // Ordenar grupos: sucursales con pedidos primero (descendente por piezas)
    groups.sort((a, b) => {
      if (a.totalPieces !== b.totalPieces) return b.totalPieces - a.totalPieces;
      return a.branchName.localeCompare(b.branchName);
    });

    // Consolidado global ordenado por piezas
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

  // Filtrado de lista consolidada global
  const filteredConsolidated = useMemo(() => {
    if (!searchProduct.trim()) return globalConsolidated;
    const q = normalizeProductName(searchProduct);
    return globalConsolidated.filter((it) =>
      normalizeProductName(it.name).includes(q)
    );
  }, [globalConsolidated, searchProduct]);

  // Conteo de sucursales activas (con al menos 1 pieza de pan)
  const activeBranchesCount = useMemo(() => {
    return branchGroups.filter((g) => g.totalPieces > 0).length;
  }, [branchGroups]);

  // Función para copiar resumen a WhatsApp / Portapapeles
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`🚚 *RESUMEN DE REPARTO - PANADERÍA BRITO*`);
    lines.push(`📅 *Fecha de Entrega:* ${formatLongDateSpanish(selectedDate)} (${dateLabel})`);
    lines.push(`🥖 *TOTAL GENERAL A REPARTIR:* ${totalGlobalPieces} piezas de pan (${totalGlobalOrders} pedidos en ${activeBranchesCount} sucursales)`);
    lines.push(`─────────────────────────────`);

    branchGroups
      .filter((g) => g.totalPieces > 0)
      .forEach((g) => {
        lines.push(``);
        lines.push(`🏬 *${g.branchName.toUpperCase()}* (${g.totalPieces} piezas en ${g.totalOrders} pedidos):`);
        g.items.forEach((it) => {
          lines.push(`  • *${it.totalPieces}x* ${it.name} (${it.ordersCount} encargo${it.ordersCount === 1 ? "" : "s"})`);
        });
      });

    lines.push(``);
    lines.push(`─────────────────────────────`);
    lines.push(`🍞 *TOTAL CONSOLIDADO PARA HORNEADO:*`);
    globalConsolidated.forEach((it) => {
      lines.push(`  ✓ ${it.totalPieces} pzas - ${it.name}`);
    });
    lines.push(``);
    lines.push(`Generado automáticamente por Sistema Panadería Brito.`);

    const textToCopy = lines.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  // Función de impresión limpia
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

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
                Cálculo automático de piezas totales para hornear y distribuir al día siguiente
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

              {/* Botón Mañana (Día siguiente) - Recomendado y por defecto */}
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

              {/* Botón Hoy */}
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

              {/* Botón Pasado Mañana */}
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

              {/* Input Nativo de Fecha para cualquier otro día */}
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
                title="Imprimir hoja de reparto para producción y panaderos"
              >
                <Printer className="w-3.5 h-3.5 text-stone-300" />
                <span>Imprimir Hoja</span>
              </button>
            </div>
          </div>

          {/* Segunda Fila: Modos de Vista, Filtro de Sucursal y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
            {/* Toggle de Modo: Por Sucursal vs Consolidado General */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("branch")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "branch"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Desglose por Sucursal</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("consolidated")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "consolidated"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Consolidado para Horneado ({globalConsolidated.length} panes)</span>
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

              {/* Buscador de pan específico */}
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

        {/* Tarjetas KPI Resumen del Día */}
        <div className="p-3 sm:p-4 bg-[#f8f5ef] border-b border-[#e8ded2] grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-emerald-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center shrink-0">
              🥖
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Total Piezas de Pan
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-950 block tabular-nums">
                {totalGlobalPieces} <span className="text-xs font-bold text-stone-500">pzas</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black text-xl flex items-center justify-center shrink-0">
              📦
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Pedidos Programados
              </span>
              <span className="text-xl sm:text-2xl font-black text-stone-900 block tabular-nums">
                {totalGlobalOrders} <span className="text-xs font-bold text-stone-500">pedidos</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-sky-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-900 font-black text-xl flex items-center justify-center shrink-0">
              🏬
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Sucursales con Entregas
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-950 block tabular-nums">
                {activeBranchesCount} <span className="text-xs font-bold text-stone-500">tiendas</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-orange-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-900 font-black text-xl flex items-center justify-center shrink-0">
              🥐
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                Variedades de Pan
              </span>
              <span className="text-xl sm:text-2xl font-black text-orange-950 block tabular-nums">
                {globalConsolidated.length} <span className="text-xs font-bold text-stone-500">tipos</span>
              </span>
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
                <p className="text-xs font-black">TOTAL: {totalGlobalPieces} PIEZAS</p>
                <p className="text-[10px] text-stone-500">{totalGlobalOrders} pedidos en {activeBranchesCount} sucursales</p>
              </div>
            </div>
          </div>

          {totalGlobalPieces === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-stone-200 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto">
                🥖
              </div>
              <h4 className="text-base sm:text-lg font-black text-stone-800">
                No hay pedidos de pan programados para repartir el {formatLongDateSpanish(selectedDate)}
              </h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No se registraron pedidos activos con fecha de entrega para este día. Si los clientes encargaron pedidos para hoy o días posteriores, puedes seleccionar otra fecha arriba.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayISO)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Ver pedidos de Hoy
                </button>
              </div>
            </div>
          ) : viewMode === "consolidated" ? (
            /* ========================================================================= */
            /* MODO 2: CONSOLIDADO GENERAL PARA EL TALLER / HORNEADO                     */
            /* ========================================================================= */
            <div className="space-y-3">
              <div className="bg-amber-50/90 border border-amber-200/90 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-950">
                      Lista Maestra de Horneado y Material Necesario
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Suma global de todas las piezas requeridas para todas las sucursales el {formatLongDateSpanish(selectedDate)}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-xs font-black bg-white px-3 py-1 rounded-xl text-amber-900 border border-amber-300 shadow-2xs">
                  {totalGlobalPieces} piezas en total
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-600 border-b border-stone-200 text-[11px] font-black uppercase tracking-wider">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Tipo de Pan / Producto</th>
                        <th className="py-2.5 px-3 text-center">Total Piezas a Hornear</th>
                        <th className="py-2.5 px-3 text-center">Pedidos</th>
                        <th className="py-2.5 px-3">Desglose por Sucursal de Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredConsolidated.map((item, idx) => {
                        // Calcular desglose de cuántas piezas van para cada sucursal
                        const branchCounts: Record<string, number> = {};
                        item.ordersDetails.forEach((od) => {
                          const bName = od.order.branchName || "Matriz";
                          branchCounts[bName] = (branchCounts[bName] || 0) + od.quantity;
                        });

                        return (
                          <tr key={idx} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-stone-400 font-mono font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-black text-stone-900 text-xs sm:text-[13px] block">
                                {item.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                {item.totalPieces} pzas
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-stone-500">
                              {item.ordersCount} encargo{item.ordersCount === 1 ? "" : "s"}
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
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* MODO 1: DESGLOSE POR SUCURSAL (CON LISTA DE PANES Y DETALLE EXPANDIBLE)   */
            /* ========================================================================= */
            <div className="space-y-4">
              {filteredBranchGroups.map((group) => {
                const hasPieces = group.totalPieces > 0;
                const isExpanded = Boolean(expandedBranches[group.branchId]);
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
                                Sin pedidos para este día
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

                    {/* Tabla de Panes de esta Sucursal */}
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
                                  <span className="text-xs sm:text-sm font-black text-stone-900 block truncate" title={it.name}>
                                    {it.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium mt-0.5">
                                    <span>{it.ordersCount} encargo{it.ordersCount === 1 ? "" : "s"}</span>
                                    <span>•</span>
                                    <span>{percent}% de la tienda</span>
                                  </div>

                                  {/* Barra de proporción visual */}
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

                        {/* Desplegable Opcional: Lista de pedidos individuales de la cajera */}
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
              })}
            </div>
          )}
        </div>

        {/* Pie de Página con Botón de Cierre */}
        <div className="p-3 sm:p-4 bg-stone-100 border-t border-[#e8ded2] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-bold">Total global:</span>
            <span className="font-black text-stone-900 font-mono text-sm">
              {totalGlobalPieces} piezas de pan
            </span>
            <span className="text-stone-300">•</span>
            <span>{totalGlobalOrders} pedidos en {activeBranchesCount} sucursales</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
