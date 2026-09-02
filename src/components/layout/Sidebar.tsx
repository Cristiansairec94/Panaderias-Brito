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
  Sparkles,
  ArrowRight,
  Flame
} from "lucide-react";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

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
      { name: "Usuarios", href: "/configuracion?tab=usuarios", icon: UserCheck, badge: "Roles" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, canAccessRoute } = useAuth();
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

  // Helper to determine exact active child (checking path + query params)
  const isItemActive = (href: string) => {
    const [targetPath, targetQuery] = href.split("?");
    if (pathname !== targetPath) return false;
    if (targetQuery) {
      return currentSearch.includes(targetQuery);
    }
    // If target has no query (e.g. /caja), active only when no ?tab= is active
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

      {/* Main Sidebar: Modern Luxury Dark Graphite */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl border-r border-white/[0.08] bg-[#0c0d12] text-stone-200 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header / Brand Logo & Toggle */}
        <div className="flex flex-col border-b border-white/[0.06] bg-white/[0.02]">
          <div className={`p-4 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <AnimatedLogo compact={isCollapsed} size={isCollapsed ? 38 : 46} showGlow={!isCollapsed} />
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-stone-300 tracking-tight">Panadería</span>
                    <span className="font-black text-sm bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent tracking-tight">
                      Brito
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-stone-400 tracking-wide flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ERP & Punto de Venta
                  </p>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle Button on Desktop */}
            <button
              onClick={toggleCollapse}
              className={`hidden md:flex items-center justify-center p-1.5 rounded-xl border border-white/[0.08] text-stone-400 hover:text-white hover:bg-white/[0.06] transition-colors ${
                isCollapsed ? "mt-1" : ""
              }`}
              title={isCollapsed ? "Desplegar menú" : "Contraer menú"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-amber-400" />
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
              <span>Navegación</span>
              <span className="text-[9px] text-amber-400/80 font-mono font-medium">v1.5</span>
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
                        ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent text-amber-300 font-bold border-l-2 border-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                        : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] border-l-2 border-transparent"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/[0.03] border border-white/[0.06] text-stone-400 group-hover:text-amber-400 group-hover:border-amber-500/20 group-hover:bg-amber-500/10"
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
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/[0.05] text-stone-400 border border-white/[0.06]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip for collapsed view */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#14161f] text-stone-100 border border-white/10 text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
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
                      ? "text-stone-100 bg-white/[0.04]"
                      : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.03]"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isChildActive
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-white/[0.03] border border-white/[0.06] text-stone-400 group-hover:text-amber-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </div>
                    {!isCollapsed && (
                      <span className={`font-semibold ${isChildActive ? "text-stone-100 font-bold" : ""}`}>
                        {item.name}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-stone-400 border border-white/[0.06]">
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-amber-400" : ""
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
                              ? "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent text-amber-300 font-bold border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)]"
                              : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {SubIcon ? (
                              <SubIcon className={`w-3.5 h-3.5 ${active ? "text-amber-400" : "text-stone-400"}`} />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-amber-400 ring-2 ring-amber-400/30" : "bg-stone-500"}`} />
                            )}
                            <span>{sub.name}</span>
                          </div>
                          {sub.badge && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                              active ? "bg-amber-500/30 text-amber-200" : "bg-white/[0.05] text-stone-400"
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
                  <div className="absolute left-full ml-3 top-0 hidden group-hover:flex flex-col bg-[#12141c] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 min-w-[200px] animate-in fade-in duration-150">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-amber-300 border-b border-white/[0.06] mb-1 flex items-center justify-between">
                      <span>{item.name}</span>
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
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
                              ? "bg-amber-500/20 text-amber-300 font-bold"
                              : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-100"
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

        {/* Bottom Section: Modern POS Quick Action & Branch Pill */}
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
                isCollapsed ? "justify-center p-2.5" : "justify-between p-3"
              } rounded-2xl font-bold text-xs transition-all shadow-lg group active:scale-95 ${
                isPosActive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 ring-2 ring-emerald-400/50 shadow-emerald-500/20 font-black"
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black shadow-orange-500/20 hover:shadow-orange-500/30"
              }`}
              title="Punto de Venta Mostrador (POS)"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-black/15 rounded-xl">
                  <ShoppingBag className="w-4 h-4 text-stone-950 group-hover:scale-110 transition-transform" />
                </div>
                {!isCollapsed && (
                  <div className="text-left">
                    <p className="leading-tight font-black tracking-tight text-stone-950">Punto de Venta</p>
                    <p className="text-[9px] font-semibold text-stone-900/80">Caja Mostrador (POS)</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-stone-950" />
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
              } rounded-2xl font-bold text-xs transition-all shadow-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white active:scale-95`}
              title="Control de Horno"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                {!isCollapsed && (
                  <div className="text-left">
                    <p className="leading-tight font-black tracking-tight">Control de Horno</p>
                    <p className="text-[9px] font-medium text-amber-100">Recetas & Harinas</p>
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
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div>
                  <p className="font-bold text-stone-200 text-[10px] tracking-wide">Sucursal Matriz</p>
                  <p className="text-[9px] text-stone-400">Don Toño Brito</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                En Línea
              </span>
            </div>
          ) : (
            <div className="flex justify-center" title="Sucursal Matriz En Línea">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
