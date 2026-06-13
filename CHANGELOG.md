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

### Changed

- `Index.html` и `Viewer.html` упрощены; логика перенесена в `src/pages/`
- `Code.js` генерируется из `src/server/*`
- `dashboardPhase1/2` используют общую библиотеку `KnSKLib`
- `scripts/build-plan-mapping.py` читает Excel из `data/plans/` вместо абсолютных путей Downloads

### Removed

- Неиспользуемые модули: `VirtualTable`, `SkeletonLoader`, `EventBus`, `StateManager`, `Logger`, `BackupManager`

## [1.0.0] — ранее

- Веб-приложение GAS: редактор и viewer, архив отчётов, дашборд KPI и сравнение периодов
