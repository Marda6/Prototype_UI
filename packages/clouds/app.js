// Clouds — section data and behavior: invite, collection and project cards,
// the Compact/Extensive switch, section collapsing.
(function(){
  'use strict';

  var A = 'assets/';
  // favorite star: hollow icon in this package, the filled state is shared
  var STAR = A + 'icn-star-16.svg',
      STAR_ON = '../shared-ui/assets/st-star16-filled.svg';
  function starImg(on){ return on ? STAR_ON : STAR; }
  // two real previews from the mockup; alternated so the grid doesn't look cloned
  var PARTS = [A+'part-b.png', A+'part-c.png'];
  var part = function(i){ return PARTS[i % PARTS.length]; };

  // ——— invites: 4 of them, the last one expired; the count is mirrored on the badge ———
  var invites = [
    {days:'30 days'}, {days:'24 days'}, {days:'12 days'},
    {expired:true}
  ];

  function inviteCard(inv, i){
    var exp = inv.expired;
    return '<div class="card' + (exp ? ' expired' : '') + '">' +
      (exp ? '<img class="x" src="' + A + 'icn-close-30.svg" alt="">' : '') +
      '<div class="preview">' +
        // active invites get an actions menu on hover
        (exp ? '' :
          '<div class="hovermenu">' +
            '<button>Preview</button><button>Accept</button><button>Decline</button>' +
          '</div>') +
        '<img src="' + part(i) + '" alt="">' +
      '</div>' +
      '<div class="meta">' +
        '<div class="head">' +
          '<div class="txt"><span class="name">From Drawing</span>' +
          '<span class="sub">by Andrew Smith</span></div>' +
          '<img src="' + A + 'icn-access-24.svg" alt="" title="Shared with me">' +
        '</div>' +
        '<div class="div"></div>' +
        '<div class="expline">' +
          '<img src="' + A + 'icn-time' + (exp ? '-red' : '') + '-28.svg" alt="">' +
          (exp
            ? '<span class="lbl">Expired</span><span class="val">auto-delete in 7 days</span>'
            : '<span class="lbl">Expires in</span><span class="val">' + inv.days + '</span>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ——— collections: opaque colors for the mini previews in the collapsed header ———
  var collections = [
    {name:'Milling boats', cls:'c-blue', mini:'#84c9eb'},
    {name:'Swiss-type', cls:'c-violet', mini:'#9584eb'},
    {name:'Training Course: "3D CNC Milling"', cls:'c-yellow', mini:'#ebda84'},
    {name:'Additive', cls:'c-green', mini:'#84ebb8'}
  ];

  function collectionCard(c){
    var previews = [1,2,3,4].map(function(n){
      return '<span class="p"><img src="' + A + 'mini-' + n + '.png" alt=""></span>';
    }).join('');
    return '<div class="coll ' + c.cls + '">' +
      '<div class="coll-top">' +
        '<div class="coll-head"><span class="coll-name">' + c.name + '</span>' +
        '<img src="' + A + 'icn-menu-20.svg" alt=""></div>' +
        '<div class="coll-meta">' +
          '<span class="m"><img src="' + A + 'icn-owner-16.svg" alt="">Ruslan Mardanshin</span>' +
          '<span class="m"><img src="' + A + 'icn-type-24.svg" alt="" style="margin:0">12 projects</span>' +
          '<span class="m"><img src="' + A + 'icn-recent-16.svg" alt="">17.07.2025</span>' +
        '</div>' +
      '</div>' +
      '<div class="coll-previews">' + previews + '</div>' +
    '</div>';
  }

  // ——— projects: a mix of locations and states from the mockup ———
  var projects = [
    {name:'Part More 4X', loc:'Shared with me'},
    {name:'Part More 4X', loc:'Shared with me'},
    {name:'From Drawing', loc:'My projects', star:true},
    {name:'Turn mill part', loc:'My projects', star:true},
    {name:'Aerospace part', loc:'My projects'},
    {name:'Hellic', loc:'Community', featured:true},
    {name:'From Drawing', loc:'Shared with me'},
    {name:'From Drawing', loc:'Shared with me'},
    {name:'From Drawing', loc:'My projects', featured:true, star:true},
    {name:'From Drawing', loc:'Shared with me'},
    {name:'From Drawing', loc:'Community'},
    {name:'From Drawing', loc:'Shared with me'},
    {name:'From Drawing', loc:'My projects'},
    {name:'From Drawing', loc:'Shared with me'},
    {name:'From Drawing', loc:'Community'},
    {name:'From Drawing', loc:'Shared with me'},
    // archived projects only show up in the Archive view
    {name:'Old bracket rev.2', loc:'My projects', archived:true},
    {name:'Legacy fixture', loc:'My projects', archived:true}
  ];

  // filterable project attributes — value lists from the web DMC filters
  var P_MACHINE = ['Milling','Milling 3D','Milling 5D AB','Milling 5D AC','Milling 5D BC',
    'Robot 6-Axes','Swiss-type','Turn','Turn-mill','Turret Head','Unknown'];
  var P_TOOLS = ['Custom mill','Cutter','dblradius','Drill','End mill','Face grooving',
    'Gripper','Grooving tool','ID grooving','Lollipop mill','Reamer','Spot drill',
    'Tap','Thread mill','Turning tool'];
  var P_AXES = ['C3','C4','C5','C6','CAS','CBRAKE','CHUCK','CLAMP11','CLAMP12',
    'HEAD1','HEAD2','LUNETTE','SPINDLE','TAILSTOCK'];
  var P_TAGS = ['Aerospace','Demo','Training','5-axis','Probing','Fixture',
    'Multi-part','Optimization'];
  var P_OPS = ['Milling 3D','Drilling','Turning','Facing','Contouring','Probing','Threading'];
  var P_PROV = ['ENCY Software Ltd','Andrew Smith','Community','Postworks GmbH'];
  var P_MODELS = ['DMU 50','DMX 210','CTX 310','NLX 2500','VF-2SS','UMC-750',
    'INTEGREX i-200','SPRINT 32','C 42 U','a51nx'];
  // deterministic assignment by index — stable across reloads
  projects.forEach(function(p, i){
    p.machine = P_MACHINE[(i * 3) % P_MACHINE.length];
    p.mmodel = P_MODELS[(i * 5) % P_MODELS.length];
    p.prov = P_PROV[(i * 7) % P_PROV.length];
    p.ops = [P_OPS[i % P_OPS.length], P_OPS[(i * 4 + 3) % P_OPS.length]]
      .filter(function(v, j, a){ return a.indexOf(v) === j; });
    p.tools = [P_TOOLS[i % P_TOOLS.length], P_TOOLS[(i * 5 + 2) % P_TOOLS.length]]
      .filter(function(v, j, a){ return a.indexOf(v) === j; });
    p.axes = [P_AXES[(i * 7) % P_AXES.length], P_AXES[(i * 3 + 1) % P_AXES.length]]
      .filter(function(v, j, a){ return a.indexOf(v) === j; });
    p.tags = (i % 2 ? [P_TAGS[i % P_TAGS.length]]
      : [P_TAGS[i % P_TAGS.length], P_TAGS[(i + 3) % P_TAGS.length]])
      .filter(function(v, j, a){ return a.indexOf(v) === j; });
  });

  // status marker next to the name — it tells the project kind apart
  var LOC_ICON = {
    'My projects': 'icn-status-my.svg',
    'Shared with me': 'icn-status-shared-with-me.svg',
    'Community': 'icn-status-public.svg'
  };
  function locIcon(loc){
    return '<img src="' + A + (LOC_ICON[loc] || 'icn-status-my.svg') +
      '" alt="" title="' + loc + '">';
  }

  function projectCard(p, i){
    return '<div class="card" data-name="' + p.name + '">' +
      '<div class="preview">' +
        '<div class="hovermenu"><button data-open>Open project</button><button>Preview</button></div>' +
        (p.featured ? '<span class="tag">Featured</span>' : '') +
        '<img src="' + part(i) + '" alt="">' +
      '</div>' +
      '<div class="meta">' +
        '<div class="head">' +
          '<div class="txt"><span class="name">' + p.name + '</span>' +
          '<span class="sub">Updated: 29.02.2024 17:35:08</span></div>' +
          locIcon(p.loc) +
        '</div>' +
        '<div class="div"></div>' +
        '<div class="foot">' +
          '<span class="btn-loc"><span>ENCY Clouds</span></span>' +
          // the star shows on hover on every card; a starred one keeps it visible
          '<span class="btn-star' + (p.star ? ' faved' : '') + '" data-star="' + i + '">' +
            '<img src="' + starImg(p.star) + '" alt=""></span>' +
          // three dots — the native 16px icon from the mockup, not a text glyph
          '<span class="btn-dots"><svg viewBox="0 0 16 16" width="16" height="16">' +
            '<circle cx="8" cy="3" r="1" fill="currentColor"/>' +
            '<circle cx="8" cy="8" r="1" fill="currentColor"/>' +
            '<circle cx="8" cy="13" r="1" fill="currentColor"/></svg></span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('invites').innerHTML = invites.map(inviteCard).join('');
  document.querySelector('#sect-invites .badge').textContent = invites.length;
  document.getElementById('collections').innerHTML = collections.map(collectionCard).join('');
  document.getElementById('projects').innerHTML = projects.map(projectCard).join('');
  // collection mini previews for the collapsed header
  document.getElementById('collMini').innerHTML = collections.map(function(c, i){
    return '<span class="p" style="background:' + c.mini + '">' +
      '<img src="' + A + 'mini-' + (i % 4 + 1) + '.png" alt=""></span>';
  }).join('');

  // ——— Compact / Extensive: a class on the page body, the choice survives a reload ———
  var body = document.getElementById('pagebody'),
      seg = document.getElementById('viewSeg');
  function setView(v){
    body.classList.toggle('ext', v === 'ext');
    seg.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('active', c.dataset.view === v);
    });
    try { localStorage.setItem('ency.clouds.view', v); } catch(e){}
  }
  seg.querySelectorAll('.chip').forEach(function(c){
    c.addEventListener('click', function(){ setView(c.dataset.view); });
  });
  var saved = 'compact';
  try { saved = localStorage.getItem('ency.clouds.view') || 'compact'; } catch(e){}
  setView(saved);

  // ——— section collapsing: Collapse hides the strip (collections keep their mini previews) ———
  document.querySelectorAll('.sect-collapse').forEach(function(b){
    b.addEventListener('click', function(){
      var on = b.closest('.sect').classList.toggle('collapsed');
      b.textContent = on ? 'Expand' : 'Collapse';
    });
  });

  // ——— header arrow: a dedicated page with all of the section's items;
  // clicking the arrow again returns to the overview ———
  var content = document.querySelector('.content');
  document.querySelectorAll('.sect-head .arrow').forEach(function(a){
    a.addEventListener('click', function(){
      var sect = a.closest('.sect'),
          open = sect.classList.contains('open');
      content.classList.toggle('subpage', !open);
      document.querySelectorAll('.sect.open').forEach(function(s){ s.classList.remove('open'); });
      if (!open) { sect.classList.remove('collapsed'); sect.classList.add('open'); }
    });
  });
  // ——— only the first row is visible in the strip: extra cards are hidden per column count ———
  function trimRows(){
    document.querySelectorAll('.sect-row').forEach(function(row){
      var n = getComputedStyle(row).gridTemplateColumns.split(' ').length;
      Array.prototype.forEach.call(row.children, function(c, i){
        c.classList.toggle('ovf', i >= n);
      });
    });
  }
  // ——— switching between the Projects / Digital Machine Center areas ———
  document.getElementById('areaTabs').addEventListener('click', function(e){
    var tab = e.target.closest('.ph-tab');
    if (!tab) return;
    document.querySelectorAll('#areaTabs .ph-tab').forEach(function(t){
      t.classList.toggle('active', t === tab);
    });
    document.getElementById('area-projects').hidden = tab.dataset.area !== 'projects';
    document.getElementById('area-dmc').hidden = tab.dataset.area !== 'dmc';
    if (tab.dataset.area === 'projects') requestAnimationFrame(trimRows);
  });

  // ——— DMC catalog: data and table (a simplified port of the web version) ———
  // deterministic generator so the catalog doesn't change between reloads
  var rseed = 42;
  function rnd(){ rseed = (rseed * 1103515245 + 12345) % 2147483648; return rseed / 2147483648; }
  function ri(a, b){ return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }

  var MAKERS = ['DMG MORI','Mazak','Okuma','Haas','Hermle','Makino','Doosan','Hurco','Emco','Spinner'];
  var CONTROLS = [
    {name:'Fanuc', models:['0i-MF','31i-B5','30i-B']},
    {name:'Siemens', models:['828D','840D sl','ONE']},
    {name:'Heidenhain', models:['TNC 640','TNC7']},
    {name:'Mitsubishi', models:['M80','M800']},
    {name:'Okuma', models:['OSP-P300','OSP-P500']}
  ];
  var TYPES = ['Milling','Turn','Mill Turn','Wire EDM','Swiss','Additive','Laser'];
  var KINDS = {post:'Post Processor', interp:'Interpreter', schema:'Machine Schema', kit:'Kit'};
  var PUBLISHERS = ['ENCY Software Ltd','Postworks GmbH','CAM Guild','MillwrightSoft'];
  // optional machine equipment — only for schemas and kits
  var OPTIONS = ['4th axis','5th axis','Probe','Tool setter','Sub-spindle','Live tooling',
    'Bar feeder','Tailstock','Pallet changer','Y axis'];

  function product(kind){
    var type = pick(TYPES), maker = pick(MAKERS), ctrl = pick(CONTROLS),
        model = ri(1, 9) * (rnd() < .5 ? 10 : 100),
        turn = (type === 'Turn' || type === 'Swiss');
    var p = {
      kind: kind, type: type, maker: maker, control: ctrl.name,
      ctrlModel: ctrl.name + ' ' + pick(ctrl.models),
      model: 'M' + model,
      axes: pick([2,3,3,4,5,5,6]),
      wa: (kind === 'schema' || kind === 'kit') && rnd() < .85
        ? {x: ri(20, 400) * 10, y: turn ? null : ri(5, 105) * 10, z: ri(32, 78) * 10} : null,
      units: rnd() < .78 ? 'mm' : 'in',
      publisher: PUBLISHERS[Math.floor(rnd() * rnd() * PUBLISHERS.length)],
      price: pick(['Free','Maintenance','Paid']),
      priceVal: ri(19, 199) * 10,
      dl: ri(20, 4200), fav: rnd() < .08
    };
    p.name = kind === 'post' ? p.ctrlModel
      : kind === 'interp' ? ctrl.name + ' G-code'
      : maker + ' ' + p.model + (kind === 'kit' ? ' Kit' : '');
    if (kind === 'schema' || kind === 'kit'){
      var n = ri(0, 4), pool = OPTIONS.slice();
      p.opts = [];
      for (var j = 0; j < n; j++)
        p.opts.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return p;
  }
  var CATALOG = [];
  for (var k = 0; k < 26; k++) CATALOG.push(product('post'));
  for (k = 0; k < 5; k++) CATALOG.push(product('interp'));
  for (k = 0; k < 88; k++) CATALOG.push(product('schema'));
  CATALOG.push(product('kit')); CATALOG.push(product('kit'));
  // stable id — cards are rendered from a filtered list, favorites toggle by id
  CATALOG.forEach(function(p, i){ p.id = i; });

  var dmc = {scope:'all', q:'', fav:false,
    makers:{}, ctrls:{}, types:{}, axes:{}, price:'', units:'', pub:''};

  // filtering with the option to skip one facet — for honest counters
  function some(obj){ for (var k in obj) if (obj[k]) return true; return false; }
  function dmcMatch(p, skip){
    if (dmc.fav && !p.fav) return false;
    if (skip !== 'scope' && dmc.scope !== 'all' && p.kind !== dmc.scope) return false;
    if (skip !== 'maker' && some(dmc.makers) && !dmc.makers[p.maker]) return false;
    if (skip !== 'ctrl' && some(dmc.ctrls) && !dmc.ctrls[p.control]) return false;
    if (skip !== 'type' && some(dmc.types) && !dmc.types[p.type]) return false;
    if (skip !== 'axes' && some(dmc.axes) && !dmc.axes[Math.min(p.axes, 6)]) return false;
    if (skip !== 'price' && dmc.price && p.price !== dmc.price) return false;
    if (skip !== 'units' && dmc.units && p.units !== dmc.units) return false;
    if (skip !== 'pub' && dmc.pub && p.publisher !== dmc.pub) return false;
    if (dmc.q && (p.name + ' ' + p.maker + ' ' + p.control + ' ' + p.ctrlModel)
      .toLowerCase().indexOf(dmc.q) < 0) return false;
    return true;
  }
  function countWhere(skip, test){
    var n = 0;
    CATALOG.forEach(function(p){ if (dmcMatch(p, skip) && test(p)) n++; });
    return n;
  }

  function waText(p){
    if (!p.wa) return '—';
    var inch = p.units === 'in';
    var v = function(n){ return inch ? (n / 25.4).toFixed(1) : n; };
    return [p.wa.x, p.wa.y, p.wa.z].filter(function(n){ return n != null; })
      .map(v).join(' × ') + (inch ? ' ″' : ' mm');
  }
  function priceHtml(p){
    if (p.price === 'Free') return '<span class="price-free">Free</span>';
    if (p.price === 'Maintenance') return '<span class="price-note">In maintenance</span>';
    return '<span class="price-free">$' + p.priceVal + '</span>';
  }
  function rowHtml(p){
    return '<tr>' +
      '<td><div class="mtable__id">' +
        '<span class="mtable__thumb"><svg><use href="#k-' + p.kind + '"/></svg></span>' +
        '<div class="mtable__idtext"><span class="mtable__name">' + p.name + '</span>' +
        '<span class="mtable__sub">' + p.publisher + '</span></div>' +
      '</div></td>' +
      '<td class="c-kind"><span class="kindtag kindtag--' + p.kind + '">' + KINDS[p.kind] + '</span></td>' +
      '<td class="c-mach' + (p.kind === 'schema' ? ' dim' : '') + '">' +
        (p.kind === 'schema' ? '—' : p.maker + ' ' + p.model) + '</td>' +
      '<td class="c-type dim">' + p.type + '</td>' +
      '<td class="c-ctrl dim">' + (p.kind === 'schema' ? p.control : p.ctrlModel) + '</td>' +
      '<td class="c-ax num">' + (p.axes >= 6 ? '6+' : p.axes) + '</td>' +
      '<td class="c-wa dim num">' + waText(p) + '</td>' +
      '<td class="c-dl num dim">' + p.dl + '</td>' +
      '<td class="c-price num">' + priceHtml(p) + '</td>' +
    '</tr>';
  }
  // catalog card: the same facts as in the table row
  function cardHtml(p){
    var kv = [['Control', p.kind === 'schema' ? p.control : p.ctrlModel]];
    if (p.kind !== 'schema') kv.push(['Machine', p.maker + ' ' + p.model]);
    kv.push(['Type', p.type], ['Axes', p.axes >= 6 ? '6+' : p.axes]);
    if (p.kind === 'schema' || p.kind === 'kit'){
      kv.push(['Work area', waText(p)]);
      kv.push(['Equipment', p.opts.length
        ? '<span class="kv-opts">' + p.opts.map(function(o){
            return '<span class="xtag">' + o + '</span>';
          }).join('') + '<span class="xtag xtag--more" hidden></span></span>'
        : '—']);
    }
    return '<div class="mcard">' +
      '<div class="mcard__photo"><svg><use href="#k-' + p.kind + '"/></svg>' +
        '<span class="mstar' + (p.fav ? ' faved' : '') + '"' +
          ' data-id="' + p.id + '" title="Add to favorites">' +
          '<img src="' + starImg(p.fav) + '" alt=""></span></div>' +
      '<div class="mcard__head"><div class="mcard__name">' + p.name + '</div>' +
      '<div class="mcard__sub">' + p.publisher + '</div></div>' +
      '<div class="mcard__kv">' + kv.map(function(x){
        return '<span>' + x[0] + '</span><b>' + x[1] + '</b>';
      }).join('') + '</div>' +
      '<div class="mcard__foot"><span class="kindtag kindtag--' + p.kind + '">' +
        KINDS[p.kind] + '</span>' +
        priceHtml(p) + '</div>' +
    '</div>';
  }

  // ——— filter panel: built from the catalog, counters exclude their own facet ———
  var FACETS = [
    {key:'maker', set:'makers', title:'Machine manufacturer', vals:MAKERS,
     of:function(p){ return p.maker; }},
    {key:'ctrl', set:'ctrls', title:'Control manufacturer',
     vals:CONTROLS.map(function(c){ return c.name; }), of:function(p){ return p.control; }},
    {key:'type', set:'types', title:'Machine type', vals:TYPES,
     of:function(p){ return p.type; }},
    {key:'axes', set:'axes', title:'Axes', vals:[2,3,4,5,6],
     of:function(p){ return Math.min(p.axes, 6); },
     label:function(v){ return v >= 6 ? '6+ axes' : v + ' axes'; }}
  ];
  // section header: an active one gets a green color and a clear cross;
  // there is a single shared selection counter, in the panel header
  function grpHead(title, selCnt, clearKey){
    return '<div class="fp-grp"><span class="t">' + title + '</span>' +
      (selCnt ? '<button class="fgrp-clear" data-clear="' + clearKey + '" title="Clear">' +
        '<svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" ' +
        'stroke-linecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg></button>' : '') +
      '</div>';
  }
  function renderFilters(){
    var html = FACETS.map(function(f){
      var sel = Object.keys(dmc[f.set]).filter(function(k){ return dmc[f.set][k]; }).length;
      return '<div class="fgrp' + (sel ? ' is-active' : '') + '">' +
        grpHead(f.title, sel, f.set) +
        f.vals.map(function(v){
          var n = countWhere(f.key, function(p){ return f.of(p) === v; }),
              on = dmc[f.set][v];
          return '<div class="fopt' + (on ? ' on' : '') + (!n && !on ? ' dim' : '') + '"' +
            ' data-facet="' + f.set + '" data-v="' + v + '">' +
            '<span class="chk' + (on ? ' on' : '') + '"></span>' +
            '<span class="lb">' + (f.label ? f.label(v) : v) + '</span>' +
            '<span class="n">' + n + '</span></div>';
        }).join('') + '</div>';
    }).join('');
    html += '<div class="fgrp' + (dmc.price ? ' is-active' : '') + '">' +
      grpHead('Price', dmc.price ? 1 : 0, 'price') +
      ['','Free','Maintenance','Paid'].map(function(v){
        var n = v ? countWhere('price', function(p){ return p.price === v; })
                  : countWhere('price', function(){ return true; });
        return '<div class="fopt' + (dmc.price === v ? ' on' : '') +
          (v && !n ? ' dim' : '') + '" data-price="' + v + '">' +
          '<span class="rdo"></span><span class="lb">' +
          (v === '' ? 'All' : v === 'Maintenance' ? 'In maintenance' : v) +
          '</span><span class="n">' + n + '</span></div>';
      }).join('') + '</div>';
    html += '<div class="fgrp' + (dmc.units ? ' is-active' : '') + '">' +
      grpHead('Units', dmc.units ? 1 : 0, 'units') + '<div class="fseg">' +
      ['','mm','in'].map(function(v){
        return '<span class="fs' + (dmc.units === v ? ' on' : '') + '" data-units="' + v + '">' +
          (v === '' ? 'All' : v === 'mm' ? 'Metric' : 'Inch') + '</span>';
      }).join('') + '</div></div>';
    html += '<div class="fgrp' + (dmc.pub ? ' is-active' : '') + '">' +
      grpHead('Publisher', dmc.pub ? 1 : 0, 'pub') +
      '<select class="fsel" id="dmcPub"><option value="">All publishers</option>' +
      PUBLISHERS.map(function(v){
        var n = countWhere('pub', function(p){ return p.publisher === v; });
        return '<option value="' + v + '"' + (dmc.pub === v ? ' selected' : '') + '>' +
          v + ' (' + n + ')</option>';
      }).join('') + '</select></div>';
    document.getElementById('dmcFilters').innerHTML = html;
    // total number of selected values — badges on the funnel and next to the panel header
    var total = 0;
    FACETS.forEach(function(f){
      total += Object.keys(dmc[f.set]).filter(function(k){ return dmc[f.set][k]; }).length;
    });
    if (dmc.price) total++;
    if (dmc.units) total++;
    if (dmc.pub) total++;
    [['dmcFunnelCnt', total], ['dmcSideCnt', total]].forEach(function(x){
      var el = document.getElementById(x[0]);
      el.hidden = !x[1];
      el.textContent = x[1];
    });
    document.getElementById('dmcReset').disabled = !total;
  }

  function renderDmc(){
    var rows = CATALOG.filter(function(p){ return dmcMatch(p); });
    var table = document.getElementById('dmcTable'),
        grid = document.getElementById('dmcGrid');
    table.hidden = dmc.view === 'grid';
    grid.hidden = dmc.view !== 'grid';
    // panel backdrop only for the table; cards sit on the common background
    document.querySelector('.dmc-scroll').classList.toggle('as-panel', dmc.view !== 'grid');
    if (dmc.view === 'grid'){
      grid.innerHTML = rows.map(cardHtml).join('');
      // equipment tags that don't fit collapse into "+N" (the web version's recipe)
      grid.querySelectorAll('.kv-opts').forEach(function(cell){
        var more = cell.querySelector('.xtag--more'), hidden = 0;
        while (cell.scrollWidth > cell.clientWidth + 1){
          var tags = cell.querySelectorAll('.xtag:not(.xtag--more)');
          if (tags.length <= 1) break;
          tags[tags.length - 1].remove();
          hidden++;
          more.hidden = false;
          more.textContent = '+' + hidden;
        }
      });
    }
    else document.getElementById('dmcRows').innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : '<tr><td colspan="9"><div class="dmc-empty"><b>Nothing matches</b>' +
        'Try clearing a filter or the search query</div></td></tr>';
    // counters on the scope chips: excluding the scope facet itself
    document.querySelectorAll('#dmcScope .chip').forEach(function(c){
      var s = c.dataset.scope;
      c.querySelector('.cnt').textContent =
        countWhere('scope', function(p){ return s === 'all' || p.kind === s; });
    });
    renderFilters();
  }

  document.getElementById('dmcScope').addEventListener('click', function(e){
    var chip = e.target.closest('.chip');
    if (!chip) return;
    dmc.scope = chip.dataset.scope;
    this.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('active', c === chip);
    });
    renderDmc();
  });
  document.getElementById('dmcFav').addEventListener('click', function(){
    dmc.fav = this.classList.toggle('active');
    this.querySelector('img').src = starImg(dmc.fav);
    renderDmc();
  });
  document.getElementById('dmcSearch').addEventListener('input', function(){
    dmc.q = this.value.trim().toLowerCase();
    renderDmc();
  });
  document.getElementById('dmcFunnel').addEventListener('click', function(){
    var panel = document.getElementById('dmcPanel');
    panel.hidden = !panel.hidden;
    this.classList.toggle('active', !panel.hidden);
  });
  // the panel is open by default — the funnel starts pressed (white)
  document.getElementById('dmcFunnel').classList.add('active');
  document.getElementById('dmcGrid').addEventListener('click', function(e){
    var st = e.target.closest('.mstar');
    if (!st) return;
    var p = CATALOG[+st.dataset.id];
    p.fav = !p.fav;
    st.classList.toggle('faved', p.fav);
    st.querySelector('img').src = starImg(p.fav);
    // with the Favorites filter active an unstarred card leaves the list
    if (dmc.fav) renderDmc();
  });
  document.getElementById('dmcView').addEventListener('click', function(e){
    var b = e.target.closest('.vbtn');
    if (!b) return;
    dmc.view = b.dataset.view;
    this.querySelectorAll('.vbtn').forEach(function(x){
      x.classList.toggle('active', x === b);
    });
    renderDmc();
  });
  document.getElementById('dmcFilters').addEventListener('click', function(e){
    var clr = e.target.closest('.fgrp-clear');
    if (clr){
      var k = clr.dataset.clear;
      if (k === 'price' || k === 'units' || k === 'pub') dmc[k] = '';
      else dmc[k] = {};
      renderDmc();
      return;
    }
    var opt = e.target.closest('.fopt, .fs');
    if (!opt) return;
    if (opt.dataset.facet) dmc[opt.dataset.facet][opt.dataset.v] = !dmc[opt.dataset.facet][opt.dataset.v];
    else if (opt.dataset.price != null) dmc.price = opt.dataset.price;
    else if (opt.dataset.units != null) dmc.units = opt.dataset.units;
    renderDmc();
  });
  document.getElementById('dmcFilters').addEventListener('change', function(e){
    if (e.target.id === 'dmcPub'){ dmc.pub = e.target.value; renderDmc(); }
  });
  document.getElementById('dmcReset').addEventListener('click', function(){
    dmc.makers = {}; dmc.ctrls = {}; dmc.types = {}; dmc.axes = {};
    dmc.price = ''; dmc.units = ''; dmc.pub = '';
    renderDmc();
  });
  dmc.view = 'grid';   // cards by default
  renderDmc();

  trimRows();
  window.addEventListener('resize', trimRows);
  // switching Compact/Extensive changes column widths — recalculate after the repaint
  seg.addEventListener('click', function(){ requestAnimationFrame(trimRows); });

  // ——— project download: Open project starts the progress; when it finishes
  // a new project tab opens at the top. Cancel aborts both the download and the opening ———
  function openTab(name){
    var tabs = document.querySelector('.htabs');
    if (!tabs) return;
    tabs.querySelectorAll('.htab.active').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.createElement('div');
    tab.className = 'htab active';
    tab.innerHTML = '<span class="htab-t"></span>' +
      '<img class="htab-x" src="../shared-ui/assets/hdr-tabclose.svg" alt="">';
    tab.querySelector('.htab-t').textContent = name;
    tab.querySelector('.htab-x').addEventListener('click', function(){ tab.remove(); });
    tabs.insertBefore(tab, tabs.querySelector('.hbtn'));
  }

  function startDownload(card){
    if (card.dataset.dl) return;                     // already downloading
    card.dataset.dl = '1';
    card.classList.add('downloading');
    var menu = document.createElement('div');
    menu.className = 'dlmenu';
    menu.innerHTML = '<div class="dlrow"><span class="bar"></span>' +
      '<span>Download</span><span class="pct">0%</span></div>' +
      '<button class="dlcancel">Cancel</button>';
    card.querySelector('.preview').appendChild(menu);
    var bar = menu.querySelector('.bar'), pct = menu.querySelector('.pct'), p = 0;
    var timer = setInterval(function(){
      p = Math.min(100, p + 1 + Math.random() * 2);
      bar.style.width = p + '%';
      pct.textContent = Math.floor(p) + '%';
      if (p >= 100){
        clearInterval(timer);
        setTimeout(function(){ stop(); openTab(card.dataset.name); }, 200);
      }
    }, 60);
    function stop(){
      clearInterval(timer);
      menu.remove();
      card.classList.remove('downloading');
      delete card.dataset.dl;
    }
    menu.querySelector('.dlcancel').addEventListener('click', stop);
  }

  document.getElementById('projects').addEventListener('click', function(e){
    if (e.target.hasAttribute && e.target.hasAttribute('data-open')){
      startDownload(e.target.closest('.card'));
      return;
    }
    var st = e.target.closest('.btn-star');
    if (st){
      var p = projects[+st.dataset.star];
      p.star = !p.star;
      st.classList.toggle('faved', p.star);
      st.querySelector('img').src = starImg(p.star);
      applyProjFilters();
    }
  });

  // ——— projects toolbar filters: scope, archive, favorites, Featured and search
  // are combined; the grid keeps card order, non-matching cards are hidden ———
  var pf = {scope:'All', fav:false, feat:false, arch:false, q:'', model:'',
    machine:{}, prov:{}, ops:{}, tools:{}, paxes:{}, tags:{}};
  var SCOPE_LOC = {'My':'My projects', 'Shared with me':'Shared with me', 'Public':'Community'};
  // panel facets: a project holds a list of values, a match is any intersection
  var PFACETS = [
    {set:'machine', title:'Machine type', vals:P_MACHINE, of:function(p){ return [p.machine]; }},
    {set:'prov', title:'Provided by', vals:P_PROV, of:function(p){ return [p.prov]; }},
    {set:'ops', title:'Operations', vals:P_OPS, of:function(p){ return p.ops; }},
    {set:'tools', title:'Tools', vals:P_TOOLS, of:function(p){ return p.tools; }},
    {set:'paxes', title:'Axes', vals:P_AXES, of:function(p){ return p.axes; }},
    {set:'tags', title:'Tags', vals:P_TAGS, of:function(p){ return p.tags; }}
  ];
  function projVisible(p, skip){
    if (pf.arch !== !!p.archived) return false;
    if (pf.fav && !p.star) return false;
    if (pf.feat && !p.featured) return false;
    if (SCOPE_LOC[pf.scope] && p.loc !== SCOPE_LOC[pf.scope]) return false;
    if (pf.q && p.name.toLowerCase().indexOf(pf.q) < 0) return false;
    if (pf.model && p.mmodel.toLowerCase().indexOf(pf.model) < 0) return false;
    for (var i = 0; i < PFACETS.length; i++){
      var f = PFACETS[i];
      if (f.set === skip || !some(pf[f.set])) continue;
      if (!f.of(p).some(function(v){ return pf[f.set][v]; })) return false;
    }
    return true;
  }
  // count for one option, excluding its own facet — honest numbers like in DMC
  function countProj(f, v){
    var n = 0;
    projects.forEach(function(p){
      if (projVisible(p, f.set) && f.of(p).indexOf(v) >= 0) n++;
    });
    return n;
  }
  // ——— horizontal filter row under the toolbar: dropdown buttons per facet,
  // a text input for the machine model, "Clear all" at the end ———
  var pfOpen = '';   // which dropdown is open
  function selKeys(set){
    return Object.keys(pf[set]).filter(function(k){ return pf[set][k]; });
  }
  function totalProjSel(){
    var total = pf.model ? 1 : 0;
    PFACETS.forEach(function(f){ total += selKeys(f.set).length; });
    return total;
  }
  function updateProjBadges(){
    var total = totalProjSel();
    var el = document.getElementById('projFunnelCnt');
    el.hidden = !total;
    el.textContent = total;
  }
  var CHEV = '<svg class="chev" viewBox="0 0 10 6" width="10" height="6" fill="none" ' +
    'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1 1l4 4 4-4"/></svg>';
  function renderFbar(){
    var html = PFACETS.map(function(f){
      var sel = selKeys(f.set);
      // label: value for a single selection, a count for several
      var lbl = f.title + (sel.length === 1 ? ': <b>' + sel[0] + '</b>'
        : sel.length > 1 ? ' <b>(' + sel.length + ')</b>' : '');
      var pop = pfOpen !== f.set ? '' :
        '<div class="fdd-pop">' + f.vals.map(function(v){
          var n = countProj(f, v), on = pf[f.set][v];
          return '<div class="fopt' + (on ? ' on' : '') + (!n && !on ? ' dim' : '') + '"' +
            ' data-pfacet="' + f.set + '" data-v="' + v + '">' +
            '<span class="chk' + (on ? ' on' : '') + '"></span>' +
            '<span class="lb">' + v + '</span><span class="n">' + n + '</span></div>';
        }).join('') + '</div>';
      return '<div class="fdd' + (sel.length ? ' is-active' : '') +
        (pfOpen === f.set ? ' open' : '') + '">' +
        '<button class="fdd-btn" data-dd="' + f.set + '">' + lbl + CHEV + '</button>' +
        pop + '</div>';
    });
    // the machine model input goes right after Machine type, like in the web version
    html.splice(1, 0, '<input class="fps fbar-model" id="projModel" ' +
      'placeholder="Machine model" value="' + pf.model + '">');
    html.push('<button class="fclear" id="projClearAll"' +
      (totalProjSel() ? '' : ' disabled') + '>Clear all</button>');
    document.getElementById('projFbar').innerHTML = html.join('');
    updateProjBadges();
  }
  function applyProjCards(){
    document.querySelectorAll('#projects .card').forEach(function(c, i){
      c.style.display = projVisible(projects[i]) ? '' : 'none';
    });
  }
  function applyProjFilters(){
    applyProjCards();
    renderFbar();
  }
  document.getElementById('projFbar').addEventListener('click', function(e){
    if (e.target.id === 'projClearAll'){
      PFACETS.forEach(function(f){ pf[f.set] = {}; });
      pf.model = '';
      pfOpen = '';
      applyProjFilters();
      return;
    }
    var btn = e.target.closest('.fdd-btn');
    if (btn){
      pfOpen = pfOpen === btn.dataset.dd ? '' : btn.dataset.dd;
      renderFbar();
      return;
    }
    var opt = e.target.closest('.fopt');
    if (opt){
      pf[opt.dataset.pfacet][opt.dataset.v] = !pf[opt.dataset.pfacet][opt.dataset.v];
      applyProjFilters();   // the dropdown stays open — pfOpen is unchanged
    }
  });
  // typing in the model input filters live; the row is not rerendered so focus stays
  document.getElementById('projFbar').addEventListener('input', function(e){
    if (e.target.id !== 'projModel') return;
    pf.model = e.target.value.trim().toLowerCase();
    applyProjCards();
    updateProjBadges();
    document.getElementById('projClearAll').disabled = !totalProjSel();
  });
  // a click anywhere else closes the open dropdown; a rerender detaches the
  // clicked node from the document, so a disconnected target is not "outside"
  document.addEventListener('click', function(e){
    if (pfOpen && e.target.isConnected && !e.target.closest('#projFbar')){
      pfOpen = '';
      renderFbar();
    }
  });
  // the funnel shows/hides the whole filter row; a pressed funnel is the white
  // pill, same as the favorites star
  document.getElementById('projFunnel').addEventListener('click', function(){
    var bar = document.getElementById('projFbar');
    bar.hidden = !bar.hidden;
    this.classList.toggle('active', !bar.hidden);
  });
  document.getElementById('projFbar').hidden = true;   // closed by default
  var scopeSeg = document.querySelector('#area-projects .seg-inner');
  scopeSeg.addEventListener('click', function(e){
    var chip = e.target.closest('.chip');
    if (!chip) return;
    pf.scope = chip.textContent.trim();
    scopeSeg.querySelectorAll('.chip').forEach(function(c){
      c.classList.toggle('active', c === chip);
    });
    applyProjFilters();
  });
  var archChip = document.querySelector('#area-projects .chip.icon[title="Archive"]');
  archChip.addEventListener('click', function(){
    pf.arch = this.classList.toggle('active');
    applyProjFilters();
  });
  var projFav = document.getElementById('projFav');
  projFav.addEventListener('click', function(){
    pf.fav = this.classList.toggle('active');
    this.querySelector('img').src = starImg(pf.fav);
    applyProjFilters();
  });
  var featChip = document.querySelector('#area-projects .tb-group .chip.ghost:not(.icon)');
  featChip.addEventListener('click', function(){
    pf.feat = this.classList.toggle('active');
    applyProjFilters();
  });
  document.querySelector('#area-projects .tb-search input')
    .addEventListener('input', function(){
      pf.q = this.value.trim().toLowerCase();
      applyProjFilters();
    });
  applyProjFilters();   // hide the archived projects on load
})();
