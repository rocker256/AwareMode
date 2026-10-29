'use strict';
/* Aware Mode: a personal, local-first planner built on the "Analog Attack Mode" course notes.
   All data lives in this browser's localStorage under LS_KEY. Export a backup from Settings. */

const LS_KEY = 'attackmode.data.v1';
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const fmt1 = v => v == null || isNaN(v) ? '–' : String(Math.round(v * 10) / 10);
const pct = v => v == null || isNaN(v) ? '–' : Math.round(v) + '%';
const num = v => v === '' || v == null || isNaN(Number(v)) ? null : Number(v);

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const weekday = k => parseKey(k).getDay();
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const niceDate = (k, opts = { weekday: 'long', day: 'numeric', month: 'short' }) => parseKey(k).toLocaleDateString(undefined, opts);
const rangeKeys = (endKey, n) => Array.from({ length: n }, (_, i) => addDays(endKey, i - n + 1));
function weekKey(k) { const ws = S.settings.weekStart; const d = parseKey(k); const diff = (d.getDay() - ws + 7) % 7; d.setDate(d.getDate() - diff); return keyOf(d); }

/* ---------- defaults ---------- */
const TABS = [
  { id: 'attack', label: 'Today', icon: '⚔' },
  { id: 'plan', label: 'Tomorrow', icon: '➜' },
  { id: 'focus', label: 'Focus', icon: '◷' },
  { id: 'woop', label: 'WOOP', icon: '◎' },
  { id: 'manual', label: 'Manual', icon: '▤' },
  { id: 'insights', label: 'Insights', icon: '↗' },
  { id: 'history', label: 'History', icon: '≡' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function defaultSettings() {
  return {
    appName: 'Aware Mode', myWhy: '', style: 'paperbox', simple: false, theme: 'auto', accent: '#e4572e', fontScale: 100, weekStart: 1,
    targetDifficulty: 7, hardTasksTarget: 2, maxTasks: 6, easyMax: 4, tolerance: 1, overloadStep: 20, lookback: 3,
    winThreshold: 60, planReminderHour: 18, showPrinciple: true, showFactorsOnToday: true, showJournalOnToday: true, showRulesOnToday: true,
    labels: { what: 'What exactly', howMuch: 'How much', when: 'When', where: 'Where' },
    placeholders: { what: 'Specific task, e.g. Read "Deep Work"', unit: 'pages', detail: 'Detail, e.g. chapter 3, take notes', where: 'Desk, library…' },
    graceDaysPerWeek: 1, restDays: [0], restSkipsRules: true,
    complianceTarget: 65, regressionDrop: 15,
    timer: {
      work: 30, brk: 10, longEvery: 0, longBrk: 20, autoStart: false, sound: true, notify: false, starterG0: 1, starterG1: 10,
      workMsg: "Phone face down. Don't touch it until the timer ends.", breakMsg: 'Break / scroll time. Back to work when it ends.',
    },
    factors: [
      { id: 'sleep', name: 'Sleep', type: 'number', unit: 'h', min: 0, max: 14 },
      { id: 'sleepq', name: 'Sleep quality', type: 'scale', min: 1, max: 5 },
      { id: 'diet', name: 'Diet quality', type: 'scale', min: 1, max: 5 },
      { id: 'activity', name: 'Physical activity', type: 'number', unit: 'min', min: 0, max: 600 },
      { id: 'meal', name: 'Heavy meal before work', type: 'yesno' },
      { id: 'exhaust', name: 'Physical exhaustion', type: 'scale', min: 1, max: 5 },
      { id: 'noise', name: 'Noise / distractions', type: 'scale', min: 1, max: 5 },
    ],
    journalPrompts: [
      'What did I actually accomplish vs. what I planned?',
      'What worked and what did not?',
      'Why was there a difference between the plan and the result?',
      'Obstacles I ran into',
      'What should I change tomorrow?',
    ],
    reframePrompts: [
      'Visualize the goal: picture yourself having already reached it. What does that day look like?',
      'What are the real-life implications of what I am working on right now?',
      'How could I actually use this in my life in the next month?',
      'Picture yourself working in this field and leading in it. What would that person do in the next 10 minutes?',
      'Who or what am I doing this for? Attach it to your personal story.',
      'Mind wandering is not tiredness. Notice it, name it, return to the next small step.',
    ],
    principles: [
      'Replace vague intentions with precise actions: what, how much, when, where.',
      'Plan tomorrow before today ends.',
      'Keep the actual difficulty around 7/10. When it drops to 5/10, add load.',
      'Start with an achievable target, measure, then increase progressively.',
      'Can\'t start? Do the 1-minute version. Then ask: am I willing to continue?',
      'Treat yourself as a company. Write the policy, expect violations, keep compliance above target.',
      'Your brain drifts back to baseline. Enforce the rules consciously.',
      'A missed day is data, not a verdict. Check sleep, food, activity and noise before blaming discipline.',
      'Build a flexible system: grace days and rest days keep it alive.',
    ],
    showSplash: true,
    loadingLines: ['Win the day before it starts.', 'Clarity creates execution.', 'Plan harder. Execute calmer.', 'Discipline creates freedom.', 'One block at a time.', 'Seven out of ten. Every day.'],
    tabs: TABS.map(t => ({ id: t.id, label: t.label, visible: true })),
  };
}

function fresh() {
  return { v: 1, settings: defaultSettings(), days: {}, rules: [], woops: [], sessions: [], ui: { view: 'attack', open: {}, range: 14, pb: 1 }, created: todayKey() };
}

function migrate(s) {
  const d = defaultSettings();
  s.settings = Object.assign({}, d, s.settings || {});
  if (s.settings.appName === 'Attack Mode') s.settings.appName = 'Aware Mode'; // renamed in v1.0.6
  for (const k of ['labels', 'placeholders', 'timer']) s.settings[k] = Object.assign({}, d[k], s.settings[k] || {});
  const tabs = s.settings.tabs || [];
  s.settings.tabs = tabs.filter(t => TABS.some(x => x.id === t.id));
  TABS.filter(t => !s.settings.tabs.some(x => x.id === t.id)).forEach(t => {
    const i = s.settings.tabs.findIndex(x => x.id === 'settings');
    s.settings.tabs.splice(i < 0 ? s.settings.tabs.length : i, 0, { id: t.id, label: t.label, visible: true });
  });
  s.days = s.days || {}; s.rules = s.rules || []; s.woops = s.woops || []; s.sessions = s.sessions || [];
  s.ui = Object.assign({ view: 'attack', open: {}, range: 14 }, s.ui || {});
  if (!s.ui.pb) { s.settings.style = 'paperbox'; s.ui.pb = 1; } // Paper Box became the default style
  for (const k in s.days) { const dd = s.days[k]; dd.tasks = dd.tasks || []; dd.factors = dd.factors || {}; dd.journal = dd.journal || {}; dd.rules = dd.rules || {}; }
  return s;
}

function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn(e); }
  return fresh();
}
let S = load();
let saveWarned = false;
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
  catch (e) { if (!saveWarned) { toast('Could not save. Export a backup from Settings.'); saveWarned = true; } }
}

/* ---------- data helpers ---------- */
function getDay(k, create) {
  if (!S.days[k] && create) S.days[k] = { tasks: [], status: '', factors: {}, journal: {}, rules: {}, note: '' };
  return S.days[k];
}
function dayStatus(k) { const d = S.days[k]; if (d && d.status) return d.status; return S.settings.restDays.includes(weekday(k)) ? 'rest' : 'normal'; }
function findTask(k, id) { const d = S.days[k]; return d && d.tasks.find(t => t.id === id); }
function newTask(o = {}) { return Object.assign({ id: uid(), what: '', qty: null, unit: '', detail: '', when: '', where: '', pd: null, ad: null, done: false, grade: 'full', notes: '' }, o); }
function kindOf(t) {
  if (!t.pd) return '';
  const tg = S.settings.targetDifficulty;
  if (t.pd >= tg - 1) return 'hard';
  if (t.pd <= S.settings.easyMax) return 'easy';
  return 'medium';
}
function activeTasks(k) { const d = S.days[k]; return d ? d.tasks.filter(t => !t.movedTo) : []; }
function dayCompletion(k) { const ts = activeTasks(k); if (!ts.length) return null; return ts.filter(t => t.done).length / ts.length * 100; }
function dayAvg(k, f) { return avg(activeTasks(k).map(t => t[f]).filter(v => v != null)); }
const normName = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

function taskHistory() {
  const out = [];
  Object.keys(S.days).sort().forEach(k => S.days[k].tasks.forEach(t => { if (!t.movedTo) out.push({ k, t }); }));
  return out;
}

/* 7/10 progressive overload suggestion from the last few rated attempts of the same task */
function suggestFor(name, beforeKey) {
  const n = normName(name); if (!n) return null;
  const st = S.settings;
  const h = taskHistory().filter(x => normName(x.t.what) === n && x.k < beforeKey && x.t.ad);
  if (!h.length) return null;
  const recent = h.slice(-Math.max(1, st.lookback));
  const avgAD = avg(recent.map(x => +x.t.ad));
  const last = recent[recent.length - 1].t;
  const tg = st.targetDifficulty, tol = st.tolerance, step = st.overloadStep / 100;
  let action = 'keep', qty = last.qty;
  if (avgAD < tg - tol) action = 'up';
  else if (avgAD > tg + tol) action = 'down';
  if (qty != null) {
    if (action === 'up') qty = Math.max(qty + 1, Math.round(qty * (1 + step)));
    if (action === 'down') qty = Math.max(1, Math.min(qty - 1, Math.round(qty * (1 - step))));
  }
  const amt = q => q != null ? `${q}${last.unit ? ' ' + last.unit : ''}` : '';
  let text;
  if (action === 'up') text = qty != null ? `Felt easy (avg AD ${fmt1(avgAD)}). Overload: ${amt(last.qty)} → ${amt(qty)}` : `Felt easy (avg AD ${fmt1(avgAD)}). Make it ~${st.overloadStep}% harder.`;
  else if (action === 'down') text = qty != null ? `Too hard (avg AD ${fmt1(avgAD)}). Ease off: ${amt(last.qty)} → ${amt(qty)}` : `Too hard (avg AD ${fmt1(avgAD)}). Scale it back a little.`;
  else text = `On target (avg AD ${fmt1(avgAD)}). Keep ${amt(qty) || 'the same load'}.`;
  return { avgAD, n: recent.length, action, qty, unit: last.unit, last, text };
}

function recurringTasks(beforeKey, days = 21) {
  const from = addDays(beforeKey, -days);
  const seen = new Map();
  taskHistory().forEach(({ k, t }) => { if (k >= from && k < beforeKey && normName(t.what)) seen.set(normName(t.what), t); });
  return [...seen.values()].map(t => ({ t, s: suggestFor(t.what, beforeKey) }));
}

/* day counts as "attacked" if completion >= winThreshold; rest/grace days are free */
function dayResult(k) {
  const st = dayStatus(k);
  if (st === 'rest' || st === 'grace') return 'free';
  const c = dayCompletion(k);
  if (c == null) return 'miss';
  return c >= S.settings.winThreshold ? 'won' : 'miss';
}
function streak() {
  const keys = Object.keys(S.days).filter(k => activeTasks(k).length).sort();
  if (!keys.length) return { n: 0, graceUsed: 0 };
  const first = keys[0];
  let k = todayKey(), n = 0;
  if (dayResult(k) === 'miss') k = addDays(k, -1); // today isn't over yet
  const used = {}; let graceUsed = 0;
  while (k >= first) {
    const r = dayResult(k);
    if (r === 'won') n++;
    else if (r === 'miss') {
      const wk = weekKey(k); used[wk] = (used[wk] || 0) + 1;
      if (used[wk] > S.settings.graceDaysPerWeek) break;
      graceUsed++;
    }
    k = addDays(k, -1);
  }
  return { n, graceUsed };
}

function compliance(keys, ruleIds) {
  let yes = 0, tot = 0;
  keys.forEach(k => {
    const d = S.days[k]; if (!d) return;
    if (S.settings.restSkipsRules && dayStatus(k) === 'rest') return;
    ruleIds.forEach(id => { const v = d.rules[id]; if (v === true) { yes++; tot++; } else if (v === false) tot++; });
  });
  return tot ? yes / tot * 100 : null;
}
function regression() {
  const ids = S.rules.filter(r => r.active).map(r => r.id);
  if (!ids.length) return null;
  const t = todayKey();
  const c7 = compliance(rangeKeys(t, 7), ids), prev = compliance(rangeKeys(addDays(t, -7), 7), ids);
  const st = S.settings;
  const flagged = S.rules.filter(r => r.active).filter(r => {
    const a = compliance(rangeKeys(t, 7), [r.id]), b = compliance(rangeKeys(addDays(t, -7), 7), [r.id]);
    return a != null && ((b != null && b - a >= st.regressionDrop) || a < st.complianceTarget);
  });
  let level = 'ok', msg = '';
  if (c7 == null) return { c7, prev, level: 'none', flagged };
  if (prev != null && prev - c7 >= st.regressionDrop) { level = 'bad'; msg = `Regression detected: rule compliance fell from ${pct(prev)} to ${pct(c7)} this week. Your brain is drifting back to baseline. Enforce the rules consciously.`; }
  else if (c7 < st.complianceTarget) { level = 'warn'; msg = `Compliance is ${pct(c7)} this week, below your ${st.complianceTarget}% target. Expect violations, but don't let the standard disappear.`; }
  return { c7, prev, level, msg, flagged };
}

/* ---------- theme + style ---------- */
const STYLES = [
  { id: 'pixel', name: 'Pixel', note: 'Ink, cream, orange. Pixel headings.', sw: ['#151412', '#f4f1ea', '#e4572e', '#2f8f5b'] },
  { id: 'refresh', name: 'Refresh', note: 'Clean sans, italic titles, soft cards.', sw: ['#f4f1ea', '#fffdf8', '#e4572e', '#c2362b'] },
  { id: 'bw', name: 'Pixel B&W', note: 'Black and white only, notched pixels.', sw: ['#000000', '#6b6b6b', '#e4e4e4', '#ffffff'] },
  { id: 'simplified', name: 'Simplified', note: 'Flat and quiet. One accent, hairlines only.', sw: ['#f4f1ea', '#fffdf8', '#d8d1c2', '#151412'] },
  { id: 'studio', name: 'Studio', layout: 'rail', fixedAccent: true, note: 'Sidebar dashboard. Pastel, pill buttons, two columns.', sw: ['#f6f5fb', '#ffffff', '#6c5ce7', '#23213a'] },
  { id: 'terminal', name: 'Terminal', layout: 'term', fixedAccent: true, note: 'Command line. Type to move, green on black.', sw: ['#050805', '#0d140e', '#5cff8f', '#ffb02e'] },
  { id: 'timeline', name: 'Timeline', layout: 'timeline', fixedAccent: true, note: 'Your day by the hour. Bold colour blocks, + button.', sw: ['#fffaf0', '#ff6b35', '#2a4bff', '#00b37e'] },
  { id: 'deck', name: 'Deck', layout: 'deck', fixedAccent: true, note: 'One big card at a time. Swipe through your day.', sw: ['#ffe600', '#111111', '#ffffff', '#ff3d00'] },
  { id: 'gamified', name: 'Gamified', note: 'Dark, round and bold. Three colours, mission cards.', sw: ['#0b0b0f', '#1b1b1f', '#ff4a1c', '#f4f3ef'] },
  { id: 'cyberpunk', name: 'Cyberpunk', layout: 'cyber', fixedAccent: true, note: 'Neon HUD. Cut panels, terminal data, one cyan action.', sw: ['#05040A', '#15131F', '#00F0FF', '#FF2BD6'] },
  { id: 'paperbox', name: 'Paper Box', layout: 'paper', fixedAccent: true, note: 'Cream paper, ink outlines, hard shadows, one coral accent.', sw: ['#F5ECDE', '#FFFFFF', '#F8704F', '#141414'] },
  { id: 'mono', name: 'B&W', layout: 'mono', fixedAccent: true, note: 'White cards, black pill titles, dotted outlines. Features only.', sw: ['#FFFFFF', '#111111', '#D4D4D4', '#F2F2F2'] },
  // Simple versions: the same look as their base style with only the essentials on screen (settings.simple), extras one tap away
  { id: 'paperbox-simple', base: 'paperbox', simple: true, name: 'Paper Box Simple', note: 'Paper Box with only the essentials. Tasks, focus, check-in.', sw: ['#F5ECDE', '#FFFFFF', '#F8704F', '#141414'] },
  { id: 'mono-simple', base: 'mono', simple: true, name: 'B&W Simple', note: 'B&W with only the essentials. Tasks, focus, check-in.', sw: ['#FFFFFF', '#111111', '#D4D4D4', '#F2F2F2'] },
];
const styleId = () => (S.settings.style || 'pixel') + (simple() ? '-simple' : '');
const simple = () => !!S.settings.simple && (S.settings.style === 'paperbox' || S.settings.style === 'mono');
const SIMPLE_BAR = ['attack', 'plan', 'focus'];
const SIMPLE_SET = ['s-style', 's-timer', 's-tabs', 's-data'];
const moreTask = new Set();
let allSettings = false;
const isMono = () => S.settings.style === 'mono';
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const st = S.settings, root = document.documentElement;
  const dark = st.theme === 'dark' || (st.theme === 'auto' && mq.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  const def = STYLES.find(x => x.id === st.style) || STYLES[0];
  root.dataset.style = def.id;
  // a style can bring its own layout (navigation, structure), not only colours
  root.dataset.layout = def.layout || 'tabs';
  if (simple()) root.dataset.simple = ''; else delete root.dataset.simple;
  root.classList.remove('menu-open');
  // Pixel B&W and the layout styles bring their own palette, so the accent colour applies to the rest
  if (def.id === 'bw' || def.fixedAccent) root.style.removeProperty('--accent'); else root.style.setProperty('--accent', st.accent);
  if (root.dataset.style === 'pixel') root.style.setProperty('--hard', st.accent); else root.style.removeProperty('--hard');
  root.style.setProperty('--fs', (st.fontScale || 100) + '%');
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = def.id === 'cyberpunk' ? '#0C0B14' : def.id === 'paperbox' ? (dark ? '#1C1A17' : '#F5ECDE') : def.id === 'mono' ? (dark ? '#111111' : '#FFFFFF') : dark ? '#0f0e0d' : '#f4f1ea';
  document.title = st.appName || 'Aware Mode';
}
mq.addEventListener?.('change', applyTheme);

/* ---------- UI primitives ---------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function modal(html, buttons, getVal) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}<div class="mbtns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    m.hidden = false;
    m.onclick = e => {
      const b = e.target.closest('[data-mi]');
      if (b) { const bv = buttons[+b.dataset.mi].value; const out = getVal && bv === 'go' ? getVal() : bv; m.hidden = true; m.innerHTML = ''; res(out); }
      else if (e.target === m) { m.hidden = true; m.innerHTML = ''; res(null); }
    };
  });
}
const confirmBox = (msg, ok = 'Yes', cls = 'primary') => modal(`<p>${msg}</p>`, [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: ok, value: true, cls }]);

// Cyberpunk shows long sections as a header with a count, collapsed until you open them
const CY_CLOSED = ['factors', 'journal', 'sugs', 'ifthen', 's-labels', 's-journal', 's-reframe', 's-loading', 's-principles', 's-tabs'];
const CY_COUNT = {
  factors: () => S.settings.factors.length, journal: () => S.settings.journalPrompts.length, sugs: () => recurringTasks(addDays(todayKey(), 1)).length,
  ifthen: () => S.woops.filter(w => w.active && (w.obstacle || w.plan)).length, 's-labels': () => 8, 's-journal': () => S.settings.journalPrompts.length,
  's-reframe': () => S.settings.reframePrompts.length, 's-loading': () => S.settings.loadingLines.length, 's-principles': () => S.settings.principles.length,
  's-tabs': () => S.settings.tabs.length, 's-factors': () => S.settings.factors.length,
};
// Paper Box also folds these (they sit as titled rows with a count on the board)
const PB_CLOSED = ['impact', 'history', 'pbtoday'];
// B&W folds the same long lists, plus the Focus "Today" log, journal history and the timer messages
const MO_CLOSED = ['history', 'pbtoday', 's-msgs', 's-factors'];
function sec(id, title, body, extra = '') {
  const style = S.settings.style, cy = style === 'cyberpunk' || style === 'paperbox' || style === 'mono';
  const shut = CY_CLOSED.includes(id) || (style === 'paperbox' && PB_CLOSED.includes(id)) || (style === 'mono' && MO_CLOSED.includes(id));
  const open = cy && S.ui.open[id] === undefined && shut ? false : S.ui.open[id] !== false;
  if (cy && CY_COUNT[id] && !extra) extra = `<span class="cnt">${style === 'cyberpunk' ? pad(CY_COUNT[id]()) : CY_COUNT[id]()}</span>`;
  return `<details class="sec" data-sec="${id}" ${open ? 'open' : ''}><summary>${title}${extra}</summary><div class="body">${body}</div></details>`;
}
function scale(path, val, tgt) {
  let h = '<div class="scale">';
  for (let i = 1; i <= 10; i++) h += `<button type="button" class="${val === i ? 'on' : ''} ${i === tgt ? 'tgt' : ''}" data-act="setval" data-path="${path}" data-v="${i}" aria-label="${i} of 10">${i}</button>`;
  return h + '</div>';
}
function inp(bind, val, attrs = '') { return `<input data-bind="${bind}" value="${esc(val ?? '')}" ${attrs}>`; }

/* ---------- pixel icons ---------- */
// '#' = current colour, 'a' = accent, 'c' = cream. Drawn on a square grid with crisp edges.
const PX = {
  today: ['#########', '#.......#', '#########', '#.......#', '#.....#.#', '#.#..#..#', '#..##...#', '#.......#', '#########'],
  plan: ['.........', '.....#...', '.....##..', '.....###.', '#########', '.....###.', '.....##..', '.....#...', '.........'],
  focus: ['..#####..', '.#.....#.', '#...#...#', '#...#...#', '#...###.#', '#.......#', '#.......#', '.#.....#.', '..#####..'],
  woop: ['..#####..', '.#.....#.', '#..###..#', '#.#...#.#', '#.#.#.#.#', '#.#...#.#', '#..###..#', '.#.....#.', '..#####..'],
  manual: ['#########', '#...#...#', '#.#.#.#.#', '#...#...#', '#.#.#.#.#', '#...#...#', '#.#.#.#.#', '#...#...#', '#########'],
  insights: ['.........', '.......#.', '.......#.', '....#..#.', '....#..#.', '.#..#..#.', '.#..#..#.', '.#..#..#.', '#########'],
  history: ['.........', '##.######', '.........', '##.######', '.........', '##.######', '.........', '##.######', '.........'],
  settings: ['...#.#...', '.#.###.#.', '..#####..', '###...###', '.##...##.', '###...###', '..#####..', '.#.###.#.', '...#.#...'],
  flame: ['....#....', '...##....', '...###...', '..####.#.', '..######.', '.###..##.', '.##....#.', '.##....#.', '..######.'],
  play: ['..#......', '..##.....', '..###....', '..####...', '..#####..', '..####...', '..###....', '..##.....', '..#......'],
  pause: ['.........', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.##...##.', '.........'],
  chev: ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  plus: ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  logo: ['....aaaa....', '....aaaa....', '...aaaaaa...', '...aa..aa...', '..aaa..aaa..', '..aa....aa..', '.cccccccaaa.', '.cccccccaaa.', '.aa......aa.', 'aa........aa', 'aa........aa', 'aa........aa'],
};
// Line icons used by the Refresh style (24px grid, 1.8 stroke)
const LINE = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plan: '<path d="M3 20h18M6.5 16a5.5 5.5 0 0 1 11 0M12 3v7M9 6l3-3 3 3"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  woop: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  manual: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
  insights: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  history: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".8" fill="currentColor"/><circle cx="3.5" cy="12" r=".8" fill="currentColor"/><circle cx="3.5" cy="18" r=".8" fill="currentColor"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  flame: '<path d="M12 22c3.9 0 7-2.8 7-6.8 0-4.7-4.4-6.6-5-12.2-3 2-5.6 5.7-5.6 9.3-1-.6-1.8-1.8-2-3.3C5 10.6 5 12.3 5 15.2 5 19.2 8.1 22 12 22z"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
// Cyberpunk line icons (Lucide-style, 2px stroke)
const CY = {
  today: '<path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10h16M8 2v4M16 2v4M9 15l2 2 4-4"/>',
  plan: '<path d="M12 2v6M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
  focus: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  woop: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  manual: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  insights: '<path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"/>',
  settings: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  play: '<path d="M6 3l14 9-14 9z"/>', pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>', skip: '<path d="M5 4l10 8-10 8zM19 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/>',
  chev: '<path d="M9 18l6-6-6-6"/>', cl: '<path d="M15 18l-6-6 6-6"/>', cd: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  carry: '<path d="M15 10l5 5-5 5M4 4v7a4 4 0 0 0 4 4h12"/>', repeat: '<path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>',
};
// Paper Box line icons (Lucide-style, 2px stroke, rounded)
const PB = Object.assign({}, CY, {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plan: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  manual: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  insights: '<path d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  more: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M19 12l-7 7-7-7"/>', cu: '<path d="M18 15l-6-6-6 6"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', bulb: '<path d="M9 18h6M10 22h4M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', ul: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  paste: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  play: '<path d="M6 4l14 8-14 8z"/>', pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  spark: '<path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="currentColor" stroke="none"/>',
});
// B&W line icons (Lucide-style, 1.5px stroke, rounded caps), from the B&W board
const MO = Object.assign({}, PB, {
  today: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4M9 15l2 2 4-4"/>',
  plan: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4M9.5 15h5M12.5 13l2 2-2 2"/>',
  focus: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5M12 2.5V6"/>',
  woop: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  manual: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5M9 7.5h6"/>',
  insights: '<path d="M4 20h16M7 16.5v-5M12 16.5V6.5M17 16.5v-8"/>',
  history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9M12 8v4.2l2.8 1.8"/>',
  settings: '<path d="M6 4v5M6 13v7M12 4v9M12 17v3M18 4v3M18 11v9"/><circle cx="6" cy="11" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="18" cy="9" r="2"/>',
  more: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  flame: '<path d="M12 3c.6 3 4.5 5.2 4.5 9.6a4.5 4.5 0 0 1-9 0c0-2.2 1-3.5 2.2-4.6.1 1.7.9 2.8 2 3.2-.4-3 .1-5.6.3-8.2z"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', cl: '<path d="M15 6l-6 6 6 6"/>', cd: '<path d="M6 9l6 6 6-6"/>', cu: '<path d="M6 15l6-6 6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.2"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>', pause: '<path d="M9 5.5v13M15 5.5v13"/>', skip: '<path d="M6 6l8.5 6L6 18zM18 6v12"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/>', refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  up: '<path d="M12 19V5M6.5 10.5L12 5l5.5 5.5"/>', down: '<path d="M12 5v14M6.5 13.5L12 19l5.5-5.5"/>',
  print: '<path d="M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v6H7z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  wave: '<path d="M3 9c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0M3 15c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', ul: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>', paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3.5h6V5"/>',
});
function px(name, size = 18) {
  if (S.settings.style === 'mono' && MO[name]) return `<svg class="pxi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="shape-rendering:geometricPrecision">${MO[name]}</svg>`;
  if (S.settings.style === 'paperbox' && PB[name]) return `<svg class="pxi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="shape-rendering:geometricPrecision">${PB[name]}</svg>`;
  if (S.settings.style === 'cyberpunk' && CY[name]) return `<svg class="pxi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="shape-rendering:geometricPrecision">${CY[name]}</svg>`;
  if (['refresh', 'simplified', 'gamified', 'studio', 'timeline', 'deck'].includes(S.settings.style) && LINE[name]) return `<svg class="pxi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="shape-rendering:geometricPrecision">${LINE[name]}</svg>`;
  const rows = PX[name]; if (!rows) return '';
  const h = rows.length, w = rows[0].length, fills = { '#': 'currentColor', a: 'var(--accent)', c: '#f4f1ea' };
  let r = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < w;) {
      const c = row[x]; if (c === '.') { x++; continue; }
      let n = 1; while (row[x + n] === c) n++;
      r += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${fills[c]}"/>`; x += n;
    }
  });
  return `<svg class="pxi" width="${size}" height="${Math.round(size * h / w)}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${r}</svg>`;
}
const blocks = (n, on, cls = 'on', id = '') => `<div class="blocks" ${id ? `id="${id}"` : ''} style="--n:${n}">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? cls : ''}"></i>`).join('')}</div>`;
function mix(ts) {
  const c = { hard: 0, medium: 0, easy: 0 };
  ts.forEach(t => { const k = kindOf(t); if (k) c[k]++; });
  return c;
}
function mixBar(ts) {
  const c = mix(ts), n = Math.max(1, ts.length);
  const cells = [...Array(c.hard).fill('h'), ...Array(c.medium).fill('m'), ...Array(c.easy).fill('e')];
  return `<div class="blocks" style="--n:${n}">${Array.from({ length: n }, (_, i) => `<i class="${cells[i] || ''}"></i>`).join('')}</div>
    <div class="legend-row"><span><i class="sq" style="background:var(--hard)"></i>${c.hard} hard</span><span><i class="sq" style="background:var(--medium)"></i>${c.medium} medium</span><span><i class="sq" style="background:var(--easy)"></i>${c.easy} easy</span>${ts.length - c.hard - c.medium - c.easy ? `<span><i class="sq" style="background:var(--surface2)"></i>${ts.length - c.hard - c.medium - c.easy} unrated</span>` : ''}</div>`;
}

/* ---------- XP + levels (only shown in the Gamified style; worked out from done tasks, nothing new is stored) ---------- */
const XP_PER_LEVEL = 500;
const taskXp = t => ({ hard: 30, medium: 20, easy: 10 }[kindOf(t)] || 10);
function xpInfo() {
  let xp = 0;
  for (const d of Object.values(S.days)) for (const t of d.tasks || []) if (t.done && !t.movedTo) xp += taskXp(t);
  return { xp, level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL };
}
function levelUp(n) {
  const el = document.createElement('div');
  el.className = 'levelup'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Level up');
  el.innerHTML = `<div class="lu"><div class="ring big" style="--p:100"><b>${n}</b></div><div class="eyebrow">Level up</div><h2>Level ${n}</h2><p class="muted">Every task you finish earns XP. Keep attacking.</p><button class="btn primary block">Continue</button></div>`;
  el.addEventListener('click', () => el.remove());
  document.body.append(el);
}

/* ---------- nav ---------- */
const navTabs = () => S.settings.tabs.filter(t => t.visible || t.id === 'settings');
function renderNav() {
  const v = S.ui.view;
  const term = layout() === 'term';
  if (layout() === 'paper' || layout() === 'mono') pbNav(v);
  else $('#nav').innerHTML = navTabs().map((t, i) =>
    `<a href="#${t.id}" class="${v === t.id ? 'on' : ''}" data-nav="${t.id}">${term ? `<span>${i + 1}:${esc(t.label.toLowerCase())}</span>` : `${px(t.id === 'attack' ? 'today' : t.id, 18)}<span>${esc(t.label)}</span>`}</a>`).join('');
  const name = S.settings.appName || 'Aware Mode';
  const parts = name.split(' ');
  const word = parts.length > 1 ? `${esc(parts.slice(0, -1).join(' '))} <b>${esc(parts.at(-1))}</b>` : `<b>${esc(name)}</b>`;
  const s = streak();
  if (layout() === 'mono') {
    // B&W top bar: streak circle, the screen title as a black pill, hamburger
    const tab = S.settings.tabs.find(x => x.id === v);
    $('#brand').innerHTML = `<span class="mo-t">${esc(tab ? tab.label : '')}</span><span class="mo-m">Menu</span>`;
    $('#streak').innerHTML = `${px('flame', 15)}<b>${s.n}</b>`;
    $('#streak').hidden = false;
  } else {
    $('#brand').innerHTML = `<img class="mark" src="icons/mark.png" alt="" width="24" height="24"><span>${word}</span>`;
    $('#streak').innerHTML = s.n ? `${px('flame', 13)}${s.n}` : '';
    $('#streak').hidden = !s.n;
  }
  $('#streak').title = s.n ? `${s.n}-day streak` : '';
  const g = S.settings.style === 'gamified', x = xpInfo(), lv = $('#lvl');
  lv.hidden = !g;
  if (g) lv.innerHTML = `<span class="ring" style="--p:${Math.round(x.into / XP_PER_LEVEL * 100)}"><b>${x.level}</b></span><span class="lt"><b>Level ${x.level}</b><small>${x.into} / ${XP_PER_LEVEL} XP</small></span>`;
  if (g && S.ui.lvl && x.level > S.ui.lvl) levelUp(x.level);
  if (S.ui.lvl !== x.level) { S.ui.lvl = x.level; save(); }
}

/* Paper Box: 5-cell bottom bar (first four tabs + More) and a Menu tile grid with every tab */
const PB_EYEBROW = { attack: 'Attack today', plan: 'Build a tomorrow', focus: '30/10 system', woop: 'Clarity creates execution', manual: 'Treat yourself as a company', insights: 'Track · reflect · adjust', history: "Everything you've written", settings: 'Everything is yours to change' };
const pbIcon = id => id === 'attack' ? 'today' : id;
function pbNav(v) {
  const sm = simple(), tabs = navTabs(), bar = sm ? tabs.filter(t => SIMPLE_BAR.includes(t.id)) : tabs.length <= 5 ? tabs : tabs.slice(0, 4);
  const cur = tabs.find(t => t.id === v), over = (sm || tabs.length > 5) && cur && !bar.includes(cur);
  let h = bar.map(t => `<a href="#${t.id}" class="${v === t.id ? 'on' : ''}" data-nav="${t.id}">${px(pbIcon(t.id), 22)}<span>${esc(t.label)}</span></a>`).join('');
  if (sm || tabs.length > 5) h += `<a href="#" class="more ${over ? 'on' : ''}" data-act="menu" aria-label="More tabs">${px(over ? pbIcon(cur.id) : 'more', 22)}<span>${over ? esc(cur.label) : 'More'}</span></a>`;
  $('#nav').innerHTML = h;
  let m = $('#pbmenu');
  if (!m) { m = document.createElement('div'); m.id = 'pbmenu'; document.body.append(m); }
  const s = streak(), name = (S.settings.appName || 'Aware Mode').split(' ');
  if (layout() === 'mono') {
    m.innerHTML = `<div class="wrap"><div class="mo-mhero"><img src="icons/mark.png" alt="" width="56" height="56"><span class="mo-wm">${esc(S.settings.appName || 'Aware Mode')}</span><span class="chip">${px('flame', 13)}${s.n} day streak</span></div>
      <div class="mo-tiles">${tabs.map(t => `<a href="#${t.id}" class="mo-tile ${v === t.id ? 'on' : ''}" data-nav="${t.id}">${px(pbIcon(t.id), 26)}<span>${esc(t.label)}</span></a>`).join('')}</div></div>`;
    return;
  }
  m.innerHTML = `<div class="wrap"><div class="pb-mhero"><span class="pb-box"><img src="icons/mark.png" alt="" width="80" height="80"></span>${px('spark', 18)}${px('spark', 12)}
      <div class="row"><span class="pb-wm">${name.length > 1 ? `${esc(name.slice(0, -1).join(' '))} <b>${esc(name.at(-1))}</b>` : `<b>${esc(name[0])}</b>`}</span>${s.n ? `<span class="pill">${px('flame', 16)}${s.n}</span>` : ''}</div></div>
    <div class="row between pb-mh"><b>Menu</b><span class="eyebrow">${tabs.length} tabs</span></div>
    <div class="pb-tiles">${tabs.map(t => `<a href="#${t.id}" class="pb-tile ${v === t.id ? 'on' : ''}" data-nav="${t.id}">${px(pbIcon(t.id), 26)}<span><b>${esc(t.label)}</b><span>${PB_EYEBROW[t.id]}</span></span></a>`).join('')}</div></div>`;
}

/* ---------- task rows ---------- */
const openTask = new Set();
function taskRow(k, t, i, mode) {
  if (isMono()) return moTaskRow(k, t, i, mode);
  const kind = kindOf(t), today = mode === 'today', open = openTask.has(t.id), pb = S.settings.style === 'paperbox';
  const p = `task|${k}|${t.id}|`;
  const amount = t.qty != null ? `${t.qty}${t.unit ? ' ' + t.unit : ''}` : '';
  const sub = t.movedTo ? 'Moved to ' + niceDate(t.movedTo, { weekday: 'short', day: 'numeric', month: 'short' })
    : [t.when, amount, t.detail, t.where].filter(Boolean).join(' · ') || 'Tap to set amount, time and place';
  const dd = t.pd ? (today && t.ad ? `${t.pd}>${t.ad}` : `${t.pd}/10`) : '';
  return `<div class="task ${t.done ? 'done' : ''} ${t.movedTo ? 'moved' : ''} ${open ? 'open' : ''}">
    <div class="trow" data-act="toggleTask" data-id="${t.id}" role="button" tabindex="0" aria-expanded="${open}">
      ${today && !t.movedTo ? `<label class="check" title="Done"><input type="checkbox" data-bind="${p}done" data-rr ${t.done ? 'checked' : ''} aria-label="Mark done"><span></span></label>` : `<span class="num">${pad(i + 1)}</span>`}
      <div class="t"><div class="name">${t.what ? esc(t.what) : '<span class="muted">Untitled task</span>'}</div><div class="sub">${esc(sub)}</div></div>
      ${pb ? '<span class="rt"><span class="row">' : ''}
      ${t.grade === 'g0' ? '<span class="tag grade" title="Grade 0 starter">G0</span>' : t.grade === 'g1' ? '<span class="tag grade" title="Grade 1 starter">G1</span>' : ''}
      ${kind ? `<span class="tag ${kind}">${pb ? `<i>${kind[0].toUpperCase()}</i>` : ''}${kind}</span>` : ''}${pb ? '</span>' : ''}
      ${dd ? `<span class="dd" title="Predicted${today && t.ad ? ' > actual' : ''} difficulty">${dd}</span>` : ''}${pb ? '</span>' : ''}
      ${S.settings.style === 'gamified' && !t.movedTo ? `<span class="xp" title="XP for finishing">+${taskXp(t)}</span>` : ''}
      <span class="chev">${px('chev', pb ? 16 : 7)}</span>
    </div>
    ${open ? taskEditor(k, t, mode) : ''}
  </div>`;
}
function taskEditor(k, t, mode) {
  if (isMono()) return moEditor(k, t, mode);
  const st = S.settings, L = st.labels, P = st.placeholders, tg = st.targetDifficulty, today = mode === 'today';
  const p = `task|${k}|${t.id}|`;
  let meta = '';
  if (today && t.pd && t.ad) {
    const d = t.ad - t.pd;
    meta = d === 0 ? `Predicted it right: ${t.pd}/10.` : `${d > 0 ? 'Harder' : 'Easier'} than expected (${t.pd} > ${t.ad}).`;
    if (t.ad <= tg - 2) meta += ` <span class="tag easy">overload next time</span>`;
    if (t.ad >= tg + 2) meta += ` <span class="tag hard">scale back</span>`;
  }
  if (!today && t.what) {
    const s = suggestFor(t.what, k);
    if (s) meta += `<span>${esc(s.text)}</span>${s.qty != null && s.qty !== t.qty ? ` <button class="btn sm" data-act="applySug" data-k="${k}" data-id="${t.id}" data-q="${s.qty}">Apply</button>` : ''}`;
  }
  const pb = st.style === 'paperbox', kind = kindOf(t), adv = !simple() || moreTask.has(t.id);
  return `${pb ? `<div class="pb-scrim" data-act="toggleTask" data-id="${t.id}"></div>` : ''}<div class="editor" data-id="${t.id}">
    ${pb ? `<div class="pb-sh"><i class="handle"></i><div class="row"><b>${t.what ? esc(t.what) : 'New task'}</b>${kind ? `<span class="tag ${kind}"><i>${kind[0].toUpperCase()}</i>${kind}</span>` : ''}<button class="icon-btn pb-x" data-act="toggleTask" data-id="${t.id}" aria-label="Close">${px('x', 16)}</button></div></div>` : ''}
    ${pb && !adv ? `<div class="pb-fields"><label class="f w"><span>${esc(L.what)}</span>${inp(p + 'what', t.what, `class="what" placeholder="${esc(P.what)}"`)}</label></div>` : pb ? `<div class="pb-fields">
      <label class="f w"><span>${esc(L.what)}</span>${inp(p + 'what', t.what, `class="what" placeholder="${esc(P.what)}"`)}</label>
      <label class="f"><span>${esc(L.howMuch)}</span>${inp(p + 'qty', t.qty, 'type="number" step="any" inputmode="decimal" placeholder="0"')}</label>
      <label class="f"><span>Unit</span>${inp(p + 'unit', t.unit, `placeholder="${esc(P.unit)}"`)}</label>
      <label class="f t"><span>Detail</span>${inp(p + 'detail', t.detail, `placeholder="${esc(P.detail)}"`)}</label>
      <label class="f t"><span>${esc(L.when)}</span>${inp(p + 'when', t.when, 'type="time"')}</label>
      <label class="f t"><span>${esc(L.where)}</span>${inp(p + 'where', t.where, `placeholder="${esc(P.where)}"`)}</label>
    </div>` : `<label class="f"><span>${esc(L.what)}</span>${inp(p + 'what', t.what, `class="what" placeholder="${esc(P.what)}"`)}</label>
    <div class="fields">
      <label class="f"><span>${esc(L.howMuch)}</span><div class="qty">${inp(p + 'qty', t.qty, 'type="number" step="any" inputmode="decimal" placeholder="0" aria-label="Amount"')}${inp(p + 'unit', t.unit, `placeholder="${esc(P.unit)}" aria-label="Unit"`)}</div></label>
      <label class="f"><span>Detail</span>${inp(p + 'detail', t.detail, `placeholder="${esc(P.detail)}"`)}</label>
      <label class="f"><span>${esc(L.when)}</span>${inp(p + 'when', t.when, 'type="time"')}</label>
      <label class="f"><span>${esc(L.where)}</span>${inp(p + 'where', t.where, `placeholder="${esc(P.where)}"`)}</label>
    </div>`}
    <div class="diff">
      <div class="dial"><span class="lbl">Predicted difficulty<b>${t.pd ? t.pd + '/10' : ''}</b></span>${scale(p + 'pd', t.pd, tg)}</div>
      ${today ? `<div class="dial"><span class="lbl">Actual difficulty<b>${t.ad ? t.ad + '/10' : ''}</b></span>${scale(p + 'ad', t.ad, tg)}</div>` : ''}
    </div>
    ${meta && adv ? `<div class="meta">${meta}</div>` : ''}
    ${adv ? '' : `<button class="btn pill" data-act="moreTask" data-id="${t.id}">${px('plus', 14)}More details</button>`}
    ${adv ? `<div class="grid g2">
      ${st.style === 'cyberpunk' || pb ? `<div class="f cy-grade"><span>Starter grade</span><div class="seg">${[['full', 'Full task'], ['g1', `Grade 1: ${st.timer.starterG1}-min version`], ['g0', `Grade 0: ${st.timer.starterG0}-min version`]].map(([v, l]) => `<button type="button" class="${(t.grade || 'full') === v ? 'on' : ''}" data-act="setGrade" data-k="${k}" data-id="${t.id}" data-v="${v}">${l}</button>`).join('')}</div></div>` : `<label class="f"><span>Starter grade</span>
        <select data-bind="${p}grade" data-rr>
          <option value="full" ${t.grade === 'full' ? 'selected' : ''}>Full task</option>
          <option value="g1" ${t.grade === 'g1' ? 'selected' : ''}>Grade 1: ${st.timer.starterG1}-min version</option>
          <option value="g0" ${t.grade === 'g0' ? 'selected' : ''}>Grade 0: ${st.timer.starterG0}-min version</option>
        </select></label>`}
      <label class="f"><span>Notes</span><textarea data-bind="${p}notes" rows="1" style="min-height:38px" placeholder="Obstacles, time spent, why">${esc(t.notes)}</textarea></label>
    </div>` : ''}
    ${pb ? `<div class="pb-acts">
      <button class="btn" data-act="focusTask" data-k="${k}" data-id="${t.id}">${px('focus', 16)}Focus</button>
      ${today && !t.done && !t.movedTo ? `<button class="btn" data-act="moveTask" data-k="${k}" data-id="${t.id}">${px('arrow', 16)}To tomorrow</button>` : ''}
      ${adv ? `<button class="btn" data-act="dupTask" data-k="${k}" data-id="${t.id}">${px('copy', 16)}Duplicate</button>
      <button class="btn" data-act="mvTask" data-dir="-1" data-k="${k}" data-id="${t.id}">${px('up', 16)}Move up</button>
      <button class="btn" data-act="mvTask" data-dir="1" data-k="${k}" data-id="${t.id}">${px('down', 16)}Move down</button>` : ''}
      <button class="btn danger" data-act="delTask" data-k="${k}" data-id="${t.id}">${px('trash', 16)}Delete</button>
    </div>` : `<div class="row">
      <button class="btn sm" data-act="focusTask" data-k="${k}" data-id="${t.id}">${px('play', 9)} Focus</button>
      ${today && !t.done && !t.movedTo ? `<button class="btn sm" data-act="moveTask" data-k="${k}" data-id="${t.id}">To tomorrow</button>` : ''}
      <button class="btn sm" data-act="dupTask" data-k="${k}" data-id="${t.id}">Duplicate</button>
      <button class="icon-btn" data-act="mvTask" data-dir="-1" data-k="${k}" data-id="${t.id}" title="Move up" aria-label="Move up">^</button>
      <button class="icon-btn" data-act="mvTask" data-dir="1" data-k="${k}" data-id="${t.id}" title="Move down" aria-label="Move down">v</button>
      <span style="flex:1"></span>
      <button class="btn sm danger" data-act="delTask" data-k="${k}" data-id="${t.id}">Delete</button>
    </div>`}
  </div>`;
}
function taskList(k, mode, emptyMsg) {
  const d = S.days[k] || { tasks: [] };
  return `<div class="tasks">${d.tasks.length ? d.tasks.map((x, i) => taskRow(k, x, i, mode)).join('') : `<div class="empty-row">${emptyMsg}</div>`}
    <button class="add-task" data-act="addTask" data-k="${k}">${px('plus', 9)} Add task</button></div>`;
}

function dayHints(k, mode) {
  const st = S.settings, ts = activeTasks(k);
  const hard = ts.filter(t => kindOf(t) === 'hard').length;
  const rated = ts.filter(t => t.pd).length;
  const out = [];
  if (!ts.length) return out;
  if (rated === ts.length && hard < st.hardTasksTarget) out.push(['accent', `Only ${hard} task${hard === 1 ? '' : 's'} around ${st.targetDifficulty}/10. Aim for ${st.hardTasksTarget} challenging tasks plus easier ones.`]);
  if (hard > st.hardTasksTarget) out.push(['warn', `${hard} hard tasks. Your system says ${st.hardTasksTarget} hard + the rest easy/medium, so the day stays doable.`]);
  if (ts.length > st.maxTasks) out.push(['warn', `${ts.length} tasks is above your limit of ${st.maxTasks}. Fewer, clearer tasks get finished.`]);
  const vague = ts.filter(t => t.what && (t.qty == null || !t.when)).length;
  if (vague) out.push(['', `${vague} task${vague > 1 ? 's are' : ' is'} missing an amount or a time. Make it precise enough that you never decide again later.`]);
  return out;
}

/* ---------- views ---------- */
const V = {};

V.attack = () => {
  const st = S.settings, t = todayKey();
  const k = S.ui.date || t;
  const ts = activeTasks(k), status = dayStatus(k);
  const done = ts.filter(x => x.done).length;
  const pctDone = ts.length ? Math.round(done / ts.length * 100) : 0;
  const ad = dayAvg(k, 'ad'), pd = dayAvg(k, 'pd'), load = ad ?? pd;
  const mins = S.sessions.filter(s => s.d === k && s.type !== 'break').reduce((a, s) => a + s.m, 0);
  const reg = regression();
  const tomorrowEmpty = !activeTasks(addDays(t, 1)).length;
  let h = `<div class="dayhead">
    <div><div class="eyebrow">${k === t ? 'Attack today' : k > t ? 'Planned day' : 'Past day'}</div>
      <h1 class="title">${k === t ? 'Today' : esc(niceDate(k, { weekday: 'short' }))}</h1></div>
    <div class="datenav no-print">
      <button class="icon-btn" data-act="shiftDate" data-n="-1" aria-label="Previous day">&lt;</button>
      <input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date">
      <button class="icon-btn" data-act="shiftDate" data-n="1" aria-label="Next day">&gt;</button>
      ${k !== t ? '<button class="btn sm" data-act="goToday">Today</button>' : ''}
      <button class="btn sm" data-act="goHistory">History</button>
    </div></div>`;
  if (st.showPrinciple && st.principles.length) h += `<div class="principle">${esc(st.principles[(parseKey(k).getTime() / 864e5 | 0) % st.principles.length])}</div>`;
  if (reg && (reg.level === 'bad' || reg.level === 'warn') && k === t) h += `<div class="hint ${reg.level}" style="margin:10px 0"><div>${esc(reg.msg)} <a href="#manual">Open manual</a></div></div>`;
  if (k === t && new Date().getHours() >= st.planReminderHour && tomorrowEmpty) h += `<div class="hint accent" style="margin:10px 0"><div>Plan tomorrow before today ends. <a href="#plan">Build tomorrow</a></div></div>`;

  h += `<div class="card ink"><div class="hero">
      <div><div class="big">${pctDone}<small>%</small></div><div class="small muted">${done} of ${ts.length} done</div></div>
      <div style="min-width:0">
        <div class="row between"><span class="lbl">${ad != null ? 'Actual load' : 'Planned load'}</span><span class="pixel">${fmt1(load)}<span class="muted">/10</span></span></div>
        ${blocks(10, Math.round(load || 0), 'on')}
        <div class="row between" style="margin-top:14px"><span class="lbl">Mix</span><span class="small muted">target ${st.hardTasksTarget} hard</span></div>
        ${mixBar(ts)}
      </div></div>
    <div class="row between" style="margin-top:16px">
      <div class="seg" role="group" aria-label="Day type">${['normal', 'grace', 'rest'].map(s => `<button class="${status === s ? 'on' : ''}" data-act="setStatus" data-k="${k}" data-v="${s}">${s === 'normal' ? 'Attack' : s === 'grace' ? 'Grace' : 'Rest'}</button>`).join('')}</div>
      <span class="small muted">${mins} min focused</span>
    </div>
    ${status !== 'normal' ? `<div class="hint ${status === 'rest' ? 'good' : ''}" style="margin-top:12px">${status === 'rest' ? "Rest day. Recovery is part of the system and it won't break your streak." : 'Grace day. Life happened. The streak is protected; do what you can.'}</div>` : ''}
  </div>`;
  dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
  h += taskList(k, 'today', `No tasks yet. Aim for ${st.hardTasksTarget} tasks around ${st.targetDifficulty}/10, the rest easier.`);
  if (k === t && ts.some(x => !x.done)) h += `<button class="btn primary block no-print" data-act="startFocus">${px('play', 11)} Start focus</button>`;
  h += `<div class="goal"><span>Next day attack goal</span><b>${st.targetDifficulty}/10</b></div>`;
  if (st.showRulesOnToday) h += sec('rules', 'Manual check-in', rulesCheckin(k), compBadge(k));
  if (st.showFactorsOnToday) h += sec('factors', 'Factors', factorsForm(k));
  if (st.showJournalOnToday) h += sec('journal', 'Feedback journal', journalForm(k));
  if (!NATIVE) h += `<div class="row no-print" style="justify-content:flex-end"><button class="btn sm ghost" data-act="print">Print sheet</button></div>`;
  h += sheetForPrint(k);
  return h;
};
function compBadge(k) {
  const ids = S.rules.filter(r => r.active).map(r => r.id);
  const c = compliance([k], ids);
  return c == null ? '' : ` <span class="pill">${pct(c)}</span>`;
}
function rulesCheckin(k) {
  const rules = S.rules.filter(r => r.active);
  if (!rules.length) return `<div class="empty">No rules yet. Write your company policies in the <a href="#manual">Manual</a>.</div>`;
  const d = S.days[k] || { rules: {} };
  return rules.map(r => {
    const v = d.rules[r.id];
    return `<div class="rule-row"><div class="t"><b>${esc(r.title || 'Untitled rule')}</b>${r.detail ? `<div class="small muted">${esc(r.detail)}</div>` : ''}</div>
      <div class="tri"><button class="yes ${v === true ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="1" aria-label="Followed">✓</button><button class="no ${v === false ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="0" aria-label="Broken">✗</button></div></div>`;
  }).join('');
}
function factorsForm(k) {
  const st = S.settings, d = S.days[k] || { factors: {} };
  if (!st.factors.length) return '<div class="empty">No factors set up. Add them in Settings.</div>';
  return `<p class="small muted" style="margin-top:0">A bad day isn't automatically a discipline problem. Log what might be affecting you.</p>` + st.factors.map(f => {
    const v = d.factors[f.id];
    let ctl = '';
    if (f.type === 'scale') {
      ctl = '<div class="pills">';
      for (let i = +f.min || 1; i <= (+f.max || 5); i++) ctl += `<button class="${v === i ? 'on' : ''}" data-act="factorSet" data-k="${k}" data-id="${f.id}" data-v="${i}">${i}</button>`;
      ctl += '</div>';
    } else if (f.type === 'yesno') {
      ctl = `<div class="pills"><button class="${v === true ? 'on' : ''}" data-act="factorSet" data-k="${k}" data-id="${f.id}" data-v="yes">Yes</button><button class="${v === false ? 'on' : ''}" data-act="factorSet" data-k="${k}" data-id="${f.id}" data-v="no">No</button></div>`;
    } else if (f.type === 'number') {
      ctl = `<div class="row" style="flex-wrap:nowrap">${inp(`factor|${k}|${f.id}`, v, `type="number" step="any" inputmode="decimal" style="max-width:120px"`)}<span class="muted">${esc(f.unit || '')}</span></div>`;
    } else ctl = inp(`factor|${k}|${f.id}`, v);
    return `<div class="factor"><div><b>${esc(f.name)}</b></div><div>${ctl}</div></div>`;
  }).join('');
}
function journalForm(k) {
  const st = S.settings, d = S.days[k] || { journal: {}, note: '' };
  const ts = activeTasks(k), done = ts.filter(t => t.done);
  const summary = ts.length ? `<div class="hint" style="margin-bottom:10px"><div><b>Plan vs result:</b> planned ${ts.length}, completed ${done.length}. Avg predicted ${fmt1(dayAvg(k, 'pd'))} vs actual ${fmt1(dayAvg(k, 'ad'))}.
     ${ts.filter(t => !t.done).length ? `<br>Not done: ${ts.filter(t => !t.done).map(t => esc(t.what || 'untitled')).join(', ')}` : ''}</div></div>` : '';
  return summary + st.journalPrompts.map((q, i) => `<label class="f" style="margin-bottom:10px"><span>${esc(q)}</span><textarea data-bind="journal|${k}|${i}">${esc(d.journal[q] || '')}</textarea></label>`).join('')
    + `<label class="f"><span>Free notes</span><textarea data-bind="day|${k}|note">${esc(d.note || '')}</textarea></label>`;
}
function sheetForPrint(k) {
  const ts = activeTasks(k), L = S.settings.labels;
  return `<div class="print-only sheet"><h1>Attack Today/Tomorrow</h1><div>${esc(niceDate(k, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}</div>
   <table><tr><th></th><th>${esc(L.what)}</th><th>${esc(L.howMuch)}</th><th>${esc(L.when)}</th><th>${esc(L.where)}</th><th>PD</th><th>AD</th></tr>
   ${(ts.length ? ts : Array.from({ length: 6 }, () => ({}))).map(t => `<tr><td><span class="box"></span></td><td>${esc(t.what || '')}</td><td>${t.qty != null ? esc(t.qty + ' ' + (t.unit || '')) : ''} ${esc(t.detail || '')}</td><td>${esc(t.when || '')}</td><td>${esc(t.where || '')}</td><td>${t.pd ? t.pd : '&nbsp;&nbsp;'}/10</td><td>${t.ad ? t.ad : '&nbsp;&nbsp;'}/10</td></tr>`).join('')}
   </table><p style="text-align:right;font-size:14pt;margin-top:20pt">NEXT DAY ATTACK GOAL: ${S.settings.targetDifficulty}/10</p></div>`;
}

V.plan = () => {
  const st = S.settings, t = todayKey(), k = addDays(t, 1);
  const ts = activeTasks(k);
  const undone = activeTasks(t).filter(x => !x.done && x.what);
  const rec = recurringTasks(k).filter(r => !ts.some(x => normName(x.what) === normName(r.t.what)));
  const top = rec.find(r => r.s && r.s.action === 'up') || rec.find(r => r.s && r.s.action === 'down');
  let h = `<div class="dayhead"><div><div class="eyebrow">Build a tomorrow</div><h1 class="title">Tomorrow</h1></div><span class="small muted">${esc(niceDate(k))}</span></div>
    <p class="muted small">Plan it before today ends: exact tasks, amounts, times. Wake up with clarity, not decisions.</p>`;
  h += `<div class="card ink"><div class="row between"><span class="h2">Balanced plan</span><span class="small muted">${ts.length}/${st.maxTasks} tasks</span></div>
    <div style="margin-top:10px">${mixBar(ts)}</div></div>`;
  if (top) {
    const i = rec.indexOf(top);
    h += `<div class="sugbar"><div class="t"><b>${top.s.action === 'up' ? `Make it ~${st.overloadStep}% harder` : 'Ease off a little'}</b><span class="small">${esc(top.t.what)}: ${esc(top.s.text)}</span></div><button class="btn sm primary" data-act="addSug" data-i="${i}">Add</button></div>`;
  }
  h += `<div class="row no-print">
    <button class="btn sm" data-act="carry" ${undone.length ? '' : 'disabled'}>Carry over unfinished (${undone.length})</button>
    <button class="btn sm" data-act="repeatToday" ${activeTasks(t).length ? '' : 'disabled'}>Repeat today, adjusted</button></div>`;
  dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
  h += taskList(k, 'plan', 'Nothing planned for tomorrow yet.');
  h += `<div class="goal"><span>Next day attack goal</span><b>${st.targetDifficulty}/10</b></div>`;
  if (rec.length) {
    h += sec('sugs', '7/10 suggestions', `<p class="small muted" style="margin-top:0">From your recent tasks. Below ${st.targetDifficulty - st.tolerance}/10 actual difficulty, add load. Above ${st.targetDifficulty + st.tolerance}, ease off.</p>` +
      rec.map(({ t: x, s }, i) => `<div class="rule-row"><div class="t"><b>${esc(x.what)}</b><div class="small muted">${s ? esc(s.text) : 'Rate actual difficulty to get overload suggestions.'}</div></div>
       <button class="btn sm" data-act="addSug" data-i="${i}">Add</button></div>`).join(''));
  }
  const woops = S.woops.filter(w => w.active && (w.obstacle || w.plan));
  if (woops.length) h += sec('ifthen', 'Your if-then plans', woops.map(w => `<div class="rule-row"><div class="t"><b>${esc(w.wish)}</b><div class="small">If <i>${esc(w.obstacle)}</i>, then <i>${esc(w.plan)}</i>.</div></div></div>`).join(''));
  return h;
};
/* ---------- focus timer (30/10) ---------- */
const T = { mode: 'work', running: false, endAt: 0, left: null, total: null, cycle: 1, taskKey: null, taskId: null, ask: false, reframe: null };
function tSet(mode, min) { T.mode = mode; T.left = T.total = Math.max(1, Math.round(min * 60)); T.running = false; T.ask = false; nativeSchedule(); }
// Android app: schedule a system notification for the block end, so it fires even with the screen off
let lnAsked = false;
function nativeSchedule() {
  const LN = NATIVE && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (!LN) return;
  LN.cancel({ notifications: [{ id: 1 }] }).catch(() => { });
  if (!T.running) return;
  const go = () => LN.schedule({ notifications: [{ id: 1, title: T.mode === 'break' ? 'Break over' : T.mode === 'starter' ? 'Starter done' : 'Work block done', body: T.mode === 'break' ? 'Back to work.' : T.mode === 'starter' ? 'Am I willing to continue?' : S.settings.timer.breakMsg, schedule: { at: new Date(T.endAt), allowWhileIdle: true } }] }).catch(() => { });
  if (lnAsked) return go();
  lnAsked = true;
  LN.requestPermissions().then(go, go);
}
function tStart() { if (T.running) return; if (T.left == null) tSet('work', S.settings.timer.work); T.endAt = Date.now() + T.left * 1000; T.running = true; unlockAudio(); nativeSchedule(); }
function tPause() { if (!T.running) return; T.left = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000)); T.running = false; nativeSchedule(); }
function tFinish() {
  T.running = false; T.left = 0;
  const tm = S.settings.timer;
  beep(T.mode === 'break' ? 2 : 3);
  const taskName = T.taskId ? (findTask(T.taskKey, T.taskId) || {}).what : '';
  if (T.mode !== 'break') S.sessions.push({ d: todayKey(), m: Math.round(T.total / 60), type: T.mode, task: taskName || '' });
  if (S.sessions.length > 5000) S.sessions = S.sessions.slice(-4000);
  save();
  if (T.mode === 'starter') { notify('Starter done', 'Am I willing to continue?'); T.ask = true; }
  else if (T.mode === 'work') {
    notify('Work block done', tm.breakMsg);
    const long = tm.longEvery > 0 && T.cycle % tm.longEvery === 0;
    tSet('break', long ? tm.longBrk : tm.brk);
    if (tm.autoStart) tStart();
  } else {
    notify('Break over', 'Back to work.');
    T.cycle++; tSet('work', tm.work);
    if (tm.autoStart) tStart();
  }
  if (S.ui.view === 'focus') render();
  renderNav();
}
setInterval(() => {
  if (T.running) {
    T.left = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
    if (T.left <= 0) tFinish();
  }
  const disp = $('#tdisp');
  if (disp && T.left != null) {
    disp.textContent = mmss(T.left);
    const on = Math.floor((1 - T.left / T.total) * 30);
    document.querySelectorAll('#tblocks i, #tring path').forEach((el, i) => el.classList.toggle('on', i < on));
    disp.closest('.focus-card')?.style.setProperty('--p', Math.round((1 - T.left / T.total) * 100));
  }
  document.title = T.running ? `${mmss(T.left)} · ${T.mode === 'break' ? 'Break' : 'Focus'}` : (S.settings.appName || 'Aware Mode');
}, 500);
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

let actx;
function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } }
function beep(n = 3) {
  if (!S.settings.timer.sound) return;
  try {
    unlockAudio();
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.35;
      o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.start(t0); o.stop(t0 + 0.3);
    }
  } catch (e) { }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function notify(title, body) {
  if (!S.settings.timer.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: 'icons/icon-192.png' }));
    else new Notification(title, { body });
  } catch (e) { }
}

V.focus = () => {
  const tm = S.settings.timer, k = todayKey();
  if (T.left == null) tSet('work', tm.work);
  const task = T.taskId ? findTask(T.taskKey, T.taskId) : null;
  const ts = activeTasks(k).filter(t => !t.done);
  const next = ts.find(t => t.id !== T.taskId);
  const today = S.sessions.filter(s => s.d === k);
  const label = { work: 'Deep work', break: 'Break', starter: 'Starter' }[T.mode];
  let h = `<div class="eyebrow">30/10 system</div><h1 class="title">Focus</h1>`;
  h += `<div class="card invert focus-card" style="--p:${Math.round((1 - T.left / T.total) * 100)}">
    <div class="eyebrow">${label}${T.mode !== 'starter' ? ' · block ' + T.cycle : ''}</div>
    <div class="task-name">${esc(task ? task.what : T.mode === 'break' ? 'Rest your eyes' : 'Pick a task below')}</div>
    <div class="time" id="tdisp">${mmss(T.left)}</div>
    <div class="mode ${T.mode === 'break' ? 'break' : ''}">${T.running ? (T.mode === 'break' ? 'On break' : 'In the zone') : 'Paused'}</div>
    ${blocks(30, Math.floor((1 - T.left / T.total) * 30), 'on', 'tblocks')}
    <p class="msg muted">${esc(T.mode === 'break' ? tm.breakMsg : tm.workMsg)}</p>
    <div class="ctrls">
      <button class="side" data-act="tPlus5" aria-label="Add 5 minutes"><b>+5</b>min</button>
      <button class="main" data-act="tToggle" aria-label="${T.running ? 'Pause' : 'Start'}">${px(T.running ? 'pause' : 'play', 28)}</button>
      <button class="side" data-act="tSkip" aria-label="Skip to ${T.mode === 'break' ? 'work' : 'break'}"><b>&gt;&gt;</b>skip</button>
    </div>
    ${T.left < T.total ? '<button class="btn sm ghost" data-act="tReset" style="margin-top:14px;color:var(--inv-muted)">Reset</button>' : ''}
  </div>`;
  if (T.ask) h += `<div class="hint accent" style="flex-direction:column"><b>Starter done. Am I willing to continue?</b><div class="row"><button class="btn primary sm" data-act="tContinue">Yes, full ${tm.work}-min block</button><button class="btn sm" data-act="tStop">Not now, that's okay</button></div></div>`;

  h += `<button class="linkrow" data-act="reframe"><span class="t"><b>Mind wandering?</b><span class="small muted">Reframe the task and get back on track.</span></span>${px('chev', 7)}</button>`;
  if (T.reframe != null) {
    const q = S.settings.reframePrompts[T.reframe] || '', why = S.settings.myWhy;
    const woops = S.woops.filter(w => w.active && w.wish);
    const subj = task ? task.what : 'what I am studying';
    h += `<div class="reframe"><div class="eyebrow">Cognitive reframing</div><p class="q">${esc(q)}</p>
      ${why ? `<p><b>My why:</b> ${esc(why)}</p>` : '<p class="small muted">Add your personal "why" in Settings and it shows up here.</p>'}
      ${woops.length ? `<p class="small"><b>Wishes:</b> ${woops.map(w => esc(w.wish)).join(' · ')}</p>` : ''}
      <p class="small muted">Ask a chatbot: <span class="kbd" id="aiprompt">What are the real-life implications of ${esc(subj)}, and how can I apply it?</span></p>
      <div class="row"><button class="btn sm" data-act="copyAi">Copy question</button><button class="btn sm" data-act="reframe">Another prompt</button></div></div>`;
  }
  if (next) h += `<button class="linkrow" data-act="focusTask" data-k="${k}" data-id="${next.id}"><span class="t"><span class="eyebrow">Next up</span><b>${esc(next.what || 'Untitled')}</b><span class="small muted">${esc([next.when, next.qty != null ? next.qty + ' ' + (next.unit || '') : ''].filter(Boolean).join(' · '))}</span></span>${kindOf(next) ? `<span class="tag ${kindOf(next)}">${kindOf(next)}</span>` : ''}</button>`;

  h += `<div class="card"><h2>Work on</h2>
     <select data-act-change="pickFocusTask" style="margin-top:10px" aria-label="Task to focus on"><option value="">No specific task</option>${ts.map(t => `<option value="${t.id}" ${T.taskId === t.id ? 'selected' : ''}>${esc(t.what || 'Untitled')}</option>`).join('')}</select>
     <div class="row" style="margin-top:10px">
       <button class="btn sm" data-act="tStarter" data-m="${tm.starterG0}">Grade 0 · ${tm.starterG0} min</button>
       <button class="btn sm" data-act="tStarter" data-m="${tm.starterG1}">Grade 1 · ${tm.starterG1} min</button>
     </div><p class="small muted">Can't start? Do the tiny version. No pressure to do more.</p></div>`;
  const workMin = today.filter(s => s.type !== 'break').reduce((a, s) => a + s.m, 0);
  h += `<div class="card"><div class="row between"><h2>Today</h2><span class="pixel">${workMin} min</span></div>
    <p class="small muted" style="margin:6px 0 0">${today.length} block${today.length === 1 ? '' : 's'}${today.length ? ': ' + today.slice(-8).map(s => `${s.m}m${s.task ? ' ' + esc(s.task) : ''}`).join(' · ') : ''}</p>
    <div class="grid g4" style="margin-top:12px">
      <label class="f"><span>Work</span>${inp('set|timer.work', tm.work, 'type="number" min="1"')}</label>
      <label class="f"><span>Break</span>${inp('set|timer.brk', tm.brk, 'type="number" min="1"')}</label>
      <label class="f"><span>Long every</span>${inp('set|timer.longEvery', tm.longEvery, 'type="number" min="0" title="0 = never"')}</label>
      <label class="f"><span>Long break</span>${inp('set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}</label>
    </div></div>`;
  return h;
};

/* ---------- WOOP ---------- */
V.woop = () => {
  let h = `<div class="dayhead"><div><div class="eyebrow">Clarity creates execution</div><h1 class="title">WOOP</h1></div></div>
    <p class="muted small">Wish, Outcome, Obstacle, Plan. Picture the obstacle and decide now what you'll do when it shows up.</p>
    <button class="btn primary" data-act="addWoop">${px('plus', 9)} New WOOP</button>`;
  if (!S.woops.length) h += `<div class="empty">No WOOPs yet.<br><span class="small">Example: read 10 chapters · pass the exam · I start gaming · if I feel the urge, the controller goes in another room and I read 1 page.</span></div>`;
  const steps = [['wish', 'Wish', 'What do I really want?', 'Read 10 chapters this month'], ['outcome', 'Outcome', 'What would it look like?', 'I pass the exam with room to spare'], ['obstacle', 'Obstacle', 'What inside me gets in the way?', 'I start gaming instead of studying'], ['plan', 'Plan', 'If the obstacle shows up, then I will…', 'put the controller in another room and read 1 page']];
  S.woops.slice().reverse().forEach(w => {
    const p = `woop|${w.id}|`;
    h += `<div class="card ${w.active ? 'ink' : ''}"><div class="woop-steps">${steps.map(([f, t, q, ph], i) => `<div class="wstep ${w[f] ? 'filled' : ''}"><span class="n">${i + 1}</span><div style="min-width:0"><h3>${t}</h3><div class="q">${q}</div>
        ${f === 'plan' ? `<textarea data-bind="${p}plan" placeholder="${esc(ph)}" aria-label="${t}">${esc(w.plan)}</textarea>` : inp(p + f, w[f], `placeholder="${esc(ph)}" aria-label="${t}"`)}</div></div>`).join('')}</div>
      <div class="row" style="margin-top:14px">
        <label class="row small"><input type="checkbox" data-bind="${p}active" data-rr ${w.active ? 'checked' : ''}> Active</label>
        <button class="btn sm" data-act="visualize" data-id="${w.id}">Visualize</button>
        <button class="btn sm" data-act="woopTask" data-id="${w.id}">Make tomorrow's task</button>
        <span style="flex:1"></span><button class="btn sm danger" data-act="delWoop" data-id="${w.id}">Delete</button></div></div>`;
  });
  return h;
};

/* ---------- Company manual ---------- */
V.manual = () => {
  const st = S.settings, t = todayKey(), active = S.rules.filter(r => r.active), ids = active.map(r => r.id);
  const c7 = compliance(rangeKeys(t, 7), ids), c30 = compliance(rangeKeys(t, 30), ids), ct = compliance([t], ids);
  const reg = regression();
  let h = `<div class="eyebrow">Treat yourself as a company</div><h1 class="title">Company <u>Manual</u></h1>
    <p class="muted">Detect the problem → find an evidence-based solution → convert it into a rule → apply it daily. Expect violations; reduce them.</p>`;
  h += `<div class="card"><div class="stats">
    <div class="stat"><div class="v">${pct(ct)}</div><div class="k">Today</div></div>
    <div class="stat"><div class="v">${pct(c7)}</div><div class="k">7 days</div></div>
    <div class="stat"><div class="v">${pct(c30)}</div><div class="k">30 days</div></div>
    <div class="stat"><div class="v">${st.complianceTarget}%</div><div class="k">Target</div></div></div>
    <div class="meter" style="margin-top:14px" title="7-day compliance vs target"><i style="width:${Math.min(100, c7 || 0)}%;background:${c7 != null && c7 >= st.complianceTarget ? 'var(--good)' : 'var(--accent)'}"></i><em style="left:${st.complianceTarget}%"></em></div>
    ${reg && reg.msg ? `<div class="hint ${reg.level}" style="margin-top:12px">${esc(reg.msg)}</div>` : ''}
    ${reg && reg.flagged.length ? `<div class="small" style="margin-top:8px"><b>Rules slipping:</b> ${reg.flagged.map(r => esc(r.title)).join(', ')}</div>` : ''}
  </div>`;
  // grid
  if (active.length) {
    const days = rangeKeys(t, 14);
    h += sec('cgrid', 'Last 14 days', `<div class="gridwrap"><table class="cgrid"><tr><th></th>${days.map(k => `<th title="${k}">${DOW[weekday(k)][0]}<br>${parseKey(k).getDate()}</th>`).join('')}<th>14d</th></tr>
      ${active.map(r => `<tr><th class="rn" title="${esc(r.title)}">${esc(r.title || 'Untitled')}</th>${days.map(k => { const v = S.days[k]?.rules[r.id]; return `<td><button class="${v === true ? 'y' : v === false ? 'n' : ''}" data-act="ruleCycle" data-k="${k}" data-id="${r.id}" aria-label="${r.title} ${k}">${v === true ? '✓' : v === false ? '✗' : ''}</button></td>`; }).join('')}<td class="pc">${pct(compliance(days, [r.id]))}</td></tr>`).join('')}
      </table></div><p class="small muted">Tap a cell: blank → followed → broken.</p>`);
  }
  h += `<div class="row" style="margin:14px 0"><button class="btn primary" data-act="addRule">+ New policy</button></div>`;
  if (!S.rules.length) h += `<div class="empty">No policies yet.<br><span class="small">Example: Problem: sleeping late → Solution: phone out of the bedroom at 10:30 → Rule: lights out by 11:00 PM.<br>Or: Working hours 8:00 AM–5:00 PM with 30–40 min breaks between tasks.</span></div>`;
  S.rules.forEach(r => {
    const p = `rule|${r.id}|`;
    h += `<div class="card ${r.active ? 'ink' : ''}">
      <label class="f"><span>Rule / policy</span>${inp(p + 'title', r.title, 'placeholder="Lights out by 11:00 PM" style="font-weight:700"')}</label>
      <div class="grid g2" style="margin-top:8px">
        <label class="f"><span>1 · Problem detected</span><textarea data-bind="${p}problem" placeholder="Behaviour pattern that hurts my goals, with evidence">${esc(r.problem)}</textarea></label>
        <label class="f"><span>2 · Evidence-based solution</span><textarea data-bind="${p}solution" placeholder="What works long-term, and why">${esc(r.solution)}</textarea></label>
      </div>
      <label class="f" style="margin-top:8px"><span>Details (shown at check-in)</span>${inp(p + 'detail', r.detail, 'placeholder="Phone charges in the kitchen"')}</label>
      <div class="row" style="margin-top:10px"><label class="row small"><input type="checkbox" data-bind="${p}active" data-rr ${r.active ? 'checked' : ''}> Active</label>
        <span class="small muted">30-day compliance: <b>${pct(compliance(rangeKeys(t, 30), [r.id]))}</b></span><span style="flex:1"></span>
        <button class="icon-btn" data-act="mvRule" data-dir="-1" data-id="${r.id}">↑</button><button class="icon-btn" data-act="mvRule" data-dir="1" data-id="${r.id}">↓</button>
        <button class="btn sm danger" data-act="delRule" data-id="${r.id}">Delete</button></div></div>`;
  });
  return h;
};

/* ---------- Insights ---------- */
V.insights = () => {
  const st = S.settings, t = todayKey(), n = S.ui.range || 14, keys = rangeKeys(t, n);
  const withTasks = keys.filter(k => activeTasks(k).length);
  const all = withTasks.flatMap(k => activeTasks(k));
  const comp = avg(withTasks.map(dayCompletion));
  const pds = all.filter(x => x.pd).map(x => x.pd), ads = all.filter(x => x.ad).map(x => x.ad);
  const calib = avg(all.filter(x => x.pd && x.ad).map(x => Math.abs(x.ad - x.pd)));
  const sk = streak();
  const ids = S.rules.filter(r => r.active).map(r => r.id);
  const focus = S.sessions.filter(s => s.d >= keys[0] && s.type !== 'break').reduce((a, s) => a + s.m, 0);
  let h = `<div class="eyebrow">Track · reflect · adjust</div><h1 class="title"><u>Insights</u></h1>
    <div class="seg" style="margin:10px 0">${[7, 14, 30, 90].map(r => `<button class="${n === r ? 'on' : ''}" data-act="range" data-v="${r}">${r}<span class="u"> days</span></button>`).join('')}</div>`;
  h += `<div class="card"><div class="stats">
    <div class="stat"><div class="v">${pct(comp)}</div><div class="k">Completion</div></div>
    <div class="stat"><div class="v">${fmt1(avg(ads))}</div><div class="k">Avg actual diff.</div></div>
    <div class="stat"><div class="v">${sk.n}</div><div class="k">Streak${sk.graceUsed ? ` (${sk.graceUsed} grace)` : ''}</div></div>
    <div class="stat"><div class="v">${pct(compliance(keys, ids))}</div><div class="k">Rule compliance</div></div>
    <div class="stat"><div class="v">${withTasks.length}/${n}</div><div class="k">Days planned</div></div>
    <div class="stat"><div class="v">${fmt1(avg(pds))}</div><div class="k">Avg predicted</div></div>
    <div class="stat"><div class="v">${fmt1(calib)}</div><div class="k">PD vs AD gap</div></div>
    <div class="stat"><div class="v">${Math.round(focus / 6) / 10}h</div><div class="k">Focused</div></div></div></div>`;
  h += `<div class="card chart"><h2>Daily completion & actual difficulty</h2>${chart(keys)}
    <div class="legend"><span><i style="background:var(--accent)"></i>Completion %</span><span><i style="background:var(--ink)"></i>Avg AD</span><span><i style="background:transparent;border:1.5px dashed var(--muted)"></i>Target ${st.targetDifficulty}/10</span></div></div>`;

  const rec = recurringTasks(addDays(t, 1), n);
  h += sec('trends', 'Task trends (7/10 system)', rec.length ? `<div class="tablewrap"><table class="data"><tr><th>Task</th><th>Times</th><th>Avg PD</th><th>Avg AD</th><th>Last amount</th><th>Next</th></tr>
    ${rec.map(({ t: x, s }) => { const hs = taskHistory().filter(y => normName(y.t.what) === normName(x.what) && y.k >= keys[0]); return `<tr><td><b>${esc(x.what)}</b></td><td>${hs.length}</td><td>${fmt1(avg(hs.map(y => y.t.pd).filter(Boolean)))}</td><td>${fmt1(avg(hs.map(y => y.t.ad).filter(Boolean)))}</td><td>${x.qty != null ? esc(x.qty + ' ' + (x.unit || '')) : '–'}</td><td class="small">${s ? (s.action === 'up' ? '↑ ' : s.action === 'down' ? '↓ ' : '= ') + (s.qty != null ? esc(s.qty + ' ' + (s.unit || '')) : ({ up: 'harder', down: 'easier', keep: 'same' })[s.action]) : '–'}</td></tr>`; }).join('')}
    </table></div>` : '<div class="empty">Repeat tasks with the same name to see trends.</div>');

  h += sec('impact', 'What affects your performance', factorImpact(keys));
  h += sec('history', 'Journal history', journalHistory(keys) + '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="goHistory">See every day in History</button></div>');
  return h;
};

function chart(keys) {
  const W = 640, H = 200, L = 30, R = 30, B = 24, Tp = 10, iw = W - L - R, ih = H - Tp - B;
  const bw = iw / keys.length, tg = S.settings.targetDifficulty;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Completion and difficulty chart">`;
  [0, 50, 100].forEach(v => { const y = Tp + ih - ih * v / 100; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L - 6}" y="${y + 4}" font-size="10" text-anchor="end" fill="var(--muted)">${v}</text>`; });
  [0, 5, 10].forEach(v => { const y = Tp + ih - ih * v / 10; s += `<text x="${W - R + 6}" y="${y + 4}" font-size="10" fill="var(--muted)">${v}</text>`; });
  const ty = Tp + ih - ih * tg / 10;
  s += `<line x1="${L}" x2="${W - R}" y1="${ty}" y2="${ty}" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  const pts = [];
  keys.forEach((k, i) => {
    const c = dayCompletion(k), x = L + i * bw, st = dayStatus(k);
    if (c != null) { const bh = Math.max(2, ih * c / 100); s += `<rect x="${x + bw * 0.18}" y="${Tp + ih - bh}" width="${bw * 0.64}" height="${bh}" fill="var(--accent)"><title>${k}: ${Math.round(c)}%</title></rect>`; }
    else if (st === 'rest' || st === 'grace') s += `<text x="${x + bw / 2}" y="${Tp + ih - 4}" font-size="9" text-anchor="middle" fill="var(--muted)">${st === 'rest' ? 'R' : 'G'}</text>`;
    const a = dayAvg(k, 'ad'); if (a != null) pts.push([x + bw / 2, Tp + ih - ih * a / 10]);
    const step = Math.ceil(keys.length / 10);
    if (i % step === 0) s += `<text x="${x + bw / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${parseKey(k).getDate()}</text>`;
  });
  if (pts.length > 1) s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2" shape-rendering="geometricPrecision"/>`;
  pts.forEach(p => { s += `<rect x="${p[0] - 3}" y="${p[1] - 3}" width="6" height="6" fill="var(--ink)"/>`; });
  return s + '</svg>';
}

function factorImpact(keys) {
  const rows = S.settings.factors.filter(f => f.type !== 'text').map(f => {
    const pts = keys.map(k => { const d = S.days[k]; if (!d || !activeTasks(k).length) return null; const v = d.factors[f.id]; if (v == null || v === '') return null; return { v, c: dayCompletion(k), a: dayAvg(k, 'ad') }; }).filter(Boolean);
    if (pts.length < 4) return `<tr><td><b>${esc(f.name)}</b></td><td colspan="3" class="muted">${pts.length} day${pts.length === 1 ? '' : 's'} logged. Need 4+.</td></tr>`;
    let A, B, la, lb;
    if (f.type === 'yesno') { A = pts.filter(p => p.v === true); B = pts.filter(p => p.v === false); la = 'Yes'; lb = 'No'; }
    else { const vs = pts.map(p => +p.v).sort((a, b) => a - b), med = vs[Math.floor(vs.length / 2)]; A = pts.filter(p => +p.v >= med); B = pts.filter(p => +p.v < med); la = `≥ ${med}`; lb = `< ${med}`; if (!B.length) { B = pts.filter(p => +p.v <= vs[0]); A = pts.filter(p => +p.v > vs[0]); la = `> ${vs[0]}`; lb = `${vs[0]}`; } }
    const ca = avg(A.map(p => p.c)), cb = avg(B.map(p => p.c));
    const diff = ca != null && cb != null ? ca - cb : null;
    const strong = diff != null && Math.abs(diff) >= 15;
    return `<tr><td><b>${esc(f.name)}</b>${f.unit ? ` <span class="muted small">(${esc(f.unit)})</span>` : ''}</td><td>${la}: <b>${pct(ca)}</b> <span class="muted small">(${A.length}d)</span></td><td>${lb}: <b>${pct(cb)}</b> <span class="muted small">(${B.length}d)</span></td><td>${strong ? `<span class="tag ${diff > 0 ? 'easy' : 'hard'}">${diff > 0 ? '+' : ''}${Math.round(diff)} pts</span>` : '<span class="muted small">no clear link</span>'}</td></tr>`;
  });
  if (!rows.length) return '<div class="empty">No factors configured.</div>';
  return `<p class="small muted" style="margin-top:0">Completion rate on days when each factor was high vs low. Patterns, not proof, but better than blaming discipline.</p><div class="tablewrap"><table class="data"><tr><th>Factor</th><th>High</th><th>Low</th><th>Effect</th></tr>${rows.join('')}</table></div>`;
}

function journalHistory(keys) {
  const ks = keys.slice().reverse().filter(k => { const d = S.days[k]; return d && (Object.values(d.journal).some(Boolean) || d.note); });
  if (!ks.length) return '<div class="empty">No journal entries in this range.</div>';
  return ks.map(k => { const d = S.days[k]; return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="eyebrow"><a href="#attack" data-act="openDay" data-k="${k}">${esc(niceDate(k))}</a> · ${pct(dayCompletion(k))} done</div>
    ${Object.entries(d.journal).filter(([, v]) => v).map(([q, v]) => `<div class="small" style="margin-top:6px"><b>${esc(q)}</b><br>${esc(v).replace(/\n/g, '<br>')}</div>`).join('')}${d.note ? `<div class="small" style="margin-top:6px">${esc(d.note).replace(/\n/g, '<br>')}</div>` : ''}</div>`; }).join('');
}

/* ---------- History ---------- */
function hasContent(k) { const d = S.days[k]; return !!d && (d.tasks.length || d.note || Object.values(d.journal).some(Boolean) || Object.keys(d.factors).length || Object.keys(d.rules).length); }
function hasNotes(k) { const d = S.days[k]; return !!d && (!!d.note || Object.values(d.journal).some(Boolean) || d.tasks.some(t => t.notes)); }
function dayText(k) {
  const d = S.days[k];
  return normName([niceDate(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), d.note, ...Object.entries(d.journal).flat(), ...d.tasks.flatMap(t => [t.what, t.detail, t.where, t.unit, t.notes])].filter(Boolean).join(' '));
}
function factorLine(d) {
  return S.settings.factors.filter(f => d.factors[f.id] != null && d.factors[f.id] !== '').map(f => {
    const v = d.factors[f.id];
    return `${esc(f.name)} ${f.type === 'yesno' ? (v ? 'yes' : 'no') : f.type === 'scale' ? esc(v) + '/' + (f.max || 5) : esc(v) + (f.unit ? esc(f.unit) : '')}`;
  }).join(' · ');
}
function historyDay(k) {
  const d = S.days[k], ts = d.tasks, comp = dayCompletion(k), st = dayStatus(k);
  const rv = Object.values(d.rules), fl = factorLine(d);
  const journal = Object.entries(d.journal).filter(([, v]) => v);
  return `<div class="card hday">
    <div class="row between"><a href="#attack" class="h2" data-act="openDay" data-k="${k}">${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</a>
      <span class="small muted">${comp != null ? pct(comp) + ' done' : ''}${st !== 'normal' ? ` · ${st} day` : ''}</span></div>
    ${ts.length ? `<ul class="hlist">${ts.map(t => `<li class="${t.done ? 'ok' : ''}"><span class="mark">${t.done ? '■' : '□'}</span><div style="min-width:0"><span>${esc(t.what || 'Untitled')}</span>
      <span class="muted small">${esc([t.qty != null ? t.qty + ' ' + (t.unit || '') : '', t.pd ? `PD ${t.pd}${t.ad ? ' > AD ' + t.ad : ''}` : '', t.movedTo ? 'moved' : ''].filter(Boolean).join(' · '))}</span>
      ${t.notes ? `<div class="small note">${esc(t.notes).replace(/\n/g, '<br>')}</div>` : ''}</div></li>`).join('')}</ul>` : ''}
    ${fl || rv.length ? `<div class="small muted" style="margin-top:8px">${fl}${fl && rv.length ? ' · ' : ''}${rv.length ? `Rules ${rv.filter(Boolean).length}/${rv.length} followed` : ''}</div>` : ''}
    ${journal.map(([q, v]) => `<div class="hq"><b>${esc(q)}</b>${esc(v).replace(/\n/g, '<br>')}</div>`).join('')}
    ${d.note ? `<div class="hq"><b>Notes</b>${esc(d.note).replace(/\n/g, '<br>')}</div>` : ''}
  </div>`;
}
function historyList() {
  const q = normName(S.ui.hq || ''), f = S.ui.hf || 'all', limit = S.ui.hlimit || 30;
  let keys = Object.keys(S.days).filter(hasContent).sort().reverse();
  if (f === 'notes') keys = keys.filter(hasNotes);
  if (q) keys = keys.filter(k => dayText(k).includes(q));
  histCount = keys.length;
  const mo = isMono();
  if (!keys.length) return `<div class="empty">${q ? 'Nothing matches that search.' : 'No days recorded yet. Everything you write on Today shows up here.'}</div>`;
  let h = '', month = '';
  keys.slice(0, limit).forEach(k => {
    const m = parseKey(k).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; h += mo ? `<div class="mo-h"><span>${esc(m)}</span></div>` : `<div class="eyebrow" style="margin:20px 0 -4px">${esc(m)}</div>`; }
    h += mo ? moHistoryDay(k) : historyDay(k);
  });
  if (keys.length > limit) h += `<button class="btn block" data-act="hMore">Show older days (${keys.length - limit} more)</button>`;
  return mo ? h : `<div class="small muted">${keys.length} day${keys.length === 1 ? '' : 's'}</div>` + h;
}
V.history = () => {
  const f = S.ui.hf || 'all';
  return `<div class="dayhead"><div><div class="eyebrow">Everything you've written</div><h1 class="title">History</h1></div></div>
    <p class="muted small">Every day is kept on this device: tasks, ratings, notes, journal, factors and rule check-ins. Tap a date to open and edit that day.</p>
    <div class="row" style="margin:12px 0"><input type="search" id="hsearch" placeholder="Search tasks, notes, journal" value="${esc(S.ui.hq || '')}" aria-label="Search history" style="flex:1;min-width:180px">
      <div class="seg">${[['all', 'All days'], ['notes', 'With notes']].map(([v, l]) => `<button class="${f === v ? 'on' : ''}" data-act="hFilter" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div id="hlist">${historyList()}</div>`;
};

/* ---------- Settings ---------- */
function listEditor(path, title, hint) {
  const arr = getPath(S.settings, path);
  return `<p class="small muted" style="margin-top:0">${hint}</p>` + arr.map((v, i) => `<div class="le-row">${inp(`list|${path}|${i}`, v, `aria-label="${esc(title)} ${i + 1}"`)}
    <button class="icon-btn" data-act="leMove" data-path="${path}" data-i="${i}" data-dir="-1">↑</button><button class="icon-btn" data-act="leMove" data-path="${path}" data-i="${i}" data-dir="1">↓</button><button class="icon-btn" data-act="leDel" data-path="${path}" data-i="${i}" aria-label="Remove">✕</button></div>`).join('')
    + `<button class="btn sm" data-act="leAdd" data-path="${path}">+ Add</button>`;
}
const field = (label, bind, val, attrs = '') => `<label class="f"><span>${label}</span>${inp(bind, val, attrs)}</label>`;
const check = (label, bind, val) => `<label class="row small"><input type="checkbox" data-bind="${bind}" data-rr ${val ? 'checked' : ''}> ${label}</label>`;

V.settings = () => {
  const st = S.settings, tm = st.timer, mo = st.style === 'mono', P = {};
  let h = mo ? '' : `<div class="eyebrow">Everything is yours to change</div><h1 class="title"><u>Settings</u></h1>`;
  P['s-style'] = sec('s-style', 'Style', `<div class="stylepick">${STYLES.map(s => `<button class="${styleId() === s.id ? 'on' : ''}" data-act="setStyle" data-v="${s.id}" aria-pressed="${styleId() === s.id}"><span class="sw">${s.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><span><b>${s.name}</b><br><span>${s.note}</span></span></button>`).join('')}</div>
    <p class="small muted">Only the look changes. All your data and features stay the same. Light/dark still follows the Theme setting below.${st.style === 'bw' ? ' Pixel B&W ignores the accent colour.' : ''}</p>`);
  P['s-general'] = sec('s-general', 'General', `<div class="grid g2">
      ${field('App name', 'set|appName', st.appName)}
      <label class="f"${st.style === 'paperbox' || mo ? ' for="pb-none"' : ''}><span>Theme</span>${st.style === 'paperbox' || mo ? `<div class="seg">${['auto', 'light', 'dark'].map(v => `<button type="button" class="${st.theme === v ? 'on' : ''}" data-act="pbTheme" data-v="${v}">${v}</button>`).join('')}</div>` : `<select data-bind="set|theme" data-rr>${['auto', 'light', 'dark'].map(v => `<option ${st.theme === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`}</label>
      ${mo ? '<label class="f mo-off"><span>Accent colour</span><input value="Fixed in B&amp;W" disabled aria-disabled="true"></label>' : `<label class="f"><span>Accent colour</span><div class="row"><input type="color" data-bind="set|accent" value="${esc(st.accent)}"> <button class="btn sm ghost" data-act="resetAccent">Reset</button></div></label>`}
      ${field('Text size %', 'set|fontScale', st.fontScale, 'type="number" min="80" max="140" step="5"')}
      <label class="f"><span>Week starts on</span><select data-bind="set|weekStart" data-num data-rr>${DOW.map((d, i) => `<option value="${i}" ${+st.weekStart === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
    </div>
    <label class="f mo-why" style="margin-top:10px"><span>${mo ? 'My why' : 'My why (shown when reframing)'}</span><textarea data-bind="set|myWhy" placeholder="Who or what you are doing this for">${esc(st.myWhy)}</textarea></label>
    <div class="stack" style="margin-top:10px">${mo ? '' : check('Show a principle on the Today page', 'set|showPrinciple', st.showPrinciple)}${check('Show rules check-in on Today', 'set|showRulesOnToday', st.showRulesOnToday)}${check('Show factors on Today', 'set|showFactorsOnToday', st.showFactorsOnToday)}${check('Show feedback journal on Today', 'set|showJournalOnToday', st.showJournalOnToday)}${check('Show the loading screen', 'set|showSplash', st.showSplash)}</div>`);
  P['s-710'] = sec('s-710', '7/10 system & daily plan', `<div class="grid g3">
      ${field(mo ? 'Target difficulty' : 'Target difficulty (/10)', 'set|targetDifficulty', st.targetDifficulty, 'type="number" min="1" max="10"')}
      ${field('Hard tasks per day', 'set|hardTasksTarget', st.hardTasksTarget, 'type="number" min="0" max="10"')}
      ${field('Max tasks per day', 'set|maxTasks', st.maxTasks, 'type="number" min="1" max="30"')}
      ${field('"Easy" is PD ≤', 'set|easyMax', st.easyMax, 'type="number" min="1" max="9"')}
      ${field(mo ? 'Tolerance' : 'Tolerance (± around target)', 'set|tolerance', st.tolerance, 'type="number" min="0" max="4" step="0.5"')}
      ${field('Overload step %', 'set|overloadStep', st.overloadStep, 'type="number" min="5" max="100" step="5"')}
      ${field(mo ? 'Look back' : 'Look back (attempts)', 'set|lookback', st.lookback, 'type="number" min="1" max="10"')}
      ${field('Plan-tomorrow reminder hour', 'set|planReminderHour', st.planReminderHour, 'type="number" min="0" max="23"')}
      ${field('Day "won" at completion %', 'set|winThreshold', st.winThreshold, 'type="number" min="1" max="100"')}
    </div>`);
  P['s-labels'] = sec('s-labels', 'Task field labels', `<div class="grid g2">
      ${field('"What" label', 'set|labels.what', st.labels.what)}${field('"How much" label', 'set|labels.howMuch', st.labels.howMuch)}
      ${field('"When" label', 'set|labels.when', st.labels.when)}${field('"Where" label', 'set|labels.where', st.labels.where)}
      ${field('Task placeholder', 'set|placeholders.what', st.placeholders.what)}${field('Unit placeholder', 'set|placeholders.unit', st.placeholders.unit)}
      ${field('Detail placeholder', 'set|placeholders.detail', st.placeholders.detail)}${field('Where placeholder', 'set|placeholders.where', st.placeholders.where)}</div>`);
  P['s-flex'] = sec('s-flex', 'Flexible system', `<div class="grid g2">${field('Grace days per week', 'set|graceDaysPerWeek', st.graceDaysPerWeek, 'type="number" min="0" max="7"')}</div>
      <div class="lbl mo-rl" style="margin-top:12px">Rest days</div><div class="pills" style="margin-top:6px">${DOW.map((d, i) => `<button class="${st.restDays.includes(i) ? 'on' : ''}" data-act="toggleRest" data-v="${i}">${d}</button>`).join('')}</div>
      <p class="small muted">Missed days within your weekly grace allowance don't break the streak. Rest days never do.</p>`);
  P['s-timer'] = sec('s-timer', 'Focus timer', `<div class="grid g3">
      ${field('Work min', 'set|timer.work', tm.work, 'type="number" min="1"')}${field('Break min', 'set|timer.brk', tm.brk, 'type="number" min="1"')}
      ${field(mo ? 'Long break every' : 'Long break every N blocks (0 = off)', 'set|timer.longEvery', tm.longEvery, 'type="number" min="0"')}${field('Long break min', 'set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}
      ${field('Grade 0 starter min', 'set|timer.starterG0', tm.starterG0, 'type="number" min="1"')}${field('Grade 1 starter min', 'set|timer.starterG1', tm.starterG1, 'type="number" min="1"')}</div>
      ${mo ? sec('s-msgs', 'Message during work · Message during break', field('Message during work', 'set|timer.workMsg', tm.workMsg) + field('Message during break', 'set|timer.breakMsg', tm.breakMsg), '<span class="cnt">2</span>') : field('Message during work', 'set|timer.workMsg', tm.workMsg) + field('Message during break', 'set|timer.breakMsg', tm.breakMsg)}
      <div class="stack" style="margin-top:10px">${check(mo ? 'Auto-start' : 'Auto-start the next block', 'set|timer.autoStart', tm.autoStart)}${check('Sound + vibration', 'set|timer.sound', tm.sound)}
      ${NATIVE ? '' : `<label class="row small"><input type="checkbox" data-act-change="toggleNotify" ${tm.notify ? 'checked' : ''}> ${mo ? 'Notifications' : 'Notifications when a block ends'}</label>`}</div>`);
  P['s-factors'] = sec('s-factors', 'Factors to track', `<p class="small muted" style="margin-top:0">Sleep, diet, activity, meal size, exhaustion, noise, or anything else you suspect affects you.</p>` +
    st.factors.map(f => `<div class="fdef">${inp(`fdef|${f.id}|name`, f.name, 'aria-label="Factor name"')}
      <select data-bind="fdef|${f.id}|type" data-rr aria-label="Type">${[['scale', 'Scale'], ['number', 'Number'], ['yesno', 'Yes / No'], ['text', 'Text']].map(([v, l]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${f.type === 'scale' ? inp(`fdef|${f.id}|min`, f.min, 'type="number" aria-label="Min" title="Min"') + inp(`fdef|${f.id}|max`, f.max, 'type="number" aria-label="Max" title="Max"') : '<span></span><span></span>'}
      ${f.type === 'number' ? inp(`fdef|${f.id}|unit`, f.unit, 'placeholder="unit" aria-label="Unit"') : '<span></span>'}
      <span><button class="icon-btn" data-act="fMove" data-id="${f.id}" data-dir="-1">↑</button><button class="icon-btn" data-act="fMove" data-id="${f.id}" data-dir="1">↓</button><button class="icon-btn" data-act="fDel" data-id="${f.id}">✕</button></span></div>`).join('')
    + `<button class="btn sm" data-act="fAdd">+ Add factor</button>`);
  P['s-journal'] = sec('s-journal', 'Journal prompts', listEditor('journalPrompts', 'Prompt', 'Questions for your daily feedback journal (metacognition).'));
  P['s-reframe'] = sec('s-reframe', 'Reframing prompts', listEditor('reframePrompts', 'Prompt', 'Shown when your mind wanders during a focus block.'));
  P['s-loading'] = sec('s-loading', 'Loading screen lines', listEditor('loadingLines', 'Line', 'One is picked at random each time the app opens.'));
  P['s-principles'] = sec('s-principles', 'Principles', listEditor('principles', 'Principle', 'One rotates onto the Today page each day.'));
  P['s-manual'] = sec('s-manual', 'Company manual', `<div class="grid g2">${field('Compliance target %', 'set|complianceTarget', st.complianceTarget, 'type="number" min="1" max="100"')}${field(mo ? 'Regression alert' : 'Regression alert: weekly drop of (pts)', 'set|regressionDrop', st.regressionDrop, 'type="number" min="1" max="100"')}</div>
      <div style="margin-top:10px">${check('Skip rule tracking on rest days', 'set|restSkipsRules', st.restSkipsRules)}</div>`);
  P['s-tabs'] = sec('s-tabs', mo ? 'Navigation · show/hide, rename, reorder' : 'Navigation', st.tabs.map((t, i) => `<div class="le-row">${t.id === 'settings' ? '<span style="width:18px"></span>' : `<input type="checkbox" data-bind="tab|${t.id}|visible" data-rr ${t.visible ? 'checked' : ''} aria-label="Show ${esc(t.label)}">`}
      ${inp(`tab|${t.id}|label`, t.label)}<button class="icon-btn" data-act="tabMove" data-i="${i}" data-dir="-1">↑</button><button class="icon-btn" data-act="tabMove" data-i="${i}" data-dir="1">↓</button></div>`).join(''));
  P['s-data'] = sec('s-data', 'Data & backup', `<p class="small muted" style="margin-top:0">Your data is stored only in this browser on this device. Export a backup regularly, and use it to move data between phone and laptop.</p>
      <div class="row"><button class="btn primary" data-act="export">${mo ? px('dl', 14) : ''}Export backup (.json)</button><button class="btn" data-act="import">${mo ? px('ul', 14) : ''}Import backup file</button><button class="btn" data-act="pasteBackup">${mo ? px('paste', 14) : ''}Paste backup</button>${NATIVE ? '' : '<button class="btn" data-act="csv">' + (mo ? px('dl', 14) : '') + 'Export tasks (.csv)</button>'}</div>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-act="resetSettings">Reset settings to defaults</button><button class="btn sm danger" data-act="wipe">${mo ? px('x', 14) : ''}Erase all data</button></div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      ${NATIVE ? '' : '<p class="small muted">Install: on iPhone open the share menu → Add to Home Screen. On Android/Chrome/Edge use the Install option in the browser menu.</p>'}`);
  // B&W: open sections first, long lists folded together, and no Principles / Loading screen lines (they only feed removed elements)
  const order = mo ? ['s-style', 's-general', 's-710', 'mo-pair', 's-tabs', 's-flex', 's-timer', 's-manual', 's-data']
    : ['s-style', 's-general', 's-710', 's-labels', 's-flex', 's-timer', 's-factors', 's-journal', 's-reframe', 's-loading', 's-principles', 's-manual', 's-tabs', 's-data'];
  P['mo-pair'] = `<div class="mo-pair">${P['s-labels']}${P['s-factors']}${P['s-journal']}${P['s-reframe']}</div>`;
  // Simple styles: only the everyday sections until you ask for the rest
  if (simple() && !allSettings) return h + SIMPLE_SET.map(id => P[id]).join('') + `<button class="btn ${mo ? 'grey' : 'pill'} block" data-act="allSettings">${px('plus', 14)}Show all settings</button>`;
  return h + order.map(id => P[id]).join('');
};

/* ---------- path helpers ---------- */
function getPath(o, p) { return p.split('.').reduce((a, k) => a?.[k], o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }

/* Per-layout view overrides: LV[layout][view] replaces V[view] when that layout is active. */
const LV = {};

/* ---------- Studio (rail layout): Today as a two-column dashboard ---------- */
LV.rail = {
  attack() {
    const k = todayKey(), s = streak(), ts = activeTasks(k), left = ts.filter(t => !t.done);
    const mins = S.sessions.filter(x => x.d === k && x.type !== 'break').reduce((a, x) => a + x.m, 0);
    const week = Array.from({ length: 7 }, (_, i) => addDays(k, i - 6)).map(d => { const c = dayCompletion(d); return `<i title="${d}" style="--h:${c == null ? 4 : Math.max(6, c)}%"></i>`; }).join('');
    return `<div class="studio"><div class="s-main">${V.attack()}</div><aside class="s-side">
      <div class="card s-focus"><div class="eyebrow">Focus</div><div class="s-big">${S.settings.timer.work}<small> min</small></div>
        <p class="small muted">${left.length ? 'Next: ' + esc(left[0].what || 'Untitled') : 'Everything is done for today.'}</p>
        <button class="btn primary block" data-act="startFocus">${px('play', 11)} Start focus</button></div>
      <div class="card"><div class="eyebrow">This week</div><div class="s-week">${week}</div>
        <div class="row between small"><span class="muted">Streak</span><b>${s.n} day${s.n === 1 ? '' : 's'}</b></div>
        <div class="row between small"><span class="muted">Focused today</span><b>${mins} min</b></div></div>
    </aside></div>`;
  },
};

/* ---------- Terminal (term layout): a status line on top, a command line at the bottom ---------- */
LV.term = {
  attack() {
    const k = todayKey(), ts = activeTasks(k), done = ts.filter(t => t.done).length, s = streak();
    const load = dayAvg(k, 'ad') ?? dayAvg(k, 'pd');
    return `<pre class="tline">aware@mode:~$ status
tasks ${done}/${ts.length} done   load ${fmt1(load)}/10   streak ${s.n}d   ${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</pre>
<pre class="tline muted">${ts.map((t, i) => `${String(i + 1).padStart(2)}  [${t.done ? 'x' : ' '}] ${esc(t.what || 'untitled')}${kindOf(t) ? '  #' + kindOf(t) : ''}`).join('\n') || '    no tasks. try: add Read 20 pages'}</pre>` + V.attack();
  },
};
/* ---------- Timeline layout: Today as one vertical line by hour ---------- */
LV.timeline = {
  attack() {
    const st = S.settings, t = todayKey(), k = S.ui.date || t;
    const d = S.days[k] || { tasks: [] }, ts = activeTasks(k), done = ts.filter(x => x.done).length;
    const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
    const mins = x => { const m = /^(\d{1,2}):(\d{2})/.exec(x.when || ''); return m ? +m[1] * 60 + +m[2] : null; };
    const items = d.tasks.map((x, i) => ({ x, i, m: mins(x) }));
    const anytime = items.filter(o => o.m == null), timed = items.filter(o => o.m != null).sort((a, b) => a.m - b.m);
    let nowPlaced = k !== t, rows = '';
    const node = o => `<li class="tl-item ${o.x.done ? 'is-done' : ''}"><span class="tl-time">${o.m == null ? '' : esc(o.x.when)}</span><span class="tl-dot"></span><div class="tl-body">${taskRow(k, o.x, o.i, 'today')}</div></li>`;
    for (const o of timed) {
      if (!nowPlaced && o.m > nowM) { rows += `<li class="tl-now"><span class="tl-time">${pad(now.getHours())}:${pad(now.getMinutes())}</span><span class="tl-dot"></span><b>Now</b></li>`; nowPlaced = true; }
      rows += node(o);
    }
    if (!nowPlaced) rows += `<li class="tl-now"><span class="tl-time">${pad(now.getHours())}:${pad(now.getMinutes())}</span><span class="tl-dot"></span><b>Now</b></li>`;
    let h = `<div class="tl-head"><div><div class="eyebrow">${esc(niceDate(k, { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1 class="title">${k === t ? 'Your day' : 'That day'}</h1></div>
      <div class="tl-score"><b>${done}</b>/${ts.length}</div></div>
      <div class="datenav no-print"><button class="icon-btn" data-act="shiftDate" data-n="-1" aria-label="Previous day">&lt;</button><input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date"><button class="icon-btn" data-act="shiftDate" data-n="1" aria-label="Next day">&gt;</button>${k !== t ? '<button class="btn sm" data-act="goToday">Today</button>' : ''}<button class="btn sm" data-act="goHistory">History</button></div>
      <div class="tl-bar"><i style="width:${ts.length ? done / ts.length * 100 : 0}%"></i></div>`;
    dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
    if (anytime.length) h += `<div class="eyebrow tl-label">Anytime</div><ul class="timeline tasks">${anytime.map(node).join('')}</ul>`;
    h += `<div class="eyebrow tl-label">By the hour</div><ul class="timeline tasks">${rows}</ul>`;
    if (!d.tasks.length) h += `<p class="muted">Nothing planned yet. Tap + to add a task, and give it a time to place it on the line.</p>`;
    h += `<div class="goal"><span>Next day attack goal</span><b>${st.targetDifficulty}/10</b></div>`;
    if (st.showRulesOnToday) h += sec('rules', 'Manual check-in', rulesCheckin(k), compBadge(k));
    if (st.showFactorsOnToday) h += sec('factors', 'Factors', factorsForm(k));
    if (st.showJournalOnToday) h += sec('journal', 'Feedback journal', journalForm(k));
    h += `<button class="fab no-print" data-act="addTask" data-k="${k}" aria-label="Add task">${px('plus', 20)}</button>`;
    return h + sheetForPrint(k);
  },
};

/* ---------- Deck layout: Today as one big card at a time ---------- */
let deckSkip = 0;
const deckQueue = k => activeTasks(k).filter(t => !t.done);
LV.deck = {
  attack() {
    const st = S.settings, t = todayKey(), k = S.ui.date || t;
    const ts = activeTasks(k), q = deckQueue(k), done = ts.length - q.length;
    if (deckSkip >= q.length) deckSkip = 0;
    const cur = q[deckSkip];
    let h = `<div class="dk-head"><div><div class="eyebrow">${esc(niceDate(k, { weekday: 'long', day: 'numeric', month: 'short' }))}</div><h1 class="title">${k === t ? 'Today' : 'That day'}</h1></div><div class="dk-count"><b>${done}</b>/${ts.length}<span>done</span></div></div>
      <div class="dk-pips">${ts.map(x => `<i class="${x.done ? 'on' : x === cur ? 'cur' : ''}"></i>`).join('')}</div>`;
    if (cur) {
      const amount = cur.qty != null ? `${cur.qty}${cur.unit ? ' ' + cur.unit : ''}` : '';
      const kind = kindOf(cur);
      h += `<div class="dk-card" id="dkcard" data-id="${cur.id}" data-k="${k}">
        <div class="dk-top"><span>${q.length > 1 ? `${deckSkip + 1} of ${q.length} left` : 'Last one'}</span>${kind ? `<span class="tag ${kind}">${kind}</span>` : ''}</div>
        <h2 class="dk-name">${esc(cur.what || 'Untitled task')}</h2>
        <dl class="dk-facts">${amount ? `<div><dt>How much</dt><dd>${esc(amount)}</dd></div>` : ''}${cur.when ? `<div><dt>When</dt><dd>${esc(cur.when)}</dd></div>` : ''}${cur.where ? `<div><dt>Where</dt><dd>${esc(cur.where)}</dd></div>` : ''}${cur.pd ? `<div><dt>Difficulty</dt><dd>${cur.pd}/10</dd></div>` : ''}</dl>
        ${cur.detail ? `<p class="dk-detail">${esc(cur.detail)}</p>` : ''}
        <div class="dk-acts"><button class="btn dk-skip" data-act="deckSkip" ${q.length < 2 ? 'disabled' : ''}>Skip</button><button class="btn primary dk-done" data-act="deckDone" data-k="${k}" data-id="${cur.id}">Done</button></div>
        <div class="dk-more"><button class="btn sm" data-act="focusTask" data-k="${k}" data-id="${cur.id}">${px('play', 10)} Focus on it</button><button class="btn sm ghost" data-act="toggleTask" data-id="${cur.id}">Edit</button></div>
      </div><p class="dk-hint muted small">Swipe right for done, left to skip.</p>`;
      if (openTask.has(cur.id)) h += `<div class="tasks">${taskRow(k, cur, ts.indexOf(cur), 'today')}</div>`;
    } else {
      h += `<div class="dk-card dk-empty"><h2 class="dk-name">${ts.length ? 'All done.' : 'Empty deck.'}</h2><p>${ts.length ? 'Every card is cleared. Plan tomorrow while it is fresh.' : `Add your first task. Aim for ${st.hardTasksTarget} hard ones around ${st.targetDifficulty}/10.`}</p>
        <div class="dk-acts">${ts.length ? '<a class="btn primary" href="#plan" data-nav="plan">Build tomorrow</a>' : `<button class="btn primary" data-act="addTask" data-k="${k}">Add task</button>`}</div></div>`;
    }
    dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
    h += sec('dkall', `All cards (${ts.length})`, taskList(k, 'today', 'No tasks yet.'));
    h += `<div class="goal"><span>Next day attack goal</span><b>${st.targetDifficulty}/10</b></div>`;
    if (st.showRulesOnToday) h += sec('rules', 'Manual check-in', rulesCheckin(k), compBadge(k));
    if (st.showFactorsOnToday) h += sec('factors', 'Factors', factorsForm(k));
    if (st.showJournalOnToday) h += sec('journal', 'Feedback journal', journalForm(k));
    return h + sheetForPrint(k);
  },
};
// swipe on the deck card: right = done, left = skip
let dkX = null;
document.addEventListener('touchstart', e => { dkX = e.target.closest('#dkcard') && !e.target.closest('button,input,a') ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchmove', e => { const c = $('#dkcard'); if (dkX == null || !c) return; const dx = e.touches[0].clientX - dkX; c.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`; }, { passive: true });
document.addEventListener('touchend', e => {
  const c = $('#dkcard'); if (dkX == null || !c) return;
  const dx = e.changedTouches[0].clientX - dkX; dkX = null; c.style.transform = '';
  if (dx > 90) ACT.deckDone(c); else if (dx < -90) ACT.deckSkip();
});

/* ---------- Cyberpunk (cyber layout): HUD screens from the Cyberpunk board ---------- */
const cyLed = c => `<i class="led ${c}"></i>`;
const cyBlocks = (n, tgt) => `<div class="cy-blk">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}${i === tgt - 1 ? ' t' : ''}"></i>`).join('')}</div>`;
function cyMix(ts, max) {
  const c = mix(ts), rest = Math.max(0, (max || ts.length) - c.hard - c.medium - c.easy);
  return `<div class="cy-mix">${'<i class="h"></i>'.repeat(c.hard)}${'<i class="m"></i>'.repeat(c.medium)}${'<i class="e"></i>'.repeat(c.easy)}${rest ? `<i class="x" style="flex:${rest}"></i>` : ''}</div>`;
}
function cyAlerts(list) {
  if (!list.length) return '';
  const led = { accent: 'cy', warn: 'md', bad: 'hd', good: 'ez', '': 'md' };
  return `<div class="cy-alerts">${list.map(([c, m]) => `<div>${cyLed(led[c] || 'md')}<span>${m}</span></div>`).join('')}</div>`;
}
function cyRules(k) {
  const rules = S.rules.filter(r => r.active);
  if (!rules.length) return `<div class="empty">No rules yet. Write your company policies in the <a href="#manual">Manual</a>.</div>`;
  const d = S.days[k] || { rules: {} };
  return rules.map(r => {
    const v = d.rules[r.id];
    return `<div class="rule-row"><div class="t"><b>${esc(r.title || 'Untitled rule')}</b>${r.detail ? `<div class="small muted">${esc(r.detail)}</div>` : ''}</div>
      <div class="seg cy-ck"><button class="yes ${v === true ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="1">${px('check', 14)}Followed</button><button class="no ${v === false ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="0">${px('x', 14)}Broken</button></div></div>`;
  }).join('');
}
function cyCompPill(k) {
  const ids = S.rules.filter(r => r.active).map(r => r.id), d = S.days[k] || { rules: {} };
  const c = compliance([k], ids); if (c == null) return '';
  const yes = ids.filter(id => d.rules[id] === true).length, tot = ids.filter(id => d.rules[id] != null).length;
  return ` <span class="pill cy-comp ${c >= S.settings.complianceTarget ? 'ok' : ''}">${yes}/${tot} · ${pct(c)}</span>`;
}
LV.cyber = {
  attack() {
    const st = S.settings, t = todayKey(), k = S.ui.date || t;
    const ts = activeTasks(k), status = dayStatus(k), d = S.days[k] || { tasks: [] };
    const done = ts.filter(x => x.done).length, pctDone = ts.length ? Math.round(done / ts.length * 100) : 0;
    const ad = dayAvg(k, 'ad'), pd = dayAvg(k, 'pd');
    const mins = S.sessions.filter(s => s.d === k && s.type !== 'break').reduce((a, s) => a + s.m, 0);
    const reg = regression(), tomorrowEmpty = !activeTasks(addDays(t, 1)).length;
    let h = '';
    if (st.showPrinciple && st.principles.length) h += `<div class="cy-tick"><span>Principle${px('chev', 12)}</span><p>${esc(st.principles[(parseKey(k).getTime() / 864e5 | 0) % st.principles.length])}</p></div>`;
    h += `<div class="dayhead"><div><div class="eyebrow">${k === t ? 'Attack today' : k > t ? 'Planned day' : 'Past day'}</div>
      <h1 class="title">${k === t ? 'Today' : esc(niceDate(k, { weekday: 'short' }))}</h1></div>
      <div class="row no-print">${k !== t ? '<button class="btn sm" data-act="goToday">Today</button>' : ''}<button class="btn sm" data-act="goHistory">${px('history', 14)}History</button>${NATIVE ? '' : `<button class="btn sm" data-act="print">${px('print', 14)}Print sheet</button>`}</div></div>
    <div class="cy-date no-print"><button class="btn icon" data-act="shiftDate" data-n="-1" aria-label="Previous day">${px('cl', 18)}</button>
      <label class="cy-pick" data-act="pickOpen">${px('cal', 14)}<span>${esc(parseKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</span>${px('cd', 14)}<input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date"></label>
      <button class="btn icon" data-act="shiftDate" data-n="1" aria-label="Next day">${px('chev', 18)}</button></div>`;
    const al = [];
    if (reg && (reg.level === 'bad' || reg.level === 'warn') && k === t) al.push([reg.level, `${esc(reg.msg)} <a href="#manual">Open manual</a>`]);
    if (k === t && new Date().getHours() >= st.planReminderHour && tomorrowEmpty) al.push(['accent', 'Plan tomorrow before today ends. <a href="#plan">Build tomorrow</a>']);
    if (status !== 'normal') al.push([status === 'rest' ? 'good' : '', status === 'rest' ? "Rest day. Recovery is part of the system and it won't break your streak." : 'Grace day. Life happened. The streak is protected; do what you can.']);
    dayHints(k).forEach(([c, m]) => al.push([c, esc(m)]));
    h += cyAlerts(al);
    h += `<div class="cy-br"><div class="card cy-hero">
      <div class="hero"><div><div class="big">${pctDone}<small>%</small></div><div class="small muted">${done} of ${ts.length} done</div></div>
        <div class="cy-meters">
          <div><div class="row between"><span class="lbl">Planned load</span><b>${pd != null ? Math.round(pd) + '/10' : '–'}</b></div>${cyBlocks(Math.round(pd || 0), st.targetDifficulty)}</div>
          <div><div class="row between"><span class="lbl">Actual load</span><b class="on">${ad != null ? Math.round(ad) + '/10' : '–'}</b></div>${cyBlocks(Math.round(ad || 0), st.targetDifficulty)}</div>
          <div><div class="row between"><span class="lbl">Mix</span><span class="muted">target ${st.hardTasksTarget} hard</span></div>${cyMix(ts)}</div>
        </div></div>
      <div class="row cy-daytype"><div class="seg" role="group" aria-label="Day type">${['normal', 'grace', 'rest'].map(s => `<button class="${status === s ? 'on' : ''}" data-act="setStatus" data-k="${k}" data-v="${s}"><i class="led"></i>${s === 'normal' ? 'Attack' : s === 'grace' ? 'Grace' : 'Rest'}</button>`).join('')}</div>
        <span class="cy-min"><b>${mins}</b> min focused</span></div>
    </div></div>`;
    h += `<div class="cy-lh"><span class="eyebrow">Tasks · ${ts.length}</span><span class="cy-goal">Next day attack goal <b>${st.targetDifficulty}/10</b></span></div>
      <div class="tasks">${d.tasks.length ? d.tasks.map((x, i) => taskRow(k, x, i, 'today')).join('') : `<div class="empty-row">No tasks yet. Aim for ${st.hardTasksTarget} tasks around ${st.targetDifficulty}/10, the rest easier.</div>`}</div>
      <div class="cy-acts no-print"><button class="btn cy-dash" data-act="addTask" data-k="${k}">${px('plus', 16)}Add task</button>${k === t && ts.some(x => !x.done) ? `<button class="btn primary" data-act="startFocus">${px('play', 16)}Start focus</button>` : ''}</div>`;
    if (st.showRulesOnToday) h += sec('rules', 'Manual check-in', cyRules(k), cyCompPill(k));
    if (st.showFactorsOnToday || st.showJournalOnToday) h += `<div class="cy-pair">${st.showFactorsOnToday ? sec('factors', 'Factors', factorsForm(k)) : ''}${st.showJournalOnToday ? sec('journal', 'Feedback journal', journalForm(k)) : ''}</div>`;
    return h + sheetForPrint(k);
  },
  plan() {
    const st = S.settings, t = todayKey(), k = addDays(t, 1);
    const ts = activeTasks(k), d = S.days[k] || { tasks: [] };
    const undone = activeTasks(t).filter(x => !x.done && x.what);
    const rec = recurringTasks(k).filter(r => !ts.some(x => normName(x.what) === normName(r.t.what)));
    const top = rec.find(r => r.s && r.s.action === 'up') || rec.find(r => r.s && r.s.action === 'down');
    let h = `<div class="dayhead"><div><div class="eyebrow">Build a tomorrow</div><h1 class="title">Tomorrow</h1></div><span class="small muted cy-mono">${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</span></div>
      <p class="muted small">Plan it before today ends: exact tasks, amounts, times. Wake up with clarity, not decisions.</p>
      <div class="card cy-plan"><div class="row between"><span class="h2">Balanced plan</span><span class="small muted cy-mono"><b>${ts.length}/${st.maxTasks}</b> tasks</span></div>${cyMix(ts, st.maxTasks)}`;
    if (top) {
      const i = rec.indexOf(top);
      h += `<div class="sugbar">${px('zap', 14)}<div class="t"><b>${top.s.action === 'up' ? `Make it ~${st.overloadStep}% harder` : 'Ease off a little'}</b><span class="small">${esc(top.t.what)}: ${esc(top.s.text)}</span></div><button class="btn sm primary" data-act="addSug" data-i="${i}">Add</button></div>`;
    }
    h += `</div><div class="cy-two no-print">
      <button class="btn" data-act="carry" ${undone.length ? '' : 'disabled'}>Carry over unfinished (${undone.length})</button>
      <button class="btn" data-act="repeatToday" ${activeTasks(t).length ? '' : 'disabled'}>Repeat today, adjusted</button></div>`;
    dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}">${esc(m)}</div>`; });
    const woops = S.woops.filter(w => w.active && (w.obstacle || w.plan));
    if (rec.length || woops.length) {
      h += '<div class="cy-pair">';
      if (rec.length) h += sec('sugs', '7/10 suggestions', `<p class="small muted" style="margin-top:0">From your recent tasks. Below ${st.targetDifficulty - st.tolerance}/10 actual difficulty, add load. Above ${st.targetDifficulty + st.tolerance}, ease off.</p>` +
        rec.map(({ t: x, s }, i) => `<div class="rule-row"><div class="t"><b>${esc(x.what)}</b><div class="small muted">${s ? esc(s.text) : 'Rate actual difficulty to get overload suggestions.'}</div></div>
         <button class="btn sm" data-act="addSug" data-i="${i}">Add</button></div>`).join(''));
      if (woops.length) h += sec('ifthen', 'Your if-then plans', woops.map(w => `<div class="rule-row"><div class="t"><b>${esc(w.wish)}</b><div class="small">If <i>${esc(w.obstacle)}</i>, then <i>${esc(w.plan)}</i>.</div></div></div>`).join(''));
      h += '</div>';
    }
    h += `<div class="cy-lh"><span class="eyebrow">Tasks</span><span class="row"><span class="cy-goal">Next day attack goal <b>${st.targetDifficulty}/10</b></span><button class="btn sm no-print" data-act="addTask" data-k="${k}">${px('plus', 14)}Add task</button></span></div>
      <div class="tasks">${d.tasks.length ? d.tasks.map((x, i) => taskRow(k, x, i, 'plan')).join('') : '<div class="empty-row">Nothing planned for tomorrow yet.</div>'}</div>`;
    return h;
  },
  focus() {
    const tm = S.settings.timer, k = todayKey();
    if (T.left == null) tSet('work', tm.work);
    const task = T.taskId ? findTask(T.taskKey, T.taskId) : null;
    const ts = activeTasks(k).filter(t => !t.done), next = ts.find(t => t.id !== T.taskId);
    const today = S.sessions.filter(s => s.d === k);
    const label = { work: 'Deep work', break: 'Break', starter: 'Starter' }[T.mode];
    const on = Math.floor((1 - T.left / T.total) * 30);
    let h = `<div class="dayhead"><div><div class="eyebrow">30/10 system</div><h1 class="title">Focus</h1></div>
      ${next ? `<button class="cy-next" data-act="focusTask" data-k="${k}" data-id="${next.id}"><span><span class="eyebrow">Next up</span><b>${esc(next.what || 'Untitled')}</b><span class="small muted">${esc([next.when, next.qty != null ? next.qty + ' ' + (next.unit || '') : ''].filter(Boolean).join(' · '))}</span></span>${kindOf(next) ? `<span class="tag ${kindOf(next)}">${kindOf(next)}</span>` : ''}${px('chev', 14)}</button>` : ''}</div>`;
    h += `<div class="cy-br"><div class="card focus-card cy-core">
      <div class="cy-tm"><div class="cy-ring" id="tblocks">${Array.from({ length: 30 }, (_, i) => `<i class="${i < on ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</div>
        <div class="cy-clock"><div class="time" id="tdisp">${mmss(T.left)}</div><div class="mode ${T.mode === 'break' ? 'break' : ''}">${T.running ? (T.mode === 'break' ? 'On break' : 'In the zone') : 'Paused'}</div></div></div>
      <div class="cy-tinfo"><div class="eyebrow">${label}${T.mode !== 'starter' ? ' · block ' + T.cycle : ''}</div>
        <div class="task-name">${esc(task ? task.what : T.mode === 'break' ? 'Rest your eyes' : 'Pick a task below')}</div>
        <p class="msg muted">${esc(T.mode === 'break' ? tm.breakMsg : tm.workMsg)}</p></div>
      <div class="cy-ctrls"><button class="btn" data-act="tPlus5" aria-label="Add 5 minutes"><b>+5</b>min</button>
        <button class="btn primary" data-act="tToggle">${px(T.running ? 'pause' : 'play', 16)}${T.running ? 'Pause' : 'Start'}</button>
        <button class="btn icon" data-act="tSkip" aria-label="Skip to ${T.mode === 'break' ? 'work' : 'break'}">${px('skip', 18)}</button>
        ${T.left < T.total ? `<button class="btn" data-act="tReset">${px('reset', 14)}Reset</button>` : ''}</div>
    </div></div>`;
    h += `<div class="card cy-mind"><button class="cy-row" data-act="reframe">${px('refresh', 14)}<span class="t"><b>Mind wandering?</b><span class="small muted">Reframe the task and get back on track.</span></span>${px(T.reframe != null ? 'cd' : 'chev', 14)}</button>`;
    if (T.reframe != null) {
      const q = S.settings.reframePrompts[T.reframe] || '', why = S.settings.myWhy;
      const woops = S.woops.filter(w => w.active && w.wish), subj = task ? task.what : 'what I am studying';
      h += `<div class="reframe"><div class="eyebrow">Cognitive reframing</div><p class="q">${esc(q)}</p>
        <p class="small">${why ? `<b>My why:</b> <span class="muted">${esc(why)}</span>` : '<span class="muted">Add your personal "why" in Settings and it shows up here.</span>'}${woops.length ? ` <b class="cy-gap">Wishes:</b> <span class="muted">${woops.map(w => esc(w.wish)).join(' · ')}</span>` : ''}</p>
        <p class="kbd"><span class="muted">Ask a chatbot:</span> <span id="aiprompt">What are the real-life implications of ${esc(subj)}, and how can I apply it?</span></p>
        <div class="row"><button class="btn sm" data-act="copyAi">${px('copy', 14)}Copy question</button><button class="btn sm" data-act="reframe">${px('refresh', 14)}Another prompt</button></div></div>`;
    }
    h += `</div><div class="card cy-work">`;
    if (T.ask) h += `<div class="cy-ask"><b>Starter done. Am I willing to continue?</b><div class="row"><button class="btn sm" data-act="tContinue">Yes, full ${tm.work}-min block</button><button class="btn sm" data-act="tStop">Not now, that's okay</button></div></div>`;
    h += `<div class="row cy-on"><span class="h2">Work on</span><select data-act-change="pickFocusTask" aria-label="Task to focus on"><option value="">No specific task</option>${ts.map(t => `<option value="${t.id}" ${T.taskId === t.id ? 'selected' : ''}>${esc(t.what || 'Untitled')}</option>`).join('')}</select></div>
      <div class="row"><button class="chip" data-act="tStarter" data-m="${tm.starterG0}">Grade 0 · ${tm.starterG0} min</button><button class="chip" data-act="tStarter" data-m="${tm.starterG1}">Grade 1 · ${tm.starterG1} min</button></div>
      <p class="small muted">Can't start? Do the tiny version. No pressure to do more.</p></div>`;
    const workMin = today.filter(s => s.type !== 'break').reduce((a, s) => a + s.m, 0);
    h += `<div class="card cy-today"><div class="row between"><span class="h2">Today</span><b class="cy-mono on">${workMin} min</b></div>
      <p class="small muted cy-mono">${today.length} block${today.length === 1 ? '' : 's'}${today.length ? ': ' + today.slice(-8).map(s => `${s.m}m${s.task ? ' ' + esc(s.task) : ''}`).join(' · ') : ''}</p>
      <div class="cy-four">
        <label class="f"><span>Work</span>${inp('set|timer.work', tm.work, 'type="number" min="1"')}</label>
        <label class="f"><span>Break</span>${inp('set|timer.brk', tm.brk, 'type="number" min="1"')}</label>
        <label class="f"><span>Long every</span>${inp('set|timer.longEvery', tm.longEvery, 'type="number" min="0" title="0 = never"')}</label>
        <label class="f"><span>Long break</span>${inp('set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}</label>
      </div></div>`;
    return h;
  },
};

/* ---------- Paper Box (paper layout): screens from the Paper Box board ---------- */
const pbBlocks = (n, cls) => `<span class="pb-m10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? cls : ''}"></i>`).join('')}</span>`;
function pbMix(ts, max) {
  const c = mix(ts), rest = Math.max(0, (max || 0) - c.hard - c.medium - c.easy), un = ts.length - c.hard - c.medium - c.easy;
  const cells = [['h', c.hard], ['m', c.medium], ['e', c.easy], ['x', un + rest]].filter(x => x[1]);
  return `<span class="pb-mix">${cells.length ? cells.map(([k, n]) => `<i class="${k}" style="flex:${n}"></i>`).join('') : '<i class="x" style="flex:1"></i>'}</span>`;
}
function pbHints(list) {
  if (!list.length) return '';
  const ic = { accent: 'clock', warn: 'alert', bad: 'alert', good: 'check', '': 'alert' };
  return `<div class="pb-hints">${list.map(([c, m]) => `<div>${px(ic[c] || 'alert', 16)}<span>${m}</span></div>`).join('')}</div>`;
}
function pbRules(k) {
  const rules = S.rules.filter(r => r.active);
  if (!rules.length) return `<div class="empty">No rules yet. Write your company policies in the <a href="#manual">Manual</a>.</div>`;
  const d = S.days[k] || { rules: {} };
  return rules.map(r => {
    const v = d.rules[r.id];
    return `<div class="rule-row"><div class="t"><span>${esc(r.title || 'Untitled rule')}</span>${r.detail ? `<div class="small muted">${esc(r.detail)}</div>` : ''}</div>
      <div class="seg pb-ck"><button class="yes ${v === true ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="1">✓ Followed</button><button class="no ${v === false ? 'on' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="0">✗ Broken</button></div></div>`;
  }).join('');
}
const pbAdd = (k, label = 'Add task') => `<button class="pb-dash no-print" data-act="addTask" data-k="${k}">${px('plus', 16)}${label}</button>`;
function pbTasks(k, mode, empty) {
  const st = S.settings, d = S.days[k] || { tasks: [] };
  const ts = activeTasks(k), goal = simple() ? (ts.length ? `${ts.filter(x => x.done).length} of ${ts.length} done` : '') : `Next day attack goal ${st.targetDifficulty}/10`;
  return `<div class="card pb-tasks"><div class="row between pb-th"><b>Tasks</b><span class="eyebrow">${goal}</span></div>
    <div class="tasks">${d.tasks.length ? d.tasks.map((x, i) => taskRow(k, x, i, mode)).join('') : `<div class="empty-row">${empty}</div>`}</div></div>`;
}
LV.paper = {
  woop() {
    let h = `<div class="dayhead"><div><div class="eyebrow">Clarity creates execution</div><h1 class="title">WOOP</h1></div></div>
      <p class="muted small">Wish, Outcome, Obstacle, Plan. Picture the obstacle and decide now what you'll do when it shows up.</p>
      <button class="btn primary" data-act="addWoop">${px('plus', 15)} New WOOP</button>`;
    if (!S.woops.length) h += `<div class="empty pb-dash">${px('woop', 16)} No WOOPs yet.<br><span class="small">Example: read 10 chapters · pass the exam · I start gaming · if I feel the urge, the controller goes in another room and I read 1 page.</span></div>`;
    const steps = [['wish', 'Wish', 'What do I really want?', 'Read 10 chapters this month'], ['outcome', 'Outcome', 'What would it look like?', 'I pass the exam with room to spare'], ['obstacle', 'Obstacle', 'What inside me gets in the way?', 'I start gaming instead of studying'], ['plan', 'Plan', 'If the obstacle shows up, then I will…', 'put the controller in another room and read 1 page']];
    S.woops.slice().reverse().sort((a, b) => b.active - a.active).forEach(w => {
      const p = `woop|${w.id}|`, open = w.active ? S.ui.open['woop:' + w.id] !== false : !!S.ui.open['woop:' + w.id];
      h += `<div class="card pb-woop ${open ? '' : 'shut'}"><div class="row between pb-wh"><label class="row"><input type="checkbox" class="pb-sq" data-bind="${p}active" data-rr ${w.active ? 'checked' : ''}> <b>Active</b></label>
        ${open ? `<button class="btn pill" data-act="delWoop" data-id="${w.id}">${px('trash', 14)}Delete</button>` : ''}</div>
        <div class="woop-steps">${(open ? steps : steps.slice(0, 1)).map(([f, t, q, ph], i) => `<div class="wstep ${w[f] ? 'filled' : ''}"><span class="n">${i + 1}</span><div style="min-width:0;flex:1"><h3>${t}</h3>${open ? `<div class="q">${q}</div>` : ''}
          ${f === 'plan' ? `<textarea data-bind="${p}plan" placeholder="${esc(ph)}" aria-label="${t}">${esc(w.plan)}</textarea>` : inp(p + f, w[f], `placeholder="${esc(ph)}" aria-label="${t}"`)}</div>${open ? '' : `<button class="icon-btn" data-act="pbWoop" data-id="${w.id}" aria-label="Show all steps"><i class="pb-chev"></i></button>`}</div>`).join('')}</div>
        ${open ? `<div class="row pb-wf"><button class="btn pill" data-act="visualize" data-id="${w.id}">${px('eye', 14)}Visualize</button><button class="btn pill" data-act="woopTask" data-id="${w.id}">${px('plan', 14)}Make tomorrow's task</button>${w.active ? '' : `<span style="flex:1"></span><button class="icon-btn" data-act="pbWoop" data-id="${w.id}" aria-label="Fold"><i class="pb-chev up"></i></button>`}</div>` : ''}</div>`;
    });
    return h;
  },
  attack() {
    const st = S.settings, t = todayKey(), k = S.ui.date || t;
    const ts = activeTasks(k), status = dayStatus(k);
    const done = ts.filter(x => x.done).length, pctDone = ts.length ? Math.round(done / ts.length * 100) : 0;
    const ad = dayAvg(k, 'ad'), pd = dayAvg(k, 'pd');
    const mins = S.sessions.filter(s => s.d === k && s.type !== 'break').reduce((a, s) => a + s.m, 0);
    const reg = regression(), tomorrowEmpty = !activeTasks(addDays(t, 1)).length, sm = simple();
    let h = '';
    if (st.showPrinciple && st.principles.length && !sm) { const pr = esc(st.principles[(parseKey(k).getTime() / 864e5 | 0) % st.principles.length]); h += `<div class="pb-tick" aria-label="Principle of the day: ${pr}"><div><span>Principle ✦ ${pr} ✦&nbsp;</span><span aria-hidden="true">Principle ✦ ${pr} ✦&nbsp;</span></div></div>`; }
    h += `<div class="dayhead"><div><div class="eyebrow">${k === t ? 'Attack today' : k > t ? 'Planned day' : 'Past day'}</div>
      <h1 class="title">${k === t ? 'Today' : esc(niceDate(k, { weekday: 'short' }))}</h1></div>
      <div class="pb-date no-print"><button data-act="shiftDate" data-n="-1" aria-label="Previous day">${px('cl', 16)}</button>
        <label data-act="pickOpen">${px('cal', 14)}<span>${esc(parseKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}</span><input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date"></label>
        <button data-act="shiftDate" data-n="1" aria-label="Next day">${px('chev', 16)}</button></div>
      <div class="row no-print pb-hbtn">${k !== t ? '<button class="btn pill" data-act="goToday">Today</button>' : ''}${sm ? '' : '<button class="btn pill" data-act="goHistory">History</button>'}</div></div>`;
    const al = [];
    if (k === t && new Date().getHours() >= st.planReminderHour && tomorrowEmpty) al.push(['accent', 'Plan tomorrow before today ends. <a class="pb-lk" href="#plan">Build tomorrow' + px('arrow', 14) + '</a>']);
    if (reg && (reg.level === 'bad' || reg.level === 'warn') && k === t) al.push([reg.level, `${esc(reg.msg)} <a class="pb-lk" href="#manual">Open manual</a>`]);
    if (status !== 'normal') al.push(['good', status === 'rest' ? "Rest day. Recovery is part of the system and it won't break your streak." : 'Grace day. Life happened. The streak is protected; do what you can.']);
    dayHints(k).forEach(([c, m]) => al.push([c, esc(m)]));
    h += pbHints(sm ? al.slice(0, 1).filter(x => x[0] === 'accent') : al);
    if (!sm) h += `<div class="card pb-hero"><div><div class="big">${pctDone}<small>%</small></div><div class="small muted">${done} of ${ts.length} done</div></div>
      <div class="pb-meters">
        <div><span class="lbl">Planned</span>${pbBlocks(Math.round(pd || 0), 'f')}<b>${pd != null ? Math.round(pd) : '–'}/10</b></div>
        <div><span class="lbl">Actual</span>${pbBlocks(Math.round(ad || 0), 'c')}<b>${ad != null ? Math.round(ad) : '–'}/10</b></div>
        <div><span class="lbl">Mix</span>${pbMix(ts)}<span class="lbl t">target ${st.hardTasksTarget} hard</span></div>
      </div></div>
    <div class="pb-day" role="group" aria-label="Day type">${['normal', 'grace', 'rest'].map(s => `<button class="pb-tier ${status === s ? 'on' : ''}" data-act="setStatus" data-k="${k}" data-v="${s}">${s === 'normal' ? 'Attack' : s === 'grace' ? 'Grace' : 'Rest'}${status === s ? px('spark', 11) : ''}</button>`).join('')}
      <span class="pb-min"><b>${mins} min</b><span>focused</span></span></div>`;
    h += pbTasks(k, 'today', `No tasks yet. Aim for ${st.hardTasksTarget} tasks around ${st.targetDifficulty}/10, the rest easier.`);
    h += `<div class="pb-two no-print">${pbAdd(k)}${k === t && ts.some(x => !x.done) ? `<button class="btn primary" data-act="startFocus">${px('play', 16)}Start focus</button>` : ''}</div>`;
    if (st.showRulesOnToday) h += sec('rules', 'Manual check-in', pbRules(k), compBadge(k));
    if (!sm && (st.showFactorsOnToday || st.showJournalOnToday)) h += `<div class="cy-pair">${st.showFactorsOnToday ? sec('factors', 'Factors', factorsForm(k)) : ''}${st.showJournalOnToday ? sec('journal', 'Feedback journal', journalForm(k)) : ''}</div>`;
    if (!NATIVE && !sm) h += `<div class="row no-print" style="justify-content:flex-end"><button class="btn pill" data-act="print">${px('print', 14)}Print sheet</button></div>`;
    return h + sheetForPrint(k);
  },
  plan() {
    const st = S.settings, t = todayKey(), k = addDays(t, 1);
    const ts = activeTasks(k);
    const undone = activeTasks(t).filter(x => !x.done && x.what);
    const rec = recurringTasks(k).filter(r => !ts.some(x => normName(x.what) === normName(r.t.what)));
    const top = rec.find(r => r.s && r.s.action === 'up') || rec.find(r => r.s && r.s.action === 'down');
    let h = `<div class="dayhead"><div><div class="eyebrow">Build a tomorrow</div><h1 class="title">Tomorrow</h1></div><span class="chip pb-dchip">${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</span></div>
      <p class="muted small">Plan it before today ends: exact tasks, amounts, times. Wake up with clarity, not decisions.</p>
      <div class="pb-two pb-plan"><div class="card pb-bal"><div class="eyebrow">Balanced plan</div><div class="big">${ts.length}<small>/${st.maxTasks} tasks</small></div>${pbMix(ts, st.maxTasks)}</div>`;
    if (top) {
      const i = rec.indexOf(top);
      h += `<div class="card pb-sug">${px('spark', 12)}<b>${top.s.action === 'up' ? `Make it ~${st.overloadStep}% harder` : 'Ease off a little'}</b><span class="small">${esc(top.t.what)}: ${esc(top.s.text)}</span><button class="btn pill" data-act="addSug" data-i="${i}">Add</button></div>`;
    }
    h += `</div><div class="pb-two no-print">
      <button class="btn sm" data-act="carry" ${undone.length ? '' : 'disabled'}>Carry over unfinished (${undone.length})</button>
      <button class="btn sm" data-act="repeatToday" ${activeTasks(t).length ? '' : 'disabled'}>Repeat today, adjusted</button></div>`;
    const woops = S.woops.filter(w => w.active && (w.obstacle || w.plan));
    if (rec.length || woops.length) {
      h += '<div class="cy-pair">';
      if (rec.length) h += sec('sugs', '7/10 suggestions', `<p class="small muted" style="margin-top:0">From your recent tasks. Below ${st.targetDifficulty - st.tolerance}/10 actual difficulty, add load. Above ${st.targetDifficulty + st.tolerance}, ease off.</p>` +
        rec.map(({ t: x, s }, i) => `<div class="rule-row"><div class="t"><b>${esc(x.what)}</b><div class="small muted">${s ? esc(s.text) : 'Rate actual difficulty to get overload suggestions.'}</div></div>
         <button class="btn pill" data-act="addSug" data-i="${i}">Add</button></div>`).join(''));
      if (woops.length) h += sec('ifthen', 'Your if-then plans', woops.map(w => `<div class="rule-row"><div class="t"><b>${esc(w.wish)}</b><div class="small">If <i>${esc(w.obstacle)}</i>, then <i>${esc(w.plan)}</i>.</div></div></div>`).join(''));
      h += '</div>';
    }
    h += pbHints(dayHints(k).map(([c, m]) => [c, esc(m)]));
    h += pbTasks(k, 'plan', 'Nothing planned for tomorrow yet.') + pbAdd(k);
    return h;
  },
  focus() {
    const tm = S.settings.timer, k = todayKey();
    if (T.left == null) tSet('work', tm.work);
    const task = T.taskId ? findTask(T.taskKey, T.taskId) : null;
    const ts = activeTasks(k).filter(t => !t.done), next = ts.find(t => t.id !== T.taskId);
    const today = S.sessions.filter(s => s.d === k);
    const label = { work: 'Deep work', break: 'Break', starter: 'Starter' }[T.mode];
    const on = Math.floor((1 - T.left / T.total) * 30), state = T.running ? (T.mode === 'break' ? 'On break' : 'In the zone') : 'Paused';
    let h = `<h1 class="title">Focus</h1>
      <div class="card focus-card pb-core">
        <div class="row between"><span class="eyebrow">${label}${T.mode !== 'starter' ? ' · block ' + T.cycle : ''}</span><span class="chip pb-state ${T.running ? 'run' : ''}">${T.running ? px('check', 14) : ''}${state}</span></div>
        <div class="pb-tm"><div class="time" id="tdisp">${mmss(T.left)}</div><div><b class="task-name">${esc(task ? task.what : T.mode === 'break' ? 'Rest your eyes' : 'Pick a task below')}</b><p class="msg muted">${esc(T.mode === 'break' ? tm.breakMsg : tm.workMsg)}</p></div></div>
        <div class="pb-seg30" id="tblocks">${Array.from({ length: 30 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>
        <div class="pb-ctrls"><button class="btn sm" data-act="tPlus5">+5 min</button>
          <button class="btn primary" data-act="tToggle">${px(T.running ? 'pause' : 'play', 16)}${T.running ? 'Pause' : 'Start'}</button>
          <button class="btn icon" data-act="tSkip" aria-label="Skip to ${T.mode === 'break' ? 'work' : 'break'}">${px('skip', 16)}</button>
          ${T.left < T.total ? `<button class="btn sm" data-act="tReset">${px('reset', 14)}Reset</button>` : ''}</div>
        ${next ? `<button class="pb-next" data-act="focusTask" data-k="${k}" data-id="${next.id}"><span class="eyebrow">Next up</span><b>${esc(next.what || 'Untitled')}</b>${kindOf(next) ? `<span class="tag ${kindOf(next)}"><i>${kindOf(next)[0].toUpperCase()}</i>${kindOf(next)}</span>` : ''}</button>` : ''}
      </div>`;
    if (T.ask) h += `<div class="card pb-ask"><b>Starter done. Am I willing to continue?</b><div class="pb-two"><button class="btn sm" data-act="tContinue">${px('check', 14)}Yes, full ${tm.work}-min block</button><button class="btn sm" data-act="tStop">Not now, that's okay</button></div></div>`;
    h += `<div class="card pb-mind"><button class="pb-mrow" data-act="reframe">${px('bulb', 16)}<b>Mind wandering?</b>${px(T.reframe != null ? 'cu' : 'cd', 16)}</button><p class="small muted">Reframe the task and get back on track.</p>`;
    if (T.reframe != null) {
      const q = S.settings.reframePrompts[T.reframe] || '', why = S.settings.myWhy;
      const woops = S.woops.filter(w => w.active && w.wish), subj = task ? task.what : 'what I am studying';
      h += `<div class="pb-lv"><span>Cognitive reframing</span><b>${esc(q)}</b></div>
        <div class="pb-lv"><span>My why</span><b>${why ? esc(why) : '<span class="muted">Add it in Settings</span>'}</b></div>
        ${woops.length ? `<div class="pb-lv"><span>Wishes</span><b>${woops.map(w => esc(w.wish)).join(' · ')}</b></div>` : ''}
        <div class="pb-lv"><span>Ask a chatbot</span><b id="aiprompt">What are the real-life implications of ${esc(subj)}, and how can I apply it?</b></div>
        <div class="row"><button class="btn pill" data-act="copyAi">${px('copy', 14)}Copy question</button><button class="btn pill" data-act="reframe">${px('refresh', 14)}Another prompt</button></div>`;
    }
    h += `</div><div class="card pb-work"><div class="row pb-on"><span class="eyebrow">Work on</span><select data-act-change="pickFocusTask" aria-label="Task to focus on"><option value="">No specific task</option>${ts.map(t => `<option value="${t.id}" ${T.taskId === t.id ? 'selected' : ''}>${esc(t.what || 'Untitled')}</option>`).join('')}</select></div>
      <div class="row"><button class="chip" data-act="tStarter" data-m="${tm.starterG0}">Grade 0 · ${tm.starterG0} min</button><button class="chip" data-act="tStarter" data-m="${tm.starterG1}">Grade 1 · ${tm.starterG1} min</button></div>
      <p class="small muted">Can't start? Do the tiny version. No pressure to do more.</p></div>`;
    const workMin = today.filter(s => s.type !== 'break').reduce((a, s) => a + s.m, 0);
    h += sec('pbtoday', `Today: ${workMin} min`, `<p class="small muted" style="margin:0 0 10px">${today.length ? today.slice(-8).map(s => `${s.m}m${s.task ? ' ' + esc(s.task) : ''}`).join(' · ') : 'No blocks yet.'}</p>
      <div class="grid g4">
        <label class="f"><span>Work</span>${inp('set|timer.work', tm.work, 'type="number" min="1"')}</label>
        <label class="f"><span>Break</span>${inp('set|timer.brk', tm.brk, 'type="number" min="1"')}</label>
        <label class="f"><span>Long every</span>${inp('set|timer.longEvery', tm.longEvery, 'type="number" min="0" title="0 = never"')}</label>
        <label class="f"><span>Long break</span>${inp('set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}</label>
      </div>`, `<span class="cnt">${today.length} block${today.length === 1 ? '' : 's'}</span>`);
    return h;
  },
};

/* ---------- B&W (mono layout): screens from the B&W board. Features only: no principle, eyebrows or helper copy ---------- */
const moBar = (n, on) => `<span class="mo-bar">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'f' : ''}"></i>`).join('')}</span>`;
function moMix(ts, max) {
  const c = mix(ts), n = Math.max(ts.length, max || 0, 1);
  const cells = [...Array(c.hard).fill('f'), ...Array(c.medium).fill('g'), ...Array(c.easy).fill('d')];
  return `<span class="mo-bar" aria-label="${c.hard} hard, ${c.medium} medium, ${c.easy} easy">${Array.from({ length: n }, (_, i) => `<i class="${cells[i] || ''}"></i>`).join('')}</span>`;
}
const moTag = kind => kind ? `<span class="tag ${kind}">${kind}</span>` : '';
const moIn = (icon, html) => `<div class="mo-in">${px(icon, 16)}<span>${html}</span></div>`;
// short, data-only hints: which task is vague, how the mix compares to the target
function moHints(k) {
  const st = S.settings, ts = activeTasks(k), out = [];
  if (!ts.length) return out;
  const hard = ts.filter(t => kindOf(t) === 'hard').length;
  if (ts.every(t => t.pd) && hard < st.hardTasksTarget) out.push(`${hard} hard task${hard === 1 ? '' : 's'}, target ${st.hardTasksTarget}`);
  if (hard > st.hardTasksTarget) out.push(`${hard} hard tasks, target ${st.hardTasksTarget}`);
  if (ts.length > st.maxTasks) out.push(`${ts.length} tasks, limit ${st.maxTasks}`);
  ts.filter(t => t.what && (t.qty == null || !t.when)).forEach(t => out.push(`${esc(t.what)} has no ${t.qty == null && !t.when ? 'amount or time' : t.qty == null ? 'amount' : 'time'}`));
  return out.map(m => moIn('info', m));
}
function moReg(reg) {
  if (!reg || !reg.msg) return '';
  return reg.level === 'bad' ? `Down ${Math.round(reg.prev - reg.c7)}% from last week` : `${pct(reg.c7)} this week, target ${S.settings.complianceTarget}%`;
}
function moTaskRow(k, t, i, mode) {
  const kind = kindOf(t), today = mode === 'today', open = openTask.has(t.id);
  const p = `task|${k}|${t.id}|`;
  const amount = t.qty != null ? `${t.qty}${t.unit ? ' ' + t.unit : ''}` : '';
  const sub = t.movedTo ? 'Moved to ' + niceDate(t.movedTo, { weekday: 'short', day: 'numeric', month: 'short' }) : [t.when, amount, t.detail, t.where].filter(Boolean).join(' · ');
  const dd = t.pd ? (today && t.ad ? `${t.pd}>${t.ad}` : `${t.pd}/10`) : '';
  const grade = t.grade === 'g0' ? '<span class="tag grade">G0</span>' : t.grade === 'g1' ? '<span class="tag grade">G1</span>' : '';
  return `<div class="task ${t.done ? 'done' : ''} ${t.movedTo ? 'moved' : ''} ${open ? 'open' : ''}">
    <div class="trow" data-act="toggleTask" data-id="${t.id}" role="button" tabindex="0" aria-expanded="${open}">
      ${today && !t.movedTo ? `<label class="check" title="Done"><input type="checkbox" data-bind="${p}done" data-rr ${t.done ? 'checked' : ''} aria-label="Mark done"><span></span></label>` : `<span class="num">${i + 1}</span>`}
      <div class="t"><div class="l"><span class="name">${t.what ? esc(t.what) : 'Untitled task'}</span><span class="tg">${grade}${moTag(kind)}</span></div>
        ${sub || dd ? `<div class="l"><span class="sub">${esc(sub)}</span>${dd ? `<span class="dd">${dd}</span>` : ''}</div>` : ''}</div>
      <span class="chev">${px('chev', 16)}</span>
    </div>
    ${open ? moEditor(k, t, mode) : ''}
  </div>`;
}
function moEditor(k, t, mode) {
  const st = S.settings, L = st.labels, P = st.placeholders, tg = st.targetDifficulty, today = mode === 'today';
  const p = `task|${k}|${t.id}|`, a = `data-k="${k}" data-id="${t.id}"`, adv = !simple() || moreTask.has(t.id);
  let meta = '';
  if (!today && t.what) { const s = suggestFor(t.what, k); if (s) meta = `<div class="mo-meta"><span class="muted">${esc(s.text)}</span>${s.qty != null && s.qty !== t.qty ? `<button class="tx" data-act="applySug" ${a} data-q="${s.qty}">Apply</button>` : ''}</div>`; }
  const act = (icon, label, attrs) => `<button class="mo-act" ${attrs}><span class="mo-rb">${px(icon, 16)}</span>${label}</button>`;
  return `<div class="pb-scrim" data-act="toggleTask" data-id="${t.id}"></div><div class="editor" data-id="${t.id}">
    <div class="mo-sh"><b>${t.what ? esc(t.what) : 'New task'}</b><button class="btn xs danger" data-act="delTask" ${a}>${px('x', 13)}Delete</button><button class="mo-x" data-act="toggleTask" data-id="${t.id}" aria-label="Close">${px('x', 20)}</button></div>
    <label class="f"><span>${esc(L.what)}</span>${inp(p + 'what', t.what, `class="what" placeholder="${esc(P.what)}"`)}</label>
    ${adv ? `<div class="mo-g4">
      <label class="f"><span>${esc(L.howMuch)}</span>${inp(p + 'qty', t.qty, 'type="number" step="any" inputmode="decimal" placeholder="0"')}</label>
      <label class="f"><span>&nbsp;</span>${inp(p + 'unit', t.unit, `placeholder="${esc(P.unit)}" aria-label="Unit"`)}</label>
      <label class="f"><span>${esc(L.when)}</span>${inp(p + 'when', t.when, 'type="time"')}</label>
      <label class="f"><span>${esc(L.where)}</span>${inp(p + 'where', t.where, `placeholder="${esc(P.where)}"`)}</label>
    </div>
    <div class="mo-g2">
      <label class="f"><span>Detail</span>${inp(p + 'detail', t.detail, `placeholder="${esc(P.detail)}"`)}</label>
      <label class="f"><span>Notes</span>${inp(p + 'notes', t.notes, 'placeholder="Notes"')}</label>
    </div>` : ''}
    <div class="f"><span class="lbl">Predicted difficulty</span>${scale(p + 'pd', t.pd, tg)}</div>
    ${today ? `<div class="f"><span class="lbl">Actual difficulty</span>${scale(p + 'ad', t.ad, tg)}</div>` : ''}
    ${adv ? meta : `<button class="tx" data-act="moreTask" data-id="${t.id}">${px('plus', 14)}More details</button>`}
    ${adv ? `<div class="f"><span class="lbl">Starter grade</span><div class="seg mo-grade">${[['full', 'Full task'], ['g1', `Grade 1: ${st.timer.starterG1}-min version`], ['g0', `Grade 0: ${st.timer.starterG0}-min version`]].map(([v, l]) => `<button type="button" class="${(t.grade || 'full') === v ? 'on' : ''}" data-act="setGrade" ${a} data-v="${v}">${l}</button>`).join('')}</div></div>` : ''}
    <div class="mo-acts">
      ${act('focus', 'Focus', `data-act="focusTask" ${a}`)}
      ${today && !t.done && !t.movedTo ? act('plan', 'To tomorrow', `data-act="moveTask" ${a}`) : ''}
      ${adv ? `${act('copy', 'Duplicate', `data-act="dupTask" ${a}`)}
      ${act('up', 'Move up', `data-act="mvTask" data-dir="-1" ${a}`)}
      ${act('down', 'Move down', `data-act="mvTask" data-dir="1" ${a}`)}` : ''}
      <button class="btn primary" data-act="toggleTask" data-id="${t.id}">Save</button>
    </div>
  </div>`;
}
const moTasks = (k, mode, empty) => { const d = S.days[k] || { tasks: [] }; return `<div class="tasks">${d.tasks.length ? d.tasks.map((x, i) => moTaskRow(k, x, i, mode)).join('') : `<div class="empty-row">${empty}</div>`}</div>`; };
const moGoal = () => `<span class="chip mo-goal">Next day attack goal <b>${S.settings.targetDifficulty}/10</b></span>`;
const moAdd = k => `<button class="btn grey mo-add no-print" data-act="addTask" data-k="${k}">${px('plus', 16)}Add task</button>`;
function moChecks(k) {
  const rules = S.rules.filter(r => r.active), d = S.days[k] || { rules: {} };
  const fol = rules.filter(r => d.rules[r.id] === true).length;
  const body = rules.length ? rules.map(r => { const v = d.rules[r.id]; return `<div class="rule-row"><div class="t">${esc(r.title || 'Untitled rule')}${r.detail ? `<div class="sub muted">${esc(r.detail)}</div>` : ''}</div>
      <button class="ck ${v === true ? 'y' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="1" aria-label="Followed" aria-pressed="${v === true}">${px('check', 14)}</button><button class="ck ${v === false ? 'y' : ''}" data-act="ruleSet" data-k="${k}" data-id="${r.id}" data-v="0" aria-label="Broken" aria-pressed="${v === false}">${px('x', 14)}</button></div>`; }).join('')
    : `<div class="empty-row">No rules yet. <a href="#manual">Manual</a></div>`;
  return `<div class="mo-sec"><div class="mo-h"><span>Manual check-in</span>${rules.length ? `<span class="r">${fol} / ${rules.length} followed</span>` : ''}</div>${body}</div>`;
}
function moRing(on) {
  let s = '<svg id="tring" class="mo-ring-svg" viewBox="0 0 184 184" aria-hidden="true">';
  for (let i = 0; i < 30; i++) {
    const a0 = (-90 + i * 12 + 1.8) * Math.PI / 180, a1 = (-90 + (i + 1) * 12 - 1.8) * Math.PI / 180, r = 86, f = n => Math.round(n * 100) / 100;
    s += `<path class="${i < on ? 'on' : ''}" d="M${f(92 + r * Math.cos(a0))} ${f(92 + r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(92 + r * Math.cos(a1))} ${f(92 + r * Math.sin(a1))}"/>`;
  }
  return s + '</svg>';
}
function moChart(keys) {
  const W = 320, H = 118, x0 = 14, x1 = 306, y0 = 8, y1 = 96, n = keys.length, bw = (x1 - x0) / n, tg = S.settings.targetDifficulty;
  const yT = y1 - tg / 10 * (y1 - y0), step = Math.ceil(n / 7), pts = [];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Completion and difficulty chart"><line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" class="ax"/><line x1="${x0}" y1="${yT}" x2="${x1}" y2="${yT}" class="tg"/>`;
  keys.forEach((k, i) => {
    const c = dayCompletion(k), st = dayStatus(k), cx = x0 + i * bw + bw / 2;
    if (c != null) { const h = Math.max(2, c / 100 * (y1 - y0)); s += `<rect x="${cx - Math.min(11, bw * .3)}" y="${y1 - h}" width="${Math.min(22, bw * .6)}" height="${h}" rx="${Math.min(3, bw * .15)}"><title>${k}: ${Math.round(c)}%</title></rect>`; }
    if (st === 'rest' || st === 'grace') s += `<text x="${cx}" y="${y1 - 5}" class="mk">${st === 'rest' ? 'R' : 'G'}</text>`;
    const a = dayAvg(k, 'ad'); if (a != null) pts.push([cx, y1 - a / 10 * (y1 - y0)]);
    if (i % step === 0) s += `<text x="${cx}" y="${H - 6}" class="dl">${n <= 7 ? DOW[weekday(k)].toUpperCase() : parseKey(k).getDate()}</text>`;
  });
  if (pts.length > 1) s += `<polyline points="${pts.map(q => q.map(v => Math.round(v * 10) / 10).join(',')).join(' ')}" class="ad"/>`;
  pts.forEach(q => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="3" class="pt"/>`; });
  return s + `<text x="${x1}" y="${yT - 4}" class="tl">${tg}/10</text></svg>`;
}
const moUnit = u => (u || '').length > 3 ? u[0] : (u || '');
function trendsTable(rec, keys) {
  return rec.length ? `<div class="tablewrap"><table class="data"><tr><th>Task</th><th>Times</th><th>Avg PD</th><th>Avg AD</th><th>Last</th><th>Next</th></tr>
    ${rec.map(({ t: x, s }) => { const hs = taskHistory().filter(y => normName(y.t.what) === normName(x.what) && y.k >= keys[0]); return `<tr><td><b>${esc(x.what)}</b></td><td>${hs.length}</td><td>${fmt1(avg(hs.map(y => y.t.pd).filter(Boolean)))}</td><td>${fmt1(avg(hs.map(y => y.t.ad).filter(Boolean)))}</td><td>${x.qty != null ? esc(x.qty + ' ' + moUnit(x.unit)) : '–'}</td><td class="small">${s ? (s.action === 'up' ? '↑ ' : s.action === 'down' ? '↓ ' : '= ') + (s.qty != null ? esc(s.qty + ' ' + moUnit(s.unit)) : ({ up: 'harder', down: 'easier', keep: 'same' })[s.action]) : '–'}</td></tr>`; }).join('')}
    </table></div>` : '<div class="empty">Repeat tasks with the same name to see trends.</div>';
}
let histCount = 0;
function moHistoryDay(k) {
  const d = S.days[k], ts = d.tasks, comp = dayCompletion(k), st = dayStatus(k);
  const rv = Object.values(d.rules), fl = factorLine(d), journal = Object.entries(d.journal).filter(([, v]) => v);
  return `<div class="card hday">
    <div class="mo-hd"><a href="#attack" data-act="openDay" data-k="${k}">${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</a>
      <span class="tag ${st === 'normal' ? 'grade' : 'easy'}">${st === 'normal' ? 'Attack' : st === 'grace' ? 'Grace' : 'Rest'}</span>${comp != null ? `<b>${pct(comp)}</b>` : ''}</div>
    ${ts.length ? `<ul class="hlist">${ts.map(t => `<li><span class="mark">${t.done ? '■' : '□'}</span><div class="ht"><span>${esc(t.what || 'Untitled')}${t.qty != null ? ` · ${esc(t.qty + ' ' + (t.unit || ''))}` : ''}${t.movedTo ? ' <span class="muted">· moved</span>' : ''}</span>${t.pd ? `<b>${t.pd}${t.ad ? ' &gt; ' + t.ad : ''}</b>` : ''}</div>
      ${t.notes ? `<div class="note">${esc(t.notes).replace(/\n/g, '<br>')}</div>` : ''}</li>`).join('')}</ul>` : ''}
    ${fl ? `<div class="muted">${fl}</div>` : ''}${rv.length ? `<div>Rules ${rv.filter(Boolean).length}/${rv.length} followed</div>` : ''}
    ${journal.map(([q, v]) => `<div class="hq"><span class="muted">${esc(q)}</span> ${esc(v).replace(/\n/g, '<br>')}</div>`).join('')}
    ${d.note ? `<div class="hq"><span class="muted">Notes ·</span> ${esc(d.note).replace(/\n/g, '<br>')}</div>` : ''}
  </div>`;
}
LV.mono = {
  attack() {
    const st = S.settings, t = todayKey(), k = S.ui.date || t;
    const ts = activeTasks(k), status = dayStatus(k);
    const done = ts.filter(x => x.done).length, pctDone = ts.length ? Math.round(done / ts.length * 100) : 0;
    const ad = dayAvg(k, 'ad'), pd = dayAvg(k, 'pd');
    const mins = S.sessions.filter(s => s.d === k && s.type !== 'break').reduce((a, s) => a + s.m, 0);
    const reg = regression(), remind = k === t && new Date().getHours() >= st.planReminderHour && !activeTasks(addDays(t, 1)).length, sm = simple();
    let h = `<div class="mo-ds no-print"><button class="mo-rb" data-act="shiftDate" data-n="-1" aria-label="Previous day">${px('cl', 14)}</button>`;
    for (let i = -2; i <= 2; i++) {
      const kk = addDays(k, i), dd = parseKey(kk), lab = `<span>${DOW[dd.getDay()]}</span><b>${dd.getDate()}</b>`;
      h += i ? `<button class="d ${kk === t ? 'now' : ''}" data-act="shiftDate" data-n="${i}" aria-label="${esc(niceDate(kk))}">${lab}</button>`
        : `<label class="d on" data-act="pickOpen">${lab}<input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date"></label>`;
    }
    h += `<button class="mo-rb" data-act="shiftDate" data-n="1" aria-label="Next day">${px('chev', 14)}</button></div>
      ${sm ? `<div class="mo-row no-print">${k !== t ? '<button class="tx" data-act="goToday">Today</button>' : ''}<span class="muted"><b>${done}</b> of ${ts.length} done</span>${remind ? `<a class="btn sm grey" href="#plan" data-nav="plan">Build tomorrow${px('chev', 14)}</a>` : ''}</div>` : `<div class="mo-row no-print">${k !== t ? '<button class="tx" data-act="goToday">Today</button>' : ''}<button class="tx" data-act="goHistory">${px('history', 14)}History</button>${NATIVE ? '' : `<button class="tx" data-act="print">${px('print', 14)}Print sheet</button>`}
        ${remind ? `<a class="btn sm grey" href="#plan" data-nav="plan">Build tomorrow${px('chev', 14)}</a>` : ''}</div>
      <div class="mo-box mo-read"><div class="mo-hero"><span class="mo-big">${pctDone}<small> %</small></span><span class="muted">${done} of ${ts.length} done</span></div>
        <div class="mo-meters">
          <div><span class="lbl">Planned</span>${moBar(10, Math.round(pd || 0))}<b>${pd != null ? Math.round(pd) : '–'}/10</b></div>
          <div><span class="lbl">Actual</span>${moBar(10, Math.round(ad || 0))}<b>${ad != null ? Math.round(ad) : '–'}/10</b></div>
          <div><span class="lbl">Mix</span>${moMix(ts)}<span class="muted">target ${st.hardTasksTarget} hard</span></div>
        </div></div>
      <div class="mo-day" role="group" aria-label="Day type">${['normal', 'grace', 'rest'].map(s => `<button class="chip ${status === s ? 'on' : ''}" data-act="setStatus" data-k="${k}" data-v="${s}">${s === 'normal' ? 'Attack' : s === 'grace' ? 'Grace' : 'Rest'}</button>`).join('')}
        <span class="muted"><b>${mins}</b> min focused</span></div>`}`;
    if (reg && (reg.level === 'bad' || reg.level === 'warn') && k === t && !sm) h += moIn('alert', `<a href="#manual">${esc(moReg(reg))}</a>`);
    if (!sm) h += moHints(k).join('');
    h += moTasks(k, 'today', 'No tasks yet.') + moAdd(k);
    h += `<div class="mo-two no-print">${k === t && ts.some(x => !x.done) ? `<button class="btn primary" data-act="startFocus">${px('play', 16)}Start focus</button>` : ''}${sm ? '' : moGoal()}</div>`;
    if (st.showRulesOnToday) h += moChecks(k);
    if (!sm && (st.showFactorsOnToday || st.showJournalOnToday)) h += `<div class="mo-pair">${st.showFactorsOnToday ? sec('factors', 'Factors', factorsForm(k)) : ''}${st.showJournalOnToday ? sec('journal', 'Feedback journal', journalForm(k)) : ''}</div>`;
    return h + sheetForPrint(k);
  },
  plan() {
    const st = S.settings, t = todayKey(), k = addDays(t, 1), ts = activeTasks(k);
    const undone = activeTasks(t).filter(x => !x.done && x.what);
    const rec = recurringTasks(k).filter(r => !ts.some(x => normName(x.what) === normName(r.t.what)));
    const top = rec.find(r => r.s && r.s.action === 'up') || rec.find(r => r.s && r.s.action === 'down');
    const woops = S.woops.filter(w => w.active && (w.obstacle || w.plan));
    let h = `<div class="mo-h"><span>${esc(niceDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</span><span class="r"><b>${ts.length}/${st.maxTasks}</b> tasks</span></div>
      <div class="mo-bal"><span class="lbl">Balanced plan</span>${moMix(ts, st.maxTasks)}</div>`;
    if (top) h += `<div class="mo-sug"><span><b>${top.s.action === 'up' ? `Make it ~${st.overloadStep}% harder` : 'Ease off a little'}</b> <span class="muted">· ${esc(top.t.what)}: ${esc(top.s.text)}</span></span><button class="btn xs" data-act="addSug" data-i="${rec.indexOf(top)}">Add</button></div>`;
    h += `<div class="mo-two no-print"><button class="btn sm" data-act="carry" ${undone.length ? '' : 'disabled'}>Carry over unfinished (${undone.length})</button><button class="btn sm" data-act="repeatToday" ${activeTasks(t).length ? '' : 'disabled'}>Repeat today, adjusted</button></div>`;
    if (rec.length || woops.length) h += `<div class="mo-pair">${rec.length ? sec('sugs', '7/10 suggestions', rec.map(({ t: x, s }, i) => `<div class="rule-row"><div class="t"><b>${esc(x.what)}</b>${s ? `<div class="sub muted">${esc(s.text)}</div>` : ''}</div><button class="btn xs" data-act="addSug" data-i="${i}">Add</button></div>`).join('')) : ''}${woops.length ? sec('ifthen', 'Your if-then plans', woops.map(w => `<div class="rule-row"><div class="t"><b>${esc(w.wish)}</b><div class="sub">If ${esc(w.obstacle)}, then ${esc(w.plan)}.</div></div></div>`).join('')) : ''}</div>`;
    h += `<div class="mo-two no-print">${moAdd(k)}${moGoal()}</div>`;
    h += moHints(k).join('') + moTasks(k, 'plan', 'Nothing planned for tomorrow yet.');
    return h;
  },
  focus() {
    const tm = S.settings.timer, k = todayKey();
    if (T.left == null) tSet('work', tm.work);
    const task = T.taskId ? findTask(T.taskKey, T.taskId) : null;
    const ts = activeTasks(k).filter(t => !t.done), next = ts.find(t => t.id !== T.taskId);
    const today = S.sessions.filter(s => s.d === k), workMin = today.filter(s => s.type !== 'break').reduce((a, s) => a + s.m, 0);
    const label = { work: 'Deep work', break: 'Break', starter: 'Starter' }[T.mode];
    const on = Math.floor((1 - T.left / T.total) * 30), state = T.running ? (T.mode === 'break' ? 'On break' : 'In the zone') : 'Paused';
    let h = `<div class="mo-fh"><span class="muted">${label}${T.mode !== 'starter' ? ' · block ' + T.cycle : ''}</span><b>${esc(task ? task.what : T.mode === 'break' ? 'Rest your eyes' : 'Pick a task below')}</b></div>
      <div class="mo-ring">${moRing(on)}<div><span class="time" id="tdisp">${mmss(T.left)}</span><span>${state}</span></div></div>
      <p class="mo-msg">${esc(T.mode === 'break' ? tm.breakMsg : tm.workMsg)}</p>
      <div class="mo-ctrls"><button class="mo-rb" data-act="tPlus5" aria-label="Add 5 minutes"><b>+5</b></button>
        <button class="btn primary" data-act="tToggle">${px(T.running ? 'pause' : 'play', 16)}${T.running ? 'Pause' : 'Start'}</button>
        <button class="mo-rb" data-act="tSkip" aria-label="Skip to ${T.mode === 'break' ? 'work' : 'break'}">${px('skip', 20)}</button>
        <button class="mo-rb" data-act="tReset" aria-label="Reset">${px('reset', 20)}</button></div>`;
    if (T.ask) h += `<div class="mo-band"><b>Starter done. Am I willing to continue?</b><div class="row"><button class="btn sm" data-act="tContinue">Yes, full ${tm.work}-min block</button><button class="tx" data-act="tStop">Not now, that's okay</button></div></div>`;
    h += `<div class="mo-box mo-mind"><div class="row between"><button class="chip" data-act="reframe">${px('wave', 14)}Mind wandering?</button>${T.reframe != null ? `<button class="mo-x" data-act="moReframe" aria-label="Close">${px('cu', 16)}</button>` : ''}</div>`;
    if (T.reframe != null) {
      const q = S.settings.reframePrompts[T.reframe] || '', why = S.settings.myWhy, woops = S.woops.filter(w => w.active && w.wish), subj = task ? task.what : 'what I am studying';
      h += `<b>${esc(q)}</b>${why ? `<div><span class="muted">My why · </span>${esc(why)}</div>` : ''}${woops.length ? `<div><span class="muted">Wishes · </span>${woops.map(w => esc(w.wish)).join(' · ')}</div>` : ''}
        <div><span class="muted">Ask a chatbot · </span><span id="aiprompt">What are the real-life implications of ${esc(subj)}, and how can I apply it?</span></div>
        <div class="row"><button class="btn xs" data-act="copyAi">${px('copy', 13)}Copy question</button><button class="btn xs" data-act="reframe">${px('refresh', 13)}Another prompt</button></div>`;
    }
    h += `</div><div class="mo-on"><span class="muted">Work on</span><select data-act-change="pickFocusTask" aria-label="Task to focus on"><option value="">No specific task</option>${ts.map(t => `<option value="${t.id}" ${T.taskId === t.id ? 'selected' : ''}>${esc(t.what || 'Untitled')}</option>`).join('')}</select></div>
      <div class="mo-two"><button class="chip" data-act="tStarter" data-m="${tm.starterG0}">Grade 0 · ${tm.starterG0} min</button><button class="chip" data-act="tStarter" data-m="${tm.starterG1}">Grade 1 · ${tm.starterG1} min</button></div>
      <div class="mo-pair mo-last">${next ? `<button class="mo-next" data-act="focusTask" data-k="${k}" data-id="${next.id}"><span class="muted">Next up</span><b>${esc(next.what || 'Untitled')}</b>${moTag(kindOf(next))}</button>` : '<span></span>'}
      ${sec('pbtoday', `Today · ${workMin} min`, `<div class="mo-blocks">${today.length ? today.slice(-8).map(s => `<span class="chip">${s.m}m${s.task ? ' ' + esc(s.task) : ''}</span>`).join('') : 'No blocks yet.'}</div>
        <div class="grid g4"><label class="f"><span>Work</span>${inp('set|timer.work', tm.work, 'type="number" min="1"')}</label><label class="f"><span>Break</span>${inp('set|timer.brk', tm.brk, 'type="number" min="1"')}</label>
        <label class="f"><span>Long every</span>${inp('set|timer.longEvery', tm.longEvery, 'type="number" min="0"')}</label><label class="f"><span>Long break</span>${inp('set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}</label></div>`, `<span class="cnt">${today.length} block${today.length === 1 ? '' : 's'}</span>`)}</div>`;
    return h;
  },
  woop() {
    let h = `<button class="btn primary block" data-act="addWoop">${px('plus', 16)}New WOOP</button>`;
    if (!S.woops.length) h += `<div class="empty-row">No WOOPs yet.</div>`;
    const steps = [['wish', 'Wish', 'What do I really want?'], ['outcome', 'Outcome', 'What would it look like?'], ['obstacle', 'Obstacle', 'What inside me gets in the way?'], ['plan', 'Plan', 'If the obstacle shows up, then I will…']];
    S.woops.slice().reverse().forEach(w => {
      const p = `woop|${w.id}|`;
      h += `<div class="mo-box mo-card woop">${steps.map(([f, t, q], i) => `<label class="f"><span>${i + 1} · ${t}</span>${f === 'plan' ? `<textarea data-bind="${p}plan" placeholder="${esc(q)}" rows="1">${esc(w.plan)}</textarea>` : `<textarea data-bind="${p}${f}" placeholder="${esc(q)}" rows="1">${esc(w[f])}</textarea>`}</label>`).join('')}
        <div class="row between"><label class="row mo-cb"><input type="checkbox" data-bind="${p}active" data-rr ${w.active ? 'checked' : ''}> Active</label><button class="btn xs danger" data-act="delWoop" data-id="${w.id}">${px('x', 13)}Delete</button></div>
        <div class="mo-two"><button class="btn sm" data-act="visualize" data-id="${w.id}">${px('eye', 14)}Visualize</button><button class="btn sm" data-act="woopTask" data-id="${w.id}">Make tomorrow's task</button></div></div>`;
    });
    return h;
  },
  manual() {
    const st = S.settings, t = todayKey(), active = S.rules.filter(r => r.active), ids = active.map(r => r.id);
    const c7 = compliance(rangeKeys(t, 7), ids), c30 = compliance(rangeKeys(t, 30), ids), ct = compliance([t], ids);
    const dr = (S.days[t] || { rules: {} }).rules, fol = active.filter(r => dr[r.id] === true).length, marked = active.filter(r => dr[r.id] !== undefined).length;
    const reg = regression();
    const circ = (v, txt, l) => `<div class="mo-pcw"><div class="mo-pc"><i style="height:${Math.max(0, Math.min(100, v || 0))}%"></i><span>${txt}</span></div><span class="lbl">${l}</span></div>`;
    let h = `<div class="mo-pcs">${circ(ct, active.length && marked ? `${fol} / ${active.length}` : pct(ct), 'Today')}${circ(c7, pct(c7), '7 days')}${circ(c30, pct(c30), '30 days')}</div>
      <div class="mo-meter"><span class="mo-mw">${moBar(20, Math.round((c7 || 0) / 5))}<em style="left:${st.complianceTarget}%"></em></span><span class="muted">Target <b>${st.complianceTarget}%</b></span></div>`;
    const al = [];
    if (reg && reg.msg) al.push(esc(moReg(reg)));
    if (reg && reg.flagged.length) al.push(`Rules slipping: ${reg.flagged.map(r => esc(r.title)).join(', ')}`);
    if (al.length) h += `<div class="mo-in col">${al.map(m => `<span>${px('alert', 16)}${m}</span>`).join('')}</div>`;
    if (active.length) {
      const days = rangeKeys(t, 14);
      h += `<div class="mo-sec"><div class="mo-h"><span>Last 14 days</span><span class="lbl">14d %</span></div><div class="mo-grid">${days.map(k => `<span class="lbl">${DOW[weekday(k)][0]}</span>`).join('')}
        ${active.map(r => `<span class="rn">${esc(r.title || 'Untitled')}</span><b class="rp">${pct(compliance(days, [r.id]))}</b>${days.map(k => { const v = S.days[k]?.rules[r.id]; return `<button class="ck ${v === true ? 'y' : ''}" data-act="ruleCycle" data-k="${k}" data-id="${r.id}" aria-label="${esc(r.title)} ${k}">${v === true ? px('check', 11) : v === false ? px('x', 10) : ''}</button>`; }).join('')}`).join('')}</div></div>`;
    }
    h += `<button class="btn primary block" data-act="addRule">${px('plus', 16)}New policy</button>`;
    if (!S.rules.length) h += `<div class="empty-row">No policies yet.</div>`;
    S.rules.forEach(r => {
      const p = `rule|${r.id}|`, c = compliance(rangeKeys(t, 30), [r.id]);
      h += `<div class="mo-box mo-card">
        <label class="f"><span>Rule / policy</span>${inp(p + 'title', r.title, 'placeholder="Lights out by 11:00 PM"')}</label>
        <label class="f"><span>1 · Problem detected</span><textarea data-bind="${p}problem" rows="1">${esc(r.problem)}</textarea></label>
        <label class="f"><span>2 · Evidence-based solution</span><textarea data-bind="${p}solution" rows="1">${esc(r.solution)}</textarea></label>
        <label class="f"><span>Details (shown at check-in)</span>${inp(p + 'detail', r.detail, 'placeholder="Phone charges in the kitchen"')}</label>
        <div class="mo-meter"><span class="muted">30-day compliance</span>${moBar(10, Math.round((c || 0) / 10))}<b>${pct(c)}</b></div>
        <div class="row"><label class="row mo-cb"><input type="checkbox" data-bind="${p}active" data-rr ${r.active ? 'checked' : ''}> Active</label><span style="flex:1"></span>
          <button class="mo-rb" data-act="mvRule" data-dir="-1" data-id="${r.id}" aria-label="Move up">${px('up', 14)}</button><button class="mo-rb" data-act="mvRule" data-dir="1" data-id="${r.id}" aria-label="Move down">${px('down', 14)}</button>
          <button class="btn xs danger" data-act="delRule" data-id="${r.id}">${px('x', 13)}Delete</button></div></div>`;
    });
    return h;
  },
  insights() {
    const st = S.settings, t = todayKey(), n = S.ui.range || 14, keys = rangeKeys(t, n);
    const withTasks = keys.filter(k => activeTasks(k).length), all = withTasks.flatMap(k => activeTasks(k));
    const comp = avg(withTasks.map(dayCompletion)), pds = all.filter(x => x.pd).map(x => x.pd), ads = all.filter(x => x.ad).map(x => x.ad);
    const calib = avg(all.filter(x => x.pd && x.ad).map(x => Math.abs(x.ad - x.pd))), sk = streak(), ids = S.rules.filter(r => r.active).map(r => r.id);
    const focus = S.sessions.filter(s => s.d >= keys[0] && s.type !== 'break').reduce((a, s) => a + s.m, 0);
    const stat = (v, l) => `<div class="mo-stat"><b>${v}</b><span class="lbl">${l}</span></div>`;
    let h = `<div class="seg mo-range">${[7, 14, 30, 90].map(r => `<button class="${n === r ? 'on' : ''}" data-act="range" data-v="${r}">${r}${n === r ? ' days' : ''}</button>`).join('')}</div>
      <div class="mo-stats">${stat(pct(comp), 'Completion')}${stat(fmt1(avg(ads)), 'Avg actual diff.')}${stat(sk.n, `Streak${sk.graceUsed ? ` (${sk.graceUsed} grace)` : ''}`)}${stat(pct(compliance(keys, ids)), 'Rule compliance')}
        ${stat(`${withTasks.length}/${n}`, 'Days planned')}${stat(fmt1(avg(pds)), 'Avg predicted')}${stat(fmt1(calib), 'PD vs AD gap')}${stat(`${Math.floor(focus / 60)}h ${focus % 60}m`, 'Focused')}</div>
      <div class="mo-box mo-chart"><b>Daily completion &amp; actual difficulty</b>${moChart(keys)}
        <div class="mo-leg"><span><i class="b"></i>Completion</span><span><i class="l"></i>AD</span><span><i class="d"></i>Target ${st.targetDifficulty}/10</span><span>R rest · G grace</span></div></div>`;
    h += `<div class="mo-sec"><div class="mo-h"><span>Task trends</span></div>${trendsTable(recurringTasks(addDays(t, 1), n), keys)}</div>
      <div class="mo-sec"><div class="mo-h"><span>What affects your performance</span></div>${factorImpact(keys)}</div>
      ${sec('history', 'Journal history', journalHistory(keys))}
      <button class="tx mo-see" data-act="goHistory">See every day in History${px('chev', 14)}</button>`;
    return h;
  },
  history() {
    const f = S.ui.hf || 'all', list = historyList();
    return `<label class="mo-search">${px('search', 16)}<input type="search" id="hsearch" placeholder="Search tasks, notes, journal" value="${esc(S.ui.hq || '')}" aria-label="Search history"></label>
      <div class="mo-row"><div class="seg">${[['all', 'All days'], ['notes', 'With notes']].map(([v, l]) => `<button class="${f === v ? 'on' : ''}" data-act="hFilter" data-v="${v}">${l}</button>`).join('')}</div><span class="muted"><b id="hcount">${histCount}</b> days</span></div>
      <div id="hlist">${list}</div>`;
  },
};

const CMD_HELP = 'today | tomorrow | focus | woop | manual | insights | history | settings | 1-8 | add <task> | done <n> | start | pause | reset | style <name> | help';
function runCmd(raw) {
  const [c0, ...rest] = raw.trim().split(/\s+/), c = (c0 || '').toLowerCase(), arg = rest.join(' ');
  const views = { today: 'attack', t: 'attack', tomorrow: 'plan', plan: 'plan', focus: 'focus', f: 'focus', woop: 'woop', manual: 'manual', insights: 'insights', history: 'history', settings: 'settings' };
  const tabs = navTabs();
  if (!c) return '';
  if (views[c]) { go(views[c]); return 'opened ' + c; }
  if (/^\d+$/.test(c) && tabs[+c - 1]) { go(tabs[+c - 1].id); return 'opened ' + tabs[+c - 1].label.toLowerCase(); }
  if (c === 'help' || c === '?') return CMD_HELP;
  if (c === 'add') {
    if (!arg) return 'usage: add <task>';
    const k = S.ui.view === 'plan' ? addDays(todayKey(), 1) : todayKey();
    getDay(k, true).tasks.push(newTask({ what: arg })); save(); render();
    return `added to ${S.ui.view === 'plan' ? 'tomorrow' : 'today'}: ${arg}`;
  }
  if (c === 'done' || c === 'undo') {
    const t = activeTasks(todayKey())[+arg - 1];
    if (!t) return 'no task ' + (arg || '?') + '. numbers are on the today screen';
    t.done = c === 'done' ? !t.done : false; save(); render();
    return `${t.done ? 'done' : 'not done'}: ${t.what || 'untitled'}`;
  }
  if (c === 'start') { ACT.startFocus(); if (!T.running) ACT.tToggle(); return 'timer running'; }
  if (c === 'pause') { if (T.running) ACT.tToggle(); return 'timer paused'; }
  if (c === 'reset') { ACT.tReset(); return 'timer reset'; }
  if (c === 'style') {
    const st = STYLES.find(x => x.id === arg.toLowerCase() || x.name.toLowerCase() === arg.toLowerCase());
    if (!st) return 'styles: ' + STYLES.map(x => x.id).join(' ');
    ACT.setStyle({ dataset: { v: st.id } }); return 'style ' + st.id;
  }
  if (c === 'clear') return '';
  return `unknown command: ${c}. type help`;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'cmd') return;
  e.preventDefault();
  const i = e.target.querySelector('input'), out = $('#cmdout');
  out.textContent = runCmd(i.value); i.value = '';
});
document.addEventListener('keydown', e => {
  if (layout() !== 'term' || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const tabs = navTabs();
  if (/^[1-9]$/.test(e.key) && tabs[+e.key - 1]) { e.preventDefault(); go(tabs[+e.key - 1].id); }
  else if (e.key === '/' || e.key === ':') { e.preventDefault(); $('#cmd input')?.focus(); }
});

/* ---------- render + routing ---------- */
const layout = () => document.documentElement.dataset.layout || 'tabs';
function render() {
  const v = V[S.ui.view] ? S.ui.view : 'attack';
  const y = window.scrollY;
  $('#main').innerHTML = `<div class="wrap">${(LV[layout()]?.[v] || V[v])()}</div>`;
  $('#main').dataset.view = v;
  document.querySelectorAll('#main .title').forEach(h => { h.dataset.t = h.textContent; });
  window.scrollTo(0, y);
  document.querySelectorAll('.gridwrap').forEach(g => { g.scrollLeft = g.scrollWidth; });
  renderNav();
}
function go(view) {
  if (!V[view]) view = 'attack';
  const changed = S.ui.view !== view;
  S.ui.view = view; save();
  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
  render();
  if (changed) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => go(location.hash.slice(1)));

/* ---------- binding ---------- */
function bindSet(el) {
  const parts = el.dataset.bind.split('|'), kind = parts[0];
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.type === 'number' || 'num' in el.dataset) v = num(el.value);
  switch (kind) {
    case 'task': { const t = findTask(parts[1], parts[2]); if (!t) return; t[parts[3]] = v; break; }
    case 'day': getDay(parts[1], true)[parts[2]] = v; break;
    case 'factor': { const d = getDay(parts[1], true); if (v === '' || v == null) delete d.factors[parts[2]]; else d.factors[parts[2]] = v; break; }
    case 'journal': { const d = getDay(parts[1], true); const q = S.settings.journalPrompts[+parts[2]]; if (q != null) d.journal[q] = v; break; }
    case 'set': setPath(S.settings, parts[1], v); applyTheme(); if (/appName/.test(parts[1])) renderNav(); break;
    case 'list': getPath(S.settings, parts[1])[+parts[2]] = v; break;
    case 'fdef': { const f = S.settings.factors.find(x => x.id === parts[1]); if (!f) return; f[parts[2]] = (parts[2] === 'min' || parts[2] === 'max') ? num(el.value) : v; break; }
    case 'rule': { const r = S.rules.find(x => x.id === parts[1]); if (r) r[parts[2]] = v; break; }
    case 'woop': { const w = S.woops.find(x => x.id === parts[1]); if (w) w[parts[2]] = v; break; }
    case 'tab': { const t = S.settings.tabs.find(x => x.id === parts[1]); if (t) t[parts[2]] = v; renderNav(); break; }
  }
  save();
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'hsearch') { S.ui.hq = el.value; S.ui.hlimit = 30; $('#hlist').innerHTML = historyList(); if ($('#hcount')) $('#hcount').textContent = histCount; return; }
  if (!el.dataset?.bind || el.type === 'checkbox' || el.tagName === 'SELECT') return;
  bindSet(el);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset?.bind) { bindSet(el); if ('rr' in el.dataset) render(); return; }
  const a = el.dataset?.actChange; if (a && CHANGE[a]) CHANGE[a](el);
});
const openMore = new Set();
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.dataset?.more) { d.open ? openMore.add(d.dataset.more) : openMore.delete(d.dataset.more); }
  if (d.dataset?.sec && S.ui.open[d.dataset.sec] !== d.open) { S.ui.open[d.dataset.sec] = d.open; save(); }
}, true);

const CHANGE = {
  pickDate(el) { if (el.value) { S.ui.date = el.value === todayKey() ? null : el.value; render(); } },
  pickFocusTask(el) { T.taskId = el.value || null; T.taskKey = todayKey(); render(); },
  async toggleNotify(el) {
    if (el.checked && 'Notification' in window) {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { el.checked = false; toast('Notifications are blocked by the browser.'); }
    }
    S.settings.timer.notify = el.checked; save();
  },
};

function moveIn(arr, i, dir) { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
function copyText(t) {
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Copy failed. Select the text and copy it.'); } ta.remove(); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => toast('Copied'), fallback); else fallback();
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

const ACT = {
  deckDone(el) { const t = findTask(el.dataset.k, el.dataset.id); if (!t) return; t.done = true; save(); render(); toast('Done: ' + (t.what || 'task')); },
  deckSkip() { deckSkip++; render(); },
  menu(el, e) { e?.preventDefault(); document.documentElement.classList.toggle('menu-open'); },
  setGrade(el) { const t = findTask(el.dataset.k, el.dataset.id); if (!t) return; t.grade = el.dataset.v; save(); render(); },
  pickOpen(el) { const i = el.querySelector('input'); try { i.showPicker(); } catch (e) { i.focus(); } },
  setval(el) {
    const [, k, id, f] = el.dataset.path.split('|'); const t = findTask(k, id); if (!t) return;
    const v = +el.dataset.v; t[f] = t[f] === v ? null : v; save(); render();
  },
  addTask(el) {
    const k = el.dataset.k, t = newTask(); getDay(k, true).tasks.push(t); if (layout() === 'paper' || layout() === 'mono') openTask.clear(); openTask.add(t.id); save(); render();
    document.querySelector(`.editor[data-id="${t.id}"] .what`)?.focus();
  },
  toggleTask(el) { const id = el.dataset.id; if (openTask.has(id)) openTask.delete(id); else { if (layout() === 'paper' || layout() === 'mono') openTask.clear(); openTask.add(id); } render(); },
  startFocus() { const k = todayKey(), t = activeTasks(k).find(x => !x.done); if (t) ACT.focusTask({ dataset: { k, id: t.id } }); else go('focus'); },
  tToggle() { T.running ? tPause() : tStart(); render(); },
  tPlus5() { if (T.left == null) return; T.left += 300; T.total += 300; if (T.running) T.endAt += 300000; nativeSchedule(); render(); },
  delTask: async el => { if (!(await confirmBox('Delete this task?', 'Delete', 'danger'))) return; const d = S.days[el.dataset.k]; d.tasks = d.tasks.filter(t => t.id !== el.dataset.id); save(); render(); },
  dupTask(el) { const d = S.days[el.dataset.k]; const i = d.tasks.findIndex(t => t.id === el.dataset.id); d.tasks.splice(i + 1, 0, newTask({ ...d.tasks[i], id: uid(), done: false, ad: null, movedTo: undefined })); save(); render(); },
  mvTask(el) { const d = S.days[el.dataset.k]; moveIn(d.tasks, d.tasks.findIndex(t => t.id === el.dataset.id), +el.dataset.dir); save(); render(); },
  moveTask(el) {
    const k = el.dataset.k, t = findTask(k, el.dataset.id), to = addDays(k, 1);
    getDay(to, true).tasks.push(newTask({ ...t, id: uid(), done: false, ad: null, movedTo: undefined, carriedFrom: k }));
    t.movedTo = to; save(); render(); toast('Moved to tomorrow');
  },
  focusTask(el) { T.taskKey = el.dataset.k; T.taskId = el.dataset.id; const t = findTask(T.taskKey, T.taskId); if (t && t.grade !== 'full' && !T.running) tSet('starter', t.grade === 'g0' ? S.settings.timer.starterG0 : S.settings.timer.starterG1); go('focus'); },
  applySug(el) { const t = findTask(el.dataset.k, el.dataset.id); if (t) { t.qty = +el.dataset.q; save(); render(); } },
  shiftDate(el) { const k = addDays(S.ui.date || todayKey(), +el.dataset.n); S.ui.date = k === todayKey() ? null : k; render(); },
  goToday() { S.ui.date = null; render(); },
  goHistory() { go('history'); },
  hFilter(el) { S.ui.hf = el.dataset.v; S.ui.hlimit = 30; save(); render(); },
  hMore() { S.ui.hlimit = (S.ui.hlimit || 30) + 30; $('#hlist').innerHTML = historyList(); },
  openDay(el, e) { e.preventDefault(); S.ui.date = el.dataset.k === todayKey() ? null : el.dataset.k; go('attack'); },
  setStatus(el) { const d = getDay(el.dataset.k, true); const def = S.settings.restDays.includes(weekday(el.dataset.k)) ? 'rest' : 'normal'; d.status = el.dataset.v === def ? '' : el.dataset.v; save(); render(); },
  print() { window.print(); },
  ruleSet(el) { const d = getDay(el.dataset.k, true); const v = el.dataset.v === '1'; if (d.rules[el.dataset.id] === v) delete d.rules[el.dataset.id]; else d.rules[el.dataset.id] = v; save(); render(); },
  ruleCycle(el) { const d = getDay(el.dataset.k, true), id = el.dataset.id, v = d.rules[id]; if (v === undefined) d.rules[id] = true; else if (v === true) d.rules[id] = false; else delete d.rules[id]; save(); render(); },
  factorSet(el) {
    const d = getDay(el.dataset.k, true), id = el.dataset.id; let v = el.dataset.v;
    v = v === 'yes' ? true : v === 'no' ? false : +v;
    if (d.factors[id] === v) delete d.factors[id]; else d.factors[id] = v; save(); render();
  },
  carry() {
    const t = todayKey(), k = addDays(t, 1), d = getDay(k, true);
    const undone = activeTasks(t).filter(x => !x.done && x.what);
    undone.forEach(x => { d.tasks.push(newTask({ ...x, id: uid(), done: false, ad: null, movedTo: undefined, carriedFrom: t })); x.movedTo = k; });
    save(); render(); toast(`Carried over ${undone.length} task${undone.length === 1 ? '' : 's'}`);
  },
  repeatToday() {
    const t = todayKey(), k = addDays(t, 1), d = getDay(k, true);
    let n = 0;
    activeTasks(t).filter(x => x.what && !d.tasks.some(y => normName(y.what) === normName(x.what))).forEach(x => {
      const s = suggestFor(x.what, k);
      d.tasks.push(newTask({ what: x.what, qty: s && s.qty != null ? s.qty : x.qty, unit: x.unit, detail: x.detail, when: x.when, where: x.where, pd: x.pd, grade: x.grade })); n++;
    });
    save(); render(); toast(n ? `Added ${n} task${n === 1 ? '' : 's'} with 7/10 adjustments` : 'Nothing new to add');
  },
  addSug(el) {
    const k = addDays(todayKey(), 1);
    const rec = recurringTasks(k).filter(r => !activeTasks(k).some(x => normName(x.what) === normName(r.t.what)));
    const r = rec[+el.dataset.i]; if (!r) return;
    const x = r.t, s = r.s;
    getDay(k, true).tasks.push(newTask({ what: x.what, qty: s && s.qty != null ? s.qty : x.qty, unit: x.unit, detail: x.detail, when: x.when, where: x.where, pd: x.pd }));
    save(); render();
  },
  tStart() { tStart(); render(); },
  tPause() { tPause(); render(); },
  tReset() { tSet(T.mode === 'starter' ? 'work' : T.mode, T.mode === 'break' ? S.settings.timer.brk : S.settings.timer.work); render(); },
  tSkip() { if (T.mode === 'break') { T.cycle++; tSet('work', S.settings.timer.work); } else tSet('break', S.settings.timer.brk); render(); },
  tStarter(el) { tSet('starter', +el.dataset.m); tStart(); render(); },
  tContinue() { tSet('work', S.settings.timer.work); tStart(); render(); },
  tStop() { T.ask = false; tSet('work', S.settings.timer.work); render(); toast('Starting is a win. Come back later.'); },
  reframe() { const n = S.settings.reframePrompts.length; if (!n) return toast('Add reframing prompts in Settings'); let i; do { i = Math.floor(Math.random() * n); } while (n > 1 && i === T.reframe); T.reframe = i; render(); },
  moReframe() { T.reframe = null; render(); },
  copyAi() { copyText($('#aiprompt')?.textContent || ''); },
  addWoop() { S.woops.push({ id: uid(), wish: '', outcome: '', obstacle: '', plan: '', active: true, created: todayKey() }); save(); render(); document.querySelector('.woop input')?.focus(); },
  pbTheme(el) { S.settings.theme = el.dataset.v; save(); applyTheme(); render(); },
  pbWoop(el) { const w = S.woops.find(x => x.id === el.dataset.id), id = 'woop:' + el.dataset.id; S.ui.open[id] = !(w.active ? S.ui.open[id] !== false : S.ui.open[id]); save(); render(); },
  delWoop: async el => { if (!(await confirmBox('Delete this WOOP?', 'Delete', 'danger'))) return; S.woops = S.woops.filter(w => w.id !== el.dataset.id); save(); render(); },
  async visualize(el) {
    const w = S.woops.find(x => x.id === el.dataset.id); if (!w) return;
    const steps = [['Wish', w.wish, 'Hold your wish in mind.'], ['Outcome', w.outcome, 'Imagine the best outcome vividly. How does it feel?'], ['Obstacle', w.obstacle, 'Now picture the obstacle, the moment it actually shows up.'], ['Plan', w.plan ? `If ${w.obstacle || 'the obstacle appears'}, then ${w.plan}.` : '', 'See yourself carrying out the plan.']];
    for (let i = 0; i < steps.length; i++) {
      const [t, v, g] = steps[i];
      const r = await modal(`<div class="eyebrow">${i + 1} / 4 · ${t}</div><p style="font-size:1.35rem;font-weight:800;margin:10px 0">${esc(v || '(empty)')}</p>${isMono() ? '' : `<p class="muted">${g}</p>`}`, [{ label: 'Stop', value: false, cls: 'ghost' }, { label: i < 3 ? 'Next' : 'Done', value: true, cls: 'primary' }]);
      if (!r) return;
    }
  },
  woopTask(el) { const w = S.woops.find(x => x.id === el.dataset.id); if (!w) return; getDay(addDays(todayKey(), 1), true).tasks.push(newTask({ what: w.wish, notes: w.plan ? `If ${w.obstacle}, then ${w.plan}` : '' })); save(); go('plan'); toast('Added to tomorrow'); },
  addRule() { S.rules.unshift({ id: uid(), title: '', detail: '', problem: '', solution: '', active: true, created: todayKey() }); save(); render(); document.querySelector('[data-bind^="rule|"]')?.focus(); },
  delRule: async el => { if (!(await confirmBox('Delete this policy and its history?', 'Delete', 'danger'))) return; S.rules = S.rules.filter(r => r.id !== el.dataset.id); save(); render(); },
  mvRule(el) { moveIn(S.rules, S.rules.findIndex(r => r.id === el.dataset.id), +el.dataset.dir); save(); render(); },
  range(el) { S.ui.range = +el.dataset.v; save(); render(); },
  setStyle(el) { const s = STYLES.find(x => x.id === el.dataset.v); S.settings.style = s.base || s.id; S.settings.simple = !!s.simple; allSettings = false; save(); applyTheme(); render(); toast('Style: ' + s.name); },
  moreTask(el) { moreTask.add(el.dataset.id); render(); },
  allSettings() { allSettings = true; render(); },
  resetAccent() { S.settings.accent = defaultSettings().accent; applyTheme(); save(); render(); },
  toggleRest(el) { const v = +el.dataset.v, a = S.settings.restDays; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); save(); render(); },
  leAdd(el) { getPath(S.settings, el.dataset.path).push(''); save(); render(); const r = document.querySelectorAll(`[data-bind^="list|${el.dataset.path}|"]`); r[r.length - 1]?.focus(); },
  leDel(el) { getPath(S.settings, el.dataset.path).splice(+el.dataset.i, 1); save(); render(); },
  leMove(el) { moveIn(getPath(S.settings, el.dataset.path), +el.dataset.i, +el.dataset.dir); save(); render(); },
  fAdd() { S.settings.factors.push({ id: uid(), name: 'New factor', type: 'scale', min: 1, max: 5 }); save(); render(); },
  fDel(el) { S.settings.factors = S.settings.factors.filter(f => f.id !== el.dataset.id); save(); render(); },
  fMove(el) { const a = S.settings.factors; moveIn(a, a.findIndex(f => f.id === el.dataset.id), +el.dataset.dir); save(); render(); },
  tabMove(el) { moveIn(S.settings.tabs, +el.dataset.i, +el.dataset.dir); save(); render(); },
  async export() {
    const json = JSON.stringify(S);
    if (!NATIVE) return download(`aware-mode-backup-${todayKey()}.json`, JSON.stringify(S, null, 2), 'application/json');
    const ok = await modal(`<h2>Backup</h2><p class="small muted">Copy this text and keep it somewhere safe (notes app, email to yourself). Paste it back with "Paste backup".</p><textarea id="bk" readonly style="min-height:160px;font-family:ui-monospace,monospace;font-size:.75rem">${esc(json)}</textarea>`, [{ label: 'Close', value: false, cls: 'ghost' }, { label: 'Copy backup', value: true, cls: 'primary' }]);
    if (ok) copyText(json);
  },
  async pasteBackup() {
    const txt = await modal(`<h2>Paste backup</h2><p class="small muted">Paste the backup text you copied earlier. This replaces all current data.</p><textarea id="pbk" style="min-height:160px;font-family:ui-monospace,monospace;font-size:.75rem"></textarea>`, [{ label: 'Cancel', value: null, cls: 'ghost' }, { label: 'Replace my data', value: 'go', cls: 'primary' }], () => $('#pbk')?.value);
    if (!txt) return;
    try {
      const data = JSON.parse(txt);
      if (!data || !data.days || !data.settings) throw new Error('Not an Aware Mode backup');
      S = migrate(data); save(); applyTheme(); render(); toast('Backup restored');
    } catch (e) { toast('Restore failed: ' + e.message); }
  },
  import() { const f = $('#importFile'); f.value = ''; f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.days || !data.settings) throw new Error('Not an Aware Mode backup');
      if (!(await confirmBox(`Replace all current data with this backup (${Object.keys(data.days).length} days)?`, 'Replace'))) return;
      S = migrate(data); save(); applyTheme(); render(); toast('Backup imported');
    } catch (e) { toast('Import failed: ' + e.message); }
  }; f.click(); },
  csv() {
    const rows = [['date', 'what', 'qty', 'unit', 'detail', 'when', 'where', 'pd', 'ad', 'done', 'grade', 'notes']];
    taskHistory().forEach(({ k, t }) => rows.push([k, t.what, t.qty ?? '', t.unit, t.detail, t.when, t.where, t.pd ?? '', t.ad ?? '', t.done ? 1 : 0, t.grade, t.notes]));
    download(`aware-mode-tasks-${todayKey()}.csv`, rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  },
  resetSettings: async () => { if (!(await confirmBox('Reset all settings (prompts, factors, timer, labels) to defaults? Your tasks, rules and journal stay.', 'Reset'))) return; S.settings = defaultSettings(); save(); applyTheme(); render(); },
  wipe: async () => { if (!(await confirmBox('Erase ALL data on this device? Export a backup first if you want to keep it.', 'Erase everything', 'danger'))) return; S = fresh(); save(); applyTheme(); go('attack'); },
};
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('trow')) { e.preventDefault(); ACT.toggleTask(e.target); }
});
document.addEventListener('click', e => {
  if (e.target.closest('label.check')) return;
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](a, e); return; }
  const n = e.target.closest('[data-nav]');
  if (n) { e.preventDefault(); document.documentElement.classList.remove('menu-open'); go(n.dataset.nav); }
  else if (e.target.id === 'scrim') document.documentElement.classList.remove('menu-open');
});

/* ---------- boot + loading screen ---------- */
function boot() {
  applyTheme();
  const sp = $('#splash'), first = location.hash.slice(1) || S.ui.view || 'attack';
  if (!sp) return go(first);
  if (S.settings.showSplash === false) { sp.remove(); return go(first); }
  const lines = (S.settings.loadingLines || []).filter(Boolean);
  { const n = (S.settings.appName || 'Aware Mode').split(' '); $('#splashWord').innerHTML = n.length > 1 ? `${esc(n.slice(0, -1).join(' '))} <b>${esc(n.at(-1))}</b>` : `<b>${esc(n[0])}</b>`; }
  $('#splashLine').textContent = lines.length ? lines[Math.floor(Math.random() * lines.length)] : '';
  const cells = sp.querySelectorAll('.blocks i'), pctEl = $('#splashPct');
  const setP = p => { cells.forEach((c, i) => c.classList.toggle('on', i < Math.round(p / 100 * cells.length))); pctEl.textContent = p + '%'; };
  // each step is real work; the short pauses let the bar read as progress
  const steps = [[20, () => streak()], [45, () => regression()], [70, () => recurringTasks(addDays(todayKey(), 1))], [100, () => go(first)]];
  let i = 0;
  const run = () => {
    if (i >= steps.length) { setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 300); }, 180); return; }
    const [p, fn] = steps[i++]; try { fn(); } catch (e) { console.warn(e); } setP(p); setTimeout(run, 160);
  };
  setP(0); setTimeout(run, 120);
}
boot();
// re-render when the day rolls over or the app comes back into view
let lastDay = todayKey();
document.addEventListener('visibilitychange', () => { if (!document.hidden && todayKey() !== lastDay) { lastDay = todayKey(); if (S.ui.view !== 'focus') render(); } });
if (!NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
if (navigator.storage?.persist) navigator.storage.persist().catch(() => { });
