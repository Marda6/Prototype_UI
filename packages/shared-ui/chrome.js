// ENCY Core — application window shell: title bar, sidebar and their behavior.
//
// A section includes this file after its markup and declares itself before it:
//   <script>window.ENCY_APP = {id: "license-manager"};</script>
// The script inserts the title bar as the first child of .app and the sidebar as
// the first child of .workspace, so a section file only keeps <main class="content">.
(function(){
  'use strict';

  // ——— section registry: the single source of truth for the sidebar and the hub ———
  // A new section = a packages/<id> folder plus an entry here.
  //   id     — folder name; the relative link ../<id>/ is built from it too
  //   group  — where the item sits in the sidebar: 'nav' (top) | 'account' (bottom)
  //   icon   — a file in shared-ui/assets, or svg: an inline icon
  var SECTIONS = [
    {id:'extension-store', title:'Extension Store', group:'nav',
     icon:'st-ext.svg', iconSize:16},
    {id:'license-manager', title:'License manager', group:'account',
     svg:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"' +
         ' stroke-linecap="round" stroke-linejoin="round">' +
         '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/>' +
         '<path d="M4.5 6.5h3M4.5 9.5h7M9.5 6.5h2"/></svg>'}
  ];

  var APP = window.ENCY_APP || {};
  // application area: 'home' — sections outside a project (Home pressed, no project
  // tab active), 'project' — screens inside an open project
  var AREA = APP.area || 'home';
  // from packages/<id>/ to packages/shared-ui/ is exactly one level up
  var BASE = '../shared-ui/assets/';
  // prototype switch for the active license state: ?license=expired | ?license=ok
  // (persisted so that it survives navigation between sections, which reloads the page)
  var LIC = 'ok';
  try {
    var q = new URLSearchParams(location.search).get('license');
    if (q) localStorage.setItem('ency.lic', q);
    LIC = localStorage.getItem('ency.lic') || 'ok';
  } catch(e){}

  function icon(s){
    if (s.svg) return '<span class="icn16">' + s.svg + '</span>';
    var st = s.iconSize ? ' style="width:' + s.iconSize + 'px;height:' + s.iconSize + 'px"' : '';
    return '<span class="icn16"><img src="' + BASE + s.icon + '" alt=""' + st + '></span>';
  }

  // sidebar item: the active section is not a link, the rest navigate to ../<id>/
  function sectionRow(s){
    var active = s.id === APP.id;
    return '<div class="srow' + (active ? ' active' : '') + '"' +
      (active ? '' : ' data-app="../' + s.id + '/"') + '>' +
      icon(s) + '<span class="t">' + s.title + '</span></div>';
  }

  function group(name){
    return SECTIONS.filter(function(s){ return s.group === name; }).map(sectionRow).join('\n');
  }

  // the end of a project tab: where the project lives (the computer = a local file; Core's local_16) — a
  // click on it opens the project window ("Project window" below) — then the close cross
  function tabEnd(){
    return '<span class="htab-loc" title="Local project"><img src="' + BASE + 'hdr-tabicn.svg" alt=""></span>' +
      '<img class="htab-x" src="' + BASE + 'hdr-tabclose.svg" alt="">';
  }

  // ——— window title bar ———
  function topbar(){
    return '' +
    '<header class="topbar">' +
      '<div class="hbtn" id="logoBtn" title="Menu"><img class="hicn-act hicn-logo" src="' + BASE + 'hdr-logo.svg" alt=""></div>' +
      '<div class="hdiv"></div>' +
      '<div class="hgroup-left">' +
        '<div class="hbtn' + (AREA === 'home' ? ' on' : '') + '" title="Home"' +
          (AREA === 'project' ? ' data-app="../clouds/"' : '') + '>' +
          '<img class="hicn-act" src="' + BASE + 'hdr-home.svg" alt=""></div>' +
        '<div class="hbtn" id="hdrExt" title="Utilities">' +
          '<img class="hicn-act" src="' + BASE + 'hdr-list.svg" alt=""></div>' +
        '<div class="hbtn" title="New file"><img class="hicn-act" src="' + BASE + 'hdr-file.svg" alt=""></div>' +
        '<div class="hbtn" title="Open"><img class="hicn-act" src="' + BASE + 'hdr-folder.svg" alt=""></div>' +
        '<div class="hbtn" title="Save"><img class="hicn-act hicn-save" src="' + BASE + 'hdr-save.svg" alt=""></div>' +
      '</div>' +
      '<div class="hdiv"></div>' +
      '<div class="htabs">' +
        // in the home area no project tab is active — Home is active
        '<div class="htab' + (AREA === 'project' ? ' active' : '') + '"' +
          (AREA === 'project' ? '' : ' data-app="../project/"') + '>' +
          '<span class="htab-t">Turn part probing 2</span>' + tabEnd() + '</div>' +
        // big-project stress case (391 operations, CAM-724): the project app builds its tree
        '<div class="htab" data-proj="ency393"' +
          (AREA === 'project' ? '' : ' data-app="../project/?project=ency393"') + '>' +
          '<span class="htab-t">ENCY393</span>' + tabEnd() + '</div>' +
        '<div class="htab"><span class="htab-t">New project 2</span>' + tabEnd() + '</div>' +
        '<div class="htab"><span class="htab-t">New project 3</span>' + tabEnd() + '</div>' +
        '<div class="hbtn" title="New tab"><img class="hicn-plus" src="' + BASE + 'hdr-plus.svg" alt=""></div>' +
      '</div>' +
      '<div class="hgroup-right">' +
        // (license state is not shown here: the top bar is reserved for global notifications — the bell;
        // the prototype's Online / Offline switch moved to License manager's page header)
        '<div class="hdiv"></div>' +
        // global notifications (projects · Clouds · License manager), see "Notifications" below
        '<div class="hbtn nt-bell" id="hdrNotify" title="Notifications"><img class="hicn32" src="' + BASE + 'hdr-notify.svg" alt="">' +
          '<i class="nt-badge" hidden></i></div>' +
        '<div class="hbtn" title="More"><img class="hicn32" src="' + BASE + 'hdr-chevron.svg" alt=""></div>' +
        '<div class="hbtn" title="Minimize"><img class="hicn32" src="' + BASE + 'hdr-min.svg" alt=""></div>' +
        '<div class="hbtn" title="Maximize"><img class="hicn32" src="' + BASE + 'hdr-max.svg" alt=""></div>' +
        '<div class="hbtn" title="Close"><img class="hicn32" src="' + BASE + 'hdr-close.svg" alt=""></div>' +
      '</div>' +
    '</header>';
  }

  // ——— sidebar ———
  function sidebar(){
    return '' +
    '<aside class="sidebar">' +
      '<div class="sb">' +
        '<nav class="snav">' +
          '<div class="srow srow-recent" data-page="recent">' +
            '<span class="icn16"><img src="' + BASE + 'sb-recent.svg" alt="" style="width:12px;height:12px"></span>' +
            '<span class="t">Recent</span>' +
            '<span class="spin sfade" id="pinBtn" title="Pin panel">' +
              '<img src="' + BASE + 'sb-pin.svg" alt=""></span>' +
          '</div>' +
          // Clouds is a regular packages/clouds section, but the item stays here:
          // it has a special position (between Recent and Local) and a dot indicator
          '<div class="srow' + (APP.id === 'clouds' ? ' active' : '') + '"' +
            (APP.id === 'clouds' ? '' : ' data-app="../clouds/"') + ' data-page="clouds">' +
            '<span class="icn16"><img src="' + BASE + 'sb-clouds.svg" alt="" style="width:12px;height:12px"></span>' +
            '<span class="t">Clouds</span>' +
            '<img class="sfade" src="' + BASE + 'sb-clouds-dot.svg" alt="" style="width:16px;height:16px">' +
          '</div>' +
          '<div class="srow" data-page="local">' +
            '<span class="icn16"><img src="' + BASE + 'sb-local.svg" alt=""></span>' +
            '<span class="t">Local</span>' +
          '</div>' +
          group('nav') +
        '</nav>' +
        '<div class="sdiv"></div>' +
        '<nav class="snav snav-fav">' +
          '<div class="srow">' +
            '<span class="icn16"><img src="' + BASE + 'sb-star-filled.svg" alt="" style="width:14px;height:13px"></span>' +
            '<span class="t">Favorites</span>' +
          '</div>' +
          fav('fav-training.png', 'Training Course: "3D CNC Milling"', 'av-yellow') +
          fav('fav-hellic.png', 'Hellic') +
          fav('fav-additive.png', 'Additive') +
          fav('fav-partmore.png', 'Part More 4X') +
          fav('fav-aerospace.png', 'Aerospace part') +
        '</nav>' +
        '<div class="sspacer"></div>' +
        '<div class="sdiv"></div>' +
        '<div class="slinks">' +
          '<a href="#">What’s new</a>' +
          '<a href="#">Documentation</a>' +
          '<a href="#">Self-paced learning</a>' +
        '</div>' +
        '<div class="sdiv"></div>' +
        '<div class="sinfo">' +
          // the value is swapped live by ENCY_CHROME.setLicense()
          '<div class="grp"><span class="lbl">Active license:</span><span class="val" id="sbLic">' +
            (LIC === 'expired' ? '#421481 · Expired' : '#421480') + '</span></div>' +
          '<div class="grp"><span class="lbl">Licensee:</span><span class="val">TONINI FABIO ELETTROMECCANICA</span></div>' +
          // connection state follows the Online / Offline toggle (.app.offline) — CSS swaps the two values
          '<div class="grp"><span class="lbl">Connection:</span>' +
            '<span class="val sinfo-conn"><i></i><span class="on">Online</span><span class="off">Offline · no internet</span></span></div>' +
        '</div>' +
        '<div class="sdiv"></div>' +
        '<nav class="snav">' +
          group('account') +
          '<div id="sbAccount">' + accountRow() + '</div>' +
        '</nav>' +
      '</div>' +
    '</aside>';
  }

  // ——— account: signed in → name + e-mail row (click opens the account popover);
  //     signed out → a "Sign in" row in the same place ———
  var USER = {name:'Ruslan Mardanshin', mail:'ruslan.m@encycam.io'};
  var AUTH = 'in';
  try { AUTH = localStorage.getItem('ency.auth') || 'in'; } catch(e){}
  function accountRow(){
    if (AUTH !== 'in') {
      return '<div class="srow srow-signin" data-act="signin" title="Sign in">' +
        '<span class="icn16 sacc-icn"><img src="' + BASE + 'sb-account.svg" alt=""></span>' +
        '<span class="t">Sign in</span></div>';
    }
    return '<div class="srow srow-user" data-act="account">' +
      '<span class="icn16 sacc-icn"><img src="' + BASE + 'sb-account.svg" alt=""></span>' +
      '<span class="t suser">' +
        '<span class="suser-name">' + USER.name + '</span>' +
        '<span class="suser-mail">' + USER.mail + '</span>' +
      '</span></div>';
  }

  function fav(file, title, cls){
    return '<div class="srow srow-fav">' +
      '<span class="savatar' + (cls ? ' ' + cls : '') + '"><img src="' + BASE + file + '" alt=""></span>' +
      '<span class="t">' + title + '</span></div>';
  }

  // ——— insertion and behavior ———
  var app = document.getElementById('app'),
      workspace = app && app.querySelector('.workspace');
  if (!app || !workspace) return;

  if (LIC === 'expired') app.classList.add('lic-expired');
  app.insertAdjacentHTML('afterbegin', topbar());
  // the home sidebar exists only outside a project
  if (AREA !== 'project') workspace.insertAdjacentHTML('afterbegin', sidebar());

  // sidebar pin: state lives in localStorage so it doesn't reset
  // when navigating between sections (which is a full page reload)
  var pinBtn = document.getElementById('pinBtn');
  if (pinBtn) {
    try { if (localStorage.getItem('ency.sidebar.pinned') === '1') app.classList.add('pinned'); } catch(e){}
    pinBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var on = app.classList.toggle('pinned');
      try { localStorage.setItem('ency.sidebar.pinned', on ? '1' : '0'); } catch(e){}
    });
  }

  // navigation between sections: the relative path works both on Pages and locally
  document.querySelectorAll('[data-app]').forEach(function(r){
    r.addEventListener('click', function(){ location.href = r.dataset.app; });
  });

  // prototype switch: the application online / without internet (.app.offline), kept in
  // localStorage['ency.net'] so every section opens in the same state. The switch itself (#connSeg,
  // [data-net] segments) is License manager's, in its page header; other sections only follow it
  var setNet = (function(){
    var seg = document.getElementById('connSeg');
    function apply(net){
      app.classList.toggle('offline', net === 'offline');
      if (seg) seg.querySelectorAll('.ci').forEach(function(x){
        x.classList.toggle('on', x.dataset.net === net);
      });
      try { localStorage.setItem('ency.net', net); } catch(e){}
    }
    var saved = 'online';
    try { saved = localStorage.getItem('ency.net') || 'online'; } catch(e){}
    apply(saved);
    if (seg) seg.querySelectorAll('.ci').forEach(function(x){
      x.addEventListener('click', function(){ apply(x.dataset.net); });
    });
    return apply;
  })();

  // colour themes; set as data-theme on <html>, kept across sections like online/offline
  // (the colours: "Themes" in project/app.css). Picked in the logo menu (Theme ›) and in
  // System setup → Colors → UI theme, both through window.ENCY_THEMES
  (function(){
    var THEMES = [
      {id:'',               t:'Graphite', g:'Dark',  base:'#0e1010'},
      {id:'steel',          t:'Steel',    g:'Dark',  base:'#0d1015'},
      {id:'graphite-light', t:'Silver',   g:'Light', base:'#f3f6f6'},   // the light pair of Graphite
      {id:'steel-light',    t:'Frost',    g:'Light', base:'#f0f5fd'}    // the light pair of Steel
    ];
    var root = document.documentElement, cur = '';
    function apply(id){
      cur = id;
      if (id) root.setAttribute('data-theme', id); else root.removeAttribute('data-theme');
      try { localStorage.setItem('ency.theme', id); } catch(e){}
    }
    try { cur = localStorage.getItem('ency.theme') || ''; } catch(e){}
    // a theme that is gone (the old A–D variants) falls back to the default
    if (!THEMES.some(function(o){ return o.id === cur; })) cur = '';
    apply(cur);
    window.ENCY_THEMES = {list:THEMES, get:function(){ return cur; }, set:apply};
  })();

  // logo menu, as in ENCY: Settings · Theme › · About · Version · License manager. Icons from ENCY's
  // own sprite (Supplement/GUI/SVG/Dark_Menu.svg, 28px cells: Settings 5·9, VersionInfo 5·10,
  // LM 6·1, AppLogo2 6·2), drawn at 20px; Theme opens the Dark / Light list to the right.
  // Settings opens System setup (shared-ui/setup.js, loaded on first use)
  (function(){
    var btn = document.getElementById('logoBtn'), menu = null, sub = null;
    if (!btn) return;
    var TH = window.ENCY_THEMES;
    var ITEMS = [
      {id:'settings', t:'Settings',        ic:'-160px -80px'},
      {id:'theme',    t:'Theme'},
      {id:'about',    t:'About',           ic:'-20px -100px'},
      {id:'version',  t:'Version',         ic:'-180px -80px'},
      {id:'lm',       t:'License manager', ic:'0 -100px'}
    ];
    var ARR = '<svg class="hm-arr" viewBox="0 0 16 16" fill="none"><path d="M6.5 5L9.5 8L6.5 11" stroke="currentColor"/></svg>';
    function curTheme(){ var id = TH.get(); return TH.list.filter(function(o){ return o.id === id; })[0] || TH.list[0]; }
    function closeSub(){
      if (sub){ sub.remove(); sub = null; }
      if (menu){ var r = menu.querySelector('.hm-opt.open'); if (r) r.classList.remove('open'); }
    }
    function close(){ closeSub(); if (menu){ menu.remove(); menu = null; btn.classList.remove('open'); } }
    function openSub(row){
      if (sub) return;
      var id = TH.get();
      sub = document.createElement('div');
      sub.className = 'hmenu hm-sub';
      // grouped Dark / Light
      sub.innerHTML = TH.list.map(function(o, i){
        return (i && TH.list[i - 1].g === o.g ? '' : '<div class="hm-head">' + o.g + '</div>') +
          '<div class="hm-opt' + (o.id === id ? ' cur' : '') + '" data-th="' + o.id + '">' +
          '<span class="hm-ck">' + (o.id === id ? '✓' : '') + '</span>' + o.t + '</div>';
      }).join('');
      sub.addEventListener('click', function(ev){
        ev.stopPropagation();
        var opt = ev.target.closest('.hm-opt'); if (!opt) return;
        TH.set(opt.dataset.th); close();
      });
      document.body.appendChild(sub);
      row.classList.add('open');
      // the first option level with the Theme row (its 2px padding and the head above it)
      var r = row.getBoundingClientRect(), m = menu.getBoundingClientRect(), h = sub.querySelector('.hm-opt');
      var dy = h.getBoundingClientRect().top - sub.getBoundingClientRect().top;
      sub.style.left = (m.right + 2) + 'px';
      sub.style.top = Math.max(4, Math.min(r.top - dy, innerHeight - sub.offsetHeight - 4)) + 'px';
    }
    function openSetup(){
      if (window.ENCY_SETUP){ window.ENCY_SETUP.open(); return; }
      // the stylesheet first, so the window never shows unstyled
      var dir = BASE.replace(/assets\/$/, '');
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = dir + 'setup.css';
      l.onload = function(){
        var s = document.createElement('script');
        s.src = dir + 'setup.js';
        s.onload = function(){ window.ENCY_SETUP.open(); };
        document.head.appendChild(s);
      };
      document.head.appendChild(l);
    }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (menu){ close(); return; }
      var th = curTheme();
      menu = document.createElement('div');
      menu.className = 'hmenu hm-main';
      menu.innerHTML = ITEMS.map(function(o){
        var ic = o.id === 'theme'
          ? '<span class="hm-ic"><i class="hm-sw" style="background:' + th.base + '"></i></span>'
          : '<span class="hm-ic hm-spr" style="background-position:' + o.ic + '"></span>';
        return '<div class="hm-opt" data-act="' + o.id + '"' +
          (o.id === 'about' || o.id === 'version' ? ' title="Not built in the prototype"' : '') + '>' + ic +
          '<span class="hm-t">' + o.t + '</span>' +
          (o.id === 'theme' ? '<span class="hm-val">' + th.t + '</span>' + ARR : '') + '</div>';
      }).join('');
      // the Theme list follows the pointer: opens over its row, closes over any other
      menu.addEventListener('mouseover', function(ev){
        var row = ev.target.closest('.hm-opt'); if (!row) return;
        if (row.dataset.act === 'theme') openSub(row); else closeSub();
      });
      menu.addEventListener('click', function(ev){
        ev.stopPropagation();
        var row = ev.target.closest('.hm-opt'); if (!row) return;
        var act = row.dataset.act;
        if (act === 'theme'){ if (sub) closeSub(); else openSub(row); return; }
        close();
        if (act === 'settings') openSetup();
        else if (act === 'lm' && APP.id !== 'license-manager') location.href = '../license-manager/';
      });
      document.body.appendChild(menu);
      var r = btn.getBoundingClientRect();
      menu.style.left = r.left + 'px';
      menu.style.top = (r.bottom + 4) + 'px';
      btn.classList.add('open');
    });
    document.addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  })();

  // account popover (name · e-mail · Sign out) and the sign-in / sign-out switch
  (function(){
    var host = document.getElementById('sbAccount');
    if (!host) return;
    var pop = null;
    function setAuth(a){
      AUTH = a;
      try { localStorage.setItem('ency.auth', a); } catch(e){}
      closePop();
      host.innerHTML = accountRow();
    }
    function closePop(){ if (pop){ pop.remove(); pop = null; } }
    function openPop(row){
      closePop();
      pop = document.createElement('div');
      pop.className = 'acc-pop';
      pop.innerHTML =
        '<div class="acc-head">' +
          '<span class="acc-avatar"><img src="' + BASE + 'sb-account.svg" alt=""></span>' +
          '<span class="acc-txt"><span class="acc-name">' + USER.name + '</span>' +
            '<span class="acc-mail">' + USER.mail + '</span></span>' +
        '</div>' +
        '<div class="acc-div"></div>' +
        '<button class="acc-btn" data-act="signout">Sign out</button>';
      document.body.appendChild(pop);
      // to the right of the row, bottom edges aligned; never below the window edge
      var r = row.getBoundingClientRect(), h = pop.offsetHeight;
      pop.style.left = (r.right + 8) + 'px';
      pop.style.top = Math.max(8, Math.min(r.bottom - h, window.innerHeight - h - 8)) + 'px';
      pop.addEventListener('click', function(e){
        e.stopPropagation();
        if (e.target.closest('[data-act="signout"]')) setAuth('out');
      });
    }
    host.addEventListener('click', function(e){
      var row = e.target.closest('[data-act]'); if (!row) return;
      e.stopPropagation();
      if (row.dataset.act === 'signin') { setAuth('in'); return; }
      if (pop) closePop(); else openPop(row);
    });
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePop(); });
  })();

  // ——— Utilities (the "list" button in the title bar): ENCY's utility search and its New utility window ———
  // As in ENCY (TUtilitySearchForm / TUtilityEditForm in SCKernel.dll, strings in CAM_Eng.lng):
  // search · Sort (Recent / A - Z / Z - A) · "+" new utility, then the built-in and the custom utilities
  // in one list. Built-in ones are ENCY's internal utilities ($PostprocessorsGenerator, $MacrosForm, …)
  // with ENCY's own icons: its menu sprite (assets/ency/menu(-dark).svg = Dark_Menu.svg, 28px cells drawn
  // at 20) and, for Open macros, Other_28_28.svg (assets/ency/other(-dark).svg). Interpreter configurator
  // has no SVG in ENCY (its list uses a PNG) — the sprite's ConfigUtils glyph stands in.
  // Custom utilities (.exe / .dll / .spr) are added, edited and deleted here and kept in
  // localStorage['ency.utilities']; Recent = how often each one was run (ENCY's
  // Config/utilitysearch/utility_usage.json), kept in localStorage['ency.utilities.usage'].
  // Open macros opens the Automation panel of the project (window.ENCY_MACRO); the rest are not built.
  var UT_BUILTIN = [
    {uid:'PostprocessorsGenerator', t:'Postprocessors generator', ic:'-120px -20px'},
    {uid:'MacrosForm',              t:'Open macros',              ic:'0 -40px', spr:'other', app:'macro'},
    {uid:'InterpreterConfigurator', t:'Interpreter configurator', ic:'-160px -20px'},
    {uid:'MachineMaker',            t:'MachineMaker',             ic:'-60px -20px'},
    {uid:'CLDViewer',               t:'CLData viewer',            ic:'-100px -20px'},
    {uid:'CreateInterpreter',       t:'Create interpreter',       ic:'-180px -20px'},
    {uid:'AddinManager',            t:'Addin manager',            ic:'-140px -20px'},
    {uid:'Calculator',              t:'Calculator',               ic:'-80px -20px'},
    {uid:'OperationsManager',       t:'Operations manager',       ic:'0 -20px'},
    {uid:'CreateScriptOperation',   t:'Create script operation',  ic:'-20px -20px'},
    {uid:'ScriptsIDE',              t:'Scripts IDE',              ic:'-160px 0'},
    {uid:'LogsWin',                 t:'Logs',                     ic:'-40px -20px'}
  ];
  // ENCY's types (rsTypeExe / Dll / Spr); a script may also be .sx
  var UT_TYPES = [
    {id:'exe', t:'Executable file (.exe)', ext:['exe']},
    {id:'dll', t:'Library (.dll)',         ext:['dll']},
    {id:'spr', t:'Script (.spr)',          ext:['spr', 'sx']}
  ];
  var UT_SORTS = [{id:'recent', t:'Recent'}, {id:'az', t:'A - Z'}, {id:'za', t:'Z - A'}];
  var UT_SVG = {
    plus:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>',
    chev:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.5l3 3 3-3"/></svg>',
    x:      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    edit:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M10.4 3.1l2.5 2.5M2.7 11.2l7.7-7.7 2.5 2.5-7.7 7.7-3 .5.5-3z"/></svg>',
    del:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 4.5h11M6.5 4.5V2.5h3v2M4 4.5l.7 9h6.6l.7-9M6.7 7v4M9.3 7v4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4L11 8h8a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/></svg>'
  };
  function utGet(k, def){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch(e){ return def; } }
  function utPut(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function utEsc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]; }); }
  // one custom utility as a sample; the counts are ENCY's utility_usage.json on this machine
  var UT_CUSTOM = utGet('ency.utilities', [
    {id:'c1', t:'Probe data import', type:'exe', path:'D:\\ENCY\\Utils\\ProbeImport.exe', params:'/silent'}
  ]);
  var UT_USAGE = utGet('ency.utilities.usage', {PostprocessorsGenerator:5, MacrosForm:3, InterpreterConfigurator:1});
  var UT_SORT = utGet('ency.utilities.sort', 'recent');
  function utType(id){ return UT_TYPES.filter(function(o){ return o.id === id; })[0] || UT_TYPES[0]; }
  function utTypeOf(path){
    var ext = (String(path).match(/\.([^.\\\/]+)$/) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    return UT_TYPES.filter(function(o){ return o.ext.indexOf(ext) >= 0; })[0] || null;
  }
  // built-in and custom in one list: Recent = most run first (ties keep ENCY's order), else by name
  function utAll(){
    var a = UT_BUILTIN.map(function(b, i){ return {key:b.uid, t:b.t, b:b, i:i}; }).concat(
      UT_CUSTOM.map(function(c, i){ return {key:c.id, t:c.t, c:c, i:UT_BUILTIN.length + i}; }));
    return a.sort(function(x, y){
      if (UT_SORT === 'az') return x.t.localeCompare(y.t);
      if (UT_SORT === 'za') return y.t.localeCompare(x.t);
      return (UT_USAGE[y.key] || 0) - (UT_USAGE[x.key] || 0) || x.i - y.i;
    });
  }

  (function(){
    var btn = document.getElementById('hdrExt');
    if (!btn) return;
    var pop = null, list = null, q = null, sortMenu = null, dlg = null, act = -1;

    function closeSort(){
      if (sortMenu){ sortMenu.remove(); sortMenu = null; pop && pop.querySelector('.ut-sort').classList.remove('open'); }
    }
    function closePop(){
      if (dlg) return;   // the window over it closes first
      closeSort();
      if (pop){ pop.remove(); pop = null; btn.classList.remove('open'); }
    }
    function mark(t, s){
      var i = s ? t.toLowerCase().indexOf(s) : -1;
      if (i < 0) return utEsc(t);
      return utEsc(t.slice(0, i)) + '<mark class="ut-hl">' + utEsc(t.slice(i, i + s.length)) + '</mark>' + utEsc(t.slice(i + s.length));
    }
    function row(x, s){
      var ic = x.b
        ? '<span class="ut-ic" style="background-position:' + x.b.ic + '"' + (x.b.spr ? ' data-spr="' + x.b.spr + '"' : '') + '></span>'
        : '<span class="ut-ic ut-ph"></span>';
      return '<div class="ut-row" data-key="' + x.key + '">' + ic +
        '<span class="ut-name">' + mark(x.t, s) + '</span>' +
        (x.c ? '<span class="ut-type">' + x.c.type + '</span>' +
          '<span class="ut-rb" data-act="edit" title="Edit">' + UT_SVG.edit + '</span>' +
          '<span class="ut-rb danger" data-act="del" title="Delete">' + UT_SVG.del + '</span>' : '') +
        '</div>';
    }
    // keep: the row to light after the list is redrawn (a new or edited utility)
    function render(keep){
      if (!pop) return;
      var s = q.value.trim().toLowerCase();
      var a = utAll().filter(function(x){ return !s || x.t.toLowerCase().indexOf(s) >= 0; });
      pop.querySelector('.ut-search').classList.toggle('has-q', !!q.value);
      list.innerHTML = a.length ? a.map(function(x){ return row(x, s); }).join('')
        : '<div class="ut-empty">No utilities match “' + utEsc(q.value.trim()) + '”</div>';
      var rows = list.querySelectorAll('.ut-row');
      act = -1;
      if (keep) rows.forEach(function(r, i){ if (r.dataset.key === keep) act = i; });
      else if (s && rows.length) act = 0;
      light(true);
    }
    function light(scroll){
      var rows = list.querySelectorAll('.ut-row');
      rows.forEach(function(r, i){ r.classList.toggle('act', i === act); });
      if (scroll && rows[act]) rows[act].scrollIntoView({block:'nearest'});
    }
    function find(key){
      return utAll().filter(function(x){ return x.key === key; })[0];
    }
    function run(key){
      var x = find(key); if (!x) return;
      UT_USAGE[key] = (UT_USAGE[key] || 0) + 1;
      utPut('ency.utilities.usage', UT_USAGE);
      closePop();
      if (x.b && x.b.app){
        var api = window['ENCY_' + x.b.app.toUpperCase()];
        if (AREA === 'project' && api && api.open) api.open();
        else location.href = '../project/?utility=' + x.b.app;
      }
    }

    // ——— Sort: ENCY's three orders, in the logo menu's look, under its button (+2) ———
    function openSort(b){
      if (sortMenu){ closeSort(); return; }
      sortMenu = document.createElement('div');
      sortMenu.className = 'hmenu ut-sortmenu';
      sortMenu.innerHTML = '<div class="hm-head">Sort</div>' + UT_SORTS.map(function(o){
        return '<div class="hm-opt' + (o.id === UT_SORT ? ' cur' : '') + '" data-sort="' + o.id + '">' +
          '<span class="hm-ck">' + (o.id === UT_SORT ? '✓' : '') + '</span>' + o.t + '</div>';
      }).join('');
      sortMenu.addEventListener('click', function(e){
        e.stopPropagation();
        var o = e.target.closest('[data-sort]'); if (!o) return;
        UT_SORT = o.dataset.sort; utPut('ency.utilities.sort', UT_SORT);
        b.querySelector('.ut-sort-t').textContent = UT_SORTS.filter(function(x){ return x.id === UT_SORT; })[0].t;
        closeSort(); render(); q.focus();
      });
      document.body.appendChild(sortMenu);
      // right edges aligned, so the list stays over the popover
      var r = b.getBoundingClientRect();
      sortMenu.style.left = Math.max(8, r.right - sortMenu.offsetWidth) + 'px';
      sortMenu.style.top = (r.bottom + 2) + 'px';
      b.classList.add('open');
    }

    function openPop(){
      var cur = UT_SORTS.filter(function(x){ return x.id === UT_SORT; })[0] || UT_SORTS[0];
      pop = document.createElement('div');
      pop.className = 'ut-pop';
      pop.innerHTML =
        '<div class="ut-bar">' +
          '<label class="ut-search"><img class="ut-sic" src="' + BASE + 'st-search.svg" alt="">' +
            '<input type="text" placeholder="Search…" spellcheck="false" autocomplete="off">' +
            '<span class="ut-clr" title="Clear · Esc">' + UT_SVG.x + '</span></label>' +
          '<span class="ut-sort" title="Sort"><span class="ut-sort-t">' + cur.t + '</span>' + UT_SVG.chev + '</span>' +
          '<span class="ut-ib" data-act="new" title="New utility">' + UT_SVG.plus + '</span>' +
        '</div>' +
        '<div class="ut-sep"></div>' +
        '<div class="ut-list" role="listbox"></div>';
      document.body.appendChild(pop);
      list = pop.querySelector('.ut-list');
      q = pop.querySelector('input');
      render();
      var r = btn.getBoundingClientRect();
      pop.style.left = r.left + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      btn.classList.add('open');
      q.addEventListener('input', function(){ render(); });
      // ↑ ↓ walk the list, Enter runs, Esc clears the search first, then closes
      q.addEventListener('keydown', function(e){
        var n = list.querySelectorAll('.ut-row').length;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
          e.preventDefault();
          if (!n) return;
          act = act < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (act + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
          light(true);
        } else if (e.key === 'Enter'){
          var r = list.querySelectorAll('.ut-row')[act];
          if (r) run(r.dataset.key);
        } else if (e.key === 'Escape' && q.value){
          e.stopPropagation(); q.value = ''; render();
        }
      });
      list.addEventListener('mousemove', function(e){
        var r = e.target.closest('.ut-row'); if (!r) return;
        var i = Array.prototype.indexOf.call(list.querySelectorAll('.ut-row'), r);
        if (i !== act){ act = i; light(false); }
      });
      pop.addEventListener('click', function(e){
        e.stopPropagation();
        if (!e.target.closest('.ut-sort')) closeSort();
        var t;
        if (e.target.closest('.ut-clr')){ q.value = ''; render(); q.focus(); return; }
        if ((t = e.target.closest('.ut-sort'))){ openSort(t); return; }
        if (e.target.closest('[data-act="new"]')){ editWin(null); return; }
        var r = e.target.closest('.ut-row'); if (!r) return;
        var x = find(r.dataset.key);
        if ((t = e.target.closest('[data-act]'))){
          if (t.dataset.act === 'edit') editWin(x.c);
          else if (t.dataset.act === 'del') delWin(x.c);
          return;
        }
        run(r.dataset.key);
      });
      setTimeout(function(){ q.focus(); }, 0);
    }

    // ——— the windows: the group warning's (.tconf) over the System setup veil; the list stays open
    //     beneath and shows the result. While one is open no shortcut of the page reacts ———
    // onKey sees every key first; Esc closes the window unless onKey took it (preventDefault)
    function modal(html, onKey){
      var scrim = document.createElement('div');
      scrim.className = 'ut-scrim';
      scrim.innerHTML = html;
      var m = {el:scrim};
      function key(e){
        e.stopPropagation();
        onKey(e);
        if (e.key === 'Escape' && !e.defaultPrevented){ e.preventDefault(); m.close(); }
      }
      m.close = function(){
        scrim.remove(); dlg = null;
        window.removeEventListener('keydown', key, true);
        if (pop) q.focus();
      };
      scrim.addEventListener('click', function(e){ e.stopPropagation(); });
      window.addEventListener('keydown', key, true);
      document.body.appendChild(scrim);
      return (dlg = m);
    }

    // New utility / Utility parameters: ENCY's fields — name, type, path (+ browse), the exe's parameters
    function editWin(c){
      closeSort();
      var edit = !!c, d = {t:c ? c.t : '', type:c ? c.type : 'exe', path:c ? c.path : '', params:c ? c.params : ''};
      var m = modal(
        '<div class="ut-dlg" role="dialog" aria-modal="true" aria-labelledby="utDt">' +
          '<div class="ut-dh"><span class="ut-dt" id="utDt">' + (edit ? 'Utility parameters' : 'New utility') + '</span>' +
            '<span class="ut-x" data-act="x" title="Close · Esc">' + UT_SVG.x + '</span></div>' +
          '<div class="ut-form">' +
            '<label class="ut-l" for="utName">Name</label>' +
            '<div class="ut-c"><div class="ut-in" data-f="t"><input id="utName" type="text" placeholder="Example name" spellcheck="false" autocomplete="off"></div>' +
              '<div class="ut-err" data-err="t"></div></div>' +
            '<span class="ut-l">Type</span>' +
            '<div class="ut-c"><div class="ut-dd" data-act="type" tabindex="0"><span class="v"></span>' + UT_SVG.chev + '</div></div>' +
            '<label class="ut-l" for="utPath">Path</label>' +
            '<div class="ut-c"><div class="ut-path"><div class="ut-in" data-f="path"><input id="utPath" type="text" placeholder="File to run" spellcheck="false" autocomplete="off"></div>' +
              '<span class="ut-bb" data-act="browse" title="Browse…">' + UT_SVG.folder + '</span></div>' +
              '<div class="ut-err" data-err="path"></div></div>' +
            '<label class="ut-l ut-exe" for="utParams">Parameters</label>' +
            '<div class="ut-c ut-exe"><div class="ut-in ta"><textarea id="utParams" placeholder="Command-line parameters" spellcheck="false"></textarea></div></div>' +
          '</div>' +
          '<input type="file" hidden>' +
          '<div class="ut-foot"><button class="ut-btn" data-act="x">Cancel</button>' +
            '<button class="ut-btn pri" data-act="ok">' + (edit ? 'Save' : 'Add') + '</button></div>' +
        '</div>', function(e){
          // Esc closes the type list first; Enter adds (a new line in Parameters, a press on a button)
          var dd = e.target.closest && e.target.closest('.ut-dd');
          if (e.key === 'Escape' && menu){ e.preventDefault(); closeMenu(); }
          else if (dd && /^( |Enter|ArrowDown)$/.test(e.key)){ e.preventDefault(); openMenu(dd); }
          else if (e.key === 'Enter' && !/^(TEXTAREA|BUTTON)$/.test(e.target.tagName) && !e.target.closest('.ut-dd')){
            e.preventDefault(); save();
          }
        });
      var w = m.el, name = w.querySelector('#utName'), path = w.querySelector('#utPath'),
          params = w.querySelector('#utParams'), file = w.querySelector('input[type=file]'), menu = null;
      name.value = d.t; path.value = d.path; params.value = d.params;
      function setType(id){
        d.type = id;
        w.querySelector('.ut-dd .v').textContent = utType(id).t;
        w.querySelectorAll('.ut-exe').forEach(function(el){ el.hidden = id !== 'exe'; });
        file.accept = utType(id).ext.map(function(x){ return '.' + x; }).join(',');
      }
      setType(d.type);
      function err(f, text){
        w.querySelector('[data-err="' + f + '"]').textContent = text || '';
        w.querySelector('[data-f="' + f + '"]').classList.toggle('bad', !!text);
      }
      function closeMenu(){ if (menu){ menu.remove(); menu = null; w.querySelector('.ut-dd').classList.remove('open'); } }
      function openMenu(dd){
        if (menu){ closeMenu(); return; }
        menu = document.createElement('div');
        menu.className = 'hmenu ut-typemenu';
        menu.innerHTML = UT_TYPES.map(function(o){
          return '<div class="hm-opt' + (o.id === d.type ? ' cur' : '') + '" data-type="' + o.id + '">' +
            '<span class="hm-ck">' + (o.id === d.type ? '✓' : '') + '</span>' + o.t + '</div>';
        }).join('');
        menu.addEventListener('click', function(e){
          e.stopPropagation();
          var o = e.target.closest('[data-type]'); if (!o) return;
          setType(o.dataset.type); closeMenu();
          // a path of another type no longer fits
          var t = path.value.trim() && utTypeOf(path.value.trim());
          if (t && t.id !== d.type) path.value = '';
          dd.focus();
        });
        document.body.appendChild(menu);
        var r = dd.getBoundingClientRect();
        menu.style.left = r.left + 'px';
        menu.style.top = (r.bottom + 2) + 'px';
        menu.style.minWidth = r.width + 'px';
        dd.classList.add('open');
      }
      // the type follows the file's extension; the name comes from the file when it is still empty
      function fromPath(p){
        var t = utTypeOf(p);
        if (t) setType(t.id);
        if (!name.value.trim() && p){
          name.value = p.split(/[\\\/]/).pop().replace(/\.[^.]+$/, '');
          err('t');
        }
      }
      function save(){
        var t = name.value.trim(), p = path.value.trim(), ok = true;
        if (!t){ err('t', 'Utility name cannot be empty.'); ok = false; }
        if (!p){ err('path', 'Path cannot be empty.'); ok = false; }
        else if (!utTypeOf(p)){ err('path', 'Unsupported file type. Use .exe, .dll, .spr or .sx.'); ok = false; }
        if (!ok){ (t ? path : name).focus(); return; }
        var o = c || {id:'c' + Date.now()};
        o.t = t; o.type = d.type; o.path = p; o.params = d.type === 'exe' ? params.value.trim() : '';
        if (!c) UT_CUSTOM.push(o);
        utPut('ency.utilities', UT_CUSTOM);
        closeMenu(); m.close();
        if (pop){ q.value = ''; render(o.id); }
      }
      name.addEventListener('input', function(){ err('t'); });
      path.addEventListener('input', function(){ err('path'); });
      path.addEventListener('change', function(){ fromPath(path.value.trim()); });
      // the browser hands over only the file's name, not its folder
      file.addEventListener('change', function(){
        if (!file.files[0]) return;
        path.value = file.files[0].name; err('path');
        fromPath(path.value);
        file.value = '';
      });
      w.addEventListener('click', function(e){
        var t = e.target.closest('[data-act]');
        if (!t || t.dataset.act !== 'type') closeMenu();
        if (!t) return;
        if (t.dataset.act === 'x'){ m.close(); }
        else if (t.dataset.act === 'ok') save();
        else if (t.dataset.act === 'type') openMenu(t);
        else if (t.dataset.act === 'browse') file.click();
      });
      var close0 = m.close;
      m.close = function(){ closeMenu(); close0(); };
      name.focus();
    }

    // ENCY asks before it deletes ("Delete utility "%s"?"); the file itself stays where it is
    function delWin(c){
      closeSort();
      var m = modal(
        '<div class="ut-dlg sm" role="alertdialog" aria-modal="true">' +
          '<div class="ut-dt">Delete utility “' + utEsc(c.t) + '”?</div>' +
          '<div class="ut-dd2">It is removed from the list; the file stays on disk.</div>' +
          '<div class="ut-foot"><button class="ut-btn" data-act="x">Cancel</button>' +
            '<button class="ut-btn danger" data-act="ok">Delete</button></div>' +
        '</div>', function(e){
          if (e.key === 'Tab'){ e.preventDefault(); (document.activeElement === ok ? no : ok).focus(); }
          else if (e.key === 'Enter' && document.activeElement === ok){ e.preventDefault(); yes(); }
        });
      var ok = m.el.querySelector('[data-act="ok"]'), no = m.el.querySelector('[data-act="x"]');
      function yes(){
        UT_CUSTOM = UT_CUSTOM.filter(function(o){ return o !== c; });
        delete UT_USAGE[c.id];
        utPut('ency.utilities', UT_CUSTOM); utPut('ency.utilities.usage', UT_USAGE);
        m.close(); render();
      }
      ok.addEventListener('click', yes);
      no.addEventListener('click', m.close);
      // the veil cancels, as in the group warning
      m.el.addEventListener('click', function(e){ if (e.target === m.el) m.close(); });
      ok.focus();
    }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (pop) closePop(); else openPop();
    });
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePop(); });
  })();

  // ——— Notifications (the bell left of More): one inbox for the whole application ———
  // Projects (errors a calculation found), Clouds (invites to collaborate, chat messages) and
  // License manager (maintenance running out, a new license to activate) push here through
  // window.ENCY_NOTIFY.push(n). The list lives in localStorage['ency.notify'], so it follows the user
  // from section to section and between browser tabs; ?notify=reset brings the sample set back.
  // n: {src:'project'|'clouds'|'license', kind:'error'|'warn'|'invite'|'chat'|'license',
  //     t: title, d: text, where: the project / collection it is about, who: the person (invite, chat),
  //     href: where it leads, go: what an open project does with it in place ({proj, op}),
  //     act / act2: its buttons, key: a repeat of the same thing replaces the earlier one}
  // A click opens what it is about and marks it read; ✕ removes it. A new one arriving while the list
  // is closed shows for 6 s as a card under the bell.
  var NT_KEY = 'ency.notify';
  var NT_SRC = {project:'Project', clouds:'Clouds', license:'License manager'};
  var NT_TABS = [{id:'', t:'All'}, {id:'project', t:'Projects'}, {id:'clouds', t:'Clouds'}, {id:'license', t:'License'}];
  var NT_SVG = {
    x:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
    read:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8.5l3 3 6.5-7M7.5 11.5l6.5-7"/></svg>',
    lic:   SECTIONS.filter(function(s){ return s.id === 'license-manager'; })[0].svg
  };
  // the sample set: one of each source, consistent with the sections' own data
  // (ENCY393's errors, the Clouds invite "From Drawing", License manager's #421520 and #462785)
  function ntSeed(){
    var now = Date.now(), m = 60e3, h = 60 * m, d = 24 * h;
    return [
      {id:'n1', key:'calc:ency393', src:'project', kind:'error', at:now - 12 * m, where:'ENCY393',
       t:'Calculation found errors',
       d:'4 operations: Gouge of the part (2), Tool holder collision (2), Machine collision (1)',
       href:'../project/?project=ency393&status=machine', go:{proj:'ency393'}, act:'Show'},
      {id:'n2', key:'invite:from-drawing', src:'clouds', kind:'invite', at:now - 47 * m, who:'Andrew Smith', where:'From Drawing',
       t:'Andrew Smith added you to “From Drawing”', d:'Collaboration project · you can view and edit it',
       href:'../clouds/#sect-invites', act:'Accept', act2:'Decline'},
      {id:'n3', src:'clouds', kind:'chat', at:now - 2 * h, who:'Andrew Smith', where:'From Drawing',
       t:'Andrew Smith in “From Drawing”', d:'Updated the fixture — please check the clearance on Setup 2 before you post.',
       href:'../clouds/#sect-invites'},
      {id:'n4', key:'maint:#421520', src:'license', kind:'warn', at:now - 5 * h,
       t:'Maintenance ends in 7 days', d:'#421520 ENCY 5x Mill Advanced · renew it to keep getting updates',
       href:'../license-manager/#lic-421520', act:'Renew'},
      {id:'n5', key:'lic:#462785', src:'license', kind:'license', at:now - 26 * h, read:true,
       t:'New license available', d:'#462785 ENCY 5x Mill Advanced from ENCY Software Ltd is ready to activate',
       href:'../license-manager/#lic-462785', act:'Activate'},
      {id:'n6', src:'clouds', kind:'chat', at:now - 3 * d, read:true, who:'Andrew Smith', where:'Milling boats',
       t:'Andrew Smith in “Milling boats”', d:'Added two hull projects to the collection.',
       href:'../clouds/#sect-coll'}
    ];
  }
  var NT = null;
  function ntLoad(){
    try {
      if (new URLSearchParams(location.search).get('notify') === 'reset') localStorage.removeItem(NT_KEY);
      NT = JSON.parse(localStorage.getItem(NT_KEY));
    } catch(e){ NT = null; }
    if (!Array.isArray(NT)){ NT = ntSeed(); ntSave(); }
  }
  function ntSave(){ try { localStorage.setItem(NT_KEY, JSON.stringify(NT)); } catch(e){} }
  function ntAgo(at){
    var s = (Date.now() - at) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 172800) return 'Yesterday';
    return Math.floor(s / 86400) + ' days ago';
  }
  function ntLead(n){
    if (n.who) return '<span class="nt-av">' + n.who.split(/\s+/).map(function(w){ return w[0]; }).join('').slice(0, 2) + '</span>';
    if (n.kind === 'error') return '<img class="nt-ic" src="' + BASE + 'nt-error.svg" alt="">';
    if (n.kind === 'warn') return '<img class="nt-ic" src="' + BASE + 'nt-warn.svg" alt="">';
    return '<span class="nt-ic nt-glyph">' + NT_SVG.lic + '</span>';
  }
  function ntItem(n){
    var where = n.src === 'project' ? n.where : NT_SRC[n.src];
    return '<div class="nt-item' + (n.read ? '' : ' unread') + '" data-id="' + n.id + '">' +
      ntLead(n) +
      '<div class="nt-body">' +
        '<div class="nt-t">' + utEsc(n.t) + '</div>' +
        (n.d ? '<div class="nt-d">' + utEsc(n.d) + '</div>' : '') +
        '<div class="nt-meta">' + utEsc(where) + ' · ' + ntAgo(n.at) + '</div>' +
        (n.act ? '<div class="nt-acts"><button class="nt-btn pri" data-nt="act">' + n.act + '</button>' +
          (n.act2 ? '<button class="nt-btn" data-nt="act2">' + n.act2 + '</button>' : '') + '</div>' : '') +
      '</div>' +
      '<span class="nt-side"><i class="nt-dot"></i><span class="nt-x" data-nt="x" title="Remove">' + NT_SVG.x + '</span></span>' +
    '</div>';
  }

  (function(){
    var btn = document.getElementById('hdrNotify');
    if (!btn) return;
    ntLoad();
    var badgeEl = btn.querySelector('.nt-badge'), pop = null, tab = '', toast = null, toastT = 0;
    // the dot of the bell: green while something is unread, red when an unread one is an error
    function badge(){
      var un = NT.filter(function(n){ return !n.read; });
      badgeEl.hidden = !un.length;
      badgeEl.classList.toggle('err', un.some(function(n){ return n.kind === 'error'; }));
      btn.title = un.length ? 'Notifications · ' + un.length + ' unread' : 'Notifications';
    }
    function byId(id){ return NT.filter(function(n){ return n.id === id; })[0]; }
    function render(){
      if (!pop) return;
      var list = NT.filter(function(n){ return !tab || n.src === tab; });
      pop.querySelector('.nt-tabs').innerHTML = NT_TABS.map(function(o){
        var c = NT.filter(function(n){ return !n.read && (!o.id || n.src === o.id); }).length;
        return '<span class="nt-tab' + (o.id === tab ? ' on' : '') + '" data-tab="' + o.id + '">' + o.t +
          (c ? '<b>' + c + '</b>' : '') + '</span>';
      }).join('');
      pop.querySelector('.nt-all').classList.toggle('dis', !NT.some(function(n){ return !n.read; }));
      // without internet only the projects keep reporting; the rest waits for the connection
      pop.querySelector('.nt-off').hidden = !app.classList.contains('offline');
      pop.querySelector('.nt-list').innerHTML = list.length ? list.map(ntItem).join('')
        : '<div class="nt-empty">' + (tab ? 'No notifications from ' + NT_SRC[tab] : 'No notifications') + '</div>';
    }
    function changed(){ ntSave(); badge(); render(); }
    function closePop(){ if (pop){ pop.remove(); pop = null; btn.classList.remove('open'); } }
    function openPop(){
      closeToast();
      pop = document.createElement('div');
      pop.className = 'nt-pop';
      pop.innerHTML =
        '<div class="nt-bar"><div class="nt-tabs"></div>' +
          '<span class="nt-all" data-nt="all" title="Mark all as read">' + NT_SVG.read + '</span></div>' +
        '<div class="nt-sep"></div>' +
        '<div class="nt-off" hidden><i></i>Offline · Clouds and License manager notifications arrive when you are back online</div>' +
        '<div class="nt-list"></div>';
      document.body.appendChild(pop);
      render();
      // right edges aligned with the bell, 4px under the bar like the other title-bar lists
      var r = btn.getBoundingClientRect();
      pop.style.left = Math.max(8, r.right - pop.offsetWidth) + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      btn.classList.add('open');
      pop.addEventListener('click', function(e){
        e.stopPropagation();
        var t = e.target.closest('[data-tab]');
        if (t){ tab = t.dataset.tab; render(); return; }
        if (e.target.closest('[data-nt="all"]')){ NT.forEach(function(n){ n.read = true; }); changed(); return; }
        click(e, e.target.closest('.nt-item'));
      });
    }
    // what a notification leads to: an open project shows it in place, the rest navigate
    function go(n){
      var proj = window.ENCY_PROJECT;
      if (n.go && AREA === 'project' && proj && proj.show){ proj.show(n.go); return; }
      var here = n.href && n.href.split('#')[0].split('?')[0].replace(/\/$/, '').split('/').pop() === APP.id;
      var hash = n.href && n.href.split('#')[1];
      if (here && hash){ ntReveal(hash); return; }
      if (n.href) location.href = n.href;
    }
    // a click on a card: its buttons, ✕, or the card itself (opens it)
    function click(e, it){
      if (!it) return;
      var n = byId(it.dataset.id); if (!n) return;
      var b = e.target.closest('[data-nt]'), a = b && b.dataset.nt;
      if (a === 'x'){ NT = NT.filter(function(x){ return x !== n; }); changed(); closeToast(); return; }
      n.read = true;
      // an invite is answered right here
      if (n.kind === 'invite' && (a === 'act' || a === 'act2')){
        var yes = a === 'act';
        n.t = yes ? 'You joined “' + n.where + '”' : 'Invite to “' + n.where + '” declined';
        n.d = yes ? 'Collaboration project by ' + n.who : n.who + ' can invite you again';
        delete n.act; delete n.act2;
        changed(); closeToast();
        return;
      }
      changed();
      closePop(); closeToast();
      go(n);
    }

    // ——— the card under the bell for a new one ———
    function closeToast(){ if (toast){ toast.remove(); toast = null; clearTimeout(toastT); } }
    function showToast(n){
      closeToast();
      toast = document.createElement('div');
      toast.className = 'nt-toast';
      toast.innerHTML = ntItem(n);
      document.body.appendChild(toast);
      var r = btn.getBoundingClientRect();
      toast.style.left = Math.max(8, r.right - toast.offsetWidth) + 'px';
      toast.style.top = (r.bottom + 4) + 'px';
      var hold = function(){ clearTimeout(toastT); toastT = setTimeout(closeToast, 6000); };
      toast.addEventListener('mouseenter', function(){ clearTimeout(toastT); });
      toast.addEventListener('mouseleave', hold);
      toast.addEventListener('click', function(e){ e.stopPropagation(); click(e, e.target.closest('.nt-item')); });
      hold();
    }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (pop) closePop(); else openPop();
    });
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closePop(); closeToast(); } });
    // another browser tab changed the list
    window.addEventListener('storage', function(e){ if (e.key === NT_KEY){ ntLoad(); badge(); render(); } });
    badge();

    window.ENCY_NOTIFY = {
      push:function(n){
        var o = {}; for (var k in n) o[k] = n[k];
        o.at = Date.now(); o.read = false;
        o.id = 'n' + o.at.toString(36) + Math.random().toString(36).slice(2, 5);
        if (o.key) NT = NT.filter(function(x){ return x.key !== o.key; });
        NT.unshift(o);
        if (NT.length > 50) NT.length = 50;
        changed();
        if (!pop) showToast(o);
        return o.id;
      },
      // once per key: a state the section finds on every visit (maintenance running out) comes once
      pushOnce:function(n){
        if (n.key && NT.some(function(x){ return x.key === n.key; })) return null;
        return this.push(n);
      },
      list:function(){ return NT.slice(); }
    };
  })();

  // a link with #id (a notification's, or any) lands on its element and flashes it once
  function ntReveal(id){
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({block:'center', behavior:'smooth'});
    el.classList.remove('nt-flash'); void el.offsetWidth; el.classList.add('nt-flash');
    setTimeout(function(){ el.classList.remove('nt-flash'); }, 1800);
  }
  if (location.hash) setTimeout(function(){ ntReveal(location.hash.slice(1)); }, 300);

  // ——— Project window and the tab's health (CAM-882): ENCY's TPrjOptionsForm (Bin64/ency_prime.exe) + the cam-app states ———
  // The window opens from a tab's location icon (the computer = a local project), for that tab, without switching to it,
  // in the frame of the project's floating windows (Approach: 300px, padding 8, radius 10). Top to bottom: the head —
  // the project's name and Share; the tab's trouble or its process; Location — the project file, Explore; Snapshots —
  // the project's saved states, newest first (the user's own ones and ENCY's autosaves before / after running, before
  // deleting, before updating the machine), the current one green, a click selects another as current, the pin makes
  // one persistent; Snapshot manager opens the full list.
  // Each tab hosts a cam-app, a process of its own (CAM-882, Nikolai Zelensky's draft): it is
  //   run      — running, or busy while a process reports progress (Calculate, the simulation): a line along the tab's
  //              bottom and the process section in the window; no progress for a while (it may answer and still be
  //              stuck — "responding does not mean working") turns the line amber and the section offers the way out;
  //   hung     — not responding: an amber dot on the tab's icon; the tab's area freezes under a warning card like
  //              Chrome's "page unresponsive" — Not responding for how long, what it was doing, the latest snapshot —
  //              with Wait (the warning comes back later), Restart and Terminate; the window shows the same card;
  //   dead     — terminated by the user or crashed: a red dot; the tab keeps its place and title, its area is a
  //              placeholder with Restart (the sad-tab pattern); closing it is the tab's ✕;
  //   restart  — restarting from the latest snapshot: a spinner in the icon's place.
  // Restart and Terminate are always in the tab's context menu (right-click the tab), whatever its state — a stuck tab
  // may still answer; Details opens the window. Both ask first and say what is lost: the changes after the latest
  // snapshot (none → the saved file; a new project → an empty one). Restart = ENCY's "Force close and restart from
  // latest snapshot", Terminate = its "Force close tab", now keeping the tab. The menu's Prototype group simulates the
  // states: Not responding, Stuck progress (only while busy), Crash.
  // Strings: cam_prime_Eng.lng (TPrjOptionsForm_*, prj_opts_form_*, STDirBasedProject_rs*, PrimeMainForm_rs*); "Not
  // responding" is Windows' word, ENCY has none. Icons: ENCY's menu sprite (Dark_Menu.svg: Share 4·4, SnapPin 5·5 /
  // SnapPin2 5·6, Explorer 5·7, SnapShot 5·8) at 20 in the 24px buttons, 16 in Share. The process comes from the section
  // (window.ENCY_PROJECT.process() / stop() / stall()). Share, Explore and Snapshot manager are not built.
  var PJ_SVG = {
    restart: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 8.6A4.6 4.6 0 1 1 11.2 4.6"/><path d="M12.4 2.4v2.8H9.6"/></svg>',
    x:       '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    info:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 7.3v3.4"/><path d="M8 5.2v.1"/></svg>'
  };
  var PJ_STUCK = 8000;    // "no progress" after 8 s in the prototype (the product would wait minutes)
  var PJ_WAIT = 30000;    // Wait hides the warning for 30 s
  // sample snapshots relative to now: minutes ago, or [days ago, h, m]
  function pjAt(a){
    if (typeof a === 'number') return Date.now() - a * 60000;
    var d = new Date(); d.setDate(d.getDate() - a[0]); d.setHours(a[1], a[2], 0, 0); return d.getTime();
  }
  function pjSnaps(list){
    return list.map(function(s, i){ return {id:'s' + i, c:s[0], at:pjAt(s[1]), by:s[2] || USER.mail, cur:!!s[3], pin:!!s[4]}; });
  }
  // per tab, in the header's order; a new project has no file and no snapshots yet
  var PJ = [
    {path:'D:\\ENCY\\Projects\\Turning\\Turn part probing 2.stcp', snaps:pjSnaps([
      ['Snapshot', 14, 0, true],
      ['After running', 38],
      ['Before running', 41],
      ['Before deleting', 95],
      ['Snapshot', [1, 17, 42], 0, false, true],
      ['Before update machine', [1, 16, 5]],
      ['Snapshot', [11, 8, 38], 'marat_u@headquarters.team']
    ])},
    {path:'D:\\ENCY\\Projects\\CAM-724\\ENCY393.stcp', snaps:pjSnaps([
      ['Snapshot', [1, 11, 20], 0, true],
      ['Before running', [1, 11, 2]],
      ['Snapshot', [6, 9, 15], 'marat_u@headquarters.team', false, true]
    ])},
    {path:null, snaps:[]},
    {path:null, snaps:[]}
  ];
  // ENCY's own wording: "Today at 8:38", "Yesterday at 17:42", "12 seconds ago", else 29.10.2026 8:38
  function pjWhen(at){
    var d = new Date(at), now = new Date(), s = Math.round((now - d) / 1000);
    var hm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
    if (s < 60) return s + (s === 1 ? ' second ago' : ' seconds ago');
    var day = function(x){ return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var dd = Math.round((day(now) - day(d)) / 86400000);
    if (dd === 0) return 'Today at ' + hm;
    if (dd === 1) return 'Yesterday at ' + hm;
    return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() + ' ' + hm;
  }
  function pjSince(ms){ var t = Math.max(0, Math.floor(ms / 1000)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }

  (function(){
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.htabs .htab'));
    if (!tabs.length) return;
    var pop = null, at = -1;   // the open window and its tab
    var menu = null;           // the tab's context menu
    var veil = null, veilKey = '';   // the card over the active tab's area
    var ts = {};               // tab index → {s:'hung'|'dead'|'restart', at, p (the process it was in), why, wait}
    var track = null;          // the active process's progress: {i, t, p, since} — for "no progress"
    tabs.forEach(function(t){ var n = t.querySelector('.htab-t'); t.dataset.name = n ? n.textContent : 'Project'; });
    function S(i){ return ts[i] ? ts[i].s : 'run'; }
    function api(){ return window.ENCY_PROJECT || null; }
    function active(i){ return tabs[i] && tabs[i].classList.contains('active'); }
    function proc(i){
      var p = api();
      // the section runs one project: the process is the active tab's, while it runs normally
      return active(i) && S(i) === 'run' && p && p.process ? p.process() : null;
    }
    function stuck(i){ return !!(track && track.i === i && proc(i) && Date.now() - track.since >= PJ_STUCK); }
    function latest(i){ return PJ[i] && PJ[i].snaps[0] || null; }
    // what a restart brings back: the newest snapshot, else the saved file, else an empty project (ENCY's order)
    function restoreText(i){
      var sn = latest(i);
      return sn ? 'From ' + sn.c.toLowerCase() + ' - ' + pjWhen(sn.at) : PJ[i] && PJ[i].path ? 'From the saved file' : 'Empty project';
    }
    // a cell of the sprite by column / row (0-based); CSS sets the size (16 in Share, 20 in the 24px buttons)
    function spr(c, r){ return '<span class="pj-ic" style="--c:' + c + ';--r:' + r + '"></span>'; }
    function snapRow(s){
      return '<div class="pj-snap' + (s.cur ? ' cur' : '') + (s.pin ? ' pin' : '') + '" data-id="' + s.id + '"' +
        (s.cur ? '' : ' title="Select snapshot as current"') + '>' +
        '<span class="pj-sb"><span class="pj-st">' + utEsc(s.c + ' - ' + pjWhen(s.at)) + '</span>' +
          '<span class="pj-sd">Project saved by ' + utEsc(s.by) + '</span></span>' +
        '<span class="pj-ib pj-pin" data-pj="pin" title="Make snapshot persistent — Use pin to preserve a snapshot. Pinned snapshots are never deleted.">' +
          '<span class="pj-ic"></span></span>' +
      '</div>';
    }
    function crow(name, right, cls){
      return '<div class="pj-crow' + (cls ? ' ' + cls : '') + '"><span class="pj-cname">' + utEsc(name) + '</span>' +
        '<span class="pj-cwhere">' + right + '</span></div>';
    }
    // the card of a tab in trouble — amber while it does not respond, red once its process is gone: the state and
    // since when, what it was doing (the process and how far, or ENCY's "Idle"), the operation and where, and the
    // latest snapshot (what a restart brings back)
    function cardHTML(i){
      var x = ts[i], p = x.p, dead = x.s === 'dead', sn = latest(i);
      return '<div class="pj-card' + (dead ? ' err' : '') + '">' +
        '<div class="pj-crow pj-chead"><span class="pj-cic"></span><b>' +
          (dead ? (x.why === 'crashed' ? 'Crashed' : 'Terminated') : 'Not responding') + '</b>' +
          '<span class="pj-cn" data-' + (dead ? 'ago' : 'since') + '="' + x.at + '"></span></div>' +
        crow(p ? p.t : 'Idle', p ? Math.floor(p.p * 100) + '%' : '') +
        (p && p.op ? crow(p.op, utEsc(p.where || '')) : '') +
        crow('Latest snapshot', sn ? utEsc(pjWhen(sn.at)) : (PJ[i] && PJ[i].path ? 'None · the saved file' : 'None'), 'pj-cq') +
      '</div>';
    }
    // the ways out, sized to their labels: Wait only over the frozen tab, Terminate while the process is alive
    function actsHTML(i, wait){
      var dead = S(i) === 'dead';
      return '<div class="pj-acts">' +
        (wait ? '<span class="pj-fb" data-pj="wait" title="Keep waiting — the warning comes back if the tab still does not respond">Wait</span>' : '') +
        '<span class="pj-fb" data-pj="restart" title="Force close and restart from latest snapshot">' + PJ_SVG.restart + 'Restart</span>' +
        (dead ? '' : '<span class="pj-fb danger" data-pj="kill" title="Force close tab — the tab stays and can be restarted">' + PJ_SVG.x + 'Terminate</span>') +
      '</div>';
    }
    function restartHTML(i){
      return '<div class="pj-sec"><span class="pj-sec-t">Restarting</span></div>' +
        '<div class="pj-track ind"><i></i></div>' +
        '<div class="pj-rd">' + utEsc(restoreText(i)) + '</div>';
    }
    function render(){
      var d = PJ[at] || PJ[0], s = S(at);
      pop.innerHTML =
        '<div class="pj-head">' +
          '<span class="pj-title">' + utEsc(tabs[at].dataset.name) + '</span>' +
          '<span class="pj-share" data-pj="share" title="Share — Share options">' + spr(3, 3) + 'Share</span>' +
        '</div>' +
        // the tab in trouble: its card and the ways out
        (s === 'hung' || s === 'dead' ? '<div class="pj-div"></div>' + cardHTML(at) + actsHTML(at, false) : '') +
        (s === 'restart' ? '<div class="pj-div"></div>' + restartHTML(at) : '') +
        // the busy project's own section, there only while something runs (tick fills it); stuck → the ways out
        '<div class="pj-run" hidden><div class="pj-div"></div>' +
          '<div class="pj-sec"><span class="pj-sec-t pj-rt"></span><span class="pj-pct"></span></div>' +
          '<div class="pj-track"><i></i></div>' +
          '<div class="pj-rd"></div>' +
          '<div class="pj-stuck" hidden><div class="pj-note"><span class="pj-cic"></span>No progress for <span class="pj-sv"></span></div>' +
            actsHTML(at, false) + '</div>' +
        '</div>' +
        '<div class="pj-div"></div>' +
        '<div class="pj-sec"><span class="pj-sec-t">Location</span>' +
          '<span class="pj-ib' + (d.path ? '' : ' dis') + '" data-pj="explore" title="Explore — Show project file in explorer window">' + spr(6, 4) + '</span></div>' +
        '<div class="pj-path' + (d.path ? '' : ' none') + '"' + (d.path ? ' title="' + utEsc(d.path) + '"' : '') + '>' +
          (d.path ? utEsc(d.path) : 'Not saved yet') + '</div>' +
        '<div class="pj-div"></div>' +
        '<div class="pj-sec"><span class="pj-sec-t">Snapshots' +
            (d.snaps.length ? '<span class="pj-cnt">' + d.snaps.length + '</span>' : '') + '</span>' +
          '<span class="pj-ib' + (d.snaps.length ? '' : ' dis') + '" data-pj="manager" title="Snapshot manager — Open snapshot manager">' + spr(7, 4) + '</span></div>' +
        (d.snaps.length
          ? '<div class="pj-list">' + d.snaps.map(snapRow).join('') + '</div>'
          : '<div class="pj-path none">No snapshots yet</div>');
      tick();
    }
    // the card over the active tab's area: frozen (Not responding, until Wait), gone (Terminated / Crashed), restarting
    function veilHTML(i){
      var s = S(i);
      return '<div class="pj-pop pj-ov" data-tab="' + i + '">' +
        '<div class="pj-head"><span class="pj-title">' + utEsc(tabs[i].dataset.name) + '</span></div>' +
        '<div class="pj-div"></div>' +
        (s === 'restart' ? restartHTML(i) : cardHTML(i) + actsHTML(i, s === 'hung')) +
      '</div>';
    }
    // the timers: since when it hangs, how long ago it died
    function times(root){
      root.querySelectorAll('[data-since]').forEach(function(e){ e.textContent = pjSince(Date.now() - +e.dataset.since); });
      // when it went: the clock time ("0 seconds ago" reads badly), the day too if not today
      root.querySelectorAll('[data-ago]').forEach(function(e){
        var t = +e.dataset.ago, w = pjWhen(t), d = new Date(t);
        e.textContent = /ago$/.test(w) ? d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) : w.replace(/^Today at /, '');
      });
    }
    function tick(){
      // the active process's progress: a change resets "no progress"
      var ai = tabs.findIndex(function(t){ return t.classList.contains('active'); });
      var ap = ai >= 0 ? proc(ai) : null;
      if (!ap) track = null;
      else if (!track || track.i !== ai || track.t !== ap.t || Math.abs(track.p - ap.p) > 1e-6)
        track = {i:ai, t:ap.t, p:ap.p, since:Date.now()};
      tabs.forEach(function(t, i){
        var p = proc(i), line = t.querySelector('.htab-prog'), s = S(i);
        t.classList.toggle('busy', !!p);
        t.classList.toggle('stuck', stuck(i));
        t.classList.toggle('hung', s === 'hung');
        t.classList.toggle('dead', s === 'dead');
        t.classList.toggle('restarting', s === 'restart');
        if (p){
          if (!line){ line = document.createElement('i'); line.className = 'htab-prog'; t.appendChild(line); }
          line.style.setProperty('--p', (p.p * 100).toFixed(1));
        }
      });
      // the active tab's area: frozen while it hangs, a placeholder once its process is gone or restarting
      var as = ai >= 0 ? S(ai) : 'run';
      app.classList.toggle('tab-hung', as === 'hung');
      app.classList.toggle('tab-down', as === 'dead' || as === 'restart');
      var show = as === 'dead' || as === 'restart' || (as === 'hung' && !(ts[ai].wait > Date.now()));
      var key = show ? ai + ':' + as : '';
      if (key !== veilKey){
        veilKey = key;
        if (veil){ veil.remove(); veil = null; }
        if (show){
          veil = document.createElement('div');
          veil.className = 'pj-veil';
          veil.innerHTML = veilHTML(ai);
          veil.addEventListener('click', function(e){
            e.stopPropagation();
            var b = e.target.closest('[data-pj]');
            if (b) act(ai, b.dataset.pj);
          });
          document.body.appendChild(veil);
        }
      }
      if (veil){
        var ws = app.querySelector('.workspace'), r = ws ? ws.getBoundingClientRect() : null;
        if (r){ veil.style.left = r.left + 'px'; veil.style.top = r.top + 'px'; veil.style.width = r.width + 'px'; veil.style.height = r.height + 'px'; }
        times(veil);
      }
      if (!pop) return;
      times(pop);
      var p = proc(at), run = pop.querySelector('.pj-run');
      run.hidden = !p;
      if (!p) return;
      run.querySelector('.pj-rt').textContent = p.t;
      run.querySelector('.pj-pct').textContent = Math.floor(p.p * 100) + '%';
      run.querySelector('.pj-track i').style.width = (p.p * 100).toFixed(1) + '%';
      run.querySelector('.pj-rd').textContent = p.d || '';
      var sk = stuck(at), box = pop.querySelector('.pj-stuck');
      run.classList.toggle('stuck', sk);
      box.hidden = !sk;
      if (sk) box.querySelector('.pj-sv').textContent = pjSince(Date.now() - track.since);
    }

    // ——— the actions ———
    function doRestart(i){
      var a = api();
      if (a && a.stop && active(i)) a.stop();
      ts[i] = {s:'restart', at:Date.now()};
      setTimeout(function(){
        if (S(i) !== 'restart') return;
        delete ts[i];
        // the tab is back at the newest snapshot
        PJ[i].snaps.forEach(function(x, k){ x.cur = k === 0; });
        if (pop && at === i) render(); else tick();
      }, 1500);
      if (pop && at === i) render(); else tick();
    }
    function doKill(i, why){
      var a = api(), x = ts[i];
      // what it was doing when it went: the frozen process of a hung tab, else the running one
      var p = x && x.s === 'hung' ? x.p : proc(i);
      if (a && a.stop && active(i)) a.stop();
      ts[i] = {s:'dead', why:why, at:Date.now(), p:p};
      if (pop && at === i) render(); else tick();
    }
    function doHang(i){
      var a = api(), p = proc(i);
      ts[i] = {s:'hung', at:Date.now(), p:p};
      // a hung process does not move: it freezes where it is
      if (p && a && a.stop) a.stop();
      if (pop && at === i) render(); else tick();
    }
    function recover(i){ delete ts[i]; if (pop && at === i) render(); else tick(); }
    // ask first, saying what is lost (CAM-882): the changes after the latest snapshot
    function confirmWin(i, kind){
      var name = tabs[i].dataset.name, sn = latest(i), kill = kind === 'kill';
      var lost = sn ? 'Changes made after the latest snapshot (' + pjWhen(sn.at) + ') will be lost.'
        : PJ[i].path ? 'Changes made after the project was last saved will be lost.'
        : 'The project has never been saved: all its work will be lost.';
      var body = kill ? 'The tab’s process stops at once. ' + lost + ' The tab stays, so it can be restarted.'
        : 'The tab’s process stops and the project opens again ' +
          (sn ? 'from the latest snapshot.' : PJ[i].path ? 'from the saved file.' : 'empty.') + ' ' + lost;
      var scrim = document.createElement('div');
      scrim.className = 'ut-scrim';
      scrim.innerHTML =
        '<div class="ut-dlg sm" role="alertdialog" aria-modal="true">' +
          '<div class="ut-dt">' + (kill ? 'Terminate' : 'Restart') + ' “' + utEsc(name) + '”?</div>' +
          '<div class="ut-dd2">' + utEsc(body) + '</div>' +
          '<div class="ut-foot"><button class="ut-btn" data-act="x">Cancel</button>' +
            '<button class="ut-btn ' + (kill ? 'danger' : 'pri') + '" data-act="ok">' + (kill ? 'Terminate' : 'Restart') + '</button></div>' +
        '</div>';
      var ok = scrim.querySelector('[data-act="ok"]'), no = scrim.querySelector('[data-act="x"]');
      function close(){ scrim.remove(); window.removeEventListener('keydown', key, true); }
      function yes(){ close(); if (kill) doKill(i, 'terminated'); else doRestart(i); }
      function key(e){
        e.stopPropagation();
        if (e.key === 'Escape'){ e.preventDefault(); close(); }
        else if (e.key === 'Tab'){ e.preventDefault(); (document.activeElement === ok ? no : ok).focus(); }
        else if (e.key === 'Enter' && document.activeElement === ok){ e.preventDefault(); yes(); }
      }
      ok.addEventListener('click', yes);
      no.addEventListener('click', close);
      // the veil cancels, as in the group warning
      scrim.addEventListener('click', function(e){ e.stopPropagation(); if (e.target === scrim) close(); });
      window.addEventListener('keydown', key, true);
      document.body.appendChild(scrim);
      ok.focus();
    }
    function act(i, a){
      if (a === 'wait'){ if (ts[i]) ts[i].wait = Date.now() + PJ_WAIT; tick(); return; }
      if (a === 'restart'){ if (S(i) === 'dead') doRestart(i); else confirmWin(i, 'restart'); return; }
      if (a === 'kill'){ confirmWin(i, 'kill'); return; }
      if (a === 'details'){ openPop(i); return; }
      // prototype switches
      if (a === 'p-hang'){ if (S(i) === 'hung') recover(i); else doHang(i); return; }
      if (a === 'p-stall'){ var p = api(); if (p && p.stall) p.stall(!p.stalled()); tick(); return; }
      if (a === 'p-crash'){ doKill(i, 'crashed'); return; }
    }

    // ——— the window ———
    function closePop(){
      if (!pop) return;
      pop.remove(); pop = null;
      if (tabs[at]) tabs[at].querySelector('.htab-loc').classList.remove('open');
      at = -1;
    }
    function openPop(i){
      closePop(); closeMenu();
      at = i;
      pop = document.createElement('div');
      pop.className = 'pj-pop';
      document.body.appendChild(pop);
      render();
      // under the tab, left edges aligned, 4px under it like the other title-bar lists
      var r = tabs[i].getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      tabs[i].querySelector('.htab-loc').classList.add('open');
      pop.addEventListener('click', function(e){
        e.stopPropagation();
        var b = e.target.closest('[data-pj]'), a = b && b.dataset.pj;
        if (a === 'restart' || a === 'kill'){ act(at, a); return; }
        var d = PJ[at], row = e.target.closest('.pj-snap'), s = row && d.snaps.filter(function(x){ return x.id === row.dataset.id; })[0];
        if (!s) return;
        if (a === 'pin') s.pin = !s.pin;
        else if (!s.cur){ d.snaps.forEach(function(x){ x.cur = x === s; }); }
        else return;
        var sc = pop.querySelector('.pj-list').scrollTop;
        render();
        pop.querySelector('.pj-list').scrollTop = sc;
      });
    }

    // ——— the tab's context menu: the ways out always at hand, Details, and the prototype's switches ———
    function closeMenu(){ if (menu){ menu.remove(); menu = null; } }
    function openMenu(i, x, y){
      closeMenu();
      var s = S(i), a = api(), busy = !!proc(i);
      var opt = function(id, t, ic, cls, ck){
        return '<div class="hm-opt' + (cls ? ' ' + cls : '') + '" data-pj="' + id + '">' +
          (ic != null ? '<span class="hm-ic">' + ic + '</span>' : '<span class="hm-ck">' + (ck ? '✓' : '') + '</span>') +
          '<span class="hm-t">' + t + '</span></div>';
      };
      menu = document.createElement('div');
      menu.className = 'hmenu pj-menu';
      menu.innerHTML =
        (s === 'restart' ? '' : opt('restart', 'Restart from latest snapshot', PJ_SVG.restart)) +
        (s === 'run' || s === 'hung' ? opt('kill', 'Terminate', PJ_SVG.x, 'danger') : '') +
        opt('details', 'Details', PJ_SVG.info) +
        '<div class="pj-msep"></div><div class="hm-head">Prototype</div>' +
        (s === 'run' || s === 'hung' ? opt('p-hang', 'Not responding', null, '', s === 'hung') : '') +
        (busy ? opt('p-stall', 'Stuck progress', null, '', a && a.stalled && a.stalled()) : '') +
        (s === 'run' || s === 'hung' ? opt('p-crash', 'Crash', null, '') : '');
      document.body.appendChild(menu);
      menu.style.left = Math.max(4, Math.min(x, innerWidth - menu.offsetWidth - 4)) + 'px';
      menu.style.top = Math.max(4, Math.min(y, innerHeight - menu.offsetHeight - 4)) + 'px';
      menu.addEventListener('click', function(e){
        e.stopPropagation();
        var o = e.target.closest('[data-pj]'); if (!o) return;
        closeMenu();
        act(i, o.dataset.pj);
      });
    }

    tabs.forEach(function(t, i){
      var ic = t.querySelector('.htab-loc');
      // the icon is the window's, not the tab's: no switch, no navigation
      if (ic) ic.addEventListener('click', function(e){
        e.stopPropagation(); closeMenu();
        if (at === i) closePop(); else openPop(i);
      });
      t.addEventListener('contextmenu', function(e){
        e.preventDefault(); e.stopPropagation();
        closePop();
        openMenu(i, e.clientX, e.clientY);
      });
    });
    document.addEventListener('click', function(){ closePop(); closeMenu(); });
    document.addEventListener('contextmenu', closeMenu);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closePop(); closeMenu(); } });
    // the processes, the timers and the tab states
    setInterval(tick, 200);
  })();

  // license state, switchable at runtime (License manager activates an expired license)
  function setLicense(state){
    var bad = state === 'expired';
    app.classList.toggle('lic-expired', bad);
    var v = document.getElementById('sbLic');
    if (v){ v.textContent = bad ? '#421481 · Expired' : '#421480'; v.classList.toggle('bad', bad); }
  }
  setLicense(LIC);

  // sections sometimes need the registry — e.g. to build their own list of links
  window.ENCY_CHROME = {sections: SECTIONS.slice(), setLicense: setLicense, setNet: setNet};
})();
