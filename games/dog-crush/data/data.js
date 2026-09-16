const BASE = {
    tileWidth: 69,
    tileHeight: 69,
    tileScale: .55,
    cellTile: "board_borders/tiles",
    lives: 5,
    lifeRegenSeconds: 1800,
};

const level = (config) => Object.assign({}, BASE, config, {
    rows: config.pattern.length,
    cols: config.pattern[0].length,
});

// One order at the counter: who is waiting, what they asked for, and how much
// of it. The counter shows the food's own name, so it is taken from the food
// rather than written out twice.
const order = (character, food, count) => ({
    character,
    food,
    name: food,
    count,
});

export default {

    // 1 - one customer, one short order, a plain grid, three foods. The board
    // opens with no powerups standing on it. The order is the pizza boxed up on
    // the board: four matches beside it, four slices to the counter.
    1: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger"],
        pattern: [
            [0, 0, 0, 0, 0],
            [0, 9, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 2, 0],
            [0, 0, 0, 0, 0],
        ],
        moves: 20,
        slots: 1,
        characters: [{
            character: "Dog",
            food: "Pizza",
            name: "Pizza",
            count: 4
        }, ],
    }),

    // 2 - a second customer joins, and the counter takes a bite out of the top.
    // The first crate stands in the middle of an otherwise open board, so the
    // only thing it teaches is that matching beside a box breaks it.
    //
    // The first ice is taught against it, on the far side of the same open
    // board: a pair of frozen cells side by side, with room around them. A
    // crate is broken from beside it and ice is broken through it, and two
    // frozen cells touching each other is the shortest way to say so - they
    // cannot be swapped with anything, so the only way through them is a run
    // made out of the food already sitting under the ice.
    2: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut"],
        pattern: [
            [0, 0, -2, -2, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 2, 0, 0, 0],
            [0, 0, 0, 8, 8, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        moves: 22,
        slots: 2,
        characters: [{
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 10
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 10
            },
        ],
    }),

    // 3 - the counter fills up at three, and the board pinches in at the waist.
    //
    // The rocket in the bottom half is the introduction to them: it is lying on
    // a full, open row with nothing in the way, so setting it off shows the one
    // rule - a rocket takes the whole line it is lying on - with nothing else
    // happening at the same time to read it against. 
    3: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut"],
        pattern: [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [-2, 0, 0, 2, 0, -2],
            [-2, 0, 2, 0, 0, -2],
            [0, 0, 4, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        moves: 24,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
            {
                character: "Pig",
                food: "Burger",
                name: "Burger",
                count: 11
            },
        ],
    }),

    // 4 - a heart, and the fifth food arrives, so matches get harder to line up.
    4: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, 0, 0, -2, 0, 0, -2],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 0, 2, 0, 0],
            [0, 0, 0, 2, 2, 0, 0],
            [-2, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, -2, -2, -2],
        ],
        moves: 26,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Donut",
                name: "Donut",
                count: 13
            },
            {
                character: "Cat",
                food: "Bread",
                name: "Bread",
                count: 13
            },
            {
                character: "Pig",
                food: "Burger",
                name: "Burger",
                count: 13
            },
        ],
    }),

    // 5 - four orders for three places: the first customer to be served walks
    // off and the one waiting behind them takes their spot. A rocket board.
    //
    // And a rocket standing in it, pointed the way the board is: the middle
    // column is crates most of the way up and down, so the one it is sitting in
    // is a shaft with a box at either end. Firing it knocks both at once, which
    // is the same lesson the charge in level 1 teaches, told the other way -
    // this one reaches down a line rather than out in a ring.
    5: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, 0, -2, -2, -2],
            [-2, -2, 0, 0, 2, -2, -2],
            [-2, 0, 0, 2, 0, 0, -2],
            [0, 0, 0, 2, 0, 0, 0],
            [0, 0, 0, 5, 0, 0, 0],
            [-2, -2, 0, 2, 0, -2, -2],
            [-2, -2, 0, 0, 0, -2, -2],
        ],
        moves: 26,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
            {
                character: "Pig",
                food: "Burger",
                name: "Burger",
                count: 11
            },
            {
                character: "Dog",
                food: "Donut",
                name: "Donut",
                count: 11
            },
        ],
    }),

    // 6 - five orders, and a butterfly whose wings meet only through the middle,
    // so clearing one side leaves the other untouched.
    6: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, -2, -2, -2, 0, 0],
            [0, 0, 0, -2, 0, 0, 0],
            [-2, 0, 2, 0, 2, 0, -2],
            [-2, -2, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, -2, 0, 0, 0],
            [0, 0, -2, -2, -2, 0, 0],
        ],
        moves: 28,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 10
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 10
            },
            {
                character: "Pig",
                food: "Burger",
                name: "Burger",
                count: 10
            },
            {
                character: "Dog",
                food: "Donut",
                name: "Donut",
                count: 10
            },
            {
                character: "Cat",
                food: "Bread",
                name: "Bread",
                count: 10
            },
        ],
    }),

    // 7 - 8x8, cut in half by a diagonal. The two triangles feed each other
    // sideways as tiles fall, but nothing can be swapped across the cut.
    //
    // The magnet is introduced here, sitting against the diagonal. Five foods
    // are on this board and three of them are on order, so whichever it is
    // swapped into takes a real bite out of somebody's ticket - which is the
    // point of it: it is not a hole in the board, it is a whole colour gone.
    7: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, 0, 0, 2, 0, 0],
            [0, 0, -2, 0, 0, 0, 0, 0],
            [0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, 6, -2, 0, 0, 0],
            [0, 0, 0, 0, 0, -2, 0, 0],
            [0, 0, 2, 0, 0, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, -2],
        ],
        moves: 30,
        slots: 3,
        characters: [{
                character: "Cat",
                food: "Bread",
                name: "Bread",
                count: 11
            },
            {
                character: "Pig",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Dog",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
            {
                character: "Cat",
                food: "Burger",
                name: "Burger",
                count: 11
            },
            {
                character: "Pig",
                food: "Donut",
                name: "Donut",
                count: 11
            },
        ],
    }),

    // 8 - six orders. Windows punched into four blocks: tiles fall down narrow
    // pillars and the two full rows are the only way across the board.
    8: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 2, -2, -2, 0, -2, 0],
            [0, -2, 0, -2, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, -2, 2, -2, 0],
            [0, -2, 0, -2, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 32,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Donut",
                name: "Donut",
                count: 10
            },
            {
                character: "Cat",
                food: "Bread",
                name: "Bread",
                count: 10
            },
            {
                character: "Pig",
                food: "Popcorn",
                name: "Popcorn",
                count: 10
            },
            {
                character: "Dog",
                food: "Cupcake",
                name: "Cupcake",
                count: 10
            },
            {
                character: "Cat",
                food: "Burger",
                name: "Burger",
                count: 10
            },
            {
                character: "Pig",
                food: "Donut",
                name: "Donut",
                count: 10
            },
        ],
    }),

    // 9 - a wheel: an outer rim, a sealed pocket in the middle that has to be
    // refilled from above, and a single spoke row joining the two.
    9: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, 2, 0, 0, 0, 0, 0, -2],
            [0, 0, -2, -2, -2, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, -2, -2, -2, 0, 0],
            [-2, 0, 0, 0, 0, 0, 2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
        ],
        moves: 34,
        slots: 3,
        characters: [{
                character: "Pig",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
            {
                character: "Dog",
                food: "Burger",
                name: "Burger",
                count: 11
            },
            {
                character: "Cat",
                food: "Donut",
                name: "Donut",
                count: 11
            },
            {
                character: "Pig",
                food: "Bread",
                name: "Bread",
                count: 11
            },
            {
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
        ],
    }),

    // 10 - the last one: seven orders through three places, on a star standing
    // on two legs.
    10: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 2, 0, 0, 0, 0, 2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, -2, -2, -2, -2, 0, 0],
            [0, 0, -2, -2, -2, -2, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [{
                character: "Dog",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Cat",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
            {
                character: "Pig",
                food: "Burger",
                name: "Burger",
                count: 11
            },
            {
                character: "Dog",
                food: "Donut",
                name: "Donut",
                count: 11
            },
            {
                character: "Cat",
                food: "Bread",
                name: "Bread",
                count: 11
            },
            {
                character: "Pig",
                food: "Popcorn",
                name: "Popcorn",
                count: 11
            },
            {
                character: "Dog",
                food: "Cupcake",
                name: "Cupcake",
                count: 11
            },
        ],
    }),


    // 11 - a diamond with a crate cross planted in the middle of it. The board is
    // wide open, so the only thing standing between the counter and the orders is
    // the boxes - and they are stacked where every route across the board runs.
    11: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0],
            [-2, 0, 0, 2, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, -2, -2, -2],
        ],
        moves: 30,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 12),
            order("Cat", "Burger", 12),
            order("Pig", "Donut", 12),
            order("Dog", "Bread", 12),
            order("Cat", "Popcorn", 12),
        ],
    }),

    // 12 - two pillars running the height of the board, with a way through them at
    // the waist and again near the bottom. Nothing falls down a pillar, so the two
    // open rows are where the board refills itself from.
    12: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [2, 0, -2, 0, 0, -2, 0, 2],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
        ],
        moves: 30,
        slots: 3,
        characters: [
            order("Dog", "Burger", 12),
            order("Cat", "Donut", 12),
            order("Pig", "Bread", 12),
            order("Dog", "Popcorn", 12),
            order("Cat", "Cupcake", 12),
        ],
    }),

    // 13 - a ring of boxes standing away from the walls, so it can be broken into
    // from either side. Whichever side is opened first is the side the board then
    // feeds through.
    13: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 2, 0, 0, 2, 0, 0],
            [0, 2, 0, 0, 0, 0, 2, 0],
            [0, 2, 0, 0, 0, 0, 2, 0],
            [0, 0, 2, 0, 0, 2, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
        ],
        moves: 32,
        slots: 3,
        characters: [
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
            order("Pig", "Donut", 11),
        ],
    }),

    // 14 - an hourglass. The neck is two columns wide and crated on both shoulders,
    // so the top half only drains into the bottom once the boxes are off.
    14: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, 0, 0, 0, -2, 0],
            [0, 0, 2, -2, -2, 2, 0, 0],
            [0, 0, 0, -2, -2, 0, 0, 0],
            [0, 0, 0, -2, -2, 0, 0, 0],
            [0, 0, 2, -2, -2, 2, 0, 0],
            [0, -2, 0, 0, 0, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 32,
        slots: 3,
        characters: [
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
        ],
    }),

    // 15 - a corridor doubled back on itself. There is one way in and one way out,
    // and a box parked at each turn.
    15: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, 0, 0],
            [0, 2, 0, 0, 0, -2, 0, 0],
            [0, 0, -2, -2, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, 0, 2, 0],
            [0, 0, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 32,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
        ],
    }),

    // 16 - four blocks with a cross cut through them. The two open rows carry the
    // whole board: everything above them falls through, everything below is fed
    // by them.
    16: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
        ],
        moves: 34,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 12),
            order("Cat", "Burger", 12),
            order("Pig", "Donut", 12),
            order("Dog", "Bread", 12),
            order("Cat", "Popcorn", 12),
            order("Pig", "Cupcake", 12),
        ],
    }),

    // 17 - a pyramid, open all the way down and crated across its middle. The first
    // board in a while with nothing clever in it - only more orders than there are
    // places to stand them.
    17: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 0, 0, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 34,
        slots: 3,
        characters: [
            order("Dog", "Burger", 12),
            order("Cat", "Donut", 12),
            order("Pig", "Bread", 12),
            order("Dog", "Popcorn", 12),
            order("Cat", "Cupcake", 12),
            order("Pig", "Burger", 12),
        ],
    }),

    // 18 - two ramps leaning in from the sides, with a channel left between them.
    // The middle two columns run clear from the top of the board to the bottom,
    // and everything that crosses the board crosses through them.
    18: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [0, -2, -2, 0, 0, -2, -2, 0],
            [0, 0, -2, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, 0, 0, 0, -2, 0],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 34,
        slots: 3,
        characters: [
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
        ],
    }),

    // 19 - a gate: a block at the top and two at the sides, with the way through
    // running between them.
    19: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, -2, -2, 0, 0, 0],
            [0, 0, 0, -2, -2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [-2, -2, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
            order("Dog", "Popcorn", 11),
        ],
    }),

    // 20 - a wall of crates laid across the board in two courses, the gaps in one
    // sitting under the boxes of the other. Nothing gets past it in a straight
    // line; everything has to come down through the joints.
    20: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [2, 2, 2, 0, 0, 2, 2, 2],
            [0, 0, 2, 2, 2, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
        ],
    }),

    // 21 - the board grows to nine. A run of crates set on the diagonal, and a magnet
    // lying at the end of it: the food it is swapped into goes off the board wherever
    // it is standing, which is the fastest way to open the diagonal up.
    21: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 0, 0, 0, 0, 0],
            [6, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 34,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
        ],
    }),

    // 22 - a cross. Three columns are sealed at the top and bottom on both sides, so
    // the middle band is the only way from one wing to the other.
    22: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
        ],
        moves: 34,
        slots: 3,
        characters: [
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
        ],
    }),

    // 23 - an arena with a post standing in the middle of it. The inner floor is
    // reached along the one row that runs clean through.
    23: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, -2, 0, -2, -2, 0, 0],
            [0, 0, -2, 0, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, -2, 0, -2, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, -2, 0, -2, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, 0, -2, 0, 0],
            [0, 0, -2, -2, 0, -2, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
            order("Pig", "Donut", 11),
            order("Dog", "Bread", 11),
        ],
    }),

    // 24 - shelves, staggered. Each one hangs off the wall it is fixed to, so food
    // crossing the board has to work its way round the ends.
    24: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
        ],
    }),

    // 25 - a comb. Five columns of food standing between the teeth, joined only where
    // the board runs clear.
    25: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
        ],
    }),

    // 26 - the comb again, with the teeth of the lower half set between the teeth of
    // the upper. Nothing falls straight through this board.
    26: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
        ],
    }),

    // 27 - two diagonals crossed, cutting the board into four triangles that only
    // meet at the corners. A crate sits in the two upper ones.
    27: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [0, 0, -2, 0, 2, 0, -2, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, -2, 0, 2, 0, -2, 0, 0],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
        ],
    }),

    // 28 - a bowl. Everything drains towards the one column that reaches the bottom,
    // so a match down there is worth more than the same match up top.
    28: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
        ],
    }),

    // 29 - two rows of boxes spaced out across an open board. Plain, and heavy: the
    // orders are the difficulty here, not the shape.
    29: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 0, 2, 0, 2, 0, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 0, 2, 0, 2, 0, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
        ],
    }),

    // 30 - a diamond standing on the full width of the board. Halfway - and the
    // widest, most open board there has been, to be served in the tightest count
    // of moves so far.
    30: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
        ],
    }),

    // 31 - two funnels mouth to mouth, with a post between them. Both halves pour
    // through the same narrow middle.
    31: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
        ],
    }),

    // 32 - a staircase cut corner to corner, its steps set a clear row apart so the
    // board still feeds through between them. A rocket is lying on the bottom
    // row, which is the one row that runs the whole width.
    32: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, -2, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, -2, -2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [5, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 36,
        slots: 3,
        characters: [
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
        ],
    }),

    // 33 - a hollow diamond, sealed on every side. Nothing falls into it straight
    // down; it fills from the corners as the board settles.
    33: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, -2, 0, 0, 0, -2, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
        ],
    }),

    // 34 - a crown: teeth along the top, two posts standing under it.
    34: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, -2, 0, 0, 0, -2, 0, 0],
            [0, 0, -2, 0, 0, 0, -2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
        ],
    }),

    // 35 - a lattice. Small blocks scattered on every other row, so no run of four
    // lines up by accident - every powerup on this board is made on purpose.
    35: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, 0, -2, 0, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, 0, 0, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, 0, -2, 0, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, 0, 0, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
        ],
    }),

    // 36 - a pinwheel: two long walls set against each other, each one shielding the
    // half of the board the other leaves open.
    36: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, -2, -2, -2, -2, -2],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [-2, -2, -2, -2, -2, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
        ],
    }),

    // 37 - a canyon. Three columns wide in the middle and the full width at either
    // end, so the board is at its thinnest exactly where the food has to pass.
    37: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
        ],
    }),

    // 38 - a spine of crates down the centre column, broken in the middle. Both
    // halves have to come off before the two sides of the board work as one.
    38: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
        ],
    }),

    // 39 - four shelves stacked, each one open at both ends. Food falls the height of
    // the board in steps, and every step costs a move.
    39: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 42,
        slots: 3,
        characters: [
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
        ],
    }),

    // 40 - a star with a box at its heart. The last of the wide-open boards: from
    // here the shapes close in.
    40: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 2, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
        ],
        moves: 42,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
            order("Pig", "Donut", 11),
        ],
    }),

    // 41 - the comb once more, and boxes standing in the clear rows where the food
    // crosses between the teeth.
    41: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
        ],
    }),

    // 42 - a block of nine boxes stacked in the middle of an open board, and a charge
    // sitting under it. The charge takes the corner of the stack out; the rest has
    // to be broken by hand.
    42: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 38,
        slots: 3,
        characters: [
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
        ],
    }),

    // 43 - the hourglass at nine wide, its neck packed with crates. Until they are
    // gone the two halves of the board are two separate games.
    43: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, -2, -2, 0, 2, 0, -2, -2, -2],
            [-2, -2, -2, 0, 2, 0, -2, -2, -2],
            [-2, -2, -2, 0, 2, 0, -2, -2, -2],
            [-2, -2, 0, 0, 0, 0, 0, -2, -2],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
        ],
    }),

    // 44 - chambers: teeth above, a wall below, twice over. Every route down the
    // board doubles back at least once.
    44: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 40,
        slots: 3,
        characters: [
            order("Dog", "Bread", 10),
            order("Cat", "Popcorn", 10),
            order("Pig", "Cupcake", 10),
            order("Dog", "Burger", 10),
            order("Cat", "Donut", 10),
            order("Pig", "Bread", 10),
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
        ],
    }),

    // 45 - the crossed diagonals again, with a box in each of the four triangles.
    // Four corners, four boxes, and no way to reach one from another.
    45: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, 0, 0, -2, 0, 0, 0, 0],
            [0, 0, 0, -2, 0, -2, 0, 0, 0],
            [0, 0, 2, 0, 0, 0, 2, 0, 0],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [-2, 0, 0, 0, 0, 0, 0, 0, -2],
        ],
        moves: 40,
        slots: 3,
        characters: [
             
            order("Dog", "Popcorn", 10),
            order("Cat", "Cupcake", 10),
            order("Pig", "Burger", 10),
            order("Dog", "Donut", 10),
            order("Cat", "Bread", 10),
            order("Pig", "Popcorn", 10),
            order("Dog", "Cupcake", 10),
            order("Cat", "Burger", 10),
            order("Pig", "Donut", 10),
        ],
    }),

    // 46 - a keep: an outer wall with a gate at the top and bottom, and a block of
    // boxes standing in the courtyard.
    46: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, 0, -2, -2, -2, 0],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [0, -2, 0, 2, 2, 2, 0, -2, 0],
            [0, 0, 0, 2, 0, 2, 0, 0, 0],
            [0, -2, 0, 2, 2, 2, 0, -2, 0],
            [0, -2, 0, 0, 0, 0, 0, -2, 0],
            [0, -2, -2, -2, 0, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 42,
        slots: 3,
        characters: [
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
            order("Pig", "Donut", 11),
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
        ],
    }),

    // 47 - a sieve. Blocks on every other cell of every other row, offset row to row,
    // so the board is all holes and no channels.
    47: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, 0, -2, 0, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, 0, -2, 0, -2, 0, -2, 0],
        ],
        moves: 42,
        slots: 3,
        characters: [
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
        ],
    }),

    // 48 - three courses of boxes laid across an open board, the middle one packed.
    // Nothing here is in the way except the boxes, and there are a lot of them.
    48: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [2, 0, 2, 0, 2, 0, 2, 0, 2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 0, 2, 0, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 44,
        slots: 3,
        characters: [
            order("Dog", "Donut", 11),
            order("Cat", "Bread", 11),
            order("Pig", "Popcorn", 11),
            order("Dog", "Cupcake", 11),
            order("Cat", "Burger", 11),
            order("Pig", "Donut", 11),
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
        ],
    }),

    // 49 - the gauntlet: four walls, the outer two open only at the very edges. The
    // board is served down its sides.
    49: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, -2, -2, -2, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -2, -2, -2, -2, -2, -2, -2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [-2, 0, -2, -2, -2, -2, -2, 0, -2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        moves: 44,
        slots: 3,
        characters: [
            order("Dog", "Bread", 11),
            order("Cat", "Popcorn", 11),
            order("Pig", "Cupcake", 11),
            order("Dog", "Burger", 11),
            order("Cat", "Donut", 11),
            order("Pig", "Bread", 11),
            order("Dog", "Popcorn", 11),
            order("Cat", "Cupcake", 11),
            order("Pig", "Burger", 11),
        ],
    }),
     // 50 - the last one. A star, boxed solid through the middle, and the longest
    // ticket of the run to be served through it.
    50: level({
        tileTypes: ["Popcorn", "Cupcake", "Burger", "Donut", "Bread"],
        pattern: [
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, 0, 0, 2, 0, 0, -2, -2],
            [-2, 0, 0, 2, 2, 2, 0, 0, -2],
            [0, 0, 0, 2, 2, 2, 0, 0, 0],
            [-2, 0, 0, 2, 2, 2, 0, 0, -2],
            [-2, -2, 0, 0, 2, 0, 0, -2, -2],
            [-2, -2, -2, 0, 0, 0, -2, -2, -2],
            [-2, -2, -2, -2, 0, -2, -2, -2, -2],
        ],
        moves: 48,
        slots: 3,
        characters: [
            order("Dog", "Popcorn", 13),
            order("Cat", "Cupcake", 13),
            order("Pig", "Burger", 13),
            order("Dog", "Donut", 13),
            order("Cat", "Bread", 13),
            order("Pig", "Popcorn", 13),
            order("Dog", "Cupcake", 13),
            order("Cat", "Burger", 13),
            order("Pig", "Donut", 13),
        ],
    }),
}
