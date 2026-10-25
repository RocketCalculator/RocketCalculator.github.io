// Documentation pages: shell, KaTeX, auto table of contents with scroll-spy, anchor highlighting.
import { h } from './util.js';
import { initShell } from './app.js';
import { renderAll } from './math.js';

export async function mountDocs({ active = 'calculators' } = {}) {
  const main = initShell({ active });
  const article = main.querySelector('article.doc');
  const toc = main.querySelector('.doc-toc');
  const sections = [...article.querySelectorAll(':scope > section[id]')];
  if (toc) {
    const links = sections.map((sec, i) => {
      const title = sec.querySelector('h2')?.textContent.replace(/^\d+\s*/, '') || sec.id;
      return h('li', h('a', { href: `#${sec.id}`, 'data-id': sec.id }, `${i + 1}. ${title}`));
    });
    toc.append(h('h4', 'On this page'), h('ol', links));
    sections.forEach((sec, i) => { const h2 = sec.querySelector('h2'); if (h2 && !h2.querySelector('.num')) h2.prepend(h('span.num', String(i + 1).padStart(2, '0'))); });
    const spy = () => {
      const line = 100;
      let cur = sections[0];
      for (const sec of sections) if (sec.getBoundingClientRect().top <= line) cur = sec;
      toc.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.id === cur?.id));
    };
    let raf = 0;
    window.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(spy); }, { passive: true });
    setTimeout(spy, 50);
  }
  // number equations automatically: .eq elements get (n)
  let n = 0;
  article.querySelectorAll('.eq').forEach((eq) => {
    n++;
    if (!eq.querySelector('.no')) eq.append(h('span.no', `(${n})`));
    if (!eq.id) eq.id = `eq-${n}`;
  });
  await renderAll(main);
  if (location.hash) {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) requestAnimationFrame(() => t.scrollIntoView({ block: 'start' }));
  }
}
