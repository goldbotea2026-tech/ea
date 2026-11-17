/* ==========================================================
   GOLDBOT LIVE DEMOS
   One animated scene per product, shown on the product page.
   Prices in the animations are generated. They only illustrate
   what each tool does and are not real results.

   To change which scene a product uses, add  "demo": "<scene>"
   to that product in products.json. Scene names are the keys
   of SC below (for example "grid", "fvg", "scanner").
   ========================================================== */
(function () {
"use strict";

const W = 640, H = 380;
const C = { up: "#34D6A0", dn: "#FF7A7A", gold: "#F2B84B", blue: "#8FB0FF", ink: "#08111F", txt: "#CFE0FF",
            mut: "#7C92A9", pan: "#0E2040", pbd: "#23406B", white: "#E8EEF9", red: "#E5484D", grid: "#1B3350", tile: "#12264A" };
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const lerp = (a, b, p) => a + (b - a) * p;
const f = v => Math.round(v * 10) / 10;
const q = v => +v.toFixed(2);
const fx = v => v.toFixed(2);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pad2 = n => String(Math.floor(n)).padStart(2, "0");
const clock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ":" + pad2(m) : pad2(m)) + ":" + pad2(s % 60); };

function rnd(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- candle data ---------- */
/* walk(start, [[count, targetClose], ...], seed, noise, wick). Pass an array instead of start to append. */
function walk(start, segs, seed, nz, wk) {
  const cs = Array.isArray(start) ? start : [];
  const r = rnd(seed);
  let p = cs.length ? cs[cs.length - 1].c : start;
  nz = nz == null ? .8 : nz; wk = wk == null ? .6 : wk;
  for (const [n, tg] of segs) {
    const p0 = p;
    for (let i = 1; i <= n; i++) {
      const o = p, c = p0 + (tg - p0) * i / n + (i < n ? (r() - .5) * 2 * nz : 0);
      cs.push({ o, c, h: Math.max(o, c) + r() * wk, l: Math.min(o, c) - r() * wk });
      p = c;
    }
  }
  return cs;
}
/* appends two candles that leave a bullish Fair Value Gap above the last candle */
function gapUp(cs, big, gap) {
  const pre = cs[cs.length - 1], a = pre.c;
  const c1 = { o: a, c: a + big, h: a + big + .4, l: a - .3 }, o2 = c1.c;
  const c2 = { o: o2, c: o2 + .8, h: o2 + 1.3, l: Math.min(o2 - .2, pre.h + gap) };
  cs.push(c1, c2);
  return { bot: pre.h, top: c2.l, i: cs.length - 3 };
}
const crossUp = (cs, v, from = 0) => { for (let i = from; i < cs.length; i++) if (cs[i].h >= v) return i; return -1; };
const crossDn = (cs, v, from = 0) => { for (let i = from; i < cs.length; i++) if (cs[i].l <= v) return i; return -1; };
const part = (c, fr) => {
  const cl = c.o + (c.c - c.o) * fr, hi = Math.max(c.o, c.c), lo = Math.min(c.o, c.c);
  return { o: c.o, c: cl, h: Math.max(c.o, cl) + (c.h - hi) * fr, l: Math.min(c.o, cl) - (lo - c.l) * fr };
};
function priceAt(cs, k) {
  if (k <= 0) return cs[0].o;
  const i = Math.min(Math.floor(k), cs.length - 1), fr = k >= cs.length ? 1 : k - i;
  return cs[i].o + (cs[i].c - cs[i].o) * fr;
}
const maxHigh = (cs, a, b) => { let v = -1e9; for (let i = a; i <= b && i < cs.length; i++) v = Math.max(v, cs[i].h); return v; };
const minLow = (cs, a, b) => { let v = 1e9; for (let i = a; i <= b && i < cs.length; i++) v = Math.min(v, cs[i].l); return v; };

/* ---------- drawing helper, one per frame ---------- */
function mkH(t) {
  const o = [], h = { t, o, x0: 12, x1: 576, y0: 22, y1: 356, n: 40, lo: 0, hi: 1 };
  h.p = (a, b) => clamp((t - a) / (b - a));
  h.e = (a, b) => ease(h.p(a, b));
  h.X = i => h.x0 + (h.x1 - h.x0) * (i + .5) / h.n;
  h.Y = v => h.y1 - (v - h.lo) / (h.hi - h.lo) * (h.y1 - h.y0);
  h.step = () => (h.x1 - h.x0) / h.n;
  h.range = (cs, pd) => {
    let lo = 1e9, hi = -1e9;
    for (const c of cs) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); }
    const m = (hi - lo) * (pd == null ? .08 : pd);
    h.lo = lo - m; h.hi = hi + m;
  };
  const op = v => v != null && v < 1 ? ` opacity="${q(clamp(v))}"` : "";
  h.ln = (x1, y1, x2, y2, col, w, dash, o2) =>
    o.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${col}" stroke-width="${w || 1}"${dash ? ` stroke-dasharray="${dash}"` : ""}${op(o2)}/>`);
  h.hl = (v, x1, x2, col, w, dash, o2) => h.ln(x1, h.Y(v), x2, h.Y(v), col, w, dash, o2);
  h.rc = (x, y, w, hh, fill, stroke, rx, o2, sw) =>
    o.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0, w))}" height="${f(Math.max(0, hh))}" rx="${rx || 0}" fill="${fill || "none"}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1}"` : ""}${op(o2)}/>`);
  h.tx = (x, y, s, col, size, anchor, weight, o2) =>
    o.push(`<text x="${f(x)}" y="${f(y)}" fill="${col || C.txt}" font-size="${size || 10.5}" text-anchor="${anchor || "start"}" font-weight="${weight || 600}" font-family="IBM Plex Sans,Segoe UI,sans-serif"${op(o2)}>${esc(s)}</text>`);
  h.pill = (x, y, s, bg, fg, anchor, size, o2) => {
    size = size || 10;
    const w = s.length * size * .6 + 14, x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    h.rc(x0, y - 9, w, 18, bg, null, 9, o2);
    h.tx(x0 + w / 2, y + size * .36, s, fg, size, "middle", 700, o2);
    return w;
  };
  h.ci = (x, y, r, fill, stroke, o2, sw) =>
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill || "none"}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 2}"` : ""}${op(o2)}/>`);
  h.poly = (pts, col, w, dash, fill, o2) =>
    o.push(`<polyline points="${pts.map(p => f(p[0]) + "," + f(p[1])).join(" ")}" fill="${fill || "none"}" stroke="${col}" stroke-width="${w || 1.5}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""}${op(o2)}/>`);
  h.tag = (v, bg, fg) => {
    const y = h.Y(v);
    h.rc(h.x1 + 2, y - 9, 58, 18, bg, null, 4);
    h.tx(h.x1 + 31, y + 4, fx(v), fg, 10.5, "middle", 700);
  };
  h.grid = (n, mode) => {
    n = n || 5;
    for (let g = 0; g <= n; g++) {
      const v = h.lo + (h.hi - h.lo) * g / n, y = h.Y(v);
      h.ln(h.x0, y, h.x1, y, C.grid, 1);
      if (mode === "in") h.tx(h.x1 - 4, y - 3, fx(v), C.mut, 9, "end", 500);
      else if (mode !== "none") h.tx(h.x1 + 8, y + 4, fx(v), C.mut, 10.5, "start", 500);
    }
  };
  h.candles = (cs, k, o2) => {
    if (o2 != null && o2 <= 0) return;
    const bw = h.step() * .6;
    if (o2 != null && o2 < 1) o.push(`<g opacity="${q(o2)}">`);
    for (let i = 0; i < cs.length && i < k; i++) {
      let c = cs[i];
      if (i + 1 > k) c = part(c, k - i);
      const x = h.X(i), col = c.c >= c.o ? C.up : C.dn;
      const yt = h.Y(Math.max(c.o, c.c)), yb = h.Y(Math.min(c.o, c.c));
      o.push(`<line x1="${f(x)}" y1="${f(h.Y(c.h))}" x2="${f(x)}" y2="${f(h.Y(c.l))}" stroke="${col}" stroke-width="1.4"/><rect x="${f(x - bw / 2)}" y="${f(yt)}" width="${f(bw)}" height="${f(Math.max(2, yb - yt))}" rx="1" fill="${col}"/>`);
    }
    if (o2 != null && o2 < 1) o.push("</g>");
  };
  h.panel = (x, y, w, hh, title, o2) => {
    h.rc(x, y, w, hh, C.pan, C.pbd, 10, o2);
    if (title) h.tx(x + 12, y + 17, title, C.mut, 9, "start", 700, o2);
  };
  h.g = (o2, fn) => { if (o2 <= 0) return; if (o2 < 1) o.push(`<g opacity="${q(o2)}">`); fn(); if (o2 < 1) o.push("</g>"); };
  /* animated mouse cursor: keys = [[time, x, y, click?], ...] */
  h.cur = keys => {
    const last = keys[keys.length - 1];
    if (t < keys[0][0] || t > last[0] + 1.4) return null;
    let x = last[1], y = last[2];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= a[0] && t < b[0]) { const p = ease((t - a[0]) / (b[0] - a[0])); x = lerp(a[1], b[1], p); y = lerp(a[2], b[2], p); break; }
    }
    for (const kk of keys) {
      if (kk[3]) { const d = t - kk[0]; if (d >= 0 && d < .5) h.ci(kk[1], kk[2], 4 + d * 44, "none", C.gold, .75 * (1 - d / .5), 2); }
    }
    const fade = t > last[0] + .8 ? 1 - (t - last[0] - .8) / .6 : 1;
    o.push(`<g transform="translate(${f(x)} ${f(y)})"${op(fade)}><path d="M0 0L0 16 4.2 12.2 7 18.5 9.6 17.4 6.9 11.2 12 11.2Z" fill="#fff" stroke="#08111F" stroke-width="1.1" stroke-linejoin="round"/></g>`);
    return { x, y };
  };
  return h;
}

/* ==========================================================
   SCENES
   ========================================================== */
const SC = {};

/* ---------- 16-Symbol Quick Chart ---------- */
SC.quickchart = {
  dur: 17, still: 12.8, bar: "XAUUSD, M15 · 16-symbol dashboard",
  init() {
    const cs = walk(4008, [[8, 4012], [6, 4017], [10, 4004.5], [3, 4014], [7, 4026], [6, 4030]], 3, .6, .5);
    return { cs, n: cs.length, sup: cs[23].l, res: cs[39].h, ss: .28, rs: -.15, T0: .6, D: 11.6 };
  },
  steps: S => [[0, "Every trendline on the chart is found automatically"], [3.5, "Price drifts toward the support line"],
    [S.T0 + S.D * 23.5 / S.n, "Green alert: price touches support"], [9.8, "Price rallies toward the resistance line"],
    [S.T0 + S.D * 39.5 / S.n, "Red alert: price touches resistance"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 352; h.y0 = 26; h.y1 = 352; h.range(S.cs.concat([{ h: S.res + 4.8, l: S.sup - 4.2 }]), .04);
    h.grid(5, "in");
    const k = S.n * h.p(S.T0, S.T0 + S.D), la = h.e(.2, 1.3);
    const tl = (i0, sl, base, col) => { const i1 = i0 + (S.n - 1 - i0) * la; h.ln(h.X(i0), h.Y(base + sl * (i0 - (sl > 0 ? 23 : 39))), h.X(i1), h.Y(base + sl * (i1 - (sl > 0 ? 23 : 39))), col, 1.6, "6 4"); };
    tl(9, S.ss, S.sup, C.up); tl(9, S.rs, S.res, C.dn);
    h.candles(S.cs, k);
    const tS = S.T0 + S.D * 23.5 / S.n, tR = S.T0 + S.D * 39.5 / S.n;
    const xs = h.X(23), ys = h.Y(S.cs[23].l), xr = h.X(39), yr = h.Y(S.res);
    if (t >= tS) { const d = t - tS; if (d < 1.1) h.ci(xs, ys, 6 + d * 28, "none", C.up, 1 - d / 1.1, 2); h.ci(xs, ys, 4.5, C.up, "#fff", 1, 1.5); h.pill(xs + 8, ys + 20, "SUPPORT TOUCH", C.up, C.ink, "start", 9.5); }
    if (t >= tR) { const d = t - tR; if (d < 1.1) h.ci(xr, yr, 6 + d * 28, "none", C.dn, 1 - d / 1.1, 2); h.ci(xr, yr, 4.5, C.dn, "#fff", 1, 1.5); h.pill(xr - 8, yr - 20, "RESISTANCE TOUCH", C.dn, C.ink, "end", 9.5); }
    h.tx(20, 44, "XAUUSD  " + fx(priceAt(S.cs, k)), C.white, 12, "start", 700);

    h.panel(366, 26, 264, 292, "QUICK CHART · 16 SYMBOLS");
    const syms = [["XAUUSD", 0], ["EURUSD", 1.0842], ["GBPUSD", 1.2931], ["USDJPY", 151.62], ["XAGUSD", 31.84], ["US30", 43120], ["NAS100", 20840], ["BTCUSD", 98410],
      ["AUDUSD", .6541], ["USDCAD", 1.3924], ["USDCHF", .8812], ["NZDUSD", .5987], ["EURJPY", 164.38], ["GBPJPY", 196.04], ["WTI", 71.26], ["DAX", 19320]];
    syms.forEach((s, i) => {
      const x = 373 + (i % 4) * 64, y = 54 + Math.floor(i / 4) * 64;
      const base = s[1] || priceAt(S.cs, k), v = s[1] ? base * (1 + .0006 * Math.sin(t * 1.6 + i * 1.3)) : base;
      const dec = i === 0 ? 2 : base < 2 ? 4 : base < 1000 ? 2 : 0;
      const sup = i === 0 && t >= tS && t < tS + 3, rsi = i === 0 && t >= tR && t < tR + 3.5;
      const col = sup ? C.up : rsi ? C.dn : null, pulse = .55 + .45 * Math.sin(t * 9);
      h.rc(x, y, 58, 58, col ? col : C.tile, col || C.pbd, 7, col ? .12 + .18 * pulse : 1);
      if (col) h.rc(x, y, 58, 58, "none", col, 7, 1, 1.6);
      h.tx(x + 29, y + 16, s[0], C.white, 9, "middle", 700);
      h.tx(x + 29, y + 33, v.toFixed(dec), C.txt, 9.5, "middle", 600);
      h.tx(x + 29, y + 49, sup ? "SUPPORT" : rsi ? "RESISTANCE" : "watching", col || C.mut, sup || rsi ? 8 : 7.5, "middle", sup || rsi ? 800 : 500);
    });
  }
};

/* ---------- Live Timeframe Candles ---------- */
SC.timeframes = {
  dur: 14, still: 10.5, bar: "XAUUSD · live timeframe panel",
  init() {
    return { a: walk(4000, [[12, 4006], [10, 4001], [12, 4010], [14, 4015]], 5, .9, .7), b: walk(3984, [[4, 3992], [3, 3998], [4, 4006], [3, 4012], [2, 4015]], 8, 1.6, 1.4) };
  },
  steps: () => [[0.3, "All timeframes M1 to D1 in one panel"], [2.8, "Live countdown to every candle close"], [5.4, "One click switches the chart"], [8, "Chart is now on H1 and the mini candles keep updating"]],
  draw(h, t, S) {
    h.x1 = 404; h.y0 = 44; h.y1 = 346; h.range(S.a.concat(S.b), .1);
    h.grid(5, "in");
    const sw = h.e(6, 6.7), tfs = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];
    const per = [60, 300, 900, 1800, 3600, 14400, 86400], rem0 = [37, 212, 611, 1403, 2480, 7010, 31000];
    const sel = t >= 6 ? 4 : 1;
    if (sw < 1) {
      h.n = S.a.length;
      let cs = S.a; const k = h.n * h.e(0, 1.8);
      if (k >= h.n) { cs = S.a.slice(); const L = cs[cs.length - 1], c = L.c + 1.3 * Math.sin(t * 2.2); cs[cs.length - 1] = { o: L.o, c, h: Math.max(L.h, c + .3), l: Math.min(L.l, c - .3) }; }
      h.candles(cs, k, 1 - sw);
    }
    if (sw > 0) {
      h.n = S.b.length;
      let cs = S.b; const k = h.n * h.e(6.2, 7.6);
      if (k >= h.n) { cs = S.b.slice(); const L = cs[cs.length - 1], c = L.c + 1.6 * Math.sin(t * 2.2); cs[cs.length - 1] = { o: L.o, c, h: Math.max(L.h, c + .4), l: Math.min(L.l, c - .4) }; }
      h.candles(cs, k, sw);
    }
    h.pill(20, 56, "XAUUSD, " + tfs[sel], C.pan, C.white, "start", 11);
    h.pill(396, 56, "NEXT CANDLE " + clock(((rem0[sel] - t) % per[sel] + per[sel]) % per[sel]), C.gold, C.ink, "end", 10);

    h.panel(420, 22, 212, 334, "TIMEFRAMES");
    tfs.forEach((tf, i) => {
      const y = 58 + i * 41, on = i === sel;
      h.rc(430, y, 192, 36, on ? "rgba(143,176,255,.16)" : C.tile, on ? C.blue : C.pbd, 8);
      h.tx(442, y + 23, tf, on ? C.white : C.txt, 13, "start", 700);
      h.tx(500, y + 23, clock(((rem0[i] - t) % per[i] + per[i]) % per[i]), on ? C.gold : C.mut, 11.5, "start", 600);
      const cy = y + 18, cv = Math.sin(t * 1.1 + i * 1.9) * 9, col = cv >= 0 ? C.up : C.dn;
      h.ln(598, cy - Math.abs(cv) - 4, 598, cy + 9, col, 1.3);
      h.rc(594, cv >= 0 ? cy - cv : cy, 8, Math.max(2, Math.abs(cv)), col, null, 1);
    });
    h.cur([[4, 560, 336, 0], [5.4, 520, 58 + 4 * 41 + 18, 0], [6, 520, 58 + 4 * 41 + 18, 1]]);
  }
};

/* ---------- 5 BuyStop + 5 SellStop ---------- */
SC.grid = {
  dur: 18, still: 14.5, bar: "XAUUSD, M5 · grid of pending orders",
  init() {
    const cs = walk(4000, [[6, 4000.6], [4, 3999.4], [12, 4017], [6, 4013.5], [12, 4025]], 7, .55, .5);
    const buy = [4003, 4006, 4009, 4012, 4015], sell = [3997, 3994, 3991, 3988, 3985];
    return { cs, n: cs.length, buy, sell, tb: buy.map(v => crossUp(cs, v)), T0: .8, D: 12.5 };
  },
  steps(S) { const ev = j => S.T0 + S.D * (S.tb[j] + .5) / S.n; return [[.4, "5 Buy Stops above and 5 Sell Stops below the price"], [ev(0), "A Buy Stop triggers and the opposite Sell Stops are deleted"], [ev(2), "More levels fill as price climbs"], [ev(4) + .6, "A trailing stop follows every open position"]]; },
  draw(h, t, S) {
    h.n = S.n; h.range(S.cs.concat([{ h: 4017, l: 3984 }]), .06); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), ev = j => S.T0 + S.D * (S.tb[j] + .5) / S.n;
    const first = ev(0), del = h.p(first, first + .8);
    S.sell.forEach((v, j) => {
      const pa = h.e(.2 + .1 * j, .9 + .1 * j);
      h.hl(v, h.x0, lerp(h.x0, h.x1, pa), C.dn, 1.4, "6 4", (1 - del) * .85);
      h.tx(h.x0 + 4, h.Y(v) - 4, "SELL STOP " + (j + 1), C.dn, 8.5, "start", 700, pa * (1 - del));
    });
    S.buy.forEach((v, j) => {
      const pa = h.e(.2 + .1 * j, .9 + .1 * j), on = t >= ev(j), xe = on ? h.X(S.tb[j]) : lerp(h.x0, h.x1, pa);
      h.hl(v, h.x0, xe, C.up, 1.4, "6 4", .85);
      if (!on) h.tx(h.x0 + 4, h.Y(v) - 4, "BUY STOP " + (j + 1), C.up, 8.5, "start", 700, pa);
    });
    h.candles(S.cs, k);
    S.buy.forEach((v, j) => {
      if (t < ev(j)) return;
      const x = h.X(S.tb[j]), y = h.Y(v);
      h.ln(x, y, h.x1, y, C.white, 1.5, null, .85);
      h.ci(x, y, 4.5, C.up, "#fff", 1, 1.5);
      h.tx(h.x1 - 4, y + 12, "BUY " + (j + 1) + " @ " + fx(v), C.white, 8.5, "end", 700);
    });
    if (t >= first && t < first + 3.2) h.pill(h.x0 + 10, h.Y(3991), "SELL STOPS DELETED", C.dn, C.ink, "start", 9.5, clamp(1 - Math.abs(t - first - 1.2) / 2));
    if (t >= first) {
      const pts = []; let hh = -1e9; const st = h.step();
      for (let i = S.tb[0]; i < S.n && i < k; i++) {
        const c = i + 1 > k ? part(S.cs[i], k - i) : S.cs[i]; hh = Math.max(hh, c.h);
        pts.push([h.X(i) - st / 2, h.Y(hh - 7)], [h.X(i) + st / 2, h.Y(hh - 7)]);
      }
      if (pts.length > 1) { h.poly(pts, C.red, 2); h.tx(pts[pts.length - 1][0] - 4, pts[pts.length - 1][1] + 14, "TRAILING STOP", C.red, 9, "end", 800); }
    }
    const pr = priceAt(S.cs, k), open = [0, 1, 2, 3, 4].filter(j => t >= ev(j)), pl = open.reduce((s, j) => s + (pr - S.buy[j]) * 10, 0);
    h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .35); h.tag(pr, "#fff", C.ink);
    h.panel(20, 28, 176, 52);
    h.tx(32, 47, "OPEN POSITIONS", C.mut, 9, "start", 700); h.tx(184, 47, String(open.length), C.white, 12, "end", 800);
    h.tx(32, 68, "FLOATING", C.mut, 9, "start", 700); h.tx(184, 68, (pl >= 0 ? "+$" : "-$") + Math.abs(pl).toFixed(2), pl >= 0 ? C.up : C.dn, 12, "end", 800);
  }
};

/* ---------- TradingView Tools for MT5 ---------- */
SC.tvtools = {
  dur: 19.5, still: 17.5, bar: "XAUUSD, H1 · drawing toolbar",
  init() {
    const cs = walk(3980, [[10, 3984], [8, 3996], [8, 3992], [2, 3993]], 11, .5, .5);
    cs[27].c = Math.min(cs[27].c, cs[27].o - .7); cs[27].l = Math.min(cs[27].l, cs[27].c - .2);
    const z = gapUp(cs, 6.5, 2.2);
    walk(cs, [[6, 4008], [8, 4018]], 12, .5, .5);
    const L = minLow(cs, 22, 27), E = cs[35].c, FL = cs[25].l;
    return { cs, n: cs.length, z, L, E, SL: E - 4.2, TP: E + 8.8, FL, FH: maxHigh(cs, 36, 43) };
  },
  steps: () => [[1.9, "Trend Line: two clicks"], [4.5, "Zone: drag a box"], [7.1, "FVG: one click"], [9.5, "Order Block: one click"], [11.9, "Risk/Reward with the ratio shown live"], [14.9, "Fibonacci retracement: two clicks"]],
  draw(h, t, S) {
    h.n = S.n; h.x0 = 72; h.range(S.cs, .1); h.grid(5);
    const cs = S.cs, X = h.X, Y = h.Y, st = [2, 4.6, 7.2, 9.6, 12, 15], en = [4.4, 7, 9.4, 11.8, 14.8, 17.4];
    const ov = i => i < 5 ? lerp(1, .3, h.e(st[i + 1], st[i + 1] + .6)) : 1;
    h.candles(cs, S.n * h.e(0, 1.8));
    const ty = i => 54 + i * 40, A = [X(9), Y(cs[9].l)], B = [X(25), Y(cs[25].l)];
    /* trend line */
    h.g(ov(0) * (t > st[0] + .9 ? 1 : 0), () => {
      const p = h.e(2.9, 3.8), pe = h.e(3.8, 4.4), ie = lerp(25, 43, pe), sl = (cs[25].l - cs[9].l) / 16;
      const ex = t < 3.8 ? lerp(A[0], B[0], p) : X(ie), ey = t < 3.8 ? lerp(A[1], B[1], p) : Y(cs[9].l + sl * (ie - 9));
      h.ln(A[0], A[1], ex, ey, C.gold, 2); h.ci(A[0], A[1], 4, C.gold, "#fff", 1, 1.5); if (t >= 3.8) h.ci(B[0], B[1], 4, C.gold, "#fff", 1, 1.5);
    });
    /* zone */
    h.g(ov(1) * (t > 5.5 ? 1 : 0), () => {
      const p = h.e(5.5, 6.5), x2 = lerp(X(22), X(32), p), y2 = lerp(Y(S.L + 2.6), Y(S.L), p);
      h.rc(X(22), Y(S.L + 2.6), x2 - X(22), y2 - Y(S.L + 2.6), "rgba(52,214,160,.18)", C.up, 2);
      if (p > .9) h.tx(X(22) + 6, Y(S.L + 2.6) + 12, "DEMAND", C.up, 9, "start", 800);
    });
    /* FVG and order block */
    h.g(ov(2) * (t > 8.2 ? 1 : 0), () => { const p = h.e(8.2, 8.7); h.rc(X(27), Y(S.z.top), (X(36) - X(27)) * p, Y(S.z.bot) - Y(S.z.top), "rgba(143,176,255,.22)", C.blue, 2); if (p > .9) h.tx(X(27) + 6, Y(S.z.top) - 4, "FVG", C.blue, 9, "start", 800); });
    h.g(ov(3) * (t > 10.6 ? 1 : 0), () => { const p = h.e(10.6, 11.1), c = cs[27]; h.rc(X(27) - 4, Y(c.h), (X(36) - X(27) + 4) * p, Y(c.l) - Y(c.h), "rgba(242,184,75,.2)", C.gold, 2); if (p > .9) h.tx(X(27) + 6, Y(c.l) + 12, "ORDER BLOCK", C.gold, 9, "start", 800); });
    /* risk reward */
    h.g(ov(4) * (t > 12.8 ? 1 : 0), () => {
      const x0 = X(35), x1 = X(43), e = Y(S.E);
      h.ln(x0, e, x1, e, C.white, 1.5);
      if (t >= 13.6) { h.rc(x0, Y(S.TP), x1 - x0, e - Y(S.TP), "rgba(52,214,160,.2)", C.up, 1); h.tx(x1 - 6, Y(S.TP) + 13, "TP", C.up, 9, "end", 800); }
      if (t >= 14.4) { h.rc(x0, e, x1 - x0, Y(S.SL) - e, "rgba(255,122,122,.2)", C.dn, 1); h.pill(x0 - 8, e, "RR 2.1", C.gold, C.ink, "end", 9.5); h.tx(x1 - 6, Y(S.SL) - 5, "SL", C.dn, 9, "end", 800); }
    });
    /* fibonacci */
    h.g(h.e(16.8, 17.5), () => {
      [0, .382, .5, .618, 1].forEach(r => {
        const v = S.FL + (S.FH - S.FL) * r;
        h.hl(v, X(25), h.x1, r === .618 ? C.gold : C.blue, r === .618 ? 1.6 : 1, r % 1 === 0 ? null : "5 4");
        h.tx(h.x1 - 4, Y(v) - 3, r + "  " + fx(v), r === .618 ? C.gold : C.blue, 9, "end", 700);
      });
    });
    /* toolbar */
    h.panel(16, 32, 44, 292);
    const act = [0, 1, 2, 3, 4, 5].findIndex(i => t >= st[i] - .2 && t < en[i] + .2);
    for (let i = 0; i < 6; i++) {
      const y = ty(i), on = i === act, col = on ? C.gold : C.txt, cx = 38, cy = y + 14;
      if (on) h.rc(22, y - 4, 32, 36, "rgba(242,184,75,.16)", C.gold, 7);
      if (i === 0) h.ln(cx - 9, cy + 7, cx + 9, cy - 7, col, 2);
      if (i === 1) h.rc(cx - 9, cy - 7, 18, 14, "none", col, 2, 1, 1.8);
      if (i === 2) { h.rc(cx - 9, cy - 8, 18, 5, "none", col, 1, 1, 1.5); h.rc(cx - 9, cy + 3, 18, 5, "none", col, 1, 1, 1.5); h.tx(cx, cy + 1.5, "FVG", col, 6, "middle", 800); }
      if (i === 3) { h.rc(cx - 9, cy - 7, 18, 14, "none", col, 2, 1, 1.8); h.tx(cx, cy + 3, "OB", col, 8, "middle", 800); }
      if (i === 4) { h.rc(cx - 9, cy - 8, 18, 8, "none", C.up, 1, 1, 1.6); h.rc(cx - 9, cy, 18, 8, "none", C.dn, 1, 1, 1.6); }
      if (i === 5) { [-7, -2, 3, 8].forEach(d => h.ln(cx - 9, cy + d, cx + 9, cy + d, col, 1.5)); }
    }
    h.cur([[1.4, 300, 250, 0], [2, 38, ty(0) + 14, 1], [2.9, X(9), Y(cs[9].l), 1], [3.8, X(25), Y(cs[25].l), 1],
      [4.6, 38, ty(1) + 14, 1], [5.5, X(22), Y(S.L + 2.6), 1], [6.5, X(32), Y(S.L), 1],
      [7.2, 38, ty(2) + 14, 1], [8.2, X(28), Y((S.z.bot + S.z.top) / 2), 1],
      [9.6, 38, ty(3) + 14, 1], [10.6, X(27), Y((cs[27].h + cs[27].l) / 2), 1],
      [12, 38, ty(4) + 14, 1], [12.8, X(35), Y(S.E), 1], [13.6, X(43), Y(S.TP), 1], [14.4, X(43), Y(S.SL), 1],
      [15, 38, ty(5) + 14, 1], [15.8, X(25), Y(S.FL), 1], [16.8, X(43), Y(S.FH), 1]]);
  }
};

/* ---------- FVG Expert ---------- */
SC.fvg = {
  dur: 20, still: 17, bar: "XAUUSD, M5 · Fair Value Gap strategy",
  init() {
    const cs = walk(3990, [[6, 3991.5], [4, 3989.5]], 21, .5, .5);
    const z = gapUp(cs, 7, 2.4);
    walk(cs, [[8, z.top + 12]], 22, .6, .5);
    walk(cs, [[6, z.top - .7]], 23, .5, .4);
    let ei = crossDn(cs, z.top, 20); if (ei < 0) ei = cs.length - 1;
    const E = z.top, SL = z.bot - 1, R = E - SL;
    walk(cs, [[5, E + R + .6], [3, E + R - 1], [7, E + 2 * R + 1.2]], 24, .5, .4);
    const bi = crossUp(cs, E + R, ei + 1), ti = crossUp(cs, E + 2 * R, ei + 1);
    return { cs, n: cs.length, z, E, SL, R, ei, bi, ti, T0: .6, D: 14.2 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.5, "Scans M5 candles for Fair Value Gaps"], [tt(S.z.i + 2), "FVG zone detected and kept active"], [tt(S.ei), "Price returns into the zone: BUY with a risk-based lot"], [tt(S.bi), "At 1R the stop moves to break even"], [tt(S.ti), "Take profit reached at 2R"]]; },
  draw(h, t, S) {
    h.n = S.n; h.range(S.cs.concat([{ h: S.E + 2 * S.R + 1, l: S.SL - 1 }]), .07); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y;
    if (k >= S.z.i + 2.5) { const p = h.e(tt(S.z.i + 2), tt(S.z.i + 2) + .6); h.rc(X(S.z.i), Y(S.z.top), (h.x1 - X(S.z.i)) * p, Y(S.z.bot) - Y(S.z.top), "rgba(143,176,255,.2)", C.blue, 2); if (p > .9) h.tx(X(S.z.i) + 6, Y(S.z.top) + 12, "FVG", C.blue, 9.5, "start", 800); }
    h.candles(S.cs, k);
    const tE = tt(S.ei);
    if (t >= tE) {
      const x = X(S.ei), be = h.e(tt(S.bi), tt(S.bi) + .6), sl = t >= tt(S.bi) ? lerp(S.SL, S.E, be) : S.SL;
      h.rc(x, Y(S.E + 2 * S.R), h.x1 - x, Y(S.E) - Y(S.E + 2 * S.R), "rgba(52,214,160,.1)");
      h.rc(x, Y(S.E), h.x1 - x, Y(sl) - Y(S.E), "rgba(255,122,122,.12)");
      h.hl(S.E, x, h.x1, C.white, 1.5); h.hl(sl, x, h.x1, C.red, 1.8); h.hl(S.E + 2 * S.R, x, h.x1, C.gold, 1.5, "3 4");
      h.pill(x + 2, Y(S.E) + 20, "BUY " + fx(S.E), C.up, C.ink, "start", 9.5);
      h.tx(h.x1 - 4, Y(sl) + 12, t >= tt(S.bi) + .3 ? "STOP LOSS · BREAK EVEN" : "STOP LOSS", C.red, 9, "end", 800);
      h.tx(h.x1 - 4, Y(S.E + 2 * S.R) - 4, "TAKE PROFIT 2R", C.gold, 9, "end", 800);
      if (t >= tt(S.ti)) { h.ci(X(S.ti), Y(S.E + 2 * S.R), 5, C.gold, "#fff", 1, 2); h.pill(X(S.ti) - 10, Y(S.E + 2 * S.R) + 20, "+2R", C.gold, C.ink, "end", 10); }
      h.panel(20, 28, 170, 52, null, h.e(tE, tE + .5));
      h.g(h.e(tE, tE + .5), () => { h.tx(32, 46, "RISK 1.0%  ·  LOT 0.42", C.white, 11, "start", 700); h.tx(32, 68, "SL " + fx(S.SL) + "   RR 1:2", C.mut, 10, "start", 600); });
    }
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3); h.tag(pr, "#fff", C.ink);
  }
};

/* ---------- Limit Order Expert ---------- */
SC.limit = {
  dur: 20, still: 17, bar: "XAUUSD, M1 · swing limit orders",
  init() {
    const cs = walk(4000, [[5, 3996], [3, 3990.5], [5, 4004], [5, 4012], [3, 4006], [3, 4000.5]], 31, .5, .5);
    const lo = cs[7].l, hi = cs[17].h;
    walk(cs, [[6, lo - .4]], 32, .4, .4);
    let fi = crossDn(cs, lo, 24); if (fi < 0) fi = cs.length - 1;
    const R = 3; walk(cs, [[5, lo + R + .8], [3, lo + R - .8], [7, lo + 2 * R + 1]], 33, .5, .4);
    return { cs, n: cs.length, lo, hi, fi, R, bi: crossUp(cs, lo + R, fi + 1), ti: crossUp(cs, lo + 2 * R, fi + 1), T0: .6, D: 14.2 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.5, "Scans recent candles for swing highs and lows"], [tt(23), "Buy Limit at the swing low, Sell Limit at the swing high"], [tt(S.fi), "Price falls to the Buy Limit and it fills"], [tt(S.bi), "At 1R the stop moves to break even"], [tt(S.ti), "Take profit reached"]]; },
  draw(h, t, S) {
    h.n = S.n; h.range(S.cs.concat([{ h: S.hi + 1, l: S.lo - S.R - 1 }]), .07); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y, E = S.lo, SL = E - S.R, TP = E + 2 * S.R;
    h.candles(S.cs, k);
    if (k >= 10.5) { const a = h.e(tt(10), tt(10) + .4); h.g(a, () => { h.pill(X(7), Y(S.cs[7].l) + 22, "SWING LOW", C.up, C.ink, "middle", 9); h.ci(X(7), Y(S.cs[7].l) + 8, 3.5, C.up); }); }
    if (k >= 20.5) { const a = h.e(tt(20), tt(20) + .4); h.g(a, () => { h.pill(X(17), Y(S.hi) - 22, "SWING HIGH", C.dn, C.ink, "middle", 9); h.ci(X(17), Y(S.hi) - 8, 3.5, C.dn); }); }
    const tP = tt(23);
    if (t >= tP) {
      const p = h.e(tP, tP + .7), filled = t >= tt(S.fi);
      h.hl(S.hi, X(17), lerp(X(17), h.x1, p), C.dn, 1.5, "6 4"); h.hl(E, X(7), filled ? X(S.fi) : lerp(X(7), h.x1, p), C.up, 1.5, "6 4");
      if (p > .9) { h.pill(h.x1 - 6, Y(S.hi) - 13, "SELL LIMIT " + fx(S.hi), C.dn, C.ink, "end", 9.5); if (!filled) h.pill(h.x1 - 6, Y(E) - 13, "BUY LIMIT " + fx(E), C.up, C.ink, "end", 9.5); }
    }
    if (t >= tt(S.fi)) {
      const x = X(S.fi), be = h.e(tt(S.bi), tt(S.bi) + .6), sl = t >= tt(S.bi) ? lerp(SL, E, be) : SL;
      h.rc(x, Y(TP), h.x1 - x, Y(E) - Y(TP), "rgba(52,214,160,.1)"); h.rc(x, Y(E), h.x1 - x, Y(sl) - Y(E), "rgba(255,122,122,.12)");
      h.hl(E, x, h.x1, C.white, 1.5); h.hl(sl, x, h.x1, C.red, 1.8); h.hl(TP, x, h.x1, C.gold, 1.5, "3 4");
      h.pill(x + 2, Y(E) + 20, "BUY LIMIT FILLED", C.up, C.ink, "start", 9);
      h.tx(h.x1 - 4, Y(sl) + 12, t >= tt(S.bi) + .3 ? "STOP LOSS · BREAK EVEN" : "STOP LOSS", C.red, 9, "end", 800);
      h.tx(h.x1 - 4, Y(TP) - 4, "TAKE PROFIT 2R", C.gold, 9, "end", 800);
      if (t >= tt(S.ti)) { h.ci(X(S.ti), Y(TP), 5, C.gold, "#fff", 1, 2); h.pill(X(S.ti) - 10, Y(TP) + 20, "+2R", C.gold, C.ink, "end", 10); }
      h.panel(20, 28, 170, 52, null, h.e(tt(S.fi), tt(S.fi) + .5));
      h.g(h.e(tt(S.fi), tt(S.fi) + .5), () => { h.tx(32, 46, "RISK 1.0%  ·  LOT 0.42", C.white, 11, "start", 700); h.tx(32, 68, "SL " + fx(SL) + "   RR 1:2", C.mut, 10, "start", 600); });
    }
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3); h.tag(pr, "#fff", C.ink);
  }
};

/* ---------- SMC Map ---------- */
SC.smc = {
  dur: 18, still: 14, bar: "XAUUSD, M15 · Smart Money Concepts",
  init() {
    const cs = walk(4000, [[6, 3993], [5, 4004], [5, 3998]], 41, .5, .5);
    const pre = cs[cs.length - 1]; pre.c = Math.min(pre.c, pre.o - .8); pre.l = Math.min(pre.l, pre.c - .2);
    const z = gapUp(cs, 8, 2.5);
    walk(cs, [[7, 4018], [4, 4011], [8, 4026], [4, 4020]], 42, .5, .5);
    const shI = 10, brk = crossUp(cs, cs[shI].h, shI + 1);
    return { cs, n: cs.length, z, ob: z.i, shI, brk, shv: cs[shI].h, slI: 28, slv: cs[28].l, hiI: 36, hiv: cs[36].h, T0: .6, D: 12.4 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.4, "Reads the market structure of the chart"], [tt(S.brk), "Break of structure (BOS) and the Order Block behind it"], [tt(S.z.i + 3), "Unmitigated Fair Value Gap stays on the chart"], [tt(S.hiI + 3), "Latest unbroken swing levels are tracked"], [tt(S.n - 1) + .3, "Info panel summarises everything. It never trades."]]; },
  draw(h, t, S) {
    h.n = S.n; h.range(S.cs, .1); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y, cs = S.cs;
    const fz = tt(S.z.i + 2);
    if (t >= fz) { const p = h.e(fz, fz + .6); h.rc(X(S.z.i), Y(S.z.top), (h.x1 - X(S.z.i)) * p, Y(S.z.bot) - Y(S.z.top), "rgba(143,176,255,.2)", C.blue, 2); if (p > .9) h.tx(X(S.z.i) + 6, Y(S.z.top) + 11, "FVG", C.blue, 9, "start", 800); }
    const fo = tt(S.brk);
    if (t >= fo) { const p = h.e(fo, fo + .6), c = cs[S.ob]; h.rc(X(S.ob) - 4, Y(c.h), (h.x1 - X(S.ob)) * p, Y(c.l) - Y(c.h), "rgba(242,184,75,.2)", C.gold, 2); if (p > .9) h.tx(X(S.ob) + 8, Y(c.l) + 11, "ORDER BLOCK", C.gold, 9, "start", 800); }
    h.candles(cs, k);
    if (t >= fo) { const p = h.e(fo, fo + .6); h.ln(X(S.shI), Y(S.shv), lerp(X(S.shI), X(S.brk), p), Y(S.shv), C.white, 1.4, "5 4"); if (p > .9) h.pill((X(S.shI) + X(S.brk)) / 2, Y(S.shv) - 12, "BOS", C.white, C.ink, "middle", 9); }
    if (t >= tt(S.slI + 3)) { const p = h.e(tt(S.slI + 3), tt(S.slI + 3) + .6); h.hl(S.slv, X(S.slI), lerp(X(S.slI), h.x1, p), C.up, 1.3, "6 4"); if (p > .9) h.tx(h.x1 - 4, Y(S.slv) + 12, "SWING LOW " + fx(S.slv), C.up, 9, "end", 700); }
    if (t >= tt(S.hiI + 3)) { const p = h.e(tt(S.hiI + 3), tt(S.hiI + 3) + .6); h.hl(S.hiv, X(S.hiI), lerp(X(S.hiI), h.x1, p), C.dn, 1.3, "6 4"); if (p > .9) h.tx(h.x1 - 4, Y(S.hiv) - 5, "SWING HIGH " + fx(S.hiv), C.dn, 9, "end", 700); }
    h.panel(20, 26, 168, 118, "SMC MAP");
    const rows = [["Bullish FVG", t >= fz ? "1" : "0"], ["Bearish FVG", "0"], ["Order Blocks", t >= fo ? "1" : "0"], ["Swing High", t >= tt(S.hiI + 3) ? fx(S.hiv) : "-"], ["Swing Low", t >= tt(S.slI + 3) ? fx(S.slv) : "-"]];
    rows.forEach((r, i) => { h.tx(32, 64 + i * 16, r[0], C.mut, 9.5, "start", 600); h.tx(176, 64 + i * 16, r[1], C.white, 10, "end", 700); });
    h.tx(20, 350, "VISUAL ONLY · NO TRADES", C.mut, 9, "start", 700);
  }
};

/* ---------- TF & Session Levels ---------- */
SC.sessions = {
  dur: 17, still: 14, bar: "XAUUSD, M30 · session ranges and levels",
  init() {
    const cs = walk(3998, [[8, 4004], [8, 3999], [10, 4012], [8, 4008], [8, 4020], [6, 4014]], 51, .6, .5);
    const ses = [["ASIA", 0, 15, "#8FB0FF"], ["LONDON", 16, 33, C.gold], ["NEW YORK", 26, 44, C.up]];
    ses.forEach(s => { s.hi = maxHigh(cs, s[1], s[2]); s.lo = minLow(cs, s[1], s[2]); });
    return { cs, n: cs.length, ses, d1h: maxHigh(cs, 0, 47) + 2.2, d1l: minLow(cs, 0, 47) - 2, h4h: 4016.4, h4l: 4001.2, T0: .8, D: 12 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.3, "Previous D1 and H4 highs and lows are drawn"], [tt(15), "Asia session box with its High and Low"], [tt(33), "London session box"], [tt(44), "New York session box. Everything is visual only."]]; },
  draw(h, t, S) {
    h.n = S.n; h.y0 = 50; h.range(S.cs.concat([{ h: S.d1h, l: S.d1l }]), .06); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y, st = h.step();
    const la = h.e(.4, 1.6);
    [[S.d1h, "PREV D1 HIGH", C.mut], [S.d1l, "PREV D1 LOW", C.mut], [S.h4h, "PREV H4 HIGH", "#B197FC"], [S.h4l, "PREV H4 LOW", "#B197FC"]].forEach(l => {
      h.hl(l[0], h.x0, lerp(h.x0, h.x1, la), l[2], 1.2, "3 4", .9); h.tx(h.x0 + 6, Y(l[0]) - 4, l[1] + " " + fx(l[0]), l[2], 8.5, "start", 700, la);
    });
    S.ses.forEach(s => {
      const done = tt(s[2]), cur = k > s[1] && k < s[2] + 1, vis = k > s[1];
      if (!vis) return;
      const hi = maxHigh(S.cs, s[1], Math.min(Math.floor(k), s[2])), lo = minLow(S.cs, s[1], Math.min(Math.floor(k), s[2]));
      const xe = X(Math.min(k, s[2])) + st / 2;
      h.rc(X(s[1]) - st / 2, Y(hi), xe - (X(s[1]) - st / 2), Y(lo) - Y(hi), s[3], s[3], 3, .13);
      h.rc(X(s[1]) - st / 2, Y(hi), xe - (X(s[1]) - st / 2), Y(lo) - Y(hi), "none", s[3], 3, .9, 1.3);
      h.pill(X(s[1]) - st / 2 + 6, Y(hi) + 14, s[0], s[3], C.ink, "start", 8.5);
      if (t >= done) {
        const p = h.e(done, done + .6);
        h.hl(s.hi, xe, lerp(xe, h.x1, p), s[3], 1.2, "5 4"); h.hl(s.lo, xe, lerp(xe, h.x1, p), s[3], 1.2, "5 4");
        if (p > .9) { h.tx(h.x1 - 4, Y(s.hi) - 3, s[0] + " H " + fx(s.hi), s[3], 8.5, "end", 700); h.tx(h.x1 - 4, Y(s.lo) + 11, s[0] + " L " + fx(s.lo), s[3], 8.5, "end", 700); }
      }
    });
    h.candles(S.cs, k);
    const chips = [["ASIA", 0, 15], ["TOKYO", 2, 11], ["LONDON", 16, 33], ["NEW YORK", 26, 44]];
    h.tx(20, 36, "SESSIONS", C.mut, 9, "start", 700);
    let x = 80;
    chips.forEach(c => { const on = k >= c[1] && k < c[2] + 1; x += h.pill(x, 32, c[0], on ? C.up : C.tile, on ? C.ink : C.mut, "start", 9) + 6; });
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3); h.tag(pr, "#fff", C.ink);
  }
};

/* ---------- Chart Analysis Panel ---------- */
SC.chartpanel = {
  dur: 15, still: 11.5, bar: "XAUUSD, M15 · one-dashboard analysis",
  init() {
    const cs = walk(4000, [[8, 3992], [8, 4006], [6, 3999], [10, 4016], [8, 4010]], 61, .6, .5);
    const L = minLow(cs, 0, 10), H = maxHigh(cs, 24, 34);
    let topI = 24; for (let i = 24; i <= 34; i++) if (cs[i].h > cs[topI].h) topI = i;
    const pdh = H + 1.6, pdl = L - 1.6;
    return { cs, n: cs.length, L, H, topI, pdh, pdl, piv: (pdh + pdl + cs[39].c) / 3, T0: .6, D: 9.4 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.3, "Session box and pivot levels appear"], [tt(13), "Demand zone detected automatically"], [tt(S.topI + 3), "Supply zone detected automatically"], [3, "ADR usage and multi-timeframe trend on the dashboard"]].sort((a, b) => a[0] - b[0]); },
  draw(h, t, S) {
    h.n = S.n; h.x1 = 398; h.range(S.cs.concat([{ h: S.pdh, l: S.pdl }]), .07); h.grid(5, "in");
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y, st = h.step();
    const sa = h.e(.2, 1);
    h.rc(X(8) - st / 2, h.y0, (X(30) - X(8) + st) * sa, h.y1 - h.y0, C.gold, null, 0, .07);
    h.pill(X(8) - st / 2 + 6, h.y0 + 12, "LONDON SESSION", C.gold, C.ink, "start", 8.5, sa);
    const pa = h.e(.8, 1.8);
    [[S.pdh, "PDH", C.mut], [S.piv, "PIVOT", C.blue], [S.pdl, "PDL", C.mut]].forEach(l => { h.hl(l[0], h.x0, lerp(h.x0, h.x1, pa), l[2], 1.2, "4 4"); h.tx(h.x0 + 6, Y(l[0]) - 4, l[1] + " " + fx(l[0]), l[2], 8.5, "start", 700, pa); });
    const td = tt(13), ts = tt(S.topI + 3);
    if (t >= td) { const p = h.e(td, td + .6); h.rc(X(4), Y(S.L + 2.4), (X(22) - X(4)) * p, Y(S.L) - Y(S.L + 2.4), "rgba(52,214,160,.2)", C.up, 2); if (p > .9) h.tx(X(4) + 6, Y(S.L + 2.4) + 12, "DEMAND", C.up, 9, "start", 800); }
    if (t >= ts) { const p = h.e(ts, ts + .6); h.rc(X(S.topI - 4), Y(S.H), (h.x1 - X(S.topI - 4)) * p, Y(S.H - 2.4) - Y(S.H), "rgba(255,122,122,.2)", C.dn, 2); if (p > .9) h.tx(X(S.topI - 4) + 6, Y(S.H) + 12, "SUPPLY", C.dn, 9, "start", 800); }
    h.candles(S.cs, k);
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3);

    h.panel(412, 22, 220, 334, "CHART ANALYSIS");
    h.tx(424, 52, "SESSION", C.mut, 9, "start", 700);
    h.pill(424, 70, "LONDON", C.up, C.ink, "start", 9.5); h.tx(480, 74, "active", C.up, 9.5, "start", 600);
    h.tx(424, 96, "NEXT  NEW YORK  in " + clock(8100 - t * 40), C.txt, 10, "start", 600);
    h.tx(424, 130, "ADR USED", C.mut, 9, "start", 700); h.tx(620, 130, Math.round(72 * h.e(2, 9)) + "%", C.white, 10.5, "end", 700);
    h.rc(424, 138, 196, 10, C.tile, C.pbd, 5); h.rc(424, 138, 196 * .72 * h.e(2, 9), 10, h.e(2, 9) > .95 ? C.gold : C.up, null, 5);
    h.tx(424, 166, "MULTI-TIMEFRAME TREND", C.mut, 9, "start", 700);
    [["M15", 1], ["H1", 1], ["H4", -1], ["D1", 1]].forEach((m, i) => {
      const a = h.e(3 + i * .5, 3.4 + i * .5), x = 424 + i * 50;
      h.rc(x, 176, 44, 40, C.tile, C.pbd, 7);
      h.tx(x + 22, 192, m[0], C.mut, 9.5, "middle", 700); h.tx(x + 22, 209, m[1] > 0 ? "▲" : "▼", m[1] > 0 ? C.up : C.dn, 13, "middle", 800, a);
    });
    h.tx(424, 244, "KEY LEVELS", C.mut, 9, "start", 700);
    [["PDH", S.pdh, C.txt], ["PIVOT", S.piv, C.blue], ["PDL", S.pdl, C.txt]].forEach((l, i) => { h.tx(424, 262 + i * 17, l[0], C.mut, 10, "start", 600); h.tx(620, 262 + i * 17, fx(l[1]), l[2], 10.5, "end", 700); });
    h.tx(424, 328, "ZONES", C.mut, 9, "start", 700);
    h.tx(620, 328, "Supply " + (t >= ts ? 1 : 0) + "   Demand " + (t >= td ? 1 : 0), C.white, 10.5, "end", 700);
  }
};

/* ---------- Alert Manager Panel ---------- */
SC.alerts = {
  dur: 16, still: 13, bar: "XAUUSD, M5 · draggable alerts",
  init() {
    const cs = walk(4000, [[8, 4003], [6, 4001.5], [8, 4009], [10, 4015.5]], 71, .5, .5);
    return { cs, n: cs.length, ci: crossUp(cs, 4012, 14), T0: .5, D: 11 };
  },
  steps(S) { return [[.4, "Nine alert types, up to 30 at the same time"], [2.3, "Drag the alert line on the chart to a new level"], [5.2, "Price moves toward the alert level"], [S.T0 + S.D * (S.ci + .5) / S.n, "Alert fires: popup, sound, push and e-mail"]]; },
  draw(h, t, S) {
    h.n = S.n; h.x1 = 398; h.range(S.cs.concat([{ h: 4017, l: 3998 }]), .08); h.grid(5, "in");
    const k = S.n * h.p(S.T0, S.T0 + S.D), tA = S.T0 + S.D * (S.ci + .5) / S.n, trig = t >= tA;
    const lv = t < 2.4 ? 4007.5 : t < 4.8 ? lerp(4007.5, 4012, h.e(2.4, 4.8)) : 4012;
    h.candles(S.cs, k);
    const pulse = trig ? .5 + .5 * Math.sin((t - tA) * 10) : 0, y = h.Y(lv), hx = h.x1 - 40;
    h.hl(lv, h.x0, h.x1, trig ? C.up : C.gold, 1.8, trig ? null : "7 4");
    h.pill(h.x1 - 8, y - 13, (trig ? "TRIGGERED  " : "PRICE UP  ") + fx(lv), trig ? C.up : C.gold, C.ink, "end", 9.5);
    h.ci(hx, y, 6, C.pan, trig ? C.up : C.gold, 1, 2);
    if (trig && t - tA < 1.2) h.ci(hx, y, 8 + (t - tA) * 30, "none", C.up, 1 - (t - tA) / 1.2, 2);
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3);
    h.cur([[1.8, hx + 20, y + 50, 0], [2.4, hx, h.Y(4007.5), 1], [4.8, hx, h.Y(4012), 0]]);
    if (trig) {
      const by = lerp(-60, 30, h.e(tA, tA + .4));
      h.rc(20, by, 330, 62, "#142B52", C.gold, 10, 1, 1.4);
      h.tx(34, by + 19, "ALERT TRIGGERED", C.gold, 9, "start", 800); h.tx(34, by + 37, "PRICE UP  ·  XAUUSD reached 4012.00", C.white, 11, "start", 700);
      ["POPUP", "SOUND", "PUSH", "E-MAIL"].forEach((c, i) => { const on = t >= tA + .3 + i * .3; h.pill(34 + i * 70, by + 52 - 3, c, on ? C.up : C.tile, on ? C.ink : C.mut, "start", 8.5); });
    }
    h.panel(412, 22, 220, 334, "ALERT MANAGER");
    h.tx(620, 39, trig ? "4 active · 1 triggered" : "5 active", trig ? C.up : C.mut, 9, "end", 700);
    [["PRICE UP", fx(lv)], ["CLOSE BELOW", "3996.00"], ["SPREAD >", "0.60"], ["RSI >", "70"], ["TIME", "18:30"]].forEach((r, i) => {
      const ry = 52 + i * 50, on = i === 0 && trig;
      h.rc(422, ry, 200, 42, on ? "rgba(52,214,160,.16)" : C.tile, on ? C.up : C.pbd, 8, on ? .5 + .5 * (.6 + .4 * pulse) : 1);
      if (on) h.rc(422, ry, 200, 42, "none", C.up, 8, 1, 1.5);
      h.tx(434, ry + 18, r[0], C.mut, 9, "start", 700); h.tx(434, ry + 35, r[1], C.white, 12.5, "start", 700);
      h.ci(604, ry + 21, 5, on ? C.up : "#3FA7FF"); if (on) h.tx(596, ry + 25, "✓", C.ink, 9, "end", 800);
    });
    h.tx(422, 322, "Delivery:  popup · sound · push · e-mail", C.mut, 9, "start", 600);
    h.tx(422, 340, "Drag chart lines to move any alert", C.mut, 9, "start", 500);
  }
};

/* ---------- Auto Structure & Fibonacci Panel ---------- */
SC.structure = {
  dur: 19, still: 16, bar: "XAUUSD, M15 · structure and Fibonacci",
  init() {
    const cs = walk(4000, [[5, 3992], [5, 4006], [5, 3998], [6, 4014], [5, 4004], [6, 4022], [5, 3998], [5, 4012], [6, 3992]], 101, .5, .5);
    const sw = [[4, "L", 0], [9, "H", 1], [14, "HL", 0], [20, "HH", 1], [25, "HL", 0], [31, "HH", 1], [36, "LL", 0], [41, "LH", 1]].map(s => ({ i: s[0], lab: s[1], hi: !!s[2], v: s[2] ? cs[s[0]].h : cs[s[0]].l }));
    return { cs, n: cs.length, sw, b1: crossUp(cs, sw[1].v, 15), b2: crossUp(cs, sw[3].v, 26), ch: crossDn(cs, sw[4].v, 32), T0: .6, D: 14 };
  },
  steps(S) { const tt = i => S.T0 + S.D * (i + .5) / S.n; return [[.4, "Swing highs and lows are labelled automatically"], [tt(S.b1), "BOS: structure breaks in the trend direction"], [tt(S.ch), "CHoCH: the structure changes direction"], [tt(38.5), "Auto Fibonacci on the latest leg with golden pocket"], [tt(43), "Extension targets are projected"]]; },
  draw(h, t, S) {
    h.n = S.n; const hiF = S.sw[5].v, loF = S.sw[6].v, rg = hiF - loF;
    h.range(S.cs.concat([{ h: hiF + 1, l: loF - rg * .65 }]), .05); h.grid(5);
    const k = S.n * h.p(S.T0, S.T0 + S.D), tt = i => S.T0 + S.D * (i + .5) / S.n, X = h.X, Y = h.Y;
    const conf = S.sw.filter(s => k >= s.i + 2.5);
    const tF = tt(38.5);
    if (t >= tF) {
      const p = h.e(tF, tF + .7);
      h.rc(X(31), Y(loF + rg * .65), (h.x1 - X(31)) * p, Y(loF + rg * .618) - Y(loF + rg * .65), "rgba(242,184,75,.3)");
      [0, .382, .5, .618, 1].forEach(r => { const v = loF + rg * r; h.hl(v, X(31), lerp(X(31), h.x1, p), r === .618 ? C.gold : C.blue, r === .618 ? 1.6 : 1, r % 1 === 0 ? null : "5 4"); if (p > .9) h.tx(h.x1 - 4, Y(v) - 3, r + "  " + fx(v), r === .618 ? C.gold : C.blue, 9, "end", 700); });
      if (p > .9) h.pill(X(31) + 8, Y(loF + rg * .634) - 14, "GOLDEN POCKET", C.gold, C.ink, "start", 8.5);
    }
    const tX = tt(43);
    if (t >= tX) { const p = h.e(tX, tX + .7); [.272, .618].forEach(r => { const v = loF - rg * r; h.hl(v, X(36), lerp(X(36), h.x1, p), C.dn, 1.2, "3 4"); if (p > .9) h.tx(h.x1 - 4, Y(v) - 3, "-" + r + "  " + fx(v), C.dn, 9, "end", 700); }); }
    h.candles(S.cs, k);
    if (conf.length > 1) h.poly(conf.map(s => [X(s.i), Y(s.v)]), "#B197FC", 1.4, "4 3", null, .9);
    conf.forEach(s => {
      const good = s.lab === "HH" || s.lab === "HL", bad = s.lab === "LL" || s.lab === "LH", col = good ? C.up : bad ? C.dn : C.white;
      h.pill(X(s.i), Y(s.v) + (s.hi ? -16 : 17), s.lab, col, C.ink, "middle", 9);
    });
    [[S.b1, S.sw[1], "BOS", C.white], [S.b2, S.sw[3], "BOS", C.white], [S.ch, S.sw[4], "CHoCH", C.gold]].forEach(b => {
      const te = tt(b[0]); if (t < te) return;
      const p = h.e(te, te + .5), x0 = X(b[1].i), x1 = lerp(x0, X(b[0]), p);
      h.ln(x0, Y(b[1].v), x1, Y(b[1].v), b[3], 1.4, "5 4");
      if (p > .9) h.pill((x0 + X(b[0])) / 2, Y(b[1].v) + (b[2] === "CHoCH" ? 14 : -12), b[2], b[3], C.ink, "middle", 9);
    });
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3); h.tag(pr, "#fff", C.ink);
    h.panel(20, 26, 196, 70, "AUTO STRUCTURE");
    h.tx(32, 50, "Swing strength", C.mut, 9.5, "start", 600);
    h.rc(138, 38, 20, 16, C.tile, C.pbd, 4); h.tx(148, 50, "-", C.white, 11, "middle", 800); h.tx(168, 50, "2", C.white, 11, "middle", 800); h.rc(178, 38, 20, 16, C.tile, C.pbd, 4); h.tx(188, 50, "+", C.white, 11, "middle", 800);
    const trend = t >= tt(S.ch) ? "Bearish (CHoCH)" : t >= tt(S.b1) ? "Bullish (BOS)" : "Building...";
    h.tx(32, 76, "Trend", C.mut, 9.5, "start", 600); h.tx(204, 76, trend, t >= tt(S.ch) ? C.dn : t >= tt(S.b1) ? C.up : C.mut, 10.5, "end", 700);
  }
};

/* ---------- Market Scanner Panel ---------- */
SC.scanner = {
  dur: 17, still: 14, bar: "Watchlist · live scanner",
  init() {
    const rows = [["XAUUSD", 4012.4, 2, .84, 22, 64, 1, .72], ["EURUSD", 1.0842, 5, -.12, 8, 45, 0, .35], ["GBPUSD", 1.2931, 5, .31, 11, 58, 1, .51], ["USDJPY", 151.62, 3, -.47, 14, 36, -1, .83],
      ["US30", 43120, 1, .22, 180, 56, 1, .4], ["NAS100", 20840, 1, .63, 140, 67, 1, .66], ["BTCUSD", 98410, 0, 1.45, 1800, 71, 1, .91], ["XAGUSD", 31.84, 3, -.28, 25, 41, -1, .58]];
    const B = rows.map((r, i) => i).sort((a, b) => rows[b][3] - rows[a][3]), Cc = B.filter(i => rows[i][6] === 1);
    return { rows, pB: rows.map((r, i) => B.indexOf(i)), pC: rows.map((r, i) => Cc.indexOf(i)) };
  },
  steps: () => [[.3, "Up to 40 symbols with price, change, spread, RSI, trend and ADR"], [5.8, "One click on a header sorts the list"], [10.4, "Filters keep only the symbols you want"], [13, "Click a row to jump to that chart"]],
  draw(h, t, S) {
    h.panel(14, 14, 612, 352);
    h.tx(30, 36, "MARKET SCANNER", C.white, 12, "start", 800);
    const sorted = t >= 6.1, filt = t >= 10.7;
    h.pill(260, 32, "SORT: " + (sorted ? "CHG %" : "NONE"), sorted ? C.gold : C.tile, sorted ? C.ink : C.mut, "start", 9);
    h.pill(484, 32, "ALL", filt ? C.tile : C.up, filt ? C.mut : C.ink, "start", 9); h.pill(526, 32, "UP ONLY", filt ? C.up : C.tile, filt ? C.ink : C.mut, "start", 9);
    h.ln(26, 58, 614, 58, C.pbd, 1);
    [["SYMBOL", 30, "start"], ["PRICE", 196, "end"], ["CHG %", 268, "end"], ["SPREAD", 338, "end"], ["RSI", 400, "end"], ["TREND", 452, "middle"], ["ADR USED", 496, "start"]].forEach(c => h.tx(c[1], 74, c[0], c[0] === "CHG %" && sorted ? C.gold : C.mut, 9, c[2], 700));
    const pAB = h.e(6.1, 6.8), pBC = h.e(10.7, 11.4), hot = t >= 13.3 ? S.pC[0] === 0 ? 0 : 0 : -1;
    const order = S.rows.map((r, j) => {
      const a = lerp(j, S.pB[j], pAB), b = S.pC[j] >= 0 ? S.pC[j] : S.pB[j];
      return { j, slot: lerp(a, b, pBC), al: r[6] === 1 ? 1 : 1 - pBC * .88 };
    });
    order.forEach(o => {
      const r = S.rows[o.j], y = 86 + o.slot * 32, wob = Math.sin(t * 2 + o.j * 1.7);
      const price = r[1] * (1 + .0003 * wob), chg = r[3] + .02 * wob, rsi = Math.round(r[5] + 2 * Math.sin(t * 1.3 + o.j)), adr = clamp(r[7] + .02 * wob, 0, 1);
      const isHot = o.j === 0 && t >= 13.3;
      h.rc(24, y, 592, 28, isHot ? "rgba(143,176,255,.22)" : C.tile, isHot ? C.blue : C.pbd, 7, o.al);
      h.g(o.al, () => {
        h.tx(32, y + 18, r[0], C.white, 11, "start", 700); h.tx(196, y + 18, price.toFixed(r[2]), C.txt, 11, "end", 600);
        h.tx(268, y + 18, (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%", chg >= 0 ? C.up : C.dn, 11, "end", 700);
        h.tx(338, y + 18, String(r[4]), C.mut, 11, "end", 600);
        h.tx(400, y + 18, String(rsi), rsi > 70 ? C.dn : rsi < 30 ? C.up : C.txt, 11, "end", 700);
        h.tx(452, y + 18, r[6] > 0 ? "▲" : r[6] < 0 ? "▼" : "▬", r[6] > 0 ? C.up : r[6] < 0 ? C.dn : C.mut, 11, "middle", 800);
        h.rc(496, y + 10, 84, 8, "#0A1730", null, 4); h.rc(496, y + 10, 84 * adr, 8, adr > .8 ? C.gold : C.blue, null, 4);
        h.tx(612, y + 18, Math.round(adr * 100) + "%", C.mut, 9, "end", 600);
      });
    });
    h.cur([[4.6, 500, 300, 0], [6, 268, 70, 1], [10.6, 548, 34, 1], [13.2, 90, 86 + 32 + 14, 1]]);
    if (t >= 13.3) h.pill(320, 352, "Opening XAUUSD chart...", C.blue, C.ink, "middle", 10, clamp((t - 13.3) / .3));
  }
};

/* ---------- News Calendar & Filter Panel ---------- */
SC.news = {
  dur: 18, still: 9, bar: "XAUUSD, M5 · economic calendar",
  init() { return { cs: walk(4000, [[22, 4000.5], [3, 4014], [2, 4005], [3, 4010]], 81, .55, .5), n: 30 }; },
  steps: () => [[.3, "Built-in MT5 calendar: next event with live countdown"], [2.2, "Filter by currency and impact"], [6, "Pre-news alert before the release"], [9, "News protection pauses trading around the release"], [14.2, "Protection ends and trading resumes"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 358; h.range(S.cs, .1); h.grid(5, "in");
    const k = t < 12 ? 22 * clamp((t - .5) / 11.5) : 22 + 8 * clamp((t - 12) / 4), X = h.X, st = h.step();
    const prot = t >= 9 && t < 14.2;
    if (prot) h.rc(X(21) - st / 2, h.y0, st * 6, h.y1 - h.y0, C.dn, null, 0, .1);
    h.candles(S.cs, k);
    h.ln(X(22) - st / 2, h.y0, X(22) - st / 2, h.y1, C.gold, 1.5, "5 4"); h.pill(X(22) - st / 2, h.y0 + 10, "NFP", C.gold, C.ink, "middle", 9.5);
    const pr = priceAt(S.cs, k); h.hl(pr, h.x0, h.x1, "#fff", 1, "2 4", .3);
    if (t >= 6 && t < 9.5) { h.rc(20, 36, 214, 28, C.gold, null, 8, clamp(1 - Math.abs(t - 7.7) / 2.2 + .3)); h.tx(32, 54, "PRE-NEWS ALERT  ·  NFP in 30 s", C.ink, 10.5, "start", 800, clamp(1 - Math.abs(t - 7.7) / 2.2 + .3)); }
    h.panel(374, 22, 258, 334, "NEWS CALENDAR");
    const hi = t >= 2.3;
    h.pill(384, 56, "ALL", hi ? C.tile : C.up, hi ? C.mut : C.ink, "start", 9); h.pill(420, 56, "USD", C.up, C.ink, "start", 9); h.pill(462, 56, "HIGH IMPACT", hi ? C.up : C.tile, hi ? C.ink : C.mut, "start", 9);
    h.rc(384, 72, 238, 80, C.tile, C.pbd, 9);
    h.tx(396, 90, "NEXT EVENT", C.mut, 9, "start", 700); [0, 1, 2].forEach(i => h.ci(598 + i * 8 - 8, 86, 3, C.dn));
    h.tx(396, 110, "Non-Farm Payrolls", C.white, 13, "start", 800);
    h.tx(396, 127, "USD · Forecast 185K · Previous 175K", C.mut, 9.5, "start", 600);
    const cd = Math.max(0, (12 - t) * 5), cdTxt = clock(cd);
    h.tx(396, 146, "in", C.mut, 9.5, "start", 600); h.tx(412, 148, t < 12 ? cdTxt : "RELEASED", t < 12 ? C.gold : C.up, 14, "start", 800);
    h.tx(612, 146, "demo speed x5", C.mut, 8, "end", 500);
    h.tx(384, 172, "UPCOMING EVENTS", C.mut, 9, "start", 700);
    const ev = [["14:30", "Non-Farm Payrolls", 3], ["14:30", "Unemployment Rate", 2], ["16:00", "ISM Services PMI", 2], ["20:00", "FOMC Minutes", 3]], pf = h.e(2.3, 3);
    const slot = [0, 2, 3, 1];
    ev.forEach((e, j) => {
      const y = 180 + lerp(j, slot[j], pf) * 30, al = e[2] === 3 ? 1 : 1 - pf * .85;
      h.rc(384, y, 238, 26, C.tile, C.pbd, 6, al);
      h.g(al, () => { h.tx(394, y + 17, e[0], C.mut, 10, "start", 600); h.tx(432, y + 17, e[1], C.white, 10.5, "start", 600); for (let i = 0; i < 3; i++) h.ci(596 + i * 8, y + 13, 2.8, i < e[2] ? C.dn : "#2B3F63"); });
    });
    h.rc(384, 306, 238, 38, prot ? "rgba(255,122,122,.18)" : t >= 14.2 ? "rgba(52,214,160,.16)" : C.tile, prot ? C.dn : t >= 14.2 ? C.up : C.pbd, 9);
    h.tx(503, 322, prot ? "NEWS PROTECTION ON" : t >= 14.2 ? "PROTECTION OFF" : "NEWS PROTECTION: READY", prot ? C.dn : t >= 14.2 ? C.up : C.mut, 10.5, "middle", 800);
    h.tx(503, 337, prot ? "Trading paused around the release" : t >= 14.2 ? "Trading resumed" : "Pauses trading near high-impact news", C.mut, 9, "middle", 500);
    h.cur([[1.2, 560, 220, 0], [2.3, 500, 56, 1]]);
  }
};

/* ---------- Quick Trade Panel ---------- */
SC.quick = {
  dur: 19, still: 15.8, bar: "XAUUSD, M1 · one-click trading",
  init() {
    const cs = walk(4000, [[8, 4000.4], [8, 4004], [6, 4003], [6, 4007.5], [6, 4012]], 91, .5, .5), n = cs.length, T0 = .5, D = 14.5;
    const kOf = t => n * clamp((t - T0) / D);
    return { cs, n, T0, D, kOf, pe: priceAt(cs, kOf(3.4)) };
  },
  steps: () => [[.3, "BUY and SELL with the live price on the buttons"], [3.3, "One click: BUY opens with SL and TP in points"], [7.4, "Partial close takes half of the profit"], [9.7, "Break even moves the stop to the entry"], [11.9, "Trailing stop follows the price"], [15.1, "Close all positions with one click"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 372; const pe = S.pe, SL0 = pe - 1.5, TP = pe + 6;
    h.range(S.cs.concat([{ h: TP + 1, l: SL0 - 1 }]), .05); h.grid(5, "in");
    const k = S.kOf(Math.min(t, 15.2) + (t > 15.2 ? 0 : 0)), X = h.X, Y = h.Y;
    const opened = t >= 3.4, closed = t >= 15.2, partial = t >= 7.5, be = t >= 9.8, trail = t >= 12;
    h.candles(S.cs, S.kOf(t));
    const px = priceAt(S.cs, S.kOf(t));
    let hh = -1e9; const kk = S.kOf(t); for (let i = 0; i < S.n && i < kk; i++) hh = Math.max(hh, i + 1 > kk ? part(S.cs[i], kk - i).h : S.cs[i].h);
    const hiSince = (() => { let m = -1e9; for (let i = Math.floor(S.kOf(12)); i < S.n && i < kk; i++) m = Math.max(m, S.cs[i].h); return m; })();
    let sl = SL0; if (be) sl = pe; if (trail) sl = Math.max(sl, hiSince - 2.5);
    const xe = h.X(Math.floor(S.kOf(3.4)));
    if (opened) {
      const ci = Math.min(S.n - 1, Math.floor(S.kOf(15.2))), xr = closed ? X(ci) : h.x1;
      h.rc(xe, Y(TP), xr - xe, Y(pe) - Y(TP), "rgba(52,214,160,.1)"); h.rc(xe, Y(pe), xr - xe, Y(sl) - Y(pe), "rgba(255,122,122,.12)");
      h.hl(pe, xe, xr, C.white, 1.5); h.hl(sl, xe, xr, C.red, 1.8); h.hl(TP, xe, xr, C.gold, 1.4, "3 4");
      h.pill(xe + 2, Y(pe) + 20, "BUY " + fx(pe), C.up, C.ink, "start", 9);
      h.tx(xr - 4, Y(sl) + 12, trail ? "TRAILING STOP" : be ? "BREAK EVEN" : "SL 150 pts", C.red, 9, "end", 800);
      h.tx(xr - 4, Y(TP) - 4, "TP 600 pts", C.gold, 9, "end", 800);
      if (partial && t < 11) h.pill(X(Math.floor(S.kOf(7.5))) , Y(px) - 16, "50% CLOSED  +$" + ((px - pe) * 5).toFixed(2), C.gold, C.ink, "middle", 9, clamp(1 - (t - 9.8) / 1.2));
      if (closed) { h.ci(xr, Y(S.cs[ci].c), 5, C.gold, "#fff", 1, 2); }
    }
    h.hl(px, h.x0, h.x1, "#fff", 1, "2 4", .3);
    /* panel */
    h.panel(388, 22, 244, 334, "QUICK TRADE PANEL");
    h.tx(400, 52, "XAUUSD", C.white, 13, "start", 800); h.tx(620, 52, fx(px), C.gold, 13, "end", 800); h.tx(400, 67, "spread 22", C.mut, 9, "start", 500);
    const flash = (a) => t >= a && t < a + .4;
    h.rc(400, 76, 108, 42, flash(0) ? C.dn : "rgba(255,122,122,.2)", C.dn, 9); h.tx(454, 93, "SELL", C.dn, 10, "middle", 800); h.tx(454, 110, fx(px - .11), C.white, 12, "middle", 800);
    h.rc(516, 76, 108, 42, flash(3.4) ? C.up : "rgba(52,214,160,.2)", C.up, 9); h.tx(570, 93, "BUY", C.up, 10, "middle", 800); h.tx(570, 110, fx(px + .11), C.white, 12, "middle", 800);
    [["LOT", "0.10"], ["SL (pts)", "150"], ["TP (pts)", "600"]].forEach((fl, i) => { const x = 400 + i * 76; h.tx(x, 138, fl[0], C.mut, 8.5, "start", 700); h.rc(x, 143, 70, 24, C.tile, C.pbd, 6); h.tx(x + 35, 160, fl[1], C.white, 11, "middle", 700); });
    h.pill(400, 184, "FIXED LOT", C.up, C.ink, "start", 8.5); h.pill(470, 184, "RISK %", C.tile, C.mut, "start", 8.5);
    const btns = [["PARTIAL", 7.5], ["BREAK EVEN", 9.8], ["TRAILING", 12], ["REVERSE", 99], ["CLOSE ALL", 15.2], ["CLOSE BUY", 99]];
    btns.forEach((b, i) => { const x = 400 + (i % 3) * 76, y = 204 + Math.floor(i / 3) * 40, on = flash(b[1]); h.rc(x, y, 70, 32, on ? C.gold : C.tile, on ? C.gold : C.pbd, 7); h.tx(x + 35, y + 20, b[0], on ? C.ink : C.txt, 8.5, "middle", 800); });
    h.rc(400, 290, 224, 56, C.tile, C.pbd, 9);
    if (!opened) { h.tx(512, 322, "No open position", C.mut, 11, "middle", 600); }
    else if (closed) { const pl = (px - pe) * 5 + 5 * (Math.max(0, S.cs[Math.floor(S.kOf(7.5))].c - pe)) ; h.tx(412, 311, "CLOSED", C.gold, 9, "start", 800); h.tx(612, 318, "+$" + ((px - pe) * 5 + (priceAt(S.cs, S.kOf(7.5)) - pe) * 5).toFixed(2), C.up, 17, "end", 800); h.tx(412, 332, "All positions closed", C.mut, 9, "start", 500); }
    else { const lot = partial ? .05 : .1, pl = (px - pe) * lot * 100 + (partial ? (priceAt(S.cs, S.kOf(7.5)) - pe) * 5 : 0); h.tx(412, 311, "BUY " + lot.toFixed(2) + " @ " + fx(pe), C.white, 10, "start", 700); h.tx(412, 332, "Floating P/L", C.mut, 9, "start", 500); h.tx(612, 332, (pl >= 0 ? "+$" : "-$") + Math.abs(pl).toFixed(2), pl >= 0 ? C.up : C.dn, 17, "end", 800); }
    h.cur([[2.2, 640, 330, 0], [3.4, 570, 97, 1], [6.4, 436, 221, 0], [7.5, 436, 221, 1], [9.8, 512, 221, 1], [12, 588, 221, 1], [15.2, 512, 261, 1]]);
  }
};

/* ---------- Volume Profile Panel ---------- */
SC.volume = {
  dur: 17, still: 14.5, bar: "XAUUSD, M5 · volume profile (day)",
  init() { const cs = walk(4000, [[8, 4004], [8, 3996], [6, 4000], [6, 4006], [8, 4001]], 111, .7, .6); return { cs, n: cs.length, T0: .6, D: 10 }; },
  steps: S => [[.3, "Volume builds up price level by level"], [S.T0 + S.D * .5, "Point of Control: the busiest price of the period"], [S.T0 + S.D + .2, "Value Area (70% of volume) with VAH and VAL"], [S.T0 + S.D + 2.2, "High and low volume nodes, plus previous-day levels"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 452; h.range(S.cs, .06); h.grid(5, "in");
    const k = S.n * h.p(S.T0, S.T0 + S.D), NB = 24, bs = (h.hi - h.lo) / NB, vol = new Array(NB).fill(0);
    const add = (lo, hi, w) => { if (hi - lo < .1) { const m = (hi + lo) / 2; lo = m - .05; hi = m + .05; } for (let b = 0; b < NB; b++) { const b0 = h.lo + b * bs, b1 = b0 + bs, ov = Math.min(hi, b1) - Math.max(lo, b0); if (ov > 0) vol[b] += w * ov / (hi - lo); } };
    for (let i = 0; i < S.n && i < k; i++) { const c = i + 1 > k ? part(S.cs[i], k - i) : S.cs[i], fr = i + 1 > k ? k - i : 1; add(Math.min(c.o, c.c), Math.max(c.o, c.c), .6 * fr); add(c.l, c.h, .4 * fr); }
    let poc = 0; vol.forEach((v, b) => { if (v > vol[poc]) poc = b; });
    const mx = Math.max(vol[poc], .01), tot = vol.reduce((a, b) => a + b, 0);
    let lo = poc, hi = poc, acc = vol[poc];
    while (acc < .7 * tot && (lo > 0 || hi < NB - 1)) { const dn = lo > 0 ? vol[lo - 1] : -1, up = hi < NB - 1 ? vol[hi + 1] : -1; if (up >= dn) { hi++; acc += vol[hi]; } else { lo--; acc += vol[lo]; } }
    const full = k >= S.n, mid = b => h.lo + (b + .5) * bs, pocV = mid(poc), vah = h.lo + (hi + 1) * bs, val = h.lo + lo * bs;
    const tV = S.T0 + S.D + .2;
    if (full && t >= tV) { const p = h.e(tV, tV + .5); h.rc(h.x0, h.Y(vah), (h.x1 - h.x0), h.Y(val) - h.Y(vah), C.blue, null, 0, .09 * p); }
    h.candles(S.cs, k);
    h.hl(pocV, h.x0, h.x1, C.gold, 1.5, "6 4", k > 3 ? 1 : 0); if (k > 3) h.pill(h.x1 - 8, h.Y(pocV) - 12, "POC " + fx(pocV), C.gold, C.ink, "end", 9);
    if (full && t >= tV) {
      h.hl(vah, h.x0, h.x1, C.blue, 1.2, "4 4"); h.hl(val, h.x0, h.x1, C.blue, 1.2, "4 4");
      h.tx(h.x0 + 6, h.Y(vah) - 4, "VAH " + fx(vah), C.blue, 9, "start", 700); h.tx(h.x0 + 6, h.Y(val) + 11, "VAL " + fx(val), C.blue, 9, "start", 700);
    }
    h.panel(462, 22, 170, 334, "VOLUME PROFILE");
    ["DAY", "PREV", "WEEK", "N"].forEach((c, i) => h.pill(472 + i * 38, 54, c, i === 0 ? C.up : C.tile, i === 0 ? C.ink : C.mut, "start", 8));
    let hvn = -1, lvn = -1;
    for (let b = 0; b < NB; b++) if (Math.abs(b - poc) >= 5 && (hvn < 0 || vol[b] > vol[hvn])) hvn = b;
    if (hvn >= 0) { const a = Math.min(poc, hvn), z = Math.max(poc, hvn); for (let b = a + 1; b < z; b++) if (lvn < 0 || vol[b] < vol[lvn]) lvn = b; }
    for (let b = 0; b < NB; b++) {
      const y0 = h.Y(h.lo + (b + 1) * bs), bh = h.Y(h.lo + b * bs) - y0 - 1.5, w = 138 * vol[b] / mx, inVA = b >= lo && b <= hi && full;
      h.rc(472, y0, w, bh, b === poc ? C.gold : inVA ? C.blue : C.mut, null, 2, b === poc ? 1 : inVA ? .75 : .45);
    }
    const tN = S.T0 + S.D + 2.2;
    if (full && t >= tN) {
      const p = h.e(tN, tN + .5);
      if (hvn >= 0 && vol[hvn] > .45 * mx) h.pill(480 + 138 * vol[hvn] / mx, h.Y(mid(hvn)), "HVN", C.up, C.ink, "start", 8, p);
      if (lvn >= 0 && vol[lvn] < .55 * mx) h.pill(480 + 138 * vol[lvn] / mx, h.Y(mid(lvn)), "LVN", C.dn, C.ink, "start", 8, p);
      [["pPOC", pocV - 3.4, "#B197FC"], ["pVAH", vah - 1.6, "#B197FC"], ["pVAL", val - 4.8, "#B197FC"]].forEach(l => { h.hl(l[1], h.x0, lerp(h.x0, h.x1, p), l[2], 1.1, "2 4"); h.tx(h.x1 - 4, h.Y(l[1]) - 3, l[0] + " " + fx(l[1]), l[2], 8.5, "end", 700, p); });
    }
  }
};

/* ---------- Risk Manager Panel ---------- */
SC.risk = {
  dur: 17, still: 14, bar: "Account · capital protection",
  init() { return {}; },
  steps: () => [[.3, "Daily loss, drawdown, profit target and open risk in one dashboard"], [1.6, "Losses build up during the day"], [8.2, "The bar turns amber near the limit"], [10, "Limit reached: positions are closed and trading is locked"]],
  draw(h, t) {
    const u = clamp((t - 1.5) / 8.5), loss = 3 * Math.pow(u, 1.15), locked = t >= 10, near = loss / 3 > .75;
    h.panel(14, 14, 286, 352, "RISK MANAGER");
    h.pill(286, 30, locked ? "LOCKED" : "ACTIVE", locked ? C.dn : C.up, C.ink, "end", 9);
    const rows = [["DAILY LOSS LIMIT", "-" + loss.toFixed(2) + "% / 3.00%", loss / 3, locked ? C.dn : near ? C.gold : C.up],
      ["MAX DRAWDOWN", "-" + (loss * .9).toFixed(2) + "% / 10.00%", loss * .9 / 10, C.up],
      ["PROFIT TARGET", "+" + Math.max(0, 5.1 - loss).toFixed(2) + "% / 8.00%", Math.max(0, 5.1 - loss) / 8, C.blue],
      ["OPEN RISK", locked ? "0.00% of equity" : (1.4 + .1 * Math.sin(t * 2)).toFixed(2) + "% of equity", locked ? 0 : .35 + .02 * Math.sin(t * 2), C.up]];
    rows.forEach((r, i) => {
      const y = 50 + i * 62;
      h.tx(28, y + 14, r[0], C.mut, 9, "start", 700); h.tx(288, y + 14, r[1], C.white, 10.5, "end", 700);
      h.rc(28, y + 24, 260, 14, C.tile, C.pbd, 7); h.rc(28, y + 24, 260 * clamp(r[2]), 14, r[3], null, 7);
    });
    h.tx(28, 312, "AUTO-CLOSE LOCK", C.mut, 9, "start", 700);
    h.tx(288, 312, locked ? "ENGAGED" : "READY", locked ? C.dn : C.up, 10.5, "end", 800);
    h.tx(28, 336, "Daily limit counts from day-start equity", C.mut, 9, "start", 500);

    h.panel(314, 14, 312, 222, "EQUITY TODAY");
    const ey = v => 62 + (100.4 - v) / (100.4 - 96.2) * 150, pts = [];
    for (let i = 0; i <= 60 * u; i++) { const w = i / 60; pts.push([332 + w * 280, ey(100 - 3 * Math.pow(w, 1.15) + .12 * Math.sin(w * 31))]); }
    h.ln(332, ey(97), 612, ey(97), C.dn, 1.3, "6 4"); h.tx(612, ey(97) - 5, "DAILY LIMIT -3.00%", C.dn, 8.5, "end", 700);
    h.ln(332, ey(100), 612, ey(100), C.pbd, 1, "2 4"); h.tx(332, ey(100) - 5, "day start", C.mut, 8.5, "start", 600);
    if (pts.length > 1) { h.poly(pts, locked ? C.dn : C.blue, 2); const p = pts[pts.length - 1]; h.ci(p[0], p[1], 4, locked ? C.dn : C.blue, "#fff", 1, 1.5); }
    if (locked) {
      const a = h.e(10, 10.5);
      h.rc(332, 116, 280, 76, "#2A1020", C.dn, 10, a, 1.5);
      h.g(a, () => {
        h.rc(346, 138, 18, 14, C.dn, null, 3); h.poly([[349, 138], [349, 131], [355, 126], [361, 131], [361, 138]], C.dn, 2.4);
        h.tx(374, 140, "DAILY LOSS LIMIT REACHED", C.white, 11.5, "start", 800); h.tx(374, 158, "Positions closed · trading locked", C.dn, 9.5, "start", 600); h.tx(346, 180, "New trades are blocked until tomorrow", C.mut, 9.5, "start", 500);
      });
    }
    h.panel(314, 246, 312, 120, "POSITION SIZE CALCULATOR");
    [["Risk", "1.0%"], ["Stop loss", "150 pts"], ["Lot", locked ? "-" : "0.67"]].forEach((r, i) => {
      const x = 326 + i * 98; h.tx(x, 282, r[0], C.mut, 9, "start", 700); h.rc(x, 288, 90, 28, C.tile, C.pbd, 7); h.tx(x + 45, 307, r[1], locked && i === 2 ? C.mut : C.white, 12, "middle", 800);
    });
    h.tx(326, 340, locked ? "Calculator disabled while locked" : "Balance $10,000  ·  risk $100  ·  SL 150 pts", C.mut, 9.5, "start", 500);
  }
};

/* ---------- Discipline & Journal Panel ---------- */
SC.journal = {
  dur: 18, still: 15, bar: "Trading discipline · journal",
  init() { return {}; },
  steps: () => [[.5, "Pre-trade checklist before every entry"], [5.2, "All items ticked: ready to trade"], [6.6, "Every trade is logged with rating and screenshot"], [11.5, "Rule hit: trading stops after the loss streak"], [14, "Export the whole journal to CSV"]],
  draw(h, t) {
    h.panel(14, 14, 200, 178, "PRE-TRADE CHECKLIST");
    const items = ["Trend checked on H1", "Key level marked", "Risk under 1%", "Stop loss defined", "News checked"], blocked = t >= 11.6;
    items.forEach((s, i) => {
      const y = 36 + i * 24, on = t >= 1.2 + i * .9 && !blocked, p = h.e(1.2 + i * .9, 1.6 + i * .9);
      h.rc(26, y + 4, 14, 14, on ? C.up : C.tile, on ? C.up : C.pbd, 4, blocked ? .4 : 1);
      if (on) h.poly([[29, y + 11], [32, y + 14], [37, y + 8]], C.ink, 2.2, null, null, p);
      h.tx(48, y + 15, s, on ? C.white : C.mut, 10, "start", 600, blocked ? .4 : 1);
    });
    const ready = t >= 5.2 && !blocked;
    h.rc(24, 158, 180, 24, blocked ? "rgba(255,122,122,.2)" : ready ? "rgba(52,214,160,.2)" : "rgba(242,184,75,.16)", blocked ? C.dn : ready ? C.up : C.gold, 8);
    h.tx(114, 174, blocked ? "BLOCKED" : ready ? "READY TO TRADE" : "NOT READY", blocked ? C.dn : ready ? C.up : C.gold, 10.5, "middle", 800);

    const trades = [[6.8, "BUY", "+$45.00", 4, 1], [9, "SELL", "-$30.00", 2, 0], [11, "BUY", "-$28.00", 1, 0]];
    const done = trades.filter(x => t >= x[0]), losses = t >= 11 ? 2 : t >= 9 ? 1 : 0;
    h.panel(14, 202, 200, 164, "RULES");
    h.tx(26, 240, "Trades today", C.mut, 10, "start", 600); h.tx(202, 240, done.length + " / 3", done.length >= 3 ? C.dn : C.white, 11, "end", 800);
    h.rc(26, 247, 176, 8, C.tile, null, 4); h.rc(26, 247, 176 * done.length / 3, 8, done.length >= 3 ? C.dn : C.blue, null, 4);
    h.tx(26, 282, "Consecutive losses", C.mut, 10, "start", 600); h.tx(202, 282, losses + " / 2", losses >= 2 ? C.dn : C.white, 11, "end", 800);
    h.rc(26, 289, 176, 8, C.tile, null, 4); h.rc(26, 289, 176 * losses / 2, 8, losses >= 2 ? C.dn : C.gold, null, 4);
    h.rc(26, 314, 176, 38, blocked ? "rgba(255,122,122,.2)" : "rgba(52,214,160,.14)", blocked ? C.dn : C.up, 8, 1, blocked ? 1.6 : 1);
    h.tx(114, 338, blocked ? "STOP TRADING" : "OK TO TRADE", blocked ? C.dn : C.up, 13, "middle", 800);

    h.panel(226, 14, 400, 262, "TRADE JOURNAL");
    [["#", 238], ["TRADE", 266], ["RESULT", 372], ["RATING", 450], ["SHOT", 568]].forEach(c => h.tx(c[1], 50, c[0], C.mut, 8.5, "start", 700));
    h.ln(238, 56, 614, 56, C.pbd, 1);
    trades.forEach((x, i) => {
      if (t < x[0]) return;
      const y = 64 + i * 66, a = h.e(x[0], x[0] + .5), win = x[4] === 1;
      h.g(a, () => {
        h.rc(236, y, 380, 58, C.tile, C.pbd, 9);
        h.tx(244, y + 34, String(i + 1), C.white, 12, "start", 800); h.tx(266, y + 26, "XAUUSD " + x[1], C.white, 11, "start", 700); h.tx(266, y + 44, "0.10 lot", C.mut, 9.5, "start", 500);
        h.tx(372, y + 34, x[2], win ? C.up : C.dn, 13, "start", 800);
        for (let s = 0; s < 5; s++) h.tx(450 + s * 17, y + 36, "★", s < x[3] * clamp((t - x[0] - .3) / .6 + .001) ? C.gold : "#2B3F63", 15, "start", 700);
        h.rc(568, y + 10, 40, 38, "#0A1730", C.pbd, 5);
        h.ln(576, y + 38, 584, y + 28, win ? C.up : C.dn, 1.6); h.ln(584, y + 28, 592, y + 34, win ? C.up : C.dn, 1.6); h.ln(592, y + 34, 600, y + 20, win ? C.up : C.dn, 1.6);
      });
    });
    const wr = done.length ? Math.round(done.filter(x => x[4]).length / done.length * 100) : 0, net = done.reduce((s, x) => s + parseFloat(x[2].replace("$", "")), 0);
    h.panel(226, 286, 400, 80, "STATISTICS");
    h.tx(240, 322, "Win rate", C.mut, 9.5, "start", 600); h.tx(240, 346, wr + "%", C.white, 16, "start", 800);
    h.tx(330, 322, "Net P/L", C.mut, 9.5, "start", 600); h.tx(330, 346, (net >= 0 ? "+$" : "-$") + Math.abs(net).toFixed(2), net >= 0 ? C.up : C.dn, 16, "start", 800);
    const press = t >= 14.2 && t < 14.6;
    h.rc(500, 316, 112, 34, press ? C.gold : C.tile, press ? C.gold : C.blue, 9); h.tx(556, 337, "EXPORT CSV", press ? C.ink : C.blue, 10.5, "middle", 800);
    if (t >= 14.4) h.pill(320, 356, "journal.csv saved", C.up, C.ink, "middle", 10, clamp((t - 14.4) / .3));
    h.cur([[12.6, 400, 300, 0], [14.2, 556, 333, 1]]);
  }
};

/* ---------- Trade Quality Monitor ---------- */
SC.quality = {
  dur: 18, still: 15, bar: "Account · execution quality",
  init() { return {}; },
  steps: () => [[.3, "Live spread with average, minimum and maximum"], [6.8, "A spread spike triggers a popup and a push alert"], [2, "Exposure, costs and session breakdown update live"], [13, "Export the full report to CSV"]],
  draw(h, t) {
    const sp = x => .22 + .03 * Math.sin(x * 3.1) + .02 * Math.sin(x * 7.3) + (x > 7 && x < 8.6 ? 1.63 * Math.exp(-Math.pow((x - 7.6) / .35, 2)) : 0);
    h.panel(14, 14, 300, 170, "LIVE SPREAD");
    const cur = sp(t), spike = t >= 7 && t < 9;
    h.tx(26, 56, cur.toFixed(2), spike ? C.dn : C.white, 24, "start", 800); h.tx(110, 54, "pts", C.mut, 10, "start", 600);
    if (spike) h.rc(14, 14, 300, 170, "none", C.dn, 10, .5 + .5 * Math.sin(t * 12), 2);
    const pts = []; for (let i = 0; i < 46; i++) pts.push([26 + i * 6, 140 - Math.min(1, sp(t - (45 - i) * .2) / 1.9) * 62]);
    h.ln(26, 140, 302, 140, C.pbd, 1); h.poly(pts, spike ? C.dn : C.blue, 1.8);
    const mxv = t >= 7.6 ? 1.85 : .27;
    [["AVG", t >= 7.6 ? "0.29" : "0.23"], ["MIN", "0.17"], ["MAX", fx(mxv)]].forEach((s, i) => { h.tx(26 + i * 96, 160, s[0], C.mut, 9, "start", 700); h.tx(52 + i * 96, 160, s[1], i === 2 && t >= 7.6 ? C.dn : C.white, 10.5, "start", 700); });
    h.panel(326, 14, 300, 170, "EXPOSURE");
    const fl = 84.12 + 6 * Math.sin(t * 1.4);
    [["Open positions", "3", C.white], ["Long lots", "0.40", C.white], ["Short lots", "0.10", C.white], ["Net lots", "+0.30", C.up], ["Floating P/L", (fl >= 0 ? "+$" : "-$") + Math.abs(fl).toFixed(2), C.up]].forEach((r, i) => { h.tx(340, 52 + i * 24, r[0], C.mut, 10.5, "start", 600); h.tx(612, 52 + i * 24, r[1], r[2], 11.5, "end", 700); });
    h.panel(14, 194, 300, 172, "SESSION BREAKDOWN");
    [["ASIA", 32, C.up], ["LONDON", 118, C.up], ["NEW YORK", -46, C.dn]].forEach((s, i) => {
      const y = 226 + i * 40, p = h.e(2 + i * .5, 4 + i * .5), w = Math.abs(s[1]) / 120 * 110 * p;
      h.tx(26, y + 15, s[0], C.mut, 9.5, "start", 700);
      h.rc(104, y + 3, 150, 18, C.tile, null, 5);
      h.rc(s[1] >= 0 ? 104 : 104 + 50 - w * .45, y + 3, s[1] >= 0 ? w * .62 : w * .45, 18, s[2], null, 5);
      h.tx(302, y + 16, (s[1] >= 0 ? "+$" : "-$") + Math.abs(Math.round(s[1] * p)), s[2], 11, "end", 800);
    });
    h.panel(326, 194, 300, 172, "COSTS AND EXECUTION");
    const hh = 14 * 3600 + 32 * 60 + 8 + t;
    [["Commission", "$12.40"], ["Swap", "-$3.10"], ["Avg slippage", "0.4 pts"], ["Ticks / min", String(Math.round(214 + 12 * Math.sin(t * 2)))], ["Server time", pad2(hh / 3600) + ":" + pad2(hh % 3600 / 60) + ":" + pad2(hh % 60)]].forEach((r, i) => { h.tx(340, 230 + i * 22, r[0], C.mut, 10.5, "start", 600); h.tx(612, 230 + i * 22, r[1], C.white, 11, "end", 700); });
    const press = t >= 13.2 && t < 13.6;
    h.rc(500, 336, 116, 24, press ? C.gold : C.tile, press ? C.gold : C.blue, 8); h.tx(558, 352, "EXPORT CSV", press ? C.ink : C.blue, 9.5, "middle", 800);
    if (t >= 13.4) h.pill(470, 322, "trades.csv exported", C.up, C.ink, "end", 9.5, clamp((t - 13.4) / .3));
    if (t >= 7.2) { const by = lerp(-44, 22, h.e(7.2, 7.6)); h.g(t < 10.4 ? 1 : clamp(1 - (t - 10.4) / .4), () => { h.rc(150, by, 340, 40, "#2A1020", C.dn, 10, 1, 1.4); h.tx(166, by + 17, "SPREAD SPIKE  1.85 pts", C.white, 11.5, "start", 800); h.tx(166, by + 32, "popup shown · push notification sent", C.dn, 9.5, "start", 600); }); }
    h.cur([[11.8, 400, 300, 0], [13.2, 558, 348, 1]]);
  }
};

/* ---------- Telegram Notifier Panel ---------- */
SC.telegram = {
  dur: 19, still: 16.5, bar: "XAUUSD, M1 · trade alerts to Telegram",
  init() {
    const cs = walk(4000, [[8, 4000.4], [8, 4004], [6, 4003], [6, 4007.5], [6, 4012]], 91, .5, .5), n = cs.length, T0 = .5, D = 14.5;
    const kOf = t => n * clamp((t - T0) / D), tOf = i => T0 + D * (i + .5) / n, ei = Math.floor(kOf(3.4)), pe = priceAt(cs, kOf(3.4));
    const bi = crossUp(cs, pe + 3, ei + 1), ti = crossUp(cs, pe + 6, ei + 1), tBE = tOf(bi), tTP = tOf(ti);
    const msgs = [
      { t: 3.7, side: "bot", tag: "TRADE OPENED", col: C.up, lines: ["BUY XAUUSD  0.10 lot", "Entry " + fx(pe), "SL " + fx(pe - 1.5) + "  ·  TP " + fx(pe + 6)], shot: true, hh: 112 },
      { t: tBE + .2, side: "bot", tag: "SL MODIFIED", col: C.gold, lines: ["Stop loss moved to break even", fx(pe)], hh: 62 },
      { t: tTP + .2, side: "bot", tag: "TRADE CLOSED", col: C.up, lines: ["Take profit hit  +$60.00", "XAUUSD BUY 0.10 lot"], hh: 62 },
      { t: tTP + 2.8, side: "me", lines: ["/status"], hh: 30 },
      { t: tTP + 3.8, side: "bot", tag: "ACCOUNT STATUS", col: C.blue, lines: ["Balance  $10,060.00", "Open positions  0", "Today  +$60.00"], hh: 80 }];
    return { cs, n, T0, D, kOf, tOf, ei, pe, bi, ti, tBE, tTP, msgs };
  },
  steps: S => [[.3, "Connect once and every trade event is sent to Telegram"], [3.4, "Trade opens: message with a chart screenshot"], [S.tBE, "Stop loss changes are reported"], [S.tTP, "Close and profit are reported"], [S.tTP + 2.8, "Ask the bot: /status, /positions or /today"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 332; const pe = S.pe, TP = pe + 6, SL0 = pe - 1.5;
    h.range(S.cs.concat([{ h: TP + 1, l: SL0 - 1 }]), .05); h.grid(5, "in");
    const k = S.kOf(t); h.candles(S.cs, k);
    const X = h.X, Y = h.Y, opened = t >= 3.4, be = t >= S.tBE, closed = t >= S.tTP, xe = X(S.ei), xc = closed ? X(S.ti) : h.x1;
    if (opened) {
      const sl = be ? pe : SL0;
      h.rc(xe, Y(TP), xc - xe, Y(pe) - Y(TP), "rgba(52,214,160,.1)"); h.rc(xe, Y(pe), xc - xe, Y(sl) - Y(pe), "rgba(255,122,122,.12)");
      h.hl(pe, xe, xc, C.white, 1.5); h.hl(sl, xe, xc, C.red, 1.8); h.hl(TP, xe, xc, C.gold, 1.4, "3 4");
      h.pill(xe + 2, Y(pe) + 20, "BUY " + fx(pe), C.up, C.ink, "start", 9);
      if (closed) { h.ci(X(S.ti), Y(TP), 5, C.gold, "#fff", 1, 2); h.pill(X(S.ti) - 8, Y(TP) + 20, "+$60", C.gold, C.ink, "end", 9.5); }
    }
    h.hl(priceAt(S.cs, k), h.x0, h.x1, "#fff", 1, "2 4", .3);
    /* phone */
    h.rc(348, 14, 280, 352, "#0B1830", C.pbd, 24, 1, 1.5);
    h.rc(349, 15, 278, 46, "#12264A", null, 23);
    h.ci(376, 38, 14, "#2AABEE"); h.poly([[369, 38], [383, 32], [379, 45], [375, 41]], "#fff", 1.6, null, "#fff");
    h.tx(398, 35, "GoldBot Notifier", C.white, 12, "start", 800); h.tx(398, 50, "bot · online", C.up, 9, "start", 600);
    h.rc(348, 64, 280, 290, "none");
    h.o.push(`<clipPath id="chatClip"><rect x="352" y="64" width="272" height="290"/></clipPath><g clip-path="url(#chatClip)">`);
    const vis = S.msgs.map(m => h.e(m.t, m.t + .45)); let acc = 0;
    for (let i = S.msgs.length - 1; i >= 0; i--) {
      const m = S.msgs[i], p = vis[i]; acc += p * (m.hh + 8);
      if (p <= 0) continue;
      const y = 348 - acc + 8 + (1 - p) * 14, bx = m.side === "me" ? 506 : 362, bw = m.side === "me" ? 110 : 238;
      h.rc(bx, y, bw, m.hh, m.side === "me" ? "#2B6FD6" : "#17325C", null, 12, p);
      h.g(p, () => {
        let ty = y + 18;
        if (m.tag) { h.tx(bx + 12, ty, m.tag, m.col, 9, "start", 800); ty += 16; }
        m.lines.forEach(l => { h.tx(bx + 12, ty, l, C.white, 10.5, "start", 600); ty += 15; });
        if (m.shot) { h.rc(bx + 12, y + m.hh - 32, 100, 24, "#0A1730", C.pbd, 4); h.ln(bx + 20, y + m.hh - 14, bx + 40, y + m.hh - 22, C.up, 1.6); h.ln(bx + 40, y + m.hh - 22, bx + 62, y + m.hh - 16, C.dn, 1.6); h.ln(bx + 62, y + m.hh - 16, bx + 92, y + m.hh - 28, C.up, 1.6); h.tx(bx + 120, y + m.hh - 15, "chart.png", C.mut, 8.5, "start", 600); }
      });
    }
    h.o.push("</g>");
  }
};

/* ---------- Visual RR Panel ---------- */
SC.visualrr = {
  dur: 19, still: 16.5, bar: "XAUUSD, M5 · plan the trade on the chart",
  init() {
    const cs = walk(4000, [[10, 4000.2], [8, 3998.6], [8, 4001.5]], 121, .5, .5), n1 = cs.length, P = cs[n1 - 1].c;
    walk(cs, [[5, P + 2.2], [3, P + 1.2], [6, P + 9.5]], 122, .5, .5);
    const n = cs.length, ti = crossUp(cs, P + 9, n1);
    return { cs, n, n1, P, ti, tTP: 10.6 + 4.4 * (ti + .5 - n1) / (n - n1) };
  },
  steps: S => [[.3, "Price action loads"], [3.3, "NEW LONG drops entry, stop loss and take profit lines"], [4.9, "Drag the lines: lot, risk, reward and RR update live"], [10.1, "One click places the order"], [S.tTP, "Price reaches the take profit"]],
  draw(h, t, S) {
    h.n = S.n; h.x1 = 420; const P = S.P;
    h.range(S.cs.concat([{ h: P + 10.5, l: P - 4 }]), .05); h.grid(5, "in");
    const k = t < 10.6 ? S.n1 * h.e(.3, 3) : S.n1 + (S.n - S.n1) * clamp((t - 10.6) / 4.4);
    h.candles(S.cs, k);
    const X = h.X, Y = h.Y, tpD = lerp(3, 9, h.e(5, 7)), slD = lerp(3, 2, h.e(7.6, 9.2)), lot = 100 / (slD * 100), placed = t >= 10.2, show = t >= 3.4, ex = X(S.n1 - 1), hx = h.x1 - 46;
    if (show) {
      h.rc(ex, Y(P + tpD), h.x1 - ex, Y(P) - Y(P + tpD), "rgba(52,214,160,.18)"); h.rc(ex, Y(P), h.x1 - ex, Y(P - slD) - Y(P), "rgba(255,122,122,.18)");
      h.hl(P, ex, h.x1, C.white, 1.6); h.hl(P + tpD, ex, h.x1, C.up, 1.6); h.hl(P - slD, ex, h.x1, C.dn, 1.6);
      h.pill(ex + 4, Y(P + tpD) + 14, "TAKE PROFIT", C.up, C.ink, "start", 8.5); h.pill(ex + 4, Y(P - slD) - 14, "STOP LOSS", C.dn, C.ink, "start", 8.5);
      h.pill(ex + 4, Y(P) - 13, placed ? "BUY " + fx(P) : "ENTRY " + fx(P), C.white, C.ink, "start", 8.5);
      [P + tpD, P - slD].forEach(v => { h.rc(hx - 7, Y(v) - 7, 14, 14, C.pan, C.white, 4, 1, 1.6); });
      h.pill(h.x1 - 8, Y(P + tpD / 2), "RR 1 : " + (tpD / slD).toFixed(1), C.gold, C.ink, "end", 10);
    }
    if (placed) h.ci(ex, Y(P), 5, C.white, C.up, 1, 2);
    if (t >= S.tTP) { h.ci(X(S.ti), Y(P + 9), 5, C.gold, "#fff", 1, 2); h.pill(X(S.ti) - 10, Y(P + 9) + 20, "TP HIT  +$" + (tpD * lot * 100).toFixed(0), C.gold, C.ink, "end", 9.5); }
    h.hl(priceAt(S.cs, k), h.x0, h.x1, "#fff", 1, "2 4", .3);
    h.panel(434, 22, 198, 334, "VISUAL RR PANEL");
    const flash = a => t >= a && t < a + .4;
    h.rc(444, 40, 84, 28, flash(3.4) ? C.up : "rgba(52,214,160,.2)", C.up, 8); h.tx(486, 58, "NEW LONG", flash(3.4) ? C.ink : C.up, 9.5, "middle", 800);
    h.rc(536, 40, 86, 28, "rgba(255,122,122,.14)", C.dn, 8); h.tx(579, 58, "NEW SHORT", C.dn, 9.5, "middle", 800);
    h.rc(444, 76, 84, 22, C.tile, C.pbd, 6); h.tx(486, 91, "FLIP", C.mut, 9, "middle", 700); h.rc(536, 76, 86, 22, C.tile, C.pbd, 6); h.tx(579, 91, "REMOVE", C.mut, 9, "middle", 700);
    const rows = show ? [["Lot", lot.toFixed(2)], ["Risk", "$100  (1.0%)"], ["Reward", "$" + (tpD * lot * 100).toFixed(0)], ["RR", "1 : " + (tpD / slD).toFixed(2)], ["Margin", "$" + (lot * P).toFixed(0)]] : [["Lot", "-"], ["Risk", "-"], ["Reward", "-"], ["RR", "-"], ["Margin", "-"]];
    rows.forEach((r, i) => { const y = 124 + i * 36; h.rc(444, y - 18, 178, 30, C.tile, C.pbd, 7); h.tx(456, y + 1, r[0], C.mut, 10, "start", 600); h.tx(612, y + 1, r[1], i === 3 ? C.gold : C.white, 12, "end", 800); });
    const press = flash(10.2);
    h.rc(444, 312, 178, 34, placed ? C.up : press ? C.gold : C.blue, null, 9, show ? 1 : .35); h.tx(533, 334, placed ? "ORDER PLACED" : "PLACE ORDER", C.ink, 11, "middle", 800, show ? 1 : .5);
    h.cur([[2.6, 540, 300, 0], [3.4, 486, 54, 1], [4.6, hx, Y(P + 3), 0], [5, hx, Y(P + 3), 1], [7, hx, Y(P + 9), 0], [7.6, hx, Y(P - 3), 1], [9.2, hx, Y(P - 2), 0], [10.2, 533, 329, 1]]);
  }
};

/* ---------- Buy Stop and Sell Stop Expert: drawn by the hero chart code in app.js ---------- */
SC.stopreverse = {
  external: true, bar: "XAUUSD, M5 · stop-and-reverse",
  stepList: [[0, "Buy Stop and Sell Stop are placed around the price"], [1, "Price breaks up: the Buy Stop triggers and the BUY opens"], [2, "Sell Stop and stop loss trail behind the price"], [3, "Price reverses: the Sell Stop triggers and the SELL opens"], [4, "Buy Stop and stop loss trail above the price until the target"]]
};

/* ==========================================================
   WHICH SCENE BELONGS TO WHICH PRODUCT
   ========================================================== */
const BY_ID = {
  "quick-chart-16-symbols": "quickchart", "buy-stop-sell-stop-expert": "stopreverse", "live-timeframe-candles": "timeframes",
  "5-buystop-5-sellstop": "grid", "tradingview-tools-mt5": "tvtools", "fvg-expert": "fvg", "smc-map": "smc", "limit-order-expert": "limit",
  "tf-session-levels": "sessions", "trade-quality-monitor": "quality", "alert-manager-panel": "alerts", "auto-structure-fibo-panel": "structure",
  "chart-analysis-panel": "chartpanel", "discipline-journal-panel": "journal", "market-scanner-panel": "scanner", "news-calendar-panel": "news",
  "quick-trade-panel": "quick", "risk-manager-panel": "risk", "telegram-notifier-panel": "telegram", "visual-rr-panel": "visualrr", "volume-profile-panel": "volume"
};
const BY_TAG = { "Expert Advisor": "fvg", "Chart tool": "tvtools", "Trade manager": "quick", "Utility": "telegram" };

function keyFor(p) { const k = p.demo || BY_ID[p.id] || BY_TAG[p.tag]; return SC[k] ? k : null; }

/* ---------- player ---------- */
function frame(sc, S, t) {
  const h = mkH(t);
  sc.draw(h, t, S);
  const a = clamp(Math.min(t / .35, (sc.dur - t) / .5));
  return `<g opacity="${q(a)}">${h.o.join("")}</g>`;
}
function stepsOf(sc, S) { return (sc.external ? sc.stepList : sc.steps(S)).slice().sort((a, b) => a[0] - b[0]); }

/* root holds an <svg> and an <ol class="demo-steps">. Returns { bar, setStep } for scenes drawn elsewhere, else starts the loop. */
function mount(root, key) {
  const sc = SC[key]; if (!sc) return null;
  const svg = root.querySelector("svg"), list = root.querySelector(".demo-steps");
  const S = sc.init ? sc.init() : null, steps = stepsOf(sc, S);
  list.innerHTML = steps.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s[1])}</span></li>`).join("");
  const lis = [...list.children]; let last = -2;
  const setStep = a => { if (a === last) return; last = a; lis.forEach((li, i) => { li.classList.toggle("on", i === a); li.classList.toggle("done", i < a); }); };
  if (sc.external) return { external: true, bar: sc.bar, setStep };
  const draw = t => { svg.innerHTML = frame(sc, S, t); let a = -1; steps.forEach((s, i) => { if (t >= s[0]) a = i; }); setStep(a); };
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { draw(sc.still); return { bar: sc.bar }; }
  let t0 = performance.now(), visible = true, last_t = 0;
  draw(0);
  if ("IntersectionObserver" in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) t0 = performance.now() - last_t * 1000; }).observe(svg);
  setInterval(() => { if (!visible || document.hidden) { t0 = performance.now() - last_t * 1000; return; } last_t = ((performance.now() - t0) / 1000) % sc.dur; draw(last_t); }, 50);
  return { bar: sc.bar };
}

window.GBDemos = {
  keyFor, mount, scenes: SC,
  bar: key => SC[key] && SC[key].bar,
  svgAt(key, t) { const sc = SC[key], S = sc.init ? sc.init() : null; return frame(sc, S, t); },
  dur: key => SC[key].dur, still: key => SC[key].still,
  stepTimes(key) { const sc = SC[key], S = sc.init ? sc.init() : null; return stepsOf(sc, S); }
};
})();