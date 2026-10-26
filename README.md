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
- **Intro:** a white background with soft blue waves, the headline, three figures, and a slim, upright **phone** (a thin dark body and the camera notch, no buttons or status bar) that shows our games' screenshots. Every few seconds it fades to the next game, and every visit starts on a different game. A "Now showing" card, dots to pick a game, and a slowly turning "Play · Create · Delight" seal sit around it. On a desktop the phone turns gently towards the pointer; it pauses while the pointer rests on it, while it's off screen or while the tab is in the background.
- **Feature sections:** Our Games and Our Services get more room than the rest of the page: a wider layout (1360px), more space above and below, larger headings with a big outlined section number (`data-num`) behind them, bigger game posters and service tiles.
- **Our Games (01):** tall **poster cards**, in the order of `data.js`. Each game's portrait picture (`screen`, or `cover`) fills the card, the genre sits on frosted glass at the top, and the name and buttons sit on a frosted glass panel at the bottom. `focus` in data.js moves the picture inside the card (Monster Hills uses it to show its truck). On hover the card lifts and leans towards the pointer, and the picture zooms gently. Each card has **Play on the Web** (a violet pill) plus the **App Store** and **Google Play** badges in the official black style. On phones the cards become a swipe row with the next one peeking in.
- **Our Services (02):** raised, numbered tiles. As each tile scrolls in it rises into place, a soft light sweeps across it and its icon pops in and draws itself; then every icon keeps a small motion of its own (the gamepad's buttons blink, the phone pings, the screen types, the brush paints, the globe turns). Soft shapes float in the background and drift at different speeds as you scroll.
- **How we work:** a timeline (a vertical one on phones) that fills step by step as the steps scroll into view, with the newest step softly pulsing. All of this runs on its own while scrolling, and only while the section is on screen.
- **Game ratings:** under every game card there's a rating strip (that game's stars and number of reviews) and **Rate & review**, which opens that game's own reviews and a form to rate it and leave a comment (a sheet from the bottom on phones).
- **Contact Details (03):** one framed card: the details on a dark panel with a soft glow, and the form (with floating labels) beside it.
- **Footer:** a closing line in large serif type, the logo, links and the email.
- **Motion:** sections rise softly into place as they come into view, buttons and cards respond to the pointer, and the intro phone fades from game to game. Everything stays still with reduced motion turned on (the intro phone still changes games, without the fade).

## Games and store links

Each game in `data.js` has `stores: { appStore, playStore, web }`, a `cover`, a `color` (the dot colour in the intro) and optionally a `screen`: a portrait screenshot (about 640×1138) for the intro phone, used instead of the cover. Monster Hills has one because its cover is landscape. Every game card shows the **App Store** and **Google Play** badges:

- **While a store link is empty**, clicking the badge opens a **Coming soon** card with the game's cover and the store's icon ("Monster Hills is coming to the App Store…"), with *Play on the web* and *Got it*. It's a centred card on desktop and slides up from the bottom on phones; Esc, the backdrop, ✕ or Got it closes it.
- **When you paste a store link** into `appStore` / `playStore`, that badge opens the store in a new tab instead. Nothing else needs to change.
- **Play on web** opens the game over the page in the **game player** (a frame with the game's name, Full screen and Close; Back or Esc closes it, and closing stops the game). Games with `shape: 'landscape'` fill the player; the others get a phone-shaped screen on wide displays. A Ctrl/⌘-click opens the game in a new tab.

Games with `frame: false` open in a **new tab** instead of the player: their host doesn't allow being shown inside another site. That's the case for the Playgama links (Animal Café, ClueMoji, Baggage Out!), whose games only run on Playgama's own pages.

Monster Hills plays from `https://mispahinteractives.github.io/monster_hills_link/` (its `web` link). Publish it there first (see the README in `aim/monster_hills`); on `localhost` the site uses the local build (`local`) instead, so it can be tried before it's published.

## Ratings and reviews

Each game can be rated and reviewed from **Rate & review** under its card. Reviews are public: they're stored in **Supabase** (a free online database) and everyone sees a new review straight away. Until Supabase is set up, the site still works: the games show "No ratings yet", and a submitted review is **emailed** to `email` (through FormSubmit, like the contact form) so none are lost.

**One-off setup:**

1. Create a free project at supabase.com.
2. In the project's **SQL Editor**, run:

   ```sql
   create table public.reviews (
     id bigint generated always as identity primary key,
     created_at timestamptz not null default now(),
     name text not null check (char_length(name) between 2 and 60),
     target text not null check (char_length(target) between 1 and 80),
     rating smallint not null check (rating between 1 and 5),
     comment text not null check (char_length(comment) between 10 and 600),
     hidden boolean not null default false
   );
   alter table public.reviews enable row level security;
   -- anyone can read reviews that aren't hidden, and add a review (but not change or delete one)
   create policy "read reviews" on public.reviews for select to anon using (hidden = false);
   create policy "add a review" on public.reviews for insert to anon with check (hidden = false);
   grant select, insert on public.reviews to anon;
   ```

3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key into `data.js`: `reviews: { url: 'https://xxxx.supabase.co', key: 'eyJ…' }`. (The anon key is meant to be public; the rules above are what protect the table.)

**Moderating:** in Supabase's **Table Editor**, open `reviews` and tick `hidden` on a review to take it off the site (or delete the row). `target` says which game was reviewed: `game:<id>` (the game's id in data.js).

The site checks reviews before sending (a rating, a name, 10–600 characters), has a hidden spam trap, and lets one browser post up to three reviews a day.

## Contact form

Messages are sent in the background, so the visitor's email app never opens. With `contactKey` empty in `data.js` they go through FormSubmit (formsubmit.co) to `email`: the very first message sends a one-time **Activate Form** email to that inbox, and after one click every message arrives. Optionally, put a Web3Forms access key in `contactKey` to send through Web3Forms instead. The form checks the fields, has a hidden spam trap, and if sending fails it offers a one-click email link.
