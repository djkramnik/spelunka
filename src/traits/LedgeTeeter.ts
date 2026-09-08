import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Carrier from './Carrier.js';
import Crouch from './Crouch.js';
import Go from './Go.js';
import Killable from './Killable.js';
import LadderClimb from './LadderClimb.js';
import LedgeHang from './LedgeHang.js';
import Physics from './Physics.js';
import PlayerDeath from './PlayerDeath.js';
import PlayerHit from './PlayerHit.js';

const SUPPORT_PROBE_INSET = 0.01;

export default class LedgeTeeter extends Trait {
    active = false;
    side: -1 | 0 | 1 = 0;

    private clear(): void {
        this.active = false;
        this.side = 0;
    }

    override update(
        entity: Entity,
        _gameContext: GameContext,
        level: Level,
    ): void {
        const physics = entity.traits.get(Physics);
        const go = entity.traits.get(Go);
        const crouch = entity.traits.get(Crouch);
        const ledgeHang = entity.traits.get(LedgeHang);
        const ladderClimb = entity.traits.get(LadderClimb);
        const killable = entity.traits.get(Killable);
        const playerDeath = entity.traits.get(PlayerDeath);
        const playerHit = entity.traits.get(PlayerHit);

        if (!physics.grounded
            || entity.vel.x !== 0
            || entity.vel.y !== 0
            || go.dir !== 0
            || crouch.phase !== 'standing'
            || ledgeHang.active
            || ladderClimb.active
            || killable.dead
            || playerDeath.terminal
            || playerHit.active
            || physics.groundSupportWidth === null) {
            this.clear();
            return;
        }

        const direction: -1 | 1 = go.heading < 0 ? -1 : 1;
        const supportInset = Math.max(
            0,
            (entity.size.x - physics.groundSupportWidth) / 2,
        );
        const trailingEdgeX = direction > 0
            ? entity.bounds.left + supportInset + SUPPORT_PROBE_INSET
            : entity.bounds.right - supportInset - SUPPORT_PROBE_INSET;
        const floorY = entity.bounds.bottom + SUPPORT_PROBE_INSET;
        const finalMarginX = trailingEdgeX + direction * supportInset;

        if (!level.tileCollider.hasSupportAt(trailingEdgeX, floorY)
            || level.tileCollider.hasSupportAt(finalMarginX, floorY)) {
            this.clear();
            return;
        }

        this.active = true;
        this.side = direction;
        entity.traits.get(Carrier).drop(entity, level);
    }
}
