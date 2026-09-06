/**
 * Formulario de jugadores + tirada + resultados, para UN modo.
 * Cada vista lo monta con el suyo; los nombres se guardan por modo, así
 * Role Queue y Open no se pisan la lista.
 */
import { ROLE_LABELS, draw, getMode } from '@ow-gacha/gacha';
import heroes from './heroes.json';

const TICK_MS = 70; // velocidad del giro
const FIRST_LAND_MS = 800; // cuánto gira antes de parar la primera carta
const STAGGER_MS = 280; // separación entre cartas al revelarse

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const portrait = (key) => `${import.meta.env.BASE_URL}heroes/${key}.webp`;

// localStorage puede lanzar (modo privado, cookies bloqueadas): nunca debe tumbar la app.
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin persistencia, la app sigue funcionando */
  }
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * @param {HTMLElement} container
 * @param {string} modeKey
 * @returns {() => void} desmonta y limpia timers y listeners
 */
export function mountTeamPicker(container, modeKey) {
  const mode = getMode(modeKey);
  const NAMES_KEY = `ow-gacha:names:${mode.key}`;

  /* ---------- DOM ---------- */

  const hint = el('p', 'hint', mode.rules);
  const form = el('form', 'players');
  const spinBtn = el('button', 'spin', 'GACHA');
  spinBtn.type = 'button';
  const errorBox = el('p', 'error');
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;
  const results = el('ul', 'results');
  results.setAttribute('aria-live', 'polite');

  const saved = load(NAMES_KEY, []);
  for (let i = 0; i < mode.maxPlayers; i++) {
    const label = el('label');
    const input = el('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = saved[i] ?? '';
    input.placeholder = `Jugador ${i + 1}`;
    input.setAttribute('aria-label', `Jugador ${i + 1}`);
    label.append(el('span', null, String(i + 1)), input);
    form.append(label);
  }

  container.replaceChildren(hint, form, spinBtn, errorBox, results);

  /* ---------- estado ---------- */

  let spinning = false;
  let ticker = null;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const readNames = () => [...form.querySelectorAll('input')].map((i) => i.value);

  const showError = (msg) => {
    errorBox.textContent = msg ?? '';
    errorBox.hidden = !msg;
  };

  function makeCard(player) {
    const li = el('li', 'card spinning');
    li.innerHTML =
      '<img alt="" src=""><div class="who"></div><div class="hero">???</div>' +
      '<div class="role-row"><span class="role">···</span></div>';
    li.querySelector('.who').textContent = player;
    return li;
  }

  function land(card, pick) {
    card.classList.remove('spinning');
    card.classList.add('landed');
    card.dataset.role = pick.role;
    const img = card.querySelector('img');
    img.src = portrait(pick.hero.key);
    img.alt = pick.hero.name;
    card.querySelector('.hero').textContent = pick.hero.name;
    card.querySelector('.role').textContent = ROLE_LABELS[pick.role];
  }

  function spin() {
    if (spinning) return;

    let picks;
    try {
      picks = draw(readNames(), mode.key, heroes);
    } catch (e) {
      showError(e.message);
      return;
    }
    showError(null);
    save(NAMES_KEY, readNames());

    spinning = true;
    spinBtn.disabled = true;

    const cards = picks.map((p) => makeCard(p.player));
    results.replaceChildren(...cards);

    const done = () => {
      spinning = false;
      spinBtn.disabled = false;
    };

    if (reducedMotion) {
      cards.forEach((card, i) => land(card, picks[i]));
      done();
      return;
    }

    ticker = setInterval(() => {
      for (const card of cards) {
        if (!card.classList.contains('spinning')) continue;
        card.querySelector('img').src = portrait(heroes[(Math.random() * heroes.length) | 0].key);
      }
    }, TICK_MS);

    cards.forEach((card, i) => later(() => land(card, picks[i]), FIRST_LAND_MS + i * STAGGER_MS));
    later(() => {
      clearInterval(ticker);
      ticker = null;
      done();
    }, FIRST_LAND_MS + cards.length * STAGGER_MS);
  }

  /* ---------- listeners ---------- */

  const onInput = () => save(NAMES_KEY, readNames());
  const onSubmit = (e) => e.preventDefault();
  const onKey = (e) => {
    if (e.key === 'Enter' && !spinning) spin();
  };

  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  spinBtn.addEventListener('click', spin);
  addEventListener('keydown', onKey);

  // Sin esto, cambiar de modo a mitad de giro deja el intervalo corriendo.
  return () => {
    removeEventListener('keydown', onKey);
    if (ticker) clearInterval(ticker);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    container.replaceChildren();
  };
}
