import type {Animation} from './anim.js';

type SpriteBuffers = [HTMLCanvasElement, HTMLCanvasElement];

interface SpriteFrame {
    readonly buffers: SpriteBuffers;
    readonly width: number;
    readonly height: number;
    readonly pivotX: number;
    readonly pivotY: number;
    readonly scale: number;
}

export default class SpriteSheet {
    readonly tiles = new Map<string, SpriteFrame>();
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
        pivot: readonly [number, number] = [width / 2, height],
        scale = 1,
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

        this.tiles.set(name, {
            buffers,
            width,
            height,
            pivotX: pivot[0],
            pivotY: pivot[1],
            scale,
        });
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
        const frame = this.tiles.get(name);
        if (!frame) {
            throw new Error(`Unknown sprite: ${name}`);
        }

        context.drawImage(
            frame.buffers[flip ? 1 : 0],
            x,
            y,
            frame.width * frame.scale,
            frame.height * frame.scale,
        );
    }

    drawFrame(
        name: string,
        context: CanvasRenderingContext2D,
        pivotX: number,
        pivotY: number,
        flip = false,
    ): void {
        const frame = this.tiles.get(name);
        if (!frame) {
            throw new Error(`Unknown sprite: ${name}`);
        }

        const sourcePivotX = flip
            ? frame.width - frame.pivotX
            : frame.pivotX;
        context.drawImage(
            frame.buffers[flip ? 1 : 0],
            pivotX - sourcePivotX * frame.scale,
            pivotY - frame.pivotY * frame.scale,
            frame.width * frame.scale,
            frame.height * frame.scale,
        );
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
