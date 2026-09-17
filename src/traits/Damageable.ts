import Trait from '../Trait.js';

export interface DamageImpact {
    readonly velocityX: number;
    readonly velocityY: number;
}

function assertDamageAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(`Invalid damage amount: ${amount}`);
    }
}

/**
 * Shared multi-hit enemy damage state. Attack sources only submit damage and
 * knockback; the owning enemy behavior consumes the accepted impact and owns
 * its stun, recovery, death, animation, and sound rules.
 */
export default class Damageable extends Trait {
    private value: number;
    private pendingImpact: DamageImpact | null = null;
    stunned = false;

    constructor(readonly maximum: number) {
        super();
        assertDamageAmount(maximum);
        this.value = maximum;
    }

    get hitPoints(): number {
        return this.value;
    }

    get depleted(): boolean {
        return this.value === 0;
    }

    hit(amount: number, impact: DamageImpact): boolean {
        assertDamageAmount(amount);
        if (this.stunned || this.depleted) {
            return false;
        }

        this.value = Math.max(0, this.value - amount);
        this.pendingImpact = impact;
        this.stunned = true;
        return true;
    }

    consumeImpact(): DamageImpact | null {
        const impact = this.pendingImpact;
        this.pendingImpact = null;
        return impact;
    }

    recover(): boolean {
        if (this.depleted) {
            return false;
        }
        this.stunned = false;
        return true;
    }
}
