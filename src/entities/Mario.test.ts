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
        const frameCounts: Readonly<Record<string, number>> = {
            walk: 8,
            run: 8,
            skid: 8,
            jump: 4,
            fall: 4,
            'carry-run': 8,
            throw: 5,
        };
        const frameCount = frameCounts[name];
        if (frameCount === undefined) {
            throw new Error(`Unexpected animation: ${name}`);
        }
        const timed = ['skid', 'jump', 'fall', 'throw'].includes(name);
        return createAnim(
            Array.from(
                {length: frameCount},
                (_, index) => `${name}-${index + 1}`,
            ),
            timed ? 0.05 : 3,
            !['jump', 'fall', 'throw'].includes(name),
        );
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
assertEqual(draw(), 'walk-3', 'Walk animation uses the dense source sequence');
mario.turbo(true);
assertEqual(draw(), 'run-3', 'Turbo run animation uses the dense source sequence');
mario.turbo(false);
go.dir = -1;
mario.vel.x = 10;
assertEqual(draw(), 'skid-1', 'Skid animation starts at its first source frame');

jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'jump-1', 'Rising animation starts at its first source frame');
mario.vel.y = 10;
assertEqual(draw(), 'fall-1', 'Falling animation starts at its first source frame');

carrier.carried = new Entity();
jump.ready = 1;
go.distance = 0;
assertEqual(draw(), 'carry-idle', 'Carry idle frame');
go.distance = 7;
assertEqual(draw(), 'carry-run-3', 'Carry run fallback uses dense movement frames');
jump.ready = -1;
mario.vel.y = -10;
assertEqual(draw(), 'carry-jump', 'Carry rising frame');
mario.vel.y = 10;
assertEqual(draw(), 'carry-fall', 'Carry falling frame');

(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0.1;
assertEqual(draw(), 'throw-1', 'Throw animation starts at its first source frame');

const animationClock = mario as typeof mario & {
    animationState: string;
    animationStateTime: number;
};
carrier.carried = null;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;
animationClock.animationState = 'jump';
animationClock.animationStateTime = 0.11;
mario.vel.y = -10;
assertEqual(draw(), 'jump-3', 'Rising animation advances through source frames');
animationClock.animationStateTime = 1;
assertEqual(draw(), 'jump-4', 'Rising animation holds its terminal source frame');

animationClock.animationState = 'fall';
animationClock.animationStateTime = 0.11;
mario.vel.y = 10;
assertEqual(draw(), 'fall-3', 'Falling animation advances through source frames');
animationClock.animationStateTime = 1;
assertEqual(draw(), 'fall-4', 'Falling animation holds its terminal source frame');

go.dir = -1;
mario.vel.x = 10;
go.distance = 7;
jump.ready = 1;
animationClock.animationState = 'skid';
animationClock.animationStateTime = 0.11;
assertEqual(draw(), 'skid-3', 'Skid animation advances through source frames');

go.dir = 1;
mario.vel.x = 0;
go.distance = 0;
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0.1;
animationClock.animationState = 'throw';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'throw-5', 'Throw animation holds its terminal source frame');

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
    51,
    'The expanded HD player frame catalogue remains explicit',
);

console.log('Expanded Spelunky HD player animation regression passed');
