export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 180;
export const OUTPUT_SCALE = 4;
export const OUTPUT_WIDTH = LOGICAL_WIDTH * OUTPUT_SCALE;
export const OUTPUT_HEIGHT = LOGICAL_HEIGHT * OUTPUT_SCALE;

export default class Renderer {
    readonly context: CanvasRenderingContext2D;

    constructor(readonly outputCanvas: HTMLCanvasElement) {
        outputCanvas.width = OUTPUT_WIDTH;
        outputCanvas.height = OUTPUT_HEIGHT;

        const context = outputCanvas.getContext('2d');
        if (!context) {
            throw new Error('Unable to create the output canvas context');
        }
        context.imageSmoothingEnabled = false;
        context.setTransform(OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0);
        this.context = context;
    }

    present(): void {}
}
