"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SyncItem, SyncType } from "@/types";
import {
  getSyncQueue,
  enqueueSyncItem,
  removeSyncItem,
  clearSyncQueue,
  getPendingSyncCount,
  getLastSyncTime,
  isSimulatedOffline as checkSimulatedOffline,
  setSimulatedOffline,
  checkRealOnlineStatus,
  processSyncQueue,
  exportLocalEmergencyBackup,
  downloadAllDataToLocalPc,
  getLocalDataStats,
  LocalDataStats,
  generateWindowsDesktopShortcutScript,
  runSystemHealthDiagnostic,
  HealthCheckResult,
  createDemoOfflineSale,
  printEmergencyContingencySheet,
} from "@/lib/sync/syncService";
import { playCashRegisterSound } from "@/lib/sound";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  isSynced: boolean;
  pendingCount: number;
  queue: SyncItem[];
  lastSyncTime: string | null;
  isSimulatedOffline: boolean;
  connectionDetail: string;
  latencyMs?: number;
  canInstallPwa: boolean;
  isInstalledPwa: boolean;
  localStats: LocalDataStats;
  promptInstallPwa: () => Promise<boolean>;
  syncNow: () => Promise<{ total: number; synced: number; failed: number; errors: string[] }>;
  enqueueOfflineItem: (params: {
    type: SyncType;
    title: string;
    amount?: number;
    branchId?: string;
    data: any;
  }) => SyncItem;
  removeQueueItem: (id: string) => void;
  clearQueue: () => void;
  toggleSimulateOffline: () => void;
  refreshConnection: () => Promise<void>;
  downloadLocalData: () => Promise<{ success: boolean; message: string; stats: LocalDataStats }>;
  downloadPinScript: (branchName?: string) => void;
  exportBackup: () => void;
  runHealthCheck: () => Promise<HealthCheckResult>;
  simulateDemoSale: () => SyncItem;
  printContingencySheet: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(null);
  const [isSimulatedOfflineState, setIsSimulatedOfflineState] = useState<boolean>(false);
  const [connectionDetail, setConnectionDetail] = useState<string>("Verificando conexión...");
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [localStats, setLocalStats] = useState<LocalDataStats>(() => getLocalDataStats());

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [isInstalledPwa, setIsInstalledPwa] = useState<boolean>(false);

  // 1. Cargar datos locales de sincronización y métricas de almacenamiento
  const refreshQueueAndStats = useCallback(() => {
    if (typeof window === "undefined") return;
    const q = getSyncQueue();
    setQueue(q);
    setPendingCount(q.length);
    setLastSyncTimeState(getLastSyncTime());
    setIsSimulatedOfflineState(checkSimulatedOffline());
    setLocalStats(getLocalDataStats());
  }, []);

  // 2. Verificar estado de la conexión en vivo con respuesta inmediata
  const refreshConnection = useCallback(async () => {
    refreshQueueAndStats();
    const res = await checkRealOnlineStatus();
    setIsOnline(res.isOnline);
    setLatencyMs(res.latencyMs);
    setConnectionDetail(res.detail);
  }, [refreshQueueAndStats]);

  // 3. Sincronizar inmediatamente
  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await processSyncQueue();
      refreshQueueAndStats();
      const con = await checkRealOnlineStatus();
      setIsOnline(con.isOnline);
      setLatencyMs(con.latencyMs);
      setConnectionDetail(con.detail);
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshQueueAndStats]);

  // 4. Descargar / actualizar todo el catálogo local en la PC
  const downloadLocalData = useCallback(async () => {
    const res = await downloadAllDataToLocalPc();
    setLocalStats(res.stats);
    return res;
  }, []);

  // 5. Simular venta demo con sonido de caja
  const simulateDemoSale = useCallback(() => {
    const item = createDemoOfflineSale();
    try {
      playCashRegisterSound();
    } catch {}
    refreshQueueAndStats();
    return item;
  }, [refreshQueueAndStats]);

  // 6. Diagnóstico de salud
  const runHealthCheck = useCallback(async () => {
    const res = await runSystemHealthDiagnostic();
    refreshConnection();
    return res;
  }, [refreshConnection]);

  // 7. Encolar nuevo ítem offline
  const enqueueOfflineItem = useCallback(
    (params: {
      type: SyncType;
      title: string;
      amount?: number;
      branchId?: string;
      data: any;
    }) => {
      const item = enqueueSyncItem(params);
      refreshQueueAndStats();
      return item;
    },
    [refreshQueueAndStats]
  );

  const removeQueueItem = useCallback(
    (id: string) => {
      removeSyncItem(id);
      refreshQueueAndStats();
    },
    [refreshQueueAndStats]
  );

  const clearQueue = useCallback(() => {
    clearSyncQueue();
    refreshQueueAndStats();
  }, [refreshQueueAndStats]);

  const toggleSimulateOffline = useCallback(() => {
    const nextVal = !isSimulatedOfflineState;
    setSimulatedOffline(nextVal);
    setIsSimulatedOfflineState(nextVal);
    refreshConnection();
  }, [isSimulatedOfflineState, refreshConnection]);

  // 8. Instalar PWA
  const promptInstallPwa = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      generateWindowsDesktopShortcutScript();
      return false;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalledPwa(true);
        setCanInstallPwa(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[PWA] Error al disparar prompt de instalación:", err);
      generateWindowsDesktopShortcutScript();
      return false;
    }
  }, [deferredPrompt]);

  // 9. Efecto inicial: Registrar Service Worker, precargar datos locales y escuchar eventos de red
  useEffect(() => {
    // Asegurar que la PC tenga los datos del catálogo descargados desde el primer arranque
    downloadAllDataToLocalPc().catch(() => {});
    refreshConnection();

    // Registro de Service Worker para funcionamiento 100% offline
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[ServiceWorker] Listo y protegiendo modo offline:", reg.scope);
        })
        .catch((err) => {
          console.warn("[ServiceWorker] No se pudo registrar:", err);
        });
    }

    // Detectar si ya corre en ventana de aplicación independiente
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalledPwa(isStandalone);

    // Capturar evento de instalación PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setIsInstalledPwa(true);
      setCanInstallPwa(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Eventos inmediatos del sistema operativo al conectar o desconectar internet
    const handleOnlineEvent = async () => {
      console.log("[SyncContext] Dispositivo en línea. Restaurando conexión y sincronizando...");
      setIsOnline(true);
      setConnectionDetail("Conexión a internet restablecida");
      await refreshConnection();
      await syncNow();
    };

    const handleOfflineEvent = () => {
      console.log("[SyncContext] Dispositivo desconectado de la red.");
      setIsOnline(false);
      setConnectionDetail("Sin conexión a internet (Modo Offline Seguro)");
    };

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("brito_sync_queue_updated", refreshQueueAndStats);
    window.addEventListener("brito_network_status_changed", refreshConnection);

    // Heartbeat cada 25 segundos para mantener estado en vivo
    const interval = setInterval(async () => {
      await refreshConnection();
      if (getPendingSyncCount() > 0 && !checkSimulatedOffline()) {
        await syncNow();
      }
    }, 25000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("brito_sync_queue_updated", refreshQueueAndStats);
      window.removeEventListener("brito_network_status_changed", refreshConnection);
      clearInterval(interval);
    };
  }, [downloadLocalData, refreshConnection, refreshQueueAndStats, syncNow]);

  const isSynced = isOnline && !isSyncing && pendingCount === 0;

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        isSynced,
        pendingCount,
        queue,
        lastSyncTime,
        isSimulatedOffline: isSimulatedOfflineState,
        connectionDetail,
        latencyMs,
        canInstallPwa,
        isInstalledPwa,
        localStats,
        promptInstallPwa,
        syncNow,
        enqueueOfflineItem,
        removeQueueItem,
        clearQueue,
        toggleSimulateOffline,
        refreshConnection,
        downloadLocalData,
        downloadPinScript: (bName?: string) => generateWindowsDesktopShortcutScript(bName),
        exportBackup: exportLocalEmergencyBackup,
        runHealthCheck,
        simulateDemoSale,
        printContingencySheet: printEmergencyContingencySheet,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync debe usarse dentro de un SyncProvider");
  }
  return context;
}
