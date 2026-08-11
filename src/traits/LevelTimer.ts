import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

const EVENT_TIMER_HURRY: unique symbol = Symbol('timer hurry');
const EVENT_TIMER_OK: unique symbol = Symbol('timer ok');

export default class LevelTimer extends Trait {
    static readonly EVENT_TIMER_HURRY = EVENT_TIMER_HURRY;
    static readonly EVENT_TIMER_OK = EVENT_TIMER_OK;

    totalTime = 300;
    currentTime = this.totalTime;
    hurryTime = 100;
    hurryEmitted: boolean | null = null;

    override update(
        _entity: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        this.currentTime -= deltaTime * 2;

        if (this.hurryEmitted !== true && this.currentTime < this.hurryTime) {
            level.events.emit(LevelTimer.EVENT_TIMER_HURRY);
            this.hurryEmitted = true;
        }

        if (this.hurryEmitted !== false && this.currentTime > this.hurryTime) {
            level.events.emit(LevelTimer.EVENT_TIMER_OK);
            this.hurryEmitted = false;
        }
    }
}
