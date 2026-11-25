# Baggage Out! web build

Play at https://mizphagames.com/games/baggage-out/ or from the Baggage Out card on the studio homepage.

This folder contains the compiled Phaser game and public runtime assets. It needs only static hosting. Purchases, the coin store, and native ad offers are disabled in browsers. Coins are earned through levels; progress is saved in browser local storage.

To update from the Baggage Out source project, run:

```sh
npm run build:web
npm run web:stage -- /path/to/mispah_interactives
```

Review and commit the changed game files in this website repository, then push to main for GitHub Pages. The native mobile build uses a separate output folder and keeps the store and mobile ads.
