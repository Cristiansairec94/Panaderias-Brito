"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Building, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Calendar,
  Layers,
  Sparkles,
  Lock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function FinanzasPage() {
  const [period, setPeriod] = useState<"mes" | "semana" | "hoy">("mes");

  const financialSummary = {
    grossIncome: 148500,
    totalExpenses: 92300,
    netProfit: 56200,
    profitMargin: 37.8,
    cashInDrawer: 5000,
  };

  const incomeSources = [
    { source: "Ventas de Mostrador (Efectivo)", amount: 101000, percent: 68, color: "bg-emerald-500" },
    { source: "Ventas Mayoristas (Tienditas)", amount: 29700, percent: 20, color: "bg-brito-orange-500" },
    { source: "Pedidos Especiales & Pasteles", amount: 17800, percent: 12, color: "bg-brito-crimson-500" },
  ];

  const expenseBreakdown = [
    { concept: "Materia Prima (Harina, azúcar, mantequilla)", amount: 41535, percent: 45, color: "bg-amber-500" },
    { concept: "Nómina de Panaderos & Cajera", amount: 27690, percent: 30, color: "bg-blue-500" },
    { concept: "Servicios (Gas LP para hornos, Luz, Agua)", amount: 13845, percent: 15, color: "bg-rose-500" },
    { concept: "Empaques, Bolsas Kraft & Mantenimiento", amount: 9230, percent: 10, color: "bg-purple-500" },
  ];

  const weeklyFlow = [
    { day: "Lunes", income: 18500, expenses: 11200 },
    { day: "Martes", income: 19200, expenses: 9800 },
    { day: "Miércoles", income: 21000, expenses: 14500 },
    { day: "Jueves", income: 20500, expenses: 8900 },
    { day: "Viernes", income: 24800, expenses: 18000 },
    { day: "Sábado (Pico)", income: 28900, expenses: 16500 },
    { day: "Domingo (Familia)", income: 26500, expenses: 13400 },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Finanzas & Balance General</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Estado de resultados, ingresos por ventas, costos operativos y margen de ganancia de Don Toño.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/caja"
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4 text-brito-orange-400" /> Ir a Caja & Turnos
          </Link>
          <button className="flex items-center gap-1.5 bg-white hover:bg-stone-100 text-stone-700 font-bold px-4 py-2.5 rounded-xl border border-stone-200 shadow-sm text-xs transition-all">
            <Download className="w-4 h-4" /> Exportar Balance
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Income */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Ingresos Totales</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(financialSummary.grossIncome)}
          </p>
          <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +16.4% vs mes anterior
          </p>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Gastos & Costos</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(financialSummary.totalExpenses)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Insumos, nómina y gas LP
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 p-5 rounded-2xl border border-stone-800 shadow-xl text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-300">Ganancia Neta (Utilidad)</span>
            <div className="p-2 bg-brito-orange-600 text-white rounded-xl shadow-md">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-brito-orange-400 tracking-tight">
            {formatCurrency(financialSummary.netProfit)}
          </p>
          <p className="text-[11px] text-stone-300 font-semibold mt-1">
            Margen de ganancia: <strong className="text-emerald-400">{financialSummary.profitMargin}%</strong>
          </p>
        </div>

        {/* Cash in Drawer */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Efectivo en Caja Activo</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight">
            {formatCurrency(financialSummary.cashInDrawer)}
          </p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            Turno matutino en curso
          </p>
        </div>
      </div>

      {/* Weekly Cash Flow Visual Chart */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-black text-base text-stone-900">Flujo Semanal de Efectivo (Ingresos vs Gastos)</h3>
            <p className="text-[11px] text-stone-500">Comparativa día por día del comportamiento de ventas y compras.</p>
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

        {/* Bar Chart Visualization */}
        <div className="grid grid-cols-7 gap-3 pt-4">
          {weeklyFlow.map((day) => {
            const maxVal = 30000;
            const incomeHeight = Math.round((day.income / maxVal) * 140);
            const expenseHeight = Math.round((day.expenses / maxVal) * 140);
            return (
              <div key={day.day} className="flex flex-col items-center gap-2">
                <div className="h-40 flex items-end gap-1.5 w-full justify-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
                  {/* Income bar */}
                  <div
                    style={{ height: `${incomeHeight}px` }}
                    className="w-4 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all shadow-sm"
                    title={`Ingreso: ${formatCurrency(day.income)}`}
                  />
                  {/* Expense bar */}
                  <div
                    style={{ height: `${expenseHeight}px` }}
                    className="w-4 bg-rose-400 rounded-t-md hover:bg-rose-500 transition-all shadow-sm"
                    title={`Gasto: ${formatCurrency(day.expenses)}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-stone-900">{day.day.split(" ")[0]}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{formatCurrency(day.income)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sources & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Sources */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base text-stone-900">Origen de los Ingresos</h3>
          </div>

          <div className="space-y-3 pt-1">
            {incomeSources.map((item) => (
              <div key={item.source} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-700">{item.source}</span>
                  <span className="text-stone-900">{formatCurrency(item.amount)} ({item.percent}%)</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div style={{ width: `${item.percent}%` }} className={`h-full ${item.color} rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base text-stone-900">Distribución de Gastos & Costos</h3>
          </div>

          <div className="space-y-3 pt-1">
            {expenseBreakdown.map((item) => (
              <div key={item.concept} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-700">{item.concept}</span>
                  <span className="text-stone-900">{formatCurrency(item.amount)} ({item.percent}%)</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div style={{ width: `${item.percent}%` }} className={`h-full ${item.color} rounded-full`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
