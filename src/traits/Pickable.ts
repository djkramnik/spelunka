import type Entity from '../Entity.js';
import {Vec2} from '../math.js';
import Trait from '../Trait.js';

const CARRIED_Z_INDEX_OFFSET = 1;

export default class Pickable extends Trait {
    readonly carryOffset = new Vec2(8, -8);
    carrier: Entity | null = null;
    private carryDirection = 1;

    attach(entity: Entity, carrier: Entity, direction = 1): boolean {
        if (this.carrier !== null) {
            return false;
        }

        this.carrier = carrier;
        this.followCarrier(entity, direction);
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
    }
}
