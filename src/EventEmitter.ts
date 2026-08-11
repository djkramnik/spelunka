type EventCallback<Arguments extends unknown[]> = (...args: Arguments) => void;

export interface BufferedEventKey {
    clearBuffered(owner: object): void;
}

export class EventKey<Arguments extends unknown[]> implements BufferedEventKey {
    readonly description: string;

    private readonly listeners = new WeakMap<
        object,
        Set<EventCallback<Arguments>>
    >();

    private readonly bufferedEvents = new WeakMap<object, Arguments[]>();

    constructor(description: string) {
        this.description = description;
    }

    listen(owner: object, callback: EventCallback<Arguments>): void {
        let callbacks = this.listeners.get(owner);
        if (!callbacks) {
            callbacks = new Set();
            this.listeners.set(owner, callbacks);
        }
        callbacks.add(callback);
    }

    emit(owner: object, args: Arguments): void {
        this.listeners.get(owner)?.forEach(callback => callback(...args));
    }

    buffer(owner: object, args: Arguments): void {
        let events = this.bufferedEvents.get(owner);
        if (!events) {
            events = [];
            this.bufferedEvents.set(owner, events);
        }
        events.push(args);
    }

    process(owner: object, callback: EventCallback<Arguments>): void {
        this.bufferedEvents.get(owner)?.forEach(args => callback(...args));
    }

    clearBuffered(owner: object): void {
        this.bufferedEvents.delete(owner);
    }
}

export default class EventEmitter {
    listen<Arguments extends unknown[]>(
        event: EventKey<Arguments>,
        callback: EventCallback<NoInfer<Arguments>>,
    ): void {
        event.listen(this, callback);
    }

    emit<Arguments extends unknown[]>(
        event: EventKey<Arguments>,
        ...args: Arguments
    ): void {
        event.emit(this, args);
    }
}
