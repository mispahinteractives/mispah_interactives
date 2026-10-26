/* ==========================================================================
   MIZPHA GAMES — website behaviour
   --------------------------------------------------------------------------
   Builds the Games and Services sections from data.js, runs the game player
   (Play on web opens a game over the page), the header and menu highlight,
   and the contact form.
   ========================================================================== */
(function () {
  'use strict';

  const MG = window.MG;

  // the site always opens at the top: no restored scroll position, and a
  // #section left in the address by a menu click is cleared on load
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const webUrl = (g) => (local && g.local) || g.stores.web;
  // games whose host won't run inside another site open in a new tab
  const newTab = (g) => g.frame === false ? ' target="_blank" rel="noopener"' : '';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------- icons */
  const ICON = {
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d1ff" d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.6-9.7z"/><path fill="#00e676" d="M16.7 8.6 5.3 2c-.7-.4-1.3-.4-1.7.3l9.6 9.7z"/><path fill="#ffd600" d="m16.7 8.6-3.5 3.4 3.5 3.4 3.9-2.2c1.2-.7 1.2-1.8 0-2.5z"/><path fill="#ff3d57" d="m13.2 12-9.6 9.7c.4.6 1 .7 1.7.3l11.4-6.6z"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.8v10.4l8.2-5.2z"/></svg>'
  };
  // (each icon has a small idle motion of its own, in site.css: the
  // gamepad's buttons blink, the 5 redraws, the phone pings, the screen
  // types, the brush paints, the globe turns)
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>';
  // a row of five stars: grey ones with gold ones laid over, cut to the score
  const stars = (v, cls) => `<span class="stars ${cls || ''}" style="--v:${v}" role="img" aria-label="${v} out of 5 stars"><span class="stars-bg">${STAR.repeat(5)}</span><span class="stars-fg">${STAR.repeat(5)}</span></span>`;
  const SERVICE_ICON = {
    pad: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle class="i-blink" cx="15.5" cy="11.5" r=".6"/><circle class="i-blink i-late" cx="17.5" cy="13.5" r=".6"/>',
    html5: '<path d="M4 3h16l-1.5 16L12 21l-6.5-2z"/><path class="i-redraw" d="M15.5 7.5h-7l.3 3.5h6.4l-.4 4-2.8.9-2.8-.9-.1-1.6"/>',
    mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><circle class="i-ping" cx="14.6" cy="6" r=".9"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18"/><path class="i-type" d="M7 13h5"/><path class="i-type i-late" d="M7 16h8"/>',
    brush: '<g class="i-sway"><path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2.5 20 2.5 20s3.5.5 5.5-1 2-3 1-4"/></g>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path class="i-spin" d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'
  };

  /* ------------------------------------------------------------- intro */
  $$('[data-game-count]').forEach((el) => { el.textContent = MG.games.length; });

  /* ------------------------------------------------ the intro game screen */
  // The phone shows our games' screenshots, fading from one game to the
  // next every few seconds. Every visit starts on a different game. It
  // pauses while the phone is off screen, the tab is in the background or
  // the pointer rests on the phone.
  (function phone() {
    const art = $('.hero-art'), tilt = $('#phone'), screen = $('.phone-screen', tilt);
    const shots = $('[data-shots]', screen), dots = $('[data-phone-dots]', art);
    const games = MG.games, n = games.length;
    const HOLD = 4200;
    let at = -1, timer = 0, paused = false, seen = true;
    let start = Math.floor(Math.random() * n);
    try {                                                   // a different game on every visit
      const k = 'mg-phone', last = parseInt(localStorage.getItem(k), 10);
      if (!isNaN(last)) start = (last + 1) % n;
      localStorage.setItem(k, String(start));
    } catch (e) { /* storage blocked: a random game */ }
    const imgs = games.map((g) => {
      const im = document.createElement('img');
      im.alt = ''; im.decoding = 'async';
      shots.appendChild(im);
      return im;
    });
    const want = (i) => { const im = imgs[i]; if (!im.src) im.src = games[i].screen || games[i].cover; };
    dots.innerHTML = games.map((g, i) => `<button type="button" aria-label="Show ${esc(g.name)}" data-dot="${i}"></button>`).join('');
    const dotEls = $$('button', dots);

    function show(i) {
      at = i;
      const g = games[i];
      want(i); want((i + 1) % n);
      art.style.setProperty('--gc', g.color || '#6d3df2');
      imgs.forEach((im, j) => im.classList.toggle('on', j === i));
      $('[data-chip-img]', art).src = g.cover;
      $('[data-chip-name]', art).textContent = g.name;
      dotEls.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
      next();
    }
    function next() {
      clearTimeout(timer);
      if (!paused && seen && !document.hidden) timer = setTimeout(() => show((at + 1) % n), HOLD);
    }
    dots.addEventListener('click', (e) => {
      const d = e.target.closest('[data-dot]');
      if (d && +d.dataset.dot !== at) show(+d.dataset.dot);
    });
    tilt.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { paused = true; clearTimeout(timer); } });
    tilt.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { paused = false; next(); } });
    document.addEventListener('visibilitychange', next);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { seen = en.isIntersecting; next(); }).observe(art);
    }
    // on a desktop the phone turns gently towards the pointer
    if (finePointer && !calm) {
      const hero = $('.hero');
      let raf = 0;
      hero.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = hero.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          tilt.style.setProperty('--px', (x * 12).toFixed(2) + 'deg');
          tilt.style.setProperty('--py', (y * -8).toFixed(2) + 'deg');
        });
      });
      hero.addEventListener('pointerleave', () => { tilt.style.removeProperty('--px'); tilt.style.removeProperty('--py'); });
    }
    show(start);
  })();

  /* ------------------------------------------------------------- games */
  // Every game shows the App Store
  // and Google Play badges: with a link (data.js) they open the store; until
  // then they show "Coming soon". Play on the web opens the game player.
  const STORE = {
    app: { name: 'App Store', title: 'the App Store', small: 'Download on the', icon: ICON.apple, key: 'appStore', device: 'iPhone and iPad' },
    play: { name: 'Google Play', title: 'Google Play', small: 'GET IT ON', icon: ICON.play, key: 'playStore', device: 'Android phones and tablets' }
  };
  const badge = (g, which) => {
    const st = STORE[which], link = (g.stores || {})[st.key];
    const inner = `${st.icon}<span><small>${st.small}</small><b>${st.name}</b></span>`;
    return link
      ? `<a class="badge badge-${which}" href="${esc(link)}" target="_blank" rel="noopener" aria-label="${esc(g.name)} on ${st.name}">${inner}</a>`
      : `<button class="badge badge-${which}" type="button" data-soon="${which}" data-game="${esc(g.id)}" aria-label="${esc(g.name)} on ${st.name}: coming soon">${inner}</button>`;
  };
  const list = $('#games-list');
  MG.games.forEach((g, i) => {
    const web = webUrl(g);
    const item = document.createElement('div');
    item.className = 'game-item reveal';
    item.style.setProperty('--d', (i % 3) * 90 + 'ms');
    item.style.setProperty('--gc', g.color || '#6d3df2');
    const card = document.createElement('article');
    card.className = 'game';
    // a tall poster: the game's portrait picture fills the card, and the
    // details sit on frosted glass at the bottom
    card.innerHTML = `
      <div class="game-cover"><img src="${esc(g.screen || g.cover)}" alt="${esc(g.name)}" loading="lazy"${g.focus ? ` style="object-position:${esc(g.focus)}"` : ''}></div>
      <span class="game-tag">${esc(g.genre)}</span>
      <div class="game-body">
        <h3>${esc(g.name)}</h3>
        <div class="game-actions">
          ${web ? `<a class="play-web" href="${esc(web)}" data-play="${esc(g.id)}"${newTab(g)} aria-label="Play ${esc(g.name)} on the web${g.frame === false ? ' (opens in a new tab)' : ''}"><i>${ICON.web}</i><span><small>Play now on the</small><b>Web</b></span></a>` : ''}
          ${badge(g, 'app')}${badge(g, 'play')}
        </div>
      </div>`;
    item.appendChild(card);
    // under the poster: the game's own rating, and Rate & review
    item.insertAdjacentHTML('beforeend', `
      <div class="game-rate" data-gr="${esc(g.id)}">
        <button type="button" class="gr-score" data-rate-open="${esc(g.id)}" aria-label="${esc(g.name)}: see ratings and reviews">
          <span data-gr-stars>${stars(0)}</span><b data-gr-avg></b><span class="gr-count" data-gr-count>No ratings yet</span>
        </button>
        <button type="button" class="gr-btn" data-rate-open="${esc(g.id)}" aria-label="Rate and review ${esc(g.name)}">${STAR}Rate &amp; review</button>
      </div>`);
    list.appendChild(item);
  });

  /* ------------------------------------------------------- coming soon */
  // A store badge without a link opens this card (a sheet from the bottom on
  // phones). Esc, the backdrop, ✕ or Got it closes it.
  const Soon = (function () {
    const el = $('#soon'), card = $('.soon-card', el);
    let back = null, current = null, timer = 0;
    function open(g, which) {
      const st = STORE[which];
      current = g; back = document.activeElement;
      $('[data-soon-cover]', el).src = g.cover;
      $('[data-soon-icon]', el).innerHTML = st.icon;
      $('[data-soon-title]', el).textContent = `${g.name} is coming to ${st.title}`;
      $('[data-soon-text]', el).textContent = `We’re putting the finishing touches on ${g.name} for ${st.device}. ` +
        (webUrl(g) ? 'In the meantime, you can play it right here in your browser.' : 'Check back soon.');
      const play = $('[data-soon-play]', el);
      play.hidden = !webUrl(g);
      play.href = webUrl(g) || '#';
      clearTimeout(timer);
      el.hidden = false;
      document.documentElement.classList.add('modal-on');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
      $('[data-soon-close]', el).focus({ preventScroll: true });
    }
    function close() {
      if (el.hidden) return;
      el.classList.remove('open');
      document.documentElement.classList.remove('modal-on');
      timer = setTimeout(() => { el.hidden = true; }, 350);
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-soon-close]')) close();
      else if (e.target.closest('[data-soon-play]')) { e.preventDefault(); const g = current; close(); if (g) Player.open(g); }
    });
    window.addEventListener('keydown', (e) => {
      if (el.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {                                  // keep the keyboard inside the card
        const f = $$('button, a[href]:not([hidden])', card).filter((x) => !x.hidden);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    return { open, close };
  })();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-soon]');
    if (!b) return;
    const g = MG.games.find((x) => x.id === b.dataset.game);
    if (g) Soon.open(g, b.dataset.soon);
  });

  /* ------------------------------------------------------- card tilt */
  // On a desktop, game cards and service tiles lean a little towards the pointer and catch a soft
  // light where it rests.
  if (finePointer && !calm) {
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.game, .service');
      if (!c) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const k = 4;
      c.style.setProperty('--rx', ((0.5 - y) * k).toFixed(2) + 'deg');
      c.style.setProperty('--ry', ((x - 0.5) * k).toFixed(2) + 'deg');
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const c = e.target.closest && e.target.closest('.game, .service');
      if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    });
  }

  /* ---------------------------------------------------------- services */
  $('#services-list').innerHTML = MG.services.map((sv, i) => `
    <article class="service reveal" style="--d:${(i % 3) * 80}ms">
      <div class="service-top">
        <span class="service-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${SERVICE_ICON[sv.icon] || SERVICE_ICON.pad}</svg></span>
        <span class="service-num">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <h3>${esc(sv.title)}</h3>
      <p>${esc(sv.text)}</p>
    </article>`).join('');
  $('#process-list').innerHTML = MG.process.map((p) => `<li><b>${esc(p.title)}</b><span>${esc(p.text)}</span></li>`).join('');
  // the icons draw themselves in as their tile arrives (pathLength 1 lets
  // one stroke-dash value fit every shape)
  $$('.service-icon svg :is(path, rect, circle)').forEach((el) => el.setAttribute('pathLength', '1'));

  /* ------------------------------------- services and how we work: motion */
  // Everything runs on its own as you scroll. How we work fills its
  // timeline step by step as the steps come into view, the newest step
  // softly pulsing. The section's shapes float and drift at different
  // speeds as you scroll past. Idle motion (icons, shapes, the pulse) only
  // runs while the section is on screen.
  (function servicesMotion() {
    const sec = $('#services'), fl = $('.floaters', sec), ol = $('#process-list'), steps = $$('li', ol);
    let last = -1;
    function reach(i) {
      if (i <= last) return;
      const from = last;
      last = i;
      steps.forEach((li, j) => {
        if (j > from && j <= i) li.style.setProperty('--sd', (j - from - 1) * 180 + 'ms');
        li.classList.toggle('on', j <= i);
        li.classList.toggle('done', j < i);
        li.classList.toggle('current', j === i);
      });
      ol.style.setProperty('--fill', String(i / Math.max(1, steps.length - 1)));
    }
    if (!('IntersectionObserver' in window) || calm) { reach(steps.length - 1); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) reach(steps.indexOf(en.target));
    }), { rootMargin: '0px 0px -16% 0px', threshold: 0.6 });
    steps.forEach((li) => io.observe(li));

    // drift: the shapes move at their own speed (--k) as the section scrolls
    let raf = 0, live = false;
    const drift = () => {
      raf = 0;
      const r = sec.getBoundingClientRect();
      fl.style.setProperty('--sy', ((r.top + r.height / 2 - innerHeight / 2) / innerHeight).toFixed(3));
    };
    const onScroll = () => { if (live && !raf) raf = requestAnimationFrame(drift); };
    window.addEventListener('scroll', onScroll, { passive: true });
    new IntersectionObserver(([en]) => {
      live = en.isIntersecting;
      sec.classList.toggle('live', live);
      if (live) drift();
    }, { rootMargin: '80px 0px' }).observe(sec);
  })();

  /* ----------------------------------------------------- scroll reveals */
  // content rises softly into place as it comes into view (once)
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !calm) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  /* ------------------------------------------------------- game player */
  // Play on web opens the game over the page in a frame, with its name and
  // Full screen / Close. Back (a swipe back on a phone) or Esc closes it;
  // closing removes the frame, which stops the game. The URL doesn't change.
  const Player = (function () {
    const el = $('#player'), stage = $('[data-player-stage]', el), full = $('[data-player-full]', el);
    if (!(el.requestFullscreen || el.webkitRequestFullscreen)) full.hidden = true;
    let game = null, frame = null, pushed = false, back = null;
    function open(g) {
      const url = webUrl(g);
      if (!url) return;
      if (g.frame === false) { window.open(url, '_blank', 'noopener'); return; }
      if (frame) frame.remove(); else back = document.activeElement;
      game = g;
      el.classList.toggle('is-portrait', g.shape !== 'landscape');
      el.classList.remove('loaded');
      $('[data-player-title]', el).textContent = g.name;
      $('[data-player-genre]', el).textContent = g.genre;
      el.hidden = false;                                    // show first: a game measures its window as it boots
      frame = document.createElement('iframe');
      frame.className = 'player-frame'; frame.title = g.name; frame.src = url;
      frame.allow = 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; screen-wake-lock';
      frame.setAttribute('allowfullscreen', '');
      frame.addEventListener('load', () => { el.classList.add('loaded'); try { frame.focus(); } catch (e) { /* cross-origin */ } });
      stage.appendChild(frame);
      document.documentElement.classList.add('modal-on');
      if (!pushed) { history.pushState({ mgPlayer: true }, ''); pushed = true; }
      $('[data-player-close]', el).focus({ preventScroll: true });
    }
    function close(fromHistory) {
      if (!game) return;
      game = null;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if (frame) { frame.remove(); frame = null; }
      el.hidden = true;
      document.documentElement.classList.remove('modal-on');
      if (pushed && !fromHistory) history.back();
      pushed = false;
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    $('[data-player-close]', el).addEventListener('click', () => close());
    full.addEventListener('click', () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    });
    window.addEventListener('popstate', () => { if (game) { pushed = false; close(true); } });
    window.addEventListener('keydown', (e) => { if (game && e.key === 'Escape') close(); });
    return { open, close, get game() { return game; } };
  })();
  window.MGPlayer = Player;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-play]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;   // (a modified click opens a new tab)
    const g = MG.games.find((x) => x.id === a.dataset.play);
    if (!g) return;
    e.preventDefault();
    Player.open(g);
  });

  /* ------------------------------------------------- header and menu */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // the menu link of the section in view is highlighted
  const links = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['games', 'services', 'contact'].forEach((id) => io.observe(document.getElementById(id)));
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ----------------------------------------------- ratings and reviews */
  // Anyone can rate a game and leave a comment: "Rate & review" under a
  // game card opens that game's own reviews and form. Reviews live in Supabase (data.js, reviews.url / reviews.key) and are read and
  // written through its REST API, so everyone sees them straight away; the
  // database's own rules check every review (see the README). Until
  // Supabase is set up, a review is emailed to the studio instead.
  const Reviews = (function () {
    const cfg = MG.reviews || {};
    const BASE = (cfg.url || '').trim().replace(/\/+$/, ''), KEY = (cfg.key || '').trim();
    const LIVE = !!(BASE && KEY);
    const API = BASE + '/rest/v1/reviews';
    const AUTH = { apikey: KEY, Authorization: 'Bearer ' + KEY };
    const WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];
    // what is reviewed: a game, as 'game:<id>'
    const byId = {};
    MG.games.forEach((g) => { byId['game:' + g.id] = { name: g.name }; });
    const hue = (t) => { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const day = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    const score = (rows) => { const n = rows.length; return { n, avg: n ? Math.round(rows.reduce((a, r) => a + r.rating, 0) / n * 10) / 10 : 0 }; };

    /* the store: loaded once, as Our Games comes near */
    let all = [], state = 'idle', fresh = null;
    const views = [];
    const refresh = () => views.forEach((f) => f());
    async function load() {
      if (state !== 'idle') return;
      if (!LIVE) { state = 'ready'; refresh(); return; }
      state = 'loading'; refresh();
      try {
        const res = await fetch(API + '?select=id,created_at,name,target,rating,comment&order=created_at.desc&limit=1000', { headers: AUTH });
        if (!res.ok) throw new Error(res.status);
        all = (await res.json()).filter((r) => r && r.rating >= 1 && r.rating <= 5);
        state = 'ready';
      } catch (e) { state = 'error'; }
      refresh();
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ens) => { if (ens.some((en) => en.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' });
      io.observe($('#games'));
    } else load();

    function card(r) {
      const name = String(r.name || 'Player').trim();
      return `<li class="rv-card${r === fresh ? ' new' : ''}">
        <div class="rv-head">
          <span class="rv-avatar" style="--h:${hue(name)}" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>
          <div class="rv-who"><b>${esc(name)}</b><time datetime="${esc(r.created_at || '')}">${esc(day(r.created_at || Date.now()))}</time></div>
          ${stars(r.rating)}
        </div>
        <p class="rv-text">${esc(r.comment)}</p>
      </li>`;
    }
    const listState = (rows, emptyHtml, shown) =>
      state === 'loading' ? '<li class="rv-card rv-skel"></li><li class="rv-card rv-skel"></li>'
        : state === 'error' ? '<li class="rv-empty"><h3>Reviews couldn’t be loaded</h3><p>Please check your connection and try again in a moment.</p></li>'
          : !rows.length ? emptyHtml : rows.slice(0, shown).map(card).join('');

    /* a game's review form */
    function makeForm(form, opts) {
      const p = opts.prefix;
      form.innerHTML = `
        <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">
        <fieldset class="rv-pick">
          <legend>Your rating</legend>
          <div class="rv-pick-stars" data-pick>
            ${[1, 2, 3, 4, 5].map((v) => `<input type="radio" name="rating" id="${p}-r${v}" value="${v}"><label for="${p}-r${v}" title="${WORDS[v]}">${STAR}<span class="sr">${v} star${v > 1 ? 's' : ''}, ${WORDS[v].toLowerCase()}</span></label>`).join('')}
          </div>
          <span class="rv-pick-word" data-word aria-hidden="true">Tap a star</span>
          <span class="field-err" data-err="rating"></span>
        </fieldset>
        <div class="field">
          <input id="${p}-name" name="name" type="text" autocomplete="given-name" maxlength="60" required placeholder=" ">
          <label for="${p}-name">Your name</label>
          <span class="field-err" data-err="name"></span>
        </div>
        <div class="field">
          <textarea id="${p}-comment" name="comment" rows="3" maxlength="600" required placeholder=" "></textarea>
          <label for="${p}-comment">What did you think of the game?</label>
          <span class="rv-chars" data-chars>0 / 600</span>
          <span class="field-err" data-err="comment"></span>
        </div>
        <button class="btn btn-dark btn-send" type="submit" data-send><span data-send-label>Post review</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
        <p class="form-status" data-status role="status"></p>`;
      const status = $('[data-status]', form), send = $('[data-send]', form), sendLabel = $('[data-send-label]', form);
      const NOTE = LIVE ? 'Your name, rating and review are shown publicly.' : 'Your review is sent to the studio.';
      status.textContent = NOTE;
      const pick = $('[data-pick]', form), word = $('[data-word]', form), labels = $$('label', pick), chars = $('[data-chars]', form);
      const rating = () => +((form.querySelector('input[name="rating"]:checked') || {}).value || 0);
      const light = (v) => { labels.forEach((l, i) => l.classList.toggle('lit', i < v)); word.textContent = v ? WORDS[v] : 'Tap a star'; };
      labels.forEach((l, i) => l.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') light(i + 1); }));
      pick.addEventListener('pointerleave', () => light(rating()));
      pick.addEventListener('change', () => { light(rating()); check('rating'); });
      form.elements.comment.addEventListener('input', () => { chars.textContent = form.elements.comment.value.length + ' / 600'; });
      const target = opts.target;
      const RULES = {
        rating: () => rating() ? '' : 'Please choose a star rating.',
        name: () => form.elements.name.value.trim().length >= 2 ? '' : 'Please enter your name.',
        comment: () => form.elements.comment.value.trim().length >= 10 ? '' : 'Please write a little more (at least 10 characters).'
      };
      const keys = ['rating', 'name', 'comment'];
      const field = (k) => k === 'rating' ? pick : form.elements[k];
      // each field names its error message for screen readers
      keys.forEach((k) => { const e = $(`[data-err="${k}"]`, form); e.id = `${p}-err-${k}`; field(k).setAttribute('aria-describedby', e.id); });
      function check(k) {
        const msg = RULES[k]();
        $(`[data-err="${k}"]`, form).textContent = msg;
        field(k).setAttribute('aria-invalid', String(!!msg));
        return !msg;
      }
      keys.filter((k) => k !== 'rating').forEach((k) => {
        form.elements[k].addEventListener('blur', () => { if (form.elements[k].getAttribute('aria-invalid') === 'true' || form.elements[k].value) check(k); });
        form.elements[k].addEventListener('input', () => { if (form.elements[k].getAttribute('aria-invalid') === 'true') check(k); });
      });
      function reset(msg) {
        form.reset(); light(0); chars.textContent = '0 / 600';
        keys.forEach((k) => { $(`[data-err="${k}"]`, form).textContent = ''; field(k).removeAttribute('aria-invalid'); });
        status.classList.remove('err', 'ok');
        status.textContent = msg || NOTE;
        if (msg) status.classList.add('ok');
      }
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (send.disabled) return;
        const ok = keys.map(check);
        status.classList.remove('ok');
        if (ok.includes(false)) {
          status.textContent = 'Please check the highlighted fields.'; status.classList.add('err');
          const k = keys[ok.indexOf(false)];
          (k === 'rating' ? $('input', pick) : form.elements[k]).focus();
          return;
        }
        if (recent().length >= 3) { status.textContent = 'You’ve posted a few reviews today. Please try again tomorrow.'; status.classList.add('err'); return; }
        const review = { name: form.elements.name.value.trim().slice(0, 60), target: target(), rating: rating(), comment: form.elements.comment.value.trim().slice(0, 600) };
        if (form.elements.botcheck.checked) { reset('Thanks! Your review has been posted.'); return; }   // a bot: pretend it worked
        send.disabled = true; sendLabel.textContent = 'Posting…';
        status.textContent = 'Posting your review…'; status.classList.remove('err');
        try {
          await post(review);
          reset(LIVE ? 'Thanks! Your review is now live.' : 'Thanks! Your review has been sent to the studio.');
        } catch (err) {
          status.textContent = 'Sorry, your review couldn’t be posted. Please try again in a moment.'; status.classList.add('err');
        } finally {
          send.disabled = false; sendLabel.textContent = 'Post review';
        }
      });
      return { reset, pickFirst: () => $('input', pick) };
    }
    // a reviewer (one browser) can post up to three reviews a day
    const recent = () => { try { return JSON.parse(localStorage.getItem('mg-rv') || '[]').filter((t) => Date.now() - t < 864e5); } catch (e) { return []; } };
    const remember = () => { try { localStorage.setItem('mg-rv', JSON.stringify(recent().concat(Date.now()))); } catch (e) { /* storage blocked */ } };
    async function post(review) {
      if (LIVE) {
        const res = await fetch(API, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, AUTH), body: JSON.stringify(review) });
        if (!res.ok) throw new Error(res.status);
        const row = (await res.json().catch(() => []))[0] || Object.assign({ created_at: new Date().toISOString() }, review);
        all.unshift(row); fresh = row;
        if (state !== 'ready') state = 'ready';
        refresh();
      } else {
        const t = byId[review.target] || { name: review.target };
        const res = await fetch('https://formsubmit.co/ajax/' + MG.email, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: `New review: ${review.rating}★ for ${t.name} · Mizpha Games website`, _template: 'table', _captcha: 'false', name: review.name, reviewing: t.name, rating: review.rating + ' / 5', review: review.comment })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !(data.success === true || data.success === 'true')) throw new Error(res.status);
      }
      remember();
    }

    /* under each game card: its average and number of reviews */
    views.push(() => {
      $$('[data-gr]').forEach((el) => {
        const { n, avg } = score(all.filter((r) => r.target === 'game:' + el.dataset.gr));
        $('[data-gr-stars]', el).innerHTML = stars(avg);
        $('[data-gr-avg]', el).textContent = n ? avg.toFixed(1) : '';
        $('[data-gr-count]', el).textContent = n ? `(${n})` : (state === 'loading' ? 'Loading…' : 'No ratings yet');
      });
    });

    /* one game's reviews: opened from Rate & review under its card */
    const dlg = $('#rvg'), dlgCard = $('.rvg-card', dlg), dlgList = $('[data-rvg-list]', dlg);
    let game = null, back = null, timer = 0;
    const gForm = makeForm($('#rvg-form'), { prefix: 'rvg', target: () => game && 'game:' + game.id });
    views.push(() => {
      if (!game) return;
      const rows = all.filter((r) => r.target === 'game:' + game.id);
      const { n, avg } = score(rows);
      $('[data-rvg-stars]', dlg).innerHTML = stars(avg, 'stars-lg');
      $('[data-rvg-avg]', dlg).textContent = n ? avg.toFixed(1) : '';
      $('[data-rvg-count]', dlg).textContent = n ? `${n} review${n === 1 ? '' : 's'}` : (state === 'loading' ? 'Loading…' : 'No ratings yet');
      dlgList.innerHTML = listState(rows, `<li class="rv-empty rv-empty-sm"><span class="rv-empty-star">${STAR}</span><p>No reviews of ${esc(game.name)} yet. Be the first!</p></li>`, 50);
    });
    function open(g) {
      game = g; back = document.activeElement;
      $('[data-rvg-cover]', dlg).src = g.cover;
      $('[data-rvg-name]', dlg).textContent = g.name;
      gForm.reset();
      load(); refresh();
      clearTimeout(timer);
      dlg.hidden = false; dlgCard.scrollTop = 0;
      document.documentElement.classList.add('modal-on');
      requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('open')));
      gForm.pickFirst().focus({ preventScroll: true });
    }
    function close() {
      if (dlg.hidden) return;
      dlg.classList.remove('open');
      document.documentElement.classList.remove('modal-on');
      timer = setTimeout(() => { dlg.hidden = true; game = null; }, 350);
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-rvg-close]')) close(); });
    window.addEventListener('keydown', (e) => {
      if (dlg.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {                                  // keep the keyboard inside the window
        const f = $$('button, a[href], input:not(.hp):not([type="radio"]), input[type="radio"]:checked, textarea', dlgCard).filter((x) => !x.hidden && x.offsetParent);
        const radios = $$('input[type="radio"]', dlgCard);
        if (!radios.some((r) => r.checked)) f.splice(1, 0, radios[0]);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rate-open]');
      if (!b) return;
      const g = MG.games.find((x) => x.id === b.dataset.rateOpen);
      if (g) open(g);
    });
    return { open, close };
  })();

  /* ------------------------------------------------------------ contact */
  // Messages go out in the background, so the visitor's email app never
  // opens: the form posts to an email API that works on static hosting such
  // as GitHub Pages. With a Web3Forms access key (data.js, contactKey) it uses
  // Web3Forms; without one it uses FormSubmit, which needs no key: the very
  // first message sends a one-time "Activate Form" email to the studio inbox,
  // and after one click every message arrives. If sending fails the visitor
  // gets a one-click email link.
  const CONTACT_EMAIL = MG.email;
  const CONTACT_KEY = (MG.contactKey || '').trim();
  const SEND_URL = CONTACT_KEY ? 'https://api.web3forms.com/submit' : 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;
  const form = $('#contact-form'), status = $('#contact-status'), sent = $('#contact-sent');
  const sendBtn = $('[data-send]', form), sendLabel = $('[data-send-label]', form);
  const HINT = 'We’ll reply to the email address you give us.';
  status.textContent = HINT;
  const RULES = {
    name: (v) => v ? '' : 'Please enter your name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.',
    message: (v) => v.length >= 10 ? '' : 'Please write a little more (at least 10 characters).'
  };
  const check = (n) => {
    const f = form.elements[n], msg = RULES[n](f.value.trim());
    f.setAttribute('aria-invalid', String(!!msg));
    $('#err-' + n).textContent = msg;
    return !msg;
  };
  const setSending = (on) => {
    sendBtn.disabled = on;
    sendLabel.textContent = on ? 'Sending…' : 'Send message';
  };
  const mailtoHref = (name, from, message) => 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Hello from ' + name) +
    '&body=' + encodeURIComponent(message + '\n\n— ' + name + ' (' + from + ')');
  function showSent(name, from) {
    $('[data-sent-text]', sent).textContent = `Thanks, ${name}! Your message is on its way. We’ll reply to ${from}.`;
    form.hidden = true; sent.hidden = false;
    sent.focus({ preventScroll: true });
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sendBtn.disabled) return;
    const ok = ['name', 'email', 'message'].map(check);
    if (ok.includes(false)) {
      status.textContent = 'Please check the highlighted fields.'; status.classList.add('err');
      form.elements[['name', 'email', 'message'][ok.indexOf(false)]].focus();
      return;
    }
    const name = form.elements.name.value.trim(), from = form.elements.email.value.trim(), message = form.elements.message.value.trim();
    if (form.elements.botcheck.checked) { showSent(name, from); return; }        // a bot: pretend it worked
    setSending(true);
    status.textContent = 'Sending your message…'; status.classList.remove('err');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(SEND_URL, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(CONTACT_KEY ? {
          access_key: CONTACT_KEY,
          subject: 'New message from ' + name + ' · Mizpha Games website',
          from_name: 'Mizpha Games website',
          name, email: from, message, botcheck: false
        } : {
          _subject: 'New message from ' + name + ' · Mizpha Games website',
          _template: 'table', _captcha: 'false', _honey: '',
          name, email: from, message
        })
      });
      const data = await res.json().catch(() => ({}));
      const okSent = data.success === true || data.success === 'true';
      if (!res.ok || !okSent) {
        const err = new Error(data.message || 'The server said no (' + res.status + ').');
        err.activation = /activat/i.test(data.message || '');
        throw err;
      }
      form.reset();
      ['name', 'email', 'message'].forEach((n) => { form.elements[n].removeAttribute('aria-invalid'); $('#err-' + n).textContent = ''; });
      status.textContent = '';
      showSent(name, from);
    } catch (err) {
      const why = err.activation ? 'The contact form is being switched on and will work shortly.'
        : err.name === 'AbortError' ? 'The connection timed out.' : (navigator.onLine === false ? 'You seem to be offline.' : '');
      status.classList.add('err');
      status.innerHTML = '';
      status.append(`Sorry, your message couldn’t be sent.${why ? ' ' + why : ''} Please try again, or `);
      const a = document.createElement('a'); a.href = mailtoHref(name, from, message); a.textContent = 'email us directly';
      status.append(a, '.');
    } finally {
      clearTimeout(timer); setSending(false);
    }
  });
  ['name', 'email', 'message'].forEach((n) => {
    form.elements[n].addEventListener('blur', () => { if (form.elements[n].getAttribute('aria-invalid') === 'true' || form.elements[n].value) check(n); });
    form.elements[n].addEventListener('input', () => { if (form.elements[n].getAttribute('aria-invalid') === 'true') check(n); });
  });
  $('[data-send-another]', sent).addEventListener('click', () => {
    sent.hidden = true; form.hidden = false;
    status.textContent = HINT; status.classList.remove('err');
    form.elements.name.focus();
  });
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const done = () => { b.textContent = 'Copied!'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, () => {});
  }));
})();
