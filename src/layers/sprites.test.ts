import Camera from '../Camera.js';
import Entity from '../Entity.js';
import {createSpriteLayer} from './sprites.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertIdentityOrder(
    actual: readonly Entity[],
    expected: readonly Entity[],
    message: string,
): void {
    if (
        actual.length !== expected.length
        || actual.some((entity, index) => entity !== expected[index])
    ) {
        throw new Error(message);
    }
}

const drawEvents: string[] = [];
const entity = (name: string): Entity => {
    const result = new Entity();
    result.draw = (): void => {
        drawEvents.push(name);
    };
    return result;
};

const mario = entity('mario');
const shell = entity('shell');
const equalPriority = entity('equal-priority');
const entities = new Set([mario, shell, equalPriority]);
const drawSprites = createSpriteLayer(entities);
const translations: Array<[number, number]> = [];
const screenContext = {
    save: (): void => {},
    translate: (x: number, y: number): void => {
        translations.push([x, y]);
    },
    restore: (): void => {},
} as unknown as CanvasRenderingContext2D;
const camera = new Camera();

assertEqual(
    [mario.zIndex, shell.zIndex, equalPriority.zIndex],
    [0, 0, 0],
    'Default entity z-index',
);

drawSprites(screenContext, camera);
assertEqual(
    drawEvents,
    ['mario', 'shell', 'equal-priority'],
    'Equal z-index preserves insertion order',
);

drawEvents.length = 0;
shell.zIndex = 1;
drawSprites(screenContext, camera);
assertEqual(
    drawEvents,
    ['mario', 'equal-priority', 'shell'],
    'Higher z-index draws after Mario',
);

drawEvents.length = 0;
shell.zIndex = -1;
drawSprites(screenContext, camera);
assertEqual(
    drawEvents,
    ['shell', 'mario', 'equal-priority'],
    'Runtime z-index change applies on the next draw',
);
assertIdentityOrder(
    [...entities],
    [mario, shell, equalPriority],
    'Sprite sorting does not mutate entity membership order',
);
assertEqual(
    translations,
    Array.from({length: 9}, () => [0, 0]),
    'Entities draw directly at their camera-relative position without clipping',
);

console.log('Entity sprite z-index regression passed');
