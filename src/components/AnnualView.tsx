import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../i18n/I18nContext';
import { BUILTIN_CATEGORY_I18N } from '../i18n/translations';
import { BudgetAssumptions, MonthPlan, Transaction } from '../types/budget';
import { getTransactionMonthIndex, getTransactionYear } from '../utils/alertsEngine';
import { convertBetweenCurrencies } from '../utils/currency';

interface AnnualViewProps {
  selectedYear: number;
  projection: MonthPlan[];
  assumptions: BudgetAssumptions;
  transactions: Transaction[];
  onSelectMonth: (monthIndex: number) => void;
  onOpenSimulator: () => void;
}

type AnnualTableTab = 'balance' | 'cotidianos' | 'compromisos';

export const AnnualView: React.FC<AnnualViewProps> = ({
  selectedYear,
  projection,
  assumptions,
  transactions,
  onSelectMonth,
  onOpenSimulator,
}) => {
  const {
    lang,
    t,
    months,
    currencySettings,
    formatBase,
    formatInCurrency,
    convertDisplay,
    formatAxis,
  } = useI18n();
  const [tableTab, setTableTab] = useState<AnnualTableTab>('balance');

  const decPlan = projection[11];
  const janPlan = projection[0];
  const totalAnnualIncome = projection.reduce((acc, m) => acc + m.ingresosTotales, 0);
  const totalAnnualExpenses = projection.reduce((acc, m) => acc + m.gastosTotalesConAhorro, 0);
  const totalAnnualSavings = projection.reduce((acc, m) => acc + m.ahorro, 0);
  const totalPotentialReserve = decPlan?.reservaTotalAcumulada ?? 0;
  const deficitMonths = projection.filter((m) => m.saldoMensual < 0);

  const actualExpensesByMonth = projection.map((_, mIdx) =>
    transactions
      .filter(
        (tx) =>
          tx.type === 'expense' &&
          getTransactionYear(tx.date) === selectedYear &&
          getTransactionMonthIndex(tx.date) === mIdx,
      )
      .reduce((s, tx) => s + tx.amount, 0),
  );

  const totalActualLoggedExpenses = actualExpensesByMonth.reduce((a, b) => a + b, 0);

  const chartData = projection.map((m, idx) => ({
    mes: months[m.monthIndex]?.short ?? m.shortName,
    Ingresos: convertDisplay(m.ingresosTotales),
    GastosPlan: convertDisplay(m.gastosTotalesConAhorro),
    EjecutadoReal:
      actualExpensesByMonth[idx] > 0 ? convertDisplay(actualExpensesByMonth[idx]) : null,
    SaldoAcumulado: convertDisplay(m.saldoAcumulado),
    AlquilerBolsillo: convertDisplay(m.alquilerBolsillo),
    AporteEmpresa: convertDisplay(m.aporteEmpresa),
  }));

  const reserveGoalProgress =
    assumptions.metaReservaMax > 0
      ? Math.min(100, Math.round((totalPotentialReserve / assumptions.metaReservaMax) * 100))
      : totalPotentialReserve > 0
        ? 100
        : 0;

  const highSurplusBaseThreshold = convertBetweenCurrencies(
    500000,
    'ARS',
    currencySettings.baseCurrency,
    currencySettings,
  );

  return (
    <div className="space-y-6">
      {/* 4-column executive KPI strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('annIncomeTotal', { year: selectedYear })}
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(totalAnnualIncome)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {t('annIncomeSub', { amount: formatBase(janPlan.ingresosTotales) })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('annExpTotal')}</div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(totalAnnualExpenses)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span>{t('annActualLogged')}</span>
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {formatBase(totalActualLoggedExpenses)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('annAccumulatedSurplus')}
          </div>
          <div className="text-2xl font-semibold text-emerald-700 font-mono tabular-nums mt-1.5">
            {formatBase(decPlan.saldoAcumulado)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span>{t('annFixedSavings')}</span>
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {formatBase(totalAnnualSavings)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {t('annPotentialReserve', { year: selectedYear })}
            </span>
            <button
              type="button"
              onClick={onOpenSimulator}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
            >
              {t('annSimulate')} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {formatBase(totalPotentialReserve)}
          </div>
          <div className="mt-2.5">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${reserveGoalProgress}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
              {assumptions.metaReservaMin > 0 ? (
                <>
                  <span>
                    {t('annGoalLabel', {
                      min: formatBase(assumptions.metaReservaMin),
                      max: formatBase(assumptions.metaReservaMax),
                    })}
                  </span>
                  {totalPotentialReserve >= assumptions.metaReservaMin ? (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('annInGoal')}
                    </span>
                  ) : (
                    <span className="text-red-700 font-medium inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {t('annBelowGoal')}
                    </span>
                  )}
                </>
              ) : (
                <span>{t('annNoGoal')}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comparative Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t('annChartFlowTitle', { year: selectedYear })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('annChartFlowDesc')}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatAxis(Number(v ?? 0))}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  width={62}
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
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Bar
                  dataKey="Ingresos"
                  name={t('annSeriesIncome')}
                  fill="#1D4ED8"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="GastosPlan"
                  name={t('annSeriesExpenses')}
                  fill="#94A3B8"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="SaldoAcumulado"
                  name={t('annSeriesBalance')}
                  stroke="#15803D"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#15803D' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t('annChartRentTitle')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('annChartRentDesc', {
                allowance: formatBase(assumptions.aporteEmpresaAlquiler),
                pct: assumptions.actualizacionAlquilerPct,
              })}
            </p>
            <div className="h-52 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatAxis(Number(v ?? 0))}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
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
                  <Bar
                    dataKey="AporteEmpresa"
                    name={t('annSeriesAllowance')}
                    stackId="rent"
                    fill="#CBD5E1"
                  />
                  <Bar
                    dataKey="AlquilerBolsillo"
                    name={t('annSeriesPocket')}
                    stackId="rent"
                    fill="#D97706"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>{t('annJanPocket')}</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {formatBase(janPlan.alquilerBolsillo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('annDecPocket')}</span>
              <span className="font-mono tabular-nums font-semibold text-amber-700">
                {formatBase(decPlan.alquilerBolsillo)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Tier Strategy & Key Risk Watchpoints */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>{t('annTier1Title')}</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {t('annTier1Body', {
              jan: formatBase(janPlan.alimentacion),
              dec: formatBase(decPlan.alimentacion),
              pct: assumptions.inflacionMensualPct,
            })}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>{t('annTier2Title')}</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {t('annTier2Body', {
              monthly: formatBase(assumptions.ahorroMensual),
              total: formatBase(totalAnnualSavings),
              year: selectedYear,
            })}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <span>{t('annTier3Title')}</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {deficitMonths.length > 0
              ? t('annTier3Deficit', {
                  months: deficitMonths
                    .map(
                      (m) =>
                        `${months[m.monthIndex]?.name ?? m.monthName} (${formatBase(m.saldoMensual)})`,
                    )
                    .join(', '),
                })
              : t('annTier3Ok')}
          </p>
        </div>
      </section>

      {/* Full 12-Month Breakdown Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('annTableTitle', { year: selectedYear })}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('annTableDesc')}</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTableTab('balance')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tableTab === 'balance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('annTabBalance')}
            </button>
            <button
              type="button"
              onClick={() => setTableTab('cotidianos')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tableTab === 'cotidianos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('annTabDaily')}
            </button>
            <button
              type="button"
              onClick={() => setTableTab('compromisos')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tableTab === 'compromisos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('annTabCommitments')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableTab === 'balance' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">{t('colMonth')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colTotalIncome')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colExpensesSavings')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colActualLogged')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colMonthlyBalance')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colAccumBalance')}</th>
                  <th className="py-2.5 px-4">{t('colProjectedStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {projection.map((m, idx) => {
                  const actual = actualExpensesByMonth[idx];
                  const isDeficit = m.saldoMensual < 0;
                  const isHighSurplus = m.saldoMensual >= highSurplusBaseThreshold;
                  const mName = months[m.monthIndex]?.name ?? m.monthName;
                  return (
                    <tr
                      key={m.monthIndex}
                      onClick={() => onSelectMonth(m.monthIndex)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <div>
                          {mName}
                          {m.aguinaldo > 0 && (
                            <span className="text-xs text-slate-500 font-normal ml-2">
                              {t('colBonusTag')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500 font-mono tabular-nums">
                          {t('colPaydayHint', { day: m.fechaIngresoPrevista })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatBase(m.ingresosTotales)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatBase(m.gastosTotalesConAhorro)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                        {actual > 0 ? formatBase(actual) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          isDeficit ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatBase(m.saldoMensual, true)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatBase(m.saldoAcumulado)}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {isDeficit ? (
                          <span className="text-red-700 font-medium inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {t('statusDeficitCovered')}
                          </span>
                        ) : isHighSurplus ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> {t('statusHighSurplus')}
                          </span>
                        ) : (
                          <span className="text-slate-600">{t('statusPositive')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tableTab === 'cotidianos' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">{t('colMonth')}</th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.alimentacion[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.servicios[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.ropa[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.transporte[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.salud[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {BUILTIN_CATEGORY_I18N.escuela[lang].shortLabel}
                  </th>
                  <th className="py-2.5 px-4 text-right">{t('colTotalDaily')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {projection.map((m) => (
                  <tr
                    key={m.monthIndex}
                    onClick={() => onSelectMonth(m.monthIndex)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {months[m.monthIndex]?.name ?? m.monthName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.alimentacion)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.servicios)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.ropa)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.transporte)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.salud)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.escuela)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatBase(m.totalCotidiano)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tableTab === 'compromisos' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-2.5 px-4">{t('colMonth')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colTotalRent')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colPocketRent')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colDebts')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colFee')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colDeposit')}</th>
                  <th className="py-2.5 px-3 text-right">{t('colTithe')}</th>
                  <th className="py-2.5 px-4 text-right">{t('colSavings')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {projection.map((m) => (
                  <tr
                    key={m.monthIndex}
                    onClick={() => onSelectMonth(m.monthIndex)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {months[m.monthIndex]?.name ?? m.monthName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.alquilerTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700 font-medium">
                      {formatBase(m.alquilerBolsillo)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.deudas)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {m.comision > 0 ? formatBase(m.comision) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {m.deposito > 0 ? formatBase(m.deposito) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatBase(m.diezmo)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {formatBase(m.ahorro)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
