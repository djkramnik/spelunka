import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {encode as encodeJpeg} from 'jpeg-js';
import {PNG} from 'pngjs';
import {SpriteSheetSchema} from '../src/loaders/schemas.js';
import {
    importSpelunkyHd,
    parseAnimationSections,
    parseWix,
    sha256File,
} from './spelunky-hd-import.js';
import type {ImportProfile} from './spelunky-hd-import.js';

function sha256(data: Uint8Array): string {
    return createHash('sha256').update(data).digest('hex');
}

function write(path: string, data: string | Uint8Array): void {
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, data);
}

function makePlayerPng(): Buffer {
    const image = new PNG({
        width: 960,
        height: 800,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    const frames = [0, 1, 3, 5, 7, 9, 36, 58, 111, 115];
    for (const frame of frames) {
        const x = (frame % 12) * 80 + 10;
        const y = Math.floor(frame / 12) * 80 + 11;
        const offset = (y * image.width + x) * 4;
        image.data[offset] = frame;
        image.data[offset + 1] = (frame * 2) % 256;
        image.data[offset + 2] = 255 - frame;
        image.data[offset + 3] = frame === 0 ? 127 : frame;
    }
    return PNG.sync.write(image, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

function makeMonsterPng(): Buffer {
    const image = new PNG({
        width: 960,
        height: 160,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    for (const frame of [4, 7, 16]) {
        const x = (frame % 12) * 80 + 12;
        const y = Math.floor(frame / 12) * 80 + 13;
        const offset = (y * image.width + x) * 4;
        image.data[offset] = frame;
        image.data[offset + 1] = 200;
        image.data[offset + 2] = 100;
        image.data[offset + 3] = 64 + frame;
    }
    return PNG.sync.write(image, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

function makeTerrainPng(): Buffer {
    const image = new PNG({
        width: 512,
        height: 512,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    const cells = [
        [0, 64, [40, 50, 60, 70]],
        [64, 64, [80, 90, 100, 110]],
        [0, 128, [120, 130, 140, 150]],
        [64, 128, [160, 170, 180, 190]],
        [0, 256, [10, 20, 30, 40]],
        [320, 0, [5, 15, 25, 35]],
    ] as const;
    for (const [cellX, cellY, color] of cells) {
        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                const offset = ((cellY + y) * image.width + cellX + x) * 4;
                image.data.set(color, offset);
            }
        }
    }
    return PNG.sync.write(image, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

function makeMineBackgroundJpeg(): Buffer {
    const data = Buffer.alloc(256 * 256 * 4);
    for (let offset = 0; offset < data.length; offset += 4) {
        data.set([24, 36, 48, 255], offset);
    }
    return encodeJpeg({data, width: 256, height: 256}, 100).data;
}

function makeMineDecorationPng(): Buffer {
    const image = new PNG({
        width: 1024,
        height: 512,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    image.data.set([12, 34, 56, 78], 0);
    image.data.set([90, 80, 70, 60], (512 * 4));
    return PNG.sync.write(image, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

const animationText = [
    '!',
    '* 0 0 0 1 0 0',
    '* 1 1 8 4 1 0',
    '* 2 108 111 3 111 0',
    '* 3 112 115 4 115 0',
    '* 8 54 58 4 58 0',
    '* 9 9 9 1 9 0',
    '* 18 36 43 4 36 0',
    '',
].join('\r\n');

const underworldSpec = SpriteSheetSchema.parse(JSON.parse(readFileSync(
    new URL('../public/sprites/underworld.json', import.meta.url),
    'utf8',
)));
assert.equal(underworldSpec.imageURL, '/generated/spelunky-hd/mines.png');
assert.deepEqual(
    [underworldSpec.tileW, underworldSpec.tileH, underworldSpec.frameScale],
    [64, 64, 0.25],
);
assert.deepEqual(
    underworldSpec.tileSets,
    [
        {namePrefix: 'sky-fill', index: [8, 0], size: [4, 4]},
        {namePrefix: 'sky-decor', index: [12, 0], size: [20, 12]},
    ],
    'underworld metadata defines the opaque fill and viewport-sized decoration grids',
);
assert.deepEqual(
    underworldSpec.tiles.slice(0, 6).map(tile => [tile.name, tile.index]),
    [
        ['ground', [0, 1]],
        ['ground-1', [0, 1]],
        ['ground-2', [1, 1]],
        ['ground-3', [0, 2]],
        ['ground-4', [1, 2]],
        ['sky', [8, 0]],
    ],
);
assert.deepEqual(
    ['ground-2x2-1-top-left', 'ground-edge-top-1', 'ground-edge-left']
        .map(name => {
            const definition = underworldSpec.tiles.find(tile => tile.name === name);
            return [definition?.name, definition?.index];
        }),
    [
        ['ground-2x2-1-top-left', [0, 4]],
        ['ground-edge-top-1', [5, 0]],
        ['ground-edge-left', [7, 2]],
    ],
    'underworld metadata exposes connected chunks and transparent edge decals',
);

const root = mkdtempSync(join(tmpdir(), 'spelunka-hd-import-test-'));
try {
    assert.deepEqual(
        parseWix('!group SAFE\nimage.png 0 4\n', 4),
        [{group: 'SAFE', name: 'image.png', offset: 0, length: 4}],
    );
    assert.throws(
        () => parseWix('!group ../ESCAPE\nimage.png 0 4\n', 4),
        /Unsafe WIX group/,
    );
    assert.throws(
        () => parseWix('!group SAFE\nimage.png 3 2\n', 4),
        /Invalid WIX byte range/,
    );
    assert.throws(
        () => parseAnimationSections('!\n* 1 8 1 4 1 0\n'),
        /Invalid animation range/,
    );
    assert.equal(
        parseAnimationSections('!\n* 15 9 11 4 12 0\n')[0]?.[0]?.terminalFrame,
        12,
        'original metadata may use a terminal frame outside the nominal range',
    );

    const missingRoot = join(root, 'missing');
    mkdirSync(missingRoot);
    await assert.rejects(
        importSpelunkyHd({
            sourceRoot: missingRoot,
            outputRoot: join(root, 'missing-output'),
        }),
        /Missing Spelunky HD source file/,
    );

    const sourceRoot = join(root, 'depot');
    const outputRoot = join(root, 'output');
    const sourceEntries = [
        {group: 'PLAYERS', name: 'char_white.png', data: makePlayerPng()},
        {group: 'MONSTERS', name: 'monsters.png', data: makeMonsterPng()},
        {group: 'ALLTILES', name: 'alltiles.png', data: makeTerrainPng()},
        {group: 'ALLTILES', name: 'alltilesN.jpg', data: Buffer.from('normal fixture')},
        {group: 'MINE', name: 'minesmallbg.png', data: makeMineDecorationPng()},
        {group: 'MINE', name: 'minebg.jpg', data: makeMineBackgroundJpeg()},
    ] as const;

    const wixLines: string[] = [];
    const wadParts: Buffer[] = [];
    let activeGroup = '';
    let offset = 0;
    for (const entry of sourceEntries) {
        if (entry.group !== activeGroup) {
            activeGroup = entry.group;
            wixLines.push(`!group ${activeGroup}`);
        }
        wixLines.push(`${entry.name} ${offset} ${entry.data.length}`);
        wadParts.push(entry.data);
        offset += entry.data.length;
    }
    const wad = Buffer.concat(wadParts);
    const wix = `${wixLines.join('\r\n')}\r\n`;
    const wadPath = join(sourceRoot, 'Data', 'Textures', 'alltex.wad');
    const wixPath = join(sourceRoot, 'Data', 'Textures', 'alltex.wad.wix');
    const animationsPath = join(
        sourceRoot,
        'Data',
        'Animations',
        'allanimations.wad',
    );
    write(wadPath, wad);
    write(wixPath, wix);
    write(animationsPath, animationText);

    const profile: ImportProfile = {
        wadSha256: await sha256File(wadPath),
        wixSha256: await sha256File(wixPath),
        animationsSha256: await sha256File(animationsPath),
        entries: sourceEntries.map(entry => ({
            group: entry.group,
            name: entry.name,
            sha256: sha256(entry.data),
        })),
    };
    const result = await importSpelunkyHd({sourceRoot, outputRoot, profile});
    const firstImage = readFileSync(result.playerImagePath);
    const firstSpec = readFileSync(result.playerSpecPath);
    const firstEnemySpec = readFileSync(result.enemySpecPath);
    const firstTerrainImage = readFileSync(result.terrainImagePath);
    const firstReport = readFileSync(result.reportPath);

    const generated = PNG.sync.read(firstImage);
    assert.deepEqual([generated.width, generated.height], [400, 560]);
    const spec = SpriteSheetSchema.parse(JSON.parse(firstSpec.toString('utf8')));
    assert.equal(spec.frameScale, 0.25);
    assert.equal(spec.frames.length, 51);
    const jump = spec.frames.find(frame => frame.name === 'jump-4');
    assert.ok(jump);
    assert.deepEqual(jump.pivot, [40, 72]);
    const [jumpX, jumpY] = jump.rect;
    const jumpPixel = ((jumpY + 11) * generated.width + jumpX + 10) * 4;
    assert.deepEqual(
        [...generated.data.subarray(jumpPixel, jumpPixel + 4)],
        [111, 222, 144, 111],
        'RGBA values, including partial alpha, survive the crop and repack',
    );
    const animation = (name: string) => {
        const result = spec.animations.find(candidate => candidate.name === name);
        assert.ok(result, `Missing generated player animation ${name}`);
        return result;
    };
    assert.deepEqual(
        animation('walk'),
        {
            name: 'walk',
            frameLen: 3,
            frames: Array.from({length: 8}, (_, index) => `walk-${index + 1}`),
            loop: true,
        },
        'Movement uses all eight HD source frames over the existing stride distance',
    );
    assert.deepEqual(
        animation('jump'),
        {
            name: 'jump',
            frameLen: 0.05,
            frames: ['jump-1', 'jump-2', 'jump-3', 'jump-4'],
            loop: false,
        },
        'Rising animation uses the complete non-looping HD source record',
    );
    assert.deepEqual(
        animation('throw'),
        {
            name: 'throw',
            frameLen: 4 / 60,
            frames: ['throw-1', 'throw-2', 'throw-3', 'throw-4', 'throw-5'],
            loop: false,
        },
        'Throw animation uses the complete non-looping HD source record',
    );

    const copiedPlayer = readFileSync(join(
        outputRoot,
        '.local',
        'spelunky-hd',
        'source',
        'PLAYERS',
        'char_white.png',
    ));
    assert.deepEqual(copiedPlayer, sourceEntries[0].data);

    const enemyImage = readFileSync(result.enemyImagePath);
    const enemy = PNG.sync.read(enemyImage);
    assert.deepEqual([enemy.width, enemy.height], [240, 80]);
    const enemySpec = SpriteSheetSchema.parse(JSON.parse(
        readFileSync(result.enemySpecPath, 'utf8'),
    ));
    assert.deepEqual(
        enemySpec.frames.map(frame => [frame.name, frame.rect, frame.pivot]),
        [
            ['walk-1', [0, 0, 80, 80], [40, 72]],
            ['walk-2', [80, 0, 80, 80], [40, 72]],
            ['flat', [160, 0, 80, 80], [40, 72]],
        ],
    );
    const enemyPixel = (13 * enemy.width + 12) * 4;
    assert.deepEqual(
        [...enemy.data.subarray(enemyPixel, enemyPixel + 4)],
        [4, 200, 100, 68],
        'Enemy RGBA values survive the crop and repack',
    );

    const terrainImage = PNG.sync.read(firstTerrainImage);
    assert.deepEqual([terrainImage.width, terrainImage.height], [2048, 768]);
    const expectedGroundColors = [
        [40, 50, 60, 70],
        [80, 90, 100, 110],
        [120, 130, 140, 150],
        [160, 170, 180, 190],
    ];
    assert.deepEqual(
        ([[0, 64], [64, 64], [0, 128], [64, 128]] as const).map(([x, y]) => {
            const offset = (y * terrainImage.width + x) * 4;
            return [...terrainImage.data.subarray(offset, offset + 4)];
        }),
        expectedGroundColors,
        'All four Mines earth variants preserve source RGBA pixels',
    );
    assert.deepEqual(
        [...terrainImage.data.subarray(512 * 4, 512 * 4 + 4)],
        [24, 36, 48, 255],
        'Opaque Mines JPEG fill is decoded into the terrain sheet',
    );
    const chunkPixel = (256 * terrainImage.width) * 4;
    assert.deepEqual(
        [...terrainImage.data.subarray(chunkPixel, chunkPixel + 4)],
        [10, 20, 30, 40],
        'Connected terrain chunk pixels preserve partial alpha',
    );
    const edgePixel = 320 * 4;
    assert.deepEqual(
        [...terrainImage.data.subarray(edgePixel, edgePixel + 4)],
        [5, 15, 25, 35],
        'Rocky edge pixels preserve partial alpha',
    );
    const decorationPixel = (64 * terrainImage.width + 768 + 64) * 4;
    assert.deepEqual(
        [...terrainImage.data.subarray(decorationPixel, decorationPixel + 4)],
        [12, 34, 56, 78],
        'Transparent Mines decorations preserve source RGBA in the assembly',
    );
    const secondDecorationPixel = (64 * terrainImage.width + 768 + 512) * 4;
    assert.deepEqual(
        [...terrainImage.data.subarray(
            secondDecorationPixel,
            secondDecorationPixel + 4,
        )],
        [90, 80, 70, 60],
        'Multiple selected decoration crops retain partial alpha',
    );
    const emptyDecorationPixel = (32 * terrainImage.width + 768 + 32) * 4;
    assert.deepEqual(
        [...terrainImage.data.subarray(
            emptyDecorationPixel,
            emptyDecorationPixel + 4,
        )],
        [0, 0, 0, 0],
        'Empty assembly cells stay transparent above the opaque fill layer',
    );

    await importSpelunkyHd({sourceRoot, outputRoot, profile});
    assert.deepEqual(readFileSync(result.playerImagePath), firstImage);
    assert.deepEqual(readFileSync(result.playerSpecPath), firstSpec);
    assert.deepEqual(readFileSync(result.enemyImagePath), enemyImage);
    assert.deepEqual(readFileSync(result.enemySpecPath), firstEnemySpec);
    assert.deepEqual(readFileSync(result.terrainImagePath), firstTerrainImage);
    assert.deepEqual(readFileSync(result.reportPath), firstReport);

    const badProfile: ImportProfile = {...profile, wadSha256: '0'.repeat(64)};
    await assert.rejects(
        importSpelunkyHd({sourceRoot, outputRoot, profile: badProfile}),
        /Unsupported Spelunky HD texture WAD/,
    );
} finally {
    rmSync(root, {recursive: true, force: true});
}

console.log('Spelunky HD local graphics importer passed');
