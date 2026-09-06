import {readFileSync} from 'node:fs';
import {createBulletFactory} from '../src/entities/Bullet.js';
import {createRockFactory} from '../src/entities/Rock.js';
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

createRockFactory(sprite)().draw(context);
createBulletFactory(sprite)().draw(context);

assertEqual(
    draws,
    [
        ['idle', 4, 4, false],
        ['bullet', 8, 14, false],
    ],
    'Entity art uses each entity factory\'s declared collider anchor',
);

console.log('Tile-relative entity sprite scale and alignment passed');
