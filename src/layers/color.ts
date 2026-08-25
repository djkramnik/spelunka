import type {CanvasLayer} from '../Compositor.js';
import {LOGICAL_HEIGHT, LOGICAL_WIDTH} from '../Renderer.js';

export function createColorLayer(color: string): CanvasLayer {
    return function drawColor(context): void {
        context.fillStyle = color;
        context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    };
}
