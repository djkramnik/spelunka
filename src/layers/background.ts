import Camera from '../Camera.js';
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
    buffer.width = 256 + 16;
    buffer.height = 240;

    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) {
        throw new Error('Unable to create background buffer context');
    }

    function redraw(startIndex: number, endIndex: number): void {
        bufferContext.clearRect(0, 0, buffer.width, buffer.height);

        for (let x = startIndex; x <= endIndex; ++x) {
            const column = tiles.grid[x];
            if (!column) {
                continue;
            }

            column.forEach((tile, y) => {
                if (sprites.animations.has(tile.name)) {
                    sprites.drawAnim(
                        tile.name,
                        bufferContext,
                        x - startIndex,
                        y,
                        level.totalTime,
                    );
                } else {
                    sprites.drawTile(
                        tile.name,
                        bufferContext,
                        x - startIndex,
                        y,
                    );
                }
            });
        }
    }

    return function drawBackgroundLayer(context, camera): void {
        const view = requireCamera(camera);
        const drawWidth = resolver.toIndex(view.size.x);
        const drawFrom = resolver.toIndex(view.pos.x);
        const drawTo = drawFrom + drawWidth;
        redraw(drawFrom, drawTo);

        context.drawImage(
            buffer,
            Math.floor(-view.pos.x % 16),
            Math.floor(-view.pos.y),
        );
    };
}
