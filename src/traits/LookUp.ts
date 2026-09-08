import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import LedgeTeeter from './LedgeTeeter.js';
import Physics from './Physics.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';

const HD_TICK_SECONDS = 1 / 60;
const POSITION_EPSILON = 1e-9;

export const SPELUNKY_LOOK_UP_ENTER_TIME = 4 * 2 * HD_TICK_SECONDS;
export const SPELUNKY_LOOK_UP_EXIT_TIME = 4 * 4 * HD_TICK_SECONDS;
export const SPELUNKY_LOOK_UP_CAMERA_DELAY = 0.5;
export const SPELUNKY_LOOK_UP_CAMERA_DISTANCE = 4 * 16;
export const SPELUNKY_LOOK_UP_CAMERA_SPEED = 2 * 60;

export type LookUpPhase = 'inactive' | 'entering' | 'looking' | 'exiting';

function approach(value: number, target: number, amount: number): number {
    if (value < target) {
        return Math.min(target, value + amount);
    }
    return Math.max(target, value - amount);
}

/**
 * Owns the deliberate grounded look-up pose and its camera displacement.
 * Attachment, action, damage, and movement states retain precedence; the
 * camera displacement is restored independently after the pose has exited.
 */
export default class LookUp extends Trait {
    phase: LookUpPhase = 'inactive';
    upHeld = false;
    phaseTime = 0;
    holdTime = 0;
    cameraOffset = 0;

    get active(): boolean {
        return this.phase !== 'inactive';
    }

    setUp(pressed: boolean): void {
        this.upHeld = pressed;
    }

    private isAvailable(entity: Entity): boolean {
        const throwFrameTime = 'throwFrameTime' in entity
            && typeof entity.throwFrameTime === 'number'
            ? entity.throwFrameTime
            : 0;
        return this.upHeld
            && !entity.traits.get(Killable).dead
            && !entity.traits.get(PlayerDeath).terminal
            && !entity.traits.get(PlayerHit).active
            && !entity.traits.get(LadderClimb).active
            && !entity.traits.get(LedgeHang).active
            && !entity.traits.get(LedgeTeeter).active
            && entity.traits.get(Carrier).carried === null
            && entity.traits.get(Crouch).phase === 'standing'
            && !entity.traits.get(Crouch).downHeld
            && entity.traits.get(Jump).phase === 'grounded'
            && entity.traits.get(Jump).requestTime <= 0
            && entity.traits.get(Physics).grounded
            && entity.traits.get(Go).enabled
            && entity.traits.get(Go).dir === 0
            && entity.vel.x === 0
            && entity.vel.y === 0
            && throwFrameTime <= 0;
    }

    private beginEntry(): void {
        this.phase = 'entering';
        this.phaseTime = 0;
        this.holdTime = 0;
    }

    private beginExit(): void {
        if (this.phase === 'inactive' || this.phase === 'exiting') {
            return;
        }
        this.phase = 'exiting';
        this.phaseTime = 0;
        this.holdTime = 0;
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        const available = this.isAvailable(entity);

        if (available) {
            if (this.phase === 'inactive' || this.phase === 'exiting') {
                this.beginEntry();
            }
            this.holdTime += deltaTime;
            if (this.phase === 'entering') {
                this.phaseTime += deltaTime;
                if (this.phaseTime + POSITION_EPSILON
                    >= SPELUNKY_LOOK_UP_ENTER_TIME) {
                    this.phase = 'looking';
                    this.phaseTime = 0;
                }
            }
        } else {
            this.beginExit();
            this.holdTime = 0;
            if (this.phase === 'exiting') {
                this.phaseTime += deltaTime;
                if (this.phaseTime + POSITION_EPSILON
                    >= SPELUNKY_LOOK_UP_EXIT_TIME) {
                    this.phase = 'inactive';
                    this.phaseTime = 0;
                }
            }
        }

        const targetOffset = available
            && this.holdTime + POSITION_EPSILON
                >= SPELUNKY_LOOK_UP_CAMERA_DELAY
            ? SPELUNKY_LOOK_UP_CAMERA_DISTANCE
            : 0;
        this.cameraOffset = approach(
            this.cameraOffset,
            targetOffset,
            SPELUNKY_LOOK_UP_CAMERA_SPEED * deltaTime,
        );
    }
}
