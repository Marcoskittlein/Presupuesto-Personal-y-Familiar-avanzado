import {
  AlertRules,
  BudgetAssumptions,
  CategoryId,
  CategoryMeta,
  DailyVariableCategoryId,
  ExpenseCategoryId,
  IncomeDayMode,
  MonthPlan,
  MonthlyOverridesMap,
  Transaction,
} from '../types/budget';

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    id: 'alimentacion',
    label: 'Alimentación',
    shortLabel: 'Alimentos',
    type: 'expense',
    isDailyVariable: true,
    tier: 'esencial',
    color: '#2563EB',
    description: 'Supermercado, carnicería, verdulería, panadería y almacén.',
    isDefault: true,
  },
  {
    id: 'servicios',
    label: 'Impuestos y servicios',
    shortLabel: 'Servicios',
    type: 'expense',
    isDailyVariable: true,
    tier: 'esencial',
    color: '#0891B2',
    description: 'Luz, gas, agua, internet, telefonía y tasas municipales.',
    isDefault: true,
  },
  {
    id: 'ropa',
    label: 'Ropa y zapatillas',
    shortLabel: 'Indumentaria',
    type: 'expense',
    isDailyVariable: true,
    tier: 'compromiso',
    color: '#7C3AED',
    description: 'Indumentaria familiar, calzado y accesorios.',
    isDefault: true,
  },
  {
    id: 'transporte',
    label: 'Transporte y combustible',
    shortLabel: 'Transporte',
    type: 'expense',
    isDailyVariable: true,
    tier: 'esencial',
    color: '#D97706',
    description: 'Nafta, peajes, estacionamiento, mantenimiento y SUBE.',
    isDefault: true,
  },
  {
    id: 'salud',
    label: 'Salud y farmacia',
    shortLabel: 'Salud',
    type: 'expense',
    isDailyVariable: true,
    tier: 'esencial',
    color: '#DC2626',
    description: 'Medicamentos, farmacia, consultas médicas y odontología.',
    isDefault: true,
  },
  {
    id: 'escuela',
    label: 'Escuela y gastos familiares',
    shortLabel: 'Escuela',
    type: 'expense',
    isDailyVariable: true,
    tier: 'esencial',
    color: '#059669',
    description: 'Cuotas escolares, útiles, librería y salidas familiares.',
    isDefault: true,
  },
  {
    id: 'alquiler',
    label: 'Alquiler total',
    shortLabel: 'Alquiler',
    type: 'expense',
    isDailyVariable: false,
    tier: 'esencial',
    color: '#334155',
    description: 'Alquiler total de la vivienda (incluye aporte empresarial si corresponde).',
    isDefault: true,
  },
  {
    id: 'deudas',
    label: 'Deudas CAPP y Municipalidad',
    shortLabel: 'Deudas',
    type: 'expense',
    isDailyVariable: false,
    tier: 'compromiso',
    color: '#64748B',
    description: 'Plan de cuotas sin interés adicional.',
    isDefault: true,
  },
  {
    id: 'comision',
    label: 'Comisión inmobiliaria',
    shortLabel: 'Comisión',
    type: 'expense',
    isDailyVariable: false,
    tier: 'compromiso',
    color: '#475569',
    description: 'Cuotas iniciales de renovación o contrato.',
    isDefault: true,
  },
  {
    id: 'deposito',
    label: 'Diferencia de depósito',
    shortLabel: 'Depósito',
    type: 'expense',
    isDailyVariable: false,
    tier: 'compromiso',
    color: '#94A3B8',
    description: 'Ajuste de depósito de garantía en enero.',
    isDefault: true,
  },
  {
    id: 'diezmo',
    label: 'Diezmo',
    shortLabel: 'Diezmo',
    type: 'expense',
    isDailyVariable: false,
    tier: 'compromiso',
    color: '#0F766E',
    description: '10% exclusivo sobre el sueldo, sin adicional por aguinaldo.',
    isDefault: true,
  },
  {
    id: 'ahorro',
    label: 'Ahorro programado',
    shortLabel: 'Ahorro',
    type: 'expense',
    isDailyVariable: false,
    tier: 'ahorro',
    color: '#15803D',
    description: 'Separación mensual fija al cobrar.',
    isDefault: true,
  },
  {
    id: 'sueldo',
    label: 'Sueldo mensual',
    shortLabel: 'Sueldo',
    type: 'income',
    isDailyVariable: false,
    tier: 'ingreso',
    color: '#16A34A',
    description: 'Haberes mensuales en relación de dependencia.',
    isDefault: true,
  },
  {
    id: 'aporte_empresa',
    label: 'Aporte empresa alquiler',
    shortLabel: 'Aporte emp.',
    type: 'income',
    isDailyVariable: false,
    tier: 'ingreso',
    color: '#0284C7',
    description: 'Subsidio fijo mensual de la empresa para vivienda.',
    isDefault: true,
  },
  {
    id: 'ingreso_extra',
    label: 'Ingreso extra mensual',
    shortLabel: 'Extra',
    type: 'income',
    isDailyVariable: false,
    tier: 'ingreso',
    color: '#2563EB',
    description: 'Honorarios, trabajos independientes o ingresos proyectados.',
    isDefault: true,
  },
  {
    id: 'aguinaldo',
    label: 'Aguinaldo (SAC)',
    shortLabel: 'Aguinaldo',
    type: 'income',
    isDailyVariable: false,
    tier: 'ingreso',
    color: '#0D9488',
    description: 'Sueldo Anual Complementario en julio y diciembre.',
    isDefault: true,
  },
  {
    id: 'otro_ingreso',
    label: 'Otros ingresos',
    shortLabel: 'Otros ing.',
    type: 'income',
    isDailyVariable: false,
    tier: 'ingreso',
    color: '#4F46E5',
    description: 'Reintegros, ventas eventuales o ingresos extraordinarios.',
    isDefault: true,
  },
];

export const BUILTIN_CATEGORY_IDS = new Set<string>(CATEGORY_LIST.map((c) => c.id));

export function buildCategoryMap(categories: CategoryMeta[]): Record<string, CategoryMeta> {
  return categories.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, CategoryMeta>,
  );
}

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = buildCategoryMap(CATEGORY_LIST);

export const EXPENSE_CATEGORY_IDS: ExpenseCategoryId[] = [
  'alimentacion',
  'servicios',
  'ropa',
  'transporte',
  'salud',
  'escuela',
  'alquiler',
  'deudas',
  'comision',
  'deposito',
  'diezmo',
  'ahorro',
];

export const DAILY_VARIABLE_CATEGORY_IDS: DailyVariableCategoryId[] = [
  'alimentacion',
  'servicios',
  'ropa',
  'transporte',
  'salud',
  'escuela',
];

export function getExpenseCategoryIds(categories: CategoryMeta[] = CATEGORY_LIST): string[] {
  return categories.filter((c) => c.type === 'expense').map((c) => c.id);
}

export function getDailyVariableCategoryIds(categories: CategoryMeta[] = CATEGORY_LIST): string[] {
  return categories.filter((c) => c.type === 'expense' && c.isDailyVariable).map((c) => c.id);
}

export const AVAILABLE_YEARS = [
  2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033,
  2034, 2035,
];

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

const WEEKDAYS_ES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function resolveIncomeDayOfMonth(
  year: number,
  monthIndex: number,
  mode: IncomeDayMode = 'business_day',
  value = 4,
): number {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const target = Math.max(1, Math.round(value || 1));

  if (mode === 'calendar_day') {
    return Math.min(target, daysInMonth);
  }

  let businessCount = 0;
  let lastBusinessDay = 1;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthIndex, d).getDay();
    if (dow !== 0 && dow !== 6) {
      businessCount += 1;
      lastBusinessDay = d;
      if (businessCount === target) {
        return d;
      }
    }
  }
  return lastBusinessDay;
}

export function formatExpectedIncomeLabel(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  mode: IncomeDayMode,
  value: number,
  isCustomOverride = false,
): string {
  const dow = new Date(year, monthIndex, dayOfMonth).getDay();
  const weekday = WEEKDAYS_ES_SHORT[dow] ?? '';
  if (isCustomOverride) {
    return `${weekday} ${dayOfMonth} (fecha puntual)`;
  }
  if (mode === 'business_day') {
    return `${value}° día hábil (${weekday} ${dayOfMonth})`;
  }
  return `Día ${value} (${weekday} ${dayOfMonth})`;
}

export const MONTHS_ES = [
  { name: 'Enero', short: 'Ene', days: 31 },
  { name: 'Febrero', short: 'Feb', days: 28 },
  { name: 'Marzo', short: 'Mar', days: 31 },
  { name: 'Abril', short: 'Abr', days: 30 },
  { name: 'Mayo', short: 'May', days: 31 },
  { name: 'Junio', short: 'Jun', days: 30 },
  { name: 'Julio', short: 'Jul', days: 31 },
  { name: 'Agosto', short: 'Ago', days: 31 },
  { name: 'Septiembre', short: 'Sep', days: 30 },
  { name: 'Octubre', short: 'Oct', days: 31 },
  { name: 'Noviembre', short: 'Nov', days: 30 },
  { name: 'Diciembre', short: 'Dic', days: 31 },
];

export const BASELINE_ASSUMPTIONS: BudgetAssumptions = {
  sueldoMensual: 4000000,
  aporteEmpresaAlquiler: 1660000,
  ingresoExtraMensual: 700000,
  aguinaldoJulio: 2100000,
  aguinaldoDiciembre: 2100000,
  diezmoMensual: 400000,
  ahorroMensual: 400000,
  alquilerInicial: 1900000,
  actualizacionAlquilerPct: 8,
  inflacionMensualPct: 2.5,
  baseAlimentacion: 1500000,
  baseServicios: 300000,
  baseRopa: 200000,
  baseTransporte: 250000,
  baseSalud: 150000,
  baseEscuela: 150000,
  deudaMensual: 133785,
  comisionCuota: 633333,
  depositoEnero: 238000,
  incluirReservaDic2026: false,
  reservaDic2026: 2028000,
  metaReservaMin: 8000000,
  metaReservaMax: 10000000,
  diaIngresoModo: 'business_day',
  diaIngresoValor: 4,
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  warningThresholdPct: 85,
  overspendThresholdPct: 100,
  paceDeviationWarningPct: 15,
  surplusMinAmount: 60000,
  dailyCapWarningPct: 100,
  categoryCustomCaps: {},
};

// Exact figures from the 2027 family budget specification
const EXACT_BASELINE_ROWS = [
  {
    alimentacion: 1500000,
    servicios: 300000,
    ropa: 200000,
    transporte: 250000,
    salud: 150000,
    escuela: 150000,
    alquiler: 1900000,
    deudas: 133785,
    comision: 633333,
    deposito: 238000,
  },
  {
    alimentacion: 1537500,
    servicios: 307500,
    ropa: 205000,
    transporte: 256250,
    salud: 153750,
    escuela: 153750,
    alquiler: 1900000,
    deudas: 133785,
    comision: 633333,
    deposito: 0,
  },
  {
    alimentacion: 1575938,
    servicios: 315188,
    ropa: 210125,
    transporte: 262656,
    salud: 157594,
    escuela: 157594,
    alquiler: 1900000,
    deudas: 133785,
    comision: 633334,
    deposito: 0,
  },
  {
    alimentacion: 1615336,
    servicios: 323067,
    ropa: 215378,
    transporte: 269223,
    salud: 161534,
    escuela: 161534,
    alquiler: 2052000,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1655719,
    servicios: 331144,
    ropa: 220763,
    transporte: 275953,
    salud: 165572,
    escuela: 165572,
    alquiler: 2052000,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1697112,
    servicios: 339422,
    ropa: 226282,
    transporte: 282852,
    salud: 169711,
    escuela: 169711,
    alquiler: 2052000,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1739540,
    servicios: 347908,
    ropa: 231939,
    transporte: 289923,
    salud: 173954,
    escuela: 173954,
    alquiler: 2216160,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1783029,
    servicios: 356606,
    ropa: 237737,
    transporte: 297171,
    salud: 178303,
    escuela: 178303,
    alquiler: 2216160,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1827604,
    servicios: 365521,
    ropa: 243681,
    transporte: 304601,
    salud: 182760,
    escuela: 182760,
    alquiler: 2216160,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1873294,
    servicios: 374659,
    ropa: 249773,
    transporte: 312216,
    salud: 187329,
    escuela: 187329,
    alquiler: 2393453,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1920127,
    servicios: 384025,
    ropa: 256017,
    transporte: 320021,
    salud: 192013,
    escuela: 192013,
    alquiler: 2393453,
    deudas: 133785,
    comision: 0,
    deposito: 0,
  },
  {
    alimentacion: 1968130,
    servicios: 393626,
    ropa: 262417,
    transporte: 328022,
    salud: 196813,
    escuela: 196813,
    alquiler: 2393453,
    deudas: 133783,
    comision: 0,
    deposito: 0,
  },
];

function isDefaultMathAssumptions(a: BudgetAssumptions): boolean {
  return (
    a.sueldoMensual === BASELINE_ASSUMPTIONS.sueldoMensual &&
    a.aporteEmpresaAlquiler === BASELINE_ASSUMPTIONS.aporteEmpresaAlquiler &&
    a.ingresoExtraMensual === BASELINE_ASSUMPTIONS.ingresoExtraMensual &&
    a.aguinaldoJulio === BASELINE_ASSUMPTIONS.aguinaldoJulio &&
    a.aguinaldoDiciembre === BASELINE_ASSUMPTIONS.aguinaldoDiciembre &&
    a.diezmoMensual === BASELINE_ASSUMPTIONS.diezmoMensual &&
    a.ahorroMensual === BASELINE_ASSUMPTIONS.ahorroMensual &&
    a.alquilerInicial === BASELINE_ASSUMPTIONS.alquilerInicial &&
    a.actualizacionAlquilerPct === BASELINE_ASSUMPTIONS.actualizacionAlquilerPct &&
    a.inflacionMensualPct === BASELINE_ASSUMPTIONS.inflacionMensualPct &&
    a.baseAlimentacion === BASELINE_ASSUMPTIONS.baseAlimentacion &&
    a.baseServicios === BASELINE_ASSUMPTIONS.baseServicios &&
    a.baseRopa === BASELINE_ASSUMPTIONS.baseRopa &&
    a.baseTransporte === BASELINE_ASSUMPTIONS.baseTransporte &&
    a.baseSalud === BASELINE_ASSUMPTIONS.baseSalud &&
    a.baseEscuela === BASELINE_ASSUMPTIONS.baseEscuela &&
    a.deudaMensual === BASELINE_ASSUMPTIONS.deudaMensual &&
    a.comisionCuota === BASELINE_ASSUMPTIONS.comisionCuota &&
    a.depositoEnero === BASELINE_ASSUMPTIONS.depositoEnero
  );
}

export function getDefaultAssumptionsForYear(year: number): BudgetAssumptions {
  if (year === 2027) {
    return { ...BASELINE_ASSUMPTIONS };
  }
  // Any other year starts clean at $0 so the user loads their own numbers (or copies a plan)
  return {
    sueldoMensual: 0,
    aporteEmpresaAlquiler: 0,
    ingresoExtraMensual: 0,
    aguinaldoJulio: 0,
    aguinaldoDiciembre: 0,
    diezmoMensual: 0,
    ahorroMensual: 0,
    alquilerInicial: 0,
    actualizacionAlquilerPct: 0,
    inflacionMensualPct: 0,
    baseAlimentacion: 0,
    baseServicios: 0,
    baseRopa: 0,
    baseTransporte: 0,
    baseSalud: 0,
    baseEscuela: 0,
    deudaMensual: 0,
    comisionCuota: 0,
    depositoEnero: 0,
    incluirReservaDic2026: false,
    reservaDic2026: 0,
    metaReservaMin: 0,
    metaReservaMax: 0,
    diaIngresoModo: 'business_day',
    diaIngresoValor: 4,
  };
}

export function compute2027Projection(
  assumptions: BudgetAssumptions,
  monthlyOverrides: MonthlyOverridesMap = {},
  year = 2027,
  categories: CategoryMeta[] = CATEGORY_LIST,
): MonthPlan[] {
  const activeMap = buildCategoryMap(categories);
  const hasAllDefaultExpenses = EXPENSE_CATEGORY_IDS.every((id) => Boolean(activeMap[id]));
  const customCategories = categories.filter((c) => !BUILTIN_CATEGORY_IDS.has(c.id));
  const useExactBaseline =
    year === 2027 && isDefaultMathAssumptions(assumptions) && hasAllDefaultExpenses;
  const inflationFactor = 1 + assumptions.inflacionMensualPct / 100;
  const rentStepFactor = 1 + assumptions.actualizacionAlquilerPct / 100;

  const incomeMode: IncomeDayMode = assumptions.diaIngresoModo ?? 'business_day';
  const incomeDayValue = assumptions.diaIngresoValor ?? 4;

  let saldoAcumulado = assumptions.incluirReservaDic2026 ? assumptions.reservaDic2026 : 0;
  let ahorroAcumulado = 0;

  return MONTHS_ES.map((m, idx) => {
    const quarter = Math.floor(idx / 3);
    const baseRow = EXACT_BASELINE_ROWS[idx];
    const ov = monthlyOverrides[String(idx)] ?? {};
    const daysInMonth = getDaysInMonth(year, idx);
    const resolvedAutoDay = resolveIncomeDayOfMonth(year, idx, incomeMode, incomeDayValue);
    const fechaIngresoPrevista =
      ov.diaIngresoPrevisto !== undefined
        ? Math.min(Math.max(1, Math.round(ov.diaIngresoPrevisto)), daysInMonth)
        : resolvedAutoDay;
    const reglaIngresoTexto = formatExpectedIncomeLabel(
      year,
      idx,
      fechaIngresoPrevista,
      incomeMode,
      incomeDayValue,
      ov.diaIngresoPrevisto !== undefined,
    );

    const alimentacion = activeMap['alimentacion']
      ? (ov.alimentacion ??
        (useExactBaseline
          ? baseRow.alimentacion
          : Math.round(assumptions.baseAlimentacion * Math.pow(inflationFactor, idx))))
      : 0;
    const servicios = activeMap['servicios']
      ? (ov.servicios ??
        (useExactBaseline
          ? baseRow.servicios
          : Math.round(assumptions.baseServicios * Math.pow(inflationFactor, idx))))
      : 0;
    const ropa = activeMap['ropa']
      ? (ov.ropa ??
        (useExactBaseline
          ? baseRow.ropa
          : Math.round(assumptions.baseRopa * Math.pow(inflationFactor, idx))))
      : 0;
    const transporte = activeMap['transporte']
      ? (ov.transporte ??
        (useExactBaseline
          ? baseRow.transporte
          : Math.round(assumptions.baseTransporte * Math.pow(inflationFactor, idx))))
      : 0;
    const salud = activeMap['salud']
      ? (ov.salud ??
        (useExactBaseline
          ? baseRow.salud
          : Math.round(assumptions.baseSalud * Math.pow(inflationFactor, idx))))
      : 0;
    const escuela = activeMap['escuela']
      ? (ov.escuela ??
        (useExactBaseline
          ? baseRow.escuela
          : Math.round(assumptions.baseEscuela * Math.pow(inflationFactor, idx))))
      : 0;

    const alquilerTotal = activeMap['alquiler']
      ? (ov.alquilerTotal ??
        (useExactBaseline
          ? baseRow.alquiler
          : Math.round(assumptions.alquilerInicial * Math.pow(rentStepFactor, quarter))))
      : 0;

    const deudas = activeMap['deudas']
      ? (ov.deudas ?? (useExactBaseline ? baseRow.deudas : assumptions.deudaMensual))
      : 0;
    const comision = activeMap['comision']
      ? (ov.comision ??
        (useExactBaseline ? baseRow.comision : idx < 3 ? assumptions.comisionCuota : 0))
      : 0;
    const deposito = activeMap['deposito']
      ? (ov.deposito ??
        (useExactBaseline ? baseRow.deposito : idx === 0 ? assumptions.depositoEnero : 0))
      : 0;
    const diezmo = activeMap['diezmo'] ? (ov.diezmo ?? assumptions.diezmoMensual) : 0;
    const ahorroBase = activeMap['ahorro'] ? (ov.ahorro ?? assumptions.ahorroMensual) : 0;

    const aguinaldo = activeMap['aguinaldo']
      ? (ov.aguinaldo ??
        (idx === 6
          ? assumptions.aguinaldoJulio
          : idx === 11
            ? assumptions.aguinaldoDiciembre
            : 0))
      : 0;
    const sueldo = activeMap['sueldo'] ? (ov.sueldo ?? assumptions.sueldoMensual) : 0;
    const aporteEmpresa = activeMap['aporte_empresa']
      ? (ov.aporteEmpresa ?? assumptions.aporteEmpresaAlquiler)
      : 0;
    const ingresoExtra = activeMap['ingreso_extra']
      ? (ov.ingresoExtra ?? assumptions.ingresoExtraMensual)
      : 0;

    const categoryBudgets: Record<string, number> = {
      alimentacion,
      servicios,
      ropa,
      transporte,
      salud,
      escuela,
      alquiler: alquilerTotal,
      deudas,
      comision,
      deposito,
      diezmo,
      ahorro: ahorroBase,
      sueldo,
      aporte_empresa: aporteEmpresa,
      ingreso_extra: ingresoExtra,
      aguinaldo,
      otro_ingreso: activeMap['otro_ingreso']
        ? (ov.customAmounts?.['otro_ingreso'] ??
          assumptions.customCategoryBudgets?.['otro_ingreso'] ??
          0)
        : 0,
    };

    // Dynamically sum built-in categories according to their current CategoryMeta classification
    let ingresosTotales = 0;
    let totalCotidiano = 0;
    let totalCompromisos = 0;
    let ahorroMesTotal = 0;

    const builtinIds = [
      'alimentacion',
      'servicios',
      'ropa',
      'transporte',
      'salud',
      'escuela',
      'alquiler',
      'deudas',
      'comision',
      'deposito',
      'diezmo',
      'ahorro',
      'sueldo',
      'aporte_empresa',
      'ingreso_extra',
      'aguinaldo',
      'otro_ingreso',
    ];

    for (const id of builtinIds) {
      const meta = activeMap[id];
      if (!meta) continue;
      const val = categoryBudgets[id] ?? 0;
      if (meta.type === 'income') {
        ingresosTotales += val;
      } else {
        if (meta.isDailyVariable) {
          totalCotidiano += val;
        } else {
          totalCompromisos += val;
        }
        if (meta.tier === 'ahorro') {
          ahorroMesTotal += val;
        }
      }
    }

    // Add custom user-created categories
    for (const cat of customCategories) {
      const baseAmt = assumptions.customCategoryBudgets?.[cat.id] ?? 0;
      const ovAmt = ov.customAmounts?.[cat.id];
      const val =
        ovAmt !== undefined
          ? ovAmt
          : cat.type === 'expense' && cat.isDailyVariable
            ? Math.round(baseAmt * Math.pow(inflationFactor, idx))
            : baseAmt;
      categoryBudgets[cat.id] = val;

      if (cat.type === 'income') {
        ingresosTotales += val;
      } else {
        if (cat.isDailyVariable) {
          totalCotidiano += val;
        } else {
          totalCompromisos += val;
        }
        if (cat.tier === 'ahorro') {
          ahorroMesTotal += val;
        }
      }
    }

    const gastosTotalesConAhorro = totalCotidiano + totalCompromisos;
    const saldoMensual = ingresosTotales - gastosTotalesConAhorro;

    saldoAcumulado += saldoMensual;
    ahorroAcumulado += ahorroMesTotal;

    return {
      monthIndex: idx,
      monthName: m.name,
      shortName: m.short,
      daysInMonth,
      fechaIngresoPrevista,
      reglaIngresoTexto,
      sueldo,
      aporteEmpresa,
      ingresoExtra,
      aguinaldo,
      ingresosTotales,
      alimentacion,
      servicios,
      ropa,
      transporte,
      salud,
      escuela,
      totalCotidiano,
      alquilerTotal,
      alquilerBolsillo: Math.max(0, alquilerTotal - aporteEmpresa),
      deudas,
      comision,
      deposito,
      diezmo,
      ahorro: ahorroMesTotal,
      totalCompromisos,
      categoryBudgets,
      gastosTotalesConAhorro,
      saldoMensual,
      saldoAcumulado,
      reservaTotalAcumulada: saldoAcumulado + ahorroAcumulado,
    };
  });
}

export function getMonthCategoryBudget(
  monthPlan: MonthPlan,
  categoryId: ExpenseCategoryId,
): number {
  if (monthPlan.categoryBudgets && categoryId in monthPlan.categoryBudgets) {
    return monthPlan.categoryBudgets[categoryId] ?? 0;
  }
  switch (categoryId) {
    case 'alimentacion':
      return monthPlan.alimentacion;
    case 'servicios':
      return monthPlan.servicios;
    case 'ropa':
      return monthPlan.ropa;
    case 'transporte':
      return monthPlan.transporte;
    case 'salud':
      return monthPlan.salud;
    case 'escuela':
      return monthPlan.escuela;
    case 'alquiler':
      return monthPlan.alquilerTotal;
    case 'deudas':
      return monthPlan.deudas;
    case 'comision':
      return monthPlan.comision;
    case 'deposito':
      return monthPlan.deposito;
    case 'diezmo':
      return monthPlan.diezmo;
    case 'ahorro':
      return monthPlan.ahorro;
    default:
      return 0;
  }
}

export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-demo-1',
    date: '2027-01-02',
    description: 'Sueldo acreditación haberes enero',
    amount: 4000000,
    type: 'income',
    category: 'sueldo',
    predictedCategory: 'sueldo',
    mlConfidence: 0.98,
    createdAt: '2027-01-02T09:00:00Z',
  },
  {
    id: 'tx-demo-2',
    date: '2027-01-02',
    description: 'Aporte empresarial vivienda enero',
    amount: 1660000,
    type: 'income',
    category: 'aporte_empresa',
    predictedCategory: 'aporte_empresa',
    mlConfidence: 0.97,
    createdAt: '2027-01-02T09:10:00Z',
  },
  {
    id: 'tx-demo-3',
    date: '2027-01-04',
    description: 'Alquiler departamento enero + expensas',
    amount: 1900000,
    type: 'expense',
    category: 'alquiler',
    predictedCategory: 'alquiler',
    mlConfidence: 0.99,
    createdAt: '2027-01-04T11:20:00Z',
  },
  {
    id: 'tx-demo-4',
    date: '2027-01-04',
    description: 'Transferencia ahorro programado enero',
    amount: 400000,
    type: 'expense',
    category: 'ahorro',
    predictedCategory: 'ahorro',
    mlConfidence: 0.98,
    createdAt: '2027-01-04T11:30:00Z',
  },
  {
    id: 'tx-demo-5',
    date: '2027-01-05',
    description: 'Diezmo mensual iglesia',
    amount: 400000,
    type: 'expense',
    category: 'diezmo',
    predictedCategory: 'diezmo',
    mlConfidence: 0.99,
    createdAt: '2027-01-05T10:00:00Z',
  },
  {
    id: 'tx-demo-6',
    date: '2027-01-06',
    description: 'Coto supermercado compra semanal alimentos',
    amount: 345000,
    type: 'expense',
    category: 'alimentacion',
    predictedCategory: 'alimentacion',
    mlConfidence: 0.96,
    createdAt: '2027-01-06T18:15:00Z',
  },
  {
    id: 'tx-demo-7',
    date: '2027-01-08',
    description: 'YPF nafta super tanque lleno y peaje',
    amount: 118000,
    type: 'expense',
    category: 'transporte',
    predictedCategory: 'transporte',
    mlConfidence: 0.95,
    createdAt: '2027-01-08T14:40:00Z',
  },
  {
    id: 'tx-demo-8',
    date: '2027-01-10',
    description: 'Edenor factura electricidad y Fibertel internet',
    amount: 215000,
    type: 'expense',
    category: 'servicios',
    predictedCategory: 'servicios',
    mlConfidence: 0.94,
    createdAt: '2027-01-10T16:00:00Z',
  },
  {
    id: 'tx-demo-9',
    date: '2027-01-11',
    description: 'Farmacity medicamentos y vitaminas familia',
    amount: 162000,
    type: 'expense',
    category: 'salud',
    predictedCategory: 'salud',
    mlConfidence: 0.95,
    notes: 'Incluyó antibiótico pediátrico extraordinario',
    createdAt: '2027-01-11T19:10:00Z',
  },
  {
    id: 'tx-demo-10',
    date: '2027-01-12',
    description: 'Zapatillas deportivas y remeras verano',
    amount: 178000,
    type: 'expense',
    category: 'ropa',
    predictedCategory: 'ropa',
    mlConfidence: 0.93,
    createdAt: '2027-01-12T17:05:00Z',
  },
  {
    id: 'tx-demo-11',
    date: '2027-01-14',
    description: 'Honorarios consultoría ingreso extra enero',
    amount: 700000,
    type: 'income',
    category: 'ingreso_extra',
    predictedCategory: 'ingreso_extra',
    mlConfidence: 0.94,
    createdAt: '2027-01-14T12:00:00Z',
  },
  {
    id: 'tx-demo-12',
    date: '2027-01-15',
    description: 'Carnicería y verdulería compras frescas',
    amount: 195000,
    type: 'expense',
    category: 'alimentacion',
    predictedCategory: 'alimentacion',
    mlConfidence: 0.96,
    createdAt: '2027-01-15T11:45:00Z',
  },
];

export function formatARS(amount: number, showSign = false): string {
  const absVal = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(absVal);
  if (amount < 0) return `-$${formatted}`;
  if (showSign && amount > 0) return `+$${formatted}`;
  return `$${formatted}`;
}
