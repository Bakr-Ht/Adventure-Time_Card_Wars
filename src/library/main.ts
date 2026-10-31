import '@fontsource/luckiest-guy';
import '@fontsource/grandstander/500.css';
import '@fontsource/grandstander/700.css';
import './library.css';
import {
  SHELLS,
  STATUSES,
  STATUS_LABEL,
  counts,
  filterGames,
  genres,
  load,
  pickNext,
  sanitizeShelf,
  sampleShelf,
  save,
  totalHours,
  uid,
  type Game,
  type Query,
  type SortKey,
  type Status,
} from './store';

/* ---------------------------------------------------------------- helpers */

type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | null | undefined | false;

/** Tiny element builder. Text always goes through text nodes, never innerHTML, so user data cannot inject markup. */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const ICONS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
  play: '<path d="M8 5.5v13l10-6.5-10-6.5Z"/>',
  pencil: '<path d="m4.5 19.5 1-4.5L16 4.5l3.5 3.5L9 18.5l-4.5 1Z"/><path d="m13.5 7 3.5 3.5"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  eject: '<path d="M12 5 5 13h14l-7-8ZM5 18h14"/>',
};

function icon(name: keyof typeof ICONS, cls = 'ic'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICONS[name]; // static, authored markup only
  return svg;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ state */

let games: Game[] = load();
let selectedId: string | null = null;
const query: Query = { text: '', status: 'all', genre: 'all', sort: 'recent' };

function persist(): void {
  if (!save(games)) toast('Could not save. This browser is blocking storage, so changes last until you close the tab.');
}

const selected = (): Game | null => games.find((g) => g.id === selectedId) ?? null;
const visible = (): Game[] => filterGames(games, query);

function update(id: string, patch: Partial<Game>): void {
  games = games.map((g) => (g.id === id ? { ...g, ...patch } : g));
  persist();
}

/* ------------------------------------------------------------------ shell */

const app = document.getElementById('app')!;
const live = h('div', { class: 'sr-only', 'aria-live': 'polite', role: 'status' });
const toastEl = h('div', { class: 'toast' });

let toastTimer = 0;
function toast(msg: string): void {
  announce(msg); // the toast is visibility:hidden between messages, so announce through the persistent region
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 3200);
}
function announce(msg: string): void {
  live.textContent = '';
  requestAnimationFrame(() => (live.textContent = msg));
}

const searchInput = h('input', {
  id: 'q',
  type: 'search',
  class: 'field',
  placeholder: 'Title, studio, genre, notes…',
  autocomplete: 'off',
  spellcheck: 'false',
}) as HTMLInputElement;
const genreSelect = h('select', { id: 'genre', class: 'field' }) as HTMLSelectElement;
const sortSelect = h(
  'select',
  { id: 'sort', class: 'field' },
  h('option', { value: 'recent' }, 'Recently added'),
  h('option', { value: 'title' }, 'Title A–Z'),
  h('option', { value: 'rating' }, 'Most hearts'),
  h('option', { value: 'hours' }, 'Most hours'),
  h('option', { value: 'year' }, 'Newest release'),
) as HTMLSelectElement;
const tabs = h('div', { class: 'tabs', role: 'radiogroup', 'aria-label': 'Show' });
const summary = h('p', { class: 'summary' });
const grid = h('ul', { class: 'grid', 'aria-label': 'Games' });
const emptyEl = h('div', { class: 'empty', hidden: true });
const screen = h('div', { class: 'screen', id: 'screen', 'aria-live': 'off' });
const slot = h('div', { class: 'slot', 'aria-hidden': 'true' }, h('div', { class: 'slot-cart' }));
const bmoFace = h('div', { class: 'bmo-face', 'aria-hidden': 'true' });

searchInput.addEventListener('input', () => {
  query.text = searchInput.value;
  renderShelf();
});
genreSelect.addEventListener('change', () => {
  query.genre = genreSelect.value;
  renderShelf();
});
sortSelect.addEventListener('change', () => {
  query.sort = sortSelect.value as SortKey;
  renderShelf();
});

function step(dir: 1 | -1): void {
  const list = visible();
  if (!list.length) return;
  const i = list.findIndex((g) => g.id === selectedId);
  const next = list[(i + dir + list.length) % list.length] ?? list[0];
  select(next.id);
}

function bmoPick(): void {
  const pick = pickNext(games, selectedId);
  if (!pick) {
    toast('Nothing is up next or on the wishlist, so BMO has nothing to pick. Add a game first.');
    return;
  }
  bmoFace.dataset.mood = 'think';
  const go = () => {
    bmoFace.dataset.mood = 'happy';
    select(pick.id, true);
    announce(`BMO picked ${pick.title}.`);
  };
  if (reduceMotion()) go();
  else window.setTimeout(go, 650);
}

const bmo = h(
  'section',
  { class: 'bmo', 'aria-label': 'BMO, the selected game' },
  slot,
  h('div', { class: 'bmo-body' }, screen, bmoFace,
    h(
      'div',
      { class: 'pad' },
      h(
        'div',
        { class: 'dpad', role: 'group', 'aria-label': 'Browse games' },
        h('button', { class: 'dpad-l', type: 'button', 'aria-label': 'Previous game', onclick: () => step(-1) }),
        h('button', { class: 'dpad-r', type: 'button', 'aria-label': 'Next game', onclick: () => step(1) }),
      ),
      h(
        'div',
        { class: 'face-buttons' },
        h('button', { class: 'btn-a', type: 'button', onclick: bmoPick }, icon('dice'), h('span', {}, 'Pick for me')),
        h('button', {
          class: 'btn-b',
          type: 'button',
          onclick: () => {
            if (selectedId) {
              select(null);
              announce('Cartridge ejected.');
            }
          },
        }, icon('eject'), h('span', {}, 'Eject')),
      ),
    ),
  ),
);

const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1 }) as HTMLInputElement;
fileInput.addEventListener('change', importFile);

app.append(
  h(
    'header',
    { class: 'top' },
    h('a', { class: 'brand', href: './library.html' }, brandMark(), h('span', {}, "BMO's Game Shelf")),
    h('nav', { class: 'top-nav', 'aria-label': 'Site' },
      h('a', { class: 'link', href: './index.html' }, 'Play Card Wars'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm(null) }, icon('plus'), h('span', {}, 'Add a game')),
    ),
  ),
  h(
    'main',
    { class: 'layout' },
    h('div', { class: 'bmo-col' }, bmo),
    h(
      'section',
      { class: 'shelf-col', id: 'shelf', 'aria-labelledby': 'shelf-title', tabindex: -1 },
      h('div', { class: 'shelf-head' }, h('h1', { id: 'shelf-title' }, 'Your shelf'), summary),
      h(
        'div',
        { class: 'toolbar', role: 'search' },
        h('label', { class: 'search' }, icon('search'), h('span', { class: 'sr-only' }, 'Search games'), searchInput, h('kbd', { 'aria-hidden': 'true' }, '/')),
        tabs,
        h('label', { class: 'select' }, h('span', {}, 'Genre'), genreSelect),
        h('label', { class: 'select' }, h('span', {}, 'Sort'), sortSelect),
      ),
      grid,
      emptyEl,
      h(
        'footer',
        { class: 'shelf-foot' },
        h('p', {}, 'Your shelf lives in this browser only. Nothing is uploaded.'),
        h('div', { class: 'foot-actions' },
          h('button', { class: 'btn btn-quiet', type: 'button', onclick: exportFile }, icon('download'), h('span', {}, 'Export')),
          h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => fileInput.click() }, icon('upload'), h('span', {}, 'Import')),
          h('button', { class: 'btn btn-quiet', type: 'button', onclick: resetShelf }, h('span', {}, 'Restore sample shelf')),
          fileInput,
        ),
      ),
    ),
  ),
  live,
  toastEl,
);

function brandMark(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 40 48');
  svg.setAttribute('class', 'mark');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<rect x="3" y="3" width="34" height="42" rx="6" fill="var(--bmo)" stroke="var(--ink)" stroke-width="3"/>' +
    '<rect x="8" y="8" width="24" height="17" rx="3" fill="var(--bmo-screen)" stroke="var(--ink)" stroke-width="2.5"/>' +
    '<circle cx="15" cy="15" r="1.6" fill="var(--ink)"/><circle cx="25" cy="15" r="1.6" fill="var(--ink)"/>' +
    '<path d="M16 19.5q4 3 8 0" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M11 35h6M14 32v6" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="28" cy="35" r="3" fill="var(--tomato)" stroke="var(--ink)" stroke-width="2"/>';
  return svg;
}

/* ------------------------------------------------------------------ shelf */

function renderTabs(): void {
  const c = counts(games);
  const opts: { v: Status | 'all'; label: string; n: number }[] = [
    { v: 'all', label: 'All', n: games.length },
    ...STATUSES.map((s) => ({ v: s, label: STATUS_LABEL[s], n: c[s] })),
  ];
  tabs.replaceChildren(
    ...opts.map((o) =>
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          class: 'tab',
          'data-status': o.v,
          'aria-checked': String(query.status === o.v),
          tabindex: query.status === o.v ? 0 : -1,
          onclick: () => {
            query.status = o.v;
            renderShelf();
            (tabs.querySelector(`[data-status="${o.v}"]`) as HTMLElement | null)?.focus();
          },
          onkeydown: (e: Event) => {
            const k = (e as KeyboardEvent).key;
            if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
            e.preventDefault();
            const i = opts.findIndex((x) => x.v === query.status);
            const n = opts[(i + (k === 'ArrowRight' ? 1 : -1) + opts.length) % opts.length];
            query.status = n.v;
            renderShelf();
            (tabs.querySelector(`[data-status="${n.v}"]`) as HTMLElement | null)?.focus();
          },
        },
        o.label,
        h('span', { class: 'tab-n' }, String(o.n)),
      ),
    ),
  );
}

function renderGenres(): void {
  const list = genres(games);
  if (query.genre !== 'all' && !list.includes(query.genre)) query.genre = 'all';
  genreSelect.replaceChildren(
    h('option', { value: 'all' }, 'Every genre'),
    ...list.map((g) => h('option', { value: g }, g)),
  );
  genreSelect.value = query.genre;
}

function renderSummary(): void {
  const c = counts(games);
  const hrs = totalHours(games);
  summary.replaceChildren(
    h('strong', {}, plural(games.length, 'game')),
    ` · ${c.playing} playing · ${c.backlog} up next · ${c.finished} finished · ${c.wishlist} wished for`,
    hrs ? ` · ${hrs} h logged` : '',
  );
}

/** Stable label pattern per title, so a cartridge keeps its look across visits. */
function patternOf(title: string): number {
  let n = 0;
  for (const ch of title) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n % 4;
}

function cartridge(g: Game): HTMLLIElement {
  const isSel = g.id === selectedId;
  const meta = [g.genre, g.year].filter(Boolean).join(' · ');
  return h(
    'li',
    { class: 'cell' },
    h(
      'button',
      {
        type: 'button',
        class: 'cart',
        style: `--shell:${g.shell}`,
        'aria-pressed': String(isSel),
        'data-id': g.id,
        onclick: () => select(isSel ? null : g.id, true),
      },
      h('span', { class: 'cart-ridges', 'aria-hidden': 'true' }),
      h(
        'span',
        { class: 'cart-label' },
        h('span', { class: 'cart-art', 'data-art': g.playUrl ? 'cardwars' : String(patternOf(g.title)), 'aria-hidden': 'true' }),
        h('span', { class: 'cart-title' }, g.title),
        h('span', { class: 'cart-meta' }, meta),
      ),
      h('span', { class: `cart-status s-${g.status}` }, isSel ? 'In BMO' : STATUS_LABEL[g.status]),
      g.rating ? h('span', { class: 'cart-hearts', 'aria-label': `${g.rating} of 5 hearts` }, ...Array.from({ length: g.rating }, () => icon('heart', 'ic ic-heart'))) : null,
      g.playUrl ? h('span', { class: 'cart-playable' }, 'Playable here') : null,
    ),
  );
}

function renderShelf(): void {
  renderTabs();
  renderGenres();
  renderSummary();
  const list = visible();
  grid.replaceChildren(...list.map(cartridge));
  grid.hidden = list.length === 0;
  emptyEl.hidden = list.length !== 0;
  if (!list.length) {
    const filtered = query.text || query.status !== 'all' || query.genre !== 'all';
    emptyEl.replaceChildren(
      h('p', { class: 'empty-title' }, games.length ? 'No cartridge matches that.' : 'The shelf is empty.'),
      h('p', {}, games.length ? 'Try another word, or clear the filters to see the whole shelf.' : 'Add the first game you are playing, or restore the sample shelf.'),
      filtered
        ? h('button', { class: 'btn', type: 'button', onclick: clearFilters }, 'Clear filters')
        : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm(null) }, icon('plus'), h('span', {}, 'Add a game')),
    );
  }
}

function clearFilters(): void {
  Object.assign(query, { text: '', status: 'all', genre: 'all' });
  searchInput.value = '';
  renderShelf();
  searchInput.focus();
}

/* ----------------------------------------------------------------- screen */

function select(id: string | null, fromShelf = false): void {
  const changed = id !== selectedId;
  selectedId = id;
  renderShelf();
  renderScreen(changed);
  if (id && fromShelf && window.matchMedia('(max-width: 899px)').matches) {
    bmo.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }
}

function hearts(g: Game): HTMLElement {
  const wrap = h('div', { class: 'hearts', role: 'radiogroup', 'aria-label': 'Hearts' });
  for (let n = 1; n <= 5; n++) {
    wrap.append(
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          class: 'heart',
          'aria-checked': String(g.rating === n),
          'aria-label': plural(n, 'heart'),
          'data-on': String(n <= g.rating),
          'data-focus': `heart-${n}`,
          onclick: () => {
            update(g.id, { rating: g.rating === n ? 0 : n });
            refreshScreen(`heart-${n}`);
          },
        },
        icon('heart'),
      ),
    );
  }
  return wrap;
}

function renderScreen(insert = false): void {
  const g = selected();
  slot.style.setProperty('--shell', g?.shell ?? 'transparent');
  slot.classList.toggle('is-loaded', !!g);
  if (insert && g && !reduceMotion()) {
    slot.classList.remove('is-inserting');
    void slot.offsetWidth; // restart the insert animation
    slot.classList.add('is-inserting');
  }
  bmoFace.dataset.mood = g ? 'happy' : 'idle';

  if (!g) {
    screen.replaceChildren(
      h(
        'div',
        { class: 'screen-idle' },
        h('p', { class: 'screen-big' }, 'Hi! I am BMO.'),
        h('p', {}, 'Pick a cartridge from the shelf and I will read it. Or press the red button and I will choose what you play next.'),
      ),
    );
    return;
  }

  const notes = h('textarea', { id: 'notes', class: 'field', rows: 3, maxlength: 1000, placeholder: 'Where you left off, what to try next…' }) as HTMLTextAreaElement;
  notes.value = g.notes;
  let t = 0;
  notes.addEventListener('input', () => {
    clearTimeout(t);
    t = window.setTimeout(() => update(g.id, { notes: notes.value.slice(0, 1000) }), 300);
  });

  const hoursIn = h('input', { id: 'hours', class: 'field', type: 'number', min: 0, max: 99999, step: 0.5, inputmode: 'decimal', placeholder: '—' }) as HTMLInputElement;
  hoursIn.value = g.hours === null ? '' : String(g.hours);
  hoursIn.addEventListener('change', () => {
    const v = hoursIn.value === '' ? null : Number(hoursIn.value);
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      hoursIn.value = g.hours === null ? '' : String(g.hours);
      toast('Hours must be zero or more.');
      return;
    }
    update(g.id, { hours: v === null ? null : Math.round(v * 10) / 10 });
    renderSummary();
  });

  const meta = [g.developer, g.year, g.platform].filter(Boolean).join(' · ');

  screen.replaceChildren(
    h('h2', { class: 'screen-title', id: 'screen-title' }, g.title),
    h('p', { class: 'screen-meta' }, meta || g.genre, meta ? h('span', { class: 'chip' }, g.genre) : null),
    h(
      'div',
      { class: 'seg', role: 'radiogroup', 'aria-label': 'Status' },
      ...STATUSES.map((s) =>
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            class: 'seg-btn',
            'aria-checked': String(g.status === s),
            'data-focus': `status-${s}`,
            onclick: () => {
              if (g.status === s) return;
              update(g.id, { status: s });
              renderShelf();
              refreshScreen(`status-${s}`);
              announce(`${g.title} moved to ${STATUS_LABEL[s]}.`);
            },
          },
          STATUS_LABEL[s],
        ),
      ),
    ),
    h(
      'div',
      { class: 'screen-row' },
      h('div', { class: 'screen-field' }, h('span', { class: 'lbl', id: 'hearts-lbl' }, 'Hearts'), hearts(g)),
      h(
        'div',
        { class: 'screen-field' },
        h('label', { class: 'lbl', for: 'hours' }, 'Hours played'),
        h('div', { class: 'hours' }, hoursIn, h('button', {
          type: 'button',
          class: 'btn btn-small',
          'data-focus': 'add-hour',
          onclick: () => {
            update(g.id, { hours: Math.round(((g.hours ?? 0) + 1) * 10) / 10 });
            renderSummary();
            refreshScreen('add-hour');
          },
        }, '+1 h')),
      ),
    ),
    h('label', { class: 'lbl', for: 'notes' }, 'Notes'),
    notes,
    h(
      'div',
      { class: 'screen-actions' },
      g.playUrl ? h('a', { class: 'btn btn-primary', href: g.playUrl }, icon('play'), h('span', {}, 'Play now')) : null,
      h('button', { class: 'btn', type: 'button', onclick: () => openForm(g) }, icon('pencil'), h('span', {}, 'Edit details')),
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => removeGame(g) }, icon('trash'), h('span', {}, 'Remove')),
    ),
  );
}

function refreshScreen(focusKey: string): void {
  renderScreen();
  renderShelf();
  (screen.querySelector(`[data-focus="${focusKey}"]`) as HTMLElement | null)?.focus();
}

/* ---------------------------------------------------------- add / edit / remove */

const dialog = h('dialog', { class: 'sheet', 'aria-labelledby': 'form-title' }) as HTMLDialogElement;
document.body.append(dialog);

function openForm(g: Game | null): void {
  const editing = !!g;
  let shell: string = g?.shell ?? SHELLS[games.length % SHELLS.length];
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });

  const field = (id: string, label: string, input: HTMLElement, hint?: string) =>
    h('div', { class: 'f' }, h('label', { for: id }, label), input, hint ? h('p', { class: 'hint', id: `${id}-hint` }, hint) : null);

  const title = h('input', { id: 'f-title', class: 'field', required: true, maxlength: 80, autocomplete: 'off' }) as HTMLInputElement;
  const dev = h('input', { id: 'f-dev', class: 'field', maxlength: 60, autocomplete: 'off' }) as HTMLInputElement;
  const year = h('input', { id: 'f-year', class: 'field', type: 'number', min: 1950, max: 2100, inputmode: 'numeric' }) as HTMLInputElement;
  const genre = h('input', { id: 'f-genre', class: 'field', maxlength: 60, list: 'genre-list', autocomplete: 'off' }) as HTMLInputElement;
  const platform = h('input', { id: 'f-platform', class: 'field', maxlength: 60, list: 'platform-list', autocomplete: 'off' }) as HTMLInputElement;
  const status = h('select', { id: 'f-status', class: 'field' }, ...STATUSES.map((s) => h('option', { value: s }, STATUS_LABEL[s]))) as HTMLSelectElement;
  title.value = g?.title ?? '';
  dev.value = g?.developer ?? '';
  year.value = g?.year ? String(g.year) : '';
  genre.value = g?.genre ?? '';
  platform.value = g?.platform ?? '';
  status.value = g?.status ?? 'backlog';

  const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Cartridge colour' });
  const drawSwatches = () =>
    swatches.replaceChildren(
      ...SHELLS.map((c, i) =>
        h('button', {
          type: 'button',
          role: 'radio',
          class: 'swatch',
          style: `--shell:${c}`,
          'aria-checked': String(c === shell),
          'aria-label': `Colour ${i + 1}`,
          onclick: (e: Event) => {
            shell = c;
            drawSwatches();
            (swatches.children[i] as HTMLElement).focus();
            e.preventDefault();
          },
        }),
      ),
    );
  drawSwatches();

  const form = h(
    'form',
    { method: 'dialog', class: 'form', novalidate: true },
    h('h2', { id: 'form-title' }, editing ? 'Edit cartridge' : 'Add a cartridge'),
    field('f-title', 'Title', title),
    h('div', { class: 'f-row' }, field('f-dev', 'Studio', dev), field('f-year', 'Release year', year)),
    h('div', { class: 'f-row' }, field('f-genre', 'Genre', genre), field('f-platform', 'Platform', platform)),
    field('f-status', 'Shelf', status),
    h('div', { class: 'f' }, h('span', { class: 'flabel' }, 'Cartridge colour'), swatches),
    h('datalist', { id: 'genre-list' }, ...genres(games).map((x) => h('option', { value: x }))),
    h('datalist', { id: 'platform-list' }, ...[...new Set(games.map((x) => x.platform).filter(Boolean))].map((x) => h('option', { value: x }))),
    err,
    h(
      'div',
      { class: 'form-actions' },
      h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => dialog.close() }, 'Cancel'),
      h('button', { class: 'btn btn-primary', type: 'submit' }, editing ? 'Save changes' : 'Put it on the shelf'),
    ),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t) {
      err.textContent = 'Give the game a title so BMO can read the label.';
      err.hidden = false;
      title.setAttribute('aria-invalid', 'true');
      title.focus();
      return;
    }
    const y = year.value ? Number(year.value) : null;
    if (y !== null && (!Number.isInteger(y) || y < 1950 || y > 2100)) {
      err.textContent = 'Release year should be a whole year between 1950 and 2100, or left empty.';
      err.hidden = false;
      year.setAttribute('aria-invalid', 'true');
      year.focus();
      return;
    }
    const data = {
      title: t.slice(0, 80),
      developer: dev.value.trim().slice(0, 60),
      year: y,
      genre: genre.value.trim().slice(0, 60) || 'Unsorted',
      platform: platform.value.trim().slice(0, 60),
      status: status.value as Status,
      shell,
    };
    if (g) {
      update(g.id, data);
      toast(`Saved ${data.title}.`);
    } else {
      const fresh: Game = { id: uid(), rating: 0, hours: null, notes: '', addedAt: Date.now(), ...data };
      games = [fresh, ...games];
      persist();
      selectedId = fresh.id;
      toast(`${data.title} is on the shelf.`);
    }
    dialog.close();
    renderShelf();
    renderScreen(!g);
  });

  dialog.replaceChildren(form);
  dialog.showModal();
  title.focus();
}

let undo: { game: Game; index: number } | null = null;
function removeGame(g: Game): void {
  const index = games.findIndex((x) => x.id === g.id);
  undo = { game: g, index };
  games = games.filter((x) => x.id !== g.id);
  persist();
  select(null);
  showUndo(`${g.title} came off the shelf.`);
}

function showUndo(msg: string): void {
  announce(`${msg} Undo is in the message at the bottom of the page.`);
  toastEl.replaceChildren(
    h('span', {}, msg),
    h('button', {
      type: 'button',
      class: 'toast-btn',
      onclick: () => {
        if (!undo) return;
        games.splice(Math.max(0, undo.index), 0, undo.game);
        persist();
        const id = undo.game.id;
        undo = null;
        toastEl.classList.remove('is-on');
        select(id);
      },
    }, 'Undo'),
  );
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 6000);
}

/* ------------------------------------------------------------ import/export */

function exportFile(): void {
  const blob = new Blob([JSON.stringify({ version: 1, games }, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'bmo-game-shelf.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${plural(games.length, 'game')}.`);
}

async function importFile(): Promise<void> {
  const file = fileInput.files?.[0];
  fileInput.value = '';
  if (!file) return;
  if (file.size > 2_000_000) {
    toast('That file is over 2 MB. BMO only reads shelf exports.');
    return;
  }
  try {
    const list = sanitizeShelf(JSON.parse(await file.text()));
    if (!list.length) {
      toast('No games found in that file. Use a file made with Export.');
      return;
    }
    const known = new Set(games.map((g) => g.id));
    const added = list.filter((g) => !known.has(g.id));
    games = [...added, ...games];
    persist();
    renderShelf();
    toast(`Imported ${plural(added.length, 'game')}${list.length - added.length ? `, skipped ${list.length - added.length} already on the shelf` : ''}.`);
  } catch {
    toast('That file is not valid JSON. Use a file made with Export.');
  }
}

function resetShelf(): void {
  if (!window.confirm('Replace your shelf with the sample shelf? Export first if you want to keep it.')) return;
  games = sampleShelf();
  persist();
  clearFilters();
  select(null);
  toast('Sample shelf restored.');
}

/* ------------------------------------------------------------------- keys */

document.addEventListener('keydown', (e) => {
  if (dialog.open) return;
  const t = e.target as HTMLElement;
  const typing = t.matches('input, textarea, select, [contenteditable]');
  if (e.key === '/' && !typing) {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'Escape' && t === searchInput && searchInput.value) {
    searchInput.value = '';
    query.text = '';
    renderShelf();
  }
});

renderShelf();
renderScreen();
