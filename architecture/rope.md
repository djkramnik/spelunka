# Spelunky rope deployment and HD animation

Beads task: `spelunka-r54.34`

The rope is a level-local entity with two deliberately separate contracts:
Spelunky Classic supplies deployment and climbing behavior, while the locally
owned Spelunky HD depot supplies all visible rope and player frames.

## Input and inventory

`S` requests a rope. Keyboard edge detection and a one-request latch prevent a
held key from deploying more than once. A new player starts with four ropes,
matching Classic. One rope is consumed only after a rope entity has been
created and successfully launched. No inventory is consumed when the count is
zero, the player is dead or in a hit reaction, a whip is active, or solid
terrain is directly above the player.

The inventory belongs to the player rather than the level, so it survives the
existing level transition that reuses the player entity. Deployed ropes belong
only to the current `Level.entities` set and disappear with that level.

## Classic deployment model

Classic's player step creates `oRopeThrow` with `yVel = -12`. Its inherited
item physics uses 30 updates per second and gravity `0.6` pixels/update². Once
vertical velocity reaches zero, the throw snaps to its anchor, creates the rope
top, then advances a rope end downward by eight pixels per update. It creates
segments until terrain is encountered or the count passes 16 half-tile steps.

The time-based runtime preserves those values:

| Rule | Runtime value |
| --- | ---: |
| initial upward speed | 360 px/s |
| toss gravity | 540 px/s² |
| downward unfurl speed | 240 px/s |
| maximum deployed length | 128 px / 8 tiles |
| repeated body spacing | 16 px |

The eight-pixel collision probes prevent a large fixed step from tunnelling
through a ceiling or floor. A ceiling catches the anchor at the terrain's lower
face. At an unobstructed ballistic apex the top becomes fixed in world space,
the climbable activates, and only its bottom extends. Downward extension stops
at the first solid tile or at the eight-tile maximum. The rope has no `Solid`,
`Physics`, or `TopPlatform` trait and never changes ordinary terrain collision.

## Shared climbing behavior

`Climbable` distinguishes `ladder` and `rope` columns while `LadderClimb`
continues to own centering, gravity suspension, climb speed, jump-off, Down plus
Jump drop, carrying, and death release. A caught rope can be mounted with Up or
Down while the player's centre is within its live bounds. Upward travel clamps
at the rope anchor and remains airborne/clinging because a rope does not invent
a walkable cap. Dormant airborne rope bundles are not mountable.

## HD visual and sound mapping

The validated `ITEMS/items.png` atlas uses 24 columns of 80-pixel cells. The
importer copies the following cells without modifying their pixels and renders
them at quarter scale:

| Runtime role | HD source frame | Pivot |
| --- | ---: | ---: |
| anchor hook | 47 | 40,0 |
| tossed bundle | 48 | 40,40 |
| repeating body | 74 | 40,0 |

The toss draws only frame 48. Once caught, frame 47 supplies the visibly hooked
anchor and frame 74 repeats below it on the 16-pixel logical grid. The final
body cell is bottom-aligned so its small frayed edge ends at the live rope
length. Coiled frames 71-73 are not persistent deployed-rope caps; keeping one
at the bottom produced a large knot that is not present during ordinary HD
rope traversal.

HD player animation 20 supplies held rope frame 84. Animations 23 and 24 both
identify frames 84-93 at four HD ticks per frame and terminal frame 84, so the
runtime exposes one ten-frame looping `rope-climb` animation for either climb
direction. The importer rejects a source whose validated record changes.

`ALLSOUNDS/ropetoss.wav` plays when the bundle launches and
`ALLSOUNDS/ropecatch.wav` plays when the anchor settles. Both are hash-validated
and copied byte-for-byte from the owned HD depot.

## Coverage

Focused tests cover the ballistic apex, ceiling catch, downward obstruction,
maximum length, non-solid geometry, HD frame roles, sound cues, four-rope
inventory, invalid and repeated requests, Up/Down mounting, top clamping,
dormant rope exclusion, player animation routing, keyboard repeat suppression,
asset validation, RGBA preservation, and byte-identical importer reruns.
