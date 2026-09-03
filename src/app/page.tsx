"use client";

import Link from "next/link";
import { 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  Wallet, 
  Users, 
  ShieldCheck, 
  Package, 
  Building2,
  Zap,
  Store,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth, getFriendlyName } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useBranch } from "@/context/BranchContext";

export default function Home() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    consolidatedMetrics,
    simulateSale 
  } = useBranch();

  const activeSales = isAllBranches 
    ? consolidatedMetrics.totalSales 
    : currentBranch?.todaySales || 5200;

  const activeCash = isAllBranches 
    ? consolidatedMetrics.totalCashInDrawer 
    : currentBranch?.cashInDrawer || 5000;

  const activeTickets = isAllBranches
    ? consolidatedMetrics.totalTickets
    : currentBranch?.todayTickets || 42;

  const stats = [
    { 
      label: isAllBranches ? "Ventas Consolidadas Hoy" : `Ventas Hoy (${currentBranch?.shortName})`, 
      value: formatCurrency(activeSales), 
      change: `${activeTickets} tickets emitidos`, 
      icon: DollarSign, 
      color: "text-emerald-600 bg-emerald-100" 
    },
    { 
      label: "Efectivo en Caja", 
      value: formatCurrency(activeCash), 
      change: isAllBranches ? "3 cajas activas" : `${currentBranch?.currentShift.name}`, 
      icon: Wallet, 
      color: "text-orange-600 bg-orange-100" 
    },
    { 
      label: "Clientes Registrados", 
      value: "28 cuentas", 
      change: "4 tiendas de mayoreo", 
      icon: Users, 
      color: "text-blue-600 bg-blue-100" 
    },
    { 
      label: "Alertas de Insumos", 
      value: `${unreadCount} críticas`, 
      change: "Harina Extra Fina", 
      icon: AlertTriangle, 
      color: "text-rose-600 bg-rose-100" 
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner with Official Brand Colors */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-rose-600 text-white rounded-full text-[10px] font-black tracking-wider uppercase shadow-md">
              Sistema Integral ERP
            </span>
            <span className="text-xs text-stone-300 font-semibold flex items-center gap-1.5 bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {isAllBranches ? "Todas las Sucursales (Consolidado)" : currentBranch?.name}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            ¡Bienvenido {getFriendlyName(user?.name)}! 🥖
          </h2>
          <p className="text-stone-300 mt-1.5 text-xs max-w-xl leading-relaxed">
            Panel central de <strong className="text-orange-400">Panaderías Brito</strong>. Administra ventas en mostrador, flujo de turnos por sucursal, clientes e inventario en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          <Link
            href="/pos"
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-black px-5 py-3 rounded-2xl shadow-xl shadow-orange-600/30 transition-all active:scale-95 text-xs"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            Abrir Punto de Venta (POS)
          </Link>
          <button
            onClick={() => simulateSale()}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white font-black px-4 py-3 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 text-xs"
          >
            <Zap className="w-4 h-4 fill-current animate-pulse" />
            Simular Venta
          </button>
          <Link
            href="/sucursales"
            className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold px-4 py-3 rounded-2xl border border-white/10 transition-all text-xs"
          >
            <Building2 className="w-4 h-4 text-orange-400" />
            Ver Sucursales
          </Link>
          <Link
            href="/caja"
            className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold px-4 py-3 rounded-2xl border border-white/10 transition-all text-xs"
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

      {/* Multi-Branch Performance Comparison Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Rendimiento en Vivo por Sucursal
            </h3>
            <p className="text-xs text-stone-500">
              Comparativa de ventas de hoy, avance de meta y cajero activo
            </p>
          </div>
          <Link
            href="/sucursales"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Panel Completo de Sucursales <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b) => {
            const pct = Math.min(100, Math.round((b.todaySales / b.dailyGoal) * 100));

            return (
              <div key={b.id} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-black text-xs text-stone-900 leading-tight">{b.name}</p>
                      <p className="text-[10px] text-stone-400">{b.currentShift.cashier}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Abierta
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-stone-500 font-medium">Venta de hoy:</span>
                    <span className="font-black text-stone-900">{formatCurrency(b.todaySales)}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 mt-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                    <span>{b.todayTickets} tickets</span>
                    <span>{pct}% de meta ({formatCurrency(b.dailyGoal)})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-stone-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    {b.currentShift.name.split("(")[0]}
                  </span>
                  <span className="font-bold text-stone-700">
                    Caja: {formatCurrency(b.cashInDrawer)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ERP Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clientes Card */}
        <Link href="/clientes" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between">
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
        <Link href="/caja" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between">
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
        <Link href="/inventario" className="group bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm hover:border-rose-500 hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-stone-900">Inventario & Materia Prima</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Registro de compras a proveedores, sacos de harina, azúcar, mantequilla y control de mermas.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-black text-rose-600 group-hover:translate-x-1 transition-transform">
            Ver Almacén <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
