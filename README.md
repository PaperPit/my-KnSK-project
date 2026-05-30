# Онкоскрининг — дашборд отчётности по КнСК

Веб-приложение на **Google Apps Script** для подготовки, просмотра и архивирования отчётов по онкоскринингу (КнСК) в разрезе медицинских организаций (МО).

---

## Возможности

### Редактор (`Index.html`)

- Загрузка CSV и сохранение/загрузка из архива Google Таблицы
- Недельная динамика (ручной ввод недель + графики)
- Текстовые блоки «Сделано» и «Планы»
- Сравнение двух архивных отчётов
- Экспорт автономного HTML
- Режим презентации

### Viewer (`Viewer.html`)

- Просмотр архивных отчётов (`?viewer=1`, опционально `&id=`)
- Сравнение периодов, презентация, drawer по МО

### Дашборд

- **Ключевые сигналы** (план 70%, недельный прирост, лидеры колоноскопии)
- **KPI** с дельтами к прошлому архиву (без дельты «к прошлому отчёту» по суммарному факту КнСК — только «за неделю»)
- Графики Chart.js: недельный план, динамика, топ/антитоп МО, охват колоноскопией
- Таблица МО с поиском, сортировкой по % плана, клик → drawer (ECharts)
- **Сравнение архивов**: ранний → поздний, топ-5 по КнСК и колоноскопиям

---

## Структура проекта

```
my-KnSK-project/
├── Code.js                    # Сервер: doGet, архив, include()
├── constants.js               # PLAN_WEEKLY, PLAN_YEAR, PLAN_THRESHOLD
├── Index.html                 # Редактор
├── Viewer.html                # Просмотр
│
├── Shared.html                # ← build: Shared (charts + archive client)
├── UiTokens.html              # ← build: src/ui/tokens.css
├── UiPhase2.html              # ← build: src/ui/phase2.css
├── DashboardPhase1.html       # ← build: src/dashboard/dashboardPhase1.js
├── DashboardPhase2.html       # ← build: src/dashboard/dashboardPhase2.js
│
├── scripts/sync-gas-includes.js
├── package.json               # npm run build:gas
│
└── src/
    ├── shared/
    │   ├── charts-week.js     # ChartsWeek — общие графики недели
    │   └── archive-client.js  # ArchiveClient — загрузка архива
    ├── dashboard/
    │   ├── dashboardPhase1.js
    │   └── dashboardPhase2.js
    └── ui/
        ├── tokens.css
        └── phase2.css
```

**Источник правды для UI-модулей — файлы в `src/`.**  
В GAS выполняются только `*.html` в корне (сгенерированные) и `constants.js`.

---

## Константы (`constants.js`)

| Константа | Значение | Назначение |
|-----------|----------|------------|
| `PLAN_WEEKLY` | 3333 | Недельный план исследований |
| `PLAN_YEAR` | 160000 | Годовой план КнСК |
| `PLAN_THRESHOLD` | 70 | Порог сигнала «низкий % плана» |

Подключается **до** `DashboardPhase1` / `DashboardPhase2`.

---

## Сборка и деплой

```bash
npm run build:gas    # src → UiTokens, UiPhase2, DashboardPhase1/2, Shared
npm run push         # build:gas + clasp push
```

Или вручную:

```bash
node scripts/sync-gas-includes.js
clasp push
```

После push — **новое развёртывание** веб-приложения в Google Apps Script.

### Порядок include в HTML

```html
<script src="constants.js"></script>
<?!= include('Shared'); ?>
<?!= include('UiTokens'); ?>
<?!= include('UiPhase2'); ?>
<?!= include('DashboardPhase1'); ?>
<?!= include('DashboardPhase2'); ?>
```

---

## Backend (`Code.js`)

| Функция | Описание |
|---------|----------|
| `saveReportToArchive` | Сохранение в лист «Архив»; ID = **max(id)+1** |
| `getArchivedReportsList` | Список отчётов |
| `getArchivedReportById` | Отчёт + нормализация `mosData` |
| `include` | Подключение HTML-фрагментов |

Лист **«Архив»**: `ID | Дата | JSON | Период`.

---

## Shared-модули

### `ChartsWeek` (`src/shared/charts-week.js`)

- `updateTrendGraph(weeks)` — массив `{start,end,value}` или `{period,value}`
- `updatePlanFactChart(growth)`
- `formatDate`

### `ArchiveClient` (`src/shared/archive-client.js`)

- `fetchList(onSuccess, onFailure)`
- `fetchReportWithPrevious(id, reportsList, onSuccess, onFailure)` — с дельтами KPI
- `fillSelect(selectEl, list, options)`

---

## Установка

1. Привязать Google Таблицу к проекту Apps Script.
2. `clasp login` → `clasp clone` / настроить `.clasp.json`.
3. `npm run push`
4. Развернуть как веб-приложение (доступ — по политике организации).

---

## Git

```bash
git add .
git commit -m "описание"
git push
```

Подробнее — `git.txt`.

---

## Примечания

- **`config.js`** — legacy-настройки (worker, virtual table); в основном потоке **не используется**.
- Модули `src/core/*`, `VirtualTable`, worker **не подключены** к Index/Viewer.
- Экспорт HTML подтягивает `Shared.html` + Phase1/2 через `fetch` (на опубликованном URL может потребоваться fallback).
