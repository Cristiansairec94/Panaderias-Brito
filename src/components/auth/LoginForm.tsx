"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock, User as UserIcon, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth, getFriendlyName, User } from "@/context/AuthContext";

export default function LoginForm() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Por favor ingresa tu usuario o correo.");
      return;
    }

    if (!password.trim()) {
      setError("Por favor ingresa tu contraseña.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password, rememberMe);
      if (res.success && res.user) {
        // Display personalized welcome message
        setWelcomeUser(res.user);
      } else {
        setError(res.message || "Credenciales incorrectas. Verifica tus datos.");
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] bg-gradient-to-br from-[#141417] via-[#0d0d10] to-[#08080a] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Ambient Glow Backlights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-600/20 via-orange-600/15 to-transparent rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-orange-700/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Box */}
      <div className="max-w-md w-full bg-[#18181c]/90 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {welcomeUser ? (
          /* Personalized Welcome Screen Animation */
          <div className="p-10 text-center space-y-6 animate-in zoom-in-90 fade-in duration-300">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl animate-ping" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/50 border-4 border-amber-300/40 relative z-10 animate-bounce">
                {welcomeUser.avatar || "🥖"}
              </div>
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sesión Iniciada
              </span>
              <h2 className="text-3xl font-black text-white tracking-tight">
                ¡Bienvenido {getFriendlyName(welcomeUser.name)}!
              </h2>
              <p className="text-xs text-stone-400 font-medium max-w-xs mx-auto">
                Cargando tu área de trabajo en <strong className="text-amber-400">Panaderías Brito</strong>...
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          /* Login Form */
          <>
            {/* Header with High-Impact Animated Logo */}
            <div className="pt-9 pb-6 px-8 text-center flex flex-col items-center relative">
              {/* Animated Floating Bakery Logo */}
              <div className="relative mb-3 group cursor-pointer">
                {/* Golden pulsing halo behind logo */}
                <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-600/30 rounded-full blur-xl animate-pulse" />
                <div className="absolute -inset-1 bg-amber-400/20 rounded-full blur-md" />

                {/* Floating Logo Container */}
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-b from-stone-900 via-stone-950 to-black p-3.5 shadow-2xl border-2 border-amber-400/40 flex items-center justify-center transition-all duration-700 hover:scale-110 hover:border-amber-400 animate-brito-float">
                  {/* Subtle sweep shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-3xl pointer-events-none" />
                  <Image
                    src="/logo.png"
                    alt="Panaderías Brito"
                    width={100}
                    height={100}
                    priority
                    unoptimized
                    className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)] select-none pointer-events-none"
                  />
                </div>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mt-1">
                Panaderías Brito
              </h2>
              <p className="text-[11px] text-amber-400/90 font-bold uppercase tracking-widest mt-0.5">
                Ingreso al Sistema
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-8 space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Usuario input */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-stone-300">Usuario</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      autoFocus
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ingresa tu usuario (ej. toño, lupita, juan)"
                      className="w-full pl-10 pr-4 py-3 bg-stone-900/90 rounded-2xl border border-stone-700/80 text-white text-xs font-medium placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Contraseña input */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-stone-300">Contraseña</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3 bg-stone-900/90 rounded-2xl border border-stone-700/80 text-white text-xs font-medium placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 focus:outline-none p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-stone-700 bg-stone-900"
                    />
                    <span className="text-xs text-stone-400 font-medium">Recordar sesión</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-xs rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 tracking-wide uppercase"
                >
                  {isLoading ? "Verificando..." : "Iniciar Sesión"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* CSS Keyframes for smooth continuous floating animation */}
      <style jsx global>{`
        @keyframes britoFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1.5deg);
          }
        }
        .animate-brito-float {
          animation: britoFloat 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
