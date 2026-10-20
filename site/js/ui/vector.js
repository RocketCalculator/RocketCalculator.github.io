// Vector export of a live SVG element to PDF or EPS — no library.
// Walks the rendered SVG, uses the browser's own transforms (getScreenCTM) and text layout
// (getStartPositionOfChar) so positions match the screen, and writes one drawing program in two dialects.
// Supported: path (M L H V C S Q T A Z), line, polyline, polygon, rect, circle, ellipse, text/tspan,
// arrow markers, rectangular clip paths, fill/stroke opacity, dash patterns. Fonts: Helvetica / Helvetica-Bold
// (Latin-1) and Symbol (Greek and maths signs).

const SYMBOL = { α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', η: 'h', θ: 'q', λ: 'l', μ: 'm', ν: 'n', π: 'p', ρ: 'r', σ: 's', τ: 't', φ: 'f', ψ: 'y', ω: 'w', ξ: 'x', κ: 'k', ζ: 'z', χ: 'c',
  Γ: 'G', Δ: 'D', Θ: 'Q', Λ: 'L', Π: 'P', Σ: 'S', Φ: 'F', Ψ: 'Y', Ω: 'W', '√': '\xD6', '∞': '\xA5', '≈': '\xBB', '≤': '\xA3', '≥': '\xB3', '→': '\xAE', '∂': '\xB6', '′': '\xA2', '⁻': '-' };
const LATIN = { '−': '-', ' ': ' ', ' ': ' ', '​': '', '̄': '', '̂': '', '̇': '', '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...',
  '⁰': '0', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '₀': '0', '₁': '1', '₂': '2', '₃': '3' };

/* ---------- path parsing ---------- */
function parsePath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const out = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ax = (v) => (rel ? x + v : v), ay = (v) => (rel ? y + v : v);
    if (C === 'Z') { out.push(['Z']); x = sx; y = sy; lc = lq = null; continue; }
    if (C === 'M') { x = ax(num()); y = ay(num()); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; lc = lq = null; continue; }
    if (C === 'L') { x = ax(num()); y = ay(num()); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'H') { x = rel ? x + num() : num(); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'V') { y = rel ? y + num() : num(); out.push(['L', x, y]); lc = lq = null; continue; }
    if (C === 'C') { const a = [ax(num()), ay(num()), ax(num()), ay(num()), ax(num()), ay(num())]; out.push(['C', ...a]); lc = [a[2], a[3]]; x = a[4]; y = a[5]; lq = null; continue; }
    if (C === 'S') { const c1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; const a = [ax(num()), ay(num()), ax(num()), ay(num())]; out.push(['C', ...c1, ...a]); lc = [a[0], a[1]]; x = a[2]; y = a[3]; lq = null; continue; }
    if (C === 'Q' || C === 'T') {
      const q = C === 'Q' ? [ax(num()), ay(num())] : lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y];
      const e = [ax(num()), ay(num())];
      out.push(['C', x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1]), e[0], e[1]]);
      lq = q; x = e[0]; y = e[1]; lc = null; continue;
    }
    if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(); const ex = ax(num()), ey = ay(num());
      out.push(...arcToBeziers(x, y, rx, ry, rot, large, sweep, ex, ey)); x = ex; y = ey; lc = lq = null; continue;
    }
    i++; // unknown token
  }
  return out;
}
function arcToBeziers(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0) return [['L', x2, y2]];
  const phi = (phiDeg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = fa === fs ? -1 : 1;
  const sq = Math.max(0, (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) / (rx * rx * y1p * y1p + ry * ry * x1p * x1p));
  const co = sign * Math.sqrt(sq), cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry), dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.ceil(Math.abs(dt) / (Math.PI / 2)), d = dt / n, out = [];
  const k = (4 / 3) * Math.tan(d / 4);
  const pt = (t) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
  const dv = (t) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
  for (let j = 0; j < n; j++) {
    const a = t1 + j * d, b = a + d, p0 = pt(a), p3 = pt(b), d0 = dv(a), d3 = dv(b);
    out.push(['C', p0[0] + k * d0[0], p0[1] + k * d0[1], p3[0] - k * d3[0], p3[1] - k * d3[1], p3[0], p3[1]]);
  }
  return out;
}
function ellipsePath(cx, cy, rx, ry) {
  const k = 0.5522847498;
  return [['M', cx + rx, cy], ['C', cx + rx, cy + k * ry, cx + k * rx, cy + ry, cx, cy + ry], ['C', cx - k * rx, cy + ry, cx - rx, cy + k * ry, cx - rx, cy],
    ['C', cx - rx, cy - k * ry, cx - k * rx, cy - ry, cx, cy - ry], ['C', cx + k * rx, cy - ry, cx + rx, cy - k * ry, cx + rx, cy], ['Z']];
}
function geometry(el) {
  const n = (a) => parseFloat(el.getAttribute(a) || 0);
  switch (el.tagName) {
    case 'path': return parsePath(el.getAttribute('d') || '');
    case 'line': return [['M', n('x1'), n('y1')], ['L', n('x2'), n('y2')]];
    case 'rect': { const x = n('x'), y = n('y'), w = n('width'), h = n('height'); return w > 0 && h > 0 ? [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']] : []; }
    case 'circle': return ellipsePath(n('cx'), n('cy'), n('r'), n('r'));
    case 'ellipse': return ellipsePath(n('cx'), n('cy'), n('rx'), n('ry'));
    case 'polyline': case 'polygon': {
      const p = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number), out = [];
      for (let i = 0; i + 1 < p.length; i += 2) out.push([i ? 'L' : 'M', p[i], p[i + 1]]);
      if (el.tagName === 'polygon') out.push(['Z']);
      return out;
    }
    default: return [];
  }
}

/* ---------- colours ---------- */
function rgba(str) {
  if (!str || str === 'none' || str.startsWith('url(') || str === 'transparent') return null;
  const m = /rgba?\(([^)]+)\)/.exec(str);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p[3] ?? 1 };
}
const f3 = (v) => (Math.round(v * 1000) / 1000).toString();
const f2 = (v) => (Math.round(v * 100) / 100).toString();

/* ---------- writer (PDF or PostScript dialect) ---------- */
function writer(fmt, bg) {
  const ops = [], alphas = new Map();
  const pdf = fmt === 'pdf';
  return {
    ops, alphas,
    save: () => ops.push(pdf ? 'q' : 'gsave'), restore: () => ops.push(pdf ? 'Q' : 'grestore'),
    cm: (m) => ops.push(pdf ? `${m.map(f3).join(' ')} cm` : `[${m.map(f3).join(' ')}] concat`),
    path(segs) {
      for (const s of segs) {
        if (s[0] === 'M') ops.push(`${f2(s[1])} ${f2(s[2])} ${pdf ? 'm' : 'moveto'}`);
        else if (s[0] === 'L') ops.push(`${f2(s[1])} ${f2(s[2])} ${pdf ? 'l' : 'lineto'}`);
        else if (s[0] === 'C') ops.push(`${s.slice(1).map(f2).join(' ')} ${pdf ? 'c' : 'curveto'}`);
        else if (s[0] === 'Z') ops.push(pdf ? 'h' : 'closepath');
      }
    },
    rgb(c, stroke, alpha) {
      let { r, g, b } = c;
      if (!pdf && alpha < 1) { r = bg.r + alpha * (r - bg.r); g = bg.g + alpha * (g - bg.g); b = bg.b + alpha * (b - bg.b); }
      ops.push(pdf ? `${f3(r)} ${f3(g)} ${f3(b)} ${stroke ? 'RG' : 'rg'}` : `${f3(r)} ${f3(g)} ${f3(b)} setrgbcolor`);
      if (pdf && alpha < 0.999) {
        const key = f2(alpha); if (!alphas.has(key)) alphas.set(key, `GS${alphas.size}`);
        ops.push(`/${alphas.get(key)} gs`);
      }
    },
    width: (w) => ops.push(`${f2(w)} ${pdf ? 'w' : 'setlinewidth'}`),
    dash: (arr) => ops.push(pdf ? `[${arr.map(f2).join(' ')}] 0 d` : `[${arr.map(f2).join(' ')}] 0 setdash`),
    caps: (cap, join) => ops.push(pdf ? `${cap} J ${join} j` : `${cap} setlinecap ${join} setlinejoin`),
    fill: () => ops.push(pdf ? 'f' : 'fill'), stroke: () => ops.push(pdf ? 'S' : 'stroke'),
    clipRect(x, y, w, h) { ops.push(pdf ? `${f2(x)} ${f2(y)} ${f2(w)} ${f2(h)} re W n` : `newpath ${f2(x)} ${f2(y)} ${f2(w)} ${f2(h)} rectclip`); },
    text(font, size, m, str) {
      const enc = pdf ? `(${pdfStr(str)})` : `(${psStr(str)})`;
      if (pdf) ops.push(`BT /${font} ${f2(size)} Tf ${m.map(f3).join(' ')} Tm ${enc} Tj ET`);
      else ops.push(`gsave [${m.map(f3).join(' ')}] concat /${{ F1: 'HelvL1', F2: 'HelvBL1', F3: 'Symbol' }[font]} findfont ${f2(size)} scalefont setfont 0 0 moveto ${enc} show grestore`);
    },
  };
}
const esc8 = (s, ps) => [...s].map((ch) => { const c = ch.charCodeAt(0); if (ch === '(' || ch === ')' || ch === '\\') return '\\' + ch; if (c < 32 || c > 126) return '\\' + c.toString(8).padStart(3, '0'); return ch; }).join('');
const pdfStr = (s) => esc8(s, false), psStr = (s) => esc8(s, true);

/** Split a text run into font runs: [{font: 'latin'|'symbol', text, index}] using the maps above. */
function fontRuns(str) {
  const runs = [];
  [...str].forEach((ch, i) => {
    let font = 'latin', out = ch;
    if (SYMBOL[ch] !== undefined) { font = 'symbol'; out = SYMBOL[ch]; }
    else if (LATIN[ch] !== undefined) out = LATIN[ch];
    else if (ch.charCodeAt(0) > 255) out = '?';
    if (!out) return;
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += out; else runs.push({ font, text: out, index: i });
  });
  return runs;
}

/* ---------- main conversion ---------- */
function convert(svg, fmt) {
  const vb = svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
  const K = 0.75;                                   // CSS px → pt
  const pageW = vb.width * K, pageH = vb.height * K;
  const cs = getComputedStyle(document.documentElement);
  const bg = rgba(getComputedStyle(svg.closest('.card') || document.body).backgroundColor) || rgba(cs.getPropertyValue('--surface')) || { r: 1, g: 1, b: 1, a: 1 };
  const W = writer(fmt, bg);
  // background and global flip: user (x right, y down) → page (y up)
  W.rgb(bg, false, 1); W.path([['M', 0, 0], ['L', pageW, 0], ['L', pageW, pageH], ['L', 0, pageH], ['Z']]); W.fill();
  W.save(); W.cm([K, 0, 0, -K, -vb.x * K, (vb.y + vb.height) * K]);
  const rootInv = svg.getScreenCTM().inverse();
  const matOf = (el) => { const m = rootInv.multiply(el.getScreenCTM()); return [m.a, m.b, m.c, m.d, m.e, m.f]; };
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const skip = (el) => /^(defs|clipPath|marker|style|title|desc|mask|pattern|linearGradient|radialGradient|animate|animateTransform|animateMotion|mpath|metadata)$/.test(el.tagName)
    || el.classList?.contains('sc-handle') || el.getAttribute?.('data-export') === 'skip';
  const opacityOf = (el) => { let o = 1; for (let n = el; n && n !== svg.parentNode; n = n.parentNode) { if (n.nodeType === 1) o *= parseFloat(getComputedStyle(n).opacity || 1); } return o; };
  const clipOf = (el) => {
    for (let n = el; n && n !== svg; n = n.parentNode) {
      const cp = n.getAttribute?.('clip-path');
      const id = cp && /url\(#([^)]+)\)/.exec(cp)?.[1];
      if (id) {
        const r = svg.querySelector(`[id="${id}"] rect`); if (!r) return null;
        const m = matOf(n), x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h = +r.getAttribute('height');
        const p = apply(m, x, y), q = apply(m, x + w, y + h);
        return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])];
      }
    }
    return null;
  };
  const markerFill = (ref) => {
    const id = ref && /url\(#([^)]+)\)/.exec(ref)?.[1]; if (!id) return null;
    const p = svg.querySelector(`[id="${id}"] path`); return p ? rgba(getComputedStyle(p).fill) : null;
  };
  const arrow = (tip, from, col, alpha) => {
    const dx = tip[0] - from[0], dy = tip[1] - from[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const len = 6.3, hw = 2.45, bx = tip[0] - ux * len, by = tip[1] - uy * len;
    W.save(); W.rgb(col, false, alpha);
    W.path([['M', tip[0], tip[1]], ['L', bx - uy * hw, by + ux * hw], ['L', bx + uy * hw, by - ux * hw], ['Z']]); W.fill(); W.restore();
  };

  const walk = (node) => {
    for (const el of node.children) {
      if (skip(el)) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none') continue;
      if (el.tagName === 'g' || el.tagName === 'svg' || el.tagName === 'a') { walk(el); continue; }
      if (st.visibility === 'hidden') continue;
      const op = opacityOf(el);
      if (op <= 0.001) continue;
      const m = matOf(el), clip = clipOf(el);
      if (el.tagName === 'text') { drawText(el, st, m, op, clip); continue; }
      const segs = geometry(el);
      if (!segs.length) continue;
      const fill = rgba(st.fill), stroke = rgba(st.stroke);
      const fa = fill ? fill.a * op * parseFloat(st.fillOpacity || 1) : 0, sa = stroke ? stroke.a * op * parseFloat(st.strokeOpacity || 1) : 0;
      const sw = parseFloat(st.strokeWidth) || 0;
      if (fa <= 0.001 && (sa <= 0.001 || sw <= 0)) continue;
      W.save();
      if (clip) W.clipRect(...clip);
      W.cm(m);
      if (fa > 0.001 && el.tagName !== 'line' && el.tagName !== 'polyline') { W.save(); W.rgb(fill, false, fa); W.path(segs); W.fill(); W.restore(); }
      if (sa > 0.001 && sw > 0) {
        const scale = Math.hypot(m[0], m[1]) || 1;
        W.rgb(stroke, true, sa); W.width(st.vectorEffect === 'non-scaling-stroke' ? sw / scale : sw);
        const dash = (st.strokeDasharray || 'none') === 'none' ? [] : st.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter((x) => !Number.isNaN(x));
        W.dash(dash.length ? dash.map((x) => (st.vectorEffect === 'non-scaling-stroke' ? x / scale : x)) : []);
        W.caps({ butt: 0, round: 1, square: 2 }[st.strokeLinecap] ?? 0, { miter: 0, round: 1, bevel: 2 }[st.strokeLinejoin] ?? 0);
        W.path(segs); W.stroke();
      }
      W.restore();
      // markers (drawn in root space so they keep their on-screen size)
      const ms = el.getAttribute('marker-start'), me = el.getAttribute('marker-end');
      if ((ms || me) && segs.length > 1) {
        const pts = segs.filter((s) => s[0] !== 'Z').map((s) => apply(m, s[s.length - 2], s[s.length - 1]));
        if (me) { const c = markerFill(me); if (c) arrow(pts[pts.length - 1], pts[pts.length - 2], c, op); }
        if (ms) { const c = markerFill(ms); if (c) arrow(pts[0], pts[1], c, op); }
      }
    }
  };
  function drawText(el, st, m, op, clip) {
    const parts = el.querySelectorAll('tspan').length ? [...el.querySelectorAll('tspan')] : [el];
    for (const part of parts) {
      const raw = part === el ? el.textContent : part.textContent;
      if (!raw || !raw.trim()) continue;
      const ps = part === el ? st : getComputedStyle(part);
      const col = rgba(ps.fill); if (!col) continue;
      const size = parseFloat(ps.fontSize) || 12, bold = (parseInt(ps.fontWeight, 10) || 400) >= 600;
      for (const run of fontRuns(raw)) {
        let pos;
        try { pos = part.getStartPositionOfChar(run.index); } catch { continue; }
        const o = apply(m, pos.x, pos.y);
        const tm = [m[0], m[1], -m[2], -m[3], o[0], o[1]];
        W.save(); if (clip) W.clipRect(...clip);
        W.rgb(col, false, col.a * op);
        W.text(run.font === 'symbol' ? 'F3' : bold ? 'F2' : 'F1', size, tm, run.text);
        W.restore();
      }
    }
  }
  walk(svg);
  W.restore();
  return { W, pageW, pageH };
}

export function svgToPDF(svg) {
  const { W, pageW, pageH } = convert(svg, 'pdf');
  const content = W.ops.join('\n');
  const gs = [...W.alphas].map(([a, name]) => `/${name} << /Type /ExtGState /ca ${a} /CA ${a} >>`).join(' ');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f2(pageW)} ${f2(pageH)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /ExtGState << ${gs} >> >> /Contents 4 0 R >>`,
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>',
  ];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  // all content is ASCII (strings are octal-escaped), so string length = byte length
  return new Blob([out], { type: 'application/pdf' });
}

export function svgToEPS(svg) {
  const { W, pageW, pageH } = convert(svg, 'eps');
  const reenc = (src, dst) => `/${src} findfont dup length dict begin {1 index /FID ne {def} {pop pop} ifelse} forall /Encoding ISOLatin1Encoding def currentdict end /${dst} exch definefont pop`;
  const ps = ['%!PS-Adobe-3.0 EPSF-3.0', `%%BoundingBox: 0 0 ${Math.ceil(pageW)} ${Math.ceil(pageH)}`, `%%HiResBoundingBox: 0 0 ${f2(pageW)} ${f2(pageH)}`,
    '%%Creator: Rocket Calculator', '%%LanguageLevel: 2', '%%EndComments', reenc('Helvetica', 'HelvL1'), reenc('Helvetica-Bold', 'HelvBL1'),
    ...W.ops, 'showpage', '%%EOF'].join('\n');
  return new Blob([ps], { type: 'application/postscript' });
}
