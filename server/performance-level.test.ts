import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

import {LevelSpecSchema} from '../src/loaders/schemas.js';

const levelUrl = new URL('../public/levels/performance-entities.json', import.meta.url);
const level = LevelSpecSchema.parse(JSON.parse(await readFile(levelUrl, 'utf8')));

assert.deepEqual(level.size, [212, 15]);
assert.deepEqual(level.playerSpawn, [0, 192]);
assert.equal(level.entities.length, 123);
assert.deepEqual(
    level.entities.map(entity => entity.pos),
    [40, 8, -24].flatMap(y => (
        Array.from({length: 41}, (_, index) => [(index + 1) * 80, y])
    )),
);

const namedTiles = level.layers.flatMap(layer => layer.tiles).filter(tile => (
    'name' in tile
));
const ground = namedTiles.find(tile => tile.name === 'ground');
const bridge = namedTiles.find(tile => tile.name === 'bricks');

assert.deepEqual(ground?.ranges, [[0, 212, 13, 2]]);
assert.deepEqual(bridge?.ranges, [
    [0, 212, 0, 1],
    [0, 212, 2, 1],
    [0, 212, 4, 1],
    [0, 1, -1, 5],
    [211, 1, -1, 5],
]);
assert.deepEqual(level.triggers, [{
    type: 'goto',
    name: 'performance-entities',
    pos: [3312, 144],
}]);

console.log('Performance entity level regression passed');
