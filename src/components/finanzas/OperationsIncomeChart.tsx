"use client";

import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Store, 
  Cake, 
  Sparkles, 
  Calendar, 
  Flame, 
  BarChart3, 
  PieChart as PieIcon, 
  Layers, 
  ArrowUpRight,
  Info
} from "lucide-react";
import { FullFinancialSummary } from "@/lib/finanzas";
import { formatCurrency } from "@/lib/utils";

interface OperationsIncomeChartProps {
  summary: FullFinancialSummary;
  plViewMode?: "currency" | "percent";
}

type ChartViewType = "combined" | "trend" | "donut";

export default function OperationsIncomeChart({ summary, plViewMode = "currency" }: OperationsIncomeChartProps) {
  const [viewType, setViewType] = useState<ChartViewType>("combined");
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

  const { pl, cashFlow, kpis } = summary;

  // Calculamos los canales activos sin 'mayoristas' según la solicitud anterior
  const totalTracked = pl.counterSales + pl.ordersSales + pl.otherIncomes;
  const safeTotal = totalTracked > 0 ? totalTracked : pl.grossSales || 1;

  const channels = useMemo(() => [
    {
      id: "counter",
      name: "Mostrador (Efectivo & Tarjeta)",
      shortName: "Mostrador",
      amount: pl.counterSales,
      percent: Number(((pl.counterSales / safeTotal) * 100).toFixed(1)),
      color: "#10b981", // Emerald 500
      glowColor: "rgba(16, 185, 129, 0.4)",
      gradId: "counterGrad",
      icon: Store,
      description: "Venta directa al público en vitrina y canastos",
    },
    {
      id: "orders",
      name: "Pasteles & Encargos Especiales",
      shortName: "Pasteles & Encargos",
      amount: pl.ordersSales,
      percent: Number(((pl.ordersSales / safeTotal) * 100).toFixed(1)),
      color: "#f97316", // Brito Orange 500
      glowColor: "rgba(249, 115, 22, 0.4)",
      gradId: "ordersGrad",
      icon: Cake,
      description: "Pastelería de tres leches, eventos y pedidos bajo anticipo",
    },
    {
      id: "other",
      name: "Otros (Costales, Reciclaje)",
      shortName: "Otros Ingresos",
      amount: pl.otherIncomes,
      percent: Number(((pl.otherIncomes / safeTotal) * 100).toFixed(1)),
      color: "#8b5cf6", // Purple/Indigo 500
      glowColor: "rgba(139, 92, 246, 0.4)",
      gradId: "otherGrad",
      icon: Sparkles,
      description: "Venta de bultos vacíos de harina, azúcar y subproductos",
    },
  ], [pl.counterSales, pl.ordersSales, pl.otherIncomes, safeTotal]);

  // Cálculos para la gráfica de Donut SVG
  const donutData = useMemo(() => {
    const radius = 68;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius; // ~427.26
    let accumulatedAngle = 0;

    const segments = channels.map((ch) => {
      const fraction = ch.percent / 100;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...ch,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return { radius, strokeWidth, circumference, segments };
  }, [channels]);

  // Cálculos para la gráfica de Tendencia (Barras + Curva Spline)
  const trendData = useMemo(() => {
    const days = cashFlow && cashFlow.length > 0 ? cashFlow : [];
    const maxVal = Math.max(...days.map((d) => d.income), 1000);
    const avgVal = days.length > 0 ? Math.round(days.reduce((a, b) => a + b.income, 0) / days.length) : 0;

    const svgWidth = 560;
    const svgHeight = 220;
    const paddingX = 35;
    const paddingBottom = 40;
    const paddingTop = 30;
    const chartHeight = svgHeight - paddingTop - paddingBottom;
    const chartWidth = svgWidth - paddingX * 2;
    const stepX = days.length > 1 ? chartWidth / (days.length - 1) : chartWidth;

    const points = days.map((d, i) => {
      const x = paddingX + i * stepX;
      const normalizedHeight = (d.income / maxVal) * (chartHeight * 0.9);
      const y = svgHeight - paddingBottom - normalizedHeight;
      return {
        ...d,
        x,
        y,
        barHeight: normalizedHeight,
        percentOfMax: Math.round((d.income / maxVal) * 100),
      };
    });

    // Construcción de la curva cúbica suave (Bézier spline)
    let pathD = "";
    let areaD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cx1 = p0.x + (p1.x - p0.x) * 0.5;
        const cy1 = p0.y;
        const cx2 = p0.x + (p1.x - p0.x) * 0.5;
        const cy2 = p1.y;
        pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
      }
      const baselineY = svgHeight - paddingBottom;
      areaD = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
    }

    return {
      svgWidth,
      svgHeight,
      paddingX,
      paddingBottom,
      baselineY: svgHeight - paddingBottom,
      maxVal,
      avgVal,
      points,
      pathD,
      areaD,
    };
  }, [cashFlow]);

  return (
    <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-stone-800 space-y-6">
      {/* ─── Encabezado de la Gráfica ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <TrendingUp className="w-3.5 h-3.5" /> Gráfica Operativa Oficial
            </span>
            <span className="text-xs text-stone-400 font-semibold">• {summary.periodLabel}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Desempeño Visual de Ventas & Canales
          </h3>
          <p className="text-xs text-stone-400 font-medium max-w-xl">
            Monitoreo en tiempo real del flujo de ingresos por mostrador y encargos de panadería tradicional.
          </p>
        </div>

        {/* Selector de tipo de vista */}
        <div className="flex items-center gap-1 bg-stone-800/90 p-1.5 rounded-2xl border border-stone-700/60 self-start lg:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setViewType("combined")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
              viewType === "combined"
                ? "bg-brito-orange-600 text-white shadow-md shadow-orange-600/30"
                : "text-stone-400 hover:text-white hover:bg-stone-700/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vista Doble</span>
          </button>
          <button
            onClick={() => setViewType("trend")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
              viewType === "trend"
                ? "bg-brito-orange-600 text-white shadow-md shadow-orange-600/30"
                : "text-stone-400 hover:text-white hover:bg-stone-700/50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Tendencia</span>
          </button>
          <button
            onClick={() => setViewType("donut")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
              viewType === "donut"
                ? "bg-brito-orange-600 text-white shadow-md shadow-orange-600/30"
                : "text-stone-400 hover:text-white hover:bg-stone-700/50"
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Canales</span>
          </button>
        </div>
      </div>

      {/* ─── Tarjetas de Resumen KPI Superiores ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3.5 hover:border-emerald-500/40 transition-all">
          <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">
            Total Ingresos
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
            {formatCurrency(pl.grossSales)}
          </p>
          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
            100% Base de operación
          </span>
        </div>

        <div className="bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3.5 hover:border-brito-orange-500/40 transition-all">
          <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">
            Canal Estrella
          </span>
          <p className="text-xl sm:text-2xl font-black text-brito-orange-400 mt-0.5">
            Mostrador ({channels[0].percent}%)
          </p>
          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
            {formatCurrency(pl.counterSales)}
          </span>
        </div>

        <div className="bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3.5 hover:border-amber-500/40 transition-all">
          <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> Pico Máximo
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
            Sábado
          </p>
          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
            Tarde familiar de alta venta
          </span>
        </div>

        <div className="bg-stone-800/60 border border-stone-700/50 rounded-2xl p-3.5 hover:border-purple-500/40 transition-all">
          <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">
            Promedio Diario
          </span>
          <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
            {formatCurrency(trendData.avgVal)}
          </p>
          <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
            Estimado por jornada
          </span>
        </div>
      </div>

      {/* ─── Área Principal de Gráficas ─────────────────────────────────────── */}
      <div className={`grid gap-6 ${
        viewType === "combined" ? "grid-cols-1 xl:grid-cols-12" : "grid-cols-1"
      }`}>
        {/* ── GRÁFICA 1: Tendencia y Flujo de Ventas Diarias ── */}
        {(viewType === "combined" || viewType === "trend") && (
          <div className={`bg-stone-950/70 border border-stone-800/90 rounded-3xl p-5 sm:p-6 space-y-4 flex flex-col justify-between ${
            viewType === "combined" ? "xl:col-span-7" : "col-span-1"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-wide">
                    Flujo de Ventas en el Tiempo
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Ingresos diarios con picos de demanda del periodo
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/50">
                Promedio: {formatCurrency(trendData.avgVal)}/día
              </span>
            </div>

            {/* Canvas SVG Interactivo */}
            <div className="relative w-full overflow-hidden pt-2">
              <svg
                viewBox={`0 0 ${trendData.svgWidth} ${trendData.svgHeight}`}
                className="w-full h-auto select-none overflow-visible"
              >
                <defs>
                  {/* Gradiente de relleno bajo la curva */}
                  <linearGradient id="areaGlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                    <stop offset="50%" stopColor="#059669" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente para barras normales */}
                  <linearGradient id="barNormalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>

                  {/* Gradiente para barras pico (Sábado/Domingo) */}
                  <linearGradient id="barPeakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>

                  {/* Sombra suave para barras */}
                  <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Líneas de guía horizontal */}
                <line
                  x1={trendData.paddingX}
                  y1={trendData.baselineY - 110}
                  x2={trendData.svgWidth - trendData.paddingX}
                  y2={trendData.baselineY - 110}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
                <line
                  x1={trendData.paddingX}
                  y1={trendData.baselineY - 55}
                  x2={trendData.svgWidth - trendData.paddingX}
                  y2={trendData.baselineY - 55}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
                <line
                  x1={trendData.paddingX}
                  y1={trendData.baselineY}
                  x2={trendData.svgWidth - trendData.paddingX}
                  y2={trendData.baselineY}
                  stroke="#475569"
                  strokeWidth="1.5"
                  opacity="0.8"
                />

                {/* Área bajo la curva con gradiente glow */}
                {trendData.areaD && (
                  <path d={trendData.areaD} fill="url(#areaGlowGrad)" />
                )}

                {/* Curva de tendencia Bézier */}
                {trendData.pathD && (
                  <path
                    d={trendData.pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Barras verticales interactivas */}
                {trendData.points.map((pt, idx) => {
                  const isHovered = hoveredDayIndex === idx;
                  const barWidth = 32;
                  const barX = pt.x - barWidth / 2;
                  const barY = pt.y;

                  return (
                    <g
                      key={pt.day}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredDayIndex(idx)}
                      onMouseLeave={() => setHoveredDayIndex(null)}
                    >
                      {/* Fondo de hover completo de la columna */}
                      <rect
                        x={barX - 6}
                        y={20}
                        width={barWidth + 12}
                        height={trendData.baselineY - 15}
                        rx="12"
                        fill={isHovered ? "rgba(255, 255, 255, 0.06)" : "transparent"}
                      />

                      {/* Barra con gradiente */}
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={pt.barHeight}
                        rx="7"
                        fill={pt.isPeak ? "url(#barPeakGrad)" : "url(#barNormalGrad)"}
                        opacity={isHovered ? 1 : 0.88}
                        filter="url(#barShadow)"
                        className="transition-all duration-150"
                        style={{
                          transform: isHovered ? "scaleY(1.03)" : "scaleY(1)",
                          transformOrigin: `center ${trendData.baselineY}px`,
                        }}
                      />

                      {/* Punto en la cima de la barra */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill="#ffffff"
                        stroke={pt.isPeak ? "#ea580c" : "#059669"}
                        strokeWidth="2.5"
                        className="transition-all"
                      />

                      {/* Etiqueta del día en el eje X */}
                      <text
                        x={pt.x}
                        y={trendData.baselineY + 22}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isHovered ? "900" : "700"}
                        fill={isHovered ? "#ffffff" : "#94a3b8"}
                      >
                        {pt.shortDay}
                      </text>

                      {/* Badge de Pico para fines de semana */}
                      {pt.isPeak && (
                        <text
                          x={pt.x}
                          y={barY - 10}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill="#fb923c"
                        >
                          🔥 PICO
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip flotante interactivo al pasar el mouse */}
              {hoveredDayIndex !== null && trendData.points[hoveredDayIndex] && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 bg-stone-900/95 backdrop-blur-md text-white text-xs py-2 px-3 rounded-xl border border-stone-700 shadow-2xl transition-all duration-100 flex flex-col gap-0.5 z-20"
                  style={{
                    left: `${(trendData.points[hoveredDayIndex].x / trendData.svgWidth) * 100}%`,
                    top: "10px",
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-stone-300">
                    <span>{trendData.points[hoveredDayIndex].day}</span>
                    {trendData.points[hoveredDayIndex].isPeak && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-500/20 text-orange-400 font-black">
                        Alta Demanda
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-emerald-400">
                    {formatCurrency(trendData.points[hoveredDayIndex].income)}
                  </span>
                  <span className="text-[10px] text-stone-400 font-semibold">
                    {trendData.points[hoveredDayIndex].income >= trendData.avgVal ? "▲ Arriba del promedio" : "▼ Ajustado a la media"}
                  </span>
                </div>
              )}
            </div>

            {/* Leyenda de la gráfica de barras */}
            <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800/80 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Ventas Normales
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Fin de Semana (Pico)
                </span>
              </div>
              <span className="text-[11px] text-stone-500">
                Pasa el cursor sobre cada día para ver detalles
              </span>
            </div>
          </div>
        )}

        {/* ── GRÁFICA 2: Donut SVG de Participación por Canales ── */}
        {(viewType === "combined" || viewType === "donut") && (
          <div className={`bg-stone-950/70 border border-stone-800/90 rounded-3xl p-5 sm:p-6 space-y-5 flex flex-col justify-between ${
            viewType === "combined" ? "xl:col-span-5" : "col-span-1"
          }`}>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brito-orange-500/20 text-brito-orange-400 rounded-xl">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white uppercase tracking-wide">
                  Distribución por Canal
                </h4>
                <p className="text-[11px] text-stone-400">
                  Participación porcentual y monto por fuente de venta
                </p>
              </div>
            </div>

            {/* Gráfica Circular Donut en SVG */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full transform -rotate-90 select-none overflow-visible"
                >
                  <defs>
                    <linearGradient id="counterGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                    <linearGradient id="otherGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>

                  {/* Círculo base de fondo */}
                  <circle
                    cx="100"
                    cy="100"
                    r={donutData.radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={donutData.strokeWidth}
                    opacity="0.3"
                  />

                  {/* Segmentos del Donut */}
                  {donutData.segments.map((seg) => {
                    const isHovered = hoveredChannel === seg.id;
                    return (
                      <circle
                        key={seg.id}
                        cx="100"
                        cy="100"
                        r={donutData.radius}
                        fill="none"
                        stroke={`url(#${seg.gradId})`}
                        strokeWidth={isHovered ? donutData.strokeWidth + 4 : donutData.strokeWidth}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredChannel(seg.id)}
                        onMouseLeave={() => setHoveredChannel(null)}
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 8px ${seg.glowColor})` : undefined,
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Centro del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                    {hoveredChannel 
                      ? channels.find(c => c.id === hoveredChannel)?.shortName 
                      : "VENTAS BRUTAS"}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white leading-tight mt-0.5">
                    {hoveredChannel
                      ? formatCurrency(channels.find(c => c.id === hoveredChannel)?.amount || 0)
                      : formatCurrency(pl.grossSales)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
                    {hoveredChannel
                      ? `${channels.find(c => c.id === hoveredChannel)?.percent}% del total`
                      : "100% Operación"}
                  </span>
                </div>
              </div>

              {/* Lista Descriptiva de Canales */}
              <div className="flex-1 w-full space-y-2.5">
                {channels.map((ch) => {
                  const Icon = ch.icon;
                  const isHovered = hoveredChannel === ch.id;

                  return (
                    <div
                      key={ch.id}
                      onMouseEnter={() => setHoveredChannel(ch.id)}
                      onMouseLeave={() => setHoveredChannel(null)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isHovered 
                          ? "bg-stone-900 border-white/30 shadow-md scale-[1.02]" 
                          : "bg-stone-900/60 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: ch.color }}
                          />
                          <span className="text-white font-extrabold">{ch.shortName}</span>
                        </div>
                        <span className="text-stone-300 font-black">{ch.percent}%</span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-stone-400 font-medium truncate max-w-[140px]">
                          {ch.description}
                        </span>
                        <span className="font-black text-emerald-400 shrink-0">
                          {formatCurrency(ch.amount)}
                        </span>
                      </div>

                      {/* Barra de progreso miniatura */}
                      <div className="w-full bg-stone-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${ch.percent}%`,
                            backgroundColor: ch.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pie de la tarjeta de canales */}
            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800/80">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-stone-500" />
                Ventas de panadería tradicional y mostrador
              </span>
              <span className="text-emerald-400 font-extrabold">
                {channels.length} canales activos
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
