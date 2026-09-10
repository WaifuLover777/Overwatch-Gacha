/**
 * Hash router and global setup for Overwatch Gacha.
 */
import heroes from './heroes.json';
import { portrait } from './team-picker.js';
import openView from './views/open.js';
import roleQueueView from './views/role-queue.js';
import { isSoundEnabled, setSoundEnabled, playClick } from './audio.js';

const VIEWS = [roleQueueView, openView];

const nav = document.getElementById('nav');
const outlet = document.getElementById('view');
const soundBtn = document.getElementById('sound-toggle');

let unmount = null;

const SPEAKER_ON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
const SPEAKER_OFF =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';

function updateSoundButton() {
  if (!soundBtn) return;
  const enabled = isSoundEnabled();
  soundBtn.innerHTML = `${enabled ? SPEAKER_ON : SPEAKER_OFF} <span>AUDIO: ${enabled ? 'ON' : 'MUTED'}</span>`;
  soundBtn.setAttribute('aria-label', enabled ? 'Sound effects enabled. Click to mute' : 'Sound effects muted. Click to enable');
  soundBtn.classList.toggle('is-muted', !enabled);
}

if (soundBtn) {
  updateSoundButton();
  soundBtn.addEventListener('click', () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    updateSoundButton();
    if (next) playClick();
  });
}

function renderNav(active) {
  nav.replaceChildren(
    ...VIEWS.map((view) => {
      const a = document.createElement('a');
      a.className = 'mode';
      a.href = view.route;

      const isRoleQueue = view.route.includes('role-queue');
      const badgeText = isRoleQueue ? '5v5 COMP' : '6v6 CLASSIC';

      a.innerHTML = `
        <div class="mode-header">
          <span class="mode-title">${view.label}</span>
          <span class="mode-badge">${badgeText}</span>
        </div>
        <small class="mode-summary">${view.summary}</small>
      `;

      a.addEventListener('click', () => playClick());
      if (view === active) a.setAttribute('aria-current', 'page');
      return a;
    }),
  );
}

function render() {
  const view = VIEWS.find((v) => v.route === location.hash) ?? VIEWS[0];
  renderNav(view);
  unmount?.();
  unmount = view.mount(outlet);
  document.title = `${view.label} · Overwatch Gacha`;
}

addEventListener('hashchange', render);
render();

// Background preload: without it the first spin flickers while the browser
// fetches each portrait on demand.
for (const h of heroes) new Image().src = portrait(h.key);
