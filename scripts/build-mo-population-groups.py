#!/usr/bin/env python3
"""Собрать data/mo-population-groups.json из «Прикрепление с категориями.xlsx»."""

import json
import re
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / 'Прикрепление с категориями.xlsx'
OUT_JSON = ROOT / 'data' / 'mo-population-groups.json'

NAME_OVERRIDES = {
    'ОДИНЦОВСКАЯ ОБ': 'Одинцовская ОБ',
    'ПКБ ИМ. ПРОФ. РОЗАНОВА В.Н.': 'ПКБ им. Розанова В.Н.',
    'ЩЕЛКОВСКАЯ Б': 'Щёлковская Б',
    'ПОЛИКЛИНИКА Г.О. ВЛАСИХА': 'П г.о. Власиха',
    'КОТЕЛЬНИКОВСКАЯ ПОЛИКЛИНИКА': 'Котельниковская П',
    'КРАСНОЗНАМЕНСКАЯ ПОЛИКЛИНИКА': 'Краснознаменская П',
}

ALIASES = {
    'ПКБ им. проф. Розанова В.Н.': 'ПКБ им. Розанова В.Н.',
}

CATEGORY_MAP = {
    'менее 100 тыс.': 'малая',
    'от 100 тыс. до 200 тыс.': 'средняя',
    'свыше 200 тыс.': 'большая',
}

GROUP_META = {
    'малая': {'label': 'Малая', 'populationRange': 'менее 100 тыс.'},
    'средняя': {'label': 'Средняя', 'populationRange': 'от 100 тыс. до 200 тыс.'},
    'большая': {'label': 'Большая', 'populationRange': 'свыше 200 тыс.'},
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


def title_word(word: str) -> str:
    if word in ('Б', 'КБ', 'ОКБ', 'ОБ', 'П'):
        return word
    if word == 'Г.О.':
        return 'г.о.'
    if word == 'ИМ.':
        return 'им.'
    parts = word.split('-')
    return '-'.join(p[:1] + p[1:].lower() if p else p for p in parts)


def excel_to_dashboard_name(excel_name: str) -> str:
    key = excel_name.strip().upper()
    if key in NAME_OVERRIDES:
        return NAME_OVERRIDES[key]
    return ' '.join(title_word(w) for w in excel_name.strip().split())


def norm(name: str) -> str:
    return re.sub(r'[^a-zа-я0-9]+', '', name.lower().replace('ё', 'е'))


def main():
    rows = load_xlsx(XLSX)
    by_name = {}
    by_code = {}
    groups = {g: [] for g in GROUP_META}

    for row in rows[2:]:
        if len(row) < 4 or not row[0] or not str(row[0]).isdigit():
            continue

        code = str(row[0]).strip()
        excel_name = row[1].strip()
        population = int(float(row[2]))
        category_raw = row[3].strip()
        group = CATEGORY_MAP.get(category_raw.strip().lower())
        if not group:
            raise ValueError(f'Unknown category: {category_raw!r}')

        name = excel_to_dashboard_name(excel_name)
        entry = {
            'code': code,
            'name': name,
            'nameExcel': excel_name,
            'population': population,
            'categoryRaw': category_raw,
            'group': group,
        }
        by_name[name] = entry
        by_code[code] = entry
        groups[group].append(name)

    for alias, canonical in ALIASES.items():
        if canonical in by_name and alias not in by_name:
            src = by_name[canonical]
            by_name[alias] = {**src, 'name': alias, 'aliasOf': canonical}

    by_normalized = {
        norm(k): {'name': k, **{kk: vv for kk, vv in v.items() if kk != 'name'}}
        for k, v in by_name.items()
    }

    payload = {
        'source': 'Прикрепление с категориями.xlsx',
        'generatedAt': date.today().isoformat(),
        'groupDefinitions': GROUP_META,
        'groups': {k: sorted(v) for k, v in groups.items()},
        'byName': by_name,
        'byCode': by_code,
        'byNormalizedName': by_normalized,
        'moCount': len([k for k in by_name if 'aliasOf' not in by_name[k]]),
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {OUT_JSON} ({payload["moCount"]} MO)')


if __name__ == '__main__':
    main()
