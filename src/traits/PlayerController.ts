import type Entity from '../Entity.js';
import type Level from '../Level.js';
import {Vec2} from '../math.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Killable from './Killable.js';

export default class PlayerController extends Trait {
    readonly checkpoint = new Vec2(0, 0);
    private player: Entity | null = null;

    setPlayer(entity: Entity): void {
        this.player = entity;
    }

    override update(
        _entity: Entity,
        _gameContext: GameContext,
        level: Level,
    ): void {
        if (!this.player) {
            throw new Error('Player controller has no player');
        }

        if (!level.entities.has(this.player)) {
            this.player.traits.get(Killable).revive();
            this.player.pos.copy(this.checkpoint);
            level.entities.add(this.player);
        }
    }
}
