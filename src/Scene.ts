import Compositor from './Compositor.js';
import type Entity from './Entity.js';
import EventEmitter from './EventEmitter.js';

const EVENT_COMPLETE: unique symbol = Symbol('scene complete');

export interface GameContext {
    videoContext: CanvasRenderingContext2D;
    audioContext: AudioContext;
    deltaTime: number;
    entityFactory: Record<string, () => Entity>;
}

export default class Scene<Camera = undefined> {
    static readonly EVENT_COMPLETE = EVENT_COMPLETE;

    readonly events = new EventEmitter();
    readonly comp = new Compositor<Camera>();

    draw(gameContext: GameContext): void {
        this.comp.draw(gameContext.videoContext);
    }

    update(_gameContext: GameContext): void {}

    pause(): void {
        console.log('Pause', this);
    }
}
