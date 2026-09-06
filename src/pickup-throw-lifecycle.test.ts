import AudioBoard from './AudioBoard.js';
import {createMarioFactory} from './entities/Mario.js';
import {createRockFactory} from './entities/Rock.js';
import Level from './Level.js';
import {Matrix} from './math.js';
import PerformanceMetrics from './PerformanceMetrics.js';
import type {GameContext} from './Scene.js';
import type SpriteSheet from './SpriteSheet.js';
import type {CollisionTile} from './TileCollider.js';
import Carrier from './traits/Carrier.js';
import Physics from './traits/Physics.js';
import Pickable from './traits/Pickable.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const sprite = {
    drawFrame: (): void => {},
    getAnimation: (): (() => string) => (): string => 'idle',
} as unknown as SpriteSheet;

const gameContext = {
    audioContext: {
        createBufferSource: () => ({
            connect: (): void => {},
            start: (): void => {},
            buffer: null,
        }),
        destination: {},
    },
    deltaTime: 1 / 60,
    entityFactory: {},
    performanceMetrics: new PerformanceMetrics({
        enabled: false,
        exportUrl: '',
    }),
} as unknown as GameContext;

const level = new Level();
level.setDimensions(64, 15);
const ground = new Matrix<CollisionTile>();
for (let x = 0; x < level.dimensions.x; x++) {
    ground.set(x, 10, {type: 'ground'});
}
level.tileCollider.addGrid(ground);

const audio = new AudioBoard();
audio.addAudio('throw-item', {} as AudioBuffer);
const mario = createMarioFactory(sprite, audio)();
mario.pos.set(64, 144);
const rock = createRockFactory(sprite)();
rock.pos.set(76, 152);
level.entities.add(mario);
level.entities.add(rock);

const carrier = mario.traits.get(Carrier);
const pickable = rock.traits.get(Pickable);
const rockPhysics = rock.traits.get(Physics);

function update(count = 1): void {
    for (let step = 0; step < count; step++) {
        level.update(gameContext);
    }
}

function moveMarioIntoRockContact(): void {
    mario.pos.set(rock.pos.x, rock.bounds.bottom - mario.size.y);
    mario.vel.set(0, 0);
    update();
}

function updateUntilRockSettles(maxUpdates: number): number {
    for (let elapsed = 1; elapsed <= maxUpdates; elapsed++) {
        update();
        if (rock.vel.x === 0
            && rock.vel.y === 0
            && rockPhysics.grounded) {
            return elapsed;
        }
    }

    throw new Error(`Rock did not settle within ${maxUpdates} updates`);
}

update();
assertEqual(
    mario.pickupOrThrow() === rock,
    true,
    'Mario picks up a colliding rock through the real carrier lifecycle',
);
assertEqual(
    [carrier.carried === rock, pickable.carrier === mario],
    [true, true],
    'Initial pickup establishes one matching carrier relationship',
);

assertEqual(
    mario.pickupOrThrow() === rock,
    true,
    'Mario throws the carried rock',
);
assertEqual(
    [carrier.carried, pickable.carrier],
    [null, null],
    'Throw clears both sides of the carrier relationship',
);
assertEqual(
    pickable.isThrowerProtected(rock, mario),
    true,
    'First throw starts thrower grace',
);

update(3);
assertEqual(
    rock.vel.x === 0 && rock.vel.y === 0,
    false,
    'First thrown rock is still moving before re-pickup',
);
moveMarioIntoRockContact();
assertEqual(
    mario.pickupOrThrow() === rock,
    true,
    'A moving thrown rock becomes a pickup candidate again',
);
assertEqual(
    [rock.vel.x, rock.vel.y],
    [0, 0],
    'Re-pickup clears residual rock motion',
);
assertEqual(
    pickable.isThrowerProtected(rock, mario),
    false,
    'Re-pickup clears stale thrower grace',
);

assertEqual(
    mario.pickupOrThrow() === rock,
    true,
    'Mario throws the rock for a second cycle',
);
assertEqual(
    pickable.isThrowerProtected(rock, mario),
    true,
    'Second throw starts a fresh grace period',
);

const updatesToSettle = updateUntilRockSettles(180);
assertEqual(
    updatesToSettle < 180,
    true,
    'Second throw settles within the bounded headless simulation',
);
assertEqual(
    [rock.vel.x, rock.vel.y],
    [0, 0],
    'Thrown rock reaches exact rest before settled re-pickup',
);
assertEqual(
    pickable.isThrowerProtected(rock, mario),
    false,
    'Thrower grace expires while the second throw runs',
);

moveMarioIntoRockContact();
assertEqual(
    mario.pickupOrThrow() === rock,
    true,
    'A settled rock becomes a pickup candidate again',
);
assertEqual(
    [
        carrier.carried === rock,
        pickable.carrier === mario,
        rock.vel.x,
        rock.vel.y,
    ],
    [true, true, 0, 0],
    'Settled re-pickup restores one stable carrier relationship',
);

update(2);
assertEqual(
    [
        carrier.carried === rock,
        pickable.carrier === mario,
        rock.vel.x,
        rock.vel.y,
    ],
    [true, true, 0, 0],
    'Carried state remains stable across later level updates',
);

console.log('Headless rock pickup, throw, settle, and re-pickup lifecycle passed');
