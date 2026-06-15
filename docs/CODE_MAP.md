# Карта кода (для новых разработчиков)

Краткий навигатор: **что править**, если нужно изменить поведение.

## Частые задачи

| Задача | Файл |
|--------|------|
| Годовой / недельный план, порог 70% | [`config.js`](../config.js) |
| Парсинг чисел из CSV | [`src/lib/numbers.js`](../src/lib/numbers.js) |
| Формат CSV, новые колонки | [`src/lib/csvParser.js`](../src/lib/csvParser.js) |
| KPI, суммы по МО | [`src/lib/kpiCalculator.js`](../src/lib/kpiCalculator.js) |
| KPI-карточки, сигналы, таблица | [`src/dashboard/dashboardPhase1.js`](../src/dashboard/dashboardPhase1.js) |
| Сравнение двух отчётов, drawer | [`src/dashboard/dashboardPhase2.js`](../src/dashboard/dashboardPhase2.js) |
| Загрузка CSV, архив, экспорт HTML | [`src/pages/editor.js`](../src/pages/editor.js) |
| Режим просмотра ?viewer=1 | [`src/pages/viewer.js`](../src/pages/viewer.js) |
| Сохранение в лист «Архив» | [`src/server/archive.js`](../src/server/archive.js) |
| Миграции архива (даты, планы 2026) | [`src/server/migrations.js`](../src/server/migrations.js) |
| URL входа, viewer/editor | [`src/server/webapp.js`](../src/server/webapp.js) |
| Разметка редактора | [`Index.html`](../Index.html) |
| Разметка viewer | [`Viewer.html`](../Viewer.html) |

## Что НЕ править вручную

| Файл | Почему |
|------|--------|
| `Code.js` | Генерируется из `src/server/` |
| `LibBundle.html`, `*Page.html`, `DashboardPhase*.html` | Генерируются `npm run build` |

## Поток данных

```
CSV / архив → KnSKLib.parseCSV / normalizeArchiveReport
           → KnSKLib.buildMosFromData
           → DashboardPhase1.renderAll (KPI, таблица, графики)
           → DashboardPhase2 (сравнение, drawer)
```

Архив в Google Таблице: лист **Архив**, схема JSON — [`archive-schema.json`](archive-schema.json).

## После любых правок в src/

```bash
npm run build
clasp push
```

Новая версия развёртывания в Apps Script — обязательно.

## Тесты

```bash
npm test            # прогнать все тесты Vitest
npm run check       # lint + test + build + проверка синхронности артефактов
```

Покрытие:
- `src/lib/*` (numbers, csvParser, sanitize, archiveNormalizer, kpiCalculator) — полностью.
- `src/server/archive.js` и `migrations.js` — чистые `_`-хелперы экспортируются через
  `module.exports` и тестируются (`tests/archiveHelpers.test.js`, `tests/migrationHelpers.test.js`).
  Публичные точки входа требуют GAS-окружения (`SpreadsheetApp`, `CacheService`) и не покрываются unit-тестами.

## Узкие места / известные ограничения

- `src/dashboard/dashboardPhase1.js` (~700 строк) — единый IIFE; разбиение потребует
  рефакторинга общей области видимости. Поиск по таблице МО дебаунсится (150 мс).
- `dashboardPhase2.js` считает дельты периодов инлайн; кандидат на использование
  `KnSKLib.computePeriodDeltas` в следующей итерации.

Подробнее: [CONTRIBUTING.md](../CONTRIBUTING.md), [deploy-checklist.md](deploy-checklist.md).
