#!/usr/bin/env node
/**
 * Проверка: артефакты совпадают с результатом npm run build.
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

execSync('node scripts/build-gas.mjs', { cwd: ROOT, stdio: 'pipe' });

const dirty = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
const artifactPattern = /^(DashboardPhase|Ui|Editor|Viewer|LibBundle|GASAdapter|Code\.js)/;

const lines = dirty ? dirty.split('\n') : [];
const artifactChanges = lines.filter((line) => {
  const file = line.substring(2).trim();
  return artifactPattern.test(path.basename(file)) || file === 'Code.js';
});

if (artifactChanges.length) {
  console.error('Generated artifacts are out of sync. Run npm run build and commit changes:');
  artifactChanges.forEach((l) => console.error(' ', l));
  process.exit(1);
}

console.log('Artifacts are in sync.');
