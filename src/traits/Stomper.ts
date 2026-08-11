import type Entity from '../Entity.js';
import Trait from '../Trait.js';
import Killable from './Killable.js';

const EVENT_STOMP: unique symbol = Symbol('stomp');

export default class Stomper extends Trait {
    static readonly EVENT_STOMP = EVENT_STOMP;

    bounceSpeed = 400;

    bounce(us: Entity, them: Entity): void {
        us.bounds.bottom = them.bounds.top;
        us.vel.y = -this.bounceSpeed;
    }

    collides(us: Entity, them: Entity): void {
        const killable = them.traits.get(Killable);
        if (!killable || killable.dead) {
            return;
        }

        if (us.vel.y > them.vel.y) {
            this.queue(() => this.bounce(us, them));
            us.sounds.add('stomp');
            us.events.emit(Stomper.EVENT_STOMP, us, them);
        }
    }
}
