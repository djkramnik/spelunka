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

console.log('Physics tile tunneling regression passed');
