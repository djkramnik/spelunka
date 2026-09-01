import Camera from './Camera.js';
import type Entity from './Entity.js';
import EntityCollider from './EntityCollider.js';
import {EventKey} from './EventEmitter.js';
import type {LevelSpec} from './loaders/schemas.js';
import MusicController from './MusicController.js';
import Scene from './Scene.js';
import type {GameContext} from './Scene.js';
import TileCollider from './TileCollider.js';
import {TILE_SIZE} from './TileResolver.js';
import {LOGICAL_HEIGHT, LOGICAL_WIDTH} from './Renderer.js';
import {findPlayers} from './player.js';
import {Vec2} from './math.js';
import Crouch from './traits/Crouch.js';

type LevelTrigger = LevelSpec['triggers'][number];

const EVENT_TRIGGER = new EventKey<[
    spec: LevelTrigger,
    trigger: Entity,
    touches: ReadonlySet<Entity>,
]>('trigger');

const VERTICAL_CAMERA_TOP_MARGIN = 64;
const VERTICAL_CAMERA_BOTTOM_MARGIN = TILE_SIZE;

export function focusPlayer(level: Level): void {
    for (const player of findPlayers(level.entities)) {
        const crouch = player.traits.has(Crouch)
            ? player.traits.get(Crouch)
            : undefined;
        const transitionOffset = crouch?.transitionAnchorActive
            ? crouch.transitionOffset
            : undefined;
        const focusX = player.pos.x + (transitionOffset?.x ?? 0);
        const focusTop = player.bounds.top + (transitionOffset?.y ?? 0);
        const focusBottom = player.bounds.bottom + (transitionOffset?.y ?? 0);
        level.camera.pos.x = focusX - 100;

        const cameraTop = level.camera.pos.y + VERTICAL_CAMERA_TOP_MARGIN;
        const cameraBottom = level.camera.pos.y
            + level.camera.size.y
            - VERTICAL_CAMERA_BOTTOM_MARGIN;

        if (focusTop < cameraTop) {
            level.camera.pos.y = focusTop - VERTICAL_CAMERA_TOP_MARGIN;
        } else if (focusBottom > cameraBottom) {
            level.camera.pos.y = focusBottom
                - level.camera.size.y
                + VERTICAL_CAMERA_BOTTOM_MARGIN;
        }
    }

    level.camera.clampTo(level.size);
}

export default class Level extends Scene<Camera> {
    static readonly EVENT_TRIGGER = EVENT_TRIGGER;

    name = '';
    gravity = 1500;
    totalTime = 0;
    readonly dimensions = new Vec2(0, 0);
    readonly size = new Vec2(0, 0);
    readonly playerSpawn = new Vec2(0, 0);

    readonly camera = new Camera();
    readonly music = new MusicController();
    readonly entities = new Set<Entity>();
    readonly entityCollider = new EntityCollider(this.entities);
    readonly tileCollider = new TileCollider();

    setDimensions(widthInTiles: number, heightInTiles: number): void {
        this.dimensions.set(widthInTiles, heightInTiles);
        this.size.set(
            widthInTiles * TILE_SIZE,
            heightInTiles * TILE_SIZE,
        );
        this.camera.clampTo(this.size);
    }

    override draw(gameContext: GameContext): void {
        const {videoContext} = gameContext;
        videoContext.clearRect(
            0,
            0,
            LOGICAL_WIDTH,
            LOGICAL_HEIGHT,
        );
        this.comp.draw(gameContext.videoContext, this.camera);
    }

    override update(gameContext: GameContext): void {
        const entityCount = this.entities.size;

        gameContext.performanceMetrics.measure('update', () => {
            this.entities.forEach(entity => {
                entity.update(gameContext, this);
            });
        });

        let collisionCandidates = 0;
        let overlaps = 0;
        gameContext.performanceMetrics.measure('collision', () => {
            const result = this.entityCollider.check();
            collisionCandidates = result.candidateChecks;
            overlaps = result.overlaps;
        });

        gameContext.performanceMetrics.measure('finalization', () => {
            this.entities.forEach(entity => {
                entity.finalize();
            });
        });

        gameContext.performanceMetrics.measure('levelRemainder', () => {
            focusPlayer(this);
            this.totalTime += gameContext.deltaTime;
        });

        gameContext.performanceMetrics.recordEntityWork(
            entityCount,
            collisionCandidates,
            overlaps,
        );
    }

    override pause(): void {
        this.music.pause();
    }
}
