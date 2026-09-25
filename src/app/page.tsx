"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  Wallet, 
  Users, 
  ShieldCheck, 
  Store, 
  Clock, 
  Receipt, 
  Flame, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles, 
  RefreshCw, 
  Croissant, 
  CalendarClock, 
  Phone, 
  Award, 
  CreditCard, 
  Banknote, 
  Eye,
  Plus
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth, getFriendlyName } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useBranch } from "@/context/BranchContext";
import { getStoredOrders } from "@/lib/orders";
import { CustomOrder } from "@/types";

// Catálogo enriquecido de productos estrella de Panadería Brito con clasificación por categoría
interface TopProductItem {
  id: string;
  name: string;
  category: "pan_salado" | "pan_dulce" | "hojaldre" | "pasteleria";
  categoryLabel: string;
  icon: string;
  price: number;
  piecesSold: number;
  revenue: number;
  share: number;
  trend: string;
  tag: string;
}

const ALL_TOP_BAKERY_PRODUCTS: TopProductItem[] = [
  { id: "1", name: "Concha de Vainilla Artesanal", category: "pan_dulce", categoryLabel: "Pan Dulce", icon: "🥖", price: 14, piecesSold: 342, revenue: 4788, share: 24, trend: "+15%", tag: "Más Vendido" },
  { id: "2", name: "Bolillo Tradicional de Horno", category: "pan_salado", categoryLabel: "Pan Salado", icon: "🥖", price: 6, piecesSold: 580, revenue: 3480, share: 18, trend: "+22%", tag: "Alta Rotación" },
  { id: "3", name: "Cuerno de Mantequilla Francés", category: "hojaldre", categoryLabel: "Hojaldre", icon: "🥐", price: 18, piecesSold: 165, revenue: 2970, share: 15, trend: "+8%", tag: "Favorito" },
  { id: "4", name: "Telera Dorada de Piso", category: "pan_salado", categoryLabel: "Pan Salado", icon: "🥖", price: 7, piecesSold: 410, revenue: 2870, share: 14, trend: "+12%", tag: "Mayoreo Loncherías" },
  { id: "5", name: "Dona Glaseada de Azúcar", category: "pan_dulce", categoryLabel: "Pan Dulce", icon: "🍩", price: 15, piecesSold: 180, revenue: 2700, share: 14, trend: "+6%", tag: "Popular" },
  { id: "6", name: "Rebanada Pastel Tres Leches", category: "pasteleria", categoryLabel: "Pastelería", icon: "🍰", price: 48, piecesSold: 46, revenue: 2208, share: 11, trend: "+18%", tag: "Gourmet" },
  { id: "7", name: "Oreja Caramelizada de Hojaldre", category: "hojaldre", categoryLabel: "Hojaldre", icon: "🥐", price: 16, piecesSold: 135, revenue: 2160, share: 10, trend: "+10%", tag: "Crujiente" },
  { id: "8", name: "Pay de Queso con Zarzamora", category: "pasteleria", categoryLabel: "Pastelería", icon: "🥧", price: 45, piecesSold: 38, revenue: 1710, share: 8, trend: "+14%", tag: "Especialidad" },
];

export default function Home() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    switchBranch, 
    consolidatedMetrics
  } = useBranch();

  // Orders state (Pedidos de mostrador levantados por cajeros)
  const [orders, setOrders] = useState<CustomOrder[]>([]);

  useEffect(() => {
    setOrders(getStoredOrders());
    const handleStorageChange = () => {
      setOrders(getStoredOrders());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filters state
  const [selectedPeriod, setSelectedPeriod] = useState<"hoy" | "semana" | "mes">("hoy");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("todas");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"todos" | "pendiente" | "listo">("todos");
  const [greeting, setGreeting] = useState("¡Bienvenido");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Dynamic greeting & clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting("¡Buenos días");
      } else if (hour >= 12 && hour < 19) {
        setGreeting("¡Buenas tardes");
      } else {
        setGreeting("¡Buenas noches");
      }
      setCurrentTimeStr(now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Multiplicador por período seleccionado
  const periodMultiplier = selectedPeriod === "hoy" ? 1 : selectedPeriod === "semana" ? 6.2 : 24.5;

  const baseSales = isAllBranches 
    ? consolidatedMetrics.totalSales 
    : currentBranch?.todaySales || 5480;

  const baseTickets = isAllBranches
    ? consolidatedMetrics.totalTickets 
    : currentBranch?.todayTickets || 46;

  const activeSales = Math.round(baseSales * periodMultiplier);
  const activeTickets = Math.round(baseTickets * periodMultiplier);
  
  const activeCash = isAllBranches 
    ? consolidatedMetrics.totalCashInDrawer 
    : currentBranch?.cashInDrawer || 5120;

  const activeGoal = Math.round(
    (isAllBranches ? consolidatedMetrics.totalDailyGoal : currentBranch?.dailyGoal || 10000) * periodMultiplier
  );

  const percentGoal = Math.min(100, Math.round((activeSales / Math.max(1, activeGoal)) * 100));
  const avgTicket = Math.round(activeSales / Math.max(1, activeTickets));
  const estimatedPieces = Math.round(activeTickets * 8.6);

  // Filtered orders for active branch
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (!isAllBranches && currentBranch) {
      result = result.filter((o) => !o.branchId || o.branchId === currentBranch.id);
    }
    if (orderStatusFilter !== "todos") {
      result = result.filter((o) => o.status === orderStatusFilter);
    }
    return result;
  }, [orders, isAllBranches, currentBranch, orderStatusFilter]);

  const allBranchOrders = useMemo(() => {
    if (isAllBranches) return orders;
    return orders.filter((o) => !o.branchId || o.branchId === currentBranch?.id);
  }, [orders, isAllBranches, currentBranch]);

  const pendingOrdersCount = allBranchOrders.filter((o) => o.status === "pendiente").length;
  const inOvenOrdersCount = allBranchOrders.filter((o) => o.status === "en_horno").length;
  const readyOrdersCount = allBranchOrders.filter((o) => o.status === "listo").length;
  const totalPendingCollection = allBranchOrders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0);

  // Method breakdowns
  const cashShare = isAllBranches ? 0.70 : (currentBranch ? currentBranch.currentShift.cashSales / Math.max(1, currentBranch.currentShift.totalSales) : 0.70);
  const cardShare = isAllBranches ? 0.20 : (currentBranch ? currentBranch.currentShift.cardSales / Math.max(1, currentBranch.currentShift.totalSales) : 0.20);
  const transferShare = Math.max(0, 1 - cashShare - cardShare);

  const cashAmount = Math.round(activeSales * cashShare);
  const cardAmount = Math.round(activeSales * cardShare);
  const transferAmount = Math.round(activeSales * transferShare);

  // Ranked branches by today sales
  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => b.todaySales - a.todaySales);
  }, [branches]);

  // Filtrado de productos estrella por categoría
  const displayedTopProducts = useMemo(() => {
    if (productCategoryFilter === "todas") return ALL_TOP_BAKERY_PRODUCTS;
    return ALL_TOP_BAKERY_PRODUCTS.filter((p) => p.category === productCategoryFilter);
  }, [productCategoryFilter]);

  return (
    <div className="w-full max-w-full space-y-6 sm:space-y-7 overflow-x-hidden pb-10">
      {/* ========================================================= */}
      {/* 1. TOP EXECUTIVE HERO BANNER                             */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b0c12] via-[#141624] to-[#090a0f] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/[0.08]">
        {/* Glowing atmospheric spots */}
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Welcome & Context */}
          <div className="space-y-3.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-200" />
                Panel Ejecutivo
              </span>
              <span className="text-xs text-stone-300 font-semibold flex items-center gap-1.5 bg-white/[0.07] px-3 py-1 rounded-full border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isAllBranches ? "Consolidado General (3 Sucursales)" : currentBranch?.name}
              </span>
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                Operación en Vivo • {currentTimeStr || "Hora Local"}
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  {greeting} {getFriendlyName(user?.name)}!
                </h1>
                <span
                  className="font-brito-script text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 select-none inline-block -rotate-2"
                  style={{
                    fontFamily: "var(--font-satisfy), 'Satisfy', var(--font-dancing), 'Dancing Script', cursive",
                  }}
                >
                  Brito
                </span>
              </div>
              <p className="text-stone-300 text-xs sm:text-sm mt-1 leading-relaxed">
                Tradición artesanal y gestión inteligente. Monitorea en tiempo real el <strong className="text-orange-400">rendimiento de tus sucursales, ventas de mostrador y flujo financiero</strong> con total claridad y precisión.
              </p>
            </div>

            {/* Branch Selector Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">Sucursal:</span>
              <button
                onClick={() => switchBranch("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  isAllBranches
                    ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-stone-300 border border-white/10"
                }`}
              >
                <span>🏢 Todas (Consolidado)</span>
              </button>
              {branches.map((b) => {
                const active = !isAllBranches && currentBranch?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => switchBranch(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/30 font-black scale-105"
                        : "bg-white/[0.06] hover:bg-white/[0.12] text-stone-300 border border-white/10"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5 opacity-70" />
                    <span>{b.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. KPI COMMAND CENTER (Métricas en Tiempo Real)          */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wider">
                Métricas de Rendimiento & Flujo Financiero
              </h2>
              <p className="text-[11px] text-stone-500">
                {isAllBranches ? "Consolidando las 3 sucursales de Brito" : `Filtrando sucursal ${currentBranch?.name}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto max-w-full">
            <button
              onClick={() => setSelectedPeriod("hoy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedPeriod === "hoy"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Hoy en Vivo
            </button>
            <button
              onClick={() => setSelectedPeriod("semana")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedPeriod === "semana"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setSelectedPeriod("mes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedPeriod === "mes"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Este Mes
            </button>
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Ventas Totales */}
          <div className="bg-stone-50/70 hover:bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 hover:border-orange-400 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Ventas Totales</span>
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {formatCurrency(activeSales)}
              </p>
              <div className="flex items-center justify-between text-xs text-stone-500 mt-1 font-semibold">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {activeTickets} tickets
                </span>
                <span className="text-stone-700 font-bold">{percentGoal}% de meta</span>
              </div>

              {/* Goal Progress bar */}
              <div className="w-full bg-stone-200/70 rounded-full h-2 mt-2 overflow-hidden border border-stone-200/60">
                <div
                  className="bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentGoal}%` }}
                />
              </div>

              {/* Payment method pills */}
              <div className="flex items-center justify-between text-[10px] text-stone-600 pt-2 font-semibold">
                <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800" title={`Efectivo: ${formatCurrency(cashAmount)}`}>
                  💵 {Math.round(cashShare * 100)}% Efec.
                </span>
                <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-blue-800" title={`Tarjeta: ${formatCurrency(cardAmount)}`}>
                  💳 {Math.round(cardShare * 100)}% Tarj.
                </span>
                <span className="bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-purple-800" title={`Transferencia: ${formatCurrency(transferAmount)}`}>
                  📱 {Math.round(transferShare * 100)}% Transf.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Efectivo Neto en Gaveta */}
          <div className="bg-stone-50/70 hover:bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 hover:border-orange-400 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Efectivo en Gaveta</span>
              <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {formatCurrency(activeCash)}
              </p>
              <p className="text-xs text-stone-600 mt-1 font-semibold">
                {isAllBranches ? "3 gavetas de mostrador activas" : `${currentBranch?.currentShift.name.split("(")[0]}`}
              </p>
              <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>{isAllBranches ? "Total disponible" : `Cajero: ${currentBranch?.currentShift.cashier}`}</span>
                <Link href="/caja" className="text-orange-600 font-black hover:underline flex items-center gap-0.5">
                  Arqueo <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Ticket Promedio */}
          <div className="bg-stone-50/70 hover:bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 hover:border-orange-400 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Ticket Promedio</span>
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {formatCurrency(avgTicket)}
              </p>
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +8.4% vs semana previa
              </p>
              <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>Canasta estimada</span>
                <span className="font-extrabold text-stone-800">~8.5 pzas / ticket</span>
              </div>
            </div>
          </div>

          {/* Card 4: Piezas Horneadas & Vendidas */}
          <div className="bg-stone-50/70 hover:bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 hover:border-orange-400 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Piezas de Pan Salidas</span>
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {estimatedPieces.toLocaleString("es-MX")} pzas
              </p>
              <p className="text-xs text-stone-600 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                4 tandas de horneado hoy
              </p>
              <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>Hornos Leña & Gas</span>
                <Link href="/inventario" className="text-rose-600 font-black hover:underline flex items-center gap-0.5">
                  Almacén <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* ========================================================= */}
      {/* 4. SUCURSALES MATRIX (Desempeño Comparativo)             */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                Matriz de Desempeño por Sucursal
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                3 Tiendas Activas
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Comparativa de ventas en tiempo real, cumplimiento de metas, ticket promedio, arqueo y métodos de cobro.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sucursales"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Panel de Sucursales
            </Link>
          </div>
        </div>

        {/* 3 Branch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sortedBranches.map((b, idx) => {
            // Cálculos precisos y sin truncar
            const isGoalAchieved = b.todaySales >= b.dailyGoal;
            const realPct = Math.round((b.todaySales / Math.max(1, b.dailyGoal)) * 100);
            const barPct = Math.min(100, realPct);
            const diffGoal = Math.abs(b.todaySales - b.dailyGoal);
            const isSelected = !isAllBranches && currentBranch?.id === b.id;
            const isTopRank = idx === 0;

            // Ticket promedio exacto
            const avgTicket = b.todayTickets > 0 ? b.todaySales / b.todayTickets : 0;

            // Producto más vendido de la sucursal
            const topProd = b.topProduct || (
              b.id?.includes("matriz") || b.code?.includes("MAT")
                ? { name: "Bolillo Tradicional", piecesSold: 185, category: "Pan Salado", icon: "🥖" }
                : b.id?.includes("benito") || b.code?.includes("BEN")
                ? { name: "Bolillo de Sal", piecesSold: 210, category: "Pan Salado", icon: "🥖" }
                : b.id?.includes("flores") || b.code?.includes("FLO")
                ? { name: "Cuerno de Mantequilla", piecesSold: 94, category: "Hojaldre", icon: "🥐" }
                : { name: "Concha de Vainilla", piecesSold: 120, category: "Pan Dulce", icon: "🥖" }
            );

            // Desglose exacto de cobros
            const cashSales = b.currentShift?.cashSales || 0;
            const cardSales = b.currentShift?.cardSales || 0;
            const transferSales = b.currentShift?.transferSales || 0;
            const totalShiftSales = Math.max(1, cashSales + cardSales + transferSales);

            const cashPct = Math.round((cashSales / totalShiftSales) * 100);
            const cardPct = Math.round((cardSales / totalShiftSales) * 100);
            const transferPct = Math.max(0, 100 - cashPct - cardPct);

            return (
              <div 
                key={b.id} 
                className={`p-5 rounded-3xl transition-all border flex flex-col justify-between space-y-4 relative ${
                  isSelected 
                    ? "bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 border-orange-400 shadow-xl ring-2 ring-orange-400/40" 
                    : "bg-white hover:bg-stone-50/50 border-stone-200/90 hover:border-orange-300 hover:shadow-lg"
                }`}
              >
                <div className="space-y-4">
                  {/* Cabecera: Rango, Sucursal, Estatus y Filtro */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                        isTopRank 
                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200/50" 
                          : idx === 1
                          ? "bg-stone-200 text-stone-700 font-bold"
                          : "bg-stone-100 text-stone-600 font-bold"
                      }`}>
                        {isTopRank ? <Award className="w-5 h-5 text-white" /> : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                            {b.code}
                          </span>
                          <p className="font-black text-sm text-stone-900 leading-tight">
                            {b.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                          <span className="truncate max-w-[155px]" title={b.address}>{b.address.split(",")[0]}</span>
                          <span className="text-stone-300">•</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Abierta
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => switchBranch(b.id)}
                      title={isSelected ? "Sucursal activa actualmente" : "Hacer clic para filtrar el dashboard con esta sucursal"}
                      className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all shrink-0 active:scale-95 ${
                        isSelected
                          ? "bg-orange-600 text-white shadow-sm ring-2 ring-orange-200"
                          : "bg-stone-100 hover:bg-orange-50 text-stone-600 hover:text-orange-700 border border-stone-200"
                      }`}
                    >
                      {isSelected ? "Activa ✓" : "Filtrar"}
                    </button>
                  </div>

                  {/* Venta Acumulada y Meta Exacta */}
                  <div className="bg-stone-50/80 rounded-2xl p-3.5 border border-stone-100 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 block">Venta de hoy</span>
                        <span className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(b.todaySales)}</span>
                      </div>
                      <div className="text-right">
                        {isGoalAchieved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {realPct}% (+{formatCurrency(diffGoal)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                            {realPct}% (Faltan {formatCurrency(diffGoal)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="space-y-1">
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isGoalAchieved
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                              : "bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500"
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                        <span>{b.todayTickets} tickets cobrados</span>
                        <span>Meta: <strong className="text-stone-700">{formatCurrency(b.dailyGoal)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas Precisas: Ticket Promedio & Gaveta de Efectivo */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50/60 rounded-xl p-2.5 border border-stone-200/70">
                      <span className="text-[10px] font-semibold text-stone-400 block">Ticket Promedio</span>
                      <span className="font-black text-stone-900 text-sm">{formatCurrency(avgTicket)}</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Por transacción</span>
                    </div>

                    <div className="bg-stone-50/60 rounded-xl p-2.5 border border-stone-200/70">
                      <span className="text-[10px] font-semibold text-stone-400 block">Efectivo en Gaveta</span>
                      <span className="font-black text-emerald-700 text-sm">{formatCurrency(b.cashInDrawer)}</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Fondo ini: {formatCurrency(b.currentShift?.initialFund || 1000)}</span>
                    </div>
                  </div>

                  {/* Desglose Exacto y Proporcional de Cobros */}
                  <div className="bg-stone-50/60 rounded-xl p-2.5 border border-stone-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-stone-400" />
                        Desglose de Formas de Pago
                      </span>
                      <span className="text-[10px] font-normal text-stone-400">{formatCurrency(totalShiftSales)}</span>
                    </div>

                    {/* Barra proporcional de 3 métodos */}
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-stone-200 shadow-inner">
                      <div 
                        style={{ width: `${cashPct}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        title={`Efectivo: ${formatCurrency(cashSales)} (${cashPct}%)`} 
                      />
                      <div 
                        style={{ width: `${cardPct}%` }} 
                        className="bg-blue-500 h-full transition-all duration-500" 
                        title={`Tarjeta: ${formatCurrency(cardSales)} (${cardPct}%)`} 
                      />
                      <div 
                        style={{ width: `${transferPct}%` }} 
                        className="bg-purple-500 h-full transition-all duration-500" 
                        title={`Transferencia: ${formatCurrency(transferSales)} (${transferPct}%)`} 
                      />
                    </div>

                    {/* Valores exactos */}
                    <div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]">
                      <div className="flex flex-col">
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Efectivo
                        </span>
                        <span className="font-extrabold text-stone-800">{formatCurrency(cashSales)}</span>
                        <span className="text-[9px] text-stone-400 font-semibold">{cashPct}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-blue-700 font-bold flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Tarjeta
                        </span>
                        <span className="font-extrabold text-stone-800">{formatCurrency(cardSales)}</span>
                        <span className="text-[9px] text-stone-400 font-semibold">{cardPct}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-700 font-bold flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Transf.
                        </span>
                        <span className="font-extrabold text-stone-800">{formatCurrency(transferSales)}</span>
                        <span className="text-[9px] text-stone-400 font-semibold">{transferPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Más Vendido & Operación del Turno */}
                  <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
                    {/* Producto Más Vendido */}
                    <div className="flex items-center justify-between text-stone-600 bg-amber-50/60 rounded-xl px-2.5 py-1.5 border border-amber-200/60">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-900">
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Más vendido:</span>
                      </span>
                      <span className="font-bold text-stone-900 flex items-center gap-1.5 text-right truncate">
                        <span className="text-xs">{topProd.icon || "🥖"}</span>
                        <span className="truncate max-w-[130px] text-[11px]">{topProd.name}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
                          {topProd.piecesSold} pz
                        </span>
                      </span>
                    </div>

                    {/* Turno y Cajero */}
                    <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                      <span className="flex items-center gap-1 truncate" title={`Turno: ${b.currentShift.name}`}>
                        <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>{b.currentShift.name.split("(")[0]} ({b.currentShift.openedAt})</span>
                      </span>
                      <span className="font-semibold text-stone-700 truncate max-w-[120px]" title={`Cajero: ${b.currentShift.cashier}`}>
                        {b.currentShift.cashier}
                      </span>
                    </div>

                    {/* Responsable y Teléfono */}
                    <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
                      <span className="truncate max-w-[140px]" title={`Responsable: ${b.manager}`}>
                        Resp: <strong className="text-stone-600 font-medium">{b.manager}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-stone-500 font-medium">
                        <Phone className="w-3 h-3 text-stone-400" />
                        {b.phone}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* ========================================================= */}
      {/* 6. TOP BAKERY PRODUCTS WITH CATEGORY FILTERS             */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Croissant className="w-5 h-5 text-orange-600" />
              Los Panes Más Vendidos en Mostrador
            </h2>
            <p className="text-xs text-stone-500">
              Ranking de salida de piezas en mostrador y aporte a ingresos del día.
            </p>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setProductCategoryFilter("todas")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                productCategoryFilter === "todas" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setProductCategoryFilter("pan_salado")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                productCategoryFilter === "pan_salado" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Bolillo/Salado
            </button>
            <button
              onClick={() => setProductCategoryFilter("pan_dulce")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                productCategoryFilter === "pan_dulce" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Pan Dulce
            </button>
            <button
              onClick={() => setProductCategoryFilter("hojaldre")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                productCategoryFilter === "hojaldre" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Hojaldre
            </button>
            <button
              onClick={() => setProductCategoryFilter("pasteleria")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                productCategoryFilter === "pasteleria" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Pastelería
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedTopProducts.map((prod, idx) => (
            <div 
              key={prod.id} 
              className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-orange-300 hover:bg-orange-50/20 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-7 h-7 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-base">{prod.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {prod.trend} hoy
                  </span>
                </div>

                <div>
                  <p className="font-black text-sm text-stone-900 leading-snug group-hover:text-orange-600 transition-colors">
                    {prod.name}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {prod.piecesSold} piezas vendidas • {formatCurrency(prod.price)} c/u
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">{prod.categoryLabel}</span>
                  <span className="font-black text-stone-900">{formatCurrency(prod.revenue)}</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${prod.share * 3.6}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. PEDIDOS Y ENCARGOS DE MOSTRADOR                      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shadow-xs">
                <CalendarClock className="w-5 h-5 text-orange-600" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                    Pedidos & Encargos de Mostrador
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-700 border border-orange-500/20 text-[11px] font-black">
                    {filteredOrders.length} {filteredOrders.length === 1 ? "Pedido" : "Pedidos"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-500">
              Encargos especiales y pasteles levantados por cajeras en mostrador con anticipo del 50%.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/pedidos"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              <span>Ver Módulo de Pedidos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Resumen Rápido de Estatus de Pedidos con Filtro Interactivo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setOrderStatusFilter(orderStatusFilter === "pendiente" ? "todos" : "pendiente")}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              orderStatusFilter === "pendiente" ? "bg-amber-100/80 border-amber-400 ring-2 ring-amber-400/30" : "bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/50"
            }`}
          >
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Por Preparar</p>
              <p className="text-lg font-black text-amber-950 mt-0.5">{pendingOrdersCount}</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              🕒
            </span>
          </button>

          <button
            onClick={() => setOrderStatusFilter(orderStatusFilter === "listo" ? "todos" : "listo")}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
              orderStatusFilter === "listo" ? "bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-400/30" : "bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/50"
            }`}
          >
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Listos p/ Entrega</p>
              <p className="text-lg font-black text-emerald-950 mt-0.5">{readyOrdersCount}</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ✅
            </span>
          </button>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Por Cobrar en Caja</p>
              <p className="text-lg font-black text-rose-950 mt-0.5">{formatCurrency(totalPendingCollection)}</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              💰
            </span>
          </div>
        </div>

        {/* Tarjetas de Pedidos Levantados por Cajeros */}
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <CalendarClock className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-bold text-sm text-stone-700">No hay pedidos con el filtro seleccionado</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Cuando las cajeras capturen pedidos especiales de pasteles o pan en el mostrador, aparecerán aquí de inmediato.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.slice(0, 6).map((order) => {
              const isReady = order.status === "listo";
              const isDelivered = order.status === "entregado";
              const isInOven = order.status === "en_horno";

              return (
                <div
                  key={order.id}
                  className="p-4 sm:p-5 rounded-2xl border border-stone-200/90 bg-stone-50/60 hover:bg-white hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group"
                >
                  {/* Top info: Folio, Status & Cajero */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-xs">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] font-bold text-stone-400">
                          {order.branchName?.replace("Sucursal ", "")}
                        </span>
                      </div>

                      {/* Estatus Pill */}
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        isReady
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isInOven
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : isDelivered
                          ? "bg-stone-100 text-stone-600 border-stone-200"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {isReady ? "✅ Listo" : isInOven ? "🔥 En Horno" : isDelivered ? "Entregado" : "🕒 Pendiente"}
                      </span>
                    </div>

                    {/* Cajero Responsable */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 bg-white/80 px-2.5 py-1 rounded-lg border border-stone-200/70">
                      <span className="text-xs">👨‍🍳</span>
                      <span>Cajero:</span>
                      <strong className="text-stone-900 font-extrabold">{order.cashier || "Cajero de turno"}</strong>
                    </div>

                    {/* Cliente & Teléfono */}
                    <div>
                      <p className="font-black text-sm text-stone-900 leading-tight">
                        {order.customerName}
                      </p>
                      {order.phone && (
                        <p className="text-[11px] font-medium text-stone-500 mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" /> {order.phone}
                        </p>
                      )}
                    </div>

                    {/* Descripción del encargo */}
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed bg-white p-2.5 rounded-xl border border-stone-200/60">
                      {order.description}
                    </p>
                  </div>

                  {/* Bottom: Fechas y Finanzas */}
                  <div className="space-y-3 pt-2 border-t border-stone-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-stone-400">Entrega:</span>
                      <span className="font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                        📅 {order.deliveryDate} {order.deliveryTime && `• ${order.deliveryTime} hrs`}
                      </span>
                    </div>

                    {/* Desglose de dinero */}
                    <div className="grid grid-cols-3 gap-1 bg-white p-2 rounded-xl border border-stone-200/80 text-center text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-stone-400 uppercase">Total</p>
                        <p className="font-black text-stone-900">{formatCurrency(order.total)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase">Anticipo (50%)</p>
                        <p className="font-black text-emerald-700">{formatCurrency(order.deposit)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-rose-500 uppercase">Resta Cobrar</p>
                        <p className={`font-black ${order.remainingBalance > 0 ? "text-rose-600 font-extrabold" : "text-stone-400"}`}>
                          {order.remainingBalance > 0 ? formatCurrency(order.remainingBalance) : "$0 (Pagado)"}
                        </p>
                      </div>
                    </div>

                    {/* Botón rápido para ver pedido */}
                    <Link
                      href="/pedidos"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-700 text-stone-700 font-bold text-xs transition-colors border border-stone-200"
                    >
                      <span>Ver Detalles / Cobrar Restante</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 8. DIRECT ERP CORE LINKS                                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Clientes Card */}
        <Link 
          href="/clientes" 
          className="group bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Clientes & Mayoristas</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Público general, tienditas de la esquina que compran bolillo al mayoreo, saldo y créditos.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform">
            Ver Directorio <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Caja Card */}
        <Link 
          href="/caja" 
          className="group bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Caja & Flujo de Dinero</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Control de turnos, gastos menores (gas, bolsas kraft), retiros de Don Toño y arqueo de caja.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-emerald-600 group-hover:translate-x-1 transition-transform">
            Administrar Caja <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
