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
  size = 76,
  className = "",
  showGlow = true,
  compact = false,
}: AnimatedLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);

  // Trigger 3D spin automatically every 25 seconds
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
    setTimeout(() => setIsSpinning(false), 1800);
    setTimeout(() => setSparkleVisible(false), 2400);
  };

  const currentSize = compact ? 42 : size;

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group perspective-1000 ${className}`}
      onClick={triggerSpin}
      title="Panaderías Brito • Alta Panadería & Pastelería Fina • Clic para girar"
      style={{ perspective: "1200px" }}
    >
      {/* 1. Golden Luxury Halo / Rotating Conic Aura (Estilo El Globo) */}
      {showGlow && (
        <>
          {/* Ambient warm blur aura */}
          <div
            className="absolute rounded-full pointer-events-none transition-all duration-700 blur-xl opacity-75 group-hover:opacity-100"
            style={{
              width: currentSize * 1.5,
              height: currentSize * 1.5,
              background: "radial-gradient(circle, rgba(212,175,55,0.35) 0%, rgba(194,65,12,0.2) 60%, transparent 80%)",
            }}
          />

          {/* Rotating Conic Gold Ring Shimmer */}
          <div
            className="absolute rounded-full pointer-events-none opacity-40 group-hover:opacity-85 transition-opacity duration-500 animate-spin-slow"
            style={{
              width: currentSize + 12,
              height: currentSize + 12,
              background:
                "conic-gradient(from 0deg, transparent 0deg, #fef08a 60deg, #d4af37 120deg, transparent 180deg, #f59e0b 240deg, #d4af37 300deg, transparent 360deg)",
              filter: "blur(4px)",
            }}
          />
        </>
      )}

      {/* 2. Floating & Breathing Container */}
      <div
        className={`relative transition-all duration-700 ease-out flex items-center justify-center animate-subtle-float ${
          isSpinning ? "animate-brito-3d-spin" : "group-hover:scale-105"
        }`}
      >
        {/* Luxury Outer Bezel / Marco Dorado de Alta Repostería */}
        <div
          className="relative rounded-2xl bg-gradient-to-b from-[#fbf5eb] via-[#ffffff] to-[#f4ebe1] p-1.5 shadow-[0_12px_28px_-6px_rgba(20,10,5,0.6)] border border-[#d4af37]/60 group-hover:border-[#fef08a] transition-colors duration-500 overflow-hidden flex items-center justify-center"
          style={{
            width: currentSize,
            height: currentSize,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Diagonal Glass Reflection Sweep (Sheen Effect) */}
          <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-amber-100/60 to-transparent pointer-events-none z-20" />
          <div className="absolute inset-0 animate-periodic-sheen pointer-events-none z-10" />

          {/* Golden Corner Trim Accents */}
          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-[#d4af37] rounded-tl-sm pointer-events-none opacity-80" />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-[#d4af37] rounded-tr-sm pointer-events-none opacity-80" />
          <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-[#d4af37] rounded-bl-sm pointer-events-none opacity-80" />
          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-[#d4af37] rounded-br-sm pointer-events-none opacity-80" />

          {/* Exact Original HD Logo Artwork */}
          <div className="relative w-full h-full flex items-center justify-center z-10">
            <Image
              src="/logo.png"
              alt="Panaderías Brito • Don Toño"
              width={currentSize * 2}
              height={currentSize * 2}
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-sm"
              priority
              unoptimized
            />
          </div>

          {/* Sparkle Starlight Burst */}
          {sparkleVisible && (
            <>
              <div className="absolute top-1 right-1 text-amber-400 animate-ping z-30 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="absolute bottom-1 left-1 text-yellow-300 animate-pulse z-30 pointer-events-none">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyframe Animations: 3D Spin, Slow Aura, Floating & Glass Sheen */}
      <style jsx global>{`
        @keyframes brito3dSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          25% {
            transform: rotateY(180deg) scale(1.15) translateZ(10px);
            box-shadow: 0 25px 30px -5px rgba(212, 175, 55, 0.45);
          }
          65% {
            transform: rotateY(360deg) scale(1.1) translateZ(5px);
          }
          85% {
            transform: rotateY(360deg) scale(0.98);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
        .animate-brito-3d-spin {
          animation: brito3dSpin 1.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes subtleFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .animate-subtle-float {
          animation: subtleFloat 3.8s ease-in-out infinite;
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spinSlow 16s linear infinite;
        }

        @keyframes periodicSheen {
          0%, 80% {
            opacity: 0;
            transform: translateX(-150%) skewX(-20deg);
          }
          88% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
            transform: translateX(200%) skewX(-20deg);
          }
        }
        .animate-periodic-sheen {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.65) 50%,
            transparent 100%
          );
          animation: periodicSheen 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
