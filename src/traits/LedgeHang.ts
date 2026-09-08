import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import type {CollisionTile} from '../TileCollider.js';
import type {TileMatch} from '../TileResolver.js';
import Trait from '../Trait.js';
import Crouch, {SPELUNKY_CROUCH_HEIGHT} from './Crouch.js';
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
export const SPELUNKY_LEDGE_CLIMB_INPUT_BUFFER_TIME = 0.1;
export const SPELUNKY_LEDGE_CRAWL_ENTRY_SPEED = 120;

const GRAB_PROBE_DEPTH = 3;
const GRAB_OVERSHOOT_TOLERANCE = 4;
const CROUCH_ENTRY_ABOVE_LEDGE_TOLERANCE = 16;
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
    climbIntoCrawl = false;

    private previousTop: number | null = null;
    private ledgeTop = 0;
    private wallLeft = 0;
    private wallRight = 0;
    private climbRequestTime = 0;
    private wallContactSide: -1 | 0 | 1 = 0;
    private wallContactMatch: TileMatch<CollisionTile> | null = null;
    private crawlEntryStartLeft = 0;
    private crawlEntryStartTop = 0;

    get active(): boolean {
        return this.phase !== 'airborne';
    }

    setVerticalInput(direction: -1 | 1, pressed: boolean): void {
        this.verticalDirection += pressed ? direction : -direction;
        if (pressed && direction < 0 && this.phase !== 'climbing') {
            this.climbRequestTime = SPELUNKY_LEDGE_CLIMB_INPUT_BUFFER_TIME;
        }
    }

    private isUnavailable(entity: Entity): boolean {
        return entity.traits.get(Killable).dead;
    }

    override obstruct(
        _entity: Entity,
        side: symbol,
        match?: TileMatch<CollisionTile>,
    ): void {
        if (this.phase !== 'airborne') {
            return;
        }

        if (side === Sides.LEFT) {
            this.wallContactSide = -1;
            this.wallContactMatch = match ?? null;
        } else if (side === Sides.RIGHT) {
            this.wallContactSide = 1;
            this.wallContactMatch = match ?? null;
        }
    }

    private approachSide(entity: Entity): -1 | 0 | 1 {
        if (this.wallContactSide !== 0) {
            return this.wallContactSide;
        }

        return entity.vel.x < 0 ? -1 : entity.vel.x > 0 ? 1 : 0;
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

    private destination(
        entity: Entity,
        height = entity.size.y,
    ): LedgePlacement {
        const top = this.ledgeTop - height;
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
        this.enteredFromTop = enteredFromTop;
        this.climbIntoCrawl = false;

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
        this.climbRequestTime = 0;
        this.enteredFromTop = false;
        this.climbIntoCrawl = false;
        this.cooldown = cooldown;
        entity.vel.set(0, 0);

        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = false;
        const jump = entity.traits.get(Jump);
        jump.phase = 'falling';
        jump.ready = -1;
    }

    interrupt(entity: Entity): void {
        if (this.active) {
            this.release(entity);
        }
        this.verticalDirection = 0;
        this.climbRequestTime = 0;
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
        if (this.tryCrouchEntry(entity, level, physics, jump)) {
            return;
        }
        const side = this.approachSide(entity);
        if (this.cooldown > 0
            || physics.grounded
            || jump.phase !== 'falling'
            || entity.vel.y <= 0
            || side === 0
            || this.isUnavailable(entity)) {
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

    private tryCrouchEntry(
        entity: Entity,
        level: Level,
        physics: Physics,
        jump: Jump,
    ): boolean {
        const side = this.wallContactSide;
        const match = this.wallContactMatch;
        if (this.cooldown > 0
            || this.verticalDirection <= 0
            || physics.grounded
            || jump.phase === 'grounded'
            || side === 0
            || !match
            || this.isUnavailable(entity)) {
            return false;
        }

        const currentTop = entity.bounds.top;
        if (currentTop < match.y1 - CROUCH_ENTRY_ABOVE_LEDGE_TOLERANCE
            || currentTop > match.y1 + GRAB_OVERSHOOT_TOLERANCE) {
            return false;
        }

        const wallX = side > 0
            ? entity.bounds.right + SUPPORT_PROBE_OFFSET
            : entity.bounds.left - SUPPORT_PROBE_OFFSET;
        if (level.tileCollider.hasSolidAt(wallX, match.y1 - 1)) {
            return false;
        }

        this.ledgeTop = match.y1;
        this.wallLeft = match.x1;
        this.wallRight = match.x2;
        this.side = side;
        const destination = this.destination(entity, SPELUNKY_CROUCH_HEIGHT);
        if (!this.destinationIsClear(
            entity,
            level,
            destination,
            SPELUNKY_CROUCH_HEIGHT,
        )) {
            this.side = 0;
            return false;
        }

        // Preserve the physical contact position while the mantle artwork
        // carries the player onto the ledge. This avoids an airborne snap at
        // entry while still resolving to one exact crawl position afterward.
        this.phase = 'climbing';
        this.climbTime = 0;
        this.climbIntoCrawl = true;
        this.enteredFromTop = false;
        entity.traits.get(Crouch).beginLedgeEntry(entity);
        this.crawlEntryStartLeft = entity.bounds.left;
        this.crawlEntryStartTop = entity.bounds.top;
        entity.vel.set(0, 0);
        physics.enabled = false;
        physics.grounded = false;
        jump.cancel();
        jump.phase = 'falling';
        jump.ready = -1;
        entity.traits.get(Go).distance = 0;
        return true;
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

        if (this.climbRequestTime > 0) {
            this.climbRequestTime = 0;
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
        const destinationHeight = this.climbIntoCrawl
            ? SPELUNKY_CROUCH_HEIGHT
            : entity.size.y;
        const destination = this.destination(entity, destinationHeight);
        if (this.isUnavailable(entity)
            || !this.hasSupport(entity, level)
            || !this.destinationIsClear(
                entity,
                level,
                destination,
                destinationHeight,
            )) {
            this.release(entity);
            return;
        }

        if (this.climbIntoCrawl) {
            this.updateCrawlEntry(entity, deltaTime, destination);
            return;
        }

        this.climbTime += deltaTime;
        if (this.climbTime + 1e-9 < SPELUNKY_LEDGE_CLIMB_TIME) {
            return;
        }

        entity.bounds.top = destination.top;
        entity.bounds.left = destination.left;
        this.finishClimb(entity);
    }

    private updateCrawlEntry(
        entity: Entity,
        deltaTime: number,
        destination: LedgePlacement,
    ): void {
        this.climbTime += deltaTime;
        const verticalDistance = Math.max(
            0,
            this.crawlEntryStartTop - destination.top,
        );
        const horizontalDistance = Math.abs(
            destination.left - this.crawlEntryStartLeft,
        );
        const totalDistance = verticalDistance + horizontalDistance;
        const travelled = Math.min(
            totalDistance,
            this.climbTime * SPELUNKY_LEDGE_CRAWL_ENTRY_SPEED,
        );

        entity.bounds.top = this.crawlEntryStartTop
            - Math.min(travelled, verticalDistance);
        const horizontalTravel = Math.max(0, travelled - verticalDistance);
        entity.bounds.left = this.crawlEntryStartLeft
            + this.side * Math.min(horizontalTravel, horizontalDistance);

        if (travelled + 1e-9 < totalDistance) {
            return;
        }

        entity.traits.get(Crouch).settleFromLedge(
            entity,
            destination.left,
            destination.top,
        );
        this.finishClimb(entity);
    }

    private finishClimb(entity: Entity): void {
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
        this.climbIntoCrawl = false;
        this.cooldown = SPELUNKY_LEDGE_REGRAB_DELAY;
    }

    override update(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        this.cooldown = Math.max(0, this.cooldown - gameContext.deltaTime);
        this.climbRequestTime = Math.max(
            0,
            this.climbRequestTime - gameContext.deltaTime,
        );

        if (this.phase === 'hanging') {
            this.updateHanging(entity, gameContext, level);
        } else if (this.phase === 'climbing') {
            this.updateClimbing(entity, gameContext, level);
        } else {
            this.tryGrab(entity, level);
        }

        this.wallContactSide = 0;
        this.wallContactMatch = null;
        this.previousTop = entity.bounds.top;
    }
}
