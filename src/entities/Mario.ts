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
const THROW_FRAME_DURATION = 0.18;
const STUNNED_FRAME_DURATION = 0.2;

export const PLAYER_FRAME_NAMES = [
    'idle',
    'walk-1',
    'walk-2',
    'walk-3',
    'run-1',
    'run-2',
    'run-3',
    'run-4',
    'skid',
    'jump',
    'fall',
    'carry-idle',
    'carry-run-1',
    'carry-run-2',
    'carry-run-3',
    'carry-run-4',
    'carry-jump',
    'carry-fall',
    'throw',
    'reaction-stunned',
    'reaction-dead',
] as const;

export type PlayerFrameName = typeof PLAYER_FRAME_NAMES[number];

export type Mario = Entity & {
    pickup(): Entity | null;
    pickupOrThrow(): Entity | null;
    turbo(state: boolean | KeyState): void;
};

export type MarioFactory = () => Mario;

export async function loadMario(audioContext: AudioContext): Promise<MarioFactory> {
    const [sprite, audio] = await Promise.all([
        loadSpriteSheet('mario'),
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
    const carryRunAnimation = sprite.getAnimation('carry-run');

    function routeFrame(mario: MarioEntity): PlayerFrameName {
        const jump = mario.traits.get(Jump);
        const go = mario.traits.get(Go);
        const killable = mario.traits.get(Killable);
        const carrier = mario.traits.get(Carrier);

        if (killable.dead) {
            return killable.deadTime < STUNNED_FRAME_DURATION
                ? 'reaction-stunned'
                : 'reaction-dead';
        }

        if (mario.throwFrameTime > 0) {
            return 'throw';
        }

        if (carrier.carried !== null) {
            if (jump.falling) {
                return mario.vel.y < 0 ? 'carry-jump' : 'carry-fall';
            }

            if (go.distance > 0) {
                return carryRunAnimation(go.distance) as PlayerFrameName;
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

            const animation = mario.running ? runAnimation : walkAnimation;
            return animation(go.distance) as PlayerFrameName;
        }

        return 'idle';
    }

    class MarioEntity extends Entity {
        running = false;
        throwFrameTime = 0;

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
