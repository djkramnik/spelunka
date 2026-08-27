import {createHash} from 'node:crypto';
import {
    createReadStream,
    existsSync,
    mkdirSync,
    openSync,
    closeSync,
    readFileSync,
    readSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {decode as decodeJpeg} from 'jpeg-js';
import {PNG} from 'pngjs';

export interface WadEntry {
    readonly group: string;
    readonly name: string;
    readonly offset: number;
    readonly length: number;
}

export interface AnimationRecord {
    readonly id: number;
    readonly firstFrame: number;
    readonly lastFrame: number;
    readonly frameLength: number;
    readonly terminalFrame: number;
    readonly flag: number;
}

interface ApprovedEntry {
    readonly group: string;
    readonly name: string;
    readonly sha256: string;
}

export interface ImportProfile {
    readonly wadSha256: string;
    readonly wixSha256: string;
    readonly animationsSha256: string;
    readonly entries: readonly ApprovedEntry[];
}

export interface ImportOptions {
    readonly sourceRoot: string;
    readonly outputRoot: string;
    readonly profile?: ImportProfile;
}

export interface ImportResult {
    readonly playerImagePath: string;
    readonly playerSpecPath: string;
    readonly enemyImagePath: string;
    readonly enemySpecPath: string;
    readonly terrainImagePath: string;
    readonly reportPath: string;
}

const SAFE_COMPONENT = /^[A-Za-z0-9_.-]+$/;
const PLAYER_CELL_SIZE = 80;
const PLAYER_COLUMNS = 12;
const OUTPUT_COLUMNS = 5;
const PLAYER_PIVOT = [40, 72] as const;
const ENEMY_PIVOT = [40, 72] as const;
const TERRAIN_CELL_SIZE = 64;

const MINE_GROUND_SOURCES = [
    [0, 64],
    [64, 64],
    [0, 128],
    [64, 128],
] as const;

const PLAYER_FRAME_SOURCES = [
    ['idle', 0],
    ['walk-1', 1],
    ['walk-2', 3],
    ['walk-3', 5],
    ['run-1', 1],
    ['run-2', 3],
    ['run-3', 5],
    ['run-4', 7],
    ['skid', 36],
    ['jump', 111],
    ['fall', 115],
    ['carry-idle', 0],
    ['carry-run-1', 1],
    ['carry-run-2', 3],
    ['carry-run-3', 5],
    ['carry-run-4', 7],
    ['carry-jump', 111],
    ['carry-fall', 115],
    ['throw', 58],
    ['reaction-stunned', 9],
    ['reaction-dead', 9],
] as const;

const ENEMY_FRAME_SOURCES = [
    ['walk-1', 4],
    ['walk-2', 7],
    ['flat', 16],
] as const;

const REQUIRED_PLAYER_ANIMATIONS = new Map<number, readonly [number, number]>([
    [0, [0, 0]],
    [1, [1, 8]],
    [2, [108, 111]],
    [3, [112, 115]],
    [8, [54, 58]],
    [9, [9, 9]],
    [18, [36, 43]],
]);

export const DEFAULT_IMPORT_PROFILE: ImportProfile = {
    wadSha256: '11cfdf62cfd36466883bf34bb8cc7a29527d6313caf7f9450d269352bf4948fd',
    wixSha256: 'ed829de2a9bf7a457eda560e7825b43e69b0b6b9cdc9eb7dfd959c76b0762da4',
    animationsSha256: 'd24d7fd5b8cbcba2c76b4829b3bb38f47b33c32eb3d2189c38e52c82b031dd89',
    entries: [
        {
            group: 'PLAYERS',
            name: 'char_white.png',
            sha256: 'a91a43376db1f42f0aa27321977bcdcb53126b0cb74e8181dc3b39fdde193169',
        },
        {
            group: 'MONSTERS',
            name: 'monsters.png',
            sha256: '2a4be04b44406d18f74f71da2e42777ab32d2d4393613cf2b2c3ffa54372ceb4',
        },
        {
            group: 'ALLTILES',
            name: 'alltiles.png',
            sha256: '40a35533cf481f371855bdbfeab206aed7e1bee24078a6a8f27103c029b7860c',
        },
        {
            group: 'ALLTILES',
            name: 'alltilesN.jpg',
            sha256: '20fd2e5fbb9ba25cf8c5b388ff1177084969aeaa031bff800dc6b9e283814033',
        },
        {
            group: 'MINE',
            name: 'minesmallbg.png',
            sha256: 'f2d50e85c3c7df937c9f24e7b4c2355191f14047ec538f8e55537889822778da',
        },
        {
            group: 'MINE',
            name: 'minebg.jpg',
            sha256: '22093edcf3bb51b6c0190609c92c0fdb0565c39791d4b73a440622587420bc93',
        },
    ],
};

function assertSafeComponent(value: string, description: string): void {
    if (!SAFE_COMPONENT.test(value) || value === '.' || value === '..') {
        throw new Error(`Unsafe ${description}: ${JSON.stringify(value)}`);
    }
}

export function parseWix(text: string, wadSize: number): readonly WadEntry[] {
    if (!Number.isSafeInteger(wadSize) || wadSize < 0) {
        throw new Error(`Invalid WAD size: ${wadSize}`);
    }

    const entries: WadEntry[] = [];
    const keys = new Set<string>();
    let group: string | undefined;

    text.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (line === '') {
            return;
        }

        const fields = line.split(/\s+/);
        if (fields[0] === '!group') {
            if (fields.length !== 2 || fields[1] === undefined) {
                throw new Error(`Invalid WIX group on line ${index + 1}`);
            }
            assertSafeComponent(fields[1], 'WIX group');
            group = fields[1];
            return;
        }

        if (group === undefined) {
            throw new Error(`WIX entry precedes a group on line ${index + 1}`);
        }
        if (fields.length !== 3
            || fields[0] === undefined
            || fields[1] === undefined
            || fields[2] === undefined) {
            throw new Error(`Invalid WIX entry on line ${index + 1}`);
        }

        const [name, offsetText, lengthText] = fields;
        assertSafeComponent(name, 'WIX entry name');
        const offset = Number(offsetText);
        const length = Number(lengthText);
        if (!Number.isSafeInteger(offset)
            || !Number.isSafeInteger(length)
            || offset < 0
            || length < 0
            || offset + length > wadSize) {
            throw new Error(`Invalid WIX byte range for ${group}/${name} on line ${index + 1}`);
        }

        const key = `${group}/${name}`;
        if (keys.has(key)) {
            throw new Error(`Duplicate WIX entry: ${key}`);
        }
        keys.add(key);
        entries.push({group, name, offset, length});
    });

    return entries;
}

export function parseAnimationSections(
    text: string,
): readonly (readonly AnimationRecord[])[] {
    const sections: AnimationRecord[][] = [];
    let section: AnimationRecord[] | undefined;

    text.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (line === '') {
            return;
        }
        if (line === '!') {
            section = [];
            sections.push(section);
            return;
        }

        const fields = line.split(/\s+/);
        if (section === undefined || fields.length !== 7 || fields[0] !== '*') {
            throw new Error(`Invalid animation record on line ${index + 1}`);
        }
        const values = fields.slice(1).map(Number);
        if (values.some(value => !Number.isSafeInteger(value) || value < 0)) {
            throw new Error(`Invalid animation number on line ${index + 1}`);
        }
        const [id, firstFrame, lastFrame, frameLength, terminalFrame, flag] = values;
        if (id === undefined
            || firstFrame === undefined
            || lastFrame === undefined
            || frameLength === undefined
            || terminalFrame === undefined
            || flag === undefined
            || firstFrame > lastFrame) {
            throw new Error(`Invalid animation range on line ${index + 1}`);
        }
        if (section.some(record => record.id === id)) {
            throw new Error(`Duplicate animation ID ${id} in section ${sections.length}`);
        }
        section.push({
            id,
            firstFrame,
            lastFrame,
            frameLength,
            terminalFrame,
            flag,
        });
    });

    return sections;
}

function validatePlayerAnimations(sections: readonly (readonly AnimationRecord[])[]): void {
    const player = sections[0];
    if (player === undefined) {
        throw new Error('Animation metadata has no player section');
    }
    const byId = new Map(player.map(record => [record.id, record]));
    for (const [id, expectedRange] of REQUIRED_PLAYER_ANIMATIONS) {
        const record = byId.get(id);
        if (record === undefined
            || record.firstFrame !== expectedRange[0]
            || record.lastFrame !== expectedRange[1]) {
            throw new Error(
                `Unsupported player animation ${id}; expected frames ${expectedRange[0]}-${expectedRange[1]}`,
            );
        }
    }
}

function sha256(data: Uint8Array): string {
    return createHash('sha256').update(data).digest('hex');
}

export async function sha256File(path: string): Promise<string> {
    const hash = createHash('sha256');
    await new Promise<void>((fulfill, reject) => {
        const stream = createReadStream(path);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', fulfill);
        stream.on('error', reject);
    });
    return hash.digest('hex');
}

function assertSourceFile(path: string): void {
    if (!existsSync(path) || !statSync(path).isFile()) {
        throw new Error(`Missing Spelunky HD source file: ${path}`);
    }
}

async function assertFileHash(
    path: string,
    expected: string,
    description: string,
): Promise<void> {
    const actual = await sha256File(path);
    if (actual !== expected) {
        throw new Error(
            `Unsupported ${description}: expected SHA-256 ${expected}, got ${actual}`,
        );
    }
}

function entryKey(group: string, name: string): string {
    return `${group}/${name}`;
}

function readEntry(wadPath: string, entry: WadEntry): Buffer {
    const data = Buffer.alloc(entry.length);
    const descriptor = openSync(wadPath, 'r');
    try {
        const bytesRead = readSync(
            descriptor,
            data,
            0,
            entry.length,
            entry.offset,
        );
        if (bytesRead !== entry.length) {
            throw new Error(
                `Short WAD read for ${entryKey(entry.group, entry.name)}: expected ${entry.length}, got ${bytesRead}`,
            );
        }
    } finally {
        closeSync(descriptor);
    }
    return data;
}

function ensureParent(path: string): void {
    mkdirSync(dirname(path), {recursive: true});
}

function writeDeterministicJson(path: string, value: unknown): void {
    ensureParent(path);
    writeFileSync(path, `${JSON.stringify(value, null, 4)}\n`);
}

function createPlayerAssets(sourceData: Buffer): {
    readonly png: Buffer;
    readonly spec: unknown;
} {
    const source = PNG.sync.read(sourceData, {skipRescale: true});
    const requiredWidth = PLAYER_COLUMNS * PLAYER_CELL_SIZE;
    const highestFrame = Math.max(...PLAYER_FRAME_SOURCES.map(([, frame]) => frame));
    const requiredHeight = (Math.floor(highestFrame / PLAYER_COLUMNS) + 1)
        * PLAYER_CELL_SIZE;
    if (source.width < requiredWidth || source.height < requiredHeight) {
        throw new Error(
            `Unsupported player atlas dimensions: expected at least ${requiredWidth}x${requiredHeight}, got ${source.width}x${source.height}`,
        );
    }

    const uniqueFrames = [...new Set(PLAYER_FRAME_SOURCES.map(([, frame]) => frame))];
    const outputRows = Math.ceil(uniqueFrames.length / OUTPUT_COLUMNS);
    const output = new PNG({
        width: OUTPUT_COLUMNS * PLAYER_CELL_SIZE,
        height: outputRows * PLAYER_CELL_SIZE,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    output.data.fill(0);

    const rectBySource = new Map<number, readonly [number, number, number, number]>();
    uniqueFrames.forEach((sourceFrame, outputIndex) => {
        const sourceX = (sourceFrame % PLAYER_COLUMNS) * PLAYER_CELL_SIZE;
        const sourceY = Math.floor(sourceFrame / PLAYER_COLUMNS) * PLAYER_CELL_SIZE;
        const outputX = (outputIndex % OUTPUT_COLUMNS) * PLAYER_CELL_SIZE;
        const outputY = Math.floor(outputIndex / OUTPUT_COLUMNS) * PLAYER_CELL_SIZE;

        PNG.bitblt(
            source,
            output,
            sourceX,
            sourceY,
            PLAYER_CELL_SIZE,
            PLAYER_CELL_SIZE,
            outputX,
            outputY,
        );
        rectBySource.set(sourceFrame, [
            outputX,
            outputY,
            PLAYER_CELL_SIZE,
            PLAYER_CELL_SIZE,
        ]);
    });

    const frames = PLAYER_FRAME_SOURCES.map(([name, sourceFrame]) => {
        const rect = rectBySource.get(sourceFrame);
        if (rect === undefined) {
            throw new Error(`Missing packed source frame ${sourceFrame}`);
        }
        return {name, rect, pivot: PLAYER_PIVOT};
    });
    const spec = {
        imageURL: '/generated/spelunky-hd/player.png',
        frameScale: 0.25,
        frames,
        animations: [
            {
                name: 'walk',
                frameLen: 8,
                frames: ['walk-1', 'walk-2', 'walk-3'],
            },
            {
                name: 'run',
                frameLen: 6,
                frames: ['run-1', 'run-2', 'run-3', 'run-4'],
            },
            {
                name: 'carry-run',
                frameLen: 6,
                frames: [
                    'carry-run-1',
                    'carry-run-2',
                    'carry-run-3',
                    'carry-run-4',
                ],
            },
        ],
    };

    return {
        png: PNG.sync.write(output, {
            colorType: 6,
            inputColorType: 6,
            bitDepth: 8,
            filterType: 4,
            deflateLevel: 9,
            deflateStrategy: 3,
        }),
        spec,
    };
}

function createEnemyAssets(sourceData: Buffer): {
    readonly png: Buffer;
    readonly spec: unknown;
} {
    const source = PNG.sync.read(sourceData, {skipRescale: true});
    const requiredWidth = PLAYER_COLUMNS * PLAYER_CELL_SIZE;
    const highestFrame = Math.max(...ENEMY_FRAME_SOURCES.map(([, frame]) => frame));
    const requiredHeight = (Math.floor(highestFrame / PLAYER_COLUMNS) + 1)
        * PLAYER_CELL_SIZE;
    if (source.width < requiredWidth || source.height < requiredHeight) {
        throw new Error(
            `Unsupported monster atlas dimensions: expected at least ${requiredWidth}x${requiredHeight}, got ${source.width}x${source.height}`,
        );
    }

    const output = new PNG({
        width: ENEMY_FRAME_SOURCES.length * PLAYER_CELL_SIZE,
        height: PLAYER_CELL_SIZE,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    output.data.fill(0);
    const frames = ENEMY_FRAME_SOURCES.map(([name, sourceFrame], outputIndex) => {
        const sourceX = (sourceFrame % PLAYER_COLUMNS) * PLAYER_CELL_SIZE;
        const sourceY = Math.floor(sourceFrame / PLAYER_COLUMNS) * PLAYER_CELL_SIZE;
        const outputX = outputIndex * PLAYER_CELL_SIZE;
        PNG.bitblt(
            source,
            output,
            sourceX,
            sourceY,
            PLAYER_CELL_SIZE,
            PLAYER_CELL_SIZE,
            outputX,
            0,
        );
        return {
            name,
            rect: [outputX, 0, PLAYER_CELL_SIZE, PLAYER_CELL_SIZE],
            pivot: ENEMY_PIVOT,
        };
    });

    return {
        png: PNG.sync.write(output, {
            colorType: 6,
            inputColorType: 6,
            bitDepth: 8,
            filterType: 4,
            deflateLevel: 9,
            deflateStrategy: 3,
        }),
        spec: {
            imageURL: '/generated/spelunky-hd/snake.png',
            frameScale: 0.25,
            frames,
            animations: [
                {
                    name: 'walk',
                    frameLen: 0.15,
                    frames: ['walk-1', 'walk-2'],
                },
            ],
        },
    };
}

function createTerrainImage(
    terrainSourceData: Buffer,
    backgroundSourceData: Buffer,
): Buffer {
    const terrain = PNG.sync.read(terrainSourceData, {skipRescale: true});
    const requiredWidth = Math.max(
        ...MINE_GROUND_SOURCES.map(([x]) => x + TERRAIN_CELL_SIZE),
    );
    const requiredHeight = Math.max(
        ...MINE_GROUND_SOURCES.map(([, y]) => y + TERRAIN_CELL_SIZE),
    );
    if (terrain.width < requiredWidth || terrain.height < requiredHeight) {
        throw new Error(
            `Unsupported terrain atlas dimensions: expected at least ${requiredWidth}x${requiredHeight}, got ${terrain.width}x${terrain.height}`,
        );
    }

    const background = decodeJpeg(backgroundSourceData, {
        useTArray: true,
        formatAsRGBA: true,
    });
    if (
        background.width < TERRAIN_CELL_SIZE
        || background.height < TERRAIN_CELL_SIZE
    ) {
        throw new Error(
            `Unsupported Mines background dimensions: expected at least ${TERRAIN_CELL_SIZE}x${TERRAIN_CELL_SIZE}, got ${background.width}x${background.height}`,
        );
    }

    const output = new PNG({
        width: (MINE_GROUND_SOURCES.length + 1) * TERRAIN_CELL_SIZE,
        height: TERRAIN_CELL_SIZE,
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        fill: false,
    });
    output.data.fill(0);

    MINE_GROUND_SOURCES.forEach(([sourceX, sourceY], outputIndex) => {
        PNG.bitblt(
            terrain,
            output,
            sourceX,
            sourceY,
            TERRAIN_CELL_SIZE,
            TERRAIN_CELL_SIZE,
            outputIndex * TERRAIN_CELL_SIZE,
            0,
        );
    });

    const backgroundOutputX = MINE_GROUND_SOURCES.length * TERRAIN_CELL_SIZE;
    for (let y = 0; y < TERRAIN_CELL_SIZE; y++) {
        const sourceStart = y * background.width * 4;
        const sourceEnd = sourceStart + TERRAIN_CELL_SIZE * 4;
        const outputStart = (y * output.width + backgroundOutputX) * 4;
        output.data.set(
            background.data.subarray(sourceStart, sourceEnd),
            outputStart,
        );
    }

    return PNG.sync.write(output, {
        colorType: 6,
        inputColorType: 6,
        bitDepth: 8,
        filterType: 4,
        deflateLevel: 9,
        deflateStrategy: 3,
    });
}

export async function importSpelunkyHd(
    options: ImportOptions,
): Promise<ImportResult> {
    const sourceRoot = resolve(options.sourceRoot);
    const outputRoot = resolve(options.outputRoot);
    const profile = options.profile ?? DEFAULT_IMPORT_PROFILE;
    const wadPath = join(sourceRoot, 'Data', 'Textures', 'alltex.wad');
    const wixPath = join(sourceRoot, 'Data', 'Textures', 'alltex.wad.wix');
    const animationsPath = join(
        sourceRoot,
        'Data',
        'Animations',
        'allanimations.wad',
    );

    [wadPath, wixPath, animationsPath].forEach(assertSourceFile);
    await Promise.all([
        assertFileHash(wadPath, profile.wadSha256, 'Spelunky HD texture WAD'),
        assertFileHash(wixPath, profile.wixSha256, 'Spelunky HD texture WIX'),
        assertFileHash(
            animationsPath,
            profile.animationsSha256,
            'Spelunky HD animation metadata',
        ),
    ]);

    const wix = readFileSync(wixPath, 'utf8');
    const entries = parseWix(wix, statSync(wadPath).size);
    const entriesByKey = new Map(entries.map(entry => [
        entryKey(entry.group, entry.name),
        entry,
    ]));
    const animationSections = parseAnimationSections(
        readFileSync(animationsPath, 'utf8'),
    );
    validatePlayerAnimations(animationSections);

    const selected: Array<{
        readonly key: string;
        readonly length: number;
        readonly sha256: string;
        readonly data: Buffer;
    }> = [];
    for (const approved of profile.entries) {
        assertSafeComponent(approved.group, 'approved group');
        assertSafeComponent(approved.name, 'approved entry name');
        const key = entryKey(approved.group, approved.name);
        const entry = entriesByKey.get(key);
        if (entry === undefined) {
            throw new Error(`Approved WAD entry is missing: ${key}`);
        }
        const data = readEntry(wadPath, entry);
        const actualHash = sha256(data);
        if (actualHash !== approved.sha256) {
            throw new Error(
                `Unsupported WAD entry ${key}: expected SHA-256 ${approved.sha256}, got ${actualHash}`,
            );
        }
        selected.push({key, length: entry.length, sha256: actualHash, data});
    }

    for (const entry of selected) {
        const [group, name] = entry.key.split('/');
        if (group === undefined || name === undefined) {
            throw new Error(`Invalid selected entry key: ${entry.key}`);
        }
        const sourceOutput = join(
            outputRoot,
            '.local',
            'spelunky-hd',
            'source',
            group,
            name,
        );
        ensureParent(sourceOutput);
        writeFileSync(sourceOutput, entry.data);
    }

    const playerSource = selected.find(entry => entry.key === 'PLAYERS/char_white.png');
    if (playerSource === undefined) {
        throw new Error('Import profile does not contain PLAYERS/char_white.png');
    }
    const playerAssets = createPlayerAssets(playerSource.data);
    const playerImagePath = join(
        outputRoot,
        'public',
        'generated',
        'spelunky-hd',
        'player.png',
    );
    const playerSpecPath = join(
        outputRoot,
        'public',
        'sprites',
        'generated',
        'spelunky-hd',
        'player.json',
    );
    ensureParent(playerImagePath);
    writeFileSync(playerImagePath, playerAssets.png);
    writeDeterministicJson(playerSpecPath, playerAssets.spec);

    const enemySource = selected.find(entry => entry.key === 'MONSTERS/monsters.png');
    if (enemySource === undefined) {
        throw new Error('Import profile does not contain MONSTERS/monsters.png');
    }
    const enemyAssets = createEnemyAssets(enemySource.data);
    const enemyImagePath = join(
        outputRoot,
        'public',
        'generated',
        'spelunky-hd',
        'snake.png',
    );
    const enemySpecPath = join(
        outputRoot,
        'public',
        'sprites',
        'generated',
        'spelunky-hd',
        'snake.json',
    );
    ensureParent(enemyImagePath);
    writeFileSync(enemyImagePath, enemyAssets.png);
    writeDeterministicJson(enemySpecPath, enemyAssets.spec);

    const terrainSource = selected.find(
        entry => entry.key === 'ALLTILES/alltiles.png',
    );
    if (terrainSource === undefined) {
        throw new Error('Import profile does not contain ALLTILES/alltiles.png');
    }
    const backgroundSource = selected.find(
        entry => entry.key === 'MINE/minebg.jpg',
    );
    if (backgroundSource === undefined) {
        throw new Error('Import profile does not contain MINE/minebg.jpg');
    }
    const terrainImage = createTerrainImage(
        terrainSource.data,
        backgroundSource.data,
    );
    const terrainImagePath = join(
        outputRoot,
        'public',
        'generated',
        'spelunky-hd',
        'mines.png',
    );
    ensureParent(terrainImagePath);
    writeFileSync(terrainImagePath, terrainImage);

    const reportPath = join(
        outputRoot,
        '.local',
        'spelunky-hd',
        'import-report.json',
    );
    writeDeterministicJson(reportPath, {
        formatVersion: 1,
        source: {
            appId: 239350,
            depotId: 239351,
            manifestId: '2622961810503583299',
            wadSha256: profile.wadSha256,
            wixSha256: profile.wixSha256,
            animationsSha256: profile.animationsSha256,
        },
        selectedEntries: selected.map(({key, length, sha256: entryHash}) => ({
            key,
            length,
            sha256: entryHash,
        })),
        playerAnimationRecords: animationSections[0],
        generated: [
            {
                path: 'public/generated/spelunky-hd/player.png',
                sha256: sha256(playerAssets.png),
            },
            {
                path: 'public/sprites/generated/spelunky-hd/player.json',
                sha256: await sha256File(playerSpecPath),
            },
            {
                path: 'public/generated/spelunky-hd/snake.png',
                sha256: sha256(enemyAssets.png),
            },
            {
                path: 'public/sprites/generated/spelunky-hd/snake.json',
                sha256: await sha256File(enemySpecPath),
            },
            {
                path: 'public/generated/spelunky-hd/mines.png',
                sha256: sha256(terrainImage),
            },
        ],
    });

    return {
        playerImagePath,
        playerSpecPath,
        enemyImagePath,
        enemySpecPath,
        terrainImagePath,
        reportPath,
    };
}
