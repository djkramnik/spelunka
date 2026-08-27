import Camera, {VIEWPORT_HEIGHT, VIEWPORT_WIDTH} from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';
import type Level from '../Level.js';
import type {NamedTileSpec} from '../loaders/schemas.js';
import {Matrix} from '../math.js';
import {OUTPUT_SCALE} from '../Renderer.js';
import SpriteSheet from '../SpriteSheet.js';
import TileResolver from '../TileResolver.js';

const GROUND_VARIANTS = [
    'ground-1',
    'ground-2',
    'ground-3',
    'ground-4',
] as const;

const BUFFER_PADDING_TILES = 1;
const MINE_BACKGROUND_FILL_COLUMNS = 4;
const MINE_BACKGROUND_FILL_ROWS = 4;
const MINE_BACKGROUND_COLUMNS = 20;
const MINE_BACKGROUND_ROWS = 12;
const HD_TERRAIN_TILES = [
    ...GROUND_VARIANTS,
    'ground-2x1-1-left',
    'ground-2x1-1-right',
    'ground-2x1-2-left',
    'ground-2x1-2-right',
    'ground-1x2-1-top',
    'ground-1x2-1-bottom',
    'ground-1x2-2-top',
    'ground-1x2-2-bottom',
    ...Array.from({length: 4}, (_, index) => {
        const variant = index + 1;
        return [
            `ground-2x2-${variant}-top-left`,
            `ground-2x2-${variant}-top-right`,
            `ground-2x2-${variant}-bottom-left`,
            `ground-2x2-${variant}-bottom-right`,
        ];
    }).flat(),
    'ground-edge-top-1',
    'ground-edge-top-2',
    'ground-edge-top-3',
    'ground-edge-bottom-1',
    'ground-edge-bottom-2',
    'ground-edge-left',
    'ground-edge-right',
] as const;

export type GroundEdge = 'left' | 'right' | 'top' | 'bottom';

function positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
}

export function getMinesBackgroundTileNames(
    name: string,
    x: number,
    y: number,
): readonly [string, string] | undefined {
    if (name !== 'sky') {
        return undefined;
    }
    const fillX = positiveModulo(x, MINE_BACKGROUND_FILL_COLUMNS);
    const fillY = positiveModulo(y, MINE_BACKGROUND_FILL_ROWS);
    const decorationX = positiveModulo(x, MINE_BACKGROUND_COLUMNS);
    const decorationY = positiveModulo(y, MINE_BACKGROUND_ROWS);
    return [
        `sky-fill-${fillX}-${fillY}`,
        `sky-decor-${decorationX}-${decorationY}`,
    ];
}

function supportsMinesBackground(sprites: SpriteSheet): boolean {
    for (let y = 0; y < MINE_BACKGROUND_ROWS; y += 1) {
        for (let x = 0; x < MINE_BACKGROUND_COLUMNS; x += 1) {
            if (!sprites.tiles.has(`sky-decor-${x}-${y}`)) {
                return false;
            }
        }
    }
    for (let y = 0; y < MINE_BACKGROUND_FILL_ROWS; y += 1) {
        for (let x = 0; x < MINE_BACKGROUND_FILL_COLUMNS; x += 1) {
            if (!sprites.tiles.has(`sky-fill-${x}-${y}`)) {
                return false;
            }
        }
    }
    return true;
}

function coordinateVariant(
    x: number,
    y: number,
    count: number,
    salt = 0,
): number {
    const hash = (
        Math.imul(x, 73856093)
        ^ Math.imul(y, 19349663)
        ^ Math.imul(salt, 83492791)
    ) >>> 0;
    return hash % count;
}

function isGround(tiles: Matrix<NamedTileSpec>, x: number, y: number): boolean {
    return tiles.get(x, y)?.name === 'ground';
}

export function getExposedGroundEdges(
    tiles: Matrix<NamedTileSpec>,
    x: number,
    y: number,
): readonly GroundEdge[] {
    if (!isGround(tiles, x, y)) {
        return [];
    }

    const edges: GroundEdge[] = [];
    if (!isGround(tiles, x - 1, y)) {
        edges.push('left');
    }
    if (!isGround(tiles, x + 1, y)) {
        edges.push('right');
    }
    if (!isGround(tiles, x, y - 1)) {
        edges.push('top');
    }
    if (!isGround(tiles, x, y + 1)) {
        edges.push('bottom');
    }
    return edges;
}

export function composeGroundTileNames(
    tiles: Matrix<NamedTileSpec>,
): Matrix<string> {
    const result = new Matrix<string>();
    const groundCoordinates: Array<readonly [number, number]> = [];
    tiles.forEach((tile, x, y) => {
        if (tile.name === 'ground') {
            groundCoordinates.push([x, y]);
        }
    });
    groundCoordinates.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

    const assigned = new Set<string>();
    const key = (x: number, y: number): string => `${x},${y}`;
    const available = (x: number, y: number): boolean => (
        isGround(tiles, x, y) && !assigned.has(key(x, y))
    );
    const assign = (x: number, y: number, name: string): void => {
        result.set(x, y, name);
        assigned.add(key(x, y));
    };

    groundCoordinates.forEach(([x, y]) => {
        if (!available(x, y)
            || !available(x + 1, y)
            || !available(x, y + 1)
            || !available(x + 1, y + 1)) {
            return;
        }
        const variant = coordinateVariant(x, y, 4, 22) + 1;
        assign(x, y, `ground-2x2-${variant}-top-left`);
        assign(x + 1, y, `ground-2x2-${variant}-top-right`);
        assign(x, y + 1, `ground-2x2-${variant}-bottom-left`);
        assign(x + 1, y + 1, `ground-2x2-${variant}-bottom-right`);
    });

    groundCoordinates.forEach(([x, y]) => {
        if (!available(x, y)) {
            return;
        }
        const horizontalFirst = coordinateVariant(x, y, 2, 12) === 0;
        const tryHorizontal = (): boolean => {
            if (!available(x + 1, y)) {
                return false;
            }
            const variant = coordinateVariant(x, y, 2, 21) + 1;
            assign(x, y, `ground-2x1-${variant}-left`);
            assign(x + 1, y, `ground-2x1-${variant}-right`);
            return true;
        };
        const tryVertical = (): boolean => {
            if (!available(x, y + 1)) {
                return false;
            }
            const variant = coordinateVariant(x, y, 2, 21) + 1;
            assign(x, y, `ground-1x2-${variant}-top`);
            assign(x, y + 1, `ground-1x2-${variant}-bottom`);
            return true;
        };
        if (horizontalFirst ? tryHorizontal() : tryVertical()) {
            return;
        }
        if (horizontalFirst) {
            tryVertical();
        } else {
            tryHorizontal();
        }
    });

    groundCoordinates.forEach(([x, y]) => {
        if (available(x, y)) {
            assign(
                x,
                y,
                GROUND_VARIANTS[coordinateVariant(x, y, 4, 11)] ?? 'ground-1',
            );
        }
    });
    return result;
}

export function selectBackgroundTileName(
    name: string,
    x: number,
    y: number,
    sprites: SpriteSheet,
): string {
    if (
        name !== 'ground'
        || !GROUND_VARIANTS.every(variant => sprites.tiles.has(variant))
    ) {
        return name;
    }

    const index = Math.abs(x + y * 3) % GROUND_VARIANTS.length;
    return GROUND_VARIANTS[index] ?? name;
}

export function createBackgroundLayer(
    level: Level,
    tiles: Matrix<NamedTileSpec>,
    sprites: SpriteSheet,
): RenderLayer<Camera> {
    const resolver = new TileResolver(tiles);
    const hdTerrain = HD_TERRAIN_TILES.every(name => sprites.tiles.has(name));
    const minesBackground = supportsMinesBackground(sprites);
    const groundTileNames = hdTerrain
        ? composeGroundTileNames(tiles)
        : undefined;
    const bufferPadding = hdTerrain ? BUFFER_PADDING_TILES : 0;
    const bufferWidth = VIEWPORT_WIDTH
        + resolver.tileSize * (1 + bufferPadding * 2);
    const bufferHeight = VIEWPORT_HEIGHT
        + resolver.tileSize * (1 + bufferPadding * 2);
    const buffer = document.createElement('canvas');
    buffer.width = bufferWidth * OUTPUT_SCALE;
    buffer.height = bufferHeight * OUTPUT_SCALE;

    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) {
        throw new Error('Unable to create background buffer context');
    }
    bufferContext.imageSmoothingEnabled = false;
    bufferContext.setTransform(OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0);

    const redraw = (
        startX: number,
        endX: number,
        startY: number,
        endY: number,
    ): void => {
        bufferContext.clearRect(0, 0, bufferWidth, bufferHeight);

        for (let x = startX; x <= endX; ++x) {
            for (let y = startY; y <= endY; ++y) {
                const tile = tiles.get(x, y);
                if (!tile) {
                    continue;
                }
                const backgroundTileNames = minesBackground
                    ? getMinesBackgroundTileNames(tile.name, x, y)
                    : undefined;
                if (backgroundTileNames) {
                    backgroundTileNames.forEach(name => {
                        sprites.drawTile(
                            name,
                            bufferContext,
                            x - startX,
                            y - startY,
                        );
                    });
                    continue;
                }
                const tileName = groundTileNames?.get(x, y)
                    ?? selectBackgroundTileName(tile.name, x, y, sprites);
                if (sprites.animations.has(tileName)) {
                    sprites.drawAnim(
                        tileName,
                        bufferContext,
                        x - startX,
                        y - startY,
                        level.totalTime,
                    );
                } else {
                    sprites.drawTile(
                        tileName,
                        bufferContext,
                        x - startX,
                        y - startY,
                    );
                }
            }
        }

        if (hdTerrain) {
            for (let x = startX; x <= endX; ++x) {
                for (let y = startY; y <= endY; ++y) {
                    getExposedGroundEdges(tiles, x, y).forEach(edge => {
                        const localX = x - startX;
                        const localY = y - startY;
                        if (edge === 'left') {
                            sprites.drawTile(
                                'ground-edge-left',
                                bufferContext,
                                localX - 0.5,
                                localY,
                            );
                        } else if (edge === 'right') {
                            sprites.drawTile(
                                'ground-edge-right',
                                bufferContext,
                                localX + 0.5,
                                localY,
                            );
                        } else if (edge === 'top') {
                            const variant = coordinateVariant(x, y, 3, 31) + 1;
                            sprites.drawTile(
                                `ground-edge-top-${variant}`,
                                bufferContext,
                                localX,
                                localY - 0.4,
                            );
                        } else {
                            const variant = coordinateVariant(x, y, 2, 41) + 1;
                            sprites.drawTile(
                                `ground-edge-bottom-${variant}`,
                                bufferContext,
                                localX,
                                localY + 0.6,
                            );
                        }
                    });
                }
            }
        }
    };

    return function drawBackgroundLayer(context, camera): void {
        const view = requireCamera(camera);
        const drawWidth = resolver.toIndex(view.size.x);
        const drawHeight = resolver.toIndex(view.size.y);
        const drawFromX = resolver.toIndex(view.pos.x) - bufferPadding;
        const drawFromY = resolver.toIndex(view.pos.y) - bufferPadding;
        const drawToX = drawFromX + drawWidth + bufferPadding * 2;
        const drawToY = drawFromY + drawHeight + bufferPadding * 2;
        redraw(drawFromX, drawToX, drawFromY, drawToY);

        context.drawImage(
            buffer,
            -bufferPadding * resolver.tileSize
                + Math.floor(-view.pos.x % resolver.tileSize),
            -bufferPadding * resolver.tileSize
                + Math.floor(-view.pos.y % resolver.tileSize),
            bufferWidth,
            bufferHeight,
        );
    };
}
