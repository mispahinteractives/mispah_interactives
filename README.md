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

The art lives in `assets/`: the truck and car sprites in `assets/img/assets/`, plus the game logos, covers and gameplay videos in `assets/img/games/` and `assets/video/`.

## How the car works

- **Chassis:** one compound body (the shell plus a lower frame), so the centre of mass sits low.
- **Wheels:** motor-driven circles.
- **Suspension:** each wheel hangs from a soft spring and a stiff trailing arm. A hard travel limit keeps landings from jamming a wheel into the body. Tune per vehicle in `VEHICLES` in `physics.js`: `spring`, `springDamp`, `travel`.
- **Air control:** gas lifts the nose and brake drops it, fading out past about 50° so holding gas never lands you on the tailgate. ↑/↓ lean with no limit.
- **Auto-respawn:** a car that's upside down, or stuck standing on its nose or tail, returns to the last checkpoint.

## Adding or changing a game

Edit `assets/js/games.js`. Each entry becomes a card in "Select your game" and a building with a door on Main Street. To give a game a door, add its `id` to the `BUILDINGS` list in `physics.js`. The doors are placed `DOOR_SPACING` (1250px) apart, and the town, speed bumps, coins and checkpoints move to fit. The hills are placed relative to the end of the town, so they're never affected.

## Controls

| Input | Gas | Brake | Jump | Lean | Enter door |
|---|---|---|---|---|---|
| Keyboard | → / D | ← / A | Space / J | ↑ ↓ | E / Enter |
| Touch | Gas button | Brake button | Jump button | (Gas/Brake in air) | gold button |
| Gamepad | RT | LT / B | A | left stick | Y |

Brake slows the car and then holds it still (on slopes too); it never reverses. If you're stuck, jump or press R to go back to the last checkpoint.

The touch buttons show on touch screens and on any screen narrower than 900px while playing. Jump hops once per press, only with a wheel on the ground; its strength per vehicle is `jump` in `VEHICLES`.

Other keys: `1` `2` `3` switch ride · `R` checkpoint · `B` horn · `M` mute · `Esc` exit.

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
- **Scaling:** houses are drawn at a fixed scale of their image size (`GAME_K`, `HAUNT_K` in `game.js`). `GAME_DOOR` / `HAUNT_DOOR` record where the door is in each picture, so the door lines up with the door spot. If you replace a house image, update its door position there.
- **Ghosts:** always drawn at their natural size (one image pixel per screen pixel), in the game, the jump scare and the fail card. They only move and fade.

## Image quality

Every sprite is resized once, with high quality, to the size it covers on screen, and that copy is drawn 1:1 (`hq()` in `game.js`). Bigger source images simply come out sharper; there's nothing else to change.
