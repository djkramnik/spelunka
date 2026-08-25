import Renderer, {
    LOGICAL_HEIGHT,
    LOGICAL_WIDTH,
    OUTPUT_HEIGHT,
    OUTPUT_SCALE,
    OUTPUT_WIDTH,
} from './Renderer.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const renderEvents: unknown[][] = [];
const outputContext = {
    imageSmoothingEnabled: true,
    setTransform: (...args: unknown[]): void => {
        renderEvents.push(['transform', ...args]);
    },
    drawImage: (...args: unknown[]): void => {
        renderEvents.push(['draw', ...args]);
    },
} as unknown as CanvasRenderingContext2D;
const outputCanvas = {
    width: 0,
    height: 0,
    getContext: (): CanvasRenderingContext2D => outputContext,
} as unknown as HTMLCanvasElement;

const renderer = new Renderer(outputCanvas);

assertEqual(
    [LOGICAL_WIDTH, LOGICAL_HEIGHT, OUTPUT_SCALE],
    [320, 180, 4],
    'Logical 16:9 render dimensions and integer output scale',
);
assertEqual(
    [outputCanvas.width, outputCanvas.height],
    [OUTPUT_WIDTH, OUTPUT_HEIGHT],
    'High-resolution output dimensions',
);
assertEqual(
    outputContext.imageSmoothingEnabled,
    false,
    'Pixel presentation remains crisp',
);
assertEqual(
    renderEvents,
    [['transform', OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0]],
    'Logical world coordinates render directly at HD resolution',
);

renderer.present();
assertEqual(
    renderEvents.length,
    1,
    'Presentation does not resample an intermediate low-resolution canvas',
);

console.log('Direct logical-to-HD renderer regression passed');
