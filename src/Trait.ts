import type Entity from './Entity.js';
import type Level from './Level.js';
import type {GameContext} from './Scene.js';
import type {CollisionTile} from './TileCollider.js';
import type {TileMatch} from './TileResolver.js';

const EVENT_TASK: unique symbol = Symbol('task');

type TraitEventCallback = (...args: any[]) => void;

interface TraitListener {
    name: PropertyKey;
    callback: TraitEventCallback;
    count: number;
}

export default class Trait {
    static readonly EVENT_TASK = EVENT_TASK;

    private listeners: TraitListener[] = [];

    listen(
        name: PropertyKey,
        callback: TraitEventCallback,
        count = Infinity,
    ): void {
        this.listeners.push({name, callback, count});
    }

    finalize(entity: Entity): void {
        this.listeners = this.listeners.filter(listener => {
            entity.events.process(listener.name, listener.callback);
            listener.count--;
            return listener.count > 0;
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
