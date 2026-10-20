"""Read Excel's own cached cell values straight from the original .xls files (no recalculation),
so VBA-dependent cells keep the numbers Excel computed. Output: data/spreadsheets/excel-cached/<name>.json
as {sheet: {A1: value}}. Needs xlrd."""
import glob, json, os, xlrd
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = f'{ROOT}/data/spreadsheets/excel-cached'; os.makedirs(out, exist_ok=True)
for p in sorted(glob.glob(f'{ROOT}/source/rsandt/media/*.xls')):
    wb = xlrd.open_workbook(p)
    book = {}
    for sh in wb.sheets():
        cells = {}
        for r in range(sh.nrows):
            for c in range(sh.ncols):
                cell = sh.cell(r, c)
                if cell.ctype in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK): continue
                v = cell.value
                if cell.ctype == xlrd.XL_CELL_ERROR: v = xlrd.error_text_from_code.get(v, '#ERR')
                elif cell.ctype == xlrd.XL_CELL_BOOLEAN: v = bool(v)
                cells[xlrd.cellname(r, c)] = v
        book[sh.name] = cells
    name = os.path.splitext(os.path.basename(p))[0]
    json.dump(book, open(f'{out}/{name}.json', 'w'))
    print('ok', name)
