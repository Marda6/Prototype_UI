// License manager — section data and logic.
// The shell (title bar, sidebar, pin, online/offline) lives in ../shared-ui/chrome.js
var app = document.getElementById('app');

// ===== license data =====
// remaining: number of days · null = perpetual · 0 = term expired
// maint: maintenance end date (past = lapsed) · null = no maintenance
// status: 'active' (currently in use) | 'valid' (usable) | 'invalid' (unusable)
// ver: true — the installed ENCY version is newer than the one covered by maintenance
var LICENSES = {
  tblTonini: [
    {id:'#421480', name:'ENCY 5x Mill', remaining:199, type:'Commercial', prot:'account',
     maint:'2027-06-30', status:'active',
     items:['Adaptive','ENCY NB 3 5D','ENCY NB 3D','ENCY NB 3 2D','ENCY NB 3 6D','Disc Roughing',
            'ENCY NB 3 operations','Multichannel','Nesting@trial:23','Robot+@trial:12','Robotic turning',
            'SOLIDWORKS Reader','Spraying/Painting','Teamcenter integration','Turn XZCYB','Welding',
            'Wire EDM@trial:5']},
    {id:'#421481', name:'ENCY 3x Mill Advanced', remaining:null, type:'Commercial', prot:'software',
     maint:'2026-05-30', status:'valid', ver:true,
     items:['Adaptive','ENCY NB 3 5D','ENCY NB 3 2D','Disc Roughing','Multichannel','Nesting']},
    {id:'#421495', name:'ENCY Lathe', remaining:29, type:'Commercial', prot:'account',
     maint:'2026-09-12', status:'valid',
     items:['Turn XZCYB','Robotic turning','Multichannel']},
    {id:'#421502', name:'ENCY Cutting 5D', remaining:159, type:'Education Commercial', prot:'software',
     maint:'2026-12-05', status:'valid',
     items:['Turn part probing','Mill part probing']},
    {id:'#419330', name:'ENCY Rotary', remaining:289, type:'Education', prot:'account',
     maint:'2027-04-02', status:'valid',
     items:['Planar slicing','Spraying/Painting','Welding']},
    {id:'#421520', name:'ENCY 5x Mill Advanced', remaining:412, type:'Commercial', prot:'dongle',
     maint:'2026-09-05', status:'valid',
     items:['Robot+','Robotic turning','Multichannel']},
    {id:'#421533', name:'ENCY Wire EDM', remaining:96, type:'Commercial', prot:'account',
     maint:'2027-02-10', status:'signin',
     items:['Wire EDM','Disc Roughing']},
    {id:'#419355', name:'ENCY 2.5x Mill', remaining:5, type:'Education', prot:'software',
     maint:'2026-06-12', status:'valid',
     items:['Adaptive','Nesting']},
    {id:'#402118', name:'ENCY Cutting', remaining:0, type:'Trial', prot:'software',
     maint:'2026-02-28', status:'invalid',
     items:['Adaptive','ENCY NB 3 2D']}
  ],
  tblEncySoft: [
    {id:'#462785', name:'ENCY 5x Mill Advanced', remaining:341, type:'Commercial', prot:'software',
     maint:'2027-09-10', status:'valid',
     items:['Adaptive','ENCY NB 3 5D','ENCY NB 3 6D','Multichannel','Nesting','Robot+','Wire EDM']},
    {id:'#462790', name:'ENCY 3x Mill', remaining:null, type:'Commercial', prot:'software',
     maint:null, status:'valid',
     items:['SOLIDWORKS Reader','Teamcenter integration']},
    {id:'#462812', name:'ENCY Cutting', remaining:17, type:'Education Commercial', prot:'software',
     maint:'2026-09-04', status:'valid',
     items:['Nesting','Disc Roughing']}
  ],
  tblExt: [
    {id:'#530114', name:'DMG MORI NLX 2500', remaining:199, type:'Machine', prot:'dongle',
     maint:'2027-06-30', status:'valid', items:['Turn XZCYB','Multichannel','Robotic turning']},
    {id:'#530115', name:'Haas VF-2SS', remaining:199, type:'Machine', prot:'dongle',
     maint:'2027-06-30', status:'valid', items:['ENCY NB 3 2D','ENCY NB 3 5D']},
    {id:'#530142', name:'Fanuc 31i · Mill 5X', remaining:null, type:'Post', prot:'dongle',
     maint:null, status:'valid', items:['Mill 5X post','Mill 3X post','Drill post']},
    {id:'#530143', name:'Siemens 840D · Turn', remaining:29, type:'Post', prot:'account',
     maint:'2026-09-12', status:'valid', items:['Turn post','Turn-mill post']},
    {id:'#530190', name:'Adaptive roughing', remaining:159, type:'Operation', prot:'dongle',
     maint:'2026-12-05', status:'valid', items:['Adaptive']},
    {id:'#530191', name:'Planar slicing', remaining:0, type:'Operation', prot:'dongle',
     maint:'2026-03-15', status:'invalid', items:['Planar slicing']},
    {id:'#530220', name:'Aerospace pack', remaining:289, type:'Extension', prot:'dongle',
     maint:'2027-04-02', status:'valid',
     items:['Adaptive','ENCY NB 3 5D','ENCY NB 3 6D','Disc Roughing','Multichannel','Nesting','Robot+',
            'SOLIDWORKS Reader','Teamcenter integration','Wire EDM','Welding','Turn XZCYB']},
    // interpreters — reading machine NC programs back into ENCY
    {id:'#530301', name:'Fanuc 0i · interpreter', remaining:199, type:'Interpreter', prot:'dongle',
     maint:'2027-06-30', status:'valid', items:['Mill cycles','Drill cycles','Subprograms']},
    {id:'#530302', name:'Heidenhain TNC 640 · interpreter', remaining:null, type:'Interpreter',
     prot:'software', maint:'2026-09-08', status:'valid', items:['Plain text cycles','Q-parameters']},
    {id:'#530303', name:'Siemens 840D · interpreter', remaining:0, type:'Interpreter', prot:'account',
     maint:'2026-04-22', status:'invalid', items:['ShopTurn','ShopMill']}
  ]
};

// ===== row rendering =====
(function(){
  var PROT = {account:'Account', software:'Software', dongle:'Dongle'},
      // active — the license the current session runs under: same wording as in the card
      STATUS = {active:'Current', valid:'Valid', invalid:'Invalid', signin:'Sign in required'},
      SOON = 30;                      // days remaining that already count as "soon"

  // maintenance is also counted in days — same as the license term
  var TODAY = '2026-08-14';
  function maintDays(d){
    if (!d) return null;
    return Math.round((new Date(d) - new Date(TODAY)) / 86400000);
  }
  function maintPast(d){ var n = maintDays(d); return n !== null && n <= 0; }
  function maintSoon(d){ var n = maintDays(d); return n !== null && n > 0 && n <= SOON; }

  // Maintenance cell: days until maintenance ends, Expired — once it has lapsed
  function maintCell(l){
    var n = maintDays(l.maint);
    if (n === null)  return '<span class="xnum">—</span>';
    if (n <= 0)      return '<span class="xnum"><span class="v bad">Expired</span></span>';
    return '<span class="xnum' + (n <= SOON ? ' warn' : '') + '">' + n + ' days</span>';
  }

  // dedicated activation column: enable a license or release the active one
  function useCell(l){
    if (l.status === 'active')  return '<button class="xd-btn rel">Release</button>';
    if (l.status === 'signin')  return '<button class="xd-btn">Sign in</button>';
    if (l.status === 'valid')   return '<button class="xd-btn uset">Activate</button>';
    return '';                      // an expired one cannot be activated
  }

  // "⋮" — only offers and requests; empty when there is nothing to offer
  function menuCell(l){
    var menu = [];
    if (maintPast(l.maint) || maintSoon(l.maint)) menu.push('Renew maintenance');
    if (maintPast(l.maint) && l.ver)              menu.push('Revert to compatible version');
    if (l.status === 'invalid') menu.push('Request renewal', 'Get a quote');
    else if (l.remaining !== null && l.remaining <= SOON) menu.push('Request renewal');
    if (!menu.length) return '';
    return '<span class="ibtn ibtn-sm" data-more title="More">' +
      '<svg viewBox="0 0 16 16" fill="currentColor">' +
      '<circle cx="8" cy="3.5" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="12.5" r="1.2"/>' +
      '</svg></span><div class="menu" hidden>' +
      menu.map(function(m){ return '<span class="mitem">' + m + '</span>'; }).join('') +
      '</div>';
  }

  function remainingCell(l){
    if (l.remaining === null) return '<span class="v">Perpetual</span>';
    if (l.remaining === 0)    return '<span class="v bad">Expired</span>';
    var cls = l.remaining <= SOON ? ' warn' : '';
    return '<span class="v' + cls + '">' + l.remaining + ' days</span>';
  }

  function row(l){
    // data-status is used by the filter, data-prot by the offline mode
    // "expired" refers to the license's own term; exactly these rows are hidden by default
    var filter = l.remaining === 0 ? 'expired'
               : (l.remaining !== null && l.remaining <= SOON ? 'expiring' : 'active');
    return '<div class="lgrid xrow' + (l.status === 'active' ? ' inuse' : '') + '"' +
      ' data-prot="' + l.prot + '" data-status="' + filter + '"' +
      ' data-kind="' + (l.type || '').toLowerCase() + '">' +
      '<span class="xnum">' + l.id + '</span>' +
      '<span class="xprod" data-items="' + l.items.join('|') + '">' +
        '<span class="xname">' + l.name + '</span></span>' +
      '<span class="xnum">' + remainingCell(l) +
        '<span class="xoff">No connection</span></span>' +
      '<span class="xdim">' + l.type + '</span>' +
      '<span class="xdim">' + PROT[l.prot] + '</span>' +
      maintCell(l) +
      '<span class="xstate st-' + l.status + '">' +
        '<span class="v">' + STATUS[l.status] + '</span>' +
        '<span class="xsign">Sign in required</span></span>' +
      '<span class="ucell">' + useCell(l) + '</span>' +
      '<span class="mcell">' + menuCell(l) + '</span>' +
    '</div>';
  }

  Object.keys(LICENSES).forEach(function(id){
    var box = document.getElementById(id);
    if (box) box.insertAdjacentHTML('beforeend', LICENSES[id].map(row).join(''));
  });
})();



// Software licenses / Extensions tabs
var pages = {
  licenses: document.getElementById('page-licenses'),
  containers: document.getElementById('page-containers')
};
document.querySelectorAll('.ph-tab').forEach(function(t){
  t.addEventListener('click', function(){
    document.querySelectorAll('.ph-tab').forEach(function(x){ x.classList.remove('active'); });
    t.classList.add('active');
    Object.keys(pages).forEach(function(k){ pages[k].hidden = k !== t.dataset.page; });
  });
});

// list filters: segment (status or kind) + a "show expired" switch.
// Single pass: compute row visibility, then update segment and group counters.
(function(){
  var pages = document.querySelectorAll(".page");

  function matches(row, filter, showExp){
    if (!showExp && row.dataset.status === "expired") return false;
    if (!filter) return true;
    var p = filter.split(":");
    return row.dataset[p[0]] === p[1];
  }

  function apply(){
    var showExp = app.classList.contains("showexp");
    pages.forEach(function(page){
      var seg = page.querySelector(".seg"),
          active = seg ? seg.querySelector(".sitem.active") : null,
          filter = active ? active.dataset.filter : "",
          rows = page.querySelectorAll(".xrow");

      rows.forEach(function(r){
        r.classList.toggle("hid", !matches(r, filter, showExp));
      });

      // each segment's counter — how many rows it would show
      if (seg) seg.querySelectorAll(".sitem").forEach(function(it){
        var n = [].filter.call(rows, function(r){
          return matches(r, it.dataset.filter, showExp);
        }).length;
        it.querySelector(".cnt").textContent = n;
      });

      // the licensee group's counter — based on its table's visible rows
      page.querySelectorAll(".lsee").forEach(function(l){
        var table = l.nextElementSibling, out = l.querySelector(".n");
        if (!table || !out) return;
        var n = [].filter.call(table.querySelectorAll(".xrow"), function(r){
          return !r.classList.contains("hid");
        }).length;
        out.textContent = n + (n === 1 ? " license" : " licenses");
      });
    });
  }

  document.querySelectorAll(".seg").forEach(function(seg){
    seg.querySelectorAll(".sitem").forEach(function(it){
      it.addEventListener("click", function(){
        seg.querySelectorAll(".sitem").forEach(function(x){ x.classList.remove("active"); });
        it.classList.add("active");
        apply();
      });
    });
  });

  var switches = document.querySelectorAll(".tchk[data-exp]");
  switches.forEach(function(sw){
    sw.addEventListener("click", function(){
      var on = !app.classList.contains("showexp");
      app.classList.toggle("showexp", on);
      switches.forEach(function(x){
        x.classList.toggle("on", on);
        x.querySelector(".sw").classList.toggle("on", on);
      });
      apply();
    });
  });

  apply();
})();



// right toolbar group: actions menu and refreshing license data
(function(){
  function closeAll(){
    document.querySelectorAll('.menu').forEach(function(m){ m.hidden = true; });
    document.querySelectorAll('.ibtn[data-more]').forEach(function(b){ b.classList.remove('on'); });
  }
  document.querySelectorAll('.ibtn[data-more]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var menu = b.parentNode.querySelector('.menu'), open = menu.hidden;
      closeAll();
      menu.hidden = !open;
      b.classList.toggle('on', open);
    });
  });
  document.addEventListener('click', closeAll);
  document.querySelectorAll('.menu').forEach(function(m){
    m.addEventListener('click', function(e){ e.stopPropagation(); });
    m.querySelectorAll('.mitem').forEach(function(i){
      i.addEventListener('click', function(){ closeAll(); });
    });
  });

  // refresh: the prototype only shows the loading state
  document.querySelectorAll('.ibtn[data-refresh]').forEach(function(b){
    b.addEventListener('click', function(){
      if (b.classList.contains('spin')) return;
      b.classList.add('spin');
      setTimeout(function(){ b.classList.remove('spin'); }, 1200);
    });
  });
})();

// activation applies after ENCY restarts: the current license stays Active,
// the selected one gets a Pending restart status and a cancel button
(function(){
  var bar = document.getElementById('rbar');
  if (!bar) return;
  var rid = bar.querySelector('.rid'), pending = null, prevText = '';

  function setState(row, cls, text){
    var cell = row.querySelector('.xstate');
    cell.className = 'xstate ' + cls;
    cell.querySelector('.v').textContent = text;
  }

  function clear(){
    if (!pending) return;
    setState(pending, 'st-valid', prevText);
    pending.querySelector('.ucell').innerHTML = '<button class="xd-btn uset">Activate</button>';
    bind(pending);
    pending = null;
    bar.hidden = true;
  }

  function activate(row){
    if (pending === row) return;
    clear();
    prevText = row.querySelector('.xstate .v').textContent;
    pending = row;
    setState(row, 'st-pending', 'Pending restart');
    row.querySelector('.ucell').innerHTML =
      '<button class="xd-btn rel canc" title="Keep using the current license">Cancel</button>';
    row.querySelector('.canc').addEventListener('click', clear);
    rid.textContent = row.querySelector('.xnum').textContent;
    bar.hidden = false;
  }

  function bind(row){
    var b = row.querySelector('.uset');
    if (b) b.addEventListener('click', function(){ activate(row); });
  }

  document.querySelectorAll('#page-licenses .xrow').forEach(bind);
})();

// The module list starts on the same vertical as the Package column: the Included
// label width is fitted to that offset, but never smaller than its own content.
function syncModLabels(){
  var card = document.querySelector('.cur'),
      lbl = document.querySelector('.cur-mods > .lbl'),
      pkgGrp = document.querySelectorAll('.cur-meta .grp')[1];
  if (!card || !lbl || !pkgGrp) return;
  card.style.setProperty('--lblw', 'auto');
  var natural = lbl.getBoundingClientRect().width,
      gap = parseFloat(getComputedStyle(lbl.parentNode).gap) || 12,
      want = pkgGrp.getBoundingClientRect().left - lbl.getBoundingClientRect().left - gap;
  card.style.setProperty('--lblw', Math.ceil(Math.max(natural, want)) + 'px');
}
window.addEventListener('resize', syncModLabels);

// ===== license contents and Upgrade mode =====
// One Included list: the license's permanent modules plus the upgrade modules.
// Upgrade modules are accent-marked and run as a trial — the shared term is shown by the name.
(function(){
  var btn = document.getElementById('upgBtn'),
      card = document.querySelector('.cur'),
      box = document.querySelector('.cur-mods');
  if (!btn || !box) return;

  var list = box.querySelector('.mods'),
      counter = box.querySelector('.n'),
      LIMIT = 10, open = false;

  // the license's permanent modules — they cannot be removed
  var BASE = box.dataset.items.split('|').filter(Boolean)
        .filter(function(i){ return i.indexOf('@trial:') === -1; });

  // modules already granted as a trial — this is the active upgrade
  var GRANTED = box.dataset.items.split('|')
        .filter(function(i){ return i.indexOf('@trial:') > -1; })
        .map(function(i){ return i.split('@trial:')[0]; }),
      GRANTED_DAYS = box.dataset.items.split('|')
        .filter(function(i){ return i.indexOf('@trial:') > -1; })
        .map(function(i){ return +i.split('@trial:')[1]; });

  // catalog of what the license doesn't have
  var CATALOG = ['5-axis Simultaneous', 'Swiss turning', 'Probing', 'Nesting Advanced',
                 'Robot calibration', 'Toolpath verification', 'Feature recognition'];

  // ENCY product packages by seniority: highest first
  var PACKAGES = ['5x Mill Advanced', '5x Mill', 'Rotary', '3x Mill Advanced', '3x Mill',
                  '2.5x Mill', 'Cutting 5D', 'Cutting', 'Lathe', 'Wire EDM'],
      CUR_PKG = '5x Mill',
      TRIAL_DAYS = 30;

  // saved — the upgrade running as a trial; draft — edits in Upgrade mode;
  // trial — the shared trial term, edits don't extend it
  var saved = {pkg: CUR_PKG, mods: GRANTED.slice()},
      trial = GRANTED_DAYS.length ? Math.max.apply(null, GRANTED_DAYS) : null,
      draft = null,
      sent = false;

  var pkgVal = document.getElementById('pkgVal'),
      pkgBtn = document.getElementById('pkgBtn'),
      utrial = document.getElementById('utrial'),
      reqBtn = document.getElementById('reqBtn'),
      editSum = document.getElementById('reqSum'),
      cancelBtn = document.getElementById('upgCancel'),
      resetBtn = document.getElementById('upgReset'),
      sentRow = document.getElementById('curSent'),
      undoBtn = document.getElementById('reqUndo');

  var pop = document.createElement('div');
  pop.className = 'xpop'; pop.hidden = true;
  document.body.appendChild(pop);

  function closePop(){ pop.hidden = true; }
  document.addEventListener('click', closePop);
  pop.addEventListener('click', function(e){ e.stopPropagation(); });

  function mode(){ return !!draft; }
  function cur(){ return draft || saved; }
  function free(){
    var taken = BASE.concat(cur().mods);
    return CATALOG.concat(GRANTED).filter(function(m){ return taken.indexOf(m) === -1; });
  }
  function dirty(){
    var a = cur();
    return a.pkg !== saved.pkg || a.mods.join('|') !== saved.mods.join('|');
  }

  // ——— dropdown lists ———
  function place(anchorEl){
    var r = anchorEl.getBoundingClientRect();
    pop.hidden = false;
    pop.style.top = Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 8) + 'px';
    pop.style.left = Math.min(r.left, window.innerWidth - pop.offsetWidth - 8) + 'px';
  }

  function openMods(anchorEl){
    var f = free();
    if (!f.length) { closePop(); return; }
    pop.innerHTML = f.map(function(m){
      return '<div class="it" data-mod="' + m + '">' + m + '</div>';
    }).join('');
    place(anchorEl);
    pop.querySelectorAll('.it').forEach(function(it){
      it.addEventListener('click', function(){
        draft.mods.push(it.dataset.mod);
        closePop(); render();
      });
    });
  }

  // packages: the current one is checked, lower ones are unavailable — upgrades go up only
  function openPkg(){
    var base = PACKAGES.indexOf(CUR_PKG), now = PACKAGES.indexOf(draft.pkg);
    pop.innerHTML = PACKAGES.map(function(p, i){
      var cls = i === now ? 'it cur-it' : (i > base ? 'it off' : 'it');
      return '<div class="' + cls + '" data-pkg="' + p + '">' + (i === now ? '✓ ' : '') + p + '</div>';
    }).join('');
    place(pkgBtn);
    pop.querySelectorAll('.it:not(.off)').forEach(function(it){
      it.addEventListener('click', function(){ draft.pkg = it.dataset.pkg; closePop(); render(); });
    });
  }

  function rmBtn(name){
    return '<button class="rm" data-mod="' + name + '" title="Remove">' +
      '<svg viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round"><path d="M1 1l6 6M7 1L1 7"/></svg></button>';
  }

  // ——— rendering ———
  function render(){
    var m = mode(), s = cur();

    card.classList.toggle('upg', m);
    btn.classList.toggle('on', m);

    // package: outside the mode — the active one, in the mode — a picker with the current struck out
    var pkgHtml = s.pkg === CUR_PKG ? CUR_PKG :
      '<span class="pkg-new">' + s.pkg + '</span>';
    pkgVal.innerHTML = pkgHtml;
    pkgVal.hidden = m;
    pkgBtn.hidden = !m;
    pkgBtn.querySelector('.cu').innerHTML = pkgHtml;

    // one list: permanent modules collapse, upgrade modules are always visible
    counter.textContent = BASE.length + s.mods.length;
    var shown = open ? BASE : BASE.slice(0, LIMIT);
    list.innerHTML = '';

    // "+" always comes first — no need to hunt for it in the list
    if (m && free().length) {
      var add = document.createElement('button');
      add.className = 'mod-add';
      add.innerHTML = '<span>+</span><span>Add module</span>';
      add.addEventListener('click', function(e){ e.stopPropagation(); openMods(add); });
      list.appendChild(add);
    }

    // upgrade modules come next: always visible even when the list is collapsed,
    // and only they get the remove cross — the license's permanent modules can't be removed
    list.insertAdjacentHTML('beforeend', s.mods.map(function(name){
      return '<span class="mod upg">' + name + (m ? rmBtn(name) : '') + '</span>';
    }).join(''));

    list.insertAdjacentHTML('beforeend',
      shown.map(function(i){ return '<span class="mod">' + i + '</span>'; }).join(''));

    if (BASE.length > LIMIT) {
      var more = document.createElement('button');
      more.className = 'mod-more';
      more.textContent = open ? 'Show less' : '+' + (BASE.length - LIMIT) + ' more';
      more.addEventListener('click', function(){ open = !open; render(); });
      list.appendChild(more);
    }
    list.querySelectorAll('.rm').forEach(function(b){
      b.addEventListener('click', function(){
        draft.mods = draft.mods.filter(function(x){ return x !== b.dataset.mod; });
        render();
      });
    });

    // the shared trial term — until the upgrade is formalized
    utrial.hidden = trial === null || !(saved.mods.length || saved.pkg !== CUR_PKG);
    if (trial !== null) utrial.textContent = 'Upgrade trial · ' + trial + ' d left';

    // change summary — in the header, to the left of Cancel
    var parts = [];
    if (m) {
      if (s.pkg !== saved.pkg) parts.push('Package ' + saved.pkg + ' → ' + s.pkg);
      var added = s.mods.filter(function(n){ return saved.mods.indexOf(n) === -1; }),
          gone = saved.mods.filter(function(n){ return s.mods.indexOf(n) === -1; });
      if (added.length) parts.push('+' + added.length + (added.length === 1 ? ' module' : ' modules'));
      if (gone.length) parts.push('−' + gone.length + (gone.length === 1 ? ' module' : ' modules'));
    }
    // the text goes into the icon's tooltip so it doesn't take up the row
    editSum.dataset.tip = parts.length
      ? parts.join(' · ') + (trial === null ? ' · trial starts on save'
                                           : ' · trial period is not extended')
      : 'Pick a higher package or add modules — you get them on trial before requesting.';
    editSum.hidden = !m;
    cancelBtn.hidden = !m;
    sentRow.hidden = !sent || m;

    // the upgrade reset is visible when there is something to roll back, and only outside edit mode
    resetBtn.hidden = !(saved.mods.length || saved.pkg !== CUR_PKG) || m;

    // the same button: entering the mode and saving the set
    btn.textContent = m ? 'Save changes' : 'Upgrade';
    btn.disabled = m && !dirty();

    // a request is possible while there is something to formalize, and only for the saved set
    reqBtn.hidden = !(saved.mods.length || saved.pkg !== CUR_PKG) || m;
    reqBtn.disabled = sent;
    reqBtn.textContent = sent ? 'Requested' : 'Request upgrade';

    // the Included label width depends on the meta row — recalculated after rendering
    syncModLabels();
  }

  // ——— actions ———
  // Upgrade opens the edit mode; in the mode the same button saves the set:
  // saving starts the trial, an already running term is not extended
  btn.addEventListener('click', function(){
    if (mode()) {
      if (trial === null) trial = TRIAL_DAYS;
      saved = {pkg: draft.pkg, mods: draft.mods.slice()};
      draft = null; sent = false; closePop();
    } else {
      draft = {pkg: saved.pkg, mods: saved.mods.slice()};
    }
    render();
  });

  pkgBtn.addEventListener('click', function(e){ e.stopPropagation(); openPkg(); });
  cancelBtn.addEventListener('click', function(){ draft = null; closePop(); render(); });

  // reset: the license returns to its original package and contents, the trial ends
  resetBtn.addEventListener('click', function(){
    saved = {pkg: CUR_PKG, mods: []};
    trial = null; draft = null; sent = false; closePop();
    render();
  });

  reqBtn.addEventListener('click', function(){ sent = true; render(); });
  undoBtn.addEventListener('click', function(){ sent = false; render(); });

  render();
})();
// the product's "+N" chip: the number of nested modules, hover shows their list
(function(){
  var pop = document.createElement('div');
  pop.className = 'xpop'; pop.hidden = true;
  document.body.appendChild(pop);
  var hideTimer = null;

  function show(chip, items){
    clearTimeout(hideTimer);
    pop.innerHTML = items.map(function(i){
      return '<div class="it">' + i + '</div>';
    }).join('');
    pop.hidden = false;
    // the panel hugs the chip and doesn't overflow the window
    var r = chip.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    var top = Math.min(r.bottom + 4, window.innerHeight - h - 8);
    var left = Math.min(r.left, window.innerWidth - w - 8);
    pop.style.top = Math.max(8, top) + 'px';
    pop.style.left = Math.max(8, left) + 'px';
  }
  function hide(){ hideTimer = setTimeout(function(){ pop.hidden = true; }, 120); }
  pop.addEventListener('mouseenter', function(){ clearTimeout(hideTimer); });
  pop.addEventListener('mouseleave', hide);

  document.querySelectorAll('.xprod[data-items]').forEach(function(cell){
    var items = cell.dataset.items.split('|').filter(Boolean);
    if (!items.length) return;
    var chip = document.createElement('span');
    chip.className = 'xcnt';
    chip.textContent = '+' + items.length;
    chip.title = items.length + ' modules';
    cell.appendChild(chip);
    chip.addEventListener('mouseenter', function(){ show(chip, items); });
    chip.addEventListener('mouseleave', hide);
  });
})();
