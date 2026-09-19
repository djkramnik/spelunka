# Spelunky ledge-hanging behavior

Beads tasks: `spelunka-r54.32`, `spelunka-r54.41`, `spelunka-r54.45`,
`spelunka-r54.46`

## Classic behavior reference

The released Spelunky Classic `characterStepEvent.gml` is the behavioral
reference. Its normal ledge grab requires the player to be airborne, moving
down, pressing toward a contacted wall, and aligned with the exposed top of
that wall. The HD behavior target differs at entry: horizontal input need not
remain held once the player's existing momentum carries them into the ledge.
Entering `HANGING` aligns the player to the corner, clears vertical movement,
and disables gravity.

While hanging, Classic provides three relevant exits:

- Down plus a fresh Jump press drops and starts a short re-grab cooldown;
- Jump toward the wall starts an upward jump after a two-pixel nudge away from
  the corner; and
- Jump while pressing away releases the wall without granting a normal ground
  jump.

It also releases the player if the supporting wall is no longer present. The
implementation here preserves those entry rules, the corner-clearance nudge,
Down+Jump drop, support validation, and cooldown. The explicit jump-away exit
adds a 90 px/s horizontal impulse and uses the shared `Jump.launch()` path so
the ticket's jump-away requirement has a clear, testable result.

## Logical geometry

`LedgeHang` runs after movement traits. A falling player probes three logical
pixels below the collider top. It derives the side from horizontal velocity,
or from the wall contact recorded before `Solid` resolves that velocity to
zero. When both are absent during a neutral vertical jump, it probes the side
the player is facing and uses the exposed cliff geometry itself. A
ledge behind the player is not eligible during a neutral jump. The contacted
tile must have empty space directly above it, the player must not already be
below the corner beyond a four-pixel fixed-step tolerance, and all four inset
corners of the aligned 14x16 collider must remain outside solid terrain.

Tile collision treats the trailing cross-axis edge as exclusive. A player
whose right edge exactly touches a cliff face therefore remains airborne while
falling beside it instead of treating the wall tile as floor support. Real
horizontal overlap still lands normally. This half-open boundary is mirrored
for horizontal collision so exact contact with the top of a floor does not
become a side obstruction.

On a right grab, the collider's right edge aligns to the tile's left edge. A
left grab mirrors that relationship. Its top aligns with the tile top. Physics
is disabled and velocity is reset every update while hanging or climbing, so
air control and gravity cannot accumulate hidden drift.

The player cannot enter a hang while rising, grounded, dead, or moving away
from the wall. Zero horizontal velocity is eligible only when the adjacent
probe finds the exposed cliff, which lets a held neutral jump catch a
two-tile-height ledge on the way down without attracting the player across
open space. A carried item remains attached and continues to follow the player
through the snap, suspended hang, and jump or release. While attached, both
the player pose and carried-item side stay oriented toward the supporting
ledge; Left and Right do not turn either one. Damage, death, removal of the
supporting tile, or newly occupied corner space releases the player rather
than embedding the collider. Starting a new pickup or throw remains
unavailable during a hang or climb. D while already hanging is the
carried-item exception: it drops the item with no throw impulse while leaving
the player attached to the ledge.

## Controls and exits

- Up does nothing while hanging. It never starts a mantle, climb, reversed
  ledge animation, or buffered transition.
- Held Up plus a fresh Jump press behaves exactly like Jump: it selects the
  upward exit. The departed ledge is suppressed until the player moves
  horizontally clear or falls below its capture window, so the descending
  jump cannot replay the ledge-grab animation against the same lip. Other
  valid ledges remain eligible. If new terrain blocks the exposed support or
  headroom before the exit, the player releases safely with no buffered jump
  impulse.
- Jump starts an upward ledge jump without changing horizontal position. The
  exact edge-aligned collider does not need Classic's two-pixel correction,
  and avoiding that instantaneous position change keeps camera tracking stable.
- Away plus Jump adds the explicit 90 px/s jump-away impulse.
- Down plus Jump drops without an upward impulse.

Every exit enables physics and clears incompatible grounded state. Re-grab
delays preserve Classic's 30 Hz counters in elapsed time: three ticks after a
jump, four after lost support or a crawl transition, and five after Down+Jump.
A ledge jump goes through `Jump.launch()` so its gravity ramp, animation phase,
input release, and sound match an ordinary jump.

Both airborne grabs and grounded crawl-to-hang transitions enter through the
same alignment function. The authoritative hanging collider top is two logical
pixels above the tile lip, placing the HD hands slightly higher against the
edge while guaranteeing identical final geometry for both entry paths.

## HD animation mapping

The validated first section of `allanimations.wad` identifies animation 12 as
source frames 44-47 and animation 19 as frames 28-34, both at four HD ticks per
frame. The established HD character skin reference labels those records
`Ledge Grab` and `Ledge Flip`, respectively. Frames 12-16 are the crouch
transition and are deliberately not used for hanging.

The importer exposes frames 44-47 as the non-looping `ledge-hang` animation,
which holds its terminal suspended pose. The source frames 28-34 remain
available as `ledge-climb` for asset fidelity, but runtime animation routing
never selects that animation from a ledge hang. Runtime facing is anchored to
the side of the supporting ledge rather than rapidly changing directional
input.

Vertical input has no ledge-climb buffer. Up-plus-Jump, ordinary Jump, and
away-plus-Jump use the shared variable-height Jump path, while Down-plus-Jump
cancels the request and uses its longer drop cooldown.

Grounded crawl-to-hang entry is owned by `Crouch`. It plays the dedicated
top-to-hang `ledge-flip` sequence (34-28), then calls
`LedgeHang.grabFromTop` and enters directly at held frame 47 rather than
replaying the airborne ledge-grab strip. The flip
faces its destination wall throughout, and a shared render/camera correction
settles to the original hanging position over four HD ticks. Carrying uses the
same player frames and preserves the item relationship through this handoff.
The short positional correction used to settle a completed top flip is drawn
only while the resulting hang remains in its `hanging` phase. Up cannot change
that hang into an upward or reversed animation.

A Down-held airborne approach has a separate, intentional crawl-entry path.
It activates only after horizontal collision reports physical contact with an
exposed ledge. Contact from as high as one standing collider above the lip down
through the ordinary four-pixel ledge overshoot window starts a crawl entry
directly, bypassing `hanging`. It immediately adopts the 10-pixel crouched
collider and crawl artwork, moves continuously up until clear of the lip, then
inward at 120 pixels per second. It never routes through the reverse ledge-hang
or climb artwork. Missing the wall, approaching too low, releasing Down, or a
blocked crouched destination retains ordinary collision and ledge behavior;
there is no attraction across open air.

The remaining visual discontinuity reported during runtime review is tracked
separately by `spelunka-r54.51`; this task establishes the carried-item state
continuity without redefining the top-entry flip presentation.
