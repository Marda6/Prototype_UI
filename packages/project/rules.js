// Links window — approach / return rules, opened from the Links tab ("Custom…").
// Being rebuilt step by step; the previous full editor is kept in rules.v1.js
// for reference and is not loaded.
// Layout: header · player (as in the NC block panel) · command list · parameters
// of the selected command. Demo cell: 6-axis robot A1–A6 + external axes E1–E2,
// Cartesian targets X Y Z / A B C. 3D preview: lib/robot-preview.
// Entry point: window.arOpen('Approach' | 'Return'); window.arClose().
(function(){
  'use strict';

  /* ============ demo data ============ */
  // Robot cell: 6-axis arm A1–A6, two external axes E1–E2 (turntable / positioner),
  // Cartesian target X Y Z with orientation A B C. Axes are shown grouped by `group`.
  var AXES = [
    {id:'X',  unit:'mm', group:'Linear axes'},   {id:'Y',  unit:'mm', group:'Linear axes'},   {id:'Z',  unit:'mm', group:'Linear axes'},
    {id:'A',  unit:'°',  group:'Orientation'},   {id:'B',  unit:'°',  group:'Orientation'},   {id:'C',  unit:'°',  group:'Orientation'},
    {id:'A1', unit:'°',  group:'Joints'},        {id:'A2', unit:'°',  group:'Joints'},        {id:'A3', unit:'°',  group:'Joints'},
    {id:'A4', unit:'°',  group:'Joints'},        {id:'A5', unit:'°',  group:'Joints'},        {id:'A6', unit:'°',  group:'Joints'},
    {id:'E1', unit:'°',  group:'External axes'}, {id:'E2', unit:'°',  group:'External axes'}
  ];
  var JOINTS = ['A1','A2','A3','A4','A5','A6'], EXT = ['E1','E2'], CART = ['X','Y','Z','A','B','C'];
  // typical robot approach / return vocabulary (KUKA-style names in brackets)
  var TYPES = [
    {id:'PTP',    label:'Joint move (PTP)',        kind:'motion', axes:JOINTS.concat(EXT)},
    {id:'LIN',    label:'Linear move (LIN)',       kind:'motion', axes:CART},
    {id:'HOME',   label:'Home position (PTP HOME)',kind:'motion', axes:JOINTS},
    {id:'EXTMOVE',label:'External axes move',      kind:'motion', axes:EXT},
    {id:'TOOL',   label:'Set tool (TCP)',          kind:'event',  options:['Tool 1 · Spindle','Tool 2 · Gripper','Tool 3 · Probe'],
                  note:'Selects the tool frame (TCP) used by the following moves.'},
    {id:'BASE',   label:'Set base',                kind:'event',  options:['Base 0 · World','Base 1 · Fixture','Base 2 · Positioner'],
                  note:'Selects the base (work object) frame for Cartesian targets.'},
    {id:'OUT',    label:'Set output',              kind:'event',  options:['OUT[1] Spindle = TRUE','OUT[1] Spindle = FALSE','OUT[2] Gripper = TRUE','OUT[2] Gripper = FALSE'],
                  note:'Switches a digital output of the controller.'},
    {id:'WAITIN', label:'Wait for input',          kind:'event',  options:['IN[1] Part clamped','IN[2] Door closed','IN[3] Spindle at speed'],
                  note:'Waits until the digital input is TRUE.'},
    {id:'WAITSEC',label:'Wait time',               kind:'event',  value:1, unit:'s',
                  note:'Pauses the program for the given time.'},
    {id:'HALT',   label:'Stop (HALT)',             kind:'stop',   note:'Unconditional stop. The program waits for Start.'},
    {id:'OPTSTOP',label:'Optional stop',           kind:'stop',   note:'Stops only when the optional stop switch is on at the controller.'}
  ];
  function typeOf(id){ for(var i=0;i<TYPES.length;i++) if(TYPES[i].id===id) return TYPES[i]; return TYPES[0]; }
  function axisOf(id){ for(var i=0;i<AXES.length;i++) if(AXES[i].id===id) return AXES[i]; return null; }

  // axis target: {on, mode:'auto'|'fixed', value}
  var uid = 0;
  function ax(on, mode, v){ return {on:!!on, mode:mode||'fixed', value:v==null?0:v}; }
  function motion(type, spec){ // spec[axis] = number | 'auto' | undefined
    var axes = {};
    AXES.forEach(function(a){
      var s = spec[a.id];
      axes[a.id] = s===undefined ? ax(false,'fixed',0) : s==='auto' ? ax(true,'auto',0) : ax(true,'fixed',s);
    });
    return {id:'c'+(++uid), type:type, axes:axes};
  }
  // event: `state` = index into the type's options; `value` for numeric events (Wait time)
  function event(type, state, value){ var T = typeOf(type); return {id:'c'+(++uid), type:type, state:state||0, value:value!=null ? value : (T.value||0)}; }

  // robot home (joint space) and the "auto" values as the demo solver would resolve them
  var HOMEPOSE = {A1:0, A2:-90, A3:90, A4:0, A5:90, A6:0, E1:0, E2:0};
  var AUTO = {
    Approach: {X:-53.735, Y:-2.673, Z:119.975, A:0, B:0, C:0, A1:5.153, A2:-78.774, A3:117.061, A4:24.299, A5:34.839, A6:-100.39, E1:0, E2:0},
    Return:   {X:-29.554, Y:2.827, Z:137.414, A:0, B:0, C:0, A1:5.153, A2:-78.774, A3:117.061, A4:24.299, A5:34.839, A6:-100.39, E1:0, E2:0}
  };
  function homeSpec(){ var s = {}; JOINTS.forEach(function(j){ s[j] = HOMEPOSE[j]; }); return s; }
  function autoSpec(ids){ var s = {}; ids.forEach(function(a){ s[a] = 'auto'; }); return s; }

  /* ============ templates ============
     Built-in templates build a fresh command list; user templates are stored serialized
     in localStorage (per mode). A template is "dirty" when the current list differs from
     the snapshot taken when it was applied. */
  // Machine presets — the same items the inspector's Approach / Return dropdown lists.
  // They come from the machine settings; `short` is how the window's picker shows them.
  var G53 = 'G53 A1 A2 A3 A4 A5 A6; G53 E1 E2 — ';
  function preset(short, build){ return {name:G53 + short, short:short, build:build}; }
  var MACHINE = {
    Approach: [
      // From Previous: robot comes from where the previous operation left it
      preset('From Previous', function(){ return [
        motion('PTP', autoSpec(JOINTS)), motion('EXTMOVE', autoSpec(EXT)), motion('LIN', {Z:'auto'})]; }),
      // From Root: start at the robot home (root) position
      preset('From Root', function(){ return [
        motion('HOME', homeSpec()), event('TOOL', 0), event('BASE', 1),
        motion('PTP', autoSpec(JOINTS)), motion('EXTMOVE', autoSpec(EXT)), event('WAITIN', 0), motion('LIN', {Z:'auto'})]; }),
      // Return by default: approach mirrors the default return
      preset('Return by default', function(){ return [
        motion('PTP', autoSpec(JOINTS)), motion('LIN', {Z:'auto'})]; })
    ],
    Return: [
      preset('From Previous', function(){ return [
        motion('LIN', {Z:'auto'}), motion('EXTMOVE', autoSpec(EXT)), motion('PTP', autoSpec(JOINTS))]; }),
      preset('From Root', function(){ return [
        motion('LIN', {Z:'auto'}), event('OUT', 1), motion('EXTMOVE', autoSpec(EXT)),
        motion('PTP', autoSpec(JOINTS)), motion('HOME', homeSpec()), event('OPTSTOP')]; }),
      preset('Return by default', function(){ return [
        motion('LIN', {Z:'auto'}), motion('PTP', autoSpec(JOINTS)), motion('HOME', homeSpec())]; })
    ]
  };
  var TPL_KEY = 'ency.ar.templates';
  function userTpls(){ try { return JSON.parse(localStorage.getItem(TPL_KEY)) || {Approach:[], Return:[]}; } catch(e){ return {Approach:[], Return:[]}; } }
  function saveUserTpls(t){ try { localStorage.setItem(TPL_KEY, JSON.stringify(t)); } catch(e){} }
  // serialization: ids are dropped and re-issued on load
  function serialize(list){
    return list.map(function(c){
      var o = {type:c.type};
      if(c.axes){ o.axes = {}; Object.keys(c.axes).forEach(function(a){ var t = c.axes[a]; o.axes[a] = [t.on ? 1 : 0, t.mode, t.value]; }); }
      if(c.state !== undefined) o.state = c.state;
      if(c.value !== undefined) o.value = c.value;
      return o;
    });
  }
  function deserialize(data){
    return (data || []).map(function(o){
      var c = {id:'c'+(++uid), type:o.type};
      if(o.axes){ c.axes = {}; AXES.forEach(function(a){ var t = o.axes[a.id] || [0,'fixed',0]; c.axes[a.id] = ax(t[0], t[1], t[2]); }); }
      if(o.state !== undefined) c.state = o.state;
      if(o.value !== undefined) c.value = o.value;
      return c;
    });
  }
  // active template per mode: {name, user, snap}
  var TPL = {Approach:null, Return:null};
  var CMDS = {Approach:[], Return:[]};
  function applyTemplate(m, name, user){
    var list;
    if(user){ var u = userTpls()[m].filter(function(t){ return t.name === name; })[0]; list = deserialize(u && u.cmds); }
    else { var b = MACHINE[m].filter(function(t){ return t.name === name || t.short === name; })[0]; list = b ? b.build() : []; if(b) name = b.name; }
    CMDS[m] = list;
    TPL[m] = {name:name, user:!!user, snap:JSON.stringify(serialize(list))};
  }
  function tplDirty(){ return !TPL[mode] || JSON.stringify(serialize(cmds())) !== TPL[mode].snap; }
  function tplShort(t){ if(!t) return 'Custom'; var m = MACHINE[mode].filter(function(x){ return x.name === t.name; })[0]; return m ? m.short : t.name; }
  applyTemplate('Approach', 'From Root');
  applyTemplate('Return', 'From Root');

  // the inspector shows the template name while the list matches it, otherwise "Custom"
  function inspectorSync(){
    var dd = document.querySelector('.irows .dropdown[data-custom="' + mode + '"] .v');
    if(dd) dd.textContent = TPL[mode] && !tplDirty() ? TPL[mode].name : 'Custom';
  }

  /* ============ state ============ */
  var panel = null, mode = 'Approach', speed = 50, playing = false, selId = null;
  function cmds(){ return CMDS[mode]; }
  function sel(){ var l = cmds(); for(var i=0;i<l.length;i++) if(l[i].id===selId) return l[i]; return null; }

  /* ============ helpers ============ */
  function h(html){ var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function fmt(v){ return (Math.round(v*1000)/1000).toString().replace('-', '−'); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  var ICO = {
    prev:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 3.5L5.3 8l4.5 4.5"/></svg>',
    next:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.5L10.7 8l-4.5 4.5"/></svg>',
    play:  '<svg class="sp-play" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8l8.5 5.2-8.5 5.2z"/></svg>',
    pause: '<svg class="sp-pause" viewBox="0 0 16 16" fill="currentColor"><rect x="3.6" y="3" width="3.2" height="10" rx="1"/><rect x="9.2" y="3" width="3.2" height="10" rx="1"/></svg>',
    close: '<svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3.5" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="12.5" r="1.2"/></svg>',
    code: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9.2 3L6.8 13"/></svg>',
    plus:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    // crosshair = "current position of the machine"
    snap:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="4.5"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5"/></svg>'
  };
  var A = {chev:'assets/dd-chev.svg', on:'assets/toggle-on.svg', off:'assets/toggle-off.svg'};

  /* popover menu (same .dd-menu as the inspector) */
  var menuEl = null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl = null; } panel && panel.querySelectorAll('.dd-open').forEach(function(x){ x.classList.remove('dd-open'); }); }
  function showMenu(anchor, items){
    closeMenu();
    var m = document.createElement('div'); m.className = 'dd-menu';
    items.forEach(function(it){
      if(it.sep){ var d = document.createElement('div'); d.className = 'dd-sep'; m.appendChild(d); return; }
      var o = document.createElement('div'); o.className = 'dd-opt' + (it.cur ? ' cur' : ''); o.textContent = it.label;
      o.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); it.onPick(); });
      m.appendChild(o);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    m.style.minWidth = r.width + 'px';
    // icon buttons (⋮, +) open the menu right-aligned to themselves, dropdowns left-aligned
    var left = anchor.classList.contains('dropdown') ? r.left : r.right - m.offsetWidth;
    m.style.left = Math.max(8, Math.min(left, innerWidth - m.offsetWidth - 8)) + 'px';
    m.style.top = (r.bottom + 2 + m.offsetHeight > innerHeight - 8 ? r.top - 2 - m.offsetHeight : r.bottom + 2) + 'px';
    anchor.classList.add('dd-open');
    menuEl = m;
  }
  document.addEventListener('click', closeMenu);

  /* ============ summaries ============ */
  function summary(c){
    var T = typeOf(c.type);
    if(T.kind==='motion'){
      if(c.type==='HOME') return 'PTP HOME';
      var parts = [];
      T.axes.forEach(function(id){ var t = c.axes[id]; if(t.on) parts.push(id + ' ' + (t.mode==='auto' ? 'Auto' : fmt(t.value))); });
      var head = c.type==='LIN' ? 'LIN' : c.type==='EXTMOVE' ? 'PTP' : 'PTP';
      return head + (parts.length ? ' ' + parts.join(' ') : '');
    }
    if(T.options) return T.options[c.state] || T.label;
    if(c.type==='WAITSEC') return 'WAIT SEC ' + fmt(c.value);
    return T.label;
  }

  /* ============ build ============ */
  // The window is being rebuilt block by block (v2, .arw): 8px padding, 28px header row.
  // The former body (player · commands · parameters) is kept in body()/wireBody() and is
  // re-attached as the blocks are approved.
  function build(){
    panel = h(
      '<div class="stpanel arw" id="arPanel">' +
        '<div class="arw-head">' +
          // one window per mode: the title is the mode name (Approach / Return)
          '<span class="arw-title" id="arpTitle">Return</span>' +
          '<button class="arw-close" id="arpClose" title="Close">' + ICO.close + '</button>' +
        '</div>' +
        '<div class="arw-body" id="arwBody">' +
          // 1 · player row (20px): prev · play · next · | · speed slider to the row's end
          '<div class="arw-ctl">' +
            '<div class="sd-btn" id="arpPrev" title="Previous command">' + ICO.prev + '</div>' +
            '<div class="sd-btn sd-play" id="arpPlay" title="Play">' + ICO.play + ICO.pause + '</div>' +
            '<div class="sd-btn" id="arpNext" title="Next command">' + ICO.next + '</div>' +
            '<div class="sd-sep"></div>' +
            '<div class="sd-speed" id="arpSpeed" title="Simulation speed">' +
              '<div class="sd-line"></div><div class="sd-fill" id="arpFill"></div>' +
              '<i class="sd-dot" style="left:25%"></i><i class="sd-dot" style="left:50%"></i><i class="sd-dot" style="left:75%"></i>' +
              '<div class="sd-knob" id="arpKnob"></div>' +
            '</div>' +
            '<span class="arw-val" id="arpVal"></span>' +
          '</div>' +
          // divider: 4px above (after the player) and 4px below (before the next block)
          '<div class="line arw-div"></div>' +
          // 2 · commands header (20px): section title + two icon buttons on the right
          '<div class="arw-sec">' +
            '<span class="arw-sec__t">Commands list</span>' +
            // template picker: built-in · user · save / delete; "•" marks unsaved changes
            '<span class="dropdown arw-tpl" id="arpTpl" title="Template"><span class="v"></span><img class="i16" src="' + A.chev + '"></span>' +
            '<div class="sd-btn" id="arpAdd" title="Add command">' + ICO.plus + '</div>' +
            '<div class="sd-btn" id="arpSnap" title="Add current state as a command">' + ICO.snap + '</div>' +
            '<div class="sd-btn" id="arpCl" title="Show CLData">' + ICO.code + '</div>' +
          '</div>' +
          // inline bar (24px) for confirmations and the template name — shown instead of a modal
          '<div class="arw-bar" id="arpBar" hidden></div>' +
          // 3 · command list: room for 6 rows is reserved (6·24 + 5·2), scrolls beyond that
          '<div class="arw-list" id="arpList"></div>' +
          // divider after the list: same 8px above and below
          '<div class="line arw-div"></div>' +
          // 4 · parameters of the selected command: Type row, then axis groups / state / note
          '<div class="arw-params" id="arpParams"></div>' +
        '</div>' +
      '</div>');
    document.querySelector('.viewport').appendChild(panel);

    panel.querySelector('#arpClose').addEventListener('click', close);
    panel.querySelector('#arpAdd').addEventListener('click', function(e){
      e.stopPropagation();
      showMenu(this, TYPES.map(function(T){ return {label:T.label, onPick:function(){ addCommand(T); }}; }));
    });
    panel.querySelector('#arpSnap').addEventListener('click', function(){
      // the current robot state = the resolved joint pose of the mode, as a fixed PTP on every joint
      var spec = {}; JOINTS.concat(EXT).forEach(function(a){ spec[a] = AUTO[mode][a]; });
      insert(motion('PTP', spec));
    });
    panel.querySelector('#arpTpl').addEventListener('click', function(e){ e.stopPropagation(); tplMenu(this); });
    panel.querySelector('#arpCl').addEventListener('click', function(){ clToggle(); });
    panel.querySelector('#arpList').addEventListener('click', function(e){
      var row = e.target.closest('.arp-row'); if(!row) return;
      var more = e.target.closest('[data-act="more"]');
      if(more){
        e.stopPropagation();
        var id = row.dataset.id, c = cmds().filter(function(x){ return x.id===id; })[0], items = [];
        if(c && typeOf(c.type).kind==='motion'){
          items.push(
            // every axis of the command → Auto
            {label:'Auto values', onPick:function(){
              Object.keys(c.axes).forEach(function(a){ c.axes[a].mode = 'auto'; }); render(); }},
            // every axis → Fixed at the current (resolved) machine position
            {label:'Current values', onPick:function(){
              Object.keys(c.axes).forEach(function(a){ c.axes[a].mode = 'fixed'; c.axes[a].value = AUTO[mode][a]; }); render(); }},
            {sep:true});
        }
        items.push({label:'Remove', onPick:function(){ remove(id); }});
        showMenu(more, items);
        return;
      }
      selId = row.dataset.id; render();
    });
    panel.querySelector('#arpParams').addEventListener('click', onParamsClick);
    panel.querySelector('#arpParams').addEventListener('input', onParamsInput);
    panel.querySelector('#arpPlay').addEventListener('click', function(){ setPlaying(!playing); });
    panel.querySelector('#arpPrev').addEventListener('click', function(){ step(-1); });
    panel.querySelector('#arpNext').addEventListener('click', function(){ step(1); });
    var sp = panel.querySelector('#arpSpeed');
    sp.addEventListener('pointerdown', function(e){
      e.preventDefault(); sp.setPointerCapture(e.pointerId);
      var move = function(ev){
        var r = sp.getBoundingClientRect();
        setSpeed(Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100));
      };
      var up = function(){ sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); };
      sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up);
      move(e);
    });
    setSpeed(speed);
    // clicks inside the window must not reach the document-level "close menus" handlers of app.js,
    // but they do close our own menu
    panel.addEventListener('click', function(e){ e.stopPropagation(); closeMenu(); });
    document.addEventListener('keydown', function(e){
      if(!panel.classList.contains('open')) return;
      if(e.key === 'Escape'){ if(menuEl) closeMenu(); else close(); }
      if(!panel.querySelector('#arpList')) return;
      if(/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if(e.key === 'ArrowUp'){ e.preventDefault(); step(-1); }
      if(e.key === 'ArrowDown'){ e.preventDefault(); step(1); }
    });
  }
  function has(id){ return !!(panel && panel.querySelector('#' + id)); }

  // v1 body — not attached yet
  function body(){
    return (
        // 1 · player — same control row as the NC block panel
        '<div class="ncp-ctl arp-ctl">' +
          '<div class="sd-btn" id="arpPrev" title="Previous command">' + ICO.prev + '</div>' +
          '<div class="sd-btn sd-play" id="arpPlay" title="Play">' + ICO.play + ICO.pause + '</div>' +
          '<div class="sd-btn" id="arpNext" title="Next command">' + ICO.next + '</div>' +
          '<div class="sd-sep"></div>' +
          '<div class="sd-speed" id="arpSpeed" title="Simulation speed">' +
            '<div class="sd-line"></div><div class="sd-fill" id="arpFill"></div>' +
            '<i class="sd-dot" style="left:25%"></i><i class="sd-dot" style="left:50%"></i><i class="sd-dot" style="left:75%"></i>' +
            '<div class="sd-knob" id="arpKnob"></div>' +
          '</div>' +
          // speed is read from the knob position: no percent label, the slider is short
        '</div>' +

        // 2 · commands: title + the two "add" buttons on the same line
        '<div class="arp-bh">' +
          '<span class="stp-sec">Commands:</span>' +
          '<div class="sd-btn" id="arpAdd" title="Add command">' + ICO.plus + '</div>' +
          '<div class="sd-btn" id="arpSnap" title="Add current state as a command">' + ICO.snap + '</div>' +
        '</div>' +
        '<div class="arp-list" id="arpList"></div>' +
        // the divider is a splitter: drag it to trade height between the list and the parameters
        '<div class="arp-split" id="arpSplit" title="Drag to resize"><div class="line"></div></div>' +

        // 3 · parameters of the selected command: the Type row is the header
        '<div class="arp-params" id="arpParams"></div>' +
        // bottom edge: drag to change the window height — the list takes the difference
        '<div class="arp-resize" id="arpResize" title="Drag to resize"></div>');
  }
  function wireBody(){
    panel.querySelector('#arpPlay').addEventListener('click', function(){ setPlaying(!playing); });
    panel.querySelector('#arpPrev').addEventListener('click', function(){ step(-1); });
    panel.querySelector('#arpNext').addEventListener('click', function(){ step(1); });

    panel.querySelector('#arpAdd').addEventListener('click', function(e){
      e.stopPropagation();
      showMenu(this, TYPES.map(function(T){ return {label:T.label, onPick:function(){ addCommand(T); }}; }));
    });
    panel.querySelector('#arpSnap').addEventListener('click', function(){
      // the current machine state = the resolved pose of the mode, as fixed values on every axis
      var spec = {}; AXES.forEach(function(a){ spec[a.id] = AUTO[mode][a.id]; });
      insert(motion('PHYSICGOTO', spec));
    });

    panel.querySelector('#arpList').addEventListener('click', function(e){
      var row = e.target.closest('.arp-row'); if(!row) return;
      if(e.target.closest('[data-act="del"]')){ remove(row.dataset.id); return; }
      selId = row.dataset.id; render();
    });
    panel.querySelector('#arpParams').addEventListener('click', onParamsClick);
    panel.querySelector('#arpParams').addEventListener('input', onParamsInput);

    // speed slider: drag anywhere on the track
    var sp = panel.querySelector('#arpSpeed');
    sp.addEventListener('pointerdown', function(e){
      e.preventDefault(); sp.setPointerCapture(e.pointerId);
      var move = function(ev){
        var r = sp.getBoundingClientRect();
        setSpeed(Math.round(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * 100));
      };
      var up = function(){ sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); };
      sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up);
      move(e);
    });

    // sizes: the list is 6 rows by default (6·24 + 5·1 gap); the window height is then fixed
    // so that dragging either the splitter or the bottom edge redistributes/adds height
    var ROW = 25, LIST_MIN = 3 * ROW - 1, PARAMS_MIN = 2 * 24 + 2;
    var list = panel.querySelector('#arpList'), params = panel.querySelector('#arpParams');
    function listH(){ return list.getBoundingClientRect().height; }
    function setListH(h){ panel.style.setProperty('--arp-list', Math.round(h) + 'px'); }
    function others(){ return panel.getBoundingClientRect().height - listH() - params.getBoundingClientRect().height; }
    function drag(el, onMove){
      el.addEventListener('pointerdown', function(e){
        e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId);
        var y0 = e.clientY, l0 = listH(), p0 = panel.getBoundingClientRect().height;
        var move = function(ev){ onMove(ev.clientY - y0, l0, p0); };
        var up = function(){ el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
      });
    }
    // splitter: window height stays, the list grows at the expense of the parameters and back
    drag(panel.querySelector('#arpSplit'), function(dy, l0, p0){
      var max = p0 - others() - PARAMS_MIN;
      setListH(Math.max(LIST_MIN, Math.min(max, l0 + dy)));
    });
    // bottom edge: the window grows/shrinks and the list takes the whole difference
    drag(panel.querySelector('#arpResize'), function(dy, l0, p0){
      var limit = panel.parentNode.getBoundingClientRect().height - 16 - panel.offsetTop;
      var h = Math.max(p0 - l0 + LIST_MIN, Math.min(limit, p0 + dy));
      panel.style.height = Math.round(h) + 'px';
      setListH(l0 + (h - p0));
    });
    setSpeed(speed);
  }

  /* ============ CLData view ============
     The generated CLData of the rule, in a side panel next to the window, so the user does not
     have to run the simulation to see it. One block per command; selection is mirrored both ways. */
  var cl = null, clOpen = false, clExp = {};   // clExp[cmdId] = expanded
  // CLData frames in the same notation as the Simulation code tree ("RAPID: 10000", "MultiGOTO: X…")
  // vals — resolved axis values after the command (Auto already substituted); {t, c:'red'|'blue'}
  function clLines(c, vals){
    var T = typeOf(c.type);
    function axes(ids){ return ids.filter(function(a){ return c.axes[a].on; }).map(function(a){ return a + fmt(vals[a]); }).join(', '); }
    function opt(){ return T.options[c.state] || ''; }
    function q(s){ return '"' + s.split(' · ').pop() + '"'; }
    switch(c.type){
      case 'PTP':     return [{t:'RAPID: 10000', c:'red'}, {t:'PhysicGOTO: ' + axes(JOINTS.concat(EXT)), c:'red'}];
      case 'EXTMOVE': return [{t:'RAPID: 10000', c:'red'}, {t:'PhysicGOTO: ' + axes(EXT), c:'red'}];
      case 'HOME':    return [{t:'COMMENT: "HOME"'}, {t:'RAPID: 10000', c:'red'}, {t:'PhysicGOTO: ' + axes(JOINTS), c:'red'}];
      case 'LIN':     return [{t:'RAPID: 10000', c:'red'}, {t:'MultiGOTO: ' + axes(CART), c:'red'}];
      case 'TOOL':    return [{t:'LOADTL: #' + (c.state + 1) + ' (0), H#-' + (c.state + 1) + ', D#' + (c.state + 1)}, {t:'COMMENT: ' + q(opt())}];
      case 'BASE':    return [{t:'ORIGIN: #' + c.state + ' ' + q(opt())}];
      case 'OUT':     return [{t:'OUTPUT: ' + opt().replace(/^OUT\[(\d+)\].*= (\w+)$/, function(_, n, v){ return '#' + n + ', ' + (v === 'TRUE' ? 'On' : 'Off'); })}];
      case 'WAITIN':  return [{t:'WAIT: IN#' + (c.state + 1) + ' ' + q(opt())}];
      case 'WAITSEC': return [{t:'DELAY: ' + fmt(c.value) + ' s'}];
      case 'HALT':    return [{t:'STOP'}];
      case 'OPTSTOP': return [{t:'OPSTOP'}];
    }
    return [{t:'COMMENT: "' + T.label + '"'}];
  }
  function clBuild(){
    cl = h('<div class="stpanel arw arw-cl" id="arCl">' +
      '<div class="arw-head"><span class="arw-title" id="arClTitle">CLData</span>' +
        '<button class="arw-close" id="arClClose" title="Close">' + ICO.close + '</button></div>' +
      '<div class="arw-cl__body" id="arClBody"></div></div>');
    document.querySelector('.viewport').appendChild(cl);
    cl.querySelector('#arClClose').addEventListener('click', function(){ clToggle(false); });
    cl.addEventListener('click', function(e){
      e.stopPropagation(); closeMenu();
      var row = e.target.closest('.simrow[data-id]'); if(!row) return;
      var id = row.dataset.id;
      // chevron toggles the frames; anywhere else selects the command
      if(e.target.closest('.shev')){ clExp[id] = !clExp[id]; clRender(); return; }
      if(playing) setPlaying(false);
      selId = id; render();
    });
  }
  function clToggle(on){
    if(!cl) clBuild();
    clOpen = on === undefined ? !clOpen : on;
    panel.querySelector('#arpCl').classList.toggle('on', clOpen);
    cl.classList.toggle('open', clOpen);
    if(clOpen){ clPlace(); clRender(); }
  }
  // sits to the right of the window, top-aligned with it
  function clPlace(){
    cl.style.left = (panel.offsetLeft + panel.offsetWidth + 8) + 'px';
    cl.style.top = panel.offsetTop + 'px';
  }
  function clRender(){
    if(!cl || !clOpen) return;
    cl.querySelector('#arClTitle').textContent = 'CLData · ' + mode;
    // same rows as the Simulation code tree: a group row per command (chevron · summary · dot),
    // its CLData frames underneath when expanded; the selected command is expanded automatically
    if(selId && clExp[selId] === undefined) clExp[selId] = true;
    var cur = startVals(), s = '';
    cmds().forEach(function(c, i){
      var T = typeOf(c.type), next = Object.assign({}, cur), on = !!clExp[c.id], isCur = c.id === selId;
      if(T.kind === 'motion') T.axes.forEach(function(a){ var t = c.axes[a]; if(t.on) next[a] = t.mode === 'auto' ? AUTO[mode][a] : t.value; });
      s += '<div class="simrow grp' + (on ? '' : ' closed') + (isCur ? ' cur' : '') + '" data-id="' + c.id + '" title="' + esc(T.label) + '">' +
        '<img class="shev" src="assets/t-shev-open.svg" alt="">' +
        '<span class="cl-n">' + (i + 1) + '</span><span class="lbl">' + esc(summary(c)) + '</span><span class="sim-dot"></span></div>';
      if(on) clLines(c, next).forEach(function(l){
        s += '<div class="simrow code' + (l.c ? ' c-' + l.c : '') + (isCur ? ' cur' : '') + '" data-id="' + c.id + '">' +
          '<span class="lbl">' + esc(l.t) + '</span><span class="sim-dot"></span></div>';
      });
      cur = next;
    });
    var body = cl.querySelector('#arClBody');
    body.innerHTML = s || '<div class="arp-empty">No commands.</div>';
    var selRow = body.querySelector('.simrow.grp.cur'); if(selRow && selRow.scrollIntoView) selRow.scrollIntoView({block:'nearest'});
  }

  /* ============ template UI ============ */
  function barShow(html){ var b = panel.querySelector('#arpBar'); b.innerHTML = html; b.hidden = false; return b; }
  function barHide(){ var b = panel.querySelector('#arpBar'); b.hidden = true; b.innerHTML = ''; }
  function tplLabel(){
    var el = panel.querySelector('#arpTpl .v'); if(!el) return;
    el.textContent = tplShort(TPL[mode]) + (TPL[mode] && tplDirty() ? ' •' : '');
    inspectorSync();
  }
  function tplMenu(anchor){
    var items = [], t = TPL[mode], u = userTpls()[mode];
    // machine presets first (short names — the inspector shows the full G53 form)
    MACHINE[mode].forEach(function(b){ items.push({label:b.short + '  · machine', cur:t && !t.user && t.name===b.name, onPick:function(){ tplPick(b.name, false); }}); });
    if(u.length){
      items.push({sep:true});
      u.forEach(function(x){ items.push({label:x.name, cur:t && t.user && t.name===x.name, onPick:function(){ tplPick(x.name, true); }}); });
    }
    items.push({sep:true});
    items.push({label:'Save as template…', onPick:tplSaveAs});
    if(t && t.user) items.push({label:'Delete "' + t.name + '"', onPick:tplDelete});
    showMenu(anchor, items);
  }
  // replacing an edited list asks first — inline, in the window
  function tplPick(name, user){
    var go = function(){ barHide(); if(playing) setPlaying(false); applyTemplate(mode, name, user); selId = null; render(); };
    if(!tplDirty() || !cmds().length){ go(); return; }
    var b = barShow('<span class="arw-bar__t">Replace current commands with “' + esc(name) + '”?</span>' +
      '<button class="arw-btn arw-btn--pri" data-act="ok">Replace</button><button class="arw-btn" data-act="no">Cancel</button>');
    b.onclick = function(e){ var a = e.target.closest('[data-act]'); if(!a) return; if(a.dataset.act === 'ok') go(); else barHide(); };
  }
  function tplSaveAs(){
    var t = TPL[mode];
    var b = barShow('<span class="input arw-bar__in"><span class="v" contenteditable="true" spellcheck="false" data-placeholder="Template name"></span></span>' +
      '<button class="arw-btn arw-btn--pri" data-act="ok">Save</button><button class="arw-btn" data-act="no">Cancel</button>');
    var v = b.querySelector('.v');
    v.textContent = t && t.user ? t.name : '';
    var save = function(){
      var name = v.textContent.trim(); if(!name) { v.focus(); return; }
      var all = userTpls(), list = all[mode].filter(function(x){ return x.name !== name; });
      list.push({name:name, cmds:serialize(cmds())}); all[mode] = list; saveUserTpls(all);
      TPL[mode] = {name:name, user:true, snap:JSON.stringify(serialize(cmds()))};
      barHide(); tplLabel();
    };
    b.onclick = function(e){ var a = e.target.closest('[data-act]'); if(!a) return; if(a.dataset.act === 'ok') save(); else barHide(); };
    v.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); save(); }
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); barHide(); }
    });
    v.focus();
    // caret at the end of a pre-filled name
    if(v.textContent){ var r = document.createRange(); r.selectNodeContents(v); r.collapse(false); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }
  function tplDelete(){
    var t = TPL[mode]; if(!t || !t.user) return;
    var all = userTpls(); all[mode] = all[mode].filter(function(x){ return x.name !== t.name; }); saveUserTpls(all);
    TPL[mode] = null;                              // the list stays; it is now unsaved
    tplLabel();
  }

  /* ============ list ops ============ */
  function idx(id){ var l = cmds(); for(var i=0;i<l.length;i++) if(l[i].id===id) return i; return -1; }
  function insert(c){ var l = cmds(), i = idx(selId); l.splice(i < 0 ? l.length : i + 1, 0, c); selId = c.id; render(); }
  function addCommand(T){
    if(T.id==='HOME') insert(motion('HOME', homeSpec()));
    else if(T.kind==='motion') insert(motion(T.id, autoSpec(T.axes)));
    else insert(event(T.id, 0));
  }
  function remove(id){ var l = cmds(), i = idx(id); if(i<0) return; l.splice(i,1); if(selId===id) selId = l[Math.min(i, l.length-1)] ? l[Math.min(i, l.length-1)].id : null; render(); }
  function step(d){ var l = cmds(); if(!l.length) return; var i = idx(selId); i = i<0 ? 0 : Math.max(0, Math.min(l.length-1, i+d)); selId = l[i].id; render(); }

  /* ============ render ============ */
  function render(){
    if(!has('arpList')) return;                 // body not attached yet
    var l = cmds();
    if(!sel() && l.length) selId = l[0].id;
    var list = panel.querySelector('#arpList'), s = '';
    l.forEach(function(c, i){
      var T = typeOf(c.type);
      s += '<div class="arp-row' + (c.id===selId ? ' sel' : '') + '" data-id="' + c.id + '" title="' + esc(T.label) + '">' +
        '<span class="arp-row__n">' + (i+1) + '</span>' +
        '<span class="arp-row__t">' + esc(summary(c)) + '</span>' +
        // "⋮" appears on hover / on the selected row and opens the row menu
        '<button class="arp-row__more" data-act="more" title="More">' + ICO.more + '</button></div>';
    });
    list.innerHTML = s || '<div class="arp-empty">No commands. Add one with + or take the current state.</div>';
    // a command picked in the 3D view (or by the player) is brought into view in the list
    var selRow = list.querySelector('.arp-row.sel');
    if(selRow && selRow.scrollIntoView) selRow.scrollIntoView({block:'nearest'});
    panel.querySelector('#arpPrev').classList.toggle('disabled', idx(selId) <= 0);
    panel.querySelector('#arpNext').classList.toggle('disabled', idx(selId) >= l.length-1);
    if(has('arpParams')) renderParams();
    tplLabel();
    viewSync();
    clRender();
  }

  function row(label, ctl, cls){
    return '<div class="irow' + (cls ? ' ' + cls : '') + '"><div class="ilbl"><div class="itl"><span class="rlabel"><span>' + label + '</span></span></div></div>' +
      '<div class="ictl">' + ctl + '</div></div>';
  }
  function dd(val, act, extra){ return '<span class="dropdown" data-act="' + act + '"' + (extra||'') + '><span class="v">' + esc(val) + '</span><img class="i16" src="' + A.chev + '"></span>'; }
  function tgl(on, act, extra){ return '<img class="tgl' + (on ? ' on' : '') + '" data-act="' + act + '"' + (extra||'') + ' src="' + (on ? A.on : A.off) + '">'; }

  // v2 parameter rows: 24px, label column 112px, controls take the rest
  function prow(label, ctl, cls){
    return '<div class="arw-row' + (cls ? ' ' + cls : '') + '"><span class="arw-row__l">' + label + '</span>' +
      '<span class="arw-row__c">' + ctl + '</span></div>';
  }
  function axisRow(c, id){
    var t = c.axes[id], unit = AXES.filter(function(a){ return a.id===id; })[0].unit;
    // checkbox left of the axis name: is the axis part of the command; off → the whole row is disabled
    var auto = t.mode==='auto', val = auto ? fmt(AUTO[mode][id]) : fmt(t.value);
    var ctl = dd(auto ? 'Auto' : 'Fixed', 'axmode', ' data-ax="' + id + '"') +
      '<span class="input arp-in' + (auto ? ' is-auto' : '') + '"><span class="v" data-ax="' + id + '"' + (auto || !t.on ? '' : ' contenteditable="true" spellcheck="false"') + '>' + val + '</span><span class="arp-unit">' + unit + '</span></span>';
    var label = '<span class="chk' + (t.on ? ' on' : '') + '" data-act="axon" data-ax="' + id + '" title="' + (t.on ? 'Included in the command' : 'Not included') + '"></span>' + id;
    return prow(label, ctl, 'arw-axrow' + (t.on ? '' : ' is-off'));
  }
  // axes are shown in two groups: linear (mm) and rotary (°); a group appears only if the command has such axes
  function axisGroup(c, title, ids){
    if(!ids.length) return '';
    return '<div class="arw-grp"><div class="arw-grp__t">' + title + '</div>' + ids.map(function(id){ return axisRow(c, id); }).join('') + '</div>';
  }

  function renderParams(){
    var c = sel(), box = panel.querySelector('#arpParams');
    if(!c){ box.innerHTML = '<div class="arp-empty">Select a command to see its parameters.</div>'; return; }
    var T = typeOf(c.type), s = '';
    s += prow('Type', dd(T.label, 'type'));
    if(T.kind==='motion'){
      // one group per axis family, in the order the families appear in AXES
      var groups = [];
      T.axes.forEach(function(id){
        var g = axisOf(id).group, G = groups.filter(function(x){ return x.title===g; })[0];
        if(!G){ G = {title:g, ids:[]}; groups.push(G); }
        G.ids.push(id);
      });
      groups.forEach(function(G){ s += axisGroup(c, G.title, G.ids); });
    } else if(T.options){
      s += '<div class="arw-grp">' + prow('Value', dd(T.options[c.state] || T.options[0], 'state')) +
        '<div class="arw-note">' + T.note + '</div></div>';
    } else if(c.type==='WAITSEC'){
      s += '<div class="arw-grp">' +
        prow('Time', '<span class="input arp-in"><span class="v" data-num contenteditable="true" spellcheck="false">' + fmt(c.value) + '</span><span class="arp-unit">' + T.unit + '</span></span>') +
        '<div class="arw-note">' + T.note + '</div></div>';
    } else {
      s += '<div class="arw-grp"><div class="arw-note">' + T.note + '</div></div>';
    }
    box.innerHTML = s;
  }

  function onParamsClick(e){
    var c = sel(); if(!c) return;
    var el = e.target.closest('[data-act]'); if(!el) return;
    var act = el.dataset.act, axId = el.dataset.ax;
    if(act==='type'){
      e.stopPropagation();
      showMenu(el, TYPES.map(function(T){ return {label:T.label, cur:T.id===c.type, onPick:function(){ changeType(c, T); }}; }));
    } else if(act==='axon'){
      c.axes[axId].on = !c.axes[axId].on; render();
    } else if(act==='axmode'){
      if(!c.axes[axId].on) return;                 // disabled row: the mode is not editable
      e.stopPropagation();
      showMenu(el, [
        {label:'Auto',  cur:c.axes[axId].mode==='auto',  onPick:function(){ c.axes[axId].mode='auto'; render(); }},
        {label:'Fixed', cur:c.axes[axId].mode==='fixed', onPick:function(){ c.axes[axId].mode='fixed'; c.axes[axId].value = AUTO[mode][axId]; render(); }}
      ]);
    } else if(act==='state'){
      e.stopPropagation();
      var T = typeOf(c.type);
      showMenu(el, T.options.map(function(o, i){
        return {label:o, cur:c.state===i, onPick:function(){ c.state = i; render(); }};
      }));
    }
  }
  function onParamsInput(e){
    var c = sel(), v = e.target.closest('.v[data-ax],.v[data-num]'); if(!c || !v) return;
    var n = parseFloat(v.textContent.replace('−','-').replace(',','.'));
    if(isNaN(n)) return;
    if(v.dataset.ax !== undefined) c.axes[v.dataset.ax].value = n; else c.value = n;
    refreshRow(c); viewSync();
  }
  function refreshRow(c){ var r = panel.querySelector('.arp-row[data-id="' + c.id + '"] .arp-row__t'); if(r) r.textContent = summary(c); }
  function changeType(c, T){
    var l = cmds(), i = idx(c.id), n;
    if(T.kind==='motion'){
      var spec = {};
      T.axes.forEach(function(id){
        if(T.id==='HOME') spec[id] = HOMEPOSE[id];
        else spec[id] = c.axes && c.axes[id] && c.axes[id].on ? (c.axes[id].mode==='auto' ? 'auto' : c.axes[id].value) : 'auto';
      });
      n = motion(T.id, spec);
    } else n = event(T.id, 0);
    n.id = c.id; l[i] = n; render();
  }

  /* ============ 3D preview (lib/robot-preview) ============
     Lives in the viewport while the window is open. Commands are turned into robot poses:
     the machine axes X Y Z A C are mapped onto the demo robot's joints (schematic, not IK).
     Selecting a command highlights its path segment; clicking a segment selects the command;
     the player animates the pose along the segments. */
  var RP = window.CamRobotPreview || null, view = null, viewEl = null, viewFitted = false;
  // where each mode starts: Approach — from the robot home (joints), Return — from the part
  function startVals(){
    var v = {}; AXES.forEach(function(a){ v[a.id] = 0; });
    if(mode === 'Approach') Object.keys(HOMEPOSE).forEach(function(k){ v[k] = HOMEPOSE[k]; });
    else Object.keys(AUTO.Approach).forEach(function(k){ v[k] = AUTO.Approach[k]; });
    return v;
  }
  // joints and external axes drive the robot directly; a Cartesian LIN target is shown as an
  // offset of the joints (schematic — the demo has no inverse kinematics)
  function poseOf(v){
    return {A1: v.A1 + v.X / 8, A2: v.A2 + v.Y / 6, A3: v.A3 - v.Z / 6, A4: v.A4 + v.B / 2,
            A5: v.A5 + v.A / 2, A6: v.A6 + v.C / 2, E1: v.E1, E2: v.E2};
  }
  // resolved axis values after every command: [{id, from, to, moves}]
  function timeline(){
    var cur = startVals(), out = [];
    cmds().forEach(function(c){
      var T = typeOf(c.type), next = Object.assign({}, cur), moves = false;
      if(T.kind === 'motion') T.axes.forEach(function(a){
        var t = c.axes[a]; if(!t.on) return;
        var val = t.mode === 'auto' ? AUTO[mode][a] : t.value;
        if(val !== next[a]) moves = true;
        next[a] = val;
      });
      out.push({id:c.id, kind:T.kind, from:poseOf(cur), to:poseOf(next), moves:moves});
      cur = next;
    });
    return out;
  }
  function viewOpen(){
    if(!RP || view) return;
    viewEl = h('<div class="arw-view" aria-label="Approach / Return preview"></div>');
    document.querySelector('.viewport').appendChild(viewEl);
    document.querySelector('.viewport').classList.add('ar-open');
    view = new RP.RobotPreview(viewEl, {
      onSegmentSelect: function(id){ if(playing) setPlaying(false); selId = id; render(); }
    });
    viewFitted = false;
  }
  function viewClose(){
    document.querySelector('.viewport').classList.remove('ar-open');
    if(view){ view.destroy(); view = null; }
    if(viewEl){ viewEl.remove(); viewEl = null; }
  }
  function viewSync(){
    if(!view) return;
    var tl = timeline(), segs = tl.filter(function(s){ return s.moves; })
      .map(function(s){ return {id:s.id, from:s.from, to:s.to}; });
    view.setSegments(segs, {fit:!viewFitted}); viewFitted = true;
    // non-motion commands (and moves that do not move) are shown as markers at the tool point
    view.setMarkers(tl.filter(function(s){ return !s.moves; }).map(function(s){
      var c = cmds().filter(function(x){ return x.id === s.id; })[0], t = c ? c.type : '';
      return {id:s.id, pose:s.to,
              kind: s.kind === 'stop' ? 'stop' : (t === 'WAITIN' || t === 'WAITSEC') ? 'wait' : 'event'};
    }));
    var cur = tl.filter(function(s){ return s.id === selId; })[0];
    view.setSelectedSegment(cur ? cur.id : null);
    if(!playing) view.setPose(cur ? cur.to : (tl.length ? tl[tl.length-1].to : poseOf(startVals())));
  }
  // player: runs from the selected command to the end; motion segments take 1.5 s at 50%,
  // LCS events hold 0.3 s, M0 / M1 stop the run on that command
  var raf = 0, BASE_MS = 1500;
  function playLoop(){
    var tl = timeline(), i = Math.max(0, tl.map(function(s){ return s.id; }).indexOf(selId)), t = 0, last = 0;
    if(!tl.length){ setPlaying(false); return; }
    // a stop that is already selected has been "acknowledged": start from the next command
    if(tl[i].kind === 'stop' && i < tl.length - 1) i++;
    function frame(now){
      if(!playing) return;
      var dt = last ? now - last : 0; last = now;
      var s = tl[i], dur = s.kind === 'motion' && s.moves ? BASE_MS : 300;
      t += dt * (speed / 50) / dur;
      if(s.id !== selId){ selId = s.id; render(); }
      if(view && s.moves) view.setPose(RP.interpolatePose(s.from, s.to, Math.min(1, t)));
      if(t >= 1){
        t = 0; last = now;
        if(s.kind === 'stop' || i >= tl.length - 1){ setPlaying(false); return; }
        i++;
        if(tl[i].kind === 'stop'){ selId = tl[i].id; render(); setPlaying(false); return; }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ============ header / player state ============ */
  function setMode(m){
    mode = m; selId = null; viewFitted = false;      // new mode → refit the camera once
    panel.querySelector('#arpTitle').textContent = mode;
    render();
  }
  function setSpeed(v){
    speed = v;
    if(!has('arpSpeed')) return;
    panel.querySelector('#arpFill').style.width = v + '%';
    panel.querySelector('#arpKnob').style.left = v + '%';
    panel.querySelector('#arpSpeed').title = 'Simulation speed · ' + v + '%';
    if(has('arpVal')) panel.querySelector('#arpVal').textContent = v + '%';
  }
  function setPlaying(on){
    playing = on;
    panel.classList.toggle('playing', on);
    if(has('arpPlay')) panel.querySelector('#arpPlay').title = on ? 'Pause' : 'Play';
    cancelAnimationFrame(raf);
    if(on) playLoop(); else viewSync();          // paused: the pose snaps to the selected command
  }

  // open(which, templateName?, isUser?) — with a template the list is replaced by it (inspector pick)
  function open(which, tplName, user){
    if(!panel) build();
    var m = which === 'Return' ? 'Return' : 'Approach';
    if(tplName){ if(playing) setPlaying(false); applyTemplate(m, tplName, user); selId = null; }
    viewOpen();
    setMode(m);
    panel.classList.add('open');
  }
  // close(which?) — with a mode: close only if the window shows that mode (inspector picked a strategy)
  function close(which){
    if(!panel || (which && which !== mode)) return;
    setPlaying(false); closeMenu(); panel.classList.remove('open'); viewClose();
    if(clOpen) clToggle(false);
  }
  // template names for the inspector dropdown
  function templates(which){
    var m = which === 'Return' ? 'Return' : 'Approach';
    return {machine: MACHINE[m].map(function(t){ return t.name; }), user: userTpls()[m].map(function(t){ return t.name; })};
  }

  window.arOpen = open;
  window.arClose = close;
  window.arTemplates = templates;
  // the view cube (app.js) drives / follows the preview camera while the window is open
  window.arView = function(){ return view; };
})();
