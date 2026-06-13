#!/usr/bin/env python3
"""Собрать plan2026-mapping.json и PlanMapping2026.js из Excel-планов."""

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PLANS_DIR = ROOT / 'data' / 'plans'
OLD_XLSX = PLANS_DIR / 'Годовой План КнСК старый .xlsx'
NEW_XLSX = PLANS_DIR / 'План КнСк 2026 2.0.xlsx'
OUT_JSON = ROOT / 'plan2026-mapping.json'
OUT_JS = ROOT / 'PlanMapping2026.js'

ALIASES = {
    'ПКБ им. проф. Розанова В.Н.': 'ПКБ им. Розанова В.Н.',
    'Люберецкая ОБ': 'Люберецкая ОКБ',
}


def load_xlsx(path: Path):
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in root.findall('m:si', ns):
                texts = [t.text or '' for t in si.findall('.//m:t', ns)]
                shared.append(''.join(texts))

        sheet = sorted(
            n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')
        )[0]
        root = ET.fromstring(z.read(sheet))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = []
        for row in root.findall('m:sheetData/m:row', ns):
            values = []
            for cell in row.findall('m:c', ns):
                cell_type = cell.get('t')
                value_el = cell.find('m:v', ns)
                value = value_el.text if value_el is not None else ''
                if cell_type == 's' and value != '':
                    value = shared[int(value)]
                values.append(value)
            rows.append(values)
        return rows


def norm(name: str) -> str:
    return re.sub(r'[^a-zа-я0-9]+', '', name.lower().replace('ё', 'е'))


def main():
    new_rows = load_xlsx(NEW_XLSX)
    by_short = {}
    for row in new_rows[1:]:
        if not row or len(row) < 7:
            continue
        short_name = row[1].strip()
        if not short_name:
            continue
        by_short[short_name] = round(float(row[6]))

    mapping = dict(by_short)
    for old_name, new_short in ALIASES.items():
        if new_short in by_short:
            mapping[old_name] = by_short[new_short]

    payload = {
        'byShortName': mapping,
        'byNormalizedShortName': {norm(k): v for k, v in by_short.items()},
        'aliases': ALIASES,
        'totalNewPlan': sum(by_short.values()),
        'moCount': len(by_short),
    }

    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    js = '\n'.join([
        '/**',
        ' * Карта годовых планов МО на 2026 (220 000 суммарно).',
        ' * Сгенерировано из Excel. Пересобрать: python3 scripts/build-plan-mapping.py',
        ' */',
        'function getPlanMapping2026() {',
        f'  return {json.dumps(payload, ensure_ascii=False, indent=2)};',
        '}',
        '',
    ])
    OUT_JS.write_text(js, encoding='utf-8')
    print(f'OK: {len(by_short)} МО, сумма {payload["totalNewPlan"]}')
    print(f'JSON -> {OUT_JSON}')
    print(f'JS   -> {OUT_JS}')


if __name__ == '__main__':
    main()
