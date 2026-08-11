import type Entity from './Entity.js';
import type EventBuffer from './EventBuffer.js';
import {EventKey} from './EventEmitter.js';
import type Level from './Level.js';
import type {GameContext} from './Scene.js';
import type {CollisionTile} from './TileCollider.js';
import type {TileMatch} from './TileResolver.js';

const EVENT_TASK = new EventKey<[entity: Entity]>('task');

interface TraitListener {
    process(events: EventBuffer): boolean;
}

export default class Trait {
    static readonly EVENT_TASK = EVENT_TASK;

    private listeners: TraitListener[] = [];

    listen<Arguments extends unknown[]>(
        event: EventKey<Arguments>,
        callback: (...args: NoInfer<Arguments>) => void,
        count = Infinity,
    ): void {
        let remaining = count;
        this.listeners.push({
            process(events): boolean {
                events.process(event, callback);
                remaining--;
                return remaining > 0;
            },
        });
    }

    finalize(entity: Entity): void {
        this.listeners = this.listeners.filter(listener => {
            return listener.process(entity.events);
        });
    }

    queue(task: (entity: Entity) => void): void {
        this.listen(Trait.EVENT_TASK, task, 1);
    }

    collides(_us: Entity, _them: Entity): void {}

    obstruct(
        _entity: Entity,
        _side: symbol,
        _match?: TileMatch<CollisionTile>,
    ): void {}

    update(_entity: Entity, _gameContext: GameContext, _level: Level): void {}
}
