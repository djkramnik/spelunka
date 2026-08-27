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
        {group: 'ALLTILES', name: 'alltiles.png', data: Buffer.from('terrain fixture')},
        {group: 'ALLTILES', name: 'alltilesN.jpg', data: Buffer.from('normal fixture')},
        {group: 'MINE', name: 'minesmallbg.png', data: Buffer.from('decoration fixture')},
        {group: 'MINE', name: 'minebg.jpg', data: Buffer.from('background fixture')},
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
    const firstReport = readFileSync(result.reportPath);

    const generated = PNG.sync.read(firstImage);
    assert.deepEqual([generated.width, generated.height], [400, 160]);
    const spec = SpriteSheetSchema.parse(JSON.parse(firstSpec.toString('utf8')));
    assert.equal(spec.frameScale, 0.25);
    assert.equal(spec.frames.length, 21);
    const jump = spec.frames.find(frame => frame.name === 'jump');
    assert.ok(jump);
    assert.deepEqual(jump.pivot, [40, 72]);
    const [jumpX, jumpY] = jump.rect;
    const jumpPixel = ((jumpY + 11) * generated.width + jumpX + 10) * 4;
    assert.deepEqual(
        [...generated.data.subarray(jumpPixel, jumpPixel + 4)],
        [111, 222, 144, 111],
        'RGBA values, including partial alpha, survive the crop and repack',
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

    await importSpelunkyHd({sourceRoot, outputRoot, profile});
    assert.deepEqual(readFileSync(result.playerImagePath), firstImage);
    assert.deepEqual(readFileSync(result.playerSpecPath), firstSpec);
    assert.deepEqual(readFileSync(result.enemyImagePath), enemyImage);
    assert.deepEqual(readFileSync(result.enemySpecPath), firstEnemySpec);
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
