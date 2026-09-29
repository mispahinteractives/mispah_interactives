/* ==========================================================================
   MONSTER HILLS — renderer, input, camera, sound and game flow
   --------------------------------------------------------------------------
   Two modes share one world:
     attract  the hero background. An autopilot drives the course on a loop
              behind the title; nothing is scored.
     play     the player drives. Timer, coins, arcade doors, finish flag.
   Physics lives in physics.js; this file only reads bodies back out.
   ========================================================================== */
(function () {
  'use strict';

  const P = window.GVPhysics(window.Matter);
  const GAMES = window.GV_GAMES || [];
  const VEHICLES = P.VEHICLES;
  const ASSET = 'assets/img/assets/';
  const SPRITES = ['truckbody', 'truckwheel', 'carbody', 'carbody2', 'wheel', 'wheel2', 'strut',
    'rampleft', 'crate', 'box', 'suitcase', 'oilcan', 'beercan', 'sodacan', 'cloud', 'tree', 'bat',
    'wrong_house_1', 'wrong_house_2', 'wrong_house_3', 'wrong_house_4',
    'ghost_1', 'ghost_2', 'ghost_3', 'ghost_4', 'ghost_5', 'background_house1',
    'wrong_house_5', 'wrong_house_6', 'correct_house_1', 'correct_house_2', 'correct_house_3', 'correct_house_4', 'correct_house_5',
    'mountain_1', 'mountain_2', 'mountain_3', 'mountain_4', 'grass_1', 'crow_1', 'crow_2', 'tree_2'];
  const FONT = '"Lilita One", "Rubik", system-ui, sans-serif';
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------ utilities */
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('gv:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('gv:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const fmtTime = (ms) => {
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, t = Math.floor(ms / 100) % 10;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + t;
  };
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent('gv:' + name, { detail }));

  const img = {};
  const logos = {};
  function loadImages() {
    const jobs = SPRITES.map((k) => new Promise((res) => {
      const i = new Image(); i.onload = res; i.onerror = res; i.src = ASSET + k + '.png'; img[k] = i;
    }));
    GAMES.forEach((g) => {
      jobs.push(new Promise((res) => {
        const i = new Image(); i.onload = res; i.onerror = res; i.src = g.logo; logos[g.id] = i;
      }));
    });
    return Promise.all(jobs);
  }
  const ready = (i) => i && i.complete && i.naturalWidth > 0;

  /* ---------------------------------------------------------------- sound */
  const Sound = (function () {
    let ctx = null, master, osc1, osc2, filt, engGain;
    let muted = store.get('muted', false);
    function ensure() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
      osc1 = ctx.createOscillator(); osc1.type = 'sawtooth';
      osc2 = ctx.createOscillator(); osc2.type = 'square';
      filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300; filt.Q.value = 4;
      const sub = ctx.createGain(); sub.gain.value = 0.55;
      engGain = ctx.createGain(); engGain.gain.value = 0;
      osc1.connect(filt); osc2.connect(sub); sub.connect(filt); filt.connect(engGain); engGain.connect(master);
      osc1.start(); osc2.start();
    }
    let rainGain = null;
    function rain(on) {
      if (!ctx) return;
      if (!rainGain) {
        const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.6;
        rainGain = ctx.createGain(); rainGain.gain.value = 0;
        src.connect(f); f.connect(rainGain); rainGain.connect(master); src.start();
      }
      rainGain.gain.setTargetAtTime(on ? 0.06 : 0, ctx.currentTime, 0.4);
    }
    function engine(rpm, throttle, on) {
      if (!ctx) return;
      const t = ctx.currentTime, f = 34 + rpm * 90 + throttle * 14;
      osc1.frequency.setTargetAtTime(f, t, 0.05);
      osc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      filt.frequency.setTargetAtTime(220 + rpm * 900 + throttle * 600, t, 0.08);
      engGain.gain.setTargetAtTime(on ? 0.045 + throttle * 0.07 : 0, t, 0.12);
    }
    function tone(freqs, step, type, vol) {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f;
        const t = t0 + i * step;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.8);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + step * 2);
      });
    }
    function noise(dur, vol, cutoff) {
      if (!ctx || muted) return;
      const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(master); src.start();
    }
    return {
      ensure, engine, rain,
      thunder: (d) => { setTimeout(() => noise(1.8, 0.55, 160), d); setTimeout(() => noise(0.5, 0.3, 500), d + 60); },
      coin: () => tone([988, 1319], 0.07, 'square', 0.09),
      land: (s) => { noise(0.3, 0.25 + 0.4 * s, 380); if (s > 0.35) tone([70, 50], 0.12, 'sine', 0.3 * s); },
      caw: () => { tone([540, 430], 0.07, 'sawtooth', 0.025); noise(0.12, 0.05, 1800); },
      creak: () => tone([160, 120], 0.12, 'sawtooth', 0.05),
      whoosh: () => { noise(0.45, 0.25, 900); tone([620, 300], 0.12, 'sine', 0.06); },
      backfire: () => { noise(0.07, 0.4, 3200); tone([95], 0.05, 'square', 0.12); },
      beep: (go) => tone(go ? [880, 1320] : [520], go ? 0.1 : 0.12, 'square', 0.09),
      hit: () => noise(0.12, 0.18, 1200),
      door: () => tone([523, 659, 784, 1047], 0.07, 'triangle', 0.16),
      spooky: () => {
        if (!ctx || muted) return;
        const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(880, t0); o.frequency.exponentialRampToValueAtTime(240, t0 + 1.1);
        lfo.frequency.value = 7; lg.gain.value = 28; lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
        o.connect(g); g.connect(master); o.start(t0); lfo.start(t0); o.stop(t0 + 1.25); lfo.stop(t0 + 1.25);
        noise(0.9, 0.3, 160);
      },
      finish: () => tone([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.08),
      checkpoint: () => tone([660, 880], 0.08, 'triangle', 0.12),
      // pedal clicks: a short mechanical tick down, a softer one on the way up
      pedal: (down) => noise(down ? 0.035 : 0.028, down ? 0.14 : 0.08, down ? 2600 : 1900),
      jump: () => { noise(0.14, 0.22, 700); tone([330, 494], 0.06, 'triangle', 0.1); },
      horn: () => { tone([440], 0.18, 'square', 0.08); tone([554], 0.18, 'square', 0.06); },
      toggle() {
        muted = !muted; store.set('muted', muted);
        if (master) master.gain.value = muted ? 0 : 0.55;
        return muted;
      },
      get muted() { return muted; }
    };
  })();

  /* ---------------------------------------------------------------- state */
  const W = P.createWorld();
  const car = W.car;
  const gameById = {};
  GAMES.forEach((g) => { gameById[g.id] = g; });

  const state = {
    mode: 'attract',          // attract | play
    paused: false,            // a modal is open
    active: true,             // stage on screen
    vehicle: VEHICLES[store.get('vehicle', 'truck')] ? store.get('vehicle', 'truck') : 'truck',
    // theme: 'morning' | 'night' | 'rain' (Night is the default). `night`
    // means the lights are on (night and rain); `theme` picks sky and weather.
    theme: ['morning', 'night', 'rain'].includes(store.get('time', 'night')) ? store.get('time', 'night') : 'night',
    night: false,
    time: 0, started: false, finished: false,
    coins: 0, checkpoint: W.SPAWN_X,
    door: null, auto: { stall: 0, reverse: 0 },
    shake: 0, t: 0, lastToastCp: 0
  };
  const cam = { x: W.SPAWN_X, y: -120, z: 1, fx: 0.62, fy: 0.62, look: 0 };
  const input = { gas: false, brake: false, lean: 0, jump: false };
  const keys = new Set();
  let padConnected = false;
  window.addEventListener('gamepadconnected', () => { padConnected = true; });
  const touch = { gas: false, brake: false, jump: false };
  let particles = [];
  let canvas, ctx, dpr = 1, Wd = 0, Ht = 0;
  const ui = {};

  /* --------------------------------------------------------------- canvas */
  /* Resolution. Start reasonably sharp, and if frames keep taking too long
     (a slower computer or phone), step the canvas resolution down until the
     game runs smoothly. It never steps back up, so it can't flicker. */
  const QUALITY = [1.5, 1.25, 1];
  let quality = 0, slowFor = 0, frameAvg = 16.7, settleUntil = 0;
  function watchFrameRate(gap, now) {
    if (now < settleUntil || gap > 120) return;         // ignore start-up and tab switches
    frameAvg += (gap - frameAvg) * 0.08;
    slowFor = frameAvg > 21 ? slowFor + gap : 0;        // under ~48 fps
    if (slowFor > 1500 && quality < QUALITY.length - 1 && dpr > 1) {
      quality++; slowFor = 0; frameAvg = 16.7; settleUntil = now + 1500;
      resize();
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    Wd = Math.max(1, r.width); Ht = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, QUALITY[quality]);
    skyCache = null;
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Ht * dpr);
  }

  function focusPoint() {
    const portrait = Ht > Wd;
    if (state.mode === 'attract') {
      if (portrait && Wd <= 1100) return { fx: 0.5, fy: Wd < 760 ? 0.4 : 0.36 };   // truck above the intro sheet
      return Wd < 760 ? { fx: 0.5, fy: 0.5 } : { fx: 0.68, fy: 0.64 };
    }
    return { fx: portrait ? 0.32 : 0.36, fy: portrait ? 0.56 : 0.6 };
  }

  function baseZoom() {
    const portrait = Ht > Wd;
    // the intro frames the truck a little closer on portrait screens
    const wide = portrait ? (state.mode === 'play' ? 820 : 760) : (state.mode === 'play' ? 1500 : 1200);
    return clamp(Math.min(Wd / wide, Ht / 760), 0.3, 1.25);
  }

  /* ------------------------------------------------------------- spawning */
  function spawnAt(x, keepTime) {
    W.spawn(state.vehicle, x);
    cam.x = car.chassis.position.x; cam.y = car.chassis.position.y;
    if (!keepTime) state.checkpoint = x;
  }

  function resetRun(x) {
    W.resetProps();
    W.coins.forEach((c) => { c.taken = false; });
    state.coins = 0; state.time = 0; state.started = false; state.finished = false; state.failed = false;
    W.buildings.forEach((b) => { b.gs = null; });
    W.buildings.forEach((b) => { b.appear = 0; });
    if (ui.spook) ui.spook.classList.remove('show');
    state.checkpoint = W.SPAWN_X;
    spawnAt(x || W.SPAWN_X);
    particles = [];
  }

  /* ---------------------------------------------------------------- input */
  function readInput() {
    if (state.mode === 'attract') return autopilot();
    if (state.countdown > 0) { input.gas = input.brake = input.jump = false; input.lean = 0; return input; }
    if (state.finished) { input.gas = false; input.brake = true; input.lean = 0; input.jump = false; return input; }
    // on-screen Brake / Gas / Jump buttons (touch or mouse), and on a PC the
    // keyboard as well: → / D gas, ← / A brake, Space / ↑ / W jump, ↓ lean
    let gas = touch.gas || keys.has('ArrowRight') || keys.has('KeyD');
    let brake = touch.brake || keys.has('ArrowLeft') || keys.has('KeyA');
    let jump = touch.jump || keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
    let lean = keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0;
    // polling getGamepads() every frame keeps macOS's game-controller service
    // busy, so only poll once a gamepad has actually been connected
    const pads = padConnected && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      if (p.buttons[7] && p.buttons[7].value > 0.2) gas = true;
      if (p.buttons[0] && p.buttons[0].pressed) jump = true;
      if ((p.buttons[6] && p.buttons[6].value > 0.2) || (p.buttons[1] && p.buttons[1].pressed)) brake = true;
      if (p.axes[0] && Math.abs(p.axes[0]) > 0.3) lean += p.axes[0];
      if (p.buttons[3] && p.buttons[3].pressed && !p._y) enterDoor();
      p._y = p.buttons[3] && p.buttons[3].pressed;
    }
    input.gas = gas; input.brake = brake && !gas; input.lean = clamp(lean, -1, 1); input.jump = jump;
    if ((gas || brake || jump) && !state.started && !state.finished) state.started = true;
    return input;
  }

  // Attract mode: keep moving, cruise slowly past the arcade doors so they
  // read, back off on steep climbs, and back up if something is in the way.
  function autopilot() {
    const c = car.chassis, a = Math.atan2(Math.sin(c.angle), Math.cos(c.angle));
    const v = W.forwardSpeed(), x = c.position.x;
    const inp = { gas: true, brake: false, lean: 0 };
    const cruise = x < W.TOWN_END ? 16 : 30;          // ~45 km/h through town, flat out in the hills
    if (v > cruise) inp.gas = false;
    if (!car.grounded) {
      if (a < -0.35) { inp.gas = false; inp.lean = 1; }
      else if (a > 0.45) inp.lean = -1;
    } else if (a < -0.9) inp.gas = false;
    const au = state.auto;
    if (Math.abs(v) < 0.6 && car.grounded) au.stall += 16; else au.stall = 0;
    if (au.stall > 1200) { au.reverse = 700; au.stall = 0; }
    if (au.reverse > 0) { au.reverse -= 16; inp.gas = false; inp.reverse = true; }
    return inp;
  }

  /* ------------------------------------------------------------ particles */
  function puff(x, y, vx, vy, size, life, color, kind) {
    if (particles.length > 420) return;
    particles.push({ x, y, vx, vy, size, life, max: life, color, kind: kind || 'smoke', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.3 });
  }

  function localToWorld(lx, ly) {
    const c = car.chassis, co = Math.cos(c.angle), si = Math.sin(c.angle);
    return { x: c.position.x + lx * co - ly * si, y: c.position.y + lx * si + ly * co };
  }

  function spriteLocal(px, py) {
    const v = car.v, s = v.scale;
    return {
      x: (px - v.bodySize[0] / 2) * s + car.spriteOffset.x,
      y: (py - v.bodySize[1] / 2) * s + car.spriteOffset.y
    };
  }

  function emitCarParticles(dt) {
    const v = car.v, c = car.chassis;
    const vel = window.Matter.Body.getVelocity(c);
    // exhaust: more and darker on throttle
    const ex = spriteLocal(v.exhaust[0], v.exhaust[1]);
    const p = localToWorld(ex.x, ex.y);
    const rate = 0.05 + car.throttle * 0.35;
    if (Math.random() < rate * dt / 16) {
      const up = car.key === 'truck';
      const dir = up ? { x: Math.sin(c.angle), y: -Math.cos(c.angle) } : { x: -Math.cos(c.angle), y: -Math.sin(c.angle) };
      const shade = 50 + Math.random() * 30 - car.throttle * 20;
      puff(p.x, p.y, dir.x * 1.6 + vel.x * 0.6 - 0.6, dir.y * 1.6 + vel.y * 0.6 - 0.3,
        7 + car.throttle * 8, 900 + Math.random() * 500, `rgb(${shade},${shade},${shade + 8})`);
    }
    // exhaust flames under heavy throttle, and a backfire when you lift off
    const inp = state.lastInput || {};
    const dirX = car.key === 'truck' ? Math.sin(c.angle) : -Math.cos(c.angle);
    const dirY = car.key === 'truck' ? -Math.cos(c.angle) : -Math.sin(c.angle);
    const fire = (n, force, big) => {
      for (let i = 0; i < n; i++) {
        const sp = force * (0.6 + Math.random() * 0.8);
        puff(p.x, p.y, dirX * sp + vel.x + (Math.random() - 0.5) * 1.2, dirY * sp + vel.y + (Math.random() - 0.5) * 1.2,
          (big ? 9 : 5) + Math.random() * 5, 140 + Math.random() * 160, ['#fff3b0', '#ffc83d', '#ff7b1c'][i % 3], 'flame');
      }
    };
    if (inp.gas && car.throttle > 0.55 && Math.random() < car.throttle * 0.9 * dt / 16) fire(2, 2.4, false);
    if (car.throttle > 0.7 && !inp.gas && state.wasGas) {
      fire(10, 4.5, true); Sound.backfire(); state.shake = Math.max(state.shake, 3);
    }
    state.wasGas = !!inp.gas;
    // dust off the tyres
    const now = W.engine.timing.timestamp;
    const speed = Math.hypot(vel.x, vel.y);
    car.wheels.forEach((w) => {
      if (now - w.lastContact > 60) return;
      const spin = Math.abs(w.angularVelocity * car.rWheel - W.forwardSpeed());
      const k = (speed > 7 ? (state.theme === 'rain' ? 0.5 : 0.12) : 0) + (spin > 4 ? 0.5 : 0);
      if (Math.random() < k * dt / 16) {
        puff(w.position.x - Math.sign(vel.x || 1) * car.rWheel * 0.4, w.position.y + car.rWheel * 0.8,
          -vel.x * 0.15 + (Math.random() - 0.5) * 1.5, -1 - Math.random() * 1.5,
          6 + Math.random() * 7, 600 + Math.random() * 400, state.theme === 'rain' ? 'rgba(210,222,238,0.9)' : '#b89a74', 'dust');
      }
    });
  }

  // an expanding shockwave ring on the ground
  function ring(x, y, power) {
    if (particles.length > 440) return;
    particles.push({ x, y, vx: 0, vy: 0, size: 10, life: 420, max: 420, color: '#fff', kind: 'ring', rot: 0, vr: 9 * power + 4 });
  }

  function burst(x, y, n, color, kind, force) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, f = (0.5 + Math.random()) * (force || 3);
      puff(x, y, Math.cos(a) * f, Math.sin(a) * f - 1.5, 4 + Math.random() * 6, 600 + Math.random() * 600,
        Array.isArray(color) ? color[i % color.length] : color, kind);
    }
  }

  function updateParticles(dt) {
    const k = dt / 16.67;
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k;
      if (p.kind === 'smoke') { p.vx *= 0.97; p.vy = p.vy * 0.97 - 0.02 * k; p.size += 0.35 * k; }
      else if (p.kind === 'dust') { p.vx *= 0.94; p.vy += 0.05 * k; p.size += 0.25 * k; }
      else if (p.kind === 'confetti') { p.vx *= 0.99; p.vy += 0.12 * k; }
      else if (p.kind === 'flame') { p.vx *= 0.9; p.vy = p.vy * 0.9 - 0.08 * k; p.size *= Math.pow(0.93, k); }
      else if (p.kind === 'ring') { p.size += p.vr * k; p.vr *= Math.pow(0.9, k); }
      else { p.vx *= 0.95; p.vy += 0.06 * k; }
    }
    particles = particles.filter((p) => p.life > 0);
  }

  /* -------------------------------------------------------------- update */
  function update(dt) {
    state.t += dt;
    const inp = readInput();
    updateHouseGhosts(dt);
    state.lastInput = inp;
    if (state.countdown > 0) tickCountdown(dt);
    W.step(inp, dt);
    state.flash = (state.flash || 0) * Math.pow(0.85, dt / 16.67);
    const c = car.chassis;
    const x = c.position.x;

    for (const e of W.events) {
      if (e.type === 'land') {
        const s = clamp((e.air - 400) / 900, 0, 1);
        state.shake = Math.max(state.shake, 5 + s * 16);
        state.flash = Math.max(state.flash || 0, s * 0.35);
        cam.punch = Math.max(cam.punch || 0, 0.03 + s * 0.05);
        car.wheels.forEach((w) => {
          const gx = w.position.x, gy = w.position.y + car.rWheel * 0.85;
          burst(gx, gy, 8 + s * 12, ['#b89a74', '#d8c2a0'], 'dust', 2.5 + s * 3);
          ring(gx, gy, 0.6 + s);
          if (s > 0.3) burst(gx, gy, 6 + s * 12, ['#fff3b0', '#ffc83d', '#ff9a2e'], 'spark', 3 + s * 5);
        });
        if (state.mode === 'play') {
          Sound.land(s);
          if (e.air > 900) toast('BIG AIR ' + (e.air / 1000).toFixed(1) + 's');
        }
      } else if (e.type === 'jump') {
        car.wheels.forEach((w) => { burst(w.position.x, w.position.y + car.rWheel * 0.8, 9, '#b89a74', 'dust', 2.6); ring(w.position.x, w.position.y + car.rWheel * 0.85, 0.5); });
        state.shake = Math.max(state.shake, 3);
        if (state.mode === 'play') Sound.jump();
      } else if (e.type === 'hit' && state.mode === 'play') {
        Sound.hit(); state.shake = Math.max(state.shake, 2);
      }
    }
    W.events.length = 0;

    if (state.mode === 'play') {
      if (state.started && !state.finished) state.time += dt;
      // coins
      for (const coin of W.coins) {
        if (coin.taken) continue;
        const near = Math.hypot(coin.x - x, coin.y - c.position.y) < 90 ||
          car.wheels.some((w) => Math.hypot(coin.x - w.position.x, coin.y - w.position.y) < car.rWheel + 26);
        if (near) {
          coin.taken = true; state.coins++;
          Sound.coin();
          burst(coin.x, coin.y, 14, ['#ffd84a', '#fff3b0', '#ffb300'], 'spark', 4);
          const total = store.get('coins', 0) + 1; store.set('coins', total);
          emit('stats', { coins: total });
          ui.coins.classList.remove('bump'); void ui.coins.offsetWidth; ui.coins.classList.add('bump');
        }
      }
      // checkpoints
      for (const cp of W.checkpoints) {
        if (x > cp && cp > state.checkpoint) {
          state.checkpoint = cp;
          if (cp > W.TOWN_END) { Sound.checkpoint(); toast('CHECKPOINT'); }
        }
      }
      // arcade doors
      let door = null;
      if (!state.finished) {
        // a lit door stays lit a little past its edge, so a car that is
        // still coasting to a stop doesn't lose the prompt
        for (const b of W.buildings) {
          const reach = W.doorHalf + (state.door === b ? 90 : 0);
          if (Math.abs(x - b.x) < reach) door = b;
        }
      }
      if (door !== state.door) { state.door = door; showDoorPrompt(door); }
      // finish
      if (!state.finished && x > W.FINISH_X) finish();
      // flipped: put the car back on its wheels at the last checkpoint
      if (car.flipTime > 1800) { toast('FLIPPED! BACK ON YOUR WHEELS'); spawnAt(state.checkpoint, true); }
    } else {
      if (x > W.FINISH_X + 250 || car.flipTime > 2500) resetRun();
    }

    if (car.chassis) emitCarParticles(dt);
    if (state.theme === 'rain') {
      const half = Wd / cam.z;
      rainTick(dt, cam.x - half * cam.fx, cam.x + half * (1 - cam.fx));
    }
    updateParticles(dt);

    const rpm = clamp(Math.abs(car.wheels[1].angularVelocity * car.rWheel) / car.v.maxSpeed, 0, 1.2);
    if (state.countdown > 0) Sound.engine(car.throttle, car.throttle, !state.paused);
    else Sound.engine(rpm, car.throttle, state.mode === 'play' && !state.paused);
    updateCamera(dt);
    if (state.mode === 'play') updateHud();
  }

  function updateCamera(dt) {
    const c = car.chassis, k = dt / 16.67;
    const vel = window.Matter.Body.getVelocity(c);
    const f = focusPoint();
    cam.fx = lerp(cam.fx, f.fx, 0.04 * k); cam.fy = lerp(cam.fy, f.fy, 0.04 * k);
    cam.look = lerp(cam.look, clamp(vel.x * 14, -200, 320), 0.03 * k);
    cam.x = lerp(cam.x, c.position.x + cam.look, 0.12 * k);
    cam.y = lerp(cam.y, c.position.y + clamp(vel.y * 6, -120, 160), 0.08 * k);
    const speed = Math.hypot(vel.x, vel.y);
    const target = baseZoom() * (1 - clamp(speed / 26, 0, 1) * 0.14);
    cam.z = lerp(cam.z || target, target, 0.03 * k);
    state.shake *= Math.pow(0.88, k);
    cam.punch = (cam.punch || 0) * Math.pow(0.86, k);
  }

  /* -------------------------------------------------------------- render */
  function toScreen(x, y) {
    return { x: (x - cam.x) * cam.z + cam.fx * Wd, y: (y - cam.y) * cam.z + cam.fy * Ht };
  }

  /* Frame order. The world is drawn first onto a cleared (transparent)
     canvas. At night a single moonlight tint is laid over whatever was drawn
     ('source-atop' touches only drawn pixels), then light sources are added
     on top ('lighter'). The sky goes in last, behind everything
     ('destination-over'), so stars and the moon sit behind the mountains and
     clouds without repainting the world twice. */
  const lights = [];
  function addLight(x, y, r, rgb, a) { if (state.night) lights.push({ x, y, r, rgb, a }); }

  function render() {
    lights.length = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, Wd, Ht);
    drawParallax();
    // At night the far background (mountains, skyline, clouds) gets a strong
    // night tint here, before the world is drawn over it; the world itself
    // only gets a light moonlight tint later, so it stays clearly visible.
    if (state.night) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = state.theme === 'rain' ? 'rgba(52,62,82,0.5)' : 'rgba(12,18,56,0.52)';
      ctx.fillRect(0, 0, Wd, Ht);
      ctx.globalCompositeOperation = 'source-over';
    }
    const sx = (Math.random() - 0.5) * state.shake, sy = (Math.random() - 0.5) * state.shake;
    const cz = cam.z * (1 + (cam.punch || 0));
    const z = cz * dpr;
    ctx.setTransform(z, 0, 0, z, (cam.fx * Wd - cam.x * cz + sx) * dpr, (cam.fy * Ht - cam.y * cz + sy) * dpr);
    const x0 = cam.x - (cam.fx * Wd) / cam.z - 200, x1 = cam.x + ((1 - cam.fx) * Wd) / cam.z + 200;
    drawScenery(x0, x1);
    drawBuildings(x0, x1);
    drawTerrain(x0, x1);
    drawRamps(x0, x1);
    drawProps(x0, x1);
    drawCoins(x0, x1);
    drawParticles('back');
    drawCar();
    drawParticles('front');
    drawForeground(x0, x1);
    if (state.night) drawNight();
    if (state.theme === 'rain') drawRain();
    drawSpeedFx();
    drawSky();
  }

  /* Speed lines and a vignette that build up near top speed, plus the white
     flash of a hard landing. Screen space, drawn over the world. */
  let vignette = null;
  function drawSpeedFx() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const flash = state.flash || 0;
    if (flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, Wd, Ht); }
    if (state.mode !== 'play' || !car.chassis) return;
    const f = clamp((W.forwardSpeed() / car.v.maxSpeed - 0.45) / 0.4, 0, 1);
    if (f <= 0) return;
    if (!vignette || vignette.w !== Wd || vignette.h !== Ht) {
      const g = ctx.createRadialGradient(Wd / 2, Ht / 2, Math.min(Wd, Ht) * 0.35, Wd / 2, Ht / 2, Math.hypot(Wd, Ht) * 0.6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,4,24,0.55)');
      vignette = { w: Wd, h: Ht, g };
    }
    ctx.globalAlpha = f; ctx.fillStyle = vignette.g; ctx.fillRect(0, 0, Wd, Ht); ctx.globalAlpha = 1;
    const t = state.t / 1000, n = 26;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const y = rnd(i * 7.1 + 3) * Ht;
      if (Math.abs(y - Ht * cam.fy) < Ht * 0.12) continue;          // keep the car's lane clear
      const len = (80 + rnd(i + 5) * 180) * (0.5 + f);
      const x = Wd - ((t * (1400 + rnd(i + 9) * 900) + rnd(i + 2) * Wd * 2) % (Wd * 2 + len));
      ctx.strokeStyle = `rgba(255,255,255,${(0.25 + rnd(i + 4) * 0.35) * f})`;
      ctx.lineWidth = 1.5 + rnd(i + 8) * 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
  }

  /* Crows (Morning only): a few crows far off in the sky, between the
     clouds and the mountains. They are drawn small and a little faded, as if
     at a distance, glide on a slow wavy path, and cross in both directions:
     some left to right, some right to left. The crow_1 / crow_2 art gives
     the wings-up / wings-down frames of a slow flap. */
  const CROWS = [
    { dir: 1, speed: 38, scale: 0.36, y: 0.24, phase: 0.1, alpha: 0.9 },
    { dir: -1, speed: 30, scale: 0.3, y: 0.31, phase: 0.55, alpha: 0.82 },
    { dir: 1, speed: 24, scale: 0.24, y: 0.19, phase: 0.8, alpha: 0.72 }
  ];
  function drawCrows() {
    if (state.theme !== 'morning') return;
    const f1 = img.crow_1, f2 = img.crow_2;
    if (!ready(f1) || !ready(f2)) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = state.t / 1000, k = clamp(Math.min(Wd, Ht) / 900, 0.65, 1.1);
    for (const c of CROWS) {
      const lap = Wd + 240;
      const d = (t * c.speed * k + c.phase * lap) % lap;
      const x = c.dir > 0 ? d - 120 : Wd + 120 - d;
      const y = Ht * c.y + Math.sin(t * 0.5 + c.phase * 9) * 14 * k;
      // slow flap with long glides, like a crow cruising far away
      const glide = Math.sin(t * 0.35 + c.phase * 6) > 0.3;
      const up = !glide && Math.sin(t * 5 + c.phase * 4) > 0;
      const fr = up ? f1 : f2;
      const w = fr.naturalWidth * c.scale * k, h = fr.naturalHeight * c.scale * k;
      // both frames face right once crow_1 is mirrored; flip again to fly left
      const face = (up ? -1 : 1) * c.dir;
      ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(x, y);
      if (face < 0) ctx.scale(-1, 1);
      ctx.drawImage(hq(fr, w, h, true), -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
  function drawCrow(x, y, s, flap, alpha) {
    const night = state.theme === 'night';
    const body = night ? '#39406a' : '#1c1e2b', wing = night ? '#4a5388' : '#2b2e45', far = night ? '#2c3257' : '#141620';
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
    if (night) { ctx.shadowColor = 'rgba(190,205,255,0.55)'; ctx.shadowBlur = 6; }
    // a broad feathered wing hinged at the shoulder; f > 0 raised, f < 0 lowered
    const wingShape = (f, span, shift) => {
      const tipX = -0.5 * s + shift, tipY = -span * f * s;
      ctx.beginPath();
      ctx.moveTo(0.28 * s + shift, -0.06 * s);
      ctx.quadraticCurveTo(0.05 * s + shift, tipY * 0.7, tipX, tipY);
      // three feather notches back along the trailing edge
      ctx.lineTo(tipX + 0.06 * s, tipY * 0.82 + 0.05 * s);
      ctx.lineTo(tipX - 0.02 * s, tipY * 0.7 + 0.04 * s);
      ctx.lineTo(tipX + 0.05 * s, tipY * 0.55 + 0.06 * s);
      ctx.lineTo(tipX - 0.02 * s, tipY * 0.42 + 0.05 * s);
      ctx.quadraticCurveTo(-0.3 * s + shift, tipY * 0.15, -0.32 * s + shift, -0.04 * s);
      ctx.closePath(); ctx.fill();
    };
    // far wing, behind the body, slightly out of phase
    ctx.fillStyle = far; wingShape(flap * 0.85 + 0.1, 0.85, 0.12 * s);
    // tail, body, head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-0.5 * s, -0.05 * s); ctx.lineTo(-1.1 * s, -0.2 * s); ctx.lineTo(-1.02 * s, 0.05 * s); ctx.lineTo(-1.12 * s, 0.2 * s); ctx.lineTo(-0.5 * s, 0.12 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.02 * s, 0.7 * s, 0.3 * s, -0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0.7 * s, -0.12 * s, 0.25 * s, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // beak and eye
    ctx.fillStyle = night ? '#b8b3a6' : '#8e8a82';
    ctx.beginPath(); ctx.moveTo(0.88 * s, -0.2 * s); ctx.lineTo(1.26 * s, -0.08 * s); ctx.lineTo(0.88 * s, -0.01 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(0.77 * s, -0.17 * s, 0.05 * s, 0, TAU); ctx.fill();
    // near wing, in front of the body
    ctx.fillStyle = wing; wingShape(flap, 1.0, 0);
    ctx.restore();
  }

  /* Rain: slanted streaks in two depths, splashes on the road, and now and
     then a lightning flash with a bolt and a roll of thunder. */
  const DROPS = Array.from({ length: 220 }, (_, i) => ({
    x: rnd(i * 2.3 + 1), y: rnd(i * 4.1 + 2), s: 0.6 + rnd(i * 1.7 + 3) * 0.8, far: i % 3 === 0
  }));
  function drawRain() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Drops are sized to the screen: shorter, finer and denser on phones so
    // they read as rain rather than a few long scratches.
    const t = state.t / 1000, small = Math.min(Wd, Ht);
    const sc = clamp(small / 800, 0.5, 1);
    const n = Math.round(DROPS.length * 0.45 * clamp(Wd * Ht / (1440 * 900), 0.7, 1));   // light rain
    const slant = 0.2, drift = (cam.x * cam.z * 0.6) % Wd;
    ctx.lineCap = 'round';
    for (const far of [true, false]) {
      ctx.strokeStyle = far ? 'rgba(200,214,232,0.18)' : 'rgba(222,233,248,0.38)';
      ctx.lineWidth = (far ? 0.8 : 1.2) * (0.75 + 0.25 * sc);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = DROPS[i];
        if (d.far !== far) continue;
        const sp = (far ? 700 : 1150) * d.s * (0.7 + 0.3 * sc), len = (far ? 11 : 20) * d.s * sc;
        const y = ((d.y * (Ht + 60) + t * sp) % (Ht + 60)) - 30;
        const x = (((d.x * (Wd + 200) - drift - y * slant) % (Wd + 200)) + Wd + 200) % (Wd + 200) - 100;
        ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
      }
      ctx.stroke();
    }
    // lightning
    const L = state.lightning || 0;
    if (L > 0.01) {
      ctx.fillStyle = `rgba(230,238,255,${0.45 * L})`; ctx.fillRect(0, 0, Wd, Ht);
      if (L > 0.55 && state.bolt) {
        ctx.strokeStyle = `rgba(255,255,255,${L})`; ctx.lineWidth = 3; ctx.shadowColor = '#cfe0ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); state.bolt.forEach(([bx, by], i) => ctx[i ? 'lineTo' : 'moveTo'](bx * Wd, by * Ht)); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }
  function rainTick(dt, x0, x1) {
    state.lightning = (state.lightning || 0) * Math.pow(0.9, dt / 16.67);
    state.nextBolt = (state.nextBolt || 4000) - dt;
    if (state.nextBolt <= 0) {
      state.nextBolt = 6000 + Math.random() * 9000;
      state.lightning = 1;
      let bx = 0.2 + Math.random() * 0.6, by = 0; const pts = [[bx, by]];
      while (by < 0.45) { by += 0.05 + Math.random() * 0.06; bx += (Math.random() - 0.5) * 0.08; pts.push([bx, by]); }
      state.bolt = pts;
      Sound.thunder(300 + Math.random() * 700);
    }
    // splashes on the road around the camera
    const k = Math.random() < 0.6 ? 1 : 0;
    for (let i = 0; i < k; i++) {
      if (particles.length > 380) break;
      const sx = x0 + Math.random() * (x1 - x0);
      particles.push({ x: sx, y: W.heightAt(sx) + 2 + Math.random() * 14, vx: 0, vy: 0, size: 1.5, life: 260, max: 260,
        color: 'rgba(215,228,245,1)', kind: 'ring', rot: 0, vr: 1.1 + Math.random() * 0.8 });
    }
  }

  /* 3-2-1-GO start: the truck revs and pops, controls unlock on GO. */
  function tickCountdown(dt) {
    const before = Math.ceil(state.countdown / 600);
    state.countdown -= dt;
    const after = Math.ceil(state.countdown / 600);
    const rev = 0.35 + 0.35 * Math.abs(Math.sin(state.t / 140));
    car.throttle = rev;
    if (after !== before) {
      if (after > 0) { countdownToast(String(after)); Sound.beep(false); }
      else { countdownToast('GO!'); Sound.beep(true); state.shake = 6; cam.punch = 0.06; car.throttle = 0.9; state.wasGas = true; }
    }
  }
  function countdownToast(text) {
    ui.toast.classList.add('count');
    toast(text);
  }

  function drawNight() {
    // moonlight: a light cool tint over the world, so the truck, trees and
    // houses keep close to their own brightness against the night sky
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = state.theme === 'rain' ? 'rgba(45,58,82,0.2)' : 'rgba(30,45,120,0.14)';
    ctx.fillRect(0, 0, Wd, Ht);
    ctx.globalCompositeOperation = 'lighter';
    // moon glitter on the water
    const t = state.t / 1000;
    const seaY = (SEA - cam.y) * cam.z + cam.fy * Ht, mx = Wd * 0.82;
    if (seaY < Ht && state.theme === 'night') {
      for (let k = 0; k < 12; k++) {
        const y = seaY + 8 + k * 13 * Math.max(0.6, cam.z);
        if (y > Ht) break;
        const w = (130 - k * 8) * (0.6 + 0.4 * Math.sin(t * 2.2 + k * 1.7));
        ctx.fillStyle = `rgba(255,244,205,${0.3 * (1 - k / 12)})`;
        ctx.fillRect(mx - w / 2 + Math.sin(t * 1.3 + k) * 10, y, w, 3);
      }
    }
    // light sources, in world space
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, (cam.fx * Wd - cam.x * cam.z) * dpr, (cam.fy * Ht - cam.y * cam.z) * dpr);
    for (const L of lights) {
      if (L.sign) continue;
      if (L.cone) {
        const g = ctx.createLinearGradient(0, L.y, 0, L.ground);
        g.addColorStop(0, `rgba(255,226,150,${L.a})`); g.addColorStop(1, 'rgba(255,226,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(L.x - 10, L.y); ctx.lineTo(L.x + 10, L.y);
        ctx.lineTo(L.x + L.spread, L.ground); ctx.lineTo(L.x - L.spread, L.ground); ctx.closePath(); ctx.fill();
      } else drawGlow(L.x, L.y, L.r, L.rgb, L.a, 0.05);
    }
    drawHeadlights();
    ctx.globalCompositeOperation = 'source-over';
    for (const L of lights) if (L.sign) drawSignFace(L.cx, L.sy, L.g);
  }

  // Headlight beam from the front of whichever car is being driven.
  function drawHeadlights() {
    const c = car.chassis, v = car.v;
    if (!c) return;
    const f = spriteLocal(v.bodySize[0] - 12, v.bodySize[1] * (car.key === 'truck' ? 0.58 : 0.62));
    const p = localToWorld(f.x, f.y);
    const len = 460, spread = 0.2;
    const ax = Math.cos(c.angle), ay = Math.sin(c.angle);
    const g = ctx.createLinearGradient(p.x, p.y, p.x + ax * len, p.y + ay * len);
    g.addColorStop(0, 'rgba(255,242,200,0.42)'); g.addColorStop(1, 'rgba(255,242,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 4);
    ctx.lineTo(p.x + Math.cos(c.angle - spread) * len, p.y + Math.sin(c.angle - spread) * len);
    ctx.lineTo(p.x + Math.cos(c.angle + spread * 0.6) * len, p.y + Math.sin(c.angle + spread * 0.6) * len);
    ctx.lineTo(p.x, p.y + 4); ctx.closePath(); ctx.fill();
    drawGlow(p.x, p.y, 40, '255,244,210', 0.8, 0.05);
    // exhaust glow when the flames are going
    if (car.throttle > 0.55) {
      const ex = spriteLocal(v.exhaust[0], v.exhaust[1]), e = localToWorld(ex.x, ex.y);
      drawGlow(e.x, e.y, 90, '255,140,50', (car.throttle - 0.5) * 1.2, 0.05);
    }
  }

  /* Image quality. The browser's per-frame resizing is fast but rough: big
     sprites shrunk 3-4x (the truck, wheels, crates) come out jagged and small
     ones stretched (clouds, houses) come out blocky. So each sprite is
     resized once, with high quality and in gentle 2x steps, to the size it
     actually covers on screen (in ~12% size buckets), and that copy is drawn
     at practically 1:1. Copies are kept, so there is no per-frame cost. */
  const hqCache = new Map();
  let hqId = 0;
  function resample(src, W2, H2) {
    let cur = src, cw = src.naturalWidth || src.width, ch = src.naturalHeight || src.height;
    const step = (nw, nh) => {
      const c = document.createElement('canvas'); c.width = nw; c.height = nh;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh;
    };
    while (cw / 2 >= W2 && ch / 2 >= H2) step(Math.round(cw / 2), Math.round(ch / 2));
    while (cw * 2 <= W2 && ch * 2 <= H2) step(cw * 2, ch * 2);
    if (cw !== W2 || ch !== H2) step(W2, H2);
    return cur;
  }
  function hq(src, w, h, screen) {
    const scale = (screen ? 1 : cam.z) * dpr;
    const tw = w * scale;
    if (!(tw >= 2)) return src;
    const bucket = Math.round(Math.log(tw) / Math.log(1.12));
    const aspect = Math.round((h / w) * 40);
    if (!src.__hq) src.__hq = ++hqId;
    const key = src.__hq + ':' + bucket + ':' + aspect;
    let c = hqCache.get(key);
    if (c) { hqCache.delete(key); hqCache.set(key, c); }       // mark as recently used
    else {
      const W2 = Math.max(1, Math.round(Math.pow(1.12, bucket)));
      c = resample(src, W2, Math.max(1, Math.round(W2 * h / w)));
      hqCache.set(key, c);
      while (hqCache.size > 120) hqCache.delete(hqCache.keys().next().value);   // drop least recently used
    }
    return c;
  }
  const usable = (src) => src && (src instanceof HTMLCanvasElement || ready(src));
  function blit(src, x, y, w, h, screen) {
    if (usable(src)) ctx.drawImage(hq(src, w, h, screen), x, y, w, h);
  }

  /* Glows (sun, coins, doors, haunted houses) are soft radial gradients.
     Building a big gradient and filling it every frame was one of the most
     expensive things on screen, so each colour is rendered once into a small
     sprite and then just stamped where it's needed. */
  const glowCache = {};
  function glowSprite(rgb, inner) {
    const key = rgb + '|' + inner;
    if (glowCache[key]) return glowCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 64 * inner, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (glowCache[key] = c);
  }
  function drawGlow(x, y, radius, rgb, alpha, inner) {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(glowSprite(rgb, inner || 0), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  let skyCache = null;
  // Stars for the night sky, as fractions of the screen; they twinkle.
  const STARS = Array.from({ length: 150 }, (_, i) => ({
    x: rnd(i * 3.7 + 1), y: rnd(i * 5.3 + 2) * 0.72, r: 0.6 + rnd(i * 2.1 + 3) * 1.4, p: rnd(i + 9) * TAU
  }));

  // The sky is painted behind everything already on the canvas, so each
  // piece here goes *behind* the one before it (front-most first).
  function drawSky() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    const theme = state.theme;
    const cx = Wd * (theme === 'night' ? 0.82 : 0.84), cy = Ht * (theme === 'night' ? 0.17 : 0.16);
    const r = Math.min(Wd, Ht) * (theme === 'night' ? 0.055 : 0.07);
    if (theme === 'rain') {
      // no sun: a dim glow behind the overcast
      drawGlow(cx, cy, r * 4, '220,228,240', 0.25, 0.1);
    } else if (theme === 'night') {
      ctx.fillStyle = 'rgba(120,120,100,0.22)';                  // moon craters
      for (const [dx, dy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12], [0.35, -0.35, 0.1]]) {
        ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, cr * r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#f5f1da'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      drawGlow(cx, cy, r * 4, '200,215,255', 0.35, 0.1);
      const t = state.t / 1000, drift = cam.x * 0.01;
      for (const st of STARS) {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.2 + st.p));
        ctx.fillStyle = `rgba(255,255,255,${tw})`;
        const sx = ((st.x * Wd - drift) % Wd + Wd) % Wd;
        ctx.beginPath(); ctx.arc(sx, st.y * Ht, st.r, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      drawGlow(cx, cy, r * 3.2, '255,248,200', 0.9, 0.12);
    }
    const key = Ht + theme;
    if (!skyCache || skyCache.key !== key) {
      const g = ctx.createLinearGradient(0, 0, 0, Ht);
      if (theme === 'rain') { g.addColorStop(0, '#3c4658'); g.addColorStop(0.55, '#6b7688'); g.addColorStop(1, '#98a3b3'); }
      else if (theme === 'night') { g.addColorStop(0, '#060d2b'); g.addColorStop(0.55, '#132256'); g.addColorStop(1, '#2a3d7a'); }
      else { g.addColorStop(0, '#5bb8f0'); g.addColorStop(0.55, '#a9ddf8'); g.addColorStop(1, '#e3f5ff'); }
      skyCache = { key, g };
    }
    ctx.fillStyle = skyCache.g; ctx.fillRect(0, 0, Wd, Ht);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Layers behind the world scroll slower than the camera (factor f).
  function layerX(x, f) { return (x - cam.x * f) * cam.z + cam.fx * Wd; }
  function layerY(y, f) { return (y - cam.y * f) * cam.z + cam.fy * Ht; }

  function drawParallax() {
    const z = cam.z;
    // clouds (cloud.png): two depths drifting slowly; the far layer is
    // smaller, fainter and slower, which gives the sky some depth
    const cloud = img.cloud;
    if (ready(cloud)) {
      const ratio = cloud.naturalHeight / cloud.naturalWidth;
      [
        { f: 0.04, span: 700, size: 130, alpha: 0.7, band: [0.06, 0.16], speed: 0.004, seed: 31 },
        { f: 0.09, span: 950, size: 210, alpha: 0.95, band: [0.1, 0.3], speed: 0.008, seed: 0 }
      ].forEach((L) => {
        const drift = state.t * L.speed;
        const i0 = Math.floor((cam.x * L.f - drift - cam.fx * Wd / z) / L.span) - 2;
        const i1 = i0 + Math.ceil(Wd / z / L.span) + 4;
        ctx.globalAlpha = L.alpha;
        for (let i = i0; i <= i1; i++) {
          const k = i + L.seed;
          const w = L.size * (0.75 + rnd(k + 3) * 0.6) * Math.max(0.6, z);
          const cx = layerX(i * L.span + rnd(k) * L.span * 0.5 + drift, L.f);
          const cy = Ht * (L.band[0] + rnd(k + 7) * (L.band[1] - L.band[0]));
          if (cx + w < 0 || cx - w > Wd) continue;
          blit(cloud, cx, cy, w, w * ratio, true);
        }
      });
      ctx.globalAlpha = 1;
    }
    // two mountain ranges
    ctx.globalAlpha = 1;
    drawCrows();                                   // distant crows (Morning only), behind the mountains
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // two mountain ranges from the mountain art; the drawn triangles are only
    // a fallback while the images load
    if (!drawMountains(0.14, ['mountain_2', 'mountain_3'], 560, -40, 0.4, '169,195,216', 1))
      drawRange(0.14, 560, 260, 520, '#b3c2d8', '#dde6f2', 180, 1);
    if (!drawMountains(0.3, ['mountain_1', 'mountain_4'], 470, 50, 0.14, '150,168,166', 2))
      drawRange(0.3, 430, 170, 330, '#94a6c2', null, 120, 2);
    // Town skyline behind Main Street: background_house1.png, hazed toward
    // the sky colour so it reads as distant, tiled (every other copy
    // mirrored) and scrolling slower than the road.
    const tf = 0.55;
    const sky = skylineImage();
    if (sky && cam.x < W.TOWN_END + 2500) {
      const tw = 660, th = tw * sky.height / sky.width, step = tw - 40;
      const base = layerY(70, tf);
      const i0 = Math.floor((cam.x * tf - cam.fx * Wd / z) / step) - 1;
      const i1 = i0 + Math.ceil(Wd / z / step) + 2;
      const last = Math.ceil((W.TOWN_END * tf + 900) / step);
      for (let i = Math.max(i0, -4); i <= Math.min(i1, last); i++) {
        const bx = i * step + rnd(i + 40) * 30;
        const sx = layerX(bx, tf), w = tw * z, h = th * z;
        ctx.save();
        const tile = hq(sky, w, h, true);
        if (i % 2) { ctx.translate(sx + w, 0); ctx.scale(-1, 1); ctx.drawImage(tile, 0, base - h, w, h); }
        else ctx.drawImage(tile, sx, base - h, w, h);
        ctx.restore();
        ctx.fillStyle = '#b8b3c9';                   // under the skyline, for when the camera rises
        ctx.fillRect(sx, base - 2 * z, w + 1, Ht);
      }
    }
  }

  let skylineCache = null;
  function skylineImage() {
    if (skylineCache) return skylineCache;
    const src = img.background_house1;
    if (!ready(src)) return null;
    const c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';      // tint only the buildings, not the transparent sky
    g.fillStyle = 'rgba(170, 200, 235, 0.38)';
    g.fillRect(0, 0, c.width, c.height);
    skylineCache = c;
    return c;
  }

  /* Mountains (mountain_1-4.png) at scale 1: the camera zoom is the only
     thing that changes their size. Each range scrolls at its own parallax
     factor `f` and alternates its two images, some mirrored, at uneven
     spacing. The far range is hazed toward the sky so it reads as distant;
     a matching haze colour fills in below the range for when the camera
     climbs above it. */
  const hazeCache = {};
  function hazed(key, haze) {
    const id = key + '|' + haze;
    if (hazeCache[id]) return hazeCache[id];
    const src = img[key];
    if (!ready(src)) return null;
    const c = document.createElement('canvas');
    c.width = src.naturalWidth; c.height = src.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(185,212,236,${haze})`;
    g.fillRect(0, 0, c.width, c.height);
    return (hazeCache[id] = c);
  }
  function drawMountains(f, keys, spacing, baseOff, haze, fill, seed) {
    const pics = keys.map((k) => hazed(k, haze));
    if (pics.some((p) => !p)) return false;
    const z = cam.z, base = layerY(baseOff, f);
    // misty valley under the range: the mountain colour fading into haze
    const mist = ctx.createLinearGradient(0, base - 2, 0, base + 160 * z);
    mist.addColorStop(0, `rgba(${fill},1)`); mist.addColorStop(1, 'rgba(200,226,244,1)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, base - 2, Wd, Ht - base + 2);
    const i0 = Math.floor((cam.x * f - cam.fx * Wd / z) / spacing) - 2;
    const i1 = i0 + Math.ceil(Wd / z / spacing) + 4;
    for (let i = i0; i <= i1; i++) {
      const pic = pics[((i % 2) + 2) % 2];
      const w = pic.width, h = pic.height;
      const px = i * spacing + (rnd(i * seed + 5) - 0.5) * spacing * 0.35;
      const sx = layerX(px - w / 2, f);
      if (sx > Wd || sx + w * z < 0) continue;
      const tile = hq(pic, w * z, h * z, true);
      ctx.save();
      if (rnd(i * seed + 13) > 0.5) { ctx.translate(sx + w * z, 0); ctx.scale(-1, 1); ctx.drawImage(tile, 0, base - h * z, w * z, h * z); }
      else ctx.drawImage(tile, sx, base - h * z, w * z, h * z);
      ctx.restore();
    }
    return true;
  }

  function drawRange(f, spacing, hMin, hMax, color, snow, baseOff, seed) {
    const z = cam.z;
    const base = layerY(baseOff, f);
    const i0 = Math.floor((cam.x * f - cam.fx * Wd / z) / spacing) - 2;
    const i1 = i0 + Math.ceil(Wd / z / spacing) + 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(layerX(i0 * spacing, f), Ht + 10);
    for (let i = i0; i <= i1; i++) {
      const px = i * spacing + rnd(i * seed + 5) * spacing * 0.4;
      const h = hMin + rnd(i * seed + 9) * (hMax - hMin);
      ctx.lineTo(layerX(px - spacing * 0.55, f), base);
      ctx.lineTo(layerX(px, f), base - h * z);
      ctx.lineTo(layerX(px + spacing * 0.55, f), base);
    }
    ctx.lineTo(layerX(i1 * spacing + spacing, f), Ht + 10);
    ctx.lineTo(layerX(i0 * spacing, f), Math.max(base, Ht + 10));
    ctx.fill();
    ctx.fillRect(0, base - 1, Wd, Ht - base + 2);
    if (!snow) return;
    ctx.fillStyle = snow;
    for (let i = i0; i <= i1; i++) {
      const px = i * spacing + rnd(i * seed + 5) * spacing * 0.4;
      const h = hMin + rnd(i * seed + 9) * (hMax - hMin);
      if (h < hMin + (hMax - hMin) * 0.45) continue;
      const tx = layerX(px, f), ty = base - h * z, d = h * z * 0.2, w = d * (spacing * 0.55) / h / z * z;
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(tx + w, ty + d); ctx.lineTo(tx + w * 0.3, ty + d * 0.8);
      ctx.lineTo(tx - w * 0.2, ty + d * 1.05); ctx.lineTo(tx - w, ty + d); ctx.fill();
    }
  }

  function drawScenery(x0, x1) {
    // Trees (tree.png) everywhere there's room: a grove before the start
    // line, in the gaps between the buildings on Main Street, and all over the
    // hills. They keep clear of buildings and signs so nothing gets covered.
    const signs = [W.SPAWN_X - 250, W.TOWN_END - 250];
    const clearOf = (x, gap) => !W.buildings.some((b) => Math.abs(b.x - x) < gap) &&
      !signs.some((sx) => Math.abs(sx - x) < 130);
    for (let x = Math.floor(x0 / 170) * 170; x < x1; x += 170) {
      const i = Math.round(x / 170), gy = vergeAt(x);
      const tx = x + rnd(i) * 80;
      if (x <= 0) {
        if (rnd(i + 11) > 0.25 && clearOf(tx, 0)) drawTree(tx, vergeAt(tx), 0.85 + rnd(i + 4) * 0.5, rnd(i + 5) > 0.5);
      } else if (x < W.TOWN_END - 100) {
        if (i % 4 === 0 && clearOf(x, 260)) drawLamp(x, gy);
        else if (rnd(i + 21) > 0.45 && clearOf(tx, 330)) drawTree(tx, vergeAt(tx), 0.75 + rnd(i + 4) * 0.35, rnd(i + 5) > 0.5);
        else if (rnd(i) > 0.72) { const gx = x + rnd(i + 1) * 60; drawGrass('grass_1', gx, vergeAt(gx), 8, rnd(i + 2) > 0.5); }
      } else if (x > W.TOWN_END + 200 && rnd(i + 11) > 0.35) {
        drawTree(tx, vergeAt(tx), 0.8 + rnd(i + 4) * 0.6, rnd(i + 5) > 0.5);
      }
    }
    // an occasional grass clump (grass_1) by the roadside in the hills
    for (let x = Math.floor(x0 / 300) * 300; x < x1; x += 300) {
      const k = Math.round(x / 300);
      if ((x <= 0 || x > W.TOWN_END + 100) && rnd(k + 71) > 0.6) {
        const gx = x + rnd(k + 72) * 50;
        drawGrass('grass_1', gx, vergeAt(gx), 8, rnd(k + 73) > 0.5);
      }
    }
    // "MOUNTAINS -->" sign, like the reference
    const mx = W.TOWN_END - 250;
    if (mx > x0 && mx < x1) drawSign(mx, vergeAt(mx), 'MOUNTAINS  →');
    // start line
    if (W.SPAWN_X + 180 > x0 && W.SPAWN_X - 400 < x1) drawSign(W.SPAWN_X - 250, vergeAt(W.SPAWN_X - 250), 'START ▶');
    // finish arch
    if (W.FINISH_X > x0 - 300 && W.FINISH_X < x1 + 300) drawFinish(W.FINISH_X);
    if (W.END_X > x0 - 100 && W.END_X < x1 + 100) drawBarrier(W.END_X);
  }

  function outline(w) { ctx.lineWidth = w || 4; ctx.strokeStyle = '#1b2033'; ctx.lineJoin = 'round'; }

  function drawLamp(x, gy) {
    addLight(x + 36, gy - 198, 90, '255,226,150', 0.75);
    if (state.night) lights.push({ cone: true, x: x + 36, y: gy - 190, ground: gy + 40, spread: 90, a: 0.28 });
    outline(3);
    ctx.fillStyle = '#3b3f58';
    ctx.fillRect(x - 4, gy - 190, 8, 190); ctx.strokeRect(x - 4, gy - 190, 8, 190);
    ctx.beginPath(); ctx.moveTo(x, gy - 186); ctx.quadraticCurveTo(x + 4, gy - 214, x + 34, gy - 206); ctx.stroke();
    ctx.fillStyle = '#ffe79a';
    ctx.beginPath(); ctx.arc(x + 36, gy - 198, 10, 0, TAU); ctx.fill(); ctx.stroke();
  }

  // Grass sprites at scale 1, standing on the verge. `sink` sets how far the
  // base goes down behind the road edge; `flip` mirrors it for variety.
  function drawGrass(key, x, gy, sink, flip) {
    const g = img[key];
    if (!ready(g)) { if (key === 'grass_1') drawBush(x, gy, 1); return; }
    const w = g.naturalWidth, h = g.naturalHeight;
    ctx.save(); ctx.translate(x, gy + sink);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(hq(g, w, h), -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawBush(x, gy, s) {
    outline(3);
    ctx.fillStyle = '#5da643';
    ctx.beginPath();
    ctx.arc(x - 22 * s, gy - 14 * s, 20 * s, Math.PI, 0);
    ctx.arc(x, gy - 24 * s, 24 * s, Math.PI, 0);
    ctx.arc(x + 24 * s, gy - 14 * s, 18 * s, Math.PI, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7cc55a';
    ctx.beginPath(); ctx.arc(x - 6 * s, gy - 32 * s, 8 * s, 0, TAU); ctx.fill();
  }

  // tree.png, planted by the base of its trunk; `flip` mirrors every other
  // tree so the hills don't look copy-pasted. Falls back to a drawn pine
  // until the image has loaded.
  const TREE_H = 270, TREE_BASE_X = 0.46;
  // Two trees: tree.png and the apple tree tree_2.png, picked per spot so
  // about half the trees are apple trees. Each is planted by its trunk base.
  const TREE_ART = { tree: { h: 1, base: TREE_BASE_X }, tree_2: { h: 0.95, base: 0.49 } };
  function drawTree(x, gy, s, flip) {
    const key = rnd(Math.round(x) * 0.013 + 7) > 0.5 && ready(img.tree_2) ? 'tree_2' : 'tree';
    const t = img[key], art = TREE_ART[key];
    if (!ready(t)) { drawPine(x, gy, s, flip); return; }
    const h = TREE_H * s * art.h, w = h * t.naturalWidth / t.naturalHeight;
    ctx.save();
    ctx.translate(x, gy + 6 * s);            // sink the trunk a touch so it never floats on a slope
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(hq(t, w, h), -w * art.base, -h, w, h);
    ctx.restore();
  }

  function drawPine(x, gy, s, dark) {
    outline(3);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(x - 6 * s, gy - 40 * s, 12 * s, 44 * s);
    ctx.fillStyle = dark ? '#2f7d4f' : '#3f9a5c';
    for (let k = 0; k < 3; k++) {
      const y = gy - 40 * s - k * 42 * s, w = (62 - k * 14) * s;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - 70 * s); ctx.lineTo(x + w, y); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  function drawSign(x, gy, text) {
    outline(4);
    ctx.fillStyle = '#7a5334';
    ctx.fillRect(x - 5, gy - 150, 10, 150); ctx.strokeRect(x - 5, gy - 150, 10, 150);
    ctx.font = '34px ' + FONT;
    const w = ctx.measureText(text).width + 50;
    ctx.fillStyle = '#fff8e6';
    roundRect(x - w / 2, gy - 215, w, 66, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b2033'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, gy - 181);
  }

  function drawFinish(x) {
    const gy = vergeAt(x), h = 380, half = 230;
    outline(5);
    for (const px of [x - half, x + half]) {
      ctx.fillStyle = '#e9ecf5'; ctx.fillRect(px - 9, gy - h, 18, h); ctx.strokeRect(px - 9, gy - h, 18, h);
    }
    // checkered banner
    const bw = half * 2 + 40, bh = 70, bx = x - bw / 2, by = gy - h - 20, cell = 17.5;
    ctx.save(); roundRect(bx, by, bw, bh, 8); ctx.clip();
    for (let i = 0; i * cell < bw; i++) for (let j = 0; j * cell < bh; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#1b2033' : '#ffffff'; ctx.fillRect(bx + i * cell, by + j * cell, cell, cell);
    }
    ctx.restore();
    roundRect(bx, by, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#ffc83d'; roundRect(x - 120, by + 10, 240, 50, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b2033'; ctx.font = '38px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', x, by + 37);
  }

  // Striped crash barrier where the physics wall ends the map.
  function drawBarrier(x) {
    const gy = W.heightAt(x);
    outline(5);
    for (let k = 0; k < 3; k++) {
      const y = gy - 60 - k * 70;
      ctx.save(); roundRect(x - 40, y, 90, 50, 8); ctx.clip();
      for (let i = -3; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#ff4f8b' : '#ffffff';
        ctx.beginPath(); ctx.moveTo(x - 40 + i * 22, y + 50); ctx.lineTo(x - 18 + i * 22, y); ctx.lineTo(x + 4 + i * 22, y); ctx.lineTo(x - 18 + i * 22, y + 50); ctx.fill();
      }
      ctx.restore(); roundRect(x - 40, y, 90, 50, 8); ctx.stroke();
    }
    ctx.fillStyle = '#3b3f58'; ctx.fillRect(x - 30, gy - 230, 12, 230); ctx.strokeRect(x - 30, gy - 230, 12, 230);
    ctx.fillRect(x + 28, gy - 230, 12, 230); ctx.strokeRect(x + 28, gy - 230, 12, 230);
  }

  /* Haunted houses: the wrong doors. Each has a purple glow, its own house
     art, a ghost in the doorway that drifts out as you pull up, a second
     ghost at an upper window, and bats looping round the roof. Houses are
     drawn at scale 1 (one image pixel = one world unit, never resized) and placed so
     the door in the picture sits on the door spot. */
  const HAUNT_K = 1;
  const HAUNT_DOOR = { 1: 0.49, 2: 0.49, 3: 0.75, 4: 0.40, 5: 0.43, 6: 0.50 };   // door across each image
  function drawHaunted(b) {
    const house = img['wrong_house_' + b.variant];
    if (!ready(house)) return;
    const gy = vergeAt(b.x) + 4;
    const hw = house.naturalWidth * HAUNT_K, hh = house.naturalHeight * HAUNT_K;
    const doorF = HAUNT_DOOR[b.variant] || 0.5;
    const left = b.x - hw * doorF;
    const active = state.door === b;
    b.appear = lerp(b.appear || 0, active ? 1 : 0, 0.05);

    drawGlow(left + hw / 2, gy - hh * 0.55, Math.max(hw, hh) * 0.75, '96,36,150', 0.3 + 0.15 * b.appear, 0.08);
    addLight(left + hw / 2, gy - hh * 0.55, Math.max(hw, hh) * 0.55, '140,70,210', 0.12 + 0.08 * b.appear);
    blit(house, left, gy - hh, hw, hh);

    const t = state.t / 1000;
    // door ghost: now and then steps out, stands at the entrance, goes back in
    const dg = b.door;
    if (dg) {
      drawGlow(dg.x, dg.y, 60, '190,210,255', 0.4 * dg.alpha, 0.05);
      addLight(dg.x, dg.y, 70, '185,210,255', 0.35 * dg.alpha);
      drawGhostSprite(dg.g, dg.x, dg.y, 0.95 * dg.alpha, false);
    }
    // roof ghosts: always there, hovering over the roof
    for (const r of (b.roof || roofGhosts(b))) {
      drawGlow(r.x, r.y, 70, '190,210,255', 0.35, 0.05);
      addLight(r.x, r.y, 80, '185,210,255', 0.35);
      drawGhostSprite(r.g, r.x, r.y, 0.95, r.flip);
    }
    // bats: figure-of-eight loops round the roof, flapping
    const bat = img.bat;
    if (ready(bat)) {
      const bw = 19 * 2.6, bh = 13 * 2.6, cx = left + hw / 2;
      for (let k = 0; k < 3; k++) {
        const u = t * (0.9 + k * 0.22) + k * 2.1 + b.variant;
        const bx = cx + Math.sin(u) * (hw * 0.45 + 30 * k) * (k % 2 ? -1 : 1);
        const by = gy - hh * (0.82 + 0.08 * k) + Math.sin(2 * u) * (50 + 15 * k);
        const flap = 0.3 + 0.7 * Math.abs(Math.sin(state.t / 55 + k * 1.7));
        const dir = Math.cos(u) * (k % 2 ? -1 : 1) >= 0 ? 1 : -1;
        const sprite = hq(bat, bw, bh);
        ctx.save(); ctx.translate(bx, by); ctx.scale(dir, flap);
        ctx.drawImage(sprite, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    }
  }

  // Ghosts are drawn at scale 1 (one image pixel = one world unit), like the
  // houses. They fade and float; their size never changes.
  /* House ghosts.
     - Roof ghosts: every haunted house has one or two ghosts hovering over its
       roof, always visible. They float high enough that a car driving past
       never touches them (the tallest car's roof reaches ~175 above the road),
       but low enough that a jump can (every car's jump reaches 285+). Jumping
       into one fails the run.
     - Door ghost: every 6-10 seconds a ghost steps out of the door, stands at
       the entrance for a moment and goes back in. It stays at the house and
       is harmless.
     All ghosts are drawn at scale 1. */
  const GHOST_SHOW = 2600, ROOF_GHOST_BOTTOM = 212;
  const houseGhost = (b) => img['ghost_' + (((b.variant - 1) % 4) + 1)];
  function roofGhosts(b) {
    // houses 1, 3 and 5 have two roof ghosts, the others one
    const n = b.variant % 2 ? 2 : 1, t = state.t / 1000, list = [];
    for (let k = 0; k < n; k++) {
      const g = k === 0 ? img.ghost_5 : houseGhost(b);
      const gw = ready(g) ? g.naturalWidth : 60, gh = ready(g) ? g.naturalHeight : 58;
      const spread = n === 2 ? (k === 0 ? -70 : 70) : 0;
      const x = b.x + spread + Math.sin(t * 0.6 + b.variant + k * 2.1) * 55;
      const y = W.heightAt(x) - ROOF_GHOST_BOTTOM - gh / 2 - 6 - Math.sin(t * 1.7 + k * 1.3) * 6;
      list.push({ g, x, y, gw, gh, flip: Math.cos(t * 0.6 + b.variant + k * 2.1) < 0 });
    }
    return list;
  }
  function updateHouseGhosts(dt) {
    const t = state.t / 1000;
    for (const b of W.buildings) {
      if (b.kind !== 'wrong') continue;
      // door ghost timer
      if (!b.gs) b.gs = { phase: 'in', t: 2000 + rnd(b.variant * 3.3) * 4000 };
      const gs = b.gs;
      gs.t -= dt;
      if (gs.t <= 0) {
        if (gs.phase === 'in') {
          gs.phase = 'show'; gs.t = GHOST_SHOW;
          if (state.mode === 'play' && Math.abs(b.x - cam.x) < Wd / cam.z) Sound.creak();
        } else { gs.phase = 'in'; gs.t = 6000 + Math.random() * 4000; }
      }
      // door ghost position (steps out of the door, stands at the entrance)
      b.door = null;
      if (gs.phase === 'show') {
        const g = houseGhost(b), gh = ready(g) ? g.naturalHeight : 60;
        const u = 1 - gs.t / GHOST_SHOW, out = Math.min(1, Math.min(u, 1 - u) * 5);
        b.door = { g, x: b.x, y: vergeAt(b.x) + 4 - gh / 2 - 6 + (1 - out) * 10 + Math.sin(t * 2.4) * 3, alpha: out, flip: false };
      }
      b.roof = roofGhosts(b);
      // any ghost that touches the car ends the run (door ghost once it is out)
      if (state.mode !== 'play' || state.finished || !car.chassis) continue;
      const ghosts = b.door && b.door.alpha > 0.5 ? [...b.roof, b.door] : b.roof;
      for (const gh of ghosts) if (ghostTouchesCar(gh)) { caughtByGhost(b); break; }
    }
  }

  /* Precise ghost collision: each ghost image is turned once into a grid of
     its solid (non-transparent) pixels, and those points are tested against
     the car's real physics shape: the body's hull polygons and the round
     wheels. Transparent corners of the image never count as a hit. */
  const maskCache = new Map();
  function ghostMask(g) {
    if (!ready(g)) return null;
    let m = maskCache.get(g);
    if (m) return m;
    const w = g.naturalWidth, h = g.naturalHeight, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d'); cx.drawImage(g, 0, 0);
    const d = cx.getImageData(0, 0, w, h).data, pts = [];
    for (let y = 1; y < h; y += 3) for (let x = 1; x < w; x += 3) if (d[(y * w + x) * 4 + 3] > 140) pts.push(x - w / 2, y - h / 2);
    m = { pts, hw: w / 2, hh: h / 2 };
    maskCache.set(g, m);
    return m;
  }
  function ghostTouchesCar(gh) {
    const m = ghostMask(gh.g);
    if (!m) return false;
    const parts = car.chassis.parts.length > 1 ? car.chassis.parts.slice(1) : [car.chassis];
    // quick reject: bounding boxes don't meet
    let minX = car.chassis.bounds.min.x, maxX = car.chassis.bounds.max.x, minY = car.chassis.bounds.min.y, maxY = car.chassis.bounds.max.y;
    for (const w of car.wheels) { minX = Math.min(minX, w.bounds.min.x); maxX = Math.max(maxX, w.bounds.max.x); minY = Math.min(minY, w.bounds.min.y); maxY = Math.max(maxY, w.bounds.max.y); }
    if (gh.x + m.hw < minX || gh.x - m.hw > maxX || gh.y + m.hh < minY || gh.y - m.hh > maxY) return false;
    const V = window.Matter.Vertices, P = { x: 0, y: 0 };
    for (let i = 0; i < m.pts.length; i += 2) {
      P.x = gh.x + (gh.flip ? -m.pts[i] : m.pts[i]); P.y = gh.y + m.pts[i + 1];
      if (P.x < minX || P.x > maxX || P.y < minY || P.y > maxY) continue;
      for (const w of car.wheels) {
        const dx = P.x - w.position.x, dy = P.y - w.position.y;
        if (dx * dx + dy * dy < car.rWheel * car.rWheel) return true;
      }
      for (const part of parts) if (V.contains(part.vertices, P)) return true;
    }
    return false;
  }

  function caughtByGhost(b) {
    spooked(b);
    $('[data-fail-reason]', ui.modalFail).textContent = 'A ghost got you! Keep clear of the ghosts at the haunted houses: don\'t jump into the roof ghosts, and wait while a ghost stands at the door.';
  }

  function drawGhostSprite(g, x, y, alpha, flip) {
    if (!ready(g) || alpha <= 0.01) return;
    const w = g.naturalWidth, h = g.naturalHeight;
    ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1); ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(hq(g, w, h), -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Sign board with the game's own logo, ringed with chasing bulbs.
  function drawSignBoard(cx, sy, g) {
    addLight(cx, sy + 52, 200, '255,205,120', 0.32);
    // at night the sign's face is drawn again after the moonlight tint, so
    // it stays bright like a lit billboard
    if (state.night) lights.push({ sign: true, cx, sy, g });
    const sw = 270, sh = 104, sx = cx - sw / 2;
    outline(5);
    ctx.fillStyle = '#231c3d'; roundRect(sx, sy, sw, sh, 14); ctx.fill(); ctx.stroke();
    drawSignFace(cx, sy, g);
  }

  // The lit part of a sign: chasing bulbs and the game's logo.
  function drawSignFace(cx, sy, g) {
    const sw = 270, sh = 104, sx = cx - sw / 2;
    const bulbs = 18;
    for (let k = 0; k < bulbs; k++) {
      const t = k / bulbs, per = 2 * (sw + sh);
      let d = t * per, bx, by;
      if (d < sw) { bx = sx + d; by = sy; } else if ((d -= sw) < sh) { bx = sx + sw; by = sy + d; }
      else if ((d -= sh) < sw) { bx = sx + sw - d; by = sy + sh; } else { d -= sw; bx = sx; by = sy + sh - d; }
      const on = (k + Math.floor(state.t / 140)) % 3 === 0;
      ctx.fillStyle = on ? '#fff3a8' : '#a07a2a';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, TAU); ctx.fill();
    }
    const logo = g && logos[g.id];
    if (ready(logo)) {
      const pad = 12, bw2 = sw - pad * 2, bh2 = sh - pad * 2;
      const s = Math.min(bw2 / logo.naturalWidth, bh2 / logo.naturalHeight);
      const lw = logo.naturalWidth * s, lh = logo.naturalHeight * s;
      blit(logo, cx - lw / 2, sy + sh / 2 - lh / 2, lw, lh);
    } else {
      ctx.fillStyle = '#ffc83d'; ctx.font = '46px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g ? g.name.toUpperCase() : 'GARAGE', cx, sy + sh / 2 + 2);
    }
  }

  function drawDoorPlate(cx, cy, text) {
    ctx.fillStyle = '#ffc83d'; roundRect(cx - 62, cy - 17, 124, 34, 8); ctx.fill(); outline(3); ctx.stroke();
    ctx.fillStyle = '#1b2033'; ctx.font = '22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
  }

  /* Game buildings: each game has its own house (correct_house_1-4, by door
     number) and the Garage has correct_house_5. Houses are drawn at scale 1
     (never resized) and placed so the door in the picture sits on the door spot; the
     game's lit sign stands on a billboard above the roof. The fractions
     say where the door is in each image. */
  const GAME_K = 1;
  const GAME_DOOR = {
    1: { x: 0.546, top: 0.60, bottom: 0.955, w: 0.066 },
    2: { x: 0.444, top: 0.70, bottom: 0.96, w: 0.092 },
    3: { x: 0.504, top: 0.67, bottom: 0.965, w: 0.092 },
    4: { x: 0.30, top: 0.735, bottom: 0.96, w: 0.05 },
    5: { x: 0.384, top: 0.69, bottom: 0.927, w: 0.129 }
  };
  function houseFor(b) {
    const n = b.kind === 'garage' ? 5 : (gameById[b.id] ? gameById[b.id].door : 0);
    const house = img['correct_house_' + n];
    return n && ready(house) ? { n, house } : null;
  }
  function drawGameHouse(b, g, pick) {
    const { n, house } = pick;
    const d = GAME_DOOR[n];
    const gy = vergeAt(b.x) + 3;
    const hw = house.naturalWidth * GAME_K, hh = house.naturalHeight * GAME_K;
    const left = b.x - hw * d.x, top = gy - hh;
    const active = state.door === b;
    const doorTop = top + hh * d.top, doorBottom = top + hh * d.bottom, doorW = hw * d.w;
    if (active) {
      const pulse = 0.55 + 0.45 * Math.sin(state.t / 180);
      drawGlow(b.x, (doorTop + doorBottom) / 2, 200, '255,214,90', 0.6 * pulse, 0.05);
    }
    // billboard posts, drawn first so the house covers their feet
    const bbTop = top - 122;
    outline(4); ctx.fillStyle = '#3b3f58';
    for (const px of [b.x - 80, b.x + 70]) {
      ctx.fillRect(px - 6, bbTop + 90, 12, 130 + hh * 0.3); ctx.strokeRect(px - 6, bbTop + 90, 12, 130 + hh * 0.3);
    }
    blit(house, left, top, hw, hh);
    addLight(left + hw * 0.5, top + hh * 0.55, Math.max(hw, hh) * 0.45, '255,200,120', 0.2);   // lights on inside
    if (active) addLight(b.x, (doorTop + doorBottom) / 2, 160, '255,214,90', 0.55);
    if (active) {
      // the doorway lights up warm when you pull up
      const pulse = 0.5 + 0.5 * Math.sin(state.t / 160);
      ctx.fillStyle = `rgba(255,214,90,${0.45 + 0.3 * pulse})`;
      ctx.fillRect(b.x - doorW / 2, doorTop, doorW, doorBottom - doorTop);
    }
    drawSignBoard(b.x - 5, bbTop, g);
    drawDoorPlate(b.x, doorTop - 26, g ? 'DOOR ' + g.door : 'RIDES');
  }

  function drawBuildings(x0, x1) {
    for (const b of W.buildings) {
      if (b.x + 320 < x0 || b.x - 320 > x1) continue;
      if (b.kind === 'wrong') { drawHaunted(b); continue; }
      const pick = b.kind !== 'wrong' && houseFor(b);
      if (pick) { drawGameHouse(b, gameById[b.id], pick); continue; }
      const g = gameById[b.id];
      const gy = vergeAt(b.x) + 2;
      const w = 420, h = 300, left = b.x - w / 2, top = gy - h;
      const roof = g ? g.roof : '#7b3a8f';
      const active = state.door === b;
      outline(5);
      // wall
      ctx.fillStyle = '#f5e2bf'; ctx.fillRect(left, top, w, h); ctx.strokeRect(left, top, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(left, top, w, 26);
      // roof
      ctx.fillStyle = roof;
      ctx.beginPath(); ctx.moveTo(left - 36, top + 4); ctx.lineTo(b.x, top - 130); ctx.lineTo(left + w + 36, top + 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(left - 14, top - 6); ctx.lineTo(b.x, top - 112); ctx.lineTo(b.x, top - 90); ctx.lineTo(left + 20, top - 6); ctx.fill();
      // windows
      for (const wx of [left + 34, left + w - 34 - 78]) {
        ctx.fillStyle = '#9fd4f5'; ctx.fillRect(wx, top + 118, 78, 70); ctx.strokeRect(wx, top + 118, 78, 70);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(wx + 8, top + 126, 16, 54);
        ctx.strokeRect(wx, top + 150, 78, 0.1);
      }
      // door
      const dw = b.kind === 'garage' ? 150 : 96, dh = b.kind === 'garage' ? 150 : 156;
      if (active) {
        const pulse = 0.55 + 0.45 * Math.sin(state.t / 180);
        drawGlow(b.x, gy - dh / 2, 190, '255,214,90', 0.55 * pulse, 0.05);
      }
      ctx.fillStyle = active ? '#ffcf4d' : '#4c2c2c';
      ctx.fillRect(b.x - dw / 2, gy - dh, dw, dh); ctx.strokeRect(b.x - dw / 2, gy - dh, dw, dh);
      if (b.kind === 'garage') {
        ctx.strokeStyle = active ? '#8a5a00' : '#2a1818'; ctx.lineWidth = 3;
        for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(b.x - dw / 2, gy - dh + k * 21); ctx.lineTo(b.x + dw / 2, gy - dh + k * 21); ctx.stroke(); }
      } else {
        ctx.fillStyle = active ? '#fff3c4' : '#6d4141';
        ctx.fillRect(b.x - dw / 2 + 12, gy - dh + 14, dw - 24, 56);
        ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.arc(b.x + dw / 2 - 16, gy - dh / 2, 6, 0, TAU); ctx.fill();
      }
      drawSignBoard(b.x, top + 8, g);
      drawDoorPlate(b.x, gy - dh - 27, g ? 'DOOR ' + g.door : 'RIDES');
    }
  }

  /* Ground, top to bottom: a grass verge behind the road; the road itself
     (light kerb, white edge line, speckled asphalt, dashed centre line,
     gravel base); a sandy embankment with pebbles and strata that darkens
     with depth; and water at a fixed sea level with moving waves. The
     asphalt, sand and gravel textures are tiles rendered once and anchored
     to the world, so they scroll with the road instead of swimming. */
  // The truck's wheels roll on the physics ground line. The road is drawn
  // around that line like a side-view road seen slightly from above: its far
  // edge (kerb and grass verge) sits ROAD_FAR above the wheels and its near
  // edge ROAD_NEAR below, so the truck drives in the lane, with the centre
  // line behind its wheels. Houses, trees and signs stand on the far verge.
  const ROAD_FAR = -30, ROAD_NEAR = 18;
  const ROAD_D = ROAD_NEAR - ROAD_FAR, BASE_D = 12;
  const vergeAt = (x) => W.heightAt(x) + ROAD_FAR;
  const SEA = 175;                 // water surface: below the lowest road + its base (74 + 58)
  let arcLen = null;
  function roadArc() {
    if (arcLen) return arcLen;
    const p = W.points; arcLen = new Float64Array(p.length);
    for (let i = 1; i < p.length; i++) arcLen[i] = arcLen[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    return arcLen;
  }
  const textures = {};
  function texture(key, size, base, specks) {
    if (textures[key]) return textures[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    specks.forEach((d, j) => {
      g.fillStyle = d.c;
      for (let k = 0; k < d.n; k++) {
        const x = rnd(k * 3.1 + j * 17 + 1) * size, y = rnd(k * 7.7 + j * 29 + 2) * size;
        const r = d.r * (0.5 + rnd(k * 1.3 + j * 11 + 3));
        // draw wrapped copies so the tile repeats seamlessly
        for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
          if (x + ox < -r || x + ox > size + r || y + oy < -r || y + oy > size + r) continue;
          g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (d.flat || 1), 0, 0, TAU); g.fill();
        }
      }
    });
    return (textures[key] = ctx.createPattern(c, 'repeat'));
  }
  const asphaltTex = () => texture('asphalt', 160, '#3c3b46', [
    { c: 'rgba(0,0,0,0.22)', n: 170, r: 1.6 },
    { c: 'rgba(255,255,255,0.07)', n: 220, r: 1.1 },
    { c: 'rgba(255,255,255,0.04)', n: 25, r: 5, flat: 0.5 }
  ]);
  const sandTex = () => texture('sand', 200, '#dcb87e', [
    { c: 'rgba(168,126,72,0.35)', n: 90, r: 1.8 },
    { c: 'rgba(255,244,214,0.45)', n: 120, r: 1.2 },
    { c: 'rgba(139,99,58,0.45)', n: 16, r: 5, flat: 0.7 },
    { c: 'rgba(205,165,110,0.9)', n: 16, r: 4, flat: 0.7 }
  ]);
  const gravelTex = () => texture('gravel', 80, '#8b8175', [
    { c: 'rgba(60,52,44,0.55)', n: 70, r: 2.2 },
    { c: 'rgba(210,200,185,0.5)', n: 60, r: 1.8 }
  ]);

  function drawTerrain(x0, x1) {
    const pts = W.points, step = pts[1].x - pts[0].x;
    const i0 = clamp(Math.floor((x0 - pts[0].x) / step) - 1, 0, pts.length - 1);
    const i1 = clamp(Math.ceil((x1 - pts[0].x) / step) + 1, 0, pts.length - 1);
    const bottom = cam.y + (Ht * (1 - cam.fy)) / cam.z + 200;
    const t = state.t / 1000;
    const trace = (off) => { for (let i = i0; i <= i1; i++) ctx[i === i0 ? 'moveTo' : 'lineTo'](pts[i].x, pts[i].y + off); };
    const band = (top, depth) => {
      ctx.beginPath(); trace(top);
      for (let i = i1; i >= i0; i--) ctx.lineTo(pts[i].x, pts[i].y + top + depth);
      ctx.closePath();
    };
    const line = (off, color, width, dash, dashOff) => {
      ctx.beginPath(); trace(off);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOff || 0; }
      ctx.stroke();
      if (dash) ctx.setLineDash([]);
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // sandy embankment below the road, darker with depth, with strata
    const under = ROAD_NEAR + BASE_D;
    ctx.beginPath(); trace(under - 1);
    ctx.lineTo(pts[i1].x, bottom); ctx.lineTo(pts[i0].x, bottom); ctx.closePath();
    ctx.fillStyle = sandTex(); ctx.fill();
    const shade = ctx.createLinearGradient(0, cam.y - 150, 0, SEA + 60);
    shade.addColorStop(0, 'rgba(120,80,40,0)'); shade.addColorStop(1, 'rgba(120,80,40,0.38)');
    ctx.fillStyle = shade; ctx.fill();
    line(under + 70, 'rgba(160,112,62,0.35)', 12);
    line(under + 130, 'rgba(150,104,58,0.28)', 7);
    line(under + 190, 'rgba(140,96,54,0.24)', 14);

    // gravel base
    band(ROAD_NEAR - 1, BASE_D + 1);
    ctx.fillStyle = gravelTex(); ctx.fill();

    // asphalt, with its lower edge in shadow
    band(ROAD_FAR, ROAD_D);
    ctx.fillStyle = asphaltTex(); ctx.fill();
    line(ROAD_NEAR - 4, 'rgba(0,0,0,0.28)', 8);
    line(ROAD_NEAR - 0.5, 'rgba(0,0,0,0.35)', 1.5);

    // grass verge on the far side, kerb and white edge line along it
    line(ROAD_FAR - 3, '#5f9d45', 7);
    line(ROAD_FAR - 5.5, '#8bd064', 2.5);
    line(ROAD_FAR + 1.5, '#b9b7c3', 3.5);
    line(ROAD_FAR + 7, 'rgba(255,255,255,0.7)', 2.5);
    // near edge line, just in front of the wheels
    line(ROAD_NEAR - 8, 'rgba(255,255,255,0.45)', 2);

    // dashed centre line behind the wheels, anchored to the road by arc length
    ctx.lineCap = 'butt';
    line(ROAD_FAR + ROAD_D * 0.36, '#f2c230', 4, [46, 42], roadArc()[i0]);
    ctx.lineCap = 'round';
    // rain: a wet sheen along the asphalt
    if (state.theme === 'rain') {
      line(ROAD_FAR + ROAD_D * 0.62, 'rgba(190,210,240,0.16)', 12);
      line(ROAD_FAR + ROAD_D * 0.62, 'rgba(230,240,255,0.18)', 2.5);
    }

    // water at sea level: gentle waves, a foam line and drifting sparkles
    if (SEA < bottom) {
      const wave = (x) => SEA + Math.sin(x * 0.012 + t * 1.5) * 5 + Math.sin(x * 0.031 - t * 2.2) * 2.5;
      const wx0 = Math.floor(x0 / 24) * 24;
      ctx.beginPath(); ctx.moveTo(wx0, bottom);
      for (let x = wx0; x <= x1 + 24; x += 24) ctx.lineTo(x, wave(x));
      ctx.lineTo(x1 + 24, bottom); ctx.closePath();
      const wg = ctx.createLinearGradient(0, SEA - 10, 0, SEA + 420);
      wg.addColorStop(0, 'rgba(92,190,236,0.93)'); wg.addColorStop(0.35, 'rgba(44,140,205,0.96)'); wg.addColorStop(1, '#16508f');
      ctx.fillStyle = wg; ctx.fill();
      ctx.beginPath();
      for (let x = wx0; x <= x1 + 24; x += 24) ctx[x === wx0 ? 'moveTo' : 'lineTo'](x, wave(x) + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.lineCap = 'round';
      for (const [dy, speed, a, w] of [[26, 18, 0.28, 3], [60, -12, 0.2, 2.5], [105, 8, 0.14, 2]]) {
        ctx.beginPath(); ctx.moveTo(wx0, SEA + dy); ctx.lineTo(x1 + 24, SEA + dy);
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = w;
        ctx.setLineDash([26 + dy * 0.2, 120 + dy]); ctx.lineDashOffset = wx0 - t * speed - dy * 7;   // anchored to the world, then drifting
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  function drawRamps(x0, x1) {
    for (const r of W.ramps) {
      if (r.x + r.w < x0 || r.x > x1) continue;
      blit(img.rampleft, r.x, r.y - r.h, r.w, r.h + 4);
    }
  }

  function drawProps(x0, x1) {
    for (const p of W.props) {
      const b = p.body;
      if (b.position.x < x0 - 100 || b.position.x > x1 + 100) continue;
      const i = img[p.type];
      if (!ready(i)) continue;
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      ctx.drawImage(hq(i, p.w, p.h), -p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  function drawCoins(x0, x1) {
    for (const c of W.coins) {
      if (c.taken || c.x < x0 || c.x > x1) continue;
      const bob = Math.sin(state.t / 300 + c.x) * 6;
      const sx = Math.abs(Math.cos(state.t / 420 + c.x * 0.01));
      const y = c.y + bob, r = 24;
      drawGlow(c.x, y, 60, '255,220,80', 0.45, 0.07);
      addLight(c.x, y, 70, '255,220,80', 0.55);
      ctx.save(); ctx.translate(c.x, y); ctx.scale(Math.max(0.15, sx), 1);
      outline(4);
      ctx.fillStyle = '#f2a900'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2a900'; ctx.fillRect(-4, -r * 0.45, 8, r * 0.9);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-r * 0.5, -r * 0.35, 5, r * 0.5);
      ctx.restore();
    }
  }

  function drawParticles(layer) {
    for (const p of particles) {
      const front = p.kind === 'spark' || p.kind === 'confetti' || p.kind === 'flame' || p.kind === 'ring';
      if ((layer === 'front') !== front) continue;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore(); continue;
      }
      if (p.kind === 'ring') {
        ctx.globalAlpha = a * 0.7; ctx.strokeStyle = p.color; ctx.lineWidth = 4 * a + 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * 0.28, 0, 0, TAU); ctx.stroke();
        continue;
      }
      if (p.kind === 'flame') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.55 : p.kind === 'dust' ? a * 0.6 : a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCar() {
    const c = car.chassis, v = car.v, s = v.scale;
    if (!c) return;
    // struts, drawn from each spring mount to the hub so the travel is visible
    const strut = img.strut;
    car.mounts.forEach((m, i) => {
      const w = car.wheels[i];
      const a = { x: c.position.x + m.spring.pointA.x, y: c.position.y + m.spring.pointA.y };
      const dx = w.position.x - a.x, dy = w.position.y - a.y, len = Math.hypot(dx, dy);
      const thick = car.key === 'truck' ? 15 : 9;
      if (ready(strut)) {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(dy, dx));
        ctx.drawImage(strut, 0, -thick / 2, len, thick);
        ctx.restore();
      }
      // coil spring over the strut
      if (car.key === 'truck') {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(dy, dx));
        ctx.strokeStyle = '#ffb627'; ctx.lineWidth = 4; ctx.beginPath();
        const coils = 7, from = len * 0.12, to = len * 0.72;
        for (let k = 0; k <= coils * 2; k++) {
          const t = from + (to - from) * (k / (coils * 2));
          ctx.lineTo(t, k % 2 ? -11 : 11);
        }
        ctx.stroke(); ctx.restore();
      }
    });
    // body
    const body = img[v.body];
    ctx.save(); ctx.translate(c.position.x, c.position.y); ctx.rotate(c.angle);
    if (ready(body)) {
      const bw = v.bodySize[0] * s, bh = v.bodySize[1] * s;
      ctx.drawImage(hq(body, bw, bh), car.spriteOffset.x - bw / 2, car.spriteOffset.y - bh / 2, bw, bh);
    }
    ctx.restore();
    // wheels
    const wimg = img[v.wheel];
    for (const w of car.wheels) {
      ctx.save(); ctx.translate(w.position.x, w.position.y); ctx.rotate(w.angle);
      if (ready(wimg)) ctx.drawImage(hq(wimg, car.rWheel * 2, car.rWheel * 2), -car.rWheel, -car.rWheel, car.rWheel * 2, car.rWheel * 2);
      ctx.restore();
    }
  }

  function drawForeground() { /* reserved for weather/overlays */ }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ------------------------------------------------------------------ HUD */
  let toastTimer = 0;
  function toast(text) {
    if (!/^(\d|GO!)$/.test(text)) ui.toast.classList.remove('count');
    ui.toast.textContent = text;
    ui.toast.classList.remove('show'); void ui.toast.offsetWidth; ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
  }

  let hudCache = '';
  function updateHud() {
    const speed = Math.abs(W.forwardSpeed()) * 60 / 75 * 3.6;      // px/frame → km/h at 75px per metre
    const frac = clamp((car.chassis.position.x - W.SPAWN_X) / (W.FINISH_X - W.SPAWN_X), 0, 1);
    const key = state.coins + '|' + Math.floor(state.time / 100) + '|' + Math.round(speed) + '|' + Math.round(frac * 400);
    if (key === hudCache) return;
    hudCache = key;
    ui.coinsVal.textContent = state.coins + '/' + W.coins.length;
    ui.time.textContent = fmtTime(state.time);
    ui.speed.textContent = Math.round(speed);
    ui.speed.parentElement.classList.toggle('redline', W.forwardSpeed() > car.v.maxSpeed * 0.78);
    ui.progress.style.setProperty('--p', frac);
  }

  function showDoorPrompt(b) {
    if (!b) { ui.prompt.hidden = true; return; }
    const g = gameById[b.id];
    ui.promptName.textContent = g ? g.name : b.kind === 'wrong' ? '???' : 'Garage · change ride';
    ui.prompt.hidden = false;
    Sound.door();
  }

  /* ---------------------------------------------------------------- modals */
  function openModal(el) {
    state.paused = true;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('open'));
    const f = el.querySelector('[data-autofocus]') || el.querySelector('button, a');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
    keys.clear(); touch.gas = touch.brake = touch.jump = false;
  }
  function closeModal(el) {
    el.classList.remove('open');
    setTimeout(() => { el.hidden = true; }, 220);
    state.paused = false;
    if (state.mode === 'play') canvas.focus({ preventScroll: true });
  }
  function closeAllModals() { document.querySelectorAll('.modal.open').forEach(closeModal); }

  function enterDoor() {
    if (state.mode !== 'play' || !state.door || state.paused) return;
    const b = state.door;
    if (b.kind === 'garage') { openGarage(); return; }
    if (b.kind === 'wrong') { spooked(b); return; }
    const g = gameById[b.id];
    if (!g) return;
    const m = ui.modalDoor;
    $('[data-door-logo]', m).src = g.logo;
    $('[data-door-logo]', m).alt = g.name;
    $('[data-door-cover]', m).src = g.cover;
    $('[data-door-genre]', m).textContent = 'Door ' + g.door + ' · ' + g.genre;
    $('[data-door-blurb]', m).textContent = g.blurb;
    const play = $('[data-door-play]', m);
    play.href = g.url;
    play.setAttribute('aria-label', 'Play ' + g.name + ' (opens in a new tab)');
    m.style.setProperty('--accent', g.color);
    Sound.door();
    openModal(m);
  }

  function openGarage() {
    ui.modalGarage.querySelectorAll('[data-vehicle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.vehicle === state.vehicle));
    });
    openModal(ui.modalGarage);
  }

  // Morning, Night or Rain. Remembered between visits; the page mirrors it
  // with \`is-night\` / \`is-rain\` classes so the toggles and the featured
  // card can follow.
  const THEMES = ['morning', 'night', 'rain'];
  function setTime(mode) {
    state.theme = THEMES.includes(mode) ? mode : 'night';
    state.night = state.theme !== 'morning';          // lights on
    store.set('time', state.theme);
    const root = document.documentElement;
    root.classList.toggle('is-night', state.theme === 'night');
    root.classList.toggle('is-rain', state.theme === 'rain');
    document.querySelectorAll('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === state.theme)));
    const next = nextTheme();
    document.querySelectorAll('[data-action="toggle-time"]').forEach((b) => b.setAttribute('aria-label', 'Switch to ' + next));
    skyCache = null;
    Sound.rain(state.theme === 'rain' && !Sound.muted);
    emit('time', { mode: state.theme });
  }
  const nextTheme = () => THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];

  function setVehicle(key) {
    if (!VEHICLES[key]) return;
    state.vehicle = key; store.set('vehicle', key);
    const x = car.chassis ? car.chassis.position.x : W.SPAWN_X;
    spawnAt(clamp(x, W.SPAWN_X, W.FINISH_X - 100), true);
    document.querySelectorAll('[data-vehicle]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vehicle === key)));
    emit('vehicle', { key });
  }

  // Wrong house: the ghost bursts out at the screen and the run is over.
  function spooked(b) {
    $('[data-fail-reason]', ui.modalFail).textContent = 'That was a haunted house. Only doors with a game sign lead to a game. Watch for the bats!';
    state.finished = true; state.failed = true;
    state.door = null; ui.prompt.hidden = true;
    Sound.spooky();
    state.shake = 14;
    const ghost = img['ghost_' + (((b.variant - 1) % 4) + 1)];
    ui.spook.classList.remove('show'); void ui.spook.offsetWidth; ui.spook.classList.add('show');
    for (let i = 0; i < 40; i++) {
      puff(b.x + (Math.random() - 0.5) * 200, W.heightAt(b.x) - 80 - Math.random() * 120,
        (Math.random() - 0.5) * 5, -Math.random() * 3, 10 + Math.random() * 12, 1200 + Math.random() * 800,
        ['#6e4a9e', '#4b2d73', '#9b7fd1'][i % 3], 'smoke');
    }
    const m = ui.modalFail;
    $('[data-fail-ghost]', m).src = ghost ? ghost.src : '';
    $('[data-fail-time]', m).textContent = fmtTime(state.time);
    $('[data-fail-coins]', m).textContent = state.coins + '/' + W.coins.length;
    setTimeout(() => { if (state.mode === 'play' && state.failed) openModal(m); }, 1500);
  }

  function finish() {
    state.finished = true;
    Sound.finish();
    const fx = W.FINISH_X;
    for (let i = 0; i < 90; i++) {
      puff(fx + (Math.random() - 0.5) * 400, W.heightAt(fx) - 400 + Math.random() * 60,
        (Math.random() - 0.5) * 6, -Math.random() * 4, 9 + Math.random() * 7, 2200 + Math.random() * 1200,
        ['#ffc83d', '#ff4f8b', '#37e2a0', '#5b8cff', '#ffffff'][i % 5], 'confetti');
    }
    const bestKey = 'best:' + state.vehicle;
    const prev = store.get(bestKey, 0);
    const isBest = !prev || state.time < prev;
    if (isBest) store.set(bestKey, state.time);
    const m = ui.modalFinish;
    $('[data-finish-time]', m).textContent = fmtTime(state.time);
    $('[data-finish-coins]', m).textContent = state.coins + '/' + W.coins.length;
    $('[data-finish-best]', m).textContent = fmtTime(isBest ? state.time : prev);
    $('[data-finish-badge]', m).hidden = !isBest;
    $('[data-finish-ride]', m).textContent = VEHICLES[state.vehicle].name;
    emit('best', { vehicle: state.vehicle, time: isBest ? state.time : prev });
    setTimeout(() => { if (state.mode === 'play') openModal(m); }, 1400);
  }

  /* ----------------------------------------------------------- mode flow */
  function start(opts) {
    opts = opts || {};
    Sound.ensure();
    Sound.rain(state.theme === 'rain' && !Sound.muted);
    closeAllModals();
    state.mode = 'play';
    document.body.classList.add('is-playing');
    resetRun(opts.at);
    state.door = null; ui.prompt.hidden = true;
    hudCache = ''; updateHud();
    canvas.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    emit('mode', { mode: 'play' });
    state.countdown = 1800; state.wasGas = false;
    cam.punch = 0.12;                                  // camera punch with the warp burst
    countdownToast('3'); Sound.beep(false);
  }

  function exit() {
    closeAllModals();
    state.mode = 'attract';
    state.paused = false;
    state.countdown = 0;
    document.body.classList.remove('is-playing');
    ui.prompt.hidden = true; state.door = null;
    Sound.engine(0, 0, false);
    resetRun();
    emit('mode', { mode: 'attract' });
  }

  /* ------------------------------------------------------------- wiring */
  function bindInput() {
    const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (state.mode !== 'play') return;
      if (e.code === 'Escape') {
        if (document.querySelector('.modal.open')) closeAllModals(); else exit();
        return;
      }
      if (state.paused) return;
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); enterDoor(); }
      else if (e.code === 'KeyR') spawnAt(state.checkpoint, true);
      else if (e.code === 'KeyB' || e.code === 'KeyH') Sound.horn();
      else if (e.code === 'KeyM') setMuteUi(Sound.toggle());
      else if (e.code === 'KeyN') setTime(nextTheme());
      else if (e.code === 'Digit1') setVehicle('truck');
      else if (e.code === 'Digit2') setVehicle('beetle');
      else if (e.code === 'Digit3') setVehicle('sedan');
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); touch.gas = touch.brake = touch.jump = false; });

    // touch pedals: pointer capture keeps a held pedal pressed while the
    // thumb slides a little
    document.querySelectorAll('[data-pedal]').forEach((el) => {
      const which = el.dataset.pedal;
      const on = (e) => {
        e.preventDefault();
        if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
        touch[which] = true;
        el.classList.add('down');
        Sound.ensure();
        if (el.classList.contains('is-foot')) {
          Sound.pedal(true);
          if (navigator.vibrate) navigator.vibrate(12);
        }
      };
      const off = () => {
        if (!touch[which] && !el.classList.contains('down')) return;
        touch[which] = false;
        el.classList.remove('down');
        if (el.classList.contains('is-foot')) Sound.pedal(false);
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('lostpointercapture', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  function setMuteUi(muted) {
    document.querySelectorAll('[data-action="mute"]').forEach((b) => {
      b.setAttribute('aria-pressed', String(muted));
      b.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      b.classList.toggle('is-muted', muted);
    });
  }

  function bindActions() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (a === 'play') { e.preventDefault(); start({ at: el.dataset.at ? Number(el.dataset.at) : undefined }); }
      else if (a === 'drive-to') {
        e.preventDefault();
        const b = W.buildings.find((x) => x.id === el.dataset.game);
        start({ at: b ? b.x - 420 : undefined });
      }
      else if (a === 'exit') exit();
      else if (a === 'garage') openGarage();
      else if (a === 'enter-door') enterDoor();
      else if (a === 'mute') { Sound.ensure(); setMuteUi(Sound.toggle()); }
      else if (a === 'close-modal') closeModal(el.closest('.modal'));
      else if (a === 'restart') { closeAllModals(); start(); }
      else if (a === 'respawn') spawnAt(state.checkpoint, true);
      else if (a === 'toggle-time') setTime(nextTheme());
    });
    document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => setTime(b.dataset.time)));
    document.querySelectorAll('[data-vehicle]').forEach((b) => {
      b.addEventListener('click', () => {
        setVehicle(b.dataset.vehicle);
        const m = b.closest('.modal');
        if (m) closeModal(m);
      });
    });
    document.querySelectorAll('.modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
    });
    // opening a game from a door leaves the run paused behind the modal
    ui.modalDoor.querySelector('[data-door-play]').addEventListener('click', () => {
      setTimeout(() => closeModal(ui.modalDoor), 300);
    });
  }

  /* --------------------------------------------------------------- loop */
  let last = 0;
  let lastDraw = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    // the intro demo runs every frame while you're looking at it; only when
    // the browser window is in the background does it slow to ~10 fps
    if (state.mode !== 'play' && !document.hasFocus()) {
      if (now - lastDraw < 95) return;
      lastDraw = now;
    }
    const gap = last ? now - last : 16.67;
    const dt = Math.min(50, gap);
    last = now;
    if (state.active && !document.hidden && state.mode === 'play') watchFrameRate(gap, now); else settleUntil = now + 1500;
    if (!state.active || document.hidden) return;
    if (!state.paused) update(dt);
    else updateParticles(dt);
    render();
  }

  /* ------------------------------------------------ vehicle previews (DOM) */
  // A car assembled from its sprites for the menus: body plus two wheels at
  // their real hub positions, sized as percentages so it scales freely.
  function vehiclePreview(key) {
    const v = VEHICLES[key];
    const [iw, ih] = v.bodySize, R = v.wheelRadius;
    const H = Math.max(ih, v.wheels[0][1] + R);
    const el = document.createElement('div');
    el.className = 'ride';
    el.style.aspectRatio = iw + ' / ' + H;
    const body = new Image();
    body.src = ASSET + v.body + '.png'; body.alt = ''; body.className = 'ride-body';
    body.style.width = '100%'; body.style.top = '0';
    el.appendChild(body);
    v.wheels.forEach(([wx, wy]) => {
      const w = new Image();
      w.src = ASSET + v.wheel + '.png'; w.alt = ''; w.className = 'ride-wheel';
      w.style.left = ((wx - R) / iw) * 100 + '%';
      w.style.top = ((wy - R) / H) * 100 + '%';
      w.style.width = ((2 * R) / iw) * 100 + '%';
      el.appendChild(w);
    });
    return el;
  }

  /* --------------------------------------------------------------- init */
  function init() {
    canvas = $('#game-canvas');
    ctx = canvas.getContext('2d');
    Object.assign(ui, {
      coins: $('#hud-coins'), coinsVal: $('#hud-coins [data-val]'), time: $('#hud-time'),
      speed: $('#hud-speed'), progress: $('#hud-progress'), toast: $('#toast'),
      prompt: $('#door-prompt'), promptName: $('#door-prompt-name'),
      modalDoor: $('#modal-door'), modalGarage: $('#modal-garage'), modalFinish: $('#modal-finish'),
      modalFail: $('#modal-fail'), spook: $('#spook')
    });
    settleUntil = performance.now() + 2500;
    resize();
    new ResizeObserver(resize).observe(canvas);
    spawnAt(W.SPAWN_X);
    cam.z = baseZoom();
    bindInput();
    bindActions();
    setMuteUi(Sound.muted);
    setTime(state.theme);
    document.querySelectorAll('[data-vehicle]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vehicle === state.vehicle)));
    loadImages();
    requestAnimationFrame(frame);
  }

  window.GVGame = {
    init, start, exit, setVehicle, setTime, vehiclePreview,
    setActive(on) { state.active = on; if (!on) Sound.engine(0, 0, false); },
    // read-only: what a haunted house's ghost is doing ('in' | 'tell' | 'out')
    ghostPhase(id) { const b = W.buildings.find((x) => x.id === id); return b && b.gs ? b.gs.phase : 'in'; },
    ghostInfo(id) { const b = W.buildings.find((x) => x.id === id); return b ? { door: b.gs ? b.gs.phase : 'in', roof: (b.roof || []).map((r) => ({ x: Math.round(r.x), above: Math.round(W.heightAt(r.x) - r.y - r.gh / 2) })) } : null; },
    get mode() { return state.mode; },
    get vehicle() { return state.vehicle; },
    vehicles: VEHICLES, games: GAMES, coinsTotal: W.coins.length,
    best: (k) => store.get('best:' + k, 0), lifetimeCoins: () => store.get('coins', 0), fmtTime
  };
})();
