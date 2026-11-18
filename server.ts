import express, { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEGACY_STORE_FILE = path.join(DATA_DIR, 'budget-store.json');
const MULTI_STORE_FILE = path.join(DATA_DIR, 'multi-user-store.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');
const SESSION_COOKIE_NAME = 'pf_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const USER_COLORS = ['#1D4ED8', '#0F766E', '#7C3AED', '#B45309', '#BE123C', '#047857'];

const DEFAULT_ASSUMPTIONS = {
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

const DEFAULT_ALERT_RULES = {
  warningThresholdPct: 85,
  overspendThresholdPct: 100,
  paceDeviationWarningPct: 15,
  surplusMinAmount: 60000,
  dailyCapWarningPct: 100,
  categoryCustomCaps: {},
};

const INITIAL_DEMO_TRANSACTIONS: Array<Record<string, unknown>> = [
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

const DEFAULT_CATEGORIES = [
  { id: 'alimentacion', label: 'Alimentación', shortLabel: 'Alimentos', type: 'expense', isDailyVariable: true, tier: 'esencial', color: '#2563EB', description: 'Supermercado, carnicería, verdulería, panadería y almacén.', isDefault: true },
  { id: 'servicios', label: 'Impuestos y servicios', shortLabel: 'Servicios', type: 'expense', isDailyVariable: true, tier: 'esencial', color: '#0891B2', description: 'Luz, gas, agua, internet, telefonía y tasas municipales.', isDefault: true },
  { id: 'ropa', label: 'Ropa y zapatillas', shortLabel: 'Indumentaria', type: 'expense', isDailyVariable: true, tier: 'compromiso', color: '#7C3AED', description: 'Indumentaria familiar, calzado y accesorios.', isDefault: true },
  { id: 'transporte', label: 'Transporte y combustible', shortLabel: 'Transporte', type: 'expense', isDailyVariable: true, tier: 'esencial', color: '#D97706', description: 'Nafta, peajes, estacionamiento, mantenimiento y SUBE.', isDefault: true },
  { id: 'salud', label: 'Salud y farmacia', shortLabel: 'Salud', type: 'expense', isDailyVariable: true, tier: 'esencial', color: '#DC2626', description: 'Medicamentos, farmacia, consultas médicas y odontología.', isDefault: true },
  { id: 'escuela', label: 'Escuela y gastos familiares', shortLabel: 'Escuela', type: 'expense', isDailyVariable: true, tier: 'esencial', color: '#059669', description: 'Cuotas escolares, útiles, librería y salidas familiares.', isDefault: true },
  { id: 'alquiler', label: 'Alquiler total', shortLabel: 'Alquiler', type: 'expense', isDailyVariable: false, tier: 'esencial', color: '#334155', description: 'Alquiler total de la vivienda (incluye aporte empresarial si corresponde).', isDefault: true },
  { id: 'deudas', label: 'Deudas CAPP y Municipalidad', shortLabel: 'Deudas', type: 'expense', isDailyVariable: false, tier: 'compromiso', color: '#64748B', description: 'Plan de cuotas sin interés adicional.', isDefault: true },
  { id: 'comision', label: 'Comisión inmobiliaria', shortLabel: 'Comisión', type: 'expense', isDailyVariable: false, tier: 'compromiso', color: '#475569', description: 'Cuotas iniciales de renovación o contrato.', isDefault: true },
  { id: 'deposito', label: 'Diferencia de depósito', shortLabel: 'Depósito', type: 'expense', isDailyVariable: false, tier: 'compromiso', color: '#94A3B8', description: 'Ajuste de depósito de garantía en enero.', isDefault: true },
  { id: 'diezmo', label: 'Diezmo', shortLabel: 'Diezmo', type: 'expense', isDailyVariable: false, tier: 'compromiso', color: '#0F766E', description: '10% exclusivo sobre el sueldo, sin adicional por aguinaldo.', isDefault: true },
  { id: 'ahorro', label: 'Ahorro programado', shortLabel: 'Ahorro', type: 'expense', isDailyVariable: false, tier: 'ahorro', color: '#15803D', description: 'Separación mensual fija al cobrar.', isDefault: true },
  { id: 'sueldo', label: 'Sueldo mensual', shortLabel: 'Sueldo', type: 'income', isDailyVariable: false, tier: 'ingreso', color: '#16A34A', description: 'Haberes mensuales en relación de dependencia.', isDefault: true },
  { id: 'aporte_empresa', label: 'Aporte empresa alquiler', shortLabel: 'Aporte emp.', type: 'income', isDailyVariable: false, tier: 'ingreso', color: '#0284C7', description: 'Subsidio fijo mensual de la empresa para vivienda.', isDefault: true },
  { id: 'ingreso_extra', label: 'Ingreso extra mensual', shortLabel: 'Extra', type: 'income', isDailyVariable: false, tier: 'ingreso', color: '#2563EB', description: 'Honorarios, trabajos independientes o ingresos proyectados.', isDefault: true },
  { id: 'aguinaldo', label: 'Aguinaldo (SAC)', shortLabel: 'Aguinaldo', type: 'income', isDailyVariable: false, tier: 'ingreso', color: '#0D9488', description: 'Sueldo Anual Complementario en julio y diciembre.', isDefault: true },
  { id: 'otro_ingreso', label: 'Otros ingresos', shortLabel: 'Otros ing.', type: 'income', isDailyVariable: false, tier: 'ingreso', color: '#4F46E5', description: 'Reintegros, ventas eventuales o ingresos extraordinarios.', isDefault: true },
];

type CurrencyCode = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'UYU' | 'CLP' | 'MXN';

interface CurrencySettingsStore {
  baseCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  ratesToBase: Record<CurrencyCode, number>;
}

const CURRENCY_DEFAULT_PER_USD: Record<CurrencyCode, number> = {
  ARS: 1150,
  USD: 1,
  EUR: 0.92,
  BRL: 5.75,
  UYU: 42.5,
  CLP: 970,
  MXN: 20.2,
};

const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  ARS: 0,
  USD: 2,
  EUR: 2,
  BRL: 2,
  UYU: 0,
  CLP: 0,
  MXN: 2,
};

const SUPPORTED_CURRENCY_CODES = Object.keys(CURRENCY_DEFAULT_PER_USD) as CurrencyCode[];

function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return typeof code === 'string' && SUPPORTED_CURRENCY_CODES.includes(code as CurrencyCode);
}

function getDefaultRatesForBase(base: CurrencyCode): Record<CurrencyCode, number> {
  const basePerUsd = CURRENCY_DEFAULT_PER_USD[base] ?? 1;
  const rates = {} as Record<CurrencyCode, number>;
  for (const code of SUPPORTED_CURRENCY_CODES) {
    if (code === base) {
      rates[code] = 1;
    } else {
      const raw = basePerUsd / CURRENCY_DEFAULT_PER_USD[code];
      rates[code] = raw >= 10 ? Math.round(raw * 100) / 100 : Math.round(raw * 10000) / 10000;
    }
  }
  return rates;
}

function normalizeCurrencySettings(input?: Partial<CurrencySettingsStore> | null): CurrencySettingsStore {
  const baseCurrency: CurrencyCode = isSupportedCurrency(input?.baseCurrency)
    ? input!.baseCurrency!
    : 'ARS';
  const displayCurrency: CurrencyCode = isSupportedCurrency(input?.displayCurrency)
    ? input!.displayCurrency!
    : baseCurrency;
  const defaults = getDefaultRatesForBase(baseCurrency);
  const ratesToBase = { ...defaults };
  if (input?.ratesToBase && typeof input.ratesToBase === 'object') {
    for (const code of SUPPORTED_CURRENCY_CODES) {
      const val = Number((input.ratesToBase as Record<string, unknown>)[code]);
      if (Number.isFinite(val) && val > 0) {
        ratesToBase[code] = code === baseCurrency ? 1 : val;
      }
    }
  }
  ratesToBase[baseCurrency] = 1;
  return {
    baseCurrency,
    displayCurrency,
    ratesToBase,
  };
}

function roundMoneyForCurrency(value: number, currency: CurrencyCode): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function convertStoredBudgetAmounts(
  data: BudgetData,
  divisor: number,
  targetCurrency: CurrencyCode,
): void {
  if (!Number.isFinite(divisor) || divisor <= 0 || Math.abs(divisor - 1) < 1e-9) return;
  const scale = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? roundMoneyForCurrency(v / divisor, targetCurrency) : v;

  const assumptionMoneyKeys = [
    'sueldoMensual',
    'aporteEmpresaAlquiler',
    'ingresoExtraMensual',
    'aguinaldoJulio',
    'aguinaldoDiciembre',
    'diezmoMensual',
    'ahorroMensual',
    'alquilerInicial',
    'baseAlimentacion',
    'baseServicios',
    'baseRopa',
    'baseTransporte',
    'baseSalud',
    'baseEscuela',
    'deudaMensual',
    'comisionCuota',
    'depositoEnero',
    'reservaDic2026',
    'metaReservaMin',
    'metaReservaMax',
  ];

  const overrideMoneyKeys = [
    'sueldo',
    'aporteEmpresa',
    'ingresoExtra',
    'aguinaldo',
    'alimentacion',
    'servicios',
    'ropa',
    'transporte',
    'salud',
    'escuela',
    'alquilerTotal',
    'deudas',
    'comision',
    'deposito',
    'diezmo',
    'ahorro',
  ];

  for (const yearPlan of Object.values(data.plansByYear)) {
    for (const key of assumptionMoneyKeys) {
      if (key in yearPlan.assumptions) {
        yearPlan.assumptions[key] = scale(yearPlan.assumptions[key]);
      }
    }
    const customBudgets = yearPlan.assumptions.customCategoryBudgets as Record<string, unknown> | undefined;
    if (customBudgets && typeof customBudgets === 'object') {
      for (const [k, v] of Object.entries(customBudgets)) {
        customBudgets[k] = scale(v);
      }
    }
    for (const ov of Object.values(yearPlan.monthlyOverrides)) {
      if (!ov || typeof ov !== 'object') continue;
      for (const key of overrideMoneyKeys) {
        if (key in ov) {
          ov[key] = scale(ov[key]);
        }
      }
      const customAmts = ov.customAmounts as Record<string, unknown> | undefined;
      if (customAmts && typeof customAmts === 'object') {
        for (const [k, v] of Object.entries(customAmts)) {
          customAmts[k] = scale(v);
        }
      }
    }
  }

  for (const tx of data.transactions) {
    if (typeof tx.amount === 'number' && Number.isFinite(tx.amount)) {
      tx.amount = roundMoneyForCurrency(tx.amount / divisor, targetCurrency);
    }
  }

  if (typeof data.alertRules.surplusMinAmount === 'number') {
    data.alertRules.surplusMinAmount = roundMoneyForCurrency(
      data.alertRules.surplusMinAmount / divisor,
      targetCurrency,
    );
  }
  const caps = data.alertRules.categoryCustomCaps as Record<string, unknown> | undefined;
  if (caps && typeof caps === 'object') {
    for (const [k, v] of Object.entries(caps)) {
      caps[k] = scale(v);
    }
  }

  for (const sample of data.customMlSamples) {
    if (typeof sample.amountHint === 'number') {
      sample.amountHint = roundMoneyForCurrency(sample.amountHint / divisor, targetCurrency);
    }
  }
}

interface YearPlanStore {
  assumptions: Record<string, unknown>;
  monthlyOverrides: Record<string, Record<string, unknown>>;
  referenceDayByMonth: Record<string, number>;
}

interface BudgetData {
  categories: Array<Record<string, unknown>>;
  plansByYear: Record<string, YearPlanStore>;
  transactions: Array<Record<string, unknown>>;
  alertRules: Record<string, unknown>;
  customMlSamples: Array<Record<string, unknown>>;
  currencySettings?: CurrencySettingsStore;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  color: string;
  activeWorkspaceId: string;
  createdAt: string;
}

interface WorkspaceMemberRecord {
  userId: string;
  role: 'owner' | 'editor';
  joinedAt: string;
}

interface WorkspaceInviteRecord {
  code: string;
  invitedEmail?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
}

interface WorkspaceRecord {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMemberRecord[];
  invites: WorkspaceInviteRecord[];
  data: BudgetData;
  createdAt: string;
}

interface MultiUserStore {
  users: UserRecord[];
  workspaces: WorkspaceRecord[];
}

interface AuthenticatedRequest extends Request {
  authUser?: UserRecord;
  multiStore?: MultiUserStore;
  activeWorkspace?: WorkspaceRecord;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  ensureDataDir();
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, 'utf-8');
  return generated;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function signSessionToken(userId: string): string {
  const secret = getSessionSecret();
  const payload = Buffer.from(
    JSON.stringify({
      uid: userId,
      exp: Date.now() + SESSION_TTL_MS,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const secret = getSessionSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      uid?: string;
      exp?: number;
    };
    if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) {
      return null;
    }
    return decoded.uid;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure || String(req.headers['x-forwarded-proto'] ?? '').toLowerCase() === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure || String(req.headers['x-forwarded-proto'] ?? '').toLowerCase() === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function getDefaultAssumptionsForYear(year: number): Record<string, unknown> {
  if (year === 2027) {
    return { ...DEFAULT_ASSUMPTIONS };
  }
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

function ensureYearPlan(data: BudgetData, yearStr: string): YearPlanStore {
  if (!data.plansByYear[yearStr]) {
    const now = new Date();
    const yearNum = parseInt(yearStr, 10) || now.getFullYear();
    data.plansByYear[yearStr] = {
      assumptions: getDefaultAssumptionsForYear(yearNum),
      monthlyOverrides: {},
      referenceDayByMonth:
        yearNum === now.getFullYear()
          ? { [String(now.getMonth())]: now.getDate() }
          : { '0': 15 },
    };
  }
  return data.plansByYear[yearStr];
}

function createDefaultBudgetData(includeDemoTxs = false, ownerUser?: UserRecord): BudgetData {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const plansByYear: Record<string, YearPlanStore> = {};
  for (let y = 2018; y <= 2035; y++) {
    plansByYear[String(y)] = {
      assumptions: getDefaultAssumptionsForYear(y),
      monthlyOverrides: {},
      referenceDayByMonth:
        y === currentYear ? { [String(currentMonth)]: currentDay } : { '0': 15 },
    };
  }
  return {
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    plansByYear,
    transactions: includeDemoTxs
      ? INITIAL_DEMO_TRANSACTIONS.map((tx) => ({
          ...tx,
          ...(ownerUser
            ? {
                createdByUserId: ownerUser.id,
                createdByName: ownerUser.name,
                createdByEmail: ownerUser.email,
                createdByColor: ownerUser.color,
              }
            : {}),
        }))
      : [],
    alertRules: { ...DEFAULT_ALERT_RULES, categoryCustomCaps: {} },
    customMlSamples: [],
    currencySettings: normalizeCurrencySettings(),
  };
}

function readLegacyStoreForMigration(ownerUser: UserRecord): BudgetData | null {
  try {
    if (!fs.existsSync(LEGACY_STORE_FILE)) return null;
    const raw = fs.readFileSync(LEGACY_STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const defaults = createDefaultBudgetData(false);
    const plansByYear: Record<string, YearPlanStore> = { ...defaults.plansByYear };

    if (parsed.plansByYear && typeof parsed.plansByYear === 'object') {
      for (const [yKey, yVal] of Object.entries(
        parsed.plansByYear as Record<string, Partial<YearPlanStore>>,
      )) {
        const yNum = parseInt(yKey, 10) || 2027;
        plansByYear[yKey] = {
          assumptions: {
            ...getDefaultAssumptionsForYear(yNum),
            ...(yVal?.assumptions ?? {}),
          },
          monthlyOverrides: yVal?.monthlyOverrides ?? {},
          referenceDayByMonth: yVal?.referenceDayByMonth ?? { '0': 15 },
        };
      }
    }

    const rawTxs: Array<Record<string, unknown>> = Array.isArray(parsed.transactions)
      ? (parsed.transactions as Array<Record<string, unknown>>)
      : INITIAL_DEMO_TRANSACTIONS;

    const migratedTxs = rawTxs.map((tx) => ({
      ...tx,
      createdByUserId: tx.createdByUserId ?? ownerUser.id,
      createdByName: tx.createdByName ?? ownerUser.name,
      createdByEmail: tx.createdByEmail ?? ownerUser.email,
      createdByColor: tx.createdByColor ?? ownerUser.color,
    }));

    return {
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? (parsed.categories as Array<Record<string, unknown>>)
          : defaults.categories,
      plansByYear,
      transactions: migratedTxs,
      alertRules: {
        ...DEFAULT_ALERT_RULES,
        ...((parsed.alertRules as Record<string, unknown>) ?? {}),
      },
      customMlSamples: Array.isArray(parsed.customMlSamples)
        ? (parsed.customMlSamples as Array<Record<string, unknown>>)
        : [],
      currencySettings: normalizeCurrencySettings(
        parsed.currencySettings as Partial<CurrencySettingsStore> | undefined,
      ),
    };
  } catch {
    return null;
  }
}

function readMultiStore(): MultiUserStore {
  ensureDataDir();
  try {
    if (!fs.existsSync(MULTI_STORE_FILE)) {
      const empty: MultiUserStore = { users: [], workspaces: [] };
      fs.writeFileSync(MULTI_STORE_FILE, JSON.stringify(empty, null, 2), 'utf-8');
      return empty;
    }
    const raw = fs.readFileSync(MULTI_STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MultiUserStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
    };
  } catch {
    return { users: [], workspaces: [] };
  }
}

function writeMultiStore(store: MultiUserStore): void {
  ensureDataDir();
  const tmpFile = `${MULTI_STORE_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpFile, MULTI_STORE_FILE);
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    activeWorkspaceId: user.activeWorkspaceId,
    createdAt: user.createdAt,
  };
}

function pruneExpiredInvites(ws: WorkspaceRecord): void {
  const now = Date.now();
  ws.invites = ws.invites.filter((inv) => new Date(inv.expiresAt).getTime() > now);
}

function buildWorkspaceSummary(ws: WorkspaceRecord, store: MultiUserStore, viewerId: string) {
  pruneExpiredInvites(ws);
  const viewerMember = ws.members.find((m) => m.userId === viewerId);
  const members = ws.members
    .map((m) => {
      const u = store.users.find((usr) => usr.id === m.userId);
      if (!u) return null;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: m.role,
        color: u.color,
        joinedAt: m.joinedAt,
      };
    })
    .filter(Boolean);

  return {
    id: ws.id,
    name: ws.name,
    ownerId: ws.ownerId,
    role: viewerMember?.role ?? 'editor',
    members,
    invites: ws.invites,
  };
}

function getPendingInvitesForEmail(store: MultiUserStore, email: string) {
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const pending: Array<{
    workspaceId: string;
    workspaceName: string;
    code: string;
    createdByName: string;
    createdAt: string;
    expiresAt: string;
  }> = [];

  for (const ws of store.workspaces) {
    for (const inv of ws.invites) {
      if (
        inv.invitedEmail &&
        normalizeEmail(inv.invitedEmail) === normalized &&
        new Date(inv.expiresAt).getTime() > now
      ) {
        pending.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          code: inv.code,
          createdByName: inv.createdByName,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        });
      }
    }
  }
  return pending;
}

function ensureUserHasActiveWorkspace(store: MultiUserStore, user: UserRecord): WorkspaceRecord {
  const memberWorkspaces = store.workspaces.filter((ws) =>
    ws.members.some((m) => m.userId === user.id),
  );
  let active = memberWorkspaces.find((ws) => ws.id === user.activeWorkspaceId);
  if (!active && memberWorkspaces.length > 0) {
    active = memberWorkspaces[0];
    user.activeWorkspaceId = active.id;
    writeMultiStore(store);
  }
  if (!active) {
    const newWs: WorkspaceRecord = {
      id: `ws-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: `Presupuesto de ${user.name.split(' ')[0]}`,
      ownerId: user.id,
      members: [
        {
          userId: user.id,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      invites: [],
      data: createDefaultBudgetData(false, user),
      createdAt: new Date().toISOString(),
    };
    store.workspaces.push(newWs);
    user.activeWorkspaceId = newWs.id;
    writeMultiStore(store);
    active = newWs;
  }
  return active;
}

function buildSessionResponsePayload(store: MultiUserStore, user: UserRecord) {
  const activeWs = ensureUserHasActiveWorkspace(store, user);
  const normalizedCurrency = normalizeCurrencySettings(activeWs.data.currencySettings);
  activeWs.data.currencySettings = normalizedCurrency;
  const memberWorkspaces = store.workspaces.filter((ws) =>
    ws.members.some((m) => m.userId === user.id),
  );
  return {
    user: sanitizeUser(user),
    workspaces: memberWorkspaces.map((ws) => buildWorkspaceSummary(ws, store, user.id)),
    activeWorkspace: buildWorkspaceSummary(activeWs, store, user.id),
    pendingInvites: getPendingInvitesForEmail(store, user.email),
    budget: {
      ...activeWs.data,
      currencySettings: normalizedCurrency,
    },
  };
}

function redeemInviteCode(
  store: MultiUserStore,
  user: UserRecord,
  rawCode: string,
): { workspace?: WorkspaceRecord; error?: string } {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Ingresá un código de invitación válido.' };

  const now = Date.now();
  for (const ws of store.workspaces) {
    pruneExpiredInvites(ws);
    const invIdx = ws.invites.findIndex(
      (i) => i.code.toUpperCase() === code && new Date(i.expiresAt).getTime() > now,
    );
    if (invIdx !== -1) {
      const invite = ws.invites[invIdx];
      if (!ws.members.some((m) => m.userId === user.id)) {
        ws.members.push({
          userId: user.id,
          role: 'editor',
          joinedAt: new Date().toISOString(),
        });
      }
      if (invite.invitedEmail) {
        ws.invites.splice(invIdx, 1);
      }
      user.activeWorkspaceId = ws.id;
      return { workspace: ws };
    }
  }
  return { error: 'El código de invitación no existe o ya venció.' };
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `PF-${suffix}`;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[SESSION_COOKIE_NAME];
  }
  if (!token) {
    res.status(401).json({ error: 'Debés iniciar sesión para continuar.' });
    return;
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Tu sesión venció. Volvé a iniciar sesión.' });
    return;
  }

  const store = readMultiStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }

  const activeWorkspace = ensureUserHasActiveWorkspace(store, user);
  req.authUser = user;
  req.multiStore = store;
  req.activeWorkspace = activeWorkspace;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // --- AUTH ENDPOINTS ---
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(buildSessionResponsePayload(req.multiStore!, req.authUser!));
  });

  app.post('/api/auth/register', (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';

    if (name.length < 2) {
      res.status(400).json({ error: 'Ingresá tu nombre (mínimo 2 caracteres).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Ingresá un correo electrónico válido.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const store = readMultiStore();
    if (store.users.some((u) => normalizeEmail(u.email) === email)) {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
      return;
    }

    const isFirstUser = store.users.length === 0;
    const userId = `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const color = USER_COLORS[store.users.length % USER_COLORS.length];

    const newUser: UserRecord = {
      id: userId,
      name,
      email,
      passwordHash: hashPassword(password),
      color,
      activeWorkspaceId: '',
      createdAt: new Date().toISOString(),
    };

    const migratedLegacy = isFirstUser ? readLegacyStoreForMigration(newUser) : null;
    const personalWs: WorkspaceRecord = {
      id: `ws-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: isFirstUser ? 'Presupuesto Familiar' : `Presupuesto de ${name.split(' ')[0]}`,
      ownerId: userId,
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      invites: [],
      data: migratedLegacy ?? createDefaultBudgetData(isFirstUser, newUser),
      createdAt: new Date().toISOString(),
    };

    newUser.activeWorkspaceId = personalWs.id;
    store.users.push(newUser);
    store.workspaces.push(personalWs);

    if (inviteCode) {
      const joined = redeemInviteCode(store, newUser, inviteCode);
      if (joined.error) {
        res.status(400).json({ error: joined.error });
        return;
      }
    }

    writeMultiStore(store);

    const token = signSessionToken(newUser.id);
    setSessionCookie(req, res, token);
    res.json({
      token,
      ...buildSessionResponsePayload(store, newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';

    const store = readMultiStore();
    const user = store.users.find((u) => normalizeEmail(u.email) === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      return;
    }

    if (inviteCode) {
      const joined = redeemInviteCode(store, user, inviteCode);
      if (joined.error) {
        res.status(400).json({ error: joined.error });
        return;
      }
      writeMultiStore(store);
    }

    const token = signSessionToken(user.id);
    setSessionCookie(req, res, token);
    res.json({
      token,
      ...buildSessionResponsePayload(store, user),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // --- WORKSPACE & SHARING ENDPOINTS ---
  app.post('/api/workspaces', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'Ingresá un nombre para el presupuesto.' });
      return;
    }

    const ws: WorkspaceRecord = {
      id: `ws-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      ownerId: user.id,
      members: [{ userId: user.id, role: 'owner', joinedAt: new Date().toISOString() }],
      invites: [],
      data: createDefaultBudgetData(false, user),
      createdAt: new Date().toISOString(),
    };
    store.workspaces.push(ws);
    user.activeWorkspaceId = ws.id;
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/workspaces/switch', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const workspaceId = typeof req.body?.workspaceId === 'string' ? req.body.workspaceId : '';
    const target = store.workspaces.find(
      (ws) => ws.id === workspaceId && ws.members.some((m) => m.userId === user.id),
    );
    if (!target) {
      res.status(404).json({ error: 'Presupuesto no encontrado o sin acceso.' });
      return;
    }
    user.activeWorkspaceId = target.id;
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.patch('/api/workspaces/:workspaceId', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = store.workspaces.find((w) => w.id === req.params.workspaceId);
    if (!ws || ws.ownerId !== user.id) {
      res.status(403).json({ error: 'Solo quien creó este presupuesto puede renombrarlo.' });
      return;
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'El nombre no puede estar vacío.' });
      return;
    }
    ws.name = name;
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/workspaces/:workspaceId/share', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = store.workspaces.find(
      (w) => w.id === req.params.workspaceId && w.members.some((m) => m.userId === user.id),
    );
    if (!ws) {
      res.status(404).json({ error: 'Presupuesto no encontrado.' });
      return;
    }

    pruneExpiredInvites(ws);
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const invitedEmail = rawEmail ? normalizeEmail(rawEmail) : undefined;
    if (invitedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
      res.status(400).json({ error: 'El correo del invitado no es válido.' });
      return;
    }

    if (invitedEmail) {
      const existingMember = ws.members.find((m) => {
        const u = store.users.find((usr) => usr.id === m.userId);
        return u && normalizeEmail(u.email) === invitedEmail;
      });
      if (existingMember) {
        res.status(400).json({ error: 'Ese usuario ya forma parte de este presupuesto.' });
        return;
      }
      // Replace any prior invite for the same email to keep list tidy
      ws.invites = ws.invites.filter(
        (i) => !i.invitedEmail || normalizeEmail(i.invitedEmail) !== invitedEmail,
      );
    }

    const code = generateInviteCode();
    const now = Date.now();
    const invite: WorkspaceInviteRecord = {
      code,
      ...(invitedEmail ? { invitedEmail } : {}),
      createdByUserId: user.id,
      createdByName: user.name,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
    ws.invites.unshift(invite);
    writeMultiStore(store);

    res.json({
      invite,
      ...buildSessionResponsePayload(store, user),
    });
  });

  app.post('/api/workspaces/join', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const joined = redeemInviteCode(store, user, code);
    if (joined.error) {
      res.status(400).json({ error: joined.error });
      return;
    }
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.delete(
    '/api/workspaces/:workspaceId/invites/:code',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const store = req.multiStore!;
      const user = req.authUser!;
      const ws = store.workspaces.find(
        (w) => w.id === req.params.workspaceId && w.members.some((m) => m.userId === user.id),
      );
      if (!ws) {
        res.status(404).json({ error: 'Presupuesto no encontrado.' });
        return;
      }
      ws.invites = ws.invites.filter((i) => i.code !== req.params.code);
      writeMultiStore(store);
      res.json(buildSessionResponsePayload(store, user));
    },
  );

  app.delete(
    '/api/workspaces/:workspaceId/members/:memberId',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const store = req.multiStore!;
      const user = req.authUser!;
      const ws = store.workspaces.find((w) => w.id === req.params.workspaceId);
      if (!ws) {
        res.status(404).json({ error: 'Presupuesto no encontrado.' });
        return;
      }
      const targetMemberId = req.params.memberId;
      if (targetMemberId === ws.ownerId) {
        res.status(400).json({ error: 'El propietario del presupuesto no puede ser eliminado.' });
        return;
      }
      const isSelfLeave = targetMemberId === user.id;
      const isOwnerRemoving = ws.ownerId === user.id;
      if (!isSelfLeave && !isOwnerRemoving) {
        res.status(403).json({ error: 'No tenés permisos para quitar a este integrante.' });
        return;
      }

      ws.members = ws.members.filter((m) => m.userId !== targetMemberId);
      const removedUser = store.users.find((u) => u.id === targetMemberId);
      if (removedUser && removedUser.activeWorkspaceId === ws.id) {
        ensureUserHasActiveWorkspace(store, removedUser);
      }
      writeMultiStore(store);
      res.json(buildSessionResponsePayload(store, user));
    },
  );

  // --- BUDGET & TRANSACTION ENDPOINTS (SCOPED TO ACTIVE WORKSPACE) ---
  app.get('/api/budget', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(buildSessionResponsePayload(req.multiStore!, req.authUser!));
  });

  app.post('/api/transactions', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const tx = req.body?.transaction;
    const mlSample = req.body?.mlSample;

    if (!tx || typeof tx.description !== 'string' || typeof tx.amount !== 'number') {
      res.status(400).json({ error: 'Transacción inválida' });
      return;
    }

    const stampedTx = {
      ...tx,
      id:
        typeof tx.id === 'string' && tx.id
          ? tx.id
          : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdByUserId: user.id,
      createdByName: user.name,
      createdByEmail: user.email,
      createdByColor: user.color,
      createdAt: new Date().toISOString(),
    };

    ws.data.transactions.unshift(stampedTx);
    if (mlSample && typeof mlSample.text === 'string' && typeof mlSample.category === 'string') {
      ws.data.customMlSamples.unshift(mlSample);
    }
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.put('/api/transactions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const { id } = req.params;
    const updated = req.body?.transaction;
    const mlSample = req.body?.mlSample;

    const idx = ws.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Movimiento no encontrado' });
      return;
    }

    const existing = ws.data.transactions[idx];
    const nextTx: Record<string, unknown> = {
      ...existing,
      ...updated,
      id,
      createdByUserId: existing.createdByUserId ?? user.id,
      createdByName: existing.createdByName ?? user.name,
      createdByEmail: existing.createdByEmail ?? user.email,
      createdByColor: existing.createdByColor ?? user.color,
      createdAt: existing.createdAt,
      updatedByUserId: user.id,
      updatedByName: user.name,
      updatedAt: new Date().toISOString(),
    };
    if (!updated?.originalCurrency) {
      delete nextTx.originalCurrency;
      delete nextTx.originalAmount;
      delete nextTx.exchangeRate;
    }
    ws.data.transactions[idx] = nextTx;
    if (mlSample && typeof mlSample.text === 'string' && typeof mlSample.category === 'string') {
      ws.data.customMlSamples.unshift(mlSample);
    }
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.delete('/api/transactions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.transactions = ws.data.transactions.filter((t) => t.id !== req.params.id);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/transactions/clear', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.transactions = [];
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/transactions/seed-demo', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.transactions = INITIAL_DEMO_TRANSACTIONS.map((tx) => ({
      ...tx,
      createdByUserId: user.id,
      createdByName: user.name,
      createdByEmail: user.email,
      createdByColor: user.color,
    }));
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.put('/api/years/:year/assumptions', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const yearPlan = ensureYearPlan(ws.data, req.params.year);
    yearPlan.assumptions = { ...yearPlan.assumptions, ...(req.body ?? {}) };
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.put(
    '/api/years/:year/monthly-overrides/:monthIndex',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const store = req.multiStore!;
      const user = req.authUser!;
      const ws = req.activeWorkspace!;
      const yearPlan = ensureYearPlan(ws.data, req.params.year);
      const { monthIndex } = req.params;
      const payload = (req.body ?? {}) as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) {
          cleaned[k] = v;
        } else if (k === 'customAmounts' && v && typeof v === 'object') {
          const cleanedCustom: Record<string, number> = {};
          for (const [ck, cv] of Object.entries(v as Record<string, unknown>)) {
            if (typeof cv === 'number' && !Number.isNaN(cv) && cv >= 0) {
              cleanedCustom[ck] = cv;
            }
          }
          if (Object.keys(cleanedCustom).length > 0) {
            cleaned.customAmounts = cleanedCustom;
          }
        }
      }
      if (Object.keys(cleaned).length === 0) {
        delete yearPlan.monthlyOverrides[monthIndex];
      } else {
        yearPlan.monthlyOverrides[monthIndex] = cleaned;
      }
      writeMultiStore(store);
      res.json(buildSessionResponsePayload(store, user));
    },
  );

  app.post('/api/categories', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) {
      res.status(400).json({ error: 'El nombre del tipo es obligatorio' });
      return;
    }
    const baseSlug =
      label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'tipo';
    let id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : baseSlug;
    while (ws.data.categories.some((c) => c.id === id)) {
      id = `${baseSlug}_${Math.random().toString(36).slice(2, 5)}`;
    }
    const newCat = {
      id,
      label,
      shortLabel:
        typeof body.shortLabel === 'string' && body.shortLabel.trim()
          ? body.shortLabel.trim()
          : label.slice(0, 14),
      type: body.type === 'income' ? 'income' : 'expense',
      isDailyVariable: body.type === 'income' ? false : Boolean(body.isDailyVariable),
      tier:
        body.type === 'income'
          ? 'ingreso'
          : ['esencial', 'ahorro', 'compromiso'].includes(String(body.tier))
            ? String(body.tier)
            : 'compromiso',
      color: typeof body.color === 'string' && body.color ? body.color : '#2563EB',
      description: typeof body.description === 'string' ? body.description.trim() : '',
      isDefault: false,
    };
    ws.data.categories.push(newCat);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.put('/api/categories/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const { id } = req.params;
    const idx = ws.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const current = ws.data.categories[idx];
    const nextType =
      body.type === 'income' ? 'income' : body.type === 'expense' ? 'expense' : current.type;
    ws.data.categories[idx] = {
      ...current,
      label: typeof body.label === 'string' && body.label.trim() ? body.label.trim() : current.label,
      shortLabel:
        typeof body.shortLabel === 'string' && body.shortLabel.trim()
          ? body.shortLabel.trim()
          : current.shortLabel,
      type: nextType,
      isDailyVariable:
        nextType === 'income'
          ? false
          : typeof body.isDailyVariable === 'boolean'
            ? body.isDailyVariable
            : current.isDailyVariable,
      tier:
        nextType === 'income'
          ? 'ingreso'
          : typeof body.tier === 'string' && ['esencial', 'ahorro', 'compromiso'].includes(body.tier)
            ? body.tier
            : current.tier === 'ingreso'
              ? 'compromiso'
              : current.tier,
      color: typeof body.color === 'string' && body.color ? body.color : current.color,
      description:
        typeof body.description === 'string' ? body.description.trim() : current.description,
    };
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.delete('/api/categories/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const { id } = req.params;
    ws.data.categories = ws.data.categories.filter((c) => c.id !== id);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/categories/reset', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.delete(
    '/api/years/:year/monthly-overrides/:monthIndex',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const store = req.multiStore!;
      const user = req.authUser!;
      const ws = req.activeWorkspace!;
      const yearPlan = ensureYearPlan(ws.data, req.params.year);
      delete yearPlan.monthlyOverrides[req.params.monthIndex];
      writeMultiStore(store);
      res.json(buildSessionResponsePayload(store, user));
    },
  );

  app.put('/api/years/:year/reference-day', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const yearPlan = ensureYearPlan(ws.data, req.params.year);
    const { monthIndex, day } = req.body ?? {};
    if (typeof monthIndex === 'number' && typeof day === 'number') {
      yearPlan.referenceDayByMonth[String(monthIndex)] = day;
      writeMultiStore(store);
    }
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post(
    '/api/years/:targetYear/copy-from/:sourceYear',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const store = req.multiStore!;
      const user = req.authUser!;
      const ws = req.activeWorkspace!;
      const sourcePlan = ensureYearPlan(ws.data, req.params.sourceYear);
      const targetPlan = ensureYearPlan(ws.data, req.params.targetYear);
      targetPlan.assumptions = { ...sourcePlan.assumptions };
      targetPlan.monthlyOverrides = JSON.parse(JSON.stringify(sourcePlan.monthlyOverrides));
      writeMultiStore(store);
      res.json(buildSessionResponsePayload(store, user));
    },
  );

  app.put('/api/alert-rules', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.alertRules = { ...ws.data.alertRules, ...(req.body ?? {}) };
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/ml/samples', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const sample = req.body;
    if (!sample || typeof sample.text !== 'string' || typeof sample.category !== 'string') {
      res.status(400).json({ error: 'Ejemplo de entrenamiento inválido' });
      return;
    }
    ws.data.customMlSamples.unshift(sample);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.delete('/api/ml/samples/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data.customMlSamples = ws.data.customMlSamples.filter((s) => s.id !== req.params.id);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.put('/api/currency-settings', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    const current = normalizeCurrencySettings(ws.data.currencySettings);
    const body = (req.body ?? {}) as Record<string, unknown>;

    const nextBase: CurrencyCode = isSupportedCurrency(body.baseCurrency)
      ? body.baseCurrency
      : current.baseCurrency;
    const nextDisplay: CurrencyCode = isSupportedCurrency(body.displayCurrency)
      ? body.displayCurrency
      : current.displayCurrency;
    const convertExistingData = Boolean(body.convertExistingData);

    // Start from incoming rates or current rates
    const incomingRates =
      body.ratesToBase && typeof body.ratesToBase === 'object'
        ? (body.ratesToBase as Record<string, unknown>)
        : {};

    let nextRates: Record<CurrencyCode, number>;
    if (nextBase === current.baseCurrency) {
      nextRates = { ...current.ratesToBase };
      for (const code of SUPPORTED_CURRENCY_CODES) {
        const val = Number(incomingRates[code]);
        if (Number.isFinite(val) && val > 0) {
          nextRates[code] = code === nextBase ? 1 : val;
        }
      }
      nextRates[nextBase] = 1;
    } else {
      // If ratesToBase was already computed relative to nextBase by the client, use them directly;
      // otherwise derive from current rates
      const clientSentNewBaseOne = Number(incomingRates[nextBase]) === 1;
      const factorOldPerNew =
        Number(current.ratesToBase[nextBase]) > 0 ? Number(current.ratesToBase[nextBase]) : 1;

      if (clientSentNewBaseOne && Object.keys(incomingRates).length > 1) {
        nextRates = getDefaultRatesForBase(nextBase);
        for (const code of SUPPORTED_CURRENCY_CODES) {
          const val = Number(incomingRates[code]);
          if (Number.isFinite(val) && val > 0) {
            nextRates[code] = code === nextBase ? 1 : val;
          }
        }
      } else {
        nextRates = { ...getDefaultRatesForBase(nextBase) };
        for (const code of SUPPORTED_CURRENCY_CODES) {
          if (code === nextBase) {
            nextRates[code] = 1;
          } else {
            const oldRate = Number(current.ratesToBase[code]) || 1;
            const derived = oldRate / factorOldPerNew;
            nextRates[code] =
              derived >= 10 ? Math.round(derived * 100) / 100 : Math.round(derived * 10000) / 10000;
          }
        }
      }

      if (convertExistingData) {
        // 1 unit of nextBase = factorOldPerNew units of oldBase -> divide stored amounts by factorOldPerNew
        convertStoredBudgetAmounts(ws.data, factorOldPerNew, nextBase);
      }
    }

    ws.data.currencySettings = normalizeCurrencySettings({
      baseCurrency: nextBase,
      displayCurrency: nextDisplay,
      ratesToBase: nextRates,
    });
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  app.post('/api/reset-all', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = req.multiStore!;
    const user = req.authUser!;
    const ws = req.activeWorkspace!;
    ws.data = createDefaultBudgetData(false, user);
    writeMultiStore(store);
    res.json(buildSessionResponsePayload(store, user));
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
