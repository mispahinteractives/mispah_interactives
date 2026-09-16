import { LEVEL_SELECT_ENABLED } from "./level-select.js";

// The end card: the café popup a run finishes on. The title art says how it
// went, the stars under it what the level was worth, and the round buttons
// along the bottom are the ways out - play the same level again, and - when
// the map is switched on - go back to it and pick another.
//
// The pack art is authored for a 1080px wide screen and every piece is a
// different size, so each one is drawn to a size in game units here rather
// than at one shared art scale.

const PANEL_WIDTH = 464;

// The title straddles the awning along the top edge of the panel.
const TITLE_WIDTH = 430;
const TITLE_Y = -236;

const STAR_Y = -104;
const STAR_GAP = 112;
const STAR_SIZE = 92;       // the side stars; the middle one is drawn bigger
const STAR_MIDDLE = 1.22;
const STAR_LIFT = 20;       // the middle star of the three sits a little higher

const MESSAGE_Y = 26;
const MESSAGE_FILL = "#6b3a12";
const WIN_LINE = "Every order served!";
const FAIL_LINE = "Out of moves!";

const BUTTON_Y = 146;
const BUTTON_SIZE = 116;
const BUTTON_GAP = 40;

// What the card is authored around - the panel plus the title hanging over its
// top - so the fit to a short landscape screen only has to be worked out once.
const CARD_WIDTH = 470;
const CARD_HEIGHT = 540;
const SCREEN_SHARE = .92;

// The title overhangs the top, so the card is dropped by half of that to sit
// the whole thing on the middle of the screen.
const CARD_DROP = 20;

const DIM_ALPHA = .55;

export class CTA extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.init();
        this.value = 0;

    }

    adjust() {

        // The dim covers the whole visible screen in both orientations.
        this.graphics.clear();
        this.graphics.fillStyle(0x000000, DIM_ALPHA);
        this.graphics.fillRect(dimensions.leftOffset, dimensions.topOffset, dimensions.actualWidth, dimensions.actualHeight);

        // Never blown up past its authored size, only shrunk to fit - landscape
        // has barely more height than the card itself.
        this.cardScale = Math.min(
            1,
            (dimensions.gameWidth * SCREEN_SHARE) / CARD_WIDTH,
            (dimensions.gameHeight * SCREEN_SHARE) / CARD_HEIGHT
        );

        this.card.setScale(this.cardScale);
        this.card.x = dimensions.gameWidth / 2;
        this.card.y = dimensions.gameHeight / 2 + CARD_DROP * this.cardScale;

        // Side by side, centred along the bottom of the panel.
        const step = BUTTON_SIZE + BUTTON_GAP;
        const start = -((this.buttons.length - 1) * step) / 2;

        for (let i = 0; i < this.buttons.length; i++) {

            this.buttons[i].x = start + i * step;
            this.buttons[i].y = BUTTON_Y;
        }
    }

    init() {

        this.graphics = this.scene.add.graphics();
        this.add(this.graphics);

        this.card = this.scene.add.container(0, 0);
        this.add(this.card);

        this.panel = this.scene.add.image(0, 0, "popupPanel").setOrigin(.5);
        this.panel.setScale(PANEL_WIDTH / this.panel.width);
        this.card.add(this.panel);

        this.title = this.scene.add.image(0, TITLE_Y, "titleLevelComplete").setOrigin(.5);
        this.card.add(this.title);

        this.stars = [];

        for (let i = 0; i < 3; i++) {

            const middle = i === 1;
            const star = this.scene.add.image((i - 1) * STAR_GAP, STAR_Y - (middle ? STAR_LIFT : 0), "starUnearned").setOrigin(.5);
            star.drawSize = STAR_SIZE * (middle ? STAR_MIDDLE : 1);
            this.card.add(star);
            this.stars.push(star);
        }

        this.message = this.scene.add.text(0, MESSAGE_Y, "", {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 38,
            fill: MESSAGE_FILL,
            align: "center",
        }).setOrigin(.5);
        this.card.add(this.message);

        this.buttons = [];
        this.retryButton = this.createButton("btnRetry", () => this.scene.retryLevel());

        // With the map switched off there is nowhere else to go, and a second
        // button would only do what Retry already does.
        if (LEVEL_SELECT_ENABLED) {
            this.mapButton = this.createButton("btnHome", () => this.scene.openLevelSelect());
        }

        this.visible = false;
    }

    /**
     * One round button on the card: the artwork and the press.
     */
    createButton(key, onTap) {

        const button = this.scene.add.container(0, 0);
        this.card.add(button);

        const face = this.scene.add.image(0, 0, key).setOrigin(.5);
        face.setScale(BUTTON_SIZE / face.width);
        button.add(face);

        button.face = face;

        face.setInteractive({ useHandCursor: true });
        face.on('pointerup', () => {

            if (!this.visible || this.pressed) return;

            // One press per card - a second tap while the first is still
            // springing back would retry the level twice over.
            this.pressed = true;

            this.scene.tweens.killTweensOf(button);
            this.scene.tweens.chain({
                targets: button,
                tweens: [
                    // Gives under the finger, fast.
                    { scale: .92, duration: 70, ease: "Quad.easeOut" },
                    // Springs back past its own size and settles.
                    { scale: 1, duration: 220, ease: "Back.easeOut", easeParams: [2.2] },
                ],
                onComplete: () => {
                    button.setScale(1);
                    onTap();
                },
            });
        });

        this.buttons.push(button);

        return button;
    }

    /**
     * Puts the card up.
     * @param {boolean} won true when every order was served
     * @param {number} earned the stars the level was rated, 0-3
     */
    show(won = false, earned = 0) {

        this.visible = true;
        this.pressed = false;
        this.scene.hideUI();

        // The card says how the level went, so a result line still held over
        // the board would only be saying it twice.
        this.scene.hideBanner();

        this.title.setTexture(won ? "titleLevelComplete" : "titleLevelFailed");
        this.title.setScale(TITLE_WIDTH / this.title.width);

        this.message.setText(won ? WIN_LINE : FAIL_LINE);

        const lit = won ? earned : 0;

        for (let i = 0; i < this.stars.length; i++) {

            const star = this.stars[i];
            star.setTexture(i < lit ? "starEarned" : "starUnearned");
            star.setScale(star.drawSize / star.height);
            star.lit = i < lit;
        }

        this.adjust();
        this.killTweens();

        // The wash first, then the card lands on it.
        this.graphics.setAlpha(0);
        this.scene.tweens.add({
            targets: this.graphics,
            alpha: 1,
            duration: 220,
            ease: "Sine.easeOut",
        });

        this.card.setAlpha(0);
        this.card.setScale(this.cardScale * .7);
        this.scene.tweens.add({
            targets: this.card,
            alpha: 1,
            scale: this.cardScale,
            delay: 120,
            duration: 360,
            ease: "Back.easeOut",
        });

        // The earned stars are stamped on one after another, once the card has
        // landed - the rating is the thing the player is waiting to see.
        let order = 0;

        for (const star of this.stars) {

            if (!star.lit) continue;

            const rest = star.scale;
            star.setScale(rest * 1.8);
            star.setAlpha(0);

            this.scene.tweens.add({
                targets: star,
                scale: rest,
                alpha: 1,
                delay: 460 + order * 160,
                duration: 300,
                ease: "Back.easeOut",
            });

            order++;
        }

        // The buttons pop in last, so the result lands first.
        for (let i = 0; i < this.buttons.length; i++) {

            const button = this.buttons[i];

            button.setScale(.6);
            button.setAlpha(0);

            this.scene.tweens.add({
                targets: button,
                scale: 1,
                alpha: 1,
                delay: 520 + order * 160 + i * 110,
                duration: 320,
                ease: "Back.easeOut",
            });
        }
    }

    hide() {

        this.visible = false;
        this.killTweens();
    }

    killTweens() {

        this.scene.tweens.killTweensOf([this.graphics, this.card].concat(this.stars, this.buttons));
    }
}
