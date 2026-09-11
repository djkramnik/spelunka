import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import Player from './Player.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';

const HD_TICK_SECONDS = 1 / 60;

export const SPELUNKY_WHIP_STARTUP_TIME = 5 * 4 * HD_TICK_SECONDS;
export const SPELUNKY_WHIP_ACTIVE_TIME = 4 * HD_TICK_SECONDS;
export const SPELUNKY_WHIP_RECOVERY_TIME = 4 * HD_TICK_SECONDS;
export const SPELUNKY_WHIP_DURATION = SPELUNKY_WHIP_STARTUP_TIME
    + SPELUNKY_WHIP_ACTIVE_TIME
    + SPELUNKY_WHIP_RECOVERY_TIME;
export const SPELUNKY_WHIP_REACH = 16;

export type WhipPhase = 'inactive' | 'startup' | 'active' | 'recovery';

function overlaps(
    left: number,
    top: number,
    right: number,
    bottom: number,
    target: Entity,
): boolean {
    return bottom > target.bounds.top
        && top < target.bounds.bottom
        && left < target.bounds.right
        && right > target.bounds.left;
}

/**
 * Owns the player's empty-hand whip action. The six HD player frames and
 * eleven separate HD lash frames provide the startup and strike cadence; a
 * short held-final-frame recovery makes the complete action non-retriggerable.
 * Movement and airborne physics continue.
 */
export default class Whip extends Trait {
    time = SPELUNKY_WHIP_DURATION;
    direction: -1 | 1 = 1;
    private readonly hitTargets = new Set<Entity>();
    private soundPlayed = false;

    get active(): boolean {
        return this.time < SPELUNKY_WHIP_DURATION;
    }

    get phase(): WhipPhase {
        if (!this.active) {
            return 'inactive';
        }
        if (this.time < SPELUNKY_WHIP_STARTUP_TIME) {
            return 'startup';
        }
        if (this.time < SPELUNKY_WHIP_STARTUP_TIME
            + SPELUNKY_WHIP_ACTIVE_TIME) {
            return 'active';
        }
        return 'recovery';
    }

    private isAvailable(entity: Entity): boolean {
        return !entity.traits.get(Killable).dead
            && !entity.traits.get(PlayerDeath).terminal
            && !entity.traits.get(PlayerHit).active
            && entity.traits.get(Carrier).carried === null
            && entity.traits.get(Crouch).phase === 'standing'
            && !entity.traits.get(LadderClimb).active
            && !entity.traits.get(LedgeHang).active;
    }

    start(entity: Entity): boolean {
        if (this.active || !this.isAvailable(entity)) {
            return false;
        }
        this.time = 0;
        this.direction = entity.traits.get(Go).heading < 0 ? -1 : 1;
        this.hitTargets.clear();
        this.soundPlayed = false;
        return true;
    }

    interrupt(): void {
        this.time = SPELUNKY_WHIP_DURATION;
        this.hitTargets.clear();
        this.soundPlayed = false;
    }

    private hitTargetsInRange(entity: Entity, level: Level): void {
        const left = this.direction > 0
            ? entity.bounds.right
            : entity.bounds.left - SPELUNKY_WHIP_REACH;
        const right = this.direction > 0
            ? entity.bounds.right + SPELUNKY_WHIP_REACH
            : entity.bounds.left;
        for (const target of level.entities) {
            if (target === entity
                || target.entityCollisionsEnabled === false
                || this.hitTargets.has(target)
                || !target.traits.has(Killable)
                || target.traits.has(Player)
                || target.traits.get(Killable).dead
                || !overlaps(
                    left,
                    entity.bounds.top,
                    right,
                    entity.bounds.bottom,
                    target,
                )) {
                continue;
            }
            this.hitTargets.add(target);
            target.traits.get(Killable).kill();
        }
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        if (!this.active) {
            return;
        }
        if (!this.isAvailable(entity)) {
            this.interrupt();
            return;
        }

        const previousTime = this.time;
        const nextTime = Math.min(
            SPELUNKY_WHIP_DURATION,
            previousTime + deltaTime,
        );
        const activeStart = SPELUNKY_WHIP_STARTUP_TIME;
        const activeEnd = activeStart + SPELUNKY_WHIP_ACTIVE_TIME;
        if (previousTime < activeEnd && nextTime > activeStart) {
            if (!this.soundPlayed) {
                entity.sounds.add('whip');
                this.soundPlayed = true;
            }
            this.hitTargetsInRange(entity, level);
        }
        this.time = nextTime;
    }
}
