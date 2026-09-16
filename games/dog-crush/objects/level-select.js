import levels from "../data/data.js";

// The map is off for now: the game boots straight into a level and runs one
// level into the next, the way it did before the map existed. Everything the
// map needs is still here and still recording - flip this to true and the trail
// comes back, with whatever progress and ratings were saved in the meantime.
export const LEVEL_SELECT_ENABLED = false;

// The map of levels, played top to bottom: level 1 sits at the top of the trail
// and the map opens resting on it, so a new player never has to scroll to find
// where to start. The level table is the only place that decides how many
// there are - add an eleventh level and an eleventh stop appears here.
const LEVEL_COUNT = Object.keys(levels).length;

// Where the player got to, so the map can mark it. Kept in localStorage rather
// than on the scene: the run is gone the moment the tab closes otherwise.
const PROGRESS_KEY = "foodblast.progress";

// What each level was rated, kept level by level: {"1":3,"2":1}. Separate from
// the progress key so an older save that only knows how far the player got
// still opens the map - those levels simply show no stars until replayed.
const STARS_KEY = "foodblast.stars";

// The trail. Stops are stacked a fixed gap apart and pushed off centre on a
// sine, so the line wanders instead of running straight down the middle.
const NODE_GAP = 158;
const NODE_SWAY = 108;

// The tile art is 348 across; this is the width a stop is drawn at.
const NODE_SCALE = 112 / 348;

// Which tile a stop is drawn on: played already, the one up next, or not
// reached yet.
const NODE_TILES = {
    completed: "tileCompleted",
    current: "tileCurrent",
    locked: "tileLocked",
};

// The number on a stop - brown on the cream and gold tiles, cut out in white on
// the green one the player is up to.
const LABEL_FILL = "#6b3a12";
const CURRENT_FILL = "#ffffff";
const CURRENT_STROKE = "#1f5a1a";

// The lock art is 292 tall.
const NODE_LOCK_SCALE = 54 / 292;

const PAD_TOP = 70;
const PAD_BOTTOM = 70;

// Landscape has barely half the height to work with, so the trail is drawn
// smaller there - and wider, because it has width to spare.
const LANDSCAPE_SHRINK = .78;
const LANDSCAPE_SWAY = 1.7;

// The three stars under a stop, showing what that level was rated.
const NODE_STAR_GAP = 34;
const NODE_STAR_Y = 60;
const NODE_STAR_SIZE = 30; // drawn height; the star art is near 280 tall
const NODE_STAR_LIFT = 6; // the middle star of the three sits a little higher

// The dotted line drawn between one stop and the next.
const DOTS_PER_GAP = 4;
const DOT_RADIUS = 7;
const DOT_COLOR = 0xfff0cf;
const DOT_ALPHA = .55;

// Scrolling feel. A drag shorter than the slop is a tap on whatever is under
// the finger; past it the map is being scrolled and the stop is let go.
const TAP_SLOP = 14;
const FLICK_FRICTION = .92; // how fast a flick bleeds off, per frame
const FLICK_STOP = .4;      // below this the map is treated as at rest
const RUBBER = .45;         // how much of a drag past an end actually lands
const SNAP_BACK = 260;      // ms to settle back inside the ends
const WHEEL_STEP = .6;

// The stall's own palette, shared with the banner in GameScene.
const PANEL_FACE = 0x4a2408;
const PANEL_RIM = 0xe8a040;
const PANEL_SHADOW = 0x3a1c05;

/**
 * The level map: a scrolling trail of stops laid over the game, shown before
 * the first level and whenever the player is sent back to pick another one.
 *
 * Built like the rest of the game's objects - a container living in the scene's
 * gameGroup, laid out in design space, with adjust() called on every resize.
 */
export class LevelSelect extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        // Set by whoever opens the map; called with the level that was tapped.
        this.onPick = null;

        this.init();
    }

    init() {

        this.unlocked = loadProgress();
        this.stars = loadStars();

        // Only the stall stands behind the map, and it is busy artwork - a light
        // wash over it is what keeps the numbers on the trail readable.
        this.dim = this.scene.add.graphics();
        this.add(this.dim);

        // Everything that scrolls lives in here; the header does not.
        this.scrollGrp = this.scene.add.container(0, 0);
        this.add(this.scrollGrp);

        this.trail = this.scene.add.graphics();
        this.scrollGrp.add(this.trail);

        this.nodes = [];
        for (let i = 1; i <= LEVEL_COUNT; i++) {
            this.nodes.push(this.createNode(i));
        }

        this.createHeader();
        this.movePulse();

        this.scrollY = 0;
        this.velocity = 0;
        this.dragging = false;
        this.dragMoved = 0;

        this.scene.input.on('pointerdown', this.onDown, this);
        this.scene.input.on('pointermove', this.onMove, this);
        this.scene.input.on('pointerup', this.onUp, this);
        this.scene.input.on('pointerupoutside', this.onUp, this);
        this.scene.input.on('wheel', this.onWheel, this);

        this.visible = false;
        this.adjust();
    }

    // ------------------------------------------------------------------ stops

    /**
     * One stop on the trail: the tile, its number - or the lock standing in for
     * it until the level is reached - and the stars slung under it. The tile
     * itself is the hit area.
     */
    createNode(number) {

        const node = this.scene.add.container(0, 0);
        this.scrollGrp.add(node);

        // The textures are swapped to the stop's state in paintNode.
        const shadow = this.scene.add.image(0, 10, NODE_TILES.current);
        shadow.setOrigin(.5);
        shadow.setScale(NODE_SCALE);
        shadow.setTint(0x000000);
        shadow.setAlpha(.22);
        node.add(shadow);

        const tile = this.scene.add.image(0, 0, NODE_TILES.current);
        tile.setOrigin(.5);
        tile.setScale(NODE_SCALE);
        node.add(tile);

        const label = this.scene.add.text(0, -2, String(number), {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 52,
            fill: LABEL_FILL,
            align: "center",
        }).setOrigin(.5);
        node.add(label);

        const lock = this.scene.add.image(0, -2, "iconLock");
        lock.setOrigin(.5);
        lock.setScale(NODE_LOCK_SCALE);
        node.add(lock);

        // The rating, slung under the tile: three stars, the earned ones lit.
        // They are always drawn on a level that can be played, so an unrated
        // one reads as "no stars yet" rather than as nothing to earn.
        const stars = [];

        for (let i = 0; i < 3; i++) {

            const star = this.scene.add.image((i - 1) * NODE_STAR_GAP, NODE_STAR_Y - (i === 1 ? NODE_STAR_LIFT : 0), "starUnearned");
            star.setOrigin(.5);
            node.add(star);
            stars.push(star);
        }

        node.number = number;
        node.tile = tile;
        node.shadow = shadow;
        node.label = label;
        node.lock = lock;
        node.stars = stars;

        this.paintNode(node);

        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerup', () => this.tapped(node));

        return node;
    }

    tapped(node) {

        if (!this.visible || this.picking) return;

        // The finger travelled - that was a scroll, not a choice.
        if (this.dragMoved > TAP_SLOP) return;

        // The mask hides a stop that has scrolled under the header, but it stays
        // hittable, so a tap up there is dropped rather than played.
        const y = this.scrollGrp.y + node.y;
        if (y < this.viewTop || y > this.viewBottom) return;

        // A level not reached yet stays shut - the tile shakes its head.
        if (node.locked) {

            this.scene.tweens.killTweensOf(node);
            node.setAngle(0);
            this.scene.tweens.chain({
                targets: node,
                tweens: [
                    { angle: -9, duration: 60, ease: "Sine.easeOut" },
                    { angle: 9, duration: 100, ease: "Sine.easeInOut" },
                    { angle: 0, duration: 90, ease: "Sine.easeIn" },
                ],
            });
            return;
        }

        this.pick(node);
    }

    /**
     * Hands the picked level over. The tile takes the tap first, so the press                                                                                      
     * has somewhere to land before the map goes.
     */
    pick(node) {

        this.picking = true;

        if (this.pulse) {
            this.pulse.stop();
            this.pulse = null;
        }

        this.scene.tweens.killTweensOf([node.tile, node.shadow]);
        this.scene.tweens.chain({
            targets: node.tile,
            tweens: [
                { scale: NODE_SCALE * .94, duration: 80, ease: "Quad.easeOut" },
                { scale: NODE_SCALE * 1.24, duration: 160, ease: "Back.easeOut", easeParams: [2] },
                { scale: NODE_SCALE, duration: 160, ease: "Sine.easeIn" },
            ],
        });

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            delay: 150,
            duration: 220,
            ease: "Sine.easeIn",
            onComplete: () => {

                this.hide();
                if (this.onPick) this.onPick(node.number);
            }
        });
    }

    createHeader() {

        this.header = this.scene.add.container(0, 0);
        this.add(this.header);

        this.headerPanel = this.scene.add.graphics();
        this.header.add(this.headerPanel);

        this.headerText = this.scene.add.text(0, 0, "Select Level", {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: 48,
            fill: "#fff6e2",
            align: "center",
            stroke: "#3a1c05",
            strokeThickness: 8,
        }).setOrigin(.5);
        this.header.add(this.headerText);
    }

    drawHeaderPanel() {

        const w = this.headerText.width + 92;
        const h = this.headerText.height + 40;
        const r = Math.min(28, h / 2);

        const g = this.headerPanel;
        g.clear();

        g.fillStyle(PANEL_SHADOW, .24);
        g.fillRoundedRect(-w / 2, -h / 2 + 7, w, h, r);

        g.fillStyle(PANEL_FACE, .88);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, r);

        g.lineStyle(4, PANEL_RIM, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

        this.headerHeight = h + 7;
    }

    // ---------------------------------------------------------------- opening

    /**
     * Opens the map on level 1, whatever the player reached before - the trail
     * always starts where the game starts.
     * @param {function(number)} onPick called with the level that was tapped
     */
    show(onPick) {
 
        this.onPick = onPick;
        this.picking = false;
        this.visible = true;
        this.setAlpha(1);

        this.unlocked = loadProgress();
        this.stars = loadStars();
        this.markProgress();

        this.adjust();

        this.scrollY = 0;
        this.velocity = 0;
        this.dragging = false;
        this.dragMoved = 0;
        this.applyScroll();
    }

    hide() {

        this.visible = false;
        this.dragging = false;
        this.velocity = 0;
        this.stopSnap();

        if (this.pulse) {
            this.pulse.stop();
            this.pulse = null;
        }
    }

    // The ratings only change between one opening of the map and the next.
    markProgress() {

        for (const node of this.nodes) {
            this.paintNode(node);
        }

        this.movePulse();
    }

    /**
     * Breathes the stop the player is up to, so the map says where to go next.                                                     
     * The player comes back here after every level, so the pulse has to follow
     * them along the trail rather than sit on wherever they started.
     */
    movePulse() {

        if (this.pulse) {

            this.pulse.stop();
            this.pulse = null;
        }

        for (const node of this.nodes) {

            this.scene.tweens.killTweensOf([node.tile, node.shadow]);
            node.tile.setScale(NODE_SCALE);
            node.shadow.setScale(NODE_SCALE);
        }

        const current = this.nodes[this.unlocked - 1];

        if (!current) return;

        this.pulse = this.scene.tweens.add({
            targets: [current.tile, current.shadow],
            scale: NODE_SCALE * 1.08,
            duration: 620,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });
    }

    /**
     * Dresses a stop for where the player has got to: the tile for its state,
     * the number or the lock, and its stars lit to whatever that level was
     * rated. A level never played has all three unearned; replaying only ever
     * raises the rating, which is settled in saveStars.
     */
    paintNode(node) {

        const state = node.number < this.unlocked ? "completed"
            : node.number === this.unlocked ? "current"
            : "locked";

        node.locked = state === "locked";

        node.tile.setTexture(NODE_TILES[state]);
        node.shadow.setTexture(NODE_TILES[state]);

        node.label.setVisible(!node.locked);
        node.lock.setVisible(node.locked);

        if (state === "current") {
            node.label.setColor(CURRENT_FILL);
            node.label.setStroke(CURRENT_STROKE, 7);
        } else {
            node.label.setColor(LABEL_FILL);
            node.label.setStroke(LABEL_FILL, 0);
        }

        const earned = this.stars[node.number] || 0;

        for (let i = 0; i < node.stars.length; i++) {

            const star = node.stars[i];
            star.setTexture(i < earned ? "starEarned" : "starUnearned");
            star.setScale(NODE_STAR_SIZE / star.height);
            star.setVisible(!node.locked);
        }
    }

    // ---------------------------------------------------------------- scroll

    onDown(pointer) {

        if (!this.visible) return;

        this.stopSnap();
        this.dragging = true;
        this.dragMoved = 0;
        this.downY = pointer.y;
        this.lastY = pointer.y;
        this.velocity = 0;
    }

    onMove(pointer) {

        if (!this.visible || !this.dragging) return;

        // Pointer positions are screen pixels; the map is laid out in design
        // units, so the drag is divided back down by the scale it is drawn at.
        const delta = (pointer.y - this.lastY) / this.scene.gameScale;
        this.lastY = pointer.y;

        // Measured from where the finger went down, so a drag that wanders out
        // and comes back is still a drag rather than a tap.
        this.dragMoved = Math.abs(pointer.y - this.downY);

        this.scrollY = this.clamp(this.scrollY - delta, RUBBER);
        this.velocity = -delta;
        this.applyScroll();
    }

    onUp() {

        if (!this.visible || !this.dragging) return;

        this.dragging = false;
        this.settleEnds();
    }

    onWheel(pointer, over, dx, dy) {

        if (!this.visible) return;

        this.stopSnap();
        this.scrollY = this.clamp(this.scrollY + dy * WHEEL_STEP, 0);
        this.velocity = 0;
        this.applyScroll();
    }

    /**
     * Pulls the map back inside its ends if a drag left it hanging over one.
     * @returns {boolean} true when it was already inside, and free to coast
     */
    settleEnds() {

        const target = Math.min(Math.max(this.scrollY, 0), this.maxScroll);

        if (target === this.scrollY) return true;

        this.velocity = 0;
        this.snap = this.scene.tweens.add({
            targets: this,
            scrollY: target,
            duration: SNAP_BACK,
            ease: "Back.easeOut",
            onUpdate: () => this.applyScroll(),
        });

        return false;
    }

    stopSnap() {

        if (this.snap) {
            this.snap.stop();
            this.snap = null;
        }
    }

    /**
     * How far past an end the map is allowed to be pulled. A `give` of 0 is a
     * hard stop; anything else lets that fraction of the overshoot through, so
     * a drag past the last level pulls back against the finger.
     */
    clamp(value, give) {

        if (value < 0) return give ? value * give : 0;
        if (value > this.maxScroll) return give ? this.maxScroll + (value - this.maxScroll) * give : this.maxScroll;

        return value;
    }

    applyScroll() {

        this.scrollGrp.y = this.contentTop - this.scrollY;
    }

    // Carries a flick on after the finger has left, until it runs out or hits
    // an end. Driven from the scene's own update.
    update() {

        if (!this.visible || this.dragging || this.snap) return;
        if (Math.abs(this.velocity) < FLICK_STOP) return;

        this.velocity *= FLICK_FRICTION;
        this.scrollY = this.clamp(this.scrollY + this.velocity, 0);
        this.applyScroll();

        if (this.scrollY <= 0 || this.scrollY >= this.maxScroll) this.velocity = 0;
    }

    // ---------------------------------------------------------------- layout

    adjust() {

        this.dim.clear();
        this.dim.fillStyle(0x000000, .35);
        this.dim.fillRect(dimensions.leftOffset, dimensions.topOffset, dimensions.actualWidth, dimensions.actualHeight);

        this.drawHeaderPanel();
        this.header.x = dimensions.gameWidth / 2;
        this.header.y = dimensions.topOffset + this.headerHeight / 2 + 34;

        // The window the trail scrolls behind: everything under the header, down
        // to the bottom of whatever the screen actually is.
        this.viewTop = this.header.y + this.headerHeight / 2 + 24;
        this.viewBottom = dimensions.bottomOffset - 24;
        this.viewHeight = this.viewBottom - this.viewTop;

        this.layoutNodes();
        this.createMask();

        this.scrollY = Math.min(Math.max(this.scrollY || 0, 0), this.maxScroll);
        this.applyScroll();
    }

    /**
     * Stacks the stops down the trail and redraws the dotted line between them.
     * Laid out from 0 downwards; the container's own y does the scrolling.
     */
    layoutNodes() {

        const shrink = dimensions.isLandscape ? LANDSCAPE_SHRINK : 1;
        const gap = NODE_GAP * shrink;
        const sway = NODE_SWAY * shrink * (dimensions.isLandscape ? LANDSCAPE_SWAY : 1);
        const centre = dimensions.gameWidth / 2;

        for (let i = 0; i < this.nodes.length; i++) {

            const node = this.nodes[i];
            node.setScale(shrink);
            node.x = centre + Math.sin(i * .9) * sway;
            node.y = PAD_TOP * shrink + i * gap;
        }

        this.contentHeight = (PAD_TOP + PAD_BOTTOM) * shrink + (this.nodes.length - 1) * gap;
        this.contentTop = this.viewTop;
        this.maxScroll = Math.max(0, this.contentHeight - this.viewHeight);

        this.trail.clear();
        this.trail.fillStyle(DOT_COLOR, DOT_ALPHA);

        for (let i = 0; i < this.nodes.length - 1; i++) {

            const from = this.nodes[i];
            const to = this.nodes[i + 1];

            for (let d = 1; d < DOTS_PER_GAP; d++) {

                const t = d / DOTS_PER_GAP;
                this.trail.fillCircle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, DOT_RADIUS * shrink);
            }
        }
    }

    /**
     * Clips the trail to the window under the header, so a stop scrolling out of
     * the top disappears behind the panel instead of sliding over it.
     *
     * The mask is drawn in world space - the same way the board masks its cells -
     * which for this container is the design-space rect shifted by the group it
     * sits in and scaled by the scale that group is drawn at.
     */
    createMask() {

        if (this.maskGraphics) this.maskGraphics.destroy();

        const scale = this.scene.gameScale;
        const group = this.scene.gameGroup;

        this.maskGraphics = this.scene.make.graphics();
        this.maskGraphics.fillStyle(0xffffff, .5);
        this.maskGraphics.fillRect(
            (group.x + dimensions.leftOffset) * scale,
            (group.y + this.viewTop) * scale,
            dimensions.actualWidth * scale,
            this.viewHeight * scale
        );

        this.scrollGrp.setMask(this.maskGraphics.createGeometryMask());
    }

    /**
     * The map outlives a level, but not the scene - the pointer handlers are
     * on the scene's input plugin and would fire into a dead container.
     */
    destroy(fromScene) {

        this.scene.input.off('pointerdown', this.onDown, this);
        this.scene.input.off('pointermove', this.onMove, this);
        this.scene.input.off('pointerup', this.onUp, this);
        this.scene.input.off('pointerupoutside', this.onUp, this);
        this.scene.input.off('wheel', this.onWheel, this);

        this.stopSnap();

        if (this.maskGraphics) {
            this.maskGraphics.destroy();
            this.maskGraphics = null;
        }

        super.destroy(fromScene);
    }
}

/**
 * The highest level the player has reached, clamped to a level that exists. A
 * fresh player - or a browser that will not hand back storage - starts at 1.
 */
export function loadProgress() {

    let value = 1;

    try {
        value = parseInt(window.localStorage.getItem(PROGRESS_KEY), 10) || 1;
    } catch (e) {
        value = 1;
    }

    return Math.min(Math.max(value, 1), LEVEL_COUNT);
}

/**
 * What every level has been rated so far, as {level: stars}. A browser that
 * will not hand back storage - or a save written by an older build - reads as
 * nothing rated yet.
 * @returns {Object<number, number>}
 */
export function loadStars() {

    try {
        const raw = window.localStorage.getItem(STARS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) {
        return {};
    }
}

/**
 * Records a level's rating. Only ever an improvement: a scrappy replay of a
 * level already served with three stars does not cost the player those stars.
 * @param {number} level the level just served
 * @param {number} stars 1-3
 * @returns {number} the rating the level now stands at
 */
export function saveStars(level, stars) {

    const all = loadStars();
    const best = Math.max(all[level] || 0, stars);

    all[level] = best;

    try {
        window.localStorage.setItem(STARS_KEY, JSON.stringify(all));
    } catch (e) {
        // Private browsing, or storage turned off - the map just shows nothing.
    }

    return best;
}

/**
 * Remembers how far the player got, so the map marks it next time round.
 * @param {number} level the level just reached
 */
export function saveProgress(level) {

    try {
        const best = Math.max(parseInt(window.localStorage.getItem(PROGRESS_KEY), 10) || 1, level);
        window.localStorage.setItem(PROGRESS_KEY, String(best));
    } catch (e) {
        // Private browsing, or storage turned off - the map just opens at 1.
    }
}
