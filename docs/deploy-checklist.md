# Deploy checklist (Google Apps Script)

Чеклист перед выкладкой изменений в продакшен.

## Перед сборкой

- [ ] Изменения в `src/` прошли ревью
- [ ] `npm run check` завершился без ошибок локально
- [ ] При изменении `config.js` — согласованы новые `PLAN_YEAR` / `PLAN_WEEKLY` / `PLAN_THRESHOLD`
- [ ] При изменении планов МО — Excel в `data/plans/`, выполнен `npm run build:plans`

## Сборка

```bash
npm install
npm run build
```

Проверьте, что обновились (при соответствующих правках):

- [ ] `Code.js`
- [ ] `LibBundle.html`
- [ ] `DashboardPhase1.html`, `DashboardPhase2.html`
- [ ] `EditorPage.html`, `ViewerPage.html`
- [ ] `UiTokens.html`, `UiPhase2.html`, `EditorStyles.html`, `ViewerStyles.html`
- [ ] `Index.html`, `Viewer.html` (если менялась разметка)

## clasp

```bash
clasp push
```

- [ ] `scriptId` в `.clasp.json` указывает на нужный проект
- [ ] Нет конфликтов с ручными правками в облачном редакторе GAS

## Развёртывание в GAS

1. Откройте проект в [script.google.com](https://script.google.com)
2. **Развёртывание → Управление развёртываниями**
3. **Изменить** существующее веб-приложение или **Новое развёртывание**
4. Тип: **Веб-приложение**
5. Версия: **Новая версия**
6. Выполнять от имени: владелец / по политике организации
7. Доступ: по политике (см. `appsscript.json`)

## После деплоя

- [ ] Открывается редактор (URL развёртывания)
- [ ] Viewer: `?viewer=1` и `?viewer=1&id=<ID>`
- [ ] Загрузка CSV, сохранение и чтение из архива
- [ ] KPI и графики отображаются
- [ ] Сравнение двух архивных отчётов
- [ ] Обновлён URL «Веб-версии» в `Index.html`, если изменился deployment ID

## Откат

1. В GAS: развёртывание → предыдущая версия
2. Локально: `git checkout <commit>` → `npm run build` → `clasp push`

## Безопасность

- [ ] `ANYONE_ANONYMOUS` в манифесте осознан (или доступ ограничен)
- [ ] URL развёртывания не опубликован в открытых источниках без необходимости
