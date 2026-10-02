"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  ChevronDown, 
  LogOut, 
  UserCheck,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  CheckCircle2,
  Building2,
  TrendingUp,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";

import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBranch } from "@/context/BranchContext";
import { useSync } from "@/context/SyncContext";
import { formatCurrency } from "@/lib/utils";
import NotificationsDropdown from "./NotificationsDropdown";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loginAs, logout, getDefaultRouteForUser } = useAuth();
  const { isCollapsed, toggleCollapse } = useSidebar();
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    switchBranch, 
    consolidatedMetrics
  } = useBranch();
  const { isOnline, isSyncing, isSynced, pendingCount } = useSync();

  const [time, setTime] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const branchMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleBranchMenu = () => {
    setShowBranchMenu((prev) => {
      const next = !prev;
      if (next) {
        setShowUserMenu(false);
      }
      return next;
    });
  };

  const toggleUserMenu = () => {
    setShowUserMenu((prev) => {
      const next = !prev;
      if (next) {
        setShowBranchMenu(false);
      }
      return next;
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setShowBranchMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleLogoClick = () => {
    setIsLogoSpinning(true);
    setTimeout(() => setIsLogoSpinning(false), 1200);
  };

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
        return { title: "Dashboard", subtitle: "Métricas y resumen operativo en tiempo real" };
      case "/sucursales":
        return { title: "Control de Sucursales", subtitle: "Monitoreo multi-tienda, turnos y simulador de ventas" };
      case "/clientes":
        return { title: "Clientes & Mayoristas", subtitle: "Directorio de tienditas, clientes frecuentes y crédito" };
      case "/productos":
        return { title: "Catálogo de Productos", subtitle: "Gestión de panes, repostería, precios y fotografías" };
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
      case "/ingresos":
        return { title: "Registro de Ingresos", subtitle: "Control de entradas de dinero, abonos a pedidos y cobros de clientes" };
      case "/caja":
        return { title: "Caja & Flujo de Efectivo", subtitle: "Historial de caja, arqueos y registro de movimientos" };
      case "/pedidos":
        return { title: "Pedidos & Encargos", subtitle: "Pasteles para eventos y fechas de entrega programadas" };
      default:
        return { title: "Panadería Brito", subtitle: "Sistema Integral ERP & POS" };
    }
  };

  const handleRoleSwitch = (demo: User) => {
    loginAs(demo);
    setShowUserMenu(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("brito_session_active", "true");
    }
    router.push("/");
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("brito_session_active");
    }
    router.push("/");
  };

  const current = getPageTitle();

  return (
    <header className="h-16 shrink-0 bg-gradient-to-r from-[#1c0e08] via-[#24130b] to-[#1c0e08] border-b border-[#3d2014] text-white px-2.5 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-[100] shadow-md w-full max-w-full overflow-visible">
      {/* Left: Desktop Collapse Toggle + Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
        {/* Desktop Quick Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex p-2 rounded-xl bg-[#2c170d] hover:bg-[#3d2012] text-amber-200 hover:text-white transition-colors border border-amber-900/60 shrink-0 cursor-pointer"
          title={isCollapsed ? "Desplegar menú lateral" : "Contraer menú lateral"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-orange-600" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-amber-300" />
          )}
        </button>

        {/* Breadcrumb / Title with Official Animated Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Animated Mini Brand Logo */}
          <div 
            onClick={handleLogoClick}
            className="relative cursor-pointer group select-none shrink-0" 
            title="Panadería Brito • Clic para animar"
          >
            <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-[1.5px] bg-gradient-to-tr from-[#f97316] via-[#fb7185] to-[#e11d48] shadow-md shadow-orange-500/20 group-hover:scale-110 group-hover:shadow-rose-500/30 transition-all duration-300 ${
              isLogoSpinning ? "rotate-[360deg] scale-110" : ""
            }`}>
              <div className="w-full h-full bg-white rounded-[14px] p-1 flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Panadería Brito Logo"
                  width={200}
                  height={200}
                  unoptimized
                  priority
                  className="w-full h-full object-contain group-hover:rotate-6 transition-transform duration-300"
                />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-amber-50 tracking-tight leading-tight whitespace-nowrap truncate">
                {current.title}
              </h2>
              <div className="hidden 2xl:inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-200 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 px-3 py-0.5 rounded-full border border-amber-500/30 shadow-xs group cursor-default shrink-0">
                <Sparkles className="w-3 h-3 text-orange-500 group-hover:rotate-180 transition-transform duration-500" />
                <span className="font-extrabold text-amber-200">Panadería</span>
                <span className="text-xs font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  Brito
                </span>
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-200/70 font-medium truncate max-w-[170px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[420px] leading-tight mt-0.5">
              {current.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Offline / Cloud Status Pill */}
        <Link
          href="/configuracion?tab=offline"
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap ${
            !isOnline
              ? "bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 animate-pulse"
              : isSyncing
              ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
              : pendingCount > 0
              ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
              : "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
          }`}
          title={
            !isOnline
              ? `Modo Sin Internet (Offline) - ${pendingCount} venta(s) guardadas localmente en esta PC`
              : isSyncing
              ? "Sincronizando transacciones con el servidor en la nube..."
              : pendingCount > 0
              ? `Conexión activa - ${pendingCount} registro(s) pendiente(s) de subir a la nube`
              : "En Línea y Sincronizado: Toda la información está resguardada en la nube"
          }
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="text-[11px] font-black text-rose-700 hidden sm:inline">Sin Red</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full">
                  {pendingCount}
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
              <span className="text-[11px] font-black text-amber-800 hidden sm:inline">Sincronizando...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-black text-amber-800 hidden sm:inline">{pendingCount} pend.</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-extrabold text-emerald-800 hidden sm:inline">Sincronizado</span>
            </>
          )}
        </Link>

        {/* Branch Selector Dropdown */}
        <div ref={branchMenuRef} className="relative z-[110] shrink-0">
          <button
            onClick={toggleBranchMenu}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-amber-900/60 bg-[#2c170d] hover:bg-[#3d2012] text-amber-100 text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
            title="Cambiar sucursal activa"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="max-w-[65px] sm:max-w-[110px] md:max-w-[140px] truncate">
              {isAllBranches ? "Todas" : currentBranch?.shortName}
            </span>
            <ChevronDown className="w-3 h-3 text-amber-400/80 shrink-0 hidden sm:inline" />
          </button>

          {/* Branch Dropdown Menu */}
          {showBranchMenu && (
            <div className="absolute right-0 mt-2 w-84 max-w-[calc(100vw-32px)] bg-[#1c0e08] rounded-2xl shadow-2xl border-2 border-amber-900/70 p-3 z-[150] animate-in fade-in zoom-in-95 text-stone-100">
              <div className="p-2 pb-2.5 border-b border-amber-900/50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Red de Sucursales</p>
                  <p className="text-sm font-black text-white tracking-wide">Seleccionar Tienda</p>
                </div>
                <Link
                  href="/sucursales"
                  onClick={() => setShowBranchMenu(false)}
                  className="text-xs font-black text-amber-950 hover:text-black bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm transition-all cursor-pointer"
                >
                  Ver Todo
                </Link>
              </div>

              {/* Branch list */}
              <div className="p-1 space-y-1.5 mt-2 max-h-[70vh] overflow-y-auto">
                {/* All Branches option */}
                <button
                  type="button"
                  onClick={() => {
                    switchBranch("all");
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isAllBranches
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 text-stone-950 font-bold shadow-md ring-2 ring-amber-400/40"
                      : "bg-[#28150c]/90 hover:bg-[#381e11] border border-amber-900/60 hover:border-amber-700 text-stone-100 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isAllBranches
                        ? "bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-xs"
                        : "bg-stone-900/90 text-amber-300 border border-amber-900/70"
                    }`}>
                      Σ
                    </div>
                    <div className="min-w-0">
                      <p className={`font-black text-xs leading-tight truncate ${
                        isAllBranches ? "text-stone-950" : "text-white"
                      }`}>
                        Todas las Sucursales
                      </p>
                      <p className={`text-[10px] truncate ${
                        isAllBranches ? "text-stone-600 font-semibold" : "text-amber-200/80 font-medium"
                      }`}>
                        Consolidado general
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className={`text-xs font-black font-mono tracking-tight ${
                      isAllBranches ? "text-emerald-800" : "text-emerald-400"
                    }`}>
                      {formatCurrency(consolidatedMetrics.totalSales)}
                    </p>
                    <p className={`text-[10px] font-semibold ${
                      isAllBranches ? "text-stone-600" : "text-stone-300"
                    }`}>
                      {consolidatedMetrics.totalTickets} tickets
                    </p>
                  </div>
                </button>

                {/* Individual Branches */}
                {branches.map((b) => {
                  const isSelected = !isAllBranches && currentBranch?.id === b.id;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        switchBranch(b.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 text-stone-950 font-bold shadow-md ring-2 ring-amber-400/40"
                          : "bg-[#28150c]/90 hover:bg-[#381e11] border border-amber-900/60 hover:border-amber-700 text-stone-100 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-amber-950/90 text-amber-300 border border-amber-700/60"
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-black text-xs leading-tight truncate ${
                            isSelected ? "text-stone-950" : "text-white"
                          }`}>
                            {b.name}
                          </p>
                          <p className={`text-[11px] truncate ${
                            isSelected ? "text-stone-700 font-semibold" : "text-amber-200/90 font-medium"
                          }`}>
                            {b.currentShift?.cashier || b.manager || "En turno"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <p className={`text-xs font-black font-mono tracking-tight ${
                          isSelected ? "text-amber-950" : "text-amber-300 drop-shadow-2xs"
                        }`}>
                          {formatCurrency(b.todaySales)}
                        </p>
                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md mt-0.5 ${
                          isSelected
                            ? "text-emerald-900 bg-emerald-100 border border-emerald-300"
                            : "text-emerald-300 bg-emerald-950/80 border border-emerald-500/50"
                        }`}>
                          {b.todayTickets} tkts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-1.5 bg-[#2c170d] px-2.5 py-1.5 rounded-xl border border-amber-900/60 text-amber-200 text-xs font-bold shadow-xs shrink-0 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="tabular-nums whitespace-nowrap">{time || "Cargando..."}</span>
        </div>

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* User Session Dropdown */}
        <div ref={userMenuRef} className="relative z-[110] shrink-0">
          <button
            type="button"
            onClick={toggleUserMenu}
            className="flex items-center gap-2 p-1 sm:pr-3 rounded-xl hover:bg-[#3d2012] transition-all border border-amber-900/60 bg-[#2c170d] shadow-xs shrink-0 cursor-pointer"
            title="Cambiar perfil o usuario"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f97316] via-[#fb7185] to-[#e11d48] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-rose-500/20 overflow-hidden shrink-0">
              {user?.photoUrl || (user?.avatar && (user.avatar.startsWith("data:image") || user.avatar.startsWith("http"))) ? (
                <img src={user.photoUrl || user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.avatar || "👨‍🍳"
              )}
            </div>
            <div className="text-left hidden sm:block min-w-0 max-w-[85px] md:max-w-[110px]">
              <p className="text-xs font-black text-amber-50 leading-tight truncate">{user?.name || "Invitado"}</p>
              <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider truncate">{user?.roleLabel || "Sin Rol"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
          </button>

          {/* User & Role Switcher Menu */}
          {showUserMenu && (
            <>
              {/* Mobile backdrop */}
              <div 
                className="fixed inset-0 bg-stone-900/30 backdrop-blur-xs z-[140] sm:hidden"
                onClick={() => setShowUserMenu(false)}
              />

              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-[#1c0e08] rounded-2xl shadow-2xl border border-amber-900/60 p-2.5 z-[150] animate-in fade-in zoom-in-95 text-stone-200">
                <div className="p-2.5 border-b border-amber-900/40 bg-[#24130b] rounded-xl mb-1.5">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Sesión activa:</p>
                  <p className="text-xs font-black text-white">{user?.name}</p>
                  <p className="text-[11px] text-stone-500">{user?.email}</p>
                </div>

                {/* Fast Role Switcher */}
                <div className="p-1 space-y-0.5">
                  <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                    Cambiar de Perfil (Demo):
                  </p>
                  {DEMO_USERS.map((demo) => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => handleRoleSwitch(demo)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-semibold transition-all cursor-pointer ${
                        user?.id === demo.id
                          ? "bg-gradient-to-r from-amber-50 to-orange-50 text-stone-950 font-bold border-2 border-amber-400 shadow-sm"
                          : "text-stone-200 hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{demo.avatar}</span>
                        <div>
                          <span className="font-bold">{demo.name}</span>
                          <p className="text-[10px] text-stone-400 font-medium">{demo.roleLabel}</p>
                        </div>
                      </div>
                      {user?.id === demo.id && <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-stone-100 pt-1.5 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
