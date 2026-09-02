"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Clock, 
  ChevronDown, 
  LogOut, 
  UserCheck,
  Menu,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loginAs, logout, getDefaultRouteForUser } = useAuth();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar();
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
        return { title: "Dashboard / Inicio", subtitle: "Métricas y actividad operativa en tiempo real" };
      case "/clientes":
        return { title: "Clientes & Mayoristas", subtitle: "Directorio de tienditas, clientes frecuentes y crédito" };
      case "/productos":
        return { title: "Catálogo de Productos", subtitle: "Gestión de panes, repostería fina, precios y fotografías" };
      case "/inventario":
        return { title: "Inventario & Materia Prima", subtitle: "Control de harinas, insumos, compras y mermas" };
      case "/finanzas":
        return { title: "Resumen Financiero", subtitle: "Estado de resultados, ingresos, costos y márgenes de utilidad" };
      case "/reportes":
        return { title: "Reportes & Estadísticas", subtitle: "Panes estrella, horas pico de mostrador y producción" };
      case "/configuracion":
        return { title: "Configuración del Sistema", subtitle: "Catálogos de sistema, datos de tickets y usuarios" };
      case "/pos":
        return { title: "Punto de Venta (POS)", subtitle: "Caja rápida mostrador y tickets de venta" };
      case "/caja":
        return { title: "Caja & Flujo de Efectivo", subtitle: "Historial de caja, arqueos y registro de movimientos" };
      case "/pedidos":
        return { title: "Pedidos & Encargos", subtitle: "Pasteles para eventos y fechas de entrega programadas" };
      default:
        return { title: "Panaderías Brito", subtitle: "Alta Panadería & Pastelería Fina" };
    }
  };

  const handleRoleSwitch = (demo: User) => {
    loginAs(demo);
    setShowUserMenu(false);
    if (getDefaultRouteForUser) {
      const targetRoute = getDefaultRouteForUser(demo);
      router.push(targetRoute);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
  };

  const current = getPageTitle();

  return (
    <header className="h-16 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-[#e8ded1] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_-4px_rgba(40,20,10,0.06)]">
      {/* Left: Hamburger (Mobile) / Collapse Toggle (Desktop) + Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-xl bg-[#f4ebe1] hover:bg-[#ebdccb] text-[#593922] transition-colors border border-[#d8c7b5]"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Quick Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex p-2 rounded-xl bg-[#f5eee4] hover:bg-[#ede1d2] text-[#63442c] transition-colors border border-[#e2d5c5]"
          title={isCollapsed ? "Desplegar menú lateral" : "Contraer menú lateral"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#a16207]" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-[#78350f]" />
          )}
        </button>

        {/* Breadcrumb / Title */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#2e1d14] tracking-tight font-serif">
              {current.title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-full border border-[#fde68a]">
              <Sparkles className="w-2.5 h-2.5" />
              Panadería Fina
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#786958] font-medium line-clamp-1">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Clock with Warm Bakery Tone */}
        <div className="hidden lg:flex items-center gap-2 bg-[#f6eee4] px-3 py-1.5 rounded-xl border border-[#e5d8c8] text-[#573d28] text-xs font-bold shadow-inner">
          <Clock className="w-3.5 h-3.5 text-[#b45309]" />
          <span className="tabular-nums">{time || "Cargando..."}</span>
        </div>

        {/* Facebook Style Notifications */}
        <NotificationsDropdown />

        {/* User Session Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 sm:pr-3 rounded-xl hover:bg-[#f3e9dc] transition-all border border-[#decbb7] bg-[#f9f4ed] shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#994714] to-[#c76520] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-[#994714]/20 border border-[#fde047]/40">
              {user?.avatar || "👨‍🍳"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-[#29180f] leading-tight">{user?.name || "Invitado"}</p>
              <p className="text-[9px] text-[#b45309] font-bold uppercase tracking-wider">{user?.roleLabel || "Sin Rol"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c7a68]" />
          </button>

          {/* User & Role Switcher Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#ffffff] rounded-2xl shadow-2xl border border-[#e5d8c8] p-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="p-2.5 border-b border-[#f0e7dc] bg-[#faf6f0] rounded-xl mb-1.5">
                <p className="text-[10px] text-[#8c7a68] font-bold uppercase tracking-wider">Sesión activa:</p>
                <p className="text-xs font-black text-[#2e1d14]">{user?.name}</p>
                <p className="text-[11px] text-[#786958]">{user?.email}</p>
              </div>

              {/* Fast Role Switcher */}
              <div className="p-1 space-y-0.5">
                <p className="text-[9px] font-bold text-[#a89886] uppercase tracking-wider px-2 py-1">
                  Cambiar de Perfil (Demo):
                </p>
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => handleRoleSwitch(demo)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-semibold transition-all ${
                      user?.id === demo.id
                        ? "bg-[#fef3c7] text-[#92400e] font-bold border border-[#fde68a]"
                        : "text-[#573d28] hover:bg-[#f6eee4]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{demo.avatar}</span>
                      <div>
                        <span className="font-bold">{demo.name}</span>
                        <p className="text-[10px] text-[#8c7a68] font-medium">{demo.roleLabel}</p>
                      </div>
                    </div>
                    {user?.id === demo.id && <UserCheck className="w-3.5 h-3.5 text-[#b45309]" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-[#f0e7dc] pt-1.5 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
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
