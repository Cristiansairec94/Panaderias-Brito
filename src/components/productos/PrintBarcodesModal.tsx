"use client";

import React, { useState, useMemo } from "react";
import { 
  X, 
  Printer, 
  Barcode, 
  Layers, 
  Check, 
  LayoutGrid, 
  ListFilter,
  Sparkles,
  FileText
} from "lucide-react";
import { Product } from "@/types";
import { PRODUCT_CATEGORIES } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import { BarcodeSvg, renderBarcodeSvgString, buildEAN13 } from "@/components/productos/BarcodeCard";

interface PrintBarcodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function PrintBarcodesModal({
  isOpen,
  onClose,
  products,
}: PrintBarcodesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [layoutStyle, setLayoutStyle] = useState<"grid" | "list">("grid");

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  if (!isOpen) return null;

  const currentCategoryLabel = selectedCategory === "all"
    ? "Todas las categorías"
    : PRODUCT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory;

  const handleExecutePrint = () => {
    if (typeof window === "undefined") return;

    const printWin = window.open("", "_blank", "width=880,height=950");
    if (!printWin) {
      alert("Por favor habilita las ventanas emergentes en tu navegador para imprimir.");
      return;
    }

    const isGrid = layoutStyle === "grid";

    const itemsHtml = filteredProducts.map((p) => {
      const barcodeValue = p.barcode || p.code || "750100010001";
      const svgCode = renderBarcodeSvgString(barcodeValue);
      const priceText = `$${Number(p.price).toFixed(2)} MXN`;
      const unitText = p.unit && p.unit !== "pieza" ? `/${p.unit}` : "";

      if (isGrid) {
        return `
          <div class="label-card">
            <div class="card-header">
              <span class="icon">${p.icon || "🥖"}</span>
              <span class="brand">Panaderías Brito</span>
            </div>
            <div class="prod-name">${p.name}</div>
            <div class="prod-price">${priceText}${unitText}</div>
            <div class="barcode-container">
              ${svgCode}
            </div>
          </div>
        `;
      } else {
        // List layout (Catalog format for binder/cash register)
        return `
          <div class="list-row">
            <div class="list-info">
              <span class="icon">${p.icon || "🥖"}</span>
              <div>
                <div class="prod-name">${p.name}</div>
                <div class="prod-price">${priceText}${unitText}</div>
              </div>
            </div>
            <div class="barcode-container-list">
              ${svgCode}
            </div>
          </div>
        `;
      }
    }).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Códigos de Barra - ${currentCategoryLabel} - Panaderías Brito</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: letter;
              margin: 10mm 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #1c1917;
              background: #fff;
            }
            .header-banner {
              text-align: center;
              padding-bottom: 12px;
              margin-bottom: 14px;
              border-bottom: 2px solid #b45309;
            }
            .header-banner h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #78350f;
            }
            .header-banner p {
              margin: 3px 0 0;
              font-size: 11px;
              color: #57534e;
              font-weight: 600;
            }
            
            /* Grid layout for adhesive stickers */
            .grid-sheet {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
            .label-card {
              border: 1px dashed #d6d3d1;
              border-radius: 10px;
              padding: 8px 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              background: #fff;
              page-break-inside: avoid;
              min-height: 125px;
            }
            .card-header {
              display: flex;
              align-items: center;
              gap: 4px;
              margin-bottom: 2px;
            }
            .card-header .icon {
              font-size: 13px;
            }
            .card-header .brand {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #9a3412;
            }
            .prod-name {
              font-size: 11.5px;
              font-weight: 800;
              line-height: 1.2;
              color: #0c0a09;
              max-height: 28px;
              overflow: hidden;
              margin-bottom: 2px;
            }
            .prod-price {
              font-size: 14px;
              font-weight: 900;
              color: #b45309;
              margin-bottom: 3px;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .barcode-container svg {
              width: 100%;
              max-width: 210px;
              height: auto;
            }

            /* List format for register binder */
            .list-sheet {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px 14px;
            }
            .list-row {
              border: 1px solid #e7e5e4;
              border-radius: 8px;
              padding: 6px 10px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #fff;
              page-break-inside: avoid;
            }
            .list-info {
              display: flex;
              align-items: center;
              gap: 8px;
              max-width: 50%;
            }
            .list-info .icon {
              font-size: 20px;
            }
            .barcode-container-list {
              max-width: 48%;
            }
            .barcode-container-list svg {
              width: 100%;
              max-width: 180px;
              height: auto;
            }

            .print-footer {
              text-align: center;
              font-size: 9px;
              color: #78716c;
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px solid #e7e5e4;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1>🥖 Panaderías Brito — Catálogo de Códigos de Barra</h1>
            <p>${currentCategoryLabel} • Total: ${filteredProducts.length} producto(s) • ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</p>
          </div>

          <div class="${isGrid ? "grid-sheet" : "list-sheet"}">
            ${itemsHtml}
          </div>

          <div class="print-footer">
            Generado automáticamente desde Panaderías Brito ERP • Escaneo compatible con cualquier lector USB / Bluetooth
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center text-xl shadow-lg font-bold shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Imprimir Códigos de Barras
                </h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase">
                  Todas las categorías o por selección
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Imprime hojas de códigos de barra para charolas de pan, mostrador o la caja de cobro.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-stone-700 shrink-0">Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none flex-1 max-w-xs shadow-2xs"
            >
              <option value="all">🧺 Todas las Categorías ({products.length} productos)</option>
              {PRODUCT_CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Layout Mode Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-xs font-bold text-stone-500 mr-1 hidden md:inline">Diseño:</span>
            <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setLayoutStyle("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutStyle === "grid"
                    ? "bg-amber-500 text-stone-950 shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-950"
                }`}
                title="Diseño en cuadrícula de 3 columnas (estilo plantilla de etiquetas adhesivas)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Etiquetas (3 col)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutStyle === "list"
                    ? "bg-amber-500 text-stone-950 shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-950"
                }`}
                title="Diseño en lista de mostrador (ideal para carpeta de cobro junto a caja)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Catálogo Mostrador</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-stone-100/60">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span className="font-bold text-stone-700">
              Vista previa de impresión ({filteredProducts.length} productos):
            </span>
            <span className="text-[11px] text-amber-900 bg-amber-100/90 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
              Formato Carta / A4 optimizado
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
              <p className="text-sm font-bold text-stone-600">No hay productos en esta categoría.</p>
            </div>
          ) : layoutStyle === "grid" ? (
            /* Grid Preview */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const barcodeValue = p.barcode || p.code || "750100010001";
                const displayBarcode = buildEAN13(barcodeValue);
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-3.5 border-2 border-stone-200 shadow-sm flex flex-col items-center justify-between text-center space-y-1.5 hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-800">
                      <span>{p.icon || "🥖"}</span>
                      <span>Panaderías Brito</span>
                    </div>
                    <div className="font-black text-xs text-stone-900 truncate w-full" title={p.name}>
                      {p.name}
                    </div>
                    <div className="text-sm font-black text-amber-600">
                      {formatCurrency(p.price)}
                      {p.unit && p.unit !== "pieza" && (
                        <span className="text-[10px] font-bold text-stone-400">/{p.unit}</span>
                      )}
                    </div>
                    <div className="w-full flex justify-center py-1 bg-stone-50 rounded-xl border border-stone-100">
                      <BarcodeSvg barcode={displayBarcode} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List Preview */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const barcodeValue = p.barcode || p.code || "750100010001";
                const displayBarcode = buildEAN13(barcodeValue);
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-3 border-2 border-stone-200 shadow-sm flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{p.icon || "🥖"}</span>
                      <div className="min-w-0">
                        <div className="font-black text-xs text-stone-900 truncate" title={p.name}>
                          {p.name}
                        </div>
                        <div className="text-xs font-black text-amber-600">
                          {formatCurrency(p.price)}
                          {p.unit && p.unit !== "pieza" && (
                            <span className="text-[10px] font-bold text-stone-400">/{p.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-36 shrink-0 flex justify-end">
                      <BarcodeSvg barcode={displayBarcode} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 font-bold hover:bg-stone-100 rounded-xl text-xs transition-all cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filteredProducts.length === 0}
              onClick={handleExecutePrint}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir {filteredProducts.length} Códigos de Barra</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
