import Camera from '../Camera.js';
import {requireCamera} from '../Compositor.js';
import type {RenderLayer} from '../Compositor.js';
import Entity from '../Entity.js';
import Level from '../Level.js';
import type {CollisionTile} from '../TileCollider.js';
import TileResolver from '../TileResolver.js';

interface ResolvedTilePosition {
    x: number;
    y: number;
}

function createEntityLayer(
    entities: ReadonlySet<Entity>,
): RenderLayer<Camera> {
    return function drawBoundingBox(context, camera): void {
        const view = requireCamera(camera);
        context.strokeStyle = 'red';
        entities.forEach(entity => {
            context.beginPath();
            context.rect(
                entity.bounds.left - view.pos.x,
                entity.bounds.top - view.pos.y,
                entity.size.x,
                entity.size.y,
            );
            context.stroke();
        });
    };
}

function createTileCandidateLayer(
    tileResolver: TileResolver<CollisionTile>,
): RenderLayer<Camera> {
    const resolvedTiles: ResolvedTilePosition[] = [];
    const {tileSize} = tileResolver;
    const originalGetByIndex = tileResolver.getByIndex.bind(tileResolver);

    tileResolver.getByIndex = (x: number, y: number) => {
        resolvedTiles.push({x, y});
        return originalGetByIndex(x, y);
    };

    return function drawTileCandidates(context, camera): void {
        const view = requireCamera(camera);
        context.strokeStyle = 'blue';
        resolvedTiles.forEach(({x, y}) => {
            context.beginPath();
            context.rect(
                x * tileSize - view.pos.x,
                y * tileSize - view.pos.y,
                tileSize,
                tileSize,
            );
            context.stroke();
        });

        resolvedTiles.length = 0;
    };
}

export function createCollisionLayer(level: Level): RenderLayer<Camera> {
    const drawTileCandidates = level.tileCollider.resolvers.map(
        createTileCandidateLayer,
    );
    const drawBoundingBoxes = createEntityLayer(level.entities);

    return function drawCollision(context, camera): void {
        drawTileCandidates.forEach(draw => draw(context, camera));
        drawBoundingBoxes(context, camera);
    };
}
