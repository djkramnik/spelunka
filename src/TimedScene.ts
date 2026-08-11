import Scene from './Scene.js';
import type {GameContext} from './Scene.js';

export default class TimedScene extends Scene {
    countDown = 2;

    override update(gameContext: GameContext): void {
        this.countDown -= gameContext.deltaTime;
        if (this.countDown <= 0) {
            this.events.emit(Scene.EVENT_COMPLETE);
        }
    }
}
