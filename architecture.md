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

### Runtime pseudocode

The following is a condensed, code-shaped representation of the current
implementation. It omits error handling and some render-layer wiring, but
preserves the runtime control flow.

```ts
async function bootstrap() {
    const canvas = document.getElementById('screen') as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    // See: DOM and browser objects

    const font = await loadFont();
    // See: Asset loading

    drawStartPrompt(context, font, 'CLICK TO START');

    const start = () => {
        window.removeEventListener('click', start);
        void main(canvas, font);
    };
    window.addEventListener('click', start);
    // See: Click and keypress handlers
}

async function main(canvas: HTMLCanvasElement, font: Font) {
    const videoContext = canvas.getContext('2d');
    const audioContext = new AudioContext();
    const loadingProgress = new LoadingProgress();

    loadingProgress.reset(9, 'Loading game');
    const entityFactory = await loadEntities(audioContext, () => {
        loadingProgress.advance();
        loadingProgress.draw(videoContext);
    });
    const loadLevel = createLevelLoader(entityFactory);
    // See: Asset loading

    const sceneRunner = new SceneRunner();
    const mario = entityFactory.mario();
    makePlayer(mario, 'MARIO');

    const inputRouter = setupKeyboard(window);
    inputRouter.addReceiver(mario);
    // See: Click and keypress handlers

    async function runLevel(name: string, continuingStartup = false) {
        configureProgressForLevel(name, continuingStartup);

        const loadingScene = createLoadingScene(loadingProgress);
        sceneRunner.addScene(loadingScene);
        sceneRunner.runNext();

        const level = await loadLevel(name, () => {
            loadingProgress.advance();
        });
        // See: Asset loading

        level.events.listen(Level.EVENT_TRIGGER, trigger => {
            void runLevel(trigger.name);
        });

        mario.pos.set(0, 0);
        level.entities.add(mario);
        level.entities.add(createPlayerEnv(mario));
        addDashboardAndCollisionLayers(level, font);

        const statusScene = createTwoSecondPlayerStatusScene(level, font);
        sceneRunner.addScene(statusScene);
        sceneRunner.addScene(level);
        sceneRunner.runNext();
        // See: Animation and scene flow
    }

    const gameContext = {
        audioContext,
        videoContext,
        entityFactory,
        deltaTime: 0,
    };

    const timer = new Timer(1 / 60);
    timer.update = deltaTime => {
        gameContext.deltaTime = deltaTime;
        sceneRunner.update(gameContext); // Updates and draws the current scene.
    };
    timer.start();
    // See: Animation and scene flow

    await runLevel('1-1', true);
}

// Timer's internal fixed-step game loop, simplified from Timer.ts.
function animationFrame(currentTime: number) {
    accumulatedTime += (currentTime - lastTime) / 1000;
    accumulatedTime = Math.min(accumulatedTime, 1);

    while (accumulatedTime > 1 / 60) {
        timer.update(1 / 60); // Calls sceneRunner.update(gameContext).
        accumulatedTime -= 1 / 60;
    }

    lastTime = currentTime;
    requestAnimationFrame(animationFrame);
    // See: Animation and scene flow
}

void bootstrap();
```

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

### Animation and scene flow

The main loop uses `requestAnimationFrame` for browser scheduling but advances
the simulation in fixed `1/60`-second steps. Elapsed browser time is accumulated
and may produce multiple simulation steps when a frame is late. On every fixed
step, `SceneRunner` updates and then draws its current scene.

Scenes are stored in insertion order. Initial level startup moves through three
of them:

1. A loading scene draws a black background and the loading bar while assets
   are pending.
2. A two-second timed scene draws the dashboard and player status.
3. The `Level` scene runs the game world.

When a scene completes, the runner pauses it and advances to the next scene.
During a level update, entities update their traits, entity collisions are
checked, entity state is finalized, and the camera follows the player. The
level's compositor then draws its ordered render layers into the same canvas.
