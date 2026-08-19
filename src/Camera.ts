import {Vec2} from './math.js';

export const VIEWPORT_WIDTH = 256;
export const VIEWPORT_HEIGHT = 240;

export default class Camera {
    readonly pos = new Vec2(0, 0);
    readonly size = new Vec2(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    clampTo(worldSize: Vec2): void {
        const maxX = Math.max(0, worldSize.x - this.size.x);
        const maxY = Math.max(0, worldSize.y - this.size.y);

        this.pos.x = Math.max(0, Math.min(this.pos.x, maxX));
        this.pos.y = Math.max(0, Math.min(this.pos.y, maxY));
    }
}
