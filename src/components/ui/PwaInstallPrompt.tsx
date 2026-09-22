"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Sparkles, Smartphone, Check } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detect if already installed / running standalone
    const isRunningStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // Check if dismissed in this session
    const hasDismissed = sessionStorage.getItem("brito_pwa_dismissed");
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On iOS, show prompt after a short delay if on mobile
    if (isIosDevice && !isRunningStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("brito_pwa_dismissed", "true");
    } catch (e) {}
  };

  // Don't show if already installed as app or dismissed
  if (isStandalone || !showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#090a0f]/95 backdrop-blur-xl border border-orange-500/40 text-stone-100 p-4 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex flex-col gap-3 relative">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Header */}
        <div className="flex items-center gap-3 pr-6">
          <div className="relative w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 shadow-md shadow-orange-500/30 shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] p-1 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Panadería Brito Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                App para Teléfonos
              </span>
            </div>
            <h4 className="text-sm font-black text-white leading-tight mt-0.5">
              Instalar Panadería Brito
            </h4>
            <p className="text-[11px] text-stone-400 leading-tight">
              Úsala como app nativa en tu pantalla de inicio
            </p>
          </div>
        </div>

        {/* Instructions / Action Button */}
        {isIOS ? (
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs space-y-1.5">
            <p className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Para instalar en tu iPhone:
            </p>
            <ol className="text-[11px] text-stone-300 space-y-1 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <span>Toca el botón <strong>Compartir</strong> (<Share className="w-3 h-3 inline mx-0.5 text-blue-400" />) en Safari</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-stone-800 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <span>Elige <strong>&quot;Agregar a pantalla de inicio&quot;</strong> (<PlusSquare className="w-3 h-3 inline mx-0.5 text-emerald-400" />)</span>
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> Instalar App en mi Teléfono
          </button>
        ) : (
          <div className="p-2.5 rounded-2xl bg-white/[0.04] text-[11px] text-stone-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Disponible para agregar a la pantalla de inicio desde el menú de tu navegador.</span>
          </div>
        )}
      </div>
    </div>
  );
}
