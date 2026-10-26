// Shared rocket: every calculator agrees on what a shared key means; pull/push round-trips; design files validate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { SHARED, sharedLinks, pullShared, pushShared, designFile, parseDesignFile, fileSlug, delta } from '../site/js/design.js';

const dir = new URL('../site/js/calculators/', import.meta.url);
const defs = await Promise.all(readdirSync(dir).filter((f) => f.endsWith('.js')).map(async (f) => (await import(new URL(f, dir))).default));
const bySlug = Object.fromEntries(defs.map((d) => [d.slug, d]));
const defaults = (def) => {
  const v = {};
  for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
  if (def.examples?.[0]) Object.assign(v, structuredClone(def.examples[0].values));
  return v;
};

test('Shared keys are known and use one dimension and internal unit everywhere', () => {
  const seen = {};
  for (const def of defs) for (const l of sharedLinks(def)) {
    assert.ok(l.key in SHARED, `${def.slug}.${l.id}: unknown key ${l.key}`);
    if (typeof l.field.shared !== 'string') continue;   // derived links convert themselves
    const sig = `${l.field.kind || 'number'}|${l.field.dim || ''}|${l.field.internal || ''}`;
    seen[l.key] ??= { sig, at: `${def.slug}.${l.id}` };
    if (l.field.kind !== 'select') assert.equal(sig, seen[l.key].sig, `${def.slug}.${l.id} vs ${seen[l.key].at}`);
  }
  assert.ok(Object.keys(seen).length >= 8);
});

test('Push from one calculator, pull into all others', () => {
  const shared = {};
  const src = defaults(bySlug['subsonic-cp']);
  Object.assign(src, { R: 3.1, noseL: 24, bodyLen: 120, N: 4, cR: 9, cT: 4, b: 5.2, noseType: 'ogive' });
  pushShared(bySlug['subsonic-cp'], src, shared);
  assert.deepEqual(shared, { noseType: 'ogive', noseL: 24, bodyR: 3.1, length: 120, finN: 4, finCr: 9, finCt: 4, finSpan: 5.2 });

  const drag = defaults(bySlug['drag-coefficient']);
  pullShared(bySlug['drag-coefficient'], drag, shared);
  assert.deepEqual([drag.bodyRadius, drag.noseLength, drag.bodyLength, drag.N, drag.cR, drag.cT, drag.b, drag.ogive], [3.1, 24, 120, 4, 9, 4, 5.2, true]);

  const cant = defaults(bySlug['fin-cant-angle']);
  pullShared(bySlug['fin-cant-angle'], cant, shared);
  assert.equal(cant.R, 3.1); assert.ok(Math.abs(cant.b - 8.3) < 1e-12, 'tip radius = R + exposed span');

  const nose = defaults(bySlug['nose-cone']);
  assert.deepEqual(pullShared(bySlug['nose-cone'], nose, shared).sort(), ['L', 'R']);
  assert.deepEqual(pullShared(bySlug['nose-cone'], nose, shared), [], 'second pull changes nothing');

  // every calculator still computes with the shared rocket
  for (const def of defs) { const v = defaults(def); pullShared(def, v, shared); assert.doesNotThrow(() => def.compute(v, {}), def.slug); }
});

test('Derived link: cant-angle tip radius pushes exposed span', () => {
  const def = bySlug['fin-cant-angle'], v = defaults(def), shared = {};
  v.R = 3; v.b = 8;
  pushShared(def, v, shared, ['b']);
  assert.deepEqual(shared, { finSpan: 5 });
});

test('Pull respects field limits and options', () => {
  const sub = bySlug['subsonic-cp'], v = defaults(sub);
  pullShared(sub, v, { finN: 12 });
  assert.equal(v.N, 8, 'subsonic-cp allows at most 8 panels');
  const drag = bySlug['drag-coefficient'], d = defaults(drag), before = d.ogive;
  pullShared(drag, d, { noseType: 'vonkarman' });
  assert.equal(d.ogive, before, 'drag has no Von Kármán option — left unchanged');
  pullShared(drag, d, { noseType: 'cone' });
  assert.equal(d.ogive, false);
  const nan = defaults(sub); pullShared(sub, nan, { bodyR: NaN, finCr: 'x' });
  assert.equal(nan.R, defaults(sub).R); assert.equal(nan.cR, defaults(sub).cR);
});

test('Subsonic CP keeps the fins on a shortened body', () => {
  const def = bySlug['subsonic-cp'], v = defaults(def);
  pullShared(def, v, { length: 60 });
  assert.ok(v.xLE + v.cR <= 60 + 1e-9);
  assert.ok(Math.abs((v.xTipLE - v.xLE) - (defaults(def).xTipLE - defaults(def).xLE)) < 1e-9, 'sweep kept');
});

test('Design files round-trip and reject bad input', () => {
  const f = designFile({ name: 'Club rocket Mk 2', shared: { bodyR: 3, bogus: 1 }, calcs: { 'fin-flutter': { cR: 9 } } }, new Date('2026-10-20T12:00:00Z'));
  assert.equal(f.saved, '2026-10-20T12:00:00.000Z');
  const p = parseDesignFile(JSON.stringify(f), defs.map((d) => d.slug));
  assert.equal(p.name, 'Club rocket Mk 2');
  assert.deepEqual(p.shared, { bodyR: 3 }, 'unknown shared keys dropped');
  assert.deepEqual(p.calcs, { 'fin-flutter': { cR: 9 } });
  const withUnknown = parseDesignFile(JSON.stringify({ ...f, calculators: { nope: {}, 'fin-flutter': { cR: 1 } } }), ['fin-flutter']);
  assert.deepEqual(Object.keys(withUnknown.calcs), ['fin-flutter']);
  assert.throws(() => parseDesignFile('{', []), /not valid JSON/);
  assert.throws(() => parseDesignFile('{"format":"x"}', []), /not a Rocket Calculator design/);
  assert.throws(() => parseDesignFile(JSON.stringify({ ...f, version: 2 }), []), /newer version/);
  assert.throws(() => parseDesignFile('null', []), /not a Rocket Calculator design/);
});

test('File names and deltas', () => {
  assert.equal(fileSlug('Club Rocket Mk 2 / Fusée'), 'club-rocket-mk-2-fusee');
  assert.equal(fileSlug('***'), 'rocket');
  assert.deepEqual(delta(1.1, 1), { abs: 0.10000000000000009, rel: 0.10000000000000009 });
  assert.deepEqual(delta(2, 0), { abs: 2, rel: null });
  assert.equal(delta('a', 1), null); assert.equal(delta(NaN, 1), null);
});
