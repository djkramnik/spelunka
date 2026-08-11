import Entity from '../Entity.js';
import type Level from '../Level.js';
import {loadSpriteSheet} from '../loaders/sprite.js';
import type {GameContext} from '../Scene.js';
import SpriteSheet from '../SpriteSheet.js';
import Trait from '../Trait.js';
import Killable from '../traits/Killable.js';
import PendulumMove from '../traits/PendulumMove.js';
import Physics from '../traits/Physics.js';
import Solid from '../traits/Solid.js';
import Stomper from '../traits/Stomper.js';

const STATE_WALKING: unique symbol = Symbol('walking');
const STATE_HIDING: unique symbol = Symbol('hiding');
const STATE_PANIC: unique symbol = Symbol('panic');

type KoopaState =
    | typeof STATE_WALKING
    | typeof STATE_HIDING
    | typeof STATE_PANIC;

export type KoopaFactory = () => Entity;

export async function loadKoopa(): Promise<KoopaFactory> {
    const sprite = await loadSpriteSheet('koopa');
    return createKoopaFactory(sprite);
}

class Behavior extends Trait {
    hideTime = 0;
    hideDuration = 5;
    walkSpeed: number | null = null;
    panicSpeed = 300;
    state: KoopaState = STATE_WALKING;

    override collides(us: Entity, them: Entity): void {
        if (us.traits.get(Killable).dead) {
            return;
        }

        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                this.handleStomp(us, them);
            } else {
                this.handleNudge(us, them);
            }
        }
    }

    private handleNudge(us: Entity, them: Entity): void {
        if (this.state === STATE_WALKING) {
            them.traits.get(Killable).kill();
        } else if (this.state === STATE_HIDING) {
            this.panic(us, them);
        } else if (this.state === STATE_PANIC) {
            const travelDirection = Math.sign(us.vel.x);
            const impactDirection = Math.sign(us.pos.x - them.pos.x);
            if (travelDirection !== 0 && travelDirection !== impactDirection) {
                them.traits.get(Killable).kill();
            }
        }
    }

    private handleStomp(us: Entity, _them: Entity): void {
        if (this.state === STATE_WALKING) {
            this.hide(us);
        } else if (this.state === STATE_HIDING) {
            us.traits.get(Killable).kill();
            us.vel.set(100, -200);
            us.traits.get(Solid).obstructs = false;
        } else if (this.state === STATE_PANIC) {
            this.hide(us);
        }
    }

    private hide(us: Entity): void {
        const movement = us.traits.get(PendulumMove);
        us.vel.x = 0;
        movement.enabled = false;
        if (this.walkSpeed === null) {
            this.walkSpeed = movement.speed;
        }
        this.hideTime = 0;
        this.state = STATE_HIDING;
    }

    private unhide(us: Entity): void {
        if (this.walkSpeed === null) {
            throw new Error('Koopa walk speed was not captured before waking');
        }

        const movement = us.traits.get(PendulumMove);
        movement.enabled = true;
        movement.speed = this.walkSpeed;
        this.state = STATE_WALKING;
    }

    private panic(us: Entity, them: Entity): void {
        const movement = us.traits.get(PendulumMove);
        movement.enabled = true;
        movement.speed = this.panicSpeed * Math.sign(them.vel.x);
        this.state = STATE_PANIC;
    }

    override update(us: Entity, gameContext: GameContext, _level: Level): void {
        if (this.state === STATE_HIDING) {
            this.hideTime += gameContext.deltaTime;
            if (this.hideTime > this.hideDuration) {
                this.unhide(us);
            }
        }
    }
}

function createKoopaFactory(sprite: SpriteSheet): KoopaFactory {
    const walkAnimation = sprite.getAnimation('walk');
    const wakeAnimation = sprite.getAnimation('wake');

    function routeAnimation(koopa: Entity): string {
        const behavior = koopa.traits.get(Behavior);

        if (behavior.state === STATE_HIDING) {
            if (behavior.hideTime > 3) {
                return wakeAnimation(behavior.hideTime);
            }
            return 'hiding';
        }

        if (behavior.state === STATE_PANIC) {
            return 'hiding';
        }

        return walkAnimation(koopa.lifetime);
    }

    function drawKoopa(
        this: Entity,
        context: CanvasRenderingContext2D,
    ): void {
        sprite.draw(routeAnimation(this), context, 0, 0, this.vel.x < 0);
    }

    return function createKoopa(): Entity {
        const koopa = new Entity();
        koopa.size.set(16, 16);
        koopa.offset.y = 8;

        koopa.addTrait(new Physics());
        koopa.addTrait(new Solid());
        koopa.addTrait(new PendulumMove());
        koopa.addTrait(new Killable());
        koopa.addTrait(new Behavior());
        koopa.draw = drawKoopa;

        return koopa;
    };
}
