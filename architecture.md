# Architecture

## Interactive review

### 2026-08-11

This is the first, high-level pass through the current runtime architecture.
Later passes can add progressively more detail beneath this overview.

## Runtime operation: high-level overview

The game is a small browser application whose visible output is rendered into
one canvas. The browser loads the TypeScript entry module through Vite, the
entry module loads the assets and constructs the game objects, and a fixed-step
timer updates and redraws the current scene.

At a high level, startup proceeds as follows:

1. `index.html` loads `/src/main.ts` as an ES module.
2. `bootstrap()` finds the game canvas and loads the bitmap font.
3. The canvas displays a black screen with `CLICK TO START` and waits for a
   click anywhere in the window.
4. The first click removes the start listener and calls `main()`. Starting from
   a user gesture allows the game to create and use its `AudioContext` without
   running afoul of normal browser autoplay restrictions.
5. The game loads the entity assets, creates the Mario player, installs the
   keyboard controls, creates the scene runner, and starts the animation loop.
6. Level `1-1` is loaded and assembled. While that work is in progress, the
   canvas displays a loading bar.
7. Once the level is ready, the scene runner shows a two-second player/status
   screen and then begins updating and drawing the level.
8. A level trigger can call the same level-loading flow for another named
   level.

The main loop uses `requestAnimationFrame` for browser scheduling but advances
the simulation in fixed `1/60`-second steps. On each step, the current scene is
updated and then drawn into the canvas.

### Asset loading

Asset loading occurs in two phases.

Before the click-to-start screen appears, the game loads `/img/font.png` and
turns it into an 8-pixel bitmap font used for on-canvas text.

After the click, the startup progress bar tracks nine logical tasks:

- Five entity factories are loaded in parallel: Mario, Goomba, Koopa, Bullet,
  and Cannon. These load sprite-sheet JSON and images where needed. Mario and
  Cannon also load sound-effect manifests, fetch their Ogg files, and decode
  them into Web Audio buffers.
- Four tasks belong to the initial level: its level JSON, background
  sprite-sheet, music manifest, and reusable tile-pattern JSON. After the level
  JSON identifies those dependencies, the last three load in parallel.

All external JSON is parsed through a Zod schema before it is used. Sprite
manifests define named frames and animations over image files. Sound effects
are fetched and fully decoded during loading. Music is handled differently:
the music manifest is loaded and its URLs are assigned to detached
`HTMLAudioElement` objects, but the level loader does not wait for the music
files themselves to finish downloading.

Once the initial level assets are available, the loader expands tile patterns,
builds collision grids and render layers, instantiates the entities named in
the level file, adds level triggers and timer behavior, and returns a complete
`Level` scene.

### DOM and browser objects

The application-specific visible DOM is just the canvas declared statically in
`index.html`:

```html
<canvas id="screen" width="256" height="240"></canvas>
```

The runtime does not create or append any visible DOM elements. It obtains the
canvas's 2D context and draws the start prompt, loading state, status screens,
level, entities, and dashboard into that same surface. CSS scales the
256-by-240 canvas to the viewport height, centers it horizontally, and keeps
the pixel art crisp against a black page background.

The loaders do construct `Image` objects for graphics and `Audio` objects for
music, but these remain detached from the document. Sound effects use a single
`AudioContext`, decoded `AudioBuffer` objects, and short-lived buffer sources.

### Click and keypress handlers

`bootstrap()` adds one `click` listener to `window`. The first click removes
that listener and starts the game, so later clicks have no game behavior.

After startup, `setupKeyboard()` adds `keydown` and `keyup` listeners to
`window`. The configured controls are:

- `ArrowLeft`: hold to move left; release to stop contributing leftward input.
- `ArrowRight`: hold to move right; release to stop contributing rightward
  input.
- `KeyZ`: start a jump on press and cancel or shorten it on release.
- `KeyX`: enable turbo movement while held and disable it on release.

Keyboard state is tracked by physical `KeyboardEvent.code`, rather than the
character produced by a keyboard layout. For mapped controls, the handler
prevents the browser's default action and ignores repeated `keydown` events
that do not change the stored pressed/released state. Unmapped keys are left
alone. An `InputRouter` forwards each mapped action to its registered
receivers; currently the only receiver is the Mario entity.
