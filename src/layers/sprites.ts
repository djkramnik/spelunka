import Camera from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';
import Entity from '../Entity.js';

export function createSpriteLayer(
    entities: ReadonlySet<Entity>,
    width = 64,
    height = 64,
): RenderLayer<Camera> {
    const spriteBuffer = document.createElement('canvas');
    spriteBuffer.width = width;
    spriteBuffer.height = height;

    const spriteBufferContext = spriteBuffer.getContext('2d');
    if (!spriteBufferContext) {
        throw new Error('Unable to create sprite buffer context');
    }

    return function drawSpriteLayer(context, camera): void {
        const view = requireCamera(camera);
        entities.forEach(entity => {
            spriteBufferContext.clearRect(0, 0, width, height);
            entity.draw(spriteBufferContext);

            context.drawImage(
                spriteBuffer,
                Math.floor(entity.pos.x - view.pos.x),
                Math.floor(entity.pos.y - view.pos.y),
            );
        });
    };
}
