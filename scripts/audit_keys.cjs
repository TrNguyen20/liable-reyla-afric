const fs = require('fs');
const path = require('path');

const localesDir = path.resolve('src/i18n/locales');
const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];
const locales = ['vi', 'en', 'ja'];

const dictionaries = {};
for (const loc of locales) {
  dictionaries[loc] = {};
  for (const ns of namespaces) {
    dictionaries[loc][ns] = JSON.parse(fs.readFileSync(path.join(localesDir, loc, `${ns}.json`), 'utf-8'));
  }
}

function getNestedValue(obj, pathArr) {
  let curr = obj;
  for (const part of pathArr) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  if (typeof curr === 'string') return curr;
  if (curr != null && typeof curr === 'object' && typeof curr['default'] === 'string') {
    return curr['default'];
  }
  return undefined;
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
    if (dict[ns]) {
      result = getNestedValue(dict[ns], rest);
      if (result === undefined && typeof dict[ns][rest.join('.')] === 'string') {
        result = dict[ns][rest.join('.')];
      }
    }
    if (result === undefined && dict.common) {
      result = getNestedValue(dict.common, parts);
    }
    if (result === undefined && ns === 'common' && dict.common) {
      result = getNestedValue(dict.common, rest);
    }
    if (result === undefined && dict.common && dict.common[key]) {
      result = typeof dict.common[key] === 'string' ? dict.common[key] : undefined;
    }
  }
  return result !== undefined ? result : key;
}

// Also scan all .tsx and .ts in src (excluding test, locales, node_modules)
function scanDir(dir) {
  let results = [];
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
}

const sourceFiles = scanDir(path.resolve('src'));
const tRegex = /(?:[^a-zA-Z0-9_]|^)t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;

console.log('=== ENHANCED RESOLVER AUDIT ===');
const missingByFile = {};
let totalMissingOccurrences = 0;
const allMissingKeys = new Set();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  const relFile = path.relative(process.cwd(), file);
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    if (key.includes('${') || key.length <= 1) continue;
    let fails = [];
    for (const loc of locales) {
      if (resolveT(key, loc) === key) {
        fails.push(loc);
      }
    }
    if (fails.length > 0) {
      if (!missingByFile[relFile]) missingByFile[relFile] = [];
      missingByFile[relFile].push({ key, fails });
      allMissingKeys.add(key);
      totalMissingOccurrences++;
    }
  }
}

for (const [file, items] of Object.entries(missingByFile)) {
  console.log(`\n${file} (${items.length} occurrences):`);
  const uniqueInFile = [...new Set(items.map(i => i.key))];
  console.log(`  Unique missing keys (${uniqueInFile.length}):`);
  for (const k of uniqueInFile) {
    console.log(`    - "${k}"`);
  }
}

console.log('\n========================================');
console.log(`Total missing occurrences: ${totalMissingOccurrences}`);
console.log(`Total unique missing keys: ${allMissingKeys.size}`);
console.log('========================================');
