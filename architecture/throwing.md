# Spelunky Classic throwing behavior

This note describes throwing as it feels to the player in Spelunky Classic. It
is based on the locally extracted GameMaker source and is intended as a behavior
reference, not as code to copy into this project.

## The basic throw

The attack button has two meanings. With empty hands, it attacks or picks up a
nearby item while the player is crouching. With an ordinary item in hand, it
releases and throws that item.

A normal throw has these visible qualities:

- The item leaves the player's hands in the direction the player is facing.
- It keeps the player's current horizontal momentum. Throwing while running
  therefore sends it faster than throwing while standing still.
- It starts with a modest upward lift, producing a shallow arc rather than a
  perfectly horizontal line.
- The throw sound plays immediately.
- The player lets go completely. The item stops following the player and
  resumes its own movement and collision behavior.

The item begins from its carried position just in front of the player. If that
would place it inside a nearby wall, Classic nudges it back toward the player so
it does not become trapped in the wall at release.

## Directional variations

Classic changes the throw when the player holds a direction with the attack
button:

- **Up:** a much steeper throw. The horizontal direction is unchanged, but the
  item rises sharply.
- **Down while standing on the ground:** more like a short toss or placement.
  The item is moved slightly downward, travels with less horizontal speed, and
  receives almost no upward lift.
- **Down while airborne:** the item is sent downward while retaining its
  horizontal movement.

Heavy objects use the same variations but leave the player's hands more slowly
and do not rise as high. The Pitcher's Mitt power-up is a separate enhancement:
it makes ordinary throws much faster and flatter. These variations are useful
future behavior, but they are not necessary to establish the first rock throw.

## What happens after release

Once released, an ordinary item behaves as a small physical object:

- Gravity pulls it down and its falling speed is capped.
- A wall reverses part of its horizontal speed, so the item rebounds rather
  than stopping dead.
- The floor makes a fast item bounce. Each bounce is lower than the last, and
  floor friction removes most of its horizontal speed.
- A ceiling reflects most of the upward speed back downward.
- Small movements are rounded down to rest so an item eventually settles
  instead of jittering forever.

This means a rock thrown across a room follows an arc, may rebound from a wall,
bounces and skids on the ground, and finally becomes a stationary item that can
be picked up again.

## Hitting characters

An item only counts as a damaging projectile while it is moving fast enough.
A sufficiently fast item can damage and stun an enemy and pass some of its
horizontal momentum to that enemy. Slow-moving or resting items are harmless.

Classic also gives a newly thrown item a very short grace period. This prevents
the thrower from being hurt immediately while the item is still overlapping
them. For rocks, the player can be hurt after that grace period if the rock
returns at speed—for example, after rebounding from a wall.

Damage rules vary for special items and enemy types. Arrows can stick into
walls, jars can break, bombs can become sticky, and weapons use their primary
action instead of being thrown normally. Those exceptions are outside the
ordinary throwable-rock case.

## Implemented rock baseline

`spelunka-r54.15` replaced the temporary throwable verification target with a
dedicated rock. Classic is a starting point for tuning and interaction design,
not a requirement for frame-perfect compatibility. The implementation keeps
the parts that make a small thrown object legible and satisfying in this
time-based engine while preserving project-native health, rendering, and
collision architecture.

The locally owned HD source is `ITEMS/items.png`. The validated WAD profile
checks that entry's SHA-256 (`81ef2c38f249803b078dc61bffd47156f346a7fc74433b61b67f654d7d754119`)
and extracts source cell 17 (`[1360, 0, 80, 80]`) as a generated, ignored
80-by-80 rock frame. It renders at quarter scale around a `[40, 40]` centre
pivot. This keeps the actual rock art aligned with its 8-by-8 gameplay bounds
without committing owned pixels. `ALLSOUNDS/throw_item.wav` is validated and
copied through the same local-only workflow.

While carried, the rock uses a centre-relative horizontal offset: its centre is
four pixels to either side of the player's centre and six pixels below the
player's top. This avoids the size-dependent left/right asymmetry of the legacy
origin-relative offset while leaving older pickable entities unchanged.

Loose rocks use the same one-step foreground priority as carried items. Their
world position remains governed only by physics, while the explicit draw order
prevents the larger HD artwork from being partially occluded by a nearby player
and appearing to wobble as the sprites overlap.
When floor friction reduces a rock to exact rest, its horizontal position is
also rounded to the nearest logical pixel. Thrown rocks otherwise commonly
stop at a fractional world coordinate; as a moving camera pixel-snaps that
entity against integer-aligned terrain, their relative screen positions can
alternate by one pixel even though the rock's physics position is unchanged.

The first tuning pass uses these comparisons:

| Property | Classic observation | Project rock |
| --- | --- | --- |
| Bounds | 8 by 8 around the sprite origin | 8 by 8 |
| Normal launch | 8 horizontal and -3 vertical px per 30 Hz tick | 240 and -90 px/s, plus player horizontal velocity |
| Up launch | 8 horizontal and -9 vertical px per 30 Hz tick | 216 and -270 px/s, plus player horizontal velocity |
| Gravity / fall cap | 0.6 px/tick²; 8 px/tick maximum fall | 540 px/s²; 240 px/s cap |
| Wall / floor / ceiling rebound | 0.5 / 0.5 / 0.8 retained velocity | 0.5 / 0.5 / 0.8 |
| Ground friction | 0.3 retained horizontal velocity | 0.3 |
| Settle thresholds | 0.1 horizontal; 1 vertical px/tick | 3 horizontal; 30 vertical px/s |
| Enemy projectile threshold | Either axis exceeds 2 px/tick | Either axis exceeds 60 px/s |
| Player rock threshold | Horizontal speed exceeds 4 px/tick | Horizontal speed exceeds 120 px/s |
| Thrower grace | 10 updates at Classic's 30 Hz | 20 fixed updates at this project's 60 Hz |

Reversing direction does not end a rock's grace early. The elapsed grace
window is easier to reason about and prevents a
nearby wall from turning the release overlap into an immediate self-hit. A fast
rock removes two hearts and gives the player the familiar horizontal/upward hit
launch; project-native invulnerability and hit presentation replace Classic's
full stunned state. Generic converted enemies currently expose one-hit
`Killable` behavior, so a qualifying rock impact defeats them rather than
modelling per-enemy health and stun. A stationary or slow rock stays harmless.

The default tutorial places a resting rock two tiles to the right of the player
spawn, so the normal startup path reaches the feature immediately. Focused
tests cover left and right release with inherited momentum, Up plus D routing,
the higher and longer upward arc, the HD render
anchor, item-specific gravity and fall cap, terrain coefficients, stable
settling, horizontal and vertical projectile eligibility, player damage, the
complete grace window, moving re-pickup, settled re-pickup, and repeated
carry/throw cycles.

A grounded player can hold Down and press D to place a carried item at floor
height while retaining its carried horizontal alignment directly in front of
the player. Placement releases the carrier relationship with zero item
velocity, does not play the throw animation, and does not create thrower
protection. Down plus D while rising or falling remains a normal airborne
throw; it cannot use the grounded placement path.

The original implementation work remains recorded as a flat dependency chain
beneath the conversion epic:

- `spelunka-r54.16`: release the carried item and launch it with D;
- `spelunka-r54.17`: apply gravity and prevent terrain penetration;
- `spelunka-r54.18`: add diminishing terrain rebounds;
- `spelunka-r54.21`: make sufficiently fast projectiles dangerous to Mario and
  define the stomp response;
- `spelunka-r54.19`: add floor friction and stable settling; and
- `spelunka-r54.20`: support repeated throw and re-pickup cycles, including
  thrower grace-period state.

The fidelity review also created direct follow-ups beneath the conversion epic:

- `spelunka-r54.41`: crouched pickup and collision-safe release beside walls;
- `spelunka-r54.42`: reusable nonterminal enemy damage, stun, and momentum
  transfer for projectiles; and
- `spelunka-r54.43`: up/down throws plus later heavy-item and Pitcher's Mitt
  modifiers.

## Source observations

The main behavior is spread across these extracted resources:

- [`scrUseItem.gml`](../reference/spelunky-classic/extracted/Scripts/Character/scrUseItem.gml)
  releases a normal held item, chooses facing and directional variations,
  inherits player motion, applies the brief safety period, and handles special
  items.
- [`oItem` Step event](../reference/spelunky-classic/extracted/Objects/Basis/oItem.events/Step.xml)
  moves released items, applies gravity, and handles wall, floor, ceiling, and
  character collisions.
- [`oItem` Create event](../reference/spelunky-classic/extracted/Objects/Basis/oItem.events/Create.xml)
  defines the shared defaults for ordinary items, including gravity, bounce,
  friction, weight, and pickup eligibility.
- [`oItem` Alarm 2 event](../reference/spelunky-classic/extracted/Objects/Basis/oItem.events/Alarm%202.xml)
  ends the short safety period after release.
- [`oPlayer1` Step event](../reference/spelunky-classic/extracted/Objects/oPlayer1.events/Step.xml)
  routes the attack input to pickup or held-item use and contains the player's
  fast-rock collision response.
- [`oPlayer1` End Step event](../reference/spelunky-classic/extracted/Objects/oPlayer1.events/End%20Step.xml)
  keeps a carried item visually in front of the player.

For orientation only, Classic's ordinary light-item throw starts at roughly
eight horizontal pixels per 30 Hz update plus the player's horizontal speed,
with about three pixels per update of initial upward speed. Gravity adds roughly
0.6 pixels per update to downward speed; wall rebounds retain half the speed,
and floor contact retains about half the vertical and thirty percent of the
horizontal speed. They remain tuning references: play feel in this project's
60 Hz, HD-rendered runtime takes precedence over literal reproduction.
