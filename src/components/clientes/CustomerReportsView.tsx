"use client";

import React, { useState, useMemo } from "react";
import { 
  Customer, 
  CustomerPurchase 
} from "@/types";
import { 
  formatCurrency, 
  parseDateTimeSafe 
} from "@/lib/utils";
import { 
  Users, 
  Trophy, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Phone, 
  Receipt, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Flame, 
  MessageCircle, 
  ArrowUpRight, 
  ShoppingBag, 
  Award,
  ChevronRight,
  Filter,
  RefreshCw,
  Percent
} from "lucide-react";

// Ícono SVG oficial de WhatsApp
function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

// Formateador limpio y ordenado de números telefónicos
function formatPhone(phone: string | undefined | null): string {
  if (!phone || phone === "N/A" || phone.toLowerCase().includes("sin")) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return digits;
}

export interface CustomerReportsViewProps {
  customers: Customer[];
  onViewCustomerHistory: (customer: Customer) => void;
  onSelectCustomerInDirectory?: (customerName: string) => void;
}

type ReportSection = "ranking" | "frecuencia" | "inactivos";

interface EnrichedCustomerData {
  customer: Customer;
  totalSpent: number;
  ticketCount: number;
  averageTicket: number;
  lastPurchaseDate: string | null;
  lastPurchaseTimestamp: number;
  daysSinceLastPurchase: number | null; // null si no tiene compras
  favoriteProduct: string;
  totalPieces: number;
  topProducts: { name: string; quantity: number }[];
  isInactive30Days: boolean;
  isInactive15Days: boolean;
  frequencyCategory: "vip" | "regular" | "ocasional" | "sin_compras";
}

export default function CustomerReportsView({
  customers,
  onViewCustomerHistory,
  onSelectCustomerInDirectory
}: CustomerReportsViewProps) {
  const [activeSection, setActiveSection] = useState<ReportSection>("ranking");
  const [topSortCriterion, setTopSortCriterion] = useState<"total" | "tickets">("total");
  const [inactiveFilter, setInactiveFilter] = useState<"all" | "over30" | "15to30" | "never">("all");

  const now = Date.now();

  // Procesar y enriquecer todos los datos de clientes para reportes analíticos
  const enrichedCustomers: EnrichedCustomerData[] = useMemo(() => {
    return (customers || [])
      .filter((c) => c && c.id !== "cli-0" && c.type !== "general")
      .map((c) => {
        const history = c.purchaseHistory || [];
        const ticketCount = history.length;

        // Calcular total gastado de historial o del campo acumulado
        const historyTotal = history.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const totalSpent = Math.max(c.totalPurchases || 0, historyTotal);

        const averageTicket = ticketCount > 0 ? totalSpent / ticketCount : totalSpent > 0 ? totalSpent : 0;

        // Determinar última fecha de compra
        let lastPurchaseTimestamp = 0;
        let lastPurchaseDate: string | null = null;

        for (const p of history) {
          const t = parseDateTimeSafe(p.date);
          if (t > lastPurchaseTimestamp) {
            lastPurchaseTimestamp = t;
            lastPurchaseDate = p.date;
          }
        }

        // Si no hay timestamp de compra, intentar con timestamp de registro
        const registrationTs = c.createdAt || (c.registeredAt ? parseDateTimeSafe(c.registeredAt) : 0);

        let daysSinceLastPurchase: number | null = null;
        if (lastPurchaseTimestamp > 0) {
          const diffMs = now - lastPurchaseTimestamp;
          daysSinceLastPurchase = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        } else if (registrationTs > 0 && totalSpent > 0) {
          const diffMs = now - registrationTs;
          daysSinceLastPurchase = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        // Moda y desglose de productos
        const counts: Record<string, number> = { ...(c.purchaseCounts || {}) };
        if (Object.keys(counts).length === 0 && history.length > 0) {
          for (const p of history) {
            for (const it of p.items || []) {
              if (it.name) {
                counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
              }
            }
          }
        }

        const sortedProds = Object.entries(counts)
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity);

        const totalPieces = sortedProds.reduce((sum, p) => sum + p.quantity, 0);
        const favoriteProduct = c.favoriteProduct || (sortedProds.length > 0 ? sortedProds[0].name : "Pan Surtido Tradicional");

        const isInactive30Days = daysSinceLastPurchase !== null ? daysSinceLastPurchase >= 30 : totalSpent === 0;
        const isInactive15Days = daysSinceLastPurchase !== null ? daysSinceLastPurchase >= 15 : totalSpent === 0;

        let frequencyCategory: "vip" | "regular" | "ocasional" | "sin_compras" = "sin_compras";
        if (totalSpent === 0 && ticketCount === 0) {
          frequencyCategory = "sin_compras";
        } else if (totalSpent >= 2500 || ticketCount >= 5) {
          frequencyCategory = "vip";
        } else if (ticketCount >= 2 || totalSpent >= 800) {
          frequencyCategory = "regular";
        } else {
          frequencyCategory = "ocasional";
        }

        return {
          customer: c,
          totalSpent,
          ticketCount,
          averageTicket,
          lastPurchaseDate,
          lastPurchaseTimestamp,
          daysSinceLastPurchase,
          favoriteProduct,
          totalPieces,
          topProducts: sortedProds,
          isInactive30Days,
          isInactive15Days,
          frequencyCategory,
        };
      });
  }, [customers, now]);

  // Indicadores Globales (KPIs)
  const globalKpis = useMemo(() => {
    const totalCustomers = enrichedCustomers.length;
    const customersWithPurchases = enrichedCustomers.filter((c) => c.totalSpent > 0);
    const totalRevenue = enrichedCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalTickets = enrichedCustomers.reduce((sum, c) => sum + c.ticketCount, 0);
    const averageTicket = totalTickets > 0 ? totalRevenue / totalTickets : 0;
    const inactiveCount = enrichedCustomers.filter((c) => c.isInactive30Days).length;
    const activeCount = totalCustomers - inactiveCount;

    return {
      totalCustomers,
      customersWithPurchasesCount: customersWithPurchases.length,
      totalRevenue,
      totalTickets,
      averageTicket,
      inactiveCount,
      activeCount,
    };
  }, [enrichedCustomers]);

  // Ranking de Clientes Ordenado
  const rankedCustomers = useMemo(() => {
    return [...enrichedCustomers].sort((a, b) => {
      if (topSortCriterion === "total") {
        if (b.totalSpent !== a.totalSpent) {
          return b.totalSpent - a.totalSpent;
        }
        return b.ticketCount - a.ticketCount;
      } else {
        if (b.ticketCount !== a.ticketCount) {
          return b.ticketCount - a.ticketCount;
        }
        return b.totalSpent - a.totalSpent;
      }
    });
  }, [enrichedCustomers, topSortCriterion]);

  // Clientes Inactivos Filtrados
  const inactiveCustomers = useMemo(() => {
    return enrichedCustomers
      .filter((item) => {
        if (inactiveFilter === "over30") {
          return item.daysSinceLastPurchase !== null && item.daysSinceLastPurchase >= 30;
        }
        if (inactiveFilter === "15to30") {
          return item.daysSinceLastPurchase !== null && item.daysSinceLastPurchase >= 15 && item.daysSinceLastPurchase < 30;
        }
        if (inactiveFilter === "never") {
          return item.daysSinceLastPurchase === null || item.totalSpent === 0;
        }
        // "all" inactivos: +30 días o nunca han comprado
        return item.isInactive30Days;
      })
      .sort((a, b) => {
        const daysA = a.daysSinceLastPurchase ?? 9999;
        const daysB = b.daysSinceLastPurchase ?? 9999;
        return daysB - daysA;
      });
  }, [enrichedCustomers, inactiveFilter]);

  // Consolidado de Productos Estrella Más Comprados
  const globalPopularProducts = useMemo(() => {
    const productMap: Record<string, { name: string; quantity: number; buyerCount: number }> = {};

    for (const ec of enrichedCustomers) {
      for (const tp of ec.topProducts) {
        if (!productMap[tp.name]) {
          productMap[tp.name] = { name: tp.name, quantity: 0, buyerCount: 0 };
        }
        productMap[tp.name].quantity += tp.quantity;
        productMap[tp.name].buyerCount += 1;
      }
    }

    const sorted = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
    const maxQty = sorted.length > 0 ? sorted[0].quantity : 1;

    return { items: sorted.slice(0, 10), maxQty };
  }, [enrichedCustomers]);

  // Mensaje de Reactivación por WhatsApp
  const generateWhatsAppReactivationLink = (customerName: string, phone: string, favoriteProduct: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 8) return "";

    const text = `¡Hola ${customerName}! Te saludamos con mucho cariño de Panadería Brito 🥖. Hace unos días que no te vemos por la panadería y queremos recordarte que tenemos tu pan calientito y recién horneado esperándote (especialmente tu ${favoriteProduct} favorito). ¡Esperamos verte pronto por aquí! 😊`;

    return `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TARJETAS DE INDICADORES PRINCIPALES (KPIS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Clientes Totales */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-500">
              Clientes en Sistema
            </span>
            <div className="p-2 sm:p-2.5 bg-amber-100 text-amber-900 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900">
              {globalKpis.totalCustomers}
            </span>
            <p className="text-xs text-stone-500 font-bold mt-1">
              <span className="text-emerald-700 font-black">{globalKpis.customersWithPurchasesCount}</span> con compras registradas
            </p>
          </div>
        </div>

        {/* KPI 2: Ventas Totales a Clientes */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-500">
              Ventas a Clientes
            </span>
            <div className="p-2 sm:p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800">
              {formatCurrency(globalKpis.totalRevenue)}
            </span>
            <p className="text-xs text-stone-500 font-bold mt-1">
              En <span className="text-stone-900 font-black">{globalKpis.totalTickets}</span> tickets facturados
            </p>
          </div>
        </div>

        {/* KPI 3: Ticket Promedio por Cliente */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-500">
              Ticket Promedio
            </span>
            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900">
              {formatCurrency(globalKpis.averageTicket)}
            </span>
            <p className="text-xs text-stone-500 font-bold mt-1">
              Por compra identificada
            </p>
          </div>
        </div>

        {/* KPI 4: Clientes Inactivos / En Riesgo */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-stone-200 shadow-sm relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-500">
              Inactivos (+30 días)
            </span>
            <div className="p-2 sm:p-2.5 bg-rose-100 text-rose-800 rounded-2xl group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">
              {globalKpis.inactiveCount}
            </span>
            <p className="text-xs text-stone-500 font-bold mt-1">
              Requieren reactivación oportuna
            </p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE NAVEGACIÓN DE REPORTES (SUB-TABS) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-3xl border-2 border-stone-200 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full sm:w-auto p-1">
          <button
            type="button"
            onClick={() => setActiveSection("ranking")}
            className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === "ranking"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-102"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-950"
            }`}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
            <span>🏆 Top Compradores VIP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("frecuencia")}
            className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === "frecuencia"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-102"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-950"
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>🔄 Frecuencia y Panes Estrella</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("inactivos")}
            className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSection === "inactivos"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-102"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-950"
            }`}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>⚠️ Clientes Inactivos ({globalKpis.inactiveCount})</span>
          </button>
        </div>

        {/* Filtros o Controles Contextuales según la pestaña activa */}
        {activeSection === "ranking" && (
          <div className="inline-flex items-center bg-stone-100 p-1.5 rounded-2xl border border-stone-200 shrink-0 text-xs font-bold">
            <span className="text-stone-500 mr-2 ml-1 hidden sm:inline">Ordenar por:</span>
            <button
              type="button"
              onClick={() => setTopSortCriterion("total")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                topSortCriterion === "total"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              $ Mayor Importe
            </button>
            <button
              type="button"
              onClick={() => setTopSortCriterion("tickets")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                topSortCriterion === "tickets"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              # Más Compras
            </button>
          </div>
        )}

        {activeSection === "inactivos" && (
          <div className="inline-flex items-center bg-stone-100 p-1.5 rounded-2xl border border-stone-200 shrink-0 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setInactiveFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                inactiveFilter === "all"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              Todos ({globalKpis.inactiveCount})
            </button>
            <button
              type="button"
              onClick={() => setInactiveFilter("over30")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                inactiveFilter === "over30"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              +30 días
            </button>
            <button
              type="button"
              onClick={() => setInactiveFilter("15to30")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                inactiveFilter === "15to30"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              15 a 30 días
            </button>
            <button
              type="button"
              onClick={() => setInactiveFilter("never")}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                inactiveFilter === "never"
                  ? "bg-white text-stone-950 shadow-xs border border-stone-300"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              Sin compras previas
            </button>
          </div>
        )}
      </div>

      {/* 3. VISTA: TOP COMPRADORES VIP (PODIO Y TABLA) */}
      {activeSection === "ranking" && (
        <div className="space-y-6">
          {/* PODIO DE HONOR (TOP 3) */}
          {rankedCustomers.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 sm:pt-6">
              {/* Segundo Lugar (Plata) */}
              <div className="order-2 md:order-1 bg-gradient-to-b from-stone-50 to-stone-100 p-5 rounded-3xl border-2 border-stone-300 shadow-sm relative text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-stone-300 text-stone-800 flex items-center justify-center font-black text-xl shadow-md border-2 border-white -mt-9 mb-2">
                  🥈
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 bg-stone-200 px-3 py-0.5 rounded-full mb-2">
                  #2 Lugar Plata
                </span>
                <h4 className="text-lg font-black text-stone-900 leading-snug">
                  {rankedCustomers[1].customer.name}
                </h4>
                <span className="text-xl font-black text-emerald-700 mt-1">
                  {formatCurrency(rankedCustomers[1].totalSpent)}
                </span>
                <p className="text-xs text-stone-600 font-bold mt-1">
                  {rankedCustomers[1].ticketCount} compras • Ticket prom: {formatCurrency(rankedCustomers[1].averageTicket)}
                </p>
                <div className="mt-3 p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-700 w-full truncate">
                  🍞 {rankedCustomers[1].favoriteProduct}
                </div>
                <button
                  type="button"
                  onClick={() => onViewCustomerHistory(rankedCustomers[1].customer)}
                  className="mt-3 text-xs font-black text-amber-800 hover:text-amber-950 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Ver compras detalladas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Primer Lugar (Oro - Destacado) */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-100/50 to-amber-50 p-6 sm:p-7 rounded-3xl border-3 border-amber-500 shadow-xl relative text-center flex flex-col items-center transform md:-translate-y-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-3xl shadow-lg border-3 border-white -mt-12 mb-2 animate-bounce">
                  👑
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-300 px-4 py-1 rounded-full mb-2 shadow-xs">
                  🥇 #1 Mejor Cliente VIP
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-stone-950 leading-snug">
                  {rankedCustomers[0].customer.name}
                </h4>
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
                  {formatCurrency(rankedCustomers[0].totalSpent)}
                </span>
                <p className="text-xs sm:text-sm text-stone-700 font-bold mt-1">
                  {rankedCustomers[0].ticketCount} compras acumuladas • Promedio: {formatCurrency(rankedCustomers[0].averageTicket)}
                </p>
                <div className="mt-3 p-2.5 bg-white/90 rounded-2xl border-2 border-amber-300 text-xs sm:text-sm font-black text-amber-900 w-full truncate shadow-2xs">
                  ⭐ Moda: {rankedCustomers[0].favoriteProduct}
                </div>
                <button
                  type="button"
                  onClick={() => onViewCustomerHistory(rankedCustomers[0].customer)}
                  className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ver Historial y Tickets</span>
                </button>
              </div>

              {/* Tercer Lugar (Bronce) */}
              <div className="order-3 bg-gradient-to-b from-orange-50 to-stone-100 p-5 rounded-3xl border-2 border-orange-200 shadow-sm relative text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white -mt-9 mb-2">
                  🥉
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-orange-200 px-3 py-0.5 rounded-full mb-2">
                  #3 Lugar Bronce
                </span>
                <h4 className="text-lg font-black text-stone-900 leading-snug">
                  {rankedCustomers[2].customer.name}
                </h4>
                <span className="text-xl font-black text-emerald-700 mt-1">
                  {formatCurrency(rankedCustomers[2].totalSpent)}
                </span>
                <p className="text-xs text-stone-600 font-bold mt-1">
                  {rankedCustomers[2].ticketCount} compras • Ticket prom: {formatCurrency(rankedCustomers[2].averageTicket)}
                </p>
                <div className="mt-3 p-2 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-700 w-full truncate">
                  🍞 {rankedCustomers[2].favoriteProduct}
                </div>
                <button
                  type="button"
                  onClick={() => onViewCustomerHistory(rankedCustomers[2].customer)}
                  className="mt-3 text-xs font-black text-amber-800 hover:text-amber-950 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Ver compras detalladas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TABLA DE CLASIFICACIÓN GENERAL */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b-2 border-stone-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-stone-900 text-base sm:text-lg">
                  Tabla de Clasificación Completa de Clientes
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                Mostrando {rankedCustomers.length} clientes ordenados por {topSortCriterion === "total" ? "mayor gasto acumulado" : "cantidad de compras"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b-2 border-stone-200 text-xs sm:text-sm font-black text-stone-700 uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 text-center w-16">Puesto</th>
                    <th className="py-3 px-4 sm:px-5 min-w-[200px]">Cliente</th>
                    <th className="py-3 px-4 sm:px-5 min-w-[170px]">Teléfono / WhatsApp</th>
                    <th className="py-3 px-4 sm:px-5 min-w-[180px]">Pan Habitual (Moda)</th>
                    <th className="py-3 px-4 sm:px-5 text-right min-w-[140px]">Total Gastado</th>
                    <th className="py-3 px-4 sm:px-5 text-center min-w-[110px]">Compras</th>
                    <th className="py-3 px-4 sm:px-5 text-right min-w-[130px]">Ticket Prom.</th>
                    <th className="py-3 px-4 sm:px-5 text-center min-w-[140px]">Última Compra</th>
                    <th className="py-3 px-4 sm:px-5 text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {rankedCustomers.map((ec, idx) => {
                    const c = ec.customer;
                    const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
                    const formatted = formatPhone(c.phone);
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-amber-50/60 transition-colors ${
                          isTop1 ? "bg-amber-50/30" : ""
                        }`}
                      >
                        {/* Puesto */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-base shadow-sm">
                              🥇
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-stone-300 text-stone-800 font-black text-base shadow-sm">
                              🥈
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-700 text-white font-black text-base shadow-sm">
                              🥉
                            </span>
                          ) : (
                            <span className="font-mono text-xs sm:text-sm font-black text-stone-600 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200">
                              #{idx + 1}
                            </span>
                          )}
                        </td>

                        {/* Nombre y Tipo */}
                        <td className="py-3 px-4 sm:px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm bg-amber-100 text-amber-900 border border-amber-300">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-stone-900 text-sm sm:text-base block leading-snug">
                                {c.name}
                              </span>
                              {c.type && c.type !== "general" && (
                                <span className="inline-block mt-0.5 text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                                  {c.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contacto */}
                        <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                          {cleanPhone.length >= 8 ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200">
                                {formatted}
                              </span>
                              <a
                                href={`https://wa.me/52${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs"
                                title="Contactar por WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 italic">Sin teléfono</span>
                          )}
                        </td>

                        {/* Moda / Pan Habitual */}
                        <td className="py-3 px-4 sm:px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-200 truncate max-w-[200px]">
                            <span>🍞</span>
                            <span className="truncate">{ec.favoriteProduct}</span>
                          </span>
                        </td>

                        {/* Total Gastado */}
                        <td className="py-3 px-4 sm:px-5 text-right whitespace-nowrap">
                          <span className="font-black text-emerald-700 text-sm sm:text-base">
                            {formatCurrency(ec.totalSpent)}
                          </span>
                        </td>

                        {/* Compras / Tickets */}
                        <td className="py-3 px-4 sm:px-5 text-center whitespace-nowrap">
                          <span className="font-mono font-black text-xs sm:text-sm text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                            {ec.ticketCount} {ec.ticketCount === 1 ? "ticket" : "tickets"}
                          </span>
                        </td>

                        {/* Ticket Promedio */}
                        <td className="py-3 px-4 sm:px-5 text-right whitespace-nowrap font-bold text-xs sm:text-sm text-stone-700">
                          {formatCurrency(ec.averageTicket)}
                        </td>

                        {/* Última Compra */}
                        <td className="py-3 px-4 sm:px-5 text-center whitespace-nowrap">
                          {ec.daysSinceLastPurchase === null ? (
                            <span className="text-[11px] font-bold text-stone-400 italic">
                              Sin compras
                            </span>
                          ) : ec.daysSinceLastPurchase === 0 ? (
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                              Hoy
                            </span>
                          ) : ec.daysSinceLastPurchase === 1 ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                              Ayer
                            </span>
                          ) : (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                              ec.daysSinceLastPurchase > 30 
                                ? "bg-rose-50 text-rose-700 border border-rose-200 font-black"
                                : "bg-stone-100 text-stone-700 border border-stone-200"
                            }`}>
                              Hace {ec.daysSinceLastPurchase} días
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 sm:px-5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onViewCustomerHistory(c)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Ver tickets e historial de compra"
                          >
                            Ver Historial
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISTA: FRECUENCIA Y PANES ESTRELLA */}
      {activeSection === "frecuencia" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BLOQUE IZQUIERDO: PRODUCTOS ESTRELLA MÁS COMPRADOS POR CLIENTES */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl">
                  <Flame className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base sm:text-lg">
                    Panes Más Vendidos a Clientes
                  </h3>
                  <p className="text-xs text-stone-500 font-bold">
                    Ranking de productos con mayor volumen adquirido
                  </p>
                </div>
              </div>
            </div>

            {globalPopularProducts.items.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-sm font-bold">
                Aún no hay desglose de productos registrado en las ventas de clientes.
              </div>
            ) : (
              <div className="space-y-3">
                {globalPopularProducts.items.map((prod, idx) => {
                  const pct = Math.round((prod.quantity / globalPopularProducts.maxQty) * 100);
                  const isTop = idx === 0;

                  return (
                    <div 
                      key={prod.name}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isTop ? "bg-amber-50/70 border-amber-300 shadow-2xs" : "bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs sm:text-sm font-black text-stone-900 mb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🥖"}</span>
                          <span className="font-black text-stone-900">{prod.name}</span>
                          {isTop && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-md">
                              Estrella #1
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-500 font-bold">
                            {prod.buyerCount} cliente{prod.buyerCount > 1 ? "s" : ""}
                          </span>
                          <span className="font-mono font-black text-xs sm:text-sm bg-white px-2.5 py-0.5 rounded-lg border border-stone-200 text-stone-800">
                            {prod.quantity} pzas
                          </span>
                        </div>
                      </div>
                      {/* Barra de progreso */}
                      <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop ? "bg-gradient-to-r from-amber-500 to-amber-600" : "bg-stone-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BLOQUE DERECHO: SEGMENTACIÓN DE CLIENTES POR HÁBITOS DE FRECUENCIA */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-2xl">
                  <BarChart3 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base sm:text-lg">
                    Segmentación de Frecuencia
                  </h3>
                  <p className="text-xs text-stone-500 font-bold">
                    Clasificación según regularidad de compra y volumen
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Categoría VIP */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-900">👑 Clientes VIP</span>
                  <span className="text-xs font-bold text-amber-800">Alto Valor</span>
                </div>
                <div className="text-2xl font-black text-amber-950">
                  {enrichedCustomers.filter((c) => c.frequencyCategory === "vip").length}
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  Compradores de alto volumen o más de 5 tickets registrados.
                </p>
              </div>

              {/* Categoría Regular */}
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-900">✨ Clientes Regulares</span>
                  <span className="text-xs font-bold text-emerald-800">Recurrentes</span>
                </div>
                <div className="text-2xl font-black text-emerald-950">
                  {enrichedCustomers.filter((c) => c.frequencyCategory === "regular").length}
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  Clientes que compran de forma periódica (2 a 4 compras).
                </p>
              </div>

              {/* Categoría Ocasional */}
              <div className="p-4 rounded-2xl bg-stone-100 border-2 border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-stone-700">🛒 Clientes Ocasionales</span>
                  <span className="text-xs font-bold text-stone-500">1 compra</span>
                </div>
                <div className="text-2xl font-black text-stone-900">
                  {enrichedCustomers.filter((c) => c.frequencyCategory === "ocasional").length}
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  Clientes que han realizado su primera compra en la panadería.
                </p>
              </div>

              {/* Sin Compras */}
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-rose-900">⏳ Sin Compras Aún</span>
                  <span className="text-xs font-bold text-rose-700">Por activar</span>
                </div>
                <div className="text-2xl font-black text-rose-950">
                  {enrichedCustomers.filter((c) => c.frequencyCategory === "sin_compras").length}
                </div>
                <p className="text-xs text-stone-600 font-medium">
                  Registrados en catálogo pero sin tickets asignados en caja.
                </p>
              </div>
            </div>

            {/* Sugerencia de Venta Cruzada */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs sm:text-sm text-stone-800 space-y-1">
              <span className="font-black text-amber-900 flex items-center gap-1.5">
                💡 Consejo Brito para Incrementar Frecuencia:
              </span>
              <p className="font-medium text-stone-700">
                Al seleccionar a los clientes en el <strong>Punto de Venta (POS)</strong>, sus compras acumulan historial automáticamente y podrás ofrecerles promociones exclusivas en su pan habitual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. VISTA: CLIENTES INACTIVOS (REACTIVACIÓN Y RETENCIÓN) */}
      {activeSection === "inactivos" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-md">
                📢
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-stone-900">
                  Reactivación y Retención de Clientes Inactivos
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 font-medium mt-0.5">
                  Contacta por WhatsApp con un solo clic a los clientes que llevan semanas sin visitar la panadería y sorpréndelos con una invitación calientita.
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white rounded-2xl border-2 border-rose-200 text-center shrink-0">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Total Inactivos</span>
              <span className="text-xl font-black text-rose-700">{inactiveCustomers.length} clientes</span>
            </div>
          </div>

          {inactiveCustomers.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-stone-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                🎉
              </div>
              <h4 className="text-lg font-black text-stone-900">
                ¡Excelente! No hay clientes inactivos bajo este filtro
              </h4>
              <p className="text-xs sm:text-sm text-stone-500 font-medium max-w-md mx-auto">
                Tus clientes registrados están acudiendo regularmente o no cumplen el criterio de inactividad seleccionado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveCustomers.map((ec) => {
                const c = ec.customer;
                const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
                const formatted = formatPhone(c.phone);
                const hasValidPhone = cleanPhone.length >= 8;
                const waLink = generateWhatsAppReactivationLink(c.name, c.phone, ec.favoriteProduct);

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-3xl border-2 border-stone-200 hover:border-amber-400 p-5 shadow-sm space-y-4 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 border border-stone-300 flex items-center justify-center font-black text-base shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-stone-900 text-base leading-snug">
                              {c.name}
                            </h4>
                            <span className="text-xs font-bold text-stone-500 font-mono">
                              {hasValidPhone ? formatted : "Sin teléfono"}
                            </span>
                          </div>
                        </div>

                        {/* Badge de Inactividad */}
                        <div className="shrink-0 text-right">
                          {ec.daysSinceLastPurchase === null ? (
                            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-stone-100 text-stone-600 rounded-xl border border-stone-200 block">
                              Sin compras
                            </span>
                          ) : (
                            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-rose-100 text-rose-800 rounded-xl border border-rose-200 block">
                              {ec.daysSinceLastPurchase} días ausente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detalles: Moda y Total */}
                      <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="font-medium">Total que solía comprar:</span>
                          <span className="font-black text-stone-900">
                            {formatCurrency(ec.totalSpent)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="font-medium">Pan preferido habitual:</span>
                          <span className="font-black text-amber-900 truncate max-w-[150px]">
                            🍞 {ec.favoriteProduct}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Reactivación */}
                    <div className="pt-2 space-y-2">
                      {hasValidPhone && waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-2.5 px-4 rounded-2xl shadow-sm text-xs sm:text-sm transition-all cursor-pointer"
                          title="Enviar mensaje personalizado de invitación por WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" />
                          <span>Reactivar por WhatsApp</span>
                        </a>
                      ) : (
                        <div className="w-full text-center py-2 px-3 bg-stone-100 text-stone-400 font-bold rounded-2xl text-xs border border-dashed border-stone-200">
                          No cuenta con número de WhatsApp registrado
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewCustomerHistory(c)}
                          className="flex-1 py-2 px-3 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                        >
                          Ver Historial
                        </button>
                        {onSelectCustomerInDirectory && (
                          <button
                            type="button"
                            onClick={() => onSelectCustomerInDirectory(c.name)}
                            className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center"
                            title="Ver en Directorio"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
