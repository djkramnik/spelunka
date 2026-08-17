import type Entity from '../Entity.js';
import {EventKey} from '../EventEmitter.js';
import Trait from '../Trait.js';
import Killable from './Killable.js';

const EVENT_STOMP = new EventKey<[us: Entity, them: Entity]>('stomp');

export default class Stomper extends Trait {
    static readonly EVENT_STOMP = EVENT_STOMP;

    bounceSpeed = 400;

    bounce(us: Entity, them: Entity): void {
        us.bounds.bottom = them.bounds.top;
        us.vel.y = -this.bounceSpeed;
    }

    override collides(us: Entity, them: Entity): void {
        if (!them.traits.has(Killable)) {
            return;
        }

        const killable = them.traits.get(Killable);
        if (killable.dead) {
            return;
        }

        if (us.vel.y > them.vel.y) {
            this.queue(() => this.bounce(us, them));
            us.sounds.add('stomp');
            us.events.emit(Stomper.EVENT_STOMP, us, them);
        }
    }
}
