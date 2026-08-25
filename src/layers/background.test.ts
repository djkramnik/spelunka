import Camera from '../Camera.js';
import Level from '../Level.js';
import type {NamedTileSpec} from '../loaders/schemas.js';
import type SpriteSheet from '../SpriteSheet.js';
import {Matrix} from '../math.js';
import {createBackgroundLayer} from './background.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const tileDraws: Array<{name: string; x: number; y: number}> = [];
const screenDraws: Array<{x: number; y: number}> = [];
const bufferContext = {
    clearRect: (): void => {},
} as unknown as CanvasRenderingContext2D;
const buffer = {
    width: 0,
    height: 0,
    getContext: (): CanvasRenderingContext2D => bufferContext,
} as unknown as HTMLCanvasElement;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
        createElement: (): HTMLCanvasElement => buffer,
    },
});

try {
    const sprites = {
        animations: new Map<string, unknown>(),
        drawAnim: (): void => {},
        drawTile: (name: string, _context: CanvasRenderingContext2D, x: number, y: number): void => {
            tileDraws.push({name, x, y});
        },
    } as unknown as SpriteSheet;
    const screenContext = {
        drawImage: (
            _image: CanvasImageSource,
            x: number,
            y: number,
        ): void => {
            screenDraws.push({x, y});
        },
    } as unknown as CanvasRenderingContext2D;
    const tiles = new Matrix<NamedTileSpec>();
    const tile = (name: string): NamedTileSpec => ({name, ranges: [[0, 0]]});
    tiles.set(0, 13, tile('above-view'));
    tiles.set(0, 14, tile('view-top'));
    tiles.set(0, 25, tile('view-bottom-buffer'));
    tiles.set(0, 26, tile('below-view'));

    const level = new Level();
    const camera = new Camera();
    camera.pos.set(0, 232);
    const drawBackground = createBackgroundLayer(level, tiles, sprites);
    drawBackground(screenContext, camera);

    assertEqual(tileDraws, [
        {name: 'view-top', x: 0, y: 0},
        {name: 'view-bottom-buffer', x: 0, y: 11},
    ], 'Camera-relative tile rows');
    assertEqual(screenDraws, [{x: 0, y: -8}], 'Sub-tile camera offset');
    assertEqual([buffer.width, buffer.height], [336, 196], 'Background buffer size');
} finally {
    if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
        Reflect.deleteProperty(globalThis, 'document');
    }
}

console.log('Vertical background rendering regression passed');
