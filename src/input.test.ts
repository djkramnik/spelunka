import Entity from './Entity.js';
import {setupKeyboard} from './input.js';
import type {KeyState} from './KeyboardState.js';
import type Level from './Level.js';
import type {GameContext} from './Scene.js';
import Carrier from './traits/Carrier.js';
import Go from './traits/Go.js';
import Jump from './traits/Jump.js';
import Pickable from './traits/Pickable.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

type EventType = 'keydown' | 'keyup';
type KeyboardReceiver = Entity & {
    pickupOrThrow(): Entity | null;
    turbo(state: KeyState): void;
};

const listeners = new Map<EventType, (event: KeyboardEvent) => void>();
const target = {
    addEventListener: (
        type: EventType,
        listener: (event: KeyboardEvent) => void,
    ): void => {
        listeners.set(type, listener);
    },
} as unknown as Window;

function dispatch(type: EventType, code: string): boolean {
    const listener = listeners.get(type);
    if (!listener) {
        throw new Error(`Missing ${type} listener`);
    }

    let defaultPrevented = false;
    listener({
        type,
        code,
        preventDefault: (): void => {
            defaultPrevented = true;
        },
    } as KeyboardEvent);
    return defaultPrevented;
}

const receiver = new Entity() as KeyboardReceiver;
const carrier = new Carrier();
const jump = new Jump();
const go = new Go();
receiver.addTrait(carrier);
receiver.addTrait(jump);
receiver.addTrait(go);

let pickupOrThrowCalls = 0;
const turboStates: KeyState[] = [];
receiver.pickupOrThrow = (): Entity | null => {
    pickupOrThrowCalls++;
    return carrier.pickupOrThrow(receiver);
};
receiver.turbo = (state: KeyState): void => {
    turboStates.push(state);
};

const router = setupKeyboard(target);
router.addReceiver(receiver);

assertEqual(dispatch('keyup', 'KeyD'), true, 'D release prevents browser default');
assertEqual(pickupOrThrowCalls, 0, 'D release does not invoke hand action');

assertEqual(dispatch('keydown', 'KeyD'), true, 'D press prevents browser default');
assertEqual(pickupOrThrowCalls, 1, 'D press invokes pickup-or-throw');
assertEqual(carrier.carried, null, 'D press without candidate has no effect');

dispatch('keydown', 'KeyD');
assertEqual(pickupOrThrowCalls, 1, 'Held D does not repeat hand action');
dispatch('keyup', 'KeyD');
assertEqual(pickupOrThrowCalls, 1, 'D release remains a no-op');

const shell = new Entity();
shell.addTrait(new Pickable());
carrier.update(receiver, {} as GameContext, {} as Level);
carrier.collides(receiver, shell);
dispatch('keydown', 'KeyD');
assertEqual(pickupOrThrowCalls, 2, 'D press invokes eligible pickup');
assertEqual(carrier.carried === shell, true, 'D press picks up eligible shell');

dispatch('keydown', 'KeyD');
assertEqual(pickupOrThrowCalls, 2, 'Held D after pickup does not repeat');
dispatch('keyup', 'KeyD');
assertEqual(carrier.carried === shell, true, 'D release does not drop shell');
receiver.vel.x = 30;
dispatch('keydown', 'KeyD');
assertEqual(pickupOrThrowCalls, 3, 'Later D press invokes throw action');
assertEqual(carrier.carried, null, 'Later D press releases carried shell');
assertEqual(
    shell.traits.get(Pickable).carrier,
    null,
    'D throw clears shell carrier',
);
assertEqual(
    [shell.vel.x, shell.vel.y],
    [30 + shell.traits.get(Pickable).throwVelocity.x,
        shell.traits.get(Pickable).throwVelocity.y],
    'D throw assigns launch velocity',
);

dispatch('keydown', 'KeyZ');
assertEqual(jump.requestTime, jump.gracePeriod, 'Z press still starts jump request');
dispatch('keyup', 'KeyZ');
assertEqual(jump.requestTime, 0, 'Z release still cancels jump request');

dispatch('keydown', 'KeyX');
dispatch('keyup', 'KeyX');
assertEqual(turboStates, [1, 0], 'X turbo mapping remains unchanged');

dispatch('keydown', 'ArrowRight');
assertEqual(go.dir, 1, 'Right press remains unchanged');
dispatch('keyup', 'ArrowRight');
assertEqual(go.dir, 0, 'Right release remains unchanged');
dispatch('keydown', 'ArrowLeft');
assertEqual(go.dir, -1, 'Left press remains unchanged');
dispatch('keyup', 'ArrowLeft');
assertEqual(go.dir, 0, 'Left release remains unchanged');

console.log('Keyboard pickup and throw input regression passed');
