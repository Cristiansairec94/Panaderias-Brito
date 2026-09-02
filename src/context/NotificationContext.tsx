"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface FBNotification {
  id: string;
  senderName: string;
  senderAvatar: string;
  badgeIcon: "harina" | "pastel" | "dinero" | "horno" | "cliente" | "alerta";
  title: string;
  highlightText: string;
  description: string;
  timeAgo: string;
  group: "recientes" | "anteriores";
  read: boolean;
  actionLabel?: string;
  actionLink?: string;
  category: "inventario" | "pedidos" | "caja" | "produccion" | "clientes";
}

const INITIAL_FB_NOTIFICATIONS: FBNotification[] = [
  {
    id: "fb-1",
    senderName: "Sistema de Almacén",
    senderAvatar: "📦",
    badgeIcon: "harina",
    title: "Alerta de Stock Crítico",
    highlightText: "Harina de Trigo Extra Fina",
    description: "Quedan solo 8 bultos en bodega. Se alcanzó el nivel mínimo de reorden.",
    timeAgo: "Hace 6 min",
    group: "recientes",
    read: false,
    actionLabel: "Comprar Insumos",
    actionLink: "/inventario",
    category: "inventario",
  },
  {
    id: "fb-2",
    senderName: "Pastelería & Encargos",
    senderAvatar: "🎂",
    badgeIcon: "pastel",
    title: "Entrega Próxima (4:00 PM)",
    highlightText: "Sra. María González",
    description: "Pastel 3 Leches XV Años (flores lilas) listo para entrega y cobro de restante $450.",
    timeAgo: "Hace 28 min",
    group: "recientes",
    read: false,
    actionLabel: "Ver Pedido",
    actionLink: "/pedidos",
    category: "pedidos",
  },
  {
    id: "fb-3",
    senderName: "Caja Mostrador (Lupita)",
    senderAvatar: "👩‍💼",
    badgeIcon: "dinero",
    title: "Meta de Turno Superada",
    highlightText: "$4,150.00 MXN en Efectivo",
    description: "El turno matutino superó la meta diaria estimada de ventas en mostrador.",
    timeAgo: "Hace 1 hora",
    group: "recientes",
    read: false,
    actionLabel: "Ver Flujo de Caja",
    actionLink: "/caja",
    category: "caja",
  },
  {
    id: "fb-4",
    senderName: "Maestro Panadero Juan",
    senderAvatar: "👨‍🍳",
    badgeIcon: "horno",
    title: "Horno 2 Terminado",
    highlightText: "Charolas de Conchas y Cuernos",
    description: "Lote de 80 conchas y 40 cuernos calientes listos para pasar al exhibidor.",
    timeAgo: "Hace 2 horas",
    group: "anteriores",
    read: true,
    actionLabel: "Ver Mostrador",
    actionLink: "/pos",
    category: "produccion",
  },
  {
    id: "fb-5",
    senderName: "Abarrotes 'La Guadalupana'",
    senderAvatar: "🏪",
    badgeIcon: "cliente",
    title: "Abono a Cuenta Mayorista",
    highlightText: "Don Pepe abonó $850.00",
    description: "Se liquidó la nota de 150 bolillos y 80 teleras de la semana pasada.",
    timeAgo: "Ayer a las 6:30 PM",
    group: "anteriores",
    read: true,
    actionLabel: "Ver Cliente",
    actionLink: "/clientes",
    category: "clientes",
  },
];

interface NotificationContextType {
  notifications: FBNotification[];
  unreadCount: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<FBNotification[]>(INITIAL_FB_NOTIFICATIONS);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log(e);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAsUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const markAllAsRead = () => {
    playChime();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        toggleSound,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
