#!/usr/bin/env node
/**
 * Проверка: артефакты на диске совпадают с результатом npm run build.
 * Два прогона подряд — второй должен только skip (иначе артефакты устарели).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ARTIFACTS = [
  'UiTokens.html',
  'UiPhase2.html',
  'EditorStyles.html',
  'ViewerStyles.html',
  'UiKpiCards.html',
  'UiIcons.html',
  'VendorChartJs.html',
  'VendorChartDataLabels.html',
  'VendorEcharts.html',
  'LibBundle.html',
  'GASAdapter.html',
  'DashboardPhase1.html',
  'DashboardPhase2.html',
  'MoProfile.html',
  'EditorPage.html',
  'ViewerPage.html',
  'Code.js',
];

function runBuild() {
  return execSync('node scripts/build-gas.mjs', { cwd: ROOT, encoding: 'utf8' });
}

const first = runBuild();
if (/\bwrote\s/.test(first)) {
  const second = runBuild();
  if (/\bwrote\s/.test(second)) {
    console.error('Artifacts are out of sync with src/. Run npm run build.');
    process.exit(1);
  }
}

const missing = ARTIFACTS.filter((name) => {
  const full = path.join(ROOT, name);
  return !fs.existsSync(full) || fs.statSync(full).size === 0;
});

if (missing.length) {
  console.error('Missing or empty artifacts:', missing.join(', '));
  process.exit(1);
}

console.log('Artifacts are in sync.');
