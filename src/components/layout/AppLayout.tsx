"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { BranchProvider } from "@/context/BranchContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LoginForm from "@/components/auth/LoginForm";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, canAccessRoute, getDefaultRouteForUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-stone-400 tracking-wider uppercase">
          Cargando Panadería Brito...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const isAllowed = canAccessRoute ? canAccessRoute(pathname) : true;

  return (
    <BranchProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-stone-50/60 text-stone-900 antialiased selection:bg-amber-500 selection:text-stone-950">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
          <Header />
          <main className={`flex-1 ${pathname === "/pos" ? "overflow-hidden p-0" : "overflow-y-auto bg-stone-50/60 p-2.5 sm:p-6 md:p-8"}`}>
            {isAllowed ? (
              children
            ) : (
              <div className="p-8 max-w-2xl mx-auto my-12 text-center bg-white rounded-3xl border border-stone-200 shadow-xl p-10 space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-10 h-10" />
                </div>

                <div>
                  <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Acceso Restringido
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-2">
                    No tienes permisos para este módulo
                  </h3>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed max-w-md mx-auto">
                    Tu usuario <strong className="text-stone-900">{user.name}</strong> ({user.roleLabel}) tiene un perfil de seguridad configurado para acceder únicamente a sus áreas operativas asignadas.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs space-y-2">
                  <p className="font-bold text-stone-700">Módulos habilitados para tu rol:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.role === "cajero" && (
                      <>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px]">Punto de Venta (POS)</span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px]">Caja & Turnos</span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px]">Pedidos Especiales</span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px]">Clientes</span>
                      </>
                    )}
                    {user.role === "panadero" && (
                      <>
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px]">Inventario & Insumos</span>
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px]">Pedidos & Encargos de Horno</span>
                      </>
                    )}
                    {user.role === "supervisor" && (
                      <>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-[11px]">Dashboard Operativo</span>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-[11px]">POS & Caja</span>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-[11px]">Inventario & Insumos</span>
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-[11px]">Reportes del Día</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => router.push(getDefaultRouteForUser ? getDefaultRouteForUser(user) : "/")}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-stone-950 font-black px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/20 text-xs transition-all active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" /> Regresar a Mi Módulo Principal
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
    </BranchProvider>
  );
}
