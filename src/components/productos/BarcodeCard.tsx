"use client";

import React, { useState } from "react";
import { 
  Barcode, 
  RefreshCw, 
  Copy, 
  Check, 
  Printer, 
  Scan,
  Sparkles
} from "lucide-react";

// Standard EAN-13 patterns
const L_PATTERNS = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011"
];

const G_PATTERNS = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111"
];

const R_PATTERNS = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100"
];

const PARITY_PATTERNS = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

export function calculateEAN13Checksum(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10) || 0;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const mod = sum % 10;
  return (10 - mod) % 10;
}

export function buildEAN13(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 13) {
    const first12 = digits.slice(0, 12);
    return `${first12}${calculateEAN13Checksum(first12)}`;
  }
  const padded12 = digits.padEnd(12, "0").slice(0, 12);
  return `${padded12}${calculateEAN13Checksum(padded12)}`;
}

interface BarcodeSvgProps {
  barcode: string;
}

export function BarcodeSvg({ barcode }: BarcodeSvgProps) {
  const cleanDigits = barcode.replace(/\D/g, "");
  const isEanEligible = cleanDigits.length >= 10;

  if (isEanEligible) {
    const full13 = buildEAN13(cleanDigits);
    const firstDigit = parseInt(full13[0], 10);
    const parity = PARITY_PATTERNS[firstDigit] || "LLLLLL";

    let leftModules = "";
    for (let i = 1; i <= 6; i++) {
      const d = parseInt(full13[i], 10);
      const isL = parity[i - 1] === "L";
      leftModules += isL ? L_PATTERNS[d] : G_PATTERNS[d];
    }

    let rightModules = "";
    for (let i = 7; i <= 12; i++) {
      const d = parseInt(full13[i], 10);
      rightModules += R_PATTERNS[d];
    }

    const moduleWidth = 2.2;
    const startX = 22;
    const barHeight = 46;
    const guardHeight = 54;

    const bars: React.ReactNode[] = [];
    let currentX = startX;

    // Start Guard: 101
    "101".split("").forEach((bit, idx) => {
      if (bit === "1") {
        bars.push(
          <rect
            key={`sg-${idx}`}
            x={currentX}
            y={5}
            width={moduleWidth}
            height={guardHeight}
            fill="#1c1917"
          />
        );
      }
      currentX += moduleWidth;
    });

    // Left 6 digits
    leftModules.split("").forEach((bit, idx) => {
      if (bit === "1") {
        bars.push(
          <rect
            key={`l-${idx}`}
            x={currentX}
            y={5}
            width={moduleWidth}
            height={barHeight}
            fill="#1c1917"
          />
        );
      }
      currentX += moduleWidth;
    });

    // Center Guard: 01010
    "01010".split("").forEach((bit, idx) => {
      if (bit === "1") {
        bars.push(
          <rect
            key={`cg-${idx}`}
            x={currentX}
            y={5}
            width={moduleWidth}
            height={guardHeight}
            fill="#1c1917"
          />
        );
      }
      currentX += moduleWidth;
    });

    // Right 6 digits
    rightModules.split("").forEach((bit, idx) => {
      if (bit === "1") {
        bars.push(
          <rect
            key={`r-${idx}`}
            x={currentX}
            y={5}
            width={moduleWidth}
            height={barHeight}
            fill="#1c1917"
          />
        );
      }
      currentX += moduleWidth;
    });

    // End Guard: 101
    "101".split("").forEach((bit, idx) => {
      if (bit === "1") {
        bars.push(
          <rect
            key={`eg-${idx}`}
            x={currentX}
            y={5}
            width={moduleWidth}
            height={guardHeight}
            fill="#1c1917"
          />
        );
      }
      currentX += moduleWidth;
    });

    const totalWidth = currentX + 22;

    return (
      <svg
        viewBox={`0 0 ${totalWidth} 72`}
        className="w-full max-w-[280px] h-auto select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={totalWidth} height="72" fill="#ffffff" rx="6" />
        {bars}
        {/* First digit printed outside left */}
        <text
          x={startX - 10}
          y={64}
          fontFamily="monospace"
          fontSize="13"
          fontWeight="bold"
          fill="#1c1917"
          textAnchor="middle"
        >
          {full13[0]}
        </text>
        {/* Left 6 digits */}
        <text
          x={startX + 3 + (42 * moduleWidth) / 2}
          y={64}
          fontFamily="monospace"
          fontSize="13"
          fontWeight="bold"
          letterSpacing="1.8"
          fill="#1c1917"
          textAnchor="middle"
        >
          {full13.slice(1, 7)}
        </text>
        {/* Right 6 digits */}
        <text
          x={startX + 3 + 42 * moduleWidth + 5 * moduleWidth + (42 * moduleWidth) / 2}
          y={64}
          fontFamily="monospace"
          fontSize="13"
          fontWeight="bold"
          letterSpacing="1.8"
          fill="#1c1917"
          textAnchor="middle"
        >
          {full13.slice(7, 13)}
        </text>
        {/* Right chevron indicator */}
        <text
          x={totalWidth - 10}
          y={64}
          fontFamily="monospace"
          fontSize="12"
          fontWeight="bold"
          fill="#78716c"
          textAnchor="middle"
        >
          &gt;
        </text>
      </svg>
    );
  }

  // Fallback for custom short codes (like PAN-001)
  const pattern = "1010011011010100101101001011010010101101";
  const modW = 3.5;
  const sX = 16;
  const bars: React.ReactNode[] = [];
  let curX = sX;
  const repeated = (pattern + pattern).slice(0, 56);
  repeated.split("").forEach((bit, i) => {
    if (bit === "1") {
      bars.push(
        <rect
          key={`fb-${i}`}
          x={curX}
          y={5}
          width={modW}
          height={48}
          fill="#1c1917"
        />
      );
    }
    curX += modW;
  });
  const tW = curX + 16;

  return (
    <svg
      viewBox={`0 0 ${tW} 72`}
      className="w-full max-w-[260px] h-auto select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={tW} height="72" fill="#ffffff" rx="6" />
      {bars}
      <text
        x={tW / 2}
        y={64}
        fontFamily="monospace"
        fontSize="13"
        fontWeight="bold"
        letterSpacing="2"
        fill="#1c1917"
        textAnchor="middle"
      >
        {barcode}
      </text>
    </svg>
  );
}

interface BarcodeCardProps {
  barcode: string;
  productName?: string;
  productPrice?: string | number;
  onChangeBarcode: (newBarcode: string) => void;
  onRegenerate: () => void;
}

export function BarcodeCard({
  barcode,
  productName = "Producto",
  productPrice,
  onChangeBarcode,
  onRegenerate,
}: BarcodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);

  const displayBarcode = barcode ? buildEAN13(barcode) : "7501000100011";

  const handleCopy = () => {
    if (!displayBarcode) return;
    navigator.clipboard.writeText(displayBarcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintLabel = () => {
    if (typeof window === "undefined") return;

    const printWindow = window.open("", "_blank", "width=420,height=520");
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes para imprimir la etiqueta.");
      return;
    }

    const formattedPrice = productPrice 
      ? `$${parseFloat(productPrice.toString()).toFixed(2)} MXN` 
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta - ${productName}</title>
          <style>
            @page {
              size: 60mm 40mm;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              background: #fff;
              color: #000;
            }
            .brand {
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #b45309;
              margin-bottom: 2px;
            }
            .name {
              font-size: 13px;
              font-weight: 800;
              line-height: 1.2;
              max-width: 90%;
              margin-bottom: 3px;
            }
            .price {
              font-size: 18px;
              font-weight: 900;
              color: #000;
              margin-bottom: 4px;
            }
            .barcode-box {
              max-width: 100%;
              display: flex;
              justify-content: center;
            }
            .footer-note {
              font-size: 8px;
              color: #666;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="brand">🥖 Panaderías Brito</div>
          <div class="name">${productName}</div>
          ${formattedPrice ? `<div class="price">${formattedPrice}</div>` : ""}
          <div class="barcode-box">
            <svg viewBox="0 0 280 72" style="width:240px; height:auto;">
              ${document.getElementById("active-product-barcode-svg")?.innerHTML || ""}
            </svg>
          </div>
          <div class="footer-note">Escanear en mostrador / caja</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-gradient-to-br from-stone-50 via-amber-50/20 to-stone-50 rounded-2xl border-2 border-amber-200/80 p-3.5 space-y-3 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
            <Barcode className="w-3.5 h-3.5" />
          </div>
          <div>
            <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <span>Código de Barras del Producto</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-950 rounded-md border border-amber-300">
                Oficial EAN-13
              </span>
            </label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRegenerate}
            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-stone-200 hover:border-amber-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-102"
            title="Generar un nuevo código de barras único para este producto"
          >
            <RefreshCw className="w-3 h-3 text-amber-700" />
            <span>Regenerar</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLabel}
            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-102"
            title="Imprimir etiqueta con código de barras y precio"
          >
            <Printer className="w-3 h-3" />
            <span className="hidden sm:inline">Imprimir Etiqueta</span>
          </button>
        </div>
      </div>

      {/* Barcode Visual Graphic Card */}
      <div 
        id="active-product-barcode-svg"
        className="bg-white rounded-xl border-2 border-stone-200 p-3 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group"
      >
        <BarcodeSvg barcode={displayBarcode} />

        {/* Floating copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-950 border border-stone-200 transition-all text-[10px] font-bold flex items-center gap-1 opacity-75 group-hover:opacity-100 cursor-pointer shadow-2xs"
          title="Copiar número de código de barras"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700 text-[9px] font-bold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[9px]">Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Expand / Collapse manual scan or edit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => setIsManualEditOpen(!isManualEditOpen)}
            className="text-stone-600 hover:text-stone-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Scan className="w-3.5 h-3.5 text-amber-600" />
            <span>{isManualEditOpen ? "Ocultar casilla manual" : "Escanear con pistola o editar número"}</span>
          </button>
          <span className="font-mono text-[11px] font-black text-amber-950 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md">
            {displayBarcode}
          </span>
        </div>

        {isManualEditOpen && (
          <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <label className="text-[10px] font-bold text-stone-700 flex items-center justify-between">
              <span>Número de Código de Barras (EAN-13 o comercial):</span>
              <span className="text-amber-700 font-medium">Soporta pistola lectora USB / Bluetooth</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => onChangeBarcode(e.target.value.trim().toUpperCase())}
                placeholder="750100010001"
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 text-xs font-mono font-black text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none tracking-wider"
              />
            </div>
            <p className="text-[10px] text-stone-500">
              Al conectar un lector de código de barras físico puedes disparar directamente en este campo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
