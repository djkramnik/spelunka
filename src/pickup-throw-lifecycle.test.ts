import AudioBoard from './AudioBoard.js';
import {createMarioFactory} from './entities/Mario.js';
import {createRedShellFactory} from './entities/RedShell.js';
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
    draw: (): void => {},
    getAnimation: (): (() => string) => (): string => 'idle',
} as unknown as SpriteSheet;

const gameContext = {
    audioContext: {},
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

const mario = createMarioFactory(sprite, new AudioBoard())();
mario.pos.set(64, 144);
const shell = createRedShellFactory(sprite)();
shell.pos.set(76, 136);
level.entities.add(mario);
level.entities.add(shell);

const carrier = mario.traits.get(Carrier);
const pickable = shell.traits.get(Pickable);
const shellPhysics = shell.traits.get(Physics);

function update(count = 1): void {
    for (let step = 0; step < count; step++) {
        level.update(gameContext);
    }
}

function moveMarioIntoShellContact(): void {
    mario.pos.set(shell.pos.x, shell.bounds.bottom - mario.size.y);
    mario.vel.set(0, 0);
    update();
}

function updateUntilShellSettles(maxUpdates: number): number {
    for (let elapsed = 1; elapsed <= maxUpdates; elapsed++) {
        update();
        if (shell.vel.x === 0
            && shell.vel.y === 0
            && shellPhysics.grounded) {
            return elapsed;
        }
    }

    throw new Error(`Shell did not settle within ${maxUpdates} updates`);
}

update();
assertEqual(
    mario.pickupOrThrow() === shell,
    true,
    'Mario picks up a colliding shell through the real carrier lifecycle',
);
assertEqual(
    [carrier.carried === shell, pickable.carrier === mario],
    [true, true],
    'Initial pickup establishes one matching carrier relationship',
);

assertEqual(
    mario.pickupOrThrow() === shell,
    true,
    'Mario throws the carried shell',
);
assertEqual(
    [carrier.carried, pickable.carrier],
    [null, null],
    'Throw clears both sides of the carrier relationship',
);
assertEqual(
    pickable.isThrowerProtected(mario),
    true,
    'First throw starts thrower grace',
);

update(3);
assertEqual(
    shell.vel.x === 0 && shell.vel.y === 0,
    false,
    'First thrown shell is still moving before re-pickup',
);
moveMarioIntoShellContact();
assertEqual(
    mario.pickupOrThrow() === shell,
    true,
    'A moving thrown shell becomes a pickup candidate again',
);
assertEqual(
    [shell.vel.x, shell.vel.y],
    [0, 0],
    'Re-pickup clears residual shell motion',
);
assertEqual(
    pickable.isThrowerProtected(mario),
    false,
    'Re-pickup clears stale thrower grace',
);

assertEqual(
    mario.pickupOrThrow() === shell,
    true,
    'Mario throws the shell for a second cycle',
);
assertEqual(
    pickable.isThrowerProtected(mario),
    true,
    'Second throw starts a fresh grace period',
);

const updatesToSettle = updateUntilShellSettles(180);
assertEqual(
    updatesToSettle < 180,
    true,
    'Second throw settles within the bounded headless simulation',
);
assertEqual(
    [shell.vel.x, shell.vel.y],
    [0, 0],
    'Thrown shell reaches exact rest before settled re-pickup',
);
assertEqual(
    pickable.isThrowerProtected(mario),
    false,
    'Thrower grace expires while the second throw runs',
);

moveMarioIntoShellContact();
assertEqual(
    mario.pickupOrThrow() === shell,
    true,
    'A settled shell becomes a pickup candidate again',
);
assertEqual(
    [
        carrier.carried === shell,
        pickable.carrier === mario,
        shell.vel.x,
        shell.vel.y,
    ],
    [true, true, 0, 0],
    'Settled re-pickup restores one stable carrier relationship',
);

update(2);
assertEqual(
    [
        carrier.carried === shell,
        pickable.carrier === mario,
        shell.vel.x,
        shell.vel.y,
    ],
    [true, true, 0, 0],
    'Carried state remains stable across later level updates',
);

console.log('Headless pickup, throw, settle, and re-pickup lifecycle passed');
