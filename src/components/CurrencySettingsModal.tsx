import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { CurrencyCode, CurrencySettings } from '../types/budget';
import {
  CURRENCY_MAP,
  getDefaultRatesForBase,
  SUPPORTED_CURRENCIES,
} from '../utils/currency';

interface CurrencySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySettings: CurrencySettings;
  onSaveCurrencySettings: (payload: {
    baseCurrency: CurrencyCode;
    displayCurrency: CurrencyCode;
    ratesToBase: Record<CurrencyCode, number>;
    convertExistingData: boolean;
  }) => Promise<void>;
}

export const CurrencySettingsModal: React.FC<CurrencySettingsModalProps> = ({
  isOpen,
  onClose,
  currencySettings,
  onSaveCurrencySettings,
}) => {
  const { lang, t } = useI18n();
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(currencySettings.baseCurrency);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(
    currencySettings.displayCurrency,
  );
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(currencySettings.ratesToBase);
  const [convertExistingData, setConvertExistingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBaseCurrency(currencySettings.baseCurrency);
    setDisplayCurrency(currencySettings.displayCurrency);
    setRates({ ...currencySettings.ratesToBase });
    setConvertExistingData(true);
  }, [isOpen, currencySettings]);

  if (!isOpen) return null;

  const handleBaseChange = (nextBase: CurrencyCode) => {
    if (nextBase === baseCurrency) return;
    const factor = rates[nextBase] > 0 ? rates[nextBase] : 1;
    const nextRates = { ...rates };
    for (const c of SUPPORTED_CURRENCIES) {
      if (c.code === nextBase) {
        nextRates[c.code] = 1;
      } else {
        const derived = (rates[c.code] || 1) / factor;
        nextRates[c.code] =
          derived >= 10 ? Math.round(derived * 100) / 100 : Math.round(derived * 10000) / 10000;
      }
    }
    setBaseCurrency(nextBase);
    setRates(nextRates);
  };

  const handleResetRates = () => {
    setRates(getDefaultRatesForBase(baseCurrency));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveCurrencySettings({
        baseCurrency,
        displayCurrency,
        ratesToBase: rates,
        convertExistingData:
          baseCurrency !== currencySettings.baseCurrency ? convertExistingData : false,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curr-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 id="curr-modal-title" className="text-lg font-semibold text-slate-900">
              {t('currModalTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('currModalDesc')}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label htmlFor="curr-display" className="block text-xs font-semibold text-slate-900">
                {t('currDisplayTitle')}
              </label>
              <select
                id="curr-display"
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.names[lang]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">{t('currDisplayDesc')}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label htmlFor="curr-base" className="block text-xs font-semibold text-slate-900">
                {t('currBaseTitle')}
              </label>
              <select
                id="curr-base"
                value={baseCurrency}
                onChange={(e) => handleBaseChange(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.names[lang]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">{t('currBaseDesc')}</p>
            </div>
          </div>

          {baseCurrency !== currencySettings.baseCurrency && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-blue-200 bg-blue-50/70 text-xs text-blue-950 cursor-pointer">
              <input
                type="checkbox"
                checked={convertExistingData}
                onChange={(e) => setConvertExistingData(e.target.checked)}
                className="mt-0.5 rounded border-blue-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t('currConvertExisting')}</span>
            </label>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  {t('currRatesTitle', { base: baseCurrency })}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('currRatesDesc', { base: baseCurrency })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetRates}
                className="text-xs text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {t('currResetRates')}
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {SUPPORTED_CURRENCIES.map((c) => {
                const isBase = c.code === baseCurrency;
                return (
                  <div
                    key={c.code}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 w-10">
                        1 {c.code}
                      </span>
                      <span className="text-slate-600">{c.names[lang]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">=</span>
                      <input
                        type="number"
                        step="any"
                        min={0.0001}
                        disabled={isBase}
                        value={isBase ? 1 : rates[c.code] ?? 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRates((prev) => ({
                            ...prev,
                            [c.code]: val > 0 ? val : prev[c.code],
                          }));
                        }}
                        className="w-28 px-2.5 py-1 text-right font-mono tabular-nums border border-slate-300 rounded-md bg-white disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      <span className="font-mono text-slate-600 w-9">
                        {CURRENCY_MAP[baseCurrency]?.code}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {t('txCancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? t('currSaving') : t('currSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
