const fs = require('fs');
const path = require('path');

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
const regex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*\)(?:\s*\|\|\s*['"]([^'"]+)['"])?/g;

const keyMap = {};

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const fallback = match[2] || '';
    if (!keyMap[key]) {
      keyMap[key] = {
        key,
        files: new Set(),
        fallbacks: new Set(),
      };
    }
    keyMap[key].files.add(path.relative(process.cwd(), file));
    if (fallback) keyMap[key].fallbacks.add(fallback);
  }
}

// Read missing keys from previous audit
const missingKeys = [
  'common.loading.permissions',
  'common.loading.failedTitle',
  'common.loading.syncing',
  'ticket.fields.orderNo',
  'common.thisMonth',
  'common.lastMonth',
  'tracking.status.inspect',
  'dashboard.bottlenecks.subtitle',
  'dashboard.bottlenecks.groupCol',
  'dashboard.bottlenecks.loadCol',
  'tracking.dueTags.overdue',
  'orders.kpis.openLots',
  'dashboard.handover.unspecifiedName',
  'dashboard.handover.top6Overdue',
  'tracking.columns.partNo',
  'dashboard.handover.urgentCheckProgress',
  'dashboard.handover.noOverdueNotice',
  'dashboard.handover.a4Notice',
  'dashboard.handover.signQc',
  'dashboard.handover.signQcNote',
  'dashboard.handover.signSupervisorNote',
  'orders.actions.printAll',
  'orders.kpis.totalValue',
  'orders.kpis.totalQty',
  'common.source',
  'common.cache',
  'sync.gateway.modeReplaceDesc',
  'sync.gateway.modeMergeDesc',
  'common.lastSynced',
  'common.noTimestamp',
  'tracking.sort.sortThisCol',
  'common.selected',
  'common.filters.search',
  'tracking.filters.missingHardness',
  'tracking.filters.hasNote',
  'tracking.actions.allFiltersCleared',
  'tracking.actions.filtering',
  'tracking.actions.clearFilterItem',
  'tracking.actions.clearFilterTooltip',
  'tracking.toolbars.clearSearch',
  'tracking.toolbars.matched',
  'tracking.workshops.filterTooltip',
  'common.filters.deselect',
  'tracking.density.compactTooltip',
  'tracking.density.normalTooltip',
  'tracking.toolbars.resetColWidthsTooltip',
  'tracking.toolbars.resetColWidths',
  'tracking.toolbars.exitFullscreen',
  'tracking.toolbars.enterFullscreen',
  'tracking.toolbars.minimize',
  'tracking.toolbars.fullscreen',
  'tracking.toolbars.exportCsvTooltip',
  'tracking.toolbars.exportCsv',
  'tracking.toolbars.exportCurrentPage',
  'tracking.toolbars.exportFiltered',
  'tracking.toolbars.exportAll',
  'common.filters.clear',
  'common.filters.deselectAll',
  'common.filters.selectAll',
  'tracking.sort.minToMax',
  'tracking.sort.maxToMin',
  'common.filters.min',
  'common.filters.max',
  'tracking.sort.lightToHeavy',
  'tracking.sort.heavyToLight',
  'dashboard.quickPresets.sevenDays',
  'dashboard.quickPresets.thisMonth',
  'orders.telemetry.viewing',
  'common.pagination.prev',
  'common.pagination.page',
  'common.pagination.next',
  'tracking.toolbars.workshopSelect',
  'common.jobTicket.sec1.size',
  'common.jobTicket.sec1.unitPrice',
  'common.jobTicket.sec1.totalPrice',
  'sync.twoWay.recentHeader',
  'sync.preview.recordsUnit'
];

console.log('=== MISSING KEYS WITH LITERAL FALLBACKS ===');
for (const k of missingKeys) {
  const item = keyMap[k];
  if (item) {
    console.log(`Key: "${k}"`);
    console.log(`  Files: ${[...item.files].join(', ')}`);
    console.log(`  Fallbacks: ${JSON.stringify([...item.fallbacks])}`);
  } else {
    console.log(`Key: "${k}" not found in regex scan`);
  }
}
