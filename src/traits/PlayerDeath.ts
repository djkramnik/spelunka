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
import Physics from './Physics.js';
import Solid from './Solid.js';

const CLASSIC_UPDATES_PER_SECOND = 30;

export const SPELUNKY_DEAD_BODY_GRAVITY = 0.6
    * CLASSIC_UPDATES_PER_SECOND
    * CLASSIC_UPDATES_PER_SECOND;
export const SPELUNKY_DEAD_BODY_TERMINAL_VELOCITY = 10
    * CLASSIC_UPDATES_PER_SECOND;
export const SPELUNKY_DEAD_BODY_WALL_REBOUND = 0.5;
export const SPELUNKY_DEAD_BODY_FLOOR_REBOUND = 0.5;
export const SPELUNKY_DEAD_BODY_CEILING_REBOUND = 0.8;
export const SPELUNKY_DEAD_BODY_FLOOR_FRICTION = 0.3;
export const SPELUNKY_DEAD_BODY_HORIZONTAL_SETTLE_SPEED = 0.1
    * CLASSIC_UPDATES_PER_SECOND;
export const SPELUNKY_DEAD_BODY_VERTICAL_SETTLE_SPEED = 1
    * CLASSIC_UPDATES_PER_SECOND;

export type PlayerDeathPhase = 'alive' | 'airborne' | 'settled';

export default class PlayerDeath extends Trait {
    phase: PlayerDeathPhase = 'alive';
    direction: -1 | 1 = 1;
    private musicStopped = false;

    get terminal(): boolean {
        return this.phase !== 'alive';
    }

    kill(entity: Entity, horizontalSpeed: number, upwardSpeed: number): boolean {
        if (this.terminal) {
            return false;
        }

        entity.traits.get(LadderClimb).interrupt(entity);
        entity.traits.get(LedgeHang).interrupt(entity);
        const crouch = entity.traits.get(Crouch);
        crouch.setDown(false);
        crouch.standImmediately(entity);

        const physics = entity.traits.get(Physics);
        physics.enabled = true;
        physics.grounded = false;

        const solid = entity.traits.get(Solid);
        solid.wallRebound = SPELUNKY_DEAD_BODY_WALL_REBOUND;
        solid.floorRebound = SPELUNKY_DEAD_BODY_FLOOR_REBOUND;
        solid.ceilingRebound = SPELUNKY_DEAD_BODY_CEILING_REBOUND;
        solid.floorFriction = SPELUNKY_DEAD_BODY_FLOOR_FRICTION;
        solid.horizontalSettleSpeed = SPELUNKY_DEAD_BODY_HORIZONTAL_SETTLE_SPEED;
        solid.verticalSettleSpeed = SPELUNKY_DEAD_BODY_VERTICAL_SETTLE_SPEED;

        const go = entity.traits.get(Go);
        go.enabled = false;
        go.dir = 0;
        go.distance = 0;
        if (horizontalSpeed !== 0) {
            this.direction = horizontalSpeed < 0 ? -1 : 1;
        }

        const jump = entity.traits.get(Jump);
        jump.cancel();
        jump.enabled = false;
        jump.phase = 'falling';
        jump.ready = -1;

        entity.vel.set(horizontalSpeed, -Math.abs(upwardSpeed));
        entity.traits.get(Carrier).drop(entity);
        entity.entityCollisionsEnabled = false;

        const killable = entity.traits.get(Killable);
        killable.removeAfter = Infinity;
        killable.kill();
        this.phase = 'airborne';
        return true;
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        if (!this.terminal && entity.traits.get(Killable).dead) {
            this.kill(
                entity,
                entity.vel.x,
                Math.max(0, -entity.vel.y),
            );
        }

        if (!this.terminal) {
            return;
        }

        if (!this.musicStopped) {
            level.music.stop();
            this.musicStopped = true;
        }

        const go = entity.traits.get(Go);
        go.enabled = false;
        go.dir = 0;
        if (entity.vel.x !== 0) {
            this.direction = entity.vel.x < 0 ? -1 : 1;
        }
        entity.traits.get(Jump).enabled = false;
        entity.entityCollisionsEnabled = false;

        const physics = entity.traits.get(Physics);
        if (!physics.grounded) {
            entity.vel.y += (SPELUNKY_DEAD_BODY_GRAVITY - level.gravity)
                * deltaTime;
            entity.vel.y = Math.min(
                entity.vel.y,
                SPELUNKY_DEAD_BODY_TERMINAL_VELOCITY,
            );
        }

        if (physics.grounded && entity.vel.x === 0 && entity.vel.y === 0) {
            this.phase = 'settled';
        } else {
            this.phase = 'airborne';
        }
    }
}
