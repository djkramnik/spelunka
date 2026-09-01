import type Entity from '../Entity.js';
import type Level from '../Level.js';
import {Vec2} from '../math.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LedgeHang from './LedgeHang.js';
import Physics from './Physics.js';

export const SPELUNKY_CROUCH_HEIGHT = 10;
export const SPELUNKY_STANDING_HEIGHT = 16;
export const SPELUNKY_CROUCH_TRANSITION_TIME = 12 / 60;
export const SPELUNKY_CRAWL_SPEED = 0.75 * 30;
export const SPELUNKY_CRAWL_ACCELERATION = 450;
export const SPELUNKY_LEDGE_FLIP_TIME = 28 / 60;
export const SPELUNKY_LEDGE_FLIP_SETTLE_TIME = 4 / 60;

const HEADROOM_INSET = 0.5;
const TOP_FLIP_MAX_SPEED = 3 * 30;

export type CrouchPhase =
    | 'standing'
    | 'entering'
    | 'crouched'
    | 'exiting'
    | 'flipping';

function approach(value: number, target: number, amount: number): number {
    if (value < target) {
        return Math.min(target, value + amount);
    }
    return Math.max(target, value - amount);
}

export default class Crouch extends Trait {
    phase: CrouchPhase = 'standing';
    downHeld = false;
    phaseTime = 0;
    flipDirection: -1 | 0 | 1 = 0;
    readonly transitionOffset = new Vec2(0, 0);
    transitionAnchorActive = false;
    private transitionAnchorTime = 0;

    get active(): boolean {
        return this.phase === 'entering'
            || this.phase === 'crouched'
            || this.phase === 'flipping';
    }

    setDown(pressed: boolean): void {
        this.downHeld = pressed;
    }

    private updateTransitionAnchor(deltaTime: number): void {
        if (!this.transitionAnchorActive || this.transitionAnchorTime <= 0) {
            this.transitionAnchorActive = false;
            this.transitionAnchorTime = 0;
            this.transitionOffset.set(0, 0);
            return;
        }
        const previousTime = this.transitionAnchorTime;
        this.transitionAnchorTime = Math.max(0, previousTime - deltaTime);
        const scale = this.transitionAnchorTime / previousTime;
        this.transitionOffset.x *= scale;
        this.transitionOffset.y *= scale;
        if (this.transitionAnchorTime <= 1e-9) {
            this.transitionAnchorActive = false;
            this.transitionAnchorTime = 0;
            this.transitionOffset.set(0, 0);
        }
    }

    private setHeight(entity: Entity, height: number): void {
        if (entity.size.y === height) {
            return;
        }
        const bottom = entity.bounds.bottom;
        entity.size.y = height;
        entity.bounds.bottom = bottom;
    }

    private canStand(entity: Entity, level: Level): boolean {
        const top = entity.bounds.bottom - SPELUNKY_STANDING_HEIGHT;
        const points = [
            entity.bounds.left + HEADROOM_INSET,
            (entity.bounds.left + entity.bounds.right) / 2,
            entity.bounds.right - HEADROOM_INSET,
        ];
        return points.every(x => !level.tileCollider.hasSolidAt(
            x,
            top + HEADROOM_INSET,
        ));
    }

    private enter(entity: Entity): void {
        this.setHeight(entity, SPELUNKY_CROUCH_HEIGHT);
        this.phase = 'entering';
        this.phaseTime = 0;
        const go = entity.traits.get(Go);
        go.enabled = false;
        go.distance = 0;
    }

    private beginExit(entity: Entity): void {
        this.setHeight(entity, SPELUNKY_STANDING_HEIGHT);
        this.phase = 'exiting';
        this.phaseTime = 0;
        this.flipDirection = 0;
        entity.traits.get(Go).enabled = true;
    }

    private forceAirborneExit(entity: Entity, level: Level): void {
        if (this.canStand(entity, level)) {
            this.beginExit(entity);
        }
    }

    private updateCrawl(entity: Entity, {deltaTime}: GameContext): void {
        const go = entity.traits.get(Go);
        go.enabled = false;
        if (go.dir !== 0) {
            go.heading = go.dir;
        }
        const target = go.dir * SPELUNKY_CRAWL_SPEED;
        entity.vel.x = approach(
            entity.vel.x,
            target,
            SPELUNKY_CRAWL_ACCELERATION * deltaTime,
        );
        go.distance += Math.abs(entity.vel.x) * deltaTime;
        if (go.dir === 0 && entity.vel.x === 0) {
            go.distance = 0;
        }
    }

    private canStartFlip(entity: Entity, level: Level): boolean {
        const direction = entity.traits.get(Go).dir;
        return (direction === -1 || direction === 1)
            && Math.abs(entity.vel.x) < TOP_FLIP_MAX_SPEED
            && entity.traits.get(LedgeHang).canGrabFromTop(
                entity,
                level,
                direction,
                SPELUNKY_STANDING_HEIGHT,
            );
    }

    private beginFlip(entity: Entity): void {
        const direction = entity.traits.get(Go).dir;
        if (direction !== -1 && direction !== 1) {
            return;
        }
        this.phase = 'flipping';
        this.phaseTime = 0;
        this.flipDirection = direction;
        this.transitionAnchorActive = false;
        this.transitionAnchorTime = 0;
        this.transitionOffset.set(0, 0);
        entity.vel.set(0, 0);
        const physics = entity.traits.get(Physics);
        physics.enabled = false;
        physics.grounded = false;
        const jump = entity.traits.get(Jump);
        jump.cancel();
        jump.phase = 'falling';
        jump.ready = -1;
    }

    private finishFlip(entity: Entity, level: Level): void {
        const direction = this.flipDirection;
        const previousX = entity.pos.x;
        const previousY = entity.pos.y;
        this.setHeight(entity, SPELUNKY_STANDING_HEIGHT);
        this.phase = 'standing';
        this.phaseTime = 0;
        this.flipDirection = 0;
        entity.traits.get(Go).enabled = true;
        if ((direction === -1 || direction === 1)
            && entity.traits.get(LedgeHang).grabFromTop(
                entity,
                level,
                direction,
            )) {
            this.transitionOffset.set(
                previousX - entity.pos.x,
                previousY - entity.pos.y,
            );
            this.transitionAnchorActive = true;
            this.transitionAnchorTime = SPELUNKY_LEDGE_FLIP_SETTLE_TIME;
            return;
        }

        this.transitionAnchorActive = false;
        this.transitionAnchorTime = 0;
        this.transitionOffset.set(0, 0);
        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = false;
    }

    override update(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        const {deltaTime} = gameContext;
        this.updateTransitionAnchor(deltaTime);
        const physics = entity.traits.get(Physics);
        const go = entity.traits.get(Go);
        const jump = entity.traits.get(Jump);
        const ledgeHang = entity.traits.get(LedgeHang);
        const unavailable = entity.traits.get(Killable).dead
            || entity.traits.get(Carrier).carried !== null;

        if (this.phase === 'flipping') {
            entity.vel.set(0, 0);
            this.phaseTime += deltaTime;
            if (unavailable) {
                this.finishFlip(entity, level);
            } else if (this.phaseTime + 1e-9 >= SPELUNKY_LEDGE_FLIP_TIME) {
                this.finishFlip(entity, level);
            }
            return;
        }

        if (ledgeHang.active) {
            this.setHeight(entity, SPELUNKY_STANDING_HEIGHT);
            this.phase = 'standing';
            this.phaseTime = 0;
            this.flipDirection = 0;
            go.enabled = true;
            return;
        }

        if (!physics.grounded) {
            if (this.active) {
                this.forceAirborneExit(entity, level);
            }
            go.enabled = true;
            return;
        }

        if (this.phase === 'standing' || this.phase === 'exiting') {
            go.enabled = true;
            if (this.downHeld && !unavailable) {
                this.enter(entity);
            } else if (this.phase === 'exiting') {
                this.phaseTime += deltaTime;
                if (this.phaseTime + 1e-9 >= SPELUNKY_CROUCH_TRANSITION_TIME) {
                    this.phase = 'standing';
                    this.phaseTime = 0;
                }
            }
            return;
        }

        if (unavailable || !this.downHeld || jump.requestTime > 0) {
            if (this.canStand(entity, level)) {
                this.beginExit(entity);
            } else if (jump.requestTime > 0) {
                jump.cancel();
            }
            return;
        }

        this.updateCrawl(entity, gameContext);
        if (this.canStartFlip(entity, level)) {
            this.beginFlip(entity);
            return;
        }

        if (this.phase === 'entering') {
            this.phaseTime += deltaTime;
            if (this.phaseTime + 1e-9 >= SPELUNKY_CROUCH_TRANSITION_TIME) {
                this.phase = 'crouched';
                this.phaseTime = 0;
            }
        }
    }
}
