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

const targets = [
  { name: 'login.tsx', path: 'src/routes/login.tsx' },
  { name: 'job-ticket.tsx', path: 'src/components/job-ticket.tsx' },
  { name: 'orders.tsx', path: 'src/routes/orders.tsx' },
  { name: 'tracking.tsx', path: 'src/routes/tracking.tsx' },
  { name: 'dynamo-shell.tsx', path: 'src/components/dynamo-shell.tsx' },
  { name: 'sync.tsx', path: 'src/routes/sync.tsx' },
  { name: 'dashboard.tsx', path: 'src/routes/dashboard.tsx' },
];

const tRegex = /(?:[^a-zA-Z0-9_]|^)t\(\s*['"]([^'"]+)['"]/g;

console.log('=== ADVERSARIAL UNRESOLVED KEY AUDIT ===');
let grandTotal = 0;

for (const target of targets) {
  const fileFullPath = path.join(rootDir, target.path);
  const content = fs.readFileSync(fileFullPath, 'utf-8');
  let match;
  const missingMap = new Map();
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    if (key.includes('${') || key.length <= 1) continue;
    for (const loc of locales) {
      if (resolveT(key, loc) === key) {
        if (!missingMap.has(key)) missingMap.set(key, []);
        missingMap.get(key).push(loc);
      }
    }
  }
  console.log(`\nFile: ${target.name} (${target.path})`);
  console.log(`Unresolved keys count: ${missingMap.size}`);
  grandTotal += missingMap.size;
  let count = 0;
  for (const [key, locs] of missingMap.entries()) {
    if (count++ < 15) {
      console.log(`  - "${key}" (fails in: ${locs.join(', ')})`);
    }
  }
  if (missingMap.size > 15) {
    console.log(`  ... and ${missingMap.size - 15} more keys`);
  }
}

console.log(`\nGRAND TOTAL UNRESOLVED KEYS ACROSS CRITICAL UI: ${grandTotal}`);
