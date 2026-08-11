import type {TileHandler} from '../TileCollider.js';

const handle: TileHandler = ({entity, match, resolver}) => {
    if (entity.player) {
        entity.player.addCoins(1);
        resolver.matrix.delete(match.indexX, match.indexY);
    }
};

export const coin: readonly [TileHandler, TileHandler] = [handle, handle];
