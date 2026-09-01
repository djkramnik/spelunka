import Entity, {Sides} from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import type {CollisionTile} from '../TileCollider.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';
import {
    createSnakeFactory,
    SNAKE_INITIAL_DIRECTION,
    SNAKE_WALK_SPEED,
    SnakeBehavior,
} from './Snake.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

interface DrawCall {
    name: string;
    pivotX: number;
    pivotY: number;
    flip: boolean;
}

const drawCalls: DrawCall[] = [];
const sprite = {
    getAnimation: (name: string): ((time: number) => string) => {
        return (time: number): string => `${name}-${Math.floor(time * 10)}`;
    },
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip: boolean,
    ): void => {
        drawCalls.push({name, pivotX, pivotY, flip});
    },
} as unknown as SpriteSheet;

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;

const visualSnake = createSnakeFactory(sprite)();
const visualBehavior = visualSnake.traits.get(SnakeBehavior);

assertEqual([visualSnake.size.x, visualSnake.size.y], [12, 16], 'Snake collider size');
assertEqual([visualSnake.offset.x, visualSnake.offset.y], [2, 0], 'Snake collider inset');
assertEqual(visualSnake.traits.has(Physics), true, 'Snake physics');
assertEqual(visualSnake.traits.has(Solid), true, 'Snake terrain collision');
assertEqual(visualSnake.traits.get(Killable).removeAfter, 0, 'Snake prompt cleanup');
assertEqual(
    [visualBehavior.walkSpeed, visualBehavior.direction],
    [SNAKE_WALK_SPEED, SNAKE_INITIAL_DIRECTION],
    'Snake named movement tunables',
);

visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1), {
    name: 'walk-0',
    pivotX: 8,
    pivotY: 16,
    flip: false,
}, 'Walking snake HD animation, pivot, and facing');

visualBehavior.animationTime = 0.2;
visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.name, 'walk-2', 'Living snake continuously walks');

visualBehavior.direction = -1;
visualSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.at(-1)?.flip, true, 'Left movement mirrors the HD source');

const movementLevel = new Level();
movementLevel.gravity = 0;
const floor = new Matrix<CollisionTile>();
floor.set(4, 1, {type: 'ground'});
movementLevel.tileCollider.addGrid(floor);

const patrolSnake = createSnakeFactory(sprite, {
    initialDirection: 1,
})();
patrolSnake.pos.set(64, 0);
patrolSnake.traits.get(Physics).grounded = true;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(patrolSnake.vel.x, SNAKE_WALK_SPEED, 'Snake patrol speed');

patrolSnake.pos.x = 66;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(
    [patrolSnake.traits.get(SnakeBehavior).direction, patrolSnake.vel.x],
    [-1, -SNAKE_WALK_SPEED],
    'Snake turns before the right end of its ledge',
);

patrolSnake.pos.x = 62;
patrolSnake.traits.get(SnakeBehavior).update(
    patrolSnake,
    gameContext,
    movementLevel,
);
assertEqual(
    [patrolSnake.traits.get(SnakeBehavior).direction, patrolSnake.vel.x],
    [1, SNAKE_WALK_SPEED],
    'Snake turns before the left end of its ledge',
);

patrolSnake.traits.get(SnakeBehavior).obstruct(patrolSnake, Sides.LEFT);
assertEqual(patrolSnake.traits.get(SnakeBehavior).direction, 1, 'Left wall turn');
patrolSnake.traits.get(SnakeBehavior).obstruct(patrolSnake, Sides.RIGHT);
assertEqual(patrolSnake.traits.get(SnakeBehavior).direction, -1, 'Right wall turn');

let deathEffects = 0;
const lethalSnake = createSnakeFactory(sprite, {
    onDeath: (): void => {
        deathEffects++;
    },
})();
lethalSnake.pos.set(64, 200);

const mario = new Entity();
mario.size.set(14, 16);
mario.pos.set(64, 192);
mario.vel.y = 300;
mario.addTrait(new Killable());
const stomper = new Stomper();
mario.addTrait(stomper);

new EntityCollider(new Set([mario, lethalSnake])).check();
mario.finalize();
lethalSnake.finalize();
assertEqual(lethalSnake.traits.get(Killable).dead, true, 'Descending stomp kills snake');
assertEqual(mario.traits.get(Killable).dead, false, 'Stomp takes precedence over contact damage');
assertEqual(
    mario.vel.y,
    -stomper.reboundSpeedFor(300),
    'Stomp bounces Mario through the named rebound rule',
);

const callsBeforeDeadDraw = drawCalls.length;
lethalSnake.draw({} as CanvasRenderingContext2D);
assertEqual(drawCalls.length, callsBeforeDeadDraw, 'Dead snake has no corpse frame');

const deathLevel = new Level();
deathLevel.gravity = 0;
deathLevel.entities.add(lethalSnake);
lethalSnake.update(gameContext, deathLevel);
lethalSnake.finalize();
assertEqual(deathEffects, 1, 'Future splatter hook runs once');
assertEqual(deathLevel.entities.has(lethalSnake), false, 'Dead snake is removed promptly');
lethalSnake.update(gameContext, deathLevel);
lethalSnake.finalize();
assertEqual(deathEffects, 1, 'Future splatter hook remains exactly once');

const contactSnake = createSnakeFactory(sprite)();
const contactMario = new Entity();
contactMario.addTrait(new Killable());
contactMario.addTrait(new Stomper());
contactMario.vel.y = 0;
contactSnake.vel.y = 0;
contactSnake.collides(contactMario);
contactMario.finalize();
contactSnake.finalize();
assertEqual(contactMario.traits.get(Killable).dead, true, 'Non-stomp contact kills Mario');
assertEqual(contactSnake.traits.get(Killable).dead, false, 'Snake survives non-stomp contact');

const externallyKilledSnake = createSnakeFactory(sprite, {
    onDeath: (): void => {
        deathEffects++;
    },
})();
externallyKilledSnake.traits.get(Killable).kill();
externallyKilledSnake.finalize();
externallyKilledSnake.update(gameContext, deathLevel);
assertEqual(deathEffects, 2, 'Projectile-compatible Killable death uses shared hook');

console.log('Snake entity behavior, animation, collision, and lifecycle passed');
