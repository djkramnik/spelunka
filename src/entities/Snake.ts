import Entity, {Sides} from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

export const SNAKE_WALK_SPEED = 30;
export const SNAKE_INITIAL_DIRECTION = 1;

export type SnakeDeathEffect = (snake: Entity, level: Level) => void;

export interface SnakeOptions {
    initialDirection?: -1 | 1;
    onDeath?: SnakeDeathEffect;
}

export type SnakeFactory = () => Entity;

export const noSnakeDeathEffect: SnakeDeathEffect = () => {};

export class SnakeBehavior extends Trait {
    readonly walkSpeed = SNAKE_WALK_SPEED;

    direction: -1 | 1;
    animationTime = 0;

    private deathHandled = false;

    constructor(
        initialDirection: -1 | 1 = SNAKE_INITIAL_DIRECTION,
        private readonly onDeath: SnakeDeathEffect = noSnakeDeathEffect,
    ) {
        super();
        this.direction = initialDirection;
    }

    private canWalk(entity: Entity, level: Level, direction: -1 | 1): boolean {
        const probeX = direction > 0
            ? entity.bounds.right + 1
            : entity.bounds.left - 1;
        return level.tileCollider.hasSolidAt(probeX, entity.bounds.bottom + 1);
    }

    override collides(snake: Entity, candidate: Entity): void {
        const killable = snake.traits.get(Killable);
        if (killable.dead
            || !candidate.traits.has(Stomper)
            || !candidate.traits.has(Killable)) {
            return;
        }

        if (candidate.traits.get(Stomper).canStomp(candidate, snake)) {
            killable.kill();
        } else {
            candidate.traits.get(Killable).kill();
        }
    }

    override obstruct(_entity: Entity, side: symbol): void {
        if (side === Sides.LEFT) {
            this.direction = 1;
        } else if (side === Sides.RIGHT) {
            this.direction = -1;
        }
    }

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        const killable = entity.traits.get(Killable);
        if (killable.dead) {
            entity.vel.x = 0;
            if (!this.deathHandled) {
                this.deathHandled = true;
                this.onDeath(entity, level);
            }
            return;
        }

        const {deltaTime} = gameContext;
        this.animationTime += deltaTime;

        const physics = entity.traits.get(Physics);
        if (physics.grounded && !this.canWalk(entity, level, this.direction)) {
            const opposite = this.direction === 1 ? -1 : 1;
            if (this.canWalk(entity, level, opposite)) {
                this.direction = opposite;
            } else {
                entity.vel.x = 0;
                return;
            }
        }

        entity.vel.x = this.direction * this.walkSpeed;
    }
}

export async function loadSnake(): Promise<SnakeFactory> {
    const sprite = await loadSpriteSheet('generated/spelunky-hd/snake');
    return createSnakeFactory(sprite);
}

export function createSnakeFactory(
    sprite: SpriteSheet,
    options: SnakeOptions = {},
): SnakeFactory {
    const walkAnimation = sprite.getAnimation('walk');

    return function createSnake(): Entity {
        const snake = new Entity();
        const behavior = new SnakeBehavior(
            options.initialDirection,
            options.onDeath,
        );
        const killable = new Killable();

        snake.size.set(12, 16);
        snake.offset.x = 2;
        killable.removeAfter = 0;

        snake.addTrait(behavior);
        snake.addTrait(new Physics());
        snake.addTrait(new Solid());
        snake.addTrait(killable);
        snake.draw = context => {
            if (killable.dead) {
                return;
            }

            sprite.drawFrame(
                walkAnimation(behavior.animationTime),
                context,
                snake.offset.x + snake.size.x / 2,
                snake.offset.y + snake.size.y,
                behavior.direction < 0,
            );
        };

        return snake;
    };
}
