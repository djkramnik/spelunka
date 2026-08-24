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
future behavior, but they are not necessary to establish the first red-shell
throw.

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
ordinary red-shell case.

## Proposed first red-shell slice

The smallest behavior that preserves the recognizable Spelunky feel is:

1. Pressing D with empty hands continues to attempt a pickup.
2. Pressing D while carrying the red shell releases it immediately.
3. The shell travels in Mario's facing direction, inherits Mario's horizontal
   movement, and begins with a small upward lift.
4. The shell stops tracking Mario as soon as it is released.
5. After release, gravity pulls the shell downward and floors, walls, and
   ceilings prevent it from passing through terrain.
6. Terrain impacts use diminishing rebounds rather than hard stops: the shell
   bounces off walls and floors, floor friction reduces its horizontal speed,
   and small remaining movement eventually settles to zero.
7. A resting shell remains eligible to be picked up again.
8. A short post-release grace period prevents an immediate collision with
   Mario.

Up/down throw modifiers, heavy-item tuning, the Pitcher's Mitt, item damage,
breakable items, and weapon-specific actions should remain separate follow-up
work. They add breadth but are not required to prove the pickup-carry-throw loop.

These are separate pieces of implementation work in this project. The current
red shell only has pickup behavior. Existing physics and solid-terrain behavior
can provide gravity and prevent terrain penetration, but solid collisions
currently stop movement outright. Diminishing rebounds and floor friction must
therefore be added deliberately, and should be verified independently from the
initial release velocity and carrier detachment.

The work is tracked as a flat dependency chain beneath the conversion epic:

- `spelunka-r54.16`: release the carried item and launch it with D;
- `spelunka-r54.17`: apply gravity and prevent terrain penetration;
- `spelunka-r54.18`: add diminishing terrain rebounds;
- `spelunka-r54.19`: add floor friction and stable settling; and
- `spelunka-r54.20`: support repeated throw and re-pickup cycles, including
  thrower grace-period state.

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
eight horizontal pixels per 60 Hz update plus the player's horizontal speed,
with about three pixels per update of initial upward speed. Gravity adds roughly
0.6 pixels per update to downward speed; wall rebounds retain half the speed,
and floor contact retains about half the vertical and thirty percent of the
horizontal speed. These values describe the original GameMaker simulation and
should be translated and tuned for this project's time-based physics rather
than copied literally.
