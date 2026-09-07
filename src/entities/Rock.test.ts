import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import {makePlayer} from '../player.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Go from '../traits/Go.js';
import Health from '../traits/Health.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import PlayerHit from '../traits/PlayerHit.js';
import Solid from '../traits/Solid.js';
import {
    createRockFactory,
    ROCK_CEILING_REBOUND,
    ROCK_ENEMY_DANGER_SPEED,
    ROCK_FLOOR_FRICTION,
    ROCK_FLOOR_REBOUND,
    ROCK_GRAVITY,
    ROCK_HORIZONTAL_SETTLE_SPEED,
    ROCK_PLAYER_DAMAGE,
    ROCK_PLAYER_DANGER_SPEED,
    ROCK_PLAYER_UPWARD_SPEED,
    ROCK_TERMINAL_VELOCITY,
    ROCK_THROW_LIFT,
    ROCK_THROW_SPEED,
    ROCK_THROWER_GRACE_UPDATES,
    ROCK_UPWARD_THROW_LIFT,
    ROCK_UPWARD_THROW_SPEED,
    ROCK_VERTICAL_SETTLE_SPEED,
    ROCK_WALL_REBOUND,
    ROCK_Z_INDEX,
    RockBehavior,
} from './Rock.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const draws: Array<[string, number, number]> = [];
const sprite = {
    drawFrame: (name: string, _context: unknown, x: number, y: number): void => {
        draws.push([name, x, y]);
    },
} as unknown as SpriteSheet;
const createRock = createRockFactory(sprite);
const rock = createRock();
const pickable = rock.traits.get(Pickable);
const solid = rock.traits.get(Solid);

assertEqual([rock.size.x, rock.size.y], [8, 8], 'Rock uses Classic-sized bounds');
assertEqual([rock.offset.x, rock.offset.y], [0, 0], 'Rock bounds need no offset');
assertEqual(
    rock.zIndex,
    ROCK_Z_INDEX,
    'Loose rock renders consistently in front of an overlapping player',
);
assertEqual(rock.traits.has(Physics), true, 'Rock has free-item physics');
assertEqual(rock.traits.has(RockBehavior), true, 'Rock has projectile behavior');
assertEqual(
    [
        pickable.carryOffset.x,
        pickable.carryOffset.y,
        pickable.alignCarryCenters,
        pickable.throwVelocity.x,
        pickable.throwVelocity.y,
        pickable.upwardThrowVelocity.x,
        pickable.upwardThrowVelocity.y,
        pickable.throwerGraceUpdates,
        pickable.clearThrowerProtectionOnDirectionChange,
    ],
    [
        4,
        6,
        true,
        ROCK_THROW_SPEED,
        ROCK_THROW_LIFT,
        ROCK_UPWARD_THROW_SPEED,
        ROCK_UPWARD_THROW_LIFT,
        ROCK_THROWER_GRACE_UPDATES,
        false,
    ],
    'Rock configures its carry, launch, and thrower-protection tuning',
);
assertEqual(
    [
        solid.wallRebound,
        solid.floorRebound,
        solid.ceilingRebound,
        solid.floorFriction,
        solid.horizontalSettleSpeed,
        solid.verticalSettleSpeed,
    ],
    [
        ROCK_WALL_REBOUND,
        ROCK_FLOOR_REBOUND,
        ROCK_CEILING_REBOUND,
        ROCK_FLOOR_FRICTION,
        ROCK_HORIZONTAL_SETTLE_SPEED,
        ROCK_VERTICAL_SETTLE_SPEED,
    ],
    'Rock keeps the useful Classic rebound and settling baseline',
);
rock.draw({} as CanvasRenderingContext2D);
assertEqual(draws, [['idle', 4, 4]], 'Rock art anchors at its collider center');

const carryRock = createRock();
const carryPlayer = new Entity();
carryPlayer.size.set(14, 16);
carryPlayer.pos.set(100, 50);
const carryPickable = carryRock.traits.get(Pickable);
carryPickable.attach(carryRock, carryPlayer, 1);
assertEqual(
    [carryRock.pos.x, carryRock.pos.y],
    [107, 56],
    'Right-facing rock sits four pixels right of the player centre',
);
carryPickable.followCarrier(carryRock, -1);
assertEqual(
    [carryRock.pos.x, carryRock.pos.y],
    [99, 56],
    'Left-facing rock sits four pixels left of the player centre',
);
assertEqual(
    [
        carryRock.pos.x + carryRock.size.x / 2,
        carryPlayer.pos.x + carryPlayer.size.x / 2,
    ],
    [103, 107],
    'Left-facing carry spacing is measured from entity centres, not left edges',
);

function throwRock(
    direction: -1 | 1,
    carrierSpeed: number,
    upward = false,
): Entity {
    const thrown = createRock();
    const carrier = new Entity();
    const movement = new Go();
    movement.heading = direction;
    carrier.addTrait(movement);
    carrier.vel.x = carrierSpeed;
    const thrownPickable = thrown.traits.get(Pickable);
    assertEqual(
        thrownPickable.attach(thrown, carrier, direction),
        true,
        'Rock attaches before its direction test',
    );
    assertEqual(
        thrownPickable.release(
            thrown,
            carrier,
            direction,
            upward ? 'upward' : 'forward',
        ),
        true,
        'Rock releases for its direction test',
    );
    assertEqual(
        carrier.sounds.has('throw-item'),
        true,
        'Releasing a rock queues the HD throw sound on its carrier',
    );
    return thrown;
}

const rightThrow = throwRock(1, 30);
assertEqual(
    [rightThrow.vel.x, rightThrow.vel.y],
    [30 + ROCK_THROW_SPEED, ROCK_THROW_LIFT],
    'Right throw inherits forward carrier momentum',
);
const leftThrow = throwRock(-1, -30);
assertEqual(
    [leftThrow.vel.x, leftThrow.vel.y],
    [-30 - ROCK_THROW_SPEED, ROCK_THROW_LIFT],
    'Left throw inherits forward carrier momentum',
);
const upwardThrow = throwRock(1, 30, true);
assertEqual(
    [upwardThrow.vel.x, upwardThrow.vel.y],
    [30 + ROCK_UPWARD_THROW_SPEED, ROCK_UPWARD_THROW_LIFT],
    'Up throw retains momentum with slightly less forward speed and much more lift',
);

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {recordTileCandidates: (): void => {}},
} as unknown as GameContext;
const flightLevel = new Level();

function horizontalDistanceUntilReturn(thrown: Entity): number {
    const startX = thrown.pos.x;
    const startY = thrown.pos.y;
    for (let update = 0; update < 180; update++) {
        thrown.update(gameContext, flightLevel);
        if (thrown.vel.y > 0 && thrown.pos.y >= startY) {
            return thrown.pos.x - startX;
        }
    }
    throw new Error('Rock did not descend to its launch height');
}

const normalArcRock = createRock();
normalArcRock.vel.set(ROCK_THROW_SPEED, ROCK_THROW_LIFT);
const upwardArcRock = createRock();
upwardArcRock.vel.set(ROCK_UPWARD_THROW_SPEED, ROCK_UPWARD_THROW_LIFT);
assertEqual(
    horizontalDistanceUntilReturn(upwardArcRock)
        > horizontalDistanceUntilReturn(normalArcRock),
    true,
    'Up throw travels farther before descending to launch height despite reduced forward speed',
);

const flyingRock = createRock();
flyingRock.pos.set(40, 80);
flyingRock.vel.set(120, ROCK_THROW_LIFT);
flyingRock.update(gameContext, flightLevel);
assertEqual(
    [flyingRock.pos.x, flyingRock.pos.y, flyingRock.vel.x, flyingRock.vel.y],
    [42, 78.5, 120, ROCK_THROW_LIFT + ROCK_GRAVITY / 60],
    'Airborne rock uses its item gravity independently of level gravity',
);
flyingRock.vel.y = ROCK_TERMINAL_VELOCITY + 100;
flyingRock.update(gameContext, flightLevel);
assertEqual(
    flyingRock.vel.y,
    ROCK_TERMINAL_VELOCITY,
    'Rock falling speed is capped at the Classic baseline',
);

function createCollisionLevel(tileX: number, tileY: number): Level {
    const level = new Level();
    level.gravity = 0;
    const tiles = new Matrix<CollisionTile>();
    tiles.set(tileX, tileY, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return level;
}

const wallRock = createRock();
wallRock.pos.set(32, 40);
wallRock.vel.set(2400, 0);
wallRock.update(gameContext, createCollisionLevel(4, 2));
assertEqual(
    [wallRock.pos.x, wallRock.bounds.right, wallRock.vel.x],
    [56, 64, -1200],
    'Swept rock motion blocks and rebounds at a wall without tunnelling',
);

const floorRock = createRock();
floorRock.pos.set(64, 32);
floorRock.vel.set(120, 2400);
floorRock.update(gameContext, createCollisionLevel(4, 4));
assertEqual(
    [floorRock.pos.y, floorRock.bounds.bottom, floorRock.vel.x, floorRock.vel.y],
    [56, 64, 36, -1191],
    'Floor impact rebounds, applies friction, and resumes rock gravity',
);

function createFloorLevel(): Level {
    const level = new Level();
    const tiles = new Matrix<CollisionTile>();
    tiles.set(4, 10, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return level;
}

const restingRock = createRock();
restingRock.pos.set(64.4, 152);
restingRock.vel.set(
    ROCK_HORIZONTAL_SETTLE_SPEED - 0.1,
    ROCK_VERTICAL_SETTLE_SPEED - 0.1,
);
restingRock.update(gameContext, createFloorLevel());
assertEqual(
    [
        restingRock.pos.x,
        restingRock.pos.y,
        restingRock.vel.x,
        restingRock.vel.y,
        restingRock.traits.get(Physics).grounded,
    ],
    [64, 152, 0, 0, true],
    'Low floor motion settles to an exact pixel-aligned grounded rest',
);

function createTarget(player = false, hearts?: number): Entity {
    const target = new Entity();
    target.addTrait(new Killable());
    if (player) {
        makePlayer(target, 'MARIO');
        target.addTrait(new Health(hearts));
        target.addTrait(new PlayerHit());
    }
    return target;
}

function hitTarget(velocityX: number, velocityY: number, target: Entity): void {
    const projectile = createRock();
    projectile.vel.set(velocityX, velocityY);
    projectile.collides(target);
    target.finalize();
    projectile.finalize();
}

const slowEnemy = createTarget();
hitTarget(ROCK_ENEMY_DANGER_SPEED, 0, slowEnemy);
assertEqual(slowEnemy.traits.get(Killable).dead, false, 'Threshold-speed rock is harmless');
const horizontalEnemy = createTarget();
hitTarget(ROCK_ENEMY_DANGER_SPEED + 1, 0, horizontalEnemy);
assertEqual(horizontalEnemy.traits.get(Killable).dead, true, 'Fast horizontal rock kills an enemy');
const verticalEnemy = createTarget();
hitTarget(0, ROCK_ENEMY_DANGER_SPEED + 1, verticalEnemy);
assertEqual(verticalEnemy.traits.get(Killable).dead, true, 'Fast falling rock kills an enemy');

const player = createTarget(true, 4);
hitTarget(ROCK_PLAYER_DANGER_SPEED + 1, 0, player);
assertEqual(
    [
        player.traits.get(Health).hearts,
        player.vel.x,
        player.vel.y,
        player.traits.get(PlayerHit).active,
        player.traits.get(Killable).dead,
    ],
    [
        4 - ROCK_PLAYER_DAMAGE,
        ROCK_PLAYER_DANGER_SPEED + 1,
        -ROCK_PLAYER_UPWARD_SPEED,
        true,
        false,
    ],
    'Fast rock damages and launches a surviving player without instant death',
);

const thrower = createTarget(true, 4);
const protectedRock = createRock();
const protectedPickable = protectedRock.traits.get(Pickable);
protectedPickable.attach(protectedRock, thrower);
protectedPickable.release(protectedRock, thrower);
protectedRock.vel.x *= -1;
protectedRock.collides(thrower);
thrower.finalize();
protectedRock.finalize();
assertEqual(
    thrower.traits.get(Health).hearts,
    4,
    'A quick rebound stays harmless for the full thrower grace window',
);
for (let update = 1; update < ROCK_THROWER_GRACE_UPDATES; update++) {
    protectedRock.finalize();
}
assertEqual(
    protectedPickable.isThrowerProtected(protectedRock, thrower),
    false,
    'Thrower grace preserves the ten-tick Classic elapsed time at 60 Hz',
);
protectedRock.collides(thrower);
thrower.finalize();
assertEqual(
    thrower.traits.get(Health).hearts,
    4 - ROCK_PLAYER_DAMAGE,
    'A returning rock can damage its thrower after grace expires',
);

console.log('Spelunky HD rock entity and throwing baseline passed');
