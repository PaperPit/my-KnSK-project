// ============================================================
// КОНФИГУРАЦИЯ SUPABASE (замените на свои ключи!)
// ============================================================
var SUPABASE_URL = 'https://gtbbwkjjxegvgdrbbiyk.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0YmJ3a2pqeGVndmdkcmJiaXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTE0OTcsImV4cCI6MjA5NDg2NzQ5N30.DElznepZ0PWBPFlV0DbxYnro9OLDbLAmu2NEue7FiBs';

/**
 * Универсальный GET-запрос к Supabase REST API
 */
function supabaseGet(path) {
  var url = SUPABASE_URL + '/rest/v1' + path;
  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return JSON.parse(response.getContentText());
  }
  console.error('Supabase error ' + code + ': ' + response.getContentText());
  return [];
}

/**
 * Универсальный POST-запрос к Supabase REST API
 */
function supabasePost(path, body) {
  var url = SUPABASE_URL + '/rest/v1' + path;
  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return JSON.parse(response.getContentText());
  }
  console.error('Supabase POST error ' + code + ': ' + response.getContentText());
  throw new Error('Supabase error: ' + response.getContentText());
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ВХОДА (БЕЗ ИЗМЕНЕНИЙ) ====================
function doGet(e) {
  if (e && e.parameter && e.parameter.viewer === '1') {
    const template = HtmlService.createTemplateFromFile('Viewer');
    template.reportId = e.parameter.id || null;
    return template.evaluate()
      .setTitle('Просмотр отчёта Онкоскрининг')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    const template = HtmlService.createTemplateFromFile('Index');
    template.planWeekly = 3333;
    return template.evaluate()
      .setTitle('Онкоскрининг — Редактор')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ==================== РАБОТА С АРХИВОМ (SUPABASE) ====================

/**
 * Сохранение отчёта в Supabase (замена записи в лист "Архив")
 */
function saveReportToArchive(reportData) {
  try {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');

    // 1. Создаём отчёт
    const reports = supabasePost('/reports', {
      saved_date: todayStr,
      period: reportData.period || '',
      plans_text: reportData.plansText || '',
      done_text: reportData.doneText || ''
    });
    const newId = reports[0].id;

    // 2. Сохраняем недельные данные
    if (reportData.weeksData && reportData.weeksData.length > 0) {
      const weeks = reportData.weeksData.map(function(w) {
        return {
          report_id: newId,
          week_start: w.start,
          week_end: w.end,
          value: w.value || 0
        };
      });
      supabasePost('/weeks_data', weeks);
    }

    // 3. Сохраняем данные МО
    if (reportData.mosData && reportData.mosData.length > 0) {
      const mos = reportData.mosData.map(function(mo) {
        return {
          report_id: newId,
          mo_name: mo.name,
          plan: mo.plan || 0,
          fact: mo.fact || 0,
          no_dev: mo.noDev || 0,
          has_dev: mo.hasDev || 0,
          zno: mo.zno || 0,
          colon: mo.colon || 0,
          growth: mo.growth || 0,
          percent: mo.percent || 0
        };
      });
      supabasePost('/mo_data', mos);
    }

    return {
      message: '✅ Отчёт сохранён в архив с ID ' + newId,
      id: newId,
      timestamp: now.toLocaleDateString('ru-RU')
    };
  } catch (error) {
    console.error('Ошибка сохранения в архив:', error);
    throw new Error('Не удалось сохранить отчёт: ' + error.message);
  }
}

/**
 * Получение списка архивных отчётов из Supabase
 */
function getArchivedReportsList() {
  try {
    const reports = supabaseGet('/reports?select=id,saved_date,period&order=id.desc');
    
    return reports.map(function(r) {
      var dateStr = '';
      if (r.saved_date) {
        var parts = r.saved_date.split('-');
        if (parts.length === 3) {
          dateStr = parts[2] + '.' + parts[1] + '.' + parts[0];
        } else {
          dateStr = r.saved_date;
        }
      }
      return {
        id: r.id,
        dateStr: dateStr
      };
    });
  } catch (error) {
    console.error('Ошибка получения списка архива:', error);
    return [];
  }
}

/**
 * Получение конкретного архивного отчёта по ID из Supabase
 */
function getArchivedReportById(id) {
  try {
    const report = supabaseGet('/reports?id=eq.' + id)[0];
    if (!report) throw new Error('Отчёт не найден');

    const weeks = supabaseGet('/weeks_data?report_id=eq.' + id + '&order=week_start');
    const mos = supabaseGet('/mo_data?report_id=eq.' + id + '&order=mo_name');

    // Форматируем дату
    var dateStr = '';
    if (report.saved_date) {
      var parts = report.saved_date.split('-');
      if (parts.length === 3) {
        dateStr = parts[2] + '.' + parts[1] + '.' + parts[0];
      }
    }

    return {
      period: report.period || '',
      plansText: report.plans_text || '',
      doneText: report.done_text || '',
      weeksData: weeks.map(function(w) {
        return {
          start: w.week_start,
          end: w.week_end,
          value: w.value
        };
      }),
      mosData: mos
        .sort(function(a, b) { return b.percent - a.percent; })  // ← СОРТИРОВКА
        .map(function(mo) {
          return {
            name: mo.mo_name,
            plan: mo.plan,
            fact: mo.fact,
            noDev: mo.no_dev,
            hasDev: mo.has_dev,
            zno: mo.zno,
            colon: mo.colon,
            growth: mo.growth,
            percent: mo.percent
          };
        }),
      timestamp: dateStr
    };
  } catch (error) {
    console.error('Ошибка получения отчёта по ID:', error);
    throw new Error('Не удалось загрузить отчёт: ' + error.message);
  }
}

/**
 * Извлекает недельные данные из последних 5 архивных записей Supabase
 */
function getLast5WeeksFromArchive() {
  try {
    // Получаем последние 5 ID отчётов
    const reports = supabaseGet('/reports?select=id&order=id.desc&limit=5');
    
    if (!reports || reports.length === 0) {
      return { weeks: [], message: 'Архив пуст' };
    }

    const ids = reports.map(function(r) { return r.id; }).sort(function(a, b) { return a - b; });
    
    var allWeeksData = [];
    var lastMosData = null;
    var lastPeriod = '';
    var lastDoneText = '';
    var lastPlansText = '';

    // Для каждого отчёта получаем недельные данные
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      var weeks = supabaseGet('/weeks_data?report_id=eq.' + rid + '&order=week_start');
      
      for (var j = 0; j < weeks.length; j++) {
        allWeeksData.push({
          start: weeks[j].week_start,
          end: weeks[j].week_end,
          value: weeks[j].value,
          sourceId: rid
        });
      }

      // Берём данные самого нового отчёта (последний в сортировке)
      if (i === ids.length - 1) {
        var lastReport = supabaseGet('/reports?id=eq.' + rid)[0];
        if (lastReport) {
          lastPeriod = lastReport.period || '';
          lastDoneText = lastReport.done_text || '';
          lastPlansText = lastReport.plans_text || '';
          
          var mos = supabaseGet('/mo_data?report_id=eq.' + rid + '&order=mo_name');
          lastMosData = mos.map(function(mo) {
            return {
              name: mo.mo_name,
              plan: mo.plan,
              fact: mo.fact,
              noDev: mo.no_dev,
              hasDev: mo.has_dev,
              zno: mo.zno,
              colon: mo.colon,
              growth: mo.growth,
              percent: mo.percent
            };
          });
        }
      }
    }

    // Убираем дубликаты недель
    var uniqueWeeks = [];
    var seenPeriods = {};
    
    for (var k = 0; k < allWeeksData.length; k++) {
      var w = allWeeksData[k];
      var key = w.start + '_' + w.end;
      if (!seenPeriods[key]) {
        seenPeriods[key] = true;
        uniqueWeeks.push(w);
      }
    }

    // Сортируем по дате
    uniqueWeeks.sort(function(a, b) {
      if (a.start < b.start) return -1;
      if (a.start > b.start) return 1;
      return 0;
    });

    console.log('Извлечено ' + uniqueWeeks.length + ' уникальных недель из ' + ids.length + ' архивных записей');

    return {
      weeks: uniqueWeeks,
      lastMosData: lastMosData,
      lastPeriod: lastPeriod,
      lastDoneText: lastDoneText,
      lastPlansText: lastPlansText,
      totalArchivedReports: ids.length,
      usedReports: ids.length
    };
  } catch (error) {
    console.error('Ошибка получения недель из архива:', error);
    return { weeks: [], message: 'Ошибка: ' + error.message };
  }
}

// ==================== D4: БЭКАП (ОСТАВЛЯЕМ В GOOGLE SHEETS) ====================

function getCurrentDataForBackup() {
  try {
    // Бэкап остаётся в Google Sheets — это нормально
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    return data;
  } catch (error) {
    console.error('Ошибка получения данных для бэкапа:', error);
    return [];
  }
}

function saveBackupToSheet(sheetName, backup) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Timestamp', 'Operation', 'Data', 'Size']);
    }

    sheet.appendRow([
      backup.id,
      backup.timestamp,
      backup.operation,
      JSON.stringify(backup.data),
      backup.size
    ]);

    const maxBackups = 10;
    const totalRows = sheet.getLastRow();
    if (totalRows > maxBackups + 1) {
      sheet.deleteRows(maxBackups + 2, totalRows - maxBackups - 1);
    }

    return true;
  } catch (error) {
    console.error('Ошибка сохранения бэкапа:', error);
    return false;
  }
}

function restoreFromBackup(backupData) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    if (backupData && backupData.length > 0) {
      sheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
    }
    return true;
  } catch (error) {
    console.error('Ошибка восстановления из бэкапа:', error);
    return false;
  }
}

function deleteBackupFromSheet(sheetName, backupId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === backupId) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Ошибка удаления бэкапа:', error);
    return false;
  }
}


// ==================== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ====================
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}