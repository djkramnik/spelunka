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
        : levelFile === 'room.json'
            ? [32, 15]
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

const roomUrl = new URL('room.json', levelsDirectory);
const room = LevelSpecSchema.parse(JSON.parse(await readFile(roomUrl, 'utf8')));
assert.equal(room.name, 'THE ROOM');
assert.deepEqual(room.size, [32, 15]);
assert.deepEqual(room.playerSpawn, [16, 208]);
assert.deepEqual(room.entities, [{name: 'redShell', pos: [64, 200]}]);
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

console.log(`Validated dimensions, The Shaft, and The Room for ${levelFiles.length} levels`);
