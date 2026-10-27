/* ==========================================================================
   MIZPHA GAMES — website content
   --------------------------------------------------------------------------
   Everything the page shows lives here: the games (with their store links),
   the services, how we work, and the contact details. The page builds the
   Games and Services sections from this file.

   Store links: fill in appStore / playStore when a game is published.
   Until then the App Store / Google Play badges show "Coming soon". `web`
   opens the game in the site's game player.

   Pictures (in assets/img/games, named after the game):
     cover    the game's title screen, with its logo: the game card in Our
              Games and the Coming soon message use it
     screens  in-game screenshots, in order. The phone at the top of the
              page shows every picture of every game, game by game: the
              cover first, then these
   `color` is the game's accent colour, from the logo's palette (gold
   #ffb21f, orange #ff9a1f, violet #6d3df2, deep purple #4c1fc9, lavender
   #a68bff). `focus` (optional) moves the
   picture inside its card (CSS object-position, e.g. '50% 85%').

   `frame: false` opens `web` in the same browser tab instead of the site's
   game player, for hosts that don't allow being shown inside another site
   (Playgama's pages). `soon: true` shows the game as Coming soon: no Play
   on the Web (its link is kept for later); remove the line to make it
   playable again.
   ========================================================================== */
window.MG = {
  email: 'mizphagamestudios@gmail.com',
  founder: 'Bensath',
  // Contact form: messages are sent in the background through FormSubmit to
  // `email` (the first message sends a one-time "Activate Form" email; click
  // it once). Optionally paste a Web3Forms access key here to use Web3Forms.
  contactKey: '',

  games: [
    {
      id: 'animal-cafe',
      name: 'Animal Café',
      genre: 'Match-3 puzzle',
      blurb: 'Swap ingredients to fill hungry customers’ orders. Chain combos into power-ups across cosy café levels.',
      cover: 'assets/img/games/animal-cafe-title.jpg',
      screens: ['assets/img/games/animal-cafe-play.jpg', 'assets/img/games/animal-cafe-blocker.jpg'],
      color: '#ffb21f',
      frame: false,
      stores: { appStore: '', playStore: '', web: 'https://playgama.ai/play/3bgnwkq2gjhq3j' }
    },
    {
      id: 'cluemoji',
      name: 'ClueMoji',
      genre: 'Emoji puzzle',
      blurb: 'Find the emojis, crack the clue. Thousands of little discoveries in a bright, friendly word puzzle.',
      cover: 'assets/img/games/cluemoji-title.jpg',
      screens: ['assets/img/games/cluemoji-play.jpg'],
      color: '#6d3df2',
      frame: false,
      stores: { appStore: '', playStore: '', web: 'https://playgama.ai/play/d5ypyd7tb4ayic' }
    },
    {
      id: 'baggage-out',
      name: 'Baggage Out!',
      genre: 'Traffic puzzle',
      blurb: 'Steer luggage-cart trains through a busy airport and guide every cart to its matching garage before time runs out.',
      cover: 'assets/img/games/baggage-out-title.jpg',
      screens: ['assets/img/games/baggage-out-play.jpg', 'assets/img/games/baggage-out-how-to-play.jpg'],
      color: '#ff9a1f',
      frame: false,
      stores: { appStore: '', playStore: '', web: 'https://playgama.com/game/baggage-out' }
    },
    {
      id: 'learning-adventure',
      soon: true,
      name: 'Learning Adventure',
      genre: 'Kids learning',
      blurb: 'Learn and play in a cheerful classroom with a friendly bear teacher. Made for small learners with big dreams.',
      cover: 'assets/img/games/learning-adventure-title.jpg',
      color: '#a68bff',
      shape: 'landscape',
      stores: { appStore: '', playStore: '', web: 'https://mispahinteractives.github.io/learning_adventure_link/' }
    },
    {
      id: 'uno-clash',
      soon: true,
      name: 'UNO Clash',
      genre: 'Card battle',
      blurb: 'Match colours and numbers, drop a +2 at the perfect moment, and empty your hand before your rivals.',
      cover: 'assets/img/games/uno-clash-title.jpg',
      screens: ['assets/img/games/uno-clash-play.jpg', 'assets/img/games/uno-clash-level.jpg'],
      color: '#4c1fc9',
      stores: { appStore: '', playStore: '', web: 'https://mispahinteractives.github.io/UNO_Link/' }
    },
    {
      id: 'monster-hills',
      soon: true,
      name: 'Monster Hills',
      genre: 'Physics racing',
      blurb: 'Drive a monster truck with real suspension over 20 levels of hills, jumps and broken bridges. Four rides and four themes.',
      cover: 'assets/img/games/monster-hills-title.jpg',
      screens: ['assets/img/games/monster-hills-play.jpg'],
      color: '#f5a300',
      shape: 'landscape',
      // the standalone game (aim/monster_hills), published like learning_adventure_link
      stores: { appStore: '', playStore: '', web: 'https://mispahinteractives.github.io/monster_hills_link/' },
      local: 'http://localhost/aim/monster_hills/dist/'      // used instead of `web` when the site runs on localhost
    }
  ],

  services: [
    { icon: 'pad',    title: 'Game Development',        text: 'Engaging, scalable games with smooth gameplay and polished experiences.' },
    { icon: 'html5',  title: 'HTML5 Game Development',  text: 'Fast, responsive browser games built for web platforms and playable ads.' },
    { icon: 'mobile', title: 'Mobile Game Development', text: 'Mobile games optimised for performance and usability on iOS and Android.' },
    { icon: 'ui',     title: 'UI/UX Design',            text: 'Clean, intuitive interfaces designed around the player’s experience.' },
    { icon: 'brush',  title: 'Game Art & Animation',    text: 'Creative visuals, animation and game assets that bring games to life.' },
    { icon: 'web',    title: 'Web Development',         text: 'Modern, responsive websites and interactive digital experiences.' }
  ],
  process: [
    { title: 'Idea',        text: 'Turn concepts into clear product ideas.' },
    { title: 'Design',      text: 'Shape the visual experience and user flow.' },
    { title: 'Development', text: 'Build the game or digital product.' },
    { title: 'Testing',     text: 'Test performance, usability and gameplay.' },
    { title: 'Launch',      text: 'Prepare and release the final product.' }
  ]
};
