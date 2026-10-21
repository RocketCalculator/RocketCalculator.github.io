// Upper-stage divergence: the field tool's q_D table and amplification column, the memo's moment-balance relations,
// and the flexible-joint limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { tubeEI, qdTube, qdJoint, amplification, maxLength, trimAmplification, divergence } from '../site/js/calc/divergence.js';

const W = workbook('DIVERGENCE');

test('Divergence dynamic pressure reproduces the field tool for every length', () => {
  for (let row = 18; row <= 26; row++) {
    close(tubeEI(1, W(`D${row}`), W(`E${row}`)), W(`H${row}`), 1e-8, `H${row} πR³t`);
    close(qdTube(W('C18'), W(`D${row}`), W(`E${row}`), W(`J${row}`), W(`G${row}`)), W(`K${row}`), 1e-8, `K${row}`);
  }
});

test('Load amplification column: q_D/(q_D − q) = (1/q_r)/(1/q_r − 1)', () => {
  close(amplification(0, 1), W('I4'), 1e-15, 'I4');
  for (let row = 5; row <= 14; row++) close(amplification(W(`F${row}`), 1), W(`I${row}`), 1e-12, `I${row}`);
  assert.equal(amplification(1, 1), Infinity);
});

test('Longest stage at q is where q_D = q; q_D scales as 1/l² and with t', () => {
  const [E, R, t, Ca, q] = [10.5e6, 3.375, 0.125, 3, 15000];
  close(qdTube(E, R, t, maxLength(E, R, t, Ca, q), Ca), q, 1e-12, 'q_D(l_max) = q');
  close(qdTube(E, R, t, 100, Ca) / qdTube(E, R, t, 200, Ca), 4, 1e-12, '1/l²');
  close(qdTube(E, R, 2 * t, 150, Ca) / qdTube(E, R, t, 150, Ca), 2, 1e-12, '∝ t');
});

test('Moment balance: eq. (1) and (2) follow from solving the trimmed, bent rocket directly', () => {
  // x₁N_T1 − x₂N_T2 − x₃N_N = x₄Tδ with N_N = qSC_NNα(α + θ), θ = qSC_NNα(α + θ)/K where K = q_D S C_NNα
  const p = { x1: 120, CN1a: 8, x2: 40, CN2a: 3, x3: 90, CNNa: 2.5, q: 600, qD: 2000 }, S = 30, rhs = 1e5;
  const K = p.qD * S * p.CNNa, rigid = rhs / (p.q * S * (p.x1 * p.CN1a - p.x2 * p.CN2a - p.x3 * p.CNNa));
  // unknowns α, θ: (x₁CN1 − x₂CN2 − x₃CNN)qSα − x₃CNN qS θ = rhs ; θ(K − qSCNN) = qSCNN α
  const a11 = p.q * S * (p.x1 * p.CN1a - p.x2 * p.CN2a - p.x3 * p.CNNa), a12 = -p.x3 * p.CNNa * p.q * S;
  const a21 = -p.q * S * p.CNNa, a22 = K - p.q * S * p.CNNa;
  const det = a11 * a22 - a12 * a21, alpha = (rhs * a22) / det, theta = (-a21 * alpha) / a22;
  const o = trimAmplification(p);
  close(o.body, alpha / rigid, 1e-12, 'eq. (1)');
  close(o.nose, (alpha + theta) / rigid, 1e-12, 'eq. (2)');
  assert.ok(o.stable && o.body > 1 && o.nose > o.body);
});

test('Flexible joint: q_D = 1/(S C_NNα C x_j); q below q_D gives the same amplification law', () => {
  const R = 3, Ca = 2, C = 1e-6, xj = 20, S = Math.PI * R * R;
  close(qdJoint(R, Ca, C, xj), 144 / (S * Ca * C * xj), 1e-14, 'q_D');
  const o = divergence({ mode: 'joint', E: 1, R, t: 0.1, l: 1, CNa: Ca, C, xj, q: 0.5 * qdJoint(R, Ca, C, xj), trim: null });
  close(o.amp, 2, 1e-12, 'half of q_D doubles the load');
});
