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
        ${g.video ? '<video class="gcard-video" muted loop playsinline preload="none" aria-hidden="true"></video>' : ''}
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

    const video = $('.gcard-video', card);
    const media = $('.gcard-media', card);
    let loaded = false;
    const playPreview = () => {
      if (reduceMotion || !g.video) return;
      if (!loaded) {
        video.innerHTML = (g.videoWebm ? `<source src="${g.videoWebm}" type="video/webm">` : '') + `<source src="${g.video}" type="video/mp4">`;
        video.load(); loaded = true;
      }
      const p = video.play(); if (p && p.catch) p.catch(() => {});
      card.classList.add('previewing');
    };
    const stopPreview = () => { if (video) video.pause(); card.classList.remove('previewing'); };

    if (canHover) {
      card.addEventListener('pointerenter', playPreview);
      card.addEventListener('pointerleave', () => {
        stopPreview();
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
      card.addEventListener('focusin', playPreview);
      card.addEventListener('focusout', (e) => { if (!card.contains(e.relatedTarget)) stopPreview(); });
    } else {
      // touch: a tap on the artwork toggles the gameplay preview
      if (video) media.addEventListener('click', () => (video.paused ? playPreview() : stopPreview()));
    }
  });

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

  /* mark touch devices so the pedals show even on hybrid laptops */
  window.addEventListener('touchstart', () => document.documentElement.classList.add('touch'), { once: true, passive: true });
})();
