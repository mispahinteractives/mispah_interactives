/* ==========================================================================
   SITE CONTENT  —  EDIT THIS FILE TO UPDATE THE WEBSITE
   --------------------------------------------------------------------------
   Everything the site displays lives here. Adding a game or a service
   means adding one object to the relevant array below — no HTML
   or CSS changes required.

   ⚠️  PLACEHOLDERS: anything marked "TODO" is a placeholder. Real company
       contact details and statistics were not supplied, so nothing has been
       invented. Replace the TODO values before publishing.
   ========================================================================== */

window.SITE = {

  /* ---------------------------------------------------------------- company */
  company: {
    name: 'Mispah Interactives',
    shortName: 'Mispah',
    tagline: 'Game Development & Software Technology Studio',
    description:
      'We design and build games, playable experiences and digital products — ' +
      'from first concept through to launch.',
    // Logo is drawn as inline SVG (assets/img/logo.svg). Swap that file to
    // rebrand, or set `logoImage` to a path to use a bitmap logo instead.
    logoImage: null,
    foundedYear: 2026
  },

  /* ------------------------------------------------------------------- nav */
  nav: [
    { label: 'Home',      href: '#home' },
    { label: 'About',     href: '#about' },
    { label: 'Games',     href: '#games' },
    { label: 'Services',  href: '#services' },
    { label: 'Contact',   href: '#contact' }
  ],
  navCta: { label: "Let's Work Together", href: '#contact' },

  /* ------------------------------------------------------------------ hero */
  hero: {
    eyebrow: 'Game Development & Interactive Technology',
    heading: 'We build experiences that people love.',
    subheading:
      'We create engaging games, interactive experiences, and innovative ' +
      'digital solutions that bring ideas to life.',
    primaryCta:   { label: 'Explore Our Games', href: '#games' },
    secondaryCta: { label: 'Get In Touch',      href: '#contact' },
    // Visual shown on the right of the hero. `video` is a short, heavily
    // compressed decorative loop (~200KB) — not the full gameplay clip — so
    // it never competes with the first paint. Set to null for a static poster.
    art: {
      video:     'assets/video/hero-loop.mp4',
      videoWebm: 'assets/video/hero-loop.webm',
      poster:    'assets/img/games/uno-clash-poster.jpg',
      logo:      'assets/img/games/uno-clash-logo.png',
      alt:       'UNO Clash multiplayer card game gameplay'
    }
  },

  /* ----------------------------------------------------------------- about */
  about: {
    heading: 'We are creators, developers & innovators.',
    body:
      'We are a creative technology team focused on building engaging games ' +
      'and digital experiences. From concept and design to development and ' +
      'deployment, we combine creativity and technology to create products ' +
      'that people enjoy using.',
    image: {
      src: 'assets/img/games/uno-clash-keyart.jpg',
      alt: 'UNO Clash key art created in-house'
    },
    highlights: [
      {
        icon: 'spark',
        title: 'Creative Thinking',
        text: 'Original concepts, strong art direction and mechanics designed to keep players coming back.'
      },
      {
        icon: 'code',
        title: 'Technical Expertise',
        text: 'Engine-level engineering across HTML5, mobile and web — built to run fast on real devices.'
      },
      {
        icon: 'players',
        title: 'Player-Focused Experiences',
        text: 'Every decision is measured against how the game actually feels in a player\'s hands.'
      }
    ]
  },

  /* ----------------------------------------------------------------- games */
  /* Add a new game by appending an object here. Fields:
       id, name, tagline, description, platforms[], logo, thumb,
       video { mp4, webm, poster }  (omit `video` if there is no footage yet)
       url   — external "View Game" link, or null to hide the button          */
  games: [
    {
      id: 'uno-clash',
      name: 'UNO Clash',
      tagline: 'Multiplayer Card Game',
      description:
        'A fast-paced multiplayer card game designed for fun and competitive ' +
        'gameplay. Play offline against AI opponents or online against others, ' +
        'with coin betting, streaks and a full progression loop.',
      platforms: ['HTML5', 'Mobile', 'Web'],
      logo:  'assets/img/games/uno-clash-logo.png',
      thumb: 'assets/img/games/uno-clash-poster.jpg',
      shots: [
        { src: 'assets/img/games/uno-clash-menu.jpg',      alt: 'UNO Clash main menu' },
        { src: 'assets/img/games/uno-clash-landscape.jpg', alt: 'UNO Clash landscape gameplay' }
      ],
      video: {
        mp4:    'assets/video/uno-clash-gameplay.mp4',
        webm:   'assets/video/uno-clash-gameplay.webm',
        poster: 'assets/img/games/uno-clash-poster.jpg'
      },
      // Playable build, launched in-page. `weight` is shown while it loads.
      play: { src: 'games/uno-clash/', orientation: 'landscape', weight: '15 MB' },
      url: null,
      featured: true
    },
    {
      id: 'golf-solitaire',
      name: 'Golf Solitaire',
      tagline: 'Card Puzzle',
      description:
        'A polished take on Golf Solitaire with level progression, streak ' +
        'multipliers, daily challenges and unlockable card themes. Built for ' +
        'quick sessions and long-term retention.',
      platforms: ['HTML5', 'Mobile', 'Web'],
      logo:  'assets/img/games/golf-solitaire-logo.png',
      thumb: 'assets/img/games/golf-solitaire-poster.jpg',
      shots: [
        { src: 'assets/img/games/golf-solitaire-menu.jpg',   alt: 'Golf Solitaire main menu' },
        { src: 'assets/img/games/golf-solitaire-levels.jpg', alt: 'Golf Solitaire level select' }
      ],
      video: {
        mp4:    'assets/video/golf-solitaire-gameplay.mp4',
        webm:   'assets/video/golf-solitaire-gameplay.webm',
        poster: 'assets/img/games/golf-solitaire-poster.jpg'
      },
      play: { src: 'games/golf-solitaire/', orientation: 'portrait', weight: '4 MB' },
      url: null,
      featured: true
    },
    {
      id: 'cinemoji',
      name: 'Cinemoji',
      tagline: 'Emoji Puzzle',
      description:
        'Find the two matching emojis that spell out the clue before the ' +
        'timer and hearts run out. 100 puzzles across food, animals, plants ' +
        'and more, with hints and 50/50 lifelines along the way.',
      platforms: ['HTML5', 'Mobile', 'Web'],
      logo:  'assets/img/games/cinemoji-logo.png',
      thumb: 'assets/img/games/cinemoji-poster.jpg',
      shots: [
        { src: 'assets/img/games/cinemoji-menu.jpg',     alt: 'Cinemoji title screen' },
        { src: 'assets/img/games/cinemoji-chapters.jpg', alt: 'Cinemoji chapter select' }
      ],
      video: {
        mp4:    'assets/video/cinemoji-gameplay.mp4',
        webm:   'assets/video/cinemoji-gameplay.webm',
        poster: 'assets/img/games/cinemoji-poster.jpg'
      },
      play: { src: 'games/cinemoji/', orientation: 'portrait', weight: '18 MB' },
      url: null,
      featured: true
    },
    {
      id: 'dog-crush',
      name: 'Animal Café',
      tagline: 'Match-3 Puzzle',
      description:
        'A cosy match-3 where every level feeds a hungry customer. Swap ' +
        'ingredients to clear their order, chain combos into power-ups, and ' +
        'work through a growing menu of levels.',
      platforms: ['HTML5', 'Mobile', 'Web'],
      logo:  'assets/img/games/dog-crush-logo.png',
      thumb: 'assets/img/games/dog-crush-poster.jpg',
      shots: [
        { src: 'assets/img/games/dog-crush-menu.jpg', alt: 'Animal Café gameplay' }
      ],
      video: {
        mp4:    'assets/video/dog-crush-gameplay.mp4',
        webm:   'assets/video/dog-crush-gameplay.webm',
        poster: 'assets/img/games/dog-crush-poster.jpg'
      },
      play: { src: 'games/dog-crush/', orientation: 'portrait', weight: '25 MB' },
      url: null,
      featured: true
    }
  ],

  /* -------------------------------------------------------------- showcase */
  showcase: {
    heading: 'See our games in action',
    subheading: 'Watch our gameplay and explore the experiences we\'ve created.',
    // Which game's footage leads the section (matches a `games[].id`)
    featuredGameId: 'uno-clash'
  },

  /* -------------------------------------------------------------- services */
  services: [
    { icon: 'gamepad', title: 'Game Development',
      text: 'We build engaging and scalable games with smooth gameplay and polished experiences.' },
    { icon: 'html5',   title: 'HTML5 Game Development',
      text: 'Fast, responsive browser-based games designed for web platforms.' },
    { icon: 'mobile',  title: 'Mobile Game Development',
      text: 'Mobile gaming experiences optimized for performance and usability.' },
    { icon: 'design',  title: 'UI/UX Design',
      text: 'Clean, intuitive interfaces designed around player experience.' },
    { icon: 'brush',   title: 'Game Art & Animation',
      text: 'Creative visuals, animations, and game assets that bring games to life.' },
    { icon: 'web',     title: 'Web Development',
      text: 'Modern, responsive websites and digital experiences.' }
  ],

  /* --------------------------------------------------------------- process */
  process: [
    { step: '01', title: 'Idea',        text: 'Turn concepts into clear product ideas.' },
    { step: '02', title: 'Design',      text: 'Create the visual experience and user flow.' },
    { step: '03', title: 'Development', text: 'Build the game or digital product.' },
    { step: '04', title: 'Testing',     text: 'Test performance, usability, and gameplay.' },
    { step: '05', title: 'Launch',      text: 'Prepare and release the final product.' }
  ],

  /* ------------------------------------------------------------------- why */
  why: {
    heading: 'Built with creativity. Powered by technology.',
    features: [
      { icon: 'spark',  title: 'Creative & Original Ideas', text: 'Concepts built from scratch, not reskinned templates.' },
      { icon: 'chip',   title: 'Modern Technology',         text: 'Current engines and tooling, chosen to fit the product.' },
      { icon: 'wave',   title: 'Smooth User Experience',    text: 'Responsive controls and interfaces that stay out of the way.' },
      { icon: 'shield', title: 'Reliable Development',      text: 'Tested, documented and delivered on an agreed schedule.' }
    ]
  },

  /* ----------------------------------------------------------------- stats */
  /* ⚠️ TODO — PLACEHOLDER VALUES. No real company statistics were provided.
     Replace these with accurate figures, or set `show: false` to hide the
     section entirely.                                                        */
  stats: {
    show: true,
    items: [
      { value: '10+',      label: 'Projects' },
      { value: '5+',       label: 'Games' },
      { value: 'Multiple', label: 'Platforms' },
      { value: '100%',     label: 'Passion' }
    ]
  },

  /* ------------------------------------------------------------------- cta */
  cta: {
    heading: 'Have an idea? Let\'s build it together.',
    text:
      'Whether you have a game idea, a digital product, or a new project in ' +
      'mind, we\'d love to hear from you.',
    button: { label: 'Start a Conversation', href: '#contact' }
  },

  /* --------------------------------------------------------------- contact */
  /* ⚠️ TODO — PLACEHOLDERS. Real contact details were not provided.          */
  contact: {
    heading: 'Let\'s talk',
    text: 'Tell us about your project and we\'ll get back to you.',
    email:    'mispahinteractives@gmail.com',
    phone:    '+00 000 000 0000',           // TODO: real phone
    location: 'City, Country',              // TODO: real location
    // Where the form submits. Leave null for the built-in mailto fallback,
    // or set to a form endpoint (Formspree, your own PHP handler, etc.)
    formEndpoint: null
  },

  /* ---------------------------------------------------------------- social */
  /* ⚠️ TODO — replace '#' with real profile URLs, or delete unused entries.  */
  social: [
    { name: 'LinkedIn',  icon: 'linkedin',  url: '#' },
    { name: 'X',         icon: 'x',         url: '#' },
    { name: 'Instagram', icon: 'instagram', url: '#' },
    { name: 'YouTube',   icon: 'youtube',   url: '#' }
  ],

  /* ---------------------------------------------------------------- footer */
  footer: {
    blurb:
      'A game development and software technology studio building games, ' +
      'playable experiences and digital products.',
    columns: [
      {
        title: 'Quick Links',
        links: [
          { label: 'Home',      href: '#home' },
          { label: 'About',     href: '#about' },
          { label: 'Services',  href: '#services' },
                { label: 'Contact',   href: '#contact' }
        ]
      },
      {
        title: 'Games',
        // Auto-filled from `games` at runtime when left empty
        links: []
      }
    ],
    legal: [
      { label: 'Privacy Policy',     href: '#privacy' },
      { label: 'Terms & Conditions', href: '#terms' }
    ]
  }
};
