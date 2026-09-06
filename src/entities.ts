import type Entity from './Entity.js';
import {loadBullet} from './entities/Bullet.js';
import type {BulletFactory} from './entities/Bullet.js';
import {loadCannon} from './entities/Cannon.js';
import type {CannonFactory} from './entities/Cannon.js';
import {loadLadder} from './entities/Ladder.js';
import type {LadderFactory} from './entities/Ladder.js';
import {loadMario} from './entities/Mario.js';
import type {MarioFactory} from './entities/Mario.js';
import {loadRock} from './entities/Rock.js';
import type {RockFactory} from './entities/Rock.js';
import {loadSnake} from './entities/Snake.js';
import type {SnakeFactory} from './entities/Snake.js';

type ProgressCallback = () => void;

export interface EntityFactories {
    [name: string]: () => Entity;
    mario: MarioFactory;
    ladder: LadderFactory;
    ladder4: () => Entity;
    bullet: BulletFactory;
    cannon: CannonFactory;
    rock: RockFactory;
    snake: SnakeFactory;
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

    const [
        mario,
        ladder,
        bullet,
        cannon,
        rock,
        snake,
    ] = await Promise.all([
        track(loadMario(audioContext)),
        track(loadLadder()),
        track(loadBullet()),
        track(loadCannon(audioContext)),
        track(loadRock()),
        track(loadSnake()),
    ]);

    return {
        mario,
        ladder,
        ladder4: () => ladder(4),
        bullet,
        cannon,
        rock,
        snake,
    };
}
