import Camera from '../Camera.js';
import Level from '../Level.js';
import type {NamedTileSpec} from '../loaders/schemas.js';
import type SpriteSheet from '../SpriteSheet.js';
import {Matrix} from '../math.js';
import {OUTPUT_SCALE} from '../Renderer.js';
import {
    composeGroundTileNames,
    createBackgroundLayer,
    getExposedGroundEdges,
    getMinesBackgroundTileNames,
} from './background.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const tile = (name: string): NamedTileSpec => ({name, ranges: [[0, 0]]});
const compositionTiles = new Matrix<NamedTileSpec>();
compositionTiles.set(0, 0, tile('ground'));
compositionTiles.set(1, 0, tile('ground'));
compositionTiles.set(0, 1, tile('ground'));
compositionTiles.set(1, 1, tile('ground'));
const composition = composeGroundTileNames(compositionTiles);
const compositionNames = [
    composition.get(0, 0),
    composition.get(1, 0),
    composition.get(0, 1),
    composition.get(1, 1),
];
const variant = compositionNames[0]?.match(/^ground-2x2-(\d)-top-left$/)?.[1];
assertEqual(
    compositionNames,
    [
        `ground-2x2-${variant}-top-left`,
        `ground-2x2-${variant}-top-right`,
        `ground-2x2-${variant}-bottom-left`,
        `ground-2x2-${variant}-bottom-right`,
    ],
    'Connected 2x2 terrain uses one coherent atlas chunk',
);
assertEqual(
    getExposedGroundEdges(compositionTiles, 0, 0),
    ['left', 'top'],
    'Only exterior sides receive rocky edges',
);
assertEqual(
    getExposedGroundEdges(compositionTiles, 1, 1),
    ['right', 'bottom'],
    'Opposite exterior corner receives the complementary edges',
);
assertEqual(
    getMinesBackgroundTileNames('sky', 23, 13),
    ['sky-fill-3-1', 'sky-decor-3-1'],
    'Mines background selection uses stable world-coordinate periods',
);
assertEqual(
    getMinesBackgroundTileNames('sky', -1, -1),
    ['sky-fill-3-3', 'sky-decor-19-11'],
    'Mines background assembly wraps safely at negative world coordinates',
);
assertEqual(
    getMinesBackgroundTileNames('ground', 23, 13),
    undefined,
    'Mines background selection does not replace foreground terrain',
);
const viewportDecorationNames = new Set<string>();
for (let y = 0; y < 12; y += 1) {
    for (let x = 0; x < 20; x += 1) {
        const names = getMinesBackgroundTileNames('sky', x, y);
        if (names) {
            viewportDecorationNames.add(names[1]);
        }
    }
}
assertEqual(
    viewportDecorationNames.size,
    240,
    'One viewport receives the complete 20x12 decoration assembly',
);
assertEqual(
    getMinesBackgroundTileNames('sky', 20, 12),
    getMinesBackgroundTileNames('sky', 0, 0),
    'Background repetition begins only after the full assembly region',
);

const terrainNames = [
    'ground-1',
    'ground-2',
    'ground-3',
    'ground-4',
    'ground-2x1-1-left',
    'ground-2x1-1-right',
    'ground-2x1-2-left',
    'ground-2x1-2-right',
    'ground-1x2-1-top',
    'ground-1x2-1-bottom',
    'ground-1x2-2-top',
    'ground-1x2-2-bottom',
    ...Array.from({length: 4}, (_, index) => {
        const chunkVariant = index + 1;
        return [
            `ground-2x2-${chunkVariant}-top-left`,
            `ground-2x2-${chunkVariant}-top-right`,
            `ground-2x2-${chunkVariant}-bottom-left`,
            `ground-2x2-${chunkVariant}-bottom-right`,
        ];
    }).flat(),
    'ground-edge-top-1',
    'ground-edge-top-2',
    'ground-edge-top-3',
    'ground-edge-bottom-1',
    'ground-edge-bottom-2',
    'ground-edge-left',
    'ground-edge-right',
    ...Array.from({length: 4}, (_, y) => (
        Array.from({length: 4}, (__, x) => `sky-fill-${x}-${y}`)
    )).flat(),
    ...Array.from({length: 12}, (_, y) => (
        Array.from({length: 20}, (__, x) => `sky-decor-${x}-${y}`)
    )).flat(),
];

const tileDraws: Array<{name: string; x: number; y: number}> = [];
const screenDraws: Array<{x: number; y: number}> = [];
const bufferTransforms: number[][] = [];
const bufferContext = {
    imageSmoothingEnabled: true,
    setTransform: (...values: number[]): void => {
        bufferTransforms.push(values);
    },
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
        tiles: new Map(terrainNames.map(name => [name, {}])),
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
    tiles.set(0, 13, tile('above-view'));
    tiles.set(0, 14, tile('sky'));
    tiles.set(0, 25, tile('sky'));
    tiles.set(0, 26, tile('below-view'));
    const originalGround = tile('ground');
    tiles.set(1, 14, originalGround);

    const level = new Level();
    const camera = new Camera();
    camera.pos.set(0, 232);
    const drawBackground = createBackgroundLayer(level, tiles, sprites);
    drawBackground(screenContext, camera);

    const baseDraws = tileDraws.filter(draw => !draw.name.startsWith('ground-edge-'));
    assertEqual(baseDraws.slice(0, 5), [
        {name: 'above-view', x: 1, y: 0},
        {name: 'sky-fill-0-2', x: 1, y: 1},
        {name: 'sky-decor-0-2', x: 1, y: 1},
        {name: 'sky-fill-0-1', x: 1, y: 12},
        {name: 'sky-decor-0-1', x: 1, y: 12},
    ], 'Padded camera rows retain opaque fill below transparent decorations');
    const groundDraw = baseDraws.find(draw => draw.name.startsWith('ground-'));
    assertEqual(
        groundDraw,
        {name: groundDraw?.name, x: 2, y: 1},
        'Ground remains aligned to its collision cell',
    );
    const edgeDraws = tileDraws.filter(draw => draw.name.startsWith('ground-edge-'));
    assertEqual(
        edgeDraws.map(({name, x, y}) => ({
            side: name.replace('ground-edge-', '').replace(/-\d$/, ''),
            x,
            y,
        })),
        [
            {side: 'left', x: 1.5, y: 1},
            {side: 'right', x: 2.5, y: 1},
            {side: 'top', x: 2, y: 0.6},
            {side: 'bottom', x: 2, y: 1.6},
        ],
        'Rocky edges overhang each exposed boundary',
    );
    assertEqual(tiles.get(1, 14), originalGround, 'Rendering does not alter collision tiles');
    assertEqual(screenDraws, [{x: -16, y: -24}], 'Padded sub-tile camera offset');
    assertEqual(
        [buffer.width, buffer.height],
        [368 * OUTPUT_SCALE, 228 * OUTPUT_SCALE],
        'Background buffer includes one terrain-overhang cell on every side',
    );
    assertEqual(
        bufferTransforms,
        [[OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0]],
        'Background tiles render at output scale',
    );
    assertEqual(
        bufferContext.imageSmoothingEnabled,
        false,
        'Background scaling remains crisp',
    );
} finally {
    if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
        Reflect.deleteProperty(globalThis, 'document');
    }
}

console.log('Neighbor-aware terrain rendering regression passed');
