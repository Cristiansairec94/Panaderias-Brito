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
  Laptop,
  Check,
  AlertTriangle,
  Send,
  Zap
} from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { formatCurrency } from "@/lib/utils";

export default function OfflineManagement() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    queue,
    lastSyncTime,
    isSimulatedOffline,
    connectionDetail,
    latencyMs,
    canInstallPwa,
    isInstalledPwa,
    promptInstallPwa,
    syncNow,
    removeQueueItem,
    clearQueue,
    toggleSimulateOffline,
    refreshConnection,
    exportBackup,
    preloadCatalog,
  } = useSync();

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSyncNow = async () => {
    try {
      const res = await syncNow();
      if (res.synced > 0) {
        showToast(`¡Sincronización exitosa! Se subieron ${res.synced} registros a la nube.`, "success");
      } else if (res.failed > 0) {
        showToast(`Se encontraron errores al subir ${res.failed} registros. Revisa el detalle.`, "error");
      } else {
        showToast("Todo está al día. No hay registros pendientes por subir.", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Error al sincronizar con la nube", "error");
    }
  };

  const handleInstallClick = async () => {
    const success = await promptInstallPwa();
    if (success) {
      showToast("¡Panadería Brito se instaló como aplicación de escritorio!", "success");
    } else {
      showToast("Abre el menú de tu navegador (Edge/Chrome) y selecciona 'Instalar Panadería Brito'", "info");
    }
  };

  const handlePreloadCatalog = async () => {
    setIsPreloading(true);
    try {
      const res = await preloadCatalog();
      if (res.success) {
        showToast(res.message, "success");
      } else {
        showToast(res.message, "error");
      }
    } finally {
      setIsPreloading(false);
    }
  };

  // Crear archivo de acceso directo .url para descargar
  const handleDownloadDesktopShortcut = () => {
    const urlContent = `[InternetShortcut]\nURL=${window.location.origin}/pos\nIconIndex=0\nIconFile=${window.location.origin}/logo.png\n`;
    const blob = new Blob([urlContent], { type: "application/internet-shortcut" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Panaderia_Brito_POS.url";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Acceso directo de escritorio generado con éxito.", "success");
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Sin sincronizar aún";

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
            feedbackMsg.type === "success"
              ? "bg-emerald-600 text-white"
              : feedbackMsg.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-stone-900 text-stone-100"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {feedbackMsg.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedbackMsg.type === "info" && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-white/80 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ─── 1. TARJETA PRINCIPAL DE ESTADO DE CONEXIÓN ──────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                isOnline ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" : "bg-gradient-to-br from-rose-500 to-amber-600 shadow-rose-500/20"
              }`}
            >
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-stone-900">
                  {isOnline ? "Modo En Línea (Conectado a la Nube)" : "Modo Fuera de Línea Seguro (Offline)"}
                </h3>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isOnline ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse"
                  }`}
                >
                  {isOnline ? "En Línea" : "Sin Internet"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{connectionDetail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshConnection}
              className="px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Verificar conexión a internet ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Verificar Red</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !isOnline}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                isOnline
                  ? "bg-stone-900 hover:bg-stone-800 text-white active:scale-95"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-amber-400" : ""}`} />
              <span>{isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}</span>
            </button>
          </div>
        </div>

        {/* Datos clave de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
              Registros Pendientes de Subir
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black ${
                  pendingCount > 0 ? "text-amber-600 animate-pulse" : "text-stone-900"
                }`}
              >
                {pendingCount}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {pendingCount === 1 ? "registro local" : "registros locales"}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {pendingCount > 0
                ? "Se sincronizarán automáticamente al haber internet."
                : "Todos los datos están sincronizados en la nube."}
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
              Última Sincronización Exitosa
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="text-base font-black text-stone-900">{formattedLastSync}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {latencyMs !== undefined ? `Latencia a base de datos: ${latencyMs} ms` : "Monitoreo activo"}
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
                Simulación de Corte de Red
              </span>
              <p className="text-[11px] text-stone-500 mt-1">
                Prueba el funcionamiento del POS sin desconectar cables de la computadora.
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-xs font-bold text-stone-700">Modo Offline Forzado:</span>
              <button
                onClick={toggleSimulateOffline}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                  isSimulatedOffline
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                }`}
              >
                {isSimulatedOffline ? "Activado (Offline)" : "Desactivado (Normal)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. INSTALACIÓN Y DESCARGA EN LA PC ───────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-brito-orange-500" />
            <h3 className="font-black text-base text-stone-900">Descargar e Instalar en la Computadora (PC)</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Convierte el sistema en una aplicación de escritorio independiente con su propio icono de Windows para operar sin navegador visible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opción 1: Instalación PWA (Recomendada) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/60 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-black uppercase">
                  Recomendada
                </span>
                {isInstalledPwa ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    <Check className="w-3.5 h-3.5" /> Instalada en esta PC
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-stone-500">App de Escritorio</span>
                )}
              </div>
              <h4 className="font-black text-sm text-stone-900">Instalar como Aplicación Nativa (PWA)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Crea un acceso directo en el <strong>Escritorio y Menú Inicio de Windows</strong>. Se abre en una ventana limpia sin barras de navegación, arranca al instante y almacena los datos de forma local.
              </p>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              <span>{isInstalledPwa ? "Volver a Abrir Aplicación" : "Instalar en esta PC (1 Clic)"}</span>
            </button>
          </div>

          {/* Opción 2: Acceso Directo y Lanzador Local */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black uppercase">
                  Acceso Rápido
                </span>
                <span className="text-[11px] font-bold text-stone-500">Windows (.URL)</span>
              </div>
              <h4 className="font-black text-sm text-stone-900">Acceso Directo al Punto de Venta</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Descarga un acceso directo preconfigurado para colocar en el escritorio de la caja registradora o utiliza el lanzador <code>PanaderiaBrito.exe</code> incluido en la carpeta del sistema.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDesktopShortcut}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>Descargar Acceso Directo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guía de instalación rápida */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-2">
          <div className="flex items-center gap-2 font-black text-stone-900">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>¿Cómo funciona el sistema cuando se va el internet?</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-stone-600 ml-1">
            <li>
              <strong>Cobro continuo sin interrupción:</strong> El cajero puede seguir cobrando panes, pasteles y registrando clientes aunque se desconecte el cable o el módem falle.
            </li>
            <li>
              <strong>Impresión normal de tickets:</strong> La impresora térmica local sigue funcionando porque la comunicación es directa con la PC.
            </li>
            <li>
              <strong>Cola de sincronización segura:</strong> Cada ticket se guarda en la memoria interna de la máquina con su fecha y monto exacto.
            </li>
            <li>
              <strong>Sincronización automática:</strong> En cuanto la computadora detecta señal de internet, el sistema sube silenciosamente todas las ventas acumuladas a la base de datos central sin duplicar nada.
            </li>
          </ol>
        </div>
      </div>

      {/* ─── 3. BANDEJA DE DATOS PENDIENTES DE SINCRONIZAR (COLA) ─────────── */}
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
              Transacciones guardadas en el disco de esta computadora a la espera de ser transmitidas a la base de datos en la nube.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportBackup}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Descargar copia de seguridad en archivo JSON por precaución"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Respaldo JSON</span>
            </button>

            {queue.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("¿Estás seguro de vaciar la cola local? Si no se han sincronizado, los registros podrían perderse.")) {
                    clearQueue();
                    showToast("Cola local vaciada.", "info");
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all"
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
            <h4 className="font-black text-sm text-stone-800">Cola de Sincronización Vacía</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Excelente. Todas las ventas, cobros y movimientos de caja de esta sucursal están 100% sincronizados con el servidor en la nube.
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
                  <th className="p-3 rounded-r-xl text-right">Acción</th>
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
                      {item.error && <span className="text-[10px] text-rose-600 font-normal">{item.error}</span>}
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.status === "failed"
                            ? "bg-rose-100 text-rose-700"
                            : item.status === "syncing"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "failed"
                          ? `Falló (Intento ${item.attempts})`
                          : item.status === "syncing"
                          ? "Sincronizando..."
                          : "Pendiente de envío"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => removeQueueItem(item.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-all"
                        title="Eliminar registro de la cola"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. RESGUARDO Y PRECARGA DE DATOS LOCALES ─────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-brito-orange-500" />
            <h3 className="font-black text-base text-stone-900">Mantenimiento de Datos Locales</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Optimiza la memoria de esta computadora para garantizar que todos los panes, pasteles y clientes estén disponibles cuando no haya señal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
          <div>
            <h4 className="font-black text-xs text-stone-900">Precargar Todo el Catálogo a Memoria Local</h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Descarga la lista de panes, precios actualizados y existencias para que la caja no requiera consultar la nube al abrir turnos.
            </p>
          </div>

          <button
            onClick={handlePreloadCatalog}
            disabled={isPreloading || !isOnline}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
              isOnline
                ? "bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-sm active:scale-95"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPreloading ? "animate-spin" : ""}`} />
            <span>{isPreloading ? "Descargando..." : "Descargar Catálogo a PC"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
