// Reference library: every PDF with readable titles, filters, in-page viewer, new-tab and download links.
import { h, s, url, loadRegistry, loadReferences } from './util.js';
import { initShell, ICONS } from './app.js';

const pdfIcon = (kind) => s('svg', { viewBox: '0 0 30 36', class: 'pdf-ico', 'aria-hidden': 'true' },
  s('path', { d: 'M3 1h17l7 7v26a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z', fill: 'var(--surface-2)', stroke: 'var(--border-strong)' }),
  s('path', { d: 'M20 1v7h7', fill: 'none', stroke: 'var(--border-strong)' }),
  s('rect', { x: 0, y: 19, width: 22, height: 10, rx: 2, fill: kind === 'original' ? 'var(--accent)' : 'var(--accent-2)' }),
  s('text', { x: 11, y: 26.6, 'text-anchor': 'middle', fill: 'var(--surface)', style: 'font:700 7px var(--font-sans)' }, kind === 'original' ? 'PDF' : 'DOC'));

export async function mountReferences() {
  const main = initShell({ active: 'references' });
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences()]);
  const topicTitle = Object.fromEntries(reg.topics.map((t) => [t.slug, t.title]));

  const q = h('input', { type: 'search', placeholder: 'Filter by title, author or topic…', 'aria-label': 'Filter references' });
  const kindChips = [['all', 'All'], ['word', 'RS&T memos & reports'], ['original', 'Papers & scanned originals']].map(([v, l]) =>
    h('button.filter-chip', { type: 'button', 'data-kind': v, 'aria-pressed': String(v === 'all') }, l));
  const topicSel = h('select.filter-chip', { 'aria-label': 'Filter by topic' }, h('option', { value: '' }, 'All topics'),
    reg.topics.slice().sort((a, b) => a.title.localeCompare(b.title)).map((t) => h('option', { value: t.slug }, t.title)));
  const count = h('span.muted', { style: 'font-size:.84rem;margin-left:auto' });
  const list = h('div.ref-items', { role: 'list' });

  const vTitle = h('span.t', 'No document selected');
  const vNew = h('a.btn.small', { target: '_blank', rel: 'noopener', hidden: true }, 'Open in new tab', ICONS.external());
  const vDl = h('a.btn.small.ghost', { download: '', hidden: true }, ICONS.download(), 'Download');
  const vSrc = h('a.btn.small.ghost', { rel: 'noopener', hidden: true, title: 'Original file on rsandt.com' }, 'Original');
  const frameHost = h('div', { style: 'flex:1;display:flex;min-height:0' },
    h('div.viewer-empty', h('div', h('p', { style: 'font-size:1.05rem;color:var(--text-2)' }, 'Select a document to read it here.'),
      h('p', 'Every reference opens in this panel, in a new tab, or as a download. Word memos have been converted to PDF so their equations render exactly as written.'))));
  const viewer = h('section.card.viewer', { 'aria-label': 'Document viewer' },
    h('div.card-head', vTitle, h('span.spacer'), vSrc, vDl, vNew), frameHost);

  let kind = 'all', current = null;
  const render = () => {
    const term = q.value.trim().toLowerCase(), tp = topicSel.value;
    kindChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.kind === kind)));
    const shown = refs.filter((r) => (kind === 'all' || r.kind === kind) && (!tp || r.topics.includes(tp)) &&
      (!term || `${r.title} ${r.authors} ${r.venue} ${r.sourceFile} ${r.topics.map((t) => topicTitle[t]).join(' ')}`.toLowerCase().includes(term)));
    count.textContent = `${shown.length} of ${refs.length} documents`;
    list.replaceChildren(...(shown.length ? shown.map((r) => {
      const b = h('button.card.ref-item', { type: 'button', id: r.id, role: 'listitem', 'aria-current': String(r.id === current?.id) },
        pdfIcon(r.kind),
        h('div', h('div.t', r.title), h('div.a', [r.authors, r.venue].filter(Boolean).join(' · ')),
          h('div.tags', r.topics.map((t) => h('span.chip', topicTitle[t])))),
        h('div.sz', r.pages ? `${r.pages} pp.` : '', h('br'), `${r.sizeKB >= 1024 ? (r.sizeKB / 1024).toFixed(1) + ' MB' : r.sizeKB + ' KB'}`));
      b.addEventListener('click', () => open(r, true));
      return b;
    }) : [h('div.card.empty', 'No documents match.')]));
  };
  function open(r, user) {
    current = r;
    const href = url(r.file);
    vTitle.textContent = r.title; vTitle.title = r.title;
    vNew.href = href; vDl.href = href; vDl.setAttribute('download', r.file.split('/').pop()); vSrc.href = r.sourceUrl;
    [vNew, vDl, vSrc].forEach((x) => (x.hidden = false));
    frameHost.replaceChildren(h('iframe', { src: href + '#view=FitH', title: r.title, loading: 'lazy' }));
    list.querySelectorAll('.ref-item').forEach((x) => x.setAttribute('aria-current', String(x.id === r.id)));
    if (user) history.replaceState(null, '', '#' + r.id);
    if (window.matchMedia('(max-width: 1060px)').matches && user) viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  q.addEventListener('input', render);
  topicSel.addEventListener('change', render);
  kindChips.forEach((c) => c.addEventListener('click', () => { kind = c.dataset.kind; render(); }));

  // Files that are not PDFs are not re-hosted: link to rsandt.com
  const other = [];
  const seen = new Set();
  for (const t of reg.topics) for (const f of t.sourceFiles) {
    if (seen.has(f.name)) continue; seen.add(f.name);
    other.push({ ...f, topic: t.title });
  }
  const groups = [['Presentations & archives', ['ppt', 'pptx', 'zip']], ['Original spreadsheets (Excel)', ['xls', 'xlsx']], ['Other', ['doc', 'docx']]];
  const otherSection = h('section.section',
    h('h2', 'Not hosted here — download from rsandt.com'),
    h('p.muted', 'Slide decks, archives and the original Excel workbooks stay on the author’s site. Many workbooks use macros: enable macros in Excel to run them.'),
    groups.map(([title, exts]) => {
      const fs = other.filter((f) => exts.includes(f.ext));
      if (!fs.length) return null;
      return h('div', { style: 'margin-top:14px' }, h('h3', title),
        h('ul.refs-list', fs.map((f) => h('li', h('div', h('div.t', f.name), h('div.a', f.topic)),
          h('div.go', h('a.btn.small.ghost', { href: f.url, rel: 'noopener' }, 'Download from rsandt.com', ICONS.external()))))));
    }));

  main.append(h('div.wrap',
    h('nav.breadcrumb', h('a', { href: url('index.html') }, 'Home'), h('span.sep', '/'), h('span', 'References')),
    h('div.calc-title', h('h1', 'Reference library')),
    h('p.calc-sub', `${refs.length} documents behind the calculators: C. P. Hoult’s RS&T memos (converted from Word so equations render exactly), student papers, and classic NACA, BRL and journal papers. Open any document here, in a new tab, or download it.`),
    h('div.filters', q, ...kindChips, topicSel, count),
    h('div.ref-layout', list, viewer),
    otherSection));
  render();
  const id = location.hash.slice(1);
  const r = refs.find((x) => x.id === id);
  if (r) {
    open(r, false);
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('target'); }
  }
}
