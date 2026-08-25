import Entity from '../Entity.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Killable from '../traits/Killable.js';
import Physics from '../traits/Physics.js';
import Pickable from '../traits/Pickable.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

const DEFAULT_DANGEROUS_HORIZONTAL_SPEED = 240;
const DEFAULT_STOMP_DOWNWARD_SPEED = 200;
const DEFAULT_STOMP_REGION_DEPTH = 8;
const DEFAULT_FLOOR_FRICTION = 0.3;
const DEFAULT_HORIZONTAL_SETTLE_SPEED = 6;
const DEFAULT_VERTICAL_SETTLE_SPEED = 60;

export class RedShellBehavior extends Trait {
    dangerousHorizontalSpeed = DEFAULT_DANGEROUS_HORIZONTAL_SPEED;
    stompDownwardSpeed = DEFAULT_STOMP_DOWNWARD_SPEED;
    stompRegionDepth = DEFAULT_STOMP_REGION_DEPTH;

    private isTopContact(shell: Entity, candidate: Entity): boolean {
        const overlapDepth = candidate.bounds.bottom - shell.bounds.top;
        return candidate.bounds.top < shell.bounds.top
            && overlapDepth > 0
            && overlapDepth <= this.stompRegionDepth;
    }

    private isFallingOnto(shell: Entity, candidate: Entity): boolean {
        const overlapDepth = shell.bounds.bottom - candidate.bounds.top;
        return shell.vel.y > candidate.vel.y
            && shell.bounds.top < candidate.bounds.top
            && overlapDepth > 0
            && overlapDepth <= this.stompRegionDepth;
    }

    override collides(shell: Entity, candidate: Entity): void {
        if (!candidate.traits.has(Killable)) {
            return;
        }

        const pickable = shell.traits.get(Pickable);
        if (pickable.carrier !== null
            || pickable.isThrowerProtected(shell, candidate)) {
            return;
        }

        if (candidate.traits.has(Stomper)
            && this.isTopContact(shell, candidate)
            && candidate.traits.get(Stomper).tryStomp(candidate, shell)) {
            this.queue(() => {
                shell.vel.x = 0;
                shell.vel.y = this.stompDownwardSpeed;
            });
            return;
        }

        if (this.isFallingOnto(shell, candidate)) {
            candidate.traits.get(Killable).kill();
            return;
        }

        if (Math.abs(shell.vel.x) >= this.dangerousHorizontalSpeed) {
            candidate.traits.get(Killable).kill();
        }
    }
}

export type RedShellFactory = () => Entity;

export async function loadRedShell(): Promise<RedShellFactory> {
    const sprite = await loadSpriteSheet('red-shell');
    return createRedShellFactory(sprite);
}

export function createRedShellFactory(
    sprite: SpriteSheet,
): RedShellFactory {
    return function createRedShell(): Entity {
        const redShell = new Entity();
        const solid = new Solid();
        solid.wallRebound = 0.5;
        solid.floorRebound = 0.5;
        solid.ceilingRebound = 0.8;
        solid.floorFriction = DEFAULT_FLOOR_FRICTION;
        solid.horizontalSettleSpeed = DEFAULT_HORIZONTAL_SETTLE_SPEED;
        solid.verticalSettleSpeed = DEFAULT_VERTICAL_SETTLE_SPEED;

        redShell.size.set(16, 16);
        redShell.offset.y = 8;
        redShell.addTrait(new Pickable());
        redShell.addTrait(new Physics());
        redShell.addTrait(solid);
        redShell.addTrait(new RedShellBehavior());
        redShell.draw = context => sprite.drawFrame(
            'idle',
            context,
            redShell.size.x / 2,
            redShell.size.y,
        );

        return redShell;
    };
}
