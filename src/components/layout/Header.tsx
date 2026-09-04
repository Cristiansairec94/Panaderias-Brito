"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Clock, 
  ChevronDown, 
  LogOut, 
  UserCheck,
  Menu,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  Zap,
  CheckCircle2,
  Building2,
  TrendingUp,
  Radio
} from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBranch } from "@/context/BranchContext";
import { formatCurrency } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loginAs, logout, getDefaultRouteForUser } = useAuth();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar();
  const { 
    branches, 
    currentBranch, 
    isAllBranches, 
    switchBranch, 
    simulateSale, 
    isLiveSimulating,
    toggleLiveSimulation,
    consolidatedMetrics
  } = useBranch();

  const [time, setTime] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [simulatedAlert, setSimulatedAlert] = useState<string | null>(null);

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

  const handleQuickSimulate = () => {
    const sale = simulateSale();
    setSimulatedAlert(`+${formatCurrency(sale.total)} (${sale.branchName})`);
    setTimeout(() => setSimulatedAlert(null), 2500);
  };

  const current = getPageTitle();

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-[70] shadow-sm">
      {/* Left: Hamburger / Collapse Toggle + Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Quick Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex p-2 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 hover:text-stone-900 transition-colors border border-stone-200/80"
          title={isCollapsed ? "Desplegar menú lateral" : "Contraer menú lateral"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-orange-600" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Breadcrumb / Title with Official Animated Brand Logo */}
        <div className="flex items-center gap-3">
          {/* Animated Mini Brand Logo */}
          <div 
            onClick={handleLogoClick}
            className="relative cursor-pointer group select-none shrink-0" 
            title="Panadería Brito • Clic para animar"
          >
            <div className={`relative w-10 h-10 rounded-2xl p-[1.5px] bg-gradient-to-tr from-[#f97316] via-[#fb7185] to-[#e11d48] shadow-md shadow-orange-500/20 group-hover:scale-110 group-hover:shadow-rose-500/30 transition-all duration-300 ${
              isLogoSpinning ? "rotate-[360deg] scale-110" : ""
            }`}>
              <div className="w-full h-full bg-white rounded-[14px] p-1 flex items-center justify-center overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Panadería Brito Logo"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain group-hover:rotate-6 transition-transform duration-300"
                  priority
                />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-tight">
                {current.title}
              </h2>
              <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-800 bg-gradient-to-r from-orange-50 via-rose-50 to-orange-50 px-3 py-0.5 rounded-full border border-rose-200/80 shadow-xs group cursor-default">
                <Sparkles className="w-3 h-3 text-orange-500 group-hover:rotate-180 transition-transform duration-500" />
                <span className="font-extrabold text-stone-700">Panadería</span>
                <span className="text-xs font-black bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
                  Brito
                </span>
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium line-clamp-1 mt-0.5">
              {current.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Sale Simulator Button */}
        <div className="relative">
          <button
            onClick={handleQuickSimulate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            title="Simular 1 venta en la sucursal activa"
          >
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span className="hidden md:inline">Simular Venta</span>
          </button>

          {/* Toast Alert when simulated */}
          {simulatedAlert && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-950 text-emerald-400 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xl border border-emerald-500/40 z-50 whitespace-nowrap animate-in fade-in zoom-in-95 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{simulatedAlert}</span>
            </div>
          )}
        </div>

        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50/80 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-all shadow-sm"
            title="Cambiar sucursal activa"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Building2 className="w-3.5 h-3.5 text-orange-600" />
            <span className="max-w-[80px] sm:max-w-[140px] truncate">
              {isAllBranches ? "Todas las Sucursales" : currentBranch?.shortName}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {/* Branch Dropdown Menu */}
          {showBranchMenu && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-stone-200 p-2.5 z-[100] animate-in fade-in zoom-in-95">
              <div className="p-2 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Red de Sucursales</p>
                  <p className="text-xs font-black text-stone-900">Seleccionar Tienda</p>
                </div>
                <Link
                  href="/sucursales"
                  onClick={() => setShowBranchMenu(false)}
                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200"
                >
                  Ver Todo
                </Link>
              </div>

              {/* Branch list */}
              <div className="p-1 space-y-1 mt-1">
                {/* All Branches option */}
                <button
                  onClick={() => {
                    switchBranch("all");
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                    isAllBranches
                      ? "bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 text-stone-900 font-bold"
                      : "hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-black">
                      Σ
                    </div>
                    <div>
                      <p className="font-black text-xs leading-tight">Todas las Sucursales</p>
                      <p className="text-[10px] text-stone-400">Consolidado general</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-700">{formatCurrency(consolidatedMetrics.totalSales)}</p>
                    <p className="text-[9px] text-stone-400">{consolidatedMetrics.totalTickets} tickets</p>
                  </div>
                </button>

                {/* Individual Branches */}
                {branches.map((b) => {
                  const isSelected = !isAllBranches && currentBranch?.id === b.id;

                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-orange-50 border border-orange-200 text-stone-900 font-bold shadow-sm"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">{b.name}</p>
                          <p className="text-[10px] text-stone-400">{b.currentShift.cashier}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-stone-900">{formatCurrency(b.todaySales)}</p>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {b.todayTickets} tkts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Live simulation toggle inside menu */}
              <div className="border-t border-stone-100 pt-2 mt-1.5 px-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 ${isLiveSimulating ? "text-emerald-500 animate-pulse" : "text-stone-400"}`} />
                  <span className="text-[11px] font-semibold text-stone-700">Ventas en Vivo:</span>
                </div>
                <button
                  onClick={toggleLiveSimulation}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                    isLiveSimulating
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                  }`}
                >
                  {isLiveSimulating ? "Activo (8s)" : "Pausado"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/80 text-stone-700 text-xs font-bold shadow-sm">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span className="tabular-nums">{time || "Cargando..."}</span>
        </div>

        {/* Facebook Style Notifications */}
        <NotificationsDropdown />

        {/* User Session Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 sm:pr-3 rounded-xl hover:bg-stone-100 transition-all border border-stone-200/80 bg-stone-50/70 shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f97316] via-[#fb7185] to-[#e11d48] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-rose-500/20 overflow-hidden">
              {user?.photoUrl || (user?.avatar && (user.avatar.startsWith("data:image") || user.avatar.startsWith("http"))) ? (
                <img src={user.photoUrl || user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.avatar || "👨‍🍳"
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-stone-900 leading-tight">{user?.name || "Invitado"}</p>
              <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider">{user?.roleLabel || "Sin Rol"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* User & Role Switcher Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-stone-200 p-2.5 z-[100] animate-in fade-in zoom-in-95">
              <div className="p-2.5 border-b border-stone-100 bg-stone-50/60 rounded-xl mb-1.5">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Sesión activa:</p>
                <p className="text-xs font-black text-stone-900">{user?.name}</p>
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
                    onClick={() => handleRoleSwitch(demo)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-semibold transition-all ${
                      user?.id === demo.id
                        ? "bg-amber-50 text-amber-900 font-bold border border-amber-200"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{demo.avatar}</span>
                      <div>
                        <span className="font-bold">{demo.name}</span>
                        <p className="text-[10px] text-stone-400 font-medium">{demo.roleLabel}</p>
                      </div>
                    </div>
                    {user?.id === demo.id && <UserCheck className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-1.5 mt-1">
                <button
                  onClick={handleLogout}
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
