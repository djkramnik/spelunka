import Trait from '../Trait.js';
import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';

export const SPELUNKY_STARTING_HEARTS = 4;
export const SPELUNKY_MAX_HEARTS = 99;

function assertHeartAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new Error(`Invalid heart amount: ${amount}`);
    }
}

function assertDuration(duration: number): void {
    if (!Number.isFinite(duration) || duration < 0) {
        throw new Error(`Invalid invulnerability duration: ${duration}`);
    }
}

export default class Health extends Trait {
    private value: number;
    private protectionTime = 0;
    private protectionDuration = 0;

    constructor(
        initialHearts = SPELUNKY_STARTING_HEARTS,
        readonly maximum = SPELUNKY_MAX_HEARTS,
    ) {
        super();
        assertHeartAmount(maximum);
        assertHeartAmount(initialHearts);
        if (initialHearts > maximum) {
            throw new Error(
                `Initial hearts ${initialHearts} exceed maximum ${maximum}`,
            );
        }
        this.value = initialHearts;
    }

    get hearts(): number {
        return this.value;
    }

    get depleted(): boolean {
        return this.value === 0;
    }

    get invulnerable(): boolean {
        return this.protectionTime > 0;
    }

    get invulnerabilityTime(): number {
        return this.protectionTime;
    }

    get invulnerabilityElapsed(): number {
        return this.invulnerable
            ? this.protectionDuration - this.protectionTime
            : 0;
    }

    damage(amount = 1): number {
        assertHeartAmount(amount);
        this.value = Math.max(0, this.value - amount);
        return this.value;
    }

    takeDamage(amount = 1, invulnerabilityDuration = 0): boolean {
        assertHeartAmount(amount);
        assertDuration(invulnerabilityDuration);
        if (amount === 0 || this.depleted || this.invulnerable) {
            return false;
        }

        this.damage(amount);
        this.protectionTime = invulnerabilityDuration;
        this.protectionDuration = invulnerabilityDuration;
        return true;
    }

    heal(amount = 1): number {
        assertHeartAmount(amount);
        this.value = Math.min(this.maximum, this.value + amount);
        return this.value;
    }

    override update(
        _entity: Entity,
        {deltaTime}: GameContext,
        _level: Level,
    ): void {
        this.protectionTime = Math.max(0, this.protectionTime - deltaTime);
    }
}
