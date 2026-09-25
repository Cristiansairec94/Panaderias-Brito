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
  Award,
  Clock,
  Users,
  ChevronRight,
  MousePointerClick
} from "lucide-react";
import { FullFinancialSummary, CashFlowDay } from "@/lib/finanzas";
import { formatCurrency } from "@/lib/utils";

interface OperationsIncomeChartProps {
  summary: FullFinancialSummary;
  plViewMode?: "currency" | "percent";
}

type ChartTab = "dias" | "canales";

// Formato compacto para las barras (evita que los números largos choquen)
function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`;
  }
  return `$${Math.round(amount)}`;
}

export default function OperationsIncomeChart({ summary }: OperationsIncomeChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("dias");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5); // Sábado por defecto
  const [selectedChannelId, setSelectedChannelId] = useState<string>("counter");
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
      description: "Venta directa al cliente en charolas y mostrador.",
      tip: "Flujo diario constante en efectivo y tarjeta. Clave mantener cambio en gavetas.",
    },
    {
      id: "orders",
      name: "Pasteles & Pedidos Especiales",
      shortName: "Pasteles & Encargos",
      amount: pl.ordersSales,
      percent: Number(((pl.ordersSales / safeTotal) * 100).toFixed(1)),
      color: "#ea580c", // Brito Orange
      badgeBg: "bg-orange-100 text-orange-800 border-orange-200",
      barColor: "bg-orange-500",
      icon: Cake,
      description: "Pastelería de vitrina, tres leches y pedidos de eventos.",
      tip: "Pedidos especiales cobrados con anticipo del 50%. Genera alto margen de ganancia.",
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
      tip: "Ingreso complementario que amortiza gastos menores de insumos.",
    },
  ], [pl.counterSales, pl.ordersSales, pl.otherIncomes, safeTotal]);

  // Cálculos de la Gráfica de Barras Diarias con ESPACIO GENEROSO
  const dailyData = useMemo(() => {
    const days = cashFlow && cashFlow.length > 0 ? cashFlow : [];
    const maxVal = Math.max(...days.map((d) => d.income), 1000);
    const avgVal = days.length > 0 ? Math.round(days.reduce((a, b) => a + b.income, 0) / days.length) : 0;
    
    // Identificar el día récord absoluto
    const peakDay = days.reduce((prev, curr) => (curr.income > prev.income ? curr : prev), days[0] || { day: "Sábado", income: 0 });

    const svgWidth = 720;
    const svgHeight = 290;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 60; // Mucho espacio arriba para que NUNCA choquen números y badges
    const paddingBottom = 55;
    const chartHeight = svgHeight - paddingTop - paddingBottom;
    const chartWidth = svgWidth - paddingLeft - paddingRight;

    // Escala con 25% de margen superior para holgura total
    const scaleMax = maxVal * 1.25;
    const slotWidth = days.length > 0 ? chartWidth / days.length : chartWidth;
    const barWidth = Math.min(48, slotWidth * 0.52);

    const bars = days.map((d, i) => {
      const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      const barHeight = Math.max(16, (d.income / scaleMax) * chartHeight);
      const y = paddingTop + (chartHeight - barHeight);
      const isAbsolutePeak = d.day === peakDay.day;
      const diffFromAvg = Math.round(((d.income - avgVal) / (avgVal || 1)) * 100);

      return {
        ...d,
        index: i,
        x,
        y,
        barWidth,
        barHeight,
        isAbsolutePeak,
        diffFromAvg,
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

  // Día actualmente seleccionado
  const selectedDay = dailyData.bars[selectedDayIndex] || dailyData.bars[0] || null;

  // Canal actualmente seleccionado
  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Cálculos para la gráfica de Donut
  const donutData = useMemo(() => {
    const radius = 70;
    const strokeWidth = 26;
    const circumference = 2 * Math.PI * radius;
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
          <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-brito-orange-600" />
            Haz clic en cualquier día o canal para ver su desglose detallado.
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

      {/* ─── VISTA 1: Gráfica de Barras por Día (Espaciosa, sin amontonamiento) ─── */}
      {activeTab === "dias" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-stone-50/80 border border-stone-200/90 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
                  <span>Ventas Día por Día en la Semana</span>
                </h4>
                <p className="text-xs text-stone-500">
                  Toca una columna para examinar los datos de ese día.
                </p>
              </div>

              {/* Leyenda y Promedio */}
              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <span className="flex items-center gap-1.5 text-stone-600">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Día regular
                </span>
                <span className="flex items-center gap-1.5 text-orange-700 font-black">
                  <span className="w-3 h-3 rounded-md bg-brito-orange-600 inline-block" /> Día récord
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-extrabold text-[11px]">
                  Promedio: {formatCurrency(dailyData.avgVal)}/día
                </span>
              </div>
            </div>

            {/* Canvas SVG de Barras con Separación Limpia */}
            <div className="w-full overflow-x-auto pt-1 pb-1">
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

                  {/* Línea punteada sutil del promedio */}
                  <line
                    x1={dailyData.paddingLeft}
                    y1={dailyData.avgY}
                    x2={dailyData.svgWidth - dailyData.paddingRight}
                    y2={dailyData.avgY}
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.65"
                  />

                  {/* Renderizado de cada barra de día */}
                  {dailyData.bars.map((bar) => {
                    const isSelected = selectedDayIndex === bar.index;
                    const isHovered = hoveredIndex === bar.index;
                    const centerX = bar.x + bar.barWidth / 2;

                    return (
                      <g
                        key={bar.day}
                        className="cursor-pointer"
                        onClick={() => setSelectedDayIndex(bar.index)}
                        onMouseEnter={() => setHoveredIndex(bar.index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Zona de clic amplia */}
                        <rect
                          x={bar.x - 10}
                          y={dailyData.paddingTop - 20}
                          width={bar.barWidth + 20}
                          height={dailyData.chartHeight + 45}
                          rx="14"
                          fill={isSelected ? "rgba(249, 115, 22, 0.12)" : isHovered ? "rgba(0, 0, 0, 0.04)" : "transparent"}
                          className="transition-all duration-150"
                        />

                        {/* Indicador de selección activa */}
                        {isSelected && (
                          <rect
                            x={bar.x - 4}
                            y={bar.y - 4}
                            width={bar.barWidth + 8}
                            height={bar.barHeight + 8}
                            rx="12"
                            fill="none"
                            stroke="#ea580c"
                            strokeWidth="2.5"
                            strokeDasharray="3 3"
                            className="animate-pulse"
                          />
                        )}

                        {/* Barra */}
                        <rect
                          x={bar.x}
                          y={bar.y}
                          width={bar.barWidth}
                          height={bar.barHeight}
                          rx="8"
                          fill={bar.isAbsolutePeak ? "#ea580c" : "#10b981"}
                          opacity={isSelected ? 1 : isHovered ? 0.95 : 0.85}
                          className="transition-all duration-150"
                        />

                        {/* Monto compacto arriba de la barra (limpio, sin chocar) */}
                        <text
                          x={centerX}
                          y={bar.y - 8}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isSelected ? "900" : "800"}
                          fill={bar.isAbsolutePeak ? "#c2410c" : "#065f46"}
                        >
                          {formatCompact(bar.income)}
                        </text>

                        {/* Insignia clara de pico (solo para el día más fuerte) */}
                        {bar.isAbsolutePeak && (
                          <g transform={`translate(${centerX - 24}, ${bar.y - 34})`}>
                            <rect
                              width="48"
                              height="18"
                              rx="9"
                              fill="#ea580c"
                              className="shadow-sm"
                            />
                            <text
                              x="24"
                              y="12"
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="900"
                              fill="#ffffff"
                            >
                              ⭐ RÉCORD
                            </text>
                          </g>
                        )}

                        {/* Nombre del día en el eje X */}
                        <text
                          x={centerX}
                          y={dailyData.baselineY + 22}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight={isSelected ? "900" : "700"}
                          fill={isSelected ? "#ea580c" : "#1c1917"}
                        >
                          {bar.shortDay}
                        </text>

                        {/* Nombre completo */}
                        <text
                          x={centerX}
                          y={dailyData.baselineY + 38}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill={isSelected ? "#c2410c" : "#78716c"}
                        >
                          {bar.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* ─── PANEL DE DETALLE PRECISO Y CONCISO DEL DÍA SELECCIONADO ─── */}
          {selectedDay && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-orange-400/80 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-100 text-brito-orange-600 flex items-center justify-center font-black text-lg shadow-xs">
                    📅
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-black text-stone-900">
                        Detalle del {selectedDay.day}
                      </h4>
                      {selectedDay.isAbsolutePeak && (
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black border border-orange-300">
                          ⭐ Día Más Alto de la Semana
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      Datos precisos y concisos calculados para este día de jornada
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 font-bold block uppercase tracking-wider">
                    Venta Total del Día
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900">
                    {formatCurrency(selectedDay.income)}
                  </span>
                </div>
              </div>

              {/* Desglose en 4 datos precisos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Comparativa vs Promedio */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] font-bold text-stone-500 block">
                    Comparado con el promedio
                  </span>
                  <p className={`text-base font-black ${selectedDay.diffFromAvg >= 0 ? "text-emerald-700" : "text-stone-700"}`}>
                    {selectedDay.diffFromAvg >= 0 ? `+${selectedDay.diffFromAvg}%` : `${selectedDay.diffFromAvg}%`}
                  </p>
                  <span className="text-[10px] text-stone-500 font-medium block">
                    {selectedDay.diffFromAvg >= 0 ? "Por encima del promedio diario" : "Por debajo del promedio diario"}
                  </span>
                </div>

                {/* Mostrador Estimado */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 block flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Mostrador ({channels[0].percent}%)
                  </span>
                  <p className="text-base font-black text-emerald-950">
                    {formatCurrency(Math.round(selectedDay.income * (channels[0].percent / 100)))}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    Venta directa en vitrina y canastos
                  </span>
                </div>

                {/* Pasteles & Encargos Estimados */}
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-1">
                  <span className="text-[11px] font-bold text-orange-800 block flex items-center gap-1">
                    <Cake className="w-3.5 h-3.5" /> Pasteles ({channels[1].percent}%)
                  </span>
                  <p className="text-base font-black text-orange-950">
                    {formatCurrency(Math.round(selectedDay.income * (channels[1].percent / 100)))}
                  </p>
                  <span className="text-[10px] text-orange-700 font-medium block">
                    Pedidos especiales y eventos
                  </span>
                </div>

                {/* Horario de Mayor Venta */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <span className="text-[11px] font-bold text-amber-800 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Horario Recomendado
                  </span>
                  <p className="text-xs font-black text-amber-950">
                    5:30 PM - 8:30 PM
                  </p>
                  <span className="text-[10px] text-amber-800 font-medium block">
                    Mayor afluencia por salida de pan caliente
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA 2: Gráfica de Porcentaje por Canales (Interactiva con Selección) ─ */}
      {activeTab === "canales" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-stone-50/80 border border-stone-200/90 rounded-3xl p-5 sm:p-6 space-y-5">
            <div>
              <h4 className="font-black text-base text-stone-900">
                ¿De dónde entra el dinero a la panadería?
              </h4>
              <p className="text-xs text-stone-500">
                Haz clic en cualquier canal para ver su análisis conciso.
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

                    {/* Segmentos Donut Interactivos */}
                    {donutData.segments.map((seg) => {
                      const isSelected = selectedChannelId === seg.id;
                      return (
                        <circle
                          key={seg.id}
                          cx="100"
                          cy="100"
                          r={donutData.radius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth={isSelected ? donutData.strokeWidth + 5 : donutData.strokeWidth}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          onClick={() => setSelectedChannelId(seg.id)}
                          className="transition-all duration-200 cursor-pointer"
                        />
                      );
                    })}
                  </svg>

                  {/* Centro del Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                      {selectedChannel.shortName}
                    </span>
                    <span className="text-xl font-black text-stone-900 leading-tight mt-0.5">
                      {formatCurrency(selectedChannel.amount)}
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                      {selectedChannel.percent}% del total
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjetas Descriptivas de los 3 Canales (Seleccionables) */}
              <div className="lg:col-span-7 space-y-3">
                {channels.map((ch) => {
                  const Icon = ch.icon;
                  const isSelected = selectedChannelId === ch.id;

                  return (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected 
                          ? "bg-white border-2 border-orange-400 shadow-md ring-2 ring-orange-400/20 scale-[1.01]" 
                          : "bg-white/80 border-stone-200 hover:border-stone-300 shadow-xs"
                      }`}
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
          </div>

          {/* Panel de Datos Precisos del Canal Seleccionado */}
          <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                Análisis Operativo: {selectedChannel.name}
              </span>
              <span className="font-black text-stone-900 text-sm">
                Total acumulado: {formatCurrency(selectedChannel.amount)}
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium">
              💡 <strong>Recomendación para Don Toño:</strong> {selectedChannel.tip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
