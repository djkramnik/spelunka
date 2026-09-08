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
    grounded = false;
    groundSupportWidth: number | null = null;
    private groundDepartureActive = false;

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        if (!this.enabled) {
            this.groundDepartureActive = false;
            return;
        }

        const {deltaTime} = gameContext;
        const startsGrounded = this.grounded && entity.vel.y === 0;
        this.grounded = false;

        if (startsGrounded) {
            entity.vel.y += level.gravity * deltaTime;
        }

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
        const useGroundSupportProbe = (startsGrounded
            || this.groundDepartureActive)
            && this.groundSupportWidth !== null
            && entity.vel.y > 0;
        const groundSupportInset = useGroundSupportProbe
            ? Math.max(
                0,
                (entity.size.x - (this.groundSupportWidth ?? entity.size.x)) / 2,
            )
            : 0;
        for (let step = 0; step < ySteps; ++step) {
            const previousBottom = entity.bounds.bottom;
            entity.pos.y += yStep;
            level.tileCollider.checkY(
                entity,
                gameContext,
                level,
                previousBottom,
                groundSupportInset,
            );
            if (entity.vel.y !== initialYVelocity) {
                break;
            }
        }

        if (!startsGrounded && !this.grounded) {
            entity.vel.y += level.gravity * deltaTime;
        }

        if (this.grounded) {
            this.groundDepartureActive = false;
        } else if (startsGrounded) {
            this.groundDepartureActive = true;
        } else if (entity.vel.y < 0) {
            this.groundDepartureActive = false;
        }
    }
}
