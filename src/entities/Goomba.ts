import Entity from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Killable from '../traits/Killable.js';
import PendulumMove from '../traits/PendulumMove.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

export type GoombaFactory = () => Entity;

export async function loadGoomba(): Promise<GoombaFactory> {
    const sprite = await loadSpriteSheet('goomba');
    return createGoombaFactory(sprite);
}

class Behavior extends Trait {
    override collides(us: Entity, them: Entity): void {
        if (us.traits.get(Killable).dead) {
            return;
        }

        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                us.traits.get(Killable).kill();
                us.traits.get(PendulumMove).speed = 0;
            } else {
                them.traits.get(Killable).kill();
            }
        }
    }
}

function createGoombaFactory(sprite: SpriteSheet): GoombaFactory {
    const walkAnimation = sprite.getAnimation('walk');

    function routeAnimation(goomba: Entity): string {
        if (goomba.traits.get(Killable).dead) {
            return 'flat';
        }

        return walkAnimation(goomba.lifetime);
    }

    function drawGoomba(
        this: Entity,
        context: CanvasRenderingContext2D,
    ): void {
        sprite.draw(routeAnimation(this), context, 0, 0);
    }

    return function createGoomba(): Entity {
        const goomba = new Entity();
        goomba.size.set(16, 16);

        goomba.addTrait(new Physics());
        goomba.addTrait(new Solid());
        goomba.addTrait(new PendulumMove());
        goomba.addTrait(new Behavior());
        goomba.addTrait(new Killable());
        goomba.draw = drawGoomba;

        return goomba;
    };
}
