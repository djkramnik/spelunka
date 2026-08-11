import type Entity from './Entity.js';
import {loadBullet} from './entities/Bullet.js';
import type {BulletFactory} from './entities/Bullet.js';
import {loadCannon} from './entities/Cannon.js';
import type {CannonFactory} from './entities/Cannon.js';
import {loadGoomba} from './entities/Goomba.js';
import type {GoombaFactory} from './entities/Goomba.js';
import {loadKoopa} from './entities/Koopa.js';
import type {KoopaFactory} from './entities/Koopa.js';
import {loadMario} from './entities/Mario.js';
import type {MarioFactory} from './entities/Mario.js';

type ProgressCallback = () => void;

export interface EntityFactories {
    [name: string]: () => Entity;
    mario: MarioFactory;
    goomba: GoombaFactory;
    koopa: KoopaFactory;
    bullet: BulletFactory;
    cannon: CannonFactory;
}

export async function loadEntities(
    audioContext: AudioContext,
    onProgress: ProgressCallback = () => {},
): Promise<EntityFactories> {
    const track = async <Factory>(promise: Promise<Factory>): Promise<Factory> => {
        const factory = await promise;
        onProgress();
        return factory;
    };

    const [mario, goomba, koopa, bullet, cannon] = await Promise.all([
        track(loadMario(audioContext)),
        track(loadGoomba()),
        track(loadKoopa()),
        track(loadBullet()),
        track(loadCannon(audioContext)),
    ]);

    return {mario, goomba, koopa, bullet, cannon};
}
