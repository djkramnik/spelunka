import Camera from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';

export function createCameraLayer(cameraToDraw: Camera): RenderLayer<Camera> {
    return function drawCameraRect(context, fromCamera): void {
        const view = requireCamera(fromCamera);
        context.strokeStyle = 'purple';
        context.beginPath();
        context.rect(
            cameraToDraw.pos.x - view.pos.x,
            cameraToDraw.pos.y - view.pos.y,
            cameraToDraw.size.x,
            cameraToDraw.size.y,
        );
        context.stroke();
    };
}
