import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  AVAILABLE_YEARS,
  buildCategoryMap,
  BUILTIN_CATEGORY_IDS,
  compute2027Projection,
  getDefaultAssumptionsForYear,
} from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  BudgetAssumptions,
  CategoryMeta,
  PriorityTier,
  IncomeDayMode,
  MonthlyOverride,
  MonthlyOverridesMap,
  Transaction,
} from '../types/budget';

type CategoryGroupKind = 'income' | 'expense_daily' | 'expense_fixed' | 'expense_saving';

const COLOR_SWATCHES = [
  '#2563EB',
  '#059669',
  '#0891B2',
  '#7C3AED',
  '#D97706',
  '#DC2626',
  '#4F46E5',
  '#334155',
];

function getCategoryGroupKind(cat: CategoryMeta): CategoryGroupKind {
  if (cat.type === 'income') return 'income';
  if (cat.isDailyVariable) return 'expense_daily';
  if (cat.tier === 'ahorro') return 'expense_saving';
  return 'expense_fixed';
}

function groupKindToFields(kind: CategoryGroupKind): {
  type: 'income' | 'expense';
  isDailyVariable: boolean;
  tier: PriorityTier;
} {
  switch (kind) {
    case 'income':
      return { type: 'income', isDailyVariable: false, tier: 'ingreso' };
    case 'expense_daily':
      return { type: 'expense', isDailyVariable: true, tier: 'esencial' };
    case 'expense_saving':
      return { type: 'expense', isDailyVariable: false, tier: 'ahorro' };
    case 'expense_fixed':
    default:
      return { type: 'expense', isDailyVariable: false, tier: 'compromiso' };
  }
}

interface SimulatorViewProps {
  selectedYear: number;
  assumptions: BudgetAssumptions;
  monthlyOverrides: MonthlyOverridesMap;
  categories: CategoryMeta[];
  transactions: Transaction[];
  selectedMonthIndex: number;
  initialMode?: 'annual' | 'monthly' | 'categories';
  onSelectYear: (year: number) => void;
  onSelectMonth: (monthIndex: number) => void;
  onSaveAssumptions: (next: BudgetAssumptions) => Promise<void>;
  onSaveMonthlyOverride: (monthIndex: number, override: MonthlyOverride) => Promise<void>;
  onResetMonthlyOverride: (monthIndex: number) => Promise<void>;
  onCopyFromYear: (sourceYear: number) => Promise<void>;
  onCreateCategory: (cat: Omit<CategoryMeta, 'id' | 'isDefault'>) => Promise<void>;
  onUpdateCategory: (id: string, patch: Partial<CategoryMeta>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onResetCategories: () => Promise<void>;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  selectedYear,
  assumptions,
  monthlyOverrides,
  categories,
  transactions,
  selectedMonthIndex,
  initialMode = 'annual',
  onSelectYear,
  onSelectMonth,
  onSaveAssumptions,
  onSaveMonthlyOverride,
  onResetMonthlyOverride,
  onCopyFromYear,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetCategories,
}) => {
  const {
    t,
    months,
    currencySettings,
    formatBase,
    getCatLabel,
    getCatShort,
    getCatDesc,
    formatPayday,
  } = useI18n();
  const [mode, setMode] = useState<'annual' | 'monthly' | 'categories'>(initialMode);
  const [draft, setDraft] = useState<BudgetAssumptions>(assumptions);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState<number>(
    selectedYear === 2027 ? 2026 : 2027,
  );
  const [copying, setCopying] = useState(false);

  // Category CRUD local state
  const [newLabel, setNewLabel] = useState('');
  const [newShortLabel, setNewShortLabel] = useState('');
  const [newGroup, setNewGroup] = useState<CategoryGroupKind>('expense_daily');
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editShortLabel, setEditShortLabel] = useState('');
  const [editGroup, setEditGroup] = useState<CategoryGroupKind>('expense_daily');
  const [editColor, setEditColor] = useState(COLOR_SWATCHES[0]);
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetCats, setConfirmResetCats] = useState(false);
  const [quickAddGroup, setQuickAddGroup] = useState<CategoryGroupKind | null>(null);

  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);

  const txCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const customIncomeCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'income' && (!BUILTIN_CATEGORY_IDS.has(c.id) || c.id === 'otro_ingreso'),
      ),
    [categories],
  );

  const customDailyExpenseCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' && c.isDailyVariable && !BUILTIN_CATEGORY_IDS.has(c.id),
      ),
    [categories],
  );

  const customFixedExpenseCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' && !c.isDailyVariable && !BUILTIN_CATEGORY_IDS.has(c.id),
      ),
    [categories],
  );

  useEffect(() => {
    setDraft(assumptions);
  }, [assumptions, selectedYear]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (copySourceYear === selectedYear) {
      setCopySourceYear(selectedYear === 2027 ? 2026 : 2027);
    }
  }, [selectedYear, copySourceYear]);

  const yearDefaultAssumptions = useMemo(
    () => getDefaultAssumptionsForYear(selectedYear),
    [selectedYear],
  );

  const baselineProjection = useMemo(
    () => compute2027Projection(yearDefaultAssumptions, {}, selectedYear, categories),
    [yearDefaultAssumptions, selectedYear, categories],
  );

  // Automatic projection without current month's override so user sees auto baseline per field
  const autoProjection = useMemo(
    () => compute2027Projection(draft, {}, selectedYear, categories),
    [draft, selectedYear, categories],
  );

  const simProjection = useMemo(
    () => compute2027Projection(draft, monthlyOverrides, selectedYear, categories),
    [draft, monthlyOverrides, selectedYear, categories],
  );

  const currentMonthAuto = autoProjection[selectedMonthIndex] ?? autoProjection[0];
  const currentOverride = monthlyOverrides[String(selectedMonthIndex)] ?? {};

  const [monthDraft, setMonthDraft] = useState<MonthlyOverride>({});

  useEffect(() => {
    const ov = monthlyOverrides[String(selectedMonthIndex)] ?? {};
    const customAmounts: Record<string, number> = {};
    for (const c of categories) {
      if (!BUILTIN_CATEGORY_IDS.has(c.id) || c.id === 'otro_ingreso') {
        customAmounts[c.id] =
          ov.customAmounts?.[c.id] ?? currentMonthAuto.categoryBudgets?.[c.id] ?? 0;
      }
    }
    setMonthDraft({
      sueldo: ov.sueldo ?? currentMonthAuto.sueldo,
      aporteEmpresa: ov.aporteEmpresa ?? currentMonthAuto.aporteEmpresa,
      ingresoExtra: ov.ingresoExtra ?? currentMonthAuto.ingresoExtra,
      aguinaldo: ov.aguinaldo ?? currentMonthAuto.aguinaldo,
      diaIngresoPrevisto: ov.diaIngresoPrevisto ?? currentMonthAuto.fechaIngresoPrevista,
      alimentacion: ov.alimentacion ?? currentMonthAuto.alimentacion,
      servicios: ov.servicios ?? currentMonthAuto.servicios,
      ropa: ov.ropa ?? currentMonthAuto.ropa,
      transporte: ov.transporte ?? currentMonthAuto.transporte,
      salud: ov.salud ?? currentMonthAuto.salud,
      escuela: ov.escuela ?? currentMonthAuto.escuela,
      alquilerTotal: ov.alquilerTotal ?? currentMonthAuto.alquilerTotal,
      deudas: ov.deudas ?? currentMonthAuto.deudas,
      comision: ov.comision ?? currentMonthAuto.comision,
      deposito: ov.deposito ?? currentMonthAuto.deposito,
      diezmo: ov.diezmo ?? currentMonthAuto.diezmo,
      ahorro: ov.ahorro ?? currentMonthAuto.ahorro,
      customAmounts,
    });
  }, [selectedMonthIndex, selectedYear, monthlyOverrides, currentMonthAuto, categories]);

  const baseDec = baselineProjection[11];
  const simDec = simProjection[11];

  const baseReserve = baseDec.reservaTotalAcumulada;
  const simReserve = simDec.reservaTotalAcumulada;
  const reserveDelta = simReserve - baseReserve;
  const deficitMonthsCount = simProjection.filter((m) => m.saldoMensual < 0).length;

  const monthlyHabitualIncome =
    currentMonthAuto.ingresosTotales - currentMonthAuto.aguinaldo;

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveAssumptions(draft);
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: MonthlyOverride = { ...monthDraft };
      if (payload.diaIngresoPrevisto === currentMonthAuto.fechaIngresoPrevista) {
        delete payload.diaIngresoPrevisto;
      }
      await onSaveMonthlyOverride(selectedMonthIndex, payload);
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBase = async () => {
    setDraft(yearDefaultAssumptions);
    await onSaveAssumptions(yearDefaultAssumptions);
  };

  const handleCopyYear = async () => {
    if (copySourceYear === selectedYear) return;
    setCopying(true);
    try {
      await onCopyFromYear(copySourceYear);
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 3000);
    } finally {
      setCopying(false);
    }
  };

  const handleCreateCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      setCatError('Ingresá un nombre para el nuevo tipo.');
      return;
    }
    setCatError(null);
    setCatSaving(true);
    try {
      const fields = groupKindToFields(newGroup);
      await onCreateCategory({
        label: newLabel.trim(),
        shortLabel: newShortLabel.trim() || newLabel.trim().slice(0, 14),
        ...fields,
        color: newColor,
        description: newDescription.trim(),
      });
      setNewLabel('');
      setNewShortLabel('');
      setNewDescription('');
    } catch {
      setCatError('No se pudo crear el tipo. Intentá nuevamente.');
    } finally {
      setCatSaving(false);
    }
  };

  const startEditCategory = (cat: CategoryMeta) => {
    setEditingCatId(cat.id);
    setEditLabel(cat.label);
    setEditShortLabel(cat.shortLabel);
    setEditGroup(getCategoryGroupKind(cat));
    setEditColor(cat.color);
    setEditDescription(cat.description);
    setConfirmDeleteId(null);
  };

  const handleSaveCategoryEdit = async (id: string) => {
    if (!editLabel.trim()) return;
    setCatSaving(true);
    try {
      const fields = groupKindToFields(editGroup);
      await onUpdateCategory(id, {
        label: editLabel.trim(),
        shortLabel: editShortLabel.trim() || editLabel.trim().slice(0, 14),
        ...fields,
        color: editColor,
        description: editDescription.trim(),
      });
      setEditingCatId(null);
    } finally {
      setCatSaving(false);
    }
  };

  const handleConfirmDeleteCat = async (id: string) => {
    setCatSaving(true);
    try {
      await onDeleteCategory(id);
      setConfirmDeleteId(null);
      if (editingCatId === id) setEditingCatId(null);
    } finally {
      setCatSaving(false);
    }
  };

  const handleConfirmResetCats = async () => {
    setCatSaving(true);
    try {
      await onResetCategories();
      setConfirmResetCats(false);
      setEditingCatId(null);
    } finally {
      setCatSaving(false);
    }
  };

  const hasMonthOverride = Object.keys(currentOverride).length > 0;
  const previousYear = selectedYear - 1;

  const openQuickAdd = (group: CategoryGroupKind) => {
    setQuickAddGroup(group);
    setNewGroup(group);
    setNewLabel('');
    setNewShortLabel('');
    setNewDescription('');
    setCatError(null);
    setEditingCatId(null);
  };

  const handleQuickAddCreate = async () => {
    if (!newLabel.trim()) {
      setCatError('Ingresá un nombre para el nuevo tipo.');
      return;
    }
    setCatError(null);
    setCatSaving(true);
    try {
      const fields = groupKindToFields(newGroup);
      await onCreateCategory({
        label: newLabel.trim(),
        shortLabel: newShortLabel.trim() || newLabel.trim().slice(0, 14),
        ...fields,
        color: newColor,
        description: newDescription.trim(),
      });
      setNewLabel('');
      setNewShortLabel('');
      setNewDescription('');
      setQuickAddGroup(null);
    } catch {
      setCatError('No se pudo crear el tipo. Intentá nuevamente.');
    } finally {
      setCatSaving(false);
    }
  };

  const renderEditableLabel = (catId: string, htmlFor?: string, suffix?: string) => {
    const cat = catMap[catId];
    if (!cat) return null;
    const catLabel = getCatLabel(cat);
    const catShort = getCatShort(cat);
    if (confirmDeleteId === catId) {
      return (
        <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px]">
          <span className="text-red-700 font-medium truncate">
            {t('simDeleteShortQuestion', { label: catShort })}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={catSaving}
              onClick={() => handleConfirmDeleteCat(catId)}
              className="px-1.5 py-0.5 text-[11px] font-medium text-white bg-red-700 hover:bg-red-800 rounded"
            >
              {t('simYes')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="px-1.5 py-0.5 text-[11px] text-slate-600 border border-slate-300 rounded bg-white"
            >
              {t('simNo')}
            </button>
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <label
          htmlFor={htmlFor}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 min-w-0 truncate"
        >
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <span className="truncate">
            {catLabel}
            {suffix ? ` ${suffix}` : ''} ({currencySettings.baseCurrency})
          </span>
        </label>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQuickAddGroup(null);
              startEditCategory(cat);
            }}
            className="p-1 text-slate-400 hover:text-blue-700 rounded hover:bg-slate-100 transition-colors"
            title={catLabel}
            aria-label={catLabel}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteId(catId);
              setEditingCatId(null);
            }}
            className="p-1 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
            title={t('simDelete')}
            aria-label={`${t('simDelete')} ${catLabel}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderSectionTypeEditor = (sectionGroups: CategoryGroupKind[]) => {
    const editingCat = editingCatId ? catMap[editingCatId] : undefined;
    const isEditingHere =
      editingCat !== undefined && sectionGroups.includes(getCategoryGroupKind(editingCat));
    const isAddingHere = quickAddGroup !== null && sectionGroups.includes(quickAddGroup);

    if (!isEditingHere && !isAddingHere) return null;

    if (isAddingHere) {
      return (
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              {t('simQuickAddTitle')}
            </span>
            <button
              type="button"
              onClick={() => setQuickAddGroup(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              {t('simClose')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <input
                type="text"
                placeholder={t('simCatFullName')}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div className="sm:col-span-4">
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value as CategoryGroupKind)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="income">{t('simCatGroupIncome')}</option>
                <option value="expense_daily">{t('simCatGroupDaily')}</option>
                <option value="expense_fixed">{t('simCatGroupFixed')}</option>
                <option value="expense_saving">{t('simCatGroupSaving')}</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setQuickAddGroup(null)}
                className="px-2.5 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md bg-white"
              >
                {t('shareCancel')}
              </button>
              <button
                type="button"
                disabled={catSaving}
                onClick={handleQuickAddCreate}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('shareCreateWsBtn')}
              </button>
            </div>
          </div>
          {catError && <p className="text-xs text-red-700">{catError}</p>}
        </div>
      );
    }

    if (isEditingHere && editingCat) {
      return (
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              {t('simEditingTypeTitle', { label: getCatLabel(editingCat) })}
            </span>
            <button
              type="button"
              onClick={() => setEditingCatId(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              {t('simClose')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder={t('simCatFullName')}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                maxLength={14}
                value={editShortLabel}
                onChange={(e) => setEditShortLabel(e.target.value)}
                placeholder={t('simCatShortName')}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value as CategoryGroupKind)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="income">{t('simCatGroupIncome')}</option>
                <option value="expense_daily">{t('simCatGroupDaily')}</option>
                <option value="expense_fixed">{t('simCatGroupFixed')}</option>
                <option value="expense_saving">{t('simCatGroupSaving')}</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditingCatId(null)}
                className="px-2.5 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-md bg-white"
              >
                {t('shareCancel')}
              </button>
              <button
                type="button"
                disabled={catSaving}
                onClick={() => handleSaveCategoryEdit(editingCat.id)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md inline-flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> {t('shareSave')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const activeMonthName = months[selectedMonthIndex]?.name ?? currentMonthAuto.monthName;
  const activeMonthShort = months[selectedMonthIndex]?.short ?? currentMonthAuto.shortName;
  const localizedPaydayRule = formatPayday(
    selectedYear,
    selectedMonthIndex,
    currentMonthAuto.fechaIngresoPrevista,
    draft.diaIngresoModo ?? 'business_day',
    draft.diaIngresoValor ?? 4,
    false,
  );

  return (
    <div className="space-y-6">
      {/* Period & Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('simTitle', { year: selectedYear })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('simDesc')} · <span className="font-medium text-slate-700">{t('simBaseCurrencyNotice', { currency: currencySettings.baseCurrency })}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('annual')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'annual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('simTabAnnual', { year: selectedYear })}
            </button>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('simTabMonthly', { month: activeMonthShort, year: selectedYear })}
            </button>
            <button
              type="button"
              onClick={() => setMode('categories')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                mode === 'categories'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('simTabCats')}
            </button>
          </div>
        </div>

        {/* Year & Month Picker Bar inside Budget Builder */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor="sim-year-select" className="text-xs font-medium text-slate-600">
                {t('simYearLabel')}
              </label>
              <select
                id="sim-year-select"
                value={selectedYear}
                onChange={(e) => onSelectYear(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
              >
                {AVAILABLE_YEARS.map((y) => {
                  const nowYear = new Date().getFullYear();
                  const tag =
                    y === nowYear
                      ? t('simCurrentYearTag')
                      : y === 2027
                        ? t('simBase2027Tag')
                        : '';
                  return (
                    <option key={y} value={y}>
                      {y}
                      {tag}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="sim-month-select" className="text-xs font-medium text-slate-600">
                {t('simMonthLabel')}
              </label>
              <select
                id="sim-month-select"
                value={selectedMonthIndex}
                onChange={(e) => onSelectMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                {months.map((m, idx) => (
                  <option key={m.name} value={idx}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{t('simCopyFrom')}</span>
            <select
              value={copySourceYear}
              onChange={(e) => setCopySourceYear(Number(e.target.value))}
              aria-label={t('simCopyFrom')}
              className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 font-mono tabular-nums"
            >
              {AVAILABLE_YEARS.filter((y) => y !== selectedYear).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopyYear}
              disabled={copying}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copying ? t('simCopying') : t('simCopyBtn', { year: selectedYear })}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {mode === 'annual' ? (
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {t('simAnnualHeading', { year: selectedYear })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('simAnnualSub', { year: selectedYear })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode('categories')}
                  className="px-2.5 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50/60 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  {t('simManageTypes')}
                </button>
                <button
                  type="button"
                  onClick={handleRestoreBase}
                  className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('simRestoreBase', { year: selectedYear })}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveGlobal} className="space-y-6 mt-5">
              {/* Ingresos */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-xs font-semibold text-slate-800">
                      {t('simIncomeSection', { year: selectedYear })}
                    </h4>
                    <button
                      type="button"
                      onClick={() => openQuickAdd('income')}
                      className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded-md bg-blue-50/50 hover:bg-blue-50 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {t('simNewIncomeType')}
                    </button>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                    {t('simHabitualIncome', { amount: formatBase(monthlyHabitualIncome) })}
                  </span>
                </div>
                {renderSectionTypeEditor(['income'])}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catMap['sueldo'] && (
                    <div>
                      {renderEditableLabel('sueldo', 'sim-sueldo')}
                      <input
                        id="sim-sueldo"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.sueldoMensual}
                        onChange={(e) => setDraft({ ...draft, sueldoMensual: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['aporte_empresa'] && (
                    <div>
                      {renderEditableLabel('aporte_empresa', 'sim-empresa')}
                      <input
                        id="sim-empresa"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.aporteEmpresaAlquiler}
                        onChange={(e) =>
                          setDraft({ ...draft, aporteEmpresaAlquiler: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['ingreso_extra'] && (
                    <div>
                      {renderEditableLabel('ingreso_extra', 'sim-extra')}
                      <input
                        id="sim-extra"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.ingresoExtraMensual}
                        onChange={(e) =>
                          setDraft({ ...draft, ingresoExtraMensual: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['aguinaldo'] && (
                    <>
                      <div>
                        {renderEditableLabel('aguinaldo', 'sim-ag-jul', `(${months[6]?.short ?? 'Jul'})`)}
                        <input
                          id="sim-ag-jul"
                          type="number"
                          step="any"
                          min={0}
                          value={draft.aguinaldoJulio}
                          onChange={(e) =>
                            setDraft({ ...draft, aguinaldoJulio: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        {renderEditableLabel('aguinaldo', 'sim-ag-dic', `(${months[11]?.short ?? 'Dec'})`)}
                        <input
                          id="sim-ag-dic"
                          type="number"
                          step="any"
                          min={0}
                          value={draft.aguinaldoDiciembre}
                          onChange={(e) =>
                            setDraft({ ...draft, aguinaldoDiciembre: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                    </>
                  )}
                  {customIncomeCategories.map((cat) => (
                    <div key={cat.id}>
                      {renderEditableLabel(cat.id, `custom-inc-${cat.id}`)}
                      <input
                        id={`custom-inc-${cat.id}`}
                        type="number"
                        step="any"
                        min={0}
                        value={draft.customCategoryBudgets?.[cat.id] ?? 0}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            customCategoryBudgets: {
                              ...(draft.customCategoryBudgets ?? {}),
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>

                {/* Día previsto del ingreso */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="sim-payday-mode"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      {t('simPaydayModeLabel')}
                    </label>
                    <select
                      id="sim-payday-mode"
                      value={draft.diaIngresoModo ?? 'business_day'}
                      onChange={(e) => {
                        const nextMode = e.target.value as IncomeDayMode;
                        const currentVal = draft.diaIngresoValor ?? 4;
                        setDraft({
                          ...draft,
                          diaIngresoModo: nextMode,
                          diaIngresoValor:
                            nextMode === 'business_day'
                              ? Math.min(23, Math.max(1, currentVal))
                              : Math.min(31, Math.max(1, currentVal)),
                        });
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                    >
                      <option value="business_day">{t('simPaydayBusiness')}</option>
                      <option value="calendar_day">{t('simPaydayCalendar')}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="sim-payday-num"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      {(draft.diaIngresoModo ?? 'business_day') === 'business_day'
                        ? t('simPaydayNumBusiness')
                        : t('simPaydayNumCalendar')}
                    </label>
                    <input
                      id="sim-payday-num"
                      type="number"
                      step={1}
                      min={1}
                      max={(draft.diaIngresoModo ?? 'business_day') === 'business_day' ? 23 : 31}
                      value={draft.diaIngresoValor ?? 4}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          diaIngresoValor: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                    />
                  </div>

                  <div className="sm:col-span-4 text-xs text-slate-600 pb-1">
                    <div className="text-slate-500">
                      {t('simPaydayInMonth', { month: activeMonthName, year: selectedYear })}
                    </div>
                    <div className="font-semibold text-emerald-700 font-mono tabular-nums mt-0.5">
                      {localizedPaydayRule}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gastos cotidianos base enero */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-xs font-semibold text-slate-800">
                      {t('simDailySection', { year: selectedYear })}
                    </h4>
                    <button
                      type="button"
                      onClick={() => openQuickAdd('expense_daily')}
                      className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded-md bg-blue-50/50 hover:bg-blue-50 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {t('simNewDailyType')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sim-inf" className="text-xs text-slate-600">
                      {t('simMonthlyInflation')}
                    </label>
                    <input
                      id="sim-inf"
                      type="number"
                      step="any"
                      min={0}
                      max={30}
                      value={draft.inflacionMensualPct}
                      onChange={(e) =>
                        setDraft({ ...draft, inflacionMensualPct: Number(e.target.value) })
                      }
                      className="w-20 px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono tabular-nums text-right"
                    />
                  </div>
                </div>
                {renderSectionTypeEditor(['expense_daily'])}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catMap['alimentacion'] && (
                    <div>
                      {renderEditableLabel('alimentacion', 'base-alim')}
                      <input
                        id="base-alim"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseAlimentacion}
                        onChange={(e) =>
                          setDraft({ ...draft, baseAlimentacion: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['servicios'] && (
                    <div>
                      {renderEditableLabel('servicios', 'base-serv')}
                      <input
                        id="base-serv"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseServicios}
                        onChange={(e) =>
                          setDraft({ ...draft, baseServicios: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['ropa'] && (
                    <div>
                      {renderEditableLabel('ropa', 'base-ropa')}
                      <input
                        id="base-ropa"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseRopa}
                        onChange={(e) => setDraft({ ...draft, baseRopa: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['transporte'] && (
                    <div>
                      {renderEditableLabel('transporte', 'base-trans')}
                      <input
                        id="base-trans"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseTransporte}
                        onChange={(e) =>
                          setDraft({ ...draft, baseTransporte: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['salud'] && (
                    <div>
                      {renderEditableLabel('salud', 'base-salud')}
                      <input
                        id="base-salud"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseSalud}
                        onChange={(e) => setDraft({ ...draft, baseSalud: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['escuela'] && (
                    <div>
                      {renderEditableLabel('escuela', 'base-escuela')}
                      <input
                        id="base-escuela"
                        type="number"
                        step={1}
                        min={0}
                        value={draft.baseEscuela}
                        onChange={(e) => setDraft({ ...draft, baseEscuela: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {customDailyExpenseCategories.map((cat) => (
                    <div key={cat.id}>
                      {renderEditableLabel(cat.id, `custom-daily-${cat.id}`)}
                      <input
                        id={`custom-daily-${cat.id}`}
                        type="number"
                        step="any"
                        min={0}
                        value={draft.customCategoryBudgets?.[cat.id] ?? 0}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            customCategoryBudgets: {
                              ...(draft.customCategoryBudgets ?? {}),
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Compromisos fijos, ahorro y otros tipos */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">
                    {t('simFixedSection')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => openQuickAdd('expense_fixed')}
                    className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded-md bg-blue-50/50 hover:bg-blue-50 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('simNewFixedType')}
                  </button>
                </div>
                {renderSectionTypeEditor(['expense_fixed', 'expense_saving'])}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catMap['alquiler'] && (
                    <>
                      <div>
                        {renderEditableLabel('alquiler', 'sim-alq', `(${months[0]?.short ?? 'Jan'})`)}
                        <input
                          id="sim-alq"
                          type="number"
                          step="any"
                          min={0}
                          value={draft.alquilerInicial}
                          onChange={(e) =>
                            setDraft({ ...draft, alquilerInicial: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="sim-rent-pct" className="block text-xs font-medium text-slate-700 mb-1">
                          {t('simRentQuarterlyPct')}
                        </label>
                        <input
                          id="sim-rent-pct"
                          type="number"
                          step="any"
                          min={0}
                          max={30}
                          value={draft.actualizacionAlquilerPct}
                          onChange={(e) =>
                            setDraft({ ...draft, actualizacionAlquilerPct: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                    </>
                  )}
                  {catMap['diezmo'] && (
                    <div>
                      {renderEditableLabel('diezmo', 'sim-diezmo')}
                      <input
                        id="sim-diezmo"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.diezmoMensual}
                        onChange={(e) => setDraft({ ...draft, diezmoMensual: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['ahorro'] && (
                    <div>
                      {renderEditableLabel('ahorro', 'sim-ahorro')}
                      <input
                        id="sim-ahorro"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.ahorroMensual}
                        onChange={(e) => setDraft({ ...draft, ahorroMensual: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['deudas'] && (
                    <div>
                      {renderEditableLabel('deudas', 'sim-deudas')}
                      <input
                        id="sim-deudas"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.deudaMensual}
                        onChange={(e) => setDraft({ ...draft, deudaMensual: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['comision'] && (
                    <div>
                      {renderEditableLabel(
                        'comision',
                        'sim-comision',
                        `(${months[0]?.short ?? 'Jan'}–${months[2]?.short ?? 'Mar'})`,
                      )}
                      <input
                        id="sim-comision"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.comisionCuota}
                        onChange={(e) => setDraft({ ...draft, comisionCuota: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['deposito'] && (
                    <div>
                      {renderEditableLabel('deposito', 'sim-deposito', `(${months[0]?.short ?? 'Jan'})`)}
                      <input
                        id="sim-deposito"
                        type="number"
                        step="any"
                        min={0}
                        value={draft.depositoEnero}
                        onChange={(e) => setDraft({ ...draft, depositoEnero: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {customFixedExpenseCategories.map((cat) => (
                    <div key={cat.id}>
                      {renderEditableLabel(cat.id, `custom-fixed-${cat.id}`)}
                      <input
                        id={`custom-fixed-${cat.id}`}
                        type="number"
                        step="any"
                        min={0}
                        value={draft.customCategoryBudgets?.[cat.id] ?? 0}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            customCategoryBudgets: {
                              ...(draft.customCategoryBudgets ?? {}),
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.incluirReservaDic2026}
                    onChange={(e) =>
                      setDraft({ ...draft, incluirReservaDic2026: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">
                      {t('simIncludePrevReserve', {
                        prevYear: previousYear,
                        amount: formatBase(draft.reservaDic2026),
                      })}
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {t('simIncludePrevReserveDesc', {
                        prevYear: previousYear,
                        year: selectedYear,
                      })}
                    </p>
                  </div>
                </label>

                {draft.incluirReservaDic2026 && (
                  <div className="pl-6 flex items-center gap-2">
                    <label htmlFor="sim-res-prev" className="text-xs text-slate-700">
                      {t('simPrevReserveAmount', {
                        prevYear: previousYear,
                        currency: currencySettings.baseCurrency,
                      })}
                    </label>
                    <input
                      id="sim-res-prev"
                      type="number"
                      step="any"
                      min={0}
                      value={draft.reservaDic2026}
                      onChange={(e) =>
                        setDraft({ ...draft, reservaDic2026: Number(e.target.value) })
                      }
                      className="w-40 px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                    />
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sim-meta-min" className="block text-xs font-medium text-slate-700 mb-1">
                      {t('simMetaMin', { currency: currencySettings.baseCurrency })}
                    </label>
                    <input
                      id="sim-meta-min"
                      type="number"
                      step="any"
                      min={0}
                      value={draft.metaReservaMin}
                      onChange={(e) =>
                        setDraft({ ...draft, metaReservaMin: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="sim-meta-max" className="block text-xs font-medium text-slate-700 mb-1">
                      {t('simMetaMax', { currency: currencySettings.baseCurrency })}
                    </label>
                    <input
                      id="sim-meta-max"
                      type="number"
                      step="any"
                      min={0}
                      value={draft.metaReservaMax}
                      onChange={(e) =>
                        setDraft({ ...draft, metaReservaMax: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                {savedFlag ? (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {t('simSavedYear', { year: selectedYear })}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {t('simSaveHint', { year: selectedYear })}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? t('txSaving') : t('simSaveYearBtn', { year: selectedYear })}
                </button>
              </div>
            </form>
          </section>
        ) : mode === 'monthly' ? (
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {t('simMonthlyHeading', { month: activeMonthName, year: selectedYear })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('simMonthlySub', { month: activeMonthName, year: selectedYear })}
                </p>
              </div>

              {hasMonthOverride && (
                <button
                  type="button"
                  onClick={() => onResetMonthlyOverride(selectedMonthIndex)}
                  className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('simResetAuto')}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveMonth} className="space-y-6 mt-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">
                    {t('simMonthlyIncomeTitle', { month: activeMonthName, year: selectedYear })}
                  </h4>
                  <button
                    type="button"
                    onClick={() => openQuickAdd('income')}
                    className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded-md bg-blue-50/50 hover:bg-blue-50 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('simNewIncomeType')}
                  </button>
                </div>
                {renderSectionTypeEditor(['income'])}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {catMap['sueldo'] && (
                    <div>
                      {renderEditableLabel('sueldo')}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.sueldo ?? 0}
                        onChange={(e) =>
                          setMonthDraft({ ...monthDraft, sueldo: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['aporte_empresa'] && (
                    <div>
                      {renderEditableLabel('aporte_empresa')}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.aporteEmpresa ?? 0}
                        onChange={(e) =>
                          setMonthDraft({ ...monthDraft, aporteEmpresa: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['ingreso_extra'] && (
                    <div>
                      {renderEditableLabel('ingreso_extra')}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.ingresoExtra ?? 0}
                        onChange={(e) =>
                          setMonthDraft({ ...monthDraft, ingresoExtra: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {catMap['aguinaldo'] && (
                    <div>
                      {renderEditableLabel('aguinaldo')}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.aguinaldo ?? 0}
                        onChange={(e) =>
                          setMonthDraft({ ...monthDraft, aguinaldo: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  )}
                  {customIncomeCategories.map((cat) => (
                    <div key={cat.id}>
                      {renderEditableLabel(cat.id)}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.customAmounts?.[cat.id] ?? 0}
                        onChange={(e) =>
                          setMonthDraft({
                            ...monthDraft,
                            customAmounts: {
                              ...(monthDraft.customAmounts ?? {}),
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 max-w-xs">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('simMonthlyPaydayLabel', { days: currentMonthAuto.daysInMonth })}
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    max={currentMonthAuto.daysInMonth}
                    value={monthDraft.diaIngresoPrevisto ?? currentMonthAuto.fechaIngresoPrevista}
                    onChange={(e) =>
                      setMonthDraft({
                        ...monthDraft,
                        diaIngresoPrevisto: Math.min(
                          currentMonthAuto.daysInMonth,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('simAnnualRuleHint', { rule: localizedPaydayRule })}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-800">
                    {t('simMonthlyExpensesTitle', { month: activeMonthName, year: selectedYear })}
                  </h4>
                  <button
                    type="button"
                    onClick={() => openQuickAdd('expense_daily')}
                    className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 border border-blue-200 rounded-md bg-blue-50/50 hover:bg-blue-50 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('simNewExpenseOther')}
                  </button>
                </div>
                {renderSectionTypeEditor(['expense_daily', 'expense_fixed', 'expense_saving'])}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(
                    [
                      ['alimentacion', 'alimentacion'],
                      ['servicios', 'servicios'],
                      ['ropa', 'ropa'],
                      ['transporte', 'transporte'],
                      ['salud', 'salud'],
                      ['escuela', 'escuela'],
                      ['alquiler', 'alquilerTotal'],
                      ['deudas', 'deudas'],
                      ['comision', 'comision'],
                      ['deposito', 'deposito'],
                      ['diezmo', 'diezmo'],
                      ['ahorro', 'ahorro'],
                    ] as const
                  ).map(([catId, draftKey]) => {
                    const meta = catMap[catId];
                    if (!meta) return null;
                    return (
                      <div key={catId}>
                        {renderEditableLabel(catId)}
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={(monthDraft[draftKey] as number | undefined) ?? 0}
                          onChange={(e) =>
                            setMonthDraft({ ...monthDraft, [draftKey]: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                        />
                      </div>
                    );
                  })}
                  {[...customDailyExpenseCategories, ...customFixedExpenseCategories].map((cat) => (
                    <div key={cat.id}>
                      {renderEditableLabel(cat.id)}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={monthDraft.customAmounts?.[cat.id] ?? 0}
                        onChange={(e) =>
                          setMonthDraft({
                            ...monthDraft,
                            customAmounts: {
                              ...(monthDraft.customAmounts ?? {}),
                              [cat.id]: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                {savedFlag ? (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />{' '}
                    {t('simSavedMonth', { month: activeMonthName, year: selectedYear })}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {hasMonthOverride
                      ? t('simHasOverrideHint', { year: selectedYear })
                      : t('simAutoCalcHint', { year: selectedYear })}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving
                    ? t('txSaving')
                    : t('simSaveMonthBtn', { month: activeMonthShort, year: selectedYear })}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {t('simCatsTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('simCatsSub')}
                </p>
              </div>

              {confirmResetCats ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700">{t('simRestoreCatsConfirm')}</span>
                  <button
                    type="button"
                    onClick={handleConfirmResetCats}
                    disabled={catSaving}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-md"
                  >
                    {t('simRestoreCatsYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetCats(false)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
                  >
                    {t('shareCancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetCats(true)}
                  className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('simRestoreCatsBtn')}
                </button>
              )}
            </div>

            {/* Create New Category Form */}
            <form
              onSubmit={handleCreateCatSubmit}
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
            >
              <div className="text-xs font-semibold text-slate-800">
                {t('simCreateCatTitle')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label htmlFor="cat-new-label" className="block text-xs font-medium text-slate-700 mb-1">
                    {t('simCatFullName')}
                  </label>
                  <input
                    id="cat-new-label"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="cat-new-short" className="block text-xs font-medium text-slate-700 mb-1">
                    {t('simCatShortName')}
                  </label>
                  <input
                    id="cat-new-short"
                    type="text"
                    maxLength={14}
                    value={newShortLabel}
                    onChange={(e) => setNewShortLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label htmlFor="cat-new-group" className="block text-xs font-medium text-slate-700 mb-1">
                    {t('simCatGroup')}
                  </label>
                  <select
                    id="cat-new-group"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value as CategoryGroupKind)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="income">{t('simCatGroupIncome')}</option>
                    <option value="expense_daily">{t('simCatGroupDaily')}</option>
                    <option value="expense_fixed">{t('simCatGroupFixed')}</option>
                    <option value="expense_saving">{t('simCatGroupSaving')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label htmlFor="cat-new-desc" className="block text-xs font-medium text-slate-700 mb-1">
                    {t('simCatDesc')}
                  </label>
                  <input
                    id="cat-new-desc"
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="block text-xs font-medium text-slate-700 mb-1.5">{t('simCatColor')}</span>
                  <div className="flex items-center gap-1.5">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => setNewColor(swatch)}
                        aria-label={`${t('simCatColor')} ${swatch}`}
                        className={`w-5 h-5 rounded-md border transition-transform ${
                          newColor === swatch
                            ? 'border-slate-900 scale-110 ring-1 ring-slate-900'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={catSaving}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {catSaving ? t('simCatCreating') : t('simCatCreateBtn')}
                  </button>
                </div>
              </div>
              {catError && <p className="text-xs text-red-700">{catError}</p>}
            </form>

            {/* Grouped Editable Lists */}
            {(
              [
                {
                  title: t('simGroupIncomeTitle'),
                  subtitle: t('simGroupIncomeSub'),
                  items: categories.filter((c) => c.type === 'income'),
                },
                {
                  title: t('simGroupDailyTitle'),
                  subtitle: t('simGroupDailySub'),
                  items: categories.filter((c) => c.type === 'expense' && c.isDailyVariable),
                },
                {
                  title: t('simGroupFixedTitle'),
                  subtitle: t('simGroupFixedSub'),
                  items: categories.filter((c) => c.type === 'expense' && !c.isDailyVariable),
                },
              ] as const
            ).map((section) => (
              <div key={section.title} className="space-y-2">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-semibold text-slate-900">
                    {section.title} ({section.items.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">{section.subtitle}</span>
                </div>

                {section.items.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    {t('simNoCatsInGroup')}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {section.items.map((cat) => {
                      const isEditing = editingCatId === cat.id;
                      const isConfirmingDelete = confirmDeleteId === cat.id;
                      const usedCount = txCountByCategory[cat.id] ?? 0;
                      const catLabel = getCatLabel(cat);
                      const catShort = getCatShort(cat);
                      const catDesc = getCatDesc(cat);

                      if (isEditing) {
                        return (
                          <div key={cat.id} className="p-3 bg-slate-50 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-5">
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  {t('simCatFullName')}
                                </label>
                                <input
                                  type="text"
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  {t('simCatShortName')}
                                </label>
                                <input
                                  type="text"
                                  maxLength={14}
                                  value={editShortLabel}
                                  onChange={(e) => setEditShortLabel(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                />
                              </div>
                              <div className="sm:col-span-4">
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  {t('simCatGroup')}
                                </label>
                                <select
                                  value={editGroup}
                                  onChange={(e) => setEditGroup(e.target.value as CategoryGroupKind)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                >
                                  <option value="income">{t('simCatGroupIncome')}</option>
                                  <option value="expense_daily">{t('simCatGroupDaily')}</option>
                                  <option value="expense_fixed">{t('simCatGroupFixed')}</option>
                                  <option value="expense_saving">{t('simCatGroupSaving')}</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                              <div className="sm:col-span-6">
                                <input
                                  type="text"
                                  placeholder={t('simCatDesc')}
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                                />
                              </div>
                              <div className="sm:col-span-3 flex items-center gap-1">
                                {COLOR_SWATCHES.map((swatch) => (
                                  <button
                                    key={swatch}
                                    type="button"
                                    onClick={() => setEditColor(swatch)}
                                    className={`w-4 h-4 rounded border ${
                                      editColor === swatch
                                        ? 'border-slate-900 scale-110'
                                        : 'border-slate-300'
                                    }`}
                                    style={{ backgroundColor: swatch }}
                                  />
                                ))}
                              </div>
                              <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingCatId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-600 border border-slate-300 rounded-md bg-white inline-flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> {t('shareCancel')}
                                </button>
                                <button
                                  type="button"
                                  disabled={catSaving}
                                  onClick={() => handleSaveCategoryEdit(cat.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-md inline-flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> {t('shareSave')}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={cat.id}
                          className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-sm mt-1.5 shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-900">{catLabel}</span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500">{catShort}</span>
                                {cat.tier === 'ahorro' && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-emerald-700 font-medium">
                                      {t('simAddsToReserve')}
                                    </span>
                                  </>
                                )}
                                {usedCount > 0 && (
                                  <>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-slate-500 font-mono tabular-nums">
                                      {usedCount} {t('colMovements').toLowerCase()}
                                    </span>
                                  </>
                                )}
                              </div>
                              {catDesc && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{catDesc}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-red-700 font-medium">
                                  {usedCount > 0
                                    ? t('simConfirmDeleteUsed', { count: usedCount })
                                    : t('simConfirmDeleteQuestion')}
                                </span>
                                <button
                                  type="button"
                                  disabled={catSaving}
                                  onClick={() => handleConfirmDeleteCat(cat.id)}
                                  className="px-2 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded"
                                >
                                  {t('simDelete')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded bg-white"
                                >
                                  {t('simNo')}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                                  aria-label={catLabel}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(cat.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                                  aria-label={`${t('simDelete')} ${catLabel}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Right Sticky Summary */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5 h-fit">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t('simImpactTitle', { year: selectedYear })}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('simImpactSub', { year: selectedYear })}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">{t('simImpactHabitual')}</span>
              <span className="font-mono tabular-nums text-slate-900 font-medium">
                {formatBase(monthlyHabitualIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">
                {t('simImpactPayday', { month: activeMonthShort })}
              </span>
              <span className="font-mono tabular-nums text-emerald-700 font-medium text-xs">
                {localizedPaydayRule}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">{t('simImpactBaseRes', { year: selectedYear })}</span>
              <span className="font-mono tabular-nums text-slate-700">
                {formatBase(baseReserve)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">{t('simImpactYourRes')}</span>
              <span className="font-mono tabular-nums text-slate-900 font-semibold text-base">
                {formatBase(simReserve)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">{t('simImpactDelta')}</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  reserveDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatBase(reserveDelta, true)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-slate-600 text-xs">{t('simImpactDecRent')}</span>
              <span className="font-mono tabular-nums text-slate-900 font-medium">
                {formatBase(simDec.alquilerBolsillo)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5">
              <span className="text-slate-600 text-xs">{t('simImpactDeficitMonths')}</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  deficitMonthsCount > 2 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {t('simImpactDeficitVal', { count: deficitMonthsCount })}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
            {draft.metaReservaMin <= 0
              ? t('simImpactNoGoal', { year: selectedYear })
              : simReserve >= draft.metaReservaMin
                ? t('simImpactGoalOk', {
                    range: `${formatBase(draft.metaReservaMin)}–${formatBase(draft.metaReservaMax)}`,
                    year: selectedYear,
                  })
                : t('simImpactGoalLow', {
                    year: selectedYear,
                    min: formatBase(draft.metaReservaMin),
                  })}
          </div>
        </section>
      </div>
    </div>
  );
};
