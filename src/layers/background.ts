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
    const bufferWidth = VIEWPORT_WIDTH + resolver.tileSize;
    const bufferHeight = VIEWPORT_HEIGHT + resolver.tileSize;
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
                const tileName = selectBackgroundTileName(
                    tile.name,
                    x,
                    y,
                    sprites,
                );
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
    };

    return function drawBackgroundLayer(context, camera): void {
        const view = requireCamera(camera);
        const drawWidth = resolver.toIndex(view.size.x);
        const drawHeight = resolver.toIndex(view.size.y);
        const drawFromX = resolver.toIndex(view.pos.x);
        const drawFromY = resolver.toIndex(view.pos.y);
        const drawToX = drawFromX + drawWidth;
        const drawToY = drawFromY + drawHeight;
        redraw(drawFromX, drawToX, drawFromY, drawToY);

        context.drawImage(
            buffer,
            Math.floor(-view.pos.x % resolver.tileSize),
            Math.floor(-view.pos.y % resolver.tileSize),
            bufferWidth,
            bufferHeight,
        );
    };
}
