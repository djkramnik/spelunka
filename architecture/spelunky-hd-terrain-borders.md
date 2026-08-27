# Spelunky HD Mines terrain borders

Beads task: `spelunka-erb.7`

The normal `underworld` renderer composes connected Mines earth chunks and a
second rocky-border pass. This is a visual operation only: level tile matrices,
collision types, and 16x16 logical collision cells are not changed.

## Imported atlas region

The one-time importer copies the upper-left 512x512 region of
`ALLTILES/alltiles.png` without resampling. It occupies `[0,0,512,512]` in the
current 2048x768 combined Mines sheet. `public/sprites/underworld.json`
addresses it as 64x64 cells with `frameScale: 0.25`.

Connected base chunks use these source rectangles:

| Shape | Variants | Source rectangles |
| --- | ---: | --- |
| 1x1 | 4 | `[0,64,64,64]`, `[64,64,64,64]`, `[0,128,64,64]`, `[64,128,64,64]` |
| 2x1 | 2 | `[0,192,128,64]`, `[128,192,128,64]` |
| 1x2 | 2 | `[128,64,64,128]`, `[192,64,64,128]` |
| 2x2 | 4 | `[0,256,128,128]`, `[128,256,128,128]`, `[0,384,128,128]`, `[128,384,128,128]` |

The renderer partitions connected `ground` cells in stable world-coordinate
order: available 2x2 regions first, then 2x1 or 1x2 pairs, then standalone
cells. A coordinate hash chooses variants, so camera movement cannot rearrange
the composition. Each component of a larger source rectangle is drawn into its
corresponding original collision cell.

## Exposed rocky borders

After all base tiles are drawn, the renderer checks the four cardinal neighbors
of each `ground` cell. It draws a decal only when that neighbor is not ground,
so adjacent solid cells never receive an internal rocky seam.

| Side | Source cells | Logical draw offset from the solid cell |
| --- | --- | --- |
| Top | `[5,0]`, `[6,0]`, `[7,0]` | `[0, -0.4]` cells |
| Bottom | `[5,1]`, `[6,1]` | `[0, +0.6]` cells |
| Left | `[7,2]` | `[-0.5, 0]` cells |
| Right | `[7,1]` | `[+0.5, 0]` cells |

The offsets reproduce the atlas artwork's intended origin and let transparent
rocks extend into empty space. Cardinal decals overlap naturally at convex and
concave corners rather than being clipped into a square. The intermediate
background buffer has one additional tile of padding on every side, preventing
these overhangs from disappearing at camera boundaries.

Automated coverage checks coherent 2x2 composition, exposed-side masks, absence
of internal borders, exact decal offsets, native output scale, camera padding,
partial-alpha preservation, deterministic import output, and identity of the
original collision tile object. Per user direction, no local visual inspection
was performed; user play review determines whether the result resolves the
flat, sharply cut-off terrain appearance.
