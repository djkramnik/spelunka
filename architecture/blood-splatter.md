# Procedural blood splatter

Task `spelunka-r54.28` implements blood as a reusable particle burst rather
than an enemy-specific animation. This matches the available Spelunky HD
evidence: review of `effects.png`, `effectsbig.png`, `rubble.png`, the animation
archive, and executable texture-name strings found no dedicated blood-splatter
sprite sequence. The generic effect atlases do contain impact flashes and
other effects, but not blood animation frames. The blood presentation is
therefore best represented as procedural droplets without importing any
proprietary pixels.

## Runtime contract

`emitBloodSplatter` accepts a level, a world-space origin, and optional
configuration. It immediately creates an independent set of `BloodParticle`
entities and returns those particles for callers that need to observe the
burst. The defaults name every part of the visual model:

- particle count and deep-red colour palette;
- particle-size range and horizontal/vertical spawn spread;
- horizontal launch-speed and upward-speed ranges;
- downward gravity and lifetime range; and
- entity z-index, set above ordinary actors.

Each launch first chooses a horizontal side, then keeps its spawn offset and
velocity on that side so the burst visibly travels outward. Vertical velocity
starts upward and gravity bends the path downward. The supplied random source
defaults to `Math.random`, but callers and tests can inject a deterministic
source.

Particles deliberately have no physics or solid traits and disable entity
collisions. They are still ordinary renderable entities, so the sprite layer
automatically translates their world positions through the active camera and
sorts them by z-index. Their draw method renders small centred colour blocks;
no texture asset or animation record is retained.

Every update integrates the ballistic path for at most the particle's
remaining lifetime. At expiry the particle deletes itself from the owning
level. Clipping the last update prevents a long frame from moving or aging a
particle beyond its configured lifetime. Bursts share no emitter object or
mutable module state, so overlapping and repeated emissions expire
independently without leaving an emitter behind.

## Enemy integration

`SnakeBehavior` already owned a one-shot death-effect callback. Its default is
now `emitSnakeBloodSplatter`, which places the shared burst at the centre of the
snake's gameplay bounds. An explicitly supplied callback still replaces the
default, keeping the enemy behavior testable and allowing later enemies to use
the same particle API without depending on the snake class.

The light flash seen when an HD whip connects is not part of this death effect.
It is a separate hit-confirmation presentation tracked by `spelunka-r54.58`,
because a nonlethal whip hit should flash even when no blood-producing death
occurs.
