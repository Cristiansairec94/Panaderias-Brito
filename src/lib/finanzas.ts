import { ExpenseRecord, ShiftCutRecord, Customer, CustomOrder, CashIncome, Branch } from "@/types";

export type FinancialPeriod = "hoy" | "semana" | "mes" | "mes_anterior" | "trimestre" | "anio";

export interface PLStatement {
  grossSales: number;
  counterSales: number;
  wholesaleSales: number;
  ordersSales: number;
  otherIncomes: number;
  // Cost of Goods Sold (COGS)
  cogsIngredients: number; // Harinas, materias primas
  cogsGasLP: number;        // Gas de hornos
  cogsPackaging: number;    // Bolsas kraft, domos
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  // Operating Expenses (OPEX)
  opexPayroll: number;      // Nóminas de maestros y cajeras
  opexUtilities: number;    // Luz, agua, internet
  opexMaintenance: number;  // Refacciones, hornos
  opexFuelDelivery: number; // Gasolina repartos
  opexOther: number;        // Gastos menores
  totalOpex: number;
  // Losses / Waste
  wasteLoss: number;        // Mermas de horno y mostrador
  // Operating Profit (EBITDA)
  operatingProfit: number;
  operatingMarginPercent: number;
  // Owner Draw
  ownerDraws: number;       // Retiros Don Toño / Socios
  // Net Profit
  netProfit: number;
  netMarginPercent: number;
}

export interface TreasuryPosition {
  cashInDrawers: number;     // Efectivo en gavetas de mostrador (todas o sucursal)
  bancoBBVA: number;         // Cuenta BBVA Bancomer Don Toño
  bancoSantander: number;    // Cuenta Santander Negocio Brito
  cardTerminalHold: number;  // Ventas con tarjeta en proceso de liquidación
  cardCommissionEstimated: number; // Comisión bancaria estimada (3%)
  pettyCash: number;         // Caja chica de emergencias
  totalLiquidFunds: number;  // Total liquidez disponible
}

export interface ReceivablesSummary {
  totalReceivables: number;
  customersWithDebtCount: number;
  topDebtors: {
    customer: Customer;
    pendingAmount: number;
    daysOverdue: number;
    isOverLimit: boolean;
  }[];
  ordersPendingBalance: number;
}

export interface BakeryKPIs {
  ticketAverage: number;
  totalTicketsCount: number;
  dailyBreakEven: number;    // Punto de equilibrio diario estimado en $
  breakEvenPieces: number;   // Piezas de pan diarias estimadas (~$10-$12 promedio)
  wasteCostShare: number;    // % de pérdida por merma sobre venta bruta
  busiestDay: string;
  coverageDays: number;      // Días de operación cubiertos con efectivo disponible
  healthStatus: "excelente" | "saludable" | "atencion";
  healthScore: number;       // Puntuación 0-100
}

export interface CashFlowDay {
  day: string;
  shortDay: string;
  dateStr: string;
  income: number;
  expenses: number;
  net: number;
  isPeak: boolean;
}

export interface FullFinancialSummary {
  period: FinancialPeriod;
  periodLabel: string;
  branchFilter: string;      // 'todas' o branchId
  branchName: string;
  pl: PLStatement;
  treasury: TreasuryPosition;
  receivables: ReceivablesSummary;
  kpis: BakeryKPIs;
  cashFlow: CashFlowDay[];
}

// ─── Helpers de almacenamiento seguro ──────────────────────────────────────────

export function getStoredExpenses(): ExpenseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brito_gastos_registro");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading expenses from storage", e);
  }
  return [];
}

export function getStoredShiftCuts(): ShiftCutRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brito_shift_cuts_history");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading cuts from storage", e);
  }
  return [];
}

export function getStoredCustomersData(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brito_customers");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading customers from storage", e);
  }
  return [];
}

export function getStoredOrdersData(): CustomOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brito_custom_orders");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading orders from storage", e);
  }
  return [];
}

export function getStoredCashIncomes(): CashIncome[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("brito_cash_incomes");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading incomes from storage", e);
  }
  return [];
}

// ─── Motor de Consolidación Financiera ────────────────────────────────────────

export function calculateFinancialSummary({
  period,
  branchId,
  branches,
}: {
  period: FinancialPeriod;
  branchId: string; // "todas" | "branch-matriz" | etc.
  branches: Branch[];
}): FullFinancialSummary {
  const isAll = !branchId || branchId === "todas";
  const targetBranch = branches.find((b) => b.id === branchId);
  const branchName = isAll ? "Consolidado (Todas las sucursales)" : (targetBranch?.name || "Sucursal");

  // Period multiplier and weights to provide realistic time-series projections
  // based on active branch operations and shift history
  let multiplier = 1;
  let periodLabel = "Hoy";
  if (period === "semana") {
    multiplier = 6.2;
    periodLabel = "Esta Semana";
  } else if (period === "mes") {
    multiplier = 26.5;
    periodLabel = "Este Mes";
  } else if (period === "mes_anterior") {
    multiplier = 25.8;
    periodLabel = "Mes Anterior";
  } else if (period === "trimestre") {
    multiplier = 79.5;
    periodLabel = "Trimestre Actual";
  } else if (period === "anio") {
    multiplier = 318;
    periodLabel = "Año en Curso";
  }

  // Multi-branch base values (100% reales sin montos ficticios)
  const activeBranches = isAll ? branches : branches.filter((b) => b.id === branchId);
  const totalBaseSalesToday = activeBranches.reduce((acc, b) => acc + (b.todaySales || 0), 0);
  const totalTicketsToday = activeBranches.reduce((acc, b) => acc + (b.todayTickets || 0), 0);
  const totalCashDrawer = activeBranches.reduce((acc, b) => acc + (b.cashInDrawer || 0), 0);

  // Real Expenses from storage
  const allExpenses = getStoredExpenses().filter((g) => g.status !== "anulado");
  const filteredExpenses = isAll
    ? allExpenses
    : allExpenses.filter((g) => g.branchId === branchId);

  // Group real expenses by category
  let sumInsumos = 0;
  let sumGasLP = 0;
  let sumEmpaques = 0;
  let sumNomina = 0;
  let sumServicios = 0;
  let sumMantenimiento = 0;
  let sumGasolina = 0;
  let sumRetiroDueno = 0;
  let sumOtros = 0;

  filteredExpenses.forEach((g) => {
    const amt = Number(g.amount) || 0;
    switch (g.category) {
      case "insumos":
      case "proveedores":
      case "compra_insumos":
        sumInsumos += amt;
        break;
      case "gas_lp":
      case "gasto_gas":
        sumGasLP += amt;
        break;
      case "empaques":
        sumEmpaques += amt;
        break;
      case "nomina":
      case "retiro_personal":
        sumNomina += amt;
        break;
      case "servicios":
        sumServicios += amt;
        break;
      case "mantenimiento":
        sumMantenimiento += amt;
        break;
      case "gasolina":
        sumGasolina += amt;
        break;
      case "retiro_dueno":
        sumRetiroDueno += amt;
        break;
      default:
        sumOtros += amt;
        break;
    }
  });

  const allIncomes = getStoredCashIncomes();
  const filteredIncomes = isAll
    ? allIncomes
    : allIncomes.filter((inc) => !inc.branchId || inc.branchId === branchId);

  const realOtherIncomes = filteredIncomes
    .filter((inc) => inc.category === "otros_ingresos" || inc.category === "venta_costales")
    .reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0);

  const allOrders = getStoredOrdersData();
  const filteredOrders = isAll
    ? allOrders
    : allOrders.filter((o) => !o.branchId || o.branchId === branchId);
  const realOrdersRevenue = filteredOrders
    .filter((o) => o.status !== "cancelado")
    .reduce((acc, o) => acc + (Number(o.deposit) || 0), 0);

  // Ventas reales sin inflar con datos ficticios
  const estimatedGrossSales = Math.round(totalBaseSalesToday * (period === "hoy" ? 1 : 1));
  const ordersSales = Math.min(estimatedGrossSales, realOrdersRevenue);
  const otherIncomes = realOtherIncomes;
  const counterSales = Math.max(0, estimatedGrossSales - ordersSales);
  const wholesaleSales = 0;

  // Costos reales basados únicamente en los gastos registrados
  const cogsIngredients = sumInsumos;
  const cogsGasLP = sumGasLP;
  const cogsPackaging = sumEmpaques;
  const totalCogs = cogsIngredients + cogsGasLP + cogsPackaging;

  const grossProfit = Math.max(0, estimatedGrossSales + otherIncomes - totalCogs);
  const grossMarginPercent = estimatedGrossSales > 0 ? Number(((grossProfit / estimatedGrossSales) * 100).toFixed(1)) : 0;

  // Gastos operativos reales
  const opexPayroll = sumNomina;
  const opexUtilities = sumServicios;
  const opexMaintenance = sumMantenimiento;
  const opexFuelDelivery = sumGasolina;
  const opexOther = sumOtros;
  const totalOpex = opexPayroll + opexUtilities + opexMaintenance + opexFuelDelivery + opexOther;

  const wasteLoss = 0;

  // Operating Profit (EBITDA)
  const operatingProfit = Math.max(0, grossProfit - totalOpex - wasteLoss);
  const operatingMarginPercent = estimatedGrossSales > 0 ? Number(((operatingProfit / estimatedGrossSales) * 100).toFixed(1)) : 0;

  // Owner Draws (Don Toño)
  const ownerDraws = sumRetiroDueno;

  // Net Profit
  const netProfit = Math.max(0, operatingProfit - ownerDraws);
  const netMarginPercent = estimatedGrossSales > 0 ? Number(((netProfit / estimatedGrossSales) * 100).toFixed(1)) : 0;

  const pl: PLStatement = {
    grossSales: estimatedGrossSales,
    counterSales,
    wholesaleSales,
    ordersSales,
    otherIncomes,
    cogsIngredients,
    cogsGasLP,
    cogsPackaging,
    totalCogs,
    grossProfit,
    grossMarginPercent,
    opexPayroll,
    opexUtilities,
    opexMaintenance,
    opexFuelDelivery,
    opexOther,
    totalOpex,
    wasteLoss,
    operatingProfit,
    operatingMarginPercent,
    ownerDraws,
    netProfit,
    netMarginPercent,
  };

  // ─── Treasury & Liquidity Position (100% Real) ──────────────────────────────
  const cashInDrawers = totalCashDrawer;
  const totalTransferSales = activeBranches.reduce((acc, b) => acc + (b.currentShift?.transferSales || 0), 0);
  const totalCardSales = activeBranches.reduce((acc, b) => acc + (b.currentShift?.cardSales || 0), 0);
  const bancoBBVA = totalTransferSales;
  const bancoSantander = 0;
  const cardTerminalHold = totalCardSales;
  const cardCommissionEstimated = Math.round(cardTerminalHold * 0.03); // 3% fee
  const pettyCash = 0;
  const totalLiquidFunds = cashInDrawers + bancoBBVA + bancoSantander + pettyCash + (cardTerminalHold - cardCommissionEstimated);

  const treasury: TreasuryPosition = {
    cashInDrawers,
    bancoBBVA,
    bancoSantander,
    cardTerminalHold,
    cardCommissionEstimated,
    pettyCash,
    totalLiquidFunds,
  };

  // ─── Receivables (Crédito a Mayoristas) ────────────────────────────────────
  const allCustomers = getStoredCustomersData();
  const debtors = allCustomers
    .filter((c) => (c.currentDebt || 0) > 0)
    .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0));

  const totalReceivables = debtors.reduce((acc, c) => acc + (c.currentDebt || 0), 0);

  const ordersPendingBalance = filteredOrders
    .filter((o) => o.status !== "cancelado" && o.status !== "entregado")
    .reduce((acc, o) => acc + (o.remainingBalance || 0), 0);

  const receivables: ReceivablesSummary = {
    totalReceivables,
    customersWithDebtCount: debtors.length,
    topDebtors: debtors.slice(0, 5).map((c) => ({
      customer: c,
      pendingAmount: c.currentDebt || 0,
      daysOverdue: 0,
      isOverLimit: (c.currentDebt || 0) > (c.creditLimit || 0) && (c.creditLimit || 0) > 0,
    })),
    ordersPendingBalance,
  };

  // ─── Bakery KPIs & Efficiency ───────────────────────────────────────────────
  const totalTickets = totalTicketsToday;
  const ticketAverage = totalTickets > 0 ? Math.round(estimatedGrossSales / totalTickets) : 0;
  const dailyFixedCosts = Math.round((totalOpex / Math.max(1, multiplier)) * 0.8);
  const grossMarginRatio = grossMarginPercent > 0 ? grossMarginPercent / 100 : 1;
  const dailyBreakEven = grossMarginRatio > 0 ? Math.round(dailyFixedCosts / grossMarginRatio) : 0;

  const avgBreadPrice = 11;
  const breakEvenPieces = dailyBreakEven > 0 ? Math.round(dailyBreakEven / avgBreadPrice) : 0;

  const daysInPeriod = period === "hoy" ? 1 : period === "semana" ? 7 : period === "mes" || period === "mes_anterior" ? 30 : period === "trimestre" ? 90 : 365;
  const dailyBurn = (totalCogs + totalOpex) / daysInPeriod;
  const coverageDays = dailyBurn > 0 ? Number((totalLiquidFunds / dailyBurn).toFixed(1)) : 0;

  let healthScore = estimatedGrossSales > 0 ? 85 : 100;
  const healthStatus: "excelente" | "saludable" | "atencion" =
    healthScore >= 80 ? "excelente" : healthScore >= 60 ? "saludable" : "atencion";

  const kpis: BakeryKPIs = {
    ticketAverage,
    totalTicketsCount: totalTickets,
    dailyBreakEven,
    breakEvenPieces,
    wasteCostShare: estimatedGrossSales > 0 ? Number(((wasteLoss / estimatedGrossSales) * 100).toFixed(1)) : 0,
    busiestDay: estimatedGrossSales > 0 ? "En Operación" : "Sin registros aún",
    coverageDays,
    healthStatus,
    healthScore,
  };

  // ─── Weekly Cash Flow Simulation ───────────────────────────────────────────
  const dayRatios = [
    { day: "Lunes", short: "Lun", incRatio: 0.11, expRatio: 0.12, isPeak: false },
    { day: "Martes", short: "Mar", incRatio: 0.12, expRatio: 0.10, isPeak: false },
    { day: "Miércoles", short: "Mié", incRatio: 0.13, expRatio: 0.14, isPeak: false },
    { day: "Jueves", short: "Jue", incRatio: 0.13, expRatio: 0.11, isPeak: false },
    { day: "Viernes", short: "Vie", incRatio: 0.16, expRatio: 0.18, isPeak: false },
    { day: "Sábado", short: "Sáb", incRatio: 0.19, expRatio: 0.20, isPeak: true },
    { day: "Domingo", short: "Dom", incRatio: 0.16, expRatio: 0.15, isPeak: true },
  ];

  const cashFlow: CashFlowDay[] = dayRatios.map((d) => {
    const inc = Math.round(estimatedGrossSales * d.incRatio);
    const exp = Math.round((totalCogs + totalOpex) * d.expRatio);
    return {
      day: d.day,
      shortDay: d.short,
      dateStr: d.day,
      income: inc,
      expenses: exp,
      net: inc - exp,
      isPeak: d.isPeak,
    };
  });

  return {
    period,
    periodLabel,
    branchFilter: branchId,
    branchName,
    pl,
    treasury,
    receivables,
    kpis,
    cashFlow,
  };
}

// ─── Exportación a CSV Formateado para Excel (UTF-8 BOM) ──────────────────────
export function exportFinancialSummaryToCSV(summary: FullFinancialSummary): void {
  const { pl, treasury, receivables, kpis, periodLabel, branchName } = summary;

  const rows = [
    ["PANADERIAS BRITO - REPORTE Y ESTADO FINANCIERO OFICIAL"],
    ["Periodo:", periodLabel],
    ["Sucursal:", branchName],
    ["Fecha de Generacion:", new Date().toLocaleDateString("es-MX", { dateStyle: "long" })],
    [],
    ["1. ESTADO DE RESULTADOS (P&L)", "Monto (MXN)", "% sobre Ventas"],
    ["(+) Ventas Brutas Totales", pl.grossSales, "100.0%"],
    ["  - Venta en Mostrador (Efectivo/Tarjeta)", pl.counterSales, `${((pl.counterSales / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Tienditas y Mayoristas", pl.wholesaleSales, `${((pl.wholesaleSales / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Encargos Especiales y Pasteles", pl.ordersSales, `${((pl.ordersSales / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Otros Ingresos", pl.otherIncomes, `${((pl.otherIncomes / pl.grossSales) * 100).toFixed(1)}%`],
    [],
    ["(-) Costo de Ventas (COGS / Produccion)", pl.totalCogs, `${((pl.totalCogs / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Harinas, Mantecas, Azucar e Insumos", pl.cogsIngredients, `${((pl.cogsIngredients / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Gas LP Hornos de Lena/Gas", pl.cogsGasLP, `${((pl.cogsGasLP / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Bolsas Kraft y Empaques", pl.cogsPackaging, `${((pl.cogsPackaging / pl.grossSales) * 100).toFixed(1)}%`],
    [],
    ["(=) MARGEN BRUTO RESULTANTE", pl.grossProfit, `${pl.grossMarginPercent}%`],
    [],
    ["(-) Gastos Operativos (OPEX)", pl.totalOpex, `${((pl.totalOpex / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Nominas y Sueldos Panaderos/Cajeras", pl.opexPayroll, `${((pl.opexPayroll / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Servicios Fijos (Luz CFE, Agua, Internet)", pl.opexUtilities, `${((pl.opexUtilities / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Mantenimiento Hornos y Amasadoras", pl.opexMaintenance, `${((pl.opexMaintenance / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Gasolina Repartos", pl.opexFuelDelivery, `${((pl.opexFuelDelivery / pl.grossSales) * 100).toFixed(1)}%`],
    ["  - Otros Gastos Menores", pl.opexOther, `${((pl.opexOther / pl.grossSales) * 100).toFixed(1)}%`],
    ["(-) Costo de Mermas (Pan Frio)", pl.wasteLoss, `${((pl.wasteLoss / pl.grossSales) * 100).toFixed(1)}%`],
    [],
    ["(=) UTILIDAD OPERATIVA (EBITDA)", pl.operatingProfit, `${pl.operatingMarginPercent}%`],
    ["(-) Retiros Personales Don Tono / Socios", pl.ownerDraws, `${((pl.ownerDraws / pl.grossSales) * 100).toFixed(1)}%`],
    [],
    ["(=) UTILIDAD NETA FINAL REAL", pl.netProfit, `${pl.netMarginPercent}%`],
    [],
    ["2. POSICION DE TESORERIA Y DISPONIBLE", "Monto (MXN)"],
    ["Efectivo en Cajas", treasury.cashInDrawers],
    ["BBVA Bancomer (Don Tono)", treasury.bancoBBVA],
    ["Santander Negocio (Tarjetas)", treasury.bancoSantander],
    ["Caja Chica Emergencias", treasury.pettyCash],
    ["TOTAL LIQUIDEZ INMEDIATA", treasury.totalLiquidFunds],
    [],
    ["3. METRICAS Y EFICIENCIA DE PANADERIA", "Valor"],
    ["Ticket Promedio en Mostrador", `$${kpis.ticketAverage}`],
    ["Total de Tickets Emitidos", kpis.totalTicketsCount],
    ["Punto de Equilibrio Diario ($)", `$${kpis.dailyBreakEven}`],
    ["Punto de Equilibrio Diario (Piezas de Pan)", `${kpis.breakEvenPieces} piezas`],
    ["Porcentaje de Mermas de Produccion", `${kpis.wasteCostShare}%`],
    ["Dias de Cobertura de Caja Operativa", `${kpis.coverageDays} dias`],
    ["Cartera Fiada a Tienditas / Mayoristas", `$${receivables.totalReceivables}`],
    ["Pedidos Pendientes por Liquidar", `$${receivables.ordersPendingBalance}`]
  ];

  const csvContent = "\uFEFF" + rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Balance_Financiero_Brito_${periodLabel.replace(/\s+/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Generador de Resumen para WhatsApp ───────────────────────────────────────
export function generateWhatsAppFinancialSummary(summary: FullFinancialSummary): string {
  const { pl, treasury, receivables, kpis, periodLabel, branchName } = summary;
  return `🥖 *PANADERÍAS BRITO* — *BALANCE FINANCIERO*
📅 *Periodo:* ${periodLabel} | *Sucursal:* ${branchName}
━━━━━━━━━━━━━━━━━━━━
💰 *Ventas Brutas:* $${pl.grossSales.toLocaleString("es-MX")}
🌾 *Costo Producción (COGS):* -$${pl.totalCogs.toLocaleString("es-MX")}
📊 *Margen Bruto:* $${pl.grossProfit.toLocaleString("es-MX")} (${pl.grossMarginPercent}%)
🏢 *Gastos Operativos (OPEX):* -$${pl.totalOpex.toLocaleString("es-MX")}
📉 *Mermas de Pan:* -$${pl.wasteLoss.toLocaleString("es-MX")}
━━━━━━━━━━━━━━━━━━━━
🔥 *UTILIDAD NETA LIBRE:* $${pl.netProfit.toLocaleString("es-MX")} (*${pl.netMarginPercent}%*)
🏦 *Liquidez en Tesorería:* $${treasury.totalLiquidFunds.toLocaleString("es-MX")}
🥖 *Punto Equilibrio:* $${kpis.dailyBreakEven.toLocaleString("es-MX")} (~${kpis.breakEvenPieces} pzas/día)
🏪 *Cartera Fiada a Tienditas:* $${receivables.totalReceivables.toLocaleString("es-MX")}
🛡️ *Días de Cobertura:* ${kpis.coverageDays} días`;
}
