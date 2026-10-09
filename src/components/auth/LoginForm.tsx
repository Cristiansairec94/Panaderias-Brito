"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User as UserIcon, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth, getFriendlyName, User } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { login, verifyCredentials, getDefaultRouteForUser, canAccessRoute } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  // Seguridad: Control de intentos fallidos y bloqueo temporal anti-fuerza bruta
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("brito_saved_username");
      if (savedUser) {
        setIdentifier(savedUser);
        setRememberMe(true);
      }
      const pendingUrl = sessionStorage.getItem("brito_redirect_url");
      if (pendingUrl && pendingUrl !== "/") {
        setRedirectTarget(pendingUrl);
      }

      // Verificar si existía un bloqueo temporal vigente
      const lockoutUntil = parseInt(sessionStorage.getItem("brito_lockout_until") || "0", 10);
      if (lockoutUntil && lockoutUntil > Date.now()) {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        setLockoutRemaining(remaining);
      }
    }
  }, []);

  // Temporizador para cuenta regresiva del bloqueo temporal
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("brito_lockout_until");
          }
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleLogoClick = () => {
    setIsLogoSpinning(true);
    setTimeout(() => setIsLogoSpinning(false), 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockoutRemaining > 0) {
      setError(`Acceso bloqueado por intentos fallidos. Por favor espera ${lockoutRemaining} segundos.`);
      return;
    }

    if (!identifier.trim()) {
      setError("Por favor escribe tu usuario o correo.");
      return;
    }

    if (!password.trim()) {
      setError("Por favor escribe tu contraseña.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = verifyCredentials(identifier, password);
      if (res.success && res.user) {
        // Restablecer contador de seguridad al acertar credenciales
        setFailedAttempts(0);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("brito_lockout_until");
        }

        setWelcomeUser(res.user);
        const destination = getDefaultRouteForUser(res.user);

        // Mostrar el mensaje de bienvenida y luego ingresar a la app
        setTimeout(() => {
          login(identifier, password, rememberMe);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("brito_session_active", "true");
          }

          // Redirección inteligente: si intentaba entrar a una ruta específica como /pos o /inventario
          let target = destination;
          if (typeof window !== "undefined") {
            const pending = sessionStorage.getItem("brito_redirect_url");
            sessionStorage.removeItem("brito_redirect_url");
            if (pending && pending !== "/") {
              // Solo redirigir si el rol del usuario efectivamente tiene permiso de entrar
              if (!canAccessRoute || canAccessRoute(pending)) {
                target = pending;
              }
            }
          }
          router.push(target);
        }, 1600);
      } else {
        // Incrementar intentos fallidos y activar bloqueo si llega a 5
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 5) {
          const lockoutSeconds = 60;
          const unlockTime = Date.now() + lockoutSeconds * 1000;
          if (typeof window !== "undefined") {
            sessionStorage.setItem("brito_lockout_until", unlockTime.toString());
          }
          setLockoutRemaining(lockoutSeconds);
          setError("Has superado el límite de 5 intentos fallidos. Por seguridad de la panadería, el acceso se ha bloqueado temporalmente durante 60 segundos.");
        } else {
          const left = 5 - nextAttempts;
          setError(`${res.message || "Usuario o contraseña incorrectos."} (${left} ${left === 1 ? "intento restante" : "intentos restantes"} antes del bloqueo temporal).`);
        }
        setIsLoading(false);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#0d0d11] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0d0d11] to-[#070709] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12 relative overflow-hidden select-none">
      {/* Warm Ambient Bakery Lights */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-gradient-to-b from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-700/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[440px] w-full bg-[#16161c]/95 backdrop-blur-2xl rounded-3xl sm:rounded-[40px] shadow-2xl shadow-black/80 overflow-hidden border border-amber-500/20 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {welcomeUser ? (
          /* Personalized Welcome Screen Animation: Bienvenido a la Panaderia de Tono */
          <div className="p-6 sm:p-12 text-center space-y-5 sm:space-y-6 animate-in zoom-in-95 fade-in duration-400">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/40 rounded-full blur-3xl animate-ping" />
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-orange-500/50 border-4 border-amber-300/80 relative z-10 animate-bounce overflow-hidden">
                {welcomeUser.photoUrl || (welcomeUser.avatar && (welcomeUser.avatar.startsWith("data:image") || welcomeUser.avatar.startsWith("http"))) ? (
                  <img src={welcomeUser.photoUrl || welcomeUser.avatar} alt={welcomeUser.name} className="w-full h-full object-cover" />
                ) : (
                  welcomeUser.avatar || "👨‍🍳"
                )}
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <span className="px-3.5 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Acceso Autorizado
              </span>
              
              <h2 className="text-2xl sm:text-4xl font-black text-amber-400 tracking-tight leading-tight">
                ¡Bienvenido a la Panadería de Toño! 🥖
              </h2>
              
              <p className="text-xs sm:text-sm text-stone-200 font-medium max-w-sm mx-auto">
                Hola, <strong className="text-white font-bold">{welcomeUser.name}</strong>. Accediendo al sistema en tiempo real...
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-400/90 tracking-wider uppercase animate-pulse">
                Iniciando sesión...
              </span>
            </div>
          </div>
        ) : (
          /* Interactive & Friendly Login Form */
          <>
            {/* Header with Extra Large Animated Logo (Auto-adjusted for mobile phone and desktop) */}
            <div className="pt-7 sm:pt-10 pb-3 sm:pb-4 px-5 sm:px-8 text-center flex flex-col items-center relative">
              
              {/* Extra Large Animated Floating Bakery Logo */}
              <div 
                className="relative mb-4 sm:mb-5 cursor-pointer group"
                onClick={handleLogoClick}
                title="Haz clic en el logo para hacerlo girar"
              >
                {/* Glowing Pulsing Aura */}
                <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-amber-500/40 via-orange-500/35 to-amber-600/40 rounded-full blur-2xl sm:blur-3xl animate-pulse group-hover:blur-[40px] transition-all" />
                <div className="absolute -inset-2 sm:-inset-3 bg-amber-400/30 rounded-full blur-lg sm:blur-xl" />

                {/* Floating Logo Container */}
                <div className={`relative w-36 h-36 sm:w-56 sm:h-56 rounded-2xl sm:rounded-[36px] bg-white p-2.5 sm:p-3 shadow-2xl shadow-amber-500/25 border-2 sm:border-[3px] border-amber-400/90 flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:border-amber-400 animate-brito-float overflow-hidden ${isLogoSpinning ? "animate-brito-spin" : ""}`}>
                  
                  {/* Subtle golden shimmer sweep */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-200/20 to-transparent rounded-2xl sm:rounded-[36px] pointer-events-none z-10" />
                  
                  <div className="relative w-full h-full flex items-center justify-center p-1 sm:p-2">
                    <Image
                      src="/logo.png"
                      alt="Panaderías Brito"
                      width={220}
                      height={220}
                      priority
                      unoptimized
                      className="w-full h-full object-contain select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Little interactive sparkle tooltip */}
                  <div className="absolute -bottom-2 px-2.5 py-0.5 bg-amber-500 text-stone-950 text-[9px] sm:text-[10px] font-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
                    <Sparkles className="w-3 h-3" /> ¡Gírame!
                  </div>
                </div>
              </div>

              {/* Friendly Welcome Title */}
              <div className="space-y-1 mt-0.5 sm:mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] sm:text-xs font-bold text-amber-300">
                  <span>🥖</span> Panadería Tradicional Brito
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
                  ¡Hola, Bienvenido!
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-400 font-medium max-w-xs mx-auto">
                  Ingresa tu usuario y contraseña para continuar
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="px-5 sm:px-8 pb-8 sm:pb-10 pt-1 sm:pt-2 space-y-3.5 sm:space-y-4">
              {redirectTarget && (
                <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs rounded-2xl font-medium flex items-center gap-2.5 animate-in fade-in duration-200 shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="leading-snug">
                    <strong className="text-white">Seguridad de Acceso:</strong> Por protección de la panadería, debes iniciar sesión en esta ventana para acceder a <span className="text-amber-400 font-bold">{redirectTarget}</span>.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs rounded-2xl font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input: Usuario */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" /> Usuario
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin"
                      className="w-full px-4 py-3 sm:py-3.5 bg-stone-900/90 rounded-2xl border border-stone-700/80 text-white text-base sm:text-xs font-medium placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-400 focus:bg-stone-900 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Input: Contraseña */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="admin"
                      className="w-full pl-4 pr-12 py-3 sm:py-3.5 bg-stone-900/90 rounded-2xl border border-stone-700/80 text-white text-base sm:text-xs font-medium placeholder:text-stone-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-400 focus:bg-stone-900 focus:outline-none transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 focus:outline-none p-1 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember username checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-stone-700 bg-stone-900 cursor-pointer"
                    />
                    <span className="text-xs text-stone-400 font-medium hover:text-stone-300 transition-colors">
                      Recordar mi usuario en este equipo
                    </span>
                  </label>
                </div>

                {/* Big Friendly Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || lockoutRemaining > 0}
                  className={`w-full mt-2 py-3.5 sm:py-4 font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-70 tracking-wide uppercase ${
                    lockoutRemaining > 0
                      ? "bg-stone-800 text-stone-400 border border-rose-500/30 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 shadow-orange-500/30 cursor-pointer"
                  }`}
                >
                  {lockoutRemaining > 0 ? (
                    <span className="flex items-center gap-2 text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Bloqueado temporalmente ({lockoutRemaining}s)</span>
                    </span>
                  ) : isLoading ? (
                    <span>Verificando...</span>
                  ) : (
                    <>
                      <span>Entrar al Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Accesos Rápidos por Perfil de Empleado */}
                <div className="pt-3.5 border-t border-stone-800/80 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-400">Acceso rápido por perfil:</span>
                    <span className="text-[10px] text-amber-400/90 font-medium">Clic para seleccionar</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Silvia Puga", user: "silvia", pass: "1234", branch: "San Ildefonso", avatar: "👩‍💼" },
                      { name: "Don Toño", user: "admin", pass: "admin", branch: "Dueño / Admin", avatar: "👨‍🍳" },
                      { name: "Paulina Brito", user: "paulina", pass: "1234", branch: "Admin General", avatar: "👩‍💼" },
                      { name: "Noé Velásquez", user: "noe", pass: "1234", branch: "San Juan", avatar: "👨‍🍳" },
                      { name: "Cajero Ángeles", user: "angeles", pass: "1234", branch: "Los Ángeles", avatar: "👨‍🍳" },
                      { name: "Andrés Sánchez", user: "andres", pass: "1234", branch: "Los Ángeles", avatar: "👨‍💼" },
                    ].map((demo) => (
                      <button
                        key={demo.user}
                        type="button"
                        onClick={() => {
                          setIdentifier(demo.user);
                          setPassword(demo.pass);
                          setError("");
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          identifier.toLowerCase() === demo.user
                            ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-xs ring-1 ring-amber-400/40"
                            : "bg-stone-900/90 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-white"
                        }`}
                        title={`${demo.name} (${demo.branch}) - Usuario: ${demo.user}, PIN: ${demo.pass}`}
                      >
                        <span>{demo.avatar}</span>
                        <span>{demo.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Smooth Continuous Floating & 3D Spin CSS Animations */}
      <style jsx global>{`
        @keyframes britoFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(1.8deg);
          }
        }
        @keyframes britoSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(1.15);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
        .animate-brito-float {
          animation: britoFloat 3.8s ease-in-out infinite;
        }
        .animate-brito-spin {
          animation: britoSpin 1.1s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
