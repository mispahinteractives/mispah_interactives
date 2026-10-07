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
  const CONTACT_EMAIL = SITE.email || 'mispahinteractives@gmail.com';
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
          subject: 'New message from ' + name + ' · Mizpah Interactives website',
          from_name: 'Mizpah Interactives website',
          name, email: from, message, botcheck: false
        } : {
          _subject: 'New message from ' + name + ' · Mizpah Interactives website',
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
