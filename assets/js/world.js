/* ==========================================================================
   MIZPAH INTERACTIVES — the website as a game world
   --------------------------------------------------------------------------
   The page is a road trip through six stops (site.js). This file builds:
     - the world map in the top bar: a road with the six stops and your car,
       which follows your scroll position along the road
     - travel: picking a stop plays a short "driving there" transition
       (road, speed lines, a "next stop" sign) instead of a plain jump
     - the stop contents: workshop bays, the build pipeline, billboards,
       demo pits, and a "next stop" sign at the end of each stop
   ========================================================================== */
(function () {
  'use strict';

  const G = window.GVGame;
  const SITE = window.GV_SITE;
  if (!G || !SITE) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STOPS = SITE.stops;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------- icons */
  const ICON = {
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 3.5L16 11H5" fill="currentColor"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.1-5.1a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.8-.6-.6-2.8z"/>',
    pad: '<path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 3.6a2.4 2.4 0 0 1-4.3.9L15 15H9l-1.8 2.5a2.4 2.4 0 0 1-4.3-.9L2.1 13A5 5 0 0 1 7 7z"/><path d="M7 10v3M5.5 11.5h3"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    mail: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/><path d="M4 7l8 6 8-6"/>',
    html5: '<path d="M5 3l1.5 16L12 21l5.5-2L19 3z"/><path d="M15.5 7.5h-7l.3 3.5h6.4l-.4 4-2.8 1-2.8-1-.2-2"/>',
    mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 13h5M8 16h8"/>',
    brush: '<path d="M14 4l6 6-8.5 8.5-6-6z"/><path d="M5.5 12.5C3 15 4 20 4 20s5 1 7.5-1.5"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    car: '<path d="M3 15l2-5h10l3 3h2a1 1 0 0 1 1 1v2H3z"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
    ramp: '<path d="M2 19h20M4 19l12-9v9"/><path d="M17 7l3-3M18.5 9l3-1"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    rain: '<path d="M7 14a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.8 6.5 3.8 3.8 0 0 1 17.5 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
    ghost: '<path d="M5 20V10a7 7 0 0 1 14 0v10l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2z"/><circle cx="9.5" cy="10.5" r="1" fill="currentColor"/><circle cx="14.5" cy="10.5" r="1" fill="currentColor"/>',
    map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ''}</svg>`;

  /* --------------------------------------------------------- world map */
  const wmStops = $('#wm-stops'), wmCar = $('.wm-car'), wmFill = $('.wm-fill');
  STOPS.forEach((st, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${st.id}" data-travel="${st.id}" style="--c:${st.color}" aria-label="Stop ${st.no}: ${esc(st.name)}">
      <span class="wm-pin">${icon(st.icon)}</span><span class="wm-name">${esc(st.name)}</span></a>`;
    wmStops.appendChild(li);
    const m = document.createElement('li');
    m.innerHTML = `<button type="button" data-travel="${st.id}" style="--c:${st.color}">
      <span class="ml-pin">${icon(st.icon)}</span><span class="ml-text"><small>Stop ${st.no} · ${esc(st.place)}</small><b>${esc(st.name)}</b></span></button>`;
    $('#map-list').appendChild(m);
  });
  // the car on the map (and in the travel scene) is the ride you've chosen
  const carInto = (slot) => { if (slot) slot.replaceChildren(G.vehiclePreview(G.vehicle)); };
  carInto(wmCar); carInto($('.pl-car')); carInto($('.tr-car'));
  window.addEventListener('gv:vehicle', () => { carInto(wmCar); carInto($('.pl-car')); carInto($('.tr-car')); });

  // the map car follows the scroll: between two stops it sits in proportion
  const sections = STOPS.map((st) => document.getElementById(st.id));
  const pins = $$('a', wmStops);
  let current = 0;
  function trackScroll() {
    const probe = scrollY + innerHeight * 0.45;
    const tops = sections.map((el) => el.getBoundingClientRect().top + scrollY);
    let i = 0;
    while (i < tops.length - 1 && probe >= tops[i + 1]) i++;
    const next = Math.min(i + 1, tops.length - 1);
    const span = tops[next] - tops[i];
    const f = next === i || span <= 0 ? 0 : Math.max(0, Math.min(1, (probe - tops[i]) / span));
    const x = (pinX(i) + (pinX(next) - pinX(i)) * f);
    wmCar.style.transform = `translateX(${x}px)`;
    wmFill.style.width = x + 'px';
    const active = f > 0.6 && next !== i ? next : i;
    if (active !== current || !pins[active].classList.contains('is-here')) {
      current = active;
      pins.forEach((p, k) => { p.classList.toggle('is-here', k === active); p.classList.toggle('is-done', k < active); });
    }
  }
  const pinX = (k) => pins[k].offsetLeft + pins[k].offsetWidth / 2;
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; trackScroll(); }); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  trackScroll();

  /* ------------------------------------------------------------ travel */
  const travelEl = $('#travel'), live = $('#travel-live');
  let travelling = false;
  function travel(id) {
    const i = STOPS.findIndex((s) => s.id === id);
    const el = document.getElementById(id);
    if (i < 0 || !el || travelling) return;
    closeMapModal();
    if (G.mode === 'play') G.exit();
    const st = STOPS[i];
    live.textContent = `Travelling to stop ${st.no}, ${st.name}`;
    const land = () => {
      const bar = id === 'stage' ? 0 : ($('.topbar')?.offsetHeight || 60) - 20;   // the stop's own top padding clears the rest
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - bar, behavior: 'instant' });
      el.classList.remove('arrived'); void el.offsetWidth; el.classList.add('arrived');
      trackScroll();
    };
    if (reduceMotion) { land(); return; }
    travelling = true;
    const dir = i >= current ? 1 : -1;
    $('b', travelEl).textContent = st.name;
    $('span', $('.tr-sign', travelEl)).textContent = `Stop ${st.no} · ${st.place}`;
    travelEl.style.setProperty('--c', st.color);
    travelEl.classList.toggle('reverse', dir < 0);
    travelEl.classList.remove('go'); void travelEl.offsetWidth; travelEl.classList.add('go');
    setTimeout(land, 480);                       // the page moves while the road covers it
    setTimeout(() => { travelEl.classList.remove('go'); travelling = false; }, 1150);
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-travel]');
    if (!t) return;
    e.preventDefault();
    travel(t.dataset.travel);
  });
  // plain in-page links to a stop travel too (e.g. "Back to top")
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-travel')) return;
    const id = a.getAttribute('href').slice(1) === 'top' ? 'stage' : a.getAttribute('href').slice(1);
    if (STOPS.some((s) => s.id === id)) { e.preventDefault(); travel(id); }
  });
  // phone: the map opens as a panel
  const mapModal = $('#modal-map');
  function closeMapModal() {
    if (!mapModal.classList.contains('open')) return;
    mapModal.classList.remove('open'); setTimeout(() => { mapModal.hidden = true; }, 200);
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="open-map"]')) return;
    $$('button', $('#map-list')).forEach((b, k) => b.classList.toggle('is-here', k === current));
    mapModal.hidden = false; requestAnimationFrame(() => mapModal.classList.add('open'));
    setTimeout(() => { const b = $('#map-list .is-here') || $('#map-list button'); b.focus({ preventScroll: true }); }, 60);
  });

  /* -------------------------------------------- stop 02: the workshop */
  const bays = $('#bays');
  SITE.services.forEach((sv, i) => {
    const bay = document.createElement('article');
    bay.className = 'bay reveal';
    bay.style.setProperty('--delay', (i * 70) + 'ms');
    bay.innerHTML = `
      <div class="bay-inside">
        <span class="bay-icon">${icon(sv.icon)}</span>
        <h3>${esc(sv.title)}</h3>
        <p>${esc(sv.text)}</p>
        <ul class="bay-tags">${sv.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
      <button class="bay-door" type="button" aria-expanded="false" aria-label="Open bay ${i + 1}: ${esc(sv.title)}">
        <span class="bay-no">Bay ${String(i + 1).padStart(2, '0')}</span>
        <span class="bay-title">${esc(sv.title)}</span>
        <span class="bay-hint">${matchMedia('(hover: hover)').matches ? 'Click' : 'Tap'} to roll up</span>
      </button>`;
    const door = $('.bay-door', bay);
    door.addEventListener('click', () => {
      const open = bay.classList.toggle('open');
      door.setAttribute('aria-expanded', String(open));
      door.setAttribute('aria-label', (open ? 'Close' : 'Open') + ` bay ${i + 1}: ${sv.title}`);
    });
    bays.appendChild(bay);
  });
  // the pipeline road: five checkpoints, the car drives it when it scrolls in
  const pl = $('#pipeline');
  SITE.process.forEach((p, i) => {
    const cp = document.createElement('div');
    cp.className = 'pl-stop';
    cp.style.setProperty('--i', i);
    cp.innerHTML = `<span class="pl-flag">${p.step}</span><b>${esc(p.title)}</b><small>${esc(p.text)}</small>`;
    pl.appendChild(cp);
  });

  /* --------------------------------------- stop 04: billboard highway */
  const boards = $('#billboards');
  const clients = SITE.clients || [];
  if (clients.length) {
    clients.forEach((c, i) => {
      const b = document.createElement(c.url ? 'a' : 'div');
      b.className = 'billboard reveal';
      if (c.url) { b.href = c.url; b.target = '_blank'; b.rel = 'noopener'; }
      b.style.setProperty('--delay', (i * 80) + 'ms');
      b.innerHTML = `<div class="bb-face">${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}">` : `<b>${esc(c.name)}</b>`}</div>
        <div class="bb-plate"><b>${esc(c.name)}</b>${c.project ? `<span>${esc(c.project)}</span>` : ''}</div><span class="bb-post"></span>`;
      boards.appendChild(b);
    });
  } else {
    // no client list yet: honest "reserved" billboards, never made-up names
    [['Reserved', 'for our next partner'], ['Your brand', 'could be up in lights'], ['Coming soon', 'new partner billboards']].forEach(([a, b2], i) => {
      const b = document.createElement('div');
      b.className = 'billboard reserved reveal';
      b.style.setProperty('--delay', (i * 80) + 'ms');
      b.innerHTML = `<div class="bb-face"><b>${a}</b><span>${b2}</span></div><span class="bb-post"></span>`;
      boards.appendChild(b);
    });
    const cta = document.createElement('p');
    cta.className = 'bb-cta reveal';
    cta.innerHTML = 'Want your logo on the highway? <button type="button" class="btn-ghost sm" data-travel="contact">Drive to Contact ›</button>';
    boards.after(cta);
  }

  /* ------------------------------------------ stop 05: the test track */
  const pits = $('#pits');
  SITE.demos.forEach((d, i) => {
    const pit = document.createElement('article');
    pit.className = 'pit reveal';
    pit.style.setProperty('--delay', (i * 70) + 'ms');
    pit.innerHTML = `<span class="pit-no">Pit ${i + 1}</span>
      <span class="pit-icon">${icon(d.icon)}</span>
      <h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>
      <div class="pit-foot"><span class="pit-tag">${esc(d.tag)}</span>
      <button type="button" class="btn-play sm pit-run"><span class="btn-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></span>${d.run.levels ? 'Open' : 'Run demo'}</button></div>`;
    $('.pit-run', pit).addEventListener('click', () => {
      const r = d.run;
      if (r.levels) { G.openLevels(); return; }
      if (r.theme) G.setTime(r.theme);
      G.start(r.at ? { at: r.at } : { level: r.level });
    });
    pits.appendChild(pit);
  });

  /* ------------------------------- "drive here": the stop is in the game too */
  // Services, Clients, Demos and Contact also stand on Main Street; this
  // starts the game parked in front of the stop's building.
  ['services', 'clients', 'demos', 'contact'].forEach((id) => {
    const head = $('#' + id + ' .stop-head');
    if (!head) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'drive-here';
    b.dataset.action = 'drive-to'; b.dataset.stop = id;
    b.innerHTML = `${icon('car')}<span>Drive here in the game</span>`;
    head.appendChild(b);
  });

  /* ---------------------------------------- "next stop" at each stop end */
  STOPS.forEach((st, i) => {
    const next = STOPS[i + 1], el = document.getElementById(st.id);
    if (!next || !el || st.id === 'stage') return;
    const sign = document.createElement('div');
    sign.className = 'next-stop reveal';
    sign.innerHTML = `<span class="ns-road" aria-hidden="true"></span>
      <button type="button" data-travel="${next.id}" style="--c:${next.color}">
        <small>Next stop · ${next.no}</small><b>${esc(next.name)}</b><span>${esc(next.place)} ›</span></button>`;
    el.appendChild(sign);
  });

  // arriving by scrolling also plays the stop's arrival animation once
  const arrive = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('arrived'); arrive.unobserve(en.target); } });
  }, { threshold: 0.25 });
  sections.slice(1).forEach((el) => arrive.observe(el));
  // the new elements join the page's scroll reveals
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    $$('.stop .reveal:not(.in)').forEach((el) => io.observe(el));
  } else $$('.stop .reveal').forEach((el) => el.classList.add('in'));

  // Every load or refresh starts on the intro screen: no jumping to a
  // #stop in the address, no restored scroll position, and a page brought
  // back from the browser's back/forward cache leaves any run it was in.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toIntro = () => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: 'instant' });
    trackScroll();
  };
  toIntro();
  window.addEventListener('load', toIntro);
  window.addEventListener('pageshow', (e) => { if (e.persisted) { if (G.mode === 'play') G.exit(); closeMapModal(); toIntro(); } });

  window.GVWorld = { travel, stops: STOPS, icon };
})();
