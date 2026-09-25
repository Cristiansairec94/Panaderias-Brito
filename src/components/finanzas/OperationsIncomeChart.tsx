"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp, 
  Store, 
  Cake, 
  Sparkles, 
  Calendar, 
  BarChart3, 
  PieChart as PieIcon, 
  Clock, 
  MousePointerClick
} from "lucide-react";
import { FullFinancialSummary, FinancialPeriod } from "@/lib/finanzas";
import { formatCurrency } from "@/lib/utils";

interface OperationsIncomeChartProps {
  summary: FullFinancialSummary;
  plViewMode?: "currency" | "percent";
  period?: FinancialPeriod;
  onPeriodChange?: (period: FinancialPeriod) => void;
}

type ChartTab = "dias" | "canales";
type TimeframeMode = "dia" | "mes" | "anio";

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

export default function OperationsIncomeChart({ 
  summary, 
  period = "mes", 
  onPeriodChange 
}: OperationsIncomeChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("dias");
  const [timeframe, setTimeframe] = useState<TimeframeMode>(
    period === "hoy" ? "dia" : period === "anio" ? "anio" : "mes"
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5); // Sábado por defecto
  const [selectedChannelId, setSelectedChannelId] = useState<string>("counter");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sincronizar timeframe si el periodo exterior cambia
  useEffect(() => {
    if (period === "hoy") {
      setTimeframe("dia");
      setSelectedDayIndex(4);
    } else if (period === "anio") {
      setTimeframe("anio");
      setSelectedDayIndex(11);
    } else {
      setTimeframe("mes");
      setSelectedDayIndex(5);
    }
  }, [period]);

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

  // Manejo del cambio de Día, Mes o Año
  const handleTimeframeChange = (newTf: TimeframeMode) => {
    setTimeframe(newTf);
    if (newTf === "dia") {
      setSelectedDayIndex(4); // 5:00 PM - 8:30 PM
      onPeriodChange?.("hoy");
    } else if (newTf === "mes") {
      setSelectedDayIndex(5); // Sábado
      onPeriodChange?.("mes");
    } else if (newTf === "anio") {
      setSelectedDayIndex(11); // Diciembre
      onPeriodChange?.("anio");
    }
  };

  // ─── Generación Dinámica de Datos para Día, Mes y Año ───────────────────────
  const chartData = useMemo(() => {
    let rawItems: Array<{
      day: string;
      shortDay: string;
      income: number;
      isPeak: boolean;
      note: string;
      rushDetail: string;
    }> = [];

    let titleText = "Ventas Día por Día en la Semana";
    let subtitleText = "Toca una columna para examinar los datos de ese día.";
    let avgLabel = "al día";
    let svgWidth = 720;

    if (timeframe === "dia") {
      titleText = "Ventas por Franjas Horarias del Día";
      subtitleText = "Toca un horario para examinar el flujo de venta y afluencia de clientes.";
      avgLabel = "por turno";
      svgWidth = 720;

      // Base diaria estimada
      const dayTotal = summary.period === "hoy"
        ? pl.grossSales
        : Math.round(pl.grossSales / (summary.period === "anio" ? 318 : summary.period === "mes" ? 26.5 : 6.2)) || 14500;

      const hourlyRatios = [
        { day: "6:00 AM - 8:30 AM", shortDay: "6-8:30 AM", ratio: 0.15, isPeak: false, note: "Apertura y primera salida de bolillo caliente y conchas", rushDetail: "6:30 AM - 8:00 AM" },
        { day: "8:30 AM - 11:30 AM", shortDay: "8:30-11:30", ratio: 0.14, isPeak: false, note: "Desayunos, donas, café y clientes de paso", rushDetail: "9:00 AM - 10:30 AM" },
        { day: "11:30 AM - 2:00 PM", shortDay: "11:30-2 PM", ratio: 0.10, isPeak: false, note: "Pan blanco y teleras para el almuerzo y comidas", rushDetail: "12:30 PM - 1:45 PM" },
        { day: "2:00 PM - 5:00 PM", shortDay: "2-5 PM", ratio: 0.16, isPeak: false, note: "Venta de pasteles de vitrina, pays y repostería", rushDetail: "3:30 PM - 4:45 PM" },
        { day: "5:00 PM - 8:30 PM", shortDay: "5-8:30 PM", ratio: 0.32, isPeak: true, note: "Pico máximo familiar: salida de pan dulce caliente para la merienda", rushDetail: "5:30 PM - 8:00 PM" },
        { day: "8:30 PM - 10:00 PM", shortDay: "8:30-10 PM", ratio: 0.13, isPeak: false, note: "Últimas compras nocturnas y arqueo de caja", rushDetail: "8:45 PM - 9:30 PM" },
      ];

      rawItems = hourlyRatios.map(h => ({
        day: h.day,
        shortDay: h.shortDay,
        income: Math.round(dayTotal * h.ratio),
        isPeak: h.isPeak,
        note: h.note,
        rushDetail: h.rushDetail,
      }));

    } else if (timeframe === "anio") {
      titleText = "Comportamiento Mensual a lo Largo del Año";
      subtitleText = "Toca un mes para examinar la estacionalidad y recaudación acumulada.";
      avgLabel = "al mes";
      svgWidth = 840;

      // Base anual estimada
      const yearTotal = summary.period === "anio"
        ? pl.grossSales
        : Math.round(pl.grossSales * (summary.period === "mes" ? 12 : summary.period === "hoy" ? 318 : 52)) || 4600000;

      const monthRatios = [
        { day: "Enero", shortDay: "Ene", ratio: 0.082, isPeak: false, note: "Rosca de Reyes y arranque de año", rushDetail: "5 y 6 de Enero" },
        { day: "Febrero", shortDay: "Feb", ratio: 0.074, isPeak: false, note: "Día de la Candelaria y San Valentín", rushDetail: "14 de Febrero" },
        { day: "Marzo", shortDay: "Mar", ratio: 0.078, isPeak: false, note: "Inicio de primavera y Cuaresma", rushDetail: "Fines de semana" },
        { day: "Abril", shortDay: "Abr", ratio: 0.076, isPeak: false, note: "Día del Niño y vacaciones", rushDetail: "30 de Abril" },
        { day: "Mayo", shortDay: "May", ratio: 0.098, isPeak: false, note: "Día de las Madres (alta demanda en pastelería)", rushDetail: "9 y 10 de Mayo" },
        { day: "Junio", shortDay: "Jun", ratio: 0.075, isPeak: false, note: "Día del Padre y graduaciones escolares", rushDetail: "3er domingo de Junio" },
        { day: "Julio", shortDay: "Jul", ratio: 0.068, isPeak: false, note: "Vacaciones escolares y temporada de lluvias", rushDetail: "Tardes lluviosas" },
        { day: "Agosto", shortDay: "Ago", ratio: 0.074, isPeak: false, note: "Regreso a clases y reanudación de rutinas", rushDetail: "Última semana" },
        { day: "Septiembre", shortDay: "Sep", ratio: 0.086, isPeak: false, note: "Fiestas Patrias: pambazos y conchas mexicanas", rushDetail: "15 y 16 de Septiembre" },
        { day: "Octubre", shortDay: "Oct", ratio: 0.095, isPeak: false, note: "Arranque de temporada de Pan de Muerto", rushDetail: "Segunda quincena" },
        { day: "Noviembre", shortDay: "Nov", ratio: 0.106, isPeak: false, note: "Día de Muertos y frío otoñal", rushDetail: "1 y 2 de Noviembre" },
        { day: "Diciembre", shortDay: "Dic", ratio: 0.118, isPeak: true, note: "Temporada Navideña, posadas y fin de año (RÉCORD ANUAL)", rushDetail: "15 al 31 de Diciembre" },
      ];

      rawItems = monthRatios.map(m => ({
        day: m.day,
        shortDay: m.shortDay,
        income: Math.round(yearTotal * m.ratio),
        isPeak: m.isPeak,
        note: m.note,
        rushDetail: m.rushDetail,
      }));

    } else {
      // timeframe === "mes" (Días de la semana)
      titleText = "Ventas Día por Día en el Mes";
      subtitleText = "Toca una columna para examinar los datos de ese día de la semana.";
      avgLabel = "al día";
      svgWidth = 720;

      const days = cashFlow && cashFlow.length > 0 ? cashFlow : [];
      const defaultNotes: Record<string, { note: string; rush: string }> = {
        Lunes: { note: "Inicio de semana laboral y reposición de mostrador", rush: "6:30 PM - 8:30 PM" },
        Martes: { note: "Día constante en venta de bolillo y pan dulce", rush: "6:00 PM - 8:00 PM" },
        Miércoles: { note: "Mitad de semana con buen flujo en repostería", rush: "5:30 PM - 8:00 PM" },
        Jueves: { note: "Aumento de pedidos y anticipos para el fin de semana", rush: "5:30 PM - 8:30 PM" },
        Viernes: { note: "Viernes social: sube venta de pasteles y pan de fiesta", rush: "5:00 PM - 8:30 PM" },
        Sábado: { note: "Día récord de la semana con alta afluencia familiar", rush: "5:00 PM - 9:00 PM" },
        Domingo: { note: "Desayunos familiares y meriendas dominicales", rush: "8:00 AM - 1:00 PM" },
      };

      rawItems = days.map(d => ({
        day: d.day,
        shortDay: d.shortDay,
        income: d.income,
        isPeak: d.isPeak,
        note: defaultNotes[d.day]?.note || "Operación regular en panadería",
        rushDetail: defaultNotes[d.day]?.rush || "5:30 PM - 8:30 PM",
      }));
    }

    const maxVal = Math.max(...rawItems.map(d => d.income), 1000);
    const avgVal = rawItems.length > 0 ? Math.round(rawItems.reduce((a, b) => a + b.income, 0) / rawItems.length) : 0;
    
    // Identificar el pico absoluto
    const peakItem = rawItems.reduce((prev, curr) => (curr.income > prev.income ? curr : prev), rawItems[0] || { day: "Sábado", income: 0 });

    const svgHeight = 290;
    const paddingLeft = 45;
    const paddingRight = 25;
    const paddingTop = 60; // Espacio superior generoso
    const paddingBottom = 55;
    const chartHeight = svgHeight - paddingTop - paddingBottom;
    const chartWidth = svgWidth - paddingLeft - paddingRight;

    // Escala con 25% de margen superior para holgura total
    const scaleMax = maxVal * 1.25;
    const slotWidth = rawItems.length > 0 ? chartWidth / rawItems.length : chartWidth;
    const barWidth = Math.min(timeframe === "anio" ? 36 : 48, slotWidth * 0.54);

    const bars = rawItems.map((d, i) => {
      const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      const barHeight = Math.max(16, (d.income / scaleMax) * chartHeight);
      const y = paddingTop + (chartHeight - barHeight);
      const isAbsolutePeak = d.day === peakItem.day;
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
      avgLabel,
      titleText,
      subtitleText,
      peakItem,
      bars,
    };
  }, [timeframe, cashFlow, pl.grossSales, summary.period]);

  // Elemento actualmente seleccionado
  const selectedItem = chartData.bars[selectedDayIndex] || chartData.bars[0] || null;

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
      {/* ─── Encabezado y Selectores Elegantes ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
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
            Haz clic en cualquier {timeframe === "dia" ? "horario" : timeframe === "anio" ? "mes" : "día"} o canal para ver su desglose detallado.
          </p>
        </div>

        {/* ─── Botones de Control: Selector de Tiempo (Día | Mes | Año) y Tipo de Vista ─── */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {/* Botón Selector de Tiempo: Día, Mes y Año con los colores de la gráfica */}
          <div className="flex items-center gap-1 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => handleTimeframeChange("dia")}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                timeframe === "dia"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
              }`}
              title="Ver ventas por franjas horarias del día"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Día</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange("mes")}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                timeframe === "mes"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
              }`}
              title="Ver ventas por día en el mes"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeframeChange("anio")}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                timeframe === "anio"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20 scale-[1.02]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
              }`}
              title="Ver ventas mes a mes en el año"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Año</span>
            </button>
          </div>

          {/* Selector de Pestaña: Gráfica de Barras vs Canales */}
          <div className="flex items-center gap-1 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("dias")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                activeTab === "dias"
                  ? "bg-stone-900 text-white shadow-md shadow-stone-900/15"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>
                {timeframe === "dia" ? "Ventas del Día" : timeframe === "anio" ? "Ventas del Año" : "Ventas por Día"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("canales")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 whitespace-nowrap ${
                activeTab === "canales"
                  ? "bg-brito-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
              }`}
            >
              <PieIcon className="w-4 h-4 text-white" />
              <span>Por Canal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── VISTA 1: Gráfica de Barras (Día, Mes o Año sin amontonamiento) ─── */}
      {activeTab === "dias" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-stone-50/80 border border-stone-200/90 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
                  <span>{chartData.titleText}</span>
                </h4>
                <p className="text-xs text-stone-500">
                  {chartData.subtitleText}
                </p>
              </div>

              {/* Leyenda y Promedio */}
              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <span className="flex items-center gap-1.5 text-stone-600">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> Regular
                </span>
                <span className="flex items-center gap-1.5 text-orange-700 font-black">
                  <span className="w-3 h-3 rounded-md bg-brito-orange-600 inline-block" /> Récord
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-extrabold text-[11px]">
                  Promedio: {formatCurrency(chartData.avgVal)} {chartData.avgLabel}
                </span>
              </div>
            </div>

            {/* Canvas SVG de Barras con Separación Limpia */}
            <div className="w-full overflow-x-auto pt-1 pb-1">
              <div className={timeframe === "anio" ? "min-w-[760px]" : "min-w-[620px]"}>
                <svg
                  viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`}
                  className="w-full h-auto select-none"
                >
                  {/* Línea horizontal de base */}
                  <line
                    x1={chartData.paddingLeft}
                    y1={chartData.baselineY}
                    x2={chartData.svgWidth - chartData.paddingRight}
                    y2={chartData.baselineY}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />

                  {/* Línea punteada sutil del promedio */}
                  <line
                    x1={chartData.paddingLeft}
                    y1={chartData.avgY}
                    x2={chartData.svgWidth - chartData.paddingRight}
                    y2={chartData.avgY}
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.65"
                  />

                  {/* Renderizado de cada barra */}
                  {chartData.bars.map((bar) => {
                    const isSelected = selectedDayIndex === bar.index;
                    const isHovered = hoveredIndex === bar.index;
                    const centerX = bar.x + bar.barWidth / 2;

                    return (
                      <g
                        key={`${timeframe}-${bar.day}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedDayIndex(bar.index)}
                        onMouseEnter={() => setHoveredIndex(bar.index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Zona de clic amplia */}
                        <rect
                          x={bar.x - 8}
                          y={chartData.paddingTop - 20}
                          width={bar.barWidth + 16}
                          height={chartData.chartHeight + 45}
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
                          fontSize={timeframe === "anio" ? "10" : "11"}
                          fontWeight={isSelected ? "900" : "800"}
                          fill={bar.isAbsolutePeak ? "#c2410c" : "#065f46"}
                        >
                          {formatCompact(bar.income)}
                        </text>

                        {/* Insignia clara de pico (solo para el elemento récord) */}
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

                        {/* Nombre corto en el eje X */}
                        <text
                          x={centerX}
                          y={chartData.baselineY + 22}
                          textAnchor="middle"
                          fontSize={timeframe === "anio" ? "11" : "13"}
                          fontWeight={isSelected ? "900" : "700"}
                          fill={isSelected ? "#ea580c" : "#1c1917"}
                        >
                          {bar.shortDay}
                        </text>

                        {/* Etiqueta secundaria en el eje X */}
                        {timeframe !== "dia" && (
                          <text
                            x={centerX}
                            y={chartData.baselineY + 38}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="600"
                            fill={isSelected ? "#c2410c" : "#78716c"}
                          >
                            {bar.day}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* ─── PANEL DE DETALLE PRECISO Y CONCISO DEL ELEMENTO SELECCIONADO ─── */}
          {selectedItem && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-orange-400/80 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-100 text-brito-orange-600 flex items-center justify-center font-black text-lg shadow-xs">
                    {timeframe === "dia" ? "⏰" : timeframe === "anio" ? "🗓️" : "📅"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-black text-stone-900">
                        Detalle: {selectedItem.day}
                      </h4>
                      {selectedItem.isAbsolutePeak && (
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black border border-orange-300">
                          ⭐ Momento Más Fuerte ({timeframe === "dia" ? "Horario Pico" : timeframe === "anio" ? "Mes Récord" : "Día Récord"})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {selectedItem.note}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 font-bold block uppercase tracking-wider">
                    {timeframe === "dia" ? "Venta Estimada del Turno" : timeframe === "anio" ? "Venta Acumulada del Mes" : "Venta Total del Día"}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900">
                    {formatCurrency(selectedItem.income)}
                  </span>
                </div>
              </div>

              {/* Desglose en 4 datos precisos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Comparativa vs Promedio */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[11px] font-bold text-stone-500 block">
                    Comparado con promedio {chartData.avgLabel}
                  </span>
                  <p className={`text-base font-black ${selectedItem.diffFromAvg >= 0 ? "text-emerald-700" : "text-stone-700"}`}>
                    {selectedItem.diffFromAvg >= 0 ? `+${selectedItem.diffFromAvg}%` : `${selectedItem.diffFromAvg}%`}
                  </p>
                  <span className="text-[10px] text-stone-500 font-medium block">
                    {selectedItem.diffFromAvg >= 0 ? "Por encima del promedio" : "Por debajo del promedio"}
                  </span>
                </div>

                {/* Mostrador Estimado */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 block flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Mostrador ({channels[0].percent}%)
                  </span>
                  <p className="text-base font-black text-emerald-950">
                    {formatCurrency(Math.round(selectedItem.income * (channels[0].percent / 100)))}
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
                    {formatCurrency(Math.round(selectedItem.income * (channels[1].percent / 100)))}
                  </p>
                  <span className="text-[10px] text-orange-700 font-medium block">
                    Pedidos especiales y eventos
                  </span>
                </div>

                {/* Horario o Fecha Clave */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                  <span className="text-[11px] font-bold text-amber-800 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {timeframe === "anio" ? "Fecha de Mayor Demanda" : "Horario de Salida Caliente"}
                  </span>
                  <p className="text-xs font-black text-amber-950">
                    {selectedItem.rushDetail}
                  </p>
                  <span className="text-[10px] text-amber-800 font-medium block">
                    {timeframe === "anio" ? "Fechas de mayor venta del mes" : "Mayor afluencia de clientes"}
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
