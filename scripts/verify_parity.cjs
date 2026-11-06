const fs = require('fs');
const path = require('path');

const localesDir = path.resolve('src/i18n/locales');
const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

function getLeafKeys(obj, p = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function checkEmpty(obj, loc, ns, p = '') {
  let empties = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      empties = empties.concat(checkEmpty(v, loc, ns, full));
    } else if (typeof v !== 'string' || v.trim().length === 0) {
      empties.push(`${loc}/${ns}.json: ${full} is empty or not string: ${JSON.stringify(v)}`);
    }
  }
  return empties;
}

let totalDiffs = 0;
let totalEmpties = 0;
let totalLeaves = 0;

console.log('=== DICTIONARY RECURSIVE PARITY & INTEGRITY AUDIT ===');
for (const ns of namespaces) {
  const vi = JSON.parse(fs.readFileSync(path.join(localesDir, 'vi', `${ns}.json`), 'utf-8'));
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', `${ns}.json`), 'utf-8'));
  const ja = JSON.parse(fs.readFileSync(path.join(localesDir, 'ja', `${ns}.json`), 'utf-8'));

  const viKeys = getLeafKeys(vi).sort();
  const enKeys = getLeafKeys(en).sort();
  const jaKeys = getLeafKeys(ja).sort();

  totalLeaves += viKeys.length;

  const missingInEn = viKeys.filter(k => !enKeys.includes(k));
  const extraInEn = enKeys.filter(k => !viKeys.includes(k));
  const missingInJa = viKeys.filter(k => !jaKeys.includes(k));
  const extraInJa = jaKeys.filter(k => !viKeys.includes(k));

  const diffEn = missingInEn.length + extraInEn.length;
  const diffJa = missingInJa.length + extraInJa.length;

  totalDiffs += diffEn + diffJa;

  const emptiesVi = checkEmpty(vi, 'vi', ns);
  const emptiesEn = checkEmpty(en, 'en', ns);
  const emptiesJa = checkEmpty(ja, 'ja', ns);
  const allEmpties = [...emptiesVi, ...emptiesEn, ...emptiesJa];
  totalEmpties += allEmpties.length;

  console.log(`Namespace: ${ns} (Leaf keys: ${viKeys.length})`);
  console.log(`  DiffEN: ${diffEn}, DiffJA: ${diffJa}, Empty strings: ${allEmpties.length}`);
  if (diffEn > 0) console.log('    EN diffs:', { missingInEn, extraInEn });
  if (diffJa > 0) console.log('    JA diffs:', { missingInJa, extraInJa });
  if (allEmpties.length > 0) console.log('    Empties:', allEmpties);
}

console.log('====================================================');
console.log(`Total leaf keys per locale: ${totalLeaves}`);
console.log(`Total key parity diffs across all 21 files: ${totalDiffs}`);
console.log(`Total empty string values across all 21 files: ${totalEmpties}`);
console.log('====================================================');
