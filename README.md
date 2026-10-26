# Mizpha Games website

The studio's website at **https://mizphagames.com**: a clean, white, one-page site with three sections — **Our Games**, **Our Services** and **Contact Details**. It's static (no build step): open `index.html` through any web server, e.g. `http://localhost/aim/mispah_interactives/` in XAMPP. GitHub Pages serves it from this repository (`CNAME` holds the domain; every push to `main` goes live).

The car game, **Monster Hills**, is no longer part of the website: it's a standalone game in its own project (`aim/monster_hills`, built on the learning_adventure template). The website lists it under Our Games like the other games.

## Files

```
index.html            the page: header, intro, Our Games, Our Services, Contact Details, footer, game player
assets/js/data.js     ← EDIT THIS: the games (with store links), services, how we work, contact details
assets/js/main.js     builds Games and Services from data.js; the intro game screen, Coming soon, the game player, card tilt, reveals, menu, contact form
assets/css/site.css   all the styles
assets/css/fonts.css  Fraunces and Plus Jakarta Sans, served locally from assets/fonts
assets/img            logo.png, logo-icon.png (browser tab), hero-bg.jpg + hero-bg-sm.jpg (the intro background,
                      desktop and phones), games/ (the game covers and portrait screens)
```

## Design

A clean white site with a quiet, premium feel. The palette comes from the logo: a deep ink for text (`--ink`), Mizpha violet as the signature colour (`--violet`) and the logo's amber as a warm highlight (`--amber`), all set at the top of `site.css`. Surfaces have quiet depth: a hairline gradient rim, a lit top edge and layered soft shadows (`--frame`, `--edge`, `--depth`), and buttons press in when clicked. **Fraunces**, an elegant soft serif, sets the headings, with italic accent words in a violet-to-amber gradient; **Plus Jakarta Sans** sets the text and interface.

- **Header:** the logo, a pill-shaped menu that highlights the section you're in, and Start a project. It turns into a frosted bar and tightens as you scroll.
- **Intro:** a white background with soft blue waves, the headline, three figures, and a slim, upright **phone** (a thin dark body and the camera notch, no buttons or status bar) that shows our games' screenshots. Every 2 seconds it fades to the next game, round and round,, and every visit starts on a different game. A "Now showing" card, dots to pick a game, and a slowly turning "Play · Create · Delight" seal sit around it. On a desktop the phone turns gently towards the pointer; it only rests while it's off screen or the tab is in the background.
- **Feature sections:** Our Games and Our Services get more room than the rest of the page: a wider layout (1360px), more space above and below, larger headings with a big outlined section number (`data-num`) behind them, bigger game posters and service tiles.
- **Our Games (01):** tall **poster cards**, in the order of `data.js`. Each game's portrait picture (`screen`, or `cover`) fills the card, the genre sits on frosted glass at the top, and the name and buttons sit on a frosted glass panel at the bottom. `focus` in data.js moves the picture inside the card (Monster Hills uses it to show its truck). On hover the card lifts and leans towards the pointer, and the picture zooms gently. Each card has **Play on the Web** (a violet pill) plus the **App Store** and **Google Play** badges in the official black style. On phones the cards become a swipe row with the next one peeking in.
- **Our Services (02):** raised, numbered tiles. As each tile scrolls in it rises into place, a soft light sweeps across it and its icon pops in and draws itself; then every icon keeps a small motion of its own (the gamepad's buttons blink, the phone pings, the screen types, the brush paints, the globe turns). Soft shapes float in the background and drift at different speeds as you scroll.
- **How we work:** a timeline (a vertical one on phones) that fills step by step as the steps scroll into view, with the newest step softly pulsing. All of this runs on its own while scrolling, and only while the section is on screen.
- **Contact Details (03):** one framed card: the details on a dark panel with a soft glow, and the form (with floating labels) beside it.
- **Footer:** a closing line in large serif type, the logo, links and the email.
- **Motion:** sections rise softly into place as they come into view, buttons and cards respond to the pointer, and the intro phone fades from game to game. Everything stays still with reduced motion turned on (the intro phone still changes games, without the fade).

## Games and store links

Each game in `data.js` has `stores: { appStore, playStore, web }`, a `cover`, a `color` (the dot colour in the intro) and optionally a `screen`: a portrait screenshot (about 640×1138) for the intro phone, used instead of the cover. Monster Hills has one because its cover is landscape. Every game card shows the **App Store** and **Google Play** badges:

- **While a store link is empty**, clicking the badge opens a **Coming soon** card with the game's cover and the store's icon ("Monster Hills is coming to the App Store…"), with *Play on the web* and *Got it*. It's a centred card on desktop and slides up from the bottom on phones; Esc, the backdrop, ✕ or Got it closes it.
- **When you paste a store link** into `appStore` / `playStore`, that badge opens the store in a new tab instead. Nothing else needs to change.
- **Play on web** opens the game over the page in the **game player** (a frame with the game's name, Full screen and Close; Back or Esc closes it, and closing stops the game). Games with `shape: 'landscape'` fill the player; the others get a phone-shaped screen on wide displays. A Ctrl/⌘-click opens the game in a new tab.

Games with `frame: false` open in a **new tab** instead of the player: their host doesn't allow being shown inside another site. That's the case for the Playgama links (Animal Café, ClueMoji, Baggage Out!), whose games only run on Playgama's own pages.

Games marked `soon: true` in `data.js` (Learning Adventure, UNO Clash and Monster Hills for now) show **Coming soon** instead of Play on the Web, with a Coming soon tag on the picture; their web links stay in `data.js`, so removing the line makes a game playable again.

Monster Hills plays from `https://mispahinteractives.github.io/monster_hills_link/` (its `web` link). Publish it there first (see the README in `aim/monster_hills`); on `localhost` the site uses the local build (`local`) instead, so it can be tried before it's published.

## Contact form

Messages are sent in the background, so the visitor's email app never opens. With `contactKey` empty in `data.js` they go through FormSubmit (formsubmit.co) to `email`: the very first message sends a one-time **Activate Form** email to that inbox, and after one click every message arrives. Optionally, put a Web3Forms access key in `contactKey` to send through Web3Forms instead. The form checks the fields, has a hidden spam trap, and if sending fails it offers a one-click email link.
