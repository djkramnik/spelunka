import BoundingBox from './BoundingBox.js';

interface CollidableEntity<Entity> {
    bounds: BoundingBox;
    collides(candidate: Entity): void;
}

export interface EntityCollisionResult {
    candidateChecks: number;
    overlaps: number;
}

export default class EntityCollider<
    Entity extends CollidableEntity<Entity>,
> {
    private readonly sortedEntities: Entity[] = [];

    constructor(private readonly entities: ReadonlySet<Entity>) {}

    check(): EntityCollisionResult {
        this.sortedEntities.length = 0;
        this.entities.forEach(entity => this.sortedEntities.push(entity));
        this.sortedEntities.sort((a, b) => a.bounds.left - b.bounds.left);

        let candidateChecks = 0;
        let overlaps = 0;

        for (let subjectIndex = 0;
            subjectIndex < this.sortedEntities.length;
            subjectIndex++) {
            const subject = this.sortedEntities[subjectIndex];
            if (!subject) {
                continue;
            }

            const subjectRight = subject.bounds.right;
            for (let candidateIndex = subjectIndex + 1;
                candidateIndex < this.sortedEntities.length;
                candidateIndex++) {
                const candidate = this.sortedEntities[candidateIndex];
                if (!candidate || candidate.bounds.left >= subjectRight) {
                    break;
                }

                candidateChecks++;
                if (!subject.bounds.overlaps(candidate.bounds)) {
                    continue;
                }

                // Preserve the old directional trait callbacks while testing
                // each unordered pair only once.
                overlaps += 2;
                subject.collides(candidate);
                candidate.collides(subject);
            }
        }

        return {candidateChecks, overlaps};
    }
}
