"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Store, 
  Croissant, 
  Sliders, 
  Receipt, 
  Menu
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobileOpen, toggleMobile, setMobileOpen } = useSidebar();

  // Si no hay usuario logueado, no mostrar la barra
  if (!user) return null;

  const isDashboard = pathname === "/";
  const isProductos = pathname.startsWith("/productos");
  const isConfig = pathname.startsWith("/configuracion");
  const isFinanzas = pathname.startsWith("/caja") || pathname.startsWith("/finanzas");

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

        {/* 2. Precios & Catálogo de Panes */}
        <Link
          href="/productos"
          onClick={handleLinkClick}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
            isProductos
              ? "text-orange-600 font-black"
              : "text-stone-400 hover:text-stone-600 font-semibold"
          }`}
          title="Catálogo & Modificar Precios"
        >
          <div className="relative">
            <Croissant className={`w-5 h-5 transition-transform group-hover:scale-110 ${isProductos ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            {isProductos && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Precios</span>
        </Link>

        {/* 3. BOTÓN CENTRAL FLOTANTE DESTACADO: CONFIGURACIÓN DEL SISTEMA (Sin POS) */}
        <div className="relative -top-3 flex flex-col items-center shrink-0">
          <Link
            href="/configuracion"
            onClick={handleLinkClick}
            className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90 border-2 border-white ${
              isConfig
                ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white ring-4 ring-orange-500/30 shadow-[0_6px_20px_rgba(249,115,22,0.5)] scale-105"
                : "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white hover:brightness-110 shadow-[0_6px_18px_rgba(234,88,12,0.4)]"
            }`}
            title="Configuración del Sistema y Catálogos"
          >
            <Sliders className="w-6 h-6 stroke-[2.2] text-white" />
          </Link>
          <span className={`text-[10px] font-black tracking-tight mt-0.5 leading-none ${isConfig ? "text-orange-600" : "text-stone-700"}`}>
            Config
          </span>
        </div>

        {/* 4. Finanzas / Caja */}
        <Link
          href="/caja"
          onClick={handleLinkClick}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
            isFinanzas
              ? "text-orange-600 font-black"
              : "text-stone-400 hover:text-stone-600 font-semibold"
          }`}
          title="Finanzas & Flujo de Caja"
        >
          <div className="relative">
            <Receipt className={`w-5 h-5 transition-transform group-hover:scale-110 ${isFinanzas ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            {isFinanzas && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Finanzas</span>
        </Link>

        {/* 5. Menú Completo (Desglose de todas las opciones) */}
        <button
          type="button"
          onClick={toggleMobile}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all active:scale-95 group ${
            isMobileOpen
              ? "text-orange-600 font-black"
              : "text-stone-400 hover:text-stone-600 font-semibold"
          }`}
          title="Abrir menú para desglosar opciones"
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
