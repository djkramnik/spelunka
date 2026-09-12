import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import {TILE_SIZE} from '../TileResolver.js';
import Trait from '../Trait.js';
import Killable from './Killable.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';
import RopeDeployment from './RopeDeployment.js';
import Whip from './Whip.js';

export const SPELUNKY_STARTING_ROPES = 4;
const HEAD_CLEARANCE_PROBE = 0.5;

export default class RopeDeployer extends Trait {
    ropes = SPELUNKY_STARTING_ROPES;
    private deployRequested = false;

    requestDeploy(): boolean {
        if (this.deployRequested || this.ropes <= 0) {
            return false;
        }
        this.deployRequested = true;
        return true;
    }

    private isAvailable(entity: Entity): boolean {
        return !entity.traits.get(Killable).dead
            && !entity.traits.get(PlayerDeath).terminal
            && !entity.traits.get(PlayerHit).active
            && !entity.traits.get(Whip).active;
    }

    deploy(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): Entity | null {
        if (this.ropes <= 0 || !this.isAvailable(entity)) {
            return null;
        }

        const centerX = (entity.bounds.left + entity.bounds.right) / 2;
        if (level.tileCollider.hasSolidAt(
            centerX,
            entity.bounds.top - HEAD_CLEARANCE_PROBE,
        )) {
            return null;
        }

        const createRope = gameContext.entityFactory['rope'];
        if (!createRope) {
            throw new Error('Rope entity factory is not registered');
        }
        const rope = createRope();
        if (!rope.traits.has(RopeDeployment)) {
            throw new Error('Rope entity is missing RopeDeployment');
        }

        const alignedCenterX = Math.floor(centerX / TILE_SIZE) * TILE_SIZE
            + TILE_SIZE / 2;
        const centerY = (entity.bounds.top + entity.bounds.bottom) / 2;
        if (!rope.traits.get(RopeDeployment).launch(
            rope,
            alignedCenterX,
            centerY,
        )) {
            return null;
        }
        this.ropes--;
        level.entities.add(rope);
        return rope;
    }

    override update(
        entity: Entity,
        gameContext: GameContext,
        level: Level,
    ): void {
        if (!this.deployRequested) {
            return;
        }
        this.deployRequested = false;
        this.deploy(entity, gameContext, level);
    }
}
