import type {Animation} from './anim.js';

type SpriteBuffers = [HTMLCanvasElement, HTMLCanvasElement];

export default class SpriteSheet {
    readonly tiles = new Map<string, SpriteBuffers>();
    readonly animations = new Map<string, Animation>();

    constructor(
        private readonly image: CanvasImageSource,
        readonly width?: number,
        readonly height?: number,
    ) {}

    defineAnim(name: string, animation: Animation): void {
        this.animations.set(name, animation);
    }

    getAnimation(name: string): Animation {
        const animation = this.animations.get(name);
        if (!animation) {
            throw new Error(`Unknown animation: ${name}`);
        }
        return animation;
    }

    define(
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        const createBuffer = (flip: boolean): HTMLCanvasElement => {
            const buffer = document.createElement('canvas');
            buffer.width = width;
            buffer.height = height;

            const context = buffer.getContext('2d');
            if (!context) {
                throw new Error('Unable to create sprite buffer context');
            }

            if (flip) {
                context.scale(-1, 1);
                context.translate(-width, 0);
            }

            context.drawImage(
                this.image,
                x,
                y,
                width,
                height,
                0,
                0,
                width,
                height,
            );

            return buffer;
        };

        const buffers: SpriteBuffers = [
            createBuffer(false),
            createBuffer(true),
        ];

        this.tiles.set(name, buffers);
    }

    defineTile(name: string, x: number, y: number): void {
        this.assertTileSize();
        this.define(
            name,
            x * this.width,
            y * this.height,
            this.width,
            this.height,
        );
    }

    draw(
        name: string,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        flip = false,
    ): void {
        const buffers = this.tiles.get(name);
        if (!buffers) {
            throw new Error(`Unknown sprite: ${name}`);
        }

        context.drawImage(buffers[flip ? 1 : 0], x, y);
    }

    drawAnim(
        name: string,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        distance: number,
    ): void {
        const animation = this.getAnimation(name);
        this.drawTile(animation(distance), context, x, y);
    }

    drawTile(
        name: string,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
    ): void {
        this.assertTileSize();
        this.draw(name, context, x * this.width, y * this.height);
    }

    private assertTileSize(): asserts this is this & {
        width: number;
        height: number;
    } {
        if (this.width === undefined || this.height === undefined) {
            throw new Error('Tile dimensions are required for tile operations');
        }
    }
}
