import BoundingBox from './BoundingBox.js';

interface CollidableEntity<Entity> {
    bounds: BoundingBox;
    collides(candidate: Entity): void;
}

export default class EntityCollider<
    Entity extends CollidableEntity<Entity>,
> {
    constructor(private readonly entities: Set<Entity>) {}

    check(subject: Entity): void {
        this.entities.forEach(candidate => {
            if (subject !== candidate && subject.bounds.overlaps(candidate.bounds)) {
                subject.collides(candidate);
            }
        });
    }
}
