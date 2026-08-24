import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import {makePlayer} from '../player.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';
import {createRedShellFactory} from './RedShell.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const drawCalls: string[] = [];
const sprite = {
    draw: (name: string): void => {
        drawCalls.push(name);
    },
} as unknown as SpriteSheet;
const shell = createRedShellFactory(sprite)();

assertEqual([shell.size.x, shell.size.y], [16, 16], 'Red shell size');
assertEqual([shell.offset.x, shell.offset.y], [0, 8], 'Red shell bounds offset');
assertEqual(shell.traits.has(Pickable), true, 'Red shell pickup capability');
assertEqual(shell.traits.has(Physics), true, 'Red shell free-item physics');
assertEqual(shell.traits.has(Solid), true, 'Red shell solid-tile collision');

shell.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls, ['idle'], 'Red shell sprite frame');

const mario = new Entity();
mario.size.set(14, 16);
mario.pos.set(64, 208);
mario.vel.set(30, 40);
const player = makePlayer(mario, 'MARIO');
mario.addTrait(new Killable());
mario.addTrait(new Stomper());

shell.pos.set(64, 200);
shell.vel.set(0, 0);

const collisionResult = new EntityCollider(new Set([mario, shell])).check();
mario.finalize();
shell.finalize();

assertEqual(collisionResult, {candidateChecks: 1, overlaps: 2}, 'Collision result');
assertEqual([mario.pos.x, mario.pos.y], [64, 208], 'Mario position');
assertEqual([mario.vel.x, mario.vel.y], [30, 40], 'Mario velocity');
assertEqual(mario.traits.get(Killable).dead, false, 'Mario alive state');
assertEqual(player.score, 0, 'Mario score');
assertEqual([shell.pos.x, shell.pos.y], [64, 200], 'Red shell position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Red shell velocity');

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

const gravityLevel = new Level();
gravityLevel.gravity = 600;
const fallingShell = createRedShellFactory(sprite)();
fallingShell.pos.set(64, 64);
fallingShell.vel.set(120, -60);
fallingShell.update(gameContext, gravityLevel);
assertEqual(
    [fallingShell.pos.x, fallingShell.pos.y, fallingShell.vel.x, fallingShell.vel.y],
    [66, 63, 120, -50],
    'Free shell preserves launch velocity while gravity changes vertical velocity',
);

const carriedShell = createRedShellFactory(sprite)();
const carrier = new Entity();
carrier.pos.set(40, 80);
const carriedPickable = carriedShell.traits.get(Pickable);
assertEqual(
    carriedPickable.attach(carriedShell, carrier),
    true,
    'Physics shell attaches to carrier',
);
assertEqual(
    carriedShell.traits.get(Physics).enabled,
    false,
    'Pickup suspends shell physics',
);
carriedShell.update(gameContext, gravityLevel);
assertEqual(
    [carriedShell.pos.x, carriedShell.pos.y, carriedShell.vel.x, carriedShell.vel.y],
    [48, 72, 0, 0],
    'Carried shell has no physics drift',
);
assertEqual(
    carriedPickable.release(carriedShell, carrier),
    true,
    'Carried shell releases',
);
assertEqual(
    carriedShell.traits.get(Physics).enabled,
    true,
    'Release restores shell physics',
);
carriedShell.update(gameContext, gravityLevel);
assertEqual(
    [carriedShell.pos.x, carriedShell.pos.y],
    [56, 69],
    'Released shell converts launch velocity into movement',
);

function createCollisionLevel(tileX: number, tileY: number): Level {
    const level = new Level();
    level.gravity = 0;
    const tiles = new Matrix<CollisionTile>();
    tiles.set(tileX, tileY, {type: 'ground'});
    level.tileCollider.addGrid(tiles);
    return level;
}

function createMovingShell(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
): Entity {
    const movingShell = createRedShellFactory(sprite)();
    movingShell.pos.set(x, y);
    movingShell.vel.set(velocityX, velocityY);
    return movingShell;
}

const rightImpact = createMovingShell(32, 40, 2400, 0);
rightImpact.update(gameContext, createCollisionLevel(5, 3));
assertEqual(
    [rightImpact.pos.x, rightImpact.vel.x],
    [64, 0],
    'Fast shell stops at right wall without tunneling',
);

const leftImpact = createMovingShell(64, 40, -2400, 0);
leftImpact.update(gameContext, createCollisionLevel(2, 3));
assertEqual(
    [leftImpact.pos.x, leftImpact.vel.x],
    [48, 0],
    'Fast shell stops at left wall without tunneling',
);

const floorImpact = createMovingShell(64, 32, 0, 2400);
floorImpact.update(gameContext, createCollisionLevel(4, 5));
assertEqual(
    [floorImpact.pos.y, floorImpact.vel.y],
    [56, 0],
    'Fast shell stops at floor without tunneling',
);

const ceilingImpact = createMovingShell(64, 64, 0, -2400);
ceilingImpact.update(gameContext, createCollisionLevel(4, 2));
assertEqual(
    [ceilingImpact.pos.y, ceilingImpact.vel.y],
    [40, 0],
    'Fast shell stops at ceiling without tunneling',
);

console.log('Pickup-capable red shell physics and collision regression passed');
