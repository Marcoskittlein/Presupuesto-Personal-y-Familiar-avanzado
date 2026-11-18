import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildCategoryMap,
  getDailyVariableCategoryIds,
  getExpenseCategoryIds,
  getMonthCategoryBudget,
} from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  AlertRules,
  BudgetAlert,
  BudgetAssumptions,
  CategoryMeta,
  MonthPlan,
  Transaction,
  WorkspaceMember,
} from '../types/budget';
import {
  getTransactionMonthIndex,
  getTransactionYear,
  MonthlyExecutionSummary,
} from '../utils/alertsEngine';

interface MonthlyViewProps {
  selectedYear: number;
  monthPlan: MonthPlan;
  execution: MonthlyExecutionSummary;
  alerts: BudgetAlert[];
  alertRules: AlertRules;
  categories: CategoryMeta[];
  assumptions?: BudgetAssumptions;
  transactions?: Transaction[];
  workspaceMembers?: WorkspaceMember[];
  referenceDay: number;
  onReferenceDayChange: (day: number) => void;
  onAddTransaction: () => void;
  onEditMonthBudget: () => void;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({
  selectedYear,
  monthPlan,
  execution,
  alerts,
  alertRules,
  categories,
  assumptions,
  transactions = [],
  workspaceMembers = [],
  referenceDay,
  onReferenceDayChange,
  onAddTransaction,
  onEditMonthBudget,
}) => {
  const {
    t,
    months,
    currencySettings,
    formatBase,
    formatInCurrency,
    convertDisplay,
    formatAxis,
    getCatLabel,
    getCatShort,
    formatPayday,
  } = useI18n();

  const catMap = buildCategoryMap(categories);
  const dailyVariableIds = getDailyVariableCategoryIds(categories);
  const expenseIds = getExpenseCategoryIds(categories);
  const monthLabel = months[monthPlan.monthIndex]?.name ?? monthPlan.monthName;

  const paydayDisplayText = assumptions
    ? formatPayday(
        selectedYear,
        monthPlan.monthIndex,
        monthPlan.fechaIngresoPrevista,
        assumptions.diaIngresoModo ?? 'business_day',
        assumptions.diaIngresoValor ?? 4,
      )
    : monthPlan.reglaIngresoTexto;

  const monthAlerts = alerts.filter(
    (a) => a.monthIndex === monthPlan.monthIndex && a.scope !== 'annual',
  );

  const dailyVariableChartData = dailyVariableIds.map((catId) => {
    const budget =
      alertRules.categoryCustomCaps[catId] ?? getMonthCategoryBudget(monthPlan, catId);
    const actual = execution.actualByCategory[catId] ?? 0;
    return {
      categoria: getCatShort(catMap[catId]) || catId,
      Presupuesto: convertDisplay(budget),
      Ejecutado: convertDisplay(actual),
    };
  });

  const remainingTotal = monthPlan.gastosTotalesConAhorro - execution.actualExpenseTotal;
  const pctMonthUsed =
    monthPlan.gastosTotalesConAhorro > 0
      ? (execution.actualExpenseTotal / monthPlan.gastosTotalesConAhorro) * 100
      : 0;

  const userSummaryRows = (() => {
    const map = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        income: number;
        expense: number;
        incomeCount: number;
        expenseCount: number;
      }
    >();
    for (const m of workspaceMembers) {
      map.set(m.userId, {
        userId: m.userId,
        name: m.name,
        email: m.email,
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0,
      });
    }
    for (const tx of transactions) {
      if (
        getTransactionYear(tx.date) !== selectedYear ||
        getTransactionMonthIndex(tx.date) !== monthPlan.monthIndex
      ) {
        continue;
      }
      const uid = tx.createdByUserId ?? 'legacy';
      const current = map.get(uid) ?? {
        userId: uid,
        name: tx.createdByName ?? t('unassignedUser'),
        email: tx.createdByEmail ?? '',
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
      if (tx.type === 'income') {
        current.income += tx.amount;
        current.incomeCount += 1;
      } else {
        current.expense += tx.amount;
        current.expenseCount += 1;
      }
      map.set(uid, current);
    }
    return Array.from(map.values()).filter(
      (r) => r.incomeCount + r.expenseCount > 0 || workspaceMembers.length > 1,
    );
  })();

  return (
    <div className="space-y-6">
      {/* Monthly KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              {t('monIncomeTitle', { month: monthLabel })}
            </span>
            <button
              type="button"
              onClick={onEditMonthBudget}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> {t('monEdit')}
            </button>
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(monthPlan.ingresosTotales)}
          </div>
          <div className="text-xs text-slate-500 mt-2 space-y-0.5">
            <div>
              {t('monActualIncome')}{' '}
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {formatBase(execution.actualIncomeTotal)}
              </span>
            </div>
            <div>
              {t('monExpectedPayday')}{' '}
              <span className="font-mono tabular-nums font-medium text-emerald-700">
                {paydayDisplayText}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('monPlannedExp')}</div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(monthPlan.gastosTotalesConAhorro)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {t('monActualExp')}{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {formatBase(execution.actualExpenseTotal)} ({pctMonthUsed.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('monRemainingMargin')}</div>
          <div
            className={`text-2xl font-semibold font-mono tabular-nums mt-1.5 ${
              remainingTotal < 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {formatBase(remainingTotal)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {t('monDailyRemaining')}{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {formatBase(execution.budgetDailyVariableTotal - execution.actualDailyVariableTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('monCutoffDay')}</span>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {t('monElapsed', { pct: Math.round(execution.monthProgressPct) })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={monthPlan.daysInMonth}
              value={referenceDay}
              onChange={(e) => onReferenceDayChange(Number(e.target.value))}
              aria-label={t('monCutoffDay')}
              className="w-full accent-blue-700"
            />
            <span className="text-lg font-semibold font-mono tabular-nums text-slate-900 w-10 text-right">
              {referenceDay}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{t('monCutoffHint')}</p>
        </div>
      </section>

      {/* Chart + Active Month Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t('monChartTitle', { month: monthLabel })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('monChartDesc', { count: dailyVariableIds.length })}
              </p>
            </div>
            <button
              type="button"
              onClick={onAddTransaction}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('btnAddExpense')}
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyVariableChartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatAxis(Number(v ?? 0))}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatInCurrency(Number(value ?? 0), currencySettings.displayCurrency),
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="Presupuesto"
                  name={t('monSeriesBudget')}
                  fill="#CBD5E1"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
                <Bar
                  dataKey="Ejecutado"
                  name={t('monSeriesActual')}
                  fill="#1D4ED8"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <h2 className="text-base font-semibold text-slate-900">
            {t('monAlertsTitle', { month: monthLabel })}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            {t('monAlertsDesc', { day: referenceDay })}
          </p>

          {monthAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-slate-500">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mb-2" />
              <p className="text-sm font-medium text-slate-800">{t('monNoAlertsTitle')}</p>
              <p className="text-xs mt-1 max-w-xs">
                {t('monNoAlertsDesc', { month: monthLabel })}
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
              {monthAlerts.map((alert) => {
                const isOver = alert.severity === 'overspend';
                const isWarn = alert.severity === 'warning';
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${
                      isOver
                        ? 'bg-red-50/60 border-red-200 text-slate-800'
                        : isWarn
                          ? 'bg-amber-50/60 border-amber-200 text-slate-800'
                          : 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {isOver ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      ) : (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      )}
                      <span
                        className={
                          isOver ? 'text-red-800' : isWarn ? 'text-amber-800' : 'text-emerald-800'
                        }
                      >
                        {isOver ? t('statusOver') : isWarn ? t('statusWarn') : t('statusSurplus')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{alert.title}</span>
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed">{alert.message}</p>
                    <p className="mt-1 text-slate-600 font-medium">{alert.actionHint}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Complete Category Execution Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {t('monTableTitle', { month: monthLabel, year: selectedYear })}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('monTableDesc', {
              daily: dailyVariableIds.length,
              other: Math.max(0, expenseIds.length - dailyVariableIds.length),
            })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4">{t('colCategory')}</th>
                <th className="py-2.5 px-4">{t('colType')}</th>
                <th className="py-2.5 px-4 text-right">{t('colBudget')}</th>
                <th className="py-2.5 px-4 text-right">{t('colActual')}</th>
                <th className="py-2.5 px-4 text-right">{t('colVariance')}</th>
                <th className="py-2.5 px-4 w-44">{t('colUsage')}</th>
                <th className="py-2.5 px-4">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {expenseIds.map((catId) => {
                const meta = catMap[catId];
                if (!meta) return null;
                const baseBudget = getMonthCategoryBudget(monthPlan, catId);
                const customCap = alertRules.categoryCustomCaps[catId];
                const budget = customCap ?? baseBudget;
                const actual = execution.actualByCategory[catId] ?? 0;
                const diff = budget - actual;
                const pct = budget > 0 ? (actual / budget) * 100 : 0;

                if (budget === 0 && actual === 0) return null;

                const isOver = pct > alertRules.overspendThresholdPct;
                const isWarn = !isOver && pct >= alertRules.warningThresholdPct;
                const isPaceWarn =
                  !isOver &&
                  !isWarn &&
                  meta.isDailyVariable &&
                  execution.actualExpenseTotal > 0 &&
                  execution.monthProgressPct >= 20 &&
                  pct - execution.monthProgressPct >= alertRules.paceDeviationWarningPct;
                const isSurplus =
                  !isOver &&
                  !isWarn &&
                  meta.isDailyVariable &&
                  execution.actualExpenseTotal > 0 &&
                  execution.monthProgressPct >= 35 &&
                  execution.monthProgressPct - pct >= 15;

                const barColor = isOver
                  ? 'bg-red-600'
                  : isWarn || isPaceWarn
                    ? 'bg-amber-500'
                    : isSurplus
                      ? 'bg-emerald-600'
                      : 'bg-blue-600';

                return (
                  <tr key={catId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{getCatLabel(meta)}</div>
                      {customCap !== undefined && (
                        <div className="text-xs text-blue-700">
                          {t('customCapActive', { base: formatBase(baseBudget) })}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">
                      {meta.isDailyVariable
                        ? t('typeDailyVar')
                        : meta.tier === 'ahorro'
                          ? t('typeSaving')
                          : t('typeFixed')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(budget)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatBase(actual)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                        diff < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatBase(diff, true)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600 w-11 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {isOver ? (
                        <span className="text-red-700 font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {t('statusOver')}
                        </span>
                      ) : isWarn || isPaceWarn ? (
                        <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />{' '}
                          {isWarn ? t('statusWarn') : t('statusHighPace')}
                        </span>
                      ) : isSurplus ? (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> {t('statusSurplus')}
                        </span>
                      ) : (
                        <span className="text-slate-600">{t('statusNormal')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {userSummaryRows.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              {t('monUserTableTitle', { month: monthLabel, year: selectedYear })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('monUserTableDesc')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">{t('colUser')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colLoadedIncome')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colLoadedExpense')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colNetLogged')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colMovements')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {userSummaryRows.map((row) => {
                  const net = row.income - row.expense;
                  const totalCount = row.incomeCount + row.expenseCount;
                  return (
                    <tr key={row.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{row.name}</div>
                        {row.email && <div className="text-xs text-slate-500">{row.email}</div>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatBase(row.income)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {formatBase(row.expense)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          net < 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatBase(net, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                        {totalCount} ({row.incomeCount} + / {row.expenseCount} -)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
