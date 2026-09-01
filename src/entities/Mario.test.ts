import AudioBoard from '../AudioBoard.js';
import {createAnim} from '../anim.js';
import Entity from '../Entity.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from '../traits/Carrier.js';
import Crouch from '../traits/Crouch.js';
import Go from '../traits/Go.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import LedgeHang from '../traits/LedgeHang.js';
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
            'crouch-enter': 3,
            'crouch-exit': 3,
            crawl: 7,
            'ledge-flip': 7,
            'ledge-hang': 4,
            'ledge-climb': 7,
            'carry-run': 8,
            throw: 5,
        };
        const frameCount = frameCounts[name];
        if (frameCount === undefined) {
            throw new Error(`Unexpected animation: ${name}`);
        }
        const timed = [
            'skid',
            'jump',
            'fall',
            'crouch-enter',
            'crouch-exit',
            'crawl',
            'ledge-flip',
            'ledge-hang',
            'ledge-climb',
            'throw',
        ].includes(name);
        return createAnim(
            Array.from(
                {length: frameCount},
                (_, index) => `${name}-${index + 1}`,
            ),
            timed ? 0.05 : 3,
            ![
                'jump',
                'fall',
                'crouch-enter',
                'crouch-exit',
                'ledge-flip',
                'ledge-hang',
                'ledge-climb',
                'throw',
            ].includes(name),
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
const ledgeHang = mario.traits.get(LedgeHang);
const crouch = mario.traits.get(Crouch);
const animationClock = mario as typeof mario & {
    animationState: string;
    animationStateTime: number;
};
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
jump.rebound(mario, 180);
assertEqual(draw(), 'jump-1', 'Enemy rebound returns to the rising animation');

jump.phase = 'grounded';
jump.ready = 1;
mario.vel.set(0, 0);
go.dir = 0;
go.distance = 0;
crouch.phase = 'entering';
assertEqual(draw(), 'crouch-enter-1', 'Crouch starts with the HD crouch-in record');
animationClock.animationState = 'crouch-enter';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'crouch-enter-3', 'Crouch-in holds its terminal source frame');
crouch.phase = 'crouched';
assertEqual(draw(), 'crouch', 'Stationary crouch uses the dedicated HD held pose');
go.dir = 1;
assertEqual(draw(), 'crawl-1', 'Down plus direction routes to the HD crawl record');
crouch.phase = 'exiting';
assertEqual(draw(), 'crouch-exit-1', 'Standing up starts the HD crouch-out record');
crouch.phase = 'flipping';
crouch.flipDirection = 1;
assertEqual(draw(), 'ledge-flip-1', 'Crawling off an edge starts the reversed HD ledge flip');
assertEqual(draws.at(-1)?.flip, true, 'Right-edge flip faces back toward its left supporting wall');
crouch.phase = 'standing';
crouch.flipDirection = 0;
go.dir = 0;

ledgeHang.phase = 'hanging';
ledgeHang.side = -1;
assertEqual(draw(), 'ledge-hang-1', 'Left ledge starts the dedicated HD grab sequence');
assertEqual(draws.at(-1)?.flip, true, 'Hang facing follows the supporting ledge');
animationClock.animationState = 'ledge-hang';
animationClock.animationStateTime = 1;
assertEqual(draw(), 'ledge-hang-4', 'Hanging holds the terminal HD suspended pose');
ledgeHang.enteredFromTop = true;
animationClock.animationStateTime = 0;
assertEqual(draw(), 'ledge-hang-4', 'Top flip enters directly into the held hanging pose');
ledgeHang.enteredFromTop = false;
ledgeHang.phase = 'climbing';
assertEqual(draw(), 'ledge-climb-1', 'Ledge climb starts the HD ledge-flip sequence');
ledgeHang.phase = 'airborne';
ledgeHang.side = 0;

carrier.carried = new Entity();
jump.ready = 1;
jump.phase = 'grounded';
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
    83,
    'The expanded HD player frame catalogue remains explicit',
);

console.log('Expanded Spelunky HD player animation regression passed');
