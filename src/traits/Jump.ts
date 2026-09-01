import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Physics from './Physics.js';

export const SPELUNKY_HD_JUMP_TARGET_HEIGHT = 24;
// Spelunky Classic runs at 30 Hz. Its normal jump adds -4 px/tick once,
// then ramps gravity from 0.1 to 1 px/tick² over ten held ticks. Converting
// those rates to time-based units preserves the 24 px arc while allowing our
// 60 Hz simulation to interpolate it smoothly for the HD-sized player.
export const SPELUNKY_HD_JUMP_LAUNCH_VELOCITY = 4 * 30;
export const SPELUNKY_HD_JUMP_GRAVITY = 1 * 30 * 30;
export const SPELUNKY_HD_JUMP_GRAVITY_RAMP_TIME = 10 / 30;
export const SPELUNKY_HD_JUMP_BUFFER_TIME = 0.1;
export const SPELUNKY_HD_JUMP_COYOTE_TIME = 0.1;

export type JumpPhase = 'grounded' | 'rising' | 'falling';

export default class Jump extends Trait {
    // Retained for animation-test and diagnostic compatibility while the
    // explicit phase becomes the authoritative runtime state.
    ready = 0;
    requestTime = 0;
    readonly gracePeriod = SPELUNKY_HD_JUMP_BUFFER_TIME;
    readonly coyoteDuration = SPELUNKY_HD_JUMP_COYOTE_TIME;
    readonly launchVelocity = SPELUNKY_HD_JUMP_LAUNCH_VELOCITY;
    readonly gravity = SPELUNKY_HD_JUMP_GRAVITY;
    readonly gravityRampDuration = SPELUNKY_HD_JUMP_GRAVITY_RAMP_TIME;

    phase: JumpPhase = 'grounded';
    held = false;
    coyoteTime = 0;
    private releaseCanCut = true;
    private gravityRampTime = this.gravityRampDuration;
    private effectiveGravity = this.gravity;

    get falling(): boolean {
        return this.phase !== 'grounded' || this.ready < 0;
    }

    start(): void {
        this.held = true;
        this.requestTime = this.gracePeriod;
    }

    cancel(): void {
        this.held = false;
        this.requestTime = 0;
    }

    launch(
        entity: Entity,
        deltaTime: number,
        velocity = this.launchVelocity,
    ): void {
        entity.vel.y = -velocity;
        this.phase = 'rising';
        this.ready = -1;
        this.coyoteTime = 0;
        this.requestTime = 0;
        this.releaseCanCut = true;
        this.gravityRampTime = Math.min(
            this.gravityRampDuration,
            deltaTime,
        );
        this.effectiveGravity = this.gravity
            * this.gravityRampTime
            / this.gravityRampDuration;
        if (entity.traits.has(Physics)) {
            entity.traits.get(Physics).grounded = false;
        }
        entity.sounds.add('jump');
    }

    rebound(entity: Entity, velocity: number): void {
        entity.vel.y = -velocity;
        this.phase = 'rising';
        this.ready = -1;
        this.coyoteTime = 0;
        this.requestTime = 0;
        this.releaseCanCut = false;
        this.gravityRampTime = this.gravityRampDuration;
        this.effectiveGravity = this.gravity;
        if (entity.traits.has(Physics)) {
            entity.traits.get(Physics).grounded = false;
        }
    }

    override obstruct(_entity: Entity, side: symbol): void {
        if (side === Sides.BOTTOM) {
            this.ready = 1;
        } else if (side === Sides.TOP) {
            this.phase = 'falling';
            this.gravityRampTime = this.gravityRampDuration;
            this.effectiveGravity = this.gravity;
        }
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        const physics = entity.traits.get(Physics);
        const grounded = physics.grounded && entity.vel.y === 0;

        if (grounded) {
            this.phase = 'grounded';
            this.ready = 1;
            this.coyoteTime = this.coyoteDuration;
            this.releaseCanCut = true;
            this.gravityRampTime = this.gravityRampDuration;
            this.effectiveGravity = this.gravity;
        } else {
            this.ready = -1;
            this.coyoteTime = Math.max(0, this.coyoteTime - deltaTime);
            if (this.phase === 'grounded') {
                this.phase = entity.vel.y < 0 ? 'rising' : 'falling';
            }
        }

        if (this.requestTime > 0) {
            if (grounded || this.coyoteTime > 0) {
                this.launch(entity, deltaTime);
                return;
            }
            this.requestTime = Math.max(0, this.requestTime - deltaTime);
        }

        if (grounded) {
            return;
        }

        if (this.phase === 'rising') {
            entity.vel.y += (this.effectiveGravity - level.gravity) * deltaTime;
            if (entity.vel.y >= 0) {
                this.phase = 'falling';
                this.gravityRampTime = this.gravityRampDuration;
                this.effectiveGravity = this.gravity;
            } else if (this.releaseCanCut && this.held) {
                this.gravityRampTime = Math.min(
                    this.gravityRampDuration,
                    this.gravityRampTime + deltaTime,
                );
                this.effectiveGravity = this.gravity
                    * this.gravityRampTime
                    / this.gravityRampDuration;
            } else {
                // Classic ends the low-gravity ramp when jump is released.
                // It does not clamp upward velocity to manufacture a short hop.
                this.gravityRampTime = this.gravityRampDuration;
                this.effectiveGravity = this.gravity;
            }
        } else {
            entity.vel.y += (this.gravity - level.gravity) * deltaTime;
        }
    }
}
