const fs = require('fs');
const path = require('path');

const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];
const locales = ['vi', 'en', 'ja'];

const dictionaries = {};
for (const loc of locales) {
  dictionaries[loc] = {};
  for (const ns of namespaces) {
    const filePath = path.join('src/i18n/locales', loc, ns + '.json');
    dictionaries[loc][ns] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

function getNestedValue(obj, path) {
  let curr = obj;
  for (const part of path) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return typeof curr === 'string' ? curr : undefined;
}

const FALLBACK_CHAIN = {
  vi: [],
  en: ['vi'],
  ja: ['en', 'vi'],
};

function t(key, locale = 'vi') {
  const parts = key.split('.');
  const lookupLocales = [locale, ...(FALLBACK_CHAIN[locale] || [])];

  let result;
  for (const loc of lookupLocales) {
    const dict = dictionaries[loc];
    if (!dict) continue;

    if (parts.length === 1) {
      result = getNestedValue(dict.common, [parts[0]]);
    } else {
      const [ns, ...rest] = parts;
      result = getNestedValue(dict[ns], rest);
    }

    if (result !== undefined) break;
  }

  if (result === undefined) {
    result = key; // Fallback to raw key
  }
  return result;
}

// Find all source files
function getSourceFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'test' && file !== 'locales' && !file.includes('.agents')) {
        results.push(...getSourceFiles(full));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = getSourceFiles('src');
// Match t('...') and t("...") specifically as function calls
const tCallRegex = /(?:[^a-zA-Z0-9_]|^)t\(\s*['"]([^'"]+)['"]/g;

const missingKeyMap = new Map();

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    // ignore dynamic templates or non-keys
    if (key.includes('${') || key.length <= 1) continue;

    const val = t(key, 'vi');
    if (val === key) {
      const relFile = path.relative(process.cwd(), file);
      if (!missingKeyMap.has(key)) {
        missingKeyMap.set(key, new Set());
      }
      missingKeyMap.get(key).add(relFile);
    }
  }
}

console.log(`TOTAL DISTINCT MISSING KEYS CALLED VIA t(): ${missingKeyMap.size}\n`);
for (const [key, files] of missingKeyMap.entries()) {
  console.log(`Key: "${key}" -> Used in: ${Array.from(files).join(', ')}`);
}
