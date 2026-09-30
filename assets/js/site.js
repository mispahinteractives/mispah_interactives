/* ==========================================================================
   MIZPAH INTERACTIVES — world content
   --------------------------------------------------------------------------
   The website is a road trip through six stops. Edit the copy for each stop
   here; the page builds the stops from this file.
   ========================================================================== */
window.GV_SITE = {
  email: 'mispahinteractives@gmail.com',

  // the stops, in driving order; `id` is the section id on the page. The
  // same stops stand on Main Street in the game (Services, Clients, Demos and
  // Contact are buildings you can drive into); `blurb` is what the in-game
  // stop panel says.
  stops: [
    { id: 'stage',    no: '01', name: 'Start',    place: 'Main Street',       color: '#ffc83d', icon: 'flag',
      blurb: 'Pick a ride and hit the road.' },
    { id: 'services', no: '02', name: 'Services', place: 'The Workshop',      color: '#37e2a0', icon: 'wrench',
      blurb: 'Everything we build, from full games to websites, under one roof.' },
    { id: 'games',    no: '03', name: 'Games',    place: 'Arcade Boulevard',  color: '#ff4f8b', icon: 'pad',
      blurb: 'Our own games. Every door on the boulevard is one of them.' },
    { id: 'clients',  no: '04', name: 'Clients',  place: 'Billboard Highway', color: '#5b8cff', icon: 'star',
      blurb: 'The partners we build with, up in lights along the highway.' },
    { id: 'demos',    no: '05', name: 'Demos',    place: 'The Test Track',    color: '#ff8a3d', icon: 'bolt',
      blurb: 'Tech demos from our own engine. Pick one and drive it.' },
    { id: 'contact',  no: '06', name: 'Contact',  place: 'Finish Line HQ',    color: '#b98cff', icon: 'mail',
      blurb: 'Last stop. Tell us what you want to build.' }
  ],

  // Stop 02: each service is a garage bay; the door rolls up to reveal it
  services: [
    { icon: 'pad',    title: 'Game Development',        text: 'We build engaging and scalable games with smooth gameplay and polished experiences.',
      tags: ['Concept', 'Gameplay', 'Live ops'] },
    { icon: 'html5',  title: 'HTML5 Game Development',  text: 'Fast, responsive browser-based games designed for web platforms.',
      tags: ['Phaser', 'Canvas', 'Playables'] },
    { icon: 'mobile', title: 'Mobile Game Development', text: 'Mobile gaming experiences optimized for performance and usability.',
      tags: ['iOS', 'Android', 'Touch-first'] },
    { icon: 'ui',     title: 'UI/UX Design',            text: 'Clean, intuitive interfaces designed around player experience.',
      tags: ['Menus', 'HUDs', 'Flows'] },
    { icon: 'brush',  title: 'Game Art & Animation',    text: 'Creative visuals, animations, and game assets that bring games to life.',
      tags: ['2D art', 'Spine', 'VFX'] },
    { icon: 'web',    title: 'Web Development',         text: 'Modern, responsive websites and digital experiences.',
      tags: ['Sites', 'Web apps', 'Interactive'] }
  ],
  // the build pipeline, shown as a road with five checkpoints
  process: [
    { step: '01', title: 'Idea',        text: 'Turn concepts into clear product ideas.' },
    { step: '02', title: 'Design',      text: 'Create the visual experience and user flow.' },
    { step: '03', title: 'Development', text: 'Build the game or digital product.' },
    { step: '04', title: 'Testing',     text: 'Test performance, usability, and gameplay.' },
    { step: '05', title: 'Launch',      text: 'Prepare and release the final product.' }
  ],

  // Stop 04: clients. Add real clients here and each becomes a billboard:
  //   { name: 'Client name', logo: 'assets/img/clients/logo.png', project: 'What we built', url: 'https://…' }
  // While this list is empty the stop shows "reserved" billboards instead of
  // inventing any names.
  clients: [],

  // Stop 05: each demo runs the real physics game in a particular setup.
  // `at` is a spot on Main Street: 'ramp' (the first stunt ramp), 'ghosts'
  // (the first haunted house) or a door/stop id such as 'services'.
  demos: [
    { icon: 'car',    title: 'Physics Test Drive', text: 'Our Matter.js suspension model: body squat, pitch and bounce over every bump.',
      run: { level: 1 }, tag: 'Physics' },
    { icon: 'ramp',   title: 'Stunt Ramp',         text: 'Hit the first ramp at speed: air control, landing shockwaves and sparks.',
      run: { at: 'ramp' }, tag: 'Air control' },
    { icon: 'moon',   title: 'Night Drive',        text: 'One-pass lighting: headlights, street lamps, glowing signs under a moonlit sky.',
      run: { level: 1, theme: 'night' }, tag: 'Lighting' },
    { icon: 'rain',   title: 'Storm Run',          text: 'Rain layers, splashes, tyre spray, a wet road and lightning with thunder.',
      run: { level: 4, theme: 'rain' }, tag: 'Weather' },
    { icon: 'ghost',  title: 'Ghost Alley',        text: 'Pixel-accurate collision against the ghosts guarding the haunted houses.',
      run: { at: 'ghosts' }, tag: 'Collision' },
    { icon: 'map',    title: 'Level Generator',    text: '20 courses generated from a seed, slope-limited and simulator-tested.',
      run: { levels: true }, tag: 'Procedural' }
  ]
};
