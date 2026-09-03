import {Sides} from '../Entity.js';
import type {TileHandler} from '../TileCollider.js';

const handleX: TileHandler = () => {};

const handleY: TileHandler = ({entity, match, previousBottom}) => {
    if (
        entity.vel.y > 0
        && previousBottom !== undefined
        && previousBottom <= match.y1
        && entity.bounds.bottom > match.y1
    ) {
        entity.obstruct(Sides.BOTTOM, match);
    }
};

export const platform: readonly [TileHandler, TileHandler] = [handleX, handleY];
