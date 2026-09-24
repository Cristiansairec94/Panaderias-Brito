"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Wallet } from "lucide-react";

export default function GastosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en módulo de Registro de Gastos:", error);
  }, [error]);

  const handleResetData = () => {
    try {
      localStorage.removeItem("brito_gastos_registro");
    } catch (e) {}
    reset();
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase px-3 py-1 bg-rose-100 text-rose-800 rounded-full">
            Módulo de Gastos
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Hubo un problema al cargar los gastos
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Detectamos una inconsistencia en los datos temporales del registro. Puedes reintentar la carga de inmediato.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-stone-400 bg-stone-50 p-2 rounded-xl border border-stone-200 truncate">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar Carga</span>
          </button>

          <button
            type="button"
            onClick={handleResetData}
            className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            title="Restaura los datos demo predeterminados"
          >
            Restaurar Datos
          </button>
        </div>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-4 text-xs font-bold text-stone-500">
          <Link href="/" className="hover:text-amber-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span>•</span>
          <Link href="/caja" className="hover:text-emerald-600 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Caja
          </Link>
        </div>
      </div>
    </div>
  );
}
