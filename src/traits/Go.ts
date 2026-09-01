import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class Go extends Trait {
    enabled = true;
    dir = 0;
    acceleration = 400;
    deceleration = 300;
    dragFactor = 1 / 5000;
    distance = 0;
    heading = 1;

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        if (!this.enabled) {
            return;
        }
        const absoluteVelocity = Math.abs(entity.vel.x);

        if (this.dir !== 0) {
            entity.vel.x += this.acceleration * deltaTime * this.dir;

            // Spelunky permits directional air control and turns the player
            // toward that input; keep movement and visual facing aligned.
            this.heading = this.dir;
        } else if (entity.vel.x !== 0) {
            const deceleration = Math.min(
                absoluteVelocity,
                this.deceleration * deltaTime,
            );
            entity.vel.x += entity.vel.x > 0 ? -deceleration : deceleration;
        } else {
            this.distance = 0;
        }

        const drag = this.dragFactor * entity.vel.x * absoluteVelocity;
        entity.vel.x -= drag;
        this.distance += absoluteVelocity * deltaTime;
    }
}
