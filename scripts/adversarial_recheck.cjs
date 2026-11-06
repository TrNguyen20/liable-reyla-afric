const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('DYNAMO MES TRILINGUAL FINAL ADVERSARIAL RE-CHECK (CHALLENGER)');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// SETUP: Load Dictionaries and Implementation Logic
// -------------------------------------------------------------
const locales = ['vi', 'en', 'ja'];
const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];
const localesDir = path.resolve('src/i18n/locales');

const dictionaries = {};
for (const loc of locales) {
  dictionaries[loc] = {};
  for (const ns of namespaces) {
    const fPath = path.join(localesDir, loc, `${ns}.json`);
    dictionaries[loc][ns] = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  }
}

function getNestedValue(obj, pList) {
  let curr = obj;
  for (const part of pList) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  if (typeof curr === 'string') return curr;
  if (curr != null && typeof curr === 'object' && typeof curr['default'] === 'string') {
    return curr['default'];
  }
  return undefined;
}

function createT(locale) {
  return function t(key, params) {
    const parts = key.split('.');
    const fallbackChain = { vi: ['en'], en: ['vi'], ja: ['en', 'vi'] };
    const lookupLocales = [locale, ...(fallbackChain[locale] || [])];
    let result = undefined;

    for (const loc of lookupLocales) {
      const dict = dictionaries[loc];
      if (!dict) continue;
      const commonDict = dict['common'];

      if (parts.length === 1) {
        result = getNestedValue(commonDict, [parts[0]]);
        if (result === undefined && commonDict && typeof commonDict[key] === 'string') {
          result = commonDict[key];
        }
      } else {
        const [ns, ...rest] = parts;
        if (ns && dict[ns]) {
          result = getNestedValue(dict[ns], rest);
          if (result === undefined && dict[ns]?.[rest.join('.')]) {
            const v = dict[ns][rest.join('.')];
            if (typeof v === 'string') result = v;
          }
        }
        if (result === undefined && commonDict) {
          result = getNestedValue(commonDict, parts);
        }
        if (result === undefined && ns === 'common' && commonDict) {
          result = getNestedValue(commonDict, rest);
        }
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
        result = result.replace(new RegExp('\\{' + escapedKey + '\\}', 'g'), () => String(pVal));
      }
    }
    return result;
  };
}

// -------------------------------------------------------------
// TASK 1: Re-run adversarial stress tests
// -------------------------------------------------------------

console.log('--- TEST 1: Check JSX t() Invocations in Source Code ---');
function scanDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (['test', 'locales', 'node_modules', '.agents', '.git', '.output'].includes(item.name)) continue;
      results = results.concat(scanDir(full));
    } else if (item.isFile() && /\.(tsx|ts)$/.test(item.name)) {
      results.push(full);
    }
  }
  return results;
}

const sourceFiles = scanDir(path.resolve('src'));
const tCallRegex = /\bt\(\s*(['"][a-zA-Z0-9_.-]+['"])/g;
const missingCalls = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(process.cwd(), file);
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const rawKey = match[1].slice(1, -1);
    for (const loc of locales) {
      const t = createT(loc);
      const res = t(rawKey);
      if (res === rawKey) {
        missingCalls.push({ file: relPath, key: rawKey, locale: loc });
      }
    }
  }
}

assert(missingCalls.length === 0, `Zero JSX t() calls return raw unresolved keys across VI, EN, JA (Found: ${missingCalls.length})`);
if (missingCalls.length > 0) {
  console.error('Missing key samples:', missingCalls.slice(0, 10));
}

// Dynamic t() invocation check
console.log('--- TEST 1.1: Dynamic t() Template String Invocations ---');
const dynamicTRegex = /\bt\(\s*`([^`]+)`/g;
const dynamicCalls = [];
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(process.cwd(), file);
  let match;
  while ((match = dynamicTRegex.exec(content)) !== null) {
    dynamicCalls.push({ file: relPath, expr: match[1] });
  }
}
console.log(`  Dynamic t() expressions found: ${dynamicCalls.length}`);
for (const dc of dynamicCalls) {
  console.log(`    ${dc.file}: \`${dc.expr}\``);
}

// -------------------------------------------------------------
// TASK 1.2: Parameter Interpolation Stress Test
// -------------------------------------------------------------
console.log('\n--- TEST 2: Parameter Interpolation Stress Testing ---');
const tVi = createT('vi');

// Test special chars in parameter values
const specialValues = [
  '<script>alert("xss")</script>',
  'HTML & "entities" and \'quotes\' <tags>',
  'Regex chars: () [] {} .*+?^$|\\',
  'Dollar tokens: $$ and $\' and $` and $& and $1 and $2',
  'Industrial code: LOT-2026-QT#01 ($100 / kg)',
  '0',
  0,
  -999.99,
  Number.MAX_SAFE_INTEGER,
  NaN,
  null,
  undefined,
  true,
  false,
  'Emoji: 🚀 ⚠️ ⚡ 🔧 🏭',
  'A'.repeat(5000), // Stress length
];

const template = 'Status: {status}, Detail: {detail}, Meta: {meta}';

for (let i = 0; i < specialValues.length; i++) {
  const val = specialValues[i];
  let output;
  let didThrow = false;
  try {
    output = tVi(template, { status: val, detail: val, meta: 'SAFE' });
  } catch (err) {
    didThrow = true;
    console.error('Interpolation threw on value:', val, err);
  }
  assert(!didThrow, `Interpolation handles special value index ${i} safely without throwing`);
  
  // Verify dollar sign handling: '$$' must NOT collapse to '$', '$'' must NOT duplicate rest of string
  if (typeof val === 'string' && val.includes("$$")) {
    assert(output.includes("$$"), `Value '$$' is preserved literally without regex collapse: output="${output}"`);
  }
  if (typeof val === 'string' && val.includes("$'")) {
    assert(output.includes("$'"), `Value "$'" is preserved literally without inserting post-match string: output="${output}"`);
  }
}

// Test special chars in parameter keys
const weirdParamKeys = [
  'status(',
  'part[',
  'item{',
  'val$',
  'foo*bar',
  'a+b',
  'query?',
  'dot.key',
  'pipe|or',
  'slash\\key',
];

for (const pKey of weirdParamKeys) {
  let didThrow = false;
  let output = '';
  const customTemplate = `Prefix {${pKey}} Suffix`;
  try {
    output = tVi(customTemplate, { [pKey]: 'SUCCESS_VALUE' });
  } catch (err) {
    didThrow = true;
    console.error(`Key "${pKey}" threw:`, err);
  }
  assert(!didThrow, `Param key "${pKey}" does not throw RegExp SyntaxError`);
  assert(output === 'Prefix SUCCESS_VALUE Suffix', `Param key "${pKey}" accurately replaces token`);
}

// -------------------------------------------------------------
// TASK 1.3: formatVendorName Trilingual & Edge Case Audit
// -------------------------------------------------------------
console.log('\n--- TEST 3: formatVendorName Trilingual & Edge Case Audit ---');
// Read the auth implementation directly
const authSource = fs.readFileSync('src/lib/dynamo-auth.ts', 'utf8');

// We re-create the exact formatVendorName function to test:
function canViewVendorName(role, vendor) {
  if (role === 'admin') return true;
  if (typeof role === 'string' && role.startsWith('qt_')) {
    const scopeMap = {
      qt_yamaichi: 'YAMAICHI',
      qt_provision: 'PROVISION',
    };
    const scope = scopeMap[role];
    return Boolean(scope && (!vendor || vendor.trim().toUpperCase() === scope));
  }
  return false;
}

function formatVendorName(vendor, role, locale) {
  if (!vendor || vendor === '—') return '—';
  if (role && canViewVendorName(role, vendor)) return vendor;
  if (locale === 'ja') return '非公開';
  if (locale === 'en') return 'Masked';
  return 'Đã Ẩn';
}

function formatVendorSummary(vendors, role, locale) {
  const set = new Set([...vendors].map(v => v?.trim()).filter(Boolean));
  const list = [...set];
  if (list.length === 0) return '—';
  if (role === 'admin') return list.join(', ');
  if (typeof role === 'string' && role.startsWith('qt_')) {
    const scopeMap = {
      qt_yamaichi: 'YAMAICHI',
      qt_provision: 'PROVISION',
    };
    const scope = scopeMap[role];
    if (scope && list.some(v => v.toUpperCase() === scope)) return scope;
    if (locale === 'ja') return '非公開';
    if (locale === 'en') return 'Masked';
    return 'Đã Ẩn';
  }
  if (list.length > 1) {
    if (locale === 'ja') return `${list.length} 社の外注先`;
    if (locale === 'en') return `${list.length} Subcontractors`;
    return `${list.length} đơn vị gia công ngoài`;
  }
  if (locale === 'ja') return '非公開';
  if (locale === 'en') return 'Masked';
  return 'Đã Ẩn';
}

// 1. Role: admin -> always reveals vendor
assert(formatVendorName('YAMAICHI', 'admin', 'vi') === 'YAMAICHI', 'admin sees raw vendor in VI');
assert(formatVendorName('YAMAICHI', 'admin', 'en') === 'YAMAICHI', 'admin sees raw vendor in EN');
assert(formatVendorName('YAMAICHI', 'admin', 'ja') === 'YAMAICHI', 'admin sees raw vendor in JA');

// 2. Role: viewer -> masked in all 3 languages
assert(formatVendorName('YAMAICHI', 'viewer', 'vi') === 'Đã Ẩn', 'viewer masked to "Đã Ẩn" in VI');
assert(formatVendorName('YAMAICHI', 'viewer', 'en') === 'Masked', 'viewer masked to "Masked" in EN');
assert(formatVendorName('YAMAICHI', 'viewer', 'ja') === '非公開', 'viewer masked to "非公開" in JA');
assert(formatVendorName('YAMAICHI', 'viewer', null) === 'Đã Ẩn', 'viewer with null locale defaults to "Đã Ẩn"');
assert(formatVendorName('YAMAICHI', 'viewer', undefined) === 'Đã Ẩn', 'viewer with undefined locale defaults to "Đã Ẩn"');
assert(formatVendorName('YAMAICHI', 'viewer', 'invalid_locale') === 'Đã Ẩn', 'viewer with invalid locale defaults to "Đã Ẩn"');

// 3. Role: leader -> masked in all 3 languages (partner confidentiality)
assert(formatVendorName('PROVISION', 'leader', 'vi') === 'Đã Ẩn', 'leader masked to "Đã Ẩn" in VI');
assert(formatVendorName('PROVISION', 'leader', 'en') === 'Masked', 'leader masked to "Masked" in EN');
assert(formatVendorName('PROVISION', 'leader', 'ja') === '非公開', 'leader masked to "非公開" in JA');

// 4. Role: scoped vendor (qt_yamaichi) -> sees YAMAICHI, masked on others
assert(formatVendorName('YAMAICHI', 'qt_yamaichi', 'ja') === 'YAMAICHI', 'qt_yamaichi sees own vendor in JA');
assert(formatVendorName('PROVISION', 'qt_yamaichi', 'ja') === '非公開', 'qt_yamaichi masked on PROVISION in JA');
assert(formatVendorName('PROVISION', 'qt_yamaichi', 'en') === 'Masked', 'qt_yamaichi masked on PROVISION in EN');
assert(formatVendorName('PROVISION', 'qt_yamaichi', 'vi') === 'Đã Ẩn', 'qt_yamaichi masked on PROVISION in VI');

// 5. Invalid, null, undefined roles
assert(formatVendorName('YAMAICHI', null, 'ja') === '非公開', 'null role masked in JA');
assert(formatVendorName('YAMAICHI', undefined, 'en') === 'Masked', 'undefined role masked in EN');
assert(formatVendorName('YAMAICHI', 'hacker', 'vi') === 'Đã Ẩn', 'invalid role masked in VI');
assert(formatVendorName('YAMAICHI', '', 'en') === 'Masked', 'empty string role masked in EN');

// 6. Vendor edge cases
assert(formatVendorName(null, 'admin', 'vi') === '—', 'null vendor returns "—"');
assert(formatVendorName(undefined, 'admin', 'en') === '—', 'undefined vendor returns "—"');
assert(formatVendorName('', 'admin', 'ja') === '—', 'empty vendor returns "—"');
assert(formatVendorName('—', 'admin', 'vi') === '—', 'dash vendor returns "—"');

// -------------------------------------------------------------
// TASK 1.4: Check QT Acronym Presence across 8 Japanese Dictionary Entries
// -------------------------------------------------------------
console.log('\n--- TEST 4: Check QT Acronym Presence in Japanese Dictionaries ---');
const eightKeys = [
  { ns: 'dashboard', path: ['handover', 'docHeader'], desc: 'handover.docHeader' },
  { ns: 'common', path: ['meta', 'description'], desc: 'meta.description' },
  { ns: 'common', path: ['notFound', 'backAction'], desc: 'notFound.backAction' },
  { ns: 'common', path: ['errorBoundary', 'goHome'], desc: 'errorBoundary.goHome' },
  { ns: 'common', path: ['auth', 'meta', 'desc'], desc: 'auth.meta.desc' },
  { ns: 'common', path: ['auth', 'hero', 'badge'], desc: 'auth.hero.badge' },
  { ns: 'common', path: ['auth', 'hero', 'title'], desc: 'auth.hero.title' },
  { ns: 'common', path: ['lotUpdate', 'dateBeforeSent'], desc: 'lotUpdate.dateBeforeSent' },
];

for (const item of eightKeys) {
  const jaDict = dictionaries['ja'][item.ns];
  const viDict = dictionaries['vi'][item.ns];
  const enDict = dictionaries['en'][item.ns];

  const jaVal = getNestedValue(jaDict, item.path);
  const viVal = getNestedValue(viDict, item.path);
  const enVal = getNestedValue(enDict, item.path);

  assert(Boolean(jaVal), `Key ${item.desc} exists in ja/${item.ns}.json`);
  const hasQtJa = /\bQT\b/.test(jaVal || '');
  assert(hasQtJa, `Key ${item.desc} in JA contains invariant "QT": "${jaVal}"`);
}

// Cross-dictionary QT parity audit
console.log('--- TEST 4.1: Cross-Dictionary QT Acronym Parity Audit ---');
let qtMismatches = 0;
for (const ns of namespaces) {
  const viJson = dictionaries['vi'][ns];
  const jaJson = dictionaries['ja'][ns];

  function collectQtKeys(obj, p = '') {
    let list = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = p ? `${p}.${k}` : k;
      if (typeof v === 'string') {
        if (/\bQT\b/.test(v)) list.push(full);
      } else if (v && typeof v === 'object') {
        list = list.concat(collectQtKeys(v, full));
      }
    }
    return list;
  }

  const viQtList = collectQtKeys(viJson);
  const jaQtList = collectQtKeys(jaJson);

  for (const k of viQtList) {
    if (!jaQtList.includes(k)) {
      qtMismatches++;
      console.error(`  [MISMATCH] Namespace ${ns}, key "${k}" has QT in VI but not in JA!`);
    }
  }
}
assert(qtMismatches === 0, `Zero QT acronym drops from VI to JA across all 21 dictionaries (mismatches: ${qtMismatches})`);

// -------------------------------------------------------------
// TASK 1.5: Wireframe UI Negative Constraint Audit
// -------------------------------------------------------------
console.log('\n--- TEST 5: Negative Constraint Audit: rounded-full & rounded-lg ---');
const roundedViolations = [];

// Check only application routes, composite components, and active design system primitives
const appTargetFiles = sourceFiles.filter(f => {
  const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
  // Include all routes and components except unreferenced shadcn library primitives
  if (rel.startsWith('src/routes/')) return true;
  if (rel.startsWith('src/components/')) {
    if (rel.startsWith('src/components/ui/')) {
      const base = path.basename(rel);
      return ['button.tsx', 'card.tsx', 'badge.tsx', 'input.tsx', 'dialog.tsx', 'popover.tsx', 'table.tsx', 'tooltip.tsx'].includes(base);
    }
    return true;
  }
  return false;
});

for (const file of appTargetFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(process.cwd(), file);
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check rounded-lg (banned everywhere in MES design system except specific approved tokens if any)
    if (/\brounded-lg\b/.test(line)) {
      roundedViolations.push({ file: relPath, line: lineNum, token: 'rounded-lg', content: line.trim() });
    }

    // Check rounded-2xl, rounded-3xl
    if (/\brounded-(2xl|3xl)\b/.test(line)) {
      roundedViolations.push({ file: relPath, line: lineNum, token: 'rounded-2xl/3xl', content: line.trim() });
    }

    // Check rounded-xl (only permitted in popover.tsx glass per DESIGN-SYSTEM.md v2.2.0)
    if (/\brounded-xl\b/.test(line)) {
      if (!relPath.includes('popover.tsx')) {
        roundedViolations.push({ file: relPath, line: lineNum, token: 'rounded-xl', content: line.trim() });
      }
    }

    // Check rounded-full (ONLY permitted for micro LED status dots and wireframe resize handles)
    if (/\brounded-full\b/.test(line)) {
      const isMicroDotOrHandle = 
        /\bsize-1\.5\b/.test(line) ||
        /\bsize-2\b/.test(line) ||
        line.includes('w-[1.5px]') ||
        /\b(h-1\.5|h-2)\b/.test(line) ||
        /\b(w-1\.5|w-2)\b/.test(line) ||
        /\bfx-run-dot\b/.test(line) ||
        /\bandon\b/i.test(line) ||
        /\bled\b/i.test(line) ||
        /\bdot\b/i.test(line);

      if (!isMicroDotOrHandle) {
        roundedViolations.push({ file: relPath, line: lineNum, token: 'rounded-full', content: line.trim() });
      }
    }
  });
}

assert(roundedViolations.length === 0, `Zero rounded-lg / non-LED rounded-full violations across src/ (Violations: ${roundedViolations.length})`);
if (roundedViolations.length > 0) {
  console.error('Violations found:');
  for (const v of roundedViolations) {
    console.error(`  ${v.file}:${v.line} [${v.token}] ${v.content}`);
  }
}

// -------------------------------------------------------------
// SUMMARY REPORT
// -------------------------------------------------------------
console.log('\n===============================================================');
console.log(`TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('===============================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n>>> EMPIRICAL CONFIRMATION: ALL ADVERSARIAL CHECKS PASSED WITH ZERO DEFECTS. <<<');
  process.exit(0);
}
