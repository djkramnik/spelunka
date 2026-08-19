import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';

import {LevelSpecSchema} from '../src/loaders/schemas.js';

const levelsDirectory = new URL('../public/levels/', import.meta.url);
const levelFiles = (await readdir(levelsDirectory))
    .filter(fileName => fileName.endsWith('.json'))
    .sort();

assert.ok(levelFiles.length > 0, 'Expected at least one level definition');

for (const levelFile of levelFiles) {
    const levelUrl = new URL(levelFile, levelsDirectory);
    const level = LevelSpecSchema.parse(JSON.parse(await readFile(levelUrl, 'utf8')));
    const expectedSize = levelFile === 'vertical-shaft.json'
        ? [16, 75]
        : [212, 15];
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

console.log(`Validated dimensions and The Shaft layout for ${levelFiles.length} levels`);
