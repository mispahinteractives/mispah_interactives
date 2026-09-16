
const BAR_HEIGHT = 96;
const LANDSCAPE_BAR = .55;
const PLANK_LEFT = 117;
const PLANK_RIGHT = 1197;
const PLANK_TOP = 100;
const PLANK_BOTTOM = 242;
const PLANK_WIDTH = PLANK_RIGHT - PLANK_LEFT;
const PLANK_HEIGHT = PLANK_BOTTOM - PLANK_TOP;

export class UIPanel extends Phaser.GameObjects.Container {

    constructor(scene, x, y) {

        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.init();
    }

    init() {

        this.bar = this.scene.add.sprite(0, 10, "uiPanel");
        this.bar.setOrigin(0, .5);
        this.add(this.bar);

        this.adjust();
    }

    adjust() {

        this.x = dimensions.leftOffset;
        this.y = dimensions.topOffset;

        const barScaleY = dimensions.isLandscape ? LANDSCAPE_BAR : 1;

        this.bar.y = 10 * barScaleY;
        this.bar.setScale(Math.max(1, dimensions.actualWidth / this.bar.width), barScaleY);
    }
}