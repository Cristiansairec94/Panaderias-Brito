"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert, 
  Database, 
  Package, 
  ShoppingCart, 
  Users,
  Check
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { realtimeHub } from "@/lib/realtime/realtimeHub";
import { getStoredProducts, markProductIdAsDeleted } from "@/lib/products";
import { getStoredCustomers, markCustomerIdAsDeleted } from "@/lib/customers";

type ResetScope = "sales" | "products" | "customers" | "all";

export default function AdminDataMaintenance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeModal, setActiveModal] = useState<ResetScope | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-stone-700 space-y-2">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
          <h4 className="font-black text-sm text-amber-950">Acceso Restringido a Administradores</h4>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          Las herramientas de mantenimiento de datos y reinicio de registros maestros solo están disponibles para usuarios con el rol de <strong>Administrador</strong>.
        </p>
      </div>
    );
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleExecuteReset = async () => {
    if (!activeModal) return;
    if (confirmInput.trim().toUpperCase() !== "BORRAR") {
      setErrorMessage("Debes escribir la palabra BORRAR en mayúsculas para confirmar.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const scope = activeModal;

      // 1. Limpieza de Ventas, Movimientos y Cortes
      if (scope === "sales" || scope === "all") {
        // LocalStorage keys
        const salesKeys = [
          "brito_pos_master_sales",
          "brito_simulated_sales",
          "brito_pos_current_sales",
          "brito_pos_current_expenses",
          "brito_pos_current_incomes",
          "brito_branch_cash_movements",
          "brito_shift_cuts_history",
          "brito_custom_orders",
          "brito_gastos",
          "brito_cash_incomes",
          "brito_offline_sales",
          "brito_sync_queue",
        ];
        salesKeys.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {}
        });

        // Initialize empty states so no mock data is re-injected
        localStorage.setItem("brito_orders_initialized", "true");
        localStorage.setItem("brito_incomes_initialized", "true");
        localStorage.setItem("brito_gastos_initialized", "true");
        localStorage.setItem("brito_custom_orders", JSON.stringify([]));
        localStorage.setItem("brito_cash_incomes", JSON.stringify([]));
        localStorage.setItem("brito_gastos", JSON.stringify([]));
        localStorage.setItem("brito_pos_master_sales", JSON.stringify([]));
        localStorage.setItem("brito_simulated_sales", JSON.stringify([]));
        localStorage.setItem("brito_branch_cash_movements", JSON.stringify([]));
        localStorage.setItem("brito_shift_cuts_history", JSON.stringify([]));

        // Supabase cleanup if connected
        try {
          await supabase.from("custom_orders").delete().neq("id", "none");
        } catch (e) {
          console.warn("[AdminMaintenance] custom_orders delete note:", e);
        }
        try {
          await supabase.from("cash_movements").delete().neq("id", "none");
        } catch (e) {
          console.warn("[AdminMaintenance] cash_movements delete note:", e);
        }
        try {
          await supabase.from("sales").delete().neq("id", "none");
        } catch (e) {
          console.warn("[AdminMaintenance] sales delete note:", e);
        }
        try {
          await supabase.from("cash_cuts").delete().neq("id", "none");
        } catch (e) {
          console.warn("[AdminMaintenance] cash_cuts delete note:", e);
        }

        // Notify modules
        window.dispatchEvent(new Event("brito_orders_updated"));
        window.dispatchEvent(new Event("brito_incomes_updated"));
        window.dispatchEvent(new Event("brito_gastos_updated"));
        window.dispatchEvent(new Event("brito_sales_updated"));
      }

      // 2. Limpieza de Catálogo de Productos
      if (scope === "products" || scope === "all") {
        const currentProducts = getStoredProducts();
        currentProducts.forEach((p) => {
          markProductIdAsDeleted(p.id);
          try {
            realtimeHub.broadcastProduct("delete", p);
          } catch {}
        });

        localStorage.setItem("brito_catalog_initialized", "true");
        localStorage.setItem("brito_products", JSON.stringify([]));
        localStorage.setItem("brito_custom_products", JSON.stringify([]));
        localStorage.setItem("brito_catalog_cache", JSON.stringify([]));

        try {
          await supabase.from("products").update({ is_active: false }).neq("id", "none");
        } catch (e) {
          console.warn("[AdminMaintenance] products update note:", e);
        }

        window.dispatchEvent(new Event("brito_products_updated"));
      }

      // 3. Limpieza de Clientes
      if (scope === "customers" || scope === "all") {
        const currentCustomers = getStoredCustomers();
        currentCustomers.forEach((c) => {
          if (c.id !== "cli-0") {
            markCustomerIdAsDeleted(c.id);
            try {
              realtimeHub.broadcastCustomer("delete", c);
            } catch {}
          }
        });

        localStorage.setItem("brito_customers_initialized", "true");
        localStorage.setItem("brito_customers", JSON.stringify([]));
        localStorage.setItem("brito_customers_cache", JSON.stringify([]));

        try {
          await supabase.from("customers").update({ is_active: false }).neq("id", "cli-0");
        } catch (e) {
          console.warn("[AdminMaintenance] customers update note:", e);
        }

        window.dispatchEvent(new Event("brito_customers_updated"));
      }

      setActiveModal(null);
      setConfirmInput("");
      
      const successLabels: Record<ResetScope, string> = {
        sales: "Se han eliminado con éxito todas las ventas, órdenes de pedidos y cortes de caja de prueba. El sistema está en ceros.",
        products: "Se ha vaciado el catálogo de productos con éxito. Puedes comenzar a dar de alta tus productos reales.",
        customers: "Se ha limpiado el directorio de clientes con éxito.",
        all: "¡Reinicio completo efectuado con éxito! Se han eliminado ventas, pedidos, catálogo y clientes. El sistema está limpio para producción."
      };

      showSuccess(successLabels[scope]);
    } catch (err: any) {
      console.error("[AdminMaintenance] Error during reset:", err);
      setErrorMessage(err?.message || "Ocurrió un error al ejecutar la limpieza de datos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de Éxito Flotante */}
      {successMessage && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-200" />
          <span className="text-xs sm:text-sm font-black">{successMessage}</span>
        </div>
      )}

      {/* Tarjeta Principal de Mantenimiento */}
      <div className="bg-white p-6 rounded-3xl border-2 border-stone-200 shadow-sm space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                Mantenimiento y Reinicio de Datos (Solo Administrador)
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Elimina registros de prueba para arrancar operaciones desde cero sin peligro de reinyección de datos demo.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Opción 1: Ventas y Cortes */}
          <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900">Ventas y Cortes de Caja</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Elimina ventas del POS, pedidos especiales, ingresos, gastos y cortes de turno acumulados en pruebas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveModal("sales");
                setConfirmInput("");
                setErrorMessage(null);
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-amber-600 hover:text-white border-2 border-stone-300 hover:border-amber-600 text-stone-800 text-xs font-black rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-amber-600" />
              <span>Vaciar Ventas de Prueba</span>
            </button>
          </div>

          {/* Opción 2: Catálogo de Productos */}
          <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black">
                <Package className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900">Catálogo de Productos</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Vacía los productos demo existentes para dar de alta desde cero únicamente tus panes y productos oficiales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveModal("products");
                setConfirmInput("");
                setErrorMessage(null);
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-rose-600 hover:text-white border-2 border-stone-300 hover:border-rose-600 text-stone-800 text-xs font-black rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Vaciar Catálogo de Productos</span>
            </button>
          </div>

          {/* Opción 3: Directorio de Clientes */}
          <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900">Directorio de Clientes</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Vacía la lista de clientes registrados en pruebas para ingresar clientes frecuentes verdaderos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveModal("customers");
                setConfirmInput("");
                setErrorMessage(null);
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-900 hover:text-white border-2 border-stone-300 hover:border-stone-900 text-stone-800 text-xs font-black rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-stone-600" />
              <span>Vaciar Directorio de Clientes</span>
            </button>
          </div>
        </div>

        {/* Botón de Limpieza Integral */}
        <div className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-black text-sm text-rose-950">Reinicio Maestro de Producción (Todo en Cero)</h4>
              <p className="text-xs text-rose-800">
                Limpia ventas, pedidos, catálogo y clientes al mismo tiempo para empezar desde ceros absolutos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveModal("all");
              setConfirmInput("");
              setErrorMessage(null);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Reinicio Maestro Completo</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmación de Seguridad */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 border-2 border-stone-300 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 leading-tight">
                  Confirmación de Seguridad
                </h3>
                <p className="text-xs text-stone-500 font-semibold mt-1">
                  Esta acción es irreversible y afectará a todos los dispositivos conectados.
                </p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <p className="font-bold text-stone-900">
                Se limpiará:{" "}
                <span className="text-rose-600 font-black">
                  {activeModal === "sales" && "Ventas, Cortes y Movimientos de Caja"}
                  {activeModal === "products" && "Catálogo Completo de Productos"}
                  {activeModal === "customers" && "Directorio de Clientes"}
                  {activeModal === "all" && "TODO (Ventas, Catálogo y Clientes)"}
                </span>
              </p>
              <p className="text-stone-500">
                El sistema no reinyectará datos demo y se sincronizará en tiempo real con Supabase y las terminales POS.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-stone-700 block">
                Escribe la palabra <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">BORRAR</span> para confirmar:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Escribe BORRAR"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-stone-300 focus:border-rose-600 font-mono font-black text-sm uppercase focus:outline-none"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setConfirmInput("");
                  setErrorMessage(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isProcessing || confirmInput.trim().toUpperCase() !== "BORRAR"}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpiando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar y Borrar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
