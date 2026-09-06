/**
 * Player list + draw + results, for ONE mode.
 * Each view mounts it with its own mode; players are stored per mode so
 * Role Queue and Open Queue never clobber each other's list.
 */
import { ROLE_LABELS, ROLES, draw, getMode } from '@ow-gacha/gacha';
import heroes from './heroes.json';

const TICK_MS = 70; // spin speed
const FIRST_LAND_MS = 800; // how long it spins before the first card lands
const STAGGER_MS = 280; // gap between card reveals

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const portrait = (key) => `${import.meta.env.BASE_URL}heroes/${key}.webp`;

/** Stroke-only role glyphs, so they inherit currentColor and need no assets. */
const ROLE_ICON = {
  tank: '<path d="M12 3.2 19 5.6v5.6c0 4.2-2.9 7.6-7 8.9-4.1-1.3-7-4.7-7-8.9V5.6l7-2.4Z"/>',
  damage: '<circle cx="12" cy="12" r="6.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  support: '<path d="M12 5v14M5 12h14"/>',
};

// localStorage can throw (private mode, blocked cookies): it must never take the app down.
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
    /* without persistence the app still works */
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
 * @returns {() => void} unmount: clears timers and listeners
 */
export function mountTeamPicker(container, modeKey) {
  const mode = getMode(modeKey);
  const STORE_KEY = `ow-gacha:players:${mode.key}`;

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

  const saved = load(STORE_KEY, []);

  for (let i = 0; i < mode.maxPlayers; i++) {
    const row = el('div', 'player');

    const input = el('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = saved[i]?.name ?? '';
    input.placeholder = `Player ${i + 1}`;
    input.setAttribute('aria-label', `Player ${i + 1} name`);

    const picker = el('div', 'roles');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', `Player ${i + 1} role`);

    for (const role of ROLES) {
      const btn = el('button', 'role-pick');
      btn.type = 'button';
      btn.dataset.role = role;
      btn.title = `${ROLE_LABELS[role]} — click again for random`;
      btn.setAttribute('aria-label', ROLE_LABELS[role]);
      btn.setAttribute('aria-pressed', String(saved[i]?.role === role));
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        ROLE_ICON[role] +
        '</svg>';
      // Clicking the active role clears it, which puts the player back on random.
      btn.addEventListener('click', () => {
        const wasOn = btn.getAttribute('aria-pressed') === 'true';
        for (const other of picker.children) other.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-pressed', String(!wasOn));
        refreshRoleLimits();
        persist();
      });
      picker.append(btn);
    }

    row.append(el('span', 'num', String(i + 1)), input, picker);
    form.append(row);
  }

  container.replaceChildren(hint, form, spinBtn, errorBox, results);

  /* ---------- state ---------- */

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

  /** One entry per row: the typed name plus the locked role, if any. */
  const readPlayers = () =>
    [...form.querySelectorAll('.player')].map((row) => ({
      name: row.querySelector('input').value,
      role: row.querySelector('.role-pick[aria-pressed="true"]')?.dataset.role ?? null,
    }));

  const persist = () => save(STORE_KEY, readPlayers());

  /**
   * Grey out the role buttons that would break the mode's caps, so an illegal
   * comp cannot be built in the first place. Reads mode.caps rather than knowing
   * the rules itself, so a new mode needs no change here.
   *
   * A pressed button always stays clickable — otherwise a lock could not be undone.
   * Every row counts, named or not: a lock you can see is a slot that is taken.
   */
  function refreshRoleLimits() {
    const used = { tank: 0, damage: 0, support: 0 };
    for (const row of form.querySelectorAll('.player')) {
      const role = row.querySelector('.role-pick[aria-pressed="true"]')?.dataset.role;
      if (role) used[role]++;
    }
    for (const btn of form.querySelectorAll('.role-pick')) {
      const role = btn.dataset.role;
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.disabled = !pressed && used[role] >= mode.caps[role];
      btn.title = btn.disabled
        ? `${mode.label} allows at most ${mode.caps[role]} ${ROLE_LABELS[role]}`
        : `${ROLE_LABELS[role]} — click again for random`;
    }
  }

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
    const badge = card.querySelector('.role');
    badge.textContent = ROLE_LABELS[pick.role];
    // A locked role was chosen, not rolled: mark it so the result stays honest.
    badge.classList.toggle('is-locked', pick.locked);
    if (pick.locked) badge.title = 'Role locked by the player';
  }

  function spin() {
    if (spinning) return;

    let picks;
    try {
      picks = draw(readPlayers(), mode.key, heroes);
    } catch (e) {
      showError(e.message);
      return;
    }
    showError(null);
    persist();

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

  const onInput = () => persist();
  const onSubmit = (e) => e.preventDefault();
  const onKey = (e) => {
    if (e.key === 'Enter' && !spinning) spin();
  };

  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  spinBtn.addEventListener('click', spin);
  addEventListener('keydown', onKey);

  // Restored locks can already sit at a cap, so apply the limits before first paint.
  refreshRoleLimits();

  // Without this, switching modes mid-spin leaves the interval running.
  return () => {
    removeEventListener('keydown', onKey);
    if (ticker) clearInterval(ticker);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    container.replaceChildren();
  };
}
