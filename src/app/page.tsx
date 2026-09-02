"use client";

import Link from "next/link";
import { 
  ShoppingBag, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Croissant,
  DollarSign,
  Bell,
  Sparkles,
  Users,
  ShieldCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

export default function Home() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const stats = [
    { label: "Ventas de Hoy", value: formatCurrency(4850), change: "+12% vs ayer", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
    { label: "Piezas Horneadas", value: "392 pzas", change: "Horno a máxima cap.", icon: Croissant, color: "text-brito-orange-600 bg-amber-100" },
    { label: "Pedidos por Entregar", value: "5 pasteles", change: "2 para las 4:00 PM", icon: Clock, color: "text-rose-600 bg-rose-100" },
    { label: "Alertas de Insumos", value: `${unreadCount} pendientes`, change: "Harina Extra & Mantequilla", icon: AlertTriangle, color: "text-brito-crimson-600 bg-rose-100" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner with Official Brand Colors */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-8 text-white shadow-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Glow circles */}
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-brito-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-brito-crimson-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-md">
              Masterpage ERP
            </span>
            <span className="text-xs text-stone-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sistema Activo
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            ¡Hola, {user?.name || "Don Toño"}! 🥖
          </h2>
          <p className="text-stone-300 mt-1.5 text-xs max-w-xl leading-relaxed">
            Bienvenido al panel central de <strong className="text-brito-orange-400">Panaderías Brito</strong>. Tienes <strong className="text-brito-crimson-400 font-bold">{unreadCount} notificaciones</strong> y alertas operativas listas para revisar en la barra superior.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <Link
            href="/pos"
            className="flex items-center gap-2 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-xl shadow-brito-orange-600/30 transition-all active:scale-95 text-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            Abrir Punto de Venta (POS)
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

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* POS Card */}
        <Link href="/pos" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-brito-orange-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-brito-orange-600 mb-4 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Punto de Venta Rápido</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Cobro en mostrador, catálogo con precios de panes, tickets y cálculo de cambio.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-brito-orange-600 group-hover:translate-x-1 transition-transform">
            Ir a Caja <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Inventory Card */}
        <Link href="/inventario" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-amber-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-brito-crimson-600 mb-4 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Inventario & Insumos</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Control de sacos de harina, azúcar, mantequilla, levadura y mermas de pan.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-brito-crimson-600 group-hover:translate-x-1 transition-transform">
            Ver Almacén <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Orders Card */}
        <Link href="/pedidos" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-rose-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-700 mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Encargos de Pastelería</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Agenda de pasteles personalizados, XV años, bodas, anticipos y entregas.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-pink-700 group-hover:translate-x-1 transition-transform">
            Ver Pedidos <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
