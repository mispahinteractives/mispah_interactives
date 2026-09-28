/* ==========================================================================
   MONSTER HILLS — physics core
   --------------------------------------------------------------------------
   Everything that moves lives here: the course, the props and the vehicles.
   No DOM, no canvas — the renderer in game.js only reads positions back out,
   which also lets this file run headless under Node for tuning.

   Vehicle model (same idea as the Matter.js truck demo it is based on):
     chassis  one compound body (body shell + a lower frame, so the centre
              of mass sits low and the frame can scrape over crests)
     wheels   circles driven by setting their angular velocity (a motor)
     struts   per wheel, a soft spring from a mount point above the wheel,
              plus a stiff trailing arm running toward the middle of the car.
              The arm stops the wheel wandering sideways while barely
              resisting vertical travel, so the wheel moves on a near-vertical
              line like a real suspension.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.GVPhysics = factory;
})(this, function (Matter) {
  'use strict';

  const { Engine, Bodies, Body, Composite, Constraint, Events, Vertices } = Matter;

  /* ---------------------------------------------------------------- vehicles
     Sprite coordinates are in the source PNG's pixels; `scale` maps them to
     world units. `wheels` are hub centres at rest, `hull` rectangles are the
     collision shape (x0, y0, x1, y1), `exhaust` is where smoke comes out.   */
  const VEHICLES = {
    truck: {
      name: 'Monster Truck',
      tag: '4x4 · Big air',
      body: 'truckbody', bodySize: [1142, 499], scale: 0.27,
      wheel: 'truckwheel', wheelRadius: 182,
      wheels: [[268, 452], [948, 452]],
      hull: [[30, 60, 1120, 335], [250, 335, 950, 425]],
      exhaust: [545, 8],
      maxSpeed: 25, reverseSpeed: 9, accel: 0.075, brake: 0.86,
      spring: 0.008, springDamp: 0.05, travel: 30, arm: 0.9,
      density: 0.0022, wheelDensity: 0.0024, wheelie: 0.00035, airTorque: 0.0011
    },
    beetle: {
      name: 'Blue Bubble',
      tag: 'Light · Nimble',
      body: 'carbody', bodySize: [640, 292], scale: 0.43,
      wheel: 'wheel', wheelRadius: 72,
      wheels: [[118, 258], [562, 258]],
      hull: [[10, 110, 630, 245], [140, 40, 470, 110]],
      exhaust: [20, 240],
      maxSpeed: 22, reverseSpeed: 8, accel: 0.085, brake: 0.84,
      spring: 0.012, springDamp: 0.06, travel: 16, arm: 0.9,
      density: 0.0016, wheelDensity: 0.0026, wheelie: 0.0003, airTorque: 0.0013
    },
    sedan: {
      name: 'Green Cruiser',
      tag: 'Long · Stable',
      body: 'carbody2', bodySize: [983, 289], scale: 0.31,
      wheel: 'wheel2', wheelRadius: 94,
      wheels: [[170, 262], [852, 262]],
      hull: [[10, 115, 975, 238], [190, 25, 720, 115]],
      exhaust: [18, 240],
      maxSpeed: 24, reverseSpeed: 8, accel: 0.07, brake: 0.84,
      spring: 0.011, springDamp: 0.06, travel: 18, arm: 0.9,
      density: 0.0017, wheelDensity: 0.0026, wheelie: 0.00025, airTorque: 0.0011
    }
  };

  /* ------------------------------------------------------------------ course */
  const STEP = 40;               // terrain sample spacing
  const START_X = -700;
  const TOWN_END = 4300;
  const FINISH_X = 15200;
  const END_X = 16200;
  const SPAWN_X = 260;

  // Stretches of level ground cut into the hills for ramps, props, finish.
  const FLATS = [
    [5350, 6350],   // first ramp + landing
    [7300, 7900],   // can pyramid
    [9600, 10700],  // second ramp
    [12150, 12650], // crate wall
    [14800, END_X + 400]
  ];

  // Buildings on the town street. `kind: 'game'` doors open a game,
  // `garage` opens vehicle select. `id` is looked up by game.js.
  const BUILDINGS = [
    { id: 'garage',      x: 950,  kind: 'garage' },
    { id: 'animal-cafe', x: 1750, kind: 'game' },
    { id: 'cinemoji',    x: 2550, kind: 'game' },
    { id: 'uno-clash',   x: 3350, kind: 'game' }
  ];
  const DOOR_HALF = 150;
  const SPEED_BUMPS = [1350, 2150, 2950];

  // Collision categories. Props bounce off the wheels (which bat them away)
  // and each other, but pass the chassis: otherwise small cans slip under a
  // low car's belly, get carried along and lift its wheels off the road.
  const CAT = { ground: 0x1, chassis: 0x2, wheel: 0x4, prop: 0x8 };

  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function hills(x) {
    const t = x - TOWN_END;
    const grow = smooth(t / 2200);
    const trend = -250 * (1 - Math.cos((2 * Math.PI * t) / 7400)) / 2;
    const wave = Math.sin(t * 0.0021) * 88 + Math.sin(t * 0.0047 + 1.3) * 34 +
                 Math.sin(t * 0.0113 + 2.1) * 11;
    return (trend - wave + 30 * Math.sin(1.3)) * grow;
  }

  function rawHeight(x) {
    if (x < TOWN_END) {
      let y = Math.sin(x * 0.013) * 1.5;
      for (const b of SPEED_BUMPS) {
        const d = (x - b) / 70;
        if (Math.abs(d) < 1) y -= 13 * (0.5 + 0.5 * Math.cos(d * Math.PI));
      }
      return y;
    }
    return hills(x);
  }

  function heightAt(x) {
    let y = rawHeight(x);
    for (const [a, b] of FLATS) {
      const edge = 260;
      if (x > a - edge && x < b + edge) {
        const level = rawHeight(a);
        const w = x < a ? smooth((x - (a - edge)) / edge)
                : x > b ? 1 - smooth((x - b) / edge) : 1;
        y = y + (level - y) * w;
      }
    }
    return y;
  }

  /* ------------------------------------------------------------------- world */
  function createWorld(opts) {
    opts = opts || {};
    const engine = Engine.create({
      positionIterations: 10, velocityIterations: 8, constraintIterations: 4,
      enableSleeping: true
    });
    engine.gravity.y = 1.05;
    const world = engine.world;

    const points = [];
    for (let x = START_X; x <= END_X; x += STEP) points.push({ x, y: heightAt(x) });
    // Scenery-only ground past the end wall, so the view never runs off the map.
    const drawPoints = [];
    for (let x = START_X - 2400; x < START_X; x += STEP) drawPoints.push({ x, y: heightAt(START_X) });
    drawPoints.push(...points);
    for (let x = END_X + STEP; x <= END_X + 2400; x += STEP) drawPoints.push({ x, y: heightAt(x) });

    // Ground: one convex quad per sample, reaching well below the lowest point.
    let lowest = -Infinity;
    for (const p of points) lowest = Math.max(lowest, p.y);
    const floor = lowest + 600;
    const ground = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const verts = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: floor }, { x: a.x, y: floor }];
      const c = Vertices.centre(verts);
      ground.push(Bodies.fromVertices(c.x, c.y, [verts], {
        isStatic: true, friction: 1, frictionStatic: 4, label: 'ground'
      }));
    }
    // Walls at both ends so nobody drives off the map.
    ground.push(Bodies.rectangle(START_X - 40, -600, 80, 3000, { isStatic: true, label: 'wall' }));
    ground.push(Bodies.rectangle(END_X + 40, -600, 80, 3000, { isStatic: true, label: 'wall' }));
    Composite.add(world, ground);

    /* ramps: static wedges drawn with rampleft.png */
    const ramps = [];
    function addRamp(x, s) {
      const w = 404 * s, h = 253 * s, gy = heightAt(x + w / 2);
      const verts = [{ x: x, y: gy + 4 }, { x: x + w, y: gy - h + 6 * s }, { x: x + w, y: gy + 4 }];
      const c = Vertices.centre(verts);
      const body = Bodies.fromVertices(c.x, c.y, [verts], {
        isStatic: true, friction: 1, frictionStatic: 4, label: 'ramp'
      });
      Composite.add(world, body);
      ramps.push({ x, y: gy, w, h, body });
    }
    addRamp(5520, 0.62);
    addRamp(9800, 0.78);

    /* props: knock-over clutter, drawn with the matching sprite */
    const PROP_TYPES = {
      crate:    { w: 66, h: 66, density: 0.0003 },
      box:      { w: 78, h: 47, density: 0.0006 },
      suitcase: { w: 72, h: 33, density: 0.0008 },
      oilcan:   { w: 44, h: 26, density: 0.0008 },
      beercan:  { w: 17, h: 29, density: 0.0005 },
      sodacan:  { w: 17, h: 29, density: 0.0005 }
    };
    const props = [];
    function addProp(type, x, lift, angle) {
      const t = PROP_TYPES[type];
      const gy = heightAt(x);
      const body = Bodies.rectangle(x, gy - t.h / 2 - (lift || 0) - 0.5, t.w, t.h, {
        density: t.density, friction: 0.5, frictionAir: 0.012, restitution: 0.2,
        collisionFilter: { category: CAT.prop, mask: CAT.ground | CAT.wheel | CAT.prop },
        angle: angle || 0, label: 'prop', sleepThreshold: 40
      });
      body.sprite = type;
      body.home = { x: body.position.x, y: body.position.y, angle: body.angle };
      Composite.add(world, body);
      props.push({ type, w: t.w, h: t.h, body });
    }
    // town: a delivery pile outside the last building
    addProp('box', 3760); addProp('box', 3845); addProp('box', 3800, 47);
    addProp('suitcase', 3900); addProp('oilcan', 3960);
    // hills: can pyramid on the flat
    const canX = 7560;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 4 - row; i++) {
        addProp(i % 2 ? 'sodacan' : 'beercan', canX + (i - (3 - row) / 2) * 19, row * 29.5);
      }
    }
    // crate pyramid
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 2 - row; i++) addProp('crate', 12380 + i * 67 + row * 33, row * 66.5);
    }
    addProp('box', 12520);
    addProp('suitcase', 12250); addProp('oilcan', 12600);

    /* coins: plain data, collected by distance */
    const COIN_X = [1350, 2150, 2950, 3620, 4850, 5980, 6700, 8300, 9150, 10250, 11600, 13600];
    const AIR = { 5980: 250, 10250: 330 };
    const coins = COIN_X.map((x) => ({
      x, y: heightAt(x) - (AIR[x] || 105), taken: false
    }));

    const checkpoints = [SPAWN_X, 1550, 2350, 3150, 4600, 5300, 7300, 9600, 12100, 14800];

    /* ---------------------------------------------------------------- the car */
    const car = { parts: [], constraints: [] };
    let carGroup = Body.nextGroup(true);

    function spawn(key, x) {
      removeCar();
      const v = VEHICLES[key];
      const s = v.scale;
      const [iw, ih] = v.bodySize;
      const rWheel = v.wheelRadius * s;
      // Sit the car so the wheels rest just above the ground at x.
      const wheelBottom = (v.wheels[0][1] - ih / 2) * s + rWheel;
      const gy = Math.min(heightAt(x - 120), heightAt(x), heightAt(x + 120));
      const x0 = x, y0 = gy - wheelBottom - 6;

      carGroup = Body.nextGroup(true);
      const filter = { group: carGroup, category: CAT.chassis, mask: CAT.ground };
      const wheelFilter = { group: carGroup, category: CAT.wheel, mask: CAT.ground | CAT.prop };
      const toWorld = (px, py) => ({ x: x0 + (px - iw / 2) * s, y: y0 + (py - ih / 2) * s });

      const hullParts = v.hull.map(([ax, ay, bx, by]) => {
        const a = toWorld(ax, ay), b = toWorld(bx, by);
        return Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, b.x - a.x, b.y - a.y, {
          density: v.density, friction: 0.5, collisionFilter: filter
        });
      });
      const chassis = Body.create({
        parts: hullParts, collisionFilter: filter, frictionAir: 0.004,
        restitution: 0, label: 'chassis'
      });
      chassis.sleepThreshold = Infinity;
      // Where the sprite centre sits relative to the centre of mass.
      const spriteOffset = { x: x0 - chassis.position.x, y: y0 - chassis.position.y };

      const wheels = v.wheels.map(([px, py], i) => {
        const p = toWorld(px, py);
        const w = Bodies.circle(p.x, p.y, rWheel, {
          density: v.wheelDensity, friction: 1, frictionStatic: 6, frictionAir: 0.004,
          restitution: 0.05, collisionFilter: wheelFilter, label: 'wheel'
        }, 32);
        w.sleepThreshold = Infinity;
        w.lastContact = -1e9;
        w.index = i;
        return w;
      });

      const cx = (wheels[0].position.x + wheels[1].position.x) / 2;
      const constraints = [];
      const mounts = [];
      wheels.forEach((w) => {
        const rel = { x: w.position.x - chassis.position.x, y: w.position.y - chassis.position.y };
        const L = v.travel * 2.2;
        const top = { x: rel.x, y: rel.y - L };
        const armLen = Math.abs(w.position.x - cx) * 0.8;
        const dir = w.position.x < cx ? 1 : -1;
        const pivot = { x: rel.x + dir * armLen, y: rel.y };
        const spring = Constraint.create({
          bodyA: chassis, pointA: top, bodyB: w, pointB: { x: 0, y: 0 },
          length: L, stiffness: v.spring, damping: v.springDamp, label: 'spring'
        });
        const arm = Constraint.create({
          bodyA: chassis, pointA: pivot, bodyB: w, pointB: { x: 0, y: 0 },
          length: armLen, stiffness: v.arm, damping: 0.1, label: 'arm'
        });
        constraints.push(spring, arm);
        mounts.push({ spring, arm, rest: rel, L });
      });

      Composite.add(world, [chassis, ...wheels, ...constraints]);
      Object.assign(car, {
        key, v, chassis, wheels, constraints, mounts, spriteOffset, rWheel,
        parts: [chassis, ...wheels], throttle: 0, flipTime: 0, grounded: false,
        airTime: 0, lastAir: 0
      });
      return car;
    }

    function removeCar() {
      if (car.chassis) {
        Composite.remove(world, [car.chassis, ...car.wheels, ...car.constraints]);
        car.chassis = null;
      }
    }

    /* contacts: remember when each wheel last touched something solid */
    function onContact(e) {
      const now = engine.timing.timestamp;
      for (const pair of e.pairs) {
        const a = pair.bodyA.parent, b = pair.bodyB.parent;
        if (a.label === 'wheel') { a.lastContact = now; a.lastImpact = pair.collision.depth; }
        if (b.label === 'wheel') { b.lastContact = now; b.lastImpact = pair.collision.depth; }
        if (e.name === 'collisionStart') {
          const other = a.label === 'prop' ? a : b.label === 'prop' ? b : null;
          if (other && (a.label === 'wheel' || a.label === 'chassis' || b.label === 'wheel' || b.label === 'chassis')) {
            api.events.push({ type: 'hit', x: other.position.x, y: other.position.y, sprite: other.sprite });
          }
        }
      }
    }
    Events.on(engine, 'collisionStart', onContact);
    Events.on(engine, 'collisionActive', onContact);

    /* ---------------------------------------------------------------- control */
    function forwardSpeed() {
      const c = car.chassis;
      const vel = Body.getVelocity(c);
      return vel.x * Math.cos(c.angle) + vel.y * Math.sin(c.angle);
    }

    // Wheel offset from its rest position along the chassis' own vertical
    // axis: negative = compressed (wheel pushed up into the arch).
    function compression(i) {
      const c = car.chassis, w = car.wheels[i], rest = car.mounts[i].rest;
      const dx = w.position.x - c.position.x, dy = w.position.y - c.position.y;
      const ly = -dx * Math.sin(c.angle) + dy * Math.cos(c.angle);
      return ly - rest.y;
    }

    function applyControls(input, dt) {
      const v = car.v, c = car.chassis;
      const k = dt / (1000 / 60);               // scale per-frame factors to substep
      const now = engine.timing.timestamp;
      const onGround = car.wheels.map((w) => now - w.lastContact < 60);
      car.grounded = onGround[0] || onGround[1];

      const gas = input.gas ? 1 : 0;
      car.throttle += (gas - car.throttle) * (gas ? 0.045 : 0.12) * k;
      const fwd = forwardSpeed();

      for (const w of car.wheels) {
        let av = Body.getAngularVelocity(w);
        if (input.gas) {
          const target = v.maxSpeed / car.rWheel;
          av += (target - av) * v.accel * car.throttle * k;
        } else if (input.brake) {
          if (fwd > 1.5) av *= Math.pow(v.brake, k);
          else av += (-v.reverseSpeed / car.rWheel - av) * v.accel * 0.6 * k;
        } else {
          av *= Math.pow(0.994, k);
        }
        Body.setAngularVelocity(w, av);
      }

      // Bump stop: past full travel the spring gets a stiff rubber block,
      // so hard landings compress and rebound instead of bottoming out.
      const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
      car.mounts.forEach((m, i) => {
        const w = car.wheels[i];
        const comp = compression(i);
        m.comp = comp;
        const over = -comp - v.travel;
        if (over > 0) {
          const f = over * 0.00011 * w.mass * k;
          const n = { x: -sin * f, y: cos * f };          // chassis "down"
          Body.applyForce(w, w.position, n);
          Body.applyForce(c, w.position, { x: -n.x * 0.8, y: -n.y * 0.8 });
        }
      });

      let av = Body.getAngularVelocity(c);
      if (!car.grounded) {
        // Lean in the air: gas pulls the nose up, brake pushes it down. The
        // pedal lean fades out past ~50 degrees so simply holding gas over a
        // jump never lands you on the tailgate; the lean keys have no limit.
        const pitch = Math.atan2(Math.sin(c.angle), Math.cos(c.angle));
        const fade = (dir) => 1 - smooth((dir * pitch - 0.5) / 0.4);
        const pedal = (input.brake ? fade(1) : 0) - (input.gas ? fade(-1) : 0);
        av += (pedal + (input.lean || 0)) * v.airTorque * k;
        av *= Math.pow(0.985, k);
      } else if (input.gas && fwd < v.maxSpeed * 0.7 && Math.sin(c.angle) > -0.5) {
        // Drive torque reacting on the body: squats the rear, lifts the nose.
        av -= v.wheelie * car.throttle * k;
      }
      av = Math.max(-0.14, Math.min(0.14, av));
      Body.setAngularVelocity(c, av);
    }

    /* Hard travel limits. The springs alone are soft enough that a big landing
       could shove a wheel past its mount and leave it jammed there, so each
       wheel is kept inside a small box in chassis space: `travel` up, a bit
       less down, and almost no sideways play. Hitting an edge exchanges
       momentum between wheel and chassis along that axis, like a real stop. */
    function limitSuspension() {
      const c = car.chassis;
      if (!c) return;
      const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
      const axes = [{ x: cos, y: sin }, { x: -sin, y: cos }];   // local x, local y
      const vc = Body.getVelocity(c), wc = Body.getAngularVelocity(c);
      car.wheels.forEach((w, i) => {
        const rest = car.mounts[i].rest;
        const rx = w.position.x - c.position.x, ry = w.position.y - c.position.y;
        const local = [rx * cos + ry * sin - rest.x, -rx * sin + ry * cos - rest.y];
        const limits = [[-3, 3], [-car.v.travel * 1.15, car.v.travel * 0.9]];
        for (let k = 0; k < 2; k++) {
          const [lo, hi] = limits[k];
          const d = local[k] < lo ? local[k] - lo : local[k] > hi ? local[k] - hi : 0;
          if (!d) continue;
          const ax = axes[k];
          const mw = w.mass, mc = c.mass, tot = mw + mc;
          // position: split the overshoot by mass
          Body.translate(w, { x: -ax.x * d * mc / tot, y: -ax.y * d * mc / tot });
          Body.translate(c, { x: ax.x * d * mw / tot, y: ax.y * d * mw / tot });
          // velocity: cancel relative motion that keeps pushing past the stop
          const vw = Body.getVelocity(w);
          const vp = { x: vc.x - wc * ry, y: vc.y + wc * rx };   // chassis at the hub
          const rel = (vw.x - vp.x) * ax.x + (vw.y - vp.y) * ax.y;
          if (rel * d > 0) {
            const j = rel * mw * mc / tot;
            Body.setVelocity(w, { x: vw.x - ax.x * j / mw, y: vw.y - ax.y * j / mw });
            const nv = Body.getVelocity(c);
            Body.setVelocity(c, { x: nv.x + ax.x * j / mc, y: nv.y + ax.y * j / mc });
          }
        }
      });
    }

    /* ------------------------------------------------------------------- step */
    const SUB = 1000 / 120;
    let acc = 0;
    function step(input, dtMs) {
      acc += Math.min(dtMs, 50);
      let n = 0;
      while (acc >= SUB && n < 8) {
        applyControls(input, SUB);
        Engine.update(engine, SUB);
        limitSuspension();
        acc -= SUB; n++;
      }
      if (!car.chassis) return;
      const c = car.chassis;
      const a = Math.atan2(Math.sin(c.angle), Math.cos(c.angle));
      // Upside down, or stood on its nose/tail and going nowhere: either
      // way the game puts the car back on its wheels after a moment.
      const stalled = Math.abs(a) > 1.15 && Math.hypot(c.velocity.x, c.velocity.y) < 1.2;
      if (Math.abs(a) > 1.85 || stalled) car.flipTime += dtMs; else car.flipTime = 0;
      if (car.grounded) {
        if (car.airTime > 450) api.events.push({ type: 'land', air: car.airTime, x: c.position.x, y: c.position.y });
        car.airTime = 0;
      } else car.airTime += dtMs;
    }

    function resetProps() {
      for (const p of props) {
        Body.setPosition(p.body, p.body.home);
        Body.setAngle(p.body, p.body.home.angle);
        Body.setVelocity(p.body, { x: 0, y: 0 });
        Body.setAngularVelocity(p.body, 0);
        Matter.Sleeping.set(p.body, false);
      }
    }

    const api = {
      engine, points: drawPoints, ground, ramps, props, coins, checkpoints, events: [],
      buildings: BUILDINGS, doorHalf: DOOR_HALF,
      car, spawn, step, heightAt, forwardSpeed, resetProps,
      TOWN_END, FINISH_X, END_X, START_X, SPAWN_X
    };
    return api;
  }

  return { VEHICLES, createWorld, heightAt };
});
