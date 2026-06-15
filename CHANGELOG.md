# Changelog

Все заметные изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Сборка GAS-артефактов через `npm run build` (`scripts/build-gas.mjs`)
- Модульная структура: `src/lib/`, `src/server/`, `src/pages/`
- Unit-тесты Vitest для парсинга CSV, чисел, KPI и нормализации архива
- CI workflow (`.github/workflows/ci.yml`)
- Документация: `CONTRIBUTING.md`, `docs/archive-schema.json`, `docs/deploy-checklist.md`
- Каталог `data/plans/` для Excel-файлов планов МО
- Экспорт чистых `_`-хелперов из `src/server/archive.js` и `migrations.js` через
  `module.exports` для unit-тестирования
- Тесты серверных хелперов: `tests/archiveHelpers.test.js`,
  `tests/migrationHelpers.test.js` (44 новых кейса)

### Changed

- `Index.html` и `Viewer.html` упрощены; логика перенесена в `src/pages/`
- `Code.js` генерируется из `src/server/*`
- `dashboardPhase1/2` используют общую библиотеку `KnSKLib`
- `scripts/build-plan-mapping.py` читает Excel из `data/plans/` вместо абсолютных путей Downloads
- Поиск по таблице МО дебаунсится (150 мс) — устраняет лаг при вводе в фильтр
  (`setupTableSearch`, `dashboardPhase1.js`)
- Клиентские `console.log`/`console.warn` в `viewer.js`/`editor.js` скрыты за
  флагом `window.__KNSK_DEBUG`
- Пустые `catch` в кэш-хелперах `archive.js` теперь логируют предупреждение в Stackdriver

### Removed

- Неиспользуемые модули: `VirtualTable`, `SkeletonLoader`, `EventBus`, `StateManager`, `Logger`, `BackupManager`
- `src/server/backup.js` — мёртвый код (4 функции без вызовов), убран из сборки `Code.js`
- `src/docs/DocGenerator.js` — инструмент разработчика, не подключался к шаблонам и сборке
- Осиротевшие UI-файлы: `src/ui/chartTheme.js` + `UiChartTheme.html`,
  `src/ui/motionInit.js` + `UiMotionInit.html`, `src/ui/saas-components.css` +
  `UiSaasComponents.html` — не подключались ни одним `include()`

## [1.0.0] — ранее

- Веб-приложение GAS: редактор и viewer, архив отчётов, дашборд KPI и сравнение периодов
