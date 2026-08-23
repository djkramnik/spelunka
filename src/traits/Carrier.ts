import type Entity from '../Entity.js';
import type Level from '../Level.js';
import type {GameContext} from '../Scene.js';
import Trait from '../Trait.js';
import Go from './Go.js';
import Pickable from './Pickable.js';

export default class Carrier extends Trait {
    private readonly candidates = new Set<Entity>();
    carried: Entity | null = null;

    private getCarryDirection(carrier: Entity): number {
        if (!carrier.traits.has(Go)) {
            return 1;
        }

        return carrier.traits.get(Go).heading < 0 ? -1 : 1;
    }

    override collides(_carrier: Entity, candidate: Entity): void {
        if (!candidate.traits.has(Pickable)) {
            return;
        }

        const pickable = candidate.traits.get(Pickable);
        if (pickable.carrier === null) {
            this.candidates.add(candidate);
        }
    }

    pickup(carrier: Entity): Entity | null {
        if (this.carried !== null) {
            return this.carried;
        }

        for (const candidate of this.candidates) {
            const pickable = candidate.traits.get(Pickable);
            if (pickable.attach(
                candidate,
                carrier,
                this.getCarryDirection(carrier),
            )) {
                this.carried = candidate;
                this.candidates.clear();
                return candidate;
            }
        }

        return null;
    }

    override update(
        carrier: Entity,
        _gameContext: GameContext,
        _level: Level,
    ): void {
        this.candidates.clear();
        if (this.carried !== null) {
            this.carried.traits.get(Pickable).followCarrier(
                this.carried,
                this.getCarryDirection(carrier),
            );
        }
    }
}
