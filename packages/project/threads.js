/* Thread library window — the thread of a threading operation picked from a library. ENCY's
   ThreadSelectorOGLForm as the developers redrew it (library title, search, table, the library's common
   values under it, the operation's thread, Save to library), with the Core rules applied:
   - opens from the "Thread library" row of the operation's Cycle parameters (the Parameters tab of a
     threading operation, app.js THREAD_RE): the row's value is the library — a dropdown of the libraries — and
     next to it a square button (.rowbtn, lit while open) toggles the window; it stands level with the row at
     the left edge of the free view (the smart hint's place) and rises to fit; ✕ / Esc close it (Esc clears
     the search first). Its head drags it, its edges and corners resize it (see "moved and resized")
   - the title is the library too: a click lists the libraries (name · count), as the row's dropdown does;
     picking one is the operation's Thread library
   - search by name or diameter in the tree's field: "n of N" in the field, matches marked in the names
   - the table: Name · Major Ø · Minor Ø · Pitch · Tap drill, each unit once under its column's name (an inch
     pitch in TPI there, never in the cells); numbers in tabular figures, decimal points in line; no lines
     between the rows — hover and the lit row as in the tree; Tap drill only where the library has it (60°)
   - the operation's thread is the lit row: a click, ↑ ↓ / PgUp PgDn apply at once (the tool picker's way),
     Enter / a double-click close. Not in the library — the list opens at the nearest diameter
   - the inspector's rows above carry the values (Symbolic name, Major / Minor diameter, Thread pitch); typing
     one makes the thread the operation's own ("No name" once a value is not the library's any more); then the
     window's last line offers Save to library — a name, prefilled — and the saved thread takes its place by
     diameter, lit
   - delete: a row's right-click (or Del) → Delete from the library, asked first; operations keep their values
   Data: threads-data.js (tools/threads-export.js); libraries and the operations' threads live in memory. */
(function(){
  var LIBS = window.ENCY_THREAD_LIBS, INSP = window.ENCY_INSP, MENU = window.ENCY_MENU;
  var hint = document.getElementById('hintPanel'), tree = document.getElementById('tree');
  if(!LIBS || !INSP || !MENU || !hint || !tree) return;
  var vp = hint.parentElement;
  var ROWS = 12;   // the list shows 12 rows by default (the bottom / top edge changes it), then scrolls

  var ICON = '<svg class="i16 pk-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M2.5 9.75h11M6.5 6.5V13"/></svg>';
  var X = '<svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
  var PLUS = '<svg viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function lib(id){ for(var i = 0; i < LIBS.length; i++) if(LIBS[i].id === id) return LIBS[i]; return LIBS[0]; }
  function same(a, b){ return Math.abs(a - b) < 1e-6; }
  function round(x, n){ var k = Math.pow(10, n); return Math.round(x * k) / k; }

  /* ---------- units: the window shows a library in its own units until the user picks in or mm (the switch
     right of the search, kept for the session) — an inch library read in mm, a metric one in inches; the pitch
     goes with it: TPI in inches, the lead in mm. Diameters: inch 4 decimals as ENCY writes them, mm as short as
     they are; a column pads its shorter numbers with invisible zeros, so the decimal points stand in line ---------- */
  var vu = null;   // the units the user picked ('in' / 'mm'), null — the library's own
  function U(L){ return vu || L.unit; }
  function PU(L){ return U(L) === L.unit ? L.pitch : U(L) === 'mm' ? 'mm' : 'tpi'; }
  function mm(v, unit){ return unit === 'in' ? v * 25.4 : v; }                  // a length in mm
  function len(vmm, u){ return u === 'in' ? vmm / 25.4 : vmm; }                // a length from mm
  function pitchMM(p, pitch){ return pitch === 'tpi' ? 25.4 / p : p; }         // the lead in mm (TPI or mm)
  function dFmt(vmm, u){ return u === 'in' ? len(vmm, u).toFixed(4) : String(round(vmm, 3)); }
  function pFmt(pmm, pu){ return pu === 'tpi' ? String(round(25.4 / pmm, 2)) : String(round(pmm, 4)); }
  function fmt(L, k, v){   // k: 1 major, 2 minor, 3 pitch, 4 tap drill — a library value as the window shows it
    return k === 3 ? pFmt(pitchMM(v, L.pitch), PU(L)) : dFmt(mm(v, L.unit), U(L));
  }
  function dec(s){ var i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }
  function cols(L){
    var c = L._dec || (L._dec = {}), u = U(L);
    if(c[u]) return c[u];
    var m = [0, 0, 0, 0];
    L.rows.forEach(function(r){ for(var k = 1; k <= 4; k++) if(r[k] != null) m[k - 1] = Math.max(m[k - 1], dec(fmt(L, k, r[k]))); });
    return (c[u] = m);
  }
  function cell(L, k, v){
    if(v == null) return '';
    var s = fmt(L, k, v), d = dec(s), m = cols(L)[k - 1];
    return s + (m > d ? '<i>' + (d ? '' : '.') + new Array(m - d + 1).join('0') + '</i>' : '');
  }
  // the operation's thread in the units the window shows
  function dTxt(th, v, u){ return dFmt(mm(v, th.unit), u) + (u === 'in' ? ' in' : ' mm'); }
  function pTxt(th, pu){ return pFmt(pitchMM(th.p, th.pitch), pu) + (pu === 'tpi' ? ' TPI' : ' mm'); }

  /* ---------- a thread: {name, d, d1, p, unit, pitch, angle, fam}; a library row: [name, d, d1, p, tap].
     fam — the profile's family, what an insert is made for ---------- */
  function fam(L){ return L.pitch === 'tpi' ? 'UN' : L.angle === 55 ? 'Whitworth' : 'ISO metric'; }
  function thOf(L, r){ return {name:r[0], d:r[1], d1:r[2], p:r[3], unit:L.unit, pitch:L.pitch, angle:L.angle, fam:fam(L)}; }
  function find(L, th){
    if(th.unit !== L.unit || th.pitch !== L.pitch) return -1;
    for(var i = 0; i < L.rows.length; i++){
      var r = L.rows[i];
      if(r[0] === th.name && same(r[1], th.d) && same(r[2], th.d1) && same(r[3], th.p)) return i;
    }
    return -1;
  }
  // the thread written in a library's units (Save to library); tap drill as the library makes it
  function into(L, th, name){
    var k = th.unit === L.unit ? 1 : th.unit === 'in' ? 25.4 : 1 / 25.4;
    var pmm = th.pitch === 'tpi' ? 25.4 / th.p : th.p * (th.unit === 'in' ? 25.4 : 1);
    var dp = L.unit === 'in' ? 4 : 3;
    var r = [name, round(th.d * k, dp), round(th.d1 * k, dp), L.pitch === 'tpi' ? round(25.4 / pmm, 2) : round(pmm, 4)];
    if(L.tap) r.push(round(r[1] - (L.unit === 'in' ? pmm / 25.4 : pmm), dp));
    return r;
  }
  function suggest(L, th){
    if(th.name) return th.name;
    var r = into(L, th, '');
    if(L.unit === 'in') return r[1] + '-' + r[3];
    return L.angle === 60 ? 'M' + r[1] + 'x' + r[3] : '';
  }

  /* ---------- the operations' threads: by the tree row (id + name); a new one guesses from its name.
     The operation also has what the window checks the thread against: the diameter its geometry gives (the
     model — in ENCY the thread's diameter comes from the job, not from the inspector) and its threading insert
     (the tree row's tool, before the "/") ---------- */
  var OPS = {};
  function rowName(row){ var n = row.querySelector('.rlabel span'); return n ? n.textContent.trim() : ''; }
  var cur = null;   // the operation row whose Cycle parameters the inspector shows
  // the model's diameter (mm): a table for the prototype — Thread turning is a Ø12.7 shaft; "M8" in a name — Ø8
  var MODEL = {'op7|Thread turning':12.7};
  // threading inserts the prototype knows — full-profile ones cut one profile and one pitch: the family, its angle,
  // the pitch (mm, or tpi for an inch one), the side. "16ER 13 UN" — the laydown code: size 16, External, Right,
  // 13 TPI, UN; 266RG-16MM01A150M — Sandvik CoroThread 266, ISO metric 1.5 mm (the ENCY393 project's Thread turning)
  var INSERTS = {
    '16ER 13 UN':{fam:'UN', angle:60, tpi:13, side:'external'},
    '266RG-16MM01A150M':{fam:'ISO metric', angle:60, pitch:1.5, side:'external'}
  };
  function insPitch(ins){ return ins.tpi ? 25.4 / ins.tpi : ins.pitch; }                    // mm
  function insTxt(ins){ return ins.fam + ' ' + (ins.tpi ? ins.tpi + ' TPI' : ins.pitch + ' mm'); }
  // a thread (its family, angle and pitch in mm) the insert cuts
  function cuts(ins, fm, angle, pmm){ return !!ins && ins.fam === fm && ins.angle === angle && Math.abs(pmm - insPitch(ins)) <= 1e-3; }
  var FIT = 0.1;    // a thread fits the model while their diameters differ by 0.1 mm at most
  function op(){
    if(!cur) return null;
    var k = cur.dataset.id + '|' + rowName(cur);
    if(!OPS[k]){
      var t = cur.querySelector('.tlink span'), no = cur.querySelector('.toolno');
      var insert = t ? t.textContent.split('/')[0].trim() : '', ins = INSERTS[insert];
      var m = /\bM(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?/i.exec(rowName(cur));
      var model = MODEL[k] != null ? MODEL[k] : m ? +m[1] : null, L, r;
      if(m){   // "M8" in the name: that thread of the ISO metric library
        L = lib('iso-metric-screw-thread');
        r = L.rows.filter(function(x){ return x[0] === 'M' + m[1] + (m[2] ? 'x' + m[2] : ''); })[0];
      } else if(ins){   // else a thread the insert cuts, the one nearest the model's diameter
        L = lib(ins.fam === 'UN' ? 'un' : 'iso-metric-screw-thread');
        L.rows.forEach(function(x){
          if(!cuts(ins, fam(L), L.angle, pitchMM(x[3], L.pitch))) return;
          if(!r || (model != null && Math.abs(mm(x[1], L.unit) - model) < Math.abs(mm(r[1], L.unit) - model))) r = x;
        });
      }
      if(!r){ L = lib('un'); r = L.rows.filter(function(x){ return x[0] === '1/2-13 UNC'; })[0]; }
      OPS[k] = {lib:L.id, th:thOf(L, r), starts:L.starts, model:model, insert:insert, tool:no ? no.textContent.trim() : ''};
    }
    return OPS[k];
  }
  function fits(o, dmm){ return o.model != null && Math.abs(dmm - o.model) <= FIT; }

  /* ---------- the inspector: ENCY's Cycle parameters of a threading operation (its rows and order as in ENCY 3:
     Cycle, Clearance Stock; Thread Form — Thread library, Symbolic name, Thread pitch in the project's units (mm),
     Number of starts, Spindle start angle; Thread roughing; Thread finishing). The Thread library row: a dropdown
     of the libraries and the window's own square button next to it ---------- */
  function rows(row){
    cur = row || null;
    var o = op(); if(!o) return [];
    var L = lib(o.lib), th = o.th;
    function g(p){ p.indent = 1; p.gchild = 'thr'; return p; }
    function r(p){ p.indent = p.indent || 1; p.gchild = 'thrR'; return p; }
    return [
      {label:'Cycle', ctl:'dropdown', val:'Threading', opts:['Threading'], nomore:true, bold:true},
      {label:'Clearance Stock', ctl:'input', val:'5 mm'},
      {label:'Thread Form', shev:'open', ghead:'thr', headonly:true},
      g({label:'Thread library', ctl:'dropdown', val:esc(L.name), key:'thr-lib', pickBtn:{pick:'thread', icon:ICON, tip:'Open the library — pick the thread in a table'}}),
      g({label:'Symbolic name', ctl:'input', val:th.name ? esc(th.name) : 'No name', key:'thr-name'}),
      g({label:'Thread pitch', ctl:'input', val:pTxt(th, 'mm'), key:'thr-p'}),
      g({label:'Number of starts', ctl:'input', val:String(o.starts), key:'thr-starts'}),
      g({label:'Spindle start angle', ctl:'input', val:'0°'}),
      {label:'Thread roughing', shev:'open', ghead:'thrR', ctl:'toggle', on:true, nomore:true},
      r({label:'Bottom stock', ctl:'input', val:'0.2 mm'}),
      r({label:'Side stock', ctl:'input', val:'0.2 mm'}),
      r({label:'Machining Direction', ctl:'dropdown', val:'Bidirectional', opts:['Bidirectional', 'Monodirectional']}),
      r({label:'Rough Step', ctl:'input', val:'1 mm'}),
      r({label:'Multilayer', ctl:'dropdown', val:'Monodirectional', opts:['Monodirectional', 'Bidirectional'], shev:'open'}),
      r({label:'Depth step', ctl:'input', val:'1 mm', indent:2}),
      {label:'Thread finishing', ctl:'toggle', on:true, nomore:true}
    ];
  }
  // a value typed in a thread row: the pitch in mm (the project's units), the starts, or the name
  INSP.irows.addEventListener('click', function(e){
    if(!cur) return;
    var box = e.target.closest('.irow[data-key^="thr-"] .input'); if(!box) return;
    var key = box.closest('.irow').dataset.key, v = box.querySelector('.v');
    if(!v || v.isContentEditable) return;
    var o = op(), th = o.th;
    v.textContent = key === 'thr-name' ? th.name : key === 'thr-p' ? round(pitchMM(th.p, th.pitch), 4) : o.starts;
    v.contentEditable = 'true'; box.classList.add('editing'); v.focus();
    window.getSelection().selectAllChildren(v);
    function done(save){
      v.removeEventListener('blur', onBlur); v.removeEventListener('keydown', onKey);
      if(save) commit(key, v.textContent); else INSP.rerender();
      var r = INSP.irows.querySelector('.irow[data-key="' + key + '"]'); if(r) r.classList.add('sel');
    }
    function onBlur(){ done(true); }
    function onKey(ev){
      ev.stopPropagation();
      if(ev.key === 'Enter'){ ev.preventDefault(); v.blur(); }
      else if(ev.key === 'Escape'){ ev.preventDefault(); v.removeEventListener('blur', onBlur); done(false); }
    }
    v.addEventListener('blur', onBlur); v.addEventListener('keydown', onKey);
  });
  // a pitch that is not the library's makes the thread the operation's own ("No name"); its minor diameter
  // follows the profile (60°: d − 1.0825·P, 55°: d − 1.2807·P)
  function commit(key, text){
    var o = op(), L = lib(o.lib), th = Object.assign({}, o.th), was = find(L, o.th) >= 0;
    var n = parseFloat(String(text).replace(',', '.'));
    if(key === 'thr-name') th.name = text.trim();
    else if(key === 'thr-starts'){ if(isFinite(n) && n >= 1) o.starts = Math.round(n); }
    else if(isFinite(n) && n > 0 && Math.abs(n - pitchMM(th.p, th.pitch)) > 1e-4){
      th.p = th.pitch === 'tpi' ? round(25.4 / n, 4) : n;
      var P = th.pitch === 'tpi' ? 1 / th.p : th.p;   // the pitch in the thread's own length units
      th.d1 = round(th.d - (th.angle === 55 ? 1.280654 : 1.082532) * P, th.unit === 'in' ? 4 : 3);
      if(was) th.name = '';
      // the same diameter and pitch as a thread of the library (M12 × 1.75 = "M12"): that thread, with its name
      if(th.unit === L.unit && th.pitch === L.pitch)
        for(var i = 0; i < L.rows.length; i++) if(same(L.rows[i][1], th.d) && same(L.rows[i][3], th.p)){ th = thOf(L, L.rows[i]); break; }
    }
    o.th = th;
    INSP.rerender();
  }

  /* ---------- the window ---------- */
  var win = document.createElement('div');
  win.className = 'stpanel arw thr'; win.id = 'thrWin';
  win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'Thread library');
  win.innerHTML =
    '<div class="arw-head">' +
      '<button class="thr-lib" id="thrLib" title="The operation\'s thread library — pick another"><span id="thrLibT"></span>' +
        '<img class="i16" src="' + INSP.A.ddchev + '" alt=""></button>' +
      '<button class="arw-close" id="thrClose" title="Close (Esc)">' + X + '</button></div>' +
    // the search row: the tree's field, the model's diameter as a filter (only the threads that fit it), the units
    '<div class="thr-tools">' +
      '<label class="tt-search thr-search" id="thrSearch"><img class="tt-ic" src="../shared-ui/assets/st-search.svg" alt="">' +
        '<input id="thrQ" type="text" placeholder="Name or diameter" autocomplete="off" spellcheck="false">' +
        '<span class="tt-count" id="thrCount"></span>' +
        '<span class="tt-btn" id="thrClear" title="Clear (Esc)"><img src="../shared-ui/assets/hdr-tabclose.svg" alt=""></span></label>' +
      '<button class="thr-fit" id="thrFit"></button>' +
      '<button class="thr-fit" id="thrIns"></button>' +
      '<div class="cseg thr-units" id="thrUnits" role="radiogroup" aria-label="Units">' +
        '<span class="ci" data-u="in" role="radio" title="Inches — the pitch in TPI">in</span>' +
        '<span class="ci" data-u="mm" role="radio" title="Millimetres — the pitch as the lead in mm">mm</span></div></div>' +
    '<div class="thr-hd" id="thrHd"></div>' +
    '<div class="thr-list" id="thrList" role="listbox" tabindex="-1"></div>' +
    '<div class="thr-note" id="thrNote"></div>' +
    '<div class="line arw-div"></div>' +
    // what the operation's thread is checked against: the model's diameter, the insert — two lines, always there
    '<div class="thr-checks" id="thrChecks"></div>' +
    '<div class="thr-op" id="thrOp"></div>';
  vp.appendChild(win);
  var $ = function(id){ return win.querySelector('#' + id); };
  var list = $('thrList'), qEl = $('thrQ'), search = $('thrSearch'), opEl = $('thrOp');
  var drawn = '', saving = false, fitOnly = false, insOnly = false;

  function isOpen(){ return win.classList.contains('open'); }
  function picker(){ return INSP.irows.querySelector('.irow[data-key="thr-lib"] .rowbtn[data-pick]'); }
  function query(){ return qEl.value.trim().toLowerCase(); }
  // by name, or — a number — by the major diameter's start, in inches or in mm whatever the library is
  // ("12.7" finds 1/2", "0.5" too; ".5" = "0.5")
  function match(L, r, q){
    if(r[0].toLowerCase().indexOf(q) >= 0) return true;
    if(!/^\d*[.,]?\d+$/.test(q)) return false;
    var n = q.replace(',', '.'); if(n[0] === '.') n = '0' + n;
    var dmm = mm(r[1], L.unit);
    return dFmt(dmm, 'mm').indexOf(n) === 0 || dFmt(dmm, 'in').indexOf(n) === 0;
  }
  function mark(s, q){
    var i = q ? s.toLowerCase().indexOf(q) : -1;
    return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark class="tt-hl">' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  }
  function colHead(t, u){ return '<span class="thr-c"><b>' + t + '</b><i>' + u + '</i></span>'; }
  // the head on one line or two, never mixed: once a column's unit does not fit beside its name, every unit goes
  // under its name (.stack); the window's width decides (checked on each resize and redraw)
  function hdFit(){
    var hd = $('thrHd');
    hd.classList.remove('stack');
    hd.classList.toggle('stack', [].some.call(hd.children, function(c){ return c.offsetHeight > 16; }));
  }
  // measured in a fallback font before Inter came, the head would stay on two lines: measure again once it is in
  if(document.fonts) document.fonts.addEventListener('loadingdone', function(){ if(isOpen()) hdFit(); });

  function drawList(L, o){
    var q = query(), hits = 0, h = '', u = U(L), pu = PU(L), ins = INSERTS[o.insert];
    win.style.setProperty('--thr-n', L.tap ? 4 : 3);
    $('thrHd').innerHTML = '<span class="thr-c"><b>Name</b><i></i></span>' + colHead('Major Ø', u) + colHead('Minor Ø', u) +
      colHead('Pitch', pu === 'tpi' ? 'TPI' : 'mm') + (L.tap ? colHead('Tap drill', u) : '');
    hdFit();
    // a diameter that fits the model and a pitch the insert cuts read green (the tree's T# green); the two filters
    // keep only those (both on — threads that fit both)
    L.rows.forEach(function(r, i){
      var fit = fits(o, mm(r[1], L.unit)), cut = cuts(ins, fam(L), L.angle, pitchMM(r[3], L.pitch));
      if((q && !match(L, r, q)) || (fitOnly && !fit) || (insOnly && !cut)) return;
      hits++;
      h += '<div class="thr-row" data-i="' + i + '" role="option"><span class="thr-n">' + mark(r[0], q) + '</span>' +
        '<span' + (fit ? ' class="fit"' : '') + '>' + cell(L, 1, r[1]) + '</span><span>' + cell(L, 2, r[2]) + '</span>' +
        '<span' + (cut ? ' class="fit"' : '') + '>' + cell(L, 3, r[3]) + '</span>' +
        (L.tap ? '<span>' + cell(L, 4, r[4]) + '</span>' : '') + '</div>';
    });
    // nothing left: say what is asked for
    var why = [];
    if(fitOnly) why.push('the model\'s Ø ' + dFmt(o.model, u) + ' ' + u);
    if(insOnly) why.push('insert ' + o.tool + ' (' + insTxt(ins) + ')');
    list.innerHTML = hits ? h : '<div class="thr-none">' + (q ? 'No threads match "' + esc(qEl.value.trim()) + '"' + (why.length ? ' for ' + why.join(' and ') : '')
      : 'No threads for ' + why.join(' and ') + ' in this library') + '</div>';
    search.classList.toggle('has-q', !!q);
    search.classList.toggle('has-f', fitOnly || insOnly);
    $('thrCount').textContent = hits + ' of ' + L.rows.length;
    // what every thread of the library shares (one value per library in ENCY's samples — threads-export.js checks)
    $('thrNote').textContent = 'All threads: angle ' + L.angle + '°, inclination ' + L.incl + '°, taper ' + L.taper + '°, ' +
      (L.starts === 1 ? '1 start' : L.starts + ' starts');
  }
  function sync(){
    if(!isOpen()) return;
    var o = op(); if(!o){ close(); return; }
    var L = lib(o.lib), u = U(L), ins = INSERTS[o.insert];
    if(o.model == null) fitOnly = false;
    if(!ins) insOnly = false;
    var sig = [L.id, query(), L.rows.length, L._ver || 0, u, fitOnly, insOnly, o.model, o.insert].join('\u0001');
    if(sig !== drawn){ drawList(L, o); drawn = sig; }
    $('thrLibT').textContent = L.name;
    // the filters: the model's diameter, the insert (each hidden without its data); the units the window shows
    var fb = $('thrFit'), md = o.model != null ? dFmt(o.model, u) + ' ' + u : '';
    fb.hidden = o.model == null;
    fb.textContent = 'Ø ' + (o.model != null ? dFmt(o.model, u) : '');
    fb.classList.toggle('on', fitOnly);
    fb.title = (fitOnly ? 'Showing only' : 'Show only') + ' the threads for the model\'s Ø ' + md;
    var ib = $('thrIns');
    ib.hidden = !ins;
    ib.textContent = o.tool || 'Insert';
    ib.classList.toggle('on', insOnly);
    ib.title = ins ? (insOnly ? 'Showing only' : 'Show only') + ' the threads insert ' + o.tool + ' cuts — ' + o.insert + ': ' + insTxt(ins) : '';
    $('thrUnits').querySelectorAll('.ci').forEach(function(c){ var on = c.dataset.u === u; c.classList.toggle('on', on); c.setAttribute('aria-checked', on); });
    var ci = find(L, o.th), was = list.querySelector('.thr-row.cur');
    if(was) was.classList.remove('cur');
    var c = ci >= 0 && list.querySelector('.thr-row[data-i="' + ci + '"]');
    if(c) c.classList.add('cur');
    $('thrChecks').innerHTML = checks(o, L);
    if(!saving) opLine(o, L, ci >= 0);
    var pk = picker(); if(pk) pk.classList.add('on');
  }
  // what the operation's thread is checked against, a line each and always there (no jump): fine — the status
  // window's done glyph and a quiet line; off — its warning glyph and the amber line of its notes (.stp-mod)
  function chk(state, text, tip){
    var ic = state === 'ok' ? 'status-done' : state === 'warn' ? 'status-warn' : '';
    return '<div class="thr-chk ' + state + '" title="' + esc(tip || text) + '">' +
      (ic ? '<img class="i16" src="assets/' + ic + '.svg" alt="">' : '<i class="i16"></i>') + '<span>' + esc(text) + '</span></div>';
  }
  function checks(o, L){
    var th = o.th, u = U(L), h = '';
    // the model: the diameter the operation's geometry gives, against the thread's major diameter
    if(o.model == null) h += chk('none', 'Model: no diameter for the thread');
    else {
      var md = dFmt(o.model, u) + ' ' + u, td = dTxt(th, th.d, u);
      h += fits(o, mm(th.d, th.unit)) ? chk('ok', 'Model Ø ' + md + ' — fits')
        : chk('warn', 'Model Ø ' + md + ' — the thread is Ø ' + td,
          'The operation\'s geometry is Ø ' + md + ', ' + (th.name || 'the thread') + ' is Ø ' + td +
          '. The Ø ' + (o.model != null ? dFmt(o.model, u) : '') + ' button shows only the threads for the model.');
    }
    // the insert: a full-profile insert cuts one profile and one pitch — "Insert T#6 cuts only UN 13 TPI — not …"
    var ins = INSERTS[o.insert], t = o.tool || 'Insert';
    if(!o.insert) h += chk('none', 'Insert: no tool');
    else if(!ins) h += chk('none', 'Insert ' + t + ': no thread profile in the tool data', o.insert);
    else {
      var it = insTxt(ins), pt = pTxt(th, th.pitch);
      if(cuts(ins, th.fam, th.angle, pitchMM(th.p, th.pitch))) h += chk('ok', 'Insert ' + t + ': ' + it + ' — fits', o.insert);
      else h += chk('warn', 'Insert ' + t + ' cuts only ' + it + ' — not ' + (ins.fam !== th.fam ? th.fam + ' ' : '') + pt,
        o.insert + ' is a full-profile insert: it cuts ' + it + ' only, ' + (th.name || 'this thread') + ' is ' + th.fam + ' ' + pt +
        (th.pitch === 'tpi' ? ' (' + pTxt(th, 'mm') + ')' : '') + '. Pick a thread it cuts (the ' + t + ' button) or change the insert.');
    }
    return h;
  }
  // the last line: the operation's thread (in the units the window shows); off the library, Save to library
  function opLine(o, L, inLib){
    var th = o.th, u = U(L);
    opEl.className = 'thr-op' + (inLib ? ' in-lib' : '');
    opEl.title = inLib ? 'Show it in the list' : '';
    opEl.innerHTML = '<span class="thr-op-l">Operation</span>' +
      '<span class="thr-op-v"><b>' + esc(th.name || 'No name') + '</b><span>Ø ' + dTxt(th, th.d, u) + '</span><span>' + pTxt(th, PU(L)) + '</span></span>' +
      (inLib ? '' : '<button class="thr-save" id="thrSave" title="Add the operation\'s thread to ' + esc(L.name) + '">' + PLUS + '<span>Save to library</span></button>');
  }
  function saveStart(){
    var o = op(), L = lib(o.lib);
    saving = true;
    opEl.className = 'thr-op saving'; opEl.title = '';
    opEl.innerHTML = '<label class="thr-name"><span>Name</span><input id="thrName" type="text" spellcheck="false" autocomplete="off"></label>' +
      '<button class="tconf-btn" id="thrSaveNo">Cancel</button><button class="tconf-btn thr-ok" id="thrSaveOk">Save</button>';
    var inp = $('thrName'); inp.value = suggest(L, o.th); inp.focus(); inp.select();
  }
  function saveEnd(ok){
    var o = op(), L = lib(o.lib), name = ok ? $('thrName').value.trim() : '';
    if(ok && !name){ $('thrName').focus(); return; }
    saving = false;
    if(!ok){ sync(); return; }
    var r = into(L, o.th, name), at = 0;
    while(at < L.rows.length && L.rows[at][1] <= r[1]) at++;
    L.rows.splice(at, 0, r); L._dec = null; L._ver = (L._ver || 0) + 1;
    o.th = thOf(L, r);
    INSP.rerender();
    var row = list.querySelector('.thr-row[data-i="' + at + '"]');
    if(row){ reveal(row, 'center'); row.classList.add('nt-flash'); }
  }
  function del(i){
    var L = lib(op().lib), r = L.rows[i]; if(!r) return;
    window.ENCY_CONFIRM({title:'Delete ' + r[0] + ' from the library?',
      text:'It goes from ' + L.name + '. Operations with this thread keep its values.', ok:'Delete',
      onOk:function(){
        L.rows.splice(i, 1); L._dec = null; L._ver = (L._ver || 0) + 1;
        INSP.rerender(); list.focus();
      }});
  }
  // keep a row in sight inside the list only (scrollIntoView would move the view too)
  function reveal(row, how){
    var t = row.offsetTop, b = t + row.offsetHeight, h = list.clientHeight;
    if(how === 'center') list.scrollTop = t - (h - row.offsetHeight) / 2;
    else if(t < list.scrollTop) list.scrollTop = t;
    else if(b > list.scrollTop + h) list.scrollTop = b - h;
  }
  // the lit row, or — the thread is not in the library — the nearest diameter: the model's, else the thread's
  function revealCur(){
    var c = list.querySelector('.thr-row.cur');
    if(!c){
      var o = op(), L = lib(o.lib), d = o.model != null ? len(o.model, L.unit) : into(L, o.th, '')[1], best = null, bd = Infinity;
      list.querySelectorAll('.thr-row').forEach(function(x){
        var dd = Math.abs(L.rows[+x.dataset.i][1] - d); if(dd < bd){ bd = dd; best = x; }
      });
      c = best;
    }
    if(c) reveal(c, 'center');
  }
  function apply(row){
    var o = op(), L = lib(o.lib), r = L.rows[+row.dataset.i]; if(!r) return;
    o.th = thOf(L, r); o.starts = L.starts;   // the library's starts go with the thread
    INSP.rerender();
    reveal(row);
  }
  /* ---------- moved and resized as any window. The head drags it — a click on the title still lists the
     libraries, a drag starts after 4px; a double-click on the head's free part brings it back level with its
     row. The edges and corners resize it with only the resize cursors showing, no marks (the Automation
     window's way): the list in whole rows (12 by default, 3 at least), the width 352 … the view; a double-click
     on an edge returns that edge's default. Kept in localStorage — the place once moved (ency.thrPos, in the
     view), the width (ency.thrW), the rows (ency.thrRows). The window never leaves the 3D view (8px off its
     edges); a short view takes rows off the list for as long as it is short ---------- */
  var ROW = 25, N_MIN = 3, W_MIN = 352, W_DEF = 360;   // 352: the names' 104px + four 52px number columns
  function load(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(x){ return null; } }
  function keep(k, v){ try { if(v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch(x){} }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function rowsPx(n){ return n * ROW - 1; }
  var size = {w:Math.max(W_MIN, +load('ency.thrW') || W_DEF), n:Math.max(N_MIN, +load('ency.thrRows') || ROWS)};
  var pos = load('ency.thrPos');   // {x, y} in the view once moved; null — level with its row
  if(!pos || !isFinite(pos.x) || !isFinite(pos.y)) pos = null;
  function place(){
    var v = vp.getBoundingClientRect();
    win.style.width = clamp(size.w, W_MIN, v.width - 16) + 'px';
    hdFit();
    win.style.setProperty('--thr-list-h', rowsPx(size.n) + 'px');
    var over = win.offsetHeight - (v.height - 16);   // too tall for the view: whole rows off, while it is so
    if(over > 0) win.style.setProperty('--thr-list-h', rowsPx(Math.max(N_MIN, size.n - Math.ceil(over / ROW))) + 'px');
    var x, y;
    if(pos){ x = pos.x; y = pos.y; }
    else {   // level with the Thread library row at the free view's left edge (the smart hint's place)
      win.style.left = ''; x = win.offsetLeft;
      var pk = INSP.irows.querySelector('.irow[data-key="thr-lib"]');
      y = pk ? pk.getBoundingClientRect().top - v.top : 8;
    }
    win.style.left = clamp(x, 8, v.width - win.offsetWidth - 8) + 'px';
    win.style.top = clamp(y, 8, v.height - win.offsetHeight - 8) + 'px';
  }
  // the head drags the window
  var head = win.querySelector('.arw-head'), moved = false;
  head.addEventListener('pointerdown', function(e){
    if(e.button !== 0 || e.target.closest('#thrClose')) return;
    e.preventDefault();
    var x0 = e.clientX, y0 = e.clientY, l0 = win.offsetLeft, t0 = win.offsetTop, on = false;
    function mv(ev){
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if(!on){ if(Math.abs(dx) + Math.abs(dy) < 4) return; on = true; MENU.close(); document.body.classList.add('thr-moving'); }
      pos = {x:l0 + dx, y:t0 + dy}; place();
    }
    function up(){
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if(!on) return;
      document.body.classList.remove('thr-moving');
      pos = {x:win.offsetLeft, y:win.offsetTop}; keep('ency.thrPos', pos);
      moved = true; setTimeout(function(){ moved = false; }, 0);   // the click the drag ends with is not a click
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
  win.addEventListener('click', function(e){ if(moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  head.addEventListener('dblclick', function(e){
    if(e.target.closest('button')) return;
    pos = null; keep('ency.thrPos', null); place(); revealCur();
  });
  // the edges and corners resize it: n / s — the list's rows, e / w — the width; the top and left edges move
  // the window with them (it leaves its row's level then)
  var CUR = {n:'ns', s:'ns', e:'ew', w:'ew', nw:'nwse', se:'nwse', ne:'nesw', sw:'nesw'};
  Object.keys(CUR).forEach(function(d){
    var g = document.createElement('div'); g.className = 'thr-g thr-g-' + d; win.appendChild(g);
    g.addEventListener('pointerdown', function(e){
      if(e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      var v = vp.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
      var l0 = win.offsetLeft, t0 = win.offsetTop, w0 = win.offsetWidth, h0 = win.offsetHeight;
      var n0 = Math.round((list.offsetHeight + 1) / ROW);
      var up = Math.max(0, Math.floor((t0 - 8) / ROW)), down = Math.max(0, Math.floor((v.height - 8 - t0 - h0) / ROW));
      document.body.classList.add('thr-rs', 'thr-rs-' + CUR[d]);
      function mv(ev){
        var dx = ev.clientX - x0, dy = ev.clientY - y0, x = l0, y = t0, w = w0, n = n0;
        if(/e/.test(d)) w = clamp(w0 + dx, W_MIN, v.width - 8 - l0);
        if(/w/.test(d)){ w = clamp(w0 - dx, W_MIN, l0 + w0 - 8); x = l0 + w0 - w; }
        if(/s/.test(d)) n = clamp(n0 + Math.round(dy / ROW), N_MIN, n0 + down);
        if(/n/.test(d)){ n = clamp(n0 - Math.round(dy / ROW), N_MIN, n0 + up); y = t0 - (n - n0) * ROW; }
        size = {w:w, n:n};
        if(/[nw]/.test(d)) pos = {x:x, y:y};
        win.style.width = w + 'px'; win.style.setProperty('--thr-list-h', rowsPx(n) + 'px');
        if(/[ew]/.test(d)) hdFit();
        win.style.left = x + 'px'; win.style.top = y + 'px';
      }
      function end(){
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
        document.body.classList.remove('thr-rs', 'thr-rs-' + CUR[d]);
        keep('ency.thrW', size.w); keep('ency.thrRows', size.n); if(pos) keep('ency.thrPos', pos);
      }
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    });
    g.addEventListener('dblclick', function(e){
      e.stopPropagation();
      if(/[ns]/.test(d)){ size.n = ROWS; keep('ency.thrRows', null); }
      if(/[ew]/.test(d)){ size.w = W_DEF; keep('ency.thrW', null); }
      place();
    });
    g.addEventListener('click', function(e){ e.stopPropagation(); });
  });
  function open(){
    win.classList.add('open'); drawn = ''; saving = false;
    sync(); place(); revealCur();
    qEl.focus();
  }
  function close(){
    if(!isOpen()) return;
    win.classList.remove('open'); saving = false;
    var pk = picker(); if(pk) pk.classList.remove('on');
    MENU.close();
  }

  // the operation's library: the inspector's Thread library dropdown and the window's title list the same —
  // every library with its count; the pick is the operation's library (the window, open, follows it)
  function libMenu(anchor){
    if(anchor.classList.contains('dd-open')){ MENU.close(); return; }
    var o = op();
    MENU.show(anchor.getBoundingClientRect(), LIBS.map(function(L){
      return {label:L.name, kbd:String(L.rows.length), cur:L.id === o.lib, onPick:function(){
        o.lib = L.id; INSP.rerender(); if(isOpen()) revealCur();
      }};
    }), anchor, Math.max(200, anchor.getBoundingClientRect().width));
  }
  // (capture: before app.js takes it for an ordinary dropdown of fixed options)
  INSP.irows.addEventListener('click', function(e){
    var dd = cur && e.target.closest('.irow[data-key="thr-lib"] .dropdown'); if(!dd) return;
    e.stopPropagation();
    var r = dd.closest('.irow');
    INSP.irows.querySelectorAll('.irow').forEach(function(x){ x.classList.toggle('sel', x === r); });
    libMenu(dd);
  }, true);

  /* ---------- the window's pointer and keys ---------- */
  win.addEventListener('click', function(e){
    if(e.target.closest('#thrClose')){ close(); return; }
    if(e.target.closest('#thrClear')){ e.preventDefault(); qEl.value = ''; sync(); qEl.focus(); return; }
    var lb = e.target.closest('#thrLib');
    if(lb){ e.stopPropagation(); libMenu(lb); return; }
    if(e.target.closest('#thrFit')){ fitOnly = !fitOnly; sync(); revealCur(); return; }
    if(e.target.closest('#thrIns')){ insOnly = !insOnly; sync(); revealCur(); return; }
    var un = e.target.closest('.thr-units .ci');
    if(un){ vu = un.dataset.u; sync(); revealCur(); return; }
    if(e.target.closest('#thrSave')){ saveStart(); return; }
    if(e.target.closest('#thrSaveOk')){ saveEnd(true); return; }
    if(e.target.closest('#thrSaveNo')){ saveEnd(false); return; }
    if(e.target.closest('.thr-op.in-lib')){ var c = list.querySelector('.thr-row.cur'); if(c) reveal(c, 'center'); return; }
    var row = e.target.closest('.thr-row'); if(row) apply(row);
  });
  list.addEventListener('dblclick', function(e){ if(e.target.closest('.thr-row')) close(); });
  list.addEventListener('contextmenu', function(e){
    var row = e.target.closest('.thr-row'); if(!row) return;
    e.preventDefault(); e.stopPropagation();
    var i = +row.dataset.i;
    MENU.show({left:e.clientX, top:e.clientY, bottom:e.clientY}, [
      {label:'Delete from the library', kbd:'Del', danger:true, onPick:function(){ del(i); }}
    ], row, 180);
  });
  qEl.addEventListener('input', function(){ sync(); var c = list.querySelector('.thr-row.cur'); if(c) reveal(c, 'center'); else list.scrollTop = 0; });
  win.addEventListener('keydown', function(e){
    var k = e.key;
    if(saving && e.target.id === 'thrName'){
      if(k === 'Enter'){ e.preventDefault(); saveEnd(true); }
      else if(k === 'Escape'){ e.preventDefault(); saveEnd(false); }
      e.stopPropagation(); return;
    }
    var step = {ArrowDown:1, ArrowUp:-1, PageDown:ROWS - 1, PageUp:1 - ROWS}[k];
    if(step || ((k === 'Home' || k === 'End') && e.target !== qEl)){
      e.preventDefault(); e.stopPropagation();
      var all = [].slice.call(list.querySelectorAll('.thr-row')); if(!all.length) return;
      var at = all.indexOf(list.querySelector('.thr-row.cur'));
      var to = k === 'Home' ? 0 : k === 'End' ? all.length - 1 : at < 0 ? (step > 0 ? 0 : all.length - 1) : at + step;
      apply(all[Math.max(0, Math.min(all.length - 1, to))]);
      return;
    }
    if(k === 'Enter' && e.target.tagName !== 'BUTTON'){ e.preventDefault(); e.stopPropagation(); close(); return; }
    if(k === 'Escape'){
      e.preventDefault(); e.stopPropagation();
      if(qEl.value){ qEl.value = ''; sync(); revealCur(); qEl.focus(); } else close();
      return;
    }
    if(k === 'Delete' && e.target !== qEl){
      var c = list.querySelector('.thr-row.cur'); if(c){ e.preventDefault(); e.stopPropagation(); del(+c.dataset.i); }
    }
  });
  // Esc with the focus elsewhere (the inspector, the view) closes it too
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && isOpen() && !win.contains(e.target) && !document.querySelector('.tconf-scrim')) close();
  });
  // the Simulation tab hides the inspector: the window goes with it
  document.querySelectorAll('.tabs[data-group="mode"] .seg').forEach(function(s){
    s.addEventListener('click', function(){ if(s.textContent.trim() === 'Simulation') close(); });
  });
  // the view changes size (a panel's width, the window): stay inside it
  new ResizeObserver(function(){ if(isOpen()) place(); }).observe(vp);

  window.ENCY_PICKERS = window.ENCY_PICKERS || {};
  window.ENCY_PICKERS.thread = function(){ if(isOpen()) close(); else open(); };
  window.ENCY_THREADS = {
    rows:rows,
    // app.js: the inspector drew its rows — the Cycle parameters of a threading operation (on) or something else
    rendered:function(on){ if(!on){ cur = null; close(); } else sync(); }
  };
  // the inspector drew before this file loaded: draw it again with the threads in
  if(INSP.activeTab() === 'Parameters') INSP.rerender();
})();
