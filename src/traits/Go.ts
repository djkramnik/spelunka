import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

type MovingEntity = Entity & {
    jump?: {
        falling: boolean;
    };
};

export default class Go extends Trait {
    dir = 0;
    acceleration = 400;
    deceleration = 300;
    dragFactor = 1 / 5000;
    distance = 0;
    heading = 1;

    override update(
        entity: MovingEntity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        const absoluteVelocity = Math.abs(entity.vel.x);

        if (this.dir !== 0) {
            entity.vel.x += this.acceleration * deltaTime * this.dir;

            if (!entity.jump || entity.jump.falling === false) {
                this.heading = this.dir;
            }
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
