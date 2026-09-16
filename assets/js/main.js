/* ==========================================================================
   Mispah Interactives — site behaviour
   Renders every section from window.SITE (assets/js/content.js), then wires
   navigation, scroll reveals, the video showcase and the contact form.
   No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S) { console.error('content.js failed to load'); return; }

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function setText(sel, text) { $$(sel).forEach(function (n) { n.textContent = text; }); }

  /* ------------------------------------------------------------------ icons */
  var ICONS = {
    spark:   '<path d="M12 2l2.2 6.1L20 10l-5.8 2L12 18l-2.2-6L4 10l5.8-1.9L12 2z"/>',
    code:    '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    players: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.2a3.2 3.2 0 010 5.6M17.6 20a6.4 6.4 0 00-1.8-4.5"/>',
    gamepad: '<path d="M7 11h4M9 9v4M15.5 10.5h.01M18 13h.01"/><path d="M17.5 6h-11A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18c1.6 0 2.3-.8 3-1.5h5c.7.7 1.4 1.5 3 1.5a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z"/>',
    html5:   '<path d="M4 3l1.6 17.2L12 22l6.4-1.8L20 3H4z"/><path d="M16.2 7.5H8.4l.25 2.7h7.3l-.7 7-3.25.9-3.3-.9-.2-2.3"/>',
    mobile:  '<rect x="6" y="2" width="12" height="20" rx="2.6"/><path d="M11 18.2h2"/>',
    design:  '<path d="M3 8.5h18M8.5 3v18"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
    brush:   '<path d="M13.5 3.5l7 7L11 20a4.5 4.5 0 01-6.4-6.3L13.5 3.5z"/><path d="M5 14.5l4.5 4.5"/>',
    web:     '<circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.6 3.9 6 3.9 9.2s-1.3 6.6-3.9 9.2c-2.6-2.6-3.9-6-3.9-9.2S9.4 5.4 12 2.8z"/>',
    chip:    '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/>',
    wave:    '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-1.5"/>',
    shield:  '<path d="M12 2.8l7.5 3v5.5c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10V5.8l7.5-3z"/><path d="M9 12l2.2 2.2L15.4 10"/>',
    mail:    '<rect x="2.5" y="4.8" width="19" height="14.4" rx="2.4"/><path d="M3 6.5l9 6.2 9-6.2"/>',
    phone:   '<path d="M6.3 3h3l1.6 4.1-2 1.3a12.5 12.5 0 006.7 6.7l1.3-2 4.1 1.6v3a2 2 0 01-2.2 2A17.5 17.5 0 014.3 5.2 2 2 0 016.3 3z"/>',
    pin:     '<path d="M12 21.5s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z"/><circle cx="12" cy="10.4" r="2.6"/>',
    play:    '<path d="M8 5.2v13.6L19 12 8 5.2z" fill="currentColor" stroke="none"/>',
    arrow:   '<path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5"/>',
    linkedin:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.4 10.6v6.1M7.4 7.5v.02M11.4 16.7v-6.1M11.4 13.3a2.4 2.4 0 014.8 0v3.4"/>',
    x:       '<path d="M4 4l16 16M20 4L4 20"/>',
    instagram:'<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.9h.01"/>',
    youtube: '<rect x="2.4" y="5.4" width="19.2" height="13.2" rx="4"/><path d="M10.2 9.4l5 2.6-5 2.6V9.4z" fill="currentColor" stroke="none"/>',
    facebook:'<path d="M14.8 21v-8.2h2.7l.4-3.1h-3.1V7.7c0-.9.25-1.5 1.55-1.5H18V3.4A21 21 0 0015.6 3.3c-2.4 0-4 1.45-4 4.1v2.3H9v3.1h2.6V21"/>'
  };
  function icon(name, size) {
    var body = ICONS[name] || ICONS.spark;
    return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
           '" fill="none" stroke="currentColor" stroke-width="1.7" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
           body + '</svg>';
  }

  /* Wraps the final word(s) of a heading in a gradient span */
  function gradientTail(text, words) {
    var parts = String(text).trim().split(/\s+/);
    var n = Math.min(words || 2, parts.length);
    var head = parts.slice(0, parts.length - n).join(' ');
    var tail = parts.slice(parts.length - n).join(' ');
    return (head ? esc(head) + ' ' : '') + '<span class="grad">' + esc(tail) + '</span>';
  }

  /* ================================================================ HEADER */
  function buildNav() {
    var list = $('#navList');
    S.nav.forEach(function (item) {
      var li = el('li');
      var a  = el('a', 'nav-link');
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      list.appendChild(li);
    });

    // CTA repeated inside the mobile drawer
    var ctaLi = el('li', 'nav-cta-mobile');
    var ctaA  = el('a', 'btn btn-primary');
    ctaA.href = S.navCta.href;
    ctaA.textContent = S.navCta.label;
    ctaLi.appendChild(ctaA);
    list.appendChild(ctaLi);

    var headerCta = $('#headerCta');
    headerCta.href = S.navCta.href;
    headerCta.textContent = S.navCta.label;

    setText('[data-company-name]', S.company.shortName || S.company.name);
  }

  function wireHeader() {
    var header = $('#siteHeader');
    var toggle = $('#navToggle');
    var nav    = $('#primaryNav');
    var scrim  = $('#navScrim');

    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function closeMenu() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      nav.classList.remove('is-open');
      scrim.classList.remove('is-open');
      setTimeout(function () { if (!nav.classList.contains('is-open')) scrim.hidden = true; }, 300);
      document.body.classList.remove('no-scroll');
    }
    function openMenu() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      nav.classList.add('is-open');
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('is-open'); });
    }

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu();
    });
    scrim.addEventListener('click', closeMenu);
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    });
    // Reset when resizing back up to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    });
  }

  /* Highlights the nav link for the section currently on screen */
  function wireScrollSpy() {
    var links = $$('#navList .nav-link');
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#' && id.length > 1) {
        var sec = document.getElementById(id.slice(1));
        if (sec) map[id.slice(1)] = a;
      }
    });
    var ids = Object.keys(map);
    if (!ids.length) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var active = map[entry.target.id];
        if (active) active.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    ids.forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  /* ================================================================== HERO */
  function buildHero() {
    var h = S.hero;
    setText('[data-hero-eyebrow]', h.eyebrow);
    $('[data-hero-heading]').innerHTML = gradientTail(h.heading, 2);
    setText('[data-hero-sub]', h.subheading);

    var c1 = $('[data-hero-cta1]'), c2 = $('[data-hero-cta2]');
    c1.href = h.primaryCta.href;   c1.textContent = h.primaryCta.label;
    c2.href = h.secondaryCta.href; c2.textContent = h.secondaryCta.label;

    // Badges summarise real capabilities drawn from the services list
    var badges = $('#heroBadges');
    ['HTML5 Games', 'Mobile Games', 'Playable Ads', 'Web Development'].forEach(function (t) {
      badges.appendChild(el('li', null, esc(t)));
    });

    var art = h.art || {};
    var frame = el('div', 'art-frame');
    var inner = el('div', 'art-inner');

    // Poster first; the clip is attached only once the hero is on screen
    var img = el('img');
    img.src = art.poster;
    img.alt = art.alt || '';
    img.width = 1280; img.height = 720;
    img.setAttribute('fetchpriority', 'high');
    img.decoding = 'async';
    inner.appendChild(img);

    if (art.video && !reduceMotion) {
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'none';
      v.poster = art.poster;
      v.setAttribute('aria-hidden', 'true');
      v.style.position = 'absolute';
      v.style.inset = '0';
      v.style.opacity = '0';
      v.style.transition = 'opacity .8s ease';
      inner.appendChild(v);

      // Attach sources only once the page is idle, so the decorative loop
      // never competes with the first paint. Then play/pause on visibility.
      var started = false;
      function attach() {
        if (started) return;
        started = true;
        if (art.videoWebm) {
          var sw = document.createElement('source');
          sw.src = art.videoWebm; sw.type = 'video/webm';
          v.appendChild(sw);
        }
        var sm = document.createElement('source');
        sm.src = art.video; sm.type = 'video/mp4';
        v.appendChild(sm);
        v.load();
        v.addEventListener('playing', function () { v.style.opacity = '1'; }, { once: true });
      }

      var whenIdle = function (fn) {
        if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2500 });
        else setTimeout(fn, 1200);
      };
      var afterLoad = function (fn) {
        if (document.readyState === 'complete') whenIdle(fn);
        else window.addEventListener('load', function () { whenIdle(fn); }, { once: true });
      };

      var visible = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible) {
            afterLoad(function () {
              if (!visible) return;
              attach();
              var p = v.play();
              if (p && p.catch) p.catch(function () { /* autoplay blocked — poster stays */ });
            });
          } else if (started) {
            v.pause();
          }
        });
      }, { threshold: 0.25 });
      io.observe(inner);
    }

    inner.appendChild(el('span', 'art-glass'));

    var tag = el('div', 'art-tag', 'Live Gameplay');
    inner.appendChild(tag);

    if (art.logo) {
      var lg = el('img', 'art-logo');
      lg.src = art.logo; lg.alt = ''; lg.setAttribute('aria-hidden', 'true');
      lg.loading = 'lazy'; lg.decoding = 'async';
      inner.appendChild(lg);
    }

    frame.appendChild(inner);

    var float = el('div', 'art-float');
    float.innerHTML =
      '<span class="art-float-icon">' + icon('gamepad', 18) + '</span>' +
      '<span><strong>' + esc(String(S.games.length)) + ' games shipped</strong>' +
      '<span>HTML5 &bull; Mobile &bull; Web</span></span>';
    frame.appendChild(float);

    $('#heroArt').appendChild(frame);
  }

  /* ================================================================= ABOUT */
  function buildAbout() {
    var a = S.about;
    $('[data-about-heading]').innerHTML = gradientTail(a.heading, 1);
    setText('[data-about-body]', a.body);

    var img = $('#aboutImage');
    img.src = a.image.src;
    img.alt = a.image.alt;

    var list = $('#aboutHighlights');
    a.highlights.forEach(function (h) {
      var li = el('li', 'highlight');
      li.innerHTML =
        '<span class="highlight-icon">' + icon(h.icon, 20) + '</span>' +
        '<span><h3>' + esc(h.title) + '</h3><p>' + esc(h.text) + '</p></span>';
      list.appendChild(li);
    });
  }

  /* ================================================================= GAMES */
  function buildGames() {
    var wrap = $('#gamesList');

    S.games.forEach(function (g) {
      var card = el('article', 'game-card');
      card.id = 'game-' + g.id;

      var media = el('div', 'game-media');
      var img = el('img');
      img.src = g.thumb; img.alt = g.name + ' gameplay';
      img.loading = 'lazy'; img.decoding = 'async';
      img.width = 1280; img.height = 720;
      media.appendChild(img);

      if (g.video) {
        var play = el('button', 'game-play');
        play.type = 'button';
        play.setAttribute('aria-label', 'Watch ' + g.name + ' gameplay');
        play.innerHTML = '<span class="game-play-ring">' + icon('play', 24) + '</span>';
        play.addEventListener('click', function () { openLightbox(g.name, g.video); });
        media.appendChild(play);
      }

      var body = el('div', 'game-body');
      var logoHtml = g.logo
        ? '<img class="game-logo" src="' + esc(g.logo) + '" alt="' + esc(g.name) + ' logo" loading="lazy" decoding="async">'
        : '';
      body.innerHTML =
        logoHtml +
        '<h3 class="game-name">' + esc(g.name) + '</h3>' +
        '<span class="game-tagline">' + esc(g.tagline) + '</span>' +
        '<p class="game-desc">' + esc(g.description) + '</p>' +
        '<ul class="platforms">' +
          g.platforms.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
        '</ul>';

      var actions = el('div', 'game-actions');
      if (g.play) {
        var playNow = el('button', 'btn btn-primary');
        playNow.type = 'button';
        playNow.innerHTML = icon('gamepad', 16) + ' Play Now';
        playNow.addEventListener('click', function () { openPlayer(g); });
        actions.appendChild(playNow);
      }
      if (g.url) {
        var view = el('a', 'btn ' + (g.play ? 'btn-ghost' : 'btn-primary'));
        view.href = g.url; view.target = '_blank'; view.rel = 'noopener';
        view.innerHTML = 'View Game ' + icon('arrow', 16);
        actions.appendChild(view);
      }
      if (g.video) {
        var watch = el('button', 'btn ' + (g.play || g.url ? 'btn-ghost' : 'btn-primary'));
        watch.type = 'button';
        watch.innerHTML = icon('play', 15) + ' Watch Gameplay';
        watch.addEventListener('click', function () { openLightbox(g.name, g.video); });
        actions.appendChild(watch);
      }
      body.appendChild(actions);

      if (g.shots && g.shots.length) {
        var shots = el('div', 'game-shots');
        g.shots.forEach(function (s) {
          var t = el('img');
          t.src = s.src; t.alt = s.alt;
          t.loading = 'lazy'; t.decoding = 'async';
          t.title = 'View screenshot';
          t.addEventListener('click', function () { openImageBox(g.name, s); });
          shots.appendChild(t);
        });
        body.appendChild(shots);
      }

      card.appendChild(media);
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  /* ============================================================== SHOWCASE */
  var stageVideo = null;

  function buildShowcase() {
    var sc = S.showcase;
    $('[data-showcase-heading]').innerHTML = gradientTail(sc.heading, 2);
    setText('[data-showcase-sub]', sc.subheading);

    var withVideo = S.games.filter(function (g) { return !!g.video; });
    var showcaseSection = $('#showcase');

    if (!withVideo.length) { showcaseSection.hidden = true; return; }

    var featured = withVideo.filter(function (g) { return g.id === sc.featuredGameId; })[0] || withVideo[0];
    mountStage(featured);

    var reel = $('#videoReel');
    withVideo.forEach(function (g) {
      var li = el('li', 'reel-card' + (g.id === featured.id ? ' is-active' : ''));
      li.dataset.gameId = g.id;
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.innerHTML =
        '<div class="reel-thumb">' +
          '<img src="' + esc(g.video.poster) + '" alt="' + esc(g.name) + ' gameplay thumbnail" loading="lazy" decoding="async" width="1280" height="720">' +
          '<span class="reel-play">' + icon('play', 15) + '</span>' +
        '</div>' +
        '<div class="reel-body"><h3>' + esc(g.name) + '</h3>' +
        '<p>' + esc(g.tagline) + ' &mdash; Watch Gameplay</p></div>';

      function activate() {
        $$('.reel-card', reel).forEach(function (c) { c.classList.remove('is-active'); });
        li.classList.add('is-active');
        mountStage(g, true);
        $('#videoStage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
      li.addEventListener('click', activate);
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
      reel.appendChild(li);
    });

    // Arrows appear only when the reel actually overflows
    var prev = $('#reelPrev'), next = $('#reelNext');
    function syncArrows() {
      var overflow = reel.scrollWidth > reel.clientWidth + 8;
      prev.hidden = next.hidden = !overflow;
    }
    prev.addEventListener('click', function () { reel.scrollBy({ left: -reel.clientWidth * 0.8, behavior: 'smooth' }); });
    next.addEventListener('click', function () { reel.scrollBy({ left:  reel.clientWidth * 0.8, behavior: 'smooth' }); });
    syncArrows();
    window.addEventListener('resize', syncArrows);
  }

  /* Builds the big 16:9 player. `autoplay` is true only after a user click. */
  function mountStage(game, autoplay) {
    var stage = $('#videoStage');
    stage.innerHTML = '';

    var inner = el('div', 'stage-inner');

    var video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'none';                       // nothing downloads until asked
    video.poster = game.video.poster;
    video.width = 1280; video.height = 720;
    video.setAttribute('aria-label', game.name + ' gameplay video');

    if (game.video.webm) {
      var srcW = document.createElement('source');
      srcW.src = game.video.webm; srcW.type = 'video/webm';
      video.appendChild(srcW);
    }
    if (game.video.mp4) {
      var srcM = document.createElement('source');
      srcM.src = game.video.mp4; srcM.type = 'video/mp4';
      video.appendChild(srcM);
    }
    video.appendChild(document.createTextNode(
      'Your browser does not support embedded video. '
    ));

    inner.appendChild(video);

    var overlay = el('button', 'stage-overlay');
    overlay.type = 'button';
    overlay.setAttribute('aria-label', 'Play ' + game.name + ' gameplay');
    overlay.innerHTML = '<span class="play-btn">' + icon('play', 40) + '</span>';

    var label = el('div', 'stage-label');
    label.innerHTML = '<strong>' + esc(game.name) + '</strong><span>' + esc(game.tagline) + '</span>';

    function start() {
      video.preload = 'auto';
      overlay.classList.add('is-hidden');
      label.style.opacity = '0';
      var p = video.play();
      if (p && p.catch) p.catch(function () { overlay.classList.remove('is-hidden'); });
    }
    overlay.addEventListener('click', start);

    video.addEventListener('pause', function () {
      if (video.currentTime === 0 || video.ended) overlay.classList.remove('is-hidden');
    });
    video.addEventListener('play', function () {
      overlay.classList.add('is-hidden');
      label.style.opacity = '0';
    });
    video.addEventListener('ended', function () {
      overlay.classList.remove('is-hidden');
      label.style.opacity = '';
    });
    label.style.transition = 'opacity .3s ease';

    inner.appendChild(overlay);
    inner.appendChild(label);
    stage.appendChild(inner);

    stageVideo = video;
    if (autoplay) start();
  }

  /* =========================================================== GAME PLAYER */
  /* Loads a playable build into an iframe. The iframe is created on open and
     destroyed on close, so a 15MB game never costs anything until asked for. */
  var player = {}, playerLastFocus = null;

  function initPlayer() {
    player.root    = $('#gamePlayer');
    player.panel   = $('.player-panel', player.root);
    player.stage   = $('#playerStage');
    player.loading = $('#playerLoading');
    player.title   = $('#playerTitle');
    player.sub     = $('#playerSub');
    player.logo    = $('#playerLogo');
    player.weight  = $('#playerWeight');
    player.close   = $('#playerClose');
    player.fs      = $('#playerFullscreen');

    player.close.addEventListener('click', closePlayer);
    $$('[data-close-player]').forEach(function (n) { n.addEventListener('click', closePlayer); });

    player.fs.addEventListener('click', function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else {
        var el = player.panel;
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
          var p = req.call(el);
          if (p && p.catch) p.catch(function () {});
        }
      }
    });

    window.addEventListener('keydown', function (e) {
      if (player.root.hidden) return;
      // Esc inside fullscreen exits fullscreen first; the browser handles that
      if (e.key === 'Escape' && !(document.fullscreenElement || document.webkitFullscreenElement)) {
        closePlayer();
      }
    });
  }

  function openPlayer(game) {
    if (!game.play) return;
    playerLastFocus = document.activeElement;

    // stop any media that's already running
    if (stageVideo && !stageVideo.paused) stageVideo.pause();

    player.title.textContent = game.name;
    player.sub.textContent   = game.tagline;
    player.weight.textContent = game.play.weight ? ' (' + game.play.weight + ')' : '';

    if (game.logo) {
      player.logo.src = game.logo;
      player.logo.alt = '';
      player.logo.hidden = false;
    } else {
      player.logo.hidden = true;
    }

    player.stage.classList.toggle('is-portrait', game.play.orientation === 'portrait');
    player.loading.classList.remove('is-done');

    // drop any previous iframe before building the new one
    var old = $('iframe', player.stage);
    if (old) old.remove();

    var frame = document.createElement('iframe');
    frame.title = game.name + ' — playable game';
    frame.setAttribute('allow', 'autoplay; fullscreen; gamepad; accelerometer; gyroscope');
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', function () {
      player.loading.classList.add('is-done');
    }, { once: true });
    frame.src = game.play.src;
    player.stage.appendChild(frame);

    player.root.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { player.root.classList.add('is-open'); });
    setTimeout(function () { player.close.focus(); }, 60);
  }

  function closePlayer() {
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      var exit = d.exitFullscreen || d.webkitExitFullscreen;
      if (exit) { var p = exit.call(d); if (p && p.catch) p.catch(function () {}); }
    }
    player.root.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () {
      player.root.hidden = true;
      var frame = $('iframe', player.stage);
      if (frame) frame.remove();          // unloads the build & frees memory
      player.loading.classList.remove('is-done');
      if (playerLastFocus && playerLastFocus.focus) playerLastFocus.focus();
    }, 320);
  }

  /* ============================================================== LIGHTBOX */
  var lb = {}, lastFocus = null;

  function initLightbox() {
    lb.root  = $('#lightbox');
    lb.title = $('#lightboxTitle');
    lb.body  = $('#lightboxVideo');
    lb.close = $('#lightboxClose');

    lb.close.addEventListener('click', closeLightbox);
    $$('[data-close-lightbox]').forEach(function (n) { n.addEventListener('click', closeLightbox); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.root.hidden) closeLightbox();
      if (e.key === 'Tab' && !lb.root.hidden) trapFocus(e);
    });
  }

  function trapFocus(e) {
    var focusables = $$('button, [href], video, input, textarea', lb.root)
      .filter(function (n) { return n.offsetParent !== null || n.tagName === 'VIDEO'; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function showLightbox(title, contentNode) {
    lastFocus = document.activeElement;
    if (stageVideo && !stageVideo.paused) stageVideo.pause();

    lb.title.textContent = title;
    lb.body.innerHTML = '';
    lb.body.appendChild(contentNode);

    lb.root.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { lb.root.classList.add('is-open'); });
    setTimeout(function () { lb.close.focus(); }, 60);
  }

  function openLightbox(title, video) {
    var v = document.createElement('video');
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.poster = video.poster;
    v.setAttribute('aria-label', title + ' gameplay video');

    if (video.webm) {
      var sw = document.createElement('source');
      sw.src = video.webm; sw.type = 'video/webm';
      v.appendChild(sw);
    }
    if (video.mp4) {
      var sm = document.createElement('source');
      sm.src = video.mp4; sm.type = 'video/mp4';
      v.appendChild(sm);
    }
    showLightbox(title + ' — Gameplay', v);

    var p = v.play();
    if (p && p.catch) p.catch(function () { /* user can press play */ });
  }

  function openImageBox(title, shot) {
    var img = el('img');
    img.src = shot.src;
    img.alt = shot.alt || title;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    showLightbox(title, img);
  }

  function closeLightbox() {
    lb.root.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () {
      lb.root.hidden = true;
      lb.body.innerHTML = '';            // stops playback & frees the buffer
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 320);
  }

  /* ========================================= SERVICES / PROCESS / WHY etc. */
  function buildServices() {
    var grid = $('#servicesGrid');
    S.services.forEach(function (s) {
      var c = el('article', 'svc-card');
      c.innerHTML =
        '<span class="svc-icon">' + icon(s.icon, 23) + '</span>' +
        '<h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>';
      grid.appendChild(c);
    });
  }

  function buildProcess() {
    var ol = $('#processTimeline');
    S.process.forEach(function (p) {
      var li = el('li', 'step');
      li.innerHTML =
        '<span class="step-dot">' + esc(p.step) + '</span>' +
        '<h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p>';
      ol.appendChild(li);
    });
  }

  function buildPortfolio() {
    var grid = $('#portfolioGrid');
    S.portfolio.forEach(function (p) {
      var card = el('article', 'portfolio-card');

      var playable = p.playGameId
        ? S.games.filter(function (g) { return g.id === p.playGameId && g.play; })[0]
        : null;

      var actions = '';
      if (playable) actions += '<button class="btn btn-primary" type="button" data-pf-play="' + esc(p.id) + '">Play Now</button>';
      if (p.url)    actions += '<a class="btn ' + (playable ? 'btn-ghost' : 'btn-primary') + '" href="' + esc(p.url) + '" target="_blank" rel="noopener">View Project</a>';
      if (p.video)  actions += '<button class="btn btn-ghost" type="button" data-pf-video="' + esc(p.id) + '">Watch Gameplay</button>';
      if (!actions) actions = '<button class="btn btn-ghost" type="button" data-pf-image="' + esc(p.id) + '">View Project</button>';

      card.innerHTML =
        '<div class="pf-media">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.alt || p.name) + '" loading="lazy" decoding="async" width="1200" height="675">' +
          '<div class="pf-overlay"><div class="pf-actions">' + actions + '</div></div>' +
        '</div>' +
        '<div class="pf-body">' +
          '<span class="pf-cat">' + esc(p.category) + '</span>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p>' + esc(p.description) + '</p>' +
        '</div>';

      var pb = $('[data-pf-play]', card);
      if (pb) pb.addEventListener('click', function () { openPlayer(playable); });
      var vb = $('[data-pf-video]', card);
      if (vb) vb.addEventListener('click', function () { openLightbox(p.name, p.video); });
      var ib = $('[data-pf-image]', card);
      if (ib) ib.addEventListener('click', function () {
        openImageBox(p.name, { src: p.image, alt: p.alt || p.name });
      });

      grid.appendChild(card);
    });
  }

  function buildWhy() {
    $('[data-why-heading]').innerHTML = gradientTail(S.why.heading, 2);
    var grid = $('#whyGrid');
    S.why.features.forEach(function (f) {
      var c = el('article', 'why-card');
      c.innerHTML =
        '<span class="why-icon">' + icon(f.icon, 23) + '</span>' +
        '<h3>' + esc(f.title) + '</h3><p>' + esc(f.text) + '</p>';
      grid.appendChild(c);
    });
  }

  function buildStats() {
    var sec = $('#stats');
    if (!S.stats || !S.stats.show || !S.stats.items.length) { sec.hidden = true; return; }
    sec.hidden = false;
    var list = $('#statsList');
    S.stats.items.forEach(function (s) {
      var li = el('li', 'stat');
      li.innerHTML =
        '<div class="stat-value">' + esc(s.value) + '</div>' +
        '<div class="stat-label">' + esc(s.label) + '</div>';
      list.appendChild(li);
    });
  }

  function buildCta() {
    $('[data-cta-heading]').innerHTML = gradientTail(S.cta.heading, 2);
    setText('[data-cta-text]', S.cta.text);
    var b = $('[data-cta-button]');
    b.href = S.cta.button.href;
    b.textContent = S.cta.button.label;
  }

  /* =============================================================== CONTACT */
  var PLACEHOLDER = /example\.com|0000|City, Country/i;

  function buildContact() {
    var c = S.contact;
    $('[data-contact-heading]').innerHTML = gradientTail(c.heading, 1);
    setText('[data-contact-text]', c.text);

    var list = $('#contactDetails');
    var rows = [
      { icon: 'mail',  label: 'Email',    value: c.email,    href: 'mailto:' + c.email },
      { icon: 'phone', label: 'Phone',    value: c.phone,    href: 'tel:' + String(c.phone).replace(/\s+/g, '') },
      { icon: 'pin',   label: 'Location', value: c.location, href: null }
    ];
    rows.forEach(function (r) {
      if (!r.value) return;
      var li = el('li', 'contact-item');
      var placeholder = PLACEHOLDER.test(r.value) ? ' is-placeholder' : '';
      var valueHtml = r.href && !placeholder
        ? '<a class="value" href="' + esc(r.href) + '">' + esc(r.value) + '</a>'
        : '<span class="value' + placeholder + '">' + esc(r.value) + '</span>';
      li.innerHTML =
        '<span class="contact-icon">' + icon(r.icon, 19) + '</span>' +
        '<span><span class="label">' + esc(r.label) + '</span>' + valueHtml + '</span>';
      list.appendChild(li);
    });

    [$('#socialList'), $('#footerSocial')].forEach(function (ul) {
      if (!ul) return;
      S.social.forEach(function (s) {
        var li = el('li');
        var a = el('a');
        a.href = s.url;
        a.setAttribute('aria-label', s.name);
        a.title = s.name;
        if (s.url && s.url !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
        a.innerHTML = icon(s.icon, 19);
        li.appendChild(a);
        ul.appendChild(li);
      });
    });
  }

  function wireForm() {
    var form   = $('#contactForm');
    var status = $('#formStatus');

    function fail(input, msg) {
      var field = input.closest('.field');
      field.classList.add('has-error');
      var e = $('[data-error-for="' + input.id + '"]', field);
      if (e) e.textContent = msg;
      return false;
    }
    function clear(input) {
      var field = input.closest('.field');
      field.classList.remove('has-error');
      var e = $('[data-error-for="' + input.id + '"]', field);
      if (e) e.textContent = '';
    }

    function validate() {
      var ok = true;
      var name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-message');
      [name, email, msg].forEach(clear);

      if (!name.value.trim())  ok = fail(name, 'Please enter your name.') && ok;
      if (!email.value.trim()) ok = fail(email, 'Please enter your email.') && ok;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()))
        ok = fail(email, 'Please enter a valid email address.') && ok;
      if (!msg.value.trim())   ok = fail(msg, 'Please tell us about your project.') && ok;
      return ok;
    }

    $$('#contactForm input, #contactForm textarea').forEach(function (i) {
      i.addEventListener('input', function () { clear(i); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      if (!validate()) {
        status.classList.add('is-error');
        status.textContent = 'Please check the highlighted fields.';
        return;
      }

      var data = {
        name:    $('#cf-name').value.trim(),
        email:   $('#cf-email').value.trim(),
        phone:   $('#cf-phone').value.trim(),
        company: $('#cf-company').value.trim(),
        message: $('#cf-message').value.trim()
      };

      var endpoint = S.contact.formEndpoint;

      if (endpoint) {
        var btn = $('button[type="submit"]', form);
        btn.disabled = true;
        status.textContent = 'Sending…';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error('Request failed');
          form.reset();
          status.classList.add('is-ok');
          status.textContent = 'Thanks — your message has been sent. We\'ll be in touch shortly.';
        }).catch(function () {
          status.classList.add('is-error');
          status.textContent = 'Something went wrong. Please email us directly instead.';
        }).then(function () { btn.disabled = false; });
        return;
      }

      // No endpoint configured yet — hand off to the visitor's mail client.
      var subject = 'Project enquiry from ' + data.name;
      var body =
        'Name: '    + data.name    + '\n' +
        'Email: '   + data.email   + '\n' +
        'Phone: '   + (data.phone   || '—') + '\n' +
        'Company: ' + (data.company || '—') + '\n\n' +
        data.message;
      window.location.href = 'mailto:' + S.contact.email +
        '?subject=' + encodeURIComponent(subject) +
        '&body='    + encodeURIComponent(body);

      status.classList.add('is-ok');
      status.textContent = 'Opening your email app… If nothing happens, email us at ' + S.contact.email + '.';
    });
  }

  /* ================================================================ FOOTER */
  function buildFooter() {
    setText('[data-footer-blurb]', S.footer.blurb);

    var wrap = $('#footerColumns');
    S.footer.columns.forEach(function (col) {
      var links = col.links && col.links.length
        ? col.links
        : (col.title === 'Games'
            ? S.games.map(function (g) { return { label: g.name, href: '#game-' + g.id }; })
            : []);

      var div = el('div', 'footer-col');
      div.innerHTML = '<h3>' + esc(col.title) + '</h3><ul>' +
        links.map(function (l) { return '<li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>'; }).join('') +
        '</ul>';
      wrap.appendChild(div);
    });

    // Services column, generated from the services list
    var svc = el('div', 'footer-col');
    svc.innerHTML = '<h3>Services</h3><ul>' +
      S.services.slice(0, 5).map(function (s) {
        return '<li><a href="#services">' + esc(s.title) + '</a></li>';
      }).join('') + '</ul>';
    wrap.appendChild(svc);

    var year = Math.max(new Date().getFullYear(), S.company.foundedYear || 0);
    $('#copyright').textContent = '© ' + year + ' ' + S.company.name + '. All Rights Reserved.';

    var legal = $('#legalLinks');
    S.footer.legal.forEach(function (l) {
      var li = el('li');
      li.innerHTML = '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
      legal.appendChild(li);
    });
  }

  /* =============================================================== REVEALS */
  function wireReveals() {
    var targets = $$('.reveal')
      .concat($$('.card-grid > *, .games-list > *, .timeline > *, .highlight-list > *, .stats-list > *'));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var n = entry.target;
        // stagger siblings for a wave effect
        var siblings = Array.prototype.slice.call(n.parentNode.children);
        var i = siblings.indexOf(n);
        n.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        n.classList.add('is-in');
        obs.unobserve(n);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach(function (n) { obs.observe(n); });
  }

  /* ============================================================ PARTICLES */
  function heroParticles() {
    var canvas = $('#heroParticles');
    if (!canvas || reduceMotion) { if (canvas) canvas.remove(); return; }

    var ctx = canvas.getContext('2d');
    var dots = [], raf = null, w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var visible = true;

    function size() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(46, Math.round(w / 26));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.7 + 0.6,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          a: Math.random() * 0.45 + 0.25,
          // hues from the site palette: magenta, orange, yellow, lime, cyan, violet
          rgb: ['255,61,154','255,138,31','255,212,38','61,220,127','34,211,238','155,124,255'][i % 6]
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < -10) d.x = w + 10; else if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10; else if (d.y > h + 10) d.y = -10;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + d.rgb + ',' + d.a + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && visible) frame(); }
    function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    size();
    start();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 180);
    });

    // don't burn CPU when the hero is off screen or the tab is hidden
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(canvas);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* =================================================================== GO */
  function init() {
    buildNav();
    buildHero();
    buildAbout();
    buildGames();
    initLightbox();
    initPlayer();
    buildShowcase();
    buildServices();
    buildProcess();
    buildPortfolio();
    buildWhy();
    buildStats();
    buildCta();
    buildContact();
    buildFooter();

    wireHeader();
    wireScrollSpy();
    wireForm();
    wireReveals();
    heroParticles();

    // Mark timeline steps as they enter, for the gradient dot fill
    if ('IntersectionObserver' in window && !reduceMotion) {
      var stepObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); stepObs.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      $$('.step').forEach(function (s) { stepObs.observe(s); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
