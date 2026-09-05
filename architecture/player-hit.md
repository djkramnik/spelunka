# Nonlethal player hit and invulnerability presentation

Beads task: `spelunka-r54.37`

This slice adds the ordinary, recoverable feedback seen when the player loses
a heart without entering terminal death. It deliberately does not add strong
knockback, unconsciousness, stun recovery, control lockout, or revival.

## Accepted-damage boundary

`Health.takeDamage` remains the authoritative admission point. Initial snake
contact reserves a target and starts the attack wind-up without changing the
player. When that animation reaches its configured impact, an accepted damage
call produces the player feedback:

- one heart is removed and one second of health-level protection begins;
- the pending snake attack consumes its single impact;
- a surviving player starts one small hit reaction and receives the existing
  90 logical pixel-per-second horizontal impulse away from the snake; and
- a player losing the last heart skips the small reaction and enters the
  terminal `PlayerDeath` path.

Repeated overlap during the wind-up cannot restart or retarget the pending
attack. Continuous overlap while `Health.invulnerable` is true changes none of
these states. It removes no heart, emits no sound, does not reapply the impulse,
and does not restart either animation.

## Small player reaction

The nonterminal reaction uses source frames 36-37, the opening arms-back poses
of HD player animation 18. The importer names them `reaction-hit-1` and
`reaction-hit-2` and preserves their four-HD-tick cadence, producing a brief
8/60-second non-looping reaction. Frames 78-83 belong to the pushing sequence
and are not used for damage. The curled source frame 103 remains exclusive to
airborne terminal death.

The source frame's head points left. Leftward recoil draws it unchanged and
rightward recoil mirrors it. The reaction has visual priority over locomotion,
jumping, carrying, throwing, crouching, ledge, and ladder frames. Terminal
death has higher priority and cannot be hidden by a pending small reaction.

This is a presentation state, not an unconscious state. It does not disable
input, replace physics, add vertical velocity, detach the player from a ladder
or ledge, force a crouched player to stand, or drop a carried item. When its
timer expires, the renderer returns immediately to the state selected by those
unchanged systems.

## Invulnerability flash

`Health` exposes elapsed protection time so rendering can begin each accepted
hit at full opacity. While a living player is protected, opacity follows a
smooth eight-cycle-per-second oscillation between `1` and `0.35`. The flash
lasts for the complete protection window, independently of the shorter recoil
pose. Player drawing restores the incoming canvas alpha afterward so no other
entity or layer inherits the effect. Terminal death is always drawn without
the protection flash.

## Reusable enemy attack presentation

`AttackAnimation` is an entity-neutral trait containing an explicit duration,
impact time, elapsed time, active state, deterministic `start` operation, and
single-consumption impact signal. It does not name a sprite, target, damage, or
collision behavior. Each enemy maps the active timer to its own animation
record and applies its own effect when consuming the impact. This lets contact
attacks, projectiles, or later enemy-specific logic share one presentation
lifecycle without putting enemy policy in `Health` or the player.

The snake is the first consumer. Initial vulnerable contact starts its
seven-frame HD animation 17 (`attack-1` through `attack-7`) at four HD ticks per
frame. The snake pauses patrol for the resulting 28/60-second sequence. Impact
occurs at the start of `attack-5`, after 16/60 seconds of visible wind-up; only
then are damage, sound, recoil, and protection applied. The last three frames
complete the bite and recovery before the snake returns to walking. Death
still suppresses every living animation, and the attack frames are never used
as a corpse.

Focused tests cover trait timing and restart rules, damage acceptance, facing,
animation precedence, opacity extrema and restoration, rejected overlap,
lethal routing, and return to ordinary player and snake animation states.
