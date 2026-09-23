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
  Receipt,
  FileSpreadsheet,
  Share2,
  RefreshCw,
  Calculator,
  Target,
  Percent,
  Check,
  Phone,
  BarChart3,
  Sliders,
  Info
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { 
  calculateFinancialSummary, 
  FinancialPeriod, 
  FullFinancialSummary,
  exportFinancialSummaryToCSV,
  generateWhatsAppFinancialSummary
} from "@/lib/finanzas";
import FinancialReportModal from "@/components/finanzas/FinancialReportModal";

type FinanzasTab = "ejecutivo" | "pl" | "tesoreria" | "panaderia" | "simulador";

export default function FinanzasPage() {
  const { branches, currentBranch, isAllBranches, switchBranch } = useBranch();

  // Selected filters & state
  const [activeTab, setActiveTab] = useState<FinanzasTab>("ejecutivo");
  const [period, setPeriod] = useState<FinancialPeriod>("mes");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isAllBranches ? "todas" : (currentBranch?.id || "todas")
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [refreshNotification, setRefreshNotification] = useState(false);
  const [plViewMode, setPlViewMode] = useState<"currency" | "percent">("currency");

  // Simulator controls
  const [simSalesDelta, setSimSalesDelta] = useState<number>(0); // -20% a +40%
  const [simFlourDelta, setSimFlourDelta] = useState<number>(0); // -15% a +30%
  const [simWasteTarget, setSimWasteTarget] = useState<number>(3.0); // 1.5% a 6%
  const [monthlyTargetSales, setMonthlyTargetSales] = useState<number>(385000);

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

  const { pl, treasury, receivables, kpis, cashFlow } = summary;

  // Max value for cash flow chart scaling
  const maxFlowVal = useMemo(() => {
    return Math.max(...cashFlow.map((d) => Math.max(d.income, d.expenses)), 1000);
  }, [cashFlow]);

  // Handle WhatsApp Copy
  const handleWhatsAppShare = () => {
    const text = generateWhatsAppFinancialSummary(summary);
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Handle manual data refresh
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setRefreshNotification(true);
    setTimeout(() => setRefreshNotification(false), 2000);
  };

  // Simulator dynamic projections
  const simProjected = useMemo(() => {
    const baseSales = pl.grossSales;
    const newSales = baseSales * (1 + simSalesDelta / 100);
    const newCogs = (pl.cogsIngredients * (1 + simFlourDelta / 100)) + pl.cogsGasLP + pl.cogsPackaging;
    const newGrossProfit = Math.max(0, newSales - newCogs);
    const newWaste = Math.round(newSales * (simWasteTarget / 100));
    const newOpex = pl.totalOpex;
    const newOperating = Math.max(0, newGrossProfit - newOpex - newWaste);
    const newOwnerDraws = Math.round(newOperating * 0.15);
    const newNetProfit = Math.max(0, newOperating - newOwnerDraws);
    const newNetMargin = newSales > 0 ? Number(((newNetProfit / newSales) * 100).toFixed(1)) : 0;
    const profitDiff = newNetProfit - pl.netProfit;

    return {
      sales: Math.round(newSales),
      cogs: Math.round(newCogs),
      grossProfit: Math.round(newGrossProfit),
      waste: newWaste,
      operating: Math.round(newOperating),
      netProfit: Math.round(newNetProfit),
      netMargin: newNetMargin,
      profitDiff,
    };
  }, [pl, simSalesDelta, simFlourDelta, simWasteTarget]);

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
            {/* Botón WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border ${
                copiedWhatsApp
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              }`}
              title="Copiar resumen para WhatsApp"
            >
              {copiedWhatsApp ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedWhatsApp ? "¡Copiado!" : "WhatsApp"}</span>
            </button>

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
                href="/gastos"
                className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-3 py-2.5 rounded-2xl text-xs transition-all border border-stone-200"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Gastos
              </Link>
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

      {/* ─── Barra de Filtros: Sucursales y Periodos ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-stone-200/90 shadow-xs">
        {/* Selector de Sucursal */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-stone-500 whitespace-nowrap pl-2">
            Sucursal:
          </span>
          <button
            onClick={() => setSelectedBranchId("todas")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              selectedBranchId === "todas"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
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
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              {b.shortName}
            </button>
          ))}
        </div>

        {/* Selector de Periodo Extendido */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200/80 overflow-x-auto">
          <button
            onClick={() => setPeriod("hoy")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "hoy"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod("semana")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "semana"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod("mes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "mes"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setPeriod("mes_anterior")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "mes_anterior"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Mes Anterior
          </button>
          <button
            onClick={() => setPeriod("trimestre")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "trimestre"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Trimestre
          </button>
          <button
            onClick={() => setPeriod("anio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              period === "anio"
                ? "bg-brito-orange-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Año 2026
          </button>
        </div>
      </div>

      {/* ─── Navegador Modular por Pestañas (Segmented Tabs) ────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab("ejecutivo")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "ejecutivo"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <Sparkles className="w-4 h-4 text-brito-orange-600" />
          <span>Balance Ejecutivo</span>
        </button>

        <button
          onClick={() => setActiveTab("pl")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "pl"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <PieChart className="w-4 h-4 text-blue-600" />
          <span>Estado de Resultados (P&L)</span>
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

        <button
          onClick={() => setActiveTab("panaderia")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "panaderia"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <Wheat className="w-4 h-4 text-amber-600" />
          <span>Eficiencia & Panadería</span>
        </button>

        <button
          onClick={() => setActiveTab("simulador")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            activeTab === "simulador"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200/80 ring-2 ring-orange-400/20"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
          }`}
        >
          <Calculator className="w-4 h-4 text-purple-600" />
          <span>Simulador & Metas</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: BALANCE EJECUTIVO                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ejecutivo" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ingresos Totales */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Ventas Netas Totales</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {formatCurrency(pl.grossSales)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                <span className="text-emerald-700 font-extrabold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
                </span>
                <span className="text-stone-400 font-medium">
                  {kpis.totalTicketsCount} tickets emitidos
                </span>
              </div>
            </div>

            {/* 2. Costo de Ventas (COGS) */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Costo Producción (COGS)</span>
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {formatCurrency(pl.totalCogs)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                <span className="text-amber-900 font-extrabold">
                  {Math.round((pl.totalCogs / pl.grossSales) * 100)}% de venta
                </span>
                <span className="text-stone-400 font-medium">
                  Harinas, gas y empaques
                </span>
              </div>
            </div>

            {/* 3. Gastos Operativos (OPEX) */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gastos Operativos (OPEX)</span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                {formatCurrency(pl.totalOpex)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                <span className="text-rose-700 font-extrabold">
                  {Math.round((pl.totalOpex / pl.grossSales) * 100)}% de venta
                </span>
                <span className="text-stone-400 font-medium">
                  Nómina, luz y servicios
                </span>
              </div>
            </div>

            {/* 4. Ganancia Neta Real */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 p-5 rounded-3xl border border-stone-800 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-xl text-white relative overflow-hidden transition-all duration-200">
              <div className="absolute top-0 right-0 w-28 h-28 bg-brito-orange-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Utilidad Neta Real</span>
                <div className="p-2 bg-brito-orange-600 text-white rounded-xl shadow-md">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-brito-orange-400 tracking-tight">
                {formatCurrency(pl.netProfit)}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-stone-800">
                <span className="text-stone-300 font-medium">
                  Margen Libre:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                  {pl.netMarginPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Semáforo de Salud Financiera & Diagnóstico de Don Toño */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl flex items-center justify-center text-white ${
                  kpis.healthStatus === "excelente"
                    ? "bg-emerald-600 shadow-emerald-600/30 shadow-md"
                    : kpis.healthStatus === "saludable"
                    ? "bg-amber-600 shadow-amber-600/30 shadow-md"
                    : "bg-rose-600 shadow-rose-600/30 shadow-md"
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-stone-900">Salud Financiera de la Panadería</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      kpis.healthStatus === "excelente"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : kpis.healthStatus === "saludable"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}>
                      {kpis.healthStatus === "excelente" ? "🟢 Excelente" : kpis.healthStatus === "saludable" ? "🟡 Saludable" : "🔴 Requiere Atención"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Evaluación automática basada en margen bruto, margen neto y liquidez de reserva.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Puntaje General</span>
                  <span className="text-xl font-black text-stone-900">{kpis.healthScore} / 100</span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 flex items-center justify-center font-black text-xs text-stone-900">
                  {kpis.healthScore}%
                </div>
              </div>
            </div>

            {/* 4 Indicadores Rápidos de Salud */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                <span className="text-stone-500 font-bold block">Margen Bruto (Meta &gt; 55%)</span>
                <span className="text-base font-black text-emerald-700 mt-0.5 block">{pl.grossMarginPercent}%</span>
                <span className="text-[10px] text-stone-400 font-medium">Margen tras comprar harina y gas</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                <span className="text-stone-500 font-bold block">Margen Neto (Meta &gt; 15%)</span>
                <span className="text-base font-black text-brito-orange-700 mt-0.5 block">{pl.netMarginPercent}%</span>
                <span className="text-[10px] text-stone-400 font-medium">Ganancia libre tras nómina y costos</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                <span className="text-stone-500 font-bold block">Costo de Merma (Meta &lt; 4%)</span>
                <span className={`text-base font-black mt-0.5 block ${kpis.wasteCostShare <= 3.5 ? "text-emerald-700" : "text-amber-700"}`}>
                  {kpis.wasteCostShare}%
                </span>
                <span className="text-[10px] text-stone-400 font-medium">{formatCurrency(pl.wasteLoss)} en pan frío</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                <span className="text-stone-500 font-bold block">Cobertura de Caja</span>
                <span className="text-base font-black text-blue-700 mt-0.5 block">{kpis.coverageDays} días</span>
                <span className="text-[10px] text-stone-400 font-medium">Operación respaldada sin ventas</span>
              </div>
            </div>
          </div>

          {/* Posición de Tesorería Rápida */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Disponibilidad de Liquidez & Tesorería</h3>
                  <p className="text-xs text-stone-500">¿Dónde está exactamente el dinero de Panaderías Brito hoy?</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-emerald-800">Liquidez Inmediata:</span>
                <span className="text-sm font-black text-emerald-700">{formatCurrency(treasury.totalLiquidFunds)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
                  <span>Cajas en Mostrador</span>
                  <Store className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <p className="text-xl font-black text-stone-900">{formatCurrency(treasury.cashInDrawers)}</p>
                <p className="text-[11px] text-stone-500 font-medium">Efectivo en turnos activos</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
                  <span>BBVA Bancomer (Don Toño)</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-xl font-black text-blue-900">{formatCurrency(treasury.bancoBBVA)}</p>
                <p className="text-[11px] text-stone-500 font-medium">SPEI y transferencias</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
                  <span>Santander Negocio (Tarjetas)</span>
                  <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-xl font-black text-rose-900">{formatCurrency(treasury.bancoSantander)}</p>
                <p className="text-[11px] text-stone-500 font-medium">Comisión bancaria deducida</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
                <div className="flex justify-between items-center text-xs text-stone-500 font-bold">
                  <span>Caja Chica Emergencias</span>
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-black text-amber-900">{formatCurrency(treasury.pettyCash)}</p>
                <p className="text-[11px] text-stone-500 font-medium">Compras inmediatas</p>
              </div>
            </div>
          </div>

          {/* Flujo Semanal de Efectivo */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-base text-stone-900">Flujo Semanal de Efectivo (Ingresos vs Gastos)</h3>
                <p className="text-xs text-stone-500">Comportamiento diario de la entrada y salida de dinero en mostrador.</p>
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

                return (
                  <div 
                    key={day.day} 
                    className="flex flex-col items-center gap-2 cursor-pointer"
                    onMouseEnter={() => setHoveredDay(day.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div className={`h-36 flex items-end gap-1.5 w-full justify-center p-2 rounded-2xl border transition-all ${
                      day.isPeak ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20" : "bg-stone-50 border-stone-100 hover:border-stone-300"
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
                        <span className="text-[9px] font-black text-brito-orange-700 uppercase bg-amber-100 px-1 py-0.5 rounded">Pico</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ESTADO DE RESULTADOS (P&L) EN CASCADA                                */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pl" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-stone-900">
                  Estado de Resultados Integral (P&L - Pérdidas y Ganancias)
                </h3>
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200">
                  {summary.periodLabel}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Desglose contable paso a paso desde el primer bolillo vendido hasta la ganancia neta final disponible.
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

          {/* Cascada de Resultados */}
          <div className="space-y-4">
            {/* Nivel 1: Ingresos Brutos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    +
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-emerald-950 uppercase tracking-wide">1. Ingresos Brutos de Operación</h4>
                    <p className="text-[11px] text-emerald-800">Total de ventas en mostrador, mayoristas y pedidos de pasteles</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
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
                  <span className="text-stone-500 block font-semibold text-[11px]">Tienditas & Mayoristas</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.wholesaleSales) : "18.0%"}
                  </span>
                  <div className="w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "18%" }} />
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

            {/* Nivel 2: Costo de Ventas (COGS) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    -
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-950 uppercase tracking-wide">2. Costo Directo de Producción (COGS)</h4>
                    <p className="text-[11px] text-amber-800">Harina de trigo, mantecas, gas LP de hornos y bolsas kraft</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-900">
                    {plViewMode === "currency" ? formatCurrency(pl.totalCogs) : `${Math.round((pl.totalCogs / pl.grossSales) * 100)}%`}
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold block">
                    {Math.round((pl.totalCogs / pl.grossSales) * 100)}% sobre ventas
                  </span>
                </div>
              </div>

              {/* Desglose COGS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-xs">
                <div className="bg-white/90 p-3 rounded-xl border border-amber-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Harinas, Mantecas, Huevos</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.cogsIngredients) : "28.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Gas LP para Hornos</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.cogsGasLP) : "8.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-100">
                  <span className="text-stone-500 block font-semibold text-[11px]">Bolsas Kraft & Domos</span>
                  <span className="font-black text-stone-900 text-sm">
                    {plViewMode === "currency" ? formatCurrency(pl.cogsPackaging) : "4.0%"}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtotal: Margen Bruto */}
            <div className="p-4 rounded-2xl bg-amber-100/90 border-2 border-amber-300 flex justify-between items-center font-black text-amber-950">
              <span className="text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-base">🌾</span> (=) MARGEN BRUTO RESULTANTE
              </span>
              <span className="text-lg text-amber-900">
                {plViewMode === "currency" ? formatCurrency(pl.grossProfit) : `${pl.grossMarginPercent}%`} ({pl.grossMarginPercent}% margen)
              </span>
            </div>

            {/* Nivel 3: Gastos Operativos (OPEX) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    -
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-rose-950 uppercase tracking-wide">3. Gastos Operativos (OPEX) & Mermas</h4>
                    <p className="text-[11px] text-rose-800">Nómina del equipo, recibo de luz CFE, mantenimiento y merma de pan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-rose-900">
                    {plViewMode === "currency" ? formatCurrency(pl.totalOpex + pl.wasteLoss) : `${Math.round(((pl.totalOpex + pl.wasteLoss) / pl.grossSales) * 100)}%`}
                  </span>
                  <span className="text-[10px] text-rose-700 font-bold block">
                    {Math.round(((pl.totalOpex + pl.wasteLoss) / pl.grossSales) * 100)}% sobre ventas
                  </span>
                </div>
              </div>

              {/* Desglose OPEX */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-rose-200/60 text-xs">
                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-stone-500 block font-semibold text-[10px]">Nóminas & Sueldos</span>
                  <span className="font-black text-stone-900">
                    {plViewMode === "currency" ? formatCurrency(pl.opexPayroll) : "18.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-stone-500 block font-semibold text-[10px]">Luz CFE & Agua</span>
                  <span className="font-black text-stone-900">
                    {plViewMode === "currency" ? formatCurrency(pl.opexUtilities) : "5.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-stone-500 block font-semibold text-[10px]">Mantenimiento Hornos</span>
                  <span className="font-black text-stone-900">
                    {plViewMode === "currency" ? formatCurrency(pl.opexMaintenance) : "3.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-stone-500 block font-semibold text-[10px]">Gasolina Repartos</span>
                  <span className="font-black text-stone-900">
                    {plViewMode === "currency" ? formatCurrency(pl.opexFuelDelivery) : "2.0%"}
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 bg-rose-50/40">
                  <span className="text-rose-700 block font-black text-[10px]">Costo Mermas (Pan Frío)</span>
                  <span className="font-black text-rose-800">
                    {plViewMode === "currency" ? formatCurrency(pl.wasteLoss) : `${kpis.wasteCostShare}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtotal: EBITDA */}
            <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 flex justify-between items-center font-black text-blue-950">
              <span className="text-xs uppercase tracking-wide">(=) UTILIDAD DE OPERACIÓN (EBITDA)</span>
              <span className="text-lg text-blue-900">
                {plViewMode === "currency" ? formatCurrency(pl.operatingProfit) : `${pl.operatingMarginPercent}%`} ({pl.operatingMarginPercent}%)
              </span>
            </div>

            {/* Nivel 4: Retiros Propietario */}
            <div className="px-5 py-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex justify-between items-center text-xs font-bold text-stone-700">
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-stone-500" /> (-) Retiros Personales de Don Toño / Socios
              </span>
              <span className="text-stone-900 font-extrabold text-sm">
                {plViewMode === "currency" ? formatCurrency(pl.ownerDraws) : `${Math.round((pl.ownerDraws / pl.grossSales) * 100)}%`}
              </span>
            </div>

            {/* Nivel 5: Utilidad Neta Real Final */}
            <div className="p-6 rounded-3xl bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-stone-800">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-brito-orange-400 block">
                  (=) UTILIDAD NETA FINAL DISPONIBLE
                </span>
                <p className="text-xs text-stone-400 mt-1 max-w-md font-medium">
                  Ganancia líquida y limpia de Panaderías Brito disponible para reinversión, reserva de capital y ahorro.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-3xl sm:text-4xl font-black text-brito-orange-400 block tracking-tight">
                  {formatCurrency(pl.netProfit)}
                </span>
                <span className="text-xs text-stone-300 font-semibold mt-1 block">
                  Margen Neto Libre: <strong className="text-emerald-400 font-black">{pl.netMarginPercent}%</strong>
                </span>
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

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: EFICIENCIA DE PANADERÍA, MERMAS & CRÉDITO                            */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "panaderia" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Métricas Operativas de Panadería Tradicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-1">
              <span className="text-xs font-bold text-stone-500 block">Punto de Equilibrio Diario</span>
              <p className="text-2xl font-black text-brito-orange-700">{formatCurrency(kpis.dailyBreakEven)}</p>
              <p className="text-[11px] text-stone-500 font-medium">
                Venta diaria mínima para cubrir costos fijos y nóminas
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-1">
              <span className="text-xs font-bold text-stone-500 block">Equivalente en Piezas de Pan</span>
              <p className="text-2xl font-black text-amber-800">~{kpis.breakEvenPieces.toLocaleString()} pzas</p>
              <p className="text-[11px] text-stone-500 font-medium">
                Bolillos y pan dulce al día para operar en ganancias
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-1">
              <span className="text-xs font-bold text-stone-500 block">Ticket Promedio Mostrador</span>
              <p className="text-2xl font-black text-stone-900">{formatCurrency(kpis.ticketAverage)}</p>
              <p className="text-[11px] text-stone-500 font-medium">
                Compra promedio por cliente en panadería
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-1">
              <span className="text-xs font-bold text-stone-500 block">Costo de Mermas de Horno</span>
              <p className="text-2xl font-black text-rose-700">{formatCurrency(pl.wasteLoss)}</p>
              <p className="text-[11px] text-rose-700 font-bold">
                {kpis.wasteCostShare}% de pérdida sobre la producción
              </p>
            </div>
          </div>

          {/* Radar de Crédito a Mayoristas & Tienditas */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Cartera de Crédito a Tienditas & Mayoristas</h3>
                  <p className="text-xs text-stone-500">Pan entregado a consignación o fiado que está pendiente de cobro.</p>
                </div>
              </div>
              <Link
                href="/clientes"
                className="text-xs font-bold text-brito-orange-700 hover:text-brito-orange-800 flex items-center gap-1 self-start sm:self-auto"
              >
                Administrar clientes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Listado de Deudores */}
            <div className="space-y-2.5">
              {receivables.topDebtors.map((item, idx) => (
                <div 
                  key={item.customer.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-stone-300 transition-all gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-sm shrink-0">
                      🏪
                    </div>
                    <div>
                      <p className="font-black text-stone-900 text-sm">{item.customer.name}</p>
                      <p className="text-[11px] text-stone-500 font-medium">
                        Límite autorizado: {formatCurrency(item.customer.creditLimit)} • {item.customer.phone || "Sin teléfono registrado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <p className="font-black text-rose-700 text-sm">
                        {formatCurrency(item.pendingAmount)}
                      </p>
                      <span className="text-[10px] text-stone-400 block font-medium">
                        {item.daysOverdue} días de crédito
                      </span>
                    </div>

                    {item.isOverLimit ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                        Límite Excedido
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Al Corriente
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-black text-rose-900 block">Total Fiado en la Calle:</span>
                  <span className="text-[11px] text-rose-700 font-medium">
                    {receivables.customersWithDebtCount} tienditas con saldo pendiente de pago
                  </span>
                </div>
                <span className="font-black text-rose-700 text-lg sm:text-xl">{formatCurrency(receivables.totalReceivables)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: SIMULADOR & METAS                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "simulador" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Termómetro de Meta Mensual de Ventas */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-brito-orange-700 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Termómetro de Metas de Panadería Brito</h3>
                  <p className="text-xs text-stone-500">Progreso del mes en curso hacia el objetivo de Don Toño.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 font-bold">Meta Establecida:</span>
                <input
                  type="number"
                  step="5000"
                  value={monthlyTargetSales}
                  onChange={(e) => setMonthlyTargetSales(Number(e.target.value) || 0)}
                  className="w-32 px-2.5 py-1 text-right font-black border border-stone-300 rounded-xl text-xs bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Barra de Progreso */}
            {(() => {
              const progressPct = Math.min(100, Math.round((pl.grossSales / Math.max(monthlyTargetSales, 1)) * 100));
              const remaining = Math.max(0, monthlyTargetSales - pl.grossSales);

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="text-stone-500 font-semibold block text-[11px]">Ventas Acumuladas Actuales</span>
                      <span className="text-2xl font-black text-stone-900">{formatCurrency(pl.grossSales)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-500 font-semibold block text-[11px]">Avance de Meta</span>
                      <span className="text-2xl font-black text-brito-orange-600">{progressPct}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-100 h-4 rounded-full overflow-hidden p-0.5 border border-stone-200">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-brito-orange-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-stone-500 pt-1">
                    <span>Falta para cumplir la meta: <strong className="text-stone-900">{formatCurrency(remaining)}</strong></span>
                    <span className="text-emerald-700 font-bold">Proyección a fin de mes favorable</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Simulador Interactivo de Rentabilidad */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 shadow-sm transition-all duration-200 space-y-6">
            <div className="border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">Simulador de Rentabilidad & Sensibilidad</h3>
                  <p className="text-xs text-stone-500">Mueve los controles para proyectar cómo impactan los cambios de precios e insumos en la utilidad neta.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controles de Simulación */}
              <div className="space-y-5 lg:col-span-1 bg-stone-50 p-5 rounded-2xl border border-stone-200/80 text-xs">
                {/* Control 1: Variación de Ventas */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-stone-700">
                    <span>Variación en Ventas:</span>
                    <span className={`font-black ${simSalesDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {simSalesDelta > 0 ? `+${simSalesDelta}%` : `${simSalesDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="40"
                    step="5"
                    value={simSalesDelta}
                    onChange={(e) => setSimSalesDelta(Number(e.target.value))}
                    className="w-full accent-brito-orange-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>-25% (Temporada baja)</span>
                    <span>+40% (Navidad/Día de Muertos)</span>
                  </div>
                </div>

                {/* Control 2: Variación Costo Harina */}
                <div className="space-y-1.5 pt-2 border-t border-stone-200">
                  <div className="flex justify-between font-bold text-stone-700">
                    <span>Costo de Harinas & Insumos:</span>
                    <span className={`font-black ${simFlourDelta <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {simFlourDelta > 0 ? `+${simFlourDelta}%` : `${simFlourDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="30"
                    step="5"
                    value={simFlourDelta}
                    onChange={(e) => setSimFlourDelta(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>-15% (Mejor proveedor)</span>
                    <span>+30% (Aumento trigo)</span>
                  </div>
                </div>

                {/* Control 3: Meta de Merma */}
                <div className="space-y-1.5 pt-2 border-t border-stone-200">
                  <div className="flex justify-between font-bold text-stone-700">
                    <span>Porcentaje de Merma Pan:</span>
                    <span className="font-black text-rose-700">{simWasteTarget}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="6.0"
                    step="0.5"
                    value={simWasteTarget}
                    onChange={(e) => setSimWasteTarget(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>1.5% (Control estricto)</span>
                    <span>6.0% (Desperdicio alto)</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSimSalesDelta(0);
                    setSimFlourDelta(0);
                    setSimWasteTarget(3.0);
                  }}
                  className="w-full py-2 bg-white hover:bg-stone-200 text-stone-700 font-bold rounded-xl border border-stone-300 transition-all text-xs"
                >
                  Restablecer a Valores Actuales
                </button>
              </div>

              {/* Resultado Proyectado */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-6 rounded-3xl border border-stone-800 text-white space-y-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-brito-orange-400 block">
                        Utilidad Neta Proyectada
                      </span>
                      <p className="text-xs text-stone-400 mt-0.5">Bajo el escenario configurado</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        simProjected.profitDiff >= 0
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      }`}>
                        {simProjected.profitDiff >= 0 ? `+${formatCurrency(simProjected.profitDiff)} vs actual` : `${formatCurrency(simProjected.profitDiff)} vs actual`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-brito-orange-400">
                      {formatCurrency(simProjected.netProfit)}
                    </span>
                    <span className="text-xs text-stone-300 font-medium">
                      (Margen Neto Estimado: <strong className="text-emerald-400">{simProjected.netMargin}%</strong>)
                    </span>
                  </div>

                  {/* Comparativa en 3 Columnas */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-stone-800 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Ventas Proyectadas:</span>
                      <span className="font-bold text-white text-sm">{formatCurrency(simProjected.sales)}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Costo Producción:</span>
                      <span className="font-bold text-amber-400 text-sm">{formatCurrency(simProjected.cogs)}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Costo Mermas:</span>
                      <span className="font-bold text-rose-400 text-sm">{formatCurrency(simProjected.waste)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Recomendación de Don Toño:</strong> Si el costo de harina sube un 10%, un incremento de apenas 50 centavos por pieza de pan dulce o reducir la merma al 2.5% compensa totalmente el impacto sin sacrificar la utilidad neta.
                  </p>
                </div>
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
