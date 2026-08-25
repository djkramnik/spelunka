import SpriteSheet from './SpriteSheet.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const bufferContext = {
    scale: (): void => {},
    translate: (): void => {},
    drawImage: (): void => {},
} as unknown as CanvasRenderingContext2D;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
        createElement: (): HTMLCanvasElement => ({
            width: 0,
            height: 0,
            getContext: (): CanvasRenderingContext2D => bufferContext,
        }) as unknown as HTMLCanvasElement,
    },
});

try {
    const sheet = new SpriteSheet({} as CanvasImageSource);
    sheet.define('large-player', 0, 0, 32, 24, [10, 22], 0.5);

    const draws: Array<[number, number, number, number]> = [];
    const context = {
        drawImage: (
            _image: CanvasImageSource,
            x: number,
            y: number,
            width: number,
            height: number,
        ): void => {
            draws.push([x, y, width, height]);
        },
    } as unknown as CanvasRenderingContext2D;

    sheet.drawFrame('large-player', context, 7, 16);
    sheet.drawFrame('large-player', context, 7, 16, true);
    sheet.draw('large-player', context, 3, 4);

    assertEqual(
        draws,
        [[2, 5, 16, 12], [-4, 5, 16, 12], [3, 4, 16, 12]],
        'Scaled frames align to their pivot and preserve top-left drawing',
    );
} finally {
    if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
        Reflect.deleteProperty(globalThis, 'document');
    }
}

console.log('Scaled pivoted sprite regression passed');
