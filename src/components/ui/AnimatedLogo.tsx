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
  size = 52,
  className = "",
  showGlow = true,
  compact = false,
}: AnimatedLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [sparkleVisible, setSparkleVisible] = useState(false);

  // Trigger 3D spin automatically every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      triggerSpin();
    }, 30000);

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
      {/* Modern Ambient Glow */}
      {showGlow && (
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-700 blur-xl opacity-40 group-hover:opacity-75"
          style={{
            width: currentSize * 1.6,
            height: currentSize * 1.6,
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(234, 88, 12, 0.25) 50%, transparent 75%)",
          }}
        />
      )}

      {/* Modern Gradient Rim / Squircle Wrapper */}
      <div
        className={`relative p-[1.5px] rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-200 shadow-xl transition-all duration-500 ease-out ${
          isSpinning ? "animate-brito-3d-spin" : "group-hover:scale-105 group-hover:shadow-amber-500/25"
        }`}
        style={{
          width: currentSize,
          height: currentSize,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Inner Clean Container */}
        <div className="relative w-full h-full rounded-[14px] bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
          {/* Subtle Light Reflection Sweep */}
          <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-20" />

          {/* Logo Image */}
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

          {/* Clean Modern Sparkle */}
          {sparkleVisible && (
            <div className="absolute top-1 right-1 text-amber-500 animate-ping z-30 pointer-events-none">
              <Sparkles className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* 3D Spin Animation */}
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
      `}</style>
    </div>
  );
}
