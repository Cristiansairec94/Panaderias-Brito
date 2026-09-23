"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Store, 
  Building2, 
  CalendarClock,
  Bell, 
  Croissant, 
  Menu,
  X,
  CheckCheck,
  MoreHorizontal,
  Trash2,
  Volume2,
  VolumeX,
  Inbox
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { NotificationItem, getBadgeIcon } from "./NotificationsDropdown";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobileOpen, toggleMobile, setMobileOpen } = useSidebar();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const {
    notifications,
    unreadCount,
    soundEnabled,
    nativePermission,
    realtimeStatus,
    requestNativePermission,
    toggleSound,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  // Si no hay usuario logueado, no mostrar la barra
  if (!user) return null;

  const isDashboard = pathname === "/";
  const isSucursales = pathname.startsWith("/sucursales");
  const isPedidos = pathname.startsWith("/pedidos");
  const isProductos = pathname.startsWith("/productos");

  const handleLinkClick = () => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
    if (showNotifications) {
      setShowNotifications(false);
    }
  };

  const handleToggleNotifications = () => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
    setShowNotifications((prev) => !prev);
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const recentNotifications = filtered.filter((n) => n.group === "recientes");
  const olderNotifications = filtered.filter((n) => n.group === "anteriores");

  return (
    <>
      {/* Panel Móvil de Notificaciones (Bottom Sheet) */}
      {showNotifications && (
        <div 
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end pointer-events-none animate-in fade-in duration-200"
          style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {/* Backdrop con desenfoque */}
          <div 
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity pointer-events-auto"
            onClick={() => {
              setShowNotifications(false);
              setShowOptionsMenu(false);
              setActiveItemMenu(null);
            }}
          />

          {/* Sheet deslizable hacia arriba con estilo y espaciado exacto de maqueta */}
          <div className="relative z-50 bg-[#faf6f0] rounded-[28px] sm:rounded-[32px] mx-2 sm:mx-auto max-w-lg w-[calc(100%-1rem)] sm:w-full shadow-2xl border border-[#e8ded2] max-h-[82vh] flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300">
            {/* Grab handle táctil */}
            <div className="w-12 h-1 bg-stone-300/80 rounded-full mx-auto mt-2.5 mb-1.5 shrink-0" />

            {/* Cabecera y Controles */}
            <div className="p-4 sm:p-5 pb-2 flex flex-col shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-[22px] font-bold text-stone-900 tracking-tight">
                  Avisos & Notificaciones
                </h3>

                <div className="flex items-center gap-1">
                  {/* Menú de opciones rápidas */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors"
                      title="Opciones de notificaciones"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showOptionsMenu && (
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-[60] text-xs font-semibold space-y-1 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            markAllAsRead();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4 text-emerald-600" /> Marcar todas como leídas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleSound();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between text-stone-700 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#c25425]" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                            Sonidos de alerta
                          </span>
                          <span className="text-[10px] font-bold text-stone-400">{soundEnabled ? "Activo" : "Mudo"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearAll();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Limpiar todas
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cerrar modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      setShowOptionsMenu(false);
                      setActiveItemMenu(null);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors"
                    title="Cerrar avisos"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Botones de filtro y enlace marcar todo como leído */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-[#ebe4dc] text-stone-900 font-semibold shadow-2xs border border-transparent"
                      : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("unread")}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                    activeTab === "unread"
                      ? "bg-[#ebe4dc] text-stone-900 font-semibold shadow-2xs border border-transparent"
                      : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                  }`}
                >
                  No leídas ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-[#c25425] hover:text-[#9e3f18] underline underline-offset-2 font-medium text-xs sm:text-[13px] ml-1.5 cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed transition-colors"
                >
                  Marcar todo como leído
                </button>
              </div>

              {/* Banner de aviso móvil */}
              {showBanner && (
                <div className="bg-[#f4ede4] border border-[#ebdcd0] rounded-2xl p-2.5 sm:p-3 px-3.5 flex items-center justify-between gap-3 mt-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowBanner(false)}
                      className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 shrink-0"
                      title="Descartar aviso"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-xs sm:text-[13px] font-medium text-stone-800 truncate">
                      Activar avisos en celular
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      requestNativePermission();
                    }}
                    className="bg-[#c25425] hover:bg-[#a8441b] text-white text-xs font-semibold px-4 py-1.5 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {nativePermission === "granted" ? "Activado" : "Activar"}
                  </button>
                </div>
              )}
            </div>

            {/* Lista con scroll y tarjetas */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-3 space-y-3.5 overscroll-contain">
              {filtered.length === 0 ? (
                <div className="p-8 my-4 text-center text-stone-400 flex flex-col items-center justify-center space-y-2 bg-white/70 rounded-2xl border border-[#ede5dc]">
                  <Inbox className="w-10 h-10 text-stone-300 stroke-[1.5]" />
                  <p className="font-bold text-sm text-stone-800">No hay notificaciones pendientes</p>
                  <p className="text-xs text-stone-400">Te avisaremos con alertas de horno, pedidos o caja.</p>
                </div>
              ) : (
                <>
                  {recentNotifications.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pt-1 px-0.5">
                        <h4 className="text-base sm:text-[17px] font-bold text-stone-900 tracking-tight">
                          Recientes
                        </h4>
                        <span className="text-xs text-stone-400 font-normal">
                          {recentNotifications.length} nuevas
                        </span>
                      </div>
                      {recentNotifications.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          notif={notif}
                          getBadgeIcon={getBadgeIcon}
                          markAsRead={markAsRead}
                          markAsUnread={markAsUnread}
                          deleteNotification={deleteNotification}
                          activeItemMenu={activeItemMenu}
                          setActiveItemMenu={setActiveItemMenu}
                          onCloseDropdown={() => setShowNotifications(false)}
                        />
                      ))}
                    </div>
                  )}

                  {olderNotifications.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between px-0.5">
                        <h4 className="text-sm sm:text-base font-bold text-stone-500">
                          Anteriores
                        </h4>
                      </div>
                      {olderNotifications.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          notif={notif}
                          getBadgeIcon={getBadgeIcon}
                          markAsRead={markAsRead}
                          markAsUnread={markAsUnread}
                          deleteNotification={deleteNotification}
                          activeItemMenu={activeItemMenu}
                          setActiveItemMenu={setActiveItemMenu}
                          onCloseDropdown={() => setShowNotifications(false)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="py-2.5 text-center text-xs text-stone-400 font-normal shrink-0 border-t border-[#ede5dc]/70 bg-[#faf6f0]">
              Panadería Brito • Avisos en vivo
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior Móvil (Dock) */}
      <nav 
        aria-label="Navegación inferior móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] px-1 sm:px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto relative h-14">
          
          {/* 1. Inicio */}
          <Link
            href="/"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
              isDashboard && !showNotifications
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Dashboard / Inicio"
          >
            <div className="relative">
              <Store className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDashboard && !showNotifications ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isDashboard && !showNotifications && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Inicio</span>
          </Link>

          {/* 2. Sucursales */}
          <Link
            href="/sucursales"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
              isSucursales && !showNotifications
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Red de Sucursales"
          >
            <div className="relative">
              <Building2 className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSucursales && !showNotifications ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isSucursales && !showNotifications && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Sucursales</span>
          </Link>

          {/* 3. Pedidos (Encargos de mostrador) */}
          <Link
            href="/pedidos"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
              isPedidos && !showNotifications
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Pedidos Especiales & Encargos de Mostrador"
          >
            <div className="relative">
              <CalendarClock className={`w-5 h-5 transition-transform group-hover:scale-110 ${isPedidos && !showNotifications ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isPedidos && !showNotifications && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Pedidos</span>
          </Link>

          {/* 4. Notificaciones */}
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group relative ${
              showNotifications
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Notificaciones y Alertas"
          >
            <div className="relative">
              <Bell className={`w-5 h-5 transition-transform group-hover:scale-110 ${showNotifications ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#e41e3f] text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {showNotifications && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Notif.</span>
          </button>

          {/* 5. Menú Completo (Tres rayas) */}
          <button
            type="button"
            onClick={() => {
              if (showNotifications) setShowNotifications(false);
              toggleMobile();
            }}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
              isMobileOpen && !showNotifications
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Abrir menú para desglosar opciones"
          >
            <div className="relative">
              <Menu className={`w-5 h-5 transition-transform group-hover:scale-110 ${isMobileOpen && !showNotifications ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isMobileOpen && !showNotifications && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Menú</span>
          </button>

        </div>
      </nav>
    </>
  );
}
