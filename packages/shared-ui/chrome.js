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

  // ——— window title bar ———
  function topbar(){
    return '' +
    '<header class="topbar">' +
      '<div class="hbtn" title="Menu"><img class="hicn-act hicn-logo" src="' + BASE + 'hdr-logo.svg" alt=""></div>' +
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
          '<span class="htab-t">Turn part probing 2</span>' +
          '<img class="htab-x" src="' + BASE + 'hdr-tabclose.svg" alt=""></div>' +
        '<div class="htab"><span class="htab-t">New project 2</span>' +
          '<img class="htab-x" src="' + BASE + 'hdr-tabclose.svg" alt=""></div>' +
        '<div class="htab"><span class="htab-t">New project 3</span>' +
          '<img class="htab-x" src="' + BASE + 'hdr-tabclose.svg" alt=""></div>' +
        '<div class="hbtn" title="New tab"><img class="hicn-plus" src="' + BASE + 'hdr-plus.svg" alt=""></div>' +
      '</div>' +
      '<div class="hgroup-right">' +
        // (license state is not shown here: the top bar is reserved for global notifications)
        // temporary prototype toggle: shows the sections online and without network
        '<div class="cseg" id="connSeg">' +
          '<span class="ci on" data-net="online">Online</span>' +
          '<span class="ci" data-net="offline">Offline</span>' +
        '</div>' +
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

  // temporary prototype toggle: online / offline
  (function(){
    var seg = document.getElementById('connSeg');
    function apply(net){
      app.classList.toggle('offline', net === 'offline');
      seg.querySelectorAll('.ci').forEach(function(x){
        x.classList.toggle('on', x.dataset.net === net);
      });
      try { localStorage.setItem('ency.net', net); } catch(e){}
    }
    var saved = 'online';
    try { saved = localStorage.getItem('ency.net') || 'online'; } catch(e){}
    apply(saved);
    seg.querySelectorAll('.ci').forEach(function(x){
      x.addEventListener('click', function(){ apply(x.dataset.net); });
    });
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

  // ——— Utilities window (the "list" button in the title bar) ———
  // Search · Recent / All filter · "+" (new utility) · the list of utilities.
  // Entries with `app` open a section of the prototype; the rest are inert stubs.
  // Icons are 16×16 inline glyphs (currentColor) — one glyph per utility type.
  var UTIL_ICON = {
    macro:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13V3.5l5.5 6 5.5-6V13"/></svg>',
    post:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 8.5h6M5 11h3.5"/></svg>',
    interp: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 2.5v4.5M5.5 10v3.5M10.5 2.5v6M10.5 12v1.5"/><circle cx="5.5" cy="8.5" r="1.5"/><circle cx="10.5" cy="10.5" r="1.5"/></svg>',
    machine:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13.5 13.5 2.5M2.5 2.5l11 11"/><path d="M2.5 2.5h4v4M13.5 13.5h-4v-4"/></svg>',
    cldata: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5h5.5L13 6v7.5H4z"/><path d="M9.5 2.5V6H13"/><path d="M6 9.5c1.5-1 3 1 4.5 0"/></svg>',
    nccld:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5v7M6.5 4.5v7M2.5 4.5l4 7M9.5 4.5v7M9.5 11.5h4"/></svg>',
    addin:  '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="4" height="4" rx=".8"/><rect x="10" y="2" width="4" height="4" rx=".8"/><rect x="2" y="10" width="4" height="4" rx=".8"/><path d="M12 9.5v5M9.5 12h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    calc:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M5.5 5h5M5.5 8.5h1M8 8.5h1M10.5 8.5h1M5.5 11h1M8 11h1M10.5 11h1"/></svg>'
  };
  var UTILITIES = [
    {title:'Macro',                    icon:'macro',   app:'macro'},
    {title:'Postprocessors generator', icon:'post'},
    {title:'Interpreter configurator', icon:'interp'},
    {title:'MachineMaker',             icon:'machine'},
    {title:'CLData viewer',            icon:'cldata'},
    {title:'Create interpreter',       icon:'nccld'},
    {title:'Addin manager',            icon:'addin'},
    {title:'Calculator',               icon:'calc'}
  ];
  (function(){
    var btn = document.getElementById('hdrExt');
    if (!btn) return;
    var pop = null;
    function closePop(){ if (pop){ pop.remove(); pop = null; btn.classList.remove('open'); } }
    // utility windows live inside a project: in the project area the row opens the
    // panel in place (window.ENCY_<UTIL>.open), elsewhere it opens the project with ?utility=<id>
    function row(x){
      return '<div class="ut-row" data-title="' + x.title.toLowerCase() + '"' +
        (x.app ? ' data-util="' + x.app + '"' : '') + '>' +
        '<span class="icn16">' + UTIL_ICON[x.icon] + '</span>' +
        '<span class="ut-name">' + x.title + '</span></div>';
    }
    function runUtil(id){
      var api = window['ENCY_' + id.toUpperCase()];
      if (AREA === 'project' && api && api.open) { api.open(); return; }
      location.href = '../project/?utility=' + id;
    }
    function openPop(){
      pop = document.createElement('div');
      pop.className = 'ut-pop';
      pop.innerHTML =
        '<div class="ut-bar">' +
          '<input class="ut-search" type="text" placeholder="Search…">' +
          '<div class="ut-sel" data-mode="recent"><span class="ut-sel-t">Recent</span>' +
            '<svg viewBox="0 0 8 5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l3 3 3-3"/></svg></div>' +
          '<div class="ut-plus" title="New utility">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg></div>' +
        '</div>' +
        '<div class="ut-list">' + UTILITIES.map(row).join('') + '</div>';
      document.body.appendChild(pop);
      var r = btn.getBoundingClientRect();
      pop.style.left = r.left + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      btn.classList.add('open');
      // search filters the list by title
      var q = pop.querySelector('.ut-search');
      q.addEventListener('input', function(){
        var s = q.value.trim().toLowerCase();
        pop.querySelectorAll('.ut-row').forEach(function(x){
          x.hidden = !!s && x.dataset.title.indexOf(s) < 0;
        });
      });
      // Recent / All — a two-state toggle in the prototype
      var sel = pop.querySelector('.ut-sel');
      sel.addEventListener('click', function(){
        var m = sel.dataset.mode === 'recent' ? 'all' : 'recent';
        sel.dataset.mode = m;
        sel.querySelector('.ut-sel-t').textContent = m === 'recent' ? 'Recent' : 'All';
      });
      pop.addEventListener('click', function(e){
        e.stopPropagation();
        var t = e.target.closest('[data-util]');
        if (t) { closePop(); runUtil(t.dataset.util); }
      });
      setTimeout(function(){ q.focus(); }, 0);
    }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (pop) closePop(); else openPop();
    });
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePop(); });
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
  window.ENCY_CHROME = {sections: SECTIONS.slice(), setLicense: setLicense};
})();
