const fs = require('fs');
const path = require('path');

const localesDir = path.resolve('src/i18n/locales');
const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

for (const ns of namespaces) {
  const vi = JSON.parse(fs.readFileSync(path.join(localesDir, 'vi', `${ns}.json`), 'utf-8'));
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', `${ns}.json`), 'utf-8'));
  const ja = JSON.parse(fs.readFileSync(path.join(localesDir, 'ja', `${ns}.json`), 'utf-8'));

  function findQtKeys(obj, p = '') {
    let list = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = p ? `${p}.${k}` : k;
      if (typeof v === 'string') {
        if (/\bQT\b/.test(v)) list.push(full);
      } else if (v && typeof v === 'object') {
        list = list.concat(findQtKeys(v, full));
      }
    }
    return list;
  }

  const viQt = findQtKeys(vi);
  const enQt = findQtKeys(en);
  const jaQt = findQtKeys(ja);

  const missingInJa = viQt.filter(k => !jaQt.includes(k));
  if (missingInJa.length > 0) {
    console.log(`Namespace ${ns}: keys with QT in VI but not in JA:`);
    for (const k of missingInJa) {
      console.log(`  - ${k}`);
    }
  }
}
