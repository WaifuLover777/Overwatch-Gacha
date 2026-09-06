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

/** Stroke-only glyphs, so they inherit currentColor and need no assets. */
const ROLE_ICON = {
  tank: '<path d="M12 3.2 19 5.6v5.6c0 4.2-2.9 7.6-7 8.9-4.1-1.3-7-4.7-7-8.9V5.6l7-2.4Z"/>',
  damage: '<circle cx="12" cy="12" r="6.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  support: '<path d="M12 5v14M5 12h14"/>',
};

/** A die: "no preference, surprise me". */
const RANDOM_ICON =
  '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/>' +
  '<circle cx="8.6" cy="8.6" r="1.25" fill="currentColor" stroke="none"/>' +
  '<circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/>' +
  '<circle cx="15.4" cy="15.4" r="1.25" fill="currentColor" stroke="none"/>';

const svg = (body) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

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

/** Older saves held a single `role`; read them as a one-role list. */
const savedRoles = (entry) => {
  const list = Array.isArray(entry?.roles) ? entry.roles : entry?.role ? [entry.role] : [];
  return list.filter((r) => ROLES.includes(r));
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
    const chosen = savedRoles(saved[i]);

    const input = el('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = saved[i]?.name ?? '';
    input.placeholder = `Player ${i + 1}`;
    input.setAttribute('aria-label', `Player ${i + 1} name`);

    const picker = el('div', 'roles');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', `Player ${i + 1} roles`);

    // Any role: clears the row. Always available, which is what stops a set of
    // picks from ever painting the user into a corner.
    const anyBtn = el('button', 'role-pick is-any');
    anyBtn.type = 'button';
    anyBtn.dataset.any = '';
    anyBtn.setAttribute('aria-label', 'Any role');
    anyBtn.setAttribute('aria-pressed', String(chosen.length === 0));
    anyBtn.innerHTML = svg(RANDOM_ICON);
    anyBtn.addEventListener('click', () => {
      for (const b of picker.querySelectorAll('[data-role]')) b.setAttribute('aria-pressed', 'false');
      refreshRoleLimits();
      persist();
    });
    picker.append(anyBtn);

    for (const role of ROLES) {
      const btn = el('button', 'role-pick');
      btn.type = 'button';
      btn.dataset.role = role;
      btn.setAttribute('aria-label', ROLE_LABELS[role]);
      btn.setAttribute('aria-pressed', String(chosen.includes(role)));
      btn.innerHTML = svg(ROLE_ICON[role]);
      // Roles add up: a player can accept one, two or all three.
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
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

  const rows = () => [...form.querySelectorAll('.player')];

  /** The roles this row accepts. Empty means any, which is the random case. */
  const rowRoles = (row) =>
    [...row.querySelectorAll('.role-pick[data-role][aria-pressed="true"]')].map((b) => b.dataset.role);

  /** One entry per row: the typed name plus the roles that player accepts. */
  const readPlayers = () =>
    rows().map((row) => ({ name: row.querySelector('input').value, roles: rowRoles(row) }));

  const persist = () => save(STORE_KEY, readPlayers());

  /**
   * Disable the role toggles that would leave no legal team at all, asking the
   * mode instead of knowing its rules. A new mode needs no change here.
   *
   * Widening a set can never remove a solution, so "Any role" is never disabled
   * and always offers a way back out of a dead end.
   */
  function refreshRoleLimits() {
    const all = rows().map(rowRoles);

    rows().forEach((row, i) => {
      for (const btn of row.querySelectorAll('.role-pick[data-role]')) {
        const role = btn.dataset.role;
        const on = btn.getAttribute('aria-pressed') === 'true';
        const next = on ? all[i].filter((r) => r !== role) : [...all[i], role];
        const trial = all.map((set, j) => (j === i ? next : set));

        btn.disabled = !mode.canAssign(trial);
        btn.title = btn.disabled
          ? `No legal ${mode.label} team leaves ${ROLE_LABELS[role]} like that`
          : on
            ? `${ROLE_LABELS[role]} — click to stop accepting it`
            : `Also accept ${ROLE_LABELS[role]}`;
      }

      const anyBtn = row.querySelector('.role-pick[data-any]');
      const isAny = all[i].length === 0;
      anyBtn.setAttribute('aria-pressed', String(isAny));
      anyBtn.title = isAny ? 'Any role' : 'Clear: back to any role';
    });
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
    // Only a single accepted role is a real lock; with two the roulette chose.
    badge.classList.toggle('is-locked', pick.locked);
    if (pick.locked) badge.title = 'The player asked for this role';
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

  // Restored picks can already sit at a limit, so apply them before first paint.
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
