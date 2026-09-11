import Entity from '../Entity.js';
import {createSnakeFactory} from '../entities/Snake.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import Player from './Player.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';
import Whip, {
    SPELUNKY_WHIP_ACTIVE_TIME,
    SPELUNKY_WHIP_DURATION,
    SPELUNKY_WHIP_REACH,
    SPELUNKY_WHIP_RECOVERY_TIME,
    SPELUNKY_WHIP_STARTUP_TIME,
} from './Whip.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

interface Fixture {
    readonly player: Entity;
    readonly level: Level;
    readonly go: Go;
    readonly carrier: Carrier;
    readonly crouch: Crouch;
    readonly whip: Whip;
}

function createFixture(): Fixture {
    const player = new Entity();
    player.pos.set(100, 100);
    player.size.set(14, 16);
    const go = new Go();
    const carrier = new Carrier();
    const crouch = new Crouch();
    const whip = new Whip();
    player.addTrait(carrier);
    player.addTrait(crouch);
    player.addTrait(go);
    player.addTrait(new Killable());
    player.addTrait(new LadderClimb());
    player.addTrait(new LedgeHang());
    player.addTrait(new PlayerDeath());
    player.addTrait(new PlayerHit());
    player.addTrait(whip);
    const level = new Level();
    level.entities.add(player);
    return {player, level, go, carrier, crouch, whip};
}

function addTarget(
    level: Level,
    left: number,
    top = 100,
    width = 8,
    height = 16,
): {entity: Entity; killable: Killable; kills: () => number} {
    const entity = new Entity();
    entity.pos.set(left, top);
    entity.size.set(width, height);
    const killable = new Killable();
    let killCount = 0;
    killable.kill = (): void => {
        killCount++;
    };
    entity.addTrait(killable);
    level.entities.add(entity);
    return {entity, killable, kills: () => killCount};
}

function update(
    fixture: Fixture,
    deltaTime: number,
): void {
    fixture.whip.update(
        fixture.player,
        {deltaTime} as GameContext,
        fixture.level,
    );
}

const timing = createFixture();
const timedTarget = addTarget(timing.level, timing.player.bounds.right);
assertEqual(timing.whip.start(timing.player), true, 'An eligible player starts a whip');
assertEqual(
    [timing.whip.phase, timing.whip.time],
    ['startup', 0],
    'Whip begins at the first startup frame',
);
assertEqual(
    timing.player.sounds.has('whip'),
    true,
    'The HD whip sound begins with the wind-up',
);
timing.player.sounds.clear();
assertEqual(
    timing.whip.start(timing.player),
    false,
    'Startup rejects repeated input instead of restarting',
);
assertEqual(timing.whip.time, 0, 'Rejected startup retrigger preserves elapsed time');
update(timing, SPELUNKY_WHIP_STARTUP_TIME);
assertEqual(
    [timing.whip.phase, timedTarget.kills()],
    ['active', 0],
    'The exact startup boundary has not applied an early hit',
);
update(timing, 1 / 60);
assertEqual(
    [timing.whip.phase, timedTarget.kills(), timing.player.sounds.has('whip')],
    ['active', 1, false],
    'The active window applies one hit without replaying the HD whip sound',
);
update(timing, SPELUNKY_WHIP_ACTIVE_TIME);
assertEqual(
    [timing.whip.phase, timedTarget.kills()],
    ['recovery', 1],
    'The target is hit only once before recovery begins',
);
const recoveryTime = timing.whip.time;
assertEqual(
    timing.whip.start(timing.player),
    false,
    'Recovery rejects repeated input instead of restarting',
);
assertEqual(timing.whip.time, recoveryTime, 'Rejected retrigger preserves recovery timing');
update(timing, SPELUNKY_WHIP_RECOVERY_TIME);
assertEqual(
    [timing.whip.phase, timing.whip.time],
    ['inactive', SPELUNKY_WHIP_DURATION],
    'Explicit recovery completes the full whip action',
);
assertEqual(timing.whip.start(timing.player), true, 'A completed whip can retrigger');

for (const direction of [-1, 1] as const) {
    const fixture = createFixture();
    fixture.go.heading = direction;
    const nearLeft = direction > 0
        ? fixture.player.bounds.right
        : fixture.player.bounds.left - SPELUNKY_WHIP_REACH;
    const near = addTarget(fixture.level, nearLeft);
    const wrongSide = addTarget(
        fixture.level,
        direction > 0
            ? fixture.player.bounds.left - 8
            : fixture.player.bounds.right,
    );
    const outOfRange = addTarget(
        fixture.level,
        direction > 0
            ? fixture.player.bounds.right + SPELUNKY_WHIP_REACH
            : fixture.player.bounds.left - SPELUNKY_WHIP_REACH - 8,
    );
    fixture.whip.start(fixture.player);
    update(fixture, SPELUNKY_WHIP_STARTUP_TIME + 1 / 60);
    assertEqual(
        [fixture.whip.direction, near.kills(), wrongSide.kills(), outOfRange.kills()],
        [direction, 1, 0, 0],
        `${direction < 0 ? 'Left' : 'Right'} whip uses only its facing range`,
    );
}

const verticalRange = createFixture();
const below = addTarget(
    verticalRange.level,
    verticalRange.player.bounds.right,
    verticalRange.player.bounds.bottom,
);
verticalRange.whip.start(verticalRange.player);
update(verticalRange, SPELUNKY_WHIP_STARTUP_TIME + 1 / 60);
assertEqual(below.kills(), 0, 'Whip does not hit a target outside its vertical span');

const movement = createFixture();
movement.player.vel.set(90, -120);
assertEqual(movement.whip.start(movement.player), true, 'Airborne movement permits whipping');
update(movement, SPELUNKY_WHIP_STARTUP_TIME + 1 / 60);
assertEqual(
    [movement.player.vel.x, movement.player.vel.y],
    [90, -120],
    'Whipping leaves horizontal movement and jumping physics unchanged',
);

const blocked = createFixture();
blocked.carrier.carried = new Entity();
assertEqual(blocked.whip.start(blocked.player), false, 'Carrying reserves D for item use');
blocked.carrier.carried = null;
blocked.crouch.phase = 'crouched';
assertEqual(blocked.whip.start(blocked.player), false, 'Crouching reserves Down plus D for pickup');

const playerTarget = createFixture();
const otherPlayerTarget = addTarget(
    playerTarget.level,
    playerTarget.player.bounds.right,
);
const otherPlayer = otherPlayerTarget.entity;
otherPlayer.addTrait(new Player());
playerTarget.whip.start(playerTarget.player);
update(playerTarget, SPELUNKY_WHIP_STARTUP_TIME + 1 / 60);
assertEqual(
    otherPlayerTarget.kills(),
    0,
    'Whip excludes player entities from eligible enemy targets',
);

const snakeFixture = createFixture();
const snakeSprite = {
    getAnimation: (): ((time: number) => string) => () => 'frame',
    drawFrame: (): void => {},
} as unknown as SpriteSheet;
const snake = createSnakeFactory(snakeSprite)();
snake.pos.set(snakeFixture.player.bounds.right, snakeFixture.player.bounds.top);
snakeFixture.level.entities.add(snake);
snakeFixture.whip.start(snakeFixture.player);
update(snakeFixture, SPELUNKY_WHIP_STARTUP_TIME + 1 / 60);
snake.finalize();
assertEqual(
    snake.traits.get(Killable).dead,
    true,
    'Whip kills a snake through its shared Killable death path',
);

console.log('Spelunky whip timing, range, and enemy interaction passed');
