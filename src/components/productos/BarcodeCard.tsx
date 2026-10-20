"use client";

import React, { useState, useRef } from "react";
import { 
  Barcode, 
  RefreshCw, 
  Copy, 
  Check, 
  Printer, 
  Scan,
  Sparkles,
  ScanLine,
  Zap,
  CheckCircle2
} from "lucide-react";
import { playScanBeep } from "@/lib/utils";

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

export function renderBarcodeSvgString(barcode: string): string {
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

    let rects = "";
    let currentX = startX;

    // Start Guard: 101
    for (const bit of "101") {
      if (bit === "1") {
        rects += `<rect x="${currentX}" y="5" width="${moduleWidth}" height="${guardHeight}" fill="#000000" />`;
      }
      currentX += moduleWidth;
    }

    // Left 6 digits
    for (const bit of leftModules) {
      if (bit === "1") {
        rects += `<rect x="${currentX}" y="5" width="${moduleWidth}" height="${barHeight}" fill="#000000" />`;
      }
      currentX += moduleWidth;
    }

    // Center Guard: 01010
    for (const bit of "01010") {
      if (bit === "1") {
        rects += `<rect x="${currentX}" y="5" width="${moduleWidth}" height="${guardHeight}" fill="#000000" />`;
      }
      currentX += moduleWidth;
    }

    // Right 6 digits
    for (const bit of rightModules) {
      if (bit === "1") {
        rects += `<rect x="${currentX}" y="5" width="${moduleWidth}" height="${barHeight}" fill="#000000" />`;
      }
      currentX += moduleWidth;
    }

    // End Guard: 101
    for (const bit of "101") {
      if (bit === "1") {
        rects += `<rect x="${currentX}" y="5" width="${moduleWidth}" height="${guardHeight}" fill="#000000" />`;
      }
      currentX += moduleWidth;
    }

    const totalWidth = currentX + 22;

    return `
      <svg viewBox="0 0 ${totalWidth} 72" style="width:100%; max-width:230px; height:auto; display:block; margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
        <rect width="${totalWidth}" height="72" fill="#ffffff" />
        ${rects}
        <text x="${startX - 10}" y="64" font-family="monospace" font-size="13" font-weight="bold" fill="#000" text-anchor="middle">${full13[0]}</text>
        <text x="${startX + 3 + (42 * moduleWidth) / 2}" y="64" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="1.8" fill="#000" text-anchor="middle">${full13.slice(1, 7)}</text>
        <text x="${startX + 3 + 42 * moduleWidth + 5 * moduleWidth + (42 * moduleWidth) / 2}" y="64" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="1.8" fill="#000" text-anchor="middle">${full13.slice(7, 13)}</text>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 220 72" style="width:100%; max-width:220px; height:auto; display:block; margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="72" fill="#ffffff" />
      <text x="110" y="45" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="#000">${barcode}</text>
    </svg>
  `;
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
  onOpenScanner?: () => void;
}

export function BarcodeCard({
  barcode,
  productName = "Producto",
  productPrice,
  onChangeBarcode,
  onRegenerate,
  onOpenScanner,
}: BarcodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [isWaitingForScan, setIsWaitingForScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayBarcode = barcode ? buildEAN13(barcode) : "7501000100011";

  const handleActivateScanner = () => {
    setIsManualEditOpen(true);
    setIsWaitingForScan(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 60);
    if (onOpenScanner) {
      onOpenScanner();
    }
  };

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
    <div className="bg-[#101217] rounded-2xl border border-stone-800/90 p-4 space-y-3 shadow-xl text-stone-100">
      {/* Header (Igual a la Imagen 1) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Título e Ícono de Código de Barras */}
        <div className="flex items-center gap-2">
          <div className="flex items-center text-amber-400 font-mono font-black text-sm tracking-tighter select-none">
            <span>||||</span>
          </div>
          <label className="text-sm font-bold text-white tracking-wide">
            Código de Barras
          </label>
        </div>

        {/* Botones de Acción (Igual a la Imagen 1) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleActivateScanner}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
              isWaitingForScan
                ? "bg-emerald-900/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse"
                : "bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-600/50 text-emerald-400 hover:border-emerald-500"
            }`}
            title="Activar escaneo con lector físico de código de barras (pistola USB / Bluetooth)"
          >
            <ScanLine className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isWaitingForScan ? "Lector listo..." : "Escanear de empaque"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRegenerate();
              setScanFeedback("¡Código propio EAN-13 generado!");
              setTimeout(() => setScanFeedback(null), 2500);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-amber-950/70 hover:bg-amber-900/80 border-amber-600/50 text-amber-300 hover:border-amber-400 active:scale-95"
            title="Generar un nuevo código de barras único para este producto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
            <span>Generar código propio</span>
          </button>
        </div>
      </div>

      {/* Input de captura directa con lector o manual (Igual a la Imagen 1) */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => {
            const val = e.target.value.trim().toUpperCase();
            onChangeBarcode(val);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              playScanBeep(true);
              setScanFeedback(`¡Código "${barcode}" asignado correctamente!`);
              setIsWaitingForScan(false);
              setTimeout(() => setScanFeedback(null), 3000);
            }
          }}
          placeholder="Dispara con tu lector al código del envase o escribe..."
          className={`w-full px-4 py-3 bg-[#181a21] rounded-xl border text-sm font-mono font-medium text-stone-100 placeholder:text-stone-500 tracking-wider transition-all focus:outline-none ${
            isWaitingForScan
              ? "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/30 text-emerald-200"
              : "border-stone-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          }`}
        />
        {barcode && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-amber-400 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-md">
            {displayBarcode}
          </span>
        )}
      </div>

      {/* Banner de Estado del Lector Físico */}
      {isWaitingForScan && (
        <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <div className="text-xs text-emerald-200 font-medium">
              <strong className="text-emerald-400">Lector listo:</strong> Apunta la pistola al código del envase o empaque y presiona el gatillo.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWaitingForScan(false)}
            className="text-[10px] font-bold text-emerald-400 hover:text-white px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800/80 cursor-pointer flex-shrink-0"
          >
            Listo
          </button>
        </div>
      )}

      {scanFeedback && (
        <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{scanFeedback}</span>
        </div>
      )}

      {/* Visualización de la etiqueta de Código de Barras (SVG con opciones de copia e impresión) */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1.5">
            <span>Vista de etiqueta comercial:</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-950/80 text-amber-300 rounded border border-amber-700/60">
              EAN-13 Oficial
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-stone-700"
              title="Copiar número de código de barras"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintLabel}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-102"
              title="Imprimir etiqueta con código de barras y precio"
            >
              <Printer className="w-3 h-3" />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>

        <div 
          id="active-product-barcode-svg"
          className="bg-white rounded-xl p-3 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group border border-stone-300"
        >
          <BarcodeSvg barcode={displayBarcode} />
        </div>
      </div>
    </div>
  );
}
