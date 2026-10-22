/* ==========================================================================
   MIZPHA GAMES — game catalogue
   --------------------------------------------------------------------------
   One entry per game. The same data feeds the game cards on the page and
   the arcade doors on Monster Hills' main street (matched by `id` to the
   buildings in physics.js). Every game plays inside the site, in the game
   player (hub.js), never in a new tab.
     url    where the game is hosted (it must allow being shown in a frame)
     shape  'portrait' games get a phone-shaped screen on wide displays,
            'landscape' games fill the player
     door   the door number on Main Street
     house  which game house picture it uses (correct_house_1-4); defaults
            to `door`. Games beyond four share a house, under their own sign.
   ========================================================================== */
window.GV_GAMES = [
  {
    id: 'animal-cafe',
    name: 'Animal Café',
    genre: 'Match-3 Puzzle',
    blurb: 'Swap ingredients to fill hungry customers’ orders. Chain combos into power-ups across 20 cosy café levels.',
    url: 'https://mizphagamestudios-hash.github.io/cafe_link/',
    shape: 'portrait',
    logo: 'assets/img/games/dog-crush-logo.png',
    cover: 'assets/img/games/dog-crush-slide.jpg',
    color: '#6cc24a',
    roof: '#f08a24',
    door: 1,
    house: 1
  },
  {
    id: 'cinemoji',
    name: 'Cinemoji',
    genre: 'Emoji Quiz',
    blurb: 'Find the emojis, match the movie. Crack 100 clue puzzles before the timer and your hearts run out.',
    url: 'https://mizphagamestudios-hash.github.io/emoji_link/',
    shape: 'portrait',
    logo: 'assets/img/games/cinemoji-logo.png',
    cover: 'assets/img/games/cinemoji-slide.jpg',
    color: '#ffc02e',
    roof: '#e2394f',
    door: 2,
    house: 2
  },
  {
    id: 'baggage-out',
    name: 'Baggage Out!',
    genre: 'Traffic Puzzle',
    blurb: 'Steer luggage-cart trains through a busy airport apron and guide every cart to its matching garage before time runs out.',
    url: 'https://mizphagamestudios-hash.github.io/baggageout_link/',
    shape: 'portrait',
    logo: 'assets/img/games/baggage-out-logo.png',
    cover: 'assets/img/games/baggage-out-slide.jpg',
    color: '#ff5a5f',
    roof: '#1fa38a',
    door: 3,
    house: 4
  },
  {
    id: 'learning-adventure',
    name: 'Learning Adventure',
    genre: 'Kids Learning',
    blurb: 'Learn and play in a cheerful classroom with a friendly bear teacher. Made for small learners with big dreams.',
    url: 'https://mispahinteractives.github.io/learning_adventure_link/',
    shape: 'landscape',
    logo: 'assets/img/games/learning-adventure-logo.png',
    cover: 'assets/img/games/learning-adventure-slide.jpg',
    color: '#4fa3f7',
    roof: '#f5b82e',
    door: 4,
    house: 1
  },
  {
    id: 'uno-clash',
    name: 'UNO Clash',
    genre: 'Card Battle',
    blurb: 'Match colours and numbers, drop a +2 at the perfect moment, and empty your hand before your rivals.',
    url: 'https://mispahinteractives.github.io/UNO_Link/',
    shape: 'portrait',
    logo: 'assets/img/games/uno-clash-logo.png',
    cover: 'assets/img/games/uno-clash-slide.jpg',
    color: '#4a6bff',
    roof: '#3b4fd8',
    door: 5,
    house: 3
  }
];
