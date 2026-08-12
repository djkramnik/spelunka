# Done

- [x] Evaluate that the game runs.
- [x] Review the codebase interactively.
  - [x] Review runtime startup, assets, DOM, input, and the main loop.
  - [x] Review physics and character movement.
  - [x] Review tile and entity collision logic.
- Convert the JavaScript to TypeScript piecemeal.
  - [x] Replace the legacy `serve` setup with Vite for development and
        production builds.
  - [x] Separate application modules into `src/` and keep runtime assets in
        `public/` so Vite can build the project correctly.
  - [x] Install Zod in preparation for validating external game data.
  - [x] Establish the TypeScript baseline: add TypeScript, create a permissive
        `tsconfig.json`, and confirm the untouched JavaScript still builds.
  - [x] Create a visible progress indicator during game startup so loading
        progress is clear while the conversion proceeds.
  - [x] Convert small, dependency-light foundations first: math, animation,
        events, bounding boxes, the timer, and keyboard/input state.
    - [x] Convert math and animation utilities.
    - [x] Convert the event emitter and event buffer.
    - [x] Convert bounding boxes, the timer, and keyboard/input state.
  - [x] Convert rendering and world primitives: sprite sheets, compositors,
        cameras, tiles, collision resolution, scenes, and levels.
    - [x] Convert sprite sheets, compositors, and cameras.
    - [x] Convert tile storage and collision resolution.
    - [x] Convert scenes, scene runners, and levels.
  - [x] Convert audio, loaders, and JSON boundaries. Add Zod schemas where
        external level, sprite, sound, and music data enters the game.
    - [x] Convert audio boards, music players, and music controllers.
    - [x] Convert image, font, sprite, audio, music, and level loaders.
    - [x] Add Zod schemas at every external JSON boundary.
  - [x] Convert traits and entity collision behavior, followed by concrete
        entities such as Mario, Goombas, Koopas, cannons, and bullets.
    - [x] Convert the trait base and movement/physics traits.
    - [x] Convert interaction, collision, and lifecycle traits.
    - [x] Convert the entity core and concrete entity factories.
  - [x] Convert layers, player orchestration, debugging helpers, and finally
        the main entry point.
    - [x] Convert rendering layers.
    - [x] Convert player orchestration and debugging helpers.
    - [x] Convert the main entry point and browser bootstrap.
  - [x] Tighten compiler options incrementally, remove temporary escape
        hatches, and finish with strict type checking enabled.
    - [x] Enable stricter compiler checks in compatible groups.
    - [x] Remove temporary types and remaining JavaScript escape hatches.
    - [x] Enable full strict mode and resolve the final diagnostics.
  - After every checkbox: build the project, then manually verify that the
    current game loads and plays before starting the next chunk.
