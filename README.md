# Mizpah Interactives · Monster Hills

The Mizpah Interactives website: a game hub built around a playable physics truck game. It's static with no build step. Open `index.html` through any web server (XAMPP: `http://localhost/aim/mispah_interactives/`).

The contact email lives in two places: the Contact section of `index.html` and `CONTACT_EMAIL` in `assets/js/hub.js`. The logo is `assets/img/logo.png` (the favicon is `assets/img/logo-icon.png`).

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

The car is driven with the on-screen buttons on every device: **Brake** (bottom-left), **Gas** and **Jump** (bottom-right). Tap them on a phone or tablet, or click them with the mouse on a PC. On a PC the keyboard works too: → / D gas, ← / A brake, Space / ↑ / W jump, ↓ lean, E enter a door. At a door, press the gold **Enter** button.

A hop carries the car a little way forward (`JUMP_FORWARD` in `physics.js`). Brake slows the car and then holds it still (on slopes too); it never reverses. The top bar has reset, ride, theme, sound and exit buttons.

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

Rain uses the same lights-on pipeline as Night, with an overcast sky, slanted rain in two depths, splashes and tyre spray, a wet sheen on the road, and random lightning with thunder (`drawRain()` / `rainTick()` in `game.js`).

## Crows

In Morning only, three crows fly far off in the sky, between the clouds and the mountains, crossing in both directions. They use only the in-flight pose `crow_1.png` (mirrored for right-flying crows), animated smoothly with a soft wing-beat squash, long glides, a gentle rise and fall, and a tilt that follows the path (`CROWS` / `drawCrows()` in `game.js`). `crow_2.png` isn't used: its pose is too different to animate between. Night and Rain have no crows.

## Performance

- **Intro demo:** runs every frame while you're looking at it, and drops to about 10 fps only when the browser window is in the background. Nothing is drawn while the tab is hidden or the game is scrolled off screen.
- **Endless CSS animations:** paused for sections that are off screen (`anim-paused`), and pulses animate transform/opacity rather than box-shadow.
- **Image cache:** pre-sized sprite copies are kept in a least-recently-used cache of 120 entries.
- **Gamepad:** only polled after a gamepad connects, because polling it every frame keeps macOS's game-controller service busy.

## Coins

There are 44 coins: a pair over every speed bump on Main Street, rows of three along the hills, and an arc of three over each jump (`coinSpots` in `physics.js`). Every vehicle can collect all of them. The coin total shown on the page updates itself from the course.

## Fonts

The site uses **Russo One** (headings, buttons and in-game text) and **Exo 2** (body text), both under the SIL Open Font License 1.1. They're served locally from `assets/fonts/` (Latin and Latin Extended subsets in woff2, about 83 KB in total) via `assets/css/fonts.css`, so nothing is loaded from Google Fonts. Exo 2 is a variable font, so one file covers weights 400–800.

## Rides

Five rides: Monster Truck, Blue Bubble, Green Cruiser, **Red Classic** (`red_car.png` with `Wheels.png`) and **Skull Crusher** (`black_car.png` with `black_tire.png`).

- **Red Classic:** its art faces left, so it's drawn mirrored (`flip: true` in `VEHICLES` in `physics.js`), and its wheel, hull and exhaust coordinates are given in the mirrored image. Its collision hull tapers at the nose and tail so the long, low overhangs don't catch on ramps.
- **Skull Crusher:** its art is small (192×119), so it's scaled up 1.55× to monster-truck size. Its collision hull covers only the body, not the X-frame underneath.

On phones the ride picker becomes a swipeable row.

## Levels

There are 20 levels (`makeCourse(level)` in `physics.js`):

- **Level 1** is Main Street: the town with the four game doors and the haunted houses, then the hills. It's hand-tuned.
- **Levels 2–20** are generated from the level number, so each level is always the same course. They get longer (7,000 → 18,000), hillier and bumpier. Ramps grow from 1 to 5, haunted houses (with roof and door ghosts) from 0 to 6, and knock-over props from 1 to 4 stacks, with coin rows and jump arcs placed to match.
- **Slope limit:** a maximum-slope filter keeps every generated hill at 30° (level 2) to 38° (level 20).
- **Tested:** every level has been run in the simulator with all six cars, both driving carefully and just holding gas. All finish.

**Progress** is saved in the browser (`gv:levels`). Finishing a level unlocks the next and awards 1–3 stars: one for finishing, one for half the coins, and one for 80% of the coins. The best time per level is kept too. **Play now** starts the last level you played; **Levels** opens the level map. The "Drive there" door buttons always start Main Street (level 1).

## Character

`char.png` sits in the driver's window of every car, drawn behind the car body so the door, roof and tinted glass frame him. `CHAR_SEAT` in `game.js` gives his head position and size for each car.
