import type Entity from './Entity.js';
import {loadBullet} from './entities/Bullet.js';
import type {BulletFactory} from './entities/Bullet.js';
import {loadCannon} from './entities/Cannon.js';
import type {CannonFactory} from './entities/Cannon.js';
import {loadCaveman} from './entities/Caveman.js';
import type {CavemanFactory} from './entities/Caveman.js';
import {loadLadder} from './entities/Ladder.js';
import type {LadderFactory} from './entities/Ladder.js';
import {loadMario} from './entities/Mario.js';
import type {MarioFactory} from './entities/Mario.js';
import {loadRock} from './entities/Rock.js';
import type {RockFactory} from './entities/Rock.js';
import {loadRope} from './entities/Rope.js';
import type {RopeFactory} from './entities/Rope.js';
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
    caveman: CavemanFactory;
    rock: RockFactory;
    rope: RopeFactory;
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
        caveman,
        rock,
        rope,
        snake,
    ] = await Promise.all([
        track(loadMario(audioContext)),
        track(loadLadder()),
        track(loadBullet()),
        track(loadCannon(audioContext)),
        track(loadCaveman(audioContext)),
        track(loadRock()),
        track(loadRope(audioContext)),
        track(loadSnake()),
    ]);

    return {
        mario,
        ladder,
        ladder4: () => ladder(4),
        bullet,
        cannon,
        caveman,
        rock,
        rope,
        snake,
    };
}
