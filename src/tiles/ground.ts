import {Sides} from '../Entity.js';
import type {TileHandler} from '../TileCollider.js';

const handleX: TileHandler = ({entity, match}) => {
    if (entity.vel.x > 0) {
        if (entity.bounds.right > match.x1) {
            entity.obstruct(Sides.RIGHT, match);
        }
    } else if (entity.vel.x < 0 && entity.bounds.left < match.x2) {
        entity.obstruct(Sides.LEFT, match);
    }
};

const handleY: TileHandler = ({entity, match}) => {
    if (entity.vel.y > 0) {
        if (entity.bounds.bottom > match.y1) {
            entity.obstruct(Sides.BOTTOM, match);
        }
    } else if (entity.vel.y < 0 && entity.bounds.top < match.y2) {
        entity.obstruct(Sides.TOP, match);
    }
};

export const ground: readonly [TileHandler, TileHandler] = [handleX, handleY];
