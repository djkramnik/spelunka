import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Climbable from '../traits/Climbable.js';
import RopeDeployment, {
    ROPE_BODY_SPACING,
    ROPE_WIDTH,
} from '../traits/RopeDeployment.js';

const ROPE_FRAME_HEIGHT = 80 * 0.25;

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

            if (rope.size.y > ROPE_FRAME_HEIGHT) {
                const finalBodyY = rope.size.y - ROPE_FRAME_HEIGHT;
                for (
                    let y = ROPE_BODY_SPACING;
                    y < finalBodyY;
                    y += ROPE_BODY_SPACING
                ) {
                    sprite.drawFrame('body', context, rope.size.x / 2, y);
                }
                sprite.drawFrame(
                    'body',
                    context,
                    rope.size.x / 2,
                    finalBodyY,
                );
            }
            sprite.drawFrame(
                'hook',
                context,
                rope.size.x / 2,
                0,
            );
        };
        return rope;
    };
}
