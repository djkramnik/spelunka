import Camera from '../Camera.js';
import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import {createSpriteLayer} from '../layers/sprites.js';
import {
    BloodParticle,
    emitBloodSplatter,
} from './BloodSplatter.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertClose(actual: number, expected: number, message: string): void {
    if (Math.abs(actual - expected) > 1e-9) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function sequenceRandom(values: readonly number[]): () => number {
    let index = 0;
    return (): number => {
        const value = values[index];
        if (value === undefined) {
            throw new Error('Deterministic random sequence exhausted');
        }
        index++;
        return value;
    };
}

const configuredLevel = new Level();
const configuredParticles = emitBloodSplatter(
    configuredLevel,
    {x: 100, y: 80},
    {
        count: 2,
        palette: ['dark-red', 'bright-red'],
        particleSize: [1, 3],
        horizontalSpread: 4,
        verticalSpread: 2,
        horizontalSpeed: [20, 40],
        upwardSpeed: [50, 70],
        gravity: 400,
        lifetime: [0.3, 0.5],
        zIndex: 3,
        random: sequenceRandom([
            0, 0.5, 0.25, 0.5, 0.5, 0, 0.5, 0.5,
            0.9, 0.25, 0.75, 1, 0, 0.99, 1, 0,
        ]),
    },
);

assertEqual(configuredParticles.length, 2, 'Configured particle count');
assertEqual(configuredLevel.entities.size, 2, 'Particles enter the supplied level');
assertEqual(
    configuredParticles.map(particle => ({
        position: [particle.pos.x, particle.pos.y],
        velocity: [particle.vel.x, particle.vel.y],
        colour: particle.colour,
        size: [particle.size.x, particle.size.y],
        gravity: particle.gravity,
        lifetime: particle.expiresAfter,
        zIndex: particle.zIndex,
        collisions: particle.entityCollisionsEnabled,
    })),
    [
        {
            position: [98, 79],
            velocity: [-30, -60],
            colour: 'dark-red',
            size: [2, 2],
            gravity: 400,
            lifetime: 0.4,
            zIndex: 3,
            collisions: false,
        },
        {
            position: [101, 81],
            velocity: [40, -50],
            colour: 'bright-red',
            size: [3, 3],
            gravity: 400,
            lifetime: 0.3,
            zIndex: 3,
            collisions: false,
        },
    ],
    'Injected randomness controls spread, outward launch, and configured bounds',
);

const firstParticle = configuredParticles[0] as BloodParticle;
firstParticle.update({deltaTime: 0.1} as GameContext, configuredLevel);
assertClose(firstParticle.pos.x, 95, 'Horizontal particle motion');
assertClose(firstParticle.pos.y, 75, 'Ballistic upward particle motion');
assertClose(firstParticle.vel.y, -20, 'Gravity changes vertical velocity');
assertClose(firstParticle.lifetime, 0.1, 'Particle records elapsed lifetime');

const passiveEntity = new Entity();
passiveEntity.pos.copy(firstParticle.pos);
passiveEntity.size.set(16, 16);
assertEqual(
    new EntityCollider(new Set([firstParticle, passiveEntity])).check(),
    {candidateChecks: 0, overlaps: 0},
    'Blood particles do not participate in entity collisions',
);

const renderLevel = new Level();
const [renderParticle] = emitBloodSplatter(
    renderLevel,
    {x: 100, y: 80},
    {
        count: 1,
        palette: ['render-red'],
        particleSize: [2, 2],
        horizontalSpread: 0,
        verticalSpread: 0,
        horizontalSpeed: [0, 0],
        upwardSpeed: [0, 0],
        lifetime: [1, 1],
        random: (): number => 0.5,
    },
);
if (!renderParticle) {
    throw new Error('Render particle was not emitted');
}
const camera = new Camera();
camera.pos.set(20, 30);
const translations: Array<[number, number]> = [];
const fills: Array<[string, number, number, number, number]> = [];
const renderContext = {
    fillStyle: '',
    save: (): void => {},
    translate: (x: number, y: number): void => {
        translations.push([x, y]);
    },
    fillRect(
        this: {fillStyle: string},
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        fills.push([this.fillStyle, x, y, width, height]);
    },
    restore: (): void => {},
} as unknown as CanvasRenderingContext2D;
createSpriteLayer(renderLevel.entities)(renderContext, camera);
assertEqual(translations, [[80, 50]], 'Particle rendering is camera-relative');
assertEqual(
    fills,
    [['render-red', -1, -1, 2, 2]],
    'Particle draws its configured colour and centred size',
);

firstParticle.update({deltaTime: 1} as GameContext, configuredLevel);
assertClose(firstParticle.lifetime, 0.4, 'Expiry clips an oversized update');
assertEqual(
    configuredLevel.entities.has(firstParticle),
    false,
    'Expired particle removes itself deterministically',
);

const independentLevel = new Level();
const [shortParticle] = emitBloodSplatter(
    independentLevel,
    {x: 10, y: 20},
    {count: 1, lifetime: [0.1, 0.1], random: (): number => 0.5},
);
const [longParticle] = emitBloodSplatter(
    independentLevel,
    {x: 200, y: 220},
    {count: 1, lifetime: [1, 1], random: (): number => 0.5},
);
if (!shortParticle || !longParticle) {
    throw new Error('Independent particles were not emitted');
}
shortParticle.update({deltaTime: 0.1} as GameContext, independentLevel);
assertEqual(
    [
        independentLevel.entities.has(shortParticle),
        independentLevel.entities.has(longParticle),
        longParticle.lifetime,
        [longParticle.pos.x, longParticle.pos.y],
    ],
    [false, true, 0, [202, 220]],
    'Simultaneous bursts own independent motion and expiry state',
);

const repeatedLevel = new Level();
for (let burst = 0; burst < 5; burst++) {
    emitBloodSplatter(
        repeatedLevel,
        {x: burst * 10, y: 0},
        {count: 2, lifetime: [0.05, 0.05], random: (): number => 0.5},
    );
}
assertEqual(repeatedLevel.entities.size, 10, 'Repeated bursts retain every live particle');
[...repeatedLevel.entities].forEach(entity => {
    entity.update({deltaTime: 0.05} as GameContext, repeatedLevel);
});
assertEqual(repeatedLevel.entities.size, 0, 'Repeated bursts leave no expired entities');

console.log('Procedural blood splatter geometry, motion, rendering, and cleanup passed');
