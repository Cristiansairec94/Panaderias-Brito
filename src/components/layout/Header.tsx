"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Clock, 
  ChevronDown, 
  LogOut, 
  UserCheck,
  Shield,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loginAs, logout, getDefaultRouteForUser } = useAuth();
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
        return { title: "Dashboard / Inicio", subtitle: "Resumen operativo en tiempo real" };
      case "/clientes":
        return { title: "Clientes & Mayoristas", subtitle: "Directorio de tienditas, clientes frecuentes y crédito" };
      case "/inventario":
        return { title: "Inventario & Insumos", subtitle: "Compras de materia prima, stock y control de mermas" };
      case "/finanzas":
        return { title: "Finanzas & Balances", subtitle: "Estado de resultados, ingresos, costos y ganancia neta" };
      case "/reportes":
        return { title: "Reportes & Estadísticas", subtitle: "Panes estrella, horas pico de mostrador y producción" };
      case "/configuracion":
        return { title: "Configuración del Sistema", subtitle: "Datos del negocio, tickets, usuarios y base de datos" };
      case "/pos":
        return { title: "Punto de Venta (POS)", subtitle: "Caja rápida y tickets de mostrador" };
      case "/caja":
        return { title: "Caja & Flujo de Dinero", subtitle: "Arqueo de turno y movimientos de efectivo" };
      case "/pedidos":
        return { title: "Pedidos & Encargos", subtitle: "Pasteles personalizados y fechas de entrega" };
      default:
        return { title: "Panaderías Brito", subtitle: "Sistema Integral ERP" };
    }
  };

  const handleRoleSwitch = (demo: User) => {
    loginAs(demo);
    setShowUserMenu(false);
    const targetRoute = getDefaultRouteForUser(demo);
    router.push(targetRoute);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
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
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-stone-100 transition-all border border-stone-200/80 bg-stone-50/80"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brito-orange-600 to-brito-crimson-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-brito-orange-600/20">
              {user?.avatar || "👤"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-stone-900 leading-tight">{user?.name || "Invitado"}</p>
              <p className="text-[9px] text-brito-orange-700 font-bold uppercase tracking-wider">{user?.roleLabel || "Sin Rol"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* User & Role Switcher Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-stone-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/70 mb-2">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Sesión Activa</p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-lg shadow-sm">
                    {user?.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-stone-900 truncate">{user?.name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                      {user?.roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Role Switcher */}
              <div className="p-1 space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brito-orange-500" /> Cambiar de Usuario
                  </span>
                </div>

                {DEMO_USERS.map((demo) => {
                  const isCurrent = user?.id === demo.id;
                  return (
                    <button
                      key={demo.id}
                      onClick={() => handleRoleSwitch(demo)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between font-semibold transition-all ${
                        isCurrent
                          ? "bg-amber-100/80 text-amber-950 font-bold border border-amber-300"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{demo.avatar}</span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold leading-tight">{demo.name}</p>
                          <p className="text-[10px] text-stone-400 truncate">{demo.roleLabel}</p>
                        </div>
                      </div>
                      {isCurrent && <UserCheck className="w-4 h-4 text-brito-orange-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-stone-100 pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-2 transition-colors border border-rose-100"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
