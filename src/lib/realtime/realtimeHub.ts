"use client";

import { createClient } from "@/lib/supabase/client";
import { FBNotification } from "@/context/NotificationContext";
import { BranchCashMovement, CustomOrder } from "@/types";

export interface RealtimeSalePayload {
  id: string;
  branchId: string;
  branchName: string;
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  cashier: string;
  itemsSummary: string;
  timestamp: string;
  senderDeviceId: string;
}

export interface RealtimeCashMovementPayload {
  id: string;
  branchId: string;
  branchName: string;
  type: "entrada" | "salida";
  category: BranchCashMovement["category"];
  categoryLabel: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  timestamp: string;
  senderDeviceId: string;
}

export interface RealtimeOrderPayload {
  action: "create" | "payment" | "status" | "delete";
  order: CustomOrder;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeBreadDeliveryPayload {
  id: string;
  driver: string;
  source: string;
  totalPieces: number;
  cashier: string;
  timestamp: string;
  senderDeviceId: string;
}

export type RealtimeStatus = "connected" | "connecting" | "disconnected";

type NotificationListener = (notif: FBNotification) => void;
type SaleListener = (sale: RealtimeSalePayload) => void;
type CashMovementListener = (movement: RealtimeCashMovementPayload) => void;
type OrderListener = (payload: RealtimeOrderPayload) => void;
type BreadDeliveryListener = (delivery: RealtimeBreadDeliveryPayload) => void;
type StatusListener = (status: RealtimeStatus) => void;

const CHANNEL_NAME = "panaderia_brito_realtime";
const DEVICE_STORAGE_KEY = "brito_device_id";
const LAST_SYNC_TIMESTAMP_KEY = "brito_last_realtime_sync_ts";

class RealtimeHub {
  private deviceId: string = "";
  private channel: any = null;
  private status: RealtimeStatus = "disconnected";
  private initialized = false;

  private notificationListeners = new Set<NotificationListener>();
  private saleListeners = new Set<SaleListener>();
  private cashMovementListeners = new Set<CashMovementListener>();
  private orderListeners = new Set<OrderListener>();
  private breadDeliveryListeners = new Set<BreadDeliveryListener>();
  private statusListeners = new Set<StatusListener>();

  constructor() {
    if (typeof window !== "undefined") {
      this.deviceId = this.getOrCreateDeviceId();
      this.initChannel();
      this.setupVisibilityListeners();
    }
  }

  public getDeviceId(): string {
    if (!this.deviceId && typeof window !== "undefined") {
      this.deviceId = this.getOrCreateDeviceId();
    }
    return this.deviceId;
  }

  private getOrCreateDeviceId(): string {
    try {
      const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (stored) return stored;
      const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, newId);
      return newId;
    } catch {
      return `dev_tmp_${Date.now()}`;
    }
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  private setStatus(newStatus: RealtimeStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus);
        } catch (e) {
          console.error("Error in status listener", e);
        }
      });
    }
  }

  private initChannel() {
    if (typeof window === "undefined" || this.channel) return;
    this.setStatus("connecting");

    try {
      const supabase = createClient();
      this.channel = supabase.channel(CHANNEL_NAME, {
        config: {
          broadcast: {
            self: false, // No recibir nuestros propios eventos emitidos
          },
        },
      });

      this.channel
        .on("broadcast", { event: "notification" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          if (payload.senderDeviceId && payload.senderDeviceId === this.getDeviceId()) return;
          this.notificationListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error("[RealtimeHub] Error in notification listener:", err);
            }
          });
        })
        .on("broadcast", { event: "sale" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          if (payload.senderDeviceId && payload.senderDeviceId === this.getDeviceId()) return;
          this.saleListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error("[RealtimeHub] Error in sale listener:", err);
            }
          });
        })
        .on("broadcast", { event: "cash_movement" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          if (payload.senderDeviceId && payload.senderDeviceId === this.getDeviceId()) return;
          this.cashMovementListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error("[RealtimeHub] Error in cash movement listener:", err);
            }
          });
        })
        .on("broadcast", { event: "order" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          if (payload.senderDeviceId && payload.senderDeviceId === this.getDeviceId()) return;
          this.orderListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error("[RealtimeHub] Error in order listener:", err);
            }
          });
        })
        .on("broadcast", { event: "bread_delivery" }, ({ payload }: { payload: any }) => {
          if (!payload) return;
          if (payload.senderDeviceId && payload.senderDeviceId === this.getDeviceId()) return;
          this.breadDeliveryListeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error("[RealtimeHub] Error in bread delivery listener:", err);
            }
          });
        })
        .subscribe((channelStatus: string) => {
          if (channelStatus === "SUBSCRIBED") {
            this.setStatus("connected");
            console.log("[RealtimeHub] Conectado al canal en tiempo real:", CHANNEL_NAME);
            // Al conectar exitosamente, sincronizar eventos perdidos
            this.fetchCatchupEvents();
          } else if (channelStatus === "CLOSED" || channelStatus === "CHANNEL_ERROR") {
            this.setStatus("disconnected");
            console.warn("[RealtimeHub] Canal en tiempo real desconectado:", channelStatus);
          } else {
            this.setStatus("connecting");
          }
        });

      this.initialized = true;
    } catch (err) {
      console.error("[RealtimeHub] Error initializing realtime channel:", err);
      this.setStatus("disconnected");
    }
  }

  private setupVisibilityListeners() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      console.log("[RealtimeHub] Red recuperada. Re-verificando canal en tiempo real...");
      this.reconnect();
      this.fetchCatchupEvents();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log("[RealtimeHub] Pantalla activa. Ejecutando sincronización de catch-up...");
        if (this.status !== "connected") {
          this.reconnect();
        }
        this.fetchCatchupEvents();
      }
    });

    window.addEventListener("focus", () => {
      this.fetchCatchupEvents();
    });
  }

  public reconnect() {
    if (typeof window === "undefined") return;
    try {
      if (this.channel) {
        const supabase = createClient();
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    } catch {}
    this.initChannel();
  }

  // ─── EMISIÓN DE EVENTOS ───────────────────────────────────────────

  public async broadcastNotification(notif: FBNotification) {
    const payload = {
      ...notif,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };

    // 1. WebSocket Broadcast inmediato
    this.sendBroadcast("notification", payload);

    // 2. Registro persistente en endpoint de respaldo
    this.postToSyncEndpoint("notification", payload);
  }

  public async broadcastSale(sale: Omit<RealtimeSalePayload, "senderDeviceId">) {
    const payload: RealtimeSalePayload = {
      ...sale,
      senderDeviceId: this.getDeviceId(),
    };

    this.sendBroadcast("sale", payload);
    this.postToSyncEndpoint("sale", payload);
  }

  public async broadcastCashMovement(movement: Omit<RealtimeCashMovementPayload, "senderDeviceId">) {
    const payload: RealtimeCashMovementPayload = {
      ...movement,
      senderDeviceId: this.getDeviceId(),
    };

    this.sendBroadcast("cash_movement", payload);
    this.postToSyncEndpoint("cash_movement", payload);
  }

  public async broadcastOrder(action: RealtimeOrderPayload["action"], order: CustomOrder) {
    const payload: RealtimeOrderPayload = {
      action,
      order,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };

    this.sendBroadcast("order", payload);
    this.postToSyncEndpoint("order", payload);
  }

  public async broadcastBreadDelivery(delivery: Omit<RealtimeBreadDeliveryPayload, "senderDeviceId">) {
    const payload: RealtimeBreadDeliveryPayload = {
      ...delivery,
      senderDeviceId: this.getDeviceId(),
    };

    this.sendBroadcast("bread_delivery", payload);
    this.postToSyncEndpoint("bread_delivery", payload);
  }

  private sendBroadcast(event: string, payload: any) {
    if (!this.channel) {
      this.initChannel();
    }
    if (this.channel) {
      try {
        this.channel.send({
          type: "broadcast",
          event,
          payload,
        }).catch((err: any) => {
          console.warn(`[RealtimeHub] Error sending ${event} broadcast:`, err);
        });
      } catch (e) {
        console.warn(`[RealtimeHub] Exception sending ${event} broadcast:`, e);
      }
    }
  }

  private async postToSyncEndpoint(type: string, payload: any) {
    if (typeof window === "undefined") return;
    try {
      fetch("/api/realtime/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload,
          senderDeviceId: this.getDeviceId(),
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
  }

  // ─── SINCRONIZACIÓN DE CATCH-UP (CUANDO EL CELULAR DESPIERTA) ───────

  public async fetchCatchupEvents() {
    if (typeof window === "undefined") return;
    try {
      const lastTs = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY) || (Date.now() - 1000 * 60 * 60).toString();
      const res = await fetch(`/api/realtime/sync?since=${lastTs}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !Array.isArray(data.events) || data.events.length === 0) return;

      localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, Date.now().toString());

      for (const item of data.events) {
        if (item.senderDeviceId === this.getDeviceId()) continue;

        if (item.type === "notification") {
          this.notificationListeners.forEach((fn) => fn(item.payload));
        } else if (item.type === "sale") {
          this.saleListeners.forEach((fn) => fn(item.payload));
        } else if (item.type === "cash_movement") {
          this.cashMovementListeners.forEach((fn) => fn(item.payload));
        } else if (item.type === "order") {
          this.orderListeners.forEach((fn) => fn(item.payload));
        } else if (item.type === "bread_delivery") {
          this.breadDeliveryListeners.forEach((fn) => fn(item.payload));
        }
      }
    } catch {
      // Ignorar errores de red en catchup silencioso
    }
  }

  // ─── SUSCRIPCIONES PÚBLICAS ───────────────────────────────────────

  public onNotification(listener: NotificationListener) {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  public onSale(listener: SaleListener) {
    this.saleListeners.add(listener);
    return () => {
      this.saleListeners.delete(listener);
    };
  }

  public onCashMovement(listener: CashMovementListener) {
    this.cashMovementListeners.add(listener);
    return () => {
      this.cashMovementListeners.delete(listener);
    };
  }

  public onOrder(listener: OrderListener) {
    this.orderListeners.add(listener);
    return () => {
      this.orderListeners.delete(listener);
    };
  }

  public onBreadDelivery(listener: BreadDeliveryListener) {
    this.breadDeliveryListeners.add(listener);
    return () => {
      this.breadDeliveryListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    // Disparar inmediatamente con el estado actual
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }
}

// Singleton global
export const realtimeHub = typeof window !== "undefined" ? new RealtimeHub() : ({} as RealtimeHub);
