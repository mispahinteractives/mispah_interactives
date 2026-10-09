# Mizpah Interactives · Monster Hills

The Mizpah Interactives website: a game hub built around a playable physics truck game. It's static with no build step. Open `index.html` through any web server (XAMPP: `http://localhost/aim/mispah_interactives/`).

The contact email lives in two places: the Contact section of `index.html` and `email` in `assets/js/site.js`. The logo is `assets/img/logo.png` (the favicon is `assets/img/logo-icon.png`).

**Contact form:** messages are always sent in the background, so the visitor's email app never opens. The path is visitor → website → email API → the studio's inbox, and it works on static hosting such as GitHub Pages.

- **No setup (the default):** with `contactKey` empty in `assets/js/site.js`, the form sends through [FormSubmit](https://formsubmit.co) to `email` in `site.js`. **One-time step:** the very first message sent from the live site triggers an "Activate Form" email to `mispahinteractives@gmail.com`. Click that link once, and every message from then on arrives automatically. Until then, visitors see "The contact form is being switched on".
- **Optional, Web3Forms:** get a free access key at web3forms.com for the same address (250 messages a month) and paste it into `contactKey`. The form then sends through Web3Forms instead. The key is meant to be public in the page; it only lets people send to your inbox.

Each message arrives with the subject "New message from …", and you can reply straight to the visitor. The form checks the name, email and message (at least 10 characters) before sending, shows a "Sending…" spinner, then a "Message sent!" card. A hidden trap field quietly drops spam bots. If sending fails (offline, timeout, server error), the visitor sees a message with a one-click "email us directly" link. The code is in the contact part of `assets/js/hub.js`.

```
./
├── index.html            page: the six stops of the world (see "The world")
├── assets/css/hub.css    all styling
├── assets/css/fonts.css  @font-face rules for the local fonts
├── assets/fonts/         Russo One + Exo 2 (woff2, Latin subsets)
└── assets/js/
    ├── vendor/matter.min.js   Matter.js 0.20 (physics engine, vendored)
    ├── physics.js        course, props, vehicles, suspension (no DOM; runs in Node)
    ├── games.js          ← EDIT THIS: the external games (cards + arcade doors)
    ├── site.js           ← EDIT THIS: stop names, services, process, clients, demos
    ├── game.js           renderer, input, camera, sound, doors, coins, finish
    ├── hub.js            cards, ride previews, stats, reveals, contact form
    └── world.js          world map, travel transition, workshop bays, billboards, demo pits
```

The art lives in `assets/`: the truck and car sprites in `assets/img/assets/`, plus the game logos and cover images in `assets/img/games/`.

## The world

The whole site is a road trip through six stops. Each stop is a `<section>` with its own environment (`.stop-env`), and the stops are listed in driving order in `assets/js/site.js`:

| Stop | Section | Place | What's there |
|---|---|---|---|
| 01 Start | `#stage` | Main Street | the live physics game, ride picker, arcade doors |
| 02 Services | `#services` | The Workshop | six garage bays (click a door to roll it up) and the build pipeline road |
| 03 Games | `#games` | Arcade Boulevard | Monster Hills plus the four linked games |
| 04 Clients | `#clients` | Billboard Highway | one billboard per client |
| 05 Demos | `#demos` | The Test Track | demo pits that launch the real game in a set-up, plus the driver's manual |
| 06 Contact | `#contact` | Finish Line HQ | contact form and email |

- **World map:** the road in the top bar. Your chosen ride drives along it as you scroll, and clicking a stop "travels" there: a road scene with a green "Next stop" sign covers the page while it moves. On phones the map is the map button in the top bar. With reduced motion turned on, travel jumps straight to the stop.
- **Stops in the game:** Main Street follows the same map. After the garage (Start) comes the **Services** workshop, then the four game doors and the haunted houses, then the **Clients** billboard, the **Demos** pit garage and **Contact** HQ, then the hills. The stop buildings are drawn in code (`STOP_BUILD` in `game.js`) with a lit stop sign in the stop's colour. Pull up and press E (or tap the prompt) to open the stop's panel: what's at the stop, an "Open …" button that ends the run and travels to that stop on the site, and, at the Test Track, a button for each demo. Each website stop has a "Drive here in the game" button that starts the game parked outside its building.
- **Next stop signs:** each stop ends with a sign to the next one.
- **Always the intro first:** every load or refresh opens on the intro screen at the top of the page. Travelling doesn't put the stop in the address bar, a `#stop` in the address is ignored, and the browser's saved scroll position isn't restored.
- **Clients:** `clients` in `site.js` is empty on purpose, so the highway shows "reserved" billboards rather than invented names. Add real clients as `{ name, logo, project, url }` and each becomes a billboard.
- **Demos:** each demo's `run` is either `{ level: n }`, `{ at: 'ramp' | 'ghosts' | <door or stop id> }` (start at that spot on Main Street), `theme: 'night' | 'rain' | 'morning'`, or `{ levels: true }` to open the level map.

## How the car works

- **Chassis:** one compound body (the shell plus a lower frame), so the centre of mass sits low.
- **Wheels:** motor-driven circles.
- **Suspension:** each wheel hangs from a soft spring and a stiff trailing arm. A hard travel limit keeps landings from jamming a wheel into the body. Tune per vehicle in `VEHICLES` in `physics.js`: `spring`, `springDamp`, `travel`.
- **Air control:** gas lifts the nose and brake drops it, fading out past about 50° so holding gas never lands you on the tailgate. ↑/↓ lean with no limit.
- **Auto-respawn:** a car that's upside down, or stuck standing on its nose or tail, returns to the last checkpoint.

## Adding or changing a game

Edit `assets/js/games.js`. Each entry becomes a card in "Select your game" and a building with a door on Main Street. To give a game a door, add its `id` to the `BUILDINGS` list in `physics.js`. The doors are placed `DOOR_SPACING` (1250px) apart, and the town, speed bumps, coins and checkpoints move to fit. The hills are placed relative to the end of the town, so they're never affected.

## Controls

The car is driven with the on-screen buttons on every device: **Brake** and **Reverse** (bottom-left), **Gas** and **Jump** (bottom-right). Brake and Gas are foot pedals; Reverse and Jump are matching glossy round push-buttons (blue with a left arrow, orange with an up arrow), each with its label below. Tap them on a phone or tablet, or click them with the mouse on a PC. On a PC the keyboard works too: → / D drives right (gas), ← / A drives left (a car rolling forward is braked to a stop first, then it reverses), ↑ / W / Space jump, ↓ / S brake (in the air it leans the nose forward), E enter a door. A gamepad uses RT gas, LT or B brake, X reverse, A jump and Y for doors. At a door, press the gold **Enter** button.

A hop carries the car a little way forward (`JUMP_FORWARD` in `physics.js`). Brake slows the car and then holds it still (on slopes too); it never reverses. **Reverse** is its own control: it slows a car rolling forward, then backs it up at the ride's `reverseSpeed` (about a third of top speed), with white reversing lights at night. Gas and Brake take priority over it. The top bar has reset, ride, theme, sound and exit buttons.

## Tuning headless

`physics.js` exports a factory under Node, so a course run can be simulated without a browser:

```js
const Matter = require('./assets/js/vendor/matter.min.js');
const P = require('./assets/js/physics.js')(Matter);
const W = P.createWorld(); W.spawn('truck', W.SPAWN_X);
for (let i = 0; i < 60 * 30; i++) W.step({ gas: true }, 1000 / 60);
console.log(W.car.chassis.position.x > W.FINISH_X ? 'finished' : 'stuck');
```

## Publishing an update

`index.html` loads the stylesheet and scripts with a version tag (`hub.css?v=20260929`). After changing any CSS or JS, bump that number in `index.html` so browsers and GitHub Pages fetch the new files instead of a cached copy.

## Houses, haunted houses and ghosts

Main Street alternates game houses and haunted houses (the `STREET` list in `assets/js/physics.js`):

- **Game houses:** `correct_house_1`–`4.png`, one per game by door number. `correct_house_5.png` is the Garage. Each has the game's lit sign on a rooftop billboard.
- **Haunted houses:** `wrong_house_1`–`6.png`. Bats (`bat.png`) loop round the roof, and ghosts (`ghost_1`–`5.png`) float in the doorway and an upper window. The door prompt only says "Enter ???". Entering one fails the run: the ghosts burst out at the screen, then the "Spooked!" panel offers Try again or Back to hub.
- **House ghosts:** every haunted house has one or two ghosts hovering over its roof (`ROOF_GHOST_BOTTOM` 212 above the road, above any car driving past but within reach of a jump). Every 6–10 seconds another ghost stands at the door for about 2.5 seconds. **Any ghost that touches the car fails the run.** Collision is pixel-accurate: each ghost image is turned into a mask of its solid pixels (`ghostMask`), which is tested against the car's physics hull polygons and wheel circles (`ghostTouchesCar`). The door ghost counts once it's more than half faded in.
- **Scale 1:** houses are always drawn at scale 1: one image pixel is one unit of the game world, and they're never enlarged or shrunk. To make a house bigger or smaller, change the image itself. `GAME_DOOR` / `HAUNT_DOOR` in `game.js` record where the door is in each picture, so the door lines up with the door spot. If you replace a house image, update its door position there.
- **Ghosts:** also always at scale 1, in the game, the jump scare and the fail card. They only move and fade; they're never resized or tilted.

## Image quality

Every sprite is resized once, with high quality, to the size it covers on screen, and that copy is drawn 1:1 (`hq()` in `game.js`). Bigger source images simply come out sharper; there's nothing else to change.

## Morning, Night and Rain

The game starts in Night by default. Players pick a theme on the title card (Morning | Night | Rain), with the sun/moon button in the in-game top bar, or with `N`. The choice is remembered. At night the sky turns navy with stars and a moon (reflected on the water), and the world is tinted to moonlight in one pass (`drawNight()` in `game.js`). Light sources are then added on top: street lamps, headlights, game signs, coins, house windows, and the haunted houses and ghosts. Anything that should glow at night registers itself with `addLight()`.

Rain uses the same lights-on pipeline as Night, with an overcast sky, slanted rain in two depths, splashes and tyre spray, a wet sheen on the road, and lightning every 2–6.5 seconds (`drawRain()`, `strike()` and `rainTick()` in `game.js`). Most strikes are small: a short fork in the clouds, a soft flicker and quiet distant thunder, sometimes two in quick succession. About one in three is big: a bright double flash, a long bolt with branches, and close, loud thunder. Bolts are drawn jagged using midpoint displacement (`jag()`).

## Crows

In Morning only, three crows fly far off in the sky, between the clouds and the mountains, crossing in both directions. They use only the in-flight pose `crow_1.png` (mirrored for right-flying crows), animated smoothly with a soft wing-beat squash, long glides, a gentle rise and fall, and a tilt that follows the path (`CROWS` / `drawCrows()` in `game.js`). A second crow pose was tried and dropped, because it was too different to animate between. Night and Rain have no crows.

## Performance

- **Background windows:** the intro demo and races run at full speed whenever the page can be seen, even when another app or window is in front. A partly covered site is still visible, and slowing it down there looked like lag. When the page can't be seen at all (minimised, another tab, fully covered), the browser pauses drawing by itself and the game skips its work (`document.hidden`). Coming back, the game clock restarts, so there's no jump. Held keys are released when the window loses focus. Nothing is drawn while the game is scrolled off screen.
- **Adaptive quality:** if frames run slow (under about 48 fps for 1.5 s), the canvas drops to a lower render resolution. This works on the intro as well as in a race, so a slower phone gets a smooth demo instead of stutter. On desktop it only judges speed while the window is in front, so a moment of system slowdown behind another app doesn't lower the resolution for good. On the intro a slow frame still advances the demo in real time (up to 66 ms per frame; races cap it at 50 ms), and the autopilot's stall and back-up timers run on real time too.
- **Endless CSS animations:** paused for sections that are off screen (`anim-paused`), and pulses animate transform/opacity rather than box-shadow.
- **Image cache:** pre-sized sprite copies are kept in a least-recently-used cache of 120 entries.
- **Gamepad:** only polled after a gamepad connects, because polling it every frame keeps macOS's game-controller service busy.

## Coins

There are 44 coins: a pair over every speed bump on Main Street, rows of three along the hills, and an arc of three over each jump (`coinSpots` in `physics.js`). Every vehicle can collect all of them. The coin total shown on the page updates itself from the course.

Picking one up is a little show (`coinPop()` and `coinLanded()` in `game.js`, styles under "Coin pickup" in `hub.css`). The coin bursts into gold sparks with a ring and a four-point flash where it was, then a coin flies on a curve up to the coin counter, popping bigger, flipping as it goes and shrinking to fit. When it lands, a soft *ting* plays, the counter pops and glows, a gold ring spreads off it, its coin spins, the number ticks up, and a "+1" floats away. The counter counts the coins as they land, so a quick row of three ticks up one, two, three. With reduced motion turned on, the coin skips the flight.

## Fonts

The site uses **Russo One** (headings, buttons and in-game text) and **Exo 2** (body text), both under the SIL Open Font License 1.1. They're served locally from `assets/fonts/` (Latin and Latin Extended subsets in woff2, about 83 KB in total) via `assets/css/fonts.css`, so nothing is loaded from Google Fonts. Exo 2 is a variable font, so one file covers weights 400–800.

## Rides

Four rides, shown as two rows of two in the intro picker and in the garage, and picked with keys 1–4:

| Key | Ride | Art |
|---|---|---|
| 1 | Monster Truck | `truckbody.png`, `truckwheel.png` |
| 2 | Blue Bubble | `carbody.png`, `wheel.png` |
| 3 | Green Cruiser | `carbody2.png`, `wheel2.png` |
| 4 | Skull Crusher | `black_car.png`, `black_car_tire.png` |

- **Skull Crusher:** its art (399×245) is drawn at 0.746× to come out at monster-truck size. Its headlight beam starts at the lamp (`light` in `VEHICLES`). The art is low-resolution and its edges are already stepped in the file, so the game enlarges, smooths and sharpens it once at load (`enhanceLowRes()` in `game.js`). A fresh export about 1200 px wide would look best. Its collision hull covers only the body, not the X-frame underneath.
- **Saved rides:** a player whose saved ride is no longer offered starts in the Monster Truck.
- **Adding a ride:** add it to `VEHICLES` in `physics.js`, a seat in `CHAR_SEAT` (`game.js`), a tile in the picker and a card in the garage (`index.html`), and a number key. Art that faces left can use `flip: true`. Art with a baked shadow, solid window glass or painted-in wheels can use the `art` field (`crop`, `glass`, `wheels`), which cleans the image up when it loads.
- **Tested:** every ride finishes all 20 levels in the simulator.

## Levels

There are 20 levels (`makeCourse(level)` in `physics.js`):

- **Level 1** is Main Street: the town with all four game doors, all four company stops and the haunted houses, then the hills. It's hand-tuned.
- **Every other level starts in a small town** with two game doors and two company stops (Services, Clients, Demos or Contact), alternating stop, game, stop, game, with speed bumps and coins between them. The pair of games and the pair of stops change from level to level (`GAME_IDS`, `PAIRS` and `TOWN_SPACING` in `physics.js`), and every game and every stop turns up across the levels.
- **Levels 2–20** are generated from the level number, so each level is always the same course. After the town, the hills get longer (7,000 → 18,000), hillier and bumpier. Ramps grow from 1 to 5, haunted houses (with roof and door ghosts) from 0 to 6, and knock-over props from 1 to 4 stacks, with coin rows and jump arcs placed to match.
- **River crossings:** every level has a river with a broken wooden bridge (two from level 12 on).
  - **The scene:** earth banks slope down into a bowl-shaped riverbed, and the water is one body that flows downstream. Waves, highlights and ripples drift the same way, the bridge is reflected faintly, the current curls round the wooden piers, and under the bridge you see the far bank: the same earth as the embankment, in shade, rising from the water to a gently rolling top lined with grass (`grass_1.png`, in a few sizes, some mirrored), darker and wet at the waterline, with a few stones. There is only ever **one** water line. A river near sea level (within 300 px) becomes part of the sea, which is drawn along every level: it uses the sea's surface and only adds its reflections and ripples. A river high in the hills keeps its own water and is drawn over the sea inside its bowl (`r.water` / `r.joined` in `physics.js`).
  - **The bridge:** the near half rises into a small kicker (about 13°), and the gap in the middle is always wider than any car's wheelbase. It's 240 px on level 1, growing to 330 px by level 20. Every bridge has a 700 px flat run-up, so a car coming over a crest lands before it.
  - **Boost strip:** yellow arrows on the run-up and the near deck mark a boost strip. While gas is held there, the car is brought up to the speed that clears that gap (`vmin`, from the gap, kicker angle and gravity, plus a margin). So **holding gas always gets you across**, and easing off or crawling in drops you in.
  - **Falling in:** missing the gap (too slow, letting go of gas, or reversing off the deck) takes away control, and the car **falls under real gravity**. It tips and can clip the broken edge or the bank on the way down. A car left hanging nose-first on the edge is tipped over, and if it's still caught after a moment it slips off the planks. Only when it **reaches the water** does it splash, in a moment of slow motion. The splash is made of soft, round puffs of spray (one blurred sprite, `SOFT`, stretched and faded), so it has no hard edges: a crown thrown up on both sides (bigger on the side the car was going), a column where it went in, fine droplets, white water and faint ripples spreading on the surface, and a little mist, all sized by how hard it hit. The water then checks the dive and holds the car: it no longer catches on the broken deck and drifts out into open water between the banks. It floats nose-heavy and half under for about 1.4 s, rocking gently, then gulps a burst of air bubbles and sinks about 100 px down. Its headlights flicker and go out as they go under. All water looks the same: rivers use the sea's colours, its bright waterline and its drifting ripples (`waterDetails()`), and a river's surface stays calm. So does the far water behind the road, at the foot of the distant mountain range (`drawLake()`, which replaced the pale valley mist there): it has the same colours and ripples but no white waterline (only the water in the foreground has one), and it scrolls with the range, with its waves and ripples scaled down for distance. The background has only that one distant range; the middle range (`mountain_1` / `mountain_4`) was removed. The water is drawn in **two layers**. The back layer fills the river behind the car. While a car falls or sinks into a river, a front layer in the same colours goes on top of it: see-through at the surface and nearly opaque a little below, so the car fades from view as it sinks. Most rivers from level 2 on run into the sea. There, the front layer covers all the sea in view and the whole car stays visible in front of the sand banks. A river up in the hills (such as level 1's) has its own bowl, and a car sinking in it is clipped to the bowl so it never shows through the dirt below the waterline. The run ends with a **Splash!** fail screen (`startFall()`, `updateFall()` and `fellInRiver()`, the sinking in `update()`, and `drawRiverWater()` and `riverClip()` in `game.js`).
  - **Signs and rewards:** a "JUMP THE GAP!" sign warns before each bridge, there's a checkpoint before it, and coins float over the gap.
  - **Where the code is:** `river()` in `makeCourse` and the boost in `applyControls` (`physics.js`); `W.inRiver()` detects a fall; `drawRiverBack()`, `drawRiverWater()`, `drawBridges()` and `drawBoostArrows()` (`game.js`) draw it all.
  - **Tested in the simulator:** every ride, on all 20 levels, crosses every bridge with gas held, both from the start and from a standstill at the checkpoint. Crawling in falls, and the intro demo never falls in.
- **Slope limit:** a maximum-slope filter keeps every generated hill at 30° (level 2) to 38° (level 20).
- **Tested:** every level has been run in the simulator with all six cars, both driving carefully and just holding gas. All finish.

**Progress** is saved in the browser (`gv:levels`). Finishing a level unlocks the next and awards 1–3 stars: one for finishing, one for half the coins, and one for 80% of the coins. The best time per level is kept too. **Play now** starts the last level you played; **Levels** opens the level map. The "Drive there" door buttons always start Main Street (level 1).

**Race start** (`#start-seq`): every run opens with a race-start sequence instead of a 3-2-1 countdown. Letterbox bars slide in and a start gantry drops with three red lights that come on one by one (with a beep each) while the engine revs higher. After a held beat, every light turns green: **GO!** bursts in with a flash and speed streaks, and the controls unlock. It takes 2.75 seconds, and the timings are `START_MS` and `START_LIGHTS` in `game.js`. Opening a panel during the start pauses it.

**Fail screen** (`#modal-fail`): when you enter a haunted house (**Spooked!**) or a ghost touches you (**Caught!**), a haunted scene plays: fog and bats, the card shudders in, the title wobbles, and your ride trembles in front of that haunted house while its ghost swoops in. Below it are a tip about what went wrong, a distance bar showing how far along the course you got, your time and coins, and **Try again**, Levels and Hub. The text for each case is `FAIL_TEXT` in `game.js`.

**Win screen** (`#modal-finish`): a victory scene that plays in order. The card zooms in under light rays and confetti, and a light sweeps across it. The "Victory!" title drops in letter by letter, with a shine running along it. Your ride, with the driver facing forward as in the game, races onto a lit podium with speed lines and squashes on the brakes. Two chequered flags rise on either side and wave. The stars stamp in one by one with a sparkle burst and a chime, and the stat cards flip up while the time, coins and best time count up. A "New record" stamp lands on the Best card and a "Level N unlocked" pill appears when they apply. The Next level button glints now and then. The motion is CSS keyed off `.modal.open` (the "WIN SCREEN" block at the end of `hub.css`); `playWin()` in `game.js` adds the confetti, the chimes and the count-ups. With reduced motion turned on, it shows the final state straight away.

## Character

`char.png` sits in the driver's window of every car, drawn behind the car body so the door, roof and tinted glass frame him. `CHAR_SEAT` in `game.js` gives his head position and size for each car.
