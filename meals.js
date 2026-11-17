/* Home Reps — Meals & Add Food.
 * Food search, Build a plate, barcode scanning (Open Food Facts) and the estimate tables are
 * adapted from farhanahs-green-days. Food data: foods.js (window.HR_FOODS, kcal + protein per serving). */
(function () {
  'use strict';
  var HR = window.HR, S = HR.S, u = HR.u, $ = u.$, esc = u.esc, fmt = u.fmt, round1 = u.round1, clamp = u.clamp;
  var RENDER = HR.RENDER, ACTIONS = HR.ACTIONS;

  var ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  var OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
  var OFF_FIELDS = 'product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,categories_tags,quantity,product_quantity_unit';

  var MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snacks'], ['dinner', 'Dinner']];
  var MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snacks', dinner: 'Dinner' };
  var PORTIONS = [[0.5, '½'], [1, '1'], [1.5, '1½']];
  var PORTION_LABEL = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2' };

  // Build-a-plate: rough values per hand portion → [label, kcal, protein g]
  //   ✊ 1 fist of cooked carbs ≈ 1 cup · ✋ 1 palm of protein ≈ 100 g cooked · 👍 1 thumb ≈ 1 tbsp oil/sambal
  var PLATE = {
    carb: { rice: ['Rice', 200, 4], brown: ['Brown rice', 185, 4], noodles: ['Noodles', 190, 6], bread: ['Bread / roti', 160, 6], potato: ['Potato', 130, 3] },
    prot: { chicken: ['Chicken', 190, 28], fish: ['Fish', 140, 24], meat: ['Beef / mutton', 230, 25], egg: ['Eggs', 150, 12], tofu: ['Tofu / tempeh', 160, 14], seafood: ['Prawn / squid', 100, 20] },
    cook: { plain: ['Grilled', 0], gravy: ['Curry', 80], fried: ['Fried', 110] },       // extra kcal per palm
    vcook: { plain: ['Plain', 0], stir: ['Stir-fried', 40], lemak: ['Lemak', 80] }     // extra kcal per fist
  };

  /* =========================================================
     Food data
     ========================================================= */
  var BUILTIN = {};
  (window.HR_FOODS || []).forEach(function (f) { BUILTIN[f.id] = f; });
  function getFood(id) { return id ? (BUILTIN[id] || S.foods[id] || null) : null; }
  function allFoods() {
    var list = window.HR_FOODS || [];
    var custom = Object.keys(S.foods).map(function (k) { return S.foods[k]; });
    return custom.concat(list);
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function searchFoods(q) {
    var nq = norm(q), words = nq.split(' ').filter(Boolean);
    if (!words.length) return [];
    return allFoods().map(function (f) {
      var name = norm(f.name), hay = name + ' ' + norm(f.alt) + ' ' + (f.barcode || '');
      if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return null;
      return { f: f, s: name.indexOf(nq) === 0 ? 0 : name.indexOf(nq) >= 0 ? 1 : 2 };
    }).filter(Boolean).sort(function (a, b) { return a.s - b.s; }).slice(0, 60).map(function (x) { return x.f; });
  }
  function dayMeals(k) { return Array.isArray(S.meals[k]) ? S.meals[k] : []; }
  function foodFromEntry(m) {
    var p = m.portion || 1;
    return { id: m.foodId || null, name: m.name, serving: m.serving, kcal: m.kcal / p, protein: (m.protein || 0) / p };
  }
  // Every food you've ever logged, most useful first for the chosen meal:
  // eaten most often at this meal → eaten most often overall → eaten most recently.
  function myFoods(meal) {
    var keys = Object.keys(S.meals).sort().reverse(), stats = {}, order = 0;
    keys.forEach(function (k) {
      dayMeals(k).slice().reverse().forEach(function (m) {
        var key = m.foodId || ('n:' + norm(m.name));
        var s = stats[key];
        if (!s) s = stats[key] = { food: getFood(m.foodId) || foodFromEntry(m), atMeal: 0, total: 0, recent: order++ };
        s.total++;
        if (m.meal === meal) s.atMeal++;
      });
    });
    return Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
      return (b.atMeal - a.atMeal) || (b.total - a.total) || (a.recent - b.recent);
    }).slice(0, 80).map(function (s) {
      var f = {}; for (var p in s.food) f[p] = s.food[p];
      f.times = s.total;
      return f;
    });
  }
  function favFoods() { return S.favs.map(getFood).filter(Boolean); }
  function defaultMeal() {
    var h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
  }
  function nowTime() { var d = new Date(); return u.pad(d.getHours()) + ':' + u.pad(d.getMinutes()); }
  function makeEntry(f, portion, meal) {
    return { id: u.newId(), foodId: f.id || null, name: f.name, serving: f.serving, portion: portion,
      kcal: Math.round(f.kcal * portion), protein: round1((f.protein || 0) * portion), meal: meal, time: nowTime() };
  }
  function addEntries(list) {
    var k = u.todayKey();
    S.meals[k] = dayMeals(k).concat(list);
    HR.save('meals');
  }
  HR.mealTotals = function (k) {
    return dayMeals(k).reduce(function (t, m) { t.kcal += m.kcal || 0; t.protein += m.protein || 0; return t; }, { kcal: 0, protein: 0 });
  };

  /* =========================================================
     Meals tab
     ========================================================= */
  RENDER.meals = function () {
    var k = u.todayKey(), tot = HR.mealTotals(k), tg = HR.targets(), meals = dayMeals(k);
    var left = tg.kcal - tot.kcal;
    var html = '<div class="topbar"><span class="eyebrow">' + esc(u.longDate(k)) + '</span></div><h1 class="large-title">Meals</h1>' +
      '<div class="card"><div class="bar-block"><div class="bar-head"><span><b>' + fmt(tot.kcal) + '</b> / ' + fmt(tg.kcal) + ' kcal</span><span class="muted">' + (left >= 0 ? fmt(left) + ' left' : fmt(-left) + ' over') + '</span></div>' +
      '<div class="bar kcal"><i style="width:' + clamp(tot.kcal / tg.kcal * 100, 0, 100) + '%"></i></div></div>' +
      '<div class="bar-block"><div class="bar-head"><span><b>' + Math.round(tot.protein) + '</b> / ' + tg.protein + ' g protein</span><span class="muted">' + (tot.protein >= tg.protein ? 'done ✓' : Math.round(tg.protein - tot.protein) + ' g to go') + '</span></div>' +
      '<div class="bar prot"><i style="width:' + clamp(tot.protein / tg.protein * 100, 0, 100) + '%"></i></div></div></div>';
    MEALS.forEach(function (m) {
      var items = meals.filter(function (e) { return e.meal === m[0]; });
      var sum = items.reduce(function (s, e) { return s + e.kcal; }, 0);
      html += '<div class="card flush"><button class="meal-head" data-act="addfood" data-mode="list" data-meal="' + m[0] + '" aria-label="Add food to ' + m[1] + '">' + m[1] +
        '<span>' + (sum ? fmt(sum) + ' kcal' : '') + '<b class="meal-add">＋ Add</b></span></button>' +
        (items.length ? items.map(function (e) {
          return '<button class="row" data-act="editentry" data-id="' + esc(e.id) + '"><span class="row-main"><span class="row-title">' + esc(e.name) + '</span><span class="row-sub">' +
            (e.portion !== 1 ? PORTION_LABEL[e.portion] + ' × ' : '') + esc(e.serving || '') + ' · ' + round1(e.protein || 0) + ' g protein</span></span><span class="row-right">' + fmt(e.kcal) + '</span></button>';
        }).join('') : '<div class="meal-empty">Nothing yet</div>') + '</div>';
    });
    html += '<button class="btn-primary" data-act="addfood" data-mode="list">Search food</button>' +
      '<div class="link-row"><button class="btn-text" data-act="addfood" data-mode="plate">Build a plate</button><span class="muted" style="align-self:center">·</span>' +
      '<button class="btn-text" data-act="addfood" data-mode="scan">Scan</button><span class="muted" style="align-self:center">·</span>' +
      '<button class="btn-text" data-act="sameyesterday">Same as yesterday</button></div>';
    $('s-meals').innerHTML = html;
  };

  ACTIONS.sameyesterday = function () {
    var y = dayMeals(u.addDays(u.todayKey(), -1));
    if (!y.length) { HR.toast('Nothing was logged yesterday'); return; }
    var copies = y.map(function (e) { var c = {}; for (var f in e) c[f] = e[f]; c.id = u.newId(); c.time = nowTime(); return c; });
    addEntries(copies);
    HR.rerender();
    var ids = copies.map(function (c) { return c.id; });
    HR.toast('Added ' + copies.length + ' item' + (copies.length > 1 ? 's' : '') + ' from yesterday', { label: 'Undo', fn: function () {
      var k = u.todayKey(); S.meals[k] = dayMeals(k).filter(function (e) { return ids.indexOf(e.id) < 0; }); HR.save('meals'); HR.rerender();
    } });
  };

  /* ---------- edit a logged entry ---------- */
  var editing = null;
  function findEntry(id) { return dayMeals(u.todayKey()).filter(function (e) { return e.id === id; })[0]; }
  function editSheet() {
    var e = findEntry(editing.id); if (!e) { HR.closeSheet(); return; }
    var base = foodFromEntry(e);
    HR.openSheet('<h2 style="margin:4px 0 2px;font-size:20px">' + esc(e.name) + '</h2><div class="muted small" style="margin-bottom:14px">' + esc(e.serving || '') + '</div>' +
      '<div class="section-label" style="margin-left:0">Portion</div>' + HR.seg('eportion', PORTIONS.concat(e.portion === 2 ? [[2, '2']] : []), editing.portion) +
      '<div class="section-label" style="margin-left:0">Meal</div>' + HR.seg('emeal', MEALS, editing.meal) +
      '<button class="btn-primary" data-act="esave">Save · ' + fmt(base.kcal * editing.portion) + ' kcal</button>' +
      '<button class="btn-text danger" style="width:100%" data-act="eremove">Remove</button>');
  }
  ACTIONS.editentry = function (b) {
    var e = findEntry(b.dataset.id); if (!e) return;
    editing = { id: e.id, portion: e.portion || 1, meal: e.meal };
    editSheet();
  };
  ACTIONS.eportion = function (b) { editing.portion = Number(b.dataset.v); editSheet(); };
  ACTIONS.emeal = function (b) { editing.meal = b.dataset.v; editSheet(); };
  ACTIONS.esave = function () {
    var e = findEntry(editing.id); if (!e) return;
    var base = foodFromEntry(e);
    e.portion = editing.portion; e.meal = editing.meal;
    e.kcal = Math.round(base.kcal * e.portion); e.protein = round1(base.protein * e.portion);
    HR.save('meals'); HR.closeSheet(); HR.rerender();
  };
  ACTIONS.eremove = function () {
    var k = u.todayKey(), list = dayMeals(k), idx = -1, e;
    list.forEach(function (x, i) { if (x.id === editing.id) idx = i; });
    if (idx < 0) return;
    e = list.splice(idx, 1)[0]; HR.save('meals'); HR.closeSheet(); HR.rerender();
    HR.toast('Removed ' + e.name, { label: 'Undo', fn: function () { dayMeals(k).splice(idx, 0, e); S.meals[k] = S.meals[k] || [e]; HR.save('meals'); HR.rerender(); } });
  };

  /* =========================================================
     Add Food screen
     ========================================================= */
  var af = null;
  function newAf(mode) {
    return { mode: mode || 'list', q: '', favs: false, sel: null, portion: 1, meal: defaultMeal(), list: [],
      plate: { carb: 'rice', carbs: 1, prot: 'chicken', prots: 1, cook: 'plain', veg: 1, vcook: 'stir', extra: 1 }, product: null, scanMsg: '' };
  }
  ACTIONS.addfood = function (b) {
    af = newAf(b.dataset.mode);
    if (b.dataset.meal && MEAL_LABEL[b.dataset.meal]) af.meal = b.dataset.meal;
    HR.go('addfood');
  };
  HR.leaveAddFood = function () { stopScanner(); };

  function topbar(left, title) {
    return '<div class="topbar"><button class="nav-btn" data-act="' + left[0] + '"' + (left[2] ? ' data-mode="' + left[2] + '"' : '') + '>' + left[1] + '</button><span class="title-sm">' + title + '</span><span style="width:60px"></span></div>';
  }
  function mealSeg() { return HR.seg('afmeal', MEALS, af.meal); }
  function selKcal() { return af.sel ? Math.round(af.sel.kcal * af.portion) : 0; }
  function addBar(act, label, disabled, withPortion) {
    return '<div class="add-bar" id="af-bar">' + (withPortion ? HR.seg('afportion', PORTIONS, af.portion) : '') +
      '<button class="btn-primary" style="margin-top:10px" data-act="' + act + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button></div>';
  }

  RENDER.addfood = function () {
    if (!af) af = newAf('list');
    stopScanner();
    var html;
    if (af.mode === 'plate') html = plateHTML();
    else if (af.mode === 'scan') html = scanHTML();
    else if (af.mode === 'product') html = productHTML();
    else html = listHTML();
    $('s-addfood').innerHTML = html;
    if (af.mode === 'list') renderList();
    if (af.mode === 'scan') setTimeout(function () { if (af && af.mode === 'scan') startScanner(onBarcode, scanStatus); }, 50);
  };

  /* ---------- list (search / recent / favourites) ---------- */
  function listHTML() {
    return topbar(['go-meals', 'Cancel'], 'Add food') + mealSeg() +
      '<label class="search"><svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>' +
      '<input id="af-q" type="search" placeholder="Search 1,200+ Malaysian foods" autocomplete="off" autocorrect="off" enterkeyhint="search" value="' + esc(af.q) + '"></label>' +
      '<div class="quick-btns"><button data-act="afmode" data-mode="plate"><span class="ic">🍽️</span>Build a plate</button>' +
      '<button data-act="afmode" data-mode="scan"><span class="ic">▥</span>Scan</button>' +
      '<button data-act="affavs" class="' + (af.favs ? 'on' : '') + '"><span class="ic">★</span>Favourites</button></div>' +
      '<h2 class="section-label" id="af-label"></h2><div class="card flush af-list" id="af-list"></div>' +
      addBar('afadd', af.sel ? 'Add · ' + fmt(selKcal()) + ' kcal' : 'Pick a food', !af.sel, true);
  }
  function foodKey(f) { return f.id || 'n:' + norm(f.name); }
  function renderList() {
    var list, label;
    if (af.q.trim()) { list = searchFoods(af.q); label = list.length ? 'Results' : ''; }
    else if (af.favs) { list = favFoods(); label = 'Favourites'; }
    else { list = myFoods(af.meal); label = list.length ? 'Your foods · most eaten at ' + MEAL_LABEL[af.meal].toLowerCase() + ' first' : 'Your foods'; }
    af.list = list;
    var lab = $('af-label'); if (lab) lab.textContent = label;
    var box = $('af-list'); if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="meal-empty" style="padding:16px">' + (af.q.trim() ? 'No match. Try another word, or use Build a plate.' : af.favs ? 'Tap ☆ on any food to keep it here.' : 'Foods you add will show up here. Search to start.') + '</div>';
      return;
    }
    var selKey = af.sel ? foodKey(af.sel) : null;
    box.innerHTML = list.map(function (f, i) {
      var fav = f.id && S.favs.indexOf(f.id) >= 0;
      return '<div class="row' + (foodKey(f) === selKey ? ' selected' : '') + '" role="button" tabindex="0" data-act="afpick" data-i="' + i + '"><span class="row-main"><span class="row-title">' + esc(f.name) + '</span>' +
        '<span class="row-sub">' + esc(f.serving || '') + ' · ' + round1(f.protein || 0) + ' g protein' + (f.estimated ? ' · est.' : '') + (f.times > 1 ? ' · ' + f.times + '×' : '') + '</span></span>' +
        '<span class="row-right">' + fmt(f.kcal) + ' kcal</span>' +
        (f.id ? '<button class="star' + (fav ? ' on' : '') + '" data-act="afstar" data-i="' + i + '" aria-label="Favourite">' + (fav ? '★' : '☆') + '</button>' : '<span style="width:34px"></span>') + '</div>';
    }).join('');
  }
  function renderBar() {
    var bar = $('af-bar'); if (!bar) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = af.mode === 'product' ? addBar('afadd', 'Add · ' + fmt(selKcal()) + ' kcal', false, true)
      : addBar('afadd', af.sel ? 'Add · ' + fmt(selKcal()) + ' kcal' : 'Pick a food', !af.sel, true);
    bar.replaceWith(tmp.firstChild);
  }
  document.addEventListener('input', function (e) {
    if (e.target.id === 'af-q' && af) { af.q = e.target.value; renderList(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'af-q') e.target.blur();
    if (e.key === 'Enter' && e.target.id === 'af-code') { e.preventDefault(); ACTIONS.afcode(); }
  });

  ACTIONS['go-meals'] = function () { HR.go('meals'); };
  ACTIONS.afmeal = function (b) {
    af.meal = b.dataset.v;
    Array.prototype.forEach.call(document.querySelectorAll('[data-act=afmeal]'), function (x) { x.classList.toggle('on', x.dataset.v === af.meal); });
    if (af.mode === 'list' && !af.q.trim() && !af.favs) renderList();
  };
  ACTIONS.afmode = function (b) {
    if (af.mode === 'product') { af.sel = null; af.product = null; }
    af.mode = b.dataset.mode; af.scanMsg = '';
    HR.rerender();
  };
  ACTIONS.affavs = function (b) { af.favs = !af.favs; b.classList.toggle('on', af.favs); renderList(); };
  ACTIONS.afpick = function (b) {
    var f = af.list[+b.dataset.i]; if (!f) return;
    af.sel = af.sel && foodKey(af.sel) === foodKey(f) ? null : f;
    var q = $('af-q'); if (q) q.blur();
    renderList(); renderBar();
  };
  ACTIONS.afstar = function (b) {
    var f = af.list[+b.dataset.i]; if (!f || !f.id) return;
    var i = S.favs.indexOf(f.id);
    if (i >= 0) S.favs.splice(i, 1); else S.favs.unshift(f.id);
    HR.save('favs'); renderList();
  };
  ACTIONS.afportion = function (b) {
    af.portion = Number(b.dataset.v); renderBar();
    if (af.mode === 'product') HR.rerender();
  };
  ACTIONS.afadd = function () {
    var f = af.sel; if (!f) return;
    if (f.barcode && !S.foods[f.id]) { S.foods[f.id] = f; HR.save('foods'); }
    addEntries([makeEntry(f, af.portion, af.meal)]);
    HR.toast('Added ' + f.name + ' · ' + fmt(f.kcal * af.portion) + ' kcal');
    HR.go('meals');
  };

  /* ---------- Build a plate ---------- */
  function plateCalc() {
    var p = af.plate, c = PLATE.carb[p.carb], r = PLATE.prot[p.prot], ck = PLATE.cook[p.cook], v = PLATE.vcook[p.vcook];
    return {
      kcal: c[1] * p.carbs + (r[1] + ck[1]) * p.prots + (30 + v[1]) * p.veg + 60 * p.extra,
      protein: c[2] * p.carbs + r[2] * p.prots + 2 * p.veg + 0.3 * p.extra
    };
  }
  function plateName() {
    var p = af.plate, parts = [];
    if (p.carbs) parts.push(PLATE.carb[p.carb][0]);
    if (p.prots) parts.push(PLATE.prot[p.prot][0].toLowerCase() + (p.cook !== 'plain' ? ' (' + PLATE.cook[p.cook][0].toLowerCase() + ')' : ''));
    if (p.veg) parts.push('veg');
    return parts.length ? parts.join(' + ') : 'Home-cooked plate';
  }
  function countText(n, unit) {
    if (!n) return 'None';
    var t = String(n).replace('.5', '½'); if (t === '0½') t = '½';
    return t + ' ' + unit + (n > 1 ? 's' : '');
  }
  function plateStep(label, key, unit) {
    return '<div class="plate-row"><span>' + label + '</span><div class="stepper" style="gap:8px"><button class="step-btn sm" data-act="pstepp" data-k="' + key + '" data-d="-0.5" aria-label="Less">−</button>' +
      '<span class="step-val sm" style="min-width:76px">' + countText(af.plate[key], unit) + '</span>' +
      '<button class="step-btn sm" data-act="pstepp" data-k="' + key + '" data-d="0.5" aria-label="More">+</button></div></div>';
  }
  function opts(obj) { return Object.keys(obj).map(function (k) { return [k, obj[k][0]]; }); }
  function plateHTML() {
    var c = plateCalc(), p = af.plate;
    return topbar(['afmode', '‹ Back', 'list'], 'Build a plate') + mealSeg() +
      '<p class="muted small" style="margin:10px 4px 0">No numbers: use your hand. ✊ fist ≈ 1 cup · ✋ palm ≈ 100 g · 👍 thumb ≈ 1 tbsp.</p>' +
      '<h2 class="section-label">✊ Rice / carbs</h2><div class="card">' + HR.seg('pplate', opts(PLATE.carb), p.carb, ' data-k="carb"').replace('class="seg"', 'class="seg wrap"') + plateStep('Amount', 'carbs', 'fist') + '</div>' +
      '<h2 class="section-label">✋ Protein</h2><div class="card">' + HR.seg('pplate', opts(PLATE.prot), p.prot, ' data-k="prot"').replace('class="seg"', 'class="seg wrap"') +
      '<div style="height:8px"></div>' + HR.seg('pplate', opts(PLATE.cook), p.cook, ' data-k="cook"') + plateStep('Amount', 'prots', 'palm') + '</div>' +
      '<h2 class="section-label">🥦 Veggies</h2><div class="card">' + HR.seg('pplate', opts(PLATE.vcook), p.vcook, ' data-k="vcook"') + plateStep('Amount', 'veg', 'fist') + '</div>' +
      '<h2 class="section-label">👍 Oil / sambal / sauce</h2><div class="card">' + plateStep('Amount', 'extra', 'thumb') + '</div>' +
      '<div class="plate-total"><b>' + fmt(c.kcal) + ' kcal</b> · ' + Math.round(c.protein) + ' g protein<br>' + esc(plateName()) + '</div>' +
      addBar('afaddplate', 'Add · ' + fmt(c.kcal) + ' kcal', c.kcal <= 0, false);
  }
  ACTIONS.pplate = function (b) { af.plate[b.dataset.k] = b.dataset.v; HR.rerender(); };
  ACTIONS.pstepp = function (b) { var k = b.dataset.k; af.plate[k] = clamp(af.plate[k] + Number(b.dataset.d), 0, 6); HR.rerender(); };
  ACTIONS.afaddplate = function () {
    var c = plateCalc(); if (c.kcal <= 0) return;
    var name = plateName(), kcal = Math.round(c.kcal), id = 'pl-' + norm(name).replace(/ /g, '-') + '-' + kcal;
    var f = { id: id, name: name, serving: '1 plate (estimate)', kcal: kcal, protein: round1(c.protein), plate: true };
    S.foods[id] = f; HR.save('foods');
    addEntries([makeEntry(f, 1, af.meal)]);
    HR.toast('Added ' + name + ' · ' + fmt(kcal) + ' kcal');
    HR.go('meals');
  };

  /* ---------- barcode scan ---------- */
  function scanHTML() {
    return topbar(['afmode', '‹ Back', 'list'], 'Scan barcode') +
      '<div class="scan-box"><video id="scan-video" playsinline muted autoplay></video><div class="aim"></div></div>' +
      '<div class="scan-status" id="scan-status">' + esc(af.scanMsg || 'Starting camera…') + '</div>' +
      '<div class="code-row"><input id="af-code" inputmode="numeric" pattern="[0-9]*" placeholder="Or type the barcode" autocomplete="off"><button class="btn-secondary" data-act="afcode">Look up</button></div>' +
      (af.scanMsg && /not|couldn/i.test(af.scanMsg) ? '<button class="btn-primary" data-act="afmode" data-mode="list">Search a similar food</button>' : '') +
      '<p class="note" style="margin:12px 4px">Scanning needs internet the first time for each product (Open Food Facts). Scanned products then work offline.</p>';
  }
  function scanStatus(t) { var s = $('scan-status'); if (s) s.textContent = t; }
  ACTIONS.afcode = function () {
    var v = ($('af-code') || {}).value || '';
    v = v.replace(/\D/g, '');
    if (v.length < 6) { scanStatus('Type the full barcode number'); return; }
    stopScanner(); onBarcode(v);
  };
  function onBarcode(code) {
    var known = S.foods['bc-' + code];
    if (known) { showProduct(known); return; }
    scanStatus('Looking up ' + code + '…');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    fetch(OFF_URL + encodeURIComponent(code) + '.json?fields=' + OFF_FIELDS, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var f = j && j.status === 1 && j.product ? parseOFF(code, j.product) : null;
        if (!f) { af.scanMsg = 'Product not found. Search a similar food instead.'; HR.rerender(); return; }
        showProduct(f);
      })
      .catch(function () { clearTimeout(timer); af.scanMsg = 'Couldn’t look it up (offline?). Search a similar food instead.'; HR.rerender(); });
  }
  function showProduct(f) { af.sel = f; af.product = f; af.portion = 1; af.mode = 'product'; HR.rerender(); }
  function productHTML() {
    var f = af.product;
    return topbar(['afmode', '‹ Back', 'scan'], 'Product') + mealSeg() + '<div style="height:12px"></div>' +
      '<div class="card prod-card"><h3>' + esc(f.name) + '</h3><div class="muted small">' + esc(f.serving) + ' · barcode ' + esc(f.barcode) + '</div>' +
      '<div class="big-stats" style="margin:14px 0 0"><div class="card" style="background:var(--bg)"><b>' + fmt(f.kcal * af.portion) + '</b><span class="muted small">kcal</span></div>' +
      '<div class="card" style="background:var(--bg)"><b>' + round1(f.protein * af.portion) + ' g</b><span class="muted small">protein</span></div></div>' +
      (f.estimated ? '<div class="est">No nutrition data for this product, so this is a typical value for ' + esc(f.estimated) + '.</div>' : '') + '</div>' +
      addBar('afadd', 'Add · ' + fmt(selKcal()) + ' kcal', false, true);
  }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function str(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
  function parseOFF(code, p) {
    var n = p.nutriments || {};
    var k = num(n['energy-kcal_100g']);
    var kj = num(n['energy-kj_100g']); if (kj == null) kj = num(n.energy_100g);
    if (k == null && kj != null) k = kj / 4.184;
    var pr = num(n.proteins_100g);
    var cats = (p.categories_tags || []).join(' ');
    var drink = /beverages|drinks/.test(cats) || p.product_quantity_unit === 'ml' || /\d\s*(ml|cl|l)\b/i.test(p.quantity || '');
    var unit = drink ? 'ml' : 'g';
    var sq = num(p.serving_quantity), ks = num(n['energy-kcal_serving']);
    if (ks == null && num(n.energy_serving) != null) ks = num(n.energy_serving) / 4.184;
    var name = str(p.product_name || p.product_name_en, 80) || str((p.brands || '').split(',')[0], 60) || 'Barcode ' + code;
    var f = { id: 'bc-' + code, barcode: code, name: name };
    if (k != null && sq > 0) { f.kcal = k * sq / 100; f.protein = (pr || 0) * sq / 100; f.serving = str(p.serving_size, 40) || sq + ' ' + unit; }
    else if (ks != null) { f.kcal = ks; f.protein = num(n.proteins_serving) || 0; f.serving = str(p.serving_size, 40) || '1 serving'; }
    else if (k != null) { f.kcal = k; f.protein = pr || 0; f.serving = '100 ' + unit; }
    else {
      var est = estimateCategory(cats, name, drink);
      if (!est) return null;
      f.kcal = est.kcal; f.protein = est.protein; f.serving = '100 ' + unit; f.estimated = est.label;
    }
    f.kcal = Math.round(f.kcal); f.protein = round1(f.protein);
    return f;
  }
  // Typical values per 100 g / 100 ml (from farhanahs-green-days), used only when a product has no nutrition data.
  var DRINK_ESTIMATES = [
    [/zero|diet|sugar-free|no-sugar|tanpa-gula|tanpa gula/, 'a zero-sugar drink', 1, 0],
    [/energy-drink|energy drink/, 'an energy drink', 45, 0],
    [/isotonic|sports-drink|100plus|100 plus/, 'an isotonic drink', 25, 0],
    [/soft-drink|soda|cola|carbonated|fizzy|bergas/, 'a soft drink', 42, 0],
    [/juice|nectar|fruit-based|fruit-drink|\bjus\b/, 'a fruit juice / drink', 45, 0.3],
    [/iced-tea|tea-based|\btea\b|\bteh\b/, 'a sweetened tea drink', 35, 0],
    [/coffee|kopi|nescafe/, 'a coffee drink', 60, 1.5],
    [/chocolate-milk|flavoured-milk|flavored-milk|milk-drink|malt|milo|coklat|chocolate/, 'a flavoured milk drink', 70, 3],
    [/soy|soya|plant-based-milk|oat-milk|almond-milk/, 'soy / plant milk', 50, 3],
    [/yogurt-drink|yoghurt-drink|fermented-milk|cultured|yakult|vitagen/, 'a cultured milk drink', 70, 1.5],
    [/\bmilk|susu/, 'milk', 64, 3.3],
    [/water|air mineral|mineral/, 'water', 0, 0],
    [/.*/, 'a sweetened drink', 40, 0.5]
  ];
  var FOOD_ESTIMATES = [
    [/instant-noodle|instant noodle|mee segera|maggi|cup-noodle|ramen/, 'instant noodles (dry)', 450, 9],
    [/pasta|noodle|\bmee\b|bihun|mihun|spaghetti/, 'dry noodles / pasta', 350, 11],
    [/\brice|beras/, 'rice (uncooked)', 360, 7],
    [/peanut-butter|peanut butter/, 'peanut butter', 590, 25],
    [/wafer|biscuit|cookie|biskut/, 'biscuits', 480, 6],
    [/cracker/, 'crackers', 430, 9],
    [/chip|crisp|kerepek|keropok|salty-snack|extruded/, 'chips / crisps', 520, 6],
    [/chocolate|coklat|cocoa/, 'chocolate', 540, 6],
    [/cand(y|ies)|confection|sweets|gula-gula|gumm|lollipop|marshmallow/, 'sweets / candy', 390, 1],
    [/cake|pastr|muffin|\bkek\b|\bbun|viennoiserie|donut|doughnut|croissant/, 'cake / pastry', 380, 6],
    [/bread|\broti\b|loaf/, 'bread', 265, 9],
    [/ice-cream|ice cream|frozen-dessert|aiskrim/, 'ice cream', 210, 3.5],
    [/cereal-bar|snack-bar|granola-bar|protein-bar/, 'a cereal bar', 420, 6],
    [/breakfast-cereal|cereal|granola|muesli|cornflake|oat/, 'breakfast cereal', 380, 8],
    [/nut|peanut|kacang|almond|cashew/, 'nuts', 590, 20],
    [/yogurt|yoghurt/, 'yogurt', 80, 4],
    [/cheese|keju/, 'cheese', 330, 22],
    [/sausage|nugget|meat|burger|sosej|ham\b/, 'processed meat', 250, 13],
    [/sardine|tuna|canned-fish|fish|sardin|ikan/, 'canned fish', 180, 20],
    [/jam|spread|kaya|honey|madu|syrup/, 'a sweet spread', 300, 1],
    [/sauce|condiment|ketchup|\bsos\b|mayonnaise|dressing/, 'a sauce', 110, 1],
    [/sweet-snack|dessert/, 'a sweet snack', 450, 5],
    [/snack/, 'a snack', 480, 6]
  ];
  function estimateCategory(cats, name, drink) {
    var hay = (cats + ' ' + String(name || '')).toLowerCase(), list = drink ? DRINK_ESTIMATES : FOOD_ESTIMATES;
    for (var i = 0; i < list.length; i++) if (list[i][0].test(hay)) return { label: list[i][1], kcal: list[i][2], protein: list[i][3] };
    return null;
  }

  /* ---------- camera barcode scanner (native BarcodeDetector, else ZXing from CDN) ---------- */
  var scanner = { active: false, stream: null, timer: null, reader: null };
  function loadScript(src) {
    return new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = src; sc.async = true; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
  }
  function camError(err, setStatus) {
    if (!scanner.active) return;
    stopScanner();
    setStatus(err && err.name === 'NotAllowedError' ? 'Camera permission was denied. Type the barcode below instead.' : 'Couldn’t start the camera. Type the barcode below instead.');
  }
  function startScanner(onCode, setStatus) {
    var video = $('scan-video');
    if (!video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setStatus('Camera isn’t available here. Type the barcode below.'); return; }
    scanner.active = true;
    var found = function (code) { if (!scanner.active) return; stopScanner(); HR.beep(); onCode(code); };
    var useZXing = function () {
      setStatus('Loading scanner…');
      (window.ZXing ? Promise.resolve() : loadScript(ZXING_URL)).then(function () {
        if (!scanner.active) return;
        var Z = window.ZXing, hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
        scanner.reader = new Z.BrowserMultiFormatReader(hints);
        setStatus('Point the camera at the barcode');
        return scanner.reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, function (result) { if (result) found(result.getText()); });
      }).catch(function (e) { if (e && e.name) camError(e, setStatus); else { stopScanner(); setStatus('Scanner couldn’t load (offline?). Type the barcode below.'); } });
    };
    if ('BarcodeDetector' in window) {
      Promise.resolve(window.BarcodeDetector.getSupportedFormats ? window.BarcodeDetector.getSupportedFormats() : []).then(function (fmts) {
        var want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(function (x) { return fmts.indexOf(x) >= 0; });
        if (!want.length) { useZXing(); return; }
        var det = new window.BarcodeDetector({ formats: want });
        return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
          if (!scanner.active) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
          scanner.stream = stream; video.srcObject = stream;
          var pl = video.play(); if (pl && pl.catch) pl.catch(function () { });
          setStatus('Point the camera at the barcode');
          var tick = function () {
            if (!scanner.active) return;
            det.detect(video).then(function (codes) {
              if (codes && codes.length) found(codes[0].rawValue); else scanner.timer = setTimeout(tick, 200);
            }).catch(function () { scanner.timer = setTimeout(tick, 300); });
          };
          tick();
        });
      }).catch(function (e) { camError(e, setStatus); });
    } else useZXing();
  }
  function stopScanner() {
    scanner.active = false;
    clearTimeout(scanner.timer);
    if (scanner.reader) { try { scanner.reader.reset(); } catch (e) { } scanner.reader = null; }
    if (scanner.stream) { scanner.stream.getTracks().forEach(function (t) { t.stop(); }); scanner.stream = null; }
  }
})();
