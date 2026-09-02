import { BarChart3, TrendingUp, DollarSign, Calendar, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ReportesPage() {
  const topSales = [
    { name: "Bolillo Tradicional", pieces: 210, revenue: 1050 },
    { name: "Concha de Vainilla", pieces: 85, revenue: 1020 },
    { name: "Cuerno de Mantequilla", pieces: 60, revenue: 900 },
    { name: "Rebanada Pastel 3 Leches", pieces: 14, revenue: 630 },
    { name: "Dona Glaseada", pieces: 42, revenue: 546 },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Reportes de Venta & Corte de Caja</h2>
          <p className="text-xs text-stone-500 mt-1">Métricas de ingresos, piezas horneadas y productos estrella.</p>
        </div>
        <button className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs">
          <Download className="w-4 h-4" /> Exportar Corte de Caja
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500">Total en Efectivo (Caja)</span>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">{formatCurrency(4150)}</p>
          <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">Listo para entrega a Don Toño</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500">Cobros con Tarjeta / Transferencia</span>
          <p className="text-3xl font-extrabold text-stone-900 mt-2">{formatCurrency(700)}</p>
          <span className="text-xs text-blue-600 font-bold mt-1 inline-block">Directo a cuenta bancaria</span>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500">Estimación de Merma del Día</span>
          <p className="text-3xl font-extrabold text-rose-600 mt-2">12 pzas</p>
          <span className="text-xs text-stone-500 font-medium mt-1 inline-block">2.8% de la producción</span>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-base text-stone-900">Panes Más Vendidos de la Semana</h3>
        <div className="space-y-3">
          {topSales.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-200 text-amber-900 font-extrabold text-xs rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold text-xs text-stone-900">{item.name}</p>
                  <p className="text-xs text-stone-500">{item.pieces} piezas vendidas</p>
                </div>
              </div>
              <span className="font-extrabold text-xs text-amber-800">
                {formatCurrency(item.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
