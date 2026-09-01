# Spelunky Classic snake behavior and animation

This note describes the snake as it behaves in the locally extracted Spelunky
Classic 1.1 source. It is a behavior contract for Spelunka, not code to copy.
The original object, inherited enemy behavior, animation frames, tutorial
placement, and license are all available locally, so the core observations
below are source-backed rather than inferred from video.

## Player-visible behavior

The snake is a small ground enemy. It does not chase the player and its unused
attack state contains no behavior. Its recognizable loop is:

1. Start walking in a randomly chosen horizontal direction.
2. Continue at one pixel per Classic update, or about 30 pixels per second in
   the original 30 Hz rooms.
3. Turn around when a wall blocks the current direction.
4. Probe just beyond the leading foot and turn before walking off a ledge.
5. Occasionally stop for a short, random pause, then choose a new random
   direction and resume walking.

While walking, Classic has a one-in-100 chance on each 30 Hz update to begin a
pause. That is an average of roughly 3.3 seconds of walking between pauses,
although any individual interval may be much shorter or longer. A pause lasts
20-50 updates, roughly 0.67-1.67 seconds.

When neither direction is usable, such as on a one-tile perch or between close
walls, the snake stops rather than repeatedly walking into an edge. Gravity
still applies while it is unsupported. The original values are 0.6 pixels per
update squared with a terminal downward speed of 10 pixels per update, about
540 pixels per second squared and 300 pixels per second when translated from
the 30 Hz room rate.

Classic only simulates the snake while it is within a small margin around the
camera. This is an optimization rather than an important player-facing trait:
off-screen snakes simply remain frozen until the camera approaches.

## Collision, damage, and death

The visible sprite is 16x16 pixels. Classic narrows its active collision bounds
to the inner horizontal range from x+2 through x+14 while retaining the full
16-pixel height. This keeps transparent pixels around the head and tail from
making contact feel too generous.

The snake has one hit point:

- A valid descending stomp damages the snake, bounces the player upward, and
  kills the snake.
- A whip hit deals damage and kills it.
- A sufficiently fast stunned enemy or other inherited projectile interaction
  can also remove its single hit point.
- Spikes, lava, and overlapping solid terrain use inherited enemy rules and
  kill it.
- Touching a living snake from the side or below costs the player one heart,
  knocks the player horizontally away, and grants 30 Classic updates (one
  second) of temporary invulnerability.

The snake has no stunned or corpse animation of its own. When its hit point
reaches zero, its step event creates a larger blood effect, records the kill
when appropriate, and destroys the instance immediately. The `ATTACK` state is
only a placeholder and should not be interpreted as an omitted lunge or bite.

## Animation behavior in Classic

The active snake uses four 16x16 left-facing walk frames, in extracted order
`image 0.png` through `image 3.png`. Classic advances the same four-frame cycle
in both movement states:

| State | Classic `image_speed` | Effective frame rate | Full cycle |
| --- | ---: | ---: | ---: |
| Walking | 0.4 images/update | 12 frames/second | about 0.33 seconds |
| Paused | 0.2 images/update | 6 frames/second | about 0.67 seconds |

There is also a separate one-frame `sSnakeLeft` sprite used as the object's
initial image and in editor or transition UI. Once the active step runs, the
four-frame walk sprite replaces it, including during pauses.

Classic always draws the left-facing animation. Code for a right-facing sprite
is commented out, and no `sSnakeWalkR` resource is present in the extraction.
The internal facing value still controls movement. These observations explain
the original behavior, but the extracted Classic pixels and four-frame sequence
are not the visual target for Spelunka.

## Spelunky HD visual target

Spelunka's snake graphics and animation frames should follow the completed
Spelunky HD graphics work. The owned local HD source provides the snake in
`MONSTERS/monsters.png` on the same 80x80 cell grid used by the importer. The
existing prototype already proves this asset can be converted and loaded with
a `[40, 72]` bottom-centre source pivot and `frameScale: 0.25`, keeping the
larger artwork aligned to a small gameplay collider.

Visual review and the second section of `Data/Animations/allanimations.wad`
establish these HD sequences:

| Runtime animation | HD record | Monster-atlas frames | Cadence | Routing |
| --- | ---: | --- | --- | --- |
| `idle` | 0 | 0-3 | 10 HD ticks per frame (6 fps) | Looping |
| `walk` | 1 | 4-10 | 6 HD ticks per frame (10 fps) | Looping |
| `attack` | 17 | 12-18 | 4 HD ticks per frame (15 fps) | Non-looping; hold frame 18 |

Atlas frame 11 is an empty spacer and is intentionally excluded. The complete
idle, walk, and attack ranges are imported in source order. The attack is
available for visual fidelity but remains unused by the first behavior slice,
because Classic's snake has no implemented attack.

The reviewed HD range has no dedicated hit-reaction or death record because HD
presents snake death as a blood-splatter effect followed by removal. Spelunka
must not mislabel a living attack pose as a corpse. The current `flat` frame
name remains only as a temporary compatibility alias to source frame 16 for the
Goomba behavior; the dedicated snake entity should emit an HD-style blood
splatter and remove the snake instead of fabricating a death animation.

### HD blood-effect asset review

The owned HD texture index contains no entry named for blood, gore, or
splatter. The plausible shared-effect resources were extracted temporarily and
reviewed without adding them to the repository:

- `ATSTART/effects.png` is a 512x512 atlas of 64 general fire, smoke, energy,
  projectile, and impact cells;
- `ANYLEVEL/effectsbig.png` is a 512x512 collection of large portal, vortex,
  explosion, and screen-effect art; and
- `ANYLEVEL/rubble.png` is a 1024x1024 atlas of static terrain, body, shell,
  bone, and other debris, including some bloodied body fragments.

None contains a dedicated blood-splatter frame sequence. The HD animation
archive likewise contains no additional snake death or named blood animation
record, and the stripped executable exposes only the generic atlas filenames.
The best-supported inference is that HD composes the splatter from particles
or debris rather than playing a blood sprite animation. That effect is deferred
to `spelunka-r54.28`. The first snake slice keeps a named death-effect callback
whose default implementation intentionally does nothing, so the later task can
add the procedural burst without changing snake collision or death semantics.

Classic continues to define when the snake is walking, paused, damaging, or
dead, but does not dictate how many frames those states use or how those frames
look.

The HD source snake faces right, and the existing sprite loader can mirror it
for leftward movement. The new snake should preserve that established facing,
scale, pivot, alpha, local-import, and ignored-generated-output workflow rather
than introducing a second Classic-derived snake sheet.

## Spelunka implementation contract

Tasks `spelunka-r54.25`, `spelunka-r54.26`, and `spelunka-r54.29` implement the
following first slice:

- Register a distinct level entity factory named `snake`. Do not leave the
  snake as artwork applied to the existing `goomba` factory.
- Use a 16x16 visual footprint with a 12x16 collider inset two logical pixels
  from the left. Keep the sprite bottom-aligned to that collider.
- Patrol at a named default speed of 30 logical pixels per second.
- Start in a named deterministic direction, reverse on horizontal obstruction,
  and probe terrain at the leading foot so the snake reverses before either end
  of its current ledge.
- Stop when neither direction is safe instead of oscillating at an edge.
- Walk continuously at the named patrol speed. Spelunka deliberately omits
  Classic's random pauses and direction changes so the enemy simply travels
  back and forth across its current ledge.
- Use the Spelunky HD monster atlas and existing local import workflow for all
  snake artwork. Map documented HD source indices for each required visual
  state, use the HD frame sequence and cadence as the guide, and mirror its
  right-facing source art for leftward movement. Do not copy or recreate the
  extracted Classic sprite pixels.
- A qualifying stomp must take precedence over harmful contact, bounce the
  player through the existing `Stomper` behavior, and kill the snake. Other
  player contact uses the existing `Killable` capability and is lethal until
  this project has a multi-heart damage system.
- Reuse projectile eligibility already expressed by `Killable`, so fast thrown
  items can kill the snake without naming the class in projectile code.
- Because HD uses a particle-like blood splatter rather than a dedicated snake
  death frame, the snake invokes a named no-op death-effect hook exactly once,
  stops drawing, and is removed promptly. `spelunka-r54.28` can later supply a
  reusable procedural burst through that hook. Do not use the HD attack
  sequence or Classic pixels as a fabricated corpse.
- Continue simulating off-screen snakes. Camera-gated updates are not required
  until profiling demonstrates a need.

The edge probes, wall response, collision inset, one-hit death, and absence of
an attack are faithful to Classic. Continuous deterministic patrol, HD
animation, lethal contact, and always-on updates are deliberate project
choices. Classic's random pauses are documented above as source evidence but
are intentionally not part of current gameplay. Lethal contact is another
simplification: Classic deals one heart plus knockback and temporary
invulnerability, but Spelunka currently models the player with a binary
`Killable` lifecycle.

## Current implementation

The distinct `snake` factory now consumes the generated HD walk animation while
preserving the 12x16 inset gameplay collider. Its behavior continuously crosses
its current ledge, reverses at either end or at a wall, kills the player on
non-stomp contact, and dies through the common `Killable` path. Death suppresses
drawing, invokes the no-op future-splatter hook once, and removes the entity on
its next update. The imported HD idle frames remain available for future
behavior but are not used by this simple patrol. The existing `goomba` factory
still uses its temporary HD snake-art compatibility mapping; levels can select
the dedicated behavior explicitly by using the stable `snake` entity name.

Classic's own tutorial places one `oSnake` at `[352, 64]`. This is useful
evidence that a simple, observable ground encounter is appropriate for the
later tutorial integration task, but it is not a required coordinate for
Spelunka's differently shaped tutorial level.

## Asset and license constraint

The extracted Classic frames remain behavior evidence only and should not be
copied into the new sprite sheet. The bundled Spelunky User License covers
those pixels, but its redistribution path is irrelevant if the implementation
does not use them.

The locally generated Spelunky HD snake depends on a user-owned installation
and is ignored by Git, following the policy established by the HD graphics
epic. The importer and frame mappings may be committed; proprietary generated
pixels must remain local unless separate permission permits distribution. The
snake can therefore be the project's default visual when local HD graphics
have been imported, but it is not a self-contained redistributable asset.

## Source observations

The behavior and visual contract comes from these local resources:

- [`oSnake` Create event](../reference/spelunky-classic/extracted/Objects/Enemies/oSnake.events/Create.xml)
  defines its collision bounds, initial velocity, animation speed, one hit
  point, states, and facing.
- [`oSnake` Step event](../reference/spelunky-classic/extracted/Objects/Enemies/oSnake.events/Step.xml)
  contains movement, gravity, wall and ledge decisions, pause timing, death,
  and the commented-out right-facing animation branch.
- [`oSnake` object definition](../reference/spelunky-classic/extracted/Objects/Enemies/oSnake.xml)
  establishes `oEnemy` inheritance, the initial static sprite, and render
  depth.
- [`oEnemy` Create event](../reference/spelunky-classic/extracted/Objects/Basis/oEnemy.events/Create.xml)
  supplies gravity, terminal velocity, shared one-hit defaults, pickup-related
  state, and other inherited enemy values.
- [`oEnemy` Step event](../reference/spelunky-classic/extracted/Objects/Basis/oEnemy.events/Step.xml)
  supplies water, lava, spikes, sacrifice, and moving-enemy projectile rules.
- [`oEnemy` character collision](../reference/spelunky-classic/extracted/Objects/Basis/oEnemy.events/Collision%20with%20oCharacter.xml)
  defines stomp precedence, player bounce, one-heart contact damage, knockback,
  and temporary invulnerability.
- [`oEnemy` whip collision](../reference/spelunky-classic/extracted/Objects/Basis/oEnemy.events/Collision%20with%20oWhip.xml)
  applies whip damage and hit feedback.
- [`sSnakeWalkL` frames](../reference/spelunky-classic/extracted/Sprites/Enemies/sSnakeWalkL.images/)
  are the four 16x16 active animation images; the adjacent
  [`sprite definition`](../reference/spelunky-classic/extracted/Sprites/Enemies/sSnakeWalkL.xml)
  records origin and mask metadata.
- [`sSnakeLeft` frame](../reference/spelunky-classic/extracted/Sprites/Enemies/sSnakeLeft.images/image%200.png)
  is the separate static image used before the active animation and by editor
  UI.
- [`rTutorial`](../reference/spelunky-classic/extracted/Rooms/rTutorial.xml)
  records the 30 Hz room speed and the original tutorial snake placement.
- [`rand`](../reference/spelunky-classic/extracted/Scripts/rand.gml) confirms
  that the direction, pause chance, and pause-duration ranges are inclusive.
- [`Spelunky User License`](../reference/spelunky-classic/COPYING.txt) defines
  the conditions that cover the extracted sprites and source.

The HD visual mapping and import constraints are documented separately in:

- [Spelunky HD graphics assessment](spelunky-hd-graphics-assessment.md), which
  identifies the monster atlas and contiguous snake states;
- [Spelunky HD import workflow](spelunky-hd-import-workflow.md), which defines
  the owned-local-source and ignored-generated-output process; and
- [Spelunky HD entity prototype](spelunky-hd-entity-prototype.md), which records
  the current snake frame indices, scale, pivot, facing, and collider isolation.
