import Trait from '../Trait.js';

export type ClimbableKind = 'ladder' | 'rope';

/** Marks an entity's active bounds as a climbable vertical column. */
export default class Climbable extends Trait {
    active = true;

    constructor(readonly kind: ClimbableKind = 'ladder') {
        super();
    }
}
