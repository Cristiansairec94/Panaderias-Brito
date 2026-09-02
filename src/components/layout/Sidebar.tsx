"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Package, 
  CalendarClock, 
  BarChart3, 
  Croissant,
  Store
} from "lucide-react";

const navigation = [
  { name: "Inicio / Resumen", href: "/", icon: Store },
  { name: "Punto de Venta (POS)", href: "/pos", icon: ShoppingBag },
  { name: "Inventario & Insumos", href: "/inventario", icon: Package },
  { name: "Pedidos & Encargos", href: "/pedidos", icon: CalendarClock },
  { name: "Reportes & Caja", href: "/reportes", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-amber-950 text-amber-50 flex flex-col min-h-screen shrink-0 shadow-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-amber-800/60 flex items-center gap-3">
        <div className="p-2.5 bg-amber-500 rounded-xl text-amber-950 shadow-md">
          <Croissant className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide">Panaderías Brito</h1>
          <p className="text-xs text-amber-300/80">Don Toño Brito • Sistema</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                isActive
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950/20 font-semibold"
                  : "text-amber-200/80 hover:bg-amber-900/60 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-amber-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User / Shift Status */}
      <div className="p-4 border-t border-amber-800/60">
        <div className="bg-amber-900/40 rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <p className="font-semibold text-amber-100">Caja Abierta</p>
            <p className="text-amber-400/80">Turno Mañana</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}
