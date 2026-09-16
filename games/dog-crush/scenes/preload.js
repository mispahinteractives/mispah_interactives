import soundsData from "../data/sounds-data.js";
import animationData from "../data/animation-data.js";

export default class Preload extends Phaser.Scene {

    width = null
    height = null
    handlerScene = null
    sceneStopped = false

    // The screen is a single blue field with a soft glow behind the logo: deep
    // at the edges, bright in the middle. The fade at the end hands the edge
    // colour to the game scene, so the two screens meet on it rather than
    // through a flash of anything else.
    static SCREEN = { r: 10, g: 98, b: 200 }   // the blue at the edges
    static SCREEN_CSS = '#0a62c8'
    static GLOW = { r: 58, g: 167, b: 239 }    // the lighter blue behind the logo
    static GLOW_RADIUS = 0.62 // how far across the screen the glow reaches

    // The silhouettes are the one texture on the field - the same blue, a shade
    // lighter, so the screen reads as quiet pattern rather than as a picture.
    static SILHOUETTE_CSS = '#cfeaff'

    // The wallpaper: the whole cast - goodies and characters both - stamped out
    // as flat silhouettes, tone on tone.
    static PATTERN_FRAMES = ['Donut', 'Cat', 'Cupcake', 'Pig', 'Burger', 'Dog', 'Popcorn', 'Bread']
    static PATTERN_COLUMNS = 5
    static PATTERN_ALPHA = [.16, .10] // alternating rows, for a little depth

    // The wallpaper breathes rather than sits still: every icon rocks a few
    // degrees either side of the tilt it was stamped at and swells a little as
    // it goes. The offset is seeded off the icon's place in the grid, so
    // neighbours are always out of step and the screen never pulses as one.
    // The whole grid has to be seen moving inside the second or so a fast load
    // leaves it, so the breath is short and the stagger only spreads the start
    // across a few hundred milliseconds - a longer offset just means most icons
    // never move at all on a quick load.
    static PATTERN_SWAY = 7        // degrees either side of the stamped tilt
    static PATTERN_SWELL = .1      // how much bigger an icon gets at the top of it
    static PATTERN_BREATH = 1500   // one full rock, there and back
    static PATTERN_STAGGER = 70    // how far apart neighbouring icons are set off
    static PATTERN_SPREAD = 420    // the longest an icon may be held before starting

    // The logo sits at the middle of the glow and is the thing the screen is
    // built around. It is optional: the boot lets it fail, and the rest of the
    // screen lays itself out without it if the file is not there.
    static LOGO_WIDTH = 420           // how wide it is drawn at full size
    static LOGO_SCREEN_FRACTION = 0.5 // most of the screen width it may take
    static LOGO_BREATH = 2400         // one full swell of the logo, there and back
    static LOGO_SWELL = .04

    // The bar is the same artwork the level screen uses - the atlas frames, not
    // a drawn capsule - so the two loading screens read as one thing.
    static BAR_LENGTH = 520 // how far the capsule runs across the screen
    static BAR_SCREEN_FRACTION = 0.55 // most of the screen width it may ever take
    // The track art is a warm empty capsule, which reads as a brown blob on a
    // blue screen. It is tinted down to a darker shade of the field so it reads
    // as a slot cut into the screen, and the fill keeps its own colour so the
    // one warm thing on the screen is the progress itself.
    static BAR_TRACK_CSS = '#0a4b96'

    // How the logo, the caption and the bar are stacked, measured from the
    // middle of the block, before the whole stack is scaled to the screen.
    static STACK_CAPTION_GAP = 44 // between the bottom of the logo and the caption
    static STACK_BAR_GAP = 46     // between the caption and the bar

    // The café UI pack, texture key to file under assets/ui. Only what the game
    // draws is queued - the rest of the pack is in the folder, not loaded.
    static UI_IMAGES = {
        homeBg: 'backgrounds/home-1240x1920',
        titleAnimalCafe: 'titles/animal-cafe',
        btnPlayHome: 'buttons/play-approved-home',
        popupPanel: 'panels/popup-cafe-panel',
        titleLevelComplete: 'titles/level-complete',
        titleLevelFailed: 'titles/level-failed',
        starEarned: 'icons/star-earned',
        starUnearned: 'icons/star-unearned',
        iconLock: 'icons/lock',
        btnRetry: 'buttons/retry',
        btnHome: 'buttons/home-icon',
        tileCompleted: 'tiles/completed',
        tileCurrent: 'tiles/current',
        tileLocked: 'tiles/locked',
    }

    static RAMP_TIME = 1100  // the fastest the bar may cross, empty to full
    static FINISH_TIME = 420 // walking the bar the rest of the way to full
    static HOLD_TIME = 420   // how long a full bar is left up before handing over
    static FADE_TIME = 320   // the loading screen dissolving into the level screen

    constructor() {
        super({ key: 'preload' })
    }

    preload() {

        this.handlerScene = this.scene.get('handler');
        this.handlerScene.sceneRunning = 'preload';

        this.queueAssets();

        this.canvasWidth = this.sys.game.canvas.width;
        this.canvasHeight = this.sys.game.canvas.height;

        this.width = this.game.screenBaseSize.width;
        this.height = this.game.screenBaseSize.height;

        this.screenWidth = this.canvasWidth;
        this.screenHeight = this.canvasHeight;

        this.cameras.main.setBackgroundColor(Preload.SCREEN_CSS);

        this.paintBackground();
        this.makeStamps();

        this.patternGrp = this.add.container(0, 0);
        this.layoutPattern();

        // Everything is authored around (0,0) inside stackGrp, which update()
        // centres on the screen, so it holds together in both orientations.
        this.stackGrp = this.add.container(0, 0);

        this.buildLogo();
        this.buildBar();
        this.buildLoadingText();
        this.layoutStack();

        // The bar always starts empty and is walked up to whatever has actually
        // loaded, rather than being snapped to it. Files that come in all at
        // once would otherwise leave nothing to see but a full bar.
        this.progress = 0;
        this.target = 0;
        this.finishing = false;

        this.setProgress(0);
        this.elapsed = 0;

        this.load.on('progress', (value) => {
            this.target = value;
        })

        this.load.on('complete', () => {

            this.createSounds();

            // However fast the files came in, the bar is always walked the rest
            // of the way and left sitting at full - the screen reads as having
            // finished loading rather than as having been cut off mid way.
            if (this.finishing) return;

            this.target = 1;
            this.finishing = true;
            this.finishFrom = this.progress;
            this.finishElapsed = 0;
            // However little was left, the last stretch is still walked at the
            // bar's own pace - a load that finished at once still fills.
            this.finishTime = Math.max(Preload.FINISH_TIME, (1 - this.progress) * Preload.RAMP_TIME);
        })

        // Everything on this screen is driven from the game's own step rather
        // than from the scene's update and tween manager. A scene that is still
        // loading is not stepped by Phaser at all - its update never runs and
        // its tweens never advance - which is precisely the whole life of a
        // loading screen. The game step keeps running throughout, so the sway,
        // the bar and the layout are all worked out from it by hand.
        this.game.events.on(Phaser.Core.Events.PRE_STEP, this.step, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(Phaser.Core.Events.PRE_STEP, this.step, this);
        });

        this.step(0, 0);
    }

    /**
     * Everything the game runs on. It is queued here rather than in the boot so
     * that it is loading while this screen is up and its progress is what the
     * bar is actually showing.
     */
    queueAssets() {

        this.load.image('background', 'assets/background.png');
        this.load.image('silverTable', 'assets/silverTable.png');
        this.load.image('uiPanel', 'assets/uiPanel.png');
        this.load.image('woodTable', 'assets/woodTable.png');

        // The café UI pack - the end-of-level popup and the level map are drawn
        // from these. Loose images rather than atlas frames: they are big, there
        // are few of them, and each is only ever drawn on its own screen.
        for (const key in Preload.UI_IMAGES) {
            this.load.image(key, 'assets/ui/' + Preload.UI_IMAGES[key] + '.png');
        }

        // The ice a cell can be frozen under, whole and cracked. Keyed by the
        // names the board reads its ice layers off.
        this.load.image('ice_solid', 'assets/blockers/ice/intact.png');
        this.load.image('ice_cracked', 'assets/blockers/ice/cracked.png');

        // The pizza blocker: the box it stands in, and the pizza a slice at a
        // time. The whole one is keyed "Pizza" because it is also the goal an
        // order at the counter asks for.
        this.load.image('pizza_box', 'assets/blockers/pizza/box.png');
        this.load.image('Pizza', 'assets/blockers/pizza/04-whole.png');
        this.load.image('pizza_3', 'assets/blockers/pizza/03-three-slices.png');
        this.load.image('pizza_2', 'assets/blockers/pizza/02-two-slices.png');
        this.load.image('pizza_1', 'assets/blockers/pizza/01-one-slice.png');

        this.load.setPath('assets/spine');

        // The bomb that goes off when a TNT charge is set off. The skeleton was
        // authored in Spine 3.2 and the bundled runtime is 3.8, so the file has
        // been converted to the 3.8 JSON format - the 3.2 original is kept
        // alongside it as bomb_explosion.spine32.json. Every attachment in it is
        // a plain region, which is what lets it render under the canvas renderer
        // this game runs on.
        //
        // It is stamped 3.8.99, the version the 3.8 exporter writes. Not 3.8.75:
        // that is the runtime's own version, but it was a beta whose format the
        // runtime refuses outright - it throws "Unsupported skeleton data" on
        // that exact string.
        this.load.spine('bomb_explosion', 'bomb_explosion.json', ['spine_sheet.atlas'], true);

        this.load.setPath('assets/sounds');

        for (let i = 0; i < soundsData.music.length; i++) {
            this.load.audio(soundsData.music[i], soundsData.music[i] + ".mp3");
        }

        for (let i = 0; i < soundsData.sounds.length; i++) {
            this.load.audio(soundsData.sounds[i], soundsData.sounds[i] + ".mp3");
        }

        for (let i = 0; i < soundsData.fx.length; i++) {
            this.load.audio(soundsData.fx[i], soundsData.fx[i] + ".mp3");
        }

        this.load.setPath('assets/sheet/');

        for (let i = 0; i < animationData.atlas.length; i++) {
            this.load.atlas(animationData.atlas[i].name, animationData.atlas[i].name + '.png', animationData.atlas[i].name + '.json');
        }

        for (let i = 0; i < animationData.fxAtlas.length; i++) {
            this.load.atlas(animationData.fxAtlas[i], animationData.fxAtlas[i] + '.png', animationData.fxAtlas[i] + '.json');
        }

        this.load.setPath();
    }

    createSounds() {

        for (let i = 0; i < soundsData.music.length; i++) {
            soundsData[soundsData.music[i]] = this.sound.add(soundsData.music[i]);
        }

        for (let i = 0; i < soundsData.sounds.length; i++) {
            soundsData[soundsData.sounds[i]] = this.sound.add(soundsData.sounds[i]);
        }
    }

    /**
     * Hands over to the game. The blue screen is faded out and the game scene is
     * brought up fading in from the same blue, so the loader dissolves into the
     * level screen instead of being cut away from it.
     */
    startGame() {

        const c = Preload.SCREEN;
        this.cameras.main.fadeOut(Preload.FADE_TIME, c.r, c.g, c.b);

        this.cameras.main.once('camerafadeoutcomplete', () => {

            this.scene.stop('preload');
            this.scene.launch('GameScene');
        });
    }

    /**
     * The blue field itself: the deep edge colour with the lighter glow washed
     * into the middle of it. It is painted into a canvas texture rather than
     * built out of Graphics because a radial gradient is the one thing Phaser's
     * shape API cannot draw. Repainted whenever the screen changes shape.
     */
    paintBackground() {

        const w = Math.max(1, Math.ceil(this.screenWidth));
        const h = Math.max(1, Math.ceil(this.screenHeight));

        // A canvas texture cannot be resized in place across every renderer, so
        // a change of shape is a new texture rather than a repaint of the old.
        // The image goes before the texture it is drawn from does.
        if (this.bg) {
            this.bg.destroy();
            this.bg = null;
        }

        if (this.bgTexture) this.textures.remove('preload-bg');

        this.bgTexture = this.textures.createCanvas('preload-bg', w, h);

        const ctx = this.bgTexture.getContext();
        const edge = Preload.SCREEN;
        const glow = Preload.GLOW;

        ctx.fillStyle = `rgb(${edge.r},${edge.g},${edge.b})`;
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.max(w, h) * Preload.GLOW_RADIUS;

        const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        wash.addColorStop(0, `rgba(${glow.r},${glow.g},${glow.b},1)`);
        wash.addColorStop(.55, `rgba(${glow.r},${glow.g},${glow.b},.35)`);
        wash.addColorStop(1, `rgba(${glow.r},${glow.g},${glow.b},0)`);

        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);

        this.bgTexture.refresh();

        this.bg = this.add.image(0, 0, 'preload-bg').setOrigin(0);
        // Painted before anything else exists on a first run, but a repaint puts
        // a brand new image on top of the stack - so it is pushed back under.
        this.children.sendToBack(this.bg);

        this.bgWidth = this.screenWidth;
        this.bgHeight = this.screenHeight;
    }

    static silhouetteKey(frame) {
        return 'preload-sil-' + frame;
    }

    /**
     * Stamps one atlas frame out as a flat shape in a single colour, under a
     * texture key of its own. This is how every recoloured thing on the screen
     * is made, rather than by tinting: the game runs on the canvas renderer,
     * which ignores tint outright - and even where tint works it only shades
     * the artwork's own colours, when the shading is exactly what has to go.
     */
    stampFrame(atlas, name, css, key) {

        if (this.textures.exists(key)) return;

        const frame = this.textures.getFrame(atlas, name);
        const w = frame.cutWidth;
        const h = frame.cutHeight;

        const texture = this.textures.createCanvas(key, w, h);
        const ctx = texture.getContext();

        ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);

        // Paint only where the artwork already is - the flood takes its shape
        // from the alpha that is on the canvas.
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        texture.refresh();
    }

    /**
     * The wallpaper's frames as flat stamps of their own outlines, plus the
     * bar's empty track. The track art is a warm capsule, which reads as a brown
     * blob on a blue screen, so it is stamped out in a darker shade of the field
     * and reads as a slot cut into it - the fill keeps its own colour, so the
     * one warm thing on the screen is the progress itself.
     */
    makeStamps() {

        for (const name of Preload.PATTERN_FRAMES) {
            this.stampFrame('sheet', name, Preload.SILHOUETTE_CSS, Preload.silhouetteKey(name));
        }

        this.stampFrame('sheet', 'progress bar', Preload.BAR_TRACK_CSS, 'preload-bar-track');
    }

    /**
     * Stamps the silhouette grid out over the whole screen. Every other row is
     * pushed half a cell across, which is what keeps the repeat from reading as
     * columns. Rebuilt whenever the screen changes shape - the cell is sized off
     * the width, so a rotation is a different grid, not the same one stretched.
     */
    layoutPattern() {

        this.patternGrp.removeAll(true);

        this.patternWidth = this.screenWidth;
        this.patternHeight = this.screenHeight;

        const cell = this.screenWidth / Preload.PATTERN_COLUMNS;
        const iconHeight = cell * .56;
        const rows = Math.ceil(this.screenHeight / cell) + 1;
        const frames = Preload.PATTERN_FRAMES;

        for (let row = 0; row < rows; row++) {

            const odd = row % 2 === 1;
            const alpha = Preload.PATTERN_ALPHA[row % Preload.PATTERN_ALPHA.length];

            // The half-cell shift pushes the last icon off the right edge, so
            // odd rows get one more to keep the pattern running to both sides.
            const columns = Preload.PATTERN_COLUMNS + (odd ? 1 : 0);

            for (let col = 0; col < columns; col++) {

                const frame = frames[(row * 2 + col) % frames.length];
                const icon = this.add.image(0, 0, Preload.silhouetteKey(frame));

                icon.setOrigin(.5);
                // Every frame is a different size in the atlas, so they are all
                // normalised to one on-screen height.
                icon.setScale(iconHeight / icon.height);
                icon.setAlpha(alpha);

                // A little tilt each way, alternating, so the grid feels stamped
                // by hand rather than laid out by a machine.
                icon.setAngle((col + row) % 2 === 0 ? -8 : 8);

                // Odd rows start half a cell to the left, so the icons at both
                // ends run off the edge the way a wallpaper repeat should.
                icon.x = col * cell + cell / 2 - (odd ? cell / 2 : 0);
                icon.y = row * cell + cell / 2;

                this.patternGrp.add(icon);

                // What breathe() rocks the icon around, and how long it is held
                // before it sets off - seeded off its place in the grid, so
                // neighbours are always out of step with each other.
                icon.baseScale = icon.scaleX;
                icon.baseAngle = icon.angle;
                icon.breathDelay = ((row * 3 + col) * Preload.PATTERN_STAGGER) % Preload.PATTERN_SPREAD;
            }
        }
    }

    /**
     * The mark at the middle of the glow. The boot loads it as an optional file,
     * so it may simply not be there - in which case the screen is the caption
     * and the bar, and the stack closes up around the gap.
     */
    buildLogo() {

        if (!this.textures.exists('logo')) return;

        this.logo = this.add.image(0, 0, 'logo').setOrigin(.5);
        this.logo.setScale(Preload.LOGO_WIDTH / this.logo.width);
        this.stackGrp.add(this.logo);

        // It breathes on the same slow beat the wallpaper does, only gentler -
        // enough that the screen is never quite still while a load drags on.
        this.logoBaseScale = this.logo.scaleX;
    }

    buildBar() {

        const scale = Preload.BAR_LENGTH / 225; // the track art is 225 across

        this.track = this.add.image(0, 0, 'preload-bar-track');
        this.track.setOrigin(.5);
        this.track.setScale(scale);
        this.stackGrp.add(this.track);

        this.fill = this.add.sprite(0, 0, 'sheet', 'progress');
        this.fill.setOrigin(0, .5);
        this.fill.setScale(scale);

        // The fill art is narrower than the track art, so sit it inside by half
        // of that difference to keep the capsule ends even.
        this.fillTextureWidth = this.fill.width;
        this.fillInset = (-this.track.width / 2 + (this.track.width - this.fill.width) / 2) * scale;
        this.fill.x = this.fillInset;
        this.stackGrp.add(this.fill);

        this.setProgress(0);
    }

    /**
     * The caption, set the way the reference has it: white, in the game's own
     * face, cut out of the blue with a darker outline and a soft shadow under
     * it, so it stays legible wherever the glow happens to sit behind it.
     */
    buildLoadingText() {

        this.loadingText = this.add.text(0, 0, "LOADING", {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 58,
            fill: '#ffffff',
            align: "center",
            stroke: '#1668c4',
            strokeThickness: 9,
        }).setOrigin(0.5);

        this.loadingText.setShadow(0, 5, 'rgba(8,58,120,.55)', 6, true, true);
        this.stackGrp.add(this.loadingText);
    }

    /**
     * Stacks the logo, the caption and the bar down the middle of the block and
     * centres the whole thing on its own height, so the stack stays centred on
     * the screen whether or not there is a logo in it.
     */
    layoutStack() {

        const logoHeight = this.logo ? this.logo.displayHeight : 0;
        const captionHeight = this.loadingText.height;
        const barHeight = this.track.displayHeight;

        const gapToCaption = this.logo ? Preload.STACK_CAPTION_GAP : 0;

        const total = logoHeight + gapToCaption + captionHeight + Preload.STACK_BAR_GAP + barHeight;
        let y = -total / 2;

        if (this.logo) {
            this.logo.y = y + logoHeight / 2;
            y += logoHeight + gapToCaption;
        }

        this.loadingText.y = y + captionHeight / 2;
        y += captionHeight + Preload.STACK_BAR_GAP;

        const barY = y + barHeight / 2;
        this.track.y = barY;
        this.fill.y = barY;
    }

    setProgress(value) {

        value = Phaser.Math.Clamp(value, 0, 1);
        this.progress = value;

        // Cropped in texture space so the fill reaches the true end of the bar.
        this.fill.setCrop(0, 0, this.fillTextureWidth * value, this.fill.height);
        this.fill.setVisible(value > 0.001);
    }

    /**
     * One frame of the loading screen: the bar walked on, the wallpaper and the
     * logo breathed, and the whole thing laid out against the screen as it is
     * right now. Called from the game step, so it runs while the scene is still
     * loading - see where it is hooked up in preload().
     */
    step(time, delta) {

        this.elapsed += delta;

        if (this.finishing) {

            // The last stretch to full, eased off at the end so the bar settles
            // into the cap rather than slamming into it.
            this.finishElapsed += delta;

            const t = Phaser.Math.Clamp(this.finishElapsed / this.finishTime, 0, 1);
            const eased = Phaser.Math.Easing.Sine.Out(t);

            this.setProgress(this.finishFrom + (1 - this.finishFrom) * eased);

            if (t >= 1 && !this.done) {

                this.done = true;

                // The caption stops saying it is working and says it is done -
                // the bar being full is the point.
                this.loadingText.setText("READY!");
                this.layoutStack();

                this.holdLeft = Preload.HOLD_TIME;
            }

            // A full bar is left up for a beat before the screen hands over.
            if (this.done && !this.handingOver) {

                this.holdLeft -= delta;

                if (this.holdLeft <= 0) {
                    this.handingOver = true;
                    this.startGame();
                }
            }

        } else if (this.progress < this.target) {

            // Climb towards what has loaded, never faster than RAMP_TIME end to
            // end, so the fill is always seen crossing rather than appearing.
            this.setProgress(Math.min(this.target, this.progress + delta / Preload.RAMP_TIME));
        }

        this.screenWidth = this.sys.game.canvas.width;
        this.screenHeight = this.sys.game.canvas.height;

        if (this.screenWidth !== this.bgWidth || this.screenHeight !== this.bgHeight) {
            this.paintBackground();
        }

        if (this.patternGrp && (this.screenWidth !== this.patternWidth || this.screenHeight !== this.patternHeight)) {
            this.layoutPattern();
        }

        this.breathe();
        this.placeStack();
    }

    /**
     * The wallpaper and the logo rocking on their own beats. Worked out from the
     * clock rather than tweened, for the reason given in preload().
     */
    breathe() {

        const icons = this.patternGrp ? this.patternGrp.list : [];

        for (let i = 0; i < icons.length; i++) {

            const icon = icons[i];

            // Held for a beat before setting off, so neighbours are out of step
            // with each other - see PATTERN_SPREAD for why the hold is short.
            const t = Math.max(0, this.elapsed - icon.breathDelay);
            const wave = Math.sin(t / Preload.PATTERN_BREATH * Math.PI * 2);

            icon.setAngle(icon.baseAngle + wave * Preload.PATTERN_SWAY);
            // The swell runs on the same wave, but only ever outwards, so the
            // icon never shrinks below the size it was stamped at.
            icon.setScale(icon.baseScale * (1 + Preload.PATTERN_SWELL * (wave + 1) / 2));
        }

        if (this.logo) {

            const wave = Math.sin(this.elapsed / Preload.LOGO_BREATH * Math.PI * 2);
            this.logo.setScale(this.logoBaseScale * (1 + Preload.LOGO_SWELL * (wave + 1) / 2));
        }
    }

    /**
     * Sizes the block and drops it on the middle of the screen. The bar is what
     * the stack is sized off: never wider than BAR_LENGTH, and never more than a
     * set share of the screen - so it stays a small bar on a phone as well as on
     * a desktop. The logo is held to its own share of the width on top of that,
     * so a tall thin screen never lets it run to the edges.
     */
    placeStack() {

        if (!this.stackGrp) return;

        const barWidth = Math.min(Preload.BAR_LENGTH, this.screenWidth * Preload.BAR_SCREEN_FRACTION);
        let scale = barWidth / Preload.BAR_LENGTH;

        if (this.logo) {

            const logoLimit = this.screenWidth * Preload.LOGO_SCREEN_FRACTION;
            scale = Math.min(scale, logoLimit / Preload.LOGO_WIDTH);
        }

        this.stackGrp.setScale(scale);
        this.stackGrp.x = this.screenWidth / 2;
        this.stackGrp.y = this.screenHeight / 2;
    }
}
