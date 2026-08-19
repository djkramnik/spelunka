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
    private readonly previousTouches = new Set<Entity>();
    readonly conditions: TriggerCondition[] = [];

    override collides(_us: Entity, them: Entity): void {
        this.touches.add(them);
    }

    override update(entity: Entity, gameContext: GameContext, level: Level): void {
        const entered = new Set<Entity>();
        for (const touchedEntity of this.touches) {
            if (!this.previousTouches.has(touchedEntity)) {
                entered.add(touchedEntity);
            }
        }

        if (entered.size > 0) {
            for (const condition of this.conditions) {
                condition(entity, entered, gameContext, level);
            }
        }

        this.previousTouches.clear();
        for (const touchedEntity of this.touches) {
            this.previousTouches.add(touchedEntity);
        }
        this.touches.clear();
    }
}
