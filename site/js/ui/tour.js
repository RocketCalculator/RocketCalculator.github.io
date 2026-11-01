// Guided tour for new visitors: a spotlight on one part of a page and a card explaining it, across the home page, one
// calculator and the reference library. The step survives the page change in sessionStorage.
import { h, url } from '../util.js';

const KEY = 'rc-tour';
const CALC = 'calculators/fin-flutter.html';
const STEPS = [
  { page: 'index.html', title: 'Welcome to Rocket Calculator', text: 'A two-minute tour of what the site can do. It moves between pages by itself; use Next and Back, the arrow keys, or Esc to stop at any time.' },
  { page: 'index.html', sel: '.hero-art', title: 'Try the flight', text: 'This flight is live: drag the launch rail or the wind arrow and watch the path, the parachutes and the landing point change.' },
  { page: 'index.html', sel: '#guide .steps', title: 'How every calculator works', text: 'All calculators follow the same six steps: describe your rocket, set your limits, read the verdict, see why, then compare and share.' },
  { page: 'index.html', sel: '#calculators .filters', title: 'Find a calculator', text: 'Filter the calculators by area (aerodynamics, structures, recovery…) or browse the cards below.' },
  { page: 'index.html', sel: '.search-btn', title: 'Search everything', text: 'Search calculators and reference documents by name. Shortcut: Ctrl K, or / anywhere on the site.' },
  { page: 'index.html', sel: '.header-tools .seg', title: 'SI or US units', text: 'Switch every input, result, plot and report between metric and US units. Your choice is remembered.' },
  { page: 'index.html', sel: '.header-tools .icon-btn[aria-label="Toggle light/dark mode"]', title: 'Light or dark', text: 'Pick a light or dark theme; the dot next to it changes the accent colour.' },
  { page: CALC, sel: '.calc-sub', title: 'A calculator page', text: 'This is Fin Flutter, one of the calculators. Each starts with what it does, why it matters and when to use it.' },
  { page: CALC, sel: '.calc-inputs', title: 'Describe your rocket', text: 'Inputs are grouped in the order you fill them. Load a worked example from the menu at the top, or reset to defaults. Values outside a safe range are flagged as you type.' },
  { page: CALC, sel: '.calc-inputs .fgroup .info-btn', title: 'The i buttons', text: 'Every input and result has an i button: a plain explanation, the formula, what each symbol means, and where it sits on the drawing.' },
  { page: CALC, sel: '.verdict', title: 'The verdict', text: 'The answer first: safe, marginal or unsafe against your limits, with fixes worked out for you — the change that would make it pass.' },
  { page: CALC, sel: '.key-results', title: 'Key results', text: 'The numbers that decide the verdict, coloured by status: green is fine, amber is close, red fails.' },
  { page: CALC, sel: '.dv-wrap', title: 'A drawing to scale', text: 'The drawing follows your inputs. Drag its handles to change a dimension, and zoom or pan with the buttons below it.' },
  { page: CALC, sel: '.plot-grid', title: 'Plots', text: 'Hover or touch a plot to read values. Each one exports as an image, a PDF or a CSV of the data.' },
  { page: CALC, sel: 'details.explore', title: 'Explore', text: 'Open Explore for more plots and a sweep of one input, to see how the answer changes as a design choice moves.' },
  { page: CALC, sel: '.design-bar', title: 'Name, compare and share', text: 'Name your design, keep a copy to compare against, and share a link that opens the calculator with your exact inputs.' },
  { page: CALC, sel: '#theory', title: 'The theory behind it', text: 'Every calculator has a full theory page and links to the original reports it is built from.' },
  { page: CALC, sel: '#report', title: 'A report in one click', text: 'Export a full report — inputs, every equation with your numbers substituted, results and references — as Markdown, LaTeX, Word or PDF.' },
  { page: 'references/index.html', sel: '.ref-layout', title: 'The reference library', text: 'Every document behind the calculators — memos, student papers, NACA reports — to read in the browser or download.' },
  { page: 'index.html', sel: '#calculators', title: 'You are ready', text: 'Pick a calculator and start with your own rocket. You can take this tour again from the compass button at the top of any page.', last: true },
];

const norm = (path) => path.replace(/\/$/, '/index.html');
const here = (page) => norm(new URL(url(page), location.href).pathname) === norm(location.pathname);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const save = (i) => { try { i == null ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, String(i)); } catch { /* private mode */ } };

let ui;
/** Start the tour at step i (0: the beginning), on whichever page that step lives. */
export function startTour(i = 0) {
  const st = STEPS[i];
  if (!here(st.page)) { save(i); location.href = url(st.page); return; }
  show(i);
}
/** Called once the page has drawn: carries on a tour that changed page. */
export function resumeTour() {
  let i; try { i = sessionStorage.getItem(KEY); } catch { return; }
  if (i != null && STEPS[+i] && here(STEPS[+i].page)) show(+i);
}

function build() {
  const spot = h('div.tour-spot', { 'aria-hidden': 'true' });
  const count = h('span.tour-count'), title = h('h2.tour-title', { id: 'tour-title' }), text = h('p.tour-text');
  const back = h('button.btn.small.ghost', { type: 'button' }, 'Back'), next = h('button.btn.small.primary', { type: 'button' }, 'Next');
  const close = h('button.tour-close', { type: 'button', 'aria-label': 'End the tour' }, '×');
  const pop = h('div.tour-pop', { role: 'dialog', 'aria-labelledby': 'tour-title', 'aria-live': 'polite' },
    h('div.tour-top', count, close), title, text, h('div.tour-actions', back, next));
  document.body.append(spot, pop);
  document.body.classList.add('touring');
  const onKey = (e) => {
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) next.click();
    else if (e.key === 'ArrowLeft' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) back.click();
  };
  let raf = 0;
  const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  document.addEventListener('keydown', onKey);
  addEventListener('scroll', onMove, { passive: true });
  addEventListener('resize', onMove);
  close.addEventListener('click', () => end());
  back.addEventListener('click', () => ui.i > 0 && go(ui.i - 1));
  next.addEventListener('click', () => (STEPS[ui.i].last ? end() : go(ui.i + 1)));
  ui = { spot, pop, count, title, text, back, next, i: 0, target: null, off: () => {
    document.removeEventListener('keydown', onKey); removeEventListener('scroll', onMove); removeEventListener('resize', onMove);
  } };
}
function go(i) { if (here(STEPS[i].page)) show(i); else { save(i); location.href = url(STEPS[i].page); } }
function end() { save(null); if (!ui) return; ui.off(); document.body.classList.remove('touring'); ui.spot.remove(); ui.pop.remove(); ui = null; }

async function show(i) {
  if (!ui) build();
  ui.i = i; save(i);
  const st = STEPS[i];
  // wait for the page to draw the target (calculator pages build after load); skip a step whose target never shows
  let el = null;
  for (let t = 0; st.sel && t < 40 && !(el && el.getClientRects().length); t++) { el = document.querySelector(st.sel); if (!el?.getClientRects().length) await new Promise((r) => setTimeout(r, 100)); }
  if (!ui || ui.i !== i) return; // the tour moved on or ended while this step waited
  if (st.sel && !el?.getClientRects().length) { if (STEPS[i + 1] && !st.last) return go(i + 1); el = null; }
  if (el?.tagName === 'DETAILS' && !el.open) el.open = true;
  ui.target = el;
  ui.count.textContent = `${i + 1} of ${STEPS.length}`;
  ui.title.textContent = st.title; ui.text.textContent = st.text;
  ui.back.disabled = i === 0; ui.next.textContent = st.last ? 'Finish' : 'Next';
  if (el) {
    // the top of the target just under the sticky header; a phone keeps the bottom of the screen for the card
    const head = document.querySelector('.site-header')?.offsetHeight || 0;
    const r = el.getBoundingClientRect(), room = innerHeight - head - (innerWidth < 640 ? ui.pop.offsetHeight + 24 : 0);
    const y = scrollY + r.top - head - (r.height < room ? Math.max(16, (room - r.height) / 2) : 16);
    scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' });
  }
  place();
  setTimeout(place, reduced() ? 0 : 450);
  ui.next.focus({ preventScroll: true });
}

function place() {
  if (!ui) return;
  const { spot, pop, target } = ui, pad = 8, gap = 14, phone = innerWidth < 640;
  pop.classList.toggle('sheet', phone || !target);
  pop.classList.toggle('center', !target);
  if (!target) { spot.style.cssText = 'opacity:0'; pop.style.cssText = ''; return; }
  const r = target.getBoundingClientRect();
  const top = Math.max(r.top - pad, 0), bottom = Math.min(r.bottom + pad, innerHeight);
  spot.style.cssText = `opacity:1;left:${r.left - pad}px;top:${top}px;width:${r.width + 2 * pad}px;height:${Math.max(0, bottom - top)}px`;
  if (phone) { pop.style.cssText = ''; return; }
  const pw = pop.offsetWidth, ph = pop.offsetHeight, clampY = (y) => Math.min(innerHeight - ph - 12, Math.max(12, y));
  let left = Math.min(Math.max(12, r.left), innerWidth - pw - 12), y = r.bottom + pad + gap;
  // below the target if it fits, else above, else beside it, else inside its lower edge
  if (y + ph > innerHeight - 12) y = r.top - pad - gap - ph;
  if (y < 12) {
    y = clampY((top + bottom - ph) / 2);
    if (r.left - pad - gap - pw >= 12) left = r.left - pad - gap - pw;
    else if (r.right + pad + gap + pw <= innerWidth - 12) left = r.right + pad + gap;
    else y = clampY(bottom - ph - gap);
  }
  pop.style.cssText = `left:${left}px;top:${y}px`;
}

/** The tour button: a compass. */
export function tourButton(cls = 'button.icon-btn.tour-btn') {
  const b = h(cls, { type: 'button', 'aria-label': 'Take a tour of the site', title: 'Take a tour of the site' },
    h('span', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>' }));
  b.addEventListener('click', () => startTour(0));
  return b;
}
