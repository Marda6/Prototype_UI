/* Toolpath edits — manual edits on top of the calculated toolpath.
   Inspector tab "Edits" (rail, after Links): an ordered list of edits — Trim · Links · Feeds —
   applied top to bottom, enabled ones only (a recalculation re-applies them). Every edit owns a
   region: a curve picked in the 3D view (a vertical prism) and / or a Z range; with both, the
   region is their intersection.
   3D view: the toolpath of the selected milling operation (Z-level passes around a boss), drawn
   on a canvas with the view-cube camera. The edit bar on the view (mode · region · count · ✓ ✕)
   works on ONE edit at a time — the one whose pencil is on. ✓ / Enter keeps the edit, ✕ / Esc
   restores what it had; leaving the session any other way keeps a valid edit and restores an
   unfinished one. Colours follow the movement legend (assets/mv-*.svg). */
(function(){
  var INS = window.ENCY_INSP, MENU = window.ENCY_MENU; if(!INS || !MENU) return;
  var irows = INS.irows, A = INS.A;
  var vp = document.querySelector('.viewport');
  var dock = document.querySelector('.dock');

  /* ---------- icons ----------
     Links / Feeds / Pick curve use the Core assets (rail-links, rail-speeds, f-curve).
     Trim (scissors), Z range, Clear and Note have no Core icon yet — placeholders, to be drawn in Figma. */
  function svg(body, extra){ return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + body + '</svg>'; }
  function img(src){ return '<img class="i16" src="' + src + '" alt="">'; }
  var IC = {
    trim:  svg('<circle cx="4.6" cy="11.6" r="2"/><circle cx="11.4" cy="11.6" r="2"/><path d="M5.9 10.1 11.6 2.6M10.1 10.1 4.4 2.6"/>'),
    links: img('assets/rail-links.svg'),
    feeds: img('assets/rail-speeds.svg'),
    zr:    svg('<path d="M2 5.6 5 3.6h9l-3 2Z"/><path d="M2 12.4l3-2h9l-3 2Z"/><path d="M8 6.4v3.2"/>'),
    curve: img('assets/f-curve.svg'),
    clear: svg('<rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M6 6l4 4M10 6l-4 4"/>'),
    chev:  '<img class="chev7" src="assets/tb-chev.svg" alt="">',
    ok:    svg('<path d="M3.5 8.5l3 3 6-7"/>', ' stroke-width="1.6"'),
    x:     svg('<path d="M4 4l8 8M12 4l-8 8"/>', ' stroke-width="1.4"'),
    note:  svg('<path d="M3 2.5h7l3 3v8H3Z"/><path d="M5.5 7.5h5M5.5 10h3.5"/>')
  };
  var SHAPE_NAMES = {line:'Line', normal:'Normal', polyline:'Polyline', spline:'Spline'};
  var TYPES = {
    trim:  {name:'Trim',  icon:IC.trim,  unit:'passes'},
    links: {name:'Links', icon:IC.links, unit:'links'},
    feeds: {name:'Feeds', icon:IC.feeds, unit:'passes'}
  };
  var TRIM_MODES = {cut:'Cut out', keep:'Keep inside'};
  var FILTERS = {all:'All links', short:'Short links', long:'Long links'};
  // link shapes: at depth (Straight, Smooth) or over the part (Skim: clearance above the part,
  // On Safe Surface: the safe level); a link at depth that would cut the part falls back to Retract
  var LINK_TYPES = ['Straight', 'Smooth', 'Skim', 'On Safe Surface'];
  var LIFTED = {'Skim':1, 'On Safe Surface':1};
  var LEAD_TYPES = ['Off', 'Arc', 'Line'];
  var FEED_PRESETS = [25, 50, 75, 100, 125, 150];
  var FEED = 1200, LINK_FEED = 3000, RAPID = 12000;            // mm/min
  /* Links rules — the parameters of the inspector's Links rules (ENCY): the operation's own set
     (Links tab) and a copy per trim for the gaps it makes. Short link max distance and Feed distance
     are in % of the tool diameter. In the prototype the geometry uses: safe level, short / long link
     types and the short link distance; the rest is kept and edited only. */
  var DEFAULT_RULES = {safe:10, entry:'On Safe Surface', shortType:'Smooth', shortPct:100, longType:'On Safe Surface',
                       radius:0, engage:'Off', retract:'Off', leadsShort:true, feedPct:100, skim:2};
  var TRIM_RULES = Object.assign({}, DEFAULT_RULES, {shortType:'Straight', shortPct:300});
  function shortMax(op, r){ return r.shortPct / 100 * 2 * op.tool; }
  // the canvas follows the theme (project/app.css "Themes"): ink and scene from --th-ink / --th-base; a light
  // theme raises the ink opacities like the --ec-fg-* tokens (1 − (1 − a)^1.4 ≈ their table) and takes the
  // move colours of the light icons (tools/theme-icons.js)
  var COL_DARK = {work:'#70cfff', retract:'#ffdf70', rapid:'#ec3b40', feed:'#00a36d', z:'235,193,74'};
  var COL_LIGHT = {work:'#278ebb', retract:'#9f8204', rapid:'#ec3b40', feed:'#05784f', z:'164,128,1'};
  var COL = COL_DARK, TH = {light:false, ink:'245,245,245', base:'14,16,16'};
  function themeSync(){
    var cs = getComputedStyle(document.documentElement);
    var rgb = function(v, d){ v = (v || '').trim().replace('#', ''); if(v.length !== 6) return d;
      return [0, 2, 4].map(function(i){ return parseInt(v.slice(i, i + 2), 16); }).join(','); };
    TH.light = /-light$/.test(document.documentElement.getAttribute('data-theme') || '');
    TH.ink = rgb(cs.getPropertyValue('--th-ink'), '245,245,245'); TH.base = rgb(cs.getPropertyValue('--th-base'), '14,16,16');
    COL = TH.light ? COL_LIGHT : COL_DARK; COL.hit = 'rgb(' + TH.ink + ')';
  }
  function inkA(a){ return TH.light ? 1 - Math.pow(1 - a, 1.4) : a; }
  function ink(a){ return 'rgba(' + TH.ink + ',' + inkA(a).toFixed(3) + ')'; }
  function scene(a){ return 'rgba(' + TH.base + ',' + a + ')'; }

  /* ---------- the part and the calculated toolpath ----------
     A stadium-shaped boss with a draft on a floor; Z-level passes around it, one closed contour
     per level, the seam on the front face. Units: mm, Z up (setup coordinate system). */
  var G = {Lh:24, R0:20, draft:0.16, H:30, fx:78, fy:56, drawZ:15};
  function bossR(z){ return G.R0 - G.draft * Math.max(0, Math.min(G.H, z)); }
  function stadiumAt(s, rho){
    var L = G.Lh, arc = Math.PI * rho, P = 4 * L + 2 * arc;
    s = ((s % P) + P) % P;
    if(s < L) return {x:s, y:-rho, nx:0, ny:-1};
    s -= L;
    if(s < arc){ var a = -Math.PI / 2 + s / rho; return {x:L + rho * Math.cos(a), y:rho * Math.sin(a), nx:Math.cos(a), ny:Math.sin(a)}; }
    s -= arc;
    if(s < 2 * L) return {x:L - s, y:rho, nx:0, ny:1};
    s -= 2 * L;
    if(s < arc){ var b = Math.PI / 2 + s / rho; return {x:-L + rho * Math.cos(b), y:rho * Math.sin(b), nx:Math.cos(b), ny:Math.sin(b)}; }
    s -= arc;
    return {x:-L + s, y:-rho, nx:0, ny:-1};
  }
  function stadiumLen(rho){ return 4 * G.Lh + 2 * Math.PI * rho; }
  // distance from the boss axis segment (the stadium "spine")
  function spineDist(x, y){ return Math.hypot(Math.max(0, Math.abs(x) - G.Lh), y); }
  function levels(op){
    var n = op.levels, top = G.H - 1, step = (G.H - 2.4) / (n - 1), z = [];
    for(var k = 0; k < n; k++) z.push(top - k * step);
    return z;
  }
  var baseCache = {};
  function basePasses(op){
    var c = baseCache[op.id];
    if(!c){
      c = [];
      levels(op).forEach(function(z, k){
        var rho = bossR(z) + op.tool, P = stadiumLen(rho), N = 160, pts = [], nrm = [];
        for(var i = 0; i <= N; i++){ var q = stadiumAt(P * i / N, rho); pts.push([q.x, q.y, z]); nrm.push([q.nx, q.ny]); }
        c.push({pass:k, pts:pts, nrm:nrm});
      });
      baseCache[op.id] = c;
    }
    // fresh segment objects per evaluation (the point arrays are shared, never mutated)
    return c.map(function(s){ return {pass:s.pass, pts:s.pts, nrm:s.nrm, f:s.pts.map(function(){ return 100; }), closed:true, sCut:-1, eCut:-1}; });
  }

  /* ---------- regions ---------- */
  function pip(x, y, poly){
    var c = false;
    for(var i = 0, j = poly.length - 1; i < poly.length; j = i++){
      var a = poly[i], b = poly[j];
      if(((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
    }
    return c;
  }
  /* the drawn shape: Polyline / Spline — a closed contour (vertical prism); Line / Normal — a cut
     plane through two points, the region is the side to the left of a→b (the arrow in 3D) */
  var CUT_SHAPES = {line:1, normal:1};
  function shapeOf(e){ return e.shape || 'polyline'; }
  function hasCurve(e){
    if(!e.curve || !e.closed) return false;
    return CUT_SHAPES[shapeOf(e)] ? e.curve.length === 2 : e.curve.length >= 3;
  }
  // Catmull-Rom through the control points: closed for the region, open while drawing
  function splinePts(cp, closed){
    var n = cp.length; if(n < 3) return cp.slice();
    var out = [], segs = closed ? n : n - 1;
    for(var i = 0; i < segs; i++){
      var p0 = cp[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = cp[i], p2 = cp[(i + 1) % n], p3 = cp[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      for(var k = 0; k < 10; k++){
        var t = k / 10, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map(function(j){ var a = p0[j], b = p1[j], c = p2[j], d = p3[j];
          return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3); }));
      }
    }
    if(!closed) out.push(cp[n - 1]);
    return out;
  }
  function outline(e){ return shapeOf(e) === 'spline' ? splinePts(e.curve, true) : e.curve; }
  function leftOf(a, b, p){ return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0; }
  function region(e){
    var hc = hasCurve(e), hz = e.zr.on;
    if(!hc && !hz) return null;
    var cut = hc && CUT_SHAPES[shapeOf(e)], poly = hc && !cut ? outline(e) : null;
    return function(p){
      if(hz && (p[2] < e.zr.lo || p[2] > e.zr.hi)) return false;
      if(cut && !leftOf(e.curve[0], e.curve[1], p)) return false;
      if(poly && !pip(p[0], p[1], poly)) return false;
      return true;
    };
  }
  function regionText(e){
    var hc = hasCurve(e), hz = e.zr.on, z = 'Z ' + fmt1(e.zr.lo) + '–' + fmt1(e.zr.hi), s = SHAPE_NAMES[shapeOf(e)];
    if(hc && hz) return s + ' ∩ ' + z;
    if(hc) return CUT_SHAPES[shapeOf(e)] ? s + ' cut' : s + ' · ' + e.curve.length + ' points';
    if(hz) return z + ' mm';
    return 'Not set';
  }

  /* ---------- the edit chain ---------- */
  // trim one segment: drop the points on the removed side; a closed contour cut once stays one
  // piece that starts right after the cut. sCut / eCut — index of the trim that made that end.
  function clip(seg, kill, idx){
    var n = seg.pts.length, any = false;
    for(var i = 0; i < n; i++) if(kill[i]){ any = true; break; }
    if(!any) return [seg];
    var runs = [], st = -1;
    for(var j = 0; j <= n; j++){
      if(j < n && !kill[j]){ if(st < 0) st = j; }
      else if(st >= 0){ runs.push([st, j - 1]); st = -1; }
    }
    function piece(a, b, sc, ec){
      return {pass:seg.pass, pts:seg.pts.slice(a, b + 1), nrm:seg.nrm.slice(a, b + 1), f:seg.f.slice(a, b + 1), closed:false, sCut:sc, eCut:ec};
    }
    var out = [];
    if(seg.closed && runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === n - 1){
      var last = runs.pop(), first = runs.shift(), m = piece(last[0], last[1], idx, idx), h = piece(first[0], first[1], idx, idx);
      m.pts = m.pts.concat(h.pts.slice(1)); m.nrm = m.nrm.concat(h.nrm.slice(1)); m.f = m.f.concat(h.f.slice(1));
      out.push(m);
    }
    runs.forEach(function(r){ out.push(piece(r[0], r[1], r[0] > 0 ? idx : seg.sCut, r[1] < n - 1 ? idx : seg.eCut)); });
    return out.filter(function(s){ return s.pts.length > 1; });
  }
  function killMask(seg, R, mode){ return seg.pts.map(function(p){ var inside = R(p); return mode === 'keep' ? !inside : inside; }); }
  // state after the enabled edits [0, upto)
  function evaluate(op, upto){
    var segs = basePasses(op), ovr = [];
    for(var i = 0; i < Math.min(upto, op.edits.length); i++){
      var e = op.edits[i]; if(!e.on) continue;
      var R = region(e); if(!R) continue;
      if(e.type === 'trim'){
        // a pass removed entirely leaves a gap too: the link across it belongs to this trim
        var nx = [], gap = false;
        segs.forEach(function(s){
          var parts = clip(s, killMask(s, R, e.mode), i);
          if(!parts.length){ gap = true; return; }
          if(gap && nx.length){ nx[nx.length - 1].eCut = i; parts[0].sCut = i; }
          gap = false;
          parts.forEach(function(c){ nx.push(c); });
        });
        segs = nx;
      } else if(e.type === 'feeds'){
        segs.forEach(function(s){ s.pts.forEach(function(p, k){ if(R(p)) s.f[k] = e.feed; }); });
      } else if(e.type === 'links'){
        ovr.push({idx:i, R:R, e:e});
      }
    }
    return {segs:segs, ovr:ovr};
  }
  function dist(a, b){ return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  function linkFrom(L, type, safe, skim){ return {a:L.a, b:L.b, na:L.na, nb:L.nb, d:L.d, type:type, safe:safe, skim:skim, tool:L.tool}; }
  // links between consecutive pieces; born = the trim that made the gap (−1: the calculated toolpath)
  function deriveLinks(op, st){
    var out = [];
    for(var i = 0; i < st.segs.length - 1; i++){
      var s = st.segs[i], t = st.segs[i + 1];
      var a = s.pts[s.pts.length - 1], b = t.pts[0], born = Math.max(s.eCut, t.sCut);
      var owner = born >= 0 && op.edits[born] ? op.edits[born].rules : DEFAULT_RULES;
      var d = dist(a, b), kind = d <= shortMax(op, owner) ? 'short' : 'long';
      var L = {a:a, b:b, na:s.nrm[s.nrm.length - 1], nb:t.nrm[0], d:d, kind:kind, born:born, tool:op.tool,
               type: kind === 'short' ? owner.shortType : owner.longType, safe:owner.safe, skim:owner.skim, mod:-1, fallback:false};
      st.ovr.forEach(function(o){
        if(o.idx > born && (o.R(a) || o.R(b)) && (o.e.filter === 'all' || o.e.filter === kind)){
          L.type = o.e.linkType; L.safe = o.e.safe; L.skim = o.e.skim; L.mod = o.idx;
        }
      });
      // a link at depth must not go through the part: fall back to a retract to the safe level
      if(!LIFTED[L.type] && collides(linkPts(L), op.tool)){ L.fallback = L.type; L.type = 'On Safe Surface'; }
      out.push(L);
    }
    return out;
  }
  function collides(pts, tool){
    for(var i = 1; i < pts.length; i++){
      var a = pts[i - 1], b = pts[i];
      for(var k = 1; k < 8; k++){
        var t = k / 8, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
        if(z < G.H && spineDist(x, y) < bossR(z) + tool - 0.5) return true;
      }
    }
    return false;
  }
  function linkMatches(L, R, filter){ return (R(L.a) || R(L.b)) && (filter === 'all' || filter === L.kind); }
  // polyline of a link; segments carry the move type for the colour: 'feed' | 'retract' | 'rapid'
  function linkPts(L){
    if(L.type === 'Straight') return [L.a, L.b];
    if(LIFTED[L.type]){
      var zs;
      if(L.type === 'On Safe Surface') zs = G.H + L.safe;
      else {
        // skim: clearance above the highest point under the way across
        var top = Math.max(L.a[2], L.b[2]);
        for(var k = 0; k <= 10; k++){
          var x = L.a[0] + (L.b[0] - L.a[0]) * k / 10, y = L.a[1] + (L.b[1] - L.a[1]) * k / 10;
          if(spineDist(x, y) < G.R0 + L.tool) top = G.H;
        }
        zs = top + L.skim;
      }
      return [L.a, [L.a[0], L.a[1], zs], [L.b[0], L.b[1], zs], L.b];
    }
    // smooth: a lead-out / lead-in loop away from the wall
    var nx = (L.na[0] + L.nb[0]) / 2, ny = (L.na[1] + L.nb[1]) / 2, nl = Math.hypot(nx, ny) || 1;
    var o = Math.min(8, 2 + L.d * 0.3); nx = nx / nl * o; ny = ny / nl * o;
    var c1 = [L.a[0] + nx, L.a[1] + ny, L.a[2]], c2 = [L.b[0] + nx, L.b[1] + ny, L.b[2]], pts = [];
    for(var i = 0; i <= 12; i++){
      var t = i / 12, u = 1 - t, w0 = u*u*u, w1 = 3*u*u*t, w2 = 3*u*t*t, w3 = t*t*t;
      pts.push([0,1,2].map(function(j){ return w0*L.a[j] + w1*c1[j] + w2*c2[j] + w3*L.b[j]; }));
    }
    return pts;
  }
  function polyLen(p){ var l = 0; for(var i = 1; i < p.length; i++) l += dist(p[i - 1], p[i]); return l; }
  function linkTime(L){
    var p = linkPts(L);
    if(!LIFTED[L.type]) return polyLen(p) / LINK_FEED;
    return (dist(p[0], p[1]) + dist(p[1], p[2])) / RAPID + dist(p[2], p[3]) / LINK_FEED;   // rapid up and across, plunge at link feed
  }
  // retracts (lifted links) and machining time of a state
  function stats(op, st){
    var t = 0, lifts = 0;
    st.segs.forEach(function(s){
      for(var i = 1; i < s.pts.length; i++) t += dist(s.pts[i - 1], s.pts[i]) / (FEED * s.f[i - 1] / 100);
    });
    deriveLinks(op, st).forEach(function(L){ if(LIFTED[L.type]) lifts++; t += linkTime(L); });
    return {lifts:lifts, min:t};
  }
  // what one edit adds to the toolpath it receives: retracts and time (null — not applied)
  function delta(op, idx, e){
    if(!e.on || !region(e)) return null;
    var a = stats(op, evaluate(op, idx)), b = stats(op, evaluate(op, idx + 1));
    return {lifts:b.lifts - a.lifts, min:b.min - a.min};
  }
  // "+11 retracts · −44 s" — only the parts that changed
  function deltaText(d){
    if(!d) return '';
    var out = [], s = Math.round(d.min * 60), a = Math.abs(s);
    if(d.lifts) out.push((d.lifts > 0 ? '+' : '−') + plural(Math.abs(d.lifts), 'retracts'));
    if(a >= 1) out.push((s > 0 ? '+' : '−') + (a < 60 ? a + ' s' : Math.floor(a / 60) + 'm ' + ('0' + a % 60).slice(-2) + 's'));
    return out.join(' · ');
  }
  // what one edit does to the toolpath it receives: the count on the bar and in the list
  function effect(op, idx, e){
    var R = region(e); if(!R) return null;
    var st = evaluate(op, idx), hit = {};
    if(e.type === 'trim'){ st.segs.forEach(function(s){ if(killMask(s, R, e.mode).some(Boolean)) hit[s.pass] = 1; }); return {n:Object.keys(hit).length}; }
    if(e.type === 'feeds'){ st.segs.forEach(function(s){ if(s.pts.some(R)) hit[s.pass] = 1; }); return {n:Object.keys(hit).length}; }
    var inR = {short:0, long:0}, n = 0, fb = 0, out = evaluate(op, idx + 1);
    deriveLinks(op, st).forEach(function(L){ if(R(L.a) || R(L.b)) inR[L.kind]++; if(linkMatches(L, R, e.filter)) n++; });
    if(e.on) deriveLinks(op, out).forEach(function(L){ if(L.mod === idx && L.fallback) fb++; });
    return {n:n, inR:inR, fallback:fb};
  }

  /* ---------- operations and their edits ---------- */
  var OPS = {}, uid = 0;
  var tree = document.getElementById('tree');
  function opRows(){ return Array.prototype.slice.call(tree.querySelectorAll('.trow[data-type="operation"]')); }
  function millRows(){ return opRows().filter(function(r){ return r.dataset.kind === 'mill'; }); }
  function opOf(row){
    var id = row.dataset.id;
    if(!OPS[id]) OPS[id] = {id:id, levels:+row.dataset.levels || 20, tool:+row.dataset.tool || 4, edits:[],
                            name:(row.querySelector('.rlabel span') || {}).textContent || ''};
    return OPS[id];
  }
  function selRow(){ return tree.querySelector('.trow.tsel'); }
  function curOp(){ var r = selRow(); return r && r.dataset.kind === 'mill' ? opOf(r) : null; }
  function newEdit(type){
    var e = {id:'e' + (++uid), type:type, on:true, open:true, rulesOpen:false, note:'', noteEdit:false,
             curve:null, closed:false, zr:{on:false, lo:8, hi:20}};
    if(type === 'trim'){ e.mode = 'cut'; e.rules = Object.assign({}, TRIM_RULES); e.fold = {safe:true, links:false, leads:true, dist:true}; }
    if(type === 'links'){ e.filter = 'long'; e.linkType = 'Skim'; e.safe = 10; e.skim = 2; }
    if(type === 'feeds'){ e.feed = 50; e.feedUnit = '%'; }      // feed — % of the operation feed; shown in % or mm/min
    return e;
  }
  function editById(op, id){ for(var i = 0; i < op.edits.length; i++) if(op.edits[i].id === id) return op.edits[i]; return null; }
  // committed edits only: the open new edit is a draft until ✓
  function applied(op){ return op.edits.filter(function(e){ return e.on && region(e) && !(cur && cur.isNew && cur.e === e); }); }

  /* ---------- the edit session (one edit open in 3D) ---------- */
  var cur = null;          // {op, e, snap, isNew, tool:'curve'|'z'|null, prevCurve}
  var selId = null, flashId = null;
  var addType = 'trim';    // the split button in the title adds this type; ▾ picks another (and remembers it)
  function beginEdit(op, e, isNew){
    if(cur && cur.e === e) return;
    leave();
    // anchor — where the edit bar sits on the view (the end of the drawing, then each click)
    cur = {op:op, e:e, snap:JSON.stringify(e), isNew:!!isNew, tool:null, prevCurve:null, anchor:null};
    selId = e.id;
    op.edits.forEach(function(x){ x.open = x === e; });            // one edit expanded at a time
    if(isNew || !region(e)){ e.curve = []; e.closed = false; e.shape = dbar.state.tool; cur.tool = 'curve'; }
    else { if(e.zr.on && !hasCurve(e)) cur.tool = 'z'; cur.anchor = regionAnchor(e); }
    refresh();
  }
  function end(){ MENU.close(); drag = null; var c = cur; cur = null; return c; }
  // ✓ / Enter — keep the edit (a new one without a region is dropped: there is nothing to keep)
  function commit(){
    if(!cur) return;
    var c = end();
    // an unfinished curve is not a region: the previous one (if any) comes back
    if(c.e.curve && !c.e.closed) restorePrev(c);
    if(!region(c.e)){ if(c.isNew) remove(c.op, c.e); }
    else {
      flashId = c.e.id; setTimeout(function(){ flashId = null; var r = irows.querySelector('.tpe-item.flash'); if(r) r.classList.remove('flash'); }, 900);
      INS.emitAction('Toolpath edit · ' + TYPES[c.e.type].name, regionText(c.e), 'OP.TPEDIT ' + c.e.type.toUpperCase());
    }
    refresh();
  }
  // ✕ / Esc — a new edit goes away, an existing one gets back what it had
  function cancel(){
    if(!cur) return;
    var c = end();
    if(c.isNew) remove(c.op, c.e);
    else { var old = JSON.parse(c.snap); Object.keys(old).forEach(function(k){ c.e[k] = old[k]; }); }
    refresh();
  }
  // any other way out (tree, tab, Simulation, another edit): keep what is valid, restore the rest
  // (a new edit stays in the list even without a region — the user added it on purpose; only ✕ / Esc drops it)
  function leave(){
    if(!cur) return;
    if(!drawing() && region(cur.e)){ commit(); return; }
    if(!cur.isNew){ cancel(); return; }
    var c = end();
    if(c.e.curve && !c.e.closed){ c.e.curve = null; c.e.closed = false; }   // the unfinished curve goes, the edit stays
    refresh();
  }
  function remove(op, e){
    var i = op.edits.indexOf(e); if(i >= 0) op.edits.splice(i, 1);
    if(selId === e.id) selId = null;
    return i;
  }
  function drawing(){ return !!(cur && cur.tool === 'curve' && cur.e.curve && !cur.e.closed); }
  function startCurve(){
    var e = cur.e;
    // the old shape stays faint until the new one is finished; Esc brings it back
    if(hasCurve(e)) cur.prevCurve = {curve:e.curve, shape:e.shape};
    e.curve = []; e.closed = false; e.shape = dbar.state.tool; cur.tool = 'curve';
  }
  function restorePrev(c){
    var p = c.prevCurve;
    c.e.curve = p ? p.curve : null; c.e.shape = p ? p.shape : c.e.shape; c.e.closed = !!p; c.prevCurve = null;
  }
  // the drawing is done: the bar appears where it ended (the mouse, or the last point for Enter)
  function finishShape(at){
    cur.e.closed = true; cur.prevCurve = null; cur.tool = null;
    cur.anchor = at || regionAnchor(cur.e);
    refresh();
  }
  // leave drawing without a new shape: the old one comes back (if any); a Z range alone is a region too
  function stopDrawing(){
    if(cur.prevCurve) restorePrev(cur); else { cur.e.curve = null; cur.e.closed = false; }
    cur.tool = cur.e.zr.on ? 'z' : null;
    if(!cur.anchor) cur.anchor = regionAnchor(cur.e);
    refresh();
  }
  function closeCurve(){
    var c = cur.e.curve; trig();
    if(CUT_SHAPES[shapeOf(cur.e)]) return;                         // a cut is finished by its own clicks
    var cc = centre(), sp = function(p){ return P(p, cc); };
    // a double-click also lands a click on the same spot — drop that duplicate (screen distance)
    if(c.length > 3){ var a = sp(c[c.length - 1]), b = sp(c[c.length - 2]); if(Math.hypot(a[0] - b[0], a[1] - b[1]) < 5) c.pop(); }
    if(c.length >= 3) finishShape(mouse ? {x:mouse.x, y:mouse.y} : null);
  }
  // delete with a short undo
  var undo = null;
  function del(op, e){
    if(cur && cur.e === e) end();
    var i = remove(op, e);
    undo = {op:op, e:e, i:i};
    toast(TYPES[e.type].name + ' deleted', 'Undo', function(){ if(!undo) return; undo.op.edits.splice(Math.min(undo.i, undo.op.edits.length), 0, undo.e); selId = undo.e.id; undo = null; refresh(); });
    refresh();
  }

  /* ---------- 3D view ---------- */
  var cv = document.createElement('canvas'); cv.className = 'tp-view'; cv.hidden = true;
  vp.insertBefore(cv, vp.firstChild);
  var ctx = cv.getContext('2d');
  var cam = {yaw:0.68, pitch:0.49, s:4, ox:0, oy:0}, W = 0, H = 0, fitted = false, dpr = 1;
  var active = false, simOn = false;
  /* the view shows outside the Edits tab too (Machining and Model): the part while the Part filter is
     on, the toolpath while the Toolpath filter is on (the selected milling operation's, else the first
     one's); the Edits tab makes it editable (active) */
  var shown = false;
  var fPart = document.querySelector('#filters .f-cell[data-ftype="part"]');
  var fPath = document.querySelector('#filters .f-cell[data-fview="toolpath"]');
  function partOn(){ return !fPart || fPart.classList.contains('on'); }
  function pathOn(){ return !fPath || fPath.classList.contains('on'); }
  var T = {};
  function trig(){ T.cy = Math.cos(cam.yaw); T.sy = Math.sin(cam.yaw); T.cp = Math.cos(cam.pitch); T.sp = Math.sin(cam.pitch); }
  // the free part of the view, [left, right]: right of the dock, and of the inspector when it sits
  // next to the tree; left of the inspector when it sits at the window's right edge
  function freeSpan(){
    var vr = vp.getBoundingClientRect(), l = dock.getBoundingClientRect().right - vr.left + 8, r = W;
    var ins = document.querySelector('.workspace > .panel-insp'), ir = ins && ins.offsetWidth ? ins.getBoundingClientRect() : null;
    if(ir){ if(ir.left - vr.left > W / 2) r = ir.left - vr.left - 8; else l = Math.max(l, ir.right - vr.left + 8); }
    return [Math.max(0, l), r];
  }
  function centre(){ var f = freeSpan(); return [(f[0] + f[1]) / 2 + cam.ox, H / 2 + cam.oy]; }
  function P(p, c){
    var x1 = T.cy * p[0] - T.sy * p[1], y1 = T.sy * p[0] + T.cy * p[1];
    return [c[0] + cam.s * x1, c[1] + cam.s * (T.sp * y1 - T.cp * p[2]), T.cp * y1 + T.sp * p[2]];
  }
  function unproject(X, Y, z0){
    if(Math.abs(T.sp) < 0.15) return null;
    var c = centre(), a = (X - c[0]) / cam.s, b = (Y - c[1]) / cam.s, y1 = (b + T.cp * z0) / T.sp;
    return [T.cy * a + T.sy * y1, -T.sy * a + T.cy * y1];
  }
  function facing(n){ return T.cp * (T.sy * n[0] + T.cy * n[1]); }
  function resize(){
    var r = vp.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if(r.width !== W || r.height !== H || d !== dpr){
      W = r.width; H = r.height; dpr = d;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    if(!fitted && W > 0) fit(); else draw();
    barPlace();
  }
  function fit(){
    trig();
    var save = {s:cam.s, ox:cam.ox, oy:cam.oy}; cam.s = 1; cam.ox = 0; cam.oy = 0;
    var c = centre(), xs = [], ys = [];
    [[-G.fx, -G.fy, 0], [G.fx, -G.fy, 0], [G.fx, G.fy, 0], [-G.fx, G.fy, 0],
     [-G.Lh - 26, -26, G.H + 12], [G.Lh + 26, -26, G.H + 12], [G.Lh + 26, 26, G.H + 12], [-G.Lh - 26, 26, G.H + 12]]
      .forEach(function(p){ var q = P(p, c); xs.push(q[0] - c[0]); ys.push(q[1] - c[1]); });
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs), h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var f = freeSpan(), s = Math.min((f[1] - f[0] - 140) / w, (H - 190) / h);
    if(!(s > 0)){ cam.s = save.s; cam.ox = save.ox; cam.oy = save.oy; return; }
    cam.s = s;
    cam.ox = -s * (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2;
    cam.oy = -s * (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2 + 10;
    fitted = true; draw();
  }
  var raf = 0, handles = [], mouse = null;
  function draw(){ if(!raf) raf = requestAnimationFrame(paint); }
  // a theme switch repaints in the new colours
  new MutationObserver(draw).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  function Buckets(){ this.m = {}; }
  Buckets.prototype.seg = function(col, al, w, dash, a, b){
    var k = col + '|' + al + '|' + w + '|' + (dash ? 1 : 0), p = this.m[k] || (this.m[k] = {col:col, al:al, w:w, dash:dash, path:new Path2D()});
    p.path.moveTo(a[0], a[1]); p.path.lineTo(b[0], b[1]);
  };
  Buckets.prototype.flush = function(){
    var m = this.m;
    Object.keys(m).sort(function(a, b){ return m[a].al - m[b].al; }).forEach(function(k){
      var p = m[k]; ctx.globalAlpha = p.al; ctx.strokeStyle = p.col; ctx.lineWidth = p.w;
      ctx.setLineDash(p.dash ? [2.5 * p.w, 3 * p.w] : []); ctx.stroke(p.path);
    });
    ctx.globalAlpha = 1; ctx.setLineDash([]);
  };
  function paint(){
    raf = 0; if(!shown) return;
    themeSync(); trig(); ctx.clearRect(0, 0, W, H);
    var c = centre(), showPart = partOn(), showPath = pathOn();
    var op = curOp(); if(!op){ var r0 = millRows()[0]; op = r0 ? opOf(r0) : null; }
    // while an edit is open the view shows its result next to what it changes;
    // otherwise — the result of all enabled edits
    var editing = !!(op && active && cur && cur.op === op), idx = editing ? op.edits.indexOf(cur.e) : op ? op.edits.length : 0;
    var e = editing ? cur.e : null, R = editing ? region(e) : null;
    var back = new Buckets(), front = new Buckets();
    // what the part would hide is fainter; with the part hidden, nothing is
    function put(isFront, col, al, w, dash, a, b){ isFront = isFront || !showPart; (isFront ? front : back).seg(col, isFront ? al : al * 0.5, w, dash, a, b); }
    if(op && showPath){
      var inp = editing ? evaluate(op, idx) : null, out = evaluate(op, editing ? idx + 1 : idx);
      // trim preview: what goes away, as a faint dashed ghost
      if(R && e.type === 'trim' && e.on) inp.segs.forEach(function(s){
        var kill = killMask(s, R, e.mode);
        for(var i = 0; i < s.pts.length - 1; i++) if(kill[i] && kill[i + 1]) put(facing(s.nrm[i]) > -0.08, COL.hit, 0.55, 1, true, P(s.pts[i], c), P(s.pts[i + 1], c));
      });
      out.segs.forEach(function(s){
        for(var i = 0; i < s.pts.length - 1; i++){
          var col = s.f[i] !== 100 ? COL.feed : COL.work, w = s.f[i] !== 100 ? 1.4 : 1;
          if(R && e.type === 'feeds' && e.on && R(s.pts[i])){ col = COL.hit; w = 1.6; }
          put(facing(s.nrm[i]) > -0.08, col, 0.95, w, false, P(s.pts[i], c), P(s.pts[i + 1], c));
        }
      });
      // links edit preview: the links it rebuilds in white, the shape they had faint
      if(R && e.type === 'links' && e.on) deriveLinks(op, inp).forEach(function(L){
        if(!linkMatches(L, R, e.filter)) return;
        var old = linkPts(L); for(var j = 0; j < old.length - 1; j++) put(true, COL.hit, 0.22, 1, true, P(old[j], c), P(old[j + 1], c));
      });
      deriveLinks(op, out).forEach(function(L){
        var hit = editing && e.type === 'links' && L.mod === idx;
        var isF = hit || facing([(L.na[0] + L.nb[0]) / 2, (L.na[1] + L.nb[1]) / 2]) > -0.08, p = linkPts(L);
        for(var i = 0; i < p.length - 1; i++){
          var lifted = LIFTED[L.type], col = hit ? COL.hit : !lifted ? COL.work : i === 0 ? COL.retract : COL.rapid;
          put(isF, col, hit ? 1 : 0.85, hit ? 1.6 : 1, !hit && lifted && i > 0, P(p[i], c), P(p[i + 1], c));
        }
      });
      // approach and return of the operation: rapid down to the first cut, up from the last
      if(out.segs.length){
        var f0 = out.segs[0].pts[0], l0 = out.segs[out.segs.length - 1], lp = l0.pts[l0.pts.length - 1], zs = G.H + DEFAULT_RULES.safe + 6;
        put(true, COL.rapid, 0.85, 1, true, P([f0[0], f0[1], zs], c), P(f0, c));
        put(true, COL.retract, 0.85, 1, false, P(lp, c), P([lp[0], lp[1], zs], c));
      }
    }
    if(showPart) paintFloor(c);
    back.flush();
    if(showPart) paintPart(c);
    front.flush();
    // the region shows only while its edit is open (pencil); an applied edit shows just its result
    handles = [];
    if(editing){
      if(cur.prevCurve && drawing()) paintCurve(cur.prevCurve.curve, true, c, 0.3, false, e, cur.prevCurve.shape);
      paintRegion(e, c, true, op);
    }
  }
  function poly(pts, c){ ctx.beginPath(); pts.forEach(function(p, i){ var q = P(p, c); if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
  // the part: the token greys (fg over bg) mixed to a solid colour, so it hides what is behind it
  function grey(k){ var b = TH.base.split(',').map(Number), i = TH.ink.split(',').map(Number); k = inkA(k);
    return 'rgb(' + b.map(function(v, j){ return Math.round(v + (i[j] - v) * k); }).join(',') + ')'; }
  function paintFloor(c){
    poly([[-G.fx, -G.fy, 0], [G.fx, -G.fy, 0], [G.fx, G.fy, 0], [-G.fx, G.fy, 0]], c);
    ctx.fillStyle = ink(.04); ctx.fill();
    ctx.strokeStyle = ink(.12); ctx.lineWidth = 1; ctx.stroke();
  }
  function paintPart(c){
    var N = 72, rb = G.R0, rt = bossR(G.H), Pb = stadiumLen(rb), Pt = stadiumLen(rt), bot = [], top = [];
    for(var i = 0; i < N; i++){ bot.push(stadiumAt(Pb * i / N, rb)); top.push(stadiumAt(Pt * i / N, rt)); }
    ctx.lineWidth = 1;
    for(var j = 0; j < N; j++){
      var a = bot[j], b = bot[(j + 1) % N], fa = facing([(a.nx + b.nx) / 2, (a.ny + b.ny) / 2]);
      if(fa <= -0.02) continue;
      var t1 = top[j], t2 = top[(j + 1) % N];
      poly([[a.x, a.y, 0], [b.x, b.y, 0], [t2.x, t2.y, G.H], [t1.x, t1.y, G.H]], c);
      ctx.fillStyle = ctx.strokeStyle = grey(0.07 + 0.09 * Math.max(0, fa)); ctx.fill(); ctx.stroke();
    }
    poly(top.map(function(q){ return [q.x, q.y, G.H]; }), c);
    ctx.fillStyle = T.sp > 0 ? grey(0.17) : grey(0.05); ctx.fill();
    ctx.strokeStyle = ink(.24); ctx.stroke();
    poly(bot.map(function(q){ return [q.x, q.y, 0]; }), c);
    ctx.strokeStyle = ink(.16); ctx.stroke();
  }
  function paintRegion(e, c, live, op){
    var al = live ? 1 : 0.45;
    if(e.zr.on){
      var x0 = -G.Lh - G.R0 - 12, x1 = G.Lh + G.R0 + 12, y0 = -G.R0 - 12, y1 = G.R0 + 12;
      [e.zr.lo, e.zr.hi].forEach(function(z, k){
        var corners = [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
        poly(corners, c);
        ctx.fillStyle = 'rgba(' + COL.z + ',' + (0.1 * al).toFixed(3) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(' + COL.z + ',' + (0.85 * al).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.stroke();
        if(!live) return;
        // the handle rides the corner that is furthest right on screen, so it stays reachable
        var best = null;
        corners.forEach(function(p){ var q = P(p, c); if(q[0] < W - 90 && (!best || q[0] > best[0])) best = q; });
        if(!best) best = P(corners[1], c);
        ctx.fillStyle = 'rgb(' + COL.z + ')'; ctx.beginPath(); ctx.arc(best[0], best[1], 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = scene(1); ctx.lineWidth = 2; ctx.stroke();
        ctx.font = '400 11px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
        label('Z ' + fmt1(z), best[0] + 12, best[1], 'rgb(' + COL.z + ')');
        handles.push({kind:'z', k:k, x:best[0], y:best[1]});
      });
    }
    if(e.curve && e.curve.length) paintCurve(e.curve, e.closed, c, al, live, e, shapeOf(e));
  }
  function wline(pts, c){ ctx.beginPath(); pts.forEach(function(p, i){ var q = P(p, c); if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); }
  function paintCurve(cu, closed, c, al, live, e, shape){
    var zTop = e && e.zr.on ? e.zr.hi : G.H + 4, zBot = e && e.zr.on ? e.zr.lo : 0, dr = live && drawing();
    var W96 = ink(0.96 * al);
    if(CUT_SHAPES[shape]){
      if(cu.length === 2) paintCut(cu[0], cu[1], c, al, zBot, zTop);
      else if(dr && mouse){ var q = P(cu[0], c); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = W96; ctx.lineWidth = 1.5; ctx.stroke(); }
    } else {
      // the contour on the points (on the plane or on the part), the spline smoothed through them
      var path = shape === 'spline' ? splinePts(cu, closed) : cu, flat = closed ? (shape === 'spline' ? path : cu) : null;
      // the prism it cuts through the toolpath: dashed outlines below and above + verticals at the points
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = ink(0.4 * al);
      ctx.beginPath();
      if(flat) [zBot, zTop].forEach(function(z){
        flat.forEach(function(p, i){ var q = P([p[0], p[1], z], c); if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
        var q0 = P([flat[0][0], flat[0][1], z], c); ctx.lineTo(q0[0], q0[1]);
      });
      cu.forEach(function(p){ var a = P([p[0], p[1], zBot], c), b = P([p[0], p[1], zTop], c); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke(); ctx.setLineDash([]);
      wline(path, c);
      if(closed) ctx.closePath();
      else if(dr && mouse) ctx.lineTo(mouse.x, mouse.y);
      ctx.strokeStyle = W96; ctx.lineWidth = 1.5; ctx.stroke();
      if(closed){ ctx.fillStyle = ink(0.05 * al); ctx.fill(); }
    }
    if(!live) return;
    cu.forEach(function(p, i){
      var q = P(p, c), near = dr && !CUT_SHAPES[shape] && i === 0 && cu.length >= 3 && mouse && Math.hypot(mouse.x - q[0], mouse.y - q[1]) < 10;
      var r = near ? 5 : 3.5;
      ctx.fillStyle = near ? COL.feed : COL.hit; ctx.strokeStyle = scene(1); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(q[0] - r, q[1] - r, r * 2, r * 2); ctx.fill(); ctx.stroke();
      handles.push({kind:'v', i:i, x:q[0], y:q[1]});
    });
  }
  // a cut plane: vertical, through a→b, across the floor; the arrow points to the side the edit works on
  function paintCut(a, b, c, al, zBot, zTop){
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    // the line clipped to the floor rectangle
    var t0 = -1e4, t1 = 1e4;
    [[dx, a[0], G.fx], [dy, a[1], G.fy]].forEach(function(v){
      if(Math.abs(v[0]) < 1e-9) return;
      var ta = (-v[2] - v[1]) / v[0], tb = (v[2] - v[1]) / v[0];
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    });
    var A = [a[0] + dx * t0, a[1] + dy * t0], Bp = [a[0] + dx * t1, a[1] + dy * t1];
    poly([[A[0], A[1], zBot], [Bp[0], Bp[1], zBot], [Bp[0], Bp[1], zTop], [A[0], A[1], zTop]], c);
    ctx.fillStyle = ink(0.07 * al); ctx.fill();
    ctx.strokeStyle = ink(0.5 * al); ctx.lineWidth = 1; ctx.stroke();
    // the drawn segment
    wline([a, b], c); ctx.strokeStyle = ink(0.96 * al); ctx.lineWidth = 1.5; ctx.stroke();
    // arrow: from the middle of the plane to the working side (left of a→b)
    var zm = (zBot + zTop) / 2, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zm], nx = -dy, ny = dx, L = 12;
    var head = [m[0] + nx * L, m[1] + ny * L, zm];
    wline([m, head], c); ctx.strokeStyle = ink(al); ctx.lineWidth = 2; ctx.stroke();
    var p = P(head, c), q = P([m[0] + nx * (L - 3), m[1] + ny * (L - 3), zm], c), ux = p[0] - q[0], uy = p[1] - q[1], ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    ctx.beginPath(); ctx.moveTo(p[0] + ux * 2, p[1] + uy * 2); ctx.lineTo(p[0] - ux * 7 - uy * 4, p[1] - uy * 7 + ux * 4); ctx.lineTo(p[0] - ux * 7 + uy * 4, p[1] - uy * 7 - ux * 4); ctx.closePath();
    ctx.fillStyle = ink(al); ctx.fill();
  }
  // where a region shows on screen: its right-most point (for placing the edit bar next to it)
  function regionAnchor(e){
    trig(); var c = centre(), best = null;
    var pts = (e.curve || []).slice();
    if(e.zr.on) pts.push([G.Lh + G.R0 + 12, -G.R0 - 12, e.zr.hi]);
    pts.forEach(function(p){ var q = P(p, c); if(q[0] < W - 60 && (!best || q[0] > best.x)) best = {x:q[0], y:q[1]}; });
    return best;
  }
  /* picking a point for the drawing tools: Free — on the horizontal plane at mid-height;
     On Surface — on the part (boss or floor) under the cursor */
  function onPlane(X, Y){ var w = unproject(X, Y, G.drawZ); return w ? [w[0], w[1], G.drawZ] : null; }
  function solidAt(x, y, z){
    if(z >= 0 && z <= G.H && spineDist(x, y) <= bossR(z)) return true;
    return z <= 0 && z >= -1 && Math.abs(x) <= G.fx && Math.abs(y) <= G.fy;
  }
  function onSurface(X, Y){
    var c = centre(), a = (X - c[0]) / cam.s, v = (Y - c[1]) / cam.s;
    function at(t){ var y1 = T.sp * v + T.cp * t, z = -T.cp * v + T.sp * t; return [T.cy * a + T.sy * y1, -T.sy * a + T.cy * y1, z]; }
    // march from the viewer into the scene, then refine the first hit
    var prev = 260;
    for(var t = 260; t > -260; t -= 1.5){
      var p = at(t);
      if(solidAt(p[0], p[1], p[2])){
        var lo = t, hi = prev;
        for(var k = 0; k < 10; k++){ var mid = (lo + hi) / 2, q = at(mid); if(solidAt(q[0], q[1], q[2])) lo = mid; else hi = mid; }
        return at(hi);
      }
      prev = t;
    }
    return null;
  }
  function pickPoint(X, Y){ trig(); return dbar.state.surface ? (onSurface(X, Y) || onPlane(X, Y)) : onPlane(X, Y); }
  // Normal: the nearest toolpath point under the cursor → a cut across the passes there
  function pickNormal(X, Y){
    trig();
    var c = centre(), st = evaluate(cur.op, cur.op.edits.indexOf(cur.e)), best = null, bd = 24;
    st.segs.forEach(function(s){
      for(var i = 0; i < s.pts.length; i += 2){
        var q = P(s.pts[i], c), d = Math.hypot(q[0] - X, q[1] - Y);
        if(d < bd){ bd = d; best = {p:s.pts[i], n:s.nrm[i]}; }
      }
    });
    if(!best) return null;
    var p = best.p, n = best.n, L = 12;
    return [[p[0] - n[0] * L, p[1] - n[1] * L, p[2]], [p[0] + n[0] * L, p[1] + n[1] * L, p[2]]];
  }
  function label(t, x, y, col){
    var w = ctx.measureText(t).width + 8;
    ctx.fillStyle = scene(.8); ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x - 4, y - 8, w, 16, 4); else ctx.rect(x - 4, y - 8, w, 16);
    ctx.fill(); ctx.fillStyle = col; ctx.fillText(t, x, y + 0.5);
  }

  /* ---------- pointer: click — point / handle, drag — orbit, middle / right / Shift — pan, wheel — zoom ---------- */
  var drag = null;
  // handles come from the last paint: paint now, so a fast click never hits stale positions
  function syncHandles(){ if(!active) return; if(raf){ cancelAnimationFrame(raf); raf = 0; } paint(); }
  function hitHandle(x, y){
    syncHandles();
    var best = null, bd = 12;
    handles.forEach(function(h){ var d = Math.hypot(h.x - x, h.y - y); if(d < bd){ bd = d; best = h; } });
    return best;
  }
  function local(e){ var r = cv.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; }
  function mine(){ return !!(cur && cur.op === curOp()); }
  // Z handles snap between pass levels, so a plane never sits on a pass (Shift — free)
  function snapZ(op, z, free){
    if(free) return Math.round(z * 10) / 10;
    var lv = levels(op), cand = [0, G.H + 4];
    for(var i = 0; i < lv.length - 1; i++) cand.push((lv[i] + lv[i + 1]) / 2);
    cand.push(lv[0] + 0.5); cand.push(lv[lv.length - 1] - 0.5);
    var best = cand[0]; cand.forEach(function(v){ if(Math.abs(v - z) < Math.abs(best - z)) best = v; });
    return Math.round(best * 10) / 10;
  }
  cv.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  cv.addEventListener('pointerdown', function(e){
    var m = local(e);
    MENU.close();
    if(e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey && !(mine() && hitHandle(m.x, m.y)))) drag = {kind:'pan', x:m.x, y:m.y, ox:cam.ox, oy:cam.oy, moved:true};
    else if(e.button === 0){
      var h = mine() ? hitHandle(m.x, m.y) : null;
      if(h && !(h.kind === 'v' && drawing())) drag = {kind:h.kind, h:h, x:m.x, y:m.y, z0:h.kind === 'z' ? (h.k ? cur.e.zr.hi : cur.e.zr.lo) : 0, moved:false};
      else drag = {kind:'orbit', x:m.x, y:m.y, yaw:cam.yaw, pitch:cam.pitch, moved:false};
    } else return;
    cv.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function(e){
    var m = local(e); mouse = m;
    if(!drag){
      var h = mine() ? hitHandle(m.x, m.y) : null, dr = drawing();
      cv.style.cursor = !h ? (dr ? 'crosshair' : 'grab')
        : h.kind === 'z' ? 'ns-resize'
        : dr ? (h.i === 0 && cur.e.curve.length >= 3 ? 'pointer' : 'crosshair') : 'move';
      if(dr) draw();
      return;
    }
    var dx = m.x - drag.x, dy = m.y - drag.y;
    if(!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    drag.moved = true;
    if((drag.kind === 'z' || drag.kind === 'v') && !mine()){ drag = null; return; }
    if(drag.kind === 'pan'){ cam.ox = drag.ox + dx; cam.oy = drag.oy + dy; draw(); }
    else if(drag.kind === 'orbit'){
      cv.style.cursor = 'grabbing';
      var y = drag.yaw + dx * 0.008, p = Math.max(-1.5, Math.min(1.5, drag.pitch + dy * 0.006));
      if(window.viewCube) window.viewCube.set(y, p, false); else { cam.yaw = y; cam.pitch = p; draw(); }
    } else if(drag.kind === 'z'){
      var zr = cur.e.zr, z = snapZ(cur.op, drag.z0 - dy / (cam.s * Math.max(0.2, T.cp)), e.shiftKey);
      z = Math.max(0, Math.min(G.H + 4, z));
      if(drag.h.k) zr.hi = Math.max(z, zr.lo + 0.5); else zr.lo = Math.min(z, zr.hi - 0.5);
      refresh(true);
    } else if(drag.kind === 'v'){
      var w = pickPoint(m.x, m.y); if(w){ cur.e.curve[drag.h.i] = w; refresh(true); }
    }
  });
  cv.addEventListener('pointerup', function(e){
    var d = drag; drag = null; if(!d) return;
    if(d.kind === 'z' || d.kind === 'v'){ refresh(); return; }
    if(d.kind !== 'orbit' || d.moved){ cv.style.cursor = drawing() ? 'crosshair' : 'grab'; return; }
    if(!mine()) return;
    var m = local(e);
    // a click while the edit is open (not drawing): the edit bar moves to it — unless it was moved by hand
    if(!drawing()){ if(!cur.pos){ cur.anchor = {x:m.x, y:m.y}; barPlace(); } return; }
    var c = cur.e.curve, shape = shapeOf(cur.e);
    if(shape === 'normal'){
      var cut = pickNormal(m.x, m.y);
      if(!cut){ tip('Click on the toolpath: the cut goes across the passes at that point'); return; }
      cur.e.curve = cut; finishShape({x:m.x, y:m.y}); return;
    }
    syncHandles();
    var first = handles.filter(function(h){ return h.kind === 'v' && h.i === 0; })[0];
    if(shape !== 'line' && first && c.length >= 3 && Math.hypot(first.x - m.x, first.y - m.y) < 10){ closeCurve(); return; }
    var w = pickPoint(m.x, m.y);
    if(!w){ tip('Tilt the view to draw: the points lie on a horizontal plane (or switch to On Surface)'); return; }
    c.push(w);
    if(shape === 'line' && c.length === 2){ finishShape({x:m.x, y:m.y}); return; }
    refresh();
  });
  cv.addEventListener('pointercancel', function(){ drag = null; });
  cv.addEventListener('dblclick', function(){ if(drawing()) closeCurve(); });
  cv.addEventListener('pointerleave', function(){ mouse = null; if(drawing()) draw(); });
  cv.addEventListener('wheel', function(e){
    e.preventDefault();
    var m = local(e), c = centre(), k = Math.exp(-e.deltaY * 0.0015), s2 = Math.max(0.5, Math.min(60, cam.s * k));
    // the point under the cursor stays put
    var vx = (m.x - c[0]) / cam.s, vy = (m.y - c[1]) / cam.s;
    cam.ox += vx * (cam.s - s2); cam.oy += vy * (cam.s - s2);
    cam.s = s2; draw();
  }, {passive:false});
  if(window.ResizeObserver) new ResizeObserver(function(){ if(shown) resize(); }).observe(vp);
  if(window.ResizeObserver) new ResizeObserver(function(){ if(shown){ draw(); barPlace(); } }).observe(dock);
  window.addEventListener('resize', function(){ if(shown) resize(); });
  window.tpView = {
    setCamera:function(c){ cam.yaw = c.yaw; cam.pitch = c.pitch; draw(); },
    fit:function(){ if(shown) fit(); }
  };
  // a filter switched: the part or the toolpath comes and goes
  [fPart, fPath].forEach(function(f){ if(f) new MutationObserver(draw).observe(f, {attributes:true, attributeFilter:['class']}); });

  /* ---------- the edit bar on the 3D view ---------- */
  var bar = document.createElement('div'); bar.className = 'tpe-bar'; bar.hidden = true;
  vp.appendChild(bar);
  var tipEl = document.createElement('div'); tipEl.className = 'tpe-tip'; tipEl.hidden = true; vp.appendChild(tipEl);
  var toastEl = document.createElement('div'); toastEl.className = 'tpe-toast'; toastEl.hidden = true; vp.appendChild(toastEl);
  var tipTimer = 0, tipMsg = '', toastTimer = 0;
  function tip(msg){ tipMsg = msg; clearTimeout(tipTimer); tipTimer = setTimeout(function(){ tipMsg = ''; barSync(); }, 2600); barSync(); }
  function toast(msg, act, fn){
    toastEl.innerHTML = '<span>' + msg + '</span>' + (act ? '<button class="tact">' + act + '</button>' : '');
    toastEl.hidden = false; barPlace();
    var b = toastEl.querySelector('button'); if(b) b.onclick = function(ev){ ev.stopPropagation(); toastEl.hidden = true; fn(); };
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.hidden = true; undo = null; }, 5000);
  }
  /* the drawing panel (shared-ui/drawbar.js): in the view's left column, under the Filters, while a
     region is being drawn */
  var draw0 = window.ENCY_DRAWBAR;
  var dbar = draw0 ? draw0.create(document.getElementById('vpLeft') || vp, {tool:'polyline',
    onTool:function(id){
      if(!drawing()) return;
      // Polyline ⇄ Spline keep the points; a cut (Line / Normal) starts over
      var keep = !CUT_SHAPES[id] && !CUT_SHAPES[shapeOf(cur.e)];
      cur.e.shape = id; if(!keep) cur.e.curve = [];
      refresh();
    },
    onSurface:function(){ barSync(); }
  }) : {state:{tool:'polyline', surface:false, wand:false}, show:function(){}, el:document.createElement('div')};
  var TOOL_TIPS = {
    polyline:function(n){ return n < 3 ? 'Polyline: click to place the points' : 'Click the first point, double-click or press Enter to close · Backspace removes the last point'; },
    spline:function(n){ return n < 3 ? 'Spline: click to place the points the curve runs through' : 'Click the first point, double-click or press Enter to close · Backspace removes the last point'; },
    line:function(n){ return n ? 'Click the end of the cut line · the edit works on the side of the arrow' : 'Line: click the start of the cut line'; },
    normal:function(){ return 'Normal: click on the toolpath — the cut goes across the passes at that point'; }
  };
  // the edit bar sits next to its anchor (the end of the drawing, then the last click on the view);
  // the drawing tip stays centred at the top
  function barPlace(){
    var f = freeSpan(), cx = (f[0] + f[1]) / 2;
    toastEl.style.left = cx + 'px';
    var an = cur && cur.anchor;
    // moved by hand: stays where it was put (kept inside the view)
    if(!bar.hidden && cur && cur.pos){
      var bw = bar.offsetWidth, bh0 = bar.offsetHeight;
      var px = Math.max(8, Math.min(W - bw - 8, cur.pos.x)), py = Math.max(8, Math.min(H - bh0 - 8, cur.pos.y));
      bar.classList.add('at'); bar.style.left = px + 'px'; bar.style.top = py + 'px';
      return;
    }
    if(bar.hidden || !an){
      bar.classList.remove('at'); bar.style.left = cx + 'px'; bar.style.top = '';
      tipEl.classList.remove('at'); tipEl.style.left = cx + 'px'; tipEl.style.top = '';
      return;
    }
    var w = bar.offsetWidth, bh = bar.offsetHeight, x = an.x + 16, y = an.y + 16;
    if(x + w > f[1] - 8) x = an.x - 16 - w;                    // no room on the right: the left of the cursor
    if(y + bh > H - 56) y = an.y - 16 - bh;                    // no room below: above the cursor
    x = Math.max(f[0], Math.min(f[1] - w - 8, x)); y = Math.max(8, Math.min(H - bh - 56, y));
    bar.classList.add('at'); bar.style.left = x + 'px'; bar.style.top = y + 'px';
    tipEl.classList.add('at'); tipEl.style.left = x + 'px'; tipEl.style.top = (y + 42) + 'px';
  }
  function bbtn(id, icon, text, title){
    return '<button class="tpe-b" id="' + id + '" title="' + title + '">' + (icon ? '<span class="tpe-ic">' + icon + '</span>' : '') + '<span class="t">' + text + '</span>' + IC.chev + '</button>';
  }
  // a Feeds edit's value in its unit: % of the operation feed, or mm/min
  function feedValue(e){ return e.feedUnit === 'mm/min' ? Math.round(FEED * e.feed / 100) : Math.round(e.feed * 10) / 10; }
  function feedText(e){ return feedValue(e) + (e.feedUnit === 'mm/min' ? ' mm/min' : '%'); }
  function plural(n, unit){ return n + ' ' + (n === 1 ? {passes:'pass', links:'link', retracts:'retract'}[unit] : unit); }
  // the drawing panel: while a region is drawn here, and all the time the inspector's Job tab is open
  // (its geometry is picked and drawn there, as in ENCY); never on the Simulation tab
  var jobOn = false;
  function dbarSync(){ dbar.show(!simOn && (jobOn || !!(active && mine() && drawing()))); }
  function barSync(){
    var on = !!(active && mine()), dr = on && drawing();
    // while drawing: the drawing panel; when the shape is done: the edit bar next to it
    dbarSync(); bar.hidden = !on || dr; tipEl.hidden = true;
    if(dr){
      var n = cur.e.curve.length, m = tipMsg || TOOL_TIPS[shapeOf(cur.e)](n);
      if(dbar.state.surface) m += ' · On Surface: points land on the part';
      if(cur.prevCurve) m += ' · Esc keeps the old region';
      tipEl.textContent = m; tipEl.hidden = false; tipEl.classList.remove('warn');
      barPlace(); return;
    }
    if(!on) return;
    var e = cur.e, Ty = TYPES[e.type], idx = cur.op.edits.indexOf(e), h = '';
    // row 1 (the light frame): what is edited and how · ✓ ✕
    h += '<div class="tpe-row"><span class="tpe-op"><span class="tpe-ic">' + Ty.icon + '</span><span>' + (idx + 1) + '. ' + Ty.name + '</span></span><span class="tpe-sep"></span>';
    if(e.type === 'trim')  h += bbtn('tpeMode', '', TRIM_MODES[e.mode], 'What to remove');
    if(e.type === 'links') h += bbtn('tpeMode', '', FILTERS[e.filter], 'Links of the region to rebuild: all, short (up to the short link length) or long') +
                                bbtn('tpeType', '', '→ ' + e.linkType, 'The new shape of these links');
    if(e.type === 'feeds') h += bbtn('tpeMode', '', 'Feed ' + feedText(e), 'Feed in the region (the operation feed is F' + FEED + ')');
    var hc = hasCurve(e) || (e.curve && e.curve.length);
    h += '<button class="tpe-b" id="tpeReg" title="Region tools: Z range, draw region' + (e.type === 'links' ? '' : ', clear') + '"><span class="tpe-ic">' + (e.zr.on && !hc ? IC.zr : IC.curve) + '</span><span class="t">Region</span>' + IC.chev + '</button>';
    var fx = effect(cur.op, idx, e);
    h += '<span class="tpe-push"></span>' +
      '<button class="tpe-i tpe-ok' + (!fx ? ' dis' : '') + '" id="tpeOk" title="Done · Enter">' + IC.ok + '</button>' +
      '<button class="tpe-i tpe-x" id="tpeX" title="Cancel · Esc">' + IC.x + '</button></div>';
    // the dark inset: what the edit does (count · retracts · time), a note when something is off,
    // and for a trim — the links across the gaps it makes (its Links rules)
    var meta, warn = false, msg = tipMsg;
    if(!fx) meta = 'No preview';
    else {
      meta = plural(fx.n, Ty.unit);
      if(e.type === 'links' && fx.n === 0){
        warn = true;
        if(!msg) msg = 'No ' + FILTERS[e.filter].toLowerCase() + ' in the region · there: ' + fx.inR.short + ' short, ' + fx.inR.long + ' long';
      }
      if(e.type === 'links' && fx.fallback){ warn = true; meta += ' · ' + fx.fallback + ' collide'; if(!msg) msg = fx.fallback + ' of them would cut the part as ' + e.linkType + ' — retracted to the safe level instead'; }
      if(e.type !== 'links' && fx.n === 0){ warn = true; if(!msg) msg = 'The region does not touch the toolpath'; }
      var dt = deltaText(delta(cur.op, idx, e)); if(dt) meta += ' · ' + dt;
    }
    if(!msg && !fx) msg = 'Set the region: draw it or use a Z range';
    if(!msg && e.zr.on && cur.tool === 'z') msg = 'Drag the Z handles · they snap between passes, Shift — free';
    // what can be changed goes first; the information (count · retracts · time, notes) closes the inset
    h += '<div class="tpe-inset">';
    // a trim's Links rules: one collapsed row by default (shared with the list's "Links rules")
    if(e.type === 'trim') h += '<div class="tpe-rules tpe-rules-h"></div>' + (e.rulesOpen ? '<div class="tpe-rules tpe-rules-b"></div>' : '') + '<div class="tpe-line"></div>';
    h += '<div class="tpe-meta' + (!fx ? ' none' : warn ? ' warn' : '') + '">' + meta + '</div>' +
      (msg ? '<div class="tpe-msg' + (warn ? ' warn' : '') + '">' + msg + '</div>' : '') + '</div>';
    bar.innerHTML = h;
    var head = bar.querySelector('.tpe-rules-h');
    if(head){
      var hr = INS.buildRow({label:'Links rules', shev:'open', ghead:'rules', headonly:true, nomore:true});
      hr.classList.add('tpe-rhead'); hr.classList.toggle('collapsed', !e.rulesOpen); delete hr.dataset.ghead;
      hr.title = 'Links for the gaps this trim makes';
      head.appendChild(hr);
    }
    var slot = bar.querySelector('.tpe-rules-b');
    if(slot) slot.appendChild(rulesRows(e, cur.op, 1, cutLinks(cur.op, idx, e)));
    barPlace();
  }
  /* ---------- Links rules: the inspector's parameter rows (app.js buildRow), in the bar and in the list ---------- */
  function mmPct(v, op){ return v + ' %Ø (' + Math.round(v / 100 * 2 * op.tool) + ' mm)'; }
  var RULES = [
    {g:'safe', label:'Safe motions', rows:[
      {k:'safe', label:'Safe level', ctl:'input', fmt:function(r){ return r.safe + ' mm from the part'; }}]},
    {g:'links', label:'Links', rows:[
      {k:'entry', label:'Entry/Exit links', ctl:'dropdown', opts:LINK_TYPES},
      {k:'shortType', label:'Short links', ctl:'dropdown', opts:LINK_TYPES, count:'short', sub:[
        {k:'shortPct', label:'Short link max distance', ctl:'input', fmt:function(r, op){ return mmPct(r.shortPct, op); }}]},
      {k:'longType', label:'Long links', ctl:'dropdown', opts:LINK_TYPES, count:'long'},
      {k:'radius', label:'Linking Radius', ctl:'input', fmt:function(r){ return r.radius + ' mm'; }}]},
    {g:'leads', label:'Leads', rows:[
      {k:'engage', label:'Engage', ctl:'dropdown', opts:LEAD_TYPES},
      {k:'retract', label:'Retract', ctl:'dropdown', opts:LEAD_TYPES},
      {k:'leadsShort', label:'Use leads for short links', ctl:'toggle'}]},
    {g:'dist', label:'Distances', rows:[
      {k:'feedPct', label:'Feed distance', ctl:'input', fmt:function(r, op){ return mmPct(r.feedPct, op); }}]}
  ];
  function ruleDef(k){
    var f = null;
    RULES.forEach(function(g){ g.rows.forEach(function(q){ if(q.k === k) f = q; (q.sub || []).forEach(function(s){ if(s.k === k) f = s; }); }); });
    return f;
  }
  // rows for the groups of the rules; level — indent of the group heads (0 in the bar, 2 in the list)
  function rulesRows(e, op, level, counts){
    var frag = document.createDocumentFragment(), r = e.rules, fold = e.fold || (e.fold = {});
    function add(p, lv, rk, rg, closed){
      var row = INS.buildRow(p);
      row.classList.add('tpe-rrow'); row.dataset.eid = e.id; delete row.dataset.ghead;
      var itl = row.querySelector('.itl'); if(itl) itl.className = 'itl' + (lv ? ' i' + lv : '');
      if(rk) row.dataset.rk = rk;
      if(rg){ row.dataset.rg = rg; row.classList.toggle('collapsed', !!closed); }
      frag.appendChild(row);
    }
    function params(q){
      var p = {label:q.label + (q.count && counts ? ' <i class="tpe-n">' + counts[q.count] + '</i>' : ''), nomore:true, ctl:q.ctl};
      if(q.sub){ p.shev = 'open'; p.ghead = 'rules'; }
      if(q.ctl === 'dropdown'){ p.val = r[q.k]; p.opts = q.opts; }
      if(q.ctl === 'input') p.val = q.fmt(r, op);
      if(q.ctl === 'toggle') p.on = !!r[q.k];
      return p;
    }
    RULES.forEach(function(g){
      add({label:g.label, shev:'open', ghead:'rules', headonly:true, nomore:true}, level, null, g.g, fold[g.g]);
      if(fold[g.g]) return;
      g.rows.forEach(function(q){
        var sk = q.sub ? g.g + '.' + q.k : null;
        add(params(q), level + 1, q.k, sk, sk && fold[sk]);
        if(q.sub && !fold[sk]) q.sub.forEach(function(s){ add(params(s), level + 2, s.k); });
      });
    });
    return frag;
  }
  // clicks on the rules rows (bar and list): fold a group, pick a type, flip a switch, type a value
  function rulesClick(ev, e, op){
    var row = ev.target.closest('.tpe-rrow'); if(!row) return false;
    ev.stopPropagation();
    var fold = e.fold || (e.fold = {}), k = row.dataset.rk, q = k ? ruleDef(k) : null;
    if(row.dataset.rg && (!k || ev.target.closest('.shev'))){ MENU.close(); fold[row.dataset.rg] = !fold[row.dataset.rg]; refresh(); return true; }
    if(!q) return true;
    var dd = ev.target.closest('.dropdown');
    if(dd){
      if(dd.classList.contains('dd-open')){ MENU.close(); return true; }
      MENU.show(dd.getBoundingClientRect(), q.opts.map(function(o){
        return {label:o, cur:e.rules[k] === o, onPick:function(){ e.rules[k] = o; refresh(); }};
      }), dd, dd.getBoundingClientRect().width);
      return true;
    }
    MENU.close();
    if(ev.target.closest('.tgl')){ e.rules[k] = !e.rules[k]; refresh(); return true; }
    var box = ev.target.closest('.input'); if(box) editRule(box, e, k);
    return true;
  }
  // a value cell becomes editable in place: the number only; Enter / blur — keep, Esc — back
  function editRule(box, e, k){
    var v = box.querySelector('.v'); if(!v || v.isContentEditable) return;
    v.textContent = String(e.rules[k]); v.contentEditable = 'true'; box.classList.add('editing'); v.focus();
    var sel = window.getSelection(); sel.selectAllChildren(v);
    function done(save){
      v.removeEventListener('blur', onBlur); v.removeEventListener('keydown', onKey);
      if(save){ var n = parseFloat(v.textContent.replace(',', '.')); if(isFinite(n)) e.rules[k] = Math.max(0, n); }
      refresh();
    }
    function onBlur(){ done(true); }
    function onKey(ev){
      ev.stopPropagation();
      if(ev.key === 'Enter'){ ev.preventDefault(); v.blur(); }
      else if(ev.key === 'Escape'){ ev.preventDefault(); v.removeEventListener('blur', onBlur); done(false); }
    }
    v.addEventListener('blur', onBlur); v.addEventListener('keydown', onKey);
  }
  // links that a trim makes across its gaps, by kind (null — the trim is not applied)
  function cutLinks(op, idx, e){
    if(!e.on || !region(e)) return null;
    var n = {short:0, long:0};
    deriveLinks(op, evaluate(op, idx + 1)).forEach(function(L){ if(L.born === idx) n[L.kind]++; });
    return n;
  }
  // drag the edit bar by its top row (anywhere but its controls)
  var barDrag = null;
  bar.addEventListener('pointerdown', function(ev){
    if(ev.button !== 0 || !mine() || !ev.target.closest('.tpe-row') || ev.target.closest('button')) return;
    var r = bar.getBoundingClientRect();
    barDrag = {dx:ev.clientX - r.left, dy:ev.clientY - r.top, id:ev.pointerId};
    bar.setPointerCapture(ev.pointerId); bar.classList.add('dragging'); MENU.close();
    ev.preventDefault();
  });
  bar.addEventListener('pointermove', function(ev){
    if(!barDrag || !cur) return;
    var v = vp.getBoundingClientRect();
    cur.pos = {x:ev.clientX - v.left - barDrag.dx, y:ev.clientY - v.top - barDrag.dy};
    barPlace();
  });
  function barDragEnd(){ if(!barDrag) return; barDrag = null; bar.classList.remove('dragging'); }
  bar.addEventListener('pointerup', barDragEnd);
  bar.addEventListener('pointercancel', barDragEnd);
  bar.addEventListener('click', function(ev){
    if(ev.target.closest('.tpe-rhead')){ ev.stopPropagation(); if(mine()){ MENU.close(); cur.e.rulesOpen = !cur.e.rulesOpen; refresh(); } return; }
    if(ev.target.closest('.tpe-rrow')){ if(mine()) rulesClick(ev, cur.e, cur.op); return; }
    var b = ev.target.closest('button'); if(!b || !mine()) return;
    ev.stopPropagation();
    var e = cur.e;
    if(b.id === 'tpeOk'){ if(!b.classList.contains('dis')) commit(); return; }
    if(b.id === 'tpeX'){ cancel(); return; }
    if(b.classList.contains('dd-open')){ MENU.close(); return; }
    // every pick checks the session is still the same one
    function pick(fn){ return function(){ if(!cur || cur.e !== e) return; fn(); refresh(); }; }
    var items = [];
    if(b.id === 'tpeMode'){
      if(e.type === 'trim') items = Object.keys(TRIM_MODES).map(function(k){ return {label:TRIM_MODES[k], cur:e.mode === k, onPick:pick(function(){ e.mode = k; })}; });
      if(e.type === 'links') items = Object.keys(FILTERS).map(function(k){ return {label:FILTERS[k], cur:e.filter === k, onPick:pick(function(){ e.filter = k; })}; });
      if(e.type === 'feeds'){
        var list = FEED_PRESETS.indexOf(e.feed) < 0 ? FEED_PRESETS.concat([e.feed]).sort(function(a, b){ return a - b; }) : FEED_PRESETS;
        items = list.map(function(v){ return {label:v + '%  ·  F' + Math.round(FEED * v / 100), cur:e.feed === v, onPick:pick(function(){ e.feed = v; })}; });
      }
    }
    if(b.id === 'tpeType') items = LINK_TYPES.map(function(t){ return {label:t, cur:e.linkType === t, onPick:pick(function(){ e.linkType = t; })}; });
    if(b.id === 'tpeReg'){
      items = [
        {label:'Z range', icon:IC.zr, cur:e.zr.on, kbd:e.zr.on ? '✓' : '', onPick:pick(function(){
          e.zr.on = !e.zr.on; if(!drawing()) cur.tool = e.zr.on ? 'z' : null; })},
        {label:hasCurve(e) ? 'Draw new region' : 'Draw region', icon:IC.curve, cur:drawing(), onPick:pick(function(){ startCurve(); })}
      ];
      if(e.type !== 'links') items.push({sep:true}, {label:'Clear', icon:IC.clear, danger:true, dis:!e.zr.on && !(e.curve && e.curve.length), onPick:pick(function(){
        e.curve = null; e.closed = false; e.zr.on = false; cur.tool = null; cur.prevCurve = null; })});
    }
    MENU.show(b.getBoundingClientRect(), items, b, Math.max(150, b.getBoundingClientRect().width));
  });

  /* ---------- keyboard (capture: runs before the other panels' Esc handlers) ---------- */
  function popupOpen(){
    // the Automation window may stay open while the user works (recording) — it does not take the keys
    return !!document.querySelector('.dd-menu, .stpanel.open:not(.mcpanel), .simpop:not([hidden])') || vp.classList.contains('ar-open');
  }
  window.addEventListener('keydown', function(ev){
    if(!active || ev.defaultPrevented) return;
    var t = ev.target;
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
    if(ev.key === 'Escape' && document.querySelector('.dd-menu')){ MENU.close(); ev.stopPropagation(); return; }
    if(popupOpen()) return;                                   // Esc / Enter belong to the open popup
    if(mine()){
      if(ev.key === 'Escape'){
        ev.stopPropagation();
        // first Esc ends the drawing (the previous curve comes back), the next one cancels the edit
        if(drawing() && cur.e.curve.length && !cur.prevCurve){ cur.e.curve = []; refresh(); }
        else if(drawing() && (cur.prevCurve || region(cur.e) || cur.e.zr.on)) stopDrawing();
        else cancel();
      } else if(ev.key === 'Enter'){
        ev.preventDefault();
        // drawing: close the shape; nothing drawn but a Z range set — that is the region
        if(drawing()){ if(cur.e.curve.length >= 3) closeCurve(); else if(!cur.e.curve.length && cur.e.zr.on) stopDrawing(); }
        else if(region(cur.e)) commit();
      } else if((ev.key === 'Backspace' || ev.key === 'Delete') && drawing() && cur.e.curve.length){
        ev.preventDefault(); cur.e.curve.pop(); refresh();
      }
      return;
    }
    // no edit open: Delete removes the selected edit (with undo)
    var op = curOp();
    if(op && selId && (ev.key === 'Delete') && INS.activeTab() === 'Edits'){
      var e = editById(op, selId); if(e){ ev.preventDefault(); del(op, e); }
    }
  }, true);

  /* ---------- inspector: the Edits tab ---------- */
  function fmt1(v){ return (Math.round(v * 10) / 10).toFixed(1); }
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function dd(key, val){ return '<span class="dropdown" data-tpd="' + key + '"><span class="v">' + esc(val) + '</span><img class="i16" src="' + A.ddchev + '"></span>'; }
  function inp(key, val, unit){ val = String(val); return '<span class="input tpe-in"><input data-tpk="' + key + '" value="' + esc(val) + '" size="' + Math.max(2, val.length) + '" spellcheck="false">' + (unit ? '<em>' + unit + '</em>' : '') + '</span>'; }
  function tgl(key, on){ return '<img class="tgl' + (on ? ' on' : '') + '" data-tpt="' + key + '" src="' + (on ? A['tgl-on'] : A['tgl-off']) + '">'; }
  function prow(e, label, ctl, o){
    o = o || {};
    return '<div class="irow tpe-p' + (o.cls ? ' ' + o.cls : '') + '" data-eid="' + e.id + '"' + (o.head ? ' data-tpg="' + o.head + '"' : '') + '>' +
      '<div class="ilbl"><i class="tpe-gap"></i><div class="itl ' + (o.ind || 'i1') + '">' +
        (o.head ? '<img class="shev exp" src="' + A['shev-open'] + '">' : '<i class="shev"></i>') +
        '<span class="rlabel"><span>' + label + '</span></span></div></div>' +
      (ctl === null ? '' : '<div class="ictl' + (o.between ? ' between' : '') + '">' + ctl + '</div>') + '</div>';
  }
  function zRow(e){
    // the switch on its own row; its limits are child rows, shown only while it is on
    return prow(e, 'Z range', tgl('zr', e.zr.on), {between:true}) + (e.zr.on ?
      prow(e, 'Bottom', inp('zlo', fmt1(e.zr.lo), 'mm'), {ind:'i2'}) +
      prow(e, 'Top', inp('zhi', fmt1(e.zr.hi), 'mm'), {ind:'i2'}) : '');
  }
  function regRow(e){
    var t = regionText(e);
    return prow(e, 'Region', '<span class="roval' + (t === 'Not set' ? ' tpe-warn' : '') + '" title="' + esc(t) + '">' + t + '</span>');
  }
  function summary(op, i, e){
    if(!region(e)) return {t:'No region', warn:true};
    if(!e.on) return {t:'Off'};
    var fx = effect(op, i, e);
    if(fx.n === 0) return {t:e.type === 'links' ? 'No links in region' : 'Nothing in region', warn:true};
    // the delta (retracts · time) is on the bar while editing; here — in the tooltip of the count
    return {t:plural(fx.n, TYPES[e.type].unit) + (fx.fallback ? ' · ' + fx.fallback + ' collide' : ''), warn:!!fx.fallback,
            tip:deltaText(delta(op, i, e))};
  }
  function itemHtml(op, e, i){
    var s = summary(op, i, e), editing = !!(cur && cur.e === e), h = '';
    h += '<div class="irow tpe-item' + (e.open ? '' : ' collapsed') + (e.on ? '' : ' off') + (editing ? ' editing' : '') + (selId === e.id ? ' sel' : '') + (flashId === e.id ? ' flash' : '') + '" data-eid="' + e.id + '">' +
      '<div class="ilbl"><span class="tpe-num">' + (i + 1) + '</span><div class="itl">' +
        '<img class="shev exp" data-tpa="open" src="' + A['shev-open'] + '">' +
        '<span class="tpe-tic">' + TYPES[e.type].icon + '</span>' +
        '<span class="rlabel"><span>' + TYPES[e.type].name + '</span></span>' +
        (e.note ? '<span class="tpe-nic" title="' + esc(e.note) + '">' + IC.note + '</span>' : '') + '</div></div>' +
      // toggle · what it does · pencil · ⋮
      '<div class="ictl tpe-ictl">' + tgl('on', e.on) +
        '<span class="tpe-sum' + (s.warn ? ' tpe-warn' : '') + '"' + (s.tip ? ' title="' + s.tip + '"' : '') + '>' + s.t + '</span>' +
        '<button class="rowbtn tpe-pen' + (editing ? ' on' : '') + '" data-tpa="pen" title="' + (editing ? 'Done · Enter' : 'Edit in 3D') + '">' + INS.SVG.edit + '</button>' +
        '<img class="icn11" data-tpa="more" src="' + A.icn11 + '" title="More"></div></div>';
    if(!e.open) return h;
    if(e.type === 'trim'){
      h += prow(e, 'Mode', dd('mode', TRIM_MODES[e.mode]));
      h += regRow(e) + zRow(e);
      // its Links rules are edited on the bar in the view (pencil → Links rules), not in the list
    } else if(e.type === 'links'){
      h += prow(e, 'Rebuild', dd('filter', FILTERS[e.filter]));
      h += prow(e, 'Link type', dd('linkType', e.linkType));
      if(e.linkType === 'Skim') h += prow(e, 'Clearance', inp('skim', e.skim, 'mm above the part'));
      if(e.linkType === 'On Safe Surface') h += prow(e, 'Safe level', inp('lsafe', e.safe, 'mm above the part'));
      h += regRow(e) + zRow(e);
    } else if(e.type === 'feeds'){
      // one value, shown in the unit picked at the end of the field
      var fv = String(feedValue(e));
      h += prow(e, 'Feed', '<span class="input tpe-in tpe-uin"><input data-tpk="feedv" value="' + fv + '" size="' + Math.max(2, fv.length) + '" spellcheck="false">' +
        '<span class="tpe-unit" data-tpu="feed" title="Units">' + e.feedUnit + IC.chev + '</span></span>');
      h += regRow(e) + zRow(e);
    }
    if(e.noteEdit) h += '<div class="tpe-note" data-eid="' + e.id + '"><span class="input tpe-in tpe-in-wide"><input data-tpk="note" value="' + esc(e.note) + '" placeholder="Note for this edit" spellcheck="false"></span></div>';
    else if(e.note) h += '<div class="icap tpe-cap tpe-notecap" data-eid="' + e.id + '">' + esc(e.note) + '</div>';
    return h;
  }
  function render(){
    if(INS.activeTab() !== 'Edits') return;
    var row = selRow(), op = curOp();
    // split button, like "+ ▾" in the tree toolbar: + adds the shown type, ▾ lists the types
    INS.titleCtl.innerHTML = op ? '<span class="tpe-split">' +
      '<button class="tpe-sp-main" data-tpa="addlast" title="Add ' + TYPES[addType].name + '">' + INS.SVG.plus + '<span>' + TYPES[addType].name + '</span></button>' +
      '<button class="tpe-sp-chev" data-tpa="addmenu" title="Choose the edit type">' + IC.chev + '</button></span>' : '';
    if(!op){
      var mill = millRows()[0], isOp = row && row.dataset.type === 'operation';
      irows.innerHTML = '<div class="icap tpe-empty">' + (isOp ? 'Manual toolpath edits are shown on milling operations in this prototype.' : 'Select an operation in the tree to edit its toolpath.') + '</div>' +
        (mill ? '<div class="tpe-add tpe-goto"><button class="tact" data-tpa="goto" data-id="' + mill.dataset.id + '">Go to ' + esc(opOf(mill).name) + '</button></div>' : '');
      return;
    }
    var h = '<div class="tpe-list">';
    if(!op.edits.length) h += '<div class="icap tpe-empty">Manual changes on top of the calculated toolpath: trim it, rebuild links or change the feed on a part of it — add an edit with the button above. Edits run top to bottom; enabled ones are applied again after every recalculation.</div>';
    op.edits.forEach(function(e, i){ h += itemHtml(op, e, i); });
    h += '</div>';
    var st = irows.scrollTop;
    irows.innerHTML = h;
    irows.scrollTop = st;
    var ed = irows.querySelector('.tpe-item.editing'); if(ed) ed.scrollIntoView({block:'nearest'});
  }
  // a click that lands while an input commits: rebuild the list after the click, not under it
  var ptrDown = false, pendingRender = false;
  document.addEventListener('pointerdown', function(){ ptrDown = true; }, true);
  document.addEventListener('pointerup', function(){ ptrDown = false; if(pendingRender){ pendingRender = false; setTimeout(function(){ render(); }, 0); } }, true);
  function refresh(light){
    draw(); barSync();
    if(!light && !ptrDown) render();
    else {
      if(!light) pendingRender = true;
      var op = curOp(); if(!op) return;
      op.edits.forEach(function(e, i){
        var sum = irows.querySelector('.tpe-item[data-eid="' + e.id + '"] .tpe-sum'); if(!sum) return;
        var s = summary(op, i, e); sum.textContent = s.t; sum.classList.toggle('tpe-warn', !!s.warn); sum.title = s.tip || '';
      });
    }
  }
  /* inspector events — captured before the generic inspector handler */
  function within(ev){ return INS.activeTab() === 'Edits' && irows.contains(ev.target); }
  function select(id){
    selId = id;
    // in place, so a double-click still finds its row
    irows.querySelectorAll('.tpe-item').forEach(function(r){ r.classList.toggle('sel', r.dataset.eid === id); });
    draw();
  }
  irows.addEventListener('click', function(ev){
    if(!within(ev)) return;
    var t = ev.target;
    var a = t.closest('[data-tpa]'), d = t.closest('[data-tpd]'), g = t.closest('[data-tpg]'), tg = t.closest('[data-tpt]'), rowEl = t.closest('[data-eid]');
    if(a || d || g || tg || rowEl || t.closest('input')) ev.stopPropagation();
    if(t.closest('input')) return;
    if(a && a.dataset.tpa === 'goto'){ var r = tree.querySelector('.trow[data-id="' + a.dataset.id + '"]'); if(r) r.click(); return; }
    var op = curOp(); if(!op) return;
    var e = rowEl ? editById(op, rowEl.dataset.eid) : null;
    if(!e) return;
    // the unit at the end of a value field: % / mm/min
    var u = t.closest('[data-tpu]');
    if(u){
      if(u.classList.contains('dd-open')){ MENU.close(); return; }
      MENU.show(u.getBoundingClientRect(), ['%', 'mm/min'].map(function(x){
        return {label:x === '%' ? '% of F' + FEED : 'mm/min', cur:e.feedUnit === x, onPick:function(){ e.feedUnit = x; refresh(); }};
      }), u, 120);
      return;
    }
    if(!(d || (a && a.dataset.tpa === 'more'))) MENU.close();
    if(tg){
      if(tg.dataset.tpt === 'on'){ e.on = !e.on; if(!e.on && cur && cur.e === e) leave(); }
      if(tg.dataset.tpt === 'zr'){
        e.zr.on = !e.zr.on;
        if(cur && cur.e === e){
          // a Z range switched on before anything is drawn ends the drawing: the edit bar takes over
          if(drawing() && !e.curve.length && e.zr.on) stopDrawing();
          else if(!drawing()) cur.tool = e.zr.on ? 'z' : null;
        }
      }
      refresh(); return;
    }
    if(a && a.dataset.tpa === 'open'){
      var open = !e.open; op.edits.forEach(function(x){ x.open = false; }); e.open = open; selId = e.id; refresh(); return;
    }
    if(a && a.dataset.tpa === 'pen'){ if(cur && cur.e === e) commit(); else beginEdit(op, e, false); return; }
    if(a && a.dataset.tpa === 'more'){
      if(a.classList.contains('dd-open')){ MENU.close(); return; }
      var i = op.edits.indexOf(e);
      select(e.id);
      MENU.show(a.getBoundingClientRect(), [
        {label:'Edit in 3D', onPick:function(){ beginEdit(op, e, false); }},
        {label:e.on ? 'Disable' : 'Enable', onPick:function(){ e.on = !e.on; if(!e.on && cur && cur.e === e) leave(); refresh(); }},
        {sep:true},
        {label:'Move up', dis:i === 0, onPick:function(){ move(op, e, -1); }},
        {label:'Move down', dis:i === op.edits.length - 1, onPick:function(){ move(op, e, 1); }},
        {sep:true},
        {label:e.note ? 'Edit note…' : 'Note…', onPick:function(){ e.noteEdit = true; op.edits.forEach(function(x){ x.open = x === e; }); refresh(); var n = irows.querySelector('[data-tpk="note"]'); if(n){ n.focus(); n.select(); } }},
        {sep:true},
        {label:'Delete', kbd:'Del', danger:true, onPick:function(){ del(op, e); }}
      ], a, 160);
      return;
    }
    if(d){
      if(d.classList.contains('dd-open')){ MENU.close(); return; }
      var k = d.dataset.tpd, items = [];
      function opt(list, getv, setv){ return list.map(function(o){ return {label:o.l, cur:getv() === o.v, onPick:function(){ setv(o.v); refresh(); }}; }); }
      var lt = LINK_TYPES.map(function(x){ return {v:x, l:x}; });
      if(k === 'mode') items = opt(Object.keys(TRIM_MODES).map(function(x){ return {v:x, l:TRIM_MODES[x]}; }), function(){ return e.mode; }, function(v){ e.mode = v; });
      if(k === 'filter') items = opt(Object.keys(FILTERS).map(function(x){ return {v:x, l:FILTERS[x]}; }), function(){ return e.filter; }, function(v){ e.filter = v; });
      if(k === 'linkType') items = opt(lt, function(){ return e.linkType; }, function(v){ e.linkType = v; });
      MENU.show(d.getBoundingClientRect(), items, d, d.getBoundingClientRect().width);
      return;
    }
    // plain click on an edit row: select it — its region shows in 3D
    if(rowEl && rowEl.classList.contains('tpe-item')) select(e.id);
  }, true);
  // title: "+ Trim ▾" — add an edit of the shown type, or pick another type from the list
  function addEdit(type){
    var op = curOp(); if(!op) return;
    addType = type;
    var ne = newEdit(type); op.edits.push(ne); beginEdit(op, ne, true);
  }
  INS.titleCtl.addEventListener('click', function(ev){
    var a = ev.target.closest('[data-tpa="addlast"], [data-tpa="addmenu"]'); if(!a || INS.activeTab() !== 'Edits') return;
    ev.stopPropagation();
    if(a.dataset.tpa === 'addlast'){ MENU.close(); addEdit(addType); return; }
    if(a.classList.contains('dd-open')){ MENU.close(); return; }
    var split = a.parentNode;
    MENU.show(split.getBoundingClientRect(), Object.keys(TYPES).map(function(t){
      return {label:TYPES[t].name, icon:TYPES[t].icon, cur:t === addType, onPick:function(){ addEdit(t); }};
    }), a, Math.max(140, split.getBoundingClientRect().width));
  });
  irows.addEventListener('dblclick', function(ev){
    if(!within(ev)) return;
    var r = ev.target.closest('.tpe-item'), op = curOp();
    if(!r || !op || ev.target.closest('button,.tgl,input,[data-tpa],[data-tpd],[data-tpg]')) return;
    var e = editById(op, r.dataset.eid); if(e) beginEdit(op, e, false);
  });
  function move(op, e, dir){
    var i = op.edits.indexOf(e), j = i + dir; if(j < 0 || j >= op.edits.length) return;
    op.edits.splice(i, 1); op.edits.splice(j, 0, e); selId = e.id; flashId = e.id;
    setTimeout(function(){ flashId = null; }, 900);
    refresh();
  }
  function num(v, d){ var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; }
  irows.addEventListener('change', function(ev){
    if(!within(ev)) return;
    var t = ev.target, k = t.dataset.tpk, op = curOp(); if(!k || !op) return;
    var r = t.closest('[data-eid]'), e = r ? editById(op, r.dataset.eid) : null; if(!e) return;
    if(k === 'zlo'){ e.zr.lo = Math.max(0, Math.min(num(t.value, e.zr.lo), e.zr.hi - 0.5)); e.zr.on = true; }
    if(k === 'zhi'){ e.zr.hi = Math.min(G.H + 4, Math.max(num(t.value, e.zr.hi), e.zr.lo + 0.5)); e.zr.on = true; }
    if(k === 'lsafe') e.safe = Math.max(0, num(t.value, e.safe));
    if(k === 'skim') e.skim = Math.max(0, num(t.value, e.skim));
    if(k === 'feedv'){
      var fv = num(t.value, feedValue(e));
      e.feed = Math.max(1, Math.min(300, e.feedUnit === '%' ? fv : fv / FEED * 100));
    }
    if(k === 'note'){ e.note = t.value.trim(); e.noteEdit = false; }
    refresh();
  });
  irows.addEventListener('input', function(ev){
    var t = ev.target; if(!within(ev) || !t.dataset.tpk || t.dataset.tpk === 'note') return;
    t.size = Math.max(2, t.value.length);
  });
  irows.addEventListener('keydown', function(ev){
    if(!within(ev) || ev.target.tagName !== 'INPUT') return;
    ev.stopPropagation();
    if(ev.key === 'Enter') ev.target.blur();
    if(ev.key === 'Escape'){
      var op = curOp(), r = ev.target.closest('[data-eid]'), e = op && r ? editById(op, r.dataset.eid) : null;
      if(e && ev.target.dataset.tpk === 'note'){ e.noteEdit = false; refresh(); } else ev.target.blur();
    }
  });
  irows.addEventListener('focusout', function(ev){
    if(!within(ev) || ev.target.dataset.tpk !== 'note') return;
    var op = curOp(), r = ev.target.closest('[data-eid]'), e = op && r ? editById(op, r.dataset.eid) : null;
    if(e && e.noteEdit){ e.note = ev.target.value.trim(); e.noteEdit = false; refresh(); }
  });

  /* ---------- show / hide with the tab, the mode and the selection ---------- */
  // the view: everywhere but the Simulation tab (it starts in the cube's camera)
  function viewSync(){
    var on = !simOn;
    if(on === shown){ if(on) draw(); return; }
    shown = on;
    cv.hidden = !on; vp.classList.toggle('tp-on', on);
    if(on){
      if(window.viewCube){ var c = window.viewCube.get(); cam.yaw = c.yaw; cam.pitch = c.pitch; }
      resize();
    }
  }
  // editing: the Edits tab
  function setActive(on){
    on = on && !simOn;
    if(on === active){ if(on) refresh(); return; }
    if(!on) leave();
    active = on;
    if(!on){ toastEl.hidden = true; }
    if(on){
      // the rules window of the Links tab covers the view: close it
      if(window.arClose) window.arClose();
      // the tab works on a milling operation: take the first one when something else is selected
      if(!curOp()){ var r = millRows()[0]; if(r){ r.click(); r.scrollIntoView({block:'nearest'}); } }
      if(window.viewCube){ var c = window.viewCube.get(); cam.yaw = c.yaw; cam.pitch = c.pitch; }
      resize();
    }
    refresh();
  }
  window.tpeTab = function(on, tab){ jobOn = tab === 'Job'; setActive(on); dbarSync(); };
  window.tpeRender = function(){ render(); };
  document.addEventListener('ency:mode', function(ev){ simOn = !!ev.detail.sim; viewSync(); setActive(INS.activeTab() === 'Edits'); dbarSync(); });
  var lastSel = null;
  document.addEventListener('ency:treesel', function(ev){
    var id = ev.detail && ev.detail.id;
    if(id === lastSel) return;                                     // re-clicking the same row changes nothing
    lastSel = id;
    leave();
    selId = null; refresh();
  });
  (function(){ var r = selRow(); lastSel = r ? r.dataset.id : null; })();
  jobOn = INS.activeTab() === 'Job'; dbarSync();                  // the page may open on the Job tab
  viewSync();
})();
