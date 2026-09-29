/* ==========================================================================
   MIZPAH INTERACTIVES — page behaviour around the game stage
   --------------------------------------------------------------------------
   Game cards, ride previews, stats, reveals, and pausing the canvas while it
   is scrolled out of view. The game itself is in game.js.
   ========================================================================== */
(function () {
  'use strict';

  const G = window.GVGame;
  const GAMES = window.GV_GAMES || [];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  G.init();

  /* ride previews assembled from the sprites */
  $$('[data-ride]').forEach((slot) => slot.appendChild(G.vehiclePreview(slot.dataset.ride)));

  /* ------------------------------------------- intro screen: door chips */
  // One chip per arcade door; clicking starts the game parked at that door.
  const chips = $('#door-chips');
  if (chips) {
    GAMES.forEach((g) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'door-chip';
      b.dataset.action = 'drive-to'; b.dataset.game = g.id;
      b.style.setProperty('--accent', g.color);
      b.setAttribute('aria-label', 'Drive to door ' + g.door + ': ' + g.name);
      b.innerHTML = `<span class="door-no">${g.door}</span><img src="${g.logo}" alt="" loading="lazy">`;
      chips.appendChild(b);
    });
  }

  /* ---------------------------------------------------------- game cards */
  const row = $('#card-row');
  GAMES.forEach((g, i) => {
    const card = document.createElement('article');
    card.className = 'gcard reveal';
    card.style.setProperty('--accent', g.color);
    card.style.setProperty('--delay', (i * 90) + 'ms');
    card.innerHTML = `
      <div class="gcard-media">
        <img class="gcard-cover" src="${g.cover}" alt="" loading="lazy">
        <span class="gcard-door">Door ${g.door}</span>
        <span class="gcard-shine" aria-hidden="true"></span>
      </div>
      <div class="gcard-body">
        <h3 class="gcard-title"><img class="gcard-logo" src="${g.logo}" alt="${g.name}"></h3>
        <p class="gcard-genre">${g.genre}</p>
        <p class="gcard-blurb">${g.blurb}</p>
        <div class="gcard-actions">
          <a class="btn-play sm" href="${g.url}" target="_blank" rel="noopener" aria-label="Play ${g.name} (opens in a new tab)">
            <span class="btn-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></span>Play
          </a>
          <button class="btn-ghost sm" type="button" data-action="drive-to" data-game="${g.id}" title="Start Monster Hills parked outside this game's door">Drive there</button>
        </div>
      </div>`;
    row.appendChild(card);

    // hover: the card tilts toward the pointer (cover image only, no video)
    if (canHover) {
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      });
      card.addEventListener('pointermove', (e) => {
        if (reduceMotion) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
        card.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
      });
    }
  });

  // coin count in the page text always matches the course
  $$('[data-coin-total]').forEach((el) => { el.textContent = G.coinsTotal; });

  /* ---------------------------------------------------------------- stats */
  function refreshStats() {
    $('#lifetime-coins').textContent = G.lifetimeCoins();
    const best = G.best(G.vehicle);
    const txt = best ? G.fmtTime(best) : '--:--.-';
    $$('[data-best-hero], [data-best-feature]').forEach((el) => { el.textContent = txt; });
  }
  refreshStats();
  window.addEventListener('gv:stats', refreshStats);
  window.addEventListener('gv:best', refreshStats);
  window.addEventListener('gv:vehicle', (e) => {
    refreshStats();
    // the featured card shows whichever ride is selected
    const slot = $('.fs-ride');
    if (slot && slot.dataset.ride !== e.detail.key) {
      slot.dataset.ride = e.detail.key;
      slot.replaceChildren(G.vehiclePreview(e.detail.key));
    }
  });
  if (G.vehicle !== 'truck') window.dispatchEvent(new CustomEvent('gv:vehicle', { detail: { key: G.vehicle } }));

  /* --------------------------------------- only simulate while on screen */
  const stage = $('#stage');
  let stageVisible = true;
  new IntersectionObserver((entries) => {
    stageVisible = entries[0].isIntersecting;
    G.setActive(stageVisible || G.mode === 'play');
  }, { threshold: 0.05 }).observe(stage);

  window.addEventListener('gv:mode', (e) => {
    G.setActive(true);
    document.documentElement.classList.toggle('lock', e.detail.mode === 'play');
  });

  /* Enter / Space starts the game from the hero */
  window.addEventListener('keydown', (e) => {
    if (G.mode !== 'attract' || !stageVisible) return;
    if (document.querySelector('.modal.open')) return;
    const t = e.target;
    if (t && t !== document.body && t.id !== 'game-canvas') return;
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); G.start(); }
  });

  /* ----------------------------------------------------------- motion fx */
  // stagger reveals inside the same parent so rows of cards arrive in order
  $$('.reveal').forEach((el) => {
    if (el.style.getPropertyValue('--delay')) return;
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--delay', (sibs.indexOf(el) * 90) + 'ms');
  });
  // scroll speed bar
  const meter = document.createElement('div'); meter.className = 'scroll-meter'; document.body.appendChild(meter);
  const onMeter = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    meter.style.setProperty('--scroll', max > 0 ? (scrollY / max).toFixed(4) : 0);
  };
  window.addEventListener('scroll', onMeter, { passive: true }); onMeter();
  // warp burst on starting a run, light wipe on changing theme
  const fx = (cls) => { const d = document.createElement('div'); d.className = cls; stage.appendChild(d); return d; };
  const warp = fx('warp-fx'), wipe = fx('theme-wipe');
  const replay = (el) => { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); };
  window.addEventListener('gv:mode', (e) => { if (e.detail.mode === 'play' && !reduceMotion) replay(warp); });
  let themeReady = false;
  window.addEventListener('gv:time', () => { if (themeReady && !reduceMotion) replay(wipe); });
  setTimeout(() => { themeReady = true; }, 500);
  // picking a ride makes it rev
  window.addEventListener('gv:vehicle', (e) => {
    if (reduceMotion) return;
    $$(`[data-ride="${e.detail.key}"] .ride`).forEach((r) => { r.classList.remove('rev'); void r.offsetWidth; r.classList.add('rev'); });
  });

  // pause the endless CSS animations of whatever is off screen
  const pauser = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('anim-paused', !en.isIntersecting));
  }, { rootMargin: '100px' });
  ['.hero', '.ticker', '#games', '#controls', '#contact', '.foot'].forEach((sel) => { const el = $(sel); if (el) pauser.observe(el); });

  /* ------------------------------------------------------ scroll reveals */
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  /* top bar goes solid once the page scrolls */
  const bar = $('.topbar');
  const onScroll = () => bar.classList.toggle('solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------- contact */
  // No mail server behind this static site: the form writes the message into
  // the visitor's own email app, addressed to the studio.
  const CONTACT_EMAIL = 'mispahinteractives@gmail.com';
  const form = $('#contact-form');
  const status = $('#contact-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let bad = null;
    ['name', 'email', 'message'].forEach((n) => {
      const f = form.elements[n];
      const ok = f.value.trim() && (n !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
      f.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = f;
    });
    if (bad) {
      status.textContent = 'Please fill in your name, a valid email and a message.';
      status.classList.add('err'); bad.focus();
      return;
    }
    const name = form.elements.name.value.trim(), from = form.elements.email.value.trim();
    const body = form.elements.message.value.trim() + '\n\n— ' + name + ' (' + from + ')';
    window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Hello from ' + name) +
      '&body=' + encodeURIComponent(body);
    status.textContent = 'Your email app should open with the message ready. If not, write to ' + CONTACT_EMAIL + '.';
    status.classList.remove('err');
  });
  form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const done = () => { b.textContent = 'Copied!'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, () => {});
  }));

  /* ------------------------------------------------------------ top menu */
  // the lit glider slides to the hovered/focused item and rests on the
  // section in view; a click adds a burst ring where you pressed
  const menu = $('.menu'), glider = $('.menu-glider');
  if (menu && glider) {
    const chips = $$('.menu-chip', menu);
    let active = null;
    const glideTo = (el) => {
      if (!el || el.classList.contains('is-hot')) { glider.style.setProperty('--go', 0); return; }
      glider.style.setProperty('--gx', el.offsetLeft + 'px');
      glider.style.setProperty('--gw', el.offsetWidth + 'px');
      glider.style.setProperty('--go', 1);
    };
    chips.forEach((c) => {
      c.addEventListener('pointerenter', () => glideTo(c));
      c.addEventListener('focus', () => glideTo(c));
      c.addEventListener('pointerdown', (e) => {
        const r = c.getBoundingClientRect(), b = document.createElement('span');
        b.className = 'mc-burst';
        b.style.setProperty('--bx', (e.clientX - r.left) + 'px'); b.style.setProperty('--by', (e.clientY - r.top) + 'px');
        c.appendChild(b); setTimeout(() => b.remove(), 520);
      });
    });
    menu.addEventListener('pointerleave', () => glideTo(active));
    // scroll spy: which section is in view
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        chips.forEach((c) => c.classList.toggle('is-active', c.dataset.spy === en.target.id));
        active = chips.find((c) => c.dataset.spy === en.target.id) || null;
        if (!menu.matches(':hover')) glideTo(active);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    ['stage', 'games', 'controls', 'contact'].forEach((sid) => { const el = document.getElementById(sid); if (el) spy.observe(el); });
    window.addEventListener('resize', () => glideTo(active));
  }

  /* mark touch devices so the pedals show even on hybrid laptops */
  window.addEventListener('touchstart', () => document.documentElement.classList.add('touch'), { once: true, passive: true });
})();
