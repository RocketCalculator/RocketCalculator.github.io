// "Export report" box: a copy-ready calculation write-up for PDR / FDR documents.
// One report model → four outputs: rendered preview, Markdown (README), LaTeX, Word (HTML + MathML).
import { h, url, toast, copyText, download, esc } from '../util.js';
import { ICONS } from '../app.js';
import { displayUnit, unitTex, toDisplay } from '../units.js';
import { texHTML, rich } from '../math.js';

/* ---------- number / quantity helpers handed to calculator report() functions ---------- */
export function texNum(x, digits = 5) {
  if (x == null || Number.isNaN(x)) return '\\text{—}';
  if (typeof x === 'boolean') return x ? '\\text{yes}' : '\\text{no}';
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e6 || a < 1e-3) {
    const [m, e] = x.toExponential(digits - 1).split('e');
    return `${trim(m)}\\times10^{${+e}}`;
  }
  const dec = Math.max(0, digits - 1 - Math.floor(Math.log10(a)));
  return trim(x.toFixed(Math.min(dec, 10)));
}
const trim = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
/**
 * Report helpers handed to each calculator's report(v, out, R):
 *   R.n(x)            plain number
 *   R.v(x, spec)      number converted from the calculator's internal unit to the reader's unit system
 *   R.u(spec)         that unit, as TeX
 *   R.Q(x, spec)      number + unit in the reader's system
 *   R.sys / R.us      'si' | 'us'
 * spec = { dim, internal, units? } exactly as in the field definitions.
 */
export function makeR(sys) {
  const disp = (spec) => displayUnit(spec, sys);
  const v = (x, spec) => toDisplay(x, spec, sys);
  return {
    sys, us: sys === 'us', n: texNum,
    v: (x, spec, d = 5) => texNum(v(x, spec), d),
    raw: (x, spec) => v(x, spec),
    u: (spec) => unitTex(disp(spec)),
    Q: (x, spec, d = 5) => { const u = unitTex(disp(spec)); return `${texNum(v(x, spec), d)}${u ? `\\,${u}` : ''}`; },
    pick: (si, us) => (sys === 'us' ? us : si),
  };
}

/** Which entries of a symbol dictionary {TeX: description} appear in a TeX string (in order of appearance). */
export function symbolsIn(tex, dict) {
  if (!tex || !dict) return [];
  const src = Array.isArray(tex) ? tex.join(' ') : String(tex);
  const found = [];
  // positions inside a subscript group _{…}: a symbol found there is part of another symbol's name (C_{L\delta})
  const inSub = new Uint8Array(src.length + 1), open = [];
  for (let j = 0; j < src.length; j++) {
    if (src[j] === '{') open.push(src[j - 1] === '_');
    else if (src[j] === '}') open.pop();
    else if (open.includes(true)) inSub[j] = 1;
  }
  for (const [key, desc] of Object.entries(dict)) {
    let i = src.indexOf(key), first = -1;
    while (i >= 0) {
      const b = src[i - 1], a = src[i + key.length];
      // not a subscript, and not part of a longer name (a command such as \delta cannot merge with a letter before it)
      const okB = !inSub[i] && (!b || (key[0] === '\\' ? b !== '\\' : !/[A-Za-z\\]/.test(b)) && b !== '_');
      const okA = !a || /[}]$/.test(key) || (!/[A-Za-z0-9]/.test(a) && !(a === '_' && !/_/.test(key)) && !(a === '{' && /\\[a-z]+$/.test(key)));
      if (okB && okA) { first = i; break; }
      i = src.indexOf(key, i + 1);
    }
    if (first >= 0) found.push({ sym: key, desc: typeof desc === 'string' ? desc : desc.d, at: first });
  }
  return found.sort((x, y) => x.at - y.at);
}

/* ---------- model ---------- */
function buildModel({ def, state, refList, getSystem }) {
  const v = state.values, out = state.out, sys = getSystem();
  const inputs = [];
  const tables = [];
  for (const g of def.groups) for (const f of g.fields) {
    if (f.when && !f.when(v)) continue;
    const val = v[f.id];
    if (f.kind === 'table') {
      tables.push({ label: f.label, columns: f.columns.map((c) => ({ label: c.label, unit: unitTex(displayUnit(c, sys)) })), rows: val.map((row) => f.columns.map((c) => texNum(toDisplay(row[c.id], c, sys), 6))) });
      continue;
    }
    let value, unit = '';
    if (f.kind === 'bool') value = val ? '\\text{yes}' : '\\text{no}';
    else if (f.kind === 'select') value = `\\text{${(f.options.find((o) => o.value === val)?.label || String(val)).replace(/[{}\\]/g, '')}}`;
    else if (val == null) continue;
    else { value = texNum(toDisplay(val, f, sys), 6); unit = f.dim && f.dim !== 'none' ? unitTex(displayUnit(f, sys)) : ''; }
    inputs.push({ group: g.title, label: f.label, sym: f.sym || '', value, unit });
  }
  const results = [];
  for (const r of def.results) {
    if (r.when && !r.when(v, out)) continue;
    const x = out?.results?.[r.id];
    if (x == null) continue;
    results.push({ label: r.label, sym: r.sym || '', key: !!r.key, value: typeof x === 'number' ? texNum(toDisplay(x, r, sys), r.digits || 5) : `\\text{${x}}`, unit: r.dim && r.dim !== 'none' ? unitTex(displayUnit(r, sys)) : '' });
  }
  let sections = [];
  try { sections = def.report ? def.report(v, out, makeR(sys)) : []; } catch (err) { console.error(err); sections = [{ title: 'Calculation', text: `The step-by-step derivation could not be generated: ${err.message}` }]; }
  const notes = [...(typeof def.reportNotes === 'function' ? def.reportNotes(sys) : def.reportNotes || [])];
  // nomenclature: inputs and results with symbols, then every dictionary symbol used in the equations
  const nom = [], seen = new Set();
  for (const i of inputs) if (i.sym && !seen.has(i.sym)) { seen.add(i.sym); nom.push({ sym: i.sym, desc: i.label, kind: 'input', value: i.value, unit: i.unit }); }
  const allEq = sections.flatMap((s) => (s.steps || []).flatMap((st) => [st.lhs, st.eq].filter(Boolean)));
  void allEq;
  for (const c of def.constants || []) nom.push({ sym: c.sym, desc: c.desc, kind: 'constant', value: texNum(sys === 'us' ? c.us[0] : c.si[0], 7), unit: sys === 'us' ? c.us[1] : c.si[1] });
  // per-step procedure: formula → symbol meanings → known values → substitution and result
  const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const dict = { ...(def.symbols || {}) };
  for (const i of inputs) if (i.sym && !dict[i.sym]) dict[i.sym] = lc(i.label);
  for (const r of results) if (r.sym && !dict[r.sym]) dict[r.sym] = lc(r.label);
  for (const c of def.constants || []) if (!dict[c.sym]) dict[c.sym] = c.desc;
  const known = new Map();
  for (const s of nom) known.set(s.sym, `${s.value}${s.unit ? `\\,${s.unit}` : ''}`);
  const mainValue = (res) => String(res).split(/,?\\qquad|\\quad\(|,\\quad/)[0].replace(/,\s*$/, '');
  for (const sec of sections) for (const st of sec.steps || []) {
    if (st.eq) {
      st.formula = st.lhs ? `${st.lhs}=${st.eq}` : st.eq;
      const syms = symbolsIn(st.eq, dict).filter((x) => x.sym !== st.lhs);
      if (syms.length) {
        const parts = syms.map((x) => `$${x.sym}$ is the ${lc(typeof x.desc === 'string' ? x.desc : x.desc.d)}`.replace(/is the (the|a|an) /, 'is $1 ').replace(/is the ([a-z]+ of )/, 'is the $1'));
        st.where = `where ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]}.`;
      }
      const vals = syms.filter((x) => known.has(x.sym)).map((x) => `$${x.sym}=${known.get(x.sym)}$`);
      if (vals.length && (st.sub || st.res)) st.values = `With ${vals.length > 1 ? vals.slice(0, -1).join(', ') + ' and ' + vals[vals.length - 1] : vals[0]}:`;
    }
    if (st.lhs && st.res) {
      st.calc = st.sub ? `\\begin{aligned}${st.lhs} &= ${st.sub} \\\\ &= ${st.res}\\end{aligned}` : `${st.lhs}=${st.res}`;
      known.set(st.lhs, mainValue(st.res));
    } else if (!st.lhs && st.res) st.calc = st.res;
  }
  const plain = (t) => String(t || '').replace(/<[^>]+>/g, '');
  const vd = out?.verdict;
  if (vd && vd.level !== 'none') notes.push(`Verdict: ${vd.level.toUpperCase()}. ${plain(vd.title)}. ${plain(vd.text)}${vd.fixes?.length ? ` Fixes: ${vd.fixes.map(plain).join(' ')}` : ''}`);
  for (const w of out?.warnings || []) notes.push(`Warning: ${plain(w.text)}${w.fix ? ` Fix: ${plain(w.fix)}` : ''}`);
  return {
    nom, title: def.title, source: refList[0] ? refList[0].title + (refList[0].authors ? ` (${refList[0].authors})` : '') : def.title, date: new Date().toISOString().slice(0, 10), units: sys === 'si' ? 'SI' : 'US customary',
    summary: (def.subtitle || '').replace(/<[^>]+>/g, ''), inputs, tables, results, sections, notes,
    refs: refList.map((r) => `${r.authors ? r.authors + ', ' : ''}“${r.title}”${r.venue ? ', ' + r.venue : ''}.`),
    site: location.href.split('#')[0],
  };
}

/* ---------- renderers ---------- */
function toMarkdown(M) {
  const md = [];
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  md.push(`# ${M.title}`, '', `*${M.summary}*`, '', `Based on: ${M.source}. Units: ${M.units}. Generated ${M.date} with Rocket Calculator (${M.site}).`, '');
  md.push('## Inputs and constants', '', '| Symbol | Meaning | Value | Unit |', '|---|---|---:|---|');
  for (const s of M.nom) md.push(`| $${s.sym}$ | ${cell(s.desc)}${s.kind === 'constant' ? ' (constant)' : s.kind === 'result' ? ' (result)' : s.kind === 'derived' ? ' (derived)' : ''} | ${s.value ? `$${s.value}$` : ''} | ${s.unit ? `$${s.unit}$` : ''} |`);
  for (const i of M.inputs.filter((x) => !x.sym)) md.push(`| | ${cell(i.label)} | $${i.value}$ | ${i.unit ? `$${i.unit}$` : ''} |`);
  for (const t of M.tables) {
    md.push('', `**${t.label}**`, '', `| # | ${t.columns.map((c) => `${c.label} ($${c.unit}$)`).join(' | ')} |`, `|---|${t.columns.map(() => '---:').join('|')}|`);
    t.rows.forEach((r, k) => md.push(`| ${k} | ${r.map((x) => `$${x}$`).join(' | ')} |`));
  }
  for (const s of M.sections) {
    md.push('', `## ${s.title}`, '');
    if (s.text) md.push(s.text, '');
    for (const st of s.steps || []) {
      if (st.label) md.push(`**${st.label}**`, '');
      if (st.formula) md.push('$$', st.formula, '$$', '');
      if (st.where) md.push(st.where, '');
      if (st.values) md.push(st.values, '');
      if (st.calc && st.calc !== st.formula) md.push('$$', st.calc, '$$', '');
      if (st.note) md.push(st.note, '');
    }
  }
  md.push('## Results', '', '| Quantity | Symbol | Value | Unit |', '|---|---|---:|---|');
  for (const r of M.results) md.push(`| ${r.key ? '**' + cell(r.label) + '**' : cell(r.label)} | ${r.sym ? `$${r.sym}$` : ''} | $${r.value}$ | ${r.unit ? `$${r.unit}$` : ''} |`);
  if (M.notes.length) { md.push('', '## Notes', ''); M.notes.forEach((n) => md.push(`- ${n}`)); }
  if (M.refs.length) { md.push('', '## References', ''); M.refs.forEach((r, k) => md.push(`${k + 1}. ${r}`)); }
  return md.join('\n') + '\n';
}

const UNI = { '×': '$\\times$', '°': '$^\\circ$', '≈': '$\\approx$', '→': '$\\to$', '−': '$-$', '·': '$\\cdot$', '²': '$^2$', '³': '$^3$', '⁴': '$^4$', '¹': '$^1$', '⁰': '$^0$', '⁻': '$^-$',
  α: '$\\alpha$', β: '$\\beta$', γ: '$\\gamma$', δ: '$\\delta$', Δ: '$\\Delta$', λ: '$\\lambda$', Λ: '$\\Lambda$', μ: '$\\mu$', ρ: '$\\rho$', φ: '$\\varphi$', θ: '$\\theta$', ψ: '$\\psi$', ω: '$\\omega$', Ω: '$\\Omega$', π: '$\\pi$', ξ: '$\\xi$', '₀': '$_{0}$', '₁': '$_{1}$', '₂': '$_{2}$', '₃': '$_{3}$', '₄': '$_{4}$', '₅': '$_{5}$', '₆': '$_{6}$', '₇': '$_{7}$', '₈': '$_{8}$', '₉': '$_{9}$', Γ: '$\\Gamma$', ε: '$\\varepsilon$', τ: '$\\tau$', σ: '$\\sigma$', '±': '$\\pm$', '≤': '$\\le$', '≥': '$\\ge$', '√': '$\\surd$', '…': '\\ldots{}', '\u2009': '\\,', '\u202f': '\\,', '\u00a0': '~' };
const latexText = (s) => String(s).split(/(\$[^$]+\$)/g).map((p) => (p.startsWith('$') && p.endsWith('$') && p.length > 2 ? p
  : p.replace(/\\/g, '\\textbackslash{}').replace(/([%&_#{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}')
    .replace(/“/g, '``').replace(/”/g, "''").replace(/’/g, "'").replace(/—/g, '---').replace(/–/g, '--').replace(/[×°≈→−·²³⁴¹⁰⁻αβγδΔλΛμρφθψωΩπξΓετσ±₀₁₂₃₄₅₆₇₈₉\u2009\u202f\u00a0≤≥√…]/g, (c) => UNI[c]))).join('');
function toLaTeX(M) {
  const L = [];
  L.push('\\documentclass[11pt]{article}', '\\usepackage[margin=2.2cm]{geometry}', '\\usepackage{amsmath,amssymb,booktabs,longtable}', '\\usepackage[T1]{fontenc}', '\\usepackage{textcomp}', '',
    `\\title{${latexText(M.title)}}`, `\\date{${M.date}}`, '\\author{}', '\\begin{document}', '\\maketitle', '',
    `\\noindent\\emph{${latexText(M.summary)}}\\\\`, `Based on: ${latexText(M.source)}. Units: ${M.units}. Generated with Rocket Calculator (\\texttt{${latexText(M.site)}}).`, '');
  L.push('\\section*{Inputs and constants}', '\\begin{longtable}{llrl}', '\\toprule Symbol & Meaning & Value & Unit\\\\ \\midrule');
  for (const s of M.nom) L.push(`$${s.sym}$ & ${latexText(s.desc)}${s.kind === 'constant' ? ' (constant)' : s.kind === 'result' ? ' (result)' : s.kind === 'derived' ? ' (derived)' : ''} & ${s.value ? `$${s.value}$` : ''} & ${s.unit ? `$${s.unit}$` : ''}\\\\`);
  for (const i of M.inputs.filter((x) => !x.sym)) L.push(` & ${latexText(i.label)} & $${i.value}$ & ${i.unit ? `$${i.unit}$` : ''}\\\\`);
  L.push('\\bottomrule', '\\end{longtable}');
  for (const t of M.tables) {
    L.push(`\\paragraph{${latexText(t.label)}}`, `\\begin{longtable}{r${'r'.repeat(t.columns.length)}}`, `\\toprule \\# & ${t.columns.map((c) => `${latexText(c.label)} ($${c.unit}$)`).join(' & ')}\\\\ \\midrule`);
    t.rows.forEach((r, k) => L.push(`${k} & ${r.map((x) => `$${x}$`).join(' & ')}\\\\`));
    L.push('\\bottomrule', '\\end{longtable}');
  }
  for (const s of M.sections) {
    L.push(`\\section*{${latexText(s.title)}}`);
    if (s.text) L.push(latexText(s.text), '');
    for (const st of s.steps || []) {
      if (st.label) L.push(`\\paragraph{${latexText(st.label)}}`);
      if (st.formula) L.push('\\[', st.formula, '\\]');
      if (st.where) L.push(latexText(st.where), '');
      if (st.values) L.push(latexText(st.values), '');
      if (st.calc && st.calc !== st.formula) L.push('\\[', st.calc, '\\]');
      if (st.note) L.push(latexText(st.note), '');
    }
  }
  L.push('\\section*{Results}', '\\begin{longtable}{llrl}', '\\toprule Quantity & Symbol & Value & Unit\\\\ \\midrule');
  for (const r of M.results) L.push(`${r.key ? '\\textbf{' + latexText(r.label) + '}' : latexText(r.label)} & ${r.sym ? `$${r.sym}$` : ''} & $${r.value}$ & ${r.unit ? `$${r.unit}$` : ''}\\\\`);
  L.push('\\bottomrule', '\\end{longtable}');
  if (M.notes.length) { L.push('\\section*{Notes}', '\\begin{itemize}'); M.notes.forEach((n) => L.push(`\\item ${latexText(n)}`)); L.push('\\end{itemize}'); }
  if (M.refs.length) { L.push('\\section*{References}', '\\begin{enumerate}'); M.refs.forEach((r) => L.push(`\\item ${latexText(r)}`)); L.push('\\end{enumerate}'); }
  L.push('\\end{document}');
  // thin / narrow / no-break spaces (thousands grouping) can reach maths and \text{} too; "\," and "~" work in both modes
  return L.join('\n').replace(/[\u2009\u202f]/g, '\\,').replace(/\u00a0/g, '~') + '\n';
}

/** HTML body. mode 'katex' for the on-page preview / print, 'mathml' for Word and Google Docs. */
function toHTML(M, mode = 'katex') {
  const m = (x, display = false) => texHTML(x, { display, mathml: mode === 'mathml' });
  const txt = (s) => rich(s);
  const inline = (s) => (mode === 'mathml' ? String(s).split(/(\$[^$]+\$)/g).map((p) => (p.startsWith('$') && p.length > 2 ? m(p.slice(1, -1)) : esc(p))).join('') : txt(s));
  const P = [];
  P.push(`<h1>${esc(M.title)}</h1>`, `<p><em>${esc(M.summary)}</em></p>`, `<p>Based on: ${esc(M.source)}. Units: ${M.units}. Generated ${M.date} with Rocket Calculator.</p>`);
  P.push('<h2>Inputs and constants</h2><table><thead><tr><th>Symbol</th><th>Meaning</th><th>Value</th><th>Unit</th></tr></thead><tbody>');
  for (const s of M.nom) P.push(`<tr><td>${m(s.sym)}</td><td>${inline(s.desc)}${s.kind === 'constant' ? ' (constant)' : s.kind === 'result' ? ' (result)' : s.kind === 'derived' ? ' (derived)' : ''}</td><td>${s.value ? m(s.value) : ''}</td><td>${s.unit ? m(s.unit) : ''}</td></tr>`);
  for (const i of M.inputs.filter((x) => !x.sym)) P.push(`<tr><td></td><td>${inline(i.label)}</td><td>${m(i.value)}</td><td>${i.unit ? m(i.unit) : ''}</td></tr>`);
  P.push('</tbody></table>');
  for (const t of M.tables) {
    P.push(`<p><b>${inline(t.label)}</b></p><table><thead><tr><th>#</th>${t.columns.map((c) => `<th>${esc(c.label)} (${m(c.unit)})</th>`).join('')}</tr></thead><tbody>`);
    t.rows.forEach((r, k) => P.push(`<tr><td>${k}</td>${r.map((x) => `<td>${m(x)}</td>`).join('')}</tr>`));
    P.push('</tbody></table>');
  }
  for (const s of M.sections) {
    P.push(`<h2>${inline(s.title)}</h2>`);
    if (s.text) P.push(`<p>${inline(s.text)}</p>`);
    for (const st of s.steps || []) {
      if (st.label) P.push(`<h3>${inline(st.label)}</h3>`);
      if (st.formula) P.push(`<div class="eqn">${m(st.formula, true)}</div>`);
      if (st.where) P.push(`<p>${inline(st.where)}</p>`);
      if (st.values) P.push(`<p>${inline(st.values)}</p>`);
      if (st.calc && st.calc !== st.formula) P.push(`<div class="eqn">${m(st.calc, true)}</div>`);
      if (st.note) P.push(`<p>${inline(st.note)}</p>`);
    }
  }
  P.push('<h2>Results</h2><table><thead><tr><th>Quantity</th><th>Symbol</th><th>Value</th><th>Unit</th></tr></thead><tbody>');
  for (const r of M.results) P.push(`<tr><td>${r.key ? '<b>' + inline(r.label) + '</b>' : inline(r.label)}</td><td>${r.sym ? m(r.sym) : ''}</td><td>${m(r.value)}</td><td>${r.unit ? m(r.unit) : ''}</td></tr>`);
  P.push('</tbody></table>');
  if (M.notes.length) P.push('<h2>Notes</h2><ul>', ...M.notes.map((n) => `<li>${inline(n)}</li>`), '</ul>');
  if (M.refs.length) P.push('<h2>References</h2><ol>', ...M.refs.map((r) => `<li>${esc(r)}</li>`), '</ol>');
  return P.join('\n');
}
const WORD_CSS = 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;margin:6pt 0}th,td{border:1px solid #999;padding:3pt 6pt;text-align:left}h1{font-size:18pt}h2{font-size:14pt;margin-top:14pt}h3{font-size:11pt}';
/* ---------- card ---------- */
export function reportCard({ def, state, refList, getSystem }) {
  const FORMATS = [
    ['preview', 'Preview'], ['md', 'Markdown'], ['tex', 'LaTeX'],
  ];
  let fmtSel = 'preview', model = null, dirty = true;
  const tabs = h('div.report-tabs', { role: 'group', 'aria-label': 'Report format' },
    FORMATS.map(([k, l]) => h('button', { type: 'button', 'data-k': k, 'aria-pressed': String(k === fmtSel) }, l)));
  const preview = h('div.report-preview');
  const area = h('textarea', { readonly: true, spellcheck: 'false', 'aria-label': 'Report source', hidden: true });
  const note = h('p.muted', { style: 'margin:0;font-size:.85rem' });
  const copyBtn = h('button.btn.primary.small', { type: 'button' }, ICONS.copy(), 'Copy');
  const dlBtn = h('button.btn.small', { type: 'button' }, ICONS.download(), 'Download');
  const wordBtn = h('button.btn.small', { type: 'button', title: 'Copy formatted text with equations for pasting into Word or Google Docs' }, 'Copy for Word / Google Docs');
  const printBtn = h('button.btn.small.ghost', { type: 'button', title: 'Open a printable page — choose “Save as PDF” in the print dialog' }, 'Print / save as PDF');
  const body = h('div.report-body', preview, area, h('div.report-actions', copyBtn, dlBtn, wordBtn, printBtn), note);
  const card = h('section.card.report-card', { id: 'report' },
    h('div.card-head', h('h2', 'Export report'), h('span.spacer'), tabs), body);

  const ensure = () => { if (dirty || !model) { model = buildModel({ def, state, refList, getSystem }); dirty = false; } return model; };
  const source = () => {
    const M = ensure();
    return fmtSel === 'tex' ? toLaTeX(M) : toMarkdown(M);
  };
  const NOTES = {
    preview: 'Your inputs, the symbols used, the theory, every equation with your numbers substituted, the results and references — in the unit system selected at the top. Use “Copy for Word / Google Docs” to paste it with real equations.',
    md: 'Markdown with $…$ / $$…$$ maths — renders on GitHub, GitLab, Notion, Obsidian and most README viewers.',
    tex: 'A complete LaTeX article (amsmath, booktabs). Paste into Overleaf, or copy the sections you need into your report.',
  };
  function render() {
    if (!card.isConnected) return;
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === fmtSel)));
    const M = ensure();
    if (fmtSel === 'preview') { preview.hidden = false; area.hidden = true; preview.innerHTML = toHTML(M, 'katex'); }
    else { preview.hidden = true; area.hidden = false; area.value = source(); }
    note.textContent = NOTES[fmtSel];
    dlBtn.lastChild.textContent = fmtSel === 'tex' ? 'Download .tex' : 'Download .md';
    copyBtn.lastChild.textContent = fmtSel === 'tex' ? 'Copy LaTeX' : 'Copy Markdown';
  }
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { fmtSel = b.dataset.k; render(); } });
  copyBtn.addEventListener('click', async () => toast((await copyText(source())) ? `Copied ${fmtSel === 'tex' ? 'LaTeX' : 'Markdown'}` : 'Copy failed'));
  dlBtn.addEventListener('click', () => {
    const ext = fmtSel === 'tex' ? 'tex' : 'md';
    const type = ext === 'tex' ? 'application/x-tex' : 'text/markdown';
    download(`${def.slug}-report.${ext}`, source(), type);
  });
  wordBtn.addEventListener('click', async () => {
    const M = ensure();
    const html = `<html><head><meta charset="utf-8"><style>${WORD_CSS}</style></head><body>${toHTML(M, 'mathml')}</body></html>`;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([toMarkdown(M)], { type: 'text/plain' }) })]);
      toast('Copied — paste into Word or Google Docs');
    } catch { toast((await copyText(toMarkdown(M))) ? 'Rich copy not supported here — copied Markdown instead' : 'Copy failed'); }
  });
  printBtn.addEventListener('click', () => {
    const M = ensure();
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print the report'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(M.title)} — report</title>
<link rel="stylesheet" href="${url('vendor/katex/katex.min.css')}"><style>${WORD_CSS} body{max-width:780px;margin:24px auto;padding:0 20px;font-family:Inter,Arial,sans-serif} .eqn{overflow-x:auto} .katex-display{margin:.4em 0}</style></head>
<body>${toHTML(M, 'katex')}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  });
  // regenerate lazily: only when visible
  let visible = false;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => { visible = ents.some((e) => e.isIntersecting); if (visible && dirty) render(); }) : null;
  io?.observe(card);
  return {
    card,
    markDirty() { dirty = true; if (!io || visible) render(); },
    model: () => ensure(),
  };
}
export { toMarkdown, toLaTeX, toHTML, buildModel };
