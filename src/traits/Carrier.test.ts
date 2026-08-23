import Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Carrier from './Carrier.js';
import Go from './Go.js';
import Pickable from './Pickable.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const gameContext = {} as GameContext;
const level = {} as Level;

function createCarrier(movement?: Go): [Entity, Carrier] {
    const entity = new Entity();
    const carrier = new Carrier();
    if (movement) {
        entity.addTrait(movement);
    }
    entity.addTrait(carrier);
    return [entity, carrier];
}

function createPickable(): [Entity, Pickable] {
    const entity = new Entity();
    entity.size.set(16, 16);
    const pickable = new Pickable();
    entity.addTrait(pickable);
    return [entity, pickable];
}

const movement = new Go();
const [mario, carrier] = createCarrier(movement);
const [shell, pickable] = createPickable();
mario.pos.set(40, 80);
mario.zIndex = 3;
shell.pos.set(44, 80);
shell.vel.set(90, -120);

assertEqual(carrier.pickup(mario), null, 'Pickup without collision eligibility');

carrier.update(mario, gameContext, level);
carrier.collides(mario, shell);
assertEqual([shell.pos.x, shell.pos.y], [44, 80], 'Collision-only shell position');
assertEqual([shell.vel.x, shell.vel.y], [90, -120], 'Collision-only shell velocity');
assertEqual(pickable.carrier, null, 'Collision-only carrier state');

assertEqual(carrier.pickup(mario) === shell, true, 'Eligible shell pickup');
assertEqual(carrier.carried === shell, true, 'Carrier owns picked-up shell');
assertEqual(pickable.carrier === mario, true, 'Pickable records its carrier');
assertEqual([shell.pos.x, shell.pos.y], [48, 72], 'Immediate carry position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Pickup neutralizes velocity');
assertEqual(shell.zIndex, 4, 'Carried shell z-index');

const [otherShell, otherPickable] = createPickable();
otherShell.pos.set(40, 80);
carrier.collides(mario, otherShell);
assertEqual(carrier.pickup(mario) === shell, true, 'Repeated pickup retains shell');
assertEqual(otherPickable.carrier, null, 'Carrier cannot pick up a second item');

mario.pos.set(120, 160);
mario.zIndex = 9;
movement.heading = -1;
shell.pos.set(-500, -500);
shell.vel.set(300, 400);
carrier.update(mario, gameContext, level);
assertEqual([shell.pos.x, shell.pos.y], [112, 152], 'Left-facing position tracking');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Carrier-side velocity neutralization');
assertEqual(shell.zIndex, 10, 'Carrier-side z-index tracking');

shell.pos.set(-200, -200);
shell.vel.set(-300, -400);
pickable.finalize(shell);
assertEqual([shell.pos.x, shell.pos.y], [112, 152], 'Final left-facing carry position');
assertEqual([shell.vel.x, shell.vel.y], [0, 0], 'Final carry velocity neutralization');

movement.heading = 1;
carrier.update(mario, gameContext, level);
assertEqual([shell.pos.x, shell.pos.y], [128, 152], 'Return to right-facing position');

const [defaultCarrierEntity, defaultCarrier] = createCarrier();
const [defaultShell] = createPickable();
defaultCarrierEntity.pos.set(20, 30);
defaultCarrier.update(defaultCarrierEntity, gameContext, level);
defaultCarrier.collides(defaultCarrierEntity, defaultShell);
defaultCarrier.pickup(defaultCarrierEntity);
assertEqual(
    [defaultShell.pos.x, defaultShell.pos.y],
    [28, 22],
    'Carrier without movement defaults to right-facing offset',
);

const [separateMario, separateCarrier] = createCarrier();
const [separatedShell] = createPickable();
separateCarrier.update(separateMario, gameContext, level);
separateCarrier.collides(separateMario, separatedShell);
separateCarrier.update(separateMario, gameContext, level);
assertEqual(
    separateCarrier.pickup(separateMario),
    null,
    'Leaving collision expires pickup eligibility',
);

console.log('Pickup and carrying regression passed');
