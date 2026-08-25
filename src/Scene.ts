import Compositor from './Compositor.js';
import type Entity from './Entity.js';
import EventEmitter, {EventKey} from './EventEmitter.js';
import type PerformanceMetrics from './PerformanceMetrics.js';

const EVENT_COMPLETE = new EventKey<[]>('scene complete');

export type EntityFactory = Record<string, () => Entity>;

export interface GameContext {
    videoContext: CanvasRenderingContext2D;
    audioContext: AudioContext;
    deltaTime: number;
    entityFactory: EntityFactory;
    performanceMetrics: PerformanceMetrics;
    present(): void;
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
