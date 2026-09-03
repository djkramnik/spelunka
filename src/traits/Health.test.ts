import Entity from '../Entity.js';
import Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Health, {
    SPELUNKY_MAX_HEARTS,
    SPELUNKY_STARTING_HEARTS,
} from './Health.js';

function assertEqual<Value>(
    actual: Value,
    expected: Value,
    message: string,
): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

const health = new Health();
assertEqual(
    [health.hearts, health.maximum, health.depleted],
    [SPELUNKY_STARTING_HEARTS, SPELUNKY_MAX_HEARTS, false],
    'Spelunky player starts with four of at most 99 hearts',
);
assertEqual(health.damage(), 3, 'Default damage removes one heart');
assertEqual(health.damage(2), 1, 'Explicit damage removes the requested hearts');
assertEqual(health.damage(50), 0, 'Damage clamps at zero');
assertEqual(health.depleted, true, 'Zero hearts is exposed explicitly');
assertEqual(health.heal(3), 3, 'Healing restores hearts');
assertEqual(health.heal(500), SPELUNKY_MAX_HEARTS, 'Healing clamps at 99');
assertEqual(health.hearts, SPELUNKY_MAX_HEARTS, 'Clamped health is authoritative');

const protectedHealth = new Health();
assertEqual(
    protectedHealth.takeDamage(1, 1),
    true,
    'A gameplay damage event is accepted while vulnerable',
);
assertEqual(
    [protectedHealth.hearts, protectedHealth.invulnerable],
    [3, true],
    'Accepted damage starts its requested protection window',
);
assertEqual(
    protectedHealth.takeDamage(1, 1),
    false,
    'Overlapping damage is rejected during protection',
);
assertEqual(protectedHealth.hearts, 3, 'Rejected damage leaves hearts unchanged');

const healthEntity = new Entity();
const level = new Level();
protectedHealth.update(
    healthEntity,
    {deltaTime: 0.4} as GameContext,
    level,
);
assertEqual(
    protectedHealth.invulnerabilityTime,
    0.6,
    'Protection counts down in elapsed seconds',
);
protectedHealth.update(
    healthEntity,
    {deltaTime: 0.6} as GameContext,
    level,
);
assertEqual(
    [protectedHealth.invulnerabilityTime, protectedHealth.invulnerable],
    [0, false],
    'Protection expires without underflow',
);
assertEqual(
    protectedHealth.takeDamage(1, 1),
    true,
    'Damage is accepted again after protection expires',
);

for (const invalid of [-1, 0.5, Number.NaN]) {
    let threw = false;
    try {
        health.damage(invalid);
    } catch {
        threw = true;
    }
    assertEqual(threw, true, `Damage rejects invalid amount ${String(invalid)}`);
}

for (const invalid of [-1, Number.NaN]) {
    let threw = false;
    try {
        protectedHealth.takeDamage(1, invalid);
    } catch {
        threw = true;
    }
    assertEqual(
        threw,
        true,
        `Gameplay damage rejects invalid protection ${String(invalid)}`,
    );
}

console.log('Spelunky heart tracking and boundary regression passed');
