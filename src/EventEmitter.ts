type UntypedEventMap = Record<PropertyKey, any[]>;
type EventMapConstraint<Events> = Record<keyof Events, unknown[]>;

interface Listener {
    name: PropertyKey;
    callback: (...args: any[]) => void;
}

export default class EventEmitter<
    Events extends EventMapConstraint<Events> = UntypedEventMap,
> {
    private readonly listeners: Listener[] = [];

    listen<Name extends keyof Events>(
        name: Name,
        callback: (...args: Events[Name]) => void,
    ): void {
        this.listeners.push({name, callback});
    }

    emit<Name extends keyof Events>(name: Name, ...args: Events[Name]): void {
        this.listeners.forEach(listener => {
            if (listener.name === name) {
                listener.callback(...args);
            }
        });
    }
}
