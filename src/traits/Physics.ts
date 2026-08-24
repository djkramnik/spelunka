import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import {TILE_SIZE} from '../TileResolver.js';
import Trait from '../Trait.js';

const MAX_MOVEMENT_STEP = TILE_SIZE / 2;

function stepCount(distance: number): number {
    return Math.max(1, Math.ceil(Math.abs(distance) / MAX_MOVEMENT_STEP));
}

export default class Physics extends Trait {
    enabled = true;

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        if (!this.enabled) {
            return;
        }

        const {deltaTime} = gameContext;

        const initialXVelocity = entity.vel.x;
        const xDistance = entity.vel.x * deltaTime;
        const xSteps = stepCount(xDistance);
        const xStep = xDistance / xSteps;
        for (let step = 0; step < xSteps; ++step) {
            entity.pos.x += xStep;
            level.tileCollider.checkX(entity, gameContext, level);
            if (entity.vel.x !== initialXVelocity) {
                break;
            }
        }

        const initialYVelocity = entity.vel.y;
        const yDistance = entity.vel.y * deltaTime;
        const ySteps = stepCount(yDistance);
        const yStep = yDistance / ySteps;
        for (let step = 0; step < ySteps; ++step) {
            entity.pos.y += yStep;
            level.tileCollider.checkY(entity, gameContext, level);
            if (entity.vel.y !== initialYVelocity) {
                break;
            }
        }

        entity.vel.y += level.gravity * deltaTime;
    }
}
