"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  DollarSign, 
  TrendingUp, 
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
  Clock,
  HelpCircle,
  Eye,
  Store,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  Percent,
  Phone,
  BarChart3
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { 
  calculateFinancialSummary, 
  FinancialPeriod, 
  FullFinancialSummary,
  exportFinancialSummaryToCSV
} from "@/lib/finanzas";
import FinancialReportModal from "@/components/finanzas/FinancialReportModal";
import OperationsIncomeChart from "@/components/finanzas/OperationsIncomeChart";

type FinanzasTab = "pl" | "tesoreria";

export default function FinanzasPage() {
  const { branches, currentBranch, isAllBranches, switchBranch } = useBranch();

  // Selected filters & state
  const [activeTab, setActiveTab] = useState<FinanzasTab>("pl");
  const [period, setPeriod] = useState<FinancialPeriod>("mes");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isAllBranches ? "todas" : (currentBranch?.id || "todas")
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [refreshNotification, setRefreshNotification] = useState(false);
  const [plViewMode, setPlViewMode] = useState<"currency" | "percent">("currency");

  // Force re-calculation trigger
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Calculate dynamic financial data
  const summary: FullFinancialSummary = useMemo(() => {
    return calculateFinancialSummary({
      period,
      branchId: selectedBranchId,
      branches,
    });
  }, [period, selectedBranchId, branches, refreshKey]);

  const { pl, treasury, kpis } = summary;

  // Handle manual data refresh
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setRefreshNotification(true);
    setTimeout(() => setRefreshNotification(false), 2000);
  };

  return (
    <div className="w-full space-y-6 pb-14">
      {/* ─── Top Header & Controles Globales ────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-300">
                ERP Finanzas & Control
              </span>
              <span className="text-xs text-stone-500 font-bold">• Don Toño Brito</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 flex items-center gap-1 border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tiempo Real
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Resumen Financiero & Balance</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl font-medium">
              Estado de resultados consolidado, tesorería disponible en caja y bancos, rentabilidad real y análisis operativo de panadería.
            </p>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Exportar Excel / CSV */}
            <button
              onClick={() => exportFinancialSummaryToCSV(summary)}
              className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 text-stone-800 font-extrabold px-3.5 py-2.5 rounded-2xl text-xs whitespace-nowrap transition-all border border-stone-200 active:scale-95"
              title="Descargar reporte en Excel o CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel/CSV</span>
            </button>

            {/* Exportar PDF / Imprimir */}
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 bg-brito-orange-600 hover:bg-brito-orange-700 text-white font-black px-4 py-2.5 rounded-2xl shadow-md text-xs whitespace-nowrap transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" /> Exportar Balance
            </button>

            {/* Refrescar Datos */}
            <button
              onClick={handleRefresh}
              className={`p-2.5 rounded-2xl border text-stone-600 hover:text-stone-900 transition-all ${
                refreshNotification ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-stone-50 hover:bg-stone-100 border-stone-200"
              }`}
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshNotification ? "animate-spin text-amber-800" : ""}`} />
            </button>

            {/* Enlaces de Auditoría */}
            <div className="hidden xl:flex items-center gap-2 border-l border-stone-200 pl-2">
              <Link
                href="/caja"
                className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-bold px-3 py-2.5 rounded-2xl text-xs transition-all shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" /> Cortes
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Barra de Filtros: Sucursales y Periodos (Espaciosa y Sin Amontonamiento) ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
        {/* Fila 1: Filtro de Sucursal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider block">
                Sucursal
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                Punto de venta a consultar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedBranchId("todas")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                selectedBranchId === "todas"
                  ? "bg-stone-900 text-white shadow-md shadow-stone-900/20 ring-2 ring-stone-900/10 scale-[1.02]"
                  : "bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-950 border border-stone-200/90 shadow-2xs hover:shadow-xs"
              }`}
            >
              <span>🏪 Todas (Consolidado)</span>
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-4 sm:px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                  selectedBranchId === b.id
                    ? "bg-stone-900 text-white shadow-md shadow-stone-900/20 ring-2 ring-stone-900/10 scale-[1.02]"
                    : "bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-950 border border-stone-200/90 shadow-2xs hover:shadow-xs"
                }`}
              >
                {b.name || b.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Separador fino */}
        <div className="border-t border-stone-100" />

        {/* Fila 2: Filtro de Periodo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 uppercase tracking-wider block">
                Periodo de Tiempo
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                Rango temporal del balance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100/90 p-1.5 sm:p-2 rounded-2xl border border-stone-200/80 flex-wrap sm:flex-nowrap shadow-inner">
            <button
              onClick={() => setPeriod("hoy")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "hoy"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriod("semana")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "semana"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriod("mes")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "mes"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setPeriod("mes_anterior")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "mes_anterior"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => setPeriod("trimestre")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "trimestre"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriod("anio")}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                period === "anio"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-950 hover:bg-white/80"
              }`}
            >
              Año 2026
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navegador Modular por Pestañas (Segmented Tabs) ────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab("pl")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "pl"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <PieChart className="w-4 h-4 text-emerald-600" />
          <span>Ingresos & Canales</span>
        </button>

        <button
          onClick={() => setActiveTab("tesoreria")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "tesoreria"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Tesorería & Cuentas</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB: INGRESOS DE OPERACIÓN POR CANALES                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pl" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-stone-900">
                  Desglose de Ingresos de Operación
                </h3>
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200">
                  {summary.periodLabel}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Distribución detallada por canales de venta (mostrador, pedidos y otros ingresos).
              </p>
            </div>

            {/* Alternador de vista: $ Pesos vs % Porcentaje */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
              <button
                onClick={() => setPlViewMode("currency")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  plViewMode === "currency"
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                $ En Pesos
              </button>
              <button
                onClick={() => setPlViewMode("percent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  plViewMode === "percent"
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                % En Porcentaje
              </button>
            </div>
          </div>

          {/* Gráfica Interactiva y Llamativa de Operaciones */}
          <OperationsIncomeChart summary={summary} plViewMode={plViewMode} />

          {/* Desglose de Canales de Venta */}
          <div className="space-y-4">
            {/* Ingresos Brutos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    +
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-emerald-950 uppercase tracking-wide">Ingresos Brutos de Operación</h4>
                    <p className="text-[11px] text-emerald-800">Total de ventas en mostrador, pedidos de pasteles y otros ingresos</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-900">
                    {plViewMode === "currency" ? formatCurrency(pl.grossSales) : "100.0%"}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">100% Base de Venta</span>
                </div>
              </div>

              {/* Barra de progreso de distribución */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Mostrador (Efectivo & Tarjeta)</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.counterSales) : "72.0%"}
                  </span>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "72%" }} />
                  </div>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Pasteles & Encargos</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.ordersSales) : "8.0%"}
                  </span>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "8%" }} />
                  </div>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Otros (Costales, Reciclaje)</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.otherIncomes) : "2.0%"}
                  </span>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "2%" }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TESORERÍA & CUENTAS                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tesoreria" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner de Liquidez & Runway */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 p-6 rounded-3xl border border-stone-800 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-xl text-white transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Tesorería & Disponibilidad</span>
                <h3 className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(treasury.totalLiquidFunds)}
                </h3>
                <p className="text-xs text-stone-400 max-w-xl">
                  Fondos líquidos reales consolidados en gavetas de mostrador, cuentas bancarias activas y caja chica de emergencias.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] text-stone-300 font-bold block uppercase">Reserva Operativa</span>
                  <span className="text-xl font-black text-white">{kpis.coverageDays} días</span>
                  <span className="text-[10px] text-emerald-300 font-medium block">Nóminas y harina garantizadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose Detallado de las 4 Cuentas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuenta 1: Cajas Mostrador */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-stone-900">Efectivo en Cajas Mostrador</h4>
                    <span className="text-xs text-stone-500 font-medium">Gavetas de turnos activos</span>
                  </div>
                </div>
                <span className="text-xl font-black text-stone-900">{formatCurrency(treasury.cashInDrawers)}</span>
              </div>
              <p className="text-xs text-stone-600">
                Efectivo físico disponible al momento en las gavetas de cobro de Matriz y sucursales. Sujeto a arqueo en cada relevo de turno.
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Estatus de turno: <strong className="text-emerald-700">En operación</strong></span>
                <Link href="/caja" className="text-brito-orange-700 font-bold hover:underline">
                  Ir al arqueo de caja &rarr;
                </Link>
              </div>
            </div>

            {/* Cuenta 2: BBVA Bancomer */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-stone-900">BBVA Bancomer (Don Toño)</h4>
                    <span className="text-xs text-stone-500 font-medium">Cuenta fiscal / SPEI mayoristas</span>
                  </div>
                </div>
                <span className="text-xl font-black text-blue-900">{formatCurrency(treasury.bancoBBVA)}</span>
              </div>
              <p className="text-xs text-stone-600">
                Transferencias interbancarias directas de clientes mayoristas, pedidos de eventos y pago a proveedores de harina.
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Titular: <strong>Don Antonio Brito</strong></span>
                <span className="text-emerald-700 font-bold">Transferencias al día</span>
              </div>
            </div>

            {/* Cuenta 3: Santander Negocio */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-stone-900">Santander Negocio (Terminales)</h4>
                    <span className="text-xs text-stone-500 font-medium">Cobros con tarjeta TPV</span>
                  </div>
                </div>
                <span className="text-xl font-black text-rose-900">{formatCurrency(treasury.bancoSantander)}</span>
              </div>
              <p className="text-xs text-stone-600">
                Fondos liquidados de ventas con tarjeta de crédito/débito. Ya incluye el descuento de comisión bancaria estimada (3%).
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Comisión bancaria est.: <strong>-{formatCurrency(treasury.cardCommissionEstimated)}</strong></span>
                <span className="text-stone-400">Liquidación en 24 hrs</span>
              </div>
            </div>

            {/* Cuenta 4: Caja Chica */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-stone-900">Caja Chica de Emergencias</h4>
                    <span className="text-xs text-stone-500 font-medium">Fondo fijo para compras rápidas</span>
                  </div>
                </div>
                <span className="text-xl font-black text-amber-900">{formatCurrency(treasury.pettyCash)}</span>
              </div>
              <p className="text-xs text-stone-600">
                Fondo reservado para comprar levadura faltante, garrafones de agua, refacciones menores de hornos o propinas de reparto.
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>Custodio: <strong>Encargada de Turno</strong></span>
                <span className="text-amber-800 font-bold">Fondo disponible</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─── Modal de Reporte Financiero Imprimible ────────────────────────────── */}
      <FinancialReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        summary={summary}
      />
    </div>
  );
}
