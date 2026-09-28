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

| Input | Gas | Brake / reverse | Lean | Enter door |
|---|---|---|---|---|
| Keyboard | → / D | ← / A | ↑ ↓ | E / Enter |
| Touch | right pedal | left pedal | (pedals in air) | gold button |
| Gamepad | RT / A | LT / B | left stick | Y |

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
