"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Store, 
  Users, 
  DollarSign, 
  Settings, 
  ArrowRight,
  Wallet,
  Clock,
  ShieldCheck,
  Flame,
  Croissant
} from "lucide-react";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import { useAuth } from "@/context/AuthContext";

const allNavigationItems = [
  { name: "Dashboard / Inicio", href: "/", icon: Store, badge: null },
  { name: "Productos", href: "/productos", icon: Croissant, badge: "Catálogo" },
  { name: "Caja & Turnos", href: "/caja", icon: Wallet, badge: null },
  { name: "Pedidos & Encargos", href: "/pedidos", icon: Clock, badge: "Horno" },
  { name: "Clientes & Mayoristas", href: "/clientes", icon: Users, badge: null },
  { name: "Inventario & Insumos", href: "/inventario", icon: Package, badge: "Stock" },
  { name: "Finanzas & Balances", href: "/finanzas", icon: DollarSign, badge: "Margen" },
  { name: "Reportes & Métricas", href: "/reportes", icon: BarChart3, badge: null },
  { name: "Configuración", href: "/configuracion", icon: Settings, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, canAccessRoute, hasPermission } = useAuth();
  const isPosActive = pathname === "/pos";

  // Filter items based on user permissions
  const visibleItems = allNavigationItems.filter((item) => canAccessRoute(item.href));

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "cajero":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "panadero":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "supervisor":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      default:
        return "bg-stone-800 text-stone-300 border-stone-700";
    }
  };

  return (
    <aside className="w-64 bg-[#18181b] text-stone-100 flex flex-col min-h-screen shrink-0 shadow-2xl border-r border-stone-800 select-none justify-between">
      {/* Top Part: Brand + Filtered ERP Links */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-4 border-b border-stone-800/80 flex flex-col items-center text-center bg-stone-900/60">
          <div className="mb-2">
            <AnimatedLogo size={80} />
          </div>
          <h1 className="font-black text-sm text-white tracking-wide">Panaderías Brito</h1>
          <p className="text-[10px] font-semibold text-brito-orange-400">Sistema Integral ERP & POS</p>

          {/* Active User Quick Badge */}
          {user && (
            <div className="mt-2.5 w-full bg-stone-800/80 rounded-xl p-2 flex items-center gap-2 border border-stone-700/60 text-left">
              <div className="w-7 h-7 rounded-lg bg-stone-700 flex items-center justify-center text-sm">
                {user.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-stone-100 truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${getRoleBadgeStyle(user.role)}`}>
                  {user.roleLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Módulos Asignados</span>
            <span className="text-[9px] font-medium text-stone-400">{visibleItems.length} activos</span>
          </div>

          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all text-xs group ${
                  isActive
                    ? "bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 text-white shadow-lg shadow-brito-orange-600/30 font-bold"
                    : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-brito-orange-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-stone-800 text-brito-orange-300 border border-stone-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Part: Quick Action according to Role */}
      <div className="p-3 border-t border-stone-800/80 bg-stone-900/80 space-y-2">
        {canAccessRoute("/pos") ? (
          <>
            <div className="px-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Terminal de Caja
            </div>
            <Link
              href="/pos"
              className={`w-full flex items-center justify-between p-3 rounded-2xl font-black text-xs transition-all shadow-xl group active:scale-95 ${
                isPosActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400 shadow-emerald-600/30"
                  : "bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-500 hover:to-brito-crimson-500 text-white shadow-brito-orange-600/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <ShoppingBag className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <p className="leading-tight">Punto de Venta</p>
                  <p className="text-[10px] font-medium text-white/80">Caja Mostrador (POS)</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </>
        ) : user?.role === "panadero" ? (
          <>
            <div className="px-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Área de Producción
            </div>
            <Link
              href="/inventario"
              className="w-full flex items-center justify-between p-3 rounded-2xl font-black text-xs transition-all shadow-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="leading-tight">Control de Horno</p>
                  <p className="text-[10px] font-medium text-white/80">Recetas & Harinas</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : null}

        {/* System & Branch Badge */}
        <div className="bg-stone-800/70 border border-stone-700/60 rounded-xl p-2 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-bold text-stone-100 text-[10px]">Sucursal Matriz</p>
            </div>
            <p className="text-[9px] text-stone-400">Panaderías Brito</p>
          </div>
          <span className="text-[9px] font-bold text-brito-orange-400 bg-brito-orange-950/60 border border-brito-orange-800/40 px-2 py-0.5 rounded-md">
            v1.5 RBAC
          </span>
        </div>
      </div>
    </aside>
  );
}
