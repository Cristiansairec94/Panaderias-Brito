"use client";

import { useState } from "react";
import { Lock, Mail, ArrowRight, Sparkles, Eye, EyeOff, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";
import AnimatedLogo from "@/components/ui/AnimatedLogo";

export default function LoginForm() {
  const { login, loginAs } = useAuth();
  const [email, setEmail] = useState("admin@panaderiabrito.com");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password, rememberMe);
      if (!res.success) {
        setError(res.message || "Credenciales no válidas. Verifica tu correo y contraseña.");
        setIsLoading(false);
      }
    }, 250);
  };

  const handleQuickSelect = (demo: User) => {
    setEmail(demo.email);
    setPassword(demo.password || "");
    setError("");
    loginAs(demo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brito-orange-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brito-crimson-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100/20 relative z-10 animate-in fade-in zoom-in-95 duration-300 my-6">
        {/* Brand Header */}
        <div className="p-7 text-center bg-gradient-to-b from-amber-50/90 via-stone-50/50 to-white border-b border-stone-100 flex flex-col items-center">
          <div className="mb-2.5">
            <AnimatedLogo size={105} />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Panaderías Brito</h2>
          <p className="text-xs text-stone-500 font-semibold mt-1">
            Sistema de Gestión, Punto de Venta & Producción (ERP)
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200/60 text-[11px] font-bold text-amber-900">
            <ShieldCheck className="w-3.5 h-3.5 text-brito-orange-600" />
            <span>Acceso Seguro con Control de Roles</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  <p className="text-[10px] text-rose-600 font-normal mt-0.5">
                    Puedes hacer clic en uno de los accesos rápidos por rol abajo.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@panaderiabrito.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-brito-orange-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Contraseña</label>
                <span className="text-[10px] text-stone-400 font-medium">Demo: admin, caja, pan, super</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-brito-orange-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-brito-orange-600 focus:ring-brito-orange-500 border-stone-300"
                />
                <span className="text-xs text-stone-600 font-medium">Recordar mi sesión en este equipo</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brito-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access by Role Selector */}
          <div className="pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brito-orange-500" /> Acceso Rápido por Rol (1-Clic):
              </span>
              <span className="text-[10px] text-stone-400 font-semibold">Selecciona un usuario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_USERS.map((demo) => {
                const getRoleColor = (role: string) => {
                  switch (role) {
                    case "admin":
                      return "border-amber-200 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-50";
                    case "cajero":
                      return "border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50";
                    case "panadero":
                      return "border-orange-200 hover:border-orange-400 bg-orange-50/50 hover:bg-orange-50";
                    case "supervisor":
                      return "border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50";
                    default:
                      return "border-stone-200 hover:border-stone-400 bg-stone-50";
                  }
                };

                const getPermissionsSummary = (role: string) => {
                  switch (role) {
                    case "admin":
                      return "Acceso Total a todos los módulos y balances";
                    case "cajero":
                      return "Punto de Venta, Caja, Pedidos y Clientes";
                    case "panadero":
                      return "Inventario, Recetas y Pedidos de Horno";
                    case "supervisor":
                      return "Operaciones, Turnos, Insumos y Reportes";
                    default:
                      return "";
                  }
                };

                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickSelect(demo)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all text-left group active:scale-95 ${getRoleColor(demo.role)}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-stone-200/80 flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      {demo.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-stone-900 truncate">{demo.name}</p>
                      </div>
                      <p className="text-[10px] font-bold text-brito-orange-700">{demo.roleLabel}</p>
                      <p className="text-[9px] text-stone-500 line-clamp-1 mt-0.5">{getPermissionsSummary(demo.role)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
