import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';

import {LevelSpecSchema} from '../src/loaders/schemas.js';

const levelsDirectory = new URL('../public/levels/', import.meta.url);
const levelFiles = (await readdir(levelsDirectory))
    .filter(fileName => fileName.endsWith('.json'))
    .sort();

assert.deepEqual(
    levelFiles,
    ['tutorial-1-scale.json'],
    'The project exposes only its current default level',
);

const tutorialUrl = new URL('tutorial-1-scale.json', levelsDirectory);
const tutorial = LevelSpecSchema.parse(JSON.parse(await readFile(tutorialUrl, 'utf8')));
assert.equal(tutorial.name, 'SPELUNKY CLASSIC TUTORIAL');
assert.deepEqual(tutorial.size, [42, 19]);
// Classic's player uses an 8px centered sprite origin at [24, 72]. Our
// entities use top-left positions, so [16, 64] preserves the same bounds.
assert.deepEqual(tutorial.playerSpawn, [16, 64]);
assert.deepEqual(tutorial.entities, [
    {name: 'rock', pos: [48, 104]},
    {name: 'ladder', pos: [368, 80]},
    {name: 'ladder4', pos: [480, 208]},
    {name: 'snake', pos: [352, 64]},
    {name: 'snake', pos: [464, 96]},
    {name: 'caveman', pos: [608, 256]},
]);
const tutorialRock = tutorial.entities.find(entity => entity.name === 'rock');
assert.deepEqual(
    tutorialRock?.pos,
    [3 * 16, 7 * 16 - 8],
    'Tutorial rock rests two tiles to the right of the player spawn',
);
const tutorialLadder = tutorial.entities.find(entity => entity.name === 'ladder');
assert.deepEqual(
    tutorialLadder?.pos,
    [23 * 16, 5 * 16],
    'Tutorial ladder stands on the floor against the large cliff\'s right face',
);
const tutorialTallLadder = tutorial.entities.find(entity => entity.name === 'ladder4');
assert.deepEqual(
    tutorialTallLadder?.pos,
    [30 * 16, 13 * 16],
    'Four-tile tutorial ladder stands on the bottom floor against the lower cliff',
);
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
for (let y = 13; y <= 16; y += 1) {
    assert.ok(
        tutorialSolidTiles.has(`29,${y}`),
        `Lower cliff should occupy tile 29,${y}`,
    );
    assert.ok(
        !tutorialSolidTiles.has(`30,${y}`),
        `Tall ladder space should remain non-solid at tile 30,${y}`,
    );
}
assert.ok(
    tutorialSolidTiles.has('30,17'),
    'Tall ladder should terminate on the bottom floor',
);
for (const snake of tutorial.entities.filter(entity => entity.name === 'snake')) {
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
const tutorialCaveman = tutorial.entities.find(
    entity => entity.name === 'caveman',
);
assert.deepEqual(
    tutorialCaveman?.pos,
    [38 * 16, 17 * 16 - 16],
    'Caveman waits on the bottom floor beneath the right-side descent opening',
);
assert.ok(
    tutorialSolidTiles.has('38,17')
        && !tutorialSolidTiles.has('38,16'),
    'Tutorial caveman starts on clear, supported bottom-floor terrain',
);
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
