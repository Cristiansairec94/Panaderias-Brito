"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Package, 
  CalendarClock, 
  BarChart3, 
  Store,
  Users,
  Wallet
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AnimatedLogo from "@/components/ui/AnimatedLogo";

const navigation = [
  { name: "Inicio / Resumen", href: "/", icon: Store, badge: null },
  { name: "Punto de Venta (POS)", href: "/pos", icon: ShoppingBag, badge: "Caja" },
  { name: "Clientes & Mayoristas", href: "/clientes", icon: Users, badge: "Nuevo" },
  { name: "Inventario & Insumos", href: "/inventario", icon: Package, badge: "Alerta" },
  { name: "Caja & Movimientos", href: "/caja", icon: Wallet, badge: "Turno Activo" },
  { name: "Pedidos & Encargos", href: "/pedidos", icon: CalendarClock, badge: "5 activos" },
  { name: "Reportes & Finanzas", href: "/reportes", icon: BarChart3, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-[#18181b] text-stone-100 flex flex-col min-h-screen shrink-0 shadow-2xl border-r border-stone-800 select-none">
      {/* Brand Header with Animated HD Logo */}
      <div className="p-5 border-b border-stone-800/80 flex flex-col items-center text-center bg-stone-900/60">
        <div className="mb-2">
          <AnimatedLogo size={85} />
        </div>
        <h1 className="font-black text-sm text-white tracking-wide">Panaderías Brito</h1>
        <p className="text-[10px] font-semibold text-brito-orange-400">Sistema Integral ERP</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
          Módulos ERP
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all text-xs group ${
                isActive
                  ? "bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 text-white shadow-lg shadow-brito-orange-600/30"
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

      {/* Bottom Status / Branch Footer */}
      <div className="p-3 border-t border-stone-800/80 bg-stone-900/40">
        <div className="bg-stone-800/70 border border-stone-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-bold text-stone-100 text-[11px]">Sucursal Matriz</p>
            </div>
            <p className="text-[9px] text-stone-400 mt-0.5">Don Toño Brito</p>
          </div>
          <span className="text-[9px] font-bold text-brito-orange-400 bg-brito-orange-950/60 border border-brito-orange-800/40 px-2 py-0.5 rounded-md">
            v1.3 ERP
          </span>
        </div>
      </div>
    </aside>
  );
}
