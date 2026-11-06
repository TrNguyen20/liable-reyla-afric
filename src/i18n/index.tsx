import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Locale, I18nContextValue } from './types';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_CHAIN, LOCALES_METADATA } from './config';

export type { Locale, Namespace, TranslationNamespace, I18nContextValue, LocaleMetadata } from './types';

// Import Vietnamese dictionaries
import viCommon from './locales/vi/common.json';
import viNav from './locales/vi/nav.json';
import viTracking from './locales/vi/tracking.json';
import viDashboard from './locales/vi/dashboard.json';
import viOrders from './locales/vi/orders.json';
import viSync from './locales/vi/sync.json';
import viTelemetry from './locales/vi/telemetry.json';

// Import English dictionaries
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enTracking from './locales/en/tracking.json';
import enDashboard from './locales/en/dashboard.json';
import enOrders from './locales/en/orders.json';
import enSync from './locales/en/sync.json';
import enTelemetry from './locales/en/telemetry.json';

// Import Japanese dictionaries
import jaCommon from './locales/ja/common.json';
import jaNav from './locales/ja/nav.json';
import jaTracking from './locales/ja/tracking.json';
import jaDashboard from './locales/ja/dashboard.json';
import jaOrders from './locales/ja/orders.json';
import jaSync from './locales/ja/sync.json';
import jaTelemetry from './locales/ja/telemetry.json';

const dictionaries: Record<Locale, Record<string, any>> = {
  vi: {
    common: viCommon,
    nav: viNav,
    tracking: viTracking,
    dashboard: viDashboard,
    orders: viOrders,
    sync: viSync,
    telemetry: viTelemetry,
  },
  en: {
    common: enCommon,
    nav: enNav,
    tracking: enTracking,
    dashboard: enDashboard,
    orders: enOrders,
    sync: enSync,
    telemetry: enTelemetry,
  },
  ja: {
    common: jaCommon,
    nav: jaNav,
    tracking: jaTracking,
    dashboard: jaDashboard,
    orders: jaOrders,
    sync: jaSync,
    telemetry: jaTelemetry,
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: any, path: string[]): string | undefined {
  let curr = obj;
  for (const part of path) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  if (typeof curr === 'string') return curr;
  if (curr != null && typeof curr === 'object' && typeof curr['default'] === 'string') {
    return curr['default'];
  }
  return undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    try {
      const match = document.cookie.match(/(?:^|;\s*)dynamo-locale=([^;]+)/);
      if (match && SUPPORTED_LOCALES.includes(match[1] as Locale)) {
        return match[1] as Locale;
      }
      const saved = localStorage.getItem('dynamo-locale') as Locale;
      if (saved && SUPPORTED_LOCALES.includes(saved)) {
        return saved;
      }
    } catch {}
    return DEFAULT_LOCALE;
  });

  const setLocale = useCallback((next: Locale) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('dynamo-locale', next);
        document.cookie = `dynamo-locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = next;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const parts = key.split('.');
      const lookupLocales = [locale, ...(FALLBACK_CHAIN[locale] || [])];

      let result: string | undefined;

      for (const loc of lookupLocales) {
        const dict = dictionaries[loc];
        if (!dict) continue;

        const commonDict = dict['common'];

        if (parts.length === 1) {
          result = getNestedValue(commonDict, [parts[0]!]);
          if (result === undefined && commonDict && typeof commonDict[key] === 'string') {
            result = commonDict[key];
          }
        } else {
          const [ns, ...rest] = parts;
          // 1. Registered top-level namespace lookup (dict[ns])
          if (ns && dict[ns]) {
            result = getNestedValue(dict[ns], rest as string[]);
            // Also check flat dot-notation key inside dict[ns]
            if (result === undefined && dict[ns]?.[rest.join('.')]) {
              const v = dict[ns][rest.join('.')];
              if (typeof v === 'string') result = v;
            }
          }

          // 2. Unregistered namespace lookup inside dict.common (e.g. ticket.fields.partNo, auth.hero.badge, pallet.title)
          if (result === undefined && commonDict) {
            result = getNestedValue(commonDict, parts);
          }

          // 3. Namespace is 'common' explicitly (e.g. common.loading.permissions)
          if (result === undefined && ns === 'common' && commonDict) {
            result = getNestedValue(commonDict, rest as string[]);
          }

          // 4. Flat key lookups in common
          if (result === undefined && commonDict) {
            if (typeof commonDict[key] === 'string') {
              result = commonDict[key];
            } else if (typeof commonDict[parts.join('.')] === 'string') {
              result = commonDict[parts.join('.')];
            } else if (ns === 'common' && typeof commonDict[rest.join('.')] === 'string') {
              result = commonDict[rest.join('.')];
            }
          }
        }

        if (result !== undefined) break;
      }

      if (result === undefined) {
        result = key; // Fallback to raw key
      }

      if (params && typeof result === 'string') {
        for (const [pKey, pVal] of Object.entries(params)) {
          const escapedKey = pKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = result.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), () => String(pVal));
        }
      }

      return result;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      locales: LOCALES_METADATA,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback nếu gọi ngoài Provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (k: string) => k,
      locales: LOCALES_METADATA,
    };
  }
  return ctx;
}
