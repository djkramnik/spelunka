import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import type {KeyState} from '../KeyboardState.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Go from '../traits/Go.js';
import Jump from '../traits/Jump.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

const SLOW_DRAG = 1 / 1000;
const FAST_DRAG = 1 / 5000;

export type Mario = Entity & {
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

function createMarioFactory(
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

    function setTurboState(
        this: Entity,
        turboOn: boolean | KeyState,
    ): void {
        this.traits.get(Go).dragFactor = turboOn ? FAST_DRAG : SLOW_DRAG;
    }

    function drawMario(
        this: Entity,
        context: CanvasRenderingContext2D,
    ): void {
        sprite.draw(
            routeFrame(this),
            context,
            0,
            0,
            this.traits.get(Go).heading < 0,
        );
    }

    return function createMario(): Mario {
        const mario = new Entity() as Mario;
        mario.audio = audio;
        mario.size.set(14, 16);

        mario.addTrait(new Physics());
        mario.addTrait(new Solid());
        mario.addTrait(new Go());
        mario.addTrait(new Jump());
        mario.addTrait(new Killable());
        mario.addTrait(new Stomper());

        mario.traits.get(Killable).removeAfter = 0;
        mario.turbo = setTurboState;
        mario.draw = drawMario;
        mario.turbo(false);

        return mario;
    };
}
