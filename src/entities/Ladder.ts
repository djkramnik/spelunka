import Entity from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import {TILE_SIZE} from '../TileResolver.js';
import Climbable from '../traits/Climbable.js';
import TopPlatform from '../traits/TopPlatform.js';

export const LADDER_WIDTH = TILE_SIZE;
export const DEFAULT_LADDER_HEIGHT_IN_TILES = 2;
export const LADDER_HEIGHT = TILE_SIZE * DEFAULT_LADDER_HEIGHT_IN_TILES;
export const LADDER_TOP_TILE = 'ladder-top';
export const LADDER_BODY_TILE = 'ladder';

export type LadderFactory = (heightInTiles?: number) => Entity;

export async function loadLadder(): Promise<LadderFactory> {
    const sprite = await loadSpriteSheet('underworld');
    return createLadderFactory(sprite);
}

export function createLadderFactory(sprite: SpriteSheet): LadderFactory {
    return function createLadder(
        heightInTiles = DEFAULT_LADDER_HEIGHT_IN_TILES,
    ): Entity {
        if (!Number.isSafeInteger(heightInTiles) || heightInTiles < 1) {
            throw new Error(`Invalid ladder height: ${heightInTiles}`);
        }

        const ladder = new Entity();
        ladder.size.set(LADDER_WIDTH, TILE_SIZE * heightInTiles);
        ladder.zIndex = -1;
        ladder.addTrait(new Climbable());
        ladder.addTrait(new TopPlatform());
        ladder.draw = context => {
            sprite.drawTile(LADDER_TOP_TILE, context, 0, 0);
            for (let y = 1; y < heightInTiles; y += 1) {
                sprite.drawTile(LADDER_BODY_TILE, context, 0, y);
            }
        };
        return ladder;
    };
}
