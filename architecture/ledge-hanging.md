# Spelunky ledge-hanging behavior

Beads task: `spelunka-r54.32`

## Classic behavior reference

The released Spelunky Classic `characterStepEvent.gml` is the behavioral
reference. Its normal ledge grab requires the player to be airborne, moving
down, pressing toward a contacted wall, and aligned with the exposed top of
that wall. Entering `HANGING` snaps the player to the eight-pixel grid, clears
vertical movement, and disables gravity.

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

`LedgeHang` runs after movement traits. A falling player pressing toward a
wall probes three logical pixels below the collider top. The contacted tile
must have empty space directly above it, the player must not already be below
the corner beyond a four-pixel fixed-step tolerance, and all four inset corners
of the snapped 14x16 collider must remain outside solid terrain.

On a right grab, the collider's right edge aligns to the tile's left edge. A
left grab mirrors that relationship. Its top aligns with the tile top. Physics
is disabled and velocity is reset every update while hanging or climbing, so
air control and gravity cannot accumulate hidden drift.

The player cannot enter a hang while rising, grounded, dead, carrying an item,
moving away from the wall, or not pressing toward it. Damage, death, removal of
the supporting tile, or newly occupied corner space releases the player rather
than embedding the collider. Pickup is unavailable during a hang or climb.

## Controls and exits

- Up starts a 12-HD-tick mantle when the space above the ledge is clear. At the
  end, the collider is placed one logical pixel inside the supporting tile and
  directly on its top surface.
- Jump starts an upward ledge jump without changing horizontal position. The
  exact edge-aligned collider does not need Classic's two-pixel correction,
  and avoiding that instantaneous position change keeps camera tracking stable.
- Away plus Jump adds the explicit 90 px/s jump-away impulse.
- Down plus Jump drops without an upward impulse.

Every exit enables physics and clears incompatible grounded state. Re-grab
delays preserve Classic's 30 Hz counters in elapsed time: three ticks after a
jump, four after lost support or a climb, and five after Down+Jump. A ledge
jump goes through `Jump.launch()` so its gravity ramp, animation phase, input
release, and sound match an ordinary jump.

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
which holds its terminal suspended pose, and frames 28-34 as the non-looping
`ledge-climb` animation. Runtime facing is anchored to the side of the
supporting ledge rather than rapidly changing directional input.

Grounded crawl-to-hang entry is owned by `Crouch`. It plays the same ledge-flip
cells in reverse (34-28), then calls `LedgeHang.grabFromTop` and enters directly
at held frame 47 rather than replaying the airborne ledge-grab strip. The flip
faces its destination wall throughout, and a shared render/camera correction
settles to the original hanging position over four HD ticks.
