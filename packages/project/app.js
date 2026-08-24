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
    if(openMenu){ if(openMenu._owner) openMenu._owner.classList.remove('dd-open'); openMenu.remove(); openMenu = null; }
  }
  function showMenu(anchorRect, items, owner, minW){
    closeMenu();
    var menu = document.createElement('div'); menu.className = 'dd-menu'; menu._owner = owner || null;
    items.forEach(function(it){
      if(it.sep){ var s=document.createElement('div'); s.className='dd-sep'; menu.appendChild(s); return; }
      if(it.head){ var h=document.createElement('div'); h.className='dd-head'; h.textContent=it.head; menu.appendChild(h); return; }
      var o = document.createElement('div');
      o.className = 'dd-opt' + (it.cur ? ' cur' : '');
      if(it.pre){ var pr = document.createElement('span'); pr.className = 'dd-pre'; pr.textContent = it.pre; o.appendChild(pr); }
      if(it.color){ var sw = document.createElement('span'); sw.className = 'dd-sw'; sw.style.background = it.color; o.appendChild(sw); }
      if(it.pre || it.color){ o.appendChild(document.createTextNode(it.label)); }
      else { o.textContent = it.label; }
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

  /* ---------- Filters: open/close + chips + tree type-filter ---------- */
  var filters = document.getElementById('filters');
  var fhead = document.getElementById('filtersBtn');
  if(fhead) fhead.addEventListener('click', function(e){ e.stopPropagation(); filters.classList.toggle('open'); });
  var typeEnabled = { machine:true, setup:true, part:true, operation:true };
  document.querySelectorAll('.f-cell').forEach(function(c){
    c.addEventListener('click', function(e){
      e.stopPropagation();
      var on = c.classList.toggle('on');
      var ft = c.dataset.ftype;
      if(ft){ typeEnabled[ft] = on; renderTree(); }
    });
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
    Links: [
      {label:'Lead-in', ctl:'dropdown', val:'Arc'},
      {label:'Lead-out', ctl:'dropdown', val:'Arc'},
      {label:'Ramp', ctl:'toggle', on:true},
      {label:'Distance', ctl:'input', val:'005.000', indent:1}
    ],
    More: [
      {label:'Notes', ctl:'dropdown', val:'Text for example'},
      {label:'Visible', ctl:'toggle', on:true}
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
    var optsA  = p.opts  ? ' data-opts="'+p.opts.join('|')+'"'  : '';
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
    if(tab==='Tool'){ renderToolTab(); return; }
    titleCtl.innerHTML = '';
    irows.classList.remove('ro');
    var cfg = PARAMS[tab] || [];
    var list = Array.isArray(cfg) ? cfg : (cfg.rows || []);
    irows.innerHTML = '';
    list.forEach(function(p){ irows.appendChild(buildRow(p)); });
  }
  /* the title names the inspector tab; some tabs carry a fuller name */
  var TAB_TITLES = { Tool: 'Tool Assembly' };
  document.querySelectorAll('.rbtn[data-tab]').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.rbtn[data-tab]').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active');
      var tab = b.dataset.tab;
      if(tab){ toolState = 'view'; inspTitle.textContent = TAB_TITLES[tab] || tab; renderInspector(tab); }
    });
  });
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

  /* ---------- Inspector interactions (event delegation) ---------- */
  irows.addEventListener('click', function(e){
    var tgl = e.target.closest('.tgl');
    if(tgl){ e.stopPropagation(); var on = tgl.classList.toggle('on'); tgl.src = on ? A['tgl-on'] : A['tgl-off']; return; }
    /* .selbox is not a menu anymore — it navigates to the full-panel picker (data-act=pickAsm), so let it bubble */
    var dd = e.target.closest('.dropdown:not(.selbox)');
    if(dd){
      e.stopPropagation();
      if(openMenu && openMenu._owner === dd){ closeMenu(); return; }
      var v = dd.querySelector('.v');
      var opts = dd.dataset.opts ? dd.dataset.opts.split('|') : DD_OPTS.slice();
      if(opts.indexOf(v.textContent) < 0) opts = [v.textContent].concat(opts);
      var items = opts.map(function(o){ return {label:o, cur:o===v.textContent, onPick:function(){ v.textContent=o; }}; });
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
      ], null, 140);
      return;
    }
    var row = e.target.closest('.irow');
    if(row){ irows.querySelectorAll('.irow').forEach(function(x){x.classList.remove('sel');}); row.classList.add('sel'); }
  });

  renderInspector('Tool'); // initial

  /* ---------- Tree: visibility (collapse + type filter), select, drag ---------- */
  var tree = document.getElementById('tree');
  var rows = Array.prototype.slice.call(tree.querySelectorAll('.trow'));
  var collapsed = {};
  function rowById(id){ return rows.find(function(r){return r.dataset.id===id;}); }
  function isVisible(r){
    if(!typeEnabled[r.dataset.type]) return false;
    var p = r.dataset.parent;
    while(p){
      var pr = rowById(p);
      if(!pr) break;
      if(collapsed[p] || !typeEnabled[pr.dataset.type]) return false;
      p = pr.dataset.parent;
    }
    return true;
  }
  function renderTree(){
    rows.forEach(function(r){ r.style.display = isVisible(r) ? 'flex' : 'none'; });
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
    });
  }
  function bindRow(r){
    var chev = r.querySelector('.shev');
    if(r.dataset.expandable === '1' && chev){
      chev.classList.add('exp');
      chev.addEventListener('click', function(e){
        e.stopPropagation();
        var id = r.dataset.id;
        if(collapsed[id]){ delete collapsed[id]; r.classList.remove('collapsed'); }
        else { collapsed[id] = true; r.classList.add('collapsed'); }
        renderTree();
      });
    }
    r.addEventListener('click', function(){
      rows.forEach(function(x){x.classList.remove('tsel');});
      r.classList.add('tsel');
      // the inspector title names the inspector tab, not the selected node
    });
    bindDrag(r);
  }
  rows.forEach(bindRow);

  renderTree();

  /* ---------- Calculate ---------- */
  var EMPTY = A['status-empty'], P1 = A['status-prog1'], P2 = A['status-prog2'], DONE = A['status-done'];
  var calcBtn = document.querySelector('.b24.calc');
  if(calcBtn){
    calcBtn.addEventListener('click', function(){
      if(calcBtn.classList.contains('busy')) return;
      calcBtn.classList.add('busy');
      var stIcons = Array.prototype.slice.call(tree.querySelectorAll('.st'));
      stIcons.forEach(function(img){ img.src = EMPTY; });
      var step = 160, done = 0;
      stIcons.forEach(function(img, i){
        setTimeout(function(){ img.src = P1; }, i*step);
        setTimeout(function(){ img.src = P2; }, i*step + 200);
        setTimeout(function(){ img.src = DONE; if(++done === stIcons.length) calcBtn.classList.remove('busy'); }, i*step + 440);
      });
    });
  }

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
  function closeStatus(){ if(statusPanel) statusPanel.classList.remove('open'); }
  if(stpClose) stpClose.addEventListener('click', function(e){ e.stopPropagation(); closeStatus(); });
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
      var lbl = row ? row.querySelector('.rlabel span') : null;
      if(stpTitle && lbl) stpTitle.textContent = lbl.textContent;
      if(statusPanel) statusPanel.classList.add('open');
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
    r.innerHTML =
      '<div class="tlayer i2"><img class="shev" src="'+A['t-shev-leaf']+'" alt=""><span class="rlabel"><span>'+name+'</span></span></div>'+
      '<div class="pslot"><span class="toolno">T#7</span><span class="tlink"><span>Tool not assigned</span></span>'+
      '<span class="bicn"><img class="i16" src="'+A['opcolor']+'" alt=""></span>'+
      '<span class="bicn"><img class="i16 st" src="'+A['status-empty']+'" alt=""></span></div>';
    var siblings = rows.filter(function(x){ return x.dataset.parent === parentId; });
    var anchor = siblings.length ? siblings[siblings.length-1] : rowById(parentId);
    if(anchor) tree.insertBefore(r, anchor.nextSibling); else tree.appendChild(r);
    rows.push(r); bindRow(r); renderTree(); r.click();
    return r;
  }
  var addBtn = document.querySelector('.b24.more');
  var OP_TYPES = ['2D Contour','Pocket','Drilling','Adaptive Clearing','Parallel','Multiply Group'];
  if(addBtn){
    addBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var sel = tree.querySelector('.trow.tsel');
      var parent = 'part1';
      if(sel){ if(sel.dataset.type==='part') parent = sel.dataset.id; else if(sel.dataset.type==='operation') parent = sel.dataset.parent; }
      showMenu(addBtn.getBoundingClientRect(), OP_TYPES.map(function(t){
        return {label:t, onPick:function(){ createOperation(t, parent); }};
      }), addBtn, 160);
    });
  }

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

  /* ---------- Simulate tab: code tree + the simulation bar on the 3D view ---------- */
  /* per-operation posted code; shared groups (Header/Approach) expand in place */
  var SIM_OPS = [
    { name:'Lathe facing', color:'#ebda84', open:true, lines:[
      { t:'PPFUN: 58, 250, -0.297, -333.853, -1.524, 790.75, 0, 418.3…' },
      { t:'Header', grp:[
        'COMMENT: "Lathe facing"',
        'ORIGIN: G54 - MCS(X0, Y0, Z9.5, A0, B0, C0)',
        'LOADTL: #1 (0), H#-1, D#1',
        'COMMENT: "@CNMG 12 04 08-WF"',
        'PLANE: XY',
        'SPINDL: On, 199 rpm',
        'CUTCOM: LC#1 On, Left',
        'FROM: X0, Y460, Z412.396, Machine X0, Y5…' ] },
      { t:'Approach', grp:[ 'RAPID: 10000', 'MultiGOTO: X78.465, Y-45.956, Z105.311, B-…' ] },
      { t:'X42.64, Y0, Z2.959', c:'red' },
      { t:'PPRINT: "#KeyPoint: StartCutting"', key:true },
      { t:'RAPID: 10000', c:'red' },
      { t:'X42.64, Y0, Z0', c:'red' },
      { t:'COOLNT: On, #1' },
      { t:'F: WORK 0.5mm/rev.', c:'blue' },
      { t:'X-0.297, Y0, Z0', c:'blue' },
      { t:'X2.362, Y0, Z2.659', c:'blue' },
      { t:'PPFUN: 59, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' } ] },
    { name:'OD roughing', color:'#9584eb', lines:[
      { t:'PPFUN: 58, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' },
      { t:'Header', grp:[ 'COMMENT: "OD roughing"', 'LOADTL: #1 (0), H#-1, D#1', 'SPINDL: On, 240 rpm' ] },
      { t:'Approach', grp:[ 'RAPID: 10000', 'MultiGOTO: X64.2, Y0, Z96.4' ] },
      { t:'RAPID: 10000', c:'red' },
      { t:'X41.5, Y0, Z1.2', c:'red' },
      { t:'F: WORK 0.35mm/rev.', c:'blue' },
      { t:'X-0.297, Y0, Z1.2', c:'blue' },
      { t:'PPFUN: 59, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' } ] },
    { name:'OD grooving', color:'#84c9eb', lines:[
      { t:'PPFUN: 58, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' },
      { t:'Header', grp:[ 'COMMENT: "OD grooving"', 'LOADTL: #2 (0), H#-2, D#2', 'SPINDL: On, 180 rpm' ] },
      { t:'Approach', grp:[ 'RAPID: 10000', 'MultiGOTO: X44.0, Y0, Z-18.5' ] },
      { t:'RAPID: 10000', c:'red' },
      { t:'F: WORK 0.12mm/rev.', c:'blue' },
      { t:'X31.6, Y0, Z-18.5', c:'blue' },
      { t:'PPFUN: 59, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' } ] },
    { name:'OD finishing', color:'#ff7072', lines:[
      { t:'PPFUN: 58, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' },
      { t:'Header', grp:[ 'COMMENT: "OD finishing"', 'LOADTL: #3 (0), H#-3, D#3', 'SPINDL: On, 320 rpm' ] },
      { t:'Approach', grp:[ 'RAPID: 10000', 'MultiGOTO: X42.8, Y0, Z2.0' ] },
      { t:'F: WORK 0.15mm/rev.', c:'blue' },
      { t:'X-0.297, Y0, Z0', c:'blue' },
      { t:'PPFUN: 59, 250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0…' } ] }
  ];
  var simWrap = document.getElementById('simWrap');
  var simTree = document.getElementById('simTree');
  var simBar = document.getElementById('simBar');
  var simGrpOpen = {}; // "opIdx:lineIdx" → true

  // map collision times to their op/line so the code tree can flag them
  function simCollLines(){
    var m = {};
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
    h += '<div class="simrow sim-ind1"><img class="i16" src="assets/opcolor.svg" alt="">'+
      '<span class="lbl">Part</span>'+
      '<span class="bicn"><img class="i16" src="assets/status.svg" alt=""></span></div>';
    SIM_OPS.forEach(function(op, oi){
      h += '<div class="simrow op sim-ind2'+(op.open ? '' : ' closed')+(oi === simSel ? ' ssel' : '')+'" data-simop="'+oi+'">'+
        '<img class="shev" src="assets/t-shev-open.svg" alt="">'+
        '<img class="i16" src="assets/opcolor.svg" alt="">'+
        '<span class="lbl">'+op.name+'</span>'+
        '<span class="sim-ring" style="--cc:'+op.color+'"></span>'+
        '<span class="bicn"><img class="i16" src="assets/status.svg" alt=""></span></div>';
      if(op.open){
        op.lines.forEach(function(ln, li){
          var isCur = oi === simSel && li === simLine;
          var dot = '<span class="sim-dot'+(errLines[oi + ':' + li] ? ' err' : '')+'"></span>';
          if(ln.grp){
            var key = oi + ':' + li, on = simGrpOpen[key];
            h += '<div class="simrow grp sim-ind3'+(on ? '' : ' closed')+(isCur ? ' cur' : '')+'" data-simgrp="'+key+'">'+
              '<img class="shev" src="assets/t-shev-open.svg" alt="">'+
              '<span class="lbl">'+ln.t+'</span>'+dot+'</div>';
            if(on) ln.grp.forEach(function(s){
              h += '<div class="simrow code sim-ind4"><span class="lbl">'+s+'</span><span class="sim-dot"></span></div>';
            });
          } else {
            h += '<div class="simrow code sim-ind3'+(ln.c ? ' c-'+ln.c : '')+(isCur ? ' cur' : '')+'">'+
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
  simTree.addEventListener('click', function(e){
    var op = e.target.closest('[data-simop]');
    if(op){
      simSel = +op.dataset.simop; // the scope buttons act on this selection
      SIM_OPS[simSel].open = !SIM_OPS[simSel].open;
      simRender();
      return;
    }
    var g = e.target.closest('[data-simgrp]');
    if(g){ simGrpOpen[g.dataset.simgrp] = !simGrpOpen[g.dataset.simgrp]; simRender(); }
  });

  /* ---- the control bar: SPEED strip + reset / back / play / forward ----
     The strip sets the simulation speed by hand. Zooming into the 3D view
     auto-caps the speed at 25%; the hand-set value stays as ghost ticks and
     comes back as soon as the zoom returns. */
  var SIM_ZOOM_CAP = 25;    // % — auto-cap while zoomed in
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
    ssFill.style.width = eff + '%';
    ssKnob.style.left = eff + '%';
    ssTip.textContent = capped ? eff + '% · zoom' : eff + '%';
    ssGhost.hidden = !capped;
    ssGhost.style.left = simSpeedUser + '%';
    simSpeed.classList.toggle('capped', capped);
    var ssVal = document.getElementById('ssVal');
    if(ssVal){ ssVal.textContent = eff + '%'; ssVal.style.color = capped ? '#ebc14a' : ''; }
    simSpeed.title = 'Simulation speed: ' + eff + '%'
      + (capped ? ' (hand-set ' + simSpeedUser + '% returns after zoom out)' : '');
    simBar.classList.toggle('playing', simPlaying);
  }
  // click or drag sets the hand speed; detents snap at 25/50/75/100
  simSpeed.addEventListener('pointerdown', function(e){
    e.preventDefault();
    simSpeed.classList.add('dragging');
    simSpeed.setPointerCapture(e.pointerId);
    var set = function(ev){
      var r = simSpeed.getBoundingClientRect();
      var v = Math.max(5, Math.min(100, Math.round((ev.clientX - r.left) / r.width * 100)));
      [25, 50, 75, 100].forEach(function(d){ if(Math.abs(v - d) < 4) v = d; });
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
    if(simBar.hidden) return;
    e.preventDefault();
    vpZoom = Math.max(0.5, Math.min(4, vpZoom * (e.deltaY < 0 ? 1.12 : 0.9)));
    simZoomed = vpZoom > 1.15;
    simSync();
  }, {passive:false});
  /* ---- editor timeline + transport, stop conditions and status ---- */
  var SIM_DURS = [52, 128, 64, 96]; // seconds per operation, program order
  var SIM_TOTAL = SIM_DURS.reduce(function(a, b){ return a + b; }, 0);
  var SIM_TOOLS = ['T#1', 'T#1', 'T#2', 'T#3'];
  var SIM_TOOLNAMES = ['CNMG 12 04 08-WF/DCLNR 2020K-12', 'CNMG 12 04 08-WF/DCLNR 2020K-12',
    'N123G2-0300-0002-CM/RF123G079', 'DNMX 15 04 04-WF/DDJNR 2020K-15'];
  var SIM_BASE_RATE = 40;           // simulated seconds per real second at 100%
  var SIM_COLLISIONS = [92, 142];   // both inside OD roughing (demo)
  var SIM_KEYPOINTS = [8];          // PPRINT "#KeyPoint" in Lathe facing
  function simOpStart(i){ var s = 0; for(var k = 0; k < i; k++) s += SIM_DURS[k]; return s; }
  // tool changes happen where the next op takes a different tool
  var SIM_TOOLCHANGES = [];
  for(var ti = 1; ti < SIM_TOOLS.length; ti++)
    if(SIM_TOOLS[ti] !== SIM_TOOLS[ti - 1]) SIM_TOOLCHANGES.push(simOpStart(ti));
  // two setups: ops 0-1 run in Setup 1, ops 2-3 in Setup 2
  var SIM_SETUPS = [ {name:'Setup 1', op:0}, {name:'Setup 2', op:2} ];
  var simStopCfg = { collision:true, tool:true, key:false };
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
    // ruler: minute ticks (no time labels) + setup labels at their start
    var rh = '';
    for(var t = 60; t < SIM_TOTAL; t += 60)
      rh += '<i style="left:' + (t / SIM_TOTAL * 100) + '%"></i>';
    document.getElementById('tlRuler').innerHTML = rh;
    // track: clips + event markers + the playhead with a timecode tip
    var h = '';
    SIM_OPS.forEach(function(op, i){
      h += '<div class="clip" style="--cc:' + op.color + ';flex:' + SIM_DURS[i] + '"' +
        ' title="' + op.name + ' · ' + simFmt(SIM_DURS[i]) + '"><span>' + op.name + '</span></div>';
    });
    SIM_COLLISIONS.forEach(function(t){
      h += '<i class="tl-mark tl-mark--coll" style="left:' + (t / SIM_TOTAL * 100) + '%" title="Collision · ' + simFmt(t) + '"></i>';
    });
    var setupStarts = SIM_SETUPS.map(function(su){ return simOpStart(su.op); });
    // a tool change on a setup boundary is implied — don't double-mark it
    SIM_TOOLCHANGES.forEach(function(t){
      if(setupStarts.indexOf(t) !== -1) return;
      h += '<i class="tl-mark tl-mark--tool" style="left:' + (t / SIM_TOTAL * 100) + '%" title="Tool change · ' + simFmt(t) + '"></i>';
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
    var atColl = SIM_COLLISIONS.some(function(t){ return Math.abs(t - simT) < 0.3; });
    ph.classList.toggle('atcoll', atColl);
    simTl.classList.toggle('atcoll', atColl);
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
      if(ev.t > prev && ev.t <= next && simStopCfg[ev.type]){
        next = ev.t; simPlaying = false; break;
      }
    }
    simT = next;
    if(simT >= SIM_TOTAL) simPlaying = false;
    simTlSync();
    simSync();
    if(simPlaying) simRAF = requestAnimationFrame(simTick);
    else { simRAF = null; simLast = 0; }
  }
  function simPause(){ simPlaying = false; simLast = 0; simSync(); }
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

  /* stop conditions: a toggle menu on the chip */
  var STOP_OPTS = [
    { key:'collision', label:'Collision' },
    { key:'tool',      label:'Tool change' },
    { key:'key',       label:'Key point' }
  ];
  function stopsLbl(){
    var parts = [];
    if(simStopCfg.collision) parts.push('collision');
    if(simStopCfg.tool) parts.push('tool change');
    if(simStopCfg.key) parts.push('key point');
    document.getElementById('simStopsLbl').textContent =
      parts.length ? 'Pause: ' + parts.join(', ') : 'Pause: off';
  }
  document.getElementById('simStops').addEventListener('click', function(e){
    e.stopPropagation();
    var chip = this;
    showMenu(chip.getBoundingClientRect(), STOP_OPTS.map(function(o){
      return { pre: simStopCfg[o.key] ? '✓' : '', label:o.label, cur:simStopCfg[o.key],
        onPick:function(){ simStopCfg[o.key] = !simStopCfg[o.key]; stopsLbl(); } };
    }), chip, 150);
  });
  stopsLbl();

  /* collision badge: jump to the next collision (wraps around) */
  document.getElementById('sbColl').addEventListener('click', function(){
    var next = SIM_COLLISIONS.find(function(t){ return t > simT + 0.5; });
    simSeek(next != null ? next : SIM_COLLISIONS[0]);
    simPause();
    // reveal the collision in the code tree: open the op and scroll to the line
    if(!SIM_OPS[simSel].open){ SIM_OPS[simSel].open = true; simRender(); }
    var row = simTree.querySelector('.simrow.cur');
    if(row) row.scrollIntoView({block:'center'});
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
    var ls = simPop.querySelectorAll('.sp-lvl-labels span');
    for(var k = 0; k < ls.length; k++) ls[k].classList.toggle('on', k === i);
  }
  function spOpen(anchor){
    simPop.hidden = false;
    var r = anchor.getBoundingClientRect();
    var w = simPop.offsetWidth, h = simPop.offsetHeight;
    var left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
    // open ABOVE the simulation panel, never over it
    var barTop = simBar.getBoundingClientRect().top;
    var top = Math.max(8, barTop - h - 6);
    simPop.style.left = left + 'px';
    simPop.style.top = top + 'px';
  }
  ['simCfg'].forEach(function(id){
    var b = document.getElementById(id);
    if(b) b.addEventListener('click', function(e){
      e.stopPropagation();
      if(!simPop.hidden){ simPop.hidden = true; return; }
      closeMenu();
      spOpen(b);
    });
  });
  simPop.addEventListener('click', function(e){
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
  document.addEventListener('click', function(){ simPop.hidden = true; });

  function setSimMode(on){
    document.querySelector('.dock').classList.toggle('sim', on);
    document.querySelector('.panel-tree').classList.toggle('sim', on);
    simWrap.hidden = !on;
    simBar.hidden = !on;
    simTlWrap.hidden = !on;
    var dock = document.querySelector('.dock');
    if(on){
      simRender(); simSync(); simTlSync();
      // the sim panel spans the whole viewport width — pull the dock up
      // so the code panel ends above it instead of underneath
      dock.style.bottom = (simBar.offsetHeight + 8 + 8) + 'px';
    } else {
      dock.style.bottom = '';
      simPause();
    }
  }

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
    soMain.innerHTML =
      '<div class="so-card">'+
        '<div class="so-row"><span class="so-num">'+idx+'.</span>'+
        '<span class="so-name">'+name+'</span>'+
        '<span class="so-tag">'+(r.querySelector('.toolno')||{textContent:''}).textContent+'</span>'+
        '<span class="so-icons">'+icons+'</span></div>'+
        (toolEl ? '<div class="so-tool">'+toolEl.textContent+'</div>' : '')+
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
  if(dockResizer && panelTree && dockEl){
    var MIN_PANEL = 140; // min height for either panel
    // double-click toggles the single-operation mode
    dockResizer.addEventListener('dblclick', function(){
      setSingle(!dockEl.classList.contains('single'));
    });
    dockResizer.addEventListener('mousedown', function(e){
      if(dockEl.classList.contains('insp-collapsed') || dockEl.classList.contains('single')) return;
      e.preventDefault();
      dockResizer.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      function onMove(ev){
        var r = dockEl.getBoundingClientRect();
        var rezH = dockResizer.offsetHeight;
        var h = (ev.clientY - r.top) - rezH / 2; // tree height, resizer centered on cursor
        var maxH = r.height - rezH - MIN_PANEL;
        h = Math.max(MIN_PANEL, Math.min(maxH, h));
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
})();
