import {loadImage} from '../loaders.js';
import SpriteSheet from '../SpriteSheet.js';

const CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

export class Font {
    constructor(
        private readonly sprites: SpriteSheet,
        readonly size: number,
    ) {}

    print(
        text: string,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void {
        [...text].forEach((char, position) => {
            this.sprites.draw(char, context, x + position * this.size, y);
        });
    }
}

export async function loadFont(): Promise<Font> {
    const image = await loadImage('./img/font.png');
    const fontSprite = new SpriteSheet(image);
    const size = 8;
    const rowLength = image.width;

    for (const [index, char] of [...CHARS].entries()) {
        const x = index * size % rowLength;
        const y = Math.floor(index * size / rowLength) * size;
        fontSprite.define(char, x, y, size, size);
    }

    return new Font(fontSprite, size);
}
