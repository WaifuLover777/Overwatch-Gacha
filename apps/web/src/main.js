/**
 * Router por hash. Cada modo es una vista con su propia URL, así el Browser
 * Source de OBS puede apuntar directo a un modo (…/#/open) y el botón atrás
 * del navegador funciona.
 */
import heroes from './heroes.json';
import { portrait } from './team-picker.js';
import openView from './views/open.js';
import roleQueueView from './views/role-queue.js';

const VIEWS = [roleQueueView, openView];

const nav = document.getElementById('nav');
const outlet = document.getElementById('view');

let unmount = null;

function renderNav(active) {
  nav.replaceChildren(
    ...VIEWS.map((view) => {
      const a = document.createElement('a');
      a.className = 'mode';
      a.href = view.route;
      a.append(document.createTextNode(view.label));
      const small = document.createElement('small');
      small.textContent = view.summary;
      a.append(small);
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

// Precarga en segundo plano: sin esto el primer giro parpadea mientras el
// navegador va pidiendo cada retrato.
for (const h of heroes) new Image().src = portrait(h.key);
