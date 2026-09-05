import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import AttackAnimation from './AttackAnimation.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const entity = new Entity();
const level = new Level();
const attack = new AttackAnimation(0.4, 0.25);
entity.addTrait(attack);

assertEqual(
    [attack.active, attack.time, attack.duration, attack.impactTime],
    [false, 0.4, 0.4, 0.25],
    'A reusable attack presentation starts inactive with explicit timing',
);

attack.start();
assertEqual([attack.active, attack.time], [true, 0], 'Starting begins at frame time zero');
assertEqual(attack.consumeImpact(), false, 'A configured wind-up has no immediate impact');

attack.update(entity, {deltaTime: 0.15} as GameContext, level);
assertEqual([attack.active, attack.time], [true, 0.15], 'Attack time advances by elapsed seconds');
assertEqual(attack.consumeImpact(), false, 'Impact remains unavailable during wind-up');

attack.start();
assertEqual(attack.time, 0, 'Starting an active presentation restarts it deterministically');

attack.update(entity, {deltaTime: 0.25} as GameContext, level);
assertEqual(attack.consumeImpact(), true, 'Crossing the configured time exposes one impact');
assertEqual(attack.consumeImpact(), false, 'An impact can be consumed only once');

attack.update(entity, {deltaTime: 0.15} as GameContext, level);
assertEqual(
    [attack.active, attack.time],
    [false, 0.4],
    'The presentation ends exactly at its configured duration',
);

for (const invalid of [0, -1, Number.NaN]) {
    let threw = false;
    try {
        new AttackAnimation(invalid);
    } catch {
        threw = true;
    }
    assertEqual(threw, true, `Attack presentation rejects duration ${String(invalid)}`);
}

for (const invalid of [-1, 0.5, Number.NaN]) {
    let threw = false;
    try {
        new AttackAnimation(0.4, invalid);
    } catch {
        threw = true;
    }
    assertEqual(threw, true, `Attack presentation rejects impact ${String(invalid)}`);
}

console.log('Reusable attack animation timing regression passed');
