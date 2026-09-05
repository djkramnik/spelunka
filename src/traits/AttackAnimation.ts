import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

function assertDuration(duration: number): void {
    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(`Invalid attack animation duration: ${duration}`);
    }
}

function assertImpactTime(impactTime: number, duration: number): void {
    if (!Number.isFinite(impactTime)
        || impactTime < 0
        || impactTime > duration) {
        throw new Error(`Invalid attack animation impact time: ${impactTime}`);
    }
}

/**
 * Reusable timing state for an entity's successful attack presentation.
 * The owning entity decides which sprite animation to route while active.
 */
export default class AttackAnimation extends Trait {
    time: number;
    private impactPending = false;

    constructor(
        readonly duration: number,
        readonly impactTime = 0,
    ) {
        super();
        assertDuration(duration);
        assertImpactTime(impactTime, duration);
        this.time = duration;
    }

    get active(): boolean {
        return this.time < this.duration;
    }

    start(): void {
        this.time = 0;
        this.impactPending = this.impactTime === 0;
    }

    consumeImpact(): boolean {
        if (!this.impactPending) {
            return false;
        }
        this.impactPending = false;
        return true;
    }

    override update(
        _entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        if (this.active) {
            const previousTime = this.time;
            this.time = Math.min(this.duration, this.time + deltaTime);
            if (previousTime < this.impactTime
                && this.time >= this.impactTime) {
                this.impactPending = true;
            }
        }
    }
}
