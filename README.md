# Mizpah Interactives — Studio Website

A static, dependency-free website for a game development and software technology
studio. No build step, no framework, no package install — open `index.html` or
drop the folder on any web server (it already sits in XAMPP's `htdocs`).

```
mispah_interactives/
├── index.html                  markup + SEO/Open Graph metadata
├── assets/
│   ├── css/styles.css          all styling
│   ├── js/
│   │   ├── content.js          ← EDIT THIS: every piece of site content
│   │   └── main.js             rendering, nav, reveals, video, player, form
│   ├── img/
│   │   ├── logo.png            company logo (header + footer)
│   │   ├── logo-icon.png       square icon (browser tab)
│   │   └── games/              game logos, posters, screenshots
│   └── video/                  gameplay footage (MP4 + WebM)
├── games/                      playable builds, launched in-page
│   ├── uno-clash/
│   └── golf-solitaire/
└── README.md
```

---

## Editing content

**Everything editable lives in `assets/js/content.js`.** Nothing in `index.html`
or `styles.css` needs to change to update copy, games, services or projects.

### ⚠️ Placeholders to replace before going live

No real contact details or statistics were supplied, so none were invented.
Anything marked `TODO` in `content.js` is a placeholder. The contact block also
renders a small amber **TODO** badge on screen next to unreplaced values, so
they're impossible to miss — the badges disappear automatically once you enter
real values.

| Field | Where | Note |
|---|---|---|
| Email, phone, location | `contact` | Amber TODO badge shows until replaced |
| Social profile URLs | `social` | Currently `'#'`; delete unused networks |
| Statistics | `stats.items` | Or set `stats.show = false` to hide the section |
| Company name | `company.name` / `company.shortName` | |

### Adding a game

Append one object to the `games` array. The Games section, the video showcase,
the reel carousel and the footer Games column all update automatically.

The Games section is a full-width row that scrolls left continuously, with
‹ › arrow buttons that step exactly one game at a time. The script repeats the
cards so the loop has no gap whether you have 2 games or 20, in either
direction. Auto-scroll pauses on hover, on keyboard focus, for a few seconds
after a tap or arrow click, and while a game or video is open. Visitors with
reduced motion get a still row that the arrows (or a swipe) still move. Speed
is `MARQUEE_SPEED` (pixels per second) in `main.js`.

### The hero

The right side of the hero shows one game's title screen on a tilted 3D phone,
with a floating label naming it. A different game is picked on each page load
(never the same one twice in a row — the last pick is remembered in
`localStorage`). Clicking the phone launches that game. The games it picks
from, and their order, come from `hero.slideOrder` in `content.js`; each uses
its `slide` image.

Game posters (`thumb` and `video.poster`) and hero slides are all real
screenshots of each game's title screen, captured from the builds in `games/`.
Posters use the blurred-backdrop 16:9 treatment; slides are the raw portrait
capture.

```js
{
  id: 'my-game',                       // unique; also used as the #anchor
  name: 'My Game',
  tagline: 'Puzzle Adventure',
  description: 'One or two sentences.',
  platforms: ['HTML5', 'Mobile'],
  logo:  'assets/img/games/my-game-logo.png',
  thumb: 'assets/img/games/my-game-poster.jpg',   // 16:9
  shots: [ { src: '...', alt: '...' } ],          // kept as data; not shown in the scrolling row
  video: {                                        // omit entirely if no footage
    mp4:    'assets/video/my-game.mp4',
    webm:   'assets/video/my-game.webm',          // optional
    poster: 'assets/img/games/my-game-poster.jpg'
  },
  url: 'https://play.example.com',                // or null to hide the button
  featured: false
}
```

A game **without** a `video` key simply renders no play button — the site does
not assume footage exists. If no game has a video, the whole showcase section
hides itself.

### Making a game playable in-page

Drop the build into `games/<slug>/` (an `index.html` plus whatever it needs),
then add a `play` block to that game:

```js
play: {
  src: 'games/my-game/',
  orientation: 'landscape',   // or 'portrait' — see below
  weight: '8 MB'              // shown in the loading message; optional
}
```

That's all — a **Play Now** button appears on the game card.

- `orientation: 'portrait'` frames the game at 9:16 and centres it on desktop
  so it isn't stretched; on mobile it fills the screen either way.
- The iframe is **created on open and destroyed on close**, so a 15MB build
  costs nothing until someone asks for it, and its memory is released on exit.
- The player has a fullscreen toggle, `Esc` to close, and locks page scroll
  while open.
- UNO Clash and Golf Solitaire each probe for `mraid.js` (an ad-SDK that only
  exists inside an ad network). Their game folders carry an empty `mraid.js`
  stub purely to keep that 404 out of the console — the games don't use the
  API. Cinemoji and Animal Café don't reference it at all.

Current builds, all the studio's own shipped artifacts:

| Game | Format | Weight |
|---|---|---|
| UNO Clash    | single-file HTML build          | 15 MB |
| Golf Solitaire | single-file HTML build        | 4 MB  |
| Cinemoji     | webpack production build        | 18 MB |
| Animal Café  | plain ES-module source (no build step) | 25 MB |

Animal Café's source had one broken path — `scenes/BootScene.js` loaded a
webfont via `'../../js/webfont.js'`, which pointed outside the game folder.
It was fixed to `'js/webfont.js'` in the copy under `games/dog-crush/` only;
the original project is untouched.

### Other arrays

`services`, `process`, `why.features`, `about.highlights`, `nav`, `footer.columns`
all render from data. Service and feature icons come from the icon set in
`main.js` (`ICONS`) — available names: `spark, code, players, gamepad, html5,
mobile, design, brush, web, chip, wave, shield, mail, phone, pin, play, arrow`.

---

## The contact form

By default `contact.formEndpoint` is `null`, so submitting opens the visitor's
email client pre-filled (a `mailto:` fallback). Validation runs either way.

To receive submissions properly, set an endpoint that accepts a JSON `POST`:

```js
formEndpoint: 'https://formspree.io/f/xxxxxxx'   // or your own PHP handler
```

The posted body is `{ name, email, phone, company, message }`.

---

## Video

Gameplay footage was **recorded from the studio's own running builds** (UNO
Clash and Golf Solitaire) rather than mocked up.

Each clip ships as MP4 (H.264) and WebM (VP9); the browser picks what it
supports. Golf Solitaire is a portrait game, so its clip is composited into a
16:9 frame with a blurred backdrop of itself.

Performance rules the site follows:

- The big gameplay videos use `preload="none"` — **no video data downloads until
  the visitor presses play.**
- The hero uses still title-screen images, not video. (`hero-loop.mp4/webm`
  from the earlier single-game hero are still in `assets/video/` but no longer
  referenced — safe to delete.)
- Nothing autoplays with sound; every clip is user-initiated.
- Closing the lightbox empties it, which stops playback and frees the buffer.

Current critical-path weight is roughly **550KB** with a first contentful paint
around **0.3s** locally.

### Replacing or adding footage

Any MP4 works — just point a game's `video.mp4` at it. To match the existing
encoding:

```bash
# main gameplay clip (16:9 source)
ffmpeg -i raw.mov -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
       -r 30 -vf scale=1280:720 -movflags +faststart out.mp4

# WebM companion
ffmpeg -i out.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 out.webm

# portrait source -> 16:9 with blurred pillarbox
ffmpeg -i raw.mov -an -filter_complex \
 "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=30,eq=brightness=-0.18:saturation=1.15[bg];\
  [0:v]scale=-2:720[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p" \
 -c:v libx264 -preset slow -crf 26 -movflags +faststart out.mp4

# poster frame
ffmpeg -ss 6 -i out.mp4 -frames:v 1 -q:v 3 poster.jpg
```

---

## Branding

The logo is the studio's own artwork: `assets/img/logo.png` (the full Mizpah
Interactives lockup, used in the header and footer) and `assets/img/logo-icon.png`
(the M-and-controller mark on its own, used as the browser-tab icon). Both were
cut from the supplied `logo.png`. To rebrand, replace those two files.

To use a supplied logo instead, set `company.logoImage` in `content.js` to an
image path, or replace the inline `<svg>` blocks.

Brand colours are CSS custom properties at the top of `styles.css`
(`--violet`, `--blue`, `--cyan`, `--amber`, `--grad`). Changing those four
restyles the whole site.

---

## Browser support & accessibility

- Responsive from 320px to ultra-wide; verified with no horizontal scroll at
  375 / 414 / 768 / 1024 / 1440 / 1920.
- Semantic landmarks, one `<h1>`, correct heading order, alt text on every
  image, `aria-label` on every icon-only control.
- Keyboard accessible: skip link, visible focus rings, `Esc` closes the video
  lightbox and the mobile menu, focus is trapped in the lightbox and restored
  on close.
- `prefers-reduced-motion` is honoured — particles are removed, the hero loop is
  skipped, and all scroll-reveal content renders immediately.
