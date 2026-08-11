import {Sides} from '../Entity.js';
import type {TileCollisionContext, TileHandler} from '../TileCollider.js';
import Player from '../traits/Player.js';

const handleX: TileHandler = ({entity, match}) => {
    if (entity.vel.x > 0) {
        if (entity.bounds.right > match.x1) {
            entity.obstruct(Sides.RIGHT, match);
        }
    } else if (entity.vel.x < 0 && entity.bounds.left < match.x2) {
        entity.obstruct(Sides.LEFT, match);
    }
};

const handleY: TileHandler = ({
    entity,
    match,
    resolver,
    gameContext,
    level,
}: TileCollisionContext) => {
    if (entity.vel.y > 0) {
        if (entity.bounds.bottom > match.y1) {
            entity.obstruct(Sides.BOTTOM, match);
        }
    } else if (entity.vel.y < 0) {
        if (entity.traits.has(Player)) {
            resolver.matrix.delete(match.indexX, match.indexY);

            const goomba = gameContext.entityFactory.goomba();
            goomba.vel.set(50, -400);
            goomba.pos.set(entity.pos.x, match.y1);
            level.entities.add(goomba);
        }

        if (entity.bounds.top < match.y2) {
            entity.obstruct(Sides.TOP, match);
        }
    }
};

export const brick: readonly [TileHandler, TileHandler] = [handleX, handleY];
