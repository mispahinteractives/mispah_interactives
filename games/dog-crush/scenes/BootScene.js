export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'boot' });
    }

    /**
     * The boot only fetches what the loading screen itself is made of - the
     * atlas its silhouettes are stamped from, the mark at the middle of it, and
     * the font its caption is set in. Everything the game proper needs is loaded
     * by the loading screen, so the bar it draws is the real one and runs all
     * the way to full.
     */
    preload() {

        this.load.atlas('sheet', 'assets/sheet/sheet.png', 'assets/sheet/sheet.json');

        // The logo is optional: drop assets/logo.png in and the loading screen
        // builds itself around it, leave it out and the screen is the caption
        // and the bar alone. A missing file is swallowed here so it never shows
        // up as a load failure.
        this.load.on('loaderror', (file) => {
            if (file.key === 'logo') console.info('preload: no assets/logo.png, running without a logo');
        });

        this.load.image('logo', 'assets/logo.png');
        this.load.script('webfont', 'js/webfont.js');

        this.loadFont('Oduda-Bold-Demo', 'fonts/Oduda-Bold-Demo.otf');

        this.width = this.game.screenBaseSize.width
        this.height = this.game.screenBaseSize.height

        this.fontsLoaded = false;
        this.assetsLoaded = false;

        this.load.on('complete', () => {
            this.assetsLoaded = true;
        });
    }

    loadFont(name, url) {
        var newFont = new FontFace(name, `url(${url})`);
        let _this = this;
        newFont.load().then(function(loaded) {
            document.fonts.add(loaded);
            _this.fontsLoaded = true;
        }).catch(function(error) {
            return error;
        });
    }

    update() {

        if (this.assetsLoaded && this.fontsLoaded && !this.gameStarted) {
            this.gameStarted = true;
            this.scene.start('preload');
        }
    }
}
