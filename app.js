/* Home Reps — core app: storage, theme, Today, Workout, Rest, Complete, Progress, Measure, Settings.
 * Meals and Add Food live in meals.js, which plugs into HR.RENDER / HR.ACTIONS. */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var EX = window.HR_EX, PROGRAM = window.HR_PROGRAM, LEVEL = window.HR_LEVEL, DEMO = window.HR_DEMO;
  var HR = window.HR = {};

  /* =========================================================
     Storage
     ========================================================= */
  var KEYS = {
    profile: 'hr-profile', settings: 'hr-settings', levels: 'hr-levels', sessions: 'hr-sessions',
    active: 'hr-active', measure: 'hr-measure', meals: 'hr-meals', foods: 'hr-foods', favs: 'hr-favs'
  };
  var DEFAULTS = {
    profile: function () { return { sex: 'm', age: 24, heightCm: 175, activity: 'light' }; },
    settings: function () { return { theme: 'auto', kcalTarget: null, proteinTarget: null, onboarded: false }; },
    levels: function () { return {}; },
    sessions: function () { return []; },
    active: function () { return null; },
    measure: function () { return []; },
    meals: function () { return {}; },
    foods: function () { return {}; },
    favs: function () { return []; }
  };
  var S = HR.S = {};

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  }
  function loadAll() {
    Object.keys(KEYS).forEach(function (k) {
      var v = load(KEYS[k], null), d = DEFAULTS[k]();
      if (v == null || (Array.isArray(d) !== Array.isArray(v)) || (d && typeof d === 'object' && typeof v !== 'object')) v = d;
      if (k === 'profile' || k === 'settings') { for (var f in d) if (!(f in v)) v[f] = d[f]; }
      S[k] = v;
    });
  }
  function save(k) {
    try { localStorage.setItem(KEYS[k], JSON.stringify(S[k])); return true; }
    catch (e) { toast('Couldn’t save — storage is full. Export a backup.'); return false; }
  }
  HR.save = function () { for (var i = 0; i < arguments.length; i++) save(arguments[i]); };

  /* =========================================================
     Helpers
     ========================================================= */
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayKey() { return keyOf(new Date()); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function mondayOf(k) { var d = parseKey(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return keyOf(d); }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
  function shortDate(k) { var d = parseKey(k); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function longDate(k) { var d = parseKey(k); return DAY[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()]; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  HR.u = { pad: pad, keyOf: keyOf, parseKey: parseKey, todayKey: todayKey, addDays: addDays, shortDate: shortDate, longDate: longDate,
    $: $, esc: esc, fmt: fmt, round1: round1, clamp: clamp, newId: newId };

  /* ---------- toast / dialog / sheet ---------- */
  var toastTimer;
  function toast(text, action) {
    var t = $('toast');
    t.innerHTML = '<span>' + esc(text) + '</span>' + (action ? '<button id="toast-act">' + esc(action.label) + '</button>' : '');
    t.hidden = false;
    if (action) $('toast-act').onclick = function () { t.hidden = true; action.fn(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, action ? 5000 : 2600);
  }
  HR.toast = toast;

  // dialog({ title, text, buttons: [{ label, fn, bold, danger }] }) — last button is usually Cancel
  function dialog(o) {
    var d = $('dialog'), b = $('dialog-body');
    b.innerHTML = '<div class="dt">' + esc(o.title) + '</div>' + (o.text ? '<div class="dx">' + esc(o.text) + '</div>' : '') +
      o.buttons.map(function (x, i) { return '<button data-i="' + i + '" class="' + (x.bold ? 'bold ' : '') + (x.danger ? 'danger' : '') + '">' + esc(x.label) + '</button>'; }).join('');
    d.hidden = false;
    Array.prototype.forEach.call(b.querySelectorAll('button'), function (btn) {
      btn.onclick = function () { d.hidden = true; var x = o.buttons[+btn.dataset.i]; if (x.fn) x.fn(); };
    });
  }
  HR.dialog = dialog;

  function openSheet(html) { $('sheet-body').innerHTML = html; $('sheet').hidden = false; }
  function closeSheet() { $('sheet').hidden = true; $('sheet-body').innerHTML = ''; }
  HR.openSheet = openSheet; HR.closeSheet = closeSheet;

  function seg(act, options, value, extra) {
    return '<div class="seg" role="tablist">' + options.map(function (o) {
      return '<button data-act="' + act + '" data-v="' + esc(o[0]) + '"' + (extra || '') + ' class="' + (String(o[0]) === String(value) ? 'on' : '') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  HR.seg = seg;

  /* =========================================================
     Theme
     ========================================================= */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var t = S.settings.theme;
    var dark = t === 'dark' || (t === 'auto' && mq && mq.matches);
    document.documentElement.className = dark ? 'dark' : 'light';
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', dark ? '#000000' : '#F2F2F7');
    var sb = document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]');
    if (sb) sb.setAttribute('content', dark ? 'black' : 'default');
  }
  if (mq) {
    var onScheme = function () { if (S.settings && S.settings.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }

  /* =========================================================
     Targets (Mifflin-St Jeor − 300 kcal, 1.6 g/kg protein)
     ========================================================= */
  var ACTIVITY = { sedentary: [1.2, 'Sedentary'], light: [1.375, 'Light'], moderate: [1.55, 'Moderate'], active: [1.725, 'Active'] };
  function latestWeight() { var m = S.measure; return m.length ? m[m.length - 1].weightKg : 70; }
  function calcTargets() {
    var p = S.profile, w = latestWeight();
    var bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'f' ? -161 : 5);
    var tdee = bmr * (ACTIVITY[p.activity] || ACTIVITY.light)[0];
    return { kcal: Math.max(1500, Math.round((tdee - 300) / 10) * 10), protein: Math.round(1.6 * w) };
  }
  function recalcTargets() {
    var t = calcTargets();
    S.settings.kcalTarget = t.kcal; S.settings.proteinTarget = t.protein; save('settings');
    return t;
  }
  HR.targets = function () {
    if (!S.settings.kcalTarget || !S.settings.proteinTarget) recalcTargets();
    return { kcal: S.settings.kcalTarget, protein: S.settings.proteinTarget };
  };

  /* =========================================================
     Training logic
     ========================================================= */
  function levelOf(id) { var l = S.levels[id]; return l && l.level ? l.level : 1; }
  function restFor(level) { return level >= 5 ? 45 : 60; }
  function doneSessions() { return S.sessions.filter(function (s) { return s.exercises && s.exercises.length; }); }
  function lastSession() { var d = doneSessions(); return d.length ? d[d.length - 1] : null; }
  function nextType() { var l = lastSession(); return l && l.type === 'A' ? 'B' : 'A'; }
  function weekCount(k) {
    var mon = mondayOf(k);
    return doneSessions().filter(function (s) { return mondayOf(s.date) === mon; }).length;
  }
  // Most recent logged sets of an exercise (optionally only at one level)
  function lastRecord(id, level) {
    for (var i = S.sessions.length - 1; i >= 0; i--) {
      var ex = S.sessions[i].exercises || [];
      for (var j = 0; j < ex.length; j++) {
        if (ex[j].id === id && ex[j].reps && ex[j].reps.length && (level == null || ex[j].level === level)) return ex[j];
      }
    }
    return null;
  }
  function targetsFor(id, level) {
    var ex = EX[id], last = lastRecord(id, level), t = [];
    for (var i = 0; i < ex.sets; i++) {
      var prev = last && last.reps[i] != null ? last.reps[i] : null;
      t.push(prev == null ? ex.min : clamp(prev + ex.step, ex.min, ex.max));
    }
    return t;
  }
  function unitText(ex, n) {
    if (ex.unit === 'sec') return n + ' s';
    return n + ' reps' + (ex.perSide ? ' per ' + ex.perSide : '');
  }
  function rangeText(ex) {
    return ex.sets + ' × ' + ex.min + '–' + ex.max + (ex.unit === 'sec' ? ' s' : '') + (ex.perSide ? ' /' + ex.perSide : '');
  }
  function levelPill(id) {
    var l = levelOf(id);
    return '<span class="pill accent">' + (l >= 5 ? 'Max' : 'L' + l) + ' · ' + esc(LEVEL.name(EX[id], l)) + '</span>';
  }

  /* ---------- audio (Web Audio beep) & wake lock ---------- */
  var actx = null;
  function unlockAudio() {
    try {
      if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; actx = new C(); }
      if (actx.state === 'suspended') actx.resume();
      var b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource();
      src.buffer = b; src.connect(actx.destination); src.start(0);
    } catch (e) { }
  }
  function beep() {
    try {
      if (!actx) return;
      if (actx.state === 'suspended') actx.resume();
      [0, 0.22].forEach(function (off) {
        var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + off;
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch (e) { }
  }
  function flash() { var f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  HR.beep = beep;

  var wakeLock = null;
  function requestWake() {
    try {
      if (!('wakeLock' in navigator) || !S.active) return;
      navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () { });
    } catch (e) { }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { } wakeLock = null; }

  /* =========================================================
     Navigation
     ========================================================= */
  var TABS = ['today', 'meals', 'progress'];
  var RENDER = HR.RENDER = {};
  var ACTIONS = HR.ACTIONS = {};
  var current = 'today', currentOpts = {};
  var tickTimer = null;

  function go(name, opts) {
    if (name !== 'rest' && name !== 'workout') stopTick();
    if (current === 'addfood' && name !== 'addfood' && HR.leaveAddFood) HR.leaveAddFood();
    current = name; currentOpts = opts || {};
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.toggle('active', s.id === 's-' + name); });
    var isTab = TABS.indexOf(name) >= 0;
    document.body.classList.toggle('no-tabs', !isTab);
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) { t.classList.toggle('on', t.dataset.tab === name); });
    if (RENDER[name]) RENDER[name](currentOpts);
    window.scrollTo(0, 0);
  }
  HR.go = go;
  function rerender() { if (RENDER[current]) RENDER[current](currentOpts); }
  HR.rerender = rerender;

  var GEAR = '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>';

  /* =========================================================
     Today
     ========================================================= */
  RENDER.today = function () {
    var t = todayKey(), done = weekCount(t), type = S.active ? S.active.type : nextType();
    var wd = (new Date().getDay() + 6) % 7; // Mon = 0
    var html = '<div class="topbar"><span class="eyebrow">' + esc(longDate(t)) + '</span><button class="icon-btn" data-act="go" data-to="settings" aria-label="Settings">' + GEAR + '</button></div>' +
      '<h1 class="large-title">Today</h1>';
    if (wd >= 3 && done === 0) html += '<div class="banner">Still time this week. One session today is a win. 💪</div>';
    html += '<div class="card"><div class="bar-head"><b>' + done + ' of 3 sessions</b><span class="muted">this week</span></div><div class="quota">' +
      [0, 1, 2].map(function (i) { return '<i class="' + (i < done ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      (done >= 3 ? '<div class="note" style="margin:8px 0 0">Week done. Extra sessions are optional.</div>' : '') + '</div>';
    html += '<div class="card"><div class="session-head"><h2>Session ' + type + '</h2><span class="muted small">≈ 30 min</span></div><ul class="ex-list">' +
      PROGRAM[type].map(function (id, i) {
        var ex = EX[id], l = levelOf(id);
        return '<li><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(ex.name) + '</span><span class="sr">' + rangeText(ex) + '</span><span class="pill' + (l > 1 ? ' accent' : '') + '">' + (l >= 5 ? 'Max' : 'L' + l) + '</span></li>';
      }).join('') + '</ul></div>';
    html += '<button class="btn-primary huge" data-act="start">' + (S.active ? 'Resume Session ' + type : 'Start Session ' + type) + '</button>';
    var tot = HR.mealTotals ? HR.mealTotals(t) : { kcal: 0 }, tg = HR.targets();
    html += '<div style="height:12px"></div><button class="kcal-line" data-act="tab" data-tab="meals"><span>🍽️</span><div class="bar kcal"><i style="width:' + clamp(tot.kcal / tg.kcal * 100, 0, 100) + '%"></i></div><span><b>' + fmt(tot.kcal) + '</b> / ' + fmt(tg.kcal) + ' kcal</span><span class="chev"></span></button>';
    $('s-today').innerHTML = html;
  };

  ACTIONS.start = function () {
    if (S.active) { go(S.active.restEndsAt ? 'rest' : 'workout'); requestWake(); return; }
    var last = lastSession(), t = todayKey();
    if (last && (last.date === t || last.date === addDays(t, -1))) {
      dialog({
        title: 'Rest 1 day recommended',
        text: last.date === t ? 'You already trained today. Muscles grow while you rest.' : 'You trained yesterday. Muscles grow while you rest.',
        buttons: [{ label: 'Start anyway', fn: beginSession }, { label: 'Not today', bold: true }]
      });
    } else beginSession();
  };
  function beginSession() {
    unlockAudio();
    var type = nextType();
    S.active = {
      id: newId(), type: type, date: todayKey(), startedAt: Date.now(), exIndex: 0, setIndex: 0, restEndsAt: null, restTotal: 60,
      exercises: PROGRAM[type].map(function (id) { var l = levelOf(id); return { id: id, level: l, target: targetsFor(id, l), reps: [], restSec: restFor(l) }; })
    };
    save('active');
    requestWake();
    go('workout');
  }

  /* =========================================================
     Workout
     ========================================================= */
  var wo = { val: null, key: '', hold: null };
  function curRec() { var a = S.active; return a.exercises[a.exIndex]; }

  RENDER.workout = function () {
    var a = S.active;
    if (!a) { go('today'); return; }
    var rec = curRec(), ex = EX[rec.id], set = a.setIndex, key = a.id + ':' + a.exIndex + ':' + set;
    if (wo.key !== key) { wo.key = key; wo.val = rec.target[set]; wo.hold = null; }
    var last = lastRecord(rec.id);
    var nextTxt = set + 1 < ex.sets ? 'Set ' + (set + 2) + ' of ' + ex.sets :
      (a.exIndex + 1 < a.exercises.length ? EX[a.exercises[a.exIndex + 1].id].name : 'Finish');
    var isHold = ex.unit === 'sec';
    var html = '<div class="wo-top"><button class="nav-btn" data-act="end">End</button><span class="mid">Session ' + a.type + ' · ' + (a.exIndex + 1) + '/' + a.exercises.length + '</span><span class="time" id="elapsed">' + mmss((Date.now() - a.startedAt) / 1000) + '</span></div>' +
      '<div class="segbar">' + a.exercises.map(function (r, i) { return '<i class="' + (i < a.exIndex ? 'done' : i === a.exIndex ? 'cur' : '') + '"></i>'; }).join('') + '</div>' +
      '<button class="demo-btn" data-act="howto" aria-label="How to do ' + esc(ex.name) + '">' + DEMO(rec.id) + '<span class="hint">How to ›</span></button>' +
      '<div class="ex-name">' + esc(ex.name) + '</div>' +
      '<div class="ex-level">' + levelPill(rec.id) + '</div>' +
      '<div class="card set-card"><div class="set-of">Set ' + (set + 1) + ' of ' + ex.sets + '</div>' +
      '<div class="target">Target: <b>' + unitText(ex, rec.target[set]) + '</b></div>';
    if (isHold && wo.hold) {
      html += '<div class="hold-num" id="hold-num">' + Math.max(0, Math.ceil((wo.hold.endsAt - Date.now()) / 1000)) + '</div><div class="step-unit">seconds left · hold steady</div>';
    } else {
      html += '<div class="stepper"><button class="step-btn" data-act="wstep" data-d="-' + ex.step + '" aria-label="Less">−</button>' +
        '<div><div class="step-val" id="wval">' + wo.val + '</div><div class="step-unit">' + (isHold ? 'seconds' : 'reps' + (ex.perSide ? ' per ' + ex.perSide : '')) + '</div></div>' +
        '<button class="step-btn" data-act="wstep" data-d="' + ex.step + '" aria-label="More">+</button></div>';
    }
    html += '<div class="last">' + (last ? 'Last time: ' + last.reps.join(' · ') + (ex.unit === 'sec' ? ' s' : '') : 'First time — take it easy') + '</div></div>';
    if (isHold) html += wo.hold ? '<button class="btn-primary huge" data-act="holdstop">Stop early</button>' : '<button class="btn-primary huge" data-act="holdstart">Start ' + wo.val + ' s hold</button>';
    else html += '<button class="btn-primary huge" data-act="setdone">Set Done</button>';
    html += '<div class="next-line">Next: ' + esc(nextTxt) + '</div>';
    $('s-workout').innerHTML = html;
    startTick();
  };

  ACTIONS.wstep = function (b) {
    var ex = EX[curRec().id];
    wo.val = clamp(wo.val + Number(b.dataset.d), ex.unit === 'sec' ? 5 : 0, ex.unit === 'sec' ? 300 : 100);
    $('wval').textContent = wo.val;
  };
  ACTIONS.setdone = function () { unlockAudio(); logSet(wo.val); };
  ACTIONS.holdstart = function () {
    unlockAudio();
    wo.hold = { startedAt: Date.now(), endsAt: Date.now() + wo.val * 1000, target: wo.val };
    rerender();
  };
  ACTIONS.holdstop = function () {
    var h = wo.hold; if (!h) return;
    var secs = Math.round((Date.now() - h.startedAt) / 1000);
    wo.hold = null; logSet(clamp(secs, 0, h.target));
  };
  function holdFinished() { var t = wo.hold.target; wo.hold = null; beep(); flash(); logSet(t); }

  function logSet(val) {
    var a = S.active, rec = curRec(), ex = EX[rec.id];
    rec.reps[a.setIndex] = val;
    a.setIndex++;
    if (a.setIndex >= ex.sets) { a.exIndex++; a.setIndex = 0; }
    if (a.exIndex >= a.exercises.length) { a.exIndex = a.exercises.length - 1; finishSession(false); return; }
    a.restTotal = rec.restSec;
    a.restEndsAt = Date.now() + rec.restSec * 1000;
    save('active');
    go('rest');
  }

  ACTIONS.end = function () {
    var a = S.active, doneEx = a.exercises.filter(function (r) { return r.reps.length; }).length;
    var full = a.exercises.filter(function (r) { return r.reps.length >= EX[r.id].sets; }).length;
    if (full >= 3) {
      dialog({ title: 'End session?', text: 'You finished ' + full + ' of 6 exercises. It counts toward this week (no level-ups when ending early).',
        buttons: [{ label: 'Save and finish', bold: true, fn: function () { finishSession(true); } },
          { label: 'Discard', danger: true, fn: discardSession }, { label: 'Keep going' }] });
    } else {
      dialog({ title: 'End session?', text: doneEx ? 'Finish at least 3 exercises for it to count. If you end now, nothing is saved.' : 'Nothing is saved yet.',
        buttons: [{ label: 'Discard', danger: true, fn: discardSession }, { label: 'Keep going', bold: true }] });
    }
  };
  function discardSession() { S.active = null; save('active'); releaseWake(); go('today'); }

  function finishSession(early) {
    var a = S.active, now = Date.now();
    var s = {
      id: a.id, type: a.type, date: a.date, startedAt: a.startedAt, endedAt: now,
      durationSec: Math.round((now - a.startedAt) / 1000), early: !!early, levelUps: [],
      exercises: a.exercises.filter(function (r) { return r.reps.length; }).map(function (r) {
        return { id: r.id, level: r.level, target: r.target.slice(), reps: r.reps.slice(), restSec: r.restSec };
      })
    };
    if (!early) s.exercises.forEach(function (r) {
      var ex = EX[r.id];
      if (r.reps.length >= ex.sets && r.reps.every(function (v) { return v >= ex.max; }) && r.level < 5) {
        S.levels[r.id] = { level: r.level + 1, since: todayKey() };
        s.levelUps.push({ id: r.id, from: r.level, to: r.level + 1 });
      }
    });
    S.sessions.push(s);
    S.active = null;
    save('sessions'); save('active'); save('levels');
    releaseWake();
    go('complete', { id: s.id });
  }

  /* ---------- 1-second ticker (elapsed time, rest ring, plank hold) ---------- */
  function startTick() { if (!tickTimer) tickTimer = setInterval(tick, 250); tick(); }
  function stopTick() { clearInterval(tickTimer); tickTimer = null; }
  function tick() {
    var a = S.active;
    if (!a) { stopTick(); return; }
    var el = $('elapsed'); if (el) el.textContent = mmss((Date.now() - a.startedAt) / 1000);
    if (current === 'workout' && wo.hold) {
      var left = Math.ceil((wo.hold.endsAt - Date.now()) / 1000);
      var hn = $('hold-num'); if (hn) hn.textContent = Math.max(0, left);
      if (Date.now() >= wo.hold.endsAt) holdFinished();
    }
    if (current === 'rest') {
      if (!a.restEndsAt) { go('workout'); return; }
      var rem = (a.restEndsAt - Date.now()) / 1000;
      var n = $('rest-num'), ring = $('rest-ring');
      if (n) n.textContent = mmss(Math.ceil(Math.max(0, rem)));
      if (ring) ring.style.strokeDashoffset = (RING_C * (1 - clamp(rem / a.restTotal, 0, 1))).toFixed(1);
      if (rem <= 0) restOver(true);
    }
  }

  /* =========================================================
     Rest timer
     ========================================================= */
  var RING_C = 2 * Math.PI * 110;
  RENDER.rest = function () {
    var a = S.active;
    if (!a || !a.restEndsAt) { go(a ? 'workout' : 'today'); return; }
    var rec = curRec(), ex = EX[rec.id], set = a.setIndex;
    var rem = Math.max(0, (a.restEndsAt - Date.now()) / 1000);
    $('s-rest').innerHTML =
      '<div class="wo-top"><button class="nav-btn" data-act="end">End</button><span class="mid">Rest</span><span class="time" id="elapsed"></span></div>' +
      '<div class="rest-wrap"><div class="ring"><svg viewBox="0 0 240 240"><circle class="track" cx="120" cy="120" r="110" fill="none" stroke-width="12"/>' +
      '<circle class="prog" id="rest-ring" cx="120" cy="120" r="110" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="' + (RING_C * (1 - rem / a.restTotal)).toFixed(1) + '"/></svg>' +
      '<div class="center"><div class="num" id="rest-num">' + mmss(Math.ceil(rem)) + '</div><div class="lbl">Rest</div></div></div>' +
      '<div class="card"><div class="set-of muted small">UP NEXT · SET ' + (set + 1) + ' OF ' + ex.sets + '</div><div style="font-size:20px;font-weight:700;margin:2px 0">' + esc(ex.name) + '</div>' +
      '<div class="muted small">Target ' + unitText(ex, rec.target[set]) + ' · ' + esc(LEVEL.name(ex, rec.level)) + '</div></div>' +
      '<div class="rest-btns"><button class="btn-secondary" data-act="rest15">+15 sec</button><button class="btn-primary" style="margin:0;min-height:48px" data-act="restskip">Skip</button></div></div>';
    startTick();
  };
  ACTIONS.rest15 = function () { var a = S.active; a.restEndsAt += 15000; a.restTotal += 15; save('active'); tick(); };
  ACTIONS.restskip = function () { restOver(false); };
  function restOver(natural) {
    var a = S.active; if (!a) return;
    a.restEndsAt = null; save('active');
    if (natural) { beep(); flash(); }
    go('workout');
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (S.active) { requestWake(); if (actx && actx.state === 'suspended') actx.resume(); tick(); }
    if (HR.rolloverCheck) HR.rolloverCheck();
  });

  /* =========================================================
     How To
     ========================================================= */
  RENDER.howto = function (o) {
    var id = o.id || (S.active ? curRec().id : 'goblet_squat'), ex = EX[id], l = levelOf(id);
    $('s-howto').innerHTML =
      '<div class="topbar"><button class="nav-btn" data-act="back">‹ Back</button><span class="title-sm">How To</span><span style="width:44px"></span></div>' +
      '<div class="howto-demo">' + DEMO(id) + '</div>' +
      '<h1 class="large-title" style="font-size:28px">' + esc(ex.name) + '</h1>' +
      '<div class="chips" style="margin-bottom:14px">' + ex.muscles.map(function (m) { return '<span class="pill">' + esc(m) + '</span>'; }).join('') + '</div>' +
      '<div class="card"><ol class="steps">' + ex.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="avoid"><b>Avoid</b>' + esc(ex.avoid) + '</div>' +
      '<div class="card"><b>Easier option</b><div class="muted small" style="margin-top:2px">' + esc(ex.easier) + '</div></div>' +
      '<div class="card"><b>Your level: ' + (l >= 5 ? 'Max' : 'L' + l) + ' · ' + esc(LEVEL.name(ex, l)) + '</b><div class="muted small" style="margin-top:2px">' + esc(LEVEL.text(ex, l)) + '</div>' + levelBar(l, ex) + '</div>';
  };
  ACTIONS.howto = function () { go('howto', { id: curRec().id, back: 'workout' }); };
  ACTIONS.back = function () { go(currentOpts.back || 'today'); };

  function levelBar(l, ex) {
    return '<div class="lvlbar">' + [1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= l ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="lvlbar-labels">' + [1, 2, 3, 4].map(function (i) { return '<span>' + esc(LEVEL.name(ex, i)) + '</span>'; }).join('') + '</div>';
  }

  /* =========================================================
     Session complete
     ========================================================= */
  RENDER.complete = function (o) {
    var s = S.sessions.filter(function (x) { return x.id === o.id; })[0] || lastSession();
    if (!s) { go('today'); return; }
    var wk = weekCount(s.date), next = addDays(s.date, 2), nd = parseKey(next);
    var html = '<div class="done-check"><svg viewBox="0 0 48 48"><polyline points="12,25 21,34 37,15"/></svg></div>' +
      '<h1 class="large-title center-text" style="margin-bottom:4px">Session ' + s.type + ' done</h1>' +
      '<div class="center-text muted">' + (s.early ? 'Ended early — still counts.' : 'Great work. That’s how it’s done.') + '</div>' +
      '<div class="big-stats"><div class="card"><b>' + mmss(s.durationSec) + '</b><span class="muted small">time</span></div>' +
      '<div class="card"><b>' + wk + ' of 3</b><span class="muted small">sessions this week</span></div></div>';
    if (s.levelUps.length) {
      html += '<div class="card levelup"><h3>⬆ Level up' + (s.levelUps.length > 1 ? ' ×' + s.levelUps.length : '') + '</h3>' +
        s.levelUps.map(function (u) {
          var ex = EX[u.id];
          return '<div class="item"><b>' + esc(ex.name) + '</b> → ' + (u.to >= 5 ? 'Max · rest drops to 45 s' : 'L' + u.to + ' ' + esc(LEVEL.name(ex, u.to))) +
            '<div class="muted small">' + esc(LEVEL.text(ex, u.to)) + ' Target resets to ' + unitText(ex, ex.min) + '.</div>' + levelBar(u.to, ex) + '</div>';
        }).join('') + '</div>';
    }
    html += '<h2 class="section-label">Logged</h2><div class="card flush">' + s.exercises.map(function (r) {
      var ex = EX[r.id];
      return '<div class="row"><span class="row-main"><span class="row-title">' + esc(ex.name) + '</span><span class="row-sub">' + (r.level >= 5 ? 'Max' : 'L' + r.level) + ' · ' + esc(LEVEL.name(ex, r.level)) + '</span></span><span class="row-right">' + r.reps.join(' · ') + (ex.unit === 'sec' ? ' s' : '') + '</span></div>';
    }).join('') + '</div>' +
      '<div class="card" style="margin-top:12px"><b>Next session: ' + DAY[nd.getDay()] + ' ' + shortDate(next) + ' or later</b><div class="muted small">Session ' + (s.type === 'A' ? 'B' : 'A') + ' · rest 1 day in between.</div></div>' +
      '<button class="btn-primary huge" data-act="go" data-to="today">Done</button>';
    $('s-complete').innerHTML = html;
  };

  /* =========================================================
     Progress
     ========================================================= */
  function measureDue() {
    var m = S.measure; if (!m.length) return 0;
    return Math.max(0, 14 - daysBetween(m[m.length - 1].date, todayKey()));
  }
  function signed(v, unit) { var r = round1(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(1) + ' ' + unit; }
  function meaning(dw, da, dk, n, weeks) {
    if (n < 2) return 'First measurement saved. Re-measure in 2 weeks to see a trend.';
    var w = dw <= -0.4 ? -1 : dw >= 0.4 ? 1 : 0, a = da >= 0.3 ? 1 : da <= -0.3 ? -1 : 0;
    if (w < 0 && a > 0) return 'Waist down, arm up. Recomp is working.';
    if (w < 0 && a === 0) return 'Waist down, arm holding. Fat loss is on track.';
    if (w < 0 && a < 0) return 'Waist and arm both down. Hit your protein and keep training.';
    if (w === 0 && a > 0) return 'Arm up, waist steady. You’re building muscle.';
    if (w > 0 && a > 0) return 'Arm up, but waist up too. Keep calories at your target.';
    if (w > 0) return 'Waist up a little. Check calories and keep 3 sessions a week.';
    return weeks >= 4 ? 'Holding steady. Check protein and hit 3 sessions a week.' : 'No big change yet. That’s normal early on. Keep going.';
  }
  RENDER.progress = function () {
    var m = S.measure, html = '<div class="topbar"><span></span></div><h1 class="large-title">Progress</h1>';
    if (m.length) {
      var f = m[0], l = m[m.length - 1];
      var dw = l.waistCm - f.waistCm, da = l.armCm - f.armCm, dk = l.weightKg - f.weightKg;
      var cls = function (v, goodSign) { var r = round1(v); return r === 0 || !goodSign ? 'flat' : (r * goodSign > 0 ? 'good' : 'bad'); };
      var metric = function (k, v, unit, d, good) {
        return '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v.toFixed(1) + ' <small>' + unit + '</small></div><div class="d ' + (m.length > 1 ? cls(d, good) : 'flat') + '">' + (m.length > 1 ? signed(d, unit) : 'start') + '</div></div>';
      };
      html += '<div class="metrics">' + metric('Waist', l.waistCm, 'cm', dw, -1) + metric('Arm', l.armCm, 'cm', da, 1) + metric('Weight', l.weightKg, 'kg', dk, 0) + '</div>';
      html += '<div class="card"><div class="meaning">' + esc(meaning(dw, da, dk, m.length, daysBetween(f.date, l.date) / 7)) + '</div>' +
        '<div class="muted small" style="margin-top:4px">' + (m.length > 1 ? 'Change since ' + shortDate(f.date) + ' · ' + plural(m.length, 'measurement') : 'Measured ' + shortDate(f.date)) + '</div></div>';
    }
    html += '<h2 class="section-label">Sessions per week</h2><div class="card">' + weeksChart() + '</div>';
    var due = measureDue();
    html += '<button class="btn-primary" data-act="go" data-to="measure">' + (due > 0 ? 'Re-measure · in ' + plural(due, 'day') : 'Re-measure · due now') + '</button>';
    $('s-progress').innerHTML = html;
  };
  function weeksChart() {
    var thisMon = mondayOf(todayKey()), first = doneSessions()[0], firstMon = first ? mondayOf(first.date) : thisMon;
    var span = Math.round(daysBetween(firstMon, thisMon) / 7) + 1, n = clamp(span, 4, 8), weeks = [];
    for (var i = n - 1; i >= 0; i--) { var mon = addDays(thisMon, -7 * i); weeks.push({ mon: mon, c: weekCount(mon) }); }
    var W = 320, H = 150, top = 14, base = 120, maxC = Math.max(4, Math.max.apply(null, weeks.map(function (w) { return w.c; })));
    var bw = W / n, y = function (c) { return base - (base - top) * c / maxC; };
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sessions per week">';
    s += '<line class="goal" x1="0" x2="' + W + '" y1="' + y(3) + '" y2="' + y(3) + '"/><text x="' + (W - 2) + '" y="' + (y(3) - 4) + '" text-anchor="end">goal 3</text>';
    weeks.forEach(function (w, i) {
      var x = i * bw + bw * 0.2, h = base - y(w.c);
      s += '<rect class="b' + (w.c >= 3 ? ' full' : '') + '" x="' + x.toFixed(1) + '" y="' + y(w.c).toFixed(1) + '" width="' + (bw * 0.6).toFixed(1) + '" height="' + Math.max(h, w.c ? 0 : 0).toFixed(1) + '" rx="4"/>';
      if (!w.c) s += '<rect x="' + x.toFixed(1) + '" y="' + (base - 2) + '" width="' + (bw * 0.6).toFixed(1) + '" height="2" rx="1" fill="var(--fill2)"/>';
      s += '<text x="' + (x + bw * 0.3).toFixed(1) + '" y="' + (y(w.c) - 4).toFixed(1) + '" text-anchor="middle">' + (w.c || '') + '</text>';
      s += '<text x="' + (x + bw * 0.3).toFixed(1) + '" y="' + (base + 16) + '" text-anchor="middle">' + (w.mon === thisMon ? 'This wk' : shortDate(w.mon)) + '</text>';
    });
    return s + '</svg>';
  }

  /* =========================================================
     Measure (and first-launch setup)
     ========================================================= */
  var mtmp = null;
  var MFIELDS = [['waistCm', 'Waist', 'cm', 0.5, 'At belly-button level'], ['armCm', 'Arm', 'cm', 0.5, 'Biggest part, relaxed'], ['weightKg', 'Weight', 'kg', 0.1, 'Morning, before eating']];
  function measureRows() {
    return '<div class="card flush">' + MFIELDS.map(function (f) {
      return '<div class="m-row"><span class="lbl">' + f[1] + '<small>' + f[4] + '</small></span><div class="stepper"><button class="step-btn sm" data-act="mstep" data-k="' + f[0] + '" data-d="-' + f[3] + '" aria-label="Less ' + f[1] + '">−</button>' +
        '<span class="step-val sm" id="m-' + f[0] + '">' + mtmp[f[0]].toFixed(1) + ' ' + f[2] + '</span><button class="step-btn sm" data-act="mstep" data-k="' + f[0] + '" data-d="' + f[3] + '" aria-label="More ' + f[1] + '">+</button></div></div>';
    }).join('') + '</div>';
  }
  var TIP = '<div class="tip"><b>How to measure:</b> in the morning, before eating. Waist at belly-button level, relaxed, tape flat. Arm at the biggest part of the upper arm, relaxed.</div>';
  function freshTmp() {
    var l = S.measure[S.measure.length - 1];
    return l ? { waistCm: l.waistCm, armCm: l.armCm, weightKg: l.weightKg } : { waistCm: 80, armCm: 30, weightKg: 70 };
  }
  RENDER.measure = function () {
    mtmp = freshTmp();
    $('s-measure').innerHTML = '<div class="topbar"><button class="nav-btn" data-act="go" data-to="progress">Cancel</button><span class="title-sm">Measure</span><span style="width:44px"></span></div>' +
      '<h1 class="large-title">Measure</h1>' + measureRows() + '<div style="height:12px"></div>' + TIP +
      '<button class="btn-primary" data-act="msave">Save</button>';
  };
  ACTIONS.mstep = function (b) {
    var k = b.dataset.k, f = MFIELDS.filter(function (x) { return x[0] === k; })[0];
    mtmp[k] = clamp(round1(mtmp[k] + Number(b.dataset.d)), 10, 250);
    $('m-' + k).textContent = mtmp[k].toFixed(1) + ' ' + f[2];
  };
  function saveMeasurement() {
    var t = todayKey(), entry = { date: t, waistCm: mtmp.waistCm, armCm: mtmp.armCm, weightKg: mtmp.weightKg };
    var last = S.measure[S.measure.length - 1];
    if (last && last.date === t) S.measure[S.measure.length - 1] = entry; else S.measure.push(entry);
    save('measure');
    return recalcTargets();
  }
  ACTIONS.msave = function () {
    var before = { k: S.settings.kcalTarget, p: S.settings.proteinTarget };
    var tg = saveMeasurement();
    go('progress');
    toast(before.k !== tg.kcal || before.p !== tg.protein ? 'Saved. Targets updated: ' + fmt(tg.kcal) + ' kcal · ' + tg.protein + ' g' : 'Measurements saved');
  };

  RENDER.setup = function () {
    if (!mtmp) mtmp = freshTmp();
    var p = S.profile;
    $('s-setup').innerHTML = '<div style="height:24px"></div><h1 class="large-title">Welcome to Home Reps</h1>' +
      '<p class="muted" style="margin:-6px 0 16px">One minute of setup, once. After this: open, tap Start.</p>' +
      '<h2 class="section-label">About you</h2><div class="card flush">' + profileRows() + '</div>' +
      '<h2 class="section-label">Starting measurements</h2>' + measureRows() + '<div style="height:12px"></div>' + TIP +
      '<button class="btn-primary huge" data-act="setupdone">Save and start</button>';
  };
  ACTIONS.setupdone = function () {
    saveMeasurement();
    S.settings.onboarded = true; save('settings'); save('profile');
    mtmp = null;
    go('today');
  };

  /* =========================================================
     Settings
     ========================================================= */
  function profileRows() {
    var p = S.profile;
    return '<div class="m-row"><span class="lbl">Age</span><div class="stepper"><button class="step-btn sm" data-act="pstep" data-k="age" data-d="-1">−</button><span class="step-val sm" id="p-age">' + p.age + '</span><button class="step-btn sm" data-act="pstep" data-k="age" data-d="1">+</button></div></div>' +
      '<div class="m-row"><span class="lbl">Height</span><div class="stepper"><button class="step-btn sm" data-act="pstep" data-k="heightCm" data-d="-1">−</button><span class="step-val sm" id="p-heightCm">' + p.heightCm + ' cm</span><button class="step-btn sm" data-act="pstep" data-k="heightCm" data-d="1">+</button></div></div>' +
      '<div class="set-block"><div class="lbl" style="margin-bottom:8px">Activity (outside workouts)</div>' +
      seg('activity', Object.keys(ACTIVITY).map(function (k) { return [k, ACTIVITY[k][1]]; }), p.activity) + '</div>';
  }
  ACTIONS.pstep = function (b) {
    var k = b.dataset.k, p = S.profile;
    p[k] = k === 'age' ? clamp(p[k] + Number(b.dataset.d), 14, 90) : clamp(p[k] + Number(b.dataset.d), 120, 230);
    save('profile');
    $('p-' + k).textContent = p[k] + (k === 'heightCm' ? ' cm' : '');
    if (current === 'settings') { recalcTargets(); updateTargetVals(); }
  };
  ACTIONS.activity = function (b) {
    S.profile.activity = b.dataset.v; save('profile');
    if (current === 'settings') { recalcTargets(); } rerender();
  };
  function updateTargetVals() {
    var a = $('t-kcal'), b = $('t-prot');
    if (a) a.textContent = fmt(S.settings.kcalTarget) + ' kcal';
    if (b) b.textContent = S.settings.proteinTarget + ' g';
  }
  RENDER.settings = function () {
    var st = S.settings, tg = HR.targets();
    $('s-settings').innerHTML = '<div class="topbar"><button class="nav-btn" data-act="go" data-to="today">‹ Today</button><span class="title-sm">Settings</span><span style="width:44px"></span></div>' +
      '<h1 class="large-title">Settings</h1>' +
      '<h2 class="section-label">Appearance</h2><div class="card">' + seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], st.theme) + '</div>' +
      '<h2 class="section-label">Daily targets</h2><div class="card flush">' +
      '<div class="m-row"><span class="lbl">Calories</span><div class="stepper"><button class="step-btn sm" data-act="tstep" data-k="kcalTarget" data-d="-50">−</button><span class="step-val sm" id="t-kcal">' + fmt(tg.kcal) + ' kcal</span><button class="step-btn sm" data-act="tstep" data-k="kcalTarget" data-d="50">+</button></div></div>' +
      '<div class="m-row"><span class="lbl">Protein</span><div class="stepper"><button class="step-btn sm" data-act="tstep" data-k="proteinTarget" data-d="-5">−</button><span class="step-val sm" id="t-prot">' + tg.protein + ' g</span><button class="step-btn sm" data-act="tstep" data-k="proteinTarget" data-d="5">+</button></div></div>' +
      profileRows() + '</div>' +
      '<div class="note">Calories = TDEE (Mifflin-St Jeor) − 300. Protein = 1.6 g × body weight. Both are recalculated each time you save a new weight.</div>' +
      '<h2 class="section-label">Reminders</h2><div class="card flush"><button class="row link" data-act="ics"><span class="row-main"><span class="row-title">Add 3 weekly workouts to Calendar</span></span></button></div>' +
      '<div class="note">Adds “Workout” on Mon, Wed and Fri at 19:00 with a 15-minute alert. Drag them to any day in the Calendar app.</div>' +
      '<h2 class="section-label">Backup</h2><div class="card flush"><button class="row link" data-act="export"><span class="row-main"><span class="row-title">Export backup</span></span></button>' +
      '<button class="row link" data-act="import"><span class="row-main"><span class="row-title">Import backup</span></span></button></div>' +
      '<div class="note">Your data lives only on this iPhone. Export now and then, and keep the file in iCloud Drive / Files.</div>' +
      '<div class="note" style="text-align:center;margin-top:24px">Home Reps ' + VERSION + '</div>';
  };
  ACTIONS.theme = function (b) { S.settings.theme = b.dataset.v; save('settings'); applyTheme(); rerender(); };
  ACTIONS.tstep = function (b) {
    var k = b.dataset.k, st = S.settings;
    st[k] = k === 'kcalTarget' ? clamp(st[k] + Number(b.dataset.d), 1200, 5000) : clamp(st[k] + Number(b.dataset.d), 40, 300);
    save('settings'); updateTargetVals();
  };

  /* ---------- share or download a file ---------- */
  function shareOrDownload(name, text, mime) {
    var file = null;
    try { file = new File([text], name, { type: mime }); } catch (e) { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function (err) { if (!err || err.name !== 'AbortError') download(name, text, mime); });
      return;
    }
    download(name, text, mime);
  }
  function download(name, text, mime) {
    var url = URL.createObjectURL(new Blob([text], { type: mime }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  /* ---------- calendar (.ics) ---------- */
  ACTIONS.ics = function () {
    var mon = addDays(mondayOf(todayKey()), 7), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Home Reps//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Home Reps'];
    [[0, 'MO'], [2, 'WE'], [4, 'FR']].forEach(function (d, i) {
      var day = addDays(mon, d[0]).replace(/-/g, '');
      lines.push('BEGIN:VEVENT', 'UID:home-reps-workout-' + (i + 1) + '-' + stamp + '@home-reps', 'DTSTAMP:' + stamp,
        'DTSTART:' + day + 'T190000', 'DTEND:' + day + 'T193000', 'RRULE:FREQ=WEEKLY;BYDAY=' + d[1],
        'SUMMARY:Workout', 'DESCRIPTION:Open Home Reps and tap Start. Move this to any day that suits you this week.',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Workout in 15 minutes', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    shareOrDownload('home-reps-workouts.ics', lines.join('\r\n') + '\r\n', 'text/calendar');
  };

  /* ---------- export / import ---------- */
  ACTIONS.export = function () {
    var out = { app: 'home-reps', schema: 1, version: VERSION, exportedAt: new Date().toISOString() };
    Object.keys(KEYS).forEach(function (k) { out[k] = S[k]; });
    shareOrDownload('home-reps-' + todayKey() + '.json', JSON.stringify(out, null, 1), 'application/json');
  };
  ACTIONS.import = function () { var i = $('import-file'); i.value = ''; i.click(); };
  $('import-file').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var d;
      try { d = JSON.parse(r.result); } catch (err) { toast('That file isn’t a valid backup'); return; }
      if (!d || d.app !== 'home-reps' || !Array.isArray(d.sessions)) { toast('That file isn’t a Home Reps backup'); return; }
      dialog({
        title: 'Replace all data?',
        text: 'This replaces everything on this iPhone with the backup from ' + (d.exportedAt ? shortDate(keyOf(new Date(d.exportedAt))) : 'the file') + ' (' + plural(d.sessions.length, 'session') + ').',
        buttons: [{ label: 'Replace', danger: true, fn: function () {
          Object.keys(KEYS).forEach(function (k) {
            var def = DEFAULTS[k](), v = d[k];
            S[k] = (v == null || Array.isArray(def) !== Array.isArray(v)) ? def : v;
            save(k);
          });
          loadAll(); applyTheme(); S.settings.onboarded = true; save('settings');
          go('today'); toast('Backup restored');
        } }, { label: 'Cancel', bold: true }]
      });
    };
    r.readAsText(f);
  });

  /* =========================================================
     Events & start-up
     ========================================================= */
  ACTIONS.tab = function (b) { go(b.dataset.tab); };
  ACTIONS.go = function (b) { go(b.dataset.to); };
  ACTIONS['sheet-close'] = closeSheet;

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    var fn = ACTIONS[t.dataset.act];
    if (fn) { e.preventDefault(); fn(t, e); }
  });

  function init() {
    loadAll();
    applyTheme();
    HR.targets();
    if (!S.settings.onboarded || !S.measure.length) go('setup');
    else go('today');
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
