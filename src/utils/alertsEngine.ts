import {
  buildCategoryMap,
  CATEGORY_LIST,
  getDailyVariableCategoryIds,
  getExpenseCategoryIds,
  getMonthCategoryBudget,
} from '../data/budget2027';
import { BUILTIN_CATEGORY_I18N, MONTHS_BY_LANG } from '../i18n/translations';
import {
  AlertRules,
  BudgetAlert,
  BudgetAssumptions,
  CategoryMeta,
  CurrencySettings,
  ExpenseCategoryId,
  LanguageCode,
  MonthPlan,
  Transaction,
} from '../types/budget';
import {
  convertBetweenCurrencies,
  DEFAULT_CURRENCY_SETTINGS,
  formatBaseMoney,
} from './currency';

export interface MonthlyExecutionSummary {
  monthIndex: number;
  actualByCategory: Record<ExpenseCategoryId, number>;
  actualIncomeTotal: number;
  actualExpenseTotal: number;
  actualDailyVariableTotal: number;
  budgetDailyVariableTotal: number;
  dailyCapBase: number;
  dailyCapDynamic: number;
  spentToday: number;
  spentBeforeTodayVariable: number;
  remainingDays: number;
  monthProgressPct: number;
}

export function getTransactionYear(dateStr: string): number {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] ?? '2027', 10);
  return Number.isNaN(y) ? 2027 : y;
}

export function getTransactionMonthIndex(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length < 2) return 0;
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(m) || m < 1 || m > 12) return 0;
  return m - 1;
}

export function getTransactionDay(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length < 3) return 1;
  const d = parseInt(parts[2], 10);
  return Number.isNaN(d) ? 1 : d;
}

export function computeMonthlyExecution(
  monthPlan: MonthPlan,
  transactions: Transaction[],
  referenceDay: number,
  alertRules: AlertRules,
  selectedYear = 2027,
  categories: CategoryMeta[] = CATEGORY_LIST,
): MonthlyExecutionSummary {
  const catMap = buildCategoryMap(categories);
  const expenseCategoryIds = getExpenseCategoryIds(categories);
  const dailyVariableCategoryIds = getDailyVariableCategoryIds(categories);

  const actualByCategory = expenseCategoryIds.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<ExpenseCategoryId, number>,
  );

  let actualIncomeTotal = 0;
  let actualExpenseTotal = 0;
  let spentToday = 0;
  let spentBeforeTodayVariable = 0;

  const monthTransactions = transactions.filter(
    (t) =>
      getTransactionYear(t.date) === selectedYear &&
      getTransactionMonthIndex(t.date) === monthPlan.monthIndex,
  );

  for (const tx of monthTransactions) {
    if (tx.type === 'income') {
      actualIncomeTotal += tx.amount;
    } else {
      actualExpenseTotal += tx.amount;
      const catId = tx.category as ExpenseCategoryId;
      actualByCategory[catId] = (actualByCategory[catId] ?? 0) + tx.amount;
      if (catMap[catId]?.isDailyVariable) {
        const day = getTransactionDay(tx.date);
        if (day === referenceDay) {
          spentToday += tx.amount;
        } else if (day < referenceDay) {
          spentBeforeTodayVariable += tx.amount;
        }
      }
    }
  }

  let budgetDailyVariableTotal = 0;
  let actualDailyVariableTotal = 0;
  for (const catId of dailyVariableCategoryIds) {
    const cap = alertRules.categoryCustomCaps[catId] ?? getMonthCategoryBudget(monthPlan, catId);
    budgetDailyVariableTotal += cap;
    actualDailyVariableTotal += actualByCategory[catId] ?? 0;
  }

  const clampedDay = Math.min(Math.max(1, referenceDay), monthPlan.daysInMonth);
  const remainingDays = Math.max(1, monthPlan.daysInMonth - clampedDay + 1);
  const dailyCapBase = budgetDailyVariableTotal / monthPlan.daysInMonth;
  const remainingVariablePool = Math.max(0, budgetDailyVariableTotal - spentBeforeTodayVariable);
  const dailyCapDynamic = remainingVariablePool / remainingDays;
  const monthProgressPct = (clampedDay / monthPlan.daysInMonth) * 100;

  return {
    monthIndex: monthPlan.monthIndex,
    actualByCategory,
    actualIncomeTotal,
    actualExpenseTotal,
    actualDailyVariableTotal,
    budgetDailyVariableTotal,
    dailyCapBase,
    dailyCapDynamic,
    spentToday,
    spentBeforeTodayVariable,
    remainingDays,
    monthProgressPct,
  };
}

function getLocalizedCatName(cat: CategoryMeta, lang: LanguageCode): string {
  const entry = BUILTIN_CATEGORY_I18N[cat.id]?.[lang];
  if (entry && cat.label === BUILTIN_CATEGORY_I18N[cat.id].es.label) {
    return entry.label;
  }
  return cat.label;
}

export function evaluateBudgetAlerts(
  projection: MonthPlan[],
  selectedMonthIndex: number,
  referenceDay: number,
  transactions: Transaction[],
  alertRules: AlertRules,
  assumptions: BudgetAssumptions,
  selectedYear = 2027,
  categories: CategoryMeta[] = CATEGORY_LIST,
  options?: {
    lang?: LanguageCode;
    currencySettings?: CurrencySettings;
  },
): BudgetAlert[] {
  const lang: LanguageCode = options?.lang ?? 'es';
  const currencySettings: CurrencySettings = options?.currencySettings ?? DEFAULT_CURRENCY_SETTINGS;
  const fmt = (val: number, showSign = false) =>
    formatBaseMoney(val, currencySettings, lang, showSign);
  const monthName =
    MONTHS_BY_LANG[lang][selectedMonthIndex]?.name ??
    projection[selectedMonthIndex]?.monthName ??
    '';

  const alerts: BudgetAlert[] = [];
  const monthPlan = projection[selectedMonthIndex];
  if (!monthPlan) return alerts;

  const catMap = buildCategoryMap(categories);
  const expenseCategoryIds = getExpenseCategoryIds(categories);

  const exec = computeMonthlyExecution(
    monthPlan,
    transactions,
    referenceDay,
    alertRules,
    selectedYear,
    categories,
  );
  const hasMonthlyExpenses = exec.actualExpenseTotal > 0;

  // 1. Daily Cap Overspend or Surplus Alert
  if (exec.spentToday > 0) {
    const dailyPct = exec.dailyCapDynamic > 0 ? (exec.spentToday / exec.dailyCapDynamic) * 100 : 100;
    if (dailyPct > alertRules.dailyCapWarningPct) {
      const excess = exec.spentToday - exec.dailyCapDynamic;
      const dailyAdj = fmt(excess / Math.max(1, exec.remainingDays - 1));
      alerts.push({
        id: `daily-over-${monthPlan.monthIndex}-${referenceDay}`,
        severity: 'overspend',
        scope: 'daily',
        monthIndex: monthPlan.monthIndex,
        title:
          lang === 'en'
            ? `Daily overspend on ${monthName} ${referenceDay}`
            : lang === 'pt'
              ? `Estouro diário em ${referenceDay} de ${monthName}`
              : `Sobregasto diario el ${referenceDay} de ${monthName}`,
        message:
          lang === 'en'
            ? `Today you spent ${fmt(exec.spentToday)} on daily expenses vs. a dynamic cap of ${fmt(exec.dailyCapDynamic)} (${Math.round(dailyPct)}%).`
            : lang === 'pt'
              ? `Hoje você gastou ${fmt(exec.spentToday)} em gastos cotidianos diante de um teto dinâmico de ${fmt(exec.dailyCapDynamic)} (${Math.round(dailyPct)}%).`
              : `Hoy gastaste ${fmt(exec.spentToday)} en consumos cotidianos frente a un tope dinámico de ${fmt(exec.dailyCapDynamic)} (${Math.round(dailyPct)}%).`,
        actionHint:
          lang === 'en'
            ? `Reduce spending by ${dailyAdj}/day over the upcoming days to rebalance the month.`
            : lang === 'pt'
              ? `Reduza o ritmo em ${dailyAdj}/dia nos próximos dias para equilibrar o mês.`
              : `Reducí el ritmo en ${dailyAdj} por día durante los próximos días para equilibrar el mes.`,
        amountImpact: -excess,
        percentUsed: dailyPct,
      });
    } else if (dailyPct <= 70 && exec.dailyCapDynamic > exec.dailyCapBase * 1.05) {
      const extraMargin = exec.dailyCapDynamic - exec.dailyCapBase;
      alerts.push({
        id: `daily-surplus-${monthPlan.monthIndex}-${referenceDay}`,
        severity: 'surplus',
        scope: 'daily',
        monthIndex: monthPlan.monthIndex,
        title:
          lang === 'en'
            ? `Favorable daily margin (${monthName})`
            : lang === 'pt'
              ? `Margem diária favorável (${monthName})`
              : `Margen diario favorable (${monthName})`,
        message:
          lang === 'en'
            ? `Your daily available cap rose to ${fmt(exec.dailyCapDynamic)} (+${fmt(extraMargin)}/day above the ${fmt(exec.dailyCapBase)} base) from earlier savings.`
            : lang === 'pt'
              ? `Seu teto diário disponível subiu para ${fmt(exec.dailyCapDynamic)} (+${fmt(extraMargin)}/dia sobre a base de ${fmt(exec.dailyCapBase)}) por economia prévia no mês.`
              : `Tu tope diario disponible subió a ${fmt(exec.dailyCapDynamic)} (+${fmt(extraMargin)}/día sobre la base de ${fmt(exec.dailyCapBase)}) por ahorro previo en el mes.`,
        actionHint:
          lang === 'en'
            ? 'You can allow moderate extra household spending today or keep this cushion for your reserve.'
            : lang === 'pt'
              ? 'Você pode fazer um gasto extra moderado hoje ou guardar esta folga para reforçar a reserva.'
              : 'Podés permitirte un consumo familiar extra moderado hoy o conservar este margen para reforzar la reserva.',
        amountImpact: extraMargin,
        percentUsed: dailyPct,
      });
    }
  } else if (exec.dailyCapDynamic > exec.dailyCapBase * 1.08 && exec.spentBeforeTodayVariable > 0) {
    const extraMargin = exec.dailyCapDynamic - exec.dailyCapBase;
    alerts.push({
      id: `daily-headroom-${monthPlan.monthIndex}-${referenceDay}`,
      severity: 'surplus',
      scope: 'daily',
      monthIndex: monthPlan.monthIndex,
      title:
        lang === 'en'
          ? 'Accumulated surplus in daily cap'
          : lang === 'pt'
            ? 'Superávit acumulado no teto diário'
            : 'Superávit acumulado en tope diario',
      message:
        lang === 'en'
          ? `Thanks to a steady pace in prior days, today's available daily budget is ${fmt(exec.dailyCapDynamic)}.`
          : lang === 'pt'
            ? `Graças ao ritmo moderado dos dias anteriores, seu orçamento diário disponível hoje é de ${fmt(exec.dailyCapDynamic)}.`
            : `Gracias al ritmo moderado de los días previos, tu presupuesto diario disponible hoy es de ${fmt(exec.dailyCapDynamic)}.`,
      actionHint:
        lang === 'en'
          ? `You have ${fmt(extraMargin)}/day above baseline without risking your monthly goal.`
          : lang === 'pt'
            ? `Você tem ${fmt(extraMargin)} diários extras sobre a referência base sem comprometer sua meta mensal.`
            : `Tenés ${fmt(extraMargin)} diarios extra sobre la referencia base sin comprometer tu meta mensual.`,
      amountImpact: extraMargin,
    });
  }

  // 2. Category-Level Execution, Pace & Surplus Alerts
  for (const catId of expenseCategoryIds) {
    const meta = catMap[catId];
    if (!meta) continue;
    const catLabel = getLocalizedCatName(meta, lang);
    const planned = getMonthCategoryBudget(monthPlan, catId);
    const cap = alertRules.categoryCustomCaps[catId] ?? planned;
    if (cap <= 0) continue;

    const spent = exec.actualByCategory[catId] ?? 0;
    const pctUsed = (spent / cap) * 100;
    const diff = cap - spent;

    if (pctUsed > alertRules.overspendThresholdPct) {
      alerts.push({
        id: `cat-over-${catId}-${monthPlan.monthIndex}`,
        severity: 'overspend',
        scope: 'category',
        category: catId,
        monthIndex: monthPlan.monthIndex,
        title:
          lang === 'en'
            ? `Budget exceeded in ${catLabel}`
            : lang === 'pt'
              ? `Limite superado em ${catLabel}`
              : `Límite superado en ${catLabel}`,
        message:
          lang === 'en'
            ? `Spent ${fmt(spent)} out of a ${fmt(cap)} budget (${pctUsed.toFixed(1)}%).`
            : lang === 'pt'
              ? `Você já executou ${fmt(spent)} sobre um orçamento de ${fmt(cap)} (${pctUsed.toFixed(1)}%).`
              : `Llevás ${fmt(spent)} ejecutados sobre un presupuesto de ${fmt(cap)} (${pctUsed.toFixed(1)}%).`,
        actionHint:
          lang === 'en'
            ? `Excess of ${fmt(Math.abs(diff))}. Offset this overrun with surplus from other categories or reserve.`
            : lang === 'pt'
              ? `Excesso de ${fmt(Math.abs(diff))}. Convém compensar esse desvio com superávit de outras categorias ou reserva.`
              : `Exceso de ${fmt(Math.abs(diff))}. Conviene compensar este desvío con superávit de otras partidas cotidianas o usar reserva acumulada.`,
        amountImpact: diff,
        percentUsed: pctUsed,
      });
    } else if (pctUsed >= alertRules.warningThresholdPct) {
      alerts.push({
        id: `cat-warn-${catId}-${monthPlan.monthIndex}`,
        severity: 'warning',
        scope: 'category',
        category: catId,
        monthIndex: monthPlan.monthIndex,
        title:
          lang === 'en'
            ? `${catLabel} near limit (${pctUsed.toFixed(0)}%)`
            : lang === 'pt'
              ? `${catLabel} no limite (${pctUsed.toFixed(0)}%)`
              : `${catLabel} al límite (${pctUsed.toFixed(0)}%)`,
        message:
          lang === 'en'
            ? `Used ${fmt(spent)} of ${fmt(cap)}. ${fmt(diff)} remaining for ${monthName}.`
            : lang === 'pt'
              ? `Consumiu ${fmt(spent)} de ${fmt(cap)}. Restam ${fmt(diff)} para o restante de ${monthName}.`
              : `Consumiste ${fmt(spent)} de ${fmt(cap)}. Quedan ${fmt(diff)} para el resto de ${monthName}.`,
        actionHint:
          lang === 'en'
            ? 'Avoid non-essential purchases in this category through month-end to stay within budget.'
            : lang === 'pt'
              ? 'Evite compras não essenciais nesta categoria até o fim do mês para não estourar o orçamento.'
              : 'Evitá compras no esenciales en esta categoría hasta fin de mes para no caer en sobregasto.',
        amountImpact: diff,
        percentUsed: pctUsed,
      });
    } else if (
      meta.isDailyVariable &&
      hasMonthlyExpenses &&
      exec.monthProgressPct >= 20 &&
      pctUsed - exec.monthProgressPct >= alertRules.paceDeviationWarningPct
    ) {
      alerts.push({
        id: `cat-pace-${catId}-${monthPlan.monthIndex}`,
        severity: 'warning',
        scope: 'category',
        category: catId,
        monthIndex: monthPlan.monthIndex,
        title:
          lang === 'en'
            ? `Fast spending pace in ${catLabel}`
            : lang === 'pt'
              ? `Ritmo acelerado em ${catLabel}`
              : `Ritmo acelerado en ${catLabel}`,
        message:
          lang === 'en'
            ? `At ${Math.round(exec.monthProgressPct)}% through the month, you already used ${Math.round(pctUsed)}% (${fmt(spent)} of ${fmt(cap)}).`
            : lang === 'pt'
              ? `Com ${Math.round(exec.monthProgressPct)}% do mês decorrido, você já usou ${Math.round(pctUsed)}% do orçamento (${fmt(spent)} de ${fmt(cap)}).`
              : `Al ${Math.round(exec.monthProgressPct)}% del mes ya utilizaste el ${Math.round(pctUsed)}% del presupuesto (${fmt(spent)} de ${fmt(cap)}).`,
        actionHint:
          lang === 'en'
            ? 'Current pace projects an overrun by month-end. Trim weekly spending to stay balanced.'
            : lang === 'pt'
              ? 'No ritmo atual o teto será superado. Ajuste os gastos semanais para manter o equilíbrio.'
              : 'Proyectado al cierre superaría el tope. Ajustá el gasto semanal para mantener el equilibrio.',
        amountImpact: diff,
        percentUsed: pctUsed,
      });
    } else if (
      meta.isDailyVariable &&
      hasMonthlyExpenses &&
      exec.monthProgressPct >= 35 &&
      exec.monthProgressPct - pctUsed >= 15 &&
      diff >= alertRules.surplusMinAmount
    ) {
      const expectedSpent = cap * (exec.monthProgressPct / 100);
      const paceSurplus = expectedSpent - spent;
      if (paceSurplus >= alertRules.surplusMinAmount) {
        alerts.push({
          id: `cat-surplus-${catId}-${monthPlan.monthIndex}`,
          severity: 'surplus',
          scope: 'category',
          category: catId,
          monthIndex: monthPlan.monthIndex,
          title:
            lang === 'en'
              ? `Pace surplus in ${catLabel}`
              : lang === 'pt'
                ? `Superávit de ritmo em ${catLabel}`
                : `Superávit de ritmo en ${catLabel}`,
          message:
            lang === 'en'
              ? `You are ${Math.round(exec.monthProgressPct - pctUsed)} pts under expected pace: ${fmt(spent)} spent vs. ${fmt(expectedSpent)} projected by day ${referenceDay}.`
              : lang === 'pt'
                ? `Você está ${Math.round(exec.monthProgressPct - pctUsed)} pontos abaixo do ritmo esperado: ${fmt(spent)} gastos diante de ${fmt(expectedSpent)} projetados até o dia ${referenceDay}.`
                : `Vas ${Math.round(exec.monthProgressPct - pctUsed)} puntos por debajo del ritmo esperado: llevás ${fmt(spent)} frente a ${fmt(expectedSpent)} proyectados al día ${referenceDay}.`,
          actionHint:
            lang === 'en'
              ? `Favorable cushion of ${fmt(paceSurplus)} ready to reinforce savings or stay flexible.`
              : lang === 'pt'
                ? `Você tem uma folga favorável de ${fmt(paceSurplus)} que pode reforçar a reserva sem sair do plano.`
                : `Tenés un margen favorable de ${fmt(paceSurplus)} que podés destinar a reforzar el fondo o disfrutar sin salir del plan.`,
          amountImpact: paceSurplus,
          percentUsed: pctUsed,
        });
      }
    }
  }

  // 3. Monthly & Annual Structural Alerts
  const deficitMonthNames = projection
    .filter((m) => m.saldoMensual < 0)
    .map((m) => MONTHS_BY_LANG[lang][m.monthIndex]?.name ?? m.monthName);

  const highSurplusThresholdBase = convertBetweenCurrencies(
    500000,
    'ARS',
    currencySettings.baseCurrency,
    currencySettings,
  );

  if (monthPlan.saldoMensual < 0) {
    alerts.push({
      id: `month-proj-deficit-${monthPlan.monthIndex}`,
      severity: 'overspend',
      scope: 'monthly',
      monthIndex: monthPlan.monthIndex,
      title:
        lang === 'en'
          ? `Projected deficit in ${monthName} (${fmt(monthPlan.saldoMensual)})`
          : lang === 'pt'
            ? `Déficit projetado em ${monthName} (${fmt(monthPlan.saldoMensual)})`
            : `Déficit proyectado en ${monthName} (${fmt(monthPlan.saldoMensual)})`,
      message:
        lang === 'en'
          ? `Planned outflows (${fmt(monthPlan.gastosTotalesConAhorro)}) exceed projected income (${fmt(monthPlan.ingresosTotales)}).`
          : lang === 'pt'
            ? `As saídas planejadas (${fmt(monthPlan.gastosTotalesConAhorro)}) superam as receitas projetadas (${fmt(monthPlan.ingresosTotales)}).`
            : `Los egresos planificados (${fmt(monthPlan.gastosTotalesConAhorro)}) superan los ingresos proyectados (${fmt(monthPlan.ingresosTotales)}).`,
      actionHint:
        lang === 'en'
          ? `Covered by prior accumulated balance (${fmt(monthPlan.saldoAcumulado)}). Adjust variable caps or income to balance ${monthName}.`
          : lang === 'pt'
            ? `Coberto pelo saldo acumulado anterior (${fmt(monthPlan.saldoAcumulado)}). Ajuste gastos variáveis ou receitas para equilibrar ${monthName}.`
            : `Se cubre con el saldo acumulado previo (${fmt(monthPlan.saldoAcumulado)}). Ajustá gastos variables o ingresos para equilibrar ${monthName}.`,
      amountImpact: monthPlan.saldoMensual,
    });
  } else if (monthPlan.saldoMensual >= highSurplusThresholdBase) {
    alerts.push({
      id: `month-proj-surplus-${monthPlan.monthIndex}`,
      severity: 'surplus',
      scope: 'monthly',
      monthIndex: monthPlan.monthIndex,
      title:
        lang === 'en'
          ? `High projected monthly surplus (${fmt(monthPlan.saldoMensual, true)})`
          : lang === 'pt'
            ? `Mês com alto superávit projetado (${fmt(monthPlan.saldoMensual, true)})`
            : `Mes con alto superávit proyectado (${fmt(monthPlan.saldoMensual, true)})`,
      message:
        monthPlan.aguinaldo > 0
          ? lang === 'en'
            ? `${monthName} includes a ${fmt(monthPlan.aguinaldo)} bonus, boosting your monthly surplus.`
            : lang === 'pt'
              ? `${monthName} inclui 13º salário de ${fmt(monthPlan.aguinaldo)}, elevando seu excedente mensal.`
              : `${monthName} incorpora aguinaldo completo de ${fmt(monthPlan.aguinaldo)}, elevando tu excedente mensual.`
          : assumptions.comisionCuota > 0 && monthPlan.comision === 0 && monthPlan.monthIndex >= 3
            ? lang === 'en'
              ? `Brokerage installments ended before ${monthName}, freeing ${fmt(monthPlan.saldoMensual)} above scheduled savings.`
              : lang === 'pt'
                ? `Em ${monthName} a comissão imobiliária já terminou, liberando ${fmt(monthPlan.saldoMensual)} acima da poupança programada.`
                : `En ${monthName} ya finalizó la comisión inmobiliaria, liberando ${fmt(monthPlan.saldoMensual)} de excedente sobre el ahorro programado.`
            : lang === 'en'
              ? `${monthName} leaves a projected surplus of ${fmt(monthPlan.saldoMensual)} above scheduled savings.`
              : lang === 'pt'
                ? `O balanço projetado de ${monthName} deixa um excedente de ${fmt(monthPlan.saldoMensual)} sobre a poupança programada.`
                : `El balance proyectado de ${monthName} deja un excedente de ${fmt(monthPlan.saldoMensual)} sobre el ahorro programado.`,
      actionHint:
        deficitMonthNames.length > 0
          ? lang === 'en'
            ? `Prioritize saving surplus to cover deficit months (${deficitMonthNames.join(', ')}).`
            : lang === 'pt'
              ? `Priorize reservar excedentes para cobrir os meses com déficit (${deficitMonthNames.join(', ')}).`
              : `Priorizá reservar excedentes para cubrir los meses en déficit (${deficitMonthNames.join(', ')}).`
          : lang === 'en'
            ? 'Strong monthly cushion to consolidate your reserve fund or advance household goals.'
            : lang === 'pt'
              ? 'Boa margem mensal para consolidar o fundo de reserva ou antecipar objetivos familiares.'
              : 'Buen margen mensual para consolidar el fondo de reserva o adelantar objetivos familiares.',
      amountImpact: monthPlan.saldoMensual,
    });
  }

  const janPlan = projection[0];
  const decPlan = projection[11];
  if (janPlan && decPlan) {
    const rentGrowth = decPlan.alquilerBolsillo - janPlan.alquilerBolsillo;
    if (rentGrowth > 0) {
      alerts.push({
        id: 'annual-rent-pressure',
        severity: 'warning',
        scope: 'annual',
        title:
          lang === 'en'
            ? `Out-of-pocket rent pressure in ${selectedYear}`
            : lang === 'pt'
              ? `Pressão do aluguel do bolso em ${selectedYear}`
              : `Presión del alquiler de bolsillo durante ${selectedYear}`,
        message:
          lang === 'en'
            ? `With a ${fmt(assumptions.aporteEmpresaAlquiler)} employer allowance, out-of-pocket rent climbs from ${fmt(janPlan.alquilerBolsillo)} in Jan to ${fmt(decPlan.alquilerBolsillo)} in Dec (+${fmt(rentGrowth)}/mo).`
            : lang === 'pt'
              ? `Com auxílio empresa de ${fmt(assumptions.aporteEmpresaAlquiler)}, o aluguel do bolso sobe de ${fmt(janPlan.alquilerBolsillo)} em jan para ${fmt(decPlan.alquilerBolsillo)} em dez (+${fmt(rentGrowth)}/mês).`
              : `Con aporte empresarial de ${fmt(assumptions.aporteEmpresaAlquiler)}, el alquiler neto de tu bolsillo pasa de ${fmt(janPlan.alquilerBolsillo)} en enero a ${fmt(decPlan.alquilerBolsillo)} en diciembre (+${fmt(rentGrowth)}/mes).`,
        actionHint:
          assumptions.ingresoExtraMensual > 0
            ? lang === 'en'
              ? `Protect your ${fmt(assumptions.ingresoExtraMensual)} extra income and save positive-month surpluses.`
              : lang === 'pt'
                ? `Mantenha a estabilidade da renda extra de ${fmt(assumptions.ingresoExtraMensual)} e reserve excedentes.`
                : `Cuidá la estabilidad del ingreso extra de ${fmt(assumptions.ingresoExtraMensual)} y reservá los excedentes de los meses positivos.`
            : lang === 'en'
              ? 'Account for quarterly rent increases in your late-year budget.'
              : lang === 'pt'
                ? 'Considere os reajustes trimestrais do aluguel nos últimos trimestres.'
                : 'Prevé el incremento escalonado del alquiler en el presupuesto de los últimos trimestres.',
        amountImpact: -rentGrowth,
      });
    }

    const finalReserve = decPlan.reservaTotalAcumulada;
    if (assumptions.metaReservaMin > 0) {
      if (finalReserve >= assumptions.metaReservaMin) {
        alerts.push({
          id: 'annual-reserve-goal',
          severity: 'surplus',
          scope: 'annual',
          title:
            lang === 'en'
              ? `Annual reserve goal on track (${fmt(finalReserve)})`
              : lang === 'pt'
                ? `Meta anual de reserva encaminhada (${fmt(finalReserve)})`
                : `Meta anual de reserva encaminada (${fmt(finalReserve)})`,
          message:
            lang === 'en'
              ? `Combining ${fmt(assumptions.ahorroMensual * 12)} scheduled savings and ${fmt(decPlan.saldoAcumulado)} accumulated surplus exceeds your ${fmt(assumptions.metaReservaMin)}–${fmt(assumptions.metaReservaMax)} target.`
              : lang === 'pt'
                ? `Somando ${fmt(assumptions.ahorroMensual * 12)} de poupança programada e ${fmt(decPlan.saldoAcumulado)} de saldo acumulado, supera a meta de ${fmt(assumptions.metaReservaMin)}–${fmt(assumptions.metaReservaMax)}.`
                : `Sumando ${fmt(assumptions.ahorroMensual * 12)} de ahorro programado y ${fmt(decPlan.saldoAcumulado)} de excedente acumulado, superás el objetivo de ${fmt(assumptions.metaReservaMin)}–${fmt(assumptions.metaReservaMax)}.`,
          actionHint:
            lang === 'en'
              ? `Stay disciplined on daily categories to protect the ${fmt(assumptions.metaReservaMin)} floor.`
              : lang === 'pt'
                ? `Mantenha a disciplina nos gastos cotidianos para não ficar abaixo de ${fmt(assumptions.metaReservaMin)}.`
                : `Mantené la disciplina en gastos cotidianos para no perforar el piso de ${fmt(assumptions.metaReservaMin)}.`,
          amountImpact: finalReserve,
        });
      } else {
        alerts.push({
          id: 'annual-reserve-shortfall',
          severity: 'overspend',
          scope: 'annual',
          title:
            lang === 'en'
              ? `Projected reserve below goal (${fmt(finalReserve)})`
              : lang === 'pt'
                ? `Reserva projetada abaixo da meta (${fmt(finalReserve)})`
                : `Reserva proyectada debajo de la meta (${fmt(finalReserve)})`,
          message:
            lang === 'en'
              ? `Under current ${selectedYear} assumptions, year-end reserve falls below your ${fmt(assumptions.metaReservaMin)} minimum target.`
              : lang === 'pt'
                ? `Sob as premissas atuais de ${selectedYear}, a reserva em dezembro fica abaixo do piso de ${fmt(assumptions.metaReservaMin)}.`
                : `Bajo los supuestos actuales de ${selectedYear}, la reserva total al cierre de diciembre queda por debajo del piso objetivo de ${fmt(assumptions.metaReservaMin)}.`,
          actionHint:
            lang === 'en'
              ? `Review income, tighten daily caps, or carry over prior December ${selectedYear - 1} reserve.`
              : lang === 'pt'
                ? `Revise receitas, ajuste tetos cotidianos ou inclua o saldo inicial de dezembro ${selectedYear - 1}.`
                : `Revisá ingresos, ajustá topes cotidianos o incorporá saldo inicial de diciembre ${selectedYear - 1}.`,
          amountImpact: finalReserve - assumptions.metaReservaMin,
        });
      }
    }
  }

  return alerts;
}
