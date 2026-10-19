"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Camera, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Flashlight, 
  Upload, 
  Barcode as BarcodeIcon, 
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Edit3
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Product } from "@/types";
import { ProductCategory } from "@/lib/products";
import { playScanBeep, formatCurrency } from "@/lib/utils";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: ProductCategory[];
  initialName?: string;
  initialPrice?: string;
  initialCategory?: string;
  onUseCode: (barcode: string) => void;
  onSaveDirect: (productData: {
    barcode: string;
    code: string;
    name: string;
    price: number;
    category: string;
  }) => void;
  onSelectExistingProduct?: (product: Product) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  categories,
  initialName = "",
  initialPrice = "",
  initialCategory = "pan_dulce",
  onUseCode,
  onSaveDirect,
  onSelectExistingProduct,
}: BarcodeScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Scan detection state
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [existingMatch, setExistingMatch] = useState<Product | null>(null);

  // Quick form for direct DB add
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickCategory, setQuickCategory] = useState(initialCategory || "pan_dulce");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = "packaging-barcode-camera-scanner";

  // Pre-fill quick fields when opening
  useEffect(() => {
    if (isOpen) {
      setQuickName(initialName);
      setQuickPrice(initialPrice);
      setQuickCategory(initialCategory || (categories[0]?.id ?? "pan_dulce"));
      setScannedCode(null);
      setExistingMatch(null);
      setCameraError(null);
    }
  }, [isOpen, initialName, initialPrice, initialCategory, categories]);

  // Start scanner when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setCameraError("No se detectó ninguna cámara disponible en tu equipo o celular.");
          return;
        }

        setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Cámara ${d.id}` })));

        // Prefer rear / back camera on mobile phones
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("trasera") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        const chosenCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(chosenCameraId);

        startCameraWithId(chosenCameraId);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Error enumerating cameras:", err);
        setCameraError(
          "No se pudo acceder a la cámara. Por favor verifica que diste permisos de cámara en tu navegador."
        );
      }
    }

    const timer = setTimeout(initCamera, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startCameraWithId = async (cameraId: string) => {
    try {
      setCameraError(null);
      await stopScanner();

      const html5Qr = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = html5Qr;

      await html5Qr.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame error (no barcode in this frame) - normal, ignore
        }
      );

      setIsScanning(true);

      // Check torch support
      try {
        const capabilities: any = html5Qr.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn("startCameraWithId error:", err);
      setIsScanning(false);
      setCameraError(
        "Permiso de cámara bloqueado o cámara en uso por otra app. Puedes subir una foto del código de barras o ingresar el número."
      );
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      // Ignorar si ya estaba detenido
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch error:", err);
    }
  };

  const switchCamera = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    await startCameraWithId(newCameraId);
  };

  // Called when camera decodes a barcode
  const handleBarcodeDetected = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;

    // Beep & vibration feedback
    playScanBeep(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(120);
    }

    setScannedCode(clean);

    // Pause camera scan
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.pause();
      }
    } catch {}

    // Check if product already exists in database/catalog
    const cleanUpper = clean.toUpperCase();
    const cleanDigits = clean.replace(/\D/g, "");

    const match = products.find((p) => {
      const pBarcode = (p.barcode || "").trim().toUpperCase();
      const pCode = (p.code || "").trim().toUpperCase();
      if (pBarcode === cleanUpper || pCode === cleanUpper) return true;
      if (cleanDigits.length >= 6) {
        const pDigits = pBarcode.replace(/\D/g, "");
        if (pDigits === cleanDigits) return true;
      }
      return false;
    });

    if (match) {
      setExistingMatch(match);
    } else {
      setExistingMatch(null);
    }
  };

  // Upload barcode image fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5Qr = scannerRef.current || new Html5Qrcode(readerElementId);
      const res = await html5Qr.scanFileV2(file, false);
      if (res && res.decodedText) {
        handleBarcodeDetected(res.decodedText);
      } else {
        alert("No se detectó ningún código de barras en la imagen. Intenta con otra fotografía más clara.");
      }
    } catch {
      alert("No se pudo leer el código de barras de la imagen. Verifica que el código esté bien enfocado.");
    }
  };

  // Resume camera scanning
  const handleResumeScan = () => {
    setScannedCode(null);
    setExistingMatch(null);
    try {
      if (scannerRef.current) {
        scannerRef.current.resume();
      }
    } catch {}
  };

  // Action 1: Use in existing modal form
  const handleUseCode = () => {
    if (!scannedCode) return;
    onUseCode(scannedCode);
    stopScanner();
    onClose();
  };

  // Action 2: Direct Save to DB
  const handleDirectSave = () => {
    if (!scannedCode) return;
    const finalName = quickName.trim() || `Producto ${scannedCode.slice(-4)}`;
    const finalPrice = Math.max(0, parseFloat(quickPrice) || 0);

    onSaveDirect({
      barcode: scannedCode,
      code: scannedCode,
      name: finalName,
      price: finalPrice,
      category: quickCategory,
    });

    stopScanner();
    onClose();
  };

  // Action 3: Edit existing product found
  const handleSelectExisting = () => {
    if (!existingMatch) return;
    if (onSelectExistingProduct) {
      onSelectExistingProduct(existingMatch);
    }
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-[#2c1810] to-stone-900 text-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-50 leading-tight flex items-center gap-1.5">
                <span>Escanear Código del Empaque</span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-amber-200/80">
                Apunta la cámara al código de barras del producto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar escáner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport & Detection Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-stone-100/60">
          
          {/* Active Camera Box */}
          <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-stone-800 min-h-[240px] flex items-center justify-center">
            
            {/* HTML5 QR Container */}
            <div 
              id={readerElementId} 
              className="w-full h-full min-h-[240px] flex items-center justify-center"
            />

            {/* Target Overlay & Laser guide (Visible while scanning) */}
            {isScanning && !scannedCode && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Visual Target Frame */}
                <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Red Laser Sweep Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce" />
                </div>
                <span className="mt-3 px-3 py-1 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold rounded-full border border-white/20">
                  Centra el código de barras en el recuadro
                </span>
              </div>
            )}

            {/* Camera Controls Bar (Inside camera frame) */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                    torchOn 
                      ? "bg-amber-400 text-stone-950 font-bold shadow-lg" 
                      : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                  title={torchOn ? "Apagar linterna" : "Encender linterna"}
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
                    const nextIndex = (currentIndex + 1) % cameras.length;
                    switchCamera(cameras[nextIndex].id);
                  }}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                  title="Cambiar de cámara"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="absolute inset-0 bg-stone-900/90 text-stone-100 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-xs font-bold max-w-xs">{cameraError}</p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => startCameraWithId(selectedCameraId || "")}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black rounded-xl transition-all"
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input for barcode image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* RESULT CARD: When a barcode has been detected */}
          {scannedCode && (
            <div className="p-4 bg-white rounded-2xl border-2 border-emerald-400 shadow-md space-y-3 animate-in zoom-in-95 duration-200">
              
              {/* Barcode number tag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black">
                    ✓
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      ¡Código Escaneado con Éxito!
                    </span>
                    <span className="font-mono text-sm sm:text-base font-black text-stone-900 tracking-wider">
                      {scannedCode}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResumeScan}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Volver a escanear"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Escanear otro</span>
                </button>
              </div>

              {/* CASE A: Product Already Exists in Database */}
              {existingMatch ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Este producto ya existe en la base de datos</span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {formatCurrency(existingMatch.price)}
                    </span>
                  </div>

                  <div className="text-xs text-stone-800 pl-5 space-y-0.5">
                    <p className="font-bold">{existingMatch.icon} {existingMatch.name}</p>
                    <p className="text-[11px] text-stone-600">
                      Categoría: {categories.find((c) => c.id === existingMatch.category)?.label || existingMatch.category}
                      {existingMatch.stock !== undefined && ` • Stock: ${existingMatch.stock}`}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleSelectExisting}
                      className="flex-1 py-2 px-3 bg-[#3e2723] hover:bg-[#2c1810] active:scale-95 text-amber-50 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cargar y Editar este Producto</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseCode}
                      className="py-2 px-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Usar Código
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE B: New Barcode (Add directly to DB or Use in Form) */
                <div className="space-y-3 pt-1 border-t border-stone-100">
                  <p className="text-xs font-bold text-stone-700">
                    Producto nuevo detectado. Puedes guardarlo directamente en la base de datos o transferir el código al formulario:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                        Nombre del Producto *
                      </label>
                      <input
                        type="text"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        placeholder="ej. Pan Blanco Bimbo, Leche 1L"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                          Precio ($ MXN)
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          value={quickPrice}
                          onChange={(e) => setQuickPrice(e.target.value)}
                          placeholder="15.00"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                          Categoría
                        </label>
                        <select
                          value={quickCategory}
                          onChange={(e) => setQuickCategory(e.target.value)}
                          className="w-full px-2 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none truncate"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleDirectSave}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25"
                    >
                      <Database className="w-4 h-4" />
                      <span>Guardar Directo en Base de Datos</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUseCode}
                      className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Usar en Formulario</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick upload or manual option */}
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-stone-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              <span>¿No enfoca? Sube foto del empaque</span>
            </button>

            <span className="text-[11px] text-stone-400">
              Compatible con celular y PC
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-500 font-medium">
            Formatos: EAN-13, UPC, Code-128
          </span>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
