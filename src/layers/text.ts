import type {CanvasLayer} from '../Compositor.js';
import type {Font} from '../loaders/font.js';

export function createTextLayer(font: Font, text: string): CanvasLayer {
    const {size} = font;

    return function drawText(context): void {
        const textWidth = text.length;
        const screenWidth = Math.floor(context.canvas.width / size);
        const screenHeight = Math.floor(context.canvas.height / size);
        const x = screenWidth / 2 - textWidth / 2;
        const y = screenHeight / 2;
        font.print(text, context, x * size, y * size);
    };
}
