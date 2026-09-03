# Spelunky ladder climbing and HD animation

Beads task: `spelunka-r54.33`

The runtime separates ladder terrain from ordinary solid terrain. A ladder
entity owns a `Climbable` marker over its full bounds and installs one one-way
platform cell at its cap. The body never enters `TileCollider`'s solid set, so
walking, jumping, falling, and head contact continue through it unless the
player explicitly mounts with Up or Down.

## Classic movement model

The behavior follows the released Spelunky Classic character step event, with
rates converted from its 30 Hz update loop to Spelunka's time-based units:

- the player's horizontal center must be less than four logical pixels from
  the ladder center;
- an air or ground mount requires the player's center to be inside the ladder
  column, preventing a shallow head-only overlap from snapping the player;
- Down also mounts a stationary grounded player whose center is anywhere over
  the ladder cap, using a more forgiving eight-pixel top-entry tolerance;
- mounting centers the player, clears velocity, and suspends physics and
  horizontal movement;
- continued Up or Down movement uses Classic's 0.9-pixel-per-tick terminal
  climb rate, represented as 27 logical pixels per second;
- no vertical input holds the player motionless on the ladder;
- reaching a supported bottom returns to grounded movement, while an
  unsupported bottom returns to airborne physics; and
- Jump releases the ladder. Left or Right supplies Classic's four-pixel-per-
  tick horizontal departure velocity, represented as 120 pixels per second;
  Down plus Jump instead cancels the jump and falls from the current position.

Carrying blocks a new mount. Carrying or death while attached releases the
player back to ordinary airborne physics. Horizontal input while attached
changes facing; it does not defeat ladder centering until a jump-off, matching
Classic.

## HD visual model

The player atlas and animation archive provide the rendering contract:

| State | HD animation | Source frames | Runtime behavior |
| --- | ---: | ---: | --- |
| cling | 4 | 72 | Static starting pose |
| climb | 5 | 72-77 | Six-frame loop, four HD ticks per frame |

Up and Down both enter on frame 72. The climb clock advances only while the
player is moving, so a stopped player returns to the static cling pose without
gravity drift. Frames retain the player's existing bottom-center pivot.

There is no separate ladder top-out record in the validated HD player metadata.
Reaching the cap therefore transitions directly from the climb loop to the
ordinary grounded standing pose on the one-way ladder-top platform; no inferred
intermediary frame is inserted.
