const fs = require('fs');

const viCommon = JSON.parse(fs.readFileSync('src/i18n/locales/vi/common.json', 'utf-8'));
const viNav = JSON.parse(fs.readFileSync('src/i18n/locales/vi/nav.json', 'utf-8'));
const viTracking = JSON.parse(fs.readFileSync('src/i18n/locales/vi/tracking.json', 'utf-8'));
const viDashboard = JSON.parse(fs.readFileSync('src/i18n/locales/vi/dashboard.json', 'utf-8'));
const viOrders = JSON.parse(fs.readFileSync('src/i18n/locales/vi/orders.json', 'utf-8'));
const viSync = JSON.parse(fs.readFileSync('src/i18n/locales/vi/sync.json', 'utf-8'));
const viTelemetry = JSON.parse(fs.readFileSync('src/i18n/locales/vi/telemetry.json', 'utf-8'));

const dictionaries = {
  vi: {
    common: viCommon,
    nav: viNav,
    tracking: viTracking,
    dashboard: viDashboard,
    orders: viOrders,
    sync: viSync,
    telemetry: viTelemetry,
  }
};

function getNestedValue(obj, path) {
  let curr = obj;
  for (const part of path) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return typeof curr === 'string' ? curr : undefined;
}

function t(key, locale = 'vi') {
  const parts = key.split('.');
  const dict = dictionaries[locale];
  let result;
  if (parts.length === 1) {
    result = getNestedValue(dict.common, [parts[0]]);
  } else {
    const [ns, ...rest] = parts;
    result = getNestedValue(dict[ns], rest);
  }
  if (result === undefined) {
    result = key;
  }
  return result;
}

console.log('Result of t("ticket.companyName"):', t('ticket.companyName'));
console.log('Result of t("ticket.title"):', t('ticket.title'));
console.log('Result of t("ticket.sec1Title"):', t('ticket.sec1Title'));
console.log('Result of t("ticket.fields.partNo"):', t('ticket.fields.partNo'));
console.log('Result of t("ticket.formatA4"):', t('ticket.formatA4'));
