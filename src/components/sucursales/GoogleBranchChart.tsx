"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Croissant, 
  Receipt, 
  Target, 
  Calendar, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  Filter,
  BarChart2,
  CalendarRange,
  RotateCcw
} from "lucide-react";
import { Branch } from "@/types";
import { formatCurrency } from "@/lib/utils";

export type PeriodType = "hoy" | "semana" | "mes" | "año" | "custom";
export type MetricType = "dinero" | "piezas" | "tickets" | "meta";
export type ChartViewMode = "consolidado" | "comparativo";

interface GoogleBranchChartProps {
  branches: Branch[];
  selectedPeriod: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  onSimulateSale?: (branchId?: string) => void;
}

interface DataPoint {
  label: string;
  subLabel?: string;
  dateKey: string;
  // Consolidated
  totalMoney: number;
  totalPieces: number;
  totalTickets: number;
  // Per branch
  branchesData: {
    [branchId: string]: {
      money: number;
      pieces: number;
      tickets: number;
    };
  };
}

export default function GoogleBranchChart({
  branches,
  selectedPeriod,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onSimulateSale,
}: GoogleBranchChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("dinero");
  const [viewMode, setViewMode] = useState<ChartViewMode>("consolidado");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const [showDatePicker, setShowDatePicker] = useState(selectedPeriod === "custom");

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Generate data points based on period and real-time branch sales
  const dataPoints: DataPoint[] = useMemo(() => {
    // Current live totals to ground the synthetic historical points
    const liveMatriz = branches.find((b) => b.code.includes("MAT"))?.todaySales || 5480;
    const liveBenito = branches.find((b) => b.code.includes("BEN"))?.todaySales || 4120;
    const liveFlores = branches.find((b) => b.code.includes("FLO"))?.todaySales || 4890;

    // Average price per piece of bakery bread ~ $16.5 MXN
    const calcPieces = (amount: number) => Math.round(amount / 16.5);
    const calcTickets = (amount: number) => Math.max(1, Math.round(amount / 95));

    if (selectedPeriod === "hoy") {
      // 12 points representing operating hours: 06:00 to 21:00
      const hours = [
        "06:00", "07:30", "09:00", "10:30", "12:00", 
        "13:30", "15:00", "16:30", "18:00", "19:30", "20:30", "21:00"
      ];
      const hourWeights = [0.05, 0.14, 0.12, 0.08, 0.09, 0.07, 0.06, 0.11, 0.15, 0.08, 0.03, 0.02];

      return hours.map((hour, idx) => {
        const weight = hourWeights[idx];
        const mMoney = Math.round(liveMatriz * weight * 1.8);
        const bMoney = Math.round(liveBenito * weight * 1.8);
        const fMoney = Math.round(liveFlores * weight * 1.8);

        const totalMoney = mMoney + bMoney + fMoney;
        const totalPieces = calcPieces(totalMoney);
        const totalTickets = calcTickets(totalMoney);

        return {
          label: hour,
          subLabel: "Hoy",
          dateKey: `hoy-${hour}`,
          totalMoney,
          totalPieces,
          totalTickets,
          branchesData: {
            "branch-matriz": { money: mMoney, pieces: calcPieces(mMoney), tickets: calcTickets(mMoney) },
            "branch-benito": { money: bMoney, pieces: calcPieces(bMoney), tickets: calcTickets(bMoney) },
            "branch-flores": { money: fMoney, pieces: calcPieces(fMoney), tickets: calcTickets(fMoney) },
          },
        };
      });
    }

    if (selectedPeriod === "semana") {
      // 7 Days: Lunes a Domingo
      const days = [
        { name: "Lunes", date: "25 Ago", factor: 0.9 },
        { name: "Martes", date: "26 Ago", factor: 0.95 },
        { name: "Miércoles", date: "27 Ago", factor: 1.05 },
        { name: "Jueves", date: "28 Ago", factor: 1.0 },
        { name: "Viernes", date: "29 Ago", factor: 1.25 },
        { name: "Sábado", date: "30 Ago", factor: 1.45 },
        { name: "Domingo", date: "31 Ago", factor: 1.35 },
      ];

      return days.map((d) => {
        const mMoney = Math.round(liveMatriz * d.factor);
        const bMoney = Math.round(liveBenito * d.factor);
        const fMoney = Math.round(liveFlores * d.factor);

        const totalMoney = mMoney + bMoney + fMoney;
        const totalPieces = calcPieces(totalMoney);
        const totalTickets = calcTickets(totalMoney);

        return {
          label: d.name,
          subLabel: d.date,
          dateKey: d.date,
          totalMoney,
          totalPieces,
          totalTickets,
          branchesData: {
            "branch-matriz": { money: mMoney, pieces: calcPieces(mMoney), tickets: calcTickets(mMoney) },
            "branch-benito": { money: bMoney, pieces: calcPieces(bMoney), tickets: calcTickets(bMoney) },
            "branch-flores": { money: fMoney, pieces: calcPieces(fMoney), tickets: calcTickets(fMoney) },
          },
        };
      });
    }

    if (selectedPeriod === "mes") {
      // 4 Weeks or 10 checkpoints across the month
      const points = [
        { label: "Día 1-3", sub: "Sem 1", factor: 2.8 },
        { label: "Día 4-6", sub: "Sem 1", factor: 3.1 },
        { label: "Día 7-9", sub: "Sem 2", factor: 2.9 },
        { label: "Día 10-13", sub: "Sem 2", factor: 3.3 },
        { label: "Día 14-16", sub: "Sem 3 (Quincena)", factor: 4.2 },
        { label: "Día 17-20", sub: "Sem 3", factor: 3.0 },
        { label: "Día 21-24", sub: "Sem 4", factor: 3.2 },
        { label: "Día 25-27", sub: "Sem 4", factor: 3.5 },
        { label: "Día 28-30", sub: "Fin de Mes", factor: 4.5 },
      ];

      return points.map((p) => {
        const mMoney = Math.round(liveMatriz * p.factor);
        const bMoney = Math.round(liveBenito * p.factor);
        const fMoney = Math.round(liveFlores * p.factor);

        const totalMoney = mMoney + bMoney + fMoney;
        const totalPieces = calcPieces(totalMoney);
        const totalTickets = calcTickets(totalMoney);

        return {
          label: p.label,
          subLabel: p.sub,
          dateKey: p.label,
          totalMoney,
          totalPieces,
          totalTickets,
          branchesData: {
            "branch-matriz": { money: mMoney, pieces: calcPieces(mMoney), tickets: calcTickets(mMoney) },
            "branch-benito": { money: bMoney, pieces: calcPieces(bMoney), tickets: calcTickets(bMoney) },
            "branch-flores": { money: fMoney, pieces: calcPieces(fMoney), tickets: calcTickets(fMoney) },
          },
        };
      });
    }

    if (selectedPeriod === "año") {
      // 12 Months
      const months = [
        { name: "Ene", factor: 26 },
        { name: "Feb", factor: 28 },
        { name: "Mar", factor: 29 },
        { name: "Abr", factor: 30 },
        { name: "May", factor: 32 },
        { name: "Jun", factor: 29 },
        { name: "Jul", factor: 28 },
        { name: "Ago", factor: 31 },
        { name: "Sep", factor: 34 },
        { name: "Oct", factor: 37 },
        { name: "Nov", factor: 39 },
        { name: "Dic", factor: 44 },
      ];

      return months.map((m) => {
        const mMoney = Math.round(liveMatriz * m.factor);
        const bMoney = Math.round(liveBenito * m.factor);
        const fMoney = Math.round(liveFlores * m.factor);

        const totalMoney = mMoney + bMoney + fMoney;
        const totalPieces = calcPieces(totalMoney);
        const totalTickets = calcTickets(totalMoney);

        return {
          label: m.name,
          subLabel: "2026",
          dateKey: m.name,
          totalMoney,
          totalPieces,
          totalTickets,
          branchesData: {
            "branch-matriz": { money: mMoney, pieces: calcPieces(mMoney), tickets: calcTickets(mMoney) },
            "branch-benito": { money: bMoney, pieces: calcPieces(bMoney), tickets: calcTickets(bMoney) },
            "branch-flores": { money: fMoney, pieces: calcPieces(fMoney), tickets: calcTickets(fMoney) },
          },
        };
      });
    }

    // Custom date range: calculate days between start and end
    const start = new Date(customStartDate || "2026-08-20");
    const end = new Date(customEndDate || "2026-09-02");
    const diffTime = Math.max(86400000, end.getTime() - start.getTime());
    const diffDays = Math.min(30, Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));

    const points = [];
    for (let i = 0; i <= diffDays; i++) {
      const cur = new Date(start.getTime() + i * 86400000);
      const dayLabel = cur.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
      const weekday = cur.toLocaleDateString("es-MX", { weekday: "short" });
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;
      const factor = isWeekend ? 1.35 : 0.95 + ((i * 7) % 5) * 0.05;

      const mMoney = Math.round(liveMatriz * factor);
      const bMoney = Math.round(liveBenito * factor);
      const fMoney = Math.round(liveFlores * factor);

      const totalMoney = mMoney + bMoney + fMoney;
      const totalPieces = calcPieces(totalMoney);
      const totalTickets = calcTickets(totalMoney);

      points.push({
        label: dayLabel,
        subLabel: weekday,
        dateKey: `custom-${i}`,
        totalMoney,
        totalPieces,
        totalTickets,
        branchesData: {
          "branch-matriz": { money: mMoney, pieces: calcPieces(mMoney), tickets: calcTickets(mMoney) },
          "branch-benito": { money: bMoney, pieces: calcPieces(bMoney), tickets: calcTickets(bMoney) },
          "branch-flores": { money: fMoney, pieces: calcPieces(fMoney), tickets: calcTickets(fMoney) },
        },
      });
    }
    return points;
  }, [selectedPeriod, customStartDate, customEndDate, branches]);

  // Aggregate totals across data points for scorecards
  const aggregated = useMemo(() => {
    const totalMoney = dataPoints.reduce((acc, p) => acc + p.totalMoney, 0);
    const totalPieces = dataPoints.reduce((acc, p) => acc + p.totalPieces, 0);
    const totalTickets = dataPoints.reduce((acc, p) => acc + p.totalTickets, 0);
    
    // Total goal calculation
    const dailyChainGoal = branches.reduce((acc, b) => acc + b.dailyGoal, 0);
    let goalMultiplier = 1;
    if (selectedPeriod === "hoy") goalMultiplier = 1;
    else if (selectedPeriod === "semana") goalMultiplier = 7;
    else if (selectedPeriod === "mes") goalMultiplier = 30;
    else if (selectedPeriod === "año") goalMultiplier = 365;
    else goalMultiplier = Math.max(1, dataPoints.length);

    const totalGoal = dailyChainGoal * goalMultiplier;
    const percentGoal = Math.min(100, Math.round((totalMoney / totalGoal) * 100));

    return {
      totalMoney,
      totalPieces,
      totalTickets,
      averageTicket: totalTickets > 0 ? totalMoney / totalTickets : 0,
      totalGoal,
      percentGoal,
    };
  }, [dataPoints, branches, selectedPeriod]);

  // SVG dimensions and coordinate mapping
  const width = 840;
  const height = 300;
  const padding = { top: 25, right: 35, bottom: 45, left: 65 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute maximum value based on activeMetric
  const maxValue = useMemo(() => {
    let max = 0;
    dataPoints.forEach((p) => {
      if (activeMetric === "dinero") {
        if (viewMode === "consolidado") max = Math.max(max, p.totalMoney);
        else {
          Object.values(p.branchesData).forEach((b) => {
            max = Math.max(max, b.money);
          });
        }
      } else if (activeMetric === "piezas") {
        if (viewMode === "consolidado") max = Math.max(max, p.totalPieces);
        else {
          Object.values(p.branchesData).forEach((b) => {
            max = Math.max(max, b.pieces);
          });
        }
      } else if (activeMetric === "tickets") {
        if (viewMode === "consolidado") max = Math.max(max, p.totalTickets);
        else {
          Object.values(p.branchesData).forEach((b) => {
            max = Math.max(max, b.tickets);
          });
        }
      } else {
        // Meta
        max = 100;
      }
    });
    return max > 0 ? max * 1.15 : 100;
  }, [dataPoints, activeMetric, viewMode]);

  // Helper coordinate mapper
  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (dataPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxValue, val));
    return padding.top + chartHeight - (clamped / maxValue) * chartHeight;
  };

  // Build SVG path with smooth cubic curves
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i !== points.length - 2 ? points[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const buildAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const linePath = buildSmoothPath(points);
    const bottomY = padding.top + chartHeight;
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Points for consolidated
  const consolidatedPoints = useMemo(() => {
    return dataPoints.map((p, idx) => {
      let val = p.totalMoney;
      if (activeMetric === "piezas") val = p.totalPieces;
      if (activeMetric === "tickets") val = p.totalTickets;
      if (activeMetric === "meta") val = Math.min(100, Math.round((p.totalMoney / ((aggregated.totalGoal / dataPoints.length) || 1)) * 100));
      return { x: getX(idx), y: getY(val), val };
    });
  }, [dataPoints, activeMetric, aggregated, maxValue]);

  // Points for per-branch lines
  const branchLines = useMemo(() => {
    const list = [
      { id: "branch-matriz", name: "Matriz (Centro)", color: "#ea580c", bgGradient: "url(#matrizGrad)" },
      { id: "branch-benito", name: "San Benito", color: "#e11d48", bgGradient: "url(#benitoGrad)" },
      { id: "branch-flores", name: "Las Flores", color: "#d97706", bgGradient: "url(#floresGrad)" },
    ];

    return list.map((b) => {
      const points = dataPoints.map((p, idx) => {
        const item = p.branchesData[b.id] || { money: 0, pieces: 0, tickets: 0 };
        let val = item.money;
        if (activeMetric === "piezas") val = item.pieces;
        if (activeMetric === "tickets") val = item.tickets;
        if (activeMetric === "meta") val = Math.min(100, Math.round((item.money / 10000) * 100));
        return { x: getX(idx), y: getY(val), val };
      });
      return {
        ...b,
        points,
        linePath: buildSmoothPath(points),
        areaPath: buildAreaPath(points),
      };
    });
  }, [dataPoints, activeMetric, maxValue]);

  // Handle mouse move over SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    // Find nearest point index
    let closestIndex = 0;
    let closestDist = Infinity;
    dataPoints.forEach((_, idx) => {
      const px = getX(idx);
      const dist = Math.abs(px - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });

    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Formatting Y-axis tick values
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
    const val = maxValue * pct;
    let label = "";
    if (activeMetric === "dinero") {
      if (val >= 1000000) label = `$${(val / 1000000).toFixed(1)}M`;
      else if (val >= 1000) label = `$${Math.round(val / 1000)}k`;
      else label = `$${Math.round(val)}`;
    } else if (activeMetric === "piezas") {
      if (val >= 1000) label = `${(val / 1000).toFixed(1)}k pz`;
      else label = `${Math.round(val)} pz`;
    } else if (activeMetric === "tickets") {
      label = `${Math.round(val)}`;
    } else {
      label = `${Math.round(val)}%`;
    }
    return { pct, val, label, y: padding.top + chartHeight - pct * chartHeight };
  });

  const activeHoverPoint = hoverIndex !== null ? dataPoints[hoverIndex] : null;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden transition-all duration-300">
      {/* Top Header & Range Filters */}
      <div className="p-6 pb-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
                Análisis de Ventas & Producción
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Estilo Google
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Métricas de facturación ($ MXN) y volumen de piezas de pan en toda la red
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Pills & Custom Date Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-stone-100/80 p-1 rounded-2xl border border-stone-200 text-xs font-bold">
            <button
              onClick={() => { onPeriodChange("hoy"); setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedPeriod === "hoy"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => { onPeriodChange("semana"); setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedPeriod === "semana"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => { onPeriodChange("mes"); setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedPeriod === "mes"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => { onPeriodChange("año"); setShowDatePicker(false); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedPeriod === "año"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Este Año
            </button>
            <button
              onClick={() => { 
                onPeriodChange("custom"); 
                setShowDatePicker(true); 
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                selectedPeriod === "custom"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Entre Fechas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Picker Dropdown (when "Entre Fechas" is selected or open) */}
      {(showDatePicker || selectedPeriod === "custom") && (
        <div className="bg-stone-50 px-6 py-3.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              Rango Personalizado:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-stone-500 font-medium">Desde:</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="px-2.5 py-1.5 bg-white rounded-lg border border-stone-300 font-mono font-bold text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-stone-500 font-medium">Hasta:</label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-white rounded-lg border border-stone-300 font-mono font-bold text-stone-800 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => onCustomDateChange(tempStart, tempEnd)}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white font-black rounded-lg transition-all active:scale-95 shadow-sm"
            >
              Aplicar Rango
            </button>
          </div>

          <div className="text-[11px] text-stone-500">
            Mostrando <strong>{dataPoints.length} intervalos</strong> de datos calculados
          </div>
        </div>
      )}

      {/* Google Analytics Scorecard Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-stone-200">
        {/* Tab 1: Dinero */}
        <button
          onClick={() => setActiveMetric("dinero")}
          className={`p-5 text-left transition-all relative ${
            activeMetric === "dinero"
              ? "bg-orange-50/50"
              : "hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-orange-600" />
              Dinero Recaudado
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
            {formatCurrency(aggregated.totalMoney)}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Total en el periodo seleccionado
          </p>
          {activeMetric === "dinero" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600" />
          )}
        </button>

        {/* Tab 2: Piezas de Pan */}
        <button
          onClick={() => setActiveMetric("piezas")}
          className={`p-5 text-left transition-all relative border-l border-stone-100 ${
            activeMetric === "piezas"
              ? "bg-amber-50/50"
              : "hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <Croissant className="w-4 h-4 text-amber-600" />
              Piezas de Pan
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +18.6%
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
            {aggregated.totalPieces.toLocaleString("es-MX")}{" "}
            <span className="text-sm font-bold text-stone-400">pzas</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Bolillos, conchas, cuernos y pasteles
          </p>
          {activeMetric === "piezas" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-600" />
          )}
        </button>

        {/* Tab 3: Tickets Cobrados */}
        <button
          onClick={() => setActiveMetric("tickets")}
          className={`p-5 text-left transition-all relative border-l border-stone-100 ${
            activeMetric === "tickets"
              ? "bg-rose-50/50"
              : "hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-rose-600" />
              Tickets Emitidos
            </span>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
              Tk. Promedio: {formatCurrency(aggregated.averageTicket)}
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
            {aggregated.totalTickets.toLocaleString("es-MX")}{" "}
            <span className="text-sm font-bold text-stone-400">clientes</span>
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Transacciones en mostrador
          </p>
          {activeMetric === "tickets" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600" />
          )}
        </button>

        {/* Tab 4: Meta de la Cadena */}
        <button
          onClick={() => setActiveMetric("meta")}
          className={`p-5 text-left transition-all relative border-l border-stone-100 ${
            activeMetric === "meta"
              ? "bg-emerald-50/50"
              : "hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              Meta Cadena
            </span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {aggregated.percentGoal}%
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
            {formatCurrency(aggregated.totalGoal)}
          </p>
          <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${aggregated.percentGoal}%` }}
            />
          </div>
          {activeMetric === "meta" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Secondary Controls Bar: Mode Switcher & Legend */}
      <div className="px-6 py-3 bg-stone-50/60 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
        {/* Toggle between Consolidated vs Compare Branches */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500">Visualización:</span>
          <div className="inline-flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm text-xs font-bold">
            <button
              onClick={() => setViewMode("consolidado")}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === "consolidado"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              🌐 Consolidado Cadena
            </button>
            <button
              onClick={() => setViewMode("comparativo")}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === "comparativo"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              📊 Comparar 3 Sucursales
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
          {viewMode === "consolidado" ? (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-orange-600 border border-white shadow-sm" />
              <span>
                {activeMetric === "dinero" ? "Total Facturado ($ MXN)" :
                 activeMetric === "piezas" ? "Total Piezas de Pan (pzas)" :
                 activeMetric === "tickets" ? "Total Tickets Cobrados" :
                 "Cumplimiento de Meta (%)"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-600" />
                <span>Matriz (Centro)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-600" />
                <span>San Benito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-600" />
                <span>Las Flores</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Google-Style Interactive Chart Canvas */}
      <div className="p-6 relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Consolidated Gradient */}
            <linearGradient id="consolidatedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.00" />
            </linearGradient>

            {/* Matriz Gradient */}
            <linearGradient id="matrizGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.00" />
            </linearGradient>

            {/* Benito Gradient */}
            <linearGradient id="benitoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.00" />
            </linearGradient>

            {/* Flores Gradient */}
            <linearGradient id="floresGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines and Y Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + chartWidth}
                y2={tick.y}
                stroke="#e7e5e4"
                strokeWidth="1"
                strokeDasharray={i === 0 ? "0" : "3 3"}
              />
              <text
                x={padding.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[11px] font-mono font-bold fill-stone-400"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Lines & Areas */}
          {viewMode === "consolidado" ? (
            <>
              {/* Consolidated Area */}
              <path
                d={buildAreaPath(consolidatedPoints)}
                fill="url(#consolidatedGrad)"
              />
              {/* Consolidated Stroke */}
              <path
                d={buildSmoothPath(consolidatedPoints)}
                fill="none"
                stroke="#ea580c"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Points on line */}
              {consolidatedPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? 6 : 3.5}
                  fill="#ffffff"
                  stroke="#ea580c"
                  strokeWidth={hoverIndex === idx ? 3 : 2}
                  className="transition-all duration-150"
                />
              ))}
            </>
          ) : (
            // Comparative 3-branch lines
            branchLines.map((bl) => (
              <g key={bl.id}>
                <path d={bl.areaPath} fill={bl.bgGradient} />
                <path
                  d={bl.linePath}
                  fill="none"
                  stroke={bl.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {bl.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoverIndex === idx ? 5 : 2.5}
                    fill="#ffffff"
                    stroke={bl.color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            ))
          )}

          {/* Hover Crosshair Vertical Line */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#78716c"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* X Axis Labels */}
          {dataPoints.map((pt, idx) => {
            // Show every label if <= 10 points, else show evenly spaced
            const step = Math.ceil(dataPoints.length / 8);
            const show = idx % step === 0 || idx === dataPoints.length - 1;
            if (!show) return null;

            return (
              <g key={idx}>
                <text
                  x={getX(idx)}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-stone-600"
                >
                  {pt.label}
                </text>
                {pt.subLabel && (
                  <text
                    x={getX(idx)}
                    y={padding.top + chartHeight + 30}
                    textAnchor="middle"
                    className="text-[9px] font-medium fill-stone-400"
                  >
                    {pt.subLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Google-Style Tooltip */}
        {activeHoverPoint && hoverIndex !== null && (
          <div
            className="absolute top-10 pointer-events-none bg-stone-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-stone-700 min-w-[240px] z-20 animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${Math.min(
                75,
                Math.max(15, (getX(hoverIndex) / width) * 100)
              )}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2.5">
              <span className="font-bold text-xs text-orange-400">
                {activeHoverPoint.label} {activeHoverPoint.subLabel && `(${activeHoverPoint.subLabel})`}
              </span>
              <span className="text-[10px] text-stone-400 uppercase font-mono">
                {selectedPeriod}
              </span>
            </div>

            {/* Total summary in tooltip */}
            <div className="space-y-1 mb-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Facturación Total:</span>
                <span className="font-black text-white text-sm">
                  {formatCurrency(activeHoverPoint.totalMoney)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-400">Piezas de Pan:</span>
                <span className="font-bold text-amber-300">
                  {activeHoverPoint.totalPieces.toLocaleString("es-MX")} pzas
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-400">Tickets de venta:</span>
                <span className="font-bold text-stone-300">
                  {activeHoverPoint.totalTickets} clientes
                </span>
              </div>
            </div>

            {/* Per-branch breakdown pills */}
            <div className="border-t border-stone-800 pt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Matriz (Centro)
                </span>
                <span className="font-mono font-bold text-white">
                  {activeMetric === "piezas" 
                    ? `${activeHoverPoint.branchesData["branch-matriz"]?.pieces.toLocaleString()} pz`
                    : formatCurrency(activeHoverPoint.branchesData["branch-matriz"]?.money || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  San Benito
                </span>
                <span className="font-mono font-bold text-white">
                  {activeMetric === "piezas" 
                    ? `${activeHoverPoint.branchesData["branch-benito"]?.pieces.toLocaleString()} pz`
                    : formatCurrency(activeHoverPoint.branchesData["branch-benito"]?.money || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Las Flores
                </span>
                <span className="font-mono font-bold text-white">
                  {activeMetric === "piezas" 
                    ? `${activeHoverPoint.branchesData["branch-flores"]?.pieces.toLocaleString()} pz`
                    : formatCurrency(activeHoverPoint.branchesData["branch-flores"]?.money || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
