/* ==========================================================================
   MIZPHA GAMES — page behaviour around the game stage
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
    card.dataset.game = g.id;
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
          <a class="btn-play sm" href="${g.url}" data-play="${g.id}" aria-label="Play ${g.name}">
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

  /* Phones and small tablets: the cards become a swipe carousel (CSS). One
     card at a time sits in the middle, the next ones peek in at the sides,
     and a swipe snaps to the next game. The centred card is the active one
     (full size and lit); under the rail, arrows, a dot per game in its own
     colour and a "2 / 5" counter show where you are and jump to a game. */
  const cards = $$('.gcard', row);
  const nav = document.createElement('div');
  nav.className = 'rail-nav';
  nav.innerHTML = `
    <button class="rail-arrow" type="button" data-rail="-1" aria-label="Previous game"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg></button>
    <div class="rail-dots"></div>
    <span class="rail-count" aria-live="polite"></span>
    <button class="rail-arrow" type="button" data-rail="1" aria-label="Next game"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z"/></svg></button>`;
  row.after(nav);
  const dots = $('.rail-dots', nav), count = $('.rail-count', nav);
  cards.forEach((c, i) => {
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'rail-dot';
    d.style.setProperty('--accent', GAMES[i].color);
    d.setAttribute('aria-label', 'Show ' + GAMES[i].name);
    d.addEventListener('click', () => goTo(i));
    dots.appendChild(d);
  });
  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle('is-active', k === i));
    $$('.rail-dot', dots).forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    count.textContent = (i + 1) + ' / ' + cards.length;
    $$('.rail-arrow', nav).forEach((b) => { b.disabled = (b.dataset.rail < 0 && i === 0) || (b.dataset.rail > 0 && i === cards.length - 1); });
  }
  function goTo(i) {
    const c = cards[Math.max(0, Math.min(cards.length - 1, i))];
    if (c) row.scrollTo({ left: c.offsetLeft - (row.clientWidth - c.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  // the active card is whichever is nearest the middle of the rail
  let ticking = false;
  row.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const mid = row.scrollLeft + row.clientWidth / 2;
      let best = 0, bd = Infinity;
      cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      setActive(best);
    });
  }, { passive: true });
  nav.addEventListener('click', (e) => { const b = e.target.closest('[data-rail]'); if (b) goTo(active + Number(b.dataset.rail)); });
  setActive(0);

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

  /* --------------------------------------------------------- game player */
  /* Games play inside the site: a full-screen player opens over the page
     with the game in a frame, and a bar with its logo, Full screen and
     Close. Monster Hills is held (frozen and silent) while it's open, the
     page can't scroll, and Back or Esc closes it. Closing removes the frame,
     which stops the game and its sound. The URL never changes, so a reload
     still opens on the intro. Portrait games get a phone-shaped screen on
     wide displays; landscape games fill the player. */
  const Player = (function () {
    const el = $('#player');
    if (!el) return null;
    const stage = $('[data-player-stage]', el), load = $('[data-player-load]', el);
    const full = $('[data-player-full]', el);
    const canFull = !!(el.requestFullscreen || el.webkitRequestFullscreen);
    if (!canFull) full.hidden = true;                   // (iPhone Safari can't, and the player is full-screen anyway)
    let game = null, frame = null, pushed = false, back = null, token = 0;

    function open(g) {
      if (!g || !g.url) return;
      if (game) close('swap');                         // another game: swap it in, keep the player and history
      else back = document.activeElement;
      game = g; token++;
      el.style.setProperty('--accent', g.color || '#ffc83d');
      el.classList.toggle('is-portrait', g.shape !== 'landscape');
      $('[data-player-logo]', el).src = g.logo; $('[data-player-logo]', el).alt = g.name;
      $('[data-player-load-logo]', el).src = g.logo;
      $('[data-player-title]', el).textContent = g.name;
      $('[data-player-genre]', el).textContent = g.genre || '';
      frame = document.createElement('iframe');
      frame.className = 'player-frame';
      frame.title = g.name;
      frame.src = g.url;
      frame.allow = 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; screen-wake-lock';
      frame.setAttribute('allowfullscreen', '');
      frame.addEventListener('load', () => { el.classList.add('loaded'); try { frame.focus(); } catch (e) { /* cross-origin */ } });
      // show the player first: a game that measures its window as it boots
      // must see its real size, not a hidden (zero-size) frame
      el.classList.remove('loaded');
      el.hidden = false;
      stage.appendChild(frame);
      requestAnimationFrame(() => el.classList.add('open'));
      document.documentElement.classList.add('player-on');
      G.hold(true);
      // Back (or a swipe back on a phone) closes the game instead of leaving
      // the site; the URL itself stays the same
      if (!pushed) { history.pushState({ gvPlayer: true }, ''); pushed = true; }
      setTimeout(() => $('[data-player-close]', el).focus({ preventScroll: true }), 60);
    }
    function close(how) {
      if (!game) return;
      game = null;
      const mine = ++token, f = frame;
      frame = null;
      if (how === 'swap') { if (f) f.remove(); return; }
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      el.classList.remove('open');
      setTimeout(() => { if (f) f.remove(); if (token === mine) { el.hidden = true; el.classList.remove('loaded'); } }, 260);
      document.documentElement.classList.remove('player-on');
      G.hold(false);
      if (pushed && how !== 'history') history.back();
      pushed = false;
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    $('[data-player-close]', el).addEventListener('click', () => close());
    full.addEventListener('click', () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    });
    window.addEventListener('popstate', () => { if (game) { pushed = false; close('history'); } });
    window.addEventListener('keydown', (e) => { if (game && e.code === 'Escape') { e.preventDefault(); close(); } });
    return { open, close, get game() { return game; } };
  })();
  window.GVPlayer = Player;
  // every Play button on the page opens its game in the player
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-play]');
    if (!a || !Player || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;   // (a modified click still opens a tab)
    const g = GAMES.find((x) => x.id === a.dataset.play);
    if (!g) return;
    e.preventDefault();
    Player.open(g);
  });

  /* --------------------------------------- Christmas: strings of lights */
  // Strings of glass bulbs draped in swags: under the top bar, across the
  // top of every stop, along the footer and across the win and fail cards. Each bulb twinkles at its own
  // pace. They're always in the page; CSS only shows them while the
  // Christmas theme is on (html.is-christmas).
  (function () {
    const COLORS = ['#ff4b4b', '#ffd34d', '#46d67a', '#5fb2ff', '#ff7ad9', '#ff9a3c'];
    const PER = 5, GAP = 38, SAG = 12;                   // bulbs per swag, spacing, how far a swag droops
    function lights(where, cls, n) {
      const el = document.createElement('div');
      el.className = 'xmas-lights ' + cls; el.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < n; i++) {
        const b = document.createElement('i'), u = ((i % PER) + 0.5) / PER;
        b.style.setProperty('--c', COLORS[i % COLORS.length]);
        b.style.setProperty('--y', (Math.sin(Math.PI * u) * SAG).toFixed(1) + 'px');
        b.style.setProperty('--d', ((i * 0.37) % 1.9).toFixed(2) + 's');
        b.style.setProperty('--t', (1.2 + ((i * 0.53) % 1.1)).toFixed(2) + 's');
        b.style.setProperty('--r', ((u - 0.5) * 24).toFixed(0) + 'deg');
        el.appendChild(b);
      }
      where.prepend(el);
    }
    const topbar = $('.topbar');
    if (topbar) lights(topbar, 'is-top', 70);
    $$('section.stop').forEach((sec) => lights(sec, 'is-stop', 70));
    const foot = $('.foot');
    if (foot) lights(foot, 'is-foot', 50);
    $$('#modal-finish .finish-panel, #modal-fail .fail-panel').forEach((p) => lights(p, 'is-panel', 18));
    // twinkle only the strings that are on screen
    const strings = $$('.xmas-lights');
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle('live', en.isIntersecting)));
      strings.forEach((el) => io.observe(el));
    } else if (!reduceMotion) strings.forEach((el) => el.classList.add('live'));
  })();

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
    if (document.querySelector('.modal.open') || (Player && Player.game)) return;
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
  ['.hero', '.ticker', '#services', '#games', '#clients', '#demos', '#contact', '.foot', '.worldmap'].forEach((sel) => { const el = $(sel); if (el) pauser.observe(el); });

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
  // Messages go out in the background, so the visitor's email app never
  // opens: the form posts to an email API that works on static hosting such
  // as GitHub Pages, and the API emails the studio. With a Web3Forms access
  // key (site.js, contactKey) it uses Web3Forms; without one it uses
  // FormSubmit, which needs no key: the very first message sends a one-time
  // "Activate Form" email to the studio inbox, and after one click every
  // message arrives. If sending fails the visitor gets a one-click email link.
  const SITE = window.GV_SITE || {};
  const CONTACT_EMAIL = SITE.email || 'mizphagamestudios@gmail.com';
  const CONTACT_KEY = (SITE.contactKey || '').trim();
  const SEND_URL = CONTACT_KEY ? 'https://api.web3forms.com/submit' : 'https://formsubmit.co/ajax/' + CONTACT_EMAIL;
  const form = $('#contact-form'), status = $('#contact-status'), sent = $('#contact-sent');
  const sendBtn = $('[data-send]', form), sendLabel = $('[data-send-label]', form);
  status.textContent = 'We’ll reply to the email address you give us.';
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
    sendBtn.disabled = on; sendBtn.classList.toggle('is-sending', on);
    sendLabel.textContent = on ? 'Sending…' : 'Send message';
  };
  const mailtoHref = (name, from, message) => 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Hello from ' + name) +
    '&body=' + encodeURIComponent(message + '\n\n— ' + name + ' (' + from + ')');
  function showSent(name, from) {
    $('[data-sent-text]', sent).textContent = `Thanks, ${name}! Your message is on its way. We’ll reply to ${from}.`;
    form.hidden = true; sent.hidden = false;
    sent.classList.remove('in'); void sent.offsetWidth; sent.classList.add('in');
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
        const e = new Error(data.message || 'The server said no (' + res.status + ').');
        e.activation = /activat/i.test(data.message || '');
        throw e;
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
    status.textContent = 'We’ll reply to the email address you give us.'; status.classList.remove('err');
    form.elements.name.focus();
  });

  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    const done = () => { b.textContent = 'Copied!'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, () => {});
  }));

  /* mark touch devices so the pedals show even on hybrid laptops */
  window.addEventListener('touchstart', () => document.documentElement.classList.add('touch'), { once: true, passive: true });
})();
