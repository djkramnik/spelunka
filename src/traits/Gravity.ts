import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class Gravity extends Trait {
    update(entity: Entity, {deltaTime}: GameContext, level: Level): void {
        entity.vel.y += level.gravity * deltaTime;
    }
}
