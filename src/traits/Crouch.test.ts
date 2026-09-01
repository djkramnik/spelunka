import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Crouch, {
    SPELUNKY_CRAWL_SPEED,
    SPELUNKY_CROUCH_HEIGHT,
    SPELUNKY_CROUCH_TRANSITION_TIME,
    SPELUNKY_LEDGE_FLIP_TIME,
    SPELUNKY_LEDGE_FLIP_SETTLE_TIME,
    SPELUNKY_STANDING_HEIGHT,
} from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LedgeHang, {
    SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
} from './LedgeHang.js';
import Physics from './Physics.js';
import Solid from './Solid.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const DELTA_TIME = 1 / 60;
const context = {
    deltaTime: DELTA_TIME,
    performanceMetrics: {recordTileCandidates: (): void => {}},
} as unknown as GameContext;

interface Fixture {
    entity: Entity;
    physics: Physics;
    go: Go;
    jump: Jump;
    carrier: Carrier;
    killable: Killable;
    crouch: Crouch;
    ledge: LedgeHang;
}

function createFixture(): Fixture {
    const entity = new Entity();
    const physics = new Physics();
    const crouch = new Crouch();
    const go = new Go();
    const jump = new Jump();
    const killable = new Killable();
    const carrier = new Carrier();
    const ledge = new LedgeHang();
    entity.size.set(14, SPELUNKY_STANDING_HEIGHT);
    entity.pos.set(48, 48);
    physics.grounded = true;
    jump.phase = 'grounded';
    jump.ready = 1;
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    entity.addTrait(crouch);
    entity.addTrait(go);
    entity.addTrait(jump);
    entity.addTrait(killable);
    entity.addTrait(carrier);
    entity.addTrait(ledge);
    return {entity, physics, go, jump, carrier, killable, crouch, ledge};
}

function createLevel(): {level: Level; tiles: Matrix<CollisionTile>} {
    const level = new Level();
    const tiles = new Matrix<CollisionTile>();
    level.tileCollider.addGrid(tiles);
    return {level, tiles};
}

function advanceCrouch(
    fixture: Fixture,
    level: Level,
    duration: number,
): void {
    const frames = Math.ceil(duration / DELTA_TIME);
    for (let frame = 0; frame < frames; frame++) {
        fixture.crouch.update(fixture.entity, context, level);
    }
}

const stationary = createFixture();
const stationaryLevel = createLevel().level;
const standingBottom = stationary.entity.bounds.bottom;
stationary.crouch.setDown(true);
stationary.crouch.update(stationary.entity, context, stationaryLevel);
assertEqual(
    [stationary.crouch.phase, stationary.entity.size.y, stationary.entity.bounds.bottom, stationary.go.enabled],
    ['entering', SPELUNKY_CROUCH_HEIGHT, standingBottom, false],
    'Down enters crouch while preserving the grounded bottom edge',
);
advanceCrouch(stationary, stationaryLevel, SPELUNKY_CROUCH_TRANSITION_TIME);
assertEqual(stationary.crouch.phase, 'crouched', 'HD crouch-in timing reaches its held pose');
stationary.crouch.setDown(false);
stationary.crouch.update(stationary.entity, context, stationaryLevel);
assertEqual(
    [stationary.crouch.phase, stationary.entity.size.y, stationary.entity.bounds.bottom, stationary.go.enabled],
    ['exiting', SPELUNKY_STANDING_HEIGHT, standingBottom, true],
    'Releasing Down restores the standing collider before crouch-out',
);
advanceCrouch(stationary, stationaryLevel, SPELUNKY_CROUCH_TRANSITION_TIME);
assertEqual(stationary.crouch.phase, 'standing', 'HD crouch-out timing returns to standing');

const blocked = createFixture();
const blockedLevel = createLevel();
blocked.entity.bounds.bottom = 75;
blockedLevel.tiles.set(3, 3, {type: 'ground'});
blocked.crouch.setDown(true);
blocked.crouch.update(blocked.entity, context, blockedLevel.level);
blocked.crouch.setDown(false);
blocked.crouch.update(blocked.entity, context, blockedLevel.level);
assertEqual(
    [blocked.crouch.phase, blocked.entity.size.y],
    ['entering', SPELUNKY_CROUCH_HEIGHT],
    'Blocked headroom keeps the short collider active',
);
blockedLevel.tiles.delete(3, 3);
blocked.crouch.update(blocked.entity, context, blockedLevel.level);
assertEqual(
    [blocked.crouch.phase, blocked.entity.size.y],
    ['exiting', SPELUNKY_STANDING_HEIGHT],
    'Cleared headroom permits standing on the next update',
);

const crawling = createFixture();
const crawlingLevel = createLevel().level;
crawling.crouch.setDown(true);
crawling.go.dir = -1;
crawling.crouch.update(crawling.entity, context, crawlingLevel);
for (let frame = 0; frame < 10; frame++) {
    crawling.crouch.update(crawling.entity, context, crawlingLevel);
}
assertEqual(
    [crawling.entity.vel.x, crawling.go.heading, crawling.go.enabled],
    [-SPELUNKY_CRAWL_SPEED, -1, false],
    'Down plus direction approaches the explicit Classic-derived crawl speed',
);
crawling.go.dir = 0;
for (let frame = 0; frame < 10; frame++) {
    crawling.crouch.update(crawling.entity, context, crawlingLevel);
}
assertEqual(crawling.entity.vel.x, 0, 'Stationary crouch brakes crawl motion');

const carrying = createFixture();
carrying.carrier.carried = new Entity();
carrying.crouch.setDown(true);
carrying.crouch.update(carrying.entity, context, createLevel().level);
assertEqual(carrying.crouch.phase, 'standing', 'Carrying blocks unsupported crouch artwork');

const jumping = createFixture();
jumping.crouch.setDown(true);
jumping.crouch.update(jumping.entity, context, createLevel().level);
jumping.jump.start();
jumping.crouch.update(jumping.entity, context, createLevel().level);
assertEqual(
    [jumping.crouch.phase, jumping.entity.size.y, jumping.jump.requestTime > 0],
    ['exiting', SPELUNKY_STANDING_HEIGHT, true],
    'Jump from crouch restores standing clearance before shared jump launch',
);

const blockedJump = createFixture();
const blockedJumpLevel = createLevel();
blockedJump.entity.bounds.bottom = 75;
blockedJumpLevel.tiles.set(3, 3, {type: 'ground'});
blockedJump.crouch.setDown(true);
blockedJump.crouch.update(blockedJump.entity, context, blockedJumpLevel.level);
blockedJump.jump.start();
blockedJump.crouch.update(blockedJump.entity, context, blockedJumpLevel.level);
assertEqual(
    [blockedJump.crouch.phase, blockedJump.entity.size.y, blockedJump.jump.requestTime],
    ['entering', SPELUNKY_CROUCH_HEIGHT, 0],
    'A crouched jump below a ceiling is consumed instead of expanding into it',
);

for (const reason of ['airborne', 'dead'] as const) {
    const interrupted = createFixture();
    interrupted.crouch.setDown(true);
    interrupted.crouch.update(interrupted.entity, context, createLevel().level);
    if (reason === 'airborne') {
        interrupted.physics.grounded = false;
    } else {
        interrupted.killable.dead = true;
        interrupted.crouch.setDown(false);
    }
    interrupted.crouch.update(interrupted.entity, context, createLevel().level);
    assertEqual(
        [interrupted.crouch.phase, interrupted.entity.size.y, interrupted.go.enabled],
        ['exiting', SPELUNKY_STANDING_HEIGHT, true],
        `${reason} interruption restores ordinary movement and standing clearance`,
    );
}

function prepareFlip(direction: -1 | 1): {
    fixture: Fixture;
    level: Level;
    tiles: Matrix<CollisionTile>;
} {
    const fixture = createFixture();
    const {level, tiles} = createLevel();
    tiles.set(direction > 0 ? 3 : 4, 4, {type: 'ground'});
    fixture.entity.bounds.bottom = 64;
    fixture.entity.pos.x = direction > 0 ? 56.25 : 57.75;
    fixture.crouch.setDown(true);
    fixture.crouch.update(fixture.entity, context, level);
    fixture.crouch.phase = 'crouched';
    fixture.go.dir = direction;
    fixture.entity.vel.x = direction * SPELUNKY_CRAWL_SPEED;
    fixture.crouch.update(fixture.entity, context, level);
    return {fixture, level, tiles};
}

for (const direction of [-1, 1] as const) {
    const {fixture, level} = prepareFlip(direction);
    assertEqual(
        [fixture.crouch.phase, fixture.physics.enabled, fixture.entity.vel.x, fixture.entity.vel.y],
        ['flipping', false, 0, 0],
        `${direction < 0 ? 'Left' : 'Right'} exposed edge starts a frozen top flip`,
    );
    advanceCrouch(fixture, level, SPELUNKY_LEDGE_FLIP_TIME);
    assertEqual(
        [
            fixture.crouch.phase,
            fixture.entity.size.y,
            fixture.ledge.phase,
            fixture.ledge.side,
            fixture.ledge.enteredFromTop,
            fixture.physics.enabled,
            fixture.entity.bounds.top,
            fixture.crouch.transitionOffset.x,
            fixture.crouch.transitionOffset.y,
        ],
        [
            'standing',
            SPELUNKY_STANDING_HEIGHT,
            'hanging',
            -direction,
            true,
            false,
            64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
            -direction * 7.75,
            -8,
        ],
        `${direction < 0 ? 'Left' : 'Right'} flip hands off to mirrored ledge hanging`,
    );
    const initialOffset = Math.abs(fixture.crouch.transitionOffset.x);
    fixture.crouch.update(fixture.entity, context, level);
    if (!fixture.crouch.transitionAnchorActive
        || Math.abs(fixture.crouch.transitionOffset.x) >= initialOffset) {
        throw new Error('Top-flip correction must begin its accelerated settle');
    }
    advanceCrouch(
        fixture,
        level,
        SPELUNKY_LEDGE_FLIP_SETTLE_TIME - DELTA_TIME,
    );
    assertEqual(
        [
            fixture.crouch.transitionAnchorActive,
            fixture.crouch.transitionOffset.x,
            fixture.crouch.transitionOffset.y,
        ],
        [false, 0, 0],
        'Four HD ticks restore the original authoritative hanging position',
    );
}

const blockedEdge = createFixture();
const blockedEdgeLevel = createLevel();
blockedEdgeLevel.tiles.set(3, 4, {type: 'ground'});
blockedEdgeLevel.tiles.set(4, 4, {type: 'ground'});
blockedEdge.entity.bounds.bottom = 64;
blockedEdge.entity.pos.x = 56.25;
blockedEdge.crouch.setDown(true);
blockedEdge.crouch.update(blockedEdge.entity, context, blockedEdgeLevel.level);
blockedEdge.crouch.phase = 'crouched';
blockedEdge.go.dir = 1;
blockedEdge.crouch.update(blockedEdge.entity, context, blockedEdgeLevel.level);
assertEqual(blockedEdge.crouch.phase, 'crouched', 'A supported next tile does not start a ledge flip');

const removedEdge = prepareFlip(1);
removedEdge.tiles.delete(3, 4);
advanceCrouch(removedEdge.fixture, removedEdge.level, SPELUNKY_LEDGE_FLIP_TIME);
assertEqual(
    [removedEdge.fixture.ledge.phase, removedEdge.fixture.physics.enabled],
    ['airborne', true],
    'Support removed during the flip releases into ordinary falling',
);

console.log('Spelunky crouch, crawl, clearance, and crawl-to-hang transitions passed');
