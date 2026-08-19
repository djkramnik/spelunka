import {Vec2} from './math.js';

export default class Camera {
    readonly pos = new Vec2(0, 0);
    readonly size = new Vec2(256, 224);

    clampTo(worldSize: Vec2): void {
        const maxX = Math.max(0, worldSize.x - this.size.x);
        const maxY = Math.max(0, worldSize.y - this.size.y);

        this.pos.x = Math.max(0, Math.min(this.pos.x, maxX));
        this.pos.y = Math.max(0, Math.min(this.pos.y, maxY));
    }
}
