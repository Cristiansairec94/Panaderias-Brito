"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  Package, 
  Cake, 
  DollarSign, 
  Flame, 
  X
} from "lucide-react";
import { useNotifications, Notification } from "@/context/NotificationContext";

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "inventario" | "pedidos" | "ventas">("all");
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.category === filter;
  });

  const getIcon = (category: Notification["category"], type: Notification["type"]) => {
    switch (category) {
      case "inventario":
        return <Package className="w-4 h-4 text-amber-600" />;
      case "pedidos":
        return <Cake className="w-4 h-4 text-rose-600" />;
      case "ventas":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "produccion":
        return <Flame className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all active:scale-95 focus:outline-none"
        title="Notificaciones y Alertas ERP"
      >
        <Bell className="w-5 h-5 text-stone-700" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brito-crimson-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadCount}
            </span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brito-crimson-400 rounded-full animate-ping opacity-75" />
          </>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brito-orange-400" />
              <h3 className="font-bold text-sm">Centro de Notificaciones</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-brito-orange-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Leer todas
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex bg-stone-100 p-1.5 gap-1 border-b border-stone-200 text-[11px] font-bold">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("inventario")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filter === "inventario" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Insumos
            </button>
            <button
              onClick={() => setFilter("pedidos")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filter === "pedidos" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setFilter("ventas")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filter === "ventas" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Ventas
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No hay notificaciones en esta categoría.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-stone-50 cursor-pointer transition-colors relative ${
                    !item.read ? "bg-amber-50/50" : "bg-white"
                  }`}
                >
                  <div className="p-2 bg-stone-100 rounded-xl shrink-0 mt-0.5">
                    {getIcon(item.category, item.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-stone-900 truncate">{item.title}</p>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-brito-crimson-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-snug line-clamp-2">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-stone-400 mt-1 inline-block font-medium">
                      {item.time}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center">
            <span className="text-[10px] font-semibold text-stone-500">
              Sistema de Alertas Automáticas • Panadería Brito ERP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
