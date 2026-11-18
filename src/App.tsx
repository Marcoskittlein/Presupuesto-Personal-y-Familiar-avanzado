import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  Coins,
  Download,
  Globe,
  LogOut,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AlertsRulesView } from './components/AlertsRulesView';
import { AnnualView } from './components/AnnualView';
import { AuthSuccessPayload, AuthView } from './components/AuthView';
import { CurrencySettingsModal } from './components/CurrencySettingsModal';
import { DailyView } from './components/DailyView';
import { MLClassifierView } from './components/MLClassifierView';
import { MonthlyView } from './components/MonthlyView';
import { ShareWorkspaceModal } from './components/ShareWorkspaceModal';
import { SimulatorView } from './components/SimulatorView';
import { TransactionModal } from './components/TransactionModal';
import {
  AVAILABLE_YEARS,
  CATEGORY_LIST,
  compute2027Projection,
  DEFAULT_ALERT_RULES,
  getDefaultAssumptionsForYear,
} from './data/budget2027';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { LANGUAGE_OPTIONS } from './i18n/translations';
import {
  DEFAULT_ML_SAMPLES,
  SupervisedTransactionClassifier,
} from './ml/supervisedClassifier';
import {
  AlertRules,
  AuthUser,
  BudgetAssumptions,
  CategoryMeta,
  CurrencyCode,
  CurrencySettings,
  LanguageCode,
  MonthlyOverride,
  PendingUserInvite,
  TrainingSample,
  Transaction,
  WorkspaceSummary,
  YearPlanData,
} from './types/budget';
import {
  computeMonthlyExecution,
  evaluateBudgetAlerts,
} from './utils/alertsEngine';
import {
  DEFAULT_CURRENCY_SETTINGS,
  normalizeCurrencySettings,
  SUPPORTED_CURRENCIES,
} from './utils/currency';
import { exportBudgetPdfReport } from './utils/pdfExport';

type AppTab = 'anual' | 'mensual' | 'diario' | 'presupuesto' | 'alertas' | 'ml';

const SESSION_TOKEN_KEY = 'pf_session_token';

interface ApiBudgetPayload {
  categories?: CategoryMeta[];
  plansByYear: Record<string, YearPlanData>;
  transactions: Transaction[];
  alertRules: AlertRules;
  customMlSamples: TrainingSample[];
  currencySettings?: CurrencySettings;
}

interface SessionBundleResponse {
  token?: string;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary;
  pendingInvites?: PendingUserInvite[];
  budget: ApiBudgetPayload;
  error?: string;
}

function buildInitialPlansMap(): Record<string, YearPlanData> {
  const plans: Record<string, YearPlanData> = {};
  for (const y of AVAILABLE_YEARS) {
    plans[String(y)] = {
      assumptions: getDefaultAssumptionsForYear(y),
      monthlyOverrides: {},
      referenceDayByMonth: { '0': 15 },
    };
  }
  return plans;
}

function getInitialInviteFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('invite') ?? '').trim().toUpperCase();
  } catch {
    return '';
  }
}

function clearInviteFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('invite')) {
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

export default function App() {
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(
    DEFAULT_CURRENCY_SETTINGS,
  );

  return (
    <I18nProvider currencySettings={currencySettings}>
      <BudgetApp onCurrencySettingsChange={setCurrencySettings} />
    </I18nProvider>
  );
}

interface BudgetAppProps {
  onCurrencySettingsChange: (next: CurrencySettings) => void;
}

const BudgetApp: React.FC<BudgetAppProps> = ({ onCurrencySettingsChange }) => {
  const { lang, setLang, t, months, currencySettings, formatBase } = useI18n();
  const today = useMemo(() => new Date(), []);
  const initialYear = AVAILABLE_YEARS.includes(today.getFullYear())
    ? today.getFullYear()
    : 2027;
  const initialMonth = today.getMonth();

  const [initialInviteCode] = useState<string>(() => getInitialInviteFromUrl());
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingUserInvite[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<AppTab>('anual');
  const [budgetEditorMode, setBudgetEditorMode] = useState<'annual' | 'monthly' | 'categories'>('annual');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(initialMonth);

  const [categories, setCategories] = useState<CategoryMeta[]>(CATEGORY_LIST);
  const [plansByYear, setPlansByYear] = useState<Record<string, YearPlanData>>(
    buildInitialPlansMap,
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRules>(DEFAULT_ALERT_RULES);
  const [customMlSamples, setCustomMlSamples] = useState<TrainingSample[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState(
    `${initialYear}-${String(initialMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  );
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const persistToken = useCallback((token: string | null) => {
    setSessionToken(token);
    try {
      if (token) {
        localStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const applyBudgetData = useCallback(
    (data: ApiBudgetPayload) => {
      setCategories(
        Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : CATEGORY_LIST,
      );
      setPlansByYear(data.plansByYear ?? buildInitialPlansMap());
      setTransactions(data.transactions ?? []);
      setAlertRules(data.alertRules ?? DEFAULT_ALERT_RULES);
      setCustomMlSamples(data.customMlSamples ?? []);
      onCurrencySettingsChange(normalizeCurrencySettings(data.currencySettings));
    },
    [onCurrencySettingsChange],
  );

  const applySessionBundle = useCallback(
    (bundle: SessionBundleResponse) => {
      if (bundle.token) {
        persistToken(bundle.token);
      }
      setCurrentUser(bundle.user);
      setWorkspaces(bundle.workspaces ?? []);
      setActiveWorkspace(bundle.activeWorkspace ?? null);
      setPendingInvites(bundle.pendingInvites ?? []);
      if (bundle.budget) {
        applyBudgetData(bundle.budget);
      }
      setLoadError(null);
    },
    [applyBudgetData, persistToken],
  );

  const handleUnauthorized = useCallback(() => {
    persistToken(null);
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setPendingInvites([]);
    onCurrencySettingsChange(DEFAULT_CURRENCY_SETTINGS);
  }, [persistToken, onCurrencySettingsChange]);

  const authFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (sessionToken) {
        headers.set('Authorization', `Bearer ${sessionToken}`);
      }
      const res = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      });
      if (res.status === 401) {
        handleUnauthorized();
      }
      return res;
    },
    [sessionToken, handleUnauthorized],
  );

  const fetchBudgetStore = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const res = await authFetch('/api/budget');
        if (res.status === 401) return;
        if (!res.ok) throw new Error('Error');
        const bundle = (await res.json()) as SessionBundleResponse;
        applySessionBundle(bundle);
      } catch {
        if (!silent) {
          setLoadError(t('loadError'));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [authFetch, applySessionBundle, t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAuthChecking(true);
      try {
        const headers = new Headers();
        if (sessionToken) {
          headers.set('Authorization', `Bearer ${sessionToken}`);
        }
        const res = await fetch('/api/auth/me', {
          headers,
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) {
            handleUnauthorized();
          }
          return;
        }
        const bundle = (await res.json()) as SessionBundleResponse;
        if (cancelled) return;
        applySessionBundle(bundle);

        if (initialInviteCode) {
          const joinRes = await fetch('/api/workspaces/join', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ code: initialInviteCode }),
          });
          if (joinRes.ok && !cancelled) {
            const joinedBundle = (await joinRes.json()) as SessionBundleResponse;
            applySessionBundle(joinedBundle);
          }
          clearInviteFromUrl();
        }
      } catch {
        if (!cancelled) {
          setLoadError(t('loadError'));
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // run once on initial mount

  // Auto-refresh shared workspaces silently on window focus and periodically
  useEffect(() => {
    if (!currentUser) return;
    const onFocus = () => {
      fetchBudgetStore(true);
    };
    window.addEventListener('focus', onFocus);
    const intervalId =
      (activeWorkspace?.members.length ?? 0) > 1
        ? window.setInterval(() => fetchBudgetStore(true), 20000)
        : null;
    return () => {
      window.removeEventListener('focus', onFocus);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [currentUser, activeWorkspace?.members.length, fetchBudgetStore]);

  const handleAuthenticated = (payload: AuthSuccessPayload) => {
    clearInviteFromUrl();
    applySessionBundle({
      token: payload.token,
      user: payload.user,
      workspaces: payload.workspaces,
      activeWorkspace: payload.activeWorkspace,
      pendingInvites: payload.pendingInvites,
      budget: payload.budget as unknown as ApiBudgetPayload,
    });
  };

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    handleUnauthorized();
  };

  const currentYearPlan = useMemo<YearPlanData>(() => {
    const existing = plansByYear[String(selectedYear)];
    if (existing) {
      return {
        assumptions: {
          ...getDefaultAssumptionsForYear(selectedYear),
          ...(existing.assumptions ?? {}),
        },
        monthlyOverrides: existing.monthlyOverrides ?? {},
        referenceDayByMonth: existing.referenceDayByMonth ?? { '0': 15 },
      };
    }
    return {
      assumptions: getDefaultAssumptionsForYear(selectedYear),
      monthlyOverrides: {},
      referenceDayByMonth: { '0': 15 },
    };
  }, [plansByYear, selectedYear]);

  const { assumptions, monthlyOverrides, referenceDayByMonth } = currentYearPlan;

  const projection = useMemo(
    () => compute2027Projection(assumptions, monthlyOverrides, selectedYear, categories),
    [assumptions, monthlyOverrides, selectedYear, categories],
  );
  const selectedMonthPlan = projection[selectedMonthIndex] ?? projection[0];

  const referenceDay = useMemo(() => {
    const stored = referenceDayByMonth[String(selectedMonthIndex)];
    if (typeof stored === 'number') {
      return Math.min(Math.max(1, stored), selectedMonthPlan.daysInMonth);
    }
    return Math.min(15, selectedMonthPlan.daysInMonth);
  }, [referenceDayByMonth, selectedMonthIndex, selectedMonthPlan.daysInMonth]);

  const allMlSamples = useMemo(
    () => [...customMlSamples, ...DEFAULT_ML_SAMPLES],
    [customMlSamples],
  );

  const classifier = useMemo(
    () => new SupervisedTransactionClassifier(allMlSamples),
    [allMlSamples],
  );

  const monthlyExecution = useMemo(
    () =>
      computeMonthlyExecution(
        selectedMonthPlan,
        transactions,
        referenceDay,
        alertRules,
        selectedYear,
        categories,
      ),
    [selectedMonthPlan, transactions, referenceDay, alertRules, selectedYear, categories],
  );

  const activeAlerts = useMemo(
    () =>
      evaluateBudgetAlerts(
        projection,
        selectedMonthIndex,
        referenceDay,
        transactions,
        alertRules,
        assumptions,
        selectedYear,
        categories,
        { lang, currencySettings },
      ),
    [
      projection,
      selectedMonthIndex,
      referenceDay,
      transactions,
      alertRules,
      assumptions,
      selectedYear,
      categories,
      lang,
      currencySettings,
    ],
  );

  const overspendAlerts = activeAlerts.filter((a) => a.severity === 'overspend').length;
  const warningAlerts = activeAlerts.filter((a) => a.severity === 'warning').length;
  const surplusAlerts = activeAlerts.filter((a) => a.severity === 'surplus').length;

  const handleOpenAddModal = (dateOverride?: string) => {
    setEditingTx(null);
    const defaultStr =
      dateOverride ??
      `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(
        referenceDay,
      ).padStart(2, '0')}`;
    setModalDefaultDate(defaultStr);
    setModalOpen(true);
  };

  const handleSaveTransaction = async (
    txDraft: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    teachModel: boolean,
  ) => {
    const mlSample = teachModel
      ? {
          id: `ml-user-${Date.now()}`,
          text: txDraft.description,
          category: txDraft.category,
          amountHint: txDraft.amount,
          isDefault: false,
        }
      : undefined;

    if (txDraft.id) {
      const res = await authFetch(`/api/transactions/${txDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: txDraft, mlSample }),
      });
      if (!res.ok) throw new Error('Error');
      applySessionBundle((await res.json()) as SessionBundleResponse);
    } else {
      const newTx: Transaction = {
        ...txDraft,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: newTx, mlSample }),
      });
      if (!res.ok) throw new Error('Error');
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }

    const parts = txDraft.date.split('-');
    const yearPart = parseInt(parts[0] ?? '2027', 10);
    const monthPart = parseInt(parts[1] ?? '1', 10) - 1;
    if (!Number.isNaN(yearPart) && AVAILABLE_YEARS.includes(yearPart)) {
      setSelectedYear(yearPart);
    }
    if (!Number.isNaN(monthPart) && monthPart >= 0 && monthPart <= 11) {
      setSelectedMonthIndex(monthPart);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleClearTransactions = async () => {
    const res = await authFetch('/api/transactions/clear', { method: 'POST' });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleSeedDemoTransactions = async () => {
    const res = await authFetch('/api/transactions/seed-demo', { method: 'POST' });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
      setSelectedYear(2027);
      setSelectedMonthIndex(0);
    }
  };

  const handleReferenceDayChange = async (day: number) => {
    setPlansByYear((prev) => {
      const key = String(selectedYear);
      const current = prev[key] ?? {
        assumptions: getDefaultAssumptionsForYear(selectedYear),
        monthlyOverrides: {},
        referenceDayByMonth: {},
      };
      return {
        ...prev,
        [key]: {
          ...current,
          referenceDayByMonth: {
            ...current.referenceDayByMonth,
            [String(selectedMonthIndex)]: day,
          },
        },
      };
    });
    await authFetch(`/api/years/${selectedYear}/reference-day`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthIndex: selectedMonthIndex, day }),
    });
  };

  const handleUpdateAlertRules = async (rules: AlertRules) => {
    const res = await authFetch('/api/alert-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleSaveCurrencySettings = async (payload: {
    baseCurrency: CurrencyCode;
    displayCurrency: CurrencyCode;
    ratesToBase: Record<CurrencyCode, number>;
    convertExistingData: boolean;
  }) => {
    const res = await authFetch('/api/currency-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleQuickDisplayCurrency = async (nextDisplay: CurrencyCode) => {
    const res = await authFetch('/api/currency-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayCurrency: nextDisplay }),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleSaveAssumptions = async (next: BudgetAssumptions) => {
    const res = await authFetch(`/api/years/${selectedYear}/assumptions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleSaveMonthlyOverride = async (monthIndex: number, override: MonthlyOverride) => {
    const res = await authFetch(`/api/years/${selectedYear}/monthly-overrides/${monthIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(override),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleResetMonthlyOverride = async (monthIndex: number) => {
    const res = await authFetch(`/api/years/${selectedYear}/monthly-overrides/${monthIndex}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleCopyFromYear = async (sourceYear: number) => {
    const res = await authFetch(`/api/years/${selectedYear}/copy-from/${sourceYear}`, {
      method: 'POST',
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleAddMlSample = async (sample: Omit<TrainingSample, 'id'>) => {
    const payload: TrainingSample = {
      ...sample,
      id: `ml-custom-${Date.now()}`,
    };
    const res = await authFetch('/api/ml/samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleDeleteMlSample = async (id: string) => {
    const res = await authFetch(`/api/ml/samples/${id}`, { method: 'DELETE' });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleCreateCategory = async (cat: Omit<CategoryMeta, 'id' | 'isDefault'>) => {
    const res = await authFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) throw new Error('Error');
    applySessionBundle((await res.json()) as SessionBundleResponse);
  };

  const handleUpdateCategory = async (id: string, patch: Partial<CategoryMeta>) => {
    const res = await authFetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Error');
    applySessionBundle((await res.json()) as SessionBundleResponse);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await authFetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  const handleResetCategories = async () => {
    const res = await authFetch('/api/categories/reset', { method: 'POST' });
    if (res.ok) {
      applySessionBundle((await res.json()) as SessionBundleResponse);
    }
  };

  // --- WORKSPACE SHARING HANDLERS ---
  const postWorkspaceAction = async (
    url: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: Record<string, unknown>,
  ) => {
    const res = await authFetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as SessionBundleResponse;
    if (!res.ok) {
      throw new Error(data.error ?? 'Error');
    }
    applySessionBundle(data);
  };

  const handleExportPdf = () => {
    exportBudgetPdfReport({
      selectedYear,
      projection,
      selectedMonth: selectedMonthPlan,
      execution: monthlyExecution,
      alerts: activeAlerts,
      transactions,
      assumptions,
      categories,
      lang,
      currencySettings,
    });
  };

  const openBudgetBuilder = (mode: 'annual' | 'monthly' | 'categories') => {
    setBudgetEditorMode(mode);
    setActiveTab('presupuesto');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthView
        initialInviteCode={initialInviteCode}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const workspaceMembers = activeWorkspace?.members ?? [];
  const selectedMonthLabel = months[selectedMonthIndex]?.name ?? selectedMonthPlan.monthName;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#anual"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('anual');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {t('brand')}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {(
              [
                { id: 'anual', label: t('navAnnual') },
                { id: 'mensual', label: t('navMonthly') },
                { id: 'diario', label: t('navDaily') },
                { id: 'presupuesto', label: t('navBudget') },
                { id: 'alertas', label: t('navAlerts') },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'presupuesto') {
                    setBudgetEditorMode('annual');
                  }
                  setActiveTab(item.id);
                }}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-blue-700 text-slate-900 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('btnAddExpense')}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
        {(
          [
            { id: 'anual', label: t('navAnnual') },
            { id: 'mensual', label: t('navMonthly') },
            { id: 'diario', label: t('navDaily') },
            { id: 'presupuesto', label: t('navBudget') },
            { id: 'alertas', label: t('navAlerts') },
            { id: 'ml', label: t('navMl') },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`py-1 whitespace-nowrap shrink-0 ${
              activeTab === item.id ? 'text-blue-700 font-semibold' : 'text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Shared Workspace, Multi-Currency & Multi-Language Account Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-slate-600">
            <span className="font-semibold text-slate-900">
              {activeWorkspace?.name ?? t('brand')}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {workspaceMembers.length}{' '}
              {workspaceMembers.length === 1 ? t('memberSingular') : t('memberPlural')}
              {workspaceMembers.length > 1 &&
                ` (${workspaceMembers.map((m) => m.name.split(' ')[0]).join(', ')})`}
            </span>
            {workspaces.length > 1 && activeWorkspace && (
              <>
                <span aria-hidden="true">·</span>
                <select
                  aria-label={t('shareActiveTitle')}
                  value={activeWorkspace.id}
                  onChange={(e) =>
                    postWorkspaceAction('/api/workspaces/switch', 'POST', {
                      workspaceId: e.target.value,
                    })
                  }
                  className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {pendingInvites.length > 0 && (
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                {pendingInvites.length}{' '}
                {pendingInvites.length === 1
                  ? t('pendingInviteSingular')
                  : t('pendingInvitePlural')}
              </button>
            )}

            {/* Quick Display Currency Selector */}
            <div className="inline-flex items-center gap-1">
              <label htmlFor="quick-display-currency" className="sr-only">
                {t('currencyLabel')}
              </label>
              <select
                id="quick-display-currency"
                value={currencySettings.displayCurrency}
                onChange={(e) => handleQuickDisplayCurrency(e.target.value as CurrencyCode)}
                className="px-2 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                title={t('currDisplayTitle')}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol.trim()})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCurrencyModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                title={t('currModalTitle')}
              >
                <Coins className="w-3.5 h-3.5" />
                {t('btnRates')}
              </button>
            </div>

            {/* Language Selector */}
            <div className="inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" aria-hidden="true" />
              <label htmlFor="workspace-lang-select" className="sr-only">
                {t('languageLabel')}
              </label>
              <select
                id="workspace-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="px-2 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.short} · {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              {t('btnShare')}
            </button>

            <span className="text-slate-400 hidden sm:inline" aria-hidden="true">
              |
            </span>

            <span className="text-slate-600 whitespace-nowrap">
              {t('sessionLabel')}{' '}
              <strong className="font-medium text-slate-900">{currentUser.name}</strong>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('btnLogout')}
            </button>
          </div>
        </div>

        {/* Workspace Context Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {activeTab === 'anual' && t('titleAnnual', { year: selectedYear })}
                {activeTab === 'mensual' &&
                  t('titleMonthly', { month: selectedMonthLabel, year: selectedYear })}
                {activeTab === 'diario' &&
                  t('titleDaily', { month: selectedMonthLabel, year: selectedYear })}
                {activeTab === 'presupuesto' && t('titleBudget', { year: selectedYear })}
                {activeTab === 'alertas' && t('titleAlerts', { year: selectedYear })}
                {activeTab === 'ml' && t('titleMl')}
              </h1>

              {/* Clean unboxed metadata alert summary */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('alertas')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-700" />
                  <span className="font-mono tabular-nums font-medium text-red-700">
                    {overspendAlerts}
                  </span>{' '}
                  {t('overspends')}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('alertas')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-mono tabular-nums font-medium text-amber-700">
                    {warningAlerts}
                  </span>{' '}
                  {t('atLimit')}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('alertas')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-mono tabular-nums font-medium text-emerald-700">
                    {surplusAlerts}
                  </span>{' '}
                  {t('surpluses')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="global-month-select" className="sr-only">
              {t('simMonthLabel')}
            </label>
            <select
              id="global-month-select"
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {months.map((m, idx) => (
                <option key={m.name} value={idx}>
                  {m.name}
                </option>
              ))}
            </select>

            <label htmlFor="global-year-select" className="sr-only">
              {t('simYearLabel')}
            </label>
            <select
              id="global-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'ml' ? 'anual' : 'ml')}
              className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'ml'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              {t('navMl')}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {t('btnExportPdf')}
            </button>

            {transactions.length > 0 ? (
              <button
                type="button"
                onClick={handleClearTransactions}
                title={t('btnClearLedger')}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-600 hover:text-red-700 hover:border-red-300 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('btnClearLedger')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSeedDemoTransactions}
                className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {t('btnSeedDemo')}
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error / Active View */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
                />
              ))}
            </div>
            <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        ) : loadError ? (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-center space-y-3">
            <p className="text-sm font-medium text-red-800">{loadError}</p>
            <button
              type="button"
              onClick={() => fetchBudgetStore(false)}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg"
            >
              {t('btnRetry')}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'anual' && (
              <AnnualView
                selectedYear={selectedYear}
                projection={projection}
                assumptions={assumptions}
                transactions={transactions}
                onSelectMonth={(mIdx) => {
                  setSelectedMonthIndex(mIdx);
                  setActiveTab('mensual');
                }}
                onOpenSimulator={() => openBudgetBuilder('annual')}
              />
            )}

            {activeTab === 'mensual' && (
              <MonthlyView
                selectedYear={selectedYear}
                monthPlan={selectedMonthPlan}
                execution={monthlyExecution}
                alerts={activeAlerts}
                alertRules={alertRules}
                categories={categories}
                assumptions={assumptions}
                transactions={transactions}
                workspaceMembers={workspaceMembers}
                referenceDay={referenceDay}
                onReferenceDayChange={handleReferenceDayChange}
                onAddTransaction={() => handleOpenAddModal()}
                onEditMonthBudget={() => openBudgetBuilder('monthly')}
              />
            )}

            {activeTab === 'diario' && (
              <DailyView
                selectedYear={selectedYear}
                monthPlan={selectedMonthPlan}
                execution={monthlyExecution}
                transactions={transactions}
                categories={categories}
                assumptions={assumptions}
                workspaceMembers={workspaceMembers}
                referenceDay={referenceDay}
                onReferenceDayChange={handleReferenceDayChange}
                onAddTransaction={handleOpenAddModal}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setModalDefaultDate(tx.date);
                  setModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {activeTab === 'presupuesto' && (
              <SimulatorView
                selectedYear={selectedYear}
                assumptions={assumptions}
                monthlyOverrides={monthlyOverrides}
                categories={categories}
                transactions={transactions}
                selectedMonthIndex={selectedMonthIndex}
                initialMode={budgetEditorMode}
                onSelectYear={setSelectedYear}
                onSelectMonth={setSelectedMonthIndex}
                onSaveAssumptions={handleSaveAssumptions}
                onSaveMonthlyOverride={handleSaveMonthlyOverride}
                onResetMonthlyOverride={handleResetMonthlyOverride}
                onCopyFromYear={handleCopyFromYear}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onResetCategories={handleResetCategories}
              />
            )}

            {activeTab === 'alertas' && (
              <AlertsRulesView
                alerts={activeAlerts}
                alertRules={alertRules}
                selectedMonth={selectedMonthPlan}
                categories={categories}
                onUpdateRules={handleUpdateAlertRules}
              />
            )}

            {activeTab === 'ml' && (
              <MLClassifierView
                classifier={classifier}
                categories={categories}
                allSamples={allMlSamples}
                onAddSample={handleAddMlSample}
                onDeleteSample={handleDeleteMlSample}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {t('footerLeft', {
              year: selectedYear,
              currency: currencySettings.displayCurrency,
            })}
          </span>
          <span>
            {assumptions.metaReservaMin > 0
              ? t('footerGoal', {
                  year: selectedYear,
                  min: formatBase(assumptions.metaReservaMin),
                  max: formatBase(assumptions.metaReservaMax),
                })
              : t('footerDefault', { year: selectedYear })}
          </span>
        </div>
      </footer>

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTransaction}
        classifier={classifier}
        categories={categories}
        defaultDate={modalDefaultDate}
        editingTransaction={editingTx}
        currentUser={currentUser}
      />

      <CurrencySettingsModal
        isOpen={currencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        currencySettings={currencySettings}
        onSaveCurrencySettings={handleSaveCurrencySettings}
      />

      {activeWorkspace && (
        <ShareWorkspaceModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          currentUser={currentUser}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          pendingInvites={pendingInvites}
          onSwitchWorkspace={(workspaceId) =>
            postWorkspaceAction('/api/workspaces/switch', 'POST', { workspaceId })
          }
          onCreateWorkspace={(name) =>
            postWorkspaceAction('/api/workspaces', 'POST', { name })
          }
          onRenameWorkspace={(workspaceId, name) =>
            postWorkspaceAction(`/api/workspaces/${workspaceId}`, 'PATCH', { name })
          }
          onCreateInvite={(workspaceId, email) =>
            postWorkspaceAction(`/api/workspaces/${workspaceId}/share`, 'POST', { email })
          }
          onRevokeInvite={(workspaceId, code) =>
            postWorkspaceAction(`/api/workspaces/${workspaceId}/invites/${code}`, 'DELETE')
          }
          onJoinByCode={(code) =>
            postWorkspaceAction('/api/workspaces/join', 'POST', { code })
          }
          onRemoveMember={(workspaceId, memberId) =>
            postWorkspaceAction(`/api/workspaces/${workspaceId}/members/${memberId}`, 'DELETE')
          }
        />
      )}
    </div>
  );
};
