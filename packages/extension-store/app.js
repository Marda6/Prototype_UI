// Extension Store — section logic.
// The shell (title bar, sidebar, pin, online/offline) lives in ../shared-ui/chrome.js
var app = document.getElementById("app");

document.querySelectorAll('.cstar').forEach(function(s){
  s.addEventListener('click', function(e){
    e.stopPropagation();
    var faved = s.classList.toggle('faved');
    s.querySelector('img').src = faved ? '../shared-ui/assets/st-star16-filled.svg' : '../shared-ui/assets/st-star16.svg';
  });
});

// installation: progress on the divider + percentage on the button
document.querySelectorAll('.cinstall').forEach(function(b){
  b.addEventListener('click', function(e){
    e.stopPropagation();
    if (b.dataset.state || b.textContent !== 'Install') return;
    b.dataset.state = 'installing';
    var card = b.closest('.card');
    card.classList.add('installing');
    var p = 0;
    var timer = setInterval(function(){
      p += Math.random() * 7 + 3;
      if (p >= 100) {
        clearInterval(timer);
        card.style.setProperty('--p', '100%');
        b.innerHTML = '<svg class="ok" viewBox="0 0 12 12" fill="none" stroke="currentColor" ' +
          'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M2.5 6.3 4.8 8.6 9.5 3.9"/></svg>Installed';
        b.classList.add('done');
        b.dataset.state = 'done';
        setTimeout(function(){
          card.classList.remove('installing');
          card.style.removeProperty('--p');
        }, 600);
      } else {
        card.style.setProperty('--p', Math.round(p) + '%');
        b.textContent = Math.round(p) + '%';
      }
    }, 120);
  });
});

// ===== Store: filter panel =====
(function(){
  var panel = document.getElementById('fpanel'),
      funnel = document.querySelector('.btn-funnel'),
      cards = [].slice.call(document.querySelectorAll('.grid .card')),
      tagList = document.getElementById('fTagList'),
      tagQ = document.getElementById('fTagQ'),
      tagEmpty = document.getElementById('fTagEmpty'),
      tagCnt = document.getElementById('fTagCnt'),
      pubSel = document.getElementById('fPub'),
      resetBtn = document.getElementById('fReset'),
      state = { cat:'', price:'', pub:'', tags:[] };

  // collect tags from the cards with frequency — this way the list scales to any tag count
  var freq = {};
  cards.forEach(function(c){
    (c.dataset.tags || '').split(',').filter(Boolean).forEach(function(t){
      var k = t.trim(); if (!k) return;
      freq[k.toLowerCase()] = freq[k.toLowerCase()] || { label:k, n:0 };
      freq[k.toLowerCase()].n++;
    });
  });
  var tags = Object.keys(freq).map(function(k){ return { key:k, label:freq[k].label, n:freq[k].n }; })
    .sort(function(a,b){ return b.n - a.n || a.label.localeCompare(b.label); });
  tagCnt.textContent = tags.length;

  tags.forEach(function(t){
    var el = document.createElement('div');
    el.className = 'ftag'; el.dataset.tag = t.key;
    el.innerHTML = '<span class="chk"></span><span class="lb">' + t.label +
      '</span><span class="n">' + t.n + '</span>';
    el.addEventListener('click', function(){ toggleTag(t.key); });
    tagList.appendChild(el);
  });

  function toggleTag(k){
    var i = state.tags.indexOf(k);
    if (i > -1) state.tags.splice(i,1); else state.tags.push(k);
    renderTags(); apply();
  }

  function renderTags(){
    var q = tagQ.value.trim().toLowerCase(), matched = 0,
        items = [].slice.call(tagList.children);
    // selected ones are moved to the top so they don't get lost in a long list
    items.slice().reverse().forEach(function(el){
      if (state.tags.indexOf(el.dataset.tag) > -1) tagList.insertBefore(el, tagList.firstChild);
    });
    [].slice.call(tagList.children).forEach(function(el){
      var k = el.dataset.tag,
          picked = state.tags.indexOf(k) > -1,
          hit = !q || k.indexOf(q) > -1;
      el.classList.toggle('on', picked);
      el.querySelector('.chk').classList.toggle('on', picked);
      el.hidden = !hit;
      if (hit) matched++;
    });
    tagEmpty.hidden = matched > 0 || !q;
  }

  function apply(){
    resetBtn.disabled = !(state.cat || state.price || state.pub || state.tags.length);
    cards.forEach(function(c){
      var ct = (c.dataset.tags || '').toLowerCase().split(',').map(function(s){ return s.trim(); }),
          ok = (!state.cat   || c.dataset.cat === state.cat)
            && (!state.price || c.dataset.price === state.price)
            && (!state.pub   || c.dataset.pub === state.pub)
            && state.tags.every(function(t){ return ct.indexOf(t) > -1; });
      c.hidden = !ok;
    });
  }

  // the Category radio and the Price segment share one "pick one of a group" logic
  document.querySelectorAll('.fopt, .fseg .fs').forEach(function(o){
    o.addEventListener('click', function(){
      var f = o.dataset.f;
      document.querySelectorAll('[data-f="' + f + '"]').forEach(function(x){ x.classList.remove('on'); });
      o.classList.add('on');
      state[f] = o.dataset.v;
      apply();
    });
  });
  pubSel.addEventListener('change', function(){ state.pub = pubSel.value; apply(); });
  tagQ.addEventListener('input', renderTags);
  funnel.addEventListener('click', function(){
    panel.hidden = !panel.hidden;
    funnel.classList.toggle('on', !panel.hidden);
  });
  resetBtn.addEventListener('click', function(){
    if (resetBtn.disabled) return;
    state = { cat:'', price:'', pub:'', tags:[] };
    tagQ.value = ''; pubSel.value = '';
    clearPicks();
    renderTags(); apply();
  });

  // return all groups to the "All" position
  function clearPicks(){
    document.querySelectorAll('.fopt, .fseg .fs').forEach(function(x){
      x.classList.toggle('on', x.dataset.v === '');
    });
  }

  renderTags();

  // external entry point: show the Store filtered by a single tag
  window.storeFilterByTag = function(tag){
    var k = String(tag).trim().toLowerCase();
    if (!freq[k]) return false;
    state = { cat:'', price:'', pub:'', tags:[k] };
    tagQ.value = ''; pubSel.value = '';
    clearPicks();
    panel.hidden = false; funnel.classList.add('on');
    renderTags(); apply();
    return true;
  };
})();

// Store / Manage tabs
var pages = {
  store: document.getElementById('page-store'),
  manage: document.getElementById('page-manage'),
  detail: document.getElementById('dWrap')
};
document.querySelectorAll('.ph-tab').forEach(function(t){
  t.addEventListener('click', function(){
    document.querySelectorAll('.ph-tab').forEach(function(x){ x.classList.remove('active'); });
    t.classList.add('active');
    pages.detail.hidden = true;
    pages.store.hidden = t.dataset.page !== 'store';
    pages.manage.hidden = t.dataset.page !== 'manage';
  });
});

// ===== extension view: opened from a card, carousel, back navigation =====
(function(){
  var d = pages.detail,
      track = document.getElementById('dGalTrack'),
      thumbs = document.getElementById('dGalThumbs'),
      cnt = document.getElementById('dGalCnt'),
      prev = document.getElementById('dGalPrev'),
      next = document.getElementById('dGalNext'),
      shots = [], idx = 0;

  // carousel: an array of screenshot paths; navigation is hidden for a single frame
  function setShots(list, fallbackBg){
    shots = list.slice(); idx = 0;
    track.innerHTML = ''; thumbs.innerHTML = '';
    if (!shots.length){                       // no screenshots — colored category placeholder
      var ph = document.createElement('div');
      ph.className = 'dgal-slide'; ph.style.background = fallbackBg;
      track.appendChild(ph);
    }
    shots.forEach(function(src, i){
      var s = document.createElement('div');
      s.className = 'dgal-slide';
      s.innerHTML = '<img src="' + src + '" alt="">';
      track.appendChild(s);

      var t = document.createElement('div');
      t.className = 'dgal-th' + (i ? '' : ' on');
      t.innerHTML = '<img src="' + src + '" alt="">';
      t.addEventListener('click', function(){ go(i); });
      thumbs.appendChild(t);
    });
    go(0);
  }

  function go(i){
    var n = Math.max(shots.length, 1);
    idx = Math.min(Math.max(i, 0), n - 1);
    track.style.transform = 'translateX(' + (-idx * 100) + '%)';
    cnt.textContent = (idx + 1) + ' / ' + n;
    cnt.hidden = n < 2;
    prev.disabled = idx === 0;
    next.disabled = idx >= n - 1;
    [].slice.call(thumbs.children).forEach(function(t, j){ t.classList.toggle('on', j === idx); });
  }
  prev.addEventListener('click', function(){ go(idx - 1); });
  next.addEventListener('click', function(){ go(idx + 1); });
  document.addEventListener('keydown', function(e){
    if (d.hidden) return;
    if (e.key === 'ArrowLeft') go(idx - 1);
    if (e.key === 'ArrowRight') go(idx + 1);
    if (e.key === 'Escape') back();
  });

  document.querySelectorAll('.grid .card').forEach(function(c){
    c.addEventListener('click', function(e){
      // clicks on buttons inside the card don't open the page
      if (e.target.closest('.cinstall, .cstar')) return;
      var pub = c.dataset.pub,
          ver = (c.querySelector('.cpub').textContent.match(/v\d+(?:\.\d+)*(?:-[a-z]+(?:\.\d+)?)?/i) || ['v1.0.0'])[0],
          cover = c.querySelector('.cover');

      var title = c.querySelector('.ctitle').textContent,
          dls = (c.querySelector('.cdl .n') || {}).textContent || '—',
          price = c.dataset.price === 'paid' ? 'Paid' : 'Free';
      document.getElementById('dTitle').textContent = title;
      document.getElementById('dCap').textContent = title;
      var cat = document.getElementById('dCat');
      cat.textContent = c.dataset.cat; cat.dataset.cat = c.dataset.cat;
      document.getElementById('dBy').textContent = pub;
      document.getElementById('dVer').textContent = ver;
      document.getElementById('dDl').innerHTML =
        '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="0.9">' +
        '<path d="M5 1v5.5M2.5 4.2 5 6.7l2.5-2.5M1.5 9h7"/></svg>' + dls;
      document.getElementById('dPrice').textContent = price;
      document.getElementById('dSum').textContent = c.querySelector('.cdesc').textContent;
      var av = c.querySelector('.cav img');
      if (av) document.querySelector('#dAv img').src = av.getAttribute('src');

      var tw = d.querySelector('.dtags');
      tw.innerHTML = '';
      (c.dataset.tags || '').split(',').filter(Boolean).forEach(function(t){
        var s = document.createElement('span'), name = t.trim();
        s.className = 'dtag'; s.textContent = name;
        s.title = 'Show extensions tagged "' + name + '"';
        // clicking a tag returns to the Store filtered by that tag
        s.addEventListener('click', function(){
          back();
          if (window.storeFilterByTag) window.storeFilterByTag(name);
        });
        tw.appendChild(s);
      });

      // screenshots come from the card's data-shots ("a.png|b.png"), otherwise the placeholder
      var list = (c.dataset.shots || '').split('|').filter(Boolean);
      setShots(list, getComputedStyle(cover).background);

      // the window opens over the catalog — the Store stays underneath
      d.hidden = false;
      d.querySelector('.dscroll').scrollTop = 0;
      about.classList.remove('open');
      moreBtn.textContent = 'Read more';
      moreBtn.hidden = about.scrollHeight <= about.clientHeight;
    });
  });

  function back(){ d.hidden = true; }
  document.getElementById('dBack').addEventListener('click', back);
  d.addEventListener('click', function(e){ if (e.target === d) back(); });

  // "Read more" — description expansion
  var about = document.getElementById('dAbout'),
      moreBtn = document.getElementById('dAboutMore');
  moreBtn.addEventListener('click', function(){
    var open = about.classList.toggle('open');
    moreBtn.textContent = open ? 'Show less' : 'Read more';
  });

  document.getElementById('dCopyLink').addEventListener('click', function(){
    var url = 'ency://store/' + document.getElementById('dCap').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
  });
})();

// row selection in the Installed table
document.querySelectorAll('.xrow').forEach(function(r){
  r.addEventListener('click', function(){
    document.querySelectorAll('.xrow').forEach(function(x){ x.classList.remove('sel'); });
    r.classList.add('sel');
  });
});

// copying the path from a cell; buttons in the row don't change the selection
document.querySelectorAll('.xrow .xcopy').forEach(function(b){
  b.addEventListener('click', function(e){
    e.stopPropagation();
    var p = b.closest('.xrow').dataset.path || '';
    if (navigator.clipboard) navigator.clipboard.writeText(p);
    b.style.color = 'var(--st-green)';
    setTimeout(function(){ b.style.color = ''; }, 800);
  });
});
document.querySelectorAll('.xrow .xact .xd-btn').forEach(function(b){
  b.addEventListener('click', function(e){ e.stopPropagation(); });
});

// feed toggles (Enable/Disable in Actions)
document.querySelectorAll('[data-feedtgl]').forEach(function(t){
  t.addEventListener('click', function(e){
    e.stopPropagation();
    t.textContent = t.textContent === 'Disable' ? 'Enable' : 'Disable';
  });
});

// Add feed modal
var feedOverlay = document.getElementById('feedOverlay');
function closeFeedOverlay(){ feedOverlay.hidden = true; }
document.getElementById('addFeedBtn').addEventListener('click', function(){ feedOverlay.hidden = false; });
document.getElementById('ffCancel').addEventListener('click', closeFeedOverlay);
document.getElementById('ffClose').addEventListener('click', closeFeedOverlay);
feedOverlay.addEventListener('click', function(e){ if (e.target === feedOverlay) closeFeedOverlay(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeFeedOverlay(); });
document.querySelectorAll('.fsrc .ftgl').forEach(function(t){
  t.addEventListener('click', function(){
    document.querySelectorAll('.fsrc .ftgl').forEach(function(x){ x.classList.remove('on'); });
    t.classList.add('on');
    document.getElementById('ffUrlLbl').textContent = t.dataset.src === 'local' ? 'Folder path' : 'Feed URL';
  });
});
