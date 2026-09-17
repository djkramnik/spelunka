import AudioBoard from '../AudioBoard.js';
import Camera from '../Camera.js';
import Level from '../Level.js';
import {createSpriteLayer} from '../layers/sprites.js';
import {Matrix} from '../math.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Climbable from '../traits/Climbable.js';
import Physics from '../traits/Physics.js';
import RopeDeployment, {
    ROPE_MAXIMUM_LENGTH,
    ROPE_TOSS_GRAVITY,
    ROPE_TOSS_UPWARD_SPEED,
} from '../traits/RopeDeployment.js';
import Solid from '../traits/Solid.js';
import TopPlatform from '../traits/TopPlatform.js';
import {createRopeFactory} from './Rope.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertClose(actual: number, expected: number, message: string): void {
    if (Math.abs(actual - expected) > 1e-9) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

const draws: Array<{name: string; x: number; y: number}> = [];
const sprite = {
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void => {
        draws.push({name, x, y});
    },
} as unknown as SpriteSheet;

const createRope = createRopeFactory(sprite, new AudioBoard());
const rope = createRope();
const deployment = rope.traits.get(RopeDeployment);
const climbable = rope.traits.get(Climbable);
assertEqual(
    [
        rope.size.x,
        rope.size.y,
        rope.zIndex,
        rope.entityCollisionsEnabled,
        climbable.kind,
        climbable.active,
        rope.traits.has(Physics),
        rope.traits.has(Solid),
        rope.traits.has(TopPlatform),
    ],
    [8, 0, -1, false, 'rope', false, false, false, false],
    'A new rope is a dormant, non-solid climbable rendered behind actors',
);

assertEqual(deployment.launch(rope, 40, 200), true, 'A dormant rope launches once');
assertEqual(
    [rope.pos.x, rope.pos.y, rope.vel.y, deployment.phase, climbable.active],
    [36, 196, -ROPE_TOSS_UPWARD_SPEED, 'ascending', false],
    'Launch aligns the HD tossed bundle around its requested centre',
);
assertEqual([...rope.sounds], ['rope-toss'], 'Launch queues the HD rope-toss sound');
assertEqual(deployment.launch(rope, 40, 200), false, 'A launched rope cannot relaunch');
rope.draw({} as CanvasRenderingContext2D);
assertEqual(draws, [{name: 'toss', x: 4, y: 4}], 'The airborne bundle uses the HD tossed-rope frame');

const openLevel = new Level();
openLevel.entities.add(rope);
const apexTime = ROPE_TOSS_UPWARD_SPEED / ROPE_TOSS_GRAVITY;
deployment.update(rope, {deltaTime: apexTime} as GameContext, openLevel);
assertClose(rope.pos.y, 76, 'The Classic ballistic toss settles at its exact apex');
assertEqual(
    [deployment.phase, rope.size.y, climbable.active, [...rope.sounds]],
    ['unfurling', 0, true, ['rope-toss', 'rope-catch']],
    'At the apex the anchor catches, becomes climbable, and starts at zero length',
);
deployment.update(rope, {deltaTime: 1} as GameContext, openLevel);
assertEqual(
    [deployment.phase, rope.pos.y, rope.size.y],
    ['deployed', 76, ROPE_MAXIMUM_LENGTH],
    'An unobstructed rope extends downward to the Classic eight-tile limit',
);

draws.length = 0;
rope.draw({} as CanvasRenderingContext2D);
assertEqual(
    draws.map(draw => draw.name),
    [...Array.from({length: 7}, () => 'body'), 'hook'],
    'The deployed rope repeats the plain HD body beneath one anchor hook',
);
assertEqual(
    [draws.at(-2), draws.at(-1)],
    [
        {name: 'body', x: 4, y: ROPE_MAXIMUM_LENGTH - 20},
        {name: 'hook', x: 4, y: 0},
    ],
    'The final plain body ends at the rope bottom and the hook covers the top',
);

const translations: Array<[number, number]> = [];
const layerContext = {
    save: (): void => {},
    translate: (x: number, y: number): void => {
        translations.push([x, y]);
    },
    restore: (): void => {},
} as unknown as CanvasRenderingContext2D;
const camera = new Camera();
camera.pos.set(12, 20);
const drawLayer = createSpriteLayer(new Set([rope]));
drawLayer(layerContext, camera);
camera.pos.set(20, 36);
drawLayer(layerContext, camera);
assertEqual(
    [translations, [rope.pos.x, rope.pos.y]],
    [[[24, 56], [16, 40]], [36, 76]],
    'Camera movement changes only screen translation and leaves the anchor fixed',
);

const nextLevel = new Level();
assertEqual(
    [openLevel.entities.has(rope), nextLevel.entities.has(rope)],
    [true, false],
    'A deployed rope stays in its source level and is absent from a new level',
);

const floorLevel = new Level();
const floorTiles = new Matrix<{type: string}>();
floorTiles.set(2, 8, {type: 'ground'});
const floorRope = createRope();
const floorDeployment = floorRope.traits.get(RopeDeployment);
floorDeployment.launch(floorRope, 40, 200);
floorDeployment.update(
    floorRope,
    {deltaTime: apexTime} as GameContext,
    floorLevel,
);
floorLevel.tileCollider.addGrid(floorTiles);
floorDeployment.update(floorRope, {deltaTime: 1} as GameContext, floorLevel);
assertEqual(
    [floorDeployment.phase, floorRope.pos.y, floorRope.size.y],
    ['deployed', 76, 52],
    'Downward unfurling stops exactly at intervening solid terrain',
);
draws.length = 0;
floorRope.draw({} as CanvasRenderingContext2D);
assertEqual(
    draws,
    [
        {name: 'body', x: 4, y: 16},
        {name: 'body', x: 4, y: 32},
        {name: 'hook', x: 4, y: 0},
    ],
    'An obstructed rope ends with the frayed body edge instead of a coil',
);

const ceilingLevel = new Level();
const ceilingTiles = new Matrix<{type: string}>();
ceilingTiles.set(2, 6, {type: 'ground'});
ceilingLevel.tileCollider.addGrid(ceilingTiles);
const ceilingRope = createRope();
const ceilingDeployment = ceilingRope.traits.get(RopeDeployment);
ceilingDeployment.launch(ceilingRope, 40, 200);
ceilingDeployment.update(
    ceilingRope,
    {deltaTime: apexTime} as GameContext,
    ceilingLevel,
);
assertEqual(
    [ceilingRope.pos.y, ceilingRope.vel.y, ceilingDeployment.phase],
    [112, 0, 'unfurling'],
    'The thrown anchor catches at the lower face of blocking terrain',
);

console.log('Classic rope deployment with Spelunky HD rendering passed');
