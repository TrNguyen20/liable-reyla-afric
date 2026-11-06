import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Adversarial Review: Key Resolution Audit across all JSX components', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const localesDir = path.join(rootDir, 'src/i18n/locales');
  const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];
  const locales = ['vi', 'en', 'ja'];

  const dictionaries = {};
  for (const loc of locales) {
    dictionaries[loc] = {};
    for (const ns of namespaces) {
      const filePath = path.join(localesDir, loc, `${ns}.json`);
      dictionaries[loc][ns] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  function getNestedValue(obj, pathArr) {
    let curr = obj;
    for (const part of pathArr) {
      if (curr == null || typeof curr !== 'object') return undefined;
      curr = curr[part];
    }
    return typeof curr === 'string' ? curr : undefined;
  }

  function resolveT(key, locale = 'vi') {
    const parts = key.split('.');
    const dict = dictionaries[locale];
    if (!dict) return key;

    let result;
    if (parts.length === 1) {
      result = getNestedValue(dict.common, [parts[0]]);
    } else {
      const [ns, ...rest] = parts;
      result = getNestedValue(dict[ns], rest);
    }
    return result !== undefined ? result : key;
  }

  it('ADV-01: login.tsx t() keys must resolve to translated strings and not raw keys', () => {
    const loginTsx = fs.readFileSync(path.join(rootDir, 'src/routes/login.tsx'), 'utf-8');
    const tRegex = /t\(\s*['"]([^'"]+)['"]/g;
    const missing = [];
    let match;
    while ((match = tRegex.exec(loginTsx)) !== null) {
      const key = match[1];
      if (key.includes('${')) continue;
      for (const loc of locales) {
        if (resolveT(key, loc) === key) {
          missing.push(`[${loc}] ${key}`);
        }
      }
    }
    expect(missing, `login.tsx has ${missing.length} unresolvable t() keys returning raw strings:\n${missing.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('ADV-02: job-ticket.tsx t() keys must resolve to translated strings and not raw keys', () => {
    const ticketTsx = fs.readFileSync(path.join(rootDir, 'src/components/job-ticket.tsx'), 'utf-8');
    const tRegex = /t\(\s*['"]([^'"]+)['"]/g;
    const missing = [];
    let match;
    while ((match = tRegex.exec(ticketTsx)) !== null) {
      const key = match[1];
      if (key.includes('${')) continue;
      for (const loc of locales) {
        if (resolveT(key, loc) === key) {
          missing.push(`[${loc}] ${key}`);
        }
      }
    }
    expect(missing, `job-ticket.tsx has ${missing.length} unresolvable t() keys returning raw strings:\n${missing.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('ADV-03: orders.tsx t() keys must resolve to translated strings and not raw keys', () => {
    const ordersTsx = fs.readFileSync(path.join(rootDir, 'src/routes/orders.tsx'), 'utf-8');
    const tRegex = /t\(\s*['"]([^'"]+)['"]/g;
    const missing = [];
    let match;
    while ((match = tRegex.exec(ordersTsx)) !== null) {
      const key = match[1];
      if (key.includes('${')) continue;
      for (const loc of locales) {
        if (resolveT(key, loc) === key) {
          missing.push(`[${loc}] ${key}`);
        }
      }
    }
    expect(missing, `orders.tsx has ${missing.length} unresolvable t() keys returning raw strings:\n${missing.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('ADV-04: tracking.tsx t() keys must resolve to translated strings and not raw keys', () => {
    const trackingTsx = fs.readFileSync(path.join(rootDir, 'src/routes/tracking.tsx'), 'utf-8');
    const tRegex = /t\(\s*['"]([^'"]+)['"]/g;
    const missing = [];
    let match;
    while ((match = tRegex.exec(trackingTsx)) !== null) {
      const key = match[1];
      if (key.includes('${')) continue;
      for (const loc of locales) {
        if (resolveT(key, loc) === key) {
          missing.push(`[${loc}] ${key}`);
        }
      }
    }
    expect(missing, `tracking.tsx has ${missing.length} unresolvable t() keys returning raw strings:\n${missing.slice(0, 10).join('\n')}`).toEqual([]);
  });
});
