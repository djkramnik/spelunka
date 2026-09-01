import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import Physics from './Physics.js';

export const SPELUNKY_LEDGE_CLIMB_TIME = 28 / 60;
export const SPELUNKY_LEDGE_REGRAB_DELAY = 4 / 30;
export const SPELUNKY_LEDGE_DROP_REGRAB_DELAY = 5 / 30;
export const SPELUNKY_LEDGE_JUMP_REGRAB_DELAY = 3 / 30;
export const SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY = 90;
export const SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET = -2;

const GRAB_PROBE_DEPTH = 3;
const GRAB_OVERSHOOT_TOLERANCE = 4;
const SUPPORT_PROBE_OFFSET = 0.5;
const DESTINATION_INSET = 1;

export type LedgeHangPhase = 'airborne' | 'hanging' | 'climbing';

interface LedgePlacement {
    top: number;
    left: number;
}

export default class LedgeHang extends Trait {
    phase: LedgeHangPhase = 'airborne';
    side: -1 | 0 | 1 = 0;
    verticalDirection = 0;
    cooldown = 0;
    climbTime = 0;
    enteredFromTop = false;

    private previousTop: number | null = null;
    private ledgeTop = 0;
    private wallLeft = 0;
    private wallRight = 0;
    private climbRequested = false;

    get active(): boolean {
        return this.phase !== 'airborne';
    }

    setVerticalInput(direction: -1 | 1, pressed: boolean): void {
        this.verticalDirection += pressed ? direction : -direction;
        if (pressed && direction < 0) {
            this.climbRequested = true;
        }
    }

    private isUnavailable(entity: Entity): boolean {
        return entity.traits.get(Killable).dead
            || entity.traits.get(Carrier).carried !== null;
    }

    private supportX(entity: Entity): number {
        return this.side > 0
            ? entity.bounds.right + SUPPORT_PROBE_OFFSET
            : entity.bounds.left - SUPPORT_PROBE_OFFSET;
    }

    private hasSupport(entity: Entity, level: Level): boolean {
        if (this.side === 0) {
            return false;
        }

        const supportX = this.supportX(entity);
        return level.tileCollider.hasSolidAt(supportX, this.ledgeTop + 1)
            && !level.tileCollider.hasSolidAt(supportX, this.ledgeTop - 1);
    }

    private hangingTop(ledgeTop: number): number {
        return ledgeTop + SPELUNKY_LEDGE_HANG_VERTICAL_OFFSET;
    }

    private destination(entity: Entity): LedgePlacement {
        const top = this.ledgeTop - entity.size.y;
        const left = this.side > 0
            ? this.wallLeft + DESTINATION_INSET
            : this.wallRight - entity.size.x - DESTINATION_INSET;
        return {top, left};
    }

    private destinationIsClear(
        entity: Entity,
        level: Level,
        destination: LedgePlacement,
        height = entity.size.y,
    ): boolean {
        const right = destination.left + entity.size.x;
        const bottom = destination.top + height;
        const points = [
            [destination.left + DESTINATION_INSET, destination.top + DESTINATION_INSET],
            [right - DESTINATION_INSET, destination.top + DESTINATION_INSET],
            [destination.left + DESTINATION_INSET, bottom - DESTINATION_INSET],
            [right - DESTINATION_INSET, bottom - DESTINATION_INSET],
        ] as const;
        return points.every(([x, y]) => !level.tileCollider.hasSolidAt(x, y));
    }

    private enter(
        entity: Entity,
        side: -1 | 1,
        ledgeTop: number,
        wallLeft: number,
        wallRight: number,
        enteredFromTop = false,
    ): void {
        this.phase = 'hanging';
        this.side = side;
        this.ledgeTop = ledgeTop;
        this.wallLeft = wallLeft;
        this.wallRight = wallRight;
        this.climbTime = 0;
        this.climbRequested = false;
        this.enteredFromTop = enteredFromTop;

        entity.bounds.top = this.hangingTop(ledgeTop);
        if (side > 0) {
            entity.bounds.right = wallLeft;
        } else {
            entity.bounds.left = wallRight;
        }
        entity.vel.set(0, 0);

        const physics = entity.traits.get(Physics);
        physics.enabled = false;
        physics.grounded = false;
        const jump = entity.traits.get(Jump);
        jump.cancel();
        jump.phase = 'falling';
        jump.ready = -1;
        entity.traits.get(Go).distance = 0;
    }

    private release(entity: Entity, cooldown = SPELUNKY_LEDGE_REGRAB_DELAY): void {
        this.phase = 'airborne';
        this.side = 0;
        this.climbTime = 0;
        this.climbRequested = false;
        this.enteredFromTop = false;
        this.cooldown = cooldown;
        entity.vel.set(0, 0);

        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = false;
        const jump = entity.traits.get(Jump);
        jump.phase = 'falling';
        jump.ready = -1;
    }

    private topSupport(
        entity: Entity,
        level: Level,
        direction: -1 | 1,
        hangingHeight: number,
    ): {
        match: NonNullable<ReturnType<Level['tileCollider']['getSolidAt']>>;
        side: -1 | 1;
    } | null {
        const centerX = (entity.bounds.left + entity.bounds.right) / 2;
        const supportY = entity.bounds.bottom + SUPPORT_PROBE_OFFSET;
        const match = level.tileCollider.getSolidAt(centerX, supportY);
        if (!match
            || level.tileCollider.hasSolidAt(centerX + direction, supportY)) {
            return null;
        }

        const side = (direction > 0 ? -1 : 1) as -1 | 1;
        const hangingSpace = {
            top: this.hangingTop(match.y1),
            left: side > 0
                ? match.x1 - entity.size.x
                : match.x2,
        };
        if (!this.destinationIsClear(
            entity,
            level,
            hangingSpace,
            hangingHeight,
        )) {
            return null;
        }
        return {match, side};
    }

    canGrabFromTop(
        entity: Entity,
        level: Level,
        direction: -1 | 1,
        hangingHeight = entity.size.y,
    ): boolean {
        return this.phase === 'airborne'
            && this.cooldown <= 0
            && this.topSupport(
                entity,
                level,
                direction,
                hangingHeight,
            ) !== null;
    }

    grabFromTop(
        entity: Entity,
        level: Level,
        direction: -1 | 1,
    ): boolean {
        const support = this.topSupport(
            entity,
            level,
            direction,
            entity.size.y,
        );
        if (this.phase !== 'airborne' || this.cooldown > 0 || !support) {
            return false;
        }
        this.enter(
            entity,
            support.side,
            support.match.y1,
            support.match.x1,
            support.match.x2,
            true,
        );
        return true;
    }

    private tryGrab(entity: Entity, level: Level): void {
        const physics = entity.traits.get(Physics);
        const jump = entity.traits.get(Jump);
        const go = entity.traits.get(Go);
        if (this.cooldown > 0
            || physics.grounded
            || jump.phase !== 'falling'
            || entity.vel.y <= 0
            || go.dir === 0
            || this.isUnavailable(entity)) {
            return;
        }

        const side = go.dir < 0 ? -1 : 1;
        if (entity.vel.x * side < 0) {
            return;
        }

        const currentTop = entity.bounds.top;
        const wallX = side > 0
            ? entity.bounds.right + SUPPORT_PROBE_OFFSET
            : entity.bounds.left - SUPPORT_PROBE_OFFSET;
        const match = level.tileCollider.getSolidAt(
            wallX,
            currentTop + GRAB_PROBE_DEPTH,
        );
        if (!match
            || currentTop < match.y1 - GRAB_PROBE_DEPTH
            || currentTop > match.y1 + GRAB_OVERSHOOT_TOLERANCE
            || (this.previousTop !== null && this.previousTop > match.y1)
            || level.tileCollider.hasSolidAt(wallX, match.y1 - 1)) {
            return;
        }

        const destinationLeft = side > 0
            ? match.x1 - entity.size.x
            : match.x2;
        const hangingSpace = {
            top: this.hangingTop(match.y1),
            left: destinationLeft,
        };
        if (!this.destinationIsClear(entity, level, hangingSpace)) {
            return;
        }

        this.enter(entity, side, match.y1, match.x1, match.x2);
    }

    private updateHanging(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        entity.vel.set(0, 0);
        if (this.isUnavailable(entity) || !this.hasSupport(entity, level)) {
            this.release(entity);
            return;
        }

        const jump = entity.traits.get(Jump);
        const go = entity.traits.get(Go);
        if (jump.requestTime > 0) {
            if (this.verticalDirection > 0) {
                jump.cancel();
                this.release(entity, SPELUNKY_LEDGE_DROP_REGRAB_DELAY);
                return;
            }

            const side = this.side;
            this.release(entity, SPELUNKY_LEDGE_JUMP_REGRAB_DELAY);
            if (go.dir === -side) {
                entity.vel.x = -side * SPELUNKY_LEDGE_JUMP_HORIZONTAL_VELOCITY;
            }
            jump.launch(entity, deltaTime);
            return;
        }

        if (this.climbRequested) {
            this.climbRequested = false;
            const destination = this.destination(entity);
            if (this.destinationIsClear(entity, level, destination)) {
                this.phase = 'climbing';
                this.climbTime = 0;
            }
        }
    }

    private updateClimbing(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        entity.vel.set(0, 0);
        const destination = this.destination(entity);
        if (this.isUnavailable(entity)
            || !this.hasSupport(entity, level)
            || !this.destinationIsClear(entity, level, destination)) {
            this.release(entity);
            return;
        }

        this.climbTime += deltaTime;
        if (this.climbTime + 1e-9 < SPELUNKY_LEDGE_CLIMB_TIME) {
            return;
        }

        entity.bounds.top = destination.top;
        entity.bounds.left = destination.left;
        entity.vel.set(0, 0);
        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = true;
        const jump = entity.traits.get(Jump);
        jump.phase = 'grounded';
        jump.ready = 1;
        this.phase = 'airborne';
        this.side = 0;
        this.climbTime = 0;
        this.cooldown = SPELUNKY_LEDGE_REGRAB_DELAY;
    }

    override update(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        this.cooldown = Math.max(0, this.cooldown - gameContext.deltaTime);

        if (this.phase === 'hanging') {
            this.updateHanging(entity, gameContext, level);
        } else if (this.phase === 'climbing') {
            this.updateClimbing(entity, gameContext, level);
        } else {
            this.tryGrab(entity, level);
        }

        this.previousTop = entity.bounds.top;
    }
}
