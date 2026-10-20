// Tabular exports: CSV/TSV quoting, Excel sheet names, CRC-32 and the stored ZIP/XLSX container.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDelimited, sheetNames, crc32, zip, toXLSX } from '../site/js/ui/tabular.js';

const td = new TextDecoder();
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u16 = (b, o) => b[o] | (b[o + 1] << 8);

/** Minimal reader for our stored ZIPs: walks the central directory and returns { name: text }. */
function unzip(bytes) {
  let e = bytes.length - 22;
  assert.equal(u32(bytes, e), 0x06054b50, 'end of central directory');
  const n = u16(bytes, e + 10), files = {};
  let p = u32(bytes, e + 16);
  for (let i = 0; i < n; i++) {
    assert.equal(u32(bytes, p), 0x02014b50);
    const crc = u32(bytes, p + 16), size = u32(bytes, p + 24), nl = u16(bytes, p + 28), off = u32(bytes, p + 42);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nl));
    assert.equal(u32(bytes, off), 0x04034b50, `local header ${name}`);
    const start = off + 30 + u16(bytes, off + 26) + u16(bytes, off + 28), data = bytes.subarray(start, start + size);
    assert.equal(crc32(data), crc, `crc ${name}`);
    files[name] = td.decode(data);
    p += 46 + nl;
  }
  return files;
}

test('CRC-32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test('CSV quotes commas, quotes and newlines; TSV flattens tabs', () => {
  const sh = [{ name: 'a', rows: [['x, y', 'say "hi"', 'two\nlines'], [1, null, '']] }];
  assert.equal(toDelimited(sh, ','), '"x, y","say ""hi""","two\nlines"\n1,,\n');
  assert.equal(toDelimited([{ name: 'a', rows: [['a\tb', 2]] }], '\t'), 'a b\t2\n');
  const two = toDelimited([{ name: 'S1', rows: [[1]] }, { name: 'S2', rows: [[2]] }]);
  assert.equal(two, '# S1\n1\n\n# S2\n2\n');
});

test('Sheet names are legal and unique', () => {
  const names = sheetNames(['Flutter: M vs h?', 'flutter  M vs h', '', 'x'.repeat(40), 'x'.repeat(40)]);
  assert.deepEqual(names.slice(0, 3), ['Flutter M vs h', 'flutter M vs h (2)', 'Sheet3']);
  for (const n of names) { assert.ok(n.length <= 31, n); assert.ok(!/[[\]:*?/\\]/.test(n), n); }
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
});

test('XLSX: valid container, numbers stored as numbers, text escaped', () => {
  const files = unzip(toXLSX([{ name: 'Data', rows: [['h (m)', 'M_f'], [0, '1.25'], ['<a & b>', 'é°'], [-3e-7, 'NaN']] }, { name: 'Two', rows: [] }]));
  assert.deepEqual(Object.keys(files).sort(), ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
  const s1 = files['xl/worksheets/sheet1.xml'];
  assert.match(s1, /<c r="B2"><v>1\.25<\/v><\/c>/);
  assert.match(s1, /<c r="A4"><v>-3e-7<\/v><\/c>/);
  assert.match(s1, /&lt;a &amp; b&gt;/);
  assert.match(s1, /<c r="B4" t="inlineStr"><is><t xml:space="preserve">NaN<\/t>/, 'NaN stays text');
  assert.match(s1, /<c r="A1" t="inlineStr" s="1">/, 'header bold');
  assert.match(files['xl/workbook.xml'], /<sheet name="Two" sheetId="2" r:id="rId2"\/>/);
  for (const [n, x] of Object.entries(files)) assert.ok(x.startsWith('<?xml'), n);
});

test('ZIP of many files keeps offsets consistent', () => {
  const enc = new TextEncoder();
  const f = Array.from({ length: 40 }, (_, i) => ({ name: `f${i}.txt`, data: enc.encode('x'.repeat(i * 37)) }));
  const out = unzip(zip(f));
  assert.equal(Object.keys(out).length, 40);
  assert.equal(out['f39.txt'].length, 39 * 37);
});

test('Column letters past Z', () => {
  const row = Array.from({ length: 30 }, (_, i) => i);
  const s = unzip(toXLSX([{ name: 'w', rows: [row] }]))['xl/worksheets/sheet1.xml'];
  assert.match(s, /<c r="Z1"><v>25<\/v>/); assert.match(s, /<c r="AD1"><v>29<\/v>/);
});
