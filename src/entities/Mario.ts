import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import type {KeyState} from '../KeyboardState.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Carrier from '../traits/Carrier.js';
import Go from '../traits/Go.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

const SLOW_DRAG = 1 / 1000;
const FAST_DRAG = 1 / 5000;
const HD_TICK_SECONDS = 1 / 60;
const THROW_FRAME_DURATION = 5 * 4 * HD_TICK_SECONDS;
const STUNNED_FRAME_DURATION = 0.2;

export const PLAYER_FRAME_NAMES = [
    'idle',
    'walk-1',
    'walk-2',
    'walk-3',
    'walk-4',
    'walk-5',
    'walk-6',
    'walk-7',
    'walk-8',
    'run-1',
    'run-2',
    'run-3',
    'run-4',
    'run-5',
    'run-6',
    'run-7',
    'run-8',
    'skid-1',
    'skid-2',
    'skid-3',
    'skid-4',
    'skid-5',
    'skid-6',
    'skid-7',
    'skid-8',
    'jump-1',
    'jump-2',
    'jump-3',
    'jump-4',
    'fall-1',
    'fall-2',
    'fall-3',
    'fall-4',
    'carry-idle',
    'carry-run-1',
    'carry-run-2',
    'carry-run-3',
    'carry-run-4',
    'carry-run-5',
    'carry-run-6',
    'carry-run-7',
    'carry-run-8',
    'carry-jump',
    'carry-fall',
    'throw-1',
    'throw-2',
    'throw-3',
    'throw-4',
    'throw-5',
    'reaction-stunned',
    'reaction-dead',
] as const;

export type PlayerFrameName = typeof PLAYER_FRAME_NAMES[number];

type PlayerAnimationState =
    | 'idle'
    | 'walk'
    | 'run'
    | 'skid'
    | 'jump'
    | 'fall'
    | 'carry-idle'
    | 'carry-run'
    | 'carry-jump'
    | 'carry-fall'
    | 'throw'
    | 'dead';

export type Mario = Entity & {
    pickup(): Entity | null;
    pickupOrThrow(): Entity | null;
    turbo(state: boolean | KeyState): void;
};

export type MarioFactory = () => Mario;

export async function loadMario(
    audioContext: AudioContext,
): Promise<MarioFactory> {
    const [sprite, audio] = await Promise.all([
        loadSpriteSheet('generated/spelunky-hd/player'),
        loadAudioBoard('mario', audioContext),
    ]);

    return createMarioFactory(sprite, audio);
}

export function createMarioFactory(
    sprite: SpriteSheet,
    audio: AudioBoard,
): MarioFactory {
    const walkAnimation = sprite.getAnimation('walk');
    const runAnimation = sprite.getAnimation('run');
    const skidAnimation = sprite.getAnimation('skid');
    const jumpAnimation = sprite.getAnimation('jump');
    const fallAnimation = sprite.getAnimation('fall');
    const carryRunAnimation = sprite.getAnimation('carry-run');
    const throwAnimation = sprite.getAnimation('throw');

    function routeAnimationState(mario: MarioEntity): PlayerAnimationState {
        const jump = mario.traits.get(Jump);
        const go = mario.traits.get(Go);
        const killable = mario.traits.get(Killable);
        const carrier = mario.traits.get(Carrier);

        if (killable.dead) {
            return 'dead';
        }

        if (mario.throwFrameTime > 0) {
            return 'throw';
        }

        if (carrier.carried !== null) {
            if (jump.falling) {
                return mario.vel.y < 0 ? 'carry-jump' : 'carry-fall';
            }

            if (go.distance > 0) {
                return 'carry-run';
            }

            return 'carry-idle';
        }

        if (jump.falling) {
            return mario.vel.y < 0 ? 'jump' : 'fall';
        }

        if (go.distance > 0) {
            if ((mario.vel.x > 0 && go.dir < 0)
                || (mario.vel.x < 0 && go.dir > 0)) {
                return 'skid';
            }

            return mario.running ? 'run' : 'walk';
        }

        return 'idle';
    }

    function routeFrame(mario: MarioEntity): PlayerFrameName {
        const state = routeAnimationState(mario);
        const stateTime = mario.animationState === state
            ? mario.animationStateTime
            : 0;
        const go = mario.traits.get(Go);
        const killable = mario.traits.get(Killable);

        switch (state) {
            case 'dead':
                return killable.deadTime < STUNNED_FRAME_DURATION
                    ? 'reaction-stunned'
                    : 'reaction-dead';
            case 'throw':
                return throwAnimation(stateTime) as PlayerFrameName;
            case 'carry-run':
                return carryRunAnimation(go.distance) as PlayerFrameName;
            case 'skid':
                return skidAnimation(stateTime) as PlayerFrameName;
            case 'jump':
                return jumpAnimation(stateTime) as PlayerFrameName;
            case 'fall':
                return fallAnimation(stateTime) as PlayerFrameName;
            case 'walk':
                return walkAnimation(go.distance) as PlayerFrameName;
            case 'run':
                return runAnimation(go.distance) as PlayerFrameName;
            default:
                return state;
        }
    }

    class MarioEntity extends Entity {
        running = false;
        throwFrameTime = 0;
        animationState: PlayerAnimationState = 'idle';
        animationStateTime = 0;

        constructor() {
            super();
            this.audio = audio;
            this.size.set(14, 16);

            this.addTrait(new Physics());
            this.addTrait(new Solid());
            this.addTrait(new Go());
            this.addTrait(new Jump());
            this.addTrait(new Killable());
            this.addTrait(new Stomper());
            this.addTrait(new Carrier());

            this.traits.get(Killable).removeAfter = 0;
            this.turbo(false);
        }

        turbo(turboOn: boolean | KeyState): void {
            this.running = Boolean(turboOn);
            this.traits.get(Go).dragFactor = turboOn ? FAST_DRAG : SLOW_DRAG;
        }

        pickup(): Entity | null {
            return this.traits.get(Carrier).pickup(this);
        }

        pickupOrThrow(): Entity | null {
            const carrier = this.traits.get(Carrier);
            const wasCarrying = carrier.carried !== null;
            const result = carrier.pickupOrThrow(this);
            if (wasCarrying && result !== null) {
                this.throwFrameTime = THROW_FRAME_DURATION;
            }
            return result;
        }

        override update(gameContext: GameContext, level: Level): void {
            super.update(gameContext, level);
            this.throwFrameTime = Math.max(
                0,
                this.throwFrameTime - gameContext.deltaTime,
            );
            const nextAnimationState = routeAnimationState(this);
            if (nextAnimationState === this.animationState) {
                this.animationStateTime += gameContext.deltaTime;
            } else {
                this.animationState = nextAnimationState;
                this.animationStateTime = 0;
            }
        }

        override draw(context: CanvasRenderingContext2D): void {
            sprite.drawFrame(
                routeFrame(this),
                context,
                this.size.x / 2,
                this.size.y,
                this.traits.get(Go).heading < 0,
            );
        }
    }

    return function createMario(): Mario {
        return new MarioEntity();
    };
}
