"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Building2, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Flame,
  Wheat,
  Clock,
  HelpCircle,
  Eye,
  Store,
  ArrowRight,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { 
  calculateFinancialSummary, 
  FinancialPeriod, 
  FullFinancialSummary 
} from "@/lib/finanzas";
import FinancialReportModal from "@/components/finanzas/FinancialReportModal";

export default function FinanzasPage() {
  const { branches, currentBranch, isAllBranches, switchBranch } = useBranch();

  // Selected filters
  const [period, setPeriod] = useState<FinancialPeriod>("mes");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isAllBranches ? "todas" : (currentBranch?.id || "todas")
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Calculate dynamic financial data
  const summary: FullFinancialSummary = useMemo(() => {
    return calculateFinancialSummary({
      period,
      branchId: selectedBranchId,
      branches,
    });
  }, [period, selectedBranchId, branches]);

  const { pl, treasury, receivables, kpis, cashFlow } = summary;

  // Max value for cash flow chart scaling
  const maxFlowVal = useMemo(() => {
    return Math.max(...cashFlow.map((d) => Math.max(d.income, d.expenses)), 1000);
  }, [cashFlow]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header & Controles Globales */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-brito-orange-100 text-brito-orange-800 border border-brito-orange-200">
              ERP Finanzas & Control
            </span>
            <span className="text-xs text-stone-400 font-semibold">• Don Toño Brito</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Finanzas & Balance General
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl">
            Estado de resultados en tiempo real, tesorería disponible, margen de utilidad y control de cartera mayorista.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 bg-brito-orange-600 hover:bg-brito-orange-700 text-white font-black px-4 py-2.5 rounded-2xl shadow-md text-xs transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Exportar Balance
          </button>
          <Link
            href="/gastos"
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold px-4 py-2.5 rounded-2xl text-xs transition-all border border-stone-200"
          >
            <TrendingDown className="w-4 h-4 text-rose-600" /> Registro de Gastos
          </Link>
          <Link
            href="/caja"
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-extrabold px-4 py-2.5 rounded-2xl shadow-sm text-xs transition-all"
          >
            <Wallet className="w-4 h-4 text-brito-orange-400" /> Cortes de Caja
          </Link>
        </div>
      </div>

      {/* Barra de Filtros: Sucursales y Periodos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50/80 p-3 rounded-2xl border border-stone-200">
        {/* Selector de Sucursal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-500 whitespace-nowrap pl-1">
            Sucursal:
          </span>
          <button
            onClick={() => setSelectedBranchId("todas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              selectedBranchId === "todas"
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200"
            }`}
          >
            🏪 Todas (Consolidado)
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                selectedBranchId === b.id
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200"
              }`}
            >
              {b.shortName}
            </button>
          ))}
        </div>

        {/* Selector de Periodo */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setPeriod("hoy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              period === "hoy"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod("semana")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              period === "semana"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod("mes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              period === "mes"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setPeriod("mes_anterior")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              period === "mes_anterior"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Mes Anterior
          </button>
        </div>
      </div>

      {/* Fila 1: Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Ventas Netas Totales</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
            {formatCurrency(pl.grossSales)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
            <span className="text-stone-400 font-medium">
              {kpis.totalTicketsCount} tickets emitidos
            </span>
          </div>
        </div>

        {/* Costo de Ventas (COGS) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Costo Producción (COGS)</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
            {formatCurrency(pl.totalCogs)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-bold">
              {Math.round((pl.totalCogs / pl.grossSales) * 100)}% de venta
            </span>
            <span className="text-stone-400 font-medium">
              Harinas, gas y empaque
            </span>
          </div>
        </div>

        {/* Gastos Operativos (OPEX) */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gastos Operativos (OPEX)</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
            {formatCurrency(pl.totalOpex)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-rose-700 font-bold">
              {Math.round((pl.totalOpex / pl.grossSales) * 100)}% de venta
            </span>
            <span className="text-stone-400 font-medium">
              Nómina, luz, rentas
            </span>
          </div>
        </div>

        {/* Ganancia Neta Real */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-5 rounded-3xl border border-stone-800 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brito-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Utilidad Neta Real</span>
            <div className="p-2 bg-brito-orange-600 text-white rounded-xl shadow-md">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-brito-orange-400 tracking-tight">
            {formatCurrency(pl.netProfit)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-300 font-medium">
              Margen Libre:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
              {pl.netMarginPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Fila 2: Posición de Tesorería & Disponibilidad de Liquidez */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">Posición de Tesorería & Cuentas Disponibles</h3>
              <p className="text-xs text-stone-500">¿Dónde está exactamente el dinero de Panaderías Brito hoy?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-emerald-800">Liquidez Total Inmediata:</span>
            <span className="text-sm font-black text-emerald-700">{formatCurrency(treasury.totalLiquidFunds)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Cajas Mostrador */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
            <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
              <span>Efectivo en Cajas Mostrador</span>
              <Store className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <p className="text-xl font-black text-stone-900">{formatCurrency(treasury.cashInDrawers)}</p>
            <p className="text-[11px] text-stone-500 font-medium">Turnos activos en mostrador</p>
          </div>

          {/* Cuenta BBVA */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
            <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
              <span>BBVA Bancomer (Don Toño)</span>
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-black text-blue-900">{formatCurrency(treasury.bancoBBVA)}</p>
            <p className="text-[11px] text-stone-500 font-medium">Transferencias SPEI de clientes</p>
          </div>

          {/* Santander / Terminales */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
            <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
              <span>Santander Negocio (Tarjetas)</span>
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-xl font-black text-rose-900">{formatCurrency(treasury.bancoSantander)}</p>
            <p className="text-[11px] text-stone-500 font-medium">Comisión bancaria est. 3% ya deducida</p>
          </div>

          {/* Caja Chica */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
            <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
              <span>Caja Chica Emergencias</span>
              <Coins className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-black text-amber-900">{formatCurrency(treasury.pettyCash)}</p>
            <p className="text-[11px] text-stone-500 font-medium">Fondo para compras inmediatas</p>
          </div>
        </div>
      </div>

      {/* Fila 3: Estado de Resultados (P&L) en Cascada */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-black text-lg text-stone-900">
              Estado de Resultados (P&L - Pérdidas y Ganancias)
            </h3>
            <p className="text-xs text-stone-500">
              Desglose contable paso a paso desde el primer bolillo vendido hasta la utilidad neta libre.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-xl border border-stone-200">
            Periodo: {summary.periodLabel}
          </span>
        </div>

        {/* Cascada de Resultados */}
        <div className="space-y-4">
          {/* Nivel 1: Ingresos Brutos */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  +
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-950">1. INGRESOS BRUTOS DE OPERACIÓN</h4>
                  <p className="text-[11px] text-emerald-800">Total de ventas en mostrador, mayoristas y encargos</p>
                </div>
              </div>
              <span className="text-lg font-black text-emerald-900">{formatCurrency(pl.grossSales)}</span>
            </div>
            {/* Barras de distribución de ingresos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-stone-500 block font-semibold">Mostrador (Efectivo/Tarjeta)</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.counterSales)} (72%)</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-stone-500 block font-semibold">Tienditas & Mayoristas</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.wholesaleSales)} (18%)</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-stone-500 block font-semibold">Pasteles & Otros</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.ordersSales + pl.otherIncomes)} (10%)</span>
              </div>
            </div>
          </div>

          {/* Nivel 2: Costo de Ventas (COGS) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                  -
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-950">2. COSTO DIRECTO DE PRODUCCIÓN (COGS)</h4>
                  <p className="text-[11px] text-amber-800">Materia prima, gas LP de los hornos y empaques directos</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-900">{formatCurrency(pl.totalCogs)}</span>
                <span className="text-[10px] text-amber-700 font-bold block">
                  {Math.round((pl.totalCogs / pl.grossSales) * 100)}% sobre ventas
                </span>
              </div>
            </div>
            {/* Desglose COGS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-stone-500 block font-semibold">Harinas, Mantecas, Huevos</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.cogsIngredients)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-stone-500 block font-semibold">Gas LP para Hornos</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.cogsGasLP)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-stone-500 block font-semibold">Bolsas Kraft & Domos</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.cogsPackaging)}</span>
              </div>
            </div>
          </div>

          {/* Subtotal: Margen Bruto */}
          <div className="p-3.5 rounded-2xl bg-amber-100/90 border border-amber-300 flex justify-between items-center font-black text-amber-950">
            <span className="text-xs uppercase tracking-wide">(=) MARGEN BRUTO RESULTANTE</span>
            <span className="text-base text-amber-900">
              {formatCurrency(pl.grossProfit)} ({pl.grossMarginPercent}%)
            </span>
          </div>

          {/* Nivel 3: Gastos Operativos (OPEX) */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                  -
                </div>
                <div>
                  <h4 className="font-black text-sm text-rose-950">3. GASTOS OPERATIVOS (OPEX) & MERMAS</h4>
                  <p className="text-[11px] text-rose-800">Nómina del equipo, servicios fijos, mantenimiento y pan no vendido</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-rose-900">
                  {formatCurrency(pl.totalOpex + pl.wasteLoss)}
                </span>
                <span className="text-[10px] text-rose-700 font-bold block">
                  {Math.round(((pl.totalOpex + pl.wasteLoss) / pl.grossSales) * 100)}% sobre ventas
                </span>
              </div>
            </div>
            {/* Desglose OPEX */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-rose-200/60 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-100">
                <span className="text-stone-500 block font-semibold">Nóminas y Sueldos</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.opexPayroll)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-100">
                <span className="text-stone-500 block font-semibold">Luz, Agua, Internet</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.opexUtilities)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-100">
                <span className="text-stone-500 block font-semibold">Mantenimiento y Gasolina</span>
                <span className="font-extrabold text-stone-900">{formatCurrency(pl.opexMaintenance + pl.opexFuelDelivery)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-100">
                <span className="text-rose-700 block font-semibold">Costo de Mermas</span>
                <span className="font-extrabold text-rose-800">{formatCurrency(pl.wasteLoss)}</span>
              </div>
            </div>
          </div>

          {/* Subtotal: Utilidad de Operación */}
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex justify-between items-center font-black text-blue-950">
            <span className="text-xs uppercase tracking-wide">(=) UTILIDAD DE OPERACIÓN (EBITDA)</span>
            <span className="text-base text-blue-900">
              {formatCurrency(pl.operatingProfit)} ({pl.operatingMarginPercent}%)
            </span>
          </div>

          {/* Nivel 4: Retiros Don Toño */}
          <div className="px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 flex justify-between items-center text-xs font-bold text-stone-700">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-stone-500" /> (-) Retiros Personales de Don Toño / Socios
            </span>
            <span className="text-stone-900 font-extrabold">{formatCurrency(pl.ownerDraws)}</span>
          </div>

          {/* Nivel 5: Utilidad Neta Final */}
          <div className="p-5 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-brito-orange-400 block">
                (=) UTILIDAD NETA FINAL DISPONIBLE
              </span>
              <p className="text-xs text-stone-400 mt-0.5">
                Ganancia limpia del negocio para reinversión y ahorro.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-brito-orange-400 block">
                {formatCurrency(pl.netProfit)}
              </span>
              <span className="text-xs text-stone-300 font-semibold">
                Margen Neto: <strong className="text-emerald-400">{pl.netMarginPercent}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 4: Radar de Crédito a Mayoristas & KPIs Clave de Panadería */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar de Cuentas por Cobrar (Tienditas) */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">Cartera de Crédito a Mayoristas</h3>
                <p className="text-xs text-stone-500">Tienditas y clientes con pan entregado a crédito</p>
              </div>
            </div>
            <Link
              href="/clientes"
              className="text-xs font-bold text-brito-orange-700 hover:text-brito-orange-800 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {receivables.topDebtors.map((item, idx) => (
              <div 
                key={item.customer.id || idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/70 hover:border-stone-300 transition-all text-xs"
              >
                <div>
                  <p className="font-black text-stone-900">{item.customer.name}</p>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Límite crédito: {formatCurrency(item.customer.creditLimit)} • {item.customer.phone || "Sin tel"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-rose-700 text-sm">
                    {formatCurrency(item.pendingAmount)}
                  </p>
                  {item.isOverLimit ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      Límite excedido
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-semibold">Al corriente</span>
                  )}
                </div>
              </div>
            ))}

            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 flex justify-between items-center text-xs">
              <span className="font-bold text-rose-900">Total fiado en la calle:</span>
              <span className="font-black text-rose-700 text-sm">{formatCurrency(receivables.totalReceivables)}</span>
            </div>
          </div>
        </div>

        {/* Indicadores de Eficiencia de Panadería */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <div className="p-2 bg-amber-100 text-brito-orange-700 rounded-xl">
              <Wheat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">Eficiencia Operativa & Panadería</h3>
              <p className="text-xs text-stone-500">Métricas clave para medir la productividad del horno</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs font-bold text-stone-500">Ticket Promedio</span>
              <p className="text-xl font-black text-stone-900">{formatCurrency(kpis.ticketAverage)}</p>
              <p className="text-[11px] text-stone-400">Por compra en mostrador</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs font-bold text-stone-500">Punto de Equilibrio</span>
              <p className="text-xl font-black text-brito-orange-700">{formatCurrency(kpis.dailyBreakEven)}</p>
              <p className="text-[11px] text-stone-400">Venta diaria para no perder</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs font-bold text-stone-500">Costo de Mermas</span>
              <p className="text-xl font-black text-rose-700">{formatCurrency(pl.wasteLoss)}</p>
              <p className="text-[11px] text-rose-600 font-semibold">{kpis.wasteCostShare}% de producción</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs font-bold text-stone-500">Día Pico Principal</span>
              <p className="text-sm font-black text-stone-900 mt-1">{kpis.busiestDay}</p>
              <p className="text-[11px] text-emerald-600 font-bold">+40% vs entre semana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 5: Flujo Semanal de Efectivo (Ingresos vs Gastos) */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-black text-base text-stone-900">Flujo Semanal de Efectivo (Ingresos vs Gastos)</h3>
            <p className="text-xs text-stone-500">Comportamiento diario de la entrada y salida de dinero.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-400" />
              <span>Gastos</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4">
          {cashFlow.map((day) => {
            const incomeHeight = Math.min(130, Math.round((day.income / maxFlowVal) * 130));
            const expenseHeight = Math.min(130, Math.round((day.expenses / maxFlowVal) * 130));
            const isSelected = hoveredDay === day.day;

            return (
              <div 
                key={day.day} 
                className="flex flex-col items-center gap-2 cursor-pointer"
                onMouseEnter={() => setHoveredDay(day.day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className={`h-36 flex items-end gap-1.5 w-full justify-center p-2 rounded-2xl border transition-all ${
                  day.isPeak ? "bg-amber-50/60 border-amber-200" : "bg-stone-50 border-stone-100"
                }`}>
                  {/* Barra Ingresos */}
                  <div
                    style={{ height: `${Math.max(incomeHeight, 8)}px` }}
                    className="w-3.5 sm:w-4 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all shadow-sm"
                    title={`Ingreso: ${formatCurrency(day.income)}`}
                  />
                  {/* Barra Gastos */}
                  <div
                    style={{ height: `${Math.max(expenseHeight, 8)}px` }}
                    className="w-3.5 sm:w-4 bg-rose-400 rounded-t-md hover:bg-rose-500 transition-all shadow-sm"
                    title={`Gasto: ${formatCurrency(day.expenses)}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-stone-900">{day.shortDay}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{formatCurrency(day.income)}</p>
                  {day.isPeak && (
                    <span className="text-[9px] font-black text-brito-orange-700 uppercase">Pico</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Reporte Financiero Imprimible */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        summary={summary}
      />
    </div>
  );
}
