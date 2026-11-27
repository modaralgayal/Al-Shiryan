#!/usr/bin/env python3
"""Convert the client's drug spreadsheet (Product | Pack | Molecule) into
backend/src/db/data/drugs.json. Stdlib only.   Usage: python3 scripts/xlsx_to_drugs.py <file.xlsx>"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
z = zipfile.ZipFile(sys.argv[1])
ss = [''.join(t.text or '' for t in si.iter(M + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).iter(M + 'si')]

# pick the sheet whose header row is Product | Pack | Molecule
def sheet_rows(path):
    for r in ET.fromstring(z.read(path)).iter(M + 'row'):
        d = {}
        for c in r.findall(M + 'c'):
            v = c.find(M + 'v')
            if v is not None:
                d[re.match(r'[A-Z]+', c.get('r')).group()] = ss[int(v.text)] if c.get('t') == 's' else v.text
        if d:
            yield d

clean = lambda s: re.sub(r'\s+', ' ', (s or '').replace('`', "'")).strip()
out, seen = [], set()
for path in sorted(n for n in z.namelist() if n.startswith('xl/worksheets/sheet')):
    for d in sheet_rows(path):
        name, pack, mol = clean(d.get('A')), clean(d.get('B')), clean(d.get('C'))
        if not name or name == 'Product' or not mol:
            continue
        toks = pack.split(' ')
        i = next((k for k, t in enumerate(toks) if re.search(r'\d', t)), len(toks))
        form = ' '.join(toks[:i]) or pack
        rest = toks[i:]
        if rest and re.fullmatch(r"\d+'S", rest[-1]):   # trailing pack count, e.g. 30'S
            rest = rest[:-1]
        strength = ' '.join(rest)
        key = (name, pack, mol)
        if key in seen:
            continue
        seen.add(key)
        out.append({'name': name, 'form': form, 'strength': strength, 'pack': pack, 'molecule': mol})

out.sort(key=lambda r: (r['name'], r['pack']))
json.dump(out, open('backend/src/db/data/drugs.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'drugs written')
