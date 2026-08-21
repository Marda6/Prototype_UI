// ENCY Core — оболочка окна приложения: титлбар, сайдбар и их поведение.
//
// Раздел подключает этот файл после своей разметки и объявляет себя до него:
//   <script>window.ENCY_APP = {id: "license-manager"};</script>
// Скрипт вставляет титлбар первым ребёнком .app и сайдбар первым ребёнком
// .workspace, поэтому в файле раздела остаётся только <main class="content">.
(function(){
  'use strict';

  // ——— реестр разделов: единственный источник правды для сайдбара и хаба ———
  // Новый раздел = папка packages/<id> плюс запись здесь.
  //   id     — имя папки, из него же строится относительная ссылка ../<id>/
  //   group  — где пункт стоит в сайдбаре: 'nav' (вверху) | 'account' (внизу)
  //   icon   — файл в shared-ui/assets, либо svg: инлайновая иконка
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
  // область приложения: 'home' — разделы вне проекта (Home нажат, вкладка проекта
  // не активна), 'project' — экраны внутри открытого проекта
  var AREA = APP.area || 'home';
  // из packages/<id>/ до packages/shared-ui/ ровно один уровень вверх
  var BASE = '../shared-ui/assets/';

  function icon(s){
    if (s.svg) return '<span class="icn16">' + s.svg + '</span>';
    var st = s.iconSize ? ' style="width:' + s.iconSize + 'px;height:' + s.iconSize + 'px"' : '';
    return '<span class="icn16"><img src="' + BASE + s.icon + '" alt=""' + st + '></span>';
  }

  // пункт сайдбара: активный раздел не ссылка, остальные — переход на ../<id>/
  function sectionRow(s){
    var active = s.id === APP.id;
    return '<div class="srow' + (active ? ' active' : '') + '"' +
      (active ? '' : ' data-app="../' + s.id + '/"') + '>' +
      icon(s) + '<span class="t">' + s.title + '</span></div>';
  }

  function group(name){
    return SECTIONS.filter(function(s){ return s.group === name; }).map(sectionRow).join('\n');
  }

  // ——— титлбар окна ———
  function topbar(){
    return '' +
    '<header class="topbar">' +
      '<div class="hbtn" title="Меню"><img class="hicn-act hicn-logo" src="' + BASE + 'hdr-logo.svg" alt=""></div>' +
      '<div class="hdiv"></div>' +
      '<div class="hgroup-left">' +
        '<div class="hbtn' + (AREA === 'home' ? ' on' : '') + '" title="Домой">' +
          '<img class="hicn-act" src="' + BASE + 'hdr-home.svg" alt=""></div>' +
        '<div class="hbtn" title="Список"><img class="hicn-act" src="' + BASE + 'hdr-list.svg" alt=""></div>' +
        '<div class="hbtn" title="Новый файл"><img class="hicn-act" src="' + BASE + 'hdr-file.svg" alt=""></div>' +
        '<div class="hbtn" title="Открыть"><img class="hicn-act" src="' + BASE + 'hdr-folder.svg" alt=""></div>' +
        '<div class="hbtn" title="Сохранить"><img class="hicn-act hicn-save" src="' + BASE + 'hdr-save.svg" alt=""></div>' +
      '</div>' +
      '<div class="hdiv"></div>' +
      '<div class="htabs">' +
        // в домашней области ни одна вкладка проекта не активна — активен Home
        '<div class="htab' + (AREA === 'project' ? ' active' : '') + '">' +
          '<span class="htab-t">Turn part probing 2</span>' +
          '<img class="htab-x" src="' + BASE + 'hdr-tabclose.svg" alt=""></div>' +
        '<div class="htab"><span class="htab-t">New project 2</span></div>' +
        '<div class="htab"><span class="htab-t">New project 3</span></div>' +
        '<div class="hbtn" title="Новая вкладка"><img class="hicn-plus" src="' + BASE + 'hdr-plus.svg" alt=""></div>' +
      '</div>' +
      '<div class="hgroup-right">' +
        // временный тумблер прототипа: показывает разделы в онлайне и без сети
        '<div class="cseg" id="connSeg">' +
          '<span class="ci on" data-net="online">Online</span>' +
          '<span class="ci" data-net="offline">Offline</span>' +
        '</div>' +
        '<div class="hbtn" title="Ещё"><img class="hicn32" src="' + BASE + 'hdr-chevron.svg" alt=""></div>' +
        '<div class="hbtn" title="Свернуть"><img class="hicn32" src="' + BASE + 'hdr-min.svg" alt=""></div>' +
        '<div class="hbtn" title="Развернуть"><img class="hicn32" src="' + BASE + 'hdr-max.svg" alt=""></div>' +
        '<div class="hbtn" title="Закрыть"><img class="hicn32" src="' + BASE + 'hdr-close.svg" alt=""></div>' +
      '</div>' +
    '</header>';
  }

  // ——— сайдбар ———
  function sidebar(){
    return '' +
    '<aside class="sidebar">' +
      '<div class="sb">' +
        '<nav class="snav">' +
          '<div class="srow srow-recent" data-page="recent">' +
            '<span class="icn16"><img src="' + BASE + 'sb-recent.svg" alt="" style="width:12px;height:12px"></span>' +
            '<span class="t">Recent</span>' +
            '<span class="spin sfade" id="pinBtn" title="Закрепить панель">' +
              '<img src="' + BASE + 'sb-pin.svg" alt=""></span>' +
          '</div>' +
          '<div class="srow" data-page="clouds">' +
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

  // ——— вставка и поведение ———
  var app = document.getElementById('app'),
      workspace = app && app.querySelector('.workspace');
  if (!app || !workspace) return;

  app.insertAdjacentHTML('afterbegin', topbar());
  workspace.insertAdjacentHTML('afterbegin', sidebar());

  // пин сайдбара: состояние живёт в localStorage, чтобы не сбрасываться
  // при переходе между разделами (это полная перезагрузка страницы)
  try { if (localStorage.getItem('ency.sidebar.pinned') === '1') app.classList.add('pinned'); } catch(e){}
  document.getElementById('pinBtn').addEventListener('click', function(e){
    e.stopPropagation();
    var on = app.classList.toggle('pinned');
    try { localStorage.setItem('ency.sidebar.pinned', on ? '1' : '0'); } catch(e){}
  });

  // переход между разделами: относительный путь работает и на Pages, и локально
  document.querySelectorAll('.srow[data-app]').forEach(function(r){
    r.addEventListener('click', function(){ location.href = r.dataset.app; });
  });

  // временный тумблер прототипа: online / offline
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

  // разделам иногда нужен реестр — например, чтобы построить свой список ссылок
  window.ENCY_CHROME = {sections: SECTIONS.slice()};
})();
