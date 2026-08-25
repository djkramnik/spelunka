import type {CanvasLayer} from '../Compositor.js';
import type {Font} from '../loaders/font.js';
import {LOGICAL_HEIGHT, LOGICAL_WIDTH} from '../Renderer.js';

export function createTextLayer(font: Font, text: string): CanvasLayer {
    const {size} = font;

    return function drawText(context): void {
        const textWidth = text.length;
        const screenWidth = Math.floor(LOGICAL_WIDTH / size);
        const screenHeight = Math.floor(LOGICAL_HEIGHT / size);
        const x = screenWidth / 2 - textWidth / 2;
        const y = screenHeight / 2;
        font.print(text, context, x * size, y * size);
    };
}
