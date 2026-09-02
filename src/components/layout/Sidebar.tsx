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
  Sparkles,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import AnimatedLogo from "@/components/ui/AnimatedLogo";

// Primary ERP Modules in Exact Requested Order:
// 1. Dashboard
// 2. Clientes
// 3. Inventario
// 4. Finanzas
// 5. Reportes
// 6. Configuración
const mainNavigation = [
  { name: "Dashboard / Inicio", href: "/", icon: Store, badge: null },
  { name: "Clientes & Mayoristas", href: "/clientes", icon: Users, badge: "Activo" },
  { name: "Inventario & Insumos", href: "/inventario", icon: Package, badge: "Alerta" },
  { name: "Finanzas & Balances", href: "/finanzas", icon: DollarSign, badge: "37.8% Margen" },
  { name: "Reportes & Métricas", href: "/reportes", icon: BarChart3, badge: null },
  { name: "Configuración", href: "/configuracion", icon: Settings, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isPosActive = pathname === "/pos";

  return (
    <aside className="w-64 bg-[#18181b] text-stone-100 flex flex-col min-h-screen shrink-0 shadow-2xl border-r border-stone-800 select-none justify-between">
      {/* Top Part: Brand + Main ERP Links */}
      <div className="flex flex-col">
        {/* Brand Header with Animated HD Logo */}
        <div className="p-4 border-b border-stone-800/80 flex flex-col items-center text-center bg-stone-900/60">
          <div className="mb-2">
            <AnimatedLogo size={80} />
          </div>
          <h1 className="font-black text-sm text-white tracking-wide">Panaderías Brito</h1>
          <p className="text-[10px] font-semibold text-brito-orange-400">Sistema Integral ERP</p>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            Módulos ERP
          </div>
          {mainNavigation.map((item) => {
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

      {/* Bottom Part: Punto de Venta (POS) HASTA ABAJO + Status Footer */}
      <div className="p-3 border-t border-stone-800/80 bg-stone-900/80 space-y-2">
        <div className="px-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
          Terminal de Caja
        </div>

        {/* Punto de Venta Button (Special High-Emphasis Styling at Bottom) */}
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

        {/* System & Branch Badge */}
        <div className="bg-stone-800/70 border border-stone-700/60 rounded-xl p-2 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-bold text-stone-100 text-[10px]">Sucursal Matriz</p>
            </div>
            <p className="text-[9px] text-stone-400">Don Toño Brito</p>
          </div>
          <span className="text-[9px] font-bold text-brito-orange-400 bg-brito-orange-950/60 border border-brito-orange-800/40 px-2 py-0.5 rounded-md">
            v1.4 ERP
          </span>
        </div>
      </div>
    </aside>
  );
}
