"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Store,
  Users,
  Croissant,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  ChevronDown,
  ShoppingBag,
  PlusCircle,
  Receipt,
  BarChart3,
  Sliders,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Flame,
  Sparkles,
  Building2,
  ShieldCheck,
  X
} from "lucide-react";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";

interface NavItemSingle {
  type: "link";
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface NavItemAccordion {
  type: "accordion";
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  items: {
    name: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    badge?: string | null;
  }[];
}

type NavItem = NavItemSingle | NavItemAccordion;

// Exact navigation hierarchy requested:
// 1. DashBoard
// 2. Clientes
// 3. Productos
// 4. Ingresos (Ventas, Registro de ingresos)
// 5. Gastos (Registro de gastos)
// 6. Finanzas (Historial de caja, Resumen financiero)
// 7. Configuración (Catálogos de sistema, Usuarios)
const navigationItems: NavItem[] = [
  {
    type: "link",
    name: "DashBoard",
    href: "/",
    icon: Store,
    badge: null,
  },
  {
    type: "link",
    name: "Sucursales",
    href: "/sucursales",
    icon: Building2,
    badge: "3 Tiendas",
  },
  {
    type: "link",
    name: "Clientes",
    href: "/clientes",
    icon: Users,
    badge: "Activos",
  },
  {
    type: "link",
    name: "Productos",
    href: "/productos",
    icon: Croissant,
    badge: "Catálogo",
  },
  {
    type: "accordion",
    id: "ingresos",
    name: "Ingresos",
    icon: TrendingUp,
    badge: "+Ventas",
    items: [
      { name: "Ventas (POS)", href: "/pos", icon: ShoppingBag, badge: "Caja" },
      { name: "Registro de ingresos", href: "/caja?tab=entradas", icon: PlusCircle, badge: "Abonos" },
    ],
  },
  {
    type: "accordion",
    id: "gastos",
    name: "Gastos",
    icon: TrendingDown,
    badge: "Control",
    items: [
      { name: "Registro de gastos", href: "/caja?tab=salidas", icon: Receipt, badge: "Compras" },
    ],
  },
  {
    type: "accordion",
    id: "finanzas",
    name: "Finanzas",
    icon: DollarSign,
    badge: "Balance",
    items: [
      { name: "Historial de caja", href: "/caja", icon: Receipt, badge: "Arqueo" },
      { name: "Resumen financiero", href: "/finanzas", icon: BarChart3, badge: "Utilidad" },
    ],
  },
  {
    type: "accordion",
    id: "configuracion",
    name: "Configuración",
    icon: Settings,
    badge: null,
    items: [
      { name: "Catálogos de sistema", href: "/configuracion?tab=general", icon: Sliders },
      { name: "Roles", href: "/configuracion?tab=roles", icon: ShieldCheck, badge: "Roles" },
      { name: "Empleados", href: "/configuracion?tab=empleados", icon: Users, badge: "Personal" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, canAccessRoute } = useAuth();
  const { currentBranch, isAllBranches } = useBranch();
  const { 
    isCollapsed, 
    toggleCollapse, 
    isMobileOpen, 
    setMobileOpen,
    openMenus, 
    toggleSubmenu 
  } = useSidebar();

  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
      const handleLocationChange = () => setCurrentSearch(window.location.search);
      window.addEventListener("popstate", handleLocationChange);
      return () => window.removeEventListener("popstate", handleLocationChange);
    }
  }, [pathname]);

  const isPosActive = pathname === "/pos";

  // Filter navigation items by active user role permissions
  const filteredNavigation = navigationItems
    .map((item) => {
      if (item.type === "link") {
        const allowed = canAccessRoute ? canAccessRoute(item.href) : true;
        return allowed ? item : null;
      }
      const allowedChildren = item.items.filter((sub) => {
        const [cleanHref] = sub.href.split("?");
        return canAccessRoute ? canAccessRoute(cleanHref) : true;
      });
      if (allowedChildren.length === 0) return null;
      return {
        ...item,
        items: allowedChildren,
      };
    })
    .filter(Boolean) as NavItem[];

  // Determine exact active child item
  const isItemActive = (href: string) => {
    const [targetPath, targetQuery] = href.split("?");
    if (pathname !== targetPath) return false;
    if (targetQuery) {
      return currentSearch.includes(targetQuery);
    }
    return !currentSearch.includes("tab=");
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Modern Sidebar: Deep Onyx with Brito Brand Orange & Crimson accents */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl border-r border-white/[0.08] bg-[#090a0f] text-stone-200 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header / Brand Logo & Toggle */}
        <div className="flex flex-col border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className={`p-4 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"}`}>
            <div className={`flex items-center gap-3.5 ${isCollapsed ? "justify-center" : ""}`}>
              <AnimatedLogo compact={isCollapsed} size={isCollapsed ? 40 : 52} showGlow={!isCollapsed} />
              {!isCollapsed && (
                <div className="overflow-hidden pl-1">
                  <p className="text-[11px] font-extrabold tracking-[0.28em] text-stone-400 uppercase leading-none select-none">
                    Panadería
                  </p>
                  <div className="flex items-baseline gap-1 my-1">
                    <span
                      className="font-brito-script text-[38px] leading-[0.95] text-white tracking-wide select-none inline-block -rotate-2 bg-gradient-to-r from-white via-orange-100 to-rose-200 bg-clip-text text-transparent"
                      style={{
                        fontFamily: "var(--font-satisfy), 'Satisfy', var(--font-dancing), 'Dancing Script', 'Pacifico', cursive",
                        filter: "drop-shadow(0 2px 10px rgba(249, 115, 22, 0.45)) drop-shadow(0 4px 14px rgba(225, 29, 72, 0.35))",
                      }}
                    >
                      Brito
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/80" />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/80" />
                    <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">
                      ERP & POS
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden flex items-center justify-center p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-stone-400 hover:text-white transition-colors"
              title="Cerrar menú lateral"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Collapse/Expand Toggle Button on Desktop */}
            <button
              onClick={toggleCollapse}
              className={`hidden md:flex items-center justify-center p-1.5 rounded-xl border border-white/[0.08] text-stone-400 hover:text-white hover:bg-white/[0.06] transition-colors ${
                isCollapsed ? "mt-1" : ""
              }`}
              title={isCollapsed ? "Desplegar menú" : "Contraer menú"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-orange-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Modules (Middle Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-stone-800">
          {!isCollapsed && (
            <div className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-wider text-stone-500 uppercase flex items-center justify-between">
              <span>Módulos del Sistema</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.05] text-orange-400 border border-white/[0.06]">
                Oficial
              </span>
            </div>
          )}

          {filteredNavigation.map((item) => {
            // Case 1: Simple Single Link (DashBoard, Clientes, Productos)
            if (item.type === "link") {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false);
                      setCurrentSearch("");
                    }}
                    className={`flex items-center ${
                      isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                    } rounded-xl font-medium transition-all text-xs group ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500/15 via-rose-500/10 to-transparent text-white font-bold border-l-2 border-orange-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
                        : "text-stone-400 hover:text-white hover:bg-white/[0.05] border-l-2 border-transparent"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/25"
                            : "bg-white/[0.03] border border-white/[0.06] text-stone-400 group-hover:text-orange-400 group-hover:border-orange-500/30 group-hover:bg-orange-500/10"
                        }`}
                      >
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </div>
                      {!isCollapsed && <span className="tracking-tight">{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-white/[0.05] text-stone-400 border border-white/[0.06]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip for collapsed view */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#12141c] text-white border border-white/10 text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            }

            // Case 2: Accordion Menu (Ingresos, Gastos, Finanzas, Configuración)
            const isOpen = Boolean(openMenus[item.id]);
            const isChildActive = item.items.some((sub) => isItemActive(sub.href));
            const Icon = item.icon;

            return (
              <div key={item.id} className="relative group rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleSubmenu(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                  } rounded-xl font-medium transition-all text-xs ${
                    isChildActive
                      ? "text-white bg-white/[0.04]"
                      : "text-stone-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isChildActive
                          ? "bg-gradient-to-br from-orange-500/30 to-rose-600/30 text-orange-400 border border-orange-500/30 shadow-sm"
                          : "bg-white/[0.03] border border-white/[0.06] text-stone-400 group-hover:text-orange-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </div>
                    {!isCollapsed && (
                      <span className={`font-semibold ${isChildActive ? "text-white font-bold" : ""}`}>
                        {item.name}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                          item.id === "ingresos"
                            ? "bg-orange-500/15 text-orange-300 border-orange-500/25"
                            : item.id === "gastos"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/25"
                            : "bg-white/[0.05] text-stone-400 border-white/[0.06]"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-orange-400" : ""
                        }`}
                      />
                    </div>
                  )}
                </button>

                {/* Submenu Children (When Expanded) */}
                {!isCollapsed && isOpen && (
                  <div className="mt-1 ml-5 pl-3 border-l border-white/[0.08] space-y-1 animate-in fade-in duration-150">
                    {item.items.map((sub) => {
                      const active = isItemActive(sub.href);
                      const SubIcon = sub.icon;

                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={() => {
                            setMobileOpen(false);
                            const [, query] = sub.href.split("?");
                            setCurrentSearch(query ? `?${query}` : "");
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                            active
                              ? "bg-gradient-to-r from-orange-500/20 via-rose-500/15 to-transparent text-white font-bold border border-orange-500/35 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                              : "text-stone-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {SubIcon ? (
                              <SubIcon className={`w-3.5 h-3.5 ${active ? "text-orange-400" : "text-stone-400"}`} />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-gradient-to-r from-orange-400 to-rose-500 ring-2 ring-orange-400/30" : "bg-stone-500"}`} />
                            )}
                            <span>{sub.name}</span>
                          </div>
                          {sub.badge && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                              active ? "bg-rose-500/30 text-rose-200" : "bg-white/[0.05] text-stone-400"
                            }`}>
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Tooltip / Flyout Menu for Collapsed Sidebar */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-0 hidden group-hover:flex flex-col bg-[#11131c] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 min-w-[200px] animate-in fade-in duration-150">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-orange-300 border-b border-white/[0.06] mb-1 flex items-center justify-between">
                      <span>{item.name}</span>
                      <Icon className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    {item.items.map((sub) => {
                      const active = isItemActive(sub.href);
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={() => {
                            const [, query] = sub.href.split("?");
                            setCurrentSearch(query ? `?${query}` : "");
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                            active
                              ? "bg-gradient-to-r from-orange-500/20 to-rose-500/20 text-white font-bold"
                              : "text-stone-400 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span>{sub.name}</span>
                          {sub.badge && (
                            <span className="text-[8px] font-semibold text-stone-400 bg-white/[0.05] px-1 py-0.5 rounded">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section: Hero POS Action in Brito Brand Dual Gradient */}
        <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] space-y-2">
          {/* Quick Action according to Role */}
          {canAccessRoute && canAccessRoute("/pos") ? (
            <Link
              href="/pos"
              onClick={() => {
                setMobileOpen(false);
                setCurrentSearch("");
              }}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "justify-between p-3.5"
              } rounded-2xl font-bold text-xs transition-all shadow-xl group active:scale-95 ${
                isPosActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400/50 shadow-emerald-500/25 font-black"
                  : "bg-gradient-to-r from-[#f97316] via-[#e11d48] to-[#be123c] hover:brightness-110 text-white font-black shadow-rose-950/40 border border-white/20"
              }`}
              title="Punto de Venta Mostrador (POS)"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <ShoppingBag className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </div>
                {!isCollapsed && (
                  <div className="text-left">
                    <p className="leading-tight font-black tracking-tight text-white">Punto de Venta</p>
                    <p className="text-[9px] font-medium text-orange-100">Caja Mostrador (POS)</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
              )}
            </Link>
          ) : user?.role === "panadero" ? (
            <Link
              href="/inventario"
              onClick={() => {
                setMobileOpen(false);
                setCurrentSearch("");
              }}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "justify-between p-3"
              } rounded-2xl font-bold text-xs transition-all shadow-lg bg-gradient-to-r from-orange-600 to-rose-600 text-white active:scale-95`}
              title="Control de Horno"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                {!isCollapsed && (
                  <div className="text-left">
                    <p className="leading-tight font-black tracking-tight">Control de Horno</p>
                    <p className="text-[9px] font-medium text-orange-100">Recetas & Harinas</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ArrowRight className="w-4 h-4" />
              )}
            </Link>
          ) : null}

          {/* Branch Pill */}
          {!isCollapsed ? (
            <Link
              href="/sucursales"
              onClick={() => setMobileOpen(false)}
              className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-orange-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs transition-all group"
              title="Ver panel de sucursales"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div>
                  <p className="font-bold text-stone-200 text-[10px] tracking-wide group-hover:text-orange-300 transition-colors">
                    {isAllBranches ? "Todas las Sucursales" : currentBranch?.name}
                  </p>
                  <p className="text-[9px] text-stone-400">
                    {isAllBranches ? "Consolidado General" : currentBranch?.manager}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                {isAllBranches ? "Multi-tienda" : "En Línea"}
              </span>
            </Link>
          ) : (
            <Link
              href="/sucursales"
              className="flex justify-center p-1"
              title={isAllBranches ? "Todas las Sucursales" : currentBranch?.name}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20" />
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
