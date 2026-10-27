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
  // (a game marked `soon` isn't playable yet)
  const webUrl = (g) => g.soon ? '' : (local && g.local) || g.stores.web;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------- icons */
  const ICON = {
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d1ff" d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.6-9.7z"/><path fill="#00e676" d="M16.7 8.6 5.3 2c-.7-.4-1.3-.4-1.7.3l9.6 9.7z"/><path fill="#ffd600" d="m16.7 8.6-3.5 3.4 3.5 3.4 3.9-2.2c1.2-.7 1.2-1.8 0-2.5z"/><path fill="#ff3d57" d="m13.2 12-9.6 9.7c.4.6 1 .7 1.7.3l11.4-6.6z"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.8v10.4l8.2-5.2z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
  };
  const SERVICE_ICON = {
    pad: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle class="i-blink" cx="15.5" cy="11.5" r=".6"/><circle class="i-blink i-late" cx="17.5" cy="13.5" r=".6"/>',
    html5: '<path d="M4 3h16l-1.5 16L12 21l-6.5-2z"/><path class="i-redraw" d="M15.5 7.5h-7l.3 3.5h6.4l-.4 4-2.8.9-2.8-.9-.1-1.6"/>',
    mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><circle class="i-ping" cx="14.6" cy="6" r=".9"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18"/><path class="i-type" d="M7 13h5"/><path class="i-type i-late" d="M7 16h8"/>',
    brush: '<g class="i-sway"><path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2.5 20 2.5 20s3.5.5 5.5-1 2-3 1-4"/></g>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path class="i-spin" d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'
  };

  /* --------------------------------------------- logo-style lettering */
  // The .logo-word outlines grow each letter outward by about 0.1em (thick
  // and even, like the logo's, and clean inside letters like C and S): pick
  // the SVG filter (index.html) nearest that for each word's size.
  const sizeOutlines = () => $$('.logo-word').forEach((w) => {
    const r = Math.min(10, Math.max(2, Math.round(parseFloat(getComputedStyle(w).fontSize) * 0.1)));
    w.style.setProperty('--outline', `url(#logo-ink-${r})`);
  });
  sizeOutlines();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeOutlines);
  let ot = 0;
  window.addEventListener('resize', () => { clearTimeout(ot); ot = setTimeout(sizeOutlines, 150); });
  // The shine: every few seconds a soft light sweeps once across the words
  // that are on screen (one after another), then rests. Each sweep is short,
  // so it costs next to nothing; nothing runs for words out of view.
  if (!calm && 'IntersectionObserver' in window) {
    const inView = new Set();
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) inView.add(en.target); else inView.delete(en.target); }));
    $$('.logo-word').forEach((w) => {
      io.observe(w);
      w.addEventListener('animationend', () => w.classList.remove('shine'));
    });
    const gleam = () => {
      if (!document.hidden) [...inView].forEach((w, i) => setTimeout(() => { w.classList.remove('shine'); void w.offsetWidth; w.classList.add('shine'); }, i * 260));
      setTimeout(gleam, 5200);
    };
    setTimeout(gleam, 1400);
  }

  // (resolves once the phone's first screenshot is on screen)
  let phoneFirst = Promise.resolve();

  /* ------------------------------------------------------------- intro */
  $$('[data-game-count]').forEach((el) => { el.textContent = MG.games.length; });

  /* ------------------------------------------------ the intro game screen */
  // The phone shows every screenshot of every game, game by game: its title
  // screen (`cover` in data.js), then its in-game shots (`screens`), fading
  // to the next one every 2 seconds, round and round.
  // The dots mark the game on screen. Every visit starts on a different
  // game. It only rests while the phone is off screen or the tab is in the
  // background.
  (function phone() {
    const art = $('.hero-art'), tilt = $('#phone'), screen = $('.phone-screen', tilt);
    const shots = $('[data-shots]', screen), dots = $('[data-phone-dots]', art);
    const games = MG.games;
    // every screenshot in order, each knowing its game
    const list = [];
    games.forEach((g, gi) => [...new Set([g.cover, ...(g.screens || [])])].forEach((src) => list.push({ src, gi })));
    const n = list.length, firstOf = (gi) => list.findIndex((s) => s.gi === gi);
    const HOLD = 2000;
    let at = -1, timer = 0, seen = true;
    let startGame = Math.floor(Math.random() * games.length);
    try {                                                   // a different game on every visit
      const k = 'mg-phone', last = parseInt(localStorage.getItem(k), 10);
      if (!isNaN(last)) startGame = (last + 1) % games.length;
      localStorage.setItem(k, String(startGame));
    } catch (e) { /* storage blocked: a random game */ }
    // The phone uses lighter copies of the screenshots, sized for it
    // (assets/img/games/phone/). Each one loads only when it's needed, and
    // the phone moves on only once the next screenshot has arrived, so it
    // never shows an empty screen (until the very first one arrives it shows
    // the logo, see .phone-screen in site.css).
    const phoneSrc = (src) => src.replace('assets/img/games/', 'assets/img/games/phone/');
    const imgs = list.map(() => {
      const im = document.createElement('img');
      im.alt = ''; im.decoding = 'async';
      shots.appendChild(im);
      return im;
    });
    const want = (i, high) => { const im = imgs[i]; if (!im.getAttribute('src')) { if (high) im.fetchPriority = 'high'; im.src = phoneSrc(list[i].src); } };
    const ready = (i) => new Promise((res) => {
      want(i);
      const im = imgs[i];
      if (im.complete && im.naturalWidth) { res(); return; }
      im.addEventListener('load', () => res(), { once: true });
      im.addEventListener('error', () => res(), { once: true });
    });
    dots.innerHTML = games.map((g, i) => `<button type="button" aria-label="Show ${esc(g.name)}" data-dot="${i}"></button>`).join('');
    const dotEls = $$('button', dots);

    let token = 0;
    async function show(i) {
      const mine = ++token;
      clearTimeout(timer);
      await ready(i);                                      // wait for it: never switch to a blank screen
      if (mine !== token) return;                          // (a newer request came in meanwhile)
      at = i;
      const gi = list[i].gi, g = games[gi];
      art.style.setProperty('--gc', g.color || '#a12bc2');
      imgs.forEach((im, j) => im.classList.toggle('on', j === i));
      dotEls.forEach((d, j) => d.setAttribute('aria-current', String(j === gi)));
      want((i + 1) % n);                                   // fetch the next one while this one shows
      next();
    }
    function next() {
      clearTimeout(timer);
      if (seen && !document.hidden) timer = setTimeout(() => show((at + 1) % n), HOLD);
    }
    dots.addEventListener('click', (e) => {
      const d = e.target.closest('[data-dot]');
      if (d && (at < 0 || list[at].gi !== +d.dataset.dot)) show(firstOf(+d.dataset.dot));
    });
    document.addEventListener('visibilitychange', next);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ens) => { seen = ens[ens.length - 1].isIntersecting; next(); }).observe(art);
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
    // the first screenshot loads ahead of everything else on the phone; the
    // rest follow quietly one at a time once the page has finished loading
    const first = firstOf(startGame);
    want(first, true);
    show(first);
    phoneFirst = ready(first);
    const rest = () => {
      let k = 0;
      const step = () => { if (++k >= n) return; const i = (first + k) % n; if (imgs[i].getAttribute('src')) { step(); return; } imgs[i].fetchPriority = 'low'; ready(i).then(step); };
      step();
    };
    if (document.readyState === 'complete') rest(); else window.addEventListener('load', rest, { once: true });
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
  const list = $('#games-list .games-track');
  MG.games.forEach((g, i) => {
    const web = webUrl(g);
    const item = document.createElement('div');
    item.className = 'game-item';
    item.style.setProperty('--gc', g.color || '#a12bc2');
    const card = document.createElement('article');
    card.className = 'game';
    // a tall poster: the game's portrait picture fills the card, and the
    // details sit on frosted glass at the bottom
    card.innerHTML = `
      <div class="game-cover"><img data-src="${esc(g.cover)}" alt="${esc(g.name)}" loading="lazy" fetchpriority="low"${g.focus ? ` style="object-position:${esc(g.focus)}"` : ''}></div>
      <span class="game-tag">${esc(g.genre)}</span>
      ${g.soon ? '<span class="game-soon">Coming soon</span>' : ''}
      <div class="game-body">
        <h3>${esc(g.name)}</h3>
        <div class="game-actions">
          ${g.soon ? `<span class="play-soon"><i>${ICON.clock}</i><span><small>Launching</small><b>Coming soon</b></span></span>` : ''}
          ${web ? `<a class="play-web" href="${esc(web)}" data-play="${esc(g.id)}" aria-label="Play ${esc(g.name)} on the web"><i>${ICON.web}</i><span><small>Play now on the</small><b>Web</b></span></a>` : ''}
          ${badge(g, 'app')}${badge(g, 'play')}
        </div>
      </div>`;
    item.appendChild(card);
    list.appendChild(item);
  });
  $$('img', list).forEach((im) => { im.draggable = false; });

  /* ---------------------------------------------------- the games row */
  // All the games sit in one row that moves by itself, round and round.
  // A second copy of the cards follows the first, so the row wraps with no
  // seam. When the section first comes into view the first six sweep past
  // quickly, then the row eases into a slow, steady glide; the speed only
  // ever changes smoothly, so it never jumps or stops. Under the mouse it
  // slows right down (but keeps moving) so the buttons are easy to click;
  // it can also be dragged or swiped. With reduced motion it's a plain row
  // to scroll by hand.
  (function gamesRow() {
    const view = $('#games-list'), track = $('.games-track', view);
    const originals = $$('.game-item', track);
    if (calm || !originals.length) { view.classList.add('is-static'); return; }
    originals.forEach((it) => {
      const c = it.cloneNode(true);
      c.classList.add('is-copy'); c.setAttribute('aria-hidden', 'true');
      $$('a, button', c).forEach((el) => { el.tabIndex = -1; });
      track.appendChild(c);
    });
    const copy0 = $('.is-copy', track);
    // The steady glide is a plain looping animation (a slide by one set of
    // cards) run by the browser itself, so it costs next to nothing. Only
    // its speed (playbackRate) is steered from here, and only while it
    // changes: the opening sweep, slowing under the mouse, dragging.
    const slow = () => (innerWidth < 680 ? 26 : 40);              // px per second, the steady glide
    const INTRO = 2.4;                                            // seconds for the opening sweep past all six
    let setW = 1, anim = null, introT = -1, boost = 1, factor = 1, target = 1, seen = false, raf = 0, last = 0, drag = null, suppress = false;
    const dur = () => setW / slow() * 1000;
    const pos = () => anim ? -((anim.currentTime || 0) % dur()) / dur() * setW : 0;        // where the row is, in px
    const setPos = (x) => { const d = dur(); anim.currentTime = ((((-x / setW) % 1) + 1) % 1) * d; };
    function build() {
      const keep = anim ? pos() : 0;
      if (anim) anim.cancel();
      setW = Math.max(1, copy0.offsetLeft - originals[0].offsetLeft);
      anim = track.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-setW}px, 0, 0)` }], { duration: dur(), iterations: Infinity, easing: 'linear' });
      setPos(keep);
      apply();
    }
    // the speed: the opening boost (fast at first, easing to 1 so it meets
    // the glide at exactly its speed) times the hover factor
    const apply = () => {
      if (!anim) return;
      anim.playbackRate = Math.max(0.0001, boost * factor);
      if (drag || !seen) anim.pause(); else if (anim.playState !== 'running') anim.play();
    };
    function steer(t) {
      raf = 0;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (introT >= 0 && introT < INTRO) {
        introT += dt * factor;
        const k = Math.max(0, 1 - introT / INTRO);
        const v0 = slow() + 3 * Math.max(0, setW - slow() * INTRO) / INTRO;
        boost = 1 + (v0 / slow() - 1) * k * k;
      } else boost = 1;
      factor += (target - factor) * Math.min(1, dt * 3);
      if (Math.abs(target - factor) < 0.002) factor = target;
      apply();
      if (seen && ((introT >= 0 && introT < INTRO) || factor !== target)) raf = requestAnimationFrame(steer);
      else last = 0;
    }
    const wake = () => { if (!raf && seen) { last = 0; raf = requestAnimationFrame(steer); } };
    build();
    // (fast scrolling can report several changes at once: the last one counts)
    new IntersectionObserver((ens) => {
      const en = ens[ens.length - 1];
      seen = en.isIntersecting;
      if (seen && introT < 0 && en.intersectionRatio >= 0.25) introT = 0;
      apply(); wake();
    }, { threshold: [0, 0.25] }).observe(view);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
    // slow down under the mouse
    view.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { target = 0.3; wake(); } });
    view.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { target = 1; wake(); } });
    // keyboard focus (Tab) brings the card into view and holds the row still.
    // (Only the keyboard: a mouse click also focuses a button, and moving the
    // row then would pull the button away before the click lands.)
    let kbd = false;
    view.addEventListener('focusin', (e) => {
      if (!e.target.matches(':focus-visible')) return;
      const it = e.target.closest('.game-item');
      kbd = true; target = 0; factor = 0; apply();
      if (it) setPos(-(it.offsetLeft - originals[0].offsetLeft));
    });
    view.addEventListener('focusout', () => { if (kbd) { kbd = false; target = 1; wake(); } });
    // press: the row holds still under the finger or mouse until it's
    // released, so a button can't slide away mid-click; drag to move it
    view.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, sx: e.clientX, x0: pos(), moved: false, slop: e.pointerType === 'mouse' ? 6 : 12 };
      apply();
    });
    view.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx;
      if (!drag.moved && Math.abs(dx) > drag.slop) {
        drag.moved = true; view.setPointerCapture(e.pointerId); view.classList.add('dragging');
        introT = INTRO; boost = 1; drag.x0 = pos(); drag.sx = e.clientX; apply();
      }
      if (drag.moved) setPos(drag.x0 + (e.clientX - drag.sx));
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) suppress = true;
      drag = null; view.classList.remove('dragging'); apply();
      setTimeout(() => { suppress = false; }, 0);
    };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } }, true);
  })();

  // The card pictures load once the phone's first screenshot has arrived (so
  // on a slow connection that comes first), or as soon as the games come
  // near, whichever is sooner; at the latest after 3 seconds.
  (function cardPictures() {
    let done = false;
    const go = () => {
      if (done) return; done = true;
      $$('.game-cover img[data-src]').forEach((im) => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
    };
    Promise.race([phoneFirst, new Promise((r) => setTimeout(r, 3000))]).then(go);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ens) => { if (ens[ens.length - 1].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '400px 0px' });
      io.observe($('#games'));
    } else go();
  })();

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
    new IntersectionObserver((ens) => {
      live = ens[ens.length - 1].isIntersecting;
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
      // (a game whose host can't be shown inside another site, like Playgama's,
      // opens its web-store page in this same tab; Back returns to the site)
      if (g.frame === false) { window.location.href = url; return; }
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
  // (two switch points, so it can't flicker back and forth at one spot)
  let tight = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (!tight && y > 24) tight = true; else if (tight && y < 6) tight = false;
    header.classList.toggle('scrolled', tight);
  };
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
