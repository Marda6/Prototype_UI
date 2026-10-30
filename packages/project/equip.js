/* Equipment — the machine's setup as in ENCY: the tab right of the Filters opens the panel under it.
   A simple title with ✕, Machine · Delete unused, then the tree: Axis S (its spindle slot) and Turret (T)
   with its positions in order, 1…12 (ENCY lists 12 first; kept in order here), all empty in a new setup.
   Every slot has a "+" (on hover and on the selected row): it lists what fits the slot — blocks from the
   machine library for a position, holders for the spindle, then collets, then the tools the collet takes —
   name and library on two lines; hovering an item previews it right of the list and the slot reads as it.
   Picked, the next slot opens under it, until a tool ends the assembly. A filled slot has a × instead of the
   "+": it removes the part and what is under it (right-click → Remove does the same).
   Tool numbers: a column left of the tree, one per place — on its first row, the empty seat too; a line under
   the number runs down the assembly's rows, so it holds them together. No two tools of a unit share a number
   (the spindle and the turret count apart). In the turret the number is the position and is not typed in: the
   assembly's number is a list of the positions (a dropdown on hover), picking one moves the assembly there (a taken
   one swaps with it). Axis S is the machine's magazine: as many sockets as the user adds ("+" on Axis S), each
   with its number — the first free one, then typed in by a click (a lone tool may be T#50; a taken one swaps) —
   by number; assemblies prepared ahead (one works at a time; an operation picks from them); a socket stays when
   its assembly goes, an empty one goes by right-click.
   The column sits right of the tree, before the "+" / "×" (their place kept even when hidden), so the tree
   starts at the left edge.
   Overhang: on the tool's row in the same column, "35.0 mm", typed in the same way; a tool brings its own, a
   new or removed tool drops what was typed.
   Shown on New project 2 only for now (ONLY); the other project tabs go without it.
   Tools tab: the other way round — only the tools in, by unit and number; a tool unfolds into the parts that hold
   it; a unit's "+" adds a tool straight away, the parts between found for it. There a part's × takes out that part
   only: the tool stays and its name turns amber; the gap (a null in the chain) is a row outlined with a quiet
   dashed line that says what to do (in Machine too) until the user decides — its "+" offers what fits the gap, or
   a holder that takes the part below directly, put in place of the one above. The tool's × takes out the tool. */
(function(){
  var col = document.getElementById('equipCol');
  if(!col) return;
  var vp = col.parentElement, panel = document.getElementById('equip'), list = document.getElementById('eqList');
  var TUR = 12, ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  var SHEV = '<img class="shev" src="assets/t-shev-open.svg" alt="">';
  var PLUS = '<svg viewBox="0 0 12 12" fill="none"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
  var CROSS = '<svg viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* ---------- what fits where: an item names the list of its own slot (next) ---------- */
  var MLIB = 'Machine lib', KIT = 'C:\\..\\';
  // a tool (no next) brings its default overhang, mm: how far it sticks out of what holds it
  function it(name, from, pv, next, ov){ return {name:name, from:from, pv:pv, next:next || null, ov:ov || null}; }
  var LIBS = {
    spindle:{items:[
      it('HSK63 ER32 collet chuck', MLIB, 'chuck', 'er32'), it('HSK63 SF12 shrink fit chuck', MLIB, 'chuck', 'd12'),
      it('HSK63 SF8 shrink fit chuck', MLIB, 'chuck', 'd8'), it('HSK63 face mill arbor 22', MLIB, 'arbor', 'face')]},
    block:{items:[
      it('Eppinger R78683A radial drive block', MLIB, 'radial', 'er16'), it('Eppinger R78818A axial drive block', MLIB, 'axial', 'er16'),
      it('Eppinger R78818A Axial drive block (Sub)', MLIB, 'axial', 'er16'), it('L3156053D Axial block', MLIB, 'axial', 'bar'),
      it('L3156053D Axial block (Sub)', MLIB, 'axial', 'bar'), it('L72580117 Radial block', MLIB, 'radial', 'turn'),
      it('L72580117 Radial block (Sub)', MLIB, 'radial', 'turn'), it('L72580127 Axial drill block', MLIB, 'axial', 'udrill'),
      it('L72580127 Axial drill block (Sub)', MLIB, 'axial', 'udrill')]},
    er16:{items:[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(n){ return it('Collet ER16-' + n, KIT + 'Collets_ER11-40.mKit', 'collet', 'd' + n); })},
    er32:{items:[6, 8, 10, 12, 16, 20].map(function(n){ return it('Collet ER32-' + n, KIT + 'Collets_ER11-40.mKit', 'collet', 'd' + n); })},
    bar:{items:[it('A16R-SCLCR 06 boring bar', KIT + 'Boring_bars.mKit', 'bar', null, 48),
      it('A20S-SCLCR 09 boring bar', KIT + 'Boring_bars.mKit', 'bar', null, 60), it('A25T-PCLNR 12 boring bar', KIT + 'Boring_bars.mKit', 'bar', null, 75)]},
    turn:{items:[it('DCLNR 2020K-12 · CNMG 12 04 08', KIT + 'Turning_ISO.mKit', 'turn', null, 32),
      it('DDJNR 2020K-15 · DNMX 15 04 04', KIT + 'Turning_ISO.mKit', 'turn', null, 32), it('SVJCR 2020K-16 · VCMT 16 04 04', KIT + 'Turning_ISO.mKit', 'turn', null, 32),
      it('RF123G079 · N123G2-0300', KIT + 'Grooving.mKit', 'turn', null, 35)]},
    udrill:{items:[it('U-drill D20 3xD', KIT + 'Drills_D1-20.mKit', 'drill', null, 65), it('U-drill D25 3xD', KIT + 'Drills_D1-20.mKit', 'drill', null, 80),
      it('SCD 080-044-080 AP5', KIT + 'Drills_D1-20.mKit', 'drill', null, 48)]},
    face:{items:[it('FM D50 R390-050', KIT + 'Facemills.mKit', 'face', null, 40), it('FM D63 R245-063', KIT + 'Facemills.mKit', 'face', null, 40)]}
  };
  // the tools a collet / chuck of Ø n takes: drills, and end / ball mills from Ø 2 / 3
  function lib(key){
    if(LIBS[key]) return LIBS[key];
    var n = +key.slice(1), items = [it(n + 'mm Drill', KIT + 'Drills_D1-20.mKit', 'drill', null, Math.max(12, 6 * n + 4))];
    if(n >= 2) items.push(it('EM D' + n + ' L' + 3 * n, KIT + 'Endmills_D2-20.mKit', 'mill', null, 3 * n + Math.max(2, Math.round(n / 2))));
    if(n >= 3) items.push(it('BM D' + n + ' L' + 4 * n, KIT + 'Endmills_D2-20.mKit', 'mill', null, 4 * n + 2));
    return {items:items};
  }

  /* ---------- the setup, per project tab: a chain of items per place — a turret position (1…12) or a socket of
     the spindle's magazine ('S1', 'S2'… in st.spin, each with its number in st.num) ---------- */
  var EQ = {}, cur = null;
  function blank(){
    var st = {chains:{S1:[]}, spin:['S1'], sseq:1, num:{S1:1}, ov:{}, texp:{}, open:{S:true, T:true}, shut:{}, sel:null};
    ORDER.forEach(function(p){ st.chains[p] = []; });
    return st;
  }
  function S(){ return EQ[cur]; }
  function isSp(place){ return String(place).charAt(0) === 'S'; }
  // a new socket of the magazine, with the first free number; an empty one goes on the user's word
  function spAdd(){
    var st = S(), id = 'S' + (++st.sseq);
    st.chains[id] = []; st.num[id] = spFree(); st.spin.push(id);
    return id;
  }
  function spDrop(id){
    var st = S();
    st.spin.splice(st.spin.indexOf(id), 1);
    delete st.chains[id]; delete st.num[id]; delete st.ov[id]; delete st.texp[id];
  }
  // the magazine's sockets by number
  function spOrder(){ var st = S(); return st.spin.slice().sort(function(a, b){ return st.num[a] - st.num[b]; }); }
  // the first number no other socket of the magazine has
  function spFree(except){
    var st = S(), used = {};
    st.spin.forEach(function(p){ if(p !== except) used[st.num[p]] = 1; });
    for(var n = 1; ; n++) if(!used[n]) return n;
  }
  function where(place){ return isSp(place) ? 'S T' + numOf(place) : 'T' + place; }
  // the list of a slot: a position takes blocks, the spindle holders, then whatever the item above names
  function slotLib(place, d){ return d === 0 ? (isSp(place) ? LIBS.spindle : LIBS.block) : lib(S().chains[place][d - 1].next); }

  /* ---------- the tree ---------- */
  // a field of the number column (o.cell) or, in Tools, the overhang column left of it (o.end): kind no | ov | pos,
  // its html, its hint
  // (c.ro — shown, not a field; kind pos — a dropdown of the turret's positions)
  function field(c, end){
    if(!c) return '<span class="eq-no' + (end ? ' end' : '') + '"></span>';
    return '<span class="eq-no' + (end ? ' end' : '') + (c.ro ? '' : ' ed') + ' ' + c.kind + '" data-c="' + c.kind + '" title="' + c.title + '">' +
      '<span class="eq-nv">' + c.html + (c.kind === 'pos' ? '<img class="eq-dd" src="assets/dd-chev.svg" alt="">' : '') + '</span></span>';
  }
  function noCell(place){
    if(isSp(place)) return {kind:'no', html:'T#' + numOf(place), title:'Tool number — click to change (a taken one swaps)'};
    // the turret: the position; an assembly's number is a list of the positions to move it to (it shows as one on hover)
    return S().chains[place].length
      ? {kind:'pos', html:'T#' + place, title:'Move the assembly to another position — a taken one swaps with it'}
      : {kind:'no', ro:true, html:'T#' + place, title:'Position ' + place};
  }
  function ovCell(place){ return {kind:'ov', html:f1(ovOf(place)) + '<em class="u">mm</em>', title:'Overhang, mm — click to change'}; }
  function row(o){
    return '<div class="eq-row' + (o.cls ? ' ' + o.cls : '') + '" data-key="' + o.key + '"' +
      (o.place != null ? ' data-place="' + o.place + '" data-d="' + o.d + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' +
      '<span style="padding-left:' + o.ind * 8 + 'px;display:flex;flex:0 0 auto">' + (o.chev ? SHEV : '<span class="eq-sp"></span>') + '</span>' +
      thumb(o.pv) + '<span class="eq-lbl">' + o.label + '</span>' +
      // the number column right of the tree, on every row so it lines up: the number on an assembly's first row,
      // the overhang on its tool's (Tools: the overhang in a column of its own, left of it)
      (o.end ? field(o.end, true) : '') + field(o.cell) +
      // an empty slot: "+" (what fits); a filled one: × (remove it and what is under it); the place kept on every row
      (o.add ? '<button class="eq-add" title="' + o.add + '">' + PLUS + '</button>'
        : o.place == null || o.bare ? '<span class="eq-bs"></span>' : o.filled ? '<button class="eq-add eq-del" title="Remove">' + CROSS + '</button>'
        : '<button class="eq-add" title="Add">' + PLUS + '</button>') + '</div>';
  }
  function chainRows(place, h){
    var st = S(), ch = st.chains[place], tur = !isSp(place), rows = [];
    for(var d = 0; d <= ch.length; d++){
      var item = ch[d], key = place + ':' + d;
      if(item === null){                           // a part taken out (Tools): the gap, amber, then what is below
        rows.push({key:key, place:place, d:d, ind:1 + d, pv:'seat', cls:'eq-slot gap' + (st.sel === key ? ' sel' : ''), label:'Add an adapter or a direct holder', title:'Nothing holds the tool here: add an adapter that fits it, or a holder that takes it directly in place of the one above'});
        continue;
      }
      if(!item){
        if(d > 0 && !ch[d - 1].next) break;           // a tool ends the assembly
        // empty, as ENCY writes it: "Socket" — a turret position or a socket of the magazine (its number in the
        // number column), or under a part; all with the seat
        var empty = 'Socket';
        rows.push({key:key, place:place, d:d, ind:1 + d, pv:'seat', cls:'eq-slot' + (st.sel === key ? ' sel' : ''), label:esc(empty)});
        break;
      }
      var kids = !!item.next, shut = !!st.shut[key];
      rows.push({key:key, place:place, d:d, ind:1 + d, chev:kids, pv:item.pv, filled:true, cls:(shut ? 'shut' : '') + (st.sel === key ? ' sel' : ''),
        label:esc(item.name),
        cell:kids ? null : ovCell(place)});            // the tool (it ends the assembly): its overhang
      if(!kids) rows[rows.length - 1].cls += ' has-ov';
      if(shut) break;
    }
    // one number per place, on its first row (an empty seat too); the line under it runs down to the assembly's
    // last row (its empty slot too: that is where the next part goes); with a gap in the assembly the tool's name is amber
    rows[0].cell = noCell(place);
    if(hasGap(place)) rows.forEach(function(o){ if(o.filled && !ch[o.d].next) o.cls += ' warn'; });
    if(ch.length){
      if(rows.length > 1) rows.forEach(function(o, i){ o.cls += ' ln-' + (i === 0 ? 'first' : i === rows.length - 1 ? 'last' : 'mid'); });
    }
    rows.forEach(function(o){ h.push(row(o)); });
  }
  function grpRow(key, open, pv, label, add){
    return row({key:key, ind:0, chev:true, pv:pv, cls:'eq-grp' + (open ? '' : ' shut') + (S().sel === key ? ' sel' : ''), label:label, add:add});
  }
  // Machine: the machine down to the tools, every place and socket
  function treeHTML(){
    var st = S(), h = [];
    // "+" on Axis S: one more socket for the magazine, as many as the user wants
    h.push(grpRow('gS', st.open.S, 'spindle', 'Axis S', 'Add a socket — it takes T#' + spFree()));
    if(st.open.S) spOrder().forEach(function(p){ chainRows(p, h); });
    h.push(grpRow('gT', st.open.T, 'turret', 'Turret(T)'));
    if(st.open.T) ORDER.forEach(function(p){ chainRows(p, h); });
    return h;
  }
  // Tools: the other way round — only the tools in, by section (Axis S and the turret numbered apart: the same
  // number may be in both), by number; the overhang and the number right of the name, typed in as in the tree
  function toolsHTML(){
    var st = S(), h = [];
    [{key:'gS', open:st.open.S, pv:'spindle', label:'Axis S', places:st.spin},
     {key:'gT', open:st.open.T, pv:'turret', label:'Turret(T)', places:ORDER}].forEach(function(sec){
      var tools = sec.places.filter(function(p){ var ch = st.chains[p]; return ch.length && !ch[ch.length - 1].next; })
        .sort(function(a, b){ return numOf(a) - numOf(b) || (+a || 0) - (+b || 0); });
      // "+": a tool straight into the unit — while it has room (a free position; the magazine always has)
      var to = secPlace(sec.key);
      h.push(grpRow(sec.key, sec.open, sec.pv, sec.label, to ? 'Add a tool — ' + (isSp(to) ? 'it takes T#' + secNo(to) : 'it goes to position ' + to) : null));
      if(!sec.open) return;
      tools.forEach(function(p){
        var ch = st.chains[p], d = ch.length - 1, key = p + ':' + d, open = !!st.texp[p];
        var rows = [{key:key, place:p, d:d, ind:1, chev:true, pv:ch[d].pv, filled:true, cls:(open ? '' : 'shut') + (st.sel === key ? ' sel' : '') + (hasGap(p) ? ' warn' : ''),
          label:esc(ch[d].name) + (isSp(p) ? '' : '<span class="eq-sub">Position ' + p + '</span>'), cell:noCell(p), end:ovCell(p)}];
        // unfolded: the parts between the tool and the machine, from the tool up, each a step deeper — what holds it,
        // then what holds that (the tree of Machine read the other way);
        // the assembly's line runs down them from the number, as in the tree
        if(open) for(var i = d - 1; i >= 0; i--){
          var k2 = p + ':' + i, part = ch[i];
          rows.push(part ? {key:k2, place:p, d:i, ind:2 + (d - 1 - i), pv:part.pv, filled:true, cls:'eq-part' + (st.sel === k2 ? ' sel' : ''), label:esc(part.name)}
            : {key:k2, place:p, d:i, ind:2 + (d - 1 - i), pv:'seat', cls:'eq-slot gap' + (st.sel === k2 ? ' sel' : ''), label:'Add an adapter or a direct holder', title:'Nothing holds the tool here: add an adapter that fits it, or a holder that takes it directly in place of the one above'});
        }
        if(rows.length > 1) rows.forEach(function(o, i){ o.cls += ' ln-' + (i === 0 ? 'first' : i === rows.length - 1 ? 'last' : 'mid'); });
        rows.forEach(function(o){ h.push(row(o)); });
      });
      if(!tools.length) h.push(row({key:sec.key + '-none', ind:1, cls:'eq-empty', label:'No tools'}));
    });
    return h;
  }
  var tab = 'machine';
  function render(){
    var h = tab === 'tools' ? toolsHTML() : treeHTML();
    var top = list.scrollTop;
    list.innerHTML = h.join('');
    list.scrollTop = top;
    fit();
  }
  function select(key){
    S().sel = key;
    Array.prototype.forEach.call(list.querySelectorAll('.eq-row'), function(r){ r.classList.toggle('sel', r.dataset.key === key); });
  }
  function rowOf(key){ return list.querySelector('.eq-row[data-key="' + key + '"]'); }
  function toggle(r){
    var st = S(), k = r.dataset.key;
    if(k === 'gS') st.open.S = !st.open.S;
    else if(k === 'gT') st.open.T = !st.open.T;
    else if(tab === 'tools') st.texp[r.dataset.place] = !st.texp[r.dataset.place];   // a tool's parts, in Tools
    else st.shut[k] = !st.shut[k];
    render();
  }
  list.addEventListener('click', function(e){
    e.stopPropagation();
    if(window.ENCY_MENU) window.ENCY_MENU.close();
    var r = e.target.closest('.eq-row');
    if(!r || r.classList.contains('eq-empty')){ pickClose(); return; }
    var cell = e.target.closest('.eq-no.ed');
    if(cell && cell.dataset.c === 'pos'){ pickClose(); posMenu(cell, +r.dataset.place); return; }
    if(cell){ pickClose(); select(r.dataset.key); cellEdit(r.dataset.key, cell.dataset.c); return; }
    if(e.target.closest('.eq-del')){
      pickClose(); select(r.dataset.key);
      if(tab === 'tools') takeOut(r.dataset.place, +r.dataset.d); else remove(r.dataset.place, +r.dataset.d);
      return;
    }
    var add = e.target.closest('.eq-add');
    if(add && tab === 'machine' && r.dataset.key === 'gS'){
      pickClose();
      var id = spAdd(); S().open.S = true; S().sel = id + ':0';
      render();
      var nr = rowOf(id + ':0'); if(nr) nr.scrollIntoView({block:'nearest'});
      emit('Add socket', 'T#' + numOf(id), 'EQUIP.SOCKET S T=' + numOf(id));
      return;
    }
    if(add){
      var key = r.dataset.key;
      select(key);
      r = rowOf(key); add = r && r.querySelector('.eq-add');   // select may have redrawn the rows
      if(!add) return;
      if(pick && pick._row === key) pickClose(); else pickOpen(r, add);
      return;
    }
    pickClose();
    select(r.dataset.key);
    if(e.target.closest('.shev')) toggle(r);
  });
  list.addEventListener('dblclick', function(e){
    var r = e.target.closest('.eq-row');
    if(r && r.querySelector('.shev') && !e.target.closest('.eq-add, .shev')) toggle(r);
  });
  // right-click on a filled slot: Remove (it and what is under it); on an empty socket of the magazine: Remove socket
  list.addEventListener('contextmenu', function(e){
    var r = e.target.closest('.eq-row[data-place]');
    if(!r) return;
    var st = S(), place = r.dataset.place, d = +r.dataset.d, sock = isSp(place) && !st.chains[place].length;
    if(!st.chains[place][d] && !sock) return;
    e.preventDefault(); e.stopPropagation(); pickClose();
    var key = r.dataset.key; select(key);
    if(window.ENCY_MENU) window.ENCY_MENU.show({left:e.clientX, top:e.clientY, bottom:e.clientY}, [sock
      ? {label:'Remove socket', danger:true, onPick:function(){
          var n = numOf(place); spDrop(place); if(S().sel === key) S().sel = null; render();
          emit('Remove socket', 'T#' + n, 'EQUIP.SOCKET_REMOVE S T=' + n);
        }}
      : {label:'Remove', danger:true, onPick:function(){ remove(place, d); }}], null, 160);
  });
  function remove(place, d){
    var st = S(), name = st.chains[place][d].name;
    var ch = st.chains[place].slice(0, d);
    while(ch.length && ch[ch.length - 1] === null) ch.pop();   // no gap left hanging at the end
    st.chains[place] = ch;
    delete st.ov[place];                           // the tool goes with it (it is always the last part)
    render();
    emit('Remove from equipment', name, 'EQUIP.REMOVE "' + name + '"');
  }
  /* ---------- gaps: Tools' × takes out a part and keeps the rest — the tool stays where it was, the place it left
     is a null in the chain; the tool's × takes out the tool (and gaps left at the end) ---------- */
  function hasGap(place){ return S().chains[place].indexOf(null) >= 0; }
  function takeOut(place, d){
    var st = S(), ch = st.chains[place], name = ch[d].name;
    if(d === ch.length - 1){
      ch = ch.slice(0, d);
      while(ch.length && ch[ch.length - 1] === null) ch.pop();
      st.chains[place] = ch;
      delete st.ov[place];
    } else {
      ch[d] = null;
      st.texp[place] = true;                       // the gap shows under the tool
    }
    render();
    emit('Remove from equipment', name, 'EQUIP.REMOVE ' + where(place) + ' "' + name + '"');
  }
  // the gap around d (a run of nulls) and what can close it: chains of 1…its length from the list above it that end
  // in what holds the part below; or, put in place of the part above, what holds the part below directly
  function listAt(place, i){
    if(i === 0) return isSp(place) ? LIBS.spindle : LIBS.block;
    var up = S().chains[place][i - 1];
    return up ? lib(up.next) : null;
  }
  function holds(it, name){ return !!it.next && lib(it.next).items.some(function(x){ return x.name === name; }); }
  function chainsTo(L, depth, name){
    var out = [];
    (function walk(L, path){
      if(!L) return;
      L.items.forEach(function(it){
        if(!it.next) return;
        var p2 = path.concat([it]);
        if(holds(it, name)) out.push(p2);
        if(p2.length < depth) walk(lib(it.next), p2);
      });
    })(L, []);
    return out;
  }
  function repairs(place, d){
    var ch = S().chains[place], a = d, b = d;
    while(a > 0 && ch[a - 1] === null) a--;
    while(b + 1 < ch.length && ch[b + 1] === null) b++;
    var below = ch[b + 1], out = [];
    chainsTo(listAt(place, a), b - a + 1, below.name).forEach(function(p2){ out.push({path:p2, from:a, to:b + 1}); });
    if(a > 0 && listAt(place, a - 1)) chainsTo(listAt(place, a - 1), 1, below.name).forEach(function(p2){
      if(p2[0] !== ch[a - 1]) out.push({path:p2, from:a - 1, to:b + 1, alt:ch[a - 1]});
    });
    return out;
  }
  function closeGap(place, o){
    var st = S(), ch = st.chains[place];
    st.chains[place] = ch.slice(0, o.from).concat(o.path, ch.slice(o.to));
    pickClose();
    st.sel = place + ':' + o.from;
    render();
    emit('Fill the gap', o.path.map(function(x){ return x.name; }).join(' · '), 'EQUIP.FIX ' + where(place));
  }
  function emit(label, val, cmd){
    document.dispatchEvent(new CustomEvent('ency:action', {detail:{label:label, val:val, cmd:cmd, op:'', ctl:'input', opts:null}}));
  }

  /* ---------- the left column's fields, typed in place — Enter or a click away keeps it, Esc leaves it:
     an assembly's number (no) and its tool's overhang (ov, mm) ---------- */
  function f1(v){ return (+v).toFixed(1); }
  // the turret's number is the position; a magazine socket's its own
  function numOf(place){ return isSp(place) ? S().num[place] : +place; }

  /* ---------- the turret: moving an assembly to another position — a taken one swaps with it (with their overhangs,
     what is folded) ---------- */
  function posMenu(cell, from){
    if(!window.ENCY_MENU) return;
    var st = S(), items = [{head:'Position'}];
    ORDER.forEach(function(p){
      var ch = st.chains[p], last = ch[ch.length - 1];
      var first = ch.filter(function(x){ return x; })[0];
      items.push({pre:'T#' + p, label:!ch.length ? 'Socket' : last.next ? first.name : last.name, cur:p === from,
        kbd:ch.length && p !== from ? 'Swap' : '', onPick:function(){ moveTo(from, p); }});
    });
    window.ENCY_MENU.show(cell.getBoundingClientRect(), items, cell, 260);
  }
  function moveTo(from, to){
    if(from === to) return;
    var st = S();
    function swap(o){
      var a = o[from], b = o[to];
      if(b === undefined) delete o[from]; else o[from] = b;
      if(a === undefined) delete o[to]; else o[to] = a;
    }
    swap(st.chains); swap(st.ov); swap(st.texp);
    var sh = {};
    Object.keys(st.shut).forEach(function(k){
      var kp = k.split(':'), pl = +kp[0] === from ? to : +kp[0] === to ? from : kp[0];
      sh[pl + ':' + kp[1]] = st.shut[k];
    });
    st.shut = sh;
    var sp = (st.sel || '').split(':');
    if(+sp[0] === from) st.sel = to + ':' + sp[1];
    render();
    emit('Move assembly', 'T#' + from + ' → T#' + to, 'EQUIP.MOVE T' + from + ' T' + to);
  }
  // what was typed, else the tool's own
  function ovOf(place){ var st = S(), v = st.ov[place], ch = st.chains[place]; return v != null ? v : ch[ch.length - 1].ov || 0; }
  function cellEdit(key, kind){
    var cell = list.querySelector('.eq-row[data-key="' + key + '"] .eq-no[data-c="' + kind + '"]'); if(!cell) return;
    var st = S(), place = cell.closest('.eq-row').dataset.place, no = kind === 'no', done = false;
    var was = no ? numOf(place) : ovOf(place);
    cell.classList.add('editing');
    cell.innerHTML = '<span class="eq-nv">' + (no ? '<em>T#</em>' : '') +
      '<input type="text" inputmode="' + (no ? 'numeric' : 'decimal') + '" spellcheck="false" autocomplete="off" value="' + (no ? was : f1(was)) + '">' +
      (no ? '' : '<em class="u">mm</em>') + '</span>';
    var inp = cell.querySelector('input');
    // as wide as what is typed, so the prefix / the unit stay with it at the well's left
    function size(){ inp.style.width = Math.max(1, inp.value.length) + 'ch'; }
    size(); inp.addEventListener('input', size);
    inp.focus(); inp.select();
    function finish(keep){
      if(done) return; done = true;
      var v = inp.value.trim(), at = where(place);
      if(keep && no){
        v = v.replace(/^t#?/i, '');
        if(/^\d+$/.test(v) && +v >= 1 && +v <= 999 && +v !== was){
          // a number another assembly of the magazine has: the two swap
          st.spin.forEach(function(q){ if(q !== place && st.num[q] === +v) st.num[q] = was; });
          st.num[place] = +v;
          emit('Tool number', 'T#' + v, 'EQUIP.TOOL ' + at + ' T=' + v);
        }
      } else if(keep){
        var n = Math.round(parseFloat(v.replace(',', '.')) * 10) / 10;
        if(isFinite(n) && n > 0 && n <= 999 && n !== was){
          st.ov[place] = n;
          emit('Overhang', f1(n) + ' mm', 'EQUIP.TOOL ' + at + ' OVERHANG=' + f1(n));
        }
      }
      render();
    }
    inp.addEventListener('keydown', function(e){
      e.stopPropagation();
      if(e.key === 'Enter'){ e.preventDefault(); finish(true); }
      else if(e.key === 'Escape'){ e.preventDefault(); finish(false); }
    });
    inp.addEventListener('blur', function(){ finish(true); });
    inp.addEventListener('click', function(e){ e.stopPropagation(); });
  }

  /* ---------- the picker, from a "+": on a slot — what fits it; on a section head of Tools — every tool the
     unit takes, the parts between found for you (the first block / holder and collet that lead to it).
     Two-line items; a hovered item previews right of the list (a slot also reads as it) ---------- */
  var pick = null, pv = null;
  // where a tool added to a section goes: the turret's first empty position; the magazine's first empty socket,
  // or a new one ('S+': made when the tool is picked)
  function secPlace(key){
    var st = S(), places = key === 'gT' ? ORDER : spOrder();
    return places.filter(function(p){ return !st.chains[p].length; })[0] || (key === 'gS' ? 'S+' : null);
  }
  function secNo(to){ return to === 'S+' ? spFree() : numOf(to); }
  // every tool reachable from a place's open end, each with the parts that lead to it (the first way found)
  function reach(place){
    var ch = S().chains[place] || [], out = [], seen = {};
    function walk(L, path){
      L.items.forEach(function(it){
        var p = path.concat([it]);
        if(!it.next){ if(!seen[it.name]){ seen[it.name] = 1; out.push(p); } }
        else walk(lib(it.next), p);
      });
    }
    walk(place === 'S+' ? LIBS.spindle : slotLib(place, ch.length), []);
    return out;
  }
  function pickOpen(r, btn){
    pickClose();
    if(window.ENCY_MENU) window.ENCY_MENU.close();
    var sec = r.dataset.key === 'gS' || r.dataset.key === 'gT', entries;
    if(sec){
      var to = secPlace(r.dataset.key);
      entries = (to ? reach(to) : []).map(function(path){
        var tool = path[path.length - 1], via = path.slice(0, -1).map(function(x){ return x.name; });
        via.unshift(isSp(to) ? 'T#' + secNo(to) : 'Position ' + to);
        return {item:tool, line:via.join(' · '), title:via.concat([tool.name]).join(' → ') + '\n' + tool.from,
          pick:function(){ build(to, path); }};
      });
    } else if(S().chains[r.dataset.place][+r.dataset.d] === null){
      // a gap: what fits it, then — under its own head — a holder that takes the part below directly
      var gp = r.dataset.place, fixes = repairs(gp, +r.dataset.d), fit = fixes.filter(function(o){ return !o.alt; }), alt = fixes.filter(function(o){ return o.alt; });
      var fixEntry = function(o){
        return {item:o.path[0], name:o.path.map(function(x){ return x.name; }).join(' · '),
          line:o.alt ? 'Instead of ' + o.alt.name : o.path[0].from, title:o.path[0].from, pick:function(){ closeGap(gp, o); }};
      };
      entries = (alt.length && fit.length ? [{head:'Fits the gap'}] : []).concat(fit.map(fixEntry),
        alt.length ? [{head:'Or a holder that takes it directly'}] : [], alt.map(fixEntry));
    } else {
      var place = r.dataset.place, d = +r.dataset.d;
      entries = slotLib(place, d).items.map(function(it){
        return {item:it, line:it.from, title:it.from, pick:function(){ put(place, d, it); }};
      });
    }
    pick = document.createElement('div');
    pick.className = 'eq-pick';
    pick._row = r.dataset.key;
    // a long list (more than 10) gets the tree's search field on top: it narrows the list by name, the matches
    // marked as in the tree; the list keeps its height while it narrows
    var long = entries.filter(function(o){ return !o.head; }).length > 10;
    function items(q){
      var ql = q.toLowerCase(), act = -1;
      var html = entries.map(function(o, i){
        if(o.head) return ql ? '' : '<div class="eq-pick-head">' + esc(o.head) + '</div>';
        var n = o.name || o.item.name, at = ql ? n.toLowerCase().indexOf(ql) : 0;
        if(at < 0) return '';
        if(act < 0 && ql) act = i;
        var name = ql ? esc(n.slice(0, at)) + '<mark class="tt-hl">' + esc(n.slice(at, at + ql.length)) + '</mark>' + esc(n.slice(at + ql.length)) : esc(n);
        return '<div class="eq-it' + (i === act ? ' act' : '') + '" data-i="' + i + '" title="' + esc(o.title) + '"><span class="opic"></span><span class="eq-it-t"><span>' + name + '</span><em>' + esc(o.line) + '</em></span></div>';
      }).join('');
      return html || '<div class="eq-pick-none">' + (q ? 'No tools match “' + esc(q) + '”' : 'Nothing in the library fits here') + '</div>';
    }
    pick.innerHTML = (long ? '<label class="tt-search"><img class="tt-ic" src="../shared-ui/assets/st-search.svg" alt="">' +
        '<input type="text" placeholder="Search tools" spellcheck="false" autocomplete="off"><span class="tt-count"></span>' +
        '<span class="tt-btn" data-clear title="Clear (Esc)"><img src="../shared-ui/assets/hdr-tabclose.svg" alt=""></span></label>' : '') +
      '<div class="eq-pick-list">' + items('') + '</div>';
    document.body.appendChild(pick);
    btn.classList.add('dd-open');
    // the list's left edge under the "+", flipped up when there is no room below
    var b = btn.getBoundingClientRect(), rr = r.getBoundingClientRect();
    pick.style.left = Math.max(8, Math.min(b.left, innerWidth - pick.offsetWidth - 8)) + 'px';
    pick.style.top = (rr.bottom + 2 + pick.offsetHeight > innerHeight - 8 ? Math.max(8, rr.top - 2 - pick.offsetHeight) : rr.bottom + 2) + 'px';
    if(long){
      pick.style.height = pick.offsetHeight + 'px';
      var qf = pick.querySelector('.tt-search'), qi = qf.querySelector('input'), pl = pick.querySelector('.eq-pick-list');
      var find = function(){
        var q = qi.value.trim();
        pl.innerHTML = items(q); pl.scrollTop = 0;
        qf.classList.toggle('has-q', !!q);
        qf.querySelector('.tt-count').textContent = q ? pl.querySelectorAll('.eq-it').length : '';
        var a = pl.querySelector('.eq-it.act');
        if(a) pvShow(entries[+a.dataset.i].item, pick); else pvHide();
      };
      qi.addEventListener('input', find);
      qf.querySelector('[data-clear]').addEventListener('click', function(e){ e.preventDefault(); qi.value = ''; find(); qi.focus(); });
      // ↑ ↓ through the matches, Enter takes one, Esc clears the field first, then closes the list
      qi.addEventListener('keydown', function(e){
        var its = Array.prototype.slice.call(pl.querySelectorAll('.eq-it')), a = pl.querySelector('.eq-it.act'), i = its.indexOf(a);
        if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
          e.preventDefault();
          if(!its.length) return;
          i = Math.max(0, Math.min(its.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
          if(a) a.classList.remove('act');
          its[i].classList.add('act'); its[i].scrollIntoView({block:'nearest'});
          pvShow(entries[+its[i].dataset.i].item, pick);
        } else if(e.key === 'Enter'){
          e.preventDefault();
          if(a) entries[+a.dataset.i].pick();
        } else if(e.key === 'Escape' && qi.value){
          e.preventDefault(); e.stopPropagation();
          qi.value = ''; find();
        }
      });
      qi.focus();
    }
    var lbl = r.querySelector('.eq-lbl'), was = lbl.innerHTML;
    var th = r.querySelector('.eq-thumb'), wasT = th.innerHTML;
    pick.addEventListener('mouseover', function(e){
      var o = e.target.closest('.eq-it'); if(!o) return;
      var item = entries[+o.dataset.i].item;
      if(!sec){                                    // a slot reads as the item it would take
        lbl.innerHTML = esc(item.name);
        th.innerHTML = '<svg viewBox="8 8 160 160">' + (PV[item.pv] || '') + '</svg>';
        r.classList.add('trying');
      }
      pvShow(item, pick);
    });
    // the slot reads as itself again when the pointer leaves the list or the list closes (Esc, a click away)
    pick._undo = function(){ lbl.innerHTML = was; th.innerHTML = wasT; r.classList.remove('trying'); };
    pick.addEventListener('mouseleave', function(){ pick._undo(); pvHide(); });
    pick.addEventListener('click', function(e){
      e.stopPropagation();
      var o = e.target.closest('.eq-it'); if(!o) return;
      entries[+o.dataset.i].pick();
    });
    pick._btn = btn;
  }
  function pickClose(){
    if(!pick) return;
    if(pick._btn) pick._btn.classList.remove('dd-open');
    pick._undo();
    pick.remove(); pick = null; pvHide();
  }
  // a pick fills the slot: what was there and under it goes; the next slot opens under it
  function put(place, d, item){
    fill(place, d, [item]);
    emit('Add to equipment', item.name, 'EQUIP.PUT ' + where(place) + ' "' + item.name + '"');
  }
  // a tool picked for a section: it and the parts that lead to it go in from the place's open end
  function build(place, path){
    var tool = path[path.length - 1];
    if(place === 'S+') place = spAdd();          // no empty socket in the magazine: the tool brings one
    fill(place, S().chains[place].length, path);
    emit('Add tool', tool.name, 'EQUIP.ADD ' + where(place) + ' "' + tool.name + '"');
  }
  function fill(place, d, items){
    var st = S(), last = items[items.length - 1];
    st.chains[place] = st.chains[place].slice(0, d).concat(items);
    items.forEach(function(x, i){ delete st.shut[place + ':' + (d + i)]; });
    if(!last.next) delete st.ov[place];            // a new tool starts from its own overhang
    pickClose();
    st.sel = place + ':' + (d + items.length - 1);
    render();
  }
  document.addEventListener('click', function(e){ if(pick && !pick.contains(e.target)) pickClose(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') pickClose(); });
  window.addEventListener('resize', pickClose);
  list.addEventListener('scroll', pickClose);

  // the preview: a flat drawing of the item (the 3D preview's place), right of the list, level with its top
  var PV = {
    radial:'<rect class="pv-body" x="40" y="34" width="96" height="12" rx="2"/><rect class="pv-body" x="50" y="46" width="76" height="64" rx="4"/>' +
      '<rect class="pv-dark" x="72" y="110" width="32" height="18" rx="2"/><rect class="pv-dark" x="78" y="128" width="20" height="14" rx="2"/>',
    axial:'<rect class="pv-body" x="34" y="56" width="108" height="12" rx="2"/><rect class="pv-body" x="44" y="68" width="88" height="44" rx="4"/>' +
      '<rect class="pv-dark" x="70" y="112" width="36" height="16" rx="2"/><rect class="pv-dark" x="77" y="128" width="22" height="12" rx="2"/>',
    chuck:'<path class="pv-body" d="M70 18h36l-4 30H74z"/><rect class="pv-body" x="54" y="48" width="68" height="14" rx="2"/>' +
      '<path class="pv-body" d="M62 62h52l-8 56H70z"/><rect class="pv-dark" x="74" y="118" width="28" height="16" rx="2"/>',
    arbor:'<path class="pv-body" d="M70 18h36l-4 30H74z"/><rect class="pv-body" x="54" y="48" width="68" height="14" rx="2"/>' +
      '<rect class="pv-body" x="76" y="62" width="24" height="40" rx="2"/><rect class="pv-dark" x="60" y="102" width="56" height="10" rx="2"/>',
    collet:'<path class="pv-body" d="M58 40h60l-14 92H72z"/><path class="pv-line" d="M88 40v92M73 40l6 92M103 40l-6 92"/>' +
      '<rect class="pv-dark" x="70" y="132" width="36" height="8" rx="2"/>',
    drill:'<rect class="pv-body" x="83" y="14" width="10" height="66" rx="1"/><path class="pv-cut" d="M83 80h10v68l-5 8-5-8z"/>',
    mill:'<rect class="pv-body" x="78" y="14" width="20" height="74" rx="2"/><rect class="pv-cut" x="78" y="88" width="20" height="66" rx="2"/>',
    bar:'<rect class="pv-body" x="82" y="10" width="12" height="134" rx="2"/><path class="pv-cut" d="M82 144h18l-6 18H82z"/>',
    turn:'<rect class="pv-body" x="40" y="76" width="110" height="24" rx="2"/><path class="pv-cut" d="M24 88l12-12h12l-12 24H24z"/>',
    face:'<rect class="pv-body" x="76" y="20" width="24" height="70" rx="2"/><rect class="pv-body" x="44" y="90" width="88" height="28" rx="3"/>' +
      '<path class="pv-cut" d="M44 112h12v6H44zM70 112h12v6H70zM96 112h12v6H96zM120 112h12v6h-12z"/>',
    // the tree's own: an empty seat, the spindle head, the turret disc with its 12 pockets
    seat:'<rect class="pv-dark" x="66" y="20" width="44" height="136" rx="8"/><path class="pv-line" d="M66 36h44"/>',
    spindle:'<rect class="pv-body" x="40" y="16" width="96" height="76" rx="8"/><rect class="pv-body" x="56" y="92" width="64" height="32" rx="3"/>' +
      '<rect class="pv-dark" x="70" y="124" width="36" height="36" rx="3"/>',
    turret:'<circle class="pv-body" cx="88" cy="88" r="72"/><circle class="pv-dark" cx="88" cy="88" r="24"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function(i){
        var a = i * Math.PI / 6;
        return '<circle class="pv-dark" cx="' + (88 + 52 * Math.sin(a)).toFixed(1) + '" cy="' + (88 - 52 * Math.cos(a)).toFixed(1) + '" r="10"/>';
      }).join('')
  };
  // the tree shows each part as a small copy of its model (ENCY: a 3D thumbnail) — the preview's drawing at 28px
  function thumb(kind){ return '<span class="eq-thumb"><svg viewBox="8 8 160 160">' + (PV[kind] || '') + '</svg></span>'; }
  function pvShow(item, from){
    if(!pv){ pv = document.createElement('div'); pv.className = 'eq-pv'; document.body.appendChild(pv); }
    pv.innerHTML = '<svg viewBox="0 0 176 176">' + (PV[item.pv] || '') + '</svg>';
    var b = from.getBoundingClientRect(), x = b.right + 8;
    if(x + 200 > innerWidth - 8) x = b.left - 208;
    pv.style.left = x + 'px';
    pv.style.top = Math.max(8, Math.min(b.top, innerHeight - 208)) + 'px';
  }
  function pvHide(){ if(pv){ pv.remove(); pv = null; } }

  /* ---------- open / close, fit, project tabs ---------- */
  function setOpen(on){
    col.classList.toggle('open', on);
    try { localStorage.setItem('ency.equipOpen', on ? '1' : '0'); } catch(e){}
    if(!on) pickClose();
    fit();
  }
  document.getElementById('equipBtn').addEventListener('click', function(e){ e.stopPropagation(); setOpen(!col.classList.contains('open')); });
  document.getElementById('equipX').addEventListener('click', function(e){ e.stopPropagation(); setOpen(false); });
  // the tabs: Machine (the tree) and Tools (the list) draw into the same list; Delete unused is not built yet
  var tabs = document.getElementById('eqTabs'), none = document.getElementById('eqNone');
  tabs.addEventListener('click', function(e){
    e.stopPropagation();
    var b = e.target.closest('.eq-seg'); if(!b || b.classList.contains('on')) return;
    pickClose();
    Array.prototype.forEach.call(tabs.children, function(x){ x.classList.toggle('on', x === b); });
    tab = b.dataset.tab;
    var built = tab !== 'unused';
    list.hidden = !built; none.hidden = built;
    if(built){ list.scrollTop = 0; render(); }
  });
  // the panel ends above the view cube and the view bars under it (only the tree scrolls), never below the view
  function fit(){
    // the function bar, centred over the view, steps right while it would cover the tab or the panel
    var etb = vp.querySelector('.etb');
    if(etb){
      etb.style.marginLeft = '';
      var er = etb.getBoundingClientRect(), cr = col.getBoundingClientRect();
      if(cr.width && er.width && er.left < cr.right + 8 && er.top < cr.bottom) etb.style.marginLeft = (cr.right + 8 - er.left) + 'px';
    }
    if(!col.classList.contains('open')){ panel.style.maxHeight = ''; return; }
    var vr = vp.getBoundingClientRect(), pr = panel.getBoundingClientRect(), lim = vr.bottom - 8;
    document.querySelectorAll('.vcube, .vbar, .calcbar').forEach(function(o){
      var b = o.getBoundingClientRect();
      if(b.width && b.height && b.left < pr.right && b.right > pr.left && b.top > pr.top) lim = Math.min(lim, b.top - 8);
    });
    panel.style.maxHeight = Math.max(120, lim - pr.top) + 'px';
  }
  window.addEventListener('resize', fit);
  document.addEventListener('ency:mode', function(){ requestAnimationFrame(fit); });   // hidden on Simulation
  if(window.ResizeObserver) new ResizeObserver(fit).observe(vp);
  if(window.MutationObserver) new MutationObserver(fit).observe(vp, {attributes:true, attributeFilter:['style', 'data-cube']});

  function show(key){
    pickClose();
    cur = key;
    if(!EQ[key]) EQ[key] = blank();
    render();
  }
  // tried out on one project for now: New project 2 (?project=new); the other tabs go without it
  var ONLY = 'New project 2';
  function only(title){
    var on = title === ONLY;
    col.hidden = !on;
    if(!on) pickClose();
    fit();
  }
  document.addEventListener('ency:project', function(e){ show(e.detail.proj || 'demo'); only(e.detail.title); });
  var open0 = true;                                // open until closed once
  try { open0 = localStorage.getItem('ency.equipOpen') !== '0'; } catch(e){}
  col.classList.toggle('open', open0);
  show('demo');
  only('');                                        // the page opens on the demo project
  requestAnimationFrame(fit);                      // the view cube and the bars are built by app.js
})();
