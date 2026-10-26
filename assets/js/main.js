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

  /* ------------------------------------------------------------- icons */
  const ICON = {
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d1ff" d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.6-9.7z"/><path fill="#00e676" d="M16.7 8.6 5.3 2c-.7-.4-1.3-.4-1.7.3l9.6 9.7z"/><path fill="#ffd600" d="m16.7 8.6-3.5 3.4 3.5 3.4 3.9-2.2c1.2-.7 1.2-1.8 0-2.5z"/><path fill="#ff3d57" d="m13.2 12-9.6 9.7c.4.6 1 .7 1.7.3l11.4-6.6z"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
  };
  const SERVICE_ICON = {
    pad: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17.5" cy="13.5" r=".6"/>',
    html5: '<path d="M4 3h16l-1.5 16L12 21l-6.5-2z"/><path d="M15.5 7.5h-7l.3 3.5h6.4l-.4 4-2.8.9-2.8-.9-.1-1.6"/>',
    mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18M7 13h5M7 16h8"/>',
    brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2.5 20 2.5 20s3.5.5 5.5-1 2-3 1-4"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'
  };

  /* ------------------------------------------------------------- intro */
  $$('[data-game-count]').forEach((el) => { el.textContent = MG.games.length; });
  // three covers fanned out and floating, with the featured game in front
  const stack = $('#hero-stack');
  ['learning-adventure', 'monster-hills', 'uno-clash'].forEach((id) => {
    const g = MG.games.find((x) => x.id === id);
    if (!g) return;
    const f = document.createElement('figure');
    f.innerHTML = `<img src="${esc(g.cover)}" alt="" loading="eager">`;
    stack.appendChild(f);
  });

  /* ------------------------------------------------------------- games */
  // The first game is featured (a big card). Every game shows the App Store
  // and Google Play badges: with a link (data.js) they open the store; until
  // then they show "Coming soon". Play on the web opens the game player.
  const STORE = {
    app: { name: 'App Store', title: 'the App Store', small: 'Download on the', icon: ICON.apple, key: 'appStore', device: 'iPhone and iPad' },
    play: { name: 'Google Play', title: 'Google Play', small: 'Get it on', icon: ICON.play, key: 'playStore', device: 'Android phones and tablets' }
  };
  const badge = (g, which) => {
    const st = STORE[which], link = (g.stores || {})[st.key];
    const inner = `${st.icon}<span><small>${st.small}</small><b>${st.name}</b></span>`;
    return link
      ? `<a class="badge" href="${esc(link)}" target="_blank" rel="noopener" aria-label="${esc(g.name)} on ${st.name}">${inner}</a>`
      : `<button class="badge" type="button" data-soon="${which}" data-game="${esc(g.id)}" aria-label="${esc(g.name)} on ${st.name}: coming soon">${inner}</button>`;
  };
  const list = $('#games-list');
  MG.games.forEach((g, i) => {
    const web = webUrl(g);
    const card = document.createElement('article');
    card.className = 'game reveal' + (i === 0 ? ' featured' : '');
    card.style.setProperty('--d', (i % 3) * 90 + 'ms');
    card.innerHTML = `
      <div class="game-cover">
        <img src="${esc(g.cover)}" alt="${esc(g.name)}" loading="lazy">
        <span class="game-tag">${esc(g.genre)}</span>
        ${i === 0 ? '<span class="feature-flag">Featured</span>' : ''}
      </div>
      <div class="game-body">
        <h3>${esc(g.name)}</h3>
        <p class="game-blurb">${esc(g.blurb)}</p>
        <div class="game-actions">
          ${badge(g, 'app')}${badge(g, 'play')}
          ${web ? `<a class="play-web" href="${esc(web)}" data-play="${esc(g.id)}">${ICON.web}Play on web</a>` : ''}
        </div>
      </div>`;
    list.appendChild(card);
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

  /* ----------------------------------------------------- scroll reveals */
  // content rises softly into place as it comes into view (once)
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
