#!/usr/bin/env node
/**
 * Синхронизация src/*.js|css → *.html для Google Apps Script include()
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function writeHtml(name, inner, tag) {
  const content = tag === 'style' ? `<style>\n${inner}\n</style>\n` : `<script>\n${inner}\n</script>\n`;
  fs.writeFileSync(path.join(root, name), content, 'utf8');
  console.log('✓', name);
}

writeHtml('UiTokens.html', read('src/ui/tokens.css'), 'style');
writeHtml('UiPhase2.html', read('src/ui/phase2.css'), 'style');
writeHtml('DashboardPhase1.html', read('src/dashboard/dashboardPhase1.js'), 'script');
writeHtml('DashboardPhase2.html', read('src/dashboard/dashboardPhase2.js'), 'script');

const sharedJs = [read('src/shared/charts-week.js'), read('src/shared/archive-client.js')].join('\n\n');
writeHtml('Shared.html', sharedJs, 'script');

console.log('Готово: UiTokens, UiPhase2, DashboardPhase1/2, Shared');
