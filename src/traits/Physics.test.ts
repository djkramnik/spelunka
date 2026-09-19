import Entity from '../Entity.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
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

const gameContext = {
    deltaTime: 1 / 60,
    entityFactory: {},
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

function createSolidEntity(x: number, y: number): {
    entity: Entity;
    physics: Physics;
} {
    const entity = new Entity();
    entity.pos.set(x, y);
    entity.size.set(14, 16);
    const physics = new Physics();
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    return {entity, physics};
}

const verticalLevel = new Level();
verticalLevel.gravity = 0;
const floor = new Matrix<CollisionTile>();
floor.set(4, 74, {type: 'ground'});
verticalLevel.tileCollider.addGrid(floor);

const fastFall = createSolidEntity(64, 1144);
fastFall.entity.vel.y = 2400;
fastFall.physics.update(fastFall.entity, gameContext, verticalLevel);
assertEqual(
    [fastFall.entity.pos.y, fastFall.entity.vel.y],
    [1168, 0],
    'Fast fall lands on the first crossed floor tile',
);

const horizontalLevel = new Level();
horizontalLevel.gravity = 0;
const wall = new Matrix<CollisionTile>();
wall.set(5, 4, {type: 'ground'});
horizontalLevel.tileCollider.addGrid(wall);

const fastRun = createSolidEntity(64, 64);
fastRun.entity.vel.x = 2400;
fastRun.physics.update(fastRun.entity, gameContext, horizontalLevel);
assertEqual(
    [fastRun.entity.pos.x, fastRun.entity.vel.x],
    [66, 0],
    'Fast horizontal movement stops at the first crossed wall tile',
);

const edgeLevel = new Level();
edgeLevel.gravity = 900;
const ledge = new Matrix<CollisionTile>();
ledge.set(4, 4, {type: 'ground'});
edgeLevel.tileCollider.addGrid(ledge);

const insetSupported = createSolidEntity(75, 48);
insetSupported.physics.grounded = true;
insetSupported.physics.groundSupportWidth = 10;
insetSupported.physics.update(insetSupported.entity, gameContext, edgeLevel);
assertEqual(
    [insetSupported.entity.pos.y, insetSupported.entity.vel.y, insetSupported.physics.grounded],
    [48, 0, true],
    'Inset foot probe remains grounded until only the edge margin is supported',
);

const walkedOff = createSolidEntity(76, 48);
walkedOff.physics.grounded = true;
walkedOff.physics.groundSupportWidth = 10;
walkedOff.entity.vel.x = 120;
walkedOff.physics.update(walkedOff.entity, gameContext, edgeLevel);
assertEqual(
    [walkedOff.entity.pos.x, walkedOff.entity.pos.y, walkedOff.entity.vel.y, walkedOff.physics.grounded],
    [78, 48.25, 15, false],
    'Player falls two pixels before the full collider clears the ledge',
);
walkedOff.entity.vel.x = 0;
walkedOff.physics.update(walkedOff.entity, gameContext, edgeLevel);
assertEqual(
    [walkedOff.entity.pos.x, walkedOff.entity.pos.y, walkedOff.entity.vel.y, walkedOff.physics.grounded],
    [78, 48.5, 30, false],
    'Walk-off probe persists instead of snapping the player back onto the ledge',
);

const platformLevel = new Level();
platformLevel.gravity = 900;
const platformLedge = new Matrix<CollisionTile>();
platformLedge.set(4, 4, {type: 'platform'});
platformLevel.tileCollider.addGrid(platformLedge);

const walkedOffPlatform = createSolidEntity(76, 48);
walkedOffPlatform.physics.grounded = true;
walkedOffPlatform.physics.groundSupportWidth = 10;
walkedOffPlatform.entity.vel.x = 120;
walkedOffPlatform.physics.update(
    walkedOffPlatform.entity,
    gameContext,
    platformLevel,
);
assertEqual(
    [walkedOffPlatform.entity.pos.y, walkedOffPlatform.physics.grounded],
    [48.25, false],
    'Inset foot support also releases slightly early at a one-way platform edge',
);

const forgivingLanding = createSolidEntity(74, 47.8);
forgivingLanding.physics.groundSupportWidth = 10;
forgivingLanding.entity.vel.y = 15;
forgivingLanding.physics.update(forgivingLanding.entity, gameContext, edgeLevel);
assertEqual(
    [forgivingLanding.entity.pos.y, forgivingLanding.entity.vel.y, forgivingLanding.physics.grounded],
    [48, 0, true],
    'Airborne landing continues to use the full-width collision probe',
);

const adjacentFall = createSolidEntity(50, 61);
adjacentFall.entity.vel.y = 60;
adjacentFall.physics.update(adjacentFall.entity, gameContext, edgeLevel);
assertEqual(
    [
        adjacentFall.entity.pos.y,
        adjacentFall.entity.vel.y,
        adjacentFall.physics.grounded,
    ],
    [62, 75, false],
    'Exact side contact with a cliff is not misclassified as floor support',
);

const overlappingFall = createSolidEntity(50.001, 61);
overlappingFall.entity.vel.y = 60;
overlappingFall.physics.update(overlappingFall.entity, gameContext, edgeLevel);
assertEqual(
    [
        overlappingFall.entity.pos.y,
        overlappingFall.entity.vel.y,
        overlappingFall.physics.grounded,
    ],
    [48, 0, true],
    'A real horizontal overlap still lands on the floor tile',
);

const adjacentRun = createSolidEntity(50, 48);
adjacentRun.entity.vel.x = 60;
adjacentRun.physics.update(adjacentRun.entity, gameContext, edgeLevel);
assertEqual(
    [adjacentRun.entity.pos.x, adjacentRun.entity.vel.x],
    [51, 60],
    'Exact top contact with a floor does not become a side obstruction',
);

const shoulderLevel = new Level();
shoulderLevel.gravity = 0;
const shoulder = new Matrix<CollisionTile>();
shoulder.set(2, 5, {type: 'ground'});
shoulderLevel.tileCollider.addGrid(shoulder);

const insetShoulderJump = createSolidEntity(46, 96);
insetShoulderJump.physics.verticalCollisionWidth = 10;
insetShoulderJump.entity.vel.y = -60;
insetShoulderJump.physics.update(
    insetShoulderJump.entity,
    gameContext,
    shoulderLevel,
);
assertEqual(
    [insetShoulderJump.entity.pos.y, insetShoulderJump.entity.vel.y],
    [95, -60],
    'Centered ceiling probe clears the two-pixel walk-off shoulder overlap',
);

const fullWidthCeiling = createSolidEntity(46, 96);
fullWidthCeiling.entity.vel.y = -60;
fullWidthCeiling.physics.update(fullWidthCeiling.entity, gameContext, shoulderLevel);
assertEqual(
    [fullWidthCeiling.entity.pos.y, fullWidthCeiling.entity.vel.y],
    [96, 0],
    'Entities without a ceiling inset retain full-width obstruction',
);

const insetShoulderFall = createSolidEntity(46, 64);
insetShoulderFall.physics.verticalCollisionWidth = 10;
insetShoulderFall.entity.vel.y = 60;
insetShoulderFall.physics.update(
    insetShoulderFall.entity,
    gameContext,
    shoulderLevel,
);
assertEqual(
    [insetShoulderFall.entity.pos.y, insetShoulderFall.entity.vel.y],
    [65, 60],
    'Centered vertical probe does not land on a two-pixel side overlap',
);

const fullWidthShoulderFall = createSolidEntity(46, 64);
fullWidthShoulderFall.entity.vel.y = 60;
fullWidthShoulderFall.physics.update(
    fullWidthShoulderFall.entity,
    gameContext,
    shoulderLevel,
);
assertEqual(
    [fullWidthShoulderFall.entity.pos.y, fullWidthShoulderFall.entity.vel.y],
    [64, 0],
    'Entities without a vertical inset retain full-width landing',
);

console.log('Physics collision regressions passed');
