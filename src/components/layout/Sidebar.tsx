"use client";

import React from "react";
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

// Exact navigation structure requested by user:
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

  const isPosActive = pathname === "/pos";

  // Filter navigation items by active user role permissions
  const filteredNavigation = navigationItems
    .map((item) => {
      if (item.type === "link") {
        const allowed = canAccessRoute ? canAccessRoute(item.href) : true;
        return allowed ? item : null;
      }
      // Accordion: filter children
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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl border-r border-[#3d271a] bg-gradient-to-b from-[#1c120c] via-[#160d09] to-[#0f0805] text-[#ede6dd] ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header / Brand Logo & Toggle */}
        <div className="flex flex-col border-b border-[#3d271a]/80 bg-[#241710]/50 relative">
          {/* Subtle Golden Hairline Accent on top */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

          <div className={`p-4 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <AnimatedLogo compact={isCollapsed} size={isCollapsed ? 44 : 58} showGlow={!isCollapsed} />
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-black text-sm tracking-wide text-white uppercase font-serif drop-shadow-sm">
                      Panaderías Brito
                    </h1>
                  </div>
                  <p className="text-[10px] font-semibold text-[#d4af37] tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#fef08a]" />
                    Alta Panadería Fina
                  </p>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle Button on Desktop */}
            <button
              onClick={toggleCollapse}
              className={`hidden md:flex items-center justify-center p-1.5 rounded-lg border border-[#4a3020] text-[#c7baa8] hover:text-[#fef08a] hover:bg-[#342014] transition-colors ${
                isCollapsed ? "mt-1" : ""
              }`}
              title={isCollapsed ? "Desplegar menú completo" : "Contraer menú"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#d4af37]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-[#c7baa8]" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Modules (Middle Scrollable) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-[#3d271a]">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[9px] font-extrabold tracking-widest text-[#a89886] uppercase flex items-center justify-between">
              <span>Menú Principal</span>
              <span className="text-[#d4af37] text-[10px]">★ Tradición 1985</span>
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
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center ${
                      isCollapsed ? "justify-center px-2 py-3" : "justify-between px-3.5 py-2.5"
                    } rounded-xl font-medium transition-all text-xs group ${
                      isActive
                        ? "bg-gradient-to-r from-[#994714] via-[#b35718] to-[#c76520] text-white font-bold shadow-lg shadow-[#b35718]/30 border border-[#f59e0b]/40"
                        : "text-[#dcd1c4] hover:bg-[#291a12] hover:text-white hover:border-[#4d3221] border border-transparent"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-lg ${isActive ? "bg-white/20" : "bg-[#2b1b13] text-[#d4af37] group-hover:text-[#fef08a]"}`}>
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </div>
                      {!isCollapsed && <span className="tracking-tight">{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-[#2a1b13] text-[#d4af37] border border-[#4a3121]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip for collapsed view */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#241710] text-[#fef08a] border border-[#d4af37]/40 text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            }

            // Case 2: Accordion Menu (Ingresos, Gastos, Finanzas, Configuración)
            const isOpen = Boolean(openMenus[item.id]);
            const isChildActive = item.items.some((sub) => {
              const [cleanHref] = sub.href.split("?");
              return pathname === cleanHref;
            });
            const Icon = item.icon;

            return (
              <div key={item.id} className="relative group rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleSubmenu(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-2 py-3" : "justify-between px-3.5 py-2.5"
                  } rounded-xl font-medium transition-all text-xs ${
                    isChildActive
                      ? "bg-[#2e1d14] text-[#fef08a] border border-[#d4af37]/40 shadow-sm"
                      : "text-[#dcd1c4] hover:bg-[#271911] hover:text-white"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-lg ${isChildActive ? "bg-[#d4af37]/20 text-[#fef08a]" : "bg-[#251710] text-[#d4af37]"}`}>
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
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#251710] text-[#d4af37] border border-[#442c1d]">
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#a89886] transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#d4af37]" : ""
                        }`}
                      />
                    </div>
                  )}
                </button>

                {/* Submenu Children (When Expanded) */}
                {!isCollapsed && isOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-[#523623] space-y-1 animate-in fade-in duration-200">
                    {item.items.map((sub) => {
                      const [cleanHref] = sub.href.split("?");
                      const isSubActive = pathname === cleanHref;
                      const SubIcon = sub.icon;

                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSubActive
                              ? "bg-gradient-to-r from-[#994714] to-[#b35718] text-white font-bold shadow-md shadow-[#994714]/20 border border-[#f59e0b]/40"
                              : "text-[#c7baa8] hover:text-white hover:bg-[#2b1b13]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {SubIcon ? (
                              <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? "text-white" : "text-[#d4af37]"}`} />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? "bg-white" : "bg-[#d4af37]"}`} />
                            )}
                            <span>{sub.name}</span>
                          </div>
                          {sub.badge && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-black/30 text-[#fef08a]">
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
                  <div className="absolute left-full ml-3 top-0 hidden group-hover:flex flex-col bg-[#1c120c] border border-[#d4af37]/50 rounded-xl p-2 shadow-2xl z-50 min-w-[190px] animate-in fade-in duration-150">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-[#fef08a] border-b border-[#3d271a] mb-1 flex items-center justify-between">
                      <span>{item.name}</span>
                      <Icon className="w-3.5 h-3.5 text-[#d4af37]" />
                    </div>
                    {item.items.map((sub) => {
                      const [cleanHref] = sub.href.split("?");
                      const isSubActive = pathname === cleanHref;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                            isSubActive
                              ? "bg-[#994714] text-white font-bold"
                              : "text-[#dcd1c4] hover:bg-[#2d1c13] hover:text-white"
                          }`}
                        >
                          <span>{sub.name}</span>
                          {sub.badge && (
                            <span className="text-[8px] font-bold text-[#fef08a] bg-[#140b07] px-1 py-0.5 rounded border border-[#3d271a]">
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

        {/* Bottom Section: Quick POS Terminal & Bakery Seal */}
        <div className="p-3 border-t border-[#3d271a] bg-[#160d09]/90 space-y-2">
          {/* Quick Action according to Role */}
          {canAccessRoute && canAccessRoute("/pos") ? (
            <Link
              href="/pos"
              onClick={() => setMobileOpen(false)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "justify-between p-3"
              } rounded-2xl font-bold text-xs transition-all shadow-xl group active:scale-95 ${
                isPosActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white ring-2 ring-emerald-400/80 shadow-emerald-700/30"
                  : "bg-gradient-to-r from-[#b35718] via-[#c76520] to-[#994714] hover:from-[#c76520] hover:to-[#b35718] text-white shadow-amber-950/40 border border-[#f59e0b]/50"
              }`}
              title="Punto de Venta Mostrador (POS)"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-xl">
                  <ShoppingBag className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </div>
                {!isCollapsed && (
                  <div className="text-left">
                    <p className="leading-tight font-black tracking-tight">Punto de Venta</p>
                    <p className="text-[9px] font-medium text-amber-100">Caja Mostrador (POS)</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#fef08a]" />
              )}
            </Link>
          ) : user?.role === "panadero" ? (
            <Link
              href="/inventario"
              onClick={() => setMobileOpen(false)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "justify-between p-3"
              } rounded-2xl font-bold text-xs transition-all shadow-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white active:scale-95`}
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

          {/* Bakery Heritage Stamp / Sucursal Matriz */}
          {!isCollapsed ? (
            <div className="bg-[#241710]/70 border border-[#442c1d] rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
                <div>
                  <p className="font-bold text-stone-100 text-[10px] tracking-wide">Sucursal Matriz</p>
                  <p className="text-[9px] text-[#d4af37]">Don Toño Brito • Don Benito</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-[#fef08a] bg-[#140b07] border border-[#d4af37]/40 px-2 py-0.5 rounded-md">
                v1.5 ERP Fino
              </span>
            </div>
          ) : (
            <div className="flex justify-center" title="Sucursal Matriz Activa">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
