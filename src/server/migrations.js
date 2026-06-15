/**
 * =============================================================================
 * migrations.js — служебные операции с архивом и планами 2026
 * =============================================================================
 *
 * Запускаются ВРУЧНУЮ из редактора Apps Script (не из веб-интерфейса):
 *
 *   migrateArchiveDates()        — даты в колонке B → ISO
 *   replaceBrokenArchive()       — восстановление из листа «Архив_temp»
 *   migrateArchivePlansTo2026()  — обновление планов МО в JSON архива
 *                                  migrateArchivePlansTo2026(true) — просмотр
 *                                  migrateArchivePlansTo2026(false) — запись
 *
 * Карта планов 2026: PlanMapping2026.js (npm run build:plans)
 *
 * ПОСЛЕ ПРАВОК: npm run build
 * =============================================================================
 */

/** Перевод текстовых дат dd.mm.yyyy в ISO в колонке «Дата сохранения» */
function migrateArchiveDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Архив');

  if (!sheet) {
    console.log('Лист Архив не найден');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 2, lastRow - 1, 1);
  const dates = range.getValues();
  let fixed = 0;

  for (let i = 0; i < dates.length; i++) {
    const oldValue = dates[i][0];
    let newValue = oldValue;

    if (typeof oldValue === 'string' && oldValue.includes('.')) {
      const parts = oldValue.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        if (!isNaN(dateObj.getTime())) {
          newValue = dateObj.toISOString();
          sheet.getRange(i + 2, 2).setValue(newValue);
          fixed++;
        }
      }
    }
  }

  console.log(`Мигрировано ${fixed} записей в ISO формат`);
  return `Мигрировано ${fixed} записей`;
}

function replaceBrokenArchive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const oldSheet = ss.getSheetByName('Архив');
  const tempSheet = ss.getSheetByName('Архив_temp');

  if (!tempSheet) {
    console.log('❌ Лист Архив_temp не найден');
    return;
  }

  if (oldSheet) {
    ss.deleteSheet(oldSheet);
    console.log('🗑️ Старый лист "Архив" удалён');
  }

  tempSheet.setName('Архив');
  console.log('✅ Лист переименован в "Архив"');
  console.log('🎉 Архив восстановлен!');

  return 'Архив успешно восстановлен!';
}

function normalizeMoName_(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '');
}

function extractFactFromMo_(item) {
  var raw = item.fact != null ? item.fact : item['Общий итог'];
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  var s = String(raw).trim();
  var m = s.match(/(\d[\d\s]*)/);
  return m ? parseInt(m[1].replace(/\s/g, ''), 10) || 0 : 0;
}

function lookupNewPlan2026_(name, mapping) {
  if (!name) return null;
  var trimmed = String(name).trim();
  if (mapping.byShortName[trimmed] != null) return mapping.byShortName[trimmed];
  var norm = normalizeMoName_(trimmed);
  if (mapping.byNormalizedShortName[norm] != null) return mapping.byNormalizedShortName[norm];
  return null;
}

function updateMoPlanFields_(item, newPlan) {
  var oldPlan = Number(item.plan != null ? item.plan : item['План на год'] || 0) || 0;
  if (Math.round(oldPlan) === Math.round(newPlan)) return false;

  if (item.plan != null) item.plan = newPlan;
  if (item['План на год'] != null) item['План на год'] = String(newPlan);

  var fact = extractFactFromMo_(item);
  var percent = newPlan ? (fact / newPlan) * 100 : 0;
  if (item.percent != null) item.percent = percent;
  if (item['%'] != null) item['%'] = percent.toFixed(1) + '%';

  return true;
}

function updateReportPlans2026_(report, mapping) {
  var result = { changed: 0, notFound: [], details: [] };

  function processItem(item) {
    if (!item || typeof item !== 'object') return;

    var candidateNames = [
      item.name,
      item['Наименование МО'],
      item['Наименование'],
      item['Краткое наименование'],
    ].filter(function (n) {
      return n != null && String(n).trim() !== '';
    });

    var newPlan = null;
    var matchedName = '';
    for (var i = 0; i < candidateNames.length; i++) {
      newPlan = lookupNewPlan2026_(candidateNames[i], mapping);
      if (newPlan != null) {
        matchedName = candidateNames[i];
        break;
      }
    }

    if (newPlan == null) {
      result.notFound.push(candidateNames[0] || '(без названия)');
      return;
    }

    if (updateMoPlanFields_(item, newPlan)) {
      result.changed++;
      result.details.push(matchedName + ': ' + newPlan);
    }
  }

  var mos = report.mosData || report.MOSData || report.data;
  if (typeof mos === 'string') {
    try {
      mos = JSON.parse(mos);
    } catch (e) {
      mos = [];
    }
  }

  if (Array.isArray(mos)) {
    mos.forEach(processItem);
    report.mosData = mos;
    if (report.MOSData) report.MOSData = mos;
    if (report.data) report.data = mos;
  }

  return result;
}

function migrateArchivePlansTo2026(dryRun) {
  dryRun = dryRun !== false;
  var mapping = getPlanMapping2026();
  var sheet = getArchiveSheet_();

  if (!sheet) throw new Error('Лист «Архив» не найден');

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'В архиве нет отчётов';

  var ids = sheet.getRange(2, 1, lastRow, 1).getValues();
  var jsonCells = sheet.getRange(2, 3, lastRow, 1).getValues();

  var summary = {
    dryRun: dryRun,
    reportsTotal: lastRow - 1,
    reportsUpdated: 0,
    moPlansChanged: 0,
    notFound: {},
  };

  for (var i = 0; i < jsonCells.length; i++) {
    var reportId = ids[i][0];
    var rawJson = jsonCells[i][0];
    if (!rawJson) continue;

    var report;
    try {
      report = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
      console.warn('Пропуск отчёта ID ' + reportId + ': битый JSON');
      continue;
    }

    var updateResult = updateReportPlans2026_(report, mapping);
    if (updateResult.changed === 0) continue;

    summary.reportsUpdated++;
    summary.moPlansChanged += updateResult.changed;

    updateResult.notFound.forEach(function (name) {
      summary.notFound[name] = (summary.notFound[name] || 0) + 1;
    });

    if (!dryRun) {
      sheet.getRange(i + 2, 3).setValue(JSON.stringify(report));
      console.log('Обновлён отчёт ID ' + reportId + ': ' + updateResult.changed + ' МО');
    } else {
      console.log('[dry-run] Отчёт ID ' + reportId + ': ' + updateResult.changed + ' МО');
    }
  }

  if (!dryRun) {
    invalidateArchiveListCache_();
  }

  var notFoundList = Object.keys(summary.notFound);
  var message =
    (dryRun ? 'ПРОСМОТР (без записи). ' : 'ЗАПИСАНО. ') +
    'Отчётов: ' +
    summary.reportsTotal +
    ', обновлено: ' +
    summary.reportsUpdated +
    ', планов МО заменено: ' +
    summary.moPlansChanged;

  if (notFoundList.length) {
    message += '. Не найдены в новом плане: ' + notFoundList.join(', ');
  }

  console.log(message);
  return message;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeMoName_,
    extractFactFromMo_,
    lookupNewPlan2026_,
    updateMoPlanFields_,
    updateReportPlans2026_,
  };
}
