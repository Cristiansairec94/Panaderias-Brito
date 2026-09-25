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
  CheckCircle2, 
  ArrowUpRight,
  Info,
  DollarSign,
  Award
} from "lucide-react";
import { FullFinancialSummary } from "@/lib/finanzas";
import { formatCurrency } from "@/lib/utils";

interface OperationsIncomeChartProps {
  summary: FullFinancialSummary;
  plViewMode?: "currency" | "percent";
}

type ChartTab = "dias" | "canales";

export default function OperationsIncomeChart({ summary }: OperationsIncomeChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("dias");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { pl, cashFlow } = summary;

  // Canales de ingreso
  const totalTracked = pl.counterSales + pl.ordersSales + pl.otherIncomes;
  const safeTotal = totalTracked > 0 ? totalTracked : pl.grossSales || 1;

  const channels = useMemo(() => [
    {
      id: "counter",
      name: "Mostrador (Pan Dulce & Bolillo)",
      shortName: "Mostrador",
      amount: pl.counterSales,
      percent: Number(((pl.counterSales / safeTotal) * 100).toFixed(1)),
      color: "#10b981", // Emerald 500
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      barColor: "bg-emerald-500",
      icon: Store,
      description: "Ventas en mostrador en efectivo y terminal bancaria.",
    },
    {
      id: "orders",
      name: "Pasteles & Pedidos Especiales",
      shortName: "Pasteles & Encargos",
      amount: pl.ordersSales,
      percent: Number(((pl.ordersSales / safeTotal) * 100).toFixed(1)),
      color: "#f97316", // Brito Orange
      badgeBg: "bg-orange-100 text-orange-800 border-orange-200",
      barColor: "bg-orange-500",
      icon: Cake,
      description: "Pasteles de vitrina, tres leches y pedidos de eventos.",
    },
    {
      id: "other",
      name: "Otros Ingresos de Operación",
      shortName: "Otros Ingresos",
      amount: pl.otherIncomes,
      percent: Number(((pl.otherIncomes / safeTotal) * 100).toFixed(1)),
      color: "#8b5cf6", // Purple
      badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
      barColor: "bg-purple-500",
      icon: Sparkles,
      description: "Venta de bultos vacíos de harina, azúcar y reciclaje.",
    },
  ], [pl.counterSales, pl.ordersSales, pl.otherIncomes, safeTotal]);

  // Cálculos de la Gráfica de Barras Diarias
  const dailyData = useMemo(() => {
    const days = cashFlow && cashFlow.length > 0 ? cashFlow : [];
    const maxVal = Math.max(...days.map((d) => d.income), 1000);
    const avgVal = days.length > 0 ? Math.round(days.reduce((a, b) => a + b.income, 0) / days.length) : 0;
    const peakDay = days.reduce((prev, curr) => (curr.income > prev.income ? curr : prev), days[0] || { day: "Sábado", income: 0 });

    const svgWidth = 720;
    const svgHeight = 280;
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 45;
    const paddingBottom = 55;
    const chartHeight = svgHeight - paddingTop - paddingBottom;
    const chartWidth = svgWidth - paddingLeft - paddingRight;

    // Escala con 15% de margen superior para los textos de montos
    const scaleMax = maxVal * 1.15;
    const slotWidth = days.length > 0 ? chartWidth / days.length : chartWidth;
    const barWidth = Math.min(52, slotWidth * 0.58);

    const bars = days.map((d, i) => {
      const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      const barHeight = Math.max(12, (d.income / scaleMax) * chartHeight);
      const y = paddingTop + (chartHeight - barHeight);
      const isPeak = d.day === peakDay.day || d.isPeak;

      return {
        ...d,
        x,
        y,
        barWidth,
        barHeight,
        isPeak,
        diffFromAvg: Math.round(((d.income - avgVal) / (avgVal || 1)) * 100),
      };
    });

    const avgY = paddingTop + (chartHeight - (avgVal / scaleMax) * chartHeight);

    return {
      svgWidth,
      svgHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      chartHeight,
      chartWidth,
      baselineY: paddingTop + chartHeight,
      avgVal,
      avgY,
      peakDay,
      bars,
    };
  }, [cashFlow]);

  // Cálculos para la gráfica de Donut
  const donutData = useMemo(() => {
    const radius = 72;
    const strokeWidth = 26;
    const circumference = 2 * Math.PI * radius; // ~452.39
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

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-5 sm:p-7 space-y-6">
      {/* ─── Encabezado y Selector Intuitivo ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-orange-200">
              <TrendingUp className="w-3.5 h-3.5 text-brito-orange-600" />
              Gráfica de Ventas
            </span>
            <span className="text-xs text-stone-500 font-bold">• {summary.periodLabel}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Comportamiento de Ingresos de Operación
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Visualiza de forma clara y directa cuánto dinero ingresa a la panadería y en qué días se vende más.
          </p>
        </div>

        {/* Botones de Selección Claros */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 self-start sm:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab("dias")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
              activeTab === "dias"
                ? "bg-stone-900 text-white shadow-md shadow-stone-900/15"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Ventas por Día</span>
          </button>
          <button
            onClick={() => setActiveTab("canales")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
              activeTab === "canales"
                ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            }`}
          >
            <PieIcon className="w-4 h-4 text-white" />
            <span>Porcentaje por Canal</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Tarjetas Informativas Fáciles de Entender ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Ingresos */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 hover:border-emerald-300 transition-all">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Total Vendido ({summary.periodLabel})
          </span>
          <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
            {formatCurrency(pl.grossSales)}
          </p>
          <span className="text-[10px] text-emerald-700 font-extrabold block mt-1">
            ✓ 100% ingresos registrados
          </span>
        </div>

        {/* Mostrador */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/70 hover:border-emerald-300 transition-all">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <Store className="w-3.5 h-3.5" /> Mostrador (Mayoría)
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
            {formatCurrency(pl.counterSales)}
          </p>
          <span className="text-[10px] text-emerald-700 font-extrabold block mt-1">
            {channels[0].percent}% del dinero total
          </span>
        </div>

        {/* Pasteles & Encargos */}
        <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-200/70 hover:border-orange-300 transition-all">
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block flex items-center gap-1">
            <Cake className="w-3.5 h-3.5" /> Pasteles & Encargos
          </span>
          <p className="text-xl sm:text-2xl font-black text-orange-950 mt-1">
            {formatCurrency(pl.ordersSales)}
          </p>
          <span className="text-[10px] text-orange-700 font-extrabold block mt-1">
            {channels[1].percent}% de las ventas
          </span>
        </div>

        {/* Día Más Fuerte */}
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 hover:border-amber-300 transition-all">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-600" /> Día Más Fuerte
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
            {dailyData.peakDay.day}
          </p>
          <span className="text-[10px] text-amber-800 font-extrabold block mt-1">
            {formatCurrency(dailyData.peakDay.income)} vendidos
          </span>
        </div>
      </div>

      {/* ─── VISTA 1: Gráfica de Barras por Día (Limpia, con Montos Arriba) ─────── */}
      {activeTab === "dias" && (
        <div className="bg-stone-50/70 border border-stone-200/80 rounded-3xl p-5 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
                <span>Ventas Día por Día en la Semana</span>
              </h4>
              <p className="text-xs text-stone-500">
                El monto arriba de cada barra muestra exactamente cuánto se vendió ese día.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Día normal
              </span>
              <span className="flex items-center gap-1.5 text-orange-700 font-black">
                <span className="w-3 h-3 rounded-md bg-brito-orange-600 inline-block" /> Día de alta venta
              </span>
            </div>
          </div>

          {/* Canvas SVG de Barras Claras con Montos Visibles */}
          <div className="w-full overflow-x-auto pt-2 pb-1">
            <div className="min-w-[620px]">
              <svg
                viewBox={`0 0 ${dailyData.svgWidth} ${dailyData.svgHeight}`}
                className="w-full h-auto select-none"
              >
                {/* Línea horizontal de base */}
                <line
                  x1={dailyData.paddingLeft}
                  y1={dailyData.baselineY}
                  x2={dailyData.svgWidth - dailyData.paddingRight}
                  y2={dailyData.baselineY}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />

                {/* Línea punteada del promedio diario */}
                <line
                  x1={dailyData.paddingLeft}
                  y1={dailyData.avgY}
                  x2={dailyData.svgWidth - dailyData.paddingRight}
                  y2={dailyData.avgY}
                  stroke="#f97316"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.85"
                />
                <text
                  x={dailyData.svgWidth - dailyData.paddingRight}
                  y={dailyData.avgY - 7}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="800"
                  fill="#ea580c"
                >
                  Promedio: {formatCurrency(dailyData.avgVal)} al día
                </text>

                {/* Renderizado de cada barra de día */}
                {dailyData.bars.map((bar, idx) => {
                  const isHovered = hoveredIndex === idx;
                  const centerX = bar.x + bar.barWidth / 2;

                  return (
                    <g
                      key={bar.day}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Fondo transparente que agranda la zona de hover */}
                      <rect
                        x={bar.x - 8}
                        y={dailyData.paddingTop}
                        width={bar.barWidth + 16}
                        height={dailyData.chartHeight}
                        rx="12"
                        fill={isHovered ? "rgba(249, 115, 22, 0.08)" : "transparent"}
                      />

                      {/* Barra con esquinas redondeadas arriba */}
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.barWidth}
                        height={bar.barHeight}
                        rx="10"
                        fill={bar.isPeak ? "#ea580c" : "#10b981"}
                        opacity={isHovered ? 1 : 0.9}
                        className="transition-all duration-150 shadow-sm"
                        style={{
                          transform: isHovered ? "scaleY(1.02)" : "scaleY(1)",
                          transformOrigin: `center ${dailyData.baselineY}px`,
                        }}
                      />

                      {/* Monto exacto en dinero arriba de cada columna (VISIBLE SIEMPRE) */}
                      <text
                        x={centerX}
                        y={bar.y - 10}
                        textAnchor="middle"
                        fontSize={bar.isPeak ? "12" : "11"}
                        fontWeight="900"
                        fill={bar.isPeak ? "#c2410c" : "#065f46"}
                      >
                        {formatCurrency(bar.income)}
                      </text>

                      {/* Nombre corto del día en negrita en el eje X */}
                      <text
                        x={centerX}
                        y={dailyData.baselineY + 22}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight={isHovered || bar.isPeak ? "900" : "700"}
                        fill={bar.isPeak ? "#ea580c" : "#1c1917"}
                      >
                        {bar.shortDay}
                      </text>

                      {/* Nombre completo debajo */}
                      <text
                        x={centerX}
                        y={dailyData.baselineY + 38}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#78716c"
                      >
                        {bar.day}
                      </text>

                      {/* Badge 'Día Fuerte' para fines de semana */}
                      {bar.isPeak && (
                        <g>
                          <rect
                            x={centerX - 28}
                            y={bar.y - 28}
                            width="56"
                            height="16"
                            rx="8"
                            fill="#ea580c"
                          />
                          <text
                            x={centerX}
                            y={bar.y - 17}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="900"
                            fill="#ffffff"
                          >
                            ⭐ MÁS ALTO
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Explicación en texto claro para el dueño */}
          <div className="p-3.5 bg-white rounded-2xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-brito-orange-600 shrink-0" />
              Los <strong>fines de semana (Sábados y Domingos)</strong> representan el mayor volumen de venta por la compra familiar de pan dulce y bolillos.
            </span>
            <span className="font-extrabold text-stone-900">
              Promedio diario semanal: {formatCurrency(dailyData.avgVal)}
            </span>
          </div>
        </div>
      )}

      {/* ─── VISTA 2: Gráfica de Porcentaje por Canales (Donut + Tarjetas Claras) ─ */}
      {activeTab === "canales" && (
        <div className="bg-stone-50/70 border border-stone-200/80 rounded-3xl p-5 sm:p-6 space-y-5 animate-in fade-in duration-150">
          <div>
            <h4 className="font-black text-base text-stone-900">
              ¿De dónde entra el dinero a la panadería?
            </h4>
            <p className="text-xs text-stone-500">
              Distribución de cada peso ingresado según el canal de venta.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Donut SVG con Centro Claro */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full transform -rotate-90 select-none overflow-visible"
                >
                  {/* Círculo base */}
                  <circle
                    cx="100"
                    cy="100"
                    r={donutData.radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={donutData.strokeWidth}
                  />

                  {/* Segmentos Donut */}
                  {donutData.segments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="100"
                      cy="100"
                      r={donutData.radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={donutData.strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Centro del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                    Ventas Totales
                  </span>
                  <span className="text-xl font-black text-stone-900 leading-tight mt-0.5">
                    {formatCurrency(pl.grossSales)}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                    100% de Ingresos
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjetas Descriptivas de los 3 Canales */}
            <div className="lg:col-span-7 space-y-3">
              {channels.map((ch) => {
                const Icon = ch.icon;
                return (
                  <div
                    key={ch.id}
                    className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-2 hover:border-stone-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: ch.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-black text-stone-900 text-sm">{ch.name}</h5>
                          <span className="text-[11px] text-stone-500 font-medium">
                            {ch.description}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base sm:text-lg font-black text-stone-900 block">
                          {formatCurrency(ch.amount)}
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border inline-block ${ch.badgeBg}`}>
                          {ch.percent}% del total
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
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
        </div>
      )}
    </div>
  );
}
