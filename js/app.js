'use strict';

/* =========================================================
 * VueloJusto — comparador de vuelos (demo con precios estimados)
 * ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const AP = Object.fromEntries(AIRPORTS.map(a => [a.c, a]));

const RATES = { EUR: 1, USD: 1.16, MXN: 21.3, COP: 4500 }; // aproximados
const CABIN = {
  eco: { n: 'Turista', m: 1, co2: 1 },
  prem: { n: 'Premium', m: 1.65, co2: 1.6 },
  bus: { n: 'Business', m: 3.3, co2: 2.9 },
};
const NEARBY_KM = 320;

/* ---------------- utilidades ---------------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hav(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
function rng(str) {
  let a = seedFrom(str);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((b - a) / 864e5);
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DOW_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MON_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmtD = s => { const d = parseD(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const fdur = m => `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
const fdurS = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
const apLabel = c => `${AP[c].city} (${c})`;

function money(eur, cur = S.currency) {
  const v = eur * RATES[cur];
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(v);
}

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

/* ---------------- estado ---------------- */
const S = {
  currency: 'EUR',
  bag: false,
  nearby: true,
  q: null,
  itins: [],
  sort: 'best',
  f: null,
  exRegion: 'ALL',
};

/* =========================================================
 * Motor de precios (estimación determinista)
 * ========================================================= */
function basePrice(km) {
  if (km < 1000) return 30 + km * 0.075;
  if (km < 3000) return 55 + km * 0.06;
  if (km < 6000) return 95 + km * 0.042;
  return 140 + km * 0.037;
}

function dateFactor(ds) {
  const d = parseD(ds);
  const wk = [1.08, 1.0, 0.88, 0.9, 1.04, 1.14, 0.95][d.getDay()];
  const m = d.getMonth(), day = d.getDate();
  const season = [0.96, 0.88, 0.94, 1.02, 0.98, 1.1, 1.26, 1.28, 1.0, 0.95, 0.9, 1.16][m];
  const holiday = (m === 11 && day >= 18) || (m === 0 && day <= 6) ? 1.18 : 1;
  const ahead = daysBetween(TODAY, d);
  const adv = ahead < 3 ? 1.75 : ahead < 7 ? 1.45 : ahead < 14 ? 1.25 : ahead < 21 ? 1.12 : ahead <= 80 ? 1 : ahead <= 150 ? 1.05 : 1.1;
  return wk * season * holiday * adv;
}

function candidates(o, d, dist) {
  const keys = Object.keys(AIRLINES);
  let list;
  if (o.r === d.r) {
    list = keys.filter(k => AIRLINES[k].home === o.r);
    if (list.length < 2) list = keys.filter(k => AIRLINES[k].r.includes(o.r));
  } else {
    list = keys.filter(k => AIRLINES[k].r.includes(o.r) && AIRLINES[k].r.includes(d.r));
  }
  if (dist > 4000) list = list.filter(k => AIRLINES[k].lh);
  if ((o.lc && o.s === 1) || (d.lc && d.s === 1)) {
    const lcs = list.filter(k => AIRLINES[k].lc);
    if (lcs.length) list = lcs;
  }
  if (!list.length) list = keys.filter(k => AIRLINES[k].lh && (AIRLINES[k].r.includes(o.r) || AIRLINES[k].r.includes(d.r)));
  return list;
}

function pickVia(al, o, d, stops, r) {
  if (!stops) return [];
  const dist = hav(o, d);
  const ok = h => h !== o.c && h !== d.c && AP[h] && hav(o, AP[h]) + hav(AP[h], d) <= dist * 1.3 + 300;
  let first = ok(al.hub) ? al.hub : null;
  if (!first) {
    const c = HUBS.filter(ok);
    if (!c.length) return [];
    first = c[Math.floor(r() * c.length)];
  }
  const via = [first];
  if (stops === 2) {
    const A = AP[first];
    const ok2 = h => h !== o.c && h !== d.c && h !== first && hav(A, AP[h]) + hav(AP[h], d) <= hav(A, d) * 1.3 + 300;
    const c = HUBS.filter(ok2);
    if (c.length) via.push(c[Math.floor(r() * c.length)]);
  }
  return via;
}

const legCache = new Map();
function genLeg(oc, dc, ds) {
  const key = `${oc}-${dc}-${ds}`;
  if (legCache.has(key)) return legCache.get(key);
  const o = AP[oc], d = AP[dc], dist = hav(o, d), r = rng(key);
  const pool = candidates(o, d, dist);
  const df = dateFactor(ds);
  let apF = (o.lc ? 0.9 : 1) * (d.lc ? 0.93 : 1) * (o.s === 1 ? 0.86 : 1) * (d.s === 1 ? 0.9 : 1);
  // en vuelos largos los grandes hubs tienen más competencia y suelen ser más baratos
  if (dist > 3500) apF = (o.s === 3 ? 0.92 : 1.12) * (d.s === 3 ? 0.95 : 1.08);
  const n = clamp(4 + pool.length + Math.floor(r() * 4), 5, 14);
  const out = [], seen = new Set();

  for (let i = 0; i < n; i++) {
    const code = pool[Math.floor(r() * pool.length)];
    const al = AIRLINES[code];
    let pNon;
    if (dist < 900) pNon = 0.88;
    else if (dist < 2500) pNon = o.s >= 2 && d.s >= 2 ? 0.62 : 0.4;
    else if (dist < 7500) pNon = o.s === 3 && d.s === 3 ? 0.42 : 0.12;
    else pNon = o.s === 3 && d.s === 3 ? 0.22 : 0.05;
    if (al.hub === oc || al.hub === dc) pNon += 0.25;
    const x = r();
    let stops = x < pNon ? 0 : x < pNon + (1 - pNon) * 0.78 ? 1 : 2;
    if (dist < 900 && stops === 2) stops = 1;
    const via = pickVia(al, o, d, stops, r);
    stops = via.length;

    let dep = r() < 0.08 ? Math.floor(r() * 300) : 300 + Math.floor(r() * 1080);
    dep = Math.round(dep / 5) * 5;
    const sig = `${code}${Math.round(dep / 45)}${stops}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    const pts = [o, ...via.map(c => AP[c]), d];
    const segs = [], lays = [];
    let t = dep, flown = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const A = pts[k], B = pts[k + 1], km = hav(A, B);
      flown += km;
      const fm = Math.round((km / 820 * 60 + 32) / 5) * 5;
      const arr = t + fm + (B.tz - A.tz) * 60;
      segs.push({ from: A.c, to: B.c, dep: t, arr, fm, al: code });
      if (k < pts.length - 2) {
        let lay = 50 + Math.floor(r() * 190);
        if (r() < 0.1) lay += 420 + Math.floor(r() * 300);
        lay = Math.round(lay / 5) * 5;
        lays.push(lay);
        t = arr + lay;
      } else t = arr;
    }
    const total = segs.reduce((s, g) => s + g.fm, 0) + lays.reduce((s, l) => s + l, 0);

    const timeF = dep < 360 ? 0.86 : (dep >= 420 && dep <= 540) || (dep >= 1020 && dep <= 1200) ? 1.08 : 1;
    const alF = al.lc ? 0.6 : 1 + (al.q - 3.8) * 0.2;
    const stopF = [1.12, 0.88, 0.8][stops];
    const layF = lays.some(l => l >= 420) ? 0.9 : 1;
    let fare = basePrice(dist) * alF * stopF * timeF * layF * apF * df * (0.86 + r() * 0.36);
    fare = Math.max(19, Math.round(fare));

    let bagFee = 0, basic = false;
    if (al.lc) bagFee = Math.round(20 + dist * 0.007);
    else if ((al.home === 'EU' || al.home === 'US') && r() < 0.3) {
      basic = true;
      bagFee = Math.round(30 + dist * 0.004);
      fare = Math.round(fare * 0.88);
    }
    const co2 = Math.round(flown * 0.085 + segs.length * 35);

    out.push({ id: `${key}-${i}`, al: code, from: oc, to: dc, ds, dep, arr: t, dur: total, stops, via, segs, lays, fare, bagFee, basic, co2 });
  }
  legCache.set(key, out);
  return out;
}

const itinCache = new Map();
function buildItins(oc, dc, dep, ret) {
  const key = `${oc}-${dc}-${dep}-${ret || ''}`;
  if (itinCache.has(key)) return itinCache.get(key);
  const outs = genLeg(oc, dc, dep);
  const backs = ret ? genLeg(dc, oc, ret) : null;
  const cheapestBack = backs && backs.length ? backs.reduce((a, b) => (b.fare + b.bagFee * 0.5 < a.fare + a.bagFee * 0.5 ? b : a)) : null;
  const res = outs.map(o => {
    let r = null, mixed = false;
    if (backs && backs.length) {
      const same = backs.filter(b => b.al === o.al).sort((a, b) => a.fare - b.fare)[0];
      if (same && same.fare <= cheapestBack.fare * 1.3) r = same;
      else { r = cheapestBack; mixed = r.al !== o.al; }
    }
    return {
      id: o.id, out: o, ret: r, mixed,
      fare: o.fare + (r ? r.fare : 0),
      bagFee: o.bagFee + (r ? r.bagFee : 0),
      dur: o.dur + (r ? r.dur : 0),
      stops: Math.max(o.stops, r ? r.stops : 0),
      airlines: [...new Set([o.al, r ? r.al : o.al])],
      co2: o.co2 + (r ? r.co2 : 0),
    };
  });
  itinCache.set(key, res);
  return res;
}

/** precio por persona en EUR según cabina y opción de maleta */
const ppEur = (it, cabin = S.q ? S.q.cabin : 'eco') => Math.round((it.fare + (S.bag ? it.bagFee : 0)) * CABIN[cabin].m);

function cheapest(oc, dc, dep, ret, cabin) {
  const its = buildItins(oc, dc, dep, ret);
  return its.length ? Math.min(...its.map(i => ppEur(i, cabin))) : Infinity;
}

function typicalPrice(oc, dc, tripLen, cabin) {
  const offs = [35, 42, 49, 56, 63, 70];
  const vals = offs.map(o => {
    const dep = iso(new Date(TODAY.getTime() + o * 864e5));
    return cheapest(oc, dc, dep, tripLen != null ? addDays(dep, tripLen) : null, cabin);
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function nearbyAirports(code, km = NEARBY_KM) {
  const a = AP[code];
  return AIRPORTS.filter(b => b.c !== code && hav(a, b) <= km).map(b => ({ ap: b, km: Math.round(hav(a, b)) })).sort((x, y) => x.km - y.km);
}

function groundCost(a, b) {
  const pair = [a.c, b.c].sort().join('');
  if (pair === 'SANTIJ') return { eur: 22, min: 60, mode: 'Puente CBX' };
  const km = hav(a, b);
  if (km < 30) return { eur: 6, min: 45, mode: 'Metro / bus' };
  const road = km * 1.25;
  return { eur: Math.round(5 + road * 0.08), min: Math.round(road / 80 * 60 + 25), mode: km < 100 ? 'Tren / bus' : 'Bus / coche' };
}

/* =========================================================
 * UI genérica
 * ========================================================= */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

function alLogo(code) {
  const a = AIRLINES[code];
  return `<span class="al-logo" style="background:${a.col}" aria-hidden="true">${code}</span>`;
}

/* ---------------- combobox de aeropuertos ---------------- */
function setAirport(input, code) {
  if (!code || !AP[code]) { input.value = ''; delete input.dataset.code; return; }
  input.value = apLabel(code);
  input.dataset.code = code;
}

function setupCombo(input, onPick) {
  const list = document.getElementById(`${input.id}-list`);
  let items = [], idx = -1;

  function render(q) {
    const nq = norm(q.trim());
    items = AIRPORTS
      .map(a => {
        const hay = norm(`${a.c} ${a.city} ${a.n} ${COUNTRIES[a.cc]}`);
        if (nq && !hay.includes(nq)) return null;
        let score = a.s;
        if (nq && norm(a.c) === nq) score += 100;
        else if (nq && norm(a.city).startsWith(nq)) score += 20;
        return { a, score };
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score || x.a.city.localeCompare(y.a.city))
      .slice(0, 8)
      .map(x => x.a);
    idx = items.length ? 0 : -1;
    list.innerHTML = items.length
      ? items.map((a, i) => `<li role="option" data-i="${i}" aria-selected="${i === idx}">
          <span class="code">${a.c}</span>
          <span><span class="cl-main">${esc(a.city)}</span><br><span class="cl-sub">${esc(a.n)} · ${esc(COUNTRIES[a.cc])}</span></span>
        </li>`).join('')
      : '<li class="empty">No encontramos ese aeropuerto</li>';
    open(true);
  }
  function open(v) { list.classList.toggle('open', v); input.setAttribute('aria-expanded', v); }
  function hl() { $$('li[data-i]', list).forEach((li, i) => li.setAttribute('aria-selected', i === idx)); const el = list.children[idx]; if (el) el.scrollIntoView({ block: 'nearest' }); }
  function pick(i) {
    const a = items[i];
    if (!a) return;
    setAirport(input, a.c);
    open(false);
    onPick && onPick(a.c);
  }

  input.addEventListener('focus', () => { input.select(); render(''); });
  input.addEventListener('input', () => { delete input.dataset.code; render(input.value); });
  input.addEventListener('keydown', e => {
    if (!list.classList.contains('open')) return;
    if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); hl(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); hl(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (idx >= 0) { pick(idx); e.preventDefault(); } }
    else if (e.key === 'Escape') open(false);
  });
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); pick(+li.dataset.i); }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      open(false);
      if (!input.dataset.code && input.value.trim() && items.length) pick(0);
      else if (!input.dataset.code) input.value = '';
    }, 120);
  });
}

/* =========================================================
 * Búsqueda
 * ========================================================= */
function readForm() {
  const trip = $('input[name="trip"]:checked').value;
  return {
    o: $('#origin').dataset.code,
    d: $('#dest').dataset.code,
    dep: $('#depDate').value,
    ret: trip === 'rt' ? $('#retDate').value : null,
    pax: +$('#pax').value,
    cabin: $('#cabin').value,
  };
}

function fillForm(q) {
  setAirport($('#origin'), q.o);
  setAirport($('#dest'), q.d);
  if (q.dep) $('#depDate').value = q.dep;
  $$('input[name="trip"]').forEach(r => { r.checked = r.value === (q.ret ? 'rt' : 'ow'); });
  if (q.ret) $('#retDate').value = q.ret;
  $('#retField').hidden = !q.ret;
  if (q.pax) $('#pax').value = q.pax;
  if (q.cabin) $('#cabin').value = q.cabin;
}

function validate(q) {
  if (!q.o) return 'Elige un aeropuerto de origen.';
  if (!q.d) return 'Elige un aeropuerto de destino.';
  if (q.o === q.d) return 'El origen y el destino no pueden ser iguales.';
  if (!q.dep) return 'Elige la fecha de salida.';
  if (parseD(q.dep) < TODAY) return 'La fecha de salida ya pasó.';
  if (q.ret === '') return 'Elige la fecha de regreso o marca "Solo ida".';
  if (q.ret && parseD(q.ret) < parseD(q.dep)) return 'El regreso debe ser después de la salida.';
  return null;
}

function queryToHash(q) {
  const p = new URLSearchParams({ o: q.o, d: q.d, dep: q.dep, p: q.pax, c: q.cabin });
  if (q.ret) p.set('ret', q.ret);
  return `#buscar?${p}`;
}

function runSearch(q, { scroll = true } = {}) {
  const err = validate(q);
  const errEl = $('#formError');
  if (err) { errEl.textContent = err; errEl.hidden = false; return; }
  errEl.hidden = true;

  S.q = q;
  S.sort = 'best';
  S.f = null;
  history.replaceState(null, '', queryToHash(q));
  saveRecent(q);
  renderQuickChips();

  $('#features').hidden = true;
  $('#results').hidden = false;
  $('#flightList').innerHTML = Array.from({ length: 4 }, () => '<div class="skel skel-card"></div>').join('');
  $('#insights').innerHTML = Array.from({ length: 4 }, () => '<div class="skel" style="height:96px"></div>').join('');
  $('#dateStrip').innerHTML = '';
  $('#recoPanel').innerHTML = '';
  if (scroll) setTimeout(() => $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  setTimeout(() => {
    S.itins = buildItins(q.o, q.d, q.dep, q.ret);
    resetFilters();
    renderAll();
  }, 450);
}

function renderAll() {
  const q = S.q;
  if (!q) return;
  const tripTxt = q.ret ? `${fmtD(q.dep)} – ${fmtD(q.ret)}` : `${fmtD(q.dep)} · solo ida`;
  $('#resTitle').textContent = `${AP[q.o].city} → ${AP[q.d].city}`;
  $('#resSub').textContent = `${tripTxt} · ${q.pax} ${q.pax > 1 ? 'adultos' : 'adulto'} · ${CABIN[q.cabin].n}${S.bag ? ' · con maleta facturada' : ''}`;
  updateAlertBtn();
  renderStripAndInsights();
  renderReco();
  renderFilters();
  renderList();
}

/* ---------------- insights + fechas flexibles ---------------- */
function renderStripAndInsights() {
  const q = S.q;
  const tripLen = q.ret ? daysBetween(parseD(q.dep), parseD(q.ret)) : null;
  const days = [];
  for (let off = -3; off <= 3; off++) {
    const dep = addDays(q.dep, off);
    const ok = daysBetween(TODAY, parseD(dep)) >= 0;
    const ret = q.ret ? addDays(q.ret, off) : null;
    days.push({ off, dep, ret, ok, p: ok ? cheapest(q.o, q.d, dep, ret, q.cabin) : null });
  }
  const valid = days.filter(d => d.ok);
  const min = Math.min(...valid.map(d => d.p)), max = Math.max(...valid.map(d => d.p));
  const cur = days.find(d => d.off === 0);
  const best = valid.find(d => d.p === min);

  $('#stripNote').textContent = q.ret ? `Mismo viaje de ${tripLen} ${tripLen === 1 ? 'noche' : 'noches'}, precio por persona` : 'Precio por persona';
  $('#dateStrip').innerHTML = days.map(d => {
    const lvl = !d.ok ? '' : d.p <= min * 1.04 ? 'lvl-low' : max > min * 1.15 && d.p >= max * 0.96 ? 'lvl-high' : '';
    const dd = parseD(d.dep);
    return `<button type="button" class="dchip ${lvl} ${d.off === 0 ? 'current' : ''} ${d.ok && d === best && min < cur.p ? 'best' : ''}" data-off="${d.off}" ${d.ok ? '' : 'disabled'}>
      <span class="dw">${DOW[dd.getDay()]}</span>
      <span class="dd">${dd.getDate()} ${MON[dd.getMonth()]}</span>
      <span class="dp">${d.ok ? money(d.p) : '—'}</span>
    </button>`;
  }).join('');

  // Insights
  const typ = typicalPrice(q.o, q.d, tripLen, q.cabin);
  const ratio = cur.p / typ;
  const lvl = ratio < 0.9 ? 'low' : ratio > 1.12 ? 'high' : 'mid';
  const lvlTxt = { low: 'Precio bajo', mid: 'Precio típico', high: 'Precio alto' }[lvl];
  const lvlCls = { low: 'good', mid: 'warn', high: 'bad' }[lvl];
  const pct = Math.round(Math.abs(1 - ratio) * 100);
  const lvlDesc = lvl === 'mid' ? `En línea con lo habitual (~${money(typ)}).` : `${pct}% ${lvl === 'low' ? 'por debajo' : 'por encima'} de lo habitual (~${money(typ)}).`;

  const ahead = daysBetween(TODAY, parseD(q.dep));
  const long = hav(AP[q.o], AP[q.d]) > 3500;
  let buy;
  if (ahead < 7) buy = { c: 'bad', v: 'Compra ya', d: `Faltan ${ahead} días: en la última semana los precios suben rápido.` };
  else if (lvl === 'high' && ahead > 45) buy = { c: 'warn', v: 'Espera y vigila', d: 'El precio está alto y aún tienes margen. Crea una alerta.' };
  else if ((long && ahead < 40) || (!long && ahead < 18)) buy = { c: 'warn', v: 'Compra pronto', d: `Quedan ${ahead} días; ${long ? 'para vuelos largos lo ideal es 2-5 meses antes' : 'lo ideal es 3-8 semanas antes'}.` };
  else buy = { c: 'good', v: 'Buen momento', d: `Estás en la ventana recomendada (${ahead} días antes).` };

  const dateSave = (cur.p - min) * q.pax;
  const dayIns = best && min < cur.p
    ? { c: 'good', v: `${DOW_L[parseD(best.dep).getDay()]} ${parseD(best.dep).getDate()}`, d: `Ahorras ${money(dateSave)} en total saliendo ${best.off > 0 ? best.off + ' día(s) después' : -best.off + ' día(s) antes'}.` }
    : { c: 'good', v: 'Tu fecha', d: 'Es la más barata de la semana. ¡Bien elegida!' };

  const bestFast = S.itins.length ? S.itins.reduce((a, b) => (b.dur < a.dur ? b : a)) : null;
  const directCount = S.itins.filter(i => i.out.stops === 0).length;

  $('#insights').innerHTML = `
    <div class="insight ${lvlCls}">
      <span class="k">Nivel de precio</span>
      <span class="v">${lvlTxt}</span>
      <div class="gauge"><i style="left:${clamp((ratio - 0.7) / 0.7, 0.03, 0.97) * 100}%"></i></div>
      <span class="d">${lvlDesc}</span>
    </div>
    <div class="insight ${buy.c}">
      <span class="k">¿Cuándo comprar?</span>
      <span class="v">${buy.v}</span>
      <span class="d">${buy.d}</span>
    </div>
    <div class="insight ${dayIns.c}">
      <span class="k">Mejor fecha cercana</span>
      <span class="v">${dayIns.v}</span>
      <span class="d">${dayIns.d}</span>
    </div>
    <div class="insight">
      <span class="k">Ida sin escalas</span>
      <span class="v">${directCount ? `${directCount} ${directCount > 1 ? 'opciones' : 'opción'}` : 'Ninguno'}</span>
      <span class="d">${bestFast ? `El más rápido tarda ${fdur(bestFast.out.dur)} por trayecto.` : ''}</span>
    </div>`;
}

/* ---------------- recomendaciones de aeropuertos ---------------- */
function altRows(fixedEnd, mainCode, side) {
  const q = S.q;
  const base = side === 'from' ? cheapest(q.o, q.d, q.dep, q.ret, q.cabin) : cheapest(q.o, q.d, q.dep, q.ret, q.cabin);
  const trips = q.ret ? 2 : 1;
  const rows = [{ ap: AP[mainCode], km: 0, price: base, ground: { eur: 0, min: 0, mode: '—' }, net: base, main: true }];
  for (const n of nearbyAirports(mainCode)) {
    if (n.ap.c === fixedEnd || hav(n.ap, AP[fixedEnd]) < 150) continue;
    const price = side === 'from' ? cheapest(n.ap.c, q.d, q.dep, q.ret, q.cabin) : cheapest(q.o, n.ap.c, q.dep, q.ret, q.cabin);
    if (!isFinite(price)) continue;
    const g = groundCost(AP[mainCode], n.ap);
    rows.push({ ap: n.ap, km: n.km, price, ground: g, net: price + g.eur * trips });
  }
  rows.forEach(r => { r.save = base - r.net; });
  return rows.sort((a, b) => a.net - b.net).slice(0, 6);
}

function recoBlock(side) {
  const q = S.q;
  const main = side === 'from' ? q.o : q.d;
  const other = side === 'from' ? q.d : q.o;
  const rows = altRows(other, main, side);
  const title = side === 'from' ? '¿Desde dónde te conviene salir?' : '¿A qué aeropuerto te conviene llegar?';
  const ico = side === 'from' ? '🛫' : '🛬';
  const lead = side === 'from'
    ? `Comparamos ${esc(AP[main].city)} con aeropuertos a menos de ${NEARBY_KM} km, sumando el transporte terrestre${q.ret ? ' (ida y vuelta)' : ''}.`
    : `Aeropuertos cerca de ${esc(AP[main].city)}, incluyendo el traslado hasta tu destino final.`;

  if (rows.length === 1) {
    return `<div>
      <div class="reco-title"><span class="ico">${ico}</span><h3>${title}</h3></div>
      <p class="reco-lead">${lead}</p>
      <div class="reco-callout neutral"><span>ℹ️</span><span>No hay aeropuertos alternativos a menos de ${NEARBY_KM} km de <b>${esc(AP[main].city)}</b>. Prueba a cambiar las fechas para ahorrar.</span></div>
    </div>`;
  }
  const best = rows[0];
  const callout = !best.main && best.save > 3
    ? `<div class="reco-callout"><span>💡</span><span>${side === 'from' ? 'Sal desde' : 'Vuela a'} <b>${esc(best.ap.city)} (${best.ap.c})</b> y ahorra <b>${money(best.save)}</b> por persona${q.pax > 1 ? ` (${money(best.save * q.pax)} en total)` : ''}, ya contando ${best.ground.mode.toLowerCase()} (~${fdur(best.ground.min)}).${best.ap.note ? ` ${esc(best.ap.note)}` : ''}</span></div>`
    : `<div class="reco-callout neutral"><span>✅</span><span><b>${esc(AP[main].city)} (${main})</b> ya es la opción más conveniente. Cambiar de aeropuerto no compensa el coste del transporte.</span></div>`;

  return `<div>
    <div class="reco-title"><span class="ico">${ico}</span><h3>${title}</h3></div>
    <p class="reco-lead">${lead}</p>
    ${callout}
    <table class="reco-table">
      <thead><tr><th>Aeropuerto</th><th class="num">Vuelo</th><th class="num hide-sm">Traslado</th><th class="num">Ahorro</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr class="${r.main ? '' : 'clickable'}" ${r.main ? '' : `data-side="${side}" data-code="${r.ap.c}" tabindex="0" title="Buscar con ${esc(r.ap.city)} (${r.ap.c})"`}>
          <td class="ap"><b>${r.ap.c} · ${esc(r.ap.city)}</b><span>${r.main ? 'Tu elección' : `${r.km} km · ${esc(r.ground.mode)}`}</span></td>
          <td class="num">${money(r.price)}</td>
          <td class="num hide-sm">${r.main ? '—' : `+${money(r.ground.eur * (q.ret ? 2 : 1))}`}</td>
          <td class="num">${r.main ? '<span class="tag blue">Actual</span>' : r.save > 0 ? `<span class="save-pos">−${money(r.save)}</span>` : `<span class="save-neg">+${money(-r.save)}</span>`}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderReco() {
  const panel = $('#recoPanel');
  if (!S.nearby) { panel.hidden = true; return; }
  panel.hidden = false;
  panel.innerHTML = `<div class="reco-grid">${recoBlock('from')}${recoBlock('to')}</div>`;
}

/* ---------------- filtros ---------------- */
const TIMES = [
  { k: 'm', n: 'Madrugada', r: [0, 360], l: '00–06' },
  { k: 'a', n: 'Mañana', r: [360, 720], l: '06–12' },
  { k: 't', n: 'Tarde', r: [720, 1080], l: '12–18' },
  { k: 'n', n: 'Noche', r: [1080, 1440], l: '18–24' },
];

function resetFilters() {
  const its = S.itins;
  S.f = {
    stops: new Set([0, 1, 2]),
    airlines: new Set(its.flatMap(i => i.airlines)),
    times: new Set(),
    maxPrice: its.length ? Math.max(...its.map(i => ppEur(i))) : 0,
    maxDur: its.length ? Math.max(...its.map(i => i.out.dur)) : 0,
  };
}

function renderFilters() {
  const its = S.itins;
  if (!its.length) { $('#filtersBody').innerHTML = ''; return; }
  const minBy = pred => { const v = its.filter(pred).map(i => ppEur(i)); return v.length ? money(Math.min(...v)) : null; };
  const stopLbl = ['Directo', '1 escala', '2+ escalas'];
  const als = [...new Set(its.flatMap(i => i.airlines))].sort((a, b) => AIRLINES[a].n.localeCompare(AIRLINES[b].n));
  const prices = its.map(i => ppEur(i));
  const pMin = Math.min(...prices), pMax = Math.max(...prices);
  const durs = its.map(i => i.out.dur);
  const dMin = Math.min(...durs), dMax = Math.max(...durs);
  S.f.maxPrice = clamp(S.f.maxPrice, pMin, pMax);

  $('#filtersBody').innerHTML = `
    <div class="fgroup"><h4>Escalas</h4>
      ${[0, 1, 2].map(s => {
        const mp = minBy(i => i.stops === s);
        return `<label class="fcheck"><input type="checkbox" data-f="stops" value="${s}" ${S.f.stops.has(s) ? 'checked' : ''} ${mp ? '' : 'disabled'}>${stopLbl[s]}<span class="fp">${mp || '—'}</span></label>`;
      }).join('')}
    </div>
    <div class="fgroup"><h4>Hora de salida (ida)</h4>
      <div class="time-chips">${TIMES.map(t => `<button type="button" class="tchip" data-time="${t.k}" aria-pressed="${S.f.times.has(t.k)}">${t.n}<small>${t.l}</small></button>`).join('')}</div>
    </div>
    <div class="fgroup"><h4>Precio máximo · <span class="range-val" id="fPriceVal">${money(S.f.maxPrice)}</span></h4>
      <input type="range" id="fPrice" min="${pMin}" max="${pMax}" step="1" value="${S.f.maxPrice}" aria-label="Precio máximo">
    </div>
    <div class="fgroup"><h4>Duración máx. por trayecto · <span class="range-val" id="fDurVal">${fdurS(S.f.maxDur)}</span></h4>
      <input type="range" id="fDur" min="${dMin}" max="${dMax}" step="5" value="${clamp(S.f.maxDur, dMin, dMax)}" aria-label="Duración máxima">
    </div>
    <div class="fgroup"><h4>Aerolíneas</h4>
      ${als.map(a => `<label class="fcheck"><input type="checkbox" data-f="airlines" value="${a}" ${S.f.airlines.has(a) ? 'checked' : ''}>${esc(AIRLINES[a].n)}${AIRLINES[a].lc ? ' <span class="tag orange">low cost</span>' : ''}<span class="fp">${minBy(i => i.airlines.includes(a))}</span></label>`).join('')}
    </div>`;
}

function applyFilters(its) {
  const f = S.f;
  return its.filter(i => {
    if (!f.stops.has(Math.min(i.stops, 2))) return false;
    if (!i.airlines.every(a => f.airlines.has(a))) return false;
    if (ppEur(i) > f.maxPrice) return false;
    if (i.out.dur > f.maxDur) return false;
    if (f.times.size) {
      const dep = i.out.dep;
      if (![...f.times].some(k => { const t = TIMES.find(x => x.k === k); return dep >= t.r[0] && dep < t.r[1]; })) return false;
    }
    return true;
  });
}

/* ---------------- lista de vuelos ---------------- */
function scoreBest(list) {
  const pMin = Math.min(...list.map(i => ppEur(i))), dMin = Math.min(...list.map(i => i.dur));
  const m = new Map();
  list.forEach(i => {
    const al = AIRLINES[i.out.al];
    m.set(i.id, (ppEur(i) / pMin) * 0.62 + (i.dur / dMin) * 0.38 + i.stops * 0.04 + (al.q < 3.4 ? 0.05 : 0) + (i.mixed ? 0.04 : 0));
  });
  return m;
}

function renderList() {
  const listEl = $('#flightList');
  const all = S.itins;
  const list = applyFilters(all);
  const q = S.q;

  if (!all.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="big">🛩️</div><h3>No encontramos vuelos</h3><p>Prueba con otras fechas o aeropuertos cercanos.</p></div>`;
    $('#sortTabs').innerHTML = '';
    return;
  }

  const best = scoreBest(all);
  const cheapestIt = all.reduce((a, b) => (ppEur(b) < ppEur(a) ? b : a));
  const fastestIt = all.reduce((a, b) => (b.dur < a.dur ? b : a));
  const bestIt = all.reduce((a, b) => (best.get(b.id) < best.get(a.id) ? b : a));
  const avgCo2 = all.reduce((s, i) => s + i.co2, 0) / all.length;

  const tabs = [
    { k: 'best', l: 'Mejor opción', it: bestIt },
    { k: 'cheap', l: 'Más barato', it: cheapestIt },
    { k: 'fast', l: 'Más rápido', it: fastestIt },
  ];
  $('#sortTabs').innerHTML = tabs.map(t => `<button type="button" class="stab" role="tab" data-sort="${t.k}" aria-selected="${S.sort === t.k}">
      <span class="sl">${t.l}</span><span class="sv">${money(ppEur(t.it))} · ${fdurS(t.it.out.dur)}</span></button>`).join('');

  const sorted = [...list].sort((a, b) => {
    if (S.sort === 'cheap') return ppEur(a) - ppEur(b) || a.dur - b.dur;
    if (S.sort === 'fast') return a.dur - b.dur || ppEur(a) - ppEur(b);
    return best.get(a.id) - best.get(b.id);
  });

  if (!sorted.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="big">🔎</div><h3>Ningún vuelo cumple los filtros</h3><p>Hay ${all.length} vuelos ocultos.</p><br><button class="btn btn-ghost" type="button" id="clearF2">Quitar filtros</button></div>`;
    return;
  }

  listEl.innerHTML = sorted.map(it => {
    const badges = [];
    if (it === bestIt) badges.push('<span class="tag blue">★ Mejor opción</span>');
    if (it === cheapestIt) badges.push('<span class="tag good">€ Más barato</span>');
    if (it === fastestIt) badges.push('<span class="tag orange">⚡ Más rápido</span>');

    const meta = [];
    if (it.bagFee > 0) {
      meta.push(S.bag ? `<span class="tag blue">🧳 Maleta sumada (+${money(it.bagFee)})</span>` : `<span class="tag warn">🧳 Maleta +${money(it.bagFee)}</span>`);
    } else meta.push('<span class="tag good">🧳 Maleta incluida</span>');
    if (it.out.basic || (it.ret && it.ret.basic)) meta.push('<span class="tag">Tarifa básica</span>');
    if (it.airlines.some(a => AIRLINES[a].lc)) meta.push('<span class="tag orange">Low cost</span>');
    if (it.mixed) meta.push('<span class="tag warn" title="Ida y vuelta con aerolíneas distintas">🔀 Combina aerolíneas</span>');
    const legs = [it.out, it.ret].filter(Boolean);
    if (legs.some(l => l.lays.some(x => x >= 420))) meta.push('<span class="tag bad">Escala larga</span>');
    if (legs.some(l => l.dep < 360)) meta.push('<span class="tag">🌙 Nocturno</span>');
    const co2Diff = Math.round((it.co2 / avgCo2 - 1) * 100);
    meta.push(`<span class="tag ${co2Diff <= -8 ? 'good' : ''}" title="Emisiones estimadas por pasajero">🌱 ${Math.round(it.co2 * CABIN[q.cabin].co2)} kg CO₂${co2Diff <= -8 ? ` (${co2Diff}%)` : ''}</span>`);

    const pp = ppEur(it);
    return `<article class="fcard" data-id="${esc(it.id)}">
      <div class="fcard-main">
        ${badges.length ? `<div class="fcard-badges">${badges.join('')}</div>` : ''}
        ${legs.map(legHtml).join('')}
        <div class="fcard-meta">${meta.join('')}</div>
        <button type="button" class="details-btn" data-details aria-expanded="false">Ver detalles del itinerario ▾</button>
      </div>
      <div class="fcard-side">
        <div>
          <div class="price">${money(pp)}</div>
          <div class="price-sub">por persona${q.ret ? ', ida y vuelta' : ''}</div>
          ${q.pax > 1 ? `<div class="price-sub"><b>${money(pp * q.pax)}</b> total</div>` : ''}
          ${!S.bag && it.bagFee > 0 ? `<div class="price-extra">Con maleta: ${money(Math.round((it.fare + it.bagFee) * CABIN[q.cabin].m))}</div>` : ''}
        </div>
        <button type="button" class="btn btn-accent" data-book>Ver oferta</button>
      </div>
      <div class="fdetails" hidden>${detailsHtml(it)}</div>
    </article>`;
  }).join('');
}

function legHtml(l) {
  const a = AIRLINES[l.al];
  const dayOff = Math.floor(l.arr / 1440);
  const stopsTxt = l.stops === 0 ? 'Directo' : `${l.stops} escala${l.stops > 1 ? 's' : ''} · ${l.via.join(', ')}`;
  const dots = l.via.map((_, i) => `<i style="left:${((i + 1) / (l.via.length + 1)) * 100}%"></i>`).join('');
  return `<div class="leg">
    <div class="al">${alLogo(l.al)}<span class="al-name">${esc(a.n)}<small>${fmtD(l.ds)} · ★ ${a.q.toFixed(1)}</small></span></div>
    <div class="route">
      <div class="tpt"><div class="t">${hhmm(l.dep)}</div><div class="c">${l.from}</div></div>
      <div class="path">
        <span class="dur">${fdurS(l.dur)}</span>
        <div class="line">${dots}</div>
        <span class="stops ${l.stops ? 'has' : ''}">${stopsTxt}</span>
      </div>
      <div class="tpt"><div class="t">${hhmm(l.arr)}${dayOff ? `<sup>${dayOff > 0 ? '+' : ''}${dayOff}</sup>` : ''}</div><div class="c">${l.to}</div></div>
    </div>
  </div>`;
}

function detailsHtml(it) {
  const legs = [['Ida', it.out], ['Vuelta', it.ret]].filter(x => x[1]);
  return legs.map(([lbl, l]) => `
    <div class="dlabel">${lbl} · ${fmtD(l.ds)} · ${esc(AIRLINES[l.al].n)}</div>
    ${l.segs.map((s, i) => `
      <div class="seg"><span class="st">${hhmm(s.dep)}</span><span><b>${esc(AP[s.from].city)}</b> (${s.from}) · ${esc(AP[s.from].n)}</span></div>
      <div class="seg"><span class="st muted">${fdurS(s.fm)}</span><span class="muted">Vuelo ${s.al}${100 + (seedFrom(l.id + i) % 8900)}</span></div>
      <div class="seg"><span class="st">${hhmm(s.arr)}</span><span><b>${esc(AP[s.to].city)}</b> (${s.to}) · ${esc(AP[s.to].n)}</span></div>
      ${l.lays[i] != null ? `<div class="layover">⏱ Escala de ${fdur(l.lays[i])} en ${esc(AP[s.to].city)}${l.lays[i] < 70 ? ' · conexión ajustada' : l.lays[i] >= 420 ? ' · considera un hotel o salir a la ciudad' : ''}</div>` : ''}
    `).join('')}
  `).join('<hr style="border:none;border-top:1px solid var(--border);margin:10px 0">') +
    (it.mixed ? '<p class="small muted" style="margin-top:10px">🔀 Ida y vuelta con aerolíneas distintas: suele ser más barato, pero cada trayecto puede tener reglas de equipaje y cambios diferentes.</p>' : '') +
    (it.bagFee > 0 ? `<p class="small muted" style="margin-top:6px">🧳 Esta tarifa no incluye maleta facturada. Coste estimado: ${money(it.bagFee)} por persona (ida y vuelta).</p>` : '');
}

/* ---------------- hoja de reserva ---------------- */
function yymmdd(s) { return s.slice(2).replace(/-/g, ''); }
function openBook(it) {
  const q = S.q;
  const cabinSky = { eco: 'economy', prem: 'premiumeconomy', bus: 'business' }[q.cabin];
  const cabinKayak = { eco: '', prem: '/premium', bus: '/business' }[q.cabin];
  const gq = `Flights from ${q.o} to ${q.d} on ${q.dep}${q.ret ? ` through ${q.ret}` : ' one way'}${q.pax > 1 ? ` for ${q.pax} adults` : ''}${q.cabin === 'bus' ? ' business class' : ''}`;
  const links = [
    { n: 'Google Flights', col: '#1a73e8', ab: 'G', url: `https://www.google.com/travel/flights?q=${encodeURIComponent(gq)}&curr=${S.currency}&hl=es` },
    { n: 'Skyscanner', col: '#0062e3', ab: 'S', url: `https://www.skyscanner.net/transport/flights/${q.o.toLowerCase()}/${q.d.toLowerCase()}/${yymmdd(q.dep)}/${q.ret ? yymmdd(q.ret) + '/' : ''}?adultsv2=${q.pax}&cabinclass=${cabinSky}` },
    { n: 'Kayak', col: '#ff690f', ab: 'K', url: `https://www.kayak.com/flights/${q.o}-${q.d}/${q.dep}${q.ret ? '/' + q.ret : ''}/${q.pax}adults${cabinKayak}` },
    { n: `Web de ${AIRLINES[it.out.al].n}`, col: AIRLINES[it.out.al].col, ab: it.out.al, url: `https://www.google.com/search?q=${encodeURIComponent(AIRLINES[it.out.al].n + ' sitio oficial')}` },
  ];
  $('#sheetBody').innerHTML = `
    <p class="s-sum">${apLabel(q.o)} → ${apLabel(q.d)} · ${fmtD(q.dep)}${q.ret ? ` – ${fmtD(q.ret)}` : ''}<br>
    Precio estimado: <b>${money(ppEur(it))}</b> por persona con ${esc(it.airlines.map(a => AIRLINES[a].n).join(' + '))}</p>
    ${links.map(l => `<a class="provider" href="${l.url}" target="_blank" rel="noopener noreferrer">
      <span class="pl" style="background:${l.col}">${esc(l.ab)}</span>${esc(l.n)}<span class="arrow">↗</span></a>`).join('')}
    <p class="note">Los precios de VueloJusto son estimaciones. Abre un buscador para ver la tarifa real y disponibilidad en este momento.</p>
    <button type="button" class="btn btn-ghost" style="width:100%;margin-top:12px" id="closeSheet">Cerrar</button>`;
  $('#sheetBackdrop').hidden = false;
  $('#bookSheet').hidden = false;
  $('#closeSheet').focus();
}
function closeSheet() { $('#sheetBackdrop').hidden = true; $('#bookSheet').hidden = true; }

/* =========================================================
 * Recientes / chips rápidos
 * ========================================================= */
function saveRecent(q) {
  const rec = store.get('vj_recent', []).filter(r => !(r.o === q.o && r.d === q.d));
  rec.unshift({ o: q.o, d: q.d });
  store.set('vj_recent', rec.slice(0, 4));
}

function renderQuickChips() {
  const rec = store.get('vj_recent', []);
  const html = [];
  if (rec.length) {
    html.push('<span class="label">Recientes:</span>');
    rec.forEach(r => html.push(`<button type="button" class="qchip" data-o="${r.o}" data-d="${r.d}">${esc(AP[r.o].city)} → ${esc(AP[r.d].city)}</button>`));
  } else {
    html.push('<span class="label">Populares:</span>');
    POPULAR_ROUTES.slice(0, 5).forEach(([o, d]) => html.push(`<button type="button" class="qchip" data-o="${o}" data-d="${d}">${esc(AP[o].city)} → ${esc(AP[d].city)}</button>`));
  }
  $('#quickChips').innerHTML = html.join('');
}

/* =========================================================
 * Alertas
 * ========================================================= */
const alerts = () => store.get('vj_alerts', []);
const alertKey = q => `${q.o}-${q.d}-${q.dep}-${q.ret || ''}-${q.cabin}`;

function updateAlertBadge() {
  const n = alerts().length;
  const b = $('#alertCount');
  b.textContent = n;
  b.hidden = !n;
}
function updateAlertBtn() {
  const on = S.q && alerts().some(a => a.id === alertKey(S.q));
  $('#alertBtn span').textContent = on ? 'Alerta activa' : 'Crear alerta';
  $('#alertBtn').classList.toggle('btn-primary', !!on);
  $('#alertBtn').classList.toggle('btn-ghost', !on);
}
function toggleAlert() {
  const q = S.q;
  if (!q) return;
  const list = alerts();
  const id = alertKey(q);
  const i = list.findIndex(a => a.id === id);
  if (i >= 0) { list.splice(i, 1); toast('Alerta eliminada'); }
  else {
    const p = cheapest(q.o, q.d, q.dep, q.ret, q.cabin);
    list.unshift({ id, ...q, bag: S.bag, saved: p, ts: Date.now() });
    toast(`🔔 Vigilando ${AP[q.o].city} → ${AP[q.d].city} desde ${money(p)}`);
  }
  store.set('vj_alerts', list);
  updateAlertBadge();
  updateAlertBtn();
}

function renderAlerts() {
  const list = alerts();
  const el = $('#alertList');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="big">🔔</div><h3>Aún no tienes alertas</h3><p>Busca un vuelo y pulsa <b>Crear alerta</b> para vigilar su precio.</p><br><a class="btn btn-primary" href="#buscar">Buscar vuelos</a></div>`;
    return;
  }
  el.innerHTML = list.map(a => {
    const past = parseD(a.dep) < TODAY;
    const prevBag = S.bag;
    S.bag = !!a.bag;
    const now = past ? null : cheapest(a.o, a.d, a.dep, a.ret, a.cabin);
    S.bag = prevBag;
    const diff = now != null ? now - a.saved : 0;
    const trend = past ? '<span class="tag">Fecha pasada</span>'
      : Math.abs(diff) < 1 ? '<span class="tag">Sin cambios</span>'
      : diff < 0 ? `<span class="tag good">▼ Bajó ${money(-diff)}</span>` : `<span class="tag bad">▲ Subió ${money(diff)}</span>`;
    return `<article class="acard">
      <div>
        <h3>${esc(AP[a.o].city)} → ${esc(AP[a.d].city)}</h3>
        <p class="muted small">${a.o} – ${a.d} · ${fmtD(a.dep)}${a.ret ? ` – ${fmtD(a.ret)}` : ' · solo ida'} · ${a.pax} pax · ${CABIN[a.cabin].n}</p>
        <div class="a-prices">
          <div><small>Al guardar</small><b>${money(a.saved)}</b></div>
          <div><small>Hoy</small><b>${now != null ? money(now) : '—'}</b></div>
          <div><small>Tendencia</small>${trend}</div>
        </div>
      </div>
      <div class="a-actions">
        ${past ? '' : `<button type="button" class="btn btn-primary btn-sm" data-alert-open="${esc(a.id)}">Ver vuelos</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-alert-del="${esc(a.id)}" aria-label="Eliminar alerta">Eliminar</button>
      </div>
    </article>`;
  }).join('');
}

/* =========================================================
 * Explorar
 * ========================================================= */
function exploreMonths() {
  const sel = $('#exMonth');
  const opts = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + i, 1);
    opts.push(`<option value="${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}">${MON_L[d.getMonth()]} ${d.getFullYear()}</option>`);
  }
  sel.innerHTML = opts.join('');
  sel.selectedIndex = 1;
}

function renderExplore() {
  const oc = $('#exOrigin').dataset.code;
  const grid = $('#destGrid');
  $('#exBudgetVal').textContent = +$('#exBudget').value >= 1500 ? 'sin límite' : money(+$('#exBudget').value);
  if (!oc) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="big">🧭</div><h3>Elige tu ciudad de salida</h3><p>Te mostraremos los destinos más baratos.</p></div>';
    return;
  }
  const [y, m] = $('#exMonth').value.split('-').map(Number);
  const minDep = new Date(TODAY.getTime() + 3 * 864e5);
  const dates = [3, 10, 17, 24].map(d => new Date(y, m - 1, d)).filter(d => d >= minDep).map(iso);
  if (!dates.length) dates.push(iso(minDep));
  const o = AP[oc];
  const budget = +$('#exBudget').value;
  const prevBag = S.bag;

  const byCity = new Map();
  for (const a of AIRPORTS) {
    if (a.c === oc || hav(o, a) < 300) continue; // a menos de 300 km conviene ir por tierra
    let best = null;
    for (const dep of dates) {
      const ret = addDays(dep, 7);
      const p = cheapest(oc, a.c, dep, ret, 'eco');
      if (!best || p < best.p) best = { p, dep, ret };
    }
    const key = `${a.city.split(' (')[0]}-${a.cc}`;
    const prev = byCity.get(key);
    if (!prev || best.p < prev.best.p) byCity.set(key, { a, best });
  }
  S.bag = prevBag;
  let rows = [...byCity.values()];
  if (S.exRegion !== 'ALL') rows = rows.filter(r => (S.exRegion === 'LATAM' ? ['MX', 'CA', 'SA'].includes(r.a.r) : r.a.r === S.exRegion));
  if (budget < 1500) rows = rows.filter(r => r.best.p <= budget);
  rows.sort((x, y2) => x.best.p - y2.best.p);

  if (!rows.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="big">💸</div><h3>Nada con ese presupuesto</h3><p>Sube el presupuesto o cambia de mes.</p></div>';
    return;
  }
  const minP = rows[0].best.p;
  grid.innerHTML = rows.map((r, i) => {
    const h = seedFrom(r.a.city) % 360;
    const deal = r.best.p <= minP * 1.15 && i < 3;
    const km = Math.round(hav(o, r.a));
    return `<button type="button" class="dcard" data-ex="${r.a.c}" data-dep="${r.best.dep}" data-ret="${r.best.ret}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <div class="dcard-top" style="background:linear-gradient(135deg,hsl(${h} 70% 45%),hsl(${(h + 40) % 360} 75% 58%))">
        <span class="tagline">${deal ? '🔥 Ganga' : esc(REGIONS[r.a.r])}</span>
        <span class="code">${r.a.c}</span>
      </div>
      <div class="dcard-body">
        <h3>${esc(r.a.city)}</h3>
        <span class="muted small">${esc(COUNTRIES[r.a.cc])} · ${km.toLocaleString('es-ES')} km</span>
        <div class="row"><span class="from">Ida y vuelta desde<br>${fmtD(r.best.dep)} · 7 noches</span><span class="p">${money(r.best.p)}</span></div>
      </div>
    </button>`;
  }).join('');
}

function renderExRegions() {
  const regs = [['ALL', 'Todos'], ['EU', 'Europa'], ['US', 'EE. UU.'], ['LATAM', 'Latinoamérica']];
  $('#exRegions').innerHTML = regs.map(([k, n]) => `<button type="button" class="chip" data-region="${k}" aria-pressed="${S.exRegion === k}">${n}</button>`).join('');
}

/* =========================================================
 * Guía
 * ========================================================= */
function renderGuide() {
  $('#guideGrid').innerHTML = GUIDE.map(g => `<article class="gcard"><div class="g-ico">${g.i}</div><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p><p class="tip">→ ${esc(g.tip)}</p></article>`).join('');
  const done = store.get('vj_check', []);
  $('#checklist').innerHTML = CHECKLIST.map((c, i) => `<li><input type="checkbox" id="ck${i}" data-ck="${i}" ${done.includes(i) ? 'checked' : ''}><label for="ck${i}">${esc(c)}</label></li>`).join('');
  $('#glossary').innerHTML = GLOSSARY.map(([t, d]) => `<details><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join('');
}

/* =========================================================
 * Navegación
 * ========================================================= */
function route() {
  const [view, qs] = (location.hash.slice(1) || 'buscar').split('?');
  const v = ['buscar', 'explorar', 'alertas', 'guia'].includes(view) ? view : 'buscar';
  $$('.view').forEach(s => { s.hidden = s.id !== `view-${v}`; });
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  if (v === 'alertas') renderAlerts();
  if (v === 'explorar') renderExplore();
  if (v === 'buscar' && qs) {
    const p = new URLSearchParams(qs);
    const q = { o: p.get('o'), d: p.get('d'), dep: p.get('dep'), ret: p.get('ret'), pax: +(p.get('p') || 1), cabin: p.get('c') || 'eco' };
    if (AP[q.o] && AP[q.d] && q.dep && (!S.q || alertKey(S.q) !== alertKey(q) || S.q.pax !== q.pax)) {
      fillForm(q);
      runSearch(q, { scroll: false });
    }
  }
  if (!qs) window.scrollTo({ top: 0 });
}

/* =========================================================
 * Inicio
 * ========================================================= */
function defaultCurrency() {
  const lang = (navigator.language || 'es').toLowerCase();
  if (lang === 'es-mx') return 'MXN';
  if (lang === 'es-co') return 'COP';
  if (lang === 'es-es' || lang === 'es') return 'EUR';
  if (lang.startsWith('es-') || lang.startsWith('en-us')) return 'USD';
  return 'EUR';
}
const DEFAULT_ORIGIN = { EUR: 'MAD', MXN: 'MEX', COP: 'BOG', USD: 'MIA' };

function initTheme() {
  const saved = store.get('vj_theme', null);
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('vj_theme', next);
  });
}

function init() {
  initTheme();
  S.currency = store.get('vj_currency', null) || defaultCurrency();
  $('#currency').value = S.currency;
  S.bag = store.get('vj_bag', false);
  $('#bagToggle').checked = S.bag;

  // fechas por defecto
  const dep = iso(new Date(TODAY.getTime() + 30 * 864e5));
  $('#depDate').value = dep;
  $('#retDate').value = addDays(dep, 7);
  $('#depDate').min = iso(TODAY);
  $('#retDate').min = dep;

  setupCombo($('#origin'));
  setupCombo($('#dest'));
  setupCombo($('#exOrigin'), () => renderExplore());
  const recent = store.get('vj_recent', []);
  const defO = recent[0] ? recent[0].o : DEFAULT_ORIGIN[S.currency];
  setAirport($('#origin'), defO);
  setAirport($('#exOrigin'), defO);

  exploreMonths();
  renderExRegions();
  renderGuide();
  renderQuickChips();
  updateAlertBadge();

  /* ---- eventos del formulario ---- */
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); runSearch(readForm()); });
  $$('input[name="trip"]').forEach(r => r.addEventListener('change', () => { $('#retField').hidden = r.value === 'ow' && r.checked; }));
  $('#depDate').addEventListener('change', () => {
    const d = $('#depDate').value;
    if (!d) return;
    $('#retDate').min = d;
    if (!$('#retDate').value || $('#retDate').value < d) $('#retDate').value = addDays(d, 7);
  });
  $('#swapBtn').addEventListener('click', () => {
    const a = $('#origin').dataset.code, b = $('#dest').dataset.code;
    setAirport($('#origin'), b);
    setAirport($('#dest'), a);
  });
  $('#nearbyToggle').addEventListener('change', e => { S.nearby = e.target.checked; if (S.q) renderReco(); });
  $('#bagToggle').addEventListener('change', e => {
    S.bag = e.target.checked;
    store.set('vj_bag', S.bag);
    if (S.q && S.itins.length) { resetFilters(); renderAll(); }
  });
  $('#currency').addEventListener('change', e => {
    S.currency = e.target.value;
    store.set('vj_currency', S.currency);
    if (S.q && S.itins.length) renderAll();
    if (!$('#view-explorar').hidden) renderExplore();
    if (!$('#view-alertas').hidden) renderAlerts();
  });
  $('#quickChips').addEventListener('click', e => {
    const b = e.target.closest('.qchip');
    if (!b) return;
    setAirport($('#origin'), b.dataset.o);
    setAirport($('#dest'), b.dataset.d);
    runSearch(readForm());
  });

  /* ---- resultados ---- */
  $('#dateStrip').addEventListener('click', e => {
    const b = e.target.closest('.dchip');
    if (!b || b.disabled || b.dataset.off === '0') return;
    const off = +b.dataset.off;
    const q = { ...S.q, dep: addDays(S.q.dep, off), ret: S.q.ret ? addDays(S.q.ret, off) : null };
    fillForm(q);
    runSearch(q, { scroll: false });
  });
  const recoGo = tr => {
    const q = { ...S.q };
    q[tr.dataset.side === 'from' ? 'o' : 'd'] = tr.dataset.code;
    fillForm(q);
    runSearch(q, { scroll: false });
    toast(`Buscando con ${apLabel(tr.dataset.code)}`);
  };
  $('#recoPanel').addEventListener('click', e => { const tr = e.target.closest('tr[data-code]'); if (tr) recoGo(tr); });
  $('#recoPanel').addEventListener('keydown', e => { const tr = e.target.closest('tr[data-code]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); recoGo(tr); } });

  $('#sortTabs').addEventListener('click', e => {
    const b = e.target.closest('.stab');
    if (!b) return;
    S.sort = b.dataset.sort;
    renderList();
  });
  $('#flightList').addEventListener('click', e => {
    const card = e.target.closest('.fcard');
    if (e.target.closest('#clearF2')) { resetFilters(); renderFilters(); renderList(); return; }
    if (!card) return;
    const it = S.itins.find(i => i.id === card.dataset.id);
    if (e.target.closest('[data-book]')) openBook(it);
    else if (e.target.closest('[data-details]')) {
      const det = $('.fdetails', card), btn = $('[data-details]', card);
      det.hidden = !det.hidden;
      btn.setAttribute('aria-expanded', !det.hidden);
      btn.textContent = det.hidden ? 'Ver detalles del itinerario ▾' : 'Ocultar detalles ▴';
    }
  });

  /* ---- filtros ---- */
  const fb = $('#filtersBody');
  fb.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.f === 'stops') t.checked ? S.f.stops.add(+t.value) : S.f.stops.delete(+t.value);
    if (t.dataset.f === 'airlines') t.checked ? S.f.airlines.add(t.value) : S.f.airlines.delete(t.value);
    renderList();
  });
  fb.addEventListener('input', e => {
    if (e.target.id === 'fPrice') { S.f.maxPrice = +e.target.value; $('#fPriceVal').textContent = money(S.f.maxPrice); renderList(); }
    if (e.target.id === 'fDur') { S.f.maxDur = +e.target.value; $('#fDurVal').textContent = fdurS(S.f.maxDur); renderList(); }
  });
  fb.addEventListener('click', e => {
    const b = e.target.closest('.tchip');
    if (!b) return;
    const k = b.dataset.time;
    S.f.times.has(k) ? S.f.times.delete(k) : S.f.times.add(k);
    b.setAttribute('aria-pressed', S.f.times.has(k));
    renderList();
  });
  $('#resetFilters').addEventListener('click', () => { resetFilters(); renderFilters(); renderList(); });
  const setFiltersOpen = v => { $('#filters').classList.toggle('open', v); $('#sheetBackdrop').hidden = !v; };
  $('#openFilters').addEventListener('click', () => setFiltersOpen(true));
  $('#closeFilters').addEventListener('click', () => setFiltersOpen(false));
  $('#applyFilters').addEventListener('click', () => { setFiltersOpen(false); $('#flightList').scrollIntoView({ behavior: 'smooth' }); });

  /* ---- hoja / backdrop ---- */
  $('#sheetBackdrop').addEventListener('click', () => { closeSheet(); setFiltersOpen(false); });
  $('#bookSheet').addEventListener('click', e => { if (e.target.id === 'closeSheet') closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheet(); setFiltersOpen(false); } });

  /* ---- alerta / compartir ---- */
  $('#alertBtn').addEventListener('click', toggleAlert);
  $('#shareBtn').addEventListener('click', async () => {
    const url = location.href;
    const title = `${AP[S.q.o].city} → ${AP[S.q.d].city} en VueloJusto`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
    } catch { /* cancelado */ }
  });
  $('#alertList').addEventListener('click', e => {
    const del = e.target.closest('[data-alert-del]');
    const open = e.target.closest('[data-alert-open]');
    if (del) {
      store.set('vj_alerts', alerts().filter(a => a.id !== del.dataset.alertDel));
      updateAlertBadge();
      renderAlerts();
    } else if (open) {
      const a = alerts().find(x => x.id === open.dataset.alertOpen);
      if (a) location.hash = queryToHash(a);
    }
  });

  /* ---- explorar ---- */
  $('#exMonth').addEventListener('change', renderExplore);
  $('#exBudget').addEventListener('input', renderExplore);
  $('#exRegions').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    S.exRegion = b.dataset.region;
    renderExRegions();
    renderExplore();
  });
  $('#destGrid').addEventListener('click', e => {
    const c = e.target.closest('.dcard');
    if (!c) return;
    const q = { o: $('#exOrigin').dataset.code, d: c.dataset.ex, dep: c.dataset.dep, ret: c.dataset.ret, pax: +$('#pax').value, cabin: 'eco' };
    location.hash = queryToHash(q);
  });

  /* ---- guía ---- */
  $('#checklist').addEventListener('change', e => {
    const done = $$('#checklist input:checked').map(i => +i.dataset.ck);
    store.set('vj_check', done);
    if (done.length === CHECKLIST.length) toast('✅ ¡Listo para reservar!');
  });

  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
