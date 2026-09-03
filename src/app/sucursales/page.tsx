"use client";

import { useState } from "react";
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
  CreditCard
} from "lucide-react";
import { useBranch, SimulatedSale } from "@/context/BranchContext";
import { formatCurrency } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"todas" | "turnos" | "feed">("todas");

  const handleSimulate = (branchId?: string) => {
    const sale = simulateSale(branchId);
    setLastSimulatedSale(sale);
    setTimeout(() => setLastSimulatedSale(null), 3500);
  };

  const handleSimulateShift = (branchId?: string) => {
    simulateBulkSales(branchId, 12);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-stone-800">
        <div className="absolute -right-12 -top-12 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5" />
              Red Multi-Sucursales & Turnos
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Control de Sucursales y Ventas en Vivo
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Monitoreo operativo en tiempo real de las 3 tiendas de <strong>Panaderías Brito</strong>: flujo de caja, turnos activos de cajeros, metas y simulador de clientes.
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

      {/* Global Chain Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Venta Consolidada Hoy</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{formatCurrency(consolidatedMetrics.totalSales)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">3 sucursales activas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Tickets Emitidos</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{consolidatedMetrics.totalTickets} clientes</p>
            <p className="text-[11px] text-stone-500 font-semibold mt-0.5">Ticket promedio: {formatCurrency(consolidatedMetrics.totalSales / (consolidatedMetrics.totalTickets || 1))}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Efectivo en Cajas</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{formatCurrency(consolidatedMetrics.totalCashInDrawer)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Incluye fondos de turno</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Meta Diaria Cadena</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{consolidatedMetrics.percentGoal}%</p>
            <div className="w-32 bg-stone-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${consolidatedMetrics.percentGoal}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs / Filter Navigation */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("todas")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "todas"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            🏪 Vista por Sucursal ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab("turnos")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "turnos"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            ⏰ Estado de Turnos & Arqueo
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "feed"
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            ⚡ Ventas Simuladas en Vivo ({recentSimulatedSales.length})
          </button>
        </div>

        <button
          onClick={() => switchBranch("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isAllBranches
              ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20"
              : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
          }`}
        >
          {isAllBranches ? "✓ Consolidado Activo" : "Ver Consolidado"}
        </button>
      </div>

      {/* TAB 1: Branch Cards Grid */}
      {activeTab === "todas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {branches.map((b) => {
            const isSelected = !isAllBranches && currentBranch?.id === b.id;
            const progress = Math.min(100, Math.round((b.todaySales / b.dailyGoal) * 100));

            return (
              <div
                key={b.id}
                className={`bg-white rounded-3xl border transition-all duration-300 p-6 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-xl ${
                  isSelected
                    ? "border-orange-500 ring-2 ring-orange-500/20 shadow-orange-500/10"
                    : "border-stone-200/90"
                }`}
              >
                {/* Branch Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/10 to-rose-500/10 text-orange-600 border border-orange-200/60 flex items-center justify-center text-xl font-bold">
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-stone-900 text-base leading-tight">
                            {b.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 font-bold uppercase">
                          {b.code}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Abierta
                    </span>
                  </div>

                  {/* Address & Manager */}
                  <div className="mt-4 space-y-1 text-xs text-stone-500 bg-stone-50/70 p-3 rounded-2xl border border-stone-100">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{b.address}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{b.phone}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Responsable: <strong className="text-stone-800">{b.manager}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Sales & Daily Goal Progress */}
                <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Ventas de Hoy</p>
                      <p className="text-2xl font-black text-stone-900 leading-tight">
                        {formatCurrency(b.todaySales)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-lg">
                        {progress}% Meta
                      </span>
                      <p className="text-[10px] text-stone-400 mt-0.5">Meta: {formatCurrency(b.dailyGoal)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-rose-600 h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                    <span>{b.todayTickets} tickets cobrados</span>
                    <span>Caja: <strong className="text-stone-800">{formatCurrency(b.cashInDrawer)}</strong></span>
                  </div>
                </div>

                {/* Active Shift Brief */}
                <div className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-600" />
                      {b.currentShift.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      En Curso
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Cajera en turno:</span>
                    <strong className="text-stone-800">{b.currentShift.cashier}</strong>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulate(b.id)}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>+1 Venta</span>
                    </button>

                    <button
                      onClick={() => advanceShift(b.id)}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Cerrar turno actual y abrir siguiente"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Cambiar Turno</span>
                    </button>
                  </div>

                  <button
                    onClick={() => switchBranch(b.id)}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-stone-900 text-white shadow-md"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Sucursal Activa Seleccionada</span>
                      </>
                    ) : (
                      <>
                        <span>Cambiar a esta Sucursal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Shift Management & Arqueo Comparison */}
      {activeTab === "turnos" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-base font-black text-stone-900 mb-4">
              Comparativa de Turnos Activos por Sucursal
            </h3>

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
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-stone-900">
                Historial de Ventas Simuladas en Tiempo Real
              </h3>
              <p className="text-xs text-stone-500">
                Tickets emitidos recientemente a través del simulador de ventas
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
