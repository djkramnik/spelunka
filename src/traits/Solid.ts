import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import Trait from '../Trait.js';
import type {CollisionTile} from '../TileCollider.js';
import type {TileMatch} from '../TileResolver.js';
import Physics from './Physics.js';

export default class Solid extends Trait {
    obstructs = true;
    wallRebound = 0;
    floorRebound = 0;
    ceilingRebound = 0;
    floorFriction = 1;
    horizontalSettleSpeed = 0;
    verticalSettleSpeed = 0;

    override obstruct(
        entity: Entity,
        side: symbol,
        match: TileMatch<CollisionTile>,
    ): void {
        if (!this.obstructs) {
            return;
        }

        if (side === Sides.BOTTOM) {
            entity.bounds.bottom = match.y1;
            entity.vel.y *= -this.floorRebound;
            if (Math.abs(entity.vel.y) < this.verticalSettleSpeed) {
                entity.vel.y = 0;
            }

            if (Math.abs(entity.vel.x) < this.horizontalSettleSpeed) {
                entity.vel.x = 0;
            } else {
                entity.vel.x *= this.floorFriction;
            }

            if (entity.vel.y === 0 && entity.traits.has(Physics)) {
                entity.traits.get(Physics).grounded = true;
            }
        } else if (side === Sides.TOP) {
            entity.bounds.top = match.y2;
            entity.vel.y *= -this.ceilingRebound;
        } else if (side === Sides.LEFT) {
            entity.bounds.left = match.x2;
            entity.vel.x *= -this.wallRebound;
        } else if (side === Sides.RIGHT) {
            entity.bounds.right = match.x1;
            entity.vel.x *= -this.wallRebound;
        }
    }
}
