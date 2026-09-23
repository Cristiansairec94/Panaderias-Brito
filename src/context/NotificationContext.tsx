"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { realtimeHub, RealtimeStatus } from "@/lib/realtime/realtimeHub";

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
  nativePermission: NotificationPermission;
  realtimeStatus: RealtimeStatus;
  requestNativePermission: () => Promise<NotificationPermission>;
  toggleSound: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notif: Omit<FBNotification, "id" | "read" | "timeAgo" | "group"> & Partial<FBNotification>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_NOTIFS_KEY = "brito_notifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<FBNotification[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_NOTIFS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return INITIAL_FB_NOTIFICATIONS;
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nativePermission, setNativePermission] = useState<NotificationPermission>("default");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(() =>
    realtimeHub.getStatus ? realtimeHub.getStatus() : "disconnected"
  );
  const [activeToast, setActiveToast] = useState<FBNotification | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNativePermission(Notification.permission);
    }
  }, []);

  const triggerNativeNotification = (notif: FBNotification) => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg
            .showNotification(`🥖 ${notif.title}`, {
              body: `${notif.highlightText}\n${notif.description}`,
              icon: "/logo.png",
              badge: "/logo.png",
              tag: notif.id,
              data: { link: notif.actionLink || "/" },
            })
            .catch(() => {
              new Notification(`🥖 ${notif.title}`, {
                body: `${notif.highlightText}\n${notif.description}`,
                icon: "/logo.png",
                badge: "/logo.png",
                tag: notif.id,
              });
            });
        });
      } else {
        new Notification(`🥖 ${notif.title}`, {
          body: `${notif.highlightText}\n${notif.description}`,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: notif.id,
        });
      }
    } catch (e) {
      console.warn("Error triggering native notification:", e);
    }
  };

  const requestNativePermission = async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      const perm = await Notification.requestPermission();
      setNativePermission(perm);
      if (perm === "granted") {
        try {
          triggerNativeNotification({
            id: `welcome-${Date.now()}`,
            senderName: "🥖 Panadería Brito",
            senderAvatar: "🥖",
            badgeIcon: "harina",
            title: "Notificaciones Activadas",
            highlightText: "¡Alertas en tiempo real activas!",
            description: "Recibirás avisos de ventas, cobros y encargos al instante en tu celular.",
            timeAgo: "Ahora",
            group: "recientes",
            read: false,
            category: "caja",
          });
        } catch (e) {}
      }
      return perm;
    } catch (e) {
      return "denied";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const persistNotifs = (list: FBNotification[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(list));
      } catch (e) {}
    }
  };

  const playChime = () => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log(e);
    }
  };

  // Conectar con el Hub de Tiempo Real de Supabase para recibir alertas remotas
  useEffect(() => {
    if (typeof window === "undefined" || !realtimeHub.onNotification) return;

    const unsubNotification = realtimeHub.onNotification((remoteNotif) => {
      setNotifications((prev) => {
        // Evitar duplicados si ya existe
        if (prev.some((n) => n.id === remoteNotif.id)) return prev;
        const updated = [remoteNotif, ...prev];
        persistNotifs(updated);
        return updated;
      });

      // Efectos inmediatos en el celular
      playChime();
      setActiveToast(remoteNotif);
      triggerNativeNotification(remoteNotif);
    });

    const unsubStatus = realtimeHub.onStatusChange((status) => {
      setRealtimeStatus(status);
    });

    return () => {
      unsubNotification();
      unsubStatus();
    };
  }, []);

  const addNotification = (notif: Omit<FBNotification, "id" | "read" | "timeAgo" | "group"> & Partial<FBNotification>) => {
    const newId = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullNotif: FBNotification = {
      id: newId,
      timeAgo: "Hace un momento",
      group: "recientes",
      read: false,
      ...notif,
    };

    setNotifications((prev) => {
      if (prev.some((n) => n.id === newId)) return prev;
      const updated = [fullNotif, ...prev];
      persistNotifs(updated);
      return updated;
    });

    // Reproducir sonido y mostrar banner flotante visible
    playChime();
    setActiveToast(fullNotif);
    triggerNativeNotification(fullNotif);

    // Transmitir en vivo por WebSocket a los demás celulares/computadoras del negocio
    if (realtimeHub.broadcastNotification) {
      realtimeHub.broadcastNotification(fullNotif);
    }
  };

  // Auto-desvanecer toast a los 5.5 segundos
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotifs(updated);
      return updated;
    });
  };

  const markAsUnread = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: false } : n));
      persistNotifs(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    playChime();
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistNotifs(updated);
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      persistNotifs(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    persistNotifs([]);
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
        nativePermission,
        realtimeStatus,
        requestNativePermission,
        toggleSound,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
      }}
    >
      {children}

      {/* BANNER FLOTANTE DE NOTIFICACIÓN INMEDIATA (TOAST) */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-stone-900/95 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-500/90 backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-black shrink-0 shadow-md">
            {activeToast.senderAvatar || "🎂"}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md">
                {activeToast.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="text-stone-400 hover:text-white text-xs p-1"
                title="Cerrar notificación"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-black text-white mt-1 leading-snug">
              {activeToast.highlightText}
            </p>
            <p className="text-[11px] text-stone-300 mt-0.5 line-clamp-2 leading-relaxed">
              {activeToast.description}
            </p>
          </div>
        </div>
      )}
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
