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
        '<div class="hbtn" title="List"><img class="hicn-act" src="' + BASE + 'hdr-list.svg" alt=""></div>' +
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
          '<div class="grp"><span class="lbl">Active license:</span><span class="val">#421480</span></div>' +
          '<div class="grp"><span class="lbl">Licensee:</span><span class="val">TONINI FABIO ELETTROMECCANICA</span></div>' +
        '</div>' +
        '<div class="sdiv"></div>' +
        '<nav class="snav">' +
          group('account') +
          '<div class="srow">' +
            '<span class="icn16 sacc-icn"><img src="' + BASE + 'sb-account.svg" alt=""></span>' +
            '<span class="t">My account</span>' +
          '</div>' +
        '</nav>' +
      '</div>' +
    '</aside>';
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

  // sections sometimes need the registry — e.g. to build their own list of links
  window.ENCY_CHROME = {sections: SECTIONS.slice()};
})();
