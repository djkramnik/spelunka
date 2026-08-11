import type Entity from '../Entity.js';
import type Level from '../Level.js';
import {Vec2} from '../math.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';

type PlayerEntity = Entity & {
    killable: {
        revive(): void;
    };
};

export default class PlayerController extends Trait {
    readonly checkpoint = new Vec2(0, 0);
    private player: PlayerEntity | null = null;

    setPlayer(entity: PlayerEntity): void {
        this.player = entity;
    }

    update(_entity: Entity, _gameContext: GameContext, level: Level): void {
        if (!this.player) {
            throw new Error('Player controller has no player');
        }

        if (!level.entities.has(this.player)) {
            this.player.killable.revive();
            this.player.pos.copy(this.checkpoint);
            level.entities.add(this.player);
        }
    }
}
