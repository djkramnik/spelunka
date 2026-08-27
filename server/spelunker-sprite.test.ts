import {readFileSync} from 'node:fs';
import {SpriteSheetSchema} from '../src/loaders/schemas.js';
import {OUTPUT_SCALE} from '../src/Renderer.js';

const LEGACY_FRAME_NAMES = [
    'idle',
    'walk-1',
    'walk-2',
    'walk-3',
    'run-1',
    'run-2',
    'run-3',
    'run-4',
    'break',
    'skid',
    'jump',
    'fall',
    'carry-idle',
    'carry-run-1',
    'carry-run-2',
    'carry-run-3',
    'carry-run-4',
    'carry-jump',
    'carry-fall',
    'throw',
    'reaction-stunned',
    'reaction-dead',
] as const;

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const spec = SpriteSheetSchema.parse(JSON.parse(readFileSync(
    new URL('../public/sprites/mario.json', import.meta.url),
    'utf8',
)));
const png = readFileSync(new URL(`../public${spec.imageURL}`, import.meta.url));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
const colorType = png[25];

assertEqual([width, height, colorType], [320, 160, 6], 'RGBA sheet metadata');
assertEqual(spec.frameScale, 0.25, 'HD source pixels map to one-quarter world units');
assertEqual(
    spec.frameScale * OUTPUT_SCALE,
    1,
    'Each HD source pixel maps to one output pixel',
);

const frames = new Map(spec.frames.map(frame => [frame.name, frame]));
assertEqual(
    LEGACY_FRAME_NAMES.filter(name => !frames.has(name)),
    [],
    'Every declared legacy player frame has artwork',
);

for (const name of LEGACY_FRAME_NAMES) {
    const frame = frames.get(name);
    if (!frame) {
        throw new Error(`Missing validated frame: ${name}`);
    }
    const [x, y, frameWidth, frameHeight] = frame.rect;
    assertEqual(
        [frameWidth, frameHeight, frame.pivot],
        [80, 80, [40, 75]],
        `${name} frame dimensions and pivot`,
    );
    assertEqual(
        [frameWidth * spec.frameScale, frameHeight * spec.frameScale],
        [20, 20],
        `${name} provides a 1.25-tile transparent frame`,
    );
    if (x < 0 || y < 0 || x + frameWidth > width || y + frameHeight > height) {
        throw new Error(`${name} frame exceeds the sprite sheet`);
    }
}

const animations = new Map(spec.animations.map(animation => [
    animation.name,
    animation.frames,
]));
assertEqual(
    animations.get('walk'),
    ['walk-1', 'walk-2', 'walk-3'],
    'Walk loop frames',
);
assertEqual(
    animations.get('run'),
    ['run-1', 'run-2', 'run-3', 'run-4'],
    'Run loop frames',
);

console.log('Legacy Spelunker sprite sheet metadata remains valid');
