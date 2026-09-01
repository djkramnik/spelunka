import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';

import {LevelSpecSchema} from '../src/loaders/schemas.js';

const levelsDirectory = new URL('../public/levels/', import.meta.url);
const levelFiles = (await readdir(levelsDirectory))
    .filter(fileName => fileName.endsWith('.json'))
    .sort();

assert.ok(levelFiles.length > 0, 'Expected at least one level definition');

const specialLevelSizes = new Map<string, readonly [number, number]>([
    ['vertical-shaft.json', [16, 75]],
    ['room.json', [32, 15]],
    ['tutorial-1-scale.json', [42, 19]],
    ['spelunky-hd-entities.json', [32, 15]],
]);

for (const levelFile of levelFiles) {
    const levelUrl = new URL(levelFile, levelsDirectory);
    const level = LevelSpecSchema.parse(JSON.parse(await readFile(levelUrl, 'utf8')));
    const expectedSize = specialLevelSizes.get(levelFile) ?? [212, 15];
    assert.deepEqual(
        level.size,
        expectedSize,
        `Unexpected dimensions for level ${levelFile}`,
    );
}

const shaftUrl = new URL('vertical-shaft.json', levelsDirectory);
const shaft = LevelSpecSchema.parse(JSON.parse(await readFile(shaftUrl, 'utf8')));
assert.equal(shaft.name, 'THE SHAFT');
assert.deepEqual(shaft.playerSpawn, [64, 64]);
assert.deepEqual(shaft.triggers, [{
    type: 'teleport',
    pos: [224, 1168],
    size: [16, 16],
    destination: [64, 64],
}]);

const shaftGround = shaft.layers
    .flatMap(layer => layer.tiles)
    .find(tile => 'name' in tile && tile.name === 'ground');
assert.deepEqual(shaftGround, {
    name: 'ground',
    type: 'ground',
    ranges: [
        [0, 16, 0],
        [0, 1, 1, 73],
        [15, 1, 1, 73],
        [0, 16, 74],
    ],
});

const roomUrl = new URL('room.json', levelsDirectory);
const room = LevelSpecSchema.parse(JSON.parse(await readFile(roomUrl, 'utf8')));
assert.equal(room.name, 'THE ROOM');
assert.deepEqual(room.size, [32, 15]);
assert.deepEqual(room.playerSpawn, [16, 208]);
assert.deepEqual(room.entities, [
    {name: 'redShell', pos: [64, 200]},
    {name: 'goomba', pos: [480, 208]},
]);
assert.deepEqual(room.triggers, []);

const roomGround = room.layers
    .flatMap(layer => layer.tiles)
    .find(tile => 'name' in tile && tile.name === 'ground');
assert.deepEqual(roomGround, {
    name: 'ground',
    type: 'ground',
    ranges: [
        [0, 32, 0],
        [0, 1, 1, 13],
        [31, 1, 1, 13],
        [0, 32, 14],
    ],
});

const tutorialUrl = new URL('tutorial-1-scale.json', levelsDirectory);
const tutorial = LevelSpecSchema.parse(JSON.parse(await readFile(tutorialUrl, 'utf8')));
assert.equal(tutorial.name, 'SPELUNKY CLASSIC TUTORIAL');
assert.deepEqual(tutorial.size, [42, 19]);
// Classic's player uses an 8px centered sprite origin at [24, 72]. Our
// entities use top-left positions, so [16, 64] preserves the same bounds.
assert.deepEqual(tutorial.playerSpawn, [16, 64]);
assert.deepEqual(tutorial.entities, [
    {name: 'snake', pos: [352, 64]},
    {name: 'snake', pos: [464, 96]},
]);
assert.deepEqual(tutorial.triggers, [{
    type: 'teleport',
    pos: [48, 240],
    size: [16, 16],
    destination: [16, 64],
}]);

const tutorialTiles = tutorial.layers.flatMap(layer => layer.tiles);
const tutorialGround = tutorialTiles.find(tile => (
    'name' in tile
    && tile.name === 'ground'
    && tile.type === 'ground'
));
assert.ok(tutorialGround && 'ranges' in tutorialGround);

const tutorialSolidTiles = new Set<string>();
for (const range of tutorialGround.ranges) {
    let xStart: number;
    let xLength: number;
    let yStart: number;
    let yLength: number;
    if (range.length === 4) {
        [xStart, xLength, yStart, yLength] = range;
    } else if (range.length === 3) {
        [xStart, xLength, yStart] = range;
        yLength = 1;
    } else {
        [xStart, yStart] = range;
        xLength = 1;
        yLength = 1;
    }
    for (let x = xStart; x < xStart + xLength; ++x) {
        for (let y = yStart; y < yStart + yLength; ++y) {
            tutorialSolidTiles.add(`${x},${y}`);
        }
    }
}
for (const snake of tutorial.entities) {
    const supportX = Math.floor((snake.pos[0] + 8) / 16);
    const supportY = Math.floor((snake.pos[1] + 16) / 16);
    assert.ok(
        tutorialSolidTiles.has(`${supportX},${supportY}`),
        `Tutorial snake at ${snake.pos.join(',')} should start on solid terrain`,
    );
    assert.ok(
        !tutorialSolidTiles.has(`${supportX},${supportY - 1}`),
        `Tutorial snake at ${snake.pos.join(',')} should not start inside terrain`,
    );
}
assert.equal(
    tutorialSolidTiles.size,
    357,
    'Classic tutorial should preserve its terrain except for six lower-route openings',
);

const classicTutorialUrl = new URL(
    '../reference/spelunky-classic/extracted/Rooms/rTutorial.xml',
    import.meta.url,
);
const classicTutorialXml = await readFile(classicTutorialUrl, 'utf8');
const classicSolidTiles = new Set<string>();
const classicSolidPattern = /<instance\b[^>]*>\s*<object>(?:oBrick|oHardBlock)<\/object>\s*<position x="(\d+)" y="(\d+)"\/>/g;
for (const match of classicTutorialXml.matchAll(classicSolidPattern)) {
    const [, pixelX, pixelY] = match;
    assert.ok(pixelX !== undefined && pixelY !== undefined);
    assert.equal(Number(pixelX) % 16, 0);
    assert.equal(Number(pixelY) % 16, 0);
    classicSolidTiles.add(`${Number(pixelX) / 16},${Number(pixelY) / 16}`);
}
const openedLowerRouteTiles = new Set([
    '12,12',
    '12,13',
    '26,12',
    '27,12',
    '28,12',
    '29,12',
]);
for (const tile of openedLowerRouteTiles) {
    assert.ok(!tutorialSolidTiles.has(tile), `Expected lower-route tile ${tile} to be open`);
}
assert.deepEqual(
    [...tutorialSolidTiles, ...openedLowerRouteTiles].sort(),
    [...classicSolidTiles].sort(),
    'Runtime terrain plus the deliberate lower-route openings should match the Classic source',
);
assert.ok(
    tutorial.size[0] > 20,
    'Classic tutorial should scroll beyond the 20-tile viewport',
);

console.log(`Validated dimensions and scale-reference geometry for ${levelFiles.length} levels`);
