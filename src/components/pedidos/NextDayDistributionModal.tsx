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
  ChefHat,
  ShoppingBag,
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
  List
} from "lucide-react";
import { CustomOrder, Branch, Product } from "@/types";
import { formatCurrency, formatDeliveryDateDisplay } from "@/lib/utils";
import { getStoredCategories, getStoredProducts, fetchProductsFromDb, ProductCategory, DEFAULT_PRODUCT_CATEGORIES } from "@/lib/products";

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
    productId?: string;
  }[];
  categoryId?: string;
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

// Determinador inteligente de categoría de pan
function resolveBreadCategory(breadName: string, productId?: string, products: Product[] = []): string {
  if (productId) {
    const p = products.find((sp) => sp.id === productId);
    if (p && p.category) return p.category;
  }
  const norm = normalizeProductName(breadName);
  const p = products.find((sp) => normalizeProductName(sp.name) === norm);
  if (p && p.category) return p.category;

  if (/bolillo|telera|baguette|birote|pan blanco|barra/i.test(norm)) {
    return "pan_blanco";
  }
  if (/pastel|pay|tarta|cheesecake|gelatina|reposteria|cupcake|flan/i.test(norm)) {
    return "pasteleria";
  }
  if (/cafe|café|refresco|agua|bebida|te|té|leche|chocolate/i.test(norm)) {
    return "bebidas";
  }
  if (/temporada|muerto|rosca/i.test(norm)) {
    return "temporada";
  }
  if (/harina|arina|mantequilla|levadura|materia/i.test(norm)) {
    return "materia_prima";
  }
  return "pan_dulce";
}

// Extractor robusto de productos y piezas desde cualquier pedido
function extractItemsFromOrder(order: CustomOrder): { name: string; quantity: number; productId?: string }[] {
  // 1. Si el pedido tiene items estructurados en array
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((it) => ({
      name: (it.name || "Pan").trim(),
      quantity: Number(it.quantity) || 1,
      productId: it.productId,
    }));
  }

  // 2. Si no tiene items en array, analizar el campo description
  const desc = (order.description || "").trim();
  if (!desc) {
    return [{ name: "Pedido de Pan Encargado", quantity: 1 }];
  }

  const results: { name: string; quantity: number; productId?: string }[] = [];
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

// Función para imprimir la hoja personalizada por sucursal con únicamente el nombre de la sucursal y sus panes requeridos
function printBranchDeliverySheet(
  groups: BranchDistributionGroup[],
  formattedDate: string,
  dateLabelText: string
) {
  if (typeof window === "undefined") return;

  const oldFrame = document.getElementById("brito-delivery-print-frame");
  if (oldFrame) {
    oldFrame.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "brito-delivery-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "850px";
  iframe.style.height = "1200px";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  iframe.style.visibility = "visible";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const pagesHtml = groups
    .map((g, pageIdx) => {
      const itemsRows =
        g.items.length === 0
          ? `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No hay panes requeridos para esta sucursal en esta fecha.</td></tr>`
          : g.items
              .map(
                (it, idx) => `
          <tr style="border-bottom: 1.5px solid #e2e8f0; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
            <td style="padding: 12px 14px; text-align: center; font-weight: 800; color: #64748b; font-family: monospace; font-size: 14px; width: 45px;">
              ${idx + 1}
            </td>
            <td style="padding: 12px 14px; font-weight: 900; font-size: 17px; color: #0f172a; text-transform: uppercase;">
              ${it.name}
            </td>
            <td style="padding: 12px 14px; text-align: center; width: 170px;">
              <span style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 900; font-size: 22px; color: #065f46; background: #ecfdf5; border: 2px solid #6ee7b7; padding: 5px 16px; border-radius: 8px;">
                ${it.totalPieces} <span style="font-size: 13px; font-weight: 800; color: #047857;">pzas</span>
              </span>
            </td>
            <td style="padding: 12px 14px; text-align: center; width: 90px;">
              <div style="display: inline-block; width: 24px; height: 24px; border: 2.5px solid #64748b; border-radius: 5px;"></div>
            </td>
          </tr>
        `
              )
              .join("");

      return `
      <div class="sheet-page" style="${pageIdx < groups.length - 1 ? "page-break-after: always; break-after: page;" : ""} padding: 28px 32px; max-width: 820px; margin: 0 auto;">
        <!-- ENCABEZADO PERSONALIZADO: ÚNICAMENTE EL NOMBRE DE LA SUCURSAL -->
        <div style="border-bottom: 3.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #b45309; margin-bottom: 2px;">
                🥖 PANADERÍA BRITO • HOJA DE REPARTO
              </div>
              <h1 style="font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.1;">
                ${g.branchName}
              </h1>
              <div style="font-size: 14px; font-weight: 700; color: #475569; margin-top: 5px;">
                📅 Fecha de Entrega: <strong style="color: #0f172a;">${formattedDate}</strong> <span style="color: #64748b;">(${dateLabelText})</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                Total a Entregar
              </div>
              <div style="font-size: 36px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, monospace; color: #0f172a; line-height: 1;">
                ${g.totalPieces} <span style="font-size: 15px; font-weight: 800; color: #64748b;">pzas</span>
              </div>
            </div>
          </div>
        </div>

        <!-- NOTA CLARA Y DIRECTA -->
        <div style="background-color: #f8fafc; border-left: 4.5px solid #0f172a; padding: 10px 14px; margin-bottom: 18px; font-size: 13.5px; font-weight: 700; color: #1e293b;">
          Panes requeridos para entregar en <strong style="color: #0f172a; text-transform: uppercase;">${g.branchName}</strong>:
        </div>

        <!-- TABLA DE PANES REQUERIDOS PARA LA SUCURSAL -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 10px 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; text-align: center; width: 45px; border-top-left-radius: 6px;">#</th>
              <th style="padding: 10px 14px; font-size: 12px; font-weight: 900; text-transform: uppercase; text-align: left;">Pan / Producto Requerido</th>
              <th style="padding: 10px 14px; font-size: 12px; font-weight: 900; text-transform: uppercase; text-align: center; width: 170px;">Cantidad Requerida</th>
              <th style="padding: 10px 14px; font-size: 12px; font-weight: 900; text-transform: uppercase; text-align: center; width: 90px; border-top-right-radius: 6px;">Chequeo</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="border-top: 3px solid #0f172a; background-color: #f8fafc;">
              <td colspan="2" style="padding: 14px; font-weight: 900; font-size: 15px; text-transform: uppercase; color: #0f172a;">
                Total Piezas para ${g.branchName}:
              </td>
              <td style="padding: 14px; text-align: center; font-weight: 900; font-size: 24px; font-family: ui-monospace, SFMono-Regular, monospace; color: #065f46;">
                ${g.totalPieces} pzas
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- FIRMAS DE CONTROL DE SALIDA Y RECEPCIÓN -->
        <div style="margin-top: 50px; display: flex; justify-content: space-between; gap: 48px;">
          <div style="flex: 1; border-top: 1.5px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 700; color: #475569;">
            Entregó (Taller / Chofer de Reparto)
          </div>
          <div style="flex: 1; border-top: 1.5px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 12px; font-weight: 700; color: #475569;">
            Recibió (${g.branchName})
          </div>
        </div>
      </div>
      `;
    })
    .join("");

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hoja de Reparto - Panadería Brito</title>
  <style>
    @page {
      size: letter portrait;
      margin: 10mm 12mm;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .sheet-page {
        page-break-after: always !important;
        break-after: page !important;
      }
      .sheet-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`);
  doc.close();

  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = () => {
      try {
        iframe.remove();
      } catch {}
    };
  }

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("Error al imprimir:", e);
      window.print();
    }
  }, 350);
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
  const [viewMode, setViewMode] = useState<"categories" | "branch" | "consolidated" | "products">("branch");
  const [searchProduct, setSearchProduct] = useState("");
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [expandedOrdersList, setExpandedOrdersList] = useState<Record<string, boolean>>({});
  const [showAllStoreProducts, setShowAllStoreProducts] = useState<boolean>(true);

  // Categorías de pan
  const [storedCategories, setStoredCategories] = useState<ProductCategory[]>([]);
  const [storedProducts, setStoredProducts] = useState<Product[]>([]);
  const [breadCategoryFilter, setBreadCategoryFilter] = useState<string>("all");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categoryListDisplayMode, setCategoryListDisplayMode] = useState<"dropdown" | "vertical">("dropdown");
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de categorías con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsCategoryMenuOpen(false);
      }
    }
    if (isCategoryMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (isOpen) {
      setStoredCategories(getStoredCategories());
      const localProds = getStoredProducts();
      setStoredProducts(localProds);
      fetchProductsFromDb()
        .then((prods) => {
          if (prods && prods.length > 0) {
            setStoredProducts(prods);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const printableRef = useRef<HTMLDivElement>(null);

  // Limpiar cachés obsoletas del Service Worker automáticamente
  useEffect(() => {
    if (typeof window !== "undefined" && "caches" in window) {
      window.caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== "panaderia-brito-cache-v13") {
            window.caches.delete(key);
          }
        });
      });
    }
  }, []);

  // Limpiar residuos en memoria local de planificaciones previas
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("brito_custom_bread_varieties");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("brito_planned_bread_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

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
        const resolvedCategory = resolveBreadCategory(it.name, it.productId, storedProducts);

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
              productId: it.productId,
            }],
            categoryId: resolvedCategory,
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
            productId: it.productId,
          });
          if (!existing.categoryId) {
            existing.categoryId = resolvedCategory;
          }
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
              productId: it.productId,
            }],
            categoryId: resolvedCategory,
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
            productId: it.productId,
          });
          if (!gExisting.categoryId) {
            gExisting.categoryId = resolvedCategory;
          }
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
  }, [targetOrders, branches, storedProducts]);



  // Filtrado por buscador, sucursal y categoría de pan
  const filteredBranchGroups = useMemo(() => {
    return branchGroups
      .filter((g) => {
        if (selectedBranchId !== "all" && g.branchId !== selectedBranchId) {
          return false;
        }
        return true;
      })
      .map((g) => {
        const filteredItems = g.items.filter((it) => {
          if (breadCategoryFilter !== "all") {
            const cat = it.categoryId || resolveBreadCategory(it.name, undefined, storedProducts);
            if (cat !== breadCategoryFilter) return false;
          }
          if (searchProduct.trim()) {
            const q = normalizeProductName(searchProduct);
            if (!normalizeProductName(it.name).includes(q)) return false;
          }
          return true;
        });

        const totalP = filteredItems.reduce((acc, it) => acc + it.totalPieces, 0);

        return {
          ...g,
          items: filteredItems,
          totalPieces: totalP,
        };
      })
      .filter((g) => (breadCategoryFilter === "all" && !searchProduct.trim()) || g.items.length > 0);
  }, [branchGroups, selectedBranchId, breadCategoryFilter, searchProduct, storedProducts]);



  // 1. Obtener todas las categorías registradas en el sistema
  const allRegisteredCategories = useMemo(() => {
    const cats = storedCategories && storedCategories.length > 0
      ? storedCategories
      : DEFAULT_PRODUCT_CATEGORIES;
    return cats.filter((c: ProductCategory) => c.id !== "all");
  }, [storedCategories]);

  // 2. Calcular para cada categoría el número de piezas NO editable según la sucursal seleccionada y pedidos activos
  const categoriesWithPieces = useMemo(() => {
    // Filtrar pedidos según selectedBranchId
    const branchFilteredOrders = targetOrders.filter((order: CustomOrder) => {
      if (selectedBranchId === "all") return true;
      const targetBId = order.branchId || order.operatingBranchId || branches[0]?.id;
      if (targetBId === selectedBranchId) return true;
      const matchedByName = branches.find(
        (b: Branch) => b.name.toLowerCase() === (order.branchName || "").toLowerCase()
      );
      return matchedByName?.id === selectedBranchId;
    });

    return allRegisteredCategories.map((cat: ProductCategory) => {
      let totalPieces = 0;
      const breadsMap = new Map<string, { name: string; pieces: number }>();
      const branchBreakdownMap = new Map<string, { branchName: string; pieces: number }>();

      branchFilteredOrders.forEach((order: CustomOrder) => {
        const items = extractItemsFromOrder(order);
        let bName = order.branchName;
        if (!bName) {
          const bObj = branches.find((b: Branch) => b.id === (order.branchId || order.operatingBranchId));
          bName = bObj ? bObj.name : "Matriz";
        }

        items.forEach((it) => {
          const itemCat = resolveBreadCategory(it.name, it.productId, storedProducts);
          if (itemCat === cat.id) {
            const qty = it.quantity || 1;
            totalPieces += qty;

            const norm = normalizeProductName(it.name);
            if (!breadsMap.has(norm)) {
              breadsMap.set(norm, { name: it.name, pieces: qty });
            } else {
              breadsMap.get(norm)!.pieces += qty;
            }

            if (!branchBreakdownMap.has(bName)) {
              branchBreakdownMap.set(bName, { branchName: bName, pieces: qty });
            } else {
              branchBreakdownMap.get(bName)!.pieces += qty;
            }
          }
        });
      });

      return {
        category: cat,
        totalPieces,
        breads: Array.from(breadsMap.values()).sort((a, b) => b.pieces - a.pieces),
        branchBreakdown: Array.from(branchBreakdownMap.values()).sort((a, b) => b.pieces - a.pieces),
      };
    });
  }, [allRegisteredCategories, targetOrders, selectedBranchId, branches, storedProducts]);

  const selectedBranchTotalPieces = useMemo(() => {
    return categoriesWithPieces.reduce((acc: number, c: { totalPieces: number }) => acc + c.totalPieces, 0);
  }, [categoriesWithPieces]);

  const selectedBranchTotalOrders = useMemo(() => {
    if (selectedBranchId === "all") return totalGlobalOrders;
    return targetOrders.filter((order: CustomOrder) => {
      const targetBId = order.branchId || order.operatingBranchId || branches[0]?.id;
      if (targetBId === selectedBranchId) return true;
      const matched = branches.find(
        (b: Branch) => b.name.toLowerCase() === (order.branchName || "").toLowerCase()
      );
      return matched?.id === selectedBranchId;
    }).length;
  }, [selectedBranchId, targetOrders, totalGlobalOrders, branches]);

  // Barra / Catálogo completo de todos los productos de pan registrados en la tienda
  const allRegisteredBreadList = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; category: string; icon: string }>();

    const fallbackBreads = [
      { name: "Bolillo Tradicional", category: "pan_blanco", icon: "🍞" },
      { name: "Telera para Torta", category: "pan_blanco", icon: "🥖" },
      { name: "Concha de Vainilla", category: "pan_dulce", icon: "🥖" },
      { name: "Concha de Chocolate", category: "pan_dulce", icon: "🥖" },
      { name: "Cuerno de Mantequilla", category: "pan_dulce", icon: "🥐" },
      { name: "Dona Glaseada", category: "pan_dulce", icon: "🍩" },
      { name: "Dona de Chocolate", category: "pan_dulce", icon: "🍩" },
      { name: "Oreja de Hojaldre", category: "pan_dulce", icon: "🥖" },
      { name: "Polvorón Tradicional", category: "pan_dulce", icon: "🍪" },
      { name: "Pastel Tres Leches", category: "pasteleria", icon: "🍰" },
    ];

    if (storedProducts && storedProducts.length > 0) {
      storedProducts.forEach((p) => {
        if (!p || !p.name) return;
        const cat = p.category || resolveBreadCategory(p.name, p.id, storedProducts);
        if (cat === "materia_prima" || cat === "abarrotes" || cat === "bebidas") return;
        const norm = normalizeProductName(p.name);
        const icon = cat === "pan_blanco" ? "🍞" : cat === "pasteleria" ? "🍰" : cat === "temporada" ? "✨" : "🥖";
        map.set(norm, { id: p.id, name: p.name, category: cat, icon });
      });
    }

    if (map.size === 0) {
      fallbackBreads.forEach((fb) => {
        map.set(normalizeProductName(fb.name), { name: fb.name, category: fb.category, icon: fb.icon });
      });
    }

    targetOrders.forEach((o) => {
      const items = extractItemsFromOrder(o);
      items.forEach((it) => {
        const norm = normalizeProductName(it.name);
        if (!map.has(norm)) {
          const cat = resolveBreadCategory(it.name, it.productId, storedProducts);
          if (cat !== "materia_prima" && cat !== "abarrotes" && cat !== "bebidas") {
            const icon = cat === "pan_blanco" ? "🍞" : cat === "pasteleria" ? "🍰" : cat === "temporada" ? "✨" : "🥖";
            map.set(norm, { id: it.productId, name: it.name, category: cat, icon });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [storedProducts, targetOrders]);

  // Lista de panes filtrada según la categoría seleccionada en la Barra de Categorías
  const displayedBreadList = useMemo(() => {
    if (breadCategoryFilter === "all") return allRegisteredBreadList;
    return allRegisteredBreadList.filter((b: any) => b.category === breadCategoryFilter);
  }, [allRegisteredBreadList, breadCategoryFilter]);

  // Conteo de piezas para la selección actual (global o sucursal activa)
  const getBreadTotalPiecesInSelection = (breadName: string): number => {
    const norm = normalizeProductName(breadName);
    let total = 0;
    targetOrders.forEach((o) => {
      if (selectedBranchId !== "all") {
        const bId = o.branchId || o.operatingBranchId || branches[0]?.id;
        const matched = branches.find((b) => b.name.toLowerCase() === (o.branchName || "").toLowerCase());
        if (bId !== selectedBranchId && matched?.id !== selectedBranchId) return;
      }
      const items = extractItemsFromOrder(o);
      items.forEach((it) => {
        if (normalizeProductName(it.name) === norm) {
          total += it.quantity || 1;
        }
      });
    });
    return total;
  };

  // Lista consolidada filtrada por buscador para la vista de taller
  const filteredConsolidated = useMemo(() => {
    return globalConsolidated.filter((it: BreadSummaryItem) => {
      if (searchProduct.trim()) {
        const q = normalizeProductName(it.name);
        if (!normalizeProductName(it.name).includes(q)) return false;
      }
      return true;
    });
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

  // Función para imprimir hoja personalizada con únicamente el nombre de la sucursal y sus panes requeridos
  const handlePrint = (targetGroup?: BranchDistributionGroup) => {
    let groupsToPrint: BranchDistributionGroup[] = [];

    if (targetGroup) {
      groupsToPrint = [targetGroup];
    } else if (selectedBranchId !== "all") {
      const found = branchGroups.find((g) => g.branchId === selectedBranchId);
      if (found) {
        groupsToPrint = [found];
      }
    } else {
      // Filtrar solo las sucursales que tengan piezas requeridas
      groupsToPrint = branchGroups.filter((g) => g.totalPieces > 0);
    }

    if (groupsToPrint.length === 0) {
      alert("No hay piezas de pan programadas para entregar en la fecha seleccionada.");
      return;
    }

    printBranchDeliverySheet(groupsToPrint, formatLongDateSpanish(selectedDate), dateLabel);
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
                onClick={() => handlePrint()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                title={
                  selectedBranchId !== "all"
                    ? `Imprimir hoja únicamente para ${branches.find((b) => b.id === selectedBranchId)?.name || "esta sucursal"}`
                    : "Imprimir hoja de reparto por sucursal"
                }
              >
                <Printer className="w-3.5 h-3.5 text-stone-300" />
                <span>
                  {selectedBranchId !== "all"
                    ? `Imprimir Hoja (${branches.find((b) => b.id === selectedBranchId)?.name.replace(/^Sucursal\s+/i, "") || "Sucursal"})`
                    : "Imprimir Hoja"}
                </span>
              </button>
            </div>
          </div>

          {/* Segunda Fila: Modos de Vista, Filtro de Sucursal y Buscador */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
            {/* Pestañas de Vista */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setViewMode("categories")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "categories"
                    ? "bg-white text-stone-900 shadow-2xs scale-102"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>📊 Por Categorías</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("branch")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "branch"
                    ? "bg-white text-stone-900 shadow-2xs scale-102"
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
                    ? "bg-white text-stone-900 shadow-2xs scale-102"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Consolidado de Panes</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("products")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "products"
                    ? "bg-white text-stone-900 shadow-2xs scale-102"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>🥖 Barra de Panes</span>
              </button>
            </div>

            {/* Filtros de Sucursal y Búsqueda */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="text-xs sm:text-sm font-bold text-stone-800 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs appearance-none"
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

              {/* Selector de Categoría (Lista Desplegable Rápida) */}
              <div className="relative">
                <select
                  value={breadCategoryFilter}
                  onChange={(e) => setBreadCategoryFilter(e.target.value)}
                  className="text-xs sm:text-sm font-bold text-stone-800 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs appearance-none"
                  title="Filtrar por lista de categorías de pan"
                >
                  <option value="all">
                    🧺 Todas las Categorías ({selectedBranchTotalPieces} pzas)
                  </option>
                  {categoriesWithPieces.map(({ category: cat, totalPieces: pieces }: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon || "🥖"} {cat.label} ({pieces} pzas)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

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

        {/* ── LISTA DE CATEGORÍAS DE PAN (EN FORMA DE LISTA) ── */}
        <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-amber-50/90 via-stone-50 to-amber-50/90 border-b border-amber-200/90 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
            <div className="flex items-center gap-2 text-xs font-black text-amber-950 uppercase tracking-wider">
              <List className="w-4 h-4 text-amber-700" />
              <span>Lista de Categorías de Pan</span>
              <span className="bg-amber-200/90 text-amber-950 font-bold text-[10px] px-2 py-0.2 rounded-full border border-amber-300">
                {allRegisteredCategories.length} categorías
              </span>
            </div>

            <div className="flex items-center gap-2">
              {breadCategoryFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setBreadCategoryFilter("all")}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer underline flex items-center gap-1"
                >
                  <span>Mostrar todas</span>
                  <span>✕</span>
                </button>
              )}

              {/* Selector de modo de lista: Desplegable o Lista Vertical Completa */}
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-stone-200 shadow-2xs text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCategoryListDisplayMode("dropdown")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    categoryListDisplayMode === "dropdown"
                      ? "bg-amber-800 text-white font-black shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Ver selector en forma de lista desplegable"
                >
                  ▾ Desplegable
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryListDisplayMode("vertical")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    categoryListDisplayMode === "vertical"
                      ? "bg-amber-800 text-white font-black shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  title="Ver todas las categorías en forma de lista vertical"
                >
                  ☰ Lista completa
                </button>
              </div>
            </div>
          </div>

          {/* OPCIÓN A: EN FORMA DE LISTA DESPLEGABLE (INTERACTIVA CON LETRAS GRANDES) */}
          {categoryListDisplayMode === "dropdown" ? (
            <div ref={categoryMenuRef} className="relative w-full max-w-xl">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                className="w-full bg-white hover:bg-amber-50/70 border-2 border-amber-400 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl sm:text-3xl shrink-0 leading-none">
                    {breadCategoryFilter === "all"
                      ? "🧺"
                      : allRegisteredCategories.find((c) => c.id === breadCategoryFilter)?.icon || "🥖"}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs uppercase font-extrabold text-amber-900/80 block leading-tight">
                      Categoría Seleccionada:
                    </span>
                    <span className="text-sm sm:text-base font-black text-stone-900 block truncate leading-tight mt-0.5">
                      {breadCategoryFilter === "all"
                        ? "Todas las Categorías de Pan"
                        : allRegisteredCategories.find((c) => c.id === breadCategoryFilter)?.label || "Categoría"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300">
                    {breadCategoryFilter === "all"
                      ? `${selectedBranchTotalPieces} pzas`
                      : `${categoriesWithPieces.find((c: any) => c.category.id === breadCategoryFilter)?.totalPieces || 0} pzas`}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-700 transition-transform duration-200 ${
                      isCategoryMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Menú Desplegable Flotante con LETRAS GRANDES */}
              {isCategoryMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[0.5px]"
                    onClick={() => setIsCategoryMenuOpen(false)}
                  />

                  <div className="fixed sm:absolute inset-x-3 bottom-6 sm:bottom-auto sm:inset-x-auto sm:left-0 sm:top-[calc(100%+8px)] sm:w-[480px] bg-white rounded-3xl shadow-2xl border-2 border-amber-500 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-gradient-to-r from-amber-800 to-amber-900 text-white px-4 py-3 flex items-center justify-between border-b border-amber-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🧺</span>
                        <span className="text-sm sm:text-base font-black uppercase tracking-wide">
                          Lista de Categorías de Pan
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="text-amber-100 hover:text-white text-xs font-black px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
                      {/* 1. Todas las Categorías */}
                      <button
                        type="button"
                        onClick={() => {
                          setBreadCategoryFilter("all");
                          setIsCategoryMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 sm:py-3.5 rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          breadCategoryFilter === "all"
                            ? "bg-amber-100/90 text-amber-950 font-black ring-2 ring-amber-500/80 shadow-xs"
                            : "hover:bg-amber-50/70 text-stone-900 font-bold"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="text-2xl sm:text-3xl shrink-0 leading-none">🧺</span>
                          <span className="text-base sm:text-lg font-black truncate">
                            Todas las Categorías
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`text-sm sm:text-base font-black px-3 py-1 rounded-xl ${
                              breadCategoryFilter === "all"
                                ? "bg-amber-900 text-white"
                                : "bg-stone-100 text-stone-800"
                            }`}
                          >
                            {selectedBranchTotalPieces} pzas
                          </span>
                          {breadCategoryFilter === "all" && (
                            <Check className="w-5 h-5 text-amber-800 stroke-[3] shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* 2. Categorías Registradas */}
                      {categoriesWithPieces.map(({ category: cat, totalPieces: pieces }: any) => {
                        const isSelected = breadCategoryFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setBreadCategoryFilter(cat.id);
                              setIsCategoryMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 sm:py-3.5 rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-emerald-100/90 text-emerald-950 font-black ring-2 ring-emerald-500/80 shadow-xs"
                                : "hover:bg-amber-50/70 text-stone-900 font-bold"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className="text-2xl sm:text-3xl shrink-0 leading-none">
                                {cat.icon || "🥖"}
                              </span>
                              <span className="text-base sm:text-lg font-black truncate">
                                {cat.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={`text-sm sm:text-base font-black px-3 py-1 rounded-xl ${
                                  isSelected
                                    ? "bg-emerald-800 text-white"
                                    : pieces > 0
                                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                    : "bg-stone-100 text-stone-800"
                                }`}
                              >
                                {pieces} pzas
                              </span>
                              {isSelected && (
                                <Check className="w-5 h-5 text-emerald-800 stroke-[3] shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* OPCIÓN B: EN FORMA DE LISTA VERTICAL COMPLETA (FILAS ORGANIZADAS SIN SCROLL HORIZONTAL) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-1">
              {/* Opción 1: Todas las Categorías */}
              <button
                type="button"
                onClick={() => setBreadCategoryFilter("all")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                  breadCategoryFilter === "all"
                    ? "bg-amber-900 text-white border-amber-950 ring-2 ring-amber-400 shadow-xs scale-[1.01]"
                    : "bg-white hover:bg-amber-50 text-stone-700 border-stone-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">🧺</span>
                  <span className="text-xs sm:text-sm font-black truncate">Todas las Categorías</span>
                </div>
                <span
                  className={`font-mono text-xs px-2.5 py-0.5 rounded-lg font-black shrink-0 ${
                    breadCategoryFilter === "all"
                      ? "bg-amber-950 text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {selectedBranchTotalPieces} pzas
                </span>
              </button>

              {/* Categorías individuales */}
              {categoriesWithPieces.map(({ category: cat, totalPieces: pieces }: any) => {
                const isSelected = breadCategoryFilter === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBreadCategoryFilter(isSelected ? "all" : cat.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-400 shadow-xs scale-[1.01]"
                        : pieces > 0
                        ? "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{cat.icon || "🥖"}</span>
                      <span className="text-xs sm:text-sm font-black truncate">{cat.label}</span>
                    </div>
                    <span
                      className={`font-mono text-xs px-2.5 py-0.5 rounded-lg font-black shrink-0 ${
                        isSelected
                          ? "bg-emerald-950 text-white"
                          : pieces > 0
                          ? "bg-emerald-200 text-emerald-950"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {pieces} pzas
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BARRA HORIZONTAL RÁPIDA DE TODOS LOS PRODUCTOS DE PAN REGISTRADOS ── */}
        <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-amber-50/80 via-orange-50/30 to-amber-50/80 border-b border-amber-200/80 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
              <ChefHat className="w-4 h-4 text-amber-700" />
              <span>Barra de Productos de Pan Registrados en la Tienda</span>
              <span className="bg-amber-200/80 text-amber-950 font-bold text-[10px] px-2 py-0.2 rounded-full border border-amber-300">
                {allRegisteredBreadList.length} tipos de pan
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold hidden md:inline">
              Toca un pan para filtrar o ver piezas en las tiendas
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-300">
            {displayedBreadList.map((bread: any, bIdx: number) => {
              const isSelected = searchProduct.toLowerCase() === bread.name.toLowerCase();
              const piecesInSelection = getBreadTotalPiecesInSelection(bread.name);

              return (
                <button
                  key={bIdx}
                  type="button"
                  onClick={() => setSearchProduct(isSelected ? "" : bread.name)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-2xs border ${
                    isSelected
                      ? "bg-amber-900 text-white border-amber-950 ring-2 ring-amber-400"
                      : piecesInSelection > 0
                      ? "bg-white text-stone-900 border-amber-300 hover:border-amber-500 hover:bg-amber-50/50"
                      : "bg-[#fcfbf9] text-stone-600 border-stone-200 hover:border-stone-400"
                  }`}
                  title={`Filtrar por ${bread.name} (${piecesInSelection} pzas)`}
                >
                  <span className="text-sm">{bread.icon || "🥖"}</span>
                  <span className="truncate max-w-[130px]">{bread.name}</span>
                  <span
                    className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? "bg-amber-950 text-white"
                        : piecesInSelection > 0
                        ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                        : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {piecesInSelection} pzas
                  </span>
                </button>
              );
            })}
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
                <p className="text-xs font-black">TOTAL: {selectedBranchTotalPieces} PIEZAS</p>
                <p className="text-[10px] text-stone-500">{selectedBranchTotalOrders} pedidos</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VISTA 1: TODAS LAS CATEGORÍAS REGISTRADAS CON PIEZAS NO EDITABLES         */}
          {/* ========================================================================= */}
          {viewMode === "categories" ? (
            <div className="space-y-4">
              {/* Encabezado informativo */}
              <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-stone-50 border border-amber-200/90 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-2xs">
                    📊
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                        Categorías de Pan y Piezas Requeridas
                      </h4>
                      <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-300">
                        {selectedBranchId === "all"
                          ? "Todas las Sucursales"
                          : branches.find((b) => b.id === selectedBranchId)?.name || "Sucursal"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-medium mt-0.5">
                      {selectedBranchId === "all"
                        ? `Piezas calculadas automáticamente según los pedidos activos para el ${formatLongDateSpanish(selectedDate)}`
                        : `Piezas calculadas para entrega en ${branches.find((b) => b.id === selectedBranchId)?.name || "esta sucursal"} el ${formatLongDateSpanish(selectedDate)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                      Total a Elaborar
                    </span>
                    <span className="font-mono text-xl sm:text-2xl font-black text-emerald-950 block tabular-nums leading-none mt-0.5">
                      {selectedBranchTotalPieces} <span className="text-xs font-bold text-stone-500">pzas</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de TODAS las categorías registradas */}
              <div className="grid grid-cols-1 gap-3">
                {categoriesWithPieces.map(({ category, totalPieces, breads, branchBreakdown }: any) => {
                  const hasPieces = totalPieces > 0;

                  return (
                    <div
                      key={category.id}
                      className={`rounded-2xl border-2 transition-all shadow-xs p-3.5 sm:p-4 bg-white ${
                        hasPieces
                          ? "border-amber-300/90 shadow-sm"
                          : "border-stone-200/80 bg-[#fbf9f6]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Categoría registrada */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-2xs ${
                              hasPieces
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-stone-100 text-stone-400 border border-stone-200"
                            }`}
                          >
                            {category.icon || "🥖"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                                {category.label}
                              </h5>
                              {hasPieces ? (
                                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                  {breads.length} {breads.length === 1 ? "tipo de pan" : "tipos de pan"}
                                </span>
                              ) : (
                                <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  0 encargos
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                              {hasPieces
                                ? selectedBranchId === "all"
                                  ? `Requerido para producción en ${branchBreakdown.length} sucursal(es)`
                                  : `Requerido para entrega en ${branches.find((b) => b.id === selectedBranchId)?.name || "esta sucursal"}`
                                : `No hay pedidos registrados para esta categoría`}
                            </p>
                          </div>
                        </div>

                        {/* ENFRENTE: NÚMERO DE PIEZAS NO EDITABLE */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">
                              Piezas Requeridas
                            </span>
                            <div className="flex items-baseline justify-end gap-1.5 mt-1">
                              <span
                                className={`font-mono font-black text-2xl sm:text-3xl tabular-nums leading-none px-3.5 py-1 rounded-xl border ${
                                  hasPieces
                                    ? "bg-emerald-100/80 text-emerald-950 border-emerald-400 shadow-2xs"
                                    : "bg-stone-100 text-stone-400 border-stone-200"
                                }`}
                              >
                                {totalPieces}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-stone-600">
                                pzas
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desglose de panes específicos de esta categoría cuando hay piezas */}
                      {hasPieces && (
                        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5">
                          {/* Panes individuales */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-stone-400 mr-1">
                              Panes a hornear:
                            </span>
                            {breads.map((b: any, bIdx: number) => (
                              <span
                                key={bIdx}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#faf7f2] text-stone-900 border border-stone-200 px-2.5 py-1 rounded-xl shadow-2xs"
                              >
                                <span className="font-mono font-black text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded text-[11px]">
                                  {b.pieces}x
                                </span>
                                <span>{b.name}</span>
                              </span>
                            ))}
                          </div>

                          {/* Reparto por sucursal */}
                          {selectedBranchId === "all" && branchBreakdown.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] uppercase font-bold text-stone-400 mr-1">
                                Reparto por sucursal:
                              </span>
                              {branchBreakdown.map((br: any, brIdx: number) => (
                                <span
                                  key={brIdx}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded-lg border border-stone-200"
                                >
                                  <span className="text-emerald-800 font-extrabold">{br.pieces} pzas</span>
                                  <span className="text-stone-500">➔</span>
                                  <span>{br.branchName.replace(/^Sucursal\s+/i, "")}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "consolidated" ? (
            /* ========================================================================= */
            /* VISTA 3: CONSOLIDADO GENERAL DE PANES                                     */
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
                      Suma global de todas las piezas requeridas el {formatLongDateSpanish(selectedDate)}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-xs font-black bg-white px-3 py-1 rounded-xl text-amber-900 border border-amber-300 shadow-2xs">
                  {selectedBranchTotalPieces} piezas en total
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
                      {filteredConsolidated.map((item: any, idx: number) => {
                        const branchCounts: Record<string, number> = {};
                        item.ordersDetails.forEach((od: any) => {
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
          ) : viewMode === "branch" ? (
            /* ========================================================================= */
            /* VISTA 2: DESGLOSE POR SUCURSAL CON BARRA DE TODOS LOS PRODUCTOS DE PAN   */
            /* ========================================================================= */
            filteredBranchGroups.length === 0 ? (
              <div className="py-8 px-4 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                No se encontraron sucursales o pedidos para esta fecha.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBranchGroups.map((group) => {
                const hasPieces = group.totalPieces > 0;
                const isOrdersExpanded = Boolean(expandedOrdersList[group.branchId]);

                // Mapa de pedidos activos de esta sucursal
                const branchOrderedMap = new Map<string, BreadSummaryItem>();
                group.items.forEach((it) => {
                  branchOrderedMap.set(normalizeProductName(it.name), it);
                });

                // Barra completa de todos los productos de pan registrados en la tienda para esta sucursal
                const branchStoreBreadItems = allRegisteredBreadList
                  .filter((b) => {
                    if (breadCategoryFilter !== "all" && b.category !== breadCategoryFilter) return false;
                    if (searchProduct.trim()) {
                      const q = normalizeProductName(searchProduct);
                      if (!normalizeProductName(b.name).includes(q)) return false;
                    }
                    return true;
                  })
                  .map((b) => {
                    const norm = normalizeProductName(b.name);
                    const ordered = branchOrderedMap.get(norm);
                    if (ordered) {
                      return {
                        ...ordered,
                        icon: b.icon || "🥖",
                        categoryLabel: b.category,
                      };
                    }
                    return {
                      name: b.name,
                      totalPieces: 0,
                      ordersCount: 0,
                      orderNumbers: [],
                      ordersDetails: [],
                      categoryId: b.category,
                      productId: b.id,
                      icon: b.icon || "🥖",
                      categoryLabel: b.category,
                    };
                  })
                  .sort((a, b) => {
                    // Primero los que tienen piezas > 0, luego alfabéticamente
                    if (a.totalPieces !== b.totalPieces) return b.totalPieces - a.totalPieces;
                    return a.name.localeCompare(b.name);
                  });

                const activeCount = branchStoreBreadItems.filter((i) => i.totalPieces > 0).length;
                const displayedBranchItems = showAllStoreProducts
                  ? branchStoreBreadItems
                  : branchStoreBreadItems.filter((it) => it.totalPieces > 0);

                return (
                  <div
                    key={group.branchId}
                    className={`bg-white rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
                      hasPieces
                        ? "border-amber-300/90 shadow-sm"
                        : "border-stone-200/90 hover:border-amber-300 shadow-2xs"
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

                        {hasPieces && (
                          <button
                            type="button"
                            onClick={() => handlePrint(group)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                            title={`Imprimir hoja únicamente para ${group.branchName}`}
                          >
                            <Printer className="w-3.5 h-3.5 text-stone-300" />
                            <span className="hidden sm:inline">Imprimir Hoja</span>
                          </button>
                        )}

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

                    {/* ── BARRA DE PRODUCTOS DE PAN DE LA TIENDA ── */}
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* Sub-barra de Control y Conteo de Panes */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-amber-700" />
                            <span>Barra de Productos de Pan Registrados</span>
                          </span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full">
                            {displayedBranchItems.length} tipos de pan
                          </span>
                          {activeCount > 0 && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.2 rounded-full">
                              {activeCount} con entrega activa
                            </span>
                          )}
                        </div>

                        {/* Botón de alternancia: Mostrar todos vs Solo con pedidos */}
                        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                          <button
                            type="button"
                            onClick={() => setShowAllStoreProducts(true)}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer ${
                              showAllStoreProducts
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-800"
                            }`}
                            title="Mostrar todos los productos de pan registrados en el catálogo de la tienda"
                          >
                            Todos ({branchStoreBreadItems.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAllStoreProducts(false)}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer ${
                              !showAllStoreProducts
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-800"
                            }`}
                            title="Mostrar únicamente los panes que tienen pedidos programados"
                          >
                            Solo con encargos ({activeCount})
                          </button>
                        </div>
                      </div>

                      {/* Notificación informativa si la sucursal no tiene pedidos */}
                      {!hasPieces && (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-base shrink-0">🥖</span>
                            <span className="font-semibold">
                              Sin pedidos programados para esta tienda el {formatLongDateSpanish(selectedDate)}. A continuación tienes la barra completa de panes registrados:
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-black bg-white px-2 py-0.5 rounded-lg border border-amber-300 text-amber-950">
                            0 piezas requeridas
                          </span>
                        </div>
                      )}

                      {/* Parrilla / Barra de Panes */}
                      {displayedBranchItems.length === 0 ? (
                        <div className="py-6 text-center text-xs text-stone-400 italic">
                          No se encontraron panes con los filtros de búsqueda aplicados.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {displayedBranchItems.map((it: any, itIdx: number) => {
                            const isOrdered = it.totalPieces > 0;
                            const percent =
                              group.totalPieces > 0
                                ? Math.round((it.totalPieces / group.totalPieces) * 100)
                                : 0;

                            return (
                              <div
                                key={itIdx}
                                className={`rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs transition-all ${
                                  isOrdered
                                    ? "bg-[#fcfaf7] border border-amber-300/90 hover:border-amber-500 shadow-xs"
                                    : "bg-white border border-stone-200/80 hover:border-stone-300 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm shrink-0">{it.icon || "🥖"}</span>
                                    <span
                                      className={`text-xs sm:text-sm font-black block truncate ${
                                        isOrdered ? "text-stone-900" : "text-stone-700"
                                      }`}
                                      title={it.name}
                                    >
                                      {it.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium mt-0.5 pl-5">
                                    {isOrdered ? (
                                      <>
                                        <span className="text-emerald-800 font-extrabold">
                                          {it.ordersCount} encargo{it.ordersCount === 1 ? "" : "s"}
                                        </span>
                                        <span>•</span>
                                        <span>{percent}% de la tienda</span>
                                      </>
                                    ) : (
                                      <span className="text-stone-400 font-semibold">
                                        0 encargos • Registrado en tienda
                                      </span>
                                    )}
                                  </div>

                                  {/* Barra de proporción visual */}
                                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isOrdered ? "bg-amber-600" : "bg-stone-300"
                                      }`}
                                      style={{ width: `${isOrdered ? Math.max(8, percent) : 0}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Número de Piezas Enfrente (No editable) */}
                                <div className="text-right shrink-0 pl-2.5 border-l border-stone-200/80 min-w-[60px]">
                                  <span
                                    className={`text-base sm:text-lg font-black font-mono block tabular-nums leading-none ${
                                      isOrdered ? "text-amber-950" : "text-stone-400"
                                    }`}
                                  >
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
                      )}

                      {/* Desplegable Opcional: Lista de pedidos individuales de la cajera */}
                      {isOrdersExpanded && group.orders.length > 0 && (
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
                  </div>
                );
              })}
            </div>
          ))
           : (
            /* ========================================================================= */
            /* VISTA 4: BARRA MAESTRA DE TODOS LOS PRODUCTOS DE PAN REGISTRADOS          */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 via-orange-50/40 to-stone-50 border border-amber-200/90 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-2xs">
                    🥖
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                        Barra de Todos los Productos de Pan Registrados
                      </h4>
                      <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-300">
                        {allRegisteredBreadList.length} productos registrados
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-medium mt-0.5">
                      {selectedBranchId === "all"
                        ? "Catálogo completo de panadería con piezas consolidadas para todas las sucursales"
                        : `Catálogo completo de panadería con piezas para ${branches.find((b) => b.id === selectedBranchId)?.name || "la sucursal seleccionada"}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                    Total Piezas
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-950 block tabular-nums leading-none mt-0.5">
                    {selectedBranchTotalPieces} <span className="text-xs font-bold text-stone-500">pzas</span>
                  </span>
                </div>
              </div>

              {/* Parrilla de la Barra Maestra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allRegisteredBreadList
                  .filter((b) => {
                    if (breadCategoryFilter !== "all" && b.category !== breadCategoryFilter) return false;
                    if (searchProduct.trim()) {
                      const q = normalizeProductName(searchProduct);
                      if (!normalizeProductName(b.name).includes(q)) return false;
                    }
                    return true;
                  })
                  .map((bread, bIdx) => {
                    const pieces = getBreadTotalPiecesInSelection(bread.name);
                    const isOrdered = pieces > 0;

                    // Desglose por sucursal de este pan
                    const branchBreakdown: Record<string, number> = {};
                    targetOrders.forEach((o) => {
                      if (selectedBranchId !== "all") {
                        const bId = o.branchId || o.operatingBranchId || branches[0]?.id;
                        const matched = branches.find((b) => b.name.toLowerCase() === (o.branchName || "").toLowerCase());
                        if (bId !== selectedBranchId && matched?.id !== selectedBranchId) return;
                      }
                      const items = extractItemsFromOrder(o);
                      items.forEach((it) => {
                        if (normalizeProductName(it.name) === normalizeProductName(bread.name)) {
                          const bName = o.branchName || "Matriz";
                          branchBreakdown[bName] = (branchBreakdown[bName] || 0) + (it.quantity || 1);
                        }
                      });
                    });

                    return (
                      <div
                        key={bIdx}
                        className={`rounded-2xl border-2 transition-all p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between ${
                          isOrdered
                            ? "bg-white border-amber-300 shadow-sm"
                            : "bg-[#faf9f6]/70 border-stone-200/90"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-2xl shrink-0">{bread.icon || "🥖"}</span>
                              <div className="min-w-0">
                                <h5 className="text-sm sm:text-base font-black text-stone-900 truncate" title={bread.name}>
                                  {bread.name}
                                </h5>
                                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                                  {bread.category.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>

                            {/* Número de piezas enfrente */}
                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono font-black text-lg sm:text-xl px-2.5 py-0.5 rounded-xl border tabular-nums block ${
                                  isOrdered
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs"
                                    : "bg-stone-100 text-stone-400 border-stone-200"
                                }`}
                              >
                                {pieces} pzas
                              </span>
                            </div>
                          </div>

                          {/* Barra de Proporción */}
                          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-3">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOrdered ? "bg-amber-600" : "bg-stone-300"
                              }`}
                              style={{
                                width: `${
                                  selectedBranchTotalPieces > 0 && isOrdered
                                    ? Math.max(10, Math.round((pieces / selectedBranchTotalPieces) * 100))
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Desglose de sucursales si aplica */}
                        {isOrdered && Object.keys(branchBreakdown).length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-stone-400">Entrega:</span>
                            {Object.entries(branchBreakdown).map(([bName, qty], bbIdx) => (
                              <span
                                key={bbIdx}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-stone-100 text-stone-800 px-2 py-0.2 rounded-md border border-stone-200"
                              >
                                <span className="text-amber-800 font-extrabold">{qty}x</span>
                                <span>{bName.replace(/^Sucursal\s+/i, "")}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
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
