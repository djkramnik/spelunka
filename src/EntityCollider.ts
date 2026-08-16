import BoundingBox from './BoundingBox.js';

interface CollidableEntity<Entity> {
    bounds: BoundingBox;
    collides(candidate: Entity): void;
}

export default class EntityCollider<
    Entity extends CollidableEntity<Entity>,
> {
    constructor(private readonly entities: Set<Entity>) {}

    check(subject: Entity): number {
        let overlaps = 0;
        this.entities.forEach(candidate => {
            if (subject !== candidate && subject.bounds.overlaps(candidate.bounds)) {
                overlaps++;
                subject.collides(candidate);
            }
        });
        return overlaps;
    }
}
