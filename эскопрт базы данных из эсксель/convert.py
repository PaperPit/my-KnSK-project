#!/usr/bin/env python3
"""
Конвертирует archive.csv (из Google Таблиц) в готовый SQL для Supabase.
Запуск: python convert.py
На выходе: import_data.sql — скопируйте его содержимое в Supabase SQL Editor.
"""

import csv
import json
from datetime import datetime


def esc(val):
    """Экранирование строки для SQL."""
    if val is None:
        return 'NULL'
    return "'" + str(val).replace("'", "''") + "'"


def convert_date(date_str):
    """
    Конвертирует дату из DD.MM.YYYY в YYYY-MM-DD для PostgreSQL.
    """
    if not date_str or str(date_str).strip() == '':
        return None

    date_str = str(date_str).strip()

    try:
        dt = datetime.strptime(date_str, '%d.%m.%Y')
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        pass

    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return date_str
    except ValueError:
        pass

    try:
        dt = datetime.fromisoformat(date_str)
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        pass

    return None


def main():
    try:
        with open('archive.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except FileNotFoundError:
        print("❌ Файл archive.csv не найден!")
        print("   Положите archive.csv в ту же папку, где лежит convert.py")
        return
    except Exception as e:
        print(f"❌ Ошибка при чтении archive.csv: {e}")
        return

    if not rows:
        print("❌ archive.csv пуст!")
        return

    print(f"📄 Найдено записей: {len(rows)}")

    sql = []
    sql.append("-- ============================================================")
    sql.append("-- Автосгенерированный импорт данных из Google Sheets в Supabase")
    sql.append(f"-- Записей: {len(rows)}")
    sql.append(f"-- Сгенерировано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sql.append("-- ============================================================")
    sql.append("")

    errors = 0

    for row in rows:
        rid = row.get('ID', '').strip()
        saved_raw = row.get('Дата сохранения', '').strip()
        period = row.get('Период', '').strip()

        if not rid:
            print("⚠️ Пропущена строка без ID")
            errors += 1
            continue

        try:
            rid = int(rid)
        except ValueError:
            print(f"⚠️ Некорректный ID: '{rid}'")
            errors += 1
            continue

        saved_date = convert_date(saved_raw)
        if saved_date is None:
            print(f"⚠️ Не удалось распознать дату в ID={rid}: '{saved_raw}'")
            errors += 1
            continue

        json_raw = row.get('Данные (JSON)', '')
        if not json_raw or json_raw.strip() == '':
            print(f"⚠️ Пустой JSON в ID={rid}")
            errors += 1
            continue

        try:
            data = json.loads(json_raw)
        except json.JSONDecodeError as e:
            print(f"⚠️ Ошибка JSON в ID={rid}: {e}")
            errors += 1
            continue

        plans = data.get('plansText', '')
        done = data.get('doneText', '')

        # 1. INSERT в таблицу reports
        sql.append(f"-- Отчёт #{rid} (сохранён: {saved_date})")
        sql.append(
            f"INSERT INTO reports (id, saved_date, period, plans_text, done_text) VALUES ("
            f"{rid}, {esc(saved_date)}, {esc(period)}, {esc(plans)}, {esc(done)}"
            f");"
        )

        # 2. INSERT в таблицу weeks_data
        weeks = data.get('weeksData', [])
        if weeks:
            sql.append(f"-- Недельные данные для отчёта #{rid}")
            for w in weeks:
                w_start = convert_date(w.get('start', ''))
                w_end = convert_date(w.get('end', ''))
                w_value = w.get('value', 0)

                if w_start is None or w_end is None:
                    print(f"⚠️ Пропущена неделя с плохой датой в ID={rid}: start={w.get('start')}, end={w.get('end')}")
                    continue

                sql.append(
                    f"INSERT INTO weeks_data (report_id, week_start, week_end, value) VALUES ("
                    f"{rid}, {esc(w_start)}, {esc(w_end)}, {w_value}"
                    f");"
                )

        # 3. INSERT в таблицу mo_data
        mos = data.get('mosData', [])
        if mos:
            sql.append(f"-- Данные МО для отчёта #{rid} ({len(mos)} организаций)")
            for mo in mos:
                mo_name = mo.get('name', '')
                if not mo_name:
                    print(f"⚠️ Пропущена МО без имени в ID={rid}")
                    continue

                sql.append(
                    f"INSERT INTO mo_data (report_id, mo_name, plan, fact, no_dev, has_dev, zno, colon, growth, percent) VALUES ("
                    f"{rid}, "
                    f"{esc(mo_name)}, "
                    f"{mo.get('plan', 0)}, "
                    f"{mo.get('fact', 0)}, "
                    f"{mo.get('noDev', 0)}, "
                    f"{mo.get('hasDev', 0)}, "
                    f"{mo.get('zno', 0)}, "
                    f"{mo.get('colon', 0)}, "
                    f"{mo.get('growth', 0)}, "
                    f"{mo.get('percent', 0)}"
                    f");"
                )

        sql.append("")

    # Обновляем автоинкремент ПОСЛЕ вставки
    sql.append("-- Обновляем автоинкремент после вставки")
    sql.append("SELECT setval('reports_id_seq', COALESCE((SELECT MAX(id) FROM reports), 1));")
    sql.append("")

    # Сохраняем файл
    output = 'import_data.sql'
    try:
        with open(output, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql))
    except Exception as e:
        print(f"❌ Ошибка при сохранении {output}: {e}")
        return

    total_lines = len(sql)
    print(f"\n{'='*60}")
    print(f"✅ Готово!")
    print(f"   Файл:          {output}")
    print(f"   Записей:       {len(rows)}")
    print(f"   Ошибок:        {errors}")
    print(f"   Строк SQL:     {total_lines}")
    print(f"{'='*60}")
    print(f"\n📋 Дальнейшие действия:")
    print(f"   1. Откройте Supabase Dashboard → SQL Editor")
    print(f"   2. Нажмите «New query»")
    print(f"   3. Скопируйте ВСЁ содержимое {output}")
    print(f"   4. Вставьте в SQL Editor и нажмите «Run» (Ctrl+Enter)")


if __name__ == '__main__':
    main()