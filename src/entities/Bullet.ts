import Entity from '../Entity.js';
import type Level from '../Level.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Gravity from '../traits/Gravity.js';
import Killable from '../traits/Killable.js';
import Stomper from '../traits/Stomper.js';
import Velocity from '../traits/Velocity.js';

export type BulletFactory = () => Entity;

export async function loadBullet(): Promise<BulletFactory> {
    const sprite = await loadSpriteSheet('bullet');
    return createBulletFactory(sprite);
}

class Behavior extends Trait {
    private readonly gravity = new Gravity();

    override collides(us: Entity, them: Entity): void {
        if (us.traits.get(Killable).dead) {
            return;
        }

        console.log('Collision in Bullet', them.vel.y);
        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                us.traits.get(Killable).kill();
                us.vel.set(100, -200);
            } else {
                them.traits.get(Killable).kill();
            }
        }
    }

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        if (entity.traits.get(Killable).dead) {
            this.gravity.update(entity, gameContext, level);
        }
    }
}

export function createBulletFactory(sprite: SpriteSheet): BulletFactory {
    function drawBullet(
        this: Entity,
        context: CanvasRenderingContext2D,
    ): void {
        sprite.draw('bullet', context, 0, 0, this.vel.x < 0);
    }

    return function createBullet(): Entity {
        const bullet = new Entity();
        bullet.size.set(16, 14);

        bullet.addTrait(new Velocity());
        bullet.addTrait(new Behavior());
        bullet.addTrait(new Killable());
        bullet.draw = drawBullet;

        return bullet;
    };
}
