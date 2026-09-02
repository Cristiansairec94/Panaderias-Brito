"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  Clock, 
  ChevronDown, 
  LogOut, 
  UserCheck
} from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth, DEMO_USERS } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, loginAs, logout } = useAuth();
  const [time, setTime] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return { title: "Panel Principal ERP", subtitle: "Resumen operativo en tiempo real" };
      case "/pos":
        return { title: "Punto de Venta (POS)", subtitle: "Caja rápida y tickets de mostrador" };
      case "/clientes":
        return { title: "Directorio de Clientes", subtitle: "Público en general, clientes frecuentes y mayoristas" };
      case "/inventario":
        return { title: "Inventario & Materia Prima", subtitle: "Compras de insumos, control de stock y mermas" };
      case "/caja":
        return { title: "Caja & Flujo de Dinero", subtitle: "Apertura de turno, entradas, gastos y corte de caja" };
      case "/pedidos":
        return { title: "Pedidos & Encargos", subtitle: "Pasteles personalizados, eventos y entregas" };
      case "/reportes":
        return { title: "Reportes & Finanzas", subtitle: "Ganancias, productos estrella y balances" };
      default:
        return { title: "Panaderías Brito", subtitle: "Sistema de Gestión ERP" };
    }
  };

  const current = getPageTitle();

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Page Title & Breadcrumbs */}
      <div>
        <h2 className="text-lg font-black text-stone-900 tracking-tight">{current.title}</h2>
        <p className="text-[11px] text-stone-500 font-medium">{current.subtitle}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-2 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-brito-orange-600" />
          <span>{time || "Cargando..."}</span>
        </div>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Session Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 pr-2.5 rounded-xl hover:bg-stone-100 transition-all border border-stone-200/80 bg-stone-50/60"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brito-orange-600 to-brito-crimson-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-brito-orange-600/20">
              {user?.avatar || "👨‍🍳"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-stone-900 leading-tight">{user?.name || "Invitado"}</p>
              <p className="text-[9px] text-brito-orange-700 font-bold uppercase tracking-wider">{user?.roleLabel || "Sin Rol"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* User & Role Switcher Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="p-2.5 border-b border-stone-100">
                <p className="text-[10px] text-stone-400 font-semibold">Sesión activa:</p>
                <p className="text-xs font-black text-stone-900">{user?.name}</p>
                <p className="text-[11px] text-stone-500">{user?.email}</p>
              </div>

              {/* Fast Role Switcher */}
              <div className="p-1.5 space-y-0.5">
                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                  Cambiar de Perfil (Demo):
                </p>
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => {
                      loginAs(demo);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-semibold transition-all ${
                      user?.id === demo.id
                        ? "bg-amber-100/70 text-brito-orange-900 font-bold"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{demo.avatar}</span>
                      <span>{demo.name}</span>
                    </div>
                    {user?.id === demo.id && <UserCheck className="w-3.5 h-3.5 text-brito-orange-600" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-1.5 mt-1">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
