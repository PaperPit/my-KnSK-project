# Contributing

Спасибо за участие в развитии дашборда КнСК. Ниже — минимальный процесс для локальной разработки и отправки изменений.

## Требования

- Node.js 20+
- Python 3 (только для `npm run build:plans`)
- [clasp](https://github.com/google/clasp) — для деплоя в Google Apps Script

## Карта кода

Навигатор «что править для типовых задач»: [docs/CODE_MAP.md](docs/CODE_MAP.md)

## Локальная разработка

```bash
npm install
npm run build    # собрать GAS-артефакты из src/
npm test         # unit-тесты (Vitest)
npm run lint     # ESLint
npm run check    # lint + test + build + проверка синхронизации артефактов
```

Исходники живут в `src/`; в корне проекта генерируются `Code.js`, `*Page.html`, `LibBundle.html` и другие файлы для GAS. **Не редактируйте сгенерированные артефакты вручную** — правки вносите в `src/` и пересобирайте.

## Структура изменений

| Что меняете | Где править |
|-------------|-------------|
| Сервер GAS (архив, doGet) | `src/server/` |
| Клиентские страницы | `src/pages/`, `Index.html`, `Viewer.html` |
| Дашборд | `src/dashboard/` |
| Общая логика (CSV, KPI) | `src/lib/` |
| Плановые константы | `config.js` |
| Стили | `src/ui/` |

## Тесты

- Фикстуры: `tests/fixtures/`
- Новая логика в `src/lib/` должна сопровождаться тестом в `tests/*.test.js`
- Запуск: `npm test` или `npm run test:watch`

## Планы МО (Excel)

Файлы планов кладите в `data/plans/`:

- `Годовой План КнСК старый .xlsx`
- `План КнСк 2026 2.0.xlsx`

Пересборка маппинга:

```bash
npm run build:plans
```

## Деплой

1. `npm run build`
2. `clasp push` (в GAS уходят только файлы из корня; `src/`, тесты и `eslint.config.js` исключены через `.claspignore`)
3. В Apps Script: **Развёртывание → Управление развёртываниями → Новая версия**

Подробный чеклист — в [docs/deploy-checklist.md](docs/deploy-checklist.md).

## Pull request

1. Ветка от `main` / `master`
2. `npm run check` проходит без ошибок
3. Краткое описание: что изменилось и зачем
4. При изменении формата архива — обновите `docs/archive-schema.json`

## Форматирование

```bash
npm run format       # Prettier
npm run format:check # проверка без записи
```
