# Spelunky HD graphics sourcing and compatibility assessment

Status: complete; proceed with a local proof of concept

Beads task: `spelunka-erb.1`

## Decision boundary

Proceed with a local proof of concept only. The repository may contain the
importer, tests, frame mappings, and documentation, but it must not contain the
Spelunky HD depot, extracted source images, or generated images derived from
those sources unless Mossmouth grants suitable permission in writing.

This is a technical project decision, not legal advice. The user reports owning
Spelunky on Steam. A Steam purchase licenses personal, non-commercial use; it
does not transfer ownership of the game content or grant a general right to
redistribute it. The Steam Subscriber Agreement also restricts copying,
modification, derivative works, and distribution except where separately
permitted by applicable terms or law. No Spelunky-specific asset license or
permission to redistribute its graphics has been identified.

References:

- Steam store listing: <https://store.steampowered.com/app/239350/Spelunky/>
- Steam Subscriber Agreement: <https://store.steampowered.com/subscriber_agreement/>
- Current depot metadata: <https://steamdb.info/depot/239351/>

## Approved local source

Use only a depot downloaded by the user through the Steam account that owns
Spelunky. Do not obtain graphics from asset mirrors, mod packs, or unofficial
redistribution sites.

Spelunky is Steam application `239350`. Its Windows content depot is `239351`.
The current public depot manifest is `2622961810503583299`, dated 2021-09-29.
Steam lists the game as Windows-only, but an authenticated Steam client may
download that Windows depot on macOS.

In the macOS Steam client's Console, run:

```text
download_depot 239350 239351 2622961810503583299
```

This installation downloaded the completed depot to:

```text
~/Library/Application Support/Steam/Steam.AppBundle/Steam/Contents/MacOS/steamapps/content/app_239350/depot_239351
```

The repository importer will accept this directory through a configurable CLI
argument rather than assume this version-dependent Steam path. Steam granted
the signed-in account access to the depot. The project has not inspected a
purchase receipt and continues to treat ownership as user-attested.

The current local source archives are:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Data/Textures/alltex.wad` | 70,406,882 | `11cfdf62cfd36466883bf34bb8cc7a29527d6313caf7f9450d269352bf4948fd` |
| `Data/Textures/alltex.wad.wix` | 6,452 | `ed829de2a9bf7a457eda560e7825b43e69b0b6b9cdc9eb7dfd959c76b0762da4` |
| `Data/Animations/allanimations.wad` | 8,045 | `d24d7fd5b8cbcba2c76b4829b3bb38f47b33c32eb3d2189c38e52c82b031dd89` |

The WIX contains 193 entry records. Every offset and length is a safe integer,
is non-negative, and ends within the 70,406,882-byte WAD.

The 2014 manifest `3433023849712471361` appears in older modding instructions.
It is not the current public build and must not be the default. A future
workflow may allow it explicitly if a reproducibility need is documented.

## What a WAD is and what the importer will produce

Spelunky's `Data/Textures/alltex.wad` is an uncompressed asset container. Its
companion `alltex.wad.wix` is a text index containing groups, entry names,
offsets, and lengths. The texture entries are ordinary image payloads such as
PNG and JPG files. WAD is only an input format; the Spelunka runtime does not
need to support it.

The intended local pipeline is:

```text
alltex.wad + alltex.wad.wix
  -> validate archive and select approved entries
  -> extract selected source images to ignored local storage
  -> crop/remap required frames deterministically
  -> write Spelunka sprite-sheet PNG files and JSON metadata
```

The WAD/WIX format is documented by the MIT-licensed SpelunkyWad project:
<https://github.com/Contron/SpelunkyWad>. Its parser shows that WIX group lines
start with `!group`; entry lines provide the entry name, byte offset, and byte
length into the WAD. This is simple enough to implement and test in TypeScript
without checking in a third-party binary.

## Current renderer contract

Spelunka currently loads browser-native images and JSON metadata through
`loadSpriteSheet`. The metadata supports:

- uniform terrain tiles using `tileW`, `tileH`, and grid indices;
- arbitrary entity frame rectangles;
- per-frame bottom-centre pivots;
- a sheet-wide frame scale; and
- named animations with an ordered frame list and frame duration.

The world uses 16-by-16 logical tiles. The renderer draws a 320-by-180 logical
canvas at 4x output scale with image smoothing disabled. Existing high-resolution
player art demonstrates the compatibility path: 80-by-80 source frames use
`frameScale: 0.25`, producing 20-by-20 logical artwork and one output pixel per
source pixel. Entity artwork is pivoted independently of its collision box, so
larger HD silhouettes do not require immediate physics changes.

Required technical work after inspection:

- define deterministic crops for HD atlas regions rather than requiring runtime
  WAD support;
- map Spelunky HD animation states onto the smaller set currently routed by the
  player and enemy entities;
- choose a consistent logical scale and pivot per asset family;
- split or repack large source atlases so the project loads only the vertical
  slice it needs;
- preserve source alpha exactly and identify whether any JPG companion maps are
  optional lighting/normal data rather than visible colour artwork; and
- decide how terrain variants and decorative background layers map onto the
  current tile/pattern system.

No renderer blocker exists for a representative PNG/JSON proof of concept.
The primary conversion work is atlas cropping and state mapping.

## Representative inventory

The following entries were read directly from the owned local archive. They
were extracted only to a temporary directory for inspection and were not added
to the repository.

| Sample | Archive entry | Format and geometry | SHA-256 |
| --- | --- | --- | --- |
| Player | `PLAYERS/char_white.png` | 1024x1024, 8-bit RGBA; 80x80 frame cells with an 8-pixel gutter around a nominal 64x64 centre | `a91a43376db1f42f0aa27321977bcdcb53126b0cb74e8181dc3b39fdde193169` |
| Enemy | `MONSTERS/monsters.png` | 1024x1024, 8-bit RGBA; 80x80 frame cells for snake, bat, spider, caveman, skeleton, damsel, and related states | `2a4be04b44406d18f74f71da2e42777ab32d2d4393613cf2b2c3ffa54372ceb4` |
| Terrain colour | `ALLTILES/alltiles.png` | 2048x2048, 8-bit RGBA; packed regions including Mines ground, edges, corners, spikes, ladders, blocks, and decorations | `40a35533cf481f371855bdbfeab206aed7e1bee24078a6a8f27103c029b7860c` |
| Terrain lighting | `ALLTILES/alltilesN.jpg` | 2048x2048, 8-bit RGB JPEG companion map aligned with the terrain colour atlas | `20fd2e5fbb9ba25cf8c5b388ff1177084969aeaa031bff800dc6b9e283814033` |
| Mines decoration | `MINE/minesmallbg.png` | 1024x1024, 8-bit RGBA; rock clusters, timber openings, cobweb, shrine, and other background decorations | `f2d50e85c3c7df937c9f24e7b4c2355191f14047ec538f8e55537889822778da` |
| Mines fill | `MINE/minebg.jpg` | 256x256, 8-bit RGB JPEG; opaque repeating dark-rock background | `22093edcf3bb51b6c0190609c92c0fdb0565c39791d4b73a440622587420bc93` |

All four PNG samples contain an alpha channel and use all 256 alpha levels, so
the converter must preserve partial transparency rather than reduce it to a
binary mask. The JPEG entries are opaque. The source images use sRGB and do not
use indexed palettes.

`Data/Animations/allanimations.wad` is a 467-line text file containing 77
numeric animation sections. The first section describes 35 player animation
records over frame indices 0 through 143, which matches the 12-by-12 usable
80-pixel grid in the player atlas. The data records animation IDs, frame ranges,
timing, terminal frames, and looping flags, but does not embed semantic names.

The player art visibly covers the states required by the current game: standing,
walking/running, jumping and falling, carrying/throwing, hit/stunned/dead, plus
additional crawl, ledge, whip, door, ladder, rope, push, look-up, multiplayer,
and ghost states. The numeric ranges must be mapped explicitly to Spelunka's
named states and reviewed visually. The tutorial enemy proof of concept should
start with the snake frames at the beginning of `MONSTERS/monsters.png`; its
idle/locomotion, attack/hit, and death frames are contiguous on the same 80-pixel
grid.

The Mines terrain is not a simple uniform tile sheet. The importer should crop
a deliberately small set of fixed rectangles into a new regular atlas for the
tutorial slice. The companion `alltilesN.jpg` appears to supply lighting or
normal information; the current unlit Canvas renderer may omit it for the proof
of concept while preserving the colour atlas alpha. `minebg.jpg` can be used as
the repeating base layer, with selected transparent decorations from
`minesmallbg.png` drawn above it.

## Recommendation

Proceed to `spelunka-erb.2`. Implement a narrow TypeScript importer with path
traversal protection, strict WIX bounds validation, deterministic PNG output,
clear missing-source errors, and focused tests built from synthetic fixtures.
It should extract only allow-listed entries and repack fixed, reviewed frame
rectangles into assets accepted by the existing PNG/JSON loader.

Do not ship or publish the resulting HD graphics without separate permission
from the rights holder. If the project is intended for public distribution,
the likely safe deliverable is the importer plus mappings, requiring each user
to supply their own locally installed copy.
