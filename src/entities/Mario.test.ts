import AudioBoard from '../AudioBoard.js';
import {createAnim} from '../anim.js';
import Entity from '../Entity.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from '../traits/Carrier.js';
import Go from '../traits/Go.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import {
    createMarioFactory,
    PLAYER_FRAME_NAMES,
} from './Mario.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const draws: Array<{
    name: string;
    pivotX: number;
    pivotY: number;
    flip: boolean;
}> = [];
const sprite = {
    getAnimation: (name: string) => {
        if (name === 'walk') {
            return createAnim(['walk-1', 'walk-2', 'walk-3'], 6);
        }
        if (name === 'run') {
            return createAnim(['run-1', 'run-2', 'run-3', 'run-4'], 6);
        }
        return createAnim([
            'carry-run-1',
            'carry-run-2',
            'carry-run-3',
            'carry-run-4',
        ], 6);
    },
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip: boolean,
    ): void => {
        draws.push({name, pivotX, pivotY, flip});
    },
} as unknown as SpriteSheet;
const mario = createMarioFactory(sprite, new AudioBoard())();
const jump = mario.traits.get(Jump);
const go = mario.traits.get(Go);
const carrier = mario.traits.get(Carrier);
const killable = mario.traits.get(Killable);
const draw = (): string => {
    mario.draw({} as CanvasRenderingContext2D);
    const frame = draws.at(-1)?.name;
    if (!frame) {
        throw new Error('Mario did not draw a frame');
    }
    return frame;
};

assertEqual(draw(), 'idle', 'Idle frame');
go.distance = 7;
assertEqual(draw(), 'walk-2', 'Walk animation frame');
mario.turbo(true);
assertEqual(draw(), 'run-2', 'Turbo run animation frame');
mario.turbo(false);
go.dir = -1;
mario.vel.x = 10;
assertEqual(draw(), 'skid', 'Skid frame');

jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'jump', 'Rising frame');
mario.vel.y = 10;
assertEqual(draw(), 'fall', 'Falling frame');

carrier.carried = new Entity();
jump.ready = 1;
go.distance = 0;
assertEqual(draw(), 'carry-idle', 'Carry idle frame');
go.distance = 7;
assertEqual(draw(), 'carry-run-2', 'Carry run animation frame');
jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'carry-jump', 'Carry rising frame');
mario.vel.y = 10;
assertEqual(draw(), 'carry-fall', 'Carry falling frame');

(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0.1;
assertEqual(draw(), 'throw', 'Throw frame');
killable.dead = true;
killable.deadTime = 0;
assertEqual(draw(), 'reaction-stunned', 'Initial reaction frame');
killable.deadTime = 1;
assertEqual(draw(), 'reaction-dead', 'Terminal reaction frame');

assertEqual(
    draws[0],
    {name: 'idle', pivotX: 7, pivotY: 16, flip: false},
    'Player art uses the collider bottom-centre pivot',
);

assertEqual(
    PLAYER_FRAME_NAMES.length,
    21,
    'The complete temporary player frame catalogue remains explicit',
);

console.log('Expanded temporary player animation regression passed');
