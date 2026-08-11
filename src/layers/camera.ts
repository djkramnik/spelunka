import Camera from '../Camera.js';
import type {RenderLayer} from '../Compositor.js';

export function createCameraLayer(cameraToDraw: Camera): RenderLayer<Camera> {
    return function drawCameraRect(context, fromCamera): void {
        context.strokeStyle = 'purple';
        context.beginPath();
        context.rect(
            cameraToDraw.pos.x - fromCamera.pos.x,
            cameraToDraw.pos.y - fromCamera.pos.y,
            cameraToDraw.size.x,
            cameraToDraw.size.y,
        );
        context.stroke();
    };
}
