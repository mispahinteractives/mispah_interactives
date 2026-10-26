# Mizpha Games website

The studio's website at **https://mizphagames.com**: a clean, white, one-page site with three sections — **Our Games**, **Our Services** and **Contact Details**. It's static (no build step): open `index.html` through any web server, e.g. `http://localhost/aim/mispah_interactives/` in XAMPP. GitHub Pages serves it from this repository (`CNAME` holds the domain; every push to `main` goes live).

The car game, **Monster Hills**, is no longer part of the website: it's a standalone game in its own project (`aim/monster_hills`, built on the learning_adventure template). The website lists it under Our Games like the other games.

## Files

```
index.html            the page: header, intro, Our Games, Our Services, Contact Details, footer, game player
assets/js/data.js     ← EDIT THIS: the games (with store links), services, how we work, contact details
assets/js/main.js     builds Games and Services from data.js; Coming soon, the game player, reveals, menu, contact form
assets/css/site.css   all the styles
assets/css/fonts.css  Fraunces and Plus Jakarta Sans, served locally from assets/fonts
assets/img            logo.png, logo-icon.png (browser tab), games/ (the game covers)
```

## Design

A clean white site with a quiet, premium feel. The palette comes from the logo: a deep ink for text (`--ink`), Mizpha violet as the signature colour (`--violet`) and the logo's amber as a warm highlight (`--amber`), all set at the top of `site.css`. **Fraunces**, an elegant soft serif, sets the headings, with italic accent words in a violet-to-amber gradient; **Plus Jakarta Sans** sets the text and interface.

- **Header:** the logo, a pill-shaped menu that highlights the section you're in, and Start a project. It turns into a frosted bar and tightens as you scroll.
- **Intro:** a soft violet and amber glow with a whisper of grain, the headline, three figures, a fanned stack of game covers that floats gently, and a slowly turning "Play · Create · Delight" seal with the logo icon.
- **Our Games (01):** a curated grid with the first game featured as a big card. Covers zoom slowly on hover, the genre sits on frosted glass, and each card has Play on web plus the App Store and Google Play badges. On phones the cards become a swipe row with the next one peeking in.
- **Our Services (02):** a grid of numbered services with hairline dividers (the icon turns dark on hover), and How we work as a timeline (a vertical one on phones).
- **Contact Details (03):** one card: the details on a dark panel with a soft glow, and the form (with floating labels) beside it.
- **Footer:** a closing line in large serif type, the logo, links and the email.
- **Motion:** sections rise softly into place as they come into view, buttons and cards respond to the pointer, and the hero glows and floats. Everything stays still with reduced motion turned on.

## Games and store links

Each game in `data.js` has `stores: { appStore, playStore, web }`. Every game card shows the **App Store** and **Google Play** badges:

- **While a store link is empty**, clicking the badge opens a **Coming soon** card with the game's cover and the store's icon ("Monster Hills is coming to the App Store…"), with *Play on the web* and *Got it*. It's a centred card on desktop and slides up from the bottom on phones; Esc, the backdrop, ✕ or Got it closes it.
- **When you paste a store link** into `appStore` / `playStore`, that badge opens the store in a new tab instead. Nothing else needs to change.
- **Play on web** opens the game over the page in the **game player** (a frame with the game's name, Full screen and Close; Back or Esc closes it, and closing stops the game). Games with `shape: 'landscape'` fill the player; the others get a phone-shaped screen on wide displays. A Ctrl/⌘-click opens the game in a new tab.

The first game in the list is the featured one (the big card).

Monster Hills plays from `https://mispahinteractives.github.io/monster_hills_link/` (its `web` link). Publish it there first (see the README in `aim/monster_hills`); on `localhost` the site uses the local build (`local`) instead, so it can be tried before it's published.

## Contact form

Messages are sent in the background, so the visitor's email app never opens. With `contactKey` empty in `data.js` they go through FormSubmit (formsubmit.co) to `email`: the very first message sends a one-time **Activate Form** email to that inbox, and after one click every message arrives. Optionally, put a Web3Forms access key in `contactKey` to send through Web3Forms instead. The form checks the fields, has a hidden spam trap, and if sending fails it offers a one-click email link.
