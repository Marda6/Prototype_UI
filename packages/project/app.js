// Project window — tree, filters and inspector logic ported from the
// ENCY 4 standalone prototype. The window shell (title bar, tabs) comes
// from shared-ui/chrome.js; the theme toggle was dropped (dark theme only).
(function(){
  var A = {}; // asset URLs by key (data URIs after a build)
  ['status-empty','status-calc','status-complete','status-prog1','status-prog2','status-done',
   'status-warn','status-warn2','status-error','hint','icn11','ddchev',
   'shev-open','shev-leaf','shev-right','tgl-off','tgl-on','row-a','row-b',
   'opcolor','op-yellow','op-blue','op-corall','op-green','op-purple','t-shev-leaf'].forEach(function(k){
    var el = document.getElementById('a-'+k); A[k] = el ? el.src : '';
  });

  /* ---------- Mode tabs ---------- */
  document.querySelectorAll('.tabs[data-group="mode"] .seg').forEach(function(s){
    s.addEventListener('click', function(){
      s.parentElement.querySelectorAll('.seg').forEach(function(x){x.classList.remove('active');});
      s.classList.add('active');
      setSimMode(s.textContent.trim() === 'Simulation');
    });
  });

  /* ---------- Popover helper (dropdown menu & context menu) ---------- */
  var openMenu = null;
  function closeMenu(){
    if(openMenu){
      // an open smart hint returns from the option hint to the row's hint
      var ownerRow = openMenu._owner && openMenu._owner.closest ? openMenu._owner.closest('.irow') : null;
      if(openMenu._owner) openMenu._owner.classList.remove('dd-open');
      openMenu.remove(); openMenu = null;
      if(ownerRow && hintIsOpen()) hintShow(ownerRow);
    }
  }
  function showMenu(anchorRect, items, owner, minW){
    closeMenu();
    var menu = document.createElement('div'); menu.className = 'dd-menu'; menu._owner = owner || null;
    items.forEach(function(it){
      if(it.sep){ var s=document.createElement('div'); s.className='dd-sep'; menu.appendChild(s); return; }
      if(it.head){ var h=document.createElement('div'); h.className='dd-head'; h.textContent=it.head; menu.appendChild(h); return; }
      var o = document.createElement('div');
      o.className = 'dd-opt' + (it.cur ? ' cur' : '') + (it.dis ? ' is-disabled' : '') + (it.danger ? ' danger' : '');
      if(it.pre){ var pr = document.createElement('span'); pr.className = 'dd-pre'; pr.textContent = it.pre; o.appendChild(pr); }
      if(it.color){ var sw = document.createElement('span'); sw.className = 'dd-sw'; sw.style.background = it.color; o.appendChild(sw); }
      if(it.icon){ var ic = document.createElement('span'); ic.className = 'dd-ic'; ic.innerHTML = it.icon; o.appendChild(ic); o.classList.add('has-ic'); }
      if(it.pre || it.color || it.icon){ o.appendChild(document.createTextNode(it.label)); }
      else { o.textContent = it.label; }
      if(it.kbd){ var kb = document.createElement('span'); kb.className = 'dd-kbd'; kb.textContent = it.kbd; o.appendChild(kb); }
      o.addEventListener('click', function(ev){ ev.stopPropagation(); if(it.onPick) it.onPick(); closeMenu(); });
      menu.appendChild(o);
    });
    document.body.appendChild(menu);
    if(minW) menu.style.minWidth = minW + 'px';
    menu.style.left = Math.max(8, Math.min(anchorRect.left, innerWidth - menu.offsetWidth - 8)) + 'px';
    // flip up when there is no room below the anchor
    if(anchorRect.bottom + 2 + menu.offsetHeight > innerHeight - 8)
      menu.style.top = (anchorRect.top - 2 - menu.offsetHeight) + 'px';
    else
      menu.style.top = (anchorRect.bottom + 2) + 'px';
    if(owner) owner.classList.add('dd-open');
    openMenu = menu;
    return menu;
  }
  document.addEventListener('click', closeMenu);
  window.addEventListener('resize', closeMenu);
  // other blocks (e.g. the Macro panel) reuse the same menu
  window.ENCY_MENU = {show:showMenu, close:closeMenu};

  /* ---------- Action bus: user actions the macro recorder can capture ----------
     label — what was done ("Radial stock", "New operation", "Calculate"),
     val   — the value / object, cmd — the command behind it (shown in the macro's inspector). */
  function emitAction(label, val, cmd, meta){
    var sel = document.querySelector('#tree .trow.tsel'), opName = '';
    if(sel){ var n = sel.querySelector('.rlabel span'); opName = n ? n.textContent : ''; }
    meta = meta || {};
    document.dispatchEvent(new CustomEvent('ency:action', {detail:{label:label, val:val, cmd:cmd, op:opName, ctl:meta.ctl || 'input', opts:meta.opts || null}}));
  }

  /* ---------- Filters: open/close + chips. They act on the 3D view only (data-ftype / data-fview:
     the machine light, the part, the toolpath); the tree always shows every row ---------- */
  var filters = document.getElementById('filters');
  var fhead = document.getElementById('filtersBtn');
  if(fhead) fhead.addEventListener('click', function(e){ e.stopPropagation(); filters.classList.toggle('open'); });
  document.querySelectorAll('.f-cell').forEach(function(c){
    c.addEventListener('click', function(e){
      e.stopPropagation();
      c.classList.toggle('on');
    });
  });

  /* ---------- Filters: the corner grip — pulled down past halfway between the two layouts,
     the filters line up in one column (model · machine and toolpath · dot / curve / face / mech),
     and the drawing panel under them too (app.css follows .list); pulled back up, two columns
     again. The grip sits under the lowest panel of the column. Double-click toggles; kept ---------- */
  var fGrip = document.getElementById('filtersGrip'), fCol = filters.parentElement, fPref = false, fMo = null;
  // the one-column layout keeps this far from whatever is under it: the grip's arc reaches 16px below
  // the column, plus 4
  var F_CLEAR = 20;
  function fSetList(on){
    if(fPref === on) return;
    fPref = on;
    try { localStorage.setItem('ency.filtersList', on ? '1' : ''); } catch(e){}
    fFit();
  }
  // One column only while it fits: when the column would reach the view cube, the view tools or the
  // view's bottom, the panels go back to two columns by themselves (the grip hides — there is nothing
  // to pull) and line up again once there is room. The stored choice stays one column.
  function fFit(){
    var was = filters.classList.contains('list'), on = fPref;
    if(on){
      // measured with the panels unfolded: a folded column always fits, and folding must not
      // flip the layout (two columns fold to "Filters ⌄", not to the one-column chevron)
      var shut = [filters].concat([].slice.call(fCol.querySelectorAll('.ency-draw:not([hidden])')))
        .filter(function(p){ return !p.classList.contains('open'); });
      shut.forEach(function(p){ p.classList.add('open'); });
      filters.classList.add('list');
      var r = fCol.getBoundingClientRect(), lim = fCol.parentElement.getBoundingClientRect().bottom;
      document.querySelectorAll('.vcube, .vb-tools').forEach(function(o){
        var b = o.getBoundingClientRect();
        if(b.width && b.left < r.right && b.right > r.left && b.top > r.top) lim = Math.min(lim, b.top);
      });
      shut.forEach(function(p){ p.classList.remove('open'); });
      on = r.bottom + F_CLEAR <= lim;
    }
    filters.classList.toggle('list', on);
    fCol.classList.toggle('f-auto', fPref && !on);
    if(was !== on && fsetPop) fsClose();           // its settings popover was placed by the old layout
                                                   // (fsetPop is set further down: none on the first fit)
    if(fMo) fMo.takeRecords();                     // our own class flips are not a layout change
  }
  try { fPref = !!localStorage.getItem('ency.filtersList'); } catch(e){}
  fFit();
  // re-fit when the room changes: the window or the dock resized, the view bars moved (--vbar-b on
  // the viewport, the cube's corner), the column grew (Filters folded / unfolded, the drawing panel)
  window.addEventListener('resize', fFit);
  requestAnimationFrame(fFit);                     // the view cube and the view tools are built further down
  if(window.ResizeObserver) new ResizeObserver(fFit).observe(fCol.parentElement);
  if(window.MutationObserver){
    fMo = new MutationObserver(fFit);
    fMo.observe(fCol.parentElement, {attributes:true, attributeFilter:['style', 'data-cube']});
    fMo.observe(fCol, {subtree:true, childList:true, attributes:true, attributeFilter:['class', 'hidden']});
  }
  if(fGrip){
    fGrip.addEventListener('dblclick', function(e){ e.stopPropagation(); fSetList(!fPref); });
    fGrip.addEventListener('click', function(e){ e.stopPropagation(); });
    fGrip.addEventListener('pointerdown', function(e){
      e.preventDefault(); e.stopPropagation();
      try { fGrip.setPointerCapture(e.pointerId); } catch(err){}
      fGrip.classList.add('dragging');
      // both heights, measured within one frame (nothing is painted in between)
      var col = filters.parentElement, list = filters.classList.contains('list'), h0 = col.offsetHeight;
      filters.classList.toggle('list', !list);
      var h1 = col.offsetHeight;
      filters.classList.toggle('list', list);
      var hCols = list ? h1 : h0, hList = list ? h0 : h1, mid = (hCols + hList) / 2, y0 = e.clientY;
      function move(ev){ fSetList(h0 + ev.clientY - y0 > mid); }
      function up(){
        fGrip.classList.remove('dragging');
        fGrip.removeEventListener('pointermove', move);
        fGrip.removeEventListener('pointerup', up);
        fGrip.removeEventListener('pointercancel', up);
      }
      fGrip.addEventListener('pointermove', move);
      fGrip.addEventListener('pointerup', up);
      fGrip.addEventListener('pointercancel', up);
    });
  }

  /* ---------- Filter settings: right-click a filter → its own display settings,
     opened to the right of the Filters panel, level with the filter ---------- */
  var FS_MATERIAL = ['Industrial', 'Plastic', 'Metal', 'Glossy', 'Matte'];
  var FS_DISPLAY = ['Default', 'Shaded', 'Shaded with edges', 'Wireframe', 'Hidden lines'];
  var FS_TURN = ['Default', 'Full revolution', 'Half section', 'Quarter section'];
  // row kinds: color (toggle + swatch) · select · pct (toggle + slider + % field) · slider (+ value) · toggle
  function fsColor(c, on){ return {k:'color', label:'Color', on:on !== false, color:c}; }
  function fsSel(label, opts, v){ return {k:'select', label:label, opts:opts, val:v || opts[0]}; }
  function fsPct(on, v){ return {k:'pct', label:'Transparent', on:on, val:v}; }
  function fsSlider(label, min, max, v){ return {k:'slider', label:label, min:min, max:max, val:v}; }
  function fsTgl(label, on){ return {k:'toggle', label:label, on:on}; }
  function fsSolid(c){ return [fsColor(c, false), fsSel('Material', FS_MATERIAL), fsPct(false, 50), fsSel('Display mode', FS_DISPLAY)]; }
  // one entry per filter cell, in panel order (left column, right column, geometry grid);
  // Machining result is the ENCY window 1:1, the rest follow the same row kinds
  var FS = [
    {title:'Inspector', rows:fsSolid('#70CFFF')},
    {title:'Part', rows:fsSolid('#70CFFF')},
    {title:'Job', rows:fsSolid('#70FFAC')},
    {title:'Workpiece', rows:fsSolid('#FFDF70').concat([fsSlider('Line width', 1, 5, 1)])},
    {title:'Machining result', rows:[fsColor('#FF9B70'), fsSel('Material', FS_MATERIAL), fsPct(true, 69),
      fsSel('Display mode', FS_DISPLAY), fsSel('Turn mode', FS_TURN), fsSlider('Line width', 1, 5, 1), fsTgl('Motionless', false)]},
    {title:'Tool', rows:[fsColor('#7C70FF', false), fsPct(false, 50), fsSel('Display mode', FS_DISPLAY)]},
    {title:'Tool', rows:[fsColor('#7C70FF', false), fsPct(false, 50), fsSel('Display mode', FS_DISPLAY)]},
    {title:'Fixtures', rows:fsSolid('#FFDF70')},
    {title:'Machine', rows:[fsPct(true, 40), fsSel('Display mode', FS_DISPLAY), fsTgl('Motionless', false)]},
    {title:'Toolpath', rows:[fsColor('#70FFAC'), fsSlider('Line width', 1, 5, 1)]},
    {title:'Dot', rows:[fsColor('#FFDF70'), fsSlider('Point size', 1, 10, 4)]},
    {title:'Curve', rows:[fsColor('#70CFFF'), fsSlider('Line width', 1, 5, 2)]},
    {title:'Face', rows:[fsColor('#70FFAC'), fsPct(false, 50), fsSel('Display mode', FS_DISPLAY)]},
    {title:'Mech', rows:[fsColor('#70FFAC'), fsPct(false, 50), fsSlider('Line width', 1, 5, 1)]}
  ];
  // the 3D view reads them (tpedit.js: the Part's Transparent) and repaints on 'ency:fs'
  window.ENCY_FS = FS;
  function fsChanged(){ document.dispatchEvent(new CustomEvent('ency:fs')); }
  var fsetPop = document.getElementById('fsetPop');
  var fsCells = Array.prototype.slice.call(filters.querySelectorAll('.f-cell'));
  var fsCell = null;
  function fsPctOf(r){ return (r.val - (r.min || 0)) / ((r.max || 100) - (r.min || 0)) * 100; }
  function fsRowHtml(r, i){
    var tgl = function(on){ return '<img class="tgl" data-tgl src="' + A[on ? 'tgl-on' : 'tgl-off'] + '" alt="">'; };
    var track = function(off){ var p = fsPctOf(r);
      return '<span class="sp-tol-track fs-track' + (off ? ' is-off' : '') + '" data-tr><i class="fill" style="width:' + p + '%"></i><i class="knob" style="left:' + p + '%"></i></span>'; };
    var ctl;
    if(r.k === 'color') ctl = tgl(r.on) + '<span class="fs-sw' + (r.on ? '' : ' is-off') + '" data-sw style="background:' + r.color + '" title="Pick a color"></span>';
    else if(r.k === 'select') ctl = '<span class="dropdown" data-dd><span class="v">' + r.val + '</span><img class="i16" src="' + A.ddchev + '" alt=""></span>';
    else if(r.k === 'pct') ctl = tgl(r.on) + track(!r.on) + '<span class="sp-input' + (r.on ? '' : ' is-off') + '"><input type="text" value="' + r.val + '"' + (r.on ? '' : ' disabled') + '><em>%</em></span>';
    else if(r.k === 'slider') ctl = track(false) + '<span class="fs-num">' + r.val + '</span>';
    else ctl = tgl(r.on);
    return '<div class="fs-row fs-' + r.k + '" data-i="' + i + '"><span class="fs-lbl">' + r.label + '</span><span class="fs-ctl">' + ctl + '</span></div>';
  }
  function fsRender(){
    var cfg = FS[fsCells.indexOf(fsCell)];
    fsetPop.innerHTML = '<div class="stp-head"><span class="stp-title">' + cfg.title + '</span>' +
      '<button class="stp-close" data-x title="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg></button></div>' +
      '<div class="fs-rows">' + cfg.rows.map(fsRowHtml).join('') + '</div>';
  }
  function fsOpen(cell){
    if(fsCell) fsCell.classList.remove('dd-open');
    fsCell = cell; cell.classList.add('dd-open');
    fsRender();
    fsetPop.hidden = false;
    // right of the panel, the title level with the filter, kept on screen
    var pr = filters.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    fsetPop.style.left = (pr.right + 8) + 'px';
    fsetPop.style.top = Math.max(8, Math.min(cr.top - 8, innerHeight - fsetPop.offsetHeight - 8)) + 'px';
  }
  function fsClose(){
    if(fsCell) fsCell.classList.remove('dd-open');
    fsCell = null; fsetPop.hidden = true;
  }
  fsCells.forEach(function(c){
    c.addEventListener('contextmenu', function(e){
      e.preventDefault(); e.stopPropagation(); closeMenu();
      if(fsCell === c) fsClose(); else fsOpen(c);
    });
  });
  if(fhead) fhead.addEventListener('click', fsClose);   // folding the panel takes its settings along

  /* ---------- Floating panels look: Filters, Draw and the function bar as glass (the status window's)
     or as the old plate; a right-click on the Filters title switches, kept across reloads ---------- */
  var vpEl = document.querySelector('.viewport');
  function vpGlass(on){
    vpEl.classList.toggle('vp-glass', on);
    try { localStorage.setItem('ency.vpGlass', on ? '1' : '0'); } catch(e){}
  }
  try { vpGlass(localStorage.getItem('ency.vpGlass') !== '0'); } catch(e){ vpGlass(true); }
  if(fhead) fhead.addEventListener('contextmenu', function(e){
    e.preventDefault(); e.stopPropagation(); fsClose();
    vpGlass(!vpEl.classList.contains('vp-glass'));
  });
  document.addEventListener('click', fsClose);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') fsClose(); });
  function fsRowOf(el){ var row = el.closest('.fs-row'); return row ? FS[fsCells.indexOf(fsCell)].rows[+row.dataset.i] : null; }
  fsetPop.addEventListener('click', function(e){
    e.stopPropagation(); closeMenu();
    if(e.target.closest('[data-x]')){ fsClose(); return; }
    var r = fsRowOf(e.target); if(!r) return;
    if(e.target.closest('[data-tgl]')){ r.on = !r.on; fsRender(); fsChanged(); return; }
    var sw = e.target.closest('[data-sw]');
    if(sw && r.on){
      showMenu(sw.getBoundingClientRect(), OP_COLORS.map(function(c){
        return {label:c.label, color:c.color, cur:c.color === r.color, onPick:function(){ r.color = c.color; fsRender(); fsChanged(); }};
      }), sw, 120);
      return;
    }
    var dd = e.target.closest('[data-dd]');
    if(dd){
      showMenu(dd.getBoundingClientRect(), r.opts.map(function(o){
        return {label:o, cur:o === r.val, onPick:function(){ r.val = o; fsRender(); fsChanged(); }};
      }), dd, dd.offsetWidth);
    }
  });
  // sliders: drag along the track; Transparent snaps to whole percent, the rest to whole steps
  fsetPop.addEventListener('pointerdown', function(e){
    var tr = e.target.closest('[data-tr]'); if(!tr || tr.classList.contains('is-off')) return;
    var r = fsRowOf(tr), row = tr.closest('.fs-row'); if(!r) return;
    e.preventDefault(); tr.setPointerCapture(e.pointerId);
    var min = r.min || 0, max = r.max || 100;
    var set = function(ev){
      var b = tr.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - b.left) / b.width));
      r.val = Math.round(min + f * (max - min));
      var p = fsPctOf(r);
      tr.querySelector('.fill').style.width = p + '%'; tr.querySelector('.knob').style.left = p + '%';
      var inp = row.querySelector('input'), num = row.querySelector('.fs-num');
      if(inp) inp.value = r.val; if(num) num.textContent = r.val;
      fsChanged();
    };
    set(e);
    var up = function(){ tr.removeEventListener('pointermove', set); tr.removeEventListener('pointerup', up); };
    tr.addEventListener('pointermove', set); tr.addEventListener('pointerup', up);
  });
  // the % field: typed value, kept within 0…100, moves the slider
  fsetPop.addEventListener('change', function(e){
    var r = fsRowOf(e.target); if(!r || r.k !== 'pct') return;
    var v = parseInt(e.target.value, 10);
    r.val = isNaN(v) ? r.val : Math.max(0, Math.min(100, v));
    fsRender(); fsChanged();
  });

  /* ---------- Inspector rail: switch active + content ---------- */
  /* realistic option lists for the Tool tab (turning / ISO catalog) */
  var STATION_OPTS    = ['Turret', 'Lower turret', 'Spindle', 'Sub-spindle', 'Gang slide'];
  var POSITION_OPTS   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  var CORRECTOR_OPTS  = ['Auto','1','2','3','4','5','6','7','8','9','10','11','12'];
  var ORIENT_OPTS     = ['Axial', 'Radial', 'Angular', 'Back-turning'];
  var INSERT_OPTS     = ['CNMG 12 04 08-WF', 'DNMG 15 06 08-PM', 'VNMG 16 04 08-MF', 'WNMG 08 04 08-PM', 'TNMG 16 04 08-PM', 'SNMG 12 04 08-PR'];
  var HOLDER_OPTS     = ['DCLNR 2020K 12', 'PCLNR 2525M 12', 'MCLNR 2020K 12', 'SVJBR 2020K 16', 'DDJNR 2020K 15', 'A25T-DCLNR 12'];
  var TOOLTYPE_OPTS   = ['External turning', 'Internal turning', 'Face turning', 'Grooving', 'Threading', 'Parting / Cut-off'];
  var HOLDERTYPE_OPTS = ['Any', 'L — Left hand', 'R — Right hand', 'N — Neutral'];
  var INSERTTYPE_OPTS = ['Any', 'C — 80° rhombic', 'D — 55° rhombic', 'V — 35° rhombic', 'W — 80° trigon', 'T — 60° triangle', 'S — square'];
  var HANDTYPE_OPTS   = ['Right (R)', 'Left (L)', 'Neutral (N)'];
  /* Links tab: approach / return rules. The list is: strategies (computed by the solver) ·
     machine presets and user templates (command lists, come from rules.js) · Custom… */
  var AR_OPTS = ['Avoid collisions', 'Short'];
  var TOOLCHG_OPTS  = ['From Previous', 'From Root', 'Return by default'];
  var SAFESURF_OPTS = ['Plane', 'Cylinder', 'Sphere', 'Box', 'None'];
  var PARAMS = {
    Setup: [
      {label:'Coordinate system', ctl:'dropdown', val:'World'},
      {label:'Origin X', ctl:'input', val:'000.000', indent:1},
      {label:'Clearance', ctl:'toggleInput', on:false, val:'010.000', indent:2, shev:'leaf', sel:true},
      {label:'Axis mode', ctl:'pair', shev:'right'},
      {label:'Stock', ctl:'dropdown', val:'From solid', indent:1, shev:'right'},
      {label:'Orientation', ctl:'dropdown', val:'Z up', indent:1},
      {label:'Top height', ctl:'dropdown', val:'Model top', indent:2, shev:'leaf'},
      {label:'Flip Z', ctl:'toggle', on:true, indent:2, shev:'leaf'},
      {label:'Safe Z', ctl:'input', val:'025.000', indent:2, shev:'leaf'},
      {label:'Rapid Z', ctl:'input', val:'005.000', indent:2, shev:'leaf'}
    ],
    Tool: {
      head:'CNMG-12 04 08-WF/DCLNR-2020K-12',
      /* read-only / edit-assembly content — assembly composition (concept) */
      assembly:[
        {label:'Station', ctl:'duo', val:'Turret', val2:'8', nomore:true, opts:STATION_OPTS, opts2:POSITION_OPTS},
        {label:'Corrector', ctl:'dropdown', val:'Auto', nomore:true, opts:CORRECTOR_OPTS},
        {label:'Corrector 2', ctl:'dropdown', val:'Auto', nomore:true, opts:CORRECTOR_OPTS},
        {label:'Orientation', ctl:'dropdown', val:'Axial', shev:'open', ghead:'orient', nomore:true, opts:ORIENT_OPTS},
        {label:'Opposite spindle', ctl:'toggle', on:false, indent:1, gchild:'orient', nomore:true},
        {type:'divider'},
        {label:'Tool', ctl:'dropdown', val:'CNMG 12 04 08-WF', shev:'open', ghead:'tool', editBtn:'compTool', lock:true, opts:INSERT_OPTS},
        {label:'Diameter', ctl:'readonly', val:'12.7 mm', indent:1, gchild:'tool', nomore:true},
        {label:'Length (L)', ctl:'readonly', val:'12.9 mm', indent:1, gchild:'tool', nomore:true},
        {label:'Working length (WL)', ctl:'readonly', val:'4.0 mm', indent:1, gchild:'tool', nomore:true},
        {label:'Adapter', ctl:'dropdown', val:'DCLNR 2020K 12', shev:'open', ghead:'adapter', editBtn:'compAdapter', lock:true, opts:HOLDER_OPTS},
        {label:'Holder length', ctl:'readonly', val:'125 mm', indent:1, gchild:'adapter', nomore:true},
        {type:'divider'},
        {type:'refhead', text:'Used in operations'},
        {type:'opitem', val:'Lathe facing'},
        {type:'opitem', val:'OD roughing'}
      ],
      /* edit-tool content: setup/station params + tool filters (params), then divider, then results list */
      tool:[
        {label:'Station', ctl:'duo', val:'Turret', val2:'8', nomore:true, opts:STATION_OPTS, opts2:POSITION_OPTS},
        {label:'Orientation', ctl:'dropdown', val:'Axial', shev:'open', ghead:'orient', nomore:true, opts:ORIENT_OPTS},
        {label:'Opposite spindle', ctl:'toggle', on:false, indent:1, gchild:'orient', nomore:true},
        {type:'divider'},
        {label:'Tool Type', ctl:'dropdown', val:'External turning', opts:TOOLTYPE_OPTS, nomore:true},
        {label:'Holder Type', ctl:'dropdown', val:'Any', opts:HOLDERTYPE_OPTS, nomore:true},
        {label:'Insert Type', ctl:'dropdown', val:'Any', opts:INSERTTYPE_OPTS, nomore:true},
        {label:'Hand Type', ctl:'dropdown', val:'Right (R)', opts:HANDTYPE_OPTS, nomore:true},
        {type:'divider'},
        {type:'search', placeholder:'Search'},
        {type:'divider'},
        {label:'Library tools', shev:'open', ghead:'lib', headonly:true},
        {type:'listitem', val:'C2R-BR25-LH25DF1_270712203', gchild:'lib'},
        {type:'listitem', val:'C6-DCLNR-45065-16B1_99964142', gchild:'lib'},
        {type:'listitem', val:'C6-DSSNL-45054-15B1_99964972', gchild:'lib'},
        {type:'listitem', val:'C6-DSSNR-45054-15B1_99964421', gchild:'lib'},
        {type:'listitem', val:'C6-DVJNL-45065-16C1_227276620', gchild:'lib'},
        {type:'listitem', val:'C6-DVJNR-45065-16C1_99965688', gchild:'lib'},
        {type:'listitem', val:'CNMG-12 04 08-WF/DCLNR-2020K-12', gchild:'lib', sel:true},
        {type:'listitem', val:'External Turn 20x20', gchild:'lib'},
        {type:'listitem', val:'External Turn 25x25', gchild:'lib'},
        {type:'listitem', val:'IC16 Re0.2 R OD cutting tool', gchild:'lib'}
      ]
    },
    Speeds: [
      {label:'Spindle speed', ctl:'input', val:'012000'},
      {label:'Feed rate', ctl:'input', val:'001.200', indent:1},
      {label:'Plunge rate', ctl:'input', val:'000.300', indent:1},
      {label:'Units', ctl:'dropdown', val:'mm/min'},
      {label:'Adaptive feed', ctl:'toggle', on:false}
    ],
    Strategy: [
      {label:'Pattern', ctl:'dropdown', val:'Parallel'},
      {label:'Stepover', ctl:'input', val:'002.000', indent:1},
      {label:'Stock to leave', ctl:'input', val:'000.200', indent:1},
      {label:'Direction', ctl:'pair', shev:'right'},
      {label:'Climb milling', ctl:'toggle', on:true}
    ],
    Fixture: [
      {label:'Type', ctl:'dropdown', val:'Vise'},
      {label:'Offset', ctl:'input', val:'000.000', indent:1},
      {label:'Clamp', ctl:'toggle', on:false}
    ],
    /* Links/Leads — the two approach / return combos share one option list;
       "Custom…" at the end opens the rules editor (window comes later) */
    Links: [
      {label:'Approach/Return', shev:'open', ghead:'ar', headonly:true, bold:true},
      {label:'Approach', ctl:'dropdown', val:'Avoid collisions', opts:AR_OPTS, custom:true, indent:1, gchild:'ar', nomore:true},
      {label:'Return', ctl:'dropdown', val:'Avoid collisions', opts:AR_OPTS, custom:true, indent:1, gchild:'ar', nomore:true},
      {label:'Tool change position', ctl:'dropdown', val:'From Previous', opts:TOOLCHG_OPTS, indent:1, gchild:'ar', nomore:true},
      {type:'divider'},
      {label:'Safe motions', shev:'open', ghead:'safe', headonly:true, bold:true},
      {label:'Safe surface', ctl:'dropdown', val:'Plane', opts:SAFESURF_OPTS, indent:1, gchild:'safe', shev:'right', nomore:true},
      {label:'Safe level', ctl:'input', val:'10 mm from the top', indent:1, gchild:'safe', nomore:true},
      {label:'Avoid collisions at rapid', ctl:'toggle', on:false, indent:1, gchild:'safe', nomore:true},
      {label:'Check workpiece', ctl:'toggle', on:false, indent:1, gchild:'safe', nomore:true},
      {label:'Safe distance', ctl:'input', val:'20 mm', indent:1, gchild:'safe', nomore:true}
    ],
    /* the tabs added with the context rail — filler content until the real panels are drawn */
    Machine: [
      {label:'Machine', ctl:'dropdown', val:'HAAS VF-4', opts:['HAAS VF-4', 'DMG MORI NLX 2500', 'Mill-turn machine']},
      {label:'Machine limits', ctl:'toggle', on:true},
      {type:'divider'},
      {label:'Tool coordinates in WCS', shev:'open', ghead:'tcw', headonly:true, bold:true},
      {label:'X', ctl:'readonly', val:'-2.727', indent:1, gchild:'tcw', nomore:true},
      {label:'Y', ctl:'readonly', val:'42.019', indent:1, gchild:'tcw', nomore:true},
      {label:'Z', ctl:'readonly', val:'740.566', indent:1, gchild:'tcw', nomore:true}
    ],
    Job: [
      {label:'Job', ctl:'dropdown', val:'Main program', opts:['Main program', 'Subprogram 1']},
      {label:'Program number', ctl:'input', val:'O1001'},
      {label:'Comment', ctl:'input', val:'Housing, side A'}
    ],
    Parameters: [
      {label:'Tolerance', ctl:'input', val:'0.01 mm'},
      {label:'Stock to leave', ctl:'input', val:'0.2 mm'},
      {label:'Step down', ctl:'input', val:'1.5 mm'},
      {label:'Rest machining', ctl:'toggle', on:false}
    ],
    Transformation: [
      {label:'Transformation', ctl:'dropdown', val:'None', opts:['None', 'Move', 'Rotate', 'Mirror', 'Pattern']},
      {label:'Keep original', ctl:'toggle', on:true}
    ],
    Macro: [
      {label:'Macro template', ctl:'dropdown', val:'Not set', opts:['Not set', 'Deburr edges', 'Probe part', 'Clean chips']},
      {label:'Run before the operation', ctl:'toggle', on:false},
      {label:'Run after the operation', ctl:'toggle', on:false}
    ],
    Part: [
      {label:'Part', ctl:'dropdown', val:'Auto – part of the previous operation', opts:['Auto – part of the previous operation', 'Housing', 'Cover']},
      {label:'Faces', ctl:'readonly', val:'139'},
      {label:'Curves', ctl:'readonly', val:'6'},
      {label:'Points', ctl:'readonly', val:'211'}
    ],
    Workpiece: [
      {label:'Workpiece', ctl:'dropdown', val:'Auto – result of the previous operation', opts:['Auto – result of the previous operation', 'Box', 'Cylinder', 'From solid']},
      {label:'Offset', ctl:'input', val:'1 mm', indent:1}
    ],
    Restriction: [
      {label:'Restriction', ctl:'dropdown', val:'None', opts:['None', 'Box', 'Curves', 'Faces']},
      {label:'Tool position', ctl:'dropdown', val:'Center', opts:['Center', 'Inside', 'Outside'], indent:1},
      {label:'Offset', ctl:'input', val:'0 mm', indent:1}
    ]
  };
  var DD_OPTS = ['Text for example','Linear','Radial','Spiral','None'];
  var irows = document.getElementById('irows');
  var inspTitle = document.getElementById('inspTitle');

  function shevSrc(kind){ return kind==='leaf' ? A['shev-leaf'] : kind==='right' ? A['shev-right'] : A['shev-open']; }

  function buildRow(p){
    /* --- non-parameter rows --- */
    if(p.type==='divider'){
      var d = document.createElement('div'); d.className = 'line' + (p.strong ? ' strong' : ''); return d;
    }
    if(p.type==='caption'){
      var c = document.createElement('div'); c.className = 'icap'; c.textContent = p.text; return c;
    }
    if(p.type==='refhead'){ /* reference section label — deliberately NOT a parameter row */
      var rh = document.createElement('div'); rh.className = 'ref-head'; rh.textContent = p.text; return rh;
    }
    if(p.type==='search'){
      var s = document.createElement('div'); s.className = 'search-row';
      s.innerHTML = '<span class="input search-box"><input type="text" placeholder="'+(p.placeholder||'')+'"></span>';
      return s;
    }
    if(p.type==='listitem'){
      var li = document.createElement('div');
      var cur = (p.val === PARAMS.Tool.head);
      li.className = 'ilist-item asm-item' + (cur ? ' sel cur' : '') + (p._libActive ? ' active' : '');
      if(p.gchild) li.dataset.group = p.gchild;
      if(typeof p._libIdx === 'number') li.dataset.idx = p._libIdx;
      li.innerHTML = '<span class="asm-name">'+p.val+'</span><span class="asm-cur">'+(cur?SVG_CHECK:'')+'</span>';
      return li;
    }
    if(p.type==='opitem'){ /* read-only reference: an operation this assembly is used in */
      var oi = document.createElement('div');
      oi.className = 'opitem';
      if(p.gchild){ oi.dataset.group = p.gchild; if(toolCollapsed[p.gchild]) oi.style.display = 'none'; }
      oi.innerHTML = '<span class="op-dot"></span><span class="op-name">'+p.val+'</span>';
      return oi;
    }
    /* --- parameter rows --- */
    var row = document.createElement('div');
    row.className = 'irow' + (p.sel ? ' sel' : '') + (p.ghead && toolCollapsed[p.ghead] ? ' collapsed' : '') + (p.ctl==='readonly' ? ' roparam' : '') + (p.lock ? ' lockable' : '');
    if(p.ghead) row.dataset.ghead = p.ghead;
    if(p.gchild){ row.dataset.group = p.gchild; if(toolCollapsed[p.gchild]) row.style.display = 'none'; }
    var itlClass = 'itl' + (p.indent===1?' i1':p.indent===2?' i2':'');
    var shevHtml = p.shev
      ? '<img class="shev'+(p.ghead?' exp':'')+'" src="'+shevSrc(p.shev)+'">'
      : '<i class="shev"></i>';
    var lblCls = p.bold ? ' class="b"' : '';
    var optsA  = (p.opts  ? ' data-opts="'+p.opts.join('|')+'"'  : '') + (p.custom ? ' data-custom="'+p.label+'"' : '');
    var optsB  = p.opts2 ? ' data-opts="'+p.opts2.join('|')+'"' : '';
    var ctlHtml = '', between = (p.ctl==='toggle' || p.ctl==='pair') && !p.tight;
    if(p.ctl==='dropdown'){
      ctlHtml = '<span class="dropdown"'+optsA+'><span class="v">'+p.val+'</span><img class="i16" src="'+A.ddchev+'"></span>';
    } else if(p.ctl==='input'){
      ctlHtml = '<span class="input"><span class="v">'+p.val+'</span></span>';
    } else if(p.ctl==='readonly'){
      ctlHtml = '<span class="roval">'+p.val+'</span>';
    } else if(p.ctl==='toggle'){
      ctlHtml = '<img class="tgl'+(p.on?' on':'')+'" src="'+(p.on?A['tgl-on']:A['tgl-off'])+'">';
    } else if(p.ctl==='toggleInput'){
      ctlHtml = '<img class="tgl'+(p.on?' on':'')+'" src="'+(p.on?A['tgl-on']:A['tgl-off'])+'"><span class="input"><span class="v">'+p.val+'</span></span>';
    } else if(p.ctl==='pair'){
      ctlHtml = '<span class="ipair"><span class="bicn"><img class="i16" src="'+A['row-a']+'"></span><span class="bicn"><img class="i16" src="'+A['row-b']+'"></span></span>';
    } else if(p.ctl==='duo'){
      ctlHtml = '<span class="dropdown duo-a"'+optsA+'><span class="v">'+p.val+'</span><img class="i16" src="'+A.ddchev+'"></span>'+
                '<span class="dropdown duo-b"'+optsB+'><span class="v">'+p.val2+'</span><img class="i16" src="'+A.ddchev+'"></span>';
    }
    var trail;
    if(p.editBtn)      trail = '<button class="rowbtn'+(editComp && editComp===p.ghead ? ' on' : '')+'" data-act="'+p.editBtn+'" title="Edit">'+SVG_EDIT+'</button>';
    else if(p.plus)    trail = '<button class="rowbtn" title="Add point">'+SVG_PLUS+'</button>';
    else if(p.minus)   trail = '<button class="rowbtn" title="Remove">'+SVG_MINUS+'</button>';
    else               trail = p.nomore ? '' : '<img class="icn11" src="'+A.icn11+'">';
    row.innerHTML =
      '<div class="ilbl"><img class="hint" src="'+A.hint+'">'+
        '<div class="'+itlClass+'">'+shevHtml+
          '<span class="rlabel"><span'+lblCls+'>'+p.label+'</span></span></div></div>'+
      (p.headonly ? '' : '<div class="ictl'+(between?' between':'')+'">'+ctlHtml+trail+'</div>');
    return row;
  }
  var titleCtl = document.getElementById('titleCtl');

  /* ---------- Tool Assembly workflow (view → edit assembly → edit tool, in-place) ---------- */
  var toolState = 'view', toolPrev = 'view'; // 'view' | 'editAssembly' | 'editTool'(=build/pick) | 'pickAssembly'
  var toolPickIdx = 0; // keyboard-focused row index in the pickAssembly list (flat across groups)
  var toolLibIdx  = 0; // keyboard-focused row index in the editTool library-tools list
  var editComp = null; // null | 'tool' | 'adapter' — which component's params are being edited (within editAssembly)
  var toolCollapsed = {tool:true, adapter:true}; // assembly groups collapsed by default
  var TOOL_ASSEMBLIES = [
    {group:'Turret', items:[
      'CNMG-12 04 08-WF/DCLNR-2020K-12',
      'C6-DVJNR-45065-16C1 Axial block',
      'C6-DCLNR-45065-16B1 Turn block'
    ]},
    {group:'Spindle', items:[
      'Drill D10 L72580127 Axial drill block',
      'C2R-BR25-LH25DF1 Boring bar',
      'External Turn 25x25'
    ]}
  ];
  var SVG_EDIT = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M10.4 3.1l2.5 2.5M2.7 11.2l7.7-7.7 2.5 2.5-7.7 7.7-3 .5.5-3z"/></svg>';
  var SVG_PLUS = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>';
  var SVG_MINUS = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3.5 8h9"/></svg>';
  var SVG_SLIDERS = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M5 3.5v2.4M5 9.6v3M11 3.5v5.9M11 12.6v0"/><circle cx="5" cy="7.7" r="1.5" fill="currentColor" stroke="none"/><circle cx="11" cy="11" r="1.5" fill="currentColor" stroke="none"/></svg>';
  var SVG_CHECK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  var SVG_BACK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5L5 8l4.5 4.5"/></svg>';

  function toolActions(){
    if(toolState==='pickAssembly' || toolState==='editTool')
      return '<button class="tact tback" data-act="backPick" title="Back">'+SVG_BACK+'<span>Back</span></button>';
    return toolState==='view'
      ? '<button class="tact ticn" data-act="editToolMode" title="Edit assembly">'+SVG_EDIT+'</button>'+
        '<button class="tact ticn" data-act="addAsm" title="Create new assembly">'+SVG_PLUS+'</button>'
      : '<button class="tact cancel" data-act="cancel">Cancel</button><button class="tact apply" data-act="apply">Apply</button>';
  }
  function selectorRow(withEdit){
    var r = document.createElement('div');
    r.className = 'tool-sel';
    r.innerHTML =
      '<span class="dropdown selbox" data-act="pickAsm"><span class="v">'+PARAMS.Tool.head+'</span><img class="i16" src="'+A.ddchev+'"></span>'+
      (withEdit ? '<button class="edittool" data-act="editAsm" title="Edit assembly">'+SVG_EDIT+'</button>' : '');
    return r;
  }
  function pickItemsFlat(){ var a = []; TOOL_ASSEMBLIES.forEach(function(g){ g.items.forEach(function(o){ a.push(o); }); }); return a; }
  function libItemsFlat(){ return PARAMS.Tool.tool.filter(function(p){ return p.type==='listitem'; }).map(function(p){ return p.val; }); }
  function pickList(){
    var wrap = document.createElement('div');
    wrap.className = 'asm-list';
    var html = '', fi = -1;
    TOOL_ASSEMBLIES.forEach(function(g, gi){
      if(gi>0) html += '<div class="line"></div>';
      html += '<div class="dd-head">'+g.group+'</div>';
      var tn = 0;
      g.items.forEach(function(o){
        tn++; fi++;
        var on = (o===PARAMS.Tool.head);
        var active = (fi===toolPickIdx);
        html += '<div class="ilist-item asm-item'+(on?' cur':'')+(active?' active':'')+'" data-asm="'+o.replace(/"/g,'&quot;')+'" data-idx="'+fi+'">'+
                  '<span class="dd-pre">T#'+tn+'</span>'+
                  '<span class="asm-name">'+o+'</span>'+
                  '<span class="asm-cur">'+(on?SVG_CHECK:'')+'</span></div>';
      });
    });
    wrap.innerHTML = html;
    return wrap;
  }
  function focusPickRow(){ var a = irows.querySelector('.ilist-item.active, .asm-item.active'); if(a) a.scrollIntoView({block:'nearest'}); }
  function renderToolTab(){
    titleCtl.innerHTML = toolActions();
    irows.innerHTML = '';
    irows.classList.toggle('ro', toolState==='view');
    if(toolState==='pickAssembly'){ irows.appendChild(pickList()); return; }
    if(toolState==='editTool'){
      var li = 0;
      PARAMS.Tool.tool.forEach(function(p){
        var pp = p;
        if(p.type==='listitem'){
          pp = Object.assign({}, p, {_libIdx: li, _libActive: li===toolLibIdx});
          li++;
        }
        irows.appendChild(buildRow(pp));
      });
      return;
    }
    irows.appendChild(selectorRow(false)); /* edit pencil hidden for now (editAssembly still reachable in code) */
    var d = document.createElement('div'); d.className = 'line'; irows.appendChild(d);
    PARAMS.Tool.assembly.forEach(function(p){
      // a component's read-only sub-params become editable inputs while that component is being edited
      var pp = (p.ctl==='readonly' && editComp && p.gchild===editComp) ? Object.assign({}, p, {ctl:'input'}) : p;
      irows.appendChild(buildRow(pp));
    });
  }
  function gotoTool(s){ if(s==='editTool' || s==='pickAssembly') toolPrev = toolState; editComp = null; toolState = s; renderToolTab(); }
  function toolRow(arr, label){ for(var i=0;i<arr.length;i++){ if(arr[i].label===label) return arr[i]; } return null; }
  /* enter build/pick mode: '+' bumps the Station position to the next one, 'edit' keeps the current one */
  function enterBuild(increment){
    var aSt = toolRow(PARAMS.Tool.assembly, 'Station');
    var tSt = toolRow(PARAMS.Tool.tool, 'Station');
    if(aSt && tSt){
      var n = parseInt(aSt.val2, 10); if(isNaN(n)) n = 0;
      tSt.val = aSt.val;                       // same magazine (Turret/Spindle)
      tSt.val2 = String(increment ? n + 1 : n); // '+' → next position; 'edit' → keep current
    }
    toolLibIdx = Math.max(0, libItemsFlat().indexOf(PARAMS.Tool.head)); // keyboard focus = current head
    gotoTool('editTool');
    focusPickRow();
  }

  function renderInspector(tab){
    // the Toolpath edits tab (tpedit.js) owns the 3D toolpath view: it shows only while the tab is open;
    // the drawing panel (also tpedit.js) shows on the Job tab too
    if(window.tpeTab) window.tpeTab(tab === 'Edits', tab);
    if(tab==='Tool'){ renderToolTab(); return; }
    if(tab==='Edits' && window.tpeRender){ titleCtl.innerHTML = ''; irows.classList.remove('ro'); window.tpeRender(); return; }
    titleCtl.innerHTML = '';
    irows.classList.remove('ro');
    var cfg = PARAMS[tab] || [];
    var list = Array.isArray(cfg) ? cfg : (cfg.rows || []);
    irows.innerHTML = '';
    list.forEach(function(p){ irows.appendChild(buildRow(p)); });
  }
  /* the title names the inspector tab; some tabs carry a fuller name */
  var TAB_TITLES = { Tool: 'Tool Assembly', Edits: 'Toolpath edits' };
  // the Toolpath edits tab (tpedit.js) builds its rows with the same pieces
  window.ENCY_INSP = {irows:irows, titleCtl:titleCtl, inspTitle:inspTitle, A:A, emitAction:emitAction, buildRow:buildRow,
    SVG:{edit:SVG_EDIT, plus:SVG_PLUS, check:SVG_CHECK},
    activeTab:function(){ return railCur; },
    rerender:function(){ var t = this.activeTab(); if(t) renderInspector(t); }};

  /* ---------- Inspector tabs (the rail): the set follows the node selected in the tree;
     an operation has optional tabs, switched on in the More overlay; Hole only for
     drilling. Tabs the rail has no room for move into the More overlay ---------- */
  var RAIL = {   // icons: Core icn_inspector (Restriction = inc_section); none yet → placeholder square
    Setup:{icon:'rail-setup'}, Machine:{icon:'rail-machine'}, Job:{icon:'rail-job'}, Hole:{icon:'rail-hole'},
    Strategy:{icon:'rail-strategy'}, Parameters:{icon:'rail-parameters'}, Links:{icon:'rail-links'}, Tool:{icon:'rail-tool'},
    Speeds:{icon:'rail-speeds'}, Transformation:{icon:'rail-transformation'}, Macro:{t:'Macro template', icon:'rail-macro'}, Part:{icon:'rail-part'},
    Workpiece:{icon:'rail-workpiece'}, Fixture:{icon:'rail-fixture'}, Restriction:{icon:'rail-restriction'},
    Edits:{t:'Toolpath edits', icon:'rail-edits'}
  };
  // machine and setup as in ENCY; Part and Group are nodes of the prototype only — a guess
  var RAIL_CTX = {
    machine:   ['Setup', 'Machine', 'Links', 'Fixture'],
    setup:     ['Setup', 'Links', 'Part', 'Workpiece', 'Fixture', 'Restriction'],
    part:      ['Part', 'Workpiece', 'Fixture', 'Restriction'],
    group:     ['Setup', 'Links', 'Fixture'],
    operation: ['Setup', 'Job', 'Hole', 'Strategy', 'Parameters', 'Links', 'Tool', 'Speeds',
                'Transformation', 'Macro', 'Part', 'Workpiece', 'Fixture', 'Edits']
  };
  // the only optional tabs (operation): switched in the More overlay, off by default as in ENCY;
  // everything else follows the context
  var RAIL_OPT = {Transformation:false, Macro:false, Part:false, Workpiece:false};
  var DRILL_RE = /drill|tapping|reaming|countersink/i;
  var railTabs = document.getElementById('railTabs'), railMore = document.getElementById('railMore');
  var railCur = 'Tool', railCtx = '', railOver = [];
  function railTitle(id){ return RAIL[id].t || id; }
  function railIcon(id){
    return RAIL[id].icon ? '<img class="ricn" src="assets/' + RAIL[id].icon + '.svg" alt="">' : '<span class="ricn opic"></span>';
  }
  function railList(){
    var op = railCtx.indexOf('operation') === 0, drill = railCtx === 'operation:drill';
    return RAIL_CTX[op ? 'operation' : railCtx].filter(function(id){
      if(id === 'Hole') return drill;
      return !op || !(id in RAIL_OPT) || RAIL_OPT[id];
    });
  }
  function railOpen(id){
    railCur = id; toolState = 'view';
    inspTitle.textContent = TAB_TITLES[id] || railTitle(id);
    railDraw();
    renderInspector(id);
  }
  // as many tabs as fit between the placement dots and More (28px buttons, 2px gaps, some air above
  // More); the rest go to the More overlay, and More lights up while one of them is open
  var railEl = railTabs.closest('.rail'), railPlaceEl = document.getElementById('railPlace');
  function railDraw(){
    if(!railCtx) return;   // before the first railSync (ResizeObserver fires on observe)
    var list = railList(), placeH = railPlaceEl ? railPlaceEl.offsetHeight : 0;
    var fit = Math.max(1, Math.floor((railEl.clientHeight - placeH - railMore.offsetHeight - 8 + 2) / 30));
    railOver = list.slice(fit);
    railTabs.innerHTML = list.slice(0, fit).map(function(id){
      return '<div class="rbtn' + (id === railCur ? ' active' : '') + '" data-tab="' + id + '" title="' + railTitle(id) + '">' + railIcon(id) + '</div>';
    }).join('');
    railMore.classList.toggle('active', railOver.indexOf(railCur) >= 0);
    railMore.classList.toggle('is-off', !railOver.length && railCtx.indexOf('operation') !== 0);
  }
  // the selection decides the set; the open tab stays when the new set has it
  function railSync(force){
    var sel = tree.querySelector('.trow.tsel'), t = sel ? sel.dataset.type : 'machine';
    var ctx = !RAIL_CTX[t] ? 'machine' : t !== 'operation' ? t
      : DRILL_RE.test(rowName(sel)) ? 'operation:drill' : 'operation';
    if(ctx === railCtx && !force) return;
    railCtx = ctx;
    var list = railList();
    if(list.indexOf(railCur) < 0) railOpen(list[0]); else railDraw();
  }
  railTabs.addEventListener('click', function(e){
    var b = e.target.closest('.rbtn[data-tab]'); if(b) railOpen(b.dataset.tab);
  });
  // More: the tabs the rail has no room for as a plain list on top, then — after a divider —
  // the toggles of the optional tabs (operation)
  function railMenu(){
    closeMenu();
    var h = '';
    if(railOver.length){
      h += railOver.map(function(id){
        return '<div class="dd-opt rm-opt' + (id === railCur ? ' cur' : '') + '" data-open="' + id + '">' + railIcon(id) + '<span>' + railTitle(id) + '</span></div>';
      }).join('');
    }
    if(railCtx.indexOf('operation') === 0){
      if(h) h += '<div class="dd-sep"></div>';
      h += Object.keys(RAIL_OPT).map(function(id){
        var on = RAIL_OPT[id];
        return '<div class="dd-opt rm-opt" data-opt="' + id + '"><img class="tgl' + (on ? ' on' : '') + '" src="' + A[on ? 'tgl-on' : 'tgl-off'] + '" alt="">' +
          railIcon(id) + '<span>' + railTitle(id) + '</span></div>';
      }).join('');
    }
    if(!h) return;
    var m = document.createElement('div'); m.className = 'dd-menu rail-menu'; m._owner = railMore; m.innerHTML = h;
    document.body.appendChild(m);
    // beside the rail, its bottom level with More (it opens upward)
    var r = railMore.getBoundingClientRect();
    m.style.left = (r.right + 8) + 'px';
    m.style.top = Math.max(8, r.bottom - m.offsetHeight) + 'px';
    railMore.classList.add('dd-open');
    openMenu = m;
    m.addEventListener('click', function(ev){
      ev.stopPropagation();
      var o = ev.target.closest('[data-open]');
      if(o){ closeMenu(); railOpen(o.dataset.open); return; }
      var t = ev.target.closest('[data-opt]'); if(!t) return;
      var id = t.dataset.opt; RAIL_OPT[id] = !RAIL_OPT[id];
      // the open tab switched off: back to the first one
      if(!RAIL_OPT[id] && railCur === id) railOpen(railList()[0]); else railDraw();
      railMenu();
    });
  }
  railMore.addEventListener('click', function(e){
    e.stopPropagation();
    if(openMenu && openMenu._owner === railMore){ closeMenu(); return; }
    railMenu();
  });
  // a shorter inspector (dock split, window size) moves tabs into More and back
  // (an open More overlay is rebuilt with them)
  new ResizeObserver(function(){
    railDraw();
    if(openMenu && openMenu._owner === railMore) railMenu();
  }).observe(railEl);
  /* Tool workflow actions: Edit / Cancel / Apply / edit-tool */
  document.addEventListener('click', function(e){
    var act = e.target.closest('[data-act]');
    if(!act) return;
    e.stopPropagation();
    var a = act.dataset.act;
    if(a==='editAsm') gotoTool('editAssembly');            /* edit assembly: pick tool/adapter */
    else if(a==='pickAsm'){ toolPickIdx = Math.max(0, pickItemsFlat().indexOf(PARAMS.Tool.head)); gotoTool('pickAssembly'); focusPickRow(); } /* full-panel picker, focus current */
    else if(a==='backPick') gotoTool(toolPrev||'view');    /* back from picker without changing selection */
    else if(a==='addAsm') enterBuild(true);                /* create new assembly → next Station position */
    else if(a==='editToolMode') enterBuild(false);         /* edit current assembly → keep Station position */
    else if(a==='compTool'){ editComp='tool'; toolCollapsed.tool=false; renderToolTab(); }       /* edit tool params */
    else if(a==='compAdapter'){ editComp='adapter'; toolCollapsed.adapter=false; renderToolTab(); } /* edit adapter params */
    else if(a==='cancel' || a==='apply'){
      if(toolState==='editTool') gotoTool(toolPrev||'view');
      else if(editComp){ editComp=null; renderToolTab(); }  /* component edit → back to assembly edit */
      else gotoTool('view');                                /* assembly edit → view */
    }
  });
  /* keyboard navigation for any list mode: ↑/↓ moves focus AND applies immediately (check moves with focus); Enter/Esc closes */
  document.addEventListener('keydown', function(e){
    var picker = toolState==='pickAssembly', builder = toolState==='editTool';
    if(!picker && !builder) return;
    var flat = picker ? pickItemsFlat() : libItemsFlat();
    if(!flat.length) return;
    var idxVar = function(v){ if(picker) toolPickIdx = v; else toolLibIdx = v; };
    var idxCur = picker ? toolPickIdx : toolLibIdx;
    var apply = function(){ PARAMS.Tool.head = flat[picker?toolPickIdx:toolLibIdx]; renderToolTab(); focusPickRow(); };
    if(e.key==='ArrowDown'){ e.preventDefault(); idxVar(Math.min(idxCur+1, flat.length-1)); apply(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); idxVar(Math.max(idxCur-1, 0)); apply(); }
    else if(e.key==='Home'){ e.preventDefault(); idxVar(0); apply(); }
    else if(e.key==='End'){ e.preventDefault(); idxVar(flat.length-1); apply(); }
    else if(e.key==='Enter' || e.key==='Escape'){ e.preventDefault(); gotoTool(toolPrev||'view'); }
  });

  /* Links tab: "Custom…" opens the approach / return rules editor.
     The window itself is not built yet — this is the hook for it. */
  function linksCustomOpen(which, anchor){
    closeStatus();
    if(window.arOpen) window.arOpen(which);   // rules.js — the "Approach / Return rules" window
  }

  /* ---------- Inspector interactions (event delegation) ---------- */
  irows.addEventListener('click', function(e){
    var tgl = e.target.closest('.tgl');
    if(tgl){
      e.stopPropagation(); var on = tgl.classList.toggle('on'); tgl.src = on ? A['tgl-on'] : A['tgl-off'];
      var tr = tgl.closest('.irow'), tl = tr && tr.querySelector('.rlabel span');
      if(tl) emitAction(tl.textContent, on ? 'On' : 'Off', 'OP.PARAM "' + tl.textContent + '" ' + (on ? 'TRUE' : 'FALSE'), {ctl:'toggle'});
      return;
    }
    /* .selbox is not a menu anymore — it navigates to the full-panel picker (data-act=pickAsm), so let it bubble */
    var dd = e.target.closest('.dropdown:not(.selbox)');
    if(dd){
      e.stopPropagation();
      if(openMenu && openMenu._owner === dd){ closeMenu(); return; }
      var v = dd.querySelector('.v');
      var opts = dd.dataset.opts ? dd.dataset.opts.split('|') : DD_OPTS.slice();
      if(opts.indexOf(v.textContent) < 0) opts = [v.textContent].concat(opts);
      var ddRow = dd.closest('.irow'), ddLbl = ddRow && ddRow.querySelector('.rlabel span');
      var ddName = ddLbl ? ddLbl.textContent : 'Parameter';
      var items = opts.map(function(o){ return {label:o, cur:o===v.textContent, onPick:function(){
        v.textContent=o; emitAction(ddName, o, 'OP.PARAM "' + ddName + '" "' + o + '"', {ctl:'dropdown', opts:opts.slice()});
      }}; });
      // Approach / Return: strategies · machine presets · user templates · Custom…
      if(dd.dataset.custom){
        var which = dd.dataset.custom, tpl = window.arTemplates ? window.arTemplates(which) : {machine:[], user:[]};
        items = AR_OPTS.map(function(o){ return {label:o, cur:o===v.textContent, onPick:function(){
          v.textContent = o; if(window.arClose) window.arClose(which);     // a strategy has no command list
        }}; });
        var pick = function(name, user){ return {label:name, cur:name===v.textContent, onPick:function(){
          v.textContent = name; closeStatus(); if(window.arOpen) window.arOpen(which, name, user); }}; };
        if(tpl.machine.length){ items.push({sep:true}); tpl.machine.forEach(function(n){ items.push(pick(n, false)); }); }
        if(tpl.user.length){ items.push({sep:true}); tpl.user.forEach(function(n){ items.push(pick(n, true)); }); }
        items.push({sep:true});
        items.push({label:'Custom…', cur:v.textContent==='Custom', onPick:function(){ v.textContent='Custom'; linksCustomOpen(which, dd); }});
      }
      showMenu(dd.getBoundingClientRect(), items, dd, dd.getBoundingClientRect().width);
      return;
    }
    var gshev = e.target.closest('.shev.exp');
    if(gshev){
      var ghrow = gshev.closest('.irow[data-ghead]');
      if(ghrow){
        e.stopPropagation();
        var gid = ghrow.dataset.ghead;
        var hide = !ghrow.classList.contains('collapsed');
        ghrow.classList.toggle('collapsed', hide);
        if(gid in toolCollapsed) toolCollapsed[gid] = hide;
        irows.querySelectorAll('[data-group="'+gid+'"]').forEach(function(x){ x.style.display = hide ? 'none' : ''; });
        return;
      }
    }
    var litem = e.target.closest('.ilist-item');
    if(litem){
      /* click on a list row only MOVES the selection (same as arrow keys); Back/Esc/Enter closes */
      if(litem.dataset.asm){
        PARAMS.Tool.head = litem.dataset.asm;
        toolPickIdx = parseInt(litem.dataset.idx, 10) || 0;
        renderToolTab(); focusPickRow();
      } else {
        var name = litem.querySelector('.asm-name');
        if(name){
          PARAMS.Tool.head = name.textContent;
          toolLibIdx = libItemsFlat().indexOf(name.textContent);
          renderToolTab(); focusPickRow();
        }
      }
      return;
    }
    var more = e.target.closest('.icn11');
    if(more){
      e.stopPropagation();
      showMenu(more.getBoundingClientRect(), [
        {label:'Reset value'}, {label:'Copy'}, {label:'Paste'}, {sep:true}, {label:'Reset to default'}
      ], more, 140);                               // owner: the dots stay lit while the menu is open
      return;
    }
    var row = e.target.closest('.irow');
    if(row){
      irows.querySelectorAll('.irow').forEach(function(x){x.classList.remove('sel');}); row.classList.add('sel');
      // "!" opens the smart hint; an open hint follows the selected parameter
      if(e.target.closest('.hint')){ e.stopPropagation(); hintOpen(row); }
      else if(hintPanel.classList.contains('open')) hintShow(row);
    }
  });

  /* ---------- Smart hint: a 360px window to the right of the dock ----------
     Opens on the "!" of an inspector row, follows the selected row while
     open, closes only via ✕ / Esc. Content = title, image carousel, text. */
  var hintPanel = document.getElementById('hintPanel');
  // hint = text + one or more pictures (the pager flips pictures only).
  // Keyed by parameter label; option hints are keyed "Label: Option" and show
  // while the pointer runs over the dropdown items.
  var HINTS = {
    "Station": {imgs:["Turret with numbered stations", "Station reach relative to the spindle"],
      text:["Selects the magazine or turret where the tool assembly is mounted and its position number.", "The station defines which side of the machine reaches the part and how the tool change is posted. Changing it re-numbers T# in the code."]},
    "Corrector": {imgs:["Corrector register on the controller", "Auto vs fixed register"],
      text:["Tool length / radius corrector register (H / D) used by the controller for this assembly.", "\"Auto\" takes the register from the station number, so re-arranging tools keeps offsets consistent. Set a fixed number only when the machine offset table is managed by hand."]},
    "Orientation": {imgs:["Tool orientation relative to the spindle axis"],
      text:["How the tool is oriented relative to the spindle axis. The orientation drives the default approach direction and the collision envelope used in simulation.", "Hover an option in the list to see what each orientation looks like."]},
    "Orientation: Axial": {imgs:["Axial orientation"], text:["The tool axis is parallel to the spindle axis. Used for facing, centre drilling and boring."]},
    "Orientation: Radial": {imgs:["Radial orientation"], text:["The tool points at the spindle axis. Used for turning the outer diameter and grooving."]},
    "Orientation: Angular": {imgs:["Angular orientation"], text:["The tool sits at a fixed angle to the spindle axis, for chamfers and inclined faces."]},
    "Orientation: Back-turning": {imgs:["Back-turning orientation"], text:["The tool works behind the part centre, cutting towards the chuck. Needs a sub-spindle side or a reversed holder."]},
    "Approach": {imgs:["Approach path preview", "Rules editor"],
      text:["The rule that builds the motions from the tool change position to the first cut of this operation.", "Machine rules are shared presets; \"Custom…\" opens the rules editor where the sequence is changed for this operation only."]},
    "Approach: Avoid collisions": {imgs:["Approach around the stock"], text:["Builds the approach around the stock and fixtures with the safe distance kept on every rapid move."]},
    "Approach: Short": {imgs:["Shortest approach"], text:["Straight move from the tool change position to the first cut. No collision checking on the way."]},
    "Return": {imgs:["Return path preview", "Rules editor"],
      text:["The rule that builds the motions from the last cut back to the tool change position.", "Auto values are resolved from the operation context; fixed values stay as typed."]},
    "Return: Avoid collisions": {imgs:["Return around the stock"], text:["Retracts along the safe surface first, then moves to the tool change position."]},
    "Return: Short": {imgs:["Shortest return"], text:["Straight move from the last cut to the tool change position. No collision checking on the way."]},
    "Safe surface": {imgs:["Safe surface around the part"],
      text:["Surface the tool retracts to between cuts. Rapid motions run along it; the safe level sets how far it sits from the stock."]},
    "Safe surface: Plane": {imgs:["Plane"], text:["A plane above the part: the simplest safe surface for prismatic parts."]},
    "Safe surface: Cylinder": {imgs:["Cylinder"], text:["A cylinder around the spindle axis: rapid moves follow the part on turning operations."]},
    "Safe surface: Sphere": {imgs:["Sphere"], text:["A sphere around the part for multi-axis operations where the tool approaches from any side."]},
    "Safe distance": {imgs:["Too small: tool grazes the stock", "Recommended: 2× stock allowance"],
      text:["Clearance kept between the tool and the part on rapid moves when the safe surface is not used."]}
  };
  function hintData(k){
    if(HINTS[k]) return HINTS[k];
    var i = k.indexOf(": ");
    if(i > 0) return {imgs:[k.slice(i + 2)], text:[k.slice(i + 2) + " — option of " + k.slice(0, i) + "."]};
    return {imgs:[k], text:[k + " — parameter of the current operation.", "This hint explains what the value affects, how it is calculated and when to change it."]};
  }
  var hintKey = "", hintPage = 0;
  function rowLabel(row){ var l = row && row.querySelector(".rlabel span"); return l ? l.textContent.trim() : ""; }
  var HINT_PIC = '<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="0.5" y="0.5" width="319" height="159" rx="6" fill="none" stroke="currentColor" stroke-opacity=".16"/>' +
    '<path d="M60 120 L130 60 L180 105 L215 80 L262 120 Z" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".32"/>' +
    '<circle cx="232" cy="46" r="12" fill="currentColor" fill-opacity=".14"/></svg>';
  // show the hint for a key ("Label" or "Label: Option"); the window stays
  // aligned with the row the hint belongs to
  function hintShowKey(k, row){
    if(k !== hintKey){ hintKey = k; hintPage = 0; }
    var d = hintData(k), n = d.imgs.length, p = Math.min(hintPage, n - 1);
    hintPanel.querySelector("#hintTitle").textContent = k;
    hintPanel.querySelector("#hintGal").innerHTML = '<div class="hint-img">' + HINT_PIC + '<span class="hint-cap">' + d.imgs[p] + '</span></div>';
    hintPanel.querySelector("#hintText").innerHTML = d.text.map(function(t){ return "<p>" + t + "</p>"; }).join("");
    hintPanel.querySelector("#hintNav").hidden = n < 2;
    hintPanel.querySelector("#hintDots").innerHTML = n > 6 ? "" : d.imgs.map(function(_, i){ return '<i class="' + (i===p ? "on" : "") + '"></i>'; }).join("");
    hintPanel.querySelector("#hintStep").textContent = (p + 1) + " / " + n;
    hintPanel.querySelector("#hintPrev").disabled = p === 0;
    hintPanel.querySelector("#hintNext").disabled = p >= n - 1;
    if(row){
      var vp = hintPanel.parentElement.getBoundingClientRect(), rr = row.getBoundingClientRect();
      hintPanel.style.top = Math.max(8, Math.min(rr.top - vp.top, vp.height - hintPanel.offsetHeight - 8)) + "px";
    }
  }
  function hintShow(row){ hintShowKey(rowLabel(row), row); }
  function hintOpen(row){ hintPanel.classList.add("open"); hintShow(row); }
  function hintClose(){ hintPanel.classList.remove("open"); }
  function hintIsOpen(){ return hintPanel.classList.contains("open"); }
  // hovering a row swaps the hint; leaving the list returns to the selected row
  irows.addEventListener("mouseover", function(e){
    if(!hintIsOpen() || openMenu) return;
    var row = e.target.closest(".irow"); if(row) hintShow(row);
  });
  irows.addEventListener("mouseleave", function(){
    if(!hintIsOpen() || openMenu) return;
    var sel = irows.querySelector(".irow.sel"); if(sel) hintShow(sel);
  });
  // hovering a dropdown option shows "Label: Option" — the differences side by side
  document.addEventListener("mouseover", function(e){
    if(!hintIsOpen() || !openMenu || !openMenu._owner) return;
    var row = openMenu._owner.closest(".irow"); if(!row) return;
    var opt = e.target.closest(".dd-opt");
    if(opt && openMenu.contains(opt)) hintShowKey(rowLabel(row) + ": " + opt.textContent.trim(), row);
    else if(!e.target.closest(".dd-menu")) hintShow(row);
  });
  hintPanel.addEventListener("click", function(e){
    e.stopPropagation();
    if(e.target.closest("#hintClose")){ hintClose(); return; }
    if(e.target.closest("#hintPrev")){ hintPage = Math.max(0, hintPage - 1); hintShowKey(hintKey); }
    if(e.target.closest("#hintNext")){ if(hintPage < hintData(hintKey).imgs.length - 1) hintPage++; hintShowKey(hintKey); }
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape") hintClose();
    if(!hintIsOpen() || /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if(e.key === "ArrowLeft"){ e.preventDefault(); hintPage = Math.max(0, hintPage - 1); hintShowKey(hintKey); }
    if(e.key === "ArrowRight"){ e.preventDefault(); if(hintPage < hintData(hintKey).imgs.length - 1) hintPage++; hintShowKey(hintKey); }
  });

  renderInspector('Tool'); // initial

  /* ---------- Tree: visibility (collapse + type filter), select, drag ---------- */
  var tree = document.getElementById('tree');
  var rows = Array.prototype.slice.call(tree.querySelectorAll('.trow'));
  var collapsed = {};
  var byId = {};
  function reindex(){ byId = {}; rows.forEach(function(r){ byId[r.dataset.id] = r; }); }
  reindex();
  function rowById(id){ return byId[id]; }
  // tree search ("Tree navigation" below): null, or the hits of the query, the rows
  // kept for context and a fold state of its own (the normal one comes back on clear)
  var tSearch = null;
  function foldMap(){ return tSearch ? tSearch.fold : collapsed; }
  function isVisible(r){
    if(tSearch && !tSearch.keep[r.dataset.id]) return false;
    var fold = foldMap(), p = r.dataset.parent;
    while(p){
      var pr = rowById(p);
      if(!pr) break;
      if(fold[p]) return false;
      p = pr.dataset.parent;
    }
    return true;
  }
  function renderTree(){
    var fold = foldMap();
    rows.forEach(function(r){
      r.style.display = isVisible(r) ? 'flex' : 'none';
      if(r.dataset.expandable === '1') r.classList.toggle('collapsed', !!fold[r.dataset.id]);
    });
    treeSummaries();
    treeNavSync(true);
  }
  // fold / unfold a branch; Alt+click takes the whole branch below it along
  function treeToggle(r, deep){
    var fold = foldMap(), id = r.dataset.id, close = !fold[id];
    var ids = [id];
    if(deep) rows.forEach(function(x){ if(x.dataset.expandable === '1' && isUnder(x, r)) ids.push(x.dataset.id); });
    ids.forEach(function(x){ if(close) fold[x] = true; else delete fold[x]; });
    renderTree();
  }
  function isUnder(r, anc){
    var p = r.dataset.parent;
    while(p){ if(p === anc.dataset.id) return true; var pr = byId[p]; p = pr ? pr.dataset.parent : null; }
    return false;
  }
  var dragEl = null;
  function bindDrag(r){
    if(r.getAttribute('draggable') !== 'true') return;
    r.addEventListener('dragstart', function(e){ dragEl = r; r.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    r.addEventListener('dragend', function(){ if(dragEl) dragEl.classList.remove('dragging'); dragEl=null; rows.forEach(function(x){x.classList.remove('drop-before','drop-after');}); });
    r.addEventListener('dragover', function(e){
      if(!dragEl || dragEl===r) return;
      if(dragEl.dataset.parent !== r.dataset.parent) return; // only same parent
      e.preventDefault();
      var rect = r.getBoundingClientRect();
      var after = (e.clientY - rect.top) > rect.height/2;
      r.classList.toggle('drop-after', after);
      r.classList.toggle('drop-before', !after);
    });
    r.addEventListener('dragleave', function(){ r.classList.remove('drop-before','drop-after'); });
    r.addEventListener('drop', function(e){
      if(!dragEl || dragEl===r || dragEl.dataset.parent !== r.dataset.parent) return;
      e.preventDefault();
      var after = r.classList.contains('drop-after');
      r.classList.remove('drop-before','drop-after');
      tree.insertBefore(dragEl, after ? r.nextSibling : r);
      treeNavSync(true);
    });
  }
  function bindRow(r){
    var chev = r.querySelector('.shev');
    if(r.dataset.expandable === '1' && chev){
      chev.classList.add('exp');
      chev.addEventListener('click', function(e){
        e.stopPropagation();
        treeToggle(r, e.altKey);
      });
    }
    r.addEventListener('click', function(){
      rows.forEach(function(x){x.classList.remove('tsel');});
      r.classList.add('tsel');
      // the inspector title names the inspector tab, not the selected node
      document.dispatchEvent(new CustomEvent('ency:treesel', {detail:{id:r.dataset.id, type:r.dataset.type}}));
    });
    bindDrag(r);
  }

  /* ---------- Tree navigation: folded-branch summaries, sticky Setup / Part / Group,
     the selection pinned to the bottom edge, search (big projects, CAM-724) ---------- */
  var tSticky = document.getElementById('treeSticky');
  var tGhost = document.getElementById('treeGhost');
  // the selection pinned to the bottom edge is switched off for now; true brings it back
  var TREE_PIN = false;
  var tEmpty = document.getElementById('treeEmpty');
  var BRANCH = {setup:1, part:1, group:1};
  function opProblem(r){
    var st = r.querySelector('.st'); if(!st) return '';
    if(st.src === A['status-error']) return 'error';
    return st.src === A['status-warn'] || st.src === A['status-warn2'] ? 'warn' : '';
  }
  // a branch status follows its operations up the chain: an error (else a warning) of any
  // operation inside shows on its Group, Part and Setup; without one the branch keeps its own
  function treeRollup(){
    var worst = {};
    rows.forEach(function(r){
      if(r.dataset.type !== 'operation') return;
      var pb = opProblem(r), p = r.dataset.parent;
      while(pb && p){
        if(worst[p] !== 'error') worst[p] = pb;
        var pr = byId[p]; p = pr ? pr.dataset.parent : null;
      }
    });
    rows.forEach(function(r){
      if(!BRANCH[r.dataset.type]) return;
      var st = r.querySelector('.st'); if(!st) return;
      // whatever the rest of the app put there last (Calculate, Reset…) is the branch's own status
      if(st.src !== st.dataset.prop) st.dataset.own = st.src;
      var w = worst[r.dataset.id];
      var want = w === 'error' ? A['status-error'] : w === 'warn' ? A['status-warn'] : st.dataset.own;
      st.dataset.prop = w ? want : '';
      if(st.src !== want) st.src = want;
    });
  }
  // a folded Setup / Part / Group tells how many operations it hides (matches while searching)
  function treeSummaries(){
    treeRollup();
    var fold = foldMap(), kids = {};
    rows.forEach(function(r){ var p = r.dataset.parent; if(p) (kids[p] = kids[p] || []).push(r); });
    function count(id){
      var n = 0;
      (kids[id] || []).forEach(function(k){
        if(k.dataset.type !== 'operation') n += count(k.dataset.id);
        else if(!tSearch || tSearch.hit[k.dataset.id]) n++;
      });
      return n;
    }
    rows.forEach(function(r){
      if(!BRANCH[r.dataset.type]) return;
      var sum = r.querySelector('.tsum');
      if(!fold[r.dataset.id]){ if(sum) sum.hidden = true; return; }
      if(!sum){
        sum = document.createElement('span'); sum.className = 'tsum';
        var ps = r.querySelector('.pslot'); ps.insertBefore(sum, ps.firstChild);
      }
      var n = count(r.dataset.id);
      sum.hidden = false;
      sum.textContent = n;
      sum.title = n + (tSearch ? (n === 1 ? ' match' : ' matches') : (n === 1 ? ' operation' : ' operations')) + ' inside';
    });
  }

  // sticky heads + the bottom pin are redrawn once per frame
  var navRaf = 0, navForce = false, navSum = false, navKey = '', navGKey = '';
  function treeNavSync(force){ if(force) navForce = true; if(!navRaf) navRaf = requestAnimationFrame(treeNavDraw); }
  function navRows(){
    return Array.prototype.filter.call(tree.children, function(r){ return r.classList.contains('trow') && r.offsetHeight > 0; });
  }
  function rowPitch(vis){ return vis.length > 1 ? vis[1].offsetTop - vis[0].offsetTop : 25; }
  // Setup / Part / Group above a row, outermost first
  function chainOf(r){
    var c = [], p = r.dataset.parent;
    while(p){ var pr = byId[p]; if(!pr) break; if(BRANCH[pr.dataset.type]) c.unshift(pr); p = pr.dataset.parent; }
    return c;
  }
  function navClone(r){
    var c = r.cloneNode(true);
    c.classList.add('tclone');
    c.classList.remove('dragging', 'drop-before', 'drop-after');
    c.removeAttribute('draggable'); c.removeAttribute('data-id');
    c.dataset.for = r.dataset.id;
    c.style.display = '';
    return c;
  }
  function treeNavDraw(){
    navRaf = 0;
    var force = navForce; navForce = false;
    if(navSum){ navSum = false; treeSummaries(); }
    var vis = navRows(), top = tree.scrollTop, P = rowPitch(vis), H = vis.length ? vis[0].offsetHeight : 24;
    // slot k holds the k-th branch head of the row under it
    var stack = [], ends = [], pos = [];
    for(var k = 0; k < 3 && top > 0; k++){
      var y = top + k * P, lo = 0, hi = vis.length;
      while(lo < hi){ var mid = (lo + hi) >> 1; if(vis[mid].offsetTop + H > y) hi = mid; else lo = mid + 1; }
      if(lo >= vis.length) break;
      // the line is past the end of the head above (the next row is pushing its block out): the
      // slot keeps the head of that branch's last row, so the block leaves whole, without a jump
      if(k && !isUnder(vis[lo], stack[k - 1])){
        do lo--; while(lo >= 0 && vis[lo] !== stack[k - 1] && !isUnder(vis[lo], stack[k - 1]));
        if(lo < 0 || vis[lo] === stack[k - 1]) break;
      }
      var r = vis[lo], chain = chainOf(r), cand = null;
      if(chain.length > k) cand = chain[k];
      else if(chain.length === k && BRANCH[r.dataset.type] && r.offsetTop < y) cand = r;
      if(!cand || (k && cand.dataset.parent !== stack[k - 1].dataset.id)) break;
      var end = Infinity;
      for(var j = lo + 1; j < vis.length; j++) if(!isUnder(vis[j], cand)){ end = vis[j].offsetTop; break; }
      stack.push(cand); ends.push(end);
    }
    // the row after a head's branch pushes it up, but never under the head above it (that left a
    // half-hidden row between two heads): heads whose branches end at the same row go up as one
    // block, out at the top edge; a deeper head whose branch ends first steps aside, and the next
    // one scrolls in whole and sticks in its place
    for(k = 0; k < stack.length; k++){
      var below = 0;                       // deeper heads that end at the same row stay under it
      for(j = k + 1; j < stack.length; j++) if(ends[j] === ends[k]) below++;
      var p = Math.min(k * P, ends[k] - P - top - below * P);
      if(k && p < pos[k - 1] + P - 0.5){ stack.length = k; break; }
      pos.push(p);
    }
    var key = stack.map(function(s){ return s.dataset.id; }).join('|');
    if(force || key !== navKey){
      navKey = key;
      tSticky.innerHTML = '';
      stack.forEach(function(s){ tSticky.appendChild(navClone(s)); });
    }
    var bottom = 0;
    Array.prototype.forEach.call(tSticky.children, function(c, i){
      c.style.top = pos[i] + 'px'; c.style.zIndex = 3 - i;
      bottom = Math.max(bottom, pos[i] + H);
    });
    tSticky.hidden = !stack.length || bottom <= 0;
    tSticky.style.width = tree.clientWidth + 'px';
    tSticky.style.height = (bottom + (P - H)) + 'px';

    // the selected row scrolled out of view (or folded away) stays reachable at the bottom edge
    // its strip: 1px divider + 6px air + the row (.tghost in app.css)
    var sel = tree.querySelector('.trow.tsel'), dir = 0, G = H + 7;
    if(TREE_PIN && sel && sel.dataset.type !== 'machine' && !tSearch && stack.indexOf(sel) < 0){
      if(!sel.offsetHeight) dir = 2;
      else {
        var c = sel.offsetTop - top + H / 2, stickH = tSticky.hidden ? 0 : bottom;
        if(c < stickH) dir = -1;
        else if(c > tree.clientHeight - G) dir = 1;
      }
    }
    var gkey = dir ? sel.dataset.id + ':' + dir : '';
    if(force || gkey !== navGKey){
      navGKey = gkey;
      tGhost.innerHTML = '';
      if(dir){
        var g = navClone(sel), sh = g.querySelector('.shev');
        g.classList.remove('collapsed');
        if(sh){ sh.src = 'assets/t-shev-open.svg'; sh.classList.remove('exp'); sh.classList.toggle('up', dir === -1); }
        g.title = dir === 2 ? 'Selected · inside a folded branch — click to show it' : 'Selected · click to scroll to it';
        tGhost.appendChild(g);
      }
    }
    tGhost.hidden = !dir;
    tGhost.style.width = tree.clientWidth + 'px';
    tree.style.paddingBottom = dir ? G + 'px' : '';
    tEmpty.hidden = !(tSearch && !tSearch.hits.length);
  }
  tree.addEventListener('scroll', function(){ treeNavSync(); }, {passive:true});
  new ResizeObserver(function(){ treeNavSync(true); }).observe(tree);
  // statuses, selection and fold marks change in many places — the clones follow them
  new MutationObserver(function(){ navSum = true; treeNavSync(true); })
    .observe(tree, {subtree:true, attributes:true, attributeFilter:['src', 'class']});

  // open every branch above the row and bring it into view (centred when it was out)
  function treeReveal(r){
    var fold = foldMap(), p = r.dataset.parent;
    while(p){ delete fold[p]; var pr = byId[p]; p = pr ? pr.dataset.parent : null; }
    renderTree();
    if(!r.offsetHeight) return;
    var P = rowPitch(navRows()), t = r.offsetTop - tree.scrollTop;
    if(t < chainOf(r).length * P || t + r.offsetHeight > tree.clientHeight - P)
      tree.scrollTop = r.offsetTop - (tree.clientHeight - r.offsetHeight) / 2;
  }
  // a sticky head: click selects the branch and lands on it, its chevron folds it
  tSticky.addEventListener('click', function(e){
    var c = e.target.closest('.tclone'), r = c && byId[c.dataset.for]; if(!r) return;
    // its status opens the Status panel of the branch, as in the tree
    if(e.target.closest('.bicn .st')){ e.stopPropagation(); stpOpen(r, c); return; }
    if(e.target.closest('.shev')) treeToggle(r, e.altKey); else r.click();
    tree.scrollTop = r.offsetTop - chainOf(r).length * rowPitch(navRows());
  });
  tGhost.addEventListener('click', function(e){
    var sel = tree.querySelector('.trow.tsel'); if(!sel) return;
    if(e.target.closest('.bicn .st')){ e.stopPropagation(); stpOpen(sel, tGhost); return; }
    treeReveal(sel);
  });

  /* search: name, tool name or T#; the tree narrows to the matches and their branches */
  var ttSearch = document.getElementById('ttSearch'), ttQ = document.getElementById('ttQ');
  var ttCount = document.getElementById('ttCount');
  function escHtml(s){ return s.replace(/[&<>"]/g, function(ch){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[ch]; }); }
  function hlText(el, ql){
    if(!el) return false;
    var t = el.textContent, i = t.toLowerCase().indexOf(ql);
    if(i < 0) return false;
    el.dataset.txt = t;
    el.innerHTML = escHtml(t.slice(0, i)) + '<mark class="tt-hl">' + escHtml(t.slice(i, i + ql.length)) + '</mark>' + escHtml(t.slice(i + ql.length));
    return true;
  }
  function unmarkAll(){
    tree.querySelectorAll('[data-txt]').forEach(function(el){ el.textContent = el.dataset.txt; delete el.dataset.txt; });
    tree.querySelectorAll('.tt-hit').forEach(function(el){ el.classList.remove('tt-hit'); });
    tree.querySelectorAll('.tctx').forEach(function(el){ el.classList.remove('tctx'); });
  }
  function ttCountSync(){
    var n = tSearch ? tSearch.hits.length : 0;
    ttCount.textContent = !n ? 'No matches' : tSearch.cur < 0 ? n + (n === 1 ? ' match' : ' matches') : (tSearch.cur + 1) + ' / ' + n;
  }
  function treeSearchRun(q){
    var ql = q.trim().toLowerCase();
    unmarkAll();
    ttSearch.classList.toggle('has-q', !!ql);
    if(!ql){ tSearch = null; ttSearch.classList.remove('no-hits'); renderTree(); return; }
    // "T12" / "t#12" is a tool number: exact, so T#1 does not find T#10…T#19
    var tn = /^t#?(\d+)$/.exec(ql), hits = [], hit = {}, keep = {};
    Array.prototype.forEach.call(tree.querySelectorAll('.trow'), function(r){
      if(r.dataset.type === 'machine') return;
      var ok, tno = r.querySelector('.toolno');
      if(tn){ ok = !!tno && tno.textContent.trim().toLowerCase() === 't#' + tn[1]; if(ok) tno.classList.add('tt-hit'); }
      else {
        var a = hlText(r.querySelector('.rlabel span'), ql), b = hlText(r.querySelector('.tlink span'), ql);
        ok = a || b || (!!tno && tno.textContent.trim().toLowerCase() === ql);
      }
      if(!ok) return;
      hits.push(r); hit[r.dataset.id] = keep[r.dataset.id] = true;
      var p = r.dataset.parent;
      while(p){ keep[p] = true; var pr = byId[p]; p = pr ? pr.dataset.parent : null; }
    });
    // the branches around the matches stay as quiet context
    rows.forEach(function(r){ if(keep[r.dataset.id] && !hit[r.dataset.id]) r.classList.add('tctx'); });
    tSearch = {hits:hits, hit:hit, keep:keep, fold:{}, cur:-1};
    ttSearch.classList.toggle('no-hits', !hits.length);
    tEmpty.textContent = 'No operations match “' + q.trim() + '”';
    ttCountSync();
    renderTree();
    tree.scrollTop = 0;
  }
  function treeSearchStep(d){
    if(!tSearch || !tSearch.hits.length) return;
    var n = tSearch.hits.length;
    tSearch.cur = tSearch.cur < 0 ? (d > 0 ? 0 : n - 1) : (tSearch.cur + d + n) % n;
    var r = tSearch.hits[tSearch.cur];
    r.click(); treeReveal(r); ttCountSync();
  }
  // clearing goes back to the full tree with the selection where the search left it
  function treeSearchClear(){
    if(!tSearch && !ttQ.value) return;
    ttQ.value = '';
    treeSearchRun('');
    var sel = tree.querySelector('.trow.tsel');
    if(sel && sel.dataset.type !== 'machine') treeReveal(sel);
  }
  ttQ.addEventListener('input', function(){ treeSearchRun(ttQ.value); });
  ttQ.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); treeSearchStep(e.shiftKey ? -1 : 1); }
    else if(e.key === 'ArrowDown'){ e.preventDefault(); treeSearchStep(1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); treeSearchStep(-1); }
    else if(e.key === 'Escape'){ e.stopPropagation(); if(ttQ.value) treeSearchClear(); else setSearchRow(false); }
  });
  // the search row opens from its toolbar button (or Ctrl+F); closing it drops the filter
  var searchBtn = document.getElementById('searchBtn'), treeTools = document.getElementById('treeTools');
  function setSearchRow(on){
    treeTools.hidden = !on;
    searchBtn.classList.toggle('on', on);
    if(on){ ttQ.focus(); ttQ.select(); }
    else { treeSearchClear(); ttQ.blur(); }
  }
  searchBtn.addEventListener('click', function(e){ e.stopPropagation(); setSearchRow(treeTools.hidden); });
  document.getElementById('ttPrev').addEventListener('click', function(e){ e.preventDefault(); treeSearchStep(-1); });
  document.getElementById('ttNext').addEventListener('click', function(e){ e.preventDefault(); treeSearchStep(1); });
  document.getElementById('ttClear').addEventListener('click', function(e){ e.preventDefault(); treeSearchClear(); ttQ.focus(); });
  // a match picked with the mouse becomes the current one for Enter / arrows
  document.addEventListener('ency:treesel', function(e){
    if(!tSearch) return;
    var i = tSearch.hits.indexOf(byId[e.detail.id]);
    if(i >= 0){ tSearch.cur = i; ttCountSync(); }
  });
  document.addEventListener('keydown', function(e){
    if(!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'f') return;
    var pt = document.querySelector('.panel-tree');
    if(pt.classList.contains('sim') || pt.classList.contains('single')) return; // no tree search there
    e.preventDefault(); setSearchRow(true);
  });
  document.getElementById('treeExpand').addEventListener('click', function(){
    var f = foldMap(); Object.keys(f).forEach(function(k){ delete f[k]; }); renderTree();
  });
  document.getElementById('treeCollapse').addEventListener('click', function(){
    var f = foldMap(); rows.forEach(function(r){ if(r.dataset.expandable === '1') f[r.dataset.id] = true; }); renderTree();
  });

  rows.forEach(bindRow);

  renderTree();

  // measure the real row pitch so the status connector lines touch both circles
  (function(){
    var vis = rows.filter(function(r){ return r.style.display !== 'none'; });
    if(vis.length > 1) tree.style.setProperty('--st-pitch', (vis[1].offsetTop - vis[0].offsetTop) + 'px');
  })();

  // the tree always has a selection; with nothing else picked it sits on the machine
  if(!tree.querySelector('.trow.tsel')){
    var machineRow = tree.querySelector('.trow[data-type="machine"]');
    if(machineRow) machineRow.classList.add('tsel');
  }
  // the inspector tabs follow the selection (and the project swap, which replaces the rows)
  railSync(true);
  new MutationObserver(function(){ railSync(false); })
    .observe(tree, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});

  /* ---------- ENCY393: a generated 391-operation project (deterministic, no RNG) —
     the stress case of CAM-724 for navigating big trees: 4 setups → parts → groups ---------- */
  // [name, tool, tool radius for milling (Edits tab) or none for turning / probing]
  var BIG_RECIPES = {
    face:   [['Face milling', 'FM D50 R390-050/HSK63 SF22', 25]],
    probe:  [['Part probing', 'OMP60 probe/HSK63']],
    turn:   [['Lathe facing', 'CNMG 12 04 08-WF/DCLNR 2020K-12'], ['OD roughing', 'CNMG 12 04 08-WF/DCLNR 2020K-12'],
             ['OD finishing', 'DNMX 15 04 04-WF/DDJNR 2020K-15'], ['OD grooving', 'N123G2-0300-0002-CM/RF123G079'],
             ['ID drilling', 'SCD 080-044-080 AP5'], ['ID boring', 'CCMT 09 T3 04-PF/A20S-SCLCR 09'],
             ['Thread turning', '266RG-16MM01A150M/266RFA-2525-16'], ['Parting off', 'N123G2-0300-0002-CM/RF123G079']],
    rough:  [['Adaptive roughing', 'EM D16 R0.8 L48/HSK63 SF16', 8], ['Z-level roughing', 'EM D12 R1 L36/HSK63 SF12', 6],
             ['Pocket roughing', 'EM D10 L30/HSK63 SF10', 5], ['Rest roughing', 'EM D8 R0.5 L24/HSK63 SF8', 4]],
    semi:   [['Z-level semi-finishing', 'EM D10 R1 L40/HSK63 SF10', 5], ['Rest machining', 'EM D6 R0.5 L20/HSK63 SF6', 3],
             ['Constant scallop', 'BM D10 L40/HSK63 SF10', 5]],
    finish: [['Z-level finishing', 'EM D8 R1 L32/HSK63 SF8', 4], ['Waterline finishing', 'BM D6 L30/HSK63 SF6', 3],
             ['Contour finishing', 'EM D10 L30/HSK63 SF10', 5], ['Pencil finishing', 'BM D4 L24/HSK63 SF4', 2],
             ['Floor finishing', 'EM D12 L36/HSK63 SF12', 6], ['Scallop finishing', 'BM D6 L30/HSK63 SF6', 3]],
    threads:[['Thread milling M8', 'TM M8-M12 L30/HSK63 SF10'], ['Thread milling M10', 'TM M8-M12 L30/HSK63 SF10'],
             ['Thread milling M12', 'TM M8-M12 L30/HSK63 SF10']],
    chamf:  [['Chamfering', 'CM D10 90°/HSK63 SF10'], ['Deburring', 'CM D6 90°/HSK63 SF6']],
    holes:  []
  };
  // holes come in spot → drill → tap / ream sets, one set per size
  [['6.8', 'Tapping M8', 'TAP M8x1.25/HSK63 SYN'], ['8.5', 'Tapping M10', 'TAP M10x1.5/HSK63 SYN'],
   ['10.2', 'Tapping M12', 'TAP M12x1.75/HSK63 SYN'], ['5', 'Tapping M6', 'TAP M6x1/HSK63 SYN'],
   ['9.8', 'Reaming Ø10H7', 'RM D10 H7/HSK63 HC10'], ['4.2', 'Tapping M5', 'TAP M5x0.8/HSK63 SYN']].forEach(function(s){
    BIG_RECIPES.holes.push(['Spot drilling Ø' + s[0], 'SD 90° D10/HSK63 HC10'],
      ['Drilling Ø' + s[0], 'DR D' + s[0] + ' 5xD/HSK63 HC' + Math.ceil(+s[0])], [s[1], s[2]]);
  });
  // setups → parts → [group (null: right in the part), recipe, operations]; 391 in total
  var BIG_PROJECT = [
    ['Setup 1', [['Housing', [[null, 'face', 2], ['Turning', 'turn', 16], ['Roughing', 'rough', 14], ['Finishing', 'finish', 18], ['Holes', 'holes', 36], ['Chamfers', 'chamf', 6]]],
                 ['Cover',   [[null, 'face', 1], ['Roughing', 'rough', 8], ['Finishing', 'finish', 12], ['Holes', 'holes', 18]]]]],
    ['Setup 2', [['Housing', [[null, 'face', 2], ['Roughing', 'rough', 16], ['Semi-finishing', 'semi', 10], ['Finishing', 'finish', 24], ['Holes', 'holes', 30], ['Threads', 'threads', 6], ['Chamfers', 'chamf', 8]]]]],
    ['Setup 3', [['Housing', [['Roughing', 'rough', 10], ['Finishing', 'finish', 14], ['Holes', 'holes', 24]]],
                 ['Cover',   [[null, 'face', 1], ['Roughing', 'rough', 6], ['Finishing', 'finish', 10], ['Holes', 'holes', 12], ['Chamfers', 'chamf', 4]]]]],
    ['Setup 4', [['Housing', [[null, 'probe', 1], ['Roughing', 'rough', 8], ['Semi-finishing', 'semi', 8], ['Finishing', 'finish', 20], ['Holes', 'holes', 30], ['Threads', 'threads', 8], ['Chamfers', 'chamf', 8]]]]]
  ];
  // a few problems spread over the project; the tail of Setup 4 is not calculated yet
  var BIG_ERR = {47:1, 138:1, 203:1, 341:1}, BIG_WARN = {85:1, 172:1, 266:1}, BIG_CALC_TO = 360;
  function bigProjectHTML(){
    var tnum = {}, tn = 0, g = 0, out = [];
    function tool(name){ return tnum[name] || (tnum[name] = 'T#' + (++tn)); }
    function stIc(k){ return '<span class="bicn"><img class="i16 st" src="' + A[k] + '" alt=""></span>'; }
    // a branch is calculated when everything in it is
    function brSt(from, to){ return to > BIG_CALC_TO ? 'status-empty' : 'status-calc'; }
    var COLOR = '<span class="bicn"><img class="i16" src="' + A['opcolor'] + '" alt=""></span>';
    function head(id, parent, type, ind, name, slot){
      // a part carries the Part icon of the Filters (the nut is Parameters), a group of operations a folder;
      // setups keep the icon placeholder
      var ic = type === 'part' ? '<img class="micn" src="assets/f-part.svg" alt="">'
        : type === 'group' ? '<img class="micn" src="assets/tree-group.svg" alt="">' : '<span class="opic"></span>';
      return '<div class="trow" data-id="' + id + '" data-parent="' + parent + '" data-type="' + type + '" data-expandable="1">' +
        '<div class="tlayer' + (ind ? ' i' + ind : '') + '"><img class="shev" src="assets/t-shev-open.svg" alt="">' + ic +
        '<span class="rlabel"><span>' + name + '</span></span></div><div class="pslot">' + slot + '</div></div>';
    }
    out.push('');
    BIG_PROJECT.forEach(function(su, si){
      var sid = 'b-s' + (si + 1), sAt = out.length, sFrom = g;
      out.push('');
      su[1].forEach(function(pt, pi){
        var pid = sid + '-p' + (pi + 1), pAt = out.length, pFrom = g;
        out.push('');
        pt[1].forEach(function(it, gi){
          var gid = pid + '-g' + (gi + 1), gAt = -1, gFrom = g, parent = pid, ind = 2;
          if(it[0]){ gAt = out.length; out.push(''); parent = gid; ind = 3; }
          var rec = BIG_RECIPES[it[1]];
          for(var n = 0; n < it[2]; n++, g++){
            var o = rec[n % rec.length];
            var st = g >= BIG_CALC_TO ? 'status-empty' : BIG_ERR[g] ? 'status-error' : BIG_WARN[g] ? 'status-warn' : 'status-calc';
            out.push('<div class="trow" data-id="b-op' + (g + 1) + '" data-parent="' + parent + '" data-type="operation"' +
              (o[2] ? ' data-kind="mill" data-levels="' + (8 + (g * 7) % 20) + '" data-tool="' + o[2] + '"' : '') + ' draggable="true">' +
              '<div class="tlayer i' + ind + '"><img class="shev" src="assets/t-shev1.svg" alt=""><span class="opic"></span>' +
              '<span class="rlabel"><span>' + o[0] + '</span></span></div>' +
              '<div class="pslot"><span class="toolno">' + tool(o[1]) + '</span><span class="tlink"><span>' + o[1] + '</span></span>' +
              COLOR + stIc(st) + '</div></div>');
          }
          if(gAt >= 0) out[gAt] = head(gid, pid, 'group', 2, it[0], stIc(brSt(gFrom, g)));
        });
        out[pAt] = head(pid, sid, 'part', 1, pt[0], stIc(brSt(pFrom, g)));
      });
      out[sAt] = head(sid, 'b-m', 'setup', 0, su[0], stIc(brSt(sFrom, g)));
    });
    out[0] = '<div class="trow" data-id="b-m" data-type="machine"><div class="tlayer"><img class="micn" src="assets/tree-machine.svg" alt="">' +
      '<span class="rlabel"><span>Mill-turn machine</span></span></div><div class="pslot">' + stIc(brSt(0, g)) + '</div></div>';
    return out.join('');
  }

  /* ---------- Header tabs: the demo project, ENCY393, "New project N" (a pristine empty project) ---------- */
  // each project keeps its own rows (detached while another one is open) and fold state
  var projTrees = {}, curProj = 'demo';
  function swapTree(key){
    if(key === curProj) return;
    if(tSearch || ttQ.value){ ttQ.value = ''; treeSearchRun(''); }
    var cur = Array.prototype.slice.call(tree.querySelectorAll('.trow'));
    projTrees[curProj] = {rows:cur, collapsed:collapsed, scroll:tree.scrollTop};
    cur.forEach(function(r){ r.remove(); });
    var st = projTrees[key];
    if(st) st.rows.forEach(function(r){ tree.appendChild(r); });
    else {
      tree.insertAdjacentHTML('beforeend', bigProjectHTML());
      var fresh = Array.prototype.slice.call(tree.querySelectorAll('.trow'));
      fresh.forEach(bindRow);
      fresh[0].classList.add('tsel');
      st = {rows:fresh, collapsed:{}, scroll:0};
    }
    rows = st.rows; collapsed = st.collapsed; curProj = key;
    reindex(); renderTree();
    tree.scrollTop = st.scroll;
  }
  var savedStatuses = null, savedSel = null;
  var htabs = Array.prototype.slice.call(document.querySelectorAll('.htabs .htab'));
  htabs.forEach(function(t){
    t.addEventListener('click', function(e){
      if(e.target.classList.contains('htab-x')) return;
      if(t.classList.contains('active')) return;
      htabs.forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      var app = document.getElementById('app');
      var empty = t !== htabs[0] && !t.dataset.proj, wasEmpty = app.classList.contains('proj-empty');
      if(wasEmpty && !empty){
        // leaving a blank project: the demo tree gets its statuses and selection back
        var sts = tree.querySelectorAll('.st');
        if(savedStatuses) sts.forEach(function(img, i){ if(savedStatuses[i]) img.src = savedStatuses[i]; });
        if(savedSel){ rows.forEach(function(r){ r.classList.remove('tsel'); }); savedSel.classList.add('tsel'); }
      }
      swapTree(empty ? 'demo' : (t.dataset.proj || 'demo'));
      if(empty && !wasEmpty){
        // a fresh project: blank statuses, selection on the machine
        var sts2 = tree.querySelectorAll('.st');
        savedStatuses = Array.prototype.map.call(sts2, function(img){ return img.src; });
        savedSel = tree.querySelector('.trow.tsel');
        sts2.forEach(function(img){ img.src = A['status-empty']; });
        rows.forEach(function(r){ r.classList.remove('tsel'); });
        var m = tree.querySelector('.trow[data-type="machine"]');
        if(m) m.classList.add('tsel');
      }
      app.classList.toggle('proj-empty', empty);
      renderTree();
      var s = tree.querySelector('.trow.tsel');
      document.dispatchEvent(new CustomEvent('ency:treesel', {detail:{id:s ? s.dataset.id : null, type:s ? s.dataset.type : null}}));
      closeStatus();
    });
  });
  // ?project=ency393 opens that project on load (its header tab links here from other sections);
  // deferred so every script of the page is listening by then
  try {
    var openProj = new URLSearchParams(location.search).get('project');
    var openTab = openProj && htabs.filter(function(t){ return t.dataset.proj === openProj; })[0];
    if(openTab) setTimeout(function(){ openTab.click(); }, 0);
  } catch(e){}

  /* ---------- Calculate ---------- */
  var EMPTY = A['status-empty'], P1 = A['status-prog1'], P2 = A['status-prog2'], CALC = A['status-calc'];
  var calcBtn = document.querySelector('.b24.calc');
  if(calcBtn){
    calcBtn.addEventListener('click', function(){
      if(calcBtn.classList.contains('busy')) return;
      // scope: operation → just it; setup/part/machine → itself + everything below
      var sel = tree.querySelector('.trow.tsel');
      var scope;
      if(sel && sel.dataset.type === 'operation'){
        scope = [sel];
      } else if(sel && (sel.dataset.type === 'setup' || sel.dataset.type === 'part')){
        scope = [sel];
        var queue = [sel.dataset.id];
        while(queue.length){
          var pid = queue.shift();
          rows.forEach(function(r){
            if(r.dataset.parent === pid){ scope.push(r); queue.push(r.dataset.id); }
          });
        }
      } else {
        scope = Array.prototype.slice.call(tree.querySelectorAll('.trow'));
      }
      var stIcons = scope.map(function(r){ return r.querySelector('.st'); }).filter(Boolean);
      if(!stIcons.length) return;
      // Auto approach/return restores the links on recalculation
      var srAutoBtn = document.getElementById('srAuto');
      if(srAutoBtn && srAutoBtn.classList.contains('on')) tree.classList.add('linked');
      calcRun(scope);
      var scopeName = sel && sel.dataset.type !== 'machine' ? (sel.querySelector('.rlabel span') || {}).textContent : 'All operations';
      emitAction('Calculate', scopeName || 'All operations', 'OP.CALC ' + (sel && sel.dataset.type === 'operation' ? 'SELECTED' : 'ALL'));
    });
  }

  /* ---------- View cube (bottom-left of the viewport, next to the dock) ----------
     CAD-style navigation cube: 6 faces, 12 edges and 8 corners are separate hit regions,
     a click snaps the camera to look from that direction (corners give the isometric views);
     drag orbits, double-click resets. Home and ±90° turn buttons appear on hover.
     Same yaw / pitch camera as lib/robot-preview: the cube drives the preview while the
     Approach / Return window is open and follows it when the 3D view is dragged. */
  (function(){
    var box = document.getElementById('vcube'); if(!box) return;
    var HOME = {yaw:0.68, pitch:0.49};                       // Top · Front · Right
    var cam = {yaw:HOME.yaw, pitch:HOME.pitch};
    var S = 96, C = S / 2, R = 19;                           // svg size, centre, half edge
    var FACES = [
      {n:[0,0,1],  lbl:'Top',    cls:'top'},
      {n:[0,0,-1], lbl:'Bottom', cls:''},
      {n:[0,1,0],  lbl:'Front',  cls:''},
      {n:[0,-1,0], lbl:'Back',   cls:''},
      {n:[1,0,0],  lbl:'Right',  cls:''},
      {n:[-1,0,0], lbl:'Left',   cls:''}
    ];
    var BANDS = [[-1,-0.5,-1],[-0.5,0.5,0],[0.5,1,1]];       // [from, to, sign] across a face
    function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
    function add(){ var r=[0,0,0]; for(var i=0;i<arguments.length;i++){ var v=arguments[i]; r[0]+=v[0]; r[1]+=v[1]; r[2]+=v[2]; } return r; }
    function mul(v,k){ return [v[0]*k, v[1]*k, v[2]*k]; }
    function tangents(n){ var u = n[2] ? [1,0,0] : [0,0,1]; return [u, cross(n,u)]; }
    // same projection as robot-preview: x right, y depth, z up; +depth faces the viewer
    function proj(p){
      var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      var x = cy*p[0] - sy*p[1], y = sy*p[0] + cy*p[1];
      return [C + x, C + (sp*y - cp*p[2]), cp*y + sp*p[2]];
    }
    function pts(list){ return list.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '); }
    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 '+S+' '+S); box.appendChild(svg);
    function el(tag, attrs){ var e = document.createElementNS(svg.namespaceURI, tag); for(var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    function draw(){
      var vis = FACES.map(function(f){ return {f:f, facing:proj(f.n)[2] / R}; })
        .filter(function(o){ return o.facing > 0.02; })
        .sort(function(a,b){ return a.facing - b.facing; });
      svg.innerHTML = '';
      // axis triad anchored at the cube's origin corner (−X −Y −Z), arms along the edges.
      // Lines go first so the cube occludes them: only the tips past the edges show;
      // the letters are drawn last, outside the silhouette
      var AX = [['x',[1,0,0]],['y',[0,1,0]],['z',[0,0,1]]], o0 = [-R,-R,-R], p0 = proj(o0);
      AX.forEach(function(a){
        var p1 = proj(add(o0, mul(a[1], 2*R + 8)));
        el('line', {x1:p0[0].toFixed(1), y1:p0[1].toFixed(1), x2:p1[0].toFixed(1), y2:p1[1].toFixed(1), 'class':'vc-ax '+a[0]});
      });
      vis.forEach(function(o){
        var n = o.f.n, t = tangents(n), u = t[0], v = t[1];
        var quad = [[1,1],[-1,1],[-1,-1],[1,-1]].map(function(k){ return proj(mul(add(n, mul(u,k[0]), mul(v,k[1])), R)); });
        el('polygon', {points:pts(quad), 'class':'vc-face' + (o.f.cls ? ' '+o.f.cls : '') + (o.facing > 0.55 && !o.f.cls ? ' lit' : '')});
        // 3×3 hit cells; the region key is the view direction they snap to
        BANDS.forEach(function(bs){ BANDS.forEach(function(bt){
          var cell = [[bs[0],bt[0]],[bs[1],bt[0]],[bs[1],bt[1]],[bs[0],bt[1]]]
            .map(function(k){ return proj(mul(add(n, mul(u,k[0]), mul(v,k[1])), R)); });
          var dir = add(n, mul(u,bs[2]), mul(v,bt[2]));
          el('polygon', {points:pts(cell), 'class':'vc-cell', 'data-dir':dir.join(',')});
        }); });
        if(o.facing > 0.4){
          var c = proj(mul(n, R));
          el('text', {x:c[0].toFixed(1), y:c[1].toFixed(1), 'class':'vc-lbl'}).textContent = o.f.lbl;
        }
      });
      AX.forEach(function(a){
        var pl = proj(add(o0, mul(a[1], 2*R + 15)));
        el('text', {x:pl[0].toFixed(1), y:pl[1].toFixed(1), 'class':'vc-axl '+a[0]}).textContent = a[0].toUpperCase();
      });
      gridDraw();
    }
    // region hover: light every cell of the same region
    svg.addEventListener('mouseover', function(e){
      var d = e.target.getAttribute && e.target.getAttribute('data-dir'); if(!d) return;
      Array.prototype.forEach.call(svg.querySelectorAll('.vc-cell'), function(c){ c.classList.toggle('hov', c.getAttribute('data-dir') === d); });
    });
    svg.addEventListener('mouseleave', function(){
      Array.prototype.forEach.call(svg.querySelectorAll('.vc-cell.hov'), function(c){ c.classList.remove('hov'); });
    });
    // camera from a view direction (unit vector towards the viewer)
    function camFrom(d){
      var l = Math.hypot(d[0], d[1], d[2]) || 1, x = d[0]/l, y = d[1]/l, z = d[2]/l;
      var pitch = Math.asin(Math.max(-1, Math.min(1, z)));
      var yaw = (Math.abs(x) + Math.abs(y) < 1e-6) ? cam.yaw : Math.atan2(x, y);  // top / bottom keep the turn
      return {yaw:yaw, pitch:pitch};
    }
    // preview sync: push the cube camera (pitch clamped to the preview's range) and pull
    // the preview camera back while it is being dragged in the 3D view
    function clampP(p){ return Math.min(1.2, Math.max(0.08, p)); }
    function push(){
      if(window.tpView) window.tpView.setCamera({yaw:cam.yaw, pitch:cam.pitch});   // toolpath view (tpedit.js)
      var v = window.arView && window.arView(); if(!v) return;
      try{ v.setCamera({yaw:cam.yaw, pitch:clampP(cam.pitch)}); }catch(e){}
    }
    function pull(){
      var v = window.arView && window.arView();
      if(v && !anim && !drag){
        var c = v.getCamera();
        if(Math.abs(c.yaw - cam.yaw) > 1e-4 || Math.abs(c.pitch - clampP(cam.pitch)) > 1e-4){
          cam.yaw = c.yaw; cam.pitch = c.pitch; draw();
        }
      }
      requestAnimationFrame(pull);
    }
    var anim = false;
    function set(yaw, pitch, animate){
      if(!animate){ cam.yaw = yaw; cam.pitch = pitch; draw(); push(); return; }
      var from = {yaw:cam.yaw, pitch:cam.pitch}, t0 = performance.now(), D = 240;
      var dy = yaw - from.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));  // shortest turn
      anim = true;
      (function step(now){
        var k = Math.min(1, (now - t0) / D); k = 1 - Math.pow(1 - k, 3);
        cam.yaw = from.yaw + dy*k; cam.pitch = from.pitch + (pitch - from.pitch)*k; draw(); push();
        if(k < 1) requestAnimationFrame(step); else anim = false;
      })(t0);
    }
    var drag = null;
    box.addEventListener('pointerdown', function(e){
      if(e.button !== 0 || e.target.closest('.vc-btn') || e.target.closest('.vc-cs')) return;
      // remember the region under the pointer now — after capture the events target the box
      var d = e.target.getAttribute && e.target.getAttribute('data-dir');
      drag = {x:e.clientX, y:e.clientY, yaw:cam.yaw, pitch:cam.pitch, moved:false, dir:d};
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function(e){
      if(!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if(!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      drag.moved = true; box.classList.add('dragging');
      cam.yaw = drag.yaw + dx*0.012;
      cam.pitch = Math.max(-1.5, Math.min(1.5, drag.pitch + dy*0.008));
      draw(); push();
    });
    box.addEventListener('pointerup', function(){
      if(!drag) return;
      var moved = drag.moved, d = drag.dir; drag = null; box.classList.remove('dragging');
      if(moved || !d) return;
      var c = camFrom(d.split(',').map(Number));
      set(c.yaw, c.pitch, true);
    });
    box.addEventListener('pointercancel', function(){ drag = null; box.classList.remove('dragging'); });
    box.addEventListener('dblclick', function(e){ if(!e.target.closest('.vc-btn') && !e.target.closest('.vc-cs')) set(HOME.yaw, HOME.pitch, true); });
    // controls
    var ICON_HOME = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M2.5 8 8 3l5.5 5"/><path d="M4 7v6h8V7"/></svg>';
    var ICON_TURN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2"/><path d="M4.5 2v3h3"/></svg>';
    function btn(cls, title, svgIcon, fn){
      var b = document.createElement('div'); b.className = 'vc-btn '+cls; b.title = title; b.innerHTML = svgIcon;
      b.addEventListener('click', function(e){ e.stopPropagation(); fn(); }); box.appendChild(b); return b;
    }
    btn('vc-home', 'Home view', ICON_HOME, function(){ set(HOME.yaw, HOME.pitch, true); });
    btn('vc-ccw', 'Turn 90° counter-clockwise', ICON_TURN, function(){ set(cam.yaw - Math.PI/2, cam.pitch, true); });
    var cw = btn('vc-cw', 'Turn 90° clockwise', ICON_TURN, function(){ set(cam.yaw + Math.PI/2, cam.pitch, true); });
    cw.firstChild.style.transform = 'scaleX(-1)';

    /* ⋮ menu: fit, Home management and the ENCY scene items. No "Go Home" (that is the
       Home button) and no coordinate systems (they live under the caption below the cube);
       no projection switch either — the view is always orthographic here.
       Menus are built by vbMenuOpen() from the view-bar section; CS data lives there too. */
    var ICON_MORE = '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3.5" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="8" cy="12.5" r="1.3"/></svg>';
    function csSection(){
      return [{head:'Coordinate system'}].concat(csItems()).concat([{sep:true}, {t:'New coordinate system', fly:csNewItems()}]);
    }
    // the scene items of the ENCY cube menu: environment on/off, the floor (define, turn by 90°,
    // reset — available once the floor was defined or turned)
    var envOn = true, floorSet = false, floorTurn = 0;
    function cubeMenu(){
      return [
        {t:'Fit to view', fn:function(){ var v = window.arView && window.arView(); if(v) v.fitToView(); else if(window.tpView) window.tpView.fit(); }},
        {sep:true},
        {t:'Set current view as Home', fn:function(){ HOME = {yaw:cam.yaw, pitch:cam.pitch}; }},
        {t:'Reset Home', fn:function(){ HOME = {yaw:0.68, pitch:0.49}; set(HOME.yaw, HOME.pitch, true); }},
        {sep:true},
        {t:'Environment', chk:envOn, fn:function(){ envOn = !envOn; vpEl.classList.toggle('env-off', !envOn); return true; }},
        {sep:true},
        {t:'Define floor', fn:function(){ floorSet = true; }},
        {t:'Rotate 90°', title:'Turn the floor by 90°', fn:function(){ floorTurn = (floorTurn + 90) % 360; }},
        {t:'Reset', title:'Reset the floor', dis:!floorSet && !floorTurn, fn:function(){ floorSet = false; floorTurn = 0; }},
        {sep:true},
        {head:'Position'},
        {seg:CUBE_CORNERS.map(function(c){ return cornerIcon(c.x, c.y); }), segHtml:true,
         segTitles:CUBE_CORNERS.map(function(c){ return c.t; }),
         cur:CUBE_CORNERS.map(function(c){ return c.id; }).indexOf(cubeCorner),
         fn:function(i){ cubeAt(CUBE_CORNERS[i].id); vbMenuClose(); }}
      ];
    }
    /* the corner of the 3D view the cube sits in (app.css: data-cube on .viewport); kept */
    var CUBE_CORNERS = [{id:'tl', t:'Top left', x:2, y:2}, {id:'tr', t:'Top right', x:10, y:2},
                        {id:'bl', t:'Bottom left', x:2, y:6}, {id:'br', t:'Bottom right', x:10, y:6}];
    function cornerIcon(x, y){
      return '<svg viewBox="0 0 16 12" fill="none"><rect x=".5" y=".5" width="15" height="11" rx="1.5" stroke="currentColor" stroke-opacity=".56"/>' +
        '<rect x="' + x + '" y="' + y + '" width="4" height="4" rx="1" fill="currentColor"/></svg>';
    }
    var cubeVp = box.parentElement, cubeCorner = 'bl';
    try { cubeCorner = localStorage.getItem('ency.cubeCorner') || 'bl'; } catch(e){}
    function cubeAt(id){
      cubeCorner = id; cubeVp.dataset.cube = id;
      try { localStorage.setItem('ency.cubeCorner', id); } catch(e){}
      window.dispatchEvent(new Event('resize'));       // the calc bar re-fits between the view bars
    }
    cubeAt(cubeCorner);
    // top-left sits right of the Filters column, whose width changes (one column, folded)
    var vpLeftEl = document.getElementById('vpLeft');
    if(vpLeftEl && window.ResizeObserver) new ResizeObserver(function(){
      cubeVp.style.setProperty('--vpl-w', vpLeftEl.offsetWidth + 'px');
    }).observe(vpLeftEl);
    var more = btn('vc-more', 'View options', ICON_MORE, function(){ vbMenuOpen(more, cubeMenu); });
    // active coordinate system as a caption under the cube; click opens the CS list
    var cap = document.createElement('div'); cap.className = 'vc-cs'; cap.id = 'vcCs'; cap.title = 'Active coordinate system';
    cap.addEventListener('click', function(e){ e.stopPropagation(); vbMenuOpen(cap, csSection); });
    box.appendChild(cap);

    /* the floor grid of the 3D view (app.css .vp-grid): the XY plane through the centre of the free
       view, in the cube's camera (proj() above), so it turns with the cube. ENCY's grid: a line every
       6.4px, every tenth stronger; the lines thin out as they crowd, and all of it as the floor turns
       edge-on. Plus the diffuse light while the machine is shown (its filter on, .vp-glow) */
    var vpEl = box.parentElement;
    var grid = document.createElement('canvas'); grid.className = 'vp-grid';
    var glow = document.createElement('div'); glow.className = 'vp-glow';
    vpEl.insertBefore(glow, vpEl.firstChild); vpEl.insertBefore(grid, glow);
    var GRID_STEP = 6.4, GRID_MINOR = 0.08, GRID_MAJOR = 0.11;
    function ease(a, b, x){ var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function gridDraw(){
      if(!grid) return;
      var dpr = window.devicePixelRatio || 1, W = vpEl.clientWidth, H = vpEl.clientHeight;
      if(!W || !H) return;
      var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
      if(grid.width !== bw || grid.height !== bh){ grid.width = bw; grid.height = bh; }
      var g = grid.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh);
      var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), sp = Math.sin(cam.pitch);
      var tilt = ease(0.03, 0.25, Math.abs(sp)); if(!tilt) return;
      // the origin: the centre of the free view (the glow spans it), a little below the middle
      var gr = glow.getBoundingClientRect(), vr = vpEl.getBoundingClientRect();
      var ox = gr.left - vr.left + gr.width / 2, oy = H * 0.6;
      grid.style.setProperty('--gx', ox + 'px'); grid.style.setProperty('--gy', oy + 'px');
      function fwd(X, Y){ return [ox + cy*X - sy*Y, oy + sp*(sy*X + cy*Y)]; }
      function inv(u, v){ u -= ox; v = (v - oy) / sp; return [cy*u + sy*v, -sy*u + cy*v]; }
      var cs = [inv(0, 0), inv(W, 0), inv(0, H), inv(W, H)];
      var xs = cs.map(function(c){ return c[0]; }), ys = cs.map(function(c){ return c[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var ink = getComputedStyle(vpEl).getPropertyValue('--th-ink').trim() || '#f5f5f5';
      var lift = /-light$/.test(document.documentElement.dataset.theme || '') ? 1.4 : 1;   // the light themes' raised ink
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineWidth = 1; g.strokeStyle = ink;   // 1px lines, as ENCY draws them
      // one family: lines along the floor's Y (at X = k·step) or along its X (at Y = k·step)
      function family(alongY){
        var gap = GRID_STEP * Math.abs(sp) / Math.hypot(alongY ? sy : cy, sp * (alongY ? cy : sy));  // screen gap of two lines
        var lo = alongY ? x0 : y0, hi = alongY ? x1 : y1, a = alongY ? y0 : x0, b = alongY ? y1 : x1;
        var kMinor = ease(3, 6, gap) * GRID_MINOR, kMajor = ease(3, 6, gap * 10) * GRID_MAJOR;
        [[kMinor, false], [kMajor, true]].forEach(function(pass){
          if(!pass[0]) return;
          g.globalAlpha = pass[0] * tilt * lift; g.beginPath();
          for(var k = Math.ceil(lo / GRID_STEP); k <= Math.floor(hi / GRID_STEP); k++){
            if((k % 10 === 0) !== pass[1]) continue;
            var c = k * GRID_STEP, p = alongY ? fwd(c, a) : fwd(a, c), q = alongY ? fwd(c, b) : fwd(b, c);
            g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]);
          }
          g.stroke();
        });
      }
      family(true); family(false);
      g.globalAlpha = 1;
    }
    window.addEventListener('resize', gridDraw);
    new MutationObserver(gridDraw).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    // the machine light follows the Machine filter
    var machineCell = document.querySelector('#filters .f-cell[data-ftype="machine"]');
    function glowSync(){ vpEl.classList.toggle('env-machine', !!machineCell && machineCell.classList.contains('on')); }
    if(machineCell) new MutationObserver(glowSync).observe(machineCell, {attributes:true, attributeFilter:['class']});
    glowSync();

    draw();
    requestAnimationFrame(pull);
    window.viewCube = {set:set, get:function(){ return {yaw:cam.yaw, pitch:cam.pitch}; }, look:function(d){ var c = camFrom(d); set(c.yaw, c.pitch, true); }};
  })();

  /* ---------- Bottom view bar (right of the cube) ----------
     Left: view tools — Zoom extents, rotation mode, display mode, section plane.
     Middle: the calculation progress (see below), shown only while calculating.
     Right: new CS (+), CS picker, notifications, CPU load. Menus use the shared .dd-menu. */
  var VBI = {
    zoom:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5"/><rect x="5" y="5" width="6" height="6" rx="1"/></svg>',
    rot:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.2"/><path d="M13.6 6.2A6 6 0 0 0 3.3 4.4M2.4 9.8a6 6 0 0 0 10.3 1.8"/><path d="M13.7 3.2v3h-3M2.3 12.8v-3h3"/></svg>',
    disp:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11M2.5 8h11M4.2 4.4a5.5 5.5 0 0 0 7.6 0M4.2 11.6a5.5 5.5 0 0 1 7.6 0"/></svg>',
    sect:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M8 2 13.5 5v6L8 14 2.5 11V5L8 2Z"/><path d="M2.5 5 8 8l5.5-3M8 8v6"/><path d="M1.5 9.5 14.5 3.5" stroke-dasharray="2 1.5"/></svg>',
    plus:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    cs:'<svg viewBox="0 0 16 16" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9V3" stroke="var(--st-blue)"/><path d="M8 9l5.2 3" stroke="#ff5c77"/><path d="M8 9l-5.2 3" stroke="var(--st-green)"/><path d="M6.6 4.4 8 3l1.4 1.4" stroke="var(--st-blue)"/></svg>',
    csg:'<svg viewBox="0 0 16 16" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9V3" stroke="var(--st-blue)"/><path d="M8 9l5.2 3" stroke="#ff5c77"/><path d="M8 9l-5.2 3" stroke="var(--st-green)"/><circle cx="8" cy="9" r="1.6" fill="currentColor" stroke="none"/></svg>',
    bell:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3L4 11Z"/><path d="M6.5 14a1.5 1.5 0 0 0 3 0"/></svg>',
    chev:'<svg class="chev" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 3 4 5.5 6.5 3"/></svg>',
    dlg:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 5.5h12"/></svg>',
    more:'<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
    x:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
  };
  // three separate floating panels: view tools · calculation progress · CS / status
  var vp = document.querySelector('.viewport');

  /* ---------- Function bar: the ENCY function panel at the top of the 3D view, its set by the mode
     tab — Model: the geometry tools, Machining (and Simulation for now): the machining ones. Every
     button calls a function (not built in the prototype yet); Smart snap is a switch, shared by the
     sets. Tools opens its list under the pointer and runs the first item on a click. Hover: the ENCY
     tooltip (name · what it does). Icons: i = the cell of ENCY's sprite, 12 a row (names and hints
     from ENCY: BtnsDarkIconPack.ini, the forms in SCKernel.dll) ---------- */
  var FN_MEASURE = [
    {id:'snap', i:8, t:'Smart snap', d:'Enable/disable smart snap', toggle:true},
    {id:'measure', i:10, t:'Measure tool', d:'This tool shows a linear part annotation dimension between two points'},
    {id:'geom', i:9, t:'Geometry measuring', d:'Measurement of geometrical parameters of the model'}
  ];
  var FN_BARS = {
    machining: FN_MEASURE.concat([
      {sep:true},
      {id:'post', i:0, t:'Postprocessor', d:'Generate NC-code by postprocessor'},
      {id:'report', i:1, t:'Machining report', d:'Generate machining report'},
      {id:'tools', i:2, t:'Tools', menu:['Load tool list', null, 'Import tools to the project...', 'Save list of project tools as...',
        'Delete all unused tools from the project', 'Adapt machine for advanced tools']},
      {sep:true},
      {id:'mcp', i:3, t:'Machine control panel', d:'Opens window to see and change the machine state'},
      {id:'axes', i:5, t:'Graph of the axes', d:'Graph of change the machine state'},
      {id:'verify', i:6, t:'Verify compare', d:'Compare machining result with part'},
      {id:'reach', i:4, t:'Tool reach inspector', d:'Opens inspector to see tool reach'}
    ]),
    model: FN_MEASURE.concat([
      {sep:true},
      {id:'transform', i:16, t:'Spatial transformations', d:'Spatial transformations of selected objects'},
      {id:'triangulate', i:18, t:'Surface triangulation', d:'Triangulation of selected surfaces'},
      {id:'intersect', i:15, t:'Intersect', d:'Getting curves as section of 3D model by plane'},
      {id:'project', i:14, t:'Surfaces boundary projection', d:'Projections of the selected surfaces boundary on plane'},
      {id:'isolines', i:17, t:'Extract isolines', d:'Extract face isolines'},
      {id:'sew', i:12, t:'Sew Faces', d:'Sewing surfaces on 3D model'},
      {id:'patch', i:13, t:'Patch hole', d:'Triangulation of selected curves or patching holes in meshes'},
      {id:'join', i:23, t:'Join curves', d:'Join of selected curves'},
      {id:'extend', i:29, t:'Extend surface', d:'Extend surface'}
    ])
  };
  var FN_BAR = FN_BARS.machining, fnSnapOn = false;
  var fnBar = document.createElement('div'); fnBar.className = 'etb';
  function fnRender(set){
    FN_BAR = FN_BARS[set];
    fnBar.innerHTML = FN_BAR.map(function(b){
      if(b.sep) return '<span class="etb-sep"></span>';
      var on = b.toggle && fnSnapOn;
      return '<div class="etb-b' + (on ? ' on' : '') + '" data-fn="' + b.id + '"' + (b.menu ? ' title="' + b.t + '"' : '') + '>' +
        '<span class="etb-ic" style="background-position:-' + (b.i % 12 * 28) + 'px -' + (Math.floor(b.i / 12) * 28) + 'px"></span></div>';
    }).join('');
  }
  fnRender('machining');
  vp.appendChild(fnBar);
  // the mode tabs pick the set (Model · Machining; Simulation keeps the machining one for now)
  document.querySelectorAll('.tabs[data-group="mode"] .seg').forEach(function(s){
    s.addEventListener('click', function(){ fnTipHide(); fnRender(s.textContent.trim() === 'Model' ? 'model' : 'machining'); });
  });
  var fnTip = document.createElement('div'); fnTip.className = 'etb-tip'; fnTip.hidden = true;
  document.body.appendChild(fnTip);
  function fnOf(el){ var id = el.dataset.fn; return FN_BAR.filter(function(b){ return b.id === id; })[0]; }
  var fnTipTimer = 0, fnMenuTimer = 0;
  function fnTipHide(){ clearTimeout(fnTipTimer); fnTip.hidden = true; }
  // the tooltip under the button, left-aligned to it, after a short rest of the pointer
  function fnTipShow(btn){
    var b = fnOf(btn); if(!b || !b.d) return;
    fnTipTimer = setTimeout(function(){
      fnTip.innerHTML = '<b>' + b.t + '</b><span>' + b.d + '</span>';
      fnTip.hidden = false;
      var r = btn.getBoundingClientRect();
      fnTip.style.left = Math.max(8, Math.min(r.left, innerWidth - fnTip.offsetWidth - 8)) + 'px';
      fnTip.style.top = (r.bottom + 6) + 'px';
    }, 450);
  }
  // Tools: its list opens under the pointer and stays while the pointer is on the button or on it
  function fnMenuOpen(btn){
    var b = fnOf(btn);
    if(openMenu && openMenu._owner === btn) return;
    var m = showMenu(btn.getBoundingClientRect(), b.menu.map(function(t){ return t ? {label:t} : {sep:true}; }), btn, 260);
    m.addEventListener('mouseenter', function(){ clearTimeout(fnMenuTimer); });
    m.addEventListener('mouseleave', function(){ fnMenuLater(btn); });
  }
  function fnMenuLater(btn){
    clearTimeout(fnMenuTimer);
    fnMenuTimer = setTimeout(function(){ if(openMenu && openMenu._owner === btn) closeMenu(); }, 250);
  }
  fnBar.addEventListener('mouseover', function(e){
    var btn = e.target.closest('.etb-b'); if(!btn || btn.contains(e.relatedTarget)) return;
    var b = fnOf(btn);
    if(b.menu){ clearTimeout(fnMenuTimer); fnTipHide(); fnMenuOpen(btn); } else fnTipShow(btn);
  });
  fnBar.addEventListener('mouseout', function(e){
    var btn = e.target.closest('.etb-b'); if(!btn || btn.contains(e.relatedTarget)) return;
    fnTipHide();
    if(fnOf(btn).menu) fnMenuLater(btn);
  });
  fnBar.addEventListener('click', function(e){
    var btn = e.target.closest('.etb-b'); if(!btn) return;
    e.stopPropagation(); fnTipHide();
    var b = fnOf(btn);
    if(b.toggle){ fnSnapOn = btn.classList.toggle('on'); return; }
    // Tools runs its first item (Load tool list); the functions themselves are not built yet
    if(b.menu) closeMenu();
  });
  var viewTools = document.createElement('div');
  viewTools.className = 'vbar vb-tools';
  viewTools.innerHTML =
    '<div class="vb-btn" id="vbZoom" title="Zoom extents">' + VBI.zoom + '</div>' +
    '<div class="vb-btn" id="vbRot" title="Rotation">' + VBI.rot + '</div>' +
    '<div class="vb-btn" id="vbDisp" title="Display">' + VBI.disp + '</div>' +
    '<div class="vb-btn" id="vbSect" title="Section plane">' + VBI.sect + '</div>';
  vp.appendChild(viewTools);
  var sysBar = document.createElement('div');
  sysBar.className = 'vbar vb-sys';
  sysBar.innerHTML =
    '<div class="vb-cpu" id="vbCpu" title="CPU load"><span id="vbCpuPct">0%</span><span class="meter"><i id="vbCpuFill"></i></span></div>';
  vp.appendChild(sysBar);
  // Cancel first (always in the same place) · operation icon + name in a fixed-width slot
  // · divider · n of N · track · % · time
  var calcBar = document.createElement('div');
  calcBar.className = 'calcbar'; calcBar.hidden = true;
  calcBar.innerHTML =
    '<button class="cb-cancel" id="cbCancel" title="Cancel"><span class="txt">Cancel</span>' + VBI.x + '</button>' +
    '<span class="cb-sep"></span>' +
    '<span class="cb-icn" id="cbIcn"></span>' +
    '<span class="cb-title" id="cbTitle">Calculating <b id="cbName"></b></span>' +
    '<span class="cb-sep"></span>' +
    '<span class="cb-meta" id="cbCount"></span>' +
    '<span class="cb-track"><i id="cbFill"></i></span>' +
    '<span class="cb-ring" title="Overall progress"></span>' +
    '<span class="cb-pct" id="cbPct">0%</span>' +
    '<span class="cb-time" id="cbTime" title="Time of the current operation">00:00.0</span>';
  vp.appendChild(calcBar);
  // the progress panel fills the gap between the two side panels
  function calcPlace(){
    var a = viewTools.getBoundingClientRect(), b = sysBar.getBoundingClientRect(), r = vp.getBoundingClientRect();
    calcBar.style.left = (a.right - r.left + 8) + 'px';
    calcBar.style.right = (r.right - b.left + 8) + 'px';
  }
  window.addEventListener('resize', calcPlace);
  // density steps by the panel's own width: c1 — Cancel becomes an icon, the name slot
  // gives way; c2 — "n of N" and the time go; c3 — the track goes, the progress is drawn
  // as a ring around the operation icon
  if(window.ResizeObserver) new ResizeObserver(function(){
    var w = calcBar.clientWidth;
    calcBar.classList.toggle('c1', w < 640);
    calcBar.classList.toggle('c2', w < 460);
    calcBar.classList.toggle('c3', w < 320);
  }).observe(calcBar);

  /* generic bottom-anchored menu on top of the shared .dd-menu
     items: {t, icon, ck, chk, fn, dis, sub, tail:[{icon,fn,title}]} | {sep} | {head} | {seg:[..], cur, fn(i)} */
  var vbMenu = null, vbMenuAnchor = null, vbFly = null;
  function vbFlyClose(){ if(vbFly){ vbFly.remove(); vbFly = null; } if(vbMenu){ var h = vbMenu.querySelector('.dd-opt.fly-open'); if(h) h.classList.remove('fly-open'); } }
  function vbMenuClose(){ vbFlyClose(); if(vbMenu){ vbMenu.remove(); vbMenu = null; } if(vbMenuAnchor){ vbMenuAnchor.classList.remove('open'); vbMenuAnchor = null; } }
  function vbMenuFill(m, items, render){
    m.innerHTML = '';
    items.forEach(function(o){
      var d = document.createElement('div');
      if(o.sep){ d.className = 'dd-sep'; }
      else if(o.head){ d.className = 'dd-head'; d.textContent = o.head; }
      else if(o.seg){
        d.className = 'vb-seg';
        o.seg.forEach(function(s, i){
          var c = document.createElement('div'); if(o.segHtml) c.innerHTML = s; else c.textContent = s;
          if(o.segTitles) c.title = o.segTitles[i];
          if(i === o.cur) c.className = 'cur';
          c.addEventListener('click', function(){ o.fn(i); render(); }); d.appendChild(c);
        });
      } else {
        d.className = 'dd-opt' + (o.ck || o.chk ? ' cur' : '') + (o.sel ? ' sel' : '') + (o.dis ? ' dis' : '') + (o.ind ? ' ind' : '') + (o.fly ? ' has-fly' : '');
        var html = '';
        if('chk' in o) html += '<span class="dd-chk">' + (o.chk ? '✓' : '') + '</span>';
        else if('ck' in o) html += '<span class="dd-ck">' + (o.ck ? '✓' : '') + '</span>';
        if(o.icon) html += o.icon;
        html += '<span class="lbl">' + o.t + '</span>';
        if(o.tail) html += '<span class="tail">' + o.tail.map(function(x, i){ return '<span data-i="' + i + '" title="' + (x.title || '') + '">' + x.icon + '</span>'; }).join('') + '</span>';
        if(o.title) d.title = o.title;
        d.innerHTML = html;
        if(o.fly){
          // flyout submenu to the right of the row; opens on hover, the row click toggles it
          d.addEventListener('mouseenter', function(){ vbFlyOpen(d, o.fly); });
          d.addEventListener('click', function(){ if(vbFly && d.classList.contains('fly-open')) return; vbFlyOpen(d, o.fly); });
        } else {
          d.addEventListener('mouseenter', function(){ if(m === vbMenu) vbFlyClose(); });
          d.addEventListener('click', function(e){
            var t = e.target.closest('.tail span');
            if(t){ o.tail[+t.dataset.i].fn(); render(); return; }
            var keep = o.fn && o.fn() === true;      // return true to keep the menu open
            if(keep) render(); else vbMenuClose();
          });
        }
      }
      m.appendChild(d);
    });
  }
  function vbFlyOpen(row, items){
    if(vbFly && row.classList.contains('fly-open')) return;
    vbFlyClose();
    var f = document.createElement('div'); f.className = 'dd-menu vb-menu vb-fly';
    (function rerender(){ vbMenuFill(f, items, rerender); })();
    document.body.appendChild(f);
    var r = row.getBoundingClientRect(), fw = f.offsetWidth, fh = f.offsetHeight;
    var left = r.right + 4; if(left + fw > window.innerWidth - 8) left = r.left - fw - 4;
    var top = Math.min(r.top - 3, window.innerHeight - fh - 8);
    f.style.left = left + 'px'; f.style.top = top + 'px';
    row.classList.add('fly-open'); vbFly = f;
  }
  function vbMenuOpen(anchor, build){
    if(vbMenuAnchor === anchor){ vbMenuClose(); return; }
    vbMenuClose();
    var m = document.createElement('div'); m.className = 'dd-menu vb-menu';
    function render(){ vbFlyClose(); vbMenuFill(m, build(), render); }
    render();
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect(), mh = m.offsetHeight, mw = m.offsetWidth;
    var top = r.top - mh - 6; if(top < 8) top = r.bottom + 6;
    var left = Math.min(r.left, window.innerWidth - mw - 8);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    vbMenu = m; vbMenuAnchor = anchor; anchor.classList.add('open');
  }
  document.addEventListener('pointerdown', function(e){
    if(vbMenu && !vbMenu.contains(e.target) && !(vbFly && vbFly.contains(e.target)) && !(vbMenuAnchor && vbMenuAnchor.contains(e.target))) vbMenuClose();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') vbMenuClose(); });

  // --- left tools ---
  document.getElementById('vbZoom').addEventListener('click', function(){
    var v = window.arView && window.arView(); if(v) v.fitToView();
    else if(window.tpView) window.tpView.fit();
  });
  var vbRotMode = 1, vbAxis = 2;                       // Orbit · fixed axis Z
  document.getElementById('vbRot').addEventListener('click', function(){
    vbMenuOpen(this, function(){ return [
      {t:'Trackball (free rotation)', ck:vbRotMode === 0, fn:function(){ vbRotMode = 0; return true; }},
      {t:'Orbit control',             ck:vbRotMode === 1, fn:function(){ vbRotMode = 1; return true; }},
      {sep:true},
      {head:'Fixed axis'},
      {seg:['X','Y','Z'], cur:vbRotMode === 1 ? vbAxis : -1, fn:function(i){ vbRotMode = 1; vbAxis = i; }}
    ]; });
  });
  var vbShade = 0, vbAO = true, vbGround = false, vbScheme = 0;
  document.getElementById('vbDisp').addEventListener('click', function(){
    var SH = ['Shade', 'Shade plus Wire', 'Wire'], SC = ['Project colors', 'Gunmetal', 'Restrained'];
    vbMenuOpen(this, function(){
      return SH.map(function(n, i){ return {t:n, ck:vbShade === i, fn:function(){ vbShade = i; return true; }}; })
        .concat([
          {sep:true},
          {t:'Ambient occlusion', chk:vbAO,     fn:function(){ vbAO = !vbAO; return true; }},
          {t:'Ground plane',      chk:vbGround, fn:function(){ vbGround = !vbGround; return true; }},
          {sep:true},
          {head:'Color scheme'}
        ])
        .concat(SC.map(function(n, i){ return {t:n, ck:vbScheme === i, fn:function(){ vbScheme = i; return true; }}; }));
    });
  });
  document.getElementById('vbSect').addEventListener('click', function(){ this.classList.toggle('on'); });

  // --- coordinate systems: data + menu items, opened from the caption under the cube ---
  var CS_SYS = ['XY plane', 'YZ plane', 'ZX plane', 'XZ-ZX plane'];
  var csUser = ['Plano XY', 'Plano YZ'], csCur = 'Plano XY';
  function csName(){ var c = document.getElementById('vcCs'); if(c) c.textContent = csCur; }
  csName();
  function csItems(){
    // tree: Global CS → its standard planes; user systems at the root level.
    // The active one is a highlighted row (no check column)
    var items = [{t:'Global CS', icon:VBI.csg, sel:csCur === 'Global CS', fn:function(){ csCur = 'Global CS'; csName(); }}];
    CS_SYS.forEach(function(n){ items.push({t:n, icon:VBI.cs, ind:true, sel:csCur === n, fn:function(){ csCur = n; csName(); }}); });
    csUser.forEach(function(n){
      items.push({t:n, icon:VBI.cs, sel:csCur === n, fn:function(){ csCur = n; csName(); },
        tail:[{icon:VBI.more, title:'Edit…', fn:function(){}},
              {icon:VBI.x, title:'Delete', fn:function(){ csUser = csUser.filter(function(x){ return x !== n; }); if(csCur === n){ csCur = 'Global CS'; csName(); } }}]});
    });
    return items;
  }
  function csNewItems(){
    return [
      {t:'With selected geometry', icon:VBI.csg, dis:true},
      {t:'Dialog…', icon:VBI.dlg, fn:function(){}},
      {t:'By starting point, X and Y axes', icon:VBI.cs, fn:function(){}},
      {t:'By starting point and current view vector', icon:VBI.cs, fn:function(){}}
    ];
  }

  // --- right: CPU load (demo: idle 2–8 %, 40–90 % while calculating) ---
  var cpu = document.getElementById('vbCpu'), cpuV = 4;
  setInterval(function(){
    var target = calcState ? 40 + Math.random() * 50 : 2 + Math.random() * 6;
    cpuV += (target - cpuV) * 0.5;
    document.getElementById('vbCpuPct').textContent = Math.round(cpuV) + '%';
    document.getElementById('vbCpuFill').style.height = Math.round(cpuV) + '%';
    cpu.classList.toggle('hot', cpuV > 80);
  }, 600);

  /* ---------- Calculation progress (middle of the view bar) ----------
     Operations are calculated one after another; the bar shows the current operation,
     its elapsed time, the overall progress and Cancel. Containers (setup / part / machine)
     get their status once everything below them is done. */
  var calcState = null;

  function fmtT(ms){ var s = ms / 1000; return (s < 600 ? ('0' + Math.floor(s / 60)).slice(-2) : Math.floor(s / 60)) + ':' + ('0' + (s % 60).toFixed(1)).slice(-4); }

  function calcRun(scope){
    if(calcState) return;
    var ops = scope.filter(function(r){ return r.dataset.type === 'operation'; }),
        containers = scope.filter(function(r){ return r.dataset.type !== 'operation'; });
    if(!ops.length){ containers.forEach(function(r){ var s = r.querySelector('.st'); if(s) s.src = CALC; }); return; }
    scope.forEach(function(r){ var s = r.querySelector('.st'); if(s) s.src = EMPTY; });
    calcBtn.classList.add('busy');
    // demo durations: 1.2–2.8 s per operation
    var plan = ops.map(function(r){ return {row:r, ms:1200 + Math.random() * 1600}; });
    calcState = {plan:plan, i:0, t0:performance.now(), opT0:performance.now(), raf:0, blink:0};
    calcPlace(); calcBar.hidden = false;
    calcTick();
  }
  function calcTick(){
    var st = calcState; if(!st) return;
    var now = performance.now(), cur = st.plan[st.i], el = now - st.opT0;
    if(el >= cur.ms){
      cur.row.querySelector('.st').src = CALC;
      st.i++;
      if(st.i >= st.plan.length){ calcFinish(true); return; }
      st.opT0 = now; cur = st.plan[st.i]; el = 0;
    }
    var frac = Math.min(1, el / cur.ms), total = (st.i + frac) / st.plan.length;
    // the current operation blinks between the two "in progress" glyphs
    var icon = cur.row.querySelector('.st');
    if(Math.floor(now / 350) !== st.blink){ st.blink = Math.floor(now / 350); icon.src = st.blink % 2 ? P1 : P2; }
    var nameEl = cur.row.querySelector('.rlabel');
    document.getElementById('cbName').textContent = nameEl ? nameEl.textContent.trim() : cur.row.dataset.id;
    if(st.iconOf !== cur.row){                        // operation changed → its icon
      st.iconOf = cur.row;
      var ic = cur.row.querySelector('.opic');
      document.getElementById('cbIcn').innerHTML = ic ? ic.outerHTML : '';
    }
    document.getElementById('cbCount').textContent = (st.i + 1) + ' of ' + st.plan.length;
    document.getElementById('cbFill').style.width = (total * 100).toFixed(1) + '%';
    calcBar.style.setProperty('--p', (total * 100).toFixed(1));
    document.getElementById('cbPct').textContent = Math.round(total * 100) + '%';
    document.getElementById('cbTime').textContent = fmtT(el);
    st.raf = requestAnimationFrame(calcTick);
  }
  function calcFinish(done){
    var st = calcState; if(!st) return;
    cancelAnimationFrame(st.raf);
    calcState = null;
    calcBtn.classList.remove('busy');
    if(done){
      // containers follow their operations
      document.querySelectorAll('.trow:not([data-type="operation"]) .st').forEach(function(s){ if(s.src === EMPTY) s.src = CALC; });
      calcBar.classList.add('done');
      // same nodes, new text — nothing is re-laid out, so the bar does not jump
      document.getElementById('cbTitle').innerHTML = 'Calculated <b>' + st.plan.length + (st.plan.length === 1 ? ' operation' : ' operations') + '</b>';
      document.getElementById('cbCount').textContent = st.plan.length + ' of ' + st.plan.length;
      document.getElementById('cbTime').textContent = fmtT(performance.now() - st.t0);
      document.getElementById('cbFill').style.width = '100%'; calcBar.style.setProperty('--p', 100);
      document.getElementById('cbPct').textContent = '100%';
      setTimeout(function(){
        calcBar.hidden = true; calcBar.classList.remove('done');
        document.getElementById('cbTitle').innerHTML = 'Calculating <b id="cbName"></b>';
      }, 1400);
    } else {
      // cancelled: the current one goes back to "not calculated", the rest stay empty
      st.plan.slice(st.i).forEach(function(p){ p.row.querySelector('.st').src = EMPTY; });
      calcBar.hidden = true;
    }
  }
  document.getElementById('cbCancel').addEventListener('click', function(){ calcFinish(false); });

  /* ---------- Reset statuses (sync button, left of Calculate) ---------- */
  var resetBtn = document.getElementById('resetBtn');
  if(resetBtn){
    resetBtn.addEventListener('click', function(e){
      e.stopPropagation();
      tree.querySelectorAll('.st').forEach(function(img){ img.src = A['status-empty']; });
    });
  }

  /* ---------- Status panel: open on status-circle click, close on ✕/Esc ---------- */
  var statusPanel = document.getElementById('statusPanel');
  var stpTitle = document.getElementById('stpTitle');
  var stpClose = document.getElementById('stpClose');
  var simRan = false; // flips once the simulation has been played

  // panel content per operation state: not calculated → calculated → simulated
  var STP_STATES = {
    empty: {
      icons:['status-empty','status-complete','status-prog1','status-done','status-done'],
      metas:['Not calculated','','','',''],
      dim:[false,true,true,true,true],
      stats:['00h 00m 00s','0.000 m','0','597.145 cm³'],
      kids:[['00h 00m 00s','00h 00m 00s','00h 00m 00s','00h 00m 00s','00h 00m 00s'],
            ['0.000 m','0.000 m','0.000 m','0.000 m','0.000 m','0.000 m','0.000 m'],
            ['0','0'],['0.000 cm³']]
    },
    calculated: {
      icons:['status-calc','status-complete','status-prog1','status-done','status-done'],
      metas:['Calculated: 00h 00m 10s','','','',''],
      dim:[false,true,true,true,true],
      stats:['02h 12m 16s','14.076 m','22896','597.145 cm³'],
      kids:[['02h 11m 57s','00h 00m 07s','00h 00m 05s','00h 02m 37s','00h 00m 12s'],
            ['11.361 m','1.568 m','0.016 m','0.523 m','0.296 m','0.296 m','0.016 m'],
            ['22745','97'],['0.000 cm³']]
    },
    simulated: {
      icons:['status-calc','status-complete','status-prog1','status-done','status-done'],
      metas:['Calculated: 00h 00m 10s','Done','Done','Done','Not required'],
      dim:[false,false,false,false,false],
      stats:['02h 12m 16s','14.076 m','22896','0.000 cm³'],
      kids:[['02h 11m 57s','00h 00m 07s','00h 00m 05s','00h 02m 37s','00h 00m 12s'],
            ['11.361 m','1.568 m','0.016 m','0.523 m','0.296 m','0.296 m','0.016 m'],
            ['22745','97'],['597.145 cm³']]
    }
  };
  /* what the checks found in an operation with the error status (step = the status step that
     found it: 1 machining result, 2 tool holder, 3 machine), and the warnings of a calculated
     one. ENCY393 carries four errors and three warnings (stpPick covers any other) */
  var STP_ERRS = {
    'b-op48':  [{step:1, t:'Gouge of the part', d:'0.12 mm into the part · 3 places'}],
    'b-op139': [{step:2, t:'Tool holder collision', d:'The holder hits the stock · 1 place'}],
    'b-op204': [{step:3, t:'Machine collision', d:'The spindle head hits the fixture · 2 places'}],
    'b-op342': [{step:1, t:'Gouge of the part', d:'0.05 mm into the part · 1 place'},
                {step:2, t:'Tool holder collision', d:'The holder hits the part · 4 places'}]
  };
  var STP_WARNS = {
    'b-op86':  [{t:'Thread depth reduced', d:'The hole is 2 mm shallower than the thread'}],
    'b-op173': [{t:'Long tool overhang', d:'92 mm out of the holder, 4.6 × D'}],
    'b-op267': [{t:'Point angle mismatch', d:'Spot drill 90°, drill point 118°'}]
  };
  var STP_KIND = {machine:'Machine', setup:'Setup', part:'Part', group:'Group', operation:'Operation'};
  // a branch summary counts its operations by status, worst first
  var STP_CATS = [['error', 'status-error', 'Errors'], ['warn', 'status-warn', 'Warnings'],
    ['mod', 'status-warn2', 'Parameters changed'], ['run', 'status-prog1', 'Calculating'],
    ['calc', 'status-calc', 'Calculated'], ['empty', 'status-empty', 'Not calculated']];
  var stpMod = document.getElementById('stpMod'), stpPath = document.getElementById('stpPath');
  var stpOps = document.getElementById('stpOps'), stpOpsN = document.getElementById('stpOpsN');
  var stpErrSec = document.getElementById('stpErrSec'), stpErrs = document.getElementById('stpErrs');
  var stpWarnSec = document.getElementById('stpWarnSec'), stpWarns = document.getElementById('stpWarns');
  var stpProbs = document.getElementById('stpProbs');
  var stpRow = null;   // the tree row the panel describes
  function rowName(r){ var n = r.querySelector('.rlabel span'); return n ? n.textContent : ''; }
  function opCat(r){
    var s = r.querySelector('.st').src;
    return s === A['status-error'] ? 'error' : s === A['status-warn'] ? 'warn' : s === A['status-warn2'] ? 'mod'
      : s === A['status-empty'] ? 'empty' : s === A['status-prog1'] || s === A['status-prog2'] ? 'run' : 'calc';
  }
  // an operation without its own entry gets one of the known problems, picked by its number
  function stpPick(map, r){
    var pool = [], k; for(k in map) pool = pool.concat(map[k]);
    return [pool[(parseInt(r.dataset.id.replace(/\D/g, ''), 10) || 0) % pool.length]];
  }
  function stpErrsOf(r){ return STP_ERRS[r.dataset.id] || stpPick(STP_ERRS, r); }
  function stpWarnsOf(r){ return STP_WARNS[r.dataset.id] || stpPick(STP_WARNS, r); }
  // "Setup 1 › Housing": the branches above a row (the machine left out)
  function stpWhere(r){
    var out = [];
    for(var p = r.dataset.parent; p; p = byId[p] ? byId[p].dataset.parent : null)
      if(byId[p] && byId[p].dataset.type !== 'machine') out.unshift(rowName(byId[p]));
    return out.join(' › ');
  }
  function plural(n, w){ return n + ' ' + w + (n === 1 ? '' : 's'); }
  // the line under the title: the kind, where it sits (Operation, Group, Part),
  // what it holds (Machine, Setup, Part)
  function stpPathOf(r){
    var t = r.dataset.type, bits = [STP_KIND[t] || ''], w = t === 'machine' || t === 'setup' ? '' : stpWhere(r);
    if(w) bits.push(w);
    if(t === 'machine' || t === 'setup' || t === 'part'){
      var n = {setup:0, part:0, group:0};
      rows.forEach(function(x){ if(x.dataset.type in n && isUnder(x, r)) n[x.dataset.type]++; });
      if(n.setup) bits.push(plural(n.setup, 'setup'));
      if(n.part) bits.push(plural(n.part, 'part'));
      if(n.group) bits.push(plural(n.group, 'group'));
    }
    return bits.join(' · ');
  }
  // the errors and warnings of one operation as cards (a branch lists them by type: stpLists)
  function stpCards(errs, warns){
    function html(list, warn){
      return list.map(function(e){
        return '<div class="ncp-err' + (warn ? ' is-warn' : '') + '">' +
          '<span class="ncp-err__body"><b>' + e.t + '</b><span>' + e.d + '</span></span></div>';
      }).join('');
    }
    stpProbs.hidden = !errs.length && !warns.length;
    stpErrSec.hidden = stpErrs.hidden = !errs.length;
    stpErrs.innerHTML = html(errs, false);
    stpWarnSec.hidden = stpWarns.hidden = !warns.length;
    stpWarns.innerHTML = html(warns, true);
  }
  // opt.mod: parameters changed after the calculation; opt.errs: what the checks found
  function stpApply(state, opt){
    opt = opt || {};
    var s = STP_STATES[state], mod = !!opt.mod, errs = mod ? [] : (opt.errs || []);
    var errAt = {}, lastErr = -1;
    errs.forEach(function(e){ errAt[e.step] = 1; lastErr = Math.max(lastErr, e.step); });
    stpMod.hidden = !mod;
    statusPanel.querySelectorAll('.stp-list--status .stp-row').forEach(function(row, i){
      var icon = s.icons[i], meta = s.metas[i], dim = s.dim[i];
      // changed parameters: the toolpath no longer matches, the checks after it are void
      if(mod){ if(i === 0) icon = 'status-warn2'; else { meta = ''; dim = true; } }
      // an error stops the chain: the checks after the last failed one did not run
      else if(lastErr >= 0 && i > lastErr){ meta = ''; dim = true; }
      row.querySelector('img').src = A[icon];
      var m = row.querySelector('.stp-meta');
      if(errAt[i]) m.innerHTML = '<img class="i16" src="' + A['status-error'] + '" alt="" title="Error">';
      else m.textContent = i === 0 && mod ? '' : meta;
      row.classList.toggle('is-dim', dim);
    });
    // text only: the error glyph already marks the step in the status list above
    stpCards(errs, mod ? [] : (opt.warns || []));
    statusPanel.querySelectorAll('.stp-grp').forEach(function(grp, gi){
      grp.querySelector('.stp-parent .stp-val').textContent = s.stats[gi];
      grp.querySelectorAll('.stp-kids .stp-val').forEach(function(v, ki){
        v.textContent = s.kids[gi][ki];
      });
    });
  }
  /* Machine / Setup / Part / Group — readable with the project folded: its operations counted
     by status, then the errors and warnings inside (statuses roll up), each card naming its
     operation and leading to it */
  function stpBranch(row){
    var n = {}, total = 0, errs = [], warns = [];
    rows.forEach(function(r){
      if(r.dataset.type !== 'operation' || !isUnder(r, row)) return;
      var c = opCat(r), p = {op:r.dataset.id, name:rowName(r), where:stpWhereIn(r, row)};
      n[c] = (n[c] || 0) + 1; total++;
      function add(list, e){ list.push(Object.assign({t:e.t, d:e.d}, p)); }
      if(c === 'error') stpErrsOf(r).forEach(function(e){ add(errs, e); });
      if(c === 'warn') stpWarnsOf(r).forEach(function(e){ add(warns, e); });
      if(c === 'mod') add(warns, {t:'Parameters changed', d:'The toolpath does not match the parameters'});
    });
    stpOpsN.textContent = total;
    stpOps.innerHTML = STP_CATS.filter(function(c){ return n[c[0]]; }).map(function(c){
      return '<div class="stp-row"><img class="i16" src="' + A[c[1]] + '" alt=""><span class="stp-lbl">' + c[2] + '</span>' +
        '<span class="stp-ops-n">' + n[c[0]] + '</span></div>';
    }).join('');
    stpMod.hidden = true;
    stpLists(errs, warns);
  }
  // "Housing › Finishing": where an operation sits inside the branch the panel shows
  function stpWhereIn(r, top){
    var out = [];
    for(var p = r.dataset.parent; p && p !== top.dataset.id; p = byId[p] ? byId[p].dataset.parent : null)
      if(byId[p]) out.unshift(rowName(byId[p]));
    return out.join(' › ');
  }
  /* the problems of a branch grow by type, not by operation: one row per error / warning type
     with its count, unfolding into the operations (name · where; click → go to it). Up to five
     problems everything is unfolded; a type the user folded or unfolded stays so on refresh */
  var STP_CHEV = '<svg viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var stpOpenT = {}, stpOpenFor = null;
  function stpLists(errs, warns){
    if(stpOpenFor !== stpRow){ stpOpenT = {}; stpOpenFor = stpRow; }
    function html(list, k){
      var by = {}, order = [];
      list.forEach(function(e){ if(!by[e.t]){ by[e.t] = []; order.push(e.t); } by[e.t].push(e); });
      order.sort(function(a, b){ return by[b].length - by[a].length; });   // the most frequent first
      return '<div class="stp-plist' + (k === 'w' ? ' is-warn' : '') + '">' + order.map(function(t){
        var key = k + '|' + t, open = key in stpOpenT ? stpOpenT[key] : list.length <= 5;
        return '<div class="stp-pgrp' + (open ? ' open' : '') + '" data-key="' + key + '">' +
          '<div class="stp-prow stp-phead"><span class="stp-chev">' + STP_CHEV + '</span><b>' + t + '</b>' +
          '<span class="stp-pn">' + by[t].length + '</span></div>' +
          '<div class="stp-pkids">' + by[t].map(function(e){
            return '<div class="stp-prow stp-pop" data-op="' + e.op + '" title="' + e.d + ' — go to the operation">' +
              '<span class="stp-pname">' + e.name + '</span><span class="stp-pwhere">' + e.where + '</span></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    }
    // no total next to the titles: the Operations summary above already counts them
    stpProbs.hidden = !errs.length && !warns.length;
    stpErrSec.hidden = stpErrs.hidden = !errs.length;
    stpErrs.innerHTML = errs.length ? html(errs, 'e') : '';
    stpWarnSec.hidden = stpWarns.hidden = !warns.length;
    stpWarns.innerHTML = warns.length ? html(warns, 'w') : '';
  }
  // fill the panel from the row: a branch gets its summary; an operation its steps by status —
  // not calculated / calculated / simulated, + changed parameters (status-warn2), errors
  // (status-error, the checks have run) or warnings (status-warn)
  function stpShow(row){
    var src = row.querySelector('.st').src, branch = row.dataset.type !== 'operation';
    stpTitle.textContent = rowName(row);
    stpPath.textContent = stpPathOf(row);
    statusPanel.classList.toggle('is-branch', branch);
    stpRow = row;
    if(branch) stpBranch(row);
    else if(src === A['status-error']) stpApply('simulated', {errs: stpErrsOf(row)});
    else stpApply(src === A['status-empty'] ? 'empty' : (simRan ? 'simulated' : 'calculated'),
      {mod: src === A['status-warn2'], warns: src === A['status-warn'] ? stpWarnsOf(row) : []});
  }
  // open the panel for a row, level with it (or with its sticky / pinned clone)
  var stpAt = 8;
  function stpOpen(row, anchor){
    stpShow(row);
    statusPanel.classList.add('open');
    var vp = statusPanel.parentElement.getBoundingClientRect(), rr = (anchor || row).getBoundingClientRect();
    stpAt = rr.top - vp.top;
    stpFit();
  }
  // keep the panel inside the 3D view: level with its row while it fits, moved up as it grows
  // (a type unfolded, a window resized); taller than the view, it stops at the view's height
  // (max-height in app.css) and only the problem lists scroll
  function stpFit(){
    if(!statusPanel.classList.contains('open')) return;
    var h = statusPanel.parentElement.clientHeight;
    statusPanel.style.top = Math.max(8, Math.min(stpAt, h - statusPanel.offsetHeight - 8)) + 'px';
  }
  window.addEventListener('resize', stpFit);
  // the panel follows status changes while open (Calculate, Reset, a parameter change, Revert)
  new MutationObserver(function(){
    if(statusPanel.classList.contains('open') && stpRow && tree.contains(stpRow)){ stpShow(stpRow); stpFit(); }
  }).observe(tree, {subtree:true, attributes:true, attributeFilter:['src']});
  /* changing a parameter of a calculated operation: its toolpath no longer matches —
     the status turns amber (the calculated one is kept for Revert) */
  document.addEventListener('ency:action', function(e){
    if(!/^OP\.PARAM/.test(e.detail.cmd || '')) return;
    var row = tree.querySelector('.trow.tsel');
    if(!row || row.dataset.type !== 'operation') return;
    var st = row.querySelector('.st'); if(!st) return;
    var calc = st.src === A['status-calc'] || st.src === A['status-error'] || st.src === A['status-warn'];
    if(!calc) return;
    st.dataset.calc = st.src;
    st.src = A['status-warn2'];
  });
  // Revert: the parameters go back to the calculated values, the status to the calculated one
  document.getElementById('stpRevert').addEventListener('click', function(e){
    e.stopPropagation();
    var row = stpRow, st = row && row.querySelector('.st'); if(!st) return;
    st.src = st.dataset.calc || A['status-calc'];
    delete st.dataset.calc;
    if(row.classList.contains('tsel')) renderInspector(railCur);
    var lbl = row.querySelector('.rlabel span');
    emitAction('Revert', lbl ? lbl.textContent : '', 'OP.REVERT');
    stpShow(row);
  });
  function closeStatus(){ if(statusPanel) statusPanel.classList.remove('open'); }
  if(stpClose) stpClose.addEventListener('click', function(e){ e.stopPropagation(); closeStatus(); });
  if(statusPanel) statusPanel.addEventListener('click', function(e){
    // a problem type in a branch summary folds / unfolds its operations
    var ph = e.target.closest('.stp-phead');
    if(ph){
      var pg = ph.parentElement;
      stpOpenT[pg.dataset.key] = pg.classList.toggle('open');
      stpFit();
      return;
    }
    // an operation there: unfold the way to it, select it, show its status
    var link = e.target.closest('[data-op]'), op = link && byId[link.dataset.op];
    if(op){
      treeReveal(op);
      if(!op.classList.contains('tsel')) op.click();
      stpOpen(op);
      return;
    }
    var parent = e.target.closest('.stp-parent');
    if(!parent) return;
    parent.closest('.stp-grp').classList.toggle('open');
    stpFit();
  });
  var OP_COLORS = [
    {key:'op-yellow', label:'Yellow', color:'#FFDF70'},
    {key:'op-blue',   label:'Blue',   color:'#70CFFF'},
    {key:'op-corall', label:'Corall', color:'#FF9B70'},
    {key:'op-green',  label:'Green',  color:'#70FFAC'},
    {key:'op-purple', label:'Purple', color:'#7C70FF'}
  ];
  tree.addEventListener('click', function(e){
    var bicn = e.target.closest('.bicn');
    if(!bicn) return;
    if(bicn.querySelector('.st')){          // status circle → Status panel
      e.stopPropagation();
      var row = bicn.closest('.trow');
      if(statusPanel && row) stpOpen(row);
      return;
    }
    var cimg = bicn.querySelector('img');   // color circle → color picker
    if(cimg){
      e.stopPropagation();
      showMenu(bicn.getBoundingClientRect(), OP_COLORS.map(function(c){
        return {label:c.label, color:c.color, onPick:function(){ cimg.src = A[c.key]; }};
      }), null, 120);
    }
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeStatus(); });

  /* ---------- Toolbar: «+» add operation ---------- */
  var opSeq = 6;
  function createOperation(name, parentId){
    var r = document.createElement('div');
    r.className = 'trow';
    r.dataset.id = 'op' + (opSeq++); r.dataset.parent = parentId; r.dataset.type = 'operation';
    r.setAttribute('draggable','true');
    var inGroup = (rowById(parentId) || {dataset:{}}).dataset.type === 'group';
    r.innerHTML =
      '<div class="tlayer '+(inGroup ? 'i3' : 'i2')+'"><img class="shev" src="'+A['t-shev-leaf']+'" alt=""><span class="opic"></span><span class="rlabel"><span>'+name+'</span></span></div>'+
      '<div class="pslot"><span class="toolno">T#7</span><span class="tlink"><span>Tool not assigned</span></span>'+
      '<span class="bicn"><img class="i16" src="'+A['opcolor']+'" alt=""></span>'+
      '<span class="bicn"><img class="i16 st" src="'+A['status-empty']+'" alt=""></span></div>';
    var siblings = rows.filter(function(x){ return x.dataset.parent === parentId; });
    var anchor = siblings.length ? siblings[siblings.length-1] : rowById(parentId);
    if(anchor) tree.insertBefore(r, anchor.nextSibling); else tree.appendChild(r);
    rows.push(r); byId[r.dataset.id] = r; bindRow(r); renderTree(); r.click();
    emitAction('New operation', name, 'OP.CREATE "' + name + '"');
    return r;
  }
  var addBtn = document.querySelector('.b24.more');
  var OP_TYPES = ['2D Contour','Pocket','Drilling','Adaptive Clearing','Parallel','Multiply Group'];
  if(addBtn){
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var sel = tree.querySelector('.trow.tsel');
      var firstPart = tree.querySelector('.trow[data-type="part"]');
      var parent = firstPart ? firstPart.dataset.id : 'part1';
      if(sel){ if(sel.dataset.type==='part' || sel.dataset.type==='group') parent = sel.dataset.id; else if(sel.dataset.type==='operation') parent = sel.dataset.parent; }
      showMenu(addBtn.getBoundingClientRect(), OP_TYPES.map(function(t){
        return {label:t, onPick:function(){ createOperation(t, parent); }};
      }), addBtn, 160);
    });
  }

  /* ---------- Tree: a group's menu (right-click on the row or its sticky head; Del, Ctrl+Shift+G) —
     Ungroup: the operations stay where they are and move one level up, to the group's own parent
     (the part); Delete: the group with all its operations, after a warning (an empty group goes
     at once) ---------- */
  function treeInside(g){ return rows.filter(function(r){ return isUnder(r, g); }); }
  function treeName(r){ var n = r.querySelector('.rlabel span'); return n ? (n.dataset.txt || n.textContent) : ''; }
  // one level less of indent: .tlayer i3 → i2
  function treeOutdent(r){
    var t = r.querySelector('.tlayer'), m = t && /\bi(\d)\b/.exec(t.className);
    if(!m) return;
    t.classList.remove('i' + m[1]);
    if(+m[1] > 1) t.classList.add('i' + (m[1] - 1));
  }
  // rows leave the tree: folds, search and the status panel follow
  function treeDrop(list){
    list.forEach(function(r){ r.remove(); delete collapsed[r.dataset.id]; if(tSearch) delete tSearch.fold[r.dataset.id]; });
    rows = rows.filter(function(r){ return list.indexOf(r) < 0; });
    reindex();
    if(tSearch){ tSearch.hits = tSearch.hits.filter(function(r){ return list.indexOf(r) < 0; }); tSearch.cur = -1; ttCountSync(); }
    renderTree();
    if(stpRow && list.indexOf(stpRow) >= 0) closeStatus();
    else if(stpRow && statusPanel.classList.contains('open')){ stpShow(stpRow); stpFit(); }
  }
  function treeUngroup(g){
    var kids = treeInside(g), name = treeName(g), wasSel = g.classList.contains('tsel');
    kids.forEach(function(r){
      if(r.dataset.parent === g.dataset.id) r.dataset.parent = g.dataset.parent;
      treeOutdent(r);
    });
    treeDrop([g]);
    if(wasSel) (kids[0] || byId[g.dataset.parent]).click();
    emitAction('Ungroup', name, 'GROUP.UNGROUP "' + name + '"');
  }
  function treeDeleteGroup(g){
    var inside = treeInside(g), name = treeName(g);
    var n = inside.filter(function(r){ return r.dataset.type === 'operation'; }).length;
    function go(){
      // the selection moves to the next row of the same level, else the previous one, else the parent
      var sibs = rows.filter(function(r){ return r.dataset.parent === g.dataset.parent; }), i = sibs.indexOf(g);
      var next = sibs[i + 1] || sibs[i - 1] || byId[g.dataset.parent];
      var wasSel = [g].concat(inside).some(function(r){ return r.classList.contains('tsel'); });
      treeDrop([g].concat(inside));
      if(wasSel && next) next.click();
      emitAction('Delete group', name, 'GROUP.DELETE "' + name + '"');
    }
    if(!n){ go(); return; }
    treeConfirm({
      title:'Delete group “' + name + '”?',
      text:n === 1 ? 'The operation in this group will be deleted with it.' : 'All ' + n + ' operations in this group will be deleted with it.',
      ok:'Delete', onOk:go
    });
  }
  // a small alert window over everything: Esc / the veil cancel, Enter takes the focused button
  // (the action), Tab stays inside
  function treeConfirm(o){
    closeMenu();
    var scrim = document.createElement('div'); scrim.className = 'tconf-scrim';
    scrim.innerHTML = '<div class="tconf" role="alertdialog" aria-modal="true" aria-labelledby="tconfT" aria-describedby="tconfD">' +
      '<div class="tconf-t" id="tconfT"></div><div class="tconf-d" id="tconfD"></div>' +
      '<div class="tconf-foot"><button class="tconf-btn" data-a="no">Cancel</button>' +
      '<button class="tconf-btn danger" data-a="ok"></button></div></div>';
    scrim.querySelector('.tconf-t').textContent = o.title;
    scrim.querySelector('.tconf-d').textContent = o.text;
    var ok = scrim.querySelector('[data-a="ok"]'), no = scrim.querySelector('[data-a="no"]');
    ok.textContent = o.ok;
    function close(yes){
      scrim.remove();
      window.removeEventListener('keydown', key, true);
      if(yes) o.onOk();
    }
    // while it is open no shortcut of the page reacts
    function key(e){
      e.stopPropagation();
      if(e.key === 'Escape'){ e.preventDefault(); close(false); }
      else if(e.key === 'Tab'){ e.preventDefault(); (document.activeElement === ok ? no : ok).focus(); }
    }
    scrim.addEventListener('click', function(e){
      e.stopPropagation();
      var b = e.target.closest('[data-a]');
      if(b) close(b.dataset.a === 'ok'); else if(e.target === scrim) close(false);
    });
    window.addEventListener('keydown', key, true);
    document.body.appendChild(scrim);
    ok.focus();
  }
  function groupMenu(g, x, y){
    showMenu({left:x, top:y, bottom:y}, [
      {label:'Ungroup', kbd:'Ctrl+Shift+G', onPick:function(){ treeUngroup(g); }},
      {sep:true},
      {label:'Delete', kbd:'Del', danger:true, onPick:function(){ treeDeleteGroup(g); }}
    ], null, 180);
  }
  tree.addEventListener('contextmenu', function(e){
    var r = e.target.closest('.trow');
    if(!r || r.dataset.type !== 'group') return;
    e.preventDefault();
    if(!r.classList.contains('tsel')) r.click();
    groupMenu(r, e.clientX, e.clientY);
  });
  tSticky.addEventListener('contextmenu', function(e){
    var c = e.target.closest('.tclone'), r = c && byId[c.dataset.for];
    if(!r || r.dataset.type !== 'group') return;
    e.preventDefault();
    if(!r.classList.contains('tsel')) r.click();
    groupMenu(r, e.clientX, e.clientY);
  });
  document.addEventListener('keydown', function(e){
    var t = e.target;
    if(t && (t.isContentEditable || (t.closest && t.closest('input, textarea, select, .su-scrim')))) return;
    var pt = document.querySelector('.panel-tree');
    if(pt.classList.contains('sim') || pt.classList.contains('single')) return;
    var g = tree.querySelector('.trow.tsel');
    if(!g || g.dataset.type !== 'group') return;
    if(e.key === 'Delete' && !e.ctrlKey && !e.altKey && !e.metaKey){ e.preventDefault(); treeDeleteGroup(g); }
    else if((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'g'){ e.preventDefault(); treeUngroup(g); }
  });

  /* ---------- Toolbar: the left button toggles the Sort row ---------- */
  var arrangeBtn = document.querySelector('.b24.arrange');
  var dockEl = document.querySelector('.dock');
  var sortRow = document.getElementById('sortRow');
  if(arrangeBtn && sortRow){
    arrangeBtn.addEventListener('click', function(e){
      e.stopPropagation();
      sortRow.hidden = !sortRow.hidden;
      arrangeBtn.classList.toggle('on', !sortRow.hidden);
    });
  }

  /* Sort dropdown (witness: updates the label) + Approach/Return Auto toggle */
  var srSort = document.getElementById('srSort'), srVal = document.getElementById('srVal');
  var SORTS = ['Program order','Name','Tool','Status'];
  var sortCur = 'Program order';
  if(srSort){
    srSort.addEventListener('click', function(e){
      e.stopPropagation();
      showMenu(srSort.getBoundingClientRect(), SORTS.map(function(sv){
        return {label:sv, cur:sv===sortCur, onPick:function(){
          sortCur = sv;
          srVal.textContent = sv==='Program order' ? 'Sort' : 'Sort: ' + sv;
        }};
      }), srSort, 150);
    });
  }
  var srAuto = document.getElementById('srAuto');
  if(srAuto) srAuto.addEventListener('click', function(e){ e.stopPropagation(); srAuto.classList.toggle('on'); });
  // links between status circles = Approach/Return in Auto; the red-cross button drops them
  tree.classList.add('linked');
  var srBtns = document.querySelectorAll('#sortRow .sr-btn');
  var srReset = srBtns[srBtns.length-1];
  if(srReset) srReset.addEventListener('click', function(e){
    e.stopPropagation();
    tree.classList.remove('linked');
  });

  /* ---------- Tree halves divider: drag to resize name | facts columns ---------- */
  var treewrap = document.getElementById('treewrap');
  var treeSplit = document.getElementById('treeSplit');
  if(treewrap && treeSplit){
    treeSplit.addEventListener('mousedown', function(e){
      e.preventDefault();
      treewrap.classList.add('splitting');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      function onMove(ev){
        var r = treewrap.getBoundingClientRect();
        var f = Math.max(0.25, Math.min(0.7, (ev.clientX - r.left) / r.width));
        treewrap.style.setProperty('--tree-split', (f * 100).toFixed(1) + '%');
      }
      function onUp(){
        treewrap.classList.remove('splitting');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ---------- Inspector divider: drag to resize label | control columns (as the tree's) ---------- */
  var iwrap = document.getElementById('iwrap'), inspSplit = document.getElementById('inspSplit');
  if(iwrap && inspSplit){
    inspSplit.addEventListener('mousedown', function(e){
      e.preventDefault();
      iwrap.classList.add('splitting');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      function onMove(ev){
        var r = iwrap.getBoundingClientRect();
        var f = Math.max(0.3, Math.min(0.7, (ev.clientX - r.left) / r.width));
        iwrap.style.setProperty('--insp-split', (f * 100).toFixed(1) + '%');
      }
      function onUp(){
        iwrap.classList.remove('splitting');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ---------- Panel width: the grip on the dock's right edge sets --dock-w — the tree panel, and
     the inspector while it sits under the tree. Out of the dock (next to the tree or at the right
     edge) the inspector has its own width, --insp-w, set by its own grip on the edge facing the
     view; the two never move each other. Columns are shares of the width, so they stretch with
     the panel. Both kept across sessions ---------- */
  var dockWidth = document.getElementById('dockWidth'), inspWidth = document.getElementById('inspWidth');
  var wsEl = document.querySelector('.workspace');
  var DOCK_W_MIN = 300, DOCK_W_MAX = 600;
  function inspOut(){ return wsEl.dataset.insp === 'side' || wsEl.dataset.insp === 'right'; }
  function px(name){ return parseFloat(getComputedStyle(wsEl).getPropertyValue(name)) || DOCK_W_MIN; }
  // each panel keeps the 3D view at least 240px wide next to whatever else is across
  function dockW(w){
    var vw = wsEl.clientWidth;
    var max = Math.min(DOCK_W_MAX, inspOut() ? vw - px('--insp-w') - 240 - 24 : vw - 240 - 16);
    w = Math.round(Math.max(DOCK_W_MIN, Math.min(max, w)));
    wsEl.style.setProperty('--dock-w', w + 'px');
    return w;
  }
  function inspW(w){
    var max = Math.min(DOCK_W_MAX, wsEl.clientWidth - px('--dock-w') - 240 - 24);
    w = Math.round(Math.max(DOCK_W_MIN, Math.min(max, w)));
    wsEl.style.setProperty('--insp-w', w + 'px');
    return w;
  }
  try {
    var savedW = +localStorage.getItem('ency.dockW'); if(savedW) dockW(savedW);
    // no inspector width yet: it starts as wide as the tree, as before
    wsEl.style.setProperty('--insp-w', Math.round(+localStorage.getItem('ency.inspW') || px('--dock-w')) + 'px');
  } catch(e){}
  // one drag for both grips: dir +1 grows with the pointer going right, -1 going left
  var panelWRaf = 0;
  function widthGrip(grip, set, key, cur, dir){
    if(!grip) return;
    grip.addEventListener('mousedown', function(e){
      e.preventDefault();
      grip.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      var x0 = e.clientX, w0 = cur(), w = w0, d = dir();
      function onMove(ev){
        w = set(w0 + d * (ev.clientX - x0));
        // what is placed by script (the calc bar, the toolpath view, open panels) follows once a frame
        if(!panelWRaf) panelWRaf = requestAnimationFrame(function(){ panelWRaf = 0; window.dispatchEvent(new Event('resize')); });
      }
      function onUp(){
        grip.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        try { localStorage.setItem(key, w); } catch(err){}
        window.dispatchEvent(new Event('resize'));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
  if(wsEl){
    widthGrip(dockWidth, dockW, 'ency.dockW', function(){ return dockEl.offsetWidth; }, function(){ return 1; });
    // at the window's right edge the grip is on the inspector's left edge: dragging left widens it
    widthGrip(inspWidth, inspW, 'ency.inspW', function(){ return px('--insp-w'); },
      function(){ return wsEl.dataset.insp === 'right' ? -1 : 1; });
  }

  /* ---------- Simulate tab: code tree + the simulation bar on the 3D view ---------- */
  /* per-operation posted code; shared groups (Header/Approach) expand in place */
  /* stress-test program: 100 generated operations (deterministic, no RNG) */
  var SIM_OP_KINDS = ['Lathe facing', 'OD roughing', 'OD finishing', 'OD grooving',
    'ID drilling', 'ID boring', 'Thread turning', 'Face milling', 'Pocket milling',
    'Contour milling', 'Hole drilling', 'Chamfering', 'Parting off'];
  var SIM_COLORS = ['#ebda84', '#9584eb', '#84c9eb', '#ff7072', '#7bd8a8',
    '#e8a06c', '#c98fe0', '#8fb7e8'];
  var SIM_TOOL_POOL = [
    'CNMG 12 04 08-WF/DCLNR 2020K-12', 'N123G2-0300-0002-CM/RF123G079',
    'DNMX 15 04 04-WF/DDJNR 2020K-15', 'SCD 080-044-080 AP5',
    'CCMT 09 T3 04-PF/A20S-SCLCR 09', '266RG-16MM01A150M/266RFA-2525-16',
    'R390-020A20-11L/R390-11 T3 08M-PM', '860.1-0500-015A1-PM'];
  function simMakeLines(name, toolNo){
    return [
      { t:'PPFUN: 58, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' },
      { t:'Header', grp:[ 'COMMENT: "' + name + '"', 'LOADTL: #' + toolNo + ' (0), H#-' + toolNo + ', D#' + toolNo,
        'SPINDL: On, ' + (160 + toolNo * 20) + ' rpm' ] },
      { t:'Approach', grp:[ 'RAPID: 10000', 'MultiGOTO: X64.2, Y0, Z96.4' ] },
      { t:'RAPID: 10000', c:'red' },
      { t:'X41.5, Y0, Z1.2', c:'red' },
      { t:'F: WORK 0.35mm/rev.', c:'blue' },
      { t:'X-0.297, Y0, Z1.2', c:'blue' },
      { t:'X2.362, Y0, Z2.659', c:'blue' },
      { t:'PPFUN: 59, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' } ];
  }
  var SIM_N = 100;
  var SIM_OPS = [];
  (function(){
    var toolNo = 1, kindIdx = 0;
    for(var i = 0; i < SIM_N; i++){
      // the same tool serves 2-4 consecutive operations
      if(i > 0 && (i * 7) % 3 === 0) toolNo = (toolNo % 8) + 1;
      var kind = SIM_OP_KINDS[(i * 5) % SIM_OP_KINDS.length];
      SIM_OPS.push({
        name: (i + 1) + '. ' + kind,
        color: SIM_COLORS[i % SIM_COLORS.length],
        open: i === 0,
        toolNo: toolNo,
        lines: simMakeLines(kind, toolNo)
      });
    }
  })();
  var simWrap = document.getElementById('simWrap');
  var simTree = document.getElementById('simTree');
  var simBar = document.getElementById('simBar');
  var simGrpOpen = {}; // "opIdx:lineIdx" → true

  // map collision times to their op/line so the code tree can flag them
  function simCollLines(){
    var m = {};
    if(!collDetOn) return m;
    SIM_COLLISIONS.forEach(function(t){
      var s = 0, oi = 0;
      for(var i = 0; i < SIM_DURS.length; i++){ if(t < s + SIM_DURS[i]){ oi = i; break; } s += SIM_DURS[i]; }
      var n = SIM_OPS[oi].lines.length;
      var li = Math.min(n - 1, Math.floor((t - s) / SIM_DURS[oi] * n));
      m[oi + ':' + li] = true;
    });
    return m;
  }
  function simRender(){
    var errLines = simCollLines();
    var h = '';
    h += '<div class="simrow"><img class="micn" src="assets/tree-machine.svg" alt="">'+
      '<span class="lbl">Lathe-Milling machine</span>'+
      '<span class="bicn"><img class="i16" src="assets/status.svg" alt=""></span></div>';
    h += '<div class="simrow sim-ind1"><img class="micn" src="assets/f-part.svg" alt="">'+
      '<span class="lbl">Part</span>'+
      '<span class="bicn"><img class="i16" src="assets/status.svg" alt=""></span></div>';
    SIM_OPS.forEach(function(op, oi){
      // an operation with a collision in its code carries the error status
      var opErr = op.lines.some(function(ln, li){ return errLines[oi + ':' + li]; });
      // a single highlight follows the playhead: the op row carries it only
      // while its code is collapsed; open ops highlight the code line instead
      h += '<div class="simrow op sim-ind2'+(op.open ? '' : ' closed')+(oi === simSel && (!op.open || simLine < 0) ? ' ssel' : '')+(opErr ? ' has-err' : '')+'" data-simop="'+oi+'">'+
        '<img class="shev" src="assets/t-shev-open.svg" alt="">'+
        '<span class="opic"></span>'+
        '<span class="lbl">'+op.name+'</span>'+
        '<span class="sim-ring" style="--cc:'+op.color+'"></span>'+
        '<span class="bicn"><img class="i16" src="assets/'+(opErr ? 'status-error' : 'status')+'.svg" alt=""></span></div>';
      if(op.open){
        op.lines.forEach(function(ln, li){
          var isCur = oi === simSel && li === simLine;
          // the collision block shows the status-error icon instead of the dot
          var dot = errLines[oi + ':' + li]
            ? '<span class="bicn" title="Holder collision"><img class="i16" src="assets/status-error.svg" alt=""></span>'
            : '<span class="sim-dot"></span>';
          if(ln.grp){
            var key = oi + ':' + li, on = simGrpOpen[key];
            h += '<div class="simrow grp sim-ind3'+(on ? '' : ' closed')+(isCur ? ' cur' : '')+'" data-simgrp="'+key+'">'+
              '<img class="shev" src="assets/t-shev-open.svg" alt="">'+
              '<span class="lbl">'+ln.t+'</span>'+dot+'</div>';
            if(on) ln.grp.forEach(function(s){
              h += '<div class="simrow code sim-ind4" data-simgrp="'+key+'"><span class="lbl">'+s+'</span><span class="sim-dot"></span></div>';
            });
          } else {
            h += '<div class="simrow code sim-ind3'+(ln.c ? ' c-'+ln.c : '')+(isCur ? ' cur' : '')+'" data-simop="'+oi+'" data-simline="'+li+'">'+
              '<span class="lbl">'+ln.t+'</span>'+dot+'</div>';
          }
        });
      }
    });
    simTree.innerHTML = h;
  }
  // scope buttons are ACTIONS, always enabled: click = instant simulation
  // of the range (no 3D playback) — the progress bar jumps to the result
  var simSel = 0; // selected operation index in the sim tree
  document.getElementById('simBar').addEventListener('click', function(e){
    var b = e.target.closest('[data-scope]');
    if(!b) return;
    // instant simulation of the range — no 3D playback, so just stop any
    simPause();
  });
  // expand/collapse the whole code tree (operations and their groups)
  document.getElementById('simExpand').addEventListener('click', function(){
    SIM_OPS.forEach(function(op, oi){
      op.open = true;
      op.lines.forEach(function(ln, li){ if(ln.grp) simGrpOpen[oi + ':' + li] = true; });
    });
    simRender();
  });
  document.getElementById('simCollapse').addEventListener('click', function(){
    SIM_OPS.forEach(function(op){ op.open = false; });
    simGrpOpen = {};
    simRender();
  });
  // the operation Status panel from the sim tree: same panel as on the
  // Machining tab; a collision in the op's code marks the holder check red
  function simOpStatus(oi, row){
    // the status circle opens the NC block panel on the collision block of
    // the operation (or its first block when the op is clean)
    var errLines = simCollLines(), li = 0;
    SIM_OPS[oi].lines.forEach(function(ln, i){ if(errLines[oi + ':' + i] && !li) li = i; });
    SIM_OPS[oi].open = true;
    ncShow(oi, li, row);
  }
  simTree.addEventListener('click', function(e){
    // every row is equally selectable; chevrons only expand/collapse
    var shev = e.target.closest('.shev');
    var g = e.target.closest('[data-simgrp]');
    if(g){
      if(shev){ simGrpOpen[g.dataset.simgrp] = !simGrpOpen[g.dataset.simgrp]; simRender(); return; }
      var gp = g.dataset.simgrp.split(':');
      simSel = +gp[0]; simLine = +gp[1]; simRender(); ncFollow(); return;
    }
    var op = e.target.closest('.simrow.op[data-simop]');
    if(op){
      var oi = +op.dataset.simop;
      if(shev){ SIM_OPS[oi].open = !SIM_OPS[oi].open; simRender(); return; }
      if(e.target.closest('.bicn')){ simOpStatus(oi, op); return; } // status circle → Status panel
      simSel = oi; simLine = -1;           // the scope buttons act on this selection
      simRender(); ncFollow(); return;
    }
    var code = e.target.closest('.simrow.code[data-simline]');
    if(code){ simSel = +code.dataset.simop; simLine = +code.dataset.simline; simRender(); ncFollow(); return; }
    var row = e.target.closest('.simrow');  // machine / part / group sub-lines
    if(row){
      simTree.querySelectorAll('.simrow.cur, .simrow.ssel').forEach(function(x){ x.classList.remove('cur','ssel'); });
      row.classList.add('cur');
    }
  });

  /* ---- the control bar: SPEED strip + reset / back / play / forward ----
     The strip sets the simulation speed by hand. Zooming into the 3D view
     auto-caps the speed at 25%; the hand-set value stays as ghost ticks and
     comes back as soon as the zoom returns. */
  var SIM_ZOOM_CAP = 25;    // % — auto-cap while zoomed in
  var SIM_SPEED_MAX = 200;  // % — the strip goes up to double speed
  var simSpeedUser = 50;    // the hand-set speed, %
  var simZoomed = false;    // zoomed in → the cap is active
  var simPlaying = false;
  var vpZoom = 1;
  var simSpeed = document.getElementById('simSpeed');
  var ssFill = document.getElementById('ssFill'), ssKnob = document.getElementById('ssKnob');
  var ssGhost = document.getElementById('ssGhost'), ssTip = document.getElementById('ssTip');
  function simEffSpeed(){ return simZoomed ? Math.min(simSpeedUser, SIM_ZOOM_CAP) : simSpeedUser; }
  function simSync(){
    var eff = simEffSpeed(), capped = simZoomed && simSpeedUser > SIM_ZOOM_CAP;
    // strip position maps 0..SIM_SPEED_MAX onto 0..100% of the track
    ssFill.style.width = (eff / SIM_SPEED_MAX * 100) + '%';
    ssKnob.style.left = (eff / SIM_SPEED_MAX * 100) + '%';
    ssTip.textContent = capped ? eff + '% · zoom' : eff + '%';
    ssGhost.hidden = !capped;
    ssGhost.style.left = (simSpeedUser / SIM_SPEED_MAX * 100) + '%';
    simSpeed.classList.toggle('capped', capped);
    var ssVal = document.getElementById('ssVal');
    if(ssVal){ ssVal.textContent = eff + '%'; ssVal.style.color = capped ? '#ebc14a' : ''; }
    simSpeed.title = 'Simulation speed: ' + eff + '%'
      + (capped ? ' (hand-set ' + simSpeedUser + '% returns after zoom out)' : '');
    simBar.classList.toggle('playing', simPlaying);
    simWrap.classList.toggle('playing', simPlaying);
    // the compact in-panel slider mirrors the same speed, cap and ghost
    var sdF = document.getElementById('sdFill'), sdK = document.getElementById('sdKnob');
    var sdG = document.getElementById('sdGhost');
    if(sdF){
      sdF.style.width = (eff / SIM_SPEED_MAX * 100) + '%';
      sdK.style.left = (eff / SIM_SPEED_MAX * 100) + '%';
      sdG.hidden = !capped;
      sdG.style.left = (simSpeedUser / SIM_SPEED_MAX * 100) + '%';
    }
    // …and so does the NC block panel slider
    var ncF = document.getElementById('ncFill');
    if(ncF){
      ncF.style.width = (eff / SIM_SPEED_MAX * 100) + '%';
      document.getElementById('ncKnob').style.left = (eff / SIM_SPEED_MAX * 100) + '%';
      var ncG = document.getElementById('ncGhost');
      ncG.hidden = !capped; ncG.style.left = (simSpeedUser / SIM_SPEED_MAX * 100) + '%';
      var ncV = document.getElementById('ncVal');
      ncV.textContent = eff + '%'; ncV.style.color = capped ? '#ebc14a' : '';
      document.getElementById('ncPanel').classList.toggle('playing', simPlaying && simBlockEnd != null);
    }
  }
  // click or drag sets the hand speed; detents snap at the round values
  simSpeed.addEventListener('pointerdown', function(e){
    e.preventDefault();
    simSpeed.classList.add('dragging');
    simSpeed.setPointerCapture(e.pointerId);
    var set = function(ev){
      var r = simSpeed.getBoundingClientRect();
      var v = Math.max(5, Math.min(SIM_SPEED_MAX,
        Math.round((ev.clientX - r.left) / r.width * SIM_SPEED_MAX)));
      [25, 50, 75, 100, 150, 200].forEach(function(d){ if(Math.abs(v - d) < 8) v = d; });
      simSpeedUser = v;
      simSync();
    };
    set(e);
    var move = function(ev){ set(ev); };
    var up = function(){
      simSpeed.classList.remove('dragging');
      simSpeed.removeEventListener('pointermove', move);
      simSpeed.removeEventListener('pointerup', up);
    };
    simSpeed.addEventListener('pointermove', move);
    simSpeed.addEventListener('pointerup', up);
  });
  // zoom hook: the wheel over the 3D view stands in for camera zoom —
  // zooming in engages the 25% cap, zooming back restores the hand speed
  document.querySelector('.viewport').addEventListener('wheel', function(e){
    if(simWrap.hidden) return; // active in both full and compact sim modes
    e.preventDefault();
    vpZoom = Math.max(0.5, Math.min(4, vpZoom * (e.deltaY < 0 ? 1.12 : 0.9)));
    simZoomed = vpZoom > 1.15;
    simSync();
  }, {passive:false});
  /* ---- editor timeline + transport, stop conditions and status ---- */
  // durations 18-88 s per op, deterministic spread
  var SIM_DURS = SIM_OPS.map(function(op, i){ return 18 + ((i * 37) % 71); });
  var SIM_TOTAL = SIM_DURS.reduce(function(a, b){ return a + b; }, 0);
  var SIM_TOOLS = SIM_OPS.map(function(op){ return 'T#' + op.toolNo; });
  var SIM_TOOLNAMES = SIM_OPS.map(function(op){ return SIM_TOOL_POOL[op.toolNo - 1]; });
  var SIM_BASE_RATE = 120;          // simulated seconds per real second at 100%
  function simOpStart(i){ var s = 0; for(var k = 0; k < i; k++) s += SIM_DURS[k]; return s; }
  // collisions in roughly every 8th operation, some ops get two
  var SIM_COLLISIONS = [];
  SIM_OPS.forEach(function(op, i){
    if(i % 8 === 3) SIM_COLLISIONS.push(simOpStart(i) + SIM_DURS[i] * 0.4);
    if(i % 24 === 11) SIM_COLLISIONS.push(simOpStart(i) + SIM_DURS[i] * 0.75);
  });
  SIM_COLLISIONS.sort(function(a, b){ return a - b; });
  var SIM_KEYPOINTS = [8];
  // tool changes happen where the next op takes a different tool
  var SIM_TOOLCHANGES = [];
  for(var ti = 1; ti < SIM_TOOLS.length; ti++)
    if(SIM_TOOLS[ti] !== SIM_TOOLS[ti - 1]) SIM_TOOLCHANGES.push(simOpStart(ti));
  // three setups across the 100 operations
  var SIM_SETUPS = [ {name:'Setup 1', op:0}, {name:'Setup 2', op:40}, {name:'Setup 3', op:74} ];
  var simStopCfg = { collision:true, gouge:false, opt:false, end:false };
  var SIM_EVENTS = SIM_COLLISIONS.map(function(t){ return {t:t, type:'collision'}; })
    .concat(SIM_TOOLCHANGES.map(function(t){ return {t:t, type:'tool'}; }))
    .concat(SIM_KEYPOINTS.map(function(t){ return {t:t, type:'key'}; }))
    .sort(function(a, b){ return a.t - b.t; });

  var simT = 0, simRAF = null, simLast = 0, simLine = -1;
  var simTlWrap = document.getElementById('simTlWrap');
  var simTl = document.getElementById('simTl');
  var simTime = document.getElementById('simTime');
  var simFmt = function(s){
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  (function(){
    // ruler ticks: pick a step that keeps the tick count sane on long programs
    var step = SIM_TOTAL > 3600 ? 600 : SIM_TOTAL > 1200 ? 300 : 60;
    var rh = '';
    for(var t = step; t < SIM_TOTAL; t += step)
      rh += '<i style="left:' + (t / SIM_TOTAL * 100) + '%"></i>';
    document.getElementById('tlRuler').innerHTML = rh;
    // track: clips + event markers + the playhead with a timecode tip
    var h = '';
    SIM_OPS.forEach(function(op, i){
      h += '<div class="clip" style="--cc:' + op.color + ';flex:' + SIM_DURS[i] + '"' +
        ' title="' + op.name + ' · ' + simFmt(SIM_DURS[i]) + '"><span>' + op.name + '</span></div>';
    });
    // on long programs the diamond glyph does not fit — draw plain red ticks
    var collTick = SIM_OPS.length > 24 ? ' tick' : '';
    SIM_COLLISIONS.forEach(function(t){
      h += '<i class="tl-mark tl-mark--coll' + collTick + '" style="left:' + (t / SIM_TOTAL * 100) + '%" title="Collision · ' + simFmt(t) + '"></i>';
    });
    // a vertical bar marks the start of each setup
    SIM_SETUPS.forEach(function(su){
      var t = simOpStart(su.op);
      h += '<i class="tl-mark tl-mark--setup" style="left:' + (t / SIM_TOTAL * 100) + '%" title="' + su.name + ' · ' + simFmt(t) + '"></i>';
    });
    h += '<div class="ph"><span class="ph-tip" id="phTip">0:00</span></div>';
    simTl.innerHTML = h;
  })();

  function simCurOp(){
    var s = 0;
    for(var i = 0; i < SIM_DURS.length; i++){ s += SIM_DURS[i]; if(simT < s) return i; }
    return SIM_DURS.length - 1;
  }
  var sbOp = document.getElementById('sbOp');
  function simTlSync(){
    var clips = simTl.querySelectorAll('.clip');
    var cur = simCurOp(), s = 0;
    for(var i = 0; i < clips.length; i++){
      clips[i].classList.toggle('cur', i === cur);
      clips[i].classList.toggle('done', simT >= s + SIM_DURS[i]);
      s += SIM_DURS[i];
    }
    var ph = simTl.querySelector('.ph');
    ph.style.left = (simT / SIM_TOTAL * 100) + '%';
    var atColl = collDetOn && SIM_COLLISIONS.some(function(t){ return Math.abs(t - simT) < 0.3; });
    ph.classList.toggle('atcoll', atColl);
    simTl.classList.toggle('atcoll', atColl);
    // collision nav buttons: disabled at the ends (no wrap)
    var hasNext = SIM_COLLISIONS.some(function(t){ return t > simT + 0.5; });
    var hasPrev = SIM_COLLISIONS.some(function(t){ return t < simT - 0.5; });
    document.getElementById('simCollNext').classList.toggle('disabled', !hasNext);
    document.getElementById('simCollPrev').classList.toggle('disabled', !hasPrev);
    document.getElementById('sdCollNext').classList.toggle('disabled', !hasNext);
    document.getElementById('sdCollPrev').classList.toggle('disabled', !hasPrev);
    document.getElementById('phTip').textContent = simFmt(simT);
    simTime.textContent = simFmt(simT) + ' / ' + simFmt(SIM_TOTAL);
    // status chip: colored ring + operation name + tool number
    sbOp.querySelector('.sb-op__ring').style.setProperty('--cc', SIM_OPS[cur].color);
    sbOp.querySelector('.sb-op__name').textContent = SIM_OPS[cur].name;
    sbOp.querySelector('.sb-op__tno').textContent = SIM_TOOLS[cur];
    sbOp.querySelector('.sb-op__tname').textContent = SIM_TOOLNAMES[cur];
    // the code tree follows the playhead down to the code line
    var n = SIM_OPS[cur].lines.length;
    var li = Math.min(n - 1, Math.floor((simT - simOpStart(cur)) / SIM_DURS[cur] * n));
    if(cur !== simSel || li !== simLine){
      simSel = cur; simLine = li;
      SIM_OPS[cur].open = true; // the playhead position always shows its code line
      if(!simWrap.hidden){
        simRender();
        var row = simTree.querySelector('.simrow.cur');
        if(row) row.scrollIntoView({block:'nearest'});
      }
      ncSync();
    }
  }
  function simTick(ts){
    if(!simPlaying){ simRAF = null; return; }
    var dt = simLast ? (ts - simLast) / 1000 : 0;
    simLast = ts;
    var prev = simT;
    var next = Math.min(SIM_TOTAL, simT + dt * SIM_BASE_RATE * (simEffSpeed() / 100));
    // stop conditions: pause exactly on the first enabled event we cross
    for(var i = 0; i < SIM_EVENTS.length; i++){
      var ev = SIM_EVENTS[i];
      if(ev.t > prev && ev.t <= next && simStopCfg[ev.type] &&
         (ev.type !== 'collision' || collDetOn)){
        next = ev.t; simPlaying = false; break;
      }
    }
    // single-block playback (NC block panel) ends at the block boundary
    if(simBlockEnd != null && next >= simBlockEnd){ next = simBlockEnd; simPlaying = false; }
    simT = next;
    if(simT >= SIM_TOTAL) simPlaying = false;
    if(!simPlaying) simBlockEnd = null;
    simTlSync();
    simSync();
    if(simPlaying) simRAF = requestAnimationFrame(simTick);
    else { simRAF = null; simLast = 0; }
  }
  function simPause(){ simPlaying = false; simBlockEnd = null; simLast = 0; simSync(); }
  function simSeek(t){
    simT = Math.max(0, Math.min(SIM_TOTAL, t));
    simTlSync();
  }
  // click / drag on the track scrubs the playhead
  simTl.addEventListener('pointerdown', function(e){
    e.preventDefault();
    simTlWrap.classList.add('scrubbing');
    simTl.setPointerCapture(e.pointerId);
    var set = function(ev){
      var r = simTl.getBoundingClientRect();
      simSeek((ev.clientX - r.left) / r.width * SIM_TOTAL);
    };
    set(e);
    var move = function(ev){ set(ev); };
    var up = function(){
      simTlWrap.classList.remove('scrubbing');
      simTl.removeEventListener('pointermove', move);
      simTl.removeEventListener('pointerup', up);
    };
    simTl.addEventListener('pointermove', move);
    simTl.addEventListener('pointerup', up);
  });

  /* transport */
  document.getElementById('simPlay').addEventListener('click', function(){
    if(simPlaying){ simPause(); return; }
    simRan = true; simBlockEnd = null;
    if(simT >= SIM_TOTAL) simT = 0;
    simPlaying = true; simLast = 0;
    simSync();
    if(!simRAF) simRAF = requestAnimationFrame(simTick);
  });
  // to the start of the current op; pressed again — the previous op
  // reset: back to the very start of the program (also the machine anchor)
  function simReset(){ simPause(); simSeek(0); }
  document.getElementById('simReset').addEventListener('click', simReset);
  document.getElementById('tlMach').addEventListener('click', simReset);
  document.getElementById('simToStart').addEventListener('click', function(){
    var i = simCurOp(), st = simOpStart(i);
    simSeek(simT - st > 2 ? st : simOpStart(Math.max(0, i - 1)));
  });
  document.getElementById('simToNext').addEventListener('click', function(){
    var i = simCurOp();
    simSeek(i + 1 < SIM_DURS.length ? simOpStart(i + 1) : SIM_TOTAL);
  });
  // single-step by code line: the tree highlight walks the posted code
  function simStepLine(dir){
    simPause();
    var cur = simCurOp(), n = SIM_OPS[cur].lines.length;
    var li = simLine + dir;
    if(li >= n){ if(cur + 1 < SIM_DURS.length) simSeek(simOpStart(cur + 1) + 0.01); return; }
    if(li < 0){
      if(cur === 0){ simSeek(0); return; }
      var p = cur - 1, pn = SIM_OPS[p].lines.length;
      simSeek(simOpStart(p) + (pn - 0.5) / pn * SIM_DURS[p]);
      return;
    }
    simSeek(simOpStart(cur) + (li + 0.5) / n * SIM_DURS[cur]);
  }
  document.getElementById('simStepF').addEventListener('click', function(){ simStepLine(1); });
  document.getElementById('simStepB').addEventListener('click', function(){ simStepLine(-1); });

  /* ---- NC block panel: the code-line tooltip grown into a proper window ----
     Opens on a code-line double-click or a click on its dot; while open it
     follows the highlighted line. Its transport acts on the block only. */
  var ncPanel = document.getElementById('ncPanel');
  var ncOpen = false;
  function ncFmt(v){ return (v < 0 ? '−' : '') + Math.abs(v).toFixed(3); }
  function ncGrid(el, keys, vals){
    var h = '';
    keys.forEach(function(k, i){ h += '<div class="ncp-cell"><b>' + k + '</b><span>' + ncFmt(vals[i]) + '</span></div>'; });
    el.innerHTML = h;
  }
  // deterministic block numbers derived from the op and line indices
  function ncData(oi, li){
    var s = oi * 131 + li * 17, ln = SIM_OPS[oi].lines[li];
    var f = function(k, a, b){ var x = Math.sin(s * 0.7 + k * 1.3) * 0.5 + 0.5; return a + (b - a) * x; };
    var rapid = ln.c === 'red', work = ln.c === 'blue';
    return {
      type: /^MultiARC|^X-?\d.*Z.*\d$/.test(ln.t) && li % 2 ? 'MultiARC' : (/^F:|^RAPID/.test(ln.t) ? 'Feed' : 'MultiGOTO'),
      move: rapid ? 'Rapid' : (work ? 'Work' : 'Auxiliary'),
      ep: [f(1,-60,60), f(2,-4,4), f(3,20,150), f(4,120,160), f(5,-50,-30), f(6,20,30)],
      mp: [f(7,-60,60), f(8,-4,4), f(9,100,140), f(10,140,160), f(11,-45,-35), f(12,15,25)],
      ax: [f(13,-10,10), f(14,-80,-70), f(15,110,130), f(16,70,85), f(17,40,55), f(18,-150,-140)],
      time: SIM_DURS[oi] / SIM_OPS[oi].lines.length,
      feed: rapid ? '10000 mm/min' : (work ? '200 mm/min' : '—'),
      len: rapid ? f(19,0.05,0.4) : (work ? f(20,0.002,0.06) : 0),
      no: 100 + oi * 240 + li * 12
    };
  }
  function ncBlockRange(oi, li){
    var n = SIM_OPS[oi].lines.length, d = SIM_DURS[oi], st = simOpStart(oi);
    return { a: st + li / n * d, b: st + (li + 1) / n * d };
  }
  function ncSync(){
    if(!ncOpen) return;
    if(ncEditing) ncSetEdit(false); // moving to another block drops edit mode
    var oi = simSel, li = simLine;
    if(li < 0 || oi < 0){ li = 0; }
    var ln = SIM_OPS[oi].lines[li], d = ncData(oi, li);
    var t = ln.t.length > 34 ? ln.t.slice(0, 34) + '…' : ln.t;
    document.getElementById('ncTitle').textContent = t;
    document.getElementById('ncTitle').title = ln.t;
    var op = document.getElementById('ncOp');
    op.querySelector('span:last-child').textContent = SIM_OPS[oi].name + ' · ' + SIM_TOOLS[oi];
    var mv = document.getElementById('ncMove');
    mv.textContent = d.type + ' · ' + d.move;
    mv.className = 'ncp-move' + (ln.c ? ' c-' + ln.c : '');
    ncGrid(document.getElementById('ncEP'), ['X','Y','Z','RX','RY','RZ'], d.ep);
    ncGrid(document.getElementById('ncMP'), ['X','Y','Z','RX','RY','RZ'], d.mp);
    ncGrid(document.getElementById('ncAX'), ['A1','A2','A3','A4','A5','A6'], d.ax);
    var sec = Math.round(d.time);
    document.getElementById('ncTime').textContent = '00:' + String(Math.floor(sec / 60)).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0');
    document.getElementById('ncFeed').textContent = d.feed;
    document.getElementById('ncLen').textContent = d.len.toFixed(3) + ' m';
    document.getElementById('ncNo').textContent = d.no;
    var isErr = !!simCollLines()[oi + ':' + li];
    document.getElementById('ncErr').hidden = !isErr;
    ncPanel.classList.toggle('has-err', isErr);
    ncPanel.classList.toggle('playing', simPlaying && simBlockEnd != null);
  }
  // arrow keys walk the blocks while the panel is open (or the sim tab is up)
  document.addEventListener('keydown', function(e){
    if(e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if(simWrap.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.preventDefault();
    if(simLine < 0) simLine = e.key === 'ArrowDown' ? -1 : 0;
    simStepLine(e.key === 'ArrowDown' ? 1 : -1);
    ncSync();
  });
  function ncShow(oi, li, row){
    // the playhead lands on the block so the transport and arrows act on it
    simPause(); simSeek(ncBlockRange(oi, li).a + 0.01);
    simSel = oi; simLine = li;
    ncOpen = true;
    ncPanel.classList.add('open');
    closeStatus();
    simRender(); ncSync();
    var vp = ncPanel.parentElement.getBoundingClientRect();
    var rr = (row || simTree.querySelector('.simrow.cur') || simTree).getBoundingClientRect();
    var top = Math.max(8, Math.min(rr.top - vp.top, vp.height - ncPanel.offsetHeight - 8));
    ncPanel.style.top = top + 'px';
  }
  function ncClose(){ ncOpen = false; ncPanel.classList.remove('open'); }
  // an open panel follows any mouse selection in the tree: the playhead
  // moves to the picked block (first block of a picked operation)
  function ncFollow(){
    if(!ncOpen) return;
    var oi = simSel, li = Math.max(0, simLine);
    simPause(); simSeek(ncBlockRange(oi, li).a + 0.01);
    simSel = oi; simLine = li;
    ncSync();
  }
  document.getElementById('ncClose').addEventListener('click', function(e){ e.stopPropagation(); ncClose(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') ncClose(); });
  // any code-level row maps to a block: plain lines, Header/Approach groups
  // and the sub-lines inside them (they share the group's block)
  function ncRowBlock(el){
    var row = el.closest('.simrow.code[data-simline], .simrow.grp[data-simgrp], .simrow.sim-ind4[data-simgrp]');
    if(!row) return null;
    if(row.dataset.simgrp){ var p = row.dataset.simgrp.split(':'); return {oi:+p[0], li:+p[1], row:row}; }
    return {oi:+row.dataset.simop, li:+row.dataset.simline, row:row};
  }
  simTree.addEventListener('dblclick', function(e){
    var b = ncRowBlock(e.target);
    if(b) ncShow(b.oi, b.li, b.row);
  });
  simTree.addEventListener('click', function(e){
    var dot = e.target.closest('.sim-dot, .bicn');
    var b = dot && ncRowBlock(e.target);
    if(b) ncShow(b.oi, b.li, b.row);
  });
  // block transport: start / end of the block, neighbours, play the block only
  var simBlockEnd = null; // playback stops here when playing a single block
  // edit mode: the value cells become editable until the pencil is pressed again
  var ncEditing = false;
  function ncSetEdit(on){
    ncEditing = on;
    ncPanel.classList.toggle('editing', on);
    document.getElementById('ncEdit').classList.toggle('on', on);
    ncPanel.querySelectorAll('.ncp-cell span').forEach(function(s){
      s.contentEditable = on ? 'true' : 'false';
      s.spellcheck = false;
    });
    if(on){ var f = ncPanel.querySelector('.ncp-cell span'); if(f){ f.focus(); } }
  }
  document.getElementById('ncEdit').addEventListener('click', function(){ ncSetEdit(!ncEditing); });
  ncPanel.addEventListener('keydown', function(e){
    if(!ncEditing) return;
    e.stopPropagation(); // arrows/Esc stay inside the cell while editing
    if(e.key === 'Enter'){ e.preventDefault(); e.target.blur(); }
    if(e.key === 'Escape'){ ncSetEdit(false); }
  });
  document.getElementById('ncPrev').addEventListener('click', function(){ simStepLine(-1); });
  document.getElementById('ncNext').addEventListener('click', function(){ simStepLine(1); });
  document.getElementById('ncPlay').addEventListener('click', function(){
    if(simPlaying){ simPause(); return; }
    var r = ncBlockRange(simSel, Math.max(0, simLine));
    simRan = true;
    simSeek(r.a + 0.01);
    simBlockEnd = r.b - 0.01;
    simPlaying = true; simLast = 0;
    simSync(); ncSync();
    if(!simRAF) simRAF = requestAnimationFrame(simTick);
  });
  // the mini speed slider drives the same hand-set speed
  var ncSpeed = document.getElementById('ncSpeed');
  ncSpeed.addEventListener('pointerdown', function(e){
    e.preventDefault();
    ncSpeed.setPointerCapture(e.pointerId);
    var set = function(ev){
      var r = ncSpeed.getBoundingClientRect();
      var v = Math.max(5, Math.min(SIM_SPEED_MAX, Math.round((ev.clientX - r.left) / r.width * SIM_SPEED_MAX)));
      [25, 50, 75, 100, 150, 200].forEach(function(d){ if(Math.abs(v - d) < 8) v = d; });
      simSpeedUser = v; simSync();
    };
    set(e);
    var move = function(ev){ set(ev); };
    var up = function(){ ncSpeed.removeEventListener('pointermove', move); ncSpeed.removeEventListener('pointerup', up); };
    ncSpeed.addEventListener('pointermove', move);
    ncSpeed.addEventListener('pointerup', up);
  });

  /* stop conditions: a toggle menu on the chip */
  // gouge is a "check for" flag, not a pause condition — the chip counts stops only
  var STOP_NAMES = { collision:'collision', opt:'optional stop', end:'stop command' };
  function stopsLbl(){
    var parts = Object.keys(STOP_NAMES).filter(function(k){ return simStopCfg[k]; });
    // keep the chip short: name a single condition, count several
    var lbl = !parts.length ? 'Stop at: off'
      : parts.length === 1 ? 'Stop at: ' + STOP_NAMES[parts[0]]
      : 'Stop at: ' + parts.length + ' conditions';
    document.getElementById('simStopsLbl').textContent = lbl;
  }
  // the stop-conditions popover: icon + label + toggle per option.
  // Its content lives in movable blocks — in compact mode they reassemble
  // into the single "Simulation parameters" popup (#allPop).
  var stopsPop = document.getElementById('stopsPop');
  var allPop = document.getElementById('allPop');
  var blkDet = document.getElementById('blkDet');
  var blkStops = document.getElementById('blkStops');
  var blkParams = document.getElementById('blkParams');
  var spDivStops = document.getElementById('spDivStops');
  var allDiv2 = document.createElement('div'); allDiv2.className = 'sp-div';
  function popRestore(){ // blocks back to their standalone popups
    stopsPop.appendChild(blkDet);
    stopsPop.appendChild(spDivStops);
    stopsPop.appendChild(blkStops);
    simPop.appendChild(blkParams);
  }
  function popAssembleAll(){ // Collision detection → Check for → Stop at → the rest
    var slot = document.getElementById('allSlot');
    slot.appendChild(blkDet);
    slot.appendChild(spDivStops);
    slot.appendChild(blkStops);
    slot.appendChild(allDiv2);
    slot.appendChild(blkParams);
  }
  [document.getElementById('simPop'), stopsPop, allPop].forEach(function(p){
    p.addEventListener('click', function(e){ e.stopPropagation(); });
  });
  document.getElementById('simStops').addEventListener('click', function(e){
    e.stopPropagation();
    if(!stopsPop.hidden){ stopsPop.hidden = true; return; }
    closeMenu();
    simPop.hidden = true; allPop.hidden = true;
    popRestore();
    spOpen(stopsPop, this);
  });
  function popBlocksHandler(e){
    // collision-detection block lives here too: master toggle + level slider
    var m = e.target.closest('[data-master]');
    if(m){
      var mOn = m.getAttribute('src').indexOf('toggle-on') >= 0;
      m.setAttribute('src', 'assets/toggle-' + (mOn ? 'off' : 'on') + '.svg');
      applyCollDet(!mOn);
      return;
    }
    var lbl = e.target.closest('[data-lvl]');
    if(lbl){ spSetLvl(+lbl.dataset.lvl); return; }
    var track = e.target.closest('#spLvlTrack');
    if(track){
      var tr = track.getBoundingClientRect();
      spSetLvl(Math.max(0, Math.min(2, Math.round((e.clientX - tr.left) / tr.width * 2))));
      return;
    }
    var row = e.target.closest('[data-stop]');
    if(!row) return;
    var k = row.dataset.stop;
    simStopCfg[k] = !simStopCfg[k];
    row.querySelector('.tgl').setAttribute('src',
      'assets/toggle-' + (simStopCfg[k] ? 'on' : 'off') + '.svg');
    stopsLbl();
  }
  // bound to the blocks (not the popups) so the handlers travel with them
  blkDet.addEventListener('click', popBlocksHandler);
  blkStops.addEventListener('click', popBlocksHandler);
  stopsLbl();

  /* collision navigation: next / previous (no wrap — ends disable) */
  function simGotoColl(dir){
    var t;
    if(dir > 0){
      t = SIM_COLLISIONS.find(function(c){ return c > simT + 0.5; });
    } else {
      var prevs = SIM_COLLISIONS.filter(function(c){ return c < simT - 0.5; });
      t = prevs.length ? prevs[prevs.length - 1] : null;
    }
    if(t == null) return;
    simSeek(t);
    simPause();
    // reveal the collision in the code tree: open the op and scroll to the line
    if(!SIM_OPS[simSel].open){ SIM_OPS[simSel].open = true; simRender(); }
    var row = simTree.querySelector('.simrow.cur');
    if(row) row.scrollIntoView({block:'center'});
  }
  document.getElementById('simCollPrev').addEventListener('click', function(){ simGotoColl(-1); });
  document.getElementById('simCollNext').addEventListener('click', function(){ simGotoColl(1); });

  /* the red badge opens the collision list: what happened and where */
  var collPop = document.getElementById('collPop');
  function collOpAt(t){
    var s = 0;
    for(var i = 0; i < SIM_DURS.length; i++){ if(t < s + SIM_DURS[i]) return i; s += SIM_DURS[i]; }
    return SIM_DURS.length - 1;
  }
  function collListRender(){
    var h = '';
    SIM_COLLISIONS.forEach(function(t, i){
      var oi = collOpAt(t);
      h += '<div class="coll-item" data-collt="' + t + '">' +
        '<span class="sp-ic ic-red"><svg viewBox="0 0 16 16"><rect x="5.2" y="5.2" width="5.6" height="5.6" rx="1.2" transform="rotate(45 8 8)" fill="currentColor"/><circle cx="8" cy="8" r="1.1" fill="var(--ec-popover, #1e2223)"/></svg></span>' +
        '<span class="ci-body"><b>Holder collision</b>' +
        '<span>' + SIM_OPS[oi].name + ' · ' + SIM_TOOLS[oi] + ' · ' + simFmt(t) + '</span></span>' +
        '</div>';
    });
    document.getElementById('collList').innerHTML = h;
  }
  document.getElementById('sbColl').addEventListener('click', function(e){
    e.stopPropagation();
    if(!collPop.hidden){ collPop.hidden = true; return; }
    closeMenu();
    simPop.hidden = true; stopsPop.hidden = true;
    collListRender();
    spOpen(collPop, this, true);
  });
  collPop.addEventListener('click', function(e){
    e.stopPropagation();
    var it = e.target.closest('[data-collt]');
    if(!it) return;
    simSeek(+it.dataset.collt);
    simPause();
    if(!SIM_OPS[simSel].open){ SIM_OPS[simSel].open = true; simRender(); }
    var row = simTree.querySelector('.simrow.cur');
    if(row) row.scrollIntoView({block:'center'});
    collPop.hidden = true;
  });
  document.getElementById('sbCollN').textContent = SIM_COLLISIONS.length;

  /* ---- simulation parameters popover (the ! button and the gear) ---- */
  var simPop = document.getElementById('simPop');
  var SP_LEVELS = [
    {t:'Holder', s:'Checks the tool holder only. The fastest option.'},
    {t:'Holder + machine', s:'Checks holder and machine components. Balanced option for daily work.'},
    {t:'Holder + machine + hidden nodes', s:'Checks everything including hidden nodes. The most thorough and the slowest.'}
  ];
  function spSetLvl(i){
    document.getElementById('spLvlFill').style.width = (i * 50) + '%';
    document.getElementById('spLvlKnob').style.left = (i * 50) + '%';
    document.getElementById('spNoteT').textContent = SP_LEVELS[i].t;
    document.getElementById('spNoteS').textContent = SP_LEVELS[i].s;
    var ls = blkDet.querySelectorAll('.sp-lvl-labels span');
    for(var k = 0; k < ls.length; k++) ls[k].classList.toggle('on', k === i);
  }
  function spOpen(pop, anchor, alignLeft){
    pop.hidden = false;
    var r = anchor.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(alignLeft ? r.left : r.right - w, innerWidth - w - 8));
    // open ABOVE the simulation panel, never over it; with the bar hidden
    // (compact mode) drop below the anchor instead
    var top;
    if(simBar.hidden){
      top = Math.min(innerHeight - h - 8, r.bottom + 6);
    } else {
      top = Math.max(8, simBar.getBoundingClientRect().top - h - 6);
    }
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  ['simCfg'].forEach(function(id){
    var b = document.getElementById(id);
    if(b) b.addEventListener('click', function(e){
      e.stopPropagation();
      if(!simPop.hidden){ simPop.hidden = true; return; }
      closeMenu();
      stopsPop.hidden = true; allPop.hidden = true;
      popRestore();
      spOpen(simPop, b);
    });
  });
  blkParams.addEventListener('click', function(e){
    e.stopPropagation();
    var t = e.target.closest('.tgl');
    if(t){
      var on = t.getAttribute('src').indexOf('toggle-on') >= 0;
      t.setAttribute('src', 'assets/toggle-' + (on ? 'off' : 'on') + '.svg');
      // the absolute-tolerance input follows its toggle
      if(t.hasAttribute('data-abs')){
        var box = t.parentElement.querySelector('.sp-input');
        box.classList.toggle('is-off', on);
        box.querySelector('input').disabled = on;
      }
      // collision detection master: no detection → no collision events
      if(t.hasAttribute('data-master')) applyCollDet(!on);
      return;
    }
    var lbl = e.target.closest('[data-lvl]');
    if(lbl){ spSetLvl(+lbl.dataset.lvl); return; }
    var track = e.target.closest('#spLvlTrack');
    if(track){
      var r = track.getBoundingClientRect();
      spSetLvl(Math.max(0, Math.min(2, Math.round((e.clientX - r.left) / r.width * 2))));
      return;
    }
    if(e.target.id === 'spRapid'){
      var seq = ['x1', 'x2', 'x4', 'x8', 'x16'];
      e.target.textContent = seq[(seq.indexOf(e.target.textContent) + 1) % seq.length];
      return;
    }
    if(e.target.id === 'spType'){
      var tq = ['Voxel 5D', 'Voxel 3D', 'Mesh'];
      e.target.textContent = tq[(tq.indexOf(e.target.textContent) + 1) % tq.length];
    }
  });
  // tolerance sliders: plain drag, Low…High
  simPop.querySelectorAll('.sp-tol-track').forEach(function(tr){
    tr.addEventListener('pointerdown', function(e){
      e.preventDefault(); e.stopPropagation();
      tr.setPointerCapture(e.pointerId);
      var set = function(ev){
        var r = tr.getBoundingClientRect();
        var p = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
        tr.querySelector('.fill').style.width = p + '%';
        tr.querySelector('.knob').style.left = p + '%';
      };
      set(e);
      var mv = function(ev){ set(ev); };
      var up = function(){
        tr.removeEventListener('pointermove', mv);
        tr.removeEventListener('pointerup', up);
      };
      tr.addEventListener('pointermove', mv);
      tr.addEventListener('pointerup', up);
    });
  });
  document.addEventListener('click', function(){
    simPop.hidden = true; stopsPop.hidden = true; collPop.hidden = true;
    allPop.hidden = true;
  });

  /* collision detection off → hide collision markers, badge and nav,
     grey out the collision stop-condition and skip its pause events */
  var collDetOn = true;
  function applyCollDet(on){
    collDetOn = on;
    simTl.classList.toggle('nocoll', !on);
    document.getElementById('sbColl').hidden = !on;
    document.getElementById('simCollPrev').hidden = !on;
    document.getElementById('simCollNext').hidden = !on;
    stopsPop.querySelectorAll('[data-coll]').forEach(function(r){
      r.classList.toggle('is-disabled', !on);
    });
    simTlSync();
  }

  /* compact mode: the controls dock into the code panel (the old layout);
     it is the default — the wide bottom panel is opt-in via the toggle */
  var simCompact = true;
  var simDock = document.getElementById('simDock');
  var vcube = document.getElementById('vcube');
  function setSimMode(on){
    document.dispatchEvent(new CustomEvent('ency:mode', {detail:{sim:on}}));
    document.querySelector('.dock').classList.toggle('sim', on);
    document.querySelector('.panel-tree').classList.toggle('sim', on);
    simWrap.hidden = !on;
    simBar.hidden = !on || simCompact;
    simTlWrap.hidden = !on || simCompact;
    simDock.hidden = !on || !simCompact;
    var dock = document.querySelector('.dock');
    if(on){
      simRender(); simSync(); simTlSync();
      // the wide sim panel spans the viewport — pull the dock up above it;
      // in compact mode there is no bottom panel, the dock takes full height
      dock.style.bottom = simCompact ? '' : (simBar.offsetHeight + 8 + 8) + 'px';
      // the view cube sits above the wide panel too (in any of its corners, app.css)
      if(dock.style.bottom) vp.style.setProperty('--vbar-b', dock.style.bottom); else vp.style.removeProperty('--vbar-b');
      calcBar.style.bottom = viewTools.style.bottom = sysBar.style.bottom = dock.style.bottom;
    } else {
      dock.style.bottom = '';
      vp.style.removeProperty('--vbar-b');
      calcBar.style.bottom = viewTools.style.bottom = sysBar.style.bottom = '';
      simPause();
    }
  }
  function setCompact(on){
    simCompact = on;
    setSimMode(true);
  }
  document.getElementById('simDockBtn').addEventListener('click', function(){ setCompact(true); });
  document.getElementById('sdUndock').addEventListener('click', function(){ setCompact(false); });
  // compact controls proxy to the main handlers
  document.getElementById('sdPlay').addEventListener('click', function(){
    document.getElementById('simPlay').click();
  });
  document.getElementById('sdBack').addEventListener('click', function(){
    document.getElementById('simStepB').click();
  });
  document.getElementById('sdFwd').addEventListener('click', function(){
    document.getElementById('simStepF').click();
  });
  document.getElementById('sdStop').addEventListener('click', simReset);
  document.getElementById('sdCollPrev').addEventListener('click', function(){ simGotoColl(-1); });
  document.getElementById('sdCollNext').addEventListener('click', function(){ simGotoColl(1); });
  // in compact mode the "!" opens the merged Simulation parameters popup
  document.getElementById('sdWarn').addEventListener('click', function(e){
    e.stopPropagation();
    if(!allPop.hidden){ allPop.hidden = true; return; }
    closeMenu(); simPop.hidden = true; stopsPop.hidden = true; collPop.hidden = true;
    popAssembleAll();
    spOpen(allPop, this, true);
  });
  simDock.addEventListener('click', function(e){
    if(e.target.closest('[data-sdscope]')) simPause();
  });
  // the mini speed slider drives the same hand-set speed
  var sdSpeed = document.getElementById('sdSpeed');
  sdSpeed.addEventListener('pointerdown', function(e){
    e.preventDefault();
    sdSpeed.setPointerCapture(e.pointerId);
    var set = function(ev){
      var r = sdSpeed.getBoundingClientRect();
      var v = Math.max(5, Math.min(SIM_SPEED_MAX,
        Math.round((ev.clientX - r.left) / r.width * SIM_SPEED_MAX)));
      [25, 50, 75, 100, 150, 200].forEach(function(d){ if(Math.abs(v - d) < 8) v = d; });
      simSpeedUser = v;
      simSync();
    };
    set(e);
    var move = function(ev){ set(ev); };
    var up = function(){
      sdSpeed.removeEventListener('pointermove', move);
      sdSpeed.removeEventListener('pointerup', up);
    };
    sdSpeed.addEventListener('pointermove', move);
    sdSpeed.addEventListener('pointerup', up);
  });

  /* ---------- Single-operation mode: double-click on the dock resizer ---------- */
  var singleOp = document.getElementById('singleOp');
  var soMain = document.getElementById('soMain');
  function soOps(){ return rows.filter(function(r){ return r.dataset.type==='operation'; }); }
  function soCur(){
    var sel = tree.querySelector('.trow.tsel');
    if(sel && sel.dataset.type==='operation') return sel;
    return soOps()[0] || null;
  }
  function soRender(){
    var r = soCur(); if(!r){ soMain.innerHTML=''; return; }
    var ops = soOps(), idx = ops.indexOf(r) + 1;
    var name = r.querySelector('.rlabel span').textContent;
    var toolEl = r.querySelector('.tlink span');
    var icons = Array.prototype.map.call(r.querySelectorAll('.pslot .bicn img'), function(img){
      return '<img class="i16" src="'+img.src+'" alt="">';
    }).join('');
    // line 1: number, name, colour + status; a divider; line 2: tool number + tool (as in the tree)
    var toolNo = (r.querySelector('.toolno')||{textContent:''}).textContent;
    soMain.innerHTML =
      '<div class="so-card">'+
        '<div class="so-row"><span class="so-num">'+idx+'.</span>'+
        '<span class="so-name">'+name+'</span>'+
        '<span class="so-icons">'+icons+'</span></div>'+
        (toolNo || toolEl ? '<div class="so-div"></div><div class="so-row">'+
          (toolNo ? '<span class="so-tno">'+toolNo+'</span>' : '')+
          (toolEl ? '<span class="so-tool">'+toolEl.textContent+'</span>' : '')+'</div>' : '')+
      '</div>';
  }
  function soStep(dir){
    var ops = soOps(), r = soCur(); if(!r) return;
    var next = ops[ops.indexOf(r) + dir];
    if(next){ next.click(); soRender(); }
  }
  function setSingle(on){
    dockEl.classList.toggle('single', on);
    document.querySelector('.panel-tree').classList.toggle('single', on);
    singleOp.hidden = !on;
    if(on){
      document.querySelector('.panel-tree').style.flex = '';
      soRender();
    }
  }
  if(singleOp){
    singleOp.addEventListener('click', function(e){
      var b = e.target.closest('.so-btn'); if(!b) return;
      if(b.dataset.so==='prev') soStep(-1);
      else if(b.dataset.so==='next') soStep(1);
      else {
        // the middle button lists every operation — picking one jumps to it
        e.stopPropagation();
        var cur = soCur();
        showMenu(b.getBoundingClientRect(), soOps().map(function(r, i){
          var name = r.querySelector('.rlabel span').textContent;
          return {pre:(i + 1) + '.', label:name, cur:r === cur,
            onPick:function(){ r.click(); soRender(); }};
        }), b, 180);
      }
    });
  }

  /* ---------- Dock resizer: drag to resize tree vs inspector ---------- */
  var dockResizer = document.getElementById('dockResizer');
  var panelTree = document.querySelector('.panel-tree');
  // the inspector may get shorter than its rail: the tabs without room move into More
  // ("Inspector tabs"), so it only keeps the common minimum (.panel-insp in app.css)
  // the height of the tree panel in the single-operation mode (it depends on the card):
  // switched on and back within one frame, nothing is painted in between
  function singleH(){
    if(dockEl.classList.contains('single')) return panelTree.offsetHeight;
    var flex = panelTree.style.flex;
    setSingle(true);
    var h = panelTree.offsetHeight;
    setSingle(false);
    panelTree.style.flex = flex;
    return h;
  }
  if(dockResizer && panelTree && dockEl){
    var MIN_PANEL = 140; // min height for either panel
    // squeezing the tree down to about the size of the single-operation panel switches to that
    // mode (a tree a row high is no tree); pulling it out again leaves it. The gap between the
    // two thresholds keeps the mode from flickering at the edge
    var SINGLE_IN = 24, SINGLE_OUT = 48;
    // double-click toggles the single-operation mode
    dockResizer.addEventListener('dblclick', function(){
      setSingle(!dockEl.classList.contains('single'));
    });
    dockResizer.addEventListener('mousedown', function(e){
      if(dockEl.classList.contains('insp-collapsed')) return;
      e.preventDefault();
      dockResizer.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      // the Simulation tab has no single-operation card: there the tree only stops at MIN_PANEL
      var auto = !panelTree.classList.contains('sim'), sH = auto ? singleH() : 0;
      function onMove(ev){
        var r = dockEl.getBoundingClientRect();
        var rezH = dockResizer.offsetHeight;
        var h = (ev.clientY - r.top) - rezH / 2; // tree height, resizer centered on cursor
        var maxH = r.height - rezH - MIN_PANEL;
        var single = dockEl.classList.contains('single');
        if(auto){
          if(!single && h <= sH + SINGLE_IN){ setSingle(true); return; }
          if(single){
            if(h < sH + SINGLE_OUT) return;
            setSingle(false);
          }
          h = Math.max(sH + SINGLE_IN, Math.min(maxH, h));
        } else {
          if(single) return;
          h = Math.max(MIN_PANEL, Math.min(maxH, h));
        }
        panelTree.style.flex = '0 0 ' + h + 'px';
      }
      function onUp(){
        dockResizer.classList.remove('dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ---------- Inspector placement: the three dots on top of the rail (Core 300:728) pick where the
     inspector sits — under the tree (in the dock), right of the tree or at the window's right edge;
     the current place is the long dot. Out of
     the dock it is a full-height panel of the workspace with its own width and grip ("Panel width")
     and the tree takes the dock's height; what is laid out after the dock (filters, view cube, view tools, status panels) or before
     the right edge (the system bar) moves aside through --free-l / --free-r (app.css). The
     Simulation tab hides it wherever it is, as before. Kept across sessions ---------- */
  var panelInsp = document.querySelector('.panel-insp'), workspace = document.querySelector('.workspace');
  function inspPlace(id){
    if(!panelInsp || !workspace) return;
    var out = id !== 'below';
    if(out && dockEl.classList.contains('single')) setSingle(false);
    if(out) workspace.appendChild(panelInsp); else dockEl.appendChild(panelInsp);
    dockEl.classList.toggle('insp-collapsed', out);
    workspace.dataset.insp = id;
    // two panels across must still leave the view room: the inspector gives way first, then the tree
    if(out) inspW(px('--insp-w'));
    dockW(dockEl.offsetWidth);
    if(railPlaceEl) railPlaceEl.querySelectorAll('.rp-dot').forEach(function(d){ d.classList.toggle('on', d.dataset.place === id); });
    try { localStorage.setItem('ency.inspPlace', id); } catch(e){}
    // the calc bar, the toolpath view and open panels follow the new free view
    window.dispatchEvent(new Event('resize'));
  }
  if(panelInsp && workspace){
    if(railPlaceEl) railPlaceEl.addEventListener('click', function(e){
      var d = e.target.closest('.rp-dot'); if(!d) return;
      e.stopPropagation(); inspPlace(d.dataset.place);
    });
    document.addEventListener('ency:mode', function(e){ workspace.classList.toggle('simmode', !!e.detail.sim); });
    var savedPlace = ''; try { savedPlace = localStorage.getItem('ency.inspPlace') || ''; } catch(e){}
    inspPlace(savedPlace === 'side' || savedPlace === 'right' ? savedPlace : 'below');
  }
})();

/* ---------- Macro panel: the Automation window ----------
   Port of packages/macro/cam-automation.html into the ENCY shell. Tabs:
   · Macro — the steps for ONE model. Steps are recorded from real actions in the project
     (the 'ency:action' bus: inspector changes, new operations, Calculate) or added by hand
     from the six base commands. While recording the window collapses to a compact strip.
   · Batch run — folder with models, formats, file picks, results folder, rules;
   · Execution — progress, the queue of models with statuses, log; pause / stop / retry.
   CAM work, file system and saving are simulated. */
(function(){
  'use strict';
  var panel = document.getElementById('macroPanel');
  if(!panel) return;
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var menu = function(anchor, opts, cur, pick){
    window.ENCY_MENU.show(anchor.getBoundingClientRect(), opts.map(function(o){
      return {label:o, cur:o === cur, onPick:function(){ pick(o); }};
    }), anchor, anchor.offsetWidth);
  };

  // ——— the six base commands (added by hand; import / save are what a batch needs) ———
  var DEFS = {
    'new':        {label:'Create new project',   val:'Clean project · mm',            cmd:'PROJECT.NEW UNITS=MM'},
    'import':     {label:'Import 3D model',      val:'Current file from the folder',  cmd:'MODEL.IMPORT {current_model}'},
    'operations': {label:'Create operations',    val:'Recorded technology',           cmd:'OP.CREATE …'},
    'calculate':  {label:'Calculate operations', val:'All operations of the project', cmd:'OP.CALC ALL'},
    'export':     {label:'Output NC program',    val:'{model_name}.nc',               cmd:'NC.SAVE {result_folder}\\{model_name}.nc'},
    'save':       {label:'Save project',         val:'{model_name}',                  cmd:'PROJECT.SAVE {result_folder}\\{model_name}'}
  };
  var SEQ = Object.keys(DEFS);
  function base(type){ var d = DEFS[type]; return {type:type, label:d.label, val:d.val, cmd:d.cmd}; }
  var steps = [], selStep = -1, recording = false, recPaused = false, revision = 1;
  var recAt = -1; // where recording continues: index of the step new steps go after; -1 = the end
  var batchMacro = ''; // '' = the macro in the editor, otherwise a name from the library
  // parameter steps: recorded inspector changes — their value is editable; empty = ask when run
  function isParam(st){ return st.type === 'event' && st.label !== 'New operation' && st.label !== 'Calculate'; }
  function batchSteps(){ return batchMacro && saved[batchMacro] ? saved[batchMacro] : steps; }
  function batchName(){ return batchMacro || ($('mcName').value.trim() || 'Untitled'); }
  // library of recorded macros (kept for the session); two samples so Open has something to show
  // helpers for the sample library: op(name) · prm(label, value, op, opts) · tgl(label, on, op) · ask(label, op, ctl, opts) · calc(scope)
  function ev(label, val, cmd, op, extra){ return Object.assign({type:'event', label:label, val:val, cmd:cmd, op:op || ''}, extra || {}); }
  function op(name){ return ev('New operation', name, 'OP.CREATE "' + name + '"'); }
  function prm(label, val, opn, opts){ return ev(label, val, 'OP.PARAM "' + label + '" "' + val + '"', opn, opts ? {ctl:'dropdown', opts:opts} : {ctl:'input'}); }
  function tgl(label, on, opn){ return ev(label, on ? 'On' : 'Off', 'OP.PARAM "' + label + '" ' + (on ? 'TRUE' : 'FALSE'), opn, {ctl:'toggle'}); }
  function ask(label, opn, ctl, opts){ return ev(label, '', 'OP.PARAM "' + label + '" "{ask}"', opn, {ctl:ctl || 'input', opts:opts || null}); }
  function calc(scope){ return ev('Calculate', scope || 'All operations', scope && scope !== 'All operations' ? 'OP.CALC SELECTED' : 'OP.CALC ALL', scope && scope !== 'All operations' ? scope : ''); }
  function bp(st){ st.bp = true; return st; }
  var COOL = ['Flood', 'Mist', 'Through tool', 'Off'], DIR = ['Climb', 'Conventional', 'Mixed'], PAT = ['Parallel', 'Spiral', 'Radial', 'Zigzag'], TOL = ['Rough', 'Standard', 'Fine'];
  var saved = {
    // short: one operation, one recalculation
    'Quick facing':[
      op('Lathe facing'), prm('Feed', '0.25 mm/rev', 'Lathe facing'), calc('Lathe facing')],
    // short, asks for the drill diameter at run time
    'Drill \u00b7 ask diameter':[
      op('Drilling'), ask('Tool diameter', 'Drilling'), prm('Cycle', 'Deep drilling', 'Drilling', ['Simple', 'Deep drilling', 'Peck', 'Boring']),
      tgl('Chip breaking', true, 'Drilling'), calc('Drilling')],
    // medium: turning pass with a breakpoint before the finishing cut
    'OD turning \u00b7 rough + finish':[
      base('import'),
      op('OD roughing'), prm('Depth of cut', '2 mm', 'OD roughing'), prm('Feed', '0.3 mm/rev', 'OD roughing'), prm('Coolant', 'Flood', 'OD roughing', COOL),
      op('OD finishing'), bp(prm('Stock to leave', '0.2 mm', 'OD finishing')), prm('Feed', '0.12 mm/rev', 'OD finishing'), tgl('Spring pass', false, 'OD finishing'),
      calc(), base('export')],
    // medium: 3-axis milling with a dropdown pattern and a run-time question
    'Housing \u00b7 3-axis roughing':[
      base('new'), base('import'),
      op('Adaptive Clearing'), prm('Radial stock', '0.5 mm', 'Adaptive Clearing'), prm('Axial stock', '0.3 mm', 'Adaptive Clearing'),
      prm('Direction', 'Climb', 'Adaptive Clearing', DIR), tgl('Rest machining', true, 'Adaptive Clearing'),
      op('Parallel'), prm('Pattern', 'Parallel', 'Parallel', PAT), ask('Step over', 'Parallel'), prm('Tolerance', 'Standard', 'Parallel', TOL),
      bp(calc()), base('export'), base('save')],
    // long: full lathe part, two breakpoints, several asks and toggles
    'Full lathe part \u00b7 8 operations':[
      base('new'), base('import'),
      ev('Machine setup', 'DMG CTX beta 800', 'MACHINE.SET "DMG CTX beta 800"'),
      ev('Workpiece', 'Bar \u00d860 \u00d7 120', 'STOCK.SET BAR 60 120'),
      op('Lathe facing'), prm('Feed', '0.25 mm/rev', 'Lathe facing'),
      op('OD roughing'), prm('Depth of cut', '2.5 mm', 'OD roughing'), prm('Coolant', 'Flood', 'OD roughing', COOL), tgl('Climb milling', true, 'OD roughing'),
      op('OD grooving'), prm('Groove width', '4 mm', 'OD grooving'), ask('Groove depth', 'OD grooving'),
      op('OD finishing'), bp(prm('Stock to leave', '0.1 mm', 'OD finishing')), prm('Tolerance', 'Fine', 'OD finishing', TOL),
      op('Drilling'), ask('Tool diameter', 'Drilling'), prm('Cycle', 'Peck', 'Drilling', ['Simple', 'Deep drilling', 'Peck', 'Boring']),
      op('ID boring'), prm('Stock to leave', '0.05 mm', 'ID boring'), tgl('Spring pass', true, 'ID boring'),
      op('Thread turning'), ask('Thread pitch', 'Thread turning', 'dropdown', ['1.0', '1.25', '1.5', '2.0']), prm('Passes', '6', 'Thread turning'),
      op('Parting off'), prm('Feed', '0.08 mm/rev', 'Parting off'), tgl('Chamfer edge', false, 'Parting off'),
      bp(calc()),
      ev('Simulate', 'Machine collision check', 'SIM.RUN COLLISIONS'),
      base('export'), base('save')]
  }, savedName = '';
  var group = 'housings', excluded = {}, run = null, timer = null, existing = {};
  var recursive = false, perModel = true, format = 'STEP + IGES', collision = 'Add version number', errPolicy = 'Go to the next model';
  var DATA = {
    housings:[{id:'h1', name:'Housing_01.step', size:'2.4 MB', type:'step', sub:false},
              {id:'h2', name:'Housing_02.step', size:'3.1 MB', type:'step', sub:false},
              {id:'h3', name:'Housing_03.iges', size:'1.8 MB', type:'iges', sub:false},
              {id:'h4', name:'Variants/Housing_04.step', size:'2.7 MB', type:'step', sub:true}],
    covers:  [{id:'c1', name:'Cover_01.step', size:'1.2 MB', type:'step', sub:false},
              {id:'c2', name:'Cover_02.step', size:'1.5 MB', type:'step', sub:false}]
  };
  var FOLDERS = {housings:'D:\\Models\\Housings', covers:'D:\\Models\\Covers'};
  var visibleFiles = function(){
    return DATA[group].filter(function(f){
      return (!f.sub || recursive) && (format === 'STEP + IGES' || (format === 'STEP only' ? f.type === 'step' : f.type === 'iges'));
    });
  };
  var chosenFiles = function(){ return visibleFiles().filter(function(f){ return !excluded[f.id]; }); };
  var stem = function(f){ return f.name.split('/').pop().replace(/\.[^.]+$/, ''); };
  var outDir = function(){ return $('mcDst').value.trim().replace(/[\\\/]+$/, ''); };
  var has = function(type){ return steps.some(function(s){ return s.type === type; }); };

  // blocking problems return a message; soft advice goes to the status line
  function validation(){
    if(!$('mcName').value.trim()) return 'Give the macro a name.';
    if(recording) return 'Finish recording before running.';
    if(!steps.length) return 'Record or add at least one step.';
    return '';
  }
  function advice(){
    if(!steps.length || validation()) return '';
    if(!has('import')) return 'Add \u201cImport 3D model\u201d so the macro can take the current file from the folder.';
    if(!has('export') && !has('save')) return 'Add \u201cOutput NC program\u201d or \u201cSave project\u201d to keep the results.';
    return '';
  }

  // ——— tabs ———
  var tabs = {macro:$('mcPageMacro'), batch:$('mcPageBatch'), run:$('mcPageRun')};
  function tabBtn(n){ return panel.querySelector('.mc-tab[data-tab="' + n + '"]'); }
  function view(name){
    Object.keys(tabs).forEach(function(n){ tabBtn(n).setAttribute('aria-selected', String(n === name)); tabs[n].hidden = n !== name; });
    if(name === 'batch') refreshBatch();
  }
  panel.querySelector('.mc-tabs').addEventListener('click', function(e){
    var t = e.target.closest('.mc-tab'); if(t && !t.disabled) view(t.dataset.tab);
  });
  function lock(on){ tabBtn('macro').disabled = on; tabBtn('batch').disabled = on; $('mcToSettings').disabled = on; }

  // ——— Macro: the step list ———
  // the value control of a parameter step: toggle · dropdown (its recorded options) · text input.
  // Every kind has an "ask when run" state (empty value): the run pauses there and waits.
  var ASK = '<span class="mc-ask-btn" title="Ask when the macro runs">?</span>';
  function valCtl(s, i){
    var ask = !s.val;
    if(s.ctl === 'toggle'){
      return '<span class="mc-command-ctl' + (ask ? ' ask' : '') + '" data-i="' + i + '">' +
        (ask ? '<span class="mc-askval">Ask when run</span>' : '<img class="tgl" data-act="tgl" src="assets/toggle-' + (s.val === 'On' ? 'on' : 'off') + '.svg" alt="">') + ASK + '</span>';
    }
    if(s.ctl === 'dropdown'){
      return '<span class="mc-command-ctl' + (ask ? ' ask' : '') + '" data-i="' + i + '">' +
        '<span class="mc-select mc-command-dd" data-act="dd"><span class="dd-t' + (ask ? ' mc-askval' : '') + '">' + (ask ? 'Ask when run' : esc(s.val)) + '</span>' +
        '<svg viewBox="0 0 8 5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l3 3 3-3"/></svg></span></span>';
    }
    return '<input class="mc-command-input" data-i="' + i + '" value="' + esc(s.val) + '" placeholder="Ask when run" spellcheck="false" title="Edit the value \u00b7 leave empty to ask when the macro runs">';
  }
  function setVal(st, v){ st.val = v; revision++; st.cmd = st.cmd.replace(/("[^"]*"|TRUE|FALSE|\{ask\})\s*$/, st.ctl === 'toggle' ? (v === 'On' ? 'TRUE' : v === 'Off' ? 'FALSE' : '{ask}') : '"' + (v || '{ask}') + '"'); }
  function renderSteps(){
    $('mcCmds').innerHTML = steps.length ? steps.map(function(s, i){
      return '<div role="button" class="mc-command' + (s.bp ? ' bp' : '') + (isParam(s) && !s.val ? ' ask' : '') + '" data-step="' + i + '" aria-pressed="' + (i === selStep) + '">' +
        '<span class="mc-bp" title="' + (s.bp ? 'Breakpoint: playback pauses before this step' : 'Set a breakpoint') + '"></span>' +
        '<span class="mc-command-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="mc-command-label">' + esc(s.label) + (s.op && s.type === 'event' && s.label !== 'New operation' ? '<span class="mc-command-sub">' + esc(s.op) + '</span>' : '') +
        (i === selStep ? '<span class="mc-command-cmd">' + esc(s.cmd) + '</span>' : '') + '</span>' +
        (isParam(s) ? valCtl(s, i) : '<span class="mc-command-val">' + esc(s.val) + '</span>') + '</div>';
    }).join('') : '<div class="mc-empty">Press Record and work in the project, or add a command.</div>';
    $('mcStepCount').textContent = 'Steps: ' + steps.length;
    $('mcUp').disabled = selStep <= 0 || !steps.length || recording;
    $('mcDown').disabled = selStep >= steps.length - 1 || !steps.length || recording;
    $('mcDel').disabled = selStep < 0 || !steps.length || recording;
    setValid();
  }
  function setValid(){
    var v = validation(), a = advice();
    $('mcValid').textContent = v || a || 'Ready for batch run';
    $('mcValid').className = 'mc-foot-note ' + (v ? 'warn' : a ? 'hint' : 'ok');
    $('mcRunOnce').disabled = !!v;
  }
  $('mcCmds').addEventListener('input', function(e){
    var inp = e.target.closest('.mc-command-input'); if(!inp) return;
    var st = steps[+inp.dataset.i]; setVal(st, inp.value.trim());
    inp.closest('.mc-command').classList.toggle('ask', !st.val);
  });
  $('mcCmds').addEventListener('click', function(e){
    var s = e.target.closest('[data-step]'); if(!s) return;
    if(e.target.closest('.mc-command-input')) return;
    var ctl = e.target.closest('.mc-command-ctl');
    if(ctl){
      e.stopPropagation();
      var st = steps[+ctl.dataset.i];
      if(e.target.closest('.mc-ask-btn')){ setVal(st, ''); renderSteps(); return; }
      if(e.target.closest('[data-act="tgl"]')){ setVal(st, st.val === 'On' ? 'Off' : 'On'); renderSteps(); return; }
      var dd = e.target.closest('[data-act="dd"]');
      if(dd){
        var opts = (st.opts || []).slice(); if(st.val && opts.indexOf(st.val) < 0) opts.unshift(st.val);
        var items = opts.map(function(o){ return {label:o, cur:o === st.val, onPick:function(){ setVal(st, o); renderSteps(); }}; });
        items.push({sep:true}); items.push({label:'Ask when run', cur:!st.val, onPick:function(){ setVal(st, ''); renderSteps(); }});
        window.ENCY_MENU.show(dd.getBoundingClientRect(), items, dd, dd.offsetWidth);
      }
      return;
    }
    if(e.target.closest('.mc-bp')){ var st = steps[+s.dataset.step]; st.bp = !st.bp; revision++; renderSteps(); return; }
    selStep = +s.dataset.step === selStep ? -1 : +s.dataset.step; renderSteps();
  });

  // ——— recording: real actions arrive on the bus; the window collapses to the strip ———
  function updateRecording(){
    panel.classList.toggle('compact', recording);
    panel.classList.toggle('recording', recording && !recPaused);
    panel.classList.toggle('recpaused', recording && recPaused);
    $('mcRecBar').hidden = !recording;
    $('mcRecText').textContent = recPaused ? 'Recording paused' : 'Recording \u00b7 ' + steps.length + (steps.length === 1 ? ' step' : ' steps');
    var last = steps[recAt >= 0 ? recAt : steps.length - 1];
    $('mcRecLast').textContent = recAt >= 0 && recPaused ? 'Continue after step ' + (recAt + 1)
      : last ? last.label + (last.val ? ': ' + last.val : '') : 'Work in the project\u2026';
    $('mcRecPause').title = recPaused ? 'Resume recording' : 'Pause recording';
    $('mcRecPause').innerHTML = recPaused
      ? '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.5" fill="#ff7072"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3.5" width="3" height="9" rx=".8"/><rect x="9" y="3.5" width="3" height="9" rx=".8"/></svg>';
    renderRecList();
    renderSteps();
  }
  // the tail of the recording under the strip: 3 rows while recording, 6 + delete while paused
  function renderRecList(){
    var box = $('mcRecList');
    if(!recording || !steps.length){ box.hidden = true; box.innerHTML = ''; return; }
    var cur = recAt >= 0 ? recAt : steps.length - 1;
    // every step, scrollable; the list follows the insertion point
    box.hidden = false;
    box.innerHTML = steps.map(function(st, i){
        return '<div class="mc-recrow' + (i === cur ? ' last' : '') + '" data-i="' + i + '"' + (recPaused ? ' draggable="true"' : '') +
          ' title="' + (recPaused ? 'Continue recording after this step \u00b7 drag to reorder' : '') + '">' +
          '<span class="mc-recrow__n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="mc-recrow__l">' + esc(st.label) + (st.op && st.label !== 'New operation' && st.label !== 'Calculate' ? ' \u00b7 ' + esc(st.op) : '') + '</span>' +
          '<span class="mc-recrow__v">' + esc(st.val) + '</span>' +
          '<button class="mc-recrow__x" title="Delete this step"><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg></button></div>' +
          (recAt >= 0 && i === recAt ? '<div class="mc-recins"><i></i><span>Recording continues here</span></div>' : '');
      }).join('');
    var row = box.querySelector('.mc-recrow.last');
    if(row) row.scrollIntoView({block:'nearest'});
  }
  $('mcRecList').addEventListener('click', function(e){
    if(!recPaused) return;
    var row = e.target.closest('.mc-recrow'); if(!row) return;
    var i = +row.dataset.i;
    if(e.target.closest('.mc-recrow__x')){
      steps.splice(i, 1);
      if(recAt >= 0){ if(i < recAt) recAt--; else if(i === recAt) recAt = i - 1 >= 0 ? i - 1 : (steps.length ? -1 : -1); }
      revision++; updateRecording(); return;
    }
    // a click on the row sets the insertion point; the last step means "at the end"
    recAt = (i === recAt || i === steps.length - 1) ? -1 : i;
    updateRecording();
  });
  // drag & drop while paused: drop above or below a row, the insertion marker follows its step
  (function(){
    var list = $('mcRecList'), dragI = -1;
    function clearMarks(){ list.querySelectorAll('.mc-recrow').forEach(function(r){ r.classList.remove('drop-before', 'drop-after', 'dragging'); }); }
    list.addEventListener('dragstart', function(e){
      var r = e.target.closest('.mc-recrow'); if(!r || !recPaused){ e.preventDefault(); return; }
      dragI = +r.dataset.i; r.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(dragI)); } catch(x){}
    });
    list.addEventListener('dragover', function(e){
      var r = e.target.closest('.mc-recrow'); if(!r || dragI < 0) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      var rect = r.getBoundingClientRect(), below = e.clientY > rect.top + rect.height / 2;
      list.querySelectorAll('.mc-recrow').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); });
      if(+r.dataset.i !== dragI) r.classList.add(below ? 'drop-after' : 'drop-before');
    });
    list.addEventListener('dragleave', function(e){ if(!list.contains(e.relatedTarget)) list.querySelectorAll('.mc-recrow').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); }); });
    list.addEventListener('drop', function(e){
      var r = e.target.closest('.mc-recrow'); if(!r || dragI < 0) return;
      e.preventDefault();
      var rect = r.getBoundingClientRect(), below = e.clientY > rect.top + rect.height / 2, to = +r.dataset.i + (below ? 1 : 0);
      var marked = recAt >= 0 ? steps[recAt] : null;
      var moved = steps.splice(dragI, 1)[0];
      if(to > dragI) to--;
      steps.splice(to, 0, moved);
      if(marked){ recAt = steps.indexOf(marked); if(recAt === steps.length - 1) recAt = -1; }
      dragI = -1; revision++; clearMarks(); updateRecording();
    });
    list.addEventListener('dragend', function(){ dragI = -1; clearMarks(); });
  })();
  document.addEventListener('ency:action', function(e){
    if(!recording || recPaused) return;
    var d = e.detail;
    // the same parameter changed twice in a row keeps only the last value
    var at = recAt >= 0 ? recAt : steps.length - 1, last = steps[at];
    if(last && last.type === 'event' && last.label === d.label && last.op === d.op && d.label !== 'New operation' && d.label !== 'Calculate'){
      last.val = d.val; last.cmd = d.cmd;
    } else {
      steps.splice(at + 1, 0, {type:'event', label:d.label, val:d.val, cmd:d.cmd, op:d.op, ctl:d.ctl, opts:d.opts});
      if(recAt >= 0) recAt++;
    }
    selStep = -1; revision++; updateRecording();
  });
  $('mcRec').addEventListener('click', function(){ recording = true; recPaused = false; recAt = -1; updateRecording(); });
  $('mcRecPause').addEventListener('click', function(){ recPaused = !recPaused; updateRecording(); });
  $('mcRecStop').addEventListener('click', function(){
    recording = false; recPaused = false; recAt = -1;
    updateRecording();
  });
  // add / reorder / delete — "+ Command" is a menu of the six base commands; a pick adds the step at once
  function addCommand(type){
    // import / new go to the front, export / save to the end, the rest after the selection
    var st = base(type), at = steps.length;
    if(type === 'new') at = 0; else if(type === 'import') at = has('new') ? 1 : 0;
    else if(type !== 'export' && type !== 'save' && selStep >= 0) at = selStep + 1;
    steps.splice(at, 0, st); selStep = at; revision++; renderSteps();
  }
  $('mcAdd').addEventListener('click', function(e){
    e.stopPropagation(); if(recording) return;
    window.ENCY_MENU.show($('mcAdd').getBoundingClientRect(), SEQ.map(function(t){
      return {label:DEFS[t].label, cur:has(t), onPick:function(){ addCommand(t); }};
    }), $('mcAdd'), 200);
  });
  $('mcDel').addEventListener('click', function(){ steps.splice(selStep, 1); selStep = Math.min(selStep, steps.length - 1); revision++; renderSteps(); });
  function move(d){
    var to = selStep + d; if(to < 0 || to >= steps.length) return;
    var t = steps[to]; steps[to] = steps[selStep]; steps[selStep] = t; selStep = to; revision++; renderSteps();
  }
  $('mcUp').addEventListener('click', function(){ move(-1); });
  $('mcDown').addEventListener('click', function(){ move(1); });
  // name · new · save · saved list
  $('mcName').addEventListener('input', function(){ revision++; setValid(); });
  $('mcNew').addEventListener('click', function(){
    steps = []; selStep = -1; $('mcName').value = 'New macro'; revision++; renderSteps();
  });
  function renderSaved(){}
  function loadMacro(name, list){
    savedName = name; steps = list.map(function(s){ return Object.assign({}, s); }); selStep = -1;
    $('mcName').value = name; revision++; renderSteps();
  }
  // Open: recorded macros of this session, then a file on the computer (the pick is simulated)
  $('mcOpen').addEventListener('click', function(e){
    e.stopPropagation(); if(recording) return;
    var items = Object.keys(saved).map(function(n){
      return {label:n, pre:String(saved[n].length), cur:n === savedName, onPick:function(){ loadMacro(n, saved[n]); }};
    });
    if(items.length) items.unshift({head:'Recorded macros'});
    items.push({sep:true});
    items.push({label:'Open from file\u2026', onPick:function(){
      var name = 'Bracket_v3';
      saved[name] = [base('new'), base('import'), {type:'event', label:'New operation', val:'Pocket', cmd:'OP.CREATE "Pocket"', op:''}, base('calculate'), base('export')];
      loadMacro(name, saved[name]);
    }});
    window.ENCY_MENU.show($('mcOpen').getBoundingClientRect(), items, $('mcOpen'), 240);
  });
  $('mcSave').addEventListener('click', function(){
    var name = $('mcName').value.trim();
    if(!name){ $('mcName').focus(); return; }
    saved[name] = steps.map(function(s){ return Object.assign({}, s); }); savedName = name; renderSaved();
  });

  // ——— From project: turn the current project state into steps ———
  // Items follow the CAM menu: Machine setup · Setups & workpiece · Operations parameters ▸ (pick several) ·
  // Recognize feature · Ask CAM Agent. Steps go to the insertion point while recording, else after the selection.
  function treeNames(type){
    return Array.prototype.map.call(document.querySelectorAll('#tree .trow[data-type="' + type + '"] .rlabel span'), function(n){ return n.textContent; });
  }
  function insertSteps(list){
    if(!list.length) return;
    var at = recording ? (recAt >= 0 ? recAt + 1 : steps.length) : (selStep >= 0 ? selStep + 1 : steps.length);
    steps.splice.apply(steps, [at, 0].concat(list));
    if(recording && recAt >= 0) recAt += list.length; else if(!recording) selStep = at + list.length - 1;
    revision++;
    if(recording) updateRecording(); else renderSteps();
  }
  function fromProject(kind){
    var st = function(label, val, cmd, op){ return {type:'event', label:label, val:val, cmd:cmd, op:op || ''}; };
    if(kind === 'machine'){
      var m = treeNames('machine')[0] || 'Machine';
      insertSteps([st('Machine setup', m, 'MACHINE.SET "' + m + '"')]);
    }
    if(kind === 'setups'){
      var list = treeNames('setup').map(function(n){ return st('Setup', n, 'SETUP.CREATE "' + n + '"'); });
      list.push(st('Workpiece', 'From solid', 'STOCK.SET FROM_SOLID'));
      insertSteps(list);
    }
    if(kind === 'feature') insertSteps([st('Recognize features', 'Holes, pockets', 'FEATURE.RECOGNIZE ALL')]);
    if(kind === 'agent') insertSteps([st('Ask CAM Agent', '', 'AGENT.ASK "{ask}"')]);
  }
  // second level: the operations of the tree with check boxes, several at once
  var opPick = null;
  function closeOpPick(){ if(opPick){ opPick.remove(); opPick = null; } }
  function openOpPick(anchor, at){
    closeOpPick();
    var ops = treeNames('operation');
    opPick = document.createElement('div'); opPick.className = 'dd-menu mc-oppick';
    opPick.innerHTML = '<div class="dd-head">Operations parameters</div>' +
      (ops.length ? ops.map(function(n, i){
        return '<label class="mc-opitem"><span class="mc-check on" data-i="' + i + '"><span class="mc-checkbox"></span></span><span class="mc-opitem__t">' + esc(n) + '</span></label>';
      }).join('') : '<div class="mc-empty">No operations in the project.</div>') +
      '<div class="mc-opfoot"><button class="mc-button mc-link" data-act="all">All</button><button class="mc-button mc-link" data-act="none">None</button>' +
      '<span class="mc-spacer"></span><button class="mc-button mc-primary" data-act="add">Add ' + ops.length + '</button></div>';
    document.body.appendChild(opPick);
    var r = at || anchor.getBoundingClientRect(), m = fpMenu ? fpMenu.getBoundingClientRect() : r;
    // beside the level-1 item, level 2 overlaps the menu edge by 2px; flips to the left near the screen edge
    var left = m.right - 2; if(left + opPick.offsetWidth > innerWidth - 8) left = m.left + 2 - opPick.offsetWidth;
    opPick.style.left = Math.max(8, left) + 'px';
    opPick.style.top = Math.max(8, Math.min(r.top - 4, innerHeight - opPick.offsetHeight - 8)) + 'px';
    function count(){ var n = opPick.querySelectorAll('.mc-check.on').length; opPick.querySelector('[data-act="add"]').textContent = 'Add ' + n; opPick.querySelector('[data-act="add"]').disabled = !n; }
    opPick.addEventListener('click', function(e){
      e.stopPropagation();
      var c = e.target.closest('.mc-opitem'); if(c){ c.querySelector('.mc-check').classList.toggle('on'); count(); return; }
      var a = e.target.closest('[data-act]'); if(!a) return;
      if(a.dataset.act === 'all' || a.dataset.act === 'none'){ opPick.querySelectorAll('.mc-check').forEach(function(x){ x.classList.toggle('on', a.dataset.act === 'all'); }); count(); return; }
      var picked = Array.prototype.map.call(opPick.querySelectorAll('.mc-check.on'), function(x){ return ops[+x.dataset.i]; });
      closeFpMenu();
      var list = [];
      picked.forEach(function(n){
        // the operation with its current parameter set, as the project has it now
        list.push({type:'event', label:'New operation', val:n, cmd:'OP.CREATE "' + n + '"', op:''});
        list.push({type:'event', label:'Operation parameters', val:'Current values', cmd:'OP.PARAMS FROM_PROJECT "' + n + '"', op:n});
      });
      insertSteps(list);
    });
  }
  document.addEventListener('click', closeOpPick);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeOpPick(); });
  // cascading menu: level 1 stays open while level 2 (the operations picker) is out to the right
  var fpMenu = null;
  function closeFpMenu(){ if(fpMenu){ fpMenu.remove(); fpMenu = null; } closeOpPick(); }
  function fromProjectMenu(anchor){
    if(fpMenu){ closeFpMenu(); return; }
    window.ENCY_MENU.close();
    var ITEMS = [
      {id:'machine', label:'Machine setup'},
      {id:'setups',  label:'Setups & workpiece'},
      {id:'ops',     label:'Operations parameters', sub:true},
      {sep:true},
      {id:'feature', label:'Recognize feature'},
      {id:'agent',   label:'Ask CAM Agent'}
    ];
    fpMenu = document.createElement('div'); fpMenu.className = 'dd-menu mc-fpmenu';
    fpMenu.innerHTML = ITEMS.map(function(it){
      if(it.sep) return '<div class="dd-sep"></div>';
      return '<div class="dd-opt' + (it.sub ? ' has-sub' : '') + '" data-id="' + it.id + '">' + it.label +
        (it.sub ? '<svg class="dd-sub" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2.5 6 6l-3.5 3.5"/></svg>' : '') + '</div>';
    }).join('');
    document.body.appendChild(fpMenu);
    fpMenu.style.minWidth = '200px';
    var r = anchor.getBoundingClientRect();
    fpMenu.style.left = Math.max(8, Math.min(r.left, innerWidth - fpMenu.offsetWidth - 8)) + 'px';
    fpMenu.style.top = (r.bottom + 2 + fpMenu.offsetHeight > innerHeight - 8 ? r.top - 2 - fpMenu.offsetHeight : r.bottom + 2) + 'px';
    var subItem = fpMenu.querySelector('.has-sub');
    function openSub(){
      if(opPick) return;
      fpMenu.querySelectorAll('.dd-opt').forEach(function(o){ o.classList.remove('cur'); });
      subItem.classList.add('cur');
      openOpPick(anchor, subItem.getBoundingClientRect());
    }
    subItem.addEventListener('mouseenter', openSub);
    fpMenu.addEventListener('mouseenter', function(e){
      // hovering another level-1 item closes level 2
      var o = e.target.closest && e.target.closest('.dd-opt'); if(o && o !== subItem) closeOpPick();
    }, true);
    fpMenu.addEventListener('click', function(e){
      e.stopPropagation();
      var o = e.target.closest('.dd-opt'); if(!o) return;
      if(o === subItem){ openSub(); return; }
      var id = o.dataset.id; closeFpMenu(); fromProject(id);
    });
  }
  document.addEventListener('click', closeFpMenu);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeFpMenu(); });
  $('mcFromProj').addEventListener('click', function(e){ e.stopPropagation(); fromProjectMenu($('mcFromProj')); });
  $('mcFromProjRec').addEventListener('click', function(e){ e.stopPropagation(); fromProjectMenu($('mcFromProjRec')); });

  // ——— Batch run ———
  function refreshBatch(){
    if(batchMacro && !saved[batchMacro]) batchMacro = '';
    $('mcBatchMacro').querySelector('.dd-t').textContent = batchMacro || 'Current macro \u00b7 ' + ($('mcName').value.trim() || 'Untitled');
    var bs = batchSteps();
    $('mcBatchMacroInfo').textContent = bs.length ? bs.length + (bs.length === 1 ? ' step' : ' steps') +
      (bs.some(function(x){ return x.type === 'import'; }) ? '' : ' \u00b7 no \u201cImport 3D model\u201d step') : 'The macro has no steps yet.';
    var files = visibleFiles(), chosen = chosenFiles();
    $('mcFiles').innerHTML = files.length ? files.map(function(f){
      return '<div class="mc-file' + (excluded[f.id] ? ' off' : '') + '" data-file="' + f.id + '">' +
        '<span class="mc-check' + (excluded[f.id] ? '' : ' on') + '"><span class="mc-checkbox"></span></span>' +
        '<span class="mc-file-name">' + esc(f.name) + '</span><span class="mc-file-size">' + f.size + '</span></div>';
    }).join('') : '<div class="mc-empty">No models of the chosen format.</div>';
    $('mcFileCount').textContent = 'Selected ' + chosen.length + ' of ' + files.length;
    updatePreview();
  }
  function updatePreview(){
    var chosen = chosenFiles(), name = chosen.length ? stem(chosen[0]) : 'Model_name', dest = outDir();
    $('mcPrevPath').textContent = (dest || 'Results folder') + '\\' + (perModel ? name + '\\' : '');
    $('mcPrevProj').textContent = name + ' \u00b7 CAM project';
    $('mcPrevNc').textContent = name + '.nc';
    $('mcBatchSum').textContent = 'Models: ' + chosen.length + ' \u00b7 project + NC for each';
    $('mcStartLabel').textContent = 'Run (' + chosen.length + ')';
    var bs = batchSteps();
    var err = (recording ? 'Finish recording before running.' : '') || (!bs.length ? 'The chosen macro has no steps.' : '') ||
      (!$('mcSrc').value.trim() ? 'Specify the folder with models.' : '') ||
      (!dest ? 'Specify the results folder.' : '') || (!chosen.length ? 'Select at least one model.' : '') ||
      (!bs.some(function(x){ return x.type === 'import'; }) ? 'The macro has no \u201cImport 3D model\u201d step \u2014 add it on the Macro tab to run over a folder.' : '');
    $('mcBatchErr').textContent = err; $('mcBatchErr').hidden = !err;
    $('mcStart').disabled = !!err; $('mcTest').disabled = !!err;
  }
  $('mcSrcChoose').addEventListener('click', function(){ $('mcSrcPicker').hidden = !$('mcSrcPicker').hidden; });
  $('mcSrcPicker').addEventListener('click', function(e){
    var c = e.target.closest('.mc-folder-choice'); if(!c) return;
    var r = c.querySelector('.mc-radio');
    $('mcSrcPicker').querySelectorAll('.mc-radio').forEach(function(x){ x.classList.toggle('on', x === r); });
  });
  $('mcApplySrc').addEventListener('click', function(){
    group = $('mcSrcPicker').querySelector('.mc-radio.on').dataset.folder; excluded = {};
    $('mcSrc').value = FOLDERS[group]; $('mcSrcPicker').hidden = true; refreshBatch();
  });
  $('mcDstChoose').addEventListener('click', function(){ $('mcDstPath').value = $('mcDst').value; $('mcDstPicker').hidden = !$('mcDstPicker').hidden; });
  $('mcApplyDst').addEventListener('click', function(){ $('mcDst').value = $('mcDstPath').value; $('mcDstPicker').hidden = true; updatePreview(); });
  $('mcDst').addEventListener('input', updatePreview);
  $('mcRecursive').addEventListener('click', function(){ recursive = !recursive; $('mcRecursive').classList.toggle('on', recursive); refreshBatch(); });
  $('mcPerModel').addEventListener('click', function(){ perModel = !perModel; $('mcPerModel').classList.toggle('on', perModel); updatePreview(); });
  $('mcFormat').addEventListener('click', function(e){ e.stopPropagation(); menu($('mcFormat'), $('mcFormat').dataset.opts.split('|'), format, function(o){ format = o; $('mcFormat').querySelector('.dd-t').textContent = o; refreshBatch(); }); });
  $('mcCollision').addEventListener('click', function(e){ e.stopPropagation(); menu($('mcCollision'), $('mcCollision').dataset.opts.split('|'), collision, function(o){ collision = o; $('mcCollision').querySelector('.dd-t').textContent = o; updatePreview(); }); });
  $('mcErrPolicy').addEventListener('click', function(e){ e.stopPropagation(); menu($('mcErrPolicy'), $('mcErrPolicy').dataset.opts.split('|'), errPolicy, function(o){ errPolicy = o; $('mcErrPolicy').querySelector('.dd-t').textContent = o; updatePreview(); }); });
  $('mcFiles').addEventListener('click', function(e){
    var f = e.target.closest('.mc-file'); if(!f) return;
    var id = f.dataset.file; if(excluded[id]) delete excluded[id]; else excluded[id] = true; refreshBatch();
  });
  $('mcBatchMacro').addEventListener('click', function(e){
    e.stopPropagation();
    var items = [{label:'Current macro \u00b7 ' + ($('mcName').value.trim() || 'Untitled'), pre:String(steps.length), cur:!batchMacro, onPick:function(){ batchMacro = ''; refreshBatch(); }}];
    var names = Object.keys(saved);
    if(names.length){ items.push({sep:true}); items.push({head:'Recorded macros'}); }
    names.forEach(function(n){ items.push({label:n, pre:String(saved[n].length), cur:n === batchMacro, onPick:function(){ batchMacro = n; refreshBatch(); }}); });
    window.ENCY_MENU.show($('mcBatchMacro').getBoundingClientRect(), items, $('mcBatchMacro'), $('mcBatchMacro').offsetWidth);
  });
  $('mcEditMacro').addEventListener('click', function(){
    if(batchMacro && saved[batchMacro]) loadMacro(batchMacro, saved[batchMacro]);
    view('macro');
  });

  // ——— Execution ———
  function snapshot(){
    return {src:$('mcSrc').value.trim(), out:outDir(), perModel:perModel, collision:collision, errPolicy:errPolicy,
      steps:batchSteps().map(function(s){ return Object.assign({}, s); }), macro:batchName(), revision:revision};
  }
  function allocate(f, cfg, occupied){
    var name = stem(f), v = 1;
    var keyFor = function(n){ return cfg.out + '\\' + (cfg.perModel ? n + '\\' : '') + n; };
    if(occupied[keyFor(name)] && cfg.collision === 'Skip the model') return {name:name, key:keyFor(name), skip:true};
    if(cfg.collision === 'Add version number'){ while(occupied[keyFor(name)]) name = stem(f) + '_v' + (++v); }
    return {name:name, key:keyFor(name), skip:false};
  }
  function log(msg){
    var n = run.logs.length;
    run.logs.push({time:String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'), msg:msg});
  }
  function stepName(cfg, i){ var s = cfg.steps[Math.min(i, cfg.steps.length - 1)]; return s.label + (s.type === 'event' && s.val ? ' ' + s.val : ''); }
  function projectName(){ var t = document.querySelector('.htab.active .htab-t'); return t ? t.textContent : 'Open project'; }
  function startRun(test, retry, single){
    clearTimeout(timer);
    var prior = run, cfg = retry ? prior.cfg : snapshot();
    if(single && !retry) cfg = Object.assign({}, cfg, {steps:steps.map(function(x){ return Object.assign({}, x); }), macro:$('mcName').value});
    if(test) cfg = Object.assign({}, cfg, {out:cfg.out + '\\Test run'});
    var files = retry ? prior.items.filter(function(i){ return i.state === 'error'; }).map(function(i){ return i.file; })
                      : single ? [{id:'cur', name:projectName(), size:'', type:'project', sub:false}]
                      : (test ? chosenFiles().slice(0, 1) : chosenFiles());
    if(!files.length) return;
    var occupied = Object.assign({}, existing);
    var items = files.map(function(file){
      var r = allocate(file, cfg, occupied); occupied[r.key] = true;
      return {file:file, name:r.name, key:r.key, skip:r.skip, state:r.skip ? 'skipped' : 'queued', step:0, detail:''};
    });
    run = {cfg:cfg, items:items, status:'running', index:0, logs:[], test:test || !!(retry && prior.test),
      single:single || !!(retry && prior.single), pendingError:false};
    tabBtn('run').disabled = false; lock(true); view('run');
    $('mcModels').hidden = !!run.single; // one project — no model queue
    log(run.single ? 'Started the macro on \u201c' + files[0].name + '\u201d.' : 'Started a ' + (run.test ? 'test' : 'batch') + ' run. Models: ' + files.length + '.');
    renderRun(); timer = setTimeout(tick, 600);
  }
  function finish(status){ run.status = status; clearTimeout(timer); lock(false); renderRun(); }
  var isDone = function(i){ return i.state === 'done' || i.state === 'error' || i.state === 'skipped'; };
  function tick(){
    if(!run || ['running', 'pausing', 'stopping'].indexOf(run.status) < 0) return;
    while(run.index < run.items.length && isDone(run.items[run.index])) run.index++;
    if(run.index >= run.items.length){ log('Processing finished.'); finish('completed'); return; }
    var item = run.items[run.index];
    item.state = 'running';
    var next = run.cfg.steps[item.step];
    if(next && isParam(next) && !next.val && !run.pendingError){
      run.status = 'paused'; run.needInput = item.step; run.atBp = false;
      log(item.file.name + ': \u201c' + next.label + '\u201d has no value \u2014 waiting for input.');
      renderRun(); return;
    }
    if(next && next.bp && item.bpSeen !== item.step && !run.pendingError){
      item.bpSeen = item.step; run.status = 'paused'; run.atBp = true;
      log(item.file.name + ': breakpoint before \u201c' + stepName(run.cfg, item.step) + '\u201d.');
      renderRun(); return;
    }
    run.atBp = false;
    if(run.pendingError){
      run.pendingError = false; item.state = 'error';
      item.detail = 'Error in step \u201c' + stepName(run.cfg, item.step) + '\u201d.';
      log(item.file.name + ': ' + item.detail + ' Result set not saved.');
      run.index++;
      if(run.cfg.errPolicy === 'Stop the batch'){ run.items.forEach(function(i){ if(i.state === 'queued') i.state = 'notrun'; }); finish('error'); return; }
    } else {
      log(item.file.name + ' \u2014 ' + stepName(run.cfg, item.step));
      item.step++;
      if(item.step >= run.cfg.steps.length){ item.state = 'done'; if(!run.single) existing[item.key] = true; log(item.file.name + (run.single ? ': macro applied.' : ': results saved.')); run.index++; }
    }
    if(run.status === 'stopping'){
      if(item.state === 'running'){ item.state = 'interrupted'; item.detail = 'Stopped after the current step. Result set not saved.'; }
      run.items.forEach(function(i){ if(i.state === 'queued') i.state = 'notrun'; });
      log('Batch stopped by the user.'); finish('stopped'); return;
    }
    if(run.index >= run.items.length || run.items.every(isDone)){ log('Processing finished.'); finish('completed'); return; }
    if(run.status === 'pausing'){ run.status = 'paused'; log('Paused between commands.'); renderRun(); return; }
    renderRun(); timer = setTimeout(tick, 650);
  }
  var STATE_TXT = {queued:'Queued', running:'Running', paused:'Paused', done:'Done', error:'Error', skipped:'Skipped', notrun:'Not run', interrupted:'Stopped'};
  var STATE_ICN = {queued:'status.svg', running:'status-prog1.svg', paused:'status-prog2.svg', done:'status-done.svg', error:'status-error.svg',
                   skipped:'status-warn.svg', notrun:'status.svg', interrupted:'st-stop.svg'};
  var TITLES = {running:'Processing models', pausing:'Pausing after the current step\u2026', paused:'Execution paused', stopping:'Stopping after the current step\u2026',
                completed:'Processing finished', error:'Stopped because of an error', stopped:'Batch stopped'};
  function renderRun(){
    var total = run.items.length, done = 0, errors = 0, skipped = 0, sum = 0;
    run.items.forEach(function(i){
      if(i.state === 'done') done++; if(i.state === 'error') errors++; if(i.state === 'skipped') skipped++;
      sum += isDone(i) ? 1 : i.step / run.cfg.steps.length;
    });
    var finished = ['completed', 'error', 'stopped'].indexOf(run.status) >= 0, current = run.items[run.index];
    var asking = run.status === 'paused' && run.needInput != null;
    $('mcRunTitle').textContent = run.status === 'completed' && errors ? 'Finished with errors'
      : asking ? 'Input required \u00b7 step ' + (run.needInput + 1)
      : run.status === 'paused' && run.atBp ? 'Breakpoint \u00b7 step ' + ((current ? current.step : 0) + 1) : TITLES[run.status];
    $('mcRunMode').textContent = run.single ? 'Open project' : run.test ? 'Test on 1 model' : 'Batch';
    $('mcProgBar').style.width = Math.round(100 * sum / total) + '%';
    $('mcRunCaption').textContent = finished ? (run.single ? (errors ? 'Finished with an error' : 'Macro applied to ' + run.items[0].file.name) : 'Done: ' + done + ' \u00b7 errors: ' + errors + ' \u00b7 skipped: ' + skipped)
      : current ? current.file.name + ' \u00b7 ' + stepName(run.cfg, current.step) : 'Finishing';
    $('mcRunCounter').textContent = run.single ? '' : (done + errors + skipped) + ' / ' + total;
    // macro steps of the current model
    var item = finished ? (run.items.filter(function(i){ return i.state !== 'skipped'; }).pop() || run.items[0]) : current;
    var stepAt = item ? (finished && item.state === 'done' ? run.cfg.steps.length : item.step) : 0;
    $('mcRunStepsHead').textContent = item ? item.file.name + ' \u00b7 ' + Math.min(stepAt, run.cfg.steps.length) + ' / ' + run.cfg.steps.length : '';
    $('mcRunSteps').innerHTML = run.cfg.steps.map(function(st, i){
      var state = i < stepAt ? 'done' : i === stepAt && !finished ? (run.status === 'paused' ? 'paused' : 'running') : 'pending';
      if(item && item.state === 'error' && i === item.step) state = 'error';
      var ask = asking && i === run.needInput;
      if(ask) state = 'ask';
      var icn = state === 'done' ? 'status-done.svg' : state === 'running' ? 'status-prog1.svg' : state === 'paused' || state === 'ask' ? 'status-prog2.svg' : state === 'error' ? 'status-error.svg' : 'status.svg';
      return '<div class="mc-runstep ' + state + (st.bp ? ' bp' : '') + '"><img class="i16" src="assets/' + icn + '" alt="">' +
        '<span class="mc-command-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="mc-runstep__l">' + esc(st.label) + (st.type === 'event' && st.op && st.label !== 'New operation' && st.label !== 'Calculate' ? ' \u00b7 ' + esc(st.op) : '') + '</span>' +
        (ask ? (st.ctl === 'toggle'
                 ? '<span class="mc-runstep__pick" id="mcRunPick"><button class="mc-button" data-v="On">On</button><button class="mc-button" data-v="Off">Off</button></span>'
               : st.ctl === 'dropdown'
                 ? '<span class="mc-select mc-command-dd mc-runstep__dd" id="mcRunPick"><span class="dd-t mc-askval">Choose\u2026</span><svg viewBox="0 0 8 5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l3 3 3-3"/></svg></span>'
                 : '<input class="mc-command-input mc-runstep__in" id="mcRunInput" placeholder="Enter a value" spellcheck="false">')
             : '<span class="mc-runstep__v">' + (isParam(st) && !st.val ? 'Ask when run' : esc(st.val)) + '</span>') +
        (st.bp ? '<span class="mc-runstep__bp" title="Breakpoint"></span>' : '') + '</div>';
    }).join('');
    var curRow = $('mcRunSteps').querySelector('.running, .paused, .ask'); if(curRow) curRow.scrollIntoView({block:'nearest'});
    var runIn = $('mcRunInput'); if(runIn && document.activeElement !== runIn) setTimeout(function(){ runIn.focus(); }, 0);
    $('mcModelsSum').textContent = (done + errors + skipped) + ' / ' + total + (current && !finished ? ' \u00b7 now: ' + current.file.name : '');
    $('mcQueue').innerHTML = run.items.map(function(i){
      var st = i.state === 'running' && run.status === 'paused' ? 'paused' : i.state;
      var path = run.cfg.out + '\\' + (run.cfg.perModel ? i.name + '\\' : '');
      var detail = i.state === 'done' ? path + ' \u00b7 ' + i.name + ' (CAM project) + ' + i.name + '.nc'
        : i.detail || (i.state === 'running' ? 'Step ' + Math.min(i.step + 1, run.cfg.steps.length) + ' of ' + run.cfg.steps.length : i.state === 'skipped' ? 'Result already exists.' : '');
      return '<div class="mc-queue-row ' + i.state + '"><img class="i16" src="assets/' + STATE_ICN[st] + '" alt="">' +
        '<div class="mc-queue-name">' + esc(i.file.name) + '<div class="mc-queue-detail">' + esc(detail) + '</div></div>' +
        '<span class="mc-state-text mc-status-' + i.state + '">' + STATE_TXT[st] + '</span></div>';
    }).join('');
    $('mcLogB').innerHTML = run.logs.map(function(l){ return '<div class="mc-log-line"><span>' + l.time + '</span><span>' + esc(l.msg) + '</span></div>'; }).join('');
    $('mcPause').hidden = finished; $('mcStopRun').hidden = finished; $('mcInjectErr').hidden = finished;
    $('mcPause').disabled = run.status === 'pausing' || run.status === 'stopping' || (asking && !run.pendingVal && !(($('mcRunInput') || {}).value || '').trim());
    $('mcStopRun').disabled = run.status === 'stopping';
    $('mcInjectErr').disabled = run.pendingError || run.status === 'stopping';
    $('mcPauseLabel').textContent = asking ? 'Apply and continue' : run.status === 'paused' ? 'Continue' : 'Pause';
    $('mcRetry').hidden = !finished || !errors;
    $('mcRunErr').hidden = !errors;
    $('mcRunErr').textContent = 'Models with errors: ' + errors + '. Their NC is not part of the finished results. See the log for causes.';
  }
  $('mcStart').addEventListener('click', function(){ startRun(false, false); });
  $('mcRunOnce').addEventListener('click', function(){ if(validation()) return; startRun(false, false, true); });
  $('mcTest').addEventListener('click', function(){ startRun(true, false); });
  $('mcToSettings').addEventListener('click', function(){ view(run && run.single ? 'macro' : 'batch'); });
  $('mcPause').addEventListener('click', function(){
    if(run.status === 'paused'){
      if(run.needInput != null){
        var v = run.pendingVal || (($('mcRunInput') || {}).value || '').trim(); run.pendingVal = null; if(!v) return;
        var st = run.cfg.steps[run.needInput]; st.val = v; // for this run only — the macro keeps asking next time
        log('\u201c' + st.label + '\u201d = ' + v); run.needInput = null;
      }
      run.status = 'running'; log(run.atBp ? 'Continued from the breakpoint.' : 'Resumed.'); run.atBp = false; renderRun(); timer = setTimeout(tick, 600);
    }
    else { run.status = 'pausing'; renderRun(); }
  });
  $('mcStopRun').addEventListener('click', function(){
    if(run.status === 'paused'){
      var i = run.items[run.index];
      if(i && i.state === 'running'){ i.state = 'interrupted'; i.detail = 'Stopped between commands.'; }
      run.items.forEach(function(x){ if(x.state === 'queued') x.state = 'notrun'; });
      log('Batch stopped by the user.'); finish('stopped');
    } else { run.status = 'stopping'; renderRun(); }
  });
  $('mcRunSteps').addEventListener('click', function(e){
    var pick = e.target.closest('#mcRunPick'); if(!pick || !run || run.needInput == null) return;
    e.stopPropagation();
    var st = run.cfg.steps[run.needInput];
    var apply = function(v){ run.pendingVal = v; $('mcPause').click(); };
    var b = e.target.closest('[data-v]'); if(b){ apply(b.dataset.v); return; }
    if(pick.classList.contains('mc-runstep__dd')){
      window.ENCY_MENU.show(pick.getBoundingClientRect(), (st.opts || []).map(function(o){ return {label:o, onPick:function(){ apply(o); }}; }), pick, pick.offsetWidth);
    }
  });
  $('mcRunSteps').addEventListener('input', function(e){
    if(e.target.id === 'mcRunInput') $('mcPause').disabled = !e.target.value.trim();
  });
  $('mcRunSteps').addEventListener('keydown', function(e){
    if(e.target.id === 'mcRunInput' && e.key === 'Enter' && e.target.value.trim()) $('mcPause').click();
  });
  $('mcInjectErr').addEventListener('click', function(){ run.pendingError = true; renderRun(); });
  $('mcRetry').addEventListener('click', function(){ startRun(false, true); });
  $('mcLogH').addEventListener('click', function(){ var o = $('mcLog').classList.toggle('open'); $('mcLogB').hidden = !o; });
  $('mcModelsH').addEventListener('click', function(){ var o = $('mcModels').classList.toggle('open'); $('mcQueue').hidden = !o; });

  // ——— open / close ———
  function open(){ panel.classList.add('open'); renderSteps(); refreshBatch(); renderSaved(); }
  function close(){ if(recording) return; panel.classList.remove('open'); } // the recording strip stays until Stop
  $('mcClose').addEventListener('click', function(e){ e.stopPropagation(); close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  // clicks inside the panel must not close it, but they do close an open dropdown menu
  panel.addEventListener('click', function(e){ e.stopPropagation(); window.ENCY_MENU.close(); closeFpMenu(); });

  // the shell's Utilities list calls this; ?utility=macro opens it on load (from the home area)
  window.ENCY_MACRO = {open:open, close:close, toggle:function(){ if(panel.classList.contains('open')) close(); else open(); }};
  try { if(new URLSearchParams(location.search).get('utility') === 'macro') open(); } catch(e){}
})();
