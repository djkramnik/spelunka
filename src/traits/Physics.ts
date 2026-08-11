import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class Physics extends Trait {
    update(entity: Entity, gameContext: GameContext, level: Level): void {
        const {deltaTime} = gameContext;

        entity.pos.x += entity.vel.x * deltaTime;
        level.tileCollider.checkX(entity, gameContext, level);

        entity.pos.y += entity.vel.y * deltaTime;
        level.tileCollider.checkY(entity, gameContext, level);

        entity.vel.y += level.gravity * deltaTime;
    }
}
