import type {CanvasLayer} from '../Compositor.js';

export function createColorLayer(color: string): CanvasLayer {
    return function drawColor(context): void {
        context.fillStyle = color;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    };
}
