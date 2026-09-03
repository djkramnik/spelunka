# Player death physics and HD body states

Beads task: `spelunka-r54.38`

This first death slice replaces the legacy remove-and-respawn behavior with a
terminal body that remains in the level. It deliberately does not yet implement
recoverable unconsciousness, revival, restart UI, blood effects, or strong
nonlethal attacks.

## Classic physics model

The locally extracted Classic player step event provides a distinct
dead-or-stunned physics path. It suppresses movement and action inputs, drops a
held item, and applies these per-update rules at Classic's 30 Hz rate:

- gravity is `0.6` pixels per update squared;
- downward speed is capped at `10` pixels per update;
- walls retain 50% of horizontal speed and reverse it;
- ceilings retain 80% of vertical speed and reverse it;
- floors retain 50% of vertical speed and reverse it;
- ordinary floors retain 30% of horizontal speed per contact; and
- vertical speeds at or below `1` and horizontal speeds below `0.1` settle to
  zero.

`PlayerDeath` converts those values to time-based units: 540 logical pixels per
second squared gravity, a 300 pixel-per-second terminal speed, and settle
thresholds of 30 vertical and 3 horizontal pixels per second. The existing
`Physics` and `Solid` traits still perform terrain movement and resolution;
death installs the Classic rebound, friction, and threshold coefficients on
the player's `Solid` trait. Entity-to-entity callbacks are disabled separately,
so the body lands on terrain without hurting, stomping, collecting, mounting,
or being hit by other entities.

The first lethal source is the snake. Its ordinary surviving hit remains the
play-tuned 90 pixel-per-second shove with no lift. A lethal hit instead uses an
enemy-owned 180 pixel-per-second horizontal launch, converted from Classic's
six-pixel snake shove, and a 120 pixel-per-second upward launch, converted from
the common four-pixel hard-hit lift used by Classic arrows, rocks, lasers, and
psychic waves. These values belong to each `SnakeBehavior` instance rather than
to `Health` or `PlayerDeath`, allowing later enemies to select their own launch.

## HD visual phases

The HD player animation metadata identifies two useful singleton records:

| Runtime phase | HD animation | Source frame | Rendering rule |
| --- | ---: | ---: | --- |
| `airborne` | 33 | 103 | Curled sideways body during launch, ascent, fall, and rebounds |
| `settled` | 9 | 9 | Low unconscious pose after both velocity components reach zero on terrain |

The importer names these frames `reaction-airborne` and
`reaction-unconscious`. The visual phase comes from actual body physics rather
than an elapsed animation timer, so a long fall or extra rebound cannot show the
settled pose prematurely. While the body is moving, its horizontal velocity
sets the direction of its head: the HD source pose is used unchanged while
traveling left and mirrored while traveling right. A wall rebound therefore
reorients the curled frame on the same update. The settled pose retains the
last nonzero travel direction.

## Terminal-state contract

Entering terminal death is one-way in this slice. It interrupts ladder and
ledge attachment, exits crouch, cancels and disables jumping, clears and
disables directional movement, drops a carried item, disables entity collision
callbacks, stops level music, and makes `Killable` retain the body indefinitely.
The stopped music controller ignores later normal/hurry timer requests so the
soundtrack cannot restart while the corpse remains in the level. Keyboard action
and movement presses are ignored while dead. The legacy `PlayerController`
also refuses to revive and re-add a removed zero-heart player, closing the
unintended checkpoint teleport path.

Focused coverage verifies the lethal launch, converted gravity, collision
coefficients, terminal-speed cap, eventual settling, indefinite retention,
input lockout, entity-collision suppression, HD phase routing, and the
zero-health respawn guard.

## Classic sources

- [`oPlayer1` dead/stunned movement path](../reference/spelunky-classic/extracted/Objects/oPlayer1.events/Step.xml)
- [`characterStepEvent.gml`](../reference/spelunky-classic/extracted/Scripts/Platform%20Engine/characterStepEvent.gml)
