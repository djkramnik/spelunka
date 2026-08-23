import Level from './Level.js';
import {LevelSpecSchema} from './loaders/schemas.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const baseLevelSpec = {
    spriteSheet: 'overworld',
    musicSheet: 'silent',
    patternSheet: 'overworld-pattern',
    layers: [],
    entities: [],
};

const parsedLevel = LevelSpecSchema.parse({
    ...baseLevelSpec,
    size: [16, 30],
});
assertEqual(parsedLevel.size, [16, 30], 'Parsed level size');

for (const size of [
    [0, 30],
    [16, 0],
    [-1, 30],
    [16.5, 30],
]) {
    if (LevelSpecSchema.safeParse({...baseLevelSpec, size}).success) {
        throw new Error(`Expected invalid level size to be rejected: ${size.join('x')}`);
    }
}

const verticalLevel = new Level();
verticalLevel.setDimensions(...parsedLevel.size);
assertEqual(
    [verticalLevel.dimensions.x, verticalLevel.dimensions.y],
    [16, 30],
    'Runtime level dimensions',
);
assertEqual(
    [verticalLevel.size.x, verticalLevel.size.y],
    [256, 480],
    'Runtime level pixel size',
);

verticalLevel.camera.pos.set(100, 500);
verticalLevel.camera.clampTo(verticalLevel.size);
assertEqual(
    [verticalLevel.camera.pos.x, verticalLevel.camera.pos.y],
    [0, 240],
    'Maximum camera position',
);

verticalLevel.camera.pos.set(-20, -40);
verticalLevel.camera.clampTo(verticalLevel.size);
assertEqual(
    [verticalLevel.camera.pos.x, verticalLevel.camera.pos.y],
    [0, 0],
    'Minimum camera position',
);

const existingLevel = new Level();
existingLevel.setDimensions(212, 15);
existingLevel.camera.pos.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
existingLevel.camera.clampTo(existingLevel.size);
assertEqual(
    [existingLevel.camera.pos.x, existingLevel.camera.pos.y],
    [3136, 0],
    'Existing level camera bounds',
);

const roomLevel = new Level();
roomLevel.setDimensions(32, 15);
roomLevel.camera.pos.set(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
roomLevel.camera.clampTo(roomLevel.size);
assertEqual(
    [roomLevel.camera.pos.x, roomLevel.camera.pos.y],
    [256, 0],
    'The Room camera bounds',
);

console.log('Level dimensions and camera bounds regression passed');
