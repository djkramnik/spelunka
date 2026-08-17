import Entity from '../Entity.js';
import Level from '../Level.js';
import {createBackgroundLayer} from '../layers/background.js';
import {createSpriteLayer} from '../layers/sprites.js';
import {loadJSON} from '../loaders.js';
import {Matrix} from '../math.js';
import type {EntityFactory} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import LevelTimer from '../traits/LevelTimer.js';
import Trigger from '../traits/Trigger.js';
import {loadMusicSheet} from './music.js';
import {
    LevelSpecSchema,
    PatternSheetSchema,
} from './schemas.js';
import type {
    LevelSpec,
    NamedTileSpec,
    PatternSheet,
    TileRange,
    TileSpec,
} from './schemas.js';
import {loadSpriteSheet} from './sprite.js';

type ProgressCallback = () => void;

interface TilePosition {
    x: number;
    y: number;
}

interface ExpandedTile extends TilePosition {
    tile: NamedTileSpec;
}

function createTimer(): Entity {
    const timer = new Entity();
    timer.addTrait(new LevelTimer());
    return timer;
}

function loadPattern(name: string): Promise<PatternSheet> {
    return loadJSON(
        `/sprites/patterns/${name}.json`,
        PatternSheetSchema,
    );
}

function setupBehavior(level: Level, musicEnabled: boolean): void {
    const timer = createTimer();
    level.entities.add(timer);

    if (musicEnabled) {
        level.events.listen(LevelTimer.EVENT_TIMER_OK, () => {
            level.music.playTheme();
        });
        level.events.listen(LevelTimer.EVENT_TIMER_HURRY, () => {
            level.music.playHurryTheme();
        });
    }
}

function setupBackgrounds(
    levelSpec: LevelSpec,
    level: Level,
    backgroundSprites: SpriteSheet,
    patterns: PatternSheet,
): void {
    levelSpec.layers.forEach(layer => {
        const grid = createGrid(layer.tiles, patterns);
        const backgroundLayer = createBackgroundLayer(
            level,
            grid,
            backgroundSprites,
        );
        level.comp.layers.push(backgroundLayer);
        level.tileCollider.addGrid(grid);
    });
}

function setupEntities(
    levelSpec: LevelSpec,
    level: Level,
    entityFactory: EntityFactory,
): void {
    levelSpec.entities.forEach(({name, pos: [x, y]}) => {
        const createEntity = entityFactory[name];
        if (!createEntity) {
            throw new Error(`Unknown entity factory: ${name}`);
        }

        const entity = createEntity();
        entity.pos.set(x, y);
        level.entities.add(entity);
    });

    level.comp.layers.push(createSpriteLayer(level.entities));
}

function setupTriggers(levelSpec: LevelSpec, level: Level): void {
    for (const triggerSpec of levelSpec.triggers) {
        const trigger = new Trigger();

        trigger.conditions.push((entity, touches) => {
            level.events.emit(Level.EVENT_TRIGGER, triggerSpec, entity, touches);
        });

        const entity = new Entity();
        entity.addTrait(trigger);
        entity.size.set(64, 64);
        entity.pos.set(triggerSpec.pos[0], triggerSpec.pos[1]);
        level.entities.add(entity);
    }
}

export function createLevelLoader(
    entityFactory: EntityFactory,
    {musicEnabled = true}: {musicEnabled?: boolean} = {},
) {
    return async function loadLevel(
        name: string,
        onProgress: ProgressCallback = () => {},
    ): Promise<Level> {
        const levelSpec = await loadJSON(
            `/levels/${name}.json`,
            LevelSpecSchema,
        );
        onProgress();

        const track = async <Value>(promise: Promise<Value>): Promise<Value> => {
            const value = await promise;
            onProgress();
            return value;
        };

        const [backgroundSprites, musicPlayer, patterns] = await Promise.all([
            track(loadSpriteSheet(levelSpec.spriteSheet)),
            track(loadMusicSheet(levelSpec.musicSheet)),
            track(loadPattern(levelSpec.patternSheet)),
        ]);

        const level = new Level();
        level.name = name;
        level.playerSpawn.set(...levelSpec.playerSpawn);
        level.music.setPlayer(musicPlayer);

        setupBackgrounds(levelSpec, level, backgroundSprites, patterns);
        setupEntities(levelSpec, level, entityFactory);
        setupTriggers(levelSpec, level);
        setupBehavior(level, musicEnabled);

        return level;
    };
}

function createGrid(
    tiles: readonly TileSpec[],
    patterns: PatternSheet,
): Matrix<NamedTileSpec> {
    const grid = new Matrix<NamedTileSpec>();

    for (const {tile, x, y} of expandTiles(tiles, patterns)) {
        grid.set(x, y, tile);
    }

    return grid;
}

function* expandSpan(
    xStart: number,
    xLength: number,
    yStart: number,
    yLength: number,
): Generator<TilePosition> {
    const xEnd = xStart + xLength;
    const yEnd = yStart + yLength;

    for (let x = xStart; x < xEnd; ++x) {
        for (let y = yStart; y < yEnd; ++y) {
            yield {x, y};
        }
    }
}

function* expandRange(range: TileRange): Generator<TilePosition> {
    if (range.length === 4) {
        const [xStart, xLength, yStart, yLength] = range;
        yield* expandSpan(xStart, xLength, yStart, yLength);
    } else if (range.length === 3) {
        const [xStart, xLength, yStart] = range;
        yield* expandSpan(xStart, xLength, yStart, 1);
    } else {
        const [xStart, yStart] = range;
        yield* expandSpan(xStart, 1, yStart, 1);
    }
}

function* expandRanges(
    ranges: readonly TileRange[],
): Generator<TilePosition> {
    for (const range of ranges) {
        yield* expandRange(range);
    }
}

function* expandTiles(
    tiles: readonly TileSpec[],
    patterns: PatternSheet,
): Generator<ExpandedTile> {
    function* walkTiles(
        nestedTiles: readonly TileSpec[],
        offsetX: number,
        offsetY: number,
    ): Generator<ExpandedTile> {
        for (const tile of nestedTiles) {
            for (const {x, y} of expandRanges(tile.ranges)) {
                const derivedX = x + offsetX;
                const derivedY = y + offsetY;

                if ('pattern' in tile) {
                    const pattern = patterns[tile.pattern];
                    if (!pattern) {
                        throw new Error(`Unknown tile pattern: ${tile.pattern}`);
                    }
                    yield* walkTiles(pattern.tiles, derivedX, derivedY);
                } else {
                    yield {tile, x: derivedX, y: derivedY};
                }
            }
        }
    }

    yield* walkTiles(tiles, 0, 0);
}
