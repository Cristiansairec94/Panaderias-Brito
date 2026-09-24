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
  Zap, 
  Store, 
  Clock, 
  ShoppingBag, 
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
import { useBranch, SimulatedSale } from "@/context/BranchContext";
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
    consolidatedMetrics,
    simulateSale,
    recentSimulatedSales,
    cashMovements
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
  const [saleAnimSuccess, setSaleAnimSuccess] = useState(false);

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

  // Margen bruto estimado de panadería (~44% sobre ventas)
  const estimatedGrossProfit = Math.round(activeSales * 0.442);

  // Gastos registrados hoy desde el flujo de caja
  const todayCashExpenses = useMemo(() => {
    return cashMovements
      .filter((m) => m.type === "salida")
      .reduce((sum, m) => sum + m.amount, 0);
  }, [cashMovements]);

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

  // Trigger quick simulated sale with animation
  const handleTriggerSale = () => {
    simulateSale();
    setSaleAnimSuccess(true);
    setTimeout(() => setSaleAnimSuccess(false), 2000);
  };

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
          <div className="space-y-3.5 max-w-2xl">
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
                Control central de <strong className="text-orange-400">ventas, hornadas, gavetas de efectivo y pedidos especiales</strong> en tiempo real. Supervisa el flujo integral del negocio.
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

          {/* Quick Real-Time Operations Action Bar */}
          <div className="relative z-10 flex flex-col gap-2.5 self-start lg:self-center w-full lg:w-auto lg:min-w-[310px]">
            {/* Live Operational Status Badge */}
            <div className="flex items-center justify-between gap-3 bg-white/[0.06] border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-black text-emerald-300 tracking-wide">
                  Mostrador & Cajas Activas
                </span>
              </div>
              <span className="text-[10px] font-bold text-stone-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                {isAllBranches ? "3 Tiendas" : currentBranch?.shortName}
              </span>
            </div>

            {/* Quick Navigation & POS Shortcuts */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <Link
                href="/pos"
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 hover:brightness-110 text-white font-extrabold px-3 py-2.5 rounded-xl transition-all text-xs shadow-md shadow-orange-500/20 active:scale-95 text-center"
                title="Abrir Punto de Venta en Mostrador"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Abrir POS</span>
              </Link>
              <Link
                href="/pedidos"
                className="flex items-center justify-center gap-1.5 bg-white/[0.09] hover:bg-white/[0.16] text-amber-300 font-extrabold px-3 py-2.5 rounded-xl border border-white/15 transition-all text-xs active:scale-95 text-center"
                title="Encargos y pedidos especiales de pasteles"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>+ Pedido</span>
              </Link>
              <Link
                href="/caja"
                className="flex items-center justify-center gap-1.5 bg-white/[0.09] hover:bg-white/[0.16] text-white font-extrabold px-3 py-2.5 rounded-xl border border-white/15 transition-all text-xs active:scale-95 text-center"
                title="Corte y Arqueo de Caja"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Corte</span>
              </Link>
            </div>

            {/* Quick Flow Actions (+Abono, -Gasto, +Venta Rápida Demo) */}
            <div className="flex items-center gap-2 w-full">
              <Link
                href="/ingresos"
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 font-bold px-2.5 py-2 rounded-xl border border-emerald-500/30 transition-all text-xs active:scale-95"
                title="Registrar abonos y cobros"
              >
                <span>+ Abono</span>
              </Link>
              <Link
                href="/gastos"
                className="flex-1 flex items-center justify-center gap-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 font-bold px-2.5 py-2 rounded-xl border border-rose-500/30 transition-all text-xs active:scale-95"
                title="Registrar gastos menores de caja"
              >
                <span>- Gasto</span>
              </Link>
              <button
                onClick={handleTriggerSale}
                className={`flex-1 flex items-center justify-center gap-1 font-bold px-2.5 py-2 rounded-xl border transition-all text-xs active:scale-95 ${
                  saleAnimSuccess
                    ? "bg-amber-400 text-stone-950 border-amber-300 scale-95"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-amber-200 border-amber-500/30"
                }`}
                title="Simular una venta rápida en vivo para verificar actualización en tiempo real"
              >
                <Zap className={`w-3.5 h-3.5 ${saleAnimSuccess ? "animate-bounce text-stone-900" : "text-amber-400"}`} />
                <span>{saleAnimSuccess ? "¡Cobrado!" : "+Venta"}</span>
              </button>
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

        {/* Secondary Operational Strip: Margen Bruto, Cobros Pendientes, Gastos Menores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Margen Bruto Est.</p>
              <p className="text-base sm:text-lg font-black text-amber-950 mt-0.5">{formatCurrency(estimatedGrossProfit)}</p>
              <p className="text-[10px] text-amber-700 font-medium">~44.2% del volumen</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              📈
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Cobros Pendientes</p>
              <p className="text-base sm:text-lg font-black text-emerald-950 mt-0.5">{formatCurrency(totalPendingCollection)}</p>
              <p className="text-[10px] text-emerald-700 font-medium">{pendingOrdersCount + readyOrdersCount} encargos activos</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              🎂
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Gastos de Caja Hoy</p>
              <p className="text-base sm:text-lg font-black text-rose-950 mt-0.5">{formatCurrency(todayCashExpenses)}</p>
              <p className="text-[10px] text-rose-700 font-medium">Gas, bolsas, insumos</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              📉
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Clientes Atendidos</p>
              <p className="text-base sm:text-lg font-black text-blue-950 mt-0.5">~{activeTickets} personas</p>
              <p className="text-[10px] text-blue-700 font-medium">Mostrador general</p>
            </div>
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              👥
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. LIVE TICKETS FEED (Ventas en Mostrador en Vivo)       */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div>
              <h2 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-600" />
                Flujo de Ventas en Vivo (Últimos Tickets Emitidos)
              </h2>
              <p className="text-xs text-stone-500">
                Monitoreo en tiempo real de transacciones registradas en mostrador por las cajeras.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSale}
              className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              Simular Ticket
            </button>
            <Link
              href="/pos"
              className="text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              Ir a POS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {recentSimulatedSales.length === 0 ? (
          <div className="p-6 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <Receipt className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">Aún no hay tickets registrados en esta sesión de mostrador</p>
            <p className="text-[11px] text-stone-400">
              Presiona el botón <strong className="text-orange-600">Simular Ticket</strong> o cobra en el <strong className="text-orange-600">POS</strong> para ver transacciones en vivo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentSimulatedSales.slice(0, 4).map((sale) => {
              const isCash = sale.paymentMethod === "efectivo";
              const isCard = sale.paymentMethod === "tarjeta";

              return (
                <div
                  key={sale.id}
                  className="p-3.5 rounded-2xl bg-stone-50/70 hover:bg-white border border-stone-200/80 hover:border-orange-300 transition-all flex flex-col justify-between space-y-2 shadow-xs group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-800">
                        {sale.branchName}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {sale.timestamp}
                      </span>
                    </div>

                    <p className="font-extrabold text-xs text-stone-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {sale.itemsSummary}
                    </p>

                    <p className="text-[10px] text-stone-500">
                      Cajera: <strong className="text-stone-700">{sale.cashier}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isCash 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isCard 
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-purple-50 text-purple-800 border-purple-200"
                    }`}>
                      {isCash ? "💵 Efectivo" : isCard ? "💳 Tarjeta" : "📱 Transf."}
                    </span>

                    <span className="font-black text-sm text-stone-900">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              Comparativa de ventas, producto más vendido, método de pago predominante y gavetas de efectivo.
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
            const pct = Math.min(100, Math.round((b.todaySales / Math.max(1, b.dailyGoal)) * 100));
            const isSelected = !isAllBranches && currentBranch?.id === b.id;
            const isTopRank = idx === 0;

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

            // Método de pago predominante
            const cashSales = b.currentShift?.cashSales || 0;
            const cardSales = b.currentShift?.cardSales || 0;
            const transferSales = b.currentShift?.transferSales || 0;
            const totalShiftSales = Math.max(1, cashSales + cardSales + transferSales);

            const isCashDominant = cashSales >= cardSales;
            const cashSharePct = Math.round((cashSales / totalShiftSales) * 100);
            const cardSharePct = Math.round((cardSales / totalShiftSales) * 100);
            const dominantPct = isCashDominant ? cashSharePct : cardSharePct;

            return (
              <div 
                key={b.id} 
                className={`p-5 rounded-3xl transition-all border flex flex-col justify-between space-y-4 ${
                  isSelected 
                    ? "bg-gradient-to-br from-orange-50/60 via-white to-rose-50/40 border-orange-400 shadow-lg ring-2 ring-orange-400/40" 
                    : "bg-stone-50/70 hover:bg-white border-stone-200/90 hover:border-orange-400 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs ${
                        isTopRank 
                          ? "bg-amber-100 text-amber-800 border border-amber-300" 
                          : "bg-stone-200 text-stone-700"
                      }`}>
                        {isTopRank ? <Award className="w-5 h-5 text-amber-600" /> : `#${idx + 1}`}
                      </div>
                      <div>
                        <p className="font-black text-sm text-stone-900 leading-tight flex items-center gap-1.5">
                          {b.name}
                          {isTopRank && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Líder
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-stone-400">{b.address.split(",")[0]}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => switchBranch(b.id)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all ${
                        isSelected
                          ? "bg-orange-600 text-white shadow-sm"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-orange-50 hover:text-orange-700"
                      }`}
                    >
                      {isSelected ? "Seleccionada" : "Filtrar"}
                    </button>
                  </div>

                  {/* Sales & Target */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-stone-500 font-medium">Venta de hoy:</span>
                      <span className="font-black text-lg text-stone-900">{formatCurrency(b.todaySales)}</span>
                    </div>

                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{b.todayTickets} tickets</span>
                      <span className="font-bold text-stone-700">{pct}% de meta ({formatCurrency(b.dailyGoal)})</span>
                    </div>
                  </div>

                  {/* Cashier, Drawer & Key Store Metrics */}
                  <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-stone-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {b.currentShift.name.split("(")[0]}
                      </span>
                      <span className="font-bold text-stone-800">{b.currentShift.cashier}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Efectivo en gaveta:</span>
                      <span className="font-black text-emerald-700">{formatCurrency(b.cashInDrawer)}</span>
                    </div>

                    {/* Producto más vendido */}
                    <div className="flex items-center justify-between text-stone-600 pt-1.5 border-t border-stone-100">
                      <span className="flex items-center gap-1.5 font-medium text-stone-500">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Más vendido:</span>
                      </span>
                      <span
                        className="font-bold text-stone-900 flex items-center gap-1 text-right truncate max-w-[175px]"
                        title={`${topProd.name} (${topProd.piecesSold} piezas vendidas)`}
                      >
                        <span className="text-xs">{topProd.icon || "🥖"}</span>
                        <span className="truncate">{topProd.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          {topProd.piecesSold} pz
                        </span>
                      </span>
                    </div>

                    {/* Método de pago predominante */}
                    <div className="flex items-center justify-between text-stone-600">
                      <span className="flex items-center gap-1.5 font-medium text-stone-500">
                        {isCashDominant ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span>Pago habitual:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                            isCashDominant
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isCashDominant ? "💵 Efectivo" : "💳 Tarjeta"}
                          <span className="font-semibold text-[10px] opacity-80">({dominantPct}%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-3 border-t border-stone-200/70">
                  <Link
                    href="/pos"
                    onClick={() => switchBranch(b.id)}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 hover:brightness-110 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-200" />
                    Abrir POS
                  </Link>
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
