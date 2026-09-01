import Entity from '../Entity.js';
import EntityCollider from '../EntityCollider.js';
import Jump from './Jump.js';
import Killable from './Killable.js';
import Physics from './Physics.js';
import Stomper, {
    SPELUNKY_STOMP_BASE_REBOUND_SPEED,
    SPELUNKY_STOMP_IMPACT_FACTOR,
    SPELUNKY_STOMP_REGION_DEPTH,
} from './Stomper.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function createStomper(y: number, velocityY: number): {
    entity: Entity;
    jump: Jump;
    stomper: Stomper;
} {
    const entity = new Entity();
    const jump = new Jump();
    const stomper = new Stomper();
    entity.size.set(14, 16);
    entity.pos.set(64, y);
    entity.vel.y = velocityY;
    entity.addTrait(new Physics());
    entity.addTrait(jump);
    entity.addTrait(stomper);
    return {entity, jump, stomper};
}

function createTarget(): Entity {
    const target = new Entity();
    target.size.set(16, 16);
    target.pos.set(64, 200);
    target.addTrait(new Killable());
    return target;
}

const {entity: mario, jump, stomper} = createStomper(192, 300);
const target = createTarget();
assertEqual(
    [stomper.bounceSpeed, stomper.impactFactor, stomper.stompRegionDepth],
    [
        SPELUNKY_STOMP_BASE_REBOUND_SPEED,
        SPELUNKY_STOMP_IMPACT_FACTOR,
        SPELUNKY_STOMP_REGION_DEPTH,
    ],
    'Named Spelunky stomp tuning',
);

let stompEvents = 0;
assertEqual(stomper.tryStomp(mario, target), true, 'Top downward contact qualifies');
assertEqual(stomper.tryStomp(mario, target), true, 'Duplicate callback remains eligible');
mario.events.process(Stomper.EVENT_STOMP, () => {
    stompEvents++;
});
assertEqual(stompEvents, 1, 'Duplicate collision callbacks emit one stomp');
mario.finalize();
assertEqual(
    [
        mario.bounds.bottom,
        mario.vel.y,
        jump.phase,
        mario.traits.get(Physics).grounded,
    ],
    [
        target.bounds.top,
        -stomper.reboundSpeedFor(300),
        'rising',
        false,
    ],
    'Stomp routes rebound through Jump state exactly once',
);

mario.pos.set(64, 192);
mario.vel.y = 120;
const secondTarget = createTarget();
assertEqual(stomper.tryStomp(mario, secondTarget), true, 'Later chained stomp qualifies');
mario.finalize();
assertEqual(
    mario.vel.y,
    -stomper.reboundSpeedFor(120),
    'Later chained stomp receives its own impact-scaled rebound',
);

const sideContact = createStomper(199, 300);
assertEqual(
    sideContact.stomper.tryStomp(sideContact.entity, createTarget()),
    false,
    'Deep side overlap does not qualify as a stomp',
);

const risingContact = createStomper(192, -20);
assertEqual(
    risingContact.stomper.tryStomp(risingContact.entity, createTarget()),
    false,
    'Rising top contact does not qualify as a stomp',
);

const nonKillable = new Entity();
nonKillable.size.set(64, 64);
new EntityCollider(new Set([mario, nonKillable])).check();

console.log('Spelunky stomp geometry and Jump rebound integration passed');
