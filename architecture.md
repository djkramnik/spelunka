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

    createColorLayer('#000')(context);
    createTextLayer(font, 'CLICK TO START')(context);

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
    loadingProgress.draw(videoContext);

    const advanceLoadingProgress = () => {
        loadingProgress.advance();
        loadingProgress.draw(videoContext);
    };

    const entityFactory = await loadEntities(
        audioContext,
        advanceLoadingProgress,
    );
    const loadLevel = createLevelLoader(entityFactory);
    // See: Asset loading

    const sceneRunner = new SceneRunner();
    const mario = entityFactory.mario();
    makePlayer(mario, 'MARIO');

    const inputRouter = setupKeyboard(window);
    inputRouter.addReceiver(mario);
    // See: Click and keypress handlers

    async function runLevel(name: string, continuingStartup = false) {
        if (continuingStartup) {
            loadingProgress.setLabel(`Loading ${name}`);
        } else {
            loadingProgress.reset(4, `Loading ${name}`);
        }

        const loadingScene = new Scene();
        loadingScene.comp.layers.push(createColorLayer('#000'));
        loadingScene.comp.layers.push(context => {
            loadingProgress.draw(context);
        });
        sceneRunner.addScene(loadingScene);
        sceneRunner.runNext();

        const level = await loadLevel(name, () => {
            loadingProgress.advance();
        });
        // See: Asset loading

        level.events.listen(Level.EVENT_TRIGGER, (spec, _trigger, touches) => {
            if (findPlayers(touches).next().value) {
                void runLevel(spec.name);
            }
        });

        const playerProgressLayer = createPlayerProgressLayer(font, level);
        const dashboardLayer = createDashboardLayer(font, level);

        mario.pos.set(0, 0);
        level.entities.add(mario);
        level.entities.add(createPlayerEnv(mario));

        const statusScene = new TimedScene();
        statusScene.countDown = 2;
        statusScene.comp.layers.push(createColorLayer('#000'));
        statusScene.comp.layers.push(dashboardLayer);
        statusScene.comp.layers.push(playerProgressLayer);
        sceneRunner.addScene(statusScene);

        level.comp.layers.push(createCollisionLayer(level));
        level.comp.layers.push(dashboardLayer);
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
class Timer {
    update: (deltaTime: number) => void = () => {};

    private accumulatedTime = 0;
    private lastTime: number | null = null;

    constructor(private readonly fixedStep: number) {}

    start() {
        requestAnimationFrame(this.animationFrame);
    }

    private animationFrame = (currentTime: number) => {
        if (this.lastTime !== null) {
            this.accumulatedTime += (currentTime - this.lastTime) / 1000;
            this.accumulatedTime = Math.min(this.accumulatedTime, 1);

            while (this.accumulatedTime > this.fixedStep) {
                this.update(this.fixedStep);
                this.accumulatedTime -= this.fixedStep;
            }
        }

        this.lastTime = currentTime;
        requestAnimationFrame(this.animationFrame);
        // See: Animation and scene flow
    };
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

## Physics and character movement

Movement is assembled from traits rather than implemented by one physics
object. Every moving entity owns position, velocity, size, offset, and a
derived bounding box. Its traits decide how velocity changes and which form of
integration it receives.

The coordinate system has its origin at the canvas's upper-left: positive X is
right and positive Y is down. A normal physics step moves one axis at a time,
resolves tiles after each axis, and then applies gravity:

```ts
class Physics extends Trait {
    update(entity, {deltaTime}, level) {
        entity.pos.x += entity.vel.x * deltaTime;
        level.tileCollider.checkX(entity);

        entity.pos.y += entity.vel.y * deltaTime;
        level.tileCollider.checkY(entity);

        entity.vel.y += level.gravity * deltaTime;
    }
}
```

The level gravity is `1500` pixels per second squared. Mario, Goombas, and
Koopas use this `Physics` trait. Bullets instead use `Velocity`, which changes
both position coordinates without tile collision or gravity. A dead bullet's
behavior applies the separate `Gravity` trait so it begins falling after being
stomped. Cannons and invisible control/trigger entities do not move.

### Update order

Traits run in the order they were added to an entity. Mario's important order
is `Physics`, `Solid`, `Go`, `Jump`, `Killable`, then `Stomper`. Only traits
with an `update()` implementation do work during the update, giving this
effective sequence:

```ts
// One fixed 1/60-second Mario update.
Physics.update(mario);   // Move using existing velocity; resolve tiles; gravity.
Go.update(mario);        // Calculate horizontal velocity for the next step.
Jump.update(mario);      // Possibly set upward velocity for the next step.
Killable.update(mario);  // Advance death/removal state.
mario.playSounds();
```

Consequently, a newly pressed direction or jump changes velocity during the
current update but changes position on the following fixed step. Tile
obstruction is dispatched to all traits during `Physics.update()`: `Solid`
snaps the entity out of the tile, while `Jump` and `PendulumMove` can react to
the contacted side.

### Mario's horizontal movement

The keyboard changes `Go.dir`; it does not set Mario's velocity directly.
Right contributes `+1`, left contributes `-1`, and releasing a key removes its
contribution. Holding both directions therefore produces zero net direction.

```ts
if (go.dir !== 0) {
    mario.vel.x += 400 * deltaTime * go.dir;
    go.heading = go.dir;
} else {
    mario.vel.x = approach(mario.vel.x, 0, 300 * deltaTime);
}

const drag = go.dragFactor * mario.vel.x * Math.abs(mario.vel.x);
mario.vel.x -= drag;
go.distance += Math.abs(mario.vel.x) * deltaTime;
```

Acceleration is `400` pixels per second squared and release deceleration is
`300`. Quadratic drag limits speed. Holding X changes the drag factor from
`1/1000` to `1/5000`; the smaller turbo drag allows a higher speed. Accumulated
distance selects the running-animation frame, while heading selects whether
the sprite is flipped.

One detail is frame-rate dependent despite the fixed timestep: the quadratic
drag subtraction itself is not multiplied by `deltaTime`. It behaves
consistently while the simulation remains at 60 Hz, but changing the fixed
step would change Mario's acceleration curve and terminal speed.

### Mario's jump

Pressing Z gives `Jump` a 0.1-second pending request. If a bottom tile contact
marks the jump as ready before that request expires, the trait starts a
0.3-second jump and queues the jump sound. This creates input buffering: Z can
be pressed just before landing.

While Z remains held and the engagement window remains positive, every update
sets upward velocity to:

```ts
mario.vel.y = -(200 + Math.abs(mario.vel.x) * 0.3);
```

Horizontal speed therefore increases jump strength. Releasing Z clears the
engagement window, allowing gravity to shorten the jump. Hitting a ceiling
also cancels it. `Jump.falling` is based on whether the entity has recently
received bottom obstruction, rather than on the sign of vertical velocity.

### Enemy and respawn movement

Goombas and walking Koopas use `PendulumMove`. It writes a constant horizontal
velocity (initially `-30`) after physics runs, and reverses that speed when a
left or right tile obstructs the entity. Koopa behavior can disable this trait
while hiding or increase it to `300` when its shell enters the panic state.

The player has a separate, invisible controller entity. Once dead Mario has
been removed from the level, the controller revives him, moves him to its
`(64, 64)` checkpoint, and adds him back to the entity set.

### Movement finding

`Go.update()` checks the optional property `entity.jump` before changing
heading in mid-air, but Mario's jump state now lives in
`entity.traits.get(Jump)`. No code assigns `entity.jump`. The check therefore
always permits heading changes while airborne, which appears to be a leftover
from the pre-trait-property conversion.

## Collision logic

There are two independent collision systems. Tile collision is part of each
physics-enabled entity's movement update. Entity collision runs afterward as
a level-wide pass. Both systems ultimately delegate reactions to entity
traits.

### Tile collision

Each level background layer is expanded into a sparse 16-by-16-pixel tile
matrix. `TileResolver` converts world coordinates into matrix indices. After
moving along an axis, `TileCollider` searches the tiles crossed by the leading
edge of the entity's bounding box:

```ts
move entity on X
find tiles at the left or right edge, over the entity's vertical range
dispatch each typed tile's X handler

move entity on Y
find tiles at the top or bottom edge, over the entity's horizontal range
dispatch each typed tile's Y handler
```

The handler is selected by the tile's `type`:

- `ground` obstructs on all four sides.
- `brick` also obstructs. If a player hits one from below, the tile is deleted
  and a Goomba is spawned upward from it.
- `coin` is intended to award a coin and delete itself rather than obstruct.
- Tiles with no recognized type are visual only.

Obstruction calls every trait's `obstruct()` method. `Solid` resolves
penetration by placing the appropriate bounding-box edge exactly against the
tile and zeroing velocity on that axis. At the same time, `Jump` records a
floor contact or cancels on a ceiling, and `PendulumMove` reverses at a wall.

This is discrete, axis-separated collision detection rather than swept
collision detection. The 60 Hz fixed step keeps ordinary motion increments
small, but a sufficiently fast entity could pass completely through a tile
between checks.

### Entity collision

After all entities have updated, the level checks every entity against every
other entity using strict axis-aligned bounding-box overlap:

```ts
for (const subject of level.entities) {
    for (const candidate of level.entities) {
        if (subject !== candidate && subject.bounds.overlaps(candidate.bounds)) {
            subject.collides(candidate);
        }
    }
}
```

This is directional dispatch. An overlapping pair is visited in both
directions, so each entity gets an opportunity to run all of its own
`collides()` trait methods against the other. Edge contact alone is not an
overlap.

The principal reactions are:

- Mario's `Stomper` queues an upward bounce when he is moving downward faster
  than a killable entity, queues the stomp sound, and emits a scoring event.
- Goomba behavior either dies when approached from above or kills Mario on a
  non-stomp collision.
- Koopa behavior switches between walking, hiding, and fast-shell states, with
  different stomp and side-contact outcomes.
- Bullet behavior dies and begins falling when stomped, or kills Mario on
  other contact.
- Trigger behavior records touching entities. On its next update it emits the
  level transition event if the recorded set contains a player.

Collision reactions such as bounce, death, and removal are often queued
rather than applied while the pair iteration is in progress. After all entity
collision checks, `Level.update()` calls `finalize()` on each entity. That
process executes its queued one-shot tasks and clears its per-frame event
buffer, avoiding most mutation during collision traversal.

### Collision findings

Two handlers still look for properties that the current trait-based entity
model does not provide:

- The coin handler tests `entity.player` and calls
  `entity.player.addCoins()`, while player state is stored as a `Player` trait.
  As written, touching a coin does not satisfy that check, so the coin is not
  collected.
- `Stomper.collides()` calls `them.traits.get(Killable)` and then checks
  whether the result is absent. `TraitMap.get()` throws when a trait is absent,
  so Mario overlapping a non-killable entity can throw instead of simply
  ignoring it. The intended guard is likely `traits.has(Killable)` before
  `get()`.

Entity collision is also an O(n²) all-pairs pass. That is small for the current
entity count, but it is an obvious scaling constraint if later Spelunky levels
contain many enemies, particles, items, and destructible objects.

## Performance evaluation

### 2026-08-12

The performance work will use measurements that distinguish smooth rendering,
simulation cost, rendering cost, and the amount of game-world work performed.
An average FPS number alone would hide intermittent stalls and would not show
which subsystem caused them.

### What to measure

#### Frame pacing

Record the interval between consecutive `requestAnimationFrame` callbacks and
report its median, 95th percentile, 99th percentile, and maximum. Also count
frames longer than 16.67 ms and 33.33 ms. These measurements describe what the
player actually perceives better than an average FPS counter.

The target at a 60 Hz display is a frame interval near 16.67 ms with very few
intervals above one frame budget. Browser refresh rate must be recorded because
the same game may run at 60, 120, or 144 Hz.

#### Fixed-step pressure

Record how many fixed simulation steps the timer executes per animation frame,
including the number of frames requiring multiple catch-up steps. A growing
accumulator or frequent catch-up means the game cannot simulate in real time.

This project currently calls `SceneRunner.update()`, which both updates and
draws, once per fixed step. A late animation frame can therefore cause several
complete update-and-draw passes before the next browser paint. The measurements
should expose that behavior before it is changed.

#### Subsystem CPU time

Use the browser's monotonic `performance.now()` clock to record durations for:

- the complete fixed step;
- entity trait updates;
- entity-versus-entity collision checks;
- entity finalization;
- camera and remaining level work;
- complete canvas rendering.

Report distributions rather than only totals: median, 95th percentile, 99th
percentile, and maximum. Instrumentation should aggregate samples in memory
and print or display summaries occasionally; logging every frame would itself
distort the result.

#### Workload counters

Timings need the workload that produced them. Each sample should include:

- active entity count;
- entity collision candidates tested;
- actual entity overlaps found;
- tile resolver lookups or candidate tiles examined;
- render-layer count and, if useful later, sprite draw count.

For `n` entities, the current collision implementation performs `n × (n - 1)`
directional candidate checks per fixed step. Each unordered pair is therefore
tested twice. Recording the candidate count alongside collision time will show
both the quadratic growth and the cost of each test.

#### Memory and garbage collection

Long-frame outliers should be compared with browser performance profiles to
identify garbage collection. Heap size can be sampled where the browser makes
it available, but that API is not portable enough to be a required in-game
metric. DevTools allocation and memory profiles are better supporting evidence
for this part of the investigation.

### Repeatable benchmark workloads

Normal play is valuable for validation but is not repeatable enough for a fair
before-and-after comparison. We should measure two workloads:

1. A representative gameplay run of level `1-1` verifies that instrumentation
   and later refactors do not harm the real game.
2. A deterministic collision stress benchmark runs controlled entity counts,
   such as 10, 50, 100, 250, and 500 entities, for a fixed number of simulation
   steps. This will make the current O(n²) curve visible and give a spatial
   partitioning refactor a stable comparison target.

The benchmark should avoid network and asset-loading time, use known starting
positions and velocities, and require no live keyboard input. Each scenario
should warm up first, then collect multiple runs and compare medians. Browser,
build mode, viewport, display refresh rate, machine, and foreground-tab state
must remain constant and be recorded with the result.

### Proposed implementation

Add a small, opt-in performance collector rather than scattering permanent
console timers through the code. It should be disabled during normal play and
enabled explicitly, for example with a `?perf=1` URL parameter. The collector
will expose scoped timers, counters, frame/fixed-step observations, and a
serializable summary.

The first baseline should be captured from an unoptimized production build.
Only then should one focused refactor be applied at a time. The first likely
candidate is entity collision broad-phase partitioning, but the measured
subsystem data—not the O(n²) notation alone—will determine whether it is worth
doing before render-loop or allocation improvements.

Every comparison should retain correctness checks as well as timings. A faster
collision pass is not an improvement if it misses contacts, changes stomp
behavior, or makes level triggers unreliable.
