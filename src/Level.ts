import Camera from './Camera.js';
import type Entity from './Entity.js';
import EntityCollider from './EntityCollider.js';
import {EventKey} from './EventEmitter.js';
import type {LevelSpec} from './loaders/schemas.js';
import MusicController from './MusicController.js';
import Scene from './Scene.js';
import type {GameContext} from './Scene.js';
import TileCollider from './TileCollider.js';
import {findPlayers} from './player.js';

type LevelTrigger = LevelSpec['triggers'][number];

const EVENT_TRIGGER = new EventKey<[
    spec: LevelTrigger,
    trigger: Entity,
    touches: ReadonlySet<Entity>,
]>('trigger');

function focusPlayer(level: Level): void {
    for (const player of findPlayers(level.entities)) {
        level.camera.pos.x = Math.max(0, player.pos.x - 100);
    }
}

export default class Level extends Scene<Camera> {
    static readonly EVENT_TRIGGER = EVENT_TRIGGER;

    name = '';
    gravity = 1500;
    totalTime = 0;

    readonly camera = new Camera();
    readonly music = new MusicController();
    readonly entities = new Set<Entity>();
    readonly entityCollider = new EntityCollider(this.entities);
    readonly tileCollider = new TileCollider();

    override draw(gameContext: GameContext): void {
        this.comp.draw(gameContext.videoContext, this.camera);
    }

    override update(gameContext: GameContext): void {
        this.entities.forEach(entity => {
            entity.update(gameContext, this);
        });

        this.entities.forEach(entity => {
            this.entityCollider.check(entity);
        });

        this.entities.forEach(entity => {
            entity.finalize();
        });

        focusPlayer(this);
        this.totalTime += gameContext.deltaTime;
    }

    override pause(): void {
        this.music.pause();
    }
}
