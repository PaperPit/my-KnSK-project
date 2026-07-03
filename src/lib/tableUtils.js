/**
 * =============================================================================
 * tableUtils.js — сортировка и экспорт сводной таблицы МО
 * =============================================================================
 *
 * sortMosForTable — сортировка по любому столбцу (name — по алфавиту ru,
 *                   остальные — числовые)
 * buildTableCsv   — CSV с разделителем «;» (Excel ru), без BOM (добавляет UI)
 *
 * Чистые функции — покрыты tests/tableUtils.test.js.
 * ПОСЛЕ ПРАВОК: npm run build → npm test
 * =============================================================================
 */

export const TABLE_SORT_COLUMNS = {
  name: 'string',
  plan: 'number',
  fact: 'number',
  percent: 'number',
  growth: 'number',
  noDev: 'number',
  hasDev: 'number',
  colon: 'number',
  zno: 'number',
};

/** Направление сортировки по умолчанию для столбца. */
export function defaultSortDir(key) {
  return TABLE_SORT_COLUMNS[key] === 'string' ? 'asc' : 'desc';
}

/**
 * Отсортированная копия массива МО.
 * @param {Array} mos
 * @param {string} key — ключ из TABLE_SORT_COLUMNS (иначе percent)
 * @param {string} dir — 'asc' | 'desc'
 */
export function sortMosForTable(mos, key, dir) {
  const sortKey = TABLE_SORT_COLUMNS[key] ? key : 'percent';
  const isString = TABLE_SORT_COLUMNS[sortKey] === 'string';
  const mult = dir === 'asc' ? 1 : -1;

  return [...(mos || [])].sort((a, b) => {
    if (isString) {
      return (
        mult *
        String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), 'ru', {
          sensitivity: 'base',
        })
      );
    }
    const av = Number(a[sortKey]) || 0;
    const bv = Number(b[sortKey]) || 0;
    if (av !== bv) return mult * (av - bv);
    // Стабильность при равных значениях — по названию
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
  });
}

const CSV_HEADER = [
  '№',
  'Наименование МО',
  'План на год',
  'Итого (факт)',
  '% плана',
  'Динамика за неделю',
  'Нет отклонений',
  'Есть отклонения (КнСК+)',
  'Прошли колоноскопию',
  'ЗНО',
];

function csvCell(value) {
  const s = String(value == null ? '' : value);
  if (/[";\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * CSV текущего представления таблицы (разделитель «;», десятичная запятая).
 * @param {Array} mos — уже отсортированный (и отфильтрованный) список МО
 */
export function buildTableCsv(mos) {
  const rows = [CSV_HEADER.map(csvCell).join(';')];
  (mos || []).forEach((m, i) => {
    rows.push(
      [
        i + 1,
        m.name || '',
        Number(m.plan) || 0,
        Number(m.fact) || 0,
        (Number(m.percent) || 0).toFixed(1).replace('.', ','),
        Number(m.growth) || 0,
        Number(m.noDev) || 0,
        Number(m.hasDev) || 0,
        Number(m.colon) || 0,
        Number(m.zno) || 0,
      ]
        .map(csvCell)
        .join(';')
    );
  });
  return rows.join('\r\n');
}
