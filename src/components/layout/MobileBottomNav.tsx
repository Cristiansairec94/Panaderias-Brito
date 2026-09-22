"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Store, 
  CalendarClock, 
  ShoppingBag, 
  Receipt, 
  Menu,
  Flame
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, canAccessRoute } = useAuth();
  const { isMobileOpen, toggleMobile, setMobileOpen } = useSidebar();

  // Si no hay usuario logueado, no mostrar la barra
  if (!user) return null;

  const isPos = pathname === "/pos";
  const isDashboard = pathname === "/";
  const isPedidos = pathname.startsWith("/pedidos");
  const isCaja = pathname.startsWith("/caja") || pathname.startsWith("/finanzas");

  const canAccessPos = canAccessRoute ? canAccessRoute("/pos") : true;
  const canAccessPedidos = canAccessRoute ? canAccessRoute("/pedidos") : true;
  const canAccessCaja = canAccessRoute ? canAccessRoute("/caja") : true;

  const handleLinkClick = () => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <nav 
      aria-label="Navegación inferior móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] px-2 sm:px-4 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto relative h-14">
        
        {/* 1. Inicio / Dashboard */}
        <Link
          href="/"
          onClick={handleLinkClick}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
            isDashboard
              ? "text-orange-600 font-black"
              : "text-stone-400 hover:text-stone-600 font-semibold"
          }`}
          title="Dashboard / Inicio"
        >
          <div className="relative">
            <Store className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDashboard ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            {isDashboard && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Inicio</span>
        </Link>

        {/* 2. Pedidos */}
        {canAccessPedidos ? (
          <Link
            href="/pedidos"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
              isPedidos
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Pedidos & Encargos"
          >
            <div className="relative">
              <CalendarClock className={`w-5 h-5 transition-transform group-hover:scale-110 ${isPedidos ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isPedidos && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Pedidos</span>
          </Link>
        ) : (
          <Link
            href="/inventario"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
              pathname.startsWith("/inventario")
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Inventario"
          >
            <Flame className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Horno</span>
          </Link>
        )}

        {/* 3. BOTÓN CENTRAL DESTACADO: POS COBRO RÁPIDO */}
        {canAccessPos ? (
          <div className="relative -top-3 flex flex-col items-center shrink-0">
            <Link
              href="/pos"
              onClick={handleLinkClick}
              className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90 border-2 border-white ${
                isPos
                  ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white ring-4 ring-orange-500/30 shadow-[0_6px_20px_rgba(249,115,22,0.5)] scale-105"
                  : "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white hover:brightness-110 shadow-[0_6px_18px_rgba(234,88,12,0.4)]"
              }`}
              title="Punto de Venta Mostrador (POS)"
            >
              <ShoppingBag className="w-6 h-6 stroke-[2.2] text-white" />
            </Link>
            <span className={`text-[10px] font-black tracking-tight mt-0.5 leading-none ${isPos ? "text-orange-600" : "text-stone-600"}`}>
              POS
            </span>
          </div>
        ) : (
          <div className="relative -top-3 flex flex-col items-center shrink-0">
            <Link
              href="/productos"
              onClick={handleLinkClick}
              className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 border-2 border-white shadow-[0_6px_18px_rgba(234,88,12,0.4)]"
              title="Catálogo de Productos"
            >
              <Store className="w-6 h-6 stroke-[2] text-white" />
            </Link>
            <span className="text-[10px] font-black text-stone-600 tracking-tight mt-0.5 leading-none">
              Panes
            </span>
          </div>
        )}

        {/* 4. Caja / Flujo */}
        {canAccessCaja ? (
          <Link
            href="/caja"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
              isCaja
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Caja & Arqueos"
          >
            <div className="relative">
              <Receipt className={`w-5 h-5 transition-transform group-hover:scale-110 ${isCaja ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isCaja && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Caja</span>
          </Link>
        ) : (
          <Link
            href="/reportes"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
              pathname.startsWith("/reportes")
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Reportes"
          >
            <Receipt className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Reportes</span>
          </Link>
        )}

        {/* 5. Menú Completo (Drawer Lateral) */}
        <button
          type="button"
          onClick={toggleMobile}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
            isMobileOpen
              ? "text-orange-600 font-black"
              : "text-stone-400 hover:text-stone-600 font-semibold"
          }`}
          title="Abrir menú completo"
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform group-hover:scale-110 ${isMobileOpen ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            {isMobileOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Menú</span>
        </button>

      </div>
    </nav>
  );
}
