import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

export const SPELUNKY_SMALL_HIT_REACTION_DURATION = 2 * 4 / 60;

/**
 * A brief, nonterminal player damage presentation. It intentionally leaves
 * control, carried items, attachments, and ordinary physics unchanged.
 */
export default class PlayerHit extends Trait {
    direction: -1 | 1 = 1;
    time = SPELUNKY_SMALL_HIT_REACTION_DURATION;

    get active(): boolean {
        return this.time < SPELUNKY_SMALL_HIT_REACTION_DURATION;
    }

    start(direction: -1 | 1): void {
        this.direction = direction;
        this.time = 0;
    }

    override update(
        _entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        if (this.active) {
            this.time = Math.min(
                SPELUNKY_SMALL_HIT_REACTION_DURATION,
                this.time + deltaTime,
            );
        }
    }
}
