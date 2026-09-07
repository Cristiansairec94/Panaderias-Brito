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
  Package, 
  Building2,
  Zap,
  Store,
  Clock,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Flame,
  Play,
  Pause,
  PlusCircle,
  TrendingDown,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Croissant,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Award,
  CreditCard,
  Banknote,
  ArrowDownRight,
  Eye
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth, getFriendlyName } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useBranch } from "@/context/BranchContext";

// Top bakery products data
const TOP_BAKERY_PRODUCTS = [
  { id: "1", name: "Concha de Vainilla Artesanal", category: "Pan Dulce", icon: "🥖", price: 14, piecesSold: 342, revenue: 4788, share: 24, trend: "+15%", tag: "Más Vendido" },
  { id: "2", name: "Bolillo Tradicional de Horno", category: "Pan Salado", icon: "🥖", price: 6, piecesSold: 580, revenue: 3480, share: 18, trend: "+22%", tag: "Alta Rotación" },
  { id: "3", name: "Cuerno de Mantequilla Francés", category: "Hojaldre", icon: "🥐", price: 18, piecesSold: 165, revenue: 2970, share: 15, trend: "+8%", tag: "Favorito" },
  { id: "4", name: "Dona Glaseada de Azúcar", category: "Pan Dulce", icon: "🍩", price: 15, piecesSold: 180, revenue: 2700, share: 14, trend: "+6%", tag: "Popular" },
  { id: "5", name: "Rebanada Pastel Tres Leches", category: "Pastelería", icon: "🍰", price: 48, piecesSold: 46, revenue: 2208, share: 11, trend: "+18%", tag: "Gourmet" },
];

interface ChartDataPoint {
  label: string;
  index: number;
  amount: number;
  tickets: number;
  pieces: number;
  isPeak: boolean;
}

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
    simulateBulkSales,
    isLiveSimulating,
    toggleLiveSimulation
  } = useBranch();

  // Filters state
  const [selectedPeriod, setSelectedPeriod] = useState<"hoy" | "semana" | "mes">("hoy");
  const [activeChartTab, setActiveChartTab] = useState<"horas" | "dias">("horas");
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);
  const [greeting, setGreeting] = useState("¡Bienvenido");

  // Dynamic greeting by local hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("¡Buenos días");
    } else if (hour >= 12 && hour < 19) {
      setGreeting("¡Buenas tardes");
    } else {
      setGreeting("¡Buenas noches");
    }
  }, []);

  // Period multiplier
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

  // Method breakdowns
  const cashShare = isAllBranches ? 0.70 : (currentBranch ? currentBranch.currentShift.cashSales / Math.max(1, currentBranch.currentShift.totalSales) : 0.70);
  const cardShare = isAllBranches ? 0.20 : (currentBranch ? currentBranch.currentShift.cardSales / Math.max(1, currentBranch.currentShift.totalSales) : 0.20);
  const transferShare = Math.max(0, 1 - cashShare - cardShare);

  const cashAmount = Math.round(activeSales * cashShare);
  const cardAmount = Math.round(activeSales * cardShare);
  const transferAmount = Math.round(activeSales * transferShare);

  // Hourly curve distribution for bakery peak hours (06:00 - 21:00)
  const hourlyData = useMemo(() => {
    const hours = [
      { label: "06:00", weight: 0.05, isMorningRush: true },
      { label: "07:00", weight: 0.12, isMorningRush: true },
      { label: "08:00", weight: 0.16, isMorningRush: true },
      { label: "09:00", weight: 0.13, isMorningRush: true },
      { label: "10:00", weight: 0.07, isMorningRush: false },
      { label: "11:30", weight: 0.05, isMorningRush: false },
      { label: "13:00", weight: 0.06, isMorningRush: false },
      { label: "15:00", weight: 0.05, isMorningRush: false },
      { label: "17:00", weight: 0.11, isEveningRush: true },
      { label: "18:00", weight: 0.17, isEveningRush: true },
      { label: "19:30", weight: 0.14, isEveningRush: true },
      { label: "20:30", weight: 0.07, isEveningRush: false },
    ];

    return hours.map((h, i): ChartDataPoint => {
      const amount = Math.round(activeSales * h.weight);
      const tickets = Math.max(1, Math.round(activeTickets * h.weight));
      const pieces = Math.round(tickets * 8.6);
      return {
        label: h.label,
        index: i,
        amount,
        tickets,
        pieces,
        isPeak: Boolean(h.isMorningRush || h.isEveningRush),
      };
    });
  }, [activeSales, activeTickets]);

  // Weekly historical data
  const weeklyData: ChartDataPoint[] = useMemo(() => {
    const days = [
      { label: "Lun", factor: 0.82 },
      { label: "Mar", factor: 0.88 },
      { label: "Mié", factor: 0.94 },
      { label: "Jue", factor: 0.92 },
      { label: "Vie", factor: 1.15 },
      { label: "Sáb", factor: 1.35, isPeak: true },
      { label: "Dom", factor: 1.28, isPeak: true },
    ];

    const baseDaySales = Math.round(baseSales);

    return days.map((d, i): ChartDataPoint => {
      const amount = Math.round(baseDaySales * d.factor);
      const tickets = Math.round(baseTickets * d.factor);
      return {
        label: d.label,
        index: i,
        amount,
        tickets,
        pieces: Math.round(tickets * 8.6),
        isPeak: Boolean(d.isPeak),
      };
    });
  }, [baseSales, baseTickets]);

  const activeChartItems = activeChartTab === "horas" ? hourlyData : weeklyData;
  const maxChartAmount = Math.max(...activeChartItems.map((d) => d.amount), 1);



  // Ranked branches by today sales
  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => b.todaySales - a.todaySales);
  }, [branches]);

  return (
    <div className="p-4 sm:p-7 space-y-7 max-w-7xl mx-auto">
      {/* Top Hero: Official Deep Charcoal & Onyx with Warm Brito Orange & Crimson Accents */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c0d14] via-[#12141f] to-[#090a0f] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/[0.08]">
        {/* Glow ambient spots */}
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Brand Welcome & Context */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-200" />
                Panel Ejecutivo
              </span>
              <span className="text-xs text-stone-300 font-semibold flex items-center gap-1.5 bg-white/[0.07] px-3 py-1 rounded-full border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isAllBranches ? "Consolidado General (3 Sucursales)" : currentBranch?.name}
              </span>
              {isLiveSimulating && (
                <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  Ventas en Vivo
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  {greeting} {getFriendlyName(user?.name)}!
                </h1>
                <span
                  className="font-brito-script text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 select-none inline-block -rotate-2"
                  style={{
                    fontFamily: "var(--font-satisfy), 'Satisfy', var(--font-dancing), 'Dancing Script', cursive",
                  }}
                >
                  Brito
                </span>
              </div>
              <p className="text-stone-300 text-xs sm:text-sm mt-1 leading-relaxed">
                Control central de <strong className="text-orange-400">ventas, cajas y hornadas</strong> en tiempo real. Supervisa el flujo por tienda y agiliza el cobro en mostrador.
              </p>
            </div>

            {/* Branch Switcher Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">Tienda:</span>
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

          {/* Quick Operations Action Bar */}
          <div className="relative z-10 flex flex-wrap lg:flex-col gap-2.5 self-start lg:self-center min-w-[240px]">
            <Link
              href="/pos"
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#e11d48] hover:brightness-110 text-white font-black px-6 py-3.5 rounded-2xl shadow-xl shadow-orange-600/30 transition-all active:scale-95 text-xs tracking-wide"
            >
              <ShoppingBag className="w-4 h-4 text-amber-200" />
              <span>Abrir POS Mostrador</span>
            </Link>

            <div className="flex gap-2 w-full">
              <button
                onClick={() => simulateSale()}
                title="Simula un ticket de venta en la sucursal activa"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.16] text-white font-bold px-3 py-2.5 rounded-xl border border-white/15 transition-all active:scale-95 text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                +1 Venta
              </button>
              <button
                onClick={() => simulateBulkSales(undefined, 5)}
                title="Simula 5 ventas automáticas"
                className="flex items-center justify-center gap-1 bg-white/[0.08] hover:bg-white/[0.16] text-white font-bold px-3 py-2.5 rounded-xl border border-white/15 transition-all active:scale-95 text-xs"
              >
                +5 Ventas
              </button>
              <button
                onClick={toggleLiveSimulation}
                title={isLiveSimulating ? "Pausar simulación" : "Activar simulación continua en segundo plano"}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-95 ${
                  isLiveSimulating
                    ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/35"
                    : "bg-white/[0.08] text-stone-300 border-white/15 hover:bg-white/[0.16]"
                }`}
              >
                {isLiveSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isLiveSimulating ? "Pausar" : "Auto"}</span>
              </button>
            </div>

            <div className="flex gap-2 w-full">
              <Link
                href="/ingresos"
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-bold px-3 py-2.5 rounded-xl border border-emerald-500/30 transition-all text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                + Abono
              </Link>
              <Link
                href="/caja?tab=salidas"
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-bold px-3 py-2.5 rounded-xl border border-rose-500/30 transition-all text-xs"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                - Gasto
              </Link>
              <Link
                href="/caja"
                className="flex items-center justify-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold px-3 py-2.5 rounded-xl border border-white/15 transition-all text-xs"
                title="Corte y Arqueo de Caja"
              >
                <Wallet className="w-3.5 h-3.5 text-orange-400" />
                Corte
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Period Filter Bar & Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/90 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-black text-stone-900 uppercase tracking-wider">
            Métricas de Rendimiento en Tiempo Real
          </span>
          <span className="text-xs text-stone-400 hidden md:inline">
            • {isAllBranches ? "Consolidando las 3 sucursales de Brito" : `Filtrando sucursal ${currentBranch?.name}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSelectedPeriod("hoy")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              selectedPeriod === "hoy"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Hoy en Vivo
          </button>
          <button
            onClick={() => setSelectedPeriod("semana")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              selectedPeriod === "semana"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setSelectedPeriod("mes")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              selectedPeriod === "mes"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Este Mes
          </button>
        </div>
      </div>

      {/* 4 Hero KPI Cards: Ventas, Caja, Ticket Promedio, Piezas Horneadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Ventas Totales */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-3">
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
              <span className="flex items-center gap-1 text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {activeTickets} tickets
              </span>
              <span>{percentGoal}% de meta</span>
            </div>

            {/* Goal Progress bar */}
            <div className="w-full bg-stone-100 rounded-full h-2 mt-2 overflow-hidden border border-stone-200/60">
              <div
                className="bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentGoal}%` }}
              />
            </div>

            {/* Payment method pills */}
            <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 font-medium">
              <span title={`Efectivo: ${formatCurrency(cashAmount)}`}>💵 {Math.round(cashShare * 100)}% Efec.</span>
              <span title={`Tarjeta: ${formatCurrency(cardAmount)}`}>💳 {Math.round(cardShare * 100)}% Tarj.</span>
              <span title={`Transferencia: ${formatCurrency(transferAmount)}`}>📱 {Math.round(transferShare * 100)}% Transf.</span>
            </div>
          </div>
        </div>

        {/* Card 2: Efectivo Neto en Caja */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Efectivo en Caja</span>
            <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {formatCurrency(activeCash)}
            </p>
            <p className="text-xs text-stone-600 mt-1 font-semibold">
              {isAllBranches ? "3 gavetas activas" : `${currentBranch?.currentShift.name.split("(")[0]}`}
            </p>
            <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span>{isAllBranches ? "Total consolidado" : `Cajero: ${currentBranch?.currentShift.cashier}`}</span>
              <Link href="/caja" className="text-orange-600 font-bold hover:underline flex items-center gap-0.5">
                Arqueo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Ticket Promedio */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-3">
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
              <span>Gasto medio por cliente</span>
              <span className="font-bold text-stone-700">~8.5 pzas/ticket</span>
            </div>
          </div>
        </div>

        {/* Card 4: Piezas Horneadas & Vendidas */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-500 uppercase tracking-wider">Piezas de Pan</span>
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
              5 tandas horneadas hoy
            </p>
            <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span>Horno Leña & Gas</span>
              <Link href="/inventario" className="text-rose-600 font-bold hover:underline flex items-center gap-0.5">
                Almacén <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sucursales Hub (Rendimiento en Vivo por Sucursal) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                Matriz de Desempeño por Sucursal
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                3 Tiendas Activas
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Comparativa de ventas, avance de meta diaria, efectivo en gaveta y cajero en turno por sucursal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sucursales"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
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

            return (
              <div 
                key={b.id} 
                className={`p-5 rounded-3xl transition-all border flex flex-col justify-between space-y-4 ${
                  isSelected 
                    ? "bg-gradient-to-br from-orange-50/60 via-white to-rose-50/40 border-orange-400 shadow-lg ring-2 ring-orange-400/40" 
                    : "bg-stone-50/60 hover:bg-white border-stone-200/90 hover:shadow-md"
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

                  {/* Cashier & Drawer */}
                  <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-1 text-xs">
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
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-3 border-t border-stone-200/70 flex gap-2">
                  <button
                    onClick={() => simulateSale(b.id)}
                    className="flex-1 py-1.5 rounded-xl bg-white hover:bg-orange-50 text-stone-700 hover:text-orange-700 border border-stone-200/90 text-[11px] font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                    +Venta
                  </button>
                  <Link
                    href="/pos"
                    onClick={() => switchBranch(b.id)}
                    className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 hover:brightness-110 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95"
                  >
                    <ShoppingBag className="w-3 h-3 text-amber-200" />
                    Abrir POS
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Flow Chart & Peak Bakery Rushes */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Flujo Horario & Horas Pico de Panadería
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {isAllBranches ? "Consolidado" : currentBranch?.shortName}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Demanda de mostrador: picos matutino (bolillo/conchas) y vespertino (pan para café de la tarde).
            </p>
          </div>

          {/* Toggle between Hourly and Weekly */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveChartTab("horas")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeChartTab === "horas"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Horas del Día (Picos)
              </button>
              <button
                onClick={() => setActiveChartTab("dias")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeChartTab === "dias"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Días de la Semana
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Chart Bars */}
        <div className="space-y-3">
          <div className="h-44 sm:h-48 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-1">
            {activeChartItems.map((d) => {
              const heightPercent = Math.max(14, Math.round((d.amount / maxChartAmount) * 100));
              const isPeak = d.isPeak;
              const isHovered = hoveredDataIndex === d.index;

              return (
                <div
                  key={d.label}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredDataIndex(d.index)}
                  onMouseLeave={() => setHoveredDataIndex(null)}
                >
                  {/* Tooltip Hover Bubble */}
                  <div
                    className={`absolute bottom-full mb-2 bg-stone-950 text-white rounded-2xl px-3.5 py-2.5 text-xs shadow-2xl border border-stone-800 pointer-events-none transition-all duration-150 z-20 whitespace-nowrap ${
                      isHovered ? "opacity-100 scale-100 -translate-y-1" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <p className="font-black text-amber-300">
                      {activeChartTab === "horas" ? `${d.label} hrs` : d.label}
                    </p>
                    <p className="font-black text-white text-sm">{formatCurrency(d.amount)}</p>
                    <p className="text-[10px] text-stone-300">
                      {d.tickets} tickets emitidos • ~{d.pieces} piezas
                    </p>
                    {isPeak && (
                      <p className="text-[9px] font-black text-orange-400 uppercase mt-0.5">
                        🔥 Pico de Mayor Venta
                      </p>
                    )}
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full relative flex items-end justify-center">
                    <div
                      className={`w-full max-w-[44px] rounded-2xl transition-all duration-300 ${
                        isPeak
                          ? "bg-gradient-to-t from-orange-600 via-rose-500 to-amber-400 shadow-md shadow-orange-500/20"
                          : "bg-gradient-to-t from-stone-200 to-stone-300 hover:from-orange-300 hover:to-orange-400"
                      } ${isHovered ? "ring-2 ring-orange-500 brightness-110 scale-105" : ""}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] sm:text-[11px] font-bold mt-2 tracking-tight ${
                    isPeak ? "text-orange-600 font-black" : "text-stone-400"
                  }`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Peak Bakery Insights Callouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-100">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-black text-sm">
                🌅
              </div>
              <div>
                <p className="text-xs font-black text-amber-950">Pico Matutino (07:00 - 09:30 AM)</p>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Alta salida de <strong>Bolillo artesanal caliente</strong> para lonches/desayunos y conchas recién horneadas con café.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 font-black text-sm">
                ☕
              </div>
              <div>
                <p className="text-xs font-black text-rose-950">Pico Vespertino (17:30 - 20:30 PM)</p>
                <p className="text-[11px] text-rose-800/90 leading-relaxed">
                  Compra familiar de <strong>Pan Dulce surtido</strong> (cuernos, donas, orejas y pasteles) para la merienda o cena.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Bakery Products Ranking */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Croissant className="w-5 h-5 text-orange-600" />
              Los Panes Más Vendidos Hoy
            </h2>
            <p className="text-xs text-stone-500">
              Ranking de salida de piezas en mostrador y aporte a ingresos
            </p>
          </div>
          <Link
            href="/productos"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            Ver Catálogo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {TOP_BAKERY_PRODUCTS.map((prod, idx) => (
            <div 
              key={prod.id} 
              className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-orange-300 hover:bg-orange-50/20 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center font-black text-xs">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {prod.trend} hoy
                  </span>
                </div>

                <div>
                  <p className="font-black text-sm text-stone-900 leading-snug">
                    {prod.name}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {prod.piecesSold} piezas vendidas • {formatCurrency(prod.price)} c/u
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="text-[10px] text-stone-400 font-bold uppercase">{prod.category}</span>
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



      {/* Quick Direct ERP Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Control de turnos, gastos menores (gas, insumos), retiros de Don Toño y arqueo de caja.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-emerald-600 group-hover:translate-x-1 transition-transform">
            Administrar Caja <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Inventario Card */}
        <Link 
          href="/inventario" 
          className="group bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm hover:border-rose-500 hover:shadow-xl transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Inventario & Materia Prima</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Registro de compras a proveedores, sacos de harina, azúcar, mantequilla y control de mermas.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-rose-600 group-hover:translate-x-1 transition-transform">
            Ver Almacén <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
