import type { Locale, LocaleMetadata } from './types';

export const SUPPORTED_LOCALES: Locale[] = ['vi', 'en', 'ja'];

export const DEFAULT_LOCALE: Locale = 'vi';

export const FALLBACK_CHAIN: Record<Locale, Locale[]> = {
  ja: ['en', 'vi'],
  en: ['vi'],
  vi: [],
};

export const LOCALES_METADATA: LocaleMetadata[] = [
  {
    code: 'vi',
    label: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    shortLabel: 'VI',
  },
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    shortLabel: 'EN',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    shortLabel: 'JA',
  },
];
