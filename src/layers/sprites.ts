import Camera from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';
import Entity from '../Entity.js';

export function createSpriteLayer(
    entities: ReadonlySet<Entity>,
): RenderLayer<Camera> {
    const renderQueue: Entity[] = [];

    return function drawSpriteLayer(context, camera): void {
        const view = requireCamera(camera);
        renderQueue.length = 0;
        entities.forEach(entity => renderQueue.push(entity));
        renderQueue.sort((a, b) => a.zIndex - b.zIndex);

        renderQueue.forEach(entity => {
            context.save();
            context.translate(
                Math.floor(entity.pos.x - view.pos.x),
                Math.floor(entity.pos.y - view.pos.y),
            );
            entity.draw(context);
            context.restore();
        });
    };
}
