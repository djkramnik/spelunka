import Entity from '../Entity.js';
import type Level from '../Level.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Health from '../traits/Health.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import Player from '../traits/Player.js';
import PlayerDeath from '../traits/PlayerDeath.js';
import PlayerHit from '../traits/PlayerHit.js';
import Solid from '../traits/Solid.js';

const CLASSIC_UPDATES_PER_SECOND = 30;
const GAME_UPDATES_PER_SECOND = 60;

export const ROCK_THROW_SPEED = 8 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_THROW_LIFT = -3 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_GRAVITY = 0.6
    * CLASSIC_UPDATES_PER_SECOND
    * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_TERMINAL_VELOCITY = 8 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_WALL_REBOUND = 0.5;
export const ROCK_FLOOR_REBOUND = 0.5;
export const ROCK_CEILING_REBOUND = 0.8;
export const ROCK_FLOOR_FRICTION = 0.3;
export const ROCK_HORIZONTAL_SETTLE_SPEED = 0.1
    * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_VERTICAL_SETTLE_SPEED = 1
    * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_ENEMY_DANGER_SPEED = 2 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_PLAYER_DANGER_SPEED = 4 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_PLAYER_DAMAGE = 2;
export const ROCK_PLAYER_UPWARD_SPEED = 4 * CLASSIC_UPDATES_PER_SECOND;
export const ROCK_PLAYER_INVULNERABILITY_DURATION = 20
    / CLASSIC_UPDATES_PER_SECOND;
export const ROCK_THROWER_GRACE_UPDATES = 10
    * GAME_UPDATES_PER_SECOND
    / CLASSIC_UPDATES_PER_SECOND;
export const ROCK_Z_INDEX = 1;

export class RockBehavior extends Trait {
    override collides(rock: Entity, candidate: Entity): void {
        if (!candidate.traits.has(Killable)) {
            return;
        }

        const pickable = rock.traits.get(Pickable);
        if (pickable.carrier !== null
            || pickable.isThrowerProtected(rock, candidate)) {
            return;
        }

        if (candidate.traits.has(Player)) {
            this.hitPlayer(rock, candidate);
            return;
        }

        if (Math.abs(rock.vel.x) > ROCK_ENEMY_DANGER_SPEED
            || Math.abs(rock.vel.y) > ROCK_ENEMY_DANGER_SPEED) {
            candidate.traits.get(Killable).kill();
        }
    }

    private hitPlayer(rock: Entity, player: Entity): void {
        if (Math.abs(rock.vel.x) <= ROCK_PLAYER_DANGER_SPEED) {
            return;
        }

        const killable = player.traits.get(Killable);
        if (!player.traits.has(Health)) {
            killable.kill();
            return;
        }

        const health = player.traits.get(Health);
        if (!health.takeDamage(
            ROCK_PLAYER_DAMAGE,
            ROCK_PLAYER_INVULNERABILITY_DURATION,
        )) {
            return;
        }

        if (health.depleted) {
            if (player.traits.has(PlayerDeath)) {
                player.traits.get(PlayerDeath).kill(
                    player,
                    rock.vel.x,
                    ROCK_PLAYER_UPWARD_SPEED,
                );
            } else {
                killable.kill();
            }
            return;
        }

        player.vel.set(rock.vel.x, -ROCK_PLAYER_UPWARD_SPEED);
        if (player.traits.has(PlayerHit)) {
            const direction = rock.vel.x < 0 ? -1 : 1;
            player.traits.get(PlayerHit).start(direction);
        }
    }

    override update(
        rock: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        const pickable = rock.traits.get(Pickable);
        const physics = rock.traits.get(Physics);
        if (pickable.carrier !== null || physics.grounded) {
            return;
        }

        rock.vel.y += (ROCK_GRAVITY - level.gravity) * deltaTime;
        rock.vel.y = Math.min(rock.vel.y, ROCK_TERMINAL_VELOCITY);
    }
}

export type RockFactory = () => Entity;

export async function loadRock(): Promise<RockFactory> {
    const sprite = await loadSpriteSheet('generated/spelunky-hd/rock');
    return createRockFactory(sprite);
}

export function createRockFactory(sprite: SpriteSheet): RockFactory {
    return function createRock(): Entity {
        const rock = new Entity();
        const pickable = new Pickable();
        pickable.carryOffset.set(4, 6);
        pickable.alignCarryCenters = true;
        pickable.throwVelocity.set(ROCK_THROW_SPEED, ROCK_THROW_LIFT);
        pickable.throwerGraceUpdates = ROCK_THROWER_GRACE_UPDATES;
        pickable.clearThrowerProtectionOnDirectionChange = false;

        const solid = new Solid();
        solid.wallRebound = ROCK_WALL_REBOUND;
        solid.floorRebound = ROCK_FLOOR_REBOUND;
        solid.ceilingRebound = ROCK_CEILING_REBOUND;
        solid.floorFriction = ROCK_FLOOR_FRICTION;
        solid.horizontalSettleSpeed = ROCK_HORIZONTAL_SETTLE_SPEED;
        solid.verticalSettleSpeed = ROCK_VERTICAL_SETTLE_SPEED;

        rock.size.set(8, 8);
        rock.zIndex = ROCK_Z_INDEX;
        rock.addTrait(pickable);
        rock.addTrait(new Physics());
        rock.addTrait(solid);
        rock.addTrait(new RockBehavior());
        rock.draw = context => sprite.drawFrame(
            'idle',
            context,
            rock.size.x / 2,
            rock.size.y / 2,
        );

        return rock;
    };
}
