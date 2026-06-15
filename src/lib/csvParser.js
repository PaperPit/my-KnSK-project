/**
 * =============================================================================
 * csvParser.js — чтение CSV-выгрузки по МО
 * =============================================================================
 *
 * ОЖИДАЕМЫЕ КОЛОНКИ (первая строка — заголовки):
 *   Наименование МО, План на год, Общий итог, Динамика с прошлой недели,
 *   Прошли колоноскопию, Выявлено ЗНО C18-C21, Нет отклонений, Есть отклонения
 *
 * ГДЕ ВЫЗЫВАЕТСЯ: src/pages/editor.js при загрузке файла через <input type="file">
 *
 * ВАЖНО:
 *   - Поддерживает кавычки в ячейках (поля с запятыми внутри)
 *   - Убирает BOM (\uFEFF) в начале файла из Excel
 *   - Строки короче 5 колонок пропускаются
 *
 * ПОСЛЕ ПРАВОК: npm run build → npm test (tests/csvParser.test.js)
 * =============================================================================
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map((h) => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = [];
    let inQ = false;
    let cur = '';
    // Построчный разбор с учётом кавычек
    for (const ch of lines[i]) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) {
        vals.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    vals.push(cur.trim());
    if (vals.length < 5) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || '';
    });
    data.push(row);
  }
  return data;
}
