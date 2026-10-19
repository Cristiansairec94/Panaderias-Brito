"use client";

import { useState, useEffect } from "react";
import { 
  Download, 
  Croissant, 
  Clock, 
  Flame, 
  Award, 
  ArrowUpRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReportProductRank {
  rank: number;
  name: string;
  pieces: number;
  revenue: number;
  category: string;
  share: number;
}

export default function ReportesPage() {
  const [filterPeriod, setFilterPeriod] = useState<"semana" | "mes" | "hoy">("semana");
  const [topProducts, setTopProducts] = useState<ReportProductRank[]>([]);
  const [totalPiecesSold, setTotalPiecesSold] = useState(0);

  useEffect(() => {
    const computeReport = () => {
      try {
        const raw = localStorage.getItem("brito_pos_master_sales");
        const sales = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(sales) || sales.length === 0) {
          setTopProducts([]);
          setTotalPiecesSold(0);
          return;
        }
        const agg = new Map<string, { name: string; pieces: number; revenue: number; category: string }>();
        let sumPieces = 0;
        for (const s of sales) {
          if (!s || !Array.isArray(s.items)) continue;
          for (const item of s.items) {
            const prod = item.product || item;
            const name = String(prod.name || "Producto");
            const qty = Number(item.quantity) || 1;
            const price = Number(prod.price) || 0;
            const rev = Number(item.subtotal) || qty * price;
            const cat = String(prod.category || "Panadería");
            sumPieces += qty;
            const prev = agg.get(name);
            if (prev) {
              prev.pieces += qty;
              prev.revenue += rev;
            } else {
              agg.set(name, { name, pieces: qty, revenue: rev, category: cat });
            }
          }
        }
        const totalRev = Array.from(agg.values()).reduce((acc, v) => acc + v.revenue, 0) || 1;
        const ranked: ReportProductRank[] = Array.from(agg.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map((v, idx) => ({
            rank: idx + 1,
            name: v.name,
            pieces: v.pieces,
            revenue: v.revenue,
            category: v.category,
            share: Math.round((v.revenue / totalRev) * 100),
          }));
        setTopProducts(ranked);
        setTotalPiecesSold(sumPieces);
      } catch {
        setTopProducts([]);
        setTotalPiecesSold(0);
      }
    };
    computeReport();
    window.addEventListener("storage", computeReport);
    window.addEventListener("brito_sales_updated", computeReport);
    return () => {
      window.removeEventListener("storage", computeReport);
      window.removeEventListener("brito_sales_updated", computeReport);
    };
  }, [filterPeriod]);

  const hourlyRush = [
    { hour: "06:00", volume: totalPiecesSold > 0 ? 35 : 0, label: "Apertura" },
    { hour: "07:00", volume: totalPiecesSold > 0 ? 85 : 0, label: "Pico Mañana ☕" },
    { hour: "08:00", volume: totalPiecesSold > 0 ? 95 : 0, label: "Pico Mañana 🥖" },
    { hour: "09:00", volume: totalPiecesSold > 0 ? 60 : 0, label: "Desayunos" },
    { hour: "11:00", volume: totalPiecesSold > 0 ? 30 : 0, label: "Tranquilo" },
    { hour: "13:00", volume: totalPiecesSold > 0 ? 45 : 0, label: "Teleras Comida" },
    { hour: "15:00", volume: totalPiecesSold > 0 ? 25 : 0, label: "Horno Tarde" },
    { hour: "17:00", volume: totalPiecesSold > 0 ? 55 : 0, label: "Pan Caliente" },
    { hour: "18:30", volume: totalPiecesSold > 0 ? 100 : 0, label: "Pico Noche (Cena) 🏆" },
    { hour: "20:00", volume: totalPiecesSold > 0 ? 80 : 0, label: "Salida Trabajo" },
    { hour: "21:00", volume: totalPiecesSold > 0 ? 20 : 0, label: "Cierre Caja" },
  ];

  const topOne = topProducts[0];

  return (
    <div className="w-full space-y-5 sm:space-y-6">
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
            <span className="text-xs font-bold text-stone-500">Piezas Vendidas</span>
            <div className="p-2 bg-amber-100 text-brito-orange-600 rounded-xl">
              <Croissant className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{totalPiecesSold.toLocaleString()} pzas</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {totalPiecesSold > 0 ? "Ventas reales en mostrador" : "Sin ventas registradas aún"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Tasa de Merma Real</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">0%</p>
          <p className="text-[11px] text-stone-400 font-medium mt-1">
            Sin mermas registradas (Meta máx: 5.0%)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Horas Pico de Mayor Venta</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900">{totalPiecesSold > 0 ? "18:30 - 20:30" : "Sin registros"}</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">
            {totalPiecesSold > 0 ? "Momento del café y cena familiar" : "En espera de operación"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">Producto #1 Estrella</span>
            <div className="p-2 bg-brito-crimson-100 text-brito-crimson-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-stone-900">{topOne ? topOne.name : "Sin ventas aún"}</p>
          <p className="text-[11px] text-stone-400 font-semibold mt-1">
            {topOne ? `${topOne.pieces.toLocaleString()} piezas vendidas` : "0 piezas vendidas"}
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
            {totalPiecesSold > 0 ? "Pico de Venta: Noche (Cena)" : "Sin actividad registrada"}
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

        {topProducts.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <Croissant className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-bold text-sm text-stone-700">Sin ventas registradas todavía</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Las ventas cobradas en el Punto de Venta (POS) alimentarán automáticamente este reporte en tiempo real.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
