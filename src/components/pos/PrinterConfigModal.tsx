"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  X,
  Check,
  CheckCircle2,
  RefreshCw,
  Sliders,
  FileText,
  Zap,
  Info,
  ExternalLink,
  Plus,
  Trash2,
  Settings2
} from "lucide-react";
import {
  PrinterConfig,
  PrinterInfo,
  getStoredPrinterConfig,
  saveStoredPrinterConfig,
  getAllPrinters,
  printTestTicket,
  DEFAULT_PRINTER_CONFIG
} from "@/lib/printer";

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchName?: string;
  cashierName?: string;
  onPrinterUpdated?: (config: PrinterConfig) => void;
}

export default function PrinterConfigModal({
  isOpen,
  onClose,
  branchName,
  cashierName,
  onPrinterUpdated,
}: PrinterConfigModalProps) {
  const [config, setConfig] = useState<PrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([]);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPort, setCustomPort] = useState("USB001");
  const [customPaper, setCustomPaper] = useState<"58mm" | "80mm">("58mm");

  // Cargar configuración al abrir
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPrinterConfig();
      setConfig(stored);
      setAvailablePrinters(getAllPrinters(stored));
      setTestSuccess(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPrinter = (printer: PrinterInfo) => {
    setConfig((prev) => ({
      ...prev,
      selectedPrinterId: printer.id,
      selectedPrinterName: printer.name,
      port: printer.port,
      paperWidth: printer.paperWidth || prev.paperWidth,
      status: "connected",
    }));
  };

  const handleSave = () => {
    saveStoredPrinterConfig(config);
    if (onPrinterUpdated) {
      onPrinterUpdated(config);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleTestPrint = () => {
    setIsPrintingTest(true);
    setTestSuccess(false);
    try {
      printTestTicket(config, {
        branchName: branchName || "Panaderías Brito - Matriz",
        cashierName: cashierName || "Cajera en Turno",
      });
      setTimeout(() => {
        setIsPrintingTest(false);
        setTestSuccess(true);
        // Actualizar estado local
        setConfig((prev) => ({
          ...prev,
          lastTestDate: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          status: "connected",
        }));
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsPrintingTest(false);
    }
  };

  const handleAddCustomPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newPrinter: PrinterInfo = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      port: customPort.trim() || "USB",
      type: customPaper === "58mm" ? "thermal_58" : "thermal_80",
      isDefaultInWindows: false,
      description: "Impresora Personalizada agregada por el usuario",
      paperWidth: customPaper,
    };

    const updatedCustom = [...(config.customPrinters || []), newPrinter];
    const updatedConfig = {
      ...config,
      customPrinters: updatedCustom,
      selectedPrinterId: newPrinter.id,
      selectedPrinterName: newPrinter.name,
      port: newPrinter.port,
      paperWidth: newPrinter.paperWidth,
    };

    setConfig(updatedConfig);
    setAvailablePrinters(getAllPrinters(updatedConfig));
    setCustomName("");
    setShowAddCustom(false);
  };

  const handleDeleteCustom = (printerId: string) => {
    const updatedCustom = (config.customPrinters || []).filter((p) => p.id !== printerId);
    let updatedConfig = {
      ...config,
      customPrinters: updatedCustom,
    };

    // Si la impresora borrada estaba seleccionada, volver a POS-58
    if (config.selectedPrinterId === printerId) {
      updatedConfig = {
        ...updatedConfig,
        selectedPrinterId: "pos-58",
        selectedPrinterName: "POS-58",
        port: "USB002",
        paperWidth: "58mm",
      };
    }

    setConfig(updatedConfig);
    setAvailablePrinters(getAllPrinters(updatedConfig));
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] border-2 border-stone-200">
        {/* Cabecera Modal */}
        <div className="bg-neutral-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                  Impresora de Tickets
                </h3>
                <span className="flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectada
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Selecciona la impresora directa para comprobantes de venta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50/50">
          {/* Tarjeta de Estado Activo Resaltada */}
          <div className="bg-white rounded-2xl p-4 border-2 border-amber-400/80 shadow-md shadow-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Impresora Directa Activa en Punto de Venta
                </span>
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-stone-900 text-amber-300">
                {config.paperWidth}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-stone-900">
                    {config.selectedPrinterName}
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                    Puerto: {config.port}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  {config.directPrinting
                    ? "⚡ Modo Kiosko Directo (Impresión instantánea sin cuadro de diálogo)"
                    : "📄 Cuadro de diálogo del sistema activado"}
                </p>
                {config.lastTestDate && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    ✓ Última prueba de impresión: hoy a las {config.lastTestDate}
                  </p>
                )}
              </div>

              {/* Botón Imprimir Prueba */}
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isPrintingTest}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer ${
                  testSuccess
                    ? "bg-emerald-600 text-white"
                    : "bg-white hover:bg-amber-100 text-stone-900 border border-amber-300 hover:border-amber-400"
                }`}
                title="Enviar ticket de prueba a la impresora"
              >
                {isPrintingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Imprimiendo...</span>
                  </>
                ) : testSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Prueba Enviada!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Imprimir Prueba</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Selector de Impresoras Disponibles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-stone-600" />
                <span>Elegir Impresora para Tickets:</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddCustom ? "Cancelar" : "Agregar otra impresora"}</span>
              </button>
            </div>

            {/* Formulario Agregar Impresora Personalizada */}
            {showAddCustom && (
              <form
                onSubmit={handleAddCustomPrinter}
                className="bg-stone-100 p-3.5 rounded-2xl border-2 border-dashed border-stone-300 space-y-3 animate-in fade-in duration-150"
              >
                <p className="text-xs font-black text-stone-800">
                  Agregar impresora instalada en Windows:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej. POS-80 o Epson TM-T20"
                    required
                    className="sm:col-span-2 px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                  <select
                    value={customPaper}
                    onChange={(e) => setCustomPaper(e.target.value as "58mm" | "80mm")}
                    className="px-2 py-2 bg-white rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-amber-600"
                  >
                    <option value="58mm">58 mm</option>
                    <option value="80mm">80 mm</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-xs cursor-pointer"
                  >
                    Guardar Impresora
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Impresoras con Radio Cards */}
            <div className="grid grid-cols-1 gap-2">
              {availablePrinters.map((printer) => {
                const isSelected = config.selectedPrinterName.toLowerCase() === printer.name.toLowerCase();
                const isCustom = printer.id.startsWith("custom-");

                return (
                  <div
                    key={printer.id}
                    onClick={() => handleSelectPrinter(printer)}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/70 shadow-sm ring-1 ring-amber-400"
                        : "border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-stone-400 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-stone-900 truncate">
                            {printer.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {printer.port}
                          </span>
                          {printer.isDefaultInWindows && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              ★ Predeterminada Windows
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800">
                            {printer.paperWidth}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">
                          {printer.description}
                        </p>
                      </div>
                    </div>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustom(printer.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Eliminar impresora personalizada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opciones de Formato y Preferencias */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-stone-600" />
              <span>Preferencias de Impresión:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Selector de Ancho de Papel */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700">Ancho del Rollo Térmico</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, paperWidth: "58mm" })}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      config.paperWidth === "58mm"
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    58 mm (POS-58)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, paperWidth: "80mm" })}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      config.paperWidth === "80mm"
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    80 mm (Ancho)
                  </button>
                </div>
              </div>

              {/* Número de Copias */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700">Copias por Venta</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, copies: 1 })}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      config.copies === 1
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    1 Copia (Cliente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, copies: 2 })}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      config.copies === 2
                        ? "bg-[#2d1810] text-amber-200 border-amber-700 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    2 Copias (Cliente + Caja)
                  </button>
                </div>
              </div>
            </div>

            {/* Checkboxes de Comportamiento */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800">
                <input
                  type="checkbox"
                  checked={config.directPrinting}
                  onChange={(e) => setConfig({ ...config, directPrinting: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <span>Impresión directa silenciosa (Modo Kiosko sin cuadro de confirmación)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800">
                <input
                  type="checkbox"
                  checked={config.autoCut}
                  onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <span>Comando de corte de papel automático al terminar ticket</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800">
                <input
                  type="checkbox"
                  checked={config.openCashDrawer}
                  onChange={(e) => setConfig({ ...config, openCashDrawer: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <span>Apertura de cajón de dinero con pulso RJ11</span>
              </label>
            </div>
          </div>

          {/* Guía Rápida para Modo Kiosko en Windows */}
          <div className="bg-stone-100 p-3.5 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-stone-900">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Consejo de Impresión Silenciosa:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Para imprimir directamente a <strong>{config.selectedPrinterName}</strong> sin que aparezca la ventana de impresión de Windows, puedes abrir el sistema usando el archivo <strong>&ldquo;Iniciar_POS_Impresion_Directa.bat&rdquo;</strong> ubicado en el escritorio.
            </p>
          </div>
        </div>

        {/* Footer con Botones */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            Impresora activa: <span className="font-bold text-stone-800">{config.selectedPrinterName}</span> ({config.port})
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                saveSuccess
                  ? "bg-emerald-600"
                  : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-600/20"
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Impresora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
