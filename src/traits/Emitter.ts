import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export type EntityEmitter = (
    entity: Entity,
    gameContext: GameContext,
    level: Level,
) => void;

export default class Emitter extends Trait {
    interval = 2;
    coolDown = this.interval;
    readonly emitters: EntityEmitter[] = [];

    emit(entity: Entity, gameContext: GameContext, level: Level): void {
        for (const emitter of this.emitters) {
            emitter(entity, gameContext, level);
        }
    }

    update(entity: Entity, gameContext: GameContext, level: Level): void {
        this.coolDown -= gameContext.deltaTime;
        if (this.coolDown <= 0) {
            this.emit(entity, gameContext, level);
            this.coolDown = this.interval;
        }
    }
}
