# Local Spelunky HD graphics import workflow

Beads task: `spelunka-erb.2`

This one-time local build step reads selected graphics from a user-owned
Spelunky HD Steam depot and writes normal PNG/JSON assets. The browser game
never reads WAD files and performs no conversion at runtime.

The legal and technical source assessment is in
[`spelunky-hd-graphics-assessment.md`](./spelunky-hd-graphics-assessment.md).

## Run the importer

Install dependencies, then pass the directory that directly contains the
depot's `Data` folder:

```sh
npm install
npm run graphics:import:spelunky-hd -- \
  --source "/Users/davidgurr/Library/Application Support/Steam/Steam.AppBundle/Steam/Contents/MacOS/steamapps/content/app_239350/depot_239351"
```

`SPELUNKY_HD_DIR` may be used instead of `--source`. `--output` selects a
different output/project root and defaults to the current directory.

The command is non-interactive. It fails with a clear error if required input
is missing, an archive hash is unsupported, a WIX range is invalid, an
allow-listed entry is absent or changed, the animation layout is unsupported,
or the player image is too small.

## Local outputs

All outputs are ignored by Git:

- `.local/spelunky-hd/source/` contains only the six allow-listed source
  entries used by the player, enemy, terrain, and Mines background prototypes;
- `.local/spelunky-hd/import-report.json` records input, selected-entry, and
  generated-output hashes plus the numeric player and snake animation records;
- `public/generated/spelunky-hd/player.png` is a deterministic 400x880 RGBA
  sheet containing 54 unique, unchanged 80x80 source cells; and
- `public/sprites/generated/spelunky-hd/player.json` maps that sheet to every
  frame and animation name required by the current player loader;
- `public/generated/spelunky-hd/snake.png` is a deterministic 1440x80 RGBA
  sheet containing 18 unique HD snake cells in atlas order; and
- `public/sprites/generated/spelunky-hd/snake.json` maps those cells to four
  idle frames, seven walk frames, seven attack frames, and a temporary `flat`
  compatibility alias without duplicating source pixels; and
- `public/generated/spelunky-hd/mines.png` is a deterministic 2048x768 RGBA
  sheet containing the upper-left 512x512 Mines terrain region, the full
  256x256 opaque Mines fill, and a transparent 1280x768 background-decoration
  assembly. The terrain region includes standalone blocks, connected chunks,
  and transparent rocky edge decals.

The generated player metadata is loadable with:

```ts
await loadSpriteSheet('generated/spelunky-hd/player');
await loadSpriteSheet('generated/spelunky-hd/snake');
```

The tracked `underworld` sprite metadata loads the Mines sheet at
`frameScale: 0.25`, so its 64-pixel cells align with the existing 16-pixel
logical tile and 4x output scale without a runtime conversion.

The player and snake outputs use `frameScale: 0.25` and a `[40, 72]`
bottom-centre pivot. Snake animation timing comes from the validated second HD
animation section: idle frames 0-3 use 10 ticks per frame, walk frames 4-10 use
6 ticks per frame, and non-looping attack frames 12-18 use 4 ticks per frame.
Frame 11 is an empty atlas spacer. The HD range contains no dedicated snake
reaction or death record because HD uses a blood-splatter effect and removes
the snake; the importer therefore does not invent a corpse frame. The `flat`
alias retained for the pre-existing Goomba behavior points to frame 16 and is
explicitly temporary.

A follow-up review of `effects.png`, `effectsbig.png`, `rubble.png`, the HD
animation archive, and executable texture-name strings found no dedicated
blood-splatter animation sequence. The snake behavior should compose the
effect procedurally rather than expanding the texture allow-list with an
unrelated generic effect atlas.

Player carry states initially reuse the matching idle, run, jump, and fall
poses. That remains a deliberate compatibility baseline.

## Reproducibility and safety

The importer recognizes Steam application `239350`, depot `239351`, current
manifest `2622961810503583299` by the SHA-256 hashes recorded in the sourcing
assessment. It parses and bounds-checks all WIX records, rejects unsafe group or
entry path components, and reads only these allow-listed entries from the WAD:

- `PLAYERS/char_white.png`
- `MONSTERS/monsters.png`
- `ALLTILES/alltiles.png`
- `ALLTILES/alltilesN.jpg`
- `MINE/minesmallbg.png`
- `MINE/minebg.jpg`

The PNG repack copies RGBA pixels exactly, including partial alpha. Fixed PNG
encoder settings and stable JSON formatting make repeated runs byte-identical.
Focused tests construct a synthetic WAD/WIX pair, verify path/range rejection,
missing and unsupported source errors, animation validation, pixel/alpha
preservation, loader schema compatibility, source allow-list extraction, and
byte-identical reruns.

Run the importer coverage directly with:

```sh
npx tsx server/spelunky-hd-import.test.ts
```
