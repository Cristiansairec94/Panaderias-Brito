"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Store, 
  Building2, 
  Bell, 
  Croissant, 
  Receipt, 
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

  const {
    notifications,
    unreadCount,
    soundEnabled,
    nativePermission,
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
  const isProductos = pathname.startsWith("/productos");
  const isFinanzas = pathname.startsWith("/caja") || pathname.startsWith("/finanzas");

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
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
          {/* Backdrop con desenfoque */}
          <div 
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setShowNotifications(false);
              setShowOptionsMenu(false);
              setActiveItemMenu(null);
            }}
          />

          {/* Sheet deslizable hacia arriba */}
          <div className="relative z-50 bg-white rounded-t-[28px] shadow-2xl border-t border-stone-200 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Handle táctil */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Cabecera */}
            <div className="p-4 pb-3 border-b border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-stone-900 tracking-tight leading-tight">
                      Avisos & Notificaciones
                    </h3>
                    <p className="text-[10px] text-stone-500 font-semibold">
                      Alertas operativas en tiempo real
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Menú de opciones rápidas */}
                  <div className="relative">
                    <button
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors"
                      title="Opciones de notificaciones"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showOptionsMenu && (
                      <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-[60] text-xs font-semibold space-y-1 animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => {
                            markAllAsRead();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center gap-2 text-stone-700"
                        >
                          <CheckCheck className="w-4 h-4 text-emerald-600" /> Marcar todas como leídas
                        </button>
                        <button
                          onClick={() => {
                            toggleSound();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 flex items-center justify-between text-stone-700"
                        >
                          <span className="flex items-center gap-2">
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                            Sonidos de alerta
                          </span>
                          <span className="text-[10px] font-bold text-stone-400">{soundEnabled ? "Activo" : "Mudo"}</span>
                        </button>
                        <button
                          onClick={() => {
                            clearAll();
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" /> Limpiar todas
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cerrar modal */}
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setShowOptionsMenu(false);
                      setActiveItemMenu(null);
                    }}
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filtro: Todas / No leídas */}
              <div className="flex gap-2 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    activeTab === "all"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    activeTab === "unread"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  No leídas
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#e41e3f] text-white text-[10px] font-black flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Banner de permisos nativos si aplica */}
              {nativePermission !== "granted" && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-orange-500/25 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">🔔</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-stone-900 leading-tight">
                        Activar avisos en celular
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">
                        Alertas con sonido de ventas y pedidos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestNativePermission}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black text-[10px] rounded-xl shrink-0 shadow-sm"
                  >
                    Activar
                  </button>
                </div>
              )}
            </div>

            {/* Lista con scroll */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-stone-400 flex flex-col items-center justify-center space-y-2">
                  <Inbox className="w-10 h-10 text-stone-300 stroke-[1.5]" />
                  <p className="font-bold text-sm text-stone-700">No hay notificaciones</p>
                  <p className="text-xs text-stone-400">Te avisaremos con alertas de horno, pedidos o caja.</p>
                </div>
              ) : (
                <>
                  {recentNotifications.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 pt-2 pb-1 text-xs font-extrabold text-stone-900 flex items-center justify-between">
                        <span>Recientes</span>
                        <span className="text-[10px] text-stone-400 font-semibold">{recentNotifications.length} nuevas</span>
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
                    <div className="space-y-1 pt-2">
                      <div className="px-3 pt-2 pb-1 text-xs font-extrabold text-stone-500">
                        <span>Anteriores</span>
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
            <div className="p-3 bg-stone-50/90 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 shrink-0">
              <span className="text-[11px] font-semibold text-stone-400">Panadería Brito • Avisos en vivo</span>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-orange-600 hover:text-orange-700 font-extrabold text-[11px] disabled:opacity-40"
              >
                Marcar leídas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior Móvil (Dock) */}
      <nav 
        aria-label="Navegación inferior móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] px-1 sm:px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto relative h-14">
          
          {/* 1. Inicio */}
          <Link
            href="/"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
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

          {/* 2. Sucursales */}
          <Link
            href="/sucursales"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
              isSucursales
                ? "text-orange-600 font-black"
                : "text-stone-400 hover:text-stone-600 font-semibold"
            }`}
            title="Red de Sucursales"
          >
            <div className="relative">
              <Building2 className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSucursales ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {isSucursales && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">Sucursales</span>
          </Link>

          {/* 3. Notificaciones */}
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

          {/* 4. Precios & Catálogo */}
          <Link
            href="/productos"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
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

          {/* 5. Finanzas / Caja */}
          <Link
            href="/caja"
            onClick={handleLinkClick}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
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

          {/* 6. Menú Completo */}
          <button
            type="button"
            onClick={toggleMobile}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all active:scale-95 group ${
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
    </>
  );
}
