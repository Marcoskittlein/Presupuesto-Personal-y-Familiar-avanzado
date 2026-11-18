import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Check, Sparkles, X } from 'lucide-react';
import { buildCategoryMap } from '../data/budget2027';
import { useI18n } from '../i18n/I18nContext';
import {
  getCategoriesForType,
  SupervisedTransactionClassifier,
} from '../ml/supervisedClassifier';
import {
  AuthUser,
  CategoryId,
  CategoryMeta,
  CurrencyCode,
  Transaction,
  TransactionType,
} from '../types/budget';
import { CURRENCY_MAP, SUPPORTED_CURRENCIES } from '../utils/currency';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    tx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
    teachModel: boolean,
  ) => Promise<void>;
  classifier: SupervisedTransactionClassifier;
  categories: CategoryMeta[];
  defaultDate: string;
  editingTransaction?: Transaction | null;
  currentUser?: AuthUser | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  classifier,
  categories,
  defaultDate,
  editingTransaction,
  currentUser,
}) => {
  const {
    lang,
    t,
    currencySettings,
    formatInCurrency,
    getCatLabel,
    getCatShort,
  } = useI18n();
  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState('');
  const [txCurrency, setTxCurrency] = useState<CurrencyCode>(currencySettings.baseCurrency);
  const [amountStr, setAmountStr] = useState('');
  const [exchangeRateStr, setExchangeRateStr] = useState('1');
  const [category, setCategory] = useState<CategoryId>('alimentacion');
  const [notes, setNotes] = useState('');
  const [manualCategorySelected, setManualCategorySelected] = useState(false);
  const [teachModel, setTeachModel] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const base = currencySettings.baseCurrency;
    if (editingTransaction) {
      const origCurr = editingTransaction.originalCurrency ?? base;
      const origRate =
        origCurr === base
          ? 1
          : editingTransaction.exchangeRate ?? currencySettings.ratesToBase[origCurr] ?? 1;
      const origAmt =
        editingTransaction.originalCurrency && editingTransaction.originalAmount
          ? editingTransaction.originalAmount
          : editingTransaction.amount;
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
      setTxCurrency(origCurr);
      setAmountStr(String(origAmt));
      setExchangeRateStr(String(origRate));
      setCategory(editingTransaction.category);
      setNotes(editingTransaction.notes ?? '');
      setManualCategorySelected(true);
      setTeachModel(true);
    } else {
      const firstExpense = categories.find((c) => c.type === 'expense')?.id ?? 'alimentacion';
      const defaultCurr = currencySettings.displayCurrency;
      const defaultRate =
        defaultCurr === base ? 1 : currencySettings.ratesToBase[defaultCurr] ?? 1;
      setType('expense');
      setDate(defaultDate);
      setDescription('');
      setTxCurrency(defaultCurr);
      setAmountStr('');
      setExchangeRateStr(String(defaultRate));
      setCategory(firstExpense);
      setNotes('');
      setManualCategorySelected(false);
      setTeachModel(true);
    }
  }, [isOpen, defaultDate, editingTransaction, categories, currencySettings]);

  const parsedOriginalAmount = useMemo(() => {
    const normalized = amountStr.replace(',', '.').replace(/[^\d.]/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const parsedRate = useMemo(() => {
    if (txCurrency === currencySettings.baseCurrency) return 1;
    const normalized = exchangeRateStr.replace(',', '.').replace(/[^\d.]/g, '');
    const r = Number(normalized);
    return Number.isFinite(r) && r > 0 ? r : currencySettings.ratesToBase[txCurrency] || 1;
  }, [txCurrency, exchangeRateStr, currencySettings]);

  const baseNormalizedAmount = useMemo(() => {
    const raw = parsedOriginalAmount * parsedRate;
    const decimals = CURRENCY_MAP[currencySettings.baseCurrency]?.decimals ?? 0;
    const factor = Math.pow(10, decimals);
    return Math.round(raw * factor) / factor;
  }, [parsedOriginalAmount, parsedRate, currencySettings.baseCurrency]);

  const allowedCategories = useMemo(
    () => getCategoriesForType(type, categories),
    [type, categories],
  );

  const prediction = useMemo(() => {
    if (description.trim().length < 2) return null;
    return classifier.predict(description, baseNormalizedAmount, allowedCategories);
  }, [classifier, description, baseNormalizedAmount, allowedCategories]);

  useEffect(() => {
    if (!manualCategorySelected && prediction) {
      setCategory(prediction.category);
    }
  }, [prediction, manualCategorySelected]);

  const handleCurrencyChange = (nextCurr: CurrencyCode) => {
    setTxCurrency(nextCurr);
    const rate =
      nextCurr === currencySettings.baseCurrency
        ? 1
        : currencySettings.ratesToBase[nextCurr] ?? 1;
    setExchangeRateStr(String(rate));
  };

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const valid = getCategoriesForType(nextType, categories);
    if (!valid.includes(category)) {
      setCategory(valid[0] ?? categories[0]?.id ?? 'alimentacion');
    }
    setManualCategorySelected(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('txDescPlaceholder'));
      return;
    }
    if (baseNormalizedAmount <= 0) {
      setError(' > 0');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const wasCorrected = Boolean(
        prediction && prediction.category !== category && manualCategorySelected,
      );
      const isForeign = txCurrency !== currencySettings.baseCurrency;
      await onSave(
        {
          id: editingTransaction?.id,
          date,
          description: description.trim(),
          amount: baseNormalizedAmount,
          originalAmount: isForeign ? parsedOriginalAmount : undefined,
          originalCurrency: isForeign ? txCurrency : undefined,
          exchangeRate: isForeign ? parsedRate : undefined,
          type,
          category,
          notes: notes.trim() || undefined,
          predictedCategory: prediction?.category,
          mlConfidence: prediction?.confidence,
          wasCorrectedByUser: wasCorrected,
        },
        teachModel,
      );
      onClose();
    } catch {
      setError(t('authConnError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);
  const isForeignCurrency = txCurrency !== currencySettings.baseCurrency;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 id="tx-modal-title" className="text-lg font-semibold text-slate-900">
              {editingTransaction ? t('txModalEditTitle') : t('txModalNewTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingTransaction ? (
                <>
                  {t('txOriginalBy')}{' '}
                  <span className="font-medium text-slate-700">
                    {editingTransaction.createdByName ?? t('unassignedUser')}
                  </span>
                  {currentUser ? ` · ${t('txEditedBy')} ${currentUser.name}` : ''}
                </>
              ) : currentUser ? (
                <>
                  {t('txWillLogAs')}{' '}
                  <span className="font-medium text-slate-700">{currentUser.name}</span> (
                  {currentUser.email})
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={t('simClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Type segmented selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                type === 'expense'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('txTypeExpense')}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                type === 'income'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('txTypeIncome')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('txDateLabel')}
              </label>
              <input
                id="tx-date"
                type="date"
                min="2000-01-01"
                max="2099-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="tx-currency" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('txCurrencyLabel')}
              </label>
              <select
                id="tx-currency"
                value={txCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) · {c.names[lang].split(' (')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t('txAmountLabel', { currency: txCurrency })}
              </label>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="85000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.,]/g, ''))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tabular-nums"
              />
              {parsedOriginalAmount > 0 && (
                <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                  {formatInCurrency(parsedOriginalAmount, txCurrency)}
                </p>
              )}
            </div>
          </div>

          {isForeignCurrency && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label htmlFor="tx-rate" className="block text-xs font-medium text-slate-700 mb-1">
                  {t('txRateLabel', { currency: txCurrency, base: currencySettings.baseCurrency })}
                </label>
                <input
                  id="tx-rate"
                  type="text"
                  inputMode="decimal"
                  value={exchangeRateStr}
                  onChange={(e) => setExchangeRateStr(e.target.value.replace(/[^\d.,]/g, ''))}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
                />
              </div>
              <div className="text-xs text-slate-700 font-mono tabular-nums">
                {t('txBaseEquiv', {
                  base: currencySettings.baseCurrency,
                  amount: formatInCurrency(baseNormalizedAmount, currencySettings.baseCurrency),
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="tx-desc" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('txDescLabel')}
            </label>
            <input
              id="tx-desc"
              type="text"
              placeholder={t('txDescPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Supervised ML Real-time Prediction */}
          {prediction && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>{t('txMlSuggestion')}</span>
                  <span className="font-semibold text-blue-700">
                    {getCatLabel(catMap[prediction.category]) || prediction.category}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-600">
                  {t('txMlConfidence', { pct: Math.round(prediction.confidence * 100) })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {prediction.matchedSignals.length > 0 && (
                  <span>
                    {t('txMlSignals')} {prediction.matchedSignals.join(', ')}
                  </span>
                )}
                {prediction.candidates.length > 1 && (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true">·</span>
                    <span>{t('txMlAlts')}</span>
                    {prediction.candidates.slice(1).map((cand) => (
                      <button
                        key={cand.category}
                        type="button"
                        onClick={() => {
                          setCategory(cand.category);
                          setManualCategorySelected(true);
                        }}
                        className="underline decoration-slate-300 hover:text-slate-900 transition-colors"
                      >
                        {getCatShort(catMap[cand.category]) || cand.category} (
                        {Math.round(cand.probability * 100)}%)
                      </button>
                    ))}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700">
                {t('txCategoryLabel')}
              </label>
              {manualCategorySelected && prediction && prediction.category !== category && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory(prediction.category);
                    setManualCategorySelected(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {t('txUseMl')}
                </button>
              )}
            </div>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as CategoryId);
                setManualCategorySelected(true);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCatLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('txNotesLabel')}
            </label>
            <input
              id="tx-notes"
              type="text"
              placeholder={t('txNotesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={teachModel}
              onChange={(e) => setTeachModel(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span>{t('txTeachMl')}</span>
          </label>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {t('txCancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              {submitting
                ? t('txSaving')
                : editingTransaction
                  ? t('txSaveEdit')
                  : t('txSaveNew')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
