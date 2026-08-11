type UntypedEventMap = Record<PropertyKey, any[]>;
type EventMapConstraint<Events> = Record<keyof Events, unknown[]>;

interface BufferedEvent {
    name: PropertyKey;
    args: any[];
}

export default class EventBuffer<
    Events extends EventMapConstraint<Events> = UntypedEventMap,
> {
    private readonly events: BufferedEvent[] = [];

    emit<Name extends keyof Events>(name: Name, ...args: Events[Name]): void {
        this.events.push({name, args});
    }

    process<Name extends keyof Events>(
        name: Name,
        callback: (...args: Events[Name]) => void,
    ): void {
        this.events.forEach(event => {
            if (event.name === name) {
                callback(...event.args as Events[Name]);
            }
        });
    }

    clear(): void {
        this.events.length = 0;
    }
}
