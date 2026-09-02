"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { useAuth, DEMO_USERS, User } from "@/context/AuthContext";

export default function LoginForm() {
  const { login, loginAs } = useAuth();
  const [email, setEmail] = useState("admin@panaderiabrito.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (!success) {
      setError("Credenciales no válidas. Prueba con los botones de acceso rápido abajo.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-950 to-black flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 bg-brito-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute w-96 h-96 bg-brito-crimson-600/10 rounded-full blur-3xl pointer-events-none -bottom-10" />

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header with Logo */}
        <div className="p-8 text-center bg-gradient-to-b from-amber-50/80 to-white border-b border-stone-100 flex flex-col items-center">
          <div className="w-28 h-28 relative mb-3 bg-white rounded-3xl p-2 shadow-xl border border-brito-orange-200 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Panaderías Brito Logo"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Panaderías Brito</h2>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Sistema de Gestión, Punto de Venta & Producción
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
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
                  placeholder="usuario@panaderiabrito.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-brito-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-brito-orange-600 to-brito-crimson-600 hover:from-brito-orange-700 hover:to-brito-crimson-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brito-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Iniciar Sesión <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brito-orange-500" /> Acceso Rápido Demo:
              </span>
              <span className="text-[10px] text-stone-400 font-semibold">1-clic</span>
            </div>

            <div className="space-y-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => loginAs(demo)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 hover:border-brito-orange-500 hover:bg-amber-50/50 flex items-center justify-between text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{demo.avatar}</span>
                    <div>
                      <p className="text-xs font-black text-stone-900 group-hover:text-brito-orange-700 transition-colors">
                        {demo.name}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold">{demo.roleLabel}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-brito-orange-600 bg-amber-100/70 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    Entrar →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-100 text-center text-[11px] text-stone-400 font-medium">
          Panadería Bakery Brito © 2026 • Modo Seguro
        </div>
      </div>
    </div>
  );
}
