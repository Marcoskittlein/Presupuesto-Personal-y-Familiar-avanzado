export type CategoryId = string;

export type ExpenseCategoryId = string;

export type DailyVariableCategoryId = string;

export type TransactionType = 'expense' | 'income';

export type IncomeDayMode = 'business_day' | 'calendar_day';

export type PriorityTier = 'esencial' | 'ahorro' | 'compromiso' | 'ingreso';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  type: TransactionType;
  isDailyVariable: boolean;
  tier: PriorityTier;
  color: string;
  description: string;
  isDefault?: boolean;
}

export interface MonthPlan {
  monthIndex: number; // 0 = Enero, 11 = Diciembre
  monthName: string;
  shortName: string;
  daysInMonth: number;
  fechaIngresoPrevista: number;
  reglaIngresoTexto: string;
  // Ingresos
  sueldo: number;
  aporteEmpresa: number;
  ingresoExtra: number;
  aguinaldo: number;
  ingresosTotales: number;
  // Gastos cotidianos (variables)
  alimentacion: number;
  servicios: number;
  ropa: number;
  transporte: number;
  salud: number;
  escuela: number;
  totalCotidiano: number;
  // Compromisos y ahorro
  alquilerTotal: number;
  alquilerBolsillo: number; // alquilerTotal - aporteEmpresa
  deudas: number;
  comision: number;
  deposito: number;
  diezmo: number;
  ahorro: number;
  totalCompromisos: number;
  // Dynamic map covering all active categories (built-in + custom)
  categoryBudgets: Record<string, number>;
  // Totales
  gastosTotalesConAhorro: number;
  saldoMensual: number;
  saldoAcumulado: number;
  reservaTotalAcumulada: number;
}

export interface BudgetAssumptions {
  sueldoMensual: number;
  aporteEmpresaAlquiler: number;
  ingresoExtraMensual: number;
  aguinaldoJulio: number;
  aguinaldoDiciembre: number;
  diezmoMensual: number;
  ahorroMensual: number;
  alquilerInicial: number;
  actualizacionAlquilerPct: number;
  inflacionMensualPct: number;
  baseAlimentacion: number;
  baseServicios: number;
  baseRopa: number;
  baseTransporte: number;
  baseSalud: number;
  baseEscuela: number;
  deudaMensual: number;
  comisionCuota: number;
  depositoEnero: number;
  incluirReservaDic2026: boolean;
  reservaDic2026: number;
  metaReservaMin: number;
  metaReservaMax: number;
  diaIngresoModo?: IncomeDayMode;
  diaIngresoValor?: number;
  customCategoryBudgets?: Record<string, number>;
}

export interface MonthlyOverride {
  sueldo?: number;
  aporteEmpresa?: number;
  ingresoExtra?: number;
  aguinaldo?: number;
  diaIngresoPrevisto?: number;
  alimentacion?: number;
  servicios?: number;
  ropa?: number;
  transporte?: number;
  salud?: number;
  escuela?: number;
  alquilerTotal?: number;
  deudas?: number;
  comision?: number;
  deposito?: number;
  diezmo?: number;
  ahorro?: number;
  customAmounts?: Record<string, number>;
}

export type MonthlyOverridesMap = Record<string, MonthlyOverride>;

export type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'UYU' | 'CLP' | 'MXN';

export type LanguageCode = 'es' | 'en' | 'pt';

export interface CurrencySettings {
  baseCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  ratesToBase: Record<CurrencyCode, number>;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // Always normalized in workspace baseCurrency
  originalAmount?: number;
  originalCurrency?: CurrencyCode;
  exchangeRate?: number;
  type: TransactionType;
  category: CategoryId;
  notes?: string;
  predictedCategory?: CategoryId;
  mlConfidence?: number;
  wasCorrectedByUser?: boolean;
  createdByUserId?: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByColor?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  color: string;
  activeWorkspaceId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'editor';
  color: string;
  joinedAt: string;
}

export interface WorkspaceInvite {
  code: string;
  invitedEmail?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
}

export interface PendingUserInvite {
  workspaceId: string;
  workspaceName: string;
  code: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
  role: 'owner' | 'editor';
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}

export interface AlertRules {
  warningThresholdPct: number; // default 85
  overspendThresholdPct: number; // default 100
  paceDeviationWarningPct: number; // default 15
  surplusMinAmount: number; // default 60000
  dailyCapWarningPct: number; // default 100
  categoryCustomCaps: Partial<Record<ExpenseCategoryId, number>>;
}

export type AlertSeverity = 'overspend' | 'warning' | 'surplus';

export interface BudgetAlert {
  id: string;
  severity: AlertSeverity;
  scope: 'annual' | 'monthly' | 'daily' | 'category';
  title: string;
  message: string;
  actionHint: string;
  category?: CategoryId;
  monthIndex?: number;
  amountImpact?: number;
  percentUsed?: number;
}

export interface TrainingSample {
  id: string;
  text: string;
  category: CategoryId;
  amountHint?: number;
  isDefault?: boolean;
}

export interface YearPlanData {
  assumptions: BudgetAssumptions;
  monthlyOverrides: MonthlyOverridesMap;
  referenceDayByMonth: Record<string, number>;
}

export interface BudgetStoreState {
  categories: CategoryMeta[];
  plansByYear: Record<string, YearPlanData>;
  transactions: Transaction[];
  alertRules: AlertRules;
  mlSamples: TrainingSample[];
  currencySettings?: CurrencySettings;
}
