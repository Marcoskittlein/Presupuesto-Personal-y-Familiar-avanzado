import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CategoryMeta, CurrencyCode, CurrencySettings, IncomeDayMode, LanguageCode } from '../types/budget';
import {
  convertBaseToDisplay,
  DEFAULT_CURRENCY_SETTINGS,
  formatBaseMoney,
  formatCompactAxisTick,
  formatCurrencyAmount,
  getLocaleForLanguage,
} from '../utils/currency';
import {
  BUILTIN_CATEGORY_I18N,
  CALENDAR_MON_FIRST_BY_LANG,
  formatExpectedIncomeText,
  MONTHS_BY_LANG,
  translate,
  TranslationKey,
  WEEKDAYS_SHORT_BY_LANG,
} from './translations';

const LANG_STORAGE_KEY = 'pf_language';

function readStoredLanguage(): LanguageCode {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    if (val === 'es' || val === 'en' || val === 'pt') return val;
  } catch {
    // ignore
  }
  return 'es';
}

interface I18nContextValue {
  lang: LanguageCode;
  setLang: (next: LanguageCode) => void;
  locale: string;
  currencySettings: CurrencySettings;
  months: Array<{ name: string; short: string; days: number }>;
  weekdaysShort: string[];
  calendarWeekdaysMonFirst: string[];
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatBase: (amountInBase: number, showSign?: boolean) => string;
  formatInCurrency: (amount: number, currency: CurrencyCode, showSign?: boolean) => string;
  convertDisplay: (amountInBase: number) => number;
  formatAxis: (valueInDisplay: number) => string;
  getCatLabel: (cat?: Pick<CategoryMeta, 'id' | 'label'> | null) => string;
  getCatShort: (cat?: Pick<CategoryMeta, 'id' | 'shortLabel'> | null) => string;
  getCatDesc: (cat?: Pick<CategoryMeta, 'id' | 'description'> | null) => string;
  formatPayday: (
    year: number,
    monthIndex: number,
    dayOfMonth: number,
    mode: IncomeDayMode,
    value: number,
    isCustom?: boolean,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{
  currencySettings?: CurrencySettings;
  children: React.ReactNode;
}> = ({ currencySettings = DEFAULT_CURRENCY_SETTINGS, children }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => readStoredLanguage());

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const locale = getLocaleForLanguage(lang);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      locale,
      currencySettings,
      months: MONTHS_BY_LANG[lang],
      weekdaysShort: WEEKDAYS_SHORT_BY_LANG[lang],
      calendarWeekdaysMonFirst: CALENDAR_MON_FIRST_BY_LANG[lang],
      t: (key, vars) => translate(lang, key, vars),
      formatBase: (amountInBase, showSign = false) =>
        formatBaseMoney(amountInBase, currencySettings, lang, showSign),
      formatInCurrency: (amount, currency, showSign = false) =>
        formatCurrencyAmount(amount, currency, locale, showSign),
      convertDisplay: (amountInBase) => convertBaseToDisplay(amountInBase, currencySettings),
      formatAxis: (valueInDisplay) =>
        formatCompactAxisTick(valueInDisplay, currencySettings.displayCurrency),
      getCatLabel: (cat) => {
        if (!cat) return '';
        const localized = BUILTIN_CATEGORY_I18N[cat.id]?.[lang];
        if (localized && cat.label === BUILTIN_CATEGORY_I18N[cat.id].es.label) {
          return localized.label;
        }
        return cat.label;
      },
      getCatShort: (cat) => {
        if (!cat) return '';
        const localized = BUILTIN_CATEGORY_I18N[cat.id]?.[lang];
        if (localized && cat.shortLabel === BUILTIN_CATEGORY_I18N[cat.id].es.shortLabel) {
          return localized.shortLabel;
        }
        return cat.shortLabel;
      },
      getCatDesc: (cat) => {
        if (!cat) return '';
        const localized = BUILTIN_CATEGORY_I18N[cat.id]?.[lang];
        if (localized && cat.description === BUILTIN_CATEGORY_I18N[cat.id].es.description) {
          return localized.description;
        }
        return cat.description;
      },
      formatPayday: (year, monthIndex, dayOfMonth, mode, val, isCustom = false) =>
        formatExpectedIncomeText(lang, year, monthIndex, dayOfMonth, mode, val, isCustom),
    }),
    [lang, setLang, locale, currencySettings],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
