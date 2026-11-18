import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  TrendingUp,
} from 'lucide-react';
import {
  buildCategoryMap,
  DEFAULT_ALERT_RULES,
  getMonthCategoryBudget,
} from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  AlertRules,
  AlertSeverity,
  BudgetAlert,
  CategoryMeta,
  ExpenseCategoryId,
  MonthPlan,
} from '../types/budget';

interface AlertsRulesViewProps {
  alerts: BudgetAlert[];
  alertRules: AlertRules;
  selectedMonth: MonthPlan;
  categories: CategoryMeta[];
  onUpdateRules: (rules: AlertRules) => Promise<void>;
}

export const AlertsRulesView: React.FC<AlertsRulesViewProps> = ({
  alerts,
  alertRules,
  selectedMonth,
  categories,
  onUpdateRules,
}) => {
  const { t, months, currencySettings, formatBase, getCatLabel } = useI18n();
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all');
  const [draft, setDraft] = useState<AlertRules>(alertRules);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const monthObj = months[selectedMonth.monthIndex];
  const monthLabel = monthObj?.name ?? selectedMonth.monthName;
  const monthShortLabel = monthObj?.short ?? selectedMonth.shortName;

  const catMap = buildCategoryMap(categories);
  const capCategories = categories.filter(
    (c) => c.type === 'expense' && (c.isDailyVariable || !c.isDefault),
  );

  const visibleAlerts = alerts.filter((a) => filter === 'all' || a.severity === filter);
  const overspendCount = alerts.filter((a) => a.severity === 'overspend').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const surplusCount = alerts.filter((a) => a.severity === 'surplus').length;

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onUpdateRules(draft);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setDraft(DEFAULT_ALERT_RULES);
    await onUpdateRules(DEFAULT_ALERT_RULES);
  };

  const setCategoryCap = (catId: ExpenseCategoryId, raw: string) => {
    const clean = raw.replace(/[^\d.]/g, '');
    const nextCaps = { ...draft.categoryCustomCaps };
    if (!clean) {
      delete nextCaps[catId];
    } else {
      const parsed = Number(clean);
      if (Number.isFinite(parsed) && parsed >= 0) {
        nextCaps[catId] = parsed;
      }
    }
    setDraft({ ...draft, categoryCustomCaps: nextCaps });
  };

  const scopeLabel = (scope: BudgetAlert['scope']) => {
    switch (scope) {
      case 'annual':
        return t('alertsScopeAnnual');
      case 'monthly':
        return t('alertsScopeMonthly');
      case 'daily':
        return t('alertsScopeDaily');
      case 'category':
      default:
        return t('alertsScopeCategory');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Active Alerts & Surplus Opportunities Feed */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('alertsFeedTitle', { month: monthLabel })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('alertsFeedSub', {
                over: overspendCount,
                warn: warningCount,
                surplus: surplusCount,
              })}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: t('alertsTabAll') },
                { id: 'overspend', label: t('statusOver') },
                { id: 'warning', label: t('statusWarn') },
                { id: 'surplus', label: t('statusSurplus') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {visibleAlerts.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-slate-500">
              {t('alertsEmpty', { month: monthLabel })}
            </div>
          ) : (
            visibleAlerts.map((alert) => {
              const isOver = alert.severity === 'overspend';
              const isWarn = alert.severity === 'warning';
              return (
                <div key={alert.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {isOver ? (
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                      )}
                      <span
                        className={
                          isOver ? 'text-red-700' : isWarn ? 'text-amber-700' : 'text-emerald-700'
                        }
                      >
                        {isOver ? t('statusOver') : isWarn ? t('statusWarn') : t('statusSurplus')}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span className="text-slate-500 font-normal">
                        {scopeLabel(alert.scope)}
                      </span>
                    </div>

                    {alert.amountImpact !== undefined && (
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          alert.amountImpact < 0 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatBase(alert.amountImpact, true)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mt-1.5">{alert.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-slate-800 font-medium mt-2">{alert.actionHint}</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Right: Custom Rules & Category Limits */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 h-fit">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('rulesTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('rulesDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('rulesReset')}
          </button>
        </div>

        <form onSubmit={handleSaveRules} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="warn-pct" className="block text-xs font-medium text-slate-700 mb-1">
                {t('rulesWarnPct')}
              </label>
              <input
                id="warn-pct"
                type="number"
                min={50}
                max={99}
                value={draft.warningThresholdPct}
                onChange={(e) =>
                  setDraft({ ...draft, warningThresholdPct: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="over-pct" className="block text-xs font-medium text-slate-700 mb-1">
                {t('rulesOverPct')}
              </label>
              <input
                id="over-pct"
                type="number"
                min={100}
                max={150}
                value={draft.overspendThresholdPct}
                onChange={(e) =>
                  setDraft({ ...draft, overspendThresholdPct: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="pace-pct" className="block text-xs font-medium text-slate-700 mb-1">
                {t('rulesPacePct')}
              </label>
              <input
                id="pace-pct"
                type="number"
                min={5}
                max={50}
                value={draft.paceDeviationWarningPct}
                onChange={(e) =>
                  setDraft({ ...draft, paceDeviationWarningPct: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="surplus-min" className="block text-xs font-medium text-slate-700 mb-1">
                {t('rulesSurplusMin', { currency: currencySettings.baseCurrency })}
              </label>
              <input
                id="surplus-min"
                type="number"
                step="any"
                min={0}
                value={draft.surplusMinAmount}
                onChange={(e) => setDraft({ ...draft, surplusMinAmount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 mb-1">
              {t('rulesCustomCapsTitle', { currency: currencySettings.baseCurrency })}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {t('rulesCustomCapsDesc', { month: monthLabel })}
            </p>
            <div className="space-y-2.5">
              {capCategories.map((cat) => {
                const catId = cat.id;
                const baseVal = getMonthCategoryBudget(selectedMonth, catId);
                const customVal = draft.categoryCustomCaps[catId];
                return (
                  <div key={catId} className="flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <div className="font-medium text-slate-800">
                        {getCatLabel(catMap[catId] ?? cat)}
                      </div>
                      <div className="text-slate-400 font-mono tabular-nums">
                        {monthShortLabel}: {formatBase(baseVal)}
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={String(baseVal)}
                      value={customVal !== undefined ? String(customVal) : ''}
                      onChange={(e) => setCategoryCap(catId, e.target.value)}
                      className="w-36 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-right font-mono tabular-nums"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedNotice ? (
              <span className="text-xs text-emerald-700 font-medium">
                {t('rulesSaved')}
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? t('txSaving') : t('rulesSaveBtn')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
