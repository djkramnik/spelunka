import {Sides} from '../Entity.js';
import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class PendulumMove extends Trait {
    enabled = true;
    speed = -30;

    obstruct(_entity: Entity, side: symbol): void {
        if (side === Sides.LEFT || side === Sides.RIGHT) {
            this.speed = -this.speed;
        }
    }

    update(entity: Entity, _gameContext: GameContext, _level: Level): void {
        if (this.enabled) {
            entity.vel.x = this.speed;
        }
    }
}
