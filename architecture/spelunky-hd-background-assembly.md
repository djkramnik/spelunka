# Spelunky HD Mines background assembly

Beads task: `spelunka-erb.8`

The default `underworld` background is a deterministic two-layer 20x12-cell
assembly rather than one repeated cell. Twenty by twelve 64-pixel source cells
map to one 320x192 logical region, which covers the 320x180 viewport before the
pattern repeats. World coordinates select both layers, so camera movement never
reshuffles the cave.

## Sheet layout

The one-time importer writes a 2048x768 RGBA Mines sheet with three independent
regions:

| Region | Output rectangle | Runtime names |
| --- | --- | --- |
| Terrain and rocky borders | `[0,0,512,512]` | `ground-*` |
| Opaque rock fill | `[512,0,256,256]` | `sky-fill-{x}-{y}` |
| Transparent decoration assembly | `[768,0,1280,768]` | `sky-decor-{x}-{y}` |

The fill is the complete 256x256 `MINE/minebg.jpg`, decoded to opaque RGBA. Its
4x4 cells repeat as a unit instead of stamping its upper-left cell everywhere.
The decoration layer starts transparent and preserves the source RGBA values,
including partial alpha, from `MINE/minesmallbg.png`.

Five complete 256x256 decorations are placed in the 1280x768 assembly:

| Source rectangle | Assembly destination |
| --- | --- |
| `[0,0,256,256]` | `[64,64]` |
| `[512,0,256,256]` | `[512,64]` |
| `[768,0,256,256]` | `[960,64]` |
| `[512,256,256,256]` | `[256,448]` |
| `[768,256,256,256]` | `[768,448]` |

Each crop follows a complete four-cell atlas boundary. The destinations leave
transparent space around the assembly boundary and avoid overlap, so a repeat
does not cut a structure in half or reveal uncovered pixels.

## Runtime layering

Compact `tileSets` metadata expands the fill and decoration grids when the
sprite sheet loads. For every logical `sky` cell, the renderer draws the
coordinate-selected opaque `sky-fill` tile followed by its transparent
`sky-decor` tile. Terrain chunks and rocky borders are drawn afterward, keeping
the existing foreground and collision behavior unchanged.

Automated coverage verifies the 2048x768 output, complete 20x12 selection,
world-coordinate wrapping (including negative coordinates), camera-relative
stability, opaque fill coverage, transparent empty decoration cells, partial
alpha preservation, deterministic import output, and foreground terrain
selection. Per user direction, no local visual inspection was performed; user
play review determines whether the result reads as a coherent cave.
