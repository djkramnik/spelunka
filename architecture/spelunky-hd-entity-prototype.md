# Spelunky HD player and enemy prototype

Beads task: `spelunka-erb.3`

The prototype makes Spelunky HD artwork the default for the player and the
existing `goomba` behavior. It does not change entity traits, physics,
collision boxes, level rules, or terrain art.

Run the one-time local importer first, then start the project and open:

```text
http://127.0.0.1:5173/?level=spelunky-hd-entities
```

Spelunky HD is the default player and enemy graphics source. The normal entity
loaders use these sprite-sheet names without a runtime flag:

| Entity | Loader sprite name | Generated PNG |
| --- | --- | --- |
| Player | `generated/spelunky-hd/player` | `public/generated/spelunky-hd/player.png` |
| Existing `goomba` behavior | `generated/spelunky-hd/snake` | `public/generated/spelunky-hd/snake.png` |

Every level uses these player and enemy sheets; no graphics runtime option or
query parameter is required.

## Player mapping

The player uses 80x80 source cells, a `[40, 72]` bottom-centre source pivot,
and `frameScale: 0.25`. The resulting artwork anchors to the unchanged 14x16
player collider at logical `[7, 16]`.

| Spelunka state | Spelunky HD source frame | Notes |
| --- | ---: | --- |
| `idle` | 0 | Standing |
| `walk-1..8` | 1-8 | Complete source movement animation 1 |
| `run-1..8` | 1-8 | Same complete movement record, advanced faster by turbo distance |
| `skid-1..8` | 36-43 | Complete source animation 18 while reversing direction |
| `jump-1..4` | 108-111 | Complete non-looping source animation 2 |
| `fall-1..4` | 112-115 | Complete non-looping source animation 3 |
| `throw-1..5` | 54-58 | Complete non-looping source animation 8 |
| `reaction-stunned`, `reaction-dead` | 9 | Shared source dead/stunned pose |
| `carry-idle`, `carry-run-1..8` | 0, 1-8 | Intentional matching base-pose fallback |
| `carry-jump`, `carry-fall` | 111, 115 | Intentional terminal-pose fallback |

Facing continues to use the existing player heading and `SpriteSheet` flip
buffer. Existing focused player tests exercise idle, walk, run, skid, rise,
fall, carry, throw, stunned, dead, anchoring, and facing selection.

## Enemy mapping

The Mines snake is drawn by the existing `Goomba` behavior and remains a 16x16
solid, stomppable, pendulum-moving entity. Its source cells are also 80x80 with
a `[40, 72]` pivot and `frameScale: 0.25`, anchoring at collider position
`[8, 16]`.

| Spelunka state | Monster atlas frame | Notes |
| --- | ---: | --- |
| `walk-1` | 4 | Snake locomotion |
| `walk-2` | 7 | Snake locomotion |
| `flat` | 16 | Intentional flattened/defeated fallback |

The source snake faces right. The default loader enables movement-facing for
this behavior: negative pendulum speed flips the sheet, while positive speed
does not. A focused regression test covers both directions, animation
advancement, defeated state selection, bottom-centre anchoring, and the
unchanged collision size.

## Scale and layering

At `frameScale: 0.25`, the nominal 64-pixel artwork inside each source cell is
16 logical pixels tall or wide, while transparent padding may extend the
80-pixel cell to 20 logical pixels. Pivots keep that padding out of collision
calculations. The existing sprite layer remains sorted by `zIndex`; level
enemies are inserted first and the player is inserted afterward at the same
default z-index, so the player draws above an overlapping enemy as before.
