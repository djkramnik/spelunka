import type Entity from '../Entity.js';
import {EventKey} from '../EventEmitter.js';
import Trait from '../Trait.js';
import Jump from './Jump.js';
import Killable from './Killable.js';

const EVENT_STOMP = new EventKey<[us: Entity, them: Entity]>('stomp');

export const SPELUNKY_STOMP_BASE_REBOUND_SPEED = 180;
export const SPELUNKY_STOMP_IMPACT_FACTOR = 0.2;
export const SPELUNKY_STOMP_REGION_DEPTH = 8;

export default class Stomper extends Trait {
    static readonly EVENT_STOMP = EVENT_STOMP;

    bounceSpeed = SPELUNKY_STOMP_BASE_REBOUND_SPEED;
    impactFactor = SPELUNKY_STOMP_IMPACT_FACTOR;
    stompRegionDepth = SPELUNKY_STOMP_REGION_DEPTH;
    private reboundQueued = false;

    canStomp(us: Entity, them: Entity): boolean {
        const overlapDepth = us.bounds.bottom - them.bounds.top;
        return us.vel.y > them.vel.y
            && us.bounds.top < them.bounds.top
            && overlapDepth > 0
            && overlapDepth <= this.stompRegionDepth;
    }

    reboundSpeedFor(impactVelocity: number): number {
        return this.bounceSpeed
            + Math.max(0, impactVelocity) * this.impactFactor;
    }

    bounce(us: Entity, them: Entity, velocity: number): void {
        us.bounds.bottom = them.bounds.top;
        if (us.traits.has(Jump)) {
            us.traits.get(Jump).rebound(us, velocity);
        } else {
            us.vel.y = -velocity;
        }
    }

    tryStomp(us: Entity, them: Entity): boolean {
        if (!this.canStomp(us, them)) {
            return false;
        }

        if (this.reboundQueued) {
            return true;
        }

        this.reboundQueued = true;
        const reboundVelocity = this.reboundSpeedFor(us.vel.y);
        this.queue(() => {
            this.reboundQueued = false;
            this.bounce(us, them, reboundVelocity);
        });
        us.sounds.add('stomp');
        us.events.emit(Stomper.EVENT_STOMP, us, them);
        return true;
    }

    override collides(us: Entity, them: Entity): void {
        if (!them.traits.has(Killable)) {
            return;
        }

        const killable = them.traits.get(Killable);
        if (killable.dead) {
            return;
        }

        this.tryStomp(us, them);
    }
}
