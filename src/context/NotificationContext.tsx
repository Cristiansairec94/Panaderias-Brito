"use client";

import React, { createContext, useContext, useState } from "react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "warning" | "success" | "info" | "urgent";
  read: boolean;
  category: "inventario" | "pedidos" | "ventas" | "produccion";
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    title: "⚠️ Stock Crítico de Harina",
    message: "Quedan 8 bultos de Harina Extra Fina (mínimo requerido: 10 bultos).",
    time: "Hace 10 min",
    type: "urgent",
    read: false,
    category: "inventario",
  },
  {
    id: "notif-2",
    title: "🎂 Entrega de Pastel Pendiente",
    message: "Pastel 3 Leches (Sra. María González) debe entregarse a las 4:00 PM.",
    time: "Hace 35 min",
    type: "warning",
    read: false,
    category: "pedidos",
  },
  {
    id: "notif-3",
    title: "💰 Meta de Venta Alcanzada",
    message: "La caja de mostrador superó los $4,000 MXN en el turno matutino.",
    time: "Hace 1 hora",
    type: "success",
    read: false,
    category: "ventas",
  },
  {
    id: "notif-4",
    title: "🥖 Horno 1 Disponible",
    message: "Charolas de Conchas y Cuernos listas para exhibidor de mostrador.",
    time: "Hace 2 horas",
    type: "info",
    read: true,
    category: "produccion",
  },
];

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification }}
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
