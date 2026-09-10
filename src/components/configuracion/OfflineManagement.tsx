"use client";

import React, { useState } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Monitor, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Trash2, 
  HardDrive, 
  Sparkles, 
  HelpCircle,
  Check,
  AlertTriangle,
  Send,
  Zap,
  Pin,
  PackageCheck,
  Server,
  Layers,
  Activity,
  Printer,
  Eye,
  X,
  ChevronRight,
  Play,
  ArrowRight,
  CheckCircle,
  Sliders,
  Shield,
  Receipt
} from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { formatCurrency } from "@/lib/utils";
import { HealthCheckResult } from "@/lib/sync/syncService";
import { SyncItem } from "@/types";

export default function OfflineManagement() {
  const {
    isOnline,
    isSyncing,
    isSynced,
    pendingCount,
    queue,
    lastSyncTime,
    isSimulatedOffline,
    connectionDetail,
    latencyMs,
    canInstallPwa,
    isInstalledPwa,
    localStats,
    promptInstallPwa,
    syncNow,
    removeQueueItem,
    clearQueue,
    toggleSimulateOffline,
    refreshConnection,
    downloadLocalData,
    downloadPinScript,
    exportBackup,
    runHealthCheck,
    simulateDemoSale,
    printContingencySheet,
  } = useSync();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [healthDiagnostic, setHealthDiagnostic] = useState<HealthCheckResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [viewingQueueItem, setViewingQueueItem] = useState<SyncItem | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleRunHealthCheck = async () => {
    setIsRunningDiagnostic(true);
    try {
      const res = await runHealthCheck();
      setHealthDiagnostic(res);
      showToast(`Diagnóstico completado: Salud del sistema al ${res.score}%.`, "success");
    } catch {
      showToast("No se pudo completar el diagnóstico.", "error");
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleSimulateSaleClick = () => {
    simulateDemoSale();
    showToast(`🔔 ¡Venta de prueba cobrada en memoria local! Total: $62.00 MXN. Ver registro en la cola abajo.`, "info");
  };

  const handleSyncNow = async () => {
    try {
      const res = await syncNow();
      if (res.synced > 0) {
        showToast(`¡Sincronización completada! Se subieron ${res.synced} venta(s) a la nube de Supabase.`, "success");
      } else if (res.failed > 0) {
        showToast(`Hubo inconvenientes con ${res.failed} registro(s). Se mantienen guardados en tu PC.`, "error");
      } else {
        showToast("Todo está al día. Todos tus datos están sincronizados en la nube.", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Error al sincronizar con la nube", "error");
    }
  };

  const handleToggleOfflineDemo = () => {
    toggleSimulateOffline();
    if (!isSimulatedOffline) {
      showToast("Modo 'Sin Red' activado. El sistema ahora opera en modo desconectado.", "info");
    } else {
      showToast("Conexión restaurada a modo normal.", "success");
    }
  };

  const handlePrintSheet = () => {
    printContingencySheet();
    showToast("Abriendo hoja de contingencia para mostrador de caja...", "info");
  };

  const handleInstallClick = async () => {
    const success = await promptInstallPwa();
    if (success) {
      showToast("¡Panadería Brito se instaló en tu computadora! Ya puedes anclarlo a la barra de tareas.", "success");
    } else {
      showToast("Se descargó el instalador para tu Escritorio de Windows.", "info");
    }
  };

  const handleDownloadAllData = async () => {
    setIsDownloadingData(true);
    try {
      const res = await downloadLocalData();
      if (res.success) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
    } finally {
      setIsDownloadingData(false);
    }
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Al iniciar el sistema";

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl transition-all ${
            feedbackMsg.type === "success"
              ? "bg-emerald-600 text-white"
              : feedbackMsg.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-stone-900 text-stone-100 border border-stone-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
            {feedbackMsg.type === "error" && <AlertCircle className="w-5 h-5 shrink-0 text-white" />}
            {feedbackMsg.type === "info" && <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
            <span className="leading-relaxed">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-white/80 hover:text-white ml-3 text-xs font-black cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ─── 1. SEMÁFORO Y ESTADO EN VIVO (EN LÍNEA / SINCRONIZADO / OFFLINE) ── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${
                !isOnline
                  ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30"
                  : isSyncing
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 animate-pulse"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-7 h-7" />
              ) : isSyncing ? (
                <RefreshCw className="w-7 h-7 animate-spin" />
              ) : (
                <Wifi className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xl text-stone-900 tracking-tight">
                  {!isOnline
                    ? "Modo Fuera de Línea (Sin Internet)"
                    : isSyncing
                    ? "Sincronizando con la Nube..."
                    : "En Línea y Conectado"}
                </h3>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    !isOnline
                      ? "bg-rose-100 text-rose-800 animate-pulse"
                      : isSyncing
                      ? "bg-amber-100 text-amber-900"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${!isOnline ? "bg-rose-500" : isSyncing ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
                  {!isOnline ? "Desconectado" : isSyncing ? "Sincronizando" : "Sincronizado"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">{connectionDetail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshConnection}
              className="px-3.5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Volver a verificar la señal de internet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-500" : ""}`} />
              <span>Verificar Conexión</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !isOnline}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all ${
                isOnline
                  ? "bg-stone-900 hover:bg-black text-white active:scale-95 cursor-pointer"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
              <span>{isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}</span>
            </button>
          </div>
        </div>

        {/* 3 Tarjetas de Métricas de Conexión */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
              Ventas / Registros en Espera
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black ${
                  pendingCount > 0 ? "text-amber-600 animate-pulse" : "text-emerald-700"
                }`}
              >
                {pendingCount}
              </span>
              <span className="text-xs text-stone-600 font-bold">
                {pendingCount === 0 ? "al día en la nube" : pendingCount === 1 ? "registro pendiente" : "registros pendientes"}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {pendingCount > 0
                ? "Se subirán automáticamente en cuanto haya señal."
                : "Toda la información está resguardada en Supabase."}
            </p>
          </div>

          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
              Última Sincronización
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="text-base font-black text-stone-900">{formattedLastSync}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {latencyMs !== undefined ? `Respuesta del servidor: ${latencyMs} ms` : "Monitoreo en vivo"}
            </p>
          </div>

          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
                Estado de Red en Caja
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isOnline ? "Conectado a la nube de Panaderías Brito" : "Trabajando con base de datos local en disco"}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-xs font-bold text-stone-700">Modo:</span>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {isOnline ? "🟢 Conectado" : "🔴 Fuera de Línea"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. 🎮 CONSOLA DE DEMOSTRACIÓN EN VIVO (PARA MOSTRAR AL CLIENTE) ── */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950 p-6 rounded-3xl border border-amber-900/30 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-white">
                Consola Interactiva de Demostración Offline
              </h3>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Prueba en tiempo real cómo la panadería nunca se detiene ante una caída de internet. Sigue estos 3 pasos:
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider self-start sm:self-center">
            Simulador en Vivo
          </span>
        </div>

        {/* 3 Pasos Interactivos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Paso 1: Cortar Internet */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3 hover:bg-white/[0.07] transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                  Paso 1: Corte de Red
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${isSimulatedOffline ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
              </div>
              <h4 className="font-black text-sm text-white">Simular Corte de Internet</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Desconecta virtualmente el sistema para comprobar que el POS sigue cobrando sin conexión.
              </p>
            </div>

            <button
              onClick={handleToggleOfflineDemo}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSimulatedOffline
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40"
              }`}
            >
              {isSimulatedOffline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Restaurar Conexión</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Simular Corte de Red</span>
                </>
              )}
            </button>
          </div>

          {/* Paso 2: Cobrar Venta Offline */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3 hover:bg-white/[0.07] transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                  Paso 2: Cobro Local
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold">$62.00 MXN</span>
              </div>
              <h4 className="font-black text-sm text-white">Cobrar Venta de Prueba</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Simula el cobro de 1 Concha de Vainilla + 10 Bolillos con sonido real de caja registradora.
              </p>
            </div>

            <button
              onClick={handleSimulateSaleClick}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/40 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Cobrar Venta Offline ($62)</span>
            </button>
          </div>

          {/* Paso 3: Reconectar y Sincronizar */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3 hover:bg-white/[0.07] transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                  Paso 3: Auto-Sincronización
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">{pendingCount} en cola</span>
              </div>
              <h4 className="font-black text-sm text-white">Reconectar y Sincronizar</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Restaura el internet si estaba cortado y sube las ventas acumuladas a la base de datos central.
              </p>
            </div>

            <button
              onClick={async () => {
                if (isSimulatedOffline) {
                  toggleSimulateOffline();
                }
                await handleSyncNow();
              }}
              disabled={isSyncing}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>{isSyncing ? "Subiendo ventas..." : "Reconectar y Subir Ventas"}</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-stone-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Experiencia para el cliente:</strong> La cajera nunca observa pantallas de error, congelamientos ni ruedas infinitas de carga. Cobra con total velocidad y el sistema despacha los tickets a la nube en segundo plano cuando la red regresa.
          </p>
        </div>
      </div>

      {/* ─── 3. 🩺 AUDITORÍA INTEGRAL DE SALUD DEL SISTEMA (5 PUNTOS) ─────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brito-orange-500" />
              <h3 className="font-black text-base text-stone-900">
                Auditoría y Diagnóstico de Salud de la Caja (5 Puntos)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Verifica que todos los componentes de contingencia (memoria local, catálogo, motor de servicio y red) estén óptimos.
            </p>
          </div>

          <button
            onClick={handleRunHealthCheck}
            disabled={isRunningDiagnostic}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Activity className={`w-4 h-4 text-amber-400 ${isRunningDiagnostic ? "animate-spin" : ""}`} />
            <span>{isRunningDiagnostic ? "Analizando componentes..." : "Ejecutar Diagnóstico de Salud"}</span>
          </button>
        </div>

        {/* Resultado del Diagnóstico */}
        {healthDiagnostic ? (
          <div className="space-y-4">
            {/* Score Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                healthDiagnostic.status === "excelente"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                  : healthDiagnostic.status === "bueno"
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-rose-50/80 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                    healthDiagnostic.status === "excelente"
                      ? "bg-emerald-600 shadow-emerald-500/20"
                      : healthDiagnostic.status === "bueno"
                      ? "bg-amber-600 shadow-amber-500/20"
                      : "bg-rose-600 shadow-rose-500/20"
                  }`}
                >
                  {healthDiagnostic.score}%
                </div>
                <div>
                  <h4 className="font-black text-sm capitalize">
                    Salud del Sistema: {healthDiagnostic.status}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {healthDiagnostic.score === 100
                      ? "Tu computadora está 100% blindada contra caídas de red o fallas de módem."
                      : "El sistema opera normalmente con precauciones locales activadas."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 border border-stone-200">
                  5/5 Pruebas Realizadas
                </span>
              </div>
            </div>

            {/* Lista de los 5 Chequeos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {healthDiagnostic.checks.map((check, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-black text-stone-900">{check.title}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{check.description}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${
                      check.passed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {check.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs text-stone-600 font-medium">
              Haz clic en <strong>"Ejecutar Diagnóstico de Salud"</strong> para comprobar que tu catálogo de panes, clientes y servicio fuera de línea estén listos en esta computadora.
            </p>
          </div>
        )}
      </div>

      {/* ─── 4. DATOS DESCARGADOS EN ESTA COMPUTADORA Y HOJA DE CONTINGENCIA ── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-brito-orange-500" />
              <h3 className="font-black text-base text-stone-900">
                Catálogo Descargado en PC y Respaldo Físico
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              El sistema guarda el catálogo de panes, clientes y precios en el disco de tu PC para cobrar 100% sin internet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSheet}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Imprimir lista física de precios para contingencia extrema de luz"
            >
              <Printer className="w-4 h-4 text-amber-700" />
              <span>Hoja de Contingencia</span>
            </button>

            <button
              onClick={handleDownloadAllData}
              disabled={isDownloadingData}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isDownloadingData ? "animate-bounce" : ""}`} />
              <span>{isDownloadingData ? "Descargando..." : "Descargar / Actualizar en PC"}</span>
            </button>
          </div>
        </div>

        {/* Resumen del Almacenamiento en esta Computadora */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Catálogo de Panes</span>
            <span className="text-xl font-black text-amber-950 mt-0.5 block">{localStats.productsCount}</span>
            <span className="text-[10px] text-amber-700 font-medium">productos en disco</span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-center">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Directorio Clientes</span>
            <span className="text-xl font-black text-blue-950 mt-0.5 block">{localStats.customersCount}</span>
            <span className="text-[10px] text-blue-700 font-medium">clientes en memoria</span>
          </div>

          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 text-center">
            <span className="text-[10px] font-bold text-purple-800 uppercase block">Sucursales Activas</span>
            <span className="text-xl font-black text-purple-950 mt-0.5 block">{localStats.branchesCount}</span>
            <span className="text-[10px] text-purple-700 font-medium">tiendas enlazadas</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/70 text-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Espacio en Disco</span>
            <span className="text-xl font-black text-emerald-950 mt-0.5 block">~{localStats.totalSizeKb} KB</span>
            <span className="text-[10px] text-emerald-700 font-medium">almacenamiento seguro</span>
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <strong>Tu computadora ya tiene todos los datos necesarios:</strong> Aunque se corte la energía del módem o no haya señal de internet, el Punto de Venta seguirá permitiéndote cobrar bolillos, conchas, pasteles, abrir turnos y dar tickets sin interrupción.
          </div>
        </div>
      </div>

      {/* ─── 5. FIJAR COMO PROGRAMA INSTALADO EN LA BARRA DE TAREAS ──────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-brito-orange-500" />
            <h3 className="font-black text-base text-stone-900">
              Fijar como Programa Instalado en la Barra de Tareas de Windows
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Convierte Panadería Brito en un programa de escritorio independiente con su propio icono en la barra de tareas de Windows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Opción 1: Instalar Aplicación de Escritorio */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 text-white flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black uppercase">
                  Acceso con 1 Clic
                </span>
                {isInstalledPwa && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Instalada
                  </span>
                )}
              </div>
              <h4 className="font-black text-base text-white">Instalar en esta Computadora</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Abre Panadería Brito en su propia ventana de aplicación (sin barras de navegador ni pestañas) para dar apariencia 100% profesional de caja registradora.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>{isInstalledPwa ? "Volver a Abrir como Programa" : "Instalar Programa en Windows"}</span>
              </button>

              <button
                onClick={() => downloadPinScript()}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Acceso Directo de Escritorio (.bat)</span>
              </button>
            </div>
          </div>

          {/* Guía Paso a Paso para Anclar a la Barra de Tareas */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-3">
            <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📌</span> ¿Cómo anclarlo a la barra de tareas de Windows?
            </h4>

            <ol className="space-y-2 text-xs text-stone-700 list-decimal list-inside font-medium leading-relaxed">
              <li>
                Haz clic en el botón <strong>"Instalar Programa en Windows"</strong> (o abre el acceso directo).
              </li>
              <li>
                Se abrirá la ventana dedicada de <strong>Panadería Brito</strong>.
              </li>
              <li>
                En la barra inferior de Windows, haz <strong>CLIC DERECHO</strong> sobre el icono de Panadería Brito.
              </li>
              <li>
                Selecciona la opción con tachuela: <strong>"Anclar a la barra de tareas" (Pin to taskbar)</strong>.
              </li>
              <li>
                <strong>¡Listo!</strong> El sistema quedará fijado para siempre junto a tus programas principales.
              </li>
            </ol>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-bold">
              💡 Podrás iniciarlo todos los días directamente desde la barra inferior, aun si no hay internet en la panadería.
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. BANDEJA DE DATOS PENDIENTES DE SINCRONIZACIÓN (COLA) ──────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-brito-orange-500" />
              <h3 className="font-black text-base text-stone-900">
                Cola Local de Sincronización ({pendingCount})
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Transacciones resguardadas de forma segura en esta computadora que se enviarán a la base de datos en la nube.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportBackup}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar copia de seguridad en archivo JSON por precaución"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Respaldo JSON</span>
            </button>

            {queue.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("¿Deseas vaciar la cola local?")) {
                    clearQueue();
                    showToast("Cola local vaciada.", "info");
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Cola</span>
              </button>
            )}
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-black text-sm text-stone-800">Todo Sincronizado</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Excelente. Todas las ventas, cobros y movimientos de caja están 100% resguardados en el servidor en la nube.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-600 font-bold uppercase text-[10px] tracking-wider rounded-xl">
                <tr>
                  <th className="p-3 rounded-l-xl">Tipo</th>
                  <th className="p-3">Detalle / ID</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Hora Local</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 rounded-r-xl text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {queue.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-all">
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.type === "sale"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.type === "expense"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.type === "sale" ? "Venta POS" : item.type === "expense" ? "Gasto Caja" : item.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{item.title}</div>
                      {item.error && <span className="text-[10px] text-amber-700 font-normal">{item.error}</span>}
                    </td>
                    <td className="p-3 font-bold text-stone-900">
                      {item.amount !== undefined ? formatCurrency(item.amount) : "-"}
                    </td>
                    <td className="p-3 text-stone-500">
                      {new Date(item.createdAt).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          item.status === "failed"
                            ? "bg-amber-100 text-amber-900"
                            : item.status === "syncing"
                            ? "bg-blue-100 text-blue-800 animate-pulse"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "failed"
                          ? `En espera (Intento ${item.attempts})`
                          : item.status === "syncing"
                          ? "Sincronizando..."
                          : "Pendiente de envío"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingQueueItem(item)}
                          className="text-stone-500 hover:text-stone-900 p-1.5 hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                          title="Inspeccionar ticket y desglose de venta"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => removeQueueItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar registro de la cola"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 7. MODAL INSPECTOR DE TICKET OFFLINE ─────────────────────────── */}
      {viewingQueueItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden space-y-0">
            {/* Header del Ticket */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-6 h-6" />
                <div>
                  <h4 className="font-black text-base">Inspector de Transacción</h4>
                  <p className="text-[11px] text-amber-100 font-mono">
                    ID: {viewingQueueItem.data?.saleId || viewingQueueItem.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingQueueItem(null)}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Ticket */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-baseline pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Monto Total</span>
                  <div className="text-2xl font-black text-stone-900">
                    {viewingQueueItem.amount !== undefined ? formatCurrency(viewingQueueItem.amount) : "N/A"}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Registrado Local</span>
                  <div className="text-xs font-bold text-stone-700">
                    {new Date(viewingQueueItem.createdAt).toLocaleString("es-MX")}
                  </div>
                </div>
              </div>

              {/* Datos Generales */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Tipo</span>
                  <span className="font-black text-stone-800 capitalize">{viewingQueueItem.type}</span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Cajera / Operador</span>
                  <span className="font-black text-stone-800">
                    {viewingQueueItem.data?.cashier || "Mostrador POS"}
                  </span>
                </div>
              </div>

              {/* Detalle de Productos si es una Venta */}
              {viewingQueueItem.data?.items && Array.isArray(viewingQueueItem.data.items) && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Productos del Ticket ({viewingQueueItem.data.items.length})
                  </span>
                  <div className="border border-stone-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-50 text-stone-500 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 text-left">Pan / Artículo</th>
                          <th className="p-2.5 text-center">Cant.</th>
                          <th className="p-2.5 text-right">P. Unit.</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {viewingQueueItem.data.items.map((prod: any, i: number) => (
                          <tr key={i} className="hover:bg-stone-50/50">
                            <td className="p-2.5 font-bold text-stone-900">{prod.name}</td>
                            <td className="p-2.5 text-center font-bold text-stone-600">{prod.quantity}</td>
                            <td className="p-2.5 text-right text-stone-500">{formatCurrency(prod.price)}</td>
                            <td className="p-2.5 text-right font-black text-stone-900">
                              {formatCurrency(prod.subtotal || prod.price * prod.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payload Técnico Desplegable */}
              <details className="text-xs text-stone-500 bg-stone-50 p-3 rounded-2xl border border-stone-200 cursor-pointer">
                <summary className="font-bold text-stone-700 hover:text-stone-900">
                  Ver Carga Útil Técnica (JSON)
                </summary>
                <pre className="mt-2 p-2 bg-stone-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto">
                  {JSON.stringify(viewingQueueItem.data, null, 2)}
                </pre>
              </details>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                onClick={() => setViewingQueueItem(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                onClick={async () => {
                  setViewingQueueItem(null);
                  await handleSyncNow();
                }}
                disabled={!isOnline || isSyncing}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isOnline
                    ? "bg-stone-900 hover:bg-black text-white cursor-pointer"
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Sincronizar a la Nube Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
