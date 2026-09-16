export default {
    NORMAL: 0,
    DESTROYED: -1,
    EMPTY: -2,

    // A charge. Doubles as a level pattern value, so a level can open with one
    // already standing on the board instead of waiting for a run of four.
    TNT: 1,

    // A crate. Also a level pattern value: a cell that opens sealed under a box
    // the player has to break by matching food next to it. It is not a food and
    // not a charge - it cannot be swapped, matched or moved, and nothing falls
    // through it.
    BLOCKER: 2,

    // A cell's boardStatus while a crate is standing on it. Kept apart from
    // EMPTY so the frame around the board is still drawn over it - but it is a
    // wall for everything that moves, exactly as a hole is.
    BLOCKED: 3,

    // The rockets, lying along the run that left them: a horizontal run of four
    // leaves one that flies left and right, a vertical run leaves one that flies
    // up and down. Setting one off clears the whole line it travels. Both are
    // level pattern values too, on the same terms as a charge.
    ROCKET_H: 4,
    ROCKET_V: 5,

    // The magnet. A run of five or more leaves one, and setting it off takes
    // every item of a single food off the board wherever it is standing - the
    // food it was swapped into, or the one there is most of if it was simply
    // tapped. Also a level pattern value.
    MAGNET: 6,

    // The lightning. A two by two square of the same food leaves one, and
    // setting it off calls a bolt down out of the sky onto whatever the
    // customers at the counter are still waiting for - it is the one powerup
    // that reads the orders rather than the board. Also a level pattern value.
    LIGHTNING: 7,

    // Ice. A level pattern value: a cell that opens with its food frozen into a
    // block. Unlike a crate, what is under the ice is still food - a run reads
    // through it and it can be matched where it stands - but it is held: it
    // cannot be picked up or swapped, it never falls, and nothing falls through
    // it. A match on the frozen food goes into the ice rather than into the
    // food, and the hit that takes the last layer shatters the block and lets
    // the food be collected with the rest of the run.
    ICE: 8,

    // A pizza. A level pattern value: a cell that opens with a box standing in
    // it, a whole pizza inside. It is a crate in every way that matters to the
    // board - it cannot be swapped, matched or moved, and nothing falls through
    // it - but every match next to it takes one slice out of the box and sends
    // it to whoever ordered pizza. The box goes with the last slice.
    PIZZA: 9,
}
