"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Error global en aplicación:", error);
  }, [error]);

  const handleClearCacheAndReload = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("brito_pos_current_sales");
        localStorage.removeItem("brito_pos_current_expenses");
        localStorage.removeItem("brito_pos_current_incomes");
        sessionStorage.clear();
      } catch (e) {}
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
            Panadería Brito
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Algo salió mal al cargar esta pantalla
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Ocurrió un error inesperado al mostrar la información. Puedes reintentar o volver al inicio.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Inicio</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-stone-100 space-y-2">
          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="w-full py-2 px-3 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar datos temporales y recargar</span>
          </button>

          {error && (
            <div>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] text-stone-400 hover:text-stone-600 font-semibold flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <span>{showDetails ? "Ocultar detalle técnico" : "Ver detalle técnico"}</span>
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showDetails && (
                <div className="mt-2 text-left p-3 bg-stone-50 rounded-xl border border-stone-200 text-[10px] text-rose-700 font-mono break-all max-h-36 overflow-y-auto">
                  <p className="font-bold">{error.name}: {error.message}</p>
                  {error.digest && <p className="text-stone-400 text-[9px] mt-1">Digest: {error.digest}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
