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
    'rampleft', 'crate', 'box', 'suitcase', 'oilcan', 'beercan', 'sodacan', 'cloud', 'tree'];
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
      ensure, engine,
      coin: () => tone([988, 1319], 0.07, 'square', 0.09),
      land: (s) => noise(0.3, 0.25 + 0.4 * s, 380),
      hit: () => noise(0.12, 0.18, 1200),
      door: () => tone([523, 659, 784, 1047], 0.07, 'triangle', 0.16),
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
    time: 0, started: false, finished: false,
    coins: 0, checkpoint: W.SPAWN_X,
    door: null, auto: { stall: 0, reverse: 0 },
    shake: 0, t: 0, lastToastCp: 0
  };
  const cam = { x: W.SPAWN_X, y: -120, z: 1, fx: 0.62, fy: 0.62, look: 0 };
  const input = { gas: false, brake: false, lean: 0, jump: false };
  const keys = new Set();
  const touch = { gas: false, brake: false, jump: false };
  let particles = [];
  let canvas, ctx, dpr = 1, Wd = 0, Ht = 0;
  const ui = {};

  /* --------------------------------------------------------------- canvas */
  function resize() {
    const r = canvas.getBoundingClientRect();
    Wd = Math.max(1, r.width); Ht = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, Wd < 700 ? 2 : 1.75);
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Ht * dpr);
  }

  function focusPoint() {
    const portrait = Ht > Wd;
    if (state.mode === 'attract') {
      if (portrait && Wd <= 1100) return { fx: 0.5, fy: 0.34 };
      return Wd < 760 ? { fx: 0.5, fy: 0.5 } : { fx: 0.68, fy: 0.64 };
    }
    return { fx: portrait ? 0.32 : 0.36, fy: portrait ? 0.56 : 0.6 };
  }

  function baseZoom() {
    const portrait = Ht > Wd;
    const wide = portrait ? (state.mode === 'play' ? 820 : 1000) : 1500;
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
    state.coins = 0; state.time = 0; state.started = false; state.finished = false;
    state.checkpoint = W.SPAWN_X;
    spawnAt(x || W.SPAWN_X);
    particles = [];
  }

  /* ---------------------------------------------------------------- input */
  function readInput() {
    if (state.mode === 'attract') return autopilot();
    if (state.finished) { input.gas = false; input.brake = true; input.lean = 0; input.jump = false; return input; }
    let gas = touch.gas || keys.has('ArrowRight') || keys.has('KeyD') || keys.has('KeyX');
    let brake = touch.brake || keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('KeyZ');
    let jump = touch.jump || keys.has('Space') || keys.has('KeyJ');
    let lean = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
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
    const cruise = x < W.TOWN_END ? 9 : 30;
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
    // dust off the tyres
    const now = W.engine.timing.timestamp;
    const speed = Math.hypot(vel.x, vel.y);
    car.wheels.forEach((w) => {
      if (now - w.lastContact > 60) return;
      const spin = Math.abs(w.angularVelocity * car.rWheel - W.forwardSpeed());
      const k = (speed > 7 ? 0.12 : 0) + (spin > 4 ? 0.5 : 0);
      if (Math.random() < k * dt / 16) {
        puff(w.position.x - Math.sign(vel.x || 1) * car.rWheel * 0.4, w.position.y + car.rWheel * 0.8,
          -vel.x * 0.15 + (Math.random() - 0.5) * 1.5, -1 - Math.random() * 1.5,
          6 + Math.random() * 7, 600 + Math.random() * 400, '#b89a74', 'dust');
      }
    });
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
      else { p.vx *= 0.95; p.vy += 0.06 * k; }
    }
    particles = particles.filter((p) => p.life > 0);
  }

  /* -------------------------------------------------------------- update */
  function update(dt) {
    state.t += dt;
    const inp = readInput();
    W.step(inp, dt);
    const c = car.chassis;
    const x = c.position.x;

    for (const e of W.events) {
      if (e.type === 'land') {
        const s = clamp((e.air - 400) / 900, 0, 1);
        state.shake = Math.max(state.shake, 4 + s * 10);
        car.wheels.forEach((w) => burst(w.position.x, w.position.y + car.rWheel * 0.8, 6 + s * 8, '#b89a74', 'dust', 2.5));
        if (state.mode === 'play') {
          Sound.land(s);
          if (e.air > 900) toast('BIG AIR ' + (e.air / 1000).toFixed(1) + 's');
        }
      } else if (e.type === 'jump') {
        car.wheels.forEach((w) => burst(w.position.x, w.position.y + car.rWheel * 0.8, 7, '#b89a74', 'dust', 2.2));
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
    updateParticles(dt);

    const rpm = clamp(Math.abs(car.wheels[1].angularVelocity * car.rWheel) / car.v.maxSpeed, 0, 1.2);
    Sound.engine(rpm, car.throttle, state.mode === 'play' && !state.paused);
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
  }

  /* -------------------------------------------------------------- render */
  function toScreen(x, y) {
    return { x: (x - cam.x) * cam.z + cam.fx * Wd, y: (y - cam.y) * cam.z + cam.fy * Ht };
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky();
    drawParallax();
    const sx = (Math.random() - 0.5) * state.shake, sy = (Math.random() - 0.5) * state.shake;
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, (cam.fx * Wd - cam.x * cam.z + sx) * dpr, (cam.fy * Ht - cam.y * cam.z + sy) * dpr);
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
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, Ht);
    g.addColorStop(0, '#5bb8f0'); g.addColorStop(0.55, '#a9ddf8'); g.addColorStop(1, '#e3f5ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Ht);
    // sun
    const sx = Wd * 0.84, sy = Ht * 0.16, r = Math.min(Wd, Ht) * 0.07;
    const sg = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 3.2);
    sg.addColorStop(0, 'rgba(255,248,200,0.9)'); sg.addColorStop(1, 'rgba(255,248,200,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
    ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
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
          ctx.drawImage(cloud, cx, cy, w, w * ratio);
        }
      });
      ctx.globalAlpha = 1;
    }
    // two mountain ranges
    drawRange(0.14, 560, 260, 520, '#b3c2d8', '#dde6f2', 180, 1);
    drawRange(0.3, 430, 170, 330, '#94a6c2', null, 120, 2);
    // distant rooftops over the town
    const tf = 0.55;
    if (cam.x < W.TOWN_END + 2500) {
      ctx.fillStyle = 'rgba(126,140,178,0.55)';
      for (let i = -2; i < 26; i++) {
        const bx = i * 260 + rnd(i + 40) * 80;
        const sx = layerX(bx, tf);
        if (sx < -300 || sx > Wd + 300) continue;
        const h = (90 + rnd(i + 50) * 120) * z, w = (140 + rnd(i + 60) * 80) * z;
        const base = layerY(20, tf);
        ctx.fillRect(sx, base - h, w, h + Ht);
        ctx.beginPath(); ctx.moveTo(sx - 10 * z, base - h); ctx.lineTo(sx + w / 2, base - h - 50 * z); ctx.lineTo(sx + w + 10 * z, base - h); ctx.fill();
      }
    }
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
      const i = Math.round(x / 170), gy = W.heightAt(x);
      const tx = x + rnd(i) * 80;
      if (x <= 0) {
        if (rnd(i + 11) > 0.25 && clearOf(tx, 0)) drawTree(tx, W.heightAt(tx), 0.85 + rnd(i + 4) * 0.5, rnd(i + 5) > 0.5);
      } else if (x < W.TOWN_END - 100) {
        if (i % 4 === 0 && clearOf(x, 260)) drawLamp(x, gy);
        else if (rnd(i + 21) > 0.45 && clearOf(tx, 330)) drawTree(tx, W.heightAt(tx), 0.75 + rnd(i + 4) * 0.35, rnd(i + 5) > 0.5);
        else if (rnd(i) > 0.45) drawBush(x + rnd(i + 1) * 60, gy, 0.8 + rnd(i + 2) * 0.6);
      } else if (x > W.TOWN_END + 200 && rnd(i + 11) > 0.35) {
        drawTree(tx, W.heightAt(tx), 0.8 + rnd(i + 4) * 0.6, rnd(i + 5) > 0.5);
      }
    }
    // "MOUNTAINS -->" sign, like the reference
    const mx = W.TOWN_END - 250;
    if (mx > x0 && mx < x1) drawSign(mx, W.heightAt(mx), 'MOUNTAINS  →');
    // start line
    if (W.SPAWN_X + 180 > x0 && W.SPAWN_X - 400 < x1) drawSign(W.SPAWN_X - 250, W.heightAt(W.SPAWN_X - 250), 'START ▶');
    // finish arch
    if (W.FINISH_X > x0 - 300 && W.FINISH_X < x1 + 300) drawFinish(W.FINISH_X);
    if (W.END_X > x0 - 100 && W.END_X < x1 + 100) drawBarrier(W.END_X);
  }

  function outline(w) { ctx.lineWidth = w || 4; ctx.strokeStyle = '#1b2033'; ctx.lineJoin = 'round'; }

  function drawLamp(x, gy) {
    outline(3);
    ctx.fillStyle = '#3b3f58';
    ctx.fillRect(x - 4, gy - 190, 8, 190); ctx.strokeRect(x - 4, gy - 190, 8, 190);
    ctx.beginPath(); ctx.moveTo(x, gy - 186); ctx.quadraticCurveTo(x + 4, gy - 214, x + 34, gy - 206); ctx.stroke();
    ctx.fillStyle = '#ffe79a';
    ctx.beginPath(); ctx.arc(x + 36, gy - 198, 10, 0, TAU); ctx.fill(); ctx.stroke();
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
  function drawTree(x, gy, s, flip) {
    const t = img.tree;
    if (!ready(t)) { drawPine(x, gy, s, flip); return; }
    const h = TREE_H * s, w = h * t.naturalWidth / t.naturalHeight;
    ctx.save();
    ctx.translate(x, gy + 6 * s);            // sink the trunk a touch so it never floats on a slope
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(t, -w * TREE_BASE_X, -h, w, h);
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
    const gy = W.heightAt(x), h = 380, half = 230;
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

  function drawBuildings(x0, x1) {
    for (const b of W.buildings) {
      if (b.x + 260 < x0 || b.x - 260 > x1) continue;
      const g = gameById[b.id];
      const gy = W.heightAt(b.x) + 2;
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
        const lg = ctx.createRadialGradient(b.x, gy - dh / 2, 10, b.x, gy - dh / 2, 190);
        lg.addColorStop(0, `rgba(255,214,90,${0.55 * pulse})`); lg.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.fillStyle = lg; ctx.fillRect(b.x - 200, gy - dh - 140, 400, dh + 150);
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
      // sign board with the game's own logo, ringed with chasing bulbs
      const sw = 270, sh = 104, sx = b.x - sw / 2, sy = top + 8;
      outline(5);
      ctx.fillStyle = '#231c3d'; roundRect(sx, sy, sw, sh, 14); ctx.fill(); ctx.stroke();
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
        ctx.drawImage(logo, b.x - lw / 2, sy + sh / 2 - lh / 2, lw, lh);
      } else {
        ctx.fillStyle = '#ffc83d'; ctx.font = '46px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(g ? g.name.toUpperCase() : 'GARAGE', b.x, sy + sh / 2 + 2);
      }
      // door plate
      ctx.fillStyle = '#ffc83d'; roundRect(b.x - 62, gy - dh - 44, 124, 34, 8); ctx.fill(); outline(3); ctx.stroke();
      ctx.fillStyle = '#1b2033'; ctx.font = '22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g ? 'DOOR ' + g.door : 'RIDES', b.x, gy - dh - 26);
    }
  }

  function drawTerrain(x0, x1) {
    const pts = W.points, step = pts[1].x - pts[0].x;
    const i0 = clamp(Math.floor((x0 - pts[0].x) / step) - 1, 0, pts.length - 1);
    const i1 = clamp(Math.ceil((x1 - pts[0].x) / step) + 1, 0, pts.length - 1);
    const bottom = cam.y + (Ht * (1 - cam.fy)) / cam.z + 200;
    ctx.beginPath();
    ctx.moveTo(pts[i0].x, bottom);
    for (let i = i0; i <= i1; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i1].x, bottom); ctx.closePath();
    const g = ctx.createLinearGradient(0, cam.y - 200, 0, bottom);
    g.addColorStop(0, '#3d3b52'); g.addColorStop(1, '#23212f');
    ctx.fillStyle = g; ctx.fill();
    // soil band and grass edge
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const edge = (off, color, width) => {
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) ctx[i === i0 ? 'moveTo' : 'lineTo'](pts[i].x, pts[i].y + off);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    };
    edge(26, 'rgba(0,0,0,0.18)', 22);
    edge(3, '#5e9440', 12);
    edge(-1, '#86c25a', 5);
    // lane dashes through town
    ctx.strokeStyle = 'rgba(255,214,90,0.8)'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    for (let x = Math.max(0, Math.floor(x0 / 90) * 90); x < Math.min(x1, W.TOWN_END - 200); x += 90) {
      const y = W.heightAt(x) + 34;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 44, W.heightAt(x + 44) + 34); ctx.stroke();
    }
  }

  function drawRamps(x0, x1) {
    for (const r of W.ramps) {
      if (r.x + r.w < x0 || r.x > x1) continue;
      if (ready(img.rampleft)) ctx.drawImage(img.rampleft, r.x, r.y - r.h, r.w, r.h + 4);
    }
  }

  function drawProps(x0, x1) {
    for (const p of W.props) {
      const b = p.body;
      if (b.position.x < x0 - 100 || b.position.x > x1 + 100) continue;
      const i = img[p.type];
      if (!ready(i)) continue;
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      ctx.drawImage(i, -p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  function drawCoins(x0, x1) {
    for (const c of W.coins) {
      if (c.taken || c.x < x0 || c.x > x1) continue;
      const bob = Math.sin(state.t / 300 + c.x) * 6;
      const sx = Math.abs(Math.cos(state.t / 420 + c.x * 0.01));
      const y = c.y + bob, r = 24;
      const gl = ctx.createRadialGradient(c.x, y, 4, c.x, y, 60);
      gl.addColorStop(0, 'rgba(255,220,80,0.45)'); gl.addColorStop(1, 'rgba(255,220,80,0)');
      ctx.fillStyle = gl; ctx.fillRect(c.x - 60, y - 60, 120, 120);
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
      const front = p.kind === 'spark' || p.kind === 'confetti';
      if ((layer === 'front') !== front) continue;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore(); continue;
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
      ctx.drawImage(body, car.spriteOffset.x - bw / 2, car.spriteOffset.y - bh / 2, bw, bh);
    }
    ctx.restore();
    // wheels
    const wimg = img[v.wheel];
    for (const w of car.wheels) {
      ctx.save(); ctx.translate(w.position.x, w.position.y); ctx.rotate(w.angle);
      if (ready(wimg)) ctx.drawImage(wimg, -car.rWheel, -car.rWheel, car.rWheel * 2, car.rWheel * 2);
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
    ui.progress.style.setProperty('--p', frac);
  }

  function showDoorPrompt(b) {
    if (!b) { ui.prompt.hidden = true; return; }
    const g = gameById[b.id];
    ui.promptName.textContent = g ? g.name : 'Garage · change ride';
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

  function setVehicle(key) {
    if (!VEHICLES[key]) return;
    state.vehicle = key; store.set('vehicle', key);
    const x = car.chassis ? car.chassis.position.x : W.SPAWN_X;
    spawnAt(clamp(x, W.SPAWN_X, W.FINISH_X - 100), true);
    document.querySelectorAll('[data-vehicle]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vehicle === key)));
    emit('vehicle', { key });
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
    closeAllModals();
    state.mode = 'play';
    document.body.classList.add('is-playing');
    resetRun(opts.at);
    state.door = null; ui.prompt.hidden = true;
    hudCache = ''; updateHud();
    canvas.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    emit('mode', { mode: 'play' });
    if (opts.at && opts.at > W.SPAWN_X) toast('GO!');
    else toast('READY? HOLD GAS!');
  }

  function exit() {
    closeAllModals();
    state.mode = 'attract';
    state.paused = false;
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
    });
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
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(50, now - last) : 16.67;
    last = now;
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
      modalDoor: $('#modal-door'), modalGarage: $('#modal-garage'), modalFinish: $('#modal-finish')
    });
    resize();
    new ResizeObserver(resize).observe(canvas);
    spawnAt(W.SPAWN_X);
    cam.z = baseZoom();
    bindInput();
    bindActions();
    setMuteUi(Sound.muted);
    document.querySelectorAll('[data-vehicle]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vehicle === state.vehicle)));
    loadImages();
    requestAnimationFrame(frame);
  }

  window.GVGame = {
    init, start, exit, setVehicle, vehiclePreview,
    setActive(on) { state.active = on; if (!on) Sound.engine(0, 0, false); },
    get mode() { return state.mode; },
    get vehicle() { return state.vehicle; },
    vehicles: VEHICLES, games: GAMES, coinsTotal: W.coins.length,
    best: (k) => store.get('best:' + k, 0), lifetimeCoins: () => store.get('coins', 0), fmtTime
  };
})();
