# Spelunky whip behavior and HD animation

Beads task: `spelunka-r54.31`

## Source behavior

Spelunky Classic routes the attack button according to the player's hands and
posture. Empty-handed attack starts the whip; holding an item uses or throws
it; holding Down while empty-handed attempts a pickup instead. Its `oWhip`
helper follows the player at a 16-pixel facing-relative offset and applies one
damage to enemies. Classic also creates a brief `oWhipPre` helper behind the
player during the wind-up.

This implementation takes the forward reach, facing, damage, and input
precedence from Classic while retaining a conventional non-damaging startup.
The pre-whip object is therefore guidance for the visible wind-up rather than
a second damage volume. This makes the gameplay boundary explicit: only the
forward snap can damage a target.

## Action timing and hit region

`Whip` owns a complete 28-HD-tick action:

| Phase | Duration | Behavior |
| --- | ---: | --- |
| startup | 20 ticks (1/3 second) | HD frames 48-52; no damage |
| active | 4 ticks (1/15 second) | HD frame 53; forward hit and whip sound |
| recovery | 4 ticks (1/15 second) | hold frame 53; repeated input rejected |

The active rectangle spans the player's full collider height and extends 16
logical pixels from the facing edge. Facing is captured when the action starts,
so reversing movement during the animation cannot detach the visual direction
from its hit region. Each eligible target is admitted at most once per action.
Targets must expose the shared `Killable` trait, must still be alive and entity
collidable, and must not be another player. Snake hits consequently use the
same queued death and cleanup path as stomps and projectile hits.

Movement acceleration and airborne jump physics continue during the action.
Taking damage, dying, crouching, carrying an item, climbing a ladder, or using
a ledge suppresses or interrupts it. D with a carried item remains throw/use;
Down+D while empty-handed is pickup-only, including the existing crouched
pickup and grounded placement behavior. A bare D with empty hands starts the
whip. Keyboard repeat suppression plus the action's startup/active/recovery
lifecycle prevents a held or repeated press from restarting it.

## HD assets

Player animation 17 in `Data/Animations/allanimations.wad` declares frames
48-53 at four HD ticks per frame. The importer validates that record, packs all
six cells unchanged with the existing `[40, 72]` bottom-center pivot, and emits
the non-looping `whip` animation. Left-facing attacks mirror through the same
pivot. `ALLSOUNDS/whip.wav` is hash-validated, copied by the local-only asset
workflow, and played when the active snap begins.

Focused tests cover phase boundaries, active-only damage, left/right and
vertical range, one hit per target, recovery and retriggering, movement and
airborne compatibility, item/crouch precedence, player exclusion, snake death,
input routing, animation selection, mirroring, source timing, deterministic
asset packing, and sound preservation.

## Local references

- [`oPlayer1` Step](../reference/spelunky-classic/extracted/Objects/oPlayer1.events/Step.xml)
  routes whip, pickup, and held-item actions and creates the hit helpers.
- [`oWhip` Step](../reference/spelunky-classic/extracted/Objects/Items/oWhip.events/Step.xml)
  keeps the forward hit helper at its facing-relative offset.
- [`oEnemy` collision with `oWhip`](../reference/spelunky-classic/extracted/Objects/Basis/oEnemy.events/Collision%20with%20oWhip.xml)
  applies the shared one-damage enemy hit.
