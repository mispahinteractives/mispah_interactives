// The intro: the front of the café with the Animal Café sign hung over the
// door and a PLAY button on the floor in front of it. It is the first thing up
// once the loading screen has faded, and nothing is played until PLAY is
// tapped - the opening level is brought up under it as it fades away.
//
// The background is 1240x1920 around a 1080 wide design area, so it is drawn
// at half size and cover-fitted, and whatever of the extra width a wide screen
// has room for is shown rather than letterboxed.

// Where the sign and the button sit, in game units. Landscape has barely more
// height than the sign itself, so both are drawn smaller and pulled closer.
const PORTRAIT = {
    titleWidth: 475, // the art has transparent margin; this reads ~435 wide
    titleY: 318,     // over the door, under the awning
    buttonWidth: 360,
    buttonY: 770,    // on the floorboards
};

const LANDSCAPE = {
    titleWidth: 380,
    titleY: 200,
    buttonWidth: 290,
    buttonY: 440,
};

const TITLE_IN_DELAY = 250;
const BUTTON_IN_DELAY = 650;
const FADE_TIME = 420;

// The sign breathes and the button pulses while the intro waits - enough that
// the screen is never quite still, and the button reads as the thing to press.
const TITLE_BREATH = 1.03;
const TITLE_BREATH_TIME = 1400;
const BUTTON_PULSE = 1.06;
const BUTTON_PULSE_TIME = 700;

export class Intro extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.init();
    }

    init() {

        this.bg = this.scene.add.image(0, 0, "homeBg").setOrigin(.5);

        // Swallows taps, so nothing laid out under the intro hears them.
        this.bg.setInteractive();
        this.add(this.bg);

        // Each piece is fitted to its size through its group, which leaves the
        // piece's own scale free to breathe and press around 1.
        this.titleGrp = this.scene.add.container(0, 0);
        this.add(this.titleGrp);

        this.title = this.scene.add.image(0, 0, "titleAnimalCafe").setOrigin(.5);
        this.titleGrp.add(this.title);

        this.buttonGrp = this.scene.add.container(0, 0);
        this.add(this.buttonGrp);

        this.button = this.scene.add.image(0, 0, "btnPlayHome").setOrigin(.5);
        this.button.setInteractive({ useHandCursor: true });
        this.button.on('pointerup', () => this.play());
        this.buttonGrp.add(this.button);

        this.visible = false;
    }

    adjust() {

        const layout = dimensions.isLandscape ? LANDSCAPE : PORTRAIT;

        const cover = Math.max(dimensions.actualWidth / this.bg.width, dimensions.actualHeight / this.bg.height);
        this.bg.setScale(cover);
        this.bg.x = dimensions.gameWidth / 2;
        this.bg.y = dimensions.gameHeight / 2;

        this.titleGrp.setScale(layout.titleWidth / this.title.width);
        this.titleGrp.x = dimensions.gameWidth / 2;
        this.titleGrp.y = layout.titleY;

        this.buttonGrp.setScale(layout.buttonWidth / this.button.width);
        this.buttonGrp.x = dimensions.gameWidth / 2;
        this.buttonGrp.y = layout.buttonY;
    }

    /**
     * Puts the intro up.
     * @param {function} onPlay run the moment PLAY is pressed, while the intro
     *   is still fading - this is where the opening level is built under it
     */
    show(onPlay) {

        this.onPlay = onPlay;
        this.playing = false;
        this.visible = true;
        this.setAlpha(1);
        this.adjust();

        this.killTweens();

        this.title.setScale(.6);
        this.title.setAlpha(0);

        this.scene.tweens.add({
            targets: this.title,
            scale: 1,
            alpha: 1,
            delay: TITLE_IN_DELAY,
            duration: 520,
            ease: "Back.easeOut",
            onComplete: () => {

                this.scene.tweens.add({
                    targets: this.title,
                    scale: TITLE_BREATH,
                    duration: TITLE_BREATH_TIME,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut",
                });
            },
        });

        this.button.setScale(.5);
        this.button.setAlpha(0);

        this.scene.tweens.add({
            targets: this.button,
            scale: 1,
            alpha: 1,
            delay: BUTTON_IN_DELAY,
            duration: 400,
            ease: "Back.easeOut",
            onComplete: () => {

                this.scene.tweens.add({
                    targets: this.button,
                    scale: BUTTON_PULSE,
                    duration: BUTTON_PULSE_TIME,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut",
                });
            },
        });
    }

    /**
     * PLAY was pressed: the button gives under the finger, the level is set
     * going, and the intro dissolves off the top of it.
     */
    play() {

        if (!this.visible || this.playing) return;
        this.playing = true;

        this.killTweens();

        this.scene.tweens.chain({
            targets: this.button,
            tweens: [
                { scale: .9, duration: 70, ease: "Quad.easeOut" },
                { scale: 1, duration: 200, ease: "Back.easeOut", easeParams: [2.2] },
            ],
            onComplete: () => {

                if (this.onPlay) this.onPlay();

                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    duration: FADE_TIME,
                    ease: "Sine.easeInOut",
                    onComplete: () => this.hide(),
                });
            },
        });
    }

    hide() {

        this.visible = false;
        this.killTweens();
    }

    killTweens() {

        this.scene.tweens.killTweensOf([this, this.title, this.button]);
    }
}
