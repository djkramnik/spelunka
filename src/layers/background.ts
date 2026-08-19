import Camera, {VIEWPORT_HEIGHT, VIEWPORT_WIDTH} from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';
import type Level from '../Level.js';
import type {NamedTileSpec} from '../loaders/schemas.js';
import {Matrix} from '../math.js';
import SpriteSheet from '../SpriteSheet.js';
import TileResolver from '../TileResolver.js';

export function createBackgroundLayer(
    level: Level,
    tiles: Matrix<NamedTileSpec>,
    sprites: SpriteSheet,
): RenderLayer<Camera> {
    const resolver = new TileResolver(tiles);
    const buffer = document.createElement('canvas');
    buffer.width = VIEWPORT_WIDTH + resolver.tileSize;
    buffer.height = VIEWPORT_HEIGHT + resolver.tileSize;

    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) {
        throw new Error('Unable to create background buffer context');
    }

    const redraw = (
        startX: number,
        endX: number,
        startY: number,
        endY: number,
    ): void => {
        bufferContext.clearRect(0, 0, buffer.width, buffer.height);

        for (let x = startX; x <= endX; ++x) {
            for (let y = startY; y <= endY; ++y) {
                const tile = tiles.get(x, y);
                if (!tile) {
                    continue;
                }
                if (sprites.animations.has(tile.name)) {
                    sprites.drawAnim(
                        tile.name,
                        bufferContext,
                        x - startX,
                        y - startY,
                        level.totalTime,
                    );
                } else {
                    sprites.drawTile(
                        tile.name,
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
        );
    };
}
