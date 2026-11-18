import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildCategoryMap,
  CATEGORY_LIST,
  getExpenseCategoryIds,
  getMonthCategoryBudget,
} from '../data/budget2027';
import { BUILTIN_CATEGORY_I18N, MONTHS_BY_LANG } from '../i18n/translations';
import {
  BudgetAlert,
  BudgetAssumptions,
  CategoryMeta,
  CurrencySettings,
  LanguageCode,
  MonthPlan,
  Transaction,
} from '../types/budget';
import { MonthlyExecutionSummary } from './alertsEngine';
import {
  CURRENCY_MAP,
  DEFAULT_CURRENCY_SETTINGS,
  formatBaseMoney,
  getLocaleForLanguage,
} from './currency';

interface PdfExportOptions {
  selectedYear: number;
  projection: MonthPlan[];
  selectedMonth: MonthPlan;
  execution: MonthlyExecutionSummary;
  alerts: BudgetAlert[];
  transactions: Transaction[];
  assumptions: BudgetAssumptions;
  categories?: CategoryMeta[];
  lang?: LanguageCode;
  currencySettings?: CurrencySettings;
}

function localizeCat(cat: CategoryMeta | undefined, fallbackId: string, lang: LanguageCode): string {
  if (!cat) return fallbackId;
  const entry = BUILTIN_CATEGORY_I18N[cat.id]?.[lang];
  if (entry && cat.label === BUILTIN_CATEGORY_I18N[cat.id].es.label) {
    return entry.label;
  }
  return cat.label;
}

export function exportBudgetPdfReport({
  selectedYear,
  projection,
  selectedMonth,
  execution,
  alerts,
  transactions,
  assumptions,
  categories = CATEGORY_LIST,
  lang = 'es',
  currencySettings = DEFAULT_CURRENCY_SETTINGS,
}: PdfExportOptions): void {
  const catMap = buildCategoryMap(categories);
  const expenseCategoryIds = getExpenseCategoryIds(categories);
  const locale = getLocaleForLanguage(lang);
  const fmt = (val: number, showSign = false) =>
    formatBaseMoney(val, currencySettings, lang, showSign);
  const months = MONTHS_BY_LANG[lang];
  const monthLabel = months[selectedMonth.monthIndex]?.name ?? selectedMonth.monthName;
  const monthShort = months[selectedMonth.monthIndex]?.short ?? selectedMonth.shortName;
  const currencyName = CURRENCY_MAP[currencySettings.displayCurrency]?.names[lang] ?? currencySettings.displayCurrency;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const decPlan = projection[11];
  const totalAnnualIncome = projection.reduce((s, m) => s + m.ingresosTotales, 0);
  const totalAnnualExpenses = projection.reduce((s, m) => s + m.gastosTotalesConAhorro, 0);
  const totalAnnualSavings = projection.reduce((s, m) => s + m.ahorro, 0);
  const totalPotentialReserve = decPlan?.reservaTotalAcumulada ?? 0;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const titleText =
    lang === 'en'
      ? `Family Budget ${selectedYear} — Executive Report`
      : lang === 'pt'
        ? `Orçamento Familiar ${selectedYear} — Relatório Executivo`
        : `Presupuesto Familiar ${selectedYear} — Reporte Ejecutivo`;
  doc.text(titleText, 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  const subtitleText =
    lang === 'en'
      ? `Focus month: ${monthLabel} ${selectedYear}  |  Generated: ${new Date().toLocaleDateString(locale)}  |  Currency: ${currencyName}`
      : lang === 'pt'
        ? `Mês foco: ${monthLabel} ${selectedYear}  |  Gerado: ${new Date().toLocaleDateString(locale)}  |  Moeda: ${currencyName}`
        : `Mes focal: ${monthLabel} ${selectedYear}  |  Generado: ${new Date().toLocaleDateString(locale)}  |  Moneda: ${currencyName}`;
  doc.text(subtitleText, 14, 23);

  // Executive KPIs
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    lang === 'en'
      ? `1. Annual Summary & Reserve Goal ${selectedYear}`
      : lang === 'pt'
        ? `1. Resumo Anual e Meta de Reserva ${selectedYear}`
        : `1. Resumen Anual y Meta de Reserva ${selectedYear}`,
    14,
    42,
  );

  const kpiHead =
    lang === 'en'
      ? [['Key Indicator', 'Projected Value', 'Notes']]
      : lang === 'pt'
        ? [['Indicador-chave', 'Valor projetado', 'Critério / Observação']]
        : [['Indicador clave', 'Valor proyectado', 'Criterio / Observación']];

  const kpiRows =
    lang === 'en'
      ? [
          ['Total annual income', fmt(totalAnnualIncome), `Employer allowance ${fmt(assumptions.aporteEmpresaAlquiler)}/mo + Jul/Dec bonuses`],
          ['Total outflows + savings', fmt(totalAnnualExpenses), `Includes tithe (${fmt(assumptions.diezmoMensual)}/mo) & scheduled savings`],
          ['Annual scheduled savings', fmt(totalAnnualSavings), `${fmt(assumptions.ahorroMensual)} x 12 months (set aside on payday)`],
          ['Accumulated surplus by Dec.', fmt(decPlan?.saldoAcumulado ?? 0), assumptions.incluirReservaDic2026 ? `Includes starting reserve (${fmt(assumptions.reservaDic2026)})` : `Starts at ${fmt(0)} in Jan ${selectedYear}`],
          ['Total potential reserve', fmt(totalPotentialReserve), `Target goal: ${fmt(assumptions.metaReservaMin)} – ${fmt(assumptions.metaReservaMax)}`],
        ]
      : lang === 'pt'
        ? [
            ['Receitas totais anuais', fmt(totalAnnualIncome), `Auxílio empresa ${fmt(assumptions.aporteEmpresaAlquiler)}/mês + 13º jul/dez`],
            ['Despesas totais + poupança', fmt(totalAnnualExpenses), `Inclui dízimo (${fmt(assumptions.diezmoMensual)}/mês) e poupança programada`],
            ['Poupança programada anual', fmt(totalAnnualSavings), `${fmt(assumptions.ahorroMensual)} x 12 meses (separada ao receber)`],
            ['Saldo acumulado até dez.', fmt(decPlan?.saldoAcumulado ?? 0), assumptions.incluirReservaDic2026 ? `Inclui reserva inicial (${fmt(assumptions.reservaDic2026)})` : `Inicia em ${fmt(0)} em jan ${selectedYear}`],
            ['Reserva total potencial', fmt(totalPotentialReserve), `Meta objetivo: ${fmt(assumptions.metaReservaMin)} – ${fmt(assumptions.metaReservaMax)}`],
          ]
        : [
            ['Ingresos totales anuales', fmt(totalAnnualIncome), `Aporte empresa ${fmt(assumptions.aporteEmpresaAlquiler)}/mes + aguinaldos jul/dic`],
            ['Egresos totales + ahorro', fmt(totalAnnualExpenses), `Incluye diezmo (${fmt(assumptions.diezmoMensual)}/mes) y ahorro programado`],
            ['Ahorro programado anual', fmt(totalAnnualSavings), `${fmt(assumptions.ahorroMensual)} x 12 meses (separado al cobrar)`],
            ['Excedente acumulado a dic.', fmt(decPlan?.saldoAcumulado ?? 0), assumptions.incluirReservaDic2026 ? `Incluye reserva inicial (${fmt(assumptions.reservaDic2026)})` : `Inicia en ${fmt(0)} en enero ${selectedYear}`],
            ['Reserva total potencial', fmt(totalPotentialReserve), `Meta objetivo: ${fmt(assumptions.metaReservaMin)} – ${fmt(assumptions.metaReservaMax)}`],
          ];

  autoTable(doc, {
    startY: 45,
    head: kpiHead,
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Alerts summary
  const afterKpiY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 95;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    lang === 'en'
      ? `2. Active Alerts & Surplus (${monthLabel} ${selectedYear})`
      : lang === 'pt'
        ? `2. Alertas Ativos e Superávit (${monthLabel} ${selectedYear})`
        : `2. Alertas Activas y Superávit (${monthLabel} ${selectedYear})`,
    14,
    afterKpiY + 10,
  );

  const alertRows = alerts.slice(0, 8).map((a) => [
    a.severity === 'overspend'
      ? lang === 'en'
        ? 'OVERSPEND'
        : lang === 'pt'
          ? 'ESTOURO'
          : 'SOBREGASTO'
      : a.severity === 'warning'
        ? lang === 'en'
          ? 'AT LIMIT'
          : lang === 'pt'
            ? 'NO LIMITE'
            : 'AL LÍMITE'
        : 'SUPERÁVIT',
    a.title,
    a.message,
  ]);

  const alertHead =
    lang === 'en'
      ? [['Status', 'Alert', 'Details']]
      : lang === 'pt'
        ? [['Estado', 'Alerta', 'Detalhe']]
        : [['Estado', 'Alerta', 'Detalle']];

  const emptyAlertRow =
    lang === 'en'
      ? [['NORMAL', 'No critical alerts', 'Budget is operating within expected ranges.']]
      : lang === 'pt'
        ? [['NORMAL', 'Sem alertas críticos', 'O orçamento opera dentro das faixas esperadas.']]
        : [['NORMAL', 'Sin alertas críticas', 'El presupuesto opera dentro de los rangos esperados.']];

  autoTable(doc, {
    startY: afterKpiY + 13,
    head: alertHead,
    body: alertRows.length > 0 ? alertRows : emptyAlertRow,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 54 },
    },
    margin: { left: 14, right: 14 },
  });

  // Page 2: Full 12-month Balance Table
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    lang === 'en'
      ? `3. Full ${selectedYear} Monthly Balance (Projection)`
      : lang === 'pt'
        ? `3. Balanço Mensal Completo ${selectedYear} (Projeção)`
        : `3. Balance Mensual Completo ${selectedYear} (Proyección)`,
    14,
    18,
  );

  const balanceHead =
    lang === 'en'
      ? [['Month', 'Income', 'Exp. + Sav.', 'Pocket Rent', 'Monthly Bal.', 'Cumul. Bal.']]
      : lang === 'pt'
        ? [['Mês', 'Receitas', 'Desp. + Poup.', 'Alug. Bolso', 'Saldo Mensal', 'Saldo Acum.']]
        : [['Mes', 'Ingresos', 'Gastos + Ahorro', 'Alq. Bolsillo', 'Saldo Mensual', 'Saldo Acum.']];

  autoTable(doc, {
    startY: 22,
    head: balanceHead,
    body: projection.map((m) => [
      months[m.monthIndex]?.name ?? m.monthName,
      fmt(m.ingresosTotales),
      fmt(m.gastosTotalesConAhorro),
      fmt(m.alquilerBolsillo),
      fmt(m.saldoMensual, true),
      fmt(m.saldoAcumulado),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Selected Month Category Execution
  const afterAnnualY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    lang === 'en'
      ? `4. Category Execution — ${monthLabel} ${selectedYear}`
      : lang === 'pt'
        ? `4. Execução por Categoria — ${monthLabel} ${selectedYear}`
        : `4. Ejecución por Categoría — ${monthLabel} ${selectedYear}`,
    14,
    afterAnnualY + 10,
  );

  const catHead =
    lang === 'en'
      ? [['Category', 'Budget', 'Actual', 'Remaining', '% Used']]
      : lang === 'pt'
        ? [['Categoria', 'Orçamento', 'Executado Real', 'Disponível', '% Uso']]
        : [['Categoría', 'Presupuesto', 'Ejecutado Real', 'Disponible', '% Uso']];

  autoTable(doc, {
    startY: afterAnnualY + 13,
    head: catHead,
    body: expenseCategoryIds.map((catId) => {
      const budget = getMonthCategoryBudget(selectedMonth, catId);
      const actual = execution.actualByCategory[catId] ?? 0;
      const pct = budget > 0 ? ((actual / budget) * 100).toFixed(1) + '%' : '—';
      return [
        localizeCat(catMap[catId], catId, lang),
        fmt(budget),
        fmt(actual),
        fmt(budget - actual),
        pct,
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Page 3 (if transactions exist)
  const monthTxs = transactions.filter((t) => {
    const parts = t.date.split('-');
    const y = parseInt(parts[0] ?? '0', 10);
    const m = parseInt(parts[1] ?? '0', 10) - 1;
    return y === selectedYear && m === selectedMonth.monthIndex;
  });
  if (monthTxs.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      lang === 'en'
        ? `5. Logged Transactions — ${monthLabel} ${selectedYear}`
        : lang === 'pt'
          ? `5. Lançamentos Registrados — ${monthLabel} ${selectedYear}`
          : `5. Movimientos Registrados — ${monthLabel} ${selectedYear}`,
      14,
      18,
    );

    const txHead =
      lang === 'en'
        ? [['Date', 'Description', 'Category', 'Recorded by', 'Type', 'Amount']]
        : lang === 'pt'
          ? [['Data', 'Descrição', 'Categoria', 'Registrado por', 'Tipo', 'Valor']]
          : [['Fecha', 'Descripción', 'Categoría', 'Registrado por', 'Tipo', 'Importe']];

    autoTable(doc, {
      startY: 22,
      head: txHead,
      body: monthTxs
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((t) => [
          t.date,
          t.description,
          localizeCat(catMap[t.category], t.category, lang),
          t.createdByName ?? (lang === 'en' ? 'Unassigned' : lang === 'pt' ? 'Sem atribuição' : 'Sin asignar'),
          t.type === 'income'
            ? lang === 'en'
              ? 'Income'
              : lang === 'pt'
                ? 'Receita'
                : 'Ingreso'
            : lang === 'en'
              ? 'Expense'
              : lang === 'pt'
                ? 'Despesa'
                : 'Gasto',
          fmt(t.amount),
        ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  const filePrefix =
    lang === 'en'
      ? 'Family_Budget'
      : lang === 'pt'
        ? 'Orcamento_Familiar'
        : 'Presupuesto_Familiar';
  doc.save(`${filePrefix}_${selectedYear}_${monthShort}_${currencySettings.displayCurrency}.pdf`);
}
