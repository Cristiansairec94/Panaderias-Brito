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
  ExternalLink,
  Sparkles,
  Inbox
} from "lucide-react";
import { useNotifications, FBNotification } from "@/context/NotificationContext";

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null);

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

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const recentNotifications = filtered.filter((n) => n.group === "recientes");
  const olderNotifications = filtered.filter((n) => n.group === "anteriores");

  const getBadgeIcon = (icon: FBNotification["badgeIcon"]) => {
    switch (icon) {
      case "harina":
        return <div className="p-1 bg-amber-500 text-white rounded-full"><Package className="w-3 h-3" /></div>;
      case "pastel":
        return <div className="p-1 bg-brito-crimson-600 text-white rounded-full"><Cake className="w-3 h-3" /></div>;
      case "dinero":
        return <div className="p-1 bg-emerald-500 text-white rounded-full"><DollarSign className="w-3 h-3" /></div>;
      case "horno":
        return <div className="p-1 bg-brito-orange-600 text-white rounded-full"><Flame className="w-3 h-3" /></div>;
      case "cliente":
        return <div className="p-1 bg-blue-500 text-white rounded-full"><Store className="w-3 h-3" /></div>;
      default:
        return <div className="p-1 bg-stone-600 text-white rounded-full"><AlertTriangle className="w-3 h-3" /></div>;
    }
  };

  return (
    <div className="relative z-[110]" ref={dropdownRef}>
      {/* Bell Button (Facebook Style with dynamic badge) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none ${
          isOpen
            ? "bg-brito-orange-100 text-brito-orange-700 ring-2 ring-brito-orange-500"
            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
        }`}
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#e41e3f] text-white font-black text-[11px] rounded-full flex items-center justify-center shadow-md border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Facebook Style Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[420px] sm:w-[440px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] border-2 border-stone-200 z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[85vh]">
          {/* Header Bar */}
          <div className="p-4 pb-3 border-b border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-stone-900 tracking-tight">Notificaciones</h3>
              
              {/* 3-Dots Settings Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors"
                  title="Opciones de notificaciones"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 p-2 z-[160] text-xs font-semibold space-y-1 animate-in fade-in zoom-in-95">
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
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-brito-orange-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                        Sonidos de alerta
                      </span>
                      <span className="text-[10px] font-bold text-stone-400">{soundEnabled ? "Activado" : "Mudo"}</span>
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
            </div>

            {/* Filter Pills (Facebook Style: [Todas] [No leídas]) */}
            <div className="flex gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3.5 py-1.5 rounded-full transition-all ${
                  activeTab === "all"
                    ? "bg-brito-orange-100 text-brito-orange-800"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-brito-orange-100 text-brito-orange-800"
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
          </div>

          {/* Notifications Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-stone-400 flex flex-col items-center justify-center space-y-2">
                <Inbox className="w-12 h-12 text-stone-300 stroke-[1.5]" />
                <p className="font-bold text-sm text-stone-700">No tienes notificaciones pendientes</p>
                <p className="text-xs text-stone-400">Te avisaremos cuando haya alertas de horno, pedidos o stock.</p>
              </div>
            ) : (
              <>
                {/* Recent Section */}
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
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}

                {/* Older Section */}
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
                        onCloseDropdown={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-stone-50/90 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="text-[11px] font-semibold text-stone-400">Panadería Brito ERP • Alertas en tiempo real</span>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-brito-orange-600 hover:text-brito-orange-700 font-extrabold text-[11px] disabled:opacity-40"
            >
              Marcar leídas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent for individual Facebook-style notification item
function NotificationItem({
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
  const isMenuOpen = activeItemMenu === notif.id;

  return (
    <div
      onClick={() => markAsRead(notif.id)}
      className={`group relative p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3.5 ${
        !notif.read ? "bg-amber-50/50 hover:bg-amber-100/50" : "bg-white hover:bg-stone-100/80"
      }`}
    >
      {/* Avatar Container with Overlaid Badge */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200/80 flex items-center justify-center text-2xl shadow-sm">
          {notif.senderAvatar}
        </div>
        <div className="absolute -bottom-1 -right-1 shadow-sm">
          {getBadgeIcon(notif.badgeIcon)}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs text-stone-900 leading-snug">
          <strong className="font-extrabold text-stone-900">{notif.senderName}</strong>:{" "}
          <span className="font-semibold text-brito-orange-700">{notif.highlightText}</span>{" "}
          — {notif.description}
        </p>

        {/* Time Stamp */}
        <p className="text-[11px] font-bold text-stone-400 mt-1 flex items-center gap-1.5">
          <span>{notif.timeAgo}</span>
          <span>•</span>
          <span className="capitalize">{notif.category}</span>
        </p>

        {/* Direct Action Link (Facebook Style Button) */}
        {notif.actionLink && notif.actionLabel && (
          <div className="mt-2">
            <Link
              href={notif.actionLink}
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notif.id);
                onCloseDropdown();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-brito-orange-600 hover:text-white text-stone-800 font-bold text-[11px] rounded-xl border border-stone-200 shadow-sm transition-all active:scale-95"
            >
              <span>{notif.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Unread Solid Blue Dot Indicator */}
      {!notif.read && (
        <span className="absolute right-3.5 top-5 w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm shrink-0" />
      )}

      {/* 3-Dots Individual Context Menu */}
      <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveItemMenu(isMenuOpen ? null : notif.id);
          }}
          className="w-7 h-7 rounded-full bg-white hover:bg-stone-200 text-stone-600 flex items-center justify-center shadow-sm border border-stone-200"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 text-xs font-semibold space-y-0.5 animate-in fade-in zoom-in-95">
            {notif.read ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsUnread(notif.id);
                  setActiveItemMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700"
              >
                <Check className="w-3.5 h-3.5" /> Marcar como no leída
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAsRead(notif.id);
                  setActiveItemMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Marcar como leída
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notif.id);
                setActiveItemMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-2 text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar notificación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
