// Extension Store — логика раздела.
// Оболочка (титлбар, сайдбар, пин, online/offline) — ../shared-ui/chrome.js
var app = document.getElementById("app");

document.querySelectorAll('.cstar').forEach(function(s){
  s.addEventListener('click', function(e){
    e.stopPropagation();
    var faved = s.classList.toggle('faved');
    s.querySelector('img').src = faved ? '../shared-ui/assets/st-star16-filled.svg' : '../shared-ui/assets/st-star16.svg';
  });
});

// установка: прогресс на разделителе + проценты на кнопке
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

// ===== Store: панель фильтров =====
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

  // сбор тегов из карточек с частотой — так список масштабируется на любое число тегов
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
    // выбранные поднимаем наверх, чтобы не терялись в длинном списке
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

  // радио Category и сегмент Price — одна логика «выбрать одно из группы»
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

  // вернуть все группы в положение «All»
  function clearPicks(){
    document.querySelectorAll('.fopt, .fseg .fs').forEach(function(x){
      x.classList.toggle('on', x.dataset.v === '');
    });
  }

  renderTags();

  // внешний вход: показать Store, отфильтрованный по одному тегу
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

// табы Store / Manage
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

// ===== просмотр расширения: открытие по карточке, карусель, возврат =====
(function(){
  var d = pages.detail,
      track = document.getElementById('dGalTrack'),
      thumbs = document.getElementById('dGalThumbs'),
      cnt = document.getElementById('dGalCnt'),
      prev = document.getElementById('dGalPrev'),
      next = document.getElementById('dGalNext'),
      shots = [], idx = 0;

  // карусель: массив путей к скриншотам; при одном кадре навигация скрыта
  function setShots(list, fallbackBg){
    shots = list.slice(); idx = 0;
    track.innerHTML = ''; thumbs.innerHTML = '';
    if (!shots.length){                       // нет скриншотов — цветная заглушка категории
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
      // клики по кнопкам внутри карточки не открывают страницу
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
        s.title = 'Показать расширения с тегом «' + name + '»';
        // клик по тегу возвращает в Store с фильтром по этому тегу
        s.addEventListener('click', function(){
          back();
          if (window.storeFilterByTag) window.storeFilterByTag(name);
        });
        tw.appendChild(s);
      });

      // скриншоты берём из data-shots карточки ("a.png|b.png"), иначе — заглушка
      var list = (c.dataset.shots || '').split('|').filter(Boolean);
      setShots(list, getComputedStyle(cover).background);

      // окно открывается поверх каталога — Store остаётся под ним
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

  // «Read more» — раскрытие описания
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

// выбор строки в таблице Installed
document.querySelectorAll('.xrow').forEach(function(r){
  r.addEventListener('click', function(){
    document.querySelectorAll('.xrow').forEach(function(x){ x.classList.remove('sel'); });
    r.classList.add('sel');
  });
});

// копирование пути из ячейки; кнопки в строке не меняют выбор
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

// тоглы фидов (Enable/Disable в Actions)
document.querySelectorAll('[data-feedtgl]').forEach(function(t){
  t.addEventListener('click', function(e){
    e.stopPropagation();
    t.textContent = t.textContent === 'Disable' ? 'Enable' : 'Disable';
  });
});

// модалка Add feed
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
