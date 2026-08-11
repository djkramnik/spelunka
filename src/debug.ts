import Camera from './Camera.js';
import Entity from './Entity.js';

export function setupMouseControl(
    canvas: HTMLCanvasElement,
    entity: Entity,
    camera: Camera,
): void {
    let lastEvent: MouseEvent | undefined;

    const handleMouse = (event: MouseEvent): void => {
        if (event.buttons === 1) {
            entity.vel.set(0, 0);
            entity.pos.set(
                event.offsetX + camera.pos.x,
                event.offsetY + camera.pos.y,
            );
        } else if (event.buttons === 2
            && lastEvent?.buttons === 2
            && lastEvent.type === 'mousemove') {
            camera.pos.x -= event.offsetX - lastEvent.offsetX;
        }

        lastEvent = event;
    };

    canvas.addEventListener('mousedown', handleMouse);
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('contextmenu', event => {
        event.preventDefault();
    });
}
