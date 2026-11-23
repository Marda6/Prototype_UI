/* ENCY · YouTube covers
   One template for every video: the left panel is fixed — logo, rule, title, the bottom line —
   only the words change; the right side takes a picture (or four) that the user drops in, moves and zooms.
   A second variant has no picture: the brand's diagonal bands of light instead (stripes).
   The cover is a canvas: the preview, the feed thumbnails and the PNG are the same drawing (render). */
(function(){
  'use strict';

  var W = 1280, H = 720;
  var CAP = 0.727;                       // Inter's cap height, in ems

  /* ---- the template: measured on the six covers that were sent, then made the same for all ---- */
  var T = {
    bg: '#0f151a', ink: '#ffffff', accent: '#00cb9a', sub: 'rgba(255,255,255,.82)',
    empty: '#141b21',                    // a place with no picture yet
    pad: 56,                             // left edge of the logo, the title and the bottom line
    logo: {x: 56, y: 45, h: 38},         // 171 × 38, as on the covers that were sent
    rule: {y: 120, h: 2, color: 'rgba(255,255,255,.10)'},
    edge: {top: 650, bottom: 550},       // the slant: its x at the top and at the bottom of the cover
    gapEdge: 40,                         // text stays this far from the slant
    // the block is anchored to the bottom: the bottom line never moves, the title grows upwards
    title: {family: '"Inter Tight", "Inter", system-ui, sans-serif', weight: 800, max: 100, min: 56,
            lh: 0.98, track: -0.01, base: 500, top: 168},
    subt: {family: '"Inter", system-ui, sans-serif', weight: 500, size: 30, lh: 40, base: 598, lines: 2}
  };
  function ex(y){ return T.edge.top + (T.edge.bottom - T.edge.top) * y / H; }   // the slant's x at y

  var $ = function(id){ return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');
  var off = document.createElement('canvas'); off.width = W; off.height = H;
  var offCtx = off.getContext('2d');
  var mctx = document.createElement('canvas').getContext('2d');                 // measuring only
  var LS = 'letterSpacing' in mctx;
  var fTitle = $('fTitle'), fSub = $('fSub'), file = $('file');

  /* ---- state: words and framing in localStorage, pictures in IndexedDB ---- */
  var KEY = 'ency.cover';
  function view0(){ return {zoom: 1, cx: .5, cy: .5}; }
  // the stripes variant: the bands' angle, where the first band's edge meets the cover's bottom (x) and how far it may go
  var SB = {angle: 44, x: 480, min: 380, max: 820, cv: null};
  var st = {title: 'Extension\nStore', sub: 'Build CAM tools with AI', style: 'photo', sx: SB.x, layout: 1, guides: false,
            views: [view0(), view0(), view0(), view0()]};
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) {
      ['title', 'sub', 'layout', 'guides'].forEach(function(k){ if (saved[k] != null) st[k] = saved[k]; });
      if (saved.style === 'stripes') st.style = 'stripes';
      if (isFinite(saved.sx)) st.sx = Math.max(SB.min, Math.min(SB.max, +saved.sx));
      (saved.views || []).forEach(function(v, i){ if (v && i < 4) st.views[i] = {zoom: +v.zoom || 1, cx: +v.cx || .5, cy: +v.cy || .5}; });
    }
  } catch (e) {}
  var saveT = 0;
  function save(){ clearTimeout(saveT); saveT = setTimeout(function(){
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }, 200); }

  var imgs = [null, null, null, null];   // {img, url} per place
  var logo = null;                       // {img, url} — the user's own logo file
  var sel = 0, hoverAt = -1, dropAt = -1, drag = null, pickFor = 0;

  var db = null;
  function idb(){
    if (!db) db = new Promise(function(res, rej){
      var r = indexedDB.open('ency-cover', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('img'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    });
    return db;
  }
  function idbPut(k, v){
    return idb().then(function(d){ return new Promise(function(res){
      var tx = d.transaction('img', 'readwrite'), s = tx.objectStore('img');
      if (v == null) s.delete(k); else s.put(v, k);
      tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
    }); }).catch(function(){});
  }
  function idbGet(k){
    return idb().then(function(d){ return new Promise(function(res){
      var rq = d.transaction('img').objectStore('img').get(k);
      rq.onsuccess = function(){ res(rq.result || null); };
      rq.onerror = function(){ res(null); };
    }); }).catch(function(){ return null; });
  }

  /* ---- text: *accent* marks, wrapping, the title's size ---- */
  // → paragraphs → words → pieces {t, acc}; an accent may run over several words and lines
  function parse(text){
    var acc = false, paras = [];
    String(text || '').split('\n').forEach(function(line){
      var words = [], word = null;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '*') { acc = !acc; continue; }
        if (/\s/.test(ch)) { word = null; continue; }
        if (!word) { word = []; words.push(word); }
        var last = word[word.length - 1];
        if (last && last.acc === acc) last.t += ch; else word.push({t: ch, acc: acc});
      }
      if (words.length) paras.push(words);
    });
    return paras;
  }
  function plain(text){ return String(text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }

  function F(family, weight, size, track){
    return {font: weight + ' ' + size + 'px ' + family, track: (track * size).toFixed(2) + 'px', size: size};
  }
  var mcache = new Map();
  function mw(f, t){
    var k = f.font + '|' + t, v = mcache.get(k);
    if (v == null) {
      mctx.font = f.font; if (LS) mctx.letterSpacing = f.track;
      v = mctx.measureText(t).width; mcache.set(k, v);
    }
    return v;
  }
  function wordW(f, word){ var w = 0; word.forEach(function(p){ w += mw(f, p.t); }); return w; }
  // greedy wrap; avail(i) = the room of line i; ok = no line wider than its room
  function wrap(f, paras, avail){
    var lines = [], ok = true, sp = mw(f, ' ');
    paras.forEach(function(words){
      var line = [], w = 0;
      words.forEach(function(word){
        var ww = wordW(f, word), room = avail(lines.length);
        if (line.length && w + sp + ww > room) { lines.push(line); line = [word]; w = ww; room = avail(lines.length); }
        else { w += (line.length ? sp : 0) + ww; line.push(word); }
        if (w > room) ok = false;
      });
      lines.push(line);
    });
    return {lines: lines, ok: ok};
  }
  // the room of a line whose baseline is at y: from the left edge to the slant
  function roomAt(y){ return ex(y) - T.gapEdge - T.pad; }
  // The title stands on its last line, so a line's room depends on how many lines there are (the slant
  // gives the upper ones more). Try n lines, wrap with their rooms, and take the first n that comes true.
  function wrapTitle(f, lh, paras){
    var tt = T.title;
    function rooms(n){ return function(i){ return roomAt(tt.base - Math.max(0, n - 1 - i) * lh); }; }
    for (var n = paras.length; n <= paras.length + 4; n++) {
      var w = wrap(f, paras, rooms(n));
      if (w.lines.length === n) return w;
      if (w.lines.length < n) { var v = wrap(f, paras, rooms(w.lines.length)); if (v.lines.length === w.lines.length) return v; }
    }
    return wrap(f, paras, function(){ return roomAt(tt.base); });
  }
  // the title keeps its largest size while it fits: wrap first, shrink only when a word or the height asks
  function layTitle(text){
    var paras = parse(text), tt = T.title, r = null;
    for (var s = tt.max; s >= tt.min; s -= 2) {
      var f = F(tt.family, tt.weight, s, tt.track), lh = Math.round(s * tt.lh), w = wrapTitle(f, lh, paras);
      var top = tt.base - (w.lines.length - 1) * lh - s * CAP;
      r = {f: f, lh: lh, lines: w.lines, size: s, fit: w.ok && top >= tt.top};
      if (r.fit) break;
    }
    return r;
  }
  function laySub(text){
    var ts = T.subt, f = F(ts.family, ts.weight, ts.size, 0);
    var w = wrap(f, parse(text), function(i){ return roomAt(ts.base + ts.lh * Math.min(i, ts.lines - 1)); });
    var over = w.lines.length > ts.lines;
    if (over) {
      w.lines = w.lines.slice(0, ts.lines);
      var lastLine = w.lines[ts.lines - 1], lastWord = lastLine[lastLine.length - 1];
      lastLine[lastLine.length - 1] = lastWord.concat([{t: '…', acc: lastWord[lastWord.length - 1].acc}]);
    }
    return {f: f, lh: ts.lh, lines: w.lines, over: over, fit: w.ok};
  }
  var lay = {key: null, t: null, s: null};
  function layout(){
    var key = st.title + '\u0000' + st.sub;
    if (lay.key !== key) lay = {key: key, t: layTitle(st.title), s: laySub(st.sub)};
    return lay;
  }
  function drawLines(c, l, x, base, ink){
    c.font = l.f.font; if (LS) c.letterSpacing = l.f.track;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    var sp = mw(l.f, ' ');
    l.lines.forEach(function(line, i){
      var cx = x, y = base + i * l.lh;
      line.forEach(function(word, j){
        if (j) cx += sp;
        word.forEach(function(p){ c.fillStyle = p.acc ? T.accent : ink; c.fillText(p.t, cx, y); cx += mw(l.f, p.t); });
      });
    });
    if (LS) c.letterSpacing = '0px';
  }

  /* ---- the logo: ENCY's wordmark as given by the designer ("Vector (Stroke).svg", 1080 × 240, one path,
     gradient #00CB9A → #1269D9); drawn as a path, so it is sharp at any size. A file can replace it. ---- */
  var LOGO = {w: 1080, h: 240, from: '#00cb9a', to: '#1269d9', path: null,
    d: 'M280 120C280 53.7258 333.726 -3.8147e-06 400 0C466.274 3.8147e-06 520 53.7258 520 120V220C520 231.046 511.046 240 500 240C488.954 240 480 231.046 480 220V120C480 75.8172 444.183 40 400 40C355.817 40 320 75.8172 320 120V220C320 231.046 311.046 240 300 240C288.954 240 280 231.046 280 220V120Z' +
       'M0 120C0 53.7258 53.7258 3.8147e-06 120 3.8147e-06H200.201C222.181 3.8147e-06 240 17.8186 240 39.799C240 50.3543 235.807 60.4774 228.343 67.9412L162.142 134.142C154.332 141.953 141.668 141.953 133.858 134.142C126.047 126.332 126.047 113.668 133.858 105.858L199.716 40H120C75.8172 40 40 75.8172 40 120C40 164.183 75.8172 200 120 200H220C231.046 200 240 208.954 240 220C240 231.046 231.046 240 220 240H120C53.7258 240 0 186.274 0 120Z' +
       'M560 120C560 53.7258 613.726 3.8147e-06 680 3.8147e-06H780C791.046 3.8147e-06 800 8.95431 800 20C800 31.0457 791.046 40 780 40H680C635.817 40 600 75.8172 600 120C600 164.183 635.817 200 680 200H780C791.046 200 800 208.954 800 220C800 231.046 791.046 240 780 240H680C613.726 240 560 186.274 560 120Z' +
       'M1060 1.14441e-05C1071.05 1.14441e-05 1080 8.95432 1080 20V120C1080 186.274 1026.27 240 960 240H860C848.954 240 840 231.046 840 220C840 208.954 848.954 200 860 200H960C1004.18 200 1040 164.183 1040 120V20C1040 8.95432 1048.95 1.14441e-05 1060 1.14441e-05Z' +
       'M845.858 5.85788C853.668 -1.9526 866.332 -1.9526 874.142 5.85789L974.142 105.858C981.953 113.668 981.953 126.332 974.142 134.142C966.332 141.953 953.668 141.953 945.858 134.142L845.858 34.1422C838.047 26.3317 838.047 13.6684 845.858 5.85788Z'};
  function drawLogo(c, x, y, h){
    if (logo) { c.drawImage(logo.img, x, y, logo.img.naturalWidth * h / logo.img.naturalHeight, h); return; }
    if (!LOGO.path) LOGO.path = new Path2D(LOGO.d);
    var k = h / LOGO.h, g = c.createLinearGradient(0, 0, LOGO.w, 0);
    g.addColorStop(0, LOGO.from); g.addColorStop(1, LOGO.to);
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = g; c.fill(LOGO.path, 'evenodd');
    c.restore();
  }

  /* ---- the stripes: the brand's diagonal bands of light (the "Go beyond CAD/CAM" picture), drawn as gradients,
     so there is no picture file and the PNG stays clean. A band = a colour that changes along it × a soft
     profile across it. u runs along the bands (up and to the right), v across them (down and to the right),
     both from the point where the first band's edge meets the cover's bottom. Moving the bands left or right
     is a plain shift, so the layer is drawn once, wider than the cover, and shown from the place asked. ---- */
  function ramp(g, n, from, len, up){      // a soft step of a band's profile: len px from `from`, of n px across
    for (var i = 0; i <= 8; i++) {
      var k = i / 8, a = k * k * (3 - 2 * k);
      g.addColorStop(Math.max(0, Math.min(1, (from + len * k) / n)), 'rgba(0,0,0,' + (up ? a : 1 - a).toFixed(3) + ')');
    }
  }
  function stripes(){
    if (SB.cv) return SB.cv;
    var lw = W + SB.max - SB.min, out = document.createElement('canvas'), tmp = document.createElement('canvas');
    out.width = tmp.width = lw; out.height = tmp.height = H;
    var o = out.getContext('2d'), t = tmp.getContext('2d'), U0 = -900, U1 = 2000, a = -SB.angle * Math.PI / 180;
    // v0…v1 across, soft edges `sin` / `sout` wide, colours along u from u0 to u1
    function band(v0, v1, sin, sout, u0, u1, stops){
      var n = v1 - v0;
      t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, lw, H);
      t.translate(SB.max, H); t.rotate(a);
      var g = t.createLinearGradient(u0, 0, u1, 0);
      stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
      t.fillStyle = g; t.fillRect(U0, v0, U1 - U0, n);
      var m = t.createLinearGradient(0, v0, 0, v1);
      ramp(m, n, 0, sin, true); ramp(m, n, n - sout, sout, false);
      t.globalCompositeOperation = 'destination-in'; t.fillStyle = m; t.fillRect(U0, v0 - 2, U1 - U0, n + 4);
      o.drawImage(tmp, 0, 0);
    }
    var dim = 'rgba(15,21,26,';
    band(252, 552, 108, 108, 0, 1, [[0, 'rgba(13,84,100,.5)'], [1, 'rgba(13,84,100,.5)']]);             // a haze in the gap
    band(-14, 360, 96, 67, -120, 1120, [[0, '#0b8fb4'], [.26, '#04ae9c'], [.5, '#02bd94'], [.74, '#05a9a0'], [1, '#079cb3']]);  // green
    band(-14, 158, 96, 53, 230, 1300, [[0, dim + '0)'], [.16, dim + '.46)'], [1, dim + '.46)']]);      // its upper half, dimmer
    band(422, 680, 67, 53, 160, 1000, [[0, '#07a2b8'], [.35, '#0a8ba0'], [.75, '#0f6172'], [1, '#10505e']]);                     // teal
    SB.cv = out; return out;
  }

  /* ---- pictures ---- */
  function rects(){
    var x0 = T.edge.bottom, w = W - x0;
    if (st.layout !== 4) return [{x: x0, y: 0, w: w, h: H}];
    var g = 4, cw = (w - g) / 2, ch = (H - g) / 2;
    return [{x: x0, y: 0, w: cw, h: ch}, {x: x0 + cw + g, y: 0, w: cw, h: ch},
            {x: x0, y: ch + g, w: cw, h: ch}, {x: x0 + cw + g, y: ch + g, w: cw, h: ch}];
  }
  function clamp(v, a, b){ return a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)); }
  // where the picture lies: it always covers its place; the view is corrected to that
  function place(r, im, v){
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var s = Math.max(r.w / iw, r.h / ih) * v.zoom, dw = iw * s, dh = ih * s;
    v.cx = clamp(v.cx, r.w / 2 / dw, 1 - r.w / 2 / dw);
    v.cy = clamp(v.cy, r.h / 2 / dh, 1 - r.h / 2 / dh);
    return {x: r.x + r.w / 2 - v.cx * dw, y: r.y + r.h / 2 - v.cy * dh, w: dw, h: dh};
  }
  function sideClip(c){
    c.beginPath(); c.moveTo(T.edge.top, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(T.edge.bottom, H); c.closePath(); c.clip();
  }
  function slotAt(p){
    if (st.style === 'stripes' || p.x < 0 || p.y < 0 || p.x > W || p.y > H || p.x <= ex(p.y)) return -1;
    var R = rects();
    for (var i = 0; i < R.length; i++)
      if (p.x >= R[i].x && p.x <= R[i].x + R[i].w && p.y >= R[i].y && p.y <= R[i].y + R[i].h) return i;
    return -1;
  }
  function placeholder(c, r, i, small){
    var cy = r.y + r.h / 2, x0 = Math.max(r.x, ex(cy)), cx = (x0 + r.x + r.w) / 2, k = small ? .72 : 1;
    var hot = hoverAt === i || dropAt === i;
    c.save();
    c.strokeStyle = 'rgba(255,255,255,' + (hot ? .7 : .4) + ')'; c.lineWidth = 3 * k; c.lineCap = 'round'; c.lineJoin = 'round';
    var a = 22 * k, ty = cy - 46 * k;                     // an arrow into a tray
    c.beginPath(); c.moveTo(cx, ty + a); c.lineTo(cx, ty - a); c.moveTo(cx - a * .7, ty - a * .3); c.lineTo(cx, ty - a); c.lineTo(cx + a * .7, ty - a * .3);
    c.moveTo(cx - a * 1.3, ty + a * .9); c.lineTo(cx - a * 1.3, ty + a * 1.6); c.lineTo(cx + a * 1.3, ty + a * 1.6); c.lineTo(cx + a * 1.3, ty + a * .9); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(255,255,255,' + (hot ? .9 : .6) + ')'; c.font = '600 ' + Math.round(26 * k) + 'px ' + T.subt.family;
    c.fillText(dropAt === i ? 'Отпустите здесь' : 'Перетащите картинку', cx, cy + 36 * k);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '400 ' + Math.round(20 * k) + 'px ' + T.subt.family;
    c.fillText('или нажмите, чтобы выбрать файл', cx, cy + 68 * k);
    c.restore();
  }

  /* ---- the drawing: c is in cover pixels (1280 × 720) scaled by k; ui adds the editor's marks ---- */
  function render(c, k, ui){
    var L = layout(), R = rects(), i;
    c.setTransform(k, 0, 0, k, 0, 0);
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    if (st.style === 'stripes') {
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(stripes(), SB.max - st.sx, 0, W, H, 0, 0, W, H);
      words(c, L);
      if (ui && st.guides) guides(c);
      return;
    }

    // the right side
    c.save(); sideClip(c);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    for (i = 0; i < R.length; i++) {
      var r = R[i];
      c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
      if (imgs[i]) { var p = place(r, imgs[i].img, st.views[i]); c.drawImage(imgs[i].img, p.x, p.y, p.w, p.h); }
      else { c.fillStyle = T.empty; c.fillRect(r.x, r.y, r.w, r.h); if (ui) placeholder(c, r, i, R.length > 1); }
      if (ui && dropAt === i) { c.fillStyle = 'rgba(0,203,154,.16)'; c.fillRect(r.x, r.y, r.w, r.h); }
      c.restore();
    }
    // the panel's shade on the picture, along the slant
    var nx = H, ny = T.edge.top - T.edge.bottom, nl = Math.hypot(nx, ny), sh = 90;
    var g = c.createLinearGradient(T.edge.top, 0, T.edge.top + nx / nl * sh, ny / nl * sh);
    g.addColorStop(0, 'rgba(15,21,26,.6)'); g.addColorStop(1, 'rgba(15,21,26,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (ui) for (i = 0; i < R.length; i++) {
      var on = dropAt === i, pick = R.length > 1 && sel === i;
      if (!on && !pick) continue;
      c.strokeStyle = on ? T.accent : 'rgba(255,255,255,.55)'; c.lineWidth = on ? 4 : 2;
      c.strokeRect(R[i].x + 2, R[i].y + 2, R[i].w - 4, R[i].h - 4);
    }
    c.restore();

    // the left panel
    c.fillStyle = T.rule.color; c.fillRect(0, T.rule.y, ex(T.rule.y), T.rule.h);
    var gl = c.createLinearGradient(0, 0, 0, H);
    gl.addColorStop(0, 'rgba(0,203,154,.12)'); gl.addColorStop(1, 'rgba(0,203,154,.6)');
    c.strokeStyle = gl; c.lineWidth = 2; c.beginPath(); c.moveTo(T.edge.top, 0); c.lineTo(T.edge.bottom, H); c.stroke();
    words(c, L);

    if (ui && st.guides) guides(c);
  }
  function words(c, L){                    // the same in both variants: logo, title, bottom line
    drawLogo(c, T.logo.x, T.logo.y, T.logo.h);
    if (L.t.lines.length) drawLines(c, L.t, T.pad, T.title.base - (L.t.lines.length - 1) * L.t.lh, T.ink);
    if (L.s.lines.length) drawLines(c, L.s, T.pad, T.subt.base, T.sub);
  }
  function guides(c){
    c.save(); c.strokeStyle = 'rgba(255,79,216,.8)'; c.fillStyle = 'rgba(255,79,216,.9)'; c.lineWidth = 1.5;
    c.font = '500 15px ' + T.subt.family; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    function hl(y, label){ var x1 = ex(y) - T.gapEdge; c.beginPath(); c.moveTo(T.pad, y); c.lineTo(x1, y); c.stroke();
      if (label) { c.textAlign = 'right'; c.fillText(label, x1 - 6, y - 6); } }
    c.beginPath(); c.moveTo(T.pad, 0); c.lineTo(T.pad, H); c.stroke();
    c.beginPath(); c.moveTo(T.edge.top - T.gapEdge, 0); c.lineTo(T.edge.bottom - T.gapEdge, H); c.stroke();
    c.setLineDash([6, 6]);
    hl(T.title.top, 'верх заголовка');
    hl(T.title.base, 'база заголовка');
    hl(T.subt.base, 'нижняя строка');
    hl(T.subt.base + T.subt.lh);
    c.restore();
  }

  var raf = 0;
  function draw(){ if (!raf) raf = requestAnimationFrame(paint); }
  function paint(){
    raf = 0;
    render(ctx, cv.width / W, true);
    render(offCtx, 1, false);
    [$('thHome'), $('thSide')].forEach(function(t){
      var b = t.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(b.width * dpr)), h = Math.max(1, Math.round(b.width * 9 / 16 * dpr));
      if (t.width !== w || t.height !== h) { t.width = w; t.height = h; }
      var c = t.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(off, 0, 0, w, h);
    });
    metaSync();
  }
  function metaSync(){
    var L = layout(), tm = $('titleMeta'), sm = $('subMeta'), n = L.t.lines.length;
    var lines = n + ' ' + (n === 1 ? 'строка' : n > 1 && n < 5 ? 'строки' : 'строк');
    if (!L.t.fit) { tm.className = 'meta err'; tm.textContent = 'Не помещается даже при ' + L.t.size + ' px — сократите текст'; }
    else if (L.t.size < T.title.max) { tm.className = 'meta warn'; tm.textContent = 'Кегль уменьшен до ' + L.t.size + ' px, чтобы поместилось · ' + lines; }
    else { tm.className = 'meta'; tm.textContent = n ? 'Кегль ' + L.t.size + ' px · ' + lines : 'Без заголовка'; }
    if (L.s.over) { sm.className = 'meta warn'; sm.textContent = 'Больше двух строк — остальное обрезано'; }
    else if (!L.s.fit) { sm.className = 'meta warn'; sm.textContent = 'Слово шире колонки — сократите'; }
    else { sm.className = 'meta'; sm.textContent = ''; }
    var name = plain(st.title) || 'Без названия';
    $('ytT1').textContent = name; $('ytT2').textContent = name;
  }

  /* ---- the canvas takes the room it has ---- */
  function fit(){
    var b = stage.getBoundingClientRect(), pad = 24;
    var w = Math.floor(Math.max(320, Math.min(b.width - pad * 2, (b.height - pad * 2 - 28) * 16 / 9))), h = Math.round(w * 9 / 16);
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    raf && cancelAnimationFrame(raf); paint();
  }

  /* ---- loading a picture ---- */
  function toast(msg){
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function(){ t.classList.remove('on'); }, 2600);
  }
  function imgFrom(blob){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function(){ im.naturalWidth ? res({img: im, url: url}) : rej(new Error('empty')); };
      im.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('decode')); };
      im.src = url;
    });
  }
  // a photo larger than the cover needs is scaled down once, so it is light to keep and to draw
  function shrink(o, blob){
    var im = o.img, m = Math.max(im.naturalWidth, im.naturalHeight), lim = 2560;
    if (blob.type === 'image/svg+xml' || (m <= lim && blob.size < 3e6)) return Promise.resolve({o: o, blob: blob});
    var s = Math.min(1, lim / m), c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height);
    var type = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise(function(res){ c.toBlob(function(b){
      if (!b) return res({o: o, blob: blob});
      URL.revokeObjectURL(o.url); imgFrom(b).then(function(o2){ res({o: o2, blob: b}); });
    }, type, .92); });
  }
  function loadFile(f, target){
    if (!f || !/^image\//.test(f.type)) { toast('Это не картинка'); return; }
    imgFrom(f).then(function(o){ return shrink(o, f); }).then(function(r){
      if (target === 'logo') {
        if (logo) URL.revokeObjectURL(logo.url);
        logo = r.o; idbPut('logo', r.blob); logoSync();
      } else {
        if (imgs[target]) URL.revokeObjectURL(imgs[target].url);
        imgs[target] = r.o; st.views[target] = view0(); sel = target;
        idbPut('s' + target, r.blob); save(); sideSync();
      }
      draw();
    }).catch(function(){ toast('Не удалось открыть файл'); });
  }
  function pick(target){ pickFor = target; file.value = ''; file.click(); }
  file.addEventListener('change', function(){ if (file.files[0]) loadFile(file.files[0], pickFor); });
  function noPics(){                                     // the stripes variant takes no picture
    if (st.style !== 'stripes') return false;
    toast('В варианте «Полосы» картинки нет — переключите на «С картинкой»'); return true;
  }
  function freeSlot(){                                   // where a pasted or loosely dropped picture goes
    var n = st.layout === 4 ? 4 : 1;
    if (sel < n && !imgs[sel]) return sel;
    for (var i = 0; i < n; i++) if (!imgs[i]) return i;
    return sel < n ? sel : 0;
  }

  /* ---- the mouse on the cover ---- */
  function at(e){ var b = cv.getBoundingClientRect(); return {x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height}; }
  function textAt(p){                                    // which field a click on the left panel means
    if (p.x >= ex(p.y) || p.y < T.rule.y + 8) return null;
    return p.y > T.subt.base - T.subt.size - 16 ? fSub : fTitle;
  }
  function cursor(p){
    var i = slotAt(p);
    cv.style.cursor = drag ? (drag.s ? 'ew-resize' : 'grabbing') : i >= 0 ? (imgs[i] ? 'grab' : 'pointer')
      : textAt(p) ? 'text' : st.style === 'stripes' && p.x >= ex(p.y) ? 'ew-resize' : 'default';
  }
  cv.addEventListener('pointerdown', function(e){
    if (e.button !== 0) return;
    var p = at(e), i = slotAt(p);
    if (i < 0) {
      var ta = textAt(p);
      if (ta) { e.preventDefault(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      else if (st.style === 'stripes' && p.x >= ex(p.y)) { drag = {s: 1, x: p.x}; cv.setPointerCapture(e.pointerId); cursor(p); e.preventDefault(); }
      return;
    }
    if (sel !== i) { sel = i; sideSync(); draw(); }
    if (!imgs[i]) { pick(i); return; }
    drag = {i: i, x: p.x, y: p.y}; cv.setPointerCapture(e.pointerId); cursor(p); e.preventDefault();
  });
  cv.addEventListener('pointermove', function(e){
    var p = at(e);
    if (drag && drag.s) { setSx(st.sx + p.x - drag.x); drag.x = p.x; return; }
    if (drag) {
      var r = rects()[drag.i], v = st.views[drag.i], pl = place(r, imgs[drag.i].img, v);
      v.cx -= (p.x - drag.x) / pl.w; v.cy -= (p.y - drag.y) / pl.h;
      drag.x = p.x; drag.y = p.y; save(); draw(); return;
    }
    var h = slotAt(p); if (h !== hoverAt) { hoverAt = h; draw(); }
    cursor(p);
  });
  function dragEnd(e){ if (!drag) return; drag = null; cursor(at(e)); }
  cv.addEventListener('pointerup', dragEnd);
  cv.addEventListener('pointercancel', dragEnd);
  cv.addEventListener('pointerleave', function(){ if (hoverAt !== -1) { hoverAt = -1; draw(); } });
  cv.addEventListener('dblclick', function(e){ var i = slotAt(at(e)); if (i >= 0 && imgs[i]) pick(i); });
  // the wheel zooms around the pointer
  cv.addEventListener('wheel', function(e){
    var p = at(e), i = slotAt(p);
    if (i < 0 || !imgs[i]) return;
    e.preventDefault();
    var r = rects()[i], v = st.views[i], im = imgs[i].img, pl = place(r, im, v);
    var px = (p.x - pl.x) / pl.w, py = (p.y - pl.y) / pl.h;
    v.zoom = Math.max(1, Math.min(4, v.zoom * Math.exp(-e.deltaY * .0015)));
    var s = Math.max(r.w / im.naturalWidth, r.h / im.naturalHeight) * v.zoom, dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    v.cx = (r.x + r.w / 2 - p.x + px * dw) / dw; v.cy = (r.y + r.h / 2 - p.y + py * dh) / dh;
    sel = i; save(); zoomSync(i); draw();
  }, {passive: false});

  /* ---- files: dropped on the cover, on a row of the list, or pasted ---- */
  function hasFiles(e){ return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  window.addEventListener('dragover', function(e){ if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', function(e){ if (hasFiles(e)) e.preventDefault(); });
  stage.addEventListener('dragover', function(e){
    if (!hasFiles(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (st.style === 'stripes') return;
    var i = slotAt(at(e)); if (i < 0) i = freeSlot();
    if (i !== dropAt) { dropAt = i; draw(); }
  });
  stage.addEventListener('dragleave', function(e){ if (!stage.contains(e.relatedTarget) && dropAt !== -1) { dropAt = -1; draw(); } });
  stage.addEventListener('drop', function(e){
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (noPics()) return;
    var i = dropAt >= 0 ? dropAt : freeSlot(); dropAt = -1; draw();
    loadFile(e.dataTransfer.files[0], i);
  });
  document.addEventListener('paste', function(e){
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++)
      if (items[i].kind === 'file' && /^image\//.test(items[i].type)) { e.preventDefault(); if (!noPics()) loadFile(items[i].getAsFile(), freeSlot()); return; }
  });

  /* ---- the side panel ---- */
  var NAMES = ['Вверху слева', 'Вверху справа', 'Внизу слева', 'Внизу справа'];
  var IC = {
    up: '<svg viewBox="0 0 16 16"><path d="M8 10.5v-8M4.5 6 8 2.5 11.5 6M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fit: '<svg viewBox="0 0 16 16"><path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><rect x="6" y="6" width="4" height="4" rx=".5" fill="currentColor"/></svg>',
    del: '<svg viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  };
  function sideSync(){
    var n = st.layout === 4 ? 4 : 1, html = '';
    for (var i = 0; i < n; i++) {
      var im = imgs[i], z = Math.round(st.views[i].zoom * 100);
      html += '<div class="slot' + (im ? '' : ' empty') + (n > 1 && sel === i ? ' sel' : '') + '" data-i="' + i + '">' +
        '<div class="sl-thumb" data-act="pick" title="' + (im ? 'Заменить' : 'Выбрать файл') + '">' + (im ? '<img src="' + im.url + '" alt="">' : IC.up) + '</div>' +
        '<div class="sl-body"><div class="sl-row"><span class="sl-name">' + (n > 1 ? NAMES[i] : im ? 'Картинка справа' : 'Нет картинки') + '</span>' +
        '<button class="ib" data-act="pick" title="' + (im ? 'Заменить' : 'Выбрать файл') + '">' + IC.up + '</button>' +
        '<button class="ib" data-act="fit" title="Вернуть кадр: по центру, 100 %"' + (im ? '' : ' disabled') + '>' + IC.fit + '</button>' +
        '<button class="ib" data-act="del" title="Убрать"' + (im ? '' : ' disabled') + '>' + IC.del + '</button></div>' +
        '<div class="sl-zoom"><input type="range" min="100" max="400" step="1" value="' + z + '" style="--p:' + (z - 100) / 3 + '%"' + (im ? '' : ' disabled') + '>' +
        '<span class="v">' + z + ' %</span></div></div></div>';
    }
    $('slotList').innerHTML = html;
    Array.prototype.forEach.call($('layoutSeg').children, function(b){ b.classList.toggle('on', +b.dataset.layout === st.layout); });
    Array.prototype.forEach.call($('styleSeg').children, function(b){ b.classList.toggle('on', b.dataset.style === st.style); });
    var bands = st.style === 'stripes';
    $('picBlock').hidden = bands; $('stripeBlock').hidden = !bands;
    $('cvHint').innerHTML = bands ? 'Полосы двигаются мышью влево-вправо · текст — в полях справа'
      : 'Перетащите картинку на правую часть или нажмите туда · двигайте мышью · колесо — масштаб · <kbd>Ctrl</kbd>+<kbd>V</kbd> — из буфера';
    sxSync();
    $('cvGuides').classList.toggle('on', !!st.guides);
  }
  function sxSync(){
    var r = $('sxRange'), d = Math.round(st.sx - SB.x);
    r.value = st.sx; r.style.setProperty('--p', (st.sx - SB.min) / (SB.max - SB.min) * 100 + '%');
    $('sxVal').textContent = (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d) + ' px';
    $('sxReset').disabled = d === 0;
  }
  function setSx(x){ st.sx = Math.max(SB.min, Math.min(SB.max, Math.round(x))); save(); sxSync(); draw(); }
  $('sxRange').addEventListener('input', function(){ setSx(+this.value); });
  $('sxReset').addEventListener('click', function(){ setSx(SB.x); });
  $('styleSeg').addEventListener('click', function(e){
    var b = e.target.closest('[data-style]'); if (!b) return;
    st.style = b.dataset.style; hoverAt = dropAt = -1; save(); sideSync(); draw();
  });
  function zoomSync(i){
    var row = $('slotList').querySelector('.slot[data-i="' + i + '"]'); if (!row) return;
    var z = Math.round(st.views[i].zoom * 100), inp = row.querySelector('input');
    inp.value = z; inp.style.setProperty('--p', (z - 100) / 3 + '%'); row.querySelector('.v').textContent = z + ' %';
  }
  $('slotList').addEventListener('click', function(e){
    var row = e.target.closest('.slot'); if (!row) return;
    var i = +row.dataset.i, b = e.target.closest('[data-act]'), act = b && b.dataset.act;
    sel = i;
    if (act === 'pick') pick(i);
    else if (act === 'fit') { st.views[i] = view0(); save(); }
    else if (act === 'del') { if (imgs[i]) URL.revokeObjectURL(imgs[i].url); imgs[i] = null; st.views[i] = view0(); idbPut('s' + i, null); save(); }
    if (e.target.tagName !== 'INPUT') sideSync();
    draw();
  });
  $('slotList').addEventListener('input', function(e){
    var row = e.target.closest('.slot'); if (!row || e.target.type !== 'range') return;
    var i = +row.dataset.i; st.views[i].zoom = e.target.value / 100; sel = i; save(); zoomSync(i); draw();
  });
  $('slotList').addEventListener('dragover', function(e){
    var row = e.target.closest('.slot'); if (!row || !hasFiles(e)) return;
    e.preventDefault(); row.classList.add('drop');
  });
  $('slotList').addEventListener('dragleave', function(e){ var row = e.target.closest('.slot'); if (row && !row.contains(e.relatedTarget)) row.classList.remove('drop'); });
  $('slotList').addEventListener('drop', function(e){
    var row = e.target.closest('.slot'); if (!row || !hasFiles(e)) return;
    e.preventDefault(); row.classList.remove('drop'); loadFile(e.dataTransfer.files[0], +row.dataset.i);
  });
  $('layoutSeg').addEventListener('click', function(e){
    var b = e.target.closest('[data-layout]'); if (!b) return;
    st.layout = +b.dataset.layout; if (st.layout !== 4) sel = 0;
    save(); sideSync(); draw();
  });

  // words
  fTitle.value = st.title; fSub.value = st.sub;
  fTitle.addEventListener('input', function(){ st.title = fTitle.value; save(); draw(); });
  fSub.addEventListener('input', function(){ st.sub = fSub.value; save(); draw(); });
  var lastTa = fTitle;
  [fTitle, fSub].forEach(function(ta){
    ta.addEventListener('focus', function(){ lastTa = ta; });
    ta.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyB') { e.preventDefault(); accent(ta); }
    });
  });
  // the selection (or the word under the caret) gets *…* around it, or loses it
  function accent(ta){
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd, a, b, text;
    if (s === e) {
      while (s > 0 && !/[\s*]/.test(v[s - 1])) s--;
      while (e < v.length && !/[\s*]/.test(v[e])) e++;
      if (s === e) return;
    }
    if (v[s - 1] === '*' && v[e] === '*') { a = s - 1; b = e + 1; text = v.slice(s, e); s--; e--; }
    else if (e - s > 1 && v[s] === '*' && v[e - 1] === '*') { a = s; b = e; text = v.slice(s + 1, e - 1); e -= 2; }
    else { a = s; b = e; text = '*' + v.slice(s, e) + '*'; s++; e++; }
    ta.focus(); ta.setSelectionRange(a, b);
    if (!document.execCommand('insertText', false, text)) { ta.value = v.slice(0, a) + text + v.slice(b); ta.dispatchEvent(new Event('input')); }
    ta.setSelectionRange(s, e);
  }
  $('accBtn').addEventListener('mousedown', function(e){ e.preventDefault(); });
  $('accBtn').addEventListener('click', function(){ accent(lastTa); });

  // logo
  function logoSync(){
    $('logoDrop').disabled = !logo;
    $('logoNote').textContent = logo ? 'Свой файл, по высоте ' + T.logo.h + ' px. «Встроенный» вернёт знак ENCY.'
      : 'Знак ENCY. Для другого логотипа загрузите SVG или PNG без полей — встанет по высоте ' + T.logo.h + ' px.';
  }
  $('logoPick').addEventListener('click', function(){ pick('logo'); });
  $('logoDrop').addEventListener('click', function(){ if (logo) URL.revokeObjectURL(logo.url); logo = null; idbPut('logo', null); logoSync(); draw(); });

  /* ---- out: PNG (JPEG when the PNG is over YouTube's 2 MB), clipboard ---- */
  function shot(){ var c = document.createElement('canvas'); c.width = W; c.height = H; render(c.getContext('2d'), 1, false); return c; }
  function blobOf(c, type, q){ return new Promise(function(res){ c.toBlob(res, type, q); }); }
  function fileName(){
    var s = plain(st.title).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    return 'ency-cover' + (s ? '-' + s : '');
  }
  function download(){
    var c = shot();
    blobOf(c, 'image/png').then(function(png){
      if (png.size <= 2 * 1024 * 1024) return {b: png, ext: 'png'};
      return blobOf(c, 'image/jpeg', .92).then(function(j){ return {b: j, ext: 'jpg'}; });
    }).then(function(r){
      var a = document.createElement('a'), url = URL.createObjectURL(r.b);
      a.href = url; a.download = fileName() + '.' + r.ext; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      var kb = Math.round(r.b.size / 1024);
      toast(r.ext === 'png' ? 'PNG сохранён · ' + kb + ' КБ' : 'PNG вышел больше 2 МБ (лимит YouTube) — сохранён JPEG · ' + kb + ' КБ');
    });
  }
  function copy(){
    if (!navigator.clipboard || !window.ClipboardItem) { toast('Браузер не даёт копировать картинки'); return; }
    navigator.clipboard.write([new ClipboardItem({'image/png': blobOf(shot(), 'image/png')})])
      .then(function(){ toast('Скопировано — вставьте в Figma или чат'); }, function(){ toast('Не удалось скопировать'); });
  }
  $('cvSave').addEventListener('click', download);
  $('cvCopy').addEventListener('click', copy);
  function setGuides(){ st.guides = !st.guides; save(); sideSync(); draw(); }
  $('cvGuides').addEventListener('click', setGuides);
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); download(); return; }
    var inField = /^(TEXTAREA|INPUT)$/.test((document.activeElement || {}).tagName || '');
    if (!inField && !e.ctrlKey && !e.metaKey && !e.altKey && e.code === 'KeyG') setGuides();
  });

  /* ---- start ---- */
  sideSync(); logoSync();
  new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize', fit);
  // the fonts come from the network: draw at once, then again with the right metrics
  if (document.fonts && document.fonts.load)
    Promise.all([document.fonts.load('800 100px "Inter Tight"'), document.fonts.load('500 30px "Inter"'),
                 document.fonts.load('600 26px "Inter"'), document.fonts.load('400 20px "Inter"')])
      .then(function(){
        mcache.clear(); lay.key = null; draw();
        if (!document.fonts.check('800 100px "Inter Tight"')) toast('Шрифт Inter Tight не загрузился — нужен интернет');
      }, function(){ toast('Шрифт Inter Tight не загрузился — нужен интернет'); });
  ['s0', 's1', 's2', 's3', 'logo'].forEach(function(k, i){
    idbGet(k).then(function(blob){
      if (!blob) return;
      return imgFrom(blob).then(function(o){ if (k === 'logo') { logo = o; logoSync(); } else imgs[i] = o; sideSync(); draw(); });
    }).catch(function(){});
  });
})();
