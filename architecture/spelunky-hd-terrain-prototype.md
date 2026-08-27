# Spelunky HD Mines terrain prototype

Beads task: `spelunka-erb.4`

This document records the initial standalone-block prototype. The current
neighbor-aware terrain and rocky border composition added by `spelunka-erb.7`
is documented in
[`spelunky-hd-terrain-borders.md`](./spelunky-hd-terrain-borders.md). The
viewport-sized background added by `spelunka-erb.8` is documented in
[`spelunky-hd-background-assembly.md`](./spelunky-hd-background-assembly.md).

The normal `underworld` sprite sheet now uses Spelunky HD Mines artwork with no
runtime flag. The one-time importer writes
`public/generated/spelunky-hd/mines.png`; the tracked metadata in
`public/sprites/underworld.json` loads it through the existing level pipeline.

## Source mapping

Spelunky HD's first-world earth set occupies the upper-left 512x512 region of
`ALLTILES/alltiles.png`. The prototype copies the four standalone 64x64 earth
blocks at these fixed source rectangles:

| Runtime name | Source rectangle |
| --- | --- |
| `ground-1` | `[0, 64, 64, 64]` |
| `ground-2` | `[64, 64, 64, 64]` |
| `ground-3` | `[0, 128, 64, 64]` |
| `ground-4` | `[64, 128, 64, 64]` |

These are complete one-cell blocks, including their original earth faces,
edges, and corners. The background cell is the upper-left 64x64 rectangle from
`MINE/minebg.jpg`, decoded to opaque RGBA and packed beside the earth cells.
The unlit Canvas renderer intentionally does not use `alltilesN.jpg`.

## Runtime behavior

The metadata uses 64x64 cells and `frameScale: 0.25`. This produces 16x16
logical tiles, matching `TileResolver` and collision geometry exactly. At the
game's 4x output transform, the background layer uses a matching high-resolution
intermediate buffer so the source artwork reaches output pixels without first
being collapsed to a 16-pixel bitmap.

Every named `ground` tile retains its original collision type. When all four
HD variants are present, the background layer chooses one deterministically
from the tile's world coordinates; camera movement therefore cannot reshuffle
terrain or expose coverage gaps. Empty tutorial cells use the repeating Mines
rock fill beneath entities.

Automated coverage verifies source crop dimensions and RGBA preservation,
opaque JPEG decoding, deterministic output, metadata scale and indices,
coordinate-stable variant selection, camera-buffer coverage, and unchanged
level dimensions. Per user direction, the prototype was not visually checked
locally.
