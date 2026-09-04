"use client";

import React, { useState, useMemo } from "react";
import { 
  Zap, 
  Play, 
  Pause, 
  RefreshCw, 
  Store, 
  Croissant, 
  Receipt, 
  Clock, 
  ArrowUpRight, 
  TrendingUp, 
  CheckCircle2, 
  ShoppingBag, 
  Wallet, 
  CreditCard, 
  Building2, 
  Activity, 
  Flame, 
  Sparkles,
  Filter,
  Plus
} from "lucide-react";
import { Branch } from "@/types";
import { SimulatedSale } from "@/context/BranchContext";
import { formatCurrency } from "@/lib/utils";

interface RealTimeSalesMonitorProps {
  branches: Branch[];
  currentBranch: Branch | null;
  isAllBranches: boolean;
  onSwitchBranch: (branchId: string | "all") => void;
  recentSales: SimulatedSale[];
  onSimulateSale: (branchId?: string) => void;
  onSimulateBulk: (branchId?: string, count?: number) => void;
  isLiveSimulating: boolean;
  onToggleLive: () => void;
  lastSimulatedSale: SimulatedSale | null;
  onOpenCreateBranch?: () => void;
}

export default function RealTimeSalesMonitor({
  branches,
  currentBranch,
  isAllBranches,
  onSwitchBranch,
  recentSales,
  onSimulateSale,
  onSimulateBulk,
  isLiveSimulating,
  onToggleLive,
  lastSimulatedSale,
  onOpenCreateBranch,
}: RealTimeSalesMonitorProps) {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Filter recent sales
  const filteredSales = useMemo(() => {
    return recentSales.filter((sale) => {
      const matchBranch = selectedBranchFilter === "all" || sale.branchId === selectedBranchFilter;
      const matchPayment = paymentFilter === "all" || sale.paymentMethod === paymentFilter;
      return matchBranch && matchPayment;
    });
  }, [recentSales, selectedBranchFilter, paymentFilter]);

  // Network sales statistics
  const stats = useMemo(() => {
    const totalTodaySales = branches.reduce((sum, b) => sum + b.todaySales, 0);
    const totalTodayTickets = branches.reduce((sum, b) => sum + b.todayTickets, 0);
    const totalDailyGoal = branches.reduce((sum, b) => sum + b.dailyGoal, 0);
    const percentGoal = totalDailyGoal > 0 ? Math.min(100, Math.round((totalTodaySales / totalDailyGoal) * 100)) : 0;
    const totalPieces = Math.round(totalTodaySales / 16.5);
    const avgTicket = totalTodayTickets > 0 ? Math.round(totalTodaySales / totalTodayTickets) : 0;

    // Estimate operating hours passed today (e.g. from 06:00 AM ~ 8 hours elapsed)
    const hoursElapsed = 7.5;
    const salesPerHour = Math.round(totalTodaySales / hoursElapsed);
    const piecesPerHour = Math.round(totalPieces / hoursElapsed);

    return {
      totalTodaySales,
      totalTodayTickets,
      totalDailyGoal,
      percentGoal,
      totalPieces,
      avgTicket,
      salesPerHour,
      piecesPerHour,
    };
  }, [branches]);

  return (
    <div className="space-y-6">
      {/* Live Activity & Simulation Command Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-3xl p-5 border border-stone-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wider uppercase text-emerald-400">
                Monitor en Tiempo Real Conectado
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isLiveSimulating ? "Transmisión Activa" : "En Espera"}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Ritmo de la red: <strong>{formatCurrency(stats.salesPerHour)}/hora</strong> • ~{stats.piecesPerHour} piezas/hora
            </p>
          </div>
        </div>

        {/* Action Buttons for Real-Time Testing & Monitoring */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenCreateBranch && (
            <button
              onClick={onOpenCreateBranch}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              title="Registrar nueva sucursal y asignar encargado"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Nueva Sucursal</span>
            </button>
          )}

          <button
            onClick={() => onSimulateSale()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            title="Generar 1 ticket inmediato en la red"
          >
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>+1 Venta Rápida</span>
          </button>

          <button
            onClick={() => onSimulateBulk(undefined, 5)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-stone-200 font-bold text-xs border border-white/10 active:scale-95 transition-all"
            title="Simular 5 ventas consecutivas"
          >
            <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
            <span>Ráfaga (5 Ventas)</span>
          </button>

          <button
            onClick={onToggleLive}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              isLiveSimulating
                ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30"
                : "bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300"
            }`}
          >
            {isLiveSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Auto</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Activar Auto (8s)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Notification Banner */}
      {lastSimulatedSale && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div>
              <p className="font-black text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                ¡Venta en Vivo registrada en {lastSimulatedSale.branchName}!
              </p>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {lastSimulatedSale.itemsSummary} • Cajera: <strong>{lastSimulatedSale.cashier}</strong> • {lastSimulatedSale.timestamp}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 uppercase border border-stone-200">
              {lastSimulatedSale.paymentMethod}
            </span>
            <span className="text-base font-black text-emerald-700">
              +{formatCurrency(lastSimulatedSale.total)}
            </span>
          </div>
        </div>
      )}

      {/* Real-time Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {branches.map((b) => {
          const isSelected = !isAllBranches && currentBranch?.id === b.id;
          const pieces = Math.round(b.todaySales / 16.5);
          const percentGoal = Math.min(100, Math.round((b.todaySales / (b.dailyGoal || 1)) * 100));
          const avgTicket = b.todayTickets > 0 ? Math.round(b.todaySales / b.todayTickets) : 0;
          const salesRate = Math.round(b.todaySales / 7.5);

          // Badge colors according to store
          const theme = 
            b.id === "branch-matriz" ? { border: "border-orange-200", bg: "bg-orange-50/40", text: "text-orange-700", ring: "ring-orange-500" } :
            b.id === "branch-benito" ? { border: "border-rose-200", bg: "bg-rose-50/40", text: "text-rose-700", ring: "ring-rose-500" } :
            { border: "border-amber-200", bg: "bg-amber-50/40", text: "text-amber-700", ring: "ring-amber-500" };

          return (
            <div
              key={b.id}
              className={`bg-white rounded-3xl border ${theme.border} p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected ? "ring-2 " + theme.ring : ""
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ${
                      b.id === "branch-matriz" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                      b.id === "branch-benito" ? "bg-gradient-to-br from-rose-500 to-rose-600" :
                      "bg-gradient-to-br from-amber-500 to-amber-600"
                    }`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-stone-900 text-sm">{b.shortName}</h4>
                        <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                          {b.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate max-w-[170px]">{b.manager}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Turno
                  </span>
                </div>

                {/* Primary Real-Time Stat */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-stone-500">Ventas en Vivo</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      ~{formatCurrency(salesRate)}/hr
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                    {formatCurrency(b.todaySales)}
                  </p>
                </div>

                {/* Goal Progress Bar */}
                <div className="space-y-1.5 mb-4 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-semibold">Meta Diaria</span>
                    <span className="font-black text-stone-900">
                      {percentGoal}% <span className="text-stone-400 font-normal">({formatCurrency(b.dailyGoal)})</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        percentGoal >= 90 ? "bg-emerald-500" :
                        percentGoal >= 70 ? "bg-amber-500" :
                        "bg-orange-500"
                      }`}
                      style={{ width: `${percentGoal}%` }}
                    />
                  </div>
                </div>

                {/* Secondary Counters (Pieces, Tickets, Cash in Drawer) */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                    <p className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-center gap-1">
                      <Croissant className="w-3 h-3" /> Piezas
                    </p>
                    <p className="font-black text-stone-900 text-sm mt-0.5">
                      {pieces.toLocaleString("es-MX")}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60">
                    <p className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
                      <Receipt className="w-3 h-3" /> Tickets
                    </p>
                    <p className="font-black text-stone-900 text-sm mt-0.5">
                      {b.todayTickets}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-1">
                      <Wallet className="w-3 h-3" /> Gaveta
                    </p>
                    <p className="font-black text-emerald-800 text-xs mt-0.5 truncate">
                      {formatCurrency(b.cashInDrawer)}
                    </p>
                  </div>
                </div>

                {/* Shift Details */}
                <div className="text-[11px] text-stone-500 space-y-1 mb-4 border-t border-stone-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Cajera en turno:</span>
                    <span className="font-bold text-stone-800">{b.currentShift.cashier}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">Turno:</span>
                    <span className="font-semibold text-stone-700">{b.currentShift.name.split("(")[0]}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for this Branch */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => onSimulateSale(b.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-black text-xs shadow-sm active:scale-95 transition-all"
                  title={`Registrar 1 venta simulada en ${b.name}`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                  <span>+1 Venta</span>
                </button>

                <button
                  onClick={() => onSwitchBranch(b.id)}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
                  }`}
                  title={isSelected ? "Sucursal activa" : "Seleccionar para operar"}
                >
                  {isSelected ? "Activa" : "Filtrar"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Add new branch card trigger */}
        {onOpenCreateBranch && (
          <button
            onClick={onOpenCreateBranch}
            className="border-2 border-dashed border-stone-200 hover:border-orange-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center group transition-all bg-stone-50/40 hover:bg-orange-50/20 min-h-[300px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-orange-300 group-hover:bg-orange-500 group-hover:text-white text-stone-500 flex items-center justify-center transition-all shadow-sm mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-black text-stone-800 group-hover:text-orange-600 text-sm">
              + Registrar Nueva Sucursal
            </h4>
            <p className="text-xs text-stone-500 max-w-[200px] mt-1">
              Expande la red de Panaderías Brito y asigna a su encargado operativo
            </p>
          </button>
        )}
      </div>

      {/* Live Sales Feed Section */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg overflow-hidden">
        {/* Feed Header with filters */}
        <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  Feed de Tickets Emitidos en Tiempo Real
                </h3>
                <p className="text-xs text-stone-500">
                  Monitoreo secuencial de transacciones que entran por sucursal
                </p>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Branch */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-400 font-bold px-1 text-[11px]">Tienda:</span>
              <button
                onClick={() => setSelectedBranchFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedBranchFilter === "all"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todas
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchFilter(b.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedBranchFilter === b.id
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {b.shortName}
                </button>
              ))}
            </div>

            {/* Filter by Payment Method */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-400 font-bold px-1 text-[11px]">Pago:</span>
              <button
                onClick={() => setPaymentFilter("all")}
                className={`px-2 py-1 rounded-lg font-bold ${
                  paymentFilter === "all" ? "bg-orange-500 text-white" : "text-stone-600"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPaymentFilter("efectivo")}
                className={`px-2 py-1 rounded-lg font-bold ${
                  paymentFilter === "efectivo" ? "bg-emerald-600 text-white" : "text-stone-600"
                }`}
              >
                Efectivo
              </button>
              <button
                onClick={() => setPaymentFilter("tarjeta")}
                className={`px-2 py-1 rounded-lg font-bold ${
                  paymentFilter === "tarjeta" ? "bg-blue-600 text-white" : "text-stone-600"
                }`}
              >
                Tarjeta
              </button>
              <button
                onClick={() => setPaymentFilter("transferencia")}
                className={`px-2 py-1 rounded-lg font-bold ${
                  paymentFilter === "transferencia" ? "bg-purple-600 text-white" : "text-stone-600"
                }`}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>

        {/* Tickets Feed List */}
        <div className="p-4 sm:p-6">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <Receipt className="w-12 h-12 mx-auto opacity-30 text-stone-400" />
              <p className="font-bold text-sm text-stone-600">No hay ventas registradas con este filtro</p>
              <p className="text-xs text-stone-400">
                Presiona <strong>&quot;+1 Venta Rápida&quot;</strong> para generar movimientos en vivo.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredSales.map((sale) => {
                const isMatriz = sale.branchId.includes("matriz");
                const isBenito = sale.branchId.includes("benito");
                const branchColor = isMatriz 
                  ? "bg-orange-100 text-orange-800 border-orange-200" 
                  : isBenito 
                  ? "bg-rose-100 text-rose-800 border-rose-200" 
                  : "bg-amber-100 text-amber-800 border-amber-200";

                return (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all animate-in fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-black text-stone-800 shadow-sm shrink-0">
                        <ShoppingBag className="w-5 h-5 text-orange-600" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${branchColor}`}>
                            {sale.branchName}
                          </span>
                          <span className="text-xs font-bold text-stone-800">
                            Cajera: {sale.cashier}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {sale.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 font-medium">
                          {sale.itemsSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto shrink-0">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                        sale.paymentMethod === "efectivo"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : sale.paymentMethod === "tarjeta"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {sale.paymentMethod}
                      </span>

                      <span className="text-base font-black text-stone-900">
                        {formatCurrency(sale.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
