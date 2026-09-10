/**
 * Player list + draw + results, for ONE mode.
 * Each view mounts it with its own mode; players are stored per mode so
 * Role Queue and Open Queue never clobber each other's list.
 */
import { ROLE_LABELS, ROLES, draw, getMode } from '@ow-gacha/gacha';
import heroes from './heroes.json';
import { playClick, playFanfare, playLand, playTick } from './audio.js';

const TICK_MS = 65; // spin speed
const FIRST_LAND_MS = 850; // how long it spins before the first card lands
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

const LOCK_ICON =
  '<rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>' +
  '<path d="M8 11V7a4 4 0 0 1 8 0v4"/>';

const COPY_ICON =
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';

const TRASH_ICON =
  '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';

const USERS_ICON =
  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
  '<circle cx="9" cy="7" r="4"/>' +
  '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>';

const RESET_ICON =
  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
  '<path d="M3 3v5h5"/>';

const INFO_ICON =
  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';

const svg = (body, size = 24) =>
  `<svg viewBox="0 0 ${size} ${size}" fill="none" stroke="currentColor" stroke-width="2" ` +
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

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.hidden = true;
    }, 280);
  }, 2400);
}

const SAMPLE_NAMES = ['Tracer', 'Reinhardt', 'Genji', 'Mercy', 'Kiriko', 'D.Va'];

/**
 * @param {HTMLElement} container
 * @param {string} modeKey
 * @returns {() => void} unmount: clears timers and listeners
 */
export function mountTeamPicker(container, modeKey) {
  const mode = getMode(modeKey);
  const STORE_KEY = `ow-gacha:players:${mode.key}`;

  /* ---------- DOM Construction ---------- */

  // Hint Intel Card
  const hint = el('div', 'hint-card');
  hint.innerHTML = `
    <div class="hint-icon">${svg(INFO_ICON)}</div>
    <div class="hint-content">
      <span class="hint-label">${mode.label.toUpperCase()} PROTOCOL</span>
      <p class="hint-text">${mode.rules}</p>
    </div>
  `;

  // Quick Action Toolbar
  const toolbar = el('div', 'roster-toolbar');

  const sampleBtn = el('button', 'tool-btn', ' Sample Squad');
  sampleBtn.type = 'button';
  sampleBtn.innerHTML = `${svg(USERS_ICON, 18)} <span>Sample Squad</span>`;
  sampleBtn.title = 'Fill empty slots with sample hero names';

  const clearBtn = el('button', 'tool-btn', ' Clear Names');
  clearBtn.type = 'button';
  clearBtn.innerHTML = `${svg(TRASH_ICON, 18)} <span>Clear Names</span>`;
  clearBtn.title = 'Clear all player names';

  const resetBtn = el('button', 'tool-btn', ' Reset Roles');
  resetBtn.type = 'button';
  resetBtn.innerHTML = `${svg(RESET_ICON, 18)} <span>Reset Roles</span>`;
  resetBtn.title = 'Reset all players to Any Role';

  toolbar.append(sampleBtn, clearBtn, resetBtn);

  // Form with Player Roster
  const form = el('form', 'players');
  const saved = load(STORE_KEY, []);

  for (let i = 0; i < mode.maxPlayers; i++) {
    const row = el('div', 'player');
    const chosen = savedRoles(saved[i]);

    const numBadge = el('div', 'player-index');
    numBadge.innerHTML = `<span class="index-hash">#</span><span class="index-val">${String(i + 1).padStart(2, '0')}</span>`;

    const inputWrap = el('div', 'input-wrap');
    const input = el('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = saved[i]?.name ?? '';
    input.placeholder = `Player ${i + 1}`;
    input.setAttribute('aria-label', `Player ${i + 1} name`);
    inputWrap.append(input);

    const picker = el('div', 'roles');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', `Player ${i + 1} roles`);

    // Any role: clears the row.
    const anyBtn = el('button', 'role-pick is-any');
    anyBtn.type = 'button';
    anyBtn.dataset.any = '';
    anyBtn.setAttribute('aria-label', 'Any role');
    anyBtn.setAttribute('aria-pressed', String(chosen.length === 0));
    anyBtn.innerHTML = svg(RANDOM_ICON);
    anyBtn.addEventListener('click', () => {
      playClick();
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

      btn.addEventListener('click', () => {
        playClick();
        const on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
        refreshRoleLimits();
        persist();
      });
      picker.append(btn);
    }

    row.append(numBadge, inputWrap, picker);
    form.append(row);
  }

  // Spin Trigger Section
  const spinWrap = el('div', 'spin-section');
  const spinBtn = el('button', 'spin');
  spinBtn.type = 'button';
  spinBtn.innerHTML = `
    <span class="spin-sheen"></span>
    <span class="spin-content">
      <span class="spin-glitch">GACHA</span>
      <span class="spin-keyhint">[ENTER]</span>
    </span>
  `;

  const errorBox = el('p', 'error');
  errorBox.setAttribute('role', 'alert');
  errorBox.hidden = true;

  spinWrap.append(spinBtn, errorBox);

  // Results Section
  const resultsSection = el('div', 'results-section');
  resultsSection.hidden = true;

  const resultsHeader = el('div', 'results-header');
  const compBreakdown = el('div', 'comp-breakdown');
  const copySquadBtn = el('button', 'copy-squad-btn');
  copySquadBtn.type = 'button';
  copySquadBtn.innerHTML = `${svg(COPY_ICON, 18)} <span>Copy Team to Clipboard</span>`;

  resultsHeader.append(compBreakdown, copySquadBtn);

  const results = el('ul', 'results');
  results.setAttribute('aria-live', 'polite');

  resultsSection.append(resultsHeader, results);

  container.replaceChildren(hint, toolbar, form, spinWrap, resultsSection);

  /* ---------- State & Logic ---------- */

  let spinning = false;
  let ticker = null;
  let lastPicks = null;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const rows = () => [...form.querySelectorAll('.player')];

  const rowRoles = (row) =>
    [...row.querySelectorAll('.role-pick[data-role][aria-pressed="true"]')].map((b) => b.dataset.role);

  const readPlayers = () =>
    rows().map((row) => ({ name: row.querySelector('input').value, roles: rowRoles(row) }));

  const persist = () => save(STORE_KEY, readPlayers());

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

  function updateCompBreakdown(picks) {
    const counts = { tank: 0, damage: 0, support: 0 };
    for (const p of picks) counts[p.role]++;

    compBreakdown.innerHTML = `
      <div class="comp-badge is-tank">${svg(ROLE_ICON.tank, 16)} <span>${counts.tank} TANK</span></div>
      <div class="comp-badge is-damage">${svg(ROLE_ICON.damage, 16)} <span>${counts.damage} DAMAGE</span></div>
      <div class="comp-badge is-support">${svg(ROLE_ICON.support, 16)} <span>${counts.support} SUPPORT</span></div>
    `;
  }

  function makeCard(player, index) {
    const li = el('li', 'card spinning');
    li.innerHTML = `
      <div class="card-glow" aria-hidden="true"></div>
      <div class="card-scanline" aria-hidden="true"></div>
      <div class="card-top">
        <span class="card-slot">#${String(index + 1).padStart(2, '0')}</span>
        <span class="who">${player || `Player ${index + 1}`}</span>
      </div>
      <div class="card-portrait-wrap">
        <img alt="" src="" />
        <div class="card-brackets" aria-hidden="true">
          <span class="b-tl"></span><span class="b-tr"></span>
          <span class="b-bl"></span><span class="b-br"></span>
        </div>
        <div class="card-analyzing">
          <span class="analyzing-text">ANALYZING</span>
        </div>
      </div>
      <div class="card-meta">
        <div class="hero">···</div>
        <div class="role-row">
          <span class="role">
            <span class="role-icon"></span>
            <span class="role-text">···</span>
          </span>
        </div>
      </div>
    `;
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
    const iconSpan = badge.querySelector('.role-icon');
    const textSpan = badge.querySelector('.role-text');

    iconSpan.innerHTML = svg(ROLE_ICON[pick.role], 16);
    textSpan.textContent = ROLE_LABELS[pick.role];

    badge.classList.toggle('is-locked', pick.locked);
    if (pick.locked) {
      badge.title = 'The player asked for this role';
      badge.innerHTML = `${svg(LOCK_ICON, 14)} <span class="role-text">${ROLE_LABELS[pick.role]}</span> <span class="lock-tag">LOCKED</span>`;
    }

    playLand(pick.role);
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
    lastPicks = picks;

    spinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('is-active');

    resultsSection.hidden = false;
    copySquadBtn.style.visibility = 'hidden';
    compBreakdown.style.visibility = 'hidden';

    const cards = picks.map((p, i) => makeCard(p.player, i));
    results.replaceChildren(...cards);

    // Scroll results into view smoothly on mobile if needed
    if (resultsSection.getBoundingClientRect().bottom > window.innerHeight) {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const done = () => {
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.classList.remove('is-active');
      copySquadBtn.style.visibility = 'visible';
      compBreakdown.style.visibility = 'visible';
      updateCompBreakdown(picks);
      playFanfare();
    };

    if (reducedMotion) {
      cards.forEach((card, i) => land(card, picks[i]));
      done();
      return;
    }

    ticker = setInterval(() => {
      playTick();
      for (const card of cards) {
        if (!card.classList.contains('spinning')) continue;
        const randomHero = heroes[(Math.random() * heroes.length) | 0];
        card.querySelector('img').src = portrait(randomHero.key);
      }
    }, TICK_MS);

    cards.forEach((card, i) => later(() => land(card, picks[i]), FIRST_LAND_MS + i * STAGGER_MS));

    later(() => {
      clearInterval(ticker);
      ticker = null;
      done();
    }, FIRST_LAND_MS + cards.length * STAGGER_MS);
  }

  /* ---------- Toolbar Actions ---------- */

  sampleBtn.addEventListener('click', () => {
    playClick();
    const inputs = form.querySelectorAll('input');
    inputs.forEach((input, i) => {
      if (!input.value.trim()) {
        input.value = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
      }
    });
    persist();
    showToast('Sample squad loaded');
  });

  clearBtn.addEventListener('click', () => {
    playClick();
    form.querySelectorAll('input').forEach((input) => (input.value = ''));
    persist();
    showToast('Player names cleared');
  });

  resetBtn.addEventListener('click', () => {
    playClick();
    form.querySelectorAll('.player').forEach((row) => {
      for (const b of row.querySelectorAll('[data-role]')) b.setAttribute('aria-pressed', 'false');
    });
    refreshRoleLimits();
    persist();
    showToast('All roles reset to Any');
  });

  copySquadBtn.addEventListener('click', () => {
    playClick();
    if (!lastPicks || lastPicks.length === 0) return;

    const lines = [
      `OVERWATCH GACHA — ${mode.label.toUpperCase()}`,
      `----------------------------------------`,
      ...lastPicks.map((p, i) => {
        const pName = p.player || `Player ${i + 1}`;
        const lockNote = p.locked ? ' [LOCKED]' : '';
        return `[${ROLE_LABELS[p.role].toUpperCase()}] ${p.hero.name} — ${pName}${lockNote}`;
      }),
      `----------------------------------------`,
    ];

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => showToast('Team copied to clipboard!'))
      .catch(() => showToast('Failed to copy team'));
  });

  /* ---------- Event Listeners ---------- */

  const onInput = () => persist();
  const onSubmit = (e) => e.preventDefault();
  const onKey = (e) => {
    if (e.key === 'Enter' && !spinning) spin();
  };

  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  spinBtn.addEventListener('click', () => {
    playClick();
    spin();
  });
  addEventListener('keydown', onKey);

  // Initial limits calculation
  refreshRoleLimits();

  return () => {
    removeEventListener('keydown', onKey);
    if (ticker) clearInterval(ticker);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    container.replaceChildren();
  };
}
