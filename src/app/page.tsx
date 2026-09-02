import Link from "next/link";
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  PlusCircle,
  Croissant,
  DollarSign
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Home() {
  const stats = [
    { label: "Ventas de Hoy", value: formatCurrency(4850), change: "+12% vs ayer", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
    { label: "Piezas Vendidas", value: "392 pzas", change: "Horno a máxima cap.", icon: Croissant, color: "text-amber-600 bg-amber-100" },
    { label: "Pedidos por Entregar", value: "5 pasteles", change: "2 para las 4:00 PM", icon: Clock, color: "text-blue-600 bg-blue-100" },
    { label: "Insumos Bajos", value: "2 alertas", change: "Harina Extra & Mantequilla", icon: AlertTriangle, color: "text-rose-600 bg-rose-100" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 rounded-3xl p-8 text-white shadow-lg">
        <div>
          <span className="px-3 py-1 bg-amber-800/60 rounded-full text-xs font-semibold tracking-wider uppercase">Panel Principal</span>
          <h2 className="text-3xl font-extrabold mt-2">¡Bienvenido, Don Toño! 🥖</h2>
          <p className="text-amber-100 mt-1 text-sm max-w-xl">
            Monitoreo en tiempo real de producción, ventas de mostrador y pedidos especiales de la panadería.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/pos"
            className="flex items-center gap-2 bg-amber-950 hover:bg-black text-amber-50 font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-95 text-sm"
          >
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            Abrir Punto de Venta (POS)
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-stone-500">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 font-medium">
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Fast Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* POS Card */}
        <Link href="/pos" className="group bg-white p-6 rounded-2xl border border-amber-100 shadow-sm hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 mb-4 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-stone-900">Punto de Venta Rápido</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Cobro en mostrador, catálogo con fotos de panes, cálculo de cambio y emisión de tickets.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
            Ir a Caja <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Inventory Card */}
        <Link href="/inventario" className="group bg-white p-6 rounded-2xl border border-amber-100 shadow-sm hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-700 mb-4 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-stone-900">Inventario & Materia Prima</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Control de sacos de harina, azúcar, levadura, mantequilla y registro de mermas de pan.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
            Ver Almacén <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Orders Card */}
        <Link href="/pedidos" className="group bg-white p-6 rounded-2xl border border-amber-100 shadow-sm hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-stone-900">Encargos de Pastelería</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Agenda de pasteles personalizados, XV años, bodas, abonos y fechas de entrega.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
            Ver Pedidos <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
