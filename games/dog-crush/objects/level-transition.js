// The screen that sits between one level and the next: two shutters that swing
// shut over the level just finished, a bar that fills while the new level is
// built behind it with the level being served written across it and a parade of
// goodies hopping along its top edge - then the shutters swing open again on
// the level about to start.
//
// The cloth itself is left plain. There is no wallpaper stamped into it and no
// card behind the bar, so the bar and the line on it are the only things the
// eye is given while it waits.

// The bar art out of the atlas is 225 wide; this is the width it is drawn at.
const BAR_SCALE = 560 / 225;

// What the group is authored around - the bar plus a margin - so the fit to a
// narrow screen only has to be worked out once.
const CONTENT_WIDTH = 600;

// Cartoon palette - the cloth the shutters are cut from.
const INK = 0x40261a;

// The bumps along the edge where the two shutters meet, so the seam reads as
// drawn cloth rather than as a straight cut.
const SCALLOP_R = 26;

const CLOSE_TIME = 480;   // the shutters swinging shut over the level that ended
const CARD_IN_TIME = 320; // the bar rising once the screen is covered
const FILL_TIME = 820;    // the bar crossing, which is what the wait reads as
const HOLD_TIME = 240;    // the full bar left up long enough to register
const CARD_OUT_TIME = 260;// the bar sinking away before the shutters part
const OPEN_TIME = 520;    // the shutters swinging open on the level about to start

// The phases are run into each other rather than end to end - the bar is
// already on its way up as the shutters close on it, and already on its way out
// as they part - so the whole thing reads as one move instead of five.
const OVERLAP = 110;

// How far the bar travels as it rises and sinks. Small, so it settles rather
// than lands.
const CARD_DRIFT = 46;

export class LevelTransition extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.progress = 0;
        this.letters = [];
        this.bouncers = [];
        this.closed = false;

        this.init();
    }

    init() {

        this.makeTextures();

        // The two shutters cover the whole visible screen in both orientations
        // once they have met, so nothing of the board being swapped out shows
        // between them.
        this.shutterTop = this.scene.add.graphics();
        this.shutterBottom = this.scene.add.graphics();
        this.add(this.shutterTop);
        this.add(this.shutterBottom);

        this.barGrp = this.scene.add.container(0, 0);
        this.add(this.barGrp);

        this.buildBar();
        this.buildTitle();
        this.buildBouncers();

        this.visible = false;
    }

    makeTextures() {

        if (this.scene.textures.exists('transitionChip')) return;

        const g = this.scene.make.graphics();

        // confetti chip
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(0, 0, 24, 15, 6);
        g.generateTexture('transitionChip', 24, 15);

        g.destroy();
    }

    buildBar() {

        // The bar is the piece the whole group is built around, so it is sat on
        // the group's own centre and everything else hung off it.
        this.barY = 0;

        this.track = this.scene.add.sprite(0, this.barY, 'sheet', 'progress bar');
        this.track.setOrigin(.5);
        this.track.setScale(BAR_SCALE);
        this.barGrp.add(this.track);

        this.barHeight = this.track.height * BAR_SCALE;

        this.fill = this.scene.add.sprite(0, this.barY, 'sheet', 'progress');
        this.fill.setOrigin(0, .5);
        this.fill.setScale(BAR_SCALE);

        // The fill art is narrower than the track art, so sit it inside by half
        // of that difference to keep the capsule ends even.
        this.fillTextureWidth = this.fill.width;
        this.fill.x = (-this.track.width / 2 + (this.track.width - this.fill.width) / 2) * BAR_SCALE;
        this.barGrp.add(this.fill);

        this.setProgress(0);
    }

    /**
     * The line across the bar. Built empty - the letters are made fresh every
     * time it is shown, since the text changes with the level.
     */
    buildTitle() {

        // Written across the middle of the bar itself, so it is read as one
        // piece with the fill running under it.
        this.titleY = this.barY;
        this.titleStyle = {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 44,
            fill: '#ffffff',
            fontStyle: 'bold',
            align: "left",
            stroke: '#40261a',
            strokeThickness: 10,
        };
    }

    /**
     * Lays the given line out letter by letter and sets each one hopping in
     * turn, so the word reads as a wave rather than a static caption.
     * @param {string} word
     */
    setTitle(word) {

        for (const letter of this.letters) {
            this.scene.tweens.killTweensOf(letter);
            letter.destroy();
        }
        this.letters = [];

        const style = this.titleStyle;
        let x = 0;

        for (let i = 0; i < word.length; i++) {

            const letter = this.scene.add.text(x, this.titleY, word[i], style).setOrigin(0, .5);
            this.letters.push(letter);
            x += letter.width - style.strokeThickness + 2;
        }

        const total = x - style.strokeThickness;

        // Centre the whole line on the bar, then keep each letter's home y.
        for (const letter of this.letters) {
            letter.x -= total / 2;
            letter.baseY = this.titleY;
            this.barGrp.add(letter);
        }

        this.letters.forEach((letter, i) => {

            this.scene.tweens.add({
                targets: letter,
                y: letter.baseY - 14,
                scaleX: 1.06,
                scaleY: 1.14,
                duration: 260,
                delay: i * 90,
                yoyo: true,
                repeat: -1,
                repeatDelay: word.length * 90 + 200,
                ease: 'Sine.easeOut',
            });
        });
    }

    // A parade of goodies hopping along the top edge of the bar.
    buildBouncers() {

        const frames = ['Donut', 'Burger', 'Cupcake', 'Cat', 'Pig'];
        const gap = 122;

        // They stand on the bar rather than near it - origin at their feet, on
        // the bar's own top edge.
        const groundY = this.barY - this.barHeight / 2 - 2;

        frames.forEach((frame, i) => {

            const x = (i - (frames.length - 1) / 2) * gap;
            const sprite = this.scene.add.sprite(x, groundY, 'sheet', frame);
            sprite.setOrigin(.5, 1);

            // Frames differ wildly in source size, so normalise every one of
            // them to the same on-screen height.
            sprite.setScale(104 / sprite.height);
            this.barGrp.add(sprite);
            this.bouncers.push(sprite);

            const s = sprite.scaleX;

            this.scene.tweens.add({
                targets: sprite,
                y: groundY - 40,
                scaleY: s * 1.1,
                scaleX: s * .93,
                duration: 400,
                delay: i * 120,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeOut',
            });

            this.scene.tweens.add({
                targets: sprite,
                angle: { from: -8, to: 8 },
                duration: 800,
                delay: i * 120,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    adjust() {

        this.drawShutters();

        // Shrink to fit narrow screens, never blow the art up past 1:1.
        this.cardScale = Math.min(1, (dimensions.gameWidth * .92) / CONTENT_WIDTH);

        // The bar is drifted up and down off this, so its home is kept rather
        // than read back off the group.
        this.cardHomeY = dimensions.gameHeight / 2;

        this.barGrp.setScale(this.cardScale);
        this.barGrp.x = dimensions.gameWidth / 2;
        this.barGrp.y = this.cardHomeY;
    }

    /**
     * Draws the two halves of the shutter, each one its own graphics so the two
     * can be moved apart. They are drawn about their meeting edge - the top one
     * hangs above its own origin, the bottom one below - so closing them is a
     * matter of walking both origins to the middle of the screen.
     */
    drawShutters() {

        const left = dimensions.leftOffset;
        const width = dimensions.actualWidth;

        this.screenTop = dimensions.topOffset;
        this.screenHeight = dimensions.actualHeight;
        this.screenMid = this.screenTop + this.screenHeight / 2;

        // Half the screen with room to spare, so an odd aspect never leaves a
        // gap at the far edge once a shutter is home.
        const h = this.screenHeight / 2 + SCALLOP_R + 40;

        this.shutterTop.clear();
        this.shutterTop.fillStyle(INK, 1);
        this.shutterTop.fillRect(left, -h, width, h);

        this.shutterBottom.clear();
        this.shutterBottom.fillStyle(INK, 1);
        this.shutterBottom.fillRect(left, 0, width, h);

        // The bumps along the seam. Drawn on both halves so the join reads the
        // same whichever way the shutters are travelling.
        const step = SCALLOP_R * 2;

        for (let x = left; x < left + width + step; x += step) {

            this.shutterTop.fillCircle(x + SCALLOP_R, 0, SCALLOP_R);
            this.shutterBottom.fillCircle(x + SCALLOP_R, 0, SCALLOP_R);
        }

        this.placeShutters(this.closed);
    }

    // Drops both halves straight to either end of their travel, with no tween -
    // used when the screen is resized mid-transition.
    placeShutters(closed) {

        const off = SCALLOP_R + 40;

        this.shutterTop.y = closed ? this.screenMid : this.screenTop - off;
        this.shutterBottom.y = closed ? this.screenMid : this.screenTop + this.screenHeight + off;
    }

    setProgress(value) {

        value = Phaser.Math.Clamp(value, 0, 1);
        this.progress = value;

        // Cropped in texture space so the fill reaches the true end of the bar.
        this.fill.setCrop(0, 0, this.fillTextureWidth * value, this.fill.height);
        this.fill.setVisible(value > 0.001);
    }

    /**
     * Closes the shutters over whatever is on screen, puts the bar up, and
     * opens them again once it has crossed.
     * @param {number} level the level about to be played
     * @param {function} onCover run with the screen covered - this is where the
     *   old level is torn down and the new one built, unseen
     * @param {function} onDone run once the shutters are open again
     */
    show(level, onCover, onDone) {

        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.killTweensOf(this.barGrp);
        this.scene.tweens.killTweensOf(this.shutterTop);
        this.scene.tweens.killTweensOf(this.shutterBottom);

        this.visible = true;
        this.setAlpha(1);

        this.adjust();
        this.setTitle("Level " + level);
        this.setProgress(0);

        // The bar waits out of sight until the screen is covered - it is not
        // meant to be seen over the level that is still being taken away.
        this.barGrp.setAlpha(0);

        // The bar is started just before the shutters have finished meeting.
        // The middle of the screen is covered by then, which is exactly where
        // the bar sits, so nothing of the old level shows behind it.
        this.showCard(CLOSE_TIME - OVERLAP);

        this.closeShutters(() => {

            if (onCover) onCover();
            this.fillBar(onDone);
        });
    }

    // The two halves running in to meet in the middle of the screen.
    closeShutters(onClosed) {

        this.closed = true;
        this.placeShutters(false);

        this.scene.tweens.add({
            targets: [this.shutterTop, this.shutterBottom],
            y: this.screenMid,
            duration: CLOSE_TIME,
            ease: 'Sine.easeInOut',
            onComplete: onClosed,
        });
    }

    // The two halves running back off either edge, on the new level.
    openShutters(onOpen) {

        const off = SCALLOP_R + 40;

        this.closed = false;

        this.scene.tweens.add({
            targets: this.shutterTop,
            y: this.screenTop - off,
            duration: OPEN_TIME,
            ease: 'Sine.easeInOut',
        });

        this.scene.tweens.add({
            targets: this.shutterBottom,
            y: this.screenTop + this.screenHeight + off,
            duration: OPEN_TIME,
            ease: 'Sine.easeInOut',
            onComplete: onOpen,
        });
    }

    /**
     * The bar rising out of the closed shutters. It drifts up as it fades, with
     * no snap at the end of either, so it arrives rather than lands.
     * @param {number} delay started before the shutters have quite met
     */
    showCard(delay = 0) {

        this.barGrp.y = this.cardHomeY + CARD_DRIFT;

        this.scene.tweens.add({
            targets: this.barGrp,
            alpha: 1,
            y: this.cardHomeY,
            duration: CARD_IN_TIME,
            delay: delay,
            ease: 'Quad.easeOut',
        });
    }

    /**
     * The bar crossing, which is what the wait actually reads as, and the group
     * leaving once it is full.
     */
    fillBar(onDone) {

        this.scene.tweens.add({
            targets: this,
            progress: { from: 0, to: 1 },
            duration: FILL_TIME,
            delay: Math.max(0, CARD_IN_TIME - OVERLAP),
            ease: 'Sine.easeInOut',
            onUpdate: () => this.setProgress(this.progress),
            onComplete: () => {

                this.setProgress(1);
                this.popConfetti();

                this.scene.time.delayedCall(HOLD_TIME, () => this.hide(onDone));
            },
        });
    }

    /**
     * The bar sinking away and the shutters parting behind it. The two run into
     * each other by the same overlap as on the way in, so the level about to be
     * played is still revealed by the opening rather than by the bar leaving -
     * there is just no dead beat between the two.
     */
    hide(onDone) {

        this.scene.tweens.add({
            targets: this.barGrp,
            alpha: 0,
            y: this.cardHomeY + CARD_DRIFT,
            duration: CARD_OUT_TIME,
            ease: 'Quad.easeIn',
        });

        // Off the clock rather than off the bar's tween, so the shutters can
        // start parting while the last of it is still going.
        this.scene.time.delayedCall(Math.max(0, CARD_OUT_TIME - OVERLAP), () => {

            this.openShutters(() => {

                this.clearConfetti();
                this.visible = false;
                this.barGrp.y = this.cardHomeY;
                if (onDone) onDone();
            });
        });
    }

    popConfetti() {

        this.clearConfetti();
        this.confetti = [];

        const head = this.fill.x + this.fillTextureWidth * BAR_SCALE;

        for (let i = 0; i < 20; i++) {

            const chip = this.scene.add.image(head, this.barY, 'transitionChip');
            chip.setTint(Phaser.Utils.Array.GetRandom([0xffd34d, 0xff6a9c, 0x6fd3ff, 0x8ce36b, 0xffffff]));
            chip.setScale(Phaser.Math.FloatBetween(.8, 1.7));
            this.barGrp.add(chip);
            this.confetti.push(chip);

            const a = Phaser.Math.FloatBetween(-Math.PI, 0);

            this.scene.tweens.add({
                targets: chip,
                x: head + Math.cos(a) * Phaser.Math.Between(140, 340),
                y: this.barY + Math.sin(a) * Phaser.Math.Between(140, 320),
                angle: Phaser.Math.Between(-540, 540),
                alpha: 0,
                duration: Phaser.Math.Between(450, 750),
                ease: 'Quad.easeOut',
            });
        }
    }

    // The chips are made fresh every time, so they are thrown away with the
    // bar rather than piling up on it level after level.
    clearConfetti() {

        if (!this.confetti) return;

        for (const chip of this.confetti) {
            this.scene.tweens.killTweensOf(chip);
            chip.destroy();
        }

        this.confetti = null;
    }
}
