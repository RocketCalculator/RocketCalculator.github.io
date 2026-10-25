// RocketBackView: fin-count warnings, and every fin-count input in every calculator declares a back view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { finCountWarning } from '../site/js/ui/backview.js';

test('Fin-count warnings: unusual counts and counts outside the calculator’s range', () => {
  assert.match(finCountWarning(0), /No fins/);
  assert.match(finCountWarning(1), /asymmetric/);
  assert.match(finCountWarning(2), /one plane/);
  assert.equal(finCountWarning(3), '');
  assert.equal(finCountWarning(4, [3, 4]), '');
  assert.match(finCountWarning(6, [3, 4]), /not established for 6 fins \(3–4\)/);
  assert.match(finCountWarning(12, [1, 8]), /12 fins/);
  assert.equal(finCountWarning(3.4, [3, 8]), '');   // rounds like the calculators do
});

globalThis.location ??= { href: 'http://localhost/', origin: 'http://localhost', pathname: '/' };
test('Every fin-count input has a back view with a body radius, a note and a range', async () => {
  const dir = new URL('../site/js/calculators/', import.meta.url);
  let n = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const def = (await import(new URL(f, dir))).default;
    for (const fld of def.groups.flatMap((g) => g.fields)) {
      if (!(fld.shared === 'finN' || (/fin/i.test(fld.label) && /^number of fin/i.test(fld.label)))) continue;
      n++;
      assert.equal(typeof fld.backView, 'function', `${def.slug}: ${fld.id} has no backView`);
      const v = {}; for (const g of def.groups) for (const x of g.fields) v[x.id] = x.default;
      Object.assign(v, def.examples?.[0]?.values || {});
      const cfg = fld.backView(v);
      assert.ok(cfg.R > 0 && cfg.unit && cfg.note && Array.isArray(cfg.range), `${def.slug}: incomplete back view ${JSON.stringify(cfg)}`);
    }
  }
  assert.ok(n >= 7, `only ${n} fin-count inputs found`);
});
