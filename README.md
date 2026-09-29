# Mizpah Interactives · Monster Hills

The Mizpah Interactives website: a game hub built around a playable physics truck game. It's static with no build step. Open `index.html` through any web server (XAMPP: `http://localhost/aim/mispah_interactives/`).

The contact email lives in two places: the Contact section of `index.html` and `CONTACT_EMAIL` in `assets/js/hub.js`. The logo is `assets/img/logo.png` (the favicon is `assets/img/logo-icon.png`).

```
./
├── index.html            page: live game stage, game select, controls, contact
├── assets/css/hub.css    all styling
└── assets/js/
    ├── vendor/matter.min.js   Matter.js 0.20 (physics engine, vendored)
    ├── physics.js        course, props, vehicles, suspension (no DOM; runs in Node)
    ├── games.js          ← EDIT THIS: the external games (cards + arcade doors)
    ├── game.js           renderer, input, camera, sound, doors, coins, finish
    └── hub.js            cards, ride previews, stats, reveals
```

The art lives in `assets/`: the truck and car sprites in `assets/img/assets/`, plus the game logos and cover images in `assets/img/games/`.

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

In Morning only, three crows fly far off in the sky, between the clouds and the mountains. Some fly left to right and some right to left. They're drawn small and slightly faded to look distant, and flap slowly with long glides using `crow_1.png` (wings up, mirrored because the art faces left) and `crow_2.png` (wings down). See `CROWS` in `game.js`. Night and Rain have no crows.
