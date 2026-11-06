const fs = require('fs');
const path = require('path');

const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];
const locales = ['vi', 'en', 'ja'];

function getLeaves(obj, prefix = '') {
  let map = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(map, getLeaves(v, p));
    } else {
      map[p] = v;
    }
  }
  return map;
}

// Load all keys
const allKeys = { vi: new Set(), en: new Set(), ja: new Set() };
for (const loc of locales) {
  for (const ns of namespaces) {
    const filePath = path.join('src/i18n/locales', loc, ns + '.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const leaves = getLeaves(json, ns);
    for (const k of Object.keys(leaves)) {
      allKeys[loc].add(k);
    }
    // Also add without namespace for common
    if (ns === 'common') {
      const commonLeaves = getLeaves(json);
      for (const k of Object.keys(commonLeaves)) {
        allKeys[loc].add(k);
      }
    }
  }
}

// Recursively find all ts and tsx files in src (excluding test files)
function getSourceFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'test' && file !== 'locales') {
        results.push(...getSourceFiles(full));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = getSourceFiles('src');
console.log('Found source files to scan:', srcFiles.length);

const tCallRegex = /t\(\s*['"]([^'"]+)['"]/g;
let missingKeys = [];
let usedKeys = new Set();

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    // ignore dynamic expressions
    if (key.includes('${')) continue;
    usedKeys.add(key);
    for (const loc of locales) {
      if (!allKeys[loc].has(key)) {
        missingKeys.push({ file, key, loc });
      }
    }
  }
}

console.log('Total unique t() keys used across codebase:', usedKeys.size);
console.log('Missing key references count:', missingKeys.length);
if (missingKeys.length > 0) {
  console.log('Missing keys sample:', missingKeys.slice(0, 30));
} else {
  console.log('ALL t() calls exist in ALL 3 locales!');
}
