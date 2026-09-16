export class Tile extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.scene.add.existing(this);

        this.init();
    }

    init() {
        this.tile = this.scene.add.sprite(0, 0, "sheet");
        this.tile.setOrigin(0.5);
        this.add(this.tile);
    }

    // A tile changes what it looks like by swapping its atlas frame - there is no
    // spine object and no frame animation behind a food item.
    //
    // fit corrects for artwork that is drawn to a different size than the rest.
    // It defaults back to 1 on every change, so a tile coming out of the pool
    // never keeps the fit the item before it needed.
    changeAsset(frame, fit = 1) {
        this.tile.setTexture("sheet", frame);
        this.tile.setScale(fit);
        this.tile.visible = true;
        this.hidePizza();
    }

    // A pizza blocker: the box is the tile's own sprite and what is left of the
    // pizza is laid in it on top. Both are loose images rather than atlas
    // frames, so each comes with the scale that fits it to the cell.
    showPizza(boxKey, boxScale, pizzaKey, pizzaScale) {

        this.tile.setTexture(boxKey);
        this.tile.setScale(boxScale);
        this.tile.visible = true;

        if (!this.pizza) {
            this.pizza = this.scene.add.image(0, 0, pizzaKey);
            this.pizza.setOrigin(0.5);
            this.add(this.pizza);
        }

        this.pizza.setTexture(pizzaKey);
        this.pizza.setScale(pizzaScale);
        this.pizza.visible = true;
    }

    hidePizza() {

        if (this.pizza) this.pizza.visible = false;
    }

    hideAsset() {
        this.tile.visible = false;
    }

    // The block of ice a cell can be frozen under. It is a second sprite laid
    // over the food rather than another frame on the food itself, because what
    // is frozen has to stay visible and stay matchable - the ice is what is in
    // the way, it is not what is standing in the cell.
    //
    // It is made once and kept, so a tile that is frozen again later is not
    // paying for a new sprite each time.
    showIce(texture, tint, alpha, scale = 1) {

        if (!this.ice) {
            this.ice = this.scene.add.image(0, 0, texture);
            this.ice.setOrigin(0.5);
            this.add(this.ice);
        }

        this.ice.setTexture(texture);
        this.ice.setTint(tint);
        this.ice.setAlpha(alpha);
        this.ice.setScale(scale);
        this.ice.visible = true;

        return this.ice;
    }

    hideIce() {

        if (this.ice) this.ice.visible = false;
    }
}
