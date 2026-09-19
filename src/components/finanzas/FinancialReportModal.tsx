"use client";

import React, { useRef, useState } from "react";
import { 
  X, 
  Printer, 
  Check, 
  Copy, 
  Building2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  ShieldCheck,
  Percent,
  Wallet,
  Coins
} from "lucide-react";
import { FullFinancialSummary } from "@/lib/finanzas";
import { formatCurrency } from "@/lib/utils";

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: FullFinancialSummary;
}

export default function FinancialReportModal({
  isOpen,
  onClose,
  summary,
}: FinancialReportModalProps) {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const { pl, treasury, receivables, kpis, periodLabel, branchName } = summary;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `🥖 PANADERÍAS BRITO - ESTADO DE RESULTADOS & BALANCE FINANCIERO
Periodo: ${periodLabel} | Sucursal: ${branchName}
Fecha de emisión: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}
---------------------------------------------------------
(+) Ventas Totales: ${formatCurrency(pl.grossSales)}
(-) Costo de Ventas (COGS): ${formatCurrency(pl.totalCogs)}
(=) Utilidad Bruta: ${formatCurrency(pl.grossProfit)} (${pl.grossMarginPercent}%)
(-) Gastos Operativos (OPEX): ${formatCurrency(pl.totalOpex)}
(-) Costo de Mermas: ${formatCurrency(pl.wasteLoss)}
(=) Utilidad Operativa: ${formatCurrency(pl.operatingProfit)} (${pl.operatingMarginPercent}%)
(-) Retiros Don Toño / Socios: ${formatCurrency(pl.ownerDraws)}
---------------------------------------------------------
(=) UTILIDAD NETA FINAL: ${formatCurrency(pl.netProfit)} (${pl.netMarginPercent}%)
Liquidez Disponible Total: ${formatCurrency(treasury.totalLiquidFunds)}
Cuentas por Cobrar (Mayoristas): ${formatCurrency(receivables.totalReceivables)}
Ticket Promedio: ${formatCurrency(kpis.ticketAverage)} | Tickets: ${kpis.totalTicketsCount}
Punto de Equilibrio Diario: ${formatCurrency(kpis.dailyBreakEven)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden text-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Acciones (Oculto en Impresión) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brito-orange-100 text-brito-orange-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-stone-900 leading-none">
                Estado Financiero Oficial
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Reporte ejecutivo y balance general para toma de decisiones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all shadow-sm"
              title="Copiar texto resumen"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4 text-brito-orange-400" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Reporte Imprimible */}
        <div ref={reportRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm">
          {/* Membrete Oficial */}
          <div className="border-b-2 border-stone-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥖</span>
                <span className="text-xl font-black text-stone-900 tracking-tight">PANADERÍAS BRITO</span>
              </div>
              <p className="text-xs text-stone-600 font-semibold mt-0.5">
                Tradición Artesanal & Horno de Leña • Don Toño Brito
              </p>
              <p className="text-[11px] text-stone-500">
                Av. Principal #450, Centro Histórico • Tel: 55 1234 5678
              </p>
            </div>
            <div className="text-left sm:text-right bg-stone-50 p-3 rounded-2xl border border-stone-200 sm:border-0 sm:bg-transparent sm:p-0">
              <span className="inline-block px-2.5 py-1 bg-brito-orange-100 text-brito-orange-900 rounded-lg text-xs font-black uppercase tracking-wider mb-1">
                Balance Ejecutivo
              </span>
              <p className="text-xs font-bold text-stone-900">
                Sucursal: <span className="text-brito-orange-700 font-extrabold">{branchName}</span>
              </p>
              <p className="text-xs text-stone-600">
                Periodo: <strong className="text-stone-900">{periodLabel}</strong>
              </p>
              <p className="text-[11px] text-stone-400">
                Emitido: {new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}
              </p>
            </div>
          </div>

          {/* Tarjetas Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Ventas Netas</span>
              <span className="text-lg font-black text-emerald-900">{formatCurrency(pl.grossSales)}</span>
              <span className="text-[10px] text-emerald-700 block mt-0.5 font-semibold">100% ingresos</span>
            </div>
            <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Costo Ventas (COGS)</span>
              <span className="text-lg font-black text-amber-900">{formatCurrency(pl.totalCogs)}</span>
              <span className="text-[10px] text-amber-700 block mt-0.5 font-semibold">Harinas, gas y empaque</span>
            </div>
            <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl">
              <span className="text-[11px] font-bold text-rose-800 uppercase block">Gastos Operativos</span>
              <span className="text-lg font-black text-rose-900">{formatCurrency(pl.totalOpex)}</span>
              <span className="text-[10px] text-rose-700 block mt-0.5 font-semibold">Nóminas y servicios</span>
            </div>
            <div className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-md">
              <span className="text-[11px] font-bold text-brito-orange-300 uppercase block">Utilidad Neta Real</span>
              <span className="text-lg font-black text-brito-orange-400">{formatCurrency(pl.netProfit)}</span>
              <span className="text-[10px] text-stone-300 block mt-0.5 font-semibold">Margen neto: {pl.netMarginPercent}%</span>
            </div>
          </div>

          {/* Tabla Desglosada de Estado de Resultados (P&L) */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-stone-100 px-4 py-2.5 border-b border-stone-200 flex justify-between items-center">
              <h4 className="font-black text-xs uppercase tracking-wider text-stone-800">
                Estado de Resultados Integral (P&L)
              </h4>
              <span className="text-xs text-stone-500 font-bold">Moneda: MXN ($)</span>
            </div>

            <div className="divide-y divide-stone-100 font-medium text-xs">
              {/* Ingresos */}
              <div className="p-3 bg-stone-50/50">
                <div className="flex justify-between font-black text-stone-900 mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <TrendingUp className="w-3.5 h-3.5" /> (+) INGRESOS BRUTOS POR VENTAS
                  </span>
                  <span className="text-emerald-700 font-extrabold">{formatCurrency(pl.grossSales)}</span>
                </div>
                <div className="space-y-1 pl-4 text-stone-600">
                  <div className="flex justify-between">
                    <span>• Venta Mostrador (Panadería y Café)</span>
                    <span>{formatCurrency(pl.counterSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Venta a Mayoristas (Tienditas & Taquerías)</span>
                    <span>{formatCurrency(pl.wholesaleSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Encargos de Pasteles & Eventos</span>
                    <span>{formatCurrency(pl.ordersSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Venta de Costales & Reciclaje</span>
                    <span>{formatCurrency(pl.otherIncomes)}</span>
                  </div>
                </div>
              </div>

              {/* COGS */}
              <div className="p-3">
                <div className="flex justify-between font-black text-stone-900 mb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <TrendingDown className="w-3.5 h-3.5" /> (-) COSTO DE VENTAS (COGS / PRODUCCIÓN)
                  </span>
                  <span className="text-amber-700 font-extrabold">{formatCurrency(pl.totalCogs)}</span>
                </div>
                <div className="space-y-1 pl-4 text-stone-600">
                  <div className="flex justify-between">
                    <span>• Materia Prima (Harina de trigo, manteca, azúcar, huevo)</span>
                    <span>{formatCurrency(pl.cogsIngredients)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Gas LP de Hornos (Combustible directo de horneado)</span>
                    <span>{formatCurrency(pl.cogsGasLP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Empaques Directos (Bolsas kraft y domos de pasteles)</span>
                    <span>{formatCurrency(pl.cogsPackaging)}</span>
                  </div>
                </div>
              </div>

              {/* Margen Bruto */}
              <div className="p-3 bg-amber-50/50 flex justify-between font-black text-stone-900 border-y border-amber-200">
                <span className="text-amber-900 uppercase">(=) UTILIDAD BRUTA</span>
                <span className="text-amber-900 text-sm">{formatCurrency(pl.grossProfit)} ({pl.grossMarginPercent}%)</span>
              </div>

              {/* OPEX */}
              <div className="p-3">
                <div className="flex justify-between font-black text-stone-900 mb-1.5">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <TrendingDown className="w-3.5 h-3.5" /> (-) GASTOS OPERATIVOS (OPEX)
                  </span>
                  <span className="text-rose-700 font-extrabold">{formatCurrency(pl.totalOpex)}</span>
                </div>
                <div className="space-y-1 pl-4 text-stone-600">
                  <div className="flex justify-between">
                    <span>• Sueldos y Nómina (Maestros panaderos, horneros y cajeras)</span>
                    <span>{formatCurrency(pl.opexPayroll)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Servicios Fijos (Luz para refrigeradores, agua, internet)</span>
                    <span>{formatCurrency(pl.opexUtilities)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Mantenimiento de Hornos y Amasadoras</span>
                    <span>{formatCurrency(pl.opexMaintenance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Gasolina de Camionetas y Repartos</span>
                    <span>{formatCurrency(pl.opexFuelDelivery)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Otros Gastos Operativos Menores</span>
                    <span>{formatCurrency(pl.opexOther)}</span>
                  </div>
                </div>
              </div>

              {/* Mermas */}
              <div className="p-3 bg-stone-50 flex justify-between font-semibold text-rose-700">
                <span>(-) Costo de Mermas (Pan quemado y sobrante de mostrador)</span>
                <span>{formatCurrency(pl.wasteLoss)}</span>
              </div>

              {/* Utilidad Operativa */}
              <div className="p-3 bg-blue-50/50 flex justify-between font-black text-blue-950 border-y border-blue-200">
                <span className="uppercase">(=) UTILIDAD OPERATIVA (EBITDA)</span>
                <span className="text-sm">{formatCurrency(pl.operatingProfit)} ({pl.operatingMarginPercent}%)</span>
              </div>

              {/* Retiros Don Toño */}
              <div className="p-3 flex justify-between text-stone-600">
                <span>(-) Retiros Personales de Don Toño / Socios</span>
                <span className="font-bold text-stone-800">{formatCurrency(pl.ownerDraws)}</span>
              </div>

              {/* Utilidad Neta Final */}
              <div className="p-3.5 bg-stone-900 text-white flex justify-between items-center font-black">
                <div>
                  <span className="text-xs uppercase tracking-wider text-brito-orange-400 block">(=) UTILIDAD NETA FINAL RETENIDA</span>
                  <span className="text-[11px] font-normal text-stone-400">Rendimiento libre después de costos, gastos y retiros</span>
                </div>
                <div className="text-right">
                  <span className="text-lg text-brito-orange-400 block">{formatCurrency(pl.netProfit)}</span>
                  <span className="text-[10px] text-stone-300 font-bold">Margen Neto: {pl.netMarginPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posición de Tesorería & Deudas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Tesorería */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
              <h5 className="font-black text-stone-900 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                <Wallet className="w-3.5 h-3.5 text-stone-600" /> Posición de Liquidez & Tesorería
              </h5>
              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>• Efectivo en Cajas Mostrador:</span>
                  <strong className="text-stone-900">{formatCurrency(treasury.cashInDrawers)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Cuenta BBVA Bancomer:</span>
                  <strong className="text-stone-900">{formatCurrency(treasury.bancoBBVA)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Cuenta Santander Negocio:</span>
                  <strong className="text-stone-900">{formatCurrency(treasury.bancoSantander)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Caja Chica de Emergencias:</span>
                  <strong className="text-stone-900">{formatCurrency(treasury.pettyCash)}</strong>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5 font-bold text-stone-900">
                  <span>Liquidez Total Inmediata:</span>
                  <span className="text-emerald-700">{formatCurrency(treasury.totalLiquidFunds)}</span>
                </div>
              </div>
            </div>

            {/* Cuentas por Cobrar */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
              <h5 className="font-black text-stone-900 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                <Coins className="w-3.5 h-3.5 text-stone-600" /> Cuentas por Cobrar & Deuda en la Calle
              </h5>
              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>• Crédito a Tienditas / Mayoristas:</span>
                  <strong className="text-rose-700">{formatCurrency(receivables.totalReceivables)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Saldos por liquidar en Pasteles:</span>
                  <strong className="text-amber-700">{formatCurrency(receivables.ordersPendingBalance)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• Clientes con saldo pendiente:</span>
                  <strong className="text-stone-900">{receivables.customersWithDebtCount} tienditas</strong>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5 font-bold text-stone-900">
                  <span>Total Cartera Pendiente:</span>
                  <span className="text-rose-800">
                    {formatCurrency(receivables.totalReceivables + receivables.ordersPendingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Firmas de Autorización */}
          <div className="pt-8 border-t border-stone-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="w-48 mx-auto border-b border-stone-400 mb-2" />
              <p className="font-black text-stone-900">Don Antonio Brito</p>
              <p className="text-[10px] text-stone-500 font-semibold">Propietario & Director General</p>
            </div>
            <div>
              <div className="w-48 mx-auto border-b border-stone-400 mb-2" />
              <p className="font-black text-stone-900">Lupita Brito</p>
              <p className="text-[10px] text-stone-500 font-semibold">Administración & Contabilidad</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
