import React, { useMemo, useState } from 'react';
import { Brain, Plus, Trash2 } from 'lucide-react';
import { buildCategoryMap } from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  evaluateClassifierLOO,
  SupervisedTransactionClassifier,
} from '../ml/supervisedClassifier';
import { CategoryId, CategoryMeta, TrainingSample } from '../types/budget';

interface MLClassifierViewProps {
  classifier: SupervisedTransactionClassifier;
  categories: CategoryMeta[];
  allSamples: TrainingSample[];
  onAddSample: (sample: Omit<TrainingSample, 'id'>) => Promise<void>;
  onDeleteSample: (id: string) => Promise<void>;
}

export const MLClassifierView: React.FC<MLClassifierViewProps> = ({
  classifier,
  categories,
  allSamples,
  onAddSample,
  onDeleteSample,
}) => {
  const { t, currencySettings, formatBase, getCatLabel } = useI18n();
  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const [testText, setTestText] = useState('Compra carnicería y verdulería del sábado');
  const [testAmountStr, setTestAmountStr] = useState('78000');

  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryId>(
    categories[0]?.id ?? 'alimentacion',
  );
  const [newAmountStr, setNewAmountStr] = useState('');
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => evaluateClassifierLOO(allSamples), [allSamples]);

  const activeCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const parsedTestAmount = Number(testAmountStr.replace(/[^\d.]/g, '')) || undefined;
  const livePrediction = useMemo(() => {
    if (!testText.trim()) return null;
    return classifier.predict(
      testText,
      parsedTestAmount,
      activeCategoryIds.length > 0 ? activeCategoryIds : undefined,
    );
  }, [classifier, testText, parsedTestAmount, activeCategoryIds]);

  const customSamples = allSamples.filter((s) => !s.isDefault);

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const amountHint = Number(newAmountStr.replace(/[^\d.]/g, '')) || undefined;
      await onAddSample({
        text: newText.trim(),
        category: newCategory,
        amountHint,
        isDefault: false,
      });
      setNewText('');
      setNewAmountStr('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Evaluation KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('mlAlgoTitle')}</div>
          <div className="text-base font-semibold text-slate-900 mt-1.5">
            {t('mlAlgoName')}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {t('mlAlgoDesc')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('mlAccTitle')}
          </div>
          <div className="text-2xl font-semibold text-emerald-700 font-mono tabular-nums mt-1.5">
            {(metrics.leaveOneOutAccuracy * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {t('mlAccDesc')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('mlSamplesTitle')}</div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {metrics.totalSamples}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {t('mlSamplesFamily', { count: customSamples.length })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">{t('mlVocabTitle')}</div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1.5">
            {metrics.vocabularySize}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {t('mlVocabCats', { count: metrics.categoryCount })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Classifier Sandbox */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('mlSandboxTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('mlSandboxDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="ml-test-text" className="block text-xs font-medium text-slate-700 mb-1">
                {t('mlTestDescLabel')}
              </label>
              <input
                id="ml-test-text"
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder={t('mlTestDescPh')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label htmlFor="ml-test-amt" className="block text-xs font-medium text-slate-700 mb-1">
                {t('mlTestAmtLabel', { currency: currencySettings.baseCurrency })}
              </label>
              <input
                id="ml-test-amt"
                type="text"
                inputMode="decimal"
                value={testAmountStr}
                onChange={(e) => setTestAmountStr(e.target.value.replace(/[^\d.]/g, ''))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
              />
            </div>
          </div>

          {livePrediction ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>
                    {t('mlPredictionLabel', {
                      cat: catMap[livePrediction.category]
                        ? getCatLabel(catMap[livePrediction.category])
                        : livePrediction.category,
                    })}
                  </span>
                </div>
                <span className="text-sm font-mono tabular-nums font-semibold text-blue-700">
                  {(livePrediction.confidence * 100).toFixed(1)}%
                </span>
              </div>

              {livePrediction.matchedSignals.length > 0 && (
                <div className="text-xs text-slate-600">
                  {t('mlTokensLabel')}{' '}
                  <span className="font-mono text-slate-800">
                    {livePrediction.matchedSignals.join(' · ')}
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-xs font-medium text-slate-600">{t('mlTop3Label')}</div>
                {livePrediction.candidates.map((cand) => (
                  <div key={cand.category} className="flex items-center gap-3 text-xs">
                    <span className="w-40 truncate text-slate-700">
                      {catMap[cand.category] ? getCatLabel(catMap[cand.category]) : cand.category}
                    </span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.round(cand.probability * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums text-slate-700 w-12 text-right">
                      {(cand.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t('mlEmptyPrompt')}</p>
          )}
        </div>

        {/* Add Training Sample Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('mlTrainTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('mlTrainDesc')}
            </p>
          </div>

          <form onSubmit={handleAddSample} className="space-y-3">
            <div>
              <label htmlFor="ml-new-text" className="block text-xs font-medium text-slate-700 mb-1">
                {t('mlNewTextLabel')}
              </label>
              <input
                id="ml-new-text"
                type="text"
                placeholder={t('mlNewTextPh')}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ml-new-cat" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('mlNewCatLabel')}
                </label>
                <select
                  id="ml-new-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getCatLabel(cat)} ({cat.type === 'income' ? t('txTypeIncome') : t('txTypeExpense')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ml-new-amt" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('mlNewAmtLabel', { currency: currencySettings.baseCurrency })}
                </label>
                <input
                  id="ml-new-amt"
                  type="text"
                  inputMode="decimal"
                  placeholder="150000"
                  value={newAmountStr}
                  onChange={(e) => setNewAmountStr(e.target.value.replace(/[^\d.]/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {saving ? t('mlTrainingBtn') : t('mlTrainBtn')}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 mb-2">
              {t('mlLearnedTitle', { count: customSamples.length })}
            </h3>
            {customSamples.length === 0 ? (
              <p className="text-xs text-slate-500">
                {t('mlLearnedEmpty')}
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {customSamples.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{s.text}</div>
                      <div className="text-slate-500">
                        {catMap[s.category] ? getCatLabel(catMap[s.category]) : s.category}
                        {s.amountHint ? ` · ~${formatBase(s.amountHint)}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteSample(s.id)}
                      className="p-1 text-slate-400 hover:text-red-700 rounded transition-colors shrink-0"
                      aria-label={`${t('simDelete')} ${s.text}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
