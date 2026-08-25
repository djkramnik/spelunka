import type Entity from '../Entity.js';
import {Vec2} from '../math.js';
import Trait from '../Trait.js';
import Physics from './Physics.js';

const CARRIED_Z_INDEX_OFFSET = 1;
const DEFAULT_HORIZONTAL_THROW_SPEED = 480;
const DEFAULT_UPWARD_THROW_SPEED = -180;
const DEFAULT_THROWER_GRACE_UPDATES = 10;

export default class Pickable extends Trait {
    readonly carryOffset = new Vec2(8, -8);
    readonly throwVelocity = new Vec2(
        DEFAULT_HORIZONTAL_THROW_SPEED,
        DEFAULT_UPWARD_THROW_SPEED,
    );
    throwerGraceUpdates = DEFAULT_THROWER_GRACE_UPDATES;
    carrier: Entity | null = null;
    private carryDirection = 1;
    private uncarriedZIndex = 0;
    private recentThrower: Entity | null = null;
    private throwDirection = 0;
    private throwerGraceUpdatesRemaining = 0;

    private clearThrowerProtection(): void {
        this.recentThrower = null;
        this.throwDirection = 0;
        this.throwerGraceUpdatesRemaining = 0;
    }

    private setPhysicsEnabled(entity: Entity, enabled: boolean): void {
        if (entity.traits.has(Physics)) {
            entity.traits.get(Physics).enabled = enabled;
        }
    }

    attach(entity: Entity, carrier: Entity, direction = 1): boolean {
        if (this.carrier !== null) {
            return false;
        }

        this.clearThrowerProtection();
        this.carrier = carrier;
        this.uncarriedZIndex = entity.zIndex;
        this.setPhysicsEnabled(entity, false);
        this.followCarrier(entity, direction);
        return true;
    }

    release(entity: Entity, carrier: Entity, direction = this.carryDirection): boolean {
        if (this.carrier !== carrier) {
            return false;
        }

        this.carryDirection = direction < 0 ? -1 : 1;
        this.carrier = null;
        this.recentThrower = carrier;
        this.throwerGraceUpdatesRemaining = this.throwerGraceUpdates;
        this.setPhysicsEnabled(entity, true);
        entity.vel.set(
            carrier.vel.x + this.throwVelocity.x * this.carryDirection,
            this.throwVelocity.y,
        );
        this.throwDirection = Math.sign(entity.vel.x) || this.carryDirection;
        entity.zIndex = this.uncarriedZIndex;
        return true;
    }

    isThrowerProtected(entity: Entity, candidate: Entity): boolean {
        if (this.recentThrower !== candidate
            || this.throwerGraceUpdatesRemaining <= 0) {
            return false;
        }

        const motionDirection = Math.sign(entity.vel.x);
        if (motionDirection !== 0 && motionDirection !== this.throwDirection) {
            this.clearThrowerProtection();
            return false;
        }

        return true;
    }

    followCarrier(entity: Entity, direction = this.carryDirection): void {
        if (this.carrier === null) {
            return;
        }

        this.carryDirection = direction < 0 ? -1 : 1;

        entity.pos.set(
            this.carrier.pos.x + this.carryOffset.x * this.carryDirection,
            this.carrier.pos.y + this.carryOffset.y,
        );
        entity.vel.set(0, 0);
        entity.zIndex = this.carrier.zIndex + CARRIED_Z_INDEX_OFFSET;
    }

    override finalize(entity: Entity): void {
        super.finalize(entity);
        this.followCarrier(entity);

        if (this.carrier === null && this.throwerGraceUpdatesRemaining > 0) {
            this.throwerGraceUpdatesRemaining--;
            if (this.throwerGraceUpdatesRemaining === 0) {
                this.clearThrowerProtection();
            }
        }
    }
}
