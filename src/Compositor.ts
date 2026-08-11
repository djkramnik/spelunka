export type CanvasLayer = (context: CanvasRenderingContext2D) => void;

export type RenderLayer<Camera = undefined> = (
    context: CanvasRenderingContext2D,
    camera: Camera | undefined,
) => void;

export function requireCamera<Camera>(camera: Camera | undefined): Camera {
    if (camera === undefined) {
        throw new Error('This render layer requires a camera');
    }
    return camera;
}

export default class Compositor<Camera = undefined> {
    readonly layers: Array<RenderLayer<Camera>> = [];

    draw(context: CanvasRenderingContext2D, camera?: Camera): void {
        this.layers.forEach(layer => {
            layer(context, camera);
        });
    }
}
