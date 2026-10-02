"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Bell, 
  CheckCheck, 
  MoreHorizontal, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Check, 
  Flame, 
  Package, 
  Cake, 
  DollarSign, 
  Store, 
  AlertTriangle,
  ArrowRight,
  Inbox,
  X,
  Clock,
  Wallet,
  Receipt,
  ShieldCheck
} from "lucide-react";
import { useNotifications, FBNotification, findShiftCutForNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

// Graphic illustration for Flour Sack matching user mockup
function FlourSackGraphic({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Sack Body */}
      <path
        d="M20 23 C15 28, 12 43, 14 53 C15 57, 19 59, 32 59 C45 59, 49 57, 50 53 C52 43, 49 28, 44 23 Z"
        fill="#c49a6c"
      />
      {/* Sack Shadow/Texture */}
      <path
        d="M17 32 C15 42, 18 53, 23 57 C30 59, 43 58, 47 54 C44 48, 42 38, 41 29 C37 25, 27 25, 22 28 Z"
        fill="#b38858"
        opacity="0.4"
      />
      {/* Tied Top Ruffles */}
      <path
        d="M23 18 C23 18, 21 12, 26 10 C29 13, 31 16, 32 16 C33 16, 35 13, 38 10 C43 12, 41 18, 41 18 Z"
        fill="#b38858"
      />
      {/* Rope / Cord */}
      <rect x="23" y="18" width="18" height="3" rx="1.5" fill="#7d532a" />
      {/* Wheat Stalk Printed on Sack */}
      <path
        d="M32 29 V47 M32 33 L28 31 M32 33 L36 31 M32 38 L27 36 M32 38 L37 36 M32 43 L28 41 M32 43 L36 41"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

// Graphic illustration for Birthday Cake matching user mockup
function CakeGraphic({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Cake Plate */}
      <ellipse cx="32" cy="55" rx="25" ry="4.5" fill="#e0e7ff" />
      {/* Bottom Tier */}
      <path
        d="M14 41 C14 38, 50 38, 50 41 L50 51 C50 54, 14 54, 14 51 Z"
        fill="#fed7aa"
      />
      <ellipse cx="32" cy="41" rx="18" ry="4" fill="#fde68a" />
      <path
        d="M14 43 C18 47, 24 45, 28 47 C32 45, 36 47, 40 45 C44 47, 48 45, 50 43 L50 41 C50 41, 14 41, 14 41 Z"
        fill="#f472b6"
      />
      {/* Top Tier */}
      <path
        d="M20 28 C20 26, 44 26, 44 28 L44 37 C44 39, 20 39, 20 37 Z"
        fill="#fbcfe8"
      />
      <ellipse cx="32" cy="28" rx="12" ry="3" fill="#ffffff" />
      {/* Frosting Drips */}
      <path
        d="M20 30 C22 33, 26 31, 29 33 C32 31, 35 33, 38 31 C41 33, 44 31, 44 30 L44 28 L20 28 Z"
        fill="#ec4899"
        opacity="0.8"
      />
      {/* 3 Candles */}
      <rect x="25" y="19" width="2" height="9" rx="1" fill="#93c5fd" />
      <circle cx="26" cy="16" r="2" fill="#f97316" />
      <rect x="31" y="17" width="2" height="11" rx="1" fill="#c084fc" />
      <circle cx="32" cy="14" r="2" fill="#f97316" />
      <rect x="37" y="19" width="2" height="9" rx="1" fill="#93c5fd" />
      <circle cx="38" cy="16" r="2" fill="#f97316" />
    </svg>
  );
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "cortes" | "pedidos" | "unread">("all");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null);

  const { user } = useAuth();
  const isAdmin = !user || user.role === "admin" || user.role === "auxiliar_admin";

  const {
    notifications,
    unreadCount,
    soundEnabled,
    toggleSound,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowOptionsMenu(false);
        setActiveItemMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === "cortes") {
      setActiveTab("all");
    }
  }, [isAdmin, activeTab]);

  const cortesCount = notifications.filter((n) => n.category === "caja").length;
  const pedidosCount = notifications.filter((n) => n.category === "pedidos").length;

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "cortes") return n.category === "caja";
    if (activeTab === "pedidos") return n.category === "pedidos";
    return true;
  });

  const recentNotifications = filtered.filter((n) => n.group === "recientes");
  const olderNotifications = filtered.filter((n) => n.group === "anteriores");

  return (
    <div className="relative z-[110] shrink-0" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none shrink-0 ${
          isOpen
            ? "bg-brito-orange-100 text-brito-orange-700 ring-2 ring-brito-orange-500"
            : "bg-[#2c170d] hover:bg-[#3d2012] text-amber-200 border border-amber-900/60 shadow-xs"
        }`}
        title="Notificaciones"
        aria-label="Abrir notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#e41e3f] text-white font-black text-[11px] rounded-full flex items-center justify-center shadow-md border-2 border-[#1c0e08] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[140] sm:hidden"
          onClick={() => {
            setIsOpen(false);
            setShowOptionsMenu(false);
            setActiveItemMenu(null);
          }}
        />
      )}

      {/* Notification Sheet / Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 max-h-[90vh] sm:fixed-none sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[85vh] bg-[#faf6f0] border border-[#e8ded2] rounded-[28px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.18)] z-[150] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 sm:zoom-in-100 duration-200">
          
          {/* Header & Controls Area */}
          <div className="p-4 sm:p-5 pb-2 flex flex-col shrink-0">
            {/* Grab handle indicator */}
            <div className="w-12 h-1 bg-stone-300/80 rounded-full mx-auto mb-2.5 shrink-0" />

            {/* Title & Actions Row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-[22px] font-bold text-stone-900 tracking-tight">
                  Avisos & Notificaciones
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isAdmin ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      🛡️ Control Total (Todas las sucursales y cortes)
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      📍 Sucursal {user?.assignedBranchName || "Asignada"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* 3-Dots Settings Menu (Preserving Sound & Options functionality) */}
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
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-[160] text-xs font-semibold space-y-1 animate-in fade-in zoom-in-95">
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
                        <span className="text-[10px] font-bold text-stone-400">{soundEnabled ? "Activado" : "Mudo"}</span>
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

                {/* Close Button X */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-stone-200/70 text-stone-600 flex items-center justify-center transition-colors"
                  title="Cerrar avisos"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Buttons & Mark All Read Link */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {/* Todas Pill */}
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#ebe4dc] text-stone-900 font-bold shadow-2xs border border-transparent"
                    : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                }`}
              >
                Todas ({notifications.length})
              </button>

              {/* Cierres de Turno Pill - Exclusivo Administrador */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("cortes")}
                  className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === "cortes"
                      ? "bg-amber-100 text-amber-950 font-bold shadow-2xs border border-amber-300"
                      : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                  }`}
                >
                  🏁 Cierres ({cortesCount})
                </button>
              )}

              {/* Pedidos Pill */}
              <button
                type="button"
                onClick={() => setActiveTab("pedidos")}
                className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === "pedidos"
                    ? "bg-purple-100 text-purple-950 font-bold shadow-2xs border border-purple-300"
                    : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                }`}
              >
                🎂 Pedidos ({pedidosCount})
              </button>

              {/* No leídas Pill */}
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`px-2.5 py-1 rounded-full text-xs sm:text-[13px] transition-all cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-[#ebe4dc] text-stone-900 font-bold shadow-2xs border border-transparent"
                    : "bg-transparent text-stone-700 font-medium border border-[#ded5cb] hover:bg-[#ede5dc]/60"
                }`}
              >
                No leídas ({unreadCount})
              </button>

              {/* Marcar todo como leído Text Link */}
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-[#c25425] hover:text-[#9e3f18] underline underline-offset-2 font-medium text-xs sm:text-[13px] ml-auto cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed transition-colors"
              >
                Marcar leídas
              </button>
            </div>
          </div>

          {/* Scrollable Notifications Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-3 space-y-3.5">
            {filtered.length === 0 ? (
              <div className="p-8 my-4 text-center text-stone-400 flex flex-col items-center justify-center space-y-2 bg-white/70 rounded-2xl border border-[#ede5dc]">
                <Inbox className="w-10 h-10 text-stone-300 stroke-[1.5]" />
                <p className="font-bold text-sm text-stone-800">No hay notificaciones</p>
                <p className="text-xs text-stone-500 max-w-xs text-center">
                  Te avisaremos al instante sobre cierres de turno (si cuadró o no la caja) y nuevos pedidos realizados.
                </p>
              </div>
            ) : (
              <>
                {/* Recent Notifications Section */}
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
                      <NotificationCardItem
                        key={notif.id}
                        notif={notif}
                        getBadgeIcon={getBadgeIcon}
                        markAsRead={markAsRead}
                        markAsUnread={markAsUnread}
                        deleteNotification={deleteNotification}
                        activeItemMenu={activeItemMenu}
                        setActiveItemMenu={setActiveItemMenu}
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}

                {/* Older Notifications Section */}
                {olderNotifications.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-0.5">
                      <h4 className="text-sm sm:text-base font-bold text-stone-500">
                        Anteriores
                      </h4>
                    </div>

                    {olderNotifications.map((notif) => (
                      <NotificationCardItem
                        key={notif.id}
                        notif={notif}
                        getBadgeIcon={getBadgeIcon}
                        markAsRead={markAsRead}
                        markAsUnread={markAsUnread}
                        deleteNotification={deleteNotification}
                        activeItemMenu={activeItemMenu}
                        setActiveItemMenu={setActiveItemMenu}
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Bar */}
          <div className="py-2.5 text-center text-xs text-stone-400 font-normal shrink-0 border-t border-[#ede5dc]/70 bg-[#faf6f0]">
            Panadería Brito • Avisos en vivo
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent for individual card item styled exactly like user mockup
function NotificationCardItem({
  notif,
  getBadgeIcon,
  markAsRead,
  markAsUnread,
  deleteNotification,
  activeItemMenu,
  setActiveItemMenu,
  onCloseDropdown,
}: {
  notif: FBNotification;
  getBadgeIcon: (icon: FBNotification["badgeIcon"]) => React.ReactNode;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  deleteNotification: (id: string) => void;
  activeItemMenu: string | null;
  setActiveItemMenu: (id: string | null) => void;
  onCloseDropdown: () => void;
}) {
  const { openOrderDetail, openOrderPayment, openShiftCutDetail } = useNotifications();
  const isMenuOpen = activeItemMenu === notif.id;

  const isShiftCut =
    notif.category === "caja" ||
    notif.title.toLowerCase().includes("cierre") ||
    notif.title.toLowerCase().includes("corte");
  const isOrder =
    notif.category === "pedidos" ||
    notif.title.toLowerCase().includes("pedido");

  const cutData = isShiftCut ? findShiftCutForNotification(notif) : null;

  const fullText = `${notif.title} ${notif.highlightText} ${notif.description}`.toLowerCase();
  const isSquare =
    cutData?.difference === 0 ||
    fullText.includes("cuadrada exacta") ||
    fullText.includes("cuadró exacta") ||
    fullText.includes("cuadro exacta") ||
    fullText.includes("cuadre exacto") ||
    fullText.includes("cuadre perfecto") ||
    fullText.includes("($0.00)") ||
    notif.title.includes("✓");
  const isShort =
    (cutData && cutData.difference < 0) ||
    fullText.includes("faltante") ||
    fullText.includes("no cuadró") ||
    fullText.includes("no cuadro") ||
    notif.title.includes("🚨");
  const isOver = !isShort && ((cutData && cutData.difference > 0) || fullText.includes("sobrante"));

  return (
    <div
      onClick={() => {
        markAsRead(notif.id);
        if (isOrder) {
          onCloseDropdown();
          openOrderDetail(notif);
        } else if (isShiftCut) {
          onCloseDropdown();
          openShiftCutDetail(notif);
        }
      }}
      className={`bg-white rounded-2xl border border-[#eee6dd] p-4 shadow-xs space-y-2.5 relative group transition-all ${
        isOrder || isShiftCut ? "cursor-pointer hover:border-amber-400 hover:shadow-md" : ""
      }`}
    >
      {/* Top Header Tag: Status Pill + Time */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-stone-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isShiftCut && (
            <>
              {isSquare ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ CAJA CUADRADA EXACTA
                </span>
              ) : isShort ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                  🚨 NO CUADRÓ LA CAJA (FALTANTE)
                </span>
              ) : isOver ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  ⚠️ NO CUADRÓ LA CAJA (SOBRANTE)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  🏁 CIERRE DE TURNO
                </span>
              )}
            </>
          )}

          {isOrder && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
              🎂 PEDIDO DE CLIENTE
            </span>
          )}
        </div>

        <span className="text-[11px] font-semibold text-stone-400 shrink-0 ml-auto">
          {notif.timeAgo}
        </span>
      </div>

      {/* Top row: Avatar & Description */}
      <div className="flex items-start gap-3.5">
        {/* Avatar Container with Graphic & Overlapping Badge */}
        <div className="relative shrink-0">
          <div className="w-13 h-13 rounded-2xl bg-[#faf6f0] border border-[#ede5dc] flex items-center justify-center p-1 shadow-2xs">
            {notif.badgeIcon === "harina" ? (
              <FlourSackGraphic className="w-10 h-10" />
            ) : notif.badgeIcon === "pastel" ? (
              <CakeGraphic className="w-10 h-10" />
            ) : (
              <span className="text-2xl select-none">{notif.senderAvatar}</span>
            )}
          </div>

          {/* Overlapping Badge Icon in Terracotta Circle */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#b85422] border-2 border-white flex items-center justify-center text-white shadow-xs">
            {getBadgeIcon(notif.badgeIcon)}
          </div>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <h5 className="text-xs font-bold text-stone-900 mb-0.5 leading-snug">
            {notif.title}
          </h5>
          <p className="text-xs sm:text-[13px] text-stone-700 leading-snug">
            <strong className="font-semibold text-stone-800">{notif.highlightText}: </strong>
            <span className="text-stone-600">{notif.description}</span>
          </p>
        </div>

        {/* Card Options Menu & Unread Indicator */}
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-[#c25425] shrink-0" title="No leída" />
          )}

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveItemMenu(isMenuOpen ? null : notif.id);
              }}
              className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Opciones de notificación"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 text-xs font-semibold space-y-0.5 animate-in fade-in zoom-in-95">
                {notif.read ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsUnread(notif.id);
                      setActiveItemMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar como no leída
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notif.id);
                      setActiveItemMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Marcar como leída
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                    setActiveItemMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shift Cut Detailed Card: Horario, Con cuánto dinero se quedó en caja, Dictamen de cuadre / Faltante / Sobrante */}
      {isShiftCut && cutData && (
        <div className="bg-[#fcfaf7] border border-[#ebe1d5] rounded-2xl p-3 sm:p-3.5 space-y-2.5 text-xs shadow-2xs">
          {/* 1. HORARIO DEL TURNO & RELEVO */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0">
                ⏰
              </span>
              <span>
                Horario de Turno:{" "}
                <span className="text-amber-950 font-black">{cutData.shiftRange}</span>
              </span>
            </div>
            <div className="text-[11px] font-semibold text-stone-500 truncate" title={`${cutData.outgoingCashier} ➔ ${cutData.incomingCashier}`}>
              {cutData.outgoingCashier} ➔ {cutData.incomingCashier}
            </div>
          </div>

          {/* 2. CON CUÁNTO DINERO SE QUEDÓ EN LA CAJA */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold shrink-0">
                <Wallet className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block leading-tight">
                  Dinero que se quedó en caja
                </span>
                <span className="text-xs font-bold text-stone-700">
                  Fondo para el siguiente turno
                </span>
              </div>
            </div>
            <span className="text-sm sm:text-base font-black text-amber-950 tabular-nums">
              {formatCurrency(cutData.nextFund ?? 0)}
            </span>
          </div>

          {/* 3. DICTAMEN DE CUADRE: EXACTO, FALTANTE O SOBRANTE */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
              cutData.difference === 0
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : cutData.difference < 0
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-amber-50 border-amber-300 text-amber-950"
            }`}
          >
            <div className="flex items-center justify-between font-black gap-2">
              <span className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                {cutData.difference === 0 ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                    <span className="text-emerald-800">✓ CAJA CUADRADA EXACTA</span>
                  </>
                ) : cutData.difference < 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5] shrink-0" />
                    <span className="text-rose-700">🚨 NO CUADRÓ • FALTÓ DINERO EN CAJA</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5] shrink-0" />
                    <span className="text-amber-800">⚠️ NO CUADRÓ • SOBRÓ DINERO EN CAJA</span>
                  </>
                )}
              </span>

              <span
                className={`text-xs sm:text-sm font-black tabular-nums px-2 py-0.5 rounded-lg shrink-0 ${
                  cutData.difference === 0
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : cutData.difference < 0
                    ? "bg-rose-100 text-rose-900 border border-rose-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {cutData.difference === 0
                  ? "$0.00 MXN"
                  : cutData.difference < 0
                  ? `Faltante: ${formatCurrency(cutData.difference)}`
                  : `Sobrante: +${formatCurrency(cutData.difference)}`}
              </span>
            </div>

            {/* Comparativa: Esperado vs Físico Contado */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/15 opacity-90 font-medium">
              <span>
                Efectivo esperado: <strong className="font-bold">{formatCurrency(cutData.expectedCash)}</strong>
              </span>
              <span>
                Físico contado: <strong className="font-bold">{formatCurrency(cutData.countedCash)}</strong>
              </span>
            </div>
          </div>

          {/* 4. EFECTIVO RETIRADO / ENTREGADO */}
          {cutData.countedCash > (cutData.nextFund ?? 0) && (
            <div className="flex items-center justify-between text-[11px] text-stone-600 px-1 pt-0.5">
              <span>Efectivo entregado a Don Toño / Saliente:</span>
              <strong className="text-stone-900 font-bold tabular-nums">
                {formatCurrency(Math.max(0, cutData.countedCash - (cutData.nextFund ?? 0)))}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isShiftCut ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            markAsRead(notif.id);
            onCloseDropdown();
            openShiftCutDetail(notif);
          }}
          className="w-full bg-[#c25425] hover:bg-[#a8441b] text-white font-black text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
        >
          <span>Ver Corte de Caja</span>
          <span className="text-sm font-bold leading-none">➔</span>
        </button>
      ) : notif.secondaryActionLabel ? (
        /* Dual action buttons matching Card 2 in user mockup */
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          {isOrder ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                  const label = (notif.actionLabel || "").toLowerCase();
                  if (label.includes("cobrar") || label.includes("pagar")) {
                    openOrderPayment(notif);
                  } else {
                    openOrderDetail(notif);
                  }
                }}
                className="bg-[#c25425] hover:bg-[#a8441b] text-white font-medium text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-colors truncate cursor-pointer active:scale-95"
              >
                {notif.actionLabel || "Ver Detalle"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                  openOrderDetail(notif);
                }}
                className="bg-[#fdfbf9] border border-[#c25425] text-[#c25425] hover:bg-[#faeee6] font-medium text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-colors truncate cursor-pointer active:scale-95"
              >
                {notif.secondaryActionLabel === "Ver Pedidos" || notif.secondaryActionLabel === "Ver Pedido"
                  ? "Ver Detalle"
                  : notif.secondaryActionLabel}
              </button>
            </>
          ) : (
            <>
              <Link
                href={notif.actionLink || "#"}
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                }}
                className="bg-[#c25425] hover:bg-[#a8441b] text-white font-medium text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-colors truncate"
              >
                {notif.actionLabel}
              </Link>
              <Link
                href={notif.secondaryActionLink || "#"}
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  onCloseDropdown();
                }}
                className="bg-[#fdfbf9] border border-[#c25425] text-[#c25425] hover:bg-[#faeee6] font-medium text-xs sm:text-[13px] py-2.5 px-3 rounded-xl text-center shadow-xs transition-colors truncate"
              >
                {notif.secondaryActionLabel}
              </Link>
            </>
          )}
        </div>
      ) : notif.actionLabel ? (
        /* Single full-width action button matching Card 1 in user mockup */
        isOrder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notif.id);
              onCloseDropdown();
              const label = (notif.actionLabel || "").toLowerCase();
              if (label.includes("cobrar") || label.includes("pagar")) {
                openOrderPayment(notif);
              } else {
                openOrderDetail(notif);
              }
            }}
            className="w-full bg-[#c25425] hover:bg-[#a8441b] text-white font-medium text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
          >
            <span>
              {notif.actionLabel === "Ver Pedidos" || notif.actionLabel === "Ver Pedido"
                ? "Ver Detalle del Pedido"
                : notif.actionLabel}
            </span>
            <span className="text-sm font-bold leading-none">➔</span>
          </button>
        ) : (
          <Link
            href={notif.actionLink || "#"}
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notif.id);
              onCloseDropdown();
            }}
            className="w-full bg-[#c25425] hover:bg-[#a8441b] text-white font-medium text-xs sm:text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span>{notif.actionLabel}</span>
            <span className="text-sm font-bold leading-none">➔</span>
          </Link>
        )
      ) : null}
    </div>
  );
}

export function getBadgeIcon(icon: FBNotification["badgeIcon"]) {
  switch (icon) {
    case "harina":
      return <Package className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "pastel":
      return <Cake className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "dinero":
      return <DollarSign className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "horno":
      return <Flame className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    case "cliente":
      return <Store className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
    default:
      return <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[2.4]" />;
  }
}

export { NotificationCardItem as NotificationItem };
