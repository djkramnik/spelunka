# Spelunky crouch, crawl, and top-to-hang transition

Beads task: `spelunka-r54.35`

## Classic behavior reference

The released Spelunky Classic `characterStepEvent` provides the behavioral
model. Down on solid ground changes the player to `DUCKING`. Directional input
continues to accelerate the player, but the ducking friction branch settles
low-speed movement near 0.75 Classic pixels per 30 Hz tick, or 22.5 logical
pixels per second. The sprite router selects the static duck image at zero
velocity and the crawl sequence below the three-pixel-per-tick threshold.

Classic begins `DUCKTOHANG` when the player is ducking, moving below that
threshold, pressing toward an edge, supported at the current probe, and
unsupported one pixel farther in the facing direction. It freezes physics for
the transition, then moves the player below the ledge, reverses facing, and
enters `HANGING`.

## Spelunka posture and movement

`Crouch` owns five phases: `standing`, `entering`, `crouched`, `exiting`, and
`flipping`. ArrowDown is routed to both `Crouch` and `LedgeHang`, allowing the
same input to crouch on the ground and deliberately drop while hanging.

Entering crouch preserves the collider bottom and changes its height from 16
to 10 logical pixels. Releasing Down restores the standing collider only when
three inset probes across its future top edge are clear. If a ceiling blocks
that expansion, the player remains crouched and retries on following updates.
Jump requests likewise restore standing clearance before the shared jump
trait launches; a blocked request is consumed instead of expanding into a
solid tile.

While crouched, `Crouch` temporarily owns horizontal acceleration and disables
the ordinary `Go` update. It approaches the Classic-derived 22.5 px/s crawl
speed, preserves mirrored heading, advances crawl distance, and brakes toward
zero without input. Carrying prevents entry because no verified HD
carry-crouch record is mapped, and pickup/throw is unavailable until the
player leaves the low posture. Damage, airborne movement, and ledge hanging
restore the standing collider as soon as clearance permits.

## HD animation mapping

The first player section of `allanimations.wad` supplies the source timing:

| State | HD animation | Source frames | Timing |
| --- | ---: | ---: | ---: |
| crouch in | 25 | 12-14 | 4 ticks per frame, non-looping |
| crouch held | 6 | 14 | static |
| crouch out | 26 | 14-16 | 4 ticks per frame, non-looping |
| crawl | 7 | 17-23 | 3 ticks per frame, looping |
| top-to-hang flip | 19 reversed | 34-28 | 4 ticks per frame, non-looping |

Animation 19 is the seven-frame ledge flip already used from frames 28-34 to
climb onto a ledge. Playing the unchanged HD cells in reverse depicts the
opposite transition from the top into a hang.

## Top-to-hang handoff

At the last supported pixel, `Crouch` asks `LedgeHang` to validate the current
support tile, the missing next support, the exposed corner, cooldown, and the
full 16-pixel hanging destination. A valid transition freezes velocity and
physics for 28 HD ticks. Completion restores the standing collider and calls
`LedgeHang.grabFromTop`, which snaps to the same mirrored geometry used by an
airborne grab. The normal ledge-grab entry strip is skipped because the flip
already depicts entry; rendering holds its terminal suspended frame.

During the reversed flip, facing is anchored to the destination wall rather
than the outgoing crawl direction. At handoff, the collider must still move
from its safe on-top position to the exact hanging position. `Crouch` records
the inverse of that movement as a shared render/camera focus offset, preventing
a one-frame visual or camera jump. The correction now settles to the original
authoritative hanging position over four HD ticks (about 0.067 seconds). This
keeps the intended final hang placement while making the adjustment read as a
quick snap rather than a prolonged diagonal drift.

The handoff calls the same `LedgeHang` alignment used by an airborne jump grab.
Both paths therefore finish with the collider top two logical pixels above the
tile lip and use the same held HD frame; crawl entry has no separate final
placement.

If support disappears during the transition, the handoff fails safely and
ordinary falling resumes. Adjacent floor, occupied hanging space, wrong input,
excessive speed, carrying, death, cooldown, or an already active ledge state
prevents the flip.
