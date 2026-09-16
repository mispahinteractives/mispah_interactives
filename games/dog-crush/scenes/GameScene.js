import { fullScreen } from '../utils/screen.js'
import { pointerUp } from '../utils/buttons.js'
import { CTA } from '../objects/cta.js';
import SoundManager from '../objects/SoundManager.js';
import AnimationManager from '../objects/AnimationManager.js';
import animationData from '../data/animation-data.js';
import { Board } from '../objects/board.js';
import { TopPanel } from '../objects/top-panel.js';
import { Moves } from '../objects/moves.js';
import { Life } from '../objects/life.js';
import { UIPanel } from '../objects/ui-panel.js';
import levels from '../data/data.js';
import { LevelSelect, saveProgress, saveStars, LEVEL_SELECT_ENABLED } from '../objects/level-select.js';
import { LevelTransition } from '../objects/level-transition.js';
import { Intro } from '../objects/intro.js';
import Preload from '../scenes/preload.js';
import { getArt } from '../data/loose-art.js';

// Ten levels, played in order. The table is the only place that decides how
// many there are.
const LAST_LEVEL = Object.keys(levels).length;

// The bomb that goes off on a TNT charge. The extent is how wide the authored
// artwork reads at scale 1, measured across the whole animation, and is what
// lets a blast be scaled to the block of cells it actually cleared.
const BOMB_KEY = "bomb_explosion";
const BOMB_ANIM = "animation";
const BOMB_EXTENT = 647;
const BOMB_DURATION = 700;

// Clearance kept between the bottom of the banner panel and the board's frame.
const BANNER_GAP = 14;

// The panel behind the banner line.
const BANNER_RADIUS = 26;
const BANNER_LINE = 4; // the rim
const BANNER_DROP = 7; // how far the shadow falls below the panel

// The line itself: authored at this size, then scaled down by drawBannerPanel
// if a long one would otherwise run the panel past the edges of the screen.
const BANNER_FONT = 40;
const BANNER_PAD_X = 40;
const BANNER_PAD_Y = 18;
const BANNER_MAX_WIDTH = .86; // share of the screen the panel may take up

// How wide a line set in the UI pack's title art is drawn, at most.
const BANNER_TITLE_WIDTH = 440;

const BANNER_FACE = 0x4a2408; // dark, so cream text carries over a busy background
const BANNER_RIM = 0xe8a040; // the stall's own wood, picked up as a rim
const BANNER_SHADOW = 0x3a1c05;

// How long a served level is left to sit - the completion line up over the
// board, the customers still at the counter - before they walk off with their
// orders and the next level is opened.
const SERVED_HOLD = 1800;

export default class GameScene extends Phaser.Scene {

    // Vars
    handlerScene = null

    constructor() {
        super('GameScene')
    }

    /**
     * The level the scene opens on. Everything level shaped - the board, the
     * counter, the move count - is read out of the table by number, so this is
     * the only thing that has to change to start anywhere in the run. The map
     * sets it before the first level is built.
     * @param {{level:number}} data
     */
    init(data) {
        this.level = (data && data.level) ? data.level : 1;
    }

    preload() {

        this.switchMode();

        let ratio = window.devicePixelRatio;

        dimensions.fullWidth = window.innerWidth * ratio;
        dimensions.fullHeight = window.innerHeight * ratio;

        this.setGameScale();

        this.handlerScene = this.scene.get('handler')
        this.scale.on('resize', this.orinetaionChange, this)
    }

    orinetaionChange() {

        this.switchMode();
        this.setGameScale();
        this.setPositions();
    }

    createAnimations() {
        for (let i = 0; i < animationData.atlas.length; i++) {
            this.animationManager.createAnimations(animationData.atlas[i]);
        }

        for (let i = 1; i < animationData.fxAtlas.length; i++) {
            this.animationManager.createAnimations(animationData.fxAtlas[i]);
        }
    }

    create() {
        this.game.gameScene = this;

        // The loading screen faded out to its own blue; this comes up out of
        // the same blue, so the two screens dissolve into one another.
        this.cameras.main.fadeIn(320, Preload.SCREEN.r, Preload.SCREEN.g, Preload.SCREEN.b);

        this.animationManager = new AnimationManager(this);
        this.createAnimations();

        this.superGroup = this.add.container();
        this.gameGroup = this.add.container();
        this.superGroup.add(this.gameGroup);

        this.bg = this.add.sprite(0, -240, "background");
        this.bg.setOrigin(.5);
        this.gameGroup.add(this.bg);

        this.board = new Board(this, 0, 0, this);
        this.gameGroup.add(this.board);

        this.topPanel = new TopPanel(this, 0, 0, this);
        this.gameGroup.add(this.topPanel);

        this.uiPanel = new UIPanel(this, 0, 0, this);
        this.gameGroup.add(this.uiPanel);

        this.moves = new Moves(this, 0, 0, this);
        this.moves.onOut = () => this.checkWin(this.topPanel.isComplete());
        this.gameGroup.add(this.moves);

        this.life = new Life(this, 0, 0, this);
        this.gameGroup.add(this.life);

        // Collected food flies over the board and the panel, but under the popup.
        this.flyGrp = this.add.container();
        this.gameGroup.add(this.flyGrp);

        this.cta = new CTA(this, 0, 0, this);
        this.gameGroup.add(this.cta)

        // The announcement sits on its own panel so it stays readable over
        // whatever the board happens to be showing underneath it.
        this.banner = this.add.container(0, 0);

        this.bannerPanel = this.add.graphics();
        this.banner.add(this.bannerPanel);

        this.bannerText = this.add.text(0, 0, "", {
            fontFamily: "Oduda-Bold-Demo",
            fontSize: BANNER_FONT,
            fill: "#fff6e2",
            align: "center",
            stroke: "#3a1c05",
            strokeThickness: 6,
        }).setOrigin(.5);
        this.banner.add(this.bannerText);

        // A result line can be the UI pack's own title art instead of set text -
        // it needs no panel behind it, the art carries its own outline.
        this.bannerTitle = this.add.image(0, 0, "titleLevelComplete").setOrigin(.5);
        this.bannerTitle.setVisible(false);
        this.banner.add(this.bannerTitle);

        this.banner.setAlpha(0);
        this.gameGroup.add(this.banner);

        // The map is the first screen of the session, so it goes on last and
        // stays over everything the game draws.
        if (LEVEL_SELECT_ENABLED) {

            this.levelSelect = new LevelSelect(this, 0, 0, this);
            this.gameGroup.add(this.levelSelect);
        }

        // The screen between one level and the next. It covers the swap over,
        // so it goes on last of all - over the map included.
        this.levelTransition = new LevelTransition(this, 0, 0, this);
        this.gameGroup.add(this.levelTransition);

        // The intro opens the session, so it goes over everything else.
        this.intro = new Intro(this, 0, 0, this);
        this.gameGroup.add(this.intro);

        this.setPositions();

        // Nothing is played behind the intro - the board is put away until PLAY
        // is tapped, and the opening level (or the map, when it is on) is
        // brought up under the intro as it fades off.
        this.board.canClick = false;
        this.board.gameEnded = true;
        this.showPlay(false);

        this.intro.show(() => this.openLevelSelect(true));
    }

    /**
     * Opens the level map. Nothing of the game itself is on screen while it is
     * up - only the stall behind it - so the map reads as its own screen rather
     * than as a panel over a board that is not being played.
     * @param {boolean} first true on the very first opening of the session
     */
    openLevelSelect(first = false) {

        this.board.canClick = false;
        this.board.gameEnded = true;
        this.board.hideHint();

        this.cta.hide();
        this.showPlay(false);

        // No map to pick from - the level already lined up is the one played.
        if (!LEVEL_SELECT_ENABLED) {

            this.playLevel(this.level, first);
            return;
        }

        this.levelSelect.show((level) => this.playLevel(level, first));
    }

    /**
     * Builds a level and opens it. The one road into being played, whether the
     * level came off the map or straight from the one before it.
     * @param {number} level
     * @param {boolean} first true on the very first level of the session
     */
    playLevel(level, first = false) {

        this.level = level;

        // The opening level needs no card: the loading screen is dissolving
        // straight into it, and there is no level behind it to cover.
        if (first) {

            this.buildLevel();
            this.showPlay(true);
            this.startLevel(true);
            return;
        }

        // The level is torn down and rebuilt behind the transition card, so
        // none of the swap is ever seen.
        this.levelTransition.show(level, () => {

            this.buildLevel();
            this.showPlay(true);

            // The new level's customers are put off screen while the screen is
            // still covered. Without this they are standing at the counter as
            // it is uncovered, and only jump off screen to walk in once the
            // transition has finished.
            this.topPanel.park();

            // The end-of-level line is a held banner - it stays up until it is
            // taken down. Taken down here, under cover, so the next level is
            // never uncovered with the last one's result still over the board.
            this.hideBanner();

        }, () => {

            this.startLevel(false);
        });
    }

    /**
     * Plays the level that just ended over again - the board is rebuilt from
     * the table, so it comes back the way it started rather than the way it was
     * left.
     */
    retryLevel() {

        this.cta.hide();
        this.buildLevel();
        this.showPlay(true);
        this.startLevel();
    }

    /**
     * Puts the game itself on or off screen. The background stays either way -
     * it is the stall the whole game is set in, map included.
     * @param {boolean} show
     */
    showPlay(show) {

        this.board.visible = show;
        this.topPanel.visible = show;
        this.uiPanel.visible = show;
        this.moves.visible = show;
        this.life.visible = show;

        if (!show) this.hideBanner();
    }

    /**
     * Opens a level: the customers walk on to the counter, the board stays
     * locked until they are in place, and the level number is announced.
     * @param {boolean} first true on the very first level of the session
     */
    startLevel(first = false) {

        this.gameOver = false;
        this.board.canClick = false;
        this.board.gameEnded = false;

        this.showBanner("Level " + this.level, first ? 0 : 250);

        this.topPanel.walkIn(() => {

            this.board.canClick = true;
            this.board.gameStarted = true;
            this.board.startHintTimer();
        });
    }

    /**
     * The level is served. What it was worth is read off the move counter -
     * finish with moves to spare and it is three stars - the rating is put up
     * over the board, and the player is sent back to the map to choose again
     * rather than being dropped straight into the next level.
     */
    levelServed() {

        this.board.canClick = false;
        this.board.gameEnded = true;
        this.board.hideHint();

        // Read before anything else touches the counter: this is the rating.
        const stars = this.moves.starsEarned();

        // Read, so the strip in the corner has done its job - it comes off
        // rather than sitting there through the whole level-complete sequence.
        this.moves.hideStars();

        // The next level opens up whatever the rating was - the stars are how
        // well it was served, not whether it counts as served at all.
        saveStars(this.level, stars);

        // Kept for the end card, which comes up after the customers have left.
        this.lastStars = stars;
        if (this.level < LAST_LEVEL) saveProgress(this.level + 1);

        this.showBanner(this.level < LAST_LEVEL
            ? "Level " + this.level + " Complete!"
            : "All " + LAST_LEVEL + " Levels Served!", 200, true, "titleLevelComplete");

        // Anyone still at the counter cheers the level home before they leave.
        this.topPanel.reactAll("happy");

        // Long enough for the last order's plate bounce and star burst to land,
        // and for the line above the board to be read, before the customers
        // turn and leave with what they came for.
        this.time.delayedCall(SERVED_HOLD, () => {

            this.topPanel.walkOut(() => this.levelDone());
        });
    }

    /**
     * Where a served level leaves the player: back at the map to choose again,
     * or - with the map off - straight into the next level, and on the end card
     * when there is no next level to go to.
     */
    levelDone() {

        if (LEVEL_SELECT_ENABLED) {

            this.openLevelSelect();
            return;
        }

        if (this.level < LAST_LEVEL) {

            this.playLevel(this.level + 1);
            return;
        }

        this.cta.show(true, this.lastStars);
    }

    /**
     * Swaps the level-shaped objects - board, counter and move counter - for the
     * ones the new level asks for. Everything else (background, HUD strip, lives,
     * the flight layer and the end card) is level agnostic and stays put.
     */
    buildLevel() {

        this.board.destroy();
        this.topPanel.destroy();
        this.moves.destroy();

        this.board = new Board(this, 0, 0, this);
        this.gameGroup.add(this.board);

        this.topPanel = new TopPanel(this, 0, 0, this);
        this.gameGroup.add(this.topPanel);

        this.moves = new Moves(this, 0, 0, this);
        this.moves.onOut = () => this.checkWin(this.topPanel.isComplete());
        this.gameGroup.add(this.moves);

        // The new objects went on top of the stack, so the layers that have to
        // stay above the board are lifted back over them.
        this.gameGroup.bringToTop(this.uiPanel);
        this.gameGroup.bringToTop(this.moves);
        this.gameGroup.bringToTop(this.life);
        this.gameGroup.bringToTop(this.flyGrp);
        this.gameGroup.bringToTop(this.cta);
        this.gameGroup.bringToTop(this.banner);
        if (this.levelSelect) this.gameGroup.bringToTop(this.levelSelect);
        if (this.levelTransition) this.gameGroup.bringToTop(this.levelTransition);

        // The opening level is built while the intro is still fading off it, so
        // the intro has to stay over the new objects until it is gone.
        if (this.intro) this.gameGroup.bringToTop(this.intro);

        this.setPositions();
    }

    /**
     * The line above the board: the level number as it starts, the result when
     * the session ends. An end message holds instead of fading away.
     */
    // Takes the banner down wherever it is in its life - a held one has no
    // fade of its own, so it has to be cleared rather than waited out.
    hideBanner() {

        if (!this.banner) return;

        this.tweens.killTweensOf(this.banner);
        this.banner.setAlpha(0);
    }

    /**
     * @param {string} text the line
     * @param {number} delay
     * @param {boolean} hold true for an end message, which stays up
     * @param {string} titleKey the UI pack's title art to show in place of the
     *   text - the text is the fallback if that art never loaded
     */
    showBanner(text, delay = 0, hold = false, titleKey = null) {

        if (!this.banner) return;

        this.tweens.killTweensOf(this.banner);

        const art = !!titleKey && this.textures.exists(titleKey);

        this.bannerText.setVisible(!art);
        this.bannerPanel.setVisible(!art);
        this.bannerTitle.setVisible(art);

        if (art) {

            this.bannerTitle.setTexture(titleKey);
            this.drawBannerTitle();

        } else {

            this.bannerText.setText(text);
            this.drawBannerPanel();
        }
        this.banner.setAlpha(0);
        this.banner.setScale(.6);

        this.tweens.chain({
            targets: this.banner,
            delay: delay,
            tweens: hold ? [
                { alpha: 1, scale: 1.08, duration: 320, ease: "Back.easeOut" },
                { scale: 1, duration: 220, ease: "Sine.easeInOut" },
            ] : [
                { alpha: 1, scale: 1.08, duration: 320, ease: "Back.easeOut" },
                { scale: 1, duration: 220, ease: "Sine.easeInOut" },
                { scale: 1, duration: 520 },
                { alpha: 0, scale: 1.15, duration: 300, ease: "Sine.easeIn" },
            ]
        });
    }

    /**
     * Resizes the panel behind the banner to whatever the current line needs -
     * the text is a different width every time it changes.
     */
    drawBannerPanel() {

        // A long line is shrunk to fit rather than allowed to push the panel
        // off the sides - the end-of-game line is half again as long as a
        // level number.
        this.bannerText.setScale(1);

        const room = dimensions.gameWidth * BANNER_MAX_WIDTH - BANNER_PAD_X * 2;
        if (this.bannerText.width > room) this.bannerText.setScale(room / this.bannerText.width);

        const padX = BANNER_PAD_X;
        const padY = BANNER_PAD_Y;
        const w = this.bannerText.displayWidth + padX * 2;
        const h = this.bannerText.displayHeight + padY * 2;
        const r = Math.min(BANNER_RADIUS, h / 2);

        const g = this.bannerPanel;
        g.clear();

        g.fillStyle(BANNER_SHADOW, .24);
        g.fillRoundedRect(-w / 2, -h / 2 + BANNER_DROP, w, h, r);

        g.fillStyle(BANNER_FACE, .88);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, r);

        g.lineStyle(BANNER_LINE, BANNER_RIM, 1);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

        // The panel is a different height for a different line, and it is placed
        // by its bottom edge, so the position is settled here rather than only
        // on a resize.
        this.bannerHeight = h + BANNER_DROP;
        this.bannerWidth = w + BANNER_LINE;
        this.positionBanner();
    }

    /**
     * Sizes a title-art line. It has no panel to fit, so it is only held inside
     * the same share of the screen a text line is.
     */
    drawBannerTitle() {

        const room = dimensions.gameWidth * BANNER_MAX_WIDTH;
        const width = Math.min(BANNER_TITLE_WIDTH, room);

        this.bannerTitle.setScale(width / this.bannerTitle.width);

        this.bannerHeight = this.bannerTitle.displayHeight;
        this.bannerWidth = this.bannerTitle.displayWidth;
        this.positionBanner();
    }

    /**
     * Sits the panel in the gap between the stall and the board, resting on the
     * board's frame - never over it, whatever the line says or the screen does.
     */
    positionBanner() {

        if (!this.banner || !this.board) return;

        // The frame overhangs the grid, so the top of the board is the top of
        // whichever of the two reaches higher.
        const gridHeight = this.board.rows * this.board.tileHeight;
        const contentHeight = this.board.boardFrame ? Math.max(gridHeight, this.board.boardFrame.displayHeight) : gridHeight;
        const boardTop = this.board.y - (contentHeight * this.board.scaleY) / 2;

        // The fade-out swells the panel to 1.15, so the clearance is measured
        // against the largest it ever gets rather than its resting size.
        const halfHeight = ((this.bannerHeight || 0) / 2) * 1.15;

        this.banner.x = dimensions.gameWidth / 2;
        this.banner.y = boardTop - BANNER_GAP - halfHeight;
    }

    hideUI() {

    }

    checkWin(gameWin = false) {
        if (this.gameOver) return;
        this.gameOver = true;
        this.board.gameEnded = true;

        // Serving every order rates the level and hands the player back to the
        // map; only running out of moves ends the run on the end card.
        if (gameWin) {
            this.cta.userWon = true;
            this.levelServed();
            return;
        }

        this.cta.userWon = false;
        // Nobody is getting served now - the customers left waiting sag.
        this.topPanel.setMoodAll("sad");

        this.board.canClick = false;
        this.time.addEvent({
            delay: 500,
            callback: () => {
                this.cta.show(false);
            }
        });
    }

    /**
     * Sets the bomb off over the board.
     *
     * The skeleton is drawn on the flight layer in world space rather than
     * inside the board container: the board is a scaled container with a
     * geometry mask clipping it to the cells that exist, and an explosion is
     * meant to spill past the cells it came from.
     *
     * @param {number} boardX where it goes off, in board space
     * @param {number} boardY where it goes off, in board space
     * @param {number} reach how wide the blast should read, in board pixels
     * @param {number} delay held back this long, for a charge later in a chain
     * @returns {boolean} false when the skeleton never loaded - the board draws
     *                    its own blast instead of showing nothing
     */
    blastAt(boardX, boardY, reach, delay = 0) {

        const cache = this.cache.custom && this.cache.custom.spine;

        if (!this.add.spine || !cache || !cache.exists(BOMB_KEY)) return false;

        // The board is a scaled container; the flight layer is not.
        const x = this.board.x + (boardX * this.board.scaleX);
        const y = this.board.y + (boardY * this.board.scaleY);

        const start = () => {

            if (!this.scene.isActive()) return;

            const boom = this.add.spine(x, y, BOMB_KEY, BOMB_ANIM, false);

            // The artwork is authored around 647 units across, so it is scaled
            // to whatever the blast actually took on the board.
            boom.setScale((reach / BOMB_EXTENT) * this.board.scaleX);
            this.flyGrp.add(boom);

            // Timed off the animation rather than waiting on a completion event:
            // the skeleton is a converted 3.2 file and this is one less thing
            // about it that has to behave for the board to be left clean.
            this.time.delayedCall(BOMB_DURATION, () => boom.destroy());
        };

        if (delay > 0) {
            this.time.delayedCall(delay, start);
        } else {
            start();
        }

        return true;
    }

    /**
     * Sends one matched tile to the customer who ordered it.
     *
     * The tile pops off the board, leans into the direction it is about to
     * travel, then swings up to the order bubble along a curve, trailing ghosts
     * and accelerating the whole way in - so the arrival lands on the beat where
     * the counter punches down.
     *
     * @param {string} frameName atlas frame, plain ("Burger") or namespaced ("blocks/burger")
     * @param {number} boardX tile position, in board space
     * @param {number} boardY tile position, in board space
     * @param {number} order position within its match, used to stagger the flight
     * @returns {boolean} false when nobody ordered this food - the board pops it in place instead
     */
    collectTile(frameName, boardX, boardY, order = 0) {

        const name = String(frameName).split("/").pop();
        const slot = this.topPanel.reserve(name);

        if (!slot) return false;

        // The board is a scaled container, the flight happens outside it.
        const startX = this.board.x + (boardX * this.board.scaleX);
        const startY = this.board.y + (boardY * this.board.scaleY);
        // A pizza is not in the atlas - it flies as its own image, fitted to
        // the size the atlas foods are drawn at.
        const art = getArt(this, frameName);
        const scale = this.board.tileScale * this.board.scaleX * art.fit;

        const flyer = this.add.sprite(startX, startY, art.texture, art.frame);
        flyer.setOrigin(.5);
        flyer.setScale(scale);
        this.flyGrp.add(flyer);

        const dx = slot.x - startX;
        const dy = slot.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const delay = order * 70;
        const popTime = 210;
        const popDip = 14;
        const flightTime = Phaser.Math.Clamp(360 + distance * .5, 420, 820);

        this.playSounds("collect");

        // 1. Anticipation - it swells and sinks back before it leaves.
        this.tweens.add({
            targets: flyer,
            scale: scale * 1.45,
            y: startY + popDip,
            angle: dx >= 0 ? -16 : 16,
            delay: delay,
            duration: popTime,
            ease: "Back.easeOut",
        });

        // 2. The flight path bows outwards and downwards away from the straight
        //    line, so the food swings out and hooks into the bubble.
        const from = new Phaser.Math.Vector2(startX, startY + popDip);
        const to = new Phaser.Math.Vector2(slot.x, slot.y);

        const side = dx >= 0 ? 1 : -1;
        const bow = distance * .22;

        const control = new Phaser.Math.Vector2(
            ((from.x + to.x) / 2) + ((-dy / distance) * bow * side),
            ((from.y + to.y) / 2) + ((dx / distance) * bow * side)
        );

        const curve = new Phaser.Curves.QuadraticBezier(from, control, to);
        const point = new Phaser.Math.Vector2();

        let trail = null;

        // Ghosts of itself, thinning out behind the flight.
        this.time.delayedCall(delay + popTime, () => {

            trail = this.time.addEvent({
                delay: 55,
                loop: true,
                callback: () => {

                    if (!flyer.active) return;

                    const ghost = this.add.sprite(flyer.x, flyer.y, art.texture, art.frame);
                    ghost.setOrigin(.5);
                    ghost.setScale(flyer.scale * .9);
                    ghost.setAngle(flyer.angle);
                    ghost.setAlpha(.4);
                    this.flyGrp.add(ghost);
                    this.flyGrp.sendToBack(ghost);

                    this.tweens.add({
                        targets: ghost,
                        alpha: 0,
                        scale: ghost.scale * .5,
                        duration: 280,
                        ease: "Sine.easeOut",
                        onComplete: () => ghost.destroy(),
                    });
                }
            });
        });

        // Shrinking and spinning run on their own easings - all three finishing
        // together is what makes it read as one move instead of three tweens.
        this.tweens.add({
            targets: flyer,
            scale: scale * .5,
            delay: delay + popTime,
            duration: flightTime,
            ease: "Quad.easeIn",
        });

        this.tweens.add({
            targets: flyer,
            angle: dx >= 0 ? 28 : -28,
            delay: delay + popTime,
            duration: flightTime,
            ease: "Sine.easeInOut",
        });

        this.tweens.addCounter({
            from: 0,
            to: 1,
            delay: delay + popTime,
            duration: flightTime,
            ease: "Cubic.easeIn",
            onUpdate: (tween) => {

                curve.getPoint(tween.getValue(), point);

                flyer.x = point.x;
                flyer.y = point.y;
            },
            onComplete: () => {

                if (trail) trail.remove();

                flyer.destroy();
                this.topPanel.collect(slot);
            }
        });

        return true;
    }

    clickBackScene(sceneTxt) {
        const scene = this.scene.get(sceneTxt)
        let gotoScene
        let bgColorScene

        switch (sceneTxt) {
            case "title":
                this.creditsTxt.visible = false
                return
        }

        scene.sceneStopped = true
        scene.scene.stop(sceneTxt)
        this.handlerScene.cameras.main.setBackgroundColor(bgColorScene)
        this.handlerScene.launchScene(gotoScene)
    }

    setGameScale() {
        let scaleX = dimensions.fullWidth / dimensions.gameWidth;
        let scaleY = dimensions.fullHeight / dimensions.gameHeight;


        this.gameScale = (scaleX < scaleY) ? scaleX : scaleY;

        dimensions.actualWidth = dimensions.fullWidth / this.gameScale;
        dimensions.actualHeight = dimensions.fullHeight / this.gameScale;

        dimensions.leftOffset = -(dimensions.actualWidth - dimensions.gameWidth) / 2;
        dimensions.rightOffset = dimensions.gameWidth - dimensions.leftOffset;
        dimensions.topOffset = -(dimensions.actualHeight - dimensions.gameHeight) / 2;
        dimensions.bottomOffset = dimensions.gameHeight - dimensions.topOffset;
    }

    switchMode() {

        let ratio = window.devicePixelRatio;
        let isPortrait;
        dimensions.fullWidth = window.innerWidth * ratio;
        dimensions.fullHeight = window.innerHeight * ratio;

        if (dimensions.isPortrait != dimensions.fullWidth < dimensions.fullHeight) {
            isPortrait = true
        } else {
            isPortrait = false
        }

        dimensions.isPortrait = isPortrait;
        dimensions.isLandscape = !isPortrait;

        if (dimensions.fullWidth < dimensions.fullHeight) {
            dimensions.gameWidth = 540;
            dimensions.gameHeight = 960;
            dimensions.isPortrait = true;
            dimensions.isLandscape = false;
        } else {

            dimensions.gameWidth = 960;
            dimensions.gameHeight = 540;
            dimensions.isLandscape = true;
            dimensions.isPortrait = false;
        }

    }

    setPositions() {

        let ratio = window.devicePixelRatio;
        this.superGroup.scale = this.gameScale
        this.gameGroup.x = (dimensions.fullWidth / this.gameScale - dimensions.gameWidth) / 2;
        this.gameGroup.y = (dimensions.fullHeight / this.gameScale - dimensions.gameHeight) / 2;

        this.bg.setScale(1);

        let scaleX = dimensions.actualWidth / this.bg.displayWidth;
        let scaleY = dimensions.actualHeight / this.bg.displayHeight;
        let scale = Math.max(scaleX, scaleY);

        this.bg.setScale(scale, scale * .99);

        if (dimensions.isLandscape) {

            this.bg.x = dimensions.gameWidth / 2;
            this.bg.y = dimensions.gameHeight / 2;
        } else {

            this.bg.x = dimensions.gameWidth / 2;
            this.bg.y = dimensions.gameHeight / 2 + 10;
        }

        // The counter first - the board sizes itself to the space left below it.
        this.topPanel.adjust();
        this.board.adjust();
        this.uiPanel.adjust();
        this.moves.adjust();
        this.life.adjust();
        this.cta.adjust();
        if (this.levelSelect) this.levelSelect.adjust();
        if (this.levelTransition) this.levelTransition.adjust();
        if (this.intro) this.intro.adjust();

        this.positionBanner();
    }

    // Live pointer position - the board reads this every frame while dragging, so
    // it has to follow the finger, not stay at wherever it went down.
    offsetMouse() {

        return {
            x: (this.game.input.activePointer.worldX * dimensions.actualWidth / dimensions.fullWidth) + ((dimensions.gameWidth - dimensions.actualWidth) / 2),
            y: (this.game.input.activePointer.worldY * dimensions.actualHeight / dimensions.fullHeight) + ((dimensions.gameHeight - dimensions.actualHeight) / 2)
        };
    }

    playSounds(name) {

        if (!this.cache.audio.exists(name)) return;
        this.sound.play(name);
    }

    offsetWorld(point) {
        return { x: (point.x * dimensions.actualWidth / this.game.width), y: 0(point.y * dimensions.actualHeight / this.game.height) };
    }

    updateResize(scene) {

        let ratio = window.devicePixelRatio;
        scene.scale.on('resize', this.resize, scene)

        const scaleWidth = scene.scale.gameSize.width * ratio
        const scaleHeight = scene.scale.gameSize.height * ratio

        scene.parent = new Phaser.Structs.Size(scaleWidth, scaleHeight)
        scene.sizer = new Phaser.Structs.Size(scene.width, scene.height, Phaser.Structs.Size.FIT, scene.parent)

        scene.parent.setSize(scaleWidth, scaleHeight)
        scene.sizer.setSize(scaleWidth, scaleHeight)

        this.updateCamera(scene)
    }

    update() {

        if (this.board) this.board.update();
        if (this.levelSelect) this.levelSelect.update();
    }

    resize(gameSize) {

        // 'this' means to the current scene that is running
        if (!this.sceneStopped) {

            let ratio = window.devicePixelRatio;
            const width = gameSize.width * ratio;
            const height = gameSize.height * ratio;

            this.parent.setSize(width, height);
            this.sizer.setSize(width, height);
        }
    }

    updateCamera(scene) {
        const camera = scene.cameras.main
        const scaleX = scene.sizer.width / this.game.screenBaseSize.width
        const scaleY = scene.sizer.height / this.game.screenBaseSize.height

        camera.setZoom(Math.max(scaleX, scaleY))
        camera.centerOn(this.game.screenBaseSize.width / 2, this.game.screenBaseSize.height / 2)
    }
}