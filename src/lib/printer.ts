export interface PrinterInfo {
  id: string;
  name: string;
  port: string;
  type: "thermal_58" | "thermal_80" | "laser_pdf" | "other";
  isDefaultInWindows: boolean;
  description: string;
  paperWidth: "58mm" | "80mm";
}

export interface PrinterConfig {
  selectedPrinterId: string;
  selectedPrinterName: string;
  port: string;
  paperWidth: "58mm" | "80mm";
  directPrinting: boolean; // Impresión directa sin cuadro de diálogo (Modo Kiosko)
  autoCut: boolean;
  openCashDrawer: boolean;
  autoPrintOnSale: boolean;
  copies: number;
  status: "connected" | "ready" | "offline";
  lastTestDate?: string;
  customPrinters: PrinterInfo[];
}

export const STORAGE_PRINTER_KEY = "brito_pos_printer_config";

/**
 * Impresoras detectadas en el sistema del Punto de Venta de Panaderías Brito.
 * POS-58 en puerto USB002 es la impresora térmica física predeterminada instalada en Windows.
 */
export const DEFAULT_SYSTEM_PRINTERS: PrinterInfo[] = [
  {
    id: "pos-58",
    name: "POS-58",
    port: "USB002",
    type: "thermal_58",
    isDefaultInWindows: true,
    description: "Impresora Térmica 58mm Principal (Recomendada para Mostrador)",
    paperWidth: "58mm",
  },
  {
    id: "pos-58-copy",
    name: "POS-58(copy of 1)",
    port: "USB002",
    type: "thermal_58",
    isDefaultInWindows: false,
    description: "Copia Secundaria Térmica 58mm (Respaldo)",
    paperWidth: "58mm",
  },
  {
    id: "thermal-80",
    name: "Impresora Térmica 80mm",
    port: "USB001 / Red",
    type: "thermal_80",
    isDefaultInWindows: false,
    description: "Impresora de Tickets Ancha (Formato 80mm)",
    paperWidth: "80mm",
  },
  {
    id: "pdf-virtual",
    name: "Microsoft Print to PDF",
    port: "PORTPROMPT:",
    type: "laser_pdf",
    isDefaultInWindows: false,
    description: "Guardar Comprobante Digital en PDF (Sin papel)",
    paperWidth: "80mm",
  },
];

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  selectedPrinterId: "pos-58",
  selectedPrinterName: "POS-58",
  port: "USB002",
  paperWidth: "58mm",
  directPrinting: true,
  autoCut: true,
  openCashDrawer: true,
  autoPrintOnSale: true,
  copies: 1,
  status: "connected",
  customPrinters: [],
};

/**
 * Obtiene la configuración de impresora almacenada en localStorage o la predeterminada.
 */
export function getStoredPrinterConfig(): PrinterConfig {
  if (typeof window === "undefined") return DEFAULT_PRINTER_CONFIG;

  try {
    const saved = localStorage.getItem(STORAGE_PRINTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PRINTER_CONFIG,
        ...parsed,
        customPrinters: parsed.customPrinters || [],
      };
    }
  } catch (err) {
    console.error("Error reading printer configuration:", err);
  }

  return DEFAULT_PRINTER_CONFIG;
}

/**
 * Guarda la configuración de impresora en localStorage y notifica a las pestañas y componentes.
 */
export function saveStoredPrinterConfig(config: PrinterConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_PRINTER_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("brito_printer_config_updated", { detail: config }));
  } catch (err) {
    console.error("Error saving printer configuration:", err);
  }
}

/**
 * Devuelve la lista completa de impresoras disponibles (nativas del sistema + personalizadas).
 */
export function getAllPrinters(config?: PrinterConfig): PrinterInfo[] {
  const currentConfig = config || getStoredPrinterConfig();
  const custom = currentConfig.customPrinters || [];

  // Combinar sin duplicar nombres
  const list = [...DEFAULT_SYSTEM_PRINTERS];
  for (const c of custom) {
    if (!list.some((p) => p.name.toLowerCase() === c.name.toLowerCase())) {
      list.push(c);
    }
  }

  return list;
}

/**
 * Imprime un ticket de diagnóstico y prueba en la impresora seleccionada.
 */
export function printTestTicket(
  config: PrinterConfig,
  options?: { branchName?: string; cashierName?: string }
): void {
  if (typeof window === "undefined") return;

  const branch = options?.branchName || "Panaderías Brito - Mostrador Principal";
  const cashier = options?.cashierName || "Cajera en Turno";
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const is58mm = config.paperWidth === "58mm";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket de Prueba - ${config.selectedPrinterName}</title>
        <style>
          @page {
            size: ${is58mm ? "58mm auto" : "80mm auto"};
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${is58mm ? "11px" : "13px"};
            line-height: 1.25;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 8px 6px;
            width: ${is58mm ? "54mm" : "76mm"};
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: 900; }
          .divider {
            border-top: 2px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px double #000;
            margin: 6px 0;
          }
          .tag {
            border: 1px solid #000;
            padding: 2px 4px;
            display: inline-block;
            margin: 3px 0;
            font-size: 10px;
            font-weight: bold;
          }
          .status-ok {
            background-color: #000;
            color: #fff;
            padding: 3px 6px;
            font-weight: 900;
            font-size: 11px;
            display: inline-block;
            margin: 4px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 14px; letter-spacing: 1px;">PANADERÍAS BRITO</div>
          <div style="font-size: 10px; font-weight: bold;">DON ANTONIO BRITO & HIJOS</div>
          <div class="tag">★ TICKET DE PRUEBA TÉRMICA ★</div>
          <div style="font-size: 10px; margin-top: 2px;">${branch}</div>
        </div>

        <div class="divider"></div>

        <div class="center">
          <div class="status-ok">✔ CONEXIÓN EXITOSA</div>
          <div style="font-size: 10px; font-weight: bold; margin-top: 3px;">
            Impresora: ${config.selectedPrinterName}
          </div>
          <div style="font-size: 9px; color: #333;">Puerto: ${config.port} • Formato: ${config.paperWidth}</div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>FECHA:</span>
          <span class="bold">${dateStr}</span>
        </div>
        <div class="row">
          <span>HORA:</span>
          <span class="bold">${timeStr}</span>
        </div>
        <div class="row">
          <span>CAJERA:</span>
          <span class="bold">${cashier}</span>
        </div>
        <div class="row">
          <span>MODO:</span>
          <span class="bold">${config.directPrinting ? "DIRECTO (KIOSK)" : "DIÁLOGO WINDOWS"}</span>
        </div>

        <div class="double-divider"></div>

        <div class="center" style="font-size: 10px; padding: 2px 0;">
          <p style="margin: 2px 0; font-weight: bold;">
            ¡Impresora lista y configurada para el cobro de pan y tickets!
          </p>
          <p style="margin: 4px 0 0 0; font-size: 9px;">
            Pan Tradicional • Bolillo • Repostería
          </p>
          <div style="margin-top: 8px; font-size: 8px; letter-spacing: 2px;">
            ================================
          </div>
          <div style="margin-top: 15px; font-size: 8px;">
            (Corte de papel automático)
          </div>
        </div>
      </body>
    </html>
  `;

  // Crear un iframe invisible para imprimir de forma limpia y directa sin redirección
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // Actualizar última fecha de prueba
        const updatedConfig: PrinterConfig = {
          ...config,
          lastTestDate: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          status: "connected",
        };
        saveStoredPrinterConfig(updatedConfig);

        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    }
  } catch (e) {
    console.error("Error al imprimir ticket de prueba:", e);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
