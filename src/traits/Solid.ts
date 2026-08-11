import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import Trait from '../Trait.js';
import type {CollisionTile} from '../TileCollider.js';
import type {TileMatch} from '../TileResolver.js';

export default class Solid extends Trait {
    obstructs = true;

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
            entity.vel.y = 0;
        } else if (side === Sides.TOP) {
            entity.bounds.top = match.y2;
            entity.vel.y = 0;
        } else if (side === Sides.LEFT) {
            entity.bounds.left = match.x2;
            entity.vel.x = 0;
        } else if (side === Sides.RIGHT) {
            entity.bounds.right = match.x1;
            entity.vel.x = 0;
        }
    }
}
