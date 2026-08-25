import {readFileSync} from 'node:fs';
import {createBulletFactory} from '../src/entities/Bullet.js';
import {createGoombaFactory} from '../src/entities/Goomba.js';
import {createKoopaFactory} from '../src/entities/Koopa.js';
import {createRedShellFactory} from '../src/entities/RedShell.js';
import {SpriteSheetSchema} from '../src/loaders/schemas.js';
import type SpriteSheet from '../src/SpriteSheet.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const expectedPivots = new Map<string, Record<string, [number, number]>>([
    ['goomba', {
        'walk-1': [8, 16],
        'walk-2': [8, 16],
        flat: [8, 8],
    }],
    ['red-shell', {idle: [8, 14]}],
    ['koopa', {
        'walk-1': [8, 23],
        'walk-2': [8, 24],
        hiding: [8, 14],
        'hiding-with-legs': [8, 15],
    }],
    ['bullet', {bullet: [8, 14]}],
]);

for (const [sheetName, pivots] of expectedPivots) {
    const spec = SpriteSheetSchema.parse(JSON.parse(readFileSync(
        new URL(`../public/sprites/${sheetName}.json`, import.meta.url),
        'utf8',
    )));

    assertEqual(spec.frameScale, 0.75, `${sheetName} tile-relative scale`);
    for (const frame of spec.frames) {
        assertEqual(
            frame.pivot,
            pivots[frame.name],
            `${sheetName}/${frame.name} visible-art pivot`,
        );
    }
}

const draws: Array<[string, number, number, boolean]> = [];
const sprite = {
    getAnimation: (): (() => string) => () => 'walk-1',
    drawFrame: (
        name: string,
        _context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip = false,
    ): void => {
        draws.push([name, pivotX, pivotY, flip]);
    },
} as unknown as SpriteSheet;
const context = {} as CanvasRenderingContext2D;

createGoombaFactory(sprite)().draw(context);
createRedShellFactory(sprite)().draw(context);
createKoopaFactory(sprite)().draw(context);
createBulletFactory(sprite)().draw(context);

assertEqual(
    draws,
    [
        ['walk-1', 8, 16, false],
        ['idle', 8, 16, false],
        ['walk-1', 8, 24, false],
        ['bullet', 8, 14, false],
    ],
    'Entity art anchors to each collider bottom-centre',
);

console.log('Tile-relative entity sprite scale and alignment passed');
