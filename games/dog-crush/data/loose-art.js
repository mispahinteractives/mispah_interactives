// Art drawn from its own image rather than a frame in the sheet atlas - the
// pizza goal and the stages of the pizza blocker. The atlas foods are all drawn
// to about the same size, and these are fitted to it, so an order for a pizza
// sits on the counter and flies off the board at the size a burger does.
const FOOD_REACH = 106;

// How much of each image's canvas the drawing actually fills. The pizza stages
// share one canvas, so the slices left stay where they were as others go.
const CONTENT = {
    Pizza: .7,
};

// Where to draw a named food from: the atlas when it has the frame, otherwise
// a loose image loaded under the same key, with the scale that fits it.
export function getArt(scene, name) {

    const sheet = scene.textures.exists("sheet") ? scene.textures.get("sheet") : null;

    if ((sheet && sheet.has(name)) || !scene.textures.exists(name)) {
        return { texture: "sheet", frame: name, fit: 1 };
    }

    const source = scene.textures.get(name).getSourceImage();
    const reach = Math.max(source.width, source.height) * (CONTENT[name] || 1);

    return { texture: name, frame: undefined, fit: reach ? FOOD_REACH / reach : 1 };
}
