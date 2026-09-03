"use client";

import Link from "next/link";
import { 
  ShoppingBag, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Croissant,
  DollarSign,
  Wallet,
  Users,
  ShieldCheck,
  Package,
  TrendingDown,
  ArrowUpRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getFriendlyName } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pos");
  }, [router]);

  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const stats = [
    { label: "Ventas Totales Hoy", value: formatCurrency(5200), change: "+14% vs ayer", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
    { label: "Efectivo en Caja", value: formatCurrency(5000), change: "Turno Mañana en curso", icon: Wallet, color: "text-brito-orange-600 bg-amber-100" },
    { label: "Clientes Activos", value: "28 registros", change: "4 tiendas mayoreo", icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Alertas de Insumos", value: `${unreadCount} críticas`, change: "Harina Extra Fina", icon: AlertTriangle, color: "text-brito-crimson-600 bg-rose-100" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner with Official Brand Colors */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-8 text-white shadow-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-brito-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-brito-crimson-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-md">
              Sistema Integral ERP
            </span>
            <span className="text-xs text-stone-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sucursal Matriz
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            ¡Bienvenido {getFriendlyName(user?.name)}! 🥖
          </h2>
          <p className="text-stone-300 mt-1.5 text-xs max-w-xl leading-relaxed">
            Bienvenido al panel central de <strong className="text-brito-orange-400">Panaderías Brito</strong>. El Punto de Venta está siendo desarrollado en paralelo, y tienes el control de clientes, caja e insumos aquí.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <Link
            href="/pos"
            className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-500 hover:to-brito-crimson-500 text-white font-black px-6 py-3.5 rounded-2xl shadow-xl shadow-brito-orange-600/40 transition-all active:scale-95 text-xs animate-pulse"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            Abrir Punto de Venta (POS)
          </Link>
          <Link
            href="/caja"
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold px-5 py-3.5 rounded-2xl border border-stone-700 transition-all text-xs"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            Corte de Caja
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-stone-500">{stat.label}</span>
                <div className={`p-2.5 rounded-2xl ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">{stat.value}</p>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 font-semibold">
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* ERP Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clientes Card */}
        <Link href="/clientes" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-brito-orange-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Clientes & Mayoristas</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Público general, tienditas de la esquina que compran bolillo al mayoreo, saldo y créditos.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform">
            Ver Directorio <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Caja Card */}
        <Link href="/caja" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-brito-orange-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Caja & Flujo de Dinero</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Control de turnos, gastos menores (gas, insumos), retiros de Don Toño y arqueo de caja.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-emerald-600 group-hover:translate-x-1 transition-transform">
            Administrar Caja <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Inventario Card */}
        <Link href="/inventario" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-brito-crimson-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-brito-crimson-600 mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Inventario & Materia Prima</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Registro de compras a proveedores, sacos de harina, azúcar, mantequilla y control de mermas.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-brito-crimson-600 group-hover:translate-x-1 transition-transform">
            Ver Almacén <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
