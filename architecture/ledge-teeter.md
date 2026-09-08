# Spelunky ledge-edge teeter behavior

Beads task: `spelunka-r54.53`

The grounded teeter is distinct from airborne ledge hanging. It activates only
when a standing player has released horizontal input, horizontal velocity has
settled to zero, and the player faces outward while resting on the final two
logical pixels of the configured ground-support margin. The trigger is spatial;
it has no dwell timer and does not alter jump coyote time.

The check mirrors around either edge and accepts ordinary solid terrain,
breakable bricks, and one-way platform tops. Moving again, crouching, becoming
airborne, taking damage, dying, climbing a ladder, or entering an actual ledge
attachment clears the state.

The local HD player atlas and animation metadata identify player animation 18,
source frames 36-43 at four 60 Hz ticks per frame, as the eight-frame **Lost
Balance** strip. The importer exposes those cells as a looping `teeter`
animation in addition to the existing `skid` aliases that use the same source
art. Runtime facing is locked to the open side while the state is active.

Entering or remaining in teeter cannot retain a carried item. `LedgeTeeter`
asks `Carrier` for a normal drop, not a throw: the item is released at its
existing carried position in front of the player, with physics restored and no
throw impulse or throw sound. At the final edge margin that position is already
past the ledge, so the item falls outward on the facing side.
