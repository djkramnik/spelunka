import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export default class Killable extends Trait {
    dead = false;
    deadTime = 0;
    removeAfter = 2;

    kill(): void {
        this.queue(() => {
            this.dead = true;
        });
    }

    revive(): void {
        this.dead = false;
        this.deadTime = 0;
    }

    update(entity: Entity, {deltaTime}: GameContext, level: Level): void {
        if (this.dead) {
            this.deadTime += deltaTime;
            if (this.deadTime > this.removeAfter) {
                this.queue(() => {
                    level.entities.delete(entity);
                });
            }
        }
    }
}
