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
      density: 0.0022, wheelDensity: 0.0024, wheelie: 0.00035, airTorque: 0.0011, jump: 12
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
      density: 0.0016, wheelDensity: 0.0026, wheelie: 0.0003, airTorque: 0.0013, jump: 11
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
      density: 0.0017, wheelDensity: 0.0026, wheelie: 0.00025, airTorque: 0.0011, jump: 11
    },
    /* The newer car art (red, blue, grey, white) faces left, so it is drawn
       mirrored (flip) and wheel / hull / exhaust coordinates are in the
       mirrored image (x' = image width - x). These images also come with a
       soft ground shadow and opaque window glass, so `art` tells the game to
       trim the image at `crop` px (dropping the shadow) and to make the glass
       inside each `glass` outline see-through, so the driver shows. `glass`
       outlines are in the original, unmirrored image; `lum` is the brightness
       range of the glass pixels, `blue` also requires a blue tint, and `alpha`
       (default 0.42) is how much of the glass is kept. `wheels` (unmirrored)
       are wheels painted into the art: they are painted over with the wheel
       well colour above `below` and cleared under it, so only the real
       wheels show (painted wheels would not follow the suspension). */
    classic: {
      name: 'Red Hatch',
      tag: 'Zippy · Agile',
      body: 'red_car', bodySize: [570, 262], scale: 0.5, flip: true,
      wheel: 'red_car_tire', wheelRadius: 56,
      wheels: [[98, 229], [455, 229]],
      hull: [[8, 140, 562, 250], [60, 20, 420, 140], [420, 118, 540, 140]],
      exhaust: [10, 235],
      art: { crop: 262, wheels: { at: [[115, 229], [472, 229]], r: 57, below: 250, fill: '#333' }, glass: [
        { poly: [[148, 114], [235, 14], [495, 8], [548, 118], [515, 100], [360, 96], [200, 106]], lum: [150, 255], blue: true }
      ] },
      maxSpeed: 24, reverseSpeed: 8, accel: 0.08, brake: 0.84,
      spring: 0.011, springDamp: 0.06, travel: 16, arm: 0.9,
      density: 0.0017, wheelDensity: 0.0026, wheelie: 0.00028, airTorque: 0.0013, jump: 11
    },
    // black_car.png is a small image (192x119), scaled up to monster-truck size
    skull: {
      name: 'Skull Crusher',
      tag: 'Monster · Spooky',
      body: 'black_car', bodySize: [192, 119], scale: 1.55,
      wheel: 'black_tire', wheelRadius: 31,
      wheels: [[48, 66], [150, 66]],
      hull: [[3, 22, 189, 57], [42, 4, 132, 22]],
      exhaust: [4, 38],
      maxSpeed: 25, reverseSpeed: 9, accel: 0.075, brake: 0.86,
      spring: 0.009, springDamp: 0.05, travel: 22, arm: 0.9,
      density: 0.002, wheelDensity: 0.0024, wheelie: 0.0003, airTorque: 0.0011, jump: 12
    },
    // green_car.png faces left: drawn mirrored, coordinates in the mirrored image
    sport: {
      name: 'Green Sports',
      tag: 'Fast · Grippy',
      body: 'green_car', bodySize: [1000, 267], scale: 0.3, flip: true,
      wheel: 'green_tire.pnge', wheelRadius: 82,
      wheels: [[194, 210], [760, 210]],
      hull: [[120, 100, 880, 232], [880, 110, 995, 212], [5, 95, 120, 222], [140, 22, 640, 100]],
      exhaust: [10, 215],
      maxSpeed: 26, reverseSpeed: 9, accel: 0.08, brake: 0.84,
      spring: 0.011, springDamp: 0.06, travel: 18, arm: 0.9,
      density: 0.0017, wheelDensity: 0.0026, wheelie: 0.00025, airTorque: 0.0012, jump: 11
    },
    bluebug: {
      name: 'Sky Bug',
      tag: 'Retro · Bouncy',
      body: 'blue_car', bodySize: [536, 264], scale: 0.5, flip: true,
      wheel: 'blue_car_tire', wheelRadius: 63,
      wheels: [[110, 229], [426, 229]],
      hull: [[12, 150, 524, 250], [50, 95, 480, 150], [70, 15, 350, 95]],
      exhaust: [12, 235],
      art: { crop: 264, wheels: { at: [[110, 229], [426, 229]], r: 64, below: 250, fill: '#343434' }, glass: [
        { poly: [[203, 76], [214, 34], [236, 12], [330, 14], [334, 32], [314, 86]], lum: [200, 255], blue: true },
        { poly: [[336, 86], [340, 36], [358, 24], [392, 30], [420, 66], [420, 102]], lum: [200, 255], blue: true },
        { poly: [[414, 40], [474, 98], [452, 98], [430, 60]], lum: [200, 255], blue: true }
      ] },
      maxSpeed: 22, reverseSpeed: 8, accel: 0.085, brake: 0.84,
      spring: 0.012, springDamp: 0.06, travel: 18, arm: 0.9,
      density: 0.0016, wheelDensity: 0.0026, wheelie: 0.0003, airTorque: 0.0013, jump: 11
    },
    coupe: {
      name: 'Silver Coupe',
      tag: 'Sleek · Fast',
      body: 'grey_car', bodySize: [702, 238], scale: 0.43, flip: true,
      wheel: 'grey_car_tire', wheelRadius: 66,
      wheels: [[144, 203], [559, 203]],
      hull: [[6, 110, 696, 216], [40, 85, 560, 110], [150, 15, 430, 85]],
      exhaust: [8, 205],
      art: { crop: 238, glass: [
        { poly: [[262, 90], [300, 50], [362, 12], [420, 10], [500, 30], [556, 66], [440, 80], [330, 84]], lum: [0, 115] },
        { poly: [[262, 90], [300, 50], [362, 12], [420, 10], [500, 30], [556, 66], [440, 80], [330, 84]], lum: [222, 255] },
        // the round headrest sits where the driver goes: clear it completely
        { poly: [[300, 58], [315, 54], [330, 58], [335, 72], [330, 86], [315, 90], [300, 86], [296, 72]], lum: [150, 235], alpha: 0 }
      ] },
      maxSpeed: 26, reverseSpeed: 9, accel: 0.08, brake: 0.84,
      spring: 0.011, springDamp: 0.06, travel: 16, arm: 0.9,
      density: 0.0017, wheelDensity: 0.0026, wheelie: 0.00025, airTorque: 0.0012, jump: 11
    },
    rally: {
      name: 'White Rally',
      tag: 'Rugged · Grippy',
      body: 'white_car', bodySize: [553, 240], scale: 0.5, flip: true,
      wheel: 'white_car_tire', wheelRadius: 54,
      wheels: [[86, 218], [440, 218]],
      hull: [[6, 135, 546, 228], [30, 80, 480, 135], [70, 8, 350, 80]],
      exhaust: [14, 215],
      art: { crop: 240, glass: [
        { poly: [[243, 80], [252, 44], [280, 6], [362, 6], [352, 80]], lum: [0, 120] },
        { poly: [[364, 80], [376, 6], [452, 6], [492, 80]], lum: [0, 120] },
        { poly: [[198, 82], [262, 6], [272, 6], [214, 82]], lum: [0, 120] }
      ] },
      maxSpeed: 23, reverseSpeed: 8, accel: 0.08, brake: 0.86,
      spring: 0.011, springDamp: 0.06, travel: 20, arm: 0.9,
      density: 0.0018, wheelDensity: 0.0026, wheelie: 0.00028, airTorque: 0.0012, jump: 11
    }
  };

  /* ------------------------------------------------------------------ course */
  const STEP = 40;               // terrain sample spacing
  const START_X = -700;
  const SPAWN_X = 260;
  const LEVELS = 20;

  // Level 1 is Main Street: the town with the doors, DOOR_SPACING apart, then
  // the hills. It follows the website's world map: Start (the garage),
  // Services, the games, Clients, Demos, Contact. `kind: 'game'` doors open a
  // game, `garage` opens vehicle select, `stop` is one of the company stops
  // (site.js), `wrong` is a haunted house (entering fails the run).
  const FIRST_DOOR = 950;
  const DOOR_SPACING = 1250;
  const STOPS = ['services', 'clients', 'demos', 'contact'];
  // Levels 2-20 start in a smaller town: two game doors and two company stops,
  // a different pair of each from level to level, TOWN_SPACING apart.
  const GAME_IDS = ['animal-cafe', 'cinemoji', 'uno-clash', 'baggage-out'];
  const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const TOWN_SPACING = 1100;
  const STREET = ['garage', 'services', 'animal-cafe', 'wrong-1', 'wrong-2', 'cinemoji', 'wrong-3', 'uno-clash', 'wrong-4', 'wrong-5', 'baggage-out', 'wrong-6',
    'clients', 'demos', 'contact'];
  const DOOR_HALF = 150;

  // Collision categories. Props bounce off the wheels (which bat them away)
  // and each other, but pass the chassis: otherwise small cans slip under a
  // low car's belly, get carried along and lift its wheels off the road.
  const CAT = { ground: 0x1, chassis: 0x2, wheel: 0x4, prop: 0x8 };

  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function rand(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* A course for a level. Level 1 is the original hand-tuned layout. Levels
     2-20 are generated from the level number (always the same course for the
     same level): with `d` running 0 -> 1 from level 2 to 20, they get longer,
     hillier and bumpier, with more ramps, more props and more haunted houses.
     Everything is expressed as distance `hill(d)` past the start of the hills,
     and each feature gets a flat stretch cut into the hills. */
  function makeCourse(level) {
    level = Math.max(1, Math.min(LEVELS, level | 0));
    const C = { level, buildings: [], speedBumps: [], flats: [], ramps: [], props: [], coins: [], checkpoints: [SPAWN_X] };
    let hillLen, amp, f, ph, trendDepth, trendLen;
    if (level === 1) {
      C.buildings = STREET.map((id, i) => ({
        id, x: FIRST_DOOR + i * DOOR_SPACING,
        kind: id === 'garage' ? 'garage' : STOPS.includes(id) ? 'stop' : id.startsWith('wrong-') ? 'wrong' : 'game',
        variant: id.startsWith('wrong-') ? Number(id.slice(6)) : 0
      }));
      C.speedBumps = C.buildings.slice(1).map((b) => b.x - DOOR_SPACING / 2);
      C.townEnd = C.buildings[C.buildings.length - 1].x + 1000;
      hillLen = 10900; amp = 1; f = [0.0021, 0.0047, 0.0113]; ph = [0, 1.3, 2.1]; trendDepth = 250; trendLen = 7400;
    } else {
      const d = (level - 2) / (LEVELS - 2);
      // the town: stop, game, stop, game (in website-map order within each pair)
      const games = PAIRS[(level - 2) % 6].map((i) => GAME_IDS[i]);
      const stops = PAIRS[(level + 1) % 6].map((i) => STOPS[i]);
      [stops[0], games[0], stops[1], games[1]].forEach((id, i) => {
        C.buildings.push({ id, x: FIRST_DOOR + i * TOWN_SPACING, kind: STOPS.includes(id) ? 'stop' : 'game', variant: 0 });
      });
      C.speedBumps = C.buildings.slice(1).map((b) => b.x - TOWN_SPACING / 2);
      C.townEnd = C.buildings[C.buildings.length - 1].x + 900;
      hillLen = Math.round(7000 + 11000 * d);
      amp = 0.6 + 0.38 * d;
      const k = 1 + 0.15 * d;
      f = [0.0021 * k, 0.0047 * k, 0.0113 * k];
      ph = [rand(level) * 6.28, rand(level + 9) * 6.28, rand(level + 17) * 6.28];
      trendDepth = 150 + 140 * d; trendLen = 6000 + 3000 * d;
    }
    const TOWN_END = C.townEnd, hill = (x) => TOWN_END + x;
    C.finishX = hill(hillLen);
    C.endX = C.finishX + 1000;

    function hills(x) {
      const t = x - TOWN_END;
      const grow = smooth(t / 2200);
      const trend = -trendDepth * (1 - Math.cos((2 * Math.PI * t) / trendLen)) / 2;
      const wave = amp * (Math.sin(t * f[0] + ph[0]) * 88 + Math.sin(t * f[1] + ph[1]) * 34 + Math.sin(t * f[2] + ph[2]) * 11);
      return (trend - wave + 30 * amp * Math.sin(ph[1])) * grow;
    }
    function rawHeight(x) {
      let y;
      if (x < TOWN_END) {
        y = Math.sin(x * 0.013) * 1.5;
        for (const b of C.speedBumps) {
          const dd = (x - b) / 70;
          if (Math.abs(dd) < 1) y -= 13 * (0.5 + 0.5 * Math.cos(dd * Math.PI));
        }
      } else y = hills(x);
      // keep valleys above the water (sea level ~175, road base ~58 deep)
      return y > 90 ? 90 + (y - 90) * 0.3 : y;
    }
    function heightAt(x) {
      let y = rawHeight(x);
      for (const [a, b] of C.flats) {
        const edge = 260;
        if (x > a - edge && x < b + edge) {
          const lvl = rawHeight(a);
          const w = x < a ? smooth((x - (a - edge)) / edge)
                  : x > b ? 1 - smooth((x - b) / edge) : 1;
          y = y + (lvl - y) * w;
        }
      }
      return y;
    }
    C.heightAt = heightAt;

    const row = (cx, n, gap, air) => { for (let i = 0; i < n; i++) C.coins.push({ x: cx + (i - (n - 1) / 2) * gap, air }); };
    const arc = (cx, n, gap, top, drop) => {
      for (let i = 0; i < n; i++) { const u = i - (n - 1) / 2; C.coins.push({ x: cx + u * gap, air: top - drop * u * u }); }
    };
    const cans = (cx) => { for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) C.props.push(['sodacan beercan'.split(' ')[i % 2], cx + (i - (3 - r) / 2) * 19, r * 29.5]); };
    const crates = (cx) => {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 2 - r; i++) C.props.push(['crate', cx + i * 67 + r * 33, r * 66.5]);
      C.props.push(['box', cx + 140]); C.props.push(['suitcase', cx - 130]); C.props.push(['oilcan', cx + 220]);
    };
    const pile = (cx) => { C.props.push(['box', cx], ['box', cx + 85], ['box', cx + 40, 47], ['suitcase', cx + 140], ['oilcan', cx + 200]); };

    if (level === 1) {
      C.flats = [[hill(1050), hill(2050)], [hill(3000), hill(3600)], [hill(5300), hill(6400)], [hill(7850), hill(8350)], [hill(10500), C.endX + 400]];
      C.ramps = [[hill(1220), 0.62], [hill(5500), 0.78]];
      pile(TOWN_END - 540);
      cans(hill(3260));
      for (let r = 0; r < 2; r++) for (let i = 0; i < 2 - r; i++) C.props.push(['crate', hill(8080) + i * 67 + r * 33, r * 66.5]);
      C.props.push(['box', hill(8220)], ['suitcase', hill(7950)], ['oilcan', hill(8300)]);
      C.speedBumps.forEach((x) => row(x, 2, 80));
      [550, 2400, 4000, 4850, 7300, 9300].forEach((dd) => row(hill(dd), 3, 85));
      arc(hill(1680), 3, 80, 250, 25);
      arc(hill(5950), 3, 90, 330, 30);
      C.checkpoints.push(...C.buildings.slice(1).filter((b) => b.kind !== 'wrong').map((b) => b.x - 200),
        hill(300), hill(1000), hill(3000), hill(5300), hill(7800), hill(10500));
    } else {
      const d = (level - 2) / (LEVELS - 2);
      const nR = 1 + Math.floor(d * 4.99), nH = Math.min(6, Math.floor(level / 3)), nP = 1 + Math.floor(d * 3.99);
      C.speedBumps.forEach((x) => row(x, 2, 80));
      C.checkpoints.push(...C.buildings.slice(1).map((b) => b.x - 200));
      // interleave the features, then space them evenly along the hills
      const feats = [];
      for (let i = 0; i < Math.max(nR, nH, nP); i++) {
        if (i < nR) feats.push('ramp');
        if (i < nH) feats.push('house');
        if (i < nP) feats.push('props');
      }
      const span = hillLen - 2200, gap = span / feats.length;
      let houseNo = 0;
      const mids = [hill(450)];
      feats.forEach((kind, i) => {
        const x = hill(1100 + gap * (i + 0.5));
        if (kind === 'ramp') {
          const sc = 0.55 + 0.25 * d * rand(level * 3 + i) + 0.05;
          C.flats.push([x - 170, x + 720]);
          C.ramps.push([x, sc]);
          arc(x + 460, 3, 85, 250 + (sc - 0.62) * 500, 26);
          C.checkpoints.push(x - 300);
        } else if (kind === 'house') {
          C.flats.push([x - 330, x + 330]);
          C.buildings.push({ id: 'wrong-' + (houseNo + 1), x, kind: 'wrong', variant: (houseNo % 6) + 1 });
          houseNo++;
          C.checkpoints.push(x - 650);
        } else {
          C.flats.push([x - 260, x + 300]);
          [cans, crates][i % 2](x);
          C.checkpoints.push(x - 450);
        }
        mids.push(x + gap / 2);
      });
      // a row of coins between each pair of features
      mids.forEach((mx) => { if (mx < C.finishX - 500) row(mx, 3, 85); });
      C.flats.push([hill(hillLen - 400), C.endX + 400]);
      C.checkpoints.push(hill(hillLen - 450));
      C.checkpoints.sort((a, b) => a - b);

      // Maximum-slope filter: sample the course, then limit how much the road
      // may rise or fall between neighbouring samples (forward and backward
      // passes until nothing changes). Hills that happen to stack up, and the
      // edges where a flat stretch is cut into a hill, are eased to at most
      // 30 degrees on level 2 rising to 38 on level 20 (Level 1 peaks at 39).
      const dx = 20, x0 = START_X - 2500, n = Math.ceil((C.endX + 2600 - x0) / dx);
      const tab = new Float64Array(n + 1);
      for (let i = 0; i <= n; i++) tab[i] = heightAt(x0 + i * dx);
      const m = Math.tan((30 + 8 * d) * Math.PI / 180) * dx;
      for (let pass = 0, changed = true; changed && pass < 50; pass++) {
        changed = false;
        for (let i = 1; i <= n; i++) {
          if (tab[i] > tab[i - 1] + m) { tab[i] = tab[i - 1] + m; changed = true; }
          else if (tab[i] < tab[i - 1] - m) { tab[i] = tab[i - 1] - m; changed = true; }
        }
        for (let i = n - 1; i >= 0; i--) {
          if (tab[i] > tab[i + 1] + m) { tab[i] = tab[i + 1] + m; changed = true; }
          else if (tab[i] < tab[i + 1] - m) { tab[i] = tab[i + 1] - m; changed = true; }
        }
      }
      C.heightAt = (x) => {
        const u = Math.max(0, Math.min(n - 1e-6, (x - x0) / dx)), i = Math.floor(u), t = u - i;
        return tab[i] + (tab[i + 1] - tab[i]) * t;
      };
    }
    return C;
  }

  /* ------------------------------------------------------------------- world */
  function createWorld(opts) {
    opts = opts || {};
    const C = makeCourse(opts.level || 1);
    const heightAt = C.heightAt, TOWN_END = C.townEnd, FINISH_X = C.finishX, END_X = C.endX;
    const BUILDINGS = C.buildings;
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
    for (let x = END_X + STEP; x <= END_X + 2400; x += STEP) drawPoints.push({ x, y: heightAt(END_X) });

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
    C.ramps.forEach(([x, sc]) => addRamp(x, sc));

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
    C.props.forEach(([type, x, lift]) => addProp(type, x, lift));

    /* coins: plain data, collected by distance; `air` lifts a coin high
       enough that only a jump off the ramp before it reaches it */
    const coins = C.coins.map(({ x, air }) => ({ x, y: heightAt(x) - (air || 105), taken: false }));
    const checkpoints = C.checkpoints;

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
            if (!other.hitAt) other.hitAt = engine.timing.timestamp;
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
          // Brake only ever slows the wheels, whichever way they turn, then
          // holds them once the car is (nearly) still, so it also stops a
          // car rolling back down a hill. It never drives the car backwards.
          av *= Math.pow(v.brake, k);
          if (Math.abs(av * car.rWheel) < 0.5) av = 0;
        } else if (input.reverse) {
          // reverse gear: only the attract-mode autopilot uses this, to back
          // away from something it is stuck against
          av += (-v.reverseSpeed / car.rWheel - av) * v.accel * 0.6 * k;
        } else {
          av *= Math.pow(0.994, k);
        }
        Body.setAngularVelocity(w, av);
      }

      // Parking hold: stopped with the brake on and a wheel on the ground,
      // bleed off any slide so the car stays put even on the steepest hill.
      // Only motion along the chassis (the slide) is cancelled: the
      // suspension can still settle up and down, and a hit from above still
      // moves the car.
      if (input.brake && car.grounded && Math.abs(fwd) < 1.2) {
        const ax = Math.cos(c.angle), ay = Math.sin(c.angle);
        for (const b of car.parts) {
          const vb = Body.getVelocity(b);
          const along = vb.x * ax + vb.y * ay;
          Body.setVelocity(b, { x: vb.x - ax * along, y: vb.y - ay * along });
        }
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
    /* Jump: one hop per press, only with a wheel on the ground. The kick goes
       along the chassis' own "up", so on a slope the car hops off the hill
       rather than straight up, and every part gets the same push so the
       suspension stays settled mid-air. */
    const JUMP_COOLDOWN = 450;
    const JUMP_FORWARD = 2.4;                 // forward push on a hop (px/frame)
    function tryJump(input) {
      const held = !!input.jump;
      const pressed = held && !car.jumpHeld;
      car.jumpHeld = held;
      if (!pressed || !car.chassis) return;
      const now = engine.timing.timestamp;
      const grounded = car.wheels.some((w) => now - w.lastContact < 90);
      if (!grounded || now - (car.lastJump || -1e9) < JUMP_COOLDOWN) return;
      car.lastJump = now;
      const c = car.chassis, j = car.v.jump;
      const up = { x: Math.sin(c.angle) * 0.6, y: -Math.cos(c.angle) };
      // plus a small push forward (to the right), so the hop carries the car
      // a little way along the road instead of straight up
      const fwd = { x: Math.cos(c.angle), y: Math.sin(c.angle) }, push = JUMP_FORWARD;
      for (const b of car.parts) {
        const v = Body.getVelocity(b);
        Body.setVelocity(b, { x: v.x + up.x * j + fwd.x * push, y: Math.min(v.y, 0) + up.y * j + fwd.y * push });
      }
      car.wheels.forEach((w) => { w.lastContact = -1e9; });
      car.grounded = false;
      api.events.push({ type: 'jump', x: c.position.x, y: c.position.y });
    }

    function step(input, dtMs) {
      tryJump(input);
      acc += Math.min(dtMs, 50);
      // a prop the car has knocked over tumbles away and, after ~0.9s, stops
      // colliding with the car, so it can never end up wedged under a wheel
      const nowT = engine.timing.timestamp;
      for (const pr of props) {
        const b = pr.body;
        if (b.hitAt && !b.passed && nowT - b.hitAt > 900) {
          b.passed = true;
          b.collisionFilter.mask = CAT.ground | CAT.prop;
        }
      }
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
        p.body.hitAt = 0; p.body.passed = false;
        p.body.collisionFilter.mask = CAT.ground | CAT.wheel | CAT.prop;
        Body.setPosition(p.body, p.body.home);
        Body.setAngle(p.body, p.body.home.angle);
        Body.setVelocity(p.body, { x: 0, y: 0 });
        Body.setAngularVelocity(p.body, 0);
        Matter.Sleeping.set(p.body, false);
      }
    }

    const api = {
      engine, points: drawPoints, ground, ramps, props, coins, checkpoints, events: [],
      buildings: BUILDINGS, doorHalf: DOOR_HALF, level: C.level, levels: LEVELS,
      car, spawn, step, heightAt, forwardSpeed, resetProps,
      TOWN_END, FINISH_X, END_X, START_X, SPAWN_X
    };
    return api;
  }

  return { VEHICLES, createWorld, LEVELS, heightAt: makeCourse(1).heightAt };
});
