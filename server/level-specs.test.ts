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
    assert.deepEqual(
        level.size,
        [212, 15],
        `Unexpected dimensions for existing level ${levelFile}`,
    );
}

console.log(`Validated explicit dimensions for ${levelFiles.length} existing levels`);
