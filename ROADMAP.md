# Roadmap

- Evaluate that the game runs.
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
  - [ ] Convert audio, loaders, and JSON boundaries. Add Zod schemas where
        external level, sprite, sound, and music data enters the game.
    - [ ] Convert audio boards, music players, and music controllers.
    - [ ] Convert image, font, sprite, audio, music, and level loaders.
    - [ ] Add Zod schemas at every external JSON boundary.
  - [ ] Convert traits and entity collision behavior, followed by concrete
        entities such as Mario, Goombas, Koopas, cannons, and bullets.
    - [ ] Convert the trait base and movement/physics traits.
    - [ ] Convert interaction, collision, and lifecycle traits.
    - [ ] Convert the entity core and concrete entity factories.
  - [ ] Convert layers, player orchestration, debugging helpers, and finally
        the main entry point.
    - [ ] Convert rendering layers.
    - [ ] Convert player orchestration and debugging helpers.
    - [ ] Convert the main entry point and browser bootstrap.
  - [ ] Tighten compiler options incrementally, remove temporary escape
        hatches, and finish with strict type checking enabled.
    - [ ] Enable stricter compiler checks in compatible groups.
    - [ ] Remove temporary types and remaining JavaScript escape hatches.
    - [ ] Enable full strict mode and resolve the final diagnostics.
  - After every checkbox: build the project, then manually verify that the
    current game loads and plays before starting the next chunk.
- Review the codebase interactively.
- Evaluate current performance and identify opportunities to improve it.
- Sketch a roadmap for implementing a single complete level, including enemy interaction and level completion.
- Convert the game to Spelunky, using this project as the foundation.
