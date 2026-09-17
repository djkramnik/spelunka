# Spelunky caveman behavior and HD animation

Beads task: `spelunka-r54.68`

The caveman is a three-hit, terrain-colliding enemy. Runtime behavior follows
the checked-in Spelunky Classic `oCaveman` source for the numeric movement and
combat rules, while the sleeping presentation and every visible pose come from
the validated, user-owned Spelunky HD atlas.

## State model

A newly placed caveman starts sleeping. A living player within 100 logical
pixels, no more than 48 pixels above or below, and unobstructed by solid terrain
starts the half-second HD wake sequence. The caveman then patrols at Classic's
1.5 pixels per 30 Hz update, represented as 45 pixels per second. Patrol turns
at walls and before unsupported ledges.

While patrolling, a player less than 100 pixels away, in front of the caveman,
vertically aligned, and visible along an unobstructed ray triggers pursuit.
Pursuit uses Classic's 3 pixels per update, or 90 pixels per second. As in the
Classic `ATTACK` state, it reverses at walls but does not perform the patrol
ledge probe, so a committed caveman can run off an edge.

The sleeping state is an HD-guided addition to Classic's immediate idle/walk
entry. Its proximity gate is deterministic; no random idle timer or random
turn is introduced.

## Damage and stun

`Damageable` provides the reusable multi-hit contract. A caveman begins with
three hit points and rejects additional hits while stunned. Stomps, the whip,
and a dangerous moving rock each remove one point and provide their own
knockback vector. Accepted damage emits a small procedural blood burst and the
unchanged HD `hit.wav` cue.

Nonlethal damage enters Classic's 200-update stun, or 6⅔ seconds. The body
continues through ordinary terrain physics, slows on the ground, then recovers
into patrol. A depleted body follows `Killable` for attack filtering but is not
timed out; after its final knockback settles, it holds the prone corpse pose.

An active walking or charging caveman deals one heart of contact damage with a
one-second protection window and Classic's six-pixel-per-update horizontal and
upward launch. Sleeping, waking, stunned, and dead bodies cannot deal contact
damage. Stomp detection takes precedence over that contact path.

## HD source mapping

The importer validates caveman animation section 5 in
`Data/Animations/allanimations.wad` and copies only selected 80x80 cells from
`MONSTERS/monsters.png`:

- idle frame 36;
- patrol/pursuit frames 37-42 at four and two HD ticks respectively;
- reaction/corpse frames 48, 49, and 51; and
- sleep/wake frames 134 and 140-143 at six ticks per frame.

All frames retain their source RGBA pixels, a 0.25 frame scale, and the HD
`[40,72]` bottom-centre pivot. Runtime anchors that pivot at logical `(8,16)`
inside the Classic-compatible 12x16 collider with a two-pixel horizontal inset.

## Tutorial placement

The default tutorial places one caveman at logical `(608,256)`, or tile column
38 immediately above bottom-floor row 17. This is directly beneath the
right-side opening through which the player descends from the upper floor.

## Coverage

Focused tests cover factory traits and anchors, sleep/wake proximity, patrol
and pursuit timing, ledge and wall behavior, mirrored contact damage, player
protection, stomp/whip/rock damage, stun recovery, terminal settling, level
placement, HD animation validation, RGBA preservation, audio copying, and
byte-identical importer reruns.
