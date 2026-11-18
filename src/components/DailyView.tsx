import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { buildCategoryMap } from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  BudgetAssumptions,
  CategoryId,
  CategoryMeta,
  MonthPlan,
  Transaction,
  WorkspaceMember,
} from '../types/budget';
import {
  getTransactionDay,
  getTransactionMonthIndex,
  getTransactionYear,
  MonthlyExecutionSummary,
} from '../utils/alertsEngine';

interface DailyViewProps {
  selectedYear: number;
  monthPlan: MonthPlan;
  execution: MonthlyExecutionSummary;
  transactions: Transaction[];
  categories: CategoryMeta[];
  assumptions?: BudgetAssumptions;
  workspaceMembers?: WorkspaceMember[];
  referenceDay: number;
  onReferenceDayChange: (day: number) => void;
  onAddTransaction: (dateStr?: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const DailyView: React.FC<DailyViewProps> = ({
  selectedYear,
  monthPlan,
  execution,
  transactions,
  categories,
  assumptions,
  workspaceMembers = [],
  referenceDay,
  onReferenceDayChange,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const {
    t,
    months,
    calendarWeekdaysMonFirst,
    currencySettings,
    formatBase,
    formatInCurrency,
    getCatLabel,
    formatPayday,
  } = useI18n();

  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [onlySelectedDay, setOnlySelectedDay] = useState(false);

  const monthLabel = months[monthPlan.monthIndex]?.name ?? monthPlan.monthName;
  const monthShort = months[monthPlan.monthIndex]?.short ?? monthPlan.shortName;
  const paydayDisplayText = assumptions
    ? formatPayday(
        selectedYear,
        monthPlan.monthIndex,
        monthPlan.fechaIngresoPrevista,
        assumptions.diaIngresoModo ?? 'business_day',
        assumptions.diaIngresoValor ?? 4,
      )
    : monthPlan.reglaIngresoTexto;

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            getTransactionYear(tx.date) === selectedYear &&
            getTransactionMonthIndex(tx.date) === monthPlan.monthIndex,
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions, selectedYear, monthPlan.monthIndex],
  );

  const dayVariableSpendMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const tx of monthTransactions) {
      if (tx.type === 'expense' && catMap[tx.category]?.isDailyVariable) {
        const d = getTransactionDay(tx.date);
        map[d] = (map[d] ?? 0) + tx.amount;
      }
    }
    return map;
  }, [monthTransactions, catMap]);

  const userFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of workspaceMembers) {
      map.set(m.userId, m.name);
    }
    for (const tx of monthTransactions) {
      const uid = tx.createdByUserId ?? 'legacy';
      const uname = tx.createdByName ?? t('unassignedUser');
      if (!map.has(uid)) {
        map.set(uid, uname);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [workspaceMembers, monthTransactions, t]);

  const userBreakdown = useMemo(() => {
    const byUser = new Map<
      string,
      { userId: string; name: string; income: number; expense: number; count: number }
    >();
    for (const m of workspaceMembers) {
      byUser.set(m.userId, {
        userId: m.userId,
        name: m.name,
        income: 0,
        expense: 0,
        count: 0,
      });
    }
    for (const tx of monthTransactions) {
      const uid = tx.createdByUserId ?? 'legacy';
      const uname = tx.createdByName ?? t('unassignedUser');
      const current = byUser.get(uid) ?? {
        userId: uid,
        name: uname,
        income: 0,
        expense: 0,
        count: 0,
      };
      if (tx.type === 'income') {
        current.income += tx.amount;
      } else {
        current.expense += tx.amount;
      }
      current.count += 1;
      byUser.set(uid, current);
    }
    return Array.from(byUser.values()).filter((u) => u.count > 0 || workspaceMembers.length > 1);
  }, [workspaceMembers, monthTransactions, t]);

  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (onlySelectedDay && getTransactionDay(tx.date) !== referenceDay) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (userFilter !== 'all' && (tx.createdByUserId ?? 'legacy') !== userFilter) return false;
      if (
        searchQuery.trim() &&
        !tx.description.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !getCatLabel(catMap[tx.category]).toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !(tx.createdByName ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    monthTransactions,
    onlySelectedDay,
    referenceDay,
    categoryFilter,
    userFilter,
    searchQuery,
    catMap,
    getCatLabel,
  ]);

  const selectedDateStr = `${selectedYear}-${String(monthPlan.monthIndex + 1).padStart(2, '0')}-${String(
    referenceDay,
  ).padStart(2, '0')}`;

  const dailyPct =
    execution.dailyCapDynamic > 0
      ? (execution.spentToday / execution.dailyCapDynamic) * 100
      : 0;
  const isDailyOver = execution.spentToday > execution.dailyCapDynamic;
  const isDailyWarn = !isDailyOver && dailyPct >= 85;
  const dailyRemainingToday = execution.dailyCapDynamic - execution.spentToday;

  const firstWeekdayOffset = useMemo(() => {
    const jsDay = new Date(selectedYear, monthPlan.monthIndex, 1).getDay();
    return (jsDay + 6) % 7;
  }, [selectedYear, monthPlan.monthIndex]);

  const daysArray = Array.from({ length: monthPlan.daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Daily Budget Command KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('dayDynamicCap', { day: referenceDay, month: monthShort })}
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(execution.dailyCapDynamic)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {t('dayBaseRef')}{' '}
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {formatBase(execution.dailyCapBase)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('daySpentToday', { day: referenceDay })}
          </div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums mt-1.5 ${
              isDailyOver ? 'text-red-700' : isDailyWarn ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {formatBase(execution.spentToday)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {execution.dailyCapDynamic > 0
              ? t('dayPctOfCap', { pct: dailyPct.toFixed(0) })
              : t('dayNoVarPool')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('dayMarginToday')}</div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums mt-1.5 ${
              dailyRemainingToday < 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {formatBase(dailyRemainingToday, true)}
          </div>
          <div className="text-xs mt-2">
            {isDailyOver ? (
              <span className="text-red-700 font-medium inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {t('dayOverBadge')}
              </span>
            ) : isDailyWarn ? (
              <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {t('dayWarnBadge')}
              </span>
            ) : (
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {t('dayOkBadge')}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {t('dayRemainingDays', { month: monthLabel })}
            </div>
            <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
              {t('dayDaysUnit', { days: execution.remainingDays })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAddTransaction(selectedDateStr)}
            className="mt-3 w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('dayAddOnDate', { day: referenceDay, monthNum: monthPlan.monthIndex + 1 })}
          </button>
        </div>
      </section>

      {/* Calendar Grid + Day Advisory */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t('dayCalTitle', { month: monthLabel, year: selectedYear })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('dayCalDesc', { base: formatBase(execution.dailyCapBase) })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500 mb-2">
            {calendarWeekdaysMonFirst.map((wd) => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekdayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 rounded-lg bg-slate-50/60" />
            ))}
            {daysArray.map((day) => {
              const spent = dayVariableSpendMap[day] ?? 0;
              const isSelected = day === referenceDay;
              const isPayday = day === monthPlan.fechaIngresoPrevista;
              const exceededBase = spent > execution.dailyCapBase;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onReferenceDayChange(day)}
                  className={`h-16 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : spent > 0 && exceededBase
                        ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                        : spent > 0
                          ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                          : isPayday
                            ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-mono tabular-nums font-medium ${
                        isSelected ? 'text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    {isPayday && (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        {t('dayPaydayLabel')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-mono tabular-nums truncate ${
                      spent === 0
                        ? 'text-slate-300'
                        : exceededBase
                          ? 'text-red-700 font-semibold'
                          : 'text-emerald-700 font-medium'
                    }`}
                  >
                    {spent > 0 ? formatBase(spent) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('dayGuideTitle', { day: referenceDay, month: monthLabel })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('dayGuideDesc')}</p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">{t('dayGuidePool')}</span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatBase(execution.budgetDailyVariableTotal)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">
                  {t('dayGuideSpentBefore', { day: referenceDay - 1 })}
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatBase(execution.spentBeforeTodayVariable)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">{t('dayGuideRemaining')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatBase(
                    Math.max(0, execution.budgetDailyVariableTotal - execution.spentBeforeTodayVariable),
                  )}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">
                  {t('dayGuideDivided', { days: execution.remainingDays })}
                </span>
                <span className="font-mono tabular-nums font-semibold text-blue-700">
                  {formatBase(execution.dailyCapDynamic)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">{t('dayGuidePayday')}</span>
                <span className="font-mono tabular-nums font-medium text-emerald-700">
                  {paydayDisplayText}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
              isDailyOver
                ? 'bg-red-50/70 border-red-200 text-red-900'
                : isDailyWarn
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            {isDailyOver ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{t('dayAlertOverTitle')}</div>
                  <p className="mt-1">
                    {t('dayAlertOverBody', {
                      amount: formatBase(Math.abs(dailyRemainingToday)),
                    })}
                  </p>
                </div>
              </div>
            ) : execution.dailyCapDynamic > execution.dailyCapBase * 1.05 ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{t('dayAlertSurplusTitle')}</div>
                  <p className="mt-1">
                    {t('dayAlertSurplusBody', {
                      amount: formatBase(execution.dailyCapDynamic - execution.dailyCapBase),
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{t('dayAlertBalancedTitle')}</div>
                  <p className="mt-1">
                    {t('dayAlertBalancedBody', {
                      amount: formatBase(Math.max(0, dailyRemainingToday)),
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filterable Daily Transactions Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('dayLedgerTitle', { month: monthLabel, year: selectedYear })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('dayLedgerDesc')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('daySearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 w-52"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={t('dayAllCategories')}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">{t('dayAllCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCatLabel(cat)}
                </option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              aria-label={t('dayAllUsers')}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">{t('dayAllUsers')}</option>
              {userFilterOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none px-2 py-1.5">
              <input
                type="checkbox"
                checked={onlySelectedDay}
                onChange={(e) => setOnlySelectedDay(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              {t('dayOnlyDay', { day: referenceDay })}
            </label>
          </div>
        </div>

        {userBreakdown.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="font-medium text-slate-600">{t('dayUserSummaryLabel')}</span>
            {userBreakdown.map((u) => (
              <button
                key={u.userId}
                type="button"
                onClick={() => setUserFilter(userFilter === u.userId ? 'all' : u.userId)}
                className={`inline-flex items-center gap-2 transition-colors ${
                  userFilter === u.userId
                    ? 'text-blue-700 font-semibold underline underline-offset-4'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  +{formatBase(u.income)}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-mono tabular-nums text-slate-800">
                  -{formatBase(u.expense)}
                </span>
                <span className="text-slate-500">({u.count})</span>
              </button>
            ))}
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-sm font-medium text-slate-800">{t('dayEmptyTitle')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('dayEmptyDesc')}</p>
            <button
              type="button"
              onClick={() => onAddTransaction(selectedDateStr)}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('dayEmptyCta')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">{t('colDate')}</th>
                  <th className="py-2.5 px-4">{t('colDesc')}</th>
                  <th className="py-2.5 px-4">{t('colCategory')}</th>
                  <th className="py-2.5 px-4">{t('colCreatedBy')}</th>
                  <th className="py-2.5 px-4">{t('colMl')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colAmount')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTransactions.map((tx) => {
                  const catMeta = catMap[tx.category as CategoryId];
                  const isIncome = tx.type === 'income';
                  const hasOriginalNote =
                    tx.originalCurrency &&
                    tx.originalAmount !== undefined &&
                    tx.originalCurrency !== currencySettings.displayCurrency;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        {tx.notes && <div className="text-xs text-slate-500">{tx.notes}</div>}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700">
                        {getCatLabel(catMeta) || tx.category}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {tx.createdByName ?? t('unassignedUser')}
                        </div>
                        {tx.updatedByName && tx.updatedByName !== tx.createdByName && (
                          <div className="text-[11px] text-slate-500">
                            {t('editedBy', { name: tx.updatedByName })}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">
                        {tx.mlConfidence !== undefined ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-mono tabular-nums">
                              {Math.round(tx.mlConfidence * 100)}%
                            </span>
                            {tx.wasCorrectedByUser && (
                              <span className="text-slate-500">{t('mlCorrected')}</span>
                            )}
                          </span>
                        ) : (
                          <span>{t('mlManual')}</span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                          isIncome ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        <div>
                          {isIncome ? formatBase(tx.amount, true) : formatBase(-tx.amount)}
                        </div>
                        {hasOriginalNote && (
                          <div className="text-[11px] font-normal text-slate-500">
                            {formatInCurrency(tx.originalAmount!, tx.originalCurrency!)}
                            {tx.exchangeRate ? ` · TC ${tx.exchangeRate}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                          aria-label={tx.description}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors ml-1"
                          aria-label={tx.description}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
