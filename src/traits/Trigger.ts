import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export type TriggerCondition = (
    entity: Entity,
    touches: ReadonlySet<Entity>,
    gameContext: GameContext,
    level: Level,
) => void;

export default class Trigger extends Trait {
    private readonly touches = new Set<Entity>();
    readonly conditions: TriggerCondition[] = [];

    override collides(_us: Entity, them: Entity): void {
        this.touches.add(them);
    }

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        if (this.touches.size > 0) {
            for (const condition of this.conditions) {
                condition(entity, this.touches, gameContext, level);
            }
            this.touches.clear();
        }
    }
}
