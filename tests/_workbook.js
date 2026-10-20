// Test helper: Excel's own cached cell values, read from the original .xls (scripts/extract_xls_cached.py).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

export function workbook(name, sheet = 'Sheet1') {
  const book = JSON.parse(readFileSync(new URL(`../data/spreadsheets/excel-cached/${name}.json`, import.meta.url), 'utf8'));
  const cells = book[sheet];
  if (!cells) throw new Error(`No sheet ${sheet} in ${name}`);
  const get = (ref) => {
    if (!(ref in cells)) throw new Error(`${name}!${ref} is empty`);
    return cells[ref];
  };
  get.cells = cells;
  return get;
}

/** Assert |a − b| ≤ rel·max(|b|, floor). Records the comparison for the summary. */
export const stats = { compared: 0, maxRel: 0 };
export function close(actual, expected, rel = 1e-9, label = '', floor = 1e-12) {
  assert.ok(Number.isFinite(actual), `${label}: got ${actual}`);
  const err = Math.abs(actual - expected) / Math.max(Math.abs(expected), floor);
  stats.compared++;
  stats.maxRel = Math.max(stats.maxRel, err);
  assert.ok(err <= rel, `${label}: ${actual} vs workbook ${expected} (rel err ${err.toExponential(2)} > ${rel})`);
}
