/* IntelliSpell engine: tokenizing, dictionary lookup and suggestions. Works in browsers and Node. */
(function (root) {
"use strict";
var TOK = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu,
    SKIP = /https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|[#@]\w+/g,   // URLs, e-mails, #tags, @mentions
    CT = { s: 1, t: 1, re: 1, ve: 1, ll: 1, d: 1, m: 1 };
function norm(w) { return w.toLowerCase().replace(/’/g, "'"); }
function plain(w) { return w.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function cap(w) { return w[0].toUpperCase() + w.slice(1); }
function matchCase(src, w) {
  if (src.length > 1 && src === src.toUpperCase()) return w.toUpperCase();
  return src[0] !== src[0].toLowerCase() ? cap(w) : w;
}
function mask(w) { var m = 0, i, c; for (i = 0; i < w.length; i++) { c = w.charCodeAt(i) - 97; m |= 1 << (c >= 0 && c < 26 ? c : 26); } return m; }
function pop(x) { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; }
// Damerau-Levenshtein with early exit once the distance must exceed `max`
function dist(a, b, max) {
  var n = a.length, m = b.length, p2 = [], p1 = [], c, i, j, x, t, lo;
  if (Math.abs(n - m) > max) return max + 1;
  for (j = 0; j <= m; j++) p1[j] = j;
  for (i = 1; i <= n; i++) {
    c = [i]; lo = i;
    for (j = 1; j <= m; j++) {
      x = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      t = Math.min(p1[j] + 1, c[j - 1] + 1, p1[j - 1] + x);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) t = Math.min(t, p2[j - 2] + 1);
      c[j] = t; if (t < lo) lo = t;
    }
    if (lo > max) return max + 1;
    p2 = p1; p1 = c;
  }
  return p1[m];
}
// x = ignore (digits / non-Latin), s = single letter, l = lower, c = Capitalized, u = ALL CAPS, m = mixed (iPhone, McDonald)
function kind(w) {
  if (/\p{N}/u.test(w) || !/\p{Script=Latin}/u.test(w)) return "x";
  if (w.length < 2) return "s";
  if (w === w.toLowerCase()) return "l";
  if (w[0] !== w[0].toLowerCase() && w.slice(1) === w.slice(1).toLowerCase()) return "c";
  return w === w.toUpperCase() ? "u" : "m";
}
function sentenceStart(t, i) {
  var j = i - 1;
  while (j >= 0 && /[\s"'“‘(\[]/.test(t[j])) { if (t[j] === "\n") return true; j--; }
  return j < 0 || /[.!?:]/.test(t[j]);
}

function create(D) {
  var base = D.words.filter(Boolean), proper = new Set(D.proper), IDX = new Map(), MASK = new Int32Array(base.length),
      BY = [], custom = Object.create(null), cache = new Map(), i, l;
  for (i = 0; i < base.length; i++) { l = base[i].length; IDX.set(base[i], i); MASK[i] = mask(base[i]); (BY[l] = BY[l] || []).push(i); }

  function ok(w, k) {
    var lw = norm(w), st;
    if (custom[lw] || IDX.has(lw)) return true;
    if (k !== "l" && proper.has(lw)) return true;
    st = plain(lw);
    if (st !== lw && (IDX.has(st) || (k !== "l" && proper.has(st)))) return true;
    if (lw.indexOf("'") > -1) {
      var p = lw.split("'");
      if (p.length !== 2 || !CT[p[1]]) return false;
      if (p[1] === "t") return /^(can|won|shan|ain)$/.test(p[0]) || (/n$/.test(p[0]) && ok(p[0].slice(0, -1), k));
      return ok(p[0], k);
    }
    return false;
  }
  function scan(t, o) {
    o = o || {};
    var skips = [], out = [], total = 0, si = 0, m;
    SKIP.lastIndex = 0; while ((m = SKIP.exec(t))) skips.push([m.index, m.index + m[0].length]);
    TOK.lastIndex = 0;
    while ((m = TOK.exec(t))) {
      var w = m[0], s = m.index, k = kind(w);
      while (si < skips.length && skips[si][1] <= s) si++;
      if (si < skips.length && s >= skips[si][0]) continue;
      if (k === "x") continue;
      total++;
      if (k === "s" || k === "m" || (k === "u" && w.length < 6)) continue;
      if (o.ignored && o.ignored[norm(w)]) continue;
      if (ok(w, k)) continue;
      if (k === "c" && o.skipNames && !sentenceStart(t, s)) continue;
      out.push({ w: w, s: s, e: s + w.length });
    }
    return { bad: out, total: total };
  }
  function raw(lw) {
    var L = lw.length, max = L <= 3 ? 1 : L <= 8 ? 2 : 3, qm = mask(lw), res = [], ids, c, d, j, a, b;
    if (proper.has(lw)) res.push({ w: cap(lw), d: 0, r: -1, keep: 1 });
    for (l = Math.max(1, L - max); l <= L + max; l++) {
      ids = BY[l]; if (!ids) continue;
      for (j = 0; j < ids.length; j++) {
        c = ids[j];
        if (pop(MASK[c] ^ qm) > 2 * max) continue;
        d = dist(lw, base[c], max);
        if (d <= max) res.push({ w: base[c], d: d, r: c });
      }
    }
    for (j = 1; j < L && L >= 4; j++) {          // missing space: "alot" -> "a lot"
      a = lw.slice(0, j); b = lw.slice(j);
      if (IDX.get(a) < 3000 && IDX.get(b) < 3000 && (a.length > 2 || /^(a|i|in|on|of|at|to|so|no|as|is|it|or|an|be|by|do|go|he|if|me|my|up|us|we)$/.test(a)) && b.length > 2)
        res.push({ w: a + " " + b, d: a.length === 1 ? 0.5 : 1.5, split: 1, r: Math.max(IDX.get(a), IDX.get(b)) });
    }
    res.sort(function (x, y) { return x.d - y.d || x.r - y.r; });
    var top = res.slice(0, 3), sp = res.filter(function (x) { return x.split; })[0];   // always show the best "split" idea
    if (sp && top.indexOf(sp) < 0) top[2] = sp;
    return top;
  }
  function suggest(word) {
    var lw = norm(word), r = cache.get(lw);
    if (!r) { r = raw(lw); cache.set(lw, r); }
    return r.map(function (x) { return x.keep ? x.w : matchCase(word, x.w); });
  }
  function addWord(w) { custom[norm(w)] = 1; cache.clear(); }
  return { scan: scan, suggest: suggest, addWord: addWord, known: function (w) { return ok(w, kind(w)); }, matchCase: matchCase };
}
var api = { create: create };
if (typeof module === "object" && module.exports) module.exports = api; else root.IntelliSpellEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
