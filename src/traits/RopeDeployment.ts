import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import {TILE_SIZE} from '../TileResolver.js';
import Trait from '../Trait.js';
import Climbable from './Climbable.js';

export const ROPE_WIDTH = 8;
export const ROPE_TOSS_SIZE = 8;
export const ROPE_TOSS_UPWARD_SPEED = 12 * 30;
export const ROPE_TOSS_GRAVITY = 0.6 * 30 * 30;
export const ROPE_UNFURL_SPEED = 8 * 30;
export const ROPE_MAXIMUM_LENGTH = 8 * TILE_SIZE;
export const ROPE_BODY_SPACING = TILE_SIZE;
export const ROPE_END_FRAME_DURATION = 4 / 60;

const PROBE_STEP = TILE_SIZE / 2;
const POSITION_EPSILON = 1e-6;

export type RopeDeploymentPhase =
    | 'idle'
    | 'ascending'
    | 'unfurling'
    | 'deployed';

export default class RopeDeployment extends Trait {
    phase: RopeDeploymentPhase = 'idle';
    animationTime = 0;

    get launched(): boolean {
        return this.phase !== 'idle';
    }

    launch(rope: Entity, centerX: number, centerY: number): boolean {
        if (this.launched) {
            return false;
        }

        rope.pos.set(centerX - ROPE_WIDTH / 2, centerY - ROPE_TOSS_SIZE / 2);
        rope.size.set(ROPE_WIDTH, ROPE_TOSS_SIZE);
        rope.vel.set(0, -ROPE_TOSS_UPWARD_SPEED);
        rope.traits.get(Climbable).active = false;
        rope.sounds.add('rope-toss');
        this.phase = 'ascending';
        this.animationTime = 0;
        return true;
    }

    private findCeiling(
        rope: Entity,
        level: Level,
        nextTop: number,
    ): number | null {
        const centerX = (rope.bounds.left + rope.bounds.right) / 2;
        let probeY = rope.bounds.top;
        while (probeY > nextTop) {
            probeY = Math.max(nextTop, probeY - PROBE_STEP);
            const match = level.tileCollider.getSolidAt(centerX, probeY);
            if (match) {
                return match.y2;
            }
        }
        return null;
    }

    private findFloor(
        rope: Entity,
        level: Level,
        nextBottom: number,
    ): number | null {
        const centerX = (rope.bounds.left + rope.bounds.right) / 2;
        let probeY = rope.bounds.bottom + POSITION_EPSILON;
        while (probeY < nextBottom) {
            const match = level.tileCollider.getSolidAt(centerX, probeY);
            if (match) {
                return match.y1;
            }
            probeY = Math.min(nextBottom, probeY + PROBE_STEP);
        }
        const finalMatch = level.tileCollider.getSolidAt(centerX, nextBottom);
        return finalMatch?.y1 ?? null;
    }

    private settle(rope: Entity): void {
        rope.vel.set(0, 0);
        rope.size.y = 0;
        rope.traits.get(Climbable).active = true;
        rope.sounds.add('rope-catch');
        this.phase = 'unfurling';
        this.animationTime = 0;
    }

    private unfurl(rope: Entity, level: Level, deltaTime: number): void {
        if (deltaTime <= 0 || this.phase !== 'unfurling') {
            return;
        }
        this.animationTime += deltaTime;
        const desiredHeight = Math.min(
            ROPE_MAXIMUM_LENGTH,
            rope.size.y + ROPE_UNFURL_SPEED * deltaTime,
        );
        const desiredBottom = rope.bounds.top + desiredHeight;
        const floor = this.findFloor(rope, level, desiredBottom);
        rope.size.y = Math.max(
            0,
            (floor ?? desiredBottom) - rope.bounds.top,
        );
        if (floor !== null
            || rope.size.y >= ROPE_MAXIMUM_LENGTH - POSITION_EPSILON) {
            this.phase = 'deployed';
        }
    }

    override update(
        rope: Entity,
        {deltaTime}: GameContext,
        level: Level,
    ): void {
        if (this.phase === 'idle' || this.phase === 'deployed') {
            return;
        }
        if (this.phase === 'unfurling') {
            this.unfurl(rope, level, deltaTime);
            return;
        }

        const timeToApex = -rope.vel.y / ROPE_TOSS_GRAVITY;
        const ascendingTime = Math.min(deltaTime, timeToApex);
        const nextTop = rope.pos.y
            + rope.vel.y * ascendingTime
            + ROPE_TOSS_GRAVITY * ascendingTime * ascendingTime / 2;
        const ceiling = this.findCeiling(rope, level, Math.max(0, nextTop));
        if (ceiling !== null) {
            rope.pos.y = ceiling;
            this.settle(rope);
            return;
        }

        rope.pos.y = Math.max(0, nextTop);
        rope.vel.y += ROPE_TOSS_GRAVITY * ascendingTime;
        if (rope.pos.y <= 0 || timeToApex <= deltaTime) {
            const remainingTime = Math.max(0, deltaTime - ascendingTime);
            this.settle(rope);
            this.unfurl(rope, level, remainingTime);
        }
    }
}
