# KnSK Dashboard — Design System

> Зафиксировано по скиллам `interface-design` и `baseline-ui`. Обновляйте при смене визуальных решений.

## Product intent

| | |
|---|---|
| **Пользователи** | Аналитики здравоохранения, руководители МО |
| **Задача** | Быстро оценить KPI, охват колоноскопией, сравнить периоды, найти проблемные МО |
| **Ощущение** | Спокойный, клинический, надёжный — данные важнее декора |

## Signature elements

1. **Главные KPI-карточки** — градиентные блоки (бренд дашборда), один цвет на метрику
2. **Панель сравнения** — светлые аналитические карточки с цветной левой полосой (читаемость «до → после»)
3. **Семантические дельты** — зелёный / красный / нейтральный на светлом фоне
4. **Табличные цифры** — `font-variant-numeric: tabular-nums` для всех KPI и таблиц

## Tokens (`src/ui/tokens.css`)

### Цвет

- Primary: `#1e4663` — заголовки, акценты
- Accent: `#2c7da0` — кнопки, фокус
- Success / Warning / Danger: `#1f8a4c` / `#e67e22` / `#c0392b`
- Фон: `#f0f4f8`, поверхность: `#ffffff`

### Текст

- `--text-primary` — заголовки, ключевые значения
- `--text-secondary` — основной текст
- `--text-tertiary` — подписи, метки KPI
- `--text-muted` — подсказки, вторичные пояснения

### Spacing (8px grid)

`--space-1` (4px) … `--space-6` (32px)

### Глубина

- Карточки: `border` + `--shadow-card` (без тяжёлых теней)
- Оверлей сравнения: полупрозрачный фон без blur (производительность)
- Модалка: `--shadow-elevated`

### Фокус

`--focus-ring: 0 0 0 3px rgba(44, 125, 160, 0.28)` на `:focus-visible`

## Typography

- Шрифт: Manrope + system-ui fallback
- Заголовки: `text-wrap: balance`
- Параграфы: `text-wrap: pretty`
- `-webkit-font-smoothing: antialiased`

## Motion (baseline-ui)

- Только `opacity` и `transform`, ≤200ms
- Без `transition: all`
- `@media (prefers-reduced-motion: reduce)` — отключение анимаций оверлея и спиннера

## Компоненты

| Компонент | Файл | Примечание |
|-----------|------|------------|
| KPI главный | `kpi-cards.css` | Градиент, мягкая тень |
| Сравнение KPI | `phase2.css` | Поверхность + accent border-left |
| Сигналы | `tokens.css` | Белая карточка, без градиента |
| Таблица МО | `tokens.css` | Sticky header, zebra |

## Anti-patterns (не делать)

- Декоративные градиенты на аналитических блоках сравнения
- `backdrop-filter: blur` на больших оверлеях
- Произвольные отступы вне 8px-сетки
- Анимации >200ms на UI-переходах
- `transition: all`

## Accessibility (fixing-accessibility)

- Модалки: `role="dialog"`, `aria-modal`, focus trap, восстановление фокуса на триггер
- Escape закрывает оверлеи (уже было)
- Строки таблицы: `tabindex="0"`, Enter/Space, `aria-label`
- Селекты сравнения: `aria-labelledby` + `.visually-hidden`
- Загрузка: `aria-busy`, `aria-live="polite"`, ошибки — `role="alert"`
- Кнопки редактора: нативные `<button>` вместо `<div onclick>`

## Motion (emil-design-eng)

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--duration-fast: 160ms`
- `:active { transform: scale(0.96) }` на кнопках
- Без `scale(0.98)` на входе модалок — только `translateY(8px)`
- Hover только `@media (hover: hover) and (pointer: fine)`

- [ ] Цифры с tabular-nums
- [ ] `:focus-visible` на интерактивных элементах
- [ ] `prefers-reduced-motion` для новых анимаций
- [ ] Контраст текста WCAG AA на светлых карточках
- [ ] Hit area кнопок ≥40×40px где возможно
