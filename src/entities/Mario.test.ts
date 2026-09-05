import AudioBoard from '../AudioBoard.js';
import {createAnim} from '../anim.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import type SpriteSheet from '../SpriteSheet.js';
import Carrier from '../traits/Carrier.js';
import Crouch from '../traits/Crouch.js';
import Go from '../traits/Go.js';
import Health, {SPELUNKY_STARTING_HEARTS} from '../traits/Health.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import LadderClimb from '../traits/LadderClimb.js';
import LedgeHang from '../traits/LedgeHang.js';
import PlayerDeath from '../traits/PlayerDeath.js';
import PlayerHit, {
    SPELUNKY_SMALL_HIT_REACTION_DURATION,
} from '../traits/PlayerHit.js';
import {
    createMarioFactory,
    PLAYER_FRAME_NAMES,
    PLAYER_INVULNERABILITY_MINIMUM_OPACITY,
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
const drawOpacities: number[] = [];
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
            'ladder-climb': 6,
            'carry-run': 8,
            throw: 5,
            'reaction-hit': 2,
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
            'ladder-climb',
            'throw',
            'reaction-hit',
        ].includes(name);
        return createAnim(
            Array.from(
                {length: frameCount},
                (_, index) => `${name}-${index + 1}`,
            ),
            name === 'reaction-hit' ? 4 / 60 : timed ? 0.05 : 3,
            ![
                'jump',
                'fall',
                'crouch-enter',
                'crouch-exit',
                'ledge-flip',
                'ledge-hang',
                'ledge-climb',
                'throw',
                'reaction-hit',
            ].includes(name),
        );
    },
    drawFrame: (
        name: string,
        context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip: boolean,
    ): void => {
        draws.push({name, pivotX, pivotY, flip});
        drawOpacities.push(context.globalAlpha);
    },
} as unknown as SpriteSheet;
const mario = createMarioFactory(sprite, new AudioBoard())();
const jump = mario.traits.get(Jump);
const go = mario.traits.get(Go);
const health = mario.traits.get(Health);
const carrier = mario.traits.get(Carrier);
const killable = mario.traits.get(Killable);
const ledgeHang = mario.traits.get(LedgeHang);
const ladderClimb = mario.traits.get(LadderClimb);
const crouch = mario.traits.get(Crouch);
const playerDeath = mario.traits.get(PlayerDeath);
const playerHit = mario.traits.get(PlayerHit);
const animationClock = mario as typeof mario & {
    animationState: string;
    animationStateTime: number;
};
const drawContext = {globalAlpha: 1} as CanvasRenderingContext2D;
const draw = (): string => {
    mario.draw(drawContext);
    const frame = draws.at(-1)?.name;
    if (!frame) {
        throw new Error('Mario did not draw a frame');
    }
    return frame;
};

assertEqual(
    health.hearts,
    SPELUNKY_STARTING_HEARTS,
    'New Spelunky player owns the default heart count',
);

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

ladderClimb.phase = 'clinging';
assertEqual(draw(), 'ladder-cling', 'Ladder mount holds the dedicated HD cling pose');
ladderClimb.phase = 'climbing';
ladderClimb.animationTime = 0.11;
assertEqual(draw(), 'ladder-climb-3', 'Ladder motion advances through the HD climb loop');
ladderClimb.phase = 'inactive';
ladderClimb.animationTime = 0;

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
(mario as typeof mario & {throwFrameTime: number}).throwFrameTime = 0;

health.takeDamage(1, 1);
playerHit.start(-1);
assertEqual(draw(), 'reaction-hit-1', 'Small damage starts the upright HD reaction');
assertEqual(draws.at(-1)?.flip, false, 'Leftward recoil keeps the source-facing reaction');
assertEqual(drawOpacities.at(-1), 1, 'Invulnerability flashing begins at full opacity');
assertEqual(drawContext.globalAlpha, 1, 'Player drawing restores the canvas opacity');

const hitLevel = new Level();
health.update(
    mario,
    {deltaTime: 1 / 16} as GameContext,
    hitLevel,
);
playerHit.update(
    mario,
    {deltaTime: 1 / 16} as GameContext,
    hitLevel,
);
assertEqual(draw(), 'reaction-hit-1', 'The recoil animation remains active during its first frame');
assertEqual(
    drawOpacities.at(-1),
    PLAYER_INVULNERABILITY_MINIMUM_OPACITY,
    'Invulnerability opacity reaches its deterministic low point',
);

playerHit.update(
    mario,
    {deltaTime: 0.01} as GameContext,
    hitLevel,
);
assertEqual(
    draw(),
    'reaction-hit-2',
    'Small recoil advances to the second arms-back frame',
);

playerHit.update(
    mario,
    {deltaTime: SPELUNKY_SMALL_HIT_REACTION_DURATION} as GameContext,
    hitLevel,
);
assertEqual(draw(), 'idle', 'Normal animation resumes when the small reaction ends');

health.update(mario, {deltaTime: 1} as GameContext, hitLevel);
assertEqual(draw(), 'idle', 'Normal animation remains after protection expires');
assertEqual(drawOpacities.at(-1), 1, 'Expired protection restores full opacity');

playerHit.start(1);
assertEqual(draw(), 'reaction-hit-1', 'A rightward recoil can start independently');
assertEqual(draws.at(-1)?.flip, true, 'Rightward recoil mirrors the HD reaction frame');

killable.dead = true;
playerDeath.phase = 'airborne';
playerDeath.direction = -1;
assertEqual(draw(), 'reaction-airborne', 'Airborne death uses the curled HD body');
assertEqual(
    draws.at(-1)?.flip,
    false,
    'Leftward death keeps the HD pose with its head on the left',
);
playerDeath.direction = 1;
assertEqual(draw(), 'reaction-airborne', 'Rightward death keeps the curled HD body');
assertEqual(
    draws.at(-1)?.flip,
    true,
    'Rightward death mirrors the HD pose so its head points right',
);
playerDeath.phase = 'settled';
assertEqual(
    draw(),
    'reaction-unconscious',
    'Settled death uses the final HD unconscious pose',
);

assertEqual(
    draws[0],
    {name: 'idle', pivotX: 7, pivotY: 16, flip: false},
    'Player art uses the collider bottom-centre pivot',
);

assertEqual(
    PLAYER_FRAME_NAMES.length,
    92,
    'The expanded HD player frame catalogue remains explicit',
);

console.log('Expanded Spelunky HD player animation regression passed');
