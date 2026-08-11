export type CanvasLayer = (context: CanvasRenderingContext2D) => void;

export type RenderLayer<Camera = undefined> = (
    context: CanvasRenderingContext2D,
    camera: Camera,
) => void;

export default class Compositor<Camera = undefined> {
    readonly layers: Array<RenderLayer<Camera>> = [];

    draw(context: CanvasRenderingContext2D, camera?: Camera): void {
        this.layers.forEach(layer => {
            layer(context, camera as Camera);
        });
    }
}
