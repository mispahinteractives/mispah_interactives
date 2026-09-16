import data from "../data/data.js";

const ART = 0.5;

const PANEL_X = 78;
const PANEL_Y = 45;
const STAR_Y = 42;
const STAR_GAP = 30;
const STAR_SCALE = ART * 1.15;
const HUD_SCALE = .7;

// Moves left at which the customers start to look worried.
const LOW_MOVES = 3;

// What a level is worth. The bar starts empty and fills with the order: every
// item carried to a customer is progress towards the next star, so all three
// are lit by the time the last item lands.
const STAR_COUNT = 3;

// Two pieces of art rather than one dimmed: the socket the star sits in, and
// the star itself once it has been won.
const STAR_EMPTY = "Star";
const STAR_FILLED = "Star (1)";

export class Moves extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.init();
    }

    get level() {
        return data[this.scene.level] || data[1];
    }

    init() {

        this.value = this.level.moves || 30;
        this.total = this.value;
        this.stars = [];
        this.outOfMoves = false;

        this.panel = this.scene.add.sprite(0, 0, "sheet", "Button");
        this.panel.setOrigin(.5);
        this.panel.setScale(ART + .1);
        this.add(this.panel);

        this.label = this.scene.add.text(0, -12, "Moves", {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 20,
            fill: "#ffffff",
            align: "center",
        }).setOrigin(.5);
        this.add(this.label);

        this.valueTxt = this.scene.add.text(0, 10, this.value, {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 28,
            fill: "#ffffff",
            align: "center",
        }).setOrigin(.5);
        this.add(this.valueTxt);

        this.starBar = this.scene.add.sprite(0, STAR_Y, "sheet", "Star Bar");
        this.starBar.setOrigin(.5);
        this.starBar.setScale(ART * 1.35);
        this.add(this.starBar);

        for (let i = 0; i < STAR_COUNT; i++) {

            const star = this.scene.add.sprite((i - 1) * STAR_GAP, STAR_Y, "sheet", STAR_EMPTY);
            star.setOrigin(.5);
            star.setScale(STAR_SCALE);
            star.earned = false;
            this.add(star);
            this.stars.push(star);
        }

        this.adjust();
    }

    /**
     * What the level is worth as it stands - however many stars the orders
     * filled so far have lit. Read when the level is served.
     * @returns {number} 0-3
     */
    starsEarned() {

        let count = 0;
        for (let i = 0; i < this.stars.length; i++) if (this.stars[i].earned) count++;

        return count;
    }

    /**
     * Spends moves. Fires onOut() once the counter hits zero.
     */
    use(amount = 1) {

        if (this.outOfMoves) return this.value;

        this.value = Math.max(0, this.value - amount);
        this.valueTxt.setText(this.value);

        this.scene.tweens.add({
            targets: this.valueTxt,
            scale: { from: 1.3, to: 1 },
            duration: 180,
            ease: "Back.easeOut",
        });

        // Crossing into the last few moves once - the customers can see the
        // order is not going to be filled.
        if (this.value === LOW_MOVES && this.scene.topPanel) {
            this.scene.topPanel.reactAll("sad");
        }

        if (this.value <= 0) {
            this.outOfMoves = true;
            if (this.onOut) this.onOut();
        }

        return this.value;
    }

    /**
     * Grants extra moves, e.g. from the "+5" booster.
     */
    addMoves(amount) {

        this.value += amount;
        this.outOfMoves = false;
        this.valueTxt.setText(this.value);
        return this.value;
    }

    /**
     * Lights up the first `count` stars, e.g. earnStars(2) once two thirds of
     * the level's items have been carried over. Unlit ones dim back down, so
     * this is safe to call with the running total on every collect.
     */
    earnStars(count) {

        for (let i = 0; i < this.stars.length; i++) {

            const star = this.stars[i];
            const earned = i < count;

            if (earned === star.earned) continue;

            star.earned = earned;
            star.setFrame(earned ? STAR_FILLED : STAR_EMPTY);

            if (earned) {
                this.scene.tweens.add({
                    targets: star,
                    scale: { from: STAR_SCALE * 1.5, to: STAR_SCALE },
                    duration: 260,
                    ease: "Back.easeOut",
                });
            }
        }
    }

    /**
     * Takes the rating strip off the HUD once the level has been served. What
     * the level was worth has already been read off it by then, and it is put
     * up over the board as the award - it has no business still sitting in the
     * corner while the level is being closed out.
     */
    hideStars() {

        if (this.starsHidden) return;
        this.starsHidden = true;

        const parts = [this.starBar].concat(this.stars);

        this.scene.tweens.killTweensOf(parts);

        this.scene.tweens.add({
            targets: parts,
            alpha: 0,
            scaleX: (target) => target.scaleX * .7,
            scaleY: (target) => target.scaleY * .7,
            duration: 240,
            ease: "Sine.easeIn",
            onComplete: () => {
                for (const part of parts) part.setVisible(false);
            },
        });
    }

    reset() {
        this.value = this.total;
        this.outOfMoves = false;
        this.valueTxt.setText(this.value);
        this.earnStars(0);
    }

    destroy(fromScene) {

        this.scene.tweens.killTweensOf([this.valueTxt, this.starBar].concat(this.stars));
        super.destroy(fromScene);
    }

    adjust() {

        // Pinned to the top left of the visible screen, smaller in landscape
        // where it shares a short top strip with the counter.
        const hudScale = dimensions.isLandscape ? HUD_SCALE : 1;

        this.setScale(hudScale);
        this.x = dimensions.leftOffset + (PANEL_X * hudScale);
        this.y = dimensions.topOffset + ((PANEL_Y - 10) * hudScale);
    }
}