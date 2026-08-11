import AudioBoard from '../AudioBoard.js';
import Entity from '../Entity.js';
import type Level from '../Level.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {findPlayers} from '../player.js';
import type {GameContext} from '../Scene.js';
import Emitter from '../traits/Emitter.js';
import type {EntityEmitter} from '../traits/Emitter.js';

const HOLD_FIRE_THRESHOLD = 30;

export type CannonFactory = () => Entity;

export async function loadCannon(
    audioContext: AudioContext,
): Promise<CannonFactory> {
    const audio = await loadAudioBoard('cannon', audioContext);
    return createCannonFactory(audio);
}

function createCannonFactory(audio: AudioBoard): CannonFactory {
    const emitBullet: EntityEmitter = (
        cannon: Entity,
        gameContext: GameContext,
        level: Level,
    ): void => {
        let direction = 1;

        for (const player of findPlayers(level.entities)) {
            if (player.pos.x > cannon.pos.x - HOLD_FIRE_THRESHOLD
                && player.pos.x < cannon.pos.x + HOLD_FIRE_THRESHOLD) {
                return;
            }

            if (player.pos.x < cannon.pos.x) {
                direction = -1;
            }
        }

        const createBullet = gameContext.entityFactory['bullet'];
        if (!createBullet) {
            throw new Error('Bullet entity factory is not registered');
        }

        const bullet = createBullet();
        bullet.pos.copy(cannon.pos);
        bullet.vel.set(80 * direction, 0);

        cannon.sounds.add('shoot');
        level.entities.add(bullet);
    };

    return function createCannon(): Entity {
        const cannon = new Entity();
        cannon.audio = audio;

        const emitter = new Emitter();
        emitter.interval = 4;
        emitter.emitters.push(emitBullet);
        cannon.addTrait(emitter);

        return cannon;
    };
}
