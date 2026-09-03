import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Climbable from './Climbable.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LedgeHang from './LedgeHang.js';
import Physics from './Physics.js';

export const SPELUNKY_LADDER_MOUNT_TOLERANCE = 4;
export const SPELUNKY_LADDER_TOP_MOUNT_TOLERANCE = 8;
export const SPELUNKY_LADDER_CLIMB_SPEED = 0.9 * 30;
export const SPELUNKY_LADDER_JUMP_HORIZONTAL_VELOCITY = 4 * 30;
export const SPELUNKY_LADDER_REMOUNT_DELAY = 5 / 30;

const POSITION_EPSILON = 1e-6;
const SUPPORT_PROBE_OFFSET = 0.5;

export type LadderClimbPhase = 'inactive' | 'clinging' | 'climbing';

export default class LadderClimb extends Trait {
    phase: LadderClimbPhase = 'inactive';
    verticalDirection = 0;
    animationTime = 0;
    remountCooldown = 0;
    ladder: Entity | null = null;

    get active(): boolean {
        return this.phase !== 'inactive';
    }

    setVerticalInput(direction: -1 | 1, pressed: boolean): void {
        this.verticalDirection += pressed ? direction : -direction;
    }

    private isUnavailable(entity: Entity): boolean {
        return entity.traits.get(Killable).dead
            || entity.traits.get(Carrier).carried !== null
            || entity.traits.get(LedgeHang).active;
    }

    private isHorizontallyAligned(entity: Entity, ladder: Entity): boolean {
        return this.horizontalDistance(entity, ladder)
            < SPELUNKY_LADDER_MOUNT_TOLERANCE;
    }

    private horizontalDistance(entity: Entity, ladder: Entity): number {
        const entityCenter = (entity.bounds.left + entity.bounds.right) / 2;
        const ladderCenter = (ladder.bounds.left + ladder.bounds.right) / 2;
        return Math.abs(entityCenter - ladderCenter);
    }

    private isTopMountAligned(entity: Entity, ladder: Entity): boolean {
        return this.horizontalDistance(entity, ladder)
            <= SPELUNKY_LADDER_TOP_MOUNT_TOLERANCE;
    }

    private centerIsInside(entity: Entity, ladder: Entity): boolean {
        const centerY = (entity.bounds.top + entity.bounds.bottom) / 2;
        return centerY >= ladder.bounds.top - POSITION_EPSILON
            && centerY < ladder.bounds.bottom - POSITION_EPSILON;
    }

    private isStandingOnTop(entity: Entity, ladder: Entity): boolean {
        const physics = entity.traits.get(Physics);
        return physics.grounded
            && Math.abs(entity.bounds.bottom - ladder.bounds.top)
                <= POSITION_EPSILON
            && Math.abs(entity.vel.x) <= POSITION_EPSILON;
    }

    private findMountableLadder(entity: Entity, level: Level): Entity | null {
        const physics = entity.traits.get(Physics);
        let closest: Entity | null = null;
        let closestDistance = Infinity;
        for (const candidate of level.entities) {
            if (!candidate.traits.has(Climbable)) {
                continue;
            }

            const centerInside = this.centerIsInside(entity, candidate);
            const canEnterFromTop = this.verticalDirection > 0
                && this.isTopMountAligned(entity, candidate)
                && this.isStandingOnTop(entity, candidate);
            const canEnterWithinColumn = this.isHorizontallyAligned(
                entity,
                candidate,
            ) && centerInside
                && (this.verticalDirection < 0 || !physics.grounded);
            if (!canEnterFromTop && !canEnterWithinColumn) {
                continue;
            }

            const distance = this.horizontalDistance(entity, candidate);
            if (distance < closestDistance) {
                closest = candidate;
                closestDistance = distance;
            }
        }
        return closest;
    }

    private centerOn(entity: Entity, ladder: Entity): void {
        entity.bounds.left = ladder.bounds.left
            + (ladder.size.x - entity.size.x) / 2;
    }

    private enter(entity: Entity, ladder: Entity): void {
        entity.traits.get(Crouch).standImmediately(entity);
        this.centerOn(entity, ladder);
        entity.vel.set(0, 0);
        const physics = entity.traits.get(Physics);
        physics.enabled = false;
        physics.grounded = false;
        const go = entity.traits.get(Go);
        go.enabled = false;
        go.distance = 0;
        const jump = entity.traits.get(Jump);
        jump.cancel();
        jump.phase = 'falling';
        jump.ready = -1;
        this.ladder = ladder;
        this.phase = 'clinging';
        this.animationTime = 0;
    }

    private releaseAirborne(entity: Entity): void {
        this.phase = 'inactive';
        this.ladder = null;
        this.animationTime = 0;
        this.remountCooldown = SPELUNKY_LADDER_REMOUNT_DELAY;
        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = false;
        entity.traits.get(Go).enabled = true;
        const jump = entity.traits.get(Jump);
        jump.phase = 'falling';
        jump.ready = -1;
    }

    private finishGrounded(entity: Entity): void {
        this.phase = 'inactive';
        this.ladder = null;
        this.animationTime = 0;
        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = true;
        entity.traits.get(Go).enabled = true;
        const jump = entity.traits.get(Jump);
        jump.phase = 'grounded';
        jump.ready = 1;
        entity.vel.set(0, 0);
    }

    private finishAtBottom(entity: Entity, level: Level): void {
        const centerX = (entity.bounds.left + entity.bounds.right) / 2;
        if (level.tileCollider.hasSolidAt(
            centerX,
            entity.bounds.bottom + SUPPORT_PROBE_OFFSET,
        )) {
            this.finishGrounded(entity);
        } else {
            this.releaseAirborne(entity);
        }
    }

    private jumpOff(entity: Entity, gameContext: GameContext): void {
        const go = entity.traits.get(Go);
        const direction = go.dir < 0 ? -1 : go.dir > 0 ? 1 : 0;
        this.releaseAirborne(entity);
        if (direction !== 0) {
            entity.vel.x = direction
                * SPELUNKY_LADDER_JUMP_HORIZONTAL_VELOCITY;
            go.heading = direction;
        }
        entity.traits.get(Jump).launch(entity, gameContext.deltaTime);
    }

    private updateActive(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        const ladder = this.ladder;
        if (!ladder
            || !level.entities.has(ladder)
            || this.isUnavailable(entity)) {
            this.releaseAirborne(entity);
            return;
        }

        this.centerOn(entity, ladder);
        entity.vel.set(0, 0);
        entity.traits.get(Physics).enabled = false;
        const jump = entity.traits.get(Jump);
        const go = entity.traits.get(Go);
        go.enabled = false;
        if (go.dir !== 0) {
            go.heading = go.dir < 0 ? -1 : 1;
        }
        if (jump.requestTime > 0) {
            if (this.verticalDirection > 0) {
                jump.cancel();
                this.releaseAirborne(entity);
                return;
            }
            this.jumpOff(entity, gameContext);
            return;
        }

        if (this.verticalDirection === 0) {
            this.phase = 'clinging';
            this.animationTime = 0;
            return;
        }

        const direction = this.verticalDirection < 0 ? -1 : 1;
        this.phase = 'climbing';
        this.animationTime += gameContext.deltaTime;
        entity.pos.y += direction
            * SPELUNKY_LADDER_CLIMB_SPEED
            * gameContext.deltaTime;

        if (direction < 0 && entity.bounds.bottom <= ladder.bounds.top) {
            entity.bounds.bottom = ladder.bounds.top;
            this.finishGrounded(entity);
            return;
        }

        if (direction > 0 && entity.bounds.bottom >= ladder.bounds.bottom) {
            entity.bounds.bottom = ladder.bounds.bottom;
            this.finishAtBottom(entity, level);
        }
    }

    override update(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        this.remountCooldown = Math.max(
            0,
            this.remountCooldown - gameContext.deltaTime,
        );
        if (this.active) {
            this.updateActive(entity, gameContext, level);
            return;
        }

        if (this.verticalDirection === 0
            || this.remountCooldown > 0
            || this.isUnavailable(entity)) {
            return;
        }
        const ladder = this.findMountableLadder(entity, level);
        if (ladder) {
            this.enter(entity, ladder);
        }
    }
}
