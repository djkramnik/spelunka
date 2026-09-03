import type Entity from '../Entity.js';
import type Level from '../Level.js';
import {Matrix} from '../math.js';
import type {CollisionTile} from '../TileCollider.js';
import {TILE_SIZE} from '../TileResolver.js';
import Trait from '../Trait.js';

export default class TopPlatform extends Trait {
    private readonly installedLevels = new WeakSet<Level>();

    install(entity: Entity, level: Level): void {
        if (this.installedLevels.has(level)) {
            return;
        }

        const tiles = new Matrix<CollisionTile>();
        tiles.set(
            Math.floor(entity.bounds.left / TILE_SIZE),
            Math.floor(entity.bounds.top / TILE_SIZE),
            {type: 'platform'},
        );
        level.tileCollider.addGrid(tiles);
        this.installedLevels.add(level);
    }
}
