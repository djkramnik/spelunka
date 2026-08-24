import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import type {KeyState} from '../KeyboardState.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
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
    const runAnimation = sprite.getAnimation('run');

    function routeFrame(mario: Entity): string {
        const jump = mario.traits.get(Jump);
        const go = mario.traits.get(Go);

        if (jump.falling) {
            return 'jump';
        }

        if (go.distance > 0) {
            if ((mario.vel.x > 0 && go.dir < 0)
                || (mario.vel.x < 0 && go.dir > 0)) {
                return 'break';
            }

            return runAnimation(go.distance);
        }

        return 'idle';
    }

    class MarioEntity extends Entity {
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
            this.traits.get(Go).dragFactor = turboOn ? FAST_DRAG : SLOW_DRAG;
        }

        pickup(): Entity | null {
            return this.traits.get(Carrier).pickup(this);
        }

        pickupOrThrow(): Entity | null {
            return this.traits.get(Carrier).pickupOrThrow(this);
        }

        override draw(context: CanvasRenderingContext2D): void {
            sprite.draw(
                routeFrame(this),
                context,
                0,
                0,
                this.traits.get(Go).heading < 0,
            );
        }
    }

    return function createMario(): Mario {
        return new MarioEntity();
    };
}
