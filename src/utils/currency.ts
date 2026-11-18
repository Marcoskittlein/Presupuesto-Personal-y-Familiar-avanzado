import { CurrencyCode, CurrencySettings, LanguageCode } from '../types/budget';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  defaultPerUsd: number;
  decimals: number;
  names: Record<LanguageCode, string>;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  {
    code: 'ARS',
    symbol: '$',
    defaultPerUsd: 1150,
    decimals: 0,
    names: {
      es: 'Peso argentino (ARS)',
      en: 'Argentine Peso (ARS)',
      pt: 'Peso argentino (ARS)',
    },
  },
  {
    code: 'USD',
    symbol: 'US$',
    defaultPerUsd: 1,
    decimals: 2,
    names: {
      es: 'Dólar estadounidense (USD)',
      en: 'US Dollar (USD)',
      pt: 'Dólar americano (USD)',
    },
  },
  {
    code: 'EUR',
    symbol: '€',
    defaultPerUsd: 0.92,
    decimals: 2,
    names: {
      es: 'Euro (EUR)',
      en: 'Euro (EUR)',
      pt: 'Euro (EUR)',
    },
  },
  {
    code: 'BRL',
    symbol: 'R$',
    defaultPerUsd: 5.75,
    decimals: 2,
    names: {
      es: 'Real brasileño (BRL)',
      en: 'Brazilian Real (BRL)',
      pt: 'Real brasileiro (BRL)',
    },
  },
  {
    code: 'UYU',
    symbol: '$U',
    defaultPerUsd: 42.5,
    decimals: 0,
    names: {
      es: 'Peso uruguayo (UYU)',
      en: 'Uruguayan Peso (UYU)',
      pt: 'Peso uruguaio (UYU)',
    },
  },
  {
    code: 'CLP',
    symbol: 'CLP$',
    defaultPerUsd: 970,
    decimals: 0,
    names: {
      es: 'Peso chileno (CLP)',
      en: 'Chilean Peso (CLP)',
      pt: 'Peso chileno (CLP)',
    },
  },
  {
    code: 'MXN',
    symbol: 'MX$',
    defaultPerUsd: 20.2,
    decimals: 2,
    names: {
      es: 'Peso mexicano (MXN)',
      en: 'Mexican Peso (MXN)',
      pt: 'Peso mexicano (MXN)',
    },
  },
];

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyMeta> = SUPPORTED_CURRENCIES.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<CurrencyCode, CurrencyMeta>,
);

export function getDefaultRatesForBase(base: CurrencyCode): Record<CurrencyCode, number> {
  const basePerUsd = CURRENCY_MAP[base]?.defaultPerUsd ?? 1;
  const rates = {} as Record<CurrencyCode, number>;
  for (const c of SUPPORTED_CURRENCIES) {
    if (c.code === base) {
      rates[c.code] = 1;
    } else {
      const raw = basePerUsd / c.defaultPerUsd;
      rates[c.code] = raw >= 10 ? Math.round(raw * 100) / 100 : Math.round(raw * 10000) / 10000;
    }
  }
  return rates;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: 'ARS',
  displayCurrency: 'ARS',
  ratesToBase: getDefaultRatesForBase('ARS'),
};

export function normalizeCurrencySettings(
  input?: Partial<CurrencySettings> | null,
): CurrencySettings {
  const base: CurrencyCode =
    input?.baseCurrency && CURRENCY_MAP[input.baseCurrency] ? input.baseCurrency : 'ARS';
  const display: CurrencyCode =
    input?.displayCurrency && CURRENCY_MAP[input.displayCurrency]
      ? input.displayCurrency
      : base;
  const defaults = getDefaultRatesForBase(base);
  const rates = { ...defaults };
  if (input?.ratesToBase) {
    for (const c of SUPPORTED_CURRENCIES) {
      const val = Number(input.ratesToBase[c.code]);
      if (Number.isFinite(val) && val > 0) {
        rates[c.code] = c.code === base ? 1 : val;
      }
    }
  }
  rates[base] = 1;
  return {
    baseCurrency: base,
    displayCurrency: display,
    ratesToBase: rates,
  };
}

export function convertBaseToDisplay(
  amountInBase: number,
  settings: CurrencySettings,
): number {
  if (settings.displayCurrency === settings.baseCurrency) return amountInBase;
  const rate = settings.ratesToBase[settings.displayCurrency] || 1;
  return amountInBase / rate;
}

export function convertBetweenCurrencies(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  settings: CurrencySettings,
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = fromCurrency === settings.baseCurrency ? 1 : settings.ratesToBase[fromCurrency] || 1;
  const toRate = toCurrency === settings.baseCurrency ? 1 : settings.ratesToBase[toCurrency] || 1;
  const inBase = amount * fromRate;
  return inBase / toRate;
}

export function getLocaleForLanguage(lang: LanguageCode): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'pt':
      return 'pt-BR';
    case 'es':
    default:
      return 'es-AR';
  }
}

export function formatCurrencyAmount(
  amount: number,
  currency: CurrencyCode,
  locale = 'es-AR',
  showSign = false,
): string {
  const meta = CURRENCY_MAP[currency] ?? CURRENCY_MAP.ARS;
  const absVal = Math.abs(amount);
  const maxFrac =
    meta.decimals === 0 ? 0 : absVal >= 1000 ? 0 : 2;
  const minFrac =
    meta.decimals === 0 ? 0 : absVal > 0 && absVal < 1000 && !Number.isInteger(absVal) ? 2 : 0;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  }).format(maxFrac === 0 ? Math.round(absVal) : absVal);

  const prefix = meta.symbol.length > 1 ? `${meta.symbol} ` : meta.symbol;
  if (amount < -0.0001) return `-${prefix}${formatted}`;
  if (showSign && amount > 0.0001) return `+${prefix}${formatted}`;
  return `${prefix}${formatted}`;
}

export function formatBaseMoney(
  amountInBase: number,
  settings: CurrencySettings,
  lang: LanguageCode = 'es',
  showSign = false,
): string {
  const converted = convertBaseToDisplay(amountInBase, settings);
  return formatCurrencyAmount(
    converted,
    settings.displayCurrency,
    getLocaleForLanguage(lang),
    showSign,
  );
}

export function formatCompactAxisTick(
  valueInDisplay: number,
  currency: CurrencyCode,
): string {
  const meta = CURRENCY_MAP[currency] ?? CURRENCY_MAP.ARS;
  const sym = meta.symbol.length > 1 ? `${meta.symbol}` : meta.symbol;
  const abs = Math.abs(valueInDisplay);
  if (abs >= 1_000_000) {
    return `${sym}${(valueInDisplay / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sym}${Math.round(valueInDisplay / 1_000)}k`;
  }
  return `${sym}${Math.round(valueInDisplay)}`;
}
