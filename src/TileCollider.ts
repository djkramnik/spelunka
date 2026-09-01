import type Entity from './Entity.js';
import type Level from './Level.js';
import {Matrix} from './math.js';
import type {GameContext} from './Scene.js';
import TileResolver from './TileResolver.js';
import type {TileMatch} from './TileResolver.js';
import {brick} from './tiles/brick.js';
import {coin} from './tiles/coin.js';
import {ground} from './tiles/ground.js';

export interface CollisionTile {
    type?: string | undefined;
}

interface PlayerState {
    addCoins(count: number): void;
}

export type CollisionEntity = Entity & {
    player?: PlayerState;
};

export interface TileCollisionContext {
    entity: CollisionEntity;
    match: TileMatch<CollisionTile>;
    resolver: TileResolver<CollisionTile>;
    gameContext: GameContext;
    level: Level;
}

export type TileHandler = (context: TileCollisionContext) => void;

const handlers: Record<string, readonly TileHandler[]> = {
    brick,
    coin,
    ground,
};

const solidTileTypes = new Set(['brick', 'ground']);

export default class TileCollider {
    readonly resolvers: Array<TileResolver<CollisionTile>> = [];

    addGrid(tileMatrix: Matrix<CollisionTile>): void {
        this.resolvers.push(new TileResolver(tileMatrix));
    }

    hasSolidAt(x: number, y: number): boolean {
        return this.getSolidAt(x, y) !== undefined;
    }

    getSolidAt(x: number, y: number): TileMatch<CollisionTile> | undefined {
        for (const resolver of this.resolvers) {
            const match = resolver.searchByPosition(x, y);
            if (match?.tile.type !== undefined
                && solidTileTypes.has(match.tile.type)) {
                return match;
            }
        }
        return undefined;
    }

    checkX(entity: CollisionEntity, gameContext: GameContext, level: Level): void {
        let x: number;
        if (entity.vel.x > 0) {
            x = entity.bounds.right;
        } else if (entity.vel.x < 0) {
            x = entity.bounds.left;
        } else {
            return;
        }

        for (const resolver of this.resolvers) {
            const {matches, candidateCount} = resolver.searchByRange(
                x,
                x,
                entity.bounds.top,
                entity.bounds.bottom,
            );
            gameContext.performanceMetrics.recordTileCandidates(candidateCount);

            const initialVelocity = entity.vel.x;
            for (const match of matches) {
                this.handle(0, entity, match, resolver, gameContext, level);
                if (entity.vel.x !== initialVelocity) {
                    return;
                }
            }
        }
    }

    checkY(entity: CollisionEntity, gameContext: GameContext, level: Level): void {
        let y: number;
        if (entity.vel.y > 0) {
            y = entity.bounds.bottom;
        } else if (entity.vel.y < 0) {
            y = entity.bounds.top;
        } else {
            return;
        }

        for (const resolver of this.resolvers) {
            const {matches, candidateCount} = resolver.searchByRange(
                entity.bounds.left,
                entity.bounds.right,
                y,
                y,
            );
            gameContext.performanceMetrics.recordTileCandidates(candidateCount);

            const initialVelocity = entity.vel.y;
            for (const match of matches) {
                this.handle(1, entity, match, resolver, gameContext, level);
                if (entity.vel.y !== initialVelocity) {
                    return;
                }
            }
        }
    }

    private handle(
        index: 0 | 1,
        entity: CollisionEntity,
        match: TileMatch<CollisionTile>,
        resolver: TileResolver<CollisionTile>,
        gameContext: GameContext,
        level: Level,
    ): void {
        const handler = match.tile.type
            ? handlers[match.tile.type]?.[index]
            : undefined;
        if (handler) {
            handler({entity, match, resolver, gameContext, level});
        }
    }
}
