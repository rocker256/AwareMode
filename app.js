'use strict';
/* Attack Mode: a personal, local-first planner built on the "Analog Attack Mode" course notes.
   All data lives in this browser's localStorage under LS_KEY. Export a backup from Settings. */

const LS_KEY = 'attackmode.data.v1';
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
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function defaultSettings() {
  return {
    appName: 'Attack Mode', myWhy: '', theme: 'auto', accent: '#e4572e', fontScale: 100, weekStart: 1,
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
    tabs: TABS.map(t => ({ id: t.id, label: t.label, visible: true })),
  };
}

function fresh() {
  return { v: 1, settings: defaultSettings(), days: {}, rules: [], woops: [], sessions: [], ui: { view: 'attack', open: {}, range: 14 }, created: todayKey() };
}

function migrate(s) {
  const d = defaultSettings();
  s.settings = Object.assign({}, d, s.settings || {});
  for (const k of ['labels', 'placeholders', 'timer']) s.settings[k] = Object.assign({}, d[k], s.settings[k] || {});
  const tabs = s.settings.tabs || [];
  s.settings.tabs = [...tabs.filter(t => TABS.some(x => x.id === t.id)), ...TABS.filter(t => !tabs.some(x => x.id === t.id)).map(t => ({ id: t.id, label: t.label, visible: true }))];
  s.days = s.days || {}; s.rules = s.rules || []; s.woops = s.woops || []; s.sessions = s.sessions || [];
  s.ui = Object.assign({ view: 'attack', open: {}, range: 14 }, s.ui || {});
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

/* ---------- theme ---------- */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const st = S.settings, root = document.documentElement;
  const dark = st.theme === 'dark' || (st.theme === 'auto' && mq.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.setProperty('--accent', st.accent);
  root.style.setProperty('--hard', st.accent);
  root.style.setProperty('--fs', (st.fontScale || 100) + '%');
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = st.accent;
  document.title = st.appName || 'Attack Mode';
}
mq.addEventListener?.('change', applyTheme);

/* ---------- UI primitives ---------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function modal(html, buttons) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}<div class="mbtns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    m.hidden = false;
    m.onclick = e => {
      const b = e.target.closest('[data-mi]');
      if (b) { m.hidden = true; m.innerHTML = ''; res(buttons[+b.dataset.mi].value); }
      else if (e.target === m) { m.hidden = true; m.innerHTML = ''; res(null); }
    };
  });
}
const confirmBox = (msg, ok = 'Yes', cls = 'primary') => modal(`<p>${msg}</p>`, [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: ok, value: true, cls }]);

function sec(id, title, body, extra = '') {
  const open = S.ui.open[id] !== false;
  return `<details class="sec" data-sec="${id}" ${open ? 'open' : ''}><summary>${title}${extra}</summary><div class="body">${body}</div></details>`;
}
function scale(path, val, tgt) {
  let h = '<div class="scale">';
  for (let i = 1; i <= 10; i++) h += `<button type="button" class="${val === i ? 'on' : ''} ${i === tgt ? 'tgt' : ''}" data-act="setval" data-path="${path}" data-v="${i}" aria-label="${i} of 10">${i}</button>`;
  return h + '</div>';
}
function inp(bind, val, attrs = '') { return `<input data-bind="${bind}" value="${esc(val ?? '')}" ${attrs}>`; }

/* ---------- nav ---------- */
function renderNav() {
  const v = S.ui.view;
  $('#nav').innerHTML = S.settings.tabs.filter(t => t.visible || t.id === 'settings').map(t => {
    const icon = TABS.find(x => x.id === t.id).icon;
    return `<a href="#${t.id}" class="${v === t.id ? 'on' : ''}" data-nav="${t.id}"><span class="ic">${icon}</span>${esc(t.label)}</a>`;
  }).join('');
  const name = S.settings.appName || 'Attack Mode';
  const parts = name.split(' ');
  $('#brand').innerHTML = parts.length > 1 ? `${esc(parts.slice(0, -1).join(' '))} <b>${esc(parts.at(-1))}</b>` : `<b>${esc(name)}</b>`;
  const s = streak();
  $('#streak').innerHTML = s.n ? `🔥 ${s.n} day${s.n > 1 ? 's' : ''}` : '';
  $('#streak').hidden = !s.n;
}

/* ---------- task card ---------- */
function taskCard(k, t, i, mode) {
  const st = S.settings, L = st.labels, P = st.placeholders, kind = kindOf(t), tg = st.targetDifficulty;
  const p = `task|${k}|${t.id}|`;
  const today = mode === 'today';
  let meta = '';
  if (t.movedTo) meta = `<span class="muted">Moved to ${esc(niceDate(t.movedTo, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>`;
  else if (today && t.pd && t.ad) {
    const d = t.ad - t.pd;
    meta = d === 0 ? `<span class="muted">Predicted it right: ${t.pd}/10.</span>` : `<span class="muted">${d > 0 ? 'Harder' : 'Easier'} than expected (${t.pd} → ${t.ad}).</span>`;
    if (t.ad <= tg - 2) meta += ` <span class="tag easy">overload next time</span>`;
    if (t.ad >= tg + 2) meta += ` <span class="tag hard">scale back</span>`;
  }
  if (!today && t.what) {
    const s = suggestFor(t.what, k);
    if (s) meta += `<span>${esc(s.text)}</span>${s.qty != null && s.qty !== t.qty ? ` <button class="btn sm" data-act="applySug" data-k="${k}" data-id="${t.id}" data-q="${s.qty}">Apply</button>` : ''}`;
  }
  const gradeTag = t.grade === 'g0' ? '<span class="tag grade">Grade 0 · 1-min</span>' : t.grade === 'g1' ? '<span class="tag grade">Grade 1 · 10-min</span>' : '';
  return `<article class="task ${t.done ? 'done' : ''} ${t.movedTo ? 'moved' : ''}">
    <div class="task-head">
      <span class="num">${pad(i + 1)}</span>
      ${today ? `<label class="check" title="Done"><input type="checkbox" data-bind="${p}done" data-rr ${t.done ? 'checked' : ''} aria-label="Mark done"><span></span></label>` : ''}
      ${inp(p + 'what', t.what, `class="what" placeholder="${esc(P.what)}" aria-label="${esc(L.what)}"`)}
      ${gradeTag}${kind ? `<span class="tag ${kind}">${kind}</span>` : ''}
    </div>
    <div class="fields">
      <label class="f"><span>${esc(L.howMuch)}</span><div class="qty">${inp(p + 'qty', t.qty, 'type="number" step="any" inputmode="decimal" placeholder="0"')}${inp(p + 'unit', t.unit, `placeholder="${esc(P.unit)}"`)}</div></label>
      <label class="f"><span>Detail</span>${inp(p + 'detail', t.detail, `placeholder="${esc(P.detail)}"`)}</label>
      <label class="f"><span>${esc(L.when)}</span>${inp(p + 'when', t.when, 'type="time"')}</label>
      <label class="f"><span>${esc(L.where)}</span>${inp(p + 'where', t.where, `placeholder="${esc(P.where)}"`)}</label>
    </div>
    <div class="diff">
      <div class="dial"><span class="lbl">Predicted difficulty (PD)<b>${t.pd ? t.pd + '/10' : ''}</b></span>${scale(p + 'pd', t.pd, tg)}</div>
      ${today ? `<div class="dial"><span class="lbl">Actual difficulty (AD)<b>${t.ad ? t.ad + '/10' : ''}</b></span>${scale(p + 'ad', t.ad, tg)}</div>` : ''}
    </div>
    ${meta ? `<div class="meta">${meta}</div>` : ''}
    <details class="more" data-more="${t.id}" ${openMore.has(t.id) ? 'open' : ''}><summary>More</summary><div class="body">
      <label class="f"><span>Starter grade (procrastination destroyer)</span>
        <select data-bind="${p}grade" data-rr>
          <option value="full" ${t.grade === 'full' ? 'selected' : ''}>Full task</option>
          <option value="g1" ${t.grade === 'g1' ? 'selected' : ''}>Grade 1: ${st.timer.starterG1}-minute version</option>
          <option value="g0" ${t.grade === 'g0' ? 'selected' : ''}>Grade 0: ${st.timer.starterG0}-minute version</option>
        </select></label>
      <label class="f"><span>Notes</span><textarea data-bind="${p}notes" placeholder="Obstacles, time spent, why it went the way it did">${esc(t.notes)}</textarea></label>
      <div class="row">
        <button class="btn sm" data-act="focusTask" data-k="${k}" data-id="${t.id}">◷ Focus on this</button>
        ${today && !t.done && !t.movedTo ? `<button class="btn sm" data-act="moveTask" data-k="${k}" data-id="${t.id}">→ Tomorrow</button>` : ''}
        <button class="btn sm" data-act="dupTask" data-k="${k}" data-id="${t.id}">Duplicate</button>
        <button class="icon-btn" data-act="mvTask" data-dir="-1" data-k="${k}" data-id="${t.id}" title="Move up">↑</button>
        <button class="icon-btn" data-act="mvTask" data-dir="1" data-k="${k}" data-id="${t.id}" title="Move down">↓</button>
        <span style="flex:1"></span>
        <button class="btn sm danger" data-act="delTask" data-k="${k}" data-id="${t.id}">Delete</button>
      </div>
    </div></details>
  </article>`;
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
  const d = getDay(k) || { tasks: [], factors: {}, journal: {}, rules: {}, note: '' };
  const ts = activeTasks(k), status = dayStatus(k);
  const done = ts.filter(x => x.done).length;
  const mins = S.sessions.filter(s => s.d === k && s.type !== 'break').reduce((a, s) => a + s.m, 0);
  const reg = regression();
  const now = new Date();
  const tomorrowEmpty = !activeTasks(addDays(t, 1)).length;
  let h = `<div class="dayhead">
    <div><div class="eyebrow">${k === t ? 'Attack today' : k > t ? 'Planned day' : 'Past day'} · ${esc(niceDate(k))}</div>
      <h1 class="title"><u>Attack Today</u>/Tomorrow</h1></div>
    <div class="datenav no-print">
      <button class="icon-btn" data-act="shiftDate" data-n="-1" aria-label="Previous day">◀</button>
      <input type="date" value="${k}" data-act-change="pickDate" aria-label="Pick date">
      <button class="icon-btn" data-act="shiftDate" data-n="1" aria-label="Next day">▶</button>
      ${k !== t ? '<button class="btn sm" data-act="goToday">Today</button>' : ''}
    </div></div>`;
  if (st.showPrinciple && st.principles.length) h += `<div class="principle">${esc(st.principles[(parseKey(k).getTime() / 864e5 | 0) % st.principles.length])}</div>`;
  if (reg && (reg.level === 'bad' || reg.level === 'warn') && k === t) h += `<div class="hint ${reg.level}" style="margin:10px 0"><b>⚠</b><div>${esc(reg.msg)} <a href="#manual">Open manual</a></div></div>`;
  if (k === t && now.getHours() >= st.planReminderHour && tomorrowEmpty) h += `<div class="hint accent" style="margin:10px 0"><b>➜</b><div>Plan tomorrow before today ends. <a href="#plan">Build tomorrow now</a></div></div>`;

  h += `<div class="card"><div class="row between" style="margin-bottom:10px">
      <div class="seg" role="group" aria-label="Day type">
        ${['normal', 'grace', 'rest'].map(s => `<button class="${status === s ? 'on' : ''}" data-act="setStatus" data-k="${k}" data-v="${s}">${s === 'normal' ? 'Attack day' : s === 'grace' ? 'Grace day' : 'Rest day'}</button>`).join('')}
      </div>
      <button class="btn sm no-print" data-act="print">Print sheet</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="v">${done}/${ts.length}</div><div class="k">Done</div></div>
      <div class="stat"><div class="v">${fmt1(dayAvg(k, 'pd'))}</div><div class="k">Avg PD</div></div>
      <div class="stat"><div class="v">${fmt1(dayAvg(k, 'ad'))}</div><div class="k">Avg AD</div></div>
      <div class="stat"><div class="v">${mins}<span class="small muted"> min</span></div><div class="k">Focused</div></div>
    </div>
    ${status !== 'normal' ? `<div class="hint ${status === 'rest' ? 'good' : ''}" style="margin-top:10px">${status === 'rest' ? 'Rest day. Recovery is part of the system and it won\'t break your streak.' : 'Grace day. Life happened. The streak is protected; do what you can.'}</div>` : ''}
    </div>`;

  dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
  if (!ts.length && !(d.tasks || []).length) h += `<div class="empty">No tasks for this day yet.<br><span class="small">Tip: ${st.hardTasksTarget} tasks around ${st.targetDifficulty}/10, the rest easy or medium.</span></div>`;
  (d.tasks || []).forEach((x, i) => { h += taskCard(k, x, i, 'today'); });
  h += `<button class="add-task no-print" data-act="addTask" data-k="${k}">+ Add task</button>`;
  h += `<div class="goal">Next day attack goal: <b>${st.targetDifficulty}/10</b></div>`;

  if (st.showRulesOnToday) h += sec('rules', 'Company manual check-in', rulesCheckin(k), compBadge(k));
  if (st.showFactorsOnToday) h += sec('factors', 'Factors', factorsForm(k));
  if (st.showJournalOnToday) h += sec('journal', 'Feedback journal', journalForm(k));
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
  const d = getDay(k) || { tasks: [] };
  const undone = activeTasks(t).filter(x => !x.done && x.what);
  const rec = recurringTasks(k).filter(r => !activeTasks(k).some(x => normName(x.what) === normName(r.t.what)));
  let h = `<div class="eyebrow">Build a tomorrow · ${esc(niceDate(k))}</div><h1 class="title">Plan <u>Tomorrow</u></h1>
    <p class="muted">Plan tomorrow before today ends: exact tasks, amounts, times. Wake up with clarity, not decisions.</p>`;
  h += `<div class="row no-print" style="margin:10px 0">
    <button class="btn" data-act="carry" ${undone.length ? '' : 'disabled'}>Carry over unfinished (${undone.length})</button>
    <button class="btn" data-act="repeatToday" ${activeTasks(t).length ? '' : 'disabled'}>Repeat today with 7/10 adjustments</button></div>`;
  dayHints(k).forEach(([c, m]) => { h += `<div class="hint ${c}" style="margin:8px 0">${esc(m)}</div>`; });
  if (!d.tasks.length) h += `<div class="empty">Nothing planned for tomorrow yet.</div>`;
  d.tasks.forEach((x, i) => { h += taskCard(k, x, i, 'plan'); });
  h += `<button class="add-task" data-act="addTask" data-k="${k}">+ Add task for tomorrow</button>`;
  h += `<div class="goal">Next day attack goal: <b>${st.targetDifficulty}/10</b></div>`;
  if (rec.length) {
    h += sec('sugs', '7/10 suggestions', `<p class="small muted" style="margin-top:0">From your recent tasks. When the actual difficulty drops below ${st.targetDifficulty - st.tolerance}, add load. Above ${st.targetDifficulty + st.tolerance}, ease off.</p>` +
      rec.map(({ t: x, s }, i) => `<div class="rule-row"><div class="t"><b>${esc(x.what)}</b><div class="small muted">${s ? esc(s.text) : 'No actual difficulty rated yet. Rate AD to get overload suggestions.'}</div></div>
       <button class="btn sm" data-act="addSug" data-i="${i}">+ Add</button></div>`).join(''));
  }
  const woops = S.woops.filter(w => w.active && (w.obstacle || w.plan));
  if (woops.length) h += sec('ifthen', 'Your if-then plans', woops.map(w => `<div class="rule-row"><div class="t"><b>${esc(w.wish)}</b><div class="small">If <i>${esc(w.obstacle)}</i>, then <i>${esc(w.plan)}</i>.</div></div></div>`).join(''));
  return h;
};

/* ---------- focus timer (30/10) ---------- */
const T = { mode: 'work', running: false, endAt: 0, left: null, total: null, cycle: 1, taskKey: null, taskId: null, ask: false, reframe: null };
function tSet(mode, min) { T.mode = mode; T.left = T.total = Math.max(1, Math.round(min * 60)); T.running = false; T.ask = false; }
function tStart() { if (T.running) return; if (T.left == null) tSet('work', S.settings.timer.work); T.endAt = Date.now() + T.left * 1000; T.running = true; unlockAudio(); }
function tPause() { if (!T.running) return; T.left = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000)); T.running = false; }
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
    const c = $('#tring'); if (c) c.style.strokeDashoffset = String(CIRC * (1 - T.left / T.total));
  }
  document.title = T.running ? `${mmss(T.left)} · ${T.mode === 'break' ? 'Break' : 'Focus'}` : (S.settings.appName || 'Attack Mode');
}, 500);
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const CIRC = 2 * Math.PI * 54;

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
  const today = S.sessions.filter(s => s.d === k);
  const label = { work: 'Focus', break: 'Break', starter: 'Starter' }[T.mode];
  let h = `<div class="eyebrow">30/10 system</div><h1 class="title">Focus <u>Mode</u></h1>`;
  h += `<div class="card ink"><div class="timer">
    <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface2)" stroke-width="8"/>
      <circle id="tring" cx="60" cy="60" r="54" fill="none" stroke="${T.mode === 'break' ? 'var(--good)' : 'var(--accent)'}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - T.left / T.total)}"/></svg>
      <div class="center"><div class="mode ${T.mode === 'break' ? 'break' : ''}">${label}${T.mode !== 'starter' ? ' · ' + T.cycle : ''}</div><div class="time" id="tdisp">${mmss(T.left)}</div>
      <div class="small muted" style="max-width:70%">${esc(task ? task.what : '')}</div></div></div>
    <p class="muted" style="text-align:center;max-width:460px">${esc(T.mode === 'break' ? tm.breakMsg : tm.workMsg)}</p>
    <div class="row" style="justify-content:center">
      ${T.running ? '<button class="btn primary" data-act="tPause">Pause</button>' : `<button class="btn primary" data-act="tStart">${T.left < T.total ? 'Resume' : 'Start'}</button>`}
      <button class="btn" data-act="tReset">Reset</button>
      <button class="btn" data-act="tSkip">Skip to ${T.mode === 'break' ? 'work' : 'break'}</button>
    </div></div>`;
  if (T.ask) h += `<div class="hint accent" style="margin-top:14px;flex-direction:column"><b>Starter done. Am I willing to continue?</b><div class="row"><button class="btn primary sm" data-act="tContinue">Yes, start a full ${tm.work}-min block</button><button class="btn sm" data-act="tStop">Not now, and that's okay</button></div></div>`;
  h += `</div>`;

  h += `<div class="card"><h2>Work on</h2><div class="row" style="margin-top:8px">
     <select data-act-change="pickFocusTask" style="flex:1;min-width:200px"><option value="">No specific task</option>${ts.map(t => `<option value="${t.id}" ${T.taskId === t.id ? 'selected' : ''}>${esc(t.what || 'Untitled')}</option>`).join('')}</select></div>
     <div class="row" style="margin-top:10px">
       <button class="btn" data-act="tStarter" data-m="${tm.starterG0}">Grade 0 · ${tm.starterG0}-min start</button>
       <button class="btn" data-act="tStarter" data-m="${tm.starterG1}">Grade 1 · ${tm.starterG1}-min start</button>
     </div><p class="small muted">Can't start? Do the tiny version. No pressure to do more. Stress feeds procrastination.</p></div>`;

  h += `<div class="card"><div class="row between"><h2>Mind wandering?</h2><button class="btn sm" data-act="reframe">Reframe</button></div>`;
  if (T.reframe != null) {
    const q = S.settings.reframePrompts[T.reframe] || '';
    const why = S.settings.myWhy;
    const woops = S.woops.filter(w => w.active && w.wish);
    const subj = task ? task.what : 'what I am studying';
    h += `<div class="reframe" style="margin-top:10px"><div class="eyebrow">Cognitive reframing</div><p class="q">${esc(q)}</p>
      ${why ? `<p><b>My why:</b> ${esc(why)}</p>` : '<p class="small muted">Add your personal "why" in Settings and it shows up here.</p>'}
      ${woops.length ? `<p class="small"><b>Wishes:</b> ${woops.map(w => esc(w.wish)).join(' · ')}</p>` : ''}
      <p class="small muted">Ask a chatbot: <span class="kbd" id="aiprompt">What are the real-life implications of ${esc(subj)}, and how can I apply it?</span> <button class="btn sm" data-act="copyAi">Copy</button></p>
      <button class="btn sm" data-act="reframe">Another prompt</button></div>`;
  } else h += `<p class="small muted">Attention drifting is vigilance decrement, not failure. Tap Reframe to reconnect with why this matters.</p>`;
  h += `</div>`;

  const workMin = today.filter(s => s.type !== 'break').reduce((a, s) => a + s.m, 0);
  h += `<div class="card"><h2>Today's sessions</h2><p>${today.length} block${today.length === 1 ? '' : 's'} · <b>${workMin} min</b> focused</p>
    ${today.length ? `<div class="small muted">${today.slice(-12).map(s => `${s.m} min${s.task ? ' · ' + esc(s.task) : ''}${s.type === 'starter' ? ' (starter)' : ''}`).join('<br>')}</div>` : ''}
    <div class="grid g4" style="margin-top:12px">
      <label class="f"><span>Work min</span>${inp('set|timer.work', tm.work, 'type="number" min="1"')}</label>
      <label class="f"><span>Break min</span>${inp('set|timer.brk', tm.brk, 'type="number" min="1"')}</label>
      <label class="f"><span>Long break every</span>${inp('set|timer.longEvery', tm.longEvery, 'type="number" min="0" title="0 = never"')}</label>
      <label class="f"><span>Long break min</span>${inp('set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}</label>
    </div><p class="small muted">Changes apply to the next block. More timer options in Settings.</p></div>`;
  return h;
};

/* ---------- WOOP ---------- */
V.woop = () => {
  let h = `<div class="eyebrow">MCII · mental contrasting with implementation intentions</div><h1 class="title"><u>WOOP</u> Planner</h1>
    <p class="muted">Wish → Outcome → Obstacle → Plan. Visualize the obstacle and decide in advance what you will do when it shows up.</p>
    <button class="btn primary" data-act="addWoop">+ New WOOP</button>`;
  if (!S.woops.length) h += `<div class="empty">No WOOPs yet.<br><span class="small">Example: Wish: read 10 chapters · Outcome: pass the exam · Obstacle: I start gaming · Plan: if I feel the urge to game, I put the controller in another room and read 1 page.</span></div>`;
  S.woops.slice().reverse().forEach(w => {
    const p = `woop|${w.id}|`;
    h += `<div class="card woop ${w.active ? 'ink' : ''}"><div class="woop-grid">
      <span class="letter">W</span><label class="f"><span>Wish: what I want to achieve</span>${inp(p + 'wish', w.wish, 'placeholder="I want to read 10 chapters"')}</label>
      <span class="letter">O</span><label class="f"><span>Outcome: the best result</span>${inp(p + 'outcome', w.outcome, 'placeholder="I will pass the exam"')}</label>
      <span class="letter">O</span><label class="f"><span>Obstacle: what inside me gets in the way</span>${inp(p + 'obstacle', w.obstacle, 'placeholder="I start gaming instead of studying"')}</label>
      <span class="letter">P</span><label class="f"><span>Plan: if (obstacle), then I will…</span><textarea data-bind="${p}plan" placeholder="put the controller in another room and read 1 page">${esc(w.plan)}</textarea></label>
    </div><div class="row" style="margin-top:10px">
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
    <div class="seg" style="margin:10px 0">${[7, 14, 30, 90].map(r => `<button class="${n === r ? 'on' : ''}" data-act="range" data-v="${r}">${r} days</button>`).join('')}</div>`;
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
  h += sec('history', 'Journal history', journalHistory(keys));
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
    if (c != null) { const bh = Math.max(2, ih * c / 100); s += `<rect x="${x + bw * 0.18}" y="${Tp + ih - bh}" width="${bw * 0.64}" height="${bh}" rx="2" fill="var(--accent)" opacity=".85"><title>${k}: ${Math.round(c)}%</title></rect>`; }
    else if (st === 'rest' || st === 'grace') s += `<text x="${x + bw / 2}" y="${Tp + ih - 4}" font-size="9" text-anchor="middle" fill="var(--muted)">${st === 'rest' ? 'R' : 'G'}</text>`;
    const a = dayAvg(k, 'ad'); if (a != null) pts.push([x + bw / 2, Tp + ih - ih * a / 10]);
    const step = Math.ceil(keys.length / 10);
    if (i % step === 0) s += `<text x="${x + bw / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${parseKey(k).getDate()}</text>`;
  });
  if (pts.length > 1) s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
  pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--ink)"/>`; });
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
  const st = S.settings, tm = st.timer;
  let h = `<div class="eyebrow">Everything is yours to change</div><h1 class="title"><u>Settings</u></h1>`;
  h += sec('s-general', 'General', `<div class="grid g2">
      ${field('App name', 'set|appName', st.appName)}
      <label class="f"><span>Theme</span><select data-bind="set|theme" data-rr>${['auto', 'light', 'dark'].map(v => `<option ${st.theme === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f"><span>Accent colour</span><div class="row"><input type="color" data-bind="set|accent" value="${esc(st.accent)}"> <button class="btn sm ghost" data-act="resetAccent">Reset</button></div></label>
      ${field('Text size %', 'set|fontScale', st.fontScale, 'type="number" min="80" max="140" step="5"')}
      <label class="f"><span>Week starts on</span><select data-bind="set|weekStart" data-num data-rr>${DOW.map((d, i) => `<option value="${i}" ${+st.weekStart === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
    </div>
    <label class="f" style="margin-top:10px"><span>My why (shown when reframing)</span><textarea data-bind="set|myWhy" placeholder="Who or what you are doing this for">${esc(st.myWhy)}</textarea></label>
    <div class="stack" style="margin-top:10px">${check('Show a principle on the Today page', 'set|showPrinciple', st.showPrinciple)}${check('Show rules check-in on Today', 'set|showRulesOnToday', st.showRulesOnToday)}${check('Show factors on Today', 'set|showFactorsOnToday', st.showFactorsOnToday)}${check('Show feedback journal on Today', 'set|showJournalOnToday', st.showJournalOnToday)}</div>`);
  h += sec('s-710', '7/10 system & daily plan', `<div class="grid g3">
      ${field('Target difficulty (/10)', 'set|targetDifficulty', st.targetDifficulty, 'type="number" min="1" max="10"')}
      ${field('Hard tasks per day', 'set|hardTasksTarget', st.hardTasksTarget, 'type="number" min="0" max="10"')}
      ${field('Max tasks per day', 'set|maxTasks', st.maxTasks, 'type="number" min="1" max="30"')}
      ${field('"Easy" is PD ≤', 'set|easyMax', st.easyMax, 'type="number" min="1" max="9"')}
      ${field('Tolerance (± around target)', 'set|tolerance', st.tolerance, 'type="number" min="0" max="4" step="0.5"')}
      ${field('Overload step %', 'set|overloadStep', st.overloadStep, 'type="number" min="5" max="100" step="5"')}
      ${field('Look back (attempts)', 'set|lookback', st.lookback, 'type="number" min="1" max="10"')}
      ${field('Plan-tomorrow reminder hour', 'set|planReminderHour', st.planReminderHour, 'type="number" min="0" max="23"')}
      ${field('Day "won" at completion %', 'set|winThreshold', st.winThreshold, 'type="number" min="1" max="100"')}
    </div>`);
  h += sec('s-labels', 'Task field labels', `<div class="grid g2">
      ${field('"What" label', 'set|labels.what', st.labels.what)}${field('"How much" label', 'set|labels.howMuch', st.labels.howMuch)}
      ${field('"When" label', 'set|labels.when', st.labels.when)}${field('"Where" label', 'set|labels.where', st.labels.where)}
      ${field('Task placeholder', 'set|placeholders.what', st.placeholders.what)}${field('Unit placeholder', 'set|placeholders.unit', st.placeholders.unit)}
      ${field('Detail placeholder', 'set|placeholders.detail', st.placeholders.detail)}${field('Where placeholder', 'set|placeholders.where', st.placeholders.where)}</div>`);
  h += sec('s-flex', 'Flexible system', `<div class="grid g2">${field('Grace days per week', 'set|graceDaysPerWeek', st.graceDaysPerWeek, 'type="number" min="0" max="7"')}</div>
      <div class="lbl" style="margin-top:12px">Rest days</div><div class="pills" style="margin-top:6px">${DOW.map((d, i) => `<button class="${st.restDays.includes(i) ? 'on' : ''}" data-act="toggleRest" data-v="${i}">${d}</button>`).join('')}</div>
      <p class="small muted">Missed days within your weekly grace allowance don't break the streak. Rest days never do.</p>`);
  h += sec('s-timer', 'Focus timer', `<div class="grid g3">
      ${field('Work min', 'set|timer.work', tm.work, 'type="number" min="1"')}${field('Break min', 'set|timer.brk', tm.brk, 'type="number" min="1"')}
      ${field('Long break every N blocks (0 = off)', 'set|timer.longEvery', tm.longEvery, 'type="number" min="0"')}${field('Long break min', 'set|timer.longBrk', tm.longBrk, 'type="number" min="1"')}
      ${field('Grade 0 starter min', 'set|timer.starterG0', tm.starterG0, 'type="number" min="1"')}${field('Grade 1 starter min', 'set|timer.starterG1', tm.starterG1, 'type="number" min="1"')}</div>
      ${field('Message during work', 'set|timer.workMsg', tm.workMsg)}${field('Message during break', 'set|timer.breakMsg', tm.breakMsg)}
      <div class="stack" style="margin-top:10px">${check('Auto-start the next block', 'set|timer.autoStart', tm.autoStart)}${check('Sound + vibration', 'set|timer.sound', tm.sound)}
      <label class="row small"><input type="checkbox" data-act-change="toggleNotify" ${tm.notify ? 'checked' : ''}> Notifications when a block ends</label></div>`);
  h += sec('s-factors', 'Factors to track', `<p class="small muted" style="margin-top:0">Sleep, diet, activity, meal size, exhaustion, noise, or anything else you suspect affects you.</p>` +
    st.factors.map(f => `<div class="fdef">${inp(`fdef|${f.id}|name`, f.name, 'aria-label="Factor name"')}
      <select data-bind="fdef|${f.id}|type" data-rr aria-label="Type">${[['scale', 'Scale'], ['number', 'Number'], ['yesno', 'Yes / No'], ['text', 'Text']].map(([v, l]) => `<option value="${v}" ${f.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${f.type === 'scale' ? inp(`fdef|${f.id}|min`, f.min, 'type="number" aria-label="Min" title="Min"') + inp(`fdef|${f.id}|max`, f.max, 'type="number" aria-label="Max" title="Max"') : '<span></span><span></span>'}
      ${f.type === 'number' ? inp(`fdef|${f.id}|unit`, f.unit, 'placeholder="unit" aria-label="Unit"') : '<span></span>'}
      <span><button class="icon-btn" data-act="fMove" data-id="${f.id}" data-dir="-1">↑</button><button class="icon-btn" data-act="fMove" data-id="${f.id}" data-dir="1">↓</button><button class="icon-btn" data-act="fDel" data-id="${f.id}">✕</button></span></div>`).join('')
    + `<button class="btn sm" data-act="fAdd">+ Add factor</button>`);
  h += sec('s-journal', 'Journal prompts', listEditor('journalPrompts', 'Prompt', 'Questions for your daily feedback journal (metacognition).'));
  h += sec('s-reframe', 'Reframing prompts', listEditor('reframePrompts', 'Prompt', 'Shown when your mind wanders during a focus block.'));
  h += sec('s-principles', 'Principles', listEditor('principles', 'Principle', 'One rotates onto the Today page each day.'));
  h += sec('s-manual', 'Company manual', `<div class="grid g2">${field('Compliance target %', 'set|complianceTarget', st.complianceTarget, 'type="number" min="1" max="100"')}${field('Regression alert: weekly drop of (pts)', 'set|regressionDrop', st.regressionDrop, 'type="number" min="1" max="100"')}</div>
      <div style="margin-top:10px">${check('Skip rule tracking on rest days', 'set|restSkipsRules', st.restSkipsRules)}</div>`);
  h += sec('s-tabs', 'Navigation', st.tabs.map((t, i) => `<div class="le-row">${t.id === 'settings' ? '<span style="width:18px"></span>' : `<input type="checkbox" data-bind="tab|${t.id}|visible" data-rr ${t.visible ? 'checked' : ''} aria-label="Show ${esc(t.label)}">`}
      ${inp(`tab|${t.id}|label`, t.label)}<button class="icon-btn" data-act="tabMove" data-i="${i}" data-dir="-1">↑</button><button class="icon-btn" data-act="tabMove" data-i="${i}" data-dir="1">↓</button></div>`).join(''));
  h += sec('s-data', 'Data & backup', `<p class="small muted" style="margin-top:0">Your data is stored only in this browser on this device. Export a backup regularly, and use it to move data between phone and laptop.</p>
      <div class="row"><button class="btn primary" data-act="export">Export backup (.json)</button><button class="btn" data-act="import">Import backup</button><button class="btn" data-act="csv">Export tasks (.csv)</button></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-act="resetSettings">Reset settings to defaults</button><button class="btn sm danger" data-act="wipe">Erase all data</button></div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <p class="small muted">Install: on iPhone open the share menu → Add to Home Screen. On Android/Chrome/Edge use the Install option in the browser menu.</p>`);
  return h;
};

/* ---------- path helpers ---------- */
function getPath(o, p) { return p.split('.').reduce((a, k) => a?.[k], o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }

/* ---------- render + routing ---------- */
function render() {
  const v = V[S.ui.view] ? S.ui.view : 'attack';
  const y = window.scrollY;
  $('#main').innerHTML = `<div class="wrap">${V[v]()}</div>`;
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
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

const ACT = {
  setval(el) {
    const [, k, id, f] = el.dataset.path.split('|'); const t = findTask(k, id); if (!t) return;
    const v = +el.dataset.v; t[f] = t[f] === v ? null : v; save(); render();
  },
  addTask(el) {
    const k = el.dataset.k; const d = getDay(k, true); d.tasks.push(newTask()); save(); render();
    const inputs = document.querySelectorAll('.task .what'); inputs[inputs.length - 1]?.focus();
  },
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
  copyAi() { const t = $('#aiprompt')?.textContent || ''; navigator.clipboard?.writeText(t).then(() => toast('Copied'), () => toast('Copy failed')); },
  addWoop() { S.woops.push({ id: uid(), wish: '', outcome: '', obstacle: '', plan: '', active: true, created: todayKey() }); save(); render(); document.querySelector('.woop input')?.focus(); },
  delWoop: async el => { if (!(await confirmBox('Delete this WOOP?', 'Delete', 'danger'))) return; S.woops = S.woops.filter(w => w.id !== el.dataset.id); save(); render(); },
  async visualize(el) {
    const w = S.woops.find(x => x.id === el.dataset.id); if (!w) return;
    const steps = [['Wish', w.wish, 'Hold your wish in mind.'], ['Outcome', w.outcome, 'Imagine the best outcome vividly. How does it feel?'], ['Obstacle', w.obstacle, 'Now picture the obstacle, the moment it actually shows up.'], ['Plan', w.plan ? `If ${w.obstacle || 'the obstacle appears'}, then ${w.plan}.` : '', 'See yourself carrying out the plan.']];
    for (let i = 0; i < steps.length; i++) {
      const [t, v, g] = steps[i];
      const r = await modal(`<div class="eyebrow">${i + 1} / 4 · ${t}</div><p style="font-size:1.35rem;font-weight:800;margin:10px 0">${esc(v || '(empty)')}</p><p class="muted">${g}</p>`, [{ label: 'Stop', value: false, cls: 'ghost' }, { label: i < 3 ? 'Next' : 'Done', value: true, cls: 'primary' }]);
      if (!r) return;
    }
  },
  woopTask(el) { const w = S.woops.find(x => x.id === el.dataset.id); if (!w) return; getDay(addDays(todayKey(), 1), true).tasks.push(newTask({ what: w.wish, notes: w.plan ? `If ${w.obstacle}, then ${w.plan}` : '' })); save(); go('plan'); toast('Added to tomorrow'); },
  addRule() { S.rules.unshift({ id: uid(), title: '', detail: '', problem: '', solution: '', active: true, created: todayKey() }); save(); render(); document.querySelector('[data-bind^="rule|"]')?.focus(); },
  delRule: async el => { if (!(await confirmBox('Delete this policy and its history?', 'Delete', 'danger'))) return; S.rules = S.rules.filter(r => r.id !== el.dataset.id); save(); render(); },
  mvRule(el) { moveIn(S.rules, S.rules.findIndex(r => r.id === el.dataset.id), +el.dataset.dir); save(); render(); },
  range(el) { S.ui.range = +el.dataset.v; save(); render(); },
  resetAccent() { S.settings.accent = defaultSettings().accent; applyTheme(); save(); render(); },
  toggleRest(el) { const v = +el.dataset.v, a = S.settings.restDays; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); save(); render(); },
  leAdd(el) { getPath(S.settings, el.dataset.path).push(''); save(); render(); const r = document.querySelectorAll(`[data-bind^="list|${el.dataset.path}|"]`); r[r.length - 1]?.focus(); },
  leDel(el) { getPath(S.settings, el.dataset.path).splice(+el.dataset.i, 1); save(); render(); },
  leMove(el) { moveIn(getPath(S.settings, el.dataset.path), +el.dataset.i, +el.dataset.dir); save(); render(); },
  fAdd() { S.settings.factors.push({ id: uid(), name: 'New factor', type: 'scale', min: 1, max: 5 }); save(); render(); },
  fDel(el) { S.settings.factors = S.settings.factors.filter(f => f.id !== el.dataset.id); save(); render(); },
  fMove(el) { const a = S.settings.factors; moveIn(a, a.findIndex(f => f.id === el.dataset.id), +el.dataset.dir); save(); render(); },
  tabMove(el) { moveIn(S.settings.tabs, +el.dataset.i, +el.dataset.dir); save(); render(); },
  export() { download(`attack-mode-backup-${todayKey()}.json`, JSON.stringify(S, null, 2), 'application/json'); },
  import() { const f = $('#importFile'); f.value = ''; f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.days || !data.settings) throw new Error('Not an Attack Mode backup');
      if (!(await confirmBox(`Replace all current data with this backup (${Object.keys(data.days).length} days)?`, 'Replace'))) return;
      S = migrate(data); save(); applyTheme(); render(); toast('Backup imported');
    } catch (e) { toast('Import failed: ' + e.message); }
  }; f.click(); },
  csv() {
    const rows = [['date', 'what', 'qty', 'unit', 'detail', 'when', 'where', 'pd', 'ad', 'done', 'grade', 'notes']];
    taskHistory().forEach(({ k, t }) => rows.push([k, t.what, t.qty ?? '', t.unit, t.detail, t.when, t.where, t.pd ?? '', t.ad ?? '', t.done ? 1 : 0, t.grade, t.notes]));
    download(`attack-mode-tasks-${todayKey()}.csv`, rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  },
  resetSettings: async () => { if (!(await confirmBox('Reset all settings (prompts, factors, timer, labels) to defaults? Your tasks, rules and journal stay.', 'Reset'))) return; S.settings = defaultSettings(); save(); applyTheme(); render(); },
  wipe: async () => { if (!(await confirmBox('Erase ALL data on this device? Export a backup first if you want to keep it.', 'Erase everything', 'danger'))) return; S = fresh(); save(); applyTheme(); go('attack'); },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](a, e); return; }
  const n = e.target.closest('[data-nav]');
  if (n) { e.preventDefault(); go(n.dataset.nav); }
});

/* ---------- boot ---------- */
applyTheme();
go(location.hash.slice(1) || S.ui.view || 'attack');
// re-render when the day rolls over or the app comes back into view
let lastDay = todayKey();
document.addEventListener('visibilitychange', () => { if (!document.hidden && todayKey() !== lastDay) { lastDay = todayKey(); if (S.ui.view !== 'focus') render(); } });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
if (navigator.storage?.persist) navigator.storage.persist().catch(() => { });
