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
    const frames = [
        0, 1, 3, 5, 7, 9, 36, 37, 58, 103, 111, 115,
    ];
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
    const frames = [
        0, 1, 2, 3,
        4, 5, 6, 7, 8, 9, 10,
        12, 13, 14, 15, 16, 17, 18,
    ];
    for (const frame of frames) {
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

function makePlayerHudProPng(): Buffer {
    const image = new PNG({
        width: 256,
        height: 256,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    image.data.set([220, 30, 40, 180], (138 * image.width + 10) * 4);
    image.data.set([200, 160, 20, 255], (170 * image.width + 40) * 4);
    return PNG.sync.write(image, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

function makeHudIconsPng(): Buffer {
    const image = new PNG({
        width: 512,
        height: 128,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    image.data.fill(0);
    const cells = [
        [4, 0], [5, 0], [6, 0], [7, 0], [0, 1],
        [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
    ] as const;
    cells.forEach(([cellX, cellY], digit) => {
        const x = cellX * 64 + 8;
        const y = cellY * 64 + 9;
        image.data.set(
            [digit, 100 + digit, 200 - digit, 150 + digit],
            (y * image.width + x) * 4,
        );
    });
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
    '* 4 72 72 1 72 0',
    '* 5 72 77 4 72 0',
    '* 8 54 58 4 58 0',
    '* 9 9 9 1 9 0',
    '* 29 78 83 4 78 0',
    '* 33 103 103 1 103 0',
    '* 6 14 14 1 14 0',
    '* 7 17 23 3 17 0',
    '* 25 12 14 4 14 0',
    '* 26 14 16 4 16 0',
    '* 18 36 43 4 36 0',
    '* 12 44 47 4 47 0',
    '* 19 28 34 4 34 0',
    '!',
    '* 0 0 3 10 0 1',
    '* 1 4 10 6 4 0',
    '* 17 12 18 4 18 0',
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
assert.deepEqual(
    ['ladder', 'ladder-top'].map(name => {
        const definition = underworldSpec.tiles.find(tile => tile.name === name);
        return [definition?.name, definition?.index];
    }),
    [
        ['ladder', [2, 0]],
        ['ladder-top', [3, 0]],
    ],
    'underworld metadata exposes the HD Mines ladder body and capped top cells',
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
        {
            group: 'ANYLEVEL',
            name: 'playerhudPRO.png',
            data: makePlayerHudProPng(),
        },
        {group: 'ATSTART', name: 'hudicons.png', data: makeHudIconsPng()},
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
    const snakebiteSound = Buffer.from('synthetic snake bite wave');
    const soundWadPath = join(
        sourceRoot,
        'Data',
        'Sounds',
        'allsounds.wad',
    );
    const soundWixPath = join(
        sourceRoot,
        'Data',
        'Sounds',
        'allsounds.wad.wix',
    );
    const animationsPath = join(
        sourceRoot,
        'Data',
        'Animations',
        'allanimations.wad',
    );
    write(wadPath, wad);
    write(wixPath, wix);
    write(soundWadPath, snakebiteSound);
    write(
        soundWixPath,
        `!group ALLSOUNDS\r\nsnakebite.wav 0 ${snakebiteSound.length}\r\n`,
    );
    write(animationsPath, animationText);

    const profile: ImportProfile = {
        wadSha256: await sha256File(wadPath),
        wixSha256: await sha256File(wixPath),
        soundWadSha256: await sha256File(soundWadPath),
        soundWixSha256: await sha256File(soundWixPath),
        animationsSha256: await sha256File(animationsPath),
        entries: sourceEntries.map(entry => ({
            group: entry.group,
            name: entry.name,
            sha256: sha256(entry.data),
        })),
        soundEntries: [{
            group: 'ALLSOUNDS',
            name: 'snakebite.wav',
            sha256: sha256(snakebiteSound),
        }],
    };
    const result = await importSpelunkyHd({sourceRoot, outputRoot, profile});
    const firstImage = readFileSync(result.playerImagePath);
    const firstSpec = readFileSync(result.playerSpecPath);
    const firstEnemySpec = readFileSync(result.enemySpecPath);
    const firstTerrainImage = readFileSync(result.terrainImagePath);
    const firstHudImage = readFileSync(result.hudImagePath);
    const firstHudSpec = readFileSync(result.hudSpecPath);
    const firstSnakebiteSound = readFileSync(result.snakebiteSoundPath);
    const firstReport = readFileSync(result.reportPath);

    const generated = PNG.sync.read(firstImage);
    assert.deepEqual([generated.width, generated.height], [400, 1040]);
    const spec = SpriteSheetSchema.parse(JSON.parse(firstSpec.toString('utf8')));
    assert.equal(spec.frameScale, 0.25);
    assert.equal(spec.frames.length, 92);
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
    const reactionHit = spec.frames.find(frame => frame.name === 'reaction-hit-1');
    assert.ok(reactionHit);
    const [reactionX, reactionY] = reactionHit.rect;
    const reactionPixel = (
        (reactionY + 11) * generated.width
        + reactionX
        + 10
    ) * 4;
    assert.deepEqual(
        [...generated.data.subarray(reactionPixel, reactionPixel + 4)],
        [36, 72, 219, 36],
        'The first arms-back hit-reaction frame is packed without alteration',
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
    assert.deepEqual(
        animation('reaction-hit'),
        {
            name: 'reaction-hit',
            frameLen: 4 / 60,
            frames: ['reaction-hit-1', 'reaction-hit-2'],
            loop: false,
        },
        'Hit reaction uses the first two arms-back frames at the HD cadence',
    );
    assert.deepEqual(
        animation('ladder-climb'),
        {
            name: 'ladder-climb',
            frameLen: 4 / 60,
            frames: [
                'ladder-climb-1',
                'ladder-climb-2',
                'ladder-climb-3',
                'ladder-climb-4',
                'ladder-climb-5',
                'ladder-climb-6',
            ],
            loop: true,
        },
        'Ladder movement uses all six HD source frames at animation 5 cadence',
    );
    const ladderCling = spec.frames.find(frame => frame.name === 'ladder-cling');
    const ladderClimbStart = spec.frames.find(
        frame => frame.name === 'ladder-climb-1',
    );
    assert.ok(ladderCling && ladderClimbStart);
    assert.deepEqual(
        [ladderCling.rect, ladderCling.pivot],
        [ladderClimbStart.rect, ladderClimbStart.pivot],
        'HD animation 4 cling pose aliases animation 5 starting frame 72',
    );
    assert.deepEqual(
        animation('crouch-enter'),
        {
            name: 'crouch-enter',
            frameLen: 4 / 60,
            frames: ['crouch-enter-1', 'crouch-enter-2', 'crouch-enter-3'],
            loop: false,
        },
        'Crouch-in uses complete HD animation 25',
    );
    assert.deepEqual(
        animation('crouch-exit'),
        {
            name: 'crouch-exit',
            frameLen: 4 / 60,
            frames: ['crouch-exit-1', 'crouch-exit-2', 'crouch-exit-3'],
            loop: false,
        },
        'Crouch-out uses complete HD animation 26',
    );
    assert.deepEqual(
        animation('crawl'),
        {
            name: 'crawl',
            frameLen: 3 / 60,
            frames: [
                'crawl-1',
                'crawl-2',
                'crawl-3',
                'crawl-4',
                'crawl-5',
                'crawl-6',
                'crawl-7',
            ],
            loop: true,
        },
        'Crawl uses complete looping HD animation 7',
    );
    assert.deepEqual(
        animation('ledge-flip'),
        {
            name: 'ledge-flip',
            frameLen: 4 / 60,
            frames: [
                'ledge-flip-1',
                'ledge-flip-2',
                'ledge-flip-3',
                'ledge-flip-4',
                'ledge-flip-5',
                'ledge-flip-6',
                'ledge-flip-7',
            ],
            loop: false,
        },
        'Top-to-hang transition reverses the complete HD ledge-flip record',
    );
    assert.deepEqual(
        animation('ledge-hang'),
        {
            name: 'ledge-hang',
            frameLen: 4 / 60,
            frames: ['ledge-hang-1', 'ledge-hang-2', 'ledge-hang-3', 'ledge-hang-4'],
            loop: false,
        },
        'Ledge hang uses the complete HD ledge-grab record and holds its terminal pose',
    );
    assert.deepEqual(
        animation('ledge-climb'),
        {
            name: 'ledge-climb',
            frameLen: 4 / 60,
            frames: [
                'ledge-climb-1',
                'ledge-climb-2',
                'ledge-climb-3',
                'ledge-climb-4',
                'ledge-climb-5',
                'ledge-climb-6',
                'ledge-climb-7',
            ],
            loop: false,
        },
        'Ledge climb uses the complete HD ledge-flip record',
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
    assert.deepEqual(
        readFileSync(join(
            outputRoot,
            '.local',
            'spelunky-hd',
            'source',
            'ALLSOUNDS',
            'snakebite.wav',
        )),
        snakebiteSound,
        'The allow-listed HD snake-bite source is copied unchanged',
    );
    assert.deepEqual(
        firstSnakebiteSound,
        snakebiteSound,
        'The generated snake-bite effect preserves its source bytes',
    );

    const enemyImage = readFileSync(result.enemyImagePath);
    const enemy = PNG.sync.read(enemyImage);
    assert.deepEqual([enemy.width, enemy.height], [1440, 80]);
    const enemySpec = SpriteSheetSchema.parse(JSON.parse(
        readFileSync(result.enemySpecPath, 'utf8'),
    ));
    const expectedEnemyFrames = [
        ...Array.from({length: 4}, (_, index) => [
            `idle-${index + 1}`,
            [index * 80, 0, 80, 80],
            [40, 72],
        ]),
        ...Array.from({length: 7}, (_, index) => [
            `walk-${index + 1}`,
            [(index + 4) * 80, 0, 80, 80],
            [40, 72],
        ]),
        ...Array.from({length: 7}, (_, index) => [
            `attack-${index + 1}`,
            [(index + 11) * 80, 0, 80, 80],
            [40, 72],
        ]),
        ['flat', [15 * 80, 0, 80, 80], [40, 72]],
    ];
    assert.deepEqual(
        enemySpec.frames.map(frame => [frame.name, frame.rect, frame.pivot]),
        expectedEnemyFrames,
    );
    const enemyAnimation = (name: string) => {
        const result = enemySpec.animations.find(candidate => candidate.name === name);
        assert.ok(result, `Missing generated snake animation ${name}`);
        return result;
    };
    assert.deepEqual(
        enemyAnimation('idle'),
        {
            name: 'idle',
            frameLen: 10 / 60,
            frames: ['idle-1', 'idle-2', 'idle-3', 'idle-4'],
            loop: true,
        },
    );
    assert.deepEqual(
        enemyAnimation('walk'),
        {
            name: 'walk',
            frameLen: 6 / 60,
            frames: Array.from({length: 7}, (_, index) => `walk-${index + 1}`),
            loop: true,
        },
    );
    assert.deepEqual(
        enemyAnimation('attack'),
        {
            name: 'attack',
            frameLen: 4 / 60,
            frames: Array.from({length: 7}, (_, index) => `attack-${index + 1}`),
            loop: false,
        },
    );
    const enemyPixel = (13 * enemy.width + 12) * 4;
    assert.deepEqual(
        [...enemy.data.subarray(enemyPixel, enemyPixel + 4)],
        [0, 200, 100, 64],
        'Snake RGBA values, including partial alpha, survive the crop and repack',
    );
    const lastEnemyPixel = (13 * enemy.width + 17 * 80 + 12) * 4;
    assert.deepEqual(
        [...enemy.data.subarray(lastEnemyPixel, lastEnemyPixel + 4)],
        [18, 200, 100, 82],
        'The terminal HD attack frame is packed in source order',
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

    const hudImage = PNG.sync.read(firstHudImage);
    assert.deepEqual([hudImage.width, hudImage.height], [672, 64]);
    const hudSpec = SpriteSheetSchema.parse(JSON.parse(
        firstHudSpec.toString('utf8'),
    ));
    assert.equal(hudSpec.frameScale, 0.225);
    assert.deepEqual(
        hudSpec.frames.map(frame => [frame.name, frame.rect, frame.scale]),
        [
            ['heart', [0, 0, 32, 32], 0.45],
            ...Array.from({length: 10}, (_, digit) => [
                `digit-${digit}`,
                [32 + digit * 64, 0, 64, 64],
                undefined,
            ]),
        ],
        'HUD metadata exposes the HD heart and all ten counter glyphs',
    );
    const heartPixel = (10 * hudImage.width + 10) * 4;
    assert.deepEqual(
        [...hudImage.data.subarray(heartPixel, heartPixel + 4)],
        [220, 30, 40, 180],
        'Heart pixels preserve source RGBA',
    );
    const excludedHudPixel = (42 * hudImage.width + 40) * 4;
    assert.deepEqual(
        [...hudImage.data.subarray(
            excludedHudPixel,
            excludedHudPixel + 4,
        )],
        [0, 0, 0, 0],
        'Only the standalone compact heart cell is copied',
    );
    const digitFourPixel = (
        9 * hudImage.width
        + 32
        + 4 * 64
        + 8
    ) * 4;
    assert.deepEqual(
        [...hudImage.data.subarray(digitFourPixel, digitFourPixel + 4)],
        [4, 104, 196, 154],
        'Counter cells are repacked from their non-linear HD atlas order',
    );

    await importSpelunkyHd({sourceRoot, outputRoot, profile});
    assert.deepEqual(readFileSync(result.playerImagePath), firstImage);
    assert.deepEqual(readFileSync(result.playerSpecPath), firstSpec);
    assert.deepEqual(readFileSync(result.enemyImagePath), enemyImage);
    assert.deepEqual(readFileSync(result.enemySpecPath), firstEnemySpec);
    assert.deepEqual(readFileSync(result.terrainImagePath), firstTerrainImage);
    assert.deepEqual(readFileSync(result.hudImagePath), firstHudImage);
    assert.deepEqual(readFileSync(result.hudSpecPath), firstHudSpec);
    assert.deepEqual(
        readFileSync(result.snakebiteSoundPath),
        firstSnakebiteSound,
    );
    assert.deepEqual(readFileSync(result.reportPath), firstReport);

    const badProfile: ImportProfile = {...profile, wadSha256: '0'.repeat(64)};
    await assert.rejects(
        importSpelunkyHd({sourceRoot, outputRoot, profile: badProfile}),
        /Unsupported Spelunky HD texture WAD/,
    );

    const unsupportedLadderAnimations = animationText.replace(
        '* 5 72 77 4 72 0',
        '* 5 72 77 3 72 0',
    );
    write(animationsPath, unsupportedLadderAnimations);
    const badLadderProfile: ImportProfile = {
        ...profile,
        animationsSha256: await sha256File(animationsPath),
    };
    await assert.rejects(
        importSpelunkyHd({sourceRoot, outputRoot, profile: badLadderProfile}),
        /Unsupported HD ladder animation timing/,
    );

    const unsupportedSnakeAnimations = animationText.replace(
        '* 1 4 10 6 4 0',
        '* 1 4 9 6 4 0',
    );
    write(animationsPath, unsupportedSnakeAnimations);
    const badSnakeProfile: ImportProfile = {
        ...profile,
        animationsSha256: await sha256File(animationsPath),
    };
    await assert.rejects(
        importSpelunkyHd({sourceRoot, outputRoot, profile: badSnakeProfile}),
        /Unsupported snake animation 1/,
    );
} finally {
    rmSync(root, {recursive: true, force: true});
}

console.log('Spelunky HD local asset importer passed');
