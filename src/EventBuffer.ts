import type {BufferedEventKey} from './EventEmitter.js';
import {EventKey} from './EventEmitter.js';

export default class EventBuffer {
    private readonly eventKeys = new Set<BufferedEventKey>();

    emit<Arguments extends unknown[]>(
        event: EventKey<Arguments>,
        ...args: Arguments
    ): void {
        event.buffer(this, args);
        this.eventKeys.add(event);
    }

    process<Arguments extends unknown[]>(
        event: EventKey<Arguments>,
        callback: (...args: NoInfer<Arguments>) => void,
    ): void {
        event.process(this, callback);
    }

    clear(): void {
        this.eventKeys.forEach(event => event.clearBuffered(this));
        this.eventKeys.clear();
    }
}
