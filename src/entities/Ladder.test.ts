import type SpriteSheet from '../SpriteSheet.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Jump from '../traits/Jump.js';
import Climbable from '../traits/Climbable.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import TopPlatform from '../traits/TopPlatform.js';
import {
    createLadderFactory,
    LADDER_BODY_TILE,
    LADDER_HEIGHT,
    LADDER_TOP_TILE,
    LADDER_WIDTH,
} from './Ladder.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const draws: Array<{name: string; x: number; y: number}> = [];
const sprite = {
    drawTile: (
        name: string,
        _context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void => {
        draws.push({name, x, y});
    },
} as unknown as SpriteSheet;

const ladder = createLadderFactory(sprite)();

assertEqual(
    [ladder.size.x, ladder.size.y],
    [LADDER_WIDTH, LADDER_HEIGHT],
    'Ladder occupies two logical terrain cells',
);
assertEqual(
    [
        ladder.traits.has(Physics),
        ladder.traits.has(Solid),
        ladder.traits.has(Climbable),
        ladder.traits.has(TopPlatform),
    ],
    [false, false, true, true],
    'Ladder marks its non-solid column as climbable and exposes a top platform',
);
assertEqual(ladder.zIndex, -1, 'Ladder renders behind actors');

ladder.draw({} as CanvasRenderingContext2D);
assertEqual(draws, [
    {name: LADDER_TOP_TILE, x: 0, y: 0},
    {name: LADDER_BODY_TILE, x: 0, y: 1},
], 'Ladder draws the capped HD cell over one repeating body cell');

draws.length = 0;
const tallLadder = createLadderFactory(sprite)(4);
assertEqual(
    [tallLadder.size.x, tallLadder.size.y],
    [LADDER_WIDTH, 64],
    'Tall ladder occupies four logical terrain cells',
);
tallLadder.draw({} as CanvasRenderingContext2D);
assertEqual(draws, [
    {name: LADDER_TOP_TILE, x: 0, y: 0},
    {name: LADDER_BODY_TILE, x: 0, y: 1},
    {name: LADDER_BODY_TILE, x: 0, y: 2},
    {name: LADDER_BODY_TILE, x: 0, y: 3},
], 'Tall ladder has one HD cap and three repeating body cells');

const gameContext = {
    deltaTime: 1 / 60,
    performanceMetrics: {
        recordTileCandidates: (): void => {},
    },
} as unknown as GameContext;
const level = new Level();
const platformLadder = createLadderFactory(sprite)(4);
platformLadder.pos.set(32, 32);
platformLadder.traits.get(TopPlatform).install(platformLadder, level);

const createPlayer = (): {
    entity: Entity;
    physics: Physics;
    jump: Jump;
} => {
    const entity = new Entity();
    const physics = new Physics();
    const jump = new Jump();
    entity.size.set(14, 16);
    entity.addTrait(physics);
    entity.addTrait(new Solid());
    entity.addTrait(jump);
    return {entity, physics, jump};
};

const landing = createPlayer();
landing.entity.pos.set(33, 16);
landing.entity.vel.y = 60;
landing.entity.update(gameContext, level);
assertEqual(
    [
        landing.entity.bounds.bottom,
        landing.entity.vel.y,
        landing.physics.grounded,
        landing.jump.phase,
    ],
    [32, 0, true, 'grounded'],
    'Descending player lands on the ladder top',
);

const landedX = landing.entity.pos.x;
landing.entity.vel.x = 30;
landing.entity.update(gameContext, level);
assertEqual(
    [landing.entity.pos.x > landedX, landing.entity.bounds.bottom, landing.physics.grounded],
    [true, 32, true],
    'Grounded player walks across the ladder top',
);

const rising = createPlayer();
rising.entity.pos.set(33, 40);
rising.entity.vel.y = -600;
rising.entity.update(gameContext, level);
assertEqual(
    [rising.entity.bounds.top, rising.physics.grounded, rising.jump.phase],
    [30, false, 'rising'],
    'Rising player passes through the ladder top from below',
);
rising.entity.vel.y = 30;
rising.jump.phase = 'falling';
rising.entity.update(gameContext, level);
assertEqual(
    [rising.entity.bounds.bottom, rising.physics.grounded, rising.jump.phase],
    [46.5, false, 'falling'],
    'Head contact followed by descent does not raise the player onto the ladder',
);
assertEqual(
    level.tileCollider.hasSolidAt(33, 33),
    false,
    'Ladder platform remains independent of ordinary solid terrain',
);

console.log('Spelunky HD ladder entity and one-way top platform passed');
