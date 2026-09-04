"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, 
  Store, 
  Zap, 
  Play, 
  Pause, 
  Users, 
  Wallet, 
  ShoppingBag, 
  Receipt, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  MapPin,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  CreditCard,
  Croissant,
  Calendar,
  Layers,
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Flame,
  Award,
  Coffee,
  PieChart,
  Plus
} from "lucide-react";
import { useBranch, SimulatedSale } from "@/context/BranchContext";
import { Branch, BranchShift } from "@/types";
import { formatCurrency } from "@/lib/utils";
import GoogleBranchChart, { PeriodType } from "@/components/sucursales/GoogleBranchChart";
import RealTimeSalesMonitor from "@/components/sucursales/RealTimeSalesMonitor";
import CashFlowPanel from "@/components/sucursales/CashFlowPanel";
import CreateBranchModal from "@/components/sucursales/CreateBranchModal";
import EditShiftModal from "@/components/sucursales/EditShiftModal";

export default function SucursalesPage() {
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    switchBranch, 
    addBranch,
    updateBranch,
    simulateSale, 
    simulateBulkSales,
    advanceShift,
    isLiveSimulating,
    toggleLiveSimulation,
    recentSimulatedSales,
    cashMovements,
    addCashMovement,
    consolidatedMetrics
  } = useBranch();

  const [lastSimulatedSale, setLastSimulatedSale] = useState<SimulatedSale | null>(null);
  const [activeTab, setActiveTab] = useState<"realtime" | "cashflow" | "general" | "turnos">("realtime");
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [editingShiftBranch, setEditingShiftBranch] = useState<Branch | null>(null);

  const handleSaveShift = (branchId: string, updatedShift: any) => {
    updateBranch(branchId, { currentShift: updatedShift });
  };

  // Filter periods for Google-Style Chart & Table
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("semana");
  const [customStartDate, setCustomStartDate] = useState<string>("2026-08-20");
  const [customEndDate, setCustomEndDate] = useState<string>("2026-09-02");

  // Collapsible Google-Style Chart state (hidden by default as requested)
  const [showStatisticsChart, setShowStatisticsChart] = useState<boolean>(false);

  // Expandable statistics per branch state (hidden by default)
  const [expandedBranchIds, setExpandedBranchIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (branchId: string) => {
    setExpandedBranchIds((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  const toggleAllExpanded = () => {
    const allOpen = branches.every((b) => expandedBranchIds[b.id]);
    const nextState: Record<string, boolean> = {};
    branches.forEach((b) => {
      nextState[b.id] = !allOpen;
    });
    setExpandedBranchIds(nextState);
  };

  const handleSimulate = (branchId?: string) => {
    const sale = simulateSale(branchId);
    setLastSimulatedSale(sale);
    setTimeout(() => setLastSimulatedSale(null), 3500);
  };

  const handleSimulateShift = (branchId?: string) => {
    simulateBulkSales(branchId, 12);
  };

  // Compute period multiplier and days count for realistic period calculations
  const periodMultiplier = useMemo(() => {
    if (selectedPeriod === "hoy") return 1;
    if (selectedPeriod === "semana") return 7;
    if (selectedPeriod === "mes") return 30;
    if (selectedPeriod === "año") return 365;

    // Custom date range
    const start = new Date(customStartDate || "2026-08-20");
    const end = new Date(customEndDate || "2026-09-02");
    const diff = Math.max(86400000, end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [selectedPeriod, customStartDate, customEndDate]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === "hoy") return "Hoy (Día en Curso)";
    if (selectedPeriod === "semana") return "Esta Semana (Últimos 7 días)";
    if (selectedPeriod === "mes") return "Este Mes (30 días)";
    if (selectedPeriod === "año") return "Este Año (12 meses)";
    return `Rango: ${customStartDate} al ${customEndDate} (${periodMultiplier} días)`;
  }, [selectedPeriod, customStartDate, customEndDate, periodMultiplier]);

  // General metrics calculated per branch for the selected period
  const branchesOverview = useMemo(() => {
    const totalChainPeriodSales = branches.reduce((sum, b) => {
      const weight = b.code.includes("MAT") ? 1.05 : b.code.includes("BEN") ? 0.95 : 1.0;
      return sum + Math.round(b.todaySales * periodMultiplier * weight);
    }, 0);

    return branches.map((b) => {
      const weight = b.code.includes("MAT") ? 1.05 : b.code.includes("BEN") ? 0.95 : 1.0;
      const periodSales = Math.round(b.todaySales * periodMultiplier * weight);
      const periodTickets = Math.max(1, Math.round(b.todayTickets * periodMultiplier * weight));
      // Average price per bread piece ~ $16.5 MXN
      const periodPieces = Math.round(periodSales / 16.5);
      const dailyAveragePieces = Math.round(periodPieces / periodMultiplier);
      const averageTicket = periodSales / periodTickets;
      const periodGoal = b.dailyGoal * periodMultiplier;
      const percentGoal = Math.min(100, Math.round((periodSales / (periodGoal || 1)) * 100));
      const marketShare = totalChainPeriodSales > 0 
        ? Math.round((periodSales / totalChainPeriodSales) * 100) 
        : 33;

      // Realistic breakdown stats for the expanded drawer
      const isMatriz = b.code.includes("MAT");
      const isBenito = b.code.includes("BEN");

      // Bread categories breakdown
      const dulcePct = isMatriz ? 46 : isBenito ? 42 : 50;
      const blancoPct = isMatriz ? 36 : isBenito ? 45 : 32;
      const reposteriaPct = 100 - dulcePct - blancoPct;

      const dulcePieces = Math.round((periodPieces * dulcePct) / 100);
      const blancoPieces = Math.round((periodPieces * blancoPct) / 100);
      const reposteriaPieces = periodPieces - dulcePieces - blancoPieces;

      // Payment method breakdown
      const cashPct = isBenito ? 76 : isMatriz ? 65 : 68;
      const cardPct = isMatriz ? 25 : isBenito ? 18 : 22;
      const transferPct = 100 - cashPct - cardPct;

      // Top products for this store
      const topProducts = isMatriz
        ? [
            { name: "Bolillo Tradicional", pieces: Math.round(periodPieces * 0.22), revenue: Math.round(periodSales * 0.16) },
            { name: "Concha de Vainilla", pieces: Math.round(periodPieces * 0.18), revenue: Math.round(periodSales * 0.18) },
            { name: "Pastel 3 Leches", pieces: Math.round(periodPieces * 0.08), revenue: Math.round(periodSales * 0.20) },
            { name: "Cuerno Mantequilla", pieces: Math.round(periodPieces * 0.12), revenue: Math.round(periodSales * 0.14) },
          ]
        : isBenito
        ? [
            { name: "Bolillo de Sal (Mercado)", pieces: Math.round(periodPieces * 0.32), revenue: Math.round(periodSales * 0.24) },
            { name: "Telera para Torta", pieces: Math.round(periodPieces * 0.25), revenue: Math.round(periodSales * 0.19) },
            { name: "Concha de Chocolate", pieces: Math.round(periodPieces * 0.15), revenue: Math.round(periodSales * 0.16) },
            { name: "Dona Glaseada", pieces: Math.round(periodPieces * 0.12), revenue: Math.round(periodSales * 0.12) },
          ]
        : [
            { name: "Cuerno de Mantequilla", pieces: Math.round(periodPieces * 0.24), revenue: Math.round(periodSales * 0.22) },
            { name: "Café de Olla & Moka", pieces: Math.round(periodPieces * 0.18), revenue: Math.round(periodSales * 0.20) },
            { name: "Oreja Caramelizada", pieces: Math.round(periodPieces * 0.17), revenue: Math.round(periodSales * 0.18) },
            { name: "Rebanada Cheesecake", pieces: Math.round(periodPieces * 0.09), revenue: Math.round(periodSales * 0.19) },
          ];

      // Rush hours
      const peakHours = [
        { hour: "07:00 - 09:30 hrs", label: "Pico Mañanero (Café & Bolillos)", intensity: 95, icon: "☕" },
        { hour: "13:00 - 14:30 hrs", label: "Comida (Teleras & Baguettes)", intensity: 72, icon: "🥖" },
        { hour: "17:30 - 20:30 hrs", label: "Pan Caliente (Cena Familiar)", intensity: 100, icon: "🏆" },
      ];

      return {
        ...b,
        periodSales,
        periodTickets,
        periodPieces,
        dailyAveragePieces,
        averageTicket,
        periodGoal,
        percentGoal,
        marketShare,
        details: {
          categories: [
            { name: "Pan Dulce Tradicional", pct: dulcePct, pieces: dulcePieces, color: "bg-amber-500", textColor: "text-amber-700" },
            { name: "Pan Blanco & Teleras", pct: blancoPct, pieces: blancoPieces, color: "bg-orange-500", textColor: "text-orange-700" },
            { name: "Pastelería & Repostería", pct: reposteriaPct, pieces: reposteriaPieces, color: "bg-rose-500", textColor: "text-rose-700" },
          ],
          payment: {
            cashPct,
            cashAmount: Math.round((periodSales * cashPct) / 100),
            cardPct,
            cardAmount: Math.round((periodSales * cardPct) / 100),
            transferPct,
            transferAmount: Math.round((periodSales * transferPct) / 100),
          },
          topProducts,
          peakHours,
        },
      };
    });
  }, [branches, periodMultiplier]);

  // Consolidated table totals for the footer
  const consolidatedOverview = useMemo(() => {
    const totalSales = branchesOverview.reduce((sum, b) => sum + b.periodSales, 0);
    const totalTickets = branchesOverview.reduce((sum, b) => sum + b.periodTickets, 0);
    const totalPieces = branchesOverview.reduce((sum, b) => sum + b.periodPieces, 0);
    const totalGoal = branchesOverview.reduce((sum, b) => sum + b.periodGoal, 0);
    const totalCashInDrawers = branches.reduce((sum, b) => sum + b.cashInDrawer, 0);
    const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;
    const percentGoal = totalGoal > 0 ? Math.min(100, Math.round((totalSales / totalGoal) * 100)) : 0;

    return {
      totalSales,
      totalTickets,
      totalPieces,
      totalGoal,
      totalCashInDrawers,
      averageTicket,
      percentGoal,
    };
  }, [branchesOverview, branches]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-stone-800">
        <div className="absolute -right-12 -top-12 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5" />
              Red Multi-Sucursales & Producción
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Control de Sucursales y Analítica General
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Monitoreo ejecutivo de las tiendas de <strong>Panaderías Brito</strong>: gráfica desplegada de ventas y piezas de pan, tabla general de sucursales con estadísticas detalladas y control de turnos.
            </p>
          </div>

          {/* Action Button: Create Branch */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateBranchOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Nueva Sucursal</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Alert Banner */}
        {lastSimulatedSale && (
          <div className="mt-6 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="font-bold text-emerald-300">
                ¡Venta registrada en {lastSimulatedSale.branchName}!
              </p>
              <span className="text-stone-300">•</span>
              <p className="text-stone-300">{lastSimulatedSale.itemsSummary}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/40 text-stone-300 uppercase">
                {lastSimulatedSale.paymentMethod}
              </span>
              <span className="text-sm font-black text-white">
                {formatCurrency(lastSimulatedSale.total)}
              </span>
            </div>
          </div>
        )}

        {/* Live KPI Pulse Ribbon */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
              Ventas Hoy (En Vivo)
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              {formatCurrency(consolidatedMetrics.totalSales)}
            </span>
          </div>

          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
              Efectivo en Gavetas
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">
              {formatCurrency(consolidatedMetrics.totalCashInDrawer)}
            </span>
          </div>

          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
              Tickets Emitidos
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-300">
              {consolidatedMetrics.totalTickets} tickets
            </span>
          </div>

          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">
              Cumplimiento de Meta
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-orange-400">
                {consolidatedMetrics.percentGoal}%
              </span>
              <span className="text-[10px] text-stone-400">({formatCurrency(consolidatedMetrics.totalDailyGoal)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher (Tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* TAB 1: Ventas en Tiempo Real */}
          <button
            onClick={() => setActiveTab("realtime")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === "realtime"
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 fill-current animate-pulse" />
            <span>⚡ Ventas en Tiempo Real</span>
          </button>

          {/* TAB 2: Flujo de Dinero */}
          <button
            onClick={() => setActiveTab("cashflow")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === "cashflow"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-300" />
            <span>💰 Flujo de Dinero & Caja</span>
          </button>

          {/* TAB 3: Analítica & Gráfica Google */}
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "general"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <TableIcon className="w-4 h-4 text-orange-500" />
            <span>📊 Analítica & Gráfica Google</span>
          </button>

          {/* TAB 4: Turnos & Arqueo */}
          <button
            onClick={() => setActiveTab("turnos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "turnos"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <Clock className="w-4 h-4 text-rose-500" />
            <span>⏱️ Estado de Turnos & Arqueo</span>
          </button>
        </div>

        {/* Global branch selector pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => switchBranch("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border self-start sm:self-auto ${
              isAllBranches
                ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
                : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
            }`}
          >
            {isAllBranches ? "✓ Toda la Red" : "Ver Toda la Red"}
          </button>
        </div>
      </div>

      {/* TAB 1: Monitor de Ventas en Tiempo Real */}
      {activeTab === "realtime" && (
        <RealTimeSalesMonitor
          branches={branches}
          currentBranch={currentBranch}
          isAllBranches={isAllBranches}
          onSwitchBranch={switchBranch}
          recentSales={recentSimulatedSales}
          onSimulateSale={handleSimulate}
          onSimulateBulk={handleSimulateShift}
          isLiveSimulating={isLiveSimulating}
          onToggleLive={toggleLiveSimulation}
          lastSimulatedSale={lastSimulatedSale}
          onOpenCreateBranch={() => setIsCreateBranchOpen(true)}
        />
      )}

      {/* TAB 2: Panel Específico de Flujo de Dinero */}
      {activeTab === "cashflow" && (
        <CashFlowPanel
          branches={branches}
          currentBranch={currentBranch}
          isAllBranches={isAllBranches}
          onSwitchBranch={switchBranch}
          cashMovements={cashMovements}
          onAddCashMovement={addCashMovement}
          onAdvanceShift={advanceShift}
        />
      )}

      {/* TAB 3: Main Overview (Google-Style Chart + General Table) */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-in fade-in">
          {/* SECCIÓN DESPLEGABLE: Gráfica de Análisis & Estadísticas Estilo Google (Oculta al inicio) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-stone-900 tracking-tight">
                      Análisis de Ventas & Producción
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Estilo Google
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Gráfica desplegable de facturación ($ MXN), piezas de pan y comparativa multi-tienda ({periodLabel})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowStatisticsChart((prev) => !prev)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 ${
                  showStatisticsChart
                    ? "bg-stone-900 text-white hover:bg-black"
                    : "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-orange-500/20 hover:brightness-110"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{showStatisticsChart ? "Ocultar Estadísticas" : "Ver Estadísticas"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    showStatisticsChart ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Gráfica desplegada únicamente cuando showStatisticsChart es true */}
            {showStatisticsChart && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <GoogleBranchChart
                  branches={branches}
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                  onCustomDateChange={(start, end) => {
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                    setSelectedPeriod("custom");
                  }}
                  onSimulateSale={handleSimulate}
                  onClose={() => setShowStatisticsChart(false)}
                />
              </div>
            )}
          </div>

          {/* SECTION 2: General Overview Table */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden">
            {/* Table Header with Details & Action to toggle all statistics */}
            <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-stone-900 tracking-tight">
                    Tabla General de Sucursales
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-200/70 text-stone-700">
                    {branches.length} Tiendas Registradas
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Datos consolidados de piezas de pan, facturación y arqueo para: <strong className="text-stone-800">{periodLabel}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsCreateBranchOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs shadow-sm active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Nueva Sucursal</span>
                </button>

                <button
                  onClick={toggleAllExpanded}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 shadow-sm transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-orange-600" />
                  <span>
                    {branches.every((b) => expandedBranchIds[b.id])
                      ? "Colapsar Todas"
                      : "Desplegar Todas las Estadísticas"}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">Activa:</span>
                  <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200">
                    {isAllBranches ? "🌐 Cadena Completa" : currentBranch?.shortName}
                  </span>
                </div>
              </div>
            </div>

            {/* General Overview Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-3.5 px-4">Sucursal</th>
                    <th className="py-3.5 px-4">Encargado & Contacto</th>
                    <th className="py-3.5 px-4">Piezas Vendidas</th>
                    <th className="py-3.5 px-4">Ventas Totales</th>
                    <th className="py-3.5 px-4">Ticket Prom.</th>
                    <th className="py-3.5 px-4">Caja & Turno Actual</th>
                    <th className="py-3.5 px-4 text-right">Estadísticas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {branchesOverview.map((b) => {
                    const isSelected = !isAllBranches && currentBranch?.id === b.id;
                    const isExpanded = !!expandedBranchIds[b.id];

                    return (
                      <React.Fragment key={b.id}>
                        <tr
                          className={`transition-colors duration-150 ${
                            isSelected ? "bg-orange-50/40 font-semibold" : isExpanded ? "bg-stone-50/50" : "hover:bg-stone-50/80"
                          }`}
                        >
                          {/* 1. Sucursal & Codigo */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ${
                                b.id === "branch-matriz" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                                b.id === "branch-benito" ? "bg-gradient-to-br from-rose-500 to-rose-600" :
                                "bg-gradient-to-br from-amber-500 to-amber-600"
                              }`}>
                                <Store className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-black text-stone-900 text-sm">{b.name}</p>
                                  {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Seleccionada" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-stone-400 font-bold uppercase">
                                    {b.code}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Encargado & Contacto */}
                          <td className="py-4 px-4 text-stone-600">
                            <div className="space-y-0.5">
                              <p className="font-bold text-stone-900 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                {b.manager}
                              </p>
                              <p className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                {b.phone}
                              </p>
                              <p className="text-[10px] text-stone-400 truncate max-w-[170px]" title={b.address}>
                                {b.address}
                              </p>
                            </div>
                          </td>

                          {/* 3. Piezas de Pan */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <p className="font-black text-stone-900 text-sm flex items-center gap-1 text-amber-700">
                                <Croissant className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                {b.periodPieces.toLocaleString("es-MX")} <span className="text-[10px] text-stone-400 font-normal">pzas</span>
                              </p>
                              <p className="text-[10px] text-stone-500">
                                Prom. ~{b.dailyAveragePieces.toLocaleString("es-MX")} pz/día
                              </p>
                            </div>
                          </td>

                          {/* 4. Ventas Totales */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <p className="font-black text-stone-900 text-sm">
                                {formatCurrency(b.periodSales)}
                              </p>
                              <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block">
                                {b.marketShare}% de la red
                              </p>
                            </div>
                          </td>

                          {/* 5. Ticket Promedio */}
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-bold text-stone-800">
                                {formatCurrency(b.averageTicket)}
                              </p>
                              <p className="text-[10px] text-stone-400">
                                {b.periodTickets.toLocaleString("es-MX")} tickets
                              </p>
                            </div>
                          </td>

                          {/* 6. Caja & Turno Actual */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <p className="font-black text-stone-900 flex items-center gap-1 text-xs">
                                <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {formatCurrency(b.cashInDrawer)}
                              </p>
                              <p className="text-[11px] text-stone-600 font-semibold truncate max-w-[140px]">
                                {b.currentShift.cashier}
                              </p>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                  {b.currentShift.name}
                                </span>
                                <button
                                  onClick={() => setEditingShiftBranch(b)}
                                  className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 hover:text-orange-700 font-bold px-1.5 py-0.5 rounded hover:bg-orange-50 transition-colors"
                                  title="Modificar horario del turno"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Horario</span>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 7. Botón Ver Estadísticas Desplegable */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => toggleExpand(b.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border shadow-sm ${
                                  isExpanded
                                    ? "bg-stone-900 text-white border-stone-900 shadow-md"
                                    : "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 active:scale-95"
                                }`}
                                title="Desplegar panel con estadísticas detalladas de esta sucursal"
                              >
                                <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                                <span>{isExpanded ? "Ocultar Estadísticas" : "Ver Estadísticas"}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* PANEL DESPLEGABLE: Estadísticas Detalladas de la Sucursal */}
                        {isExpanded && (
                          <tr className="bg-orange-50/20 border-b-2 border-orange-200/70">
                            <td colSpan={7} className="p-4 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="bg-white rounded-3xl border border-orange-200/90 shadow-xl p-5 sm:p-6 space-y-6">
                                {/* Header del Panel Desplegable */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-md ${
                                      b.id === "branch-matriz" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                                      b.id === "branch-benito" ? "bg-gradient-to-br from-rose-500 to-rose-600" :
                                      "bg-gradient-to-br from-amber-500 to-amber-600"
                                    }`}>
                                      <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <h4 className="text-base font-black text-stone-900 flex items-center gap-2">
                                        Estadísticas Operativas: {b.name}
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                          {b.code}
                                        </span>
                                      </h4>
                                      <p className="text-xs text-stone-500">
                                        Desglose por tipo de pan, medios de cobro, horas pico y panes estrella para: <strong>{periodLabel}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button
                                      onClick={() => toggleExpand(b.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
                                    >
                                      <span>Cerrar</span>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* 4 Bloques Analíticos Desplegados */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {/* Bloque 1: Categorías de Pan Producidas & Vendidas */}
                                  <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                        <Croissant className="w-4 h-4 text-amber-600" />
                                        Variedad de Pan
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                        {b.periodPieces.toLocaleString("es-MX")} pzas
                                      </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                      {b.details.categories.map((cat, idx) => (
                                        <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-stone-600 font-medium">{cat.name}</span>
                                            <span className={`font-bold ${cat.textColor}`}>
                                              {cat.pieces.toLocaleString("es-MX")} pz ({cat.pct}%)
                                            </span>
                                          </div>
                                          <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                              className={`${cat.color} h-full rounded-full`}
                                              style={{ width: `${cat.pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Bloque 2: Distribución de Formas de Pago */}
                                  <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                        <Coins className="w-4 h-4 text-emerald-600" />
                                        Medios de Pago
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        {formatCurrency(b.periodSales)}
                                      </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/60">
                                        <span className="text-stone-600 font-medium flex items-center gap-1.5">
                                          <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Efectivo:
                                        </span>
                                        <span className="font-bold text-stone-900">
                                          {formatCurrency(b.details.payment.cashAmount)}{" "}
                                          <span className="text-[10px] text-stone-400 font-normal">({b.details.payment.cashPct}%)</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/60">
                                        <span className="text-stone-600 font-medium flex items-center gap-1.5">
                                          <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Tarjeta:
                                        </span>
                                        <span className="font-bold text-stone-900">
                                          {formatCurrency(b.details.payment.cardAmount)}{" "}
                                          <span className="text-[10px] text-stone-400 font-normal">({b.details.payment.cardPct}%)</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/60">
                                        <span className="text-stone-600 font-medium flex items-center gap-1.5">
                                          <Receipt className="w-3.5 h-3.5 text-purple-600" /> Transferencia:
                                        </span>
                                        <span className="font-bold text-stone-900">
                                          {formatCurrency(b.details.payment.transferAmount)}{" "}
                                          <span className="text-[10px] text-stone-400 font-normal">({b.details.payment.transferPct}%)</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bloque 3: Horarios Pico en Mostrador */}
                                  <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-orange-600" />
                                        Horas Pico Mostrador
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                                        Afluencia
                                      </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                      {b.details.peakHours.map((peak, idx) => (
                                        <div key={idx} className="p-2 rounded-xl bg-white border border-stone-200/60 space-y-1">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-stone-800 flex items-center gap-1">
                                              <span>{peak.icon}</span> {peak.hour}
                                            </span>
                                            <span className="font-black text-orange-600 text-[10px]">
                                              {peak.intensity}% pico
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-stone-500">{peak.label}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Bloque 4: Top Panes Estrella Más Vendidos */}
                                  <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-amber-500" />
                                        Panes Estrella
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                        Top 4
                                      </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs">
                                      {b.details.topProducts.map((prod, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white transition-colors">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                              #{idx + 1}
                                            </span>
                                            <span className="font-bold text-stone-800 text-[11px] truncate max-w-[110px]">
                                              {prod.name}
                                            </span>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-bold text-stone-900 text-[11px]">
                                              {prod.pieces.toLocaleString("es-MX")} <span className="text-[9px] text-stone-400">pz</span>
                                            </p>
                                            <p className="text-[9px] text-emerald-600 font-semibold">
                                              {formatCurrency(prod.revenue)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Bar con Balance de Turno y Acción POS */}
                                <div className="bg-stone-50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-stone-200/80">
                                  <div className="flex flex-wrap items-center gap-4 text-stone-600">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-stone-400">Turno Activo:</span>
                                      <strong className="text-stone-900">{b.currentShift.name}</strong>
                                      <button
                                        onClick={() => setEditingShiftBranch(b)}
                                        className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-orange-50 text-orange-600 font-bold text-[10px] border border-stone-200 hover:border-orange-300 transition-colors shadow-xs"
                                        title="Modificar horario del turno"
                                      >
                                        <Clock className="w-3 h-3 text-orange-500" />
                                        <span>Modificar Horario</span>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-stone-400">Cajera / Operador:</span>
                                      <strong className="text-stone-900">{b.currentShift.cashier}</strong>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-stone-400">Fondo Inicial:</span>
                                      <strong className="text-stone-900">{formatCurrency(b.currentShift.initialFund)}</strong>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-stone-400">Efectivo en Gaveta:</span>
                                      <strong className="text-emerald-700 font-black">{formatCurrency(b.cashInDrawer)}</strong>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setEditingShiftBranch(b)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition-colors"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>Modificar Horario</span>
                                    </button>
                                    <button
                                      onClick={() => advanceShift(b.id)}
                                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold border border-stone-200 transition-colors"
                                    >
                                      Corte de Turno
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* Table Footer: Consolidated Total Row */}
                <tfoot>
                  <tr className="border-t-2 border-stone-300 bg-stone-900 text-white font-black text-xs">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-400" />
                        <div>
                          <p className="text-sm uppercase tracking-wider text-orange-400">Total Cadena</p>
                          <p className="text-[10px] text-stone-400 font-normal">Consolidado general</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-stone-300 text-[11px]">
                      {branches.length} Sucursales Activas
                    </td>
                    <td className="py-4 px-4 text-amber-300 text-sm">
                      {consolidatedOverview.totalPieces.toLocaleString("es-MX")}{" "}
                      <span className="text-[10px] text-stone-400 font-normal">pzas</span>
                    </td>
                    <td className="py-4 px-4 text-white text-base">
                      {formatCurrency(consolidatedOverview.totalSales)}
                    </td>
                    <td className="py-4 px-4 text-stone-200">
                      {formatCurrency(consolidatedOverview.averageTicket)}
                    </td>
                    <td className="py-4 px-4 text-emerald-300 text-sm">
                      {formatCurrency(consolidatedOverview.totalCashInDrawers)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => switchBranch("all")}
                        className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-all active:scale-95 shadow-md"
                      >
                        Ver Consolidado
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Shift Management & Arqueo Comparison */}
      {activeTab === "turnos" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-base font-black text-stone-900 mb-1">
              Comparativa de Turnos Activos por Sucursal
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Estado en tiempo real del fondo inicial, ventas por medio de pago y arqueo de caja
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
                    <th className="pb-3 px-3">Sucursal</th>
                    <th className="pb-3 px-3">Turno Actual</th>
                    <th className="pb-3 px-3">Cajera / Operador</th>
                    <th className="pb-3 px-3">Fondo Inicial</th>
                    <th className="pb-3 px-3">Venta Efectivo</th>
                    <th className="pb-3 px-3">Venta Tarjeta/Transfer</th>
                    <th className="pb-3 px-3">Total en Turno</th>
                    <th className="pb-3 px-3">Efectivo en Caja</th>
                    <th className="pb-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-stone-900">
                        {b.name}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-200 inline-block text-xs shadow-xs">
                            {b.currentShift.name}
                          </span>
                          <button
                            onClick={() => setEditingShiftBranch(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-orange-500 hover:text-white text-orange-600 font-bold text-[11px] border border-orange-200 shadow-xs transition-all active:scale-95 group shrink-0"
                            title="Modificar horario y nombre del turno"
                          >
                            <Clock className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                            <span>Modificar Horario</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-stone-800">
                        {b.currentShift.cashier}
                      </td>
                      <td className="py-3.5 px-3 text-stone-600">
                        {formatCurrency(b.currentShift.initialFund)}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-700">
                        {formatCurrency(b.currentShift.cashSales)}
                      </td>
                      <td className="py-3.5 px-3 text-stone-600">
                        {formatCurrency(b.currentShift.cardSales + b.currentShift.transferSales)}
                      </td>
                      <td className="py-3.5 px-3 font-black text-stone-900">
                        {formatCurrency(b.currentShift.totalSales)}
                      </td>
                      <td className="py-3.5 px-3 font-black text-stone-900 bg-stone-50">
                        {formatCurrency(b.cashInDrawer)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingShiftBranch(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[11px] transition-all flex items-center gap-1"
                            title="Cambiar horario del turno"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Horario</span>
                          </button>
                          <button
                            onClick={() => advanceShift(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] transition-colors"
                          >
                            Corte / Siguiente Turno
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Sucursal y Asignar Encargado */}
      <CreateBranchModal
        isOpen={isCreateBranchOpen}
        onClose={() => setIsCreateBranchOpen(false)}
        onAddBranch={addBranch}
        existingCount={branches.length}
      />

      {/* Modal para Modificar Horario del Turno */}
      <EditShiftModal
        isOpen={!!editingShiftBranch}
        onClose={() => setEditingShiftBranch(null)}
        branch={editingShiftBranch}
        onSaveShift={handleSaveShift}
      />
    </div>
  );
}
