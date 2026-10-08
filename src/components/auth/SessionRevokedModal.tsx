"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Laptop, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SessionRevokedModal() {
  const router = useRouter();
  const { revokedSessionInfo, clearRevokedSession } = useAuth();

  if (!revokedSessionInfo) return null;

  const handleAcknowledge = () => {
    clearRevokedSession();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.push("/");
    }
  };

  const deviceName = revokedSessionInfo.deviceName || "Otro equipo o dispositivo";
  const formattedTime = revokedSessionInfo.timestamp
    ? new Date(revokedSessionInfo.timestamp).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Banner superior con alerta */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/30">
            <ShieldAlert className="w-9 h-9 text-white animate-pulse" />
          </div>
          <span className="inline-block text-[11px] font-black uppercase tracking-wider bg-black/25 px-3 py-1 rounded-full text-amber-100 mb-1 border border-white/20">
            Seguridad de Acceso Brito
          </span>
          <h3 className="text-xl font-black tracking-tight text-white">
            Sesión iniciada en otro equipo
          </h3>
        </div>

        {/* Contenido del modal */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-600 leading-relaxed">
            Tu cuenta fue abierta en otro equipo o dispositivo. Por seguridad y control de arqueos de caja, <strong className="text-stone-900">solo se permite una sesión activa a la vez</strong>.
          </p>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <Laptop className="w-4 h-4 text-blue-600" /> Nuevo equipo:
              </span>
              <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs">
                {deviceName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-amber-600" /> Hora del acceso:
              </span>
              <span className="font-semibold text-stone-700">
                {formattedTime}
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-500 italic bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-amber-900">
            💡 Si tú no iniciaste sesión en ese equipo, avisa de inmediato al Administrador para cambiar tu contraseña.
          </p>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>Entendido / Iniciar sesión aquí</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
