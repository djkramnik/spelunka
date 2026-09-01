import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import Carrier from './Carrier.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LedgeHang, {
    SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
    SPELUNKY_LEDGE_CLIMB_TIME,
    SPELUNKY_LEDGE_DROP_REGRAB_DELAY,
    SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY,
    SPELUNKY_LEDGE_REGRAB_DELAY,
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
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

interface LedgeFixture {
    entity: Entity;
    physics: Physics;
    go: Go;
    jump: Jump;
    killable: Killable;
    carrier: Carrier;
    ledge: LedgeHang;
}

function createFixture(side: -1 | 1 = 1): LedgeFixture {
    const entity = new Entity();
    const physics = new Physics();
    const go = new Go();
    const jump = new Jump();
    const killable = new Killable();
    const carrier = new Carrier();
    const ledge = new LedgeHang();
    entity.size.set(14, 16);
    entity.pos.set(side > 0 ? 50 : 64, 61);
    entity.vel.set(0, 60);
    go.dir = side;
    go.heading = side;
    jump.phase = 'falling';
    jump.ready = -1;
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    entity.addTrait(go);
    entity.addTrait(jump);
    entity.addTrait(killable);
    entity.addTrait(carrier);
    entity.addTrait(ledge);
    return {entity, physics, go, jump, killable, carrier, ledge};
}

function createLevel(side: -1 | 1 = 1): {
    level: Level;
    tiles: Matrix<CollisionTile>;
} {
    const level = new Level();
    const tiles = new Matrix<CollisionTile>();
    tiles.set(side > 0 ? 4 : 3, 4, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return {level, tiles};
}

function grab(fixture: LedgeFixture, level: Level): void {
    fixture.ledge.update(fixture.entity, context, level);
}

const right = createFixture(1);
const rightLevel = createLevel(1);
grab(right, rightLevel.level);
assertEqual(
    [
        right.ledge.phase,
        right.ledge.side,
        right.entity.bounds.top,
        right.entity.bounds.right,
        right.entity.vel.x,
        right.entity.vel.y,
        right.physics.enabled,
    ],
    [
        'hanging',
        1,
        64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET,
        64,
        0,
        0,
        false,
    ],
    'Falling toward an exposed right corner enters an aligned hang',
);

const left = createFixture(-1);
const leftLevel = createLevel(-1);
grab(left, leftLevel.level);
assertEqual(
    [left.ledge.phase, left.ledge.side, left.entity.bounds.top, left.entity.bounds.left],
    ['hanging', -1, 64 + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET, 64],
    'Left corner grab mirrors geometry and facing',
);

right.entity.vel.set(200, 200);
right.go.dir = -1;
right.go.update(right.entity, context, rightLevel.level);
right.jump.update(right.entity, context, rightLevel.level);
right.ledge.update(right.entity, context, rightLevel.level);
assertEqual(
    [right.ledge.phase, right.ledge.side, right.entity.vel.x, right.entity.vel.y],
    ['hanging', 1, 0, 0],
    'Hanging freezes drift and ignores rapid facing changes',
);

const rising = createFixture();
rising.jump.phase = 'rising';
rising.entity.vel.y = -60;
grab(rising, createLevel().level);
assertEqual(rising.ledge.phase, 'airborne', 'Rising player cannot grab');

const noInput = createFixture();
noInput.go.dir = 0;
grab(noInput, createLevel().level);
assertEqual(noInput.ledge.phase, 'airborne', 'Corner grab requires input toward the wall');

const movingAway = createFixture();
movingAway.entity.vel.x = -1;
grab(movingAway, createLevel().level);
assertEqual(movingAway.ledge.phase, 'airborne', 'Moving away cannot grab the opposite corner');

const covered = createFixture();
const coveredLevel = createLevel();
coveredLevel.tiles.set(4, 3, {type: 'ground'});
grab(covered, coveredLevel.level);
assertEqual(covered.ledge.phase, 'airborne', 'Covered wall is not an exposed ledge');

const embedded = createFixture();
const embeddedLevel = createLevel();
embeddedLevel.tiles.set(3, 4, {type: 'ground'});
grab(embedded, embeddedLevel.level);
assertEqual(embedded.ledge.phase, 'airborne', 'Blocked hanging space rejects the grab');

const carrying = createFixture();
carrying.carrier.carried = new Entity();
grab(carrying, createLevel().level);
assertEqual(carrying.ledge.phase, 'airborne', 'Carrying player cannot grab a ledge');

const dead = createFixture();
dead.killable.dead = true;
grab(dead, createLevel().level);
assertEqual(dead.ledge.phase, 'airborne', 'Dead player cannot grab a ledge');

const deep = createFixture();
deep.entity.pos.y = 70;
grab(deep, createLevel().level);
assertEqual(deep.ledge.phase, 'airborne', 'Player below the corner cannot snap upward into a hang');

const missing = createFixture();
grab(missing, new Level());
assertEqual(missing.ledge.phase, 'airborne', 'Level boundary without a tile cannot be grabbed');

const dropping = createFixture();
const droppingLevel = createLevel();
grab(dropping, droppingLevel.level);
dropping.ledge.setVerticalInput(1, true);
dropping.jump.start();
dropping.ledge.update(dropping.entity, context, droppingLevel.level);
assertEqual(
    [
        dropping.ledge.phase,
        dropping.physics.enabled,
        dropping.jump.phase,
        dropping.jump.requestTime,
        dropping.ledge.cooldown,
    ],
    ['airborne', true, 'falling', 0, SPELUNKY_LEDGE_DROP_REGRAB_DELAY],
    'Classic Down+Jump input deliberately drops with a re-grab delay',
);
dropping.entity.vel.y = 60;
dropping.go.dir = 1;
grab(dropping, droppingLevel.level);
assertEqual(dropping.ledge.phase, 'airborne', 'Drop cooldown prevents immediate re-grab');

const away = createFixture();
const awayLevel = createLevel();
grab(away, awayLevel.level);
away.go.dir = -1;
away.jump.start();
away.ledge.update(away.entity, context, awayLevel.level);
assertEqual(
    [away.ledge.phase, away.entity.vel.x, away.entity.vel.y, away.jump.phase],
    ['airborne', -SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY, -away.jump.launchVelocity, 'rising'],
    'Jump plus away input launches away through the shared Jump state',
);

const upward = createFixture();
const upwardLevel = createLevel();
grab(upward, upwardLevel.level);
const hangingX = upward.entity.pos.x;
upward.jump.start();
upward.ledge.update(upward.entity, context, upwardLevel.level);
assertEqual(
    [upward.ledge.phase, upward.entity.pos.x, upward.entity.vel.y, upward.jump.phase],
    ['airborne', hangingX, -upward.jump.launchVelocity, 'rising'],
    'Straight ledge jump preserves horizontal position for stable camera tracking',
);

const climbing = createFixture();
const climbingLevel = createLevel();
grab(climbing, climbingLevel.level);
climbing.ledge.setVerticalInput(-1, true);
climbing.ledge.update(climbing.entity, context, climbingLevel.level);
assertEqual(climbing.ledge.phase, 'climbing', 'Up starts the HD ledge climb');
for (let frame = 0; frame < Math.ceil(SPELUNKY_LEDGE_CLIMB_TIME / DELTA_TIME); frame++) {
    climbing.ledge.update(climbing.entity, context, climbingLevel.level);
}
assertEqual(
    [
        climbing.ledge.phase,
        climbing.entity.bounds.top,
        climbing.entity.bounds.left,
        climbing.entity.bounds.bottom,
        climbing.physics.enabled,
        climbing.physics.grounded,
        climbing.jump.phase,
        climbing.ledge.cooldown,
    ],
    ['airborne', 48, 65, 64, true, true, 'grounded', SPELUNKY_LEDGE_REGRAB_DELAY],
    'Completed climb places the collider safely on top of the ledge',
);

const blockedClimb = createFixture();
const blockedClimbLevel = createLevel();
grab(blockedClimb, blockedClimbLevel.level);
blockedClimbLevel.tiles.set(4, 3, {type: 'ground'});
blockedClimb.ledge.setVerticalInput(-1, true);
blockedClimb.ledge.update(blockedClimb.entity, context, blockedClimbLevel.level);
assertEqual(
    blockedClimb.ledge.phase,
    'airborne',
    'A newly occupied corner invalidates the hang instead of embedding the player',
);

const removedSupport = createFixture();
const removedSupportLevel = createLevel();
grab(removedSupport, removedSupportLevel.level);
removedSupportLevel.tiles.delete(4, 4);
removedSupport.ledge.update(removedSupport.entity, context, removedSupportLevel.level);
assertEqual(
    [removedSupport.ledge.phase, removedSupport.physics.enabled],
    ['airborne', true],
    'Destroyed supporting tile releases the hang',
);

const killedWhileHanging = createFixture();
const killedLevel = createLevel();
grab(killedWhileHanging, killedLevel.level);
killedWhileHanging.killable.dead = true;
killedWhileHanging.ledge.update(killedWhileHanging.entity, context, killedLevel.level);
assertEqual(
    [killedWhileHanging.ledge.phase, killedWhileHanging.physics.enabled],
    ['airborne', true],
    'Damage or death interrupts hanging',
);

console.log('Spelunky Classic ledge-hang geometry and transitions passed');
