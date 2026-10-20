// "Coming soon" topic page: abstract, status, reference documents (openable), original files on rsandt.com.
import { h, url, loadRegistry, loadReferences } from './util.js';
import { initShell, ICONS } from './app.js';

export async function mountTopic(slug) {
  const main = initShell({ active: 'calculators' });
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences()]);
  const t = reg.topics.find((x) => x.slug === slug);
  if (!t) { main.append(h('div.wrap', h('h1', 'Topic not found'))); return; }
  const area = reg.areas.find((a) => a.id === t.area);
  const myRefs = t.references.map((id) => refs.find((r) => r.id === id)).filter(Boolean);
  const siblings = reg.topics.filter((x) => x.area === t.area && x.slug !== t.slug);
  document.title = `${t.title} — Rocket Calculator`;
  main.append(h('div.wrap',
    h('nav.breadcrumb', { 'aria-label': 'Breadcrumb' }, h('a', { href: url('index.html') }, 'Home'), h('span.sep', '/'),
      h('a', { href: url(`index.html#area-${area.id}`) }, area.title), h('span.sep', '/'), h('span', t.title)),
    h('div.calc-title', h('h1', t.title)),
    h('p.calc-sub', t.summary),
    h('div.calc-badges', h('span.chip.soon', 'Calculator coming soon'), h('span.chip', area.title), h('span.chip', `${myRefs.length} reference document${myRefs.length === 1 ? '' : 's'}`)),
    h('div.calc-layout', { style: 'grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr)' },
      h('div.calc-outputs',
        h('section.card.card-pad',
          h('h2', 'About this topic'),
          h('p', { style: 'color:var(--text-2)' }, t.abstract),
          h('p.muted', { style: 'font-size:.84rem;margin:0' }, 'Abstract from ', h('a', { href: 'http://www.rsandt.com/reports.html', rel: 'noopener' }, 'rsandt.com/reports'), '.')),
        h('section.card.card-pad',
          h('h2', 'Reference documents'),
          myRefs.length ? h('ul.refs-list', myRefs.map((r) => h('li',
            h('div', h('div.t', r.title), h('div.a', [r.authors, r.venue, r.pages ? `${r.pages} pp.` : ''].filter(Boolean).join(' · '))),
            h('div.go', h('a.btn.small', { href: url(`references/index.html#${r.id}`) }, 'Go to reference'),
              h('a.btn.small.ghost', { href: url(r.file), target: '_blank', rel: 'noopener' }, 'PDF', ICONS.external()))))) : h('p.muted', 'No PDF documents for this topic.'),
          t.sourceFiles.length ? h('div', { style: 'margin-top:16px' },
            h('h3', 'Original spreadsheets & slides'),
            h('p.muted', { style: 'font-size:.86rem' }, 'These files are not re-hosted here; download them from the original site. Many use Excel macros (enable macros to run them).'),
            h('ul.refs-list', t.sourceFiles.map((f) => h('li', h('div', h('div.t', f.name), h('div.a', f.ext.toUpperCase())),
              h('div.go', h('a.btn.small.ghost', { href: f.url, rel: 'noopener' }, 'Download from rsandt.com', ICONS.external())))))) : null)),
      h('aside.calc-outputs',
        h('section.card.card-pad',
          h('h3', 'Status'),
          h('p', { style: 'color:var(--text-2)' }, 'An interactive calculator for this topic has not been built yet. The theory is available now in the reference documents.'),
          h('a.btn.primary', { href: url('index.html#calculators') }, 'See available calculators')),
        siblings.length ? h('section.card.card-pad',
          h('h3', `More in ${area.title}`),
          h('ul', { style: 'margin:0;padding-left:1.1em;display:grid;gap:4px' }, siblings.map((x) => h('li',
            h('a', { href: url(`calculators/${x.status === 'available' ? x.calculators[0] : x.slug}.html`) }, x.title),
            x.status === 'available' ? h('span.chip.ok', { style: 'margin-left:6px' }, 'live') : null)))) : null))));
}
