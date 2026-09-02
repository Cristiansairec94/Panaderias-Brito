"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface AnimatedLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export default function AnimatedLogo({
  size = 80,
  className = "",
  showGlow = true,
}: AnimatedLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);

  // Trigger spin automatically every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      triggerSpin();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const triggerSpin = () => {
    setIsSpinning(true);
    setSparkleVisible(true);
    setTimeout(() => setIsSpinning(false), 1600);
    setTimeout(() => setSparkleVisible(false), 2000);
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group perspective-1000 ${className}`}
      onClick={triggerSpin}
      title="Panadería Brito • Haz clic para girar"
      style={{ perspective: "1000px" }}
    >
      {/* Ambient Pulsing Glow Aura */}
      {showGlow && (
        <>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-brito-orange-600/30 to-brito-crimson-600/30 blur-xl animate-pulse pointer-events-none" />
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brito-orange-500/20 via-amber-400/20 to-brito-crimson-500/20 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
        </>
      )}

      {/* Main Logo Container with 3D Flip & Shimmer */}
      <div
        className={`relative rounded-2xl bg-white/95 p-2 shadow-2xl border-2 border-amber-300/40 backdrop-blur-sm transition-transform duration-700 ease-out flex items-center justify-center overflow-hidden ${
          isSpinning ? "animate-brito-3d-spin" : "hover:scale-105"
        }`}
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Shimmer Light Reflection Sweep */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

        {/* High Resolution Vector Logo */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Panadería Bakery Brito"
            width={size}
            height={size}
            className="w-full h-full object-contain drop-shadow-md filter saturate-[1.15] contrast-[1.05]"
            priority
          />
        </div>

        {/* Sparkle Particle on Spin */}
        {sparkleVisible && (
          <div className="absolute top-1 right-1 text-amber-500 animate-ping z-30 pointer-events-none">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Floating 3D CSS animation keyframes inline */}
      <style jsx global>{`
        @keyframes brito3dSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          30% {
            transform: rotateY(180deg) scale(1.15);
            box-shadow: 0 20px 25px -5px rgba(234, 88, 12, 0.4);
          }
          60% {
            transform: rotateY(360deg) scale(1.1);
          }
          85% {
            transform: rotateY(360deg) scale(0.98);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
        .animate-brito-3d-spin {
          animation: brito3dSpin 1.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
