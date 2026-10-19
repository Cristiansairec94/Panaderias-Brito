"use client";

import { createClient } from "@/lib/supabase/client";
import { FBNotification } from "@/context/NotificationContext";
import { BranchCashMovement, CustomOrder, Branch, ShiftCutRecord } from "@/types";
import { CLEAN_SLATE_EPOCH } from "@/lib/wipeOperationalData";

export interface RealtimeBranchPayload {
  action: "create" | "update" | "delete";
  branch: Branch;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeShiftCutPayload {
  cut: ShiftCutRecord;
  senderDeviceId: string;
  timestamp: string;
}

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
  items?: any[];
  customerName?: string;
  date?: string;
  createdAt?: string;
}

export interface RealtimeSaleCancelledPayload {
  id: string;
  branchId: string;
  amount: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  cashier?: string;
  timestamp: string;
  senderDeviceId: string;
}

export interface RealtimeCashMovementPayload {
  id: string;
  branchId: string;
  branchName: string;
  type: "entrada" | "salida";
  category?: BranchCashMovement["category"];
  categoryLabel?: string;
  amount: number;
  reason: string;
  authorizedBy?: string;
  cashier?: string;
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia" | string;
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

export interface RealtimeSessionRevokedPayload {
  userId: string;
  activeDeviceId: string;
  activeSessionToken: string;
  sessionToken?: string;
  activeTabId?: string;
  deviceName?: string;
  timestamp: string;
  senderDeviceId: string;
}

export interface RealtimeProductPayload {
  action: "create" | "update" | "delete";
  product: any;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeCustomerPayload {
  action: "create" | "update" | "delete";
  customer: any;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeUserPayload {
  action: "create" | "update" | "delete";
  user: any;
  deletedId?: string;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeExpensePayload {
  action: "create" | "update" | "delete";
  expense: any;
  deletedId?: string;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeIncomePayload {
  action: "create" | "update" | "delete";
  income: any;
  deletedId?: string;
  senderDeviceId: string;
  timestamp: string;
}

export interface RealtimeInventoryPayload {
  action: "create" | "update" | "delete" | "movement";
  item?: any;
  movement?: any;
  items?: any[];
  movements?: any[];
  id?: string;
  deletedId?: string;
  senderDeviceId: string;
  timestamp: string;
}

export type RealtimeStatus = "connected" | "connecting" | "disconnected";

type NotificationListener = (notif: FBNotification) => void;
type SaleListener = (sale: RealtimeSalePayload) => void;
type SaleCancelledListener = (payload: RealtimeSaleCancelledPayload) => void;
type CashMovementListener = (movement: RealtimeCashMovementPayload) => void;
type OrderListener = (payload: RealtimeOrderPayload) => void;
type BreadDeliveryListener = (delivery: RealtimeBreadDeliveryPayload) => void;
type BranchListener = (payload: RealtimeBranchPayload) => void;
type ShiftCutListener = (cut: ShiftCutRecord) => void;
type SessionRevokedListener = (payload: RealtimeSessionRevokedPayload) => void;
type ProductListener = (payload: RealtimeProductPayload) => void;
type CustomerListener = (payload: RealtimeCustomerPayload) => void;
type UserListener = (payload: RealtimeUserPayload) => void;
type ExpenseListener = (payload: RealtimeExpensePayload) => void;
type IncomeListener = (payload: RealtimeIncomePayload) => void;
type InventoryListener = (payload: RealtimeInventoryPayload) => void;
type StatusListener = (status: RealtimeStatus) => void;

const CHANNEL_NAME = "panaderia_brito_realtime";
const DEVICE_STORAGE_KEY = "brito_device_id";
const LAST_SYNC_TIMESTAMP_KEY = "brito_last_realtime_sync_ts";

class RealtimeHub {
  private deviceId: string = "";
  private tabId: string = typeof window !== "undefined" ? `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` : "tab_srv";
  private localBroadcastChannel: BroadcastChannel | null = null;
  private seenEventIds = new Set<string>();
  private channel: any = null;
  private status: RealtimeStatus = "disconnected";
  private initialized = false;
  private lastSyncTimestamp: number = Math.max(CLEAN_SLATE_EPOCH, Date.now() - 1000 * 60 * 60);

  private notificationListeners = new Set<NotificationListener>();
  private saleListeners = new Set<SaleListener>();
  private saleCancelledListeners = new Set<SaleCancelledListener>();
  private cashMovementListeners = new Set<CashMovementListener>();
  private orderListeners = new Set<OrderListener>();
  private breadDeliveryListeners = new Set<BreadDeliveryListener>();
  private branchListeners = new Set<BranchListener>();
  private shiftCutListeners = new Set<ShiftCutListener>();
  private sessionRevokedListeners = new Set<SessionRevokedListener>();
  private productListeners = new Set<ProductListener>();
  private customerListeners = new Set<CustomerListener>();
  private userListeners = new Set<UserListener>();
  private expenseListeners = new Set<ExpenseListener>();
  private incomeListeners = new Set<IncomeListener>();
  private inventoryListeners = new Set<InventoryListener>();
  private statusListeners = new Set<StatusListener>();

  constructor() {
    if (typeof window !== "undefined") {
      this.deviceId = this.getOrCreateDeviceId();
      if (typeof BroadcastChannel !== "undefined") {
        try {
          this.localBroadcastChannel = new BroadcastChannel("brito_realtime_local_bus");
          this.localBroadcastChannel.onmessage = (event) => {
            if (!event || !event.data) return;
            const { type, payload, senderTabId } = event.data;
            if (senderTabId && senderTabId === this.tabId) return;
            this.dispatchLocalEvent(type, payload);
          };
        } catch (e) {
          console.warn("[RealtimeHub] Error inicializando BroadcastChannel:", e);
        }
      }
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

  public getTabId(): string {
    return this.tabId;
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

  public dispatchLocalEvent(type: string, payload: any) {
    if (!payload) return;
    const rawId =
      payload.id ||
      (payload.cut && payload.cut.id) ||
      (payload.order && payload.order.id) ||
      (payload.branch && payload.branch.id) ||
      (payload.user && payload.user.id) ||
      (payload.product && payload.product.id) ||
      (payload.customer && payload.customer.id) ||
      (payload.expense && payload.expense.id) ||
      (payload.income && payload.income.id) ||
      (payload.item && payload.item.id) ||
      (payload.movement && payload.movement.id) ||
      payload.deletedId ||
      null;
    if (rawId && typeof rawId === "string" && (rawId.includes("ING-ING") || rawId.includes("mov-mov-"))) {
      return;
    }
    const versionSuffix =
      type === "notification" ||
      type === "order" ||
      type === "branch" ||
      type === "user" ||
      type === "product" ||
      type === "customer" ||
      type === "expense" ||
      type === "income" ||
      type === "inventory"
        ? `_${payload.timestamp || payload.order?.timestamp || payload.order?.deposit || payload.order?.status || payload.title || ""}`
        : "";
    const eventId = rawId ? `${type}_${rawId}_${payload.action || ""}${versionSuffix}` : null;
    if (eventId) {
      if (this.seenEventIds.has(eventId)) return;
      this.seenEventIds.add(eventId);
      if (this.seenEventIds.size > 2000) {
        const first = this.seenEventIds.values().next().value;
        if (first) this.seenEventIds.delete(first);
      }
    }

    if (type === "notification") {
      this.notificationListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "sale") {
      this.saleListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "sale_cancelled") {
      this.saleCancelledListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "cash_movement") {
      this.cashMovementListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "order") {
      this.orderListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "bread_delivery") {
      this.breadDeliveryListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "branch") {
      this.branchListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "shift_cut") {
      const cutData = payload?.cut || payload;
      this.shiftCutListeners.forEach((fn) => { try { fn(cutData); } catch (err) { console.error(err); } });
    } else if (type === "user_session_revoked") {
      this.sessionRevokedListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "product") {
      this.productListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "customer") {
      this.customerListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "user") {
      this.userListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "expense") {
      this.expenseListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "income") {
      this.incomeListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
    } else if (type === "inventory") {
      this.inventoryListeners.forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } });
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
            self: false,
          },
        },
      });

      this.channel
        .on("broadcast", { event: "notification" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("notification", payload);
        })
        .on("broadcast", { event: "sale" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("sale", payload);
        })
        .on("broadcast", { event: "sale_cancelled" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("sale_cancelled", payload);
        })
        .on("broadcast", { event: "cash_movement" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("cash_movement", payload);
        })
        .on("broadcast", { event: "order" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("order", payload);
        })
        .on("broadcast", { event: "bread_delivery" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("bread_delivery", payload);
        })
        .on("broadcast", { event: "branch" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("branch", payload);
        })
        .on("broadcast", { event: "shift_cut" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("shift_cut", payload);
        })
        .on("broadcast", { event: "user_session_revoked" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("user_session_revoked", payload);
        })
        .on("broadcast", { event: "product" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("product", payload);
        })
        .on("broadcast", { event: "customer" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("customer", payload);
        })
        .on("broadcast", { event: "user" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("user", payload);
        })
        .on("broadcast", { event: "expense" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("expense", payload);
        })
        .on("broadcast", { event: "income" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("income", payload);
        })
        .on("broadcast", { event: "inventory" }, ({ payload }: { payload: any }) => {
          if (payload?.senderTabId && payload.senderTabId === this.tabId) return;
          this.dispatchLocalEvent("inventory", payload);
        })
        .subscribe((channelStatus: string) => {
          if (channelStatus === "SUBSCRIBED") {
            this.setStatus("connected");
            console.log("[RealtimeHub] Conectado al canal en tiempo real:", CHANNEL_NAME);
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
        if (this.status !== "connected") {
          this.reconnect();
        }
        this.fetchCatchupEvents();
      }
    });

    window.addEventListener("focus", () => {
      this.fetchCatchupEvents();
    });

    // Heartbeat periódico cada 2.5 segundos con control de concurrencia y protección offline
    setInterval(() => {
      this.fetchCatchupEvents();
    }, 2500);
  }

  public async triggerSyncNow() {
    return this.fetchCatchupEvents();
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
      timestamp: typeof notif.timestamp === "number" && notif.timestamp > 0 ? notif.timestamp : Date.now(),
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

  public async broadcastSaleCancelled(params: {
    id: string;
    branchId: string;
    amount: number;
    paymentMethod: "efectivo" | "tarjeta" | "transferencia";
    cashier?: string;
  }) {
    const payload: RealtimeSaleCancelledPayload = {
      ...params,
      timestamp: new Date().toISOString(),
      senderDeviceId: this.getDeviceId(),
    };

    this.sendBroadcast("sale_cancelled", payload);
    this.postToSyncEndpoint("sale_cancelled", payload);
  }

  public async broadcastCashMovement(movement: Omit<RealtimeCashMovementPayload, "senderDeviceId">) {
    if (!movement || !movement.id) return;
    // Guard against recursive / looping IDs
    if (movement.id.includes("ING-ING") || movement.id.includes("mov-mov-")) return;
    if (movement.reason && movement.reason.includes("Cambio / Feria: Cambio / Feria")) return;

    const eventKey = `cash_movement_${movement.id}`;
    if (this.seenEventIds.has(eventKey)) return;
    this.seenEventIds.add(eventKey);

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

  public async broadcastBranch(action: RealtimeBranchPayload["action"], branch: Branch) {
    const payload: RealtimeBranchPayload = {
      action,
      branch,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };

    this.sendBroadcast("branch", payload);
    this.postToSyncEndpoint("branch", payload);
  }

  public async broadcastShiftCut(cut: ShiftCutRecord) {
    const payload: RealtimeShiftCutPayload = {
      cut,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };

    this.sendBroadcast("shift_cut", payload);
    this.postToSyncEndpoint("shift_cut", payload);
  }

  private sendBroadcast(event: string, payload: any) {
    const payloadWithTab = { ...payload, senderTabId: this.tabId };

    // 1. Inmediato en la misma máquina entre pestañas y perfiles (0 ms)
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.postMessage({ type: event, payload: payloadWithTab, senderTabId: this.tabId });
      } catch (err) {
        console.warn("[RealtimeHub] Error local BroadcastChannel:", err);
      }
    }

    // 2. Supabase WebSocket Broadcast hacia otros celulares y computadoras (solo si hay red)
    const isOfflineMode =
      typeof window !== "undefined" &&
      (localStorage.getItem("brito_simulate_offline") === "true" ||
        (typeof navigator !== "undefined" && !navigator.onLine));
    if (isOfflineMode) return;

    if (!this.channel) {
      this.initChannel();
    }
    if (this.channel) {
      try {
        this.channel.send({
          type: "broadcast",
          event,
          payload: payloadWithTab,
        }).catch((err: any) => {
          console.warn(`[RealtimeHub] Error sending ${event} broadcast:`, err);
        });
      } catch (e) {
        console.warn(`[RealtimeHub] Exception sending ${event} broadcast:`, e);
      }
    }
  }

  private isFetchingCatchup = false;

  private async postToSyncEndpoint(type: string, payload: any) {
    if (typeof window === "undefined") return;
    if (
      localStorage.getItem("brito_simulate_offline") === "true" ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      return;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      fetch("/api/realtime/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload: { ...payload, senderTabId: this.tabId },
          senderDeviceId: this.getDeviceId(),
          senderTabId: this.tabId,
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      })
        .catch(() => {})
        .finally(() => clearTimeout(timeoutId));
    } catch {}
  }

  // ─── SINCRONIZACIÓN DE CATCH-UP (CUANDO EL CELULAR DESPIERTA) ───────

  public async fetchCatchupEvents() {
    if (typeof window === "undefined") return;
    if (this.isFetchingCatchup) return;
    if (
      localStorage.getItem("brito_simulate_offline") === "true" ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      return;
    }

    this.isFetchingCatchup = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const rawLastTs = this.lastSyncTimestamp
        ? Math.max(0, this.lastSyncTimestamp - 30000)
        : (Date.now() - 1000 * 60 * 60);
      const lastTs = Math.max(CLEAN_SLATE_EPOCH, rawLastTs);
      const res = await fetch(`/api/realtime/sync?since=${lastTs}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data) return;

      if (data.serverTime) {
        this.lastSyncTimestamp = Math.max(CLEAN_SLATE_EPOCH, data.serverTime);
      } else {
        this.lastSyncTimestamp = Math.max(CLEAN_SLATE_EPOCH, Date.now());
      }

      if (!Array.isArray(data.events) || data.events.length === 0) return;

      for (const item of data.events) {
        if ((item.timestamp || 0) < CLEAN_SLATE_EPOCH) continue;
        if (item.type === "user_session_revoked") continue;
        if (item.senderTabId && item.senderTabId === this.tabId) continue;
        if (item.payload?.senderTabId && item.payload.senderTabId === this.tabId) continue;

        this.dispatchLocalEvent(item.type, item.payload);
      }
    } catch {
      // Ignorar errores de red en catchup silencioso
    } finally {
      clearTimeout(timeoutId);
      this.isFetchingCatchup = false;
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

  public onSaleCancelled(listener: SaleCancelledListener) {
    this.saleCancelledListeners.add(listener);
    return () => {
      this.saleCancelledListeners.delete(listener);
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

  public onBranch(listener: BranchListener) {
    this.branchListeners.add(listener);
    return () => {
      this.branchListeners.delete(listener);
    };
  }

  public onShiftCut(listener: ShiftCutListener) {
    this.shiftCutListeners.add(listener);
    return () => {
      this.shiftCutListeners.delete(listener);
    };
  }

  public async broadcastUserSessionRevoked(params: {
    userId: string;
    activeDeviceId: string;
    activeSessionToken?: string;
    sessionToken?: string;
    activeTabId?: string;
    deviceName?: string;
    timestamp?: string;
  }) {
    const token = params.activeSessionToken || params.sessionToken || "";
    const payload: RealtimeSessionRevokedPayload = {
      userId: params.userId,
      activeDeviceId: params.activeDeviceId,
      activeSessionToken: token,
      sessionToken: token,
      activeTabId: params.activeTabId,
      deviceName: params.deviceName,
      timestamp: params.timestamp || new Date().toISOString(),
      senderDeviceId: this.getDeviceId(),
    };

    this.sendBroadcast("user_session_revoked", payload);
  }

  public onUserSessionRevoked(listener: SessionRevokedListener) {
    this.sessionRevokedListeners.add(listener);
    return () => {
      this.sessionRevokedListeners.delete(listener);
    };
  }

  public async broadcastProduct(action: "create" | "update" | "delete", product: any) {
    const payload: RealtimeProductPayload = {
      action,
      product,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocalEvent("product", payload);
    this.sendBroadcast("product", payload);
    this.postToSyncEndpoint("product", payload);
  }

  public onProduct(listener: ProductListener) {
    this.productListeners.add(listener);
    return () => {
      this.productListeners.delete(listener);
    };
  }

  public async broadcastCustomer(action: "create" | "update" | "delete", customer: any) {
    const payload: RealtimeCustomerPayload = {
      action,
      customer,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocalEvent("customer", payload);
    this.sendBroadcast("customer", payload);
    this.postToSyncEndpoint("customer", payload);
  }

  public onCustomer(listener: CustomerListener) {
    this.customerListeners.add(listener);
    return () => {
      this.customerListeners.delete(listener);
    };
  }

  public async broadcastUser(action: "create" | "update" | "delete", user: any) {
    const payload: RealtimeUserPayload = {
      action,
      user,
      deletedId: action === "delete" ? (user?.id || user) : undefined,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    (payload as any).senderTabId = this.tabId;
    this.dispatchLocalEvent("user", payload);
    this.sendBroadcast("user", payload);
    this.postToSyncEndpoint("user", payload);
  }

  public onUser(listener: UserListener) {
    this.userListeners.add(listener);
    return () => {
      this.userListeners.delete(listener);
    };
  }

  public async broadcastExpense(action: "create" | "update" | "delete", expense: any) {
    const payload: RealtimeExpensePayload = {
      action,
      expense,
      deletedId: action === "delete" ? (expense?.id || expense) : undefined,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocalEvent("expense", payload);
    this.sendBroadcast("expense", payload);
    this.postToSyncEndpoint("expense", payload);
  }

  public onExpense(listener: ExpenseListener) {
    this.expenseListeners.add(listener);
    return () => {
      this.expenseListeners.delete(listener);
    };
  }

  public async broadcastIncome(action: "create" | "update" | "delete", income: any) {
    const payload: RealtimeIncomePayload = {
      action,
      income,
      deletedId: action === "delete" ? (income?.id || income) : undefined,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocalEvent("income", payload);
    this.sendBroadcast("income", payload);
    this.postToSyncEndpoint("income", payload);
  }

  public onIncome(listener: IncomeListener) {
    this.incomeListeners.add(listener);
    return () => {
      this.incomeListeners.delete(listener);
    };
  }

  public async broadcastInventory(
    action: "create" | "update" | "delete" | "movement",
    data: { item?: any; movement?: any; items?: any[]; movements?: any[]; id?: string; deletedId?: string }
  ) {
    const payload: RealtimeInventoryPayload = {
      action,
      ...data,
      senderDeviceId: this.getDeviceId(),
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocalEvent("inventory", payload);
    this.sendBroadcast("inventory", payload);
    this.postToSyncEndpoint("inventory", payload);
  }

  public onInventory(listener: InventoryListener) {
    this.inventoryListeners.add(listener);
    return () => {
      this.inventoryListeners.delete(listener);
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
