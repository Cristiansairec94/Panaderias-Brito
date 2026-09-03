"use client";

import { useState, useMemo } from "react";
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
  ChevronRight
} from "lucide-react";
import { useBranch, SimulatedSale } from "@/context/BranchContext";
import { formatCurrency } from "@/lib/utils";
import GoogleBranchChart, { PeriodType } from "@/components/sucursales/GoogleBranchChart";

export default function SucursalesPage() {
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    switchBranch, 
    simulateSale, 
    simulateBulkSales,
    advanceShift,
    isLiveSimulating,
    toggleLiveSimulation,
    recentSimulatedSales,
    consolidatedMetrics
  } = useBranch();

  const [lastSimulatedSale, setLastSimulatedSale] = useState<SimulatedSale | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "turnos" | "feed">("general");

  // Filter periods for Google-Style Chart & Table
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("semana");
  const [customStartDate, setCustomStartDate] = useState<string>("2026-08-20");
  const [customEndDate, setCustomEndDate] = useState<string>("2026-09-02");

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
      // Historical variation weight per branch
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
              Monitoreo ejecutivo de las 3 tiendas de <strong>Panaderías Brito</strong>: gráfica desplegada de ventas y piezas de pan, tabla general de sucursales, control de turnos y simulador de flujo.
            </p>
          </div>

          {/* Quick Simulation Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleSimulate()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current animate-pulse" />
              <span>⚡ Simular 1 Venta</span>
            </button>

            <button
              onClick={() => handleSimulateShift()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-xs border border-white/10 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
              <span>🎲 Simular Turno (12 Tkts)</span>
            </button>

            <button
              onClick={toggleLiveSimulation}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                isLiveSimulating
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300"
              }`}
            >
              {isLiveSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar En Vivo</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span>Ventas en Vivo (Auto)</span>
                </>
              )}
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
      </div>

      {/* Navigation View Switcher (Tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "general"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <TableIcon className="w-4 h-4 text-orange-500" />
            <span>Resumen General & Gráfica</span>
          </button>
          <button
            onClick={() => setActiveTab("turnos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "turnos"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <Clock className="w-4 h-4 text-rose-500" />
            <span>Estado de Turnos & Arqueo</span>
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "feed"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Ventas Simuladas ({recentSimulatedSales.length})</span>
          </button>
        </div>

        <button
          onClick={() => switchBranch("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border self-start sm:self-auto ${
            isAllBranches
              ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
              : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
          }`}
        >
          {isAllBranches ? "✓ Consolidado Activo" : "Ver Toda la Cadena"}
        </button>
      </div>

      {/* TAB 1: Main Overview (Google-Style Chart + General Table) */}
      {activeTab === "general" && (
        <div className="space-y-8 animate-in fade-in">
          {/* SECTION 1: Google-Style Deployed Interactive Chart */}
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
          />

          {/* SECTION 2: General Overview Table */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden">
            {/* Table Header with Details & Period Badge */}
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

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-medium">Sucursal activa en el sistema:</span>
                <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200">
                  {isAllBranches ? "🌐 Toda la Cadena" : currentBranch?.name}
                </span>
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
                    <th className="py-3.5 px-4">Meta & Cumplimiento</th>
                    <th className="py-3.5 px-4">Caja & Turno Actual</th>
                    <th className="py-3.5 px-4 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {branchesOverview.map((b) => {
                    const isSelected = !isAllBranches && currentBranch?.id === b.id;

                    return (
                      <tr
                        key={b.id}
                        className={`transition-colors duration-150 ${
                          isSelected ? "bg-orange-50/40 font-semibold" : "hover:bg-stone-50/80"
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

                        {/* 6. Meta & Cumplimiento */}
                        <td className="py-4 px-4 min-w-[140px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-black text-stone-800">{b.percentGoal}%</span>
                              <span className="text-[10px] text-stone-400">Meta: {formatCurrency(b.periodGoal)}</span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  b.percentGoal >= 90 ? "bg-emerald-500" :
                                  b.percentGoal >= 70 ? "bg-amber-500" :
                                  "bg-orange-500"
                                }`}
                                style={{ width: `${b.percentGoal}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 7. Caja & Turno Actual */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <p className="font-black text-stone-900 flex items-center gap-1 text-xs">
                              <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {formatCurrency(b.cashInDrawer)}
                            </p>
                            <p className="text-[11px] text-stone-600 font-semibold truncate max-w-[140px]">
                              {b.currentShift.cashier}
                            </p>
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                              {b.currentShift.name.split("(")[0]}
                            </span>
                          </div>
                        </td>

                        {/* 8. Acciones Rápidas */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSimulate(b.id)}
                              className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold transition-all active:scale-95 shadow-sm"
                              title="Simular 1 venta rápida en esta tienda"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <button
                              onClick={() => advanceShift(b.id)}
                              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors"
                              title="Avanzar / Corte de turno"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => switchBranch(b.id)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 ${
                                isSelected
                                  ? "bg-stone-900 text-white shadow-md"
                                  : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-200"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Activa</span>
                                </>
                              ) : (
                                <>
                                  <span>Seleccionar</span>
                                  <ChevronRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
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
                      3 Sucursales Activas
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
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="text-emerald-400 text-xs">
                          {consolidatedOverview.percentGoal}% Alcanzado
                        </span>
                        <div className="w-28 bg-stone-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-400 h-full rounded-full"
                            style={{ width: `${consolidatedOverview.percentGoal}%` }}
                          />
                        </div>
                      </div>
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

      {/* TAB 2: Shift Management & Arqueo Comparison */}
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
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                          {b.currentShift.name}
                        </span>
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
                        <button
                          onClick={() => advanceShift(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] transition-colors"
                        >
                          Corte / Siguiente Turno
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Live Sales Simulation Feed */}
      {activeTab === "feed" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-stone-900">
                Historial de Ventas Simuladas en Tiempo Real
              </h3>
              <p className="text-xs text-stone-500">
                Tickets emitidos recientemente a través del simulador de ventas multi-sucursal
              </p>
            </div>

            <button
              onClick={() => handleSimulate()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Emitir Ticket Ahora</span>
            </button>
          </div>

          {recentSimulatedSales.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto opacity-40" />
              <p className="font-semibold text-xs">No hay ventas simuladas recientes.</p>
              <p className="text-[11px]">Presiona &quot;Simular 1 Venta&quot; para comenzar a generar tickets.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentSimulatedSales.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-stone-50/60 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{sale.branchName}</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-[11px] text-stone-500">{sale.cashier}</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-[10px] text-stone-400 font-mono">{sale.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">{sale.itemsSummary}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-stone-900">{formatCurrency(sale.total)}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      sale.paymentMethod === "efectivo"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : sale.paymentMethod === "tarjeta"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
