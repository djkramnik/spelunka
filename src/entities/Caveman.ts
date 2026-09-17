import AudioBoard from '../AudioBoard.js';
import Entity, {Sides} from '../Entity.js';
import {emitBloodSplatter} from '../effects/BloodSplatter.js';
import {loadAudioBoard} from '../loaders/audio.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Damageable from '../traits/Damageable.js';
import Health from '../traits/Health.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Player from '../traits/Player.js';
import PlayerDeath from '../traits/PlayerDeath.js';
import PlayerHit from '../traits/PlayerHit.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

const CLASSIC_UPDATES_PER_SECOND = 30;
const HD_TICK_SECONDS = 1 / 60;

export const CAVEMAN_HIT_POINTS = 3;
export const CAVEMAN_PATROL_SPEED = 1.5 * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_CHARGE_SPEED = 3 * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_STUN_DURATION = 200 / CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_WAKE_DISTANCE = 100;
export const CAVEMAN_WAKE_VERTICAL_DISTANCE = 48;
export const CAVEMAN_WAKE_DURATION = 5 * 6 * HD_TICK_SECONDS;
export const CAVEMAN_CONTACT_DAMAGE = 1;
export const CAVEMAN_CONTACT_KNOCKBACK_SPEED = 6
    * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_CONTACT_UPWARD_SPEED = 6
    * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_CONTACT_INVULNERABILITY_DURATION = 30
    / CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_STOMP_HORIZONTAL_SPEED = 1
    * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_STOMP_UPWARD_SPEED = 6
    * CLASSIC_UPDATES_PER_SECOND;
export const CAVEMAN_STUN_FRICTION = 0.1
    * CLASSIC_UPDATES_PER_SECOND
    * CLASSIC_UPDATES_PER_SECOND;

export type CavemanState =
    | 'sleeping'
    | 'waking'
    | 'walking'
    | 'charging'
    | 'stunned'
    | 'dead';

export type CavemanHitEffect = (caveman: Entity, level: Level) => void;

export interface CavemanOptions {
    initialDirection?: -1 | 1;
    onHit?: CavemanHitEffect;
}

export type CavemanFactory = () => Entity;

export const noCavemanHitEffect: CavemanHitEffect = () => {};

export const emitCavemanBloodSplatter: CavemanHitEffect = (caveman, level) => {
    emitBloodSplatter(level, {
        x: caveman.bounds.left + caveman.size.x / 2,
        y: caveman.bounds.top + caveman.size.y / 2,
    }, {count: 3});
};

function centerX(entity: Entity): number {
    return entity.bounds.left + entity.size.x / 2;
}

function centerY(entity: Entity): number {
    return entity.bounds.top + entity.size.y / 2;
}

export class CavemanBehavior extends Trait {
    state: CavemanState = 'sleeping';
    direction: -1 | 1;
    stateTime = 0;
    animationTime = 0;
    stunTime = 0;

    private deathEffectHandled = false;

    constructor(
        initialDirection: -1 | 1 = 1,
        private readonly onHit: CavemanHitEffect = emitCavemanBloodSplatter,
    ) {
        super();
        this.direction = initialDirection;
    }

    private transition(state: CavemanState): void {
        if (this.state === state) {
            return;
        }
        this.state = state;
        this.stateTime = 0;
    }

    private canWalk(entity: Entity, level: Level, direction: -1 | 1): boolean {
        const probeX = direction > 0
            ? entity.bounds.right + 1
            : entity.bounds.left - 1;
        return level.tileCollider.hasSolidAt(probeX, entity.bounds.bottom + 1);
    }

    private lineIsClear(entity: Entity, target: Entity, level: Level): boolean {
        const startX = centerX(entity);
        const endX = centerX(target);
        const sightY = centerY(entity);
        const direction = endX < startX ? -1 : 1;
        for (let x = startX + direction * 8;
            direction > 0 ? x < endX : x > endX;
            x += direction * 8) {
            if (level.tileCollider.hasSolidAt(x, sightY)) {
                return false;
            }
        }
        return true;
    }

    private nearbyPlayer(
        entity: Entity,
        level: Level,
        requireFacing: boolean,
    ): Entity | null {
        for (const candidate of level.entities) {
            if (!candidate.traits.has(Player)
                || (candidate.traits.has(Killable)
                    && candidate.traits.get(Killable).dead)) {
                continue;
            }
            const deltaX = centerX(candidate) - centerX(entity);
            const deltaY = centerY(candidate) - centerY(entity);
            if (Math.hypot(deltaX, deltaY) >= CAVEMAN_WAKE_DISTANCE
                || Math.abs(deltaY) > CAVEMAN_WAKE_VERTICAL_DISTANCE
                || (requireFacing && Math.sign(deltaX) !== this.direction)
                || !this.lineIsClear(entity, candidate, level)) {
                continue;
            }
            return candidate;
        }
        return null;
    }

    private enterStun(entity: Entity, level: Level): void {
        const damageable = entity.traits.get(Damageable);
        const impact = damageable.consumeImpact();
        if (impact === null) {
            return;
        }

        entity.vel.set(impact.velocityX, impact.velocityY);
        this.stunTime = CAVEMAN_STUN_DURATION;
        this.transition('stunned');
        entity.sounds.add('hit');
        this.onHit(entity, level);
        if (damageable.depleted) {
            entity.traits.get(Killable).kill();
        }
    }

    private settleStun(
        entity: Entity,
        deltaTime: number,
        physics: Physics,
        damageable: Damageable,
    ): void {
        if (!physics.grounded) {
            return;
        }

        const friction = CAVEMAN_STUN_FRICTION * deltaTime;
        if (Math.abs(entity.vel.x) <= friction) {
            entity.vel.x = 0;
        } else {
            entity.vel.x -= Math.sign(entity.vel.x) * friction;
        }

        if (damageable.depleted && entity.vel.x === 0 && entity.vel.y === 0) {
            this.transition('dead');
            return;
        }

        this.stunTime = Math.max(0, this.stunTime - deltaTime);
        if (this.stunTime === 0 && damageable.recover()) {
            this.transition('walking');
        }
    }

    private handleExternalDeath(entity: Entity, level: Level): void {
        const killable = entity.traits.get(Killable);
        if (!killable.dead || this.state === 'stunned' || this.state === 'dead') {
            return;
        }
        entity.vel.set(0, 0);
        this.transition('dead');
        if (!this.deathEffectHandled) {
            this.deathEffectHandled = true;
            this.onHit(entity, level);
        }
    }

    override collides(caveman: Entity, candidate: Entity): void {
        if (!candidate.traits.has(Player)
            || !candidate.traits.has(Stomper)
            || !candidate.traits.has(Killable)) {
            return;
        }

        const damageable = caveman.traits.get(Damageable);
        const stomper = candidate.traits.get(Stomper);
        if (stomper.tryStomp(candidate, caveman)) {
            const direction = centerX(candidate) < centerX(caveman) ? 1 : -1;
            damageable.hit(1, {
                velocityX: direction * CAVEMAN_STOMP_HORIZONTAL_SPEED,
                velocityY: -CAVEMAN_STOMP_UPWARD_SPEED,
            });
            return;
        }

        if (this.state === 'sleeping'
            || this.state === 'waking'
            || this.state === 'stunned'
            || this.state === 'dead'
            || !candidate.traits.has(Health)) {
            return;
        }

        const health = candidate.traits.get(Health);
        if (!health.takeDamage(
            CAVEMAN_CONTACT_DAMAGE,
            CAVEMAN_CONTACT_INVULNERABILITY_DURATION,
        )) {
            return;
        }

        const direction = centerX(candidate) < centerX(caveman) ? -1 : 1;
        if (health.depleted) {
            if (candidate.traits.has(PlayerDeath)) {
                candidate.traits.get(PlayerDeath).kill(
                    candidate,
                    direction * CAVEMAN_CONTACT_KNOCKBACK_SPEED,
                    CAVEMAN_CONTACT_UPWARD_SPEED,
                );
            } else {
                candidate.vel.set(
                    direction * CAVEMAN_CONTACT_KNOCKBACK_SPEED,
                    -CAVEMAN_CONTACT_UPWARD_SPEED,
                );
                candidate.traits.get(Killable).kill();
            }
        } else {
            candidate.vel.set(
                direction * CAVEMAN_CONTACT_KNOCKBACK_SPEED,
                -CAVEMAN_CONTACT_UPWARD_SPEED,
            );
            if (candidate.traits.has(PlayerHit)) {
                candidate.traits.get(PlayerHit).start(direction);
            }
        }
    }

    override obstruct(_entity: Entity, side: symbol): void {
        if (this.state !== 'walking' && this.state !== 'charging') {
            return;
        }
        if (side === Sides.LEFT) {
            this.direction = 1;
        } else if (side === Sides.RIGHT) {
            this.direction = -1;
        }
    }

    override update(
        entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        this.stateTime += deltaTime;
        this.handleExternalDeath(entity, level);
        this.enterStun(entity, level);

        const physics = entity.traits.get(Physics);
        const damageable = entity.traits.get(Damageable);
        if (this.state === 'stunned') {
            this.settleStun(entity, deltaTime, physics, damageable);
            return;
        }
        if (this.state === 'dead') {
            entity.vel.x = 0;
            return;
        }
        if (this.state === 'sleeping') {
            entity.vel.x = 0;
            const player = this.nearbyPlayer(entity, level, false);
            if (player !== null) {
                this.direction = centerX(player) < centerX(entity) ? -1 : 1;
                this.transition('waking');
            }
            return;
        }
        if (this.state === 'waking') {
            entity.vel.x = 0;
            if (this.stateTime >= CAVEMAN_WAKE_DURATION) {
                this.transition('walking');
            }
            return;
        }

        this.animationTime += deltaTime;
        if (this.state === 'walking') {
            const target = this.nearbyPlayer(entity, level, true);
            if (target !== null) {
                this.direction = centerX(target) < centerX(entity) ? -1 : 1;
                this.transition('charging');
                entity.vel.x = this.direction * CAVEMAN_CHARGE_SPEED;
                return;
            }
            if (physics.grounded && !this.canWalk(entity, level, this.direction)) {
                const opposite = this.direction === 1 ? -1 : 1;
                if (this.canWalk(entity, level, opposite)) {
                    this.direction = opposite;
                } else {
                    entity.vel.x = 0;
                    return;
                }
            }
            entity.vel.x = this.direction * CAVEMAN_PATROL_SPEED;
            return;
        }

        entity.vel.x = this.direction * CAVEMAN_CHARGE_SPEED;
    }
}

export async function loadCaveman(
    audioContext: AudioContext,
): Promise<CavemanFactory> {
    const [sprite, audio] = await Promise.all([
        loadSpriteSheet('generated/spelunky-hd/caveman'),
        loadAudioBoard('caveman', audioContext),
    ]);
    return createCavemanFactory(sprite, audio);
}

export function createCavemanFactory(
    sprite: SpriteSheet,
    audio: AudioBoard = new AudioBoard(),
    options: CavemanOptions = {},
): CavemanFactory {
    const walkAnimation = sprite.getAnimation('walk');
    const chargeAnimation = sprite.getAnimation('charge');
    const wakeAnimation = sprite.getAnimation('wake');

    return function createCaveman(): Entity {
        const caveman = new Entity();
        caveman.audio = audio;
        caveman.size.set(12, 16);
        caveman.offset.x = 2;

        const behavior = new CavemanBehavior(
            options.initialDirection,
            options.onHit,
        );
        const physics = new Physics();
        const killable = new Killable();
        killable.removeAfter = Infinity;

        caveman.addTrait(new Damageable(CAVEMAN_HIT_POINTS));
        caveman.addTrait(behavior);
        caveman.addTrait(physics);
        caveman.addTrait(new Solid());
        caveman.addTrait(killable);
        caveman.draw = context => {
            let frame: string;
            switch (behavior.state) {
                case 'sleeping':
                    frame = 'sleeping';
                    break;
                case 'waking':
                    frame = wakeAnimation(behavior.stateTime);
                    break;
                case 'walking':
                    frame = walkAnimation(behavior.animationTime);
                    break;
                case 'charging':
                    frame = chargeAnimation(behavior.animationTime);
                    break;
                case 'stunned':
                    if (physics.grounded && caveman.vel.x === 0) {
                        frame = 'stunned';
                    } else if (caveman.vel.y < 0) {
                        frame = 'hit-up';
                    } else {
                        frame = 'hit-fall';
                    }
                    break;
                case 'dead':
                    frame = 'dead';
                    break;
            }
            sprite.drawFrame(
                frame,
                context,
                caveman.offset.x + caveman.size.x / 2,
                caveman.offset.y + caveman.size.y,
                behavior.direction < 0,
            );
        };

        return caveman;
    };
}
