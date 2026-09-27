import { AudioManager } from '../../audio/AudioManager';
import { settings, type Settings } from '../../settings';
import { h, mount, trapFocus } from './dom';

export function applyBodySettings(s: Settings = settings.get()): void {
  document.body.dataset.reducedMotion = String(s.reducedMotion);
}

/** Opens the settings dialog. Extra buttons (e.g. "Quit to menu") can be appended. */
export function openSettings(extra: { label: string; onClick: () => void }[] = [], onClose?: () => void): void {
  const s = settings.get();
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const volume = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s.volume * 100), id: 'set-volume' });
  volume.addEventListener('input', () => settings.update({ volume: Number(volume.value) / 100 }));
  volume.addEventListener('change', () => AudioManager.play('uiClick'));

  const muted = h('input', { type: 'checkbox', id: 'set-muted', checked: s.muted });
  muted.addEventListener('change', () => settings.update({ muted: muted.checked }));

  const motion = h('input', { type: 'checkbox', id: 'set-motion', checked: s.reducedMotion });
  motion.addEventListener('change', () => {
    settings.update({ reducedMotion: motion.checked });
    applyBodySettings();
  });

  const speed = h(
    'select',
    { id: 'set-ai-speed' },
    ...(['relaxed', 'normal', 'fast'] as const).map((v) => h('option', { value: v, selected: s.aiSpeed === v }, v[0].toUpperCase() + v.slice(1))),
  );
  speed.addEventListener('change', () => settings.update({ aiSpeed: speed.value as Settings['aiSpeed'] }));

  let dispose = () => {};
  const close = () => {
    dispose();
    previouslyFocused?.focus?.();
    onClose?.();
  };

  const closeBtn = h('button', { class: 'btn btn--mint', type: 'button', onclick: () => close() }, 'Done');
  const dialog = h(
    'div',
    { class: 'modal panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
    h('h2', { id: 'settings-title' }, 'Settings'),
    h('label', { class: 'setting-row', for: 'set-volume' }, 'Sound volume', volume),
    h('label', { class: 'setting-row', for: 'set-muted' }, 'Mute all sound', muted),
    h('label', { class: 'setting-row', for: 'set-motion' }, 'Reduce motion', motion),
    h('label', { class: 'setting-row', for: 'set-ai-speed' }, 'Opponent speed', speed),
    h(
      'div',
      { class: 'screen-footer' },
      ...extra.map((b) => h('button', { class: 'btn btn--paper', type: 'button', onclick: () => { dispose(); b.onClick(); } }, b.label)),
      closeBtn,
    ),
  );
  const backdrop = h('div', { class: 'modal-backdrop', onclick: (e: Event) => { if (e.target === backdrop) close(); } }, dialog);
  const unmount = mount(backdrop);
  const untrap = trapFocus(dialog, close);
  dispose = () => {
    untrap();
    unmount();
  };
  volume.focus();
}
