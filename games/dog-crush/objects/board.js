import GameConstants from "../data/constants.js";
import levels from "../data/data.js";
import { BoardBorder } from "./board-border.js";
import { Tile } from "./tile.js";

// Breathing room between the board and the edges of the space it is given.
const BOARD_MARGIN = 24;

// A cell's artwork is drawn a little smaller than the cell it belongs to, so the
// slab shows through as a gap between one cell and the next, and between the
// outer cells and the frame around them.
const CELL_FIT = .95;

export class Board extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.levelData = levels[scene.level || 1];

        this.columns = this.levelData.cols;
        this.rows = this.levelData.rows;

        this.tileWidth = this.levelData.tileWidth;
        this.tileHeight = this.levelData.tileHeight;
        this.tileScale = this.levelData.tileScale;
        this.tileTypes = this.levelData.tileTypes;

        this.offsetX = -(this.columns * this.tileWidth) / 2 + this.tileWidth / 2;
        this.offsetY = -(this.rows * this.tileHeight) / 2 + this.tileHeight / 2;

        this.tiles = [];
        this.tilesPool = [];

        this.fallOrder = 1;
        this.tweenSpeed = 200;
        this.fallDelay = 300;

        // Swap feel. A swap is the one move the player actually makes, so it
        // carries a little weight: the two tiles pull away, coast, and settle
        // just past the cell before easing back into it. The overshoot is small
        // on purpose - enough to feel sprung, not enough to read as a wobble.
        // A swap that finds nothing comes back harder and faster: the bounce is
        // the refusal, and holding it any longer just makes the board feel slow.
        this.pressedTile = null;

        this.swapEase = "Back.easeOut";
        this.swapEaseParams = [1.1];
        this.swapBackSpeed = 170;
        this.swapBackEase = "Back.easeOut";
        this.swapBackEaseParams = [1.7];

        // Drop feel - time for a single cell of free fall, a ceiling so a full
        // column drop never drags, and how much a tile squashes when it lands.
        this.fallTimePerCell = 190;
        this.fallMaxDuration = 620;
        this.landSquash = .16;
        this.hintDelay = 4000;

        // TNT. A horizontal run crossing a vertical one leaves a charge standing
        // where they cross instead of clearing that cell, and setting the charge
        // off blows out the block of cells around it. Two charges swapped into
        // each other throw a wider blast, and any charge caught in a blast goes
        // off as well.
        this.tntFrame = "tnt";
        this.tntRadius = 1;
        this.tntPairRadius = 2;

        // Rockets. A straight run of four leaves a rocket lying along it, so a
        // row of four leaves one that flies left and right and a column of four
        // leaves one that flies up and down. Setting it off clears every cell in
        // the line it travels, a cell at a time as it passes over them.
        this.rocketFrames = {
            [GameConstants.ROCKET_H]: "rocket_h",
            [GameConstants.ROCKET_V]: "rocket_v",
        };
        this.rocketThreshold = 4;

        // How much bigger than a food a rocket is drawn, on the board and in
        // flight. Everything else standing in a cell is measured against this
        // level's foods and matched to them, but a rocket that sits at exactly
        // a food's size reads as another item rather than as the thing about to
        // go off - it wants to be overflowing its cell a little.
        this.rocketSwell = 1;

        // How long the rocket takes to cross one cell, how far past the edge of
        // the board it carries on before it is thrown away, and how hard it
        // shoves the items lying to either side of its lane as it goes by.
        this.rocketFlightPerCell = 55;
        this.rocketOverrun = 2;
        this.rocketWake = .5;

        // The puffs of stars the rocket leaves behind it - one every this many
        // milliseconds of flight.
        this.rocketTrailAnim = "rocket_trail";
        this.rocketTrailFrames = 11;
        this.rocketTrailRate = 26;
        this.rocketTrailEvery = 40;

        // The magnet. A straight run of five or more leaves one. Setting it off
        // takes every item of a single food off the board at once, wherever they
        // are standing: the food it was swapped into, or - tapped on its own, or
        // swapped into another magnet - whichever food there is most of.
        this.magnetFrame = "magnet";
        this.magnetThreshold = 5;

        // How long the items are in the air on their way to the magnet, and the
        // gap between one leaving and the next, so a colour comes off the board
        // as a stream rather than all on one frame.
        this.magnetPullTime = 420;
        this.magnetPullStagger = 45;

        // Lightning. A two by two square of the same food leaves one - the one
        // shape that is neither a straight run nor a cross. Setting it off does
        // not clear a shape at all: the sky opens over the board and a bolt
        // comes down on a food one of the customers is still waiting for, so it
        // is spent on the order rather than on wherever it happened to be
        // standing.
        this.lightningFrame = "lighting";

        // How many items one bolt takes. Each one is a separate strike on a
        // separate cell, and no more are called than the orders still want - a
        // customer three items from done is never handed five.
        this.lightningStrikes = 3;

        // The sky darkening before the first bolt, the gap between one strike
        // and the next, and how long a bolt is on screen before the cell it
        // landed on gives way.
        this.lightningWindUp = 220;
        this.lightningStagger = 190;
        this.lightningStrikeTime = 90;

        // How the bolt is drawn: how far above the board it starts, how far it
        // wanders to either side on its way down, and how long a segment of it
        // runs before it kinks. All in cells.
        this.lightningDrop = 6;
        this.lightningWander = .55;
        this.lightningSegment = .6;

        // The bolt's own colours - the hot core and the wider glow around it -
        // and how long the whole flash lasts.
        this.lightningCore = 0xffffff;
        this.lightningGlow = 0x8fd4ff;
        this.lightningFlash = 260;

        // Crates. A crate opens showing box2 and takes two hits to break: a
        // match landing next to it knocks it back to box1, and the next one
        // breaks it open and hands the cell back to the board. It is only ever
        // hit from the side - a match cannot be made on the crate itself.
        this.blockerFrames = ["box1", "box2"];

        // A crate is drawn wider than it is tall - it sits in its cell like a
        // box pushed down into it rather than a food standing in it. Everything
        // that touches a crate's scale goes through setBlockerScale, so the
        // stretch survives a knock, a squash and the copy that plays the break.
        this.blockerStretch = 1.2;
        this.blockerHits = this.blockerFrames.length;
        this.blockerBreakAnim = "cube_box_break";
        this.blockerBreakFrames = 19;
        this.blockerBreakRate = 45;

        // How wide the break plays against a cell, in cells, measured across the
        // whole authored canvas.
        //
        // It has to be this big. The splinters are drawn small on a canvas far
        // wider than the ground they ever cover, so fitting that canvas to a
        // cell or two - which is what the number looks like it should be - puts
        // chunks on screen a few pixels across and the break reads as nothing
        // happening. At five the chunks come out the size of a bite of food,
        // which is the size a splinter off a crate should be.
        this.blockerBreakSpread = 5;

        // The beat between the crate giving and the crate going. Everything
        // that reads as the break itself waits this long, so the box is seen to
        // buckle first - without it the whole thing lands on one frame and the
        // eye gets a flash with nothing leading into it.
        this.blockerWindUp = 70;

        // How long the four pieces of the box are in the air, and how far out
        // and up they are thrown, in cells.
        this.blockerShardTime = 520;
        this.blockerShardThrow = .78;
        this.blockerShardLift = .62;

        // Ice. A cell can open with its food frozen into a block. It is the
        // other half of the crate: a crate stands in a cell instead of food and
        // is broken from the side, while ice leaves the food where it is and is
        // broken from on top - the frozen item still counts in a run and can
        // still be matched where it stands. What the ice takes away is the
        // move: it cannot be picked up or swapped, it never falls, and nothing
        // falls through it, so a frozen cell is a wall that the player can
        // dissolve by making a match on the food inside it.
        //
        // The match goes into the ice rather than into the food. The first one
        // cracks the block and leaves the food standing; the one that takes the
        // last layer shatters it and lets the food be collected with the rest of
        // the run. Thinnest layer first, so the artwork is read off what is left
        // exactly the way a crate's is - one more entry here is one more layer,
        // and nothing else changes.
        this.iceFrames = ["ice_cracked", "ice_solid"];
        this.iceHits = this.iceFrames.length;

        // The ice artwork carries its own colour, so it is drawn untinted. A
        // level can still be given colder or warmer ice by this alone.
        this.iceTint = 0xffffff;
        this.iceAlpha = 1;

        // The shatter: how many pieces come off the block, how long they are in
        // the air, and how far out and up they are thrown, in cells.
        this.iceShardTime = 420;
        this.iceShardThrow = .55;
        this.iceShardLift = .45;

        // Pizza. A second kind of crate: a box with a pizza in it, standing in
        // its cell the way a crate does. Every match next to it takes a slice
        // out of the box and sends it to whoever ordered pizza, so it is broken
        // and collected by the same moves. The box goes with the last slice.
        //
        // Fewest slices first, so the art is read off what is left exactly the
        // way a crate's is. "Pizza" is the whole one, and is also the name an
        // order at the counter asks for.
        this.pizzaFrames = ["pizza_1", "pizza_2", "pizza_3", "Pizza"];
        this.pizzaBox = "pizza_box";
        this.pizzaGoal = "Pizza";

        // How big the box and the pizza are drawn, in cells, measured across
        // each image's whole canvas.
        this.pizzaBoxSize = 1.05;
        this.pizzaSize = .92;

        // How long the board is held still while the bomb plays, before the
        // cells it cleared start refilling.
        this.blastHold = 260;

        // How far the bomb artwork spills past the cells the blast actually
        // took. 1 would draw it exactly to the edge of the crater, which reads
        // as too small - an explosion is bigger than the hole it leaves. This is
        // the knob for the size of the blast on screen; it changes nothing about
        // which cells are cleared.
        this.blastSpread = 1.6;

        // How long one item takes to slide one cell diagonally into a hole. Kept
        // level with a one cell fall so an item that comes in from the side moves
        // at the same speed as one coming straight down beside it.
        this.sideDropSpeed = this.fallTimePerCell;

        // How often the cascade looks for the next thing that can move. Short
        // enough that an item finishing a slide is claimed by the hole under it
        // while it is still moving, rather than stopping and setting off again.
        this.cascadeTick = 30;
        this.activeSideDrops = 0;

        // Flags
        this.canClick = true;
        this.gameStarted = true;
        this.gameEnded = false;
        this.isAutoMatching = false;

        // The pair of tiles the player last moved, kept only long enough for a
        // run of four or more to decide which cell keeps the charge.
        this.lastSwap = null;

        this.init();
    }

    // A board is thrown away whole when the level changes, but the cascade it
    // was running is a chain of awaits that carries on resolving afterwards.
    // Every step of it checks here before touching the scene again.
    get alive() {
        return !!this.scene && !this.retired;
    }

    adjust() {

        const boardWidth = this.columns * this.tileWidth;
        const boardHeight = this.rows * this.tileHeight;

        // Never wider than the visible area, never bigger than its artwork.
        const availableWidth = Math.min(dimensions.actualWidth, dimensions.gameWidth) - 40;
        let availableHeight = Math.min(dimensions.actualHeight, dimensions.gameHeight) - 140;
        let fit = .9;

        this.x = dimensions.gameWidth / 2;

        if (dimensions.isLandscape) {

            // The stall owns the top of the screen, so the board centres itself
            // in the strip left underneath it instead of on the whole screen -
            // centring on the screen would run it up behind the counter.
            const top = this.scene.topPanel ? this.scene.topPanel.getContentBottom() : dimensions.topOffset;
            const bottom = dimensions.bottomOffset;

            this.y = top + (bottom - top) / 2;

            // The margin is already taken out here, so the strip is used in full.
            availableHeight = Math.min(availableHeight, (bottom - top) - BOARD_MARGIN);
            fit = 1;

        } else {
            this.y = dimensions.gameHeight / 2 + 200 - dimensions.topOffset / 2;
        }

        // The frame overhangs the grid, so it is the frame that has to fit -
        // fitting the grid alone left the frame running off the bottom.
        const contentWidth = Math.max(boardWidth, this.boardFrame.displayWidth);
        const contentHeight = Math.max(boardHeight, this.boardFrame.displayHeight);

        const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
        this.setScale(scale * fit);

        this.createMask();
    }

    init() {

        // Authored row by row, used column first.
        this.pattern = this.transposeArray(this.levelData.pattern);

        // Drawn from the pattern, so the frame follows whatever shape the level
        // is - holes included - instead of coming from one fixed piece of art.
        this.boardFrame = new BoardBorder(this.scene, this);

        // The frame goes down in two passes with the cells in between: the slab
        // first, then the cell artwork on top of it, then the bars and corners
        // last so the frame closes over the cells sitting against it.
        this.add(this.boardFrame.fillLayer);

        this.boxGrp = this.scene.add.container();
        this.add(this.boxGrp);

        this.add(this.boardFrame.frameLayer);

        this.tileGrp = this.scene.add.container();
        this.add(this.tileGrp);

        this.fxGrp = this.scene.add.container();
        this.add(this.fxGrp);

        this.createTiles();
        this.createLevel();

        const zone = this.scene.add.zone(this.offsetX - this.tileWidth / 2, this.offsetY - this.tileHeight / 2, this.columns * this.tileWidth, this.rows * this.tileHeight).setOrigin(0).setInteractive();
        this.add(zone);

        zone.on('pointerdown', function(pointer) {
            this.onTap(pointer, zone);
        }.bind(this));

        // Kept so the listener can be taken off the scene again when the board
        // is thrown away between levels - a dead board still answering pointerup
        // would keep swapping tiles that no longer exist.
        this.onPointerUp = function(pointer) {
            this.onTapUp(pointer, zone);
        }.bind(this);

        this.scene.input.on('pointerup', this.onPointerUp);

        this.startHintTimer();
    }

    createTiles() {

        let startX = this.offsetX;

        for (let i = 0; i < this.columns; i++) {
            this.tiles[i] = [];
            let startY = this.offsetY;

            for (let j = 0; j < this.rows; j++) {

                let box = this.scene.add.sprite(startX, startY, "sheet", this.levelData.cellTile);
                box.setOrigin(0.5);
                box.setScale(this.tileScale * CELL_FIT);
                this.boxGrp.add(box);

                let tile = new Tile(this.scene, startX, startY);
                tile.setScale(this.tileScale);
                this.tileGrp.add(tile);

                tile.xPos = tile.x;
                tile.yPos = tile.y;

                tile.type = 0;
                tile.level = GameConstants.NORMAL;
                tile.special = null;
                tile.frozen = 0;
                tile.box = box;
                tile.i = i;
                tile.j = j;

                tile.dropTween = function(tile, y, callback) {

                    // Gravity can claim an item that is still sliding in
                    // diagonally. Two tweens on one sprite would fight over x,
                    // so this one takes the sideways travel over and carries it
                    // into the fall instead of leaving it half a cell out.
                    let slideX;

                    if (tile.sideDropTween) {
                        this.stopSideDrop(tile);
                        slideX = tile.x;
                    }

                    this.stopDropTweens(tile);

                    tile.xPos = this.getXFromCol(tile.i);

                    // The same again for a fall that is re-aimed part way down,
                    // because the cell under it was cleared too. Its own carry
                    // is stopped with it, and there is no side drop left to read
                    // the travel off - so it is taken from where the item
                    // actually is, or it is left off its column for good.
                    if (slideX === undefined && Math.abs(tile.x - tile.xPos) > 1) slideX = tile.x;

                    const oldY = tile.y;
                    const distance = Math.abs(oldY - y) / this.tileHeight;

                    // Free fall - the time grows with the square root of the distance,
                    // not with the distance itself, so tiles sharing a column keep the
                    // gap they started with instead of the upper one closing in on the
                    // lower one halfway down.
                    const fallDuration = Phaser.Math.Clamp(
                        this.fallTimePerCell * Math.sqrt(distance),
                        this.fallTimePerCell / 2,
                        this.fallMaxDuration
                    );

                    // A one cell nudge barely reacts, a full column drop lands hard.
                    const impact = Phaser.Math.Clamp(distance / 4, .3, 1);

                    // What is left of the sideways travel is spent early in the
                    // fall rather than held all the way down, so the item is back
                    // over its column well before it lands.
                    const carry = slideX === undefined ? null : {
                        from: slideX,
                        to: tile.xPos,
                        duration: Math.min(fallDuration, this.sideDropSpeed * .6),
                        ease: 'Sine.easeOut'
                    };

                    tile.tween = this.scene.tweens.add({
                        targets: tile,
                        y: { from: oldY, to: y },
                        ...(carry ? { x: carry } : {}),
                        duration: fallDuration,
                        ease: 'Quad.easeIn',
                        onComplete: () => {

                            tile.tween = "";
                            tile.yPos = y;
                            tile.y = y;

                            // Whatever the carry did or did not get through, an
                            // item that has landed is on its column.
                            tile.x = tile.xPos;

                            // The level can change while tiles are still falling.
                            // The board they belong to is gone by the time they
                            // land - there is nothing left to bounce against, and
                            // nothing waiting on the callback either.
                            if (!this.scene) return;

                            this.bounceTile(tile, y, impact);

                            callback();
                        }
                    });

                    return distance;
                }.bind(this, tile);

                this.tiles[i][j] = tile;
                startY += this.tileHeight;
            }
            startX += this.tileWidth;
        }
    }

    // Both halves of a drop have to be cleared before anything else moves a tile.
    // The landing bounce leaves it off its cell centre and squashed, so it is put
    // back on its cell first - the fall itself is left where it is, its target is
    // recalculated from there.
    // The shove a blast gives a tile it did not take. Cosmetic, and dropped the
    // moment anything with a real claim on the tile's position wants it back.
    stopShockwave(tile) {

        if (!tile || !tile.shockTween) return;

        tile.shockTween.stop();
        tile.shockTween = "";

        tile.x = tile.xPos;
        tile.y = tile.yPos;
    }

    stopDropTweens(tile) {

        this.stopShockwave(tile);

        if (tile.tween) {
            tile.tween.stop();
            tile.tween = "";
        }

        if (tile.landTween) {
            tile.landTween.stop();
            tile.landTween = "";
            tile.y = tile.yPos;
            tile.setScale(this.tileScale);
        }
    }

    // The settle an item does once it has arrived on its cell, whether it got there
    // by falling or by sliding in from the side. Cancellable: a chute that carries
    // on takes the bounce off again on its next step, so only the item that has
    // actually come to rest is seen to bounce.
    bounceTile(tile, y, impact) {

        const dip = this.tileHeight * .055 * impact;
        const hop = this.tileHeight * .09 * impact;
        const squash = this.landSquash * impact;

        tile.landTween = this.scene.tweens.chain({
            targets: tile,
            tweens: [
                // Hits the cell and compresses against it.
                {
                    y: y + dip,
                    scaleX: this.tileScale * (1 + squash),
                    scaleY: this.tileScale * (1 - squash),
                    duration: 60 + 40 * impact,
                    ease: 'Quad.easeOut',
                },
                // Springs back out and lifts a little.
                {
                    y: y - hop,
                    scaleX: this.tileScale * (1 - squash * .4),
                    scaleY: this.tileScale * (1 + squash * .4),
                    duration: 80 + 50 * impact,
                    ease: 'Sine.easeOut',
                },
                // Falls back onto the cell and settles.
                {
                    y: y,
                    scaleX: this.tileScale,
                    scaleY: this.tileScale,
                    duration: 90 + 50 * impact,
                    ease: 'Quad.easeIn',
                }
            ],
            onComplete: () => {
                tile.landTween = "";
                tile.y = y;
                tile.setScale(this.tileScale);
            }
        });
    }

    // A slide is stopped through here and nowhere else: the count of items still
    // travelling sideways is what tells the cascade the board is not at rest yet,
    // and a slide dropped without going through here leaves that count too high.
    stopSideDrop(tile) {

        if (!tile || !tile.sideDropTween) return;

        tile.sideDropTween.stop();
        tile.sideDropTween = "";
        this.activeSideDrops--;
    }

    transposeArray(original) {

        const rows = original.length;
        const cols = original[0].length;

        const transposed = [];
        for (let j = 0; j < cols; j++) {
            transposed[j] = [];
            for (let i = 0; i < rows; i++) {
                transposed[j][i] = original[i][j];
            }
        }

        return transposed;
    }

    createLevel() {

        this.boardStatus = [];

        for (let i = 0; i < this.columns; i++) {
            this.boardStatus[i] = [];

            for (let j = 0; j < this.rows; j++) {

                const tile = this.tiles[i][j];

                if (this.pattern[i][j] === GameConstants.EMPTY) {
                    tile.level = GameConstants.EMPTY;
                    this.boardStatus[i][j] = GameConstants.EMPTY;
                    tile.box.visible = false;
                    tile.visible = false;
                } else if (this.pattern[i][j] === GameConstants.BLOCKER) {

                    // The cell opens sealed under a crate. No food is rolled for
                    // it - the crate is what stands there until it is broken.
                    this.makeBlocker(tile);

                } else if (this.pattern[i][j] === GameConstants.PIZZA) {

                    // A crate that is a pizza box - sealed the same way, but
                    // every hit it takes is a slice for the counter.
                    this.makeBlocker(tile, "pizza");

                } else if (this.pattern[i][j] === GameConstants.ICE) {

                    // The cell opens frozen. Food is still rolled for it - the
                    // ice is laid over an ordinary cell, and the cell goes on
                    // being an ordinary one underneath, which is why it is
                    // NORMAL here and not a status of its own.
                    this.boardStatus[i][j] = GameConstants.NORMAL;
                    this.setRandomTile(tile);
                    this.makeIce(tile);

                } else {
                    this.boardStatus[i][j] = GameConstants.NORMAL;
                    this.setRandomTile(tile);

                    // The level asked for a charge, a rocket or a magnet on this
                    // cell, so the board opens with one standing there instead
                    // of waiting for the run that would have earned it.
                    const opener = this.patternSpecial(this.pattern[i][j]);
                    if (opener) this.makeSpecial(tile, opener, false);
                }
            }
        }

        this.clearStartingMatches();
    }

    // A fresh board should be waiting for the player, not resolving itself: reroll
    // anything that is already three in a row before the first frame is drawn.
    clearStartingMatches() {

        let attempts = 0;

        while (attempts < 100) {
            const matches = this.findAllMatches(this.tiles);
            if (!matches.length) break;

            matches.forEach(match => {
                match.tiles.forEach(tile => {

                    // Rerolling a cell deals it a fresh tile, which comes
                    // without ice. A frozen cell that happens to open in a run
                    // is rerolled the same as any other and then frozen again -
                    // the ice belongs to the cell, not to the food in it.
                    const frozen = tile.frozen;

                    this.setRandomTile(tile);

                    if (frozen) this.makeIce(tile);
                });
            });

            attempts++;
        }
    }

    setRandomTile(tile) {

        this.setTileType(tile, Phaser.Math.Between(0, this.tileTypes.length - 1));
    }

    setTileType(tile, type) {

        tile.type = type;
        tile.special = null;

        // A tile dealt out of the pool must not still be wearing the ice of the
        // cell it came from - freezing is done to a cell after it is filled,
        // never carried into one.
        this.clearIce(tile);

        tile.level = GameConstants.NORMAL;
        tile.setScale(this.tileScale);
        tile.alpha = 1;
        tile.angle = 0;
        tile.visible = true;
        tile.changeAsset(this.tileTypes[type]);
    }

    onTap() {

        if (!this.canClick) return;
        if (!this.gameStarted) return;
        if (this.gameEnded) return;

        this.selectedTile = this.getTileUnderMouse();

        if (!this.selectedTile) return;

        this.hideHint();
        this.scene.playSounds("tap");

        if (!this.canSwapTile(this.selectedTile)) {
            this.selectedTile = null;
            return;
        }

        this.pressTile(this.selectedTile);
    }

    // The tile the finger is on gives a little under it and lifts again, so a
    // press is answered by the board and not only by the sound. It settles at a
    // hair over rest rather than back at it - the picked tile stays the one that
    // is standing slightly proud of the others until it is let go.
    pressTile(tile) {

        this.releasePress();

        this.pressedTile = tile;

        tile.pressTween = this.scene.tweens.chain({
            targets: tile,
            tweens: [
                {
                    scaleX: this.tileScale * 1.08,
                    scaleY: this.tileScale * .92,
                    duration: 70,
                    ease: "Quad.easeOut",
                },
                {
                    scaleX: this.tileScale * 1.05,
                    scaleY: this.tileScale * 1.05,
                    duration: 130,
                    ease: "Back.easeOut",
                    easeParams: [1.8],
                }
            ],
            onComplete: () => { tile.pressTween = ""; }
        });
    }

    // Whatever happens next - a swap, a release, a tap that set a charge off -
    // the tile goes back to sitting flat on its cell. Anything that starts its
    // own tween on the tile is entitled to assume it is at rest.
    releasePress() {

        const tile = this.pressedTile;
        this.pressedTile = null;

        if (!tile || !tile.scene) return;

        if (tile.pressTween) {
            tile.pressTween.stop();
            tile.pressTween = "";
        }

        tile.releaseTween = this.scene.tweens.add({
            targets: tile,
            scaleX: this.tileScale,
            scaleY: this.tileScale,
            duration: 120,
            ease: "Quad.easeOut",
            onComplete: () => {

                tile.releaseTween = null;

                // A tile that has since been matched, pooled and dealt again is
                // no longer this one's to size.
                if (tile.scene && !tile.landTween && !tile.squishTween) tile.setScale(this.tileScale);
            }
        });
    }

    // Hands the tile's scale over to whatever is about to animate it. A press is
    // still easing back for a moment after the finger leaves, and two tweens on
    // the same scale fight each other - the one that comes next always wins.
    clearPress(tile) {

        if (!tile) return;

        if (tile.pressTween) {
            tile.pressTween.stop();
            tile.pressTween = "";
        }

        if (tile.releaseTween) {
            tile.releaseTween.stop();
            tile.releaseTween = null;
        }

        if (this.pressedTile === tile) this.pressedTile = null;
    }

    async onTapUp() {

        if (!this.gameStarted) return;

        const tile = this.selectedTile;
        this.selectedTile = null;

        this.releasePress();

        // A charge, a rocket and a magnet do not need something to swap with - a
        // tap on the one the finger went down on, and is still over, is enough to
        // set it off.
        if (
            this.isCharge(tile) &&
            this.canClick && !this.gameEnded &&
            this.getTileUnderMouse() === tile
        ) {
            this.matched = true;
            this.canClick = false;
            this.hideHint();

            if (this.scene.moves) this.scene.moves.use(1);

            // The tap is answered before the blast is.
            await this.squishCharge(tile);
            if (!this.alive) return;

            this.detonate([tile], this.tntRadius);
            return;
        }

        if (!this.matched) this.startHintTimer();
    }

    getTileUnderMouse() {

        const mouse = this.scene.offsetMouse();

        mouse.x -= this.x;
        mouse.y -= this.y;

        mouse.x /= this.scaleX;
        mouse.y /= this.scaleY;

        mouse.x -= (this.offsetX - this.tileWidth / 2);
        mouse.y -= (this.offsetY - this.tileHeight / 2);

        const col = Math.floor(mouse.x / this.tileWidth);
        const row = Math.floor(mouse.y / this.tileHeight);

        if (row < 0 || col < 0 || row >= this.rows || col >= this.columns) return;

        return this.tiles[col][row];
    }

    swap(tile1, tile2) {

        const row1 = tile1.j;
        const col1 = tile1.i;

        const row2 = tile2.j;
        const col2 = tile2.i;

        tile2.i = col1;
        tile2.j = row1;

        tile1.i = col2;
        tile1.j = row2;

        this.tiles[tile1.i][tile1.j] = tile1;
        this.tiles[tile2.i][tile2.j] = tile2;
    }

    swapType(tile1, tile2) {

        const type = tile1.type;
        tile1.type = tile2.type;
        tile2.type = type;
    }

    swapBack(tile1, tile2) {

        const x1 = tile1.x;
        const x2 = tile2.x;
        const y1 = tile1.y;
        const y2 = tile2.y;

        this.scene.tweens.add({
            targets: tile1,
            x: x2,
            y: y2,
            ease: this.swapBackEase,
            easeParams: this.swapBackEaseParams,
            duration: this.swapBackSpeed,
        });

        this.scene.tweens.add({
            targets: tile2,
            x: x1,
            y: y1,
            ease: this.swapBackEase,
            easeParams: this.swapBackEaseParams,
            duration: this.swapBackSpeed,
            onComplete: () => {
                this.scene.playSounds("wrong_move");

                this.swap(tile2, tile1);

                tile1.xPos = tile1.x;
                tile1.yPos = tile1.y;   
                tile2.xPos = tile2.x;
                tile2.yPos = tile2.y;

                this.enable();
            }
        })
    }

    canSwapTile(tile) {

        if (!tile || !tile.visible) return false;
        if (tile.level === GameConstants.EMPTY) return false;
        if (this.boardStatus[tile.i][tile.j] === GameConstants.EMPTY) return false;
        if (this.boardStatus[tile.i][tile.j] === GameConstants.DESTROYED) return false;

        // A crate is scenery until it is broken - it cannot be picked up, and
        // nothing can be swapped into the cell it is sitting on.
        if (this.boardStatus[tile.i][tile.j] === GameConstants.BLOCKED) return false;
        if (this.isBlocker(tile)) return false;

        // Frozen food is food, but it is not going anywhere: it can be matched
        // where it stands and nothing else. Nothing may be swapped into its
        // cell either - the ice is in the way from both sides.
        if (this.isIced(tile)) return false;

        return true;
    }

    // Every straight run of three or more of the same food, horizontal and
    // vertical. Runs that cross each other come back separately - destroyTile
    // ignores a cell that has already gone, so the overlap costs nothing.
    findAllMatches(tiles) {

        const matches = [];

        const getType = (x, y) => {
            if (
                tiles[x] && tiles[x][y] &&
                // A charge is not a food - it lines up with nothing, so a run
                // stops at it rather than reading through it.
                !tiles[x][y].special &&
                this.boardStatus[x][y] !== GameConstants.DESTROYED &&
                this.boardStatus[x][y] !== GameConstants.BLOCKED &&
                this.boardStatus[x][y] !== GameConstants.EMPTY
            ) return tiles[x][y].type;
            return null;
        };

        // Which way the run lies is carried with it: it decides which way a
        // rocket earned by that run is pointed, and a cell that turns up in one
        // run of each is the cross that leaves a charge.
        const addRun = (run, horizontal) => {
            if (run.length >= 3) matches.push({ tiles: run.slice(), horizontal: horizontal });
        };

        // Horizontal
        for (let y = 0; y < this.rows; y++) {
            let run = [];
            let runType = null;

            for (let x = 0; x < this.columns; x++) {
                const type = getType(x, y);

                if (type !== null && type === runType) {
                    run.push(tiles[x][y]);
                } else {
                    addRun(run, true);
                    run = type === null ? [] : [tiles[x][y]];
                    runType = type;
                }
            }
            addRun(run, true);
        }

        // Vertical
        for (let x = 0; x < this.columns; x++) {
            let run = [];
            let runType = null;

            for (let y = 0; y < this.rows; y++) {
                const type = getType(x, y);

                if (type !== null && type === runType) {
                    run.push(tiles[x][y]);
                } else {
                    addRun(run, false);
                    run = type === null ? [] : [tiles[x][y]];
                    runType = type;
                }
            }
            addRun(run, false);
        }

        // Squares. A two by two block of one food is a match in its own right -
        // it is the only shape that is not a run, so it is found on its own
        // pass rather than falling out of the two above. Blocks that overlap
        // pay out once: a three by two is one square and not two.
        const claimed = new Set();

        for (let y = 0; y < this.rows - 1; y++) {
            for (let x = 0; x < this.columns - 1; x++) {

                const type = getType(x, y);

                if (type === null) continue;
                if (getType(x + 1, y) !== type) continue;
                if (getType(x, y + 1) !== type) continue;
                if (getType(x + 1, y + 1) !== type) continue;

                const block = [tiles[x][y], tiles[x + 1][y], tiles[x][y + 1], tiles[x + 1][y + 1]];

                if (block.some(tile => claimed.has(tile))) continue;

                block.forEach(tile => claimed.add(tile));

                matches.push({ tiles: block, horizontal: false, square: true });
            }
        }

        return matches;
    }

    findMatches() {

        return this.findAllMatches(this.tiles);
    }

    // delay separates the cell being taken from the cell being seen to go. A
    // rocket claims its whole lane on the frame it launches - nothing else may
    // start fighting it for those cells - but the items in that lane are only
    // cleared as it reaches them, and a magnet's haul only once it has pulled
    // each one in. The board is held still for the whole of it, so nothing is
    // ever dropped into a cell that is still waiting its turn.
    destroyTile(tile, order = 0, delay = 0) {

        if (tile.level === GameConstants.EMPTY) return;
        if (this.boardStatus[tile.i][tile.j] === GameConstants.DESTROYED) return;

        // A crate is only ever taken apart a stage at a time - it is never
        // cleared outright, whatever lands on it.
        if (this.isBlocker(tile)) return;

        // Ice takes the hit before the food does. While a layer is left the
        // food is not taken at all - the cell stays occupied and the match
        // simply costs the block a layer. The hit that shatters the last one
        // falls through to the clear below, so the move that opens the cell is
        // also the move that collects what was frozen in it.
        if (this.isIced(tile) && !this.crackIce(tile)) return;

        this.boardStatus[tile.i][tile.j] = GameConstants.DESTROYED;

        this.stopDropTweens(tile);

        // Pooled mid-slide it would keep tweening after another cell takes it over.
        this.stopSideDrop(tile);

        if (delay > 0) {

            this.scene.time.delayedCall(delay, () => {
                if (this.alive) this.clearTile(tile, order);
            });

            return;
        }

        this.clearTile(tile, order);
    }

    // The visible half of destroyTile: the item pops, flies off to whoever
    // ordered it, and the tile goes back in the pool for the next fall.
    clearTile(tile, order = 0) {

        // A charge is not on anybody's order, so there is nothing to fly off.
        const frame = tile.special ? null : this.tileTypes[tile.type];

        // Food somebody ordered flies to them instead of popping on the spot.
        const collected = frame ? this.scene.collectTile(frame, tile.x, tile.y, order) : false;

        this.showMatchFx(tile, collected, frame);

        // A tile matched the moment it was let go still has the press easing
        // back on it. It goes into the pool at rest, or the next tile dealt out
        // of it inherits a tween it never asked for.
        this.clearPress(tile);

        tile.visible = false;
        tile.setScale(this.tileScale);
        this.clearIce(tile);
        this.tilesPool.push(tile);
    }

    ensureSparkleTexture() {

        if (this.scene.textures.exists("match_sparkle")) return;

        const size = 32;
        const half = size / 2;
        const g = this.scene.add.graphics();

        g.fillStyle(0xffffff, 1);
        g.beginPath();
        g.moveTo(half, 0);
  
        g.lineTo(half + 4, half - 4);
        g.lineTo(size, half);
        g.lineTo(half + 4, half + 4);
        g.lineTo(half, size);
        g.lineTo(half - 4, half + 4);
        g.lineTo(0, half);

        g.lineTo(half - 4, half - 4);
        g.closePath();
        g.fillPath();

        g.generateTexture("match_sparkle", size, size);
        g.destroy();
    }

    // A collected tile keeps its own copy flying off to the customer, so only the
    // sparkles are left here - the pop and fade would be a second, doubled item.
    showMatchFx(tile, collected = false, frame = null) {

        this.ensureSparkleTexture();

        if (!collected && frame) {

            const fx = this.scene.add.sprite(tile.x, tile.y, "sheet", frame);
            fx.setOrigin(0.5);
            fx.setScale(this.tileScale * 0.6);
            this.fxGrp.add(fx);

            this.scene.tweens.chain({
                targets: fx,
                tweens: [{
                        scale: this.tileScale * 1.35,
                        duration: 90,
                        ease: "Back.easeOut",
                    },
                    {
                        scale: this.tileScale * 1.15,
                        alpha: 0,
                        duration: 180,
                        ease: "Sine.easeIn",
                    }
                ],
                onComplete: () => {
                    fx.destroy();
                }
            });
        }

        this.showMatchBurst(tile.x, tile.y);
    }

    // The default is a match popping. Anything that wants to read as bigger or
    // smaller than that - a crate chipped, a crate opened - says so here rather
    // than throwing a second burst on top of this one.
    showMatchBurst(x, y, size = {}) {

        // Same trap as the blast ring: if the sparkle texture is not there, the
        // sparks come out as Phaser's green "missing texture" squares. Better no
        // sparkle at all than a burst of those.
        if (!this.scene.textures.exists("match_sparkle")) return;

        const sparkCount = size.count || 7;
        const sparkRadius = size.radius || this.tileWidth * 0.7;
        const sparkScale = size.scale || 1;

        for (let i = 0; i < sparkCount; i++) {

            const angle = (Math.PI * 2 * i) / sparkCount + Phaser.Math.FloatBetween(-0.25, 0.25);
            const startScale = Phaser.Math.FloatBetween(0.35, 0.7) * sparkScale;

            const spark = this.scene.add.sprite(x, y, "match_sparkle");
            spark.setScale(0);
            spark.setAngle(Phaser.Math.Between(0, 360));
            spark.setBlendMode(Phaser.BlendModes.ADD);
            this.fxGrp.add(spark);

            const targetX = x + Math.cos(angle) * sparkRadius;
            const targetY = y + Math.sin(angle) * sparkRadius;
            const flightDuration = 300 + Phaser.Math.Between(0, 80);

            // Twinkle in fast, then twinkle back out - the pop, not a fade.
            this.scene.tweens.chain({
                targets: spark,
                tweens: [{
                        scale: startScale,
                        duration: flightDuration * 0.35,
                        ease: "Back.easeOut",
                    },
                    {
                        scale: 0,
                        duration: flightDuration * 0.65,
                        ease: "Sine.easeIn",
                    }
                ]
            });

            this.scene.tweens.add({
                targets: spark,
                x: targetX,
                y: targetY,
                angle: spark.angle + Phaser.Math.Between(-90, 90),
                duration: flightDuration,
                ease: "Cubic.easeOut",
                onComplete: () => {
                    spark.destroy();
                }
            });
        }
    }

    checkRightTop(tile) {

        const row = tile.j;
        const col = tile.i;

        if (col === this.columns - 1) return false;
        if (row === 0) return false;

        // Frozen food is held in its cell, so there is nothing up there to
        // come down the diagonal even though the cell itself is occupied.
        if (this.isIced(this.tiles[col + 1][row - 1])) return false;

        return (
            this.boardStatus[col + 1][row - 1] !== GameConstants.EMPTY &&
            this.boardStatus[col + 1][row - 1] !== GameConstants.BLOCKED &&
            this.boardStatus[col + 1][row - 1] !== GameConstants.DESTROYED
        );
    }

    checkLeftTop(tile) {

        const row = tile.j;
        const col = tile.i;

        if (col === 0) return false;
        if (row === 0) return false;

        if (this.isIced(this.tiles[col - 1][row - 1])) return false;

        return (
            this.boardStatus[col - 1][row - 1] !== GameConstants.EMPTY &&
            this.boardStatus[col - 1][row - 1] !== GameConstants.BLOCKED &&
            this.boardStatus[col - 1][row - 1] !== GameConstants.DESTROYED
        );
    }

    // Starts every straight fall that can begin now and returns as soon as they are
    // under way: the pass that follows is free to send the next item down the same
    // column while this one is still in the air.
    fillEmpty() {

        if (!this.alive) return false;

        let isDrop = false;

        for (let col = 0; col < this.columns; col++) {
            for (let row = this.rows - 1; row >= 0; row--) {

                if (!this.tiles[col][row]) continue;
                if (this.boardStatus[col][row] !== GameConstants.DESTROYED) continue;

                for (let k = row - 1; k >= 0; k--) {

                    const tileAbove = this.tiles[col][k];

                    if (!tileAbove || this.boardStatus[col][k] === GameConstants.DESTROYED) continue;

                    // An empty cell is a wall - nothing falls through it, and
                    // a crate standing in the column is the same wall.
                    if (this.boardStatus[col][k] === GameConstants.EMPTY) break;
                    if (this.boardStatus[col][k] === GameConstants.BLOCKED) break;

                    // Frozen food is a wall of the same kind: it will not come
                    // down itself, and nothing gets past it on its way down.
                    if (this.isIced(tileAbove)) break;

                    isDrop = true;

                    this.tiles[col][row] = tileAbove;
                    this.boardStatus[col][k] = GameConstants.DESTROYED;

                    tileAbove.j = row;
                    this.boardStatus[col][row] = GameConstants.NORMAL;

                    tileAbove.dropTween(this.getYFromRow(row), () => {});

                    break;
                }
            }
        }

        return isDrop;
    }

    // Looks for items that can slide diagonally into a hole and starts them. Like
    // fillEmpty it returns as soon as the moves are under way.
    checkForSideDrop() {

        if (!this.alive) return false;

        let moved = false;

        for (let col = 0; col < this.columns; col++) {
            for (let row = this.rows - 1; row >= 1; row--) {

                if (!this.tiles[col][row]) continue;
                if (this.boardStatus[col][row] !== GameConstants.DESTROYED) continue;

                // Only a cell sealed off from its own column is filled sideways -
                // whether what seals it is a hole or a crate.
                if (
                    this.boardStatus[col][row - 1] !== GameConstants.EMPTY &&
                    this.boardStatus[col][row - 1] !== GameConstants.BLOCKED &&
                    !this.isIced(this.tiles[col][row - 1])
                ) continue;

                if (col < this.columns - 1 && this.checkRightTop({ i: col, j: row })) {

                    if (this.startSideDrop(this.tiles[col + 1][row - 1], col, row)) moved = true;

                } else if (col > 0 && this.checkLeftTop({ i: col, j: row })) {

                    if (this.startSideDrop(this.tiles[col - 1][row - 1], col, row)) moved = true;
                }
            }
        }

        return moved;
    }

    // Slides one item diagonally into (col, row); returns whether it moved. An item
    // that is still sliding from the last pass is re-aimed from wherever it has got
    // to rather than made to land first, so a chute of items flows instead of stepping.
    startSideDrop(tile, col, row) {

        if (!tile) return false;

        // Nothing slides out of a frozen cell.
        if (this.isIced(tile)) return false;

        const chaining = !!tile.sideDropTween;

        if (chaining) this.stopSideDrop(tile);

        this.boardStatus[tile.i][tile.j] = GameConstants.DESTROYED;
        this.boardStatus[col][row] = GameConstants.NORMAL;
        this.tiles[col][row] = tile;

        tile.i = col;
        tile.j = row;

        this.stopDropTweens(tile);

        const newX = this.getXFromCol(col);
        const newY = this.getYFromRow(row);

        // Timed from how far it still has to travel rather than given a flat
        // duration, so an item re-aimed halfway down a chute keeps the speed it
        // already had instead of taking a whole fresh slide over the last half.
        const step = Math.hypot(this.tileWidth, this.tileHeight);
        const distance = Math.hypot(newX - tile.x, newY - tile.y);

        const duration = Phaser.Math.Clamp(
            this.sideDropSpeed * (distance / step),
            this.sideDropSpeed * .25,
            this.sideDropSpeed * 2
        );

        // An item starting from rest has to pick up speed, one already sliding
        // must not be made to slow down and set off again at every hole it
        // passes - that stepping is what a chute of items reads as.
        const ease = chaining ? 'Linear' : 'Quad.easeIn';

        this.activeSideDrops++;

        tile.sideDropTween = this.scene.tweens.add({
            targets: tile,
            x: newX,
            y: newY,
            duration: duration,
            ease: ease,
            onComplete: () => {

                tile.sideDropTween = "";
                this.activeSideDrops--;

                tile.x = newX;
                tile.y = newY;
                tile.xPos = newX;
                tile.yPos = newY;

                if (!this.scene) return;

                // Lands like anything else that arrives on a cell. If the chute
                // carries on, the next step cancels this before it is seen.
                this.bounceTile(tile, newY, .3);
            }
        });

        return true;
    }

    // True while anything is still travelling to the cell it already owns on the grid.
    isFalling() {

        if (this.activeSideDrops > 0) return true;

        for (let col = 0; col < this.columns; col++) {
            for (let row = 0; row < this.rows; row++) {

                const tile = this.tiles[col][row];
                if (tile && tile.tween && tile.tween.isPlaying && tile.tween.isPlaying()) return true;
            }
        }

        return false;
    }

    // Waits for the board to come to rest on screen. Capped: a tween that never
    // reports done must not be able to hang the turn with the board locked.
    async waitForFall(timeout = 2000) {

        const started = Date.now();

        while (this.isFalling() && Date.now() - started < timeout) {

            await this.wait(this.cascadeTick);
            if (!this.alive) return;
        }
    }

    populateItems() {

        for (let col = 0; col < this.columns; col++) {
            let emptyCount = 0;

            for (let row = 0; row < this.rows; row++) {

                if (this.boardStatus[col][row] === GameConstants.EMPTY) break;
                if (this.boardStatus[col][row] === GameConstants.BLOCKED) break;
                // Only the unbroken run of holes at the top belongs to us. A hole
                // trapped under a tile that is still on the board is filled by the
                // next fillEmpty pass - spawning into it here would leave two
                // items sitting in the same cell.
                if (this.boardStatus[col][row] !== GameConstants.DESTROYED) break;

                emptyCount++;
            }

            this.spawnNewTilesInColumn(col, emptyCount);
        }

        for (let col = 0; col < this.columns; col++) {
            let emptyCount = 0;
            const rowStart = this.findMiddleStart(col);

            for (let row = rowStart; row < this.rows; row++) {

                if (this.boardStatus[col][row] === GameConstants.EMPTY) break;
                if (this.boardStatus[col][row] !== GameConstants.DESTROYED) break;

                emptyCount++;
            }

            this.spawnNewTilesInSpace(col, rowStart, emptyCount);
        }
    }

    // A cell sealed off from the top of its own column but with nothing left to
    // slide in from the sides either - new items have to be dropped straight into it.
    findMiddleStart(col) {

        for (let row = 1; row < this.rows; row++) {

            if (this.boardStatus[col][row] !== GameConstants.DESTROYED) continue;

            // A crate overhead seals a cell off exactly as a hole does, so it
            // counts as a wall on both of the diagonals as well.
            const sealed = (c, r) =>
                this.boardStatus[c][r] === GameConstants.EMPTY ||
                this.boardStatus[c][r] === GameConstants.BLOCKED ||
                this.isIced(this.tiles[c][r]);

            if (col === 0) {
                if (sealed(col + 1, row - 1)) return row;
            } else if (col === this.columns - 1) {
                if (sealed(col - 1, row - 1)) return row;
            } else if (sealed(col - 1, row - 1) && sealed(col + 1, row - 1)) {
                return row;
            }
        }

        return this.rows;
    }

    spawnNewTilesInColumn(col, count) {

        for (let i = 0; i < count; i++) {

            const tile = this.tilesPool.pop();
            if (!tile) break; // nothing recycled yet, the cell is refilled next pass

            this.setRandomTile(tile);
            this.tileGrp.add(tile);

            const row = count - i - 1;

            tile.x = this.getXFromCol(col);
            tile.y = (-this.tileHeight * (i + 1)) + this.offsetY;

            tile.i = col;
            tile.j = row;
            tile.xPos = this.getXFromCol(col);
            tile.yPos = this.getYFromRow(row);

            this.tiles[col][row] = tile;
            this.boardStatus[col][row] = GameConstants.NORMAL;

            tile.dropTween(this.getYFromRow(row), () => {
                this.playFallSound();
            });
        }
    }

    spawnNewTilesInSpace(col, row, count) {

        const originY = this.getYFromRow(row) - this.tileHeight;

        for (let n = 0; n < count; n++) {

            const actualRow = row + (count - 1 - n);

            const tile = this.tilesPool.pop();
            if (!tile) break;

            this.setRandomTile(tile);
            this.tileGrp.add(tile);

            
            tile.x = this.getXFromCol(col);
            tile.y = (-this.tileHeight * n) + originY;

            tile.i = col;
            tile.j = actualRow;
            tile.xPos = this.getXFromCol(col);
            tile.yPos = this.getYFromRow(actualRow);

            this.tiles[col][actualRow] = tile;
            this.boardStatus[col][actualRow] = GameConstants.NORMAL;

            tile.dropTween(this.getYFromRow(actualRow), () => {
                this.playFallSound();
            });
        }
    }

    playFallSound() {

        if (!this.alive) return;

        this.scene.playSounds("item_fall_" + this.fallOrder);
        this.fallOrder++;
        if (this.fallOrder > 3) this.fallOrder = 1;
    }

    async checkForMatches() {

        if (!this.alive) return false;

        this.isAutoMatching = true;
        this.hideHint();

        const matches = this.findMatches();

        if (!matches.length) {
            this.isAutoMatching = false;
            this.enable();
            return false;
        }

        this.resolveMatches(matches);

        // The swap that started this has been paid for - anything the cascade
        // turns up from here on is nobody's move in particular.
        this.lastSwap = null;

        return await this.settleBoard();
    }

    // Clears the matches, minus the cells that are left holding something. What
    // each match pays out is decided first and across every match at once: a cell
    // sitting where two runs cross belongs to both, and it must not be cleared by
    // one of them after the other has just turned it into a charge.
    resolveMatches(matches) {

        const charges = new Map();

        // Where a horizontal run meets a vertical one. Crossing is the shape a
        // charge comes out of, and it is worth more than either run's own length -
        // so the two runs pay out once, together, at the cell they share.
        const crossings = this.findCrossings(matches);

        crossings.forEach(tile => charges.set(tile, GameConstants.TNT));

        matches.forEach((match) => {

            // Already paid for, as one half of a cross.
            if (match.tiles.some(tile => crossings.has(tile))) return;

            const special = this.getMatchSpecial(match);
            if (!special) return;

            const cell = this.pickChargeCell(match.tiles, charges);
            if (cell) charges.set(cell, special);
        });

        // One resolve, one hit per crate - a cell caught by two crossing runs
        // must not knock the same box back twice.
        const knocked = new Set();

        matches.forEach((match) => {
            this.scene.playSounds("match");

            // Read off the cells the match occupies before any of them are
            // cleared, so a crate is still standing next to something when it
            // is asked who is touching it.
            this.hitBlockersAround(match.tiles, knocked);

            // The order within the match staggers the collect flights, so a five
            // in a row leaves the board as a stream rather than all at once.
            match.tiles.forEach((tile, index) => {
                if (charges.has(tile)) return;
                this.destroyTile(tile, index);
            });
        });

        charges.forEach((special, tile) => this.makeSpecial(tile, special));
    }

    // Every cell that turns up in a horizontal run and a vertical one at the
    // same time. Runs that cross already come back separately from
    // findAllMatches, so the cross is only ever the tiles they have in common.
    findCrossings(matches) {

        const horizontal = new Set();
        const vertical = new Set();

        matches.forEach((match) => {

            // A square lies both ways at once, so counting it as a run would
            // read its own four cells as a cross and pay out a charge on a
            // shape that has already earned a bolt.
            if (match.square) return;

            const side = match.horizontal ? horizontal : vertical;
            match.tiles.forEach(tile => side.add(tile));
        });

        const crossed = new Set();

        horizontal.forEach(tile => {
            if (vertical.has(tile)) crossed.add(tile);
        });

        return crossed;
    }

    // What a straight run is worth. Four leaves a rocket lying the way the run
    // does, five or more leaves a magnet, and three leaves nothing but the food
    // it clears.
    getMatchSpecial(match) {

        // A square is not a length - it is a shape, and it is worth the bolt
        // whatever the run thresholds say.
        if (match.square) return GameConstants.LIGHTNING;

        if (match.tiles.length >= this.magnetThreshold) return GameConstants.MAGNET;

        if (match.tiles.length >= this.rocketThreshold) {
            return match.horizontal ? GameConstants.ROCKET_H : GameConstants.ROCKET_V;
        }

        return null;
    }

    // Where the charge is left standing. The tile the player moved wins it, so
    // the charge appears under their finger rather than at the far end of a run
    // they did not choose; a run made by the cascade has no such tile, and keeps
    // its charge in the middle. A run with nothing free left in it - every cell
    // of it already spoken for by a run crossing it - pays out nothing.
    pickChargeCell(tiles, taken) {

        // A frozen cell is never where the powerup is left. It would be earned
        // and then locked away behind the ice that is still on top of it - and
        // the ice is owed a hit by that same match, which would be spent on the
        // charge that had just replaced the food under it.
        const open = tile => !taken.has(tile) && !this.isIced(tile);

        if (this.lastSwap) {
            const moved = tiles.find(tile => this.lastSwap.indexOf(tile) !== -1 && open(tile));
            if (moved) return moved;
        }

        const free = tiles.filter(open);

        return free.length ? free[Math.floor(free.length / 2)] : null;
    }

    // The charge artwork is drawn smaller in the atlas than the food is, so at
    // the shared tile scale it would sit in its cell looking like a half-size
    // item. It is measured against this level's foods once and scaled to match
    // them, rather than being given a number that a re-export would invalidate.
    getTntFit() {

        return this.getFrameFit(this.tntFrame);
    }

    // Anything that stands in a cell without being a food - a charge, a crate -
    // is measured against this level's foods and scaled to sit at the same size
    // as them. Cached per frame, so the atlas is only read once each.
    getFrameFit(name) {

        if (!this.frameFits) this.frameFits = {};
        if (this.frameFits[name]) return this.frameFits[name];

        const reach = (frame) => {
            const found = this.scene.textures.getFrame("sheet", frame);
            return found ? Math.max(found.width, found.height) : 0;
        };

        const foods = this.tileTypes.map(reach).filter(Boolean);
        const size = reach(name);

        if (!size || !foods.length) return this.frameFits[name] = 1;

        const average = foods.reduce((total, each) => total + each, 0) / foods.length;

        this.frameFits[name] = average / size;

        return this.frameFits[name];
    }

    // The artwork a charge, a rocket or a magnet is drawn with. One place, so
    // everything that has to look one of them up - the tile itself, the glow
    // laid over it, the fit it is scaled by - is reading the same table.
    getSpecialFrame(special) {

        if (special === GameConstants.TNT) return this.tntFrame;
        if (special === GameConstants.MAGNET) return this.magnetFrame;
        if (special === GameConstants.LIGHTNING) return this.lightningFrame;

        return this.rocketFrames[special] || null;
    }

    // The scale one of them stands in a cell at. Everything is measured against
    // this level's foods first, so a re-export of the atlas cannot invalidate
    // it, and only then is a rocket pushed past them.
    getSpecialFit(special) {

        const frame = this.getSpecialFrame(special);
        if (!frame) return 1;

        const fit = this.getFrameFit(frame);

        return this.isRocketType(special) ? fit * this.rocketSwell : fit;
    }

    isRocketType(special) {

        return special === GameConstants.ROCKET_H || special === GameConstants.ROCKET_V;
    }

    // Which of them, if any, a level pattern value is asking for. A pattern is
    // written in the same numbers the specials themselves carry, so this is only
    // here to keep a plain cell - or a crate, which is handled well before this -
    // from being read as one.
    patternSpecial(value) {

        const specials = [
            GameConstants.TNT,
            GameConstants.ROCKET_H,
            GameConstants.ROCKET_V,
            GameConstants.MAGNET,
            GameConstants.LIGHTNING,
        ];

        return specials.indexOf(value) === -1 ? null : value;
    }

    // Turns a cell into a charge, a rocket or a magnet in place. It keeps the
    // tile it already was, so it falls, slides and shuffles like any other item -
    // it just stops being a food: it lines up with nothing, and it is spent by
    // being set off.
    makeSpecial(tile, special, announce = true) {

        const frame = this.getSpecialFrame(special);
        if (!frame) return;

        tile.special = special;
        tile.type = -1;
        tile.level = GameConstants.NORMAL;

        this.clearIce(tile);
        tile.visible = true;
        tile.alpha = 1;
        tile.angle = 0;

        // Only ever set on the frame a magnet is fired, and read once - a tile
        // coming back out of the pool must not still be holding the colour the
        // magnet before it was swapped into.
        tile.pullType = null;
        tile.pullAll = false;

        this.boardStatus[tile.i][tile.j] = GameConstants.NORMAL;

        tile.changeAsset(frame, this.getSpecialFit(special));

        this.stopDropTweens(tile);

        // One the level starts with is simply there when the board opens - only
        // one the player has just earned announces itself.
        if (!announce) {
            tile.setScale(this.tileScale);
            return;
        }

        this.scene.playSounds(special === GameConstants.TNT ? "tnt_create" : "special_create");
        this.showMatchBurst(tile.x, tile.y);

        this.clearPress(tile);
        tile.setScale(this.tileScale);

        this.scene.tweens.chain({
            targets: tile,
            tweens: [
                { scale: this.tileScale * 1.4, duration: 150, ease: "Back.easeOut" },
                { scale: this.tileScale, duration: 170, ease: "Sine.easeInOut" },
            ],
            onComplete: () => tile.setScale(this.tileScale)
        });
    }

    isRocket(tile) {

        return !!tile && (tile.special === GameConstants.ROCKET_H || tile.special === GameConstants.ROCKET_V);
    }

    isMagnet(tile) {

        return !!tile && tile.special === GameConstants.MAGNET;
    }

    isLightning(tile) {

        return !!tile && tile.special === GameConstants.LIGHTNING;
    }

    // Anything that is set off rather than matched. A crate carries a special of
    // its own but is scenery, not a charge - it is never fired, only broken.
    isCharge(tile) {

        return !!tile && !!tile.special && !this.isBlocker(tile);
    }

    // A crate. It keeps the tile it is standing on - so the cell is still there
    // to hand back when the crate breaks - but it stops being a food and stops
    // being anything the board is allowed to move: it cannot be picked up, it
    // never falls, and no run reads through it.
    makeBlocker(tile, kind = "crate") {

        tile.special = GameConstants.BLOCKER;
        tile.blockerKind = kind;
        tile.type = -1;
        tile.level = GameConstants.NORMAL;
        tile.hits = kind === "pizza" ? this.pizzaFrames.length : this.blockerHits;

        this.clearIce(tile);
        tile.visible = true;
        tile.alpha = 1;
        tile.angle = 0;
        this.boardStatus[tile.i][tile.j] = GameConstants.BLOCKED;

        this.stopDropTweens(tile);
        this.stopSideDrop(tile);

        // After the tweens are off it, not before: stopping a landing squash
        // squares the tile back up to a food's size, which would take the
        // stretch straight back off a crate made out of a tile that had one.
        this.setBlockerScale(tile);
        this.setBlockerFrame(tile);
    }

    // box2 while it is whole, box1 once it has taken a hit. The frame is picked
    // off what is left rather than counted down separately, so a crate given a
    // different number of stages in blockerFrames needs nothing else changed.
    setBlockerFrame(tile) {

        if (this.isPizza(tile)) {
            this.setPizzaFrame(tile);
            return;
        }

        const frame = this.blockerFrames[Math.max(tile.hits, 1) - 1];

        tile.changeAsset(frame, this.getFrameFit(frame));
    }

    isBlocker(tile) {

        return !!tile && tile.special === GameConstants.BLOCKER;
    }

    isPizza(tile) {

        return this.isBlocker(tile) && tile.blockerKind === "pizza";
    }

    // The box, and in it whatever is left of the pizza - picked off the hits
    // left, the same way a crate's frame is.
    setPizzaFrame(tile) {

        const frame = this.pizzaFrames[Math.max(tile.hits, 1) - 1];

        tile.showPizza(
            this.pizzaBox, this.getImageFit(this.pizzaBox, this.pizzaBoxSize),
            frame, this.getImageFit(frame, this.pizzaSize)
        );
    }

    // The scale a loose image is drawn at inside a tile so its canvas spans
    // this many cells. The tile is scaled into its cell itself, so this is
    // measured against the tile's unscaled size.
    getImageFit(key, cells = 1) {

        if (!this.scene.textures.exists(key)) return 1;

        const size = (this.tileWidth / this.tileScale) * cells;
        const source = this.scene.textures.get(key).getSourceImage();
        const reach = Math.max(source.width, source.height);

        return reach ? size / reach : 1;
    }

    // One slice off the pizza, sent to the counter. With nobody waiting on
    // pizza - or the order already full - it pops where it was instead.
    collectSlice(tile) {

        const collected = this.scene.collectTile(this.pizzaGoal, tile.xPos, tile.yPos);

        this.ensureSparkleTexture();

        this.showMatchBurst(tile.xPos, tile.yPos, collected
            ? { count: 5, radius: this.tileWidth * .4, scale: .55 }
            : { count: 9, radius: this.tileWidth * .6, scale: .75 });
    }

    // The size a crate rests at. Read rather than written out, so a tween that
    // squashes one has something to squash away from and return to.
    getBlockerScale(tile = null) {

        // The stretch is a crate's - a pizza box is square.
        const stretch = this.isPizza(tile) ? 1 : this.blockerStretch;

        return { x: this.tileScale * stretch, y: this.tileScale };
    }

    setBlockerScale(tile) {

        const scale = this.getBlockerScale(tile);

        tile.setScale(scale.x, scale.y);
    }

    // Every crate standing next to one of these cells, straight up, down, left or
    // right. A crate touching two tiles of the same match is still only hit once
    // - `hit` carries across the whole resolve so one match costs one stage, no
    // matter how much of it happens to be lying against the box.
    hitBlockersAround(tiles, hit = new Set()) {

        tiles.forEach((tile) => {

            if (!tile) return;

            [
                [tile.i + 1, tile.j],
                [tile.i - 1, tile.j],
                [tile.i, tile.j + 1],
                [tile.i, tile.j - 1]
            ].forEach(([c, r]) => {

                if (c < 0 || r < 0 || c >= this.columns || r >= this.rows) return;

                const other = this.tiles[c][r];

                if (!this.isBlocker(other)) return;
                if (hit.has(other)) return;

                hit.add(other);

                // Which side the match was on, so the crate is knocked away
                // from what hit it rather than jolting in place.
                this.damageBlocker(other, { x: c - tile.i, y: r - tile.j });
            });
        });

        return hit;
    }

    // One hit. The crate either drops to its damaged artwork with a knock, or -
    // on the hit that takes its last stage - breaks open and gives the cell back.
    //
    // from is the direction the hit came from, in cells. It is what lets the
    // crate be shoved away from the match instead of jolting on the spot, which
    // is the difference between the box being hit and the box twitching.
    damageBlocker(tile, from = null) {

        if (!this.isBlocker(tile)) return;

        // A pizza is taken apart a slice at a time, and every slice is food -
        // it leaves for the counter on the hit that takes it off.
        if (this.isPizza(tile)) this.collectSlice(tile);

        tile.hits--;

        if (tile.hits <= 0) {
            this.breakBlocker(tile, from);
            return;
        }

        this.setBlockerFrame(tile);

        this.scene.playSounds("blocker_hit");

        this.knockBlocker(tile, from);
    }

    // The crate takes the hit and holds: it is driven back along the line the
    // match came in on, squashes against it, then springs home. A shove rather
    // than a pop - a bounce big enough to read as a clear would say the wrong
    // thing about a box that is still standing.
    knockBlocker(tile, from) {

        const push = this.tileWidth * .16;

        const dx = from ? from.x : 0;
        const dy = from ? from.y : 0;
        const length = Math.hypot(dx, dy) || 1;

        // Both halves of the knock are held on the tile so a second hit landing
        // mid-knock takes the crate over from wherever it has got to, rather
        // than two tweens fighting over the same box.
        this.stopShockwave(tile);
        this.stopKnock(tile);

        tile.shockTween = this.scene.tweens.chain({
            targets: tile,
            tweens: [{
                    x: tile.xPos + (dx / length) * push,
                    y: tile.yPos + (dy / length) * push,
                    duration: 80,
                    ease: "Quad.easeOut",
                },
                {
                    x: tile.xPos,
                    y: tile.yPos,
                    duration: 300,
                    ease: "Back.easeOut",
                }
            ],
            onComplete: () => {
                tile.shockTween = "";
                tile.x = tile.xPos;
                tile.y = tile.yPos;
            }
        });

        // Squashed across the line it was hit on, so a crate struck from the
        // side is pressed flat sideways and one struck from below is pressed
        // down - the give is where the impact was.
        const flat = Math.abs(dx) > Math.abs(dy);
        const squash = .18;
        const rest = this.getBlockerScale(tile);

        tile.knockTween = this.scene.tweens.chain({
            targets: tile,
            tweens: [{
                    scaleX: rest.x * (flat ? 1 - squash : 1 + squash * .6),
                    scaleY: rest.y * (flat ? 1 + squash * .6 : 1 - squash),
                    duration: 80,
                    ease: "Quad.easeOut",
                },
                {
                    scaleX: rest.x,
                    scaleY: rest.y,
                    duration: 320,
                    ease: "Back.easeOut",
                }
            ],
            onComplete: () => {
                tile.knockTween = "";
                this.setBlockerScale(tile);
            }
        });

        // The splinters that come off the corner the hit landed on. Small - the
        // crate is chipped, not opened.
        this.showMatchBurst(
            tile.x + (dx / length) * (this.tileWidth * .3),
            tile.y + (dy / length) * (this.tileHeight * .3),
            { count: 4, radius: this.tileWidth * .34, scale: .5 }
        );
    }

    stopKnock(tile) {

        if (!tile || !tile.knockTween) return;

        tile.knockTween.stop();
        tile.knockTween = "";

        // Still a crate, so it is put back at a crate's size. A tile that has
        // just stopped being one is on its way to the pool, and is squared up
        // by whoever sent it there.
        if (this.isBlocker(tile)) this.setBlockerScale(tile);
    }

    // The last hit. The crate comes apart, and the cell underneath goes back to
    // being an ordinary hole - so the next cascade pass drops food into it like
    // any other cell the board just cleared.
    breakBlocker(tile, from = null) {

        const frame = this.blockerFrames[0];
        const pizza = this.isPizza(tile);

        // The break is played by throwaway sprites at the cell rather than by
        // the tile itself. The cell is handed back to the grid on this frame, so
        // food is already falling into it while the box is still coming apart -
        // the break rides the refill instead of holding it up.
        const x = tile.xPos;
        const y = tile.yPos;

        tile.special = null;
        tile.blockerKind = null;
        tile.hits = 0;
        tile.hidePizza();

        this.scene.playSounds("blocker_break");

        // The knock from the hit before this one is still running on the tile.
        // It goes back in the pool from here, so it must not carry a tween into
        // whatever food comes out of it next.
        this.stopKnock(tile);
        this.stopShockwave(tile);
        this.scene.tweens.killTweensOf(tile);

        this.boardStatus[tile.i][tile.j] = GameConstants.DESTROYED;

        tile.visible = false;

        // Back to a food's size - the stretch belongs to the crate, not to the
        // tile it was standing on, and the tile is about to be somebody's lunch.
        tile.setScale(this.tileScale);
        this.tilesPool.push(tile);

        if (pizza) this.showPizzaBoxBreak(x, y);
        else this.showBlockerBreak(x, y, frame, from);
    }

    // The empty box comes apart. It is thrown in its own four corners the way
    // the ice is - the crate's splinters are wood, and this is cardboard.
    showPizzaBoxBreak(x, y) {

        this.ensureSparkleTexture();

        const scale = this.tileScale * this.getImageFit(this.pizzaBox, this.pizzaBoxSize);

        this.showImageShards(x, y, this.pizzaBox, scale, {
            time: this.blockerShardTime,
            throwOut: this.blockerShardThrow,
            lift: this.blockerShardLift,
        });

        this.showMatchBurst(x, y, { count: 12, radius: this.tileWidth * .95, scale: .95 });

        this.shockwave(this.getColFromX(x), this.getRowFromY(y), 0, 0, .5);

        if (this.scene.cameras.main) this.scene.cameras.main.shake(90, .0022);
    }

    // The splinters. Built off the atlas the first time one is needed, so a
    // level without crates never pays for it.
    ensureBlockerBreakAnim() {

        if (this.scene.anims.exists(this.blockerBreakAnim)) return true;

        if (!this.scene.textures.exists("sheet")) return false;
        if (!this.scene.textures.getFrame("sheet", "cube_box/1")) return false;

        this.scene.anims.create({
            key: this.blockerBreakAnim,
            frames: this.scene.anims.generateFrameNames("sheet", {
                prefix: "cube_box/",
                start: 1,
                end: this.blockerBreakFrames
            }),
            frameRate: this.blockerBreakRate,
            repeat: 0
        });

        return true;
    }

    // The break, in two beats. First the box takes the last hit and buckles -
    // on its own, with nothing else on screen. Then it lets go, and everything
    // else happens at once on that frame.
    //
    // The order matters more than any one part of it. All of this played
    // together reads as a single bright smear; held apart by the wind-up it
    // reads as a box being broken.
    showBlockerBreak(x, y, frame, from = null) {

        this.showBlockerGiveWay(x, y, frame, from);

        this.scene.time.delayedCall(this.blockerWindUp, () => {

            if (!this.alive) return;

            // The white silhouette, on the frame the box lets go. It is the
            // thing that makes the break land - the eye gets a hard edge to
            // catch before there is anything to look at.
            this.showBlockerFlash(x, y, frame);

            // The box itself, in four pieces, thrown out and falling.
            this.showBlockerShards(x, y, frame, from);

            // The splinters that come off those pieces.
            this.showBlockerSplinters(x, y);

            // A wide, bright burst - three times what a chip off the corner
            // throws, so the last hit does not read like the first one.
            this.showMatchBurst(x, y, { count: 12, radius: this.tileWidth * .95, scale: .95 });

            // The cells around it are shoved, exactly as a small blast shoves
            // them. It is what stops the break reading as a thing that happened
            // only to the one cell.
            this.shockwave(this.getColFromX(x), this.getRowFromY(y), 0, 0, .5);

            if (this.scene.cameras.main) this.scene.cameras.main.shake(90, .0022);
        });
    }

    // The frame the box lets go on, as a solid white cut-out of it. Gone in a
    // tenth of a second - long enough to register, too short to look at.
    showBlockerFlash(x, y, frame) {

        const rest = this.getBlockerScale();
        const fit = this.getFrameFit(frame);

        const flash = this.scene.add.sprite(x, y, "sheet", frame);
        flash.setOrigin(0.5);
        flash.setScale(rest.x * fit, rest.y * fit);

        // Fills the shape rather than tinting what is in it, so this is the
        // crate's silhouette and not a pale crate.
        flash.setTintFill(0xffffff);
        this.fxGrp.add(flash);

        this.scene.tweens.add({
            targets: flash,
            scaleX: rest.x * fit * 1.45,
            scaleY: rest.y * fit * 1.45,
            alpha: 0,
            duration: 130,
            ease: "Quad.easeOut",
            onComplete: () => flash.destroy()
        });
    }

    // The box comes apart into its own four corners and they are thrown out and
    // down. Cut out of the crate artwork rather than drawn: each piece is the
    // whole frame with three quarters of it cropped away, so the four of them
    // start out sitting exactly where the box was and the break begins on the
    // box itself instead of on something that has replaced it.
    showBlockerShards(x, y, frame, from) {

        const rest = this.getBlockerScale();
        const fit = this.getFrameFit(frame);

        const cut = this.scene.textures.getFrame("sheet", frame);
        if (!cut) return;

        // Crop is in frame space, so it is the cut size that is quartered - not
        // the untrimmed size the splinters are measured against.
        const halfWidth = cut.width / 2;
        const halfHeight = cut.height / 2;

        const dx = from ? from.x : 0;
        const dy = from ? from.y : 0;
        const length = Math.hypot(dx, dy) || 1;

        const throwOut = this.tileWidth * this.blockerShardThrow;
        const lift = this.tileHeight * this.blockerShardLift;

        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([column, row]) => {

            const shard = this.scene.add.sprite(x, y, "sheet", frame);
            shard.setOrigin(0.5);
            shard.setScale(rest.x * fit, rest.y * fit);
            shard.setCrop(column * halfWidth, row * halfHeight, halfWidth, halfHeight);
            this.fxGrp.add(shard);

            // Out from the middle of the box, so each corner leaves by its own
            // corner, and carried on by the hit that broke it.
            const outX = (column ? 1 : -1) * Phaser.Math.FloatBetween(.7, 1.15);
            const outY = (row ? 1 : -1) * Phaser.Math.FloatBetween(.5, .9);

            const driftX = x + outX * throwOut + (dx / length) * throwOut * .45;
            const peakY = y + outY * lift * .5 - lift;

            const time = this.blockerShardTime;

            // Thrown, not slid: the horizontal carries on at its own rate the
            // whole way while the vertical goes up, slows, and drops past the
            // cell - which is what a piece of a box does and a fading sprite
            // sitting where it broke does not.
            this.scene.tweens.add({
                targets: shard,
                x: driftX,
                duration: time,
                ease: "Quad.easeOut"
            });

            this.scene.tweens.chain({
                targets: shard,
                tweens: [{
                        y: peakY,
                        duration: time * .38,
                        ease: "Quad.easeOut",
                    },
                    {
                        y: y + lift * 1.9,
                        duration: time * .62,
                        ease: "Quad.easeIn",
                    }
                ]
            });

            // End over end, in whichever direction it left.
            this.scene.tweens.add({
                targets: shard,
                angle: outX * Phaser.Math.Between(110, 240),
                duration: time,
                ease: "Linear"
            });

            // Held solid through the throw and taken off the back half, so the
            // pieces are read as pieces before they go.
            this.scene.tweens.add({
                targets: shard,
                alpha: 0,
                delay: time * .5,
                duration: time * .5,
                ease: "Quad.easeIn",
                onComplete: () => shard.destroy()
            });
        });
    }

    // The wind-up: the box takes the last of the hit and buckles against it,
    // then hands over to the shards on the frame it lets go. It does not fade -
    // a box that thins away has been taken back rather than broken, and there
    // is something standing in its place the moment it stops.
    //
    // A copy of the crate does this, not the tile: the tile is already back in
    // the pool with food falling into its cell.
    showBlockerGiveWay(x, y, frame, from) {

        // A copy of the crate, at the crate's own size - the tile it is standing
        // in for is already back in the pool at a food's size.
        const rest = this.getBlockerScale();
        const fit = this.getFrameFit(frame);

        const ghost = this.scene.add.sprite(x, y, "sheet", frame);
        ghost.setOrigin(0.5);
        ghost.setScale(rest.x * fit, rest.y * fit);
        this.fxGrp.add(ghost);

        const dx = from ? from.x : 0;
        const dy = from ? from.y : 0;
        const length = Math.hypot(dx, dy) || 1;

        const scaleX = ghost.scaleX;
        const scaleY = ghost.scaleY;
        const flat = Math.abs(dx) > Math.abs(dy);

        // Driven the last of the way along the line the hit came in on.
        this.scene.tweens.add({
            targets: ghost,
            x: x + (dx / length) * (this.tileWidth * .1),
            y: y + (dy / length) * (this.tileHeight * .1),
            duration: this.blockerWindUp,
            ease: "Quad.easeOut"
        });

        // The give: pressed in along the hit, spilling out across it. It is
        // still plainly the crate at the end of this - the buckle has to be
        // read as the box straining, not as the box already gone.
        this.scene.tweens.add({
            targets: ghost,
            scaleX: scaleX * (flat ? .78 : 1.16),
            scaleY: scaleY * (flat ? 1.16 : .78),
            duration: this.blockerWindUp,
            ease: "Quad.easeOut",
            onComplete: () => ghost.destroy()
        });
    }

    showBlockerSplinters(x, y) {

        // Same trap as the blast ring: without the frames this would draw a
        // stack of Phaser's green "missing texture" squares over the cell.
        // Better the box simply gives way with nothing coming off it.
        if (!this.ensureBlockerBreakAnim()) return;

        const fx = this.scene.add.sprite(x, y, "sheet", "cube_box/1");
        fx.setOrigin(0.5);
        this.fxGrp.add(fx);

        // Scaled to the cell rather than given a number: the burst is authored
        // far larger than a tile, and a re-export at another size must not
        // quietly turn it into something that covers half the board.
        //
        // Measured off the untrimmed size, not the cut one. These frames are
        // packed trimmed, and the first of them is a single clump a fifth of the
        // canvas across - sized off that, the burst would come out four times
        // too big and every later frame would be off its own centre.
        const frame = this.scene.textures.getFrame("sheet", "cube_box/1");
        const reach = Math.max(frame.realWidth || frame.width, frame.realHeight || frame.height);
        const scale = (this.tileWidth * this.blockerBreakSpread) / reach;

        // Thrown out from the cell rather than played at one size, so the
        // splinters carry the box outwards over the frames instead of hanging
        // where it stood.
        fx.setScale(scale * .8);
        fx.setAngle(Phaser.Math.Between(0, 360));

        this.scene.tweens.add({
            targets: fx,
            scale: scale,
            duration: 260,
            ease: "Quad.easeOut"
        });

        fx.play(this.blockerBreakAnim);
        fx.once("animationcomplete", () => fx.destroy());
    }

    // Ice
    //
    // The block is drawn rather than packed: it is a pane of white with facets
    // and a border, tinted to whatever colour the level wants its ice, so the
    // atlas does not have to carry one square per layer. Built the first time a
    // frozen cell is filled, so a level without ice never pays for it.
    ensureIceTextures() {

        // A tile's artwork is drawn at its own size and the whole tile is
        // scaled down into its cell, so the ice is built at that same size -
        // sized to the cell instead, it would be scaled down twice and sit in
        // the middle of the cell like a stamp.
        const size = Math.round(this.tileWidth / this.tileScale);
        const radius = size * .16;
        const last = this.iceFrames.length - 1;

        this.iceFrames.forEach((key, index) => {

            if (this.scene.textures.exists(key)) return;

            // The last entry is the block as it opens; everything before it is
            // a layer that has already been hit, and is drawn thinner.
            const wear = (last - index) / this.iceFrames.length;

            const g = this.scene.add.graphics();

            // The pane. Held a little inside the cell so the cell art still
            // shows around it - ice in the cell, not a wash over the whole of it.
            g.fillStyle(0xffffff, .52 - wear * .16);
            g.fillRoundedRect(2, 2, size - 4, size - 4, radius);

            // Facets. A flat wash reads as fog over the cell rather than as
            // something solid in front of it; the block needs edges catching
            // the light before the eye takes it for ice.
            g.fillStyle(0xffffff, .62 - wear * .16);

            g.beginPath();
            g.moveTo(size * .08, size * .62);
            g.lineTo(size * .46, size * .06);
            g.lineTo(size * .64, size * .06);
            g.lineTo(size * .08, size * .88);
            g.closePath();
            g.fillPath();

            g.beginPath();
            g.moveTo(size * .74, size * .06);
            g.lineTo(size * .92, size * .06);
            g.lineTo(size * .92, size * .40);
            g.closePath();
            g.fillPath();

            // The rim. It is what gives the block its edge against the food
            // underneath, so it is the part that survives longest as the ice
            // is worn down.
            g.lineStyle(Math.max(size * .07, 3), 0xffffff, .95 - wear * .15);
            g.strokeRoundedRect(2, 2, size - 4, size - 4, radius);

            // Cracks, on every layer but the one the block opens as. They are
            // how a hit that leaves the ice standing is read as a hit.
            if (index < last) {

                g.lineStyle(Math.max(size * .045, 2), 0xffffff, .95);

                g.beginPath();
                g.moveTo(size * .18, size * .22);
                g.lineTo(size * .44, size * .48);
                g.lineTo(size * .34, size * .72);
                g.lineTo(size * .52, size * .92);
                g.strokePath();

                g.beginPath();
                g.moveTo(size * .44, size * .48);
                g.lineTo(size * .78, size * .34);
                g.strokePath();

                g.beginPath();
                g.moveTo(size * .52, size * .60);
                g.lineTo(size * .86, size * .78);
                g.strokePath();
            }

            g.generateTexture(key, size, size);
            g.destroy();
        });
    }

    // Freezes the food that is already standing in the cell. Unlike a crate this
    // changes nothing about what the tile is - it keeps its type, it still lines
    // up in a run, and the cell stays NORMAL. All it loses is the right to move.
    makeIce(tile) {

        if (!tile) return;

        this.ensureIceTextures();

        tile.frozen = this.iceHits;

        this.stopDropTweens(tile);
        this.stopSideDrop(tile);

        this.setIceFrame(tile);
    }

    // Read off what is left rather than counted down separately, so ice given a
    // different number of layers in iceFrames needs nothing else changed.
    setIceFrame(tile) {

        const frame = this.iceFrames[Math.max(tile.frozen, 1) - 1];

        tile.showIce(frame, this.iceTint, this.iceAlpha, this.getIceScale(frame));
    }

    // The ice art is far bigger than a tile, so it is scaled to fill the tile
    // at the tile's own unscaled size - the tile itself does the rest.
    getIceScale(frame) {

        const size = this.tileWidth / this.tileScale;
        const width = this.scene.textures.get(frame).getSourceImage().width;

        return width ? size / width : 1;
    }

    isIced(tile) {

        return !!tile && tile.frozen > 0;
    }

    // Takes the ice off a tile outright, with no break and no sound. This is the
    // housekeeping end of it - a tile going into the pool or coming out of it -
    // not the ice being broken, which is crackIce.
    clearIce(tile) {

        if (!tile) return;

        tile.frozen = 0;
        tile.hideIce();
    }

    // One hit on the block. Returns whether the food underneath is now free to
    // be taken: false while there is ice left - the match is spent on the layer
    // and the cell stays as it is - and true on the hit that shatters the last
    // one, so the clear that asked goes ahead on the same frame.
    crackIce(tile) {

        if (!this.isIced(tile)) return true;

        tile.frozen--;

        if (tile.frozen <= 0) {
            this.shatterIce(tile);
            return true;
        }

        this.setIceFrame(tile);

        this.scene.playSounds("ice_crack");

        this.ensureSparkleTexture();

        // Small, and on the ice rather than thrown out from it: the block is
        // chipped, and what is behind it has not moved.
        this.showMatchBurst(tile.x, tile.y, { count: 5, radius: this.tileWidth * .36, scale: .55 });

        return false;
    }

    // The last layer. The block comes apart over the cell while the food it was
    // holding is cleared underneath it - the pieces are thrown by their own
    // sprites, so the ice is still breaking after the tile has gone back in the
    // pool and the next item is already falling into the cell.
    shatterIce(tile) {

        const frame = this.iceFrames[this.iceFrames.length - 1];

        const x = tile.xPos;
        const y = tile.yPos;

        this.clearIce(tile);

        this.scene.playSounds("ice_break");

        this.ensureSparkleTexture();

        this.showIceShards(x, y, frame);
        this.showMatchBurst(x, y, { count: 8, radius: this.tileWidth * .6, scale: .7 });
    }

    // The pieces of the block. Quarters of the ice itself rather than a puff of
    // sparks - a sheet of ice that dissolves has melted, and the player broke it.
    showIceShards(x, y, frame) {

        this.showImageShards(x, y, frame, this.tileScale * this.getIceScale(frame), {
            time: this.iceShardTime,
            throwOut: this.iceShardThrow,
            lift: this.iceShardLift,
            tint: this.iceTint,
            alpha: this.iceAlpha,
        });
    }

    // Any loose image cut into its four quarters, each thrown out by its own
    // corner. throwOut and lift are in cells.
    showImageShards(x, y, frame, scale, { time, throwOut: throwCells, lift: liftCells, tint = 0xffffff, alpha = 1 }) {

        if (!this.scene.textures.exists(frame)) return;

        const source = this.scene.textures.get(frame).getSourceImage();

        const halfWidth = source.width / 2;
        const halfHeight = source.height / 2;

        const throwOut = this.tileWidth * throwCells;
        const lift = this.tileHeight * liftCells;

        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([column, row]) => {

            const shard = this.scene.add.image(x, y, frame);
            shard.setOrigin(0.5);
            shard.setScale(scale);
            shard.setTint(tint);
            shard.setAlpha(alpha);
            shard.setCrop(column * halfWidth, row * halfHeight, halfWidth, halfHeight);
            this.fxGrp.add(shard);

            // Each quarter leaves by its own corner, so the block comes apart
            // along the cracks that were drawn on it.
            const outX = (column ? 1 : -1) * Phaser.Math.FloatBetween(.6, 1.1);
            const outY = (row ? 1 : -1) * Phaser.Math.FloatBetween(.4, .8);

            this.scene.tweens.add({
                targets: shard,
                x: x + outX * throwOut,
                duration: time,
                ease: "Quad.easeOut"
            });

            this.scene.tweens.chain({
                targets: shard,
                tweens: [{
                        y: y + outY * lift * .5 - lift,
                        duration: time * .38,
                        ease: "Quad.easeOut",
                    },
                    {
                        y: y + lift * 1.7,
                        duration: time * .62,
                        ease: "Quad.easeIn",
                    }
                ]
            });

            this.scene.tweens.add({
                targets: shard,
                angle: outX * Phaser.Math.Between(90, 200),
                scale: scale * .7,
                duration: time,
                ease: "Linear"
            });

            // Held solid through the first half of the throw, so the pieces are
            // read as pieces of ice before they go.
            this.scene.tweens.add({
                targets: shard,
                alpha: 0,
                delay: time * .45,
                duration: time * .55,
                ease: "Quad.easeIn",
                onComplete: () => shard.destroy()
            });
        });
    }

    // The player set one or more charges off. Same shape as a match: clear, then
    // let the board fall back into place and pick up whatever that leaves behind.
    // The beat between the tap and the bang: the charge swells, then is pulled
    // hard into itself, and the blast comes out of the bottom of that pull.
    //
    // The rule the whole thing is built under is that the charge stays readable
    // - it is still obviously the TNT in every frame. Pushed past that it stops
    // reading as a squish and starts reading as a glitch: a white silhouette, or
    // a shape the barrel has bent into something unrecognisable. So the amounts
    // are kept modest and the punch comes from the curves instead, with a lit
    // copy laid over the top to carry the brightness the tint used to.
    squishCharge(tile) {

        return new Promise(resolve => {

            if (!this.alive || !tile) return resolve();

            const sprite = tile.tile;
            const scale = this.tileScale;
            const rest = tile.yPos === undefined ? tile.y : tile.yPos;
            const dip = this.tileHeight * .05;

            const SWELL = 60;
            const PULL = 90;

            this.clearPress(tile);
            tile.setScale(scale);

            // Over the top of its neighbours for the whole move. The charge grows
            // past the width of its own cell as it swells, and a tile drawn after
            // it in the group otherwise cuts the overlap off - the charge is the
            // thing going off, so nothing sits in front of it. Same handling a
            // swapping pair already gets.
            this.tileGrp.bringToTop(tile);

            const barrel = this.chargeBarrel(sprite, SWELL, PULL);
            const glow = this.chargeGlow(tile, SWELL, PULL);

            const done = () => {

                if (barrel) barrel();
                if (glow) glow();

                tile.squishTween = null;
                tile.setScale(scale);
                tile.y = rest;

                resolve();
            };

            tile.squishTween = this.scene.tweens.chain({
                targets: tile,
                tweens: [
                    // Swells. Squats wide and low. The curve is a gentle one on
                    // purpose: an out curve steep enough to be over in a frame or
                    // two - Expo, most of all - leaves the charge sat perfectly
                    // still for the rest of the step, and a held pose reads as a
                    // hitch rather than as a squash. It wants to be moving for
                    // every frame it is on screen.
                    {
                        scaleX: scale * 1.22,
                        scaleY: scale * .82,
                        y: rest + dip,
                        duration: SWELL,
                        ease: "Quad.easeOut"
                    },
                    // The pull. Snaps tall and thin off the cell and overshoots,
                    // and the blast is thrown from the top of it.
                    {
                        scaleX: scale * .86,
                        scaleY: scale * 1.18,
                        y: rest - dip * 1.3,
                        duration: PULL,
                        ease: "Back.easeOut",
                        easeParams: [2.5]
                    }
                ],
                onComplete: () => {

                    // A knock of its own, so the camera is already moving when
                    // the blast throws its own shake.
                    if (this.scene.cameras.main) this.scene.cameras.main.shake(80, .0025);

                    done();
                }
            });
        });
    }

    // The charge lighting up. A second copy of the same frame laid over the top
    // on an additive blend, which brightens the artwork instead of replacing it
    // the way a tint fill does - under a fill the charge is just a white shape,
    // and a white shape is what a missing texture looks like.
    chargeGlow(tile, swell, pull) {

        const frame = this.getSpecialFrame(tile.special) || this.tntFrame;
        const fit = this.getSpecialFit(tile.special) || this.getFrameFit(frame);

        const glow = this.scene.add.sprite(tile.x, tile.y, "sheet", frame);
        glow.setScale(this.tileScale * fit);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.alpha = 0;
        this.fxGrp.add(glow);

        const tween = this.scene.tweens.add({
            targets: glow,
            alpha: .75,
            scale: this.tileScale * fit * 1.1,
            delay: swell * .5,
            duration: swell * .5 + pull,
            ease: "Quad.easeIn"
        });

        return () => {
            tween.stop();
            glow.destroy();
        };
    }

    // The barrel squish. Above 1 the artwork bulges, below 1 it is pinched into
    // its own middle - so the swell and the pull are the one value driven across
    // the same two beats the tile is squashing on. Held well short of the ends
    // of its range: past about a quarter either way the charge stops being a
    // charge and turns into a blob.
    chargeBarrel(sprite, swell, pull) {

        const preFX = sprite.preFX;

        if (!preFX) return null;

        preFX.setPadding(32);

        const barrel = preFX.addBarrel(1);

        const tween = this.scene.tweens.chain({
            targets: barrel,
            tweens: [
                { amount: 1.28, duration: swell, ease: "Quad.easeOut" },
                { amount: .62, duration: pull, ease: "Back.easeIn", easeParams: [2] }
            ]
        });

        return () => {
            tween.stop();
            preFX.clear();
        };
    }

    async detonate(seeds, radius = this.tntRadius) {

        if (!this.alive) return false;

        this.isAutoMatching = true;
        this.canClick = false;
        this.hideHint();

        const run = this.blast(seeds, radius);
        this.lastSwap = null;

        // The cells are already gone as far as the grid is concerned, but the
        // charges are still going off on screen. The board is held still through
        // the whole of it - dropping new items into the fire is what made the
        // blast read as a hiccup rather than a hit - and a chain waits for its
        // last rocket to land before anything moves.
        await this.wait(this.blastHold + run);
        if (!this.alive) return false;

        return await this.settleBoard();
    }

    // Sets off everything that has been lit, and everything they light in turn.
    //
    // One queue, taken a shot at a time. Each shot carries the delay it fires
    // at, so what the grid does - which is all of it, on this frame - and what
    // the screen does can come apart: a rocket claims its whole lane at once but
    // is only seen to clear it as it flies down it, and a charge sitting at the
    // far end of that lane is queued now and goes off at the moment the rocket
    // reaches it, not before.
    //
    // Returns how long the last of it is still running for, so the board knows
    // how long to stay out of the way.
    blast(seeds, radius) {

        const queue = seeds.map(tile => ({ tile: tile, radius: radius, delay: 0 }));
        const fired = new Set(seeds);

        let order = 0;
        let run = 0;

        // How anything caught by a shot lights the next one. A charge is never
        // cleared as part of somebody else's blast - it is queued and takes its
        // own turn - and one already waiting in the queue is left alone.
        const claim = (tile, delay) => {

            if (fired.has(tile)) return;

            fired.add(tile);
            queue.push({ tile: tile, radius: this.tntRadius, delay: delay });
        };

        while (queue.length) {

            const shot = queue.shift();

            run = Math.max(run, shot.delay);

            if (this.isRocket(shot.tile)) {
                run = Math.max(run, this.launchRocket(shot, claim, () => order++));
                continue;
            }

            if (this.isMagnet(shot.tile)) {
                run = Math.max(run, this.pullMagnet(shot, claim, () => order++));
                continue;
            }

            if (this.isLightning(shot.tile)) {
                run = Math.max(run, this.strikeLightning(shot, claim, () => order++));
                continue;
            }

            run = Math.max(run, this.explode(shot, claim, () => order++));
        }

        return run;
    }

    // A charge: the block of cells around it goes.
    explode(shot, claim, next) {

        const tile = shot.tile;
        const col = tile.i;
        const row = tile.j;

        this.showTntBlast(tile.x, tile.y, shot.radius, shot.delay);

        this.destroyTile(tile, next(), shot.delay);

        for (let c = col - shot.radius; c <= col + shot.radius; c++) {
            for (let r = row - shot.radius; r <= row + shot.radius; r++) {

                if (c === col && r === row) continue;

                this.takeCell(c, r, shot.delay, claim, next);
            }
        }

        // Only once the crater is taken, so the shove lands on the tiles left
        // standing rather than on ones about to be cleared anyway.
        this.shockwave(col, row, shot.radius, shot.delay);

        return shot.delay + 90;
    }

    // A rocket: it leaves along the line it is lying on, both ways at once, and
    // takes every cell it passes over. It is not stopped by anything - a hole is
    // flown over, a crate is knocked back a stage as it goes by - so the whole
    // row or column is spoken for on the frame it launches.
    launchRocket(shot, claim, next) {

        const tile = shot.tile;
        const horizontal = tile.special === GameConstants.ROCKET_H;

        const col = tile.i;
        const row = tile.j;

        this.destroyTile(tile, next(), shot.delay);
        this.showRocketLaunch(tile.x, tile.y, horizontal, shot.delay);

        const span = horizontal ? this.columns : this.rows;
        let run = shot.delay;

        [-1, 1].forEach((direction) => {

            let steps = 0;

            for (let step = 1; step < span; step++) {

                const c = horizontal ? col + direction * step : col;
                const r = horizontal ? row : row + direction * step;

                if (c < 0 || r < 0 || c >= this.columns || r >= this.rows) break;

                const at = shot.delay + step * this.rocketFlightPerCell;

                this.takeCell(c, r, at, claim, next);
                this.rocketWash(c, r, horizontal, at);

                steps = step;
                run = Math.max(run, at);
            }

            this.flyRocket(tile.x, tile.y, horizontal, direction, steps, shot.delay);
        });

        return run + this.rocketFlightPerCell;
    }

    // A magnet: every item of one food goes, wherever on the board it is
    // standing. It is the colour the magnet was swapped into; tapped on its own,
    // or swapped into something with no colour of its own, it takes whichever
    // food there is most of, so it is never spent on two stragglers.
    pullMagnet(shot, claim, next) {

        const tile = shot.tile;
        const type = tile.pullAll ? null : (tile.pullType === null || tile.pullType === undefined ? this.mostCommonType() : tile.pullType);

        const haul = this.magnetHaul(tile, type);

        const held = Math.max(haul.length - 1, 0) * this.magnetPullStagger + this.magnetPullTime;

        this.showMagnetPull(tile, shot.delay, held);

        haul.forEach((other, index) => {

            const at = shot.delay + index * this.magnetPullStagger;

            // The cell is given up first: destroyTile takes whatever tweens the
            // item was already running off it, and the flight in has to be the
            // one thing left owning where it is.
            this.destroyTile(other, next(), at + this.magnetPullTime);
            this.flyToMagnet(other, tile, at);
        });

        const last = shot.delay + held;

        // The magnet itself goes last, once it has taken everything in - it is
        // the thing doing the pulling, so it cannot be the first thing to leave.
        this.destroyTile(tile, next(), last);

        this.scene.time.delayedCall(last, () => {

            if (!this.alive) return;

            this.showMatchBurst(tile.x, tile.y, { count: 14, radius: this.tileWidth * 1.4, scale: 1.3 });
            if (this.scene.cameras.main) this.scene.cameras.main.shake(180, .004);
        });

        return last + 90;
    }

    // Everything a magnet is about to take in. A null food means the whole
    // board - which is what two magnets swapped together come to.
    magnetHaul(magnet, type) {

        const haul = [];

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {

                if (this.boardStatus[c][r] !== GameConstants.NORMAL) continue;

                const other = this.tiles[c][r];

                if (!other || other === magnet) continue;

                // A charge has no colour to be called by, and a crate is bolted
                // down - neither is ever pulled in. Frozen food is held by the
                // ice just as firmly: it is not dragged out of a block it is
                // still sealed in.
                if (other.special) continue;
                if (this.isIced(other)) continue;

                if (type !== null && other.type !== type) continue;

                haul.push(other);
            }
        }

        // Nearest first, so the pull reads as spreading outwards from the magnet
        // rather than arriving in column order.
        haul.sort((a, b) =>
            Math.hypot(a.i - magnet.i, a.j - magnet.j) - Math.hypot(b.i - magnet.i, b.j - magnet.j));

        return haul;
    }

    // Whichever food there is most of on the board right now.
    mostCommonType() {

        const counts = new Map();

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {

                if (this.boardStatus[c][r] !== GameConstants.NORMAL) continue;

                const tile = this.tiles[c][r];
                if (!tile || tile.special) continue;

                counts.set(tile.type, (counts.get(tile.type) || 0) + 1);
            }
        }

        let best = null;
        let most = 0;

        counts.forEach((count, type) => {
            if (count > most) {
                most = count;
                best = type;
            }
        });

        return best;
    }

    // The lightning: the sky opens and a bolt comes down on a food one of the
    // customers is still waiting for, one strike at a time. It is the only
    // powerup that looks past the board at the counter - where it was standing
    // decides nothing except where the flash it goes out in is drawn.
    strikeLightning(shot, claim, next) {

        const tile = shot.tile;
        const targets = this.lightningTargets(this.lightningStrikes);

        // The powerup is spent on the frame it is set off, so it can never be
        // picked as one of its own targets by a strike landing later.
        this.destroyTile(tile, next(), shot.delay);
        this.showLightningCall(tile.x, tile.y, shot.delay);

        let run = shot.delay + this.lightningWindUp;

        targets.forEach((target, index) => {

            const at = shot.delay + this.lightningWindUp + index * this.lightningStagger;

            this.showLightningBolt(target.x, target.y, at);

            // The cell is claimed now - the grid cannot be left open for the
            // fall to drop something new into a cell a bolt is already on its
            // way to - but it is only seen to go as the bolt lands on it.
            this.takeCell(target.i, target.j, at + this.lightningStrikeTime, claim, next);

            run = Math.max(run, at + this.lightningStrikeTime);
        });

        return run + 120;
    }

    // What the bolts go after: the food the customers at the counter are still
    // short of, neediest order first, and never more of one food than that
    // order still wants. With nothing on the board that anybody ordered - the
    // counter empty, or their food already gone - it falls back on whichever
    // food there is most of, so a bolt is never wasted.
    lightningTargets(count) {

        const picked = [];
        const taken = new Set();

        const wanted = this.orderWants();

        wanted.forEach((want) => {

            if (picked.length >= count) return;

            const room = Math.min(want.remaining, count - picked.length);
            const found = this.tilesOfType(want.type, taken).slice(0, room);

            found.forEach((tile) => {
                taken.add(tile);
                picked.push(tile);
            });
        });

        // Only when the counter wants nothing that is standing on the board -
        // every order served, or their food already cleared. A bolt left over
        // because an order was nearly done is not spent on something nobody
        // asked for: it simply is not called.
        if (!picked.length) {

            const spare = this.tilesOfType(this.mostCommonType(), taken).slice(0, count);

            spare.forEach((tile) => {
                taken.add(tile);
                picked.push(tile);
            });
        }

        return picked;
    }

    // The orders as the board sees them: which of this level's foods is still
    // owed and how much of it, neediest first. Anything ordered that this level
    // does not actually deal - or an order already served - is not a target.
    orderWants() {

        const panel = this.scene.topPanel;
        const slots = (panel && panel.targetArr) || [];

        const wants = [];

        slots.forEach((slot) => {

            if (!slot || slot.done) return;

            const remaining = slot.remaining - (slot.pending || 0);
            if (remaining <= 0) return;

            const type = this.typeOfFood(slot.food);
            if (type === -1) return;

            wants.push({ type: type, remaining: remaining });
        });

        wants.sort((a, b) => b.remaining - a.remaining);

        return wants;
    }

    // A counter order names its food by atlas frame; a tile carries an index
    // into this level's foods. Frames come both plain and namespaced, so they
    // are compared the way the collect flight compares them - on the last part
    // of the name.
    typeOfFood(food) {

        const key = String(food).split("/").pop().toLowerCase();

        return this.tileTypes.findIndex(name => String(name).split("/").pop().toLowerCase() === key);
    }

    // Every plain item of one food standing on the board, shuffled, so a second
    // bolt on the same food does not walk the column the first one did.
    tilesOfType(type, taken = new Set()) {

        if (type === null || type === undefined || type === -1) return [];

        const found = [];

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {

                if (this.boardStatus[c][r] !== GameConstants.NORMAL) continue;

                const tile = this.tiles[c][r];

                if (!tile || tile.special || tile.type !== type) continue;
                if (taken.has(tile)) continue;

                // A bolt is spent on the order, so it is never called down on
                // food that is under ice - the ice would take the strike and
                // the customer would still be waiting.
                if (this.isIced(tile)) continue;

                found.push(tile);
            }
        }

        for (let i = found.length - 1; i > 0; i--) {
            const j = Phaser.Math.Between(0, i);
            [found[i], found[j]] = [found[j], found[i]];
        }

        return found;
    }

    // The powerup going up rather than off: it flares where it was standing and
    // hands the move over to the sky. Without it the first bolt lands out of
    // nowhere and the cell the player actually tapped does nothing.
    showLightningCall(x, y, delay = 0) {

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive) return;

            this.scene.playSounds("lightning_call");

            const flare = this.scene.add.sprite(x, y, "sheet", this.lightningFrame);
            flare.setScale(this.tileScale * this.getFrameFit(this.lightningFrame));
            flare.setBlendMode(Phaser.BlendModes.ADD);
            this.fxGrp.add(flare);

            this.scene.tweens.add({
                targets: flare,
                scale: flare.scale * 2.1,
                alpha: 0,
                duration: this.lightningWindUp,
                ease: "Quad.easeOut",
                onComplete: () => flare.destroy(),
            });

            this.showMatchBurst(x, y, { count: 10, radius: this.tileWidth, scale: 1.1 });
        });
    }

    // One strike. The bolt is drawn as a jagged line from well above the board
    // down onto the cell - a hot core with a wider glow behind it - and it is
    // gone in a couple of frames: a bolt that hangs about stops being lightning.
    // The camera is knocked as it lands, so the hit is felt as well as seen.
    showLightningBolt(x, y, delay = 0) {

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive) return;

            this.scene.playSounds("lightning_strike");

            const bolt = this.scene.add.graphics();
            this.fxGrp.add(bolt);

            const top = y - this.tileHeight * this.lightningDrop;
            const step = this.tileHeight * this.lightningSegment;
            const wander = this.tileWidth * this.lightningWander;

            const points = [{ x: x, y: top }];

            for (let at = top + step; at < y; at += step) {
                points.push({ x: x + Phaser.Math.FloatBetween(-wander, wander), y: at });
            }

            // The last point is the cell itself: however far the bolt wandered
            // on the way down, it lands exactly on what it came for.
            points.push({ x: x, y: y });

            const stroke = (width, colour, alpha) => {

                bolt.lineStyle(width, colour, alpha);
                bolt.beginPath();
                bolt.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length; i++) bolt.lineTo(points[i].x, points[i].y);

                bolt.strokePath();
            };

            stroke(this.tileWidth * .34, this.lightningGlow, .35);
            stroke(this.tileWidth * .16, this.lightningGlow, .7);
            stroke(this.tileWidth * .06, this.lightningCore, 1);

            bolt.setBlendMode(Phaser.BlendModes.ADD);

            // Flicker, then out. Two beats of it, so the strike reads as a bolt
            // rather than as a line someone drew and faded.
            this.scene.tweens.chain({
                targets: bolt,
                tweens: [
                    { alpha: .35, duration: 40, ease: "Linear" },
                    { alpha: 1, duration: 40, ease: "Linear" },
                    { alpha: 0, duration: this.lightningFlash, ease: "Quad.easeIn" },
                ],
                onComplete: () => bolt.destroy(),
            });

            // The ground the bolt hit: a white flash on the cell, opening out
            // and away, under the sparks the cell throws as it gives.
            const hit = this.scene.add.circle(x, y, this.tileWidth * .5, this.lightningCore, .9);
            hit.setBlendMode(Phaser.BlendModes.ADD);
            this.fxGrp.add(hit);

            this.scene.tweens.add({
                targets: hit,
                scale: 2.2,
                alpha: 0,
                duration: this.lightningFlash,
                ease: "Cubic.easeOut",
                onComplete: () => hit.destroy(),
            });

            this.showMatchBurst(x, y, { count: 12, radius: this.tileWidth * 1.2, scale: 1.2 });

            // Short and hard. A strike is a crack, not the roll of a bomb going
            // off, so it hits the camera further than a blast does and is over
            // sooner - and a run of them reads as separate hits.
            if (this.scene.cameras.main) this.scene.cameras.main.shake(160, .012);
        });
    }

    // One cell, taken by whatever is passing over it. Everything that clears
    // ground - a blast, a rocket - goes through here, so a crate is dented
    // rather than blown away and a charge is lit rather than cleared no matter
    // which of them reached it.
    takeCell(col, row, delay, claim, next) {

        if (col < 0 || row < 0 || col >= this.columns || row >= this.rows) return;

        const status = this.boardStatus[col][row];

        if (status === GameConstants.EMPTY) return;
        if (status === GameConstants.DESTROYED) return;

        const tile = this.tiles[col][row];
        if (!tile) return;

        // A crate is not blown away, it is knocked back a stage like anything
        // else that hits it - so a bomb next to a fresh box dents it, and the
        // cell only opens on the second hit.
        if (this.isBlocker(tile)) {
            this.damageBlocker(tile);
            return;
        }

        if (this.isCharge(tile)) {
            claim(tile, delay);
            return;
        }

        this.destroyTile(tile, next(), delay);
    }

    // A flash on the cell and a ring thrown out to the edge of what was cleared,
    // so the blast reads as covering exactly the block it took.
    showTntBlast(x, y, radius, delay = 0) {

        // Wider than the cells it actually took, so the blast covers its own
        // edges and spills past them instead of stopping short.
        const reach = this.tileWidth * (radius * 2 + 1) * this.blastSpread;

        // The authored bomb if it loaded, otherwise the board draws its own.
        const played = this.scene.blastAt && this.scene.blastAt(x, y, reach, delay);

        if (!played) this.showFallbackBlast(x, y, reach, delay);

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive) return;

            this.scene.playSounds("tnt_blow");

            // A bigger charge hits harder, and the shake is short enough that a
            // chain of them reads as separate knocks rather than one long rattle.
            if (this.scene.cameras.main) this.scene.cameras.main.shake(200, .005 * radius);
        });
    }

    // What the blast does to the tiles it did not take: everything still
    // standing around the crater is shoved away from the centre and springs
    // back. It is the part that sells the hit - the cleared cells are already
    // gone by the time the artwork plays, so without this the board around the
    // explosion just sits there.
    shockwave(col, row, radius, delay = 0, strength = 1) {

        const span = radius + 2;

        for (let c = col - span; c <= col + span; c++) {
            for (let r = row - span; r <= row + span; r++) {

                if (c < 0 || r < 0 || c >= this.columns || r >= this.rows) continue;
                if (this.boardStatus[c][r] !== GameConstants.NORMAL) continue;

                const tile = this.tiles[c][r];

                // Anything in the air is on its way somewhere and is left alone -
                // shoving it would fight the tween that owns its position.
                if (!tile || tile.tween || tile.sideDropTween || tile.landTween) continue;

                const dx = c - col;
                const dy = r - row;

                const distance = Math.hypot(dx, dy);
                if (!distance || distance > span) continue;

                // Falls off with distance, so the ring nearest the blast is
                // thrown and the outside of it barely stirs.
                const push = (this.tileWidth * .34 * strength) / (distance * distance);

                this.stopShockwave(tile);

                tile.shockTween = this.scene.tweens.chain({
                    targets: tile,
                    delay: delay + distance * 25,
                    tweens: [{
                            x: tile.xPos + (dx / distance) * push,
                            y: tile.yPos + (dy / distance) * push,
                            duration: 110,
                            ease: "Quad.easeOut",
                        },
                        {
                            x: tile.xPos,
                            y: tile.yPos,
                            duration: 320,
                            ease: "Back.easeOut",
                        }
                    ],
                    onComplete: () => {
                        tile.shockTween = "";
                        tile.x = tile.xPos;
                        tile.y = tile.yPos;
                    }
                });
            }
        }
    }

    // Used when the bomb skeleton is not loaded. Drawn as a graphic rather than
    // baked into a texture and blitted: a sprite is only as good as the texture
    // key behind it, and a key that is not there is not an invisible sprite -
    // Phaser stands in its own "missing texture" image, a bright green square.
    showFallbackBlast(x, y, reach, delay) {

        const RING = 60;

        const ring = this.scene.add.graphics();
        ring.lineStyle(10, 0xffffff, 1);
        ring.strokeCircle(0, 0, RING);
        ring.setPosition(x, y);
        ring.setScale(this.tileWidth * .25 / (RING * 2));
        ring.setBlendMode(Phaser.BlendModes.ADD);
        ring.alpha = 0;
        this.fxGrp.add(ring);

        this.scene.tweens.add({
            targets: ring,
            scale: reach / (RING * 2),
            alpha: { from: .95, to: 0 },
            delay: delay,
            duration: 380,
            ease: "Cubic.easeOut",
            onComplete: () => ring.destroy()
        });

        const flash = this.scene.add.sprite(x, y, "sheet", this.tntFrame);
        flash.setScale(this.tileScale * this.getTntFit());
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.fxGrp.add(flash);

        this.scene.tweens.add({
            targets: flash,
            scale: this.tileScale * this.getTntFit() * 2,
            alpha: 0,
            angle: Phaser.Math.Between(-40, 40),
            delay: delay,
            duration: 300,
            ease: "Quad.easeOut",
            onComplete: () => flash.destroy()
        });

        this.showMatchBurst(x, y);
    }

    // ---------------------------------------------------------------->
    // Rockets
    // ---------------------------------------------------------------->

    // The stars a rocket leaves behind it. Registered the same way the crate
    // break is - off the atlas, once, and only if the frames actually shipped.
    ensureRocketTrailAnim() {

        if (this.scene.anims.exists(this.rocketTrailAnim)) return true;

        if (!this.scene.textures.exists("sheet")) return false;
        if (!this.scene.textures.getFrame("sheet", "rocket_trail/1")) return false;

        this.scene.anims.create({
            key: this.rocketTrailAnim,
            frames: this.scene.anims.generateFrameNames("sheet", {
                prefix: "rocket_trail/",
                start: 1,
                end: this.rocketTrailFrames
            }),
            frameRate: this.rocketTrailRate,
            repeat: 0
        });

        return true;
    }

    // The moment of ignition, on the cell the rocket was standing on: a bang, a
    // knock, and a spray of sparks thrown out along the line it is about to
    // leave down - so the eye is already looking the right way when the two
    // halves go.
    showRocketLaunch(x, y, horizontal, delay) {

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive) return;

            this.scene.playSounds("rocket_fire");

            if (this.scene.cameras.main) this.scene.cameras.main.shake(120, .003);

            this.showMatchBurst(x, y, { count: 8, radius: this.tileWidth * .55, scale: .9 });

            const flash = this.scene.add.graphics();
            flash.fillStyle(0xffffff, 1);
            flash.fillRoundedRect(-this.tileWidth * .6, -this.tileHeight * .18, this.tileWidth * 1.2, this.tileHeight * .36, this.tileHeight * .18);
            flash.setPosition(x, y);
            flash.setAngle(horizontal ? 0 : 90);
            flash.setBlendMode(Phaser.BlendModes.ADD);
            this.fxGrp.add(flash);

            this.scene.tweens.add({
                targets: flash,
                scaleX: 2.2,
                scaleY: .2,
                alpha: 0,
                duration: 240,
                ease: "Quad.easeOut",
                onComplete: () => flash.destroy()
            });
        });
    }

    // One half of the rocket, on its way out. It flies at the same speed the
    // cells under it are being cleared at, carries on past the last of them so
    // it is seen to leave the board rather than to stop on it, and drops a puff
    // of stars behind it the whole way.
    flyRocket(x, y, horizontal, direction, steps, delay) {

        const special = horizontal ? GameConstants.ROCKET_H : GameConstants.ROCKET_V;
        const frame = this.rocketFrames[special];

        if (!this.scene.textures.getFrame("sheet", frame)) return;

        const cells = steps + this.rocketOverrun;
        const duration = cells * this.rocketFlightPerCell;
        const fit = this.getSpecialFit(special);

        const rocket = this.scene.add.sprite(x, y, "sheet", frame);
        rocket.setScale(this.tileScale * fit);
        rocket.alpha = 0;

        // The artwork is drawn pointing right and pointing up. The half going
        // the other way is the same picture turned over, so both halves come off
        // one frame instead of needing a mirrored copy in the atlas.
        if (horizontal) rocket.setFlipX(direction > 0 ? false : true);
        else rocket.setFlipY(direction > 0);

        this.fxGrp.add(rocket);

        const toX = horizontal ? x + direction * cells * this.tileWidth : x;
        const toY = horizontal ? y : y + direction * cells * this.tileHeight;

        this.scene.tweens.add({
            targets: rocket,
            alpha: 1,
            delay: delay,
            duration: 60,
            ease: "Sine.easeOut",
        });

        this.scene.tweens.add({
            targets: rocket,
            x: toX,
            y: toY,
            delay: delay,
            duration: duration,
            ease: "Linear",
            onComplete: () => rocket.destroy()
        });

        // Fades out over the overrun, so the rocket thins away past the edge of
        // the board instead of being cut off on the last cell.
        this.scene.tweens.add({
            targets: rocket,
            alpha: 0,
            scale: this.tileScale * fit * .7,
            delay: delay + duration - this.rocketOverrun * this.rocketFlightPerCell,
            duration: this.rocketOverrun * this.rocketFlightPerCell,
            ease: "Quad.easeIn"
        });

        this.trailRocket(rocket, duration, delay);
    }

    // The stars dropped behind a rocket in flight. Read off the rocket itself
    // every time rather than worked out in advance, so the trail cannot drift
    // away from the thing that is supposed to be making it.
    trailRocket(rocket, duration, delay) {

        if (!this.ensureRocketTrailAnim()) return;

        const puffs = Math.max(Math.floor(duration / this.rocketTrailEvery), 1);

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive || !rocket.active) return;

            this.scene.time.addEvent({
                delay: this.rocketTrailEvery,
                repeat: puffs - 1,
                startAt: this.rocketTrailEvery,
                callback: () => {

                    if (!this.alive || !rocket.active) return;

                    const puff = this.scene.add.sprite(rocket.x, rocket.y, "sheet", "rocket_trail/1");
                    puff.setScale(this.tileWidth / puff.width * .9);
                    puff.setAngle(Phaser.Math.Between(0, 360));
                    puff.setBlendMode(Phaser.BlendModes.ADD);
                    this.fxGrp.add(puff);

                    puff.play(this.rocketTrailAnim);
                    puff.once("animationcomplete", () => puff.destroy());

                    this.scene.tweens.add({
                        targets: puff,
                        scale: puff.scale * 1.35,
                        alpha: 0,
                        duration: (this.rocketTrailFrames / this.rocketTrailRate) * 1000,
                        ease: "Quad.easeOut"
                    });
                }
            });
        });
    }

    // The draught off a rocket going past: the two items lying either side of
    // the cell it is crossing are shoved away from its lane and spring back. The
    // lane itself is being cleared, so this is the only thing that shows the
    // rocket touching the board at all.
    rocketWash(col, row, horizontal, delay) {

        const sides = horizontal ? [
            [0, -1],
            [0, 1]
        ] : [
            [-1, 0],
            [1, 0]
        ];

        sides.forEach(([dx, dy]) => {

            const c = col + dx;
            const r = row + dy;

            if (c < 0 || r < 0 || c >= this.columns || r >= this.rows) return;
            if (this.boardStatus[c][r] !== GameConstants.NORMAL) return;

            const tile = this.tiles[c][r];

            // Anything in the air is on its way somewhere and is left alone -
            // shoving it would fight the tween that owns its position.
            if (!tile || tile.tween || tile.sideDropTween || tile.landTween) return;

            const push = this.tileWidth * .28 * this.rocketWake;

            this.stopShockwave(tile);

            tile.shockTween = this.scene.tweens.chain({
                targets: tile,
                delay: delay,
                tweens: [{
                        x: tile.xPos + dx * push,
                        y: tile.yPos + dy * push,
                        duration: 90,
                        ease: "Quad.easeOut",
                    },
                    {
                        x: tile.xPos,
                        y: tile.yPos,
                        duration: 300,
                        ease: "Back.easeOut",
                    }
                ],
                onComplete: () => {
                    tile.shockTween = "";
                    tile.x = tile.xPos;
                    tile.y = tile.yPos;
                }
            });
        });
    }

    // ---------------------------------------------------------------->
    // Magnet
    // ---------------------------------------------------------------->

    // The magnet switching on. It swells, lights up on an additive copy of its
    // own artwork - the same trick the charge glow uses, and for the same reason
    // - and throws a ring out across the board ahead of the first item arriving.
    showMagnetPull(magnet, delay, until) {

        this.scene.time.delayedCall(delay, () => {

            if (!this.alive || !magnet.active) return;

            this.scene.playSounds("magnet_pull");

            this.tileGrp.bringToTop(magnet);

            // Both of these run until the magnet is spent, so they are held onto
            // and stopped by hand - a repeating tween left on a tile that has
            // gone back in the pool would still be squashing the next item to
            // come out of it.
            const throb = this.scene.tweens.add({
                targets: magnet,
                scaleX: this.tileScale * 1.18,
                scaleY: this.tileScale * .88,
                duration: 160,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

            const fit = this.getFrameFit(this.magnetFrame);

            const glow = this.scene.add.sprite(magnet.x, magnet.y, "sheet", this.magnetFrame);
            glow.setScale(this.tileScale * fit);
            glow.setBlendMode(Phaser.BlendModes.ADD);
            glow.alpha = 0;
            this.fxGrp.add(glow);

            const shine = this.scene.tweens.add({
                targets: glow,
                alpha: .8,
                scale: this.tileScale * fit * 1.15,
                duration: 220,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

            this.scene.time.delayedCall(until, () => {

                throb.stop();
                shine.stop();
                glow.destroy();

                if (magnet.active) magnet.setScale(this.tileScale);
            });

            const RING = 60;

            const ring = this.scene.add.graphics();
            ring.lineStyle(8, 0x8fd8ff, 1);
            ring.strokeCircle(0, 0, RING);
            ring.setPosition(magnet.x, magnet.y);
            ring.setScale(this.tileWidth * .2 / (RING * 2));
            ring.setBlendMode(Phaser.BlendModes.ADD);
            this.fxGrp.add(ring);

            this.scene.tweens.add({
                targets: ring,
                scale: (this.tileWidth * this.columns * 1.2) / (RING * 2),
                alpha: { from: .9, to: 0 },
                duration: 520,
                ease: "Cubic.easeOut",
                onComplete: () => ring.destroy()
            });
        });
    }

    // One item on its way in. It is tugged back away from the magnet first and
    // then snapped in - the pull has to be felt before it is obeyed, or the
    // whole board simply slides to one cell and reads as a bug.
    flyToMagnet(tile, magnet, delay) {

        const dx = tile.x - magnet.x;
        const dy = tile.y - magnet.y;
        const distance = Math.hypot(dx, dy) || 1;

        const backX = tile.x + (dx / distance) * this.tileWidth * .22;
        const backY = tile.y + (dy / distance) * this.tileHeight * .22;

        this.stopShockwave(tile);
        this.tileGrp.bringToTop(tile);

        tile.shockTween = this.scene.tweens.chain({
            targets: tile,
            delay: delay,
            tweens: [{
                    x: backX,
                    y: backY,
                    scale: this.tileScale * 1.12,
                    duration: this.magnetPullTime * .3,
                    ease: "Sine.easeOut",
                },
                {
                    x: magnet.x,
                    y: magnet.y,
                    scale: this.tileScale * .3,
                    angle: Phaser.Math.Between(-160, 160),
                    duration: this.magnetPullTime * .7,
                    ease: "Back.easeIn",
                    easeParams: [1.4],
                }
            ],
            onComplete: () => {
                tile.shockTween = "";
            }
        });
    }

    // Everything after a clear: the board falls back into shape, and once it is
    // settled whatever the fall lined up is played out as the next match.
    async settleBoard() {

        await this.wait(this.fallDelay);
        if (!this.alive) return false;

        this.fillEmpty();
        this.populateItems();

        // Keep the cascade running. Every tick starts whatever can move now - a
        // straight fall, a new item off the top, a diagonal slide - without waiting
        // for the moves already in the air, so the board empties as one continuous
        // stream rather than one item per tween.
        let passes = 0;

        while (passes++ < 500) {

            const fillMoved = this.fillEmpty();

            this.populateItems();

            const sideMoved = this.checkForSideDrop();

            if (!fillMoved && !sideMoved && this.activeSideDrops === 0) break;

            await this.wait(this.cascadeTick);
            if (!this.alive) return false;
        }

        // The grid is settled, but the last items are still on screen. What follows -
        // the next match check, giving input back - used to be able to count on that.
        await this.waitForFall();
        if (!this.alive) return false;

        this.scene.time.addEvent({
            delay: this.fallDelay * 1.2,
            callback: () => {
                if (this.findMatches().length) {
                    this.checkForMatches();
                } else {
                    this.enable();
                }
            }
        });

        return true;
    }

    wait(delay) {

        if (!this.alive) return Promise.resolve();

        return new Promise(resolve => {
            this.scene.time.delayedCall(delay, resolve);
        });
    }

    enable() {

        if (!this.alive) return;

        this.isAutoMatching = false;
        this.canClick = true;

        if (this.gameEnded) return;

        if (!this.findMoves().length) {
            this.shuffleBoard(() => {
                this.checkForMatches();
            });
            return;
        }

        this.startHintTimer();
    }

    getMatchScore(match) {

        return match.tiles.length;
    }

    // Best match these two actually create by swapping. Matches already sitting on
    // the board are ignored - they are not this swap's doing, and counting them
    // would make every pair on the board look like a legal move.
    getSwapMatch(tileA, tileB) {

        this.swapType(tileA, tileB);

        let best = null;
        const matches = this.findAllMatches(this.tiles);

        for (const match of matches) {
            if (match.tiles.indexOf(tileA) === -1 && match.tiles.indexOf(tileB) === -1) continue;
            if (!best || this.getMatchScore(match) > this.getMatchScore(best)) best = match;
        }

        const result = best ? { match: best, score: this.getMatchScore(best) } : null;

        this.swapType(tileA, tileB);

        return result;
    }

    findMoves() {

        const moves = [];

        const addMove = (col1, row1, col2, row2) => {

            const tileA = this.tiles[col1][row1];
            const tileB = this.tiles[col2][row2];

            if (!this.canSwapTile(tileA) || !this.canSwapTile(tileB)) return;

            // Charges are counted separately below - a charge has no food type
            // to try a swap with, and lending it one would invent a match.
            if (tileA.special || tileB.special) return;

            const swapMatch = this.getSwapMatch(tileA, tileB);
            if (!swapMatch) return;

            moves.push({
                column1: col1,
                row1: row1,
                column2: col2,
                row2: row2,
                score: swapMatch.score
            });
        };

        for (let j = 0; j < this.rows; j++) {
            for (let i = 0; i < this.columns - 1; i++) {
                addMove(i, j, i + 1, j);
            }
        }

        for (let i = 0; i < this.columns; i++) {
            for (let j = 0; j < this.rows - 1; j++) {
                addMove(i, j, i, j + 1);
            }
        }

        // A charge, a rocket and a magnet are playable on their own: swapping one
        // with any neighbour sets it off, so it always counts as a move and the
        // board must never shuffle out from under one. Scored above every swap,
        // so the hint points at it.
        for (let i = 0; i < this.columns; i++) {
            for (let j = 0; j < this.rows; j++) {

                const tile = this.tiles[i][j];
                if (!this.isCharge(tile) || !this.canSwapTile(tile)) continue;

                const neighbour = [
                    [i + 1, j],
                    [i - 1, j],
                    [i, j + 1],
                    [i, j - 1]
                ].find(([c, r]) =>
                    c >= 0 && r >= 0 && c < this.columns && r < this.rows &&
                    this.canSwapTile(this.tiles[c][r])
                );

                if (!neighbour) continue;

                moves.push({
                    column1: i,
                    row1: j,
                    column2: neighbour[0],
                    row2: neighbour[1],
                    score: 99
                });
            }
        }

        // Best payoff first, so whoever takes moves[0] - the hint - gets a good move.
        moves.sort((a, b) => b.score - a.score);

        return moves;
    }

    shufflePlayableTiles(tiles) {

        const validPositions = [];
        const validTiles = [];

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {

                const tile = tiles[c][r];

                // A crate is part of the level's shape, not part of the food -
                // a shuffle rearranges the board around it. Frozen food is left
                // out for the same reason: where it is standing is the puzzle.
                if (this.isBlocker(tile)) continue;
                if (this.isIced(tile)) continue;

                if (tile.level !== GameConstants.EMPTY) {
                    validPositions.push({ c, r });
                    validTiles.push(tile);
                }
            }
        }

        // Fisher-Yates
        for (let i = validTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]];
        }

        const newTiles = tiles.map(col => [...col]);

        for (let k = 0; k < validPositions.length; k++) {
            const { c, r } = validPositions[k];
            newTiles[c][r] = validTiles[k];
        }

        return newTiles;
    }

    shuffleBoard(callback) {

        if (this.isBusy) return;
        this.isBusy = true;
        this.canClick = false;

        const MAX_ATTEMPTS = 50;
        let attempts = 0;
        let shuffled;

        do {
            shuffled = this.shufflePlayableTiles(this.tiles);

            // Try the arrangement out on a copy of the grid before committing to it.
            const prevTiles = this.tiles;
            this.tiles = shuffled;
            this.syncTileIndices(shuffled);
            const moves = this.findMoves();
            this.tiles = prevTiles;
            this.syncTileIndices(prevTiles);

            if (moves.length) break;

            attempts++;
        } while (attempts < MAX_ATTEMPTS);

        // Nothing shuffled into a playable board - reroll the food instead.
        if (attempts >= MAX_ATTEMPTS) {
            for (let c = 0; c < this.columns; c++) {
                for (let r = 0; r < this.rows; r++) {
                    if (this.isBlocker(this.tiles[c][r])) continue;

                    // Rerolling a frozen cell would take its ice off with the
                    // food - the reroll is for the board around it.
                    if (this.isIced(this.tiles[c][r])) continue;

                    if (this.tiles[c][r].level !== GameConstants.EMPTY) this.setRandomTile(this.tiles[c][r]);
                }
            }

            this.isBusy = false;
            callback();
            return;
        }

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {
                this.tiles[c][r] = shuffled[c][r];
            }
        }
        this.syncTileIndices(this.tiles);
        this.updateTilePositions(this.tiles);

        this.isBusy = false;
        callback();
    }

    syncTileIndices(tiles) {

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {
                tiles[c][r].i = c;
                tiles[c][r].j = r;
            }
        }
    }

    updateTilePositions(tiles, duration = 200) {

        for (let c = 0; c < this.columns; c++) {
            for (let r = 0; r < this.rows; r++) {

                const tile = tiles[c][r];
                if (!tile) continue;

                tile.xPos = this.getXFromCol(c);
                tile.yPos = this.getYFromRow(r);

                this.scene.tweens.add({
                    targets: tile,
                    x: tile.xPos,
                    y: tile.yPos,
                    duration: duration,
                    ease: 'Cubic.easeOut'
                });
            }
        }
    }

    getXFromCol(col) {

        return (this.tileWidth * col) + this.offsetX;
    }

    getYFromRow(row) {

        return (this.tileHeight * row) + this.offsetY;
    }

    // Which cell a point in board space belongs to. Used by anything that is
    // handed a position rather than a tile - an effect playing over a cell whose
    // tile has already gone back in the pool.
    getColFromX(x) {

        return Math.round((x - this.offsetX) / this.tileWidth);
    }

    getRowFromY(y) {

        return Math.round((y - this.offsetY) / this.tileHeight);
    }

    update() {

        if (!this.selectedTile) return;
        if (!this.canClick) return;

        const tile = this.getTileUnderMouse();
        if (!tile || tile === this.selectedTile) return;
        if (!this.canSwapTile(tile) || !this.canSwapTile(this.selectedTile)) return;

        const isNeighbour =
            (Math.abs(tile.x - this.selectedTile.x) <= this.tileWidth && tile.y - this.selectedTile.y === 0) ||
            (tile.x - this.selectedTile.x === 0 && Math.abs(tile.y - this.selectedTile.y) <= this.tileHeight);

        if (!isNeighbour) return;

        const tile1 = this.selectedTile;
        const tile2 = tile;

        this.scene.playSounds("swap");
        this.hideHint();
        this.releasePress();

        this.canClick = false;
        this.matched = false;
        this.selectedTile = null;

        const x1 = tile1.x;
        const y1 = tile1.y;
        const x2 = tile2.x;
        const y2 = tile2.y;

        this.scene.tweens.add({
            targets: tile1,
            x: x2,
            y: y2,
            ease: this.swapEase,
            easeParams: this.swapEaseParams,
            duration: this.tweenSpeed,
        });

        this.scene.tweens.add({
            targets: tile2,
            x: x1,
            y: y1,
            ease: this.swapEase,
            easeParams: this.swapEaseParams,
            duration: this.tweenSpeed,
            onComplete: () => {

                // The level can change while the swap is still animating. The
                // board these two belong to is gone by the time they land -
                // there is nothing left to match them against and no move
                // counter to spend.
                if (!this.alive) return;

                this.swap(tile1, tile2);

                tile1.xPos = tile1.x;
                tile1.yPos = tile1.y;
                tile2.xPos = tile2.x;
                tile2.yPos = tile2.y;

                // Swapping a charge, a rocket or a magnet with anything sets it
                // off. Two swapped into each other both go off, and two charges
                // together throw a blast wider than either would alone.
                const charges = [tile1, tile2].filter(tile => this.isCharge(tile));

                if (charges.length) {

                    // A magnet takes the colour it was swapped into. Swapped into
                    // something that has no colour - the other magnet, a rocket,
                    // a charge - it takes the whole board instead.
                    charges.forEach((magnet) => {

                        if (!this.isMagnet(magnet)) return;

                        const other = magnet === tile1 ? tile2 : tile1;

                        if (this.isCharge(other)) magnet.pullAll = true;
                        else magnet.pullType = other.type;
                    });

                    const bombs = charges.filter(tile => tile.special === GameConstants.TNT);

                    this.matched = true;
                    if (this.scene.moves) this.scene.moves.use(1);
                    this.detonate(charges, bombs.length > 1 ? this.tntPairRadius : this.tntRadius);
                    return;
                }

                // Which two tiles the player moved, so a run of four or more can
                // leave its charge on the one they actually chose.
                this.lastSwap = [tile1, tile2];

                if (!this.findMatches().length) {
                    this.lastSwap = null;
                    this.swapBack(tile1, tile2);
                } else {
                    // The swap made a match, so it costs a move. A swap that
                    // bounces back is free, and the cascades that fall out of
                    // this one are part of the same move.
                    this.matched = true;
                    if (this.scene.moves) this.scene.moves.use(1);
                    this.checkForMatches();
                }
            }
        });
    }

    // Items fall in from above the board, so they have to be clipped to the cells
    // that actually exist.
    createMask() {

        if (this.maskGraphics) {
            this.maskGraphics.destroy();
            this.maskGraphics = "";
        }

        this.maskGraphics = this.scene.add.graphics();
        this.maskGraphics.fillStyle(0xffffff, .5);

        const scale = this.scene.gameScale * this.scaleX;

        for (let i = 0; i < this.columns; i++) {
            for (let j = 0; j < this.rows; j++) {

                if (this.tiles[i][j].level === GameConstants.EMPTY) continue;

                const matrix = this.tiles[i][j].box.getWorldTransformMatrix();

                this.maskGraphics.fillRect(matrix.tx - (this.tileWidth * scale) / 2, matrix.ty - (this.tileHeight * scale) / 2, this.tileWidth * scale, this.tileHeight * scale);
            }
        }

        this.maskGraphics.visible = false;

        const mask = this.maskGraphics.createGeometryMask();
        for (let i = 0; i < this.columns; i++) {
            for (let j = 0; j < this.rows; j++) {
                this.tiles[i][j].setMask(mask);
            }
        }
    }

    showHint() {

        if (this.isAutoMatching) return;

        if (!this.canClick) {
            this.hintTimer = this.scene.time.delayedCall(50, () => {
                if (this.gameStarted && !this.gameEnded) {
                    this.hideHint();
                    this.showHint();
                }
            });
            return;
        }

        this.hideHint();

        // findMoves() only returns swaps the player can actually perform, sorted
        // best payoff first, so the top one is both possible and worth playing.
        const bestMove = this.findMoves()[0];
        if (!bestMove) return;

        const tile1 = this.tiles[bestMove.column1][bestMove.row1];
        const tile2 = this.tiles[bestMove.column2][bestMove.row2];
        if (!tile1 || !tile2) return;

        this.hintTile1 = tile1;
        this.hintTile2 = tile2;
        this.hintTile1Origin = { x: tile1.x, y: tile1.y };
        this.hintTile2Origin = { x: tile2.x, y: tile2.y };

        this.bringToTop(tile2);
        this.bringToTop(tile1);

        const mid1X = tile1.x + (tile2.x - tile1.x) * 0.5;
        const mid1Y = tile1.y + (tile2.y - tile1.y) * 0.5;
        const mid2X = tile2.x + (tile1.x - tile2.x) * 0.5;
        const mid2Y = tile2.y + (tile1.y - tile2.y) * 0.5;

        // A nudge, not a slosh. The pair leans towards each other, holds the
        // pose for a beat so the eye can read which two are being pointed at,
        // eases back, and waits before saying it again. Continuous motion at
        // this size stops registering as a hint and just makes the board fidget.
        const hint = {
            duration: 420,
            ease: "Sine.easeInOut",
            hold: 140,
            yoyo: true,
            repeat: -1,
            repeatDelay: 900,
            delay: 400
        };

        this.hintTile1Tween = this.scene.tweens.add({
            targets: tile1,
            x: mid1X,
            y: mid1Y,
            ...hint
        });

        this.hintTile2Tween = this.scene.tweens.add({
            targets: tile2,
            x: mid2X,
            y: mid2Y,
            ...hint
        });
    }

    startHintTimer() {

        if (this.isAutoMatching) return;
        this.resetHintTimer();

        this.hintTimer = this.scene.time.delayedCall(this.hintDelay, () => {
            if (this.gameStarted && !this.gameEnded) this.showHint();
        });
    }

    resetHintTimer() {

        if (this.hintTimer) {
            this.scene.time.removeEvent(this.hintTimer);
            this.hintTimer = null;
        }
    }

    hideHint() {

        if (this.hintTile1Tween) {
            this.hintTile1Tween.stop();
            this.hintTile1Tween = null;
        }
        if (this.hintTile2Tween) {
            this.hintTile2Tween.stop();
            this.hintTile2Tween = null;
        }

        if (this.hintTile1 && this.hintTile1Origin) {
            this.hintTile1.x = this.hintTile1Origin.x;
            this.hintTile1.y = this.hintTile1Origin.y;
            this.tileGrp.add(this.hintTile1);
        }
        if (this.hintTile2 && this.hintTile2Origin) {
            this.hintTile2.x = this.hintTile2Origin.x;
            this.hintTile2.y = this.hintTile2Origin.y;
            this.tileGrp.add(this.hintTile2);
        }

        this.hintTile1 = null;
        this.hintTile2 = null;

        this.resetHintTimer();
    }

    show() {

        this.visible = true;
        this.adjust();
    }

    /**
     * Levels are played on a fresh board, so the old one has to leave nothing
     * behind: its hint timer, its scene-level pointer listener and the graphics
     * object backing the tile mask all outlive the container otherwise.
     */
    destroy(fromScene) {

        this.retired = true;
        this.gameEnded = true;
        this.canClick = false;

        this.hideHint();

        // Anything still in the air is stopped here rather than left to finish
        // against a board that no longer has a scene.
        for (let col = 0; col < this.tiles.length; col++) {
            for (let row = 0; row < this.tiles[col].length; row++) {

                const tile = this.tiles[col][row];
                if (!tile) continue;

                this.stopDropTweens(tile);
                this.stopSideDrop(tile);
            }
        }

        for (let i = 0; i < this.tilesPool.length; i++) {
            this.stopDropTweens(this.tilesPool[i]);
            this.stopSideDrop(this.tilesPool[i]);
        }

        if (this.onPointerUp && this.scene && this.scene.input) {
            this.scene.input.off('pointerup', this.onPointerUp);
            this.onPointerUp = null;
        }

        if (this.maskGraphics) {
            this.maskGraphics.destroy();
            this.maskGraphics = null;
        }

        super.destroy(fromScene);
    }
}