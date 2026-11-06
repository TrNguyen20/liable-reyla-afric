const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
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
  if (typeof curr === 'string') return curr;
  if (curr != null && typeof curr === 'object' && typeof curr['default'] === 'string') {
    return curr['default'];
  }
  return undefined;
}

// Exactly mirror the enhanced t() function from src/i18n/index.tsx lines 114-170
function actualT(key, locale) {
  const parts = key.split('.');
  const dict = dictionaries[locale];
  if (!dict) return key;

  const commonDict = dict['common'];
  let result;

  if (parts.length === 1) {
    result = getNestedValue(commonDict, [parts[0]]);
    if (result === undefined && commonDict && typeof commonDict[key] === 'string') {
      result = commonDict[key];
    }
  } else {
    const [ns, ...rest] = parts;
    // 1. Registered top-level namespace lookup (dict[ns])
    if (ns && dict[ns]) {
      result = getNestedValue(dict[ns], rest);
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
      result = getNestedValue(commonDict, rest);
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

  return result !== undefined ? result : key;
}

const targets = [
  { name: 'login.tsx', path: 'src/routes/login.tsx' },
  { name: 'job-ticket.tsx', path: 'src/components/job-ticket.tsx' },
  { name: 'tracking.tsx', path: 'src/routes/tracking.tsx' },
  { name: 'dashboard.tsx', path: 'src/routes/dashboard.tsx' },
  { name: 'orders.tsx', path: 'src/routes/orders.tsx' },
  { name: 'dynamo-shell.tsx', path: 'src/components/dynamo-shell.tsx' },
  { name: 'sync.tsx', path: 'src/routes/sync.tsx' },
];

const tRegex = /(?:[^a-zA-Z0-9_]|^)t\(\s*['"]([^'"]+)['"]/g;

console.log('=== VERIFYING RESOLUTION OF ALL T() KEYS ACROSS 7 TARGET FILES ===');
let grandTotalKeys = 0;
let grandTotalFailures = 0;

for (const target of targets) {
  const fileFullPath = path.join(rootDir, target.path);
  const content = fs.readFileSync(fileFullPath, 'utf-8');
  let match;
  const fileKeys = new Set();
  const fileFailures = [];

  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    if (key.includes('${') || key.length <= 1) continue;
    fileKeys.add(key);

    for (const loc of locales) {
      const res = actualT(key, loc);
      if (res === key) {
        fileFailures.push({ key, loc });
      }
    }
  }

  grandTotalKeys += fileKeys.size;
  grandTotalFailures += fileFailures.length;

  console.log(`\nFile: ${target.name} (${target.path})`);
  console.log(`  Distinct keys: ${fileKeys.size}`);
  console.log(`  Unresolved failures across VI/EN/JA: ${fileFailures.length}`);
  if (fileFailures.length > 0) {
    console.log(`  Failed keys sample:`, fileFailures.slice(0, 5));
  }
}

console.log('\n========================================');
console.log(`Total distinct keys checked across 7 files: ${grandTotalKeys}`);
console.log(`Total unresolved failures: ${grandTotalFailures}`);
console.log('========================================');
