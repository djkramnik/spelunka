import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class Jump extends Trait {
    ready = 0;
    duration = 0.3;
    engageTime = 0;
    requestTime = 0;
    gracePeriod = 0.1;
    speedBoost = 0.3;
    velocity = 200;

    get falling(): boolean {
        return this.ready < 0;
    }

    start(): void {
        this.requestTime = this.gracePeriod;
    }

    cancel(): void {
        this.engageTime = 0;
        this.requestTime = 0;
    }

    override obstruct(_entity: Entity, side: symbol): void {
        if (side === Sides.BOTTOM) {
            this.ready = 1;
        } else if (side === Sides.TOP) {
            this.cancel();
        }
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        if (this.requestTime > 0) {
            if (this.ready > 0) {
                entity.sounds.add('jump');
                this.engageTime = this.duration;
                this.requestTime = 0;
            }

            this.requestTime -= deltaTime;
        }

        if (this.engageTime > 0) {
            entity.vel.y = -(
                this.velocity + Math.abs(entity.vel.x) * this.speedBoost
            );
            this.engageTime -= deltaTime;
        }

        this.ready--;
    }
}
