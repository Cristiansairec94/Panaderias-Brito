"use client";

import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  Croissant, 
  Clock, 
  Flame, 
  Award, 
  ArrowUpRight,
  Sparkles,
  PieChart
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReportesPage() {
  const [filterPeriod, setFilterPeriod] = useState<"semana" | "mes" | "hoy">("semana");

  const topProducts = [
    { rank: 1, name: "Bolillo Tradicional", pieces: 2150, revenue: 10750, category: "Pan Blanco", share: 24 },
    { rank: 2, name: "Concha de Vainilla", pieces: 890, revenue: 10680, category: "Pan Dulce", share: 22 },
    { rank: 3, name: "Telera para Torta", pieces: 1200, revenue: 7200, category: "Pan Blanco", share: 16 },
    { rank: 4, name: "Cuerno de Mantequilla", pieces: 420, revenue: 6300, category: "Pan Dulce", share: 14 },
    { rank: 5, name: "Pastel 3 Leches (Rebanada / Entero)", pieces: 95, revenue: 5400, category: "Pastelería", share: 12 },
    { rank: 6, name: "Dona Glaseada", pieces: 380, revenue: 4940, category: "Pan Dulce", share: 8 },
    { rank: 7, name: "Oreja Hojaldrada", pieces: 260, revenue: 3640, category: "Pan Dulce", share: 4 },
  ];

  const hourlyRush = [
    { hour: "06:00", volume: 35, label: "Apertura" },
    { hour: "07:00", volume: 85, label: "Pico Mañana ☕" },
    { hour: "08:00", volume: 95, label: "Pico Mañana 🥖" },
    { hour: "09:00", volume: 60, label: "Desayunos" },
    { hour: "11:00", volume: 30, label: "Tranquilo" },
    { hour: "13:00", volume: 45, label: "Teleras Comida" },
    { hour: "15:00", volume: 25, label: "Horno Tarde" },
    { hour: "17:00", volume: 55, label: "Pan Caliente" },
    { hour: "18:30", volume: 100, label: "Pico Noche (Cena) 🏆" },
    { hour: "20:00", volume: 80, label: "Salida Trabajo" },
    { hour: "21:00", volume: 20, label: "Cierre Caja" },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Reportes de Producción & Ventas</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Panes estrella, horas pico en mostrador y eficiencia del horno de Don Toño.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm text-xs font-bold">
            <button
              onClick={() => setFilterPeriod("hoy")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === "hoy" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilterPeriod("semana")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === "semana" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilterPeriod("mes")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterPeriod === "mes" ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Este Mes
            </button>
          </div>
          <button className="flex items-center gap-1.5 bg-brito-orange-600 hover:bg-brito-orange-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-md text-xs transition-all active:scale-95">
            <Download className="w-4 h-4" /> Exportar Reporte PDF
          </button>
        </div>
      </div>

      {/* Production & Efficiency KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Piezas Horneadas</span>
            <div className="p-2 bg-amber-100 text-brito-orange-600 rounded-xl">
              <Croissant className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">5,490 pzas</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> 98.2% vendidas en mostrador
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Tasa de Merma Real</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">2.4%</p>
          <p className="text-[11px] text-stone-400 font-medium mt-1">
            Excelente (Meta máxima: 5.0%)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Horas Pico de Mayor Venta</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">6:30 - 8:30 PM</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">
            Momento del café y cena familiar
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Producto #1 Estrella</span>
            <div className="p-2 bg-brito-crimson-100 text-brito-crimson-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-stone-900">Bolillo Tradicional</p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            2,150 piezas en la semana
          </p>
        </div>
      </div>

      {/* Hourly Rush Chart */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-black text-base text-stone-900">Afluencia de Clientes & Horas Pico en Mostrador</h3>
            <p className="text-[11px] text-stone-500">Visualiza en qué horarios se llena la panadería para tener charolas calientes listas.</p>
          </div>
          <span className="text-xs font-bold text-brito-orange-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
            Pico de Venta: Noche (Cena)
          </span>
        </div>

        {/* Hourly Bars */}
        <div className="grid grid-cols-11 gap-2 pt-4">
          {hourlyRush.map((h) => {
            const isPeak = h.volume >= 85;
            return (
              <div key={h.hour} className="flex flex-col items-center gap-2">
                <div className="h-36 flex items-end justify-center w-full bg-stone-50 p-1.5 rounded-2xl border border-stone-100">
                  <div
                    style={{ height: `${(h.volume / 100) * 120}px` }}
                    className={`w-full max-w-[24px] rounded-t-lg transition-all shadow-sm ${
                      isPeak
                        ? "bg-gradient-to-t from-brito-orange-600 to-brito-crimson-600"
                        : "bg-stone-300 hover:bg-stone-400"
                    }`}
                    title={`${h.hour}: ${h.volume}% afluencia (${h.label})`}
                  />
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-black ${isPeak ? "text-brito-orange-700" : "text-stone-600"}`}>
                    {h.hour}
                  </p>
                  <p className="text-[9px] text-stone-400 font-bold truncate max-w-[48px]">{h.volume}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 Best Sellers Table */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-brito-orange-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900">Top Panes & Pasteles Más Vendidos</h3>
              <p className="text-[11px] text-stone-500">Ranking por ingresos generados y volumen de piezas.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-extrabold border-b border-stone-200">
              <tr>
                <th className="p-3.5"># Lugar</th>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Piezas Vendidas</th>
                <th className="p-3.5">Ingresos Totales</th>
                <th className="p-3.5">% Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {topProducts.map((p) => (
                <tr key={p.name} className="hover:bg-amber-50/30 transition-colors">
                  <td className="p-3.5 font-black">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      p.rank === 1
                        ? "bg-amber-400 text-amber-950 shadow-sm"
                        : p.rank === 2
                        ? "bg-stone-300 text-stone-900"
                        : p.rank === 3
                        ? "bg-amber-700 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}>
                      {p.rank}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-stone-900">{p.name}</td>
                  <td className="p-3.5 text-stone-500 font-semibold">{p.category}</td>
                  <td className="p-3.5 font-black text-stone-900">{p.pieces.toLocaleString()} pzas</td>
                  <td className="p-3.5 font-extrabold text-brito-orange-700 text-sm">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${p.share * 3}%` }} className="bg-brito-orange-600 h-full rounded-full" />
                      </div>
                      <span className="font-bold text-[11px] text-stone-600">{p.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
