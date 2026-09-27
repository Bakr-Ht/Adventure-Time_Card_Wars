/** Tiny DOM builder for the HTML overlay UI (menus, rail, modals). No framework needed. */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

export function uiRoot(): HTMLElement {
  return document.getElementById('ui-root')!;
}

/** Mounts an element into the overlay and returns a disposer. */
export function mount(el: HTMLElement): () => void {
  uiRoot().append(el);
  return () => el.remove();
}

let toastZone: HTMLElement | null = null;

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  if (!toastZone || !toastZone.isConnected) {
    toastZone = h('div', { class: 'toast-zone', role: 'status', 'aria-live': 'assertive' });
    uiRoot().append(toastZone);
  }
  const el = h('div', { class: 'toast', 'data-kind': kind }, message);
  toastZone.append(el);
  while (toastZone.children.length > 3) toastZone.firstElementChild?.remove();
  window.setTimeout(() => el.remove(), 2300);
}

/** Pushes a line to the polite screen-reader live region. */
export function announce(text: string): void {
  const live = document.getElementById('sr-live');
  if (!live) return;
  live.append(h('p', {}, text));
  while (live.children.length > 12) live.firstElementChild?.remove();
}

/** Keeps keyboard focus inside a modal while it is open. */
export function trapFocus(container: HTMLElement, onEscape: () => void): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [...container.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]')].filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}
