import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Climbable from '../traits/Climbable.js';
import RopeDeployment, {
    ROPE_BODY_SPACING,
    ROPE_END_FRAME_DURATION,
    ROPE_WIDTH,
} from '../traits/RopeDeployment.js';

export type RopeFactory = () => Entity;

export async function loadRope(audioContext: AudioContext): Promise<RopeFactory> {
    const [sprite, audio] = await Promise.all([
        loadSpriteSheet('generated/spelunky-hd/rope'),
        loadAudioBoard('rope', audioContext),
    ]);
    return createRopeFactory(sprite, audio);
}

export function createRopeFactory(
    sprite: SpriteSheet,
    audio = new AudioBoard(),
): RopeFactory {
    return function createRope(): Entity {
        const rope = new Entity();
        const climbable = new Climbable('rope');
        climbable.active = false;
        const deployment = new RopeDeployment();
        rope.audio = audio;
        rope.size.set(ROPE_WIDTH, 0);
        rope.zIndex = -1;
        rope.entityCollisionsEnabled = false;
        rope.addTrait(climbable);
        rope.addTrait(deployment);
        rope.draw = context => {
            if (deployment.phase === 'idle') {
                return;
            }
            if (deployment.phase === 'ascending') {
                sprite.drawFrame(
                    'toss',
                    context,
                    rope.size.x / 2,
                    rope.size.y / 2,
                );
                return;
            }

            for (let y = 0; y < rope.size.y; y += ROPE_BODY_SPACING) {
                sprite.drawFrame('body', context, rope.size.x / 2, y);
            }
            const endFrame = deployment.phase === 'unfurling'
                && Math.floor(
                    deployment.animationTime / ROPE_END_FRAME_DURATION,
                ) % 2 === 0
                ? 'end-1'
                : 'end-2';
            sprite.drawFrame(
                endFrame,
                context,
                rope.size.x / 2,
                rope.size.y,
            );
        };
        return rope;
    };
}
