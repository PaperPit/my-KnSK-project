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

Подробнее: [CONTRIBUTING.md](../CONTRIBUTING.md), [deploy-checklist.md](deploy-checklist.md).
