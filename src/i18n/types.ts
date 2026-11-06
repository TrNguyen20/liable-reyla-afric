export type Locale = 'vi' | 'en' | 'ja';

export type TranslationNamespace =
  | 'common'
  | 'nav'
  | 'tracking'
  | 'dashboard'
  | 'orders'
  | 'sync'
  | 'telemetry';

export type Namespace = TranslationNamespace;

export interface LocaleMetadata {
  code: Locale;
  label: string;
  nativeName: string;
  flag: string;
  shortLabel: string;
}

export type TranslationDict = Record<string, string | Record<string, any>>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: LocaleMetadata[];
}
