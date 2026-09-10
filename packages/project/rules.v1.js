// Approach / Return rules editor — the "Custom…" window of the Links tab.
// Self-contained module: local demo data (robot profile A1–A6 / E1–E2, two
// operations, rule fixtures), a draft per operation × mode, preview recalc,
// playback with stop events, and a static scene overlay on the 3D viewport.
// Entry point: window.arOpen('Approach' | 'Return').
(function(){
  'use strict';

  /* ============ demo data (section 12 of the spec) ============ */
  var PROFILE = {
    id:'robot', name:'Demo robot A1–A6 / E1–E2',
    axes:[
      {id:'A1', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'A2', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'A3', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'A4', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'A5', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'A6', unit:'°', min:-180, max:180, group:'Rotary axes'},
      {id:'E1', unit:'°', min:-90,  max:90,  group:'Rotary axes'},
      {id:'E2', unit:'°', min:-90,  max:90,  group:'Rotary axes'}
    ],
    calc:{PHYSICGOTO:true, LCS:true, SPLCS_ON:true, SPLCS_OFF:true, M0:true, M1:true} // GOTO / MULTIGOTO: no solver here
  };
  var TYPES = [
    {id:'GOTO',      label:'3-axes (GOTO)',                   kind:'motion'},
    {id:'MULTIGOTO', label:'Multiaxis (MULTIGOTO)',           kind:'motion'},
    {id:'PHYSICGOTO',label:'G53 physic axes (PHYSICGOTO)',    kind:'motion'},
    {id:'LCS',       label:'LCS/TCPM switch command',         kind:'event', note:'Switches the LCS/TCPM context. Demo: updates the "last context event" only, the pose stays.'},
    {id:'SPLCS_ON',  label:'Start point LCS enable command',  kind:'event', note:'Demo: sets startPointLcsEnabled = true. No coordinate transform is performed.'},
    {id:'SPLCS_OFF', label:'Start point LCS disable command', kind:'event', note:'Demo: sets startPointLcsEnabled = false. No coordinate transform is performed.'},
    {id:'M0',        label:'<Stop> command (M0)',             kind:'stop',  note:'Playback stops here. "Continue preview" steps past it.'},
    {id:'M1',        label:'<OpStop> command (M1)',           kind:'stop',  note:'Conditional stop. Honoured only while "Respect M1" is on.'}
  ];
  function typeOf(id){ for(var i=0;i<TYPES.length;i++) if(TYPES[i].id===id) return TYPES[i]; return TYPES[2]; }

  var SCREEN_POSE = {A1:5.153, A2:-78.774, A3:117.061, A4:24.299, A5:34.839, A6:-100.39, E1:0, E2:0};
  var RETURN_START = {A1:0, A2:-45, A3:90, A4:0, A5:45, A6:0, E1:15, E2:-10};
  var OPS = [
    {id:'op01', name:'Demo operation 01', auto:{A1:0,  A2:-65, A3:105, A4:0,  A5:30, A6:-60, E1:0, E2:0}},
    {id:'op02', name:'Demo operation 02', auto:{A1:10, A2:-55, A3:100, A4:15, A5:35, A6:-30, E1:0, E2:0}}
  ];
  var START = { Return: RETURN_START, Approach: SCREEN_POSE };

  var uid = 0;
  function nid(){ return 'c' + (++uid); }
  function axTarget(on, mode, value){ return {on:!!on, mode:mode||'fixed', value:(value==null?0:value)}; }
  function physic(spec){ // spec: {A1:{auto}|number|undefined}
    var axes = {};
    PROFILE.axes.forEach(function(a){
      var s = spec[a.id];
      if(s === undefined) axes[a.id] = axTarget(false,'fixed',0);
      else if(s === 'auto') axes[a.id] = axTarget(true,'auto',0);
      else axes[a.id] = axTarget(true,'fixed',s);
    });
    return {id:nid(), type:'PHYSICGOTO', axes:axes, origin:'rule'};
  }
  function ev(type){ return {id:nid(), type:type, origin:'rule'}; }
  function pick(obj, keys){ var o={}; keys.forEach(function(k){ o[k]=obj[k]; }); return o; }
  var A16 = ['A1','A2','A3','A4','A5','A6'];
  function returnDefault(){
    return [ physic({A1:'auto',A2:'auto',A3:'auto',A4:'auto',A5:'auto',A6:'auto'}),
             physic(pick(SCREEN_POSE, A16)),
             physic({E1:0, E2:0}) ];
  }
  function approachDefault(){
    return [ ev('SPLCS_ON'), physic(pick(RETURN_START, A16)), physic({E1:15, E2:-10}), ev('SPLCS_OFF') ];
  }
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function withNewIds(cmds){ return cmds.map(function(c){ var k = clone(c); k.id = nid(); return k; }); }

  // rule sources per mode: machine rules (named) + the three fixed variants
  var SOURCES = {
    Return: {
      machine:[{id:'mr-ret', name:'Return by default', cmds:returnDefault()}],
      previous: withNewIds(returnDefault().slice(1)),
      root: withNewIds(returnDefault()),
      short: [ physic(SCREEN_POSE) ]
    },
    Approach: {
      machine:[{id:'mr-app', name:'Approach by default', cmds:approachDefault()}],
      previous: withNewIds(approachDefault().slice(1,3)),
      root: withNewIds(approachDefault()),
      short: [ physic(RETURN_START) ]
    }
  };
  function sourceCmds(mode, binding){
    var S = SOURCES[mode];
    if(binding.source==='machine'){ for(var i=0;i<S.machine.length;i++) if(S.machine[i].id===binding.ruleId) return clone(S.machine[i].cmds); return []; }
    if(binding.source==='custom') return clone(binding.cmds || []);
    return clone(S[binding.source] || []);
  }
  function sourceLabel(mode, b){
    var S = SOURCES[mode];
    if(b.source==='machine'){ for(var i=0;i<S.machine.length;i++) if(S.machine[i].id===b.ruleId) return S.machine[i].name; }
    if(b.source==='previous') return 'From Previous';
    if(b.source==='root') return 'From Root';
    if(b.source==='short') return 'Short';
    if(b.source==='custom') return 'Operation custom rule';
    return '—';
  }
  function scopeLabel(mode, b){
    if(b.source==='machine') return 'Machine rule: ' + sourceLabel(mode, b);
    if(b.source==='custom') return 'Operation custom rule · based on ' + (b.baseName || '—');
    var src = b.source==='previous' ? 'previousRuleRef' : b.source==='root' ? 'rootRuleRef' : 'fixed short sequence';
    return sourceLabel(mode, b) + ' · demo fixture (' + src + ')';
  }

  /* ============ session state ============ */
  var mode = 'Return', opIdx = 0;
  var applied = {}, drafts = {};     // key op|mode → {binding, cmds}
  function key(){ return OPS[opIdx].id + '|' + mode; }
  function defaultBinding(m){ return {source:'machine', ruleId: SOURCES[m].machine[0].id}; }
  function ensure(){
    var k = key();
    if(!applied[k]){ var b = defaultBinding(mode); applied[k] = {binding:b, cmds:sourceCmds(mode, b)}; }
    if(!drafts[k]) drafts[k] = clone(applied[k]);
    return drafts[k];
  }
  function isDirty(){ var k = key(); return JSON.stringify(drafts[k]) !== JSON.stringify(applied[k]); }

  var selId = null;                    // selected command id
  var preview = null;                  // computed result
  var status = 'empty';                // ready | stale | calculating | error | unsupported | empty
  var statusMsg = '';
  var draftVer = 0, calcVer = 0, calcTimer = null;
  var respectM1 = true, speed = 1;
  var play = {on:false, t:0, raf:null, last:0, reason:null, passed:{}}; // t in demo seconds
  var manualPose = null;               // {A1..} when the pose is set by hand
  var snapVer = 0;
  var toast = '';

  /* ============ preview calculation ============ */
  function resolveAxis(t, op){ return t.mode==='auto' ? op.auto : null; }
  function compute(){
    var d = ensure(), op = OPS[opIdx];
    var res = {steps:[], errors:[], unsupported:[], flags:{splcs:false, lastCtx:'—'}};
    var pose = clone(START[mode]);
    var ctx = {splcs:false, lastCtx:'—'};
    var t = 0;
    d.cmds.forEach(function(c, i){
      var T = typeOf(c.type), step = {id:c.id, n:i+1, type:c.type, kind:T.kind, start:clone(pose), t0:t, err:null, moves:false};
      if(c.type==='PHYSICGOTO'){
        var end = clone(pose);
        PROFILE.axes.forEach(function(a){
          var tg = c.axes[a.id]; if(!tg || !tg.on) return;
          var v;
          if(tg.mode==='auto'){ v = op.auto[a.id]; if(typeof v !== 'number'){ step.err = a.id + ': auto value unresolved'; return; } }
          else { v = tg.value; if(typeof v !== 'number' || isNaN(v)){ step.err = a.id + ': not a number'; return; }
                 if(v < a.min || v > a.max){ step.err = a.id + ': out of demo range ' + a.min + '…' + a.max + a.unit; return; } }
          end[a.id] = v;
        });
        step.end = end; step.moves = JSON.stringify(end) !== JSON.stringify(pose);
        step.dur = 2.5; pose = end;
      } else if(c.type==='GOTO' || c.type==='MULTIGOTO'){
        step.end = clone(pose); step.dur = 0; step.unsupported = true;
        res.unsupported.push(step.n + ' · ' + T.label);
      } else {
        step.end = clone(pose); step.dur = (T.kind==='event') ? 0.5 : 0;
        if(c.type==='LCS') ctx.lastCtx = 'LCS/TCPM switch at step ' + step.n;
        if(c.type==='SPLCS_ON') ctx.splcs = true;
        if(c.type==='SPLCS_OFF') ctx.splcs = false;
      }
      step.ctx = clone(ctx);
      step.t1 = t + step.dur; t = step.t1;
      if(step.err) res.errors.push('Step ' + step.n + ' — ' + step.err);
      res.steps.push(step);
    });
    res.total = t; res.final = pose; res.flags = ctx;
    return res;
  }
  function scheduleCalc(){
    draftVer++;
    stopPlay('edit');
    status = 'stale'; statusMsg = 'Settings changed. Preview needs an update';
    render();
    clearTimeout(calcTimer);
    var v = draftVer;
    calcTimer = setTimeout(function(){
      status = 'calculating'; statusMsg = 'Recalculating preview…'; render();
      setTimeout(function(){
        if(v !== draftVer) return;              // a newer draft superseded this run
        calcVer = v; finishCalc();
      }, 450);
    }, 300);
  }
  function finishCalc(){
    var d = ensure();
    if(!d.cmds.length){ preview = null; status = 'empty'; statusMsg = 'Add the first step'; }
    else {
      preview = compute();
      if(preview.errors.length){ status = 'error'; statusMsg = preview.errors[0]; }
      else if(preview.unsupported.length){ status = 'unsupported'; statusMsg = 'No pose solver in this demo profile for: ' + preview.unsupported.join(', '); }
      else { status = 'ready'; statusMsg = 'Preview matches the current draft'; }
    }
    play.t = 0; play.passed = {}; play.reason = null;
    if(selId && preview){ var s = stepById(selId); if(s) play.t = s.t1; }
    render();
  }
  function stepById(id){ if(!preview) return null; for(var i=0;i<preview.steps.length;i++) if(preview.steps[i].id===id) return preview.steps[i]; return null; }
  function canRun(){ return status==='ready' && preview && preview.total > 0; }

  /* ============ playback ============ */
  function poseAt(t){
    if(!preview) return clone(START[mode]);
    var steps = preview.steps;
    for(var i=0;i<steps.length;i++){
      var s = steps[i];
      if(t <= s.t1 || i === steps.length-1){
        if(s.kind!=='motion' || !s.dur || t <= s.t0) return clone(t <= s.t0 ? s.start : s.end);
        var k = Math.max(0, Math.min(1, (t - s.t0) / s.dur)), p = {};
        PROFILE.axes.forEach(function(a){ p[a.id] = s.start[a.id] + (s.end[a.id] - s.start[a.id]) * k; });
        return p;
      }
    }
    return clone(preview.final);
  }
  function stepAt(t){
    if(!preview) return null;
    var steps = preview.steps;
    for(var i=0;i<steps.length;i++) if(t <= steps[i].t1) return steps[i];
    return steps[steps.length-1] || null;
  }
  function stopPlay(reason){ play.on = false; play.last = 0; if(reason) play.reason = reason; }
  function startPlay(fromStart){
    if(!canRun()) return;
    if(fromStart || play.t >= preview.total){ play.t = 0; play.passed = {}; }
    play.on = true; play.reason = null; play.last = 0;
    if(!play.raf) play.raf = requestAnimationFrame(tick);
    render();
  }
  function tick(ts){
    if(!play.on){ play.raf = null; return; }
    var dt = play.last ? (ts - play.last) / 1000 : 0; play.last = ts;
    var prev = play.t, next = Math.min(preview.total, play.t + dt * speed);
    // stop events crossed on this frame
    for(var i=0;i<preview.steps.length;i++){
      var s = preview.steps[i];
      if(s.kind!=='stop' || play.passed[s.id]) continue;
      if(s.t0 > prev - 1e-9 && s.t0 <= next + 1e-9){
        if(s.type==='M0' || (s.type==='M1' && respectM1)){
          next = s.t0; play.passed[s.id] = true; play.on = false;
          play.reason = s.type; play.stopStep = s; break;
        } else { play.passed[s.id] = 'skipped'; }
      }
    }
    play.t = next;
    if(play.t >= preview.total){ play.on = false; play.reason = 'end'; }
    var cur = stepAt(play.t); if(cur) selId = cur.id;
    renderScene(); renderPlayback(); renderList();
    if(play.on) play.raf = requestAnimationFrame(tick); else { play.raf = null; play.last = 0; }
  }

  /* ============ DOM ============ */
  var panel, scene;
  function h(html){ var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(v){ if(typeof v !== 'number' || isNaN(v)) return '—'; var s = (Math.round(v*1000)/1000).toString(); return s.replace('-', '−'); }

  var menuEl = null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl = null; } }
  function showMenu(anchor, items, minW){
    closeMenu();
    var m = document.createElement('div'); m.className = 'dd-menu';
    items.forEach(function(it){
      if(it.sep){ var s = document.createElement('div'); s.className = 'dd-sep'; m.appendChild(s); return; }
      if(it.head){ var hd = document.createElement('div'); hd.className = 'dd-head'; hd.textContent = it.head; m.appendChild(hd); return; }
      var o = document.createElement('div'); o.className = 'dd-opt' + (it.cur ? ' cur' : '') + (it.disabled ? ' is-disabled' : '');
      o.textContent = it.label;
      if(!it.disabled) o.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); it.onPick && it.onPick(); });
      m.appendChild(o);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    if(minW) m.style.minWidth = minW + 'px';
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
    m.style.top = (r.bottom + 2 + m.offsetHeight > innerHeight - 8 ? r.top - 2 - m.offsetHeight : r.bottom + 2) + 'px';
    menuEl = m;
  }
  document.addEventListener('click', closeMenu);

  function build(){
    var vp = document.querySelector('.viewport');
    panel = h(
      '<div class="stpanel arp" id="arPanel">' +
        '<div class="stp-head">' +
          '<span class="stp-title">Approach / Return rules</span>' +
          '<span class="arp-seg" id="arpSeg"><button data-m="Approach">Approach</button><button data-m="Return">Return</button></span>' +
          '<button class="stp-close" id="arpClose" title="Close"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg></button>' +
        '</div>' +
        // 3 · commands: list + the selected command card
        '<div class="arp-block">' +
          '<div class="arp-bh"><span class="arp-bt">Commands <em id="arpCount"></em></span><span class="arp-fill"></span>' +
            '<button class="arp-btn" id="arpAdd" title="Add command"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>Add command</button>' +
            '<button class="arp-btn" id="arpSnap" title="Add current state"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><rect x="2.5" y="4.5" width="11" height="8.5" rx="1.5"/><path d="M6 4.5l1-2h2l1 2"/><circle cx="8" cy="8.7" r="2.2"/></svg>Add current state</button>' +
          '</div>' +
          '<div class="arp-list" id="arpList"></div>' +
          '<div class="arp-cmd" id="arpCmd"></div>' +
        '</div>' +
        '<div class="line"></div>' +
        // 4 · preview and playback
        '<div class="arp-block">' +
          '<div class="arp-bh"><span class="arp-bt">Preview</span><span class="arp-fill"></span><span class="arp-status" id="arpStatus"></span></div>' +
          '<div class="arp-pv" id="arpPv"></div>' +
        '</div>' +
        '<div class="arp-foot">' +
          '<button class="arp-btn primary" id="arpApply">Apply to operation</button>' +
          '<button class="arp-btn" id="arpDiscard">Discard changes</button>' +
          '<span class="arp-draft" id="arpDraft"></span>' +
        '</div>' +
      '</div>');
    vp.appendChild(panel);

    scene = h(
      '<div class="arsc" id="arScene" hidden>' +
        robotSvg() +
        '<div class="arsc-tag">Demo model · static picture</div>' +
        '<div class="arsc-ctx" id="arscCtx"></div>' +
        '<div class="arsc-pose" id="arscPose"></div>' +
        '<div class="arsc-set" id="arscSet"><div class="arsc-set__h"><span class="shev"></span>Set pose<span class="arp-fill"></span><span class="arsc-set__src" id="arscSrc"></span></div><div class="arsc-set__b" id="arscSetB"></div></div>' +
      '</div>');
    vp.appendChild(scene);

    panel.querySelector('#arpClose').addEventListener('click', close);
    panel.querySelector('#arpSeg').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b || b.dataset.m === mode) return;
      stopPlay('edit'); mode = b.dataset.m; selId = null; manualPose = null; ensure(); finishCalc();
    });
    panel.querySelector('#arpAdd').addEventListener('click', function(e){
      e.stopPropagation();
      showMenu(this, TYPES.map(function(T){ return {label:T.label, onPick:function(){ addCommand(T.id); }}; }), 240);
    });
    panel.querySelector('#arpSnap').addEventListener('click', function(e){ e.stopPropagation(); addCurrentState(); });
    panel.querySelector('#arpApply').addEventListener('click', applyDraft);
    panel.querySelector('#arpDiscard').addEventListener('click', discardDraft);
    panel.querySelector('#arpList').addEventListener('click', onListClick);
    var list = panel.querySelector('#arpList'), dragId = null;
    list.addEventListener('dragstart', function(e){
      var row = e.target.closest('.arp-row'); if(!row) return;
      dragId = row.dataset.id; row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
    });
    list.addEventListener('dragover', function(e){
      if(!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      var row = e.target.closest('.arp-row');
      list.querySelectorAll('.drop-before, .drop-after').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); });
      if(!row || row.dataset.id === dragId) return;
      var r = row.getBoundingClientRect();
      row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
    });
    list.addEventListener('dragleave', function(e){ if(!list.contains(e.relatedTarget)) list.querySelectorAll('.drop-before, .drop-after').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); }); });
    list.addEventListener('drop', function(e){
      e.preventDefault();
      var target = list.querySelector('.drop-before, .drop-after'), id = dragId; dragId = null;
      list.querySelectorAll('.dragging').forEach(function(x){ x.classList.remove('dragging'); });
      if(!target || !id) return;
      var after = target.classList.contains('drop-after'), tid = target.dataset.id;
      mutate(function(d){
        var from = -1, cmd; d.cmds.forEach(function(c, k){ if(c.id===id){ from = k; cmd = c; } });
        if(from < 0) return;
        d.cmds.splice(from, 1);
        var to = -1; d.cmds.forEach(function(c, k){ if(c.id===tid) to = k; });
        d.cmds.splice(to + (after ? 1 : 0), 0, cmd);
        selId = id;
      });
    });
    list.addEventListener('dragend', function(){ dragId = null; list.querySelectorAll('.dragging, .drop-before, .drop-after').forEach(function(x){ x.classList.remove('dragging', 'drop-before', 'drop-after'); }); });
    panel.querySelector('#arpCmd').addEventListener('click', onCmdClick);
    panel.querySelector('#arpCmd').addEventListener('change', onCmdChange);
    panel.querySelector('#arpCmd').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } e.stopPropagation(); });
    panel.querySelector('#arpPv').addEventListener('click', onPvClick);
    panel.querySelector('#arpPv').addEventListener('input', function(e){
      if(e.target.id !== 'arpSlider' || !preview) return;
      stopPlay('scrub'); play.t = +e.target.value / 1000 * preview.total;
      var s = stepAt(play.t); if(s) selId = s.id;
      renderScene(); renderPlayback(); renderList(); renderCmd();
    });
    scene.querySelector('.arsc-set__h').addEventListener('click', function(){ scene.querySelector('#arscSet').classList.toggle('open'); });
    scene.querySelector('#arscSetB').addEventListener('input', onPoseInput);
    scene.querySelector('#arscSetB').addEventListener('click', function(e){
      if(e.target.id==='arscBack'){ manualPose = null; renderScene(); }
    });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && panel.classList.contains('open')) close(); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden && play.on) stopPlay('hidden'); });
  }

  function robotSvg(){
    // a static, schematic six-joint robot with a positioner — demo geometry only
    var J = {s:[190,262], e:[292,120], w:[440,150], t:[482,214], tip:[494,262]};
    function seg(a, b, w, col){ return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round"/>'; }
    function joint(p, r){ return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+r+'" fill="#2a2e2f" stroke="#3a3f40" stroke-width="2"/>'; }
    function lbl(p, t, dx, dy){ return '<text x="'+(p[0]+dx)+'" y="'+(p[1]+dy)+'" font-family="Inter,system-ui" font-size="11" fill="#f5f5f5" fill-opacity=".56">'+t+'</text>'; }
    return '<svg class="arsc-svg" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="arsc-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f5f5" stop-opacity=".06"/><stop offset="1" stop-color="#f5f5f5" stop-opacity="0"/></linearGradient></defs>' +
      '<g stroke="#f5f5f5" stroke-opacity=".08" stroke-width="1">' + grid() + '</g>' +
      '<ellipse cx="330" cy="352" rx="270" ry="24" fill="url(#arsc-floor)"/>' +
      '<g transform="translate(500 300)">' +
        '<rect x="-46" y="30" width="92" height="16" rx="4" fill="#3a3f40"/>' +
        '<rect x="-28" y="4" width="56" height="28" rx="4" fill="#4a5052"/>' +
        '<g transform="rotate(-12)"><rect x="-58" y="-28" width="116" height="14" rx="3" fill="#5a6163"/>' +
        '<rect x="-34" y="-58" width="68" height="32" rx="3" fill="#8f9ba0"/><rect x="-34" y="-58" width="68" height="6" fill="#b8c2c6"/></g>' +
        '<text x="0" y="66" text-anchor="middle" font-family="Inter,system-ui" font-size="11" fill="#f5f5f5" fill-opacity=".48">E2 positioner</text>' +
      '</g>' +
      '<rect x="120" y="330" width="140" height="14" rx="4" fill="#3a3f40"/>' +
      '<rect x="148" y="286" width="84" height="46" rx="8" fill="#e8a06c"/>' +
      seg(J.s, J.e, 34, '#e8a06c') + seg(J.e, J.w, 28, '#e8a06c') + seg(J.w, J.t, 18, '#d9915f') +
      joint(J.s, 19) + joint(J.e, 16) + joint(J.w, 14) + joint(J.t, 10) +
      seg(J.t, J.tip, 10, '#ebc14a') + '<path d="M488 258 L500 258 L494 274 Z" fill="#ebc14a"/>' +
      '<text x="190" y="366" text-anchor="middle" font-family="Inter,system-ui" font-size="11" fill="#f5f5f5" fill-opacity=".48">E1 · A1 base</text>' +
      lbl(J.s,'A2',-36,4) + lbl(J.e,'A3',-8,-24) + lbl(J.w,'A4 · A5',10,-20) + lbl(J.t,'A6',14,4) +
    '</svg>';
    function grid(){ var s=''; for(var x=0;x<=640;x+=40) s+='<path d="M'+x+' 0V420"/>'; for(var y=0;y<=420;y+=40) s+='<path d="M0 '+y+'H640"/>'; return s; }
  }

  /* ============ actions ============ */
  function srcMenu(anchor){
    var d = ensure(), b = d.binding, S = SOURCES[mode], items = [];
    function choose(nb){
      if(isDirty()){ if(!confirm('The draft has unapplied changes.\n\nReplace draft with the selected source?')) return; }
      stopPlay('edit'); d.binding = nb; d.cmds = sourceCmds(mode, nb); selId = null; finishCalc();
    }
    items.push({label:'From Previous', cur:b.source==='previous', onPick:function(){ choose({source:'previous'}); }});
    items.push({label:'From Root',     cur:b.source==='root',     onPick:function(){ choose({source:'root'}); }});
    items.push({label:'Short',         cur:b.source==='short',    onPick:function(){ choose({source:'short'}); }});
    items.push({sep:true}); items.push({head:'Machine rules'});
    S.machine.forEach(function(r){ items.push({label:r.name, cur:b.source==='machine' && b.ruleId===r.id, onPick:function(){ choose({source:'machine', ruleId:r.id}); }}); });
    if(b.source==='custom') { items.push({sep:true}); items.push({label:'Operation custom rule', cur:true}); }
    items.push({sep:true});
    items.push({label:'Add new machine rule…', onPick:addMachineRule});
    items.push({label:'Edit operation custom rule…', onPick:editCustomRule});
    showMenu(anchor, items, anchor.offsetWidth);
  }
  function addMachineRule(){
    var d = ensure(), S = SOURCES[mode];
    var name = prompt('New machine rule name (' + mode + '):', '');
    if(name == null) return;
    name = name.trim();
    if(!name){ alert('The rule name cannot be empty.'); return; }
    if(S.machine.some(function(r){ return r.name.toLowerCase() === name.toLowerCase(); })){ alert('A machine rule named "' + name + '" already exists. Choose another name.'); return; }
    S.machine.push({id:'mr' + nid(), name:name, cmds:withNewIds(clone(d.cmds))});
    toast = 'Machine rule "' + name + '" created. It is not applied to the operation.'; render();
  }
  function editCustomRule(){
    var d = ensure(), b = d.binding;
    if(b.source==='custom') return;
    stopPlay('edit');
    d.binding = {source:'custom', baseName:sourceLabel(mode, b), cmds:null};
    d.cmds = withNewIds(clone(d.cmds));
    toast = 'Editing the operation custom rule (based on ' + d.binding.baseName + ').'; finishCalc();
  }
  // any mutation of a non-custom source turns the draft into the operation custom rule
  function mutate(fn){
    var d = ensure();
    if(d.binding.source !== 'custom'){ d.binding = {source:'custom', baseName:sourceLabel(mode, d.binding)}; toast = 'Draft is now the operation custom rule for ' + OPS[opIdx].name + ' · ' + mode; }
    fn(d);
    scheduleCalc();
  }
  function insertAfterSel(d, cmd){
    var i = -1; d.cmds.forEach(function(c, k){ if(c.id===selId) i = k; });
    d.cmds.splice(i + 1, 0, cmd); selId = cmd.id;
  }
  function currentScenePose(){ // valid pose in the scene: manual pose or the trajectory frame
    if(manualPose) return {pose:clone(manualPose), src:'manual'};
    if(status!=='ready' || !preview) return null;
    return {pose:poseAt(play.t), src:'trajectory'};
  }
  function addCommand(typeId){
    mutate(function(d){
      var c;
      if(typeId==='PHYSICGOTO'){
        var p = currentScenePose();
        c = {id:nid(), type:'PHYSICGOTO', axes:{}, origin:'user'};
        PROFILE.axes.forEach(function(a){ c.axes[a.id] = axTarget(A16.indexOf(a.id) >= 0, 'fixed', p ? Math.round(p.pose[a.id]*1000)/1000 : NaN); });
      } else if(typeId==='GOTO' || typeId==='MULTIGOTO'){
        c = {id:nid(), type:typeId, origin:'user'};
      } else c = {id:nid(), type:typeId, origin:'user'};
      insertAfterSel(d, c);
    });
  }
  function addCurrentState(){
    if(play.on) stopPlay('user');
    var p = currentScenePose();
    if(!p){ toast = 'Cannot add current state: no valid pose (preview is ' + status + ').'; render(); return; }
    var snap = {id:'s' + (++snapVer), pose:clone(p.pose)};
    mutate(function(d){
      var c = {id:nid(), type:'PHYSICGOTO', axes:{}, origin:'scene', snap:snap.id};
      PROFILE.axes.forEach(function(a){ c.axes[a.id] = axTarget(true, 'fixed', Math.round(snap.pose[a.id]*1000)/1000); });
      insertAfterSel(d, c);
      toast = 'Current state added (snapshot ' + snap.id + ', ' + p.src + ' pose).';
    });
  }
  function applyDraft(){
    if(!canRun() && status!=='unsupported') { toast = 'Cannot apply: ' + statusMsg; render(); return; }
    var k = key(); applied[k] = clone(drafts[k]);
    toast = 'Applied to ' + OPS[opIdx].name + ' · ' + mode + ' only.'; render();
  }
  function discardDraft(){
    var k = key(); if(!applied[k]) return;
    stopPlay('edit'); drafts[k] = clone(applied[k]); selId = null; toast = 'Draft reverted to the applied rule.'; finishCalc();
  }

  function onListClick(e){
    var row = e.target.closest('.arp-row'); if(!row) return;
    var d = ensure(), id = row.dataset.id, i = -1;
    d.cmds.forEach(function(c, k){ if(c.id===id) i = k; });
    if(i < 0) return;
    var act = e.target.closest('[data-act]');
    if(act){
      e.stopPropagation();
      var a = act.dataset.act;
      mutate(function(d){
        if(a==='del'){ d.cmds.splice(i, 1); var nx = d.cmds[i] || d.cmds[i-1]; selId = nx ? nx.id : null; }
        if(a==='up' && i > 0){ var t = d.cmds[i-1]; d.cmds[i-1] = d.cmds[i]; d.cmds[i] = t; }
        if(a==='down' && i < d.cmds.length-1){ var u = d.cmds[i+1]; d.cmds[i+1] = d.cmds[i]; d.cmds[i] = u; }
      });
      return;
    }
    stopPlay('user'); selId = id;
    var s = stepById(id); if(s) play.t = s.t1;
    render();
  }
  function selCmd(){ var d = ensure(); for(var i=0;i<d.cmds.length;i++) if(d.cmds[i].id===selId) return d.cmds[i]; return null; }
  function onCmdClick(e){
    var c = selCmd(); if(!c) return;
    var tdd = e.target.closest('#arpType');
    if(tdd){
      e.stopPropagation();
      showMenu(tdd, TYPES.map(function(T){ return {label:T.label, cur:T.id===c.type, onPick:function(){
        if(T.id===c.type) return;
        mutate(function(){
          c.type = T.id;
          if(T.id==='PHYSICGOTO' && !c.axes){ c.axes = {}; var p = currentScenePose();
            PROFILE.axes.forEach(function(a){ c.axes[a.id] = axTarget(A16.indexOf(a.id)>=0, 'fixed', p ? Math.round(p.pose[a.id]*1000)/1000 : NaN); }); }
        });
      }}; }), tdd.offsetWidth);
      return;
    }
    var chk = e.target.closest('.arp-chk');
    if(chk){ e.stopPropagation(); var ax = chk.dataset.ax; mutate(function(){ c.axes[ax].on = !c.axes[ax].on; }); return; }
    var more = e.target.closest('.arp-axmenu');
    if(more){
      e.stopPropagation();
      var axid = more.dataset.ax, tg = c.axes[axid];
      var sp = currentScenePose();
      showMenu(more, [
        {label:'Automatically calculated value', cur:tg.mode==='auto', onPick:function(){ mutate(function(){ tg.mode = 'auto'; }); }},
        {label:'Set current value' + (sp ? ' (' + fmt(sp.pose[axid]) + '°)' : ''), disabled:!sp, onPick:function(){
          mutate(function(){ tg.mode = 'fixed'; tg.value = Math.round(sp.pose[axid]*1000)/1000; }); }}
      ], 220);
    }
  }
  function onCmdChange(e){
    var inp = e.target.closest('input.arp-num'); if(!inp) return;
    var c = selCmd(); if(!c) return;
    var raw = inp.value.trim().replace(',', '.');
    mutate(function(){
      var tg = c.axes[inp.dataset.ax];
      tg.mode = 'fixed';
      tg.value = raw === '' ? NaN : (/^[-+]?\d*\.?\d+$/.test(raw) ? parseFloat(raw) : NaN);
      tg.raw = raw;
    });
  }
  function onPvClick(e){
    var b = e.target.closest('[data-pv]'); if(!b) return;
    e.stopPropagation();
    var a = b.dataset.pv;
    if(a==='play'){ if(play.on) stopPlay('user'); else startPlay(play.reason==null || play.reason==='end'); render(); return; }
    if(a==='continue'){ if(play.reason==='M0' || play.reason==='M1' || play.reason==='user' || play.reason==='scrub') startPlay(false); return; }
    if(a==='restart'){ startPlay(true); return; }
    if(a==='prev' || a==='next'){
      if(!preview) return;
      stopPlay('user');
      var idx = -1; preview.steps.forEach(function(s, i){ if(s.id===selId) idx = i; });
      idx = Math.max(0, Math.min(preview.steps.length-1, idx + (a==='next' ? 1 : -1)));
      selId = preview.steps[idx].id; play.t = preview.steps[idx].t1; render(); return;
    }
    if(a==='speed'){ speed = +b.dataset.v; renderPlayback(); return; }
    if(a==='m1'){ respectM1 = !respectM1; renderPlayback(); return; }
    var seg = e.target.closest('.arp-tl__seg');
    if(seg){ stopPlay('user'); selId = seg.dataset.id; var s = stepById(selId); if(s) play.t = s.t1; render(); }
  }
  function onPoseInput(e){
    var r = e.target.closest('input[data-ax]'); if(!r) return;
    var base = manualPose || (currentScenePose() || {pose:clone(START[mode])}).pose;
    manualPose = clone(base); manualPose[r.dataset.ax] = +r.value;
    if(play.on) stopPlay('user');
    renderScene(); renderCmd();
  }

  /* ============ rendering ============ */
  function render(){ renderHead(); renderList(); renderCmd(); renderPlayback(); renderFoot(); renderScene(); }
  function renderHead(){
    var d = ensure();
    panel.querySelectorAll('#arpSeg button').forEach(function(b){ b.classList.toggle('on', b.dataset.m===mode); });
  }
  function summary(c){
    var T = typeOf(c.type);
    if(c.type==='PHYSICGOTO'){
      var parts = [];
      PROFILE.axes.forEach(function(a){ var t = c.axes[a.id]; if(t && t.on) parts.push(a.id + (t.mode==='auto' ? '' : ' ' + fmt(t.value))); });
      return 'G53 ' + (parts.join(' ') || '—');
    }
    return T.label;
  }
  function renderList(){
    var d = ensure(), el = panel.querySelector('#arpList'), html = '';
    panel.querySelector('#arpCount').textContent = d.cmds.length ? d.cmds.length : '';
    var cur = stepAt(play.t);
    if(!d.cmds.length) html = '<div class="arp-empty">Add the first step</div>';
    d.cmds.forEach(function(c, i){
      var s = stepById(c.id), T = typeOf(c.type);
      var st = s && s.err ? ' err' : (s && s.unsupported ? ' unsup' : '');
      var passed = s && cur && s.t1 <= play.t + 1e-9 && s !== cur ? ' past' : '';
      html += '<div class="arp-row' + (c.id===selId ? ' sel' : '') + st + passed + '" draggable="true" data-id="' + c.id + '" title="' + esc(T.label) + '">' +
        '<span class="arp-row__grip" title="Drag to reorder"></span>' +
        '<span class="arp-row__n">' + (i+1) + '</span>' +
        '<span class="arp-row__k ' + T.kind + '"></span>' +
        '<span class="arp-row__t">' + esc(summary(c)) + '</span>' +
        (c.origin==='scene' ? '<span class="arp-row__tag" title="Added from scene state">scene</span>' : '') +
        '<span class="arp-row__act">' +
          '<button data-act="del" title="Remove">✕</button>' +
        '</span></div>';
    });
    el.innerHTML = html;
  }
  function renderCmd(){
    var el = panel.querySelector('#arpCmd'), c = selCmd();
    if(!c){ el.innerHTML = '<div class="arp-note">Select a command in the list, or add one.</div>'; return; }
    var T = typeOf(c.type), s = stepById(c.id), op = OPS[opIdx];
    var idx = 0; ensure().cmds.forEach(function(x, i){ if(x.id===c.id) idx = i + 1; });
    var html = '<div class="arp-kv arp-cmd__h"><span class="arp-k">Step ' + idx + ' · type</span>' +
      '<span class="dropdown arp-dd" id="arpType"><span class="v">' + esc(T.label) + '</span><img class="i16" src="assets/dd-chev.svg" alt=""></span></div>';
    if(c.type==='PHYSICGOTO'){
      var sp = currentScenePose();
      html += '<div class="arp-ax"><div class="arp-ax__h"><span></span><span>Axis</span><span>Start</span><span>Target</span><span></span></div>';
      PROFILE.axes.forEach(function(a){
        var t = c.axes[a.id], start = s ? s.start[a.id] : null;
        var err = s && s.err && s.err.indexOf(a.id + ':') === 0 ? s.err.slice(a.id.length + 2) : '';
        var target;
        if(!t.on) target = '<span class="arp-off">not included · keeps ' + fmt(start) + a.unit + '</span>';
        else if(t.mode==='auto') target = '<span class="arp-auto"><b>Auto</b> → ' + fmt(op.auto[a.id]) + a.unit + '<i title="Source: auto target of ' + esc(op.name) + '">' + esc(op.name) + '</i></span>';
        else target = '<span class="input arp-in' + (err ? ' err' : '') + '"><input class="arp-num" data-ax="' + a.id + '" value="' + esc(t.raw != null && isNaN(t.value) ? t.raw : (isNaN(t.value) ? '' : t.value)) + '" placeholder="value"></span><span class="arp-unit">' + a.unit + '</span>';
        html += '<div class="arp-ax__r' + (t.on ? '' : ' is-off') + '">' +
          '<span class="arp-chk' + (t.on ? ' on' : '') + '" data-ax="' + a.id + '" title="' + (t.on ? 'Included in the command' : 'Not included') + '"></span>' +
          '<span class="arp-ax__id">' + a.id + '</span>' +
          '<span class="arp-ax__s">' + fmt(start) + '</span>' +
          '<span class="arp-ax__t">' + target + (err ? '<span class="arp-err">' + esc(err) + '</span>' : '') + '</span>' +
          '<span class="arp-axmenu' + (t.on ? '' : ' is-hidden') + '" data-ax="' + a.id + '" title="Value options">⋮</span>' +
        '</div>';
      });
      html += '</div>';
      if(c.origin==='scene') html += '<div class="arp-note">Added from scene state · snapshot ' + esc(c.snap) + '. Values are fixed; later scene changes do not affect them.</div>';
    } else if(c.type==='GOTO' || c.type==='MULTIGOTO'){
      html += '<div class="arp-warn">No pose solver for this command in the demo profile "' + esc(PROFILE.name) + '". The type is kept; preview of the whole sequence is disabled.</div>';
    } else {
      html += '<div class="arp-note">' + esc(T.note) + '</div>';
      if(s) html += '<div class="arp-kv"><span class="arp-k">Context after step</span><span class="arp-v">Start point LCS: ' + (s.ctx.splcs ? 'enabled' : 'disabled') + ' · ' + esc(s.ctx.lastCtx) + '</span></div>';
    }
    el.innerHTML = html;
  }
  function renderPlayback(){
    var el = panel.querySelector('#arpPv'), html = '';
    var cls = {ready:'ok', stale:'warn', calculating:'warn', error:'err', unsupported:'err', empty:''}[status] || '';
    var stEl = panel.querySelector('#arpStatus');
    stEl.className = 'arp-status ' + cls; stEl.textContent = statusMsg || 'Add the first step'; stEl.title = statusMsg;
    if(preview && preview.total > 0){
      html += '<div class="arp-tl">';
      preview.steps.forEach(function(s){
        var w = Math.max(2, s.dur / preview.total * 100);
        var passed = s.t1 <= play.t + 1e-9, cur = stepAt(play.t) === s;
        var mark = s.kind==='stop' ? ' stop' + (play.passed[s.id]==='skipped' ? ' skipped' : '') : (s.kind==='event' ? ' event' : '');
        html += '<span class="arp-tl__seg' + mark + (cur ? ' cur' : '') + (passed && !cur ? ' past' : '') + (s.id===selId ? ' sel' : '') + '" data-id="' + s.id + '" style="flex:0 0 ' + w + '%" title="' + s.n + ' · ' + esc(typeOf(s.type).label) + '"><i>' + s.n + '</i></span>';
      });
      html += '</div>';
      html += '<input type="range" id="arpSlider" min="0" max="1000" value="' + Math.round(play.t / preview.total * 1000) + '"' + (status!=='ready' ? ' disabled' : '') + '>';
    }
    var can = canRun();
    var stopped = play.reason==='M0' || play.reason==='M1';
    html += '<div class="arp-tr">' +
      '<button class="sd-btn" data-pv="prev" title="Previous step"' + (preview ? '' : ' disabled') + '><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 3.5L5.3 8l4.5 4.5"/></svg></button>' +
      '<button class="sd-btn sd-play' + (play.on ? ' playing' : '') + '" data-pv="play" title="' + (play.on ? 'Pause' : 'Play ' + mode.toLowerCase()) + '"' + (can ? '' : ' disabled') + '>' +
        (play.on ? '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.6" y="3" width="3.2" height="10" rx="1"/><rect x="9.2" y="3" width="3.2" height="10" rx="1"/></svg>'
                 : '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8l8.5 5.2-8.5 5.2z"/></svg>') + '</button>' +
      '<button class="sd-btn" data-pv="next" title="Next step"' + (preview ? '' : ' disabled') + '><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.5L10.7 8l-4.5 4.5"/></svg></button>' +
      '<span class="sd-sep"></span>' +
      '<span class="arp-speed">' + [0.5,1,2].map(function(v){ return '<button data-pv="speed" data-v="' + v + '" class="' + (speed===v ? 'on' : '') + '">' + v + '×</button>'; }).join('') + '</span>' +
      '<span class="arp-fill"></span>' +
      '<label class="arp-m1" title="Stop on M1 events"><img class="tgl" data-pv="m1" src="assets/' + (respectM1 ? 'toggle-on' : 'toggle-off') + '.svg" alt="">Respect M1</label>' +
    '</div>';
    if(stopped) html += '<div class="arp-stop">Preview stopped on ' + play.reason + ' (step ' + (play.stopStep ? play.stopStep.n : '') + ').<button class="arp-link" data-pv="continue">Continue preview</button></div>';
    else if(play.reason==='end' && preview) html += '<div class="arp-note">Sequence finished. <button class="arp-link" data-pv="restart">Play again from start</button></div>';
    var cur = stepAt(play.t);
    if(cur && cur.kind==='motion' && !cur.moves && status==='ready') html += '<div class="arp-note">Step ' + cur.n + ': position does not change.</div>';
    el.innerHTML = html;
  }
  function renderFoot(){
    var dirty = isDirty();
    panel.querySelector('#arpApply').disabled = !(dirty && (status==='ready' || status==='unsupported'));
    panel.querySelector('#arpDiscard').disabled = !dirty;
    panel.querySelector('#arpDraft').textContent = toast || (dirty ? 'Unapplied changes · ' + OPS[opIdx].name + ' · ' + mode : 'No unapplied changes');
    panel.querySelector('#arpDraft').classList.toggle('dirty', dirty && !toast);
    toast = '';
  }
  function renderScene(){
    if(!scene || scene.hidden) return;
    var sp = manualPose ? {pose:manualPose, src:'manual'} : (preview ? {pose:poseAt(play.t), src:'trajectory'} : {pose:clone(START[mode]), src:'start'});
    var cur = stepAt(play.t);
    var ctxHtml = '<b>' + mode + '</b> · ' + esc(OPS[opIdx].name);
    if(cur && preview){ ctxHtml += ' · <span>Step ' + cur.n + (play.t >= cur.t1 - 1e-9 ? ' · Step end' : '') + '</span>' +
      ' · <span>Start point LCS: ' + (cur.ctx.splcs ? 'enabled' : 'disabled') + '</span> · <span>' + esc(cur.ctx.lastCtx) + '</span>'; }
    if(play.reason==='M0' || play.reason==='M1') ctxHtml += ' · <em>stopped on ' + play.reason + '</em>';
    scene.querySelector('#arscCtx').innerHTML = ctxHtml;
    var ph = '';
    PROFILE.axes.forEach(function(a){ ph += '<span><b>' + a.id + '</b>' + fmt(sp.pose[a.id]) + a.unit + '</span>'; });
    scene.querySelector('#arscPose').innerHTML = ph;
    scene.querySelector('#arscSrc').textContent = sp.src==='manual' ? 'Pose set manually' : 'Pose from trajectory';
    var sb = scene.querySelector('#arscSetB'), sh = '';
    PROFILE.axes.forEach(function(a){
      sh += '<label><span>' + a.id + '</span><input type="range" data-ax="' + a.id + '" min="' + a.min + '" max="' + a.max + '" step="0.5" value="' + (Math.round(sp.pose[a.id]*2)/2) + '"><i>' + fmt(sp.pose[a.id]) + a.unit + '</i></label>';
    });
    sh += '<div class="arsc-set__f"><button class="arp-btn" id="arscBack"' + (manualPose ? '' : ' disabled') + '>Back to trajectory</button><span class="arp-note">Manual pose moves the demo model only; it does not edit the sequence.</span></div>';
    sb.innerHTML = sh;
  }

  /* ============ open / close ============ */
  function open(which){
    if(!panel) build();
    if(which==='Approach' || which==='Return') mode = which;
    ensure();
    panel.classList.add('open'); scene.hidden = false;
    document.body.classList.add('ar-open');
    finishCalc();
  }
  function close(){
    stopPlay('user');
    panel.classList.remove('open'); scene.hidden = true;
    document.body.classList.remove('ar-open');
    closeMenu();
  }
  window.arOpen = open;
  window.arClose = close;
})();
