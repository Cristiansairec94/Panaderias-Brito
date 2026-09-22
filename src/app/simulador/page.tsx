"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Smartphone, 
  RotateCcw, 
  RefreshCw, 
  Bell, 
  Zap, 
  Croissant, 
  Sliders, 
  Store, 
  Receipt, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  CheckCircle2,
  CalendarClock,
  ArrowRight,
  Maximize2,
  Minimize2
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { useBranch } from "@/context/BranchContext";
import { formatCurrency } from "@/lib/utils";

type DeviceModel = "iphone15" | "galaxyS24" | "pixel8" | "compact";

interface DeviceConfig {
  name: string;
  os: "iOS" | "Android";
  width: number;
  height: number;
  borderRadius: string;
  notchType: "dynamic-island" | "punch-hole" | "classic";
  description: string;
}

const DEVICES: Record<DeviceModel, DeviceConfig> = {
  iphone15: {
    name: "iPhone 15 Pro",
    os: "iOS",
    width: 393,
    height: 852,
    borderRadius: "rounded-[52px]",
    notchType: "dynamic-island",
    description: "Resolución estándar iPhone 15 / 14 Pro con Dynamic Island",
  },
  galaxyS24: {
    name: "Samsung Galaxy S24",
    os: "Android",
    width: 360,
    height: 780,
    borderRadius: "rounded-[44px]",
    notchType: "punch-hole",
    description: "Estándar de teléfonos Android modernos Samsung",
  },
  pixel8: {
    name: "Google Pixel 8",
    os: "Android",
    width: 412,
    height: 915,
    borderRadius: "rounded-[48px]",
    notchType: "punch-hole",
    description: "Pantalla amplia con proporción moderna de Google",
  },
  compact: {
    name: "Celular Compacto",
    os: "iOS",
    width: 375,
    height: 667,
    borderRadius: "rounded-[38px]",
    notchType: "classic",
    description: "iPhone SE / pantalla compacta para probar ergonomía",
  },
};

export default function SimuladorPage() {
  const { addNotification } = useNotifications();
  const { simulateSale } = useBranch();

  const [activeDevice, setActiveDevice] = useState<DeviceModel>("iphone15");
  const [currentRoute, setCurrentRoute] = useState<string>("/");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.85);
  const [liveUrl, setLiveUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [testAlert, setTestAlert] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<string>("09:41");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const device = DEVICES[activeDevice];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLiveUrl(window.location.origin);
      
      const updateClock = () => {
        const now = new Date();
        setSimTime(
          now.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );
      };
      updateClock();
      const interval = setInterval(updateClock, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const navigateIframe = (path: string) => {
    setCurrentRoute(path);
    if (iframeRef.current) {
      iframeRef.current.src = path;
    }
  };

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleCopyUrl = () => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const triggerTestNotification = () => {
    const examples = [
      {
        title: "Venta en Mostrador",
        highlightText: "+$245.00 MXN en Efectivo",
        description: "Cobro de 12 conchas y 2 baguettes registrado en Sucursal Centro.",
        badgeIcon: "dinero" as const,
        category: "caja" as const,
        senderName: "Caja Mostrador",
        senderAvatar: "🥖",
      },
      {
        title: "Nuevo Encargo de Pastel",
        highlightText: "Pastel 3 Leches XV Años",
        description: "Anticipo de $500.00 recibido para entrega programada el sábado.",
        badgeIcon: "pastel" as const,
        category: "pedidos" as const,
        senderName: "Pastelería Brito",
        senderAvatar: "🎂",
      },
      {
        title: "Alerta de Horno Terminado",
        highlightText: "Lote de Bolillos Calientes",
        description: "80 bolillos crujientes listos para exhibir en charolas.",
        badgeIcon: "horno" as const,
        category: "produccion" as const,
        senderName: "Horno Principal",
        senderAvatar: "👨‍🍳",
      },
    ];

    const pick = examples[Math.floor(Math.random() * examples.length)];
    addNotification(pick);

    setTestAlert(`🔔 Notificación enviada: ${pick.title}`);
    setTimeout(() => setTestAlert(null), 3000);
  };

  const triggerTestSale = () => {
    const sale = simulateSale();
    setTestAlert(`⚡ Venta simulada: +${formatCurrency(sale.total)} (${sale.branchName})`);
    setTimeout(() => setTestAlert(null), 3000);
  };

  const qrImageUrl = liveUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(liveUrl)}&color=090a0f&bgcolor=ffffff`
    : "";

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-[200] bg-stone-950 p-4 overflow-y-auto" : ""}`}>
      
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 shadow-md shadow-orange-500/25 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-stone-900 tracking-tight">
                Simulador Móvil Interactivo
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black text-[10px] uppercase shadow-xs">
                En Vivo
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Prueba cómo se ve y funciona la app en un teléfono celular real: modifica precios, revisa configuraciones y prueba notificaciones.
            </p>
          </div>
        </div>

        {/* Device Model Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(DEVICES) as DeviceModel[]).map((key) => {
            const dev = DEVICES[key];
            const isSelected = activeDevice === key;

            return (
              <button
                key={key}
                onClick={() => setActiveDevice(key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isSelected
                    ? "bg-stone-900 text-white shadow-md ring-2 ring-orange-500/50 font-black"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                }`}
              >
                <span>{dev.os === "iOS" ? "🍏" : "📱"}</span>
                <span>{dev.name}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Smartphone Frame (Left) + Testing & QR Control Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Realistic Smartphone Mockup */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-2 sm:p-6 bg-stone-900/90 backdrop-blur-md rounded-3xl border border-stone-800 shadow-2xl relative overflow-hidden min-h-[780px]">
          
          {/* Subtle Ambient Glow Behind Phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Quick Info Chip */}
          <div className="mb-4 flex items-center gap-3 text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{device.name}</span>
            </span>
            <span>•</span>
            <span>{device.width} × {device.height} px</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setScale((s) => Math.max(0.65, Number((s - 0.05).toFixed(2))))}
                className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-xs"
                title="Reducir zoom"
              >
                -
              </button>
              <span className="font-mono text-stone-300 w-10 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(1.0, Number((s + 0.05).toFixed(2))))}
                className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-xs"
                title="Aumentar zoom"
              >
                +
              </button>
            </div>
            <button
              onClick={reloadIframe}
              className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
              title="Recargar teléfono simulado"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SMARTPHONE HARDWARE CHASSIS */}
          <div 
            style={{
              width: `${device.width}px`,
              height: `${device.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              marginBottom: `-${device.height * (1 - scale)}px`,
            }}
            className={`relative bg-stone-950 ${device.borderRadius} p-[10px] shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_0_2px_rgba(255,255,255,0.1),0_0_40px_rgba(249,115,22,0.15)] transition-all duration-300 flex flex-col select-none`}
          >
            {/* Outer Hardware Buttons (Side volume/power accents) */}
            <div className="absolute -left-[14px] top-28 w-[4px] h-12 bg-stone-700 rounded-l-md" />
            <div className="absolute -left-[14px] top-44 w-[4px] h-12 bg-stone-700 rounded-l-md" />
            <div className="absolute -right-[14px] top-36 w-[4px] h-16 bg-stone-700 rounded-r-md" />

            {/* SCREEN CONTAINER */}
            <div className={`relative w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col shadow-inner border border-stone-800`}>
              
              {/* TOP STATUS BAR & NOTCH / DYNAMIC ISLAND */}
              <div className="h-11 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between text-[11px] font-bold text-stone-800 shrink-0 z-50 select-none border-b border-stone-100/50">
                {/* Time */}
                <span className="font-semibold text-stone-900 tracking-tight">{simTime}</span>

                {/* Hardware Notch */}
                {device.notchType === "dynamic-island" ? (
                  <div className="w-28 h-6 bg-stone-950 rounded-full flex items-center justify-between px-2.5 shadow-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#181920]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                ) : device.notchType === "punch-hole" ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-stone-950 shadow-inner" />
                ) : (
                  <div className="w-24 h-4 bg-stone-900 rounded-b-xl" />
                )}

                {/* Battery, Wifi & Cellular icons */}
                <div className="flex items-center gap-1.5 text-stone-700">
                  <span className="text-[10px] font-bold text-stone-900">5G</span>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.66-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                  <div className="w-5 h-2.5 border border-stone-800 rounded-xs p-0.5 flex items-center">
                    <div className="w-full h-full bg-emerald-600 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* REAL APP IFRAME */}
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={currentRoute}
                title="Panadería Brito App Celular"
                className="flex-1 w-full h-full border-none bg-stone-50"
                style={{
                  width: "100%",
                  height: "calc(100% - 44px)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Testing Controls, Quick Navigation & Physical Phone QR */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Toast / Alert for Test Triggers */}
          {testAlert && (
            <div className="p-3.5 bg-stone-900 text-emerald-400 text-xs font-black rounded-2xl border border-emerald-500/40 shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{testAlert}</span>
            </div>
          )}

          {/* Card 1: Pruebas en Vivo (Event Triggers) */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-orange-100 text-orange-600">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-stone-900">Batería de Pruebas Móviles</h3>
                  <p className="text-[10px] text-stone-400">Dispara eventos para ver cómo reacciona el celular</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Trigger Notification */}
              <button
                onClick={triggerTestNotification}
                className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 hover:from-amber-500/20 hover:to-rose-500/20 border border-orange-500/30 text-stone-900 text-left active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-2 shadow-sm shadow-orange-500/25 group-hover:scale-110 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
                <p className="text-xs font-black leading-tight text-stone-900">
                  Disparar Notificación
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Prueba sonido de campana y aviso
                </p>
              </button>

              {/* Trigger Sale */}
              <button
                onClick={triggerTestSale}
                className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-stone-900 text-left active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <p className="text-xs font-black leading-tight text-stone-900">
                  Simular Venta
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Genera una venta aleatoria en caja
                </p>
              </button>
            </div>
          </div>

          {/* Card 2: Salto Rápido a Secciones Móviles */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-900">Navegar Pantallas en el Celular</h3>
                <p className="text-[10px] text-stone-400">Verifica la ergonomía de cada vista</p>
              </div>
              <button
                onClick={reloadIframe}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reiniciar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigateIframe("/")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Store className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="truncate">1. Dashboard</span>
              </button>

              <button
                onClick={() => navigateIframe("/productos")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/productos" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Croissant className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">2. Precios (Panes)</span>
              </button>

              <button
                onClick={() => navigateIframe("/configuracion")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/configuracion" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Sliders className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">3. Configuración</span>
              </button>

              <button
                onClick={() => navigateIframe("/caja")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/caja" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">4. Finanzas / Caja</span>
              </button>

              <button
                onClick={() => navigateIframe("/pedidos")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/pedidos" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">5. Pedidos & Pasteles</span>
              </button>

              <button
                onClick={() => navigateIframe("/sucursales")}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                  currentRoute === "/sucursales" 
                    ? "bg-orange-50 border-orange-300 text-orange-950 font-black shadow-xs" 
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700"
                }`}
              >
                <Store className="w-4 h-4 text-stone-600 shrink-0" />
                <span className="truncate">6. Sucursales (3)</span>
              </button>
            </div>
          </div>

          {/* Card 3: Código QR para Probar en tu Teléfono Físico */}
          <div className="bg-gradient-to-br from-[#0c0d12] to-[#181a24] text-white rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Abrir en tu Celular Físico
                </h3>
                <p className="text-[10px] text-stone-400">
                  Escanea con la cámara de tu iPhone o Android
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 rounded-2xl p-3.5 border border-white/10">
              {/* QR Image */}
              {qrImageUrl && (
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg">
                  <img
                    src={qrImageUrl}
                    alt="Código QR Panadería Brito"
                    className="w-28 h-28 object-contain"
                  />
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-2 text-xs flex-1">
                <div className="space-y-1">
                  <p className="font-bold text-amber-300 text-[11px]">
                    Pasos para instalar la App:
                  </p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    1. Abre la <strong>Cámara</strong> de tu teléfono y enfoca este código QR.
                  </p>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    2. En <strong>iPhone</strong> toca <em>Compartir → &quot;Agregar a pantalla de inicio&quot;</em>. En <strong>Android</strong> toca <em>&quot;Instalar App&quot;</em>.
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleCopyUrl}
                    className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Enlace copiado" : "Copiar Enlace"}</span>
                  </button>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Abrir en nueva pestaña</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
