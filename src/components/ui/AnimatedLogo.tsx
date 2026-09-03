"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface AnimatedLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
  compact?: boolean;
}

export default function AnimatedLogo({
  size = 54,
  className = "",
  showGlow = true,
  compact = false,
}: AnimatedLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);

  // Auto 3D spin every 25 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      triggerSpin();
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  const triggerSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSparkleVisible(true);
    setTimeout(() => setIsSpinning(false), 1600);
    setTimeout(() => setSparkleVisible(false), 2200);
  };

  const currentSize = compact ? 38 : size;

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group perspective-1000 ${className}`}
      onClick={triggerSpin}
      title="Panadería Brito • Clic para girar"
      style={{ perspective: "1000px" }}
    >
      {/* 1. Brand Dual Glow (Orange on top, Crimson Rose on bottom, matching logo) */}
      {showGlow && (
        <>
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-700 blur-xl opacity-60 group-hover:opacity-90 -top-1"
            style={{
              width: currentSize * 1.5,
              height: currentSize * 0.9,
              background: "radial-gradient(ellipse, rgba(249, 115, 22, 0.45) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-700 blur-xl opacity-60 group-hover:opacity-90 -bottom-1"
            style={{
              width: currentSize * 1.5,
              height: currentSize * 0.9,
              background: "radial-gradient(ellipse, rgba(225, 29, 72, 0.45) 0%, transparent 70%)",
            }}
          />
        </>
      )}

      {/* 2. Modern Dual-Gradient Border Squircle */}
      <div
        className={`relative p-[2px] rounded-2xl bg-gradient-to-b from-[#f97316] via-[#fb7185] to-[#e11d48] shadow-lg shadow-rose-950/40 transition-all duration-500 ease-out ${
          isSpinning ? "animate-brito-3d-spin" : "group-hover:scale-105 group-hover:shadow-orange-500/25"
        }`}
        style={{
          width: currentSize,
          height: currentSize,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 3. Pure White High-Contrast Badge Base */}
        <div className="relative w-full h-full rounded-[14px] bg-white p-1 flex items-center justify-center overflow-hidden shadow-inner">
          {/* Periodic Glass Sweep Sheen */}
          <div className="absolute inset-0 -translate-x-[160%] group-hover:translate-x-[160%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-0 animate-periodic-sheen pointer-events-none z-10" />

          {/* Clean Original HD Logo Image */}
          <div className="relative w-full h-full flex items-center justify-center z-10">
            <Image
              src="/logo.png"
              alt="Panadería Brito"
              width={currentSize * 2}
              height={currentSize * 2}
              className="w-full h-full object-contain select-none pointer-events-none"
              priority
              unoptimized
            />
          </div>

          {/* Dual Sparkle Burst */}
          {sparkleVisible && (
            <>
              <div className="absolute top-1 right-1 text-orange-500 animate-ping z-30 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="absolute bottom-1 left-1 text-rose-500 animate-pulse z-30 pointer-events-none">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3D Spin & Sheen Keyframes */}
      <style jsx global>{`
        @keyframes britoModernSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          30% {
            transform: rotateY(180deg) scale(1.1);
          }
          70% {
            transform: rotateY(360deg) scale(1.05);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
        .animate-brito-3d-spin {
          animation: britoModernSpin 1.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes periodicSheen {
          0%, 82% {
            opacity: 0;
            transform: translateX(-160%) skewX(-20deg);
          }
          90% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: translateX(180%) skewX(-20deg);
          }
        }
        .animate-periodic-sheen {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.9) 50%,
            transparent 100%
          );
          animation: periodicSheen 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
