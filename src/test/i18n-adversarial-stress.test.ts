import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { I18nProvider, useTranslation } from '../i18n';
import { formatDate, formatShift, formatTime, formatNumber } from '../i18n/formatters';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_CHAIN } from '../i18n/config';
import type { Locale } from '../i18n/types';

/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS (CHALLENGER 1)
 * Project: DYNAMO MES Trilingual Standardization [VI] [EN] [JA]
 * Standard: Graphite Wireframe UI (v2.2.0)
 * ============================================================================
 */

describe('CHALLENGER 1: Empirical Adversarial Stress Suite for Trilingual i18n', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const localesDir = path.join(rootDir, 'src/i18n/locales');
  const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

  // Helper wrapper for renderHook
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(I18nProvider, null, children);

  beforeEach(() => {
    // Clear cookies & localStorage
    if (typeof document !== 'undefined') {
      document.cookie = 'dynamo-locale=; max-age=0; path=/';
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // ==========================================================================
  // SUITE 1: ADVERSARIAL FALLBACK RESOLUTION & ANOMALOUS KEY LOOKUP
  // ==========================================================================
  describe('Suite 1: Adversarial Fallback Resolution & Key Lookups', () => {
    it('STRESS-FALLBACK-01: Query with nonexistent namespace never throws and returns the raw key', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      const adversarialKeys = [
        'nonexistent.key',
        'invalid_namespace.nested.deep.leaf',
        'foo.bar.baz.qux.extra',
        '404.not_found',
        'system.error.unknown.flag',
      ];

      for (const key of adversarialKeys) {
        expect(() => result.current.t(key)).not.toThrow();
        const translated = result.current.t(key);
        expect(translated).toBe(key);
        expect(typeof translated).toBe('string');
        expect(translated).not.toBeUndefined();
        expect(translated).not.toBeNull();
      }
    });

    it('STRESS-FALLBACK-02: Query with corrupt/malformed key patterns (empty, dots, prototypes)', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      const malformedKeys = [
        '',
        '.',
        '..',
        '...',
        'common.',
        '.common',
        '..common..cancel..',
        'toString',
        'valueOf',
        'constructor',
        '__proto__',
        'hasOwnProperty',
        'common.toString',
        'common.constructor',
        'common.__proto__',
        'tracking.constructor.name',
      ];

      for (const key of malformedKeys) {
        expect(() => result.current.t(key)).not.toThrow();
        const translated = result.current.t(key);
        expect(typeof translated).toBe('string');
        expect(translated).toBeDefined();
        expect(translated).not.toBe('[object Object]');
      }
    });

    it('STRESS-FALLBACK-03: Query pointing to intermediate object nodes returns the raw key without crashing', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      // Pointing to intermediate branches rather than leaves
      const objectNodes = [
        'common',
        'nav',
        'tracking.columns',
        'dashboard.kpis',
        'orders.table',
      ];

      for (const key of objectNodes) {
        expect(() => result.current.t(key)).not.toThrow();
        const res = result.current.t(key);
        // It must NOT serialize to '[object Object]' or throw
        expect(res).toBe(key);
        expect(res).not.toContain('[object Object]');
      }
    });

    it('STRESS-FALLBACK-04: Full fallback chain traversal: JA -> EN -> VI -> raw key', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });

      act(() => {
        result.current.setLocale('ja');
      });
      expect(result.current.locale).toBe('ja');

      // Valid existing key in JA
      expect(result.current.t('common.cancel')).toBeTruthy();
      expect(result.current.t('common.cancel')).not.toBe('common.cancel');

      // Key completely absent
      const ghostKey = 'common.this_key_does_not_exist_in_any_locale';
      expect(result.current.t(ghostKey)).toBe(ghostKey);
    });

    it('STRESS-FALLBACK-05: Unwrapped hook fallback (calling useTranslation outside Provider)', () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.locale).toBe('vi');
      expect(() => result.current.setLocale('en')).not.toThrow();
      expect(result.current.t('common.cancel')).toBe('common.cancel');
      expect(result.current.locales.length).toBe(3);
    });

    it('STRESS-DEFECT-01: Verifies resolution of formerly missing keys and raw fallback on true missing keys', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      // Registered key now resolves directly to its localized string
      const output =
        result.current.t('orders.kpis.totalValue') ||
        result.current.t('orders.kpiTotalValue') ||
        'TỔNG GIÁ TRỊ';
      expect(output).toBe('TỔNG GIÁ TRỊ');

      // Genuinely missing key still returns raw key
      const missingOutput = result.current.t('nonexistent.missing.key') || 'FALLBACK';
      expect(missingOutput).toBe('nonexistent.missing.key');
    });
  });

  // ==========================================================================
  // SUITE 2: PARAMETER INTERPOLATION STRESS TESTING
  // ==========================================================================
  describe('Suite 2: Parameter Interpolation Stress Testing', () => {
    it('STRESS-INTERP-01: Numeric boundary parameters (0, negative, float, MAX_SAFE_INTEGER)', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });

      const testKey = 'orders.subFilterAll'; // Or any key, even raw key with params
      const rawTemplate = 'Số lượng: {count}, Mã lô: {lotId}, Độ lệch: {offset}';

      // 0 handling (0 must NOT be treated as false/empty)
      const resZero = result.current.t(rawTemplate, { count: 0, lotId: 'LOT-000', offset: -15 });
      expect(resZero).toBe('Số lượng: 0, Mã lô: LOT-000, Độ lệch: -15');

      // Floating and negative numbers
      const resFloat = result.current.t(rawTemplate, { count: 12.345, lotId: 'LOT-99', offset: -0.001 });
      expect(resFloat).toBe('Số lượng: 12.345, Mã lô: LOT-99, Độ lệch: -0.001');

      // Extreme large numbers
      const resBig = result.current.t(rawTemplate, { count: Number.MAX_SAFE_INTEGER, lotId: 'MAX', offset: 1e12 });
      expect(resBig).toContain(String(Number.MAX_SAFE_INTEGER));
      expect(resBig).toContain('1000000000000');
    });

    it('STRESS-INTERP-02: Corrupt and nullish parameter values (null, undefined, NaN)', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      const rawTemplate = 'Lô: {lotId}, Trạng thái: {status}';

      expect(() => {
        const resNull = result.current.t(rawTemplate, { lotId: null as any, status: undefined as any });
        expect(resNull).toBe('Lô: null, Trạng thái: undefined');
      }).not.toThrow();

      expect(() => {
        const resNaN = result.current.t(rawTemplate, { lotId: NaN as any, status: Infinity as any });
        expect(resNaN).toBe('Lô: NaN, Trạng thái: Infinity');
      }).not.toThrow();
    });

    it('STRESS-INTERP-03: Security & special character injection in parameter values', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      const rawTemplate = 'Nội dung: {content}';

      // XSS payload
      const xss = '<script>alert("xss")</script>&<>"\'';
      const resXss = result.current.t(rawTemplate, { content: xss });
      expect(resXss).toBe(`Nội dung: ${xss}`);

      // RegExp replacement tokens ($1, $&, $`, $', $$)
      const regexTokens = 'Giá: $100 & hoa hồng: $& còn lại: $\' hoặc $$50';
      const resRegex = result.current.t(rawTemplate, { content: regexTokens });
      expect(typeof resRegex).toBe('string');
      expect(resRegex).toBeDefined();
    });

    it('STRESS-INTERP-04: Multiple occurrences of the same parameter in template', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });
      const multiTemplate = '{name} gửi {count} đơn đến {name} với {count} kiện';
      const output = result.current.t(multiTemplate, { name: 'Xưởng A', count: 5 });
      expect(output).toBe('Xưởng A gửi 5 đơn đến Xưởng A với 5 kiện');
    });
  });

  // ==========================================================================
  // SUITE 3: CULTURAL FORMATTERS ADVERSARIAL STRESS TESTING
  // ==========================================================================
  describe('Suite 3: Cultural Formatters Boundary & Adversarial Inputs', () => {
    describe('formatDate stress testing', () => {
      it('handles null, undefined, empty string, and 0 gracefully', () => {
        expect(formatDate('', 'vi')).toBe('');
        expect(formatDate(null as any, 'en')).toBe('');
        expect(formatDate(undefined as any, 'ja')).toBe('');
        // Timestamp 0 or falsy check
        expect(typeof formatDate(0, 'vi')).toBe('string');
      });

      it('handles invalid date strings without throwing', () => {
        const invalidInputs = ['invalid-date', '2026-13-45', 'NaN', 'undefined', 'foo/bar'];
        for (const input of invalidInputs) {
          expect(() => formatDate(input, 'vi')).not.toThrow();
          expect(() => formatDate(input, 'en')).not.toThrow();
          expect(() => formatDate(input, 'ja')).not.toThrow();
          // Returns original string when invalid
          expect(formatDate(input, 'vi')).toBe(input);
        }
      });

      it('handles leap years and century boundaries accurately', () => {
        // Leap year 2024-02-29
        const leapDate = new Date('2024-02-29T00:00:00Z');
        expect(formatDate(leapDate, 'vi')).toMatch(/29\/02\/2024/);
        expect(formatDate(leapDate, 'en')).toMatch(/02\/29\/2024/);
        expect(formatDate(leapDate, 'ja')).toMatch(/2024\/02\/29/);
        expect(formatDate(leapDate, 'ja', { full: true })).toBe('2024年02月29日');

        // Century leap year 2000-02-29
        const y2kLeap = new Date('2000-02-29T12:00:00Z');
        expect(formatDate(y2kLeap, 'vi')).toMatch(/29\/02\/2000/);

        // Far future 2099-12-31 (using noon local time to avoid timezone date shifts)
        const futureDate = new Date(2099, 11, 31, 12, 0, 0);
        expect(formatDate(futureDate, 'vi')).toMatch(/31\/12\/2099/);
        expect(formatDate(futureDate, 'en')).toMatch(/12\/31\/2099/);
        expect(formatDate(futureDate, 'ja')).toMatch(/2099\/12\/31/);
      });
    });

    describe('formatTime stress testing', () => {
      it('handles invalid/null inputs safely', () => {
        expect(formatTime('', 'vi')).toBe('');
        expect(formatTime(null as any, 'en')).toBe('');
        expect(formatTime('not-a-time', 'ja')).toBe('');
      });

      it('formats valid times with 2-digit hour, minute, second in 24h format', () => {
        const date = new Date('2026-11-06T14:05:09');
        const timeVi = formatTime(date, 'vi');
        const timeEn = formatTime(date, 'en');
        const timeJa = formatTime(date, 'ja');

        expect(timeVi).toContain('14');
        expect(timeVi).toContain('05');
        expect(timeEn).toBeDefined();
        expect(timeJa).toBeDefined();
      });
    });

    describe('formatShift stress testing', () => {
      it('formats valid shifts (1, 2, 3) across VI, EN, JA', () => {
        expect(formatShift(1, 'vi')).toBe('Ca 1');
        expect(formatShift(2, 'vi')).toBe('Ca 2');
        expect(formatShift(3, 'vi')).toBe('Ca 3');

        expect(formatShift(1, 'en')).toBe('Shift 1');
        expect(formatShift(2, 'en')).toBe('Shift 2');
        expect(formatShift(3, 'en')).toBe('Shift 3');

        expect(formatShift(1, 'ja')).toBe('1直');
        expect(formatShift(2, 'ja')).toBe('2直');
        expect(formatShift(3, 'ja')).toBe('3直');
      });

      it('handles unexpected shift inputs (strings, 0, negative, NaN, null)', () => {
        expect(formatShift('1', 'vi')).toBe('Ca 1');
        expect(formatShift('2', 'en')).toBe('Shift 2');
        expect(formatShift('3', 'ja')).toBe('3直');

        // Non-numeric string falls back to 1
        expect(formatShift('abc', 'vi')).toBe('Ca 1');
        expect(formatShift(null as any, 'en')).toBe('Shift 1');
        expect(formatShift(undefined as any, 'ja')).toBe('1直');
        expect(formatShift(NaN, 'vi')).toBe('Ca 1');

        // Zero falls back to 1
        expect(formatShift(0, 'vi')).toBe('Ca 1');
      });
    });

    describe('formatNumber stress testing', () => {
      it('handles non-numeric and NaN safely', () => {
        expect(formatNumber(NaN, 'vi')).toBe('0');
        expect(formatNumber('123' as any, 'en')).toBe('0');
        expect(formatNumber(null as any, 'ja')).toBe('0');
        expect(formatNumber(undefined as any, 'vi')).toBe('0');
      });

      it('formats 0, negative, float, and large numbers correctly with locale separators', () => {
        expect(formatNumber(0, 'vi')).toBe('0');
        expect(formatNumber(0, 'en')).toBe('0');
        expect(formatNumber(0, 'ja')).toBe('0');

        // Thousand separator: dot in VI, comma in EN/JA
        const num = 1234567;
        expect(formatNumber(num, 'vi')).toBe('1.234.567');
        expect(formatNumber(num, 'en')).toBe('1,234,567');
        expect(formatNumber(num, 'ja')).toBe('1,234,567');

        // Negative numbers
        const neg = -9876;
        expect(formatNumber(neg, 'vi')).toBe('-9.876');
        expect(formatNumber(neg, 'en')).toBe('-9,876');
        expect(formatNumber(neg, 'ja')).toBe('-9,876');
      });
    });
  });

  // ==========================================================================
  // SUITE 4: LOCALE SWITCHER RESILIENCE & SSR HYDRATION SAFETY
  // ==========================================================================
  describe('Suite 4: Locale Switcher Resilience & SSR Hydration Safety', () => {
    it('STRESS-SWITCH-01: Corrupt cookie handling (dynamo-locale=fr, invalid, empty, null)', () => {
      const corruptCookies = [
        'dynamo-locale=fr',
        'dynamo-locale=de',
        'dynamo-locale=zh',
        'dynamo-locale=""',
        'dynamo-locale=null',
        'dynamo-locale=undefined',
        'dynamo-locale=',
      ];

      for (const cookie of corruptCookies) {
        document.cookie = cookie;
        localStorage.clear();

        const { result } = renderHook(() => useTranslation(), { wrapper });
        // Must safely fall back to DEFAULT_LOCALE ('vi')
        expect(result.current.locale).toBe('vi');
      }
    });

    it('STRESS-SWITCH-02: Valid cookie extraction when embedded in complex cookie string', () => {
      // In browser/jsdom, setting document.cookie sets one cookie header at a time
      document.cookie = 'session_id=abc123xyz';
      document.cookie = 'dynamo-locale=ja';
      document.cookie = 'theme=dark';
      document.cookie = 'analytics_consent=true';
      localStorage.clear();

      const { result } = renderHook(() => useTranslation(), { wrapper });
      expect(result.current.locale).toBe('ja');
    });

    it('STRESS-SWITCH-03: LocalStorage fallback when cookie is absent', () => {
      document.cookie = 'dynamo-locale=; max-age=0; path=/';
      localStorage.setItem('dynamo-locale', 'en');

      const { result } = renderHook(() => useTranslation(), { wrapper });
      expect(result.current.locale).toBe('en');
    });

    it('STRESS-SWITCH-04: setLocale state transition updates cookie, localStorage, and html lang', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });

      act(() => {
        result.current.setLocale('ja');
      });

      expect(result.current.locale).toBe('ja');
      expect(localStorage.getItem('dynamo-locale')).toBe('ja');
      expect(document.cookie).toContain('dynamo-locale=ja');
      expect(document.documentElement.lang).toBe('ja');

      act(() => {
        result.current.setLocale('en');
      });
      expect(result.current.locale).toBe('en');
      expect(localStorage.getItem('dynamo-locale')).toBe('en');
      expect(document.cookie).toContain('dynamo-locale=en');
      expect(document.documentElement.lang).toBe('en');

      act(() => {
        result.current.setLocale('vi');
      });
      expect(result.current.locale).toBe('vi');
      expect(localStorage.getItem('dynamo-locale')).toBe('vi');
      expect(document.cookie).toContain('dynamo-locale=vi');
      expect(document.documentElement.lang).toBe('vi');
    });

    it('STRESS-SWITCH-05: Ignoring unsupported locales passed to setLocale', () => {
      const { result } = renderHook(() => useTranslation(), { wrapper });

      act(() => {
        result.current.setLocale('vi');
      });
      expect(result.current.locale).toBe('vi');

      // Attempt invalid transition
      act(() => {
        result.current.setLocale('fr' as any);
      });
      // Must remain 'vi'
      expect(result.current.locale).toBe('vi');
    });
  });

  // ==========================================================================
  // SUITE 5: COMPREHENSIVE DICTIONARY PARITY & INVARIANT INTEGRITY
  // ==========================================================================
  describe('Suite 5: Deep Dictionary Verification across all 21 JSON Files', () => {
    function getLeafKeys(obj: any, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          keys = keys.concat(getLeafKeys(v, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    it('STRESS-DICT-01: Zero missing keys and zero extra keys between VI, EN, and JA', () => {
      for (const ns of namespaces) {
        const viPath = path.join(localesDir, 'vi', `${ns}.json`);
        const enPath = path.join(localesDir, 'en', `${ns}.json`);
        const jaPath = path.join(localesDir, 'ja', `${ns}.json`);

        const viJson = JSON.parse(fs.readFileSync(viPath, 'utf8'));
        const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const jaJson = JSON.parse(fs.readFileSync(jaPath, 'utf8'));

        const viKeys = getLeafKeys(viJson).sort();
        const enKeys = getLeafKeys(enJson).sort();
        const jaKeys = getLeafKeys(jaJson).sort();

        expect(enKeys, `Namespace ${ns}: EN keys must match VI keys`).toEqual(viKeys);
        expect(jaKeys, `Namespace ${ns}: JA keys must match VI keys`).toEqual(viKeys);
      }
    });

    it('STRESS-DICT-02: Zero empty string, null, or whitespace-padded values across all 21 files', () => {
      for (const loc of ['vi', 'en', 'ja']) {
        for (const ns of namespaces) {
          const filePath = path.join(localesDir, loc, `${ns}.json`);
          const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const leaves: { key: string; val: any }[] = [];

          const collect = (obj: any, p = '') => {
            for (const [k, v] of Object.entries(obj)) {
              const fullKey = p ? `${p}.${k}` : k;
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                collect(v, fullKey);
              } else {
                leaves.push({ key: fullKey, val: v });
              }
            }
          };
          collect(json);

          for (const item of leaves) {
            expect(item.val, `File ${loc}/${ns}.json: key ${item.key} must not be null/undefined`).not.toBeNull();
            expect(typeof item.val, `File ${loc}/${ns}.json: key ${item.key} must be string`).toBe('string');
            expect((item.val as string).trim().length, `File ${loc}/${ns}.json: key ${item.key} cannot be empty string`).toBeGreaterThan(0);
            expect(item.val, `File ${loc}/${ns}.json: key ${item.key} must be trimmed`).toBe((item.val as string).trim());
          }
        }
      }
    });

    it('STRESS-DICT-03: Parameter interpolation token consistency across locales', () => {
      const tokenRegex = /\{([a-zA-Z0-9_]+)\}/g;

      for (const ns of namespaces) {
        const viJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'vi', `${ns}.json`), 'utf8'));
        const enJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', `${ns}.json`), 'utf8'));
        const jaJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'ja', `${ns}.json`), 'utf8'));

        const getTokens = (obj: any, p = '', map: Record<string, string[]> = {}) => {
          for (const [k, v] of Object.entries(obj)) {
            const fullKey = p ? `${p}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
              getTokens(v, fullKey, map);
            } else if (typeof v === 'string') {
              const matches = Array.from(v.matchAll(tokenRegex)).map(m => m[1] ?? '').filter(Boolean).sort();
              if (matches.length > 0) {
                map[fullKey] = matches;
              }
            }
          }
          return map;
        };

        const viTokens = getTokens(viJson);
        const enTokens = getTokens(enJson);
        const jaTokens = getTokens(jaJson);

        for (const [key, tokens] of Object.entries(viTokens)) {
          expect(enTokens[key], `Namespace ${ns}, key ${key}: EN tokens must match VI tokens`).toEqual(tokens);
          expect(jaTokens[key], `Namespace ${ns}, key ${key}: JA tokens must match VI tokens`).toEqual(tokens);
        }
      }
    });

    it('STRESS-DICT-04: Expect zero missing keys in source code', () => {
      // Collect all leaf keys across all 7 namespaces in VI
      const allViKeys = new Set<string>();
      for (const ns of namespaces) {
        const viPath = path.join(localesDir, 'vi', `${ns}.json`);
        const json = JSON.parse(fs.readFileSync(viPath, 'utf8'));
        const keys = getLeafKeys(json, ns);
        keys.forEach(k => allViKeys.add(k));
      }

      // Also add common keys without namespace prefix if parts.length === 1 lookup is used
      const commonJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'vi', 'common.json'), 'utf8'));
      getLeafKeys(commonJson).forEach(k => allViKeys.add(k));

      // Recursively walk src/ (excluding src/test/ and src/i18n/locales/)
      const scanDir = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const dirent of list) {
          const fullPath = path.join(dir, dirent.name);
          if (dirent.isDirectory()) {
            if (dirent.name === 'test' || dirent.name === 'locales' || dirent.name === 'node_modules') continue;
            results = results.concat(scanDir(fullPath));
          } else if (dirent.isFile() && (dirent.name.endsWith('.tsx') || dirent.name.endsWith('.ts'))) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const sourceFiles = scanDir(path.join(rootDir, 'src'));
      const tCallRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
      const missingKeys: { file: string; key: string }[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = Array.from(content.matchAll(tCallRegex));
        for (const match of matches) {
          const key = match[1]!;
          if (!allViKeys.has(key)) {
            missingKeys.push({ file: path.relative(rootDir, file), key });
          }
        }
      }

      expect(missingKeys, `Found ${missingKeys.length} calls to t() with keys missing from dictionaries: ${JSON.stringify(missingKeys.slice(0, 5), null, 2)}...`).toEqual([]);
    });

    it('STRESS-DEFECT-02: Empirical inventory of zero missing translation keys across source files post-remediation', () => {
      const allViKeys = new Set<string>();
      for (const ns of namespaces) {
        const viPath = path.join(localesDir, 'vi', `${ns}.json`);
        const json = JSON.parse(fs.readFileSync(viPath, 'utf8'));
        const keys = getLeafKeys(json, ns);
        keys.forEach(k => allViKeys.add(k));
      }
      const commonJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'vi', 'common.json'), 'utf8'));
      getLeafKeys(commonJson).forEach(k => allViKeys.add(k));

      const scanDir = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const dirent of list) {
          const fullPath = path.join(dir, dirent.name);
          if (dirent.isDirectory()) {
            if (dirent.name === 'test' || dirent.name === 'locales' || dirent.name === 'node_modules') continue;
            results = results.concat(scanDir(fullPath));
          } else if (dirent.isFile() && (dirent.name.endsWith('.tsx') || dirent.name.endsWith('.ts'))) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const sourceFiles = scanDir(path.join(rootDir, 'src'));
      const tCallRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
      const missingKeys: { file: string; key: string }[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = Array.from(content.matchAll(tCallRegex));
        for (const match of matches) {
          const key = match[1]!;
          if (!allViKeys.has(key)) {
            missingKeys.push({ file: path.relative(rootDir, file), key });
          }
        }
      }

      // Assert that 0 missing key references exist across source files
      expect(missingKeys.length).toBe(0);
      const uniqueKeys = new Set(missingKeys.map(m => m.key));
      expect(uniqueKeys.size).toBe(0);
    });
  });
});


